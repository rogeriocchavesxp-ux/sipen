/* ══════════════════════════════════════════════════════
   MÓDULO MEMBRESIA — funções dedicadas v6.30.3
══════════════════════════════════════════════════════ */

let _membCache = [];    // cache de todos os membros
let _visCache  = [];    // cache de todos os visitantes

function _podeEditarMembresia() {
  if (!window.USUARIO_ATUAL) return false;
  if (USUARIO_ATUAL.perfil === "ADMINISTRADOR_GERAL") return true;
  const nivel = (window.permissoesUsuario || {})["MEMBRESIA"] || "SEM_ACESSO";
  return nivel === "COMPLETO" || nivel === "EDICAO";
}

function _podeExcluirMembresia() {
  return window.USUARIO_ATUAL?.perfil === "ADMINISTRADOR_GERAL";
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
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700;white-space:nowrap">Ingresso</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Congregação</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Função</th>
            <th style="text-align:right;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${rows.slice(0, 150).map(row => {
            const sc = MEMB_STATUS[row.status] || MEMB_STATUS.inativo;
            const ini = initials(row.nome);
            const tel = row.telefone || row.celular || "";
            const icon = INGRESSO_ICON[row.tipo_ingresso] || "•";
            return `<tr style="border-bottom:1px solid var(--bd1);transition:background .12s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
              <td style="padding:8px 10px">
                <div style="display:flex;align-items:center;gap:9px">
                  <div style="width:30px;height:30px;border-radius:50%;background:var(--bg-surface);border:1px solid var(--bd2);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--tx2);flex-shrink:0">${escapeHtml(ini)}</div>
                  <div style="min-width:0">
                    <div style="font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">${escapeHtml(row.nome || "—")}</div>
                    ${tel ? `<div style="font-size:10px;color:var(--tx3)">${escapeHtml(tel)}</div>` : ""}
                  </div>
                </div>
              </td>
              <td style="padding:8px 10px;white-space:nowrap">
                <span style="background:${sc.bg};color:${sc.color};border-radius:5px;padding:2px 9px;font-size:10px;font-weight:600">${sc.label}</span>
              </td>
              <td style="padding:8px 10px;color:var(--tx2);font-size:11px;white-space:nowrap">
                <div>${icon} ${escapeHtml(row.tipo_ingresso || "—")}</div>
                <div style="font-size:10px;color:var(--tx3)">${fmtDate(row.data_ingresso)}</div>
              </td>
              <td style="padding:8px 10px;color:var(--tx2);font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(row.congregacao || "—")}</td>
              <td style="padding:8px 10px;color:var(--tx2);font-size:11px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(row.funcao || "—")}</td>
              <td style="padding:8px 10px;text-align:right;white-space:nowrap">
                ${_podeEditarMembresia() ? `<button onclick='openCrudForm("MEMBROS",${safeJsonForHtml(row)})' style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:4px;color:var(--tx2);font-size:10px;padding:3px 8px;cursor:pointer;margin-right:4px" title="Editar">✏️</button>` : ""}
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
          <div><div style="font-weight:600;color:var(--tx1)">${escapeHtml(row.nome || "—")}</div>${tel?`<div style="font-size:10px;color:var(--tx3)">${escapeHtml(tel)}</div>`:""}</div>
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
    let rows = _membCache;
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
    // popular dropdown de congregações (se existir no contexto)
    _popularSelectCongregacoes(rows);
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
  sv("md-membros-ativos", "…"); sv("md-visitantes", "…"); sv("md-batizados", "…"); sv("md-transferencias", "…");
  try {
    const [membros, visitantes] = await Promise.all([
      apiRead("MEMBROS").catch(() => []),
      apiRead("VISITANTES").catch(() => [])
    ]);
    _membCache = membros;
    _visCache  = visitantes;

    const ativos        = membros.filter(r => r.status === "ativo").length;
    const batizados     = membros.filter(r => r.batizado === true || (r.data_batismo && r.data_batismo !== null)).length;
    const transferidos  = membros.filter(r => r.tipo_ingresso === "transferência").length;
    const altoInteresse = visitantes.filter(r => r.interesse_nivel === "alto" || r.interesse_nivel === "convertido").length;

    sv("md-membros-ativos",  ativos.toLocaleString("pt-BR"));
    sv("md-membros-total",   `${membros.length.toLocaleString("pt-BR")} no total`);
    sv("md-visitantes",      visitantes.length.toLocaleString("pt-BR"));
    sv("md-visitantes-sub",  `${altoInteresse} alta prioridade`);
    sv("md-batizados",       batizados.toLocaleString("pt-BR"));
    sv("md-batizados-sub",   `${Math.round(batizados / Math.max(membros.length, 1) * 100)}% dos membros`);
    sv("md-transferencias",  transferidos.toLocaleString("pt-BR"));

    sv("md-ve-batismos",   membros.filter(r => r.tipo_ingresso === "batismo").length);
    sv("md-ve-prof",       membros.filter(r => r.tipo_ingresso === "profissão de fé").length);
    sv("md-ve-trans",      transferidos);
    sv("md-ve-inativos",   membros.filter(r => ["inativo","afastado","disciplinado"].includes(r.status)).length);
    sv("md-ve-falecidos",  membros.filter(r => r.status === "falecido").length);

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
                      <div style="font-weight:600;color:var(--tx1)">${escapeHtml(r.nome||"—")}${isHoje?' <span style="font-size:9px;background:rgba(212,168,67,0.2);color:var(--gold);border-radius:4px;padding:1px 5px;font-weight:700">Hoje 🎉</span>':""}</div>
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
    if (lista) lista.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
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
  if (ftipomembro) rows = rows.filter(r => (r.tipo_membro || "COMUNGANTE") === ftipomembro);
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
  let rows = _membCache.filter(r => (r.tipo_membro || "COMUNGANTE") === "COMUNGANTE");
  if (busca) rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(busca));
  const cnt = document.getElementById("memb-com-count");
  if (cnt) cnt.textContent = `· ${rows.length}`;
  renderMembrosTable(rows, "memb-com-list");
}

function ncom_filtrar() {
  const busca = (document.getElementById("ncom-busca")?.value || "").toLowerCase().trim();
  let rows = _membCache.filter(r => r.tipo_membro === "NAO_COMUNGANTE");
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
