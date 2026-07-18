// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: dispatch-scheduled
// Processa campanhas agendadas cujo horário já chegou.
//
// Chamada pelo pg_cron a cada minuto via pg_net.http_post().
// Auth: Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
//
// Filtros suportados (mesmos que o frontend):
//   todos_membros, cong_{id}, min_{id}, aniv_hoje, aniv_semana,
//   aniv_mes, funcao_{tipo}, individual (com valor_id = pessoa_id)
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BC_BASE = (Deno.env.get("BOTCONVERSA_BASE_URL") || "https://backend.botconversa.com.br/api/v1/webhook").replace(/\/$/, "");

// ── Helpers BotConversa ──────────────────────────────────────

async function bcGet(apiKey: string, path: string) {
  const r = await fetch(`${BC_BASE}${path}`, {
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function bcPost(apiKey: string, path: string, payload: unknown) {
  const r = await fetch(`${BC_BASE}${path}`, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function resolverSubscriber(apiKey: string, phone: string, nome: string): Promise<number | null> {
  const get = await bcGet(apiKey, `/subscriber/get_by_phone/${phone}/`);
  if (get.status === 200 && get.body?.id) return get.body.id;

  const parts = (nome || "").trim().split(/\s+/);
  const create = await bcPost(apiKey, "/subscriber/", {
    phone,
    first_name: parts[0] || phone,
    last_name: parts.slice(1).join(" ") || ".",
  });
  return (create.status === 200 || create.status === 201) ? create.body?.id ?? null : null;
}

// ── Helpers gerais ───────────────────────────────────────────

function normalizar(tel: string | null | undefined): string | null {
  const d = (tel || "").replace(/\D/g, "");
  if (!d || d.length < 8) return null;
  return d.startsWith("55") ? d : "55" + d;
}

const LOWER_PT = new Set(["de","da","do","das","dos","e","a","o","em","com","por","para"]);
function titleCase(str: string): string {
  return str.toLowerCase().split(" ").map((w, i) =>
    (i > 0 && LOWER_PT.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(" ");
}

function renderizar(texto: string, nome: string): string {
  const primeiroNome = titleCase(nome.split(" ")[0]);
  return texto.replace(/\{\{nome\}\}/gi, primeiroNome);
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Resolução de destinatários ───────────────────────────────

async function resolverDestinatarios(
  sb: ReturnType<typeof createClient>,
  filtros: Array<{ tipo: string; valor: string | null; valor_id: string | null }>
): Promise<Array<{ pessoa_id: string; nome: string }>> {
  const map = new Map<string, string>();

  for (const f of filtros) {

    if (f.tipo === "individual" && f.valor_id) {
      map.set(f.valor_id, f.valor || "");

    } else if (f.tipo === "todos_membros") {
      const { data } = await sb.from("v_membros").select("pessoa_id,nome").eq("status", "ativo").limit(2000);
      (data || []).forEach((p: any) => { if (!map.has(p.pessoa_id)) map.set(p.pessoa_id, p.nome); });

    } else if (f.tipo.startsWith("cong_")) {
      const id = f.tipo.slice(5);
      const { data } = await sb.from("v_membros").select("pessoa_id,nome").eq("congregacao_id", id).eq("status", "ativo").limit(500);
      (data || []).forEach((p: any) => { if (!map.has(p.pessoa_id)) map.set(p.pessoa_id, p.nome); });

    } else if (f.tipo.startsWith("min_")) {
      const id = f.tipo.slice(4);
      const { data } = await sb.from("ministerio_membros").select("pessoa_id,pessoas(nome)").eq("ministerio_id", id).eq("ativo", true).limit(500);
      (data || []).forEach((p: any) => {
        const nm = (p.pessoas as any)?.nome;
        if (p.pessoa_id && nm && !map.has(p.pessoa_id)) map.set(p.pessoa_id, nm);
      });

    } else if (f.tipo === "aniv_hoje" || f.tipo === "aniv_semana" || f.tipo === "aniv_mes") {
      const hoje = new Date();
      const mes = hoje.getMonth() + 1;
      const dia = hoje.getDate();
      const { data } = await sb.from("pessoas").select("id,nome,data_nascimento").not("data_nascimento", "is", null);
      (data || []).filter((p: any) => {
        if (!p.data_nascimento) return false;
        const d = new Date(p.data_nascimento);
        const dm = d.getMonth() + 1;
        const dd = d.getDate();
        if (f.tipo === "aniv_hoje")   return dm === mes && dd === dia;
        if (f.tipo === "aniv_semana") {
          const diff = (dm * 100 + dd) - (mes * 100 + dia);
          return diff >= 0 && diff <= 7;
        }
        return dm === mes; // aniv_mes
      }).forEach((p: any) => { if (!map.has(p.id)) map.set(p.id, p.nome); });

    } else if (f.tipo.startsWith("oficial_")) {
      const cargo = f.tipo.slice(8); // pastor | presbitero | diacono
      const { data } = await sb.from("oficiais").select("pessoa_id,pessoas(nome)").eq("cargo", cargo).eq("status", "ativo").is("deleted_at", null).limit(300);
      (data || []).forEach((p: any) => {
        const nm = (p.pessoas as any)?.nome;
        if (p.pessoa_id && nm && !map.has(p.pessoa_id)) map.set(p.pessoa_id, nm);
      });

    } else if (f.tipo.startsWith("nomeados_")) {
      const funcaoLider = f.tipo.slice(9); // supervisor | coordenador | lider_area
      const { data } = await sb.from("nomeados").select("pessoa_id,nome").eq("funcao_lider", funcaoLider).is("deleted_at", null).limit(500);
      (data || []).forEach((p: any) => {
        if (p.pessoa_id && p.nome && !map.has(p.pessoa_id)) map.set(p.pessoa_id, p.nome);
      });

    } else if (f.tipo === "todos_ministerios" || f.tipo === "todos_sociedades") {
      const tipoMin = f.tipo === "todos_sociedades" ? "SOCIEDADE" : null;
      const qMin = sb.from("ministerios").select("id").eq("ativo", true);
      const { data: mins } = tipoMin ? await qMin.eq("tipo", tipoMin) : await qMin.neq("tipo", "SOCIEDADE");
      if (mins?.length) {
        const ids = mins.map((m: any) => m.id);
        const { data: mbs } = await sb.from("ministerio_membros").select("pessoa_id,pessoas(nome)").in("ministerio_id", ids).eq("ativo", true).limit(2000);
        (mbs || []).forEach((m: any) => {
          const nm = (m.pessoas as any)?.nome;
          if (m.pessoa_id && nm && !map.has(m.pessoa_id)) map.set(m.pessoa_id, nm);
        });
      }
    }
  }

  return Array.from(map.entries()).map(([pessoa_id, nome]) => ({ pessoa_id, nome }));
}

// ── Handler principal ────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  // Auth via segredo simples no header x-cron-secret
  const cronSecret = Deno.env.get("DISPATCH_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const BC_KEY = Deno.env.get("BOTCONVERSA_API_KEY");
  if (!BC_KEY) return new Response("BOTCONVERSA_API_KEY não configurada", { status: 503 });

  // Busca campanhas cujo horário já chegou
  const { data: campanhas, error } = await sb
    .from("msg_campanhas")
    .select("id,titulo,canal,conteudo")
    .eq("status", "agendada")
    .lte("agendado_para", new Date().toISOString());

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!campanhas?.length) return new Response(JSON.stringify({ processed: 0 }), { status: 200 });

  let processadas = 0;

  for (const camp of campanhas) {
    // Marca como enviando para evitar reprocessamento duplo
    await sb.from("msg_campanhas").update({ status: "enviando" }).eq("id", camp.id);

    try {
      // Filtros da campanha
      const { data: filtros } = await sb.from("msg_filtros").select("tipo,valor,valor_id").eq("campanha_id", camp.id);

      // Resolve lista de pessoas
      const destinatarios = await resolverDestinatarios(sb, filtros || []);

      if (!destinatarios.length) {
        await sb.from("msg_campanhas").update({ status: "falha", total_dest: 0, total_entregue: 0, total_falha: 0 }).eq("id", camp.id);
        continue;
      }

      // Busca telefones
      const ids = destinatarios.map(d => d.pessoa_id);
      const { data: pessoas } = await sb.from("pessoas").select("id,celular,whatsapp,telefone").in("id", ids);
      const byId: Record<string, any> = {};
      (pessoas || []).forEach((p: any) => byId[p.id] = p);

      let enviados = 0, falhas = 0;

      for (const dest of destinatarios) {
        const p = byId[dest.pessoa_id];
        const tel = normalizar(p?.whatsapp || p?.celular || p?.telefone);

        // Cria registro do destinatário
        const { data: destRec } = await sb.from("msg_destinatarios").insert({
          campanha_id: camp.id,
          pessoa_id:   dest.pessoa_id,
          nome:        dest.nome,
          contato:     tel || null,
          canal:       "whatsapp",
          status:      "pendente",
        }).select("id").single();

        if (!tel) {
          await sb.from("msg_destinatarios").update({ status: "falha", erro: "sem telefone" }).eq("id", destRec?.id);
          falhas++;
          continue;
        }

        try {
          const subId = await resolverSubscriber(BC_KEY, tel, dest.nome);
          if (!subId) {
            await sb.from("msg_destinatarios").update({ status: "falha", erro: "subscriber não encontrado" }).eq("id", destRec?.id);
            falhas++;
            continue;
          }

          const mensagem = renderizar(camp.conteudo, dest.nome);
          const send = await bcPost(BC_KEY, `/subscriber/${subId}/send_message/`, { type: "text", value: mensagem });

          if (send.status === 200 || send.status === 201) {
            await sb.from("msg_destinatarios").update({ status: "entregue", enviado_em: new Date().toISOString() }).eq("id", destRec?.id);
            enviados++;
          } else {
            await sb.from("msg_destinatarios").update({ status: "falha", erro: `HTTP ${send.status}` }).eq("id", destRec?.id);
            falhas++;
          }
        } catch (e) {
          await sb.from("msg_destinatarios").update({ status: "falha", erro: String(e) }).eq("id", destRec?.id);
          falhas++;
        }

        await delay(400); // respeita rate limit da BotConversa
      }

      const finalStatus = enviados === 0 ? "falha" : falhas === 0 ? "enviada" : "parcial";
      await sb.from("msg_campanhas").update({
        status:         finalStatus,
        total_dest:     destinatarios.length,
        total_entregue: enviados,
        total_falha:    falhas,
        enviado_em:     new Date().toISOString(),
      }).eq("id", camp.id);

      processadas++;
      console.log(`[dispatch-scheduled] campanha ${camp.id}: ${enviados} enviados, ${falhas} falhas`);

    } catch (e) {
      console.error("[dispatch-scheduled] erro na campanha", camp.id, e);
      await sb.from("msg_campanhas").update({ status: "falha" }).eq("id", camp.id);
    }
  }

  return new Response(JSON.stringify({ processed: processadas }), { status: 200 });
});
