/* ═══════════════════════════════════════════════════════
   SIPEN — Módulo Eventos
   Criação, inscrições, pagamentos e credenciamento
═══════════════════════════════════════════════════════ */
(function () {

  /* ── Constantes ─────────────────────────────────────── */

  const PUBLICO_ALVO = ["Toda a Igreja", "Crianças", "Adolescentes", "Jovens", "Mulheres", "Homens", "Casais", "Terceira Idade", "Outro"];

  const STATUS_EVE = {
    rascunho:              { label: "Rascunho",              cls: "pz", cor: "var(--tx3)"    },
    publicado:             { label: "Publicado",             cls: "pn", cor: "var(--blue)"   },
    inscricoes_abertas:    { label: "Inscrições Abertas",    cls: "pd", cor: "var(--gr)"     },
    inscricoes_encerradas: { label: "Inscr. Encerradas",     cls: "po", cor: "var(--amber)"  },
    em_andamento:          { label: "Em Andamento",          cls: "pp", cor: "var(--violet)" },
    concluido:             { label: "Concluído",             cls: "pz", cor: "var(--tx4)"    },
    cancelado:             { label: "Cancelado",             cls: "po", cor: "var(--rose)"   },
  };

  const STATUS_INSCR = {
    pendente:   { label: "Pendente",   cls: "po", cor: "var(--amber)" },
    confirmada: { label: "Confirmada", cls: "pn", cor: "var(--blue)"  },
    cancelada:  { label: "Cancelada",  cls: "pz", cor: "var(--tx3)"   },
    presente:   { label: "Presente",   cls: "pd", cor: "var(--gr)"    },
    ausente:    { label: "Ausente",    cls: "pz", cor: "var(--tx4)"   },
  };

  const NAV_TABS = [
    { id: "eve-dash",          label: "Dashboard"   },
    { id: "eve-todos",         label: "Eventos"     },
    { id: "eve-inscricoes",    label: "Inscrições"  },
    { id: "eve-pagamentos",    label: "Pagamentos"  },
    { id: "eve-credenciamento",label: "Credenciamento" },
    { id: "eve-presenca",      label: "Presença"    },
    { id: "eve-relatorios",    label: "Relatórios"  },
    { id: "eve-config",        label: "Config"      },
    { id: "eve-demandas",     label: "Demandas"    },
    { id: "eve-whatsapp",     label: "WhatsApp"    },
  ];

  const NAV_TARGETS = [
    "eve-dash-nav","eve-todos-nav","eve-inscricoes-nav",
    "eve-pagamentos-nav","eve-cred-nav","eve-presenca-nav",
    "eve-rel-nav","eve-config-nav","eve-demandas-nav","eve-whatsapp-nav",
  ];

  /* ── Estado ─────────────────────────────────────────── */

  let _eventos         = [];
  let _todasInscricoes = [];
  let _eventoAtivo     = null;
  let _fStatus         = "";
  let _fTipo           = "";
  let _fBusca          = "";

  /* ── Utilidades ─────────────────────────────────────── */

  function _eh(v) {
    if (typeof escapeHtml === "function") return escapeHtml(v);
    return String(v ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  }
  function _ea(v) {
    if (typeof escapeHtmlAttr === "function") return escapeHtmlAttr(v);
    return _eh(v).replace(/'/g, "&#39;");
  }
  function _T(t, s)     { if (typeof T === "function") T(t, s || ""); }
  function _api()       { return typeof apiBaseUrl === "function" ? apiBaseUrl() : ""; }
  function _hdrs(extra) { return typeof apiHeaders === "function" ? apiHeaders(extra || {}) : {}; }
  function _user()      { return typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL : null; }
  function _userId()    { return _user()?.id || null; }
  function _authUserId(){ return _user()?.auth_user_id || null; }
  function _userName()  { return _user()?.nome || _user()?.email || "Sistema"; }

  function _fmtD(d) {
    if (!d) return "—";
    const [y, m, day] = String(d).slice(0, 10).split("-");
    return (day && m && y) ? `${day}/${m}/${y}` : _eh(d);
  }

  function _fmtH(h) {
    if (!h) return "";
    return String(h).slice(0, 5);
  }

  function _fmtMoeda(v) {
    if (v == null || v === "") return "—";
    return "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  }

  function _gerarLinkPublico(eventoId) {
    const base = "https://www.sipen.com.br/inscricao.html";
    return `${base}?id=${eventoId}`;
  }

  /* ── Permissões ─────────────────────────────────────── */

  function _isAdmin() {
    const u = _user();
    if (!u) return false;
    if (u.perfil === "ADMINISTRADOR_GERAL") return true;
    const perms = typeof permissoesUsuario !== "undefined" ? permissoesUsuario : {};
    const nivel = perms["EVENTOS"] || "SEM_ACESSO";
    return nivel === "COMPLETO" || nivel === "EDICAO";
  }

  /* ── Fetch helper ───────────────────────────────────── */

  async function _fetch(url, opts) {
    const res = await fetch(url, opts || { headers: _hdrs() });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      let msg = txt;
      try { msg = JSON.parse(txt).message || txt; } catch (_) {}
      throw new Error(msg || `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  /* ── Pill helpers ───────────────────────────────────── */

  function _pillEve(status) {
    const cfg = STATUS_EVE[status] || { cls: "pz" };
    return `<span class="pill ${cfg.cls}">${_eh(cfg.label || status || "—")}</span>`;
  }

  function _pillInscr(status) {
    const cfg = STATUS_INSCR[status] || { cls: "pz" };
    return `<span class="pill ${cfg.cls}">${_eh(cfg.label || status || "—")}</span>`;
  }

  /* ── Navegação (tabs) ───────────────────────────────── */

  function _navHtml(ativo) {
    return `<div style="display:flex;gap:2px;flex-wrap:wrap;margin-bottom:16px;border-bottom:1px solid var(--bd2);padding-bottom:0">${
      NAV_TABS.map(t =>
        `<button onclick="go('${t.id}')" style="padding:8px 14px;border-radius:7px 7px 0 0;border:none;cursor:pointer;font-size:12px;font-weight:${ativo === t.id ? "700" : "400"};background:${ativo === t.id ? "var(--sky)" : "transparent"};color:${ativo === t.id ? "#fff" : "var(--tx2)"};transition:all .12s;white-space:nowrap">${_eh(t.label)}</button>`
      ).join("")
    }</div>`;
  }

  function _injectNav(ativo) {
    const html = _navHtml(ativo);
    for (const tid of NAV_TARGETS) {
      const el = document.getElementById(tid);
      if (el) el.innerHTML = html;
    }
  }

  /* ── Carregar dados ─────────────────────────────────── */

  async function _carregarEventos() {
    const url = `${_api()}/rest/v1/eventos?select=*&order=data_inicio.desc&limit=500`;
    _eventos = await _fetch(url) || [];
  }

  async function _carregarTodasInscricoes() {
    const url = `${_api()}/rest/v1/evento_inscricoes?select=*&order=criado_em.desc&limit=2000`;
    _todasInscricoes = await _fetch(url) || [];
  }

  /* ── Dashboard ──────────────────────────────────────── */

  async function _carregarDash() {
    try {
      await Promise.all([_carregarEventos(), _carregarTodasInscricoes()]);
      _injectNav("eve-dash");
      _renderKpis();
      _renderDashProximos();
      _renderDashStatus();
      _populateEventoSelects();
    } catch (e) { _T("Erro ao carregar", e.message); }
  }

  function _renderKpis() {
    const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    s("eve-kpi-total",   _eventos.length);
    s("eve-kpi-abertos", _eventos.filter(e => e.status === "inscricoes_abertas").length);
    s("eve-kpi-pub",     _eventos.filter(e => e.status === "publicado").length);
    s("eve-kpi-conc",    _eventos.filter(e => e.status === "concluido").length);
  }

  function _renderDashProximos() {
    const el = document.getElementById("eve-dash-proximos");
    if (!el) return;
    const hoje = new Date().toISOString().slice(0, 10);
    const proximos = _eventos
      .filter(e => e.data_inicio >= hoje && e.status !== "cancelado")
      .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))
      .slice(0, 6);
    if (!proximos.length) {
      el.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:8px">Nenhum evento próximo.</div>`;
      return;
    }
    el.innerHTML = proximos.map(e => `
      <div onclick="eveAbrirDetalhe('${_ea(e.id)}')" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid var(--bd1)">
        <div style="min-width:42px;text-align:center;background:rgba(74,156,245,0.1);border-radius:8px;padding:6px 4px;border:1px solid rgba(74,156,245,0.2)">
          <div style="font-size:16px;font-weight:800;color:var(--sky);line-height:1">${String(e.data_inicio).slice(8, 10)}</div>
          <div style="font-size:9px;color:var(--sky);text-transform:uppercase">${_mesAbrev(e.data_inicio)}</div>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_eh(e.titulo)}</div>
          <div style="font-size:10.5px;color:var(--tx3)">${_eh(e.local_nome || "—")} ${e.hora_inicio ? "· " + _fmtH(e.hora_inicio) : ""}</div>
        </div>
        ${_pillEve(e.status)}
      </div>`).join("");
  }

  function _renderDashStatus() {
    const el = document.getElementById("eve-dash-status");
    if (!el) return;
    el.innerHTML = Object.entries(STATUS_EVE).map(([key, cfg]) => {
      const count = _eventos.filter(e => e.status === key).length;
      return `<div onclick="eveGoFiltro('${_ea(key)}')" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:9px 4px;border-bottom:1px solid var(--bd1)">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:7px;height:7px;border-radius:50%;background:${cfg.cor}"></div>
          <span style="font-size:12px;color:var(--tx2)">${_eh(cfg.label)}</span>
        </div>
        <span style="font-size:13px;font-weight:700;color:${cfg.cor}">${count}</span>
      </div>`;
    }).join("");
  }

  function _mesAbrev(d) {
    const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const m = parseInt(String(d).slice(5, 7), 10) - 1;
    return meses[m] || "";
  }

  /* ── Lista de eventos ───────────────────────────────── */

  async function _carregarLista() {
    try {
      await _carregarEventos();
      _injectNav("eve-todos");
      _renderLista();
    } catch (e) { _T("Erro ao carregar", e.message); }
  }

  function _filtrados() {
    let rows = [..._eventos];
    if (_fBusca) {
      const q = _fBusca.toLowerCase();
      rows = rows.filter(e =>
        (e.titulo || "").toLowerCase().includes(q) ||
        (e.local_nome || "").toLowerCase().includes(q) ||
        (e.ministerio_organizador || "").toLowerCase().includes(q)
      );
    }
    if (_fStatus) rows = rows.filter(e => e.status === _fStatus);
    if (_fTipo === "gratuito") rows = rows.filter(e => e.gratuito);
    if (_fTipo === "pago")     rows = rows.filter(e => !e.gratuito);
    return rows;
  }

  function _renderLista() {
    const el = document.getElementById("eve-lista-grid");
    if (!el) return;
    const rows = _filtrados();
    if (!rows.length) {
      el.innerHTML = `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--tx3);font-size:13px">Nenhum evento encontrado.</div>`;
      return;
    }
    el.innerHTML = rows.map(_cardEvento).join("");
  }

  function _cardEvento(e) {
    const inscrCount = _todasInscricoes.filter(i => i.evento_id === e.id).length;
    const vagasInfo = e.vagas
      ? `${inscrCount}/${e.vagas} inscritos`
      : `${inscrCount} inscritos`;
    return `
      <div onclick="eveAbrirDetalhe('${_ea(e.id)}')" style="cursor:pointer;background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;padding:16px 18px;transition:border-color .12s;display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div style="font-size:13.5px;font-weight:700;color:var(--tx1);line-height:1.3;flex:1">${_eh(e.titulo)}</div>
          ${_pillEve(e.status)}
        </div>
        <div style="display:flex;gap:10px;font-size:11px;color:var(--tx3);flex-wrap:wrap">
          <span>📅 ${_fmtD(e.data_inicio)}${e.hora_inicio ? " · " + _fmtH(e.hora_inicio) : ""}</span>
          ${e.local_nome ? `<span>📍 ${_eh(e.local_nome)}</span>` : ""}
          ${e.ministerio_organizador ? `<span>🏛 ${_eh(e.ministerio_organizador)}</span>` : ""}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid var(--bd1)">
          <span style="font-size:11px;color:var(--tx3)">👥 ${vagasInfo}</span>
          <span style="font-size:11px;font-weight:600;color:${e.gratuito ? "var(--gr)" : "var(--amber)"}">${e.gratuito ? "Gratuito" : _fmtMoeda(e.valor)}</span>
        </div>
      </div>`;
  }

  /* ── Detalhe do evento ──────────────────────────────── */

  window.eveAbrirDetalhe = async function (id) {
    _eventoAtivo = _eventos.find(e => e.id === id) || null;
    if (!_eventoAtivo) {
      try {
        const data = await _fetch(`${_api()}/rest/v1/eventos?id=eq.${id}&select=*&limit=1`);
        _eventoAtivo = Array.isArray(data) ? data[0] : data;
      } catch (e) { _T("Erro", e.message); return; }
    }
    if (!_eventoAtivo) { _T("Não encontrado", "Evento não encontrado."); return; }
    await go("eve-detalhe");
    const ttl = document.getElementById("eve-det-titulo");
    if (ttl) ttl.textContent = _eventoAtivo.titulo || "Evento";
    await _renderDetalhe(_eventoAtivo);
  };

  async function _renderDetalhe(evt) {
    const el = document.getElementById("eve-detalhe-content");
    if (!el) return;
    el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--tx3)">Carregando inscrições...</div>`;

    let inscricoes = [];
    let agendaEntry = null;
    try {
      const data = await _fetch(`${_api()}/rest/v1/evento_inscricoes?evento_id=eq.${evt.id}&select=*&order=criado_em.asc&limit=500`);
      inscricoes = data || [];
    } catch (_) {}
    if (evt.agenda_id) {
      try {
        const ag = await _fetch(`${_api()}/rest/v1/agenda?id=eq.${evt.agenda_id}&select=id,status,aprovado_por_nome,aprovado_em,motivo_rejeicao&limit=1`);
        agendaEntry = Array.isArray(ag) ? ag[0] : ag;
      } catch (_) {}
    }

    const isAdmin = _isAdmin();
    const lbl = t => `<div style="font-size:9.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">${t}</div>`;
    const val = v => `<div style="font-size:13px;color:var(--tx1)">${_eh(v || "—")}</div>`;
    const field = (l, v) => `<div style="flex:1;min-width:150px">${lbl(l)}${val(v)}</div>`;
    const tags = arr => (arr || []).filter(Boolean).map(t =>
      `<span style="display:inline-block;padding:3px 9px;border-radius:12px;font-size:10.5px;font-weight:600;background:rgba(74,156,245,0.12);color:var(--sky);margin:2px 2px 2px 0;border:1px solid rgba(74,156,245,0.2)">${_eh(t)}</span>`
    ).join("");

    const totalPago = inscricoes.filter(i => i.pago).reduce((s, i) => s + (Number(i.valor_pago) || 0), 0);

    el.innerHTML = `
      <!-- Header -->
      <div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;padding:20px 24px;margin-bottom:12px">
        <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:240px">
            <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px">Evento · ${_eh(evt.id.slice(0, 8).toUpperCase())}</div>
            <div style="font-size:19px;font-weight:800;color:var(--tx1);line-height:1.3;margin-bottom:8px">${_eh(evt.titulo)}</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              ${_pillEve(evt.status)}
              <span style="font-size:11px;color:var(--tx3)">📅 ${_fmtD(evt.data_inicio)}${evt.hora_inicio ? " · " + _fmtH(evt.hora_inicio) : ""}</span>
              ${evt.local_nome ? `<span style="font-size:11px;color:var(--tx3)">📍 ${_eh(evt.local_nome)}</span>` : ""}
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-self:flex-start">
            ${isAdmin ? `
              <select onchange="eveAlterarStatusEvento('${_ea(evt.id)}',this.value)" style="padding:7px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px;cursor:pointer">
                ${Object.entries(STATUS_EVE).map(([k, v]) => `<option value="${_ea(k)}"${k === evt.status ? " selected" : ""}>${_eh(v.label)}</option>`).join("")}
              </select>
              <button onclick="eveAbrirFormEvento('${_ea(evt.id)}')" style="padding:7px 14px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--tx1);font-size:12px;cursor:pointer;font-weight:600">Editar</button>` : ""}
            <button onclick="go('eve-todos')" style="padding:7px 14px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12px;cursor:pointer">← Voltar</button>
          </div>
        </div>
      </div>

      <div class="ct" style="gap:12px">
        <!-- Dados -->
        <div class="card">
          <div class="ctit">Dados do Evento</div>
          <div style="display:flex;flex-wrap:wrap;gap:16px">
            ${field("Data Início", _fmtD(evt.data_inicio) + (evt.hora_inicio ? " · " + _fmtH(evt.hora_inicio) : ""))}
            ${evt.data_fim ? field("Data Fim", _fmtD(evt.data_fim) + (evt.hora_fim ? " · " + _fmtH(evt.hora_fim) : "")) : ""}
            ${field("Local", evt.local_nome)}
            ${evt.ministerio_organizador ? field("Ministério", evt.ministerio_organizador) : ""}
            ${field("Tipo", evt.gratuito ? "Gratuito" : "Pago")}
            ${!evt.gratuito ? field("Valor", _fmtMoeda(evt.valor)) : ""}
            ${evt.vagas ? field("Vagas", evt.vagas) : ""}
            ${evt.prazo_inscricao ? field("Prazo de Inscrição", _fmtD(evt.prazo_inscricao)) : ""}
          </div>
          ${(evt.publico_alvo || []).length ? `<div style="margin-top:12px">${lbl("Público-alvo")}<div style="margin-top:4px">${tags(evt.publico_alvo)}</div></div>` : ""}
          ${evt.descricao ? `<div style="margin-top:12px">${lbl("Descrição")}<div style="font-size:12.5px;color:var(--tx2);white-space:pre-wrap">${_eh(evt.descricao)}</div></div>` : ""}
          ${evt.observacoes ? `<div style="margin-top:12px">${lbl("Observações")}<div style="font-size:12px;color:var(--tx3);white-space:pre-wrap">${_eh(evt.observacoes)}</div></div>` : ""}
        </div>

        <!-- Status na Agenda -->
        ${(() => {
          if (evt.status === "rascunho") return "";
          if (!evt.agenda_id) return `
            <div class="card" style="border-color:rgba(208,144,64,.3)">
              <div class="ctit">Agenda</div>
              <div style="font-size:12px;color:var(--amber)">⚠ Não sincronizado com a Agenda ainda. Salve o evento novamente para enviar.</div>
            </div>`;
          const AG_CFG = {
            pendente:   { cor: "var(--amber)", lbl: "Aguardando aprovação" },
            confirmado: { cor: "var(--gr)",    lbl: "Aprovado na Agenda"   },
            cancelado:  { cor: "var(--rose)",  lbl: "Rejeitado pela Agenda"},
          };
          const ag = agendaEntry;
          if (!ag) return `
            <div class="card">
              <div class="ctit">Agenda</div>
              <div style="font-size:12px;color:var(--tx3)">Sincronizado com a Agenda.</div>
            </div>`;
          const cfg = AG_CFG[ag.status] || { cor: "var(--tx3)", lbl: ag.status };
          return `
            <div class="card" style="border-color:${cfg.cor}40">
              <div class="ctit">Status na Agenda</div>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                <span style="padding:4px 12px;border-radius:20px;font-size:11.5px;font-weight:700;background:${cfg.cor}18;color:${cfg.cor};border:1px solid ${cfg.cor}40">${cfg.lbl}</span>
                ${ag.aprovado_por_nome ? `<span style="font-size:11px;color:var(--tx3)">por ${_eh(ag.aprovado_por_nome)} · ${_fmtD(ag.aprovado_em)}</span>` : ""}
              </div>
              ${ag.status === "cancelado" && ag.motivo_rejeicao ? `
                <div style="margin-top:10px;padding:9px 12px;background:rgba(224,85,85,.08);border-radius:7px;border:1px solid rgba(224,85,85,.2);font-size:11.5px;color:var(--rose)">
                  <strong>Motivo:</strong> ${_eh(ag.motivo_rejeicao)}
                </div>` : ""}
            </div>`;
        })()}

        <!-- Link público de inscrição -->
        ${(() => {
          const link = _gerarLinkPublico(evt.id);
          const disponivel = ["publicado","inscricoes_abertas"].includes(evt.status);
          const erascunho = evt.status === "rascunho";
          return `
            <div class="card" style="border-color:rgba(74,156,245,.3)">
              <div class="ctit">Link de Inscrição Pública</div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
                <input id="eve-link-pub-${_ea(evt.id)}" type="text" readonly value="${_ea(link)}"
                  style="flex:1;min-width:200px;padding:7px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--tx2);font-size:11.5px;font-family:monospace;outline:none;cursor:text">
                <button onclick="eveCopiarLink('${_ea(evt.id)}')" style="padding:7px 14px;border-radius:7px;border:none;background:var(--sky);color:#fff;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">Copiar</button>
                ${disponivel ? `<a href="https://wa.me/?text=${encodeURIComponent("Inscreva-se no evento: " + link)}" target="_blank" rel="noopener" style="padding:7px 14px;border-radius:7px;border:1px solid rgba(37,211,102,.4);background:rgba(37,211,102,.1);color:#25d366;font-size:12px;font-weight:700;cursor:pointer;text-decoration:none;white-space:nowrap">WhatsApp</a>` : ""}
              </div>
              ${erascunho ? `<div style="font-size:11px;color:var(--tx3)">Evento em rascunho — publique para liberar as inscrições.</div>` : !disponivel ? `<div style="font-size:11px;color:var(--amber)">⚠ Inscrições disponíveis apenas quando status for "Publicado" ou "Inscrições Abertas".</div>` : ""}
            </div>`;
        })()}

        <!-- Resumo inscrições -->
        <div class="card">
          <div class="ctit">Resumo das Inscrições</div>
          <div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:12px">
            ${field("Total", inscricoes.length + (evt.vagas ? `/${evt.vagas}` : ""))}
            ${field("Confirmadas", inscricoes.filter(i => i.status === "confirmada").length)}
            ${field("Presentes", inscricoes.filter(i => i.status === "presente").length)}
            ${!evt.gratuito ? field("Recebido", _fmtMoeda(totalPago)) : ""}
          </div>
          ${isAdmin ? `<button onclick="eveAbrirFormInscricao('${_ea(evt.id)}', null)" style="padding:7px 16px;border-radius:7px;border:none;background:var(--sky);color:#fff;font-size:12px;font-weight:700;cursor:pointer">+ Nova Inscrição</button>` : ""}
        </div>

        <!-- Lista de inscrições -->
        <div class="card" style="grid-column:1 / -1">
          <div class="ctit">Inscrições <span class="cact" onclick="eveAbrirDetalhe('${_ea(evt.id)}')">↻</span></div>
          ${_tabelaInscricoes(inscricoes, evt)}
        </div>
      </div>`;
  }

  function _tabelaInscricoes(inscricoes, evt) {
    const isAdmin = _isAdmin();
    if (!inscricoes.length) {
      return `<div style="padding:24px;text-align:center;color:var(--tx3);font-size:12px">Nenhuma inscrição ainda.${isAdmin ? ` <span onclick="eveAbrirFormInscricao('${_ea(evt.id)}', null)" style="cursor:pointer;color:var(--sky);font-weight:600">+ Adicionar</span>` : ""}</div>`;
    }
    return `
      <table class="tbl" style="width:100%">
        <thead><tr>
          <th>Nome</th>
          <th>Tipo</th>
          <th>Contato</th>
          <th>Status</th>
          ${!evt.gratuito ? "<th>Pagamento</th>" : ""}
          ${isAdmin ? "<th></th>" : ""}
        </tr></thead>
        <tbody>${inscricoes.map(i => _trInscricao(i, evt, isAdmin)).join("")}</tbody>
      </table>`;
  }

  function _trInscricao(i, evt, isAdmin) {
    const tipoLabels = { membro: "Membro", nao_membro: "Não membro", visitante: "Visitante", crianca: "Criança", adolescente: "Adolescente" };
    return `<tr>
      <td style="padding:10px 8px">
        <div style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_eh(i.nome)}</div>
        ${i.responsavel_nome ? `<div style="font-size:10px;color:var(--tx3)">Resp.: ${_eh(i.responsavel_nome)}</div>` : ""}
      </td>
      <td style="padding:10px 8px;font-size:11.5px;color:var(--tx2)">${_eh(tipoLabels[i.tipo] || i.tipo)}</td>
      <td style="padding:10px 8px;font-size:11px;color:var(--tx3)">
        ${i.email ? _eh(i.email) : ""}${i.telefone ? `<br>${_eh(i.telefone)}` : ""}
      </td>
      <td style="padding:10px 8px">
        <select onchange="eveAlterarStatusInscricao('${_ea(i.id)}',this.value)" style="padding:4px 6px;border-radius:5px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:11px">
          ${Object.entries(STATUS_INSCR).map(([k, v]) => `<option value="${_ea(k)}"${k === i.status ? " selected" : ""}>${_eh(v.label)}</option>`).join("")}
        </select>
      </td>
      ${!evt.gratuito ? `<td style="padding:10px 8px">
        ${i.pago
          ? `<span style="font-size:11px;font-weight:700;color:var(--gr)">✓ ${_fmtMoeda(i.valor_pago)}</span>`
          : `<span style="font-size:11px;color:var(--amber)">Pendente${isAdmin ? ` <span onclick="eveConfirmarPagamento('${_ea(i.id)}')" style="cursor:pointer;color:var(--sky);font-weight:600;margin-left:4px">Confirmar</span>` : ""}</span>`
        }
      </td>` : ""}
      ${isAdmin ? `<td style="padding:10px 8px;text-align:right">
        <button onclick="eveAbrirFormInscricao('${_ea(evt.id)}','${_ea(i.id)}')" style="padding:4px 8px;border-radius:5px;border:1px solid var(--bd2);background:transparent;color:var(--tx3);font-size:11px;cursor:pointer">Editar</button>
      </td>` : ""}
    </tr>`;
  }

  /* ── Formulário de evento (modal) ───────────────────── */

  window.eveAbrirNovo       = function ()  { eveAbrirFormEvento(null); };
  window.eveAbrirFormEvento = function (id) {
    const evt = id ? (_eventos.find(e => e.id === id) || null) : null;
    _renderFormEvento(evt);
  };

  function _renderFormEvento(evt) {
    const isEdit = !!evt;
    let el = document.getElementById("eve-form-modal");
    if (!el) {
      el = document.createElement("div");
      el.id = "eve-form-modal";
      el.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;z-index:300;overflow-y:auto;padding:24px 16px";
      document.body.appendChild(el);
    }

    const lbl = (txt, req) =>
      `<label style="font-size:9.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em">${txt}${req ? ' <span style="color:var(--rose)">*</span>' : ""}</label>`;

    const inp = (id, label, attrs, defVal, req) =>
      `<div style="display:flex;flex-direction:column;gap:4px">${lbl(label, req)}
      <input id="${id}" ${attrs} value="${_ea(defVal || "")}" style="padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input);color:var(--tx1);font-size:12.5px;outline:none;width:100%;box-sizing:border-box"></div>`;

    const sel = (id, label, opts, defVal, req) =>
      `<div style="display:flex;flex-direction:column;gap:4px">${lbl(label, req)}
      <select id="${id}" style="padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input);color:var(--tx1);font-size:12.5px;outline:none;width:100%;box-sizing:border-box">
        ${opts.map(([k, v]) => `<option value="${_ea(k)}"${k === defVal ? " selected" : ""}>${_eh(v)}</option>`).join("")}
      </select></div>`;

    const txta = (id, label, defVal, req, rows) =>
      `<div style="display:flex;flex-direction:column;gap:4px">${lbl(label, req)}
      <textarea id="${id}" rows="${rows || 3}" style="padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input);color:var(--tx1);font-size:12.5px;font-family:inherit;resize:vertical;outline:none;width:100%;box-sizing:border-box">${_ea(defVal || "")}</textarea></div>`;

    const chkGroup = (name, vals) =>
      `<div style="display:flex;flex-wrap:wrap;gap:6px">${
        PUBLICO_ALVO.map(o => {
          const checked = (vals || []).includes(o);
          return `<label style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:20px;border:1px solid ${checked ? "rgba(74,156,245,.4)" : "var(--bd2)"};cursor:pointer;font-size:12px;background:${checked ? "rgba(74,156,245,.12)" : "var(--bg-surface)"};color:${checked ? "var(--sky)" : "var(--tx2)"}">
            <input type="checkbox" name="${name}" value="${_ea(o)}" ${checked ? "checked" : ""} style="accent-color:var(--sky)"> ${_eh(o)}
          </label>`;
        }).join("")
      }</div>`;

    const sec = t => `<div style="font-size:10px;font-weight:700;color:var(--sky);text-transform:uppercase;letter-spacing:.1em;padding-bottom:6px;border-bottom:1px solid rgba(74,156,245,.2);margin-bottom:12px">${t}</div>`;

    const statusOpts = Object.entries(STATUS_EVE).map(([k, v]) => [k, v.label]);
    const pagHidden = evt?.gratuito === false ? "grid" : "none";

    el.innerHTML = `
      <div style="width:min(680px,100%);background:var(--bg-card);border:1px solid var(--bd2);border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.3)">
        <div style="padding:20px 24px;border-bottom:1px solid var(--bd2);display:flex;align-items:center;justify-content:space-between;background:var(--bg-surface)">
          <div>
            <div style="font-size:10px;font-weight:700;color:var(--sky);text-transform:uppercase;letter-spacing:.08em">Eventos</div>
            <div style="font-size:16px;font-weight:700;color:var(--tx1)">${isEdit ? "Editar Evento" : "Novo Evento"}</div>
          </div>
          <button onclick="eveFecharFormEvento()" style="padding:6px 10px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx3);cursor:pointer;font-size:14px">✕</button>
        </div>
        <div style="padding:24px;display:flex;flex-direction:column;gap:20px;max-height:calc(100vh - 130px);overflow-y:auto">
          <div>
            ${sec("Identificação")}
            ${inp("eve-f-titulo", "Título do Evento", 'type="text" placeholder="Nome do evento"', evt?.titulo, true)}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
              ${sel("eve-f-status", "Status", statusOpts, evt?.status || "rascunho")}
              ${inp("eve-f-ministerio", "Ministério Organizador", 'type="text"', evt?.ministerio_organizador)}
            </div>
            <div style="margin-top:12px">${txta("eve-f-desc", "Descrição", evt?.descricao, false, 3)}</div>
          </div>
          <div>
            ${sec("Data e Local")}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              ${inp("eve-f-data-ini", "Data Início", 'type="date"', evt?.data_inicio, true)}
              ${inp("eve-f-hora-ini", "Hora Início", 'type="time"', _fmtH(evt?.hora_inicio))}
              ${inp("eve-f-data-fim", "Data Fim", 'type="date"', evt?.data_fim)}
              ${inp("eve-f-hora-fim", "Hora Fim", 'type="time"', _fmtH(evt?.hora_fim))}
              <div style="grid-column:1 / -1">${inp("eve-f-local", "Local / Endereço", 'type="text"', evt?.local_nome)}</div>
            </div>
          </div>
          <div>
            ${sec("Inscrições e Vagas")}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              ${inp("eve-f-vagas", "Vagas (deixe vazio = ilimitado)", 'type="number" min="1"', evt?.vagas)}
              ${inp("eve-f-prazo", "Prazo de Inscrição", 'type="date"', evt?.prazo_inscricao)}
            </div>
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px">
              <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer"><input type="checkbox" id="eve-f-nao-membros" ${evt?.aceita_nao_membros !== false ? "checked" : ""} style="accent-color:var(--sky)"> Aceita não membros</label>
              <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer"><input type="checkbox" id="eve-f-criancas" ${evt?.aceita_criancas ? "checked" : ""} style="accent-color:var(--sky)"> Aceita crianças</label>
              <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer"><input type="checkbox" id="eve-f-responsavel" ${evt?.requer_responsavel ? "checked" : ""} style="accent-color:var(--sky)"> Requer responsável</label>
            </div>
            <div style="margin-top:16px">
              ${sec("Campos do Formulário de Inscrição")}
              <div style="font-size:11px;color:var(--tx3);margin-bottom:10px">Nome completo e WhatsApp são sempre exibidos. Escolha os demais campos:</div>
              <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
                ${(() => {
                  const ci = evt?.campos_inscricao || {};
                  const campo = (id, label, def) =>
                    `<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">
                      <input type="checkbox" id="eve-f-campo-${id}" ${(ci[id] !== undefined ? ci[id] : def) ? "checked" : ""} style="accent-color:var(--sky)">
                      ${label}
                    </label>`;
                  return [
                    campo("email",       "E-mail",           true),
                    campo("familia",     "Família",          false),
                    campo("tipo_pessoa", "Tipo de pessoa",   true),
                    campo("congregacao", "Congregação",      true),
                    campo("observacoes", "Observações",      true),
                  ].join("");
                })()}
              </div>
            </div>
            <div style="margin-top:14px">
              ${lbl("Público-alvo")}
              <div style="margin-top:8px">${chkGroup("eve-f-publico", evt?.publico_alvo)}</div>
            </div>
          </div>
          <div>
            ${sec("Financeiro")}
            <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:12px">
              <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer"><input type="radio" name="eve-f-tipo" value="gratuito" ${evt?.gratuito !== false ? "checked" : ""} onchange="eveToogleGratuito(this.value)" style="accent-color:var(--sky)"> Gratuito</label>
              <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer"><input type="radio" name="eve-f-tipo" value="pago" ${evt?.gratuito === false ? "checked" : ""} onchange="eveToogleGratuito(this.value)" style="accent-color:var(--sky)"> Pago</label>
            </div>
            <div id="eve-f-valor-sec" style="display:${pagHidden};grid-template-columns:1fr 1fr;gap:12px">
              ${inp("eve-f-valor", "Valor (R$)", 'type="number" min="0" step="0.01" placeholder="0,00"', evt?.valor)}
            </div>
          </div>
          <div>
            ${sec("Observações")}
            ${txta("eve-f-obs", "Observações internas", evt?.observacoes, false, 2)}
          </div>
        </div>
        <div style="padding:16px 24px;border-top:1px solid var(--bd2);display:flex;gap:10px;justify-content:flex-end;background:var(--bg-surface)">
          <button onclick="eveFecharFormEvento()" style="padding:9px 20px;border-radius:8px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:13px;cursor:pointer">Cancelar</button>
          <button onclick="eveSalvarEvento(${isEdit ? `'${_ea(evt.id)}'` : "null"})" style="padding:9px 24px;border-radius:8px;border:none;background:var(--sky);color:#fff;font-size:13px;font-weight:700;cursor:pointer">${isEdit ? "Salvar Alterações" : "Criar Evento"}</button>
        </div>
      </div>`;

    el.style.display = "flex";
  }

  window.eveFecharFormEvento = function () {
    const el = document.getElementById("eve-form-modal");
    if (el) el.style.display = "none";
  };

  window.eveCopiarLink = function (eventoId) {
    const input = document.getElementById(`eve-link-pub-${eventoId}`);
    const link = input ? input.value : _gerarLinkPublico(eventoId);
    navigator.clipboard.writeText(link).then(() => {
      _T("Link copiado!", link);
    }).catch(() => {
      if (input) { input.select(); document.execCommand("copy"); }
      _T("Link copiado!");
    });
  };

  window.eveToogleGratuito = function (val) {
    const s = document.getElementById("eve-f-valor-sec");
    if (s) s.style.display = val === "pago" ? "grid" : "none";
  };

  window.eveSalvarEvento = async function (editId) {
    const g  = id => document.getElementById(id)?.value?.trim() || null;
    const chk = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(e => e.value);
    const rad = name => document.querySelector(`input[name="${name}"]:checked`)?.value;
    const cbk = id => !!document.getElementById(id)?.checked;

    const titulo = g("eve-f-titulo");
    const dataIni = g("eve-f-data-ini");
    if (!titulo)  { _T("Campo obrigatório", "Informe o título do evento."); return; }
    if (!dataIni) { _T("Campo obrigatório", "Informe a data de início."); return; }

    const gratuito = rad("eve-f-tipo") !== "pago";
    const valorRaw = g("eve-f-valor");

    const payload = {
      titulo,
      descricao:              g("eve-f-desc"),
      data_inicio:            dataIni,
      hora_inicio:            g("eve-f-hora-ini") || null,
      data_fim:               g("eve-f-data-fim") || null,
      hora_fim:               g("eve-f-hora-fim") || null,
      local_nome:             g("eve-f-local"),
      ministerio_organizador: g("eve-f-ministerio"),
      gratuito,
      valor:                  (!gratuito && valorRaw) ? parseFloat(valorRaw) : null,
      vagas:                  g("eve-f-vagas") ? parseInt(g("eve-f-vagas"), 10) : null,
      prazo_inscricao:        g("eve-f-prazo") || null,
      publico_alvo:           chk("eve-f-publico"),
      aceita_nao_membros:     cbk("eve-f-nao-membros"),
      aceita_criancas:        cbk("eve-f-criancas"),
      requer_responsavel:     cbk("eve-f-responsavel"),
      campos_inscricao: {
        email:       cbk("eve-f-campo-email"),
        familia:     cbk("eve-f-campo-familia"),
        tipo_pessoa: cbk("eve-f-campo-tipo_pessoa"),
        congregacao: cbk("eve-f-campo-congregacao"),
        observacoes: cbk("eve-f-campo-observacoes"),
      },
      observacoes:            g("eve-f-obs"),
      status:                 g("eve-f-status") || "rascunho",
      atualizado_em:          new Date().toISOString(),
    };

    const isNew = !editId || editId === "null";
    if (isNew) {
      payload.criado_por      = _authUserId();
      payload.criado_por_nome = _userName();
      payload.criado_em       = new Date().toISOString();
    }

    try {
      if (!isNew) {
        await _fetch(`${_api()}/rest/v1/eventos?id=eq.${editId}`, {
          method: "PATCH",
          headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
          body: JSON.stringify(payload),
        });
        _T("Evento atualizado!");
        eveFecharFormEvento();
        await _recarregarTudo();
        try {
          const evtAtualizado = _eventos.find(e => e.id === editId);
          if (evtAtualizado) await _sincronizarAgenda(evtAtualizado);
        } catch (_) {}
        eveAbrirDetalhe(editId);
      } else {
        const res = await _fetch(`${_api()}/rest/v1/eventos`, {
          method: "POST",
          headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=representation" }),
          body: JSON.stringify(payload),
        });
        const novo = Array.isArray(res) ? res[0] : res;
        _T("Evento criado!", titulo);
        eveFecharFormEvento();
        await _recarregarTudo();
        if (novo?.id) {
          try { await _sincronizarAgenda(novo); } catch (_) {}
          eveAbrirDetalhe(novo.id);
        } else go("eve-todos");
      }
    } catch (e) { _T("Erro ao salvar", e.message); }
  };

  /* ── Formulário de inscrição (modal) ────────────────── */

  window.eveAbrirFormInscricao = function (eventoId, inscId) {
    const inscr = inscId ? _todasInscricoes.find(i => i.id === inscId) || null : null;
    _renderFormInscricao(eventoId, inscr);
  };

  function _renderFormInscricao(eventoId, inscr) {
    const evt = _eventoAtivo || _eventos.find(e => e.id === eventoId);
    const isEdit = !!inscr;
    let el = document.getElementById("eve-inscr-modal");
    if (!el) {
      el = document.createElement("div");
      el.id = "eve-inscr-modal";
      el.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;z-index:300;overflow-y:auto;padding:24px 16px";
      document.body.appendChild(el);
    }

    const lbl = (txt, req) =>
      `<label style="font-size:9.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em">${txt}${req ? ' <span style="color:var(--rose)">*</span>' : ""}</label>`;
    const inp = (id, label, attrs, defVal, req) =>
      `<div style="display:flex;flex-direction:column;gap:4px">${lbl(label, req)}
      <input id="${id}" ${attrs} value="${_ea(defVal || "")}" style="padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input);color:var(--tx1);font-size:12.5px;outline:none;width:100%;box-sizing:border-box"></div>`;
    const sel = (id, label, opts, defVal, req) =>
      `<div style="display:flex;flex-direction:column;gap:4px">${lbl(label, req)}
      <select id="${id}" style="padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input);color:var(--tx1);font-size:12.5px;outline:none;width:100%;box-sizing:border-box">
        ${opts.map(([k, v]) => `<option value="${_ea(k)}"${k === defVal ? " selected" : ""}>${_eh(v)}</option>`).join("")}
      </select></div>`;

    const tipoOpts = [["membro","Membro"],["nao_membro","Não membro"],["visitante","Visitante"],["crianca","Criança"],["adolescente","Adolescente"]];
    const statusOpts = Object.entries(STATUS_INSCR).map(([k, v]) => [k, v.label]);
    const respHidden = inscr?.tipo === "crianca" || inscr?.tipo === "adolescente" ? "block" : "none";

    el.innerHTML = `
      <div style="width:min(520px,100%);background:var(--bg-card);border:1px solid var(--bd2);border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.3)">
        <div style="padding:18px 22px;border-bottom:1px solid var(--bd2);display:flex;align-items:center;justify-content:space-between;background:var(--bg-surface)">
          <div>
            <div style="font-size:10px;font-weight:700;color:var(--sky);text-transform:uppercase;letter-spacing:.08em">Inscrição · ${_eh(evt?.titulo || "Evento")}</div>
            <div style="font-size:15px;font-weight:700;color:var(--tx1)">${isEdit ? "Editar Inscrição" : "Nova Inscrição"}</div>
          </div>
          <button onclick="eveFecharFormInscricao()" style="padding:6px 10px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx3);cursor:pointer;font-size:14px">✕</button>
        </div>
        <div style="padding:22px;display:flex;flex-direction:column;gap:14px;max-height:calc(100vh - 130px);overflow-y:auto">
          ${inp("eve-i-nome", "Nome Completo", 'type="text"', inscr?.nome, true)}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            ${sel("eve-i-tipo", "Tipo", tipoOpts, inscr?.tipo || "membro")}
            ${sel("eve-i-status", "Status", statusOpts, inscr?.status || "pendente")}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            ${inp("eve-i-email", "E-mail", 'type="email"', inscr?.email)}
            ${inp("eve-i-tel", "Telefone", 'type="tel"', inscr?.telefone)}
          </div>
          <div id="eve-i-resp-sec" style="display:${respHidden};display:grid;grid-template-columns:1fr 1fr;gap:12px">
            ${inp("eve-i-resp-nome", "Nome do Responsável", 'type="text"', inscr?.responsavel_nome)}
            ${inp("eve-i-resp-tel", "Tel. do Responsável", 'type="tel"', inscr?.responsavel_telefone)}
          </div>
          ${!evt?.gratuito ? `
          <div style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:8px;padding:12px">
            <div style="font-size:10px;font-weight:700;color:var(--amber);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Pagamento</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              ${inp("eve-i-valor-cobrado", "Valor Cobrado", 'type="number" min="0" step="0.01"', inscr?.valor_cobrado || evt?.valor)}
              ${inp("eve-i-valor-pago", "Valor Pago", 'type="number" min="0" step="0.01"', inscr?.valor_pago)}
              ${inp("eve-i-forma-pgto", "Forma de Pagamento", 'type="text" placeholder="PIX, Cartão..."', inscr?.forma_pagamento)}
              ${inp("eve-i-ref-pgto", "Referência / Comprovante", 'type="text"', inscr?.referencia_pagamento)}
            </div>
            <label style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:12.5px;cursor:pointer"><input type="checkbox" id="eve-i-pago" ${inscr?.pago ? "checked" : ""} style="accent-color:var(--sky)"> Pagamento confirmado</label>
          </div>` : ""}
          ${inp("eve-i-obs", "Observação", 'type="text"', inscr?.observacao)}
        </div>
        <div style="padding:14px 22px;border-top:1px solid var(--bd2);display:flex;gap:10px;justify-content:flex-end;background:var(--bg-surface)">
          <button onclick="eveFecharFormInscricao()" style="padding:8px 18px;border-radius:8px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:13px;cursor:pointer">Cancelar</button>
          <button onclick="eveSalvarInscricao('${_ea(eventoId)}',${isEdit ? `'${_ea(inscr.id)}'` : "null"})" style="padding:8px 20px;border-radius:8px;border:none;background:var(--sky);color:#fff;font-size:13px;font-weight:700;cursor:pointer">${isEdit ? "Salvar" : "Inscrever"}</button>
        </div>
      </div>`;

    el.style.display = "flex";
  }

  window.eveFecharFormInscricao = function () {
    const el = document.getElementById("eve-inscr-modal");
    if (el) el.style.display = "none";
  };

  window.eveSalvarInscricao = async function (eventoId, editId) {
    const g  = id => document.getElementById(id)?.value?.trim() || null;
    const cbk = id => !!document.getElementById(id)?.checked;

    const nome = g("eve-i-nome");
    if (!nome) { _T("Campo obrigatório", "Informe o nome do inscrito."); return; }

    const evt = _eventoAtivo || _eventos.find(e => e.id === eventoId);
    const valorCobradoRaw = g("eve-i-valor-cobrado");
    const valorPagoRaw    = g("eve-i-valor-pago");

    const payload = {
      evento_id:            eventoId,
      nome,
      tipo:                 g("eve-i-tipo") || "membro",
      status:               g("eve-i-status") || "pendente",
      email:                g("eve-i-email"),
      telefone:             g("eve-i-tel"),
      responsavel_nome:     g("eve-i-resp-nome"),
      responsavel_telefone: g("eve-i-resp-tel"),
      observacao:           g("eve-i-obs"),
      atualizado_em:        new Date().toISOString(),
    };

    if (!evt?.gratuito) {
      payload.valor_cobrado       = valorCobradoRaw ? parseFloat(valorCobradoRaw) : null;
      payload.valor_pago          = valorPagoRaw    ? parseFloat(valorPagoRaw)    : null;
      payload.forma_pagamento     = g("eve-i-forma-pgto");
      payload.referencia_pagamento = g("eve-i-ref-pgto");
      payload.pago                = cbk("eve-i-pago");
      if (payload.pago && !payload.data_pagamento) {
        payload.data_pagamento = new Date().toISOString();
      }
    }

    const isNew = !editId || editId === "null";
    if (isNew) {
      payload.criado_por      = _authUserId();
      payload.criado_por_nome = _userName();
      payload.criado_em       = new Date().toISOString();
    }

    try {
      if (!isNew) {
        await _fetch(`${_api()}/rest/v1/evento_inscricoes?id=eq.${editId}`, {
          method: "PATCH",
          headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
          body: JSON.stringify(payload),
        });
        _T("Inscrição atualizada!");
      } else {
        await _fetch(`${_api()}/rest/v1/evento_inscricoes`, {
          method: "POST",
          headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
          body: JSON.stringify(payload),
        });
        _T("Inscrito com sucesso!", nome);
      }
      eveFecharFormInscricao();
      await _recarregarTudo();
      if (_eventoAtivo?.id === eventoId) eveAbrirDetalhe(eventoId);
    } catch (e) { _T("Erro ao salvar", e.message); }
  };

  /* ── Alterar status ─────────────────────────────────── */

  window.eveAlterarStatusEvento = async function (id, status) {
    try {
      await _fetch(`${_api()}/rest/v1/eventos?id=eq.${id}`, {
        method: "PATCH",
        headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
        body: JSON.stringify({ status, atualizado_em: new Date().toISOString() }),
      });
      _T("Status atualizado!", STATUS_EVE[status]?.label || status);
      const idx = _eventos.findIndex(e => e.id === id);
      if (idx >= 0) { _eventos[idx] = { ..._eventos[idx], status }; }
      if (_eventoAtivo?.id === id) _eventoAtivo = { ..._eventoAtivo, status };
      _renderLista(); _renderKpis(); _renderDashProximos(); _renderDashStatus();
    } catch (e) { _T("Erro", e.message); }
  };

  window.eveAlterarStatusInscricao = async function (id, status) {
    try {
      await _fetch(`${_api()}/rest/v1/evento_inscricoes?id=eq.${id}`, {
        method: "PATCH",
        headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
        body: JSON.stringify({ status, atualizado_em: new Date().toISOString() }),
      });
      _T("Status atualizado!", STATUS_INSCR[status]?.label || status);
      const idx = _todasInscricoes.findIndex(i => i.id === id);
      if (idx >= 0) _todasInscricoes[idx] = { ..._todasInscricoes[idx], status };
    } catch (e) { _T("Erro", e.message); }
  };

  /* ── Confirmar pagamento ────────────────────────────── */

  window.eveConfirmarPagamento = async function (inscId) {
    try {
      const forma = prompt("Forma de pagamento (PIX, Cartão, etc.):", "PIX") || null;
      await _fetch(`${_api()}/rest/v1/evento_inscricoes?id=eq.${inscId}`, {
        method: "PATCH",
        headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
        body: JSON.stringify({
          pago: true,
          data_pagamento: new Date().toISOString(),
          forma_pagamento: forma,
          atualizado_em: new Date().toISOString(),
        }),
      });
      _T("Pagamento confirmado!");
      const idx = _todasInscricoes.findIndex(i => i.id === inscId);
      if (idx >= 0) _todasInscricoes[idx] = { ..._todasInscricoes[idx], pago: true };
      if (_eventoAtivo) eveAbrirDetalhe(_eventoAtivo.id);
    } catch (e) { _T("Erro", e.message); }
  };

  /* ── Pagamentos ─────────────────────────────────────── */

  async function _carregarPagamentosTab() {
    try {
      await Promise.all([_carregarEventos(), _carregarTodasInscricoes()]);
      _injectNav("eve-pagamentos");
      _populateEventoSelects();
      eveCarregarPagamentos();
    } catch (e) { _T("Erro", e.message); }
  }

  window.eveCarregarPagamentos = function () {
    const eventoId = document.getElementById("eve-pag-evento")?.value || "";
    const statusFil = document.getElementById("eve-pag-status")?.value || "";
    const eventosPagos = _eventos.filter(e => !e.gratuito);
    let inscrs = _todasInscricoes.filter(i => {
      const evt = _eventos.find(e => e.id === i.evento_id);
      return evt && !evt.gratuito;
    });
    if (eventoId) inscrs = inscrs.filter(i => i.evento_id === eventoId);
    if (statusFil === "pago")    inscrs = inscrs.filter(i => i.pago);
    if (statusFil === "pendente") inscrs = inscrs.filter(i => !i.pago);

    const totalRecebido = inscrs.filter(i => i.pago).reduce((s, i) => s + (Number(i.valor_pago) || 0), 0);
    const totalPendente = inscrs.filter(i => !i.pago).reduce((s, i) => s + (Number(i.valor_cobrado) || 0), 0);
    const totalEsperado = inscrs.reduce((s, i) => s + (Number(i.valor_cobrado) || 0), 0);

    const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    s("eve-pag-recebido", _fmtMoeda(totalRecebido));
    s("eve-pag-pendente", _fmtMoeda(totalPendente));
    s("eve-pag-total",    _fmtMoeda(totalEsperado));

    const el = document.getElementById("eve-pag-lista");
    if (!el) return;
    if (!inscrs.length) {
      el.innerHTML = `<div style="padding:28px;text-align:center;color:var(--tx3);font-size:13px">Nenhum pagamento encontrado.</div>`;
      return;
    }
    const evtMap = Object.fromEntries(_eventos.map(e => [e.id, e.titulo]));
    el.innerHTML = `
      <table class="tbl" style="width:100%">
        <thead><tr>
          <th>Inscrito</th>
          <th>Evento</th>
          <th>Valor Cobrado</th>
          <th>Valor Pago</th>
          <th>Status</th>
          <th>Forma</th>
          <th>Data Pgto</th>
          <th></th>
        </tr></thead>
        <tbody>${inscrs.map(i => {
          const evtNome = evtMap[i.evento_id] || "—";
          return `<tr>
            <td style="padding:10px 8px;font-size:12.5px;font-weight:600;color:var(--tx1)">${_eh(i.nome)}</td>
            <td style="padding:10px 8px;font-size:11.5px;color:var(--tx2)">${_eh(evtNome)}</td>
            <td style="padding:10px 8px;font-size:12px">${_fmtMoeda(i.valor_cobrado)}</td>
            <td style="padding:10px 8px;font-size:12px;color:${i.pago ? "var(--gr)" : "var(--amber)"};font-weight:${i.pago ? "700" : "400"}">${i.pago ? _fmtMoeda(i.valor_pago) : "—"}</td>
            <td style="padding:10px 8px"><span class="pill ${i.pago ? "pd" : "po"}">${i.pago ? "Pago" : "Pendente"}</span></td>
            <td style="padding:10px 8px;font-size:11px;color:var(--tx3)">${_eh(i.forma_pagamento || "—")}</td>
            <td style="padding:10px 8px;font-size:11px;color:var(--tx3)">${i.data_pagamento ? _fmtD(i.data_pagamento) : "—"}</td>
            <td style="padding:10px 8px;text-align:right">${!i.pago ? `<button onclick="eveConfirmarPagamento('${_ea(i.id)}')" style="padding:4px 8px;border-radius:5px;border:none;background:var(--sky);color:#fff;font-size:11px;cursor:pointer;font-weight:600">Confirmar</button>` : ""}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>`;
  };

  /* ── Credenciamento ─────────────────────────────────── */

  async function _carregarCredenciamentoTab() {
    try {
      await Promise.all([_carregarEventos(), _carregarTodasInscricoes()]);
      _injectNav("eve-credenciamento");
      _populateEventoSelects();
    } catch (e) { _T("Erro", e.message); }
  }

  window.eveCarregarCredenciamento = function () {
    const eventoId = document.getElementById("eve-cred-evento")?.value || "";
    const buscaCard = document.getElementById("eve-cred-busca-card");
    const statsCard = document.getElementById("eve-cred-stats");
    if (!eventoId) {
      if (buscaCard) buscaCard.style.display = "none";
      if (statsCard) statsCard.style.display = "none";
      return;
    }
    if (buscaCard) buscaCard.style.display = "block";
    if (statsCard) statsCard.style.display = "block";
    _renderCredStats(eventoId);
    const busca = document.getElementById("eve-cred-busca");
    if (busca) busca.value = "";
    const res = document.getElementById("eve-cred-resultado");
    if (res) res.innerHTML = "";
  };

  function _renderCredStats(eventoId) {
    const el = document.getElementById("eve-cred-stats-content");
    if (!el) return;
    const inscrs = _todasInscricoes.filter(i => i.evento_id === eventoId);
    const presentes = inscrs.filter(i => i.status === "presente").length;
    const confirmadas = inscrs.filter(i => i.status === "confirmada").length;
    const total = inscrs.length;
    el.innerHTML = `
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="text-align:center;flex:1"><div style="font-size:26px;font-weight:800;color:var(--gr)">${presentes}</div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase">Presentes</div></div>
        <div style="text-align:center;flex:1"><div style="font-size:26px;font-weight:800;color:var(--blue)">${confirmadas}</div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase">Confirmados</div></div>
        <div style="text-align:center;flex:1"><div style="font-size:26px;font-weight:800;color:var(--tx1)">${total}</div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase">Total</div></div>
      </div>`;
  }

  window.eveBuscarCredenciamento = function () {
    const eventoId = document.getElementById("eve-cred-evento")?.value || "";
    const q = document.getElementById("eve-cred-busca")?.value?.trim().toLowerCase() || "";
    const el = document.getElementById("eve-cred-resultado");
    if (!el || !eventoId) return;
    if (!q) { el.innerHTML = ""; return; }

    const inscrs = _todasInscricoes.filter(i =>
      i.evento_id === eventoId &&
      ((i.nome || "").toLowerCase().includes(q) || (i.email || "").toLowerCase().includes(q))
    );

    if (!inscrs.length) {
      el.innerHTML = `<div style="padding:12px;text-align:center;color:var(--tx3);font-size:12px">Nenhum inscrito encontrado.</div>`;
      return;
    }

    el.innerHTML = inscrs.map(i => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:9px;background:var(--bg-surface);border:1px solid var(--bd1);margin-bottom:6px">
        <div style="flex:1">
          <div style="font-size:13.5px;font-weight:700;color:var(--tx1)">${_eh(i.nome)}</div>
          <div style="font-size:10.5px;color:var(--tx3)">${_eh(i.email || i.telefone || "—")}</div>
        </div>
        ${_pillInscr(i.status)}
        ${i.status !== "presente"
          ? `<button onclick="eveMarcarPresente('${_ea(i.id)}','${_ea(eventoId)}')" style="padding:8px 14px;border-radius:7px;border:none;background:var(--gr);color:#fff;font-size:12px;font-weight:700;cursor:pointer">✓ Presente</button>`
          : `<span style="font-size:11px;color:var(--gr);font-weight:700">Credenciado</span>`
        }
      </div>`).join("");
  };

  window.eveMarcarPresente = async function (inscId, eventoId) {
    try {
      await _fetch(`${_api()}/rest/v1/evento_inscricoes?id=eq.${inscId}`, {
        method: "PATCH",
        headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
        body: JSON.stringify({ status: "presente", atualizado_em: new Date().toISOString() }),
      });
      _T("Presença registrada!");
      const idx = _todasInscricoes.findIndex(i => i.id === inscId);
      if (idx >= 0) _todasInscricoes[idx] = { ..._todasInscricoes[idx], status: "presente" };
      _renderCredStats(eventoId);
      eveBuscarCredenciamento();
    } catch (e) { _T("Erro", e.message); }
  };

  /* ── Lista de Presença ──────────────────────────────── */

  async function _carregarPresencaTab() {
    try {
      await Promise.all([_carregarEventos(), _carregarTodasInscricoes()]);
      _injectNav("eve-presenca");
      _populateEventoSelects();
    } catch (e) { _T("Erro", e.message); }
  }

  window.eveCarregarPresenca = function () {
    const eventoId = document.getElementById("eve-pres-evento")?.value || "";
    const el = document.getElementById("eve-presenca-lista");
    if (!el) return;
    if (!eventoId) {
      el.innerHTML = `<div style="padding:28px;text-align:center;color:var(--tx3)">Selecione um evento.</div>`;
      return;
    }
    const inscrs = _todasInscricoes.filter(i => i.evento_id === eventoId)
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    if (!inscrs.length) {
      el.innerHTML = `<div style="padding:28px;text-align:center;color:var(--tx3)">Nenhum inscrito para este evento.</div>`;
      return;
    }
    const evt = _eventos.find(e => e.id === eventoId);
    el.innerHTML = `
      <div id="eve-presenca-print" style="padding:16px">
        <div style="font-size:10px;color:var(--tx3);margin-bottom:12px;text-align:center">${_eh(evt?.titulo || "")} · ${_fmtD(evt?.data_inicio)} · ${inscrs.length} inscritos</div>
        <table class="tbl" style="width:100%">
          <thead><tr>
            <th style="width:30px">#</th>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Contato</th>
            <th>Status</th>
            <th style="width:80px;text-align:center">Assinatura</th>
          </tr></thead>
          <tbody>${inscrs.map((i, n) => {
            const tipoLabels = { membro: "Membro", nao_membro: "Não membro", visitante: "Visitante", crianca: "Criança", adolescente: "Adolescente" };
            return `<tr>
              <td style="padding:9px 8px;font-size:11px;color:var(--tx3)">${n + 1}</td>
              <td style="padding:9px 8px;font-size:12.5px;font-weight:600;color:var(--tx1)">${_eh(i.nome)}</td>
              <td style="padding:9px 8px;font-size:11px;color:var(--tx2)">${_eh(tipoLabels[i.tipo] || i.tipo)}</td>
              <td style="padding:9px 8px;font-size:11px;color:var(--tx3)">${_eh(i.email || i.telefone || "—")}</td>
              <td style="padding:9px 8px">${_pillInscr(i.status)}</td>
              <td style="padding:9px 8px;border-bottom:1px solid var(--bd2)"></td>
            </tr>`;
          }).join("")}</tbody>
        </table>
      </div>`;
  };

  window.eveImprimirPresenca = function () {
    window.print();
  };

  /* ── Inscrições globais ─────────────────────────────── */

  async function _carregarInscricoesTab() {
    try {
      await Promise.all([_carregarEventos(), _carregarTodasInscricoes()]);
      _injectNav("eve-inscricoes");
      _populateEventoSelects();
      eveFiltrarInscricoes();
    } catch (e) { _T("Erro", e.message); }
  }

  window.eveFiltrarInscricoes = function () {
    const q       = document.getElementById("eve-gi-busca")?.value?.trim().toLowerCase() || "";
    const evtFil  = document.getElementById("eve-gi-evento")?.value  || "";
    const stFil   = document.getElementById("eve-gi-status")?.value  || "";
    const el = document.getElementById("eve-gi-lista");
    if (!el) return;

    let rows = [..._todasInscricoes];
    if (q)     rows = rows.filter(i => (i.nome || "").toLowerCase().includes(q) || (i.email || "").toLowerCase().includes(q));
    if (evtFil) rows = rows.filter(i => i.evento_id === evtFil);
    if (stFil)  rows = rows.filter(i => i.status === stFil);

    if (!rows.length) {
      el.innerHTML = `<div style="padding:28px;text-align:center;color:var(--tx3)">Nenhuma inscrição encontrada.</div>`;
      return;
    }

    const evtMap = Object.fromEntries(_eventos.map(e => [e.id, e.titulo]));
    el.innerHTML = `
      <table class="tbl" style="width:100%">
        <thead><tr>
          <th>Nome</th>
          <th>Evento</th>
          <th>Tipo</th>
          <th>Status</th>
          <th>Inscrito em</th>
        </tr></thead>
        <tbody>${rows.map(i => {
          const tipoLabels = { membro: "Membro", nao_membro: "Não membro", visitante: "Visitante", crianca: "Criança", adolescente: "Adolescente" };
          return `<tr style="cursor:pointer" onclick="eveAbrirDetalhe('${_ea(i.evento_id)}')">
            <td style="padding:10px 8px;font-size:12.5px;font-weight:600;color:var(--tx1)">${_eh(i.nome)}</td>
            <td style="padding:10px 8px;font-size:12px;color:var(--tx2)">${_eh(evtMap[i.evento_id] || "—")}</td>
            <td style="padding:10px 8px;font-size:11.5px;color:var(--tx3)">${_eh(tipoLabels[i.tipo] || i.tipo)}</td>
            <td style="padding:10px 8px">${_pillInscr(i.status)}</td>
            <td style="padding:10px 8px;font-size:11px;color:var(--tx3)">${_fmtD(i.criado_em)}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>`;
  };

  window.eveLimparFiltrosInscricoes = function () {
    ["eve-gi-busca","eve-gi-evento","eve-gi-status"].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = "";
    });
    eveFiltrarInscricoes();
  };

  /* ── Relatórios ─────────────────────────────────────── */

  async function _carregarRelatoriosTab() {
    try {
      await Promise.all([_carregarEventos(), _carregarTodasInscricoes()]);
      _injectNav("eve-rel");
      _populateEventoSelects();
    } catch (e) { _T("Erro", e.message); }
  }

  window.eveCarregarRelatorio = function () {
    const eventoId = document.getElementById("eve-rel-evento")?.value || "";
    const el = document.getElementById("eve-rel-content");
    if (!el) return;
    if (!eventoId) {
      el.innerHTML = `<div style="padding:28px;text-align:center;color:var(--tx3)">Selecione um evento.</div>`;
      return;
    }
    const evt = _eventos.find(e => e.id === eventoId);
    if (!evt) return;
    const inscrs = _todasInscricoes.filter(i => i.evento_id === eventoId);
    const presentes   = inscrs.filter(i => i.status === "presente").length;
    const confirmadas = inscrs.filter(i => i.status === "confirmada").length;
    const canceladas  = inscrs.filter(i => i.status === "cancelada").length;
    const ausentes    = inscrs.filter(i => i.status === "ausente").length;
    const totalPago   = inscrs.filter(i => i.pago).reduce((s, i) => s + (Number(i.valor_pago) || 0), 0);
    const totalEsp    = inscrs.reduce((s, i) => s + (Number(i.valor_cobrado) || 0), 0);
    const tipoCount   = {};
    for (const i of inscrs) tipoCount[i.tipo] = (tipoCount[i.tipo] || 0) + 1;

    el.innerHTML = `
      <div class="ct" style="gap:12px">
        <div class="card">
          <div class="ctit">Resumo — ${_eh(evt.titulo)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:14px">
            <div style="flex:1;min-width:100px;text-align:center"><div style="font-size:26px;font-weight:800;color:var(--sky)">${inscrs.length}</div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase">Total Inscrições</div></div>
            <div style="flex:1;min-width:100px;text-align:center"><div style="font-size:26px;font-weight:800;color:var(--gr)">${presentes}</div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase">Presentes</div></div>
            <div style="flex:1;min-width:100px;text-align:center"><div style="font-size:26px;font-weight:800;color:var(--blue)">${confirmadas}</div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase">Confirmados</div></div>
            <div style="flex:1;min-width:100px;text-align:center"><div style="font-size:26px;font-weight:800;color:var(--tx3)">${canceladas + ausentes}</div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase">Cancelados/Ausentes</div></div>
          </div>
          ${inscrs.length ? `<div style="margin-top:12px;background:var(--bg-surface);border-radius:8px;overflow:hidden;height:10px">
            <div style="height:100%;width:${Math.round(presentes / inscrs.length * 100)}%;background:var(--gr);transition:width .4s"></div>
          </div>
          <div style="font-size:10.5px;color:var(--tx3);margin-top:4px">${Math.round(presentes / inscrs.length * 100)}% de presença confirmada</div>` : ""}
        </div>
        ${!evt.gratuito ? `
        <div class="card">
          <div class="ctit">Financeiro</div>
          <div style="display:flex;flex-wrap:wrap;gap:14px">
            <div style="flex:1;min-width:100px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--gr)">${_fmtMoeda(totalPago)}</div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase">Recebido</div></div>
            <div style="flex:1;min-width:100px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--tx1)">${_fmtMoeda(totalEsp)}</div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase">Esperado</div></div>
            <div style="flex:1;min-width:100px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--amber)">${_fmtMoeda(totalEsp - totalPago)}</div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase">Pendente</div></div>
          </div>
        </div>` : ""}
        <div class="card">
          <div class="ctit">Por Tipo de Inscrito</div>
          ${Object.entries(tipoCount).map(([tipo, count]) => {
            const tipoLabels = { membro: "Membro", nao_membro: "Não membro", visitante: "Visitante", crianca: "Criança", adolescente: "Adolescente" };
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 4px;border-bottom:1px solid var(--bd1)">
              <span style="font-size:12px;color:var(--tx2)">${_eh(tipoLabels[tipo] || tipo)}</span>
              <span style="font-size:13px;font-weight:700;color:var(--sky)">${count}</span>
            </div>`;
          }).join("")}
        </div>
      </div>`;
  };

  /* ── Config ─────────────────────────────────────────── */

  function _carregarConfigTab() {
    _injectNav("eve-config");
  }

  /* ── Demandas ───────────────────────────────────────── */

  function _carregarDemandasTab() {
    _injectNav("eve-demandas");
    if (typeof demFiltrar === "function") demFiltrar("eve-demandas-content", { area: "Eventos" });
  }

  /* ── WhatsApp ───────────────────────────────────────── */

  function _carregarWhatsappTab() {
    _injectNav("eve-whatsapp");
    if (typeof WA_TAB !== "undefined") WA_TAB.load("EVENTOS");
  }

  /* ── Populate selects ───────────────────────────────── */

  function _populateEventoSelects() {
    const selIds = ["eve-pag-evento","eve-cred-evento","eve-pres-evento","eve-rel-evento","eve-gi-evento"];
    const eventosAtivos = _eventos.filter(e => !["cancelado","rascunho"].includes(e.status));
    for (const sid of selIds) {
      const sel = document.getElementById(sid);
      if (!sel) continue;
      const prev = sel.value;
      const optAll = sel.options[0]?.textContent || "";
      sel.innerHTML = `<option value="">${optAll}</option>` +
        eventosAtivos.map(e => `<option value="${_ea(e.id)}"${e.id === prev ? " selected" : ""}>${_eh(e.titulo)} · ${_fmtD(e.data_inicio)}</option>`).join("");
    }
  }

  /* ── Filtros lista de eventos ───────────────────────── */

  window.eveFiltrar = function () {
    _fBusca  = document.getElementById("eve-f-busca")?.value?.trim().toLowerCase() || "";
    _fStatus = document.getElementById("eve-f-status")?.value || "";
    _fTipo   = document.getElementById("eve-f-tipo")?.value   || "";
    _renderLista();
  };

  window.eveLimparFiltros = function () {
    ["eve-f-busca","eve-f-status","eve-f-tipo"].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = "";
    });
    _fBusca = _fStatus = _fTipo = "";
    _renderLista();
  };

  window.eveGoFiltro = function (status) {
    _fStatus = status;
    go("eve-todos").then(() => {
      const sel = document.getElementById("eve-f-status");
      if (sel) { sel.value = status; }
      _renderLista();
    }).catch(() => {});
  };

  window.eveRecarregar = async function () {
    try {
      await _recarregarTudo();
      _T("Atualizado!");
    } catch (e) { _T("Erro", e.message); }
  };

  async function _recarregarTudo() {
    await Promise.all([_carregarEventos(), _carregarTodasInscricoes()]);
    _renderLista();
    _renderKpis();
    _renderDashProximos();
    _renderDashStatus();
    _populateEventoSelects();
  }

  /* ── Sincronização com a Agenda ─────────────────────── */

  async function _sincronizarAgenda(evt) {
    if (evt.status === "rascunho") return;

    const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                   "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const DIAS  = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira",
                   "Quinta-feira","Sexta-feira","Sábado"];
    const dt = new Date((evt.data_inicio || "") + "T12:00:00");
    const mes       = MESES[dt.getMonth()] || "";
    const diaSemana = DIAS[dt.getDay()] || "";

    const agBase = {
      titulo:      evt.titulo,
      descricao:   evt.descricao || null,
      data:        evt.data_inicio,
      hora_inicio: evt.hora_inicio ? String(evt.hora_inicio).slice(0, 5) : null,
      hora_fim:    evt.hora_fim    ? String(evt.hora_fim).slice(0, 5)    : null,
      espaco:      evt.local_nome  || null,
      organizador: evt.ministerio_organizador || evt.criado_por_nome || null,
      observacao:  evt.observacoes || null,
      mes,
      dia_semana:  diaSemana,
      recorrencia: "Único",
      origem:      "evento",
      evento_id:   evt.id,
    };

    if (evt.status === "cancelado") {
      if (evt.agenda_id) {
        await _fetch(`${_api()}/rest/v1/agenda?id=eq.${evt.agenda_id}`, {
          method: "PATCH",
          headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
          body: JSON.stringify({ status: "cancelado" }),
        });
      }
      return;
    }

    if (evt.agenda_id) {
      let statusAtual = "pendente";
      try {
        const ag = await _fetch(`${_api()}/rest/v1/agenda?id=eq.${evt.agenda_id}&select=status&limit=1`);
        statusAtual = (Array.isArray(ag) ? ag[0]?.status : ag?.status) || "pendente";
      } catch (_) {}

      const resetAprov = statusAtual === "confirmado"
        ? { status: "pendente", aprovado_por_nome: null, aprovado_em: null, motivo_rejeicao: null }
        : {};

      await _fetch(`${_api()}/rest/v1/agenda?id=eq.${evt.agenda_id}`, {
        method: "PATCH",
        headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
        body: JSON.stringify({ ...agBase, ...resetAprov }),
      });

      if (statusAtual === "confirmado") {
        _T("Evento reenviado para aprovação", "Alterações detectadas — aguarda nova aprovação da Agenda.");
      }
    } else {
      const res = await _fetch(`${_api()}/rest/v1/agenda`, {
        method: "POST",
        headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=representation" }),
        body: JSON.stringify({ ...agBase, status: "pendente" }),
      });
      const novaAg = Array.isArray(res) ? res[0] : res;
      if (novaAg?.id) {
        await _fetch(`${_api()}/rest/v1/eventos?id=eq.${evt.id}`, {
          method: "PATCH",
          headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
          body: JSON.stringify({ agenda_id: novaAg.id }),
        });
        const idx = _eventos.findIndex(e => e.id === evt.id);
        if (idx >= 0) _eventos[idx] = { ..._eventos[idx], agenda_id: novaAg.id };
        _T("Enviado para Agenda!", "Aguardando aprovação para aparecer publicamente.");
      }
    }
  }

  /* ── Autoload ───────────────────────────────────────── */

  VIEW_AUTOLOAD["eve-dash"]          = { fn: () => _carregarDash() };
  VIEW_AUTOLOAD["eve-todos"]         = { fn: () => _carregarLista() };
  VIEW_AUTOLOAD["eve-inscricoes"]    = { fn: () => _carregarInscricoesTab() };
  VIEW_AUTOLOAD["eve-pagamentos"]    = { fn: () => _carregarPagamentosTab() };
  VIEW_AUTOLOAD["eve-credenciamento"]= { fn: () => _carregarCredenciamentoTab() };
  VIEW_AUTOLOAD["eve-presenca"]      = { fn: () => _carregarPresencaTab() };
  VIEW_AUTOLOAD["eve-relatorios"]    = { fn: () => _carregarRelatoriosTab() };
  VIEW_AUTOLOAD["eve-config"]        = { fn: () => _carregarConfigTab() };
  VIEW_AUTOLOAD["eve-demandas"]      = { fn: () => _carregarDemandasTab() };
  VIEW_AUTOLOAD["eve-whatsapp"]      = { fn: () => _carregarWhatsappTab() };

})();
