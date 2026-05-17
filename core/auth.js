/* ══════════════════════════════════════════════════════
   GESTÃO DE ACESSOS — v6.30.36
   Perfis, permissões, login e controle por módulo
══════════════════════════════════════════════════════ */

/* 7 perfis conforme documento institucional (padronização com complemento funcional) */
const PERFIS = {
  admin_geral:          { nome:"Administrador Geral",                   icon:"👑", cor:"var(--gold)",   nivel:7 },
  conselho:             { nome:"Membro do Conselho (Supervisor)",        icon:"🏛", cor:"var(--blue)",   nivel:6 },
  pastoral:             { nome:"Pastoral",                               icon:"✝️", cor:"var(--teal)",   nivel:5 },
  adm_operacional:      { nome:"Adm. Operacional",                       icon:"💼", cor:"var(--amber)",  nivel:4 },
  lider_ministerio:     { nome:"Líder de Ministério (Coordenador)",      icon:"🎯", cor:"var(--violet)", nivel:3 },
  lider_area:           { nome:"Líder de Área (Líder Setorial)",         icon:"📍", cor:"var(--amber)",  nivel:3 },
  membro_ministerio:    { nome:"Membro de Ministério (Sacerdote)",       icon:"🙌", cor:"var(--gr)",     nivel:2 },
  operacional_servicos: { nome:"Operacional Serviços (Contratados)",     icon:"🔧", cor:"var(--tx2)",    nivel:1 },
  membro_igreja:        { nome:"Membro da Igreja",                       icon:"⛪", cor:"var(--sky)",    nivel:0 },
};

/* Matriz de permissões por módulo e perfil
   Valores: "full" | "read" | "restricted" | false
*/
const PERMISSOES_MATRIZ = {
  "Administrativo":    { admin_geral:"full", conselho:"read",       pastoral:"read",       adm_operacional:"full",       lider_ministerio:false,       membro_ministerio:false,       operacional_servicos:false,        membro_igreja:false },
  "Financeiro":        { admin_geral:"full", conselho:"read",       pastoral:false,        adm_operacional:"full",       lider_ministerio:false,       membro_ministerio:false,       operacional_servicos:false,        membro_igreja:false },
  "Jurídico":          { admin_geral:"full", conselho:"read",       pastoral:false,        adm_operacional:"restricted", lider_ministerio:false,       membro_ministerio:false,       operacional_servicos:false,        membro_igreja:false },
  "Pastoral":          { admin_geral:"full", conselho:"read",       pastoral:"full",       adm_operacional:false,        lider_ministerio:false,       membro_ministerio:false,       operacional_servicos:false,        membro_igreja:false },
  "Conselho/Gov.":     { admin_geral:"full", conselho:"full",       pastoral:"read",       adm_operacional:false,        lider_ministerio:false,       membro_ministerio:false,       operacional_servicos:false,        membro_igreja:false },
  "Departamentos":     { admin_geral:"full", conselho:"read",       pastoral:"read",       adm_operacional:"read",       lider_ministerio:"full",      membro_ministerio:"restricted", operacional_servicos:false,        membro_igreja:false },
  "Agenda":            { admin_geral:"full", conselho:"read",       pastoral:"full",       adm_operacional:"full",       lider_ministerio:"full",      membro_ministerio:"restricted", operacional_servicos:false,        membro_igreja:false },
  "Pequenos Grupos":   { admin_geral:"full", conselho:"read",       pastoral:"full",       adm_operacional:"read",       lider_ministerio:"full",      membro_ministerio:"restricted", operacional_servicos:false,        membro_igreja:false },
  "Infraestrutura e Conservação":    { admin_geral:"full", conselho:"read",       pastoral:false,        adm_operacional:"full",       lider_ministerio:false,       membro_ministerio:false,       operacional_servicos:"restricted", membro_igreja:false },
  "Demandas":          { admin_geral:"full", conselho:"read",       pastoral:"read",       adm_operacional:"full",       lider_ministerio:"restricted", membro_ministerio:"restricted", operacional_servicos:"restricted", membro_igreja:false },
  "Relatórios":        { admin_geral:"full", conselho:"full",       pastoral:"restricted", adm_operacional:"restricted", lider_ministerio:"restricted", membro_ministerio:false,       operacional_servicos:false,        membro_igreja:false },
  "Projetos":        { admin_geral:"full", conselho:"read",       pastoral:"read",       adm_operacional:"full",       lider_ministerio:"restricted", membro_ministerio:false,       operacional_servicos:false,        membro_igreja:false },
  "Externos":        { admin_geral:"full", conselho:false,        pastoral:false,        adm_operacional:"full",       lider_ministerio:false,       membro_ministerio:false,       operacional_servicos:false,        membro_igreja:false },
  "Membresia":         { admin_geral:"full", conselho:"read",       pastoral:"full",       adm_operacional:"full",       lider_ministerio:"read",      membro_ministerio:false,       operacional_servicos:false,        membro_igreja:false },
  "Estoque":           { admin_geral:"full", conselho:"read",       pastoral:false,        adm_operacional:"full",       lider_ministerio:false,       membro_ministerio:false,       operacional_servicos:"restricted", membro_igreja:false },
  "Configurações":     { admin_geral:"full", conselho:false,        pastoral:false,        adm_operacional:false,        lider_ministerio:false,       membro_ministerio:false,       operacional_servicos:false,        membro_igreja:false },
  "Área do Membro":   { admin_geral:"full", conselho:"restricted", pastoral:"restricted", adm_operacional:"restricted", lider_ministerio:"restricted", membro_ministerio:"restricted", operacional_servicos:"restricted", membro_igreja:"restricted" },
  "Junta Diaconal":   { admin_geral:"full", conselho:"read",       pastoral:"read",       adm_operacional:"read",       lider_ministerio:false,       membro_ministerio:false,       operacional_servicos:false,        membro_igreja:false },
  "Congregações":     { admin_geral:"full", conselho:"read",       pastoral:"read",       adm_operacional:"read",       lider_ministerio:false,       membro_ministerio:false,       operacional_servicos:false,        membro_igreja:false },
};

/* Cache de permissões carregadas do banco (perfil_key → módulo_display → nível) */
let PERMISSOES_DB = {};

/* Mapa de permissões do usuário atual: { "ADMINISTRATIVO": "LEITURA", ... } */
let permissoesUsuario = {};

/* Carrega permissões só do perfil atual (chamada eficiente por usuário) */
async function carregarPermissoesUsuario(perfilId) {
  if (!perfilId || !SUPABASE_URL) return {};
  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/perfis_permissoes?perfil_id=eq.${encodeURIComponent(perfilId)}&select=modulo,nivel_acesso`,
      { headers: apiHeaders() }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const mapa = {};
    data.forEach(p => { mapa[p.modulo] = p.nivel_acesso; });
    return mapa;
  } catch(e) {
    console.warn("carregarPermissoesUsuario:", e.message);
    return {};
  }
}

/* Aplica permissões via data-modulo (sidebar e dashboard) */
function aplicarPermissoesSidebar() {
  document.querySelectorAll("[data-modulo]").forEach(el => {
    const modulo = el.dataset.modulo;
    const nivel = permissoesUsuario[modulo] || "SEM_ACESSO";
    el.style.display = nivel === "SEM_ACESSO" ? "none" : "";
  });
}

/* UUID dos perfis vindos do banco (perfil_key → uuid) */
let _perfisUuidMap = {};

/* Mapeamento chave JS ↔ nome no banco */
const PERFIL_KEY_TO_DB_NOME = {
  admin_geral:          "ADMINISTRADOR_GERAL",
  conselho:             "CONSELHO",
  pastoral:             "PASTORAL",
  adm_operacional:      "ADM_OPERACIONAL",
  lider_ministerio:     "LIDER_MINISTERIO",
  lider_area:           "LIDER_AREA",
  membro_ministerio:    "MEMBRO_MINISTERIO",
  operacional_servicos: "OPERACIONAL_SERVICOS",
  membro_igreja:        "MEMBRO_IGREJA",
};

/* Mapeamento nome visual (UI) ↔ nome exato no banco — usado no fallback de UUID */
const PERFIS_MAP = {
  "Administrador Geral":                  "ADMINISTRADOR_GERAL",
  "Administrativo Geral":                 "ADMINISTRADOR_GERAL",
  "Membro do Conselho (Supervisor)":      "CONSELHO",
  "Conselho":                             "CONSELHO",
  "Pastoral":                             "PASTORAL",
  "Adm. Operacional":                     "ADM_OPERACIONAL",
  "Líder de Ministério (Coordenador)":    "LIDER_MINISTERIO",
  "Líder de Ministério":                  "LIDER_MINISTERIO",
  "Líder de Área (Líder Setorial)":       "LIDER_AREA",
  "Membro de Ministério (Sacerdote)":     "MEMBRO_MINISTERIO",
  "Membro de Ministério":                 "MEMBRO_MINISTERIO",
  "Operacional Serviços (Contratados)":   "OPERACIONAL_SERVICOS",
  "Operacional Serviços":                 "OPERACIONAL_SERVICOS",
  "Membro da Igreja":                     "MEMBRO_IGREJA",
  "Membro Igreja":                        "MEMBRO_IGREJA",
};

/* Mapeamento módulo display ↔ módulo DB */
const MODULO_DISPLAY_TO_DB = {
  "Administrativo":  "ADMINISTRATIVO",
  "Financeiro":      "FINANCEIRO",
  "Jurídico":        "JURIDICO",
  "Pastoral":        "PASTORAL",
  "Conselho/Gov.":   "CONSELHO",
  "Departamentos":   "MINISTERIAL",
  "Agenda":          "AGENDA",
  "Pequenos Grupos": "PGS",
  "Infraestrutura e Conservação":  "INFRAESTRUTURA",
  "Demandas":        "DEMANDAS",
  "Relatórios":      "RELATORIOS",
  "Projetos":        "PROJETOS",
  "Membresia":       "MEMBRESIA",
  "Estoque":         "ESTOQUE",
  "Configurações":   "CONFIGURACOES",
  "Área do Membro":  "AREA_MEMBRO",
  "Junta Diaconal":  "JUNTA_DIACONAL",
  "Congregações":    "CONGREGACOES",
};
const MODULO_DB_TO_DISPLAY = Object.fromEntries(
  Object.entries(MODULO_DISPLAY_TO_DB).map(([k,v]) => [v, k])
);

/* Mapeamento módulo (display) → ID de sidebar */
const MODULO_SIDEBAR_MAP = {
  "Administrativo":  "admin",
  "Financeiro":      "fin",
  "Jurídico":        "jur",
  "Pastoral":        "pastoral",
  "Conselho/Gov.":   "conselho",
  "Departamentos":   "min",
  "Agenda":          "agenda",
  "Pequenos Grupos": "pgs",
  "Infraestrutura e Conservação":  "infra",
  "Demandas":        "dem",
  "Relatórios":      "rel",
  "Projetos":        "proj",
  "Membresia":       "memb",
  "Estoque":         "est",
  "Configurações":   "config",
  "Área do Membro":  "area",
  "Junta Diaconal":  "diac",
  "Congregações":    "cong",
};

/* Usuário logado atual */
let USUARIO_ATUAL  = null;  // mantido para compatibilidade com módulos externos
let usuarioLogado  = null;  // referência canônica das novas funções de auth

/* ── NORMALIZAÇÃO DE PERFIL ─────────────────── */
function normalizarPerfil(funcao) {
  const mapa = {
    admin_geral:"ADMINISTRADOR_GERAL", administrador_geral:"ADMINISTRADOR_GERAL", ADMINISTRADOR_GERAL:"ADMINISTRADOR_GERAL",
    "ADMINISTRADOR GERAL":"ADMINISTRADOR_GERAL", administrador:"ADMINISTRADOR_GERAL",
    pastoral:"PASTORAL", PASTORAL:"PASTORAL",
    conselho:"CONSELHO", CONSELHO:"CONSELHO",
    adm_operacional:"ADM_OPERACIONAL", ADM_OPERACIONAL:"ADM_OPERACIONAL",
    lider_ministerio:"LIDER_MINISTERIO", LIDER_MINISTERIO:"LIDER_MINISTERIO",
    lider_area:"LIDER_AREA", LIDER_AREA:"LIDER_AREA",
    membro_ministerio:"MEMBRO_MINISTERIO", MEMBRO_MINISTERIO:"MEMBRO_MINISTERIO",
    operacional_servicos:"OPERACIONAL_SERVICOS", OPERACIONAL_SERVICOS:"OPERACIONAL_SERVICOS",
    membro_igreja:"MEMBRO_IGREJA", MEMBRO_IGREJA:"MEMBRO_IGREJA",
  };
  // Tenta mapa direto → PERFIS_MAP (nomes em linguagem natural do banco) → fallback uppercase
  return mapa[funcao] || PERFIS_MAP[funcao] || String(funcao || "").toUpperCase();
}

/* ── LOGIN via Supabase Auth ─────────────────── */
async function doLogin() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl    = document.getElementById("login-err");
  const btn      = document.querySelector(".login-btn");

  if (errEl) errEl.textContent = "";
  if (!email || !password) { if (errEl) errEl.textContent = "Preencha e-mail e senha."; return; }
  if (btn) { btn.textContent = "Entrando..."; btn.disabled = true; }

  try {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error || !data?.user?.id) {
      if (errEl) errEl.textContent = "E-mail ou senha inválidos.";
      console.error("Supabase Auth:", error);
      return;
    }
    await carregarUsuarioLogado(data.user.id);
  } catch(e) {
    if (errEl) errEl.textContent = `Erro: ${e.message}`;
  } finally {
    if (btn) { btn.textContent = "Entrar no SIPEN"; btn.disabled = false; }
  }
}

/* ── CARREGA USUÁRIO DO BANCO APÓS AUTH ──────── */
async function carregarUsuarioLogado(authUserId) {
  const sb = getSupabase();

  // 1ª consulta: busca pessoa pelo auth_user_id
  const { data: pessoa, error: pessoaError } = await sb
    .from("pessoas")
    .select("id, nome, email, auth_user_id, status, igreja_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (pessoaError) {
    console.error("Erro ao buscar pessoa:", pessoaError);
    alert("Erro ao buscar usuário no banco.");
    return;
  }
  if (!pessoa) {
    alert("Usuário autenticado, mas não encontrado em pessoas.auth_user_id.");
    return;
  }

  // 2ª consulta: busca membro ativo vinculado à pessoa
  const { data: membro, error: membroError } = await sb
    .from("membros")
    .select("id, pessoa_id, funcao, status, ministerios")
    .eq("pessoa_id", pessoa.id)
    .eq("status", "ativo")
    .is("deleted_at", null)
    .maybeSingle();

  if (membroError) {
    console.error("Erro ao buscar membro:", membroError);
    alert("Erro ao buscar cadastro de membro.");
    return;
  }
  if (!membro) {
    alert("Usuário sem cadastro de membro ativo vinculado.");
    return;
  }

  usuarioLogado = {
    auth_user_id: authUserId,
    id:           pessoa.id,
    pessoa_id:    pessoa.id,
    membro_id:    membro.id,
    nome:         pessoa.nome,
    email:        pessoa.email,
    perfil:       normalizarPerfil(membro.funcao),
    ministerios:  Array.isArray(membro.ministerios) ? membro.ministerios : [],
    igreja_id:    pessoa.igreja_id || null,
  };
  USUARIO_ATUAL = usuarioLogado;

  await carregarPerfilEPermissoes(usuarioLogado.perfil);
  await entrarNoSistema();
}

/* ── CARREGA PERMISSÕES DO BANCO ─────────────── */
async function carregarPerfilEPermissoes(nomePerfil) {
  const sb = getSupabase();
  const { data: perfil, error: errPerfil } = await sb
    .from("perfis").select("id, nome").eq("nome", nomePerfil).maybeSingle();

  if (errPerfil || !perfil) {
    console.warn("Perfil não encontrado no banco:", nomePerfil);
    permissoesUsuario = {};
    return;
  }
  if (usuarioLogado) { usuarioLogado.perfil_id = perfil.id; USUARIO_ATUAL.perfil_id = perfil.id; }

  const { data: perms, error: errPerms } = await sb
    .from("perfis_permissoes").select("modulo, nivel_acesso").eq("perfil_id", perfil.id);

  permissoesUsuario = {};
  (perms || []).forEach(p => { permissoesUsuario[p.modulo] = p.nivel_acesso; });
}

/* ── PRIMEIRO MÓDULO PERMITIDO ───────────────── */
async function abrirPrimeiroModuloPermitido() {
  if (USUARIO_ATUAL?.perfil === "ADMINISTRADOR_GERAL") { await go("geral"); return; }
  const ordem = [
    ["PASTORAL","pastoral-dash"],["MINISTERIAL","min-dash"],["AGENDA","agenda-dash"],
    ["PGS","pgs-dash"],["DEMANDAS","dem-dash"],["AREA_MEMBRO","area-dash"],
    ["ADMINISTRATIVO","admin-dash"],["FINANCEIRO","fin-dash"],
    ["CONSELHO","conselho-dash"],["INFRAESTRUTURA","infra-dash"],["JURIDICO","jur-dash"],
  ];
  const primeiro = ordem.find(([mod]) => (permissoesUsuario[mod] || "SEM_ACESSO") !== "SEM_ACESSO");
  if (primeiro) await go(primeiro[1]); else await go("geral");
}

/* Restaura a rota salva — hash > sessionStorage (isolado por aba).
   Retorna true se navegou, false se não havia rota válida. */
function _isMobile() {
  try { return window.matchMedia("(max-width: 768px)").matches; } catch(_) { return false; }
}

function _isMembroComum() {
  const p = USUARIO_ATUAL?.perfil;
  return p === "MEMBRO_IGREJA" || p === "MEMBRO_MINISTERIO";
}

/* Retorna true para perfis com acesso a módulos de gestão (nível ≥ lider_area).
   Esses usuários verão a tela de escolha de área ao entrar. */
function _isGestor() {
  const p = USUARIO_ATUAL?.perfil;
  if (!p) return false;
  const GESTORES = ["ADMINISTRADOR_GERAL","ADMIN_GERAL","CONSELHO","PASTORAL",
                    "ADM_OPERACIONAL","LIDER_MINISTERIO","LIDER_AREA"];
  return GESTORES.includes(p.toUpperCase()) || GESTORES.some(g => p.toUpperCase().includes(g));
}

function _lerRotaSalva() {
  try {
    const hash  = (window.location.hash || "").replace(/^#/, "").trim();
    const local = sessionStorage.getItem("sipen_route") || "";
    const rota  = hash || local;
    if (!rota) return null;
    // View existe no DOM, é uma rota modular lazy-loaded ou está registrada no CRUMB.
    if (document.getElementById("v-" + rota)) return rota;
    if (typeof window.isKnownViewRoute === "function" && window.isKnownViewRoute(rota)) return rota;
    if (typeof CRUMB !== "undefined" && CRUMB[rota])  return rota;
    return null;
  } catch(_) { return null; }
}

/* Expande o painel lateral do módulo sem triggar navegação. */
function _expandirSidebar(mod) {
  try {
    const sub  = document.getElementById("ms-" + mod);
    const wrap = document.getElementById("mw-" + mod);
    if (!sub) return;
    document.querySelectorAll(".msub").forEach(s => s.classList.remove("open"));
    document.querySelectorAll(".mhdr").forEach(h => h.classList.remove("open"));
    sub.classList.add("open");
    const hdr = wrap?.querySelector(".mhdr");
    if (hdr) hdr.classList.add("open");
  } catch(_) {}
}

/* ── TELA DE ESCOLHA DE ÁREA ─────────────────── */

function _mostrarTelaEscolha() {
  _removerTelaEscolha(); // garante que não haja duplicata
  const nome = (USUARIO_ATUAL?.nome || "Usuário").split(" ")[0];

  const el = document.createElement("div");
  el.id = "area-escolha";

  const titulo = document.createElement("div");
  titulo.className = "area-escolha-titulo";
  titulo.innerHTML = '<div class="ae-saudacao"></div><div class="ae-sub">Como você quer acessar o SIPEN agora?</div>';
  titulo.querySelector(".ae-saudacao").textContent = "Bem-vindo, " + nome + "!";

  const cards = document.createElement("div");
  cards.className = "area-cards";

  const OPCOES = [
    { cls: "membro",   icon: "⛪", titulo: "Área do Membro",    desc: "Agenda, escalas, ministérios e informações pessoais",          fn: "entrarComoMembro" },
    { cls: "gestor",   icon: "⚙️", titulo: "Área do Gestor",    desc: "Módulos administrativos e de gestão conforme suas permissões", fn: "entrarComoGestor" },
    { cls: "demandas", icon: "📋", titulo: "Central de Demandas", desc: "Acesso rápido à gestão de demandas e solicitações",           fn: "entrarCentralDemandas" },
  ];

  OPCOES.forEach(function(op) {
    const btn = document.createElement("button");
    btn.className = "area-card " + op.cls;
    btn.type = "button";
    btn.innerHTML =
      '<div class="area-card-icon">' + op.icon + '</div>' +
      '<div><div class="area-card-titulo">' + op.titulo + '</div>' +
      '<div class="area-card-desc">' + op.desc + '</div></div>';
    btn.addEventListener("click", function() {
      if (typeof window[op.fn] === "function") window[op.fn]();
    });
    cards.appendChild(btn);
  });

  el.appendChild(titulo);
  el.appendChild(cards);
  document.body.appendChild(el);
}

function _removerTelaEscolha() {
  document.getElementById("area-escolha")?.remove();
}

function _aplicarModoGestor() {
  document.body.classList.remove("modo-membro");
  document.body.classList.add("modo-gestor");
  const lbl = document.getElementById("btn-trocar-area-label");
  if (lbl) lbl.textContent = "Trocar Área";
}

function _aplicarModoMembro() {
  document.body.classList.remove("modo-gestor");
  document.body.classList.add("modo-membro");
  const lbl = document.getElementById("btn-trocar-area-label");
  if (lbl) lbl.textContent = "Trocar Área";
  // Fechar sidebar mobile se aberta
  document.querySelector(".sb")?.classList.remove("sb-open");
  document.getElementById("sb-backdrop")?.classList.remove("sb-open");
}

async function entrarComoMembro() {
  _removerTelaEscolha();
  _aplicarModoMembro();
  _expandirSidebar("area");
  await go("area-dash");
  if (typeof window.demAtualizarLabels === "function") window.demAtualizarLabels();
  if (typeof window.aplicarMenuDemandasPorPerfil === "function") window.aplicarMenuDemandasPorPerfil();
  T(`Bem-vindo, ${USUARIO_ATUAL.nome.split(" ")[0]}! ⛪`,
    "Você está na Área do Membro");
}

async function entrarComoGestor() {
  _removerTelaEscolha();
  _aplicarModoGestor();
  await abrirPrimeiroModuloPermitido();
  if (typeof window.demAtualizarLabels === "function") window.demAtualizarLabels();
  if (typeof window.aplicarMenuDemandasPorPerfil === "function") window.aplicarMenuDemandasPorPerfil();
  T(`Bem-vindo, ${USUARIO_ATUAL.nome.split(" ")[0]}! ⚙`,
    "Você está na Área do Gestor");
}

async function entrarCentralDemandas() {
  _removerTelaEscolha();
  _aplicarModoGestor();
  if (typeof window.demAtualizarLabels === "function") window.demAtualizarLabels();
  if (typeof window.aplicarMenuDemandasPorPerfil === "function") window.aplicarMenuDemandasPorPerfil();
  await go("demandas");
  T(`Bem-vindo, ${USUARIO_ATUAL.nome.split(" ")[0]}! 📋`,
    "Central de Demandas");
}

async function trocarArea() {
  if (_isGestor()) {
    // Gestor: mostra a tela de escolha de área novamente
    _mostrarTelaEscolha();
  } else {
    // Não-gestor: toggle simples membro ↔ gestor
    if (document.body.classList.contains("modo-membro")) {
      _aplicarModoGestor();
      await abrirPrimeiroModuloPermitido();
    } else {
      _aplicarModoMembro();
      _expandirSidebar("area");
      await go("area-dash");
    }
  }
}

/* ── INICIALIZAÇÃO PÓS-LOGIN ─────────────────── */
async function entrarNoSistema() {
  document.getElementById("login-screen").style.display = "none";
  atualizarSidebarUsuario();
  aplicarPermissoes();
  initSupabaseBadge();
  testApiSilently();
  carregarPermissoesDB(); // popula _perfisUuidMap e PERMISSOES_DB em background

  if (typeof window.demAtualizarLabels === "function") window.demAtualizarLabels();
  if (typeof window.aplicarMenuDemandasPorPerfil === "function") window.aplicarMenuDemandasPorPerfil();

  const rotaSalva = _lerRotaSalva();
  if (rotaSalva) {
    // F5 ou rota salva: restaura sem mostrar a tela de escolha
    if (_isGestor()) _aplicarModoGestor();
    const mod = rotaSalva.split("-")[0];
    if (mod !== "geral") _expandirSidebar(mod);
    await go(rotaSalva);
    T(`Bem-vindo, ${USUARIO_ATUAL.nome.split(" ")[0]}! 👋`,
      `Perfil: ${PERFIS[USUARIO_ATUAL.perfil]?.nome || USUARIO_ATUAL.perfil}`);
    return;
  }

  if (_isMembroComum()) {
    // Membro comum: vai direto para Área do Membro
    _expandirSidebar("area");
    await go("area-dash");
    T(`Bem-vindo, ${USUARIO_ATUAL.nome.split(" ")[0]}! 👋`,
      `Perfil: ${PERFIS[USUARIO_ATUAL.perfil]?.nome || USUARIO_ATUAL.perfil}`);
    return;
  }

  if (_isMobile() && !_isGestor()) {
    // Não-gestor em mobile: área do membro
    _expandirSidebar("area");
    await go("area-dash");
    T(`Bem-vindo, ${USUARIO_ATUAL.nome.split(" ")[0]}! 👋`,
      `Perfil: ${PERFIS[USUARIO_ATUAL.perfil]?.nome || USUARIO_ATUAL.perfil}`);
    return;
  }

  if (_isGestor()) {
    // Gestor: mostra tela de escolha de área
    _mostrarTelaEscolha();
    // Toast após a escolha (feito em entrarComoMembro/entrarComoGestor)
    return;
  }

  // Fallback: primeiro módulo permitido
  _aplicarModoGestor();
  await abrirPrimeiroModuloPermitido();
  T(`Bem-vindo, ${USUARIO_ATUAL.nome.split(" ")[0]}! 👋`,
    `Perfil: ${PERFIS[USUARIO_ATUAL.perfil]?.nome || USUARIO_ATUAL.perfil}`);
}

window.entrarComoMembro      = entrarComoMembro;
window.entrarComoGestor      = entrarComoGestor;
window.entrarCentralDemandas = entrarCentralDemandas;
window.trocarArea            = trocarArea;

window.areaToggle = function(id) {
  const card = document.getElementById("area-col-" + id);
  if (!card) return;
  card.classList.toggle("open");
};

/* ── LOGOUT ──────────────────────────────────── */
async function doLogout() {
  if (!confirm("Deseja encerrar a sessão?")) return;
  if (USUARIO_ATUAL) registrarLog("auth","logout","membros",USUARIO_ATUAL.id,{ nome: USUARIO_ATUAL.nome });
  try { await getSupabase()?.auth.signOut(); } catch(e) { console.warn("signOut:", e); }
  usuarioLogado = null;
  USUARIO_ATUAL = null;
  permissoesUsuario = {};
  try { sessionStorage.removeItem("sipen_route"); } catch(_) {}
  try { history.replaceState(null, "", location.pathname + location.search); } catch(_) {}
  document.body.classList.remove("modo-membro", "modo-gestor");
  _removerTelaEscolha();
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("login-password").value = "";
  document.getElementById("login-err").textContent = "";
}

function atualizarSidebarUsuario() {
  if (!USUARIO_ATUAL) return;
  const perfil = PERFIS[USUARIO_ATUAL.perfil] || { nome: USUARIO_ATUAL.perfil, icon:"👤" };
  const initials = USUARIO_ATUAL.nome.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase();
  const av = document.getElementById("sb-avatar");
  const un = document.getElementById("sb-username");
  const ur = document.getElementById("sb-userrole");
  if (av) { av.textContent = initials; av.style.background = "var(--grd)"; }
  if (un) un.textContent = USUARIO_ATUAL.nome;
  if (ur) ur.textContent = `${perfil.icon} ${perfil.nome}`;
}

/* ── PERMISSÕES ────────────────────────────── */

function aplicarPermissoes() {
  if (!USUARIO_ATUAL) return;

  const isAdminTotal = USUARIO_ATUAL.perfil === "ADMINISTRADOR_GERAL";

  // ── Garantias mínimas de acesso por perfil ─────────────────────────
  // Cada perfil tem acesso garantido ao módulo correspondente,
  // independente do que estiver cadastrado na tabela perfis_permissoes.
  const _PERFIL_MODULO_NATIVO = {
    "PASTORAL":             "PASTORAL",
    "CONSELHO":             "CONSELHO",
    "JUNTA_DIACONAL":       "JUNTA_DIACONAL",
    "ADM_OPERACIONAL":      "ADMINISTRATIVO",
    "LIDER_MINISTERIO":     "MINISTERIAL",
    "LIDER_AREA":           "MINISTERIAL",
    "MEMBRO_MINISTERIO":    "MINISTERIAL",
    "OPERACIONAL_SERVICOS": "INFRAESTRUTURA",
  };
  const _moduloNativo = _PERFIL_MODULO_NATIVO[USUARIO_ATUAL.perfil];
  if (_moduloNativo && (!permissoesUsuario[_moduloNativo] || permissoesUsuario[_moduloNativo] === "SEM_ACESSO")) {
    permissoesUsuario[_moduloNativo] = "LEITURA";
  }

  // Área do Membro e Aniversariantes: acessíveis a todos os usuários logados
  if (!permissoesUsuario["AREA_MEMBRO"] || permissoesUsuario["AREA_MEMBRO"] === "SEM_ACESSO") {
    permissoesUsuario["AREA_MEMBRO"] = "LEITURA";
  }

  document.querySelectorAll("[data-modulo]").forEach(el => {
    const nivel = isAdminTotal ? "COMPLETO" : (permissoesUsuario[el.dataset.modulo] || "SEM_ACESSO");
    el.style.display = nivel === "SEM_ACESSO" ? "none" : "";
  });

  // Entrada pública de Aniversariantes: sempre visível para qualquer usuário logado
  const sbAniv = document.getElementById("sb-aniversariantes-pub");
  if (sbAniv) sbAniv.style.display = "";

  document.querySelectorAll(".mwrap:not([data-modulo])").forEach(mw => {
    mw.style.display = isAdminTotal ? "" : "none";
  });

  const sbSys = document.getElementById("sb-sys");
  if (sbSys) {
    const nConf = isAdminTotal ? "COMPLETO" : (permissoesUsuario["CONFIGURACOES"] || "SEM_ACESSO");
    sbSys.style.display = nConf !== "SEM_ACESSO" ? "" : "none";
  }

  // Oculta labels de seção sem filhos visíveis
  document.querySelectorAll(".slbl").forEach(label => {
    let prox = label.nextElementSibling;
    let temVisivel = false;
    while (prox && !prox.classList.contains("slbl")) {
      if (prox.offsetParent !== null) { temVisivel = true; break; }
      prox = prox.nextElementSibling;
    }
    label.style.display = temVisivel ? "" : "none";
  });

  renderGeralDash();
  _aplicarPermissoesMinisterial();
  _aplicarMembresia();
}

function _aplicarPermissoesMinisterial() {
  if (!USUARIO_ATUAL) return;
  const p = USUARIO_ATUAL.perfil;
  const isGestor = p === "ADMINISTRADOR_GERAL" || p === "CONSELHO" || p === "PASTORAL" || p === "ADM_OPERACIONAL";
  const isLider  = p === "LIDER_MINISTERIO" || p === "LIDER_AREA";

  const btnEscala   = document.getElementById("min-btn-nova-escala-wrap");
  const kpisGlobais = document.getElementById("min-kpis-globais");
  const cardsAdmin  = document.getElementById("min-dash-cards-admin");
  const cardsLider  = document.getElementById("min-dash-cards-lider");

  if (isGestor) {
    if (btnEscala)   btnEscala.style.display   = "";
    if (kpisGlobais) kpisGlobais.style.display  = "";
    if (cardsAdmin)  cardsAdmin.style.display   = "";
    if (cardsLider)  cardsLider.style.display   = "none";
    _minDashMinisterios(cardsAdmin, { mostrarTodos: true });
  } else if (isLider) {
    if (btnEscala)   btnEscala.style.display   = "";
    if (kpisGlobais) kpisGlobais.style.display  = "none";
    if (cardsAdmin)  cardsAdmin.style.display   = "none";
    if (cardsLider)  cardsLider.style.display   = "";
    _minDashMinisterios(cardsLider, { mostrarTodos: false });
  } else {
    if (btnEscala)   btnEscala.style.display   = "none";
    if (kpisGlobais) kpisGlobais.style.display  = "none";
    if (cardsAdmin)  cardsAdmin.style.display   = "none";
    if (cardsLider)  cardsLider.style.display   = "";
    _minDashMinisterios(cardsLider, { mostrarTodos: false });
  }
}

async function _minDashMinisterios(el, opts = {}) {
  if (!el) return;
  const mostrarTodos = opts.mostrarTodos === true;
  const mins = Array.isArray(USUARIO_ATUAL?.ministerios) ? USUARIO_ATUAL.ministerios : [];
  el.classList.add("g3");
  el.innerHTML = `<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center;grid-column:1/-1">Carregando ministérios...</div>`;

  const setKpi = (total, ativos) => {
    const val = document.getElementById("min-kpi-ativos");
    const sub = document.getElementById("min-kpi-ativos-sub");
    if (val) val.textContent = String(ativos);
    if (sub) {
      if (!total) sub.textContent = "nenhum cadastrado";
      else if (ativos === total) sub.textContent = "todos operando";
      else sub.textContent = `${total - ativos} inativo${total - ativos !== 1 ? "s" : ""}`;
    }
  };

  try {
    if (!mostrarTodos && !mins.length) {
      setKpi(0, 0);
      el.innerHTML = `<div class="alr alr-w" style="grid-column:1/-1"><div class="alr-i">ℹ</div><div>Você não está vinculado a nenhum ministério no momento.</div></div>`;
      return;
    }

    const filtroIds = mostrarTodos ? "" : `&id=in.(${mins.join(",")})`;
    const [rMin, rMembros] = await Promise.all([
      fetch(`${apiBaseUrl()}/rest/v1/ministerios?select=id,nome,descricao,tipo,ativo,supervisor,updated_at,created_at${filtroIds}&order=nome.asc`, { headers: apiHeaders() }),
      fetch(`${apiBaseUrl()}/rest/v1/ministerio_membros?select=ministerio_id&status=eq.ativo`, { headers: apiHeaders() }),
    ]);
    if (!rMin.ok) throw new Error("Não foi possível carregar os ministérios.");

    const rows = await rMin.json();
    const membrosRows = rMembros.ok ? await rMembros.json() : [];
    const lista = Array.isArray(rows) ? rows : [];
    const totalAtivos = lista.filter(m => m.ativo !== false).length;
    setKpi(lista.length, totalAtivos);

    if (!lista.length) {
      el.innerHTML = `<div class="alr alr-w" style="grid-column:1/-1"><div class="alr-i">ℹ</div><div>Nenhum ministério cadastrado ainda. Crie um novo ministério para começar.</div></div>`;
      return;
    }

    const contagem = {};
    (Array.isArray(membrosRows) ? membrosRows : []).forEach(m => {
      contagem[m.ministerio_id] = (contagem[m.ministerio_id] || 0) + 1;
    });

    const pessoaIds = [...new Set(lista.map(m => m.supervisor).filter(Boolean))];
    const nomes = {};
    if (pessoaIds.length) {
      const rp = await fetch(`${apiBaseUrl()}/rest/v1/pessoas?id=in.(${pessoaIds.join(",")})&select=id,nome`, { headers: apiHeaders() });
      const pessoas = rp.ok ? await rp.json() : [];
      pessoas.forEach(p => { nomes[p.id] = p.nome; });
    }

    el.innerHTML = lista.map(m => _minDashCard(m, {
      qtdMembros: contagem[m.id] || 0,
      lider: nomes[m.supervisor] || "",
      proxima: null,
    })).join("");
  } catch(_) {
    el.innerHTML = `<div class="alr alr-w" style="grid-column:1/-1"><div class="alr-i">ℹ</div><div>Não foi possível carregar os ministérios agora.</div></div>`;
  }
}

function _minDashCard(m, extra = {}) {
  const ICONES = { MUSICA:"♪", JOVENS:"◆", INFANTIL:"✦", INTERCESSAO:"◎", EVANGELISMO:"◈", DIACONIA:"✚", COMUNICACAO:"◉", OUTRO:"◉" };
  const CORES = { MUSICA:"var(--violet)", JOVENS:"var(--teal)", INFANTIL:"var(--gbr)", INTERCESSAO:"var(--sky)", EVANGELISMO:"var(--rose)", DIACONIA:"var(--amber)", COMUNICACAO:"var(--blue)", OUTRO:"var(--violet)" };
  const tipo = m.tipo || "OUTRO";
  const ativo = m.ativo !== false;
  const statusTxt = ativo ? "Ativo" : "Inativo";
  const statusCls = ativo ? "pos" : "wa";
  const tipoLabel = m.tipo ? (m.tipo.charAt(0) + m.tipo.slice(1).toLowerCase()) : "Sem tipo definido";
  const lider = extra.lider || "—";
  const prox = extra.proxima;
  const proxTxt = prox ? `${_minFmtData(prox.data)}${prox.funcao ? " · " + prox.funcao : ""}` : "—";
  const proxStatus = prox?.status || "Sem próxima escala";
  const desc = m.descricao ? `<div style="font-size:10.5px;color:var(--tx3);margin-bottom:8px">${escapeHtml(m.descricao)}</div>` : "";
  return `<div class="card" style="cursor:pointer" onclick="go('min-min');setTimeout(()=>minMinAbrir('${m.id}'),0)">
    <div class="ctit"><span style="color:${CORES[tipo] || CORES.OUTRO}">${ICONES[tipo] || ICONES.OUTRO}</span> ${escapeHtml(m.nome || "Ministério")}</div>
    ${desc}
    <div class="sr"><span class="sl">Líder / Responsável</span><span class="sv">${escapeHtml(lider)}</span></div>
    <div class="sr"><span class="sl">Status</span><span class="sv ${statusCls}">${statusTxt}</span></div>
    <div class="sr"><span class="sl">Próxima atividade</span><span class="sv">${escapeHtml(proxTxt)}</span></div>
    <div class="sr"><span class="sl">${escapeHtml(prox ? "Escala" : "Tipo")}</span><span class="sv ${prox ? "" : "nu"}">${escapeHtml(prox ? proxStatus : tipoLabel)}</span></div>
    <div class="sr"><span class="sl">Membros ativos</span><span class="sv">${extra.qtdMembros || 0}</span></div>
  </div>`;
}

function _minFmtData(data) {
  if (!data) return "—";
  const d = new Date(`${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return data;
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

// ── MEMBRESIA — controle de acesso por perfil ──────────────────────

// Retorna true para perfis que têm acesso pleno ao módulo de Membresia
function _podeMembresiaPlena() {
  const p = USUARIO_ATUAL?.perfil;
  return (
    p === "ADMINISTRADOR_GERAL" ||
    p === "PASTORAL"            ||
    p === "ADM_OPERACIONAL"     ||
    p === "CONSELHO"            ||
    p === "JUNTA_DIACONAL"
  );
}

// Aplica restrições visuais de Membresia: oculta/exibe elementos [data-memb-adm]
function _aplicarMembresia() {
  if (!USUARIO_ATUAL) return;
  const plena = _podeMembresiaPlena();
  document.querySelectorAll("[data-memb-adm]").forEach(el => {
    el.style.display = plena ? "" : "none";
  });
}

function podeAcessar(modulo, acao = "visualizar") {
  if (!USUARIO_ATUAL) return false;
  if (USUARIO_ATUAL.perfil === "ADMINISTRADOR_GERAL") return true;
  const dbNome = MODULO_DISPLAY_TO_DB[modulo] || modulo.toUpperCase();
  const nivel = permissoesUsuario[dbNome] || "SEM_ACESSO";
  if (nivel === "COMPLETO" || nivel === "ADMIN") return true;
  if (nivel === "EDICAO" && acao !== "excluir") return true;
  if (nivel === "LEITURA" && acao === "visualizar") return true;
  return false;
}

function temPermissao(modulo, acao = "read") {
  return podeAcessar(modulo, acao === "read" ? "visualizar" : acao);
}

/* ── DASHBOARD GERAL — controle de acesso por módulo ──────── */
function canAccessModule(moduloKey) {
  if (!USUARIO_ATUAL) return false;
  if (USUARIO_ATUAL.perfil === "ADMINISTRADOR_GERAL") return true;
  const nivel = permissoesUsuario[moduloKey] || "SEM_ACESSO";
  return nivel !== "SEM_ACESSO";
}

const DASH_MODULOS = [
  {
    key:"ADMINISTRATIVO", dest:"admin-dash",
    mc:"var(--gold)", icoBg:"rgba(201,168,76,0.14)", icoBd:"rgba(201,168,76,0.25)", icoClr:"var(--gold)", ico:"◆",
    nome:"Administrativo",
    stats:[
      {l:"Saldo financeiro",  v:"R$ 13.600", cls:"pos"},
      {l:"Contratos",         v:"3 a vencer", cls:"wa"},
      {l:"Colaboradores",     v:"24 ativos"},
    ]
  },
  {
    key:"CONSELHO", dest:"conselho-dash",
    mc:"var(--sky)", icoBg:"rgba(88,152,212,0.14)", icoBd:"rgba(88,152,212,0.25)", icoClr:"var(--sky)", ico:"◈",
    nome:"Conselho e Governança",
    stats:[
      {l:"Congregações",  v:"1 ativa"},
      {l:"Membros totais",v:"1.284"},
      {l:"Receita",       v:"R$ 42.300/mês"},
    ]
  },
  {
    key:"JURIDICO", dest:"jur-dash",
    mc:"var(--blue)", icoBg:"rgba(74,156,245,0.14)", icoBd:"rgba(74,156,245,0.25)", icoClr:"var(--blue)", ico:"⚖",
    nome:"Jurídico",
    stats:[
      {l:"Demandas jurídicas", v:"11"},
      {l:"Contratos vigentes", v:"14"},
      {l:"Pendências críticas",v:"2", cls:"wa"},
    ]
  },
  {
    key:"PASTORAL", dest:"pastoral-dash",
    mc:"var(--teal)", icoBg:"rgba(58,176,184,0.14)", icoBd:"rgba(58,176,184,0.25)", icoClr:"var(--teal)", ico:"✦",
    nome:"Pastoral",
    stats:[
      {l:"Atendimentos (Abr)", v:"47"},
      {l:"Prioritários",       v:"4 urgentes", cls:"dn"},
      {l:"Pedidos oração",     v:"28"},
    ]
  },
  {
    key:"MINISTERIAL", dest:"min-dash",
    mc:"var(--violet)", icoBg:"rgba(144,104,200,0.14)", icoBd:"rgba(144,104,200,0.25)", icoClr:"var(--violet)", ico:"◉",
    nome:"Departamentos",
    stats:[
      {l:"Ministérios",    v:"8 ativos"},
      {l:"Voluntários",    v:"342"},
      {l:"Escala pendente",v:"1 (Louvor)", cls:"wa"},
    ]
  },
  {
    key:"AGENDA", dest:"agenda-dash",
    mc:"var(--teal)", icoBg:"rgba(42,181,192,0.14)", icoBd:"rgba(42,181,192,0.25)", icoClr:"var(--teal)", ico:"🗓",
    nome:"Agenda",
    stats:[
      {l:"Solicitações no mês",  v:"83"},
      {l:"Aguardando aceite",    v:"12", cls:"wa"},
      {l:"Conflitos detectados", v:"4",  cls:"dn"},
    ]
  },
  {
    key:"PGS", dest:"pgs-dash",
    mc:"var(--gbr)", icoBg:"rgba(82,196,110,0.14)", icoBd:"rgba(82,196,110,0.25)", icoClr:"var(--gbr)", ico:"⌂",
    nome:"Pequenos Grupos",
    stats:[
      {l:"PGs ativos",       v:"18"},
      {l:"Encontros no mês", v:"61"},
      {l:"Visitantes",       v:"27", cls:"pos"},
    ]
  },
  {
    key:"INFRAESTRUTURA", dest:"infra-dash",
    mc:"var(--amber)", icoBg:"rgba(208,144,64,0.14)", icoBd:"rgba(208,144,64,0.25)", icoClr:"var(--amber)", ico:"⊞",
    nome:"Infraestrutura e Conservação",
    stats:[
      {l:"OS abertas", v:"5"},
      {l:"Atrasadas",  v:"2 urgentes", cls:"dn"},
      {l:"Patrimônio", v:"213 itens"},
    ]
  },
  {
    key:"MEMBRESIA", dest:"memb-dash",
    mc:"var(--gbr)", icoBg:"rgba(82,196,110,0.14)", icoBd:"rgba(82,196,110,0.25)", icoClr:"var(--gbr)", ico:"✝",
    nome:"Membresia",
    stats:[
      {l:"Membros ativos", v:"1.284"},
      {l:"Batismos 2026",  v:"38", cls:"pos"},
      {l:"Visitantes (Abr)",v:"74"},
    ]
  },
];

// ── DASHBOARD GERAL — renderização dinâmica por permissão ──────────
const _GERAL_FEED = [
  { mod:"INFRAESTRUTURA", cor:"var(--rose)", txt:"<b>Infraestrutura e Conservação</b> — OS-042 marcada como <b>atrasada</b>",             time:"hoje · 14:32" },
  { mod:"INFRAESTRUTURA", cor:"var(--gmd)",  txt:"<b>Infraestrutura e Conservação</b> — OS de manutenção elétrica concluída",             time:"hoje · 11:15" },
  { mod:"ADMINISTRATIVO", cor:"var(--gold)", txt:"<b>Administrativo</b> — <b>Ana Lima</b> nomeada Líder Ministerial",       time:"hoje · 09:48" },
  { mod:"MEMBRESIA",      cor:"var(--teal)", txt:"<b>Membresia</b> — 14 novos membros cadastrados em lote",                 time:"10/04 · 16:20"},
  { mod:"DEMANDAS",       cor:"var(--sky)",  txt:"<b>Demandas</b> — 8 alertas enviados aos responsáveis",                   time:"10/04 · 08:00"},
];

const _GERAL_BARRAS = [
  { mod:"INFRAESTRUTURA", nome:"Infraestrutura e Conservação", val:23, pct:100, cor:"var(--amber)"  },
  { mod:"MINISTERIAL",    nome:"Ministerial",    val:18, pct:78,  cor:"var(--violet)" },
  { mod:"ADMINISTRATIVO", nome:"Administrativo", val:12, pct:52,  cor:"var(--gold)"   },
  { mod:"PASTORAL",       nome:"Pastoral",       val:5,  pct:22,  cor:"var(--teal)"   },
];

function renderGeralDash() {
  const ct = document.getElementById("geral-ct");
  if (!ct || !USUARIO_ATUAL) return;

  // Membros comuns não usam o dashboard geral — redireciona para Área do Membro
  if (_isMembroComum()) { go("area-dash"); return; }

  const can = (mod) => canAccessModule(mod);
  let h = "";

  // ── Alerta crítico (só para quem acessa Administrativo) ──────────
  if (can("ADMINISTRATIVO")) {
    h += `<div class="alr alr-w" style="margin-bottom:20px">
      <span class="alr-i">⚠</span>
      <div><strong>3 contratos</strong> vencem em 30 dias · <strong>8 demandas</strong> atrasadas · <strong>2 OS</strong> urgentes sem resposta</div>
      <span class="alr-a" onclick="go('admin-con')">Ver →</span>
    </div>`;
  }

  // ── KPIs executivos (somente módulos liberados) ──────────────────
  const kpis = [];
  if (can("DEMANDAS")) {
    kpis.push(`<div class="kpi" onclick="go('dem-todas')" style="cursor:pointer">
      <div class="kpi-ico" style="background:rgba(74,156,245,0.15);color:var(--sky)">📋</div>
      <div class="kpi-body"><div class="kpi-lbl">Demandas abertas</div><div class="kpi-val" id="geral-kpi-abertas">—</div><div class="kpi-d nu">em andamento</div></div>
    </div>`);
    kpis.push(`<div class="kpi" onclick="go('dem-todas')" style="cursor:pointer">
      <div class="kpi-ico" style="background:rgba(224,85,85,0.15);color:var(--rose)">⚠️</div>
      <div class="kpi-body"><div class="kpi-lbl">Em atraso</div><div class="kpi-val" style="color:var(--rose)">8</div><div class="kpi-d dn">requer atenção urgente</div></div>
    </div>`);
  }
  if (can("DEMANDAS") || can("AGENDA")) {
    kpis.push(`<div class="kpi">
      <div class="kpi-ico" style="background:rgba(58,170,92,0.15);color:var(--gmd)">📥</div>
      <div class="kpi-body"><div class="kpi-lbl">Solicitações no mês</div><div class="kpi-val">23</div><div class="kpi-d up">▲ Mai/26</div></div>
    </div>`);
  }
  if (can("AGENDA") || can("ADMINISTRATIVO") || can("INFRAESTRUTURA")) {
    kpis.push(`<div class="kpi">
      <div class="kpi-ico" style="background:rgba(224,138,42,0.15);color:var(--amber)">⚡</div>
      <div class="kpi-body"><div class="kpi-lbl">Conflitos</div><div class="kpi-val">2</div><div class="kpi-d wa">agenda ou operacional</div></div>
    </div>`);
  }
  if (kpis.length) {
    const cols = Math.min(kpis.length, 4);
    h += `<div class="kpis c${cols}" style="margin-bottom:26px">${kpis.join("")}</div>`;
  }

  // ── Status dos módulos (sempre presente; conteúdo renderizado por renderDashboardModulos) ──
  h += `<div class="dash-sec"><span class="dash-sec-t">Status dos Módulos</span><span class="dash-sec-s">visão consolidada das suas áreas</span></div>
  <div class="g3" id="dash-modcards-grid" style="margin-bottom:26px"></div>
  <div id="dash-modcards-empty" style="display:none;background:var(--bg-card);border:1px solid var(--bd1);border-radius:10px;padding:32px 24px;text-align:center;color:var(--tx3);font-size:13px;margin-bottom:26px">
    Nenhum módulo disponível para o seu perfil.<br>Entre em contato com a administração.
  </div>`;

  // ── Feed de atividade filtrado por módulos permitidos ────────────
  const feedItems = _GERAL_FEED.filter(f => can(f.mod));

  // ── Painel estratégico (coluna direita) ─────────────────────────
  const rightCards = [];
  if (can("FINANCEIRO") || can("ADMINISTRATIVO")) {
    rightCards.push(`<div class="card">
      <div class="ctit">Financeiro — Mai/26</div>
      <div class="gfr">
        <div class="gfr-row"><span class="gfr-lbl">Entradas</span><span class="gfr-val pos">R$ 42.300</span></div>
        <div class="gfr-row"><span class="gfr-lbl">Saídas</span><span class="gfr-val neg">R$ 28.700</span></div>
        <div class="gfr-row gfr-saldo"><span class="gfr-lbl">Saldo</span><span class="gfr-val up">R$ 13.600</span></div>
      </div>
    </div>`);
  }
  if (can("DEMANDAS")) {
    const barras = _GERAL_BARRAS.filter(b => can(b.mod));
    if (barras.length) {
      rightCards.push(`<div class="card">
        <div class="ctit">Demandas por módulo</div>
        <div class="bars">${barras.map(b =>
          `<div><div class="bh"><span class="bn">${b.nome}</span><span class="bv">${b.val}</span></div>
          <div class="bt"><div class="bf" style="width:${b.pct}%;background:${b.cor}"></div></div></div>`
        ).join("")}</div>
      </div>`);
    }
  }

  // ── Layout da seção inferior ─────────────────────────────────────
  if (feedItems.length && rightCards.length) {
    const feedHtml = feedItems.map((f, i) =>
      `<div class="fi"><div class="fl"><div class="fdot" style="background:${f.cor}"></div>${i < feedItems.length - 1 ? '<div class="fc"></div>' : ''}</div>
      <div class="fb"><div class="ft">${f.txt}</div><div class="ftm">${f.time}</div></div></div>`
    ).join("");
    h += `<div class="g2">
      <div class="card">
        <div class="ctit">Atividade recente<span class="csub">— últimas ações</span><span class="cact" onclick="T('Auditoria','Log imutável disponível')">auditoria →</span></div>
        <div class="feed">${feedHtml}</div>
      </div>
      <div class="gcol">${rightCards.join("")}</div>
    </div>`;
  } else if (feedItems.length) {
    const feedHtml = feedItems.map((f, i) =>
      `<div class="fi"><div class="fl"><div class="fdot" style="background:${f.cor}"></div>${i < feedItems.length - 1 ? '<div class="fc"></div>' : ''}</div>
      <div class="fb"><div class="ft">${f.txt}</div><div class="ftm">${f.time}</div></div></div>`
    ).join("");
    h += `<div class="card"><div class="ctit">Atividade recente<span class="csub">— últimas ações</span></div><div class="feed">${feedHtml}</div></div>`;
  } else if (rightCards.length) {
    h += `<div class="gcol">${rightCards.join("")}</div>`;
  }

  ct.innerHTML = h;
  renderDashboardModulos();
}

function renderDashboardModulos() {
  const grid  = document.getElementById("dash-modcards-grid");
  const empty = document.getElementById("dash-modcards-empty");
  if (!grid) return;
  const visiveis = DASH_MODULOS.filter(m => canAccessModule(m.key));
  if (!visiveis.length) {
    grid.innerHTML = "";
    if (empty) empty.style.display = "";
    return;
  }
  if (empty) empty.style.display = "none";
  grid.innerHTML = visiveis.map(m => {
    const statsHtml = m.stats.map(s =>
      `<div class="sr"><span class="sl">${s.l}</span><span class="sv${s.cls ? " " + s.cls : ""}">${s.v}</span></div>`
    ).join("");
    return `<div class="modcard" style="--mc:${m.mc}" onclick="go('${m.dest}')">
      <div class="mc-head">
        <div class="mc-icon" style="background:${m.icoBg};border-color:${m.icoBd};color:${m.icoClr}">${m.ico}</div>
        <span class="mc-name">${m.nome}</span><span class="mc-open">abrir →</span>
      </div>
      ${statsHtml}
    </div>`;
  }).join("");
}

/* ── GESTÃO DE USUÁRIOS ────────────────────── */
function renderPerfisAcesso() {
  const el = document.getElementById("perfis-acesso-list");
  if (!el) return;
  el.innerHTML = Object.entries(PERFIS).map(([id, p]) => {
    // UUID já disponível no cache — passa direto para o botão
    const uuid = _perfisUuidMap[id] || "";
    const modCount = Object.values(PERMISSOES_DB[id] || {}).filter(v => v !== "SEM_ACESSO").length;
    return `
    <div style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:9px 11px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:14px">${p.icon}</span>
        <div style="flex:1">
          <div style="font-size:11.5px;font-weight:600;color:var(--tx1)">${p.nome}</div>
          <div style="font-size:10px;color:var(--tx3)">Nível ${p.nivel} — ${modCount || "—"} módulos com acesso</div>
        </div>
        <button onclick="verPerfil('${id}','${uuid}')"
          style="font-size:9px;color:${p.cor};background:${p.cor}11;border:1px solid ${p.cor}33;border-radius:4px;padding:3px 9px;cursor:pointer;white-space:nowrap">
          ${id === "admin_geral" ? "Ver" : "✏️ Editar"}
        </button>
      </div>
    </div>`;
  }).join("");
}

async function carregarUsuarios() {
  await carregarPermissoesDB();
  renderPerfisAcesso();
  const el = document.getElementById("usuarios-list");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Carregando...</div>`;
  try {
    // Busca apenas membros que já têm funcao atribuída (têm acesso ao sistema)
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/v_membros?funcao=not.is.null&select=id,nome,email,telefone,funcao,status&order=nome.asc&limit=1000`,
      { headers: apiHeaders() }
    );
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();

    const ativos  = rows.filter(r => r.status === "ativo"  || r.status == null).length;
    const inativos = rows.filter(r => r.status === "inativo").length;
    const admins  = rows.filter(r => r.funcao  === "admin_geral").length;
    const ua = document.getElementById("usr-ativos");  if (ua)  ua.textContent = ativos;
    const ui = document.getElementById("usr-inativos"); if (ui)  ui.textContent = inativos;
    const uad = document.getElementById("usr-admins"); if (uad) uad.textContent = admins;

    if (!rows.length) {
      el.innerHTML = `<div style="text-align:center;padding:24px;color:var(--tx3)">Nenhum membro com acesso ao sistema.<br><span style="font-size:10px">Clique em "+ Conceder Acesso" para vincular um membro.</span></div>`;
      return;
    }

    el.innerHTML = rows.map(u => {
      const perfil  = PERFIS[u.funcao] || { nome: u.funcao || "Sem perfil", icon:"👤", cor:"var(--tx3)" };
      const initials = (u.nome || "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
      const ativo   = u.status === "ativo" || u.status == null;
      return `
        <div class="usr-row">
          <div class="usr-av-sm" style="background:${ativo ? "var(--grd)" : "var(--tx4)"}">${initials}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(u.nome || "—")}</div>
            <div style="font-size:10px;color:var(--tx3)">${escapeHtml(u.email || u.telefone || "—")}</div>
          </div>
          <span style="font-size:9.5px;padding:2px 7px;border-radius:10px;border:1px solid ${perfil.cor}44;color:${perfil.cor};background:${perfil.cor}11;white-space:nowrap">${perfil.icon} ${escapeHtml(perfil.nome)}</span>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
            <span style="font-size:9px;padding:2px 7px;border-radius:8px;background:${ativo ? "rgba(58,170,92,0.12)" : "rgba(224,85,85,0.1)"};color:${ativo ? "var(--gr)" : "var(--rose)"}">${ativo ? "✓ Ativo" : "✗ Inativo"}</span>
            <button onclick='editarUsuario(${safeJsonForHtml(u)})' style="background:var(--bg-card);border:1px solid var(--bd1);border-radius:4px;color:var(--tx2);font-size:10px;padding:3px 8px;cursor:pointer">✏️ Editar</button>
            <button onclick='revogarAcesso(${JSON.stringify(u.id)},${JSON.stringify(u.nome)})' style="background:var(--bg-card);border:1px solid var(--bd1);border-radius:4px;color:var(--rose);font-size:10px;padding:3px 8px;cursor:pointer">🚫</button>
          </div>
        </div>`;
    }).join("");
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose);font-size:11.5px;padding:12px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

let _usuarioSelecionadoId = null;

function openNovoUsuario() {
  _usuarioSelecionadoId = null;
  const modal = document.createElement("div");
  modal.id = "usr-modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:310";
  const perfilOptions = Object.entries(PERFIS).map(([k,v])=>`<option value="${k}"${k==="membro_igreja"?" selected":""}>${v.icon} ${v.nome}</option>`).join("");
  modal.innerHTML = `
    <div style="width:min(520px,94vw);max-height:90vh;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;overflow:hidden;display:flex;flex-direction:column">
      <div style="padding:14px 16px;border-bottom:1px solid var(--bd1);display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
        <div style="font-size:14px;font-weight:700;color:var(--tx1)">🔐 Conceder Acesso ao Sistema</div>
        <button onclick="document.getElementById('usr-modal').remove()" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer">✕</button>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:10px;overflow-y:auto">
        <div style="font-size:10.5px;color:var(--tx3)">Busque pelo membro já cadastrado na Membresia e atribua um perfil de acesso. Nenhum registro novo será criado.</div>
        <div style="display:flex;gap:8px">
          <input id="usr-busca" type="text" placeholder="Nome, e-mail ou telefone…"
            style="flex:1;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none"
            oninput="buscarMembroParaAcesso(this.value)">
        </div>
        <div id="usr-busca-resultados" style="display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto"></div>
        <div id="usr-membro-selecionado" style="display:none;background:var(--bg-surface);border:1px solid var(--bd2);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:10px">
          <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Membro selecionado</div>
          <div id="usr-membro-info"></div>
          <div><label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Perfil de Acesso</label>
            <select id="nu-perfil" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none">${perfilOptions}</select>
          </div>

        </div>
      </div>
      <div style="padding:14px 16px;border-top:1px solid var(--bd1);display:flex;justify-content:flex-end;gap:8px;flex-shrink:0">
        <button onclick="document.getElementById('usr-modal').remove()" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:8px 12px;color:var(--tx2);cursor:pointer">Cancelar</button>
        <button id="btn-conceder-acesso" onclick="salvarNovoUsuario()" disabled style="background:var(--gr);border:none;border-radius:6px;padding:8px 16px;color:#fff;font-weight:600;cursor:not-allowed;opacity:.45">✅ Conceder Acesso</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("usr-busca").focus();
}

let _buscaTimer = null;
async function buscarMembroParaAcesso(termo) {
  clearTimeout(_buscaTimer);
  const el = document.getElementById("usr-busca-resultados");
  if (!el) return;
  termo = (termo || "").trim();
  if (termo.length < 2) { el.innerHTML = ""; return; }
  _buscaTimer = setTimeout(async () => {
    el.innerHTML = `<div style="font-size:11px;color:var(--tx3);padding:4px">${spinner()} Buscando...</div>`;
    try {
      const t = encodeURIComponent(`*${termo}*`);
      const url = `${apiBaseUrl()}/rest/v1/v_membros?or=(nome.ilike.${t},email.ilike.${t},telefone.ilike.${t},celular.ilike.${t})&select=id,nome,email,telefone,celular,funcao,status&order=nome.asc&limit=20`;
      const res = await fetch(url, { headers: apiHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.length) {
        el.innerHTML = `<div style="font-size:11px;color:var(--tx3);text-align:center;padding:12px">Nenhum membro encontrado</div>`;
        return;
      }
      el.innerHTML = data.map(m => {
        const perfil = PERFIS[m.funcao];
        const badge = perfil
          ? `<span style="font-size:9px;color:${perfil.cor};background:${perfil.cor}11;border:1px solid ${perfil.cor}33;border-radius:4px;padding:2px 6px;white-space:nowrap">${perfil.icon} ${perfil.nome}</span>`
          : `<span style="font-size:9px;color:var(--tx4)">Sem acesso</span>`;
        const contato = m.email || m.telefone || m.celular || "";
        return `<div onclick='selecionarMembroParaAcesso(${safeJsonForHtml(m)})'
          style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--bd1);border-radius:6px;cursor:pointer;background:var(--bg-surface);transition:border-color .12s"
          onmouseover="this.style.borderColor='var(--blue)'" onmouseout="this.style.borderColor='var(--bd1)'">
          <div style="width:30px;height:30px;border-radius:50%;background:var(--grd);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">
            ${(m.nome||"?").split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase()}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(m.nome||"—")}</div>
            <div style="font-size:10px;color:var(--tx3)">${escapeHtml(contato)}</div>
          </div>
          ${badge}
        </div>`;
      }).join("");
    } catch(e) {
      el.innerHTML = `<div style="color:var(--rose);font-size:11px;padding:8px">Erro: ${escapeHtml(e.message)}</div>`;
    }
  }, 280);
}

function selecionarMembroParaAcesso(m) {
  _usuarioSelecionadoId = m.id;
  const resultados = document.getElementById("usr-busca-resultados");
  if (resultados) resultados.innerHTML = "";
  const busca = document.getElementById("usr-busca");
  if (busca) busca.value = m.nome || "";

  const select = document.getElementById("nu-perfil");
  if (select && m.funcao && PERFIS[m.funcao]) select.value = m.funcao;

  const info = document.getElementById("usr-membro-info");
  if (info) {
    const initials = (m.nome||"?").split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase();
    const contato = [m.email, m.telefone||m.celular].filter(Boolean).join(" · ");
    info.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--grd);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0">${initials}</div>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--tx1)">${escapeHtml(m.nome||"—")}</div>
          <div style="font-size:10.5px;color:var(--tx3)">${escapeHtml(contato)}</div>
        </div>
      </div>`;
  }

  const selecionado = document.getElementById("usr-membro-selecionado");
  if (selecionado) selecionado.style.display = "flex";

  const btn = document.getElementById("btn-conceder-acesso");
  if (btn) { btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer"; }
}

async function salvarNovoUsuario() {
  if (!_usuarioSelecionadoId) return T("Selecione um membro", "Busque e selecione um membro antes de continuar.");
  const funcao = document.getElementById("nu-perfil").value;
  const btn = document.getElementById("btn-conceder-acesso");
  if (btn) { btn.textContent = "Salvando..."; btn.disabled = true; }
  try {
    await adminAtualizarAcessoMembro(_usuarioSelecionadoId, funcao, true);
    registrarLog("usuarios","conceder_acesso","membros",_usuarioSelecionadoId,{ funcao, concedido_por: USUARIO_ATUAL?.nome });
    T("✅ Acesso concedido!", `Perfil: ${PERFIS[funcao]?.nome || funcao}`);
    document.getElementById("usr-modal")?.remove();
    _usuarioSelecionadoId = null;
    carregarUsuarios();
  } catch(e) {
    T("Erro ao conceder acesso", e.message);
    if (btn) { btn.textContent = "✅ Conceder Acesso"; btn.disabled = false; btn.style.opacity = "1"; }
  }
}

async function revogarAcesso(id, nome) {
  if (!confirm(`Revogar acesso de "${nome}"?\n\nO cadastro de membro será mantido. Apenas o perfil de acesso será removido.`)) return;
  try {
    await adminAtualizarAcessoMembro(id, null, null);
    registrarLog("usuarios","revogar_acesso","membros",id,{ nome, revogado_por: USUARIO_ATUAL?.nome });
    T("Acesso revogado", `${nome} não tem mais acesso ao sistema.`);
    carregarUsuarios();
  } catch(e) { T("Erro ao revogar acesso", e.message); }
}

async function adminAtualizarAcessoMembro(membroId, perfilAcesso, ativo) {
  const sb = getSupabase();
  if (!sb) throw new Error("Cliente Supabase indisponível.");

  const { data: sess } = await sb.auth.getSession();
  if (!sess?.session?.access_token) {
    throw new Error("Sessão expirada. Entre novamente para alterar usuários.");
  }

  const { data, error } = await sb.rpc("admin_atualizar_acesso_membro", {
    p_membro_id: membroId,
    p_perfil_acesso: perfilAcesso,
    p_ativo: ativo
  });

  if (error) {
    const msg = error.message || "Falha ao atualizar acesso do usuário.";
    if (/permission denied|42501|Apenas Administrador/i.test(msg)) {
      throw new Error("Apenas Administrador Geral pode alterar perfil/status de usuários.");
    }
    throw new Error(msg);
  }

  return data;
}

function editarUsuario(u) {
  const perfil = PERFIS[u.funcao] || { nome:"Sem perfil" };
  const perfilOptions = Object.entries(PERFIS).map(([k,v])=>`<option value="${k}" ${k===u.funcao?"selected":""}>${v.icon} ${v.nome}</option>`).join("");
  const modal = document.createElement("div");
  modal.id = "edit-usr-modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:310";
  modal.innerHTML = `
    <div style="width:min(480px,92vw);background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;overflow:hidden">
      <div style="padding:14px 16px;border-bottom:1px solid var(--bd1);display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:14px;font-weight:700;color:var(--tx1)">Editar Usuário · ${escapeHtml(u.nome)}</div>
        <button onclick="document.getElementById('edit-usr-modal').remove()" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer">✕</button>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div><label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Perfil de Acesso</label>
          <select id="eu-perfil" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none">${perfilOptions}</select></div>
        <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:10px 12px">
          <div><div style="font-size:12px;font-weight:600;color:var(--tx1)">Status do acesso</div><div style="font-size:10px;color:var(--tx3)">${u.status==="ativo"||u.status==null?"Ativo — pode entrar no sistema":"Inativo — acesso bloqueado"}</div></div>
          <button id="eu-ativo-btn" onclick="toggleAtivoBtn()" style="background:${u.status==="ativo"||u.status==null?"var(--gr)":"var(--tx4)"};border:none;border-radius:12px;padding:5px 14px;color:#fff;font-size:11px;font-weight:600;cursor:pointer">${u.status==="ativo"||u.status==null?"✓ Ativo":"✗ Inativo"}</button>
        </div>
        <button onclick='enviarResetSenhaUsuario(${JSON.stringify(u.email)})' style="width:100%;background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:10px 12px;color:var(--tx2);font-size:12px;font-weight:600;cursor:pointer;text-align:left">
          🔑 Enviar link de redefinição por e-mail
        </button>
      </div>
      <div style="padding:14px 16px;border-top:1px solid var(--bd1);display:flex;justify-content:space-between;gap:8px">
        <button onclick="document.getElementById('edit-usr-modal').remove()" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:8px 12px;color:var(--tx2);cursor:pointer">Cancelar</button>
        <button onclick='salvarEdicaoUsuario(${JSON.stringify(u.id)})' style="background:var(--gr);border:none;border-radius:6px;padding:8px 16px;color:#fff;font-weight:600;cursor:pointer">💾 Salvar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function toggleAtivoBtn() {
  const btn = document.getElementById("eu-ativo-btn");
  const ativo = btn.textContent.includes("Ativo") && !btn.textContent.includes("Inativo");
  if (ativo) { btn.textContent = "✗ Inativo"; btn.style.background = "var(--tx4)"; }
  else { btn.textContent = "✓ Ativo"; btn.style.background = "var(--gr)"; }
}

async function salvarEdicaoUsuario(id) {
  const funcao = document.getElementById("eu-perfil").value;
  const btn = document.getElementById("eu-ativo-btn");
  const ativo = btn?.textContent.includes("Ativo") && !btn?.textContent.includes("Inativo");
  const status = ativo ? "ativo" : "inativo";
  try {
    await adminAtualizarAcessoMembro(id, funcao, ativo);
    registrarLog("usuarios","editar_usuario","membros",id,{ funcao, status, editado_por: USUARIO_ATUAL?.nome });
    T("✅ Usuário atualizado!","Perfil e status salvos");
    document.getElementById("edit-usr-modal")?.remove();
    carregarUsuarios();
  } catch(e) { T("Erro ao salvar",e.message); }
}

async function esqueceuSenha() {
  const email = (document.getElementById("login-email")?.value || "").trim();
  const errEl = document.getElementById("login-err");
  if (!email) {
    if (errEl) { errEl.style.color = "var(--amber)"; errEl.textContent = "Informe seu e-mail para redefinir a senha."; }
    document.getElementById("login-email")?.focus();
    return;
  }
  await enviarResetSenhaUsuario(email, errEl);
}

async function enviarResetSenhaUsuario(email, errEl) {
  if (!email) { T("Sem e-mail", "Este usuário não possui e-mail cadastrado."); return; }
  const btn = document.querySelector("#login-screen button[onclick='esqueceuSenha()']");
  if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }
  try {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (btn) { btn.disabled = false; btn.textContent = "Esqueceu a senha?"; }
    if (error) {
      const msg = "Não foi possível enviar o link. Verifique o e-mail informado.";
      if (errEl) { errEl.style.color = "var(--rose)"; errEl.textContent = msg; }
      else T("Erro", msg);
      console.error("resetPasswordForEmail:", error);
      return;
    }
    if (USUARIO_ATUAL) { try { registrarLog("usuarios", "reset_senha_email", "pessoas", null, { email, enviado_por: USUARIO_ATUAL.nome }); } catch(_) {} }
    const ok = `Link enviado para ${email}. Verifique sua caixa de entrada.`;
    if (errEl) { errEl.style.color = "var(--gr)"; errEl.textContent = ok; }
    T("Link enviado!", ok);
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = "Esqueceu a senha?"; }
    if (errEl) { errEl.style.color = "var(--rose)"; errEl.textContent = e.message; }
    else T("Erro", e.message);
  }
}

async function verPerfil(perfilId, perfilUuid) {
  const perfil = PERFIS[perfilId];
  if (!perfil) return;

  const isAdmin = perfilId === "admin_geral";

  // UUID: vem do botão → cache → busca no banco (garante que funciona mesmo se o
  // carregamento assíncrono inicial ainda não tinha terminado quando o botão foi renderizado)
  let uuid = perfilUuid || _perfisUuidMap[perfilId] || "";
  if (!uuid && !isAdmin) {
    try { uuid = await obterPerfilUuid(perfilId); } catch(_) {}
  }

  // Se temos UUID mas PERMISSOES_DB ainda está vazio, recarrega do banco
  if (uuid && !PERMISSOES_DB[perfilId]) {
    await carregarPermissoesDB();
  }

  const modulos = Object.keys(PERMISSOES_MATRIZ);
  const perms   = PERMISSOES_DB[perfilId] || {};
  const NIVEIS  = [
    ["SEM_ACESSO","❌ Sem acesso"],
    ["LEITURA",   "👁 Leitura"],
    ["EDICAO",    "✏️ Edição"],
    ["COMPLETO",  "⚙️ Completo"],
  ];

  const rows = modulos.map(mod => {
    const atual = perms[mod] || "SEM_ACESSO";
    if (isAdmin) {
      const lbl = NIVEIS.find(([v]) => v === atual)?.[1] || atual;
      return `<tr style="border-bottom:1px solid var(--bd1)">
        <td style="padding:7px 10px;font-size:11px;color:var(--tx2);font-weight:500">${mod}</td>
        <td style="padding:7px 10px;font-size:11px;color:var(--gr)">${lbl}</td></tr>`;
    }
    const opts = NIVEIS.map(([v,l]) => `<option value="${v}"${v===atual?" selected":""}>${l}</option>`).join("");
    return `<tr style="border-bottom:1px solid var(--bd1)" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
      <td style="padding:7px 10px;font-size:11px;color:var(--tx2);font-weight:500">${mod}</td>
      <td style="padding:5px 8px">
        <select data-modulo="${mod}" style="background:var(--bg-input);border:1px solid var(--bd2);border-radius:4px;color:var(--tx1);font-size:11px;padding:4px 6px;outline:none;width:100%">${opts}</select>
      </td></tr>`;
  }).join("");

  const modal = document.createElement("div");
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:310";
  // UUID e chave ficam no container interno como data attributes
  modal.innerHTML = `
    <div data-perfil-id="${perfilId}" data-perfil-uuid="${uuid}"
      style="width:min(460px,94vw);max-height:88vh;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;overflow:hidden;display:flex;flex-direction:column">
      <div style="padding:14px 16px;border-bottom:1px solid var(--bd1);display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--tx1)">${perfil.icon} ${perfil.nome}</div>
          ${isAdmin ? `<div style="font-size:10px;color:var(--tx3);margin-top:2px">Perfil de administrador — permissões fixas</div>` : ""}
          ${!uuid && !isAdmin ? `<div style="font-size:10px;color:var(--rose);margin-top:2px">⚠ Perfil não encontrado no banco. Execute o seed SQL.</div>` : ""}
        </div>
        <button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer">✕</button>
      </div>
      <div style="overflow-y:auto;flex:1">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="border-bottom:1px solid var(--bd2)">
            <th style="text-align:left;padding:8px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3)">Módulo</th>
            <th style="text-align:left;padding:8px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3)">Nível de Acesso</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="padding:12px 16px;border-top:1px solid var(--bd1);display:flex;justify-content:space-between;gap:8px;flex-shrink:0">
        ${!isAdmin ? `<button onclick="restaurarPadraoPerfil('${perfilId}',this.closest('[data-perfil-id]'))" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:7px 12px;color:var(--tx3);font-size:11px;cursor:pointer">↺ Restaurar padrão</button>` : `<span></span>`}
        <div style="display:flex;gap:8px">
          <button onclick="this.closest('div[style*=fixed]').remove()" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:7px 12px;color:var(--tx2);font-size:11px;cursor:pointer">Fechar</button>
          ${!isAdmin ? `<button onclick="salvarPermissoesPerfil(this.closest('[data-perfil-id]'))" style="background:var(--gr);border:none;border-radius:6px;padding:7px 14px;color:#fff;font-size:11px;font-weight:600;cursor:pointer">💾 Salvar</button>` : ""}
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function obterPerfilUuid(perfilKey) {
  if (_perfisUuidMap[perfilKey]) return _perfisUuidMap[perfilKey];
  // Resolve nome exato no banco: primeiro por chave JS, depois por nome visual
  const nomeDisplay = PERFIS[perfilKey]?.nome || perfilKey;
  const nomeBanco   = PERFIL_KEY_TO_DB_NOME[perfilKey] || PERFIS_MAP[nomeDisplay];
  if (!nomeBanco) throw new Error(`Perfil desconhecido: "${perfilKey}"`);
  const res = await fetch(
    `${apiBaseUrl()}/rest/v1/perfis?nome=eq.${encodeURIComponent(nomeBanco)}&select=id,nome&limit=1`,
    { headers: apiHeaders() }
  );
  if (!res.ok) throw new Error("Erro ao buscar perfil no banco");
  const data = await res.json();
  if (!data.length) throw new Error(`Perfil "${nomeBanco}" não encontrado. Execute supabase-perfis-permissoes.sql no Supabase.`);
  _perfisUuidMap[perfilKey] = data[0].id;
  return data[0].id;
}

async function salvarPermissoesPerfil(containerEl) {
  // UUID e chave JS vêm direto do data attributes do container — sem lookup
  const perfilId   = containerEl.dataset.perfilId;
  let   perfilUuid = containerEl.dataset.perfilUuid;

  const btn = containerEl.querySelector("button[onclick*='salvarPermissoesPerfil']");
  if (btn) { btn.textContent = "Salvando..."; btn.disabled = true; }

  try {
    // Se UUID não veio no botão, tenta buscar agora (fallback)
    if (!perfilUuid) perfilUuid = await obterPerfilUuid(perfilId);
    if (!perfilUuid) throw new Error("UUID do perfil não encontrado. Execute supabase-perfis-permissoes.sql no Supabase.");

    const selects  = containerEl.querySelectorAll("select[data-modulo]");
    const registros = [];
    selects.forEach(sel => {
      const moduloDb = MODULO_DISPLAY_TO_DB[sel.dataset.modulo];
      if (moduloDb) registros.push({ perfil_id: perfilUuid, modulo: moduloDb, nivel_acesso: sel.value });
    });

    // DELETE + INSERT — sem risco de conflito de constraint
    const delRes = await fetch(
      `${apiBaseUrl()}/rest/v1/perfis_permissoes?perfil_id=eq.${encodeURIComponent(perfilUuid)}`,
      { method: "DELETE", headers: apiHeaders() }
    );
    if (!delRes.ok) { const e = await delRes.text(); let m=e; try{m=JSON.parse(e).message||e;}catch{} throw new Error(m); }

    const insRes = await fetch(`${apiBaseUrl()}/rest/v1/perfis_permissoes`, {
      method: "POST",
      headers: apiHeaders({ "Prefer": "return=representation" }),
      body: JSON.stringify(registros)
    });
    if (!insRes.ok) { const e = await insRes.text(); let m=e; try{m=JSON.parse(e).message||e;}catch{} throw new Error(m); }

    // Atualiza cache local
    if (!PERMISSOES_DB[perfilId]) PERMISSOES_DB[perfilId] = {};
    selects.forEach(sel => { PERMISSOES_DB[perfilId][sel.dataset.modulo] = sel.value; });
    _perfisUuidMap[perfilId] = perfilUuid;

    registrarLog("acesso","editar_permissoes","perfis",perfilUuid,{ perfil: perfilId, editado_por: USUARIO_ATUAL?.nome });
    T("✅ Permissões salvas!", `Perfil ${PERFIS[perfilId]?.nome} atualizado.`);
    containerEl.closest("div[style*=fixed]").remove();
    if (USUARIO_ATUAL?.perfil === perfilId) aplicarPermissoes();
    renderMatrizPermissoes();
    renderPerfisAcesso();
  } catch(e) {
    T("Erro ao salvar permissões", e.message);
    if (btn) { btn.textContent = "💾 Salvar"; btn.disabled = false; }
  }
}

const _NIVEL_FROM_MATRIZ = { "full":"COMPLETO", "read":"LEITURA", "restricted":"LEITURA" };

function restaurarPadraoPerfil(perfilId, modalEl) {
  if (!confirm("Restaurar permissões padrão para este perfil?")) return;
  modalEl.querySelectorAll("select[data-modulo]").forEach(sel => {
    const p = PERMISSOES_MATRIZ[sel.dataset.modulo]?.[perfilId];
    sel.value = _NIVEL_FROM_MATRIZ[p] || "SEM_ACESSO";
  });
}

function renderMatrizPermissoes() {
  const tbody = document.getElementById("perm-matrix-body");
  if (!tbody) return;
  const perfisKeys = Object.keys(PERFIS);
  const cores   = { COMPLETO:"var(--gr)", LEITURA:"var(--blue)", EDICAO:"var(--amber)" };
  const labels  = { COMPLETO:"⚙️ Total", LEITURA:"👁 Ver", EDICAO:"✏️ Editar" };
  const usaDB   = Object.keys(PERMISSOES_DB).length > 0;
  tbody.innerHTML = Object.keys(PERMISSOES_MATRIZ).map(mod => `
    <tr style="border-bottom:1px solid var(--bd1)" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
      <td style="padding:7px 10px;font-size:11px;color:var(--tx2);font-weight:500">${mod}</td>
      ${perfisKeys.map(pk => {
        let nivel;
        if (usaDB) {
          nivel = PERMISSOES_DB[pk]?.[mod] || "SEM_ACESSO";
        } else {
          const p = PERMISSOES_MATRIZ[mod]?.[pk];
          nivel = _NIVEL_FROM_MATRIZ[p] || "SEM_ACESSO";
        }
        const cor = cores[nivel];
        return `<td style="padding:7px 6px;text-align:center">
          ${cor ? `<span style="font-size:9px;padding:2px 5px;border-radius:4px;background:${cor}22;color:${cor};border:1px solid ${cor}33">${labels[nivel]}</span>`
                : `<span style="color:var(--tx4);font-size:11px">—</span>`}
        </td>`;
      }).join("")}
    </tr>`).join("");
}

/* ── CARREGAMENTO DE PERMISSÕES DO BANCO ─── */
async function carregarPermissoesDB() {
  try {
    const DB_NOME_TO_KEY = Object.fromEntries(
      Object.entries(PERFIL_KEY_TO_DB_NOME).map(([k,v]) => [v, k])
    );

    const [perfisRes, permsRes] = await Promise.all([
      fetch(`${apiBaseUrl()}/rest/v1/perfis?select=id,nome&limit=20`, { headers: apiHeaders() }),
      fetch(`${apiBaseUrl()}/rest/v1/perfis_permissoes?select=perfil_id,modulo,nivel_acesso&limit=500`, { headers: apiHeaders() })
    ]);
    if (!perfisRes.ok || !permsRes.ok) throw new Error("Falha ao buscar perfis/permissões");

    const perfisData = await perfisRes.json();
    const permsData  = await permsRes.json();
    if (!perfisData.length) return;

    // Mapas UUID ↔ chave JS — sempre constrói, mesmo sem permissões
    const uuidToKey = {};
    _perfisUuidMap = {};
    perfisData.forEach(p => {
      const key = DB_NOME_TO_KEY[p.nome];
      if (key) { uuidToKey[p.id] = key; _perfisUuidMap[key] = p.id; }
    });

    if (!permsData.length) return;

    // Preenche PERMISSOES_DB usando chaves JS e nomes display
    PERMISSOES_DB = {};
    permsData.forEach(r => {
      const perfilKey    = uuidToKey[r.perfil_id];
      const moduloDisplay = MODULO_DB_TO_DISPLAY[r.modulo];
      if (!perfilKey || !moduloDisplay) return;
      if (!PERMISSOES_DB[perfilKey]) PERMISSOES_DB[perfilKey] = {};
      PERMISSOES_DB[perfilKey][moduloDisplay] = r.nivel_acesso;
    });
  } catch(e) {
    console.warn("Permissões do banco indisponíveis, usando fallback:", e.message);
  }
}

/* ── LOG DE AUDITORIA ──────────────────────── */
async function registrarLog(modulo, acao, entidade, entidade_id, detalhes={}) {
  if (!SUPABASE_URL || !USUARIO_ATUAL) return;
  try {
    const isUUID = v => v && /^[0-9a-f-]{36}$/i.test(String(v));
    await fetch(`${apiBaseUrl()}/rest/v1/logs_sistema`, {
      method: "POST",
      headers: apiHeaders({ "Prefer": "return=minimal" }),
      body: JSON.stringify({
        tabela:       entidade || modulo,
        operacao:     acao,
        registro_id:  isUUID(entidade_id) ? entidade_id : null,
        dados_depois: { ...detalhes, modulo },
        descricao:    `${modulo}: ${acao}`,
        pessoa_id:    isUUID(USUARIO_ATUAL?.pessoa_id) ? USUARIO_ATUAL.pessoa_id : null,
        auth_user_id: isUUID(USUARIO_ATUAL?.auth_user_id) ? USUARIO_ATUAL.auth_user_id : null,
      })
    });
  } catch(e) { console.warn("Log falhou:", e.message); }
}

/* ── INICIALIZAÇÃO ─────────────────────────── */
/* Módulo Agenda Core/Dashboard extraído para agenda-core.js */

// ── ÁREA DO MEMBRO — DASHBOARD ─────────────────
function _areaDashLoad() {
  const nome = USUARIO_ATUAL?.nome?.split(" ")[0] || "Membro";
  const hora = new Date().getHours();
  const saud = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const el = document.getElementById("area-saudacao");
  if (el) el.textContent = `${saud}, ${nome}!`;

  _areaCarregarSemana();
  _areaCarregarEscalas();
  _areaCarregarMinisterios();
  _areaCarregarAvisos();
  if (typeof window._area_kpi_load === "function") window._area_kpi_load();
}

async function _areaCarregarSemana() {
  const el  = document.getElementById("area-dash-semana");
  const agEl = document.getElementById("area-agenda-list");
  const target = el || agEl;
  if (!target) return;
  try {
    const today = new Date().toISOString().slice(0,10);
    // tabela agenda usa coluna "data"; data_inicio é coluna legada (nullable)
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/agenda?or=(data.gte.${today},data_inicio.gte.${today})&status=eq.confirmado&order=data.asc&limit=6&select=titulo,data,data_inicio,local,tipo`,
      { headers: apiHeaders() }
    );
    if (!res.ok) throw new Error("agenda_" + res.status);
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) {
      target.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:12px 0">Nenhum evento confirmado nos próximos dias.</div>`;
      if (el && agEl && el !== agEl) agEl.innerHTML = target.innerHTML;
      return;
    }
    const html = rows.map(r => {
      const rawDate = r.data || r.data_inicio;
      const d = rawDate
        ? new Date(rawDate).toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})
        : "—";
      const tipo = r.tipo
        ? `<span style="font-size:9.5px;background:rgba(58,176,184,0.12);color:var(--teal);border-radius:3px;padding:1px 6px;margin-left:6px">${escapeHtml(r.tipo)}</span>`
        : "";
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--bd1)">
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--tx1)">${escapeHtml(r.titulo||"—")}${tipo}</div>
          <div style="font-size:10.5px;color:var(--tx3)">${escapeHtml(r.local||"")}</div>
        </div>
        <span style="font-size:10.5px;color:var(--teal);white-space:nowrap;margin-left:12px">${d}</span>
      </div>`;
    }).join("");
    target.innerHTML = html;
    if (el && agEl && el !== agEl) agEl.innerHTML = html;
    const kpiEl   = document.getElementById("area-kpi-evento");
    const kpiData = document.getElementById("area-kpi-evento-data");
    if (kpiEl && rows[0]) {
      kpiEl.textContent = rows[0].titulo?.split(" ").slice(0,3).join(" ") || "—";
      const d = new Date(rows[0].data || rows[0].data_inicio).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});
      if (kpiData) kpiData.textContent = d;
    }
  } catch(_) {
    if (target) target.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:12px 0">Nenhum evento confirmado nos próximos dias.</div>`;
  }
}

async function _areaCarregarEscalas() {
  const secao = document.getElementById("area-escalas-secao");
  // Tabela escala_ministerial ainda não existe — seção oculta sem chamar a API
  if (secao) secao.style.display = "none";
}

async function _areaCarregarMinisterios() {
  const el      = document.getElementById("area-dash-ministerios");
  const badgeEl = document.getElementById("area-badge-ministerios");
  const kpiEl   = document.getElementById("area-kpi-min");
  if (!el) return;

  function _empty() {
    el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:12px 0">Você ainda não está vinculado a nenhum ministério.</div>
      <button class="tbt" style="margin-top:10px" onclick="abrirModalNovaDemanda()">Solicitar inclusão em Ministério</button>`;
    if (kpiEl)   kpiEl.textContent   = "Nenhum";
    if (badgeEl) badgeEl.textContent = "Nenhum vinculado";
  }

  function _render(rows) {
    if (!Array.isArray(rows) || !rows.length) { _empty(); return; }
    const n = rows.length;
    if (kpiEl)   kpiEl.textContent   = rows[0].nome?.split(" ")[0] || "—";
    if (badgeEl) badgeEl.textContent = n === 1 ? "1 ministério" : `${n} ministérios`;
    el.innerHTML = rows.map(r => {
      const ativo = r.ativo !== false;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--bd1)">
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--tx1)">◉ ${escapeHtml(r.nome||"—")}</div>
          ${r.descricao ? `<div style="font-size:10.5px;color:var(--tx3)">${escapeHtml(r.descricao)}</div>` : ""}
        </div>
        <span class="sv ${ativo ? "pos" : "wa"}" style="font-size:10px;white-space:nowrap">${ativo ? "ativo" : "inativo"}</span>
      </div>`;
    }).join("") + `<div style="margin-top:12px"><button class="tbt" onclick="go('area-min')">Ver detalhes →</button></div>`;
  }

  const pessoaId = USUARIO_ATUAL?.pessoa_id || USUARIO_ATUAL?.id;
  if (!pessoaId) { _empty(); return; }

  // Estratégia 1: busca via ministerio_membros (join direto pelo pessoa_id — sem depender do array ministerios)
  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/ministerio_membros?pessoa_id=eq.${encodeURIComponent(pessoaId)}&status=eq.ativo&select=ministerios(id,nome,descricao,ativo)&limit=10`,
      { headers: apiHeaders() }
    );
    if (res.ok) {
      const rows = await res.json();
      const ministerios = (Array.isArray(rows) ? rows : [])
        .map(r => r.ministerios)
        .filter(Boolean);
      _render(ministerios);
      return;
    }
  } catch(_) {}

  // Estratégia 2: usa o array ministerios do membro, com validação de UUID
  const mins = USUARIO_ATUAL?.ministerios || [];
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validIds = mins.filter(id => id != null && UUID_RE.test(String(id).trim()));
  if (!validIds.length) { _empty(); return; }

  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/ministerios?id=in.(${validIds.join(",")})&select=nome,descricao,ativo&limit=10`,
      { headers: apiHeaders() }
    );
    if (res.ok) { _render(await res.json()); return; }
  } catch(_) {}

  // Fallback final: estado vazio sem expor erro no console
  _empty();
}

async function _areaCarregarAvisos() {
  const el = document.getElementById("area-dash-avisos");
  if (!el) return;
  el.innerHTML = `
    <div style="padding:10px 0;border-bottom:1px solid var(--bd1)">
      <div style="font-size:12px;font-weight:600;color:var(--tx1)">Bem-vindo à IPPenha!</div>
      <div style="font-size:11px;color:var(--tx2);margin-top:3px">Acompanhe os avisos e comunicados da sua igreja aqui.</div>
    </div>
    <div style="padding:10px 0">
      <div style="font-size:12px;font-weight:600;color:var(--tx1)">Cultos regulares</div>
      <div style="font-size:11px;color:var(--tx2);margin-top:3px">Domingos às 9h e 18h · Quarta-feira às 19h30</div>
    </div>`;
}

// Mantido para compatibilidade com o módulo de escalas de pregação (pastoral)
async function _areaCarregarAgenda() {
  _areaCarregarSemana();
}

window.area_dash_load = function() { _areaDashLoad(); };

// ── GO() OVERRIDE CONSOLIDADO ──────────────────

// Rotas de Membresia que exigem acesso pleno
const _MEMB_ROTAS_RESTRITAS = ["memb-dash","memb-com","memb-ncom","memb-vis","memb-bat","memb-prof","memb-trans","memb-hist"];

const _goBase = window.go; // captura a função original
window.go = async function(id) {
  // Guarda de rota: redireciona usuários sem acesso pleno à Membresia
  if (USUARIO_ATUAL && _MEMB_ROTAS_RESTRITAS.includes(id) && !_podeMembresiaPlena()) {
    id = "memb-aniv";
  }
  await _goBase(id);
  // Agenda
  if (id === "agenda-dash")           carregarAgendaDash();
  if (id === "agenda-ambientes")      carregarEspacos();
  if (id === "agenda-conflitos")      detectarConflitos();
  if (id === "agenda-historico")      carregarHistorico();
  if (id === "agenda-config")         carregarConfigAgenda();
  if (id === "agenda-solicitacoes") carregarSolicitacoesAgenda();
  if (id === "agenda-pormes") {
    const m = new Date().toLocaleString("pt-BR",{month:"long"});
    const sel = document.getElementById("ag-mes-sel");
    if(sel){ sel.value = m.charAt(0).toUpperCase()+m.slice(1); carregarMes(); }
  }
  if (id === "conselho-ind")  carregarIndicadores();
  if (id === "rel-ind")       carregarIndicadoresGerais();

  if (id === "config-permissoes")     renderMatrizPermissoes();
  if (id === "config-whatsapp")      { if(typeof WA_CFG!=="undefined") WA_CFG.refresh(); }
  if (id === "min-adm")              { if(typeof DEPT_ADM!=="undefined") DEPT_ADM.load(); }
  if (id === "geral")                 renderGeralDash();
  if (id === "area-dash")             _areaDashLoad();
  if (id.startsWith("cong"))          window._congSyncOnNav?.();
  if (id === "min-dash")              _aplicarPermissoesMinisterial();
  if (id === "min-min")               minMinLoad();
  if (id === "pastoral-dash")         { if(typeof ep_render==="function") ep_render(); pd_renderDash(); }
  if (id === "pastoral-preg")         ep_render();
  if (id === "pastoral-disp")         dp_loadDisps();
  if (id === "pastoral-pastores")     pd_renderPastores();
  if (id === "pastoral-historico")    pd_renderHistorico();
  if (id === "pastoral-relatorios")   pd_renderRelatorios();
};

// CRUMBs adicionais
CRUMB["agenda-solicitacoes"]  = ["Agenda","Solicitações de Agendamento","/ demandas de agendamento"];
CRUMB["agenda-ambientes"]     = ["Agenda","Por Espaço","/ uso de ambientes"];
CRUMB["agenda-confirmados"]   = ["Agenda","Confirmados","/ eventos confirmados"];
CRUMB["agenda-aprovacoes"]    = ["Agenda","Aprovações Pendentes","/ aguardando confirmação"];
CRUMB["agenda-recusados"]     = ["Agenda","Recusados","/ eventos cancelados"];
CRUMB["agenda-reagendamentos"]= ["Agenda","Reagendamentos","/ ajustes de data"];
CRUMB["agenda-conflitos"]     = ["Agenda","Conflitos","/ sobreposição de espaços"];
CRUMB["agenda-historico"]     = ["Agenda","Histórico","/ eventos passados"];
CRUMB["agenda-config"]        = ["Agenda","Configurações","/ espaços e organizadores"];
CRUMB["config-usuarios"]      = ["Configurações","Usuários e Acessos","/ perfis e permissões"];
CRUMB["config-permissoes"]    = ["Configurações","Permissões por Módulo","/ matriz de acesso"];
CRUMB["config-auditoria"]     = ["Configurações","Auditoria de Acessos","/ log completo"];
CRUMB["config-whatsapp"]      = ["Configurações","WhatsApp — Evolution API","/ status, módulos e templates"];
MN["config"] = "Configurações";
MN["area"]   = "Área do Membro";
CRUMB["area-dash"]   = ["Área do Membro","Painel Pessoal","/ bem-vindo"];
CRUMB["area-agenda"] = ["Área do Membro","Agenda","/ próximos compromissos"];
CRUMB["area-min"]    = ["Área do Membro","Meus Ministérios","/ serviço e escala"];
CRUMB["area-pgs"]    = ["Área do Membro","Meu PG","/ pequeno grupo"];
CRUMB["area-dem"]    = ["Área do Membro","Minhas Solicitações","/ pedidos e demandas"];
