
/* ── Shell views assíncronas ────────────── */
const _isPublicRoute = window.location.hash === "#pautas-reunioes";
const _shellReady = _isPublicRoute ? Promise.resolve() : Promise.all([
  fetch("views/login.html?v=6.31.6").then(r => r.ok ? r.text() : ""),
  fetch("views/sidebar.html?v=6.31.6").then(r => r.ok ? r.text() : ""),
  fetch("views/modals.html?v=6.31.6").then(r => r.ok ? r.text() : ""),
]).then(([loginHtml, sidebarHtml, modalsHtml]) => {
  document.body.insertAdjacentHTML("afterbegin", loginHtml);
  const login = document.getElementById("login-screen");
  if (login) login.insertAdjacentHTML("afterend", sidebarHtml);
  else document.body.insertAdjacentHTML("afterbegin", sidebarHtml);
  document.body.insertAdjacentHTML("beforeend", modalsHtml);
});

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
/* ── Página pública de pautas (sem login) ─────────────────────
   Acessível em: https://www.sipen.com.br/#pautas-reunioes       */
(function () {
  if (window.location.hash !== "#pautas-reunioes") return;

  const SUPA_URL = "https://erhwryfzpycahgsohhbh.supabase.co";
  const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaHdyeWZ6cHljYWhnc29oaGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjg2MTUsImV4cCI6MjA5MTg0NDYxNX0.T0hp90Bmufj6a3oUPq1vYcLiGx9YjyMaZiE38S0e3_8";

  const TIPO_LABEL = { ORDINARIA: "Ordinária", EXTRAORDINARIA: "Extraordinária", COMISSAO_EXECUTIVA: "Comissão Executiva" };
  const STATUS_CFG = {
    PENDENTE:   { label: "Pendente",   cor: "#888" },
    EM_ANALISE: { label: "Em análise", cor: "#d4a843" },
    APROVADO:   { label: "Aprovado",   cor: "#3aaa5c" },
    REJEITADO:  { label: "Rejeitado",  cor: "#e05555" },
    ADIADO:     { label: "Adiado",     cor: "#4a9cf5" },
    CONCLUIDO:  { label: "Concluído",  cor: "#8b6fd4" },
  };

  function fmtData(d) {
    if (!d) return "—";
    const [y, m, day] = d.split("T")[0].split("-");
    return `${day}/${m}/${y}`;
  }

  async function api(path) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
      headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function renderPublico() {
    document.body.style.cssText = "margin:0;padding:0;background:#0f1117;color:#e8e8ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh";

    document.body.innerHTML = `
      <div style="max-width:820px;margin:0 auto;padding:32px 20px 60px">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid #2a2d3a">
          <div style="width:36px;height:36px;background:rgba(42,181,192,.15);border:1.5px solid rgba(42,181,192,.35);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;color:#2ab5c0">◆</div>
          <div>
            <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.08em">IPPenha · Conselho e Governança</div>
            <div style="font-size:20px;font-weight:700;color:#e8e8ee">Pautas das Reuniões</div>
          </div>
        </div>
        <div id="pub-content"><div style="color:#555;font-size:13px;padding:40px 0;text-align:center">Carregando reuniões...</div></div>
      </div>`;

    const el = document.getElementById("pub-content");
    try {
      const [reunioes, pautas] = await Promise.all([
        api("conselho_reunioes?select=*&order=data_reuniao.desc&limit=100"),
        api("conselho_pautas?select=*&order=ordem.asc,created_at.asc&limit=1000"),
      ]);

      if (!reunioes.length) {
        el.innerHTML = `<div style="color:#555;font-size:13px;padding:40px 0;text-align:center">Nenhuma reunião registrada.</div>`;
        return;
      }

      const pautasPorReuniao = {};
      pautas.forEach(p => {
        if (!pautasPorReuniao[p.reuniao_id]) pautasPorReuniao[p.reuniao_id] = [];
        pautasPorReuniao[p.reuniao_id].push(p);
      });

      el.innerHTML = reunioes.map((r, ri) => {
        const tipo  = TIPO_LABEL[r.tipo] || r.tipo || "Reunião";
        const itens = pautasPorReuniao[r.id] || [];
        const uid   = `pub-r-${ri}`;
        const statusR = r.status === "REALIZADA" ? "#3aaa5c" : r.status === "CANCELADA" ? "#e05555" : "#4a9cf5";
        const statusL = r.status === "REALIZADA" ? "Realizada" : r.status === "CANCELADA" ? "Cancelada" : "Agendada";

        const pautasHtml = itens.length ? itens.map(p => {
          const sc = STATUS_CFG[p.status] || { label: p.status || "—", cor: "#888" };
          return `<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #1e2130">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:#e8e8ee">${p.titulo || "—"}</div>
              ${p.descricao ? `<div style="font-size:11.5px;color:#888;margin-top:3px">${p.descricao}</div>` : ""}
              ${p.categoria ? `<div style="font-size:10px;color:#555;margin-top:4px;text-transform:uppercase;letter-spacing:.06em">${p.categoria}</div>` : ""}
            </div>
            <span style="flex-shrink:0;font-size:10.5px;padding:3px 9px;border-radius:10px;border:1px solid ${sc.cor}44;color:${sc.cor};background:${sc.cor}11;white-space:nowrap">${sc.label}</span>
          </div>`;
        }).join("") : `<div style="color:#444;font-size:12px;padding:12px 0">Nenhum item de pauta registrado.</div>`;

        return `
          <div style="background:#161922;border:1px solid #2a2d3a;border-radius:10px;margin-bottom:16px;overflow:hidden">
            <div onclick="(function(el){el.style.display=el.style.display==='none'?'':'none'})(document.getElementById('${uid}'))"
              style="padding:16px 20px;cursor:pointer;display:flex;align-items:center;gap:12px;user-select:none">
              <div style="flex:1">
                <div style="font-size:13px;font-weight:700;color:#e8e8ee">${tipo} · ${fmtData(r.data_reuniao)}</div>
                ${r.local ? `<div style="font-size:11px;color:#666;margin-top:2px">${r.local}</div>` : ""}
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:10px;padding:2px 8px;border-radius:8px;border:1px solid ${statusR}44;color:${statusR};background:${statusR}11">${statusL}</span>
                <span style="font-size:10px;color:#555">${itens.length} item${itens.length !== 1 ? "s" : ""}</span>
                <span style="color:#444;font-size:14px">›</span>
              </div>
            </div>
            <div id="${uid}" style="display:none;padding:0 20px 16px;border-top:1px solid #1e2130">
              ${r.observacoes ? `<div style="font-size:12px;color:#666;padding:10px 0;border-bottom:1px solid #1e2130;font-style:italic">${r.observacoes}</div>` : ""}
              ${pautasHtml}
            </div>
          </div>`;
      }).join("");

    } catch (e) {
      el.innerHTML = `<div style="color:#e05555;font-size:12px;padding:40px 0;text-align:center">Erro ao carregar dados: ${e.message}</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", renderPublico);
})();

document.addEventListener("DOMContentLoaded", async () => {
  if (window.location.hash === "#pautas-reunioes") return;
  await _shellReady;
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
  if (nav) nav.querySelectorAll(".bni").forEach(el => {
    el.classList.toggle("on", el.getAttribute("onclick")?.includes(`'${tipo}'`));
  });
  _renderNomTabContent(tipo);
}

window.adminRhSec = function(btn, secId, loadKey) {
  const bnav = btn.closest('.bnav');
  if (bnav) bnav.querySelectorAll('.bni').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  ['rh-sec-colab','rh-sec-contrat','rh-sec-terc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === secId) ? '' : 'none';
  });
  const novoBt = document.getElementById('rh-btn-novo');
  if (novoBt) novoBt.style.display = secId === 'rh-sec-colab' ? '' : 'none';
  if (loadKey === 'MEMBROS') listarModulo('MEMBROS','rh-list');
};

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

function _renderNomAll() {
  const el = document.getElementById("nomeados-list-container");
  if (!el) return;
  if (!_nomeadosData) { el.innerHTML = `<p style="color:var(--tx4);font-size:12px;padding:20px">Carregando…</p>`; return; }
  const tipos = Object.keys(_nomeadosByTipo).sort();
  if (!tipos.length) { el.innerHTML = `<p style="color:var(--tx4);font-size:12px;padding:20px">Nenhum registro.</p>`; return; }
  let html = `<div style="display:flex;flex-direction:column;gap:20px">`;
  tipos.forEach(tipo => {
    const label = NOM_TIPO_LABEL[tipo] || tipo;
    const cor   = NOM_TIPO_COR[tipo]   || "var(--sky)";
    const byOrgao = _nomeadosByTipo[tipo] || {};
    const orgaos  = Object.keys(byOrgao).sort();
    if (!orgaos.length) return;
    html += `<div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;padding:0 2px">${label}</div><div style="display:flex;flex-direction:column;gap:2px">`;
    orgaos.forEach((orgao, i) => {
      const pessoas = byOrgao[orgao];
      const uid = `nom-${tipo}-${i}`;
      html += `<div style="border-radius:8px;overflow:hidden;border:1px solid var(--bd1)">
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
        html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px 8px 32px;${pi < pessoas.length-1 ? "border-bottom:1px solid rgba(255,255,255,0.04)" : ""}">
            <span style="font-size:12px;color:var(--tx1)">${p.nome}${sub}${obs}</span>
            <span style="font-size:11px;color:${cor};font-weight:600;white-space:nowrap;margin-left:12px">${p.cargo || ""}</span>
          </div>`;
      });
      html += `</div></div>`;
    });
    html += `</div></div>`;
  });
  html += `</div>`;
  el.innerHTML = html;
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
    _renderNomAll();
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
