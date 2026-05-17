// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: whatsapp-send
// Proxy seguro para o BotConversa. A API key nunca vai ao frontend.
//
// Secrets obrigatórios (supabase secrets set):
//   BOTCONVERSA_API_KEY  → chave de integração do painel BotConversa
//                          (Configurações → Integrações → Webhook Integration Key)
//
// Secret opcional:
//   BOTCONVERSA_API_URL  → URL base da API (padrão: https://backend.botconversa.com.br/api/v1/webhooks/send-message/)
//                          Verifique o endpoint correto no Swagger do BotConversa após criar sua conta.
//
// Body esperado (POST JSON):
//   para_numero      string   número com DDI (ex: 5511999999999)
//   mensagem         string   texto da mensagem
//   modulo           string   módulo de origem (ex: 'AGENDA')
//   referencia_tipo  string?  tipo do registro (ex: 'evento')
//   referencia_id    string?  UUID do registro de origem
//   idempotency_key  string?  chave única para evitar duplo envio
// ═══════════════════════════════════════════════════════════════

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_API_URL = "https://backend.botconversa.com.br/api/v1/webhooks/send-message/";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return json({ error: "Método não permitido" }, 405);

  // ── 1. Valida JWT do usuário logado ─────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

  const sbUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await sbUser.auth.getUser();
  if (authErr || !user) return json({ error: "Token inválido" }, 401);

  // ── 2. Parse do body ─────────────────────────────────────────
  let body: {
    para_numero: string;
    mensagem: string;
    modulo: string;
    referencia_tipo?: string;
    referencia_id?: string;
    idempotency_key?: string;
  };
  try { body = await req.json(); }
  catch { return json({ error: "Body JSON inválido" }, 400); }

  const { para_numero, mensagem, modulo, referencia_tipo, referencia_id, idempotency_key } = body;

  if (!para_numero || !mensagem || !modulo) {
    return json({ error: "para_numero, mensagem e modulo são obrigatórios" }, 400);
  }

  // Normaliza: remove não-dígitos, garante prefixo 55 (Brasil)
  const numero = para_numero.replace(/\D/g, "");
  if (numero.length < 10 || numero.length > 13) {
    return json({ error: "Número de telefone inválido" }, 400);
  }
  const numeroFinal = numero.startsWith("55") ? numero : "55" + numero;

  // ── 3. Service role para operações sem restrição de RLS ──────
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── 4. Verifica se o módulo está ativo ───────────────────────
  const { data: modConfig } = await sb
    .from("whatsapp_modulo_config")
    .select("ativo")
    .eq("modulo", modulo)
    .single();

  if (modConfig && !modConfig.ativo) {
    return json({ ok: false, status: "modulo_inativo", mensagem: "Módulo com envio desativado" });
  }

  // ── 5. Verifica idempotência ─────────────────────────────────
  if (idempotency_key) {
    const { data: existing } = await sb
      .from("whatsapp_mensagens")
      .select("id, status")
      .eq("idempotency_key", idempotency_key)
      .single();

    if (existing) {
      return json({ ok: false, status: "duplicado", id: existing.id, mensagem: "Mensagem já enviada" });
    }
  }

  // ── 6. Verifica API key ──────────────────────────────────────
  const BC_KEY = Deno.env.get("BOTCONVERSA_API_KEY");
  if (!BC_KEY) {
    return json({
      error: "BotConversa não configurado. Adicione BOTCONVERSA_API_KEY nos secrets do Supabase.",
      ajuda: "Acesse: Supabase Dashboard → Edge Functions → Secrets → Add BOTCONVERSA_API_KEY"
    }, 503);
  }

  const BC_URL = Deno.env.get("BOTCONVERSA_API_URL") || DEFAULT_API_URL;

  // ── 7. Insere registro pendente no log ───────────────────────
  const { data: logRow, error: logErr } = await sb
    .from("whatsapp_mensagens")
    .insert({
      para_numero:     numeroFinal,
      mensagem,
      modulo,
      referencia_tipo: referencia_tipo ?? null,
      referencia_id:   referencia_id   ?? null,
      status:          "pendente",
      enviado_por:     user.id,
      idempotency_key: idempotency_key ?? null,
    })
    .select("id")
    .single();

  if (logErr) {
    console.error("[whatsapp-send] insert log:", logErr.message);
    return json({ error: "Erro ao registrar mensagem: " + logErr.message }, 500);
  }

  const logId = logRow.id;

  // ── 8. Chama a BotConversa API ───────────────────────────────
  let bcOk  = false;
  let errMsg = "";

  try {
    const bcRes = await fetch(BC_URL, {
      method:  "POST",
      headers: {
        "api-key":      BC_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone:   numeroFinal,
        message: mensagem,
      }),
    });

    if (bcRes.ok) {
      bcOk = true;
    } else {
      const errBody = await bcRes.text();
      errMsg = `HTTP ${bcRes.status}: ${errBody}`;
      console.error("[whatsapp-send] BotConversa:", errMsg);
    }
  } catch (e) {
    errMsg = e instanceof Error ? e.message : String(e);
    console.error("[whatsapp-send] fetch:", errMsg);
  }

  // ── 9. Atualiza log com resultado ────────────────────────────
  await sb.from("whatsapp_mensagens").update(
    bcOk
      ? { status: "enviado", enviado_em: new Date().toISOString(), erro_msg: null }
      : { status: "erro",    erro_msg: errMsg }
  ).eq("id", logId);

  if (!bcOk) {
    return json({ ok: false, status: "erro", id: logId, error: errMsg }, 502);
  }

  return json({ ok: true, status: "enviado", id: logId });
});
