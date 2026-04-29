/* ═══════════════════════════════════════════════════════
   SIPEN — Módulo Solicitações e Demandas
   demandas.js · v2.0
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
      const p = typeof PERFIS !== "undefined" ? PERFIS[USUARIO_ATUAL.perfil] : null;
      return p ? (p.nivel >= 4) : true;
    } catch(_) { return true; }
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
    "Pendente":     "PENDENTE",
    "Concluída":    "CONCLUIDA",
    "Cancelada":    "CANCELADA",
  };

  const _STATUS_LABEL = {
    "ABERTA":       "Aberta",
    "EM_ANALISE":   "Em Análise",
    "EM_ANDAMENTO": "Em Andamento",
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
          ${urgentes.slice(0,3).map(r => `<em>${r.titulo||r.area}</em>`).join(", ")}${urgentes.length>3?" e mais...":""}
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
                  <div class="ttitle">${catIcon(r.area)} ${r.titulo||"Sem título"}</div>
                  <div class="tmeta">${r.area||"—"}${r.subcategoria?" · "+r.subcategoria:""} · ${r.solicitante||"—"} · ${fmtD(r.data_abertura||r.criado_em)}</div>
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

    /* Filtros fixos — comparação normalizada (aceita label ou código DB) */
    if (filtrosFixos) {
      Object.entries(filtrosFixos).forEach(([k, v]) => {
        if (!v) return;
        if (k === "prioridade" && v === "Alta") {
          rows = rows.filter(r => ["Alta","Urgente"].includes(r.prioridade));
        } else if (k === "status") {
          rows = rows.filter(r => _toDb(String(r[k]||"")) === _toDb(String(v)));
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
              ${["Categoria","Subcategoria","Título","Solicitante","Responsável","Prior.","Status","Abertura","Conclusão"].map(h =>
                `<th style="text-align:left;padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`
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
                <td style="padding:8px 6px;color:var(--tx1);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.titulo||"—"}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${r.solicitante||"—"}</td>
                <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${r.responsavel||"—"}</td>
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
    _renderDetalhe(dem);
    if (typeof window.go === "function") window.go("dem-detalhe");
  };

  function _renderDetalhe(dem) {
    const el = document.getElementById("v-dem-detalhe");
    if (!el) return;
    const id = dem.id || dem._row;
    const origem = _origemView;

    el.innerHTML = `
      <div class="hero">
        <div class="hero-ic" style="background:${catCor(dem.area)}18;border-color:${catCor(dem.area)}44;font-size:22px">${catIcon(dem.area)}</div>
        <div>
          <div class="hero-lbl">Demanda · ${fmtD(dem.data_abertura||dem.criado_em)}</div>
          <div class="hero-ttl">${dem.titulo||"Sem título"}</div>
          <div class="hero-dsc" style="display:flex;gap:8px;align-items:center;margin-top:4px">
            ${pillStatus(dem.status)} ${pillPrio(dem.prioridade)}
            <span style="color:var(--tx3);font-size:11px">${catIcon(dem.area)} ${dem.area||"—"} → ${dem.subcategoria||"—"}</span>
          </div>
        </div>
        <div class="hero-act" style="display:flex;gap:8px;align-items:center">
          <button class="tbt" onclick="window.go('${origem}')">← Voltar</button>
          <button class="tbt" style="color:var(--rose);border-color:rgba(224,85,85,.3)" onclick="demExcluirDemanda('${id}')">🗑 Excluir</button>
        </div>
      </div>
      <div class="ct">
        <div class="g2">
          <div class="card">
            <div class="ctit">Detalhes</div>
            <table style="width:100%;font-size:11.5px;border-collapse:collapse">
              ${[
                ["Categoria",     `<span style="color:${catCor(dem.area)};font-weight:600">${catIcon(dem.area)} ${dem.area||"—"}</span>`],
                ["Subcategoria",  dem.subcategoria||"—"],
                ["Solicitante",   dem.solicitante||"—"],
                ["Responsável",   dem.responsavel||"—"],
                ["Prioridade",    pillPrio(dem.prioridade)],
                ["Abertura",      fmtD(dem.data_abertura||dem.criado_em)],
                ["Conclusão prev.",fmtD(dem.data_conclusao)],
              ].map(([lbl, val], i) => `
                <tr style="${i>0?"border-top:1px solid var(--bd1)":""}">
                  <td style="color:var(--tx3);padding:7px 0;width:40%">${lbl}</td>
                  <td style="color:var(--tx1)">${val}</td>
                </tr>`).join("")}
            </table>
            ${dem.descricao ? `
              <div class="ctit" style="margin-top:16px">Descrição</div>
              <div style="font-size:12px;color:var(--tx1);line-height:1.7;margin-top:6px">${dem.descricao}</div>` : ""}
          </div>
          <div class="card">
            <div class="ctit">Alterar Status</div>
            <div style="font-size:11px;color:var(--tx3);margin-bottom:10px">Status atual: ${pillStatus(dem.status)}</div>
            <div style="display:flex;flex-direction:column;gap:6px" id="dem-status-btns-${id}">
              ${["Aberta","Em Análise","Em Andamento","Concluída","Cancelada"].map(st => `
                <button
                  data-demid="${id}"
                  data-status="${st}"
                  onclick="demAtualizarStatus(this.dataset.demid, this.dataset.status)"
                  style="text-align:left;padding:9px 14px;border-radius:6px;border:1px solid ${dem.status===st?"var(--gr)":"var(--bd2)"};background:${dem.status===st?"rgba(58,170,92,.1)":"var(--bg-card)"};color:${dem.status===st?"var(--gr)":"var(--tx1)"};font-size:12px;font-weight:${dem.status===st?"700":"400"};cursor:pointer;transition:all .15s"
                  onmouseover="this.style.background=this.dataset.status==='${dem.status}'?'rgba(58,170,92,.1)':'var(--bg-hover)'"
                  onmouseout="this.style.background=this.dataset.status==='${dem.status}'?'rgba(58,170,92,.1)':'var(--bg-card)'">
                  ${dem.status===st?"✓ ":"○ "} ${st}
                </button>`).join("")}
            </div>
          </div>
        </div>
        <div class="card" style="margin-top:0">
          <div class="ctit">Editar Demanda</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
            <div>
              <label style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">Título *</label>
              <input id="dem-edit-titulo" type="text" value="${(dem.titulo||'').replace(/"/g,'&quot;')}" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;box-sizing:border-box">
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
              <input id="dem-edit-resp" type="text" value="${(dem.responsavel||'').replace(/"/g,'&quot;')}" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;box-sizing:border-box">
            </div>
            <div>
              <label style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">Conclusão prevista</label>
              <input id="dem-edit-venc" type="date" value="${dem.data_conclusao||''}" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;box-sizing:border-box">
            </div>
          </div>
          <div style="margin-top:12px">
            <label style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">Descrição</label>
            <textarea id="dem-edit-desc" rows="3" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;resize:vertical;box-sizing:border-box">${(dem.descricao||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
          </div>
          <div style="margin-top:12px;display:flex;justify-content:flex-end">
            <button onclick="demSalvarEdicao('${id}')" style="padding:8px 20px;border-radius:7px;border:none;background:var(--gr);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Salvar alterações</button>
          </div>
        </div>
      </div>`;
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
    const titulo  = document.getElementById("dem-edit-titulo")?.value?.trim();
    const desc    = document.getElementById("dem-edit-desc")?.value?.trim();
    const prioEl  = document.getElementById("dem-edit-prio");
    const resp    = document.getElementById("dem-edit-resp")?.value?.trim();
    const venc    = document.getElementById("dem-edit-venc")?.value || null;

    if (!titulo) {
      if (typeof T === "function") T("Campo obrigatório", "Informe o título");
      return;
    }

    try {
      const payload = { titulo, descricao: desc || "", responsavel: resp || "", data_conclusao: venc };
      if (prioEl && _podeEditarPrioridade()) payload.prioridade = prioEl.value;
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

    const payload = {
      area:          cat,
      subcategoria:  sub,
      titulo,
      descricao:     desc || "",
      prioridade:    "Normal",   // definida por triagem — nunca pelo solicitante
      status:        "ABERTA",
      solicitante:   sol || "",
      responsavel:   resp || catResp(cat),
      data_abertura: new Date().toISOString().split("T")[0],
      data_conclusao: venc,
    };

    try {
      console.log("PAYLOAD DEMANDA:", { ...payload });
      await apiWrite("create", "DEMANDAS", payload);
      if (typeof T === "function") T("✅ Demanda criada!", `Roteada para: ${payload.responsavel}`);
      window.fecharModalNovaDemanda();
      _invalidate();
      const view = document.querySelector(".view.on");
      if (view?.id === "v-dem-dash")   renderDash();
      if (view?.id === "v-dem-todas")  renderLista("dem-todas-content");
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
        <td style="padding:7px 6px;font-weight:600;color:var(--tx1);max-width:190px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.titulo||"—"}</td>
        <td style="padding:7px 6px">${pillStatus(r.status)}</td>
        <td style="padding:7px 4px;color:var(--tx3);font-size:11px">${r.responsavel||"—"}</td>
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

    const elDem = document.getElementById("area-dash-dem");
    if (!elDem) return;
    const recentes = [..._cache].sort((a,b) => (b.criado_em||"").localeCompare(a.criado_em||"")).slice(0,6);
    if (!recentes.length) {
      elDem.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:12px 0">Nenhuma solicitação registrada.</div>`;
      return;
    }
    elDem.innerHTML = `<table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="text-align:left;padding:6px 8px;font-size:10px;color:var(--tx3);font-weight:600">Título</th>
        <th style="text-align:left;padding:6px 8px;font-size:10px;color:var(--tx3);font-weight:600">Status</th>
        <th style="text-align:left;padding:6px 8px;font-size:10px;color:var(--tx3);font-weight:600">Área</th>
        <th style="text-align:left;padding:6px 8px;font-size:10px;color:var(--tx3);font-weight:600">Data</th>
      </tr></thead>
      <tbody>${recentes.map(r => `<tr style="border-top:1px solid var(--bd1);cursor:pointer" onclick="window.demAbrirDetalhe('${r.id||r._row}','area-dem')">
        <td style="padding:8px;font-size:11.5px;color:var(--tx1)"><strong>${r.titulo||"—"}</strong></td>
        <td style="padding:8px">${pillStatus(r.status)}</td>
        <td style="padding:8px;font-size:11px;color:var(--tx3)">${r.area||"—"}</td>
        <td style="padding:8px;font-size:10.5px;color:var(--tx3);font-family:var(--mono)">${fmtD(r.criado_em)}</td>
      </tr>`).join("")}</tbody>
    </table>`;
  };

  const _origGo = window.go;
  window.go = function(id) {
    _origGo(id);
    const MAP = {
      "dem-dash":    () => renderDash(),
      "dem-todas":   () => renderLista("dem-todas-content"),
      "dem-analise": () => renderLista("dem-analise-content", { status:"EM_ANALISE" }),
      "dem-and":     () => renderLista("dem-and-content",     { status:"EM_ANDAMENTO" }),
      "dem-conc":    () => renderLista("dem-conc-content",    { status:"CONCLUIDA" }),
      "dem-pri":          () => renderLista("dem-pri-content",              { prioridade:"Alta" }),
      "dem-hist":         () => renderLista("dem-hist-content"),
      "admin-demandas":          () => renderLista("admin-demandas-content"),
      "admin-demandas-adm":      () => renderLista("admin-demandas-adm-content",      { area:"Administrativo" }),
      "conselho-demandas":        () => renderLista("conselho-demandas-content"),
      "conselho-demandas-cons":   () => renderLista("conselho-demandas-cons-content",  { area:"Conselho" }),
      "infra-dash":               () => _renderInfraDash(),
      "infra-demandas":           () => renderLista("infra-demandas-content"),
      "infra-demandas-infra":     () => renderLista("infra-demandas-infra-content",    { area:"Infraestrutura" }),
      "jur-demandas-tab":         () => renderLista("jur-demandas-tab-content"),
      "jur-demandas-jur":         () => renderLista("jur-demandas-jur-content",        { area:"Jurídico" }),
      "pastoral-demandas":        () => renderLista("pastoral-demandas-content"),
      "pastoral-demandas-pas":    () => renderLista("pastoral-demandas-pas-content",   { area:"Pastoral" }),
      "area-dem":                 () => renderLista("area-dem-content"),
    };
    if (MAP[id]) MAP[id]();
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

})();
