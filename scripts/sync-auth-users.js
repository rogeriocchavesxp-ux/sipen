/**
 * sync-auth-users.js
 * Sincroniza membros ativos (pessoas com email) com Supabase Auth.
 *
 * Schema real: pessoas.auth_user_id → auth.users.id
 * Nunca insere diretamente em auth.users — usa apenas Admin API.
 *
 * Uso:
 *   node sync-auth-users.js            → executa de verdade
 *   node sync-auth-users.js --dry-run  → simula, não altera nada
 *   node sync-auth-users.js --limit 10 → processa só os primeiros N
 */

import { createClient } from '@supabase/supabase-js'
import { config }        from 'dotenv'
import { writeFileSync } from 'fs'

config()

/* ── Variáveis de ambiente ────────────────────────────────────── */
const SUPABASE_URL      = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERRO: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env')
  process.exit(1)
}

/* ── Flags de execução ────────────────────────────────────────── */
const DRY_RUN  = process.argv.includes('--dry-run')
const LIMIT    = (() => {
  const i = process.argv.indexOf('--limit')
  return i !== -1 ? parseInt(process.argv[i + 1], 10) : Infinity
})()
const DELAY_MS = 150  // pausa entre chamadas à Auth Admin API

/* ── Cliente admin (nunca expor no frontend) ──────────────────── */
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/* ── Utilitários ──────────────────────────────────────────────── */
const sleep  = ms => new Promise(r => setTimeout(r, ms))
const nowIso = () => new Date().toISOString()

/* ══════════════════════════════════════════════════════════════
   FUNÇÃO PRINCIPAL
══════════════════════════════════════════════════════════════ */
async function syncMembresiaToAuthUsers() {
  const log = {
    executado_em: nowIso(),
    dry_run:      DRY_RUN,
    criados:      [],
    vinculados:   [],
    erros:        [],
    pulados:      [],
  }

  console.log(`\n${'═'.repeat(52)}`)
  console.log(`  SYNC MEMBROS → AUTH USERS  ${DRY_RUN ? '[DRY RUN]' : ''}`)
  console.log(`${'═'.repeat(52)}`)
  console.log(`  Início: ${log.executado_em}`)
  console.log(`${'═'.repeat(52)}\n`)

  /* 1. Buscar pessoas com email e sem auth_user_id ─────────── */
  const { data: pessoas, error: pessoasError } = await supabaseAdmin
    .from('pessoas')
    .select('id, nome, email')
    .not('email', 'is', null)
    .is('auth_user_id', null)
    .is('deleted_at', null)
    .order('nome')

  if (pessoasError) {
    console.error('ERRO ao buscar pessoas:', pessoasError.message)
    throw pessoasError
  }

  const fila = pessoas.slice(0, LIMIT === Infinity ? undefined : LIMIT)
  console.log(`Pessoas com email sem Auth: ${pessoas.length}`)
  if (LIMIT !== Infinity) console.log(`Processando apenas: ${fila.length} (--limit)`)
  console.log()

  /* 2. Carregar auth users existentes em memória ────────────── */
  console.log('Carregando usuários existentes no Auth...')
  const authMap = {}   // email → auth_user_id
  let page = 1
  while (true) {
    const { data: { users }, error: listErr } =
      await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
    if (listErr) throw new Error('Erro ao listar Auth users: ' + listErr.message)
    if (!users.length) break
    users.forEach(u => { if (u.email) authMap[u.email.toLowerCase()] = u.id })
    if (users.length < 1000) break
    page++
  }
  console.log(`Auth users já existentes: ${Object.keys(authMap).length}\n`)

  /* 3. Processar cada membro ───────────────────────────────── */
  let i = 0
  for (const pessoa of fila) {
    i++
    const email = pessoa.email?.trim().toLowerCase()
    const prefix = `[${String(i).padStart(4)}/${fila.length}]`

    /* Validação básica de e-mail */
    if (!email || !email.includes('@') || !email.includes('.')) {
      console.log(`${prefix} PULADO   — email inválido: "${email}"`)
      log.pulados.push({ id: pessoa.id, nome: pessoa.nome, motivo: 'email inválido' })
      continue
    }

    /* Caso A: já existe no Auth → só vincular */
    if (authMap[email]) {
      const authId = authMap[email]
      console.log(`${prefix} VINCULAR — ${email}  →  ${authId.slice(0, 8)}…`)

      if (!DRY_RUN) {
        const { error: upErr } = await supabaseAdmin
          .from('pessoas')
          .update({ auth_user_id: authId })
          .eq('id', pessoa.id)

        if (upErr) {
          log.erros.push({ email, nome: pessoa.nome, etapa: 'update_vinculo', erro: upErr.message })
        } else {
          log.vinculados.push({ email, nome: pessoa.nome, auth_user_id: authId })
        }
      } else {
        log.vinculados.push({ email, nome: pessoa.nome, auth_user_id: authId })
      }
      continue
    }

    /* Caso B: não existe → criar no Auth, depois vincular */
    console.log(`${prefix} CRIAR    — ${email}`)

    if (!DRY_RUN) {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            nome:      pessoa.nome,
            pessoa_id: pessoa.id,
            origem:    'sync_membresia',
          },
        })

      if (createErr) {
        console.error(`           ERRO criar: ${createErr.message}`)
        log.erros.push({ email, nome: pessoa.nome, etapa: 'create_user', erro: createErr.message })
        await sleep(DELAY_MS)
        continue
      }

      const newAuthId = created.user.id
      authMap[email] = newAuthId  // atualiza o mapa local

      const { error: upErr } = await supabaseAdmin
        .from('pessoas')
        .update({ auth_user_id: newAuthId })
        .eq('id', pessoa.id)

      if (upErr) {
        console.error(`           ERRO vincular: ${upErr.message}`)
        log.erros.push({ email, nome: pessoa.nome, etapa: 'update_apos_create', erro: upErr.message })
      } else {
        log.criados.push({ email, nome: pessoa.nome, auth_user_id: newAuthId })
      }

      await sleep(DELAY_MS)
    } else {
      log.criados.push({ email, nome: pessoa.nome, auth_user_id: null })
    }
  }

  /* 4. Relatório final ──────────────────────────────────────── */
  console.log(`\n${'═'.repeat(52)}`)
  console.log('  RESULTADO')
  console.log(`${'═'.repeat(52)}`)
  console.log(`  Criados:    ${log.criados.length}`)
  console.log(`  Vinculados: ${log.vinculados.length}`)
  console.log(`  Erros:      ${log.erros.length}`)
  console.log(`  Pulados:    ${log.pulados.length}`)
  console.log(`  Fim:        ${nowIso()}`)

  if (log.erros.length) {
    console.log('\n  Erros detalhados:')
    log.erros.forEach(e =>
      console.log(`    [${e.etapa}] ${e.email}: ${e.erro}`)
    )
  }

  /* 5. Salva log em arquivo ─────────────────────────────────── */
  const stamp   = nowIso().slice(0, 19).replace(/:/g, '-')
  const logFile = `sync-log-${stamp}${DRY_RUN ? '-dryrun' : ''}.json`
  writeFileSync(logFile, JSON.stringify(log, null, 2))
  console.log(`\n  Log salvo: ${logFile}`)
  console.log(`${'═'.repeat(52)}\n`)

  return log
}

syncMembresiaToAuthUsers().catch(err => {
  console.error('\nFalha crítica:', err.message)
  process.exit(1)
})
