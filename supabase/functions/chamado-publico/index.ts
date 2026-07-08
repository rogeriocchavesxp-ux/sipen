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
      // Gera número sequencial no banco (atômico, sem race condition)
      const numRes = await conn.queryObject<{ num: string }>`
        SELECT public.gerar_numero_chamado(${b.area}) AS num
      `
      const numero_chamado = numRes.rows[0].num

      await conn.queryObject`
        INSERT INTO public.demandas (
          id, area, subcategoria, titulo, descricao,
          solicitante, solicitante_txt,
          responsavel, responsavel_txt,
          nome_solicitante_externo, telefone_solicitante,
          financial_data, numero_chamado,
          origem, prioridade, status, data_abertura
        ) VALUES (
          ${b.id}::uuid,
          ${b.area}, ${b.subcategoria}, ${b.titulo}, ${b.descricao},
          ${b.solicitante}, ${b.solicitante_txt},
          ${b.responsavel}, ${b.responsavel_txt},
          ${b.solicitante}, ${b.telefone},
          ${b.financial_data ? JSON.stringify(b.financial_data) : null}::jsonb,
          ${numero_chamado},
          'Portal Público', 'Média', 'Aberta', CURRENT_DATE
        )
      `

      return new Response(JSON.stringify({ id: b.id, numero_chamado }), {
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
