import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Espelho de _AREA_MODULO_WA do frontend (manter em sincronia)
const AREA_MODULO: Record<string, string> = {
  "Conselho":                 "CONSELHO",
  "Agendamentos":             "AGENDA",
  "Manutenção":               "INFRAESTRUTURA",
  "Limpeza e Organização":    "INFRAESTRUTURA",
  "Logística":                "INFRAESTRUTURA",
  "Financeiro":               "FINANCEIRO",
  "Comunicação e Divulgação": "MINISTERIAL",
  "Secretaria":               "CONSELHO",
  "Cadastro":                 "MEMBRESIA",
  "Oração e Aconselhamento":  "PASTORAL",
  "Visitação":                "JUNTA_DIACONAL",
  "Apoio ao Culto":           "MINISTERIAL",
  "Ensino (EBT)":             "MINISTERIAL",
  "Ação Social / Hebron":     "MINISTERIAL",
  "Administrativo Geral":     "DEMANDAS",
}

function montarMsgWA(b: Record<string, string>, numero_chamado: string): string {
  const link = "https://sipen.com.br"
  const linhas = [
    `📋 *Nova Demanda - Portal Administrativo Externo*`,
    ``,
    `*N°:* ${numero_chamado}`,
    `*Título:* ${b.titulo}`,
    `*Departamento:* ${b.area || "—"}`,
    b.subcategoria ? `*Subcategoria:* ${b.subcategoria}` : null,
    `*Solicitante:* ${b.solicitante || "—"}`,
    b.telefone     ? `*Telefone:* ${b.telefone}` : null,
    `*Status:* Aberta`,
    b.descricao    ? `\n*Descrição:*\n${b.descricao.slice(0, 300)}${b.descricao.length > 300 ? "…" : ""}` : null,
    ``,
    `🔗 Acesse no SIPEN:\n${link}`,
  ]
  return linhas.filter(l => l !== null).join("\n")
}

async function notificarWA(
  conn: Awaited<ReturnType<InstanceType<typeof Pool>["connect"]>>,
  b: Record<string, string>,
  demandaId: string,
  numero_chamado: string,
) {
  const modulo = AREA_MODULO[b.area]
  if (!modulo) return

  // Verifica se o módulo WA está ativo
  const cfgRes = await conn.queryObject<{ ativo: boolean }>`
    SELECT ativo FROM public.whatsapp_modulo_config WHERE modulo = ${modulo} LIMIT 1
  `
  if (cfgRes.rows.length && !cfgRes.rows[0].ativo) return

  // Busca responsáveis do módulo
  const respRes = await conn.queryObject<{ nome: string; celular: string | null; telefone: string | null; pessoa_id: string }>`
    SELECT r.pessoa_id, p.nome, p.celular, p.telefone
    FROM public.whatsapp_modulo_responsaveis r
    JOIN public.pessoas p ON p.id = r.pessoa_id
    WHERE r.modulo = ${modulo} AND r.ativo = true
  `
  if (!respRes.rows.length) return

  const BC_KEY  = Deno.env.get("BOTCONVERSA_API_KEY")
  const BC_BASE = (Deno.env.get("BOTCONVERSA_BASE_URL") || "https://backend.botconversa.com.br/api/v1/webhook").replace(/\/$/, "")
  if (!BC_KEY) return

  const msg = montarMsgWA(b, numero_chamado)

  for (const row of respRes.rows) {
    const telRaw = row.celular || row.telefone
    if (!telRaw) continue
    const tel = telRaw.replace(/\D/g, "")
    const numero = tel.startsWith("55") ? tel : "55" + tel
    if (numero.length < 12) continue

    const chave = `DEM_NOVA_${demandaId}_${row.pessoa_id}`

    // Idempotência: verifica se já foi enviado
    const dup = await conn.queryObject<{ id: string }>`
      SELECT id FROM public.whatsapp_mensagens WHERE idempotency_key = ${chave} LIMIT 1
    `
    if (dup.rows.length) continue

    // Registra como pendente
    const logRes = await conn.queryObject<{ id: string }>`
      INSERT INTO public.whatsapp_mensagens
        (para_numero, para_nome, mensagem, modulo, referencia_tipo, referencia_id, status, idempotency_key)
      VALUES
        (${numero}, ${row.nome}, ${msg}, ${modulo}, 'demanda', ${demandaId}, 'pendente', ${chave})
      RETURNING id
    `
    const logId = logRes.rows[0]?.id
    if (!logId) continue

    // Resolve subscriber no BotConversa
    let subscriberId: number | null = null
    try {
      const getRes = await fetch(`${BC_BASE}/subscriber/get_by_phone/${numero}/`, {
        headers: { "api-key": BC_KEY, "Content-Type": "application/json" },
      })
      const getData = await getRes.json().catch(() => null)
      if (getRes.status === 200 && getData?.id) {
        subscriberId = getData.id
      } else {
        const parts = (row.nome || "").trim().split(/\s+/)
        const createRes = await fetch(`${BC_BASE}/subscriber/`, {
          method: "POST",
          headers: { "api-key": BC_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ phone: numero, first_name: parts[0] || numero, last_name: parts.slice(1).join(" ") || "." }),
        })
        const createData = await createRes.json().catch(() => null)
        if (createData?.id) subscriberId = createData.id
      }
    } catch (_) { /* ignora erros de rede */ }

    if (!subscriberId) {
      await conn.queryObject`
        UPDATE public.whatsapp_mensagens SET status = 'erro', erro_msg = 'subscriber não resolvido' WHERE id = ${logId}
      `
      continue
    }

    // Envia a mensagem
    let enviado = false
    let erroMsg = ""
    try {
      const sendRes = await fetch(`${BC_BASE}/subscriber/${subscriberId}/send_message/`, {
        method: "POST",
        headers: { "api-key": BC_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", value: msg }),
      })
      enviado = sendRes.status === 200 || sendRes.status === 201
      if (!enviado) {
        const errData = await sendRes.json().catch(() => null)
        erroMsg = `HTTP ${sendRes.status}: ${JSON.stringify(errData)}`
      }
    } catch (e) {
      erroMsg = e instanceof Error ? e.message : String(e)
    }

    await conn.queryObject`
      UPDATE public.whatsapp_mensagens
      SET status      = ${enviado ? "enviado" : "erro"},
          enviado_em  = ${enviado ? new Date().toISOString() : null},
          erro_msg    = ${enviado ? null : erroMsg}
      WHERE id = ${logId}
    `
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  try {
    const b = await req.json()

    const pool = new Pool(Deno.env.get("SUPABASE_DB_URL")!, 1, true)
    const conn = await pool.connect()

    try {
      // Gera número sequencial por categoria
      const numRes = await conn.queryObject<{ num: string }>`
        SELECT public.gerar_numero_chamado(${b.area}) AS num
      `
      const numero_chamado = numRes.rows[0].num

      // INSERT da demanda
      await conn.queryObject`
        INSERT INTO public.demandas (
          id, area, subcategoria, titulo, descricao, local,
          solicitante, solicitante_txt,
          responsavel, responsavel_txt,
          nome_solicitante_externo, telefone_solicitante,
          financial_data, numero_chamado,
          origem, prioridade, status, data_abertura
        ) VALUES (
          ${b.id}::uuid,
          ${b.area}, ${b.subcategoria}, ${b.titulo}, ${b.descricao}, ${b.local || null},
          ${b.solicitante}, ${b.solicitante_txt},
          ${b.responsavel}, ${b.responsavel_txt},
          ${b.solicitante}, ${b.telefone},
          ${b.financial_data ? JSON.stringify(b.financial_data) : null}::jsonb,
          ${numero_chamado},
          ${b.origem || 'Portal Público'}, 'Baixa', 'Aberta', CURRENT_DATE
        )
      `

      // Notificação WhatsApp (mesma conexão, antes de fechar o pool)
      await notificarWA(conn, b, b.id, numero_chamado).catch(e =>
        console.warn("[chamado-publico] WA notify:", e.message)
      )

      return new Response(JSON.stringify({ id: b.id, numero_chamado }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      })
    } finally {
      conn.release()
      await pool.end()
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...CORS, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
