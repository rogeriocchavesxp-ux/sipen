// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: infinitypay-charge
// Gera link de checkout InfinitePay para uma inscrição de evento.
//
// API InfinitePay — Checkout Integrado
//   POST https://api.checkout.infinitepay.io/links
//   Docs: infinitepay.io/desenvolvedores
//
// Chamada pelo frontend (público ou autenticado):
//   POST /functions/v1/infinitypay-charge
//   Body: { inscricao_id: string }
//
// Secrets necessários no Supabase (Settings > Edge Functions > Secrets):
//   SUPABASE_URL              → URL do projeto (automático)
//   SUPABASE_SERVICE_ROLE_KEY → Chave service_role (automático)
//   INFINITYPAY_HANDLE        → Sua InfiniteTag sem o $ (ex: conferencia_bas)
// ═══════════════════════════════════════════════════════════════

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IP_BASE = "https://api.checkout.infinitepay.io";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // ── Auth (anon key ou JWT de usuário — ambos aceitos) ─────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Não autorizado" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );

  // ── Payload ───────────────────────────────────────────────────
  let body: { inscricao_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Payload inválido" }, 400); }

  const { inscricao_id } = body;
  if (!inscricao_id) return json({ error: "inscricao_id obrigatório" }, 400);

  // ── Buscar inscrição + evento ─────────────────────────────────
  const { data: inscricao, error: iErr } = await supabase
    .from("evento_inscricoes")
    .select("*, evento:eventos(id, titulo, infinitypay_enabled, valor, gratuito)")
    .eq("id", inscricao_id)
    .single();

  if (iErr || !inscricao) return json({ error: "Inscrição não encontrada" }, 404);

  const evento = inscricao.evento;

  if (evento.gratuito)                return json({ error: "Evento gratuito — cobrança não aplicável" }, 400);
  if (!evento.infinitypay_enabled)    return json({ error: "InfinitePay não habilitado para este evento" }, 400);
  if (inscricao.pago)                 return json({ error: "Inscrição já foi paga" }, 400);
  if (inscricao.infinitypay_payment_url) {
    return json({ ok: true, payment_url: inscricao.infinitypay_payment_url, existing: true });
  }

  // ── Buscar handle ─────────────────────────────────────────────
  // Handle = InfiniteTag sem o $ (ex: "conferencia_bas")
  // Pode vir do secret INFINITYPAY_HANDLE ou da tabela sipen_configuracoes
  let handle = Deno.env.get("INFINITYPAY_HANDLE");
  if (!handle) {
    const { data: cfg } = await supabase
      .from("sipen_configuracoes")
      .select("valor")
      .eq("chave", "infinitypay_handle")
      .single();
    handle = cfg?.valor || null;
  }
  if (!handle) return json({ error: "Handle InfinitePay não configurado. Configure em Eventos > Config." }, 500);

  const valorCobrado  = inscricao.valor_cobrado ?? evento.valor ?? 0;
  const valorCentavos = Math.round(Number(valorCobrado) * 100);
  if (valorCentavos <= 0) return json({ error: "Valor inválido para cobrança" }, 400);

  // ── Montar URL do webhook com token de validação ─────────────
  const supabaseUrl     = Deno.env.get("SUPABASE_URL") || "";
  const projectRef      = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
  const webhookSecret   = Deno.env.get("INFINITYPAY_WEBHOOK_SECRET");
  const webhookUrl      = projectRef
    ? `https://${projectRef}.supabase.co/functions/v1/infinitypay-webhook${webhookSecret ? `?token=${webhookSecret}` : ""}`
    : undefined;

  // ── Chamar API InfinitePay ────────────────────────────────────
  // Strip accents — InfinitePay rejects UTF-8 diacritics in some fields
  const stripAccents = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[—–]/g, "-");

  // Unique order_nsu: no hyphens + timestamp suffix to avoid conflicts on retries
  const orderNsu  = inscricao_id.replace(/-/g, "").slice(0, 20) + Date.now().toString().slice(-8);
  const descricao = stripAccents(`${evento.titulo} - ${inscricao.nome}`);

  let phoneNumber: string | undefined;
  if (inscricao.telefone) {
    const raw      = inscricao.telefone.replace(/\D/g, "");
    const stripped = raw.startsWith("55") && raw.length === 13 ? raw.slice(2) : raw;
    phoneNumber    = `+55${stripped}`;
  }

  // Tenta payload mínimo primeiro — se falhar, o problema é no handle/conta, não nos campos opcionais
  const payloadMinimo: Record<string, unknown> = {
    handle,
    items: [{ quantity: 1, price: valorCentavos, description: "Inscricao" }],
  };

  const payloadCompleto: Record<string, unknown> = {
    handle,
    items: [{ quantity: 1, price: valorCentavos, description: descricao }],
    order_nsu: orderNsu,
  };
  if (webhookUrl)     payloadCompleto.webhook_url = webhookUrl;
  if (inscricao.nome) payloadCompleto.customer    = {
    name:         stripAccents(inscricao.nome),
    email:        inscricao.email || undefined,
    phone_number: phoneNumber,
  };

  let ipRes: Response;
  let payload = payloadCompleto;
  try {
    ipRes = await fetch(`${IP_BASE}/links`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payloadCompleto),
    });
    // Se falhou com 422, tenta mínimo para diagnóstico
    if (ipRes.status === 422) {
      payload = payloadMinimo;
      ipRes = await fetch(`${IP_BASE}/links`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payloadMinimo),
      });
    }
  } catch (e) {
    return json({ error: "Falha ao conectar com InfinitePay", detail: String(e) }, 502);
  }

  const ipData = await ipRes.json().catch(() => null);
  if (!ipRes.ok) {
    return json({ error: "Erro InfinitePay", status: ipRes.status, detail: ipData, sent: payload }, ipRes.status);
  }

  // A resposta inclui o link de checkout
  const paymentUrl = ipData?.link || ipData?.checkout_url || ipData?.url || ipData?.payment_url;
  const chargeId   = ipData?.slug || ipData?.id || ipData?.invoice_slug || inscricao_id;

  if (!paymentUrl) {
    return json({ error: "InfinitePay não retornou link de pagamento", raw: ipData }, 502);
  }

  // ── Salvar no banco ───────────────────────────────────────────
  await supabase
    .from("evento_inscricoes")
    .update({
      infinitypay_charge_id:   chargeId,
      infinitypay_payment_url: paymentUrl,
      infinitypay_status:      "pending",
      atualizado_em:           new Date().toISOString(),
    })
    .eq("id", inscricao_id);

  return json({ ok: true, payment_url: paymentUrl, charge_id: chargeId, amount: valorCentavos });
});
