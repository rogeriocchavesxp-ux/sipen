/* ── ESTADO: dias do evento em edição ───────────────────────── */
let _agDiasState = [];

function _agRenderizarDias() {
  const container = document.getElementById("ag-dias-list");
  if (!container) return;
  const fi = `width:100%;background:var(--bg-input,var(--bg-surface));border:1px solid var(--bd2);border-radius:7px;color:var(--tx1);font-size:12.5px;padding:8px 11px;outline:none;box-sizing:border-box`;
  const lbl = t => `<label style="font-size:9.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:5px">${t}</label>`;
  container.innerHTML = _agDiasState.map((d, idx) => `
    <div style="display:grid;grid-template-columns:1.3fr 1fr 1fr auto;gap:8px;align-items:end;padding:10px;background:var(--bg-surface);border:1px solid var(--bd1);border-radius:8px">
      <div>${lbl(idx === 0 ? "Data *" : "Data")}
        <input id="ag-dia-data-${idx}" type="date" value="${d.data||""}" style="${fi}" oninput="_agSincDia(${idx})">
      </div>
      <div>${lbl("Início")}
        <input id="ag-dia-ini-${idx}" type="time" value="${d.hora_inicio||""}" style="${fi}">
      </div>
      <div>${lbl("Fim")}
        <input id="ag-dia-fim-${idx}" type="time" value="${d.hora_fim||""}" style="${fi}">
      </div>
      <div style="padding-bottom:1px">
        ${idx > 0
          ? `<button type="button" onclick="_agRemoverDia(${idx})" title="Remover dia"
               style="width:32px;height:36px;border-radius:7px;border:1px solid rgba(224,85,85,.4);background:rgba(224,85,85,.06);color:var(--rose);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>`
          : `<div style="width:32px"></div>`}
      </div>
    </div>`).join("");
}

window._agAdicionarDia = function() {
  const ultimo = _agDiasState[_agDiasState.length - 1] || {};
  let proxData = "";
  if (ultimo.data) {
    const d = new Date(ultimo.data + "T12:00:00");
    d.setDate(d.getDate() + 1);
    proxData = d.toISOString().slice(0, 10);
  }
  _agDiasState.push({ data: proxData, hora_inicio: ultimo.hora_inicio || "", hora_fim: ultimo.hora_fim || "" });
  _agRenderizarDias();
};

window._agRemoverDia = function(idx) {
  _agDiasState.splice(idx, 1);
  _agRenderizarDias();
};

window._agSincDia = function(idx) {
  const d = document.getElementById(`ag-dia-data-${idx}`);
  if (d && _agDiasState[idx]) _agDiasState[idx].data = d.value;
};

/* ── SALAS DA IGREJA — carregadas do cadastro central ──────── */
function agSalasSelect(id, valorAtual = "") {
  const inputStyle = `width:100%;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none`;
  return `<select id="${id}" class="fi2" style="${inputStyle}" data-valor-atual="${valorAtual}">
    <option value="">Carregando espaços…</option>
  </select>`;
}

async function agSalasSelectPopular(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const valorAtual = el.dataset.valorAtual || "";
  try {
    const r = await fetch(`${apiBaseUrl()}/rest/v1/espacos?ativo=eq.true&order=grupo.asc,ordem.asc,nome.asc`, { headers: apiHeaders() });
    const rows = r.ok ? await r.json() : [];
    const grupos = {};
    rows.forEach(e => {
      const g = e.grupo || "Outros";
      if (!grupos[g]) grupos[g] = [];
      grupos[g].push(e);
    });
    el.innerHTML = `<option value="">— Selecione o espaço —</option>`;
    Object.entries(grupos).forEach(([g, items]) => {
      const grp = document.createElement("optgroup");
      grp.label = g;
      items.forEach(e => {
        const opt = document.createElement("option");
        opt.value = e.id;
        opt.dataset.nome = e.nome;
        opt.textContent = e.nome;
        if (e.id === valorAtual || e.nome === valorAtual) opt.selected = true;
        grp.appendChild(opt);
      });
      el.appendChild(grp);
    });
  } catch (_) {
    el.innerHTML = `<option value="${valorAtual}">${valorAtual || "— Selecione o espaço —"}</option>`;
  }
}

/* ── DEPARTAMENTO ORGANIZADOR — select populado do banco ─────── */
const _AG_TIPO_LABEL = {
  MUSICA: "Música", JOVENS: "Jovens", INFANTIL: "Infantil",
  INTERCESSAO: "Intercessão", EVANGELISMO: "Evangelismo",
  DIACONIA: "Diaconia", COMUNICACAO: "Comunicação",
  ACOLHIMENTO: "Acolhimento & Integração", SOCIEDADE: "Sociedade",
  OUTRO: "Outro",
};

async function _agPopularOrganizador() {
  const el = document.getElementById("ag-f-organizador");
  if (!el) return;
  const valorAtual = el.dataset.valorAtual || "";
  try {
    const r = await fetch(
      `${apiBaseUrl()}/rest/v1/ministerios?ativo=eq.true&order=tipo.asc,nome.asc&select=nome,tipo`,
      { headers: apiHeaders() }
    );
    const rows = r.ok ? await r.json() : [];
    const grupos = {};
    rows.forEach(m => {
      const g = _AG_TIPO_LABEL[m.tipo] || "Geral";
      if (!grupos[g]) grupos[g] = [];
      grupos[g].push(m.nome);
    });
    el.innerHTML = `<option value="">— Selecione o departamento —</option>`;
    Object.entries(grupos).forEach(([g, nomes]) => {
      const grp = document.createElement("optgroup");
      grp.label = g;
      nomes.forEach(nome => {
        const opt = document.createElement("option");
        opt.value = nome;
        opt.textContent = nome;
        if (nome === valorAtual) opt.selected = true;
        grp.appendChild(opt);
      });
      el.appendChild(grp);
    });
    if (valorAtual && !el.value) {
      const opt = document.createElement("option");
      opt.value = valorAtual;
      opt.textContent = valorAtual;
      opt.selected = true;
      el.insertBefore(opt, el.children[1]);
    }
  } catch (_) {
    el.innerHTML = `<option value="${escapeHtml(valorAtual)}">${escapeHtml(valorAtual) || "— Selecione —"}</option>`;
  }
}

/* ── AUTOCOMPLETE DE PESSOAS (organizador / responsável) ─────── */
const _agBuscaTimer = {};

function _agAutocompleteHtml(campo, labelTxt, valorInicial, fi) {
  return `
    <div>
      <label style="font-size:9.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:5px">${labelTxt}</label>
      <div style="position:relative">
        <input id="ag-f-${campo}" type="text" value="${escapeHtml(valorInicial)}" autocomplete="off"
          placeholder="Digite para buscar..."
          oninput="_agBuscarPessoa('${campo}',this.value)"
          onblur="_agFecharDropdown('${campo}')"
          style="${fi}">
        <div id="ag-dd-${campo}" style="display:none;position:absolute;top:calc(100% + 2px);left:0;right:0;background:var(--bg-card);border:1px solid var(--bd2);border-radius:7px;box-shadow:0 6px 20px rgba(0,0,0,.18);z-index:500;max-height:180px;overflow-y:auto"></div>
      </div>
      <input type="hidden" id="ag-f-${campo}-tel" value="">
    </div>`;
}

window._agBuscarPessoa = function(campo, query) {
  clearTimeout(_agBuscaTimer[campo]);
  const dd = document.getElementById(`ag-dd-${campo}`);
  if (!dd) return;
  const q = query.trim();
  if (q.length < 2) { dd.style.display = "none"; return; }
  document.getElementById(`ag-f-${campo}-tel`)?.setAttribute("value", "");
  _agBuscaTimer[campo] = setTimeout(async () => {
    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/pessoas?nome=ilike.*${encodeURIComponent(q)}*&select=id,nome,whatsapp,celular,telefone&deleted_at=is.null&order=nome.asc&limit=8`,
        { headers: apiHeaders() }
      );
      const rows = res.ok ? await res.json() : [];
      if (!rows.length) {
        dd.innerHTML = `<div style="padding:9px 12px;color:var(--tx3);font-size:11.5px">Nenhuma pessoa encontrada</div>`;
      } else {
        dd.innerHTML = rows.map(p => {
          const tel = p.whatsapp || p.celular || p.telefone || "";
          return `<div onmousedown="_agSelecionarPessoa('${campo}','${escapeHtml(p.nome).replace(/'/g,"\\'")}','${tel.replace(/'/g,"\\'")}') "
            style="padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--bd1)"
            onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
            <div style="font-size:12px;font-weight:600;color:var(--tx1)">${escapeHtml(p.nome)}</div>
            ${tel ? `<div style="font-size:10px;color:var(--tx3);margin-top:1px">${escapeHtml(tel)}</div>` : ""}
          </div>`;
        }).join("");
      }
      dd.style.display = "block";
    } catch(_) { dd.style.display = "none"; }
  }, 280);
};

window._agSelecionarPessoa = function(campo, nome, tel) {
  const inp = document.getElementById(`ag-f-${campo}`);
  const telInp = document.getElementById(`ag-f-${campo}-tel`);
  const dd = document.getElementById(`ag-dd-${campo}`);
  if (inp) inp.value = nome;
  if (telInp) telInp.value = tel;
  if (dd) dd.style.display = "none";
  if (campo === "responsavel" && tel) {
    const telField = document.getElementById("ag-f-telefone");
    if (telField && !telField.value) telField.value = tel;
  }
};

window._agFecharDropdown = function(campo) {
  setTimeout(() => {
    const dd = document.getElementById(`ag-dd-${campo}`);
    if (dd) dd.style.display = "none";
  }, 150);
};

async function _agPreencherTelSilent(campo, nome) {
  if (!nome) return;
  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/pessoas?nome=ilike.${encodeURIComponent(nome)}&select=whatsapp,celular,telefone&deleted_at=is.null&limit=1`,
      { headers: apiHeaders() }
    );
    const rows = res.ok ? await res.json() : [];
    const tel = rows[0]?.whatsapp || rows[0]?.celular || rows[0]?.telefone || "";
    const el = document.getElementById(`ag-f-${campo}-tel`);
    if (el && tel) el.value = tel;
  } catch(_) {}
}

/* ── ESPAÇOS — cache e popup de seleção ──────────────────────── */
const AG_TIPOS_COR = {
  "Culto":       "#dc2626",
  "Reunião":     "#ea580c",
  "Ensaio":      "#0284c7",
  "Congresso":   "#2563eb",
  "Conferência": "#7c3aed",
  "Evento":      "#059669",
  "Casamento":   "#db2777",
  "Aniversário": "#d97706",
  "Outros":      "#6b7280",
};

let _agEspacosCache = null;
async function _agCarregarEspacos() {
  if (_agEspacosCache) return _agEspacosCache;
  try {
    const r = await fetch(`${apiBaseUrl()}/rest/v1/espacos?ativo=eq.true&order=grupo.asc,ordem.asc,nome.asc`, { headers: apiHeaders() });
    _agEspacosCache = r.ok ? await r.json() : [];
  } catch(_) { _agEspacosCache = []; }
  return _agEspacosCache;
}

function agAbrirEspacos() {
  const selecionados = new Set(
    (document.getElementById("ag-f-espaco-txt")?.value || "").split(",").map(s=>s.trim()).filter(Boolean)
  );
  const lista = _agEspacosCache || [];
  const grupos = {};
  lista.forEach(e => {
    const g = e.grupo || "Outros";
    if (!grupos[g]) grupos[g] = [];
    grupos[g].push(e);
  });

  let pop = document.getElementById("ag-esp-popup");
  if (!pop) { pop = document.createElement("div"); pop.id = "ag-esp-popup"; document.body.appendChild(pop); }
  pop.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px";
  pop.innerHTML = `
    <div style="background:var(--bg-card);border-radius:12px;width:100%;max-width:460px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.3)">
      <div style="padding:16px 20px 12px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:700;color:var(--tx1)">Selecionar espaços</div>
        <button onclick="document.getElementById('ag-esp-popup').style.display='none'" style="background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer;padding:0;line-height:1">✕</button>
      </div>
      <div style="overflow-y:auto;padding:16px 20px;flex:1">
        <div style="margin-bottom:14px">
          <div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">Opção especial</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${(() => { const sel = selecionados.has("Não necessário"); return `<button type="button" class="ag-esp-chip" data-nome="Não necessário" data-nenhum="1" data-sel="${sel?'1':'0'}" style="padding:5px 12px;border-radius:20px;font-size:11.5px;font-weight:600;cursor:pointer;transition:all .15s;border:2px solid;font-style:italic;${sel ? "background:var(--teal);color:#fff;border-color:var(--teal)" : "background:transparent;color:var(--tx2);border-color:var(--bd2)"}">Não necessário</button>`; })()}
          </div>
        </div>
        ${Object.entries(grupos).map(([g, items]) => `
          <div style="margin-bottom:14px">
            <div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">${escapeHtml(g)}</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${items.map(e => {
                const sel = selecionados.has(e.nome);
                return `<button type="button" class="ag-esp-chip" data-nome="${escapeHtml(e.nome)}" data-sel="${sel?'1':'0'}"
                  style="padding:5px 12px;border-radius:20px;font-size:11.5px;font-weight:600;cursor:pointer;transition:all .15s;border:2px solid;${sel ? "background:var(--teal);color:#fff;border-color:var(--teal)" : "background:transparent;color:var(--tx2);border-color:var(--bd2)"}">
                  ${escapeHtml(e.nome)}
                </button>`;
              }).join("")}
            </div>
          </div>`).join("")}
        ${lista.length === 0 ? `<div style="color:var(--tx3);font-size:12px">Nenhum espaço cadastrado.</div>` : ""}
      </div>
      <div style="padding:12px 20px;border-top:1px solid var(--bd1);display:flex;justify-content:flex-end;gap:8px">
        <button onclick="document.getElementById('ag-esp-popup').style.display='none'" style="padding:8px 16px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12.5px;cursor:pointer">Cancelar</button>
        <button onclick="agConfirmarEspacos()" style="padding:8px 18px;border-radius:7px;border:none;background:var(--teal);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">Confirmar</button>
      </div>
    </div>`;

  const _agEspStyle = (b, on) => {
    b.dataset.sel = on ? "1" : "0";
    b.style.background   = on ? "var(--teal)" : "transparent";
    b.style.color        = on ? "#fff"        : "var(--tx2)";
    b.style.borderColor  = on ? "var(--teal)" : "var(--bd2)";
  };
  pop.querySelectorAll(".ag-esp-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const on = btn.dataset.sel !== "1";
      if (btn.dataset.nenhum === "1") {
        pop.querySelectorAll(".ag-esp-chip:not([data-nenhum])").forEach(b => _agEspStyle(b, false));
        _agEspStyle(btn, on);
      } else {
        const nenhum = pop.querySelector(".ag-esp-chip[data-nenhum='1']");
        if (nenhum && on) _agEspStyle(nenhum, false);
        _agEspStyle(btn, on);
      }
    });
  });
}
window.agAbrirEspacos = agAbrirEspacos;

function agConfirmarEspacos() {
  const selecionados = [...document.querySelectorAll("#ag-esp-popup .ag-esp-chip[data-sel='1']")].map(b => b.dataset.nome);
  const txt = document.getElementById("ag-f-espaco-txt");
  const preview = document.getElementById("ag-f-espaco-preview");
  if (txt) txt.value = selecionados.join(", ");
  if (preview) {
    if (selecionados.length) {
      preview.innerHTML = selecionados.map(n => `<span style="padding:3px 9px;border-radius:4px;background:rgba(42,181,192,.12);color:var(--teal);font-size:11px;font-weight:600;border:1px solid rgba(42,181,192,.3)">${escapeHtml(n)}</span>`).join(" ");
    } else {
      preview.innerHTML = `<span style="color:var(--tx3);font-size:11.5px">Nenhum espaço selecionado</span>`;
    }
  }
  document.getElementById("ag-esp-popup").style.display = "none";
}
window.agConfirmarEspacos = agConfirmarEspacos;

/* ── WIDGET DE ESPAÇOS INLINE COM DISPONIBILIDADE ───────────── */
async function _agCarregarEspacosWidget(modal, preSelected = []) {
  const grid     = document.getElementById("ag-espaco-grid");
  const statusEl = document.getElementById("ag-espaco-status");
  if (!grid) return;
  try {
    const rows = await _agCarregarEspacos();
    grid.innerHTML = "";
    const grupos = {};
    rows.forEach(r => { if (!grupos[r.grupo]) grupos[r.grupo] = []; grupos[r.grupo].push(r); });
    Object.entries(grupos).forEach(([grupo, itens]) => {
      const hdr = document.createElement("div");
      hdr.style.cssText = "grid-column:1/-1;font-size:9.5px;font-weight:700;color:var(--acc);text-transform:uppercase;letter-spacing:.08em;padding:5px 0 3px;border-bottom:1px solid var(--bd2);margin-top:4px";
      hdr.textContent = grupo;
      grid.appendChild(hdr);
      itens.forEach(esp => {
        const sel = preSelected.includes(esp.nome);
        const lbl = document.createElement("label");
        lbl.className = "ag-espaco-chk";
        lbl.dataset.espaco = esp.nome;
        lbl.style.cssText = `display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:6px;border:1.5px solid ${sel?"var(--gr)":"var(--bd2)"};background:${sel?"rgba(52,199,89,.08)":"var(--bg-input)"};cursor:pointer;font-size:11.5px;color:var(--tx1);user-select:none;transition:border-color .12s,background .12s`;
        lbl.innerHTML = `<input type="checkbox" data-espaco="${escapeHtmlAttr(esp.nome)}" ${sel?"checked":""} style="width:14px;height:14px;accent-color:var(--gr);cursor:pointer;flex-shrink:0">
          <span style="flex:1">${escapeHtml(esp.nome)}</span>
          <span class="ag-esp-occ" style="display:none;font-size:9px;font-weight:700;color:#C07700;white-space:nowrap">EM USO</span>`;
        const inp = lbl.querySelector("input");
        inp.addEventListener("change", () => {
          if (!inp.dataset.ocupado) {
            lbl.style.borderColor = inp.checked ? "var(--gr)" : "var(--bd2)";
            lbl.style.background  = inp.checked ? "rgba(52,199,89,.08)" : "var(--bg-input)";
          }
        });
        grid.appendChild(lbl);
      });
    });
    if (!rows.length) grid.innerHTML = `<div style="grid-column:1/-1;font-size:11px;color:var(--tx3)">Nenhum espaço cadastrado.</div>`;

    // Wire date/time change → re-verificar
    const diasList = document.getElementById("ag-dias-list");
    if (diasList) {
      diasList.addEventListener("change", () => _agVerificarDisponibilidadeForm(modal));
      diasList.addEventListener("input",  () => _agVerificarDisponibilidadeForm(modal));
    }
    _agVerificarDisponibilidadeForm(modal);
  } catch (_) {
    grid.innerHTML = `<div style="grid-column:1/-1;font-size:11px;color:var(--rose)">Não foi possível carregar os espaços.</div>`;
  }
}
window._agCarregarEspacosWidget = _agCarregarEspacosWidget;

async function _agVerificarDisponibilidadeForm(modal) {
  const statusEl = document.getElementById("ag-espaco-status");
  const grid     = document.getElementById("ag-espaco-grid");
  if (!grid || !statusEl) return;
  const data = document.getElementById("ag-dia-data-0")?.value;
  const hi   = document.getElementById("ag-dia-ini-0")?.value;
  const hf   = document.getElementById("ag-dia-fim-0")?.value;
  // Reset ocupado markers
  const resetOcc = () => grid.querySelectorAll(".ag-espaco-chk").forEach(lbl => {
    const inp = lbl.querySelector("input");
    const occ = lbl.querySelector(".ag-esp-occ");
    delete inp.dataset.ocupado;
    lbl.style.borderColor = inp.checked ? "var(--gr)" : "var(--bd2)";
    lbl.style.background  = inp.checked ? "rgba(52,199,89,.08)" : "var(--bg-input)";
    if (occ) occ.style.display = "none";
    lbl.title = "";
  });
  if (!data || !hi) {
    statusEl.textContent = "Preencha data e horário para verificar disponibilidade";
    statusEl.style.color = "var(--tx3)";
    resetOcc();
    return;
  }
  statusEl.textContent = "Verificando disponibilidade...";
  statusEl.style.color = "var(--tx3)";
  try {
    // Extrair id do evento atual do botão salvar
    const saveBtn = document.querySelector("#ag-form-modal button[onclick*='agSalvarForm']");
    const m = saveBtn?.getAttribute("onclick")?.match(/agSalvarForm\('([^']*)'\)/);
    const excluirId = (m && m[1]) ? m[1] : null;
    const res = await fetch(`${apiBaseUrl()}/rest/v1/rpc/espacos_disponibilidade_admin`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_data_inicio: data, p_hora_inicio: hi, p_data_fim: data, p_hora_fim: hf || null, p_excluir_id: excluirId || null })
    });
    if (!res.ok) throw new Error();
    const dados = await res.json();
    const dispMap = {};
    dados.forEach(d => { dispMap[d.nome] = d; });
    resetOcc();
    let ocupados = 0;
    grid.querySelectorAll(".ag-espaco-chk").forEach(lbl => {
      const inp = lbl.querySelector("input");
      const occ = lbl.querySelector(".ag-esp-occ");
      const nome = lbl.dataset.espaco;
      const info = dispMap[nome];
      if (!info || info.disponivel) return;
      ocupados++;
      inp.dataset.ocupado = "true";
      lbl.style.borderColor = inp.checked ? "#C07700" : "rgba(192,119,0,.4)";
      lbl.style.background  = inp.checked ? "rgba(192,119,0,.08)" : "var(--bg-input)";
      if (occ) occ.style.display = "";
      const c = info.conflito;
      lbl.title = c ? `Em uso: "${c.titulo}"${c.hora_inicio ? " · " + String(c.hora_inicio).slice(0,5) + (c.hora_fim ? "–" + String(c.hora_fim).slice(0,5) : "") : ""}` : "Em uso neste horário";
    });
    const livres = dados.filter(d => d.disponivel).length;
    statusEl.textContent = ocupados > 0
      ? `${livres} disponível${livres !== 1 ? "is" : ""} · ${ocupados} em uso neste horário`
      : "Todos os espaços disponíveis para este horário";
    statusEl.style.color = ocupados > 0 ? "#C07700" : "var(--gr)";
  } catch (_) {
    statusEl.textContent = "Não foi possível verificar disponibilidade.";
  }
}
window._agVerificarDisponibilidadeForm = _agVerificarDisponibilidadeForm;
