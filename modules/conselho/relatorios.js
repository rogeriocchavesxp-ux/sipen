// conselho/relatorios.js · v1.0.0
// Relatórios de Governança: hub + Frequência de Cultos

(function () {
  "use strict";

  // ── utilidades locais ──────────────────────────────────────────────────────

  const _esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const _n   = v => (v == null || isNaN(+v)) ? null : +v;
  const _sum = (arr, k) => arr.reduce((a, r) => a + (_n(r[k]) || 0), 0);

  function _fmtData(d) {
    if (!d) return "";
    const [y, m, day] = String(d).slice(0, 10).split("-");
    return `${day}/${m}/${y}`;
  }

  function _fmtMes(yyyymm) {
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
                   "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const [y, m] = String(yyyymm).split("-");
    return `${meses[+m - 1] || m}/${y}`;
  }

  function _base() { return typeof apiBaseUrl === "function" ? apiBaseUrl() : ""; }
  function _hdrs() { return typeof apiHeaders  === "function" ? apiHeaders()  : {}; }

  async function _get(path) {
    const r = await fetch(`${_base()}/rest/v1/${path}`, { headers: _hdrs() });
    if (!r.ok) return [];
    return r.json();
  }

  // ── Hub de Relatórios ──────────────────────────────────────────────────────

  function renderGovRelatorios() {
    const el = document.getElementById("gov-rel-hub-ct");
    if (!el) return;

    const sky   = "var(--sky)";
    const bgSky = "rgba(74,156,245,";

    const relatorios = [
      {
        icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        titulo: "Frequência de Cultos",
        desc:   "Sede e congregações — adultos, crianças, visitantes e decisões de fé",
        route:  "gov-rel-frequencia",
      },
    ];

    const sv = p => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

    el.innerHTML = `
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:12px">Relatórios disponíveis</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
        ${relatorios.map(rel => `
          <div class="card" style="cursor:pointer;display:flex;align-items:flex-start;gap:14px;padding:16px"
               onclick="go('${rel.route}')">
            <div style="flex-shrink:0;width:40px;height:40px;border-radius:10px;background:${bgSky}0.12);border:1px solid ${bgSky}0.25);display:flex;align-items:center;justify-content:center;color:${sky}">
              ${sv(rel.icon)}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--tx1);margin-bottom:3px">${_esc(rel.titulo)}</div>
              <div style="font-size:11.5px;color:var(--tx3);line-height:1.4">${_esc(rel.desc)}</div>
            </div>
          </div>
        `).join("")}
      </div>`;
  }

  // ── Frequência de Cultos ───────────────────────────────────────────────────

  let _freqData = null; // cache dos dados brutos

  async function _carregarDados() {
    const [sedeRows, cultos, congCultos, congs] = await Promise.all([
      _get("culto_pos_culto?select=culto_id,adultos,criancas,visitantes,decisoes&order=culto_id.asc&limit=2000"),
      _get("cultos?select=id,data_inicio,local_nome&order=data_inicio.asc&limit=2000"),
      _get("congregacao_cultos?select=cong_id,adultos,criancas,visitantes,decisoes,data,tipo&order=data.asc&limit=2000"),
      _get("congregacoes?select=id,nome&deleted_at=is.null&order=nome.asc"),
    ]);

    // Mapear cultos por id para join
    const cultoMap = {};
    (cultos || []).forEach(c => { cultoMap[c.id] = c; });

    const congMap = {};
    (congs || []).forEach(c => { congMap[c.id] = c.nome; });

    // Sede: enriquecer com data do culto
    const sede = (sedeRows || [])
      .map(r => {
        const c = cultoMap[r.culto_id] || {};
        const data = c.data_inicio ? c.data_inicio.slice(0, 10) : null;
        return {
          data,
          unidade: "Sede",
          local: c.local_nome || "Sede",
          adultos:   _n(r.adultos)   || 0,
          criancas:  _n(r.criancas)  || 0,
          visitantes:_n(r.visitantes)|| 0,
          decisoes:  _n(r.decisoes)  || 0,
        };
      })
      .filter(r => r.data);

    // Congregações
    const congregacoes = (congCultos || [])
      .map(r => ({
        data:       r.data ? String(r.data).slice(0, 10) : null,
        unidade:    congMap[r.cong_id] || "Congregação",
        local:      r.tipo || "",
        adultos:    _n(r.adultos)    || 0,
        criancas:   _n(r.criancas)   || 0,
        visitantes: _n(r.visitantes) || 0,
        decisoes:   _n(r.decisoes)   || 0,
      }))
      .filter(r => r.data);

    _freqData = { sede, congregacoes, congMap };
  }

  function _buildFiltros(todos) {
    const anos = [...new Set(todos.map(r => r.data.slice(0, 4)))].sort().reverse();
    const unidades = ["Todas", "Sede", ...Object.values(_freqData.congMap).sort()];
    const anoAtual = new Date().getFullYear().toString();
    const ano = anos.includes(anoAtual) ? anoAtual : (anos[0] || anoAtual);

    return { anos, unidades, anoSel: ano, mesSel: "0", unidSel: "Todas" };
  }

  function _filtrar(todos, { anoSel, mesSel, unidSel }) {
    return todos.filter(r => {
      const [y, m] = r.data.split("-");
      if (y !== anoSel) return false;
      if (mesSel !== "0" && m !== mesSel.padStart(2, "0")) return false;
      if (unidSel !== "Todas") {
        if (unidSel === "Sede" && r.unidade !== "Sede") return false;
        if (unidSel !== "Sede" && r.unidade !== unidSel) return false;
      }
      return true;
    });
  }

  function _renderTabela(rows) {
    if (!rows.length) return `<div style="padding:24px;text-align:center;color:var(--tx3);font-size:12px">Nenhum dado para os filtros selecionados</div>`;

    const linhas = rows
      .slice()
      .sort((a, b) => b.data.localeCompare(a.data))
      .map(r => `
        <tr>
          <td>${_fmtData(r.data)}</td>
          <td>${_esc(r.unidade)}</td>
          <td style="text-align:right;font-variant-numeric:tabular-nums">${r.adultos || "—"}</td>
          <td style="text-align:right;font-variant-numeric:tabular-nums">${r.criancas || "—"}</td>
          <td style="text-align:right;font-variant-numeric:tabular-nums">${r.visitantes || "—"}</td>
          <td style="text-align:right;font-variant-numeric:tabular-nums">${r.decisoes || "—"}</td>
        </tr>`)
      .join("");

    return `
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead>
            <tr>
              <th>Data</th>
              <th>Unidade</th>
              <th style="text-align:right">Adultos</th>
              <th style="text-align:right">Crianças</th>
              <th style="text-align:right">Visitantes</th>
              <th style="text-align:right">Decisões</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>`;
  }

  function _renderBarras(rows) {
    // Agrupar por mês
    const por = {};
    rows.forEach(r => {
      const k = r.data.slice(0, 7);
      if (!por[k]) por[k] = { adultos: 0, criancas: 0, visitantes: 0, decisoes: 0 };
      por[k].adultos    += r.adultos;
      por[k].criancas   += r.criancas;
      por[k].visitantes += r.visitantes;
      por[k].decisoes   += r.decisoes;
    });

    const meses = Object.keys(por).sort();
    if (!meses.length) return "";

    const maxAdultos = Math.max(...meses.map(k => por[k].adultos), 1);

    const barras = meses.map(k => {
      const d = por[k];
      const pct = Math.round((d.adultos / maxAdultos) * 100);
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid var(--bd1)">
          <div style="font-size:11px;color:var(--tx3);min-width:64px;flex-shrink:0">${_fmtMes(k)}</div>
          <div style="flex:1;height:8px;border-radius:4px;background:var(--bg3);overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--sky);border-radius:4px;transition:width .4s"></div>
          </div>
          <div style="font-size:11.5px;font-weight:700;color:var(--sky);min-width:36px;text-align:right;font-variant-numeric:tabular-nums">${d.adultos}</div>
          <div style="font-size:10px;color:var(--tx3);min-width:60px">crian: ${d.criancas} · dec: ${d.decisoes}</div>
        </div>`;
    }).join("");

    return `
      <div class="card" style="margin-bottom:14px">
        <div class="ctit">Adultos por mês</div>
        ${barras}
      </div>`;
  }

  function _renderKpis(rows) {
    const adultos    = _sum(rows, "adultos");
    const criancas   = _sum(rows, "criancas");
    const visitantes = _sum(rows, "visitantes");
    const decisoes   = _sum(rows, "decisoes");
    const media      = rows.length ? Math.round(adultos / rows.length) : 0;

    const sky   = "var(--sky)";
    const gr    = "var(--gr)";
    const amber = "var(--amber)";
    const rose  = "var(--rose)";

    const kpi = (cor, bg, val, label, sub) => `
      <div class="kpi">
        <div class="kpi-ico" style="background:${bg};color:${cor}">◎</div>
        <div class="kpi-body">
          <div class="kpi-lbl">${label}</div>
          <div class="kpi-val">${val.toLocaleString("pt-BR")}</div>
          <div class="kpi-d nu">${sub}</div>
        </div>
      </div>`;

    return `
      <div class="kpis c4" style="margin-bottom:14px">
        ${kpi(sky,   "rgba(74,156,245,0.12)",  adultos,    "Adultos",    `média ${media}/culto`)}
        ${kpi(gr,    "rgba(58,170,92,0.12)",   criancas,   "Crianças",   `${rows.length} cultos`)}
        ${kpi(amber, "rgba(224,138,42,0.12)",  visitantes, "Visitantes", "no período")}
        ${kpi(rose,  "rgba(208,104,104,0.12)", decisoes,   "Decisões",   "de fé")}
      </div>`;
  }

  function _renderFiltros({ anos, unidades, anoSel, mesSel, unidSel }) {
    const meses = [
      ["0", "Todos os meses"], ["01", "Janeiro"], ["02", "Fevereiro"],
      ["03", "Março"], ["04", "Abril"], ["05", "Maio"], ["06", "Junho"],
      ["07", "Julho"], ["08", "Agosto"], ["09", "Setembro"],
      ["10", "Outubro"], ["11", "Novembro"], ["12", "Dezembro"],
    ];
    const selAno  = anos.map(a    => `<option value="${a}"  ${a === anoSel    ? "selected" : ""}>${a}</option>`).join("");
    const selMes  = meses.map(([v, l]) => `<option value="${v}" ${v === mesSel    ? "selected" : ""}>${l}</option>`).join("");
    const selUnid = unidades.map(u => `<option value="${_esc(u)}" ${u === unidSel  ? "selected" : ""}>${_esc(u)}</option>`).join("");

    return `
      <div class="card" style="margin-bottom:14px;padding:12px 16px">
        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
          <div style="display:flex;align-items:center;gap:6px">
            <label style="font-size:11px;color:var(--tx3);font-weight:600">Ano</label>
            <select id="grf-ano" class="sel" onchange="govRelFreqFiltrar()" style="font-size:12px">${selAno}</select>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <label style="font-size:11px;color:var(--tx3);font-weight:600">Mês</label>
            <select id="grf-mes" class="sel" onchange="govRelFreqFiltrar()" style="font-size:12px">${selMes}</select>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <label style="font-size:11px;color:var(--tx3);font-weight:600">Unidade</label>
            <select id="grf-unid" class="sel" onchange="govRelFreqFiltrar()" style="font-size:12px">${selUnid}</select>
          </div>
        </div>
      </div>`;
  }

  function _renderConteudo(filtros) {
    const todos = [...(_freqData.sede || []), ...(_freqData.congregacoes || [])];
    const rows  = _filtrar(todos, filtros);
    const ct    = document.getElementById("gov-rel-freq-ct");
    if (!ct) return;

    ct.innerHTML =
      _renderFiltros(filtros) +
      _renderKpis(rows) +
      _renderBarras(rows) +
      `<div class="card"><div class="ctit">Registros (${rows.length})</div>${_renderTabela(rows)}</div>`;
  }

  let _filtrosAtivos = null;

  async function renderGovRelFrequencia() {
    const ct = document.getElementById("gov-rel-freq-ct");
    if (!ct) return;
    ct.innerHTML = `<div style="padding:32px;text-align:center;color:var(--tx3)">Carregando dados…</div>`;

    try {
      await _carregarDados();
      const todos = [...(_freqData.sede || []), ...(_freqData.congregacoes || [])];
      _filtrosAtivos = _buildFiltros(todos);
      _renderConteudo(_filtrosAtivos);
    } catch (e) {
      ct.innerHTML = `<div style="padding:32px;text-align:center;color:var(--rose)">Erro ao carregar dados: ${_esc(e.message)}</div>`;
    }
  }

  // ── handlers globais ───────────────────────────────────────────────────────

  window.govRelFreqAtualizar = async function () {
    _freqData = null;
    _filtrosAtivos = null;
    await renderGovRelFrequencia();
  };

  window.govRelFreqFiltrar = function () {
    if (!_filtrosAtivos) return;
    _filtrosAtivos.anoSel  = document.getElementById("grf-ano")?.value  || _filtrosAtivos.anoSel;
    _filtrosAtivos.mesSel  = document.getElementById("grf-mes")?.value  || _filtrosAtivos.mesSel;
    _filtrosAtivos.unidSel = document.getElementById("grf-unid")?.value || _filtrosAtivos.unidSel;
    _renderConteudo(_filtrosAtivos);
  };

  // ── registro ───────────────────────────────────────────────────────────────

  if (typeof VIEW_AUTOLOAD !== "undefined") {
    VIEW_AUTOLOAD["gov-relatorios"]    = { fn: renderGovRelatorios };
    VIEW_AUTOLOAD["gov-rel-frequencia"] = { fn: renderGovRelFrequencia };
  }
})();
