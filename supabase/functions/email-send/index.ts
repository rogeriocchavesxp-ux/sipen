// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: email-send
// Notifica membros da Tesouraria quando uma demanda é aprovada.
//
// Secrets obrigatórios (supabase secrets set):
//   RESEND_API_KEY  → chave de API do Resend (https://resend.com)
//   RESEND_FROM     → remetente ex: "SIPEN <noreply@seudominio.com.br>"
//   SIPEN_APP_URL   → URL pública ex: "https://org.github.io/sipen/"
//
// Body esperado (POST JSON):
//   demanda_id       string   UUID da demanda aprovada
//   idempotency_key  string?  chave anti-duplicata (gerada automaticamente se omitida)
//   force_resend     boolean? true = ignora idempotência (reenvio manual)
// ═══════════════════════════════════════════════════════════════

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function fmtBRL(v: unknown): string {
  const n = Number(v);
  return isNaN(n) || v == null ? "—"
    : `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: unknown): string {
  if (!d) return "—";
  try { return new Date(String(d)).toLocaleDateString("pt-BR"); } catch { return "—"; }
}

function row(lbl: string, val: string): string {
  return `<tr>
    <td style="padding:8px 0;border-top:1px solid #f0f0f0;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.05em;width:38%;vertical-align:top">${esc(lbl)}</td>
    <td style="padding:8px 0;border-top:1px solid #f0f0f0;font-size:13px;color:#1a1a1a">${esc(val)}</td>
  </tr>`;
}

function buildHtml(dem: Record<string,unknown>, fd: Record<string,unknown>, appUrl: string): string {
  const rows = [
    row("Solicitante",        String(dem.solicitante  || "—")),
    row("Responsável",        String(dem.responsavel  || "—")),
    row("Valor",              fmtBRL(fd.valor)),
    row("Forma de Pagamento", String(fd.forma_pagamento || "—")),
    row("Status",             "Aguardando Pagamento"),
    row("Data de Abertura",   fmtDate(dem.data_abertura || dem.criado_em)),
    row("Data de Aprovação",  fmtDate(new Date().toISOString())),
    dem.descricao ? row("Descrição / Observações", String(dem.descricao)) : "",
  ].filter(Boolean).join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demanda Aprovada</title></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:32px 16px">
    <table width="560" cellpadding="0" cellspacing="0"
      style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.10)">
      <tr>
        <td style="background:#1e7c3a;padding:24px 32px">
          <div style="font-size:11px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Tesouraria · SIPEN</div>
          <div style="font-size:20px;font-weight:700;color:#fff">💰 Demanda Aprovada para Pagamento</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px">
          <div style="font-size:11px;font-weight:700;color:#bbb;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Solicitação</div>
          <div style="font-size:19px;font-weight:700;color:#111;margin-bottom:22px;line-height:1.3">${esc(String(dem.titulo || "—"))}</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>
          <div style="margin-top:28px;text-align:center">
            <a href="${esc(appUrl)}"
              style="display:inline-block;background:#1e7c3a;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700">
              Abrir no SIPEN →
            </a>
          </div>
        </td>
      </tr>
      <tr>
        <td style="background:#f8f9fa;padding:14px 32px;border-top:1px solid #eee">
          <div style="font-size:11px;color:#bbb;text-align:center">
            Notificação automática do SIPEN · Não responda este e-mail
          </div>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return json({ error: "Método não permitido" }, 405);

  // ── 1. Valida JWT ─────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

  const sbUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await sbUser.auth.getUser();
  if (authErr || !user) return json({ error: "Token inválido" }, 401);

  // ── 2. Parse body ─────────────────────────────────────────────
  let body: { demanda_id: string; idempotency_key?: string; force_resend?: boolean };
  try { body = await req.json(); }
  catch { return json({ error: "Body JSON inválido" }, 400); }

  const { demanda_id, idempotency_key, force_resend } = body;
  if (!demanda_id) return json({ error: "demanda_id é obrigatório" }, 400);

  const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_KEY) {
    return json({
      error: "RESEND_API_KEY não configurado.",
      ajuda: "1) Crie conta em resend.com  2) Gere API Key  3) supabase secrets set RESEND_API_KEY=re_..."
    }, 503);
  }

  const FROM    = Deno.env.get("RESEND_FROM")    || "SIPEN <noreply@sipen.app>";
  const APP_URL = (Deno.env.get("SIPEN_APP_URL") || "").replace(/\/$/, "") || "https://sipen.app";

  // ── 3. Service role client ────────────────────────────────────
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── 4. Idempotência ───────────────────────────────────────────
  const ikey = idempotency_key || `demanda-aprovacao-${demanda_id}`;

  if (!force_resend) {
    const { data: existing } = await sb
      .from("email_notificacoes")
      .select("id, status")
      .eq("idempotency_key", ikey)
      .eq("status", "enviado")
      .limit(1);
    if (existing?.length) {
      return json({ ok: false, status: "duplicado", mensagem: "E-mail já enviado para esta aprovação. Use force_resend: true para reenviar." });
    }
  }

  // ── 5. Busca dados da demanda ─────────────────────────────────
  const { data: demanda, error: dErr } = await sb
    .from("demandas")
    .select("id, titulo, solicitante, responsavel, descricao, status, data_abertura, criado_em, financial_data")
    .eq("id", demanda_id)
    .single();
  if (dErr || !demanda) return json({ error: "Demanda não encontrada" }, 404);

  const fd = (demanda.financial_data && typeof demanda.financial_data === "object")
    ? demanda.financial_data as Record<string, unknown>
    : {};

  // ── 6. Busca membros ativos da Tesouraria com e-mail ──────────
  const { data: deptRow, error: deptErr } = await sb
    .from("dept_administrativos")
    .select("id")
    .eq("slug", "tesouraria")
    .eq("status", "ativo")
    .single();

  if (deptErr || !deptRow) {
    return json({ error: "Departamento Tesouraria não encontrado ou inativo" }, 404);
  }

  const { data: membros } = await sb
    .from("dept_membros")
    .select("pessoas(nome, email)")
    .eq("departamento_id", deptRow.id)
    .eq("status", "ativo");

  type PessoaRef = { nome: string; email: string };
  const destinatarios: PessoaRef[] = (membros || [])
    .map((m: Record<string, unknown>) => {
      const p = m.pessoas as PessoaRef | null;
      return (p && p.email) ? { nome: p.nome || "", email: p.email } : null;
    })
    .filter(Boolean) as PessoaRef[];

  if (!destinatarios.length) {
    return json({
      ok: false,
      status: "sem_destinatarios",
      mensagem: "Nenhum membro ativo da Tesouraria possui e-mail cadastrado.",
    });
  }

  // ── 7. Monta e-mail ───────────────────────────────────────────
  const assunto  = `[SIPEN] Demanda Aprovada para Pagamento — ${demanda.titulo || "Sem título"}`;
  const htmlBody = buildHtml(demanda, fd, APP_URL);
  const toEmails = destinatarios.map(d => d.email);

  // ── 8. Registra log pendente ──────────────────────────────────
  const ikeyFinal = force_resend
    ? `${ikey}-resend-${Date.now()}`
    : ikey;

  const { data: logRow } = await sb
    .from("email_notificacoes")
    .insert({
      para_email:      toEmails.join(", "),
      para_nome:       destinatarios.map(d => d.nome).join(", "),
      assunto,
      modulo:          "DEMANDAS",
      referencia_tipo: "demanda_aprovacao",
      referencia_id:   String(demanda_id),
      status:          "pendente",
      enviado_por:     user.id,
      idempotency_key: ikeyFinal,
    })
    .select("id")
    .single();

  const logId = logRow?.id;

  // ── 9. Envia via Resend ───────────────────────────────────────
  let ok    = false;
  let errMsg = "";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ from: FROM, to: toEmails, subject: assunto, html: htmlBody }),
    });

    if (res.ok) {
      ok = true;
    } else {
      const body = await res.text();
      errMsg = `Resend HTTP ${res.status}: ${body}`;
      console.error("[email-send] Resend:", errMsg);
    }
  } catch (e) {
    errMsg = e instanceof Error ? e.message : String(e);
    console.error("[email-send] fetch:", errMsg);
  }

  // ── 10. Atualiza log ──────────────────────────────────────────
  if (logId) {
    await sb.from("email_notificacoes").update(
      ok
        ? { status: "enviado", enviado_em: new Date().toISOString(), erro_msg: null }
        : { status: "erro",    erro_msg: errMsg }
    ).eq("id", logId);
  }

  if (!ok) return json({ ok: false, status: "erro", error: errMsg, log_id: logId }, 502);

  return json({
    ok:           true,
    status:       "enviado",
    destinatarios: destinatarios.length,
    emails:       toEmails,
    log_id:       logId,
  });
});
