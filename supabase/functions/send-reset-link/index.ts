// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: send-reset-link
// Gera link de redefinição de senha e envia via WhatsApp (BotConversa).
// Requer perfil admin_geral ou administrador_geral.
//
// Secrets necessários (mesmos do whatsapp-send):
//   BOTCONVERSA_API_KEY
//   BOTCONVERSA_BASE_URL (opcional)
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

async function bcPost(baseUrl: string, apiKey: string, path: string, payload: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method:  "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function bcGet(baseUrl: string, apiKey: string, path: string) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function resolverSubscriber(
  baseUrl: string, apiKey: string, phone: string, name: string
): Promise<{ id: number | null; error?: string }> {
  const get = await bcGet(baseUrl, apiKey, `/subscriber/get_by_phone/${phone}/`);
  if (get.status === 200 && get.body?.id) return { id: get.body.id };

  const parts  = (name || "").trim().split(/\s+/);
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return json({ error: "Método não permitido" }, 405);

  // ── 1. Valida JWT ────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

  const sbAnon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await sbAnon.auth.getUser();
  if (authErr || !user) return json({ error: "Token inválido" }, 401);

  // ── 2. Verifica permissão (admin) ────────────────────────────
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: pessoa } = await sb
    .from("pessoas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!pessoa) return json({ error: "Acesso negado. Perfil não encontrado." }, 403);

  const { data: membro } = await sb
    .from("membros")
    .select("funcao")
    .eq("pessoa_id", pessoa.id)
    .eq("status", "ativo")
    .is("deleted_at", null)
    .maybeSingle();

  const adminRoles = ["admin_geral", "administrador_geral", "ADMINISTRADOR_GERAL"];
  if (!membro || !adminRoles.includes(membro.funcao)) {
    return json({ error: `Acesso negado. Perfil "${membro?.funcao}" não tem permissão.` }, 403);
  }

  // ── 3. Parse do body ─────────────────────────────────────────
  let body: { email: string; telefone: string; nome?: string };
  try { body = await req.json(); }
  catch { return json({ error: "Body JSON inválido" }, 400); }

  const { email, telefone, nome } = body;
  if (!email || !telefone) return json({ error: "email e telefone são obrigatórios" }, 400);

  // ── 4. Gera link de reset ────────────────────────────────────
  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
    type:       "recovery",
    email,
    options:    { redirectTo: `${Deno.env.get("SITE_URL") || "https://sipen.com.br"}/#reset-senha` },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    return json({ error: "Erro ao gerar link: " + (linkErr?.message || "sem link") }, 500);
  }

  const link = linkData.properties.action_link;

  // ── 5. Tenta enviar via BotConversa ─────────────────────────
  const BC_KEY = Deno.env.get("BOTCONVERSA_API_KEY");
  if (!BC_KEY) {
    return json({ ok: true, link, whatsapp_sent: false, reason: "BOTCONVERSA_API_KEY não configurada" });
  }

  const BC_BASE  = (Deno.env.get("BOTCONVERSA_BASE_URL") || DEFAULT_BASE_URL).replace(/\/$/, "");
  const numero   = telefone.replace(/\D/g, "");
  const numeroFinal = numero.startsWith("55") ? numero : "55" + numero;

  const nomeFmt = (nome || "").trim().split(" ")[0] || "prezado(a)";
  const mensagem =
    `Olá, ${nomeFmt}! Aqui é o SIPEN da IPPenha.\n\n` +
    `Clique no link abaixo para redefinir sua senha de acesso ao sistema:\n\n` +
    `${link}\n\n` +
    `⚠️ O link expira em 1 hora. Se não foi você quem solicitou, ignore esta mensagem.`;

  let whatsappSent = false;
  let whatsappError = "";

  try {
    const { id: subscriberId, error: subErr } = await resolverSubscriber(BC_BASE, BC_KEY, numeroFinal, nome || "");
    if (!subscriberId) {
      whatsappError = subErr || "Subscriber não resolvido";
    } else {
      const send = await bcPost(BC_BASE, BC_KEY, `/subscriber/${subscriberId}/send_message/`, {
        type: "text", value: mensagem,
      });
      whatsappSent = send.status === 200 || send.status === 201;
      if (!whatsappSent) whatsappError = `HTTP ${send.status}: ${JSON.stringify(send.body)}`;
    }
  } catch (e) {
    whatsappError = e instanceof Error ? e.message : String(e);
  }

  // ── 6. Registra no log de mensagens WhatsApp ─────────────────
  if (BC_KEY) {
    await sb.from("whatsapp_mensagens").insert({
      para_numero:     numeroFinal,
      para_nome:       nome || null,
      mensagem,
      modulo:          "SISTEMA",
      referencia_tipo: "reset_senha",
      status:          whatsappSent ? "enviado" : "erro",
      enviado_por:     user.id,
      erro_msg:        whatsappSent ? null : whatsappError,
      ...(whatsappSent && { enviado_em: new Date().toISOString() }),
    });
  }

  return json({ ok: true, link, whatsapp_sent: whatsappSent, error: whatsappError || undefined });
});
