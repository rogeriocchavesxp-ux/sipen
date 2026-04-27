/* ═══════════════════════════════════════════════════════
   SIPEN — Módulo Atas e Deliberações
   atas.js · v1.0
   Conselho e Governança — Gestão de Atas, Deliberações e Demandas
═══════════════════════════════════════════════════════ */

(function () {

  /* ── Configurações ──────────────────────────────────── */

  const TIPO_ATA = {
    "ORDINARIA":          "Ordinária",
    "EXTRAORDINARIA":     "Extraordinária",
    "COMISSAO_EXECUTIVA": "Comissão Executiva",
  };

  const STATUS_ATA_CFG = {
    "RASCUNHO":  { label:"Rascunho",  bg:"rgba(212,168,67,.12)",  cl:"var(--gold)"  },
    "APROVADA":  { label:"Aprovada",  bg:"rgba(58,170,92,.12)",   cl:"var(--gr)"    },
    "ARQUIVADA": { label:"Arquivada", bg:"rgba(74,156,245,.12)",  cl:"var(--blue)"  },
  };

  const STATUS_DELIB_CFG = {
    "APROVADO":    { label:"Aprovado",    bg:"rgba(58,170,92,.12)",   cl:"var(--gr)"    },
    "REJEITADO":   { label:"Rejeitado",   bg:"rgba(224,85,85,.12)",   cl:"var(--rose)"  },
    "ENCAMINHADO": { label:"Encaminhado", bg:"rgba(139,111,212,.12)", cl:"var(--violet)"},
    "EM_ANALISE":  { label:"Em Análise",  bg:"rgba(212,168,67,.12)",  cl:"var(--gold)"  },
  };

  const PRIO_CFG = {
    "Urgente": "var(--rose)",
    "Alta":    "var(--amber)",
    "Média":   "var(--blue)",
    "Baixa":   "var(--gr)",
  };

  /* ── Estado do módulo ───────────────────────────────── */

  let _atasCache      = null;
  let _deliberacoesCache = null;
  let _ataEditando    = null;
  let _deliberacoesTemp = [];

  /* ── Helpers visuais ────────────────────────────────── */

  function _sp() {
    return `<span style="display:inline-block;width:11px;height:11px;border:2px solid var(--sky);border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;vertical-align:middle;margin-right:6px"></span>`;
  }

  function _loading(msg) {
    return `<div style="padding:24px;color:var(--tx3);font-size:13px;text-align:center">${_sp()}${msg || "Carregando..."}</div>`;
  }

  function _vazio(msg) {
    return `<div style="padding:32px 16px;color:var(--tx3);font-size:13px;text-align:center;opacity:.7">${msg}</div>`;
  }

  function fmtD(d) {
    if (!d) return "—";
    const s = (d.split("T")[0]).split("-");
    return s.length === 3 ? `${s[2]}/${s[1]}/${s[0]}` : d;
  }

  function hoje() {
    return new Date().toISOString().split("T")[0];
  }

  function isAtrasada(prazo) {
    return !!prazo && prazo < hoje();
  }

  function tipoLabel(t) {
    return TIPO_ATA[t] || t || "—";
  }

  function pillAta(st) {
    const s = STATUS_ATA_CFG[st] || { label: st || "—", bg:"rgba(90,96,104,.15)", cl:"var(--tx3)" };
    return `<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;background:${s.bg};color:${s.cl}">${s.label}</span>`;
  }

  function pillDelib(st) {
    const s = STATUS_DELIB_CFG[st] || { label: st || "—", bg:"rgba(90,96,104,.15)", cl:"var(--tx3)" };
    return `<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;background:${s.bg};color:${s.cl}">${s.label}</span>`;
  }

  function pillPrio(p) {
    const c = PRIO_CFG[p] || "var(--tx3)";
    return `<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;background:${c}18;color:${c}">${p || "—"}</span>`;
  }

  /* ── API Supabase ───────────────────────────────────── */

  function _hdrs() {
    return {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    };
  }

  function _base() {
    return (SUPABASE_URL || "").trim().replace(/\/$/, "") + "/rest/v1";
  }

  async function _get(table, qs) {
    const url = `${_base()}/${table}${qs ? "?" + qs : ""}`;
    const r = await fetch(url, { headers: _hdrs() });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async function _post(table, body) {
    const r = await fetch(`${_base()}/${table}`, {
      method: "POST",
      headers: _hdrs(),
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async function _patch(table, id, body) {
    const r = await fetch(`${_base()}/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: _hdrs(),
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async function _del(table, id) {
    const r = await fetch(`${_base()}/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: _hdrs(),
    });
    if (!r.ok) throw new Error(await r.text());
    return true;
  }

  /* ── Cache / Loaders ────────────────────────────────── */

  async function _loadAtas(force) {
    if (_atasCache && !force) return _atasCache;
    try { _atasCache = await _get("atas", "order=data.desc,numero.desc"); }
    catch(e) { console.warn("[atas]", e.message); _atasCache = []; }
    return _atasCache;
  }

  async function _loadDelibs(force) {
    if (_deliberacoesCache && !force) return _deliberacoesCache;
    try { _deliberacoesCache = await _get("atas_deliberacoes", "order=created_at.desc"); }
    catch(e) { console.warn("[delibs]", e.message); _deliberacoesCache = []; }
    return _deliberacoesCache;
  }

  function _invalidate() {
    _atasCache = null;
    _deliberacoesCache = null;
  }

  /* ══════════════════════════════════════════════════════
     DASHBOARD
  ══════════════════════════════════════════════════════ */

  async function renderDash() {
    const el = document.getElementById("atas-dash-content");
    if (!el) return;
    el.innerHTML = _loading();

    const [atas, delibs] = await Promise.all([
      _loadAtas(true),
      _loadDelibs(true),
    ]);

    let demandas = [];
    try { demandas = await _get("demandas", "origem_tipo=eq.ATA&order=criado_em.desc"); }
    catch(_) {}

    const total      = atas.length;
    const aprovadas  = atas.filter(a => a.status === "APROVADA").length;
    const rascunho   = atas.filter(a => a.status === "RASCUNHO").length;
    const arquivadas = atas.filter(a => a.status === "ARQUIVADA").length;

    const totalDelibs    = delibs.length;
    const totalDem       = demandas.length;
    const demPendentes   = demandas.filter(d => !["CONCLUIDA","CANCELADA"].includes(d.status)).length;
    const demAtrasadas   = demandas.filter(d =>
      d.status !== "CONCLUIDA" && d.status !== "CANCELADA" &&
      isAtrasada(d.prazo || d.data_conclusao_prevista)
    ).length;

    const recentes = atas.slice(0, 8);

    el.innerHTML = `
      ${demAtrasadas > 0 ? `
        <div class="alr alr-r" style="margin-bottom:16px">
          <span class="alr-i">⚠</span>
          <div><strong>${demAtrasadas} demanda${demAtrasadas > 1 ? "s" : ""} atrasada${demAtrasadas > 1 ? "s" : ""}</strong> originada${demAtrasadas > 1 ? "s" : ""} de atas — prazos vencidos.</div>
        </div>` : ""}

      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;background:var(--bg-card);border:1px solid var(--bd1);border-radius:var(--rl);overflow:hidden;margin-bottom:18px">
        <div class="kpi" style="cursor:pointer;border-radius:0;border:none;border-right:1px solid var(--bd1)" onclick="window.go('atas-todas')">
          <div class="kpi-ico" style="background:rgba(88,152,212,.15);color:var(--sky)">◈</div>
          <div class="kpi-body"><div class="kpi-lbl">Total de Atas</div><div class="kpi-val">${total}</div><div class="kpi-d nu">registradas</div></div>
        </div>
        <div class="kpi" style="cursor:pointer;border-radius:0;border:none;border-right:1px solid var(--bd1)" onclick="window.go('atas-todas')">
          <div class="kpi-ico" style="background:rgba(58,170,92,.15);color:var(--gr)">✓</div>
          <div class="kpi-body"><div class="kpi-lbl">Aprovadas</div><div class="kpi-val">${aprovadas}</div><div class="kpi-d nu">de ${total}</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none">
          <div class="kpi-ico" style="background:rgba(212,168,67,.15);color:var(--gold)">✎</div>
          <div class="kpi-body"><div class="kpi-lbl">Rascunhos</div><div class="kpi-val">${rascunho}</div><div class="kpi-d wa">pendentes</div></div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;background:var(--bg-card);border:1px solid var(--bd1);border-radius:var(--rl);overflow:hidden;margin-bottom:20px">
        <div class="kpi" style="cursor:pointer;border-radius:0;border:none;border-right:1px solid var(--bd1)" onclick="window.go('atas-delib')">
          <div class="kpi-ico" style="background:rgba(139,111,212,.15);color:var(--violet)">≡</div>
          <div class="kpi-body"><div class="kpi-lbl">Deliberações</div><div class="kpi-val">${totalDelibs}</div><div class="kpi-d nu">total</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
          <div class="kpi-ico" style="background:rgba(42,181,192,.15);color:var(--teal)">◻</div>
          <div class="kpi-body"><div class="kpi-lbl">Demandas Geradas</div><div class="kpi-val">${totalDem}</div><div class="kpi-d nu">via atas</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none">
          <div class="kpi-ico" style="background:rgba(224,85,85,.15);color:var(--rose)">⚠</div>
          <div class="kpi-body"><div class="kpi-lbl">Atrasadas</div><div class="kpi-val">${demAtrasadas}</div><div class="kpi-d ${demAtrasadas > 0 ? "neg" : "nu"}">prazo vencido</div></div>
        </div>
      </div>

      <div class="g2">
        <div class="card">
          <div class="ctit">Atas Recentes <span class="cact" onclick="window.go('atas-todas')">Ver todas →</span></div>
          ${recentes.length === 0 ? _vazio("Nenhuma ata registrada ainda.") : `
            <table class="tbl">
              <thead><tr><th>Nº</th><th>Tipo</th><th>Data</th><th>Presidente</th><th>Status</th></tr></thead>
              <tbody>${recentes.map(a => `
                <tr style="cursor:pointer" onclick="atasVerDetalhes('${a.id}')">
                  <td class="tdc" style="font-weight:700">${a.numero || "—"}</td>
                  <td style="font-size:11px">${tipoLabel(a.tipo)}</td>
                  <td class="mono" style="font-size:10.5px">${fmtD(a.data)}</td>
                  <td style="font-size:12px">${a.presidente || "—"}</td>
                  <td>${pillAta(a.status)}</td>
                </tr>`).join("")}
              </tbody>
            </table>`}
        </div>
        <div class="card">
          <div class="ctit">Distribuição</div>
          <div class="bars" style="gap:10px">
            ${[
              { label:"Aprovadas",  val:aprovadas,  cor:"var(--gr)",    total },
              { label:"Rascunhos",  val:rascunho,   cor:"var(--gold)",  total },
              { label:"Arquivadas", val:arquivadas, cor:"var(--blue)",  total },
            ].map(b => `
              <div>
                <div class="bh"><span class="bn">${b.label}</span><span class="bv">${b.val}</span></div>
                <div class="bt"><div class="bf" style="width:${b.total ? Math.round((b.val / b.total) * 100) : 0}%;background:${b.cor}"></div></div>
              </div>`).join("")}
          </div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--bd1)">
            <div style="font-size:11.5px;color:var(--tx2);margin-bottom:6px;font-weight:600">Demandas geradas por atas</div>
            <div style="display:flex;gap:16px;flex-wrap:wrap">
              <div><span style="font-size:11px;color:var(--tx3)">Pendentes</span><br><strong style="color:var(--amber);font-size:16px">${demPendentes}</strong></div>
              <div><span style="font-size:11px;color:var(--tx3)">Atrasadas</span><br><strong style="color:var(--rose);font-size:16px">${demAtrasadas}</strong></div>
              <div><span style="font-size:11px;color:var(--tx3)">Total</span><br><strong style="font-size:16px">${totalDem}</strong></div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════
     TODAS AS ATAS
  ══════════════════════════════════════════════════════ */

  async function renderTodasAtas() {
    const el = document.getElementById("atas-todas-content");
    if (!el) return;
    el.innerHTML = _loading();

    const atas = await _loadAtas(true);

    el.innerHTML = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
        <input id="atas-busca" type="text" placeholder="Buscar número, presidente, secretário, síntese..."
          style="flex:1;min-width:200px;padding:7px 10px;background:var(--bg-body);border:1px solid var(--bd1);border-radius:6px;color:var(--tx1);font-size:12px"
          oninput="atasAplicarFiltros()">
        <select id="atas-f-status" onchange="atasAplicarFiltros()"
          style="padding:7px 10px;background:var(--bg-body);border:1px solid var(--bd1);border-radius:6px;color:var(--tx2);font-size:12px">
          <option value="">Todos os status</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="APROVADA">Aprovada</option>
          <option value="ARQUIVADA">Arquivada</option>
        </select>
        <select id="atas-f-tipo" onchange="atasAplicarFiltros()"
          style="padding:7px 10px;background:var(--bg-body);border:1px solid var(--bd1);border-radius:6px;color:var(--tx2);font-size:12px">
          <option value="">Todos os tipos</option>
          <option value="ORDINARIA">Ordinária</option>
          <option value="EXTRAORDINARIA">Extraordinária</option>
          <option value="COMISSAO_EXECUTIVA">Comissão Executiva</option>
        </select>
        <button class="tbt pri" onclick="window.go('atas-nova')" style="white-space:nowrap">+ Nova Ata</button>
      </div>
      <div id="atas-tabela-wrap">${_tabelaAtas(atas)}</div>`;

    window._atasData = atas;
  }

  function _tabelaAtas(lista) {
    if (!lista.length) return _vazio("Nenhuma ata encontrada.");
    return `
      <div style="overflow-x:auto">
      <table class="tbl">
        <thead>
          <tr>
            <th>Nº</th><th>Tipo</th><th>Data</th><th>Presidente</th>
            <th>Secretário</th><th>Síntese</th><th>Status</th>
            <th style="text-align:center">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(a => `
          <tr style="cursor:pointer" onclick="atasVerDetalhes('${a.id}')">
            <td class="tdc" style="font-weight:700">${a.numero || "—"}</td>
            <td style="font-size:11px">${tipoLabel(a.tipo)}</td>
            <td class="mono" style="font-size:10.5px">${fmtD(a.data)}</td>
            <td style="font-size:12px">${a.presidente || "—"}</td>
            <td style="font-size:12px">${a.secretario || "—"}</td>
            <td style="font-size:11px;color:var(--tx2);max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.sintese || "—"}</td>
            <td>${pillAta(a.status)}</td>
            <td onclick="event.stopPropagation()" style="text-align:center;white-space:nowrap">
              <button class="tbt" style="padding:3px 7px;font-size:11px;margin-right:2px"
                onclick="atasVerDetalhes('${a.id}')">Ver</button>
              ${a.status !== "APROVADA" && a.status !== "ARQUIVADA" ? `
                <button class="tbt" style="padding:3px 7px;font-size:11px;margin-right:2px;color:var(--gold);border-color:var(--gold)"
                  onclick="atasEditarAta('${a.id}')">Editar</button>` : ""}
              ${a.status === "RASCUNHO" ? `
                <button class="tbt" style="padding:3px 7px;font-size:11px;background:rgba(58,170,92,.15);color:var(--gr);border-color:var(--gr)"
                  onclick="atasAprovar('${a.id}')">Aprovar</button>` : ""}
            </td>
          </tr>`).join("")}
        </tbody>
      </table>
      </div>`;
  }

  window.atasAplicarFiltros = function () {
    const busca   = (document.getElementById("atas-busca")?.value || "").toLowerCase();
    const fStatus = document.getElementById("atas-f-status")?.value || "";
    const fTipo   = document.getElementById("atas-f-tipo")?.value || "";
    const lista   = (window._atasData || []).filter(a =>
      (!busca || [a.numero, a.presidente, a.secretario, a.sintese].some(v => (v || "").toLowerCase().includes(busca))) &&
      (!fStatus || a.status === fStatus) &&
      (!fTipo   || a.tipo === fTipo)
    );
    const wrap = document.getElementById("atas-tabela-wrap");
    if (wrap) wrap.innerHTML = _tabelaAtas(lista);
  };

  /* ══════════════════════════════════════════════════════
     APROVAR ATA
  ══════════════════════════════════════════════════════ */

  window.atasAprovar = async function (id) {
    if (!confirm("Aprovar esta ata?\n\nO banco de dados irá gerar automaticamente as demandas vinculadas às deliberações marcadas para geração.")) return;
    try {
      await _patch("atas", id, { status: "APROVADA" });
      _invalidate();
      _toast("Ata aprovada! As demandas serão geradas automaticamente pelo banco.", "ok");
      // Fecha modal de detalhe se aberto
      document.getElementById("modal-ata-detalhe")?.remove();
      // Atualiza view atual
      const vid = document.querySelector(".view.on")?.id?.replace("v-", "");
      if (vid === "atas-todas") renderTodasAtas();
      else if (vid === "atas-dash") renderDash();
    } catch(e) { _toast("Erro ao aprovar: " + e.message, "err"); }
  };

  /* ══════════════════════════════════════════════════════
     NOVA ATA / EDITAR ATA
  ══════════════════════════════════════════════════════ */

  function renderNovaAta(ataId) {
    const el = document.getElementById("atas-nova-content");
    if (!el) return;
    el.innerHTML = _loading();

    if (ataId) {
      Promise.all([
        _get("atas", `id=eq.${ataId}`),
        _get("atas_deliberacoes", `ata_id=eq.${ataId}&order=created_at.asc`),
      ]).then(([ataRows, deliberRows]) => {
        const ata = ataRows[0];
        if (!ata) { el.innerHTML = _vazio("Ata não encontrada."); return; }
        _ataEditando    = ata;
        _deliberacoesTemp = deliberRows;
        _renderFormAta(el, ata, true);
      }).catch(e => { el.innerHTML = `<div class="alr alr-r">${e.message}</div>`; });
    } else {
      _ataEditando    = null;
      _deliberacoesTemp = [];
      _renderFormAta(el, null, false);
    }
  }

  function _campo(label, id, tipo, opts = {}) {
    const base = `width:100%;padding:8px 10px;background:var(--bg-body);border:1px solid var(--bd1);border-radius:6px;color:var(--tx1);font-size:13px;box-sizing:border-box`;
    const lbl  = `<div style="font-size:11px;color:var(--tx3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">${label}${opts.req ? " *" : ""}</div>`;
    const val  = opts.val || "";
    const ph   = opts.placeholder ? `placeholder="${opts.placeholder}"` : "";
    if (tipo === "select") {
      return `${lbl}<select id="${id}" style="${base}">${(opts.options || []).map(o =>
        `<option value="${o.v}" ${val === o.v ? "selected" : ""}>${o.l}</option>`
      ).join("")}</select>`;
    }
    if (tipo === "textarea") {
      return `${lbl}<textarea id="${id}" rows="3" ${ph} style="${base};resize:vertical">${val}</textarea>`;
    }
    return `${lbl}<input id="${id}" type="${tipo}" value="${val}" ${ph} style="${base}">`;
  }

  function _renderFormAta(el, ata, isEdit) {
    el.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div class="ctit">${isEdit ? "Editar Ata" : "Dados da Ata"}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>${_campo("Número", "ata-numero", "text", { req:true, val: ata?.numero || "", placeholder:"Ex: 001/2025" })}</div>
          <div>${_campo("Tipo", "ata-tipo", "select", { req:true, val: ata?.tipo || "", options:[
            { v:"", l:"Selecione o tipo" },
            { v:"ORDINARIA",          l:"Ordinária" },
            { v:"EXTRAORDINARIA",     l:"Extraordinária" },
            { v:"COMISSAO_EXECUTIVA", l:"Comissão Executiva" },
          ]})}</div>
          <div>${_campo("Data", "ata-data", "date", { req:true, val: ata?.data || "" })}</div>
          <div>${_campo("Local", "ata-local", "text", { val: ata?.local || "", placeholder:"Ex: Sala do Conselho" })}</div>
          <div>${_campo("Hora Início", "ata-hora-ini", "time", { val: ata?.hora_inicio || "" })}</div>
          <div>${_campo("Hora Fim", "ata-hora-fim", "time", { val: ata?.hora_fim || "" })}</div>
          <div>${_campo("Presidente", "ata-presidente", "text", { val: ata?.presidente || "", placeholder:"Nome do presidente da reunião" })}</div>
          <div>${_campo("Secretário", "ata-secretario", "text", { val: ata?.secretario || "", placeholder:"Nome do secretário" })}</div>
          <div style="grid-column:1/-1">${_campo("Síntese / Pauta", "ata-sintese", "textarea", { val: ata?.sintese || "", placeholder:"Descrição geral da reunião e pauta principal..." })}</div>
        </div>
        <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
          <button class="tbt" onclick="window.go('atas-todas')">Cancelar</button>
          <button class="tbt pri" onclick="atasSalvar(${isEdit ? `'${ata.id}'` : "null"})">${isEdit ? "Salvar Alterações" : "Salvar Ata"}</button>
        </div>
      </div>
      <div id="atas-delib-section" style="${isEdit ? "" : "display:none"}">
        ${_secaoDeliberacoes()}
      </div>`;
  }

  function _secaoDeliberacoes() {
    const delibs = _deliberacoesTemp;
    return `
      <div class="card">
        <div class="ctit" style="display:flex;align-items:center;justify-content:space-between">
          <span>Deliberações <span style="font-size:11px;color:var(--tx3);font-weight:400">(${delibs.length})</span></span>
          <button class="tbt pri" onclick="atasModalDelib(null)" style="font-size:12px">+ Adicionar Deliberação</button>
        </div>
        ${delibs.length === 0 ? _vazio("Nenhuma deliberação ainda. Clique em + Adicionar Deliberação.") : `
          <div style="overflow-x:auto;margin-top:8px">
          <table class="tbl">
            <thead>
              <tr>
                <th>Descrição</th><th>Tipo</th><th>Departamento</th>
                <th>Responsável</th><th>Prazo</th><th>Prior.</th>
                <th style="text-align:center">Demanda</th><th></th>
              </tr>
            </thead>
            <tbody>
              ${delibs.map(d => `
              <tr style="${isAtrasada(d.prazo) ? "background:rgba(224,85,85,.04)" : ""}">
                <td style="font-size:12px;max-width:200px">${d.descricao || "—"}</td>
                <td>${pillDelib(d.tipo)}</td>
                <td style="font-size:11.5px">${d.departamento || "—"}</td>
                <td style="font-size:11.5px">${d.responsavel || "—"}</td>
                <td style="font-size:11px;font-family:var(--mono);color:${isAtrasada(d.prazo) ? "var(--rose)" : "var(--tx2)"}">${fmtD(d.prazo)}${isAtrasada(d.prazo) ? " ⚠" : ""}</td>
                <td>${pillPrio(d.prioridade)}</td>
                <td style="text-align:center">
                  ${d.demanda_id
                    ? `<button class="tbt" style="font-size:10px;padding:2px 7px;color:var(--sky);border-color:var(--sky)" onclick="window.demAbrirDetalhe&&window.demAbrirDetalhe('${d.demanda_id}','atas-nova')">Abrir</button>`
                    : `<span style="font-size:10px;color:var(--tx3)">${d.gerar_demanda ? "Pendente" : "—"}</span>`}
                </td>
                <td>
                  <button class="tbt" style="font-size:10px;padding:2px 6px;margin-right:2px" onclick="atasModalDelib('${d.id}')">✎</button>
                  <button class="tbt" style="font-size:10px;padding:2px 6px;color:var(--rose);border-color:rgba(224,85,85,.3)" onclick="atasRemoverDelib('${d.id}')">×</button>
                </td>
              </tr>`).join("")}
            </tbody>
          </table>
          </div>`}
      </div>`;
  }

  /* ── Salvar ata ─────────────────────────────────────── */

  window.atasSalvar = async function (ataId) {
    const numero     = document.getElementById("ata-numero")?.value?.trim();
    const tipo       = document.getElementById("ata-tipo")?.value;
    const data       = document.getElementById("ata-data")?.value;

    if (!numero) { _toast("Informe o número da ata.", "err"); return; }
    if (!tipo)   { _toast("Selecione o tipo de reunião.", "err"); return; }
    if (!data)   { _toast("Informe a data da reunião.", "err"); return; }

    const payload = {
      numero,
      tipo,
      data,
      hora_inicio: document.getElementById("ata-hora-ini")?.value || null,
      hora_fim:    document.getElementById("ata-hora-fim")?.value || null,
      local:       document.getElementById("ata-local")?.value?.trim() || null,
      presidente:  document.getElementById("ata-presidente")?.value?.trim() || null,
      secretario:  document.getElementById("ata-secretario")?.value?.trim() || null,
      sintese:     document.getElementById("ata-sintese")?.value?.trim() || null,
    };

    try {
      let ata;
      if (ataId) {
        const res = await _patch("atas", ataId, payload);
        ata = Array.isArray(res) ? res[0] : res;
        _toast("Ata atualizada com sucesso.", "ok");
      } else {
        payload.status = "RASCUNHO";
        const res = await _post("atas", payload);
        ata = Array.isArray(res) ? res[0] : res;
        _toast("Ata criada! Adicione as deliberações abaixo.", "ok");
      }
      _ataEditando = ata;
      _invalidate();

      if (!ataId) {
        // Carrega deliberacoes do novo registro (devem estar vazias)
        _deliberacoesTemp = [];
      } else {
        _deliberacoesTemp = await _get("atas_deliberacoes", `ata_id=eq.${ata.id}&order=created_at.asc`).catch(() => []);
      }

      const sec = document.getElementById("atas-delib-section");
      if (sec) { sec.style.display = ""; sec.innerHTML = _secaoDeliberacoes(); }

    } catch(e) { _toast("Erro ao salvar: " + e.message, "err"); }
  };

  /* ── Modal de deliberação ───────────────────────────── */

  window.atasModalDelib = function (deliberacaoId) {
    if (!_ataEditando?.id) {
      _toast("Salve a ata antes de adicionar deliberações.", "err");
      return;
    }
    const d = _deliberacoesTemp.find(x => x.id === deliberacaoId) || null;

    const m = document.createElement("div");
    m.id = "modal-delib-atas";
    m.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";
    m.onclick = e => { if (e.target === m) m.remove(); };

    m.innerHTML = `
      <div style="background:var(--bg-card);border-radius:12px;width:100%;max-width:580px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.4)">
        <div style="padding:18px 22px 14px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--bg-card);border-radius:12px 12px 0 0;z-index:1">
          <div>
            <div style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Ata ${_ataEditando.numero || ""}</div>
            <div style="font-size:16px;font-weight:700;color:var(--tx1)">${d ? "Editar Deliberação" : "Nova Deliberação"}</div>
          </div>
          <button onclick="document.getElementById('modal-delib-atas').remove()" style="background:none;border:none;font-size:22px;color:var(--tx3);cursor:pointer;padding:4px 8px;border-radius:6px">×</button>
        </div>
        <div style="padding:18px 22px;display:flex;flex-direction:column;gap:12px">
          <div>
            <div style="font-size:11px;color:var(--tx3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Descrição *</div>
            <textarea id="dlib-desc" rows="3" placeholder="Descreva a deliberação..."
              style="width:100%;padding:8px 10px;background:var(--bg-body);border:1px solid var(--bd1);border-radius:6px;color:var(--tx1);font-size:13px;resize:vertical;box-sizing:border-box">${d?.descricao || ""}</textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <div style="font-size:11px;color:var(--tx3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Tipo *</div>
              <select id="dlib-tipo" style="width:100%;padding:8px 10px;background:var(--bg-body);border:1px solid var(--bd1);border-radius:6px;color:var(--tx1);font-size:13px;box-sizing:border-box">
                <option value="">Selecione</option>
                <option value="APROVADO"    ${d?.tipo === "APROVADO"    ? "selected" : ""}>Aprovado</option>
                <option value="REJEITADO"   ${d?.tipo === "REJEITADO"   ? "selected" : ""}>Rejeitado</option>
                <option value="ENCAMINHADO" ${d?.tipo === "ENCAMINHADO" ? "selected" : ""}>Encaminhado</option>
                <option value="EM_ANALISE"  ${d?.tipo === "EM_ANALISE"  ? "selected" : ""}>Em Análise</option>
              </select>
            </div>
            <div>
              <div style="font-size:11px;color:var(--tx3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Departamento</div>
              <input id="dlib-dept" type="text" value="${d?.departamento || ""}" placeholder="Ex: Financeiro, Pastoral..."
                style="width:100%;padding:8px 10px;background:var(--bg-body);border:1px solid var(--bd1);border-radius:6px;color:var(--tx1);font-size:13px;box-sizing:border-box">
            </div>
            <div>
              <div style="font-size:11px;color:var(--tx3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Responsável</div>
              <input id="dlib-resp" type="text" value="${d?.responsavel || ""}" placeholder="Nome do responsável"
                style="width:100%;padding:8px 10px;background:var(--bg-body);border:1px solid var(--bd1);border-radius:6px;color:var(--tx1);font-size:13px;box-sizing:border-box">
            </div>
            <div>
              <div style="font-size:11px;color:var(--tx3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Prazo</div>
              <input id="dlib-prazo" type="date" value="${d?.prazo || ""}"
                style="width:100%;padding:8px 10px;background:var(--bg-body);border:1px solid var(--bd1);border-radius:6px;color:var(--tx1);font-size:13px;box-sizing:border-box">
            </div>
            <div>
              <div style="font-size:11px;color:var(--tx3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Prioridade</div>
              <select id="dlib-prio" style="width:100%;padding:8px 10px;background:var(--bg-body);border:1px solid var(--bd1);border-radius:6px;color:var(--tx1);font-size:13px;box-sizing:border-box">
                <option value="Baixa"  ${d?.prioridade === "Baixa"   ? "selected" : ""}>Baixa</option>
                <option value="Média"  ${(!d || d?.prioridade === "Média")  ? "selected" : ""}>Média</option>
                <option value="Alta"   ${d?.prioridade === "Alta"    ? "selected" : ""}>Alta</option>
                <option value="Urgente"${d?.prioridade === "Urgente" ? "selected" : ""}>Urgente</option>
              </select>
            </div>
            <div style="display:flex;align-items:center;padding-top:18px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--tx2)">
                <input type="checkbox" id="dlib-gerar" ${(!d || d.gerar_demanda !== false) ? "checked" : ""}
                  style="width:15px;height:15px;cursor:pointer">
                Gerar demanda automaticamente
              </label>
            </div>
          </div>
        </div>
        <div style="padding:14px 22px 18px;border-top:1px solid var(--bd1);display:flex;gap:8px;justify-content:flex-end">
          <button class="tbt" onclick="document.getElementById('modal-delib-atas').remove()">Cancelar</button>
          <button class="tbt pri" onclick="atasSalvarDelib(${d ? `'${d.id}'` : "null"})">${d ? "Salvar" : "Adicionar"}</button>
        </div>
      </div>`;

    document.body.appendChild(m);
  };

  window.atasSalvarDelib = async function (deliberacaoId) {
    const descricao = document.getElementById("dlib-desc")?.value?.trim();
    const tipo      = document.getElementById("dlib-tipo")?.value;

    if (!descricao) { _toast("Informe a descrição da deliberação.", "err"); return; }
    if (!tipo)      { _toast("Selecione o tipo da deliberação.", "err"); return; }

    const payload = {
      ata_id:       _ataEditando.id,
      descricao,
      tipo,
      departamento: document.getElementById("dlib-dept")?.value?.trim()  || null,
      responsavel:  document.getElementById("dlib-resp")?.value?.trim()  || null,
      prazo:        document.getElementById("dlib-prazo")?.value         || null,
      prioridade:   document.getElementById("dlib-prio")?.value          || "Média",
      gerar_demanda: document.getElementById("dlib-gerar")?.checked ?? true,
    };

    try {
      if (deliberacaoId) {
        await _patch("atas_deliberacoes", deliberacaoId, payload);
      } else {
        await _post("atas_deliberacoes", payload);
      }
      _invalidate();
      document.getElementById("modal-delib-atas")?.remove();
      _toast(deliberacaoId ? "Deliberação atualizada." : "Deliberação adicionada.", "ok");

      _deliberacoesTemp = await _get("atas_deliberacoes", `ata_id=eq.${_ataEditando.id}&order=created_at.asc`).catch(() => []);
      const sec = document.getElementById("atas-delib-section");
      if (sec) sec.innerHTML = _secaoDeliberacoes();
    } catch(e) { _toast("Erro: " + e.message, "err"); }
  };

  window.atasRemoverDelib = async function (id) {
    if (!confirm("Remover esta deliberação?")) return;
    try {
      await _del("atas_deliberacoes", id);
      _deliberacoesTemp = _deliberacoesTemp.filter(d => d.id !== id);
      const sec = document.getElementById("atas-delib-section");
      if (sec) sec.innerHTML = _secaoDeliberacoes();
      _toast("Deliberação removida.", "ok");
      _invalidate();
    } catch(e) { _toast("Erro: " + e.message, "err"); }
  };

  /* ══════════════════════════════════════════════════════
     DELIBERAÇÕES (GLOBAL)
  ══════════════════════════════════════════════════════ */

  async function renderDeliberacoesGlobal() {
    const el = document.getElementById("atas-delib-content");
    if (!el) return;
    el.innerHTML = _loading();

    const [atas, delibs] = await Promise.all([_loadAtas(true), _loadDelibs(true)]);
    const ataMap = {};
    atas.forEach(a => { ataMap[a.id] = a; });
    const enriched = delibs.map(d => ({ ...d, _ata: ataMap[d.ata_id] || null }));

    const deptos = [...new Set(enriched.map(d => d.departamento).filter(Boolean))].sort();

    el.innerHTML = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
        <input id="delib-busca" type="text" placeholder="Buscar descrição, responsável, departamento, nº ata..."
          style="flex:1;min-width:220px;padding:7px 10px;background:var(--bg-body);border:1px solid var(--bd1);border-radius:6px;color:var(--tx1);font-size:12px"
          oninput="atasAplicarFiltrosDelib()">
        <select id="delib-f-tipo" onchange="atasAplicarFiltrosDelib()"
          style="padding:7px 10px;background:var(--bg-body);border:1px solid var(--bd1);border-radius:6px;color:var(--tx2);font-size:12px">
          <option value="">Todos os tipos</option>
          <option value="APROVADO">Aprovado</option>
          <option value="REJEITADO">Rejeitado</option>
          <option value="ENCAMINHADO">Encaminhado</option>
          <option value="EM_ANALISE">Em Análise</option>
        </select>
        <select id="delib-f-dept" onchange="atasAplicarFiltrosDelib()"
          style="padding:7px 10px;background:var(--bg-body);border:1px solid var(--bd1);border-radius:6px;color:var(--tx2);font-size:12px">
          <option value="">Todos os departamentos</option>
          ${deptos.map(d => `<option value="${d}">${d}</option>`).join("")}
        </select>
      </div>
      <div id="delib-tabela-wrap">${_tabelaDelibs(enriched)}</div>`;

    window._delibsData = enriched;
  }

  function _tabelaDelibs(lista) {
    if (!lista.length) return _vazio("Nenhuma deliberação encontrada.");
    return `
      <div style="overflow-x:auto">
      <table class="tbl">
        <thead>
          <tr>
            <th>Nº Ata</th><th>Data</th><th>Descrição</th><th>Tipo</th>
            <th>Departamento</th><th>Responsável</th><th>Prazo</th>
            <th>Prior.</th><th>Gerar</th><th>Demanda</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(d => `
          <tr style="${isAtrasada(d.prazo) && !d.demanda_id ? "background:rgba(224,85,85,.04)" : ""}">
            <td class="tdc" style="cursor:pointer;font-weight:700" onclick="atasVerDetalhes('${d.ata_id}')">${d._ata?.numero || "—"}</td>
            <td class="mono" style="font-size:10.5px">${fmtD(d._ata?.data)}</td>
            <td style="font-size:12px;max-width:200px">${d.descricao || "—"}</td>
            <td>${pillDelib(d.tipo)}</td>
            <td style="font-size:11.5px">${d.departamento || "—"}</td>
            <td style="font-size:11.5px">${d.responsavel || "—"}</td>
            <td style="font-size:11px;font-family:var(--mono);color:${isAtrasada(d.prazo) ? "var(--rose)" : "var(--tx2)"}">${fmtD(d.prazo)}${isAtrasada(d.prazo) ? " ⚠" : ""}</td>
            <td>${pillPrio(d.prioridade)}</td>
            <td style="text-align:center;font-size:12px">${d.gerar_demanda ? '<span style="color:var(--gr)">✓</span>' : '<span style="color:var(--tx3)">—</span>'}</td>
            <td>
              ${d.demanda_id
                ? `<button class="tbt" style="font-size:10px;padding:2px 8px;color:var(--sky);border-color:var(--sky)" onclick="window.demAbrirDetalhe&&window.demAbrirDetalhe('${d.demanda_id}','atas-delib')">Abrir Demanda</button>`
                : `<span style="font-size:11px;color:var(--tx3)">${d.gerar_demanda ? "Pendente" : "—"}</span>`}
            </td>
          </tr>`).join("")}
        </tbody>
      </table>
      </div>`;
  }

  window.atasAplicarFiltrosDelib = function () {
    const busca  = (document.getElementById("delib-busca")?.value || "").toLowerCase();
    const fTipo  = document.getElementById("delib-f-tipo")?.value || "";
    const fDept  = document.getElementById("delib-f-dept")?.value || "";
    const lista  = (window._delibsData || []).filter(d =>
      (!busca || [d.descricao, d.responsavel, d.departamento, d._ata?.numero].some(v => (v || "").toLowerCase().includes(busca))) &&
      (!fTipo  || d.tipo === fTipo) &&
      (!fDept  || d.departamento === fDept)
    );
    const wrap = document.getElementById("delib-tabela-wrap");
    if (wrap) wrap.innerHTML = _tabelaDelibs(lista);
  };

  /* ══════════════════════════════════════════════════════
     VISUALIZAR ATA (MODAL DE DETALHE)
  ══════════════════════════════════════════════════════ */

  window.atasVerDetalhes = async function (id) {
    let modal = document.getElementById("modal-ata-detalhe");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "modal-ata-detalhe";
      modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);z-index:9998;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
      modal.onclick = e => { if (e.target === modal) modal.remove(); };
      document.body.appendChild(modal);
    }
    modal.innerHTML = `<div style="background:var(--bg-card);border-radius:12px;width:100%;max-width:800px;margin:auto;box-shadow:0 20px 60px rgba(0,0,0,.4);min-height:100px">${_loading("Carregando ata...")}</div>`;

    try {
      const [ataRows, delibRows, demRows] = await Promise.all([
        _get("atas", `id=eq.${id}`),
        _get("atas_deliberacoes", `ata_id=eq.${id}&order=created_at.asc`),
        _get("demandas", `ata_id=eq.${id}&order=criado_em.desc`).catch(() => []),
      ]);

      const ata = ataRows[0];
      if (!ata) {
        modal.innerHTML = `<div style="background:var(--bg-card);border-radius:12px;padding:24px;max-width:800px;margin:auto">${_vazio("Ata não encontrada.")}<div style="text-align:center"><button class="tbt" onclick="document.getElementById('modal-ata-detalhe').remove()">Fechar</button></div></div>`;
        return;
      }

      const infoBloco = [
        ["Presidente", ata.presidente],
        ["Secretário",  ata.secretario],
        ["Local",       ata.local],
        ["Tipo",        tipoLabel(ata.tipo)],
      ].filter(([, v]) => v);

      modal.innerHTML = `
        <div style="background:var(--bg-card);border-radius:12px;width:100%;max-width:800px;margin:auto;box-shadow:0 20px 60px rgba(0,0,0,.4)">
          <!-- Header -->
          <div style="padding:20px 24px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:flex-start;justify-content:space-between;position:sticky;top:0;background:var(--bg-card);border-radius:12px 12px 0 0;z-index:1">
            <div>
              <div style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Conselho e Governança · Atas</div>
              <div style="font-size:18px;font-weight:700;color:var(--tx1)">Ata ${ata.numero || ""} — ${tipoLabel(ata.tipo)}</div>
              <div style="margin-top:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                ${pillAta(ata.status)}
                <span style="font-size:11.5px;color:var(--tx3)">${fmtD(ata.data)}</span>
                ${ata.hora_inicio ? `<span style="font-size:11.5px;color:var(--tx3)">${ata.hora_inicio}${ata.hora_fim ? " — " + ata.hora_fim : ""}</span>` : ""}
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
              ${ata.status === "RASCUNHO" ? `<button class="tbt" style="color:var(--gr);border-color:var(--gr);font-size:12px" onclick="atasAprovar('${ata.id}')">Aprovar Ata</button>` : ""}
              ${ata.status !== "APROVADA" && ata.status !== "ARQUIVADA" ? `<button class="tbt" style="color:var(--gold);border-color:var(--gold);font-size:12px" onclick="document.getElementById('modal-ata-detalhe').remove();atasEditarAta('${ata.id}')">Editar</button>` : ""}
              <button onclick="document.getElementById('modal-ata-detalhe').remove()" style="background:none;border:none;font-size:22px;color:var(--tx3);cursor:pointer;padding:4px 8px;border-radius:6px">×</button>
            </div>
          </div>

          <div style="padding:20px 24px;display:flex;flex-direction:column;gap:20px">
            <!-- Dados -->
            ${infoBloco.length > 0 || ata.sintese ? `
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
              ${infoBloco.map(([lbl, val]) => `
                <div style="background:var(--bg-body);border-radius:8px;padding:10px 14px">
                  <div style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">${lbl}</div>
                  <div style="font-size:13px;color:var(--tx1)">${val}</div>
                </div>`).join("")}
              ${ata.sintese ? `
                <div style="background:var(--bg-body);border-radius:8px;padding:10px 14px;grid-column:1/-1">
                  <div style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Síntese / Pauta</div>
                  <div style="font-size:13px;color:var(--tx1);line-height:1.5">${ata.sintese}</div>
                </div>` : ""}
            </div>` : ""}

            <!-- Deliberações -->
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--tx1);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
                <span>Deliberações <span style="font-size:11px;color:var(--tx3);font-weight:400">(${delibRows.length})</span></span>
                ${ata.status === "RASCUNHO" ? `<button class="tbt" style="font-size:11px" onclick="document.getElementById('modal-ata-detalhe').remove();atasEditarAta('${ata.id}')">+ Adicionar</button>` : ""}
              </div>
              ${delibRows.length === 0 ? _vazio("Nenhuma deliberação registrada.") : `
                <div style="overflow-x:auto">
                <table class="tbl">
                  <thead><tr><th>Descrição</th><th>Tipo</th><th>Depto</th><th>Responsável</th><th>Prazo</th><th>Prior.</th><th>Demanda</th></tr></thead>
                  <tbody>
                    ${delibRows.map(d => `
                    <tr style="${isAtrasada(d.prazo) ? "background:rgba(224,85,85,.04)" : ""}">
                      <td style="font-size:12px;max-width:200px">${d.descricao || "—"}</td>
                      <td>${pillDelib(d.tipo)}</td>
                      <td style="font-size:11px">${d.departamento || "—"}</td>
                      <td style="font-size:11px">${d.responsavel || "—"}</td>
                      <td style="font-size:11px;color:${isAtrasada(d.prazo) ? "var(--rose)" : "var(--tx2)"}">${fmtD(d.prazo)}${isAtrasada(d.prazo) ? " ⚠" : ""}</td>
                      <td>${pillPrio(d.prioridade)}</td>
                      <td>${d.demanda_id ? `<button class="tbt" style="font-size:10px;padding:2px 6px;color:var(--sky)" onclick="window.demAbrirDetalhe&&window.demAbrirDetalhe('${d.demanda_id}','atas-dash')">Abrir</button>` : '<span style="font-size:11px;color:var(--tx3)">—</span>'}</td>
                    </tr>`).join("")}
                  </tbody>
                </table>
                </div>`}
            </div>

            <!-- Demandas geradas -->
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--tx1);margin-bottom:10px">
                Demandas Geradas <span style="font-size:11px;color:var(--tx3);font-weight:400">(${demRows.length})</span>
              </div>
              ${demRows.length === 0 ? _vazio("Nenhuma demanda vinculada a esta ata.") : `
                <div style="overflow-x:auto">
                <table class="tbl">
                  <thead><tr><th>Título</th><th>Status</th><th>Responsável</th><th>Prazo</th><th></th></tr></thead>
                  <tbody>
                    ${demRows.map(d => `
                    <tr>
                      <td style="font-size:12px">${d.titulo || "—"}</td>
                      <td><span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;background:rgba(90,96,104,.15);color:var(--tx2)">${(d.status || "").replace("_", " ")}</span></td>
                      <td style="font-size:11.5px">${d.responsavel || "—"}</td>
                      <td style="font-size:11px;color:${isAtrasada(d.prazo || d.data_conclusao_prevista) ? "var(--rose)" : "var(--tx2)"}">${fmtD(d.prazo || d.data_conclusao_prevista)}</td>
                      <td><button class="tbt" style="font-size:10px;padding:2px 8px" onclick="window.demAbrirDetalhe&&window.demAbrirDetalhe('${d.id}','atas-dash')">Ver</button></td>
                    </tr>`).join("")}
                  </tbody>
                </table>
                </div>`}
            </div>
          </div>
        </div>`;
    } catch(e) {
      modal.innerHTML = `<div style="background:var(--bg-card);border-radius:12px;padding:24px;max-width:800px;margin:auto">
        <div class="alr alr-r">Erro ao carregar: ${e.message}</div>
        <div style="margin-top:12px;text-align:center"><button class="tbt" onclick="document.getElementById('modal-ata-detalhe').remove()">Fechar</button></div>
      </div>`;
    }
  };

  /* ── Editar ata (navega e carrega) ──────────────────── */

  window.atasEditarAta = function (id) {
    window.go("atas-nova");
    setTimeout(() => renderNovaAta(id), 60);
  };

  /* ══════════════════════════════════════════════════════
     TOAST
  ══════════════════════════════════════════════════════ */

  function _toast(msg, tipo) {
    let t = document.getElementById("_atas-toasts");
    if (!t) {
      t = document.createElement("div");
      t.id = "_atas-toasts";
      t.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none";
      document.body.appendChild(t);
    }
    const item = document.createElement("div");
    item.style.cssText = `background:${tipo === "ok" ? "var(--gr)" : "var(--rose)"};color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,.3);max-width:340px;pointer-events:auto`;
    item.textContent = msg;
    t.appendChild(item);
    setTimeout(() => item.remove(), 4000);
  }

  /* ══════════════════════════════════════════════════════
     NAVEGAÇÃO — intercepta window.go
  ══════════════════════════════════════════════════════ */

  const _origGo = window.go;
  window.go = function (id) {
    _origGo(id);
    const MAP = {
      "atas-dash":  () => renderDash(),
      "atas-todas": () => renderTodasAtas(),
      "atas-nova":  () => renderNovaAta(null),
      "atas-delib": () => renderDeliberacoesGlobal(),
    };
    if (MAP[id]) MAP[id]();
  };

})();
