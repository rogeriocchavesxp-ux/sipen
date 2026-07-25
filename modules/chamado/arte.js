/* ── Arte Digital — Estado e funções ───────────────────────── */
let _arteAgendaId  = null;
let _arteProtocolo = null;
let _arteTitulo    = null;
let _arteTicket    = null;
let _arteDataEvt   = null;
let _arteHoraEvt   = null;
let _arteLocal     = null;

const S2_FORMATOS = [
  { label: "1:1 WhatsApp",    digital: true  },
  { label: "16:9 avisos",     digital: true  },
  { label: "Story Instagram", digital: true  },
  { label: "Banner digital",  digital: true  },
  { label: "Faixa",           digital: false },
  { label: "Panfleto",        digital: false },
  { label: "Outro",           digital: false },
];

function _iniciarStep2(agendaId, protocolo, titulo, ticket) {
  _arteAgendaId  = agendaId;
  _arteProtocolo = protocolo;
  _arteTitulo    = titulo;
  _arteTicket    = ticket;

  // Captura dados da etapa 1
  const dataI  = document.getElementById("f-ag-data")?.value || "";
  const hiVal  = document.getElementById("f-ag-inicio")?.value || "";
  const locais = [...document.querySelectorAll("#f-ag-spaces input:checked")].map(c => c.value);
  _arteDataEvt  = dataI || null;
  _arteHoraEvt  = hiVal || null;
  _arteLocal    = locais.length ? locais.join(", ") : null;

  // Resumo da etapa 1 (banner superior)
  const resumoEl = document.getElementById("s2-resumo");
  if (resumoEl) {
    resumoEl.innerHTML =
      `<strong>Programação registrada</strong> ✅<br>` +
      (titulo ? `<span style="color:var(--tx1)">${titulo}</span><br>` : "") +
      (protocolo ? `Protocolo: <strong style="color:var(--gr)">${protocolo}</strong><br>` : "") +
      `<span style="font-size:11px;color:var(--tx3)">Aguardando aprovação — a equipe de Comunicação já pode acompanhar.</span>`;
  }

  // Aviso aprovação pendente
  const avisoEl = document.getElementById("s2-aviso-pend");
  if (avisoEl) avisoEl.style.display = "block";

  // Pré-preenche solicitante
  const nomeBase = document.getElementById("f-nome")?.value?.trim() || "";
  const telBase  = document.getElementById("f-tel")?.value?.trim()  || "";
  const s2resp = document.getElementById("s2-resp");
  const s2tel  = document.getElementById("s2-tel");
  if (s2resp) s2resp.value = nomeBase;
  if (s2tel)  s2tel.value  = telBase;

  // Bloco de info da programação
  const dFmt   = dataI ? fmtDataBR(dataI) : "";
  const progEl = document.getElementById("s2-prog-info");
  if (progEl) {
    const partes = [
      titulo    ? `<strong>${titulo}</strong>` : null,
      protocolo ? `Protocolo: <strong>${protocolo}</strong>` : null,
      dFmt      ? `Data: ${dFmt}` : null,
      hiVal     ? `Horário: ${hiVal}` : null,
      locais.length ? `Local: ${locais.join(", ")}` : null,
    ].filter(Boolean);
    progEl.innerHTML = partes.join(" · ");
  }

  // Áreas (Mídias pré-selecionada)
  const areasGrid = document.getElementById("s2-areas");
  if (areasGrid) {
    areasGrid.innerHTML = COM_AREAS_ALL.map(a =>
      `<label class="s2-fmt-lbl">
        <input type="checkbox" name="s2-area" value="${a}" ${a === "Mídias" ? "checked" : ""}>
        ${a}
      </label>`
    ).join("");
  }

  // Formatos (digitais pré-selecionados)
  const grid = document.getElementById("s2-formatos");
  if (grid) {
    grid.innerHTML = S2_FORMATOS.map(f =>
      `<label class="s2-fmt-lbl">
        <input type="checkbox" name="s2-fmt" value="${f.label}" ${f.digital ? "checked" : ""}>
        ${f.label}
      </label>`
    ).join("");
  }

  // Descrição pré-preenchida
  const locTxt  = locais.length ? `, no espaço ${locais.join(", ")}` : "";
  const horaTxt = hiVal ? `, às ${hiVal}` : "";
  const descBase =
    `Produção de arte digital para a programação "${titulo || protocolo}", ` +
    `agendada para ${dFmt || "data informada"}${horaTxt}${locTxt}.`;
  const descEl = document.getElementById("s2-desc");
  if (descEl) descEl.value = descBase;

  // Prazo sugerido: 2 dias antes do evento
  const prazoEl = document.getElementById("s2-prazo");
  if (prazoEl && dataI) {
    const d = new Date(dataI + "T12:00:00");
    d.setDate(d.getDate() - 2);
    prazoEl.value = d.toISOString().slice(0, 10);
  }

  // Troca de tela
  document.getElementById("screen-form").style.display   = "none";
  document.getElementById("screen-ok").style.display     = "none";
  document.getElementById("screen-step2").style.display  = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function _enviarArteDigital() {
  const resp    = document.getElementById("s2-resp")?.value?.trim();
  const tel     = document.getElementById("s2-tel")?.value?.trim()  || null;
  const min     = document.getElementById("s2-min")?.value          || null;
  const desc    = document.getElementById("s2-desc")?.value?.trim();
  const areas   = [...document.querySelectorAll("input[name='s2-area']:checked")].map(e => e.value);
  const formatos = [...document.querySelectorAll("input[name='s2-fmt']:checked")].map(e => e.value);
  const prazo   = document.getElementById("s2-prazo")?.value || null;
  const info    = document.getElementById("s2-info")?.value?.trim() || null;
  const errEl   = document.getElementById("err-step2");

  if (!resp) {
    if (errEl) errEl.textContent = "Informe o nome do responsável.";
    document.getElementById("s2-resp").focus();
    return;
  }
  if (!min) {
    if (errEl) errEl.textContent = "Selecione o ministério ou grupo.";
    document.getElementById("s2-min").focus();
    return;
  }
  if (!desc) {
    if (errEl) errEl.textContent = "Descreva o que precisa ser criado.";
    document.getElementById("s2-desc").focus();
    return;
  }
  if (errEl) errEl.textContent = "";

  // Valida prazo <= data do evento
  if (prazo && _arteDataEvt && prazo > _arteDataEvt) {
    const avEl = document.getElementById("s2-prazo-aviso");
    if (avEl) avEl.style.display = "";
    document.getElementById("s2-prazo").focus();
    return;
  }
  const avEl2 = document.getElementById("s2-prazo-aviso");
  if (avEl2) avEl2.style.display = "none";

  const btn = document.getElementById("btn-step2-enviar");
  btn.disabled    = true;
  btn.textContent = "Enviando…";

  try {
    const res = await fetch(`${SB_URL}/rest/v1/rpc/criar_sol_comunicacao_publica`, {
      method:  "POST",
      headers: HDRS,
      body: JSON.stringify({
        p_agenda_id:        _arteAgendaId,
        p_agenda_protocolo: _arteProtocolo,
        p_responsavel:      resp,
        p_telefone:         tel,
        p_descricao:        desc,
        p_ministerio:       min,
        p_areas:            areas.length    ? areas    : null,
        p_formatos:         formatos.length ? formatos : null,
        p_prazo:            prazo,
        p_informacoes:      info || null,
        p_data_evento:      _arteDataEvt   || null,
        p_horario_evento:   _arteHoraEvt   || null,
        p_local_evento:     _arteLocal     || null,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (!data.ok && !data.duplicado) throw new Error(data.erro || "Erro ao registrar solicitação.");

    // Sucesso — mostra tela final
    document.getElementById("screen-step2").style.display = "none";
    document.getElementById("ok-numero").textContent = _arteProtocolo || _arteTicket || "";
    const okProtoEl = document.getElementById("ok-protocolo");
    if (okProtoEl) {
      okProtoEl.innerHTML =
        (_arteProtocolo ? `Reserva provisória: <strong>${_arteProtocolo}</strong><br>` : "") +
        `Arte digital: <strong style="color:#3aaa5c">solicitação registrada ✅</strong>`;
      okProtoEl.style.display    = "";
      okProtoEl.style.background = "rgba(58,170,92,.09)";
      okProtoEl.style.borderColor = "rgba(58,170,92,.3)";
      okProtoEl.style.color = "#1d6b38";
    }
    document.getElementById("screen-ok").style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e) {
    if (errEl) errEl.textContent = e.message || "Falha ao enviar. Tente novamente.";
    btn.disabled    = false;
    btn.textContent = "Enviar Solicitação de Arte";
  }
}

function _pularArteDigital() {
  document.getElementById("screen-step2").style.display = "none";
  document.getElementById("ok-numero").textContent = _arteProtocolo || _arteTicket || "";
  const okProtoEl = document.getElementById("ok-protocolo");
  if (okProtoEl) okProtoEl.style.display = "none";
  document.getElementById("screen-ok").style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
