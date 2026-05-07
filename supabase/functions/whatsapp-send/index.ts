// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: whatsapp-send
// Proxy seguro para a Evolution API. A apikey nunca vai ao frontend.
//
// Secrets necessários (supabase secrets set):
//   EVOLUTION_API_KEY  → chave da instância Evolution API
//
// Body esperado (POST JSON):
//   para_numero      string   número E.164 sem + (ex: 5511999999999)
//   mensagem         string   texto da mensagem
//   modulo           string   módulo de origem (ex: 'AGENDA')
//   referencia_tipo  string?  tipo do registro (ex: 'evento', 'membro')
//   referencia_id    string?  UUID do registro de origem
//   idempotency_key  string?  chave única para evitar duplicata
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
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return json({ error: "Método não permitido" }, 405);

  // ── 1. Valida JWT do usuário logado ─────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

  const sbUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await sbUser.auth.getUser();
  if (authErr || !user) return json({ error: "Token inválido" }, 401);

  // ── 2. Parse do body ────────────────────────────────────
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

  // Normaliza número: remove não-dígitos, garante prefixo 55
  const numero = para_numero.replace(/\D/g, "");
  if (numero.length < 10 || numero.length > 13) {
    return json({ error: "Número de telefone inválido" }, 400);
  }
  const numeroFinal = numero.startsWith("55") ? numero : "55" + numero;

  // ── 3. Service role para operações sem restrição de RLS ─
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── 4. Verifica se o módulo está ativo ──────────────────
  const { data: modConfig } = await sb
    .from("whatsapp_modulo_config")
    .select("ativo")
    .eq("modulo", modulo)
    .single();

  if (modConfig && !modConfig.ativo) {
    return json({ ok: false, status: "modulo_inativo", mensagem: "Módulo com envio desativado" });
  }

  // ── 5. Verifica idempotência — evita duplo envio ────────
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

  // ── 6. Busca configuração da instância Evolution ────────
  const { data: config, error: configErr } = await sb
    .from("whatsapp_config")
    .select("api_url, instance_name")
    .eq("ativo", true)
    .single();

  if (configErr || !config) {
    return json({ error: "Evolution API não configurada. Acesse Configurações > WhatsApp." }, 503);
  }

  // ── 7. Insere registro pendente no log ──────────────────
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

  // ── 8. Chama a Evolution API ────────────────────────────
  const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY");
  if (!EVOLUTION_KEY) {
    await sb.from("whatsapp_mensagens").update({
      status:   "erro",
      erro_msg: "EVOLUTION_API_KEY não configurada nos secrets do Supabase",
    }).eq("id", logId);
    return json({ error: "Integração não configurada" }, 503);
  }

  let evoOk = false;
  let errMsg = "";

  try {
    const evoRes = await fetch(
      `${config.api_url}/message/sendText/${config.instance_name}`,
      {
        method:  "POST",
        headers: {
          "apikey":       EVOLUTION_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: numeroFinal,
          text:   mensagem,
        }),
      }
    );

    if (evoRes.ok) {
      evoOk = true;
    } else {
      const errBody = await evoRes.text();
      errMsg = `HTTP ${evoRes.status}: ${errBody}`;
      console.error("[whatsapp-send] Evolution API:", errMsg);
    }
  } catch (e) {
    errMsg = e instanceof Error ? e.message : String(e);
    console.error("[whatsapp-send] fetch error:", errMsg);
  }

  // ── 9. Atualiza log com resultado ───────────────────────
  await sb.from("whatsapp_mensagens").update(
    evoOk
      ? { status: "enviado", enviado_em: new Date().toISOString(), erro_msg: null }
      : { status: "erro",    erro_msg: errMsg }
  ).eq("id", logId);

  if (!evoOk) {
    return json({ ok: false, status: "erro", id: logId, error: errMsg }, 502);
  }

  return json({ ok: true, status: "enviado", id: logId });
});
