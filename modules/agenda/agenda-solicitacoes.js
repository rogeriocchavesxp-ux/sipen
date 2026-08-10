/* ── SOLICITAÇÕES DE AGENDAMENTO ─────────────────────────────── */

const AG_STATUS = {
  "pendente":             { label: "Aguardando aprovação", cor: "var(--amber)"  },
  "aguardando_aprovacao": { label: "Aguardando aprovação", cor: "var(--amber)"  },
  "em_analise":           { label: "Em análise",           cor: "var(--sky)"    },
  "ajuste_solicitado":    { label: "Ajuste solicitado",    cor: "var(--orange)" },
  "confirmado":           { label: "Aprovada",             cor: "var(--gr)"     },
  "recusado":             { label: "Recusada",             cor: "var(--rose)"   },
  "cancelado":            { label: "Cancelada",            cor: "var(--tx3)"    },
};

function _agPill(status) {
  const cfg = AG_STATUS[status] || { label: status || "—", cor: "var(--tx3)" };
  return `<span style="font-size:9.5px;padding:2px 9px;border-radius:10px;background:${cfg.cor}18;color:${cfg.cor};border:1px solid ${cfg.cor}33;font-weight:700;white-space:nowrap">${escapeHtml(cfg.label)}</span>`;
}

let _agSolFiltro = "";
let _agSolRows   = [];

window.agFiltrarSolStatus = function(status) {
  _agSolFiltro = _agSolFiltro === status ? "" : status;
  _agRenderSolTabela();
};

function _agKpiSol(rows) {
  const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  s("sol-aguard",  rows.filter(r => ["pendente","aguardando_aprovacao"].includes(r.status)).length);
  s("sol-analise", rows.filter(r => r.status === "em_analise").length);
  s("sol-ajuste",  rows.filter(r => r.status === "ajuste_solicitado").length);
  s("sol-aprov",   rows.filter(r => r.status === "confirmado").length);
  s("sol-recus",   rows.filter(r => r.status === "recusado").length);
}

function _agRenderSolTabela() {
  const el = document.getElementById("agenda-sol-list");
  if (!el) return;
  const fmtD = d => { if (!d) return "—"; const [y,m,dia] = String(d).slice(0,10).split("-"); return `${dia}/${m}/${y}`; };
  const pendente = s => ["pendente","aguardando_aprovacao","em_analise","ajuste_solicitado"].includes(s);
  const rows = _agSolFiltro === "__todas"
    ? _agSolRows
    : _agSolFiltro
    ? _agSolRows.filter(r => {
        if (_agSolFiltro === "aguardando") return ["pendente","aguardando_aprovacao"].includes(r.status);
        return r.status === _agSolFiltro;
      })
    : _agSolRows.filter(r => pendente(r.status));

  if (!rows.length) {
    el.innerHTML = `<div style="text-align:center;padding:28px;color:var(--tx3)">
      <div style="font-size:28px;margin-bottom:8px">📭</div>
      <div style="font-size:12px">Nenhuma solicitação ${_agSolFiltro ? "com esse status " : ""}pendente encontrada.</div>
    </div>`;
    return;
  }
  const thStyle = `text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)`;

  el.innerHTML = `<div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:11.5px;table-layout:fixed">
      <colgroup>
        <col style="width:130px">
        <col style="width:220px">
        <col style="width:150px">
        <col style="width:180px">
        <col style="width:110px">
        <col style="width:120px">
        <col style="width:160px">
      </colgroup>
      <thead><tr style="border-bottom:1px solid var(--bd2);background:var(--bg-surface)">
        <th style="${thStyle}">Protocolo</th>
        <th style="${thStyle}">Título</th>
        <th style="${thStyle}">Solicitante</th>
        <th style="${thStyle}">Data / Espaço</th>
        <th style="${thStyle}">Status</th>
        <th style="${thStyle}">Termo</th>
        <th style="text-align:right;padding:7px 10px;font-size:9.5px;color:var(--tx3)">Ações</th>
      </tr></thead>
      <tbody>${rows.map(r => {
        const ativa = pendente(r.status);
        const termoBadge = st => {
          if (st === "aceito")     return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700;background:rgba(42,158,82,.12);color:var(--gr);border:1px solid rgba(42,158,82,.28)">✅ Aceito</span>`;
          if (st === "aguardando") return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700;background:rgba(176,125,16,.10);color:#b07d10;border:1px solid rgba(176,125,16,.22)">⏳ Pendente</span>`;
          return `<span style="color:var(--tx3);font-size:10px">—</span>`;
        };
        return `<tr style="border-bottom:1px solid var(--bd1)" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
          <td style="padding:8px 10px;font-family:var(--mono);font-size:10px;color:var(--tx3)">${escapeHtml(r.protocolo||"—")}</td>
          <td style="padding:8px 10px;color:var(--tx1);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(r.titulo||'')}">${escapeHtml(r.titulo||"—")}</td>
          <td style="padding:8px 10px;color:var(--tx2);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.solicitante_txt||r.solicitante||"—")}</td>
          <td style="padding:8px 10px;color:var(--tx2);font-size:11px;white-space:nowrap">
            ${r.data ? fmtD(r.data) : "—"}
            ${r.hora_inicio ? `<div style="font-size:10px;color:var(--tx3)">${String(r.hora_inicio).slice(0,5)}${r.hora_fim ? " → " + String(r.hora_fim).slice(0,5) : ""}</div>` : ""}
            ${r.espaco ? `<div style="font-size:10px;color:var(--tx3)">${escapeHtml(r.espaco)}</div>` : ""}
          </td>
          <td style="padding:8px 10px">${_agPill(r.status)}</td>
          <td style="padding:8px 10px">${termoBadge(r.status_termo)}</td>
          <td style="padding:8px 10px;text-align:right;white-space:nowrap">
            <div style="display:flex;gap:4px;justify-content:flex-end;align-items:center">
              <button onclick='agAnalisarSolicitacao("${r.id}")' style="padding:3px 9px;border-radius:4px;border:1px solid var(--bd1);background:var(--bg-card);color:var(--tx2);font-size:10px;cursor:pointer">Analisar</button>
              ${ativa ? `
                <button onclick='agAprovarAgendamento("${r.id}")' style="padding:3px 9px;border-radius:4px;border:1px solid rgba(58,170,92,.4);background:rgba(58,170,92,.1);color:var(--gr);font-size:10px;font-weight:700;cursor:pointer">✓ Aprovar</button>
                <button onclick='agRejeitarAgendamento("${r.id}")' style="padding:3px 9px;border-radius:4px;border:1px solid rgba(224,85,85,.35);background:rgba(224,85,85,.08);color:var(--rose);font-size:10px;font-weight:700;cursor:pointer">✕ Recusar</button>
              ` : ""}
              <div style="position:relative;display:inline-block">
                <button onclick='agSolKebab(this,"${r.id}")' style="padding:3px 7px;border-radius:4px;border:1px solid var(--bd1);background:var(--bg-card);color:var(--tx2);font-size:13px;cursor:pointer;line-height:1">⋯</button>
              </div>
            </div>
          </td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>`;
}

async function carregarSolicitacoesAgenda() {
  const el = document.getElementById("agenda-sol-list");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Carregando...</div>`;
  try {
    const [resAg, resReq] = await Promise.all([
      fetch(`${apiBaseUrl()}/rest/v1/agenda?deleted_at=is.null&select=*&order=created_at.desc&limit=300`, { headers: apiHeaders() }),
      fetch(`${apiBaseUrl()}/rest/v1/requisicoes_espaco?deleted_at=is.null&select=*&order=created_at.desc&limit=200`, { headers: apiHeaders() }),
    ]);
    if (!resAg.ok) throw new Error(await resAg.text());
    _agSolRows = await resAg.json();
    _agReqRows = resReq.ok ? await resReq.json() : [];
    _agKpiSol(_agSolRows);
    _agKpiReq(_agReqRows);
    _agRenderSolTabela();
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}
window.carregarSolicitacoesAgenda = carregarSolicitacoesAgenda;

async function agAnalisarSolicitacao(id) {
  let r = _agSolRows.find(x => x.id === id);
  if (!r) {
    try {
      const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${id}&select=*&limit=1`, { headers: apiHeaders() });
      const data = await res.json();
      r = Array.isArray(data) ? data[0] : data;
    } catch (e) { T("Erro", e.message); return; }
  }
  if (!r) { T("Não encontrado", "Agendamento não encontrado."); return; }

  const fmtD = d => { if (!d) return "—"; const [y,m,dia] = String(d).slice(0,10).split("-"); return `${dia}/${m}/${y}`; };
  const fmtH = h => h ? String(h).slice(0,5) : null;
  const lbl  = (titulo, val) => val ? `<div style="flex:1;min-width:160px"><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px">${titulo}</div><div style="font-size:12.5px;color:var(--tx1)">${escapeHtml(String(val))}</div></div>` : "";

  const pendente = ["pendente","aguardando_aprovacao","em_analise","ajuste_solicitado"].includes(r.status);

  let modal = document.getElementById("ag-analisar-modal");
  if (!modal) { modal = document.createElement("div"); modal.id = "ag-analisar-modal"; document.body.appendChild(modal); }
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:340;display:flex;align-items:flex-start;justify-content:center;padding:24px 0;overflow-y:auto";

  modal.innerHTML = `
    <div style="width:min(680px,96vw);background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;box-shadow:0 10px 50px rgba(0,0,0,.3)">
      <div style="padding:20px 24px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:flex-start;gap:14px">
        <div style="flex:1">
          <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px">Analisar Solicitação de Agendamento</div>
          <div style="font-size:17px;font-weight:800;color:var(--tx1);line-height:1.3">${escapeHtml(r.titulo || "—")}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap">
            ${_agPill(r.status)}
            ${r.protocolo ? `<span style="font-size:10px;font-family:var(--mono);color:var(--tx3);background:var(--bg-surface);padding:2px 8px;border-radius:6px;border:1px solid var(--bd1)">${escapeHtml(r.protocolo)}</span>` : ""}
            <span style="font-size:10px;color:var(--tx3)">Recebida em ${fmtD(r.created_at||r.criado_em)}</span>
          </div>
        </div>
        <button onclick="document.getElementById('ag-analisar-modal')?.remove()" style="background:none;border:none;color:var(--tx3);font-size:20px;cursor:pointer;padding:0;line-height:1">✕</button>
      </div>
      <div style="padding:20px 24px;display:flex;flex-direction:column;gap:18px">
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Solicitante</div>
          <div style="display:flex;flex-wrap:wrap;gap:12px">
            ${lbl("Nome", r.solicitante_txt || r.solicitante || r.organizador)}
            ${lbl("WhatsApp", r.solicitante_tel || r.telefone)}
            ${lbl("Ministério / Origem", r.organizador || r.origem)}
          </div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Agendamento solicitado</div>
          <div style="display:flex;flex-wrap:wrap;gap:12px">
            ${lbl("Data", fmtD(r.data))}
            ${lbl("Horário início", fmtH(r.hora_inicio))}
            ${lbl("Horário fim", fmtH(r.hora_fim))}
            ${lbl("Espaço / Ambiente", r.espaco)}
            ${lbl("Recorrência", r.recorrencia)}
          </div>
        </div>
        ${r.descricao ? `<div>
          <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Descrição</div>
          <div style="font-size:12.5px;color:var(--tx1);white-space:pre-wrap;background:var(--bg-surface);border:1px solid var(--bd1);border-radius:8px;padding:12px 14px;line-height:1.6">${escapeHtml(r.descricao)}</div>
        </div>` : ""}
        ${r.status === "confirmado" ? `<div style="background:rgba(58,170,92,.1);border:1px solid rgba(58,170,92,.3);border-radius:8px;padding:12px 14px">
          <div style="font-size:11px;font-weight:700;color:var(--gr);margin-bottom:4px">✅ Aprovada por ${escapeHtml(r.aprovado_por_nome||"—")}</div>
          <div style="font-size:11px;color:var(--tx2)">${r.aprovado_em ? fmtD(r.aprovado_em) : "—"}</div>
        </div>` : ""}
        ${r.status === "recusado" ? `<div style="background:rgba(224,85,85,.08);border:1px solid rgba(224,85,85,.3);border-radius:8px;padding:12px 14px">
          <div style="font-size:11px;font-weight:700;color:var(--rose);margin-bottom:4px">🚫 Recusada</div>
          ${r.motivo_rejeicao ? `<div style="font-size:11.5px;color:var(--tx2)">${escapeHtml(r.motivo_rejeicao)}</div>` : ""}
        </div>` : ""}
        ${r.status === "ajuste_solicitado" ? `<div style="background:rgba(234,88,12,.08);border:1px solid rgba(234,88,12,.3);border-radius:8px;padding:12px 14px">
          <div style="font-size:11px;font-weight:700;color:var(--orange)">🔄 Aguardando ajuste do solicitante</div>
        </div>` : ""}
      </div>
      <div style="padding:14px 24px 20px;border-top:1px solid var(--bd1);display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        <button onclick="document.getElementById('ag-analisar-modal')?.remove()" style="padding:8px 16px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12.5px;cursor:pointer">Fechar</button>
        ${pendente ? `
          <button onclick="document.getElementById('ag-analisar-modal')?.remove();agSolicitarAjuste('${r.id}')" style="padding:8px 16px;border-radius:7px;border:1px solid rgba(234,88,12,.4);background:rgba(234,88,12,.08);color:var(--orange);font-size:12.5px;font-weight:600;cursor:pointer">🔄 Solicitar ajuste</button>
          <button onclick="document.getElementById('ag-analisar-modal')?.remove();agRejeitarAgendamento('${r.id}')" style="padding:8px 16px;border-radius:7px;border:1px solid rgba(224,85,85,.4);background:rgba(224,85,85,.08);color:var(--rose);font-size:12.5px;font-weight:600;cursor:pointer">🚫 Recusar</button>
          <button onclick="document.getElementById('ag-analisar-modal')?.remove();agAprovarAgendamento('${r.id}')" style="padding:8px 18px;border-radius:7px;border:none;background:var(--gr);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">✅ Aprovar agendamento</button>
        ` : ""}
      </div>
    </div>`;
}
window.agAnalisarSolicitacao = agAnalisarSolicitacao;

async function agSolicitarAjuste(id) {
  let modal = document.getElementById("ag-ajuste-modal");
  if (!modal) { modal = document.createElement("div"); modal.id = "ag-ajuste-modal"; document.body.appendChild(modal); }
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:350;display:flex;align-items:center;justify-content:center";
  modal.innerHTML = `
    <div style="width:min(460px,94vw);background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;padding:24px;box-shadow:0 8px 40px rgba(0,0,0,.3)">
      <div style="font-size:15px;font-weight:700;color:var(--tx1);margin-bottom:6px">Solicitar ajuste</div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:16px">Informe o que precisa ser corrigido ou complementado pelo solicitante. Ele receberá a orientação via WhatsApp.</div>
      <label style="font-size:9.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em">Orientação ao solicitante *</label>
      <textarea id="ag-ajuste-texto" rows="4" placeholder="Ex.: Por favor, informe o horário exato de início e término, e se haverá uso de sonorização." style="width:100%;margin-top:6px;padding:9px 11px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input);color:var(--tx1);font-size:12.5px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box"></textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
        <button onclick="document.getElementById('ag-ajuste-modal')?.remove()" style="padding:8px 16px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12.5px;cursor:pointer">Cancelar</button>
        <button onclick="agConfirmarAjuste('${id}')" style="padding:8px 18px;border-radius:7px;border:none;background:var(--orange);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">Enviar orientação</button>
      </div>
    </div>`;
}
window.agSolicitarAjuste = agSolicitarAjuste;

async function agConfirmarAjuste(id) {
  const texto = document.getElementById("ag-ajuste-texto")?.value?.trim();
  if (!texto) { T("Campo obrigatório", "Informe a orientação antes de enviar."); return; }
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify({ status: "ajuste_solicitado", atualizado_em: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    const r    = Array.isArray(rows) ? rows[0] : rows;

    _comSyncStatus(id, "ajuste", texto);

    const tel = r?.telefone || r?.solicitante_tel;
    const nome = r?.solicitante_txt || r?.solicitante || "";
    if (tel && typeof WA !== "undefined") {
      WA.send({
        para: tel, nome,
        mensagem: `Olá${nome ? ", " + nome.split(" ")[0] : ""}! Sua solicitação de agendamento *"${r?.titulo || ""}"* precisa de ajustes.\n\n📋 Orientação: ${texto}\n\n${r?.protocolo ? "🔖 Protocolo: " + r.protocolo : ""}`,
        modulo: "AGENDA", referenciaT: "agenda", referenciaId: id, chave: `AG_AJUSTE_${id}`,
      }).catch(() => {});
    }

    document.getElementById("ag-ajuste-modal")?.remove();
    T("Ajuste solicitado.", "O solicitante será notificado.");
    _agendaCache = null;
    carregarSolicitacoesAgenda();
  } catch(e) { T("Erro", e.message); }
}
window.agConfirmarAjuste = agConfirmarAjuste;

async function agEmAnalise(id) {
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/demandas?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ status: "Em Andamento" })
    });
    if (!res.ok) throw new Error(await res.text());
    T("Status atualizado", "Demanda marcada como Em Andamento.");
    carregarSolicitacoesAgenda();
  } catch(e) { T("Erro", e.message); }
}
window.agEmAnalise = agEmAnalise;

async function agRecusarSolicitacao(id) {
  if (!confirm("Recusar esta solicitação de agendamento?")) return;
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/demandas?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ status: "Cancelado" })
    });
    if (!res.ok) throw new Error(await res.text());
    T("Solicitação recusada", "Status atualizado para Cancelado.");
    carregarSolicitacoesAgenda();
  } catch(e) { T("Erro ao recusar", e.message); }
}
window.agRecusarSolicitacao = agRecusarSolicitacao;

function agAprovarSolicitacao(r) {
  let modal = document.getElementById("ag-aprov-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "ag-aprov-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:340;display:flex;align-items:center;justify-content:center";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div style="width:min(600px,94vw);max-height:90vh;overflow:auto;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:24px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
      <div style="font-size:22px">✅</div>
      <div>
        <div style="font-size:14px;font-weight:800;color:var(--tx1)">Confirmar e aprovar evento</div>
        <div style="font-size:10.5px;color:var(--tx3)">${escapeHtml(r.titulo||"—")}${r.solicitante_txt ? " · " + escapeHtml(r.solicitante_txt) : ""}</div>
      </div>
      <button onclick="document.getElementById('ag-aprov-modal')?.remove()" style="margin-left:auto;background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div style="grid-column:1/-1"><label class="flb">Título do evento *</label><input id="ag-ap-titulo" class="fi2" value="${escapeHtml(r.titulo||'')}" placeholder="Título do evento na agenda"></div>
      <div><label class="flb">Data *</label><input id="ag-ap-data" type="date" class="fi2" value="${escapeHtml(r.data||'')}"></div>
      <div><label class="flb">Horário início *</label><input id="ag-ap-hi" type="time" class="fi2" value="${escapeHtml(String(r.hora_inicio||'08:00').slice(0,5))}"></div>
      <div><label class="flb">Horário fim</label><input id="ag-ap-hf" type="time" class="fi2" value="${escapeHtml(String(r.hora_fim||'10:00').slice(0,5))}"></div>
      <div><label class="flb">Espaço / Ambiente</label>${agSalasSelect("ag-ap-esp", r.espaco_id || r.espaco || "")}</div>
      <div style="grid-column:1/-1"><label class="flb">Organizador</label><input id="ag-ap-org" class="fi2" value="${escapeHtml(r.organizador||r.responsavel||r.solicitante_txt||'')}" placeholder="Responsável pelo evento"></div>
    </div>
    <label style="display:flex;align-items:center;gap:9px;margin-top:14px;cursor:pointer;user-select:none">
      <input type="checkbox" id="ag-ap-interno" ${r.visibilidade === "interna" ? "checked" : ""} style="width:16px;height:16px;accent-color:var(--sky);cursor:pointer">
      <span style="font-size:12.5px;color:var(--tx2)">Atividade interna <span style="color:var(--tx3);font-size:11px">— não aparece na Área do Membro</span></span>
    </label>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
      <button class="btn" onclick="document.getElementById('ag-aprov-modal')?.remove()">Cancelar</button>
      <button class="btn btn-p" onclick="_agSalvarDetalhesEAprovar('${r.id}')">Confirmar e aprovar</button>
    </div>
  </div>`;
  agSalasSelectPopular("ag-ap-esp");
}
window.agAprovarSolicitacao = agAprovarSolicitacao;

async function _agSalvarDetalhesEAprovar(agendaId) {
  const titulo  = (document.getElementById("ag-ap-titulo")?.value || "").trim();
  const data    = document.getElementById("ag-ap-data")?.value || "";
  const hi      = document.getElementById("ag-ap-hi")?.value || "";
  const hf      = document.getElementById("ag-ap-hf")?.value || null;
  const espEl   = document.getElementById("ag-ap-esp");
  const espId   = espEl?.value?.trim() || null;
  const espNome = espEl?.selectedOptions[0]?.dataset?.nome || null;
  const org     = (document.getElementById("ag-ap-org")?.value || "").trim() || null;

  if (!titulo || !data || !hi) return T("Campos obrigatórios", "Preencha título, data e horário de início.");

  const nomeMeses  = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const diasSemana = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
  const dt = new Date(data + "T12:00:00");

  try {
    const resPatch = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${agendaId}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({
        titulo,
        data,
        hora_inicio:  hi,
        hora_fim:     hf,
        espaco:       espNome,
        espaco_id:    espId,
        organizador:  org,
        mes:          nomeMeses[dt.getMonth()],
        dia_semana:   diasSemana[dt.getDay()],
        visibilidade: document.getElementById("ag-ap-interno")?.checked ? "interna" : "publica",
      }),
    });
    if (!resPatch.ok) throw new Error(await resPatch.text());

    document.getElementById("ag-aprov-modal")?.remove();
    await agAprovarAgendamento(agendaId);
  } catch(e) { T("Erro ao aprovar", e.message); }
}
window._agSalvarDetalhesEAprovar = _agSalvarDetalhesEAprovar;

async function detectarConflitos() {
  const el = document.getElementById("ag-conflitos-list");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Verificando conflitos...</div>`;
  try {
    const rows = await getAgenda();
    const conflitos = [];
    for (let i = 0; i < rows.length; i++) {
      for (let j = i+1; j < rows.length; j++) {
        const a = rows[i], b = rows[j];
        if (!a.espaco || !b.espaco) continue;
        if (a.espaco.toLowerCase() !== b.espaco.toLowerCase()) continue;
        const aIni = (a.data || "") + "T" + (a.hora_inicio || "00:00");
        const aFim = (a.data_encerramento || a.data || "") + "T" + (a.hora_fim || "23:59");
        const bIni = (b.data || "") + "T" + (b.hora_inicio || "00:00");
        const bFim = (b.data_encerramento || b.data || "") + "T" + (b.hora_fim || "23:59");
        if (aIni < bFim && bIni < aFim) conflitos.push([a,b]);
      }
    }
    if (!conflitos.length) {
      el.innerHTML = `<div style="text-align:center;padding:24px;color:var(--gr)">
        <div style="font-size:28px;margin-bottom:8px">✅</div>
        <div style="font-size:12px;font-weight:600">Nenhum conflito detectado!</div>
        <div style="font-size:10.5px;color:var(--tx3);margin-top:4px">Todos os espaços estão livres nos horários agendados</div>
      </div>`;
      return;
    }
    el.innerHTML = `
      <div style="font-size:10px;color:var(--rose);margin-bottom:10px;font-weight:600">⚠️ ${conflitos.length} conflito${conflitos.length>1?"s":""} encontrado${conflitos.length>1?"s":""}</div>
      ${conflitos.map(([a,b])=>`
        <div style="background:rgba(224,85,85,0.07);border:1px solid rgba(224,85,85,0.2);border-radius:6px;padding:10px 12px;margin-bottom:8px">
          <div style="font-size:10px;color:var(--rose);font-weight:600;margin-bottom:6px">📍 ${escapeHtml(a.espaco)} · ${a.data}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div style="background:var(--bg-surface);border-radius:4px;padding:7px 9px">
              <div style="font-size:11px;font-weight:600;color:var(--tx1)">${escapeHtml(a.titulo)}</div>
              <div style="font-size:10px;color:var(--tx3)">${a.hora_inicio||"—"} → ${a.hora_fim||"—"}</div>
              <div style="font-size:10px;color:var(--tx3)">${escapeHtml(a.organizador||"—")}</div>
            </div>
            <div style="background:var(--bg-surface);border-radius:4px;padding:7px 9px">
              <div style="font-size:11px;font-weight:600;color:var(--tx1)">${escapeHtml(b.titulo)}</div>
              <div style="font-size:10px;color:var(--tx3)">${b.hora_inicio||"—"} → ${b.hora_fim||"—"}</div>
              <div style="font-size:10px;color:var(--tx3)">${escapeHtml(b.organizador||"—")}</div>
            </div>
          </div>
        </div>`).join("")}`;
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose)">Erro: ${escapeHtml(e.message)}</div>`;
  }
}
window.detectarConflitos = detectarConflitos;

async function carregarHistorico() {
  const el = document.getElementById("ag-hist-list");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Carregando...</div>`;
  try {
    _agendaCache = null;
    const rows = await getAgenda();
    const hoje = new Date().toISOString().split("T")[0];
    const passados = rows.filter(r => r.data < hoje).sort((a,b) => b.data.localeCompare(a.data)||(b.hora_inicio||"").localeCompare(a.hora_inicio||""));
    renderModuloList(passados, "AGENDA", "ag-hist-list");
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose)">Erro: ${escapeHtml(e.message)}</div>`;
  }
}
window.carregarHistorico = carregarHistorico;

