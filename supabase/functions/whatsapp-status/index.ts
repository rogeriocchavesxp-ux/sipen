// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: whatsapp-status
// Verifica se o BotConversa está configurado e operacional.
//
// GET /functions/v1/whatsapp-status
// Requer Authorization: Bearer <jwt>
//
// Resposta:
//   { conectado: boolean, estado: string, provedor: "BotConversa" }
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
  if (req.method !== "GET")     return json({ error: "Método não permitido" }, 405);

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

  // ── 2. Verifica se o secret está configurado ─────────────────
  const BC_KEY = Deno.env.get("BOTCONVERSA_API_KEY");
  if (!BC_KEY) {
    return json({
      conectado: false,
      estado:    "sem_chave",
      provedor:  "BotConversa",
      ajuda:     "Adicione BOTCONVERSA_API_KEY nos secrets do Supabase (Edge Functions → Secrets)",
    });
  }

  // ── 3. Verifica a URL configurada ────────────────────────────
  const BC_URL = Deno.env.get("BOTCONVERSA_API_URL") || DEFAULT_API_URL;

  // ── 4. Tenta validar a chave com um OPTIONS request ──────────
  // BotConversa não expõe endpoint de status público; usamos um
  // request leve para checar se a chave é reconhecida.
  try {
    const probe = await fetch(BC_URL, {
      method:  "OPTIONS",
      headers: { "api-key": BC_KEY },
    });

    // 401/403 → chave inválida. 2xx/405 → servidor acessível.
    if (probe.status === 401 || probe.status === 403) {
      return json({
        conectado: false,
        estado:    "chave_invalida",
        provedor:  "BotConversa",
        ajuda:     "A BOTCONVERSA_API_KEY pode estar errada. Verifique em Configurações → Integrações no painel BotConversa.",
      });
    }
  } catch (_) {
    // Rede inacessível
    return json({
      conectado: false,
      estado:    "erro_conexao",
      provedor:  "BotConversa",
    });
  }

  return json({
    conectado: true,
    estado:    "configurado",
    provedor:  "BotConversa",
    api_url:   BC_URL,
  });
});
