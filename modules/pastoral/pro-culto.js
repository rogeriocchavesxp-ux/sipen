/* ═══════════════════════════════════════════════════════════════
   SIPEN — Pró-Culto v1.0.0
   Central Operacional dos Cultos da IPPenha
   modules/pastoral/pro-culto.js
═══════════════════════════════════════════════════════════════ */
(function () {

  /* ── Constantes ─────────────────────────────────────────── */
  const STATUS_CFG = {
    em_preparacao:      { lbl: "Em preparação",         cor: "var(--tx3)",    bg: "rgba(138,145,158,.12)"  },
    aguardando_info:    { lbl: "Aguardando informações", cor: "var(--amber)",  bg: "rgba(208,144,64,.12)"   },
    escalas_incompletas:{ lbl: "Escalas incompletas",   cor: "var(--amber)",  bg: "rgba(208,144,64,.12)"   },
    liturgia_revisao:   { lbl: "Liturgia em revisão",   cor: "var(--sky)",    bg: "rgba(74,156,245,.12)"   },
    pronto:             { lbl: "Pronto para o culto",   cor: "var(--gr)",     bg: "rgba(58,170,92,.12)"    },
    em_andamento:       { lbl: "Em andamento",          cor: "var(--teal)",   bg: "rgba(42,181,192,.12)"   },
    encerrado:          { lbl: "Encerrado",             cor: "var(--sky)",    bg: "rgba(74,156,245,.12)"   },
    cancelado:          { lbl: "Cancelado",             cor: "var(--rose)",   bg: "rgba(229,62,62,.12)"    },
    arquivado:          { lbl: "Arquivado",             cor: "var(--tx4)",    bg: "rgba(60,64,80,.12)"     },
  };

  const TIPO_ITEM_CFG = {
    item:     { lbl: "Item",        cor: "var(--tx3)"   },
    musica:   { lbl: "Música",      cor: "var(--violet)"},
    leitura:  { lbl: "Leitura",     cor: "var(--teal)"  },
    oracao:   { lbl: "Oração",      cor: "var(--gr)"    },
    pregacao: { lbl: "Pregação",    cor: "var(--sky)"   },
    anuncio:  { lbl: "Anúncio",     cor: "var(--amber)" },
    oferta:   { lbl: "Oferta",      cor: "var(--gr)"    },
    ceia:     { lbl: "Santa Ceia",  cor: "var(--teal)"  },
    batismo:  { lbl: "Batismo",     cor: "var(--sky)"   },
    outro:    { lbl: "Outro",       cor: "var(--tx3)"   },
  };

  const BLOCOS_PADRAO = [
    { nome: "Vamos Contritos",  cor: "#4a9cf5" },
    { nome: "Vamos Adorar",     cor: "#8b6fd4" },
    { nome: "Vamos a Cristo",   cor: "#3aaa5c" },
    { nome: "Vamos Abençoar",   cor: "#d4a843" },
  ];

  const EVENTOS_ESPECIAIS = [
    { k: "batismo",         l: "Batismo"             },
    { k: "santa_ceia",      l: "Santa Ceia"          },
    { k: "profissao_fe",    l: "Profissão de Fé"     },
    { k: "recepcao",        l: "Recepção de Membros" },
    { k: "apresentacao",    l: "Apresentação Infantil"},
    { k: "ordenacao",       l: "Ordenação"           },
    { k: "investidura",     l: "Investidura"         },
    { k: "coral",           l: "Coral"               },
    { k: "orquestra",       l: "Orquestra"           },
    { k: "convidado",       l: "Convidado"           },
    { k: "missoes",         l: "Culto Missionário"   },
    { k: "homenagem",       l: "Homenagem"           },
  ];

  const CHECKLISTS_AUTO = {
    batismo: [
      { dep: "diaconal",       titulo: "Preparar a água do batistério",   ordem: 1 },
      { dep: "diaconal",       titulo: "Verificar temperatura da água",   ordem: 2 },
      { dep: "diaconal",       titulo: "Abrir e conferir o batistério",   ordem: 3 },
      { dep: "diaconal",       titulo: "Disponibilizar toalhas",          ordem: 4 },
      { dep: "diaconal",       titulo: "Organizar local de troca de roupa",ordem: 5 },
      { dep: "pastoral",       titulo: "Confirmar nomes dos batizandos",  ordem: 6 },
      { dep: "projecao",       titulo: "Inserir nomes dos batizandos na projeção", ordem: 7 },
      { dep: "comunicacao",    titulo: "Preparar certificados de batismo",ordem: 8 },
    ],
    santa_ceia: [
      { dep: "diaconal",       titulo: "Preparar o pão",                  ordem: 1 },
      { dep: "diaconal",       titulo: "Preparar o suco",                 ordem: 2 },
      { dep: "diaconal",       titulo: "Organizar cálices e bandejas",    ordem: 3 },
      { dep: "diaconal",       titulo: "Preparar mesa da Santa Ceia",     ordem: 4 },
      { dep: "diaconal",       titulo: "Confirmar diáconos escalados",    ordem: 5 },
      { dep: "diaconal",       titulo: "Realizar limpeza após o culto",   ordem: 6 },
    ],
    recepcao: [
      { dep: "pastoral",       titulo: "Confirmar lista de novos membros",ordem: 1 },
      { dep: "comunicacao",    titulo: "Preparar certificados de recepção",ordem: 2 },
      { dep: "integracao",     titulo: "Reservar assentos para os novos membros", ordem: 3 },
      { dep: "projecao",       titulo: "Inserir nomes na projeção",       ordem: 4 },
    ],
    apresentacao: [
      { dep: "pastoral",       titulo: "Confirmar nome da criança e pais",ordem: 1 },
      { dep: "comunicacao",    titulo: "Preparar certificado de apresentação",ordem: 2 },
      { dep: "projecao",       titulo: "Inserir nome da criança na projeção",ordem: 3 },
    ],
  };

  /* ── Estado ─────────────────────────────────────────────── */
  let _nav        = "lista";
  let _culto      = null;
  let _cultos     = [];
  let _tipos      = [];
  let _blocos     = [];
  let _itens      = [];
  let _checklists = [];
  let _posCulto   = null;
  let _detTab     = "geral";
  let _filtroAno  = new Date().getFullYear();
  let _filtroMes  = new Date().getMonth() + 1;
  let _editandoBlocoId = null;
  let _itemEditando    = null;
  let _pessoas    = [];

  /* ── Helpers ─────────────────────────────────────────────── */
  const _sb  = () => (typeof getSupabase === "function" ? getSupabase() : null);
  const _usr = () => (typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL : null);
  const _root = () => document.getElementById("pc-root");

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
    const [y, m, dia] = String(d).slice(0, 10).split("-");
    return `${dia}/${m}/${y}`;
  }

  function _fmtDtHr(d) {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
    } catch { return d; }
  }

  function _fmtHr(d) {
    if (!d) return "";
    try {
      return new Date(d).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
    } catch { return ""; }
  }

  function _fmtDiaSem(d) {
    if (!d) return "";
    const dias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
    try { return dias[new Date(d).getDay()]; } catch { return ""; }
  }

  function _statusBadge(st) {
    const c = STATUS_CFG[st] || STATUS_CFG.em_preparacao;
    return `<span style="font-size:10px;padding:2px 9px;border-radius:8px;background:${c.bg};color:${c.cor};font-weight:700">${c.lbl}</span>`;
  }

  function _tipoBadge(tipo) {
    const c = TIPO_ITEM_CFG[tipo] || TIPO_ITEM_CFG.item;
    return `<span style="font-size:9px;padding:1px 7px;border-radius:6px;border:1px solid ${c.cor}44;color:${c.cor};font-weight:700">${c.lbl}</span>`;
  }

  function _evBadges(evs) {
    if (!evs || !evs.length) return "";
    return evs.map(k => {
      const ev = EVENTOS_ESPECIAIS.find(e => e.k === k);
      return ev ? `<span style="font-size:9px;padding:1px 7px;border-radius:6px;background:rgba(229,62,62,.1);border:1px solid rgba(229,62,62,.3);color:var(--rose);font-weight:700">${ev.l}</span>` : "";
    }).join(" ");
  }

  function _btn(label, onclick, style = "") {
    return `<button onclick="${onclick}" style="padding:8px 16px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--tx2);font-size:12px;cursor:pointer;font-family:inherit;${style}">${label}</button>`;
  }

  function _btnPri(label, onclick) {
    return `<button onclick="${onclick}" style="padding:8px 18px;border-radius:7px;border:none;background:var(--sky);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">${label}</button>`;
  }

  function _loading(r) {
    if (r) r.innerHTML = `<div style="padding:48px;text-align:center"><span style="display:inline-block;width:22px;height:22px;border:2px solid var(--bd2);border-top-color:var(--teal);border-radius:50%;animation:spin .7s linear infinite"></span></div>`;
  }

  /* ── API ─────────────────────────────────────────────────── */
  async function _loadTipos() {
    if (_tipos.length) return;
    const { data } = await _sb().from("culto_tipos").select("*").eq("ativo", true).order("ordem");
    _tipos = data || [];
  }

  async function _loadCultos(ano, mes) {
    const de  = `${ano}-${String(mes).padStart(2,"0")}-01T00:00:00`;
    const ate = `${ano}-${String(mes).padStart(2,"0")}-31T23:59:59`;
    const { data } = await _sb()
      .from("cultos")
      .select("*,culto_tipos(nome,cor)")
      .gte("data_inicio", de)
      .lte("data_inicio", ate)
      .is("deleted_at", null)
      .order("data_inicio");
    _cultos = data || [];
  }

  async function _loadCulto(id) {
    const { data } = await _sb()
      .from("cultos")
      .select("*,culto_tipos(nome,cor)")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    _culto = data || null;
  }

  async function _loadBlocos(cultoId) {
    const { data } = await _sb()
      .from("culto_liturgia_blocos")
      .select("*")
      .eq("culto_id", cultoId)
      .order("ordem");
    _blocos = data || [];
  }

  async function _loadItens(cultoId) {
    const { data } = await _sb()
      .from("culto_liturgia_itens")
      .select("*,culto_item_musicas(*)")
      .eq("culto_id", cultoId)
      .order("ordem");
    _itens = data || [];
  }

  async function _loadChecklists(cultoId) {
    const { data } = await _sb()
      .from("culto_checklists")
      .select("*")
      .eq("culto_id", cultoId)
      .order("departamento")
      .order("ordem");
    _checklists = data || [];
  }

  async function _loadPosCulto(cultoId) {
    const { data } = await _sb()
      .from("culto_pos_culto")
      .select("*")
      .eq("culto_id", cultoId)
      .maybeSingle();
    _posCulto = data || null;
  }

  async function _loadPastores() {
    if (_pessoas.length) return;
    const { data } = await _sb()
      .from("pastores")
      .select("id,nome_completo,nome_exibicao")
      .eq("ativo", true)
      .order("nome_completo");
    _pessoas = (data || []).map(p => ({
      pessoa_id: p.id,
      nome: p.nome_exibicao || p.nome_completo,
    }));
  }

  /* ── Criação automática de blocos ────────────────────────── */
  async function _criarBlocosPadrao(cultoId) {
    const rows = BLOCOS_PADRAO.map((b, i) => ({ culto_id: cultoId, nome: b.nome, cor: b.cor, ordem: i }));
    const { data } = await _sb().from("culto_liturgia_blocos").insert(rows).select();
    return data || [];
  }

  /* ── Checklists automáticos ──────────────────────────────── */
  async function _gerarChecklistsEvento(cultoId, evento) {
    const itens = CHECKLISTS_AUTO[evento] || [];
    if (!itens.length) return;
    const existentes = _checklists.filter(c => c.gerado_auto && c.departamento.startsWith(`ev_${evento}`));
    if (existentes.length) return;
    const rows = itens.map(c => ({
      culto_id:    cultoId,
      departamento: `ev_${evento}`,
      titulo:      c.titulo,
      ordem:       c.ordem,
      gerado_auto: true,
    }));
    await _sb().from("culto_checklists").insert(rows);
  }

  /* ── Navegação ───────────────────────────────────────────── */
  function _show(view) {
    _nav = view;
    const r = _root();
    if (!r) return;
    _loading(r);
    if      (view === "lista")   _renderLista();
    else if (view === "form")    _renderForm();
    else if (view === "detalhe") _renderDetalhe();
  }

  /* ═══════════════════════════════════════════════════════════
     LISTA DE CULTOS
  ═══════════════════════════════════════════════════════════ */
  async function _renderLista() {
    const r = _root();
    if (!r) return;
    await Promise.all([_loadTipos(), _loadCultos(_filtroAno, _filtroMes)]);

    const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const anos  = [];
    const anoAtual = new Date().getFullYear();
    for (let a = anoAtual - 2; a <= anoAtual + 1; a++) anos.push(a);

    // Agrupar por dia
    const byDia = {};
    _cultos.forEach(c => {
      const dia = c.data_inicio.slice(0, 10);
      if (!byDia[dia]) byDia[dia] = [];
      byDia[dia].push(c);
    });
    const dias = Object.keys(byDia).sort();

    const si = "padding:7px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px;outline:none;font-family:inherit";

    r.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--tx1)">Pró-Culto</div>
          <div style="font-size:12px;color:var(--tx3);margin-top:2px">Central operacional dos cultos da IPPenha</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <select onchange="pcSetAno(+this.value)" style="${si}">
            ${anos.map(a => `<option value="${a}" ${a===_filtroAno?"selected":""}>${a}</option>`).join("")}
          </select>
          <select onchange="pcSetMes(+this.value)" style="${si}">
            ${MESES.map((m,i) => `<option value="${i+1}" ${i+1===_filtroMes?"selected":""}>${m}</option>`).join("")}
          </select>
          <button onclick="pcSetMes(${_filtroMes===1?12:_filtroMes-1}${_filtroMes===1?`,${_filtroAno-1}`:""});pcSetAno(${_filtroMes===1?_filtroAno-1:_filtroAno})" style="padding:7px 11px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--tx2);font-size:12px;cursor:pointer">←</button>
          <button onclick="pcSetMes(${_filtroMes===12?1:_filtroMes+1}${_filtroMes===12?`,${_filtroAno+1}`:""});pcSetAno(${_filtroMes===12?_filtroAno+1:_filtroAno})" style="padding:7px 11px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--tx2);font-size:12px;cursor:pointer">→</button>
          ${_btnPri("+ Novo Culto", "pcNavForm()")}
        </div>
      </div>

      ${dias.length ? dias.map(dia => {
        const [y, m, d] = dia.split("-");
        const ds = new Date(dia + "T00:00:00");
        const ds2 = _fmtDiaSem(dia + "T12:00:00");
        const cultosNoDia = byDia[dia];
        return `
          <div style="margin-bottom:12px">
            <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;padding:4px 0;border-bottom:1px solid var(--bd1)">
              ${ds2} · ${d}/${m}/${y}
            </div>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${cultosNoDia.map(c => _cultoCard(c)).join("")}
            </div>
          </div>`;
      }).join("") : `
        <div style="background:var(--bg-surface);border:1.5px dashed var(--bd2);border-radius:12px;padding:48px 24px;text-align:center">
          <div style="font-size:13px;font-weight:700;color:var(--tx2);margin-bottom:6px">Nenhum culto registrado</div>
          <div style="font-size:12px;color:var(--tx3);margin-bottom:18px">Nenhum culto em ${MESES[_filtroMes-1]} de ${_filtroAno}.</div>
          ${_btnPri("+ Novo Culto", "pcNavForm()")}
        </div>`}`;
  }

  function _cultoCard(c) {
    const tipo   = c.culto_tipos;
    const cor    = tipo?.cor || "var(--sky)";
    const hora   = _fmtHr(c.data_inicio);
    const evs    = c.eventos_especiais || [];
    return `
      <div onclick="pcNavDetalhe('${c.id}')"
        style="background:var(--bg-card);border:1px solid var(--bd1);border-left:3px solid ${cor};border-radius:10px;padding:14px 16px;cursor:pointer;display:flex;align-items:flex-start;gap:14px;transition:border-color .15s"
        onmouseover="this.style.borderColor='${cor}'" onmouseout="this.style.borderColor='var(--bd1)'">
        <div style="text-align:center;flex-shrink:0;min-width:42px">
          <div style="font-size:16px;font-weight:800;color:${cor};line-height:1">${hora || "—"}</div>
          <div style="font-size:9px;color:var(--tx3);margin-top:2px;text-transform:uppercase;letter-spacing:.06em">${tipo?.nome||"—"}</div>
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            ${_statusBadge(c.status)}
            ${evs.length ? _evBadges(evs) : ""}
          </div>
          <div style="font-size:13.5px;font-weight:700;color:var(--tx1);margin-bottom:2px">${_esc(c.titulo || tipo?.nome || "Culto")}</div>
          ${c.tema ? `<div style="font-size:11px;color:var(--tx3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(c.tema)}</div>` : ""}
          <div style="font-size:11px;color:var(--tx3);margin-top:4px;display:flex;gap:12px;flex-wrap:wrap">
            ${c.pregador_nome ? `<span>Pregador: <strong style="color:var(--tx2)">${_esc(c.pregador_nome)}</strong></span>` : `<span style="color:var(--amber)">Pregador: a definir</span>`}
          </div>
        </div>
        <div style="font-size:10px;color:var(--tx4);flex-shrink:0">→</div>
      </div>`;
  }

  /* ═══════════════════════════════════════════════════════════
     FORMULÁRIO CRIAR / EDITAR
  ═══════════════════════════════════════════════════════════ */
  async function _renderForm() {
    const r = _root();
    if (!r) return;
    await Promise.all([_loadTipos(), _loadPastores()]);
    const c = _culto || {};
    const inp = "width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:13px;box-sizing:border-box;outline:none;font-family:inherit";
    const lbl = "display:block;font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px";
    const fld = (label, content) => `<div style="margin-bottom:14px"><label style="${lbl}">${label}</label>${content}</div>`;

    const dataInicio = c.data_inicio ? c.data_inicio.slice(0,16) : "";
    const dataFim    = c.data_encerramento ? c.data_encerramento.slice(0,16) : "";
    const evsSel     = c.eventos_especiais || [];

    const optsPastores = _pessoas.map(p => `<option value="${p.pessoa_id}" data-nm="${_esc(p.nome)}" ${c.pregador_nome===p.nome?"selected":""}>${_esc(p.nome)}</option>`).join("");

    r.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div style="font-size:15px;font-weight:700;color:var(--tx1)">${c.id ? "Editar Culto" : "Novo Culto"}</div>
        ${_btn("← Cancelar", "pcNavLista()")}
      </div>
      <div class="card" style="max-width:700px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${fld("Data e Horário de Início <span style='color:var(--rose)'>*</span>",
            `<input id="pc-data" type="datetime-local" style="${inp}" value="${dataInicio}">`)}
          ${fld("Previsão de Encerramento",
            `<input id="pc-fim" type="datetime-local" style="${inp}" value="${dataFim}">`)}
        </div>
        ${fld("Tipo de Culto",
          `<select id="pc-tipo" style="${inp}">
            <option value="">— Selecione —</option>
            ${_tipos.map(t => `<option value="${t.id}" ${c.tipo_culto_id===t.id?"selected":""}>${_esc(t.nome)}</option>`).join("")}
          </select>`)}
        ${fld("Título (opcional)",
          `<input id="pc-titulo" style="${inp}" value="${_esc(c.titulo||"")}" placeholder="Ex: Culto de Abertura do Congresso">`)}
        ${fld("Tema da Mensagem",
          `<input id="pc-tema" style="${inp}" value="${_esc(c.tema||"")}" placeholder="Ex: A fé que herdamos e a comunhão que vivemos">`)}
        ${fld("Tema do Mês",
          `<input id="pc-temames" style="${inp}" value="${_esc(c.tema_do_mes||"")}" placeholder="Ex: Vida Comunitária">`)}
        ${fld("Texto Bíblico",
          `<input id="pc-texto" style="${inp}" value="${_esc(c.texto_biblico||"")}" placeholder="Ex: João 17.20-23">`)}
        ${fld("Pregador",
          `<select id="pc-preg" style="${inp}">
            <option value="">— A definir —</option>
            ${optsPastores}
          </select>`)}
        ${fld("Local",
          `<input id="pc-local" style="${inp}" value="${_esc(c.local_nome||"")}" placeholder="Ex: Templo Principal">`)}
        ${fld("Status",
          `<select id="pc-status" style="${inp}">
            ${Object.entries(STATUS_CFG).map(([k,v]) => `<option value="${k}" ${(c.status||"em_preparacao")===k?"selected":""}>${v.lbl}</option>`).join("")}
          </select>`)}
        <div style="margin-bottom:14px">
          <div style="${lbl}">Eventos Especiais</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${EVENTOS_ESPECIAIS.map(ev => `
              <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;border:1.5px solid ${evsSel.includes(ev.k)?"var(--rose)":"var(--bd2)"};background:${evsSel.includes(ev.k)?"rgba(229,62,62,.08)":"var(--bg-surface)"};cursor:pointer;font-size:12px;color:${evsSel.includes(ev.k)?"var(--rose)":"var(--tx2)"};user-select:none;transition:all .15s" id="ev-lbl-${ev.k}" onclick="pcToggleEv('${ev.k}')">
                <input type="checkbox" id="ev-${ev.k}" ${evsSel.includes(ev.k)?"checked":""} style="display:none">${_esc(ev.l)}
              </label>`).join("")}
          </div>
        </div>
        ${fld("Observações",
          `<textarea id="pc-obs" style="${inp};resize:vertical;min-height:70px">${_esc(c.observacoes||"")}</textarea>`)}
        <div style="border-top:1px solid var(--bd1);padding-top:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          ${_btnPri(c.id ? "Salvar alterações" : "Criar Culto", "pcSalvar()")}
          ${_btn("Cancelar", "pcNavLista()")}
          <div id="pc-msg" style="font-size:12px"></div>
        </div>
      </div>`;
  }

  window.pcToggleEv = function(k) {
    const cb  = document.getElementById(`ev-${k}`);
    const lbl = document.getElementById(`ev-lbl-${k}`);
    if (!cb) return;
    cb.checked = !cb.checked;
    const on = cb.checked;
    if (lbl) {
      lbl.style.borderColor  = on ? "var(--rose)" : "var(--bd2)";
      lbl.style.background   = on ? "rgba(229,62,62,.08)" : "var(--bg-surface)";
      lbl.style.color        = on ? "var(--rose)" : "var(--tx2)";
    }
  };

  window.pcSalvar = async function() {
    const msgEl = document.getElementById("pc-msg");
    const dataI = document.getElementById("pc-data")?.value;
    if (!dataI) { msgEl.textContent = "Data de início obrigatória."; msgEl.style.color = "var(--rose)"; return; }

    const pregs  = document.getElementById("pc-preg");
    const pregNm = pregs?.options[pregs.selectedIndex]?.getAttribute("data-nm") || null;
    const evs    = EVENTOS_ESPECIAIS.filter(e => document.getElementById(`ev-${e.k}`)?.checked).map(e => e.k);

    const payload = {
      data_inicio:        new Date(dataI).toISOString(),
      data_encerramento:  document.getElementById("pc-fim")?.value ? new Date(document.getElementById("pc-fim").value).toISOString() : null,
      tipo_culto_id:      document.getElementById("pc-tipo")?.value || null,
      titulo:             document.getElementById("pc-titulo")?.value?.trim() || null,
      tema:               document.getElementById("pc-tema")?.value?.trim()   || null,
      tema_do_mes:        document.getElementById("pc-temames")?.value?.trim()|| null,
      texto_biblico:      document.getElementById("pc-texto")?.value?.trim()  || null,
      pregador_id:        null,
      pregador_nome:      pregNm,
      dirigente_id:       null,
      dirigente_nome:     null,
      local_nome:         document.getElementById("pc-local")?.value?.trim()  || null,
      status:             document.getElementById("pc-status")?.value || "em_preparacao",
      eventos_especiais:  evs,
      observacoes:        document.getElementById("pc-obs")?.value?.trim()    || null,
      updated_at:         new Date().toISOString(),
    };

    const btn = document.querySelector("[onclick='pcSalvar()']");
    if (btn) btn.disabled = true;
    msgEl.textContent = "Salvando..."; msgEl.style.color = "var(--tx3)";

    try {
      const sb = _sb();
      let cultoId;
      if (_culto?.id) {
        await sb.from("cultos").update(payload).eq("id", _culto.id);
        cultoId = _culto.id;
      } else {
        const { data, error } = await sb.from("cultos").insert(payload).select("id").single();
        if (error) throw new Error(error.message);
        cultoId = data.id;
        // Criar blocos padrão no novo culto
        await _criarBlocosPadrao(cultoId);
      }
      // Gerar checklists de eventos especiais
      if (evs.length) {
        await _loadChecklists(cultoId);
        for (const ev of evs) await _gerarChecklistsEvento(cultoId, ev);
      }
      if (typeof T === "function") T("Culto salvo!", "");
      await _loadCulto(cultoId);
      _detTab = "geral";
      _show("detalhe");
    } catch (e) {
      msgEl.textContent = "Erro: " + e.message; msgEl.style.color = "var(--rose)";
      if (btn) btn.disabled = false;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     DETALHE DO CULTO
  ═══════════════════════════════════════════════════════════ */
  async function _renderDetalhe() {
    const r = _root();
    const c = _culto;
    if (!r || !c) { _show("lista"); return; }

    await Promise.all([
      _loadBlocos(c.id),
      _loadItens(c.id),
      _loadChecklists(c.id),
      _loadPosCulto(c.id),
    ]);

    const tipo    = c.culto_tipos;
    const cor     = tipo?.cor || "var(--sky)";
    const isEnc   = ["encerrado","arquivado","cancelado"].includes(c.status);

    r.innerHTML = `
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:14px">
        <div>
          <button onclick="pcNavLista()" style="background:none;border:none;color:var(--tx3);font-size:12px;cursor:pointer;padding:0;margin-bottom:8px">← Pró-Culto</button>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div style="font-size:16px;font-weight:800;color:var(--tx1)">${_esc(c.titulo || tipo?.nome || "Culto")}</div>
            ${_statusBadge(c.status)}
          </div>
          <div style="font-size:12px;color:var(--tx3);margin-top:4px;display:flex;gap:12px;flex-wrap:wrap">
            <span>${_fmtDtHr(c.data_inicio)}</span>
            ${tipo?.nome ? `<span>${_esc(tipo.nome)}</span>` : ""}
            ${c.local_nome ? `<span>${_esc(c.local_nome)}</span>` : ""}
          </div>
          ${(c.eventos_especiais||[]).length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${_evBadges(c.eventos_especiais)}</div>` : ""}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${!isEnc ? _btn("✏ Editar", `pcNavForm('${c.id}')`) : ""}
          ${c.status === "pronto" || c.status === "em_preparacao" || c.status === "encerrado"
            ? _btn("Duplicar", `pcDuplicar('${c.id}')`) : ""}
          ${c.status === "encerrado" && !_posCulto
            ? _btnPri("Pós-Culto", `pcDetTab('pos_culto')`) : ""}
        </div>
      </div>

      <!-- Resumo compacto -->
      ${_renderResumoTopo()}

      <!-- Tabs -->
      <div class="bnav" style="--mc:var(--teal);margin-bottom:16px">
        <div class="bni ${_detTab==="geral"?"on":""}"      onclick="pcDetTab('geral')">Visão Geral</div>
        <div class="bni ${_detTab==="liturgia"?"on":""}"   onclick="pcDetTab('liturgia')">Liturgia</div>
        <div class="bni ${_detTab==="escalas"?"on":""}"    onclick="pcDetTab('escalas')">Escalas</div>
        <div class="bni ${_detTab==="operacao"?"on":""}"   onclick="pcDetTab('operacao')">Operação</div>
        <div class="bni ${_detTab==="pos_culto"?"on":""}"  onclick="pcDetTab('pos_culto')">Pós-Culto</div>
      </div>
      <div id="pc-det-content"></div>`;

    _renderDetTab();
  }

  function _renderResumoTopo() {
    const c = _culto;
    if (!c) return "";
    return `
      <div style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:10px;padding:14px 18px;margin-bottom:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
        ${c.tema        ? `<div><div style="font-size:9px;font-weight:700;color:var(--tx4);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">Tema</div><div style="font-size:12px;color:var(--tx1);font-weight:600">${_esc(c.tema)}</div></div>` : ""}
        ${c.tema_do_mes ? `<div><div style="font-size:9px;font-weight:700;color:var(--tx4);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">Tema do Mês</div><div style="font-size:12px;color:var(--tx1)">${_esc(c.tema_do_mes)}</div></div>` : ""}
        ${c.texto_biblico ? `<div><div style="font-size:9px;font-weight:700;color:var(--tx4);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">Texto Bíblico</div><div style="font-size:12px;color:var(--sky);font-weight:600">${_esc(c.texto_biblico)}</div></div>` : ""}
        <div><div style="font-size:9px;font-weight:700;color:var(--tx4);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">Pregador</div><div style="font-size:12px;color:${c.pregador_nome?"var(--tx1)":"var(--amber)"};font-weight:600">${_esc(c.pregador_nome||"A definir")}</div></div>
        ${c.data_encerramento ? `<div><div style="font-size:9px;font-weight:700;color:var(--tx4);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">Encerramento previsto</div><div style="font-size:12px;color:var(--tx1)">${_fmtHr(c.data_encerramento)}</div></div>` : ""}
      </div>`;
  }

  window.pcDetTab = function(tab) {
    _detTab = tab;
    document.querySelectorAll("#pc-root .bnav .bni").forEach(el => {
      const t = el.getAttribute("onclick")?.match(/'(\w+)'/)?.[1];
      if (t) el.classList.toggle("on", t === tab);
    });
    _renderDetTab();
  };

  function _renderDetTab() {
    if      (_detTab === "geral")     _renderGeralTab();
    else if (_detTab === "liturgia")  _renderLiturgiaTab();
    else if (_detTab === "escalas")   _renderEscalasTab();
    else if (_detTab === "operacao")  _renderOperacaoTab();
    else if (_detTab === "pos_culto") _renderPosCultoTab();
  }

  /* ── Aba Visão Geral ─────────────────────────────────────── */
  function _renderGeralTab() {
    const el = document.getElementById("pc-det-content");
    if (!el) return;
    const c = _culto;

    // Alertas
    const alertas = [];
    if (!c.pregador_nome) alertas.push({ tipo: "atencao", msg: "Pregador ainda não definido." });
    if (!c.texto_biblico) alertas.push({ tipo: "atencao", msg: "Texto bíblico não informado." });
    if (!_itens.length)   alertas.push({ tipo: "atencao", msg: "Liturgia ainda não estruturada." });
    if ((c.eventos_especiais||[]).includes("batismo") && _checklists.filter(ch => ch.departamento==="ev_batismo" && ch.status!=="concluido").length)
      alertas.push({ tipo: "critico", msg: "Batismo confirmado, mas checklists pendentes." });

    // Progress
    const totalCheck = _checklists.length;
    const doneCheck  = _checklists.filter(ch => ch.status === "concluido").length;
    const pctCheck   = totalCheck ? Math.round(doneCheck / totalCheck * 100) : 0;

    const corAlerta = (t) => t==="critico" ? "var(--rose)" : t==="atencao" ? "var(--amber)" : "var(--sky)";
    const bgAlerta  = (t) => t==="critico" ? "rgba(229,62,62,.08)" : t==="atencao" ? "rgba(208,144,64,.08)" : "rgba(74,156,245,.08)";

    el.innerHTML = `
      ${alertas.length ? `
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
          ${alertas.map(a => `
            <div style="padding:10px 14px;border-radius:8px;background:${bgAlerta(a.tipo)};border:1px solid ${corAlerta(a.tipo)}33;font-size:12.5px;color:${corAlerta(a.tipo)}">
              ${a.tipo === "critico" ? "Crítico:" : "Atenção:"} ${a.msg}
            </div>`).join("")}
        </div>` : `
        <div style="padding:10px 14px;border-radius:8px;background:rgba(58,170,92,.08);border:1px solid rgba(58,170,92,.2);font-size:12.5px;color:var(--gr);margin-bottom:16px">
          Nenhum alerta no momento.
        </div>`}

      <div class="g2">
        <div class="card">
          <div class="ctit">Progresso</div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
            ${_progressRow("Liturgia", _itens.length ? 100 : 0, "itens estruturados")}
            ${_progressRow("Pregador", c.pregador_nome ? 100 : 0)}
            ${_progressRow("Checklists", pctCheck, `${doneCheck}/${totalCheck}`)}
          </div>
        </div>
        <div class="card">
          <div class="ctit">Dados do Culto</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;font-size:12.5px">
            ${_infoRow("Data", _fmtDtHr(c.data_inicio))}
            ${_infoRow("Tipo", c.culto_tipos?.nome || "—")}
            ${_infoRow("Local", c.local_nome || "—")}
            ${_infoRow("Pregador", c.pregador_nome || "A definir")}
            ${_infoRow("Texto Bíblico", c.texto_biblico || "—")}
            ${_infoRow("Itens na liturgia", String(_itens.length))}
            ${_infoRow("Checklists", `${doneCheck}/${totalCheck} concluídos`)}
            ${c.observacoes ? _infoRow("Observações", c.observacoes) : ""}
          </div>
        </div>
      </div>`;
  }

  function _progressRow(label, pct, sub = "") {
    const cor = pct === 100 ? "var(--gr)" : pct > 50 ? "var(--sky)" : pct > 0 ? "var(--amber)" : "var(--bd2)";
    return `
      <div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
          <span style="color:var(--tx2);font-weight:600">${label}</span>
          <span style="color:${cor};font-weight:700">${pct}%${sub ? " · " + sub : ""}</span>
        </div>
        <div style="background:var(--bg-surface);border-radius:4px;height:6px">
          <div style="height:100%;background:${cor};border-radius:4px;width:${pct}%;transition:width .3s"></div>
        </div>
      </div>`;
  }

  function _infoRow(label, val) {
    return `
      <div style="display:flex;justify-content:space-between;gap:12px;padding-bottom:8px;border-bottom:1px solid var(--bd1)">
        <span style="color:var(--tx3);flex-shrink:0">${label}</span>
        <span style="color:var(--tx1);text-align:right">${_esc(val)}</span>
      </div>`;
  }

  /* ── Aba Liturgia ────────────────────────────────────────── */
  function _renderLiturgiaTab() {
    const el = document.getElementById("pc-det-content");
    if (!el) return;

    // Agrupar itens por bloco
    const blocoMap = {};
    _blocos.forEach(b => { blocoMap[b.id] = { ...b, itens: [] }; });
    const semBloco = [];
    _itens.forEach(it => {
      if (it.bloco_id && blocoMap[it.bloco_id]) blocoMap[it.bloco_id].itens.push(it);
      else semBloco.push(it);
    });

    const duracaoTotal = _itens.reduce((s, it) => s + (it.duracao_prevista || 0), 0);
    const prevEnc = _culto?.data_inicio && duracaoTotal
      ? _fmtHr(new Date(new Date(_culto.data_inicio).getTime() + duracaoTotal * 60000).toISOString())
      : null;

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <div style="font-size:12px;color:var(--tx3)">
          ${_itens.length} itens · ${duracaoTotal} min previstos
          ${prevEnc ? ` · Encerramento previsto: <strong style="color:var(--tx2)">${prevEnc}</strong>` : ""}
        </div>
        <div style="display:flex;gap:8px">
          ${_btnPri("+ Adicionar Item", `pcAbrirItemForm(null,null)`)}
        </div>
      </div>

      ${_blocos.map(b => {
        const bits = blocoMap[b.id]?.itens || [];
        return `
          <div style="margin-bottom:16px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <div style="width:3px;height:18px;background:${b.cor||"var(--sky)"};border-radius:2px"></div>
              <span style="font-size:12px;font-weight:700;color:var(--tx1)">${_esc(b.nome)}</span>
              <button onclick="pcAbrirItemForm(null,'${b.id}')"
                style="background:none;border:1px dashed var(--bd2);border-radius:5px;padding:2px 8px;font-size:10px;color:var(--tx3);cursor:pointer;margin-left:auto">
                + item
              </button>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;padding-left:11px;border-left:1px solid var(--bd1)">
              ${bits.length ? bits.map(it => _itemRow(it)).join("") : `<div style="font-size:11px;color:var(--tx4);padding:8px 0">Nenhum item neste bloco</div>`}
            </div>
          </div>`;
      }).join("")}

      ${semBloco.length ? `
        <div style="margin-bottom:16px">
          <div style="font-size:12px;font-weight:700;color:var(--tx3);margin-bottom:8px">Sem bloco</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${semBloco.map(it => _itemRow(it)).join("")}
          </div>
        </div>` : ""}

      <!-- Modal de item -->
      <div id="pc-item-modal" style="display:none"></div>`;
  }

  function _itemRow(it) {
    const dur = it.duracao_prevista ? `${it.duracao_prevista}min` : "";
    const hr  = it.horario_previsto ? it.horario_previsto.slice(0,5) : "";
    const musicas = (it.culto_item_musicas || []);
    return `
      <div style="background:var(--bg-card);border:1px solid var(--bd1);border-radius:8px;padding:10px 14px">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div style="flex-shrink:0;text-align:center;min-width:36px">
            ${hr ? `<div style="font-size:10px;font-weight:700;color:var(--sky)">${hr}</div>` : ""}
            ${dur ? `<div style="font-size:9px;color:var(--tx4)">${dur}</div>` : ""}
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap">
              ${_tipoBadge(it.tipo)}
              <span style="font-size:13px;font-weight:600;color:var(--tx1)">${_esc(it.titulo)}</span>
            </div>
            ${it.responsavel_nome ? `<div style="font-size:11px;color:var(--tx3)">Responsável: ${_esc(it.responsavel_nome)}</div>` : ""}
            ${it.texto_biblico ? `<div style="font-size:11px;color:var(--sky)">${_esc(it.texto_biblico)}</div>` : ""}
            ${musicas.length ? `<div style="font-size:11px;color:var(--tx3);margin-top:3px">${musicas.map(m => _esc(m.titulo)).join(" · ")}</div>` : ""}
            ${it.observacoes_tecnicas ? `<div style="font-size:10px;color:var(--amber);margin-top:3px;font-style:italic">${_esc(it.observacoes_tecnicas)}</div>` : ""}
          </div>
          <div style="flex-shrink:0;display:flex;gap:4px">
            <button onclick="pcAbrirItemForm('${it.id}',null)"
              style="background:none;border:1px solid var(--bd2);border-radius:5px;padding:3px 8px;font-size:11px;color:var(--tx2);cursor:pointer">
              ✏
            </button>
            <button onclick="pcExcluirItem('${it.id}')"
              style="background:none;border:1px solid var(--bd2);border-radius:5px;padding:3px 8px;font-size:11px;color:var(--rose);cursor:pointer">
              ✕
            </button>
          </div>
        </div>
      </div>`;
  }

  window.pcAbrirItemForm = function(itemId, blocoId) {
    const modal = document.getElementById("pc-item-modal");
    if (!modal) return;

    const it    = itemId ? _itens.find(i => i.id === itemId) : null;
    const bId   = blocoId || it?.bloco_id || (_blocos[0]?.id || null);
    const inp   = "width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px;box-sizing:border-box;outline:none;font-family:inherit";
    const lbl2  = "display:block;font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px";

    modal.style.display = "block";
    modal.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;padding:20px;margin-top:16px">
        <div style="font-size:13px;font-weight:700;color:var(--tx1);margin-bottom:14px">${it ? "Editar Item" : "Novo Item"}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div>
            <label style="${lbl2}">Bloco</label>
            <select id="pci-bloco" style="${inp}">
              <option value="">Sem bloco</option>
              ${_blocos.map(b => `<option value="${b.id}" ${b.id===bId?"selected":""}>${_esc(b.nome)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label style="${lbl2}">Tipo</label>
            <select id="pci-tipo" style="${inp}">
              ${Object.entries(TIPO_ITEM_CFG).map(([k,v]) => `<option value="${k}" ${(it?.tipo||"item")===k?"selected":""}>${v.lbl}</option>`).join("")}
            </select>
          </div>
        </div>
        <div style="margin-bottom:10px">
          <label style="${lbl2}">Título <span style="color:var(--rose)">*</span></label>
          <input id="pci-titulo" style="${inp}" value="${_esc(it?.titulo||"")}" placeholder="Ex: Momento de Louvor">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div>
            <label style="${lbl2}">Horário Previsto</label>
            <input id="pci-hr" type="time" style="${inp}" value="${it?.horario_previsto||""}">
          </div>
          <div>
            <label style="${lbl2}">Duração (minutos)</label>
            <input id="pci-dur" type="number" min="1" max="120" style="${inp}" value="${it?.duracao_prevista||""}">
          </div>
        </div>
        <div style="margin-bottom:10px">
          <label style="${lbl2}">Responsável</label>
          <input id="pci-resp" style="${inp}" value="${_esc(it?.responsavel_nome||"")}" placeholder="Nome ou equipe">
        </div>
        <div style="margin-bottom:10px">
          <label style="${lbl2}">Texto Bíblico</label>
          <input id="pci-texto" style="${inp}" value="${_esc(it?.texto_biblico||"")}" placeholder="Ex: João 3.16">
        </div>
        <div style="margin-bottom:10px">
          <label style="${lbl2}">Obs. Técnicas (áudio, projeção, iluminação)</label>
          <input id="pci-obs" style="${inp}" value="${_esc(it?.observacoes_tecnicas||"")}" placeholder="Instruções para equipe técnica">
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${_btnPri("Salvar item", `pcSalvarItem('${itemId||""}')`)}
          ${_btn("Cancelar", "document.getElementById('pc-item-modal').style.display='none'")}
          <div id="pci-msg" style="font-size:11px"></div>
        </div>
      </div>`;
  };

  window.pcSalvarItem = async function(itemId) {
    const msgEl = document.getElementById("pci-msg");
    const titulo = document.getElementById("pci-titulo")?.value?.trim();
    if (!titulo) { if(msgEl){msgEl.textContent="Título obrigatório.";msgEl.style.color="var(--rose)";} return; }

    const maxOrdem = _itens.length ? Math.max(..._itens.map(i=>i.ordem)) + 1 : 0;
    const payload = {
      culto_id:            _culto.id,
      bloco_id:            document.getElementById("pci-bloco")?.value || null,
      tipo:                document.getElementById("pci-tipo")?.value || "item",
      titulo,
      horario_previsto:    document.getElementById("pci-hr")?.value  || null,
      duracao_prevista:    parseInt(document.getElementById("pci-dur")?.value)||null,
      responsavel_nome:    document.getElementById("pci-resp")?.value?.trim()||null,
      texto_biblico:       document.getElementById("pci-texto")?.value?.trim()||null,
      observacoes_tecnicas:document.getElementById("pci-obs")?.value?.trim()||null,
      ordem:               maxOrdem,
    };

    try {
      if (itemId) {
        await _sb().from("culto_liturgia_itens").update(payload).eq("id", itemId);
      } else {
        await _sb().from("culto_liturgia_itens").insert(payload);
      }
      await _loadItens(_culto.id);
      document.getElementById("pc-item-modal").style.display = "none";
      _renderLiturgiaTab();
    } catch (e) {
      if (msgEl) { msgEl.textContent = "Erro: " + e.message; msgEl.style.color = "var(--rose)"; }
    }
  };

  window.pcExcluirItem = async function(itemId) {
    if (!confirm("Remover este item da liturgia?")) return;
    await _sb().from("culto_liturgia_itens").delete().eq("id", itemId);
    await _loadItens(_culto.id);
    _renderLiturgiaTab();
  };

  /* ── Aba Escalas ─────────────────────────────────────────── */
  function _renderEscalasTab() {
    const el = document.getElementById("pc-det-content");
    if (!el) return;
    const c = _culto;

    const _bloco = (titulo, cor, items) => `
      <div class="card" style="margin-bottom:12px;border-left:3px solid ${cor}">
        <div class="ctit" style="margin-bottom:10px">${titulo}</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${items.map(([l,v,alerta]) => `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;padding-bottom:6px;border-bottom:1px solid var(--bd1)">
              <span style="color:var(--tx3)">${l}</span>
              <span style="color:${alerta?"var(--amber)":"var(--tx1)"};font-weight:${alerta?"normal":"600"}">${_esc(v||"A definir")}</span>
            </div>`).join("")}
        </div>
      </div>`;

    el.innerHTML = `
      <div class="g2">
        ${_bloco("Pastoral", "var(--teal)", [
          ["Pregador", c.pregador_nome, !c.pregador_nome],
        ])}
        ${_bloco("Liturgia", "var(--sky)", [
          ["Texto Bíblico", c.texto_biblico, !c.texto_biblico],
          ["Tema",          c.tema,          !c.tema],
        ])}
      </div>
      <div style="margin-top:6px;padding:12px 14px;background:var(--bg-surface);border-radius:8px;border:1px solid var(--bd1);font-size:11.5px;color:var(--tx3)">
        As escalas de Junta Diaconal, Integração, Louvor e equipes técnicas serão integradas em breve a partir dos módulos correspondentes.
      </div>`;
  }

  /* ── Aba Operação (Checklists) ───────────────────────────── */
  function _renderOperacaoTab() {
    const el = document.getElementById("pc-det-content");
    if (!el) return;

    const byDep = {};
    _checklists.forEach(ch => {
      if (!byDep[ch.departamento]) byDep[ch.departamento] = [];
      byDep[ch.departamento].push(ch);
    });

    const DEP_LABELS = {
      pastoral:     "Pastoral",
      diaconal:     "Junta Diaconal",
      integracao:   "Integração",
      louvor:       "Louvor",
      audio:        "Áudio",
      projecao:     "Projeção",
      transmissao:  "Transmissão",
      comunicacao:  "Comunicação",
      infra:        "Infraestrutura",
      ev_batismo:   "Batismo",
      ev_santa_ceia:"Santa Ceia",
      ev_recepcao:  "Recepção de Membros",
      ev_apresentacao:"Apresentação Infantil",
    };

    const statusCfg = {
      nao_iniciado:  { lbl: "Não iniciado",  cor: "var(--tx3)"  },
      em_andamento:  { lbl: "Em andamento",  cor: "var(--sky)"  },
      concluido:     { lbl: "Concluído",     cor: "var(--gr)"   },
      bloqueado:     { lbl: "Bloqueado",     cor: "var(--rose)" },
      nao_aplicavel: { lbl: "N/A",           cor: "var(--tx4)"  },
    };

    const depOrder = Object.keys(DEP_LABELS);
    const deps = [...new Set([
      ...depOrder.filter(d => byDep[d]),
      ...Object.keys(byDep).filter(d => !depOrder.includes(d)),
    ])];

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
        <div style="font-size:12px;color:var(--tx3)">${_checklists.filter(c=>c.status==="concluido").length}/${_checklists.length} itens concluídos</div>
        ${_btnPri("+ Adicionar Item", "pcAbrirChecklistForm()")}
      </div>
      ${deps.length ? deps.map(dep => {
        const items = byDep[dep] || [];
        const done  = items.filter(i=>i.status==="concluido").length;
        const depLbl = DEP_LABELS[dep] || dep;
        return `
          <div class="card" style="margin-bottom:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <div class="ctit" style="margin-bottom:0">${_esc(depLbl)} <span style="font-size:10px;color:var(--tx3);font-weight:400">${done}/${items.length}</span></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${items.map(ch => {
                const sc = statusCfg[ch.status] || statusCfg.nao_iniciado;
                return `
                  <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
                    <input type="checkbox" ${ch.status==="concluido"?"checked":""} onclick="pcToggleCheck('${ch.id}',this.checked)"
                      style="width:15px;height:15px;accent-color:var(--gr);cursor:pointer;flex-shrink:0">
                    <span style="flex:1;font-size:12.5px;color:var(--tx${ch.status==="concluido"?"3":"1"});text-decoration:${ch.status==="concluido"?"line-through":"none"}">${_esc(ch.titulo)}</span>
                    <select onchange="pcSetCheckStatus('${ch.id}',this.value)"
                      style="font-size:10px;padding:2px 6px;border-radius:5px;border:1px solid var(--bd2);background:var(--bg-surface);color:${sc.cor};outline:none;font-family:inherit">
                      ${Object.entries(statusCfg).map(([k,v]) => `<option value="${k}" ${ch.status===k?"selected":""}>${v.lbl}</option>`).join("")}
                    </select>
                  </div>`;
              }).join("")}
            </div>
          </div>`;
      }).join("") : `
        <div style="text-align:center;padding:40px;color:var(--tx3);font-size:13px">
          Nenhum checklist. Adicione manualmente ou selecione eventos especiais no culto para gerar automaticamente.
        </div>`}
      <div id="pc-check-modal" style="display:none"></div>`;
  }

  window.pcToggleCheck = async function(id, checked) {
    const status = checked ? "concluido" : "nao_iniciado";
    await _sb().from("culto_checklists").update({
      status,
      concluido_em: checked ? new Date().toISOString() : null,
    }).eq("id", id);
    const ch = _checklists.find(c=>c.id===id);
    if (ch) { ch.status = status; ch.concluido_em = checked ? new Date().toISOString() : null; }
    _renderOperacaoTab();
  };

  window.pcSetCheckStatus = async function(id, status) {
    await _sb().from("culto_checklists").update({ status }).eq("id", id);
    const ch = _checklists.find(c=>c.id===id);
    if (ch) ch.status = status;
    _renderOperacaoTab();
  };

  window.pcAbrirChecklistForm = function() {
    const modal = document.getElementById("pc-check-modal");
    if (!modal) return;
    const inp = "width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px;box-sizing:border-box;outline:none;font-family:inherit";
    const deps = ["pastoral","diaconal","integracao","louvor","audio","projecao","transmissao","comunicacao","infra","outro"];
    modal.style.display = "block";
    modal.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:16px;margin-top:12px">
        <div style="margin-bottom:10px">
          <label style="display:block;font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Departamento</label>
          <select id="pcc-dep" style="${inp}">
            ${deps.map(d => `<option value="${d}">${d.charAt(0).toUpperCase()+d.slice(1)}</option>`).join("")}
          </select>
        </div>
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Descrição</label>
          <input id="pcc-titulo" style="${inp}" placeholder="O que deve ser verificado?">
        </div>
        <div style="display:flex;gap:8px">
          ${_btnPri("Adicionar", "pcSalvarChecklist()")}
          ${_btn("Cancelar", "document.getElementById('pc-check-modal').style.display='none'")}
          <div id="pcc-msg" style="font-size:11px"></div>
        </div>
      </div>`;
  };

  window.pcSalvarChecklist = async function() {
    const titulo = document.getElementById("pcc-titulo")?.value?.trim();
    const dep    = document.getElementById("pcc-dep")?.value;
    const msg    = document.getElementById("pcc-msg");
    if (!titulo) { if(msg){msg.textContent="Descrição obrigatória.";msg.style.color="var(--rose)";} return; }
    const ordem = _checklists.filter(c=>c.departamento===dep).length;
    const { data, error } = await _sb().from("culto_checklists").insert({
      culto_id: _culto.id, departamento: dep, titulo, ordem
    }).select().single();
    if (error) { if(msg){msg.textContent="Erro: "+error.message;msg.style.color="var(--rose)";} return; }
    _checklists.push(data);
    document.getElementById("pc-check-modal").style.display = "none";
    _renderOperacaoTab();
  };

  /* ── Aba Pós-Culto ───────────────────────────────────────── */
  function _renderPosCultoTab() {
    const el = document.getElementById("pc-det-content");
    if (!el) return;
    const pc = _posCulto || {};
    const inp = "width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:13px;box-sizing:border-box;outline:none;font-family:inherit";
    const lbl = "display:block;font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px";

    el.innerHTML = `
      <div class="card" style="max-width:600px">
        <div class="ctit" style="margin-bottom:16px">Registro Pós-Culto</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div><label style="${lbl}">Início real</label><input id="pcp-ini" type="datetime-local" style="${inp}" value="${pc.horario_inicio_real?.slice(0,16)||""}"></div>
          <div><label style="${lbl}">Encerramento real</label><input id="pcp-fim" type="datetime-local" style="${inp}" value="${pc.horario_fim_real?.slice(0,16)||""}"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px">
          <div><label style="${lbl}">Adultos</label><input id="pcp-adt" type="number" min="0" style="${inp}" value="${pc.adultos||""}"></div>
          <div><label style="${lbl}">Crianças</label><input id="pcp-cri" type="number" min="0" style="${inp}" value="${pc.criancas||""}"></div>
          <div><label style="${lbl}">Visitantes</label><input id="pcp-vis" type="number" min="0" style="${inp}" value="${pc.visitantes||""}"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <div><label style="${lbl}">Decisões</label><input id="pcp-dec" type="number" min="0" style="${inp}" value="${pc.decisoes||0}"></div>
          <div><label style="${lbl}">Reconciliações</label><input id="pcp-rec" type="number" min="0" style="${inp}" value="${pc.reconciliacoes||0}"></div>
          <div><label style="${lbl}">Batismos realizados</label><input id="pcp-bat" type="number" min="0" style="${inp}" value="${pc.batismos_realizados||0}"></div>
          <div><label style="${lbl}">Membros recebidos</label><input id="pcp-mem" type="number" min="0" style="${inp}" value="${pc.membros_recebidos||0}"></div>
        </div>
        <div style="margin-top:12px"><label style="${lbl}">Obs. Pastorais</label><textarea id="pcp-obs" style="${inp};resize:vertical;min-height:70px">${_esc(pc.observacoes_pastorais||"")}</textarea></div>
        <div style="margin-top:10px"><label style="${lbl}">Problemas Técnicos</label><textarea id="pcp-tec" style="${inp};resize:vertical;min-height:60px">${_esc(pc.problemas_tecnicos||"")}</textarea></div>
        <div style="margin-top:10px"><label style="${lbl}">Relatório</label><textarea id="pcp-rel" style="${inp};resize:vertical;min-height:80px">${_esc(pc.relatorio||"")}</textarea></div>
        <div style="margin-top:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          ${_btnPri("Salvar Registro", "pcSalvarPosCulto()")}
          <div id="pcp-msg" style="font-size:12px"></div>
        </div>
      </div>`;
  }

  window.pcSalvarPosCulto = async function() {
    const msg = document.getElementById("pcp-msg");
    const v = (id) => document.getElementById(id)?.value;
    const n = (id) => parseInt(v(id)) || 0;
    const payload = {
      culto_id:             _culto.id,
      horario_inicio_real:  v("pcp-ini") ? new Date(v("pcp-ini")).toISOString() : null,
      horario_fim_real:     v("pcp-fim") ? new Date(v("pcp-fim")).toISOString() : null,
      adultos:              n("pcp-adt") || null,
      criancas:             n("pcp-cri") || null,
      visitantes:           n("pcp-vis") || null,
      decisoes:             n("pcp-dec"),
      reconciliacoes:       n("pcp-rec"),
      batismos_realizados:  n("pcp-bat"),
      membros_recebidos:    n("pcp-mem"),
      observacoes_pastorais:v("pcp-obs")?.trim()||null,
      problemas_tecnicos:   v("pcp-tec")?.trim()||null,
      relatorio:            v("pcp-rel")?.trim()||null,
      updated_at:           new Date().toISOString(),
    };
    try {
      if (_posCulto?.id) {
        await _sb().from("culto_pos_culto").update(payload).eq("id", _posCulto.id);
      } else {
        const { data } = await _sb().from("culto_pos_culto").insert(payload).select().single();
        _posCulto = data;
      }
      if (typeof T === "function") T("Pós-culto salvo!", "");
      if (msg) { msg.textContent = "Salvo com sucesso."; msg.style.color = "var(--gr)"; }
    } catch (e) {
      if (msg) { msg.textContent = "Erro: " + e.message; msg.style.color = "var(--rose)"; }
    }
  };

  /* ── Duplicar culto ──────────────────────────────────────── */
  window.pcDuplicar = async function(cultoId) {
    if (!confirm("Duplicar este culto? A estrutura da liturgia será copiada, mas pregador, tema e eventos especiais não.")) return;
    const orig = _cultos.find(c=>c.id===cultoId) || _culto;
    if (!orig) return;
    const nextData = new Date(orig.data_inicio);
    nextData.setDate(nextData.getDate() + 7);
    const payload = {
      tipo_culto_id:    orig.tipo_culto_id,
      local_nome:       orig.local_nome,
      tema_do_mes:      orig.tema_do_mes,
      data_inicio:      nextData.toISOString(),
      duracao_prevista: orig.duracao_prevista,
      status:           "em_preparacao",
      eventos_especiais:[],
    };
    const { data, error } = await _sb().from("cultos").insert(payload).select("id").single();
    if (error) { alert("Erro: " + error.message); return; }
    // Duplicar blocos
    if (_blocos.length) {
      const rows = _blocos.map(b => ({ culto_id: data.id, nome: b.nome, cor: b.cor, ordem: b.ordem }));
      const { data: novBlocos } = await _sb().from("culto_liturgia_blocos").insert(rows).select();
      // Duplicar itens (mapeando bloco_id)
      const mapaBloco = {};
      _blocos.forEach((b,i) => { if(novBlocos?.[i]) mapaBloco[b.id] = novBlocos[i].id; });
      const itensCopia = _itens.map(it => ({
        culto_id:            data.id,
        bloco_id:            it.bloco_id ? (mapaBloco[it.bloco_id]||null) : null,
        ordem:               it.ordem,
        horario_previsto:    it.horario_previsto,
        duracao_prevista:    it.duracao_prevista,
        titulo:              it.titulo,
        tipo:                it.tipo,
        observacoes_tecnicas:it.observacoes_tecnicas,
      }));
      if (itensCopia.length) await _sb().from("culto_liturgia_itens").insert(itensCopia);
    }
    if (typeof T === "function") T("Culto duplicado!", "Abra o novo culto para completar as informações.");
    await _loadCultos(_filtroAno, _filtroMes);
    _show("lista");
  };

  /* ── Navegação pública ───────────────────────────────────── */
  window.pcNavLista = async function() {
    _culto = null;
    _blocos = []; _itens = []; _checklists = []; _posCulto = null;
    _show("lista");
  };

  window.pcNavForm = async function(cultoId) {
    if (cultoId) {
      await _loadCulto(cultoId);
    } else {
      _culto = null;
    }
    _show("form");
  };

  window.pcNavDetalhe = async function(cultoId) {
    await _loadCulto(cultoId);
    _detTab = "geral";
    _show("detalhe");
  };

  window.pcSetAno = function(ano, mes) {
    _filtroAno = ano;
    if (mes) _filtroMes = mes;
    _show("lista");
  };

  window.pcSetMes = function(mes, ano) {
    _filtroMes = mes;
    if (ano) _filtroAno = ano;
    _show("lista");
  };

  /* ── Mount ───────────────────────────────────────────────── */
  window.pcMount = function() {
    _show("lista");
  };

  document.addEventListener("sipen:navigate", function(e) {
    if (e.detail?.id === "pastoral-proculto") {
      _show(_nav === "detalhe" ? "detalhe" : "lista");
    }
  });

})();
