/* ═══════════════════════════════════════════════════════
   SIPEN — Módulo Solicitações e Demandas
   demandas.js · v2.1
   15 categorias + subcategorias + fluxo de status completo
═══════════════════════════════════════════════════════ */

(function () {

  /* Áreas pertencentes ao módulo Infraestrutura e Conservação */
  const _INFRA_AREAS = [
    "Infraestrutura e Conservação",
    "Manutenção",
    "Limpeza e Organização",
    "Patrimônio",
    "Solicitações Operacionais",
  ];

  /* ── Categorias e roteamento automático ─────────────── */

  const CATS = [
    { id:"conselho",    nome:"Conselho",                icon:"🏛",  cor:"var(--sky)",    resp:"Conselho / Jurídico",
      subcats:["Envio de documentos ao Conselho","Solicitação de aprovação","Análise jurídica","Questões disciplinares"] },
    { id:"agendamentos",nome:"Agendamentos",            icon:"📅",  cor:"var(--teal)",   resp:"Secretaria / Liderança",
      subcats:[
        { grupo:"Programações",         itens:["Reunião","Evento","Ensaio","Casamento","Aniversário","Congresso","Conferência","Outros"] },
        { grupo:"Atendimento Pastoral", itens:["Aconselhamento pastoral","Atendimento pastoral","Visita espiritual","Visitação"] },
      ] },
    { id:"manutencao",  nome:"Manutenção",              icon:"🛠",  cor:"var(--amber)",  resp:"Departamento de Manutenção",
      subcats:[
        { grupo:"Infraestrutura Civil",     itens:["Elétrica","Hidráulica","Estrutural","Civil","Pintura","Marcenaria","Vidraçaria","Manutenção predial","Chaveiro","Elevador/Plataforma"] },
        { grupo:"Tecnologia",               itens:["Internet","Telefonia","Rede/Wi-Fi","Informática","Computadores","Impressoras"] },
        { grupo:"Audiovisual",              itens:["Som","Projeção","Streaming/Transmissão","Equipamentos musicais"] },
        { grupo:"Climatização e Segurança", itens:["Ar-condicionado","Câmeras","Alarmes","Portão eletrônico","Controle de acesso"] },
        { grupo:"Conservação",              itens:["Iluminação","Jardinagem","Limpeza","Dedetização"] },
        { grupo:"Geral",                    itens:["Equipamentos","Pequenos reparos"] },
      ] },
    { id:"limpeza",     nome:"Limpeza e Organização",   icon:"🧹",  cor:"var(--teal)",   resp:"Equipe de Limpeza / Zeladoria",
      subcats:["Limpeza geral","Limpeza pós-evento","Organização de espaços","Solicitação de materiais de limpeza"] },
    { id:"logistica",   nome:"Logística",               icon:"🚚",  cor:"var(--amber)",  resp:"Logística / Apoio ao Culto",
      subcats:["Montagem/desmontagem de estrutura","Transporte de equipamentos","Apoio em eventos","Organização de cadeiras e mesas"] },
    { id:"financeiro",  nome:"Financeiro",              icon:"💰",  cor:"var(--gr)",     resp:"Tesouraria / Financeiro",
      subcats:["Dízimos","Ofertas","Solicitação de pagamento","Reembolso","Prestação de contas","Solicitação de verba","Orçamento de despesas"] },
    { id:"comunicacao", nome:"Comunicação e Divulgação",icon:"📢",  cor:"var(--violet)", resp:"Comunicação",
      subcats:["Divulgação de evento","Criação de arte","Publicação em redes sociais","Avisos para culto","Informativo semanal"] },
    { id:"secretaria",  nome:"Secretaria",              icon:"📄",  cor:"var(--blue)",   resp:"Secretaria / Conselho",
      subcats:["Emissão de documentos","Elaboração de relatórios","Solicitação ao Conselho","Protocolos oficiais","Registro de atas/documentos"] },
    { id:"cadastro",    nome:"Cadastro",                icon:"👥",  cor:"var(--blue)",   resp:"Secretaria",
      subcats:["Cadastro de membro","Atualização de dados","Transferência de membresia","Inclusão em ministério"] },
    { id:"oracao",      nome:"Oração e Aconselhamento", icon:"🙏",  cor:"var(--gold)",   resp:"Pastores / Liderança",
      subcats:["Pedido de oração","Aconselhamento pastoral","Visita espiritual","Atendimento pastoral"] },
    { id:"visitacao",   nome:"Visitação",               icon:"🏠",  cor:"var(--teal)",   resp:"Pastores / Diaconato",
      subcats:["Visita pastoral","Visita hospitalar","Visita social","Acompanhamento de membros"] },
    { id:"culto",       nome:"Apoio ao Culto",          icon:"🎶",  cor:"var(--violet)", resp:"Equipe de Culto / Música",
      subcats:["Escala de voluntários","Equipamentos de som/imagem","Liturgia","Organização do culto"] },
    { id:"ensino",      nome:"Ensino (EBT)",            icon:"🎓",  cor:"var(--blue)",   resp:"Departamento de Ensino",
      subcats:["Material didático","Organização de turmas","Cadastro de alunos","Solicitação de professores"] },
    { id:"social",      nome:"Ação Social / Hebron",    icon:"🤝",  cor:"var(--gr)",     resp:"Hebron / Ação Social",
      subcats:["Solicitação de ajuda","Projetos sociais","Distribuição de recursos","Cadastro em programas sociais"] },
    { id:"admin_geral", nome:"Administrativo Geral",    icon:"🧾",  cor:"var(--gold)",   resp:"Administração Geral",
      subcats:["Demandas gerais","Apoio administrativo","Solicitações internas","Processos institucionais"] },
    { id:"eventos",     nome:"Eventos",                 icon:"🎉",  cor:"var(--sky)",    resp:"Equipe de Eventos",
      subcats:["Organização de evento","Inscrições e credenciamento","Logística do evento","Divulgação","Pós-evento"] },
  ];

  function getCat(area) {
    return CATS.find(c => c.nome === area || c.id === area) || null;
  }
  function catIcon(area) { return getCat(area)?.icon || "📋"; }
  function catCor(area)  { return getCat(area)?.cor  || "var(--tx3)"; }
  function catResp(area) { return getCat(area)?.resp  || ""; }

  /* ── Status e prioridade ────────────────────────────── */

  const STATUS_CFG = {
    "Aberta":       { bg:"rgba(74,156,245,.12)",  cl:"var(--blue)"  },
    "Em Análise":   { bg:"rgba(212,168,67,.12)",  cl:"var(--gold)"  },
    "Em Andamento": { bg:"rgba(139,111,212,.12)", cl:"var(--violet)"},
    "Aguardando Pagamento": { bg:"rgba(234,179,8,.12)", cl:"var(--amber)" },
    "Concluída":    { bg:"rgba(58,170,92,.12)",   cl:"var(--gr)"    },
    "Pago":         { bg:"rgba(58,170,92,.12)",   cl:"var(--gr)"    },
    "Cancelada":    { bg:"rgba(90,96,104,.15)",   cl:"var(--tx3)"   },
    "Pendente":     { bg:"rgba(224,138,42,.12)",  cl:"var(--amber)" },
  };

  const PRIO_CFG = {
    "Urgente": "var(--rose)",
    "Alta":    "var(--rose)",
    "Média":   "var(--amber)",
    "Baixa":   "var(--gr)",
  };

  /* Nível mínimo para editar prioridade: adm_operacional (4) e acima */
  function _podeEditarPrioridade() {
    try {
      if (typeof USUARIO_ATUAL === "undefined" || !USUARIO_ATUAL) return false;
      if (USUARIO_ATUAL.perfil === "ADMINISTRADOR_GERAL") return true;
      const chave = (USUARIO_ATUAL.perfil || "").toLowerCase();
      const p = typeof PERFIS !== "undefined" ? (PERFIS[chave] || PERFIS[USUARIO_ATUAL.perfil] || null) : null;
      return p ? (p.nivel >= 4) : false;
    } catch(_) { return false; }
  }

  /* Admins e gestores (nivel >= 4) veem todas as demandas */
  function _podeVerTodas() {
    try {
      if (typeof USUARIO_ATUAL === "undefined" || !USUARIO_ATUAL) return true; // sem auth = dev mode
      if (USUARIO_ATUAL.perfil === "ADMINISTRADOR_GERAL") return true;
      if (typeof PERFIS === "undefined") return false;
      /* PERFIS usa chaves minúsculas (lider_ministerio) mas USUARIO_ATUAL.perfil é maiúsculo */
      const chave = (USUARIO_ATUAL.perfil || "").toLowerCase();
      const p = PERFIS[chave] || PERFIS[USUARIO_ATUAL.perfil] || null;
      return p ? (p.nivel >= 4) : false;
    } catch(_) { return false; }
  }

  /* Filtra localmente: usuário vê só suas demandas ou do seu ministério */
  function _filtrarVisibilidade(rows) {
    if (_podeVerTodas()) return rows;
    const u = USUARIO_ATUAL;
    if (!u) return rows;
    const nomeU = (u.nome || "").toLowerCase().trim();
    const pessoaId = u.id || u.pessoa_id || null;
    const ministerios = Array.isArray(u.ministerios) ? u.ministerios.map(m => (m||"").toLowerCase().trim()) : [];
    return rows.filter(r => {
      /* 1. Abriu a demanda (por ID ou por nome) */
      if (pessoaId && r.solicitante_id && String(r.solicitante_id) === String(pessoaId)) return true;
      if (nomeU && (r.solicitante||"").toLowerCase().trim() === nomeU) return true;
      /* 2. É responsável pela demanda */
      if (r.responsavel_id && pessoaId && String(r.responsavel_id) === String(pessoaId)) return true;
      if (nomeU && (r.responsavel||"").toLowerCase().trim() === nomeU) return true;
      /* 3. A área da demanda pertence a um ministério do usuário */
      if (ministerios.length > 0) {
        const areaD = (r.area||"").toLowerCase().trim();
        if (ministerios.some(m => areaD.includes(m) || m.includes(areaD))) return true;
      }
      return false;
    });
  }

  /* ── Normalização de status (DB ↔ label) ─────────────── */

  const _STATUS_DB = {
    "Aberta":       "ABERTA",
    "Em Análise":   "EM_ANALISE",
    "Em Andamento": "EM_ANDAMENTO",
    "Aguardando Pagamento": "AGUARDANDO_PAGAMENTO",
    "Pendente":     "PENDENTE",
    "Concluída":    "CONCLUIDA",
    "Pago":         "PAGO",
    "Cancelada":    "CANCELADA",
  };

  const _STATUS_LABEL = {
    "ABERTA":       "Aberta",
    "EM_ANALISE":   "Em Análise",
    "EM_ANDAMENTO": "Em Andamento",
    "AGUARDANDO_PAGAMENTO": "Aguardando Pagamento",
    "PENDENTE":     "Pendente",
    "CONCLUIDA":    "Concluída",
    "PAGO":         "Pago",
    "CANCELADA":    "Cancelada",
  };

  const _STATUS_FECHADO = ["CONCLUIDA", "PAGO", "CANCELADA"];

  function _toDb(st)    { return window.SIPEN?.status?.toDb    ? SIPEN.status.toDb(st)    : (_STATUS_DB[st]    || st || "ABERTA"); }
  function _toLabel(st) { return window.SIPEN?.status?.toLabel ? SIPEN.status.toLabel(st) : (_STATUS_LABEL[st] || st || "Aberta"); }

  function pillStatus(st) {
    if (window.SIPEN?.status?.pill) return SIPEN.status.pill(st);
    const label = _toLabel(st);
    const s = STATUS_CFG[label] || { bg:"rgba(90,96,104,.15)", cl:"var(--tx3)" };
    return `<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;background:${s.bg};color:${s.cl}">${label||"—"}</span>`;
  }

  function pillPrio(_p) { return ""; }

  function pillOrigem(origem) {
    if (origem !== "Portal Público") return "";
    return `<span style="font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap;background:rgba(74,156,245,.12);color:var(--sky);margin-left:4px">🌐 Portal</span>`;
  }

function fmtD(d) {
    if (!d) return "—";
    const s = d.split("T")[0].split("-");
    return `${s[2]}/${s[1]}/${s[0]}`;
  }
  function fmtDT(d) {
    if (!d) return "—";
    const [date, time] = d.includes("T") ? d.split("T") : [d, null];
    const [y, m, day] = date.split("-");
    if (!time) return `${day}/${m}/${y}`;
    const [h, min] = time.split(":");
    return `${day}/${m}/${y} às ${h}:${min}`;
  }

  function _sp() {
    return `<span style="display:inline-block;width:11px;height:11px;border:2px solid var(--gr);border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;vertical-align:middle;margin-right:6px"></span>`;
  }

  /* ── Cache ──────────────────────────────────────────── */

  let _cache = [];
  let _ativo = null;
  let _origemView = "dem-todas"; // rastreia de onde o detalhe foi aberto
  let _saving = false;           // guard: impede submit duplo em salvarNovaDemanda
  let _dashF = { area: null, status: null, prioridade: null, periodo: null };

  /* ── Estado: tela Admin Demandas ────────────────────── */
  const _ADM_KEY = "sipen_adm_dem_filtro";

  // Mapa chave-de-aba → array de áreas aceitas (null = sem filtro / todas)
  const _ADM_FILTROS = {
    "Administrativo": ["Secretaria","Conselho","Agendamentos","Cadastro","Administrativo Geral","Administrativo"],
    "Financeiro":     ["Financeiro"],
    "Infraestrutura e Conservação": ["Infraestrutura e Conservação"],
    "":               null,
  };

  // Mapa chave-de-aba → id do botão HTML
  const _ADM_BTNS = {
    "Administrativo":               "adm-dem-btn-adm",
    "Financeiro":                   "adm-dem-btn-fin",
    "Infraestrutura e Conservação": "adm-dem-btn-inf",
    "":                             "adm-dem-btn-tod",
  };

  let _admFiltro = (function () {
    try { return localStorage.getItem(_ADM_KEY) ?? "Administrativo"; } catch(_) { return "Administrativo"; }
  })();

  function _admSetFiltro(area) {
    _admFiltro = area;
    try { localStorage.setItem(_ADM_KEY, area); } catch(_) {}
    _admRender();
  }

  function _admAtualizarAbas() {
    Object.entries(_ADM_BTNS).forEach(([chave, btnId]) => {
      const el = document.getElementById(btnId);
      if (el) el.className = chave === _admFiltro ? "sni on" : "sni";
    });
  }

  function _admRender() {
    _admAtualizarAbas();
    const area  = _ADM_FILTROS[_admFiltro] ?? null;
    const fixos = area ? { area } : undefined;
    renderLista("admin-demandas-content", fixos);
  }

  /* ── Estado: tela Fin Demandas ─────────────────────── */
  const _FIN_KEY = "sipen_fin_dem_filtro";

  const _FIN_FILTROS = {
    "Financeiro":                 ["Financeiro"],
    "Administrativo":             ["Secretaria","Conselho","Agendamentos","Cadastro","Administrativo Geral","Administrativo"],
    "Infraestrutura e Conservação": ["Infraestrutura e Conservação"],
    "": null,
  };

  const _FIN_BTNS = {
    "Financeiro":                   "fin-dem-btn-fin",
    "Administrativo":               "fin-dem-btn-adm",
    "Infraestrutura e Conservação": "fin-dem-btn-inf",
    "":                             "fin-dem-btn-tod",
  };

  let _finFiltro = (function () {
    try { return localStorage.getItem(_FIN_KEY) ?? "Financeiro"; } catch(_) { return "Financeiro"; }
  })();

  function _finSetFiltro(area) {
    _finFiltro = area;
    try { localStorage.setItem(_FIN_KEY, area); } catch(_) {}
    _finRender();
  }

  function _finAtualizarAbas() {
    Object.entries(_FIN_BTNS).forEach(([chave, btnId]) => {
      const el = document.getElementById(btnId);
      if (el) el.className = chave === _finFiltro ? "sni on" : "sni";
    });
  }

  function _finRender() {
    _finAtualizarAbas();
    const area  = _FIN_FILTROS[_finFiltro] ?? null;
    const fixos = area ? { area } : undefined;
    _finRenderLista(fixos);
  }

  async function _load() {
    try {
      let rows;
      if (_podeVerTodas()) {
        rows = await apiRead("DEMANDAS");
      } else {
        rows = await _loadFiltrado();
      }
      /* Normaliza status e deduplica por ID — impede duplicatas vindas do backend */
      const normalized = rows.map(r => ({ ...r, status: _toLabel(r.status) }));
      const seen = new Map();
      for (const r of normalized) {
        const key = String(r.id ?? r._row ?? "");
        if (key && !seen.has(key)) seen.set(key, r);
      }
      _cache = _filtrarVisibilidade([...seen.values()]);
    }
    catch(e) { console.warn("Demandas load:", e.message); _cache = []; }
    return _cache;
  }

  /* Query filtrada no backend — evita trafegar dados restritos para o browser */
  async function _loadFiltrado() {
    try {
      const u = USUARIO_ATUAL;
      if (!u) return apiRead("DEMANDAS");

      const base = (typeof apiBaseUrl === "function" ? apiBaseUrl() : "");
      const hdrs = (typeof apiHeaders === "function" ? apiHeaders({ "Prefer":"count=none" }) : {});
      if (!base) return apiRead("DEMANDAS");

      const pessoaId = u.id || u.pessoa_id || null;
      const nomeU    = (u.nome || "").trim();
      const mins     = Array.isArray(u.ministerios) ? u.ministerios.filter(Boolean) : [];

      /* Constrói filtro OR: solicitante_id, solicitante_txt, responsavel_id, areas do ministério */
      const orParts = [];
      if (pessoaId) {
        orParts.push(`solicitante_id.eq.${pessoaId}`);
        orParts.push(`responsavel_id.eq.${pessoaId}`);
        orParts.push(`created_by.eq.${pessoaId}`);
      }
      if (nomeU) {
        orParts.push(`solicitante_txt.ilike.*${encodeURIComponent(nomeU)}*`);
        orParts.push(`responsavel_txt.ilike.*${encodeURIComponent(nomeU)}*`);
      }
      /* Áreas vinculadas aos ministérios do usuário */
      mins.forEach(m => {
        orParts.push(`area.ilike.*${encodeURIComponent(m)}*`);
      });

      if (orParts.length === 0) return [];

      const filter = `or=(${orParts.join(",")})`;
      const url = `${base}/rest/v1/v_demandas?select=*&${filter}&order=id.desc.nullslast&limit=500`;
      const res = await fetch(url, { method:"GET", headers: hdrs });
      if (!res.ok) {
        console.warn("_loadFiltrado fallback:", res.status);
        return []; /* falha segura: não retorna dados não autorizados */
      }
      const data = await res.json();
      return Array.isArray(data) ? data.map(row => ({ ...row, _row: row.id || row._row || null })) : [];
    } catch(e) {
      console.warn("_loadFiltrado erro:", e.message);
      return [];
    }
  }

  function _invalidate() { _cache = []; }

  /* ── Badge do menu ──────────────────────────────────── */

  function _atualizarBadge() {
    const badge = document.querySelector("#mw-dem .mbadge");
    if (!badge) return;
    const abertas = _cache.filter(r => !_STATUS_FECHADO.includes(_toDb(r.status))).length;
    badge.textContent = abertas || "";
    badge.style.display = abertas ? "" : "none";
  }

  /* ── Dashboard ──────────────────────────────────────── */

  async function renderDash() {
    const el = document.getElementById("dem-dash-content");
    if (!el) return;
    el.innerHTML = `<div style="padding:12px 0;color:var(--tx3);font-size:11.5px">${_sp()} Carregando...</div>`;

    await _load();
    _atualizarBadge();

    const ATIVAS = ["Aberta","Em Análise","Em Andamento","Pendente"];
    const novas    = _cache.filter(r => r.status === "Aberta");
    const analise  = _cache.filter(r => r.status === "Em Análise");
    const andando  = _cache.filter(r => r.status === "Em Andamento");
    const pendente = _cache.filter(r => r.status === "Pendente");
    const concl    = _cache.filter(r => ["Concluída","Pago"].includes(r.status));
    const cancel   = _cache.filter(r => r.status === "Cancelada");
    const urgentes = _cache.filter(r => ["Alta","Urgente"].includes(r.prioridade) && ATIVAS.includes(r.status));
    const total    = _cache.filter(r => ATIVAS.includes(r.status));

    /* Recentes: abertas + em análise ordenadas por criado_em */
    const recentes = [..._cache]
      .sort((a,b) => (b.criado_em||"").localeCompare(a.criado_em||""))
      .slice(0, 10);

    /* Top categorias com abertas */
    const porCat = {};
    total.forEach(r => { const a = r.area||"Sem categoria"; porCat[a] = (porCat[a]||0)+1; });
    const catRank = Object.entries(porCat).sort((a,b) => b[1]-a[1]).slice(0, 6);
    const maxCat  = catRank[0]?.[1] || 1;

    /* Visão do pipeline por status */
    const totalGeral = _cache.length || 1;
    const pipeline = [
      { label:"Aberta",       val:novas.length,   cor:"var(--blue)",   view:"dem-todas" },
      { label:"Em Análise",   val:analise.length, cor:"var(--gold)",   view:"dem-analise" },
      { label:"Em Andamento", val:andando.length, cor:"var(--violet)", view:"dem-and" },
      { label:"Pendente",     val:pendente.length,cor:"var(--amber)",  view:"dem-todas" },
      { label:"Concluída",    val:concl.length,   cor:"var(--gr)",     view:"dem-conc" },
      { label:"Cancelada",    val:cancel.length,  cor:"var(--tx4)",    view:"dem-hist" },
    ];

    const alertaUrgente = "";

    el.innerHTML = `
      ${alertaUrgente}
      <div class="kpis" style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0;background:var(--bg-card);border:1px solid var(--bd1);border-radius:var(--rl);overflow:hidden;margin-bottom:18px">
        <div class="kpi" style="cursor:pointer;border-radius:0;border:none;border-right:1px solid var(--bd1)" onclick="window.go('dem-todas')">
          <div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">◻</div>
          <div class="kpi-body"><div class="kpi-lbl">Novas</div><div class="kpi-val">${novas.length}</div><div class="kpi-d nu">aguardando</div></div>
        </div>
        <div class="kpi" style="cursor:pointer;border-radius:0;border:none;border-right:1px solid var(--bd1)" onclick="window.go('dem-analise')">
          <div class="kpi-ico" style="background:rgba(212,168,67,.12);color:var(--gold)">🔍</div>
          <div class="kpi-body"><div class="kpi-lbl">Em Análise</div><div class="kpi-val">${analise.length}</div><div class="kpi-d nu">triagem</div></div>
        </div>
        <div class="kpi" style="cursor:pointer;border-radius:0;border:none;border-right:1px solid var(--bd1)" onclick="window.go('dem-and')">
          <div class="kpi-ico" style="background:var(--violetbg);color:var(--violet)">◎</div>
          <div class="kpi-body"><div class="kpi-lbl">Em Andamento</div><div class="kpi-val">${andando.length}</div><div class="kpi-d nu">em execução</div></div>
        </div>
        <div class="kpi" style="cursor:pointer;border-radius:0;border:none;border-right:1px solid var(--bd1)" onclick="window.go('dem-todas')">
          <div class="kpi-ico" style="background:rgba(212,168,67,.12);color:var(--amber)">⏳</div>
          <div class="kpi-body"><div class="kpi-lbl">Pendentes</div><div class="kpi-val">${pendente.length}</div><div class="kpi-d nu">aguardando</div></div>
        </div>
        <div class="kpi" style="cursor:pointer;border-radius:0;border:none" onclick="window.go('dem-conc')">
          <div class="kpi-ico" style="background:rgba(58,170,92,.12);color:var(--gr)">✓</div>
          <div class="kpi-body"><div class="kpi-lbl">Concluídas</div><div class="kpi-val">${concl.length}</div><div class="kpi-d up">total</div></div>
        </div>
      </div>

      <div class="g2">
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div class="ctit" style="margin-bottom:0">Solicitações</div>
            <span class="cact" onclick="demRecarregarDash()">↻ Atualizar</span>
          </div>
          <div id="dem-dash-chips" style="display:flex;flex-wrap:nowrap;gap:6px;margin-bottom:10px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none"></div>
          <div id="dem-dash-filtros" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px"></div>
          <div id="dem-dash-tags" style="display:none;gap:6px;flex-wrap:wrap;margin-bottom:10px;align-items:center"></div>
          <div id="dem-dash-lista"></div>
        </div>

        <div style="position:sticky;top:16px;align-self:start">
          <div class="card">
            <div class="ctit">Visão Geral</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px">
              ${pipeline.map(p => `
                <div onclick="window.go('${p.view}')"
                  style="cursor:pointer;padding:10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-page);transition:background .12s"
                  onmouseover="this.style.background='var(--bg-hover)'"
                  onmouseout="this.style.background='var(--bg-page)'">
                  <div style="font-size:20px;font-weight:800;line-height:1;color:${p.val>0?p.cor:'var(--tx4)'}">${p.val}</div>
                  <div style="font-size:10.5px;color:var(--tx3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.label}</div>
                </div>`).join("")}
            </div>
            ${catRank.length > 0 ? `
            <div style="border-top:1px solid var(--bd1);margin-top:12px;padding-top:10px">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:6px">Por categoria</div>
              ${catRank.map(([cat, qtd]) => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--bd1)">
                  <span style="font-size:11.5px;color:var(--tx2)">${catIcon(cat)} ${cat}</span>
                  <span style="font-size:12px;font-weight:700;color:${catCor(cat)}">${qtd}</span>
                </div>`).join("")}
            </div>` : ''}
          </div>
        </div>
      </div>`;

    _dashRender();
  }

  window.demRecarregarDash = async function() { _invalidate(); await renderDash(); };

  /* ── Áreas para chips do Dashboard ─────────────────── */

  const _DASH_AREAS = [
    { id: null,    label: "Todas" },
    { id: "adm",   label: "Administração",
      match: r => ["Secretaria","Cadastro","Administrativo Geral","Logística","Comunicação e Divulgação","Apoio ao Culto","Ação Social / Hebron","Ensino (EBT)","Oração e Aconselhamento","Visitação","Administrativo"].includes(r.area) },
    { id: "cons",  label: "Conselho",
      match: r => r.area === "Conselho" },
    { id: "fin",   label: "Financeiro",
      match: r => r.area === "Financeiro" },
    { id: "infra", label: "Infraestrutura e Conservação",
      match: r => _INFRA_AREAS.includes(r.area) },
    { id: "agenda",label: "Agenda",
      match: r => ["Agendamentos","Eventos"].includes(r.area) },
  ];

  function _dashHasFilter() {
    return !!(  _dashF.area || _dashF.status || _dashF.prioridade || _dashF.periodo);
  }

  function _dashGetRows() {
    let all = _filtrarVisibilidade([..._cache])
      .sort((a,b) => (b.criado_em||"").localeCompare(a.criado_em||""));

    const areaDef = _DASH_AREAS.find(a => a.id === _dashF.area);
    if (areaDef?.match) all = all.filter(areaDef.match);

    if (_dashF.status === "historico") {
      // show all statuses
    } else if (_dashF.status) {
      all = all.filter(r => r.status === _dashF.status);
    }

    if (_dashF.prioridade) all = all.filter(r => ["Alta","Urgente"].includes(r.prioridade));

    if (_dashF.periodo) {
      const dias = { "7d": 7, "30d": 30, "90d": 90 }[_dashF.periodo] || 0;
      if (dias) {
        const limite = new Date(Date.now() - dias * 86400000).toISOString();
        all = all.filter(r => (r.criado_em || r.data_abertura || "") >= limite);
      }
    }

    return all;
  }

  function _renderDashChips() {
    const el = document.getElementById("dem-dash-chips");
    if (!el) return;
    const visible = _filtrarVisibilidade([..._cache]);
    el.innerHTML = _DASH_AREAS.map(a => {
      const count = a.match ? visible.filter(a.match).length : visible.length;
      const ativo = _dashF.area === a.id;
      return `<span onclick="demDashFiltrarArea(${JSON.stringify(a.id)})"
        style="cursor:pointer;flex-shrink:0;padding:5px 12px;border-radius:20px;font-size:11.5px;font-weight:600;
               border:1px solid ${ativo ? 'var(--blue)' : 'var(--bd2)'};
               background:${ativo ? 'rgba(74,156,245,.12)' : 'transparent'};
               color:${ativo ? 'var(--blue)' : 'var(--tx3)'};transition:all .12s;white-space:nowrap">
        ${a.label} <span style="font-size:10px;opacity:.7">${count}</span>
      </span>`;
    }).join("");
  }

  function _renderDashFiltros() {
    const el = document.getElementById("dem-dash-filtros");
    if (!el) return;
    const selStyle = `cursor:pointer;padding:4px 10px;border-radius:6px;font-size:11.5px;font-weight:500;
      border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx2);outline:none`;
    el.innerHTML = `
      <select onchange="demDashFiltroStatus(this.value)" style="${selStyle}">
        <option value="">Status</option>
        <option value="Aberta"       ${_dashF.status==="Aberta"?"selected":""}>Aberta</option>
        <option value="Em Análise"   ${_dashF.status==="Em Análise"?"selected":""}>Em Análise</option>
        <option value="Em Andamento" ${_dashF.status==="Em Andamento"?"selected":""}>Em Andamento</option>
        <option value="Pendente"     ${_dashF.status==="Pendente"?"selected":""}>Pendente</option>
        <option value="Concluída"    ${_dashF.status==="Concluída"?"selected":""}>Concluída</option>
        <option value="Pago"         ${_dashF.status==="Pago"?"selected":""}>Pago</option>
        <option value="Cancelada"    ${_dashF.status==="Cancelada"?"selected":""}>Cancelada</option>
        <option value="historico"    ${_dashF.status==="historico"?"selected":""}>Histórico (todas)</option>
      </select>
      <select onchange="demDashFiltroPrio(this.value)" style="${selStyle}">
        <option value="">Prioridade</option>
        <option value="alta" ${_dashF.prioridade==="alta"?"selected":""}>Alta / Urgente</option>
      </select>
      <select onchange="demDashFiltroPeriodo(this.value)" style="${selStyle}">
        <option value="">Período</option>
        <option value="7d"  ${_dashF.periodo==="7d"?"selected":""}>Últimos 7 dias</option>
        <option value="30d" ${_dashF.periodo==="30d"?"selected":""}>Últimos 30 dias</option>
        <option value="90d" ${_dashF.periodo==="90d"?"selected":""}>Últimos 90 dias</option>
      </select>`;
  }

  function _renderDashTags() {
    const el = document.getElementById("dem-dash-tags");
    if (!el) return;
    const tags = [];
    if (_dashF.area) {
      const a = _DASH_AREAS.find(x => x.id === _dashF.area);
      if (a) tags.push({ label: a.label, clear: () => { _dashF.area = null; _dashRender(); } });
    }
    if (_dashF.status) {
      const lbl = _dashF.status === "historico" ? "Histórico" : _dashF.status;
      tags.push({ label: lbl, clear: () => { _dashF.status = null; _dashRender(); } });
    }
    if (_dashF.prioridade) {
      tags.push({ label: "Alta Prioridade", clear: () => { _dashF.prioridade = null; _dashRender(); } });
    }
    if (_dashF.periodo) {
      const lbl = { "7d":"7 dias","30d":"30 dias","90d":"90 dias" }[_dashF.periodo] || _dashF.periodo;
      tags.push({ label: lbl, clear: () => { _dashF.periodo = null; _dashRender(); } });
    }
    if (!tags.length) { el.style.display = "none"; return; }
    el.style.display = "flex";
    el.innerHTML = tags.map((t, i) =>
      `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;
              font-size:11px;font-weight:600;background:rgba(74,156,245,.12);color:var(--blue);border:1px solid rgba(74,156,245,.3)">
        ${escapeHtml(t.label)}
        <span onclick="demDashRemoveTag(${i})" style="cursor:pointer;font-size:13px;line-height:1;opacity:.7">×</span>
      </span>`
    ).join("") +
    `<span onclick="demDashLimpar()" style="cursor:pointer;font-size:11px;font-weight:600;color:var(--tx3);padding:3px 6px">Limpar filtros</span>`;
    window._dashTagClearFns = tags.map(t => t.clear);
  }

  function _renderDashListaRows() {
    const el = document.getElementById("dem-dash-lista");
    if (!el) return;
    let rows = _dashGetRows();
    const temFiltro = _dashHasFilter();
    const visible = _filtrarVisibilidade([..._cache]);
    const _verMais = !temFiltro && visible.length > 15
      ? `<div style="padding:12px 0;text-align:center;border-top:1px solid var(--bd1)">
           <span onclick="window.go('dem-todas')" style="cursor:pointer;font-size:11.5px;color:var(--blue);font-weight:600">Ver todas (${visible.length}) →</span>
         </div>`
      : "";
    if (!temFiltro) rows = rows.slice(0, 15);
    if (!rows.length) { el.innerHTML = '<div class="empty-state">Nenhuma demanda encontrada</div>' + _verMais; return; }
    el.innerHTML = rows.map(r => {
      const corCat  = catCor(r.area);
      const meta = [
        r.subcategoria ? escapeHtml(r.subcategoria) : null,
        r.local        ? escapeHtml(r.local)        : null,
        nomePropio(r.solicitante || r.solicitante_txt) || null,
        fmtDT(r.criado_em) || fmtD(r.data_abertura),
      ].filter(Boolean).join("  ·  ");
      return `
        <div onclick="demAbrirDetalhe('${r.id||r._row}','dem-dash')"
             style="cursor:pointer;display:flex;align-items:stretch;gap:0;padding:11px 0;border-bottom:1px solid var(--bd1);transition:background .1s"
             onmouseover="this.style.background='var(--bg-hover)'"
             onmouseout="this.style.background=''">
          <div style="width:3px;border-radius:2px;background:${corCat};flex-shrink:0;margin-right:12px;align-self:stretch"></div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-size:13px;font-weight:700;color:var(--tx1);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${catIcon(r.area)} ${escapeHtml(r.titulo) || "Sem título"}</span>
              ${pillStatus(r.status)}
              ${pillOrigem(r.origem)}
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              ${r.numero_chamado ? `<span style="font-size:10px;font-weight:700;color:var(--blue);font-family:var(--mono);letter-spacing:.04em;flex-shrink:0">${escapeHtml(r.numero_chamado)}</span><span style="color:var(--bd2);font-size:10px">·</span>` : ""}
              <span style="font-size:10.5px;color:var(--tx3);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.area)||"—"}${meta ? `  ·  ${meta}` : ""}</span>
            </div>
          </div>
        </div>`;
    }).join("") + _verMais;
  }

  function _dashRender() {
    _renderDashChips();
    _renderDashFiltros();
    _renderDashTags();
    _renderDashListaRows();
  }

  window.demDashFiltrar = function(id) {
    _dashF.area = id || null;
    _dashRender();
  };

  window.demDashFiltrarArea = function(id) {
    _dashF.area = id;
    _dashRender();
  };

  window.demDashFiltroStatus = function(v) {
    _dashF.status = v || null;
    _dashRender();
  };

  window.demDashFiltroPrio = function(v) {
    _dashF.prioridade = v || null;
    _dashRender();
  };

  window.demDashFiltroPeriodo = function(v) {
    _dashF.periodo = v || null;
    _dashRender();
  };

  window.demDashRemoveTag = function(i) {
    if (window._dashTagClearFns && window._dashTagClearFns[i]) window._dashTagClearFns[i]();
  };

  window.demDashLimpar = function() {
    _dashF = { area: null, status: null, prioridade: null, periodo: null };
    _dashRender();
  };

  /* ── Lista com filtros ──────────────────────────────── */

  async function renderLista(elId, filtrosFixos) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `<div style="padding:8px 0;color:var(--tx3);font-size:11.5px">${_sp()} Carregando...</div>`;

    if (!_cache.length) await _load();

    /* Deduplica por ID como camada defensiva antes de qualquer filtro */
    const _seen = new Map();
    for (const r of _cache) {
      const key = String(r.id ?? r._row ?? "");
      if (key && !_seen.has(key)) _seen.set(key, r);
    }
    let rows = [..._seen.values()];

    /* Filtros fixos — comparação normalizada (aceita label, código DB ou array) */
    if (filtrosFixos) {
      Object.entries(filtrosFixos).forEach(([k, v]) => {
        if (!v) return;
        if (k === "prioridade" && v === "Alta") {
          rows = rows.filter(r => ["Alta","Urgente"].includes(r.prioridade));
        } else if (k === "status") {
          const vArr = Array.isArray(v) ? v.map(_toDb) : [_toDb(String(v))];
          rows = rows.filter(r => vArr.includes(_toDb(String(r[k]||""))));
        } else if (Array.isArray(v)) {
          rows = rows.filter(r => v.includes(String(r[k]||"")));
        } else {
          rows = rows.filter(r => String(r[k]||"") === String(v));
        }
      });
    }

    /* Filtros da UI */
    const fStatus = document.getElementById(elId+"-fstatus")?.value || "";
    const fCat    = document.getElementById(elId+"-fcat")?.value    || "";
    const fPrio   = document.getElementById(elId+"-fprio")?.value   || "";
    const fBusca  = (document.getElementById(elId+"-fbusca")?.value || "").toLowerCase();

    if (fStatus) rows = rows.filter(r => _toDb(r.status) === _toDb(fStatus));
    if (fCat)    rows = rows.filter(r => r.area === fCat);
    if (fPrio)   rows = rows.filter(r => r.prioridade === fPrio);
    if (fBusca)  rows = rows.filter(r =>
      (r.titulo||"").toLowerCase().includes(fBusca) ||
      (r.solicitante||"").toLowerCase().includes(fBusca) ||
      (r.responsavel||"").toLowerCase().includes(fBusca) ||
      (r.area||"").toLowerCase().includes(fBusca) ||
      (r.subcategoria||"").toLowerCase().includes(fBusca)
    );

    rows.sort((a,b) => (b.criado_em||"").localeCompare(a.criado_em||""));

    if (rows.length === 0) {
      el.innerHTML = '<div style="color:var(--tx3);font-size:11.5px;padding:8px 0">Nenhuma demanda encontrada.</div>';
      return;
    }

    /* Determina a view de origem para o botão Voltar no detalhe */
    const viewOrigem = _viewIdFromListId(elId);

    el.innerHTML = `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="border-bottom:1px solid var(--bd2)">
              ${["Categoria","Subcategoria","Título","Solicitante","Responsável","Valor","Status","Abertura"].map((h,i) =>
                `<th style="text-align:${i===5?"right":"left"};padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`
              ).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr style="border-bottom:1px solid var(--bd1);cursor:pointer"
                  onclick="demAbrirDetalhe('${r.id||r._row}','${viewOrigem}')"
                  onmouseover="this.style.background='var(--bg-hover)'"
                  onmouseout="this.style.background=''">
                <td style="padding:8px 6px">
                  <span style="font-size:11px;font-weight:600;color:${catCor(r.area)}">${catIcon(r.area)} ${r.area||"—"}</span>
                </td>
                <td style="padding:8px 6px;color:var(--tx2);font-size:11px">${r.subcategoria||"—"}</td>
                <td style="padding:8px 6px;color:var(--tx1);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.titulo) || "—"}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${nomePropio(r.solicitante || r.solicitante_txt || r.nome_solicitante_externo) || "—"}${pillOrigem(r.origem)}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${nomePropio(r.responsavel || r.responsavel_txt) || "—"}</td>
                <td style="padding:8px 6px;text-align:right;font-weight:700;color:var(--tx1);white-space:nowrap">${r.financial_data?.valor != null ? `R$ ${parseFloat(r.financial_data.valor).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}` : "—"}</td>
                <td style="padding:8px 6px">${pillStatus(r.status)}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${fmtDT(r.criado_em) || fmtD(r.data_abertura)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function _viewIdFromListId(elId) {
    const MAP = {
      "dem-dash-content":    "dem-dash",
      "dem-todas-content":         "dem-todas",
      "dem-analise-content":       "dem-analise",
      "dem-and-content":           "dem-and",
      "dem-conc-content":          "dem-conc",
      "dem-pri-content":           "dem-pri",
      "dem-hist-content":          "dem-hist",
      "admin-demandas-content":         "admin-demandas",
      "admin-demandas-adm-content":     "admin-demandas-adm",
      "conselho-demandas-content":        "conselho-demandas",
      "conselho-demandas-cons-content":   "conselho-demandas-cons",
      "infra-demandas-content":           "infra-demandas",
      "infra-demandas-infra-content":     "infra-demandas-infra",
      "jur-demandas-tab-content":         "jur-demandas-tab",
      "jur-demandas-jur-content":         "jur-demandas-jur",
      "pastoral-demandas-content":        "pastoral-demandas",
      "pastoral-demandas-pas-content":    "pastoral-demandas-pas",
      "area-dem-content":                 "area-dem",
    };
    return MAP[elId] || "dem-todas";
  }

  /* ── Andamentos ─────────────────────────────────────── */

  function _sbClient() {
    return typeof getSupabase === "function" ? getSupabase() : null;
  }

  function _podeRegistrarAndamento(dem) {
    try {
      if (typeof USUARIO_ATUAL === "undefined" || !USUARIO_ATUAL) return true;
      if (_podeVerTodas()) return true;
      const u = USUARIO_ATUAL;
      const nomeU = (u.nome || "").toLowerCase().trim();
      const pessoaId = u.id || u.pessoa_id || null;
      const ministerios = Array.isArray(u.ministerios) ? u.ministerios.map(m => (m||"").toLowerCase().trim()) : [];
      if (pessoaId && dem.solicitante_id && String(dem.solicitante_id) === String(pessoaId)) return true;
      if (nomeU && (dem.solicitante||"").toLowerCase().trim() === nomeU) return true;
      if (dem.responsavel_id && pessoaId && String(dem.responsavel_id) === String(pessoaId)) return true;
      if (nomeU && (dem.responsavel||"").toLowerCase().trim() === nomeU) return true;
      if (ministerios.length > 0) {
        const areaD = (dem.area||"").toLowerCase().trim();
        if (ministerios.some(m => areaD.includes(m) || m.includes(areaD))) return true;
      }
      return false;
    } catch(_) { return true; }
  }

  async function _carregarAndamentos(demandaId, dem) {
    const listEl = document.getElementById("dem-and-list-" + demandaId);
    if (!listEl) return;
    const sb = _sbClient();
    if (!sb) {
      listEl.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:8px 0">Supabase não disponível.</div>`;
      return;
    }
    listEl.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:8px 0">${_sp()} Carregando…</div>`;
    try {
      const { data, error } = await sb
        .from("demanda_andamentos")
        .select("id, texto, usuario_nome, status_demanda, automatico, created_at")
        .eq("demanda_id", demandaId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!data || !data.length) {
        listEl.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:8px 0;font-style:italic">Nenhum andamento registrado ainda.</div>`;
        return;
      }
      listEl.innerHTML = data.map(a => {
        const dt = a.created_at ? (() => {
          const d = new Date(a.created_at);
          return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
        })() : "—";
        return `<div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd1)">
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:${a.automatico?"rgba(90,96,104,.2)":"rgba(74,156,245,.15)"};display:flex;align-items:center;justify-content:center;font-size:14px;margin-top:2px">
            ${a.automatico ? "🔄" : "💬"}
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px">
              <span style="font-size:12px;font-weight:600;color:var(--tx1)">${nomePropio(a.usuario_nome) || "Sistema"}</span>
              <span style="font-size:10.5px;color:var(--tx3)">${dt}</span>
              ${a.status_demanda ? pillStatus(a.status_demanda) : ""}
            </div>
            <div style="font-size:12.5px;color:${a.automatico?"var(--tx3)":"var(--tx1)"};line-height:1.5;font-style:${a.automatico?"italic":"normal"}">${escapeHtml(a.texto)}</div>
          </div>
        </div>`;
      }).join("");
    } catch(e) {
      console.error("[andamentos] carregar:", e);
      listEl.innerHTML = `<div style="color:var(--rose);font-size:12px;padding:8px 0">Erro ao carregar andamentos: ${e.message}</div>`;
    }
  }

  async function _registrarAndamentoAuto(demandaId, texto, statusDemanda) {
    const sb = _sbClient();
    if (!sb) return;
    try {
      const nomeU = typeof USUARIO_ATUAL !== "undefined" ? (USUARIO_ATUAL?.nome || "") : "";
      const uidU  = typeof USUARIO_ATUAL !== "undefined" ? (USUARIO_ATUAL?.id   || null) : null;
      await sb.from("demanda_andamentos").insert({
        demanda_id:     demandaId,
        usuario_id:     uidU,
        usuario_nome:   nomeU,
        texto,
        status_demanda: statusDemanda ? _toDb(statusDemanda) : null,
        automatico:     true,
      });
    } catch(e) {
      console.warn("[andamentos] auto:", e.message);
    }
  }

  async function _carregarWADemanda(demandaId, dem) {
    const el = document.getElementById("dem-wa-list-" + demandaId);
    if (!el) return;
    const base = (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "").trim().replace(/\/$/, "");
    const hdrs = typeof apiHeaders === "function" ? apiHeaders() : {};
    try {
      const res = await fetch(
        `${base}/rest/v1/whatsapp_mensagens?referencia_tipo=eq.demanda&referencia_id=eq.${demandaId}` +
        `&select=id,para_numero,para_nome,mensagem,status,criado_em&order=criado_em.desc`,
        { headers: hdrs }
      );
      const logs = res.ok ? await res.json() : [];
      if (!logs.length) {
        el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:8px 0">Nenhuma mensagem enviada para esta demanda.</div>`;
        return;
      }
      const SC = { enviado: "var(--gr)", pendente: "var(--gold)", erro: "var(--rose)" };
      const SL = { enviado: "Enviado",   pendente: "Pendente",    erro: "Erro" };
      const modulo = _AREA_MODULO_WA[dem?.area] || "DEMANDAS";
      const _dtFmt = iso => {
        if (!iso) return "—";
        const d = new Date(iso);
        return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      };
      el.innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr>
        <th style="white-space:nowrap">Data/Hora</th>
        <th>Destinatário</th>
        <th>Mensagem</th>
        <th class="r">Status</th>
      </tr></thead><tbody>${logs.map(r => {
        const podeReenviar = r.status === "erro" || r.status === "pendente";
        const reenviarBtn = podeReenviar
          ? `<button
               style="margin-left:8px;font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid rgba(208,144,64,.4);background:rgba(208,144,64,.1);color:var(--amber);cursor:pointer;vertical-align:middle"
               onclick="demWAReenviar(${JSON.stringify(r.id)},${JSON.stringify(r.para_numero)},${JSON.stringify(r.para_nome||"")},${JSON.stringify(r.mensagem||"")},${JSON.stringify(modulo)},${JSON.stringify(String(demandaId))},this)"
             >Reenviar</button>`
          : "";
        return `<tr>
          <td style="color:var(--tx3);white-space:nowrap;font-size:11px">${_dtFmt(r.criado_em)}</td>
          <td style="font-size:11.5px">${escapeHtml(r.para_nome || r.para_numero || "—")}</td>
          <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px" title="${escapeHtmlAttr(r.mensagem||"")}">${escapeHtml((r.mensagem||"").slice(0,55))}${(r.mensagem||"").length>55?"…":""}</td>
          <td class="r" style="white-space:nowrap">
            <span style="font-size:10.5px;font-weight:700;color:${SC[r.status]||"var(--tx3)"}">${SL[r.status]||escapeHtml(r.status||"—")}</span>
            ${reenviarBtn}
          </td>
        </tr>`;
      }).join("")}</tbody></table></div>`;
    } catch(e) {
      el.innerHTML = `<div style="color:var(--rose);font-size:11.5px;padding:8px 0">Erro ao carregar histórico WhatsApp.</div>`;
    }
  }

  window.demWAReenviar = async function(msgId, numero, nome, mensagem, modulo, demandaId, btn) {
    if (btn) { btn.disabled = true; btn.textContent = "…"; }
    try {
      if (typeof WA === "undefined") throw new Error("WA não definido");
      const res = await WA.send({
        para: numero, nome: nome || "", mensagem, modulo,
        chave: `REENVIO_${msgId}_${Date.now()}`,
      });
      if (res.ok || res.status === "enviado" || res.status === "pendente") {
        if (typeof T === "function") T("Reenviado", "Mensagem encaminhada com sucesso");
      } else {
        if (typeof T === "function") T("Erro ao reenviar", res.error || res.status || "Tente novamente");
        if (btn) { btn.disabled = false; btn.textContent = "Reenviar"; }
        return;
      }
    } catch(e) {
      if (typeof T === "function") T("Erro ao reenviar", e.message);
      if (btn) { btn.disabled = false; btn.textContent = "Reenviar"; }
      return;
    }
    await _carregarWADemanda(demandaId, _ativo);
  };

  window.demNotificarResponsaveis = async function(demandaId) {
    const dem = _ativo;
    if (!dem) { if (typeof T === "function") T("Erro", "Demanda não identificada"); return; }
    if (typeof WA === "undefined") { if (typeof T === "function") T("Erro", "Módulo WhatsApp não carregado"); return; }

    const modulo = _AREA_MODULO_WA[dem.area];
    if (!modulo) {
      if (typeof T === "function") T("Área sem módulo WA", `Área "${dem.area}" não tem módulo WhatsApp configurado`);
      return;
    }

    const base = (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "").trim().replace(/\/$/, "");
    const hdrs = typeof apiHeaders === "function" ? apiHeaders() : {};

    let rows = [];
    try {
      const res = await fetch(
        `${base}/rest/v1/whatsapp_modulo_responsaveis?modulo=eq.${encodeURIComponent(modulo)}&ativo=eq.true` +
        `&select=pessoa_id,pessoas(id,nome,whatsapp,telefone,celular)`,
        { headers: hdrs }
      );
      rows = res.ok ? await res.json() : [];
    } catch(e) {
      if (typeof T === "function") T("Erro", "Falha ao buscar responsáveis: " + e.message);
      return;
    }

    const aptos = rows.filter(r => r.pessoas && (r.pessoas.whatsapp || r.pessoas.celular || r.pessoas.telefone));
    if (!aptos.length) {
      if (typeof T === "function") T("Sem responsáveis", `Nenhum responsável ativo com telefone no módulo ${modulo}`);
      return;
    }

    const msg = _montarMsgWA(dem);
    let enviados = 0, erros = 0;
    for (const row of aptos) {
      const p = row.pessoas;
      const tel = p.whatsapp || p.celular || p.telefone;
      try {
        const res = await WA.send({
          para: tel, nome: p.nome, mensagem: msg, modulo,
          referenciaT: "demanda", referenciaId: String(dem.id || ""),
          chave: `DEM_NOVA_${dem.id}_${row.pessoa_id}_${Date.now()}`,
        });
        if (res.ok || res.status === "enviado" || res.status === "pendente") enviados++;
        else erros++;
      } catch(_) { erros++; }
    }

    if (enviados > 0 && erros === 0)
      T("Notificação enviada", `${enviados} responsável(is) notificado(s) via WhatsApp`);
    else if (enviados > 0)
      T("Parcialmente enviado", `${enviados} enviado(s), ${erros} com erro`);
    else
      T("Falha no envio", `Nenhuma mensagem enviada — verifique o BotConversa`);

    await _carregarWADemanda(demandaId, dem);
  };

  window.demRegistrarAndamento = async function(demandaId) {
    const txtEl = document.getElementById("dem-and-txt-" + demandaId);
    const texto = txtEl ? txtEl.value.trim() : "";
    if (!texto) {
      if (typeof T === "function") T("Campo vazio", "Escreva um andamento antes de registrar");
      return;
    }
    const sb = _sbClient();
    if (!sb) return;
    const btn = document.querySelector(`[data-and-btn="${demandaId}"]`);
    if (btn) { btn.disabled = true; btn.textContent = "Salvando…"; }
    try {
      const nomeU = typeof USUARIO_ATUAL !== "undefined" ? (USUARIO_ATUAL?.nome || "") : "";
      const uidU  = typeof USUARIO_ATUAL !== "undefined" ? (USUARIO_ATUAL?.id   || null) : null;
      const { error } = await sb.from("demanda_andamentos").insert({
        demanda_id:   demandaId,
        usuario_id:   uidU,
        usuario_nome: nomeU,
        texto,
        automatico:   false,
      });
      if (error) throw error;
      txtEl.value = "";
      if (typeof T === "function") T("✅ Andamento registrado!", "");
      const _demAndamento = _cache.find(r => String(r.id||r._row) === String(demandaId)) || _ativo;
      if (_demAndamento) _notificarSolicitanteWA(_demAndamento, "andamento", { texto }).catch(() => {});
      await _carregarAndamentos(demandaId, _ativo);
    } catch(e) {
      console.error("[andamentos] registrar:", e);
      if (typeof T === "function") T("Erro ao registrar", e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Registrar"; }
    }
  };

  /* ── Dados financeiros: renderização no detalhe ─────── */

  function _renderFinancialData(dem) {
    const sub    = dem.subcategoria || "";
    const _isFin = sub === "Solicitação de pagamento" || sub === "Reembolso";
    const fd     = (dem.financial_data && typeof dem.financial_data === "object") ? dem.financial_data : {};
    if (!_isFin && Object.keys(fd).length === 0) return "";

    const fmtVal = v => v ? `R$ ${parseFloat(v).toLocaleString("pt-BR", { minimumFractionDigits:2, maximumFractionDigits:2 })}` : "—";

    const kv = (lbl, val, span = 1) => `
      <div style="grid-column:span ${span}">
        <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">${lbl}</div>
        <div style="font-size:12.5px;color:var(--tx1);font-weight:500;line-height:1.4;word-break:break-word">${val || "—"}</div>
      </div>`;

    const fmtAnexoBtn = (meta, rotulo) => {
      if (!meta?.storage_path) return null;
      const pathEnc = escapeHtmlAttr(meta.storage_path);
      return `<button onclick="demAbrirAnexo('${pathEnc}')" style="padding:4px 14px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--blue);font-size:11.5px;cursor:pointer;font-family:var(--ff)">📎 ${escapeHtml(meta.file_name || rotulo)}</button>`;
    };

    const demId = dem.id || dem._row;
    let html = "";

    if (sub === "Solicitação de pagamento") {
      // Linha 1: campos curtos — Tipo | Valor | Vencimento | Forma de Pagamento
      html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px 16px">
        ${kv("Tipo", fd.tipo || "Pagamento")}
        ${kv("Valor", fmtVal(fd.valor))}
        ${kv("Vencimento", fmtD(fd.data_vencimento))}
        ${kv("Forma de Pagamento", fd.forma_pagamento)}
      </div>`;

      // Linha 2: Beneficiário | CPF/CNPJ | Centro de Custo
      if (fd.beneficiario || fd.cpf_cnpj || fd.centro_custo) {
        html += `<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px 16px;margin-top:10px">
          ${kv("Beneficiário / Favorecido", fd.beneficiario)}
          ${kv("CPF / CNPJ", fd.cpf_cnpj)}
          ${kv("Centro de Custo", fd.centro_custo)}
        </div>`;
      }

      // Linha 3: dados bancários (se houver)
      const temPix   = fd.chave_pix;
      const temBanco = fd.banco;
      if (temPix || temBanco) {
        const bancoStr = [fd.banco, fd.agencia && `Ag. ${fd.agencia}`, fd.conta && `Cc. ${fd.conta}`].filter(Boolean).join(" · ");
        html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;margin-top:10px">
          ${temPix   ? kv("Chave PIX", `<span style="font-family:monospace;font-size:12px">${escapeHtml(fd.chave_pix)}</span>`) : "<div></div>"}
          ${temBanco ? kv("Banco / Agência / Conta", escapeHtml(bancoStr)) : "<div></div>"}
        </div>`;
      }

      // Observações (texto longo — largura total)
      if (fd.obs) {
        html += `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd1)">
          <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Observações</div>
          <div style="font-size:12px;color:var(--tx1);line-height:1.7">${escapeHtml(fd.obs)}</div>
        </div>`;
      }

      // Anexos (boleto, notas fiscais)
      const anexoBoleto = fmtAnexoBtn(fd.boleto, "Boleto");
      const anexoNF     = fmtAnexoBtn(fd.nota_fiscal, "Nota Fiscal");
      const anexosNFs   = Array.isArray(fd.notas_fiscais) ? fd.notas_fiscais.map((nf, i) => {
        const lbl = `NF ${i+1}${nf.obs?" — "+nf.obs:""}${nf.valor?" · R$ "+parseFloat(nf.valor).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}):""}`;
        return fmtAnexoBtn(nf, lbl);
      }).filter(Boolean) : [];
      const todosAnexos = [anexoBoleto, anexoNF, ...anexosNFs].filter(Boolean);
      if (todosAnexos.length) {
        html += `<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">${todosAnexos.join("")}</div>`;
      }

    } else if (sub === "Reembolso") {
      // Linha 1: Reembolsado | Valor | Forma de Pagamento
      html += `<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px 16px">
        ${kv("Reembolsado", fd.reimb_nome)}
        ${kv("Valor", fmtVal(fd.valor))}
        ${kv("Forma de Pagamento", fd.forma_pagamento)}
      </div>`;

      // Linha 2: campos opcionais
      if (fd.motivo || fd.ministerio || fd.pastor_ciente || fd.chave_pix) {
        html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px 16px;margin-top:10px">
          ${fd.motivo       ? kv("Motivo",              fd.motivo,        2) : ""}
          ${fd.ministerio   ? kv("Ministério",           fd.ministerio,    1) : ""}
          ${fd.chave_pix    ? kv("Chave PIX",            `<span style="font-family:monospace;font-size:12px">${escapeHtml(fd.chave_pix)}</span>`, 1) : ""}
          ${fd.pastor_ciente? kv("Pastor / Aprovador",  fd.pastor_ciente, 2) : ""}
        </div>`;
      }

      if (fd.obs) {
        html += `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd1)">
          <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Observações</div>
          <div style="font-size:12px;color:var(--tx1);line-height:1.7">${escapeHtml(fd.obs)}</div>
        </div>`;
      }

      const anexoComp = fmtAnexoBtn(fd.nota_fiscal, "Comprovante");
      if (anexoComp) html += `<div style="margin-top:10px">${anexoComp}</div>`;
    }

    if (!html) return "";

    const btnNota   = `<button onclick="demAnexarDoc('${demId}','nota_fiscal')" style="padding:4px 12px;border-radius:6px;border:1px solid var(--bd2);background:none;color:var(--teal);font-size:11px;cursor:pointer;font-family:var(--ff)">+ Nota Fiscal</button>`;
    const btnBoleto = sub === "Solicitação de pagamento" ? `<button onclick="demAnexarDoc('${demId}','boleto')" style="padding:4px 12px;border-radius:6px;border:1px solid var(--bd2);background:none;color:var(--teal);font-size:11px;cursor:pointer;font-family:var(--ff)">+ Boleto</button>` : "";
    const btnComp   = sub === "Reembolso" ? `<button onclick="demAnexarDoc('${demId}','comprovante')" style="padding:4px 12px;border-radius:6px;border:1px solid var(--bd2);background:none;color:var(--teal);font-size:11px;cursor:pointer;font-family:var(--ff)">+ Comprovante</button>` : "";

    return `
      <div class="card" style="margin-top:0;border:1px solid rgba(61,160,85,.3);background:rgba(61,160,85,.03)">
        <div class="ctit" style="color:var(--gr)">💰 Dados Financeiros</div>
        <div style="margin-top:10px">${html}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid rgba(61,160,85,.15)">${btnNota}${btnBoleto}${btnComp}</div>
        <div id="dem-anx-pub-${demId}"></div>
      </div>`;
  }

  async function _carregarAnexosDemanda(demId) {
    const placeholder = document.getElementById(`dem-anx-pub-${demId}`);
    if (!placeholder) return;
    try {
      const sb = _sbClient();
      const { data } = await sb
        .from("financeiro_anexos")
        .select("*")
        .eq("demanda_id", demId)
        .is("solicitacao_id", null)
        .is("deleted_at", null);
      if (!data || data.length === 0) { placeholder.innerHTML = ""; return; }
      const TIPO_LABEL = { nota_fiscal: "Nota Fiscal", boleto: "Boleto", comprovante: "Comprovante", foto_facial: "Foto Facial" };
      placeholder.innerHTML = `
        <div style="border-top:1px solid var(--bd1);margin-top:10px;padding-top:10px">
          <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Anexos enviados</div>
          ${data.map(a => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <button onclick="demAbrirAnexo('${escapeHtmlAttr(a.storage_path)}')" style="padding:4px 14px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--blue);font-size:11.5px;cursor:pointer;font-family:var(--ff)">📎 ${escapeHtml(a.nome_original || a.tipo_arquivo || "Arquivo")}</button>
              ${a.tipo_arquivo ? `<span style="font-size:10.5px;color:var(--tx3)">${TIPO_LABEL[a.tipo_arquivo] || a.tipo_arquivo}</span>` : ""}
              <button onclick="demExcluirAnexo('${escapeHtmlAttr(a.id)}','${escapeHtmlAttr(demId)}')" style="background:none;border:none;color:var(--rose);cursor:pointer;font-size:16px;line-height:1;padding:0 2px;opacity:.7" title="Excluir">×</button>
            </div>`).join("")}
        </div>`;
    } catch(_) {}
  }

  function _temFinancialData(dem) {
    const fd = dem?.financial_data;
    return !!(fd && typeof fd === "object" && Object.keys(fd).length > 0);
  }

  function _podeAprovarPagamento() {
    try {
      if (typeof USUARIO_ATUAL !== "undefined" && USUARIO_ATUAL?.perfil === "ADMINISTRADOR_GERAL") return true;
      const nivel = (typeof permissoesUsuario !== "undefined" ? permissoesUsuario?.FINANCEIRO : null) || "SEM_ACESSO";
      return nivel === "EDICAO" || nivel === "COMPLETO";
    } catch(_) { return false; }
  }

  function _detectarTipoPix(chave) {
    const raw = String(chave || "").trim();
    const num = raw.replace(/\D/g, "");
    if (!raw) return null;
    if (raw.includes("@")) return "email";
    if (/^\d{11}$/.test(num)) return "cpf";
    if (/^\d{14}$/.test(num)) return "cnpj";
    if (/^\+?\d{10,13}$/.test(raw.replace(/\s/g, ""))) return "telefone";
    return "evp";
  }

  function _tipoOperacaoFinanceira(forma) {
    const FORMA_PARA_TIPO = {
      "Pix": "pix",
      "PIX": "pix",
      "Transferência": "transferencia",
      "Transferencia": "transferencia",
      "Ted": "transferencia",
      "TED": "transferencia",
      "Boleto": "boleto",
      "Tributo": "tributo",
    };
    return FORMA_PARA_TIPO[forma] || null;
  }

  function _podeMostrarAprovarPagamento(dem) {
    return dem?.area === "Financeiro"
      && _temFinancialData(dem)
      && _podeAprovarPagamento()
      && !_STATUS_FECHADO.includes(_toDb(dem.status)) && _toLabel(dem.status) !== "Aguardando Pagamento";
  }

  window.demAprovarParaPagamento = async function(demandaId) {
    if (!_podeAprovarPagamento()) {
      if (typeof T === "function") T("Acesso negado", "Você não tem permissão para aprovar pagamento.");
      return;
    }
    if (!_cache.length) await _load();
    const demanda = _cache.find(r => String(r.id || r._row) === String(demandaId));
    if (!demanda) {
      if (typeof T === "function") T("Erro", "Demanda não encontrada.");
      return;
    }
    const fd = demanda.financial_data;
    if (!_temFinancialData(demanda)) {
      if (typeof T === "function") T("Sem dados financeiros", "Esta demanda não possui dados financeiros para pagamento.");
      return;
    }

    const btn = document.querySelector(`[data-dem-aprovar-pag="${demandaId}"]`);
    const txt = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "Criando solicitação..."; }

    try {
      const sb = _sbClient();
      if (!sb) throw new Error("Supabase não disponível.");

      const { data: existente, error: dupError } = await sb
        .from("financeiro_solicitacoes")
        .select("id")
        .eq("demanda_id", demandaId)
        .is("deleted_at", null)
        .limit(1);
      if (dupError) throw dupError;
      if (existente?.length) {
        if (typeof T === "function") T("Solicitação já existe", "Esta demanda já foi enviada para Contas a Pagar.");
        return;
      }

      const chavePix = fd.chave_pix || fd.reimb_pix || null;
      const formaPgto = fd.forma_pagamento || (chavePix ? "Pix" : null);

      if (!formaPgto) {
        if (typeof T === "function") T("Dados incompletos", "A demanda não possui forma de pagamento definida. Edite os dados financeiros antes de aprovar.");
        if (btn) { btn.disabled = false; btn.textContent = txt; }
        return;
      }

      const payload = {
        fornecedor: fd.beneficiario || fd.reimb_nome || demanda.solicitante || "—",
        valor: Number(fd.valor || 0),
        forma_pagamento: formaPgto,
        finalidade: demanda.titulo || "",
        categoria: "Financeiro",
        solicitante: demanda.solicitante || "",
        vencimento: fd.data_vencimento || null,
        observacoes: fd.obs || "",
        status: "pendente",
        demanda_id: demanda.id || demanda._row,
        tipo_operacao: _tipoOperacaoFinanceira(formaPgto),
        favorecido_nome: fd.beneficiario || fd.reimb_nome || null,
        favorecido_cpf_cnpj: String(fd.cpf_cnpj || "").replace(/\D/g, "") || null,
        favorecido_banco: fd.banco || null,
        favorecido_agencia: fd.agencia || null,
        favorecido_conta: fd.conta || null,
        favorecido_pix_chave: chavePix,
        favorecido_pix_tipo: _detectarTipoPix(chavePix),
      };

      const { data: criada, error: insertError } = await sb
        .from("financeiro_solicitacoes")
        .insert(payload)
        .select("id")
        .single();
      if (insertError) throw insertError;

      await apiWrite("update", "DEMANDAS", {
        _row: demandaId,
        status: "AGUARDANDO_PAGAMENTO",
        prioridade: demanda.prioridade || "Média",
      });

      const novoStatus = "Aguardando Pagamento";
      const idx = _cache.findIndex(r => String(r.id || r._row) === String(demandaId));
      if (idx >= 0) Object.assign(_cache[idx], { status: novoStatus });
      if (_ativo && String(_ativo.id || _ativo._row) === String(demandaId)) {
        Object.assign(_ativo, { status: novoStatus });
        _notificarSolicitanteWA(_ativo, "status", { status: novoStatus }).catch(() => {});
      }

      await _registrarAndamentoAuto(
        demandaId,
        `Aprovado para pagamento. Solicitação financeira criada (ID: ${criada?.id || "—"}).`,
        novoStatus
      );

      if (typeof T === "function") T("✅ Enviado para pagamento", "A solicitação já aparece em Contas a Pagar/CNAB.");
      if (_ativo && String(_ativo.id || _ativo._row) === String(demandaId)) _renderDetalhe(_ativo);
      _atualizarBadge();

      /* Notifica Tesouraria por e-mail (não-bloqueante) */
      _notificarTesouraria(demandaId).then(res => {
        if (res?.ok) {
          _registrarAndamentoAuto(
            demandaId,
            `E-mail de notificação enviado para a Tesouraria (${res.destinatarios || 0} destinatário${res.destinatarios !== 1 ? "s" : ""}).`,
            novoStatus
          );
        } else if (res?.status && res.status !== "duplicado") {
          _registrarAndamentoAuto(
            demandaId,
            `Tentativa de notificação por e-mail: ${res.mensagem || res.error || res.status}.`,
            novoStatus
          );
        }
      }).catch(e => console.warn("_notificarTesouraria:", e.message));

    } catch(e) {
      if (typeof T === "function") T("Erro ao aprovar", e.message || "Tente novamente.");
      console.error("demAprovarParaPagamento:", e);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = txt; }
    }
  };

  /* ── Notificação e-mail Tesouraria ──────────────────── */

  async function _notificarTesouraria(demandaId, forceResend = false) {
    const url = (typeof SUPABASE_URL !== "undefined" && SUPABASE_URL)
      ? SUPABASE_URL.trim().replace(/\/$/, "") + "/functions/v1/email-send"
      : null;
    if (!url) return { ok: false, status: "nao_configurado" };

    let jwt = null;
    if (typeof sipenToken === "function") {
      jwt = sipenToken();
      if (jwt === (typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "")) jwt = null;
    }
    if (!jwt) {
      try {
        const raw = localStorage.getItem("sipen_auth_session");
        jwt = raw ? (JSON.parse(raw)?.access_token || null) : null;
      } catch (_) { /* ignore */ }
    }
    if (!jwt) return { ok: false, status: "nao_autenticado" };

    try {
      const res = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${jwt}` },
        body: JSON.stringify({
          demanda_id:      String(demandaId),
          idempotency_key: `demanda-aprovacao-${demandaId}`,
          force_resend:    forceResend,
        }),
      });
      return await res.json();
    } catch (e) {
      console.error("[email-send] rede:", e.message);
      return { ok: false, status: "erro_rede", error: e.message };
    }
  }

  window.demReenviarEmail = async function(demandaId) {
    const btn = document.querySelector(`[data-dem-reenviar="${demandaId}"]`);
    const txt = btn?.textContent || "";
    if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }
    try {
      const res = await _notificarTesouraria(demandaId, true);
      if (res?.ok) {
        if (typeof T === "function") T("✅ E-mail enviado", `Notificação enviada para ${res.destinatarios || 1} membro(s) da Tesouraria.`);
        const demanda = _cache.find(r => String(r.id||r._row) === String(demandaId));
        const status  = demanda ? _toLabel(demanda.status) : "Aguardando Pagamento";
        _registrarAndamentoAuto(demandaId, `E-mail de notificação reenviado para a Tesouraria.`, status);
      } else if (res?.status === "sem_destinatarios") {
        if (typeof T === "function") T("Sem destinatários", res.mensagem || "Nenhum membro da Tesouraria com e-mail cadastrado.");
      } else if (res?.status === "nao_configurado") {
        if (typeof T === "function") T("Serviço não configurado", "O serviço de e-mail não está ativo. Contate o administrador.");
      } else {
        if (typeof T === "function") T("Erro ao enviar e-mail", res?.error || res?.mensagem || "Tente novamente.");
      }
    } catch (e) {
      if (typeof T === "function") T("Erro ao enviar e-mail", e.message || "Tente novamente.");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = txt; }
    }
  };

  /* ── Detalhe individual ─────────────────────────────── */

  window.demAbrirDetalhe = async function(id, origem) {
    _origemView = origem || _origemView || "dem-todas";
    if (!_cache.length) await _load();
    const dem = _cache.find(r => String(r.id||r._row) === String(id));
    if (!dem) {
      if (typeof T === "function") T("Erro","Demanda não encontrada");
      return;
    }
    _ativo = dem;
    if (typeof window.go === "function") await window.go("dem-detalhe");
    _renderDetalhe(dem);
  };

  function _renderDetalhe(dem) {
    const el = document.getElementById("v-dem-detalhe");
    if (!el) return;
    const id = dem.id || dem._row;
    const origem = _origemView;
    const mostrarAprovarPagamento = _podeMostrarAprovarPagamento(dem);
    const detailRows = [
      ["Categoria",     `<span style="color:${catCor(dem.area)};font-weight:600">${catIcon(dem.area)} ${escapeHtml(dem.area)||"—"}</span>`],
      ["Subcategoria",  escapeHtml(dem.subcategoria)||"—"],
      dem.local ? ["Localização", escapeHtml(dem.local)] : null,
      ["Solicitante",   `${nomePropio(dem.solicitante || dem.solicitante_txt || dem.nome_solicitante_externo) || "—"}${pillOrigem(dem.origem)}${dem.telefone_solicitante ? `<br><span style="color:var(--tx3);font-size:11px">📞 ${escapeHtml(dem.telefone_solicitante)}</span>` : ""}`],
      ["Responsável",   (() => {
        const nome = nomePropio(dem.responsavel || dem.responsavel_txt) || "—";
        if (dem.responsavel_tipo === "fornecedor") {
          return `${escapeHtml(nome)} <span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:8px;background:rgba(42,181,192,.12);color:var(--teal);vertical-align:middle;margin-left:4px">Fornecedor</span>`;
        }
        return escapeHtml(nome);
      })()],
      ["Abertura",      fmtDT(dem.criado_em) || fmtD(dem.data_abertura)],
    ].filter(Boolean);
    if (dem.numero_chamado) {
      detailRows.unshift(["N° do chamado", `<span style="font-weight:700;color:var(--acc,#4a9cf5);letter-spacing:.04em">${escapeHtml(dem.numero_chamado)}</span>`]);
    }
    if (_temFinancialData(dem) && _toLabel(dem.status) === "Aguardando Pagamento") {
      detailRows.push([
        "Solicitação Financeira",
        `<span style="color:var(--amber);font-weight:600">Aguardando pagamento via CNAB / Contas a Pagar</span>
         <button class="tbt" style="margin-left:8px;padding:3px 8px;font-size:10.5px" onclick="go('fin-pagar')">Abrir Contas a Pagar</button>`
      ]);
    }

    const _demFd       = (dem.financial_data && typeof dem.financial_data === "object") ? dem.financial_data : {};
    const _isFinSolPag = dem.area === "Financeiro" && dem.subcategoria === "Solicitação de pagamento";
    const _isFinReemb  = dem.area === "Financeiro" && dem.subcategoria === "Reembolso";
    el.innerHTML = `
      <div class="hero">
        <div class="hero-ic" style="background:${catCor(dem.area)}18;border-color:${catCor(dem.area)}44;font-size:22px">${catIcon(dem.area)}</div>
        <div>
          <div class="hero-lbl">Demanda · ${fmtDT(dem.criado_em) || fmtD(dem.data_abertura)}</div>
          <div class="hero-ttl">${escapeHtml(dem.titulo) || "Sem título"}</div>
          <div class="hero-dsc" style="display:flex;gap:8px;align-items:center;margin-top:4px">
            ${pillStatus(dem.status)}
            <span style="color:var(--tx3);font-size:11px">${catIcon(dem.area)} ${dem.area||"—"} → ${dem.subcategoria||"—"}</span>
          </div>
        </div>
        <div class="hero-act" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button class="tbt" onclick="window.go('${origem}')">← Voltar</button>
          ${mostrarAprovarPagamento ? `
          <button class="tbt" data-dem-aprovar-pag="${escapeHtmlAttr(id)}" style="color:var(--gr);border-color:rgba(58,170,92,.3)" onclick="demAprovarParaPagamento('${escapeHtmlAttr(id)}')">
            💰 Aprovar para Pagamento
          </button>` : ""}
          ${_podeAprovarPagamento() && _toLabel(dem.status) === "Aguardando Pagamento" ? `
          <button class="tbt" data-dem-reenviar="${escapeHtmlAttr(id)}" style="color:var(--blue,#2563eb);border-color:rgba(37,99,235,.3)" onclick="demReenviarEmail('${escapeHtmlAttr(id)}')">
            ✉ Reenviar notificação
          </button>` : ""}
          ${dem.area === "Conselho" ? `
          <button class="tbt" style="color:var(--sky);border-color:rgba(74,156,245,.3)"
            onclick="pautasIncluirNaPauta('${escapeHtmlAttr(id)}','${escapeHtmlAttr(dem.titulo||"")}')">
            ⚖️ Adicionar à Pauta
          </button>` : ""}
          <button class="tbt" onclick="demDuplicar('${id}')">⧉ Duplicar</button>
          <button class="tbt" style="color:var(--rose);border-color:rgba(224,85,85,.3)" onclick="demExcluirDemanda('${id}')">🗑 Excluir</button>
        </div>
      </div>
      <div class="ct">
        <div class="g2" style="align-items:start">
          <div class="card">
            <div class="ctit">Detalhes</div>
            <table style="width:100%;font-size:11.5px;border-collapse:collapse">
              ${detailRows.map(([lbl, val], i) => `
                <tr style="${i>0?"border-top:1px solid var(--bd1)":""}">
                  <td style="color:var(--tx3);padding:7px 0;width:40%">${lbl}</td>
                  <td style="color:var(--tx1)">${val}</td>
                </tr>`).join("")}
            </table>
            ${dem.descricao ? `
              <div class="ctit" style="margin-top:14px">Descrição</div>
              <div id="dem-desc-display" style="font-size:12px;color:var(--tx1);line-height:1.7;margin-top:6px;max-height:96px;overflow:hidden;position:relative">
                ${escapeHtml(dem.descricao)}
                <div style="position:absolute;bottom:0;left:0;right:0;height:28px;background:linear-gradient(transparent,var(--bg-card))"></div>
              </div>
              <button onclick="window._demDescExpand(this)" style="font-size:11px;color:var(--blue,#4a9cf5);background:none;border:none;padding:4px 0 0;cursor:pointer;font-family:var(--ff)">Ver mais ▾</button>` : ""}
          </div>
          <div class="card">
            <div class="ctit">Alterar Status</div>
            <div style="font-size:11px;color:var(--tx3);margin-bottom:10px">Status atual: ${pillStatus(dem.status)}</div>
            ${dem.agenda_ref_id ? `
            <div style="padding:12px 14px;border-radius:8px;border:1px solid rgba(74,156,245,.25);background:rgba(74,156,245,.06);font-size:11.5px;color:var(--tx2);line-height:1.6">
              Este é um agendamento vinculado à Agenda.<br>
              <strong style="color:var(--tx1)">O status é gerenciado exclusivamente por Gestão de Agenda → Aprovações Pendentes.</strong>
            </div>` : `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px" id="dem-status-btns-${id}">
              ${(dem.area === "Financeiro"
                  ? [["Aberta","Aberta"],["Em Análise","Em Análise"],["Em Andamento","Aguardando Aprovação"],["Aguardando Pagamento","Aguardando Pagamento"],["Pago","Pago"],["Cancelada","Cancelada"]]
                  : [["Aberta","Aberta"],["Em Análise","Em Análise"],["Em Andamento","Aguardando Aprovação"],["Concluída","Concluída"],["Cancelada","Cancelada"]]
                ).map(([st, label]) => `
                <button
                  data-demid="${id}"
                  data-status="${st}"
                  onclick="demAtualizarStatus(this.dataset.demid, this.dataset.status)"
                  style="text-align:left;padding:7px 12px;border-radius:6px;border:1px solid ${dem.status===st?"var(--gr)":"var(--bd2)"};background:${dem.status===st?"rgba(58,170,92,.1)":"var(--bg-card)"};color:${dem.status===st?"var(--gr)":"var(--tx1)"};font-size:11.5px;font-weight:${dem.status===st?"700":"400"};cursor:pointer;transition:all .15s"
                  onmouseover="this.style.background=this.dataset.status==='${dem.status}'?'rgba(58,170,92,.1)':'var(--bg-hover)'"
                  onmouseout="this.style.background=this.dataset.status==='${dem.status}'?'rgba(58,170,92,.1)':'var(--bg-card)'">
                  ${dem.status===st?"✓ ":"○ "} ${label}
                </button>`).join("")}
            </div>`}
          </div>
        </div>
        ${_renderFinancialData(dem)}
        <div class="card" style="margin-top:0">
          <style>
            .dem-fl{font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:2px}
            .dem-fi{width:100%;padding:5px 8px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;box-sizing:border-box;font-family:var(--ff)}
            .dem-fi:focus{outline:none;border-color:var(--gr)}
          </style>
          ${dem.area === "Financeiro" ? `<input type="hidden" id="dem-edit-local" value=""><input type="hidden" id="dem-edit-venc" value="">` : ""}
          ${(!_isFinSolPag && dem.area === "Financeiro") ? `<input type="hidden" id="dem-edit-data-venc" value="">` : ""}
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <span style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em">Editar</span>
            <button onclick="demSalvarEdicao('${id}')" style="padding:4px 14px;border-radius:6px;border:none;background:var(--gr);color:#fff;font-size:12px;font-weight:600;cursor:pointer">Salvar alterações</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:6px 8px">

            <div style="grid-column:span 8">
              <label class="dem-fl">Título *</label>
              <input id="dem-edit-titulo" type="text" value="${escapeHtmlAttr(dem.titulo || '')}" class="dem-fi">
            </div>
            <div style="grid-column:span 4;position:relative">
              <label class="dem-fl">Solicitante</label>
              <input id="dem-edit-sol-nome" type="text" value="${escapeHtmlAttr(dem.solicitante||dem.solicitante_txt||"")}"
                placeholder="Buscar por nome..." autocomplete="off" class="dem-fi"
                oninput="document.getElementById('dem-edit-sol-id').value='';window._demSolBuscar(this.value)"
                onblur="setTimeout(()=>window._demSolFecharDd(),200)">
              <input id="dem-edit-sol-id" type="hidden" value="${escapeHtmlAttr(String(dem.solicitante_id||""))}">
              <div id="dem-edit-sol-dd" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--bg-card);border:1px solid var(--bd2);border-radius:0 0 6px 6px;z-index:100;max-height:180px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.15)"></div>
            </div>

            ${dem.area !== "Financeiro" ? `
            <div style="grid-column:span 12">
              <label class="dem-fl">Localização / Sala</label>
              <select id="dem-edit-local" data-valor-atual="${dem.local_id || dem.local || ''}" class="dem-fi">
                <option value="">Carregando espaços…</option>
              </select>
            </div>
            <input type="hidden" id="dem-edit-venc" value="">` : ""}

            ${_isFinSolPag ? `
            <div style="grid-column:span 2">
              <label class="dem-fl">Tipo</label>
              <select id="dem-edit-tipo" class="dem-fi">
                ${["Pagamento","Reembolso","Adiantamento"].map(t => `<option${t===(_demFd.tipo||"Pagamento")?" selected":""}>${t}</option>`).join("")}
              </select>
            </div>
            <div style="grid-column:span 2">
              <label class="dem-fl">Valor (R$)</label>
              <input id="dem-edit-valor" type="text" inputmode="numeric" class="dem-fi"
                value="${_demFd.valor ? parseFloat(_demFd.valor).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : ""}"
                placeholder="0,00" oninput="window._demMascaraValor(this)">
            </div>
            <div style="grid-column:span 2">
              <label class="dem-fl">Vencimento</label>
              <input id="dem-edit-data-venc" type="date" value="${_demFd.data_vencimento||""}" class="dem-fi">
            </div>
            <div style="grid-column:span 3">
              <label class="dem-fl">Forma de Pagamento</label>
              <select id="dem-edit-forma-pgto" class="dem-fi">
                <option value="">Selecione</option>
                ${["PIX","Boleto","Cartão de Crédito","Cartão de Débito","Dinheiro","Transferência Bancária","Débito em Conta","Cheque","Reembolso","Outro"].map(f => `<option${f===(_demFd.forma_pagamento||"")?" selected":""}>${f}</option>`).join("")}
              </select>
            </div>
            <div style="grid-column:span 3">
              <label class="dem-fl">Beneficiário</label>
              <input id="dem-edit-beneficiario" type="text" value="${escapeHtmlAttr(_demFd.beneficiario||"")}" placeholder="Nome completo" class="dem-fi">
            </div>` : ""}

            ${(!_isFinSolPag && dem.area === "Financeiro") ? `
            <div style="grid-column:span 4">
              <label class="dem-fl">Reembolsado</label>
              <input id="dem-edit-reimb-nome" type="text" value="${escapeHtmlAttr(_demFd.reimb_nome||"")}" placeholder="Nome de quem será reembolsado" class="dem-fi">
            </div>
            <div style="grid-column:span 2">
              <label class="dem-fl">Valor (R$)</label>
              <input id="dem-edit-valor" type="text" inputmode="numeric" class="dem-fi"
                value="${_demFd.valor ? parseFloat(_demFd.valor).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : ""}"
                placeholder="0,00" oninput="window._demMascaraValor(this)">
            </div>
            <div style="grid-column:span 3">
              <label class="dem-fl">Forma de Pagamento</label>
              <select id="dem-edit-forma-pgto" class="dem-fi">
                <option value="">Selecione</option>
                ${["PIX","Boleto","Cartão de Crédito","Cartão de Débito","Dinheiro","Transferência Bancária","Débito em Conta","Cheque","Reembolso","Outro"].map(f => `<option${f===(_demFd.forma_pagamento||"")?" selected":""}>${f}</option>`).join("")}
              </select>
            </div>
            <div style="grid-column:span 3"></div>` : ""}

            <div style="grid-column:span 12;display:flex;align-items:center;gap:6px" id="dem-encaminhamento-bloco">
              <span class="dem-fl" style="margin:0;white-space:nowrap">Para</span>
              <button id="dem-enc-btn-dept" onclick="window._demEncTipo('departamento')"
                style="padding:3px 10px;border-radius:5px;border:1px solid var(--gr);background:var(--gr);color:#fff;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0">Departamento</button>
              <button id="dem-enc-btn-forn" onclick="window._demEncTipo('fornecedor')"
                style="padding:3px 10px;border-radius:5px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:11px;cursor:pointer;white-space:nowrap;flex-shrink:0">Fornecedor</button>
              <input type="hidden" id="dem-enc-tipo" value="${escapeHtmlAttr(dem.responsavel_tipo || 'departamento')}">
              <input type="hidden" id="dem-enc-forn-id" value="${escapeHtmlAttr(String(dem.fornecedor_id || ''))}">
              <div id="dem-enc-dept-row" style="flex:1;min-width:0">
                <select id="dem-enc-dept-nome" class="dem-fi" style="margin:0"
                  data-current="${escapeHtmlAttr(dem.responsavel_tipo !== 'fornecedor' ? (dem.responsavel || dem.responsavel_txt || '') : '')}">
                  <option value="">Carregando departamentos…</option>
                </select>
              </div>
              <div id="dem-enc-forn-row" style="flex:1;min-width:0;display:none">
                <select id="dem-enc-forn-sel" class="dem-fi" style="margin:0">
                  <option value="">Carregando fornecedores…</option>
                </select>
              </div>
            </div>

            <div style="grid-column:span 12">
              <label class="dem-fl">Descrição</label>
              <textarea id="dem-edit-desc" rows="3"
                style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;resize:vertical;max-height:80px;box-sizing:border-box;font-family:var(--ff);overflow-y:auto;line-height:1.5">${escapeHtml(dem.descricao || '')}</textarea>
            </div>

            ${(dem.area === "Financeiro") ? `
            <div style="grid-column:span 12;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:12px;color:var(--tx2);white-space:nowrap;flex-shrink:0">
                <input type="checkbox" id="dem-edit-rec" onchange="window._demRecToggle(this.checked)"
                  ${(_demFd.recorrencia?.ativa) ? "checked" : ""}
                  style="width:13px;height:13px;cursor:pointer;accent-color:var(--gr)">
                Recorrente
              </label>
              <div id="dem-edit-rec-opts" style="display:${(_demFd.recorrencia?.ativa) ? "flex" : "none"};gap:6px;align-items:flex-end;flex-wrap:wrap">
                <div style="width:120px">
                  <label class="dem-fl">Freq.</label>
                  <select id="dem-edit-rec-freq" class="dem-fi">
                    ${["Semanal","Quinzenal","Mensal","Bimestral","Trimestral"].map(f => `<option${f===(_demFd.recorrencia?.freq||"Mensal")?" selected":""}>${f}</option>`).join("")}
                  </select>
                </div>
                <div style="width:140px">
                  <label class="dem-fl">Válido até</label>
                  <input id="dem-edit-rec-limite" type="date" value="${_demFd.recorrencia?.limite||""}" class="dem-fi">
                </div>
                ${_demFd.recorrencia?.geradas ? `<span style="font-size:11px;color:var(--tx3);align-self:center">${_demFd.recorrencia.geradas} ocorrências geradas</span>` : ""}
              </div>
            </div>` : ""}

          </div>
        </div>
        <div class="card" style="margin-top:0">
          <div class="ctit">Andamentos</div>
          ${_podeRegistrarAndamento(dem) ? `
          <div style="display:flex;gap:8px;margin-bottom:8px;align-items:flex-end">
            <textarea id="dem-and-txt-${id}" rows="2" placeholder="Escreva um andamento…"
              style="flex:1;padding:7px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;resize:vertical;max-height:80px;font-family:var(--ff);box-sizing:border-box"></textarea>
            <button data-and-btn="${id}" onclick="demRegistrarAndamento('${id}')"
              style="padding:8px 16px;border-radius:7px;border:none;background:var(--gr);color:#fff;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">
              Registrar
            </button>
          </div>` : ""}
          <div id="dem-and-list-${id}">
            <div style="color:var(--tx3);font-size:12px;padding:4px 0">Carregando…</div>
          </div>
        </div>
        <div class="card" style="margin-top:0">
          <div class="ctit" style="display:flex;align-items:center;justify-content:space-between">
            <span>WhatsApp</span>
            <button onclick="demNotificarResponsaveis('${id}')"
              style="font-size:11px;padding:4px 12px;border-radius:6px;border:1px solid rgba(58,170,92,.35);background:rgba(58,170,92,.08);color:var(--gr);cursor:pointer;font-weight:600">
              Notificar Responsáveis
            </button>
          </div>
          <div id="dem-wa-list-${id}">
            <div style="color:var(--tx3);font-size:12px;padding:4px 0">Carregando…</div>
          </div>
        </div>
      </div>`;
    _carregarAndamentos(id, dem);
    _carregarAnexosDemanda(id);
    _carregarWADemanda(id, dem);
    _popularSelectEspacos("dem-edit-local");
    // inicializar encaminhamento com tipo atual
    const tipoAtual = dem.responsavel_tipo || "departamento";
    window._demEncTipo(tipoAtual);
  }

  /* ── Atualizar status ───────────────────────────────── */

  window.demAtualizarStatus = async function(id, novoStatus) {
    if (!id || id === "undefined") {
      if (typeof T === "function") T("Erro", "ID da demanda inválido");
      return;
    }
    try {
      const dbPayload = { status: _toDb(novoStatus) };
      if (novoStatus === "Concluída" || novoStatus === "Pago") {
        dbPayload.data_conclusao = new Date().toISOString().split("T")[0];
      }
      await apiWrite("update", "DEMANDAS", { _row: id, ...dbPayload });
      if (typeof T === "function") T("✅ Status atualizado", novoStatus);


      // Cache armazena labels — não usar o dbPayload diretamente
      const cacheUpd = { status: novoStatus };
      if (dbPayload.data_conclusao) cacheUpd.data_conclusao = dbPayload.data_conclusao;

      const idx = _cache.findIndex(r => String(r.id||r._row) === String(id));
      if (idx >= 0) Object.assign(_cache[idx], cacheUpd);

      if (_ativo && String(_ativo.id||_ativo._row) === String(id)) {
        Object.assign(_ativo, cacheUpd);
        await _registrarAndamentoAuto(id, `Status alterado para "${novoStatus}"`, novoStatus);
        _notificarSolicitanteWA(_ativo, "status", { status: novoStatus }).catch(() => {});
        _renderDetalhe(_ativo);
      }
      _atualizarBadge();
    } catch(e) {
      if (typeof T === "function") T("Erro ao atualizar", e.message || "Tente novamente");
      console.error("demAtualizarStatus:", e);
    }
  };


  /* ── Salvar edição ──────────────────────────────────── */

  window.demSalvarEdicao = async function(id) {
    const titulo          = document.getElementById("dem-edit-titulo")?.value?.trim();
    const desc            = document.getElementById("dem-edit-desc")?.value?.trim();
    const localEditEl     = document.getElementById("dem-edit-local");
    const local_id        = localEditEl?.value?.trim() || null;
    const local           = localEditEl?.selectedOptions?.[0]?.dataset?.nome || null;
    const prioEl          = document.getElementById("dem-edit-prio");
    const venc            = document.getElementById("dem-edit-venc")?.value || null;
    const _isFinEdicao    = _ativo?.area === "Financeiro";

    // Encaminhamento
    const encTipo   = document.getElementById("dem-enc-tipo")?.value || "departamento";
    const encFornSel = document.getElementById("dem-enc-forn-sel");
    const encFornId = encTipo === "fornecedor" ? (encFornSel?.value || null) : null;
    const encFornNome = encTipo === "fornecedor"
      ? encFornSel?.selectedOptions[0]?.text || ""
      : (document.getElementById("dem-enc-dept-nome")?.value?.trim() || "");
    const encFornContato = encTipo === "fornecedor"
      ? (encFornSel?.selectedOptions[0]?.dataset?.contato || "")
      : "";

    if (!titulo) {
      if (typeof T === "function") T("Campo obrigatório", "Informe o título");
      return;
    }
    if (encTipo === "fornecedor" && !encFornId) {
      if (typeof T === "function") T("Campo obrigatório", "Selecione o fornecedor");
      return;
    }

    try {
      const respAnterior = _ativo?.responsavel || _ativo?.responsavel_txt || "";
      const respNovo     = encTipo === "fornecedor" ? encFornNome : encFornNome;
      const mudouResp    = respNovo && respNovo !== respAnterior;

      const payload = {
        titulo,
        descricao:        desc || "",
        local,
        local_id,
        responsavel:      encFornNome || "",
        responsavel_txt:  encFornNome || "",
        responsavel_tipo: encTipo,
        data_conclusao:   venc,
      };
      if (prioEl && _podeEditarPrioridade()) payload.prioridade = prioEl.value;
      const solNome = document.getElementById("dem-edit-sol-nome")?.value?.trim();
      const solId   = document.getElementById("dem-edit-sol-id")?.value || null;
      if (solNome) {
        payload.solicitante    = solNome;
        payload.solicitante_id = solId || null;
      }
      if (_isFinEdicao) {
        const existFd  = (_ativo?.financial_data && typeof _ativo.financial_data === "object") ? _ativo.financial_data : {};
        const novoFd   = { ...existFd };
        const valorEl  = document.getElementById("dem-edit-valor");
        const formaEl  = document.getElementById("dem-edit-forma-pgto");
        const tipoEl   = document.getElementById("dem-edit-tipo");
        const benefEl  = document.getElementById("dem-edit-beneficiario");
        const reimbEl  = document.getElementById("dem-edit-reimb-nome");
        const dataVencEl = document.getElementById("dem-edit-data-venc");
        if (valorEl) {
          const raw = (valorEl.value || "").replace(/\./g, "").replace(",", ".");
          const v = parseFloat(raw);
          if (!isNaN(v) && v >= 0) novoFd.valor = v;
        }
        if (formaEl)    novoFd.forma_pagamento = formaEl.value;
        if (tipoEl)     novoFd.tipo = tipoEl.value;
        if (benefEl)    novoFd.beneficiario = benefEl.value.trim();
        if (reimbEl)    novoFd.reimb_nome = reimbEl.value.trim();
        if (dataVencEl) novoFd.data_vencimento = dataVencEl.value || null;

        // Recorrência
        const recEl   = document.getElementById("dem-edit-rec");
        const recFreq = document.getElementById("dem-edit-rec-freq")?.value || "Mensal";
        const recLim  = document.getElementById("dem-edit-rec-limite")?.value || "";
        const jaEraRec = !!existFd.recorrencia?.ativa;
        if (recEl?.checked && recLim) {
          novoFd.recorrencia = { ativa: true, freq: recFreq, limite: recLim, ...(jaEraRec ? { geradas: existFd.recorrencia.geradas } : {}) };
        } else if (!recEl?.checked) {
          delete novoFd.recorrencia;
        }

        payload.financial_data = novoFd;
      }
      await apiWrite("update", "DEMANDAS", { _row: id, ...payload });

      // Gerar ocorrências recorrentes (apenas na primeira ativação)
      if (_isFinEdicao) {
        const recEl   = document.getElementById("dem-edit-rec");
        const recFreq = document.getElementById("dem-edit-rec-freq")?.value || "Mensal";
        const recLim  = document.getElementById("dem-edit-rec-limite")?.value || "";
        const existFd = (_ativo?.financial_data && typeof _ativo.financial_data === "object") ? _ativo.financial_data : {};
        const jaEraRec = !!existFd.recorrencia?.ativa;
        if (recEl?.checked && recLim && !jaEraRec) {
          const demAtual = { ..._ativo, ...payload };
          const cópias = _gerarOcorrencias(demAtual, recFreq, recLim, String(id));
          if (cópias.length > 0) {
            const sb = typeof getSupabase === "function" ? getSupabase() : null;
            if (sb) {
              const { error } = await sb.from("demandas").insert(cópias);
              if (!error) {
                // Atualiza campo geradas na demanda original
                const fdAtual = { ...(payload.financial_data || existFd) };
                if (fdAtual.recorrencia) fdAtual.recorrencia.geradas = cópias.length;
                await apiWrite("update", "DEMANDAS", { _row: id, financial_data: fdAtual });
                if (typeof T === "function") T("Recorrência ativada", `${cópias.length} ocorrências geradas até ${recLim}`);
              } else {
                console.error("Recorrência:", error.message);
              }
            }
          }
          _invalidate();
        }
      }

      // Registrar andamento automático se responsável mudou
      if (mudouResp) {
        const sb = typeof getSupabase === "function" ? getSupabase() : null;
        const usuNome = typeof USUARIO_ATUAL !== "undefined" ? (USUARIO_ATUAL?.nome || "") : "";
        if (sb) {
          sb.from("demanda_andamentos").insert({
            demanda_id:    id,
            usuario_nome:  usuNome,
            texto:         `Responsável alterado: "${respAnterior || "—"}" → "${respNovo}"`,
            automatico:    true,
            tipo:          "troca_responsavel",
            resp_anterior: respAnterior || "",
            resp_novo:     respNovo,
          }).then(() => {}).catch(e => console.warn("andamento resp:", e.message));
        }

        // Notificar fornecedor via WhatsApp (automático)
        if (encTipo === "fornecedor" && encFornContato && typeof WA !== "undefined") {
          const tit = _ativo?.titulo || titulo || "";
          const desc2 = desc || _ativo?.descricao || "";
          WA.send({
            para:    encFornContato,
            nome:    encFornNome,
            mensagem:
              `🔧 *Nova solicitação de serviço — IPPenha*\n\n` +
              `*Assunto:* ${tit}\n` +
              `*Categoria:* ${_ativo?.area || ""}${_ativo?.subcategoria ? " / " + _ativo.subcategoria : ""}\n` +
              (desc2 ? `*Descrição:* ${desc2.slice(0, 200)}\n` : "") +
              `\nPor favor, confirme o recebimento e entre em contato para agendamento.\n` +
              `_SIPEN · IPPenha_`,
            modulo:  "DEMANDAS",
            chave:   `ENC_${id}_${Date.now()}`,
          }).catch(e => console.warn("WA fornecedor:", e.message));
        }
      }

      if (typeof T === "function") T("✅ Demanda atualizada!", mudouResp ? `Encaminhada para: ${respNovo}` : "");

      const idx = _cache.findIndex(r => String(r.id||r._row) === String(id));
      if (idx >= 0) Object.assign(_cache[idx], payload);
      if (_ativo && String(_ativo.id||_ativo._row) === String(id)) {
        Object.assign(_ativo, payload);
        _renderDetalhe(_ativo);
      }
      _atualizarBadge();
    } catch(e) {
      if (typeof T === "function") T("Erro ao atualizar", e.message || "Tente novamente");
      console.error("demSalvarEdicao:", e);
    }
  };

  /* ── Excluir demanda ────────────────────────────────── */

  window.demExcluirDemanda = async function(id) {
    if (!confirm("Confirmar exclusão desta demanda? Esta ação não pode ser desfeita.")) return;
    try {
      // Busca vínculo com agenda antes de deletar
      let agendaRefId = null;
      try {
        const refRes = await fetch(`${apiBaseUrl()}/rest/v1/demandas?id=eq.${id}&select=agenda_ref_id&limit=1`, { headers: apiHeaders() });
        const [dem] = await refRes.json();
        agendaRefId = dem?.agenda_ref_id || null;
      } catch(_) {}

      await apiWrite("delete", "DEMANDAS", { _row: id });

      // Cancela a agenda vinculada (se existir)
      if (agendaRefId) {
        fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${agendaRefId}`, {
          method: "PATCH",
          headers: { ...apiHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelado" }),
        }).catch(() => {});
      }

      if (typeof T === "function") T("Demanda excluída", "Registro removido com sucesso");
      _invalidate();
      _atualizarBadge();
      if (typeof window.go === "function") window.go(_origemView || "dem-todas");
    } catch(e) {
      if (typeof T === "function") T("Erro ao excluir", e.message || "Tente novamente");
      console.error("demExcluirDemanda:", e);
    }
  };

  /* ── Duplicar demanda ───────────────────────────────────── */
  window.demDuplicar = async function(id) {
    if (!confirm("Duplicar esta demanda? Uma nova será criada com os mesmos dados.")) return;
    const dem = _cache.find(x => x.id === id);
    if (!dem) return;
    const hoje = new Date().toISOString().split("T")[0];
    const payload = {
      area:             dem.area,
      subcategoria:     dem.subcategoria      || null,
      titulo:           (dem.titulo || "") + " (cópia)",
      descricao:        dem.descricao         || null,
      local:            dem.local             || null,
      local_id:         dem.local_id          || null,
      prioridade:       dem.prioridade        || "Média",
      status:           "ABERTA",
      solicitante:      dem.solicitante       || null,
      solicitante_id:   dem.solicitante_id    || null,
      created_by:       dem.solicitante_id    || null,
      responsavel:      dem.responsavel       || null,
      responsavel_tipo: dem.responsavel_tipo  || null,
      data_abertura:    hoje,
      data_conclusao:   dem.data_conclusao    || null,
      financial_data:   dem.financial_data    || null,
    };
    try {
      const result = await apiWrite("create", "DEMANDAS", payload);
      _invalidate();
      _atualizarBadge();
      const novaId = result?.id || result?.[0]?.id;
      if (novaId) {
        window.demAbrirDetalhe(novaId, _origemView || "dem-todas");
      } else {
        window.go(_origemView || "dem-todas");
      }
    } catch(e) {
      alert("Erro ao duplicar: " + e.message);
    }
  };

  /* ── Recorrência ────────────────────────────────────────── */

  window._demRecToggle = function(checked) {
    const el = document.getElementById("dem-edit-rec-opts");
    if (el) el.style.display = checked ? "flex" : "none";
  };

  window._demDescExpand = function(btn) {
    const el = document.getElementById("dem-desc-display");
    if (!el) return;
    const expanded = el.style.maxHeight === "none";
    el.style.maxHeight = expanded ? "96px" : "none";
    el.style.overflow  = expanded ? "hidden" : "visible";
    el.querySelector("div")?.remove();
    btn.textContent = expanded ? "Ver mais ▾" : "Ver menos ▴";
  };

  window._demMascaraValor = function(input) {
    let v = input.value.replace(/\D/g, "");
    if (!v) { input.value = ""; return; }
    v = (parseInt(v, 10) / 100).toFixed(2);
    input.value = v.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  function _avançarData(d, freq) {
    const next = new Date(d);
    switch (freq) {
      case "Semanal":    next.setDate(next.getDate() + 7);   break;
      case "Quinzenal":  next.setDate(next.getDate() + 15);  break;
      case "Bimestral":  next.setMonth(next.getMonth() + 2); break;
      case "Trimestral": next.setMonth(next.getMonth() + 3); break;
      default:           next.setMonth(next.getMonth() + 1); // Mensal
    }
    return next;
  }

  function _gerarOcorrencias(dem, freq, limite, origemId) {
    const limDate = new Date(limite + "T12:00:00");
    const cópias = [];
    let next = _avançarData(new Date(dem.data_abertura + "T12:00:00"), freq);
    const fdBase = { ...(dem.financial_data || {}) };
    delete fdBase.recorrencia;

    while (next <= limDate) {
      const dataStr = next.toISOString().split("T")[0];
      const mesRef  = next.toISOString().slice(0, 7);
      const [ano, mes] = mesRef.split("-");
      const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      const sufixo = `${meses[parseInt(mes,10)-1]}/${ano}`;
      cópias.push({
        area:             dem.area,
        subcategoria:     dem.subcategoria   || null,
        titulo:           `${dem.titulo} — ${sufixo}`,
        descricao:        dem.descricao      || null,
        local:            dem.local          || null,
        local_id:         dem.local_id       || null,
        prioridade:       dem.prioridade     || "Média",
        status:           "ABERTA",
        solicitante:      dem.solicitante    || null,
        solicitante_id:   dem.solicitante_id || null,
        created_by:       dem.solicitante_id || null,
        responsavel:      dem.responsavel    || null,
        responsavel_tipo: dem.responsavel_tipo || null,
        data_abertura:    dataStr,
        data_conclusao:   null,
        financial_data:   { ...fdBase, recorrencia: { ativa: true, freq, limite, origem_id: origemId, referencia: mesRef } },
      });
      next = _avançarData(next, freq);
    }
    return cópias;
  }

  /* ── Encaminhamento — toggle tipo e carga ───────────────── */

  let _fornecedoresCache = null;
  let _departamentosCache = null;

  window._demEncTipo = async function(tipo) {
    document.getElementById("dem-enc-tipo").value = tipo;

    const btnDept = document.getElementById("dem-enc-btn-dept");
    const btnForn = document.getElementById("dem-enc-btn-forn");
    const rowDept = document.getElementById("dem-enc-dept-row");
    const rowForn = document.getElementById("dem-enc-forn-row");

    if (tipo === "departamento") {
      btnDept.style.background = "var(--gr)"; btnDept.style.color = "#fff"; btnDept.style.borderColor = "var(--gr)";
      btnForn.style.background = "transparent"; btnForn.style.color = "var(--tx2)"; btnForn.style.borderColor = "var(--bd2)";
      rowDept.style.display = "block";
      rowForn.style.display = "none";
      await _demCarregarDepartamentos();
    } else {
      btnForn.style.background = "var(--gr)"; btnForn.style.color = "#fff"; btnForn.style.borderColor = "var(--gr)";
      btnDept.style.background = "transparent"; btnDept.style.color = "var(--tx2)"; btnDept.style.borderColor = "var(--bd2)";
      rowDept.style.display = "none";
      rowForn.style.display = "block";
      await _demCarregarFornecedores();
    }
  };

  async function _demCarregarDepartamentos() {
    const sel = document.getElementById("dem-enc-dept-nome");
    if (!sel) return;
    if (!_departamentosCache || !_departamentosCache.length) {
      try {
        const url  = (typeof SUPABASE_URL  !== "undefined" ? SUPABASE_URL  : "").replace(/\/$/, "");
        const key  = typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "";
        const tok  = typeof sipenToken === "function" ? sipenToken() : key;
        const r = await fetch(
          `${url}/rest/v1/ministerios?select=id,nome&order=nome.asc&limit=300`,
          { headers: { apikey: key, Authorization: `Bearer ${tok}` } }
        );
        const rows = r.ok ? await r.json() : [];
        _departamentosCache = rows.length ? rows : null;
      } catch { _departamentosCache = null; }
    }
    if (!_departamentosCache) {
      sel.innerHTML = `<option value="">Nenhum departamento encontrado</option>`;
      return;
    }
    const atual = sel.dataset.current || sel.value;
    sel.innerHTML = `<option value="">— Selecione o departamento —</option>` +
      _departamentosCache.map(d =>
        `<option value="${escapeHtmlAttr(d.nome)}"${d.nome === atual ? " selected" : ""}>${escapeHtml(d.nome)}</option>`
      ).join("");
    if (atual) sel.value = atual;
  }

  async function _demCarregarFornecedores() {
    const sel = document.getElementById("dem-enc-forn-sel");
    if (!sel) return;
    if (!_fornecedoresCache) {
      try {
        const base = typeof apiBaseUrl === "function" ? apiBaseUrl() : "";
        const hdrs = typeof apiHeaders === "function" ? apiHeaders() : {};
        const rDept = await fetch(
          `${base}/rest/v1/dept_administrativos?nome=eq.Fornecedores&select=id`,
          { headers: hdrs }
        );
        const depts = rDept.ok ? await rDept.json() : [];
        if (depts.length) {
          const deptId = depts[0].id;
          const rMembros = await fetch(
            `${base}/rest/v1/nomeados?dept_id=eq.${deptId}&status=eq.ativo` +
            `&select=id,nome,cargo,pessoas!nomeados_pessoa_id_fkey(id,celular,telefone)` +
            `&order=nome.asc&limit=200`,
            { headers: hdrs }
          );
          const membros = rMembros.ok ? await rMembros.json() : [];
          _fornecedoresCache = membros.map(m => ({
            id:      m.id,
            nome:    m.nome || m.pessoas?.nome || "—",
            contato: m.pessoas?.celular || m.pessoas?.telefone || "",
            cargo:   m.cargo || "",
          }));
        } else {
          _fornecedoresCache = [];
        }
      } catch { _fornecedoresCache = []; }
    }
    const currentId = document.getElementById("dem-enc-forn-id")?.value || "";
    if (!_fornecedoresCache.length) {
      sel.innerHTML = `<option value="">Nenhum fornecedor cadastrado no departamento "Fornecedores"</option>`;
      return;
    }
    sel.innerHTML = `<option value="">— Selecione o fornecedor —</option>` +
      _fornecedoresCache.map(c =>
        `<option value="${escapeHtmlAttr(c.id)}" data-contato="${escapeHtmlAttr(c.contato)}" ${c.id === currentId ? "selected" : ""}>${escapeHtml(c.nome)}${c.cargo ? ` · ${escapeHtml(c.cargo)}` : ""}</option>`
      ).join("");
  }

  /* ── Autocomplete solicitante (edição) ─────────────── */

  window._demSolBuscar = function(q) {
    clearTimeout(_demSolTimer);
    const dd = document.getElementById("dem-edit-sol-dd");
    if (!dd) return;
    if (!q || q.trim().length < 2) { dd.style.display = "none"; return; }
    _demSolTimer = setTimeout(async () => {
      try {
        const base = typeof apiBaseUrl === "function" ? apiBaseUrl() : "";
        const hdrs = typeof apiHeaders  === "function" ? apiHeaders()  : {};
        if (!base) return;
        const res = await fetch(
          `${base}/rest/v1/pessoas?nome=ilike.*${encodeURIComponent(q.trim())}*&deleted_at=is.null&select=id,nome&order=nome.asc&limit=8`,
          { headers: hdrs }
        );
        if (!res.ok) { dd.style.display = "none"; return; }
        const rows = await res.json();
        if (!rows.length) {
          dd.innerHTML = `<div style="padding:8px 12px;color:var(--tx3);font-size:11.5px">Nenhuma pessoa encontrada</div>`;
          dd.style.display = "block";
          return;
        }
        dd.innerHTML = rows.map(p =>
          `<div onclick="window._demSolSelecionar('${escapeHtmlAttr(String(p.id))}','${escapeHtmlAttr(p.nome)}')"
            style="padding:8px 12px;cursor:pointer;font-size:12px;color:var(--tx1);border-bottom:1px solid var(--bd1)"
            onmouseover="this.style.background='var(--bg-hover)'"
            onmouseout="this.style.background=''">${nomePropio(p.nome)}</div>`
        ).join("");
        dd.style.display = "block";
      } catch (_) {
        const dd2 = document.getElementById("dem-edit-sol-dd");
        if (dd2) dd2.style.display = "none";
      }
    }, 280);
  };

  window._demSolSelecionar = function(id, nome) {
    const inp = document.getElementById("dem-edit-sol-nome");
    const hid = document.getElementById("dem-edit-sol-id");
    const dd  = document.getElementById("dem-edit-sol-dd");
    if (inp) inp.value = nome;
    if (hid) hid.value = id;
    if (dd)  dd.style.display = "none";
  };

  window._demSolFecharDd = function() {
    const dd = document.getElementById("dem-edit-sol-dd");
    if (dd) dd.style.display = "none";
  };

  /* ── Modal: Nova Demanda ────────────────────────────── */

  window.abrirModalNovaDemanda = function(categoriaFixa) {
    const m = document.getElementById("modal-nova-demanda");
    if (!m) return;
    const usuario = typeof USUARIO_ATUAL !== "undefined" ? (USUARIO_ATUAL?.nome || "") : "";
    const catEl  = m.querySelector("#dem-f-cat");
    const catRow = m.querySelector("#dem-f-cat-row");
    catEl.innerHTML =
      `<option value="">Selecione a categoria</option>` +
      CATS.map(c => `<option value="${c.nome}">${c.icon} ${c.nome}</option>`).join("");
    if (categoriaFixa) {
      catEl.value = categoriaFixa;
      if (catRow) catRow.style.display = "none";
    } else {
      catEl.value = "";
      if (catRow) catRow.style.display = "";
    }
    if (categoriaFixa) {
      window.demOnCatChange();
    } else {
      m.querySelector("#dem-f-sub").innerHTML = `<option value="">Selecione a categoria primeiro</option>`;
    }
    m.querySelector("#dem-f-titulo").value  = "";
    m.querySelector("#dem-f-desc").value    = "";
    m.querySelector("#dem-f-local").value   = "";
    m.querySelector("#dem-f-sol").value     = usuario;
    m.querySelector("#dem-f-resp").value    = "";
    m.querySelector("#dem-f-venc").value    = "";
    /* Reset financial section */
    ["dem-f-financeiro-section","dem-f-pag-section","dem-f-reimb-section","dem-f-dizimo-section","dem-f-oferta-section",
     "dem-f-pix-section","dem-f-bank-section","dem-f-boleto-section","dem-f-agend-section"].forEach(id => {
      const el = m.querySelector("#" + id);
      if (el) el.style.display = "none";
    });
    /* Reset agendamento section */
    ["dem-f-ag-data","dem-f-ag-inicio","dem-f-ag-fim","dem-f-ag-part"].forEach(id => {
      const el = m.querySelector("#" + id);
      if (el) el.value = "";
    });
    m.querySelectorAll("#dem-f-ag-spaces input[type=checkbox]").forEach(c => { c.checked = false; });
    ["dem-f-tipo-sol","dem-f-valor","dem-f-data-venc","dem-f-beneficiario","dem-f-cpf-cnpj",
     "dem-f-centro","dem-f-forma-pag","dem-f-chave-pix","dem-f-banco","dem-f-agencia",
     "dem-f-conta","dem-f-obs-fin","dem-f-reimb-nome","dem-f-reimb-valor",
     "dem-f-reimb-motivo","dem-f-reimb-forma-pag","dem-f-reimb-pix","dem-f-reimb-min",
     "dem-f-reimb-pastor","dem-f-reimb-obs",
     "dem-f-dizimo-valor","dem-f-dizimo-mes","dem-f-dizimo-obs",
     "dem-f-oferta-valor","dem-f-oferta-data","dem-f-oferta-forma","dem-f-oferta-obs"].forEach(id => {
      const el = m.querySelector("#" + id);
      if (el) el.value = "";
    });
    /* Reset file inputs */
    ["dem-f-upload-nf","dem-f-upload-reimb-nf","dem-f-upload-dizimo","dem-f-upload-oferta"].forEach(id => {
      const el = m.querySelector("#" + id);
      if (el) el.value = "";
    });
    ["dem-f-upload-nf-name","dem-f-upload-reimb-nf-name","dem-f-upload-dizimo-name","dem-f-upload-oferta-name"].forEach(id => {
      const el = m.querySelector("#" + id);
      if (el) el.textContent = _FIN_UPLOAD_PLACEHOLDER;
    });
    /* Reset boleto notas state */
    _boletoNotas = [];
    _boletoNotaCtr = 0;
    const _nc = m.querySelector("#dem-f-notas-container");
    if (_nc) _nc.innerHTML = "";
    const _bt = m.querySelector("#dem-f-boleto-total");
    if (_bt) _bt.textContent = "R$ 0,00";
    const _nfSingle = m.querySelector("#dem-f-nf-single-section");
    if (_nfSingle) _nfSingle.style.display = "";
    const _vEl = m.querySelector("#dem-f-valor");
    if (_vEl) { _vEl.readOnly = false; _vEl.value = ""; _vEl.style.background = ""; _vEl.style.color = ""; }
    const _vLbl = m.querySelector("#dem-f-valor-label");
    if (_vLbl) _vLbl.textContent = "Valor *";
    const _tRow = m.querySelector("#dem-f-boleto-total-row");
    if (_tRow) _tRow.style.display = "none";
    m.style.display = "flex";
    _popularSelectEspacos("dem-f-local");
  };

  window.fecharModalNovaDemanda = function() {
    const m = document.getElementById("modal-nova-demanda");
    if (m) m.style.display = "none";
  };

  window.demOnCatChange = function() {
    const catNome = document.getElementById("dem-f-cat")?.value;
    const subEl   = document.getElementById("dem-f-sub");
    const respEl  = document.getElementById("dem-f-resp");
    const cat     = CATS.find(c => c.nome === catNome);
    if (!subEl) return;
    if (cat) {
      const primeiro = cat.subcats[0];
      let subcats = cat.subcats;
      // Adicionar "Pauta de Reunião" apenas para membros do Conselho e Admin
      if (catNome === "Conselho") {
        const perfil = typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL?.perfil : "";
        if (perfil === "CONSELHO" || perfil === "ADMINISTRADOR_GERAL") {
          subcats = [...subcats, "Pauta de Reunião"];
        }
      }
      if (primeiro && typeof primeiro === "object" && primeiro.grupo) {
        subEl.innerHTML = subcats.map(g =>
          typeof g === "object"
            ? `<optgroup label="${g.grupo}">${g.itens.map(s => `<option value="${s}">${s}</option>`).join("")}</optgroup>`
            : `<option value="${g}">${g}</option>`
        ).join("");
      } else {
        subEl.innerHTML = subcats.map(s => `<option value="${s}">${s}</option>`).join("");
      }
    } else {
      subEl.innerHTML = `<option value="">Selecione a categoria primeiro</option>`;
    }
    if (respEl && cat) respEl.value = cat.resp;
    _toggleFinanceiroSection();
  };

  function _toggleFinanceiroSection() {
    const cat      = document.getElementById("dem-f-cat")?.value;
    const sub      = document.getElementById("dem-f-sub")?.value;
    const sec       = document.getElementById("dem-f-financeiro-section");
    const agSec     = document.getElementById("dem-f-agend-section");
    const pagSec    = document.getElementById("dem-f-pag-section");
    const reimbSec  = document.getElementById("dem-f-reimb-section");
    const dizimoSec = document.getElementById("dem-f-dizimo-section");
    if (!sec) return;
    const isFinanceiro = cat === "Financeiro";
    const isAgendProg  = cat === "Agendamentos" && _PROG_SUBS_INT.has(sub);
    const isPauta      = sub === "Pauta de Reunião";
    sec.style.display              = isFinanceiro ? "" : "none";
    if (agSec)     agSec.style.display     = isAgendProg ? "" : "none";
    if (pagSec)    pagSec.style.display    = (isFinanceiro && sub === "Solicitação de pagamento") ? "flex" : "none";
    if (reimbSec)  reimbSec.style.display  = (isFinanceiro && sub === "Reembolso")               ? "flex" : "none";
    if (dizimoSec) dizimoSec.style.display = (isFinanceiro && sub === "Dízimos")  ? "flex" : "none";
    const ofertaSec = document.getElementById("dem-f-oferta-section");
    if (ofertaSec) ofertaSec.style.display = (isFinanceiro && sub === "Ofertas") ? "flex" : "none";
    if (isFinanceiro) _toggleFormaPagamento();
    const localRow = document.getElementById("dem-f-local-row");
    const respRow  = document.getElementById("dem-f-resp-row");
    if (localRow) localRow.style.display = (isPauta || isFinanceiro) ? "none" : "";
    if (respRow)  respRow.style.display  = isPauta ? "none" : "";
  }

  function _toggleFormaPagamento() {
    const forma    = document.getElementById("dem-f-forma-pag")?.value;
    const pixSec   = document.getElementById("dem-f-pix-section");
    const bankSec  = document.getElementById("dem-f-bank-section");
    const notasLbl = document.getElementById("dem-f-notas-label");

    if (pixSec)   pixSec.style.display  = forma === "PIX"                    ? ""     : "none";
    if (bankSec)  bankSec.style.display = forma === "Transferência Bancária" ? "grid" : "none";
    if (notasLbl) notasLbl.textContent  = forma === "Boleto" ? "Notas Fiscais *" : "Notas Fiscais / Comprovantes (opcional)";

    if (_boletoNotas.length === 0) window.demBoletoAdicionarNota();
    else window.demBoletoAtualizarSoma();
  }

  window.demOnSubChange      = _toggleFinanceiroSection;

  /* ── Agendamentos: Programações ─────────────────────── */
  /* Popula qualquer <select id="..."> com espaços do cadastro central */
  async function _popularSelectEspacos(elId, valorAtual) {
    const el = document.getElementById(elId);
    if (!el) return;
    const val = valorAtual ?? el.dataset.valorAtual ?? "";
    try {
      const r = await fetch(`${apiBaseUrl()}/rest/v1/espacos?ativo=eq.true&order=grupo.asc,ordem.asc,nome.asc`, { headers: apiHeaders() });
      const rows = r.ok ? await r.json() : [];
      const grupos = {};
      rows.forEach(e => { const g = e.grupo || "Outros"; if (!grupos[g]) grupos[g] = []; grupos[g].push(e); });
      el.innerHTML = `<option value="">— Selecione o espaço —</option>`;
      Object.entries(grupos).forEach(([g, items]) => {
        const grp = document.createElement("optgroup");
        grp.label = g;
        items.forEach(e => {
          const opt = document.createElement("option");
          opt.value = e.id; opt.dataset.nome = e.nome; opt.textContent = e.nome;
          // compatível com UUID (novo) e nome texto (legado via data-valor-atual)
          if (e.id === val || e.nome === val) opt.selected = true;
          grp.appendChild(opt);
        });
        el.appendChild(grp);
      });
    } catch (_) {
      el.innerHTML = `<option value="${val}">${val || "— Selecione o espaço —"}</option>`;
    }
  }

  const _PROG_SUBS_INT = new Set(["Reunião","Evento","Ensaio","Casamento","Aniversário","Congresso","Conferência","Outros"]);
  async function _carregarEspacosGrid() {
    const grid = document.getElementById("dem-f-ag-spaces");
    if (!grid || grid.children.length) return;
    try {
      const r = await fetch(`${apiBaseUrl()}/rest/v1/espacos?ativo=eq.true&reservavel=eq.true&order=grupo.asc,ordem.asc,nome.asc`, { headers: apiHeaders() });
      const rows = r.ok ? await r.json() : [];
      const grupos = {};
      rows.forEach(e => {
        const g = e.grupo || "Outros";
        if (!grupos[g]) grupos[g] = [];
        grupos[g].push(e.nome);
      });
      Object.entries(grupos).forEach(([g, nomes]) => {
        const hdr = document.createElement("div");
        hdr.style.cssText = "grid-column:1/-1;font-size:10px;font-weight:700;color:var(--teal,#0d9488);text-transform:uppercase;letter-spacing:.07em;padding:8px 0 3px;border-bottom:1px solid var(--bd2);margin-top:6px";
        hdr.textContent = g;
        grid.appendChild(hdr);
        nomes.forEach(s => {
          const lbl = document.createElement("label");
          lbl.style.cssText = "display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg-card));cursor:pointer;font-size:12.5px;color:var(--tx1);user-select:none";
          lbl.innerHTML = `<input type="checkbox" value="${s}" style="accent-color:var(--teal);width:14px;height:14px;cursor:pointer;flex-shrink:0"> ${s}`;
          grid.appendChild(lbl);
        });
      });
    } catch (_) {}
  }
  _carregarEspacosGrid();
  window.demOnFormaPagChange = _toggleFormaPagamento;

  /* ── Upload de anexos financeiros ───────────────────── */

  const _FIN_UPLOAD_PLACEHOLDER = "Escolher arquivo · PDF, JPG ou PNG · máx. 10 MB";

  /* ── Boleto: múltiplas notas fiscais ────────────────── */

  let _boletoNotas   = [];
  let _boletoNotaCtr = 0;

  function _boletoNotaHTML(id) {
    const si = "width:100%;padding:7px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg-card));color:var(--tx1);font-size:13px;box-sizing:border-box";
    return `<div id="dem-fn-${id}" style="border:1px solid var(--bd2);border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:8px">
  <div style="display:flex;gap:8px;align-items:center">
    <div onclick="document.getElementById('dem-fn-file-${id}').click()" style="flex:1;display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:6px;border:1.5px dashed var(--bd2);background:var(--bg-input,var(--bg-card));color:var(--tx3);font-size:12.5px;cursor:pointer;min-width:0">📎 <span id="dem-fn-fname-${id}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">Escolher NF / comprovante</span></div>
    <input id="dem-fn-file-${id}" type="file" accept=".pdf,.jpg,.jpeg,.png" style="position:absolute;width:0;height:0;opacity:0;overflow:hidden" onchange="demBoletoNFSelected('${id}',this)">
    <button id="dem-fn-rm-${id}" type="button" onclick="demBoletoRemoverNota('${id}')" style="display:none;background:none;border:none;color:var(--rose);cursor:pointer;font-size:18px;padding:4px 6px;line-height:1;flex-shrink:0">✕</button>
  </div>
  <div style="display:flex;gap:8px;align-items:center">
    <div onclick="document.getElementById('dem-fn-boleto-${id}').click()" style="flex:1;display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:6px;border:1.5px dashed var(--bd2);background:var(--bg-input,var(--bg-card));color:var(--tx3);font-size:12.5px;cursor:pointer;min-width:0">📄 <span id="dem-fn-bname-${id}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">Anexar boleto deste NF (opcional)</span></div>
    <input id="dem-fn-boleto-${id}" type="file" accept=".pdf,.jpg,.jpeg,.png" style="position:absolute;width:0;height:0;opacity:0;overflow:hidden" onchange="demBoletoPorNotaSelected('${id}',this)">
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div>
      <label style="font-size:10px;font-weight:600;color:var(--tx3);display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em">Valor da nota *</label>
      <input type="text" inputmode="decimal" placeholder="0,00" id="dem-fn-val-${id}" oninput="demBoletoAtualizarSoma()" style="${si}">
    </div>
    <div>
      <label style="font-size:10px;font-weight:600;color:var(--tx3);display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em">Observação</label>
      <input type="text" placeholder="Ex: NF 1234" id="dem-fn-obs-${id}" style="${si}">
    </div>
  </div>
</div>`;
  }

  function _boletoSyncRemoveBtns() {
    const can = _boletoNotas.length > 1;
    _boletoNotas.forEach(n => {
      const btn = document.getElementById(`dem-fn-rm-${n.id}`);
      if (btn) btn.style.display = can ? "" : "none";
    });
  }

  window.demBoletoAdicionarNota = function() {
    const id = ++_boletoNotaCtr;
    _boletoNotas.push({ id, file: null, fileName: null, boletoFile: null, boletoFileName: null });
    const container = document.getElementById("dem-f-notas-container");
    if (container) container.insertAdjacentHTML("beforeend", _boletoNotaHTML(id));
    _boletoSyncRemoveBtns();
    window.demBoletoAtualizarSoma();
  };

  window.demBoletoRemoverNota = function(id) {
    _boletoNotas = _boletoNotas.filter(n => n.id != id);
    document.getElementById(`dem-fn-${id}`)?.remove();
    demBoletoAtualizarSoma();
    _boletoSyncRemoveBtns();
  };

  window.demBoletoPorNotaSelected = function(id, input) {
    const file  = input.files?.[0];
    const label = document.getElementById(`dem-fn-bname-${id}`);
    const nota  = _boletoNotas.find(n => n.id == id);
    if (!file) { if (label) label.textContent = "Anexar boleto deste NF (opcional)"; return; }
    const err = _validarArquivo(file);
    if (err) {
      input.value = "";
      if (label) label.textContent = "Anexar boleto deste NF (opcional)";
      if (typeof T === "function") T("Arquivo inválido", err);
      return;
    }
    if (nota) { nota.boletoFile = file; nota.boletoFileName = file.name; }
    if (label) label.textContent = `✅ ${file.name} (${(file.size/1024/1024).toFixed(1)} MB)`;
  };

  window.demBoletoNFSelected = function(id, input) {
    const file  = input.files?.[0];
    const label = document.getElementById(`dem-fn-fname-${id}`);
    const nota  = _boletoNotas.find(n => n.id == id);
    if (!file) { if (label) label.textContent = "Escolher NF / comprovante"; return; }
    const err = _validarArquivo(file);
    if (err) {
      input.value = "";
      if (label) label.textContent = "Escolher NF / comprovante";
      if (typeof T === "function") T("Arquivo inválido", err);
      return;
    }
    if (nota) { nota.file = file; nota.fileName = file.name; }
    if (label) label.textContent = `✅ ${file.name} (${(file.size/1024/1024).toFixed(1)} MB)`;
  };

  function _parseNotaVal(id) {
    let v = (document.getElementById(`dem-fn-val-${id}`)?.value || "").trim();
    if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(v);
    return isNaN(n) || n < 0 ? 0 : n;
  }

  window.demBoletoAtualizarSoma = function() {
    const isBoleto = document.getElementById("dem-f-forma-pag")?.value === "Boleto";
    let soma = 0;
    let temValor = false;
    _boletoNotas.forEach(n => {
      const v = _parseNotaVal(n.id);
      if (v > 0) { soma += v; temValor = true; }
    });

    const fmtBR = v => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
    const totalEl  = document.getElementById("dem-f-boleto-total");
    const totalRow = document.getElementById("dem-f-boleto-total-row");
    const valorEl  = document.getElementById("dem-f-valor");
    const valorLbl = document.getElementById("dem-f-valor-label");

    if (totalEl)  totalEl.textContent     = fmtBR(soma);
    if (totalRow) totalRow.style.display  = (temValor || isBoleto) ? "flex" : "none";

    if (valorEl) {
      if (temValor) {
        valorEl.readOnly         = true;
        valorEl.value            = soma.toFixed(2);
        valorEl.style.background = "var(--bg-card)";
        valorEl.style.color      = "var(--tx3)";
      } else if (!isBoleto) {
        valorEl.readOnly         = false;
        valorEl.style.background = "";
        valorEl.style.color      = "";
      }
    }
    if (valorLbl) valorLbl.textContent = temValor ? "Valor total (automático)" : (isBoleto ? "Valor total (automático)" : "Valor *");
  };

  window.demOnFileSelected = function(input, labelId) {
    const file  = input.files?.[0];
    const label = document.getElementById(labelId);
    if (!label) return;
    if (!file) { label.textContent = _FIN_UPLOAD_PLACEHOLDER; return; }
    const err = _validarArquivo(file);
    if (err) {
      input.value = "";
      label.textContent = _FIN_UPLOAD_PLACEHOLDER;
      if (typeof T === "function") T("Arquivo inválido", err);
      return;
    }
    label.textContent = `✅ ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
  };

  function _validarArquivo(file) {
    if (!["application/pdf","image/jpeg","image/png"].includes(file.type))
      return "Tipo não permitido. Use PDF, JPG ou PNG.";
    if (file.size > 10 * 1024 * 1024) return "Arquivo maior que 10 MB.";
    return null;
  }

  async function _uploadAnexoFinanceiro(file, demandaId, tipo) {
    const sb = _sbClient();
    if (!sb) throw new Error("Supabase não disponível para upload");
    const ts   = Date.now();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `demandas/${demandaId}/${tipo}/${ts}_${safe}`;
    const { error } = await sb.storage
      .from("financial-documents")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
    const u = typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL : null;
    return {
      file_name:    file.name,
      storage_path: path,
      mime_type:    file.type,
      size_bytes:   file.size,
      uploaded_at:  new Date().toISOString(),
      uploaded_by:  u?.nome || "",
    };
  }

  window.demAbrirAnexo = async function(storagePath) {
    if (!storagePath) return;
    const sb = _sbClient();
    if (!sb) { if (typeof T === "function") T("Erro", "Serviço temporariamente indisponível."); return; }
    // Abrir janela antes do await para não ser bloqueada pelo popup blocker
    const w = window.open("", "_blank", "noopener,noreferrer");
    try {
      const { data, error } = await sb.storage
        .from("financial-documents")
        .createSignedUrl(storagePath, 3600);
      if (error) throw error;
      if (w) w.location.href = data.signedUrl;
      else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch(e) {
      if (w) w.close();
      if (typeof T === "function") T("Erro ao abrir arquivo", e.message);
    }
  };

  window.demAnexarDoc = function(demId, tipo) {
    const input = document.createElement("input");
    input.type   = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const sb = _sbClient();
      if (!sb) { if (typeof T === "function") T("Erro", "Serviço indisponível."); return; }
      if (file.size > 10 * 1024 * 1024) { if (typeof T === "function") T("Arquivo muito grande", "Limite de 10 MB."); return; }
      const btn = document.querySelector(`[onclick="demAnexarDoc('${demId}','${tipo}')"]`);
      const orig = btn ? btn.textContent : "";
      if (btn) { btn.textContent = "Enviando..."; btn.disabled = true; }
      try {
        const ts   = Date.now();
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `financeiro/demandas/${demId}/${tipo}/${ts}_${safe}`;
        const { error: upErr } = await sb.storage
          .from("financial-documents")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw new Error(upErr.message);
        const u = typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL : null;
        const { error: dbErr } = await sb.from("financeiro_anexos").insert({
          demanda_id:     demId,
          tipo_arquivo:   tipo,
          nome_original:  file.name,
          storage_bucket: "financial-documents",
          storage_path:   path,
          mime_type:      file.type,
          tamanho_bytes:  file.size,
          criado_por:     u?.nome || "",
        });
        if (dbErr) throw new Error(dbErr.message);
        if (typeof T === "function") T("Arquivo enviado", file.name);
        await _carregarAnexosDemanda(demId);
      } catch(e) {
        if (btn) { btn.textContent = orig; btn.disabled = false; }
        if (typeof T === "function") T("Erro no upload", e.message);
      }
    };
    input.click();
  };

  window.demExcluirAnexo = async function(anexoId, demId) {
    if (!confirm("Excluir este anexo?")) return;
    const sb = _sbClient();
    if (!sb) return;
    try {
      const { error } = await sb
        .from("financeiro_anexos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", anexoId);
      if (error) throw error;
      await _carregarAnexosDemanda(demId);
    } catch(e) {
      if (typeof T === "function") T("Erro ao excluir", e.message);
    }
  };

  window.salvarNovaDemanda = async function() {
    /* Impede duplo clique ou submissão simultânea */
    if (_saving) return;
    _saving = true;
    const _btn = document.getElementById("dem-btn-registrar");
    const _btnTxt = _btn?.textContent || "Registrar Demanda";
    if (_btn) { _btn.disabled = true; _btn.textContent = "Salvando…"; }

    try {
    const cat    = document.getElementById("dem-f-cat")?.value;
    const sub    = document.getElementById("dem-f-sub")?.value;
    const titulo = document.getElementById("dem-f-titulo")?.value?.trim();
    const desc   = document.getElementById("dem-f-desc")?.value?.trim();
    const localCriarEl = document.getElementById("dem-f-local");
    const local_id = localCriarEl?.value?.trim() || null;
    const local    = localCriarEl?.selectedOptions[0]?.dataset?.nome || null;
    const sol    = document.getElementById("dem-f-sol")?.value?.trim();
    const resp   = document.getElementById("dem-f-resp")?.value?.trim();
    const venc   = document.getElementById("dem-f-venc")?.value || null;

    if (!cat || !sub || !titulo) {
      if (typeof T === "function") T("Campo obrigatório", "Preencha categoria, subcategoria e título");
      return;
    }

    /* ── Coleta e valida dados financeiros ─────────────── */
    let financial_data = null;

    if (cat === "Financeiro" && sub === "Solicitação de pagamento") {
      const valor     = parseFloat(document.getElementById("dem-f-valor")?.value || "0");
      const benefic   = document.getElementById("dem-f-beneficiario")?.value?.trim();
      const forma     = document.getElementById("dem-f-forma-pag")?.value;
      const chave_pix = document.getElementById("dem-f-chave-pix")?.value?.trim();
      const banco     = document.getElementById("dem-f-banco")?.value?.trim();
      const agencia   = document.getElementById("dem-f-agencia")?.value?.trim();
      const conta     = document.getElementById("dem-f-conta")?.value?.trim();
      if (forma !== "Boleto" && (!valor || isNaN(valor) || valor <= 0)) {
        if (typeof T === "function") T("Campo obrigatório", "Informe o valor da solicitação");
        return;
      }
      if (!benefic) {
        if (typeof T === "function") T("Campo obrigatório", "Informe o beneficiário / favorecido");
        return;
      }
      if (!forma) {
        if (typeof T === "function") T("Campo obrigatório", "Selecione a forma de pagamento");
        return;
      }
      if (forma === "PIX" && !chave_pix) {
        if (typeof T === "function") T("Campo obrigatório", "Informe a chave Pix");
        return;
      }
      if (forma === "Boleto") {
        const _notasValidas = _boletoNotas.filter(n => n.file || _parseNotaVal(n.id) > 0);
        if (!_notasValidas.length) {
          if (typeof T === "function") T("Nota fiscal obrigatória", "Adicione pelo menos uma nota fiscal");
          return;
        }
        for (const nota of _notasValidas) {
          if (!nota.file) {
            if (typeof T === "function") T("Arquivo obrigatório", "Adicione o arquivo de cada nota fiscal preenchida");
            return;
          }
          const nErr = _validarArquivo(nota.file);
          if (nErr) { if (typeof T === "function") T("Arquivo inválido", nErr); return; }
          const nVal = _parseNotaVal(nota.id);
          if (!nVal || nVal <= 0) {
            if (typeof T === "function") T("Campo obrigatório", "Informe o valor de cada nota fiscal");
            return;
          }
          if (nota.boletoFile) {
            const bErr = _validarArquivo(nota.boletoFile);
            if (bErr) { if (typeof T === "function") T("Arquivo inválido", bErr); return; }
          }
        }
        if (!_notasValidas.some(n => n.boletoFile)) {
          if (typeof T === "function") T("Boleto obrigatório", "Anexe o boleto de pelo menos uma nota fiscal");
          return;
        }
      }
      /* Para outras formas: valida arquivo de cada nota adicionada (opcional, mas se presente deve ser válido) */
      if (forma !== "Boleto") {
        for (const nota of _boletoNotas) {
          if (!nota.file) continue;
          const nErr = _validarArquivo(nota.file);
          if (nErr) { if (typeof T === "function") T("Arquivo inválido", nErr); return; }
        }
      }
      if (forma === "Transferência Bancária" && (!banco || !agencia || !conta)) {
        if (typeof T === "function") T("Campo obrigatório", "Informe banco, agência e conta para transferência");
        return;
      }
      financial_data = {
        tipo:            document.getElementById("dem-f-tipo-sol")?.value || "Pagamento",
        valor,
        data_vencimento: document.getElementById("dem-f-data-venc")?.value || null,
        beneficiario:    benefic,
        cpf_cnpj:        document.getElementById("dem-f-cpf-cnpj")?.value?.trim() || "",
        centro_custo:    document.getElementById("dem-f-centro")?.value?.trim() || "",
        forma_pagamento: forma,
        chave_pix:       chave_pix || "",
        banco:           banco || "",
        agencia:         agencia || "",
        conta:           conta || "",
        obs:             document.getElementById("dem-f-obs-fin")?.value?.trim() || "",
      };
    }

    if (cat === "Financeiro" && sub === "Reembolso") {
      const nome  = document.getElementById("dem-f-reimb-nome")?.value?.trim();
      const valor = parseFloat(document.getElementById("dem-f-reimb-valor")?.value || "0");
      const nfFile = document.getElementById("dem-f-upload-reimb-nf")?.files?.[0];
      if (!nome) {
        if (typeof T === "function") T("Campo obrigatório", "Informe o nome de quem será reembolsado");
        return;
      }
      if (!valor || isNaN(valor) || valor <= 0) {
        if (typeof T === "function") T("Campo obrigatório", "Informe o valor do reembolso");
        return;
      }
      if (!nfFile) {
        if (typeof T === "function") T("Arquivo obrigatório", "Anexe a nota fiscal ou comprovante");
        return;
      }
      const nfErr = _validarArquivo(nfFile);
      if (nfErr) { if (typeof T === "function") T("Arquivo inválido", nfErr); return; }
      financial_data = {
        reimb_nome:      nome,
        valor,
        motivo:          document.getElementById("dem-f-reimb-motivo")?.value?.trim() || "",
        forma_pagamento: document.getElementById("dem-f-reimb-forma-pag")?.value || "",
        chave_pix:       document.getElementById("dem-f-reimb-pix")?.value?.trim() || "",
        ministerio:      document.getElementById("dem-f-reimb-min")?.value?.trim() || "",
        pastor_ciente:   document.getElementById("dem-f-reimb-pastor")?.value?.trim() || "",
        obs:             document.getElementById("dem-f-reimb-obs")?.value?.trim() || "",
      };
    }

    if (cat === "Financeiro" && sub === "Ofertas") {
      const valor = parseFloat(document.getElementById("dem-f-oferta-valor")?.value || "0");
      if (!valor || isNaN(valor) || valor <= 0) {
        if (typeof T === "function") T("Campo obrigatório", "Informe o valor da oferta");
        return;
      }
      financial_data = {
        tipo:            "Oferta",
        valor,
        data_oferta:     document.getElementById("dem-f-oferta-data")?.value || null,
        forma_pagamento: document.getElementById("dem-f-oferta-forma")?.value || "",
        obs:             document.getElementById("dem-f-oferta-obs")?.value?.trim() || "",
      };
    }

    if (cat === "Financeiro" && sub === "Dízimos") {
      const valor = parseFloat(document.getElementById("dem-f-dizimo-valor")?.value || "0");
      const mes   = document.getElementById("dem-f-dizimo-mes")?.value || null;
      if (!valor || isNaN(valor) || valor <= 0) {
        if (typeof T === "function") T("Campo obrigatório", "Informe o valor do dízimo");
        return;
      }
      if (!mes) {
        if (typeof T === "function") T("Campo obrigatório", "Selecione o mês de referência");
        return;
      }
      financial_data = {
        tipo:           "Dízimo",
        valor,
        mes_referencia: mes,
        obs:            document.getElementById("dem-f-dizimo-obs")?.value?.trim() || "",
      };
    }

    /* ── Coleta dados de agendamento de programação ────── */
    let agend_extra = "";
    if (cat === "Agendamentos" && _PROG_SUBS_INT.has(sub)) {
      const agData   = document.getElementById("dem-f-ag-data")?.value || "";
      const agInicio = document.getElementById("dem-f-ag-inicio")?.value || "";
      const agFim    = document.getElementById("dem-f-ag-fim")?.value || "";
      const agPart   = document.getElementById("dem-f-ag-part")?.value?.trim() || "";
      if (!agData) {
        if (typeof T === "function") T("Campo obrigatório", "Informe a data da programação");
        return;
      }
      const agEspacos = [...document.querySelectorAll("#dem-f-ag-spaces input:checked")].map(c => c.value);
      const agLinhas = [
        "━━━ Dados da Programação ━━━",
        `Data: ${agData}`,
        agInicio ? `Horário de início: ${agInicio}`    : null,
        agFim    ? `Horário de encerramento: ${agFim}` : null,
        agPart   ? `Participantes estimados: ${agPart}` : null,
        agEspacos.length ? `Espaços: ${agEspacos.join(", ")}` : null,
      ].filter(Boolean).join("\n");
      agend_extra = "\n\n" + agLinhas;
    }

    const u = typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL : null;
    const pessoaId = u?.id || u?.pessoa_id || null;

    const payload = {
      area:           cat,
      subcategoria:   sub,
      titulo,
      descricao:      (desc || "") + agend_extra,
      local,
      local_id,
      prioridade:     "Média",    // definida por triagem — nunca pelo solicitante
      status:         "ABERTA",
      solicitante:    sol || "",
      solicitante_id: pessoaId,
      created_by:     pessoaId,
      responsavel:    resp || catResp(cat),
      data_abertura:  new Date().toISOString().split("T")[0],
      data_conclusao: venc,
    };
    /* ── Upload ANTES do INSERT — elimina a necessidade de UPDATE ── */
    if (financial_data) {
      const tempKey    = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const uploadErrs = [];
      const _forma     = financial_data.forma_pagamento;

      /* Upload das notas fiscais (todas as formas de pagamento) — boleto por nota quando aplicável */
      if (_boletoNotas.some(n => n.file)) {
        financial_data.notas_fiscais = [];
        let somaNotas = 0;
        for (const nota of _boletoNotas) {
          if (!nota.file) continue;
          const nVal = _parseNotaVal(nota.id);
          const nObs = document.getElementById(`dem-fn-obs-${nota.id}`)?.value?.trim() || "";
          somaNotas += nVal;
          try {
            const meta = await _uploadAnexoFinanceiro(nota.file, `tmp_${tempKey}`, "notas");
            const entry = { ...meta, valor: nVal, obs: nObs };
            if (nota.boletoFile) {
              try {
                entry.boleto = await _uploadAnexoFinanceiro(nota.boletoFile, `tmp_${tempKey}`, "boletos");
              } catch(be) { uploadErrs.push(`Boleto: ${be.message}`); }
            }
            financial_data.notas_fiscais.push(entry);
          } catch(e) { uploadErrs.push(`Nota fiscal: ${e.message}`); }
        }
        if (_forma === "Boleto") financial_data.valor = parseFloat(somaNotas.toFixed(2));
      }

      /* Reembolso */
      const reimbNfFile = document.getElementById("dem-f-upload-reimb-nf")?.files?.[0];
      if (reimbNfFile) {
        try { financial_data.nota_fiscal = await _uploadAnexoFinanceiro(reimbNfFile, `tmp_${tempKey}`, "notas"); }
        catch(e) { uploadErrs.push(`Comprovante: ${e.message}`); }
      }

      /* Dízimos */
      const dizimoFile = document.getElementById("dem-f-upload-dizimo")?.files?.[0];
      if (dizimoFile) {
        try { financial_data.comprovante = await _uploadAnexoFinanceiro(dizimoFile, `tmp_${tempKey}`, "notas"); }
        catch(e) { uploadErrs.push(`Comprovante dízimo: ${e.message}`); }
      }

      /* Ofertas */
      const ofertaFile = document.getElementById("dem-f-upload-oferta")?.files?.[0];
      if (ofertaFile) {
        try { financial_data.comprovante = await _uploadAnexoFinanceiro(ofertaFile, `tmp_${tempKey}`, "notas"); }
        catch(e) { uploadErrs.push(`Comprovante oferta: ${e.message}`); }
      }

      if (uploadErrs.length) {
        if (typeof T === "function") T("Erro no upload", uploadErrs.join(" | "));
        return;
      }

      payload.financial_data = financial_data;
    }

    try {
      const result = await apiWrite("create", "DEMANDAS", payload);
      const nova = Array.isArray(result) ? result[0] : result;
      if (typeof T === "function") T("✅ Demanda criada!", `Roteada para: ${payload.responsavel}`);
      window.fecharModalNovaDemanda();
      _invalidate();
      const view = document.querySelector(".view.on");
      if (view?.id === "v-dem-dash")       renderDash();
      if (view?.id === "v-dem-todas")      renderLista("dem-todas-content");
      if (view?.id === "v-admin-demandas") _admRender();
      if (view?.id === "v-fin-demandas")   _finRender();
      _atualizarBadge();
      if (nova?.id) _notificarResponsaveisWA({ ...payload, id: nova.id }).catch(() => {});
    } catch(e) {
      if (typeof T === "function") T("Erro ao criar", e.message || "Tente novamente");
      console.error("salvarNovaDemanda:", e);
    }
  } finally {
    _saving = false;
    if (_btn) { _btn.disabled = false; _btn.textContent = _btnTxt; }
  }
  };

  /* ── Notificação WhatsApp ao criar demanda ───────────── */

  function _montarMsgWA(dem) {
    const link = "https://www.sipen.com.br";
    const fd   = (dem.financial_data && typeof dem.financial_data === "object") ? dem.financial_data : null;
    const fmtValor = v => v != null && !isNaN(v)
      ? "R$ " + parseFloat(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
      : null;
    const fmtData = d => {
      if (!d) return null;
      const [y, m, dia] = String(d).slice(0, 10).split("-");
      return `${dia}/${m}/${y}`;
    };
    return [
      `📋 *Nova demanda registrada*`,
      ``,
      `*Título:* ${dem.titulo}`,
      `*Departamento:* ${dem.area || "—"}`,
      dem.subcategoria                     ? `*Subcategoria:* ${dem.subcategoria}`                 : null,
      `*Solicitante:* ${dem.solicitante || "—"}`,
      `*Status:* Aberta`,
      fd && fmtValor(fd.valor)             ? `*Valor:* ${fmtValor(fd.valor)}`                     : null,
      fd && fmtData(fd.data_vencimento)    ? `*Vencimento:* ${fmtData(fd.data_vencimento)}`       : null,
      dem.descricao ? `\n*Descrição:*\n${dem.descricao.slice(0, 300)}${dem.descricao.length > 300 ? "…" : ""}` : null,
      ``,
      `🔗 Acesse no SIPEN:\n${link}`,
    ].filter(l => l !== null).join("\n");
  }

  // MANTER EM SINCRONIA com AREA_MODULO em supabase/functions/whatsapp-receive/index.ts
  // Aqui a chave é o nome da área (dem.area); lá é o area_id (ia.area_id)
  const _AREA_MODULO_WA = {
    "Conselho":                "CONSELHO",
    "Agendamentos":            "AGENDA",
    "Manutenção":              "INFRAESTRUTURA",
    "Limpeza e Organização":   "INFRAESTRUTURA",
    "Logística":               "INFRAESTRUTURA",
    "Financeiro":              "FINANCEIRO",
    "Comunicação e Divulgação":"MINISTERIAL",
    "Secretaria":              "CONSELHO",
    "Cadastro":                "MEMBRESIA",
    "Oração e Aconselhamento": "PASTORAL",
    "Visitação":               "JUNTA_DIACONAL",
    "Apoio ao Culto":          "MINISTERIAL",
    "Ensino (EBT)":            "MINISTERIAL",
    "Ação Social / Hebron":    "MINISTERIAL",
    "Administrativo Geral":    "DEMANDAS",
  };

  async function _notificarSolicitanteWA(dem, evento, extra = {}) {
    const _lg = (...a) => console.log("[WA-SOL]", ...a);
    if (typeof WA === "undefined") { _lg("WA indefinido"); return; }
    if (!dem) { _lg("dem nulo"); return; }

    const uidAtual = typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL?.id : null;
    _lg(`evento="${evento}" dem.id=${dem.id} solicitante_id=${dem.solicitante_id} uidAtual=${uidAtual} tel=${dem.telefone_solicitante}`);

    if (uidAtual && dem.solicitante_id && String(dem.solicitante_id) === String(uidAtual)) {
      _lg("bloqueado: usuário atual é o solicitante"); return;
    }

    const tel = dem.telefone_solicitante;
    if (!tel) { _lg("bloqueado: sem telefone_solicitante"); return; }

    const nome   = (dem.solicitante || dem.solicitante_txt || "").split(" ")[0] || "prezado(a)";
    const titulo = dem.titulo || "—";
    const link   = "https://www.sipen.com.br";

    let mensagem = "";
    if (evento === "status") {
      mensagem =
        `📋 *Atualização no seu chamado*\n\n` +
        `*Título:* ${titulo}\n` +
        `*Status atual:* ${extra.status}\n\n` +
        `🔗 Acompanhe em:\n${link}`;
    } else if (evento === "andamento") {
      mensagem =
        `💬 *Novo andamento no seu chamado*\n\n` +
        `*Título:* ${titulo}\n\n` +
        `${extra.texto}\n\n` +
        `🔗 Acompanhe em:\n${link}`;
    }
    if (!mensagem) return;

    _lg(`enviando para ${tel} (${nome})`);
    WA.send({
      para:        tel,
      nome,
      mensagem,
      modulo:      _AREA_MODULO_WA[dem.area] || "DEMANDAS",
      referenciaT: "demanda",
      referenciaId: String(dem.id || dem._row || ""),
      chave:       `DEM_SOL_${evento}_${dem.id || dem._row}_${Math.floor(Date.now() / 5000)}`,
    }).then(r => _lg("resultado:", r)).catch(e => _lg("erro:", e.message));
  }

  async function _notificarResponsaveisWA(dem) {
    const _log = (...a) => console.log("[WA-DEM]", ...a);
    if (typeof WA === "undefined") { _log("WA não definido — abortando"); return; }
    const base = typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL.trim().replace(/\/$/, "") : "";
    const hdrs = typeof apiHeaders === "function" ? apiHeaders() : {};

    let rows = [];

    const modulo = _AREA_MODULO_WA[dem.area];
    _log(`área="${dem.area}" → módulo="${modulo}"`);

    if (modulo) {
      try {
        const res = await fetch(
          `${base}/rest/v1/whatsapp_modulo_responsaveis?modulo=eq.${encodeURIComponent(modulo)}&ativo=eq.true` +
          `&select=pessoa_id,pessoas(id,nome,whatsapp,telefone,celular)`,
          { headers: hdrs }
        );
        rows = res.ok ? await res.json() : [];
        _log(`responsáveis no módulo: ${rows.length}`);
      } catch (e) { _log("erro ao buscar responsáveis:", e.message); }
    }

    if (!rows.length) {
      _log("sem responsáveis configurados — sem fallback");
      return;
    }

    const msg = _montarMsgWA(dem);
    for (const row of rows) {
      const p = row.pessoas;
      if (!p) { _log("pessoa não encontrada no row:", row); continue; }
      const tel = p.whatsapp || p.celular || p.telefone;
      if (!tel) { _log("sem telefone para:", p.nome); continue; }
      _log(`enviando para ${p.nome} (${tel})`);
      WA.send({
        para:        tel,
        nome:        p.nome,
        mensagem:    msg,
        modulo:      modulo || "DEMANDAS",
        referenciaT: "demanda",
        referenciaId: dem.id,
        chave:       `DEM_NOVA_${dem.id}_${row.pessoa_id}`,
      }).then(r => _log("resultado:", r)).catch(e => _log("erro WA.send:", e.message));
    }
  }

  /* ── Expor filtrar para views ────────────────────────── */
  window.demFiltrar = function(elId, filtros) { renderLista(elId, filtros); };

  /* Helper específico para views de Infraestrutura — mantém o escopo correto */
  window.infraDemFiltrar = function(elId, extra) {
    renderLista(elId, Object.assign({ area: _INFRA_AREAS }, extra || {}));
  };

  window.demTabStatus = function(contentId, tabEl, status, fixos) {
    const inp = document.getElementById(contentId + "-fstatus");
    if (inp) inp.value = status;
    tabEl.parentElement.querySelectorAll(".dem-stab").forEach(t => t.classList.remove("on"));
    tabEl.classList.add("on");
    demFiltrar(contentId, fixos);
  };

  /* ── Hook no go() ────────────────────────────────────── */

  /* ── Dashboard de Infraestrutura ───────────────────── */

  async function _renderInfraDash() {
    if (!_cache.length) await _load();
    const rows = _cache.filter(r => _INFRA_AREAS.includes(String(r.area||"")));
    const mes   = new Date().toISOString().slice(0, 7);

    const nAbertas = rows.filter(r => ["ABERTA","EM_ANALISE"].includes(_toDb(r.status))).length;
    const nAnd     = rows.filter(r => _toDb(r.status) === "EM_ANDAMENTO").length;
    const nPri     = rows.filter(r => ["Alta","Urgente"].includes(r.prioridade) && !_STATUS_FECHADO.includes(_toDb(r.status))).length;
    const nConc    = rows.filter(r => ["CONCLUIDA","PAGO"].includes(_toDb(r.status)) && (r.data_conclusao||r.criado_em||"").startsWith(mes)).length;

    const sv = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    sv("infra-kpi-abertas", nAbertas);
    sv("infra-kpi-and",     nAnd);
    sv("infra-kpi-pri",     nPri);
    sv("infra-kpi-conc",    nConc);

    function _miniRow(r) {
      return `<tr style="border-bottom:1px solid var(--bd1);cursor:pointer" onclick="window.demAbrirDetalhe('${r.id||r._row}','infra-dash')">
        <td style="padding:7px 6px;font-weight:600;color:var(--tx1);max-width:190px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.titulo) || "—"}</td>
        <td style="padding:7px 6px">${pillStatus(r.status)}</td>
        <td style="padding:7px 4px;color:var(--tx3);font-size:11px">${nomePropio(r.responsavel || r.responsavel_txt) || "—"}</td>
      </tr>`;
    }
    function _miniTable(list) {
      return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><tbody>${list.map(_miniRow).join("")}</tbody></table></div>`;
    }
    function _empty(msg) {
      return `<div style="color:var(--tx3);font-size:11.5px;padding:8px 0">${msg}</div>`;
    }

    const elAb  = document.getElementById("infra-dash-abertas");
    const abList = rows.filter(r => ["ABERTA","EM_ANALISE","EM_ANDAMENTO"].includes(_toDb(r.status)))
                       .sort((a,b) => (b.criado_em||"").localeCompare(a.criado_em||"")).slice(0, 6);
    if (elAb) elAb.innerHTML = abList.length ? _miniTable(abList) : _empty("Nenhuma demanda em aberto.");

    const elPri = document.getElementById("infra-dash-prioridade");
    const priList = rows.filter(r => ["Alta","Urgente"].includes(r.prioridade) && !_STATUS_FECHADO.includes(_toDb(r.status)))
                        .sort((a,b) => (b.criado_em||"").localeCompare(a.criado_em||"")).slice(0, 6);
    if (elPri) elPri.innerHTML = priList.length ? _miniTable(priList) : _empty("Nenhuma demanda prioritária.");
  }
  window.infra_dash_load = function() { _renderInfraDash(); };

  window._area_kpi_load = async function() {
    if (!_cache.length) await _load();
    const abertas = _cache.filter(r => ["ABERTA","EM_ANALISE","EM_ANDAMENTO"].includes(_toDb(r.status))).length;
    const kpi = document.getElementById("area-kpi-dem");
    if (kpi) kpi.textContent = abertas;

    const badgeEl = document.getElementById("area-badge-solicitacoes");
    if (badgeEl) {
      badgeEl.textContent = abertas > 0
        ? `${abertas} em andamento · ${_cache.length} total`
        : `${_cache.length} total`;
    }

    const elDem = document.getElementById("area-dash-dem");
    if (!elDem) return;
    const recentes = [..._cache].sort((a,b) => (b.criado_em||"").localeCompare(a.criado_em||"")).slice(0,6);
    if (!recentes.length) {
      elDem.innerHTML = `<div class="empty-state">Nenhuma solicitação registrada.</div>`;
      return;
    }

    elDem.innerHTML = recentes.map(r =>
      `<div class="trow" style="cursor:pointer" onclick="window.demAbrirDetalhe('${r.id||r._row}','area-dem')">
        <div class="tdot" style="background:${catCor(r.area)}"></div>
        <div class="tbody">
          <div class="ttitle">${catIcon(r.area)} ${escapeHtml(r.titulo||"—")}${r.numero_chamado ? ` <span style="font-size:10px;font-weight:600;color:var(--acc,#4a9cf5);letter-spacing:.04em">${escapeHtml(r.numero_chamado)}</span>` : ""}</div>
          <div class="tmeta">${r.area||"—"}${r.subcategoria?" · "+r.subcategoria:""} · ${fmtD(r.criado_em)}</div>
        </div>
        <div class="tright">${pillStatus(r.status)}</div>
      </div>`
    ).join("") + `<div style="margin-top:10px"><button class="tbt" onclick="go('area-dem')">Ver todas →</button></div>`;
  };

  document.addEventListener("sipen:navigate", async ({ detail: { id } }) => {
    if (id && id.startsWith("dem-")) _aplicarMenuDem();
    const MAP = {
      "dem-dash":    () => renderDash(),
      "dem-todas":   () => renderLista("dem-todas-content"),
      "dem-analise": () => renderLista("dem-analise-content", { status:"EM_ANALISE" }),
      "dem-and":     () => renderLista("dem-and-content",     { status:"EM_ANDAMENTO" }),
      "dem-conc":    () => renderLista("dem-conc-content",    { status:["CONCLUIDA","PAGO"] }),
      "dem-pri":               () => renderLista("dem-pri-content",             { prioridade:"Alta" }),
      "dem-hist":              () => renderLista("dem-hist-content"),
      "admin-demandas":        () => _admRender(),
      "admin-demandas-adm":    async () => { _admFiltro = "Administrativo"; try { localStorage.setItem(_ADM_KEY, _admFiltro); } catch(_){} await go("admin-demandas"); },
      "fin-demandas":          () => _finRender(),
      "conselho-demandas": () => {
        const inp = document.getElementById("conselho-demandas-content-fstatus");
        if (inp) inp.value = "Aberta";
        document.querySelectorAll("#cd-st1 .dem-stab").forEach((t, i) => t.classList.toggle("on", i === 0));
        renderLista("conselho-demandas-content");
      },
      "conselho-demandas-cons": () => {
        const inp = document.getElementById("conselho-demandas-cons-content-fstatus");
        if (inp) inp.value = "Aberta";
        document.querySelectorAll("#cd-st2 .dem-stab").forEach((t, i) => t.classList.toggle("on", i === 0));
        renderLista("conselho-demandas-cons-content", { area:"Conselho" });
      },
      "infra-dash":            () => _renderInfraDash(),
      "infra-man":             () => _manRenderInternal(),
      "infra-demandas":        () => renderLista("infra-demandas-content",       { area: _INFRA_AREAS }),
      "infra-demandas-infra":  () => renderLista("infra-demandas-infra-content", { area: "Infraestrutura e Conservação" }),
      "jur-demandas-tab":      () => renderLista("jur-demandas-tab-content"),
      "jur-demandas-jur":      () => renderLista("jur-demandas-jur-content",        { area:"Jurídico" }),
      "pastoral-demandas":     () => renderLista("pastoral-demandas-content",       { area:"Pastoral" }),
      "pastoral-demandas-pas": () => renderLista("pastoral-demandas-pas-content",   { area:"Pastoral" }),
      "pastoral-ate":          () => listarModulo("DEMANDAS", "pastoral-ate-list",  { area:"Pastoral" }),
      "pastoral-ora":          () => listarModulo("DEMANDAS", "pastoral-ora-list",  { area:"Pastoral" }),
      "pastoral-reg":          () => listarModulo("DEMANDAS", "pastoral-reg-list",  { area:"Pastoral" }),
      "pastoral-pri":          () => _carregarCasosPri(),
      "pastoral-aco":          () => listarModulo("MEMBROS",  "pastoral-aco-list"),
      "area-dem":              () => renderLista("area-dem-content"),
    };
    if (MAP[id]) await MAP[id]();
  });

  // ── Casos Prioritários (Pastoral) ─────────────────────────────────────
  const _CP_LB  = 'display:block;font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px';
  const _CP_INP = 'width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg-card));color:var(--tx1);font-size:13px;box-sizing:border-box';
  let _cpModalEl = null;
  let _cpEditId  = null;

  function _garantirModalCasoPri() {
    if (_cpModalEl) return _cpModalEl;
    const el = document.createElement('div');
    el.id = 'modal-caso-pri';
    el.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center;padding:16px';
    el.innerHTML = `
      <div style="background:var(--bg-card);border-radius:12px;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.4)">
        <div style="padding:20px 24px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--bg-card);z-index:1">
          <div>
            <div style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Pastoral · Casos Prioritários</div>
            <div id="cp-modal-title" style="font-size:17px;font-weight:700;color:var(--tx1)">Novo Caso</div>
          </div>
          <button onclick="document.getElementById('modal-caso-pri').style.display='none'" style="background:none;border:none;font-size:22px;color:var(--tx3);cursor:pointer;padding:4px 8px;border-radius:6px">×</button>
        </div>
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px">
          <div>
            <label style="${_CP_LB}">Nome da Pessoa <span style="color:var(--rose)">*</span></label>
            <input type="text" id="cp-solicitante" style="${_CP_INP}" placeholder="Nome da pessoa">
          </div>
          <div>
            <label style="${_CP_LB}">Motivo / Título <span style="color:var(--rose)">*</span></label>
            <input type="text" id="cp-titulo" style="${_CP_INP}" placeholder="Motivo do caso prioritário">
          </div>
          <div>
            <label style="${_CP_LB}">Situação / Descrição</label>
            <textarea id="cp-descricao" rows="3" style="${_CP_INP};resize:vertical;height:auto;font-family:inherit" placeholder="Descreva a situação..."></textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="${_CP_LB}">Prioridade</label>
              <select id="cp-prioridade" style="${_CP_INP}">
                <option value="Urgente">Urgente</option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
            </div>
            <div>
              <label style="${_CP_LB}">Status</label>
              <select id="cp-status" style="${_CP_INP}">
                <option value="ABERTA">Aberto</option>
                <option value="EM_ANDAMENTO">Em Acompanhamento</option>
                <option value="CONCLUIDA">Resolvido</option>
                <option value="PAGO">Pago</option>
                <option value="CANCELADA">Arquivado</option>
              </select>
            </div>
          </div>
          <div>
            <label style="${_CP_LB}">Responsável pelo Acompanhamento</label>
            <input type="text" id="cp-responsavel" style="${_CP_INP}" placeholder="Nome do responsável">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="${_CP_LB}">Data de Abertura</label>
              <input type="date" id="cp-data-abertura" style="${_CP_INP}">
            </div>
          </div>
          <div id="cp-err" style="color:var(--rose);font-size:12px;display:none"></div>
        </div>
        <div style="padding:16px 24px 20px;border-top:1px solid var(--bd1);display:flex;gap:10px;justify-content:flex-end;position:sticky;bottom:0;background:var(--bg-card)">
          <button onclick="document.getElementById('modal-caso-pri').style.display='none'" style="padding:9px 20px;border-radius:8px;border:1px solid var(--bd2);background:none;color:var(--tx2);font-size:13px;cursor:pointer">Cancelar</button>
          <button id="cp-btn" onclick="_salvarCasoPri()" style="padding:9px 24px;border-radius:8px;border:none;background:var(--rose);color:#fff;font-size:13px;font-weight:600;cursor:pointer">Salvar</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    _cpModalEl = el;
    return el;
  }

  window.abrirModalCasoPri = function(id, dados) {
    _cpEditId = id || null;
    const modal = _garantirModalCasoPri();
    const hoje = new Date().toISOString().slice(0, 10);
    document.getElementById('cp-modal-title').textContent = id ? 'Editar Caso Prioritário' : 'Novo Caso Prioritário';
    document.getElementById('cp-err').style.display = 'none';
    document.getElementById('cp-solicitante').value    = dados?.solicitante    || '';
    document.getElementById('cp-titulo').value         = dados?.titulo         || '';
    document.getElementById('cp-descricao').value      = dados?.descricao      || '';
    document.getElementById('cp-responsavel').value    = dados?.responsavel    || '';
    document.getElementById('cp-prioridade').value     = dados?.prioridade     || 'Alta';
    document.getElementById('cp-status').value         = dados?.status         || 'ABERTA';
    document.getElementById('cp-data-abertura').value  = dados?.data_abertura  ? dados.data_abertura.slice(0,10)  : hoje;
    modal.style.display = 'flex';
  };

  window._salvarCasoPri = async function() {
    const solicitante = (document.getElementById('cp-solicitante').value || '').trim();
    const titulo      = (document.getElementById('cp-titulo').value      || '').trim();
    const errEl       = document.getElementById('cp-err');
    if (!solicitante || !titulo) {
      errEl.textContent = 'Nome da pessoa e Motivo são obrigatórios.';
      errEl.style.display = '';
      return;
    }
    const btn = document.getElementById('cp-btn');
    btn.disabled = true; btn.textContent = 'Salvando...';
    errEl.style.display = 'none';

    const payload = {
      titulo,
      solicitante,
      descricao:      (document.getElementById('cp-descricao').value   || '').trim() || null,
      responsavel:    (document.getElementById('cp-responsavel').value || '').trim() || null,
      prioridade:     document.getElementById('cp-prioridade').value   || 'Alta',
      status:         document.getElementById('cp-status').value       || 'ABERTA',
      area:           'Pastoral',
      data_abertura:  document.getElementById('cp-data-abertura').value  || null,
    };

    try {
      const r = _cpEditId
        ? await fetch(`${SUPABASE_URL}/rest/v1/demandas?id=eq.${_cpEditId}`,
            { method:'PATCH', headers: apiHeaders({'Prefer':'return=representation'}), body: JSON.stringify(payload) })
        : await fetch(`${SUPABASE_URL}/rest/v1/demandas`,
            { method:'POST',  headers: apiHeaders({'Prefer':'return=representation'}), body: JSON.stringify(payload) });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.message || `HTTP ${r.status}`);
      }
      document.getElementById('modal-caso-pri').style.display = 'none';
      await _carregarCasosPri();
    } catch(e) {
      console.error('_salvarCasoPri:', e);
      errEl.textContent = e.message;
      errEl.style.display = '';
    } finally {
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  };

  async function _carregarCasosPri() {
    const el = document.getElementById('pastoral-pri-list');
    if (!el) return;
    el.innerHTML = '<div style="color:var(--tx3);font-size:11.5px;padding:8px 0">Carregando...</div>';
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/demandas?area=eq.Pastoral&order=criado_em.desc` +
        `&select=id,titulo,solicitante,descricao,prioridade,status,responsavel,data_abertura,data_conclusao`,
        { headers: apiHeaders() }
      );
      if (!r.ok) throw new Error(await r.text());
      const lista = await r.json();

      if (lista.length === 0) {
        el.innerHTML = `<div style="text-align:center;padding:32px 0;color:var(--tx3)">
          <div style="font-size:28px;margin-bottom:8px">🚨</div>
          <div style="font-size:12px;margin-bottom:12px">Nenhum caso prioritário registrado.</div>
          <button onclick="abrirModalCasoPri()" style="background:var(--rose);border:none;border-radius:6px;padding:8px 16px;color:#fff;font-size:11.5px;font-weight:600;cursor:pointer">+ Novo Caso</button>
        </div>`;
        return;
      }

      const PRIO_COR = {Urgente:'#ef4444',Alta:'#e97316',Média:'#d4a843',Baixa:'#2ab5c0'};
      const ST_LBL   = {ABERTA:'Aberto',EM_ANALISE:'Em Análise',EM_ANDAMENTO:'Em Acompanhamento',PENDENTE:'Pendente',CONCLUIDA:'Resolvido',PAGO:'Pago',CANCELADA:'Arquivado'};
      const ST_BG    = {ABERTA:'rgba(239,68,68,.1)',EM_ANALISE:'rgba(212,168,67,.1)',EM_ANDAMENTO:'rgba(74,156,245,.1)',CONCLUIDA:'rgba(58,170,92,.1)',PAGO:'rgba(58,170,92,.1)',CANCELADA:'rgba(100,100,100,.1)'};
      const ST_CL    = {ABERTA:'#ef4444',EM_ANALISE:'#d4a843',EM_ANDAMENTO:'#4a9cf5',CONCLUIDA:'#3aaa5c',PAGO:'#3aaa5c',CANCELADA:'#888'};

      el.innerHTML = `
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12.5px">
            <thead><tr style="border-bottom:2px solid var(--bd1)">
              <th style="text-align:left;padding:8px 10px;color:var(--tx3);font-weight:600;font-size:11px">Pessoa</th>
              <th style="text-align:left;padding:8px 10px;color:var(--tx3);font-weight:600;font-size:11px">Motivo</th>
              <th style="text-align:left;padding:8px 10px;color:var(--tx3);font-weight:600;font-size:11px">Status</th>
              <th style="text-align:left;padding:8px 10px;color:var(--tx3);font-weight:600;font-size:11px">Responsável</th>
              <th style="text-align:left;padding:8px 10px;color:var(--tx3);font-weight:600;font-size:11px">Abertura</th>
              <th style="padding:8px 10px"></th>
            </tr></thead>
            <tbody>${lista.map(c => {
              const pCor  = PRIO_COR[c.prioridade] || '#888';
              const stLbl = ST_LBL[c.status]        || c.status || '—';
              const stBg  = ST_BG[c.status]          || 'rgba(100,100,100,.1)';
              const stCl  = ST_CL[c.status]          || '#888';
              const dtAb  = c.data_abertura ? c.data_abertura.slice(0,10) : '—';
              return `<tr style="border-bottom:1px solid var(--bd1)">
                <td style="padding:8px 10px;color:var(--tx1);font-weight:500">${nomePropio(c.solicitante) || "—"}</td>
                <td style="padding:8px 10px;color:var(--tx2);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(c.titulo || '')}">${escapeHtml(c.titulo || '—')}</td>
                <td style="padding:8px 10px"><span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${stBg};color:${stCl}">${escapeHtml(stLbl)}</span></td>
                <td style="padding:8px 10px;color:var(--tx2)">${nomePropio(c.responsavel) || "—"}</td>
                <td style="padding:8px 10px;color:var(--tx3);font-size:11px">${dtAb}</td>
                <td style="padding:8px 10px;text-align:right;white-space:nowrap">
                  <button onclick='abrirModalCasoPri(${JSON.stringify(c.id)},${safeJsonForHtml(c)})' style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:4px;color:var(--tx2);font-size:10px;padding:3px 8px;cursor:pointer;margin-right:4px">✏️</button>
                  <button onclick='_deletarCasoPri(${JSON.stringify(c.id)})' style="background:rgba(224,85,85,0.08);border:1px solid rgba(224,85,85,0.18);border-radius:4px;color:var(--rose);font-size:10px;padding:3px 8px;cursor:pointer">🗑</button>
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>`;
    } catch(e) {
      console.error('_carregarCasosPri:', e);
      el.innerHTML = `<div style="color:var(--rose);font-size:12px;padding:8px 0">Erro: ${escapeHtml(e.message)}</div>`;
    }
  }

  window._deletarCasoPri = async function(id) {
    if (!confirm('Remover este caso prioritário?')) return;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/demandas?id=eq.${id}`, {
        method:'DELETE', headers: apiHeaders(),
      });
      if (!r.ok) throw new Error(await r.text());
      _carregarCasosPri();
    } catch(e) {
      alert('Erro ao remover: ' + e.message);
    }
  };

  window.adminDemSetFiltro = _admSetFiltro;
  window.adminDemFiltrar   = function() { _admRender(); };

  /* ── Seleção e impressão: Demandas Financeiras ─────── */

  let _demSolTimer = null;

  const _finSel = new Set();
  let _finRowsAtual = [];

  async function _finRenderLista(filtrosFixos) {
    const elId = "fin-demandas-content";
    const el   = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `<div style="padding:8px 0;color:var(--tx3);font-size:11.5px">${_sp()} Carregando...</div>`;

    if (!_cache.length) await _load();

    /* Deduplica por ID antes de qualquer filtro */
    const _finSeen = new Map();
    for (const r of _cache) {
      const key = String(r.id ?? r._row ?? "");
      if (key && !_finSeen.has(key)) _finSeen.set(key, r);
    }
    let rows = [..._finSeen.values()];

    if (filtrosFixos) {
      Object.entries(filtrosFixos).forEach(([k, v]) => {
        if (!v) return;
        if (k === "prioridade" && v === "Alta") {
          rows = rows.filter(r => ["Alta","Urgente"].includes(r.prioridade));
        } else if (k === "status") {
          const vArr2 = Array.isArray(v) ? v.map(_toDb) : [_toDb(String(v))];
          rows = rows.filter(r => vArr2.includes(_toDb(String(r[k]||""))));
        } else if (Array.isArray(v)) {
          rows = rows.filter(r => v.includes(String(r[k]||"")));
        } else {
          rows = rows.filter(r => String(r[k]||"") === String(v));
        }
      });
    }

    const fStatus = document.getElementById(elId+"-fstatus")?.value || "";
    const fPrio   = document.getElementById(elId+"-fprio")?.value   || "";
    const fBusca  = (document.getElementById(elId+"-fbusca")?.value || "").toLowerCase();

    if (fStatus) rows = rows.filter(r => _toDb(r.status) === _toDb(fStatus));
    if (fPrio)   rows = rows.filter(r => r.prioridade === fPrio);
    if (fBusca)  rows = rows.filter(r =>
      (r.titulo||"").toLowerCase().includes(fBusca) ||
      (r.solicitante||"").toLowerCase().includes(fBusca) ||
      (r.responsavel||"").toLowerCase().includes(fBusca) ||
      (r.area||"").toLowerCase().includes(fBusca) ||
      (r.subcategoria||"").toLowerCase().includes(fBusca)
    );

    rows.sort((a,b) => (b.criado_em||"").localeCompare(a.criado_em||""));
    _finRowsAtual = rows;

    if (rows.length === 0) {
      el.innerHTML = '<div style="color:var(--tx3);font-size:11.5px;padding:8px 0">Nenhuma demanda encontrada.</div>';
      _finAtualizarToolbar();
      return;
    }

    const allIds   = rows.map(r => String(r.id||r._row));
    const todosSel = allIds.length > 0 && allIds.every(id => _finSel.has(id));
    const nSel     = allIds.filter(id => _finSel.has(id)).length;

    el.innerHTML = `
      <div id="fin-dem-toolbar" style="display:${nSel>0?"flex":"none"};align-items:center;gap:10px;padding:4px 0 12px;flex-wrap:wrap">
        <span id="fin-dem-contador" style="font-size:11.5px;color:var(--tx3);font-weight:600">${nSel} demanda${nSel!==1?"s":""} selecionada${nSel!==1?"s":""}</span>
        <button class="tbt" style="font-size:10.5px;padding:4px 10px" onclick="window._finLimparSel()">Limpar seleção</button>
        <button class="tbt" style="font-size:10.5px;padding:4px 12px;background:rgba(58,170,92,.1);border-color:rgba(58,170,92,.3);color:var(--gr);font-weight:700" onclick="window._finImprimir()">⎙ Imprimir Selecionadas</button>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="border-bottom:1px solid var(--bd2)">
              <th style="padding:8px 2px;width:36px;vertical-align:middle;text-align:center">
                <input type="checkbox" id="fin-dem-chk-all" ${todosSel?"checked":""} onchange="window._finToggleTodos(this.checked)" style="width:15px;height:15px;cursor:pointer;accent-color:var(--gr)">
              </th>
              ${["Categoria","Subcategoria","Título","Solicitante","Responsável","Valor","Forma Pgto.","Status","Abertura"].map((h,i) =>
                `<th style="text-align:${i===5?"right":"left"};padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`
              ).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => {
              const rid = String(r.id||r._row);
              const sel = _finSel.has(rid);
              return `
              <tr id="fin-dem-row-${rid}" style="border-bottom:1px solid var(--bd1);background:${sel?"rgba(58,170,92,.06)":""}"
                  onmouseover="if(!document.getElementById('fin-dem-chk-${rid}')?.checked)this.style.background='var(--bg-hover)'"
                  onmouseout="this.style.background=document.getElementById('fin-dem-chk-${rid}')?.checked?'rgba(58,170,92,.06)':''">
                <td style="padding:8px 2px;vertical-align:middle;text-align:center" onclick="event.stopPropagation()">
                  <input type="checkbox" id="fin-dem-chk-${rid}" ${sel?"checked":""} onchange="window._finToggleSel('${rid}',this.checked)" style="width:15px;height:15px;cursor:pointer;accent-color:var(--gr)">
                </td>
                <td style="padding:8px 6px;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">
                  <span style="font-size:11px;font-weight:600;color:${catCor(r.area)}">${catIcon(r.area)} ${r.area||"—"}</span>
                </td>
                <td style="padding:8px 6px;color:var(--tx2);font-size:11px;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${r.subcategoria||"—"}</td>
                <td style="padding:8px 6px;color:var(--tx1);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${escapeHtml(r.titulo)||"—"}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${nomePropio(r.solicitante||r.solicitante_txt)||"—"}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${nomePropio(r.responsavel||r.responsavel_txt)||"—"}</td>
                <td style="padding:8px 6px;text-align:right;font-weight:700;color:var(--tx1);white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${r.financial_data?.valor!=null?`R$ ${parseFloat(r.financial_data.valor).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"}</td>
                <td style="padding:8px 6px;color:var(--tx2);font-size:11px;white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${escapeHtml(r.financial_data?.forma_pagamento||"—")}</td>
                <td style="padding:8px 6px;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${pillStatus(r.status)}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${fmtD(r.data_abertura||r.criado_em)}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
    _finAtualizarToolbar();
  }

  function _finAtualizarToolbar() {
    const toolbar  = document.getElementById("fin-dem-toolbar");
    const contador = document.getElementById("fin-dem-contador");
    if (!toolbar) return;
    const n = _finSel.size;
    toolbar.style.display = n > 0 ? "flex" : "none";
    if (contador) contador.textContent = `${n} demanda${n!==1?"s":""} selecionada${n!==1?"s":""}`;
  }

  window._finToggleSel = function(id, checked) {
    if (checked) _finSel.add(id); else _finSel.delete(id);
    const row = document.getElementById(`fin-dem-row-${id}`);
    if (row) row.style.background = checked ? "rgba(58,170,92,.06)" : "";
    const allIds = _finRowsAtual.map(r => String(r.id||r._row));
    const chkAll = document.getElementById("fin-dem-chk-all");
    if (chkAll) chkAll.checked = allIds.length > 0 && allIds.every(i => _finSel.has(i));
    _finAtualizarToolbar();
  };

  window._finToggleTodos = function(checked) {
    _finRowsAtual.forEach(r => {
      const id  = String(r.id||r._row);
      const chk = document.getElementById(`fin-dem-chk-${id}`);
      const row = document.getElementById(`fin-dem-row-${id}`);
      if (checked) _finSel.add(id); else _finSel.delete(id);
      if (chk) chk.checked = checked;
      if (row) row.style.background = checked ? "rgba(58,170,92,.06)" : "";
    });
    _finAtualizarToolbar();
  };

  window._finLimparSel = function() {
    _finRowsAtual.forEach(r => {
      const id  = String(r.id||r._row);
      _finSel.delete(id);
      const chk = document.getElementById(`fin-dem-chk-${id}`);
      const row = document.getElementById(`fin-dem-row-${id}`);
      if (chk) chk.checked = false;
      if (row) row.style.background = "";
    });
    const chkAll = document.getElementById("fin-dem-chk-all");
    if (chkAll) chkAll.checked = false;
    _finAtualizarToolbar();
  };

  window._finImprimir = function() {
    const sel  = [..._finSel];
    const rows = _finRowsAtual.filter(r => sel.includes(String(r.id||r._row)));
    if (!rows.length) {
      if (typeof T==="function") T("Nenhuma demanda selecionada","Marque ao menos uma demanda para imprimir");
      return;
    }

    const now      = new Date();
    const emissao  = `${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`;
    const abaLabel = {"Financeiro":"Financeiras","Administrativo":"Secretaria","Infraestrutura e Conservação":"Infraestrutura","":"Todas"}[_finFiltro] ?? (_finFiltro||"Todas");
    const fmtVal   = v => v?.valor!=null ? `R$ ${parseFloat(v.valor).toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "—";

    const ST_COR  = {"Aberta":"#1565c0","Em Análise":"#f57f17","Em Andamento":"#6a1b9a","Concluída":"#2e7d32","Pago":"#2e7d32","Cancelada":"#555","Pendente":"#e65100","Aguardando Pagamento":"#f57f17"};
    const PR_COR  = {"Urgente":"#c62828","Alta":"#c62828","Média":"#f57f17","Baixa":"#2e7d32"};

    const linhas = rows.map((r, i) => {
      const label = _toLabel(r.status||"");
      const stC   = ST_COR[label]       || "#555";
      const prC   = PR_COR[r.prioridade]|| "#555";
      const sep   = i < rows.length-1 ? "border-bottom:1.5px solid #ddd;margin-bottom:24px;padding-bottom:24px" : "";
      return `
      <div style="${sep}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
          <span style="font-size:9.5px;color:#888;font-weight:600;background:#f0f0f0;padding:2px 7px;border-radius:4px">#${r.id||r._row||"—"}</span>
          <span style="font-size:10px;font-weight:700;padding:2px 10px;border-radius:10px;background:${stC}18;color:${stC}">${label}</span>
        </div>
        <div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:11px">${escapeHtml(r.titulo)||"Sem título"}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px 28px">
          <div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Categoria</div><div style="font-size:11.5px;color:#1a1a1a">${r.area||"—"}</div></div>
          <div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Subcategoria</div><div style="font-size:11.5px;color:#1a1a1a">${r.subcategoria||"—"}</div></div>
          <div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Solicitante</div><div style="font-size:11.5px;color:#1a1a1a">${nomePropio(r.solicitante||r.solicitante_txt) || "—"}</div></div>
          <div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Responsável</div><div style="font-size:11.5px;color:#1a1a1a">${nomePropio(r.responsavel||r.responsavel_txt) || "—"}</div></div>
          <div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Valor</div><div style="font-size:12px;font-weight:700;color:#1a1a1a">${fmtVal(r.financial_data)}</div></div>
          <div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Forma de Pagamento</div><div style="font-size:11.5px;color:#1a1a1a">${escapeHtml(r.financial_data?.forma_pagamento||"—")}</div></div>
          ${r.financial_data?.chave_pix?`<div style="grid-column:1/-1"><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Chave PIX</div><div style="font-size:11.5px;color:#1a1a1a;font-weight:600">${escapeHtml(r.financial_data.chave_pix)}</div></div>`:""}
          ${r.financial_data?.beneficiario?`<div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Beneficiário</div><div style="font-size:11.5px;color:#1a1a1a">${escapeHtml(r.financial_data.beneficiario)}</div></div>`:""}
          ${r.financial_data?.banco?`<div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Banco</div><div style="font-size:11.5px;color:#1a1a1a">${escapeHtml(r.financial_data.banco)}</div></div>`:""}
          <div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Data de Abertura</div><div style="font-size:11.5px;color:#1a1a1a">${fmtD(r.data_abertura||r.criado_em)}</div></div>
          ${r.descricao||r.observacoes?`<div style="grid-column:1/-1"><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Observações</div><div style="font-size:11.5px;color:#1a1a1a;white-space:pre-wrap">${escapeHtml(r.descricao||r.observacoes)}</div></div>`:""}
        </div>
      </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Demandas Financeiras — ${emissao}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a1a;background:#fff;padding:18mm 20mm 20mm}
@page{size:A4;margin:0}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1a1a1a;padding-bottom:10px;margin-bottom:20px">
  <div>
    <div style="font-size:20px;font-weight:700">Demandas Financeiras</div>
    <div style="font-size:11px;color:#555;margin-top:3px">Aba: <b>${abaLabel}</b> · <b>${rows.length}</b> demanda${rows.length!==1?"s":""} selecionada${rows.length!==1?"s":""}</div>
  </div>
  <div style="text-align:right;font-size:10px;color:#555;line-height:1.7">IPPenha — SIPEN<br>Emitido em ${emissao}</div>
</div>
${linhas}
</body></html>`;

    const w = window.open("","_blank","width=900,height=700");
    if (!w) { if (typeof T==="function") T("Pop-up bloqueado","Permita pop-ups para este site"); return; }
    w.document.write(html);
    w.document.close();
    if (w.document.readyState === "complete") { w.focus(); w.print(); }
    else w.onload = () => { w.focus(); w.print(); };
  };

  window.finDemSetFiltro = _finSetFiltro;
  window.finDemFiltrar   = function() { _finRender(); };

  /* ══════════════════════════════════════════════════════════
     Manutenção — dashboard rica (padrão Financeiro)
  ══════════════════════════════════════════════════════════ */

  let _manFiltroExtra = null;

  function _manRows() {
    return _cache.filter(r => r.area === "Manutenção");
  }

  async function _manRenderInternal() {
    if (!_cache.length) await _load();
    const rows    = _manRows();
    const hoje    = new Date();
    const mesAtual = hoje.toISOString().slice(0, 7);
    const todayStr = hoje.toISOString().split("T")[0];

    const nAbertas = rows.filter(r => _toLabel(r.status) === "Aberta").length;
    const nAnd     = rows.filter(r => _toLabel(r.status) === "Em Andamento").length;
    const nPend    = rows.filter(r => ["Pendente","Em Análise"].includes(_toLabel(r.status))).length;
    const nConc    = rows.filter(r => _toLabel(r.status) === "Concluída" && (r.data_conclusao||"").startsWith(mesAtual)).length;
    const nAtras   = rows.filter(r => {
      const pz = r.prazo_previsto;
      return pz && pz < todayStr && !["Concluída","Cancelada"].includes(_toLabel(r.status));
    }).length;
    const nPrev = rows.filter(r => (r.tipo||"").toLowerCase().includes("preventiva")).length;
    const nCor  = rows.filter(r => (r.tipo||"").toLowerCase().includes("corretiva")).length;

    const concl = rows.filter(r => _toLabel(r.status) === "Concluída" && r.data_conclusao && r.criado_em);
    let tempoMedio = "—";
    if (concl.length) {
      const totalDias = concl.reduce((acc, r) =>
        acc + Math.max(0, (new Date(r.data_conclusao) - new Date(r.criado_em)) / 86400000), 0);
      tempoMedio = Math.round(totalDias / concl.length) + " d";
    }

    const sv = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    sv("man-kpi-abertas", nAbertas);
    sv("man-kpi-and",     nAnd);
    sv("man-kpi-pend",    nPend);
    sv("man-kpi-conc",    nConc);
    sv("man-kpi-atras",   nAtras);
    sv("man-kpi-prev",    nPrev);
    sv("man-kpi-cor",     nCor);
    sv("man-kpi-tempo",   tempoMedio);

    _manRenderLista();
  }

  function _manRenderLista() {
    const el = document.getElementById("man-list-content");
    if (!el) return;

    let rows = _manRows();
    const todayStr = new Date().toISOString().split("T")[0];

    if (_manFiltroExtra) {
      const { tipo, val } = _manFiltroExtra;
      if (tipo === "status") {
        rows = rows.filter(r => _toLabel(r.status) === val);
      } else if (tipo === "tipo") {
        rows = rows.filter(r => (r.tipo||"").toLowerCase().includes(val.toLowerCase()));
      } else if (tipo === "atrasadas") {
        rows = rows.filter(r => {
          const pz = r.prazo_previsto;
          return pz && pz < todayStr && !["Concluída","Cancelada"].includes(_toLabel(r.status));
        });
      }
    } else {
      const fStatus = document.getElementById("man-list-fstatus")?.value || "";
      const fPrio   = document.getElementById("man-list-fprio")?.value   || "";
      const fBusca  = (document.getElementById("man-list-fbusca")?.value || "").toLowerCase();
      if (fStatus) rows = rows.filter(r => _toLabel(r.status) === fStatus);
      if (fPrio)   rows = rows.filter(r => r.prioridade === fPrio);
      if (fBusca)  rows = rows.filter(r =>
        (r.titulo||"").toLowerCase().includes(fBusca)          ||
        (r.descricao||"").toLowerCase().includes(fBusca)       ||
        (r.responsavel||r.responsavel_txt||"").toLowerCase().includes(fBusca) ||
        (r.solicitante||r.solicitante_txt||"").toLowerCase().includes(fBusca) ||
        (r.subcategoria||"").toLowerCase().includes(fBusca)
      );
    }

    rows.sort((a, b) => (b.criado_em||"").localeCompare(a.criado_em||""));

    if (!rows.length) {
      el.innerHTML = '<div style="color:var(--tx3);font-size:11.5px;padding:8px 0">Nenhuma OS encontrada.</div>';
      return;
    }

    el.innerHTML = `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="border-bottom:1px solid var(--bd2)">
              ${["Título","Subcategoria","Solicitante","Responsável","Status","Abertura","Prazo"].map(h =>
                `<th style="text-align:left;padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`
              ).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => {
              const rid      = String(r.id||r._row);
              const pz       = r.prazo_previsto;
              const atrasada = pz && pz < todayStr && !["Concluída","Cancelada"].includes(_toLabel(r.status));
              const stLabel  = _toLabel(r.status);
              return `
              <tr style="border-bottom:1px solid var(--bd1)${atrasada?";background:rgba(224,85,85,0.04)":""}"
                  onmouseover="this.style.background='var(--bg-hover)'"
                  onmouseout="this.style.background='${atrasada?"rgba(224,85,85,0.04)":""}'">
                <td style="padding:8px 6px;color:var(--tx1);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${rid}','infra-man')">${escapeHtml(r.titulo)||"—"}</td>
                <td style="padding:8px 6px;color:var(--tx2);font-size:11px;white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${rid}','infra-man')">${escapeHtml(r.subcategoria)||"—"}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${rid}','infra-man')">${nomePropio(r.solicitante||r.solicitante_txt)||"—"}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${rid}','infra-man')">${nomePropio(r.responsavel||r.responsavel_txt)||"—"}</td>
                <td style="padding:4px 6px" onclick="event.stopPropagation()">
                  <select onchange="window.manStatusChange('${rid}',this.value)" style="font-size:11px;padding:3px 6px;border-radius:5px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);cursor:pointer">
                    ${["Aberta","Em Análise","Em Andamento","Pendente","Concluída","Cancelada"].map(s =>
                      `<option${stLabel===s?" selected":""}>${s}</option>`
                    ).join("")}
                    ${stLabel==="Pago" ? `<option selected>Pago</option>` : ""}
                  </select>
                </td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${rid}','infra-man')">${fmtD(r.data_abertura||r.criado_em)}</td>
                <td style="padding:8px 6px;white-space:nowrap;cursor:pointer;color:${atrasada?"var(--rose)":"var(--tx2)"};font-weight:${atrasada?"700":"400"}" onclick="demAbrirDetalhe('${rid}','infra-man')">${fmtD(r.prazo_previsto)||"—"}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
  }

  window.manRender       = async function()        { await _manRenderInternal(); };
  window.manFiltrar      = function()              { _manFiltroExtra = null; _manRenderLista(); };
  window.manKpiFiltrar   = function(tipo, val)     {
    _manFiltroExtra = { tipo, val };
    ["man-list-fstatus","man-list-fprio","man-list-fbusca"].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = "";
    });
    _manRenderLista();
  };
  window.manStatusChange = async function(id, val) {
    await window.demAtualizarStatus(id, val);
    await _manRenderInternal();
  };

  window.demAtualizarLabels = function() {
    const restrito = !_podeVerTodas();
    const label = restrito ? "Minhas Solicitações" : "Todas as Solicitações";

    const sidebarEl = document.getElementById("si-dem-todas");
    if (sidebarEl) {
      const span = sidebarEl.querySelector("span") || sidebarEl;
      span.textContent = label;
    }

    const hero = document.querySelector("#v-dem-todas .hero-ttl");
    if (hero) hero.textContent = label;
  };

  const _PERFIS_RESTRITOS_DEM = ["MEMBRO_IGREJA", "MEMBRO_MINISTERIO", "LIDER_MINISTERIO"];

  function _aplicarMenuDem() {
    if (typeof USUARIO_ATUAL === "undefined" || !USUARIO_ATUAL) return;
    const perfil = (USUARIO_ATUAL.perfil || "").toUpperCase();
    const isAdmin = !_PERFIS_RESTRITOS_DEM.includes(perfil);
    document.body.classList.toggle("dem-admin", isAdmin);
  }

  window.aplicarMenuDemandasPorPerfil = _aplicarMenuDem;

  if(typeof VIEW_AUTOLOAD!=='undefined'){
    VIEW_AUTOLOAD['dem-dash']={fn: renderDash};
  }

})();
