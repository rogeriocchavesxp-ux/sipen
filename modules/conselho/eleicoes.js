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
  let _editando   = false;         // true = editar processo existente

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
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:18px">
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
      <!-- Sub-tabs -->
      <div class="bnav" style="--mc:var(--sky);margin-bottom:16px">
        <div class="bni ${_detTab==="stats"?"on":""}" id="edt-stats" onclick="eleicaoDetTab('stats')">Estatísticas</div>
        <div class="bni ${_detTab==="indicacoes"?"on":""}" id="edt-ind" onclick="eleicaoDetTab('indicacoes')">Indicações</div>
        <div class="bni ${_detTab==="compartilhar"?"on":""}" id="edt-comp" onclick="eleicaoDetTab('compartilhar')">Compartilhar</div>
      </div>
      <div id="edt-content"></div>`;

    _renderDetTab();
  }

  window.eleicaoDetTab = function(tab) {
    _detTab = tab;
    ["stats","indicacoes","compartilhar"].forEach(t => {
      document.getElementById(`edt-${t === "stats" ? "stats" : t === "indicacoes" ? "ind" : "comp"}`)
        ?.classList.toggle("on", t === tab);
    });
    _renderDetTab();
  };

  function _renderDetTab() {
    if      (_detTab === "stats")       _renderStats();
    else if (_detTab === "indicacoes")  _renderIndicacoesTab();
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
    await _carregarIndicacoes(_processo.id);
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
  window.eleicaoNavDetalhe   = function(id)  { _detTab = "stats"; _filtroTipo = "todos"; _filtroCongreg = "todas"; _show("detalhe", id); };

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
