// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: infinitypay-webhook
// Recebe notificações de pagamento da InfinityPay e atualiza
// o status da inscrição no banco de dados.
//
// URL para configurar no painel InfinityPay:
//   https://<seu-projeto>.supabase.co/functions/v1/infinitypay-webhook
//   (Painel InfinityPay > Configurações > Integrações > Webhooks)
//
// Secrets obrigatórios:
//   SUPABASE_URL              → URL do projeto Supabase
//   SUPABASE_SERVICE_ROLE_KEY → Chave service_role
//   INFINITYPAY_WEBHOOK_SECRET → Secret para validar assinatura
//                                (gerado no painel InfinityPay ao criar o webhook)
// ═══════════════════════════════════════════════════════════════

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-infinitepay-signature",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Validação de assinatura HMAC-SHA256 (padrão InfinityPay)
async function validarAssinatura(secret: string, body: string, signature: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    return computed === signature.replace("sha256=", "");
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const rawBody = await req.text();

  // ── Validar assinatura ────────────────────────────────────────
  const webhookSecret = Deno.env.get("INFINITYPAY_WEBHOOK_SECRET");
  if (webhookSecret) {
    const signature = req.headers.get("x-infinitepay-signature") || req.headers.get("x-webhook-signature") || "";
    if (signature) {
      const valid = await validarAssinatura(webhookSecret, rawBody, signature);
      if (!valid) return json({ error: "Assinatura inválida" }, 401);
    }
  }

  // ── Parsear payload ───────────────────────────────────────────
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(rawBody); } catch { return json({ error: "Payload inválido" }, 400); }

  const evento  = String(payload.event || payload.type || "");
  const charge  = (payload.charge || payload.data || payload) as Record<string, unknown>;
  const chargeId = String(charge.id || "");

  if (!chargeId) return json({ error: "charge.id ausente" }, 400);

  // ── Mapear status InfinityPay → SIPEN ────────────────────────
  const statusPago = ["paid", "approved", "captured", "settled"].some(s => evento.includes(s) || String(charge.status).includes(s));
  const statusFalhou = ["failed", "refused", "expired", "cancelled"].some(s => evento.includes(s) || String(charge.status).includes(s));

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Buscar inscrição ──────────────────────────────────────────
  const { data: inscricao, error: iErr } = await supabase
    .from("evento_inscricoes")
    .select("id, pago, infinitypay_status, valor_cobrado")
    .eq("infinitypay_charge_id", chargeId)
    .single();

  if (iErr || !inscricao) {
    console.error("Inscrição não encontrada para charge_id:", chargeId);
    return json({ ok: true, notice: "charge não mapeada neste sistema" });
  }

  if (inscricao.pago && statusPago) {
    return json({ ok: true, notice: "já estava pago" });
  }

  // ── Atualizar inscrição ───────────────────────────────────────
  const update: Record<string, unknown> = {
    infinitypay_status: String(charge.status || evento),
    atualizado_em: new Date().toISOString(),
  };

  if (statusPago) {
    const valorPago = charge.amount ? Number(charge.amount) / 100 : inscricao.valor_cobrado;
    update.pago            = true;
    update.data_pagamento  = new Date().toISOString();
    update.valor_pago      = valorPago;
    update.forma_pagamento = String(charge.payment_method || charge.method || "InfinityPay");
    update.referencia_pagamento = chargeId;
    update.status = "confirmada";
  } else if (statusFalhou) {
    update.infinitypay_status = "failed";
  }

  const { error: updErr } = await supabase
    .from("evento_inscricoes")
    .update(update)
    .eq("id", inscricao.id);

  if (updErr) {
    console.error("Erro ao atualizar inscrição:", updErr.message);
    return json({ error: "Erro ao atualizar" }, 500);
  }

  console.log(`Webhook InfinityPay: charge=${chargeId} evento=${evento} inscricao=${inscricao.id} pago=${statusPago}`);
  return json({ ok: true });
});
