// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: whatsapp-status
// Verifica se o BotConversa está configurado e acessível.
//
// GET /functions/v1/whatsapp-status
// Requer Authorization: Bearer <jwt>
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

  // ── 2. Verifica secret ───────────────────────────────────────
  const BC_KEY = Deno.env.get("BOTCONVERSA_API_KEY");
  if (!BC_KEY) {
    return json({
      conectado: false,
      estado:    "sem_chave",
      provedor:  "BotConversa",
      ajuda:     "Adicione BOTCONVERSA_API_KEY nos secrets do Supabase (Edge Functions → Secrets)",
    });
  }

  const BC_BASE = (Deno.env.get("BOTCONVERSA_BASE_URL") || DEFAULT_BASE_URL).replace(/\/$/, "");

  // ── 3. Verifica conectividade: GET /subscribers/ ─────────────
  try {
    const res = await fetch(`${BC_BASE}/subscribers/`, {
      headers: { "api-key": BC_KEY },
    });

    if (res.status === 401 || res.status === 403) {
      return json({
        conectado: false,
        estado:    "chave_invalida",
        provedor:  "BotConversa",
        ajuda:     "Verifique a chave em Configurações → Integrações → API no painel BotConversa.",
      });
    }

    if (res.status === 200 || res.status === 404) {
      // 200 = ok, 404 pode ocorrer mas significa que o servidor respondeu
      return json({
        conectado: true,
        estado:    "configurado",
        provedor:  "BotConversa",
        api_url:   BC_BASE,
      });
    }

    return json({
      conectado: false,
      estado:    "erro_conexao",
      provedor:  "BotConversa",
      detalhe:   `HTTP ${res.status}`,
    });
  } catch (_) {
    return json({
      conectado: false,
      estado:    "erro_conexao",
      provedor:  "BotConversa",
    });
  }
});
