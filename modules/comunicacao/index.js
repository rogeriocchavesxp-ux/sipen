/* ═══════════════════════════════════════════════════════
   SIPEN — Módulo Comunicação
   Central de solicitações de arte, campanhas e transmissões
   Substitui o Google Forms externo
═══════════════════════════════════════════════════════ */
(function () {

  /* ── Constantes ─────────────────────────────────────── */

  const MINISTERIOS = [
    "UPA (SOS)", "UMP (Movimento)", "SAF", "UPH", "GAM",
    "Casais (Lar Cristão)", "Coral Jovem", "Coral João Calvino", "Música", "Outro",
  ];

  const AREAS_COM = [
    "Transmissão ao vivo", "Mídias", "Iluminação", "Projeção", "Sonorização",
  ];

  const FORMATOS = [
    "1:1 WhatsApp", "16:9 avisos", "Story Instagram",
    "Banner", "Faixa", "Panfleto", "Outro",
  ];

  const PUBLICO = [
    "Crianças", "Adolescentes", "Jovens", "Mulheres", "Homens", "Casais", "Outro",
  ];

  const STATUS_CFG = {
    "Recebida":             { cls: "pn",  cor: "var(--blue)"   },
    "Em análise":           { cls: "po",  cor: "var(--amber)"  },
    "Em produção":          { cls: "pp",  cor: "var(--violet)" },
    "Aguardando aprovação": { cls: "pv",  cor: "var(--gold)"   },
    "Concluída":            { cls: "pd",  cor: "var(--gr)"     },
    "Cancelada":            { cls: "pz",  cor: "var(--tx3)"    },
  };

  /* ── Estado ─────────────────────────────────────────── */

  let _cache   = [];
  let _ativo   = null;
  let _fBusca  = "";
  let _fStatus = "";
  let _fMin    = "";

  /* ── Utilidades ─────────────────────────────────────── */

  function _eh(v) {
    if (typeof escapeHtml === "function") return escapeHtml(v);
    return String(v ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  }
  function _ea(v) {
    if (typeof escapeHtmlAttr === "function") return escapeHtmlAttr(v);
    return _eh(v).replace(/'/g, "&#39;");
  }
  function _T(t, s) { if (typeof T === "function") T(t, s || ""); }
  function _api()   { return typeof apiBaseUrl === "function" ? apiBaseUrl() : ""; }
  function _hdrs(extra) { return typeof apiHeaders === "function" ? apiHeaders(extra || {}) : {}; }
  function _user()  { return typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL : null; }
  function _userId(){ return _user()?.id || null; }
  function _userName() { return _user()?.nome || _user()?.email || "Sistema"; }

  function _fmtD(d) {
    if (!d) return "—";
    const [y, m, day] = String(d).slice(0, 10).split("-");
    return (day && m && y) ? `${day}/${m}/${y}` : _eh(d);
  }

  /* ── Permissões ─────────────────────────────────────── */

  function _isAdmin() {
    const u = _user();
    if (!u) return false;
    if (u.perfil === "ADMINISTRADOR_GERAL") return true;
    const perms = typeof permissoesUsuario !== "undefined" ? permissoesUsuario : {};
    const nivel = perms["COMUNICACAO"] || "SEM_ACESSO";
    return nivel === "COMPLETO" || nivel === "EDICAO";
  }

  function _podeAlterar(sol) {
    if (_isAdmin()) return true;
    return sol?.criado_por === _userId();
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

  /* ── Status pill ────────────────────────────────────── */

  function _pill(status) {
    const cfg = STATUS_CFG[status] || { cls: "pz" };
    return `<span class="pill ${cfg.cls}">${_eh(status || "—")}</span>`;
  }

  /* ── Carregar dados ─────────────────────────────────── */

  async function _carregar() {
    try {
      const url = `${_api()}/rest/v1/com_solicitacoes_arte?select=*&order=criado_em.desc&limit=500`;
      _cache = await _fetch(url) || [];
      _renderLista();
      _renderDash();
    } catch (e) {
      _T("Erro ao carregar", e.message);
    }
  }

  /* ── Filtros ────────────────────────────────────────── */

  function _filtrados() {
    let rows = [..._cache];
    if (_fBusca) {
      const q = _fBusca.toLowerCase();
      rows = rows.filter(r =>
        (r.descricao_demanda || "").toLowerCase().includes(q) ||
        (r.ministerio_solicitante || "").toLowerCase().includes(q) ||
        (r.responsavel_nome || "").toLowerCase().includes(q) ||
        (r.local_evento || "").toLowerCase().includes(q)
      );
    }
    if (_fStatus) rows = rows.filter(r => r.status === _fStatus);
    if (_fMin)    rows = rows.filter(r => r.ministerio_solicitante === _fMin);
    return rows;
  }

  /* ── Render lista ───────────────────────────────────── */

  function _renderLista() {
    const el = document.getElementById("com-sol-lista");
    if (!el) return;
    const rows = _filtrados();
    if (!rows.length) {
      el.innerHTML = `<div style="padding:32px;text-align:center;color:var(--tx3);font-size:13px">Nenhuma solicitação encontrada.</div>`;
      return;
    }
    el.innerHTML = `
      <table class="tbl" style="width:100%">
        <thead><tr>
          <th style="width:8px;padding:10px 8px"></th>
          <th>Demanda</th>
          <th>Ministério</th>
          <th>Responsável</th>
          <th>Evento</th>
          <th>Prazo</th>
          <th>Status</th>
          <th>Criado</th>
        </tr></thead>
        <tbody>${rows.map(_trLinha).join("")}</tbody>
      </table>`;
  }

  function _trLinha(r) {
    const hoje = new Date().toISOString().slice(0, 10);
    const prazoVencido = r.prazo_entrega && r.prazo_entrega < hoje && !["Concluída","Cancelada"].includes(r.status);
    const desc = _eh(r.descricao_demanda || "—");
    const descTrunc = desc.length > 80 ? desc.slice(0, 80) + "…" : desc;
    const eventoTxt = r.data_evento ? _fmtD(r.data_evento) + (r.horario_evento ? " " + r.horario_evento.slice(0,5) : "") : "—";
    return `<tr style="cursor:pointer" onclick="comAbrirDetalhe('${_ea(r.id)}')">
      <td style="padding:10px 8px">
        <div style="width:7px;height:7px;border-radius:50%;background:${STATUS_CFG[r.status]?.cor || "var(--tx4)"};margin:auto"></div>
      </td>
      <td style="padding:10px 8px;max-width:280px">
        <div style="font-size:12.5px;font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${descTrunc}</div>
        ${(r.areas_comunicacao || []).length
          ? `<div style="font-size:10px;color:var(--tx3);margin-top:2px">${(r.areas_comunicacao).slice(0,3).map(_eh).join(" · ")}</div>`
          : ""}
      </td>
      <td style="padding:10px 8px;font-size:12px;color:var(--tx2);white-space:nowrap">${_eh(r.ministerio_solicitante || "—")}</td>
      <td style="padding:10px 8px;font-size:12px;color:var(--tx2)">${_eh(r.responsavel_nome || "—")}</td>
      <td style="padding:10px 8px;font-size:11px;color:var(--tx3);white-space:nowrap">${eventoTxt}</td>
      <td style="padding:10px 8px;font-size:11px;white-space:nowrap;color:${prazoVencido ? "var(--rose)" : "var(--tx3)"};font-weight:${prazoVencido ? "700" : "400"}">${_fmtD(r.prazo_entrega)}</td>
      <td style="padding:10px 8px">${_pill(r.status)}</td>
      <td style="padding:10px 8px;font-size:11px;color:var(--tx3);white-space:nowrap">${_fmtD(r.criado_em)}</td>
    </tr>`;
  }

  /* ── Dashboard ──────────────────────────────────────── */

  function _renderDash() {
    const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    s("com-kpi-total", _cache.length);
    s("com-kpi-receb", _cache.filter(r => r.status === "Recebida").length);
    s("com-kpi-prod",  _cache.filter(r => r.status === "Em produção").length);
    s("com-kpi-conc",  _cache.filter(r => r.status === "Concluída").length);
    s("com-kpi-pend",  _cache.filter(r => !["Concluída","Cancelada"].includes(r.status)).length);

    // Recentes
    const elR = document.getElementById("com-dash-recentes");
    if (elR) {
      const recentes = _cache.slice(0, 6);
      if (!recentes.length) {
        elR.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:8px">Nenhuma solicitação ainda.</div>`;
      } else {
        elR.innerHTML = recentes.map(r => `
          <div onclick="comAbrirDetalhe('${_ea(r.id)}')" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid var(--bd1);transition:background .12s">
            <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${STATUS_CFG[r.status]?.cor || "var(--tx4)"}"></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12.5px;font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_eh((r.descricao_demanda || "—").slice(0, 60))}</div>
              <div style="font-size:10.5px;color:var(--tx3)">${_eh(r.ministerio_solicitante || "—")} · ${_fmtD(r.criado_em)}</div>
            </div>
            ${_pill(r.status)}
          </div>`).join("");
      }
    }

    // Por status
    const elS = document.getElementById("com-dash-status");
    if (elS) {
      const counts = {};
      for (const k of Object.keys(STATUS_CFG)) counts[k] = 0;
      for (const r of _cache) counts[r.status] = (counts[r.status] || 0) + 1;
      elS.innerHTML = Object.entries(STATUS_CFG).map(([status, cfg]) => `
        <div onclick="comFiltrarStatus('${_ea(status)}')" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:9px 4px;border-bottom:1px solid var(--bd1)">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:7px;height:7px;border-radius:50%;background:${cfg.cor}"></div>
            <span style="font-size:12px;color:var(--tx2)">${_eh(status)}</span>
          </div>
          <span style="font-size:13px;font-weight:700;color:${cfg.cor}">${counts[status] || 0}</span>
        </div>`).join("");
    }
  }

  /* ── Abrir detalhe ──────────────────────────────────── */

  window.comAbrirDetalhe = async function (id) {
    _ativo = _cache.find(r => r.id === id) || null;
    if (!_ativo) {
      try {
        const data = await _fetch(`${_api()}/rest/v1/com_solicitacoes_arte?id=eq.${id}&select=*&limit=1`);
        _ativo = Array.isArray(data) ? data[0] : data;
      } catch (e) { _T("Erro ao carregar", e.message); return; }
    }
    if (!_ativo) { _T("Não encontrado", "Solicitação não encontrada."); return; }
    await go("com-detalhe");
    _renderDetalhe(_ativo);
  };

  /* ── Render detalhe ─────────────────────────────────── */

  function _renderDetalhe(sol) {
    const el = document.getElementById("com-detalhe-content");
    if (!el) return;

    const podeAlt = _podeAlterar(sol);
    const isAdmin = _isAdmin();

    const lbl = t => `<div style="font-size:9.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">${t}</div>`;
    const val = (t, style) => `<div style="font-size:13px;color:var(--tx1);${style || ""}">${_eh(t || "—")}</div>`;
    const field = (l, v, style) => `<div style="flex:1;min-width:160px">${lbl(l)}${val(v, style)}</div>`;
    const tags = arr => (arr || []).filter(Boolean).map(t =>
      `<span style="display:inline-block;padding:3px 9px;border-radius:12px;font-size:10.5px;font-weight:600;background:rgba(139,111,212,0.12);color:var(--violet);margin:2px 2px 2px 0;border:1px solid rgba(139,111,212,0.2)">${_eh(t)}</span>`
    ).join("");

    el.innerHTML = `
      <!-- Cabeçalho da solicitação -->
      <div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;padding:20px 24px;margin-bottom:12px">
        <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:240px">
            <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px">Solicitação · ${_eh(sol.id.slice(0, 8).toUpperCase())}</div>
            <div style="font-size:17px;font-weight:700;color:var(--tx1);line-height:1.4;margin-bottom:10px">${_eh(sol.descricao_demanda || "—")}</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              ${_pill(sol.status)}
              <span style="font-size:11px;color:var(--tx3)">${_eh(sol.ministerio_solicitante || "—")}</span>
              <span style="font-size:11px;color:var(--tx3)">· ${_fmtD(sol.criado_em)}</span>
              ${sol.criado_por_nome ? `<span style="font-size:11px;color:var(--tx3)">· por ${_eh(sol.criado_por_nome)}</span>` : ""}
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-self:flex-start">
            ${isAdmin ? `
              <select onchange="comAlterarStatus('${_ea(sol.id)}',this.value)" style="padding:7px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px;cursor:pointer">
                ${Object.keys(STATUS_CFG).map(s => `<option value="${_ea(s)}"${s === sol.status ? " selected" : ""}>${_eh(s)}</option>`).join("")}
              </select>` : ""}
            ${podeAlt ? `<button onclick="comAbrirEditar('${_ea(sol.id)}')" style="padding:7px 14px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--tx1);font-size:12px;cursor:pointer;font-weight:600">Editar</button>` : ""}
            <button onclick="go('com-solicitacoes')" style="padding:7px 14px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12px;cursor:pointer">← Voltar</button>
          </div>
        </div>
      </div>

      <div class="ct" style="gap:12px">
        <!-- Solicitante -->
        <div class="card">
          <div class="ctit">Solicitante</div>
          <div style="display:flex;flex-wrap:wrap;gap:16px">
            ${field("Ministério", sol.ministerio_solicitante)}
            ${field("Responsável", sol.responsavel_nome)}
            ${sol.telefone_whatsapp ? field("WhatsApp", sol.telefone_whatsapp) : ""}
          </div>
        </div>

        <!-- Evento -->
        <div class="card">
          <div class="ctit">Evento / Culto</div>
          <div style="display:flex;flex-wrap:wrap;gap:16px">
            ${field("Data", _fmtD(sol.data_evento))}
            ${field("Horário", sol.horario_evento ? sol.horario_evento.slice(0, 5) : "—")}
            ${field("Local", sol.local_evento)}
            ${field("Tipo de evento", sol.evento_gratuito ? "Gratuito" : "Pago")}
            ${!sol.evento_gratuito && sol.evento_valor ? field("Valor", `R$ ${Number(sol.evento_valor).toLocaleString("pt-BR", {minimumFractionDigits:2})}`) : ""}
            ${!sol.evento_gratuito && sol.evento_parcelamento ? field("Parcelamento", sol.evento_parcelamento) : ""}
            ${!sol.evento_gratuito && sol.evento_forma_pagamento ? field("Forma de Pagamento", sol.evento_forma_pagamento) : ""}
            ${!sol.evento_gratuito && sol.evento_link_pagamento ? `<div style="flex:1;min-width:160px">${lbl("Link de Pagamento")}<a href="${_ea(sol.evento_link_pagamento)}" target="_blank" rel="noopener" style="font-size:12.5px;color:var(--violet);word-break:break-all">${_eh(sol.evento_link_pagamento)}</a></div>` : ""}
          </div>
          ${(sol.publico_alvo || []).length ? `<div style="margin-top:12px">${lbl("Público-alvo")}<div style="margin-top:4px">${tags(sol.publico_alvo)}</div></div>` : ""}
          ${sol.necessita_inscricao ? `<div style="margin-top:12px">${lbl("Inscrição")}${val("Necessária")}${sol.link_inscricao ? `<a href="${_ea(sol.link_inscricao)}" target="_blank" rel="noopener" style="display:block;font-size:12px;color:var(--violet);margin-top:2px">${_eh(sol.link_inscricao)}</a>` : ""}</div>` : ""}
        </div>

        <!-- Comunicação -->
        <div class="card">
          <div class="ctit">Áreas da Comunicação</div>
          ${(sol.areas_comunicacao || []).length ? `<div style="margin-bottom:10px">${tags(sol.areas_comunicacao)}</div>` : `<div style="color:var(--tx3);font-size:12px;margin-bottom:10px">Nenhuma área selecionada.</div>`}
          ${sol.justificativa_areas ? `${lbl("Justificativa")}${val(sol.justificativa_areas, "font-size:12px;color:var(--tx2);white-space:pre-wrap;margin-top:2px")}` : ""}
        </div>

        <!-- Formatos e prazo -->
        <div class="card">
          <div class="ctit">Formatos e Prazo</div>
          ${(sol.formatos_divulgacao || []).length ? `<div style="margin-bottom:12px">${tags(sol.formatos_divulgacao)}</div>` : `<div style="color:var(--tx3);font-size:12px;margin-bottom:12px">Nenhum formato selecionado.</div>`}
          <div style="display:flex;flex-wrap:wrap;gap:16px">
            ${field("Prazo de Entrega", _fmtD(sol.prazo_entrega))}
          </div>
          ${sol.informacoes_adicionais ? `<div style="margin-top:12px">${lbl("Informações Adicionais")}${val(sol.informacoes_adicionais, "font-size:12px;color:var(--tx2);white-space:pre-wrap;margin-top:2px")}</div>` : ""}
        </div>

        ${isAdmin ? `
        <!-- Responsável interno -->
        <div class="card">
          <div class="ctit">Responsável Interno</div>
          <div style="margin-bottom:12px">${field("Atribuído a", sol.responsavel_interno_nome || "Não atribuído")}</div>
          <input id="com-resp-nome" type="text" placeholder="Nome do responsável..." value="${_ea(sol.responsavel_interno_nome || "")}" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input);color:var(--tx1);font-size:12.5px;box-sizing:border-box;outline:none">
          <button onclick="comAtribuirResponsavel('${_ea(sol.id)}')" style="margin-top:8px;padding:7px 14px;border-radius:7px;border:none;background:var(--violet);color:#fff;font-size:12px;font-weight:600;cursor:pointer">Atribuir</button>
        </div>

        <!-- Observações internas -->
        <div class="card">
          <div class="ctit">Observações Internas</div>
          <textarea id="com-obs-texto" rows="4" placeholder="Observações visíveis apenas para a equipe de Comunicação..." style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input);color:var(--tx1);font-size:12.5px;font-family:inherit;resize:vertical;box-sizing:border-box;outline:none">${_ea(sol.observacoes_internas || "")}</textarea>
          <button onclick="comSalvarObsInternas('${_ea(sol.id)}')" style="margin-top:6px;padding:7px 14px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx1);font-size:12px;cursor:pointer">Salvar</button>
        </div>
        ` : ""}

        <!-- Histórico -->
        <div class="card" style="grid-column:1 / -1">
          <div class="ctit">Histórico e Comentários <span class="cact" onclick="_comRecarregarAndamentos('${_ea(sol.id)}')">↻</span></div>
          <div id="com-and-lista" style="margin-bottom:12px"><div style="color:var(--tx3);font-size:12px">Carregando...</div></div>
          ${podeAlt || isAdmin ? `
            <div style="display:flex;gap:8px;margin-top:4px">
              <textarea id="com-and-texto" placeholder="Comentário ou atualização..." rows="2" style="flex:1;resize:vertical;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input);color:var(--tx1);font-size:12.5px;font-family:inherit;outline:none"></textarea>
              <button onclick="comSalvarAndamento('${_ea(sol.id)}')" style="padding:8px 16px;background:var(--violet);color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;align-self:flex-end">Enviar</button>
            </div>` : ""}
        </div>
      </div>`;

    _carregarAndamentos(sol.id);
  }

  /* ── Andamentos ─────────────────────────────────────── */

  window._comRecarregarAndamentos = function (solId) {
    _carregarAndamentos(solId);
  };

  async function _carregarAndamentos(solId) {
    const el = document.getElementById("com-and-lista");
    if (!el) return;
    try {
      const data = await _fetch(`${_api()}/rest/v1/com_andamentos?sol_id=eq.${solId}&select=*&order=criado_em.asc`);
      const rows = data || [];
      if (!rows.length) {
        el.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:4px 0">Nenhum comentário ainda.</div>`;
        return;
      }
      el.innerHTML = rows.map(a => `
        <div style="padding:10px 12px;border-radius:8px;background:${a.automatico ? "rgba(139,111,212,0.06)" : "var(--bg-surface)"};border:1px solid ${a.automatico ? "rgba(139,111,212,0.2)" : "var(--bd1)"};margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:10.5px;font-weight:700;color:${a.automatico ? "var(--violet)" : "var(--tx2)"}">${a.automatico ? "Sistema" : _eh(a.usuario_nome || "—")}</span>
            <span style="font-size:10px;color:var(--tx4)">${_fmtD(a.criado_em)}</span>
          </div>
          <div style="font-size:12.5px;color:var(--tx1);white-space:pre-wrap">${_eh(a.texto)}</div>
        </div>`).join("");
    } catch (e) {
      if (el) el.innerHTML = `<div style="color:var(--rose);font-size:12px">Erro: ${_eh(e.message)}</div>`;
    }
  }

  window.comSalvarAndamento = async function (solId) {
    const el = document.getElementById("com-and-texto");
    const txt = el?.value?.trim();
    if (!txt) { _T("Campo vazio", "Escreva um comentário."); return; }
    try {
      await _fetch(`${_api()}/rest/v1/com_andamentos`, {
        method: "POST",
        headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
        body: JSON.stringify({ sol_id: solId, texto: txt, usuario_id: _userId(), usuario_nome: _userName(), automatico: false }),
      });
      if (el) el.value = "";
      _carregarAndamentos(solId);
    } catch (e) { _T("Erro", e.message); }
  };

  /* ── Alterar status ─────────────────────────────────── */

  window.comAlterarStatus = async function (solId, novoStatus) {
    try {
      await _fetch(`${_api()}/rest/v1/com_solicitacoes_arte?id=eq.${solId}`, {
        method: "PATCH",
        headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
        body: JSON.stringify({ status: novoStatus, atualizado_em: new Date().toISOString() }),
      });
      await _fetch(`${_api()}/rest/v1/com_andamentos`, {
        method: "POST",
        headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
        body: JSON.stringify({ sol_id: solId, texto: `Status alterado para: ${novoStatus}.`, usuario_id: _userId(), usuario_nome: _userName(), automatico: true }),
      });
      _T("Status atualizado!", `→ ${novoStatus}`);
      const idx = _cache.findIndex(r => r.id === solId);
      if (idx >= 0) { _cache[idx] = { ..._cache[idx], status: novoStatus }; _ativo = _cache[idx]; }
      _renderLista(); _renderDash();
    } catch (e) { _T("Erro", e.message); }
  };

  /* ── Atribuir responsável ───────────────────────────── */

  window.comAtribuirResponsavel = async function (solId) {
    const nome = document.getElementById("com-resp-nome")?.value?.trim() || null;
    try {
      await _fetch(`${_api()}/rest/v1/com_solicitacoes_arte?id=eq.${solId}`, {
        method: "PATCH",
        headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
        body: JSON.stringify({ responsavel_interno_nome: nome, atualizado_em: new Date().toISOString() }),
      });
      _T("Responsável atribuído!", nome || "Removido.");
      const idx = _cache.findIndex(r => r.id === solId);
      if (idx >= 0) _cache[idx] = { ..._cache[idx], responsavel_interno_nome: nome };
    } catch (e) { _T("Erro", e.message); }
  };

  /* ── Salvar observações internas ────────────────────── */

  window.comSalvarObsInternas = async function (solId) {
    const obs = document.getElementById("com-obs-texto")?.value?.trim() || null;
    try {
      await _fetch(`${_api()}/rest/v1/com_solicitacoes_arte?id=eq.${solId}`, {
        method: "PATCH",
        headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
        body: JSON.stringify({ observacoes_internas: obs, atualizado_em: new Date().toISOString() }),
      });
      _T("Observações salvas!");
    } catch (e) { _T("Erro", e.message); }
  };

  /* ── Abrir formulário nova/editar ───────────────────── */

  window.comAbrirNova   = function ()  { comAbrirEditar(null); };
  window.comAbrirEditar = function (id) {
    const sol = id ? (_cache.find(r => r.id === id) || null) : null;
    _renderFormModal(sol);
  };

  /* ── Formulário (modal) ─────────────────────────────── */

  function _renderFormModal(sol) {
    const isEdit = !!sol;
    let el = document.getElementById("com-form-modal");
    if (!el) {
      el = document.createElement("div");
      el.id = "com-form-modal";
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
        <option value="" disabled${!defVal ? " selected" : ""}>Selecione...</option>
        ${opts.map(o => `<option value="${_ea(o)}"${o === defVal ? " selected" : ""}>${_eh(o)}</option>`).join("")}
      </select></div>`;

    const txta = (id, label, defVal, req, rows) =>
      `<div style="display:flex;flex-direction:column;gap:4px">${lbl(label, req)}
      <textarea id="${id}" rows="${rows || 3}" style="padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input);color:var(--tx1);font-size:12.5px;font-family:inherit;resize:vertical;outline:none;width:100%;box-sizing:border-box">${_ea(defVal || "")}</textarea></div>`;

    const chkGroup = (name, opts, vals) =>
      `<div style="display:flex;flex-wrap:wrap;gap:6px" id="com-fg-${name}">${
        opts.map(o => {
          const checked = (vals || []).includes(o);
          return `<label style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:20px;border:1px solid ${checked ? "rgba(139,111,212,.4)" : "var(--bd2)"};cursor:pointer;font-size:12px;background:${checked ? "rgba(139,111,212,.12)" : "var(--bg-surface)"};color:${checked ? "var(--violet)" : "var(--tx2)"}">
            <input type="checkbox" name="${name}" value="${_ea(o)}" ${checked ? "checked" : ""} style="accent-color:var(--violet)"> ${_eh(o)}
          </label>`;
        }).join("")
      }</div>`;

    const sec = (title) =>
      `<div style="font-size:10px;font-weight:700;color:var(--violet);text-transform:uppercase;letter-spacing:.1em;padding-bottom:6px;border-bottom:1px solid rgba(139,111,212,.2);margin-bottom:12px">${title}</div>`;

    const pagHidden = sol?.evento_gratuito === false ? "grid" : "none";
    const inscHidden = sol?.necessita_inscricao ? "block" : "none";

    el.innerHTML = `
      <div style="width:min(700px,100%);background:var(--bg-card);border:1px solid var(--bd2);border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.3)">
        <div style="padding:20px 24px;border-bottom:1px solid var(--bd2);display:flex;align-items:center;justify-content:space-between;background:var(--bg-surface)">
          <div>
            <div style="font-size:10px;font-weight:700;color:var(--violet);text-transform:uppercase;letter-spacing:.08em">Comunicação</div>
            <div style="font-size:16px;font-weight:700;color:var(--tx1)">${isEdit ? "Editar Solicitação" : "Nova Solicitação de Arte"}</div>
          </div>
          <button onclick="comFecharForm()" style="padding:6px 10px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx3);cursor:pointer;font-size:14px">✕</button>
        </div>

        <div style="padding:24px;display:flex;flex-direction:column;gap:20px;max-height:calc(100vh - 130px);overflow-y:auto">

          <!-- 1. Solicitante -->
          <div>
            ${sec("Identificação do Solicitante")}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              ${sel("com-f-min", "Ministério Solicitante", MINISTERIOS, sol?.ministerio_solicitante, true)}
              ${inp("com-f-resp", "Responsável pela Solicitação", 'type="text" placeholder="Nome completo"', sol?.responsavel_nome, true)}
              ${inp("com-f-tel", "WhatsApp de Contato", 'type="tel" placeholder="(11) 99999-9999"', sol?.telefone_whatsapp)}
            </div>
          </div>

          <!-- 2. Demanda -->
          <div>
            ${sec("Descrição da Demanda")}
            ${txta("com-f-desc", "Descreva o que precisa ser criado / produzido", sol?.descricao_demanda, true, 4)}
          </div>

          <!-- 3. Evento -->
          <div>
            ${sec("Evento / Culto")}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              ${inp("com-f-data", "Data do Evento", 'type="date"', sol?.data_evento)}
              ${inp("com-f-hora", "Horário", 'type="time"', sol?.horario_evento?.slice(0, 5))}
              <div style="grid-column:1 / -1">${inp("com-f-local", "Local / Ambiente", 'type="text" placeholder="Ex: Templo principal, Salão social..."', sol?.local_evento)}</div>
            </div>
            <div style="margin-top:12px">
              ${lbl("Público-alvo")}
              <div style="margin-top:8px">${chkGroup("publico", PUBLICO, sol?.publico_alvo)}</div>
            </div>
            <div style="margin-top:14px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
              ${lbl("Tipo de Evento")}
              <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--tx1);cursor:pointer"><input type="radio" name="com-f-tevento" value="gratuito" ${sol?.evento_gratuito !== false ? "checked" : ""} onchange="comToggleEvento(this.value)" style="accent-color:var(--violet)"> Gratuito</label>
              <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--tx1);cursor:pointer"><input type="radio" name="com-f-tevento" value="pago" ${sol?.evento_gratuito === false ? "checked" : ""} onchange="comToggleEvento(this.value)" style="accent-color:var(--violet)"> Pago</label>
            </div>
            <div id="com-f-pago-sec" style="display:${pagHidden};grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
              ${inp("com-f-valor", "Valor (R$)", 'type="number" min="0" step="0.01" placeholder="0,00"', sol?.evento_valor)}
              ${inp("com-f-parc", "Parcelamento", 'type="text" placeholder="Ex: Até 3x, À vista..."', sol?.evento_parcelamento)}
              ${inp("com-f-fpgto", "Formas de Pagamento", 'type="text" placeholder="PIX, Cartão, Dinheiro..."', sol?.evento_forma_pagamento)}
              ${inp("com-f-lpgto", "Link de Pagamento", 'type="url" placeholder="https://..."', sol?.evento_link_pagamento)}
            </div>
            <div style="margin-top:14px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
              ${lbl("Necessita Inscrição?")}
              <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--tx1);cursor:pointer"><input type="radio" name="com-f-inscr" value="sim" ${sol?.necessita_inscricao ? "checked" : ""} onchange="comToggleInscricao(this.value)" style="accent-color:var(--violet)"> Sim</label>
              <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--tx1);cursor:pointer"><input type="radio" name="com-f-inscr" value="nao" ${!sol?.necessita_inscricao ? "checked" : ""} onchange="comToggleInscricao(this.value)" style="accent-color:var(--violet)"> Não</label>
            </div>
            <div id="com-f-inscr-sec" style="display:${inscHidden};margin-top:8px">
              ${inp("com-f-linscr", "Link de Inscrição / Confirmação", 'type="url" placeholder="https://..."', sol?.link_inscricao)}
            </div>
          </div>

          <!-- 4. Áreas da Comunicação -->
          <div>
            ${sec("Áreas da Comunicação Necessárias")}
            ${chkGroup("areas", AREAS_COM, sol?.areas_comunicacao)}
            <div style="margin-top:12px">${txta("com-f-just", "Justificativa das áreas selecionadas", sol?.justificativa_areas, false, 2)}</div>
          </div>

          <!-- 5. Formatos -->
          <div>
            ${sec("Formatos da Divulgação")}
            ${chkGroup("formatos", FORMATOS, sol?.formatos_divulgacao)}
          </div>

          <!-- 6. Prazo e observações -->
          <div>
            ${sec("Prazo e Informações Adicionais")}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              ${inp("com-f-prazo", "Prazo de Entrega", 'type="date"', sol?.prazo_entrega)}
            </div>
            <div style="margin-top:12px">${txta("com-f-info", "Informações Adicionais", sol?.informacoes_adicionais, false, 3)}</div>
          </div>

        </div>

        <div style="padding:16px 24px;border-top:1px solid var(--bd2);display:flex;gap:10px;justify-content:flex-end;background:var(--bg-surface)">
          <button onclick="comFecharForm()" style="padding:9px 20px;border-radius:8px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:13px;cursor:pointer">Cancelar</button>
          <button onclick="comSalvar(${isEdit ? `'${_ea(sol.id)}'` : "null"})" style="padding:9px 24px;border-radius:8px;border:none;background:var(--violet);color:#fff;font-size:13px;font-weight:700;cursor:pointer">${isEdit ? "Salvar Alterações" : "Enviar Solicitação"}</button>
        </div>
      </div>`;

    el.style.display = "flex";
  }

  window.comFecharForm = function () {
    const el = document.getElementById("com-form-modal");
    if (el) el.style.display = "none";
  };

  window.comToggleEvento = function (val) {
    const s = document.getElementById("com-f-pago-sec");
    if (s) s.style.display = val === "pago" ? "grid" : "none";
  };

  window.comToggleInscricao = function (val) {
    const s = document.getElementById("com-f-inscr-sec");
    if (s) s.style.display = val === "sim" ? "block" : "none";
  };

  /* ── Salvar (criar / editar) ────────────────────────── */

  window.comSalvar = async function (editId) {
    const g  = id => document.getElementById(id)?.value?.trim() || null;
    const chk = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(e => e.value);
    const rad = name => document.querySelector(`input[name="${name}"]:checked`)?.value;

    const ministerio = g("com-f-min");
    const responsavel = g("com-f-resp");
    const descricao   = g("com-f-desc");

    if (!ministerio) { _T("Campo obrigatório", "Selecione o ministério solicitante."); return; }
    if (!responsavel) { _T("Campo obrigatório", "Informe o responsável pela solicitação."); return; }
    if (!descricao)   { _T("Campo obrigatório", "Descreva a demanda."); return; }

    const gratuito = rad("com-f-tevento") !== "pago";
    const inscricao = rad("com-f-inscr") === "sim";
    const valorRaw = g("com-f-valor");

    const payload = {
      ministerio_solicitante:  ministerio,
      responsavel_nome:        responsavel,
      telefone_whatsapp:       g("com-f-tel"),
      descricao_demanda:       descricao,
      data_evento:             g("com-f-data") || null,
      horario_evento:          g("com-f-hora") || null,
      local_evento:            g("com-f-local"),
      publico_alvo:            chk("publico"),
      evento_gratuito:         gratuito,
      evento_valor:            (!gratuito && valorRaw) ? parseFloat(valorRaw) : null,
      evento_parcelamento:     !gratuito ? g("com-f-parc") : null,
      evento_forma_pagamento:  !gratuito ? g("com-f-fpgto") : null,
      evento_link_pagamento:   !gratuito ? g("com-f-lpgto") : null,
      necessita_inscricao:     inscricao,
      link_inscricao:          inscricao ? g("com-f-linscr") : null,
      areas_comunicacao:       chk("areas"),
      justificativa_areas:     g("com-f-just"),
      formatos_divulgacao:     chk("formatos"),
      prazo_entrega:           g("com-f-prazo") || null,
      informacoes_adicionais:  g("com-f-info"),
      atualizado_em:           new Date().toISOString(),
    };

    const isNew = !editId || editId === "null";
    if (isNew) {
      payload.status         = "Recebida";
      payload.criado_por     = _userId();
      payload.criado_por_nome = _userName();
      payload.criado_em      = new Date().toISOString();
    }

    try {
      if (!isNew) {
        await _fetch(`${_api()}/rest/v1/com_solicitacoes_arte?id=eq.${editId}`, {
          method: "PATCH",
          headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
          body: JSON.stringify(payload),
        });
        _T("Solicitação atualizada!");
        await _carregar();
        comFecharForm();
        comAbrirDetalhe(editId);
      } else {
        const res = await _fetch(`${_api()}/rest/v1/com_solicitacoes_arte`, {
          method: "POST",
          headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=representation" }),
          body: JSON.stringify(payload),
        });
        const nova = Array.isArray(res) ? res[0] : res;
        if (nova?.id) {
          await _fetch(`${_api()}/rest/v1/com_andamentos`, {
            method: "POST",
            headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
            body: JSON.stringify({ sol_id: nova.id, texto: `Solicitação criada por ${_userName()}.`, usuario_id: _userId(), usuario_nome: _userName(), automatico: true }),
          });
        }
        _T("Solicitação enviada!", "A equipe de Comunicação foi notificada.");
        comFecharForm();
        await _carregar();
      }
    } catch (e) { _T("Erro ao salvar", e.message); }
  };

  /* ── Filtros públicos ───────────────────────────────── */

  window.comFiltrar = function () {
    _fBusca  = document.getElementById("com-f-busca")?.value?.trim().toLowerCase() || "";
    _fStatus = document.getElementById("com-f-status")?.value || "";
    _fMin    = document.getElementById("com-f-ministerio-fil")?.value || "";
    _renderLista();
  };

  window.comLimparFiltros = function () {
    const s = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    s("com-f-busca", ""); s("com-f-status", ""); s("com-f-ministerio-fil", "");
    _fBusca = _fStatus = _fMin = "";
    _renderLista();
  };

  window.comFiltrarStatus = function (status) {
    go("com-solicitacoes");
    setTimeout(() => {
      const el = document.getElementById("com-f-status");
      if (el) { el.value = status; comFiltrar(); }
    }, 300);
  };

  window.comCarregarDash = function () { _carregar(); };

  /* ── Autoload ───────────────────────────────────────── */

  VIEW_AUTOLOAD["com-dash"]         = { fn: () => _carregar() };
  VIEW_AUTOLOAD["com-solicitacoes"] = { fn: () => _carregar() };

})();
