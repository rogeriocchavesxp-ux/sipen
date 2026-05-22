// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: escala-notificacao
//
// Envia notificações WhatsApp para pastores sobre a escala mensal.
//
// Fluxo:
//   Dia 25 (lembrete_dia25):
//     → Todos os pastores ativos com telefone recebem lembrete para preencher
//
//   Dia 27 (followup_dia27):
//     → Pastores que preencheram: recebem resumo das disponibilidades
//     → Pastores que não preencheram: recebem lembrete de prazo
//
// Secrets obrigatórios (supabase secrets set):
//   BOTCONVERSA_API_KEY  → chave da API BotConversa
//   CRON_SECRET          → senha para autorizar chamadas do cron
//
// Secret opcional:
//   BOTCONVERSA_BASE_URL → padrão: https://backend.botconversa.com.br/api/v1/webhook
// ═══════════════════════════════════════════════════════════════

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIPEN_URL      = "https://sipen.com.br";
const BC_DEFAULT_URL = "https://backend.botconversa.com.br/api/v1/webhook";

const CULTO_LABEL: Record<string, string> = {
  domingo_manha:      "Domingo Manhã",
  domingo_noite:      "Domingo Noite",
  conexao_com_deus:   "Conexão com Deus",
  tarde_da_esperanca: "Tarde da Esperança",
};

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Calcula intervalo do próximo mês ─────────────────────────
function proximoMes(): { start: string; end: string; label: string } {
  const now   = new Date();
  const mes   = now.getMonth();
  const ano   = now.getFullYear();
  const pMes  = mes === 11 ? 0 : mes + 1;
  const pAno  = mes === 11 ? ano + 1 : ano;
  const pad   = (n: number) => String(n).padStart(2, "0");
  const ultimo = new Date(pAno, pMes + 1, 0).getDate();
  return {
    start: `${pAno}-${pad(pMes + 1)}-01`,
    end:   `${pAno}-${pad(pMes + 1)}-${pad(ultimo)}`,
    label: `${MESES[pMes]}/${pAno}`,
  };
}

// ── Formata data YYYY-MM-DD → DD/MM ─────────────────────────
function fmtData(ds: string): string {
  const [, m, d] = ds.split("-");
  return `${d}/${m}`;
}

// ── BotConversa helpers ──────────────────────────────────────
async function bcGet(base: string, key: string, path: string) {
  const r = await fetch(`${base}${path}`, {
    headers: { "api-key": key, "Content-Type": "application/json" },
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function bcPost(base: string, key: string, path: string, payload: unknown) {
  const r = await fetch(`${base}${path}`, {
    method:  "POST",
    headers: { "api-key": key, "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function resolverSubscriber(
  base: string, key: string, phone: string, name: string,
): Promise<number | null> {
  const get = await bcGet(base, key, `/subscriber/get_by_phone/${phone}/`);
  if (get.status === 200 && get.body?.id) return get.body.id;

  const parts  = (name || "").trim().split(/\s+/);
  const create = await bcPost(base, key, "/subscriber/", {
    phone,
    first_name: parts[0] || phone,
    last_name:  parts.slice(1).join(" ") || ".",
  });
  return (create.status === 200 || create.status === 201) ? (create.body?.id ?? null) : null;
}

async function enviarWA(
  base: string, key: string, phone: string, name: string, mensagem: string,
): Promise<{ ok: boolean; erro?: string }> {
  const numero = phone.replace(/\D/g, "");
  if (numero.length < 10) return { ok: false, erro: "telefone inválido" };
  const numeroFinal = numero.startsWith("55") ? numero : "55" + numero;

  try {
    const subId = await resolverSubscriber(base, key, numeroFinal, name);
    if (!subId) return { ok: false, erro: "subscriber não encontrado/criado" };

    const send = await bcPost(base, key, `/subscriber/${subId}/send_message/`, {
      type: "text", value: mensagem,
    });
    if (send.status === 200 || send.status === 201) return { ok: true };
    return { ok: false, erro: `HTTP ${send.status}: ${JSON.stringify(send.body)}` };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}

// ── Mensagens ────────────────────────────────────────────────
function msgLembrete(nome: string, mesLabel: string): string {
  return (
    `Olá, ${nome}! 📅\n\n` +
    `Chegou a hora de preencher sua *disponibilidade para ${mesLabel}*.\n\n` +
    `Acesse o SIPEN, vá em *Pastoral → Disponibilidade* e informe para cada culto se você estará disponível ou indisponível.\n\n` +
    `👉 ${SIPEN_URL}\n\n` +
    `Prazo: até o dia 27.\n` +
    `_IPPenha — SIPEN_`
  );
}

function msgFollowupNaoPreencheu(nome: string, mesLabel: string): string {
  return (
    `Olá, ${nome}! ⏰\n\n` +
    `Ainda não identificamos seu preenchimento de disponibilidade para *${mesLabel}*.\n\n` +
    `Por favor, acesse agora e informe suas disponibilidades:\n\n` +
    `👉 ${SIPEN_URL} → Pastoral → Disponibilidade\n\n` +
    `Obrigado! 🙏\n` +
    `_IPPenha — SIPEN_`
  );
}

function msgResumo(
  nome: string,
  mesLabel: string,
  slots: Array<{ data: string; culto_tipo: string }>,
): string {
  const linhas = slots
    .sort((a, b) => a.data.localeCompare(b.data) || a.culto_tipo.localeCompare(b.culto_tipo))
    .map(s => `  • ${CULTO_LABEL[s.culto_tipo] ?? s.culto_tipo} — ${fmtData(s.data)}`)
    .join("\n");

  return (
    `Olá, ${nome}! ✅\n\n` +
    `Obrigado pelo preenchimento! Aqui está o resumo de sua *disponibilidade para ${mesLabel}*:\n\n` +
    `🟢 *Disponível:*\n${linhas}\n\n` +
    `Caso precise ajustar: ${SIPEN_URL} → Pastoral → Disponibilidade\n\n` +
    `_IPPenha — SIPEN_`
  );
}

// ── Handler ──────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return json({ error: "Método não permitido" }, 405);

  // ── Autenticação via CRON_SECRET ─────────────────────────
  const cronSecret = Deno.env.get("CRON_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (authHeader !== cronSecret) return json({ error: "Não autorizado" }, 401);

  // ── Parse body ───────────────────────────────────────────
  let body: { tipo?: string };
  try { body = await req.json(); }
  catch { return json({ error: "Body JSON inválido" }, 400); }

  const tipo = body?.tipo;
  if (tipo !== "lembrete_dia25" && tipo !== "followup_dia27") {
    return json({ error: "tipo deve ser lembrete_dia25 ou followup_dia27" }, 400);
  }

  // ── Clientes Supabase ────────────────────────────────────
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const BC_KEY  = Deno.env.get("BOTCONVERSA_API_KEY");
  if (!BC_KEY)  return json({ error: "BOTCONVERSA_API_KEY não configurada" }, 503);
  const BC_BASE = (Deno.env.get("BOTCONVERSA_BASE_URL") ?? BC_DEFAULT_URL).replace(/\/$/, "");

  const { start, end, label: mesLabel } = proximoMes();

  // ── Busca pastores ativos com telefone ───────────────────
  const { data: pastores, error: pastErr } = await sb
    .from("pastores")
    .select("id, nome_completo, nome_exibicao, telefone")
    .eq("ativo", true)
    .not("telefone", "is", null);

  if (pastErr) return json({ error: "Erro ao buscar pastores: " + pastErr.message }, 500);
  if (!pastores?.length) return json({ ok: true, aviso: "Nenhum pastor ativo com telefone cadastrado" });

  const resultados: Array<{
    pastor: string;
    tipo_msg: string;
    ok: boolean;
    erro?: string;
  }> = [];

  // ── Busca escala do próximo mês (slots preenchidos) ──────
  const { data: escala } = await sb
    .from("escala_pregacao")
    .select("data, culto_tipo, pastor_id")
    .gte("data", start)
    .lte("data", end)
    .not("pastor_id", "is", null);

  // Mapa: pastor_id → lista de slots disponíveis
  const slotsPreenchidos = new Map<string, Array<{ data: string; culto_tipo: string }>>();
  for (const row of escala ?? []) {
    if (!row.pastor_id) continue;
    if (!slotsPreenchidos.has(row.pastor_id)) slotsPreenchidos.set(row.pastor_id, []);
    slotsPreenchidos.get(row.pastor_id)!.push({ data: row.data, culto_tipo: row.culto_tipo });
  }

  // ── Envia mensagens ──────────────────────────────────────
  for (const pastor of pastores) {
    if (!pastor.telefone) continue;

    const nome      = pastor.nome_exibicao || pastor.nome_completo;
    const slots     = slotsPreenchidos.get(pastor.id) ?? [];
    const preencheu = slots.length > 0;

    let mensagem: string;
    let tipoMsg: string;

    if (tipo === "lembrete_dia25") {
      mensagem = msgLembrete(nome, mesLabel);
      tipoMsg  = "lembrete_dia25";
    } else {
      // followup_dia27
      if (preencheu) {
        mensagem = msgResumo(nome, mesLabel, slots);
        tipoMsg  = "resumo_dia27";
      } else {
        mensagem = msgFollowupNaoPreencheu(nome, mesLabel);
        tipoMsg  = "followup_dia27";
      }
    }

    const { ok, erro } = await enviarWA(BC_BASE, BC_KEY, pastor.telefone, nome, mensagem);

    // Registra no log
    await sb.from("whatsapp_mensagens").insert({
      para_numero:     pastor.telefone.replace(/\D/g, "").replace(/^(?!55)/, "55"),
      para_nome:       nome,
      mensagem,
      modulo:          "PASTORAL",
      referencia_tipo: "escala_notificacao",
      referencia_id:   pastor.id,
      status:          ok ? "enviado" : "erro",
      enviado_em:      ok ? new Date().toISOString() : null,
      erro_msg:        erro ?? null,
    }).then(() => {});

    resultados.push({ pastor: nome, tipo_msg: tipoMsg, ok, ...(erro ? { erro } : {}) });
  }

  const enviados = resultados.filter(r => r.ok).length;
  const erros    = resultados.filter(r => !r.ok).length;

  return json({ ok: true, tipo, mes: mesLabel, enviados, erros, detalhes: resultados });
});
