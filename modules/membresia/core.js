/* ══════════════════════════════════════════════════════
   MÓDULO MEMBRESIA — funções dedicadas v6.30.3
══════════════════════════════════════════════════════ */

let _membCache = [];    // cache de todos os membros
let _visCache  = [];    // cache de todos os visitantes

function _podeEditarMembresia() {
  if (!USUARIO_ATUAL) return false;
  if (USUARIO_ATUAL.perfil === "ADMINISTRADOR_GERAL") return true;
  const nivel = (permissoesUsuario || {})["MEMBRESIA"] || "SEM_ACESSO";
  return nivel === "COMPLETO" || nivel === "EDICAO";
}

function _podeExcluirMembresia() {
  return USUARIO_ATUAL?.perfil === "ADMINISTRADOR_GERAL";
}

/* Cores e labels de status de membro */
const MEMB_STATUS = {
  ativo:        { bg:"rgba(58,170,92,0.15)",  color:"var(--gr)",    label:"Ativo" },
  inativo:      { bg:"rgba(122,132,144,0.2)", color:"var(--tx3)",   label:"Inativo" },
  transferido:  { bg:"rgba(74,156,245,0.15)", color:"var(--blue)",  label:"Transferido" },
  falecido:     { bg:"rgba(62,67,73,0.5)",    color:"var(--tx3)",   label:"Falecido" },
  disciplinado: { bg:"rgba(224,85,85,0.15)",  color:"var(--rose)",  label:"Disciplinado" },
  afastado:     { bg:"rgba(212,168,67,0.15)", color:"var(--gold)",  label:"Afastado" },
};

/* Labels de tipo de ingresso */
const INGRESSO_ICON = {
  "batismo":          "💧",
  "transferência":    "🔄",
  "profissão de fé":  "✝️",
  "restauração":      "🌿",
  "outro":            "•",
};

/* Renderiza tabela profissional de membros */
function renderMembrosTable(rows, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!rows || !rows.length) {
    el.innerHTML = `<div style="text-align:center;padding:32px 0;color:var(--tx3)">
      <div style="font-size:26px;margin-bottom:8px">📭</div>
      <div style="font-size:12px">Nenhum membro encontrado</div>
    </div>`;
    return;
  }

  const fmtDate = d => {
    if (!d) return "—";
    try { return new Date(d + "T00:00:00").toLocaleDateString("pt-BR"); } catch { return d; }
  };
  const initials = n => (n || "?").split(" ").filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");

  el.innerHTML = `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:11.5px">
        <thead>
          <tr style="background:var(--bg-surface);border-bottom:2px solid var(--gr)">
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700;min-width:180px">Nome</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Status</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700;white-space:nowrap">Contato</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Nascimento</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Email</th>
            <th style="text-align:right;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${rows.slice(0, 150).map(row => {
            const sc = MEMB_STATUS[row.status] || MEMB_STATUS.inativo;
            const ini = initials(row.nome);
            const tel = row.telefone || row.celular || "";
            return `<tr style="border-bottom:1px solid var(--bd1);transition:background .12s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
              <td style="padding:8px 10px">
                <div style="display:flex;align-items:center;gap:9px">
                  <div style="width:30px;height:30px;border-radius:50%;background:var(--bg-surface);border:1px solid var(--bd2);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--tx2);flex-shrink:0">${escapeHtml(ini)}</div>
                  <div style="min-width:0">
                    <div style="font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">${nomePropio(row.nome) || "—"}</div>
                  </div>
                </div>
              </td>
              <td style="padding:8px 10px;white-space:nowrap">
                <span style="background:${sc.bg};color:${sc.color};border-radius:5px;padding:2px 9px;font-size:10px;font-weight:600">${sc.label}</span>
              </td>
              <td style="padding:8px 10px;color:var(--tx2);font-size:11px;white-space:nowrap">${tel ? escapeHtml(tel) : "—"}</td>
              <td style="padding:8px 10px;color:var(--tx2);font-size:11px;white-space:nowrap">${fmtDate(row.data_nascimento)}</td>
              <td style="padding:8px 10px;color:var(--tx2);font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${row.email ? escapeHtml(row.email) : "—"}</td>
              <td style="padding:8px 10px;text-align:right;white-space:nowrap">
                ${_podeEditarMembresia() ? `<button onclick='openNovoMembro("${escapeHtml(row.id || "")}")' style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:4px;color:var(--tx2);font-size:10px;padding:3px 8px;cursor:pointer;margin-right:4px" title="Editar">✏️</button>` : ""}
                ${_podeExcluirMembresia() ? `<button onclick='deletarRegistro("MEMBROS","${escapeHtml(row.id || "")}")' style="background:rgba(224,85,85,0.08);border:1px solid rgba(224,85,85,0.18);border-radius:4px;color:var(--rose);font-size:10px;padding:3px 8px;cursor:pointer" title="Remover">🗑</button>` : ""}
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
      ${rows.length > 150 ? `<div style="font-size:11px;color:var(--tx3);text-align:center;padding:10px;border-top:1px solid var(--bd1)">Exibindo 150 de ${rows.length} resultados — refine a busca para ver mais.</div>` : ""}
    </div>`;
}

/* Renderiza tabela de visitantes */
function renderVisitantesTable(rows, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!rows || !rows.length) {
    el.innerHTML = `<div style="text-align:center;padding:32px 0;color:var(--tx3)"><div style="font-size:26px;margin-bottom:8px">📭</div><div style="font-size:12px">Nenhum visitante encontrado</div></div>`;
    return;
  }
  const fmtDate = d => { if (!d) return "—"; try { return new Date(d + "T00:00:00").toLocaleDateString("pt-BR"); } catch { return d; } };
  const initials = n => (n || "?").split(" ").filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");
  const NIVEL_COLOR = { alto:"rgba(212,168,67,0.15)","alto-cor":"var(--gold)", convertido:"rgba(58,170,92,0.15)","convertido-cor":"var(--gr)", médio:"rgba(74,156,245,0.1)","médio-cor":"var(--blue)", baixo:"rgba(122,132,144,0.15)","baixo-cor":"var(--tx3)" };

  el.innerHTML = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11.5px">
    <thead><tr style="background:var(--bg-surface);border-bottom:2px solid var(--teal)">
      <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Nome</th>
      <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Interesse</th>
      <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700;white-space:nowrap">1ª Visita</th>
      <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Origem</th>
      <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Congregação</th>
      <th style="text-align:right;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Ações</th>
    </tr></thead>
    <tbody>${rows.slice(0,150).map(row => {
      const ni = row.interesse_nivel || "baixo";
      const bg = NIVEL_COLOR[ni] || NIVEL_COLOR.baixo;
      const cor = NIVEL_COLOR[ni+"-cor"] || "var(--tx3)";
      const ini = initials(row.nome);
      const tel = row.telefone || "";
      return `<tr style="border-bottom:1px solid var(--bd1);transition:background .12s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
        <td style="padding:8px 10px"><div style="display:flex;align-items:center;gap:9px">
          <div style="width:30px;height:30px;border-radius:50%;background:rgba(42,181,192,0.1);border:1px solid rgba(42,181,192,0.2);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--teal);flex-shrink:0">${escapeHtml(ini)}</div>
          <div><div style="font-weight:600;color:var(--tx1)">${nomePropio(row.nome) || "—"}</div>${tel?`<div style="font-size:10px;color:var(--tx3)">${escapeHtml(tel)}</div>`:""}</div>
        </div></td>
        <td style="padding:8px 10px;white-space:nowrap"><span style="background:${bg};color:${cor};border-radius:5px;padding:2px 9px;font-size:10px;font-weight:600;text-transform:capitalize">${escapeHtml(ni)}</span></td>
        <td style="padding:8px 10px;color:var(--tx2);font-size:11px;white-space:nowrap">${fmtDate(row.data_primeira_visita)}</td>
        <td style="padding:8px 10px;color:var(--tx2);font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(row.origem || "—")}</td>
        <td style="padding:8px 10px;color:var(--tx2);font-size:11px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(row.congregacao || "—")}</td>
        <td style="padding:8px 10px;text-align:right;white-space:nowrap">
          ${_podeEditarMembresia() ? `<button onclick='openCrudForm("VISITANTES",${safeJsonForHtml(row)})' style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:4px;color:var(--tx2);font-size:10px;padding:3px 8px;cursor:pointer;margin-right:4px">✏️</button>` : ""}
          ${_podeExcluirMembresia() ? `<button onclick='deletarRegistro("VISITANTES","${escapeHtml(row.id || "")}")' style="background:rgba(224,85,85,0.08);border:1px solid rgba(224,85,85,0.18);border-radius:4px;color:var(--rose);font-size:10px;padding:3px 8px;cursor:pointer">🗑</button>` : ""}
        </td>
      </tr>`; }).join("")}
    </tbody></table>
    ${rows.length > 150 ? `<div style="font-size:11px;color:var(--tx3);text-align:center;padding:10px;border-top:1px solid var(--bd1)">Exibindo 150 de ${rows.length} — refine a busca.</div>` : ""}
  </div>`;
}

/* Carrega e exibe membros com filtro opcional */
async function listarMembros(containerId, countId, filtroFixo = {}, somenteInativos = false) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:16px 0">${spinner()} Buscando membros...</div>`;
  try {
    if (!_membCache.length) {
      _membCache = await apiRead("MEMBROS");
    }
    let rows = _membCache.filter(r => r.funcao !== "colaborador");
    // filtro fixo (tipo_ingresso, status, etc.)
    if (filtroFixo && Object.keys(filtroFixo).length) {
      rows = rows.filter(row => Object.entries(filtroFixo).every(([k, v]) =>
        String(row[k] || "").toLowerCase() === String(v).toLowerCase()
      ));
    }
    // histórico = membros não-ativos
    if (somenteInativos) {
      rows = rows.filter(r => r.status !== "ativo");
    }
    const cnt = document.getElementById(countId);
    if (cnt) cnt.textContent = `· ${rows.length}`;
    renderMembrosTable(rows, containerId);
    return rows;
  } catch(e) {
    const el2 = document.getElementById(containerId);
    if (el2) el2.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

/* Carrega e exibe visitantes */
async function listarVisitantes(containerId, countId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:16px 0">${spinner()} Buscando visitantes...</div>`;
  try {
    if (!_visCache.length) {
      _visCache = await apiRead("VISITANTES");
    }
    const cnt = document.getElementById(countId);
    if (cnt) cnt.textContent = `· ${_visCache.length}`;
    renderVisitantesTable(_visCache, containerId);
  } catch(e) {
    const el2 = document.getElementById(containerId);
    if (el2) el2.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

/* Popula select de congregações a partir dos dados em cache */
function _popularSelectCongregacoes(rows) {
  const sel = document.getElementById("cong-fcong");
  if (!sel || sel.options.length > 1) return;
  const congs = [...new Set(rows.map(r => r.congregacao).filter(Boolean))].sort();
  congs.forEach(c => {
    const o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o);
  });
}

/* Dashboard principal de membresia */
async function carregarMembresiaDash() {
  const sv = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  sv("md-membros-ativos", "…"); sv("md-batizados", "…"); sv("md-transferencias", "…");
  try {
    const [membros, visitantes] = await Promise.all([
      apiRead("MEMBROS").catch(() => []),
      apiRead("VISITANTES").catch(() => [])
    ]);
    _membCache = membros;
    _visCache  = visitantes;

    // Colaborador puro não entra no rol de membros
    const membros_rol = membros.filter(r => r.funcao !== "colaborador");

    const anoAtual      = new Date().getFullYear();
    const ativos        = membros_rol.filter(r => r.status === "ativo").length;
    const batizados     = membros_rol.filter(r => r.batizado === true || (r.data_batismo && r.data_batismo !== null)).length;
    const transferidos  = membros_rol.filter(r => r.tipo_ingresso === "transferência").length;
    const homens        = membros_rol.filter(r => r.genero === "M").length;
    const mulheres      = membros_rol.filter(r => r.genero === "F").length;
    const criancas      = membros_rol.filter(r => {
      if (!r.data_nascimento) return false;
      try { return (anoAtual - new Date(r.data_nascimento + "T00:00:00").getFullYear()) <= 12; } catch { return false; }
    }).length;

    sv("md-membros-ativos",  ativos.toLocaleString("pt-BR"));
    sv("md-membros-total",   `${membros_rol.length.toLocaleString("pt-BR")} no total`);
    sv("md-homens",          homens.toLocaleString("pt-BR"));
    sv("md-mulheres",        mulheres.toLocaleString("pt-BR"));
    sv("md-criancas",        criancas.toLocaleString("pt-BR"));
    sv("md-batizados",       batizados.toLocaleString("pt-BR"));
    sv("md-batizados-sub",   `${Math.round(batizados / Math.max(membros_rol.length, 1) * 100)}% dos membros`);
    sv("md-transferencias",  transferidos.toLocaleString("pt-BR"));

    sv("md-ve-batismos",   membros_rol.filter(r => r.tipo_ingresso === "batismo").length);
    sv("md-ve-prof",       membros_rol.filter(r => r.tipo_ingresso === "profissão de fé").length);
    sv("md-ve-trans",      transferidos);
    sv("md-ve-inativos",   membros_rol.filter(r => ["inativo","afastado","disciplinado"].includes(r.status)).length);
    sv("md-ve-falecidos",  membros_rol.filter(r => r.status === "falecido").length);

    // Gráfico de barras por congregação
    const el = document.getElementById("md-cong-bars");
    if (el) {
      const cnt = {};
      membros.forEach(r => { const c = r.congregacao || "Sem congregação"; cnt[c] = (cnt[c] || 0) + 1; });
      const sorted = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 7);
      const max = sorted[0]?.[1] || 1;
      el.innerHTML = sorted.map(([nome, n]) => `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="font-size:11px;color:var(--tx2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px" title="${escapeHtml(nome)}">${escapeHtml(nome)}</span>
            <span style="font-size:11px;font-weight:700;color:var(--tx1);margin-left:8px;font-family:var(--mono)">${n}</span>
          </div>
          <div style="background:var(--bg-surface);border-radius:3px;height:6px">
            <div style="height:100%;background:var(--gr);border-radius:3px;width:${Math.round(n/max*100)}%;opacity:0.7;transition:width .3s"></div>
          </div>
        </div>`).join("");
    }

    const cntEl = document.getElementById("md-lista-count");
    if (cntEl) cntEl.textContent = `· ${membros.length} de ${membros.length}`;
    membresiaFiltrar();

  } catch(e) {
    sv("md-membros-ativos", "erro");
    console.warn("carregarMembresiaDash:", e);
  }
}

/* Aniversariantes do mês */
async function carregarAniversariantes() {
  const sel = document.getElementById("aniv-mes");
  if (!sel) return;

  // Pré-seleciona o mês atual na primeira abertura
  if (!sel.dataset.init) {
    sel.value = String(new Date().getMonth() + 1);
    sel.dataset.init = "1";
  }
  const mes = parseInt(sel.value, 10);
  const MESES = ["","Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  const lista = document.getElementById("aniv-lista");
  const kpis  = document.getElementById("aniv-kpis");
  if (lista) lista.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:16px 0">${spinner()} Buscando aniversariantes...</div>`;

  try {
    if (!_membCache.length) _membCache = await apiRead("MEMBROS");

    const aniv = _membCache.filter(r => {
      if (!r.data_nascimento) return false;
      try { return new Date(r.data_nascimento + "T00:00:00").getMonth() + 1 === mes; } catch { return false; }
    }).sort((a, b) => {
      const da = new Date(a.data_nascimento + "T00:00:00").getDate();
      const db = new Date(b.data_nascimento + "T00:00:00").getDate();
      return da - db;
    });

    const today = new Date();
    const hoje = today.getDate();
    const mesAtual = today.getMonth() + 1;

    const cnt = document.getElementById("aniv-count");
    if (cnt) cnt.textContent = `· ${aniv.length} membros`;

    // KPIs
    const anivHoje  = mesAtual === mes ? aniv.filter(r => new Date(r.data_nascimento + "T00:00:00").getDate() === hoje).length : 0;
    const anivSemana = mesAtual === mes ? aniv.filter(r => {
      const d = new Date(r.data_nascimento + "T00:00:00").getDate();
      return d >= hoje && d <= hoje + 6;
    }).length : 0;
    if (kpis) kpis.innerHTML = `
      <div class="kpi"><div class="kpi-ico" style="background:rgba(212,168,67,0.15);color:var(--gold)">🎂</div><div class="kpi-body"><div class="kpi-lbl">Total em ${MESES[mes]}</div><div class="kpi-val">${aniv.length}</div></div></div>
      ${mesAtual===mes?`<div class="kpi"><div class="kpi-ico" style="background:rgba(224,85,85,0.15);color:var(--rose)">🎉</div><div class="kpi-body"><div class="kpi-lbl">Hoje</div><div class="kpi-val">${anivHoje}</div></div></div>
      <div class="kpi"><div class="kpi-ico" style="background:rgba(58,170,92,0.15);color:var(--gr)">📅</div><div class="kpi-body"><div class="kpi-lbl">Próximos 7 dias</div><div class="kpi-val">${anivSemana}</div></div></div>`:""}`;

    if (!aniv.length) {
      if (lista) lista.innerHTML = `<div style="text-align:center;padding:32px;color:var(--tx3)"><div style="font-size:26px;margin-bottom:8px">🎂</div><div style="font-size:12px">Nenhum aniversariante em ${MESES[mes]}<br><span style="font-size:10px">Verifique se a data de nascimento está cadastrada</span></div></div>`;
      return;
    }

    const fmtData = d => { try { return new Date(d + "T00:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}); } catch { return d; } };
    const idade   = d => { try { const n=new Date(d+"T00:00:00"); const a=new Date(); return a.getFullYear()-n.getFullYear()-(a<new Date(a.getFullYear(),n.getMonth(),n.getDate())?1:0); } catch { return "?"; } };
    const initials = n => (n||"?").split(" ").filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join("");

    if (lista) lista.innerHTML = `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:11.5px">
          <thead>
            <tr style="background:var(--bg-surface);border-bottom:2px solid var(--gold)">
              <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700;min-width:180px">Nome</th>
              <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Data</th>
              <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Idade</th>
              <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Congregação</th>
              <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Contato</th>
            </tr>
          </thead>
          <tbody>
            ${aniv.map(r => {
              const ini  = initials(r.nome);
              const dia  = new Date(r.data_nascimento + "T00:00:00").getDate();
              const isHoje = mesAtual === mes && dia === hoje;
              const tel  = r.telefone || r.celular || "—";
              return `<tr style="border-bottom:1px solid var(--bd1);transition:background .12s${isHoje?";background:rgba(212,168,67,0.07)":""}" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='${isHoje?"rgba(212,168,67,0.07)":""}'"">
                <td style="padding:8px 10px">
                  <div style="display:flex;align-items:center;gap:9px">
                    <div style="width:30px;height:30px;border-radius:50%;background:${isHoje?"rgba(212,168,67,0.2)":"var(--bg-surface)"};border:1px solid ${isHoje?"rgba(212,168,67,0.4)":"var(--bd2)"};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${isHoje?"var(--gold)":"var(--tx2)"};flex-shrink:0">${escapeHtml(ini)}</div>
                    <div>
                      <div style="font-weight:600;color:var(--tx1)">${nomePropio(r.nome||"—")}${isHoje?' <span style="font-size:9px;background:rgba(212,168,67,0.2);color:var(--gold);border-radius:4px;padding:1px 5px;font-weight:700">Hoje 🎉</span>':""}</div>
                      <div style="font-size:10px;color:var(--tx3)">${escapeHtml(r.funcao||"Membro")}</div>
                    </div>
                  </div>
                </td>
                <td style="padding:8px 10px;color:var(--tx2);font-family:var(--mono);font-size:11px">${fmtData(r.data_nascimento)}</td>
                <td style="padding:8px 10px;color:var(--tx2);font-size:11px">${idade(r.data_nascimento)} anos</td>
                <td style="padding:8px 10px;color:var(--tx2);font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.congregacao||"—")}</td>
                <td style="padding:8px 10px;color:var(--tx3);font-size:11px">${escapeHtml(tel)}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;

  } catch(e) {
    if (lista) lista.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:16px 0;text-align:center">Não foi possível carregar os aniversariantes.<br><button class="tbt" style="margin-top:10px" onclick="carregarAniversariantes()">Tentar novamente</button></div>`;
  }
}

/* ── WhatsApp de Aniversariantes ─────────────────────────── */

function anivTogglePainelWA() {
  const painel = document.getElementById("aniv-wa-painel");
  if (!painel) return;
  if (painel.style.display === "none") {
    anivAbrirPainelWA();
  } else {
    painel.style.display = "none";
  }
}
window.anivTogglePainelWA = anivTogglePainelWA;

async function anivAbrirPainelWA() {
  const painel = document.getElementById("aniv-wa-painel");
  if (!painel) return;
  painel.style.display = "block";
  painel.innerHTML = `<div class="card" style="border-color:rgba(82,196,110,0.3)"><div style="color:var(--tx3);font-size:11.5px;padding:8px 0">${spinner()} Carregando...</div></div>`;

  try {
    const token = typeof sipenToken === "function" ? sipenToken() : (SUPABASE_ANON_KEY || "");
    const hdr   = { apikey: SUPABASE_ANON_KEY || "", Authorization: `Bearer ${token}` };
    const base  = (SUPABASE_URL || "").trim().replace(/\/$/, "");

    const [listasRes, agendRes] = await Promise.all([
      fetch(`${base}/rest/v1/wa_listas?ativo=eq.true&select=id,nome,icone&order=nome`, { headers: hdr }),
      fetch(`${base}/rest/v1/wa_agendamentos?tipo=eq.aniversariantes&recorrente=eq.true&select=id,lista_nome,horario_diario,ultimo_envio_em&order=criado_em.desc&limit=1`, { headers: hdr }),
    ]);

    const listas = listasRes.ok ? await listasRes.json() : [];
    const agendamentos = agendRes.ok ? await agendRes.json() : [];
    const agAtivo = agendamentos[0] || null;

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const jaEnviadoHoje = agAtivo?.ultimo_envio_em
      ? agAtivo.ultimo_envio_em.slice(0, 10) === todayStr
      : false;

    const anivHoje = (_membCache || []).filter(r => {
      if (!r.data_nascimento) return false;
      try {
        const d = new Date(r.data_nascimento + "T00:00:00");
        return d.getMonth() + 1 === today.getMonth() + 1 && d.getDate() === today.getDate();
      } catch { return false; }
    });

    const fmtTel = t => t || "sem telefone";
    const previewLinhas = anivHoje.length
      ? anivHoje.map(r => `• ${r.nome} — ${fmtTel(r.celular || r.telefone || r.whatsapp)}`).join("\n")
      : "_Nenhum aniversariante hoje_";

    const listasOpts = listas.length
      ? listas.map(l => `<option value="${l.id}">${l.icone || "📋"} ${escapeHtml(l.nome)}</option>`).join("")
      : `<option value="">Nenhuma lista cadastrada</option>`;

    painel.innerHTML = `
      <div class="card" style="border:1.5px solid rgba(82,196,110,0.3);border-left:4px solid var(--gr)">
        <div class="ctit" style="color:var(--gr)">💬 Enviar Aniversariantes via WhatsApp
          <span class="cact" style="color:var(--tx3);font-weight:400" onclick="anivTogglePainelWA()">✕ Fechar</span>
        </div>

        ${jaEnviadoHoje ? `<div style="margin-bottom:12px;padding:8px 12px;border-radius:7px;background:rgba(58,170,92,.08);border:1px solid rgba(58,170,92,.2);font-size:11.5px;color:var(--gr)">
          ✓ Agendamento recorrente já enviado hoje (${agAtivo.lista_nome}) às ${agAtivo.ultimo_envio_em ? new Date(agAtivo.ultimo_envio_em).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "—"}
        </div>` : ""}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">

          <div>
            <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Lista destinatária</div>
            <select id="aniv-wa-lista" style="width:100%;padding:7px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px;outline:none">
              <option value="">— Selecionar lista —</option>
              ${listasOpts}
            </select>

            <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em;margin:14px 0 6px">Agendamento diário</div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--tx2);cursor:pointer">
                <input type="checkbox" id="aniv-wa-recorrente" onchange="anivToggleHorario()" style="cursor:pointer">
                Repetir todos os dias
              </label>
            </div>
            <div id="aniv-wa-horario-row" style="display:none;align-items:center;gap:8px">
              <span style="font-size:11.5px;color:var(--tx3)">Horário:</span>
              <input type="time" id="aniv-wa-horario" value="08:00" style="padding:5px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px;outline:none">
            </div>

            <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
              <button onclick="anivEnviarAgora()" style="padding:8px 18px;border-radius:7px;border:1px solid rgba(82,196,110,.4);background:rgba(82,196,110,.1);color:var(--gr);font-size:12px;font-weight:700;cursor:pointer">📨 Enviar agora</button>
              <button onclick="anivAgendarEnvio()" style="padding:8px 18px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--tx2);font-size:12px;font-weight:700;cursor:pointer">⏰ Agendar</button>
            </div>
          </div>

          <div>
            <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Preview da mensagem de hoje</div>
            <div style="padding:12px 14px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-surface);font-size:11.5px;color:var(--tx2);line-height:1.7;white-space:pre-wrap;font-family:var(--mono)">🎂 *Aniversariantes de hoje — ${today.toLocaleDateString("pt-BR")}*\n\n${previewLinhas}\n\n📋 https://sipen.com.br/aniversariantes\n_SIPEN · IPPenha_</div>
            <div style="margin-top:6px;font-size:10.5px;color:var(--tx3)">${anivHoje.length} aniversariante${anivHoje.length !== 1 ? "s" : ""} hoje · A mensagem é enviada para cada membro da lista selecionada</div>
          </div>
        </div>
      </div>`;

    anivVerificarAgendamentoPendente();
  } catch (e) {
    const painel = document.getElementById("aniv-wa-painel");
    if (painel) painel.innerHTML = `<div class="card"><div style="color:var(--rose);font-size:11.5px">Erro ao carregar painel: ${escapeHtml(e.message)}</div></div>`;
  }
}
window.anivAbrirPainelWA = anivAbrirPainelWA;

function anivToggleHorario() {
  const chk = document.getElementById("aniv-wa-recorrente");
  const row = document.getElementById("aniv-wa-horario-row");
  if (row) row.style.display = chk?.checked ? "flex" : "none";
}
window.anivToggleHorario = anivToggleHorario;

function _anivMsgHoje() {
  const today = new Date();
  const anivHoje = (_membCache || []).filter(r => {
    if (!r.data_nascimento) return false;
    try {
      const d = new Date(r.data_nascimento + "T00:00:00");
      return d.getMonth() + 1 === today.getMonth() + 1 && d.getDate() === today.getDate();
    } catch { return false; }
  });
  const linhas = anivHoje.length
    ? anivHoje.map(r => `• ${r.nome} — ${r.celular || r.telefone || r.whatsapp || "sem telefone"}`).join("\n")
    : "_Nenhum aniversariante hoje_";
  return {
    texto: `🎂 *Aniversariantes de hoje — ${today.toLocaleDateString("pt-BR")}*\n\n${linhas}\n\n📋 https://sipen.com.br/aniversariantes\n_SIPEN · IPPenha_`,
    total: anivHoje.length,
  };
}

async function anivEnviarAgora() {
  const listaId = document.getElementById("aniv-wa-lista")?.value;
  if (!listaId) { T("Selecione uma lista", "Escolha para qual lista enviar."); return; }

  const { texto, total } = _anivMsgHoje();
  if (!total) { T("Sem aniversariantes hoje", "Nenhum membro faz aniversário hoje."); return; }

  const token = typeof sipenToken === "function" ? sipenToken() : (SUPABASE_ANON_KEY || "");
  const hdr   = { apikey: SUPABASE_ANON_KEY || "", Authorization: `Bearer ${token}` };
  const base  = (SUPABASE_URL || "").trim().replace(/\/$/, "");

  try {
    const membRes = await fetch(
      `${base}/rest/v1/wa_lista_membros?lista_id=eq.${listaId}&ativo=eq.true&select=pessoas(id,nome,whatsapp,celular,telefone)`,
      { headers: hdr }
    );
    if (!membRes.ok) throw new Error(await membRes.text());
    const rows = await membRes.json();
    const destinatarios = rows.map(r => r.pessoas).filter(Boolean);

    if (!destinatarios.length) { T("Lista vazia", "A lista selecionada não tem membros."); return; }

    T("Enviando...", `${destinatarios.length} destinatário${destinatarios.length !== 1 ? "s" : ""}`);

    let enviados = 0;
    let falhas   = 0;
    for (const p of destinatarios) {
      const tel = p.whatsapp || p.celular || p.telefone;
      if (!tel) { falhas++; continue; }
      try {
        await WA.send({ para: tel, nome: p.nome, mensagem: texto, modulo: "MEMBRESIA", chave: `ANIV_DIA_${new Date().toISOString().slice(0,10)}_${p.id}` });
        enviados++;
      } catch { falhas++; }
    }
    T("Envio concluído", `${enviados} enviado${enviados !== 1 ? "s" : ""}${falhas ? ` · ${falhas} sem número` : ""}`);
  } catch (e) { T("Erro ao enviar", e.message); }
}
window.anivEnviarAgora = anivEnviarAgora;

async function anivAgendarEnvio() {
  const listaId   = document.getElementById("aniv-wa-lista")?.value;
  const recorrente = document.getElementById("aniv-wa-recorrente")?.checked || false;
  const horario   = document.getElementById("aniv-wa-horario")?.value || "08:00";
  const listaEl   = document.getElementById("aniv-wa-lista");
  const listaNome = listaEl?.options[listaEl?.selectedIndex]?.text || "";

  if (!listaId) { T("Selecione uma lista", "Escolha para qual lista agendar."); return; }

  const [hh, mm] = horario.split(":");
  const agendadoPara = new Date();
  agendadoPara.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
  if (agendadoPara < new Date()) agendadoPara.setDate(agendadoPara.getDate() + (recorrente ? 0 : 1));

  const token = typeof sipenToken === "function" ? sipenToken() : (SUPABASE_ANON_KEY || "");
  const hdr   = { apikey: SUPABASE_ANON_KEY || "", Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" };
  const base  = (SUPABASE_URL || "").trim().replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/rest/v1/wa_agendamentos`, {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        lista_id:       listaId,
        lista_nome:     listaNome.replace(/^[^\s]+\s/, ""),
        mensagem:       "[Gerado automaticamente — aniversariantes do dia]",
        tipo:           "aniversariantes",
        recorrente,
        horario_diario: recorrente ? horario : null,
        agendado_para:  agendadoPara.toISOString(),
        status:         "pendente",
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    T(
      recorrente ? "Agendamento recorrente salvo" : "Agendamento salvo",
      recorrente ? `Todos os dias às ${horario} para "${listaNome.replace(/^[^\s]+\s/, "")}"` : `Agendado para ${agendadoPara.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`
    );
    anivAbrirPainelWA();
  } catch (e) { T("Erro ao agendar", e.message); }
}
window.anivAgendarEnvio = anivAgendarEnvio;

/* Wrappers chamados da tela WhatsApp — Membresia */
async function anivWaEnviarAgora() {
  const listaId = document.getElementById("wa-aniv-lista")?.value;
  if (!listaId) { T("Selecione uma lista", "Escolha para qual lista enviar."); return; }
  if (!_membCache.length) { try { _membCache = await apiRead("MEMBROS"); } catch(_){} }
  const { texto, total } = _anivMsgHoje();
  if (!total) { T("Sem aniversariantes hoje", "Nenhum membro faz aniversário hoje."); return; }

  const token = typeof sipenToken === "function" ? sipenToken() : (SUPABASE_ANON_KEY || "");
  const hdr   = { apikey: SUPABASE_ANON_KEY || "", Authorization: `Bearer ${token}` };
  const base  = (SUPABASE_URL || "").trim().replace(/\/$/, "");

  try {
    const membRes = await fetch(
      `${base}/rest/v1/wa_lista_membros?lista_id=eq.${listaId}&ativo=eq.true&select=pessoas(id,nome,whatsapp,celular,telefone)`,
      { headers: hdr }
    );
    if (!membRes.ok) throw new Error(await membRes.text());
    const rows = await membRes.json();
    const destinatarios = rows.map(r => r.pessoas).filter(Boolean);
    if (!destinatarios.length) { T("Lista vazia", "A lista selecionada não tem membros."); return; }
    T("Enviando...", `${destinatarios.length} destinatário${destinatarios.length !== 1 ? "s" : ""}`);
    let enviados = 0, falhas = 0;
    const diaKey = new Date().toISOString().slice(0, 10);
    for (const p of destinatarios) {
      const tel = p.whatsapp || p.celular || p.telefone;
      if (!tel) { falhas++; continue; }
      try { await WA.send({ para: tel, nome: p.nome, mensagem: texto, modulo: "MEMBRESIA", chave: `ANIV_DIA_${diaKey}_${p.id}` }); enviados++; }
      catch { falhas++; }
    }
    T("Envio concluído", `${enviados} enviado${enviados !== 1 ? "s" : ""}${falhas ? ` · ${falhas} sem número` : ""}`);
    if (typeof WA_TAB !== "undefined") setTimeout(() => WA_TAB.load("MEMBRESIA"), 800);
  } catch (e) { T("Erro ao enviar", e.message); }
}
window.anivWaEnviarAgora = anivWaEnviarAgora;

async function anivWaAgendar() {
  const listaId    = document.getElementById("wa-aniv-lista")?.value;
  const recorrente = document.getElementById("wa-aniv-recorrente")?.checked || false;
  const horario    = document.getElementById("wa-aniv-horario")?.value || "08:00";
  const listaEl    = document.getElementById("wa-aniv-lista");
  const listaNome  = listaEl?.options[listaEl?.selectedIndex]?.text?.replace(/^[^\s]+\s/, "") || "";

  if (!listaId) { T("Selecione uma lista", "Escolha para qual lista agendar."); return; }

  const [hh, mm] = horario.split(":");
  const agendadoPara = new Date();
  agendadoPara.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
  if (agendadoPara < new Date()) agendadoPara.setDate(agendadoPara.getDate() + 1);

  const token = typeof sipenToken === "function" ? sipenToken() : (SUPABASE_ANON_KEY || "");
  const hdr   = { apikey: SUPABASE_ANON_KEY || "", Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" };
  const base  = (SUPABASE_URL || "").trim().replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/rest/v1/wa_agendamentos`, {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        lista_id:       listaId,
        lista_nome:     listaNome,
        mensagem:       "[Gerado automaticamente — aniversariantes do dia]",
        tipo:           "aniversariantes",
        recorrente,
        horario_diario: recorrente ? horario : null,
        agendado_para:  agendadoPara.toISOString(),
        status:         "pendente",
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    T(
      recorrente ? "Agendamento recorrente salvo" : "Agendamento salvo",
      recorrente ? `Todos os dias às ${horario} para "${listaNome}"` : `Agendado para ${agendadoPara.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`
    );
    if (typeof WA_TAB !== "undefined") setTimeout(() => WA_TAB.load("MEMBRESIA"), 400);
  } catch (e) { T("Erro ao agendar", e.message); }
}
window.anivWaAgendar = anivWaAgendar;

async function anivVerificarAgendamentoPendente() {
  try {
    const token = typeof sipenToken === "function" ? sipenToken() : (SUPABASE_ANON_KEY || "");
    const hdr   = { apikey: SUPABASE_ANON_KEY || "", Authorization: `Bearer ${token}` };
    const base  = (SUPABASE_URL || "").trim().replace(/\/$/, "");
    const today = new Date().toISOString().slice(0, 10);

    const res = await fetch(
      `${base}/rest/v1/wa_agendamentos?tipo=eq.aniversariantes&recorrente=eq.true&status=eq.pendente&select=id,lista_id,lista_nome,horario_diario,ultimo_envio_em&limit=10`,
      { headers: hdr }
    );
    if (!res.ok) return;
    const agendamentos = await res.json();

    const agora = new Date();
    for (const ag of agendamentos) {
      const jaEnviouHoje = ag.ultimo_envio_em && ag.ultimo_envio_em.slice(0, 10) === today;
      if (jaEnviouHoje) continue;
      const [hh, mm] = (ag.horario_diario || "08:00").split(":");
      const horarioPrevisto = new Date();
      horarioPrevisto.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
      if (agora >= horarioPrevisto) {
        await _anivDispararRecorrente(ag);
      }
    }
  } catch (_) {}
}
window.anivVerificarAgendamentoPendente = anivVerificarAgendamentoPendente;

async function _anivDispararRecorrente(ag) {
  const token = typeof sipenToken === "function" ? sipenToken() : (SUPABASE_ANON_KEY || "");
  const hdr   = { apikey: SUPABASE_ANON_KEY || "", Authorization: `Bearer ${token}` };
  const base  = (SUPABASE_URL || "").trim().replace(/\/$/, "");

  try {
    if (!_membCache.length) _membCache = await apiRead("MEMBROS");
    const { texto, total } = _anivMsgHoje();
    if (!total) return;

    const membRes = await fetch(
      `${base}/rest/v1/wa_lista_membros?lista_id=eq.${ag.lista_id}&ativo=eq.true&select=pessoas(id,nome,whatsapp,celular,telefone)`,
      { headers: hdr }
    );
    if (!membRes.ok) return;
    const rows = await membRes.json();
    const destinatarios = rows.map(r => r.pessoas).filter(Boolean);

    for (const p of destinatarios) {
      const tel = p.whatsapp || p.celular || p.telefone;
      if (!tel) continue;
      WA.send({ para: tel, nome: p.nome, mensagem: texto, modulo: "MEMBRESIA", chave: `ANIV_DIA_${new Date().toISOString().slice(0,10)}_${p.id}` }).catch(() => {});
    }

    await fetch(`${base}/rest/v1/wa_agendamentos?id=eq.${ag.id}`, {
      method: "PATCH",
      headers: { ...hdr, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ ultimo_envio_em: new Date().toISOString() }),
    });
  } catch (_) {}
}

/* Filtrar lista do dashboard */
function membresiaFiltrar() {
  const busca        = (document.getElementById("md-busca")?.value       || "").toLowerCase().trim();
  const fstatus      = document.getElementById("md-fstatus")?.value      || "";
  const ftipo        = document.getElementById("md-ftipo")?.value        || "";
  const ftipomembro  = document.getElementById("md-ftipomembro")?.value  || "";
  let rows = _membCache;
  if (fstatus)     rows = rows.filter(r => r.status === fstatus);
  if (ftipo)       rows = rows.filter(r => (r.tipo_ingresso || "").toLowerCase() === ftipo);
  if (ftipomembro) rows = rows.filter(r => (r.tipo_membro || "comungante") === ftipomembro);
  if (busca)   rows = rows.filter(r =>
    (r.nome        || "").toLowerCase().includes(busca) ||
    (r.funcao      || "").toLowerCase().includes(busca) ||
    (r.congregacao || "").toLowerCase().includes(busca) ||
    (r.email       || "").toLowerCase().includes(busca) ||
    (r.telefone    || "").includes(busca) ||
    (r.celular     || "").includes(busca)
  );
  const cnt = document.getElementById("md-lista-count");
  if (cnt) cnt.textContent = `· ${rows.length} de ${_membCache.length}`;
  renderMembrosTable(rows, "md-lista");
}

/* Filtros das sub-views */
function memb_cad_filtrar() {
  const busca   = (document.getElementById("mc-busca")?.value   || "").toLowerCase().trim();
  const fstatus = document.getElementById("mc-fstatus")?.value  || "";
  const ftipo   = document.getElementById("mc-ftipo")?.value    || "";
  let rows = _membCache;
  if (fstatus) rows = rows.filter(r => r.status === fstatus);
  if (ftipo)   rows = rows.filter(r => (r.tipo_ingresso || "").toLowerCase() === ftipo);
  if (busca)   rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(busca));
  const cnt = document.getElementById("memb-cad-count");
  if (cnt) cnt.textContent = `· ${rows.length}`;
  renderMembrosTable(rows, "memb-cad-list");
}

function vis_filtrar() {
  const busca  = (document.getElementById("vis-busca")?.value  || "").toLowerCase().trim();
  const fnivel = document.getElementById("vis-fnivel")?.value  || "";
  let rows = _visCache;
  if (fnivel) rows = rows.filter(r => r.interesse_nivel === fnivel);
  if (busca)  rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(busca));
  const cnt = document.getElementById("vis-count");
  if (cnt) cnt.textContent = `· ${rows.length}`;
  renderVisitantesTable(rows, "vis-list");
}

function com_filtrar() {
  const busca = (document.getElementById("com-busca")?.value || "").toLowerCase().trim();
  let rows = _membCache.filter(r => (r.tipo_membro || "comungante") === "comungante");
  if (busca) rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(busca));
  const cnt = document.getElementById("memb-com-count");
  if (cnt) cnt.textContent = `· ${rows.length}`;
  renderMembrosTable(rows, "memb-com-list");
}

function ncom_filtrar() {
  const busca = (document.getElementById("ncom-busca")?.value || "").toLowerCase().trim();
  let rows = _membCache.filter(r => r.tipo_membro === "nao_comungante");
  if (busca) rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(busca));
  const cnt = document.getElementById("memb-ncom-count");
  if (cnt) cnt.textContent = `· ${rows.length}`;
  renderMembrosTable(rows, "memb-ncom-list");
}

function bat_filtrar() {
  const busca = (document.getElementById("bat-busca")?.value || "").toLowerCase().trim();
  let rows = _membCache.filter(r => (r.tipo_ingresso || "") === "batismo");
  if (busca) rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(busca));
  const cnt = document.getElementById("memb-bat-count");
  if (cnt) cnt.textContent = `· ${rows.length}`;
  renderMembrosTable(rows, "memb-bat-list");
}

function prof_filtrar() {
  const busca = (document.getElementById("prof-busca")?.value || "").toLowerCase().trim();
  let rows = _membCache.filter(r => (r.tipo_ingresso || "") === "profissão de fé");
  if (busca) rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(busca));
  const cnt = document.getElementById("memb-prof-count");
  if (cnt) cnt.textContent = `· ${rows.length}`;
  renderMembrosTable(rows, "memb-prof-list");
}

function trans_filtrar() {
  const busca = (document.getElementById("trans-busca")?.value || "").toLowerCase().trim();
  let rows = _membCache.filter(r => (r.tipo_ingresso || "") === "transferência");
  if (busca) rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(busca));
  const cnt = document.getElementById("memb-trans-count");
  if (cnt) cnt.textContent = `· ${rows.length}`;
  renderMembrosTable(rows, "memb-trans-list");
}

function hist_filtrar() {
  const busca   = (document.getElementById("hist-busca")?.value   || "").toLowerCase().trim();
  const fstatus = document.getElementById("hist-fstatus")?.value  || "";
  let rows = _membCache.filter(r => r.status !== "ativo");
  if (fstatus) rows = rows.filter(r => r.status === fstatus);
  if (busca)   rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(busca));
  const cnt = document.getElementById("memb-hist-count");
  if (cnt) cnt.textContent = `· ${rows.length}`;
  renderMembrosTable(rows, "memb-hist-list");
}

/* Limpar cache para forçar reload após salvar/deletar */
function _invalidarCacheMembresia() {
  _membCache = [];
  _visCache  = [];
}

/* Abrir formulário de novo membro com campos estendidos */
function openNovoMembro() {
  if (!_podeEditarMembresia()) {
    if (typeof T === "function") T("Acesso negado", "Sem permissão para cadastrar membros.");
    return;
  }
  openCrudForm("MEMBROS");
}

/* ══ FIM MÓDULO MEMBRESIA ══ */
