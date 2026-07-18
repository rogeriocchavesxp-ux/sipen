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
    preludio:     { lbl: "Prelúdio",          cor: "var(--tx3)"    },
    inicio:       { lbl: "Início do Culto",   cor: "var(--sky)"    },
    leitura:      { lbl: "Leitura Bíblica",   cor: "var(--teal)"   },
    oracao:       { lbl: "Oração",            cor: "var(--gr)"     },
    louvor:       { lbl: "Momento de Louvor", cor: "var(--violet)" },
    musica:       { lbl: "Música",            cor: "var(--violet)" },
    hino:         { lbl: "Hino",              cor: "var(--violet)" },
    coral:        { lbl: "Coral",             cor: "var(--violet)" },
    intercessao:  { lbl: "Intercessão",       cor: "var(--gr)"     },
    oferta:       { lbl: "Dízimos e Ofertas", cor: "var(--amber)"  },
    pregacao:     { lbl: "Pregação",          cor: "var(--sky)"    },
    encerramento: { lbl: "Encerramento",      cor: "var(--teal)"   },
    informativo:  { lbl: "Informativos",      cor: "var(--tx3)"    },
    posludio:     { lbl: "Poslúdio",          cor: "var(--tx3)"    },
    item:         { lbl: "Outro",             cor: "var(--tx3)"    },
    anuncio:      { lbl: "Anúncio",           cor: "var(--amber)"  },
    ceia:         { lbl: "Santa Ceia",        cor: "var(--teal)"   },
    batismo:      { lbl: "Batismo",           cor: "var(--sky)"    },
    outro:        { lbl: "Outro",             cor: "var(--tx3)"    },
  };

  // Modelos por bloco (sugestões de itens pré-preenchidos)
  const _MODELOS_BLOCO = {
    "Vamos Contritos": [
      { tipo:"preludio",    titulo:"Prelúdio",            dur:5,  resp:"Pianistas"        },
      { tipo:"inicio",      titulo:"Início do Culto",     dur:3,  resp:""                 },
      { tipo:"leitura",     titulo:"Leitura Bíblica",     dur:3,  resp:"Projeção / Áudio" },
      { tipo:"oracao",      titulo:"Oração de Confissão", dur:4,  resp:""                 },
      { tipo:"hino",        titulo:"Hino Inicial",        dur:4,  resp:"Congregação"      },
      { tipo:"coral",       titulo:"Coral",               dur:8,  resp:"Coral"            },
    ],
    "Vamos Adorar": [
      { tipo:"louvor",      titulo:"Momento de Louvor",   dur:15, resp:"Equipe de Louvor" },
      { tipo:"musica",      titulo:"Música",              dur:4,  resp:"Equipe de Louvor" },
      { tipo:"leitura",     titulo:"Leitura Bíblica",     dur:3,  resp:"Projeção / Áudio" },
      { tipo:"intercessao", titulo:"Intercessão",         dur:5,  resp:""                 },
      { tipo:"oferta",      titulo:"Dízimos e Ofertas",   dur:5,  resp:""                 },
      { tipo:"hino",        titulo:"Hino",                dur:3,  resp:"Congregação"      },
      { tipo:"coral",       titulo:"Coral",               dur:8,  resp:"Coral"            },
    ],
    "Vamos a Cristo": [
      { tipo:"pregacao",    titulo:"Pregação",            dur:45, resp:"_pregador"        },
      { tipo:"leitura",     titulo:"Texto da Pregação",   dur:3,  resp:""                 },
      { tipo:"oracao",      titulo:"Oração",              dur:4,  resp:""                 },
      { tipo:"musica",      titulo:"Música após a Mensagem", dur:4, resp:"Equipe de Louvor"},
    ],
    "Vamos Abençoar": [
      { tipo:"encerramento",titulo:"Encerramento",        dur:3,  resp:""                 },
      { tipo:"oracao",      titulo:"Oração Final",        dur:3,  resp:""                 },
      { tipo:"hino",        titulo:"Tríplice Amém",       dur:2,  resp:"Congregação"      },
      { tipo:"posludio",    titulo:"Poslúdio",            dur:5,  resp:"Pianistas"        },
      { tipo:"informativo", titulo:"Informativos",        dur:3,  resp:""                 },
      { tipo:"outro",       titulo:"Visitantes e Recados",dur:2,  resp:""                 },
    ],
  };

  // Tipos disponíveis na planilha (excluindo legados)
  const _TIPOS_PL = Object.entries(TIPO_ITEM_CFG)
    .filter(([k]) => !['item','anuncio','ceia','batismo'].includes(k))
    .map(([k,v]) => ({ k, l: v.lbl, cor: v.cor }));

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
  let _pessoas         = [];
  // Planilha de liturgia
  let _collapsedBlocos = {};
  let _expandedRows    = {};
  let _newRowState     = {};
  let _dragSrcId       = null;

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
    const c = TIPO_ITEM_CFG[tipo] || TIPO_ITEM_CFG.outro;
    return `<span style="font-size:9px;padding:1px 7px;border-radius:6px;border:1px solid ${c.cor}44;color:${c.cor};font-weight:700">${c.lbl}</span>`;
  }

  // Helpers de horário
  function _hmToMin(s) {
    if (!s) return null;
    const [h, m] = s.slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  }
  function _minToHm(n) {
    const h = Math.floor(n / 60) % 24;
    const m = n % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }
  function _tipoPl(k) {
    return TIPO_ITEM_CFG[k] || TIPO_ITEM_CFG.outro;
  }

  // Retorna todos os itens na ordem global (bloco_ordem, item_ordem)
  function _itensOrdenados() {
    const blocoOrder = Object.fromEntries(_blocos.map((b, i) => [b.id, i]));
    return [..._itens].sort((a, b) => {
      const ba = blocoOrder[a.bloco_id] ?? 99, bb = blocoOrder[b.bloco_id] ?? 99;
      if (ba !== bb) return ba - bb;
      return (a.ordem ?? 0) - (b.ordem ?? 0);
    });
  }

  // Recalcula horarios em memória; retorna lista de {id, horario_previsto} alterados
  function _recalcTimes() {
    const sorted  = _itensOrdenados();
    const changed = [];
    let curMin    = null;
    for (let i = 0; i < sorted.length; i++) {
      const it = sorted[i];
      if (curMin === null) {
        curMin = _hmToMin(it.horario_previsto);
      } else {
        if (curMin !== null) {
          const newHm  = _minToHm(curMin) + ':00';
          const found  = _itens.find(x => x.id === it.id);
          if (found && found.horario_previsto !== newHm) {
            found.horario_previsto = newHm;
            changed.push({ id: it.id, horario_previsto: newHm });
          }
        }
      }
      if (curMin !== null) curMin += (it.duracao_prevista || 0);
    }
    return changed;
  }

  async function _persistarHorarios(changed) {
    for (const c of changed) {
      await _sb().from('culto_liturgia_itens')
        .update({ horario_previsto: c.horario_previsto }).eq('id', c.id);
    }
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

    const optsPastores = _pessoas.map(p => `<option value="${_esc(p.nome)}" ${c.pregador_nome===p.nome?"selected":""}>${_esc(p.nome)}</option>`).join("");

    r.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div style="font-size:15px;font-weight:700;color:var(--tx1)">${c.id ? "Editar Culto" : "Novo Culto"}</div>
        ${_btn("← Cancelar", "pcNavLista()")}
      </div>
      <div class="card" style="max-width:700px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${fld("Data e Horário de Início <span style='color:var(--rose)'>*</span>",
            `<input id="pc-data" type="datetime-local" style="${inp}" value="${dataInicio}" onchange="pcBuscarPregador()">`)}
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
          `<div style="position:relative">
            <div id="pc-preg-display" style="${inp};display:flex;align-items:center;gap:8px;min-height:42px;cursor:default">
              <span id="pc-preg-nome" style="flex:1;color:${c.pregador_nome?'var(--tx1)':'var(--tx4)'}">${_esc(c.pregador_nome||'Preencha a data para buscar da escala')}</span>
              <span id="pc-preg-src" style="font-size:10px;color:var(--teal);font-weight:600">${c.pregador_nome?'escala':''}</span>
            </div>
            <input type="hidden" id="pc-preg-value" value="${_esc(c.pregador_nome||'')}">
            <div id="pc-preg-manual" style="display:none;margin-top:6px">
              <select id="pc-preg-sel" style="${inp}" onchange="document.getElementById('pc-preg-value').value=this.value;document.getElementById('pc-preg-nome').textContent=this.value||'—';document.getElementById('pc-preg-src').textContent=this.value?'manual':''">
                <option value="">— A definir —</option>
                ${optsPastores}
              </select>
            </div>
            <button onclick="pcTogglePregOverride()" type="button" style="background:none;border:none;font-size:10px;color:var(--tx3);cursor:pointer;padding:4px 0;text-decoration:underline">
              <span id="pc-preg-override-lbl">${c.pregador_nome?'Alterar manualmente':'Preencher manualmente'}</span>
            </button>
          </div>`)}
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
    // Auto-buscar pregador se não há pregador definido e há data
    if (!c.pregador_nome && dataInicio) setTimeout(pcBuscarPregador, 50);
  }

  /* Mapeamento de nome de tipo de culto → culto_tipo da escala */
  function _matchEscalaTipo(tipoNome, escalaTipo) {
    const n = (tipoNome || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (escalaTipo === "domingo_manha")       return n.includes("manha") || (n.includes("dominical") && (n.includes("manha") || n.includes("manha")));
    if (escalaTipo === "domingo_noite")       return n.includes("noite");
    if (escalaTipo === "conexao_com_deus")    return n.includes("conexao") || n.includes("conexion");
    if (escalaTipo === "tarde_da_esperanca")  return n.includes("tarde") || n.includes("esperanca");
    return false;
  }

  window.pcBuscarPregador = async function() {
    const dataVal = document.getElementById("pc-data")?.value;
    const nomeEl  = document.getElementById("pc-preg-nome");
    const srcEl   = document.getElementById("pc-preg-src");
    const valEl   = document.getElementById("pc-preg-value");
    if (!nomeEl || !valEl) return;
    if (!dataVal) {
      nomeEl.textContent = "Preencha a data para buscar da escala";
      nomeEl.style.color = "var(--tx4)";
      srcEl.textContent  = "";
      valEl.value        = "";
      return;
    }
    const date = dataVal.slice(0, 10); // YYYY-MM-DD
    nomeEl.textContent = "Buscando na escala…";
    nomeEl.style.color = "var(--tx3)";
    srcEl.textContent  = "";

    const { data: entradas } = await _sb()
      .from("escala_pregacao")
      .select("culto_tipo, pastores(nome_completo,nome_exibicao)")
      .eq("data", date)
      .not("pastor_id", "is", null);

    if (!entradas?.length) {
      nomeEl.textContent = "Sem escala para esta data";
      nomeEl.style.color = "var(--amber)";
      valEl.value        = "";
      return;
    }

    // Tentar casar pelo tipo de culto selecionado
    const tipoId   = document.getElementById("pc-tipo")?.value;
    const tipoNome = _tipos.find(t => t.id === tipoId)?.nome || "";
    const match    = entradas.find(e => _matchEscalaTipo(tipoNome, e.culto_tipo)) || entradas[0];
    const nome     = match.pastores?.nome_exibicao || match.pastores?.nome_completo || null;

    if (nome) {
      nomeEl.textContent = nome;
      nomeEl.style.color = "var(--tx1)";
      srcEl.textContent  = "escala";
      valEl.value        = nome;
    } else {
      nomeEl.textContent = "Sem pregador definido na escala";
      nomeEl.style.color = "var(--amber)";
      valEl.value        = "";
    }
  };

  window.pcTogglePregOverride = function() {
    const manual = document.getElementById("pc-preg-manual");
    const lbl    = document.getElementById("pc-preg-override-lbl");
    if (!manual) return;
    const isOpen = manual.style.display !== "none";
    manual.style.display = isOpen ? "none" : "block";
    if (lbl) lbl.textContent = isOpen ? "Alterar manualmente" : "Usar da escala";
    if (!isOpen) {
      const sel = document.getElementById("pc-preg-sel");
      if (sel) sel.focus();
      // Volta para escala ao fechar
    } else {
      pcBuscarPregador();
    }
  };

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

    const pregNm = document.getElementById("pc-preg-value")?.value?.trim() || null;
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
    const blocosVazios = _blocos.filter(b => !_itens.some(i => i.bloco_id === b.id));
    if (blocosVazios.length === _blocos.length) alertas.push({ tipo: "atencao", msg: "Liturgia ainda não estruturada." });
    else if (blocosVazios.length) alertas.push({ tipo: "atencao", msg: `Blocos sem itens: ${blocosVazios.map(b => b.nome).join(", ")}.` });
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
            ${(function(){
              if (!_blocos.length) return _progressRow("Liturgia", 0, "sem blocos");
              const blocosComItens = _blocos.filter(b => _itens.some(i => i.bloco_id === b.id)).length;
              const pct = Math.round(blocosComItens / _blocos.length * 100);
              return _progressRow("Liturgia", pct, `${blocosComItens}/${_blocos.length} blocos com itens`);
            })()}
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

  /* ═══════════════════════════════════════════════════════════
     ABA LITURGIA — PLANILHA DE CULTO
  ═══════════════════════════════════════════════════════════ */
  function _renderLiturgiaTab() {
    const el = document.getElementById("pc-det-content");
    if (!el) return;
    const page  = document.getElementById("page");
    const scrollY = page?.scrollTop || 0;

    // Agrupa e ordena
    const byBloco = {};
    _blocos.forEach(b => { byBloco[b.id] = []; });
    _itens.forEach(it => { if (it.bloco_id && byBloco[it.bloco_id]) byBloco[it.bloco_id].push(it); });
    _blocos.forEach(b => byBloco[b.id]?.sort((a, c) => (a.ordem ?? 0) - (c.ordem ?? 0)));

    const totalDur = _itens.reduce((s, it) => s + (it.duracao_prevista || 0), 0);
    const sorted   = _itensOrdenados();
    const hrIni    = sorted[0]?.horario_previsto?.slice(0, 5) || null;
    const hrFim    = (hrIni && totalDur) ? _minToHm(_hmToMin(hrIni) + totalDur) : null;

    const respSugs = [
      ..._pessoas.map(p => p.nome),
      "Pianistas","Organistas","Equipe de Louvor","Projeção / Áudio","Coral",
      "Congregação","Junta Diaconal","Equipe Técnica","Secretaria",
    ];

    el.innerHTML = `
<style>
.pc-tbl{width:100%;border-collapse:collapse;font-size:12.5px}
.pc-tbl th{padding:5px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx4);text-align:left;border-bottom:1.5px solid var(--bd2);white-space:nowrap;background:var(--bg-surface)}
.pc-td{padding:8px 8px;color:var(--tx1);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}
.pc-td:hover{background:rgba(74,156,245,.07)}
.pc-row:hover{background:var(--bg-surface)}
.pc-tbl tr{border-bottom:1px solid var(--bd1)}
.pc-drag{color:var(--bd2);cursor:grab;padding:8px 5px;font-size:11px;text-align:center;user-select:none}
.pc-row:hover .pc-drag{color:var(--tx3)}
.pc-row-over td{background:rgba(74,156,245,.1)!important;box-shadow:inset 0 2px 0 var(--sky)}
.pc-exp-btn{color:var(--tx4);cursor:pointer;padding:8px 5px;text-align:center;font-size:12px;user-select:none;transition:color .15s}
.pc-exp-btn:hover{color:var(--sky)}
.pc-exp-row td{padding:12px 14px 14px;background:var(--bg-surface);border-bottom:2px solid var(--bd2)}
.pc-acts button{background:none;border:none;cursor:pointer;padding:5px 7px;color:var(--tx3);font-size:14px;border-radius:4px;line-height:1;display:block}
.pc-acts button:hover{color:var(--tx1);background:var(--bd1)}
.pc-add-btn{display:flex;align-items:center;gap:6px;padding:9px 12px;font-size:11.5px;color:var(--tx3);cursor:pointer;border:1.5px dashed var(--bd2);border-top:none;border-radius:0 0 8px 8px;transition:all .15s;user-select:none}
.pc-add-btn:hover{color:var(--teal);border-color:var(--teal);background:rgba(42,181,192,.04)}
.pc-cel-inp{border:none;background:transparent;color:var(--tx1);font-size:12.5px;font-family:inherit;outline:none;width:100%;padding:0}
.pc-bloco-hdr{display:flex;align-items:center;gap:8px;padding:9px 14px;background:var(--bg-card);border:1px solid var(--bd1);cursor:pointer;user-select:none;transition:background .15s}
.pc-bloco-hdr:hover{background:var(--bg-surface)}
@media(max-width:600px){
  .pc-tbl thead{display:none}
  .pc-tbl,.pc-tbl tbody,.pc-tbl tr{display:block;width:100%}
  .pc-tbl td{display:block;border:none;padding:2px 10px}
  .pc-row{border:1px solid var(--bd1)!important;border-radius:8px;margin-bottom:6px;overflow:hidden}
  .pc-drag,.pc-col-tipo,.pc-exp-btn{display:none}
  .pc-td-hr{font-size:13px;font-weight:700;color:var(--sky);padding-top:10px}
  .pc-td-ttl{font-size:13px;font-weight:600}
  .pc-acts{padding-bottom:8px}
  .pc-acts button{display:inline-block}
}
</style>
<datalist id="pc-resp-dl">${respSugs.map(s => `<option value="${_esc(s)}">`).join('')}</datalist>

<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:14px">
  <div style="font-size:12px;color:var(--tx3)">
    ${_itens.length} itens${totalDur ? ` · ${totalDur} min` : ''}${hrIni && hrFim ? ` · ${hrIni}–${hrFim}` : ''}
  </div>
  <button onclick="pcCopiarLiturgiaAnterior()" style="background:none;border:1px solid var(--bd2);border-radius:6px;padding:5px 12px;font-size:11px;color:var(--tx3);cursor:pointer">Copiar liturgia anterior</button>
</div>

${_blocos.map(b => _renderBlocoSection(b, byBloco[b.id] || [])).join('')}`;

    if (page) page.scrollTop = scrollY;
  }

  function _renderBlocoSection(b, itens) {
    const totalDur = itens.reduce((s, it) => s + (it.duracao_prevista || 0), 0);
    const hrIni    = itens[0]?.horario_previsto?.slice(0, 5) || null;
    const hrFim    = (hrIni && totalDur) ? _minToHm(_hmToMin(hrIni) + totalDur) : null;
    const collapsed = !!_collapsedBlocos[b.id];
    const newRow    = _newRowState[b.id];
    const modelos   = _MODELOS_BLOCO[b.nome] || [];

    return `
<div id="pc-bloco-${b.id}" style="margin-bottom:14px">
  <div class="pc-bloco-hdr" style="border-radius:${collapsed ? '8px' : '8px 8px 0 0'}" onclick="pcToggleBloco('${b.id}')">
    <div style="width:3px;height:16px;background:${b.cor || 'var(--sky)'};border-radius:2px;flex-shrink:0"></div>
    <span style="font-size:11px;font-weight:700;color:var(--tx1);text-transform:uppercase;letter-spacing:.06em;flex:1">${_esc(b.nome)}</span>
    <span style="font-size:11px;color:var(--tx3)">
      ${itens.length} ${itens.length === 1 ? 'item' : 'itens'}${totalDur ? ` · ${totalDur} min` : ''}${hrIni && hrFim ? ` · ${hrIni}–${hrFim}` : ''}
    </span>
    <span style="font-size:13px;color:var(--tx3);margin-left:6px;transition:transform .2s;display:inline-block;transform:${collapsed ? 'rotate(-90deg)' : ''}">${collapsed ? '›' : '⌄'}</span>
  </div>

  ${collapsed ? '' : `
  <div style="border:1px solid var(--bd1);border-top:none;border-radius:0 0 8px 8px;overflow:hidden">
    <div style="overflow-x:auto">
      <table class="pc-tbl" ondragover="event.preventDefault()" ondrop="pcDropOnTable(event,'${b.id}')">
        <thead>
          <tr>
            <th style="width:20px"></th>
            <th style="width:58px">Horário</th>
            <th style="width:52px">Dur.</th>
            <th class="pc-col-tipo" style="width:126px">Tipo</th>
            <th>Título / Tarefa</th>
            <th style="width:130px">Responsável</th>
            <th style="width:20px"></th>
            <th style="width:36px"></th>
          </tr>
        </thead>
        <tbody id="pc-tbody-${b.id}">
          ${itens.length ? itens.map(it => _planilhaRow(it)).join('') : (!newRow?.show ? `
          <tr><td colspan="8">
            <div style="padding:28px;text-align:center">
              <div style="font-size:12px;color:var(--tx3);margin-bottom:12px">Este bloco ainda não possui itens.</div>
              <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
                <button onclick="event.stopPropagation();pcAddRow('${b.id}')"
                  style="padding:6px 14px;border-radius:6px;border:1.5px dashed var(--bd2);background:none;color:var(--tx2);font-size:12px;cursor:pointer">
                  + Adicionar primeiro item
                </button>
                ${modelos.length ? `<button onclick="event.stopPropagation();pcApplyModelo('${b.id}',0)"
                  style="padding:6px 14px;border-radius:6px;border:1px solid var(--bd2);background:none;color:var(--tx2);font-size:12px;cursor:pointer">
                  Aplicar modelo
                </button>` : ''}
              </div>
            </div>
          </td></tr>` : '')}
        </tbody>
      </table>
    </div>

    <div id="pc-newrow-${b.id}">
      ${newRow?.show ? _renderNewRow(b.id, b.nome, newRow) : ''}
    </div>

    ${newRow?.show ? '' : itens.length ? `
    <div class="pc-add-btn" onclick="pcAddRow('${b.id}')">
      <span style="font-size:15px;font-weight:700;line-height:1">+</span>
      <span>Adicionar linha em ${_esc(b.nome)}</span>
    </div>` : ''}
  </div>
  `}
</div>`;
  }

  function _planilhaRow(it) {
    const hr    = it.horario_previsto ? it.horario_previsto.slice(0, 5) : '';
    const dur   = it.duracao_prevista || '';
    const tipo  = _tipoPl(it.tipo);
    const exp   = !!_expandedRows[it.id];
    const hasDet = it.texto_biblico || it.observacoes_tecnicas || it.descricao;

    return `
<tr id="pc-row-${it.id}" class="pc-row"
    draggable="true"
    ondragstart="pcDragStart(event,'${it.id}')"
    ondragover="event.preventDefault();pcDragOver(event,'${it.id}')"
    ondragleave="pcDragLeave(event,'${it.id}')"
    ondrop="event.preventDefault();event.stopPropagation();pcDropOnRow(event,'${it.id}','${it.bloco_id}')">
  <td class="pc-drag" title="Mover">⋮⋮</td>
  <td id="pc-cell-${it.id}-horario_previsto" class="pc-td pc-td-hr"
    onclick="event.stopPropagation();pcEditCell('${it.id}','horario_previsto')"
    style="font-size:11.5px;font-weight:700;color:var(--sky);min-width:54px">${_esc(hr)}</td>
  <td id="pc-cell-${it.id}-duracao_prevista" class="pc-td"
    onclick="event.stopPropagation();pcEditCell('${it.id}','duracao_prevista')"
    style="color:var(--tx2);min-width:46px">${dur ? dur + ' min' : ''}</td>
  <td id="pc-cell-${it.id}-tipo" class="pc-td pc-col-tipo"
    onclick="event.stopPropagation();pcEditCell('${it.id}','tipo')"
    style="min-width:100px">
    <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${tipo.cor}20;color:${tipo.cor};font-weight:700;white-space:nowrap">${_esc(tipo.lbl)}</span>
  </td>
  <td id="pc-cell-${it.id}-titulo" class="pc-td pc-td-ttl"
    onclick="event.stopPropagation();pcEditCell('${it.id}','titulo')"
    style="font-weight:600">${_esc(it.titulo)}</td>
  <td id="pc-cell-${it.id}-responsavel_nome" class="pc-td"
    onclick="event.stopPropagation();pcEditCell('${it.id}','responsavel_nome')"
    style="color:var(--tx2)">${_esc(it.responsavel_nome || '')}</td>
  <td class="pc-exp-btn" title="${exp ? 'Recolher detalhes' : 'Expandir detalhes'}"
    onclick="event.stopPropagation();pcToggleRow('${it.id}')">
    <span style="display:inline-block;transition:transform .2s;transform:${exp ? 'rotate(90deg)' : ''}">›</span>${hasDet ? `<span style="display:inline-block;width:5px;height:5px;background:var(--sky);border-radius:50%;vertical-align:middle;margin-left:2px"></span>` : ''}
  </td>
  <td class="pc-acts">
    <button onclick="event.stopPropagation();pcRowMenu(event,'${it.id}','${it.bloco_id}')" title="Ações">⋯</button>
  </td>
</tr>
${exp ? _expandedRow(it) : ''}`;
  }

  function _expandedRow(it) {
    const si = "width:100%;padding:6px 8px;border-radius:5px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px;box-sizing:border-box;outline:none;font-family:inherit";
    const lb = "display:block;font-size:9px;font-weight:700;color:var(--tx4);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px";
    return `
<tr id="pc-exp-${it.id}" class="pc-exp-row">
  <td colspan="8">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px">
      <div>
        <label style="${lb}">Texto Bíblico</label>
        <input style="${si}" value="${_esc(it.texto_biblico||'')}" placeholder="Ex: João 3.16"
          onblur="pcSaveExpanded('${it.id}','texto_biblico',this.value)"
          onkeydown="if(event.key==='Enter')this.blur()">
      </div>
      <div>
        <label style="${lb}">Obs. Técnicas (áudio, projeção, iluminação)</label>
        <input style="${si}" value="${_esc(it.observacoes_tecnicas||'')}" placeholder="Instruções para equipe técnica"
          onblur="pcSaveExpanded('${it.id}','observacoes_tecnicas',this.value)"
          onkeydown="if(event.key==='Enter')this.blur()">
      </div>
      <div>
        <label style="${lb}">Música / Descrição</label>
        <input style="${si}" value="${_esc(it.descricao||'')}" placeholder="Nome da música, ordem..."
          onblur="pcSaveExpanded('${it.id}','descricao',this.value)"
          onkeydown="if(event.key==='Enter')this.blur()">
      </div>
    </div>
  </td>
</tr>`;
  }

  function _renderNewRow(blocoId, blocoNome, state) {
    const modelos  = _MODELOS_BLOCO[blocoNome] || [];
    const si = "padding:7px 9px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px;outline:none;font-family:inherit;box-sizing:border-box";
    const tipoSel = state.tipo || 'outro';
    return `
<div style="border:1px solid var(--bd2);border-top:none;background:var(--bg-surface);padding:12px 14px;border-radius:0 0 8px 8px">
  ${modelos.length ? `
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--bd1);align-items:center">
    <span style="font-size:10px;color:var(--tx3);flex-shrink:0">Modelo:</span>
    ${modelos.map((m, i) => `
      <button onclick="event.stopPropagation();pcApplyModelo('${blocoId}',${i})"
        style="font-size:10px;padding:3px 10px;border-radius:10px;border:1px solid ${tipoSel===m.tipo?'var(--sky)':'var(--bd2)'};background:${tipoSel===m.tipo?'var(--sky)':'none'};color:${tipoSel===m.tipo?'#fff':'var(--tx2)'};cursor:pointer;white-space:nowrap;transition:all .15s">
        ${_esc(m.titulo)}
      </button>`).join('')}
  </div>` : ''}
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
    <input id="pcnr-hr-${blocoId}" type="time" style="${si};width:100px" value="${_esc(state.hr || '')}" placeholder="Horário">
    <input id="pcnr-dur-${blocoId}" type="number" min="0" max="180" style="${si};width:64px" value="${_esc(String(state.dur || ''))}" placeholder="min">
    <select id="pcnr-tipo-${blocoId}" style="${si};width:136px">
      ${_TIPOS_PL.map(t => `<option value="${t.k}" ${tipoSel===t.k?'selected':''}>${_esc(t.l)}</option>`).join('')}
    </select>
    <input id="pcnr-titulo-${blocoId}" style="${si};flex:1;min-width:120px" value="${_esc(state.titulo || '')}" placeholder="Título / Tarefa"
      onkeydown="if(event.key==='Enter')pcSaveNewRow('${blocoId}');else if(event.key==='Escape')pcCancelNewRow('${blocoId}')">
    <input id="pcnr-resp-${blocoId}" list="pc-resp-dl" style="${si};width:130px" value="${_esc(state.resp || '')}" placeholder="Responsável"
      onkeydown="if(event.key==='Enter')pcSaveNewRow('${blocoId}')">
    <button onclick="pcSaveNewRow('${blocoId}')"
      style="padding:7px 16px;border-radius:6px;border:none;background:var(--sky);color:#fff;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">Salvar</button>
    <button onclick="pcCancelNewRow('${blocoId}')"
      style="padding:7px 12px;border-radius:6px;border:1px solid var(--bd2);background:none;color:var(--tx2);font-size:12px;cursor:pointer">Cancelar</button>
  </div>
  <div id="pcnr-msg-${blocoId}" style="font-size:11px;margin-top:6px"></div>
</div>`;
  }

  /* ── Handlers da planilha ────────────────────────────────── */

  window.pcToggleBloco = function(blocoId) {
    _collapsedBlocos[blocoId] = !_collapsedBlocos[blocoId];
    _renderLiturgiaTab();
  };

  window.pcToggleRow = function(itemId) {
    _expandedRows[itemId] = !_expandedRows[itemId];
    _renderLiturgiaTab();
  };

  window.pcEditCell = function(itemId, field) {
    const cell = document.getElementById(`pc-cell-${itemId}-${field}`);
    if (!cell || cell.dataset.editing === '1') return;
    cell.dataset.editing = '1';
    const it  = _itens.find(i => i.id === itemId);
    const val = it ? (it[field] ?? '') : '';

    let inner;
    if (field === 'tipo') {
      inner = `<select class="pc-cel-inp" style="width:112px"
        onblur="pcSaveCell('${itemId}','${field}',this)"
        onchange="pcSaveCell('${itemId}','${field}',this)">
        ${_TIPOS_PL.map(t => `<option value="${t.k}" ${String(val)===t.k?'selected':''}>${_esc(t.l)}</option>`).join('')}
      </select>`;
    } else if (field === 'duracao_prevista') {
      inner = `<input type="number" min="0" max="180" class="pc-cel-inp" style="width:40px;text-align:center"
        value="${_esc(String(val || ''))}"
        onblur="pcSaveCell('${itemId}','${field}',this)"
        onkeydown="if(event.key==='Enter')this.blur()">`;
    } else if (field === 'horario_previsto') {
      inner = `<input type="time" class="pc-cel-inp" style="width:78px;color:var(--sky);font-weight:700;font-size:11.5px"
        value="${_esc(String(val || '').slice(0, 5))}"
        onblur="pcSaveCell('${itemId}','${field}',this)"
        onkeydown="if(event.key==='Enter')this.blur()">`;
    } else if (field === 'responsavel_nome') {
      inner = `<input list="pc-resp-dl" class="pc-cel-inp" style="width:120px;color:var(--tx2)"
        value="${_esc(String(val || ''))}"
        onblur="pcSaveCell('${itemId}','${field}',this)"
        onkeydown="if(event.key==='Enter')this.blur();else if(event.key==='Escape')pcCancelCell()">`;
    } else {
      inner = `<input class="pc-cel-inp" style="width:100%;font-weight:600"
        value="${_esc(String(val || ''))}"
        onblur="pcSaveCell('${itemId}','${field}',this)"
        onkeydown="if(event.key==='Enter')this.blur();else if(event.key==='Escape')pcCancelCell()">`;
    }
    cell.innerHTML = `<div style="padding:2px 4px">${inner}</div>`;
    const inp = cell.querySelector('input,select');
    if (inp) { inp.focus(); try { inp.select?.(); } catch(_) {} }
  };

  window.pcSaveCell = async function(itemId, field, inputEl) {
    let val = inputEl.value;
    if (field === 'duracao_prevista')  val = parseInt(val) || null;
    else if (field === 'horario_previsto') val = val ? val + ':00' : null;
    else val = val.trim() || null;

    const it = _itens.find(i => i.id === itemId);
    if (it) it[field] = val;

    let changed = [];
    if (field === 'duracao_prevista' || field === 'horario_previsto') changed = _recalcTimes();

    _renderLiturgiaTab();

    try {
      await _sb().from('culto_liturgia_itens').update({ [field]: val, updated_at: new Date().toISOString() }).eq('id', itemId);
      if (changed.length) await _persistarHorarios(changed);
    } catch(e) { console.error('pcSaveCell:', e); }
  };

  window.pcCancelCell = function() { _renderLiturgiaTab(); };

  window.pcSaveExpanded = async function(itemId, field, value) {
    const v  = value.trim() || null;
    const it = _itens.find(i => i.id === itemId);
    if (it) it[field] = v;
    try { await _sb().from('culto_liturgia_itens').update({ [field]: v }).eq('id', itemId); }
    catch(e) { console.error('pcSaveExpanded:', e); }
  };

  window.pcAddRow = function(blocoId) {
    const cultoHr = _culto?.data_inicio ? _fmtHr(_culto.data_inicio) : '';
    _newRowState[blocoId] = { show: true, tipo: 'outro', titulo: '', dur: '', resp: '', hr: cultoHr };
    _collapsedBlocos[blocoId] = false;
    _renderLiturgiaTab();
    setTimeout(() => document.getElementById(`pcnr-titulo-${blocoId}`)?.focus(), 60);
  };

  window.pcApplyModelo = function(blocoId, idx) {
    const b = _blocos.find(b => b.id === blocoId);
    if (!b) return;
    const m = (_MODELOS_BLOCO[b.nome] || [])[idx];
    if (!m) return;
    const resp = m.resp === '_pregador' ? (_culto?.pregador_nome || '') : m.resp;
    const prev = _newRowState[blocoId] || {};
    _newRowState[blocoId] = { show: true, tipo: m.tipo, titulo: m.titulo, dur: m.dur, resp, hr: prev.hr || '' };
    _renderLiturgiaTab();
    setTimeout(() => document.getElementById(`pcnr-titulo-${blocoId}`)?.focus(), 60);
  };

  window.pcCancelNewRow = function(blocoId) {
    delete _newRowState[blocoId];
    _renderLiturgiaTab();
  };

  window.pcSaveNewRow = async function(blocoId) {
    const titulo = document.getElementById(`pcnr-titulo-${blocoId}`)?.value?.trim();
    const msg    = document.getElementById(`pcnr-msg-${blocoId}`);
    if (!titulo) { if (msg) { msg.textContent = 'Título obrigatório.'; msg.style.color = 'var(--rose)'; } return; }

    const hr    = document.getElementById(`pcnr-hr-${blocoId}`)?.value;
    const dur   = parseInt(document.getElementById(`pcnr-dur-${blocoId}`)?.value) || null;
    const tipo  = document.getElementById(`pcnr-tipo-${blocoId}`)?.value || 'outro';
    const resp  = document.getElementById(`pcnr-resp-${blocoId}`)?.value?.trim() || null;
    const ordem = (_itens.filter(i => i.bloco_id === blocoId).reduce((mx, i) => Math.max(mx, i.ordem ?? 0), -1)) + 1;

    if (msg) { msg.textContent = 'Salvando…'; msg.style.color = 'var(--tx3)'; }
    try {
      const { data, error } = await _sb().from('culto_liturgia_itens').insert({
        culto_id:         _culto.id,
        bloco_id:         blocoId,
        tipo, titulo,
        horario_previsto: hr ? hr + ':00' : null,
        duracao_prevista: dur,
        responsavel_nome: resp,
        ordem,
      }).select('*,culto_item_musicas(*)').single();
      if (error) throw new Error(error.message);
      _itens.push(data);
      delete _newRowState[blocoId];
      const changed = _recalcTimes();
      if (changed.length) await _persistarHorarios(changed);
      _renderLiturgiaTab();
    } catch(e) {
      if (msg) { msg.textContent = 'Erro: ' + e.message; msg.style.color = 'var(--rose)'; }
    }
  };

  window.pcRowMenu = function(event, itemId, blocoId) {
    event.stopPropagation();
    document.getElementById('pc-row-menu')?.remove();
    const menu = document.createElement('div');
    menu.id = 'pc-row-menu';
    menu.style.cssText = 'position:fixed;z-index:9999;background:var(--bg-card);border:1px solid var(--bd2);border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.18);padding:4px;min-width:168px;font-size:12.5px';
    const rect = event.currentTarget.getBoundingClientRect();
    menu.style.top   = rect.bottom + 4 + 'px';
    menu.style.right = window.innerWidth - rect.right + 'px';
    const mi = (ico, lbl, fn, danger) => {
      const el = document.createElement('div');
      el.style.cssText = `padding:8px 12px;cursor:pointer;border-radius:5px;display:flex;align-items:center;gap:8px;color:${danger?'var(--rose)':'var(--tx1)'}`;
      el.innerHTML = `<span style="color:var(--tx3);width:16px;text-align:center">${ico}</span>${lbl}`;
      el.onmouseover = () => el.style.background = 'var(--bg-surface)';
      el.onmouseout  = () => el.style.background = '';
      el.onclick     = () => { menu.remove(); fn(); };
      return el;
    };
    menu.appendChild(mi('↓', 'Inserir abaixo',  () => pcInsertBelow(itemId, blocoId)));
    menu.appendChild(mi('⊕', 'Duplicar linha',   () => pcDuplicateItem(itemId)));
    const sep = document.createElement('div');
    sep.style.cssText = 'height:1px;background:var(--bd1);margin:4px 0';
    menu.appendChild(sep);
    menu.appendChild(mi('✕', 'Remover item', () => pcExcluirItem(itemId), true));
    document.body.appendChild(menu);
    const close = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', close); } };
    setTimeout(() => document.addEventListener('click', close), 10);
  };

  window.pcInsertBelow = async function(itemId, blocoId) {
    const it    = _itens.find(i => i.id === itemId);
    const ordem = (it?.ordem ?? 0) + 1;
    _itens.filter(i => i.bloco_id === blocoId && (i.ordem ?? 0) >= ordem && i.id !== itemId)
          .forEach(i => i.ordem = (i.ordem ?? 0) + 1);
    const { data, error } = await _sb().from('culto_liturgia_itens').insert({
      culto_id: _culto.id, bloco_id: blocoId, tipo: 'outro', titulo: 'Novo item', ordem,
    }).select('*,culto_item_musicas(*)').single();
    if (!error && data) {
      _itens.push(data);
      for (const s of _itens.filter(i => i.bloco_id === blocoId && (i.ordem ?? 0) >= ordem && i.id !== data.id))
        await _sb().from('culto_liturgia_itens').update({ ordem: s.ordem }).eq('id', s.id);
      _renderLiturgiaTab();
      setTimeout(() => pcEditCell(data.id, 'titulo'), 80);
    }
  };

  window.pcDuplicateItem = async function(itemId) {
    const it = _itens.find(i => i.id === itemId);
    if (!it) return;
    const ordem = (it.ordem ?? 0) + 1;
    _itens.filter(i => i.bloco_id === it.bloco_id && (i.ordem ?? 0) >= ordem && i.id !== it.id)
          .forEach(i => i.ordem = (i.ordem ?? 0) + 1);
    const { data, error } = await _sb().from('culto_liturgia_itens').insert({
      culto_id: _culto.id, bloco_id: it.bloco_id, tipo: it.tipo,
      titulo:   it.titulo + ' (cópia)', duracao_prevista: it.duracao_prevista,
      responsavel_nome: it.responsavel_nome, texto_biblico: it.texto_biblico,
      observacoes_tecnicas: it.observacoes_tecnicas, ordem,
    }).select('*,culto_item_musicas(*)').single();
    if (!error && data) { _itens.push(data); _renderLiturgiaTab(); }
  };

  window.pcExcluirItem = async function(itemId) {
    if (!confirm('Remover este item da liturgia?')) return;
    await _sb().from('culto_liturgia_itens').delete().eq('id', itemId);
    _itens = _itens.filter(i => i.id !== itemId);
    delete _expandedRows[itemId];
    _renderLiturgiaTab();
  };

  /* ── Drag & Drop ─────────────────────────────────────────── */
  window.pcDragStart = function(e, itemId) {
    _dragSrcId = itemId;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { const r = document.getElementById(`pc-row-${itemId}`); if (r) r.style.opacity = '.35'; }, 0);
  };
  window.pcDragOver = function(e, targetId) {
    if (_dragSrcId === targetId) return;
    document.querySelectorAll('.pc-row-over').forEach(el => el.classList.remove('pc-row-over'));
    document.getElementById(`pc-row-${targetId}`)?.classList.add('pc-row-over');
  };
  window.pcDragLeave = function(e, targetId) {
    document.getElementById(`pc-row-${targetId}`)?.classList.remove('pc-row-over');
  };
  window.pcDropOnRow = async function(e, targetId, targetBlocoId) {
    document.querySelectorAll('.pc-row-over').forEach(el => el.classList.remove('pc-row-over'));
    if (!_dragSrcId || _dragSrcId === targetId) { _dragSrcId = null; return; }
    const src = _itens.find(i => i.id === _dragSrcId);
    const tgt = _itens.find(i => i.id === targetId);
    _dragSrcId = null;
    if (!src || !tgt) return;
    src.bloco_id = targetBlocoId;
    src.ordem    = tgt.ordem;
    _itens.filter(i => i.id !== src.id && i.bloco_id === targetBlocoId && (i.ordem ?? 0) >= (tgt.ordem ?? 0))
          .forEach(i => i.ordem = (i.ordem ?? 0) + 1);
    _renderLiturgiaTab();
    await _sb().from('culto_liturgia_itens').update({ bloco_id: src.bloco_id, ordem: src.ordem }).eq('id', src.id);
    await _loadItens(_culto.id);
    _renderLiturgiaTab();
  };
  window.pcDropOnTable = async function(e, blocoId) {
    document.querySelectorAll('.pc-row-over').forEach(el => el.classList.remove('pc-row-over'));
    if (!_dragSrcId) return;
    const src = _itens.find(i => i.id === _dragSrcId);
    _dragSrcId = null;
    if (!src || src.bloco_id === blocoId) return;
    const maxOrdem = _itens.filter(i => i.bloco_id === blocoId).reduce((mx, i) => Math.max(mx, i.ordem ?? 0), -1) + 1;
    src.bloco_id = blocoId;
    src.ordem    = maxOrdem;
    _renderLiturgiaTab();
    await _sb().from('culto_liturgia_itens').update({ bloco_id: blocoId, ordem: maxOrdem }).eq('id', src.id);
  };

  /* ── Copiar liturgia anterior ────────────────────────────── */
  window.pcCopiarLiturgiaAnterior = async function() {
    if (!confirm('Copiar estrutura da liturgia do culto anterior?\n\nCopia: tipos, títulos, durações e obs. técnicas.\nNão copia: pessoas, músicas específicas, textos bíblicos e status.')) return;
    const { data: ant } = await _sb().from('cultos')
      .select('id').eq('tipo_culto_id', _culto.tipo_culto_id)
      .lt('data_inicio', _culto.data_inicio).is('deleted_at', null)
      .order('data_inicio', { ascending: false }).limit(1).maybeSingle();
    if (!ant) { alert('Nenhum culto anterior do mesmo tipo encontrado.'); return; }
    const [{ data: bls }, { data: its }] = await Promise.all([
      _sb().from('culto_liturgia_blocos').select('*').eq('culto_id', ant.id).order('ordem'),
      _sb().from('culto_liturgia_itens').select('*').eq('culto_id', ant.id).order('ordem'),
    ]);
    if (!bls?.length) { alert('O culto anterior não tem liturgia para copiar.'); return; }
    for (const b of _blocos) await _sb().from('culto_liturgia_blocos').delete().eq('id', b.id);
    const novosBlocos = await _criarBlocosPadrao(_culto.id);
    const mapaBloco   = Object.fromEntries(bls.map((b, i) => [b.id, novosBlocos[i]?.id || null]));
    const novosItens  = (its || []).map(it => ({
      culto_id: _culto.id, bloco_id: it.bloco_id ? (mapaBloco[it.bloco_id] || null) : null,
      ordem: it.ordem, tipo: it.tipo, titulo: it.titulo,
      duracao_prevista: it.duracao_prevista, observacoes_tecnicas: it.observacoes_tecnicas,
    }));
    if (novosItens.length) await _sb().from('culto_liturgia_itens').insert(novosItens);
    await Promise.all([_loadBlocos(_culto.id), _loadItens(_culto.id)]);
    _renderLiturgiaTab();
    if (typeof T === 'function') T('Liturgia copiada!', 'Ajuste horários e responsáveis.');
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
