/* ═══════════════════════════════════════════════════════
   SIPEN — Módulo Solicitações e Demandas
   demandas.js · v1.0
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

  function getCat(area){
    return CATS.find(c => c.nome === area || c.id === area) || null;
  }
  function catIcon(area){ return getCat(area)?.icon || "📋"; }
  function catCor(area) { return getCat(area)?.cor  || "var(--tx3)"; }
  function catResp(area){ return getCat(area)?.resp  || ""; }

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

  function pillStatus(st) {
    const s = STATUS_CFG[st] || { bg:"rgba(90,96,104,.15)", cl:"var(--tx3)" };
    return `<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;background:${s.bg};color:${s.cl}">${st||"—"}</span>`;
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

  async function _load() {
    try { _cache = await apiRead("DEMANDAS"); }
    catch(e) { console.warn("Demandas load:", e.message); _cache = []; }
    return _cache;
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

    const ABERTAS_STATUS = ["Aberta","Em Análise","Em Andamento","Pendente"];
    const abertas   = _cache.filter(r => ABERTAS_STATUS.includes(r.status));
    const emAnd     = _cache.filter(r => r.status === "Em Andamento");
    const alta      = _cache.filter(r => ["Alta","Urgente"].includes(r.prioridade) && ABERTAS_STATUS.includes(r.status));
    const concl     = _cache.filter(r => r.status === "Concluída");
    const recentes  = [..._cache].sort((a,b) => (b.criado_em||"").localeCompare(a.criado_em||"")).slice(0, 8);

    const porCat = {};
    abertas.forEach(r => {
      const a = r.area || "Sem categoria";
      porCat[a] = (porCat[a] || 0) + 1;
    });
    const catRank = Object.entries(porCat).sort((a,b) => b[1]-a[1]).slice(0, 6);
    const maxCat  = catRank[0]?.[1] || 1;

    el.innerHTML = `
      <div class="kpis c4">
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">◻</div><div class="kpi-body"><div class="kpi-lbl">Abertas</div><div class="kpi-val">${abertas.length}</div><div class="kpi-d nu">em aberto</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--violetbg);color:var(--violet)">◎</div><div class="kpi-body"><div class="kpi-lbl">Em andamento</div><div class="kpi-val">${emAnd.length}</div><div class="kpi-d nu">em execução</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">!</div><div class="kpi-body"><div class="kpi-lbl">Alta prioridade</div><div class="kpi-val">${alta.length}</div><div class="kpi-d ${alta.length > 0 ? "dn" : "up"}">requer atenção</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(58,170,92,.12);color:var(--gr)">✓</div><div class="kpi-body"><div class="kpi-lbl">Concluídas</div><div class="kpi-val">${concl.length}</div><div class="kpi-d up">▲ total</div></div></div>
      </div>
      <div class="g2">
        <div class="card">
          <div class="ctit">Demandas recentes <span class="cact" onclick="demRecarregarDash()">↻ Atualizar</span></div>
          ${recentes.length === 0
            ? '<div style="color:var(--tx3);font-size:11.5px">Nenhuma demanda registrada</div>'
            : recentes.map(r => `
              <div class="trow" style="cursor:pointer" onclick="demAbrirDetalhe('${r.id||r._row}')">
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
        <div class="card">
          <div class="ctit">Abertas por categoria</div>
          ${catRank.length === 0
            ? '<div style="color:var(--tx3);font-size:11.5px">Sem dados</div>'
            : catRank.map(([cat, qtd]) => `
              <div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
                  <span style="color:var(--tx2)">${catIcon(cat)} ${cat}</span>
                  <span style="color:var(--tx1);font-weight:700">${qtd}</span>
                </div>
                <div style="height:5px;border-radius:3px;background:var(--bd1)">
                  <div style="height:5px;border-radius:3px;background:${catCor(cat)};width:${Math.round(qtd/maxCat*100)}%"></div>
                </div>
              </div>`).join("")}
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

    if (filtrosFixos) {
      Object.entries(filtrosFixos).forEach(([k,v]) => {
        if (v) rows = rows.filter(r => String(r[k]||"").toLowerCase().includes(String(v).toLowerCase()));
      });
    }

    const fStatus = document.getElementById(elId+"-fstatus")?.value || "";
    const fCat    = document.getElementById(elId+"-fcat")?.value    || "";
    const fPrio   = document.getElementById(elId+"-fprio")?.value   || "";
    const fBusca  = (document.getElementById(elId+"-fbusca")?.value || "").toLowerCase();

    if (fStatus) rows = rows.filter(r => r.status === fStatus);
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
                  onclick="demAbrirDetalhe('${r.id||r._row}')"
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

  /* ── Detalhe individual ─────────────────────────────── */

  window.demAbrirDetalhe = async function(id) {
    if (!_cache.length) await _load();
    const dem = _cache.find(r => String(r.id||r._row) === String(id));
    if (!dem) { if(typeof T==="function") T("Erro","Demanda não encontrada"); return; }
    _ativo = dem;
    _renderDetalhe(dem);
    if (typeof go === "function") go("dem-detalhe");
  };
  window.demAbrirDetalhe = window.demAbrirDetalhe;

  function _renderDetalhe(dem) {
    const el = document.getElementById("v-dem-detalhe");
    if (!el) return;
    const id = dem.id || dem._row;

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
        <div class="hero-act">
          <button class="tbt" onclick="history.back()">← Voltar</button>
        </div>
      </div>
      <div class="ct">
        <div class="g2">
          <div class="card">
            <div class="ctit">Detalhes</div>
            <table style="width:100%;font-size:11.5px;border-collapse:collapse">
              ${[
                ["Categoria",    `<span style="color:${catCor(dem.area)};font-weight:600">${catIcon(dem.area)} ${dem.area||"—"}</span>`],
                ["Subcategoria", dem.subcategoria||"—"],
                ["Solicitante",  dem.solicitante||"—"],
                ["Responsável",  dem.responsavel||"—"],
                ["Prioridade",   pillPrio(dem.prioridade)],
                ["Abertura",     fmtD(dem.data_abertura||dem.criado_em)],
                ["Conclusão prev.",fmtD(dem.data_conclusao)],
              ].map(([ lbl, val ], i) => `
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
            <div class="ctit">Atualizar status</div>
            <div style="font-size:11px;color:var(--tx3);margin-bottom:10px">Status atual: ${pillStatus(dem.status)}</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${["Aberta","Em Análise","Em Andamento","Concluída","Cancelada"].map(st => `
                <button onclick="demAtualizarStatus('${id}','${st}')"
                  style="text-align:left;padding:9px 14px;border-radius:6px;border:1px solid ${dem.status===st?"var(--gr)":"var(--bd2)"};background:${dem.status===st?"rgba(58,170,92,.1)":"var(--bg-card)"};color:${dem.status===st?"var(--gr)":"var(--tx1)"};font-size:12px;font-weight:${dem.status===st?"700":"400"};cursor:pointer;transition:all .15s"
                  onmouseover="if('${dem.status}'!=='${st}')this.style.background='var(--bg-hover)'"
                  onmouseout="if('${dem.status}'!=='${st}')this.style.background='var(--bg-card)'">
                  ${dem.status===st?"✓ ":"○ "} ${st}
                </button>`).join("")}
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ── Atualizar status via Supabase ──────────────────── */

  window.demAtualizarStatus = async function(id, novoStatus) {
    try {
      const payload = { status: novoStatus };
      if (novoStatus === "Concluída") payload.data_conclusao = new Date().toISOString().split("T")[0];
      await apiWrite("update", "DEMANDAS", { _row: id, ...payload });
      if (typeof T === "function") T("✅ Status atualizado", `Demanda: ${novoStatus}`);
      const idx = _cache.findIndex(r => String(r.id||r._row) === String(id));
      if (idx >= 0) Object.assign(_cache[idx], payload);
      if (_ativo && String(_ativo.id||_ativo._row) === String(id)) {
        Object.assign(_ativo, payload);
        _renderDetalhe(_ativo);
      }
      _atualizarBadge();
    } catch(e) {
      if (typeof T === "function") T("Erro", "Não foi possível atualizar o status");
      console.error(e);
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
    m.querySelector("#dem-f-prio").value    = "Média";
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
    const cat   = document.getElementById("dem-f-cat")?.value;
    const sub   = document.getElementById("dem-f-sub")?.value;
    const titulo= document.getElementById("dem-f-titulo")?.value?.trim();
    const desc  = document.getElementById("dem-f-desc")?.value?.trim();
    const prio  = document.getElementById("dem-f-prio")?.value;
    const sol   = document.getElementById("dem-f-sol")?.value?.trim();
    const resp  = document.getElementById("dem-f-resp")?.value?.trim();
    const venc  = document.getElementById("dem-f-venc")?.value || null;

    if (!cat || !sub || !titulo) {
      if (typeof T === "function") T("Campo obrigatório", "Preencha categoria, subcategoria e título");
      return;
    }

    const payload = {
      area:          cat,
      subcategoria:  sub,
      titulo,
      descricao:     desc || "",
      prioridade:    prio || "Média",
      status:        "Aberta",
      solicitante:   sol || "",
      responsavel:   resp || catResp(cat),
      data_abertura: new Date().toISOString().split("T")[0],
      data_conclusao: venc,
    };

    try {
      await apiWrite("create", "DEMANDAS", payload);
      if (typeof T === "function") T("✅ Demanda criada!", `Roteada para: ${payload.responsavel}`);
      window.fecharModalNovaDemanda();
      _invalidate();
      const view = document.querySelector(".view.on");
      if (view?.id === "v-dem-dash")   renderDash();
      if (view?.id === "v-dem-todas")  renderLista("dem-todas-content");
    } catch(e) {
      if (typeof T === "function") T("Erro", "Não foi possível registrar a demanda");
      console.error(e);
    }
  };

  /* ── Expor filtrar para views ────────────────────────── */
  window.demFiltrar = function(elId, filtros) { renderLista(elId, filtros); };

  /* ── Hook no go() ────────────────────────────────────── */

  const _origGo = window.go;
  window.go = function(id) {
    _origGo(id);
    const MAP = {
      "dem-dash":    () => renderDash(),
      "dem-todas":   () => renderLista("dem-todas-content"),
      "dem-analise": () => renderLista("dem-analise-content", { status:"Em Análise" }),
      "dem-and":     () => renderLista("dem-and-content",     { status:"Em Andamento" }),
      "dem-conc":    () => renderLista("dem-conc-content",    { status:"Concluída" }),
      "dem-pri":     () => renderLista("dem-pri-content",     { prioridade:"Alta" }),
      "dem-hist":    () => renderLista("dem-hist-content"),
    };
    if (MAP[id]) MAP[id]();
  };

})();
