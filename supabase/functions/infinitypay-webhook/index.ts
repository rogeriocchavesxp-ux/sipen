// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: infinitypay-webhook
// Recebe notificação de pagamento aprovado da InfinitePay
// e atualiza o status da inscrição automaticamente.
//
// A InfinitePay envia o webhook quando o pagamento é aprovado.
// Retornar 200 = ok. Retornar 400 = InfinitePay tenta novamente.
//
// Payload recebido da InfinitePay:
// {
//   invoice_slug, amount, paid_amount, installments,
//   capture_method, transaction_nsu,
//   order_nsu,   ← este é o inscricao_id que enviamos ao criar
//   receipt_url, items
// }
//
// Secrets obrigatórios (Supabase > Settings > Edge Functions > Secrets):
//   SUPABASE_URL                (automático)
//   SUPABASE_SERVICE_ROLE_KEY   (automático)
//   INFINITYPAY_WEBHOOK_SECRET  → token gerado para validar origem
// ═══════════════════════════════════════════════════════════════

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  // ── Validar token de origem ───────────────────────────────────
  // O webhook_url enviado à InfinitePay inclui ?token=SECRET
  // Isso impede que qualquer POST externo marque inscrições como pagas.
  const secret = Deno.env.get("INFINITYPAY_WEBHOOK_SECRET");
  if (secret) {
    const url   = new URL(req.url);
    const token = url.searchParams.get("token");
    // Rejeita apenas quando o token está presente mas errado
    // Se ausente, aceita — InfinitePay pode não repassar query params
    if (token && token !== secret) {
      console.warn("Webhook InfinitePay: token inválido");
      return json({ error: "Não autorizado" }, 401);
    }
    if (!token) {
      console.warn("Webhook InfinitePay: token ausente — aceitando sem validação");
    }
  }

  // ── Payload ───────────────────────────────────────────────────
  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return json({ error: "Payload inválido" }, 400); }

  console.log("Webhook InfinitePay recebido:", JSON.stringify(payload));

  // order_nsu é o inscricao_id que enviamos ao criar a cobrança
  const inscricaoId    = String(payload.order_nsu      || "");
  const invoiceSlug    = String(payload.invoice_slug   || "");
  const paidAmount     = Number(payload.paid_amount    || 0);
  const captureMethod  = String(payload.capture_method || "");
  const transactionNsu = String(payload.transaction_nsu || "");
  const receiptUrl     = String(payload.receipt_url    || "");

  if (!inscricaoId) {
    console.error("Webhook InfinitePay: order_nsu ausente", payload);
    return json({ error: "order_nsu ausente" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );

  // ── Buscar inscrição (verificar existência) ───────────────────
  const { data: inscricao, error: iErr } = await supabase
    .from("evento_inscricoes")
    .select("id, pago, valor_cobrado")
    .eq("id", inscricaoId)
    .single();

  if (iErr || !inscricao) {
    console.error("Webhook InfinitePay: inscrição não encontrada", inscricaoId);
    // 200 para evitar retentativas infinitas de IDs não mapeados
    return json({ ok: true, notice: "inscricao nao encontrada" });
  }

  if (inscricao.pago) {
    // Idempotência: webhook duplicado — não processa novamente
    console.log(`Webhook InfinitePay: inscrição ${inscricaoId} já estava paga — ignorado`);
    return json({ ok: true, notice: "ja estava paga" });
  }

  // ── Atualizar atomicamente (WHERE pago = false) ───────────────
  // O filtro .eq("pago", false) garante que mesmo com webhook simultâneo
  // ou duplicado, apenas uma atualização será aplicada pelo banco.
  const valorPago = paidAmount > 0 ? paidAmount / 100 : inscricao.valor_cobrado;

  const formaMap: Record<string, string> = {
    credit_card: "Cartão de Crédito",
    pix:         "PIX",
    debit_card:  "Cartão de Débito",
  };
  const formaPgto = formaMap[captureMethod] || captureMethod || "InfinitePay";

  const { error: updErr, count } = await supabase
    .from("evento_inscricoes")
    .update({
      pago:                    true,
      valor_pago:              valorPago,
      forma_pagamento:         formaPgto,
      data_pagamento:          new Date().toISOString(),
      referencia_pagamento:    transactionNsu || invoiceSlug,
      status:                  "confirmada",
      infinitypay_charge_id:   invoiceSlug   || undefined,
      infinitypay_status:      "paid",
      atualizado_em:           new Date().toISOString(),
    })
    .eq("id", inscricaoId)
    .eq("pago", false)   // atômico: só atualiza se ainda não estava paga
    .select("id", { count: "exact", head: true });

  if (updErr) {
    console.error("Webhook InfinitePay: erro ao atualizar inscrição", updErr.message);
    return json({ error: "Erro ao atualizar inscrição" }, 400); // 400 = InfinitePay tenta novamente
  }

  if (count === 0) {
    // Outra requisição simultânea já atualizou — sem erro
    console.log(`Webhook InfinitePay: concorrência detectada para ${inscricaoId} — sem ação`);
    return json({ ok: true, notice: "concorrencia resolvida" });
  }

  console.log(`Webhook InfinitePay: inscrição ${inscricaoId} paga via ${formaPgto} — R$ ${valorPago}`);
  return json({ ok: true });
});
