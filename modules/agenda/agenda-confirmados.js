/* ── CONFIRMADOS: lista, termo e kebab menu ──────────────────── */
let _agConfRows = [];

async function agCarregarConfirmados() {
  const el = document.getElementById("ag-conf-list");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${typeof spinner==="function"?spinner():"⏳"} Carregando...</div>`;
  try {
    const url = `${apiBaseUrl()}/rest/v1/agenda?status=eq.confirmado&deleted_at=is.null&or=(recorrencia.neq.Data%20Especial,recorrencia.is.null)&order=data.desc&select=*`;
    const res = await fetch(url, { headers: apiHeaders() });
    if (!res.ok) throw new Error(await res.text());
    _agConfRows = await res.json();
    _agRenderConfirmados();
  } catch(e) {
    const el2 = document.getElementById("ag-conf-list");
    if (el2) el2.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}
window.agCarregarConfirmados = agCarregarConfirmados;

function _agRenderConfirmados() {
  const el = document.getElementById("ag-conf-list");
  if (!el) return;
  const _hoje = new Date();
  const _mesCorrente = `${_hoje.getFullYear()}-${String(_hoje.getMonth()+1).padStart(2,"0")}`;
  const mesSel = (document.getElementById("ag-conf-mes-sel") || {}).value || _mesCorrente;
  const rows = mesSel ? _agConfRows.filter(r => r.data && r.data.slice(0,7) === mesSel) : _agConfRows;

  const meses = [...new Set(_agConfRows.map(r => r.data ? r.data.slice(0,7) : "").filter(Boolean))].sort().reverse();
  const nomeMes = m => { const [y,mo] = m.split("-"); return ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][parseInt(mo)-1] + " " + y; };

  if (!_agConfRows.length) {
    el.innerHTML = `<div style="text-align:center;padding:32px 0;color:var(--tx3)"><div style="font-size:28px;margin-bottom:8px">📭</div><div style="font-size:12px">Nenhum agendamento confirmado</div></div>`;
    return;
  }

  const termoBadge = st => {
    if (st === "aceito")     return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:9.5px;font-weight:700;background:rgba(42,158,82,.12);color:var(--gr);border:1px solid rgba(42,158,82,.3)">✅ Termo aceito</span>`;
    if (st === "aguardando") return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:9.5px;font-weight:700;background:rgba(176,125,16,.10);color:#b07d10;border:1px solid rgba(176,125,16,.25)">⏳ Aguardando termo</span>`;
    return `<span style="padding:2px 8px;border-radius:12px;font-size:9.5px;background:var(--bg-surface);color:var(--tx3);border:1px solid var(--bd1)">—</span>`;
  };
  const fmtD = d => { if(!d)return"—"; const[y,m,dia]=String(d).slice(0,10).split("-"); return`${dia}/${m}/${y}`; };
  const fmtH = h => h ? String(h).slice(0,5) : "";

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap">
      <div style="font-size:10px;color:var(--tx3)">${rows.length} de ${_agConfRows.length} confirmado${_agConfRows.length!==1?"s":""}</div>
      <select id="ag-conf-mes-sel" onchange="_agRenderConfirmados()" style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:5px 10px;outline:none;cursor:pointer">
        <option value="">Todos os meses</option>
        ${meses.map(m => `<option value="${m}" ${m===mesSel?"selected":""}>${nomeMes(m)}</option>`).join("")}
      </select>
    </div>
    ${rows.length ? `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:11.5px">
        <thead>
          <tr style="background:var(--bg-surface);border-bottom:2px solid var(--teal)">
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Título</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Data</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Horário</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Espaço</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Responsável</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Visibilidade</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Termo</th>
            <th style="padding:9px 10px;width:40px"></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid var(--bd1);transition:background .1s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
              <td style="padding:8px 10px;color:var(--tx1);font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.titulo||"—")}</td>
              <td style="padding:8px 10px;color:var(--tx2);white-space:nowrap">${fmtD(r.data)}${r.data_encerramento && r.data_encerramento !== r.data ? `<span style="color:var(--tx3)"> → </span>${fmtD(r.data_encerramento)}` : ""}</td>
              <td style="padding:8px 10px;color:var(--tx2);white-space:nowrap">${fmtH(r.hora_inicio)}${r.hora_fim?" → "+fmtH(r.hora_fim):""}</td>
              <td style="padding:8px 10px;color:var(--tx2);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.espaco||"—")}</td>
              <td style="padding:8px 10px;color:var(--tx2);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.solicitante_txt||"—")}</td>
              <td style="padding:8px 10px">
                <span onclick="agToggleVisibilidade('${r.id}',this)" data-vis="${r.visibilidade||'publica'}"
                  style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:12px;font-size:9.5px;font-weight:700;cursor:pointer;transition:all .15s;${(r.visibilidade||'publica')==='interna'?"background:rgba(74,156,245,.12);color:var(--sky);border:1px solid rgba(74,156,245,.3)":"background:rgba(58,170,92,.1);color:var(--gr);border:1px solid rgba(58,170,92,.3)"}">
                  ${(r.visibilidade||'publica')==='interna'?"🔒 Interna":"🌐 Pública"}
                </span>
              </td>
              <td style="padding:8px 10px">${termoBadge(r.status_termo)}</td>
              <td style="padding:8px 6px;position:relative">
                <button onclick="agConfKebab(this,'${r.id}')" style="padding:3px 7px;border-radius:4px;border:1px solid var(--bd1);background:var(--bg-card);color:var(--tx2);font-size:13px;cursor:pointer;line-height:1">⋯</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>` : `<div style="text-align:center;padding:24px 0;color:var(--tx3);font-size:12px">Nenhum evento neste mês.</div>`}`;
}
window._agRenderConfirmados = _agRenderConfirmados;

async function agToggleVisibilidade(id, el) {
  const atual = el.dataset.vis || "publica";
  const nova  = atual === "interna" ? "publica" : "interna";
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ visibilidade: nova }),
    });
    if (!res.ok) throw new Error(await res.text());
    el.dataset.vis = nova;
    el.textContent = nova === "interna" ? "🔒 Interna" : "🌐 Pública";
    el.style.background    = nova === "interna" ? "rgba(74,156,245,.12)" : "rgba(58,170,92,.1)";
    el.style.color         = nova === "interna" ? "var(--sky)"           : "var(--gr)";
    el.style.borderColor   = nova === "interna" ? "rgba(74,156,245,.3)"  : "rgba(58,170,92,.3)";
    const row = _agConfRows.find(r => r.id === id);
    if (row) row.visibilidade = nova;
  } catch(e) { T("Erro", e.message); }
}
window.agToggleVisibilidade = agToggleVisibilidade;

function agConfKebab(btn, id) {
  document.querySelectorAll(".ag-kebab-menu").forEach(m => m.remove());
  const r = _agConfRows.find(x => x.id === id);
  const menu = document.createElement("div");
  menu.className = "ag-kebab-menu";
  menu.style.cssText = "position:absolute;right:0;top:calc(100% + 4px);z-index:200;background:var(--bg-card);border:1px solid var(--bd2);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);min-width:190px;overflow:hidden";
  const rJson = JSON.stringify(r||{}).replace(/'/g,"&#39;");
  menu.innerHTML = `
    <button onclick='agAbrirForm(JSON.parse(this.dataset.r))' data-r='${rJson}' style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;border:none;background:transparent;color:var(--tx1);font-size:12px;cursor:pointer;text-align:left" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'">
      ✏️ Editar
    </button>
    <button onclick='agReenviarTermoConf("${id}")' style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;border:none;background:transparent;color:var(--tx1);font-size:12px;cursor:pointer;text-align:left" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'">
      📲 Reenviar Termo
    </button>
    <div style="height:1px;background:var(--bd1);margin:0 10px"></div>
    <button onclick='agExcluirSolicitacao("${id}")' style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;border:none;background:transparent;color:var(--rose);font-size:12px;cursor:pointer;text-align:left" onmouseover="this.style.background='rgba(224,85,85,.08)'" onmouseout="this.style.background='transparent'">
      🗑 Excluir
    </button>`;
  btn.parentElement.appendChild(menu);
  const close = e => { if (!menu.contains(e.target) && e.target !== btn) { menu.remove(); document.removeEventListener("click", close); } };
  setTimeout(() => document.addEventListener("click", close), 0);
}
window.agConfKebab = agConfKebab;

async function agReenviarTermoConf(id) {
  document.querySelectorAll(".ag-kebab-menu").forEach(m => m.remove());
  let r = _agConfRows.find(x => x.id === id);
  if (!r) return;

  if (!r.token_termo) {
    const novoToken = crypto.randomUUID();
    try {
      const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${id}`, {
        method: "PATCH",
        headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify({ token_termo: novoToken }),
      });
      if (!res.ok) throw new Error(await res.text());
      r = { ...r, token_termo: novoToken };
      const idx = _agConfRows.findIndex(x => x.id === id);
      if (idx !== -1) _agConfRows[idx] = r;
    } catch(e) {
      T("Erro ao gerar token", e.message);
      return;
    }
  }

  const _tel = r?.solicitante_tel || r?.telefone;
  const nome  = (r.solicitante_txt || "").split(" ")[0] || "";
  const fmtD  = s => { if (!s) return ""; const [y,m,d] = String(s).slice(0,10).split("-"); return `${d}/${m}/${y}`; };
  const msg = `Olá${nome ? `, ${nome}` : ""}! Segue novamente o link do *Termo de Compromisso e Responsabilidade* referente ao seu agendamento:\n\n`
    + `📋 *${r.titulo || "Agendamento"}*\n`
    + (r.data ? `📅 ${fmtD(r.data)}\n` : "")
    + (r.espaco ? `📍 ${r.espaco}\n` : "")
    + (r.protocolo ? `🔖 Protocolo: ${r.protocolo}\n` : "")
    + `\n📄 *Termo de Compromisso:*\nhttps://sipen.com.br/termo?t=${r.token_termo}\n\n⚠️ *Atenção:* o agendamento só é concluído após a leitura e assinatura do Termo de Compromisso e Responsabilidade.\n\n_Por favor, acesse o link acima e assine para confirmar o uso do espaço._`;
  if (typeof WA !== "undefined" && _tel) {
    WA.send({ para: _tel, nome: r.solicitante_txt || "Solicitante", mensagem: msg, modulo: "AGENDA", origem_id: id });
    T("Termo reenviado", `Link enviado para ${_tel}.`);
  } else {
    const link = `https://sipen.com.br/termo?t=${r.token_termo}`;
    navigator.clipboard?.writeText(link).catch(()=>{});
    T("Link copiado", "Link do termo copiado para a área de transferência.");
  }
}
window.agReenviarTermoConf = agReenviarTermoConf;

function agSolKebab(btn, id) {
  document.querySelectorAll(".ag-kebab-menu").forEach(m => m.remove());
  const r = _agSolRows.find(x => x.id === id);
  const temTermo = r?.token_termo && (r?.solicitante_tel || r?.telefone);
  const menu = document.createElement("div");
  menu.className = "ag-kebab-menu";
  menu.style.cssText = "position:absolute;right:0;top:calc(100% + 4px);z-index:200;background:var(--bg-card);border:1px solid var(--bd2);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);min-width:180px;overflow:hidden";
  const rJson = JSON.stringify(r||{}).replace(/'/g,"&#39;");
  menu.innerHTML = `
    <button onclick='agAbrirForm(JSON.parse(this.dataset.r))' data-r='${rJson}' style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;border:none;background:transparent;color:var(--tx1);font-size:12px;cursor:pointer;text-align:left" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'">
      ✏️ Editar
    </button>
    ${temTermo ? `
    <button onclick='agReenviarTermo("${id}")' style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;border:none;background:transparent;color:var(--tx1);font-size:12px;cursor:pointer;text-align:left" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'">
      📲 Reenviar Termo
    </button>` : ""}
    <div style="height:1px;background:var(--bd1);margin:0 10px"></div>
    <button onclick='agExcluirSolicitacao("${id}")' style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;border:none;background:transparent;color:var(--rose);font-size:12px;cursor:pointer;text-align:left" onmouseover="this.style.background='rgba(224,85,85,.08)'" onmouseout="this.style.background='transparent'">
      🗑 Excluir
    </button>`;
  btn.parentElement.appendChild(menu);
  const close = e => { if (!menu.contains(e.target) && e.target !== btn) { menu.remove(); document.removeEventListener("click", close); } };
  setTimeout(() => document.addEventListener("click", close), 0);
}
window.agSolKebab = agSolKebab;

function agReenviarTermo(id) {
  document.querySelectorAll(".ag-kebab-menu").forEach(m => m.remove());
  const r = _agSolRows.find(x => x.id === id);
  const _tel = r?.solicitante_tel || r?.telefone;
  if (!r?.token_termo || !_tel) return T("Sem dados", "Telefone ou link do termo não disponível.");
  const nome  = (r.solicitante_txt || "").split(" ")[0] || "";
  const fmtD  = s => { if (!s) return ""; const [y,m,d] = String(s).slice(0,10).split("-"); return `${d}/${m}/${y}`; };
  const msg = `Olá${nome ? `, ${nome}` : ""}! Segue novamente o link do *Termo de Compromisso e Responsabilidade* referente ao seu agendamento:\n\n`
    + `📋 *${r.titulo || "Agendamento"}*\n`
    + (r.data ? `📅 ${fmtD(r.data)}\n` : "")
    + (r.espaco ? `📍 ${r.espaco}\n` : "")
    + (r.protocolo ? `🔖 Protocolo: ${r.protocolo}\n` : "")
    + `\n📄 *Termo de Compromisso:*\nhttps://sipen.com.br/termo?t=${r.token_termo}\n\n⚠️ *Atenção:* o agendamento só é concluído após a leitura e assinatura do Termo de Compromisso e Responsabilidade. O evento somente aparecerá na agenda pública da igreja após a aceitação do termo.\n\n_Por favor, acesse o link acima e assine para confirmar o uso do espaço._`;
  if (typeof WA !== "undefined") {
    WA.send({ para: _tel, nome: r.solicitante_txt || "Solicitante", mensagem: msg, modulo: "AGENDA", origem_id: id });
  } else {
    const tel = _tel.replace(/\D/g, "");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, "_blank");
  }
  T("Termo reenviado", `Link enviado para ${_tel}.`);
}
window.agReenviarTermo = agReenviarTermo;

async function agExcluirSolicitacao(id) {
  document.querySelectorAll(".ag-kebab-menu").forEach(m => m.remove());
  const r = _agSolRows.find(x => x.id === id);
  const label = r?.titulo ? `"${r.titulo}"` : "esta solicitação";
  if (!confirm(`Excluir ${label}? Esta ação não pode ser desfeita.`)) return;
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(await res.text());
    _agSolRows = _agSolRows.filter(x => x.id !== id);
    _agKpiSol(_agSolRows);
    _agRenderSolTabela();
    T("Excluído", `${label} foi removida.`);
  } catch(e) { T("Erro ao excluir", e.message); }
}
window.agExcluirSolicitacao = agExcluirSolicitacao;
