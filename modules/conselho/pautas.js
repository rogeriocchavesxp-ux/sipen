/* ═══════════════════════════════════════════════════════════════
   SIPEN — Pautas do Conselho  v6.31.7
   Gestão de pautas, reuniões e deliberações do Conselho IPPenha
═══════════════════════════════════════════════════════════════ */
(function () {

  /* ── Config ──────────────────────────────────────────────── */

  const STATUS_CFG = {
    PENDENTE:   { label: "Pendente",    cls: "pz", cor: "var(--tx3)"   },
    EM_ANALISE: { label: "Em análise",  cls: "po", cor: "var(--amber)"  },
    APROVADO:   { label: "Aprovado",    cls: "pd", cor: "var(--gr)"     },
    REJEITADO:  { label: "Rejeitado",   cls: "pl", cor: "var(--rose)"   },
    ADIADO:     { label: "Adiado",      cls: "pn", cor: "var(--blue)"   },
    CONCLUIDO:  { label: "Concluído",   cls: "pv", cor: "var(--violet)" },
  };


  const TIPO_REUNIAO = {
    ORDINARIA:          "Ordinária",
    EXTRAORDINARIA:     "Extraordinária",
    COMISSAO_EXECUTIVA: "Comissão Executiva",
  };

  const STATUS_REUNIAO = {
    AGENDADA:  { label: "Agendada",  cls: "pn" },
    REALIZADA: { label: "Realizada", cls: "pd" },
    CANCELADA: { label: "Cancelada", cls: "pl" },
  };

  const CATEGORIAS = [
    "Administrativo",
    "Cartas",
    "Comissões",
    "Contratações",
    "Contratos",
    "Deliberações Pastorais",
    "Estrutura Administrativa",
    "Eventos",
    "Financeiro",
    "Indicações",
    "Patrimônio",
    "Prestação de Contas",
    "Projetos Ministeriais",
    "Recursos Humanos",
    "Relatórios",
    "Solicitações",
    "Geral",
  ];

  /* ── Estado ──────────────────────────────────────────────── */

  let _reunioes     = null;
  let _pautas       = null;
  let _reuniaoAtual = null;
  let _pautaEditando = null;
  let _filtroStatus = "";
  let _filtroCategoria = "";
  let _modalAberto  = null;
  let _presencasEdit = null;
  let _oficiaisCache = null;

  /* ── Helpers ─────────────────────────────────────────────── */

  function _eh(v) {
    if (typeof escapeHtml === "function") return escapeHtml(v);
    return String(v ?? "").replace(/[&<>"']/g, s =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
  }
  function _ea(v) {
    return typeof escapeHtmlAttr === "function" ? escapeHtmlAttr(v) : _eh(v).replace(/`/g, "&#96;");
  }
  function _api() {
    if (typeof apiBaseUrl === "function") return apiBaseUrl();
    throw new Error("apiBaseUrl indisponível");
  }
  function _headers(extra) {
    if (typeof apiHeaders === "function") return apiHeaders(extra || {});
    throw new Error("apiHeaders indisponível");
  }
  function _toast(t, s) {
    if (typeof T === "function") T(t, s || "");
    else alert([t, s].filter(Boolean).join("\n"));
  }
  function _user()  { return typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL : null; }
  function _view(id) { return document.getElementById(id); }

  async function _notificarConselhoWA(mensagem, tipo, referenciaId) {
    if (typeof WA === "undefined") return;
    const base = typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL.trim().replace(/\/$/, "") : "";
    const hdrs = typeof apiHeaders === "function" ? apiHeaders() : {};
    let rows = [];
    try {
      const res = await fetch(
        `${base}/rest/v1/whatsapp_modulo_responsaveis?modulo=eq.CONSELHO&ativo=eq.true` +
        `&select=pessoa_id,pessoas(id,nome,telefone,celular)`,
        { headers: hdrs }
      );
      rows = res.ok ? await res.json() : [];
    } catch (_) {}
    if (!rows.length) {
      try {
        const res = await fetch(
          `${base}/rest/v1/user_profiles?role=eq.admin&ativo=eq.true` +
          `&select=pessoa_id,pessoas(id,nome,telefone,celular)`,
          { headers: hdrs }
        );
        rows = res.ok ? await res.json() : [];
      } catch (_) {}
    }
    for (const row of rows) {
      const p = row.pessoas;
      if (!p) continue;
      const tel = p.celular || p.telefone;
      if (!tel) continue;
      WA.send({
        para:        tel,
        nome:        p.nome,
        mensagem,
        modulo:      "CONSELHO",
        referenciaT: tipo,
        referenciaId,
        chave:       `CONSELHO_${tipo.toUpperCase()}_${referenciaId}_${row.pessoa_id}`,
      }).catch(() => {});
    }
  }

  function _fmtData(d) {
    if (!d) return "—";
    const [y, m, day] = String(d).slice(0, 10).split("-");
    if (!day) return d;
    const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
    return `${day} ${meses[+m - 1]} ${y}`;
  }
  function _fmtDataLonga(d) {
    if (!d) return "—";
    const dt = new Date(d + "T12:00:00");
    return dt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }
  function _fmtHora(t) {
    if (!d) return "";
    return String(t).slice(0, 5);
  }
  function _mesAno(d) {
    if (!d) return "";
    const [y, m] = String(d).slice(0, 10).split("-");
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                   "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    return `${meses[+m - 1]}/${y}`;
  }
  function _hojeIso() { return new Date().toISOString().slice(0, 10); }

  function _podeAdmin() {
    const u = _user();
    if (!u) return false;
    return u.perfil === "ADMINISTRADOR_GERAL";
  }
  function _podeEditar(pauta) {
    const u = _user();
    if (!u) return false;
    if (_podeAdmin()) return true;
    if (pauta && String(pauta.created_by) === String(u.id) && pauta.status === "PENDENTE") return true;
    const p = typeof permissoesUsuario !== "undefined" ? permissoesUsuario : {};
    return p.CONSELHO === "COMPLETO" || p.CONSELHO === "EDICAO";
  }
  function _podeSecretaria() {
    const u = _user();
    if (!u) return false;
    if (_podeAdmin()) return true;
    const p = typeof permissoesUsuario !== "undefined" ? permissoesUsuario : {};
    return p.CONSELHO === "COMPLETO" || p.CONSELHO === "EDICAO";
  }

  async function _fetchJson(url, opts) {
    const res = await fetch(url, opts || { headers: _headers() });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); msg = j.message || j.error || msg; } catch (_) {}
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }

  async function _registrarHistorico(pautaId, campo, antes, depois) {
    try {
      const u = _user();
      await _fetchJson(`${_api()}/rest/v1/conselho_pautas_historico`, {
        method: "POST",
        headers: _headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({
          pauta_id:    pautaId,
          campo,
          valor_antes: antes != null ? String(antes) : null,
          valor_depois: depois != null ? String(depois) : null,
          alterado_por: u?.id || null,
        }),
      });
    } catch (_) {}
  }

  /* ── REUNIÕES — helpers de presença e formulário ────────── */

  const _PRESENCA_GRUPOS = [
    { tipo: "PASTOR_PRESENTE",     lbl: "Presentes — Pastores",    cargos: ["pastor"],             cls: "" },
    { tipo: "PRESBITERO_PRESENTE", lbl: "Presentes — Presbíteros", cargos: ["presbitero"],         cls: "" },
    { tipo: "ONLINE",              lbl: "Presença Online",         cargos: ["pastor","presbitero"], cls: "mr-chip-online" },
    { tipo: "PASTOR_AUSENTE",      lbl: "Ausentes — Pastores",     cargos: ["pastor"],             cls: "mr-chip-aus" },
    { tipo: "PRESBITERO_AUSENTE",  lbl: "Ausentes — Presbíteros",  cargos: ["presbitero"],         cls: "mr-chip-aus" },
    { tipo: "AUSENTE_JUSTIFICADO", lbl: "Ausentes Justificados",   cargos: ["pastor","presbitero"], cls: "mr-chip-just" },
  ];

  function _injectMRStyles() {
    if (document.getElementById("mr-styles")) return;
    const s = document.createElement("style");
    s.id = "mr-styles";
    s.textContent = `
      .mr-tabs{display:flex;gap:0;border-bottom:1px solid var(--bd1);margin-bottom:18px}
      .mr-tab{padding:8px 14px;border:none;background:none;color:var(--tx3);font-size:12px;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap}
      .mr-tab.on{color:var(--tx1);border-bottom-color:var(--sky);font-weight:500}
      .mr-chips{display:flex;flex-wrap:wrap;gap:5px;min-height:28px;margin-bottom:5px}
      .mr-chip{display:inline-flex;align-items:center;gap:4px;background:rgba(88,152,212,.14);border:1px solid rgba(88,152,212,.28);border-radius:20px;padding:3px 10px;font-size:11.5px;color:var(--tx1)}
      .mr-chip button{background:none;border:none;color:var(--tx3);cursor:pointer;padding:0 0 0 4px;font-size:13px;line-height:1}
      .mr-chip-online{background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.28)}
      .mr-chip-aus{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.22)}
      .mr-chip-just{background:rgba(148,163,184,.12);border-color:rgba(148,163,184,.25)}
      .mr-autocomplete{position:relative}
      .mr-drop{position:absolute;top:calc(100% + 2px);left:0;right:0;background:var(--bg3,#2a2d31);border:1px solid var(--bd2);border-radius:6px;z-index:200;max-height:180px;overflow-y:auto;display:none;box-shadow:0 4px 16px rgba(0,0,0,.35)}
      .mr-drop-item{padding:8px 12px;cursor:pointer;font-size:12.5px;display:flex;align-items:center;justify-content:space-between}
      .mr-drop-item:hover{background:rgba(255,255,255,.05)}
      .mr-grp-ttl{font-size:10.5px;font-weight:600;color:var(--sky);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px;padding-bottom:5px;border-bottom:1px solid var(--bd1)}
      .mr-inp{width:100%;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 11px;box-sizing:border-box}
      .mr-inp:focus{outline:none;border-color:var(--sky)}
      .mr-lbl{font-size:11px;color:var(--tx3);display:block;margin-bottom:4px}
      .mr-section{display:flex;flex-direction:column;gap:14px}
      .mr-row{display:grid;gap:12px}
      select.mr-inp{appearance:auto}
      textarea.mr-inp{font-family:inherit;resize:vertical}
    `;
    document.head.appendChild(s);
  }

  async function _carregarOficiais() {
    if (_oficiaisCache) return;
    try {
      const data = await _fetchJson(
        `${_api()}/rest/v1/oficiais?select=id,cargo,pessoa_id,pessoas(id,nome)&status=eq.ativo&deleted_at=is.null`,
        { headers: _headers() }
      );
      _oficiaisCache = (data || []).filter(o => o.pessoas?.nome);
    } catch (_) { _oficiaisCache = []; }
  }

  async function _carregarPresencas(reuniaoId) {
    if (!reuniaoId) return null;
    try {
      const rows = await _fetchJson(
        `${_api()}/rest/v1/conselho_reuniao_presentes?reuniao_id=eq.${encodeURIComponent(reuniaoId)}&select=*&order=nome.asc`,
        { headers: _headers() }
      ) || [];
      const result = {};
      _PRESENCA_GRUPOS.forEach(g => { result[g.tipo] = []; });
      rows.forEach(r => { if (result[r.tipo]) result[r.tipo].push({ pessoa_id: r.pessoa_id, nome: r.nome }); });
      return result;
    } catch (_) { return null; }
  }

  async function _salvarPresencas(reuniaoId) {
    if (!_presencasEdit || !reuniaoId) return;
    try {
      await _fetchJson(`${_api()}/rest/v1/conselho_reuniao_presentes?reuniao_id=eq.${encodeURIComponent(reuniaoId)}`, {
        method: "DELETE", headers: _headers(),
      });
    } catch (_) {}
    const todos = [];
    for (const [tipo, lista] of Object.entries(_presencasEdit)) {
      for (const p of lista) todos.push({ reuniao_id: reuniaoId, pessoa_id: p.pessoa_id || null, nome: p.nome, tipo });
    }
    if (!todos.length) return;
    await _fetchJson(`${_api()}/rest/v1/conselho_reuniao_presentes`, {
      method: "POST",
      headers: _headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify(todos),
    });
  }

  function _renderChipsMR(tipo) {
    const el = document.getElementById(`mr-chips-${tipo}`);
    if (!el || !_presencasEdit) return;
    const cls = (_PRESENCA_GRUPOS.find(g => g.tipo === tipo) || {}).cls || "";
    el.innerHTML = (_presencasEdit[tipo] || []).map((p, i) =>
      `<span class="mr-chip ${cls}">${_eh(p.nome)}<button type="button" onclick="mrRemoverPresenca('${tipo}',${i})">×</button></span>`
    ).join("");
  }

  function _setupMRAutocomplete(tipo, cargos) {
    const input = document.getElementById(`mr-search-${tipo}`);
    const drop  = document.getElementById(`mr-drop-${tipo}`);
    if (!input || !drop) return;

    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { drop.style.display = "none"; return; }
      const jaAdicionados = new Set((_presencasEdit[tipo] || []).map(p => p.pessoa_id).filter(Boolean));
      const matches = (_oficiaisCache || [])
        .filter(o => cargos.includes(o.cargo) && o.pessoas.nome.toLowerCase().includes(q) && !jaAdicionados.has(o.id))
        .sort((a, b) => a.pessoas.nome.localeCompare(b.pessoas.nome))
        .slice(0, 8);
      if (!matches.length) { drop.style.display = "none"; return; }
      drop.innerHTML = matches.map(o =>
        `<div class="mr-drop-item" onmousedown="mrAdicionarPresenca('${tipo}','${_ea(o.id)}','${_ea(o.pessoas.nome)}')">
          <span>${_eh(o.pessoas.nome)}</span>
          <span style="font-size:10px;color:var(--tx3);background:rgba(255,255,255,.07);padding:2px 7px;border-radius:10px">${o.cargo}</span>
        </div>`
      ).join("");
      drop.style.display = "block";
    });

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        const q = input.value.trim();
        if (q) { mrAdicionarPresenca(tipo, null, q); input.value = ""; drop.style.display = "none"; }
      }
      if (e.key === "Escape") { drop.style.display = "none"; }
    });

    input.addEventListener("blur", () => setTimeout(() => { drop.style.display = "none"; }, 150));
  }

  window.mrAba = function (tab) {
    document.querySelectorAll("#modal-reuniao .mr-tab").forEach(t => t.classList.remove("on"));
    document.querySelectorAll("#modal-reuniao .mr-panel").forEach(p => { p.style.display = "none"; });
    const btn = document.getElementById(`mr-tab-${tab}`);
    const panel = document.getElementById(`mr-panel-${tab}`);
    if (btn) btn.classList.add("on");
    if (panel) panel.style.display = "";
  };

  window.mrAdicionarPresenca = function (tipo, pessoaId, nome) {
    if (!_presencasEdit) return;
    if (pessoaId && _presencasEdit[tipo].some(p => p.pessoa_id === pessoaId)) return;
    _presencasEdit[tipo].push({ pessoa_id: pessoaId || null, nome });
    _renderChipsMR(tipo);
    const input = document.getElementById(`mr-search-${tipo}`);
    const drop  = document.getElementById(`mr-drop-${tipo}`);
    if (input) input.value = "";
    if (drop)  drop.style.display = "none";
  };

  window.mrRemoverPresenca = function (tipo, idx) {
    if (!_presencasEdit) return;
    _presencasEdit[tipo].splice(idx, 1);
    _renderChipsMR(tipo);
  };

  /* ── REUNIÕES ────────────────────────────────────────────── */

  async function _carregarReunioes(forcar) {
    if (_reunioes && !forcar) return;
    _reunioes = await _fetchJson(
      `${_api()}/rest/v1/conselho_reunioes?select=*&order=data_reuniao.desc&limit=200`,
      { headers: _headers() }
    ) || [];
  }

  async function renderReunioes() {
    const el = _view("pautas-reunioes-content");
    if (!el) return;
    el.innerHTML = `<div style="padding:24px;color:var(--tx3);font-size:13px">Carregando reuniões...</div>`;
    try {
      await _carregarReunioes(true);
      _renderListaReunioes();
    } catch (e) {
      el.innerHTML = `<div style="padding:16px;color:var(--rose);font-size:12px">Erro: ${_eh(e.message)}</div>`;
    }
  }

  function _renderListaReunioes() {
    const el = _view("pautas-reunioes-content");
    if (!el) return;
    if (!_reunioes.length) {
      el.innerHTML = `<div class="card" style="padding:32px;text-align:center;color:var(--tx3)">
        Nenhuma reunião cadastrada. Clique em <strong>"+ Nova Reunião"</strong> para começar.
      </div>`;
      return;
    }
    const cards = _reunioes.map(r => {
      const scfg = STATUS_REUNIAO[r.status] || { label: r.status, cls: "pz" };
      const tipo = TIPO_REUNIAO[r.tipo] || r.tipo;
      return `<div class="card" style="border-left:3px solid ${r.status === "REALIZADA" ? "var(--gr)" : r.status === "CANCELADA" ? "var(--rose)" : "var(--sky)"}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div style="min-width:0">
            <div class="ctit" style="margin-bottom:4px">${r.numero_ata ? `<span style="font-size:11px;color:var(--tx3);font-weight:400;margin-right:8px">Ata nº ${_eh(r.numero_ata)}</span>` : ""}${_eh(r.titulo)}</div>
            <div style="font-size:11px;color:var(--tx3)">${tipo} · ${_fmtData(r.data_reuniao)}${r.horario ? " · " + String(r.horario).slice(0,5) : ""}${r.horario_encerramento ? " → " + String(r.horario_encerramento).slice(0,5) : ""}${r.local ? " · " + _eh(r.local) : ""}</div>
            ${r.presidente || r.secretario ? `<div style="font-size:11px;color:var(--tx3);margin-top:2px">${r.presidente ? "Presidente: " + _eh(r.presidente) : ""}${r.presidente && r.secretario ? " · " : ""}${r.secretario ? "Secretário: " + _eh(r.secretario) : ""}</div>` : ""}
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;align-items:center">
            <span class="pill ${scfg.cls}">${_eh(scfg.label)}</span>
            <button class="tbt pri" onclick="pautasAbrirReuniao('${_ea(r.id)}')">Ver pautas</button>
            ${_podeAdmin() ? `<button class="tbt" onclick="pautasEditarReuniao('${_ea(r.id)}')">Editar</button>` : ""}
          </div>
        </div>
        ${r.observacoes ? `<div style="font-size:11.5px;color:var(--tx3);margin-top:8px;border-top:1px solid var(--bd1);padding-top:8px">${_eh(r.observacoes)}</div>` : ""}
      </div>`;
    }).join("");
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px">${cards}</div>`;
  }

  window.pautasAbrirReuniao = async function (id) {
    _reuniaoAtual = (_reunioes || []).find(r => r.id === id) || null;
    if (!_reuniaoAtual) {
      try {
        const rows = await _fetchJson(`${_api()}/rest/v1/conselho_reunioes?id=eq.${encodeURIComponent(id)}&select=*&limit=1`, { headers: _headers() });
        _reuniaoAtual = rows?.[0] || null;
      } catch (_) {}
    }
    _filtroStatus = "";
    _filtroCategoria = "";
    _pautas = null;
    await go("pautas-lista");
  };

  window.pautasNovaReuniao = function () { _abrirModalReuniao(null); };
  window.pautasEditarReuniao = function (id) {
    const r = (_reunioes || []).find(x => x.id === id);
    if (r) _abrirModalReuniao(r);
  };

  function _abrirModalReuniao(reuniao) {
    _fecharModal();
    _injectMRStyles();
    const isEdit = !!reuniao;

    _presencasEdit = {};
    _PRESENCA_GRUPOS.forEach(g => { _presencasEdit[g.tipo] = []; });

    const overlay = document.createElement("div");
    overlay.id = "modal-reuniao";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9800;display:flex;align-items:center;justify-content:center;padding:16px";
    overlay.innerHTML = `
      <div style="background:var(--bg2,#212529);border:1px solid var(--bd2,rgba(255,255,255,.12));border-radius:12px;width:100%;max-width:640px;max-height:92vh;overflow-y:auto;padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <strong style="font-size:15px">${isEdit ? "Editar Reunião" : "Nova Reunião do Conselho"}</strong>
          <button onclick="pautasFecharModal()" style="background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer">✕</button>
        </div>

        <div class="mr-tabs">
          <button id="mr-tab-dados" class="mr-tab on"  onclick="mrAba('dados')">Dados Gerais</button>
          <button id="mr-tab-mesa"  class="mr-tab"     onclick="mrAba('mesa')">Mesa & Orações</button>
          <button id="mr-tab-pres"  class="mr-tab"     onclick="mrAba('pres')">Presenças</button>
          <button id="mr-tab-obs"   class="mr-tab"     onclick="mrAba('obs')">Observações</button>
        </div>

        <!-- DADOS GERAIS -->
        <div id="mr-panel-dados" class="mr-panel mr-section">
          <div>
            <label class="mr-lbl">Título da reunião *</label>
            <input id="mr-titulo" class="mr-inp" type="text" value="${_ea(reuniao?.titulo || "")}"
              placeholder="Ex: Ata nº 1289 — Reunião Ordinária do Conselho">
          </div>
          <div class="mr-row" style="grid-template-columns:1fr 1fr 1fr">
            <div>
              <label class="mr-lbl">Número da Ata</label>
              <input id="mr-numata" class="mr-inp" type="text" value="${_ea(reuniao?.numero_ata || "")}" placeholder="Ex: 1289">
            </div>
            <div>
              <label class="mr-lbl">Tipo *</label>
              <select id="mr-tipo" class="mr-inp">
                ${Object.entries(TIPO_REUNIAO).map(([k, v]) => `<option value="${k}" ${(reuniao?.tipo || "ORDINARIA") === k ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="mr-lbl">Status</label>
              <select id="mr-status" class="mr-inp">
                ${Object.entries(STATUS_REUNIAO).map(([k, v]) => `<option value="${k}" ${(reuniao?.status || "AGENDADA") === k ? "selected" : ""}>${v.label}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="mr-row" style="grid-template-columns:1fr 1fr 1fr">
            <div>
              <label class="mr-lbl">Data *</label>
              <input id="mr-data" class="mr-inp" type="date" value="${_ea(reuniao?.data_reuniao || _hojeIso())}">
            </div>
            <div>
              <label class="mr-lbl">Horário de início</label>
              <input id="mr-horario" class="mr-inp" type="time" value="${_ea(reuniao?.horario ? String(reuniao.horario).slice(0,5) : "")}">
            </div>
            <div>
              <label class="mr-lbl">Horário de encerramento</label>
              <input id="mr-henc" class="mr-inp" type="time" value="${_ea(reuniao?.horario_encerramento ? String(reuniao.horario_encerramento).slice(0,5) : "")}">
            </div>
          </div>
          <div>
            <label class="mr-lbl">Local</label>
            <input id="mr-local" class="mr-inp" type="text" value="${_ea(reuniao?.local || "")}"
              placeholder="Ex: Igreja Presbiteriana da Penha — Rua Major Rudge, nº 145">
          </div>
        </div>

        <!-- MESA & ORAÇÕES -->
        <div id="mr-panel-mesa" class="mr-panel mr-section" style="display:none">
          <div class="mr-row" style="grid-template-columns:1fr 1fr">
            <div>
              <label class="mr-lbl">Presidente</label>
              <input id="mr-presidente" class="mr-inp" type="text" value="${_ea(reuniao?.presidente || "")}"
                placeholder="Ex: Pr. Amauri Costa de Oliveira">
            </div>
            <div>
              <label class="mr-lbl">Secretário</label>
              <input id="mr-secretario" class="mr-inp" type="text" value="${_ea(reuniao?.secretario || "")}"
                placeholder="Ex: Pb. Laércio Ferreira Lima">
            </div>
          </div>
          <div class="mr-row" style="grid-template-columns:1fr 1fr">
            <div>
              <label class="mr-lbl">Oração inicial</label>
              <input id="mr-orinicial" class="mr-inp" type="text" value="${_ea(reuniao?.oracao_inicial || "")}"
                placeholder="Ex: Pb. Carlos Alberto e Pb. Marcus Novaes">
            </div>
            <div>
              <label class="mr-lbl">Oração final</label>
              <input id="mr-orfinal" class="mr-inp" type="text" value="${_ea(reuniao?.oracao_final || "")}"
                placeholder="Ex: Pb. Hugo">
            </div>
          </div>
        </div>

        <!-- PRESENÇAS -->
        <div id="mr-panel-pres" class="mr-panel" style="display:none">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
            ${_PRESENCA_GRUPOS.map(g => `
            <div>
              <div class="mr-grp-ttl">${g.lbl}</div>
              <div id="mr-chips-${g.tipo}" class="mr-chips"></div>
              <div class="mr-autocomplete">
                <input id="mr-search-${g.tipo}" class="mr-inp" type="text"
                  placeholder="Buscar ou digitar nome…" autocomplete="off" style="font-size:12px">
                <div id="mr-drop-${g.tipo}" class="mr-drop"></div>
              </div>
            </div>`).join("")}
          </div>
          <div style="margin-top:10px;font-size:11px;color:var(--tx3)">
            Selecione da lista ou pressione Enter para adicionar qualquer nome.
          </div>
        </div>

        <!-- OBSERVAÇÕES -->
        <div id="mr-panel-obs" class="mr-panel" style="display:none">
          <div>
            <label class="mr-lbl">Observações livres</label>
            <textarea id="mr-obs" class="mr-inp" rows="6">${_eh(reuniao?.observacoes || "")}</textarea>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px;padding-top:16px;border-top:1px solid var(--bd1)">
          <button onclick="pautasFecharModal()" class="btn">Cancelar</button>
          <button onclick="pautasSalvarReuniao('${_ea(reuniao?.id || "")}')" class="btn btn-p">Salvar</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    _modalAberto = overlay;
    overlay.addEventListener("click", e => { if (e.target === overlay) _fecharModal(); });

    Promise.all([
      _carregarOficiais(),
      isEdit ? _carregarPresencas(reuniao.id) : Promise.resolve(null),
    ]).then(([, presencas]) => {
      if (presencas) {
        _presencasEdit = presencas;
        _PRESENCA_GRUPOS.forEach(g => _renderChipsMR(g.tipo));
      }
      _PRESENCA_GRUPOS.forEach(g => _setupMRAutocomplete(g.tipo, g.cargos));
    }).catch(() => {
      _PRESENCA_GRUPOS.forEach(g => _setupMRAutocomplete(g.tipo, g.cargos));
    });
  }

  window.pautasSalvarReuniao = async function (id) {
    const titulo = (_view("mr-titulo")?.value || "").trim();
    const numata = (_view("mr-numata")?.value || "").trim();
    const tipo   = _view("mr-tipo")?.value || "ORDINARIA";
    const status = _view("mr-status")?.value || "AGENDADA";
    const data   = _view("mr-data")?.value || "";
    const hora   = _view("mr-horario")?.value || null;
    const henc   = _view("mr-henc")?.value || null;
    const local  = (_view("mr-local")?.value || "").trim();
    const pres   = (_view("mr-presidente")?.value || "").trim();
    const sec    = (_view("mr-secretario")?.value || "").trim();
    const orIn   = (_view("mr-orinicial")?.value || "").trim();
    const orFin  = (_view("mr-orfinal")?.value || "").trim();
    const obs    = (_view("mr-obs")?.value || "").trim();

    if (!titulo) { _toast("Campo obrigatório", "Informe o título da reunião."); mrAba("dados"); return; }
    if (!data)   { _toast("Campo obrigatório", "Informe a data da reunião."); mrAba("dados"); return; }

    const u = _user();
    const payload = {
      titulo,
      numero_ata:           numata || null,
      tipo, status,
      data_reuniao:         data,
      horario:              hora || null,
      horario_encerramento: henc || null,
      local:                local || null,
      presidente:           pres || null,
      secretario:           sec || null,
      oracao_inicial:       orIn || null,
      oracao_final:         orFin || null,
      observacoes:          obs || null,
    };

    try {
      const btn = document.querySelector("#modal-reuniao .btn-p");
      if (btn) { btn.textContent = "Salvando…"; btn.disabled = true; }

      let reuniaoId = id;

      if (id) {
        await _fetchJson(`${_api()}/rest/v1/conselho_reunioes?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: _headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
          body: JSON.stringify(payload),
        });
      } else {
        payload.created_by = u?.id || null;
        const [nova] = await _fetchJson(`${_api()}/rest/v1/conselho_reunioes`, {
          method: "POST",
          headers: _headers({ "Content-Type": "application/json", Prefer: "return=representation" }),
          body: JSON.stringify(payload),
        });
        reuniaoId = nova?.id;
        if (nova?.id) {
          const dataFmt = _fmtData(payload.data_reuniao);
          const tipoLabel = TIPO_REUNIAO[payload.tipo] || payload.tipo;
          const msg = [
            `📋 *Nova Reunião do Conselho*`,
            ``,
            `*Título:* ${payload.titulo}`,
            payload.numero_ata ? `*Ata nº:* ${payload.numero_ata}` : null,
            `*Tipo:* ${tipoLabel}`,
            `*Data:* ${dataFmt}`,
            payload.horario ? `*Horário:* ${payload.horario}` : null,
            payload.local   ? `*Local:* ${payload.local}` : null,
          ].filter(l => l !== null).join("\n");
          _notificarConselhoWA(msg, "reuniao", nova.id).catch(() => {});
        }
      }

      if (reuniaoId && _presencasEdit) await _salvarPresencas(reuniaoId);

      _fecharModal();
      _toast("Salvo", id ? "Reunião atualizada." : "Reunião criada com sucesso.");
      await _carregarReunioes(true);
      _renderListaReunioes();
    } catch (e) {
      _toast("Erro", e.message);
      const btn = document.querySelector("#modal-reuniao .btn-p");
      if (btn) { btn.textContent = "Salvar"; btn.disabled = false; }
    }
  };

  window.pautasExcluirReuniao = async function (id) {
    if (!_podeAdmin()) { _toast("Acesso negado", "Somente o administrador pode excluir reuniões."); return; }
    if (!confirm("Excluir esta reunião? As pautas vinculadas perderão o vínculo, mas não serão excluídas.")) return;
    try {
      await _fetchJson(`${_api()}/rest/v1/conselho_reunioes?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE", headers: _headers(),
      });
      _toast("Excluído", "Reunião removida.");
      _reunioes = null;
      await renderReunioes();
    } catch (e) { _toast("Erro", e.message); }
  };

  /* ── PAUTAS ──────────────────────────────────────────────── */

  async function _carregarPautas(forcar) {
    if (_pautas && !forcar) return;
    let url = `${_api()}/rest/v1/conselho_pautas?select=*&order=ordem.asc,created_at.asc&limit=500`;
    if (_reuniaoAtual) url += `&reuniao_id=eq.${encodeURIComponent(_reuniaoAtual.id)}`;
    _pautas = await _fetchJson(url, { headers: _headers() }) || [];
    _normalizarOrdensLocal();
  }

  function _normalizarOrdensLocal() {
    const ordens = _pautas.map(p => p.ordem);
    const unicos = new Set(ordens);
    if (unicos.size < _pautas.length) {
      _pautas.forEach((p, i) => { p.ordem = i; });
    }
  }

  function _patchOrdem(id, ordem) {
    return _fetchJson(`${_api()}/rest/v1/conselho_pautas?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: _headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({ ordem }),
    }).catch(e => console.warn("[Pautas] Falha ao salvar ordem:", e.message));
  }

  async function _swapOrdem(idA, idB) {
    const a = _pautas.find(p => p.id === idA);
    const b = _pautas.find(p => p.id === idB);
    if (!a || !b) return;

    const ordens = _pautas.map(p => p.ordem);
    const temDuplicatas = new Set(ordens).size < _pautas.length;

    if (temDuplicatas) {
      _pautas.forEach((p, i) => { p.ordem = i; });
    }

    const tmp = a.ordem;
    a.ordem = b.ordem;
    b.ordem = tmp;

    _pautas.sort((x, y) => x.ordem - y.ordem);
    _renderListaPautas();

    try {
      if (temDuplicatas) {
        await Promise.all(_pautas.map(p => _patchOrdem(p.id, p.ordem)));
      } else {
        await Promise.all([_patchOrdem(a.id, a.ordem), _patchOrdem(b.id, b.ordem)]);
      }
    } catch (e) {
      _toast("Erro ao salvar ordem", e.message);
      await _carregarPautas(true);
      _renderListaPautas();
    }
  }

  window.pautasMoverCima = async function (id) {
    if (!_podeSecretaria()) return;
    const idx = _pautas.findIndex(p => p.id === id);
    if (idx <= 0) return;
    await _swapOrdem(_pautas[idx].id, _pautas[idx - 1].id);
  };

  window.pautasMoverBaixo = async function (id) {
    if (!_podeSecretaria()) return;
    const idx = _pautas.findIndex(p => p.id === id);
    if (idx < 0 || idx >= _pautas.length - 1) return;
    await _swapOrdem(_pautas[idx].id, _pautas[idx + 1].id);
  };

  async function renderPautas() {
    const el = _view("pautas-lista-content");
    if (!el) return;
    el.innerHTML = `<div style="padding:24px;color:var(--tx3);font-size:13px">Carregando pautas...</div>`;
    try {
      await _carregarPautas(true);
      _renderListaPautas();
    } catch (e) {
      el.innerHTML = `<div style="padding:16px;color:var(--rose);font-size:12px">Erro: ${_eh(e.message)}</div>`;
    }
  }

  function _pautasFiltradas() {
    return (_pautas || []).filter(p => {
      if (_filtroStatus    && p.status    !== _filtroStatus)    return false;
      if (_filtroCategoria && p.categoria !== _filtroCategoria) return false;
      return true;
    });
  }

  function _renderListaPautas() {
    const el = _view("pautas-lista-content");
    if (!el) return;

    const lista = _pautasFiltradas();
    const podeAdd = _podeEditar(null);

    const headerEl = _view("pautas-lista-reuniao-titulo");
    if (headerEl && _reuniaoAtual) headerEl.textContent = _reuniaoAtual.titulo;

    const statusOpts = `<option value="">Todos os status</option>` +
      Object.entries(STATUS_CFG).map(([k, v]) =>
        `<option value="${k}" ${_filtroStatus === k ? "selected" : ""}>${v.label}</option>`).join("");
    const catOpts = `<option value="">Todas as categorias</option>` +
      CATEGORIAS.map(c => `<option value="${c}" ${_filtroCategoria === c ? "selected" : ""}>${c}</option>`).join("");

    const filtroAtivo = !!(_filtroStatus || _filtroCategoria);
    const podeMover   = _podeSecretaria() && !filtroAtivo;

    const filtros = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
        <select onchange="pautasFiltrar('status',this.value)" style="background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:7px 10px">${statusOpts}</select>
        <select onchange="pautasFiltrar('categoria',this.value)" style="background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:7px 10px">${catOpts}</select>
        <span style="font-size:11px;color:var(--tx3);margin-left:4px">${lista.length} item${lista.length !== 1 ? "s" : ""}</span>
        ${_podeSecretaria() && filtroAtivo ? `<span style="font-size:11px;color:var(--amber)">Filtro ativo — desative para reordenar</span>` : ""}
        <div style="flex:1"></div>
        ${_reuniaoAtual && (STATUS_REUNIAO[_reuniaoAtual.status]?.label !== "Cancelada") ?
          `<button class="tbt" onclick="pautasImprimir()">⬛ Imprimir pauta</button>` : ""}
        ${podeAdd ? `<button class="tbt pri" onclick="pautasNovaPauta()">+ Nova pauta</button>` : ""}
      </div>`;

    if (!lista.length) {
      el.innerHTML = filtros + `<div class="card" style="padding:28px;text-align:center;color:var(--tx3)">Nenhuma pauta encontrada. ${podeAdd ? 'Clique em <strong>"+ Nova pauta"</strong> para adicionar.' : ""}</div>`;
      return;
    }

    const cards = lista.map((p, idx) => {
      const scfg    = STATUS_CFG[p.status] || { label: p.status, cls: "pz" };
      const podeEd  = _podeEditar(p);
      const podeSec = _podeSecretaria();
      const num     = idx + 1;
      const idxFull = _pautas.findIndex(x => x.id === p.id);
      const primero = idxFull === 0;
      const ultimo  = idxFull === _pautas.length - 1;

      const btnStyle = (dis) =>
        `background:var(--bg3,#2b2f33);border:1px solid var(--bd2);border-radius:4px;` +
        `color:var(--tx2);font-size:11px;width:26px;height:26px;cursor:${dis?"default":"pointer"};` +
        `display:flex;align-items:center;justify-content:center;opacity:${dis?.35:1};line-height:1;` +
        `padding:0;font-family:inherit`;

      return `<div class="card" style="border-left:3px solid ${scfg.cor};padding:14px 16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">

          <div style="min-width:0;flex:1">
            <!-- Número + Título -->
            <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:4px">
              <span style="font-size:11px;font-weight:700;color:var(--sky);letter-spacing:.03em;flex-shrink:0">${num}.</span>
              <span style="font-size:14px;font-weight:600;color:var(--tx1);line-height:1.4">${_eh(p.titulo)}</span>
            </div>
            <!-- Encaminhamento imediatamente abaixo do título -->
            ${p.encaminhamento ? `<div style="font-size:12px;color:var(--tx3);margin-bottom:8px;padding-left:20px">Encaminhamento: <span style="color:var(--tx2);font-weight:500">${_eh(p.encaminhamento)}</span></div>` : `<div style="margin-bottom:8px"></div>`}
            <!-- Pills de contexto -->
            <div style="display:flex;gap:5px;flex-wrap:wrap;padding-left:20px">
              <span class="pill pn" style="font-size:10.5px">${_eh(p.categoria)}</span>
              <span class="pill ${scfg.cls}" style="font-size:10.5px">${scfg.label}</span>
            </div>
          </div>

          <!-- Ações -->
          <div style="display:flex;gap:5px;flex-shrink:0;margin-top:2px;align-items:flex-start">
            ${podeMover ? `
            <div style="display:flex;flex-direction:column;gap:3px;margin-right:2px">
              <button style="${btnStyle(primero)}" ${primero ? "disabled" : ""} onclick="pautasMoverCima('${_ea(p.id)}')" title="Subir">▲</button>
              <button style="${btnStyle(ultimo)}"  ${ultimo  ? "disabled" : ""} onclick="pautasMoverBaixo('${_ea(p.id)}')" title="Descer">▼</button>
            </div>` : ""}
            <button class="tbt" style="font-size:12px;padding:5px 10px" onclick="pautasVerDetalhe('${_ea(p.id)}')">Ver</button>
            ${podeEd ? `<button class="tbt" style="font-size:12px;padding:5px 10px" onclick="pautasEditarPauta('${_ea(p.id)}')">Editar</button>` : ""}
          </div>
        </div>

        <!-- Síntese -->
        ${p.sintese ? `<div style="font-size:12px;color:var(--tx3);margin-top:10px;padding:8px 10px 8px 12px;border-left:2px solid var(--bd2);line-height:1.6">${_eh(p.sintese.slice(0, 240))}${p.sintese.length > 240 ? "…" : ""}</div>` : ""}

        <!-- Deliberação -->
        ${p.deliberacao ? `<div style="margin-top:10px;padding:9px 12px;background:rgba(58,170,92,.07);border:1px solid rgba(58,170,92,.18);border-radius:7px;font-size:12px;color:var(--tx2);line-height:1.55"><span style="font-size:10.5px;font-weight:700;color:var(--gr);letter-spacing:.04em;text-transform:uppercase;margin-right:6px">Deliberação</span>${_eh(p.deliberacao)}${p.responsaveis ? `<span style="display:block;font-size:10.5px;color:var(--tx3);margin-top:4px">Responsáveis: ${_eh(p.responsaveis)}</span>` : ""}</div>` : ""}

        <!-- Anexo -->
        ${p.arquivo_path ? `<div style="margin-top:10px"><button onclick="pautasAbrirAnexo('${_ea(p.arquivo_path)}')" style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--blue);background:rgba(74,156,245,.08);border:1px solid rgba(74,156,245,.25);border-radius:6px;padding:5px 10px;cursor:pointer">📎 ${_eh(p.arquivo_nome || "Ver documento")}</button></div>` : ""}

        <!-- Ações de status -->
        ${podeSec && p.status === "PENDENTE" ? `
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd1);display:flex;gap:5px;flex-wrap:wrap">
            <button class="tbt" style="font-size:11px" onclick="pautasAlterarStatus('${_ea(p.id)}','EM_ANALISE')">Em análise</button>
            <button class="tbt" style="font-size:11px;color:var(--gr)" onclick="pautasAlterarStatus('${_ea(p.id)}','APROVADO')">Aprovar</button>
            <button class="tbt" style="font-size:11px;color:var(--rose)" onclick="pautasAlterarStatus('${_ea(p.id)}','REJEITADO')">Rejeitar</button>
            <button class="tbt" style="font-size:11px;color:var(--amber)" onclick="pautasAlterarStatus('${_ea(p.id)}','ADIADO')">Adiar</button>
          </div>` : ""}
        ${podeSec && (p.status === "EM_ANALISE" || p.status === "APROVADO") && !p.deliberacao ? `
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd1)">
            <button class="tbt pri" style="font-size:11px" onclick="pautasRegistrarDeliberacao('${_ea(p.id)}')">+ Registrar deliberação</button>
          </div>` : ""}
      </div>`;
    }).join("");

    el.innerHTML = filtros + `<div style="display:flex;flex-direction:column;gap:10px">${cards}</div>`;
  }

  window.pautasFiltrar = function (campo, valor) {
    if (campo === "status")    _filtroStatus = valor;
    if (campo === "categoria") _filtroCategoria = valor;
    _renderListaPautas();
  };

  window.pautasNovaPauta = function () { _abrirModalPauta(null); };
  window.pautasEditarPauta = function (id) {
    const p = (_pautas || []).find(x => x.id === id);
    if (p) _abrirModalPauta(p);
  };

  window.pautasVerDetalhe = function (id) {
    const p = (_pautas || []).find(x => x.id === id);
    if (p) _abrirModalDetalhe(p);
  };

  function _abrirModalDetalhe(p) {
    _fecharModal();
    const scfg = STATUS_CFG[p.status] || { label: p.status, cls: "pz" };
    const overlay = document.createElement("div");
    overlay.id = "modal-pauta-det";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9800;display:flex;align-items:center;justify-content:center;padding:16px";
    const podeEd = _podeEditar(p);
    const podeSec = _podeSecretaria();
    overlay.innerHTML = `
      <div style="background:var(--bg2,#212529);border:1px solid var(--bd2);border-radius:12px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;gap:12px">
          <div>
            <div style="font-size:11px;color:var(--tx3);margin-bottom:4px">${_eh(p.categoria)}</div>
            <strong style="font-size:15px;line-height:1.4">${_eh(p.titulo)}</strong>
            <div style="display:flex;gap:6px;margin-top:8px">
              <span class="pill ${scfg.cls}">${scfg.label}</span>
            </div>
          </div>
          <button onclick="pautasFecharModal()" style="background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer;flex-shrink:0">✕</button>
        </div>
        ${p.encaminhamento ? `<div class="sr"><span class="sl">Encaminhamento</span><span class="sv">${_eh(p.encaminhamento)}</span></div>` : ""}
        ${p.sintese ? `<div style="margin-top:12px"><div style="font-size:11px;color:var(--tx3);margin-bottom:6px">Síntese</div><div style="font-size:13px;color:var(--tx2);line-height:1.6;background:var(--bg3,#2b2f33);border-radius:6px;padding:10px 12px">${_eh(p.sintese)}</div></div>` : ""}
        ${p.observacoes ? `<div style="margin-top:10px"><div style="font-size:11px;color:var(--tx3);margin-bottom:4px">Observações</div><div style="font-size:12px;color:var(--tx3);line-height:1.5">${_eh(p.observacoes)}</div></div>` : ""}
        ${p.arquivo_path ? `<div style="margin-top:12px"><button onclick="pautasAbrirAnexo('${_ea(p.arquivo_path)}')" style="display:inline-flex;align-items:center;gap:8px;font-size:12px;color:var(--blue);background:rgba(74,156,245,.08);border:1px solid rgba(74,156,245,.25);border-radius:7px;padding:7px 12px;cursor:pointer">📎 ${_eh(p.arquivo_nome || "Abrir documento")}</button></div>` : ""}
        ${p.deliberacao ? `<div style="margin-top:14px;padding:12px;background:rgba(58,170,92,.08);border:1px solid rgba(58,170,92,.2);border-radius:8px">
          <div style="font-size:11px;color:var(--gr);font-weight:700;margin-bottom:6px">Deliberação Final</div>
          <div style="font-size:13px;color:var(--tx2);line-height:1.6">${_eh(p.deliberacao)}</div>
          ${p.responsaveis ? `<div style="font-size:11px;color:var(--tx3);margin-top:6px">Responsáveis: ${_eh(p.responsaveis)}</div>` : ""}
          ${p.prazo ? `<div style="font-size:11px;color:var(--tx3)">Prazo: ${_fmtData(p.prazo)}</div>` : ""}
        </div>` : ""}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:20px;justify-content:flex-end">
          ${podeEd ? `<button class="tbt" onclick="pautasEditarPauta('${_ea(p.id)}');pautasFecharModal()">Editar</button>` : ""}
          ${podeSec && !p.deliberacao ? `<button class="tbt pri" onclick="pautasRegistrarDeliberacao('${_ea(p.id)}');pautasFecharModal()">Registrar deliberação</button>` : ""}
          ${_podeAdmin() ? `<button class="tbt" style="color:var(--rose)" onclick="pautasExcluir('${_ea(p.id)}');pautasFecharModal()">Excluir</button>` : ""}
          <button onclick="pautasFecharModal()" class="btn">Fechar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    _modalAberto = overlay;
    overlay.addEventListener("click", e => { if (e.target === overlay) _fecharModal(); });
  }

  function _abrirModalPauta(pauta) {
    _fecharModal();
    const isEdit = !!pauta;
    const overlay = document.createElement("div");
    overlay.id = "modal-pauta";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9800;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto";
    const catOpts    = CATEGORIAS.map(c => `<option value="${c}" ${(pauta?.categoria || "Geral") === c ? "selected" : ""}>${c}</option>`).join("");
    const statusOpts = Object.entries(STATUS_CFG).map(([k, v]) => `<option value="${k}" ${(pauta?.status || "PENDENTE") === k ? "selected" : ""}>${v.label}</option>`).join("");
    overlay.innerHTML = `
      <div style="background:var(--bg2,#212529);border:1px solid var(--bd2);border-radius:12px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;padding:24px;margin:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <strong style="font-size:15px">${isEdit ? "Editar Item de Pauta" : "Novo Item de Pauta"}</strong>
          <button onclick="pautasFecharModal()" style="background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer">✕</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div>
            <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Título do assunto *</label>
            <input id="mp-titulo" type="text" value="${_ea(pauta?.titulo || "")}" placeholder="Descreva o assunto brevemente"
              style="width:100%;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 11px">
          </div>
          <div>
            <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Encaminhamento (quem apresenta)</label>
            <input id="mp-enc" type="text" value="${_ea(pauta?.encaminhamento || "")}" placeholder="Nome ou cargo do apresentador"
              style="width:100%;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 11px">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Categoria *</label>
              <select id="mp-cat" style="width:100%;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 11px">${catOpts}</select>
            </div>
            <div>
              <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Status</label>
              <select id="mp-status" style="width:100%;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 11px">${statusOpts}</select>
            </div>
          </div>
          <div>
            <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Síntese do tema</label>
            <textarea id="mp-sint" rows="3" style="width:100%;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 11px;resize:vertical">${_eh(pauta?.sintese || "")}</textarea>
          </div>
          <div>
            <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Observações</label>
            <textarea id="mp-obs" rows="2" style="width:100%;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 11px;resize:vertical">${_eh(pauta?.observacoes || "")}</textarea>
          </div>
          <div>
            <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:6px">Documento anexo</label>
            ${pauta?.arquivo_path ? `
            <div id="mp-anexo-atual" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg3,#1a1d21);border:1px solid var(--bd2);border-radius:6px;margin-bottom:8px">
              <span style="font-size:18px">📎</span>
              <span style="flex:1;font-size:12px;color:var(--tx2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_eh(pauta.arquivo_nome || pauta.arquivo_path.split("/").pop())}</span>
              <button type="button" onclick="pautasRemoverAnexo('${_ea(pauta.id)}')" style="background:none;border:none;color:var(--rose);font-size:12px;cursor:pointer;flex-shrink:0">Remover</button>
            </div>` : ""}
            <label id="mp-file-label" style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg-input,#1a1d21);border:1px dashed var(--bd2);border-radius:6px;cursor:pointer;font-size:12px;color:var(--tx3)">
              <span style="font-size:16px">⊕</span>
              <span id="mp-file-name">${pauta?.arquivo_path ? "Substituir arquivo…" : "Selecionar arquivo (PDF, DOCX, imagem — máx. 10 MB)"}</span>
              <input type="file" id="mp-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" style="display:none"
                onchange="document.getElementById('mp-file-name').textContent = this.files[0]?.name || 'Selecionar arquivo…'">
            </label>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
          <button onclick="pautasFecharModal()" class="btn">Cancelar</button>
          <button onclick="pautasSalvar('${_ea(pauta?.id || "")}')" class="btn btn-p" id="btn-salvar-pauta">Salvar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    _modalAberto = overlay;
    overlay.addEventListener("click", e => { if (e.target === overlay) _fecharModal(); });
    document.getElementById("mp-titulo")?.focus();
  }

  const _BUCKET = "conselho-documentos";

  async function _uploadPautaAnexo(file, pautaId) {
    const sb = typeof getSupabase === "function" ? getSupabase() : null;
    if (!sb) throw new Error("Cliente Supabase não inicializado.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Arquivo maior que 10 MB. Reduza o tamanho e tente novamente.");
    const ts   = Date.now();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `pautas/${pautaId}/${ts}_${safe}`;
    const { error } = await sb.storage.from(_BUCKET).upload(path, file, { contentType: file.type, upsert: true });
    if (error) {
      if (error.message?.includes("Bucket not found"))
        throw new Error("Bucket de armazenamento não encontrado. Contate o administrador do sistema.");
      if (error.message?.includes("row-level security") || error.message?.includes("policy"))
        throw new Error("Sem permissão para fazer upload. Verifique as políticas de storage do Supabase.");
      if (error.message?.includes("mime") || error.message?.includes("type"))
        throw new Error(`Tipo de arquivo não permitido: ${file.type}. Use PDF, DOCX, XLSX, PNG ou JPG.`);
      throw new Error(`Erro no upload: ${error.message}`);
    }
    return { path, nome: file.name };
  }

  window.pautasAbrirAnexo = async function (path) {
    const sb = typeof getSupabase === "function" ? getSupabase() : null;
    if (!sb) { _toast("Erro", "Cliente Supabase não disponível."); return; }
    const { data, error } = await sb.storage.from(_BUCKET).createSignedUrl(path, 3600);
    if (error) { _toast("Erro ao abrir documento", error.message); return; }
    window.open(data.signedUrl, "_blank");
  };

  window.pautasRemoverAnexo = async function (pautaId) {
    if (!confirm("Remover o documento anexado?")) return;
    try {
      const p = (_pautas || []).find(x => x.id === pautaId);
      if (p?.arquivo_path) {
        const sb = typeof getSupabase === "function" ? getSupabase() : null;
        if (sb) await sb.storage.from(_BUCKET).remove([p.arquivo_path]);
      }
      await _fetchJson(`${_api()}/rest/v1/conselho_pautas?id=eq.${encodeURIComponent(pautaId)}`, {
        method: "PATCH",
        headers: _headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ arquivo_path: null, arquivo_nome: null }),
      });
      await _carregarPautas(true);
      _renderListaPautas();
      _fecharModal();
      _toast("Removido", "Documento removido com sucesso.");
    } catch (e) { _toast("Erro", e.message); }
  };

  window.pautasSalvar = async function (id) {
    const titulo = (_view("mp-titulo")?.value || "").trim();
    const enc    = (_view("mp-enc")?.value || "").trim();
    const cat    = _view("mp-cat")?.value || "Geral";
    const sint   = (_view("mp-sint")?.value || "").trim();
    const obs    = (_view("mp-obs")?.value || "").trim();
    const status = _view("mp-status")?.value || "PENDENTE";
    const fileInput = _view("mp-file");
    const file = fileInput?.files?.[0] || null;

    if (!titulo) { _toast("Campo obrigatório", "Informe o título do assunto."); return; }

    const u = _user();
    const payload = {
      titulo, categoria: cat,
      encaminhamento: enc || null, sintese: sint || null, observacoes: obs || null,
      status,
    };

    try {
      const btn = document.getElementById("btn-salvar-pauta");
      if (btn) { btn.textContent = "Salvando…"; btn.disabled = true; }

      let pautaAntes = null;

      if (id) {
        pautaAntes = (_pautas || []).find(p => p.id === id) || null;
        if (file) {
          const btn = document.getElementById("btn-salvar-pauta");
          if (btn) btn.textContent = "Enviando arquivo…";
          const { path, nome } = await _uploadPautaAnexo(file, id);
          payload.arquivo_path = path;
          payload.arquivo_nome = nome;
        }
        await _fetchJson(`${_api()}/rest/v1/conselho_pautas?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: _headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
          body: JSON.stringify(payload),
        });
        if (pautaAntes) {
          for (const campo of ["titulo", "status", "categoria"]) {
            if (String(pautaAntes[campo] ?? "") !== String(payload[campo] ?? "")) {
              await _registrarHistorico(id, campo, pautaAntes[campo], payload[campo]);
            }
          }
        }
      } else {
        const ordemAtual = _pautas.length
          ? Math.max(..._pautas.map(p => p.ordem)) + 1
          : 0;
        payload.ordem = ordemAtual;
        payload.created_by = u?.id || null;
        if (_reuniaoAtual) payload.reuniao_id = _reuniaoAtual.id;
        const [novaPauta] = await _fetchJson(`${_api()}/rest/v1/conselho_pautas`, {
          method: "POST",
          headers: _headers({ "Content-Type": "application/json", Prefer: "return=representation" }),
          body: JSON.stringify(payload),
        });
        await _registrarHistorico(null, "criacao", null, titulo);
        if (novaPauta?.id) {
          if (file) {
            const btnEl = document.getElementById("btn-salvar-pauta");
            if (btnEl) btnEl.textContent = "Enviando arquivo…";
            const { path, nome } = await _uploadPautaAnexo(file, novaPauta.id);
            await _fetchJson(`${_api()}/rest/v1/conselho_pautas?id=eq.${encodeURIComponent(novaPauta.id)}`, {
              method: "PATCH",
              headers: _headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
              body: JSON.stringify({ arquivo_path: path, arquivo_nome: nome }),
            });
          }
          const reuniaoTitulo = _reuniaoAtual?.titulo || "";
          const msg = [
            `📋 *Nova Pauta do Conselho*`,
            ``,
            `*Assunto:* ${titulo}`,
            `*Categoria:* ${cat}`,
            reuniaoTitulo ? `*Reunião:* ${reuniaoTitulo}` : null,
            enc ? `*Encaminhamento:* ${enc}` : null,
          ].filter(l => l !== null).join("\n");
          _notificarConselhoWA(msg, "pauta", novaPauta.id).catch(() => {});
        }
      }

      _fecharModal();
      _toast("Salvo", id ? "Pauta atualizada." : "Pauta adicionada com sucesso.");
      await _carregarPautas(true);
      _renderListaPautas();
    } catch (e) {
      _toast("Erro", e.message);
      const btn = document.getElementById("btn-salvar-pauta");
      if (btn) { btn.textContent = "Salvar"; btn.disabled = false; }
    }
  };

  window.pautasExcluir = async function (id) {
    if (!_podeAdmin()) { _toast("Acesso negado", "Somente o administrador pode excluir pautas."); return; }
    if (!confirm("Excluir este item de pauta? O histórico vinculado também será removido.")) return;
    try {
      await _fetchJson(`${_api()}/rest/v1/conselho_pautas?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE", headers: _headers(),
      });
      _toast("Excluído", "Item removido.");
      await _carregarPautas(true);
      _normalizarOrdensLocal();
      await Promise.all(_pautas.map(p => _patchOrdem(p.id, p.ordem)));
      _renderListaPautas();
    } catch (e) { _toast("Erro", e.message); }
  };

  window.pautasDuplicar = async function (id) {
    const p = (_pautas || []).find(x => x.id === id);
    if (!p) return;
    if (!confirm(`Duplicar o item "${p.titulo}"?`)) return;
    try {
      const u = _user();
      const payload = {
        titulo:         `${p.titulo} (cópia)`,
        encaminhamento: p.encaminhamento,
        categoria:      p.categoria,
        sintese:        p.sintese,
        observacoes:    p.observacoes,
        status:         "PENDENTE",
        reuniao_id:     p.reuniao_id,
        ordem:          (_pautas || []).length,
        created_by:     u?.id || null,
      };
      await _fetchJson(`${_api()}/rest/v1/conselho_pautas`, {
        method: "POST",
        headers: _headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify(payload),
      });
      _toast("Duplicado", "Item copiado com status Pendente.");
      await _carregarPautas(true);
      _renderListaPautas();
    } catch (e) { _toast("Erro", e.message); }
  };

  /* ── STATUS / DELIBERAÇÃO ────────────────────────────────── */

  window.pautasAlterarStatus = async function (id, novoStatus) {
    if (!_podeSecretaria()) { _toast("Acesso negado", ""); return; }
    const p = (_pautas || []).find(x => x.id === id);
    const statusAntes = p?.status;
    try {
      await _fetchJson(`${_api()}/rest/v1/conselho_pautas?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: _headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ status: novoStatus }),
      });
      await _registrarHistorico(id, "status", statusAntes, novoStatus);
      _toast("Status atualizado", STATUS_CFG[novoStatus]?.label || novoStatus);
      await _carregarPautas(true);
      _renderListaPautas();
    } catch (e) { _toast("Erro", e.message); }
  };

  window.pautasRegistrarDeliberacao = function (id) {
    _fecharModal();
    const p = (_pautas || []).find(x => x.id === id);
    const overlay = document.createElement("div");
    overlay.id = "modal-delib";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9800;display:flex;align-items:center;justify-content:center;padding:16px";
    overlay.innerHTML = `
      <div style="background:var(--bg2,#212529);border:1px solid var(--bd2);border-radius:12px;width:100%;max-width:480px;padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <strong style="font-size:15px">Registrar Deliberação</strong>
          <button onclick="pautasFecharModal()" style="background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer">✕</button>
        </div>
        <div style="font-size:12px;color:var(--tx3);margin-bottom:14px">${_eh(p?.titulo || "")}</div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div>
            <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Decisão final *</label>
            <textarea id="md-delib" rows="4" style="width:100%;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 11px;resize:vertical">${_eh(p?.deliberacao || "")}</textarea>
          </div>
          <div>
            <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Responsáveis pela execução</label>
            <input id="md-resp" type="text" value="${_ea(p?.responsaveis || "")}" placeholder="Nomes ou cargos"
              style="width:100%;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 11px">
          </div>
          <div>
            <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Prazo</label>
            <input id="md-prazo" type="date" value="${_ea(p?.prazo || "")}"
              style="width:100%;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 11px">
          </div>
          <div>
            <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Novo status</label>
            <select id="md-status" style="width:100%;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 11px">
              ${Object.entries(STATUS_CFG).map(([k, v]) => `<option value="${k}" ${(p?.status === k || (!p?.status && k === "CONCLUIDO")) ? "selected" : ""}>${v.label}</option>`).join("")}
            </select>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
          <button onclick="pautasFecharModal()" class="btn">Cancelar</button>
          <button onclick="pautasSalvarDeliberacao('${_ea(id)}')" class="btn btn-p" id="btn-salvar-delib">Salvar deliberação</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    _modalAberto = overlay;
    overlay.addEventListener("click", e => { if (e.target === overlay) _fecharModal(); });
    document.getElementById("md-delib")?.focus();
  };

  window.pautasSalvarDeliberacao = async function (id) {
    const delib = (_view("md-delib")?.value || "").trim();
    const resp  = (_view("md-resp")?.value || "").trim();
    const prazo = _view("md-prazo")?.value || null;
    const status = _view("md-status")?.value || "CONCLUIDO";

    if (!delib) { _toast("Campo obrigatório", "Informe a decisão final."); return; }

    const p = (_pautas || []).find(x => x.id === id);
    try {
      const btn = document.getElementById("btn-salvar-delib");
      if (btn) { btn.textContent = "Salvando…"; btn.disabled = true; }

      await _fetchJson(`${_api()}/rest/v1/conselho_pautas?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: _headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ deliberacao: delib, responsaveis: resp || null, prazo: prazo || null, status }),
      });
      await _registrarHistorico(id, "deliberacao", p?.deliberacao || null, delib);
      await _registrarHistorico(id, "status", p?.status, status);

      _fecharModal();
      _toast("Deliberação registrada", "");
      await _carregarPautas(true);
      _renderListaPautas();
    } catch (e) {
      _toast("Erro", e.message);
      const btn = document.getElementById("btn-salvar-delib");
      if (btn) { btn.textContent = "Salvar deliberação"; btn.disabled = false; }
    }
  };

  /* ── MODAL HELPER ────────────────────────────────────────── */

  function _fecharModal() {
    if (_modalAberto) { _modalAberto.remove(); _modalAberto = null; }
    const ids = ["modal-reuniao", "modal-pauta", "modal-pauta-det", "modal-delib"];
    ids.forEach(id => document.getElementById(id)?.remove());
  }
  window.pautasFecharModal = _fecharModal;

  /* ── IMPRESSÃO ───────────────────────────────────────────── */

  window.pautasImprimir = async function () {
    const el = _view("pautas-imprimir-content");
    if (!el) { await go("pautas-imprimir"); return; }
    await go("pautas-imprimir");
  };

  async function renderImprimir() {
    const el = _view("pautas-imprimir-content");
    if (!el) return;

    el.innerHTML = `<div style="padding:20px;color:var(--tx3)">Preparando documento...</div>`;

    if (!_reuniaoAtual) {
      el.innerHTML = `<div style="padding:20px;color:var(--rose)">Nenhuma reunião selecionada. <button class="tbt" onclick="go('pautas-reunioes')">← Voltar</button></div>`;
      return;
    }

    if (!_pautas) await _carregarPautas(true);

    const r = _reuniaoAtual;
    const tipo = TIPO_REUNIAO[r.tipo] || r.tipo;
    const mesano = _mesAno(r.data_reuniao);
    const dataLonga = _fmtDataLonga(r.data_reuniao);
    const hora = r.horario ? ` às ${String(r.horario).slice(0, 5)}` : "";

    const itens = (_pautas || []).filter(p => !_filtroStatus || p.status === _filtroStatus);

    const linhas = itens.map((p, i) => {
      const scfg = STATUS_CFG[p.status] || { label: p.status };
      return `
        <div class="pr-item">
          <div class="pr-num">${i + 1}</div>
          <div class="pr-body">
            <div class="pr-titulo">${_eh(p.titulo)}</div>
            ${p.encaminhamento ? `<div class="pr-linha"><span class="pr-lbl">Encaminhamento:</span> ${_eh(p.encaminhamento)}</div>` : ""}
            ${p.categoria ? `<div class="pr-linha"><span class="pr-lbl">Assunto:</span> ${_eh(p.categoria)}</div>` : ""}
            ${p.sintese ? `<div class="pr-linha"><span class="pr-lbl">Síntese:</span> ${_eh(p.sintese)}</div>` : ""}
            ${p.deliberacao ? `<div class="pr-linha pr-delib"><span class="pr-lbl">Deliberação:</span> ${_eh(p.deliberacao)}</div>` : ""}
            ${p.responsaveis ? `<div class="pr-linha"><span class="pr-lbl">Responsáveis:</span> ${_eh(p.responsaveis)}</div>` : ""}
            ${p.prazo ? `<div class="pr-linha"><span class="pr-lbl">Prazo:</span> ${_fmtData(p.prazo)}</div>` : ""}
          </div>
        </div>`;
    }).join("");

    el.innerHTML = `
      <style>
        #pautas-imprimir-content .pr-doc {
          max-width: 700px; margin: 0 auto; font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
          font-size: 13px; color: #222; line-height: 1.6; padding: 20px;
        }
        #pautas-imprimir-content .pr-header { text-align:center; margin-bottom:32px; border-bottom:2px solid #222; padding-bottom:16px; }
        #pautas-imprimir-content .pr-org { font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
        #pautas-imprimir-content .pr-sub { font-size:13px; font-weight:700; text-transform:uppercase; margin-top:4px; }
        #pautas-imprimir-content .pr-meta { font-size:11px; color:#666; margin-top:8px; }
        #pautas-imprimir-content .pr-item { display:flex; gap:16px; margin-bottom:24px; }
        #pautas-imprimir-content .pr-num { font-size:18px; font-weight:700; color:#222; min-width:28px; padding-top:1px; }
        #pautas-imprimir-content .pr-titulo { font-weight:700; font-size:13px; margin-bottom:6px; }
        #pautas-imprimir-content .pr-linha { font-size:12px; color:#444; margin-bottom:3px; }
        #pautas-imprimir-content .pr-lbl { font-weight:600; color:#222; }
        #pautas-imprimir-content .pr-delib { background:#f0f9f3; border-left:3px solid #3aaa5c; padding:6px 8px; margin-top:6px; border-radius:0 4px 4px 0; }
        @media print {
          #pautas-imprimir-content .pr-toolbar { display:none !important; }
          body > *:not(main) { display:none !important; }
        }
      </style>
      <div class="pr-toolbar" style="margin-bottom:16px;display:flex;gap:8px;align-items:center">
        <button class="tbt" onclick="go('pautas-lista')">← Voltar</button>
        <button class="tbt pri" onclick="window.print()">⬛ Imprimir / PDF</button>
      </div>
      <div class="pr-doc">
        <div class="pr-header">
          <div class="pr-org">Igreja Presbiteriana da Penha</div>
          <div class="pr-sub">Pauta – Reunião do Conselho</div>
          <div class="pr-meta">${tipo} · ${mesano}</div>
          <div class="pr-meta">${dataLonga}${hora}${r.local ? " · " + _eh(r.local) : ""}</div>
        </div>
        ${linhas || `<p style="color:#999;text-align:center">Nenhum item de pauta cadastrado.</p>`}
      </div>`;
  }

  /* ── NAVEGAÇÃO ───────────────────────────────────────────── */

  document.addEventListener("sipen:navigate", async ({ detail: { id } }) => {
    if (id === "pautas-reunioes") await renderReunioes();
    if (id === "pautas-lista")    await renderPautas();
    if (id === "pautas-imprimir") await renderImprimir();
  });

})();
