// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: infinitypay-check
// Consulta o status de pagamento diretamente na InfinitePay
// e atualiza a inscrição se o pagamento foi confirmado.
//
// Chamada pelo SIPEN (admin):
//   POST /functions/v1/infinitypay-check
//   Body: { inscricao_id: string }
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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Não autorizado" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );

  let body: { inscricao_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Payload inválido" }, 400); }

  const { inscricao_id } = body;
  if (!inscricao_id) return json({ error: "inscricao_id obrigatório" }, 400);

  // Buscar inscrição
  const { data: inscricao, error: iErr } = await supabase
    .from("evento_inscricoes")
    .select("id, pago, valor_cobrado, infinitypay_charge_id, infinitypay_status")
    .eq("id", inscricao_id)
    .single();

  if (iErr || !inscricao) return json({ error: "Inscrição não encontrada" }, 404);
  if (inscricao.pago)     return json({ ok: true, pago: true, notice: "ja estava paga" });

  // Buscar handle
  let handle = Deno.env.get("INFINITYPAY_HANDLE");
  if (!handle) {
    const { data: cfg } = await supabase
      .from("sipen_configuracoes")
      .select("valor")
      .eq("chave", "infinitypay_handle")
      .single();
    handle = cfg?.valor || null;
  }
  if (!handle) return json({ error: "Handle não configurado" }, 500);

  // Consultar status na InfinitePay
  let ipRes: Response;
  try {
    ipRes = await fetch(`${IP_BASE}/payment_check`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        handle,
        order_nsu: inscricao_id,
        ...(inscricao.infinitypay_charge_id ? { slug: inscricao.infinitypay_charge_id } : {}),
      }),
    });
  } catch (e) {
    return json({ error: "Falha ao conectar com InfinitePay", detail: String(e) }, 502);
  }

  const ipData = await ipRes.json().catch(() => null);
  console.log("infinitypay-check: resposta =", JSON.stringify(ipData));

  if (!ipRes.ok) {
    return json({ error: "Erro InfinitePay", status: ipRes.status, detail: ipData }, ipRes.status);
  }

  const pago = ipData?.paid === true || ipData?.success === true && ipData?.paid === true;

  if (!pago) {
    return json({ ok: true, pago: false, raw: ipData });
  }

  // Pagamento confirmado — atualizar inscrição
  const formaMap: Record<string, string> = {
    credit_card: "Cartão de Crédito",
    pix:         "PIX",
    debit_card:  "Cartão de Débito",
  };
  const captureMethod = String(ipData?.capture_method || "");
  const formaPgto     = formaMap[captureMethod] || captureMethod || "InfinitePay";
  const valorPago     = ipData?.paid_amount ? Number(ipData.paid_amount) / 100 : inscricao.valor_cobrado;

  const { error: updErr } = await supabase
    .from("evento_inscricoes")
    .update({
      pago:                 true,
      valor_pago:           valorPago,
      forma_pagamento:      formaPgto,
      data_pagamento:       new Date().toISOString(),
      referencia_pagamento: ipData?.transaction_nsu || ipData?.invoice_slug || inscricao_id,
      status:               "confirmada",
      infinitypay_status:   "paid",
      atualizado_em:        new Date().toISOString(),
    })
    .eq("id", inscricao_id)
    .eq("pago", false);

  if (updErr) {
    return json({ error: "Erro ao atualizar inscrição", detail: updErr.message }, 500);
  }

  return json({ ok: true, pago: true, forma_pagamento: formaPgto, valor_pago: valorPago });
});
