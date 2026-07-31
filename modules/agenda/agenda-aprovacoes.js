/* ── APROVAÇÕES (agenda + módulo Eventos + requisições) ──────── */

async function agCarregarAprovacoes() {
  const el = document.getElementById("ag-aprov-list");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Carregando...</div>`;
  try {
    const [res, resReq] = await Promise.all([
      fetch(`${apiBaseUrl()}/rest/v1/agenda?deleted_at=is.null&status=in.(pendente,aguardando_aprovacao,em_analise)&select=*&order=created_at.desc&limit=200`, { headers: apiHeaders() }),
      fetch(`${apiBaseUrl()}/rest/v1/requisicoes_espaco?deleted_at=is.null&select=*&order=created_at.desc&limit=200`, { headers: apiHeaders() }),
    ]);
    if (!res.ok) throw new Error(await res.text());
    const rows    = await res.json();
    const reqRows = resReq.ok ? await resReq.json() : [];
    const reqPend = reqRows.filter(r => !REQ_FINAL.includes(r.status));

    if (!rows.length && !reqPend.length) {
      el.innerHTML = `<div style="text-align:center;padding:36px;color:var(--tx3)">
        <div style="font-size:28px;margin-bottom:8px">✅</div>
        <div style="font-size:12px;font-weight:600">Nenhuma aprovação pendente</div>
      </div>`;
      return;
    }

    const fmtD = d => {
      if (!d) return "—";
      const [y, m, dia] = String(d).slice(0, 10).split("-");
      return `${dia}/${m}/${y}`;
    };

    const deEvento = rows.filter(r => r.origem === "evento");
    const manuais  = rows.filter(r => r.origem !== "evento");

    const thR = `text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)`;

    let html = reqPend.length ? `
      <div style="margin-bottom:20px;border:1px solid rgba(249,115,22,.35);border-radius:10px;overflow:hidden">
        <div style="background:rgba(249,115,22,.08);padding:10px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(249,115,22,.25)">
          <span style="font-size:15px">📨</span>
          <span style="font-size:11.5px;font-weight:700;color:var(--orange)">Requisições de Espaço Ocupado</span>
          <span style="font-size:10px;color:var(--tx3);margin-left:auto">${reqPend.length} pendente${reqPend.length !== 1 ? "s" : ""}</span>
        </div>
        <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:11.5px;min-width:780px">
          <thead><tr style="border-bottom:1px solid rgba(249,115,22,.2);background:rgba(249,115,22,.04)">
            <th style="${thR}">Protocolo</th>
            <th style="${thR}">Título</th>
            <th style="${thR}">Solicitante</th>
            <th style="${thR}">Espaço / Data</th>
            <th style="${thR}">Status</th>
            <th style="text-align:right;padding:7px 10px;font-size:9.5px;color:var(--tx3)">Ações</th>
          </tr></thead>
          <tbody>${reqPend.map(r => {
            const h = t => { const [hh,mm] = (t||"").split(":"); return hh && mm ? `${hh}:${mm}` : ""; };
            const horario = [h(r.hora_inicio_sol), h(r.hora_fim_sol)].filter(Boolean).join("–");
            return `<tr style="border-bottom:1px solid rgba(249,115,22,.12)" onmouseover="this.style.background='rgba(249,115,22,.04)'" onmouseout="this.style.background=''">
              <td style="padding:8px 10px;font-family:var(--mono);font-size:10px;color:var(--orange)">${escapeHtml(r.protocolo||"—")}</td>
              <td style="padding:8px 10px;color:var(--tx1);font-weight:600;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.titulo||"—")}</td>
              <td style="padding:8px 10px;color:var(--tx2);font-size:11px">${escapeHtml(r.solicitante_nome||"—")}</td>
              <td style="padding:8px 10px;color:var(--tx2);font-size:11px;white-space:nowrap">
                ${escapeHtml(r.espaco_nome||"—")}
                <div style="font-size:10px;color:var(--tx3)">${fmtD(r.data_solicitada)}${horario ? " · "+horario : ""}</div>
              </td>
              <td style="padding:8px 10px">${_agReqPill(r.status)}</td>
              <td style="padding:8px 10px;text-align:right;white-space:nowrap">
                <button onclick='agAnalisarRequisicao("${r.id}")' style="padding:5px 12px;border-radius:5px;border:1px solid rgba(249,115,22,.4);background:rgba(249,115,22,.08);color:var(--orange);font-size:10px;font-weight:600;cursor:pointer">Analisar</button>
              </td>
            </tr>`;
          }).join("")}</tbody>
        </table></div>
      </div>` : "";

    if (deEvento.length) {
      html += `<div style="font-size:10px;font-weight:700;color:var(--sky);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Do Módulo Eventos — ${deEvento.length} pendente${deEvento.length !== 1 ? "s" : ""}</div>`;
      html += deEvento.map(r => `
        <div style="background:var(--bg-card);border:1px solid rgba(74,156,245,.25);border-radius:10px;padding:16px 18px;margin-bottom:10px">
          <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <div style="font-size:13.5px;font-weight:700;color:var(--tx1)">${escapeHtml(r.titulo || "—")}</div>
              <div style="font-size:11px;color:var(--tx3);margin-top:5px;display:flex;gap:10px;flex-wrap:wrap">
                <span>📅 ${fmtD(r.data)}${r.hora_inicio ? " · " + String(r.hora_inicio).slice(0,5) : ""}</span>
                ${r.espaco ? `<span>📍 ${escapeHtml(r.espaco)}</span>` : ""}
                ${r.organizador ? `<span>🏛 ${escapeHtml(r.organizador)}</span>` : ""}
              </div>
              ${r.descricao ? `<div style="font-size:11px;color:var(--tx2);margin-top:6px;white-space:pre-wrap">${escapeHtml(r.descricao.slice(0, 140))}${r.descricao.length > 140 ? "…" : ""}</div>` : ""}
            </div>
            <div style="display:flex;gap:6px;align-self:flex-start;flex-shrink:0">
              <button onclick="agAprovarEntrada('${r.id}','${r.evento_id || ''}')" style="padding:7px 16px;border-radius:7px;border:1px solid rgba(58,170,92,.35);background:rgba(58,170,92,.12);color:var(--gr);font-size:12px;font-weight:700;cursor:pointer">✓ Aprovar</button>
              <button onclick="agRejeitarEntrada('${r.id}','${r.evento_id || ''}')" style="padding:7px 14px;border-radius:7px;border:1px solid rgba(224,85,85,.3);background:rgba(224,85,85,.08);color:var(--rose);font-size:12px;font-weight:700;cursor:pointer">✕ Rejeitar</button>
            </div>
          </div>
        </div>`).join("");
    }

    const solPublicas = manuais.filter(r => r.protocolo || r.origem_sol === "link_publico" || r.origem === "solicitacao");
    const solManuais  = manuais.filter(r => !r.protocolo && r.origem_sol !== "link_publico" && r.origem !== "solicitacao");

    if (solPublicas.length) {
      if (deEvento.length) html += `<div style="margin-top:20px;margin-bottom:12px;border-top:1px solid var(--bd2);padding-top:16px"></div>`;
      html += `<div style="font-size:10px;font-weight:700;color:#8A6010;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">📋 Solicitações Públicas — ${solPublicas.length} aguardando</div>`;
      html += solPublicas.map(r => `
        <div style="background:var(--bg-card);border:1.5px solid rgba(214,148,0,.35);border-left:4px solid #D49000;border-radius:10px;padding:14px 16px;margin-bottom:10px">
          <div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap">
            <div style="flex:1;min-width:180px">
              <div style="font-size:13px;font-weight:700;color:var(--tx1)">${escapeHtml(r.titulo || "—")}</div>
              <div style="font-size:11px;color:var(--tx3);margin-top:4px;display:flex;gap:10px;flex-wrap:wrap">
                <span>📅 ${fmtD(r.data)}${r.hora_inicio ? " · " + String(r.hora_inicio).slice(0,5) + (r.hora_fim ? " → " + String(r.hora_fim).slice(0,5) : "") : ""}</span>
                ${r.espaco   ? `<span>📍 ${escapeHtml(r.espaco)}</span>` : ""}
                ${r.solicitante_txt  ? `<span>👤 ${escapeHtml(r.solicitante_txt)}</span>` : ""}
                ${r.solicitante_tel  ? `<span>📞 ${escapeHtml(r.solicitante_tel)}</span>` : ""}
              </div>
              ${r.protocolo ? `<div style="margin-top:5px"><span style="font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:6px;background:rgba(214,148,0,.15);color:#8A6010;font-family:monospace">${r.protocolo}</span></div>` : ""}
              ${r.status === "em_analise" ? `<div style="margin-top:5px"><span style="font-size:9.5px;padding:2px 7px;border-radius:6px;background:rgba(74,156,245,.12);color:var(--sky);font-weight:700">Em análise</span></div>` : ""}
            </div>
            <div style="display:flex;gap:6px;align-self:flex-start;flex-shrink:0;flex-wrap:wrap">
              ${r.status !== "em_analise" ? `<button onclick="agMarcarEmAnalise('${r.id}')" style="padding:5px 11px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--sky);font-size:10px;font-weight:700;cursor:pointer">Em análise</button>` : ""}
              <button onclick="agAprovarAgendamento('${r.id}')" style="padding:5px 12px;border-radius:6px;border:1px solid rgba(58,170,92,.35);background:rgba(58,170,92,.1);color:var(--gr);font-size:10px;font-weight:700;cursor:pointer">✓ Aprovar</button>
              <button onclick="agRejeitarAgendamento('${r.id}')" style="padding:5px 11px;border-radius:6px;border:1px solid rgba(224,85,85,.3);background:rgba(224,85,85,.08);color:var(--rose);font-size:10px;font-weight:700;cursor:pointer">✕ Recusar</button>
            </div>
          </div>
        </div>`).join("");
    }

    if (solManuais.length) {
      if (deEvento.length || solPublicas.length) html += `<div style="margin-top:20px;margin-bottom:10px;border-top:1px solid var(--bd2);padding-top:16px"></div>`;
      html += `<div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Pendentes Internos — ${solManuais.length}</div>`;
      html += `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11.5px">
        <thead><tr style="border-bottom:1px solid var(--bd2);background:var(--bg-surface)">
          <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Título</th>
          <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Data</th>
          <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Espaço</th>
          <th style="text-align:right;padding:7px 10px"></th>
        </tr></thead>
        <tbody>${solManuais.map(r => `<tr style="border-bottom:1px solid var(--bd1)">
          <td style="padding:8px 10px;color:var(--tx1);font-weight:600">${escapeHtml(r.titulo || "—")}</td>
          <td style="padding:8px 10px;color:var(--tx2);white-space:nowrap">${fmtD(r.data)}</td>
          <td style="padding:8px 10px;color:var(--tx2)">${escapeHtml(r.espaco || "—")}</td>
          <td style="padding:8px 10px;text-align:right">
            <button onclick='agAprovarSolicitacao(${safeJsonForHtml(r)})' style="background:rgba(58,170,92,.1);border:1px solid rgba(58,170,92,.35);border-radius:4px;color:var(--gr);font-size:10px;font-weight:700;padding:3px 7px;cursor:pointer;margin-right:3px">✓ Aprovar</button>
            <button onclick='agRecusarSolicitacao("${r.id}")' style="background:rgba(224,85,85,.08);border:1px solid rgba(224,85,85,.3);border-radius:4px;color:var(--rose);font-size:10px;font-weight:700;padding:3px 7px;cursor:pointer">✕ Recusar</button>
          </td>
        </tr>`).join("")}</tbody>
      </table></div>`;
    }

    el.innerHTML = html;
  } catch (e) {
    const msg = e.message || "";
    if (msg.includes("JWT expired") || msg.includes("PGRST303")) {
      try {
        const { data } = await getSupabase().auth.refreshSession();
        if (data?.session?.access_token) window._sipenFreshToken = data.session.access_token;
        await agCarregarAprovacoes();
        return;
      } catch (_) {}
    }
    el.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}
window.agCarregarAprovacoes = agCarregarAprovacoes;

async function agAprovarEntrada(agendaId, eventoId) {
  const nome = typeof USUARIO_ATUAL !== "undefined" ? (USUARIO_ATUAL?.nome || "Sistema") : "Sistema";
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${agendaId}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({
        status:             "confirmado",
        aprovado_por_nome:  nome,
        aprovado_em:        new Date().toISOString(),
        motivo_rejeicao:    null,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    _agendaCache = null;
    _syncDemandaStatus(agendaId, "EM_ANDAMENTO");
    T("Evento aprovado!", "Aparecerá na Agenda geral para todos os usuários.");
    carregarSolicitacoesAgenda();
  } catch (e) { T("Erro ao aprovar", e.message); }
}
window.agAprovarEntrada = agAprovarEntrada;

function agRejeitarEntrada(agendaId, eventoId) {
  let modal = document.getElementById("ag-rejeitar-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "ag-rejeitar-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:340;display:flex;align-items:center;justify-content:center";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="width:min(440px,94vw);background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;padding:24px;box-shadow:0 8px 40px rgba(0,0,0,.3)">
      <div style="font-size:15px;font-weight:700;color:var(--tx1);margin-bottom:16px">Rejeitar solicitação</div>
      <label style="font-size:9.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em">Motivo da rejeição</label>
      <textarea id="ag-rejeitar-motivo" rows="3" placeholder="Descreva o motivo para o organizador do evento..." style="width:100%;margin-top:6px;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input);color:var(--tx1);font-size:12.5px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box"></textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
        <button onclick="document.getElementById('ag-rejeitar-modal')?.remove()" style="padding:8px 16px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12.5px;cursor:pointer">Cancelar</button>
        <button onclick="agConfirmarRejeicao('${agendaId}','${eventoId}')" style="padding:8px 18px;border-radius:7px;border:none;background:var(--rose);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">Rejeitar</button>
      </div>
    </div>`;
}
window.agRejeitarEntrada = agRejeitarEntrada;

async function agConfirmarRejeicao(agendaId, eventoId) {
  const motivo = document.getElementById("ag-rejeitar-motivo")?.value?.trim() || null;
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${agendaId}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({
        status:            "cancelado",
        motivo_rejeicao:   motivo,
        aprovado_por_nome: null,
        aprovado_em:       null,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    document.getElementById("ag-rejeitar-modal")?.remove();
    _agendaCache = null;
    T("Solicitação rejeitada.", motivo ? `Motivo registrado.` : "Sem motivo registrado.");
    carregarSolicitacoesAgenda();
  } catch (e) { T("Erro ao rejeitar", e.message); }
}
window.agConfirmarRejeicao = agConfirmarRejeicao;

async function agMarcarEmAnalise(id) {
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ status: "em_analise" }),
    });
    if (!res.ok) throw new Error(await res.text());
    carregarSolicitacoesAgenda();
  } catch (e) { T("Erro", e.message); }
}
window.agMarcarEmAnalise = agMarcarEmAnalise;

async function _comSyncStatus(agendaId, acao, motivo) {
  try {
    const sol = await fetch(
      `${apiBaseUrl()}/rest/v1/com_solicitacoes_arte?agenda_id=eq.${agendaId}&status=not.in.(Cancelada,Concluída,Programação não aprovada)&select=id,status&limit=10`,
      { headers: apiHeaders() }
    );
    if (!sol.ok) return;
    const rows = await sol.json();

    for (const r of rows) {
      let novoStatus = null;
      let texto = "";

      if (acao === "aprovar") {
        novoStatus = "Aprovada para produção";
        texto = "Programação aprovada pela Administração. Produção liberada.";
      } else if (acao === "recusar") {
        novoStatus = "Programação não aprovada";
        texto = `Programação recusada pela Administração. Produção bloqueada.${motivo ? "\nMotivo: " + motivo : ""}`;
      } else if (acao === "ajuste") {
        texto = `Ajuste solicitado na programação pela Administração.${motivo ? "\nDetalhe: " + motivo : ""} Verifique se datas, horários ou local foram alterados.`;
      }

      if (novoStatus) {
        await fetch(`${apiBaseUrl()}/rest/v1/com_solicitacoes_arte?id=eq.${r.id}`, {
          method: "PATCH",
          headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
          body: JSON.stringify({ status: novoStatus, atualizado_em: new Date().toISOString() }),
        });
      }
      if (texto) {
        await fetch(`${apiBaseUrl()}/rest/v1/com_andamentos`, {
          method: "POST",
          headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
          body: JSON.stringify({ sol_id: r.id, texto, automatico: true, criado_em: new Date().toISOString() }),
        });
      }
    }
  } catch (_) {}
}
window._comSyncStatus = _comSyncStatus;

async function agAprovarAgendamento(id) {
  const aprovador = typeof USUARIO_ATUAL !== "undefined" ? (USUARIO_ATUAL?.nome || "Administrador") : "Administrador";
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/rpc/aprovar_agendamento`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_agenda_id: id, p_aprovador: aprovador }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (!data.ok) throw new Error(data.erro || "Erro ao aprovar");

    _agendaCache = null;
    T("Agendamento aprovado!", data.protocolo ? `Protocolo ${data.protocolo} confirmado.` : "Reserva confirmada na agenda.");

    if (data.telefone && typeof WA !== "undefined") {
      const fmtData = d => {
        if (!d) return "";
        const [y, m, dia] = String(d).slice(0, 10).split("-");
        return `${dia}/${m}/${y}`;
      };
      const horario = data.hora_inicio
        ? String(data.hora_inicio).slice(0, 5) + (data.hora_fim ? ` → ${String(data.hora_fim).slice(0, 5)}` : "")
        : "";
      const termoLink = data.token_termo ? `\n\n📄 *Termo de Compromisso:*\nhttps://sipen.com.br/termo?t=${data.token_termo}\n\n⚠️ *Atenção:* o agendamento só é concluído após a leitura e assinatura do Termo de Compromisso e Responsabilidade. O evento somente aparecerá na agenda pública da igreja após a aceitação do termo.\n\n_Por favor, acesse o link acima e assine para confirmar o uso do espaço._` : "";
      const msg = `Olá${data.solicitante ? `, ${data.solicitante.split(" ")[0]}` : ""}! Seu pedido de agendamento foi *aprovado* ✅\n\n`
        + `📋 *${data.titulo || "Agendamento"}*\n`
        + (fmtData(data.data) ? `📅 ${fmtData(data.data)}${horario ? " · " + horario : ""}\n` : "")
        + (data.espaco ? `📍 ${data.espaco}\n` : "")
        + (data.protocolo ? `🔖 Protocolo: ${data.protocolo}\n` : "")
        + termoLink
        + `\nQualquer dúvida, entre em contato com a secretaria.`;
      WA.send({
        para:        data.telefone,
        nome:        data.solicitante || "Solicitante",
        mensagem:    msg,
        modulo:      "AGENDA",
        referenciaT: "agenda",
        referenciaId: id,
        chave:       `AG_APROV_${id}`,
      }).catch(() => {});
    }

    _comSyncStatus(id, "aprovar");
    _syncDemandaStatus(id, "CONCLUIDA");
    carregarSolicitacoesAgenda();
  } catch (e) { T("Erro ao aprovar", e.message); }
}
window.agAprovarAgendamento = agAprovarAgendamento;

function agRejeitarAgendamento(id) {
  let modal = document.getElementById("ag-rejeitar-sol-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "ag-rejeitar-sol-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:340;display:flex;align-items:center;justify-content:center";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="width:min(440px,94vw);background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;padding:24px;box-shadow:0 8px 40px rgba(0,0,0,.3)">
      <div style="font-size:15px;font-weight:700;color:var(--tx1);margin-bottom:6px">Recusar solicitação</div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:16px">O solicitante receberá uma notificação via WhatsApp se houver número cadastrado.</div>
      <label style="font-size:9.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em">Motivo da recusa</label>
      <textarea id="ag-rejeitar-sol-motivo" rows="3" placeholder="Ex.: Espaço já reservado, Conflito de horário, Data indisponível..." style="width:100%;margin-top:6px;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input);color:var(--tx1);font-size:12.5px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box"></textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
        <button onclick="document.getElementById('ag-rejeitar-sol-modal')?.remove()" style="padding:8px 16px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12.5px;cursor:pointer">Cancelar</button>
        <button onclick="agConfirmarRecusaAgendamento('${id}')" style="padding:8px 18px;border-radius:7px;border:none;background:var(--rose);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">Recusar</button>
      </div>
    </div>`;
}
window.agRejeitarAgendamento = agRejeitarAgendamento;

async function agConfirmarRecusaAgendamento(id) {
  const motivo   = document.getElementById("ag-rejeitar-sol-motivo")?.value?.trim() || "Indisponibilidade de espaço ou horário";
  const aprovador = typeof USUARIO_ATUAL !== "undefined" ? (USUARIO_ATUAL?.nome || "Administrador") : "Administrador";
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/rpc/recusar_agendamento`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_agenda_id: id, p_motivo: motivo, p_aprovador: aprovador }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (!data.ok) throw new Error(data.erro || "Erro ao recusar");

    document.getElementById("ag-rejeitar-sol-modal")?.remove();
    _agendaCache = null;
    T("Solicitação recusada.", motivo ? `Motivo registrado.` : "");

    _comSyncStatus(id, "recusar", motivo);

    if (data.telefone && typeof WA !== "undefined") {
      const msg = `Olá${data.solicitante ? `, ${data.solicitante.split(" ")[0]}` : ""}! Infelizmente seu pedido de agendamento *não foi aprovado*.\n\n`
        + (data.protocolo ? `🔖 Protocolo: ${data.protocolo}\n` : "")
        + (data.titulo ? `📋 ${data.titulo}\n` : "")
        + `\n❌ *Motivo:* ${motivo}\n\nPara mais informações, entre em contato com a secretaria.`;
      WA.send({
        para:        data.telefone,
        nome:        data.solicitante || "Solicitante",
        mensagem:    msg,
        modulo:      "AGENDA",
        referenciaT: "agenda",
        referenciaId: id,
        chave:       `AG_RECUS_${id}`,
      }).catch(() => {});
    }

    _syncDemandaStatus(id, "CANCELADA");
    carregarSolicitacoesAgenda();
  } catch (e) { T("Erro ao recusar", e.message); }
}
window.agConfirmarRecusaAgendamento = agConfirmarRecusaAgendamento;

async function _syncDemandaStatus(agendaId, status) {
  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/demandas?agenda_ref_id=eq.${agendaId}&select=id&limit=1`,
      { headers: apiHeaders() }
    );
    const rows = await res.json();
    if (!rows?.length) return;
    await fetch(`${apiBaseUrl()}/rest/v1/demandas?id=eq.${rows[0].id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  } catch(_) {}
}
