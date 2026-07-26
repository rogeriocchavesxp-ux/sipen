/* ── FORMULÁRIO CRUD DE EVENTOS ─────────────────────────────── */

async function agAbrirForm(r = null) {
  await _agCarregarEspacos();
  const isEdit = !!r?.id;
  const tipoAtual = r?.tipo || "";
  const espacoAtual = r?.espaco || "";

  if (Array.isArray(r?.dias) && r.dias.length > 0) {
    _agDiasState = r.dias.map(d => ({ data: d.data||"", hora_inicio: d.hora_inicio||"", hora_fim: d.hora_fim||"" }));
  } else {
    _agDiasState = [{ data: r?.data||"", hora_inicio: r?.hora_inicio||"", hora_fim: r?.hora_fim||"" }];
  }
  const espacosSel = espacoAtual.split(",").map(s=>s.trim()).filter(Boolean);

  let modal = document.getElementById("ag-form-modal");
  if (!modal) { modal = document.createElement("div"); modal.id = "ag-form-modal"; document.body.appendChild(modal); }
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:400;display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow-y:auto";

  const fi = `width:100%;background:var(--bg-input,var(--bg-surface));border:1px solid var(--bd2);border-radius:7px;color:var(--tx1);font-size:12.5px;padding:8px 11px;outline:none;box-sizing:border-box`;
  const lbl = t => `<label style="font-size:9.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:5px">${t}</label>`;

  modal.innerHTML = `
    <div style="background:var(--bg-card);border-radius:12px;width:100%;max-width:600px;box-shadow:0 8px 32px rgba(0,0,0,.25);overflow:hidden">
      <div style="padding:18px 22px 14px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:2px">Agenda</div>
          <div style="font-size:16px;font-weight:700;color:var(--tx1)">${isEdit ? "Editar evento" : "Novo evento"}</div>
        </div>
        <button onclick="document.getElementById('ag-form-modal').style.display='none'" style="background:none;border:none;color:var(--tx3);font-size:20px;cursor:pointer;padding:0;line-height:1">✕</button>
      </div>

      <div style="padding:20px 22px;display:flex;flex-direction:column;gap:16px">

        <!-- Tipo -->
        <div>
          ${lbl("Tipo de evento")}
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${Object.entries(AG_TIPOS_COR).map(([t, cor]) => `
              <button type="button" class="ag-tipo-chip" data-tipo="${escapeHtml(t)}"
                style="padding:5px 13px;border-radius:20px;font-size:11.5px;font-weight:600;cursor:pointer;transition:all .12s;border:2px solid;${tipoAtual===t ? `background:${cor};color:#fff;border-color:${cor}` : `background:transparent;color:var(--tx2);border-color:var(--bd2)`}">
                ${escapeHtml(t)}
              </button>`).join("")}
          </div>
          <input type="hidden" id="ag-f-tipo" value="${escapeHtml(tipoAtual)}">
        </div>

        <!-- Título -->
        <div>
          ${lbl("Título *")}
          <input id="ag-f-titulo" type="text" value="${escapeHtml(r?.titulo||"")}" placeholder="Nome do evento" style="${fi}">
        </div>

        <!-- Dias do evento -->
        <div>
          ${lbl("Dias do evento")}
          <div id="ag-dias-list" style="display:flex;flex-direction:column;gap:8px"></div>
          <button type="button" onclick="_agAdicionarDia()"
            style="margin-top:8px;padding:5px 14px;border-radius:6px;border:1px dashed var(--bd2);background:transparent;color:var(--tx3);font-size:11px;font-weight:600;cursor:pointer">
            ＋ Adicionar dia
          </button>
        </div>

        <!-- Recorrência / Dia / Mês -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
          <div>${lbl("Recorrência")}
            <select id="ag-f-recorrencia" style="${fi}">
              ${["Único","Semanal","Quinzenal","Mensal","Anual"].map(v=>`<option value="${v}" ${(r?.recorrencia||"Único")===v?"selected":""}>${v}</option>`).join("")}
            </select>
          </div>
          <div>${lbl("Dia da semana")}
            <select id="ag-f-dia-semana" style="${fi}">
              <option value="">—</option>
              ${["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"].map(v=>`<option value="${v}" ${r?.dia_semana===v?"selected":""}>${v}</option>`).join("")}
            </select>
          </div>
          <div>${lbl("Mês")}
            <select id="ag-f-mes" style="${fi}">
              <option value="">—</option>
              ${["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"].map(v=>`<option value="${v}" ${r?.mes===v?"selected":""}>${v}</option>`).join("")}
            </select>
          </div>
        </div>

        <!-- Departamento Organizador / Responsável -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            ${lbl("Departamento Organizador")}
            <select id="ag-f-organizador" style="${fi}" data-valor-atual="${escapeHtml(r?.organizador||"")}">
              <option value="">Carregando…</option>
            </select>
          </div>
          ${_agAutocompleteHtml("responsavel", "Responsável", r?.responsavel||"", fi)}
        </div>

        <!-- Solicitante / Telefone -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>${lbl("Solicitante")}<input id="ag-f-solicitante" type="text" value="${escapeHtml(r?.solicitante_txt||"")}" style="${fi}"></div>
          <div>${lbl("Telefone")}<input id="ag-f-telefone" type="tel" value="${escapeHtml(r?.solicitante_tel||r?.telefone||"")}" style="${fi}"></div>
        </div>

        <!-- Espaços -->
        <div>
          ${lbl("Espaços")}
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div id="ag-f-espaco-preview" style="flex:1;display:flex;flex-wrap:wrap;gap:5px;min-height:30px;align-items:center">
              ${espacosSel.length ? espacosSel.map(n=>`<span style="padding:3px 9px;border-radius:4px;background:rgba(42,181,192,.12);color:var(--teal);font-size:11px;font-weight:600;border:1px solid rgba(42,181,192,.3)">${escapeHtml(n)}</span>`).join(" ") : `<span style="color:var(--tx3);font-size:11.5px">Nenhum espaço selecionado</span>`}
            </div>
            <button type="button" onclick="agAbrirEspacos()" style="flex-shrink:0;padding:6px 12px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--tx2);font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap">Selecionar →</button>
          </div>
          <input type="hidden" id="ag-f-espaco-txt" value="${escapeHtml(espacoAtual)}">
        </div>

        <!-- Observação -->
        <div>
          ${lbl("Observação")}
          <textarea id="ag-f-obs" rows="3" style="${fi}resize:vertical;font-family:inherit">${escapeHtml(r?.observacao||"")}</textarea>
        </div>

        <!-- Status -->
        <div>
          ${lbl("Status")}
          <select id="ag-f-status" style="${fi}">
            ${[["aguardando_aprovacao","Aguardando Aprovação"],["em_analise","Em Análise"],["ajuste_solicitado","Ajuste Solicitado"],["confirmado","Confirmado"],["recusado","Recusado"],["cancelado","Cancelado"],["reagendado","Reagendado"],["arquivado","Arquivado"]].map(([v,l])=>`<option value="${v}" ${(r?.status||"confirmado")===v?"selected":""}>${l}</option>`).join("")}
          </select>
        </div>

      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div>
          ${isEdit ? `<button onclick="agExcluirDoForm('${r.id}')" style="padding:8px 14px;border-radius:7px;border:1px solid rgba(224,85,85,.4);background:rgba(224,85,85,.06);color:var(--rose);font-size:12px;font-weight:600;cursor:pointer">Excluir</button>` : ""}
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="document.getElementById('ag-form-modal').style.display='none'" style="padding:8px 16px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12.5px;cursor:pointer">Cancelar</button>
          <button onclick="agSalvarForm('${r?.id||""}')" style="padding:8px 20px;border-radius:7px;border:none;background:var(--gr);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">Salvar</button>
        </div>
      </div>
    </div>`;

  _agRenderizarDias();
  _agPopularOrganizador();

  modal.querySelectorAll(".ag-tipo-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const cor = AG_TIPOS_COR[btn.dataset.tipo] || "#6b7280";
      modal.querySelectorAll(".ag-tipo-chip").forEach(b => {
        b.style.background = "transparent"; b.style.color = "var(--tx2)"; b.style.borderColor = "var(--bd2)";
      });
      btn.style.background = cor; btn.style.color = "#fff"; btn.style.borderColor = cor;
      document.getElementById("ag-f-tipo").value = btn.dataset.tipo;
    });
  });

  if (isEdit) {
    _agPreencherTelSilent("organizador", r?.organizador);
    _agPreencherTelSilent("responsavel", r?.responsavel);
  }
}
window.agAbrirForm = agAbrirForm;

async function _agNotificarResponsaveis(acao, evento, extras = {}) {
  if (typeof WA === "undefined") return;
  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/whatsapp_modulo_responsaveis?modulo=eq.AGENDA&ativo=eq.true&select=id,pessoas(nome,celular,whatsapp,telefone)`,
      { headers: apiHeaders() }
    );
    const resps = res.ok ? await res.json() : [];

    const fmtD = d => { if (!d) return ""; const [y,m,dia] = String(d).slice(0,10).split("-"); return `${dia}/${m}/${y}`; };
    const fmtH = h => h ? String(h).slice(0,5) : "";
    const data    = fmtD(evento.data);
    const horario = evento.hora_inicio ? fmtH(evento.hora_inicio) + (evento.hora_fim ? " – " + fmtH(evento.hora_fim) : "") : "";
    const espaco  = evento.espaco ? `\n📍 ${evento.espaco}` : "";

    const acoes = {
      criado:   `✅ *Novo evento agendado*`,
      editado:  `✏️ *Evento atualizado*`,
      excluido: `🗑 *Evento removido da agenda*`,
    };
    const msg = `${acoes[acao] || "📋 *Agenda*"}\n\n`
      + `📌 *${evento.titulo || "—"}*\n`
      + (data ? `📅 ${data}${horario ? " às " + horario : ""}\n` : "")
      + espaco
      + (evento.tipo ? `\n🏷 ${evento.tipo}` : "")
      + `\n\n_Enviado automaticamente pelo SIPEN_`;

    const destinatarios = [];
    for (const r of resps) {
      const tel = r.pessoas?.whatsapp || r.pessoas?.celular || r.pessoas?.telefone;
      if (tel) destinatarios.push({ tel, nome: r.pessoas?.nome || "" });
    }
    if (extras.orgTel) destinatarios.push({ tel: extras.orgTel, nome: evento.organizador || "Organizador" });
    if (extras.respTel) destinatarios.push({ tel: extras.respTel, nome: evento.responsavel || "Responsável" });

    const vistos = new Set();
    for (const d of destinatarios) {
      const num = (d.tel || "").replace(/\D/g, "");
      if (!num || vistos.has(num)) continue;
      vistos.add(num);
      WA.send({
        para:         d.tel,
        nome:         d.nome,
        mensagem:     msg,
        modulo:       "AGENDA",
        referenciaT:  "evento",
        referenciaId: evento.id || null,
        chave:        `AGENDA_${acao}_${evento.id || "novo"}_${num}`,
      });
    }
  } catch(e) {
    console.warn("[AGENDA] WA notify error:", e.message);
  }
}

async function agSalvarForm(id) {
  const titulo = document.getElementById("ag-f-titulo")?.value?.trim();
  if (!titulo) { T("Campo obrigatório", "Informe o título do evento."); return; }
  const _fTipo   = document.getElementById("ag-f-tipo")?.value;
  const _fEspaco = document.getElementById("ag-f-espaco-txt")?.value?.trim();
  if (!_fTipo)   { T("Campo obrigatório", "Selecione o tipo do evento (Culto, Reunião, Evento…)."); return; }
  if (!_fEspaco) { T("Campo obrigatório", "Selecione ao menos um espaço (ou 'Não necessário')."); return; }

  const diasColetados = _agDiasState.map((_, idx) => ({
    data:        document.getElementById(`ag-dia-data-${idx}`)?.value || "",
    hora_inicio: document.getElementById(`ag-dia-ini-${idx}`)?.value  || "",
    hora_fim:    document.getElementById(`ag-dia-fim-${idx}`)?.value  || "",
  })).filter(d => d.data);

  if (!diasColetados.length) { T("Campo obrigatório", "Informe ao menos uma data para o evento."); return; }

  const primeiroDia = diasColetados[0];
  const ultimoDia   = diasColetados[diasColetados.length - 1];

  const payload = {
    titulo,
    tipo:            document.getElementById("ag-f-tipo")?.value || null,
    data:            primeiroDia.data,
    hora_inicio:     primeiroDia.hora_inicio || null,
    hora_fim:        primeiroDia.hora_fim    || null,
    data_encerramento: ultimoDia.data !== primeiroDia.data ? ultimoDia.data : null,
    dias:            diasColetados.length > 1 ? diasColetados : null,
    recorrencia:     document.getElementById("ag-f-recorrencia")?.value || null,
    dia_semana:      document.getElementById("ag-f-dia-semana")?.value || null,
    mes:             document.getElementById("ag-f-mes")?.value || null,
    organizador:     document.getElementById("ag-f-organizador")?.value?.trim() || null,
    responsavel:     document.getElementById("ag-f-responsavel")?.value?.trim() || null,
    solicitante_txt: document.getElementById("ag-f-solicitante")?.value?.trim() || null,
    solicitante_tel: document.getElementById("ag-f-telefone")?.value?.trim() || null,
    espaco:          document.getElementById("ag-f-espaco-txt")?.value?.trim() || null,
    observacao:      document.getElementById("ag-f-obs")?.value?.trim() || null,
    status:          document.getElementById("ag-f-status")?.value || "confirmado",
  };
  try {
    const isEdit = !!id;
    const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda${isEdit ? `?id=eq.${id}` : ""}`, {
      method: isEdit ? "PATCH" : "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    const novoId = Array.isArray(rows) ? rows[0]?.id : rows?.id;
    const respTel = document.getElementById("ag-f-responsavel-tel")?.value || "";
    _agNotificarResponsaveis(isEdit ? "editado" : "criado", { ...payload, id: novoId || id }, { orgTel: "", respTel });
    document.getElementById("ag-form-modal").style.display = "none";
    T("Salvo", isEdit ? "Evento atualizado." : "Evento criado e enviado para Programações.");
    if (typeof carregarAgendaDash === "function") carregarAgendaDash();
    if (typeof agCarregarConfirmados === "function") agCarregarConfirmados();
  } catch(e) { T("Erro", e.message); }
}
window.agSalvarForm = agSalvarForm;

async function agExcluirDoForm(id) {
  if (!confirm("Excluir este evento? Esta ação não pode ser desfeita.")) return;
  let dadosEvento = { id };
  try {
    const r = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${id}&select=titulo,data,hora_inicio,hora_fim,espaco,tipo&limit=1`, { headers: apiHeaders() });
    if (r.ok) dadosEvento = { id, ...((await r.json())[0] || {}) };
  } catch(_) {}
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(await res.text());
    _agNotificarResponsaveis("excluido", dadosEvento);
    document.getElementById("ag-form-modal").style.display = "none";
    T("Excluído", "Evento removido.");
    if (typeof carregarAgendaDash === "function") carregarAgendaDash();
    if (typeof agCarregarConfirmados === "function") agCarregarConfirmados();
  } catch(e) { T("Erro", e.message); }
}
window.agExcluirDoForm = agExcluirDoForm;
