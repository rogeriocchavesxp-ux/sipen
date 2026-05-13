/* ═══════════════════════════════════════════════════════
   SIPEN — Projetos & Acompanhamento
   Módulo incremental em JS puro + Supabase REST
═══════════════════════════════════════════════════════ */
(function () {
  let _lista = [];
  let _atual = null;
  let _membros = [];
  let _filtroStatus = "";
  let _filtroPrio = "";
  let _formId = null;

  const STATUS_CFG = {
    planejamento: { label: "Planejamento", cls: "pn", cor: "var(--blue)" },
    em_andamento: { label: "Em andamento", cls: "pp", cor: "var(--amber)" },
    pausado: { label: "Pausado", cls: "pz", cor: "var(--tx3)" },
    concluido: { label: "Concluído", cls: "pd", cor: "var(--gr)" }
  };
  const ETAPA_STATUS = {
    pendente: { label: "Pendente", cls: "pz" },
    em_andamento: { label: "Em andamento", cls: "pp" },
    concluido: { label: "Concluído", cls: "pd" }
  };
  const PRIO_CFG = {
    baixa: { label: "Baixa", cls: "pd", cor: "var(--gr)" },
    media: { label: "Média", cls: "pn", cor: "var(--blue)" },
    alta: { label: "Alta", cls: "po", cor: "var(--amber)" },
    critica: { label: "Crítica", cls: "pl", cor: "var(--rose)" }
  };
  const TIPO_LABEL = {
    obra: "Obra",
    legal: "Legal",
    infraestrutura: "Infraestrutura e Conservação",
    administrativo: "Administrativo"
  };

  function _eh(v) {
    if (typeof escapeHtml === "function") return escapeHtml(v);
    return String(v ?? "").replace(/[&<>"']/g, s => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[s]));
  }
  function _ea(v) { return typeof escapeHtmlAttr === "function" ? escapeHtmlAttr(v) : _eh(v).replace(/`/g, "&#96;"); }
  function _toast(t, s) { if (typeof T === "function") T(t, s || ""); else alert([t, s].filter(Boolean).join("\n")); }
  function _spin() { return typeof spinner === "function" ? spinner() : "Carregando..."; }
  function _api() { if (typeof apiBaseUrl !== "function") throw new Error("apiBaseUrl indisponível"); return apiBaseUrl(); }
  function _headers(extra) { if (typeof apiHeaders !== "function") throw new Error("apiHeaders indisponível"); return apiHeaders(extra || {}); }
  function _view(id) { return document.getElementById(id); }
  function _fmtData(d) { if (!d) return "—"; const [y,m,day] = String(d).slice(0,10).split("-"); return day && m && y ? `${day}/${m}/${y}` : _eh(d); }
  function _hojeIso() { return new Date().toISOString().slice(0, 10); }
  function _perms() { return typeof permissoesUsuario !== "undefined" ? permissoesUsuario : {}; }
  function _user() { return typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL : null; }

  function _podeEditar() {
    if (_user()?.perfil === "ADMINISTRADOR_GERAL") return true;
    const nivel = _perms().PROJETOS || "SEM_ACESSO";
    return nivel === "COMPLETO" || nivel === "EDICAO";
  }
  function _podeExcluir() { return _user()?.perfil === "ADMINISTRADOR_GERAL"; }

  async function _fetchJson(url, options) {
    const res = await fetch(url, options || { headers: _headers() });
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

  async function _carregarMembros() {
    if (_membros.length) return _membros;
    try {
      // Busca paginada completa — sem limite fixo
      if (typeof sipenFetchTodos === "function") {
        _membros = await sipenFetchTodos(
          "rest/v1/v_membros?status=eq.ativo&select=id,nome&order=nome.asc",
          _headers()
        );
      } else {
        const PAGE = 1000;
        let all = [], from = 0;
        while(true){
          const url = `${_api()}/rest/v1/v_membros?status=eq.ativo&select=id,nome&order=nome.asc&limit=${PAGE}&offset=${from}`;
          const data = await _fetchJson(url, { headers: _headers() }) || [];
          if(!data.length) break;
          all = all.concat(data);
          if(data.length < PAGE) break;
          from += PAGE;
        }
        _membros = all;
      }
    } catch (e) {
      console.warn("Projetos: falha ao carregar membros", e.message);
      _membros = [];
    }
    return _membros;
  }

  async function _carregarLista() {
    const params = ["select=*,projeto_etapas(id,status)", "order=created_at.desc"];
    if (_filtroStatus) params.push(`status=eq.${encodeURIComponent(_filtroStatus)}`);
    if (_filtroPrio) params.push(`prioridade=eq.${encodeURIComponent(_filtroPrio)}`);
    const url = `${_api()}/rest/v1/projetos?${params.join("&")}`;
    _lista = await _fetchJson(url, { headers: _headers() }) || [];
    await _carregarMembros();
  }

  async function _carregarDetalhe(id) {
    const url = `${_api()}/rest/v1/projetos?id=eq.${encodeURIComponent(id)}&select=*,projeto_etapas(*)&limit=1`;
    const rows = await _fetchJson(url, { headers: _headers() }) || [];
    _atual = rows[0] || null;
    if (_atual?.projeto_etapas) {
      _atual.projeto_etapas.sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || String(a.created_at || "").localeCompare(String(b.created_at || "")));
    }
    await _carregarMembros();
    return _atual;
  }

  function _membroNome(id) {
    if (!id) return "—";
    return _membros.find(m => m.id === id)?.nome || "—";
  }
  function _badgeStatus(s) {
    const cfg = STATUS_CFG[s] || ETAPA_STATUS[s] || { label: s || "—", cls: "pz" };
    return `<span class="pill ${cfg.cls}">${_eh(cfg.label)}</span>`;
  }
  function _badgePrio(p) {
    const cfg = PRIO_CFG[p] || { label: p || "—", cls: "pz" };
    return `<span class="pill ${cfg.cls}">${_eh(cfg.label)}</span>`;
  }
  function _progresso(etapas) {
    const arr = Array.isArray(etapas) ? etapas : [];
    const total = arr.length;
    const done = arr.filter(e => e.status === "concluido").length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, pct };
  }
  function _progressoBar(etapas) {
    const pr = _progresso(etapas);
    return `<div style="margin-top:8px">
      <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--tx3);margin-bottom:5px"><span>Progresso</span><span>${pr.done}/${pr.total} etapas · ${pr.pct}%</span></div>
      <div style="height:6px;background:var(--bg-input);border:1px solid var(--bd1);border-radius:999px;overflow:hidden"><div style="height:100%;width:${pr.pct}%;background:var(--gr);transition:width .2s"></div></div>
    </div>`;
  }
  function _select(val, map, onchange) {
    return `<select ${onchange || ""} style="background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11px;padding:6px 8px;font-family:var(--sans)">
      ${Object.entries(map).map(([k,c]) => `<option value="${_ea(k)}" ${k === val ? "selected" : ""}>${_eh(c.label || c)}</option>`).join("")}
    </select>`;
  }
  function _membrosOptions(selected) {
    return `<option value="">— Sem responsável —</option>` + _membros.map(m => `<option value="${_ea(m.id)}" ${m.id === selected ? "selected" : ""}>${_eh(m.nome)}</option>`).join("");
  }

  function _renderLista() {
    const el = _view("proj-lista-content");
    if (!el) return;
    const hoje = _hojeIso();
    const cards = _lista.map(r => {
      const atrasado = r.data_prevista && r.data_prevista < hoje && r.status !== "concluido";
      const tipo = TIPO_LABEL[r.tipo] || r.tipo || "—";
      return `<div class="card" style="border-left:3px solid ${PRIO_CFG[r.prioridade]?.cor || "var(--bd2)"}">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
          <div style="min-width:0">
            <div class="ctit" style="margin-bottom:5px">${_eh(r.nome)}</div>
            <div style="font-size:11px;color:var(--tx3);line-height:1.45">${_eh((r.descricao || "").slice(0, 160)) || "Sem descrição."}</div>
          </div>
          <button class="tbt" onclick="projAbrirDetalhe('${_ea(r.id)}')" style="flex-shrink:0">Ver detalhes</button>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
          <span class="pill pn">${_eh(tipo)}</span>${_badgePrio(r.prioridade)}${_badgeStatus(r.status)}${atrasado ? '<span class="pill pl">Atrasado</span>' : ''}
        </div>
        <div class="sr" style="margin-top:10px"><span class="sl">Responsável</span><span class="sv">${_eh(_membroNome(r.responsavel_id))}</span></div>
        <div class="sr"><span class="sl">Previsão</span><span class="sv mono">${_fmtData(r.data_prevista)}</span></div>
        ${_progressoBar(r.projeto_etapas)}
      </div>`;
    }).join("");

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        <select id="proj-f-status" onchange="projFiltrar('status',this.value)" class="fi2" style="max-width:180px"><option value="">Todos os status</option>${Object.entries(STATUS_CFG).map(([k,c]) => `<option value="${_ea(k)}" ${_filtroStatus===k?"selected":""}>${_eh(c.label)}</option>`).join("")}</select>
        <select id="proj-f-prio" onchange="projFiltrar('prioridade',this.value)" class="fi2" style="max-width:180px"><option value="">Todas as prioridades</option>${Object.entries(PRIO_CFG).map(([k,c]) => `<option value="${_ea(k)}" ${_filtroPrio===k?"selected":""}>${_eh(c.label)}</option>`).join("")}</select>
        <button class="tbt" onclick="projInit()">↻ Atualizar</button>
      </div>
      ${cards ? `<div class="g3">${cards}</div>` : `<div class="card" style="text-align:center;color:var(--tx3);padding:36px">Nenhum projeto encontrado.</div>`}
    `;
  }

  function _renderDetalhe() {
    const el = _view("proj-detalhe-content");
    if (!el) return;
    if (!_atual) { el.innerHTML = `<div class="card" style="color:var(--tx3);padding:28px">Projeto não encontrado.</div>`; return; }
    const etapas = _atual.projeto_etapas || [];
    const canEdit = _podeEditar();
    const statusControl = canEdit ? _select(_atual.status, STATUS_CFG, `onchange="projSalvarCampo('${_ea(_atual.id)}','status',this.value)"`) : _badgeStatus(_atual.status);
    const etapaHtml = etapas.map(e => `<div class="card" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
        <div style="min-width:220px;flex:1">
          <div style="font-size:13px;font-weight:700;color:var(--tx1)">${_eh(e.nome)}</div>
          <div style="font-size:11px;color:var(--tx3);margin-top:4px">${_eh(e.descricao || "Sem descrição.")}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${canEdit ? _select(e.status, ETAPA_STATUS, `onchange="projSalvarEtapa('${_ea(e.id)}','status',this.value)"`) : _badgeStatus(e.status)}
          ${canEdit && e.status !== "concluido" ? `<button class="tbt" onclick="projSalvarEtapa('${_ea(e.id)}','status','concluido')">Concluir</button>` : ""}
          ${canEdit ? `<button class="tbt" onclick="projExcluirEtapa('${_ea(e.id)}')">Excluir</button>` : ""}
        </div>
      </div>
      <div class="sr" style="margin-top:9px"><span class="sl">Responsável</span><span class="sv">${_eh(_membroNome(e.responsavel_id))}</span></div>
      <div class="sr"><span class="sl">Limite</span><span class="sv mono">${_fmtData(e.data_limite)}</span></div>
    </div>`).join("");

    el.innerHTML = `
      <div style="display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-bottom:12px">
        <button class="tbt" onclick="go('proj-lista')">← Voltar</button>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${canEdit ? `<button class="tbt" onclick="projAbrirForm('${_ea(_atual.id)}')">Editar projeto</button>` : ""}
          ${_podeExcluir() ? `<button class="tbt" onclick="projExcluir('${_ea(_atual.id)}')" style="color:var(--rose);border-color:rgba(208,104,104,.35)">Excluir</button>` : ""}
        </div>
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap">
          <div><div class="ctit">${_eh(_atual.nome)}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><span class="pill pn">${_eh(TIPO_LABEL[_atual.tipo] || _atual.tipo)}</span>${_badgePrio(_atual.prioridade)}${statusControl}</div></div>
          <div style="min-width:180px">${_progressoBar(etapas)}</div>
        </div>
        <div class="g2" style="margin-top:14px">
          <div><div class="sr"><span class="sl">Responsável</span><span class="sv">${_eh(_membroNome(_atual.responsavel_id))}</span></div><div class="sr"><span class="sl">Início</span><span class="sv mono">${_fmtData(_atual.data_inicio)}</span></div></div>
          <div><div class="sr"><span class="sl">Previsão</span><span class="sv mono">${_fmtData(_atual.data_prevista)}</span></div><div class="sr"><span class="sl">Conclusão</span><span class="sv mono">${_fmtData(_atual.data_conclusao)}</span></div></div>
        </div>
        <div style="font-size:12px;color:var(--tx2);line-height:1.55;margin-top:14px;white-space:pre-wrap">${_eh(_atual.descricao || "Sem descrição.")}</div>
      </div>
      <div class="card" style="margin-top:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px"><div class="ctit">Etapas</div>${canEdit ? `<button class="tbt pri" onclick="projNovaEtapa()">+ Adicionar etapa</button>` : ""}</div>
        ${etapaHtml || `<div style="color:var(--tx3);font-size:12px;padding:18px;text-align:center">Nenhuma etapa cadastrada.</div>`}
      </div>
    `;
  }

  function _renderForm(dados) {
    const el = _view("proj-form-content");
    if (!el) return;
    const d = dados || { tipo:"administrativo", prioridade:"media", status:"planejamento" };
    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px"><button class="tbt" onclick="${_formId ? `projAbrirDetalhe('${_ea(_formId)}')` : "go('proj-lista')"}">← Voltar</button></div>
      <div class="card">
        <div class="ctit" style="margin-bottom:14px">${_formId ? "Editar projeto" : "Novo projeto"}</div>
        <div class="frow"><div class="fg"><label class="flb">Nome *</label><input id="proj-nome" class="fi2" value="${_ea(d.nome || "")}" maxlength="160"></div><div class="fg"><label class="flb">Responsável</label><select id="proj-resp" class="fi2">${_membrosOptions(d.responsavel_id)}</select></div></div>
        <div class="frow"><div class="fg"><label class="flb">Tipo</label><select id="proj-tipo" class="fi2">${Object.entries(TIPO_LABEL).map(([k,v]) => `<option value="${_ea(k)}" ${d.tipo===k?"selected":""}>${_eh(v)}</option>`).join("")}</select></div><div class="fg"><label class="flb">Prioridade</label><select id="proj-prio" class="fi2">${Object.entries(PRIO_CFG).map(([k,c]) => `<option value="${_ea(k)}" ${d.prioridade===k?"selected":""}>${_eh(c.label)}</option>`).join("")}</select></div></div>
        <div class="frow"><div class="fg"><label class="flb">Status</label><select id="proj-status" class="fi2">${Object.entries(STATUS_CFG).map(([k,c]) => `<option value="${_ea(k)}" ${d.status===k?"selected":""}>${_eh(c.label)}</option>`).join("")}</select></div><div class="fg"><label class="flb">Data de início</label><input id="proj-inicio" type="date" class="fi2" value="${_ea(d.data_inicio || "")}"></div></div>
        <div class="frow"><div class="fg"><label class="flb">Data prevista</label><input id="proj-prevista" type="date" class="fi2" value="${_ea(d.data_prevista || "")}"></div><div class="fg"><label class="flb">Data de conclusão</label><input id="proj-conclusao" type="date" class="fi2" value="${_ea(d.data_conclusao || "")}"></div></div>
        <div class="fg"><label class="flb">Descrição</label><textarea id="proj-desc" class="fi2" rows="5">${_eh(d.descricao || "")}</textarea></div>
        <div class="ma"><button class="btn" onclick="${_formId ? `projAbrirDetalhe('${_ea(_formId)}')` : "go('proj-lista')"}">Cancelar</button><button class="btn btn-p" id="proj-save-btn" onclick="projSalvar()">Salvar</button></div>
      </div>
    `;
  }

  function _payloadForm() {
    const nome = _view("proj-nome")?.value.trim();
    if (!nome) throw new Error("Informe o nome do projeto.");
    return {
      nome,
      descricao: _view("proj-desc")?.value.trim() || null,
      tipo: _view("proj-tipo")?.value || "administrativo",
      status: _view("proj-status")?.value || "planejamento",
      prioridade: _view("proj-prio")?.value || "media",
      responsavel_id: _view("proj-resp")?.value || null,
      data_inicio: _view("proj-inicio")?.value || null,
      data_prevista: _view("proj-prevista")?.value || null,
      data_conclusao: _view("proj-conclusao")?.value || null
    };
  }

  async function _withButton(id, label, fn) {
    const btn = _view(id);
    const old = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = label || "Salvando..."; }
    try { return await fn(); }
    finally { if (btn) { btn.disabled = false; btn.textContent = old; } }
  }

  window.projInit = async function() {
    const btnNovo = document.getElementById("proj-btn-novo");
    if (btnNovo) btnNovo.style.display = _podeEditar() ? "" : "none";
    const el = _view("proj-lista-content");
    if (el) el.innerHTML = `<div class="card" style="padding:28px;color:var(--tx3)">${_spin()} Carregando projetos...</div>`;
    try { await _carregarLista(); _renderLista(); }
    catch (e) { if (el) el.innerHTML = `<div class="card" style="color:var(--rose);padding:24px">Erro ao carregar projetos: ${_eh(e.message)}</div>`; _toast("Erro", e.message); }
  };
  window.projAbrirDetalhe = async function(id) {
    await go("proj-detalhe");
    const el = _view("proj-detalhe-content");
    if (el) el.innerHTML = `<div class="card" style="padding:28px;color:var(--tx3)">${_spin()} Carregando detalhe...</div>`;
    try { await _carregarDetalhe(id); _renderDetalhe(); }
    catch (e) { if (el) el.innerHTML = `<div class="card" style="color:var(--rose);padding:24px">Erro: ${_eh(e.message)}</div>`; _toast("Erro", e.message); }
  };
  window.projAbrirForm = async function(id) {
    if (!_podeEditar()) { _toast("Acesso negado", "Você não tem permissão para editar projetos."); return; }
    _formId = id || null;
    await go("proj-form");
    const el = _view("proj-form-content");
    if (el) el.innerHTML = `<div class="card" style="padding:28px;color:var(--tx3)">${_spin()} Preparando formulário...</div>`;
    try {
      await _carregarMembros();
      let dados = null;
      if (id) dados = await _carregarDetalhe(id);
      _renderForm(dados);
    } catch(e) { _toast("Erro", e.message); }
  };
  window.projSalvar = async function() {
    if (!_podeEditar()) return _toast("Acesso negado", "Sem permissão para salvar.");
    try {
      await _withButton("proj-save-btn", "Salvando...", async () => {
        const payload = _payloadForm();
        let savedId = _formId;
        if (_formId) {
          await _fetchJson(`${_api()}/rest/v1/projetos?id=eq.${encodeURIComponent(_formId)}`, { method:"PATCH", headers:_headers({ "Prefer":"return=minimal" }), body:JSON.stringify(payload) });
        } else {
          const rows = await _fetchJson(`${_api()}/rest/v1/projetos`, { method:"POST", headers:_headers({ "Prefer":"return=representation" }), body:JSON.stringify(payload) });
          savedId = rows?.[0]?.id;
        }
        _toast("Projeto salvo", "Dados atualizados com sucesso.");
        if (savedId) await window.projAbrirDetalhe(savedId); else { await go("proj-lista"); await window.projInit(); }
      });
    } catch(e) { _toast("Erro", e.message); }
  };
  window.projSalvarCampo = async function(id, campo, valor) {
    if (!_podeEditar()) return;
    try { await _fetchJson(`${_api()}/rest/v1/projetos?id=eq.${encodeURIComponent(id)}`, { method:"PATCH", headers:_headers({ "Prefer":"return=minimal" }), body:JSON.stringify({ [campo]: valor }) }); await window.projAbrirDetalhe(id); }
    catch(e) { _toast("Erro", e.message); }
  };
  window.projSalvarEtapa = async function(etapaId, campo, valor) {
    if (!_podeEditar()) return;
    try { await _fetchJson(`${_api()}/rest/v1/projeto_etapas?id=eq.${encodeURIComponent(etapaId)}`, { method:"PATCH", headers:_headers({ "Prefer":"return=minimal" }), body:JSON.stringify({ [campo]: valor }) }); if (_atual?.id) await window.projAbrirDetalhe(_atual.id); }
    catch(e) { _toast("Erro", e.message); }
  };
  window.projNovaEtapa = async function() {
    if (!_podeEditar() || !_atual?.id) return;
    const nome = prompt("Nome da etapa:");
    if (!nome?.trim()) return;
    try {
      const ordem = (_atual.projeto_etapas || []).length + 1;
      await _fetchJson(`${_api()}/rest/v1/projeto_etapas`, { method:"POST", headers:_headers({ "Prefer":"return=minimal" }), body:JSON.stringify({ projeto_id:_atual.id, nome:nome.trim(), ordem }) });
      await window.projAbrirDetalhe(_atual.id);
    } catch(e) { _toast("Erro", e.message); }
  };
  window.projExcluirEtapa = async function(etapaId) {
    if (!_podeEditar() || !_atual?.id || !confirm("Excluir esta etapa?")) return;
    try { await _fetchJson(`${_api()}/rest/v1/projeto_etapas?id=eq.${encodeURIComponent(etapaId)}`, { method:"DELETE", headers:_headers() }); await window.projAbrirDetalhe(_atual.id); }
    catch(e) { _toast("Erro", e.message); }
  };
  window.projExcluir = async function(id) {
    if (!_podeExcluir()) return _toast("Acesso negado", "Somente administrador geral exclui projetos.");
    if (!confirm("Excluir este projeto e suas etapas?")) return;
    try { await _fetchJson(`${_api()}/rest/v1/projetos?id=eq.${encodeURIComponent(id)}`, { method:"DELETE", headers:_headers() }); _toast("Projeto excluído", "Registro removido."); await go("proj-lista"); await window.projInit(); }
    catch(e) { _toast("Erro", e.message); }
  };
  window.projFiltrar = function(campo, valor) {
    if (campo === "status") _filtroStatus = valor;
    if (campo === "prioridade") _filtroPrio = valor;
    window.projInit();
  };

  const _oldGo = window.go;
  if (typeof _oldGo === "function" && !_oldGo.__projWrapped) {
    const wrapped = async function(id) {
      await _oldGo(id);
      if (id === "proj-lista") window.projInit();
    };
    wrapped.__projWrapped = true;
    window.go = wrapped;
  }
})();
