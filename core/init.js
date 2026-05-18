
/* ── Shell views síncronas ───────────────── */
(function() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "views/login.html", false);
  xhr.send(null);
  if (xhr.status >= 200 && xhr.status < 300)
    document.body.insertAdjacentHTML("afterbegin", xhr.responseText);
})();

(function() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "views/sidebar.html", false);
  xhr.send(null);
  if (xhr.status >= 200 && xhr.status < 300) {
    var login = document.getElementById("login-screen");
    if (login) login.insertAdjacentHTML("afterend", xhr.responseText);
    else document.body.insertAdjacentHTML("afterbegin", xhr.responseText);
  }
})();

(function() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "views/modals.html?v=6.30.3", false);
  xhr.send(null);
  if (xhr.status >= 200 && xhr.status < 300)
    document.body.insertAdjacentHTML("beforeend", xhr.responseText);
})();

/* ── Sidebar mobile toggle ───────────────── */
function sbToggle(){
  document.querySelector('.sb').classList.toggle('sb-open');
  document.getElementById('sb-backdrop').classList.toggle('sb-open');
}
function sbClose(){
  document.querySelector('.sb').classList.remove('sb-open');
  document.getElementById('sb-backdrop').classList.remove('sb-open');
}
// ── Prefixo de view → módulo (para verificação de permissão) ──────────
const VIEW_MODULO_PREFIX = {
  "admin":    "Administrativo",
  "fin":      "Financeiro",
  "jur":      "Jurídico",
  "pastoral": "Pastoral",
  "conselho": "Conselho/Gov.",
  "atas":     "Conselho/Gov.",
  "diac":     "Conselho/Gov.",
  "min":      "Departamentos",
  "agenda":   "Agenda",
  "pgs":      "Pequenos Grupos",
  "infra":    "Infraestrutura e Conservação",
  "dem":      "Demandas",
  "rel":      "Relatórios",
  "memb":     "Membresia",
  "config":   "Configurações",
  "area":     "Área do Membro",
  "diac":     "Junta Diaconal",
  "cong":     "Congregações",
  "com":      "Comunicação",
  "eve":      "Eventos",
};

function _getModuloForView(id) {
  for (const [prefix, modulo] of Object.entries(VIEW_MODULO_PREFIX)) {
    if (id === prefix || id.startsWith(prefix + "-")) return modulo;
  }
  return null; // views livres (geral, cong, etc.)
}

// ── go() final: fecha sidebar mobile + verifica permissão ─────────────
const _goOrig = window.go;
window.go = async function(id){
  const modulo = _getModuloForView(id);
  if (modulo && typeof podeAcessar === "function" && !podeAcessar(modulo)) {
    T("Acesso restrito ✖", "Você não tem permissão para acessar: " + modulo);
    return;
  }
  sbClose();
  if(_goOrig) await _goOrig(id);
};
document.addEventListener("DOMContentLoaded", () => {
  _ensureViewLoaded("geral").then(() => go("geral"));

  document.querySelectorAll(".bf").forEach(b => {
    const w = b.style.width; b.style.width = "0";
    setTimeout(() => { b.style.width = w; }, 450);
  });

  // Restaura sessão via Supabase Auth (persiste entre recargas)
  (async () => {
    try {
      const sb = getSupabase();

      // Listener de estado de autenticação
      sb.auth.onAuthStateChange(async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          abrirModalNovaSenha();
          return;
        }
        // Token expirado / sessão encerrada externamente → volta para login
        if (event === "SIGNED_OUT" && USUARIO_ATUAL) {
          usuarioLogado = null;
          USUARIO_ATUAL = null;
          permissoesUsuario = {};
          try { sessionStorage.removeItem("sipen_route"); } catch(_) {}
          document.getElementById("login-screen").style.display = "flex";
          document.getElementById("login-password").value = "";
          document.getElementById("login-err").textContent = "Sessão encerrada. Faça login novamente.";
        }
      });

      const { data: { session } } = await sb.auth.getSession();
      if (session?.user?.id) {
        await carregarUsuarioLogado(session.user.id);
      }
      // Se não há sessão, login-screen permanece visível (padrão)
    } catch(e) {
      console.warn("Erro ao restaurar sessão:", e);
    }
  })();
});

/* ── MODAL NOVA SENHA (fluxo recovery) ──────── */
function abrirModalNovaSenha() {
  document.getElementById("login-screen").style.display = "none";
  const modal = document.createElement("div");
  modal.id = "recovery-modal";
  modal.style.cssText = "position:fixed;inset:0;background:var(--bg);display:flex;align-items:center;justify-content:center;z-index:400";
  modal.innerHTML = `
    <div style="width:min(380px,92vw);background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;padding:28px 24px;display:flex;flex-direction:column;gap:16px">
      <div style="font-size:16px;font-weight:700;color:var(--tx1)">🔑 Definir nova senha</div>
      <div style="font-size:12px;color:var(--tx3)">Digite e confirme sua nova senha de acesso ao SIPEN.</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <label style="font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Nova senha</label>
        <input id="rec-senha1" type="password" placeholder="••••••••" style="background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 11px;outline:none;width:100%">
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <label style="font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Confirmar senha</label>
        <input id="rec-senha2" type="password" placeholder="••••••••" style="background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 11px;outline:none;width:100%">
      </div>
      <div id="rec-err" style="font-size:11px;color:var(--rose);min-height:14px"></div>
      <button onclick="salvarNovaSenhaRecovery()" style="background:var(--gr);border:none;border-radius:8px;padding:11px;color:#fff;font-size:13px;font-weight:700;cursor:pointer">Salvar nova senha</button>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("rec-senha1").focus();
}

async function salvarNovaSenhaRecovery() {
  const s1 = document.getElementById("rec-senha1").value;
  const s2 = document.getElementById("rec-senha2").value;
  const err = document.getElementById("rec-err");
  if (s1.length < 6) { err.textContent = "A senha deve ter ao menos 6 caracteres."; return; }
  if (s1 !== s2)     { err.textContent = "As senhas não coincidem."; return; }
  err.textContent = "";
  try {
    const { error } = await getSupabase().auth.updateUser({ password: s1 });
    if (error) { err.textContent = "Erro: " + error.message; return; }
    document.getElementById("recovery-modal")?.remove();
    T("Senha atualizada!", "Sua nova senha foi salva. Faça login normalmente.");
    document.getElementById("login-screen").style.display = "flex";
  } catch(e) { err.textContent = e.message; }
}

/* ── HELPER: fetch com filtros Supabase ───── */
async function apiFetchTable(tableName, params = {}) {
  let qs = "select=*";
  for (const [k, v] of Object.entries(params)) {
    if (k === "_order") qs += `&order=${v}`;
    else if (k === "_limit") qs += `&limit=${v}`;
    else qs += `&${encodeURIComponent(k)}=eq.${encodeURIComponent(v)}`;
  }
  const res = await fetch(`${apiBaseUrl()}/rest/v1/${tableName}?${qs}`, {
    method: "GET", headers: apiHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(data.message || "Resposta inválida");
  return data;
}

/* ── CONSELHO DASHBOARD ─────────────────────── */
async function carregarConselhoKpis() {
  const sv = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  try {
    const [nomeados, oficiais, contratados] = await Promise.all([
      apiFetchTable("v_nomeados", { _limit: 2000 }).catch(() => []),
      apiFetchTable("v_oficiais", { _limit: 500 }).catch(() => []),
      apiFetchTable("v_contratados", { _limit: 200 }).catch(() => [])
    ]);
    const nomAtivos = nomeados.filter(r => !r.status || r.status === "ativo");
    const ordAtivos = oficiais.filter(r => r.status === "ativo" || r.status === "especial");
    const contAtivos = contratados.filter(r => r.status === "ativo");
    const hoje = new Date();
    const lim90 = new Date(hoje.getTime() + 90 * 24 * 60 * 60 * 1000);
    const mandVencer = ordAtivos.filter(r => {
      if (!r.fim_mandato) return false;
      const d = new Date(r.fim_mandato);
      return d >= hoje && d <= lim90;
    });
    sv("cdash-kpi-nom", nomAtivos.length);
    sv("cdash-kpi-nom-d", `${Object.keys(nomAtivos.reduce((a,r)=>{a[r.orgao_tipo||"?"]++;return a;},{})).length} categorias`);
    sv("cdash-kpi-ord", ordAtivos.length);
    sv("cdash-kpi-ord-d", `${ordAtivos.filter(r=>r.cargo==="pastor").length} past. · ${ordAtivos.filter(r=>r.cargo==="presbitero").length} presb. · ${ordAtivos.filter(r=>r.cargo==="diacono").length} diác.`);
    sv("cdash-kpi-mand", mandVencer.length);
    sv("cdash-kpi-mand-d", mandVencer.length > 0 ? `⚠ ${mandVencer.length} próximos 90 dias` : "nenhum nos próximos 90 dias");
    sv("cdash-kpi-cont", contAtivos.length);
    sv("cdash-kpi-cont-d", `${contAtivos.filter(r=>r.tipo_vinculo==="terceirizado").length} terc. · ${contAtivos.filter(r=>r.tipo_vinculo!=="terceirizado").length} diretos`);
  } catch(e) { console.warn("carregarConselhoKpis:", e); }
}
VIEW_AUTOLOAD["conselho-dash"] = { fn: () => carregarConselhoKpis() };

/* ── OFICIAIS ORDENADOS ────────────────────── */
async function renderOficiaisOrdenados() {
  const setV = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  try {
    const rows = await apiFetchTable("v_oficiais", { _order: "fim_mandato.asc", _limit: 500 });
    const ativos   = rows.filter(r => r.status === "ativo" || r.status === "especial");
    const pastores = ativos.filter(r => r.cargo === "pastor");
    const presbs   = ativos.filter(r => r.cargo === "presbitero");
    const diac     = ativos.filter(r => r.cargo === "diacono");

    setV("ord-kpi-total",   pastores.length + presbs.length + diac.length);
    setV("ord-kpi-detalhe", `${pastores.length} pastor · ${presbs.length} presbíteros · ${diac.length} diáconos`);
    setV("ord-kpi-pastores", pastores.length);
    setV("ord-kpi-presbs",   presbs.length);
    setV("ord-kpi-diac",     diac.length);
    setV("ord-kpi-diac-d",   "quadro oficial AGE 28/04/2024");

    const fmtDate = d => d ? d.split("-").reverse().join("/") : "—";
    const fmtPill = s => s === "ativo" ? `<span class="pill pd">Ativo</span>` : `<span class="pill pz">${s}</span>`;
    const fmtEmer = v => v ? `<span style="font-size:9px;background:rgba(212,168,67,0.15);color:var(--gold);border:1px solid rgba(212,168,67,0.3);border-radius:3px;padding:1px 5px">${v} vts</span>` : "—";
    const fmtMand = n => n ? `<span style="font-size:9px;color:var(--tx3)">${n}º</span>` : "—";

    const makePastoresTable = list => {
      if (!list.length) return `<p style="color:var(--tx4);font-size:12px;padding:8px">Nenhum registro.</p>`;
      return `<table class="tbl"><thead><tr><th>Nome</th><th>Posse</th><th>Ata</th><th>Obs</th><th>Status</th></tr></thead><tbody>` +
        list.map(r => `<tr><td class="tdp">${r.nome}</td><td class="tdc mono">${fmtDate(r.posse)}</td><td class="tdc mono">${r.ata||"—"}</td><td class="tdc" style="font-size:10px;color:var(--tx3)">${r.obs||"—"}</td><td>${fmtPill(r.status)}</td></tr>`).join("") +
        `</tbody></table>`;
    };

    const makeGroupedTable = (list, labelSingular, labelPlural) => {
      if (!list.length) return `<p style="color:var(--tx4);font-size:12px;padding:8px">Nenhum registro.</p>`;
      const groups = {};
      for (const r of list) {
        const yr = r.fim_mandato ? r.fim_mandato.substring(0,4) : "—";
        if (!groups[yr]) groups[yr] = [];
        groups[yr].push(r);
      }
      const anoAtual = new Date().getFullYear();
      const bgLbl = yr => parseInt(yr) <= anoAtual + 1
        ? "rgba(224,138,42,0.06);color:var(--amber)"
        : "rgba(58,170,92,0.05);color:var(--gr)";
      let html = `<table class="tbl"><thead><tr><th>Nome</th><th>Posse</th><th>Fim Mandato</th><th>Ata</th><th>Mand.</th><th>Emerência</th><th>Obs</th><th>Status</th></tr></thead><tbody>`;
      for (const [yr, grp] of Object.entries(groups).sort()) {
        const lbl = grp.length > 1 ? labelPlural : labelSingular;
        html += `<tr><td colspan="8" style="background:${bgLbl(yr)};font-size:9.5px;text-transform:uppercase;letter-spacing:.1em;padding:6px 10px;font-weight:700">Mandato até ${yr} — ${grp.length} ${lbl}</td></tr>`;
        grp.forEach(r => {
          html += `<tr><td class="tdp">${r.nome}</td><td class="tdc mono">${fmtDate(r.posse)}</td><td class="tdc mono">${fmtDate(r.fim_mandato)}</td><td class="tdc mono">${r.ata||"—"}</td><td class="tdc" style="text-align:center">${fmtMand(r.mandato_numero)}</td><td class="tdc" style="text-align:center">${fmtEmer(r.emerencia_votos)}</td><td class="tdc" style="font-size:10px;color:var(--tx3)">${r.obs||"—"}</td><td>${fmtPill(r.status)}</td></tr>`;
        });
      }
      html += `</tbody></table>`;
      return html;
    };

    const pEl = document.getElementById("ord-pastores-list");
    const rEl = document.getElementById("ord-presbs-list");
    const dEl = document.getElementById("ord-diac-list");
    if (pEl) pEl.innerHTML = makePastoresTable(pastores);
    if (rEl) rEl.innerHTML = makeGroupedTable(presbs, "presbítero", "presbíteros");
    if (dEl) dEl.innerHTML = makeGroupedTable(diac, "diácono", "diáconos");
  } catch(e) {
    ["ord-pastores-list","ord-presbs-list","ord-diac-list"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<p style="color:var(--rose);font-size:12px;padding:8px">Erro: ${e.message}</p>`;
    });
  }
}
VIEW_AUTOLOAD["conselho-ordenados"] = { fn: () => renderOficiaisOrdenados() };

/* ── DIÁCONOS ───────────────────────────────── */
async function renderDiaconos() {
  const setV = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const el = document.getElementById("diac-diaconos-list");
  try {
    const rows = await apiFetchTable("v_oficiais", { cargo: "diacono", _order: "fim_mandato.asc", _limit: 500 });
    const ativos    = rows.filter(r => r.status === "ativo");
    const especiais = rows.filter(r => r.status !== "ativo");
    const ano2026   = ativos.filter(r => r.fim_mandato && r.fim_mandato.startsWith("2026"));
    const outros    = ativos.filter(r => !r.fim_mandato || !r.fim_mandato.startsWith("2026"));

    setV("diac-kpi-ativos", ativos.length);
    setV("diac-kpi-2026", ano2026.length);
    setV("diac-kpi-outros", outros.length);
    setV("diac-kpi-especiais", especiais.length);

    const fmtDate = d => d ? d.split("-").reverse().join("/") : "—";
    const pillStatus = s => s === "ativo"
      ? `<span class="pill pd">Ativo</span>`
      : s === "encerrado" ? `<span class="pill pz">Encerrado</span>`
      : `<span class="pill pv">${s}</span>`;
    const fmtEmer = v => v ? `<span style="font-size:9px;background:rgba(212,168,67,0.15);color:var(--gold);border:1px solid rgba(212,168,67,0.3);border-radius:3px;padding:1px 5px">${v} vts</span>` : "";
    const fmtMand = n => n ? `<span style="font-size:9px;color:var(--tx3)">${n}º</span>` : "—";

    const groups = {};
    for (const r of rows) {
      const yr = r.fim_mandato ? r.fim_mandato.substring(0,4) : "especial";
      if (!groups[yr]) groups[yr] = [];
      groups[yr].push(r);
    }

    let html = `<table class="tbl"><thead><tr><th>Nome</th><th>Posse</th><th>Fim Mandato</th><th>Ata</th><th>Mand.</th><th>Emerência</th><th>Obs.</th><th>Status</th></tr></thead><tbody>`;
    const labelColor = yr => yr === "2026" ? "rgba(224,138,42,0.06);color:var(--amber)" : yr === "especial" ? "rgba(255,255,255,0.02);color:var(--tx4)" : "rgba(58,170,92,0.05);color:var(--gr)";
    for (const [yr, list] of Object.entries(groups).sort()) {
      const label = yr === "especial" ? `Situações especiais / encerrados — ${list.length}` : `Mandato até ${yr} — ${list.length} diácono${list.length>1?'s':''}`;
      html += `<tr><td colspan="8" style="background:${labelColor(yr)};font-size:9.5px;text-transform:uppercase;letter-spacing:.1em;padding:6px 10px;font-weight:700">${label}</td></tr>`;
      list.forEach(r => {
        html += `<tr><td class="tdp" style="${r.status!=='ativo'?'color:var(--tx3)':''}">${r.nome}</td><td class="tdc mono">${fmtDate(r.posse)}</td><td class="tdc mono">${fmtDate(r.fim_mandato)}</td><td class="tdc mono">${r.ata||"—"}</td><td class="tdc" style="text-align:center">${fmtMand(r.mandato_numero)}</td><td class="tdc" style="text-align:center">${fmtEmer(r.emerencia_votos)}</td><td class="tdc" style="font-size:10px;color:var(--tx3)">${r.obs||"—"}</td><td>${pillStatus(r.status)}</td></tr>`;
      });
    }
    html += `</tbody></table>`;
    if (el) el.innerHTML = html;
  } catch(e) {
    if (el) el.innerHTML = `<p style="color:var(--rose);font-size:12px;padding:8px">Erro: ${e.message}</p>`;
  }
}
VIEW_AUTOLOAD["diac-diaconos"] = { fn: () => renderDiaconos() };

/* ── NOMEADOS ──────────────────────────────── */
let _nomeadosData = null;
let _nomeadosByTipo = {};
let _nomTabAtivo = "governo";

const NOM_TIPO_LABEL = { governo:"Governo", comissao:"Comissões", ministerio:"Ministérios", sociedade:"Sociedades", grupo:"Grupos", congregacao:"Congregações" };
const NOM_TIPO_COR   = { governo:"var(--sky)", comissao:"var(--violet)", ministerio:"var(--teal)", sociedade:"var(--gold)", grupo:"var(--amber)", congregacao:"var(--gr)" };
const NOM_TIPO_BG    = { governo:"rgba(74,156,245,0.12)", comissao:"rgba(139,111,212,0.12)", ministerio:"rgba(42,181,192,0.12)", sociedade:"rgba(212,168,67,0.12)", grupo:"rgba(224,138,42,0.12)", congregacao:"rgba(58,170,92,0.12)" };

function switchNomTab(tipo) {
  _nomTabAtivo = tipo;
  const nav = document.getElementById("nom-inav");
  if (nav) nav.querySelectorAll(".ini").forEach(el => {
    el.classList.toggle("on", el.getAttribute("onclick")?.includes(`'${tipo}'`));
  });
  _renderNomTabContent(tipo);
}

function toggleNomOrgao(uid) {
  const body  = document.getElementById(uid + "-body");
  const chev  = document.getElementById(uid + "-chev");
  if (!body) return;
  const isOpen = body.style.display !== "none";
  // fecha todos
  document.querySelectorAll(".nom-orgao-body").forEach(e => e.style.display = "none");
  document.querySelectorAll(".nom-orgao-chev").forEach(e => e.textContent = "›");
  // abre o clicado (toggle)
  if (!isOpen) {
    body.style.display = "block";
    if (chev) chev.textContent = "⌄";
  }
}

function _renderNomTabContent(tipo) {
  const el = document.getElementById("nomeados-list-container");
  if (!el) return;
  if (!_nomeadosData) { el.innerHTML = `<p style="color:var(--tx4);font-size:12px;padding:20px">Carregando…</p>`; return; }

  const byOrgao = _nomeadosByTipo[tipo] || {};
  const orgaos  = Object.keys(byOrgao).sort();
  const cor     = NOM_TIPO_COR[tipo] || "var(--sky)";

  if (!orgaos.length) {
    el.innerHTML = `<p style="color:var(--tx4);font-size:12px;padding:20px">Nenhum registro nesta categoria.</p>`;
    return;
  }

  let html = `<div style="display:flex;flex-direction:column;gap:2px">`;

  orgaos.forEach((orgao, i) => {
    const pessoas = byOrgao[orgao];
    const uid = `nom-${tipo}-${i}`;
    html += `
      <div style="border-radius:8px;overflow:hidden;border:1px solid var(--bd1)">
        <div onclick="toggleNomOrgao('${uid}')" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:11px 14px;background:var(--bg-surface);user-select:none;transition:background .15s" onmouseover="this.style.background='var(--bg-surface2)'" onmouseout="this.style.background='var(--bg-surface)'">
          <div style="width:8px;height:8px;border-radius:50%;background:${cor};flex-shrink:0"></div>
          <span style="flex:1;font-size:13px;font-weight:600;color:var(--tx1)">${orgao}</span>
          <span style="font-size:10px;color:var(--tx3);margin-right:6px">${pessoas.length} pessoa${pessoas.length !== 1 ? "s" : ""}</span>
          <span id="${uid}-chev" class="nom-orgao-chev" style="color:var(--tx4);font-size:14px;width:12px;text-align:center;transition:all .2s">›</span>
        </div>
        <div id="${uid}-body" class="nom-orgao-body" style="display:none;border-top:1px solid var(--bd1)">`;

    pessoas.forEach((p, pi) => {
      const sub = p.suborgao ? ` <span style="font-size:10px;color:var(--tx4)">(${p.suborgao})</span>` : "";
      const obs = p.obs ? ` <span style="font-size:10px;color:var(--tx3);font-style:italic">· ${p.obs}</span>` : "";
      html += `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px 8px 32px;${pi < pessoas.length-1 ? "border-bottom:1px solid rgba(255,255,255,0.04)" : ""}">
            <span style="font-size:12px;color:var(--tx1)">${p.nome}${sub}${obs}</span>
            <span style="font-size:11px;color:${cor};font-weight:600;white-space:nowrap;margin-left:12px">${p.cargo || ""}</span>
          </div>`;
    });

    html += `</div></div>`;
  });

  html += `</div>`;
  el.innerHTML = html;
}

async function renderNomeados() {
  const setV = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const el = document.getElementById("nomeados-list-container");
  if (el) el.innerHTML = `<p style="color:var(--tx3);font-size:11px;padding:20px">Carregando…</p>`;
  try {
    const all  = await apiFetchTable("v_nomeados", { _order: "orgao.asc,nome.asc", _limit: 1000 });
    const rows = all.filter(r => !r.status || r.status === "ativo");
    _nomeadosData = rows;
    _nomeadosByTipo = {};
    for (const r of rows) {
      const t = r.orgao_tipo || "outros";
      if (!_nomeadosByTipo[t]) _nomeadosByTipo[t] = {};
      const o = r.orgao || "—";
      if (!_nomeadosByTipo[t][o]) _nomeadosByTipo[t][o] = [];
      _nomeadosByTipo[t][o].push(r);
    }
    setV("nom-kpi-total", rows.length);
    setV("nom-kpi-orgaos", `${Object.keys(_nomeadosByTipo).length} categorias`);
    setV("nom-kpi-min",  rows.filter(r => r.orgao_tipo === "ministerio").length);
    setV("nom-kpi-gov",  rows.filter(r => r.orgao_tipo === "governo" || r.orgao_tipo === "comissao").length);
    setV("nom-kpi-soc",  rows.filter(r => r.orgao_tipo === "sociedade" || r.orgao_tipo === "grupo").length);
    switchNomTab(_nomTabAtivo);
  } catch(e) {
    if (el) el.innerHTML = `<p style="color:var(--rose);font-size:12px;padding:20px">Erro: ${e.message}</p>`;
  }
}
VIEW_AUTOLOAD["conselho-nomeados"] = { fn: () => renderNomeados() };

/* ── SEMINARISTAS ──────────────────────────── */
async function renderSeminaristas() {
  const setV = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const el = document.getElementById("seminaristas-list-container");
  try {
    const rows = await apiFetchTable("v_seminaristas", { _order: "nome.asc", _limit: 200 });
    const ativos  = rows.filter(r => r.status === "ativo");
    const estagio = ativos.filter(r => r.tem_estagio);
    const concl   = rows.filter(r => r.status === "concluido");
    const semin   = new Set(rows.map(r => r.seminario).filter(Boolean)).size;

    setV("sem-kpi-total", ativos.length);
    setV("sem-kpi-estagio", estagio.length);
    setV("sem-kpi-concl", concl.length);
    setV("sem-kpi-semin", semin);

    const fmtPill = s => s === "ativo" ? `<span class="pill pd">Ativo</span>` : s === "concluido" ? `<span class="pill pp">Concluído</span>` : `<span class="pill pz">${s}</span>`;

    if (!rows.length) { if (el) el.innerHTML = `<p style="color:var(--tx4);font-size:12px;padding:8px">Nenhum registro.</p>`; return; }
    let html = `<table class="tbl"><thead><tr><th>Nome</th><th>Seminário</th><th>Curso</th><th>Ano</th><th>Supervisor</th><th>Estágio</th><th>Status</th></tr></thead><tbody>`;
    rows.forEach(r => {
      const est = r.tem_estagio ? `<span class="pill pd">Sim · ${r.area_estagio||""}</span>` : `<span class="pill pz">Não</span>`;
      html += `<tr><td class="tdp">${r.nome}</td><td class="tdc">${r.seminario||"—"}</td><td>${r.curso||"—"}</td><td class="tdc mono">${r.ano_curso||"—"}</td><td>${r.supervisor||"—"}</td><td>${est}</td><td>${fmtPill(r.status)}</td></tr>`;
    });
    html += `</tbody></table>`;
    if (el) el.innerHTML = html;
  } catch(e) {
    if (el) el.innerHTML = `<p style="color:var(--rose);font-size:12px;padding:8px">Erro: ${e.message}</p>`;
  }
}
VIEW_AUTOLOAD["conselho-seminaristas"] = { fn: () => renderSeminaristas() };

/* ── CONTRATADOS ────────────────────────────── */
async function renderContratados() {
  const setV = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const el = document.getElementById("contratados-list-container");
  try {
    const rows = await apiFetchTable("v_contratados", { _order: "nome.asc", _limit: 200 });
    const ativos = rows.filter(r => r.status === "ativo");
    const terc   = ativos.filter(r => r.tipo_vinculo === "terceirizado");
    const dir    = ativos.filter(r => r.tipo_vinculo !== "terceirizado");
    const vig    = ativos.length;

    setV("cont-kpi-total", ativos.length);
    setV("cont-kpi-detalhe", `${terc.length} terc. · ${dir.length} diretos`);
    setV("cont-kpi-terc", terc.length);
    setV("cont-kpi-dir", dir.length);
    setV("cont-kpi-vig", vig);

    const pillCat = c => {
      const m = { administrativo:"pv", manutencao:"po", seguranca:"pz", limpeza:"pz", pastoral:"pn" };
      return `<span class="pill ${m[c?.toLowerCase()]||'pz'}">${c||"—"}</span>`;
    };
    const fmtPill = s => s === "ativo" ? `<span class="pill pd">Ativo</span>` : `<span class="pill pz">${s}</span>`;
    const fmtDate = d => d ? d.split("-").reverse().join("/") : "—";

    if (!rows.length) { if (el) el.innerHTML = `<p style="color:var(--tx4);font-size:12px;padding:8px">Nenhum registro.</p>`; return; }
    let html = `<table class="tbl"><thead><tr><th>Nome / Empresa</th><th>Função</th><th>Categoria</th><th>Tipo de Vínculo</th><th>Área Atendida</th><th>Desde</th><th>Até</th><th>Status</th></tr></thead><tbody>`;
    rows.forEach(r => {
      html += `<tr><td class="tdp">${r.nome}${r.empresa?` <span style="font-size:10px;color:var(--tx3)">(${r.empresa})</span>`:""}</td><td>${r.funcao||"—"}</td><td>${pillCat(r.categoria)}</td><td class="tdc">${r.tipo_vinculo||"—"}</td><td class="tdc">${r.area_atendida||"—"}</td><td class="tdc mono">${fmtDate(r.contrato_desde)}</td><td class="tdc mono">${fmtDate(r.contrato_ate)}</td><td>${fmtPill(r.status)}</td></tr>`;
    });
    html += `</tbody></table>`;
    if (el) el.innerHTML = html;
  } catch(e) {
    if (el) el.innerHTML = `<p style="color:var(--rose);font-size:12px;padding:8px">Erro: ${e.message}</p>`;
  }
}
VIEW_AUTOLOAD["conselho-contratados"] = { fn: () => renderContratados() };
