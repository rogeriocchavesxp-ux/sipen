// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: whatsapp-send
// Proxy seguro para o BotConversa. A API key nunca vai ao frontend.
//
// Secrets obrigatórios (supabase secrets set):
//   BOTCONVERSA_API_KEY  → Configurações → Integrações → API → Chave API
//
// Secret opcional:
//   BOTCONVERSA_BASE_URL → padrão: https://backend.botconversa.com.br/api/v1
//
// Fluxo:
//   1. GET  /subscriber/get_by_phone/{phone}/ → busca contato existente
//   2. POST /subscriber/                       → cria contato se não existir
//   3. POST /subscriber/{id}/send_message/     → envia a mensagem
// ═══════════════════════════════════════════════════════════════

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_BASE_URL = "https://backend.botconversa.com.br/api/v1/webhook";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Helpers BotConversa ──────────────────────────────────────
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

// Retorna subscriber_id, criando o contato se necessário
async function resolverSubscriber(
  baseUrl: string,
  apiKey: string,
  phone: string,
  name: string
): Promise<{ id: number | null; error?: string }> {
  // 1. Busca por telefone
  const get = await bcGet(baseUrl, apiKey, `/subscriber/get_by_phone/${phone}/`);
  if (get.status === 200 && get.body?.id) {
    return { id: get.body.id };
  }

  // 2. Cria o contato
  const create = await bcPost(baseUrl, apiKey, "/subscriber/", {
    phone,
    name: name || phone,
  });
  if ((create.status === 200 || create.status === 201) && create.body?.id) {
    return { id: create.body.id };
  }

  return { id: null, error: `Não foi possível resolver subscriber: ${JSON.stringify(create.body)}` };
}

// ── Handler principal ────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return json({ error: "Método não permitido" }, 405);

  // ── 1. Valida JWT ────────────────────────────────────────────
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
    para_numero:     string;
    para_nome?:      string;
    mensagem:        string;
    modulo:          string;
    referencia_tipo?: string;
    referencia_id?:  string;
    idempotency_key?: string;
  };
  try { body = await req.json(); }
  catch { return json({ error: "Body JSON inválido" }, 400); }

  const { para_numero, para_nome, mensagem, modulo, referencia_tipo, referencia_id, idempotency_key } = body;

  if (!para_numero || !mensagem || !modulo) {
    return json({ error: "para_numero, mensagem e modulo são obrigatórios" }, 400);
  }

  // Normaliza número → somente dígitos com DDI 55
  const numero = para_numero.replace(/\D/g, "");
  if (numero.length < 10 || numero.length > 13) {
    return json({ error: "Número de telefone inválido" }, 400);
  }
  const numeroFinal = numero.startsWith("55") ? numero : "55" + numero;

  // ── 3. Service role ──────────────────────────────────────────
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── 4. Verifica módulo ativo ─────────────────────────────────
  const { data: modConfig } = await sb
    .from("whatsapp_modulo_config")
    .select("ativo")
    .eq("modulo", modulo)
    .single();

  if (modConfig && !modConfig.ativo) {
    return json({ ok: false, status: "modulo_inativo" });
  }

  // ── 5. Idempotência ──────────────────────────────────────────
  if (idempotency_key) {
    const { data: existing } = await sb
      .from("whatsapp_mensagens")
      .select("id, status")
      .eq("idempotency_key", idempotency_key)
      .single();

    if (existing) {
      return json({ ok: false, status: "duplicado", id: existing.id });
    }
  }

  // ── 6. Verifica API key ──────────────────────────────────────
  const BC_KEY = Deno.env.get("BOTCONVERSA_API_KEY");
  if (!BC_KEY) {
    return json({ error: "BOTCONVERSA_API_KEY não configurada nos secrets do Supabase" }, 503);
  }
  const BC_BASE = (Deno.env.get("BOTCONVERSA_BASE_URL") || DEFAULT_BASE_URL).replace(/\/$/, "");

  // ── 7. Registra no log como pendente ─────────────────────────
  const { data: logRow, error: logErr } = await sb
    .from("whatsapp_mensagens")
    .insert({
      para_numero:     numeroFinal,
      para_nome:       para_nome || null,
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
    return json({ error: "Erro ao registrar mensagem: " + logErr.message }, 500);
  }
  const logId = logRow.id;

  // ── 8. Resolve subscriber (busca ou cria contato) ────────────
  let bcOk  = false;
  let errMsg = "";

  try {
    const { id: subscriberId, error: subErr } = await resolverSubscriber(
      BC_BASE, BC_KEY, numeroFinal, para_nome || ""
    );

    if (!subscriberId) {
      errMsg = subErr || "Subscriber não encontrado e não foi possível criar";
    } else {
      // ── 9. Envia a mensagem ────────────────────────────────
      const send = await bcPost(
        BC_BASE, BC_KEY,
        `/subscriber/${subscriberId}/send_message/`,
        { type: "text", value: mensagem }
      );

      if (send.status === 200 || send.status === 201) {
        bcOk = true;
      } else {
        errMsg = `HTTP ${send.status}: ${JSON.stringify(send.body)}`;
        console.error("[whatsapp-send] BotConversa send:", errMsg);
      }
    }
  } catch (e) {
    errMsg = e instanceof Error ? e.message : String(e);
    console.error("[whatsapp-send] erro:", errMsg);
  }

  // ── 10. Atualiza log ─────────────────────────────────────────
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
