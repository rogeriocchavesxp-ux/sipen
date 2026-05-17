/* ═══════════════════════════════════════════════════════════════
   SIPEN — Escalas da Junta Diaconal  v6.30.57
   CRUD completo: lançamentos por mês, diácono, posto e programação.
   Impressão em A4 semelhante ao modelo em PDF da IPPenha.
═══════════════════════════════════════════════════════════════ */
(function () {

  /* ── Config ──────────────────────────────────────────────── */

  const POSTOS = [
    "Hall / Templo",
    "Galeria / Ronda",
    "Estacionamento (Igreja)",
    "Estacionamento (Rua)",
  ];

  const PROGRAMACOES = [
    "Culto Matinal",
    "Culto Vespertino",
    "Culto Matinal (Santa Ceia)",
    "Culto Vespertino (Santa Ceia)",
    "Conexão com Deus",
    "SOS - Jovens",
    "Workshop da Família",
    "Outro",
  ];

  const MESES_PT = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ];

  /* ── Estado ──────────────────────────────────────────────── */

  let _itens      = null;
  let _diaconos   = null;
  let _mesRef     = new Date().toISOString().slice(0, 7); // YYYY-MM
  let _editandoId = null;
  let _modalEl    = null;
  let _filtros    = { prog: "", posto: "", diacono: "" };

  /* ── Helpers ─────────────────────────────────────────────── */

  function _eh(v) {
    if (typeof escapeHtml === "function") return escapeHtml(v);
    return String(v ?? "").replace(/[&<>"']/g, s =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[s]));
  }
  function _ea(v) {
    if (typeof escapeHtmlAttr === "function") return escapeHtmlAttr(v);
    return _eh(v).replace(/`/g, "&#96;");
  }
  function _api()       { return typeof apiBaseUrl === "function" ? apiBaseUrl() : ""; }
  function _hdrs(extra) { return typeof apiHeaders === "function" ? apiHeaders(extra || {}) : {}; }
  function _toast(t, s) { if (typeof T === "function") T(t, s || ""); else alert([t, s].filter(Boolean).join("\n")); }
  function _user()      { return typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL : null; }
  function _v(id)       { return document.getElementById(id); }

  function _fmtDataCurta(d) {
    if (!d) return "—";
    const p = String(d).slice(0, 10).split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}` : d;
  }
  function _fmtDataCompleta(d) {
    if (!d) return "—";
    const p = String(d).slice(0, 10).split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
  }
  function _fmtHora(t) {
    return t ? String(t).slice(0, 5) : "—";
  }
  function _mesAnoLabel(ref) {
    if (!ref) return "";
    const [y, m] = ref.split("-");
    return `${MESES_PT[+m - 1]}/${y}`;
  }
  function _diaSemana(d) {
    if (!d) return "";
    const dias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
    return dias[new Date(d + "T12:00:00").getDay()] || "";
  }

  /* ── Permissões ──────────────────────────────────────────── */

  function _podeEditar() {
    const u = _user();
    if (!u) return false;
    if (u.perfil === "ADMINISTRADOR_GERAL") return true;
    const p = typeof permissoesUsuario !== "undefined" ? permissoesUsuario : {};
    return p.JUNTA_DIACONAL === "COMPLETO" || p.JUNTA_DIACONAL === "EDICAO";
  }
  function _podeExcluir() {
    const u = _user();
    if (!u) return false;
    if (u.perfil === "ADMINISTRADOR_GERAL") return true;
    const p = typeof permissoesUsuario !== "undefined" ? permissoesUsuario : {};
    return p.JUNTA_DIACONAL === "COMPLETO";
  }

  /* ── API ─────────────────────────────────────────────────── */

  async function _fetch(url, opts) {
    const res = await fetch(url, opts || { headers: _hdrs() });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); msg = j.message || j.error || msg; } catch (_) {}
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }

  async function _carregarDiaconos() {
    if (_diaconos) return;
    _diaconos = await _fetch(
      `${_api()}/rest/v1/v_oficiais?select=id,pessoa_id,nome&cargo=eq.diacono&status=in.(ativo,especial)&order=nome.asc&limit=300`,
      { headers: _hdrs() }
    ) || [];
  }

  async function _carregarItens(forcar) {
    if (_itens && !forcar) return;
    _itens = await _fetch(
      `${_api()}/rest/v1/v_escala_diaconal?mes_ref=eq.${encodeURIComponent(_mesRef)}&order=data.asc,programacao.asc,posto.asc&limit=500`,
      { headers: _hdrs() }
    ) || [];
  }

  /* ── KPIs ────────────────────────────────────────────────── */

  function _renderKpis() {
    const el = _v("diac-esc-kpis");
    if (!el || !_itens) return;
    const total   = _itens.length;
    const diacSet = new Set(_itens.map(i => i.diacono).filter(Boolean));
    const progs   = new Set(_itens.map(i => i.programacao));
    const trocas  = _itens.filter(i => i.troca_obs).length;
    el.innerHTML = `
      <div class="kpi"><div class="kpi-ico" style="background:var(--copperbg);color:var(--copper)">📋</div><div class="kpi-body"><div class="kpi-lbl">Lançamentos</div><div class="kpi-val">${total}</div><div class="kpi-d nu">${_mesAnoLabel(_mesRef)}</div></div></div>
      <div class="kpi"><div class="kpi-ico" style="background:rgba(58,170,92,0.15);color:var(--gr)">✦</div><div class="kpi-body"><div class="kpi-lbl">Diáconos escalados</div><div class="kpi-val">${diacSet.size}</div><div class="kpi-d nu">no mês</div></div></div>
      <div class="kpi"><div class="kpi-ico" style="background:rgba(212,168,67,0.15);color:var(--gold)">◆</div><div class="kpi-body"><div class="kpi-lbl">Programações</div><div class="kpi-val">${progs.size}</div><div class="kpi-d nu">diferentes</div></div></div>
      <div class="kpi"><div class="kpi-ico" style="background:rgba(224,138,42,0.15);color:var(--amber)">⇄</div><div class="kpi-body"><div class="kpi-lbl">Trocas / Pagamentos</div><div class="kpi-val">${trocas}</div><div class="kpi-d ${trocas ? "wa" : "nu"}">${trocas ? "⚠ registradas" : "nenhuma"}</div></div></div>
    `;
  }

  /* ── Filtros ─────────────────────────────────────────────── */

  function _itensFiltrados() {
    return (_itens || []).filter(i => {
      if (_filtros.prog    && i.programacao !== _filtros.prog)                               return false;
      if (_filtros.posto   && i.posto       !== _filtros.posto)                              return false;
      if (_filtros.diacono && !(i.diacono || "").toLowerCase().includes(_filtros.diacono.toLowerCase())) return false;
      return true;
    });
  }

  function _renderFiltros() {
    const elProg  = _v("diac-esc-fil-prog");
    const elPosto = _v("diac-esc-fil-posto");
    if (!elProg || !elPosto) return;
    const progSet  = [...new Set((_itens || []).map(i => i.programacao))].sort();
    const postoSet = [...new Set((_itens || []).map(i => i.posto))].sort();
    elProg.innerHTML  = `<option value="">Todas programações</option>`  + progSet.map(p  => `<option value="${_ea(p)}"  ${_filtros.prog  === p ? "selected" : ""}>${_eh(p)}</option>`).join("");
    elPosto.innerHTML = `<option value="">Todos os postos</option>`     + postoSet.map(p => `<option value="${_ea(p)}"  ${_filtros.posto === p ? "selected" : ""}>${_eh(p)}</option>`).join("");
    const elDiac = _v("diac-esc-fil-diac");
    if (elDiac) elDiac.value = _filtros.diacono;
  }

  window.diacEscalaFiltrar = function () {
    _filtros.prog    = (_v("diac-esc-fil-prog")?.value  || "").trim();
    _filtros.posto   = (_v("diac-esc-fil-posto")?.value || "").trim();
    _filtros.diacono = (_v("diac-esc-fil-diac")?.value  || "").trim();
    _renderTabela();
  };

  /* ── Tabela ──────────────────────────────────────────────── */

  function _renderTabela() {
    const el = _v("diac-esc-tbody");
    if (!el) return;
    const lista   = _itensFiltrados();
    const podeEd  = _podeEditar();
    const podeExc = _podeExcluir();

    if (!lista.length) {
      const cols = podeEd ? 8 : 7;
      el.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:28px;color:var(--tx3)">Nenhum lançamento encontrado para este mês/filtro.</td></tr>`;
      return;
    }

    el.innerHTML = lista.map(i => {
      const ds = _diaSemana(i.data);
      return `<tr>
        <td class="tdc mono" style="white-space:nowrap">${_fmtDataCurta(i.data)}${ds ? ` <span style="color:var(--tx3);font-size:10px">${ds}</span>` : ""}</td>
        <td class="tdp">${_eh(i.programacao)}</td>
        <td>${_eh(i.diacono || "—")}</td>
        <td class="tdc" style="white-space:nowrap">${_eh(i.posto)}</td>
        <td class="tdc mono">${_fmtHora(i.horario_chegada)}</td>
        <td class="tdc" style="max-width:140px;white-space:normal;font-size:11px">${i.troca_obs ? `<span style="color:var(--amber)">${_eh(i.troca_obs)}</span>` : `<span style="color:var(--tx3)">—</span>`}</td>
        <td class="tdc" style="max-width:140px;white-space:normal;font-size:11px;color:var(--tx3)">${_eh(i.obs || "")}</td>
        ${podeEd ? `<td class="tdc" style="white-space:nowrap">
          <button class="tbt" style="padding:3px 8px;font-size:11px" onclick="diacEscalaEditar('${_ea(i.id)}')">✎</button>
          ${podeExc ? `<button class="tbt" style="padding:3px 8px;font-size:11px;color:var(--rose)" onclick="diacEscalaExcluir('${_ea(i.id)}')">✕</button>` : ""}
        </td>` : ""}
      </tr>`;
    }).join("");
  }

  /* ── Seletor de meses ────────────────────────────────────── */

  function _buildMesOpts() {
    const hoje = new Date();
    const opts = [];
    for (let i = -6; i <= 6; i++) {
      const d   = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const lbl = `${MESES_PT[d.getMonth()]}/${d.getFullYear()}`;
      opts.push(`<option value="${val}" ${val === _mesRef ? "selected" : ""}>${lbl}</option>`);
    }
    return opts.join("");
  }

  /* ── HTML da área de conteúdo ────────────────────────────── */

  function _escalaHtml() {
    const podeEd  = _podeEditar();
    const inputSt = `style="background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx2,#adb5bd);font-size:11px;padding:5px 9px"`;
    return `
      <div class="kpis c4" id="diac-esc-kpis"></div>

      <div class="card" style="margin-top:12px">
        <div class="ctit" style="flex-wrap:wrap;gap:8px;align-items:center">
          <span id="diac-esc-titulo" style="font-size:13px;font-weight:600">Escala — ${_mesAnoLabel(_mesRef)}</span>
          <div style="margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <select id="diac-esc-mes" onchange="diacEscalaMudarMes()" ${inputSt.replace('style="', 'style="min-width:160px;')}>${_buildMesOpts()}</select>
            <button class="tbt" onclick="diacEscalaImprimir()">🖨 Imprimir</button>
            ${podeEd ? `<button class="tbt pri" onclick="diacEscalaNovoItem()">+ Lançamento</button>` : ""}
          </div>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px;padding-top:8px;border-top:1px solid var(--bd1)">
          <select id="diac-esc-fil-prog"  onchange="diacEscalaFiltrar()" ${inputSt} style="flex:1;min-width:150px;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx2,#adb5bd);font-size:11px;padding:5px 9px">
            <option value="">Todas programações</option>
          </select>
          <select id="diac-esc-fil-posto" onchange="diacEscalaFiltrar()" ${inputSt} style="flex:1;min-width:150px;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx2,#adb5bd);font-size:11px;padding:5px 9px">
            <option value="">Todos os postos</option>
          </select>
          <input id="diac-esc-fil-diac" type="text" placeholder="Buscar diácono..." oninput="diacEscalaFiltrar()"
            style="flex:1;min-width:130px;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11px;padding:5px 9px">
        </div>

        <div style="overflow-x:auto">
          <table class="tbl">
            <thead><tr>
              <th style="min-width:68px">Data</th>
              <th style="min-width:140px">Programação</th>
              <th style="min-width:150px">Diácono</th>
              <th style="min-width:140px">Posto</th>
              <th style="min-width:72px">Chegada</th>
              <th style="min-width:130px">Troca / Pagamento</th>
              <th style="min-width:110px">Obs</th>
              ${podeEd ? `<th style="min-width:60px"></th>` : ""}
            </tr></thead>
            <tbody id="diac-esc-tbody">
              <tr><td colspan="${podeEd ? 8 : 7}" style="text-align:center;padding:28px;color:var(--tx3)">Carregando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function _renderTudo() {
    _renderKpis();
    _renderFiltros();
    _renderTabela();
    const tit = _v("diac-esc-titulo");
    if (tit) tit.textContent = `Escala — ${_mesAnoLabel(_mesRef)}`;
    const sel = _v("diac-esc-mes");
    if (sel) sel.value = _mesRef;
  }

  /* ── Mudança de mês ──────────────────────────────────────── */

  window.diacEscalaMudarMes = async function () {
    const sel = _v("diac-esc-mes");
    if (!sel) return;
    _mesRef = sel.value;
    _itens  = null;
    _filtros = { prog: "", posto: "", diacono: "" };
    const ct = _v("diac-esc-content");
    if (ct) ct.innerHTML = `<div style="padding:32px;color:var(--tx3);text-align:center;font-size:13px">Carregando ${_mesAnoLabel(_mesRef)}...</div>`;
    try {
      await _carregarItens(true);
      if (ct) ct.innerHTML = _escalaHtml();
      _renderTudo();
    } catch (e) { _toast("Erro ao carregar mês", e.message); }
  };

  /* ── Modal add/edit ──────────────────────────────────────── */

  function _fecharModal() {
    if (_modalEl) { _modalEl.remove(); _modalEl = null; }
    _editandoId = null;
  }
  window.diacEscalaFecharModal = _fecharModal;

  function _selStyle() {
    return `style="width:100%;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 11px"`;
  }
  function _inpStyle() { return _selStyle(); }
  function _lbl(t)     { return `<label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">${t}</label>`; }
  function _field(c)   { return `<div style="display:flex;flex-direction:column">${c}</div>`; }

  function _buildDiaconoOpts(selId) {
    const blank = `<option value="">— Selecionar diácono —</option>`;
    const opts  = (_diaconos || []).map(d =>
      `<option value="${_ea(d.pessoa_id)}" data-nome="${_ea(d.nome)}" ${d.pessoa_id === selId ? "selected" : ""}>${_eh(d.nome)}</option>`
    );
    return [blank, ...opts].join("");
  }

  function _abrirModal(item) {
    _fecharModal();
    const isEdit   = !!item;
    const progOpts = PROGRAMACOES.map(p =>
      `<option value="${_ea(p)}" ${item?.programacao === p ? "selected" : ""}>${_eh(p)}</option>`
    ).join("");
    const postoOpts = POSTOS.map(p =>
      `<option value="${_ea(p)}" ${item?.posto === p ? "selected" : ""}>${_eh(p)}</option>`
    ).join("");

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9800;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto";
    overlay.innerHTML = `
      <div style="background:var(--bg2,#212529);border:1px solid var(--bd2);border-radius:12px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;padding:24px;margin:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <strong style="font-size:15px">${isEdit ? "Editar Lançamento" : "Novo Lançamento"}</strong>
          <button onclick="diacEscalaFecharModal()" style="background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer;line-height:1">✕</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            ${_field(_lbl("Data *") + `<input id="de-data" type="date" value="${_ea(item?.data || "")}" ${_inpStyle()}>`)}
            ${_field(_lbl("Horário de Chegada") + `<input id="de-hora" type="time" value="${_ea(item?.horario_chegada ? String(item.horario_chegada).slice(0,5) : "")}" ${_inpStyle()}>`)}
          </div>
          ${_field(_lbl("Programação *") + `<select id="de-prog" ${_selStyle()}><option value="">Selecionar...</option>${progOpts}</select>`)}
          ${_field(_lbl("Diácono *") + `<select id="de-diac" ${_selStyle()}>${_buildDiaconoOpts(item?.diacono_id)}</select>`)}
          ${_field(_lbl("Posto *") + `<select id="de-posto" ${_selStyle()}><option value="">Selecionar...</option>${postoOpts}</select>`)}
          ${_field(_lbl("Troca / Pagamento / Substituição") + `<input id="de-troca" type="text" value="${_ea(item?.troca_obs || "")}" placeholder="Ex: troca com Diác. João Silva" ${_inpStyle()}>`)}
          ${_field(_lbl("Observações internas") + `<textarea id="de-obs" rows="2" ${_selStyle().replace("<","<").replace("input","textarea")} style="width:100%;background:var(--bg-input,#1a1d21);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 11px;resize:vertical">${_eh(item?.obs || "")}</textarea>`)}
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
          <button onclick="diacEscalaFecharModal()" class="btn">Cancelar</button>
          <button id="de-btn-salvar" onclick="diacEscalaSalvar()" class="btn btn-p">Salvar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    _modalEl    = overlay;
    _editandoId = item?.id || null;
    overlay.addEventListener("click", e => { if (e.target === overlay) _fecharModal(); });

    // Restaurar posto no select após build
    if (item?.posto) {
      const s = _v("de-posto");
      if (s) s.value = item.posto;
    }
  }

  /* ── CRUD ────────────────────────────────────────────────── */

  window.diacEscalaNovoItem = function () {
    if (!_podeEditar()) { _toast("Sem permissão", "Você não tem permissão para lançar escalas"); return; }
    _editandoId = null;
    _abrirModal(null);
  };

  window.diacEscalaEditar = function (id) {
    if (!_podeEditar()) return;
    const item = (_itens || []).find(i => i.id === id);
    if (!item) return;
    _abrirModal(item);
  };

  window.diacEscalaSalvar = async function () {
    const btn      = _v("de-btn-salvar");
    const data     = (_v("de-data")?.value   || "").trim();
    const prog     = (_v("de-prog")?.value   || "").trim();
    const diacEl   = _v("de-diac");
    const diacId   = diacEl?.value || "";
    const diacOpt  = diacEl?.options[diacEl.selectedIndex];
    const diacNome = (diacOpt?.dataset?.nome || diacOpt?.text || "").trim();
    const posto    = (_v("de-posto")?.value  || "").trim();
    const hora     = (_v("de-hora")?.value   || "").trim() || null;
    const troca    = (_v("de-troca")?.value  || "").trim() || null;
    const obs      = (_v("de-obs")?.value    || "").trim() || null;

    if (!data)   { _toast("Campo obrigatório", "Informe a data"); return; }
    if (!prog)   { _toast("Campo obrigatório", "Selecione a programação"); return; }
    if (!diacId) { _toast("Campo obrigatório", "Selecione o diácono"); return; }
    if (!posto)  { _toast("Campo obrigatório", "Selecione o posto"); return; }

    const payload = {
      mes_ref:         data.slice(0, 7),
      data,
      programacao:     prog,
      posto,
      diacono_id:      diacId,
      diacono_nome:    diacNome,
      horario_chegada: hora || null,
      troca_obs:       troca,
      obs,
      created_by:      _user()?.id || null,
    };

    if (btn) { btn.disabled = true; btn.textContent = "Salvando..."; }
    try {
      if (_editandoId) {
        await _fetch(
          `${_api()}/rest/v1/escala_diaconal?id=eq.${encodeURIComponent(_editandoId)}`,
          { method: "PATCH", headers: _hdrs({ "Content-Type": "application/json", Prefer: "return=minimal" }), body: JSON.stringify(payload) }
        );
        _toast("Salvo", "Lançamento atualizado com sucesso");
      } else {
        await _fetch(
          `${_api()}/rest/v1/escala_diaconal`,
          { method: "POST", headers: _hdrs({ "Content-Type": "application/json", Prefer: "return=minimal" }), body: JSON.stringify(payload) }
        );
        _toast("Salvo", "Lançamento adicionado à escala");
      }
      _fecharModal();
      await _carregarItens(true);
      _renderTudo();
    } catch (e) {
      _toast("Erro ao salvar", e.message);
      if (btn) { btn.disabled = false; btn.textContent = "Salvar"; }
    }
  };

  window.diacEscalaExcluir = async function (id) {
    if (!_podeExcluir()) { _toast("Sem permissão", "Somente administradores ou liderança da Junta podem excluir"); return; }
    if (!confirm("Excluir este lançamento da escala? Esta ação não pode ser desfeita.")) return;
    try {
      await _fetch(
        `${_api()}/rest/v1/escala_diaconal?id=eq.${encodeURIComponent(id)}`,
        { method: "PATCH", headers: _hdrs({ "Content-Type": "application/json", Prefer: "return=minimal" }), body: JSON.stringify({ deleted_at: new Date().toISOString() }) }
      );
      _itens = (_itens || []).filter(i => i.id !== id);
      _renderTudo();
    } catch (e) { _toast("Erro ao excluir", e.message); }
  };

  /* ── Impressão ───────────────────────────────────────────── */

  window.diacEscalaImprimir = function () {
    const lista     = _itensFiltrados();
    const mesLabel  = _mesAnoLabel(_mesRef);
    const dataGer   = new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" });

    const rows = lista.length
      ? lista.map((i, idx) => {
          const bg = idx % 2 === 0 ? "" : "background:#f8f8f8;";
          return `<tr style="${bg}">
            <td style="text-align:center;white-space:nowrap">${_fmtDataCurta(i.data)}<br><span style="font-size:7pt;color:#888">${_diaSemana(i.data)}</span></td>
            <td>${i.programacao}</td>
            <td>${i.diacono || "—"}</td>
            <td>${i.posto}</td>
            <td style="text-align:center">${_fmtHora(i.horario_chegada)}</td>
            <td>${i.troca_obs || ""}</td>
            <td style="font-size:8.5pt;color:#555">${i.obs || ""}</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="7" style="text-align:center;padding:20px;color:#999">Nenhum lançamento para o período.</td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Escala da Junta Diaconal — ${mesLabel}</title>
<style>
  *  { box-sizing:border-box; margin:0; padding:0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size:10pt; color:#111; background:#fff; }

  .topo { text-align:center; margin-bottom:20px; }
  .topo .logo-txt { font-size:9pt; color:#555; letter-spacing:.06em; text-transform:uppercase; }
  .topo .titulo   { font-size:14pt; font-weight:bold; text-transform:uppercase; letter-spacing:.04em; margin:6px 0 2px; }
  .topo .mes      { font-size:12pt; font-weight:600; color:#333; }
  .topo hr        { border:none; border-top:2px solid #333; margin:10px 0 0; }

  table  { width:100%; border-collapse:collapse; font-size:9pt; }
  thead th { background:#1a2a3a; color:#fff; padding:7px 6px; text-align:left; font-size:8pt; letter-spacing:.04em; text-transform:uppercase; }
  thead th:first-child  { text-align:center; }
  td     { padding:6px 6px; border-bottom:1px solid #e0e0e0; vertical-align:middle; }

  .rodape { margin-top:20px; border-top:1px solid #ccc; padding-top:10px; display:flex; justify-content:space-between; font-size:8pt; color:#777; }
  .versic { font-style:italic; color:#555; text-align:center; margin-top:6px; font-size:8pt; }

  @page  { size: A4 landscape; margin: 14mm 12mm 12mm; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
  <div class="topo">
    <div class="logo-txt">Igreja Presbiteriana da Penha · IPPenha</div>
    <div class="titulo">Escala da Junta Diaconal</div>
    <div class="mes">${mesLabel}</div>
    <hr>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:62px; text-align:center">Data</th>
        <th style="width:150px">Programação</th>
        <th style="width:160px">Diácono</th>
        <th style="width:140px">Posto</th>
        <th style="width:66px; text-align:center">Chegada</th>
        <th style="width:130px">Troca / Pagamento</th>
        <th>Observações</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="versic">"Porque o Filho do homem também não veio para ser servido, mas para servir." — Marcos 10:45</div>
  <div class="rodape">
    <span>SIPEN · Sistema Integrado da IPPenha</span>
    <span>Gerado em ${dataGer}</span>
  </div>
</body>
</html>`;

    const w = window.open("", "_blank", "width=1000,height=720");
    if (!w) { _toast("Pop-up bloqueado", "Permita pop-ups para imprimir a escala"); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 700);
  };

  /* ── Relatório de importação ─────────────────────────────── */

  window.diacEscalaRelatorioImport = function (nomesPDF) {
    if (!_diaconos || !Array.isArray(nomesPDF)) return;
    const encontrados = [];
    const naoEncontrados = [];
    nomesPDF.forEach(nome => {
      const match = _diaconos.find(d =>
        d.nome.toLowerCase().includes(nome.toLowerCase()) ||
        nome.toLowerCase().includes(d.nome.toLowerCase())
      );
      if (match) encontrados.push({ pdf: nome, db: match.nome, id: match.pessoa_id });
      else       naoEncontrados.push(nome);
    });
    console.group("[SIPEN] Relatório de importação — nomes do PDF vs cadastro");
    console.log("Encontrados:", encontrados);
    console.warn("Não encontrados:", naoEncontrados);
    console.groupEnd();
    return { encontrados, naoEncontrados };
  };

  /* ── Entry point ─────────────────────────────────────────── */

  async function load() {
    const ct = _v("diac-esc-content");
    if (!ct) return;
    ct.innerHTML = `<div style="padding:32px;color:var(--tx3);text-align:center;font-size:13px">Carregando escala...</div>`;
    try {
      await Promise.all([_carregarDiaconos(), _carregarItens(true)]);
      ct.innerHTML = _escalaHtml();
      _renderTudo();
    } catch (e) {
      ct.innerHTML = `<div style="padding:20px;color:var(--rose);font-size:12px">Erro ao carregar escala: ${_eh(e.message)}</div>`;
    }
  }

  window.diacEscalaLoad = load;

})();
