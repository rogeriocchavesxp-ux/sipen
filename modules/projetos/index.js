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
  let _filtroBusca = "";
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
    obra:           "Obra",
    legal:          "Legal",
    infraestrutura: "Infraestrutura e Conservação",
    administrativo: "Administrativo",
    tecnologia:     "Tecnologia",
    evento:         "Montagem de Eventos",
    acao_social:    "Ação Social",
  };
  const TIPO_CFG = {
    obra:           { icon:"🏗",  cor:"var(--amber)",  bg:"rgba(255,159,10,.12)"  },
    legal:          { icon:"⚖️", cor:"var(--violet)", bg:"rgba(191,90,242,.12)"  },
    infraestrutura: { icon:"🔧", cor:"var(--blue)",   bg:"rgba(10,132,255,.12)"  },
    administrativo: { icon:"📋", cor:"var(--teal)",   bg:"rgba(90,200,250,.12)"  },
    tecnologia:     { icon:"💻", cor:"var(--sky)",    bg:"rgba(100,210,255,.12)" },
    evento:         { icon:"🎪", cor:"var(--orange)", bg:"rgba(249,115,22,.12)"  },
    acao_social:    { icon:"🤝", cor:"var(--gr)",     bg:"rgba(48,209,88,.12)"   },
  };

  const ETAPA_TEMPLATES = {
    infraestrutura: ["Vistoria inicial", "Levantamento de orçamento", "Aprovação e liberação", "Contratação", "Execução", "Vistoria final", "Entrega e documentação"],
    obra: ["Projeto e aprovação", "Licitação e contratação", "Fundação e estrutura", "Acabamento", "Vistoria e AVCB", "Entrega"],
    tecnologia: ["Levantamento de requisitos", "Análise e planejamento", "Design e prototipação", "Desenvolvimento", "Testes e validação", "Deploy / publicação", "Documentação"],
    administrativo: ["Definição de escopo", "Aprovação da liderança", "Execução", "Revisão e ajustes", "Conclusão e registro"],
    legal: ["Levantamento de documentação", "Análise jurídica", "Elaboração do documento", "Assinaturas", "Protocolo / Registro", "Arquivamento"],
    evento: ["Definição do evento", "Planejamento e cronograma", "Contratação de fornecedores", "Divulgação", "Montagem e ensaio", "Realização do evento", "Desmontagem e avaliação"],
    acao_social: ["Diagnóstico da necessidade", "Captação de recursos e doações", "Seleção de beneficiários", "Preparação dos materiais", "Execução da ação", "Acompanhamento e registro", "Avaliação e relatório"],
  };

  function _iniciais(nome) { return String(nome||"—").split(" ").slice(0,2).map(w=>w[0]||"").join("").toUpperCase()||"—"; }
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
    if (nivel === "COMPLETO" || nivel === "EDICAO") return true;
    if (_atual) {
      const uid = _user()?.id;
      if (uid && _atual.created_by === uid) return true;
      const isEditor = (_atual.projeto_participantes || []).some(p => p.pessoa_id === uid && p.nivel === "editor" && p.aceito === true);
      if (isEditor) return true;
    }
    return false;
  }
  function _ehCriador() {
    if (_user()?.perfil === "ADMINISTRADOR_GERAL") return true;
    const nivel = _perms().PROJETOS || "SEM_ACESSO";
    if (nivel === "COMPLETO") return true;
    const uid = _user()?.id;
    return uid && _atual && _atual.created_by === uid;
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
          const url = `${_api()}/rest/v1/v_membros?status=eq.ativo&select=id,pessoa_id,nome&order=nome.asc&limit=${PAGE}&offset=${from}`;
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
    const url = `${_api()}/rest/v1/projetos?id=eq.${encodeURIComponent(id)}&select=*,projeto_etapas(*),projeto_participantes(id,nivel,pessoa_id,aceito)&limit=1`;
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
    return _membros.find(m => m.id === id || m.pessoa_id === id)?.nome || "—";
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
  function _progressoBar(etapas, cor) {
    const pr = _progresso(etapas);
    const barCor = cor || "var(--gr)";
    return `<div style="margin-top:8px">
      <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--tx3);margin-bottom:5px"><span>${pr.done}/${pr.total} etapas</span><span>${pr.pct}%</span></div>
      <div class="bars"><div class="bf" style="width:${pr.pct}%;background:${barCor}"></div></div>
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

    const ativos = _lista.filter(r => ["planejamento","em_andamento"].includes(r.status)).length;
    const concluidos = _lista.filter(r => r.status === "concluido").length;
    const atrasados = _lista.filter(r => r.data_prevista && r.data_prevista < hoje && r.status !== "concluido").length;
    const etapasConcluidas = _lista.reduce((acc,r) => acc + (r.projeto_etapas||[]).filter(e => e.status==="concluido").length, 0);

    const busca = (_filtroBusca||"").toLowerCase();
    const filtered = _lista.filter(r => {
      if (_filtroStatus && r.status !== _filtroStatus) return false;
      if (_filtroPrio && r.prioridade !== _filtroPrio) return false;
      if (busca && !r.nome.toLowerCase().includes(busca) && !(r.descricao||"").toLowerCase().includes(busca)) return false;
      return true;
    });

    const cards = filtered.map(r => {
      const tc = TIPO_CFG[r.tipo] || { icon:"📁", cor:"var(--tx3)", bg:"var(--bg-hover)" };
      const tl = TIPO_LABEL[r.tipo] || r.tipo || "—";
      const atrasado = r.data_prevista && r.data_prevista < hoje && r.status !== "concluido";
      const prioCor = PRIO_CFG[r.prioridade]?.cor || "var(--tx3)";
      const resp = _membroNome(r.responsavel_id);
      const ini = resp !== "—" ? _iniciais(resp) : "";
      return `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:0">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="width:40px;height:40px;border-radius:10px;background:${tc.bg};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${tc.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <div style="font-size:13px;font-weight:700;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_eh(r.nome)}</div>
              ${_badgePrio(r.prioridade)}
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:5px">
              <span class="pill pn" style="font-size:10px">${_eh(tl)}</span>${_badgeStatus(r.status)}${atrasado?'<span class="pill pl">Atrasado</span>':""}
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:12px">
          ${ini?`<div style="width:26px;height:26px;border-radius:50%;background:var(--bg-hover);border:1px solid var(--bd2);display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:700;color:var(--tx2);flex-shrink:0">${_eh(ini)}</div>`:""}
          <span style="font-size:11.5px;color:var(--tx2)">${_eh(resp)}</span>
          ${r.data_prevista?`<span style="font-size:10.5px;color:var(--tx3);margin-left:auto">📅 ${_fmtData(r.data_prevista)}</span>`:""}
        </div>
        ${_progressoBar(r.projeto_etapas, prioCor)}
        <button class="tbt" onclick="projAbrirDetalhe('${_ea(r.id)}')" style="width:100%;margin-top:12px;text-align:center">Ver detalhes →</button>
      </div>`;
    }).join("");

    el.innerHTML = `
      <div class="kpis c4" style="margin-bottom:20px">
        <div class="kpi"><div class="kpi-ico" style="background:rgba(10,132,255,.12);color:var(--blue)">◎</div><div class="kpi-body"><div class="kpi-lbl">Ativos</div><div class="kpi-val">${ativos}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(48,209,88,.12);color:var(--gr)">✓</div><div class="kpi-body"><div class="kpi-lbl">Concluídos</div><div class="kpi-val">${concluidos}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(255,69,58,.12);color:var(--rose)">!</div><div class="kpi-body"><div class="kpi-lbl">Atrasados</div><div class="kpi-val">${atrasados}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(90,200,250,.12);color:var(--teal)">▣</div><div class="kpi-body"><div class="kpi-lbl">Etapas concluídas</div><div class="kpi-val">${etapasConcluidas}</div></div></div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        <input class="fi2" placeholder="Buscar projeto..." value="${_ea(_filtroBusca||"")}" oninput="projBuscar(this.value)" style="flex:1;min-width:160px">
        <select onchange="projFiltrar('status',this.value)" class="fi2" style="max-width:180px"><option value="">Todos os status</option>${Object.entries(STATUS_CFG).map(([k,c]) => `<option value="${_ea(k)}" ${_filtroStatus===k?"selected":""}>${_eh(c.label)}</option>`).join("")}</select>
        <select onchange="projFiltrar('prioridade',this.value)" class="fi2" style="max-width:180px"><option value="">Todas as prioridades</option>${Object.entries(PRIO_CFG).map(([k,c]) => `<option value="${_ea(k)}" ${_filtroPrio===k?"selected":""}>${_eh(c.label)}</option>`).join("")}</select>
        <button class="tbt" onclick="projInit()" title="Atualizar">↻</button>
      </div>
      ${filtered.length ? `<div class="g3">${cards}</div>` : `<div class="card" style="text-align:center;color:var(--tx3);padding:36px">Nenhum projeto encontrado.</div>`}
    `;
  }

  function _renderDetalhe() {
    const el = _view("proj-detalhe-content");
    if (!el) return;
    if (!_atual) { el.innerHTML = `<div class="card" style="color:var(--tx3);padding:28px">Projeto não encontrado.</div>`; return; }

    const etapas = _atual.projeto_etapas || [];
    const canEdit = _podeEditar();
    const tc = TIPO_CFG[_atual.tipo] || { icon:"📁", cor:"var(--tx3)", bg:"var(--bg-hover)" };
    const pr = _progresso(etapas);
    const hoje = _hojeIso();
    const statusControl = canEdit
      ? _select(_atual.status, STATUS_CFG, `onchange="projSalvarCampo('${_ea(_atual.id)}','status',this.value)"`)
      : _badgeStatus(_atual.status);

    // Dias restantes
    let diasHtml = "";
    if (_atual.data_prevista && _atual.status !== "concluido") {
      const diff = Math.ceil((new Date(_atual.data_prevista) - new Date(hoje)) / 86400000);
      const cor = diff < 0 ? "var(--rose)" : "var(--tx1)";
      const txt = diff < 0 ? `${Math.abs(diff)} dias atrasado` : `${diff} dias restantes`;
      diasHtml = `<div><div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:2px">Prazo</div><div style="font-size:13px;font-weight:600;color:${cor}">${txt}</div></div>`;
    }

    const participantes = _atual.projeto_participantes || [];
    const partAceitos = participantes.filter(p => p.aceito === true).length;

    // Timeline de etapas
    const etapaHtml = etapas.length ? etapas.map((e, i) => {
      const isConc = e.status === "concluido";
      const isAtivo = e.status === "em_andamento";
      const dotBg = isConc ? "var(--gr)" : isAtivo ? "var(--blue)" : "var(--bd2)";
      const dotTxt = isConc || isAtivo ? "#fff" : "var(--tx3)";
      const isLast = i === etapas.length - 1;
      return `<div style="display:flex;gap:12px">
        <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
          <div style="width:24px;height:24px;border-radius:50%;background:${dotBg};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${dotTxt};flex-shrink:0">${isConc?"✓":String(i+1)}</div>
          ${!isLast?`<div style="width:2px;flex:1;min-height:16px;background:var(--bd2);margin-top:4px"></div>`:""}
        </div>
        <div style="flex:1;min-width:0;padding-bottom:${!isLast?"18px":"0"}">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div style="min-width:0;flex:1">
              <div style="font-size:12.5px;font-weight:700;color:${isConc?"var(--tx3)":"var(--tx1)"};${isConc?"text-decoration:line-through;opacity:.65":""}">${_eh(e.nome)}</div>
              ${e.descricao?`<div style="font-size:11px;color:var(--tx3);margin-top:3px;line-height:1.45">${_eh((e.descricao||"").slice(0,140))}${(e.descricao||"").length>140?"...":""}</div>`:""}
              ${e.data_limite?`<div style="font-size:10.5px;color:var(--tx3);margin-top:5px">📅 Limite: ${_fmtData(e.data_limite)}</div>`:""}
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
              ${_badgeStatus(e.status)}
              ${canEdit&&e.status!=="concluido"?`<button class="tbt" style="font-size:11px" onclick="projSalvarEtapa('${_ea(e.id)}','status','concluido')">Concluir</button>`:""}
              ${canEdit?`<button class="tbt" style="font-size:11px;color:var(--rose);padding:4px 8px" onclick="projExcluirEtapa('${_ea(e.id)}')">✕</button>`:""}
            </div>
          </div>
        </div>
      </div>`;
    }).join("") : `<div style="color:var(--tx3);font-size:12px;padding:18px;text-align:center">Nenhuma etapa cadastrada.</div>`;

    // Participantes
    const criador = _ehCriador();
    const jaParticipantes = new Set(participantes.map(p => p.pessoa_id));
    const membrosDisponiveis = _membros.filter(m => !jaParticipantes.has(m.pessoa_id||m.id));
    const partHtml = participantes.map(p => {
      const nome = _membroNome(p.pessoa_id);
      const ini = _iniciais(nome);
      const borderCor = p.aceito===true ? "var(--gr)" : p.aceito===false ? "var(--rose)" : "var(--amber)";
      const estadoLbl = p.aceito===true ? "Aceito" : p.aceito===false ? "Recusado" : "Pendente";
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bd1)">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--bg-hover);border:2px solid ${borderCor};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--tx2);flex-shrink:0">${_eh(ini)}</div>
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--tx1)">${_eh(nome)}</div>
            <div style="font-size:10.5px;color:var(--tx3)">${p.nivel==="editor"?"Editor":"Visualizador"} · <span style="color:${borderCor}">${estadoLbl}</span></div>
          </div>
        </div>
        ${criador?`<button class="tbt" style="font-size:11px;color:var(--rose)" onclick="projRemoverParticipante('${_ea(p.id)}','${_ea(_atual.id)}')">Remover</button>`:""}
      </div>`;
    }).join("");
    const addHtml = criador ? `
      <div style="display:flex;align-items:center;gap:8px;margin-top:12px;flex-wrap:wrap">
        <select id="proj-part-membro" class="fi2" style="flex:1;min-width:160px;margin:0">
          <option value="">Selecionar membro...</option>
          ${membrosDisponiveis.map(m=>`<option value="${_ea(m.pessoa_id||m.id)}">${_eh(m.nome)}</option>`).join("")}
        </select>
        <select id="proj-part-nivel" class="fi2" style="margin:0;width:130px">
          <option value="visualizador">Visualizador</option>
          <option value="editor">Editor</option>
        </select>
        <button class="tbt pri" onclick="projAdicionarParticipante('${_ea(_atual.id)}')">Convidar</button>
      </div>` : "";

    el.innerHTML = `
      <div style="display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-bottom:12px">
        <button class="tbt" onclick="go('proj-lista')">← Voltar</button>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${canEdit?`<button class="tbt" onclick="projAbrirForm('${_ea(_atual.id)}')">Editar</button>`:""}
          ${_podeExcluir()?`<button class="tbt" onclick="projExcluir('${_ea(_atual.id)}')" style="color:var(--rose);border-color:rgba(208,104,104,.35)">Excluir</button>`:""}
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="width:48px;height:48px;border-radius:12px;background:${tc.bg};display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">${tc.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:17px;font-weight:700;color:var(--tx1);line-height:1.25">${_eh(_atual.nome)}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
              <span class="pill pn">${_eh(TIPO_LABEL[_atual.tipo]||_atual.tipo)}</span>${_badgePrio(_atual.prioridade)}${statusControl}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:24px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid var(--bd1)">
          <div><div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:2px">Etapas</div><div style="font-size:15px;font-weight:700;color:var(--tx1)">${pr.done}/${pr.total} <span style="font-size:11px;font-weight:400;color:var(--tx3)">(${pr.pct}%)</span></div></div>
          <div><div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:2px">Responsável</div><div style="font-size:13px;font-weight:600;color:var(--tx1)">${_eh(_membroNome(_atual.responsavel_id))}</div></div>
          ${diasHtml}
          <div><div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:2px">Participantes</div><div style="font-size:13px;font-weight:600;color:var(--tx1)">${partAceitos}</div></div>
        </div>
        <div class="g2" style="margin-top:14px">
          <div><div class="sr"><span class="sl">Início</span><span class="sv mono">${_fmtData(_atual.data_inicio)}</span></div><div class="sr"><span class="sl">Previsão</span><span class="sv mono">${_fmtData(_atual.data_prevista)}</span></div></div>
          <div><div class="sr"><span class="sl">Conclusão</span><span class="sv mono">${_fmtData(_atual.data_conclusao)}</span></div></div>
        </div>
        ${_atual.descricao?`<div style="font-size:12px;color:var(--tx2);line-height:1.55;margin-top:14px;padding-top:12px;border-top:1px solid var(--bd1);white-space:pre-wrap">${_eh(_atual.descricao)}</div>`:""}
      </div>

      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px">
          <div class="ctit">Etapas</div>
          ${canEdit?`<button class="tbt pri" onclick="projNovaEtapa()">+ Adicionar</button>`:""}
        </div>
        ${etapaHtml}
      </div>

      <div class="card">
        <div class="ctit" style="margin-bottom:${participantes.length?"10px":"0"}">Participantes</div>
        ${partHtml||`<div style="color:var(--tx3);font-size:12px;padding:10px 0">Nenhum participante adicionado.</div>`}
        ${addHtml}
      </div>
    `;
  }

  function _renderForm(dados) {
    const el = _view("proj-form-content");
    if (!el) return;
    const d = dados || { tipo:"administrativo", prioridade:"media", status:"planejamento" };
    const voltarFn = _formId ? `projAbrirDetalhe('${_ea(_formId)}')` : "go('proj-lista')";
    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <button class="tbt" onclick="${voltarFn}">← Voltar</button>
      </div>
      <div class="card">
        <div class="ctit" style="margin-bottom:18px">${_formId?"Editar projeto":"Novo projeto"}</div>

        <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:10px">Identificação</div>
        <div class="frow">
          <div class="fg"><label class="flb">Nome *</label><input id="proj-nome" class="fi2" value="${_ea(d.nome||"")}" maxlength="160"></div>
          <div class="fg"><label class="flb">Responsável</label><select id="proj-resp" class="fi2">${_membrosOptions(d.responsavel_id)}</select></div>
        </div>
        <div class="frow">
          <div class="fg"><label class="flb">Tipo</label><select id="proj-tipo" class="fi2" ${!_formId?'onchange="projAtualizarTemplateEtapas()"':""}>${Object.entries(TIPO_LABEL).map(([k,v])=>`<option value="${_ea(k)}" ${d.tipo===k?"selected":""}>${_eh(v)}</option>`).join("")}</select></div>
          <div class="fg"><label class="flb">Prioridade</label><select id="proj-prio" class="fi2">${Object.entries(PRIO_CFG).map(([k,c])=>`<option value="${_ea(k)}" ${d.prioridade===k?"selected":""}>${_eh(c.label)}</option>`).join("")}</select></div>
          <div class="fg"><label class="flb">Status</label><select id="proj-status" class="fi2">${Object.entries(STATUS_CFG).map(([k,c])=>`<option value="${_ea(k)}" ${d.status===k?"selected":""}>${_eh(c.label)}</option>`).join("")}</select></div>
        </div>

        <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-top:20px;margin-bottom:10px">Cronograma</div>
        <div class="frow">
          <div class="fg"><label class="flb">Data de início</label><input id="proj-inicio" type="date" class="fi2" value="${_ea(d.data_inicio||"")}"></div>
          <div class="fg"><label class="flb">Data prevista</label><input id="proj-prevista" type="date" class="fi2" value="${_ea(d.data_prevista||"")}"></div>
          <div class="fg"><label class="flb">Data de conclusão</label><input id="proj-conclusao" type="date" class="fi2" value="${_ea(d.data_conclusao||"")}"></div>
        </div>

        <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-top:20px;margin-bottom:10px">Descrição</div>
        <div class="fg"><textarea id="proj-desc" class="fi2" rows="5">${_eh(d.descricao||"")}</textarea></div>

        <div class="ma"><button class="btn" onclick="${voltarFn}">Cancelar</button><button class="btn btn-p" id="proj-save-btn" onclick="projSalvar()">Salvar</button></div>
      </div>
      ${!_formId?`
      <div class="card" style="margin-top:10px" id="proj-etapas-template-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <div class="ctit">Etapas sugeridas</div>
          <button class="tbt" style="font-size:11px" onclick="projMarcarTodasEtapas()">Marcar todas</button>
        </div>
        <div style="font-size:11.5px;color:var(--tx3);margin-bottom:12px">Selecione as etapas que deseja incluir. Os nomes podem ser editados depois.</div>
        <div id="proj-etapas-list"></div>
      </div>`:""}
    `;
  }

  function _payloadForm() {
    const nome = _view("proj-nome")?.value.trim();
    if (!nome) throw new Error("Informe o nome do projeto.");
    const payload = {
      nome,
      descricao: _view("proj-desc")?.value.trim() || null,
      tipo: _view("proj-tipo")?.value || "administrativo",
      status: _view("proj-status")?.value || "planejamento",
      prioridade: _view("proj-prio")?.value || "media",
      responsavel_id: _view("proj-resp")?.value || null,
      data_inicio: _view("proj-inicio")?.value || null,
      data_prevista: _view("proj-prevista")?.value || null,
      data_conclusao: _view("proj-conclusao")?.value || null,
    };
    if (!_formId) payload.created_by = _user()?.id || null;
    return payload;
  }

  async function _withButton(id, label, fn) {
    const btn = _view(id);
    const old = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = label || "Salvando..."; }
    try { return await fn(); }
    finally { if (btn) { btn.disabled = false; btn.textContent = old; } }
  }

  function _fecharModalConvites() {
    const m = document.getElementById("proj-convites-modal");
    if (m) m.remove();
  }

  function _mostrarModalConvites(convites) {
    const existing = document.getElementById("proj-convites-modal");
    if (existing) existing.remove();
    const rows = convites.map(c => `
      <div id="proj-conv-row-${_ea(c.id)}" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--bd1)">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--tx1)">${_eh(c.projetos?.nome || "Projeto")}</div>
          <div style="font-size:11px;color:var(--tx3);margin-top:2px">Nível: <strong>${c.nivel === "editor" ? "Editor" : "Visualizador"}</strong></div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button onclick="projResponderConvite('${_ea(c.id)}',true)" style="padding:6px 16px;border-radius:6px;border:none;background:var(--gr);color:#fff;font-size:12px;font-weight:600;cursor:pointer">Sim</button>
          <button onclick="projResponderConvite('${_ea(c.id)}',false)" style="padding:6px 14px;border-radius:6px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12px;cursor:pointer">Não</button>
        </div>
      </div>`).join("");
    const modal = document.createElement("div");
    modal.id = "proj-convites-modal";
    modal.style.cssText = "position:fixed;inset:0;z-index:9100;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px";
    modal.innerHTML = `
      <div style="background:var(--bg-card);border-radius:14px;padding:24px;max-width:460px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.45);border:1px solid var(--bd2)">
        <div style="font-size:15px;font-weight:700;color:var(--tx1);margin-bottom:4px">Convite para projeto</div>
        <div style="font-size:12px;color:var(--tx3);margin-bottom:16px">Você foi adicionado ao(s) projeto(s) abaixo. Deseja participar?</div>
        <div id="proj-convites-lista">${rows}</div>
      </div>`;
    document.body.appendChild(modal);
  }

  let _convitesPendentes = 0;

  window.projResponderConvite = async function(conviteId, aceito) {
    try {
      await _fetchJson(`${_api()}/rest/v1/projeto_participantes?id=eq.${encodeURIComponent(conviteId)}`, {
        method: "PATCH",
        headers: _headers({ "Prefer": "return=minimal" }),
        body: JSON.stringify({ aceito }),
      });
      const row = document.getElementById(`proj-conv-row-${conviteId}`);
      if (row) row.remove();
      _convitesPendentes = Math.max(0, _convitesPendentes - 1);
      if (_convitesPendentes === 0) _fecharModalConvites();
    } catch(e) { _toast("Erro", e.message); }
  };

  window.__projVerificarConvites = async function() {
    const uid = _user()?.id;
    if (!uid) return;
    try {
      const convites = await _fetchJson(
        `${_api()}/rest/v1/projeto_participantes?pessoa_id=eq.${encodeURIComponent(uid)}&aceito=is.null&select=id,nivel,projeto_id,projetos(nome)`,
        { headers: _headers() }
      ) || [];
      if (!convites.length) return;
      _convitesPendentes = convites.length;
      _mostrarModalConvites(convites);
    } catch(e) {
      console.warn("projVerificarConvites:", e.message);
    }
  };

  window.projAdicionarParticipante = async function(projetoId) {
    const pessoaId = _view("proj-part-membro")?.value;
    const nivel = _view("proj-part-nivel")?.value || "visualizador";
    if (!pessoaId) { _toast("Atenção", "Selecione um membro"); return; }
    try {
      await _fetchJson(`${_api()}/rest/v1/projeto_participantes`, {
        method: "POST",
        headers: _headers({ "Prefer": "return=minimal" }),
        body: JSON.stringify({ projeto_id: projetoId, pessoa_id: pessoaId, nivel, convidado_por: _user()?.id || null }),
      });
      _toast("Participante adicionado", _membroNome(pessoaId));
      await window.projAbrirDetalhe(projetoId);
    } catch(e) { _toast("Erro", e.message); }
  };

  window.projRemoverParticipante = async function(participanteId, projetoId) {
    if (!confirm("Remover este participante do projeto?")) return;
    try {
      await _fetchJson(`${_api()}/rest/v1/projeto_participantes?id=eq.${encodeURIComponent(participanteId)}`, {
        method: "DELETE",
        headers: _headers(),
      });
      await window.projAbrirDetalhe(projetoId);
    } catch(e) { _toast("Erro", e.message); }
  };

  window.projAtualizarTemplateEtapas = function() {
    const tipo = _view("proj-tipo")?.value || "administrativo";
    const lista = _view("proj-etapas-list");
    if (!lista) return;
    const etapas = ETAPA_TEMPLATES[tipo] || [];
    if (!etapas.length) {
      lista.innerHTML = `<div style="font-size:11.5px;color:var(--tx3);padding:8px 0">Nenhuma etapa sugerida para este tipo.</div>`;
      return;
    }
    lista.innerHTML = etapas.map((nome, i) => `
      <label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1);cursor:pointer">
        <input type="checkbox" id="proj-etapa-chk-${i}" data-nome="${_ea(nome)}" checked style="width:15px;height:15px;flex-shrink:0;accent-color:var(--gr)">
        <span style="font-size:12px;color:var(--tx1)">${_eh(nome)}</span>
      </label>`).join("");
  };

  window.projMarcarTodasEtapas = function() {
    const chks = document.querySelectorAll("[id^='proj-etapa-chk-']");
    const algumDesmarcado = [...chks].some(c => !c.checked);
    chks.forEach(c => c.checked = algumDesmarcado);
  };

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
      if (!id) window.projAtualizarTemplateEtapas();
    } catch(e) { _toast("Erro", e.message); }
  };
  window.projSalvar = async function() {
    if (!_podeEditar()) return _toast("Acesso negado", "Sem permissão para salvar.");
    try {
      await _withButton("proj-save-btn", "Salvando...", async () => {
        const payload = _payloadForm();
        let savedId = _formId;
        const isNovo = !_formId;
        if (_formId) {
          await _fetchJson(`${_api()}/rest/v1/projetos?id=eq.${encodeURIComponent(_formId)}`, { method:"PATCH", headers:_headers({ "Prefer":"return=minimal" }), body:JSON.stringify(payload) });
        } else {
          const rows = await _fetchJson(`${_api()}/rest/v1/projetos`, { method:"POST", headers:_headers({ "Prefer":"return=representation" }), body:JSON.stringify(payload) });
          savedId = rows?.[0]?.id;
        }
        if (isNovo && savedId) {
          const chks = document.querySelectorAll("[id^='proj-etapa-chk-']");
          const etapasSelecionadas = [...chks].filter(c => c.checked).map((c, i) => ({
            projeto_id: savedId,
            nome: c.dataset.nome,
            ordem: i + 1,
            status: "pendente",
            created_by: _user()?.id || null,
          }));
          if (etapasSelecionadas.length) {
            await _fetchJson(`${_api()}/rest/v1/projeto_etapas`, {
              method: "POST",
              headers: _headers({ "Prefer": "return=minimal" }),
              body: JSON.stringify(etapasSelecionadas),
            });
          }
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
      await _fetchJson(`${_api()}/rest/v1/projeto_etapas`, { method:"POST", headers:_headers({ "Content-Type":"application/json", "Prefer":"return=minimal" }), body:JSON.stringify({ projeto_id:_atual.id, nome:nome.trim(), ordem, created_by: _user()?.id || null }) });
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
  window.projBuscar = function(valor) {
    _filtroBusca = valor || "";
    _renderLista();
  };

  async function _renderDash() {
    const el = _view("proj-dash-content");
    if (!el) return;

    const hoje = _hojeIso();
    const todos = _lista;

    const total    = todos.length;
    const andamento= todos.filter(p => p.status === "em_andamento").length;
    const concluido= todos.filter(p => p.status === "concluido").length;
    const atrasados= todos.filter(p => p.data_prevista && p.data_prevista < hoje && p.status !== "concluido");

    function _kpi(valor, label, cor) {
      return `<div class="kpi" style="cursor:default">
        <div class="kpi-body"><div class="kpi-val" style="color:${cor}">${valor}</div><div class="kpi-lbl">${label}</div></div>
      </div>`;
    }

    function _cardProj(r, destaque) {
      const pr = _progresso(r.projeto_etapas || []);
      const tipo = TIPO_LABEL[r.tipo] || r.tipo || "—";
      const atrasado = r.data_prevista && r.data_prevista < hoje && r.status !== "concluido";
      const borda = destaque ? "var(--rose)" : (PRIO_CFG[r.prioridade]?.cor || "var(--bd2)");
      return `<div class="card" style="border-left:3px solid ${borda}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div style="min-width:0;flex:1">
            <div class="ctit" style="margin-bottom:4px">${_eh(r.nome)}</div>
            <div style="font-size:11px;color:var(--tx3)">${_eh(tipo)} · Responsável: ${_eh(_membroNome(r.responsavel_id))}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;align-items:center">
            ${_badgePrio(r.prioridade)}${_badgeStatus(r.status)}${atrasado ? '<span class="pill pl">Atrasado</span>' : ""}
            <button class="tbt" onclick="projAbrirDetalhe('${_ea(r.id)}')">Ver</button>
          </div>
        </div>
        <div style="margin-top:10px">
          <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--tx3);margin-bottom:5px">
            <span>Progresso</span>
            <span>${pr.done}/${pr.total} etapas · ${pr.pct}%${r.data_prevista ? " · Previsão: " + _fmtData(r.data_prevista) : ""}</span>
          </div>
          <div style="height:5px;background:var(--bg-input);border:1px solid var(--bd1);border-radius:999px;overflow:hidden">
            <div style="height:100%;width:${pr.pct}%;background:${destaque && pr.pct < 100 ? "var(--rose)" : "var(--gr)"};transition:width .2s"></div>
          </div>
        </div>
      </div>`;
    }

    const emAndamento = todos.filter(p => p.status === "em_andamento" && !(p.data_prevista && p.data_prevista < hoje));
    const planejamento= todos.filter(p => p.status === "planejamento");
    const pausados    = todos.filter(p => p.status === "pausado");
    const concluidos  = todos.filter(p => p.status === "concluido").slice(0, 3);

    function _section(titulo, lista, cor, destaque) {
      if (!lista.length) return "";
      return `<div style="margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${cor};margin-bottom:10px">${titulo} <span style="font-weight:400;opacity:.6">(${lista.length})</span></div>
        <div style="display:flex;flex-direction:column;gap:8px">${lista.map(r => _cardProj(r, destaque)).join("")}</div>
      </div>`;
    }

    el.innerHTML = `
      <div class="kpis c4" style="margin-bottom:20px">
        ${_kpi(total, "Total", "var(--tx1)")}
        ${_kpi(andamento, "Em andamento", "var(--amber)")}
        ${_kpi(atrasados.length, "Atrasados", atrasados.length ? "var(--rose)" : "var(--tx3)")}
        ${_kpi(concluido, "Concluídos", "var(--gr)")}
      </div>
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
        <button class="tbt" onclick="go('proj-lista')">Ver todos os projetos →</button>
      </div>
      ${!total ? `<div class="card" style="text-align:center;color:var(--tx3);padding:40px">Nenhum projeto cadastrado.</div>` : ""}
      ${_section("Atrasados", atrasados, "var(--rose)", true)}
      ${_section("Em andamento", emAndamento, "var(--amber)", false)}
      ${_section("Planejamento", planejamento, "var(--blue)", false)}
      ${_section("Pausados", pausados, "var(--tx3)", false)}
      ${concluidos.length ? _section("Concluídos recentemente", concluidos, "var(--gr)", false) : ""}
    `;
  }

  window.projDashInit = async function () {
    const btnNovo = document.getElementById("proj-dash-btn-novo");
    if (btnNovo) btnNovo.style.display = _podeEditar() ? "" : "none";
    const el = _view("proj-dash-content");
    if (el) el.innerHTML = `<div class="card" style="padding:28px;color:var(--tx3)">${_spin()} Carregando projetos...</div>`;
    try { await _carregarLista(); await _renderDash(); }
    catch (e) { if (el) el.innerHTML = `<div class="card" style="color:var(--rose);padding:24px">Erro: ${_eh(e.message)}</div>`; }
  };

  document.addEventListener("sipen:navigate", ({ detail: { id } }) => {
    if (id === "proj-lista") window.projInit();
    if (id === "proj-dash") window.projDashInit();
  });
})();
