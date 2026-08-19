// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: infinitypay-charge
// Cria uma cobrança na InfinityPay para uma inscrição de evento.
//
// Chamada pelo frontend (autenticado) com:
//   POST /functions/v1/infinitypay-charge
//   Body: { inscricao_id: string }
//
// Secrets obrigatórios (Supabase Dashboard > Settings > Edge Functions > Secrets):
//   SUPABASE_URL              → URL do projeto Supabase
//   SUPABASE_SERVICE_ROLE_KEY → Chave service_role
//   INFINITYPAY_API_TOKEN     → Token de API InfinityPay
//                               (dashboard.infinitepay.io > Configurações > Integrações > API)
// ═══════════════════════════════════════════════════════════════

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IP_BASE = "https://api.infinitepay.io";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // ── Auth ─────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Não autorizado" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Verificar usuário autenticado
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authErr || !user) return json({ error: "Não autorizado" }, 401);

  // ── Payload ───────────────────────────────────────────────────
  let body: { inscricao_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Payload inválido" }, 400); }

  const { inscricao_id } = body;
  if (!inscricao_id) return json({ error: "inscricao_id obrigatório" }, 400);

  // ── Buscar inscrição + evento ─────────────────────────────────
  const { data: inscricao, error: iErr } = await supabase
    .from("evento_inscricoes")
    .select("*, evento:eventos(id, titulo, infinitypay_enabled, infinitypay_account_id, valor, gratuito)")
    .eq("id", inscricao_id)
    .single();

  if (iErr || !inscricao) return json({ error: "Inscrição não encontrada" }, 404);

  const evento = inscricao.evento;

  if (evento.gratuito) return json({ error: "Evento gratuito — cobrança não aplicável" }, 400);
  if (!evento.infinitypay_enabled) return json({ error: "InfinityPay não habilitado para este evento" }, 400);
  if (inscricao.pago) return json({ error: "Inscrição já foi paga" }, 400);
  if (inscricao.infinitypay_charge_id) return json({ error: "Cobrança já existe", charge_id: inscricao.infinitypay_charge_id, payment_url: inscricao.infinitypay_payment_url }, 409);

  // ── Buscar API token ──────────────────────────────────────────
  const { data: cfgToken } = await supabase
    .from("sipen_configuracoes")
    .select("valor")
    .eq("chave", "infinitypay_api_token")
    .single();

  const apiToken = Deno.env.get("INFINITYPAY_API_TOKEN") || cfgToken?.valor;
  if (!apiToken) return json({ error: "API token InfinityPay não configurado" }, 500);

  const valorCobrado = inscricao.valor_cobrado ?? evento.valor ?? 0;
  const valorCentavos = Math.round(Number(valorCobrado) * 100);

  if (valorCentavos <= 0) return json({ error: "Valor inválido para cobrança" }, 400);

  // ── Criar cobrança na InfinityPay ─────────────────────────────
  // Referência: https://developers.infinitepay.io/
  const chargePayload = {
    amount:       valorCentavos,
    currency:     "BRL",
    description:  `${evento.titulo} — inscrição de ${inscricao.nome}`,
    reference_id: inscricao.id,
    customer: {
      name:  inscricao.nome,
      email: inscricao.email || undefined,
      phone: inscricao.telefone || undefined,
    },
    payment_methods: ["pix", "credit"],
  };

  let ipRes: Response;
  try {
    ipRes = await fetch(`${IP_BASE}/v2/charges`, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(chargePayload),
    });
  } catch (e) {
    return json({ error: "Falha ao conectar com InfinityPay", detail: String(e) }, 502);
  }

  const ipData = await ipRes.json().catch(() => null);

  if (!ipRes.ok) {
    return json({ error: "Erro InfinityPay", detail: ipData }, ipRes.status);
  }

  const chargeId   = ipData?.id;
  const paymentUrl = ipData?.payment_url || ipData?.checkout_url || ipData?.link;

  if (!chargeId) return json({ error: "InfinityPay não retornou charge_id", raw: ipData }, 502);

  // ── Salvar no banco ───────────────────────────────────────────
  const { error: updErr } = await supabase
    .from("evento_inscricoes")
    .update({
      infinitypay_charge_id:   chargeId,
      infinitypay_payment_url: paymentUrl || null,
      infinitypay_status:      "pending",
      atualizado_em:           new Date().toISOString(),
    })
    .eq("id", inscricao_id);

  if (updErr) return json({ error: "Erro ao salvar cobrança", detail: updErr.message }, 500);

  return json({ ok: true, charge_id: chargeId, payment_url: paymentUrl, amount: valorCentavos });
});
