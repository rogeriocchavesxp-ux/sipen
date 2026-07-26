/* ── REQUISIÇÕES DE ESPAÇO OCUPADO ───────────────────────────── */

const REQ_STATUS = {
  AGUARDANDO_ANALISE:       { label: "Aguardando análise",   cor: "var(--orange)" },
  EM_ANALISE:               { label: "Em análise",           cor: "var(--sky)"    },
  SOLICITANDO_INFORMACOES:  { label: "Solicitando info.",    cor: "var(--amber)"  },
  NEGOCIACAO_NECESSARIA:    { label: "Em negociação",        cor: "var(--violet)" },
  ESPACO_LIBERADO:          { label: "Espaço liberado",      cor: "var(--gr)"     },
  ALTERNATIVA_OFERECIDA:    { label: "Alternativa oferecida",cor: "var(--teal)"   },
  REQUISICAO_NEGADA:        { label: "Negada",               cor: "var(--rose)"   },
  CANCELADA:                { label: "Cancelada",            cor: "var(--tx3)"    },
};
const REQ_FINAL = ["ESPACO_LIBERADO","ALTERNATIVA_OFERECIDA","REQUISICAO_NEGADA","CANCELADA"];

let _agReqFiltro = "";
let _agReqRows   = [];

function _agReqPill(status) {
  const cfg = REQ_STATUS[status] || { label: status || "—", cor: "var(--tx3)" };
  return `<span style="font-size:9.5px;padding:2px 9px;border-radius:10px;background:${cfg.cor}18;color:${cfg.cor};border:1px solid ${cfg.cor}33;font-weight:700;white-space:nowrap">${escapeHtml(cfg.label)}</span>`;
}

function _agKpiReq(rows) {
  const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  const pendentes = rows.filter(r => !REQ_FINAL.includes(r.status));
  s("req-aguard",  rows.filter(r => r.status === "AGUARDANDO_ANALISE").length);
  s("req-analise", rows.filter(r => r.status === "EM_ANALISE").length);
  s("req-negoc",   rows.filter(r => r.status === "NEGOCIACAO_NECESSARIA").length);
  s("req-total",   rows.length);
  s("ag-req-pendentes", pendentes.length);
}

window.agFiltrarReqStatus = function(status) {
  _agReqFiltro = _agReqFiltro === status ? "" : status;
  _agRenderReqTabela();
};

function _agRenderReqTabela() {
  const el = document.getElementById("agenda-req-list");
  if (!el) return;
  const fmtD = d => { if (!d) return "—"; const [y,m,dia] = String(d).slice(0,10).split("-"); return `${dia}/${m}/${y}`; };
  const rows = _agReqFiltro
    ? _agReqRows.filter(r => r.status === _agReqFiltro)
    : _agReqRows;

  if (!rows.length) {
    el.innerHTML = `<div style="text-align:center;padding:36px;color:var(--tx3)">
      <div style="font-size:28px;margin-bottom:8px">📭</div>
      <div style="font-size:12px">Nenhuma requisição${_agReqFiltro ? " com esse status" : ""} encontrada.</div>
    </div>`;
    return;
  }

  el.innerHTML = `<div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:11.5px;min-width:820px">
      <thead><tr style="border-bottom:1px solid var(--bd2);background:var(--bg-surface)">
        <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Protocolo</th>
        <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Espaço / Data</th>
        <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Solicitante</th>
        <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Título</th>
        <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Status</th>
        <th style="text-align:right;padding:7px 10px;font-size:9.5px;color:var(--tx3)">Ações</th>
      </tr></thead>
      <tbody>${rows.map(r => {
        const ativa = !REQ_FINAL.includes(r.status);
        const h = t => { const [hh,mm] = (t||"").split(":"); return hh && mm ? `${hh}:${mm}` : ""; };
        const horario = [h(r.hora_inicio_sol), h(r.hora_fim_sol)].filter(Boolean).join("–") || "dia todo";
        return `<tr style="border-bottom:1px solid var(--bd1)" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
          <td style="padding:8px 10px;font-family:var(--mono);font-size:10px;color:var(--orange)">${escapeHtml(r.protocolo||"—")}</td>
          <td style="padding:8px 10px;color:var(--tx2);font-size:11px;white-space:nowrap">
            ${escapeHtml(r.espaco_nome||"—")}
            <div style="font-size:10px;color:var(--tx3)">${fmtD(r.data_solicitada)} · ${horario}</div>
          </td>
          <td style="padding:8px 10px;color:var(--tx2);font-size:11px">
            ${escapeHtml(r.solicitante_nome||"—")}
            ${r.solicitante_tel ? `<div style="font-size:10px;color:var(--tx3)">${escapeHtml(r.solicitante_tel)}</div>` : ""}
          </td>
          <td style="padding:8px 10px;color:var(--tx1);font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(r.titulo||'')}">${escapeHtml(r.titulo||"—")}</td>
          <td style="padding:8px 10px">${_agReqPill(r.status)}</td>
          <td style="padding:8px 10px;text-align:right;white-space:nowrap">
            <button onclick='agAnalisarRequisicao("${r.id}")' style="padding:3px 9px;border-radius:4px;border:1px solid var(--bd1);background:var(--bg-card);color:var(--tx2);font-size:10px;cursor:pointer">Analisar</button>
            ${ativa ? `<button onclick='agAtualizarRequisicao("${r.id}","REQUISICAO_NEGADA")' style="margin-left:4px;padding:3px 9px;border-radius:4px;border:1px solid rgba(224,85,85,.35);background:rgba(224,85,85,.08);color:var(--rose);font-size:10px;cursor:pointer">✕ Negar</button>` : ""}
          </td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>`;
}

async function carregarRequisicoesEspaco() {
  const el = document.getElementById("agenda-req-list");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Carregando...</div>`;
  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/requisicoes_espaco?deleted_at=is.null&select=*&order=created_at.desc&limit=300`,
      { headers: apiHeaders() }
    );
    if (!res.ok) throw new Error(await res.text());
    _agReqRows = await res.json();
    _agKpiReq(_agReqRows);
    _agRenderReqTabela();
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}
window.carregarRequisicoesEspaco = carregarRequisicoesEspaco;

async function agAnalisarRequisicao(id) {
  let r = _agReqRows.find(x => x.id === id);
  if (!r) {
    try {
      const res = await fetch(`${apiBaseUrl()}/rest/v1/requisicoes_espaco?id=eq.${id}&select=*&limit=1`, { headers: apiHeaders() });
      const data = await res.json();
      r = Array.isArray(data) ? data[0] : data;
    } catch(e) { T("Erro", e.message); return; }
  }
  if (!r) { T("Requisição não encontrada"); return; }

  const fmtD = d => { if (!d) return "—"; const [y,m,dia] = String(d).slice(0,10).split("-"); return `${dia}/${m}/${y}`; };
  const h = t => { const [hh,mm] = (t||"").split(":"); return hh && mm ? `${hh}:${mm}` : ""; };
  const horario = [h(r.hora_inicio_sol), h(r.hora_fim_sol)].filter(Boolean).join("–") || "dia todo";

  let occsHtml = "";
  const occs = Array.isArray(r.ocupacoes_conflito) ? r.ocupacoes_conflito : [];
  if (occs.length) {
    occsHtml = `<div style="margin-top:6px">
      ${occs.map(o => {
        const hi = h(o.hora_inicio), hf = h(o.hora_fim);
        return `<div style="display:flex;gap:6px;align-items:center;font-size:11px;padding:4px 8px;background:rgba(224,85,85,.07);border-radius:5px;margin-bottom:4px">
          <span style="color:var(--rose);font-size:14px">●</span>
          <span style="color:var(--tx2)">${fmtD(o.data)}${hi ? ` · ${hi}${hf ? "–"+hf : ""}` : ""}</span>
        </div>`;
      }).join("")}
    </div>`;
  }

  const statusOpts = Object.entries(REQ_STATUS).map(([k,v]) =>
    `<option value="${k}" ${r.status === k ? "selected" : ""}>${v.label}</option>`
  ).join("");
  const final = REQ_FINAL.includes(r.status);

  const overlay = document.createElement("div");
  overlay.id = "ag-req-anal-overlay";
  overlay.style.cssText = "position:fixed;inset:0;z-index:9800;background:rgba(0,0,0,.52);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:16px";
  overlay.innerHTML = `
    <div style="background:var(--bg-card);border-radius:13px;max-width:640px;width:100%;max-height:92vh;overflow-y:auto;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;gap:10px;padding:18px 20px 14px;border-bottom:1px solid var(--bd1)">
        <div style="font-size:22px">📨</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:var(--tx1)">${escapeHtml(r.titulo||"—")}</div>
          <div style="font-size:10px;color:var(--orange);font-family:var(--mono)">${escapeHtml(r.protocolo||"")}</div>
        </div>
        ${_agReqPill(r.status)}
        <button onclick="document.getElementById('ag-req-anal-overlay').remove()" style="background:none;border:none;font-size:18px;color:var(--tx3);cursor:pointer;margin-left:4px">✕</button>
      </div>

      <div style="padding:18px 20px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--orange);margin-bottom:10px">Nova requisição</div>
          <div style="font-size:11.5px;color:var(--tx2);line-height:1.8">
            <b style="color:var(--tx1)">Espaço:</b> ${escapeHtml(r.espaco_nome||"—")}<br>
            <b style="color:var(--tx1)">Data:</b> ${fmtD(r.data_solicitada)}<br>
            <b style="color:var(--tx1)">Horário:</b> ${horario}<br>
            <b style="color:var(--tx1)">Tipo:</b> ${escapeHtml(r.tipo_programacao||"—")}<br>
            <b style="color:var(--tx1)">Participantes:</b> ${r.participantes||"—"}<br>
            <b style="color:var(--tx1)">Solicitante:</b> ${escapeHtml(r.solicitante_nome||"—")}${r.solicitante_tel ? ` · ${escapeHtml(r.solicitante_tel)}` : ""}<br>
            <b style="color:var(--tx1)">Justificativa:</b><br>
            <span style="font-size:11px;color:var(--tx3)">${escapeHtml(r.justificativa||"—")}</span>
          </div>
          ${r.aceita_outro_espaco === "Sim" ? `<div style="margin-top:8px;font-size:11px;color:var(--teal)">✓ Aceita outro espaço${r.espacos_alternativos ? `: ${escapeHtml(r.espacos_alternativos)}` : ""}</div>` : ""}
          ${r.aceita_outro_horario === "Sim" ? `<div style="font-size:11px;color:var(--teal)">✓ Aceita outro horário${r.horarios_alternativos ? `: ${escapeHtml(r.horarios_alternativos)}` : ""}</div>` : ""}
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--rose);margin-bottom:10px">Ocupações existentes</div>
          ${occsHtml || `<div style="font-size:11px;color:var(--tx3)">Nenhum dado de ocupação registrado.</div>`}
        </div>
      </div>

      ${!final ? `
      <div style="padding:0 20px 18px;border-top:1px solid var(--bd1);padding-top:14px;margin-top:2px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:10px">Decisão administrativa</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div>
            <label style="font-size:10px;color:var(--tx3)">Novo status</label>
            <select id="req-anal-status" style="width:100%;margin-top:4px;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:7px 10px;outline:none">${statusOpts}</select>
          </div>
          <div>
            <label style="font-size:10px;color:var(--tx3)">Espaço alternativo oferecido</label>
            <input id="req-anal-alt" type="text" value="${escapeHtml(r.espaco_alternativo_oferecido||"")}" placeholder="Opcional" style="width:100%;margin-top:4px;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:7px 10px;outline:none;box-sizing:border-box">
          </div>
        </div>
        <div style="margin-bottom:10px">
          <label style="font-size:10px;color:var(--tx3)">Justificativa / mensagem ao solicitante</label>
          <textarea id="req-anal-just" rows="3" placeholder="Descreva a decisão ou próximo passo..." style="width:100%;margin-top:4px;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:7px 10px;outline:none;resize:vertical;box-sizing:border-box">${escapeHtml(r.decisao_justificativa||"")}</textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button onclick="document.getElementById('ag-req-anal-overlay').remove()" style="padding:7px 16px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx2);font-size:12px;cursor:pointer">Fechar</button>
          <button onclick='agAprovarRequisicao("${r.id}")' style="padding:7px 18px;border-radius:7px;border:1px solid rgba(58,170,92,.4);background:rgba(58,170,92,.12);color:var(--gr);font-size:12px;font-weight:700;cursor:pointer">✓ Liberar Espaço</button>
          <button onclick='agConfirmarDecisaoReq("${r.id}")' style="padding:7px 18px;border-radius:7px;border:none;background:var(--orange);color:#fff;font-size:12px;font-weight:700;cursor:pointer">Salvar decisão</button>
        </div>
      </div>
      ` : `
      <div style="padding:14px 20px 18px;border-top:1px solid var(--bd1)">
        <div style="font-size:11px;color:var(--tx3)">Requisição encerrada. Decisão: <b>${escapeHtml(r.decisao||"—")}</b></div>
        ${r.decisao_justificativa ? `<div style="font-size:11px;color:var(--tx2);margin-top:4px">${escapeHtml(r.decisao_justificativa)}</div>` : ""}
        <div style="display:flex;justify-content:flex-end;margin-top:12px">
          <button onclick="document.getElementById('ag-req-anal-overlay').remove()" style="padding:7px 16px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx2);font-size:12px;cursor:pointer">Fechar</button>
        </div>
      </div>
      `}
    </div>`;

  document.body.appendChild(overlay);
}
window.agAnalisarRequisicao = agAnalisarRequisicao;

async function agConfirmarDecisaoReq(id) {
  const status = document.getElementById("req-anal-status")?.value;
  const just   = document.getElementById("req-anal-just")?.value?.trim();
  const alt    = document.getElementById("req-anal-alt")?.value?.trim();
  if (!status) { T("Selecione um status"); return; }

  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/rpc/admin_atualizar_requisicao`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: id, p_status: status, p_justificativa: just||null, p_espaco_alt: alt||null })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.erro || "Erro ao salvar");
    document.getElementById("ag-req-anal-overlay")?.remove();
    T("Decisão registrada", `Status: ${REQ_STATUS[status]?.label || status}`);
    carregarRequisicoesEspaco();
  } catch(e) { T("Erro ao salvar", e.message); }
}
window.agConfirmarDecisaoReq = agConfirmarDecisaoReq;

async function agAprovarRequisicao(id) {
  if (!confirm("Confirmar liberação do espaço para este solicitante?")) return;
  try {
    const just = document.getElementById("req-anal-just")?.value?.trim() || null;
    const alt  = document.getElementById("req-anal-alt")?.value?.trim()  || null;
    const res  = await fetch(`${apiBaseUrl()}/rest/v1/rpc/admin_atualizar_requisicao`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: id, p_status: "ESPACO_LIBERADO", p_justificativa: just, p_espaco_alt: alt })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.erro || "Erro ao aprovar");
    document.getElementById("ag-req-anal-overlay")?.remove();
    T("Espaço liberado", "Requisição aprovada com sucesso.");
    agCarregarAprovacoes();
  } catch(e) { T("Erro", e.message); }
}
window.agAprovarRequisicao = agAprovarRequisicao;

async function agAtualizarRequisicao(id, status) {
  if (!confirm(`Confirmar status: ${REQ_STATUS[status]?.label || status}?`)) return;
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/rpc/admin_atualizar_requisicao`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: id, p_status: status })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.erro || "Erro");
    T("Status atualizado");
    carregarRequisicoesEspaco();
  } catch(e) { T("Erro", e.message); }
}
window.agAtualizarRequisicao = agAtualizarRequisicao;
