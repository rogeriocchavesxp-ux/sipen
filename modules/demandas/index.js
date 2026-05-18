/* ═══════════════════════════════════════════════════════
   SIPEN — Módulo Solicitações e Demandas
   demandas.js · v2.1
   15 categorias + subcategorias + fluxo de status completo
═══════════════════════════════════════════════════════ */

(function () {

  /* ── Categorias e roteamento automático ─────────────── */

  const CATS = [
    { id:"conselho",    nome:"Conselho",                icon:"🏛",  cor:"var(--sky)",    resp:"Conselho / Jurídico",
      subcats:["Envio de documentos ao Conselho","Solicitação de aprovação","Análise jurídica","Questões disciplinares"] },
    { id:"agendamentos",nome:"Agendamentos",            icon:"📅",  cor:"var(--teal)",   resp:"Secretaria / Administração",
      subcats:["Solicitação de uso de sala","Agendamento de culto/evento","Reserva de espaço","Inclusão em calendário oficial","Cancelamento/alteração de agenda"] },
    { id:"manutencao",  nome:"Manutenção",              icon:"🛠",  cor:"var(--amber)",  resp:"Departamento de Manutenção",
      subcats:["Elétrica","Hidráulica","Estrutural","Equipamentos","Pequenos reparos"] },
    { id:"limpeza",     nome:"Limpeza e Organização",   icon:"🧹",  cor:"var(--teal)",   resp:"Equipe de Limpeza / Zeladoria",
      subcats:["Limpeza geral","Limpeza pós-evento","Organização de espaços","Solicitação de materiais de limpeza"] },
    { id:"logistica",   nome:"Logística",               icon:"🚚",  cor:"var(--amber)",  resp:"Logística / Apoio ao Culto",
      subcats:["Montagem/desmontagem de estrutura","Transporte de equipamentos","Apoio em eventos","Organização de cadeiras e mesas"] },
    { id:"financeiro",  nome:"Financeiro",              icon:"💰",  cor:"var(--gr)",     resp:"Tesouraria / Financeiro",
      subcats:["Solicitação de pagamento","Reembolso","Prestação de contas","Solicitação de verba","Orçamento de despesas"] },
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
      const p = typeof PERFIS !== "undefined" ? PERFIS[USUARIO_ATUAL.perfil] : null;
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
    "Cancelada":    "CANCELADA",
  };

  const _STATUS_LABEL = {
    "ABERTA":       "Aberta",
    "EM_ANALISE":   "Em Análise",
    "EM_ANDAMENTO": "Em Andamento",
    "AGUARDANDO_PAGAMENTO": "Aguardando Pagamento",
    "PENDENTE":     "Pendente",
    "CONCLUIDA":    "Concluída",
    "CANCELADA":    "Cancelada",
  };

  function _toDb(st)    { return _STATUS_DB[st]    || st || "ABERTA"; }
  function _toLabel(st) { return _STATUS_LABEL[st] || st || "Aberta"; }

  function pillStatus(st) {
    const label = _toLabel(st);
    const s = STATUS_CFG[label] || { bg:"rgba(90,96,104,.15)", cl:"var(--tx3)" };
    return `<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;background:${s.bg};color:${s.cl}">${label||"—"}</span>`;
  }

  function pillPrio(p) {
    const c = PRIO_CFG[p] || "var(--tx3)";
    return `<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;background:${c}18;color:${c}">${p||"—"}</span>`;
  }

  function fmtD(d) {
    if (!d) return "—";
    const s = d.split("T")[0].split("-");
    return `${s[2]}/${s[1]}/${s[0]}`;
  }

  function _sp() {
    return `<span style="display:inline-block;width:11px;height:11px;border:2px solid var(--gr);border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;vertical-align:middle;margin-right:6px"></span>`;
  }

  /* ── Cache ──────────────────────────────────────────── */

  let _cache = [];
  let _ativo = null;
  let _origemView = "dem-todas"; // rastreia de onde o detalhe foi aberto

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
        /* Admin/gestor: busca tudo via apiRead padrão */
        rows = await apiRead("DEMANDAS");
      } else {
        /* Usuário restrito: query filtrada diretamente em v_demandas */
        rows = await _loadFiltrado();
      }
      _cache = rows.map(r => ({ ...r, status: _toLabel(r.status) }));
      /* Filtro local como camada de segurança adicional */
      _cache = _filtrarVisibilidade(_cache);
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
    const abertas = _cache.filter(r => !["Concluída","Cancelada"].includes(r.status)).length;
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
    const concl    = _cache.filter(r => r.status === "Concluída");
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

    const alertaUrgente = urgentes.length > 0 ? `
      <div class="alr alr-r" style="margin-bottom:16px;cursor:pointer" onclick="window.go('dem-pri')">
        <span class="alr-i">🚨</span>
        <div><strong>${urgentes.length} demanda${urgentes.length>1?"s":""} urgente${urgentes.length>1?"s":""}</strong> aguardando ação —
          ${urgentes.slice(0,3).map(r => `<em>${escapeHtml(r.titulo || r.area) || "—"}</em>`).join(", ")}${urgentes.length>3?" e mais...":""}
        </div>
        <span class="alr-a">Ver →</span>
      </div>` : "";

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
        <div class="kpi" style="cursor:pointer;border-radius:0;border:none;border-right:1px solid var(--bd1)" onclick="window.go('dem-pri')">
          <div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">!</div>
          <div class="kpi-body"><div class="kpi-lbl">Prioritárias</div><div class="kpi-val">${urgentes.length}</div><div class="kpi-d ${urgentes.length>0?"dn":"up"}">alta/urgente</div></div>
        </div>
        <div class="kpi" style="cursor:pointer;border-radius:0;border:none" onclick="window.go('dem-conc')">
          <div class="kpi-ico" style="background:rgba(58,170,92,.12);color:var(--gr)">✓</div>
          <div class="kpi-body"><div class="kpi-lbl">Concluídas</div><div class="kpi-val">${concl.length}</div><div class="kpi-d up">total</div></div>
        </div>
      </div>

      <div class="g2">
        <div class="card">
          <div class="ctit">Solicitações recentes <span class="cact" onclick="demRecarregarDash()">↻ Atualizar</span></div>
          ${recentes.length === 0
            ? '<div style="color:var(--tx3);font-size:11.5px">Nenhuma demanda registrada</div>'
            : recentes.map(r => `
              <div class="trow" style="cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','dem-dash')">
                <div class="tdot" style="background:${catCor(r.area)}"></div>
                <div class="tbody">
                  <div class="ttitle">${catIcon(r.area)} ${escapeHtml(r.titulo) || "Sem título"}</div>
                  <div class="tmeta">${r.area||"—"}${r.subcategoria?" · "+r.subcategoria:""} · ${escapeHtml(r.solicitante || r.solicitante_txt) || "—"} · ${fmtD(r.data_abertura||r.criado_em)}</div>
                </div>
                <div class="tright" style="display:flex;flex-direction:column;gap:3px;align-items:flex-end">
                  ${pillStatus(r.status)}
                  ${pillPrio(r.prioridade)}
                </div>
              </div>`).join("")}
        </div>

        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card">
            <div class="ctit">Pipeline de status</div>
            ${pipeline.map(p => `
              <div style="margin-bottom:9px;cursor:pointer" onclick="window.go('${p.view}')">
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
                  <span style="color:var(--tx2)">${p.label}</span>
                  <span style="color:var(--tx1);font-weight:700">${p.val}</span>
                </div>
                <div style="height:5px;border-radius:3px;background:var(--bd1)">
                  <div style="height:5px;border-radius:3px;background:${p.cor};width:${p.val?Math.max(Math.round(p.val/totalGeral*100),2):0}%;transition:width .3s"></div>
                </div>
              </div>`).join("")}
          </div>

          <div class="card">
            <div class="ctit">Por categoria (em aberto)</div>
            ${catRank.length === 0
              ? '<div style="color:var(--tx3);font-size:11.5px">Sem dados</div>'
              : catRank.map(([cat, qtd]) => `
                <div style="margin-bottom:9px">
                  <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
                    <span style="color:var(--tx2)">${catIcon(cat)} ${cat}</span>
                    <span style="color:var(--tx1);font-weight:700">${qtd}</span>
                  </div>
                  <div style="height:5px;border-radius:3px;background:var(--bd1)">
                    <div style="height:5px;border-radius:3px;background:${catCor(cat)};width:${Math.round(qtd/maxCat*100)}%"></div>
                  </div>
                </div>`).join("")}
          </div>
        </div>
      </div>`;
  }

  window.demRecarregarDash = async function() { _invalidate(); await renderDash(); };

  /* ── Lista com filtros ──────────────────────────────── */

  async function renderLista(elId, filtrosFixos) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `<div style="padding:8px 0;color:var(--tx3);font-size:11.5px">${_sp()} Carregando...</div>`;

    if (!_cache.length) await _load();

    let rows = [..._cache];

    /* Filtros fixos — comparação normalizada (aceita label, código DB ou array) */
    if (filtrosFixos) {
      Object.entries(filtrosFixos).forEach(([k, v]) => {
        if (!v) return;
        if (k === "prioridade" && v === "Alta") {
          rows = rows.filter(r => ["Alta","Urgente"].includes(r.prioridade));
        } else if (k === "status") {
          rows = rows.filter(r => _toDb(String(r[k]||"")) === _toDb(String(v)));
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
              ${["Categoria","Subcategoria","Título","Solicitante","Responsável","Valor","Prior.","Status","Abertura","Conclusão"].map((h,i) =>
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
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${escapeHtml(r.solicitante || r.solicitante_txt) || "—"}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${escapeHtml(r.responsavel || r.responsavel_txt) || "—"}</td>
                <td style="padding:8px 6px;text-align:right;font-weight:700;color:var(--tx1);white-space:nowrap">${r.financial_data?.valor != null ? `R$ ${parseFloat(r.financial_data.valor).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}` : "—"}</td>
                <td style="padding:8px 6px">${pillPrio(r.prioridade)}</td>
                <td style="padding:8px 6px">${pillStatus(r.status)}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${fmtD(r.data_abertura||r.criado_em)}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${fmtD(r.data_conclusao)}</td>
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
              <span style="font-size:12px;font-weight:600;color:var(--tx1)">${a.automatico ? "Sistema" : escapeHtml(a.usuario_nome || "Usuário")}</span>
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
    const sub      = dem.subcategoria || "";
    const _isFin   = sub === "Solicitação de pagamento" || sub === "Reembolso";
    const fd       = (dem.financial_data && typeof dem.financial_data === "object") ? dem.financial_data : {};
    if (!_isFin && Object.keys(fd).length === 0) return "";

    const fmtVal  = v => v ? `R$ ${parseFloat(v).toLocaleString("pt-BR", { minimumFractionDigits:2, maximumFractionDigits:2 })}` : "—";
    const fmtAnexo = (meta, rotulo) => {
      if (!meta?.storage_path) return null;
      const pathEnc = escapeHtmlAttr(meta.storage_path);
      const btn = `<button onclick="demAbrirAnexo('${pathEnc}')" style="padding:4px 14px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--blue);font-size:11.5px;cursor:pointer;font-family:var(--ff)">📎 ${escapeHtml(meta.file_name || "Abrir arquivo")}</button>`;
      return [rotulo, btn];
    };

    let rows = [];
    if (sub === "Solicitação de pagamento") {
      rows = [
        ["Tipo",              fd.tipo || "—"],
        ["Valor",             fmtVal(fd.valor)],
        ["Vencimento",        fmtD(fd.data_vencimento)],
        ["Beneficiário",      fd.beneficiario || "—"],
        ["CPF / CNPJ",        fd.cpf_cnpj || "—"],
        ["Centro de custo",   fd.centro_custo || "—"],
        ["Forma de pagamento",fd.forma_pagamento || "—"],
        fd.chave_pix ? ["Chave Pix",  fd.chave_pix] : null,
        fd.banco     ? ["Banco",       fd.banco]     : null,
        fd.agencia   ? ["Agência",     fd.agencia]   : null,
        fd.conta     ? ["Conta",       fd.conta]     : null,
        fmtAnexo(fd.boleto,      "Boleto"),
        fmtAnexo(fd.nota_fiscal, "Nota Fiscal"),
        fd.obs       ? ["Observações", fd.obs]       : null,
      ].filter(Boolean);
    } else if (sub === "Reembolso") {
      rows = [
        ["Reembolsado",       fd.reimb_nome || "—"],
        ["Valor",             fmtVal(fd.valor)],
        fd.motivo            ? ["Motivo",            fd.motivo]           : null,
        ["Forma de pagamento", fd.forma_pagamento || "—"],
        fd.chave_pix         ? ["Chave Pix",          fd.chave_pix]        : null,
        fd.ministerio    ? ["Ministério",         fd.ministerio]    : null,
        fmtAnexo(fd.nota_fiscal, "Comprovante"),
        fd.pastor_ciente ? ["Pastor / Aprovador", fd.pastor_ciente] : null,
        fd.obs           ? ["Observações",        fd.obs]           : null,
      ].filter(Boolean);
    }

    if (!rows.length) return "";

    return `
      <div class="card" style="margin-top:0;border:1px solid rgba(61,160,85,.3);background:rgba(61,160,85,.03)">
        <div class="ctit" style="color:var(--gr)">💰 Dados Financeiros</div>
        <table style="width:100%;font-size:11.5px;border-collapse:collapse">
          ${rows.map(([lbl, val], i) => `
            <tr style="${i > 0 ? "border-top:1px solid var(--bd1)" : ""}">
              <td style="color:var(--tx3);padding:7px 0;width:40%;vertical-align:top">${lbl}</td>
              <td style="color:var(--tx1)">${val}</td>
            </tr>`).join("")}
        </table>
      </div>`;
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
      && !["Concluída", "Cancelada", "Aguardando Pagamento"].includes(_toLabel(dem.status));
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
        if (typeof T === "function") T("Serviço não configurado", "Configure RESEND_API_KEY nos secrets do Supabase.");
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
      ["Solicitante",   escapeHtml(dem.solicitante || dem.solicitante_txt) || "—"],
      ["Responsável",   escapeHtml(dem.responsavel || dem.responsavel_txt) || "—"],
      ["Prioridade",    pillPrio(dem.prioridade)],
      ["Abertura",      fmtD(dem.data_abertura||dem.criado_em)],
      ["Conclusão prev.",fmtD(dem.data_conclusao)],
    ];
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
          <div class="hero-lbl">Demanda · ${fmtD(dem.data_abertura||dem.criado_em)}</div>
          <div class="hero-ttl">${escapeHtml(dem.titulo) || "Sem título"}</div>
          <div class="hero-dsc" style="display:flex;gap:8px;align-items:center;margin-top:4px">
            ${pillStatus(dem.status)} ${pillPrio(dem.prioridade)}
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
          <button class="tbt" style="color:var(--rose);border-color:rgba(224,85,85,.3)" onclick="demExcluirDemanda('${id}')">🗑 Excluir</button>
        </div>
      </div>
      <div class="ct">
        <div class="g2">
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
              <div class="ctit" style="margin-top:16px">Descrição</div>
              <div style="font-size:12px;color:var(--tx1);line-height:1.7;margin-top:6px">${escapeHtml(dem.descricao)}</div>` : ""}
          </div>
          <div class="card">
            <div class="ctit">Alterar Status</div>
            <div style="font-size:11px;color:var(--tx3);margin-bottom:10px">Status atual: ${pillStatus(dem.status)}</div>
            <div style="display:flex;flex-direction:column;gap:6px" id="dem-status-btns-${id}">
              ${[["Aberta","Aberta"],["Em Análise","Em Análise"],["Em Andamento","Aguardando Aprovação"],["Concluída","Concluída"],["Cancelada","Cancelada"]].map(([st, label]) => `
                <button
                  data-demid="${id}"
                  data-status="${st}"
                  onclick="demAtualizarStatus(this.dataset.demid, this.dataset.status)"
                  style="text-align:left;padding:9px 14px;border-radius:6px;border:1px solid ${dem.status===st?"var(--gr)":"var(--bd2)"};background:${dem.status===st?"rgba(58,170,92,.1)":"var(--bg-card)"};color:${dem.status===st?"var(--gr)":"var(--tx1)"};font-size:12px;font-weight:${dem.status===st?"700":"400"};cursor:pointer;transition:all .15s"
                  onmouseover="this.style.background=this.dataset.status==='${dem.status}'?'rgba(58,170,92,.1)':'var(--bg-hover)'"
                  onmouseout="this.style.background=this.dataset.status==='${dem.status}'?'rgba(58,170,92,.1)':'var(--bg-card)'">
                  ${dem.status===st?"✓ ":"○ "} ${label}
                </button>`).join("")}
            </div>
          </div>
        </div>
        ${_renderFinancialData(dem)}
        <div class="card" style="margin-top:0">
          <div class="ctit">Editar Demanda</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
            <div>
              <label style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">Título *</label>
              <input id="dem-edit-titulo" type="text" value="${escapeHtmlAttr(dem.titulo || '')}" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;box-sizing:border-box">
            </div>
            ${_podeEditarPrioridade() ? `
            <div>
              <label style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">Prioridade</label>
              <select id="dem-edit-prio" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px">
                ${["Baixa","Média","Alta","Urgente"].map(p => `<option${p===dem.prioridade?" selected":""}>${p}</option>`).join("")}
              </select>
            </div>` : ""}
            <div>
              <label style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">Responsável</label>
              <input id="dem-edit-resp" type="text" value="${escapeHtmlAttr(dem.responsavel || dem.responsavel_txt || '')}" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;box-sizing:border-box">
            </div>
            <div>
              <label style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">Conclusão prevista</label>
              <input id="dem-edit-venc" type="date" value="${dem.data_conclusao||''}" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;box-sizing:border-box">
            </div>
          </div>
          ${_podeEditarPrioridade() ? `
          <div style="margin-top:12px">
            <label style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">Solicitante</label>
            <div style="position:relative">
              <input id="dem-edit-sol-nome" type="text" value="${escapeHtmlAttr(dem.solicitante||dem.solicitante_txt||"")}"
                placeholder="Digite ao menos 2 caracteres para buscar..."
                oninput="document.getElementById('dem-edit-sol-id').value='';window._demSolBuscar(this.value)"
                onblur="setTimeout(()=>window._demSolFecharDd(),200)"
                style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;box-sizing:border-box" autocomplete="off">
              <input id="dem-edit-sol-id" type="hidden" value="${escapeHtmlAttr(String(dem.solicitante_id||""))}">
              <div id="dem-edit-sol-dd" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--bg-card);border:1px solid var(--bd2);border-radius:0 0 7px 7px;z-index:100;max-height:200px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.15)"></div>
            </div>
          </div>` : ""}
          <div style="margin-top:12px">
            <label style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">Descrição</label>
            <textarea id="dem-edit-desc" rows="3" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;resize:vertical;box-sizing:border-box">${escapeHtml(dem.descricao || '')}</textarea>
          </div>
          ${(_isFinSolPag || _isFinReemb) ? `
          <div style="margin-top:16px;border:1px solid rgba(61,160,85,.3);border-radius:9px;padding:14px;background:rgba(61,160,85,.03)">
            <div style="font-size:11px;font-weight:700;color:var(--gr);text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px">💰 Dados Financeiros</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              ${_isFinSolPag ? `
              <div>
                <label style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:4px">Tipo</label>
                <select id="dem-edit-tipo" style="width:100%;padding:7px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px">
                  ${["Pagamento","Reembolso","Adiantamento"].map(t => `<option${t===(_demFd.tipo||"Pagamento")?" selected":""}>${t}</option>`).join("")}
                </select>
              </div>` : `
              <div>
                <label style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:4px">Reembolsado</label>
                <input id="dem-edit-reimb-nome" type="text" value="${escapeHtmlAttr(_demFd.reimb_nome||"")}" placeholder="Nome de quem será reembolsado" style="width:100%;padding:7px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px;box-sizing:border-box">
              </div>`}
              <div>
                <label style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:4px">Valor (R$)</label>
                <input id="dem-edit-valor" type="number" step="0.01" min="0" value="${_demFd.valor||""}" placeholder="0,00" style="width:100%;padding:7px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px;box-sizing:border-box">
              </div>
              ${_isFinSolPag ? `
              <div>
                <label style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:4px">Beneficiário / Favorecido</label>
                <input id="dem-edit-beneficiario" type="text" value="${escapeHtmlAttr(_demFd.beneficiario||"")}" placeholder="Nome completo" style="width:100%;padding:7px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px;box-sizing:border-box">
              </div>` : ""}
              <div>
                <label style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:4px">Forma de pagamento</label>
                <select id="dem-edit-forma-pgto" style="width:100%;padding:7px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px">
                  <option value="">Selecione</option>
                  ${["PIX","Boleto","Cartão de Crédito","Cartão de Débito","Dinheiro","Transferência Bancária","Débito em Conta","Cheque","Reembolso","Outro"].map(f => `<option${f===(_demFd.forma_pagamento||"")?" selected":""}>${f}</option>`).join("")}
                </select>
              </div>
            </div>
          </div>` : ""}
          <div style="margin-top:12px;display:flex;justify-content:flex-end">
            <button onclick="demSalvarEdicao('${id}')" style="padding:8px 20px;border-radius:7px;border:none;background:var(--gr);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Salvar alterações</button>
          </div>
        </div>
        <div class="card" style="margin-top:0">
          <div class="ctit">Andamentos da Demanda</div>
          ${_podeRegistrarAndamento(dem) ? `
          <div style="display:flex;gap:8px;margin-bottom:16px;align-items:flex-end">
            <textarea id="dem-and-txt-${id}" rows="2" placeholder="Escreva um andamento…"
              style="flex:1;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;resize:vertical;font-family:var(--ff);box-sizing:border-box"></textarea>
            <button data-and-btn="${id}" onclick="demRegistrarAndamento('${id}')"
              style="padding:9px 18px;border-radius:7px;border:none;background:var(--gr);color:#fff;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">
              Registrar
            </button>
          </div>` : ""}
          <div id="dem-and-list-${id}">
            <div style="color:var(--tx3);font-size:12px;padding:8px 0">Carregando…</div>
          </div>
        </div>
      </div>`;
    _carregarAndamentos(id, dem);
  }

  /* ── Atualizar status ───────────────────────────────── */

  window.demAtualizarStatus = async function(id, novoStatus) {
    if (!id || id === "undefined") {
      if (typeof T === "function") T("Erro", "ID da demanda inválido");
      return;
    }
    try {
      const dbPayload = { status: _toDb(novoStatus) };
      if (novoStatus === "Concluída") {
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
    const prioEl          = document.getElementById("dem-edit-prio");
    const resp            = document.getElementById("dem-edit-resp")?.value?.trim();
    const venc            = document.getElementById("dem-edit-venc")?.value || null;
    const _isFinEdicao    = _ativo?.area === "Financeiro";

    if (!titulo) {
      if (typeof T === "function") T("Campo obrigatório", "Informe o título");
      return;
    }

    try {
      const payload = { titulo, descricao: desc || "", responsavel: resp || "", data_conclusao: venc };
      if (prioEl && _podeEditarPrioridade()) payload.prioridade = prioEl.value;
      if (_podeEditarPrioridade()) {
        const solNome = document.getElementById("dem-edit-sol-nome")?.value?.trim();
        const solId   = document.getElementById("dem-edit-sol-id")?.value || null;
        if (solNome) {
          payload.solicitante    = solNome;
          payload.solicitante_id = solId || null;
        }
      }
      if (_isFinEdicao) {
        const existFd  = (_ativo?.financial_data && typeof _ativo.financial_data === "object") ? _ativo.financial_data : {};
        const novoFd   = { ...existFd };
        const valorEl  = document.getElementById("dem-edit-valor");
        const formaEl  = document.getElementById("dem-edit-forma-pgto");
        const tipoEl   = document.getElementById("dem-edit-tipo");
        const benefEl  = document.getElementById("dem-edit-beneficiario");
        const reimbEl  = document.getElementById("dem-edit-reimb-nome");
        if (valorEl)  { const v = parseFloat(valorEl.value || "0"); if (!isNaN(v) && v >= 0) novoFd.valor = v; }
        if (formaEl)  novoFd.forma_pagamento = formaEl.value;
        if (tipoEl)   novoFd.tipo = tipoEl.value;
        if (benefEl)  novoFd.beneficiario = benefEl.value.trim();
        if (reimbEl)  novoFd.reimb_nome = reimbEl.value.trim();
        payload.financial_data = novoFd;
      }
      await apiWrite("update", "DEMANDAS", { _row: id, ...payload });
      if (typeof T === "function") T("✅ Demanda atualizada!", "");

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
      await apiWrite("delete", "DEMANDAS", { _row: id });
      if (typeof T === "function") T("Demanda excluída", "Registro removido com sucesso");
      _invalidate();
      _atualizarBadge();
      if (typeof window.go === "function") window.go(_origemView || "dem-todas");
    } catch(e) {
      if (typeof T === "function") T("Erro ao excluir", e.message || "Tente novamente");
      console.error("demExcluirDemanda:", e);
    }
  };

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
            onmouseout="this.style.background=''">${escapeHtml(p.nome)}</div>`
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

  window.abrirModalNovaDemanda = function() {
    const m = document.getElementById("modal-nova-demanda");
    if (!m) return;
    const usuario = typeof USUARIO_ATUAL !== "undefined" ? (USUARIO_ATUAL?.nome || "") : "";
    m.querySelector("#dem-f-cat").innerHTML =
      `<option value="">Selecione a categoria</option>` +
      CATS.map(c => `<option value="${c.nome}">${c.icon} ${c.nome}</option>`).join("");
    m.querySelector("#dem-f-sub").innerHTML = `<option value="">Selecione a categoria primeiro</option>`;
    m.querySelector("#dem-f-titulo").value  = "";
    m.querySelector("#dem-f-desc").value    = "";
    m.querySelector("#dem-f-sol").value     = usuario;
    m.querySelector("#dem-f-resp").value    = "";
    m.querySelector("#dem-f-venc").value    = "";
    /* Reset financial section */
    ["dem-f-financeiro-section","dem-f-pag-section","dem-f-reimb-section",
     "dem-f-pix-section","dem-f-bank-section","dem-f-boleto-section"].forEach(id => {
      const el = m.querySelector("#" + id);
      if (el) el.style.display = "none";
    });
    ["dem-f-tipo-sol","dem-f-valor","dem-f-data-venc","dem-f-beneficiario","dem-f-cpf-cnpj",
     "dem-f-centro","dem-f-forma-pag","dem-f-chave-pix","dem-f-banco","dem-f-agencia",
     "dem-f-conta","dem-f-obs-fin","dem-f-reimb-nome","dem-f-reimb-valor",
     "dem-f-reimb-motivo","dem-f-reimb-forma-pag","dem-f-reimb-pix","dem-f-reimb-min",
     "dem-f-reimb-pastor","dem-f-reimb-obs"].forEach(id => {
      const el = m.querySelector("#" + id);
      if (el) el.value = "";
    });
    /* Reset file inputs */
    ["dem-f-upload-nf","dem-f-upload-boleto","dem-f-upload-reimb-nf"].forEach(id => {
      const el = m.querySelector("#" + id);
      if (el) el.value = "";
    });
    ["dem-f-upload-nf-name","dem-f-upload-boleto-name","dem-f-upload-reimb-nf-name"].forEach(id => {
      const el = m.querySelector("#" + id);
      if (el) el.textContent = _FIN_UPLOAD_PLACEHOLDER;
    });
    m.style.display = "flex";
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
    subEl.innerHTML = cat
      ? cat.subcats.map(s => `<option value="${s}">${s}</option>`).join("")
      : `<option value="">Selecione a categoria primeiro</option>`;
    if (respEl && cat) respEl.value = cat.resp;
    _toggleFinanceiroSection();
  };

  function _toggleFinanceiroSection() {
    const cat      = document.getElementById("dem-f-cat")?.value;
    const sub      = document.getElementById("dem-f-sub")?.value;
    const sec      = document.getElementById("dem-f-financeiro-section");
    const pagSec   = document.getElementById("dem-f-pag-section");
    const reimbSec = document.getElementById("dem-f-reimb-section");
    if (!sec) return;
    const isFinanceiro = cat === "Financeiro";
    sec.style.display      = isFinanceiro ? "" : "none";
    if (pagSec)   pagSec.style.display   = (isFinanceiro && sub === "Solicitação de pagamento") ? "flex" : "none";
    if (reimbSec) reimbSec.style.display = (isFinanceiro && sub === "Reembolso")               ? "flex" : "none";
    if (isFinanceiro) _toggleFormaPagamento();
  }

  function _toggleFormaPagamento() {
    const forma     = document.getElementById("dem-f-forma-pag")?.value;
    const pixSec    = document.getElementById("dem-f-pix-section");
    const bankSec   = document.getElementById("dem-f-bank-section");
    const boletoSec = document.getElementById("dem-f-boleto-section");
    if (pixSec)    pixSec.style.display    = forma === "PIX"                    ? ""     : "none";
    if (bankSec)   bankSec.style.display   = forma === "Transferência Bancária" ? "grid" : "none";
    if (boletoSec) boletoSec.style.display = forma === "Boleto"                 ? ""     : "none";
  }

  window.demOnSubChange      = _toggleFinanceiroSection;
  window.demOnFormaPagChange = _toggleFormaPagamento;

  /* ── Upload de anexos financeiros ───────────────────── */

  const _FIN_UPLOAD_PLACEHOLDER = "Escolher arquivo · PDF, JPG ou PNG · máx. 10 MB";

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
    if (!sb) { if (typeof T === "function") T("Erro", "Supabase não disponível"); return; }
    try {
      const { data, error } = await sb.storage
        .from("financial-documents")
        .createSignedUrl(storagePath, 3600);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch(e) {
      if (typeof T === "function") T("Erro ao abrir arquivo", e.message);
    }
  };

  window.salvarNovaDemanda = async function() {
    const cat    = document.getElementById("dem-f-cat")?.value;
    const sub    = document.getElementById("dem-f-sub")?.value;
    const titulo = document.getElementById("dem-f-titulo")?.value?.trim();
    const desc   = document.getElementById("dem-f-desc")?.value?.trim();
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
      if (!valor || isNaN(valor) || valor <= 0) {
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
        const bFile = document.getElementById("dem-f-upload-boleto")?.files?.[0];
        if (!bFile) {
          if (typeof T === "function") T("Arquivo obrigatório", "Anexe o boleto em PDF, JPG ou PNG");
          return;
        }
        const bErr = _validarArquivo(bFile);
        if (bErr) { if (typeof T === "function") T("Arquivo inválido", bErr); return; }
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

    const u = typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL : null;
    const pessoaId = u?.id || u?.pessoa_id || null;

    const payload = {
      area:           cat,
      subcategoria:   sub,
      titulo,
      descricao:      desc || "",
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

      const nfFile = document.getElementById("dem-f-upload-nf")?.files?.[0];
      if (nfFile) {
        try { financial_data.nota_fiscal = await _uploadAnexoFinanceiro(nfFile, `tmp_${tempKey}`, "notas"); }
        catch(e) { uploadErrs.push(`Nota fiscal: ${e.message}`); }
      }

      const boletoFile = document.getElementById("dem-f-upload-boleto")?.files?.[0];
      if (boletoFile) {
        try { financial_data.boleto = await _uploadAnexoFinanceiro(boletoFile, `tmp_${tempKey}`, "boletos"); }
        catch(e) { uploadErrs.push(`Boleto: ${e.message}`); }
      }

      const reimbNfFile = document.getElementById("dem-f-upload-reimb-nf")?.files?.[0];
      if (reimbNfFile) {
        try { financial_data.nota_fiscal = await _uploadAnexoFinanceiro(reimbNfFile, `tmp_${tempKey}`, "notas"); }
        catch(e) { uploadErrs.push(`Comprovante: ${e.message}`); }
      }

      if (uploadErrs.length) {
        if (typeof T === "function") T("Erro no upload", uploadErrs.join(" | "));
        return;
      }

      payload.financial_data = financial_data;
    }

    try {
      await apiWrite("create", "DEMANDAS", payload);
      if (typeof T === "function") T("✅ Demanda criada!", `Roteada para: ${payload.responsavel}`);
      window.fecharModalNovaDemanda();
      _invalidate();
      const view = document.querySelector(".view.on");
      if (view?.id === "v-dem-dash")       renderDash();
      if (view?.id === "v-dem-todas")      renderLista("dem-todas-content");
      if (view?.id === "v-admin-demandas") _admRender();
      if (view?.id === "v-fin-demandas")   _finRender();
      _atualizarBadge();
    } catch(e) {
      if (typeof T === "function") T("Erro ao criar", e.message || "Tente novamente");
      console.error("salvarNovaDemanda:", e);
    }
  };

  /* ── Expor filtrar para views ────────────────────────── */
  window.demFiltrar = function(elId, filtros) { renderLista(elId, filtros); };

  /* ── Hook no go() ────────────────────────────────────── */

  /* ── Dashboard de Infraestrutura ───────────────────── */

  async function _renderInfraDash() {
    if (!_cache.length) await _load();
    const rows = _cache.filter(r => String(r.area||"") === "Infraestrutura");
    const mes   = new Date().toISOString().slice(0, 7);

    const nAbertas = rows.filter(r => ["ABERTA","EM_ANALISE"].includes(_toDb(r.status))).length;
    const nAnd     = rows.filter(r => _toDb(r.status) === "EM_ANDAMENTO").length;
    const nPri     = rows.filter(r => ["Alta","Urgente"].includes(r.prioridade) && _toDb(r.status) !== "CONCLUIDA").length;
    const nConc    = rows.filter(r => _toDb(r.status) === "CONCLUIDA" && (r.data_conclusao||r.criado_em||"").startsWith(mes)).length;

    const sv = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    sv("infra-kpi-abertas", nAbertas);
    sv("infra-kpi-and",     nAnd);
    sv("infra-kpi-pri",     nPri);
    sv("infra-kpi-conc",    nConc);

    function _miniRow(r) {
      return `<tr style="border-bottom:1px solid var(--bd1);cursor:pointer" onclick="window.demAbrirDetalhe('${r.id||r._row}','infra-dash')">
        <td style="padding:7px 6px;font-weight:600;color:var(--tx1);max-width:190px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.titulo) || "—"}</td>
        <td style="padding:7px 6px">${pillStatus(r.status)}</td>
        <td style="padding:7px 4px;color:var(--tx3);font-size:11px">${escapeHtml(r.responsavel || r.responsavel_txt) || "—"}</td>
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
    const priList = rows.filter(r => ["Alta","Urgente"].includes(r.prioridade) && _toDb(r.status) !== "CONCLUIDA")
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
      elDem.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:12px 0">Nenhuma solicitação registrada.</div>`;
      return;
    }

    const isMobile = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 768px)").matches;
    if (isMobile) {
      elDem.innerHTML = recentes.map(r =>
        `<div style="padding:10px 0;border-bottom:1px solid var(--bd1);cursor:pointer" onclick="window.demAbrirDetalhe('${r.id||r._row}','area-dem')">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div style="font-size:12px;font-weight:600;color:var(--tx1);line-height:1.4">${escapeHtml(r.titulo||"—")}</div>
            ${pillStatus(r.status)}
          </div>
          <div style="font-size:10.5px;color:var(--tx3);margin-top:3px">${r.area||"—"} · ${fmtD(r.criado_em)}</div>
        </div>`
      ).join("") + `<div style="margin-top:10px"><button class="tbt" onclick="go('area-dem')">Ver todas →</button></div>`;
    } else {
      elDem.innerHTML = `<table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="text-align:left;padding:6px 8px;font-size:10px;color:var(--tx3);font-weight:600">Título</th>
          <th style="text-align:left;padding:6px 8px;font-size:10px;color:var(--tx3);font-weight:600">Status</th>
          <th style="text-align:left;padding:6px 8px;font-size:10px;color:var(--tx3);font-weight:600">Área</th>
          <th style="text-align:left;padding:6px 8px;font-size:10px;color:var(--tx3);font-weight:600">Data</th>
        </tr></thead>
        <tbody>${recentes.map(r => `<tr style="border-top:1px solid var(--bd1);cursor:pointer" onclick="window.demAbrirDetalhe('${r.id||r._row}','area-dem')">
          <td style="padding:8px;font-size:11.5px;color:var(--tx1)"><strong>${escapeHtml(r.titulo)||"—"}</strong></td>
          <td style="padding:8px">${pillStatus(r.status)}</td>
          <td style="padding:8px;font-size:11px;color:var(--tx3)">${r.area||"—"}</td>
          <td style="padding:8px;font-size:10.5px;color:var(--tx3);font-family:var(--mono)">${fmtD(r.criado_em)}</td>
        </tr>`).join("")}</tbody>
      </table>`;
    }
  };

  const _origGo = window.go;
  window.go = async function(id) {
    await _origGo(id);
    if (id && id.startsWith("dem-")) _aplicarMenuDem();
    const MAP = {
      "dem-dash":    () => renderDash(),
      "dem-todas":   () => renderLista("dem-todas-content"),
      "dem-analise": () => renderLista("dem-analise-content", { status:"EM_ANALISE" }),
      "dem-and":     () => renderLista("dem-and-content",     { status:"EM_ANDAMENTO" }),
      "dem-conc":    () => renderLista("dem-conc-content",    { status:"CONCLUIDA" }),
      "dem-pri":          () => renderLista("dem-pri-content",              { prioridade:"Alta" }),
      "dem-hist":         () => renderLista("dem-hist-content"),
      "admin-demandas":          () => _admRender(),
      "admin-demandas-adm":      async () => { _admFiltro = "Administrativo"; try { localStorage.setItem(_ADM_KEY, _admFiltro); } catch(_){} await go("admin-demandas"); },
      "fin-demandas":            () => _finRender(),
      "conselho-demandas":        () => renderLista("conselho-demandas-content"),
      "conselho-demandas-cons":   () => renderLista("conselho-demandas-cons-content",  { area:"Conselho" }),
      "infra-dash":               () => _renderInfraDash(),
      "infra-demandas":           () => renderLista("infra-demandas-content"),
      "infra-demandas-infra":     () => renderLista("infra-demandas-infra-content",    { area:"Infraestrutura" }),
      "jur-demandas-tab":         () => renderLista("jur-demandas-tab-content"),
      "jur-demandas-jur":         () => renderLista("jur-demandas-jur-content",        { area:"Jurídico" }),
      "pastoral-demandas":        () => renderLista("pastoral-demandas-content",         { area:"Pastoral" }),
      "pastoral-demandas-pas":    () => renderLista("pastoral-demandas-pas-content",     { area:"Pastoral" }),
      "pastoral-ate":             () => listarModulo("DEMANDAS", "pastoral-ate-list",   { area:"Pastoral" }),
      "pastoral-ora":             () => listarModulo("DEMANDAS", "pastoral-ora-list",   { area:"Pastoral" }),
      "pastoral-reg":             () => listarModulo("DEMANDAS", "pastoral-reg-list",   { area:"Pastoral" }),
      "pastoral-pri":             () => _carregarCasosPri(),
      "pastoral-aco":             () => listarModulo("MEMBROS",  "pastoral-aco-list"),
      "area-dem":                 () => renderLista("area-dem-content"),
    };
    if (MAP[id]) await MAP[id]();
  };

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
            <div>
              <label style="${_CP_LB}">Data de Conclusão (opcional)</label>
              <input type="date" id="cp-data-conclusao" style="${_CP_INP}">
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
    document.getElementById('cp-data-conclusao').value = dados?.data_conclusao ? dados.data_conclusao.slice(0,10) : '';
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
      data_conclusao: document.getElementById('cp-data-conclusao').value || null,
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
      const ST_LBL   = {ABERTA:'Aberto',EM_ANALISE:'Em Análise',EM_ANDAMENTO:'Em Acompanhamento',PENDENTE:'Pendente',CONCLUIDA:'Resolvido',CANCELADA:'Arquivado'};
      const ST_BG    = {ABERTA:'rgba(239,68,68,.1)',EM_ANALISE:'rgba(212,168,67,.1)',EM_ANDAMENTO:'rgba(74,156,245,.1)',CONCLUIDA:'rgba(58,170,92,.1)',CANCELADA:'rgba(100,100,100,.1)'};
      const ST_CL    = {ABERTA:'#ef4444',EM_ANALISE:'#d4a843',EM_ANDAMENTO:'#4a9cf5',CONCLUIDA:'#3aaa5c',CANCELADA:'#888'};

      el.innerHTML = `
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12.5px">
            <thead><tr style="border-bottom:2px solid var(--bd1)">
              <th style="text-align:left;padding:8px 10px;color:var(--tx3);font-weight:600;font-size:11px">Pessoa</th>
              <th style="text-align:left;padding:8px 10px;color:var(--tx3);font-weight:600;font-size:11px">Motivo</th>
              <th style="text-align:left;padding:8px 10px;color:var(--tx3);font-weight:600;font-size:11px">Prioridade</th>
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
                <td style="padding:8px 10px;color:var(--tx1);font-weight:500">${escapeHtml(c.solicitante || '—')}</td>
                <td style="padding:8px 10px;color:var(--tx2);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(c.titulo || '')}">${escapeHtml(c.titulo || '—')}</td>
                <td style="padding:8px 10px"><span style="font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600;background:${pCor}20;color:${pCor}">${escapeHtml(c.prioridade || '—')}</span></td>
                <td style="padding:8px 10px"><span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${stBg};color:${stCl}">${escapeHtml(stLbl)}</span></td>
                <td style="padding:8px 10px;color:var(--tx2)">${escapeHtml(c.responsavel || '—')}</td>
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

    let rows = [..._cache];

    if (filtrosFixos) {
      Object.entries(filtrosFixos).forEach(([k, v]) => {
        if (!v) return;
        if (k === "prioridade" && v === "Alta") {
          rows = rows.filter(r => ["Alta","Urgente"].includes(r.prioridade));
        } else if (k === "status") {
          rows = rows.filter(r => _toDb(String(r[k]||"")) === _toDb(String(v)));
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
              ${["Categoria","Subcategoria","Título","Solicitante","Responsável","Valor","Forma Pgto.","Prior.","Status","Abertura","Conclusão"].map((h,i) =>
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
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${escapeHtml(r.solicitante||r.solicitante_txt)||"—"}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${escapeHtml(r.responsavel||r.responsavel_txt)||"—"}</td>
                <td style="padding:8px 6px;text-align:right;font-weight:700;color:var(--tx1);white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${r.financial_data?.valor!=null?`R$ ${parseFloat(r.financial_data.valor).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"}</td>
                <td style="padding:8px 6px;color:var(--tx2);font-size:11px;white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${escapeHtml(r.financial_data?.forma_pagamento||"—")}</td>
                <td style="padding:8px 6px;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${pillPrio(r.prioridade)}</td>
                <td style="padding:8px 6px;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${pillStatus(r.status)}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${fmtD(r.data_abertura||r.criado_em)}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap;cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}','fin-demandas')">${fmtD(r.data_conclusao)}</td>
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

    const ST_COR  = {"Aberta":"#1565c0","Em Análise":"#f57f17","Em Andamento":"#6a1b9a","Concluída":"#2e7d32","Cancelada":"#555","Pendente":"#e65100","Aguardando Pagamento":"#f57f17"};
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
          ${r.prioridade?`<span style="font-size:10px;font-weight:700;padding:2px 10px;border-radius:10px;background:${prC}18;color:${prC}">${r.prioridade}</span>`:""}
        </div>
        <div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:11px">${escapeHtml(r.titulo)||"Sem título"}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px 28px">
          <div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Categoria</div><div style="font-size:11.5px;color:#1a1a1a">${r.area||"—"}</div></div>
          <div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Subcategoria</div><div style="font-size:11.5px;color:#1a1a1a">${r.subcategoria||"—"}</div></div>
          <div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Solicitante</div><div style="font-size:11.5px;color:#1a1a1a">${escapeHtml(r.solicitante||r.solicitante_txt||"—")}</div></div>
          <div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Responsável</div><div style="font-size:11.5px;color:#1a1a1a">${escapeHtml(r.responsavel||r.responsavel_txt||"—")}</div></div>
          <div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Valor</div><div style="font-size:12px;font-weight:700;color:#1a1a1a">${fmtVal(r.financial_data)}</div></div>
          <div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Forma de Pagamento</div><div style="font-size:11.5px;color:#1a1a1a">${escapeHtml(r.financial_data?.forma_pagamento||"—")}</div></div>
          <div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Data de Abertura</div><div style="font-size:11.5px;color:#1a1a1a">${fmtD(r.data_abertura||r.criado_em)}</div></div>
          <div><div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px">Data de Conclusão</div><div style="font-size:11.5px;color:#1a1a1a">${fmtD(r.data_conclusao)}</div></div>
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

})();
