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
  confidence:      number;
  tipo?:           "demanda" | "saudacao" | "agradecimento" | "informacao" | "outro";
  resposta?:       string;
  area_id?:        string;
  area_nome?:      string;
  subcategoria?:   string;
  titulo?:         string;
  descricao?:      string;
  solicitante?:    string;
  financial_data?: { valor?: number; data_vencimento?: string };
}

async function classificarComIA(mensagem: string, remetente: string): Promise<IaResult> {
  const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_KEY) return { confidence: 0 };

  const catsDesc = CATS.map(c =>
    `- id="${c.id}" nome="${c.nome}"\n  subcategorias: ${c.sub.slice(0,6).join(" | ")}${c.sub.length > 6 ? " | ..." : ""}`
  ).join("\n");

  const systemPrompt = `Você é o assistente virtual da *Igreja Presbiteriana da Penha (IPPenha)*, em São Paulo.
Responda sempre em português, de forma cordial e breve.

══ INFORMAÇÕES DA IGREJA ══

Nome: Igreja Presbiteriana da Penha — IPPenha
Endereço: Rua Major Rudge, 145 — Vila São Geraldo / Penha de França, São Paulo, SP 03607-010
Telefone: (11) 2641-7654
E-mail: ippenha2016@gmail.com
Site: https://ippenha.org.br
Instagram: @ippenha | YouTube: @ippenha

CULTOS:
• Domingo: 9h (culto principal) | 11h (culto em espanhol) | 18h (culto noturno)
• Segunda, Quarta e Sexta: cultos semanais (confirmar horário pelo telefone)
• Escola Bíblica Dominical (EBD): domingo às 9h30

MINISTÉRIOS:
• PenhaKids — crianças
• O Movimento — jovens (encontros sábado às 19h30)
• SOS — adolescentes
• Lar Cristão — casais
• SAF (Sociedade Auxiliadora Feminina) — mulheres
• Escola de Teologia — formação teológica (Pastor Amauri e outros)

PASTOR PRINCIPAL: Pastor Amauri

══ TIPOS DE MENSAGEM ══

Classifique cada mensagem em um destes tipos:

"saudacao"    → oi, olá, bom dia, boa tarde, como vai, tudo bem…
"agradecimento" → obrigado, valeu, ok, entendido, perfeito, pode deixar…
"informacao"  → qualquer pergunta sobre a igreja: horários, endereço, eventos, ministérios, pastores, como se cadastrar, dízimo, etc.
"demanda"     → solicitação interna de serviço: manutenção, pagamento, agendamento de espaço, comunicação, cadastro de membro, pedido de oração, etc. — algo que precisa de ação de um departamento interno
"outro"       → assunto completamente fora do contexto da igreja

══ REGRAS ══

1. Para "informacao": preencha "resposta" com a resposta correta e amigável usando as informações acima. Confidence = 0. Não preencha campos de demanda.
2. Para "saudacao" e "agradecimento": deixe "resposta" em branco. Confidence = 0.
3. Para "demanda": preencha todos os campos de demanda (confidence 0.65–1.0). Não preencha "resposta".
4. Para "outro": deixe "resposta" em branco. Confidence = 0.
5. Se a mensagem misturar saudação com demanda, classifique como "demanda".
6. Para área "financeiro": extraia valor (número) e data_vencimento (YYYY-MM-DD) se mencionados.
7. Título da demanda: máximo 80 caracteres.
8. Descrição da demanda: reproduza fielmente o pedido, sem inventar.

CATEGORIAS DE DEMANDA:
${catsDesc}

Responda APENAS com JSON válido, sem texto extra:
{
  "tipo": "demanda|saudacao|agradecimento|informacao|outro",
  "confidence": 0.0-1.0,
  "resposta": "texto da resposta para informacao (ou null)",
  "area_id": "id ou null",
  "area_nome": "nome ou null",
  "subcategoria": "subcategoria ou null",
  "titulo": "título ou null",
  "descricao": "descrição ou null",
  "solicitante": "nome extraído ou null",
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

// ── Mapeamento área de demanda → módulo WhatsApp ────────────
const AREA_MODULO: Record<string, string> = {
  conselho:     "CONSELHO",
  agendamentos: "AGENDA",
  manutencao:   "INFRAESTRUTURA",
  limpeza:      "INFRAESTRUTURA",
  logistica:    "INFRAESTRUTURA",
  financeiro:   "FINANCEIRO",
  comunicacao:  "MINISTERIAL",
  secretaria:   "CONSELHO",
  cadastro:     "MEMBRESIA",
  oracao:       "PASTORAL",
  visitacao:    "JUNTA_DIACONAL",
  culto:        "MINISTERIAL",
  ensino:       "MINISTERIAL",
  social:       "MINISTERIAL",
  admin_geral:  "DEMANDAS",
};

// ── Notifica responsáveis da área ───────────────────────────
async function notificarResponsaveis(
  sb:        ReturnType<typeof createClient>,
  bcBase:    string,
  bcKey:     string,
  demanda:   { id: string; area: string; area_id?: string; titulo: string; protocolo: string },
  msg:       string,
) {
  let lista: unknown[] = [];

  // Prefer module-level responsáveis (whatsapp_modulo_responsaveis)
  const modulo = demanda.area_id ? AREA_MODULO[demanda.area_id] : undefined;
  if (modulo) {
    const { data: modRows } = await sb
      .from("whatsapp_modulo_responsaveis")
      .select("pessoa_id, pessoas(id, nome, celular, telefone)")
      .eq("modulo", modulo)
      .eq("ativo", true);
    lista = modRows ?? [];
  }

  // Fallback: demanda_responsaveis by area string
  if (!lista.length) {
    const { data: rows } = await sb
      .from("demanda_responsaveis")
      .select("pessoa_id, pessoas(id, nome, celular, telefone)")
      .eq("area", demanda.area)
      .eq("ativo", true);
    lista = rows ?? [];
  }

  // Final fallback: admins
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
  let body: Record<string, unknown> = {};
  let rawText = "";
  try {
    rawText = await req.text();
    if (rawText.trim().startsWith("{")) body = JSON.parse(rawText);
  } catch { /* body remains {} */ }

  console.log("[whatsapp-receive] url params:", url.searchParams.toString());
  console.log("[whatsapp-receive] raw body:", rawText.slice(0, 1000));

  // ── Extrai phone, name, texto ────────────────────────────────
  // Ordem de prioridade: URL params → body subscriber obj → body flat fields

  // Phone: BotConversa pode usar {{phone}}, {{subscriber_phone}}, {{telefone}}
  // Testa no URL e no body, remove não-dígitos
  const rawPhone =
    url.searchParams.get("phone")   ||
    url.searchParams.get("tel")     ||
    (body.subscriber as any)?.phone ||
    (body.subscriber as any)?.telefone ||
    body.phone as string            ||
    body.telefone as string         ||
    body.subscriber_phone as string ||
    "";

  // Name: preferência para URL → body
  const rawFirst =
    url.searchParams.get("first_name") ||
    url.searchParams.get("nome")       ||
    (body.subscriber as any)?.first_name ||
    (body.subscriber as any)?.nome     ||
    body.first_name as string          ||
    body.nome as string                ||
    "";
  const rawLast =
    url.searchParams.get("last_name")  ||
    (body.subscriber as any)?.last_name ||
    body.last_name as string           ||
    "";

  const name = `${rawFirst} ${rawLast}`.trim() || (body.name as string) || "";

  // Mensagem: BotConversa pode usar {{last_message}}, {{input}}, {{last_input}}, {{mensagem}}
  const messageObj = (body.message ?? body.last_message ?? {}) as Record<string, unknown>;

  let texto =
    url.searchParams.get("msg")         ||
    url.searchParams.get("mensagem")    ||
    url.searchParams.get("input")       ||
    "";

  if (!texto) {
    if (messageObj.type === "text") {
      texto = (messageObj.value ?? messageObj.message ?? "") as string;
    } else if (typeof body.text === "string") {
      texto = body.text;
    } else if (typeof body.input === "string") {
      texto = body.input;
    } else if (typeof body.last_input === "string") {
      texto = body.last_input;
    } else if (typeof body.mensagem === "string") {
      texto = body.mensagem;
    } else if (typeof body.message === "string") {
      texto = body.message;
    } else if (typeof body.last_message === "string") {
      texto = body.last_message;
    }
  }

  // Filtra variáveis não substituídas: {{var}} ou {var}
  const isUnsubstituted = (s: string) => /^\{+[^{}]+\}+$/.test((s ?? "").trim());

  // Campos pre-classificados pelo Assistente GPT (Campos Personalizados)
  const gptArea  = typeof body.area  === "string" && !isUnsubstituted(body.area)  ? (body.area  as string).trim() : "";
  const gptMsg   = typeof body.msg   === "string" && !isUnsubstituted(body.msg)   ? (body.msg   as string).trim() : "";
  const gptPhone = typeof body.phone === "string" && !isUnsubstituted(body.phone) ? (body.phone as string).trim() : "";

  const phone = isUnsubstituted(rawPhone) ? (gptPhone || "") : (rawPhone || gptPhone);
  if (isUnsubstituted(texto)) texto = gptMsg;
  if (!texto) texto = gptMsg;

  console.log("[whatsapp-receive] extracted → phone:", phone, "| gptArea:", gptArea, "| texto:", texto.slice(0, 100));

  if (!phone || !texto.trim()) {
    // Salva entrada para diagnóstico (sem phone/texto não conseguimos processar)
    await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    ).from("whatsapp_ia_log").insert({
      phone: rawPhone || "VAZIO",
      nome_remetente: name || null,
      mensagem_raw: rawText.slice(0, 500) || "VAZIO",
      status: "ignorado_sem_dados",
    });
    return new Response(JSON.stringify({ ok: true, status: "ignored", debug: { phone, texto: texto.slice(0,50), raw: rawText.slice(0,200) } }), { status: 200 });
  }

  const numeroFinal = phone.replace(/\D/g, "").replace(/^(?!55)/, "55");
  console.log("[whatsapp-receive] numeroFinal:", numeroFinal);

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
    .insert({ phone: numeroFinal, nome_remetente: name || null, mensagem_raw: texto || rawText.slice(0, 500), status: "recebido" })
    .select("id")
    .single();

  const logId = logRow?.id;
  const primeiroNome = name ? name.trim().split(" ")[0] : "";

  // ── Ramo GPT: área já classificada pelo Assistente GPT ──────
  if (gptArea) {
    const cat = CATS.find(c => c.id === gptArea);
    const resp = cat?.resp ?? "Administração Geral";
    const hoje = new Date().toISOString().split("T")[0];
    const titulo = (gptMsg || texto).slice(0, 80) || `Solicitação via WhatsApp`;

    if (logId) {
      await sb.from("whatsapp_ia_log").update({
        ia_resultado:  { tipo: "demanda", area_id: gptArea, fonte: "gpt" },
        status:        "classificado",
        processado_em: new Date().toISOString(),
      }).eq("id", logId);
    }

    const demPayloadGpt: Record<string, unknown> = {
      area:          cat?.nome ?? gptArea,
      titulo,
      descricao:     `[via WhatsApp GPT${name ? ` — ${name}` : ""}]\n\n${gptMsg || texto}`,
      prioridade:    "Média",
      status:        "ABERTA",
      solicitante:   name || `WhatsApp ${numeroFinal}`,
      responsavel:   resp,
      data_abertura: hoje,
    };

    const { data: demRowGpt, error: demErrGpt } = await sb
      .from("demandas").insert(demPayloadGpt).select("id").single();

    if (demErrGpt || !demRowGpt?.id) {
      if (logId) await sb.from("whatsapp_ia_log").update({ status: "erro", erro_msg: demErrGpt?.message }).eq("id", logId);
      return new Response(JSON.stringify({ ok: false, error: demErrGpt?.message }), { status: 500 });
    }

    const { data: protoRowGpt } = await sb.rpc("gerar_protocolo_wa");
    const protocoloGpt = (protoRowGpt as string | null) ?? `WA-${hoje.slice(0,4)}-????`;

    if (logId) {
      await sb.from("whatsapp_ia_log").update({
        demanda_id: demRowGpt.id, protocolo: protocoloGpt, status: "demanda_criada",
      }).eq("id", logId);
    }

    if (BC_KEY) {
      const confirmacaoGpt = [
        `✅ *Demanda registrada!*`,
        ``,
        `*Protocolo:* ${protocoloGpt}`,
        `*Área:* ${demPayloadGpt.area}`,
        ``,
        `Um responsável de *${resp}* entrará em contato em breve.`,
      ].join("\n");
      await enviarWA(BC_BASE, BC_KEY, numeroFinal, name, confirmacaoGpt);
      await notificarResponsaveis(sb, BC_BASE, BC_KEY,
        { id: demRowGpt.id, area: demPayloadGpt.area as string, area_id: gptArea, titulo, protocolo: protocoloGpt },
        gptMsg || texto,
      );
    }

    return new Response(JSON.stringify({ ok: true, status: "demanda_criada", protocolo: protocoloGpt, fonte: "gpt" }), { status: 200 });
  }

  // ── Classifica com IA Gemini (fluxo sem GPT) ─────────────────
  const ia = await classificarComIA(texto, name);
  const ehDemanda = ia.confidence >= 0.65 && !!ia.area_id && !!ia.titulo;

  if (logId) {
    await sb.from("whatsapp_ia_log").update({
      ia_resultado:  ia,
      status:        ehDemanda ? "classificado" : "nao_classificado",
      processado_em: new Date().toISOString(),
    }).eq("id", logId);
  }

  if (!ehDemanda) {
    if (BC_KEY) {
      const tipo = ia.tipo ?? "outro";
      let resposta: string;

      if (tipo === "saudacao") {
        resposta = [
          `Olá${primeiroNome ? `, *${primeiroNome}*` : ""}! 👋 Bem-vindo à *IPPenha*.`,
          ``,
          `Posso te ajudar com informações sobre nossa igreja ou registrar solicitações internas.`,
          ``,
          `Pergunte sobre horários, endereço, ministérios, eventos… ou me diga o que precisa!`,
        ].join("\n");
      } else if (tipo === "agradecimento") {
        resposta = `De nada${primeiroNome ? `, *${primeiroNome}*` : ""}! 😊 Qualquer dúvida ou solicitação, estou por aqui.`;
      } else if (tipo === "informacao" && ia.resposta) {
        resposta = ia.resposta;
      } else {
        resposta = [
          `Não consegui entender sua mensagem.`,
          ``,
          `Posso ajudar com informações sobre a *IPPenha* (horários, endereço, ministérios) ou registrar solicitações internas.`,
          ``,
          `Fale com a secretaria pelo *(11) 2641-7654* ou acesse *ippenha.org.br*`,
        ].join("\n");
      }

      await enviarWA(BC_BASE, BC_KEY, numeroFinal, name, resposta);
    }
    return new Response(JSON.stringify({ ok: true, status: "nao_classificado", tipo: ia.tipo }), { status: 200 });
  }

  if (BC_KEY) {
    await enviarWA(BC_BASE, BC_KEY, numeroFinal, name,
      `Recebi${primeiroNome ? `, *${primeiroNome}*` : ""}! ⏳ Registrando sua demanda, aguarde...`
    );
  }

  // ── Cria a demanda (fluxo Gemini) ───────────────────────────
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
      { id: demRow.id, area: demPayload.area as string, area_id: ia.area_id, titulo: ia.titulo!, protocolo },
      texto,
    );
  }

  return new Response(JSON.stringify({ ok: true, status: "demanda_criada", protocolo, demanda_id: demRow.id }), {
    status:  200,
    headers: { "Content-Type": "application/json" },
  });
});
