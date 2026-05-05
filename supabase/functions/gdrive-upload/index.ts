// ═══════════════════════════════════════════════════════
// SIPEN — Edge Function: gdrive-upload
// Recebe arquivo do frontend, faz upload no Google Drive
// e salva metadados em financeiro_anexos (Supabase).
//
// Secrets necessários (supabase secrets set):
//   GOOGLE_SERVICE_ACCOUNT   → JSON completo da service account
//   GDRIVE_FOLDER_BOLETOS    → ID da pasta "Boletos" no Drive
//   GDRIVE_FOLDER_NOTAS      → ID da pasta "Notas Fiscais" no Drive
// ═══════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ── JWT / OAuth2 para Google ─────────────────────────── */

function pemToBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function b64url(data: string | ArrayBuffer): string {
  const bytes = typeof data === "string"
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);
  return btoa(String.fromCharCode(...bytes))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken(): Promise<string> {
  const sa = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT")!);
  const now = Math.floor(Date.now() / 1000);

  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss:   sa.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  }));

  const signingInput = `${header}.${payload}`;
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", pemToBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const signature = b64url(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signingInput))
  );

  const jwt = `${signingInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const { access_token, error_description } = await res.json();
  if (!access_token) throw new Error(`OAuth2 falhou: ${error_description}`);
  return access_token;
}

/* ── Google Drive: upload + tornar público ────────────── */

async function driveUpload(
  token: string,
  file: File,
  folderId: string,
): Promise<{ id: string; webViewLink: string }> {
  const metadata = JSON.stringify({ name: file.name, parents: [folderId] });
  const form = new FormData();
  form.append("metadata", new Blob([metadata], { type: "application/json" }));
  form.append("file",     new Blob([await file.arrayBuffer()], { type: file.type }));

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!res.ok) throw new Error(`Drive upload: ${await res.text()}`);
  return res.json();
}

async function tornarPublico(token: string, fileId: string): Promise<void> {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
}

/* ── Handler principal ────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const form = await req.formData();
    const file          = form.get("file")           as File;
    const tipoArquivo   = form.get("tipo_arquivo")   as string; // boleto | nota_fiscal
    const demandaId     = form.get("demanda_id")     as string | null;
    const solicitacaoId = form.get("solicitacao_id") as string | null;
    const criadoPor     = form.get("criado_por")     as string | null;

    if (!file || !tipoArquivo) {
      return new Response(JSON.stringify({ error: "file e tipo_arquivo são obrigatórios" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Valida tipo de arquivo (segurança)
    const TIPOS_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png"];
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      return new Response(JSON.stringify({ error: "Apenas PDF, JPG ou PNG são aceitos" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Determina pasta no Drive
    const folderId = tipoArquivo === "boleto"
      ? Deno.env.get("GDRIVE_FOLDER_BOLETOS")!
      : Deno.env.get("GDRIVE_FOLDER_NOTAS")!;

    // Upload no Google Drive
    const token     = await getAccessToken();
    const driveFile = await driveUpload(token, file, folderId);
    await tornarPublico(token, driveFile.id); // "qualquer pessoa com o link pode visualizar"

    // Salva metadados no Supabase (usa service role para bypassar RLS)
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await sb
      .from("financeiro_anexos")
      .insert({
        demanda_id:           demandaId     || null,
        solicitacao_id:       solicitacaoId || null,
        tipo_arquivo:         tipoArquivo,
        nome_original:        file.name,
        google_drive_file_id: driveFile.id,
        google_drive_url:     driveFile.webViewLink,
        mime_type:            file.type,
        tamanho_bytes:        file.size,
        criado_por:           criadoPor || null,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, anexo: data }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[gdrive-upload]", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
