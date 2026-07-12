/* ═══════════════════════════════════════════════════════════
   SIPEN — Processos Eleitorais  v6.41.0
   modules/conselho/eleicoes.js
═══════════════════════════════════════════════════════════ */

(function () {

  /* ── Config ─────────────────────────────────────────── */
  const BASE_URL = "https://www.sipen.com.br/eleicoes.html?p=";

  /* ── Estado ─────────────────────────────────────────── */
  let _processos  = [];
  let _processo   = null;   // processo em foco (detalhe/edição)
  let _indicacoes = [];
  let _membros    = [];
  let _nav        = "lista";       // lista | form | detalhe | historico
  let _detTab     = "stats";       // stats | indicacoes | compartilhar
  let _filtroTipo    = "todos";
  let _filtroCongreg = "todas";
  let _editando      = false;
  let _candidatos    = [];
  let _votacaoConfig = null;
  let _votSubTab     = "config";
  let _candFiltroTipo = "todos";

  /* ── Helpers ────────────────────────────────────────── */
  const _sb  = () => (typeof getSupabase === "function" ? getSupabase() : null);
  const _usr = () => (typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL : null);
  const _root = () => document.getElementById("eleicao-root");

  function _isAdmin() {
    const u = _usr();
    return u && ["ADMINISTRADOR_GERAL","CONSELHO","PASTORAL","ADM_OPERACIONAL"].includes(u.perfil);
  }

  function _esc(s) {
    if (!s) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function _fmtDate(d) {
    if (!d) return "—";
    const [y,m,dia] = String(d).slice(0,10).split("-");
    return `${dia}/${m}/${y}`;
  }

  function _fmtDtHr(d) {
    if (!d) return "—";
    try { return new Date(d).toLocaleString("pt-BR"); } catch { return d; }
  }

  function _slugBase(nome, ano) {
    const base = String(nome).toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g,"")
      .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,24);
    return `${base}-${ano}`;
  }

  function _slugUnique(base) {
    const existing = _processos.map(p => p.slug);
    if (!existing.includes(base)) return base;
    let n = 2;
    while (existing.includes(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  }

  const STATUS_CFG = {
    rascunho:  { lbl:"Rascunho",  cor:"var(--tx3)", bg:"rgba(138,145,158,.12)" },
    agendado:  { lbl:"Agendado",  cor:"var(--amber)", bg:"rgba(208,144,64,.12)" },
    aberto:    { lbl:"Aberto",    cor:"var(--gr)",   bg:"rgba(58,170,92,.12)"  },
    encerrado: { lbl:"Encerrado", cor:"var(--sky)",  bg:"rgba(74,156,245,.12)" },
    apurado:   { lbl:"Apurado",   cor:"var(--violet)", bg:"rgba(139,111,212,.12)" },
    arquivado: { lbl:"Arquivado", cor:"var(--tx4)",  bg:"rgba(60,64,80,.12)"   },
  };

  const TIPO_CFG = {
    presbiteros: "Presbíteros",
    diaconos:    "Diáconos",
    ambos:       "Ambos",
  };

  function _statusBadge(st) {
    const c = STATUS_CFG[st] || STATUS_CFG.rascunho;
    return `<span style="font-size:10px;padding:2px 9px;border-radius:8px;background:${c.bg};color:${c.cor};font-weight:700">${c.lbl}</span>`;
  }

  function _btn(label, onclick, style="") {
    return `<button onclick="${onclick}" style="padding:8px 16px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--tx2);font-size:12px;cursor:pointer;font-family:inherit;${style}">${label}</button>`;
  }

  function _btnPri(label, onclick) {
    return `<button onclick="${onclick}" style="padding:8px 18px;border-radius:7px;border:none;background:var(--sky);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">${label}</button>`;
  }

  /* ── API ─────────────────────────────────────────────── */
  async function _apiGet(table, query="") {
    const sb = _sb();
    let q = sb.from(table).select("*");
    return q;
  }

  async function _carregarProcessos() {
    const { data } = await _sb()
      .from("eleicao_processos")
      .select("*")
      .is("deleted_at", null)
      .order("ano", { ascending: false })
      .order("criado_em", { ascending: false });
    _processos = data || [];
  }

  async function _carregarIndicacoes(processoId) {
    let q = _sb()
      .from("eleicao_indicacoes")
      .select("*")
      .is("deleted_at", null)
      .order("criado_em", { ascending: false });
    if (processoId) q = q.eq("processo_id", processoId);
    const { data, error } = await q;
    if (error) console.error("[eleicoes] _carregarIndicacoes:", error.code, error.message);
    _indicacoes = data || [];
  }

  async function _carregarMembros() {
    if (_membros.length) return;
    const { data } = await _sb()
      .from("v_membros")
      .select("pessoa_id,nome,congregacao")
      .eq("status","ativo")
      .limit(2000);
    _membros = data || [];
  }

  async function _carregarCandidatos(processoId) {
    const { data } = await _sb()
      .from("eleicao_candidatos")
      .select("*")
      .is("deleted_at", null)
      .eq("processo_id", processoId)
      .order("ordem")
      .order("criado_em");
    _candidatos = data || [];
  }

  async function _carregarVotacaoConfig(processoId) {
    const { data } = await _sb()
      .from("eleicao_votacao_config")
      .select("*")
      .eq("processo_id", processoId)
      .maybeSingle();
    _votacaoConfig = data || null;
  }

  /* ── Navegação interna ───────────────────────────────── */
  function _show(view, processoId) {
    _nav = view;
    const r = _root();
    if (!r) return;
    r.innerHTML = `<div style="padding:32px;text-align:center;color:var(--tx3)"><span style="display:inline-block;width:22px;height:22px;border:2px solid var(--bd2);border-top-color:var(--sky);border-radius:50%;animation:spin .7s linear infinite"></span></div>`;
    if      (view === "lista")    _renderLista();
    else if (view === "historico") _renderHistorico();
    else if (view === "form")     _renderForm(_editando ? _processo : null);
    else if (view === "detalhe")  _carregarEDetalhe(processoId || _processo?.id);
  }

  /* ═══════════════════════════════════════════════════════
     LISTA DE PROCESSOS
  ═══════════════════════════════════════════════════════ */

  async function _renderLista() {
    const r = _root();
    if (!r) return;
    await _carregarProcessos();

    const ativos  = _processos.filter(p => ["aberto","agendado","rascunho"].includes(p.status));
    const outros  = _processos.filter(p => ["encerrado","arquivado"].includes(p.status)).slice(0,3);

    r.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--tx1)">Processos Eleitorais</div>
          <div style="font-size:12px;color:var(--tx3);margin-top:2px">${_processos.length} processo(s) registrado(s)</div>
        </div>
        <div style="display:flex;gap:8px">
          ${_btn("Histórico", "eleicaoNavHistorico()")}
          ${_btnPri("+ Novo Processo", "eleicaoNavNovo()")}
        </div>
      </div>

      ${ativos.length ? `
        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px">
          ${ativos.map(p => _processoCard(p, true)).join("")}
        </div>` : `
        <div style="background:var(--bg-surface);border:1.5px dashed var(--bd2);border-radius:12px;padding:40px;text-align:center;margin-bottom:20px">
          <div style="font-size:28px;margin-bottom:10px">⊞</div>
          <div style="font-size:14px;font-weight:700;color:var(--tx2);margin-bottom:6px">Nenhum processo ativo</div>
          <div style="font-size:12px;color:var(--tx3);margin-bottom:16px">Crie o primeiro processo eleitoral da IPPenha.</div>
          ${_btnPri("+ Novo Processo", "eleicaoNavNovo()")}
        </div>`}

      ${outros.length ? `
        <div style="border-top:1px solid var(--bd1);padding-top:14px">
          <div style="font-size:11px;font-weight:700;color:var(--tx4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Recentes encerrados</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${outros.map(p => _processoCard(p, false)).join("")}
          </div>
          <button onclick="eleicaoNavHistorico()" style="margin-top:10px;background:none;border:none;color:var(--sky);font-size:12px;cursor:pointer;padding:0">Ver histórico completo →</button>
        </div>` : ""}`;
  }

  function _processoCard(p, destaque) {
    const isAberto   = p.status === "aberto";
    const isEditavel = !["encerrado","arquivado"].includes(p.status);
    const nomeEsc    = _esc(p.nome).replace(/'/g, "&#39;");
    const menuId     = `card-menu-${p.id}`;

    const menuItem = (label, onclick, danger=false) =>
      `<button onclick="event.stopPropagation();eleicaoCloseMenus();${onclick}"
        style="display:block;width:100%;text-align:left;padding:9px 14px;background:none;border:none;font-size:12.5px;color:${danger?"var(--rose)":"var(--tx1)"};cursor:pointer;font-family:inherit;white-space:nowrap"
        onmouseover="this.style.background='var(--bg-hover)'"
        onmouseout="this.style.background=''">${label}</button>`;

    return `
      <div onclick="eleicaoNavDetalhe('${p.id}')"
        style="background:var(--bg-card);border:1px solid ${destaque?"var(--bd2)":"var(--bd1)"};border-radius:12px;padding:${destaque?"18px":"14px"} 20px;cursor:pointer;transition:border-color .15s;${isAberto?"border-left:3px solid var(--gr)":""}"
        onmouseover="this.style.borderColor='var(--sky)'" onmouseout="this.style.borderColor='${destaque?"var(--bd2)":"var(--bd1)"}'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
              ${_statusBadge(p.status)}
              <span style="font-size:10px;color:var(--tx3)">${TIPO_CFG[p.tipo]||"Ambos"} · ${p.ano}</span>
            </div>
            <div style="font-size:${destaque?"14px":"13px"};font-weight:700;color:var(--tx1);margin-bottom:${p.descricao?"4px":"0"}">${_esc(p.nome)}</div>
            ${p.descricao ? `<div style="font-size:12px;color:var(--tx3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:400px">${_esc(p.descricao)}</div>` : ""}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
            ${p.data_encerramento ? `<span style="font-size:10px;color:var(--tx3)">Encerra ${_fmtDate(p.data_encerramento)}</span>` : ""}
            <div style="position:relative">
              <button onclick="event.stopPropagation();eleicaoToggleMenu('${p.id}')"
                style="background:none;border:1px solid var(--bd2);border-radius:6px;padding:3px 10px;cursor:pointer;color:var(--tx3);font-size:16px;line-height:1.2;font-family:inherit;letter-spacing:1px"
                title="Ações">⋯</button>
              <div id="${menuId}" style="display:none;position:absolute;right:0;top:calc(100% + 4px);z-index:200;background:var(--bg-card);border:1px solid var(--bd2);border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.18);min-width:160px;overflow:hidden;padding:4px 0">
                ${menuItem("Ver detalhes", `eleicaoNavDetalhe('${p.id}')`)}
                ${isEditavel ? menuItem("✏ Editar", `eleicaoNavEditar('${p.id}')`) : ""}
                ${menuItem("Duplicar", `eleicaoDuplicar('${p.id}',event)`)}
                <div style="height:1px;background:var(--bd1);margin:4px 0"></div>
                ${menuItem("Excluir processo", `eleicaoExcluirProcesso('${p.id}','${nomeEsc}')`, true)}
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ═══════════════════════════════════════════════════════
     HISTÓRICO
  ═══════════════════════════════════════════════════════ */

  async function _renderHistorico() {
    const r = _root();
    if (!r) return;
    await _carregarProcessos();

    const thS = "text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);font-weight:700;white-space:nowrap";
    const tdS = "padding:8px 10px;font-size:12.5px;color:var(--tx2)";

    r.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--tx1)">Histórico de Processos</div>
          <div style="font-size:12px;color:var(--tx3);margin-top:2px">Memória institucional completa</div>
        </div>
        <div style="display:flex;gap:8px">
          ${_btn("← Processos", "eleicaoNavLista()")}
          ${_btnPri("+ Novo Processo", "eleicaoNavNovo()")}
        </div>
      </div>
      <div class="card">
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:var(--bg-surface);border-bottom:2px solid var(--sky)">
                <th style="${thS}">Ano</th>
                <th style="${thS}">Processo</th>
                <th style="${thS}">Tipo</th>
                <th style="${thS}">Status</th>
                <th style="${thS}">Abertura</th>
                <th style="${thS}">Encerramento</th>
                <th style="${thS}">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${_processos.length ? _processos.map(p => `
                <tr style="border-bottom:1px solid var(--bd1);cursor:pointer"
                  onmouseover="this.style.background='var(--bg-hover)'"
                  onmouseout="this.style.background=''">
                  <td style="${tdS};font-weight:700;color:var(--tx1)">${p.ano}</td>
                  <td style="${tdS};font-weight:600;color:var(--tx1)" onclick="eleicaoNavDetalhe('${p.id}')">${_esc(p.nome)}</td>
                  <td style="${tdS}">${TIPO_CFG[p.tipo]||"Ambos"}</td>
                  <td style="padding:8px 10px">${_statusBadge(p.status)}</td>
                  <td style="${tdS};font-size:11px">${_fmtDate(p.data_abertura)}</td>
                  <td style="${tdS};font-size:11px">${_fmtDate(p.data_encerramento)}</td>
                  <td style="padding:8px 10px">
                    <div style="display:flex;gap:6px">
                      <button onclick="eleicaoNavDetalhe('${p.id}')" style="background:none;border:1px solid var(--bd2);border-radius:5px;padding:3px 8px;font-size:11px;color:var(--tx2);cursor:pointer" title="Ver">Ver</button>
                      <button onclick="eleicaoDuplicar('${p.id}',event)" style="background:none;border:1px solid var(--bd2);border-radius:5px;padding:3px 8px;font-size:11px;color:var(--tx2);cursor:pointer" title="Duplicar">Dup.</button>
                    </div>
                  </td>
                </tr>`).join("") : `
                <tr><td colspan="7" style="text-align:center;padding:28px;color:var(--tx3)">Nenhum processo registrado.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  /* ═══════════════════════════════════════════════════════
     FORMULÁRIO CRIAR / EDITAR
  ═══════════════════════════════════════════════════════ */

  function _renderForm(processo) {
    const r = _root();
    if (!r) return;
    const anoAtual = new Date().getFullYear();
    const p = processo || {};
    const titulo = p.id ? "Editar Processo" : "Novo Processo Eleitoral";

    const inp = "width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:13px;box-sizing:border-box;outline:none;font-family:inherit";
    const lbl = "display:block;font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px";
    const field = (label, content, req) =>
      `<div style="margin-bottom:14px"><label style="${lbl}">${label}${req?` <span style="color:var(--rose)">*</span>`:""}</label>${content}</div>`;

    const tipoOpts = [["presbiteros","Presbíteros"],["diaconos","Diáconos"],["ambos","Ambos"]];
    const statusOpts = [["rascunho","Rascunho"],["agendado","Agendado"],["aberto","Aberto"],["encerrado","Encerrado"],["arquivado","Arquivado"]];

    r.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div style="font-size:15px;font-weight:700;color:var(--tx1)">${titulo}</div>
        ${_btn("← Cancelar", "eleicaoNavLista()")}
      </div>
      <div class="card" style="max-width:640px">
        <div style="display:grid;grid-template-columns:1fr 120px;gap:12px">
          ${field("Nome do Processo", `<input id="ep-nome" style="${inp}" value="${_esc(p.nome||"")}" placeholder="Ex: Eleição de Oficiais 2026">`, true)}
          ${field("Ano", `<input id="ep-ano" type="number" style="${inp}" value="${p.ano||anoAtual}" min="2020" max="2099">`, true)}
        </div>
        ${field("Descrição", `<textarea id="ep-desc" style="${inp};resize:vertical;min-height:70px">${_esc(p.descricao||"")}</textarea>`)}
        ${field("Orientações (exibidas na página pública)", `<textarea id="ep-ori" style="${inp};resize:vertical;min-height:80px" placeholder="Ex: Indique membros com caráter reconhecido e que exercem diaconia...">${_esc(p.orientacoes||"")}</textarea>`)}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <div style="${lbl}">Tipo de Ofício <span style="color:var(--rose)">*</span></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${tipoOpts.map(([v,l]) => `
                <label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:7px;border:1.5px solid ${(p.tipo||"ambos")===v?"var(--sky)":"var(--bd2)"};background:${(p.tipo||"ambos")===v?"rgba(74,156,245,.08)":"var(--bg-surface)"};cursor:pointer;font-size:12.5px;color:${(p.tipo||"ambos")===v?"var(--sky)":"var(--tx2)"};font-weight:500" onclick="eleicaoSetTipoForm('${v}')">
                  <input type="radio" name="ep-tipo" value="${v}" ${(p.tipo||"ambos")===v?"checked":""} style="accent-color:var(--sky)"> ${l}
                </label>`).join("")}
            </div>
          </div>
          <div>
            <div style="${lbl}">Status</div>
            <select id="ep-status" style="${inp}">
              ${statusOpts.map(([v,l]) => `<option value="${v}" ${(p.status||"rascunho")===v?"selected":""}>${l}</option>`).join("")}
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">
          ${field("Data de Abertura", `<input id="ep-abertura" type="date" style="${inp}" value="${p.data_abertura||""}">`)}
          ${field("Data de Encerramento", `<input id="ep-encerramento" type="date" style="${inp}" value="${p.data_encerramento||""}">`)}
        </div>
        ${field("Slug (URL pública)", `
          <div style="display:flex;gap:8px;align-items:center">
            <input id="ep-slug" style="${inp}" value="${_esc(p.slug||"")}" placeholder="Ex: eleicao-2026">
            <button onclick="eleicaoGerarSlug()" style="padding:10px 12px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--tx3);font-size:11px;cursor:pointer;white-space:nowrap">↺ Gerar</button>
          </div>
          <div style="font-size:11px;color:var(--tx3);margin-top:5px">Link público: <span style="color:var(--sky)" id="ep-slug-preview">${BASE_URL}${_esc(p.slug||"")}</span></div>`, true)}
        <div style="border-top:1px solid var(--bd1);padding-top:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          ${_btnPri(p.id ? "Salvar alterações" : "Criar Processo", "eleicaoSalvarProcesso()")}
          ${_btn("Cancelar", "eleicaoNavLista()")}
          <div id="ep-msg" style="font-size:12px"></div>
        </div>
      </div>`;

    // slug preview update
    const slugInp = document.getElementById("ep-slug");
    if (slugInp) slugInp.addEventListener("input", () => {
      const prev = document.getElementById("ep-slug-preview");
      if (prev) prev.textContent = BASE_URL + slugInp.value;
    });
  }

  window.eleicaoSetTipoForm = function(v) {
    document.querySelectorAll("[name='ep-tipo']").forEach(r => {
      const lbl = r.closest("label");
      const sel = r.value === v;
      if (lbl) {
        lbl.style.borderColor = sel ? "var(--sky)" : "var(--bd2)";
        lbl.style.background  = sel ? "rgba(74,156,245,.08)" : "var(--bg-surface)";
        lbl.style.color       = sel ? "var(--sky)" : "var(--tx2)";
      }
    });
  };

  window.eleicaoGerarSlug = function() {
    const nome = document.getElementById("ep-nome")?.value || "eleicao";
    const ano  = document.getElementById("ep-ano")?.value  || new Date().getFullYear();
    const slug = _slugUnique(_slugBase(nome, ano));
    const inp  = document.getElementById("ep-slug");
    const prev = document.getElementById("ep-slug-preview");
    if (inp)  inp.value = slug;
    if (prev) prev.textContent = BASE_URL + slug;
  };

  window.eleicaoSalvarProcesso = async function() {
    const msgEl = document.getElementById("ep-msg");
    const nome  = document.getElementById("ep-nome")?.value?.trim();
    const ano   = parseInt(document.getElementById("ep-ano")?.value);
    const slug  = document.getElementById("ep-slug")?.value?.trim();
    const tipo  = document.querySelector("[name='ep-tipo']:checked")?.value || "ambos";

    if (!nome) { msgEl.textContent = "Nome obrigatório."; msgEl.style.color = "var(--rose)"; return; }
    if (!ano || ano < 2020) { msgEl.textContent = "Ano inválido."; msgEl.style.color = "var(--rose)"; return; }
    if (!slug) { msgEl.textContent = "Slug obrigatório."; msgEl.style.color = "var(--rose)"; return; }

    const payload = {
      nome,
      ano,
      descricao:         document.getElementById("ep-desc")?.value?.trim() || null,
      orientacoes:       document.getElementById("ep-ori")?.value?.trim()  || null,
      tipo,
      status:            document.getElementById("ep-status")?.value || "rascunho",
      data_abertura:     document.getElementById("ep-abertura")?.value    || null,
      data_encerramento: document.getElementById("ep-encerramento")?.value || null,
      slug,
      atualizado_em:     new Date().toISOString(),
    };

    const btn = document.querySelector("[onclick='eleicaoSalvarProcesso()']");
    if (btn) btn.disabled = true;
    msgEl.textContent = "Salvando...";
    msgEl.style.color = "var(--tx3)";

    try {
      const sb = _sb();
      if (_processo?.id) {
        const { error } = await sb.from("eleicao_processos").update(payload).eq("id", _processo.id);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await sb.from("eleicao_processos").insert(payload).select().single();
        if (error) throw new Error(error.message);
        _processo = data;
      }
      if (typeof T === "function") T("Processo salvo!", nome);
      await _carregarProcessos();
      _processo = _processos.find(p => p.slug === slug) || _processo;
      _show("detalhe");
    } catch (e) {
      msgEl.textContent = "Erro: " + e.message;
      msgEl.style.color = "var(--rose)";
      if (btn) btn.disabled = false;
    }
  };

  /* ═══════════════════════════════════════════════════════
     DETALHE DO PROCESSO
  ═══════════════════════════════════════════════════════ */

  async function _carregarEDetalhe(processoId) {
    if (!processoId) { _show("lista"); return; }
    await _carregarProcessos();
    _processo = _processos.find(p => p.id === processoId);
    if (!_processo) { _show("lista"); return; }
    await Promise.all([
      _carregarIndicacoes(processoId),
      _carregarMembros(),
      _carregarCandidatos(processoId),
      _carregarVotacaoConfig(processoId),
    ]);
    _renderDetalhe();
  }

  function _renderDetalhe() {
    const r = _root();
    const p = _processo;
    if (!r || !p) return;

    const link   = BASE_URL + p.slug;
    const isEditavel = !["encerrado","arquivado"].includes(p.status);

    r.innerHTML = `
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:14px">
        <div>
          <button onclick="eleicaoNavLista()" style="background:none;border:none;color:var(--tx3);font-size:12px;cursor:pointer;padding:0;margin-bottom:8px">← Processos</button>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div style="font-size:16px;font-weight:800;color:var(--tx1)">${_esc(p.nome)}</div>
            ${_statusBadge(p.status)}
          </div>
          <div style="font-size:12px;color:var(--tx3);margin-top:4px">${TIPO_CFG[p.tipo]||"Ambos"} · ${p.ano}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          ${isEditavel ? _btn("✏ Editar", `eleicaoNavEditar('${p.id}')`) : ""}
          ${_btn("Duplicar", `eleicaoDuplicar('${p.id}',event)`)}
        </div>
      </div>
      <!-- Timeline de Fases -->
      ${_renderTimeline()}
      <!-- Sub-tabs -->
      <div class="bnav" style="--mc:var(--sky);margin-bottom:16px">
        <div class="bni ${_detTab==="stats"?"on":""}"        id="edt-stats" onclick="eleicaoDetTab('stats')">Estatísticas</div>
        <div class="bni ${_detTab==="indicacoes"?"on":""}"   id="edt-ind"   onclick="eleicaoDetTab('indicacoes')">Indicações</div>
        <div class="bni ${_detTab==="candidatos"?"on":""}"   id="edt-cand"  onclick="eleicaoDetTab('candidatos')">Candidatos</div>
        <div class="bni ${_detTab==="votacao"?"on":""}"      id="edt-vot"   onclick="eleicaoDetTab('votacao')">Votação</div>
        <div class="bni ${_detTab==="compartilhar"?"on":""}" id="edt-comp"  onclick="eleicaoDetTab('compartilhar')">Compartilhar</div>
      </div>
      <div id="edt-content"></div>`;

    _renderDetTab();
  }

  window.eleicaoDetTab = function(tab) {
    _detTab = tab;
    const tabMap = { stats:"stats", indicacoes:"ind", candidatos:"cand", votacao:"vot", compartilhar:"comp" };
    Object.keys(tabMap).forEach(t => {
      document.getElementById(`edt-${tabMap[t]}`)?.classList.toggle("on", t === tab);
    });
    _renderDetTab();
  };

  function _renderDetTab() {
    if      (_detTab === "stats")        _renderStats();
    else if (_detTab === "indicacoes")   _renderIndicacoesTab();
    else if (_detTab === "candidatos")   _renderCandidatosTab();
    else if (_detTab === "votacao")      _renderVotacaoTab();
    else if (_detTab === "compartilhar") _renderCompartilhar();
  }

  /* ── Stats ─────────────────────────────────────────── */
  function _renderStats() {
    const el = document.getElementById("edt-content");
    if (!el) return;
    const p = _processo;

    const total      = _indicacoes.length;
    const presb      = _indicacoes.filter(i => i.tipo === "presbitero").length;
    const diac       = _indicacoes.filter(i => i.tipo === "diacono").length;
    const indicantes = new Set(_indicacoes.map(i => i.indicante_pessoa_id).filter(Boolean)).size;

    // Ranking
    const cnt = {};
    _indicacoes.forEach(i => {
      const k = `${i.indicado_nome}||${i.tipo}`;
      if (!cnt[k]) cnt[k] = { nome: i.indicado_nome, tipo: i.tipo, n: 0 };
      cnt[k].n++;
    });
    const ranking = Object.values(cnt).sort((a,b) => b.n - a.n).slice(0, 10);

    // Por congregação
    const byCong = {};
    _indicacoes.forEach(i => {
      const c = i.congregacao || "Sede";
      byCong[c] = (byCong[c] || 0) + 1;
    });
    const congList = Object.entries(byCong).sort((a,b)=>b[1]-a[1]);

    // Evolução diária (últimos 14 dias)
    const byDia = {};
    _indicacoes.forEach(i => {
      const d = i.criado_em?.slice(0,10);
      if (d) byDia[d] = (byDia[d] || 0) + 1;
    });
    const dias = Object.keys(byDia).sort().slice(-14);
    const maxDia = Math.max(...Object.values(byDia), 1);

    el.innerHTML = `
      <div class="kpis c4" style="margin-bottom:16px">
        <div class="kpi"><div class="kpi-ico" style="background:rgba(74,156,245,.12);color:var(--sky)">◎</div><div class="kpi-body"><div class="kpi-lbl">Total indicações</div><div class="kpi-val">${total}</div><div class="kpi-d nu">${indicantes} membro(s) participaram</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(42,181,192,.12);color:var(--teal)">◈</div><div class="kpi-body"><div class="kpi-lbl">Presbíteros</div><div class="kpi-val">${presb}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(139,111,212,.12);color:var(--violet)">◉</div><div class="kpi-body"><div class="kpi-lbl">Diáconos</div><div class="kpi-val">${diac}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(58,170,92,.12);color:var(--gr)">✓</div><div class="kpi-body"><div class="kpi-lbl">Participantes</div><div class="kpi-val">${indicantes}</div></div></div>
      </div>

      <div class="g2">
        ${ranking.length ? `
        <div class="card">
          <div class="ctit">Mais Indicados</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
            ${ranking.map((r,i) => {
              const cor = r.tipo === "presbitero" ? "var(--sky)" : "var(--teal)";
              const max = ranking[0].n;
              return `<div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:10px;color:var(--tx4);width:18px;text-align:right;font-weight:700">${i+1}.</span>
                <div style="flex:1">
                  <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                    <span style="font-size:12px;color:var(--tx1);font-weight:600">${_esc(r.nome)}</span>
                    <span style="font-size:10px;padding:1px 8px;border-radius:8px;border:1px solid ${cor}44;color:${cor};background:${cor}11;white-space:nowrap;margin-left:8px">${r.tipo==="presbitero"?"Presb.":"Diác."} · ${r.n}x</span>
                  </div>
                  <div style="background:var(--bg-surface);border-radius:3px;height:5px">
                    <div style="height:100%;background:${cor};border-radius:3px;width:${Math.round(r.n/max*100)}%;opacity:.65"></div>
                  </div>
                </div>
              </div>`;
            }).join("")}
          </div>
        </div>` : ""}

        <div style="display:flex;flex-direction:column;gap:14px">
          ${congList.length ? `
          <div class="card">
            <div class="ctit">Por Congregação</div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
              ${congList.map(([c,n]) => `
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px">
                  <span style="color:var(--tx2)">${_esc(c)}</span>
                  <span style="color:var(--sky);font-weight:700">${n}</span>
                </div>`).join("")}
            </div>
          </div>` : ""}

          ${dias.length ? `
          <div class="card">
            <div class="ctit">Evolução diária</div>
            <div style="display:flex;align-items:flex-end;gap:4px;height:70px;margin-top:10px">
              ${dias.map(d => {
                const n = byDia[d] || 0;
                const h = Math.max(4, Math.round(n/maxDia*60));
                const [,m,dia] = d.split("-");
                return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px" title="${d}: ${n}">
                  <div style="width:100%;background:var(--sky);border-radius:2px 2px 0 0;height:${h}px;opacity:.75"></div>
                  <span style="font-size:8px;color:var(--tx4)">${dia}/${m}</span>
                </div>`;
              }).join("")}
            </div>
          </div>` : ""}
        </div>
      </div>

      ${!total ? `<div style="text-align:center;padding:40px;color:var(--tx3);font-size:13px">Nenhuma indicação registrada ainda.</div>` : ""}`;
  }

  /* ── Indicações ─────────────────────────────────────── */
  function _renderIndicacoesTab() {
    const el = document.getElementById("edt-content");
    if (!el) return;

    const congregs = [...new Set(_indicacoes.map(i => i.congregacao || "Sede"))];
    let rows = _indicacoes;
    if (_filtroTipo    !== "todos")  rows = rows.filter(i => i.tipo === _filtroTipo);
    if (_filtroCongreg !== "todas")  rows = rows.filter(i => (i.congregacao||"Sede") === _filtroCongreg);

    const si  = "padding:7px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px";
    const thS = "text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);font-weight:700";
    const tdS = "padding:8px 10px;font-size:12px;color:var(--tx2)";

    el.innerHTML = `
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div class="ctit" style="margin-bottom:0">Indicações <span style="font-size:11px;color:var(--tx3);font-weight:400">(${rows.length} de ${_indicacoes.length})</span></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <select onchange="eleicaoFiltroTipo(this.value)" style="${si}">
              <option value="todos">Todos os tipos</option>
              <option value="presbitero" ${_filtroTipo==="presbitero"?"selected":""}>Presbítero</option>
              <option value="diacono"    ${_filtroTipo==="diacono"?"selected":""}>Diácono</option>
            </select>
            <select onchange="eleicaoFiltroCongreg(this.value)" style="${si}">
              <option value="todas">Todas as congregações</option>
              ${congregs.map(c=>`<option value="${_esc(c)}" ${_filtroCongreg===c?"selected":""}>${_esc(c)}</option>`).join("")}
            </select>
            <button onclick="eleicaoExportar()" style="padding:7px 14px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--tx2);font-size:12px;cursor:pointer">⬇ CSV</button>
            <button onclick="eleicaoAtualizarDetalhe()" style="padding:7px 10px;border-radius:6px;border:none;background:var(--sky);color:#fff;font-size:12px;cursor:pointer" title="Atualizar">↻</button>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:var(--bg-surface);border-bottom:2px solid var(--sky)">
                <th style="${thS}">Nome Indicado</th>
                <th style="${thS}">Tipo</th>
                <th style="${thS}">Indicado por</th>
                <th style="${thS}">Congregação</th>
                <th style="${thS}">Data</th>
                <th style="${thS}"></th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map(row => {
                const cor = row.tipo==="presbitero" ? "var(--sky)" : "var(--teal)";
                const lbl = row.tipo==="presbitero" ? "Presbítero" : "Diácono";
                const nEsc = _esc(row.indicante_nome||"").replace(/'/g,"&#39;");
                return `<tr style="border-bottom:1px solid var(--bd1)"
                  onmouseover="this.style.background='var(--bg-hover)'"
                  onmouseout="this.style.background=''">
                  <td style="${tdS};font-weight:600;color:var(--tx1)">${_esc(row.indicado_nome)}</td>
                  <td style="${tdS}"><span style="font-size:10px;padding:2px 9px;border-radius:6px;border:1px solid ${cor}44;color:${cor};background:${cor}11">${lbl}</span></td>
                  <td style="${tdS}">${_esc(row.indicante_nome||"—")}</td>
                  <td style="${tdS};font-size:11px;color:var(--tx3)">${_esc(row.congregacao||"Sede")}</td>
                  <td style="${tdS};font-size:11px;white-space:nowrap">${_fmtDtHr(row.criado_em)}</td>
                  <td style="padding:8px 10px;text-align:right">
                    <button onclick="eleicaoExcluirIndicacao('${row.id}','${nEsc}')"
                      style="background:none;border:1px solid var(--bd2);border-radius:5px;padding:3px 8px;font-size:11px;color:var(--rose);cursor:pointer"
                      title="Excluir indicação">✕</button>
                  </td>
                </tr>`;
              }).join("") : `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--tx3)">Nenhuma indicação encontrada.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  /* ── Compartilhar ────────────────────────────────────── */
  function _renderCompartilhar() {
    const el = document.getElementById("edt-content");
    if (!el || !_processo) return;
    const p    = _processo;
    const link = BASE_URL + p.slug;
    const wa   = `https://wa.me/?text=${encodeURIComponent(`*${p.nome}*\n\nA IPPenha convida todos os membros a participar deste processo eleitoral.\n\nAcesse o formulário:\n${link}`)}`;
    const mail = `mailto:?subject=${encodeURIComponent(p.nome)}&body=${encodeURIComponent(`Prezado(a) membro,\n\nA Igreja Presbiteriana da Penha abre o processo: ${p.nome}.\n\nParticipe pelo link: ${link}`)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(link)}`;

    el.innerHTML = `
      <div class="card" style="max-width:560px">
        <div class="ctit">Compartilhar este Processo</div>
        <div style="margin-top:14px;display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
          <div style="flex-shrink:0;background:#fff;border-radius:10px;padding:6px;border:1px solid var(--bd2)">
            <img src="${qrUrl}" id="eleicao-qr" alt="QR Code" style="width:160px;height:160px;border-radius:6px;display:block">
          </div>
          <div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:10px">
            <div>
              <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Link público</div>
              <div style="display:flex;gap:8px;align-items:center">
                <input readonly value="${link}" style="flex:1;padding:9px 12px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--sky);font-size:12px;outline:none;min-width:0">
                <button onclick="eleicaoCopiarLink('${p.slug}')" style="padding:9px 14px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--tx2);font-size:12px;cursor:pointer;white-space:nowrap">Copiar</button>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <a href="${wa}" target="_blank" style="display:flex;align-items:center;gap:7px;padding:10px 16px;border-radius:8px;background:rgba(37,211,102,.1);border:1px solid rgba(37,211,102,.3);color:#25d366;font-size:12.5px;font-weight:600;text-decoration:none">
                📱 WhatsApp
              </a>
              <a href="${mail}" style="display:flex;align-items:center;gap:7px;padding:10px 16px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--bd2);color:var(--tx2);font-size:12.5px;font-weight:600;text-decoration:none">
                ✉ E-mail
              </a>
              <button onclick="eleicaoBaixarQR('${p.slug}','${_esc(p.nome)}')" style="display:flex;align-items:center;gap:7px;padding:10px 16px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--bd2);color:var(--tx2);font-size:12.5px;font-weight:600;cursor:pointer">
                ⬇ QR Code
              </button>
            </div>
            <div style="font-size:11.5px;color:var(--tx3);line-height:1.6;padding:10px 12px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--bd1)">
              ${p.status === "aberto"
                ? "✅ Este processo está <strong>aberto</strong>. Membros já podem acessar o link e indicar."
                : p.status === "rascunho" || p.status === "agendado"
                ? "⚠️ Processo ainda <strong>não está aberto</strong>. Altere o status antes de compartilhar."
                : "🔒 Processo <strong>encerrado</strong>. Novas indicações não são aceitas."}
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ── Actions globais ─────────────────────────────────── */
  window.eleicaoCopiarLink = function(slug) {
    navigator.clipboard.writeText(BASE_URL + slug).then(() => {
      if (typeof T === "function") T("Link copiado!", BASE_URL + slug);
    });
  };

  window.eleicaoBaixarQR = function(slug, nome) {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=12&data=${encodeURIComponent(BASE_URL + slug)}`;
    fetch(url).then(r => r.blob()).then(b => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `qr-eleicao-${slug}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  };

  window.eleicaoDuplicar = async function(id, ev) {
    if (ev) ev.stopPropagation();
    await _carregarProcessos();
    const orig = _processos.find(p => p.id === id);
    if (!orig) return;
    const novoAno  = orig.ano + 2;
    const novoNome = orig.nome.replace(String(orig.ano), String(novoAno));
    const novoSlug = _slugUnique(_slugBase(novoNome, novoAno));
    const payload  = {
      nome: novoNome, ano: novoAno,
      descricao: orig.descricao, orientacoes: orig.orientacoes,
      tipo: orig.tipo, status: "rascunho", slug: novoSlug,
    };
    const { data, error } = await _sb().from("eleicao_processos").insert(payload).select().single();
    if (error) { if (typeof T === "function") T("Erro", error.message); return; }
    if (typeof T === "function") T("Processo duplicado!", novoNome);
    _processo = data;
    _editando = true;
    await _carregarProcessos();
    _renderForm(data);
    _nav = "form";
  };

  window.eleicaoAtualizarDetalhe = async function() {
    if (!_processo) return;
    await Promise.all([
      _carregarIndicacoes(_processo.id),
      _carregarCandidatos(_processo.id),
      _carregarVotacaoConfig(_processo.id),
    ]);
    _renderDetTab();
  };

  window.eleicaoFiltroTipo    = function(v) { _filtroTipo    = v; _renderIndicacoesTab(); };
  window.eleicaoFiltroCongreg = function(v) { _filtroCongreg = v; _renderIndicacoesTab(); };

  window.eleicaoExcluirIndicacao = async function(id, indicanteNome) {
    if (!confirm(`Excluir a indicação de "${indicanteNome}"?\n\nEsta ação libera o membro para indicar novamente.`)) return;
    const { error } = await _sb().from("eleicao_indicacoes").delete().eq("id", id);
    if (error) { alert("Erro ao excluir: " + error.message); return; }
    _indicacoes = _indicacoes.filter(i => i.id !== id);
    _renderIndicacoesTab();
    if (typeof T === "function") T("Indicação excluída", indicanteNome);
  };

  window.eleicaoExportar = function() {
    let rows = _indicacoes;
    if (_filtroTipo    !== "todos")  rows = rows.filter(i => i.tipo === _filtroTipo);
    if (_filtroCongreg !== "todas")  rows = rows.filter(i => (i.congregacao||"Sede") === _filtroCongreg);
    if (!rows.length) return;
    const hdr  = "Processo,Nome Indicado,Tipo,Indicado por,Congregação,Data,Observação";
    const body = rows.map(r => [
      `"${(_processo?.nome||"").replace(/"/g,'""')}"`,
      `"${(r.indicado_nome||"").replace(/"/g,'""')}"`,
      r.tipo === "presbitero" ? "Presbítero" : "Diácono",
      `"${(r.indicante_nome||"").replace(/"/g,'""')}"`,
      `"${(r.congregacao||"Sede").replace(/"/g,'""')}"`,
      _fmtDtHr(r.criado_em),
      `"${(r.observacao||"").replace(/"/g,'""')}"`,
    ].join(",")).join("\n");
    const csv  = "﻿" + hdr + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `indicacoes-${_processo?.slug||"eleicao"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  window.eleicaoToggleMenu = function(id) {
    const menu = document.getElementById(`card-menu-${id}`);
    if (!menu) return;
    const isOpen = menu.style.display !== "none";
    document.querySelectorAll("[id^='card-menu-']").forEach(m => m.style.display = "none");
    if (!isOpen) menu.style.display = "block";
  };

  window.eleicaoCloseMenus = function() {
    document.querySelectorAll("[id^='card-menu-']").forEach(m => m.style.display = "none");
  };

  window.eleicaoExcluirProcesso = async function(id, nome) {
    const { count } = await _sb()
      .from("eleicao_indicacoes")
      .select("*", { count: "exact", head: true })
      .eq("processo_id", id)
      .is("deleted_at", null);

    let msg = `Excluir o processo "${nome}"?`;
    if (count > 0) msg += `\n\n⚠️ Há ${count} indicação(ões) vinculada(s). Elas continuarão no banco mas o processo ficará inacessível.`;
    msg += "\n\nEsta ação não pode ser desfeita.";
    if (!confirm(msg)) return;

    const { error } = await _sb().rpc("excluir_processo_eleitoral", { p_id: id });

    if (error) { alert("Erro ao excluir: " + error.message); return; }
    if (typeof T === "function") T("Processo excluído", nome);
    _processos = _processos.filter(p => p.id !== id);
    _renderLista();
  };

  /* ══════════════════════════════════════════════════════
     TIMELINE DE FASES
  ══════════════════════════════════════════════════════ */

  function _renderTimeline() {
    const p  = _processo;
    const vc = _votacaoConfig;

    const ind_done   = ["encerrado","arquivado","apurado"].includes(p.status);
    const ind_active = p.status === "aberto" || p.status === "agendado";

    const candAtivos = _candidatos.filter(c => c.ativo).length;
    const cand_done  = candAtivos > 0 && vc && vc.status_votacao !== "rascunho";
    const cand_active = ind_done && candAtivos === 0;

    const vot_done   = vc && ["encerrada","apurada"].includes(vc.status_votacao);
    const vot_active = vc && vc.status_votacao === "aberta";

    const apr_done   = vc && vc.status_votacao === "apurada";
    const apr_active = vc && vc.status_votacao === "encerrada";

    const fases = [
      {
        icon:"📋", fase:"Fase 1", label:"Indicações",
        sub: ind_done ? "Encerrado" : ind_active ? "Em andamento" : "Pendente",
        done: ind_done, active: ind_active,
        nav: () => eleicaoDetTab("indicacoes"),
      },
      {
        icon:"✓", fase:"Fase 2", label:"Candidatos",
        sub: cand_done ? `${candAtivos} homologado(s)` : candAtivos ? `${candAtivos} cadastrado(s)` : ind_done ? "Aguardando" : "—",
        done: cand_done, active: cand_active || (ind_done && candAtivos > 0 && !cand_done),
        nav: () => eleicaoDetTab("candidatos"),
      },
      {
        icon:"🗳", fase:"Fase 3", label:"Votação",
        sub: vot_done ? "Encerrada" : vot_active ? "Em andamento" : vc ? "Configurada" : "Não configurada",
        done: vot_done, active: vot_active,
        nav: () => eleicaoDetTab("votacao"),
      },
      {
        icon:"📊", fase:"Fase 4", label:"Apuração",
        sub: apr_done ? "Concluída" : apr_active ? "Pendente" : "—",
        done: apr_done, active: apr_active,
        nav: () => eleicaoDetTab("votacao"),
      },
    ];

    return `
      <div style="display:flex;align-items:stretch;margin-bottom:18px;background:var(--bg-surface);border:1px solid var(--bd1);border-radius:12px;overflow:hidden">
        ${fases.map((f, i) => `
          <div onclick="eleicaoDetTab('${["indicacoes","candidatos","votacao","votacao"][i]}')"
            style="flex:1;padding:11px 14px;border-right:${i<3?"1px solid var(--bd1)":"none"};
                   border-left:${f.done?"3px solid var(--gr)":f.active?"3px solid var(--sky)":"3px solid transparent"};
                   background:${f.done?"rgba(58,170,92,.03)":f.active?"rgba(74,156,245,.04)":"none"};
                   cursor:pointer;transition:background .15s;min-width:0"
            onmouseover="this.style.background='var(--bg-hover)'"
            onmouseout="this.style.background='${f.done?"rgba(58,170,92,.03)":f.active?"rgba(74,156,245,.04)":"none"}'">
            <div style="font-size:16px;opacity:${f.done||f.active?1:.35};margin-bottom:4px">${f.icon}</div>
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--tx4);margin-bottom:2px">${f.fase}</div>
            <div style="font-size:11px;font-weight:700;color:${f.done?"var(--gr)":f.active?"var(--sky)":"var(--tx3)"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.label}</div>
            <div style="font-size:10px;color:var(--tx4);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.sub}</div>
          </div>`).join("")}
      </div>`;
  }

  /* ══════════════════════════════════════════════════════
     ABA CANDIDATOS
  ══════════════════════════════════════════════════════ */

  function _renderCandidatosTab() {
    const el = document.getElementById("edt-content");
    if (!el) return;

    let rows = _candidatos;
    if (_candFiltroTipo !== "todos") rows = rows.filter(c => c.tipo === _candFiltroTipo);

    const total  = _candidatos.length;
    const presb  = _candidatos.filter(c => c.tipo === "presbitero").length;
    const diac   = _candidatos.filter(c => c.tipo === "diacono").length;
    const ativos = _candidatos.filter(c => c.ativo).length;

    const si  = "padding:7px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px";
    const thS = "text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);font-weight:700";
    const tdS = "padding:8px 10px;font-size:12.5px;color:var(--tx2)";

    el.innerHTML = `
      <div class="kpis c4" style="margin-bottom:16px">
        <div class="kpi"><div class="kpi-ico" style="background:rgba(74,156,245,.12);color:var(--sky)">◎</div><div class="kpi-body"><div class="kpi-lbl">Total</div><div class="kpi-val">${total}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(42,181,192,.12);color:var(--teal)">◈</div><div class="kpi-body"><div class="kpi-lbl">Presbíteros</div><div class="kpi-val">${presb}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(139,111,212,.12);color:var(--violet)">◉</div><div class="kpi-body"><div class="kpi-lbl">Diáconos</div><div class="kpi-val">${diac}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(58,170,92,.12);color:var(--gr)">✓</div><div class="kpi-body"><div class="kpi-lbl">Ativos</div><div class="kpi-val">${ativos}</div></div></div>
      </div>
      <div id="cand-panel" style="display:none"></div>
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div class="ctit" style="margin-bottom:0">Lista de Candidatos <span style="font-size:11px;color:var(--tx3);font-weight:400">(${rows.length})</span></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <select onchange="eleicaoCandFiltroTipo(this.value)" style="${si}">
              <option value="todos">Todos os tipos</option>
              <option value="presbitero" ${_candFiltroTipo==="presbitero"?"selected":""}>Presbítero</option>
              <option value="diacono"    ${_candFiltroTipo==="diacono"?"selected":""}>Diácono</option>
            </select>
            ${_btn("⬇ Importar das Indicações", "eleicaoAbrirImportarIndicacoes()")}
            ${_btnPri("+ Adicionar manualmente", "eleicaoAbrirAdicionarCandidato()")}
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:var(--bg-surface);border-bottom:2px solid var(--sky)">
                <th style="${thS};width:36px">#</th>
                <th style="${thS}">Nome</th>
                <th style="${thS}">Tipo</th>
                <th style="${thS}">Congregação</th>
                <th style="${thS}">Origem</th>
                <th style="${thS}">Status</th>
                <th style="${thS}"></th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map((c, i) => {
                const cor  = c.tipo === "presbitero" ? "var(--sky)" : "var(--teal)";
                const lbl  = c.tipo === "presbitero" ? "Presbítero" : "Diácono";
                const nEsc = _esc(c.nome).replace(/'/g,"&#39;");
                return `<tr style="border-bottom:1px solid var(--bd1);opacity:${c.ativo?1:.5}"
                  onmouseover="this.style.background='var(--bg-hover)'"
                  onmouseout="this.style.background=''">
                  <td style="${tdS};font-size:11px;color:var(--tx4);font-weight:700">${i+1}</td>
                  <td style="${tdS};font-weight:600;color:var(--tx1)">${_esc(c.nome)}</td>
                  <td style="${tdS}"><span style="font-size:10px;padding:2px 9px;border-radius:6px;border:1px solid ${cor}44;color:${cor};background:${cor}11">${lbl}</span></td>
                  <td style="${tdS};font-size:11px;color:var(--tx3)">${_esc(c.congregacao||"Sede")}</td>
                  <td style="${tdS};font-size:11px">${c.origem === "manual" ? "Manual" : "Indicação"}</td>
                  <td style="${tdS}">
                    <span style="font-size:10px;padding:2px 9px;border-radius:6px;background:${c.ativo?"rgba(58,170,92,.12)":"rgba(138,145,158,.12)"};color:${c.ativo?"var(--gr)":"var(--tx3)"}">
                      ${c.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td style="padding:8px 10px">
                    <div style="display:flex;gap:6px;justify-content:flex-end">
                      <button onclick="eleicaoToggleCandidato('${c.id}',${!c.ativo})"
                        style="background:none;border:1px solid var(--bd2);border-radius:5px;padding:3px 8px;font-size:11px;color:var(--tx2);cursor:pointer"
                        title="${c.ativo?"Inativar":"Ativar"}">${c.ativo ? "○" : "●"}</button>
                      <button onclick="eleicaoExcluirCandidato('${c.id}','${nEsc}')"
                        style="background:none;border:1px solid var(--bd2);border-radius:5px;padding:3px 8px;font-size:11px;color:var(--rose);cursor:pointer"
                        title="Remover">✕</button>
                    </div>
                  </td>
                </tr>`;
              }).join("") : `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--tx3)">
                Nenhum candidato cadastrado. Importe das indicações ou adicione manualmente.
              </td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  window.eleicaoCandFiltroTipo = function(v) {
    _candFiltroTipo = v;
    _renderCandidatosTab();
  };

  window.eleicaoAbrirImportarIndicacoes = function() {
    const panel = document.getElementById("cand-panel");
    if (!panel) return;
    if (panel.style.display !== "none" && panel.dataset.mode === "import") {
      panel.style.display = "none";
      return;
    }
    panel.dataset.mode = "import";

    const addedKeys = new Set(_candidatos.map(c => `${c.nome}||${c.tipo}`));
    const byNome = {};
    _indicacoes.forEach(i => {
      const k = `${i.indicado_nome}||${i.tipo}`;
      if (!byNome[k]) byNome[k] = {
        nome: i.indicado_nome, tipo: i.tipo,
        congregacao: i.congregacao, count: 0,
        key: k, already: addedKeys.has(k),
      };
      byNome[k].count++;
    });
    const ranked = Object.values(byNome).sort((a,b) => b.count - a.count);

    if (!ranked.length) {
      panel.innerHTML = `<div class="card" style="margin-bottom:14px;border-color:rgba(208,144,64,.4);background:rgba(208,144,64,.05)">
        <div style="font-size:13px;color:var(--amber)">Nenhuma indicação registrada. Registre indicações primeiro na aba Indicações.</div>
      </div>`;
      panel.style.display = "block";
      return;
    }

    const thS = "text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);font-weight:700";

    panel.innerHTML = `
      <div class="card" style="margin-bottom:14px;border-color:var(--sky)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
          <div>
            <div class="ctit" style="margin-bottom:2px">Importar das Indicações</div>
            <div style="font-size:11px;color:var(--tx3)">Selecione os candidatos a homologar</div>
          </div>
          <div style="display:flex;gap:8px">
            ${_btnPri("Importar selecionados", "eleicaoConfirmarImportacao()")}
            ${_btn("Cancelar", "document.getElementById('cand-panel').style.display='none'")}
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:var(--bg-surface);border-bottom:2px solid var(--sky)">
                <th style="${thS};width:36px"><input type="checkbox" id="cand-imp-all" onchange="eleicaoToggleAllImport(this.checked)" style="accent-color:var(--sky)"></th>
                <th style="${thS}">Nome</th>
                <th style="${thS}">Tipo</th>
                <th style="${thS}">Indicações</th>
                <th style="${thS}">Congregação</th>
                <th style="${thS}">Situação</th>
              </tr>
            </thead>
            <tbody>
              ${ranked.map(r => {
                const cor = r.tipo === "presbitero" ? "var(--sky)" : "var(--teal)";
                const lbl = r.tipo === "presbitero" ? "Presbítero" : "Diácono";
                const nomeAttr = _esc(r.nome).replace(/"/g, "&quot;");
                const congAttr = _esc(r.congregacao||"").replace(/"/g, "&quot;");
                return `<tr style="border-bottom:1px solid var(--bd1);opacity:${r.already?".55":"1"}"
                  onmouseover="this.style.background='var(--bg-hover)'"
                  onmouseout="this.style.background=''">
                  <td style="padding:8px 10px">
                    <input type="checkbox" class="cand-imp-chk"
                      data-nome="${nomeAttr}" data-tipo="${r.tipo}" data-cong="${congAttr}"
                      ${r.already ? "disabled checked" : ""}
                      style="accent-color:var(--sky);width:15px;height:15px">
                  </td>
                  <td style="padding:8px 10px;font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(r.nome)}</td>
                  <td style="padding:8px 10px"><span style="font-size:10px;padding:2px 9px;border-radius:6px;border:1px solid ${cor}44;color:${cor};background:${cor}11">${lbl}</span></td>
                  <td style="padding:8px 10px;font-weight:700;color:var(--sky)">${r.count}x</td>
                  <td style="padding:8px 10px;font-size:11px;color:var(--tx3)">${_esc(r.congregacao||"Sede")}</td>
                  <td style="padding:8px 10px">
                    ${r.already
                      ? `<span style="font-size:10px;padding:2px 9px;border-radius:6px;background:rgba(58,170,92,.12);color:var(--gr)">Já adicionado</span>`
                      : `<span style="font-size:10px;padding:2px 9px;border-radius:6px;background:var(--bg-surface);color:var(--tx3)">Disponível</span>`}
                  </td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
    panel.style.display = "block";
  };

  window.eleicaoToggleAllImport = function(checked) {
    document.querySelectorAll(".cand-imp-chk:not(:disabled)").forEach(c => c.checked = checked);
  };

  window.eleicaoConfirmarImportacao = async function() {
    const chks = Array.from(document.querySelectorAll(".cand-imp-chk:checked:not(:disabled)"));
    if (!chks.length) { alert("Selecione ao menos um candidato."); return; }

    const inserts = chks.map(chk => ({
      processo_id: _processo.id,
      nome:        chk.dataset.nome,
      tipo:        chk.dataset.tipo,
      congregacao: chk.dataset.cong || null,
      origem:      "indicacao",
      ativo:       true,
    }));

    const { error } = await _sb().from("eleicao_candidatos").insert(inserts);
    if (error) { alert("Erro ao importar: " + error.message); return; }

    if (typeof T === "function") T(`${inserts.length} candidato(s) importado(s)!`);
    await _carregarCandidatos(_processo.id);
    document.getElementById("cand-panel").style.display = "none";
    _renderCandidatosTab();
  };

  window.eleicaoAbrirAdicionarCandidato = function() {
    const panel = document.getElementById("cand-panel");
    if (!panel) return;
    if (panel.style.display !== "none" && panel.dataset.mode === "manual") {
      panel.style.display = "none";
      return;
    }
    panel.dataset.mode = "manual";

    const inp = "width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:13px;box-sizing:border-box;outline:none;font-family:inherit";
    const lbl = "display:block;font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px";

    panel.innerHTML = `
      <div class="card" style="margin-bottom:14px;border-color:var(--sky)">
        <div class="ctit" style="margin-bottom:14px">Adicionar candidato manualmente</div>
        <div style="display:grid;grid-template-columns:1fr 180px 180px;gap:12px;align-items:end;flex-wrap:wrap">
          <div>
            <label style="${lbl}">Nome completo *</label>
            <input id="cand-add-nome" style="${inp}" placeholder="Nome do candidato">
          </div>
          <div>
            <label style="${lbl}">Tipo *</label>
            <select id="cand-add-tipo" style="${inp}">
              <option value="presbitero">Presbítero</option>
              <option value="diacono">Diácono</option>
            </select>
          </div>
          <div>
            <label style="${lbl}">Congregação</label>
            <input id="cand-add-cong" style="${inp}" placeholder="Sede">
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          ${_btnPri("Adicionar candidato", "eleicaoSalvarCandidatoManual()")}
          ${_btn("Cancelar", "document.getElementById('cand-panel').style.display='none'")}
        </div>
      </div>`;
    panel.style.display = "block";
    document.getElementById("cand-add-nome")?.focus();
  };

  window.eleicaoSalvarCandidatoManual = async function() {
    const nome = document.getElementById("cand-add-nome")?.value?.trim();
    const tipo = document.getElementById("cand-add-tipo")?.value;
    const cong = document.getElementById("cand-add-cong")?.value?.trim() || null;

    if (!nome) { alert("Nome obrigatório."); return; }

    const { error } = await _sb().from("eleicao_candidatos").insert({
      processo_id: _processo.id,
      nome, tipo, congregacao: cong,
      origem: "manual", ativo: true,
    });
    if (error) { alert("Erro ao adicionar: " + error.message); return; }

    if (typeof T === "function") T("Candidato adicionado!", nome);
    await _carregarCandidatos(_processo.id);
    document.getElementById("cand-panel").style.display = "none";
    _renderCandidatosTab();
  };

  window.eleicaoToggleCandidato = async function(id, ativo) {
    const { error } = await _sb().from("eleicao_candidatos").update({ ativo }).eq("id", id);
    if (error) { alert("Erro: " + error.message); return; }
    _candidatos = _candidatos.map(c => c.id === id ? { ...c, ativo } : c);
    _renderCandidatosTab();
  };

  window.eleicaoExcluirCandidato = async function(id, nome) {
    if (!confirm(`Remover "${nome}" da lista de candidatos?`)) return;
    const { error } = await _sb().from("eleicao_candidatos")
      .update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { alert("Erro: " + error.message); return; }
    _candidatos = _candidatos.filter(c => c.id !== id);
    _renderCandidatosTab();
    if (typeof T === "function") T("Candidato removido", nome);
  };

  /* ══════════════════════════════════════════════════════
     ABA VOTAÇÃO
  ══════════════════════════════════════════════════════ */

  function _renderVotacaoTab() {
    const el = document.getElementById("edt-content");
    if (!el) return;

    el.innerHTML = `
      <div style="display:flex;gap:0;margin-bottom:16px;border-bottom:1px solid var(--bd1)">
        <button id="vt-btn-config" onclick="eleicaoVotSubTab('config')"
          style="padding:9px 20px;border:none;border-bottom:2px solid ${_votSubTab==="config"?"var(--sky)":"transparent"};background:none;
                 color:${_votSubTab==="config"?"var(--sky)":"var(--tx3)"};font-size:12.5px;font-weight:${_votSubTab==="config"?"700":"500"};
                 cursor:pointer;font-family:inherit">Configuração</button>
        <button id="vt-btn-dash" onclick="eleicaoVotSubTab('dashboard')"
          style="padding:9px 20px;border:none;border-bottom:2px solid ${_votSubTab==="dashboard"?"var(--sky)":"transparent"};background:none;
                 color:${_votSubTab==="dashboard"?"var(--sky)":"var(--tx3)"};font-size:12.5px;font-weight:${_votSubTab==="dashboard"?"700":"500"};
                 cursor:pointer;font-family:inherit">Dashboard</button>
      </div>
      <div id="vot-sub-content"></div>`;

    _renderVotSubTab();
  }

  function _renderVotSubTab() {
    const el = document.getElementById("vot-sub-content");
    if (!el) return;
    if (_votSubTab === "config")    _renderVotConfig();
    else if (_votSubTab === "dashboard") _renderVotDashboard();
  }

  window.eleicaoVotSubTab = function(tab) {
    _votSubTab = tab;
    ["config","dashboard"].forEach(t => {
      const btn = document.getElementById(`vt-btn-${t}`);
      if (!btn) return;
      const on = t === tab;
      btn.style.borderBottomColor = on ? "var(--sky)" : "transparent";
      btn.style.color  = on ? "var(--sky)" : "var(--tx3)";
      btn.style.fontWeight = on ? "700" : "500";
    });
    _renderVotSubTab();
  };

  function _renderVotConfig() {
    const el = document.getElementById("vot-sub-content");
    if (!el) return;
    const cfg = _votacaoConfig || {};

    const inp = "width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:13px;box-sizing:border-box;outline:none;font-family:inherit";
    const lbl = "display:block;font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px";

    const statusOpts = [
      ["rascunho","Rascunho"],
      ["agendada","Agendada"],
      ["aberta","Aberta"],
      ["encerrada","Encerrada"],
      ["apurada","Apurada"],
    ];

    el.innerHTML = `
      <div class="card" style="max-width:640px">
        <div class="ctit" style="margin-bottom:16px">Configuração da Votação</div>

        <div style="margin-bottom:14px">
          <label style="${lbl}">Status da votação</label>
          <select id="vc-status" style="${inp}">
            ${statusOpts.map(([v,l]) => `<option value="${v}" ${(cfg.status_votacao||"rascunho")===v?"selected":""}>${l}</option>`).join("")}
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
          <div>
            <label style="${lbl}">Abertura da votação</label>
            <div style="display:grid;grid-template-columns:1fr 100px;gap:8px">
              <input id="vc-data-ab" type="date" style="${inp}" value="${cfg.data_abertura_votacao||""}">
              <input id="vc-hora-ab" type="time" style="${inp}" value="${cfg.hora_abertura_votacao||"08:00"}">
            </div>
          </div>
          <div>
            <label style="${lbl}">Encerramento da votação</label>
            <div style="display:grid;grid-template-columns:1fr 100px;gap:8px">
              <input id="vc-data-enc" type="date" style="${inp}" value="${cfg.data_encerramento_votacao||""}">
              <input id="vc-hora-enc" type="time" style="${inp}" value="${cfg.hora_encerramento_votacao||"18:00"}">
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
          <div>
            <label style="${lbl}">Máx. votos por eleitor — Presbíteros</label>
            <input id="vc-max-presb" type="number" min="1" max="20" style="${inp}" value="${cfg.max_votos_presbiteros??5}">
          </div>
          <div>
            <label style="${lbl}">Máx. votos por eleitor — Diáconos</label>
            <input id="vc-max-diac" type="number" min="1" max="20" style="${inp}" value="${cfg.max_votos_diaconos??4}">
          </div>
        </div>

        <div style="margin-bottom:16px;padding:14px;border-radius:10px;background:var(--bg-surface);border:1px solid var(--bd1)">
          <div style="${lbl};margin-bottom:10px">Elegibilidade dos eleitores</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
              <input type="checkbox" id="vc-plena" ${cfg.somente_plena_comunhao!==false?"checked":""} style="accent-color:var(--sky);width:16px;height:16px;flex-shrink:0">
              <span style="font-size:13px;color:var(--tx2)">Somente membros em plena comunhão</span>
            </label>
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
              <input type="checkbox" id="vc-susp" ${cfg.excluir_suspensos!==false?"checked":""} style="accent-color:var(--sky);width:16px;height:16px;flex-shrink:0">
              <span style="font-size:13px;color:var(--tx2)">Excluir membros suspensos ou sob disciplina</span>
            </label>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          ${_btnPri("Salvar configuração", "eleicaoSalvarVotacaoConfig()")}
          <div id="vc-msg" style="font-size:12px"></div>
        </div>
      </div>`;
  }

  function _renderVotDashboard() {
    const el = document.getElementById("vot-sub-content");
    if (!el) return;
    const cfg = _votacaoConfig;

    if (!cfg || cfg.status_votacao === "rascunho") {
      el.innerHTML = `
        <div style="text-align:center;padding:48px;background:var(--bg-surface);border:1.5px dashed var(--bd2);border-radius:12px">
          <div style="font-size:32px;margin-bottom:12px;opacity:.4">🗳</div>
          <div style="font-size:14px;font-weight:700;color:var(--tx2);margin-bottom:6px">Votação não configurada</div>
          <div style="font-size:12px;color:var(--tx3);margin-bottom:18px">Configure as datas e os limites de votos antes de abrir a votação.</div>
          <button onclick="eleicaoVotSubTab('config')" style="padding:9px 20px;border-radius:7px;border:none;background:var(--sky);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Ir para Configuração</button>
        </div>`;
      return;
    }

    const candAtivos = _candidatos.filter(c => c.ativo).length;
    const presb = _candidatos.filter(c => c.ativo && c.tipo === "presbitero").length;
    const diac  = _candidatos.filter(c => c.ativo && c.tipo === "diacono").length;

    const statusCor = { aberta:"var(--gr)", encerrada:"var(--sky)", apurada:"var(--violet)", agendada:"var(--amber)", rascunho:"var(--tx3)" };

    el.innerHTML = `
      <div class="kpis c4" style="margin-bottom:16px">
        <div class="kpi"><div class="kpi-ico" style="background:rgba(74,156,245,.12);color:var(--sky)">◎</div><div class="kpi-body"><div class="kpi-lbl">Candidatos ativos</div><div class="kpi-val">${candAtivos}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(42,181,192,.12);color:var(--teal)">◈</div><div class="kpi-body"><div class="kpi-lbl">Presbíteros</div><div class="kpi-val">${presb}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(139,111,212,.12);color:var(--violet)">◉</div><div class="kpi-body"><div class="kpi-lbl">Diáconos</div><div class="kpi-val">${diac}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(58,170,92,.12);color:${statusCor[cfg.status_votacao]||"var(--tx3)"}">▶</div><div class="kpi-body"><div class="kpi-lbl">Status votação</div><div class="kpi-val" style="font-size:13px;text-transform:capitalize;color:${statusCor[cfg.status_votacao]||"var(--tx2)"}">${cfg.status_votacao}</div></div></div>
      </div>

      <div class="card" style="max-width:520px">
        <div class="ctit">Resumo da Configuração</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--bd1);padding-bottom:8px">
            <span style="font-size:12.5px;color:var(--tx3)">Abertura:</span>
            <span style="font-size:12.5px;color:var(--tx1);font-weight:600">
              ${cfg.data_abertura_votacao ? `${_fmtDate(cfg.data_abertura_votacao)} às ${(cfg.hora_abertura_votacao||"").slice(0,5)}` : "—"}
            </span>
          </div>
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--bd1);padding-bottom:8px">
            <span style="font-size:12.5px;color:var(--tx3)">Encerramento:</span>
            <span style="font-size:12.5px;color:var(--tx1);font-weight:600">
              ${cfg.data_encerramento_votacao ? `${_fmtDate(cfg.data_encerramento_votacao)} às ${(cfg.hora_encerramento_votacao||"").slice(0,5)}` : "—"}
            </span>
          </div>
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--bd1);padding-bottom:8px">
            <span style="font-size:12.5px;color:var(--tx3)">Máx. votos Presbíteros:</span>
            <span style="font-size:12.5px;color:var(--tx1);font-weight:600">${cfg.max_votos_presbiteros}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:12.5px;color:var(--tx3)">Máx. votos Diáconos:</span>
            <span style="font-size:12.5px;color:var(--tx1);font-weight:600">${cfg.max_votos_diaconos}</span>
          </div>
        </div>
      </div>

      <div style="margin-top:14px;padding:12px 16px;border-radius:10px;background:rgba(74,156,245,.06);border:1px solid rgba(74,156,245,.2);font-size:12px;color:var(--tx3)">
        Cédula eletrônica, contagem de votos em tempo real e apuração disponíveis na próxima atualização.
      </div>`;
  }

  window.eleicaoSalvarVotacaoConfig = async function() {
    const msgEl = document.getElementById("vc-msg");
    if (msgEl) { msgEl.textContent = "Salvando..."; msgEl.style.color = "var(--tx3)"; }

    const payload = {
      processo_id:               _processo.id,
      status_votacao:            document.getElementById("vc-status")?.value     || "rascunho",
      data_abertura_votacao:     document.getElementById("vc-data-ab")?.value    || null,
      hora_abertura_votacao:     document.getElementById("vc-hora-ab")?.value    || null,
      data_encerramento_votacao: document.getElementById("vc-data-enc")?.value   || null,
      hora_encerramento_votacao: document.getElementById("vc-hora-enc")?.value   || null,
      max_votos_presbiteros:     parseInt(document.getElementById("vc-max-presb")?.value) || 5,
      max_votos_diaconos:        parseInt(document.getElementById("vc-max-diac")?.value)  || 4,
      somente_plena_comunhao:    document.getElementById("vc-plena")?.checked !== false,
      excluir_suspensos:         document.getElementById("vc-susp")?.checked  !== false,
      atualizado_em:             new Date().toISOString(),
    };

    try {
      const sb = _sb();
      if (_votacaoConfig?.id) {
        const { error } = await sb.from("eleicao_votacao_config").update(payload).eq("id", _votacaoConfig.id);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await sb.from("eleicao_votacao_config").insert(payload).select().single();
        if (error) throw new Error(error.message);
        _votacaoConfig = data;
      }
      await _carregarVotacaoConfig(_processo.id);
      if (msgEl) { msgEl.textContent = "Salvo!"; msgEl.style.color = "var(--gr)"; setTimeout(() => { if (msgEl) msgEl.textContent = ""; }, 2500); }
      if (typeof T === "function") T("Configuração salva!", "Votação configurada com sucesso.");
    } catch (e) {
      if (msgEl) { msgEl.textContent = "Erro: " + e.message; msgEl.style.color = "var(--rose)"; }
    }
  };

  /* ── Navegação pública ───────────────────────────────── */
  window.eleicaoNavLista     = function()    { _editando = false; _show("lista"); };
  window.eleicaoNavHistorico = function()    { _show("historico"); };
  window.eleicaoNavNovo      = function()    { _processo = null; _editando = false; _show("form"); };
  window.eleicaoNavEditar    = function(id)  {
    _processo = _processos.find(p => p.id === id) || _processo;
    _editando = true;
    _renderForm(_processo);
    _nav = "form";
  };
  window.eleicaoNavDetalhe   = function(id)  {
    _detTab = "stats"; _filtroTipo = "todos"; _filtroCongreg = "todas";
    _candidatos = []; _votacaoConfig = null; _votSubTab = "config"; _candFiltroTipo = "todos";
    _show("detalhe", id);
  };

  /* ═══════════════════════════════════════════════════════
     ENTRY POINT
  ═══════════════════════════════════════════════════════ */

  window.eleicaoInit = async function() {
    const r = _root();
    if (!r) return;
    if (!_isAdmin()) {
      r.innerHTML = `<div style="text-align:center;padding:48px;color:var(--tx3);font-size:13px">Acesso restrito ao Conselho e Gestão.</div>`;
      return;
    }
    r.innerHTML = `<div style="padding:32px;text-align:center;color:var(--tx3)"><span style="display:inline-block;width:22px;height:22px;border:2px solid var(--bd2);border-top-color:var(--sky);border-radius:50%;animation:spin .7s linear infinite"></span></div>`;
    await _carregarProcessos();
    _renderLista();
  };

  VIEW_AUTOLOAD["conselho-eleicoes"] = { fn: () => (typeof eleicaoInit === "function" ? eleicaoInit() : null) };

  document.addEventListener("click", function() {
    window.eleicaoCloseMenus && window.eleicaoCloseMenus();
  });

})();
