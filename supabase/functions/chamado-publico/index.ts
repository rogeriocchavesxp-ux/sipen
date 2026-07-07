import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  try {
    const b = await req.json()

    const pool = new Pool(Deno.env.get("SUPABASE_DB_URL")!, 1, true)
    const conn = await pool.connect()

    try {
      const result = await conn.queryObject<{ id: string }>`
        INSERT INTO public.demandas (
          id, area, subcategoria, titulo, descricao,
          solicitante, solicitante_txt,
          responsavel, responsavel_txt,
          nome_solicitante_externo, telefone_solicitante,
          financial_data,
          origem, prioridade, status, data_abertura
        ) VALUES (
          ${b.id}::uuid,
          ${b.area}, ${b.subcategoria}, ${b.titulo}, ${b.descricao},
          ${b.solicitante}, ${b.solicitante_txt},
          ${b.responsavel}, ${b.responsavel_txt},
          ${b.solicitante}, ${b.telefone},
          ${b.financial_data ? JSON.stringify(b.financial_data) : null}::jsonb,
          'Portal Público', 'Média', 'Aberta', CURRENT_DATE
        )
        RETURNING id
      `
      return new Response(JSON.stringify({ id: result.rows[0].id }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      })
    } finally {
      conn.release()
      await pool.end()
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...CORS, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
