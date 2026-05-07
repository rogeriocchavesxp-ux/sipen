// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: whatsapp-status
// Consulta o estado da instância Evolution API (conectada/desconectada).
// Usada pelo painel administrativo do SIPEN.
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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "GET")     return json({ error: "Método não permitido" }, 405);

  // ── 1. Valida JWT ───────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

  const sbUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await sbUser.auth.getUser();
  if (authErr || !user) return json({ error: "Token inválido" }, 401);

  // ── 2. Busca configuração ───────────────────────────────
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: config } = await sb
    .from("whatsapp_config")
    .select("api_url, instance_name, ativo")
    .eq("ativo", true)
    .single();

  if (!config) {
    return json({ conectado: false, estado: "nao_configurado", instancia: null });
  }

  // ── 3. Consulta status na Evolution API ─────────────────
  const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY");
  if (!EVOLUTION_KEY) {
    return json({ conectado: false, estado: "sem_chave", instancia: config.instance_name });
  }

  try {
    const res = await fetch(
      `${config.api_url}/instance/connectionState/${config.instance_name}`,
      { headers: { "apikey": EVOLUTION_KEY } }
    );

    if (!res.ok) {
      return json({ conectado: false, estado: "erro_api", instancia: config.instance_name });
    }

    const data = await res.json();
    // Evolution API retorna: { instance: { state: "open" | "close" | "connecting" } }
    const state = data?.instance?.state ?? data?.state ?? "desconhecido";
    const conectado = state === "open";

    return json({ conectado, estado: state, instancia: config.instance_name });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[whatsapp-status] fetch:", msg);
    return json({ conectado: false, estado: "erro_conexao", instancia: config.instance_name });
  }
});
