/**
 * reset-senha.js
 * Redefine a senha de um usuário SIPEN via Supabase Auth Admin API.
 *
 * Uso:
 *   node reset-senha.js rogeriocchavesxp@gmail.com
 *   node reset-senha.js rogeriocchavesxp@gmail.com --nova-senha MinhaS3nha!
 *
 * Variáveis de ambiente (.env):
 *   SUPABASE_URL              obrigatório
 *   SUPABASE_SERVICE_ROLE_KEY obrigatório
 *   SMTP_HOST                 opcional (para envio de e-mail)
 *   SMTP_PORT                 opcional (padrão 587)
 *   SMTP_USER                 opcional
 *   SMTP_PASS                 opcional
 *   SMTP_FROM                 opcional (padrão SMTP_USER)
 */

import { createClient } from '@supabase/supabase-js'
import { config }        from 'dotenv'
import crypto            from 'crypto'
import nodemailer        from 'nodemailer'

config()

/* ── Validação de ambiente ─────────────────────────────────────── */

const SUPABASE_URL     = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env')
  process.exit(1)
}

/* ── Argumento: e-mail alvo ────────────────────────────────────── */

const TARGET_EMAIL = process.argv[2]
if (!TARGET_EMAIL || !TARGET_EMAIL.includes('@')) {
  console.error('Uso: node reset-senha.js <email> [--nova-senha <senha>]')
  process.exit(1)
}

const novaSenhaCLI = (() => {
  const i = process.argv.indexOf('--nova-senha')
  return i !== -1 ? process.argv[i + 1] : null
})()

/* ── Cliente admin ─────────────────────────────────────────────── */

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/* ── Geração segura de senha ───────────────────────────────────── */

function gerarSenha() {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower   = 'abcdefghjkmnpqrstuvwxyz'
  const digits  = '23456789'
  const special = '@#$%&*!'

  const pool = upper + lower + digits + special

  // Garante pelo menos 1 de cada categoria
  const mandatory = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    digits[crypto.randomInt(digits.length)],
    special[crypto.randomInt(special.length)],
  ]

  const extra = Array.from({ length: 8 }, () => pool[crypto.randomInt(pool.length)])
  const chars = [...mandatory, ...extra]

  // Embaralha com Fisher-Yates via crypto
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}

/* ── Envio de e-mail ───────────────────────────────────────────── */

async function enviarEmail(destinatario, senha) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('\n[AVISO] SMTP não configurado — e-mail não enviado.')
    console.warn('  Defina SMTP_HOST, SMTP_USER e SMTP_PASS no .env para envio automático.')
    return false
  }

  const transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   parseInt(SMTP_PORT || '587', 10),
    secure: parseInt(SMTP_PORT || '587', 10) === 465,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
  })

  await transporter.sendMail({
    from:    SMTP_FROM || SMTP_USER,
    to:      destinatario,
    subject: 'SIPEN — Sua nova senha de acesso',
    text: [
      'Olá,',
      '',
      'Sua senha de acesso ao SIPEN foi redefinida pelo administrador.',
      '',
      `Senha temporária: ${senha}`,
      '',
      'Ao fazer login, você será solicitado a definir uma nova senha.',
      '',
      'Sistema SIPEN — IPPenha',
    ].join('\n'),
    html: `
      <p>Olá,</p>
      <p>Sua senha de acesso ao <strong>SIPEN</strong> foi redefinida pelo administrador.</p>
      <p>
        <strong>Senha temporária:</strong>
        <code style="background:#f4f4f4;padding:2px 6px;border-radius:3px;">${senha}</code>
      </p>
      <p>Ao fazer login, você será solicitado a definir uma nova senha.</p>
      <p style="color:#888;font-size:12px;">Sistema SIPEN — IPPenha</p>
    `,
  })

  return true
}

/* ══════════════════════════════════════════════════════════════
   SCRIPT PRINCIPAL
══════════════════════════════════════════════════════════════ */

async function resetarSenha() {
  console.log(`\n${'═'.repeat(56)}`)
  console.log(`  SIPEN — RESET DE SENHA`)
  console.log(`  Alvo: ${TARGET_EMAIL}`)
  console.log(`${'═'.repeat(56)}\n`)

  /* ── ETAPA 1: Localizar ou criar usuário em auth.users ────── */

  console.log('[1/9] Buscando usuário em auth.users (paginado)...')

  let authUser = null
  let page = 1
  while (!authUser) {
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 50 })
    if (listErr) throw new Error(`Falha ao listar usuários: ${listErr.message}`)
    if (!users.length) break
    authUser = users.find(u => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase()) || null
    page++
  }

  let criouNovoUsuario = false

  if (!authUser) {
    console.log(`  Usuário não encontrado — criando em auth.users...`)
    const { data: { user: novoUser }, error: createErr } = await admin.auth.admin.createUser({
      email:            TARGET_EMAIL,
      email_confirm:    true,
      user_metadata:    { must_reset_password: true },
    })
    if (createErr) throw new Error(`Falha ao criar usuário: ${createErr.message}`)
    authUser = novoUser
    criouNovoUsuario = true
    console.log(`  Usuário criado: ${authUser.id}`)
  }

  console.log(`  auth.users.id : ${authUser.id}`)
  console.log(`  E-mail        : ${authUser.email}`)
  console.log(`  Criado em     : ${authUser.created_at}`)
  console.log(`  Último login  : ${authUser.last_sign_in_at || 'nunca'}`)
  console.log(`  Novo usuário  : ${criouNovoUsuario ? 'sim' : 'não'}`)

  /* ── ETAPA 2: Verificar vínculo em pessoas ────────────────── */

  console.log('\n[2/9] Verificando vínculo em public.pessoas...')

  const { data: pessoa, error: pessoaErr } = await admin
    .from('pessoas')
    .select('id, nome, email, auth_user_id')
    .eq('email', TARGET_EMAIL)
    .is('deleted_at', null)
    .maybeSingle()

  if (pessoaErr) throw new Error(`Falha ao consultar pessoas: ${pessoaErr.message}`)

  if (pessoa) {
    console.log(`  pessoas.id       : ${pessoa.id}`)
    console.log(`  Nome             : ${pessoa.nome}`)
    console.log(`  auth_user_id     : ${pessoa.auth_user_id || '(não vinculado)'}`)
  } else {
    console.log('  (nenhuma pessoa encontrada com esse e-mail)')
  }

  /* ── ETAPA 3: Backup do estado atual ──────────────────────── */

  console.log('\n[3/9] Registrando estado antes da alteração...')

  const snapshot = {
    timestamp:       new Date().toISOString(),
    email:           TARGET_EMAIL,
    auth_user_id:    authUser.id,
    email_confirmed: authUser.email_confirmed_at,
    last_sign_in:    authUser.last_sign_in_at,
    pessoa_id:       pessoa?.id || null,
    auth_user_id_antes: pessoa?.auth_user_id || null,
  }

  console.log(`  Snapshot: ${JSON.stringify(snapshot, null, 2).replace(/\n/g, '\n  ')}`)

  /* ── ETAPA 4: Gerar nova senha ────────────────────────────── */

  console.log('\n[4/9] Gerando senha segura...')
  const novaSenha = novaSenhaCLI || gerarSenha()
  // A senha NUNCA é impressa no console
  console.log('  Senha gerada (não exibida por segurança).')

  /* ── ETAPA 5: Atualizar senha em auth.users ───────────────── */

  console.log('\n[5/9] Atualizando senha via Auth Admin API...')

  const { data: updatedUser, error: updateErr } = await admin.auth.admin.updateUserById(
    authUser.id,
    { password: novaSenha }
  )

  if (updateErr) throw new Error(`Falha ao atualizar senha: ${updateErr.message}`)
  console.log(`  Senha atualizada. user_id: ${updatedUser.user.id}`)

  /* ── ETAPA 6: Sincronizar auth_user_id em pessoas ─────────── */

  if (pessoa && !pessoa.auth_user_id) {
    console.log('\n[6/9] Vinculando auth_user_id em pessoas...')

    const { error: vinculoErr } = await admin
      .from('pessoas')
      .update({ auth_user_id: authUser.id, updated_at: new Date().toISOString() })
      .eq('id', pessoa.id)

    if (vinculoErr) throw new Error(`Falha ao vincular auth_user_id: ${vinculoErr.message}`)
    console.log(`  pessoas.auth_user_id → ${authUser.id}`)
  } else if (pessoa?.auth_user_id) {
    console.log('\n[6/9] auth_user_id já vinculado — sem alteração.')
  } else {
    console.log('\n[6/9] Pessoa não encontrada em public.pessoas — vínculo não aplicado.')
  }

  /* ── ETAPA 7: Marcar must_reset_password ─────────────────── */

  console.log('\n[7/9] Definindo flag must_reset_password=true em user_metadata...')

  const existingMeta = authUser.user_metadata || {}
  const { error: metaErr } = await admin.auth.admin.updateUserById(
    authUser.id,
    { user_metadata: { ...existingMeta, must_reset_password: true } }
  )

  if (metaErr) throw new Error(`Falha ao definir must_reset_password: ${metaErr.message}`)
  console.log('  must_reset_password = true definido em user_metadata.')

  /* ── ETAPA 8: Enviar e-mail com a nova senha ──────────────── */

  console.log('\n[8/9] Enviando e-mail com a nova senha...')
  const emailEnviado = await enviarEmail(TARGET_EMAIL, novaSenha)
  if (emailEnviado) {
    console.log(`  E-mail enviado para ${TARGET_EMAIL}.`)
  }

  /* ── ETAPA 9: Validação final ─────────────────────────────── */

  console.log('\n[9/9] Validação final...')

  const { data: { user: finalUser }, error: finalErr } = await admin.auth.admin.getUserById(authUser.id)
  if (finalErr) throw new Error(`Falha na validação final: ${finalErr.message}`)

  const resetOk = finalUser.user_metadata?.must_reset_password === true
  console.log(`  must_reset_password : ${resetOk ? 'true ✓' : 'NÃO definido!'}`)
  console.log(`  updated_at          : ${finalUser.updated_at}`)

  /* ── Resumo ───────────────────────────────────────────────── */

  console.log(`\n${'═'.repeat(56)}`)
  console.log('  RESET CONCLUÍDO COM SUCESSO')
  console.log(`${'═'.repeat(56)}`)
  console.log(`  Usuário       : ${TARGET_EMAIL}`)
  console.log(`  auth_user_id  : ${authUser.id}`)
  console.log(`  E-mail enviado: ${emailEnviado ? 'sim' : 'não (SMTP ausente)'}`)
  console.log()
  console.log('  NOTA FRONTEND: ao detectar must_reset_password=true em')
  console.log('  user_metadata, redirecione para a tela de troca de senha.')
  console.log('  Após a troca, chame:')
  console.log('    supabase.auth.updateUser({ data: { must_reset_password: false } })')
  console.log(`${'═'.repeat(56)}\n`)

  if (!emailEnviado) {
    console.log('  A senha não foi exibida aqui por segurança.')
    console.log('  Se SMTP não estiver disponível, use o Supabase Dashboard para')
    console.log('  enviar um link de redefinição: Authentication → Users → Send reset email.')
  }
}

resetarSenha().catch(err => {
  console.error('\nERRO FATAL:', err.message)
  process.exit(1)
})
