/* ══════════════════════════════════════════
   SUPABASE INTEGRATION LAYER — v5.2.3
   CRUD real via Supabase REST

   CONVENÇÃO DE ACESSO A DADOS
   ───────────────────────────
   Existem 3 formas de consultar o Supabase neste projeto.
   Prefira sempre as opções superiores:

   1. listarModulo(key, elId, filtro) / apiRead(key) / apiWrite(key, ...)
      Usa TABLE_MAP + SCHEMA. Para tabelas mapeadas (MEMBROS, DEMANDAS, etc.).
      Inclui paginação, cache e tratamento de erro padrão.

   2. apiFetchTable(tableName, params)  ← PADRÃO RECOMENDADO para código novo
      Definida em init.js. Fetch direto sem TABLE_MAP.
      Use para views e tabelas que não precisam de CRUD completo.
      Ex: apiFetchTable("v_oficiais", { cargo:"pastor", _limit:100 })

   3. fetch(apiBaseUrl() + '/rest/v1/...')  ← EVITAR em código novo
      Raw fetch manual. Só manter onde já existe; não usar em features novas.
══════════════════════════════════════════ */
const SUPABASE_PROJECT_REF = "erhwryfzpycahgsohhbh";
const SUPABASE_DASHBOARD_URL = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}`;
const DEFAULT_SUPABASE_URL = "https://erhwryfzpycahgsohhbh.supabase.co";
let SUPABASE_URL = localStorage.getItem("sipen_supabase_url") || DEFAULT_SUPABASE_URL;
if (!localStorage.getItem("sipen_supabase_url") && DEFAULT_SUPABASE_URL) {
  localStorage.setItem("sipen_supabase_url", DEFAULT_SUPABASE_URL);
}

const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaHdyeWZ6cHljYWhnc29oaGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjg2MTUsImV4cCI6MjA5MTg0NDYxNX0.T0hp90Bmufj6a3oUPq1vYcLiGx9YjyMaZiE38S0e3_8";
let SUPABASE_ANON_KEY = localStorage.getItem("sipen_supabase_anon_key") || DEFAULT_SUPABASE_ANON_KEY;
if (!localStorage.getItem("sipen_supabase_anon_key") && DEFAULT_SUPABASE_ANON_KEY) {
  localStorage.setItem("sipen_supabase_anon_key", DEFAULT_SUPABASE_ANON_KEY);
}

/* Supabase JS client — Auth + queries de inicialização */
let _sbClient = null;
function getSupabase() {
  if (!_sbClient && window.supabase?.createClient) {
    const _storage = {
      getItem:    (k) => localStorage.getItem(k),
      setItem:    (k, v) => localStorage.setItem(k, v),
      removeItem: (k) => localStorage.removeItem(k),
    };
    _sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, storageKey: "sipen_auth_session", storage: _storage }
    });
  }
  return _sbClient;
}

function sipenToken() {
  try {
    const raw = localStorage.getItem('sipen_auth_session');
    if (!raw) return SUPABASE_ANON_KEY;
    return JSON.parse(raw)?.access_token || SUPABASE_ANON_KEY;
  } catch (_) { return SUPABASE_ANON_KEY; }
}

/* TABLE_MAP: chave = nome lógico interno → valor = nome real da tabela no Supabase */
const TABLE_MAP = {
  "MEMBROS":               "v_membros",
  "FAMILIAS":              "v_membros",
  "VISITANTES":            "v_visitantes",
  "NOMEADOS":              "v_nomeados",
  "ORDENADOS":             "v_oficiais",
  "AGENDA":            "agenda",
  "DEMANDAS":              "demandas",
  "CONTRATOS":             "contratos",
  "OFICIAIS_TABLE":        "v_oficiais",
  "NOMEADOS_TABLE":        "v_nomeados",
  "ESTOQUE_ITENS":         "estoque_itens",
  "ESTOQUE_MOVIMENTACOES": "estoque_itens",
  "FINANCEIRO":            "financeiro",
  "PGS":                   "pgs",
  "PG_ENCONTROS":          "pgs",
  "PG_PARTICIPANTES":      "pgs",
  "PG_VISITANTES":         "v_visitantes",
  "PG_RELATORIOS":         "pgs",
  "PG_PEDIDOS_ORACAO":     "pgs",
  "LOG_AUDITORIA":         "logs_sistema",
  "ATAS":                  "logs_sistema",
  "USUARIOS":              "v_membros",
  "PERMISSOES":            "v_membros",
  "AREAS":                 "demandas",
  "DEPARTAMENTOS":         "demandas",
  "MINISTERIOS":           "demandas",
  "SERIES":                "pgs",
  "ESTUDOS":               "pgs",
  "OFICIAIS":              "v_oficiais",
  "NOMEADOS_CARGOS":       "v_nomeados",
  "SEMINARISTAS":          "v_seminaristas",
  "CONTRATADOS":           "v_contratados",
  "COMISSOES":             "comissoes",
};

/* SCHEMA baseado na estrutura real do Supabase */
const SCHEMA = {
  tabelas: ["MEMBROS","VISITANTES","DEMANDAS","FINANCEIRO","PGS","ESTOQUE_ITENS","LOG_AUDITORIA"],
  labels: {
    AGENDA:       "Agenda",
    MEMBROS:      "Membros",
    VISITANTES:   "Visitantes",
    DEMANDAS:     "Demandas",
    FINANCEIRO:   "Financeiro",
    PGS:              "Pequenos Grupos",
    PG_ENCONTROS:     "Encontros de PG",
    PG_PARTICIPANTES: "Participantes de PG",
    PG_RELATORIOS:    "Relatórios de PG",
    PG_PEDIDOS_ORACAO:"Pedidos de Oração",
    ESTUDOS:          "Estudos",
    SERIES:           "Séries",
    ESTOQUE_ITENS:"Estoque",
    LOG_AUDITORIA:"Logs do Sistema",
    OFICIAIS:     "Oficiais",
    NOMEADOS_CARGOS:"Nomeados / Cargos",
    SEMINARISTAS: "Seminaristas",
    CONTRATADOS:  "Contratados",
    COMISSOES:    "Comissões"
  },
  campos: {
    AGENDA:        ["titulo","data","dia_semana","hora_inicio","hora_fim","organizador","responsavel","espaco","recorrencia","mes","observacao","status"],
    MEMBROS:       ["nome","email","telefone","data_nascimento","status","tipo_membro","data_ingresso","tipo_ingresso","funcao","congregacao","data_batismo","numero_registro"],
    VISITANTES:    ["nome","telefone","email","data_primeira_visita","origem","interesse_nivel","congregacao","obs"],
    DEMANDAS:      ["titulo","descricao","solicitante","area","subcategoria","status","prioridade","responsavel","data_abertura","data_conclusao"],
    FINANCEIRO:    ["tipo","categoria","descricao","valor","data_lancamento","status","responsavel","observacoes"],
    PGS:           ["nome","lider","anfitriao","dia_semana","horario","local","ativo","observacoes"],
    PG_ENCONTROS:  ["nome","lider","anfitriao","dia_semana","horario","local","ativo","observacoes"],
    PG_PARTICIPANTES: ["nome","lider","anfitriao","dia_semana","horario","local","ativo","observacoes"],
    PG_RELATORIOS: ["nome","lider","anfitriao","dia_semana","horario","local","ativo","observacoes"],
    PG_PEDIDOS_ORACAO: ["nome","lider","anfitriao","dia_semana","horario","local","ativo","observacoes"],
    ESTUDOS:       ["nome","lider","anfitriao","dia_semana","horario","local","ativo","observacoes"],
    SERIES:        ["nome","lider","anfitriao","dia_semana","horario","local","ativo","observacoes"],
    ESTOQUE_ITENS: ["nome","categoria","quantidade","unidade","localizacao","observacoes","ativo"],
    LOG_AUDITORIA:  ["modulo","acao","entidade","entidade_id","detalhes"],
    OFICIAIS:       ["nome","cargo","status","posse","fim_mandato","area","obs"],
    NOMEADOS_CARGOS:["nome","orgao_tipo","orgao","suborgao","cargo","status"],
    SEMINARISTAS:   ["nome","seminario","curso","ano_curso","supervisor","area_estagio","status"],
    CONTRATADOS:    ["nome","tipo_vinculo","empresa","funcao","categoria","area_atendida","status"],
    COMISSOES:      ["nome","descricao","relator","membros","status"]
  },
  /* Campos obrigatórios por tabela (NOT NULL sem default) */
  obrigatorios: {
    AGENDA:     ["titulo","data"],
    MEMBROS:    ["nome"],
    VISITANTES: ["nome"],
    DEMANDAS:   ["titulo"],
    FINANCEIRO: ["tipo","descricao","valor"],
    PGS:        ["nome"],
    ESTOQUE_ITENS: ["nome"],
    LOG_AUDITORIA: ["modulo","acao"],
    COMISSOES:     ["nome"]
  },
  /* Tipos especiais para renderizar inputs corretos */
  tipos: {
    AGENDA:     { data:"date", hora_inicio:"time", hora_fim:"time", status:"select:confirmado,pendente,cancelado,reagendado", recorrencia:"select:Semanal,Quinzenal,Mensal,Anual" },
    MEMBROS:    { status:"select:ativo,inativo,transferido,falecido,disciplinado,afastado", tipo_membro:"select:COMUNGANTE=Comungante,NAO_COMUNGANTE=Não Comungante", data_nascimento:"date", data_ingresso:"date", data_saida:"date", data_batismo:"date", batizado:"boolean", casado_na_igreja:"boolean", tipo_ingresso:"select:batismo,transferência,profissão de fé,restauração,outro" },
    VISITANTES: { data_primeira_visita:"date", interesse_nivel:"select:baixo,médio,alto,convertido" },
    DEMANDAS:   { data_abertura: "date", data_conclusao: "date", status: "select:ABERTA=Aberta,EM_ANALISE=Em Análise,EM_ANDAMENTO=Em Andamento,PENDENTE=Pendente,CONCLUIDA=Concluída,CANCELADA=Cancelada", prioridade: "select:Baixa,Média,Alta,Urgente" },
    FINANCEIRO: { valor: "number", data_lancamento: "date", tipo: "select:Receita,Despesa", status: "select:Pendente,Confirmado,Cancelado" },
    PGS:        { ativo: "boolean", dia_semana: "select:Segunda,Terça,Quarta,Quinta,Sexta,Sábado,Domingo" },
    ESTOQUE_ITENS: { quantidade: "number", ativo: "boolean" },
    COMISSOES:     { status: "select:ativo=Ativa,inativo=Inativa,encerrada=Encerrada" }
  }
};

/* ══════════════════════════════════════════
   LISTAR MÓDULO — renderiza tabela na view
══════════════════════════════════════════ */
async function listarModulo(tab, containerId, filtro = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Buscando no Supabase...</div>`;
  try {
    let rows = await apiRead(tab);
    // Aplicar filtro local se houver
    if (filtro && Object.keys(filtro).length) {
      rows = rows.filter(row => Object.entries(filtro).every(([k,v]) =>
        String(row[k] || "").toLowerCase().includes(String(v).toLowerCase())
      ));
    }
    renderModuloList(rows, tab, containerId);
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

function renderModuloList(rows, tab, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const cols = SCHEMA.campos[tab] || [];
  const label = SCHEMA.labels[tab] || tab;

  if (!rows || !rows.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:32px 0;color:var(--tx3)">
        <div style="font-size:28px;margin-bottom:8px">📭</div>
        <div style="font-size:12px">Nenhum registro em ${label}</div>
        <button onclick="openCrudForm('${tab}')" style="margin-top:12px;background:var(--gr);border:none;border-radius:6px;padding:8px 16px;color:#fff;font-size:11.5px;font-weight:600;cursor:pointer">+ Novo registro</button>
      </div>`;
    return;
  }

  const COL_PT = {titulo:"Título",data:"Data",mes:"Mês",dia_semana:"Dia da Semana",hora_inicio:"Início",hora_fim:"Fim",recorrencia:"Recorrência",espaco:"Espaço",organizador:"Organizador",observacao:"Observação",status:"Status",tipo:"Tipo",nome:"Nome",email:"E-mail",telefone:"Telefone",cargo:"Cargo",ministerio:"Ministério",area:"Área",descricao:"Descrição",valor:"Valor",quantidade:"Qtd",pgs:"PGS",lider:"Líder",endereco:"Endereço",data_batismo:"Batismo",data_membro:"Membro desde",data_entrada:"Entrada",data_saida:"Saída",categoria:"Categoria",prioridade:"Prioridade",responsavel:"Responsável",solicitante:"Solicitante",item:"Item",unidade:"Unidade",estoque_minimo:"Mín.",localizacao:"Localização"};
  const colLabel = c => COL_PT[c] || c.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase());

  const visibleCols = cols.filter(c => !["id","criado_em","atualizado_em"].includes(c));
  el.innerHTML = `
    <div style="font-size:10px;color:var(--tx3);margin-bottom:10px">${rows.length} registro${rows.length!==1?"s":""}</div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:11.5px">
        <thead>
          <tr style="background:var(--bg-surface);border-bottom:2px solid var(--teal)">
            ${visibleCols.slice(0,6).map(c=>`<th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700;white-space:nowrap">${escapeHtml(colLabel(c))}</th>`).join("")}
            <th style="text-align:right;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${rows.slice(0,50).map(row=>`
            <tr style="border-bottom:1px solid var(--bd1);transition:background .1s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
              ${visibleCols.slice(0,6).map(c=>{
                const v = row[c];
                if (v === true) return `<td style="padding:7px 10px;color:var(--tx2)"><span style="background:rgba(58,170,92,0.15);color:var(--gr);border-radius:4px;padding:2px 6px;font-size:9.5px">✓ Sim</span></td>`;
                if (v === false) return `<td style="padding:7px 10px;color:var(--tx2)"><span style="background:rgba(224,85,85,0.1);color:var(--rose);border-radius:4px;padding:2px 6px;font-size:9.5px">✗ Não</span></td>`;
                if (c==="status") return `<td style="padding:7px 10px"><span style="background:var(--bg-surface);border:1px solid var(--bd2);border-radius:4px;padding:2px 7px;font-size:9.5px;color:var(--tx2)">${escapeHtml(String(v??"-"))}</span></td>`;
                return `<td style="padding:7px 10px;color:var(--tx2);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(String(v??"-"))}</td>`;
              }).join("")}
              <td style="padding:7px 10px;text-align:right;white-space:nowrap">
                <button onclick='openCrudForm(${JSON.stringify(tab)},${safeJsonForHtml(row)})' style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:4px;color:var(--tx2);font-size:10px;padding:3px 8px;cursor:pointer;margin-right:4px">✏️</button>
                <button onclick='deletarRegistro(${JSON.stringify(tab)},${JSON.stringify(row.id||"")})' style="background:rgba(224,85,85,0.08);border:1px solid rgba(224,85,85,0.18);border-radius:4px;color:var(--rose);font-size:10px;padding:3px 8px;cursor:pointer">🗑</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;

  // Atualizar KPI de count se existir
  const countEl = document.getElementById(containerId.replace("-list","-count"));
  if (countEl) countEl.textContent = `· ${rows.length} registros`;

  // KPIs financeiros
  if (tab === "FINANCEIRO") {
    const rec = rows.filter(r=>String(r.tipo||"").toLowerCase()==="receita").reduce((a,r)=>a+Number(r.valor||0),0);
    const desp = rows.filter(r=>String(r.tipo||"").toLowerCase()==="despesa").reduce((a,r)=>a+Number(r.valor||0),0);
    const fmt = v => "R$ " + v.toLocaleString("pt-BR",{minimumFractionDigits:2});
    const recEl = document.getElementById("fin-rec"); if(recEl) recEl.textContent = fmt(rec);
    const despEl = document.getElementById("fin-desp"); if(despEl) despEl.textContent = fmt(desp);
    const salEl = document.getElementById("fin-saldo"); if(salEl) { salEl.textContent = fmt(rec-desp); salEl.style.color = rec>=desp?"var(--gr)":"var(--rose)"; }
  }
}

/* Mapa de auto-load: view id → {tab, containerId, filtro} */
const VIEW_AUTOLOAD = {
  "pastoral-disp":      { fn: () => typeof dp_loadDisps       === 'function' && dp_loadDisps() },
  "pastoral-pastores":  { fn: () => typeof ep_refreshPastores === 'function' && ep_refreshPastores() },
  "pastoral-rede":      { fn: () => typeof redeCuidadoLoad    === 'function' && redeCuidadoLoad() },
  "memb-cad":      { fn: () => listarMembros("memb-cad-list","memb-cad-count") },
  "memb-vis":      { fn: () => listarVisitantes("vis-list","vis-count") },
  "admin-sec":     { tab:"MEMBROS",       id:"sec-list" },
  "admin-rh":      { tab:"MEMBROS",       id:"rh-list" },
  "admin-fin":     { tab:"FINANCEIRO",    id:"fin-list" },
  "admin-est":     { tab:"ESTOQUE_ITENS", id:"est-list" },
  "pgs-lista":     { tab:"PGS",           id:"pgs-lista-list" },
  "jur-demandas":  { tab:"DEMANDAS",      id:"jur-dem-list",   filtro:{area:"Jurídico"} },
  "infra-man":     { tab:"DEMANDAS",      id:"infra-man-list", filtro:{area:"Infraestrutura"} },
  "admin-aud":     { tab:"LOG_AUDITORIA", id:"aud-list" },
  "min-vol":       { tab:"MEMBROS",       id:"vol-list" },
  "pgs-visitantes":{ tab:"VISITANTES",    id:"pgs-vis-list" },
  "admin-facial":   { fn: () => typeof afCarregar === 'function' && afCarregar() },
  "config-usuarios":  { fn: () => carregarUsuarios() },
  "config-whatsapp":  { fn: () => typeof WA_CFG !== "undefined" && WA_CFG.refresh() },
  "min-adm":      { fn: () => typeof DEPT_ADM          !== "undefined" && DEPT_ADM.load() },
  "conselho-com": { fn: () => typeof minComLoad         === "function"  && minComLoad() },
  "diac-escalas": { fn: () => typeof diacEscalaLoad     === "function"  && diacEscalaLoad() },
};



function apiBaseUrl() {
  if (!SUPABASE_URL) throw new Error("URL do Supabase não configurada");
  return SUPABASE_URL.trim().replace(/\/$/, "");
}

function apiHeaders(extra = {}) {
  const token = (typeof sipenToken === "function") ? sipenToken() : SUPABASE_ANON_KEY;
  return {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    ...extra
  };
}

function tableName(sheet) {
  const name = TABLE_MAP[sheet];
  if (!name) throw new Error(`Tabela não mapeada no Supabase: ${sheet}`);
  // Encode table name for URL (handles "págs." and other special chars)
  return encodeURIComponent(name);
}
function tableNameRaw(sheet) {
  return TABLE_MAP[sheet] || sheet;
}

async function apiPing() {
  const checks = [
    {path:"pastores?select=id&limit=1", label:"pastores"},
    {path:"escala_pregacao?select=id&limit=1", label:"escala_pregacao"},
    {path:"v_membros?select=id&limit=1", label:"v_membros"},
  ];
  let lastErr = "";
  for (const c of checks) {
    try {
      const res = await fetch(`${apiBaseUrl()}/rest/v1/${c.path}`, { method:"GET", headers:apiHeaders() });
      if (res.ok) { await res.json(); return { success:true, message:"Supabase online" }; }
      lastErr = `${c.label}: HTTP ${res.status}`;
    } catch(e) { lastErr = `${c.label}: ${e.message}`; }
  }
  throw new Error(lastErr || "Supabase indisponível");
}

// ── Paginador global ─────────────────────────────────────────────
// Contorna o db-max-rows=1000 do Supabase buscando todas as páginas.
// path: string REST sem limit/offset (ex: "rest/v1/pessoas?select=id,nome&order=nome.asc")
// hdrs: objeto de headers (opcional — usa apiHeaders() se omitido)
async function sipenFetchTodos(path, hdrs) {
  const PAGE = 1000;
  const base = (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "").trim().replace(/\/$/,"");
  let all = [], from = 0;
  while(true){
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${base}/${path}${sep}limit=${PAGE}&offset=${from}`, {
      headers: hdrs || apiHeaders()
    });
    if(!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if(!Array.isArray(data) || !data.length) break;
    all = all.concat(data);
    if(data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}
window.sipenFetchTodos = sipenFetchTodos;

async function apiRead(sheet, limit = 200) {
  const tbl = tableName(sheet);
  // Membros e visitantes têm bases grandes — busca tudo para filtro local correto
  const lim = (sheet === "MEMBROS" || sheet === "VISITANTES") ? 5000 : limit;
  const res = await fetch(`${apiBaseUrl()}/rest/v1/${tbl}?select=*&order=id.desc.nullslast&limit=${lim}`, {
    method: "GET",
    headers: apiHeaders({ "Prefer": "count=none" })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(data.error || "Resposta inválida da API");
  return data.map(row => ({ ...row, _row: row.id || row._row || null }));
}

async function apiWrite(action, sheet, payload) {
  const tbl = tableName(sheet);
  const body = { ...(payload || {}) };
  const recordId = body._row || body.id;
  delete body._row;
  delete body.id;
  delete body.criado_em;
  delete body.atualizado_em;

  if (sheet === "DEMANDAS") {
    const STATUS_DEMANDA_MAP = {
      "Aberta":"ABERTA","aberta":"ABERTA",
      "Pendente":"PENDENTE","pendente":"PENDENTE",
      "Em Análise":"EM_ANALISE","em análise":"EM_ANALISE","Em Analise":"EM_ANALISE","em analise":"EM_ANALISE",
      "Em Andamento":"EM_ANDAMENTO","em andamento":"EM_ANDAMENTO",
      "Aguardando Pagamento":"AGUARDANDO_PAGAMENTO","aguardando pagamento":"AGUARDANDO_PAGAMENTO",
      "Concluída":"CONCLUIDA","concluída":"CONCLUIDA","Concluida":"CONCLUIDA","concluida":"CONCLUIDA",
      "Cancelada":"CANCELADA","cancelada":"CANCELADA"
    };
    if (body.status !== undefined) {
      body.status = STATUS_DEMANDA_MAP[body.status] || body.status || "ABERTA";
    }
    // Garantir que prioridade seja sempre um valor válido do enum prioridade_t
    const PRIO_VALIDAS = ["Baixa", "Média", "Alta", "Urgente"];
    const prioNormalizada = PRIO_VALIDAS.includes(body.prioridade) ? body.prioridade : "Média";
    body.prioridade = prioNormalizada;
  }

  let url = `${apiBaseUrl()}/rest/v1/${tbl}`;
  let method = "POST";
  let headers = apiHeaders({ "Prefer": "return=representation" });

  if (action === "update") {
    if (!recordId) throw new Error("ID não informado para atualização");
    url += `?id=eq.${encodeURIComponent(recordId)}`;
    method = "PATCH";
  } else if (action === "delete") {
    if (!recordId) throw new Error("ID não informado para exclusão");
    url += `?id=eq.${encodeURIComponent(recordId)}`;
    method = "DELETE";
    headers = apiHeaders();
  } else if (action !== "create") {
    throw new Error("Ação inválida");
  }
  const res = await fetch(url, {
    method,
    headers,
    body: method === "DELETE" ? undefined : JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    let msg = err;
    try { msg = JSON.parse(err).message || JSON.parse(err).error || err; } catch {}
    throw new Error(msg || `HTTP ${res.status}`);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? await res.json() : { success: true };
}

function initSupabaseBadge() {
  const trr = document.querySelector(".trr");
  if (!trr || document.getElementById("supabase-badge")) return;
  const badge = document.createElement("button");
  badge.className = "tbt";
  badge.id = "supabase-badge";
  badge.onclick = openSupabasePanel;
  trr.insertBefore(badge, trr.firstChild);
  updateBadge(!!SUPABASE_URL, false);
  if (SUPABASE_URL) testApiSilently();
}

function updateBadge(connected, tested=true) {
  const b = document.getElementById("supabase-badge");
  if (!b) return;
  const color = connected ? "#3aaa5c" : "#e05555";
  b.innerHTML = `<span style="width:7px;height:7px;background:${color};border-radius:50%;display:inline-block"></span> Supabase`;
  b.title = connected ? (tested ? "Supabase conectado" : "URL do Supabase configurada") : "Supabase não configurado";
}

async function testApiSilently() {
  try {
    await apiPing();
    updateBadge(true, true);
    renderApiStatus(true, "Supabase online");
    await loadKPIs();
  } catch (e) {
    updateBadge(false, true);
    renderApiStatus(false, e.message);
  }
}

async function loadKPIs() {
  if (!SUPABASE_URL) return;
  try {
    const [membros, demandas, financeiro] = await Promise.all([
      apiRead("MEMBROS").catch(()=>[]),
      apiRead("DEMANDAS").catch(()=>[]),
      apiRead("FINANCEIRO").catch(()=>[]),
    ]);

    const membrosAtivos   = membros.filter(r => String(r.status || "").toLowerCase() === "ativo").length || membros.length;
    const membrosAtivosArr = membros.filter(r => String(r.status || "").toLowerCase() === "ativo");
    const comungantes     = membrosAtivosArr.filter(r => (r.tipo_membro || "COMUNGANTE") === "COMUNGANTE").length;
    const naoComungantes  = membrosAtivosArr.filter(r => r.tipo_membro === "NAO_COMUNGANTE").length;
    const demandasAbertas = demandas.filter(r => !["concluído","concluido","fechado","cancelado"].includes(String(r.status||"").toLowerCase())).length;
    const pgsAtivos = 0; // tabela pgs sujeita a permissões — KPI omitido
    const saldo = financeiro.reduce((acc, row) => {
      const valor = Number(String(row.valor ?? 0).replace(/\./g, "").replace(",", ".")) || 0;
      const tipo = String(row.tipo || "").toLowerCase();
      return acc + (tipo.includes("desp") ? -valor : valor);
    }, 0);

    document.querySelectorAll(".osi").forEach(card => {
      const label = card.querySelector(".osi-lbl")?.textContent?.toLowerCase() || "";
      const val = card.querySelector(".osi-val");
      if (!val) return;
      if (label.includes("membros ativos") || label.includes("membros")) val.textContent = membrosAtivos || 0;
      if (label.includes("comungantes") && !label.includes("não") && !label.includes("nao")) val.textContent = comungantes || 0;
      if (label.includes("não comungante") || label.includes("nao comungante")) val.textContent = naoComungantes || 0;
      if (label.includes("demandas")) val.textContent = demandasAbertas || 0;
      if (label.includes("receita") || label.includes("saldo")) val.textContent = "R$ " + Number(saldo || 0).toLocaleString("pt-BR");
    });
    document.querySelectorAll(".kpi").forEach(card => {
      const label = card.querySelector(".kpi-lbl")?.textContent?.toLowerCase() || "";
      const val = card.querySelector(".kpi-val");
      if (!val) return;
      if (label.includes("membros")) val.textContent = membrosAtivos || 0;
      if (label.includes("demandas")) val.textContent = demandasAbertas || 0;
      if (label.includes("saldo")) val.textContent = "R$ " + Number(saldo || 0).toLocaleString("pt-BR");
      if (label.includes("pg")) val.textContent = pgsAtivos || 0;
    });
  } catch (e) {
    console.warn("Falha ao carregar KPIs", e);
  }
}

function openSupabasePanel() {
  let panel = document.getElementById("supabase-panel");
  if (panel) {
    const hidden = panel.style.transform === "translateX(100%)";
    panel.style.transform = hidden ? "translateX(0)" : "translateX(100%)";
    return;
  }

  panel = document.createElement("div");
  panel.id = "supabase-panel";
  panel.style.cssText = `position:fixed;top:0;right:0;bottom:0;width:470px;z-index:200;background:var(--bg-card);border-left:1px solid var(--bd2);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .25s cubic-bezier(.4,0,.2,1);`;
  panel.innerHTML = `
    <div style="padding:14px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;gap:10px;flex-shrink:0">
      <span style="font-size:16px">📊</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:var(--tx1)">Supabase — SIPEN</div>
        <div style="font-size:10px;color:var(--tx3);margin-top:1px">CRUD real conectado ao PostgreSQL</div>
      </div>
      <button onclick="document.getElementById('supabase-panel').style.transform='translateX(100%)'" style="background:none;border:none;color:var(--tx3);cursor:pointer;font-size:16px;padding:4px">✕</button>
    </div>

    <div style="flex:1;overflow-y:auto;padding:14px 16px">
      <div id="api-status-block" style="margin-bottom:14px"></div>

      <div id="api-config" style="background:rgba(224,138,42,0.08);border:1px solid rgba(224,138,42,0.2);border-radius:6px;padding:12px;margin-bottom:14px">
        <div style="font-size:11.5px;font-weight:700;color:var(--amber);margin-bottom:8px">Configuração do Supabase</div>
        <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">URL do Projeto</label>
        <input id="api-url-input" type="text" placeholder="https://seu-projeto.supabase.co" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:5px;color:var(--tx1);font-size:11px;padding:7px 10px;outline:none;font-family:var(--mono);margin-bottom:7px" value="${SUPABASE_URL || ""}">
        <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Anon Key</label>
        <input id="api-key-input" type="password" placeholder="eyJ..." style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:5px;color:var(--tx1);font-size:11px;padding:7px 10px;outline:none;font-family:var(--mono);margin-bottom:7px" value="${SUPABASE_ANON_KEY || ""}">
        <div style="display:flex;gap:8px">
          <button onclick="salvarSupabaseCreds()" style="flex:1;background:var(--gr);border:none;border-radius:5px;color:#fff;font-size:12px;font-weight:600;padding:8px;cursor:pointer">Salvar conexão</button>
          <button onclick="testarSupabaseManual()" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:5px;color:var(--tx2);font-size:12px;padding:8px 10px;cursor:pointer">Testar</button>
        </div>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:10.5px;font-weight:700;color:var(--tx1);text-transform:uppercase;letter-spacing:.1em;margin-bottom:9px">Cadastros rápidos</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
          ${[
            ["👤","Novo Membro","MEMBROS"],
            ["💬","Nova Demanda","DEMANDAS"],
            ["💰","Lançamento","FINANCEIRO"],
            ["🏠","Visitante","VISITANTES"],
            ["👥","Novo PG","PGS"],
            ["📦","Item Estoque","ESTOQUE_ITENS"]
          ].map(([ic,lbl,tab])=>`
            <button onclick="openCrudForm('${tab}')" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:9px 10px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:7px">
              <span style="font-size:14px">${ic}</span>
              <div>
                <div style="font-size:10.5px;font-weight:600;color:var(--tx1)">${lbl}</div>
                <div style="font-size:9px;color:var(--tx3);font-family:var(--mono)">${tab}</div>
              </div>
            </button>
          `).join("")}
        </div>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:10.5px;font-weight:700;color:var(--tx1);text-transform:uppercase;letter-spacing:.1em;margin-bottom:9px">Consultar e gerenciar</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px">
          ${["MEMBROS","FINANCEIRO","DEMANDAS","PGS","VISITANTES","ESTOQUE_ITENS"].map(tab=>`
            <button onclick="listarAba('${tab}')" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:7px 10px;text-align:left;cursor:pointer">
              <div style="font-size:10px;font-weight:700;color:var(--tx1)">${tab}</div>
              <div style="font-size:9px;color:var(--tx3)">${SCHEMA.labels[tab] || tab}</div>
            </button>`).join("")}
        </div>
        <input id="sheets-search-input" type="text" placeholder="Filtrar lista atual..." oninput="filtrarListaAtual()" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11px;padding:7px 10px;outline:none">
      </div>

      <div id="supabase-result" style="display:none">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px">
          <div style="font-size:10.5px;font-weight:700;color:var(--tx1);text-transform:uppercase;letter-spacing:.1em" id="supabase-result-title">Resultado</div>
          <div style="display:flex;gap:8px">
            <button onclick="exportarListaAtual()" style="background:none;border:none;color:var(--gr);cursor:pointer;font-size:10.5px">Exportar JSON</button>
            <button onclick="resetSupabaseResult()" style="background:none;border:none;color:var(--tx3);cursor:pointer;font-size:10.5px">← Voltar</button>
          </div>
        </div>
        <div id="supabase-result-body" style="font-size:11.5px;color:var(--tx2);line-height:1.7"></div>
      </div>

      <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--bd1);display:flex;gap:8px">
        <a href="${SUPABASE_DASHBOARD_URL}" target="_blank" style="flex:1;background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:8px;text-align:center;text-decoration:none;font-size:11px;font-weight:600;color:var(--tx2)">📄 Abrir Supabase ↗</a>
        <button onclick="loadKPIs();T('KPIs atualizados','Dados relidos da planilha')" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:8px 12px;font-size:11px;color:var(--gr);font-weight:600;cursor:pointer">↻ KPIs</button>
      </div>
    </div>
  `;

  document.body.appendChild(panel);
  setTimeout(() => { 
    panel.style.transform = "translateX(0)";
    renderApiStatus(!!SUPABASE_URL, SUPABASE_URL ? "URL do Supabase configurada" : "Supabase não configurado");
    if (SUPABASE_URL) testApiSilently();
  }, 10);
}

function renderApiStatus(ok, msg) {
  const el = document.getElementById("api-status-block");
  if (!el) return;
  const isFileProtocol = location.protocol === "file:";
  const isCors = !ok && (msg || "").toLowerCase().includes("fetch");
  const connected = !!ok;

  if (!ok && (isFileProtocol || isCors)) {
    el.innerHTML = `
      <div style="background:rgba(224,138,42,0.08);border:1px solid rgba(224,138,42,0.25);border-radius:6px;padding:11px 13px">
        <div style="font-size:11.5px;font-weight:700;color:var(--amber);margin-bottom:6px">⚠️ Arquivo aberto localmente</div>
        <div style="font-size:10.5px;color:var(--tx2);line-height:1.65;margin-bottom:10px">
          O Chrome bloqueia requisições para APIs externas quando o arquivo é aberto via <code style="font-family:var(--mono);background:rgba(255,255,255,0.07);padding:1px 4px;border-radius:3px">file://</code>.
          Para conectar ao Supabase, abra o arquivo num servidor local:
        </div>
        <div style="background:var(--bg-body);border:1px solid var(--bd2);border-radius:5px;padding:8px 10px;font-family:var(--mono);font-size:10px;color:var(--grl);margin-bottom:8px;line-height:1.8">
          <span style="color:var(--tx3)"># No terminal, na pasta do arquivo:</span><br>
          npx serve .<br>
          <span style="color:var(--tx3)"># ou:</span><br>
          python3 -m http.server 8080
        </div>
        <div style="font-size:10px;color:var(--tx3)">Depois acesse <strong style="color:var(--tx2)">http://localhost:8080</strong> no navegador.</div>
      </div>`;
    return;
  }

  el.innerHTML = connected
    ? `<div style="display:flex;align-items:center;gap:8px;background:rgba(58,170,92,0.08);border:1px solid rgba(58,170,92,0.2);border-radius:6px;padding:9px 11px"><span style="width:7px;height:7px;background:#3aaa5c;border-radius:50%;flex-shrink:0"></span><div style="font-size:11px;color:var(--tx1);flex:1"><strong style="color:#4dc470">Supabase conectado</strong> — ${msg || "online"}</div></div>`
    : `<div style="display:flex;align-items:center;gap:8px;background:rgba(224,85,85,0.07);border:1px solid rgba(224,85,85,0.18);border-radius:6px;padding:9px 11px"><span style="width:7px;height:7px;background:#e05555;border-radius:50%;flex-shrink:0"></span><div style="font-size:11px;color:var(--tx1);flex:1"><strong style="color:#e05555">Falha no Supabase</strong> — ${msg || "verifique a URL"}</div></div>`;
}

async function salvarSupabaseCreds() {
  const url = document.getElementById("api-url-input")?.value?.trim();
  const key = document.getElementById("api-key-input")?.value?.trim();
  if (!url) return T("Informe a URL", "Cole a URL do projeto Supabase");
  if (!key) return T("Informe a chave", "Cole a anon key do projeto Supabase");
  SUPABASE_URL = url;
  SUPABASE_ANON_KEY = key;
  localStorage.setItem("sipen_supabase_url", url);
  localStorage.setItem("sipen_supabase_anon_key", key);
  try {
    const pong = await apiPing();
    updateBadge(true, true);
    renderApiStatus(true, pong.message || "Supabase online e pronto para gravação");
    T("Supabase configurado!", "Conexão com Supabase ativa");
    await loadKPIs();
  } catch (e) {
    updateBadge(false, true);
    renderApiStatus(false, e.message);
    T("Falha na conexão", e.message);
  }
}

async function testarSupabaseManual() {
  try {
    const pong = await apiPing();
    renderApiStatus(true, pong.message || "Supabase online");
    T("Teste concluído", pong.message || "Supabase online");
  } catch (e) {
    renderApiStatus(false, e.message);
    T("Falha no teste", e.message);
  }
}

let currentListTab  = 'membros';
let currentListRows = [];

function resetSupabaseResult() {
  const box = document.getElementById("supabase-result");
  if (box) box.style.display = "none";
}

async function listarAba(tab) {
  currentListTab = tab;
  const result = document.getElementById("supabase-result");
  const body = document.getElementById("supabase-result-body");
  const title = document.getElementById("supabase-result-title");
  result.style.display = "block";
  title.textContent = `${tab} · ${SCHEMA.labels[tab] || tab}`;
  body.innerHTML = spinner();
  try {
    const rows = await apiRead(tab);
    currentListRows = rows;
    renderRowsList(rows, tab);
  } catch (e) {
    body.innerHTML = `<div style="color:var(--rose)">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

function renderRowsList(rows, tab) {
  const body = document.getElementById("supabase-result-body");
  if (!body) return;
  if (!rows || !rows.length) {
    body.innerHTML = `<div style="color:var(--tx3)">Nenhum registro em ${SCHEMA.labels[tab] || tab}.</div>`;
    return;
  }
  const cols = inferColumns(tab, rows);
  const shown = rows.slice(0, 20);
  body.innerHTML = `
    <div style="font-size:10px;color:var(--tx3);margin-bottom:8px">${rows.length} registros · exibindo até 20</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${shown.map(row => `
        <div style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:10px 11px">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:6px">
            <div style="font-size:11px;font-weight:700;color:var(--tx1)">${escapeHtml(primaryField(row, cols))}</div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button onclick='openCrudForm(${JSON.stringify(tab)}, ${safeJsonForHtml(row)})' style="background:var(--bg-card);border:1px solid var(--bd1);border-radius:4px;color:var(--tx2);font-size:10px;padding:4px 7px;cursor:pointer">✏️ Editar</button>
              <button onclick='deletarRegistro(${JSON.stringify(tab)}, ${JSON.stringify(row.id || "")})' style="background:rgba(224,85,85,0.08);border:1px solid rgba(224,85,85,0.18);border-radius:4px;color:var(--rose);font-size:10px;padding:4px 7px;cursor:pointer">🗑 Excluir</button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px">
            ${cols.filter(c => c !== "id" && c !== "criado_em" && c !== "atualizado_em" && row[c] !== undefined && row[c] !== "").slice(0, 8).map(c => `
              <div>
                <div style="font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em">${escapeHtml(c)}</div>
                <div style="font-size:10.5px;color:var(--tx2);word-break:break-word">${escapeHtml(String(row[c]))}</div>
              </div>`).join("")}
          </div>
        </div>`).join("")}
    </div>`;
}

function inferColumns(tab, rows) {
  const schemaCols = SCHEMA.campos[tab];
  if (schemaCols && schemaCols.length) return schemaCols;
  const first = rows && rows[0] ? Object.keys(rows[0]).filter(k => k !== "_row") : [];
  return first;
}

function primaryField(row, cols) {
  const prefs = ["nome","descricao","pg_nome","item_nome","id"];
  for (const p of prefs) if (row[p]) return row[p];
  for (const c of cols) if (row[c]) return row[c];
  return `Linha ${row._row || "?"}`;
}

function filtrarListaAtual() {
  if (!currentListRows || !currentListRows.length || !currentListTab) return;
  const q = (document.getElementById("sheets-search-input")?.value || "").trim().toLowerCase();
  if (!q) return renderRowsList(currentListRows, currentListTab);
  const filtered = currentListRows.filter(row => JSON.stringify(row).toLowerCase().includes(q));
  renderRowsList(filtered, currentListTab);
}

function exportarListaAtual() {
  if (!currentListRows || !currentListRows.length) return T("Nada para exportar", "Liste uma aba primeiro");
  const blob = new Blob([JSON.stringify(currentListRows, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${currentListTab || "dados"}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function autoId() {
  return "ID-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}
