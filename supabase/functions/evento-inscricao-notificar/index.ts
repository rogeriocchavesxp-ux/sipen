// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: evento-inscricao-notificar
// Disparada por trigger no banco (AFTER INSERT em evento_inscricoes).
// Notifica os responsáveis pelo módulo EVENTOS via WhatsApp a cada
// nova inscrição — mesmo padrão usado em Demandas/Financeiro, mas
// chamada direto pelo Postgres (pg_net), pois a inscrição pública
// (inscricao.html) não tem usuário autenticado para chamar whatsapp-send.
//
// Secrets obrigatórios:
//   EVENTO_NOTIFICACAO_SECRET → autoriza a chamada feita pelo trigger
//   BOTCONVERSA_API_KEY       → Configurações → Integrações → API → Chave API
//
// Secret opcional:
//   BOTCONVERSA_BASE_URL → padrão: https://backend.botconversa.com.br/api/v1
// ═══════════════════════════════════════════════════════════════

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_BASE_URL = "https://backend.botconversa.com.br/api/v1/webhook";
const SIPEN_URL = "https://www.sipen.com.br";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Helpers BotConversa (mesmo padrão de whatsapp-send) ──────
async function bcGet(baseUrl: string, apiKey: string, path: string) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function bcPost(baseUrl: string, apiKey: string, path: string, payload: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method:  "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function resolverSubscriber(
  baseUrl: string,
  apiKey: string,
  phone: string,
  name: string
): Promise<{ id: number | null; error?: string }> {
  const get = await bcGet(baseUrl, apiKey, `/subscriber/get_by_phone/${phone}/`);
  if (get.status === 200 && get.body?.id) return { id: get.body.id };

  const parts = (name || "").trim().split(/\s+/);
  const create = await bcPost(baseUrl, apiKey, "/subscriber/", {
    phone,
    first_name: parts[0] || phone,
    last_name:  parts.slice(1).join(" ") || ".",
  });
  if ((create.status === 200 || create.status === 201) && create.body?.id) {
    return { id: create.body.id };
  }
  return { id: null, error: `Não foi possível resolver subscriber: ${JSON.stringify(create.body)}` };
}

function normalizarTelefone(tel: string | null | undefined): string | null {
  const d = (tel || "").replace(/\D/g, "");
  if (!d || d.length < 10) return null;
  return d.startsWith("55") ? d : "55" + d;
}

function fmtData(d: string | null): string {
  if (!d) return "—";
  const [y, m, dia] = String(d).slice(0, 10).split("-");
  return `${dia}/${m}/${y}`;
}

function montarMensagem(insc: any, evt: any): string {
  return [
    `📝 *Nova inscrição em evento*`,
    ``,
    `*Evento:* ${evt.titulo}`,
    evt.data_inicio ? `*Data:* ${fmtData(evt.data_inicio)}${evt.hora_inicio ? " · " + evt.hora_inicio.slice(0, 5) : ""}` : null,
    evt.local_nome ? `*Local:* ${evt.local_nome}` : null,
    ``,
    `*Inscrito:* ${insc.nome}`,
    insc.tipo ? `*Tipo:* ${insc.tipo}` : null,
    insc.telefone ? `*WhatsApp:* ${insc.telefone}` : null,
    insc.email ? `*E-mail:* ${insc.email}` : null,
    insc.familia ? `*Família:* ${insc.familia}` : null,
    insc.congregacao ? `*Congregação:* ${insc.congregacao}` : null,
    ``,
    `🔗 Acesse no SIPEN:\n${SIPEN_URL}`,
  ].filter(l => l !== null).join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return json({ error: "Método não permitido" }, 405);

  // ── Autenticação via EVENTO_NOTIFICACAO_SECRET (chamada vem do trigger no Postgres) ──
  const secret     = Deno.env.get("EVENTO_NOTIFICACAO_SECRET");
  const authHeader = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!secret || authHeader !== secret) return json({ error: "Não autorizado" }, 401);

  let body: { inscricao_id?: string };
  try { body = await req.json(); }
  catch { return json({ error: "Body JSON inválido" }, 400); }

  const inscricaoId = body?.inscricao_id;
  if (!inscricaoId) return json({ error: "inscricao_id é obrigatório" }, 400);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── 1. Carrega inscrição + evento ─────────────────────────
  const { data: insc, error: errInsc } = await sb
    .from("evento_inscricoes")
    .select("id, nome, email, telefone, tipo, familia, congregacao, evento_id")
    .eq("id", inscricaoId)
    .single();
  if (errInsc || !insc) return json({ ok: false, status: "inscricao_nao_encontrada" });

  const { data: evt } = await sb
    .from("eventos")
    .select("id, titulo, data_inicio, hora_inicio, local_nome")
    .eq("id", insc.evento_id)
    .single();
  if (!evt) return json({ ok: false, status: "evento_nao_encontrado" });

  // ── 2. Verifica módulo ativo ──────────────────────────────
  const { data: modConfig } = await sb
    .from("whatsapp_modulo_config")
    .select("ativo")
    .eq("modulo", "EVENTOS")
    .single();
  if (modConfig && !modConfig.ativo) return json({ ok: false, status: "modulo_inativo" });

  // ── 3. Responsáveis pelo módulo EVENTOS ───────────────────
  let rows: any[] = [];
  const resp = await sb
    .from("whatsapp_modulo_responsaveis")
    .select("pessoa_id, pessoas(id, nome, telefone, celular)")
    .eq("modulo", "EVENTOS")
    .eq("ativo", true);
  rows = resp.data || [];

  // Fallback: admins
  if (!rows.length) {
    const adm = await sb
      .from("user_profiles")
      .select("pessoa_id, pessoas(id, nome, telefone, celular)")
      .eq("role", "admin")
      .eq("ativo", true);
    rows = adm.data || [];
  }

  if (!rows.length) return json({ ok: false, status: "sem_responsaveis" });

  const BC_KEY = Deno.env.get("BOTCONVERSA_API_KEY");
  if (!BC_KEY) return json({ error: "BOTCONVERSA_API_KEY não configurada" }, 503);
  const BC_BASE = (Deno.env.get("BOTCONVERSA_BASE_URL") || DEFAULT_BASE_URL).replace(/\/$/, "");

  const mensagem = montarMensagem(insc, evt);
  const resultados: any[] = [];

  for (const row of rows) {
    const p = row.pessoas;
    if (!p) continue;
    const numero = normalizarTelefone(p.celular || p.telefone);
    if (!numero) continue;

    const idempotencyKey = `EVE_INSC_${insc.id}_${p.id}`;

    // Idempotência
    const { data: existing } = await sb
      .from("whatsapp_mensagens")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .single();
    if (existing) { resultados.push({ pessoa: p.nome, status: "duplicado" }); continue; }

    const { data: logRow } = await sb
      .from("whatsapp_mensagens")
      .insert({
        para_numero:     numero,
        para_nome:       p.nome,
        mensagem,
        modulo:          "EVENTOS",
        referencia_tipo: "evento_inscricao",
        referencia_id:   insc.id,
        status:          "pendente",
        enviado_por:     null,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    let bcOk = false, errMsg = "";
    try {
      const { id: subscriberId, error: subErr } = await resolverSubscriber(BC_BASE, BC_KEY, numero, p.nome);
      if (!subscriberId) {
        errMsg = subErr || "Subscriber não encontrado e não foi possível criar";
      } else {
        const send = await bcPost(BC_BASE, BC_KEY, `/subscriber/${subscriberId}/send_message/`, { type: "text", value: mensagem });
        if (send.status === 200 || send.status === 201) bcOk = true;
        else errMsg = `HTTP ${send.status}: ${JSON.stringify(send.body)}`;
      }
    } catch (e) {
      errMsg = e instanceof Error ? e.message : String(e);
    }

    if (logRow) {
      await sb.from("whatsapp_mensagens").update(
        bcOk
          ? { status: "enviado", enviado_em: new Date().toISOString(), erro_msg: null }
          : { status: "erro",    erro_msg: errMsg }
      ).eq("id", logRow.id);
    }

    resultados.push({ pessoa: p.nome, status: bcOk ? "enviado" : "erro", error: bcOk ? undefined : errMsg });
  }

  return json({ ok: true, resultados });
});
