/* ══ screen-agend: novo fluxo availability-first ════════════ */
let _ag2Tipo = "";
let _ag2DispVerificada = false;
let _ag2EspacosSelecionados = new Set();

function agIniciar(tipo) {
  _ag2Tipo = tipo || "";
  _ag2DispVerificada = false;
  _ag2EspacosSelecionados = new Set();

  // Monta tipo grid
  const tipoGrid = document.getElementById("ag2-tipo-grid");
  if (tipoGrid) {
    const tipos = ["Culto","Reunião","Evento","Ensaio","Casamento","Aniversário","Congresso","Conferência","Outros"];
    tipoGrid.innerHTML = tipos.map(t => {
      const sel = t === _ag2Tipo;
      return `<label class="ag2-tipo-lbl${sel ? " sel" : ""}">
        <input type="radio" name="ag2-tipo" value="${t}"${sel ? " checked" : ""} onchange="ag2TipoChange(this.value)">
        ${t}
      </label>`;
    }).join("");
  }

  // Reset visual
  ["ag2-card-espacos","ag2-card-form","ag2-checking","ag2-disp-invalido","ag2-periodo-erro"].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = "none";
  });
  const espGrid = document.getElementById("ag2-espacos-grid");
  if (espGrid) espGrid.innerHTML = "";

  // Limpa campos de período
  ["ag2-data-i","ag2-hora-i","ag2-data-f","ag2-hora-f","ag2-part"].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = "";
  });

  // Limpa campos do formulário
  ["ag2-nome","ag2-tel","ag2-titulo","ag2-desc"].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = "";
  });
  document.querySelectorAll("input[name='ag2-arte']").forEach(r => r.checked = false);

  const errEl = document.getElementById("ag2-err");
  if (errEl) { errEl.textContent = ""; errEl.classList.remove("show"); }

  // Troca de tela
  document.getElementById("screen-form").style.display  = "none";
  document.getElementById("screen-agend").style.display = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function ag2Voltar() {
  document.getElementById("screen-agend").style.display = "none";
  document.getElementById("screen-form").style.display  = "";
  csubReset();
  _ocultarFinanceiro();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function ag2TipoChange(tipo) {
  _ag2Tipo = tipo;
  document.querySelectorAll(".ag2-tipo-lbl").forEach(lbl => {
    lbl.classList.toggle("sel", lbl.querySelector("input").value === tipo);
  });
}

function ag2SincDataFim() {
  const di = document.getElementById("ag2-data-i");
  const df = document.getElementById("ag2-data-f");
  if (di && df) df.value = di.value;
  ag2ValidarPeriodo();
  ag2InvalidarDisp();
}

function ag2ValidarPeriodo() {
  const di   = document.getElementById("ag2-data-i")?.value;
  const df   = document.getElementById("ag2-data-f")?.value;
  const hi   = document.getElementById("ag2-hora-i")?.value;
  const hf   = document.getElementById("ag2-hora-f")?.value;
  const erEl = document.getElementById("ag2-periodo-erro");
  if (!erEl || !di || !df) { if (erEl) erEl.style.display = "none"; return true; }
  const inicio   = di + "T" + (hi || "00:00");
  const fim      = df + "T" + (hf || "23:59");
  const invalido = fim <= inicio && (df < di || (df === di && hf && hi && hf <= hi));
  erEl.style.display = invalido ? "" : "none";
  return !invalido;
}

function ag2InvalidarDisp() {
  if (!_ag2DispVerificada) return;
  _ag2DispVerificada       = false;
  _ag2EspacosSelecionados  = new Set();
  const aviso    = document.getElementById("ag2-disp-invalido");
  const espCard  = document.getElementById("ag2-card-espacos");
  const formCard = document.getElementById("ag2-card-form");
  if (aviso)    aviso.style.display    = "";
  if (espCard)  espCard.style.display  = "none";
  if (formCard) formCard.style.display = "none";
}

async function ag2VerificarDisp() {
  if (!ag2ValidarPeriodo()) return;
  const di = document.getElementById("ag2-data-i")?.value;
  if (!di) {
    const erEl = document.getElementById("ag2-periodo-erro");
    if (erEl) { erEl.textContent = "Informe a data de início."; erEl.style.display = ""; }
    return;
  }
  const hi = document.getElementById("ag2-hora-i")?.value || null;
  const df = document.getElementById("ag2-data-f")?.value || di;
  const hf = document.getElementById("ag2-hora-f")?.value || null;

  const btn      = document.getElementById("ag2-btn-verif");
  const checking = document.getElementById("ag2-checking");
  const aviso    = document.getElementById("ag2-disp-invalido");
  const espCard  = document.getElementById("ag2-card-espacos");
  const formCard = document.getElementById("ag2-card-form");

  if (btn)      btn.disabled = true;
  if (checking) checking.style.display  = "";
  if (aviso)    aviso.style.display     = "none";
  if (espCard)  espCard.style.display   = "none";
  if (formCard) formCard.style.display  = "none";
  _ag2EspacosSelecionados = new Set();

  try {
    // 1. Lista de espaços públicos (leitura direta da tabela — sempre funciona)
    const listaRes = await fetch(
      `${SB_URL}/rest/v1/espacos?disponivel_publico=eq.true&ativo=eq.true&order=ordem.asc`,
      { headers: HDRS }
    );
    if (!listaRes.ok) throw new Error("Não foi possível carregar os espaços. Tente novamente.");
    const espacos = await listaRes.json();

    // 2. Mapa de disponibilidade via RPC (graceful: se falhar, assume disponível)
    let dispMap = {};
    try {
      const dispRes = await fetch(`${SB_URL}/rest/v1/rpc/espacos_disponibilidade`, {
        method:  "POST",
        headers: HDRS,
        body: JSON.stringify({
          p_data_inicio: di,
          p_hora_inicio: hi || "00:00",
          p_data_fim:    df,
          p_hora_fim:    hf || null,
        }),
      });
      if (dispRes.ok) {
        const raw = await dispRes.json();
        // PostgREST pode retornar [[...]] (JSONB scalar) ou [...] (TABLE)
        const arr = Array.isArray(raw) && Array.isArray(raw[0]) ? raw[0] : raw;
        if (Array.isArray(arr)) arr.forEach(d => {
          if (d?.nome) dispMap[d.nome] = { disponivel: d.disponivel, ocupacoes: d.ocupacoes || [] };
        });
      }
    } catch (_) { /* RPC indisponível: continua sem marcação */ }

    // 3. Mescla: espaços + disponibilidade + intervalos
    const dados = espacos.map(e => {
      const info = dispMap[e.nome];
      return {
        nome:        e.nome,
        grupo:       e.grupo || "",
        disponivel:  info ? info.disponivel : true,
        ocupacoes:   info ? info.ocupacoes  : [],
        localizacao: e.localizacao || "",
        capacidade:  e.capacidade  || null,
      };
    });

    _ag2DispVerificada = true;
    ag2MostrarEspacos(dados);
  } catch (e) {
    const espGrid = document.getElementById("ag2-espacos-grid");
    if (espGrid) espGrid.innerHTML = `<div style="color:var(--rose);font-size:12px;padding:6px 0">${e.message || "Não foi possível carregar os espaços. Tente novamente."}</div>`;
    if (espCard) espCard.style.display = "";
  } finally {
    if (btn)      btn.disabled = false;
    if (checking) checking.style.display = "none";
  }
}

function ag2ConsolidarIntervalos(occs) {
  if (!occs || !occs.length) return [];
  const sorted = [...occs].sort((a, b) => {
    const ai = (a.data || "") + "T" + (a.hora_inicio || "00:00");
    const bi = (b.data || "") + "T" + (b.hora_inicio || "00:00");
    return ai < bi ? -1 : ai > bi ? 1 : 0;
  });
  const res = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = res[res.length - 1];
    const curr = sorted[i];
    const lastEnd   = (last.data_enc || last.data || "") + "T" + (last.hora_fim   || "23:59");
    const currStart = (curr.data     || "")             + "T" + (curr.hora_inicio || "00:00");
    if (currStart <= lastEnd) {
      const currEnd = (curr.data_enc || curr.data || "") + "T" + (curr.hora_fim || "23:59");
      if (currEnd > lastEnd) { last.hora_fim = curr.hora_fim; last.data_enc = curr.data_enc || curr.data; }
    } else {
      res.push({ ...curr });
    }
  }
  return res;
}

function ag2FormatarIntervalo(occ) {
  const hi  = (occ.hora_inicio || "00:00").slice(0, 5);
  const hf  = (occ.hora_fim    || "23:59").slice(0, 5);
  const datI = occ.data     || "";
  const datF = occ.data_enc || occ.data || "";
  if (datI === datF) return `das ${hi} às ${hf}`;
  const fmt = d => { const p = d.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}` : d; };
  return `de ${fmt(datI)} às ${hi} até ${fmt(datF)} às ${hf}`;
}

function _ag2InfoLine(item) {
  const parts = [];
  if (item.localizacao) parts.push(item.localizacao);
  if (item.capacidade)  parts.push(item.capacidade + " pessoas");
  return parts.join(" · ");
}

function ag2MostrarEspacos(dados) {
  const espCard = document.getElementById("ag2-card-espacos");
  const grid    = document.getElementById("ag2-espacos-grid");
  if (!espCard || !grid) return;
  grid.innerHTML = "";
  _ag2EspacosSelecionados = new Set();

  if (!dados || !dados.length) {
    grid.innerHTML = `<div style="font-size:13px;color:var(--tx3);padding:8px 0">Nenhum espaço cadastrado para consulta.</div>`;
    espCard.style.display = "";
    return;
  }

  const dispCount   = dados.filter(d => d.disponivel).length;
  const indispCount = dados.length - dispCount;

  // Contador
  const cntEl = document.createElement("div");
  cntEl.className = "ag2-contador";
  cntEl.innerHTML =
    `<span><strong>${dados.length}</strong> espaços</span>` +
    `<span class="ag2-cnt-disp">● ${dispCount} disponíve${dispCount !== 1 ? "is" : "l"}</span>` +
    (indispCount > 0 ? `<span class="ag2-cnt-indisp">● ${indispCount} ocupado${indispCount !== 1 ? "s" : ""}</span>` : "") +
    (dispCount > 0 ? `<span style="font-size:11px;color:var(--tx3)">— selecione um ou mais espaços</span>` : "");
  grid.appendChild(cntEl);

  // Agrupa por grupo mantendo ordem de chegada
  const gruposMap = new Map();
  dados.forEach(d => {
    const g = d.grupo || "Geral";
    if (!gruposMap.has(g)) gruposMap.set(g, []);
    gruposMap.get(g).push(d);
  });

  [...gruposMap.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR")).forEach(([grupoNome, items]) => {
    // Dentro do grupo: disponíveis primeiro
    const ordenado = [
      ...items.filter(d => d.disponivel),
      ...items.filter(d => !d.disponivel),
    ];

    const grupoEl = document.createElement("div");
    grupoEl.className = "ag2-grupo";

    const hdr = document.createElement("div");
    hdr.className = "ag2-grupo-hdr";
    hdr.innerHTML = `<span class="ag2-grupo-chevron">▼</span>` + grupoNome;
    hdr.onclick = () => grupoEl.classList.toggle("collapsed");
    grupoEl.appendChild(hdr);

    const gGrid = document.createElement("div");
    gGrid.className = "ag2-grupo-grid";

    ordenado.forEach(item => {
      const card   = document.createElement("div");
      const occs   = ag2ConsolidarIntervalos(item.ocupacoes || []);
      const temOcc = occs.length > 0;
      const infoTxt = _ag2InfoLine(item);

      card.className    = "ag2-espaco-card" +
        (!item.disponivel ? " ag2-espaco-indisp" : "") +
        (temOcc ? " ag2-espaco-com-occ" : "");
      card.dataset.espaco    = item.nome;
      card.dataset.ocupacoes = JSON.stringify(occs);
      card.title = item.disponivel
        ? (infoTxt ? `${item.nome} · ${infoTxt}` : item.nome)
        : `${item.nome} — ocupado no horário solicitado`;

      const infoHTML = infoTxt ? `<span class="ag2-card-info">${infoTxt}</span>` : "";

      if (temOcc) {
        const lockHTML = !item.disponivel ? `<span class="ag2-lock">🔒</span>` : "";
        const menuHTML = !item.disponivel
          ? `<button class="ag2-menu-btn" onclick="ag2AbrirMenu(event,this)" aria-label="Mais opções">⋮</button>`
          : "";
        const occItems = occs.map(o => `<span class="ag2-occ-item">${ag2FormatarIntervalo(o)}</span>`).join("");
        const occClass = item.disponivel ? "ag2-ocupacoes ag2-occ-outros" : "ag2-ocupacoes";
        const occPrefix = item.disponivel
          ? `<span style="font-size:10px;color:var(--tx3);display:block;margin-bottom:1px">Também ocupado:</span>`
          : "";
        card.innerHTML =
          `<div class="ag2-card-hdr">` +
            `<div class="ag2-chk"></div>` +
            `<div style="flex:1;min-width:0">` +
              `<span class="ag2-card-nome">${item.nome}</span>` +
              infoHTML +
            `</div>` +
            lockHTML + menuHTML +
          `</div>` +
          (!item.disponivel ? `<span class="ag2-indisp-label">🔒 Indisponível</span>` : "") +
          `<div class="${occClass}">${occPrefix}${occItems}</div>`;
      } else {
        const menuHTML = !item.disponivel
          ? `<button class="ag2-menu-btn" onclick="ag2AbrirMenu(event,this)" aria-label="Mais opções">⋮</button>`
          : "";
        card.innerHTML =
          `<div class="ag2-chk"></div>` +
          `<div style="flex:1;min-width:0">` +
            `<span class="ag2-card-nome">${item.nome}</span>` +
            infoHTML +
            (!item.disponivel ? `<span class="ag2-indisp-label">🔒 Indisponível</span>` : "") +
          `</div>` +
          (!item.disponivel ? `<span class="ag2-lock">🔒</span>` : "") +
          menuHTML;
      }

      if (item.disponivel) card.onclick = () => ag2ToggleEspaco(item.nome);
      gGrid.appendChild(card);
    });

    grupoEl.appendChild(gGrid);
    grid.appendChild(grupoEl);
  });

  // Resumo de seleção (injetado no final do grid, inicialmente oculto)
  const resumoEl = document.createElement("div");
  resumoEl.id        = "ag2-resumo-sel";
  resumoEl.className = "ag2-resumo";
  resumoEl.style.display = "none";
  resumoEl.innerHTML =
    `<div class="ag2-resumo-titulo">Espaços selecionados</div>` +
    `<div id="ag2-resumo-lista"></div>` +
    `<div class="ag2-resumo-total" id="ag2-resumo-total"></div>`;
  grid.appendChild(resumoEl);

  espCard.style.display = "";
  setTimeout(() => espCard.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
}

function ag2ToggleEspaco(nome) {
  if (_ag2EspacosSelecionados.has(nome)) {
    _ag2EspacosSelecionados.delete(nome);
  } else {
    _ag2EspacosSelecionados.add(nome);
  }
  ag2AtualizarSelecao();
}

function ag2AtualizarSelecao() {
  // Atualiza visual dos cards
  document.querySelectorAll(".ag2-espaco-card:not(.ag2-espaco-indisp)").forEach(el => {
    el.classList.toggle("ag2-espaco-sel", _ag2EspacosSelecionados.has(el.dataset.espaco));
  });

  const selecionados = [..._ag2EspacosSelecionados];
  const resumoEl     = document.getElementById("ag2-resumo-sel");
  const listaEl      = document.getElementById("ag2-resumo-lista");
  const totalEl      = document.getElementById("ag2-resumo-total");

  if (selecionados.length > 0) {
    if (listaEl) listaEl.innerHTML = selecionados.map(n => `<div class="ag2-resumo-item">${n}</div>`).join("");
    if (totalEl) totalEl.textContent = `Total: ${selecionados.length} espaço${selecionados.length !== 1 ? "s" : ""}`;
    if (resumoEl) resumoEl.style.display = "";
    // Expande formulário apenas na primeira seleção
    const formCard = document.getElementById("ag2-card-form");
    if (formCard && formCard.style.display === "none") {
      formCard.style.display = "";
      setTimeout(() => formCard.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
    }
  } else {
    if (resumoEl) resumoEl.style.display = "none";
    if (listaEl) listaEl.innerHTML = "";
  }
}

function ag2MarcarConflitos(nomes) {
  nomes.forEach(n => _ag2EspacosSelecionados.delete(n));
  document.querySelectorAll("[data-espaco]").forEach(card => {
    if (!nomes.includes(card.dataset.espaco)) return;
    card.classList.remove("ag2-espaco-sel");
    card.classList.add("ag2-espaco-indisp");
    card.onclick = null;
    card.title   = `${card.dataset.espaco} — reservado`;
    if (!card.querySelector(".ag2-lock")) {
      const hdr = card.querySelector(".ag2-card-hdr") || card;
      hdr.insertAdjacentHTML("beforeend",
        `<span class="ag2-lock">🔒</span><span class="ag2-tag-ocupado">Conflito</span>`);
    }
  });
  ag2AtualizarSelecao();
  const espCard = document.getElementById("ag2-card-espacos");
  if (espCard) espCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function ag2Enviar() {
  if (document.getElementById("_gotcha")?.value) return;

  const rlMsg = _checarRateLimit();
  if (rlMsg) { ag2MostrarErro(rlMsg); return; }

  const tipo   = _ag2Tipo || document.querySelector("input[name='ag2-tipo']:checked")?.value || "";
  const di     = document.getElementById("ag2-data-i")?.value  || "";
  const hi     = document.getElementById("ag2-hora-i")?.value  || null;
  const df     = document.getElementById("ag2-data-f")?.value  || di;
  const hf     = document.getElementById("ag2-hora-f")?.value  || null;
  const part   = parseInt(document.getElementById("ag2-part")?.value || "0", 10) || null;
  const espacosList = [..._ag2EspacosSelecionados];
  const espaco      = espacosList.join(", ");
  const nome        = (document.getElementById("ag2-nome")?.value   || "").trim();
  const tel    = (document.getElementById("ag2-tel")?.value    || "").trim();
  const titulo = (document.getElementById("ag2-titulo")?.value || "").trim();
  const desc   = (document.getElementById("ag2-desc")?.value   || "").trim();

  if (!tipo)   { ag2MostrarErro("Selecione o tipo de solicitação."); return; }
  if (!di)     { ag2MostrarErro("Informe a data de início."); return; }
  if (!espaco) { ag2MostrarErro("Selecione ao menos um espaço disponível antes de continuar."); return; }
  if (!nome)   { ag2MostrarErro("Informe seu nome completo.");   document.getElementById("ag2-nome")?.focus();   return; }
  if (!tel)    { ag2MostrarErro("Informe seu telefone ou WhatsApp."); document.getElementById("ag2-tel")?.focus(); return; }
  if (!titulo) { ag2MostrarErro("Informe o título da programação."); document.getElementById("ag2-titulo")?.focus(); return; }
  if (!ag2ValidarPeriodo()) { ag2MostrarErro("Verifique as datas e horários informados."); return; }

  ag2LimparErro();

  const catObj    = CATS.find(c => c.nome === "Agendamentos");
  const resp      = catObj?.resp || "Secretaria / Liderança";
  const hoje      = new Date().toISOString().split("T")[0];
  const multiDia  = df && df !== di;
  const descFinal = [
    desc,
    "━━━ Dados da Programação ━━━",
    multiDia
      ? `Período: ${fmtDataBR(di)}${hi ? " às " + hi : ""} até ${fmtDataBR(df)}${hf ? " às " + hf : ""}`
      : `Data: ${fmtDataBR(di)}`,
    !multiDia && hi ? `Horário início: ${hi}` : null,
    !multiDia && hf ? `Horário fim: ${hf}`    : null,
    `Espaço: ${espaco}`,
    part ? `Participantes estimados: ${part}` : null,
  ].filter(Boolean).join("\n");

  const newId = crypto.randomUUID();
  const btn   = document.getElementById("ag2-btn-enviar");
  if (btn) { btn.disabled = true; btn.textContent = "Enviando…"; }

  try {
    // 0. Pré-verificação de conflito antes de criar o chamado
    try {
      const preRes = await fetch(`${SB_URL}/rest/v1/rpc/espacos_disponibilidade`, {
        method:  "POST",
        headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          p_data_inicio: di,
          p_hora_inicio: hi || "00:00",
          p_data_fim:    df,
          p_hora_fim:    hf || null,
        }),
      });
      if (preRes.ok) {
        const raw = await preRes.json();
        const arr = Array.isArray(raw) && Array.isArray(raw[0]) ? raw[0] : raw;
        if (Array.isArray(arr) && arr.length > 0) {
          const conflitantes = espacosList.filter(sp => {
            const d = arr.find(x => x.nome === sp);
            return d && !d.disponivel;
          });
          if (conflitantes.length > 0) {
            if (btn) { btn.disabled = false; btn.textContent = "Enviar Solicitação"; }
            ag2MarcarConflitos(conflitantes);
            ag2MostrarErro(
              `Conflito: ${conflitantes.join(", ")} não está mais disponível para este período. Selecione outro espaço.`
            );
            return;
          }
        }
      }
    } catch (_) { /* RPC indisponível — prossegue; DB verifica */ }

    // 1. Criar chamado
    const res = await fetch(`${SB_URL}/functions/v1/chamado-publico`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + SB_KEY },
      body: JSON.stringify({
        id:              newId,
        area:            "Agendamentos",
        subcategoria:    tipo,
        titulo:          titulo,
        descricao:       descFinal,
        local:           espaco,
        solicitante:     nome,
        solicitante_txt: tel ? `${nome} · ${tel}` : nome,
        telefone:        tel,
        responsavel:     resp,
        responsavel_txt: resp,
        financial_data:  null,
        data_abertura:   hoje,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || `Erro ${res.status}`);
    }
    const data   = await res.json().catch(() => ({}));
    const ticket = data.numero_chamado || "—";
    try { localStorage.setItem(_RL_KEY, String(Date.now())); } catch(_) {}

    // 2. Criar reserva provisória na agenda
    let protocolo = null;
    let agendaId  = null;
    const rpcRes  = await fetch(`${SB_URL}/rest/v1/rpc/solicitar_agendamento`, {
      method:  "POST",
      headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_titulo:            titulo,
        p_data:              di,
        p_hora_inicio:       hi    || null,
        p_hora_fim:          hf    || null,
        p_espaco:            espaco,
        p_subcategoria:      tipo,
        p_observacao:        desc  || null,
        p_nome:              nome,
        p_telefone:          tel,
        p_participantes:     part,
        p_origem:            "link_publico",
        p_data_encerramento: df    || null,
        p_demanda_id:        newId,
      }),
    });
    if (rpcRes.ok) {
      const rpcData = await rpcRes.json().catch(() => ({}));
      if (rpcData.ok) {
        protocolo = rpcData.protocolo;
        agendaId  = rpcData.agenda_id || null;
      } else if (rpcData.conflito) {
        if (btn) { btn.disabled = false; btn.textContent = "Enviar Solicitação"; }
        _ag2DispVerificada = false;
        ag2MostrarErro("Conflito de reserva: o espaço foi reservado por outra pessoa neste período. Selecione outro espaço ou horário.");
        return;
      } else {
        if (btn) { btn.disabled = false; btn.textContent = "Enviar Solicitação"; }
        ag2MostrarErro(rpcData.erro || "Não foi possível registrar o agendamento. Tente novamente.");
        return;
      }
    } else {
      const errBody = await rpcRes.json().catch(() => ({}));
      if (btn) { btn.disabled = false; btn.textContent = "Enviar Solicitação"; }
      ag2MostrarErro(errBody.message || errBody.error || `Erro ao registrar agendamento (${rpcRes.status}).`);
      return;
    }

    // 3. Arte digital?
    const arteVal = document.querySelector("input[name='ag2-arte']:checked")?.value;
    if (arteVal === "sim" && agendaId) {
      // Pré-preenche campos antigos para compatibilidade com _iniciarStep2
      const _fi = id => document.getElementById(id);
      if (_fi("f-nome"))     _fi("f-nome").value     = nome;
      if (_fi("f-tel"))      _fi("f-tel").value       = tel;
      if (_fi("f-ag-data"))  _fi("f-ag-data").value   = di;
      if (_fi("f-ag-inicio")) _fi("f-ag-inicio").value = hi || "";
      document.getElementById("screen-agend").style.display = "none";
      _iniciarStep2(agendaId, protocolo, titulo, ticket);
      // Corrige local (sem checkboxes no novo fluxo)
      _arteLocal = espaco || null;
      const progEl = document.getElementById("s2-prog-info");
      if (progEl && espaco && !progEl.innerHTML.includes("Local:")) {
        progEl.innerHTML += ` · Local: ${espaco}`;
      }
      return;
    }

    // 4. Sucesso sem arte digital — exibe protocolo da agenda como referência principal
    document.getElementById("ok-numero").textContent = protocolo || ticket;
    const okProtoEl = document.getElementById("ok-protocolo");
    if (okProtoEl) {
      okProtoEl.style.display = "none";
    }
    document.getElementById("screen-agend").style.display = "none";
    document.getElementById("screen-ok").style.display    = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });

  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = "Enviar Solicitação"; }
    ag2MostrarErro(e.message || "Falha ao enviar. Tente novamente.");
  }
}

function ag2MostrarErro(msg) {
  const el = document.getElementById("ag2-err");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function ag2LimparErro() {
  const el = document.getElementById("ag2-err");
  if (!el) return;
  el.textContent = "";
  el.classList.remove("show");
}

/* ── Novo envio ────────────────────────────────────────────── */
function novoEnvio() {
  // Reseta estado de arte digital
  _arteAgendaId  = null;
  _arteProtocolo = null;
  _arteTitulo    = null;
  _arteTicket    = null;
  _arteDataEvt   = null;
  _arteHoraEvt   = null;
  _arteLocal     = null;
  document.querySelectorAll("input[name='ag-arte']").forEach(r => r.checked = false);
  ["s2-resp","s2-tel","s2-desc","s2-prazo","s2-info"].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = "";
  });
  const s2min = document.getElementById("s2-min"); if (s2min) s2min.value = "";
  document.querySelectorAll("input[name='s2-area'],input[name='s2-fmt']").forEach(cb => cb.checked = false);
  const s2av = document.getElementById("s2-prazo-aviso"); if (s2av) s2av.style.display = "none";
  document.getElementById("screen-step2").style.display = "none";
  document.getElementById("screen-agend").style.display = "none";
  const okProt = document.getElementById("ok-protocolo");
  const okConf = document.getElementById("ok-aviso-conflito");
  if (okProt) { okProt.innerHTML = ""; okProt.style.display = "none"; okProt.style.background = ""; okProt.style.borderColor = ""; okProt.style.color = ""; }
  if (okConf) okConf.style.display = "none";
  // Reseta campos de comunicação
  ["f-com-data","f-com-hora","f-com-prazo"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  document.querySelectorAll("input[name='com-area'],input[name='com-fmt']").forEach(cb => cb.checked = false);
  const comAv = document.getElementById("com-prazo-aviso");
  if (comAv) comAv.style.display = "none";
  // Reseta campos gerais
  ["f-nome","f-tel","f-titulo","f-desc","f-local",
   "f-fin-tipo","f-fin-valor","f-fin-venc","f-fin-benefic","f-fin-cpf",
   "f-fin-forma","f-fin-pix","f-fin-banco","f-fin-ag","f-fin-conta","f-fin-obs",
   "f-reimb-nome","f-reimb-valor","f-reimb-motivo","f-reimb-forma","f-reimb-pix",
   "f-reimb-min","f-reimb-pastor","f-reimb-obs"
  ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });

  document.getElementById("f-cat").value     = "";
  document.getElementById("f-sub").innerHTML = "<option value=''>Selecione a área primeiro</option>";
  _ocultarFinanceiro();
  limparErro();
  document.getElementById("screen-ok").style.display   = "none";
  document.getElementById("screen-form").style.display = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ═══════════════════════════════════════════════════════════════
// REQUISIÇÃO DE ESPAÇO OCUPADO
// ═══════════════════════════════════════════════════════════════

let _ag2ReqCtx = null; // { espaco, ocupacoes, di, hi, hf }
const _esc = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

function ag2AbrirMenu(evt, btn) {
  evt.stopPropagation();
  const card = btn.closest("[data-espaco]");
  const nome  = card?.dataset.espaco || "";
  const occs  = card?.dataset.ocupacoes ? JSON.parse(card.dataset.ocupacoes) : [];
  _ag2ReqCtx = {
    espaco: nome, ocupacoes: occs,
    di: document.getElementById("ag2-data-i")?.value || "",
    hi: document.getElementById("ag2-hora-i")?.value || "",
    hf: document.getElementById("ag2-hora-f")?.value || "",
  };
  const popup = document.getElementById("ag2-menu-popup");
  if (!popup) return;
  const r = btn.getBoundingClientRect();
  popup.style.top  = (r.bottom + 4) + "px";
  popup.style.left = Math.min(r.right - popup.offsetWidth, window.innerWidth - 180) + "px";
  popup.classList.add("aberto");
}

document.addEventListener("click", () => {
  document.getElementById("ag2-menu-popup")?.classList.remove("aberto");
});

function ag2AbrirModalReq() {
  document.getElementById("ag2-menu-popup")?.classList.remove("aberto");
  if (!_ag2ReqCtx) return;
  const ctx = _ag2ReqCtx;

  // Pré-preencher com dados já no formulário principal
  const preNome = (document.getElementById("ag2-nome")?.value || "").trim();
  const preTel  = (document.getElementById("ag2-tel")?.value  || "").trim();
  const preTipo = _ag2Tipo || document.querySelector("input[name='ag2-tipo']:checked")?.value || "";
  const preTit  = (document.getElementById("ag2-titulo")?.value || "").trim();

  const fmtH = h => h ? String(h).slice(0,5) : null;
  const fmtD = d => { if (!d) return "—"; const p = d.split("-"); return `${p[2]}/${p[1]}/${p[0]}`; };
  const occsHtml = ctx.ocupacoes.length
    ? ctx.ocupacoes.map(o => `<li>${ag2FormatarIntervalo(o)}</li>`).join("")
    : "<li>Horário ocupado (detalhes não disponíveis)</li>";

  const horSol = ctx.hi && ctx.hf ? `${fmtH(ctx.hi)} às ${fmtH(ctx.hf)}`
               : ctx.hi ? `a partir das ${fmtH(ctx.hi)}`
               : "Não informado";

  document.getElementById("ag2-req-overlay")?.remove();

  const el = document.createElement("div");
  el.id        = "ag2-req-overlay";
  el.className = "ag2-req-overlay";
  el.innerHTML = `
  <div class="ag2-req-box" role="dialog" aria-modal="true">
    <div class="ag2-req-hdr">
      <div class="ag2-req-hdr-txt">
        <h3>Requisitar espaço ocupado</h3>
        <p>A requisição será analisada pela Administração. Não garante liberação do espaço.</p>
      </div>
      <button class="ag2-req-close" onclick="document.getElementById('ag2-req-overlay').remove()" aria-label="Fechar">×</button>
    </div>

    <!-- PASSO 1: Formulário -->
    <div id="ag2-req-step1">
      <div class="ag2-req-body">

        <!-- Resumo da ocupação -->
        <div class="ag2-req-resumo">
          <strong>🔒 ${_esc(ctx.espaco)}</strong>
          &nbsp;·&nbsp; ${fmtD(ctx.di)}
          &nbsp;·&nbsp; Horário solicitado: ${_esc(horSol)}<br>
          <strong>Ocupado atualmente:</strong>
          <ul>${occsHtml}</ul>
        </div>

        <!-- Dados do solicitante -->
        <div class="ag2-req-sec">
          <div class="ag2-req-sec-ttl">Seus dados</div>
          <div class="ag2-req-row">
            <div class="ag2-req-field">
              <label>Nome completo *</label>
              <input id="req-nome" type="text" placeholder="Seu nome completo" value="${_esc(preNome)}">
            </div>
            <div class="ag2-req-field">
              <label>Telefone / WhatsApp *</label>
              <input id="req-tel" type="tel" placeholder="(11) 99999-9999" value="${_esc(preTel)}">
            </div>
          </div>
        </div>

        <!-- Programação pretendida -->
        <div class="ag2-req-sec">
          <div class="ag2-req-sec-ttl">Programação pretendida</div>
          <div class="ag2-req-row">
            <div class="ag2-req-field" style="flex:0 0 160px">
              <label>Tipo de programação</label>
              <input id="req-tipo" type="text" placeholder="Ex: Culto, Ensaio, Evento" value="${_esc(preTipo)}">
            </div>
            <div class="ag2-req-field">
              <label>Título *</label>
              <input id="req-titulo" type="text" placeholder="Nome da programação" value="${_esc(preTit)}">
            </div>
          </div>
          <div class="ag2-req-row">
            <div class="ag2-req-field" style="flex:0 0 100px">
              <label>Participantes estimados</label>
              <input id="req-part" type="number" min="1" placeholder="0">
            </div>
            <div class="ag2-req-field">
              <label>Horário pretendido</label>
              <div style="display:flex;gap:8px;align-items:center">
                <input id="req-hi" type="time" value="${_esc(ctx.hi)}" style="width:120px">
                <span style="font-size:11px;color:var(--tx3)">às</span>
                <input id="req-hf" type="time" value="${_esc(ctx.hf)}" style="width:120px">
              </div>
            </div>
          </div>
          <div class="ag2-req-field" style="margin-bottom:10px">
            <label>Descrição resumida</label>
            <textarea id="req-desc" placeholder="Descrição breve da programação"></textarea>
          </div>
        </div>

        <!-- Justificativa -->
        <div class="ag2-req-sec">
          <div class="ag2-req-sec-ttl">Justificativa *</div>
          <div class="ag2-req-field">
            <label>Por que esta programação precisa deste espaço?</label>
            <textarea id="req-just" rows="4" placeholder="Explique a finalidade, o número de participantes, as necessidades da programação e por que outro espaço não atenderia adequadamente."></textarea>
          </div>
        </div>

        <!-- Flexibilidade -->
        <div class="ag2-req-sec">
          <div class="ag2-req-sec-ttl">Flexibilidade</div>
          <div style="margin-bottom:12px">
            <div style="font-size:11px;font-weight:600;color:var(--tx3);margin-bottom:6px">Pode utilizar outro espaço?</div>
            <div class="ag2-req-radios">
              <label><input type="radio" name="req-outro-esp" value="Sim" onchange="ag2ReqToggleAlt('esp',this.value)"> Sim</label>
              <label><input type="radio" name="req-outro-esp" value="Não" checked onchange="ag2ReqToggleAlt('esp',this.value)"> Não</label>
              <label><input type="radio" name="req-outro-esp" value="Talvez" onchange="ag2ReqToggleAlt('esp',this.value)"> Talvez, mediante avaliação</label>
            </div>
            <div id="req-alt-esp" class="ag2-req-alt">
              <input id="req-espacos-alt" type="text" placeholder="Quais espaços alternativos seriam possíveis?">
            </div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:600;color:var(--tx3);margin-bottom:6px">Pode alterar o horário?</div>
            <div class="ag2-req-radios">
              <label><input type="radio" name="req-outro-hor" value="Sim" onchange="ag2ReqToggleAlt('hor',this.value)"> Sim</label>
              <label><input type="radio" name="req-outro-hor" value="Não" checked onchange="ag2ReqToggleAlt('hor',this.value)"> Não</label>
              <label><input type="radio" name="req-outro-hor" value="Talvez" onchange="ag2ReqToggleAlt('hor',this.value)"> Talvez, mediante avaliação</label>
            </div>
            <div id="req-alt-hor" class="ag2-req-alt">
              <input id="req-horarios-alt" type="text" placeholder="Quais horários alternativos seriam possíveis?">
            </div>
          </div>
          <div style="margin-top:10px" id="req-obs-container">
            <div style="font-size:11px;font-weight:600;color:var(--tx3);margin-bottom:6px">Observações adicionais</div>
            <textarea id="req-obs" rows="2" placeholder="Informações complementares para a Administração"></textarea>
          </div>
        </div>

      </div>
      <div class="ag2-req-ftr">
        <button class="ag2-req-btn-cancel" onclick="document.getElementById('ag2-req-overlay').remove()">Cancelar</button>
        <button class="ag2-req-btn-next" onclick="ag2ReqConfirmar()">Continuar →</button>
      </div>
    </div>

    <!-- PASSO 2: Confirmação -->
    <div id="ag2-req-step2" style="display:none">
      <div class="ag2-req-body">
        <div class="ag2-req-aviso">
          <strong>⚠️ Atenção antes de enviar</strong><br><br>
          Esta requisição <strong>não garante a liberação do espaço</strong>.<br><br>
          A reserva existente permanecerá válida até que a Administração analise o conflito e comunique a decisão.<br><br>
          Você receberá um protocolo de acompanhamento.
        </div>
        <div style="font-size:12px;color:var(--tx2);background:var(--bg);border-radius:8px;padding:12px 14px;border:1px solid var(--bd)">
          <strong>Espaço:</strong> <span id="req-conf-espaco"></span><br>
          <strong>Data:</strong> <span id="req-conf-data"></span><br>
          <strong>Horário solicitado:</strong> <span id="req-conf-horario"></span><br>
          <strong>Programação:</strong> <span id="req-conf-titulo"></span><br>
          <strong>Solicitante:</strong> <span id="req-conf-nome"></span>
        </div>
        <div id="req-erro" style="display:none;margin-top:12px;color:var(--rose);font-size:12px;background:rgba(220,53,69,.07);border-radius:7px;padding:10px 13px"></div>
      </div>
      <div class="ag2-req-ftr">
        <button class="ag2-req-btn-cancel" onclick="ag2ReqVoltar()">← Voltar</button>
        <button class="ag2-req-btn-submit" id="req-btn-enviar" onclick="ag2EnviarRequisicao()">Enviar Requisição</button>
      </div>
    </div>
  </div>`;

  document.body.appendChild(el);
  document.getElementById("req-nome")?.focus();
}

function ag2ReqToggleAlt(tipo, valor) {
  const id = tipo === "esp" ? "req-alt-esp" : "req-alt-hor";
  const el = document.getElementById(id);
  if (el) el.style.display = (valor === "Sim" || valor === "Talvez") ? "block" : "none";
}

function ag2ReqConfirmar() {
  const nome  = (document.getElementById("req-nome")?.value  || "").trim();
  const tel   = (document.getElementById("req-tel")?.value   || "").trim();
  const tit   = (document.getElementById("req-titulo")?.value || "").trim();
  const just  = (document.getElementById("req-just")?.value  || "").trim();

  if (!nome) { document.getElementById("req-nome")?.focus(); return; }
  if (!tel)  { document.getElementById("req-tel")?.focus();  return; }
  if (!tit)  { document.getElementById("req-titulo")?.focus(); return; }
  if (!just) { document.getElementById("req-just")?.focus(); return; }

  const fmtH = h => h ? String(h).slice(0,5) : null;
  const fmtD = d => { if (!d) return "—"; const p = d.split("-"); return `${p[2]}/${p[1]}/${p[0]}`; };
  const ctx  = _ag2ReqCtx;
  const hi   = document.getElementById("req-hi")?.value || ctx?.hi || "";
  const hf   = document.getElementById("req-hf")?.value || ctx?.hf || "";

  document.getElementById("req-conf-espaco").textContent  = ctx?.espaco || "—";
  document.getElementById("req-conf-data").textContent    = fmtD(ctx?.di || "");
  document.getElementById("req-conf-horario").textContent = hi && hf ? `${fmtH(hi)} – ${fmtH(hf)}` : fmtH(hi) || "Não informado";
  document.getElementById("req-conf-titulo").textContent  = tit;
  document.getElementById("req-conf-nome").textContent    = nome;

  document.getElementById("ag2-req-step1").style.display = "none";
  document.getElementById("ag2-req-step2").style.display = "";
}

function ag2ReqVoltar() {
  document.getElementById("ag2-req-step1").style.display = "";
  document.getElementById("ag2-req-step2").style.display = "none";
  document.getElementById("req-erro").style.display = "none";
}

async function ag2EnviarRequisicao() {
  const ctx   = _ag2ReqCtx;
  if (!ctx) return;
  const btn = document.getElementById("req-btn-enviar");
  if (btn) { btn.disabled = true; btn.textContent = "Enviando…"; }

  const fmtH = h => h ? String(h).slice(0,5) : null;
  const val  = id => (document.getElementById(id)?.value || "").trim();
  const radio = name => document.querySelector(`input[name='${name}']:checked`)?.value || "Não";

  const payload = {
    p_espaco_nome:      ctx.espaco,
    p_data:             ctx.di,
    p_hora_ini:         fmtH(val("req-hi") || ctx.hi),
    p_hora_fim:         fmtH(val("req-hf") || ctx.hf),
    p_ocupacoes:        ctx.ocupacoes,
    p_solicitante_nome: val("req-nome"),
    p_solicitante_tel:  val("req-tel"),
    p_tipo:             val("req-tipo")  || null,
    p_titulo:           val("req-titulo"),
    p_descricao:        val("req-desc")  || null,
    p_participantes:    parseInt(val("req-part")) || null,
    p_justificativa:    val("req-just"),
    p_aceita_outro_esp: radio("req-outro-esp"),
    p_espacos_alt:      val("req-espacos-alt") || null,
    p_aceita_outro_hor: radio("req-outro-hor"),
    p_horarios_alt:     val("req-horarios-alt") || null,
    p_obs_alt:          val("req-obs") || null,
  };

  try {
    const res = await fetch(`${SB_URL}/rest/v1/rpc/requisitar_espaco_ocupado`, {
      method: "POST",
      headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    const rpc  = Array.isArray(data) ? data[0] : data;

    if (!res.ok || !rpc?.ok) {
      if (rpc?.duplicado) {
        const errEl = document.getElementById("req-erro");
        if (errEl) {
          errEl.textContent = `Já existe uma requisição em análise para este espaço e período. Protocolo: ${rpc.protocolo || ""}`;
          errEl.style.display = "";
        }
      } else {
        throw new Error(rpc?.erro || `Erro ${res.status}`);
      }
      if (btn) { btn.disabled = false; btn.textContent = "Enviar Requisição"; }
      return;
    }

    // Sucesso — fechar modal e mostrar tela de conclusão
    document.getElementById("ag2-req-overlay")?.remove();
    const prot = rpc.protocolo || "";

    // Ocultar todas as telas e mostrar screen-ok adaptada para requisição
    ["screen-form","screen-agend","screen-step2"].forEach(id => {
      const s = document.getElementById(id); if (s) s.style.display = "none";
    });
    const okTitle = document.querySelector(".ok-title");
    if (okTitle) okTitle.textContent = "Requisição registrada";
    const okMsg = document.querySelector(".ok-msg");
    if (okMsg) okMsg.innerHTML = `Sua requisição foi registrada e será analisada pela Administração.<br><br>
      O espaço permanece reservado até a decisão.<br><br>
      <strong>Obrigado!</strong>`;
    const okNum = document.getElementById("ok-numero");
    if (okNum) okNum.textContent = prot;
    const okIcon = document.querySelector(".ok-icon");
    if (okIcon) okIcon.textContent = "📨";
    document.getElementById("ok-protocolo").style.display  = "none";
    document.getElementById("ok-aviso-conflito").style.display = "none";
    const okScreen = document.getElementById("screen-ok");
    if (okScreen) { okScreen.style.display = ""; }
    window.scrollTo({ top: 0, behavior: "smooth" });

  } catch(e) {
    const errEl = document.getElementById("req-erro");
    if (errEl) { errEl.textContent = e.message || "Erro ao enviar. Tente novamente."; errEl.style.display = ""; }
    if (btn) { btn.disabled = false; btn.textContent = "Enviar Requisição"; }
  }
}
