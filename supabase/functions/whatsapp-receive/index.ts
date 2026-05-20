// ═══════════════════════════════════════════════════════════════
// SIPEN — Edge Function: whatsapp-receive
// Recebe webhooks do BotConversa, classifica com IA (Claude) e
// cria demandas automaticamente.
//
// Secrets obrigatórios:
//   BOTCONVERSA_API_KEY  → chave da API BotConversa
//   GEMINI_API_KEY       → chave da API Google Gemini (AI Studio)
//   WEBHOOK_SECRET       → segredo compartilhado para validar o webhook
//
// Secret opcional:
//   BOTCONVERSA_BASE_URL → padrão: https://backend.botconversa.com.br/api/v1/webhook
//
// BotConversa webhook URL:
//   https://<project>.supabase.co/functions/v1/whatsapp-receive?secret=<WEBHOOK_SECRET>
// ═══════════════════════════════════════════════════════════════

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_BC_BASE = "https://backend.botconversa.com.br/api/v1/webhook";
const SIPEN_URL       = "https://rogeriocchavesxp-ux.github.io/sipen/";

// ── Categorias (espelho do frontend) ────────────────────────
const CATS = [
  { id:"conselho",     nome:"Conselho",                resp:"Conselho / Jurídico",
    sub:["Envio de documentos ao Conselho","Solicitação de aprovação","Análise jurídica","Questões disciplinares"] },
  { id:"agendamentos", nome:"Agendamentos",             resp:"Secretaria / Administração",
    sub:["Solicitação de uso de sala","Agendamento de culto/evento","Reserva de espaço","Inclusão em calendário oficial","Cancelamento/alteração de agenda"] },
  { id:"manutencao",   nome:"Manutenção",               resp:"Departamento de Manutenção",
    sub:["Elétrica","Hidráulica","Estrutural","Civil","Pintura","Marcenaria","Internet","Telefonia","Rede/Wi-Fi","Informática","Som","Projeção","Streaming","Ar-condicionado","Câmeras","Iluminação","Jardinagem","Limpeza","Pequenos reparos","Equipamentos"] },
  { id:"limpeza",      nome:"Limpeza e Organização",    resp:"Equipe de Limpeza / Zeladoria",
    sub:["Limpeza geral","Limpeza pós-evento","Organização de espaços","Solicitação de materiais de limpeza"] },
  { id:"logistica",    nome:"Logística",                resp:"Logística / Apoio ao Culto",
    sub:["Montagem/desmontagem de estrutura","Transporte de equipamentos","Apoio em eventos","Organização de cadeiras e mesas"] },
  { id:"financeiro",   nome:"Financeiro",               resp:"Tesouraria / Financeiro",
    sub:["Solicitação de pagamento","Reembolso","Prestação de contas","Solicitação de verba","Orçamento de despesas"] },
  { id:"comunicacao",  nome:"Comunicação e Divulgação", resp:"Comunicação",
    sub:["Divulgação de evento","Criação de arte","Publicação em redes sociais","Avisos para culto","Informativo semanal"] },
  { id:"secretaria",   nome:"Secretaria",               resp:"Secretaria / Conselho",
    sub:["Emissão de documentos","Elaboração de relatórios","Solicitação ao Conselho","Protocolos oficiais","Registro de atas/documentos"] },
  { id:"cadastro",     nome:"Cadastro",                 resp:"Secretaria",
    sub:["Cadastro de membro","Atualização de dados","Transferência de membresia","Inclusão em ministério"] },
  { id:"oracao",       nome:"Oração e Aconselhamento",  resp:"Pastores / Liderança",
    sub:["Pedido de oração","Aconselhamento pastoral","Visita espiritual","Atendimento pastoral"] },
  { id:"visitacao",    nome:"Visitação",                resp:"Pastores / Diaconato",
    sub:["Visita pastoral","Visita hospitalar","Visita social","Acompanhamento de membros"] },
  { id:"culto",        nome:"Apoio ao Culto",           resp:"Equipe de Culto / Música",
    sub:["Escala de voluntários","Equipamentos de som/imagem","Liturgia","Organização do culto"] },
  { id:"ensino",       nome:"Ensino (EBT)",             resp:"Departamento de Ensino",
    sub:["Material didático","Organização de turmas","Cadastro de alunos","Solicitação de professores"] },
  { id:"social",       nome:"Ação Social / Hebron",     resp:"Hebron / Ação Social",
    sub:["Solicitação de ajuda","Projetos sociais","Distribuição de recursos","Cadastro em programas sociais"] },
  { id:"admin_geral",  nome:"Administrativo Geral",     resp:"Administração Geral",
    sub:["Demandas gerais","Apoio administrativo","Solicitações internas","Processos institucionais"] },
] as const;

type Cat = typeof CATS[number];

// ── Helpers BotConversa ──────────────────────────────────────
async function bcGet(baseUrl: string, apiKey: string, path: string) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function bcPost(baseUrl: string, apiKey: string, path: string, payload: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method:  "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function resolverSubscriber(baseUrl: string, apiKey: string, phone: string, name: string) {
  const get = await bcGet(baseUrl, apiKey, `/subscriber/get_by_phone/${phone}/`);
  if (get.status === 200 && get.body?.id) return get.body.id as number;

  const parts = (name || "").trim().split(/\s+/);
  const create = await bcPost(baseUrl, apiKey, "/subscriber/", {
    phone,
    first_name: parts[0] || phone,
    last_name:  parts.slice(1).join(" ") || ".",
  });
  return (create.status === 200 || create.status === 201) ? (create.body?.id as number | null) : null;
}

async function enviarWA(baseUrl: string, apiKey: string, phone: string, name: string, msg: string) {
  try {
    const id = await resolverSubscriber(baseUrl, apiKey, phone, name);
    if (!id) return;
    await bcPost(baseUrl, apiKey, `/subscriber/${id}/send_message/`, { type: "text", value: msg });
  } catch (e) {
    console.error("[whatsapp-receive] enviarWA:", e);
  }
}

// ── Classificação via Claude ─────────────────────────────────
interface IaResult {
  confidence:     number;
  area_id?:       string;
  area_nome?:     string;
  subcategoria?:  string;
  titulo?:        string;
  descricao?:     string;
  solicitante?:   string;
  financial_data?: { valor?: number; data_vencimento?: string };
}

async function classificarComIA(mensagem: string, remetente: string): Promise<IaResult> {
  const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_KEY) return { confidence: 0 };

  const catsDesc = CATS.map(c =>
    `- id="${c.id}" nome="${c.nome}"\n  subcategorias: ${c.sub.slice(0,6).join(" | ")}${c.sub.length > 6 ? " | ..." : ""}`
  ).join("\n");

  const systemPrompt = `Você é um assistente de triagem de demandas para uma organização eclesiástica (SIPEN).
Analise a mensagem do WhatsApp e extraia dados estruturados para criação de uma demanda.

CATEGORIAS DISPONÍVEIS:
${catsDesc}

REGRAS:
1. Só crie demanda se a mensagem for claramente uma solicitação/pedido de serviço.
2. Se for saudação, pergunta genérica, agradecimento ou não relacionado → confidence: 0
3. Escolha a subcategoria mais específica disponível.
4. Para área "financeiro", tente extrair valor (número) e data_vencimento (YYYY-MM-DD) se mencionados.
5. O título deve ser conciso (máximo 80 caracteres).
6. A descrição deve reproduzir fielmente o pedido, sem inventar informações.

Responda APENAS com JSON válido, sem explicações:
{
  "confidence": 0.0-1.0,
  "area_id": "id da categoria",
  "area_nome": "nome da categoria",
  "subcategoria": "subcategoria escolhida",
  "titulo": "título conciso",
  "descricao": "descrição completa",
  "solicitante": "nome extraído ou vazio",
  "financial_data": { "valor": null, "data_vencimento": null }
}`;

  const userMsg = `Remetente: ${remetente || "desconhecido"}\nMensagem: ${mensagem}`;
  const fullPrompt = `${systemPrompt}\n\n---\n${userMsg}`;

  try {
    const model = "gemini-2.5-flash-lite";
    const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.2 },
      }),
    });

    if (!res.ok) {
      console.error("[whatsapp-receive] Gemini HTTP", res.status, await res.text());
      return { confidence: 0 };
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extrai JSON da resposta (pode ter markdown ```json ... ```)
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { confidence: 0 };

    const parsed = JSON.parse(match[0]) as IaResult;
    return parsed;
  } catch (e) {
    console.error("[whatsapp-receive] IA error:", e);
    return { confidence: 0 };
  }
}

// ── Notifica responsáveis da área ───────────────────────────
async function notificarResponsaveis(
  sb:        ReturnType<typeof createClient>,
  bcBase:    string,
  bcKey:     string,
  demanda:   { id: string; area: string; titulo: string; protocolo: string },
  msg:       string,
) {
  const { data: rows } = await sb
    .from("demanda_responsaveis")
    .select("pessoa_id, pessoas(id, nome, celular, telefone)")
    .eq("area", demanda.area)
    .eq("ativo", true);

  const lista = rows ?? [];

  // Fallback: admins se nenhum responsável mapeado
  if (!lista.length) {
    const { data: admins } = await sb
      .from("user_profiles")
      .select("pessoa_id, pessoas(id, nome, celular, telefone)")
      .eq("role", "admin")
      .limit(3);
    lista.push(...(admins ?? []));
  }

  for (const row of lista) {
    const p = (row as any).pessoas;
    const tel = p?.celular || p?.telefone;
    if (!tel) continue;

    const notif = [
      `📲 *Demanda via WhatsApp*`,
      ``,
      `*Protocolo:* ${demanda.protocolo}`,
      `*Título:* ${demanda.titulo}`,
      `*Área:* ${demanda.area}`,
      ``,
      `*Mensagem original:*`,
      msg.slice(0, 400),
      ``,
      `🔗 ${SIPEN_URL}`,
    ].join("\n");

    await enviarWA(bcBase, bcKey, tel.replace(/\D/g, "").replace(/^(?!55)/, "55"), p.nome, notif);
  }
}

// ── Handler principal ────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // ── Valida segredo do webhook ───────────────────────────────
  const url    = new URL(req.url);
  const secret = url.searchParams.get("secret") ?? "";
  const WSECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

  if (WSECRET && secret !== WSECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ── Parse do body ───────────────────────────────────────────
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return new Response("Bad Request", { status: 400 }); }

  // Extrai phone, name e texto do payload BotConversa
  const subscriber = (body.subscriber ?? body) as Record<string, unknown>;
  const messageObj = (body.message ?? body.last_message ?? {}) as Record<string, unknown>;

  const phone = (subscriber.phone ?? body.phone ?? "") as string;
  const name  = (
    subscriber.name ??
    `${subscriber.first_name ?? ""} ${subscriber.last_name ?? ""}`.trim() ??
    ""
  ) as string;

  let texto = "";
  if (messageObj.type === "text") {
    texto = (messageObj.value ?? messageObj.message ?? "") as string;
  } else if (typeof body.text === "string") {
    texto = body.text;
  } else if (typeof body.message === "string") {
    texto = body.message;
  }

  if (!phone || !texto.trim()) {
    // Webhook válido mas sem conteúdo processável — retorna 200 para evitar retries
    return new Response(JSON.stringify({ ok: true, status: "ignored" }), { status: 200 });
  }

  const numeroFinal = phone.replace(/\D/g, "").replace(/^(?!55)/, "55");

  // ── Clients ─────────────────────────────────────────────────
  const BC_KEY  = Deno.env.get("BOTCONVERSA_API_KEY") ?? "";
  const BC_BASE = (Deno.env.get("BOTCONVERSA_BASE_URL") ?? DEFAULT_BC_BASE).replace(/\/$/, "");

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Insere log inicial ──────────────────────────────────────
  const { data: logRow } = await sb
    .from("whatsapp_ia_log")
    .insert({ phone: numeroFinal, nome_remetente: name || null, mensagem_raw: texto, status: "recebido" })
    .select("id")
    .single();

  const logId = logRow?.id;

  // ── Acuse de recebimento ─────────────────────────────────────
  if (BC_KEY) {
    await enviarWA(BC_BASE, BC_KEY, numeroFinal, name,
      `Olá${name ? `, *${name.split(" ")[0]}*` : ""}! 👋\n\nRecebi sua mensagem e estou analisando. Aguarde um instante...`
    );
  }

  // ── Classifica com IA ───────────────────────────────────────
  const ia = await classificarComIA(texto, name);

  // ── Atualiza log com resultado da IA ────────────────────────
  if (logId) {
    await sb.from("whatsapp_ia_log").update({
      ia_resultado:  ia,
      status:        ia.confidence >= 0.65 ? "classificado" : "nao_classificado",
      processado_em: new Date().toISOString(),
    }).eq("id", logId);
  }

  // ── Ramo: mensagem não é uma demanda ────────────────────────
  if (ia.confidence < 0.65 || !ia.area_id || !ia.titulo) {
    if (BC_KEY) {
      await enviarWA(BC_BASE, BC_KEY, numeroFinal, name,
        `Não consegui identificar uma solicitação na sua mensagem. 🤔\n\n` +
        `Para registrar uma demanda, descreva:\n` +
        `• *O que* precisa ser feito\n` +
        `• *Onde* (local/departamento)\n` +
        `• *Urgência* (se houver)\n\n` +
        `Ou acesse o SIPEN diretamente:\n${SIPEN_URL}`
      );
    }
    return new Response(JSON.stringify({ ok: true, status: "nao_classificado" }), { status: 200 });
  }

  // ── Cria a demanda ──────────────────────────────────────────
  const cat = CATS.find(c => c.id === ia.area_id);
  const resp = cat?.resp ?? "Administração Geral";
  const hoje = new Date().toISOString().split("T")[0];

  const demPayload: Record<string, unknown> = {
    area:         ia.area_nome ?? cat?.nome ?? ia.area_id,
    subcategoria: ia.subcategoria ?? null,
    titulo:       ia.titulo,
    descricao:    `[via WhatsApp${name ? ` — ${name}` : ""}]\n\n${ia.descricao ?? texto}`,
    prioridade:   "Média",
    status:       "ABERTA",
    solicitante:  ia.solicitante || name || `WhatsApp ${numeroFinal}`,
    responsavel:  resp,
    data_abertura: hoje,
  };

  if (ia.area_id === "financeiro" && ia.financial_data) {
    const fd: Record<string, unknown> = {};
    if (ia.financial_data.valor != null)          fd.valor = ia.financial_data.valor;
    if (ia.financial_data.data_vencimento)        fd.data_vencimento = ia.financial_data.data_vencimento;
    if (Object.keys(fd).length) demPayload.financial_data = fd;
  }

  const { data: demRow, error: demErr } = await sb
    .from("demandas")
    .insert(demPayload)
    .select("id")
    .single();

  if (demErr || !demRow?.id) {
    console.error("[whatsapp-receive] demanda insert error:", demErr);
    if (logId) {
      await sb.from("whatsapp_ia_log").update({ status: "erro", erro_msg: demErr?.message }).eq("id", logId);
    }
    if (BC_KEY) {
      await enviarWA(BC_BASE, BC_KEY, numeroFinal, name,
        `Ocorreu um erro ao registrar sua demanda. Por favor, tente novamente ou acesse:\n${SIPEN_URL}`
      );
    }
    return new Response(JSON.stringify({ ok: false, error: demErr?.message }), { status: 500 });
  }

  // ── Gera protocolo ──────────────────────────────────────────
  const { data: protoRow } = await sb.rpc("gerar_protocolo_wa");
  const protocolo = (protoRow as string | null) ?? `WA-${hoje.slice(0,4)}-????`;

  // ── Atualiza log com demanda_id e protocolo ─────────────────
  if (logId) {
    await sb.from("whatsapp_ia_log").update({
      demanda_id:   demRow.id,
      protocolo,
      status:       "demanda_criada",
    }).eq("id", logId);
  }

  // ── Confirma ao remetente ───────────────────────────────────
  if (BC_KEY) {
    const confirmacao = [
      `✅ *Demanda registrada com sucesso!*`,
      ``,
      `*Protocolo:* ${protocolo}`,
      `*Área:* ${demPayload.area}`,
      ia.subcategoria ? `*Tipo:* ${ia.subcategoria}` : null,
      `*Título:* ${ia.titulo}`,
      ``,
      `Um responsável de *${resp}* entrará em contato em breve.`,
      ``,
      `Acompanhe no SIPEN:\n${SIPEN_URL}`,
    ].filter(l => l !== null).join("\n");

    await enviarWA(BC_BASE, BC_KEY, numeroFinal, name, confirmacao);
  }

  // ── Notifica responsáveis ───────────────────────────────────
  if (BC_KEY) {
    await notificarResponsaveis(
      sb, BC_BASE, BC_KEY,
      { id: demRow.id, area: demPayload.area as string, titulo: ia.titulo!, protocolo },
      texto,
    );
  }

  return new Response(JSON.stringify({ ok: true, status: "demanda_criada", protocolo, demanda_id: demRow.id }), {
    status:  200,
    headers: { "Content-Type": "application/json" },
  });
});
