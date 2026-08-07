/* ══════════════════════════════════════════
   UI helpers globais
══════════════════════════════════════════ */

/**
 * tcPT — Title Case para português brasileiro.
 * Capitaliza a primeira letra de cada palavra principal.
 * Preposições, artigos e conjunções ficam em minúsculas (exceto se forem a 1ª palavra).
 * Siglas oficiais são preservadas em MAIÚSCULAS.
 * Não deve ser aplicado a conteúdo digitado pelo usuário (nomes próprios, descrições).
 */
function tcPT(str) {
  if (!str || typeof str !== "string") return str;
  str = str.trim();
  if (!str) return str;

  const SIGLAS = new Set([
    "PIX","CPF","CNPJ","CEP","RH","TI","CNAB","PDF","URL","API","SMS",
    "SIPEN","IPCA","IGP-M","INPC","IPCA-E","EBT","PG","PGS","OS","KPI",
    "PWA","ONG","IPP","IPPenha","LDAP","JWT","UUID",
  ]);

  const MINUSC = new Set([
    "de","do","da","dos","das","em","no","na","nos","nas",
    "por","para","com","sem","sob","sobre","ante","após","até",
    "desde","entre","perante","a","ao","aos","às",
    "o","os","um","uma","e","ou","mas","nem",
  ]);

  let wordIdx = 0;
  return str.split(/(\s+)/).map(token => {
    if (/^\s+$/.test(token)) return token;
    const up = token.toUpperCase();
    wordIdx++;
    if (SIGLAS.has(up))                          return up;
    if (wordIdx > 1 && MINUSC.has(token.toLowerCase())) return token.toLowerCase();
    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
  }).join("");
}
window.tcPT = tcPT;
let tt;
function T(t, s) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.id = "toast";
    el.innerHTML = '<div id="toast-t"></div><div class="toast-s" id="toast-s"></div>';
    document.body.appendChild(el);
  }
  document.getElementById("toast-t").textContent = t;
  document.getElementById("toast-s").textContent = s || "";
  el.classList.add("on");
  clearTimeout(tt);
  tt = setTimeout(() => el.classList.remove("on"), 3500);
}

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s]));
}

/* Normaliza capitalização de nomes para exibição: "JOÃO SILVA" → "João Silva" */
function nomePropio(str) {
  if (!str) return "";
  const min = new Set(["de","da","do","das","dos","e","a","o","em","na","no","nas","nos"]);
  const fmt = str.toLowerCase().split(" ").map((w, i) =>
    (!w || (i > 0 && min.has(w))) ? w : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(" ");
  return escapeHtml(fmt);
}

function escapeHtmlAttr(v) {
  return escapeHtml(v).replace(/`/g, '&#96;');
}

function safeJsonForHtml(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/'/g, '&#39;');
}

function spinner() {
  return `<span style="display:inline-block;width:11px;height:11px;border:2px solid var(--gr);border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;vertical-align:middle;margin-right:6px"></span>`;
}

function openModal() {
  if (typeof window.abrirModalNovaDemanda === "function") {
    window.abrirModalNovaDemanda();
    return;
  }
  const modal = document.getElementById("modal");
  if (modal) modal.classList.add("on");
}

function closeModal() {
  document.getElementById("modal").classList.remove("on");
}

function submitTask() {
  const titulo = document.querySelector(".md .fi2[type=text]")?.value?.trim();
  const modulo = document.querySelectorAll(".md .fi2")[1]?.value;
  const prioridade = document.querySelectorAll(".md .fi2")[2]?.value;
  const responsavel = document.querySelectorAll(".md .fi2")[3]?.value;
  const data_conclusao = document.querySelectorAll(".md .fi2")[4]?.value;
  const observacoes = document.querySelectorAll(".md textarea")[0]?.value;
  if (!titulo) return T("Campo obrigatório", "Informe o título da demanda");
  const _taskPayload = {
    titulo, area: modulo, prioridade,
    responsavel: responsavel === "— Roteamento automático —" ? null : responsavel,
    data_conclusao: data_conclusao || null,
    descricao: observacoes || null,
    status: "ABERTA"
  };
  apiWrite("create", "DEMANDAS", _taskPayload).then(() => {
    closeModal();
    T("✅ Demanda criada!", "Registrada no Supabase");
    loadKPIs();
  }).catch(e => T("Erro ao criar", e.message));
}

const _COL_PT_UI = {
  titulo:"Título", data:"Data", mes:"Mês", dia_semana:"Dia da Semana",
  hora_inicio:"Horário de Início", hora_fim:"Horário de Fim",
  recorrencia:"Recorrência", espaco:"Espaço / Ambiente",
  organizador:"Organizador", observacao:"Observação", status:"Status",
  tipo:"Tipo", nome:"Nome", email:"E-mail", telefone:"Telefone",
  cargo:"Cargo", ministerio:"Ministério", area:"Área",
  descricao:"Descrição", valor:"Valor", quantidade:"Qtd",
  responsavel:"Responsável", solicitante:"Solicitante", solicitante_tel:"Telefone do Solicitante",
  item:"Item", unidade:"Unidade", localizacao:"Localização",
  data_batismo:"Batismo", data_membro:"Membro desde",
  data_entrada:"Entrada", data_saida:"Saída",
  categoria:"Categoria", prioridade:"Prioridade",
};
const _colLabelUI = c => _COL_PT_UI[c] || c.replace(/_/g," ").replace(/\b\w/g, l => l.toUpperCase());

async function _popularSelectCongregacoesCrud(el) {
  const val = el.dataset.valorAtual || "";
  try {
    const r = await fetch(`${apiBaseUrl()}/rest/v1/congregacoes?deleted_at=is.null&order=nome.asc`, { headers: apiHeaders() });
    const rows = r.ok ? await r.json() : [];
    el.innerHTML = `<option value="">Nenhum</option>`;
    rows.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.dataset.nome = c.nome;
      opt.textContent = c.nome;
      if (c.id === val) opt.selected = true;
      el.appendChild(opt);
    });
  } catch (_) {}
}

async function _popularSelectEspacosCrud(el) {
  const val = el.dataset.valorAtual || "";
  try {
    const r = await fetch(`${apiBaseUrl()}/rest/v1/espacos?ativo=eq.true&order=grupo.asc,ordem.asc,nome.asc`, { headers: apiHeaders() });
    const rows = r.ok ? await r.json() : [];
    const grupos = {};
    rows.forEach(e => { const g = e.grupo || "Outros"; if (!grupos[g]) grupos[g] = []; grupos[g].push(e); });
    el.innerHTML = `<option value="">— Selecione o espaço —</option>`;
    Object.entries(grupos).forEach(([g, items]) => {
      const grp = document.createElement("optgroup");
      grp.label = g;
      items.forEach(e => {
        const opt = document.createElement("option");
        opt.value = e.id;
        opt.dataset.nome = e.nome;
        opt.textContent = e.nome;
        if (e.id === val || e.nome === val) opt.selected = true;
        grp.appendChild(opt);
      });
      el.appendChild(grp);
    });
  } catch (_) {}
}

function switchCrudTab(idx) {
  document.querySelectorAll("[id^='crudtp-']").forEach((p, i) => { p.style.display = i === idx ? "" : "none"; });
  document.querySelectorAll("[id^='crudtb-']").forEach((b, i) => {
    b.style.color          = i === idx ? "var(--tx1)" : "var(--tx3)";
    b.style.fontWeight     = i === idx ? "700" : "600";
    b.style.borderBottomColor = i === idx ? "var(--gr)" : "transparent";
  });
}

function openCrudForm(tab, preset = null) {
  if (["MEMBROS","VISITANTES"].includes(tab)) {
    const nivel = (permissoesUsuario || {})["MEMBRESIA"] || "SEM_ACESSO";
    const podeEditar = USUARIO_ATUAL?.perfil === "ADMINISTRADOR_GERAL" ||
                       nivel === "COMPLETO" || nivel === "EDICAO";
    if (!podeEditar) { T("Acesso negado", "Sem permissão para editar membros."); return; }
  }
  const fields = SCHEMA.campos[tab] || inferColumns(tab, preset ? [preset] : []);
  const tipos = SCHEMA.tipos[tab] || {};
  const obrig = SCHEMA.obrigatorios[tab] || [];
  let modal = document.getElementById("crud-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "crud-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:310";
    document.body.appendChild(modal);
  }

  const _fullWidthFields = (SCHEMA.fullWidth || {})[tab] || [];
  const _fieldSpans      = (SCHEMA.fieldSpan  || {})[tab] || {};
  function renderField(f) {
    const val = preset && preset[f] != null ? preset[f] : "";
    const req = obrig.includes(f) ? ' <span style="color:var(--rose)">*</span>' : "";
    const lbl = _colLabelUI(f);
    const label = `<label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">${escapeHtml(lbl)}${req}</label>`;
    const tipo = tipos[f] || "";
    const isLong = /descricao|observacoes|solucao|detalhes|observacao/i.test(f);
    const spanFull = _fullWidthFields.includes(f) || isLong;
    const inputStyle = `width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none`;

    if (tipo === "boolean") {
      const checked = val === true || val === "true" ? "checked" : "";
      return `<div style="grid-column:auto"><label style="font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" data-field="${escapeHtmlAttr(f)}" data-type="boolean" ${checked} style="width:14px;height:14px;accent-color:var(--gr)">
        ${escapeHtml(lbl)}</label></div>`;
    }
    const spanStyle = spanFull ? "grid-column:1 / -1" : _fieldSpans[f] ? `grid-column:${_fieldSpans[f]}` : "";
    if (tipo === "congregacoes-select") {
      const valorAtual = (preset?.congregacao_id || "");
      return `<div style="${spanStyle}">${label}<select data-field="${escapeHtmlAttr(f)}" data-tipo-async="congregacoes" data-valor-atual="${escapeHtmlAttr(String(valorAtual))}" style="${inputStyle}">
        <option value="">Carregando congregações…</option>
      </select></div>`;
    }
    if (tipo === "espacos-select") {
      const valorAtual = (preset?.espaco_id || val || "");
      return `<div style="${spanStyle}">${label}<select data-field="${escapeHtmlAttr(f)}" data-tipo-async="espacos" data-valor-atual="${escapeHtmlAttr(String(valorAtual))}" style="${inputStyle}">
        <option value="">Carregando espaços…</option>
      </select></div>`;
    }
    if (tipo === "espacos-multi") {
      return `<div style="grid-column:1/-1">
        ${label}
        <div id="crud-espacos-status" style="font-size:11px;color:var(--tx3);padding:6px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input);margin-bottom:8px;line-height:1.4">
          Selecione data e horário de início para verificar disponibilidade
        </div>
        <div id="crud-espacos-aviso" style="display:none;font-size:11.5px;color:#8A4000;padding:7px 10px;background:rgba(214,148,0,.09);border:1px solid rgba(214,148,0,.35);border-radius:6px;margin-bottom:8px"></div>
        <div id="crud-espacos-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px">
          <div style="font-size:11px;color:var(--tx3)">Carregando espaços...</div>
        </div>
      </div>`;
    }
    if (tipo.startsWith("select:")) {
      const opts = tipo.replace("select:","").split(",").map(o => {
        const sep = o.indexOf("=");
        return sep === -1 ? { value: o, label: o } : { value: o.slice(0, sep), label: o.slice(sep + 1) };
      });
      const isOpcional = !obrig.includes(f);
      return `<div style="${spanStyle}"><label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">${escapeHtml(lbl)}${req}</label>
        <select data-field="${escapeHtmlAttr(f)}" style="${inputStyle}">
          ${isOpcional ? `<option value="">—</option>` : ""}
          ${opts.map(o=>`<option value="${escapeHtmlAttr(o.value)}" ${String(val)===o.value?"selected":""}>${escapeHtml(o.label)}</option>`).join("")}
        </select></div>`;
    }
    if (tipo === "number") {
      return `<div style="${spanStyle}">${label}<input type="number" step="0.01" data-field="${escapeHtmlAttr(f)}" value="${escapeHtmlAttr(String(val))}" style="${inputStyle}"></div>`;
    }
    if (tipo === "date") {
      return `<div style="${spanStyle}">${label}<input type="date" data-field="${escapeHtmlAttr(f)}" value="${escapeHtmlAttr(String(val))}" style="${inputStyle}"></div>`;
    }
    if (tipo === "time") {
      return `<div style="${spanStyle}">${label}<input type="time" data-field="${escapeHtmlAttr(f)}" value="${escapeHtmlAttr(String(val))}" style="${inputStyle}"></div>`;
    }
    if (isLong) {
      return `<div style="grid-column:1 / -1">${label}<textarea data-field="${escapeHtmlAttr(f)}" style="${inputStyle};min-height:84px;resize:vertical">${escapeHtml(String(val))}</textarea></div>`;
    }
    return `<div style="${spanStyle}">${label}<input type="text" data-field="${escapeHtmlAttr(f)}" value="${escapeHtmlAttr(String(val))}" style="${inputStyle}"></div>`;
  }

  const cols = (SCHEMA.gridCols || {})[tab] || 2;
  const tituloLabel = SCHEMA.labels[tab] ? tcPT(SCHEMA.labels[tab]) : tab;

  const _AGENDA_TABS = [
    { label: "Evento",   fields: ["titulo","tipo","data","hora_inicio","hora_fim","dia_semana","mes","recorrencia","status"] },
    { label: "Espaço",  fields: ["espaco"] },
    { label: "Detalhes", fields: ["organizador","responsavel","solicitante_tel","observacao"] }
  ];
  const _tabStyle = (active) => `padding:10px 16px;border:none;background:none;font-size:12px;font-weight:${active?"700":"600"};color:${active?"var(--tx1)":"var(--tx3)"};cursor:pointer;border-bottom:2px solid ${active?"var(--gr)":"transparent"};margin-bottom:-1px;transition:color .12s,border-color .12s`;

  const contentHTML = tab === "AGENDA" ? `
    <div style="border-bottom:1px solid var(--bd2);padding:0 20px;display:flex;gap:0;background:var(--bg-card);position:sticky;top:0;z-index:2">
      ${_AGENDA_TABS.map((t,i) => `<button id="crudtb-${i}" onclick="switchCrudTab(${i})" style="${_tabStyle(i===0)}">${t.label}</button>`).join("")}
    </div>
    ${_AGENDA_TABS.map((t,i) => `
      <div id="crudtp-${i}" style="${i>0?"display:none;":""}padding:18px 20px">
        <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px">
          ${t.fields.map(f => renderField(f)).join("")}
        </div>
      </div>`).join("")}
  ` : `
    <div style="padding:18px 20px">
      <div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:12px">
        ${fields.map(f => renderField(f)).join("")}
        ${tab === "MEMBROS" && preset?.pessoa_id ? `<input type="hidden" data-field="__pessoa_id" value="${escapeHtmlAttr(String(preset.pessoa_id))}">` : ""}
      </div>
    </div>
  `;

  modal.innerHTML = `
    <div style="width:min(760px,92vw);max-height:88vh;overflow:hidden;background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;display:flex;flex-direction:column">
      <div style="padding:16px 20px 14px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px">${preset ? "Editar" : "Novo registro"}</div>
          <div style="font-size:16px;font-weight:700;color:var(--tx1);line-height:1.2">${escapeHtml(tituloLabel)}</div>
        </div>
        <button onclick="document.getElementById('crud-modal').remove()" style="background:var(--bg-surface);border:1px solid var(--bd2);border-radius:7px;color:var(--tx3);font-size:14px;cursor:pointer;width:30px;height:30px;display:flex;align-items:center;justify-content:center">✕</button>
      </div>
      <div style="overflow:auto;flex:1">${contentHTML}</div>
      <div style="padding:14px 20px;border-top:1px solid var(--bd1);display:flex;justify-content:flex-end;gap:8px;background:var(--bg-page);border-radius:0 0 12px 12px">
        <button onclick="document.getElementById('crud-modal').remove()" style="background:none;border:1px solid var(--bd2);border-radius:7px;padding:8px 16px;color:var(--tx2);font-size:12.5px;cursor:pointer">Cancelar</button>
        <button onclick='salvarRegistro(${JSON.stringify(tab)}, ${preset ? JSON.stringify(preset.id || null) : "null"})' style="background:var(--gr);border:none;border-radius:7px;padding:8px 20px;color:#fff;font-weight:700;font-size:12.5px;cursor:pointer">Salvar</button>
      </div>
    </div>`;

  // População assíncrona de selects de espaços e congregações
  modal.querySelectorAll('[data-tipo-async="espacos"]').forEach(el => _popularSelectEspacosCrud(el));
  modal.querySelectorAll('[data-tipo-async="congregacoes"]').forEach(el => _popularSelectCongregacoesCrud(el));
  if (tab === "AGENDA") _initEspacosMultiCrud(modal, preset);
}

async function _initEspacosMultiCrud(modal, preset) {
  const grid = modal.querySelector("#crud-espacos-grid");
  if (!grid) return;
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/espacos?ativo=eq.true&order=ordem.asc`, { headers: apiHeaders() });
    if (!res.ok) throw new Error();
    const rows = await res.json();
    const preSelected = preset?.espaco ? preset.espaco.split(",").map(s => s.trim()) : [];
    grid.innerHTML = "";
    const _PRIO = ["templo","pátio","patio","cozinha","estacionamento","apoio mission","b01","b02"];
    const _isPrio = n => _PRIO.some(p => n.toLowerCase().includes(p));
    const _natSort = (a, b) => a.nome.localeCompare(b.nome, "pt", { numeric: true, sensitivity: "base" });
    const _mkChk = (esp, sel, destaque) => {
      const lbl = document.createElement("label");
      lbl.className = "crud-espaco-chk";
      lbl.dataset.espaco = esp.nome;
      const borIdle = destaque ? "rgba(42,181,192,.4)" : "var(--bd2)";
      const bgIdle  = destaque ? "rgba(42,181,192,.05)" : "var(--bg-input)";
      lbl.style.cssText = `display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:6px;border:1.5px solid ${sel?"var(--gr)":borIdle};background:${sel?"rgba(52,199,89,.08)":bgIdle};cursor:pointer;font-size:11.5px;color:var(--tx1);user-select:none;transition:border-color .12s,background .12s`;
      lbl.innerHTML = `<input type="checkbox" data-espaco="${escapeHtmlAttr(esp.nome)}" ${sel?"checked":""} style="width:14px;height:14px;accent-color:var(--gr);cursor:pointer;flex-shrink:0"><span style="flex:1;font-weight:${destaque?"600":"400"}">${escapeHtml(esp.nome)}</span><span class="crud-espaco-lock" style="display:none;margin-left:auto;font-size:10px;color:var(--tx3)">🔒</span>`;
      lbl.querySelector("input").addEventListener("change", e => {
        lbl.style.borderColor = e.target.checked ? "var(--gr)" : (destaque ? borIdle : "var(--bd2)");
        lbl.style.background  = e.target.checked ? "rgba(52,199,89,.08)" : (destaque ? bgIdle : "var(--bg-input)");
      });
      return lbl;
    };
    const principais = rows.filter(r => _isPrio(r.nome)).sort(_natSort);
    const resto      = rows.filter(r => !_isPrio(r.nome));
    if (principais.length) {
      const hdr = document.createElement("div");
      hdr.style.cssText = "grid-column:1/-1;font-size:9.5px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.08em;padding:6px 0 3px;border-bottom:1px solid rgba(42,181,192,.3);margin-top:6px";
      hdr.textContent = "Principais";
      grid.appendChild(hdr);
      principais.forEach(esp => grid.appendChild(_mkChk(esp, preSelected.includes(esp.nome), true)));
    }
    const grupos = {};
    resto.forEach(r => { if (!grupos[r.grupo]) grupos[r.grupo] = []; grupos[r.grupo].push(r); });
    Object.entries(grupos).sort(([a],[b]) => a.localeCompare(b,"pt")).forEach(([grupo, itens]) => {
      const hdr = document.createElement("div");
      hdr.style.cssText = "grid-column:1/-1;font-size:9.5px;font-weight:700;color:var(--acc);text-transform:uppercase;letter-spacing:.08em;padding:6px 0 3px;border-bottom:1px solid var(--bd2);margin-top:6px";
      hdr.textContent = grupo;
      grid.appendChild(hdr);
      itens.sort(_natSort).forEach(esp => grid.appendChild(_mkChk(esp, preSelected.includes(esp.nome), false)));
    });
    if (!rows.length) grid.innerHTML = `<div style="font-size:11px;color:var(--tx3)">Nenhum espaço cadastrado.</div>`;
    ["data","hora_inicio","hora_fim"].forEach(f => {
      const el = modal.querySelector(`[data-field="${f}"]`);
      if (el) el.addEventListener("change", () => _verificarDisponibilidadeAdmin(modal));
    });
    _verificarDisponibilidadeAdmin(modal);
  } catch (_) {
    grid.innerHTML = `<div style="grid-column:1/-1;font-size:11px;color:var(--rose)">Não foi possível carregar os espaços.</div>`;
  }
}

async function _verificarDisponibilidadeAdmin(modal) {
  const statusEl = modal.querySelector("#crud-espacos-status");
  const avisoEl  = modal.querySelector("#crud-espacos-aviso");
  const grid     = modal.querySelector("#crud-espacos-grid");
  if (!grid || !statusEl) return;
  const data = modal.querySelector("[data-field='data']")?.value;
  const hi   = modal.querySelector("[data-field='hora_inicio']")?.value;
  const hf   = modal.querySelector("[data-field='hora_fim']")?.value;
  if (!data || !hi) {
    statusEl.textContent = "Selecione data e horário de início para verificar disponibilidade";
    statusEl.style.color = "var(--tx3)";
    grid.querySelectorAll(".crud-espaco-chk").forEach(lbl => {
      lbl.querySelector("input").disabled = false;
      lbl.style.opacity = "";
      lbl.style.pointerEvents = "";
      lbl.querySelector(".crud-espaco-lock").style.display = "none";
    });
    return;
  }
  statusEl.textContent = "Verificando disponibilidade...";
  statusEl.style.color = "var(--tx3)";
  try {
    const saveBtn = modal.querySelector("button[onclick*='salvarRegistro']");
    const m = saveBtn?.getAttribute("onclick")?.match(/salvarRegistro\([^,]+,\s*("(?:[^"\\]|\\.)*"|null)/);
    const excluirId = (m && m[1] !== "null") ? JSON.parse(m[1]) : null;
    const res = await fetch(`${apiBaseUrl()}/rest/v1/rpc/espacos_disponibilidade_admin`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_data_inicio: data, p_hora_inicio: hi, p_data_fim: data, p_hora_fim: hf || null, p_excluir_id: excluirId })
    });
    if (!res.ok) throw new Error();
    const dados = await res.json();
    const dispMap = {};
    dados.forEach(d => { dispMap[d.nome] = { disponivel: d.disponivel, conflito: d.conflito }; });
    const removidos = [];
    grid.querySelectorAll(".crud-espaco-chk").forEach(lbl => {
      const inp  = lbl.querySelector("input");
      const lock = lbl.querySelector(".crud-espaco-lock");
      const nome = lbl.dataset.espaco;
      if (!(nome in dispMap)) return;
      if (!dispMap[nome].disponivel) {
        if (inp.checked) { inp.checked = false; removidos.push(nome); lbl.style.borderColor = "var(--bd2)"; lbl.style.background = "var(--bg-input)"; }
        inp.disabled = true;
        lbl.style.opacity = ".45";
        lbl.style.pointerEvents = "none";
        lock.style.display = "";
        const c = dispMap[nome].conflito;
        lbl.title = c ? `Em uso: "${c.titulo}"${c.hora_inicio ? " · " + c.hora_inicio + (c.hora_fim ? "–" + c.hora_fim : "") : ""}` : "Indisponível neste horário";
      } else {
        inp.disabled = false;
        lbl.style.opacity = "";
        lbl.style.pointerEvents = "";
        lock.style.display = "none";
        lbl.title = "";
      }
    });
    const livres  = dados.filter(d => d.disponivel).length;
    const ocupados = dados.filter(d => !d.disponivel).length;
    statusEl.textContent = ocupados > 0
      ? `${livres} disponível${livres !== 1 ? "is" : ""} · ${ocupados} em uso neste horário`
      : "Todos os espaços disponíveis para este horário";
    statusEl.style.color = ocupados > 0 ? "#C07700" : "var(--gr)";
    if (removidos.length && avisoEl) {
      avisoEl.textContent = `${removidos.join(", ")} ${removidos.length > 1 ? "estão" : "está"} em uso e ${removidos.length > 1 ? "foram desmarcados" : "foi desmarcado"} automaticamente.`;
      avisoEl.style.display = "";
      setTimeout(() => { avisoEl.style.display = "none"; }, 6000);
    }
  } catch (_) {
    statusEl.textContent = "Não foi possível verificar disponibilidade.";
  }
}

async function salvarRegistro(tab, recordId = null) {
  if (!SUPABASE_URL) return T("Configure a API", "Cole a URL do Supabase primeiro");
  const modal = document.getElementById("crud-modal");
  if (!modal) return;
  const data = {};
  modal.querySelectorAll("[data-field]").forEach(el => {
    const field = el.getAttribute("data-field");
    const tipo = el.getAttribute("data-type");
    if (tipo === "boolean") {
      data[field] = el.checked;
    } else if (el.type === "number") {
      data[field] = el.value !== "" ? Number(el.value) : null;
    } else if (el.type === "time" || el.type === "date") {
      data[field] = el.value || null;
    } else {
      data[field] = el.value;
    }
  });
  const obrig = SCHEMA.obrigatorios[tab] || [];
  for (const f of obrig) {
    if (!data[f] || String(data[f]).trim() === "") {
      return T("Campo obrigatório", `Preencha o campo: ${f}`);
    }
  }
  // Coleta espaços do widget multi-checkbox (substitui o select antigo)
  if (tab === "AGENDA") {
    const espacoGrid = modal.querySelector("#crud-espacos-grid");
    if (espacoGrid) {
      const nomes = [...espacoGrid.querySelectorAll("input[type=checkbox][data-espaco]:checked")]
        .map(c => c.dataset.espaco);
      data.espaco    = nomes.length ? nomes.join(", ") : null;
      data.espaco_id = null;
    }
  }
  if (tab === "DEMANDAS") {
    const _sn = { "Aberta":"PENDENTE","Em Análise":"EM_ANALISE","Em Andamento":"EM_ANDAMENTO","Pendente":"PENDENTE","Concluída":"CONCLUIDA","Cancelada":"CANCELADA" };
    data.status = data.status ? (_sn[data.status] || data.status) : (!recordId ? "PENDENTE" : undefined);
    if (data.status === undefined) delete data.status;
    const _pv = ["Baixa","Média","Alta","Urgente"];
    data.prioridade = _pv.includes(data.prioridade) ? data.prioridade : "Média";
  }

  try {
    if (tab === "MEMBROS" && recordId) {
      const pessoaId = data.__pessoa_id;
      delete data.__pessoa_id;

      const CAMPOS_PESSOA  = ["nome","email","telefone","celular","data_nascimento"];
      const CAMPOS_MEMBRO  = ["status","tipo_ingresso","funcao","data_batismo","data_ingresso","batizado","casado_na_igreja","tipo_membro"];
      // congregacao field stores the UUID from the congregacoes-select
      if (data.congregacao !== undefined) {
        data.congregacao_id = data.congregacao || null;
        delete data.congregacao;
      }

      const payloadPessoa = {};
      const payloadMembro = {};
      Object.entries(data).forEach(([k, v]) => {
        if (CAMPOS_PESSOA.includes(k))  payloadPessoa[k] = v || null;
        else if (CAMPOS_MEMBRO.includes(k)) payloadMembro[k] = v || null;
      });
      if (data.numero_registro) payloadMembro.numero_registro = data.numero_registro;
      if (data.congregacao_id !== undefined) payloadMembro.congregacao_id = data.congregacao_id;

      if (pessoaId && Object.keys(payloadPessoa).length) {
        const rP = await fetch(`${apiBaseUrl()}/rest/v1/pessoas?id=eq.${encodeURIComponent(pessoaId)}`, {
          method: "PATCH", headers: apiHeaders({ "Prefer": "return=minimal" }),
          body: JSON.stringify(payloadPessoa)
        });
        if (!rP.ok) throw new Error("Erro ao atualizar pessoa: " + await rP.text());
      }

      if (Object.keys(payloadMembro).length) {
        const rM = await fetch(`${apiBaseUrl()}/rest/v1/membros?id=eq.${encodeURIComponent(recordId)}`, {
          method: "PATCH", headers: apiHeaders({ "Prefer": "return=minimal" }),
          body: JSON.stringify(payloadMembro)
        });
        if (!rM.ok) throw new Error("Erro ao atualizar membro: " + await rM.text());
      }
    } else {
      await apiWrite(recordId ? "update" : "create", tab, recordId ? { ...data, _row: recordId } : data);
    }

    T("✅ Registro salvo!", recordId ? "Alteração gravada no Supabase" : "Novo registro criado no Supabase");
    modal.remove();
    if (["MEMBROS","VISITANTES"].includes(tab)) {
      _invalidarCacheMembresia();
      if (typeof listarMembros === "function") {
        if (document.getElementById("memb-cad-list"))   listarMembros("memb-cad-list",   "memb-cad-count");
        if (document.getElementById("sec-list"))         listarMembros("sec-list",         null);
      }
    }
    if (tab === "AGENDA" && typeof window.carregarAgendaDash === "function") await window.carregarAgendaDash();
    if (currentListTab === tab) await listarAba(tab);
    await loadKPIs();
  } catch (e) {
    T("Erro ao salvar", e.message);
  }
}

async function deletarRegistro(tab, recordId) {
  if (!recordId) return T("ID inválido", "Não foi possível identificar o registro");
  if (["MEMBROS","VISITANTES"].includes(tab) && USUARIO_ATUAL?.perfil !== "ADMINISTRADOR_GERAL") {
    T("Acesso negado", "Apenas o Administrador Geral pode excluir membros.");
    return;
  }
  if (!confirm(`Excluir este registro de ${SCHEMA.labels[tab] || tab}?`)) return;
  try {
    await apiWrite("delete", tab, { _row: recordId });
    T("🗑 Registro excluído", `${SCHEMA.labels[tab] || tab} removido`);
    if (["MEMBROS","VISITANTES"].includes(tab)) {
      _invalidarCacheMembresia();
      if (typeof listarMembros === "function") {
        if (document.getElementById("memb-cad-list")) listarMembros("memb-cad-list", "memb-cad-count");
        if (document.getElementById("sec-list"))      listarMembros("sec-list",       null);
      }
    }
    if (currentListTab === tab) await listarAba(tab);
    await loadKPIs();
  } catch (e) {
    T("Erro ao excluir", e.message);
  }
}

/* ── Menu do usuário (avatar dropdown) ── */
function usrMenuToggle() {
  const dd = document.getElementById("usr-dd");
  if (!dd) return;
  const open = dd.style.display !== "none";
  dd.style.display = open ? "none" : "block";
  if (!open) {
    setTimeout(() => {
      document.addEventListener("click", _usrMenuOutsideClick, { once: true });
    }, 0);
  }
}

function usrMenuClose() {
  const dd = document.getElementById("usr-dd");
  if (dd) dd.style.display = "none";
}

function _usrMenuOutsideClick(e) {
  const wrap = document.getElementById("usr-menu-wrap");
  if (wrap && !wrap.contains(e.target)) usrMenuClose();
}

/* ── Busca Global ─────────────────────────────────────── */

const _SRCH_PAGINAS = [
  { ic:"📊", nm:"Dashboard Geral",          sub:"Visão executiva da IPPenha",               rota:"geral",           cor:"rgba(90,96,104,.15)" },
  { ic:"👤", nm:"Membresia",                sub:"Cadastro e ficha de membros",               rota:"memb-dash",       cor:"rgba(107,174,214,.15)" },
  { ic:"💰", nm:"Financeiro",               sub:"Contas, solicitações e reembolsos",         rota:"fin-dash",        cor:"rgba(58,170,92,.15)" },
  { ic:"💰", nm:"Contas a Pagar",           sub:"Demandas financeiras a pagar",              rota:"fin-pagar",       cor:"rgba(58,170,92,.15)" },
  { ic:"📅", nm:"Agenda",                   sub:"Agendamento de espaços e programações",     rota:"agenda-dash",     cor:"rgba(20,184,166,.15)" },
  { ic:"📋", nm:"Demandas",                 sub:"Central de solicitações internas",          rota:"dem-dash",        cor:"rgba(224,85,85,.15)" },
  { ic:"✝",  nm:"Pastoral",                sub:"Escala de pregação e atendimentos",         rota:"pastoral-dash",   cor:"rgba(20,184,166,.15)" },
  { ic:"🏠", nm:"Pequenos Grupos",          sub:"PGs, encontros e participantes",            rota:"pgs-dash",        cor:"rgba(107,174,214,.15)" },
  { ic:"📣", nm:"Comunicação",             sub:"WhatsApp e notificações",                   rota:"com-dash",        cor:"rgba(139,111,212,.15)" },
  { ic:"📣", nm:"WhatsApp",                sub:"Envios e destinatários",                    rota:"wa-dash",         cor:"rgba(139,111,212,.15)" },
  { ic:"🔧", nm:"Infraestrutura",           sub:"Ordens de serviço e manutenção",            rota:"infra-dash",      cor:"rgba(224,138,42,.15)" },
  { ic:"⚖",  nm:"Conselho e Governança",   sub:"Atas, nomeados e deliberações",             rota:"conselho-dash",   cor:"rgba(74,156,245,.15)" },
  { ic:"🤝", nm:"Junta Diaconal",           sub:"Escalas e famílias assistidas",             rota:"diac-dash",       cor:"rgba(180,120,60,.15)" },
  { ic:"⚙",  nm:"Configurações",           sub:"Permissões e parâmetros do sistema",        rota:"config-dash",     cor:"rgba(139,111,212,.15)" },
  { ic:"📅", nm:"Cultos",                   sub:"Programação e escala de cultos",            rota:"cultos-dash",     cor:"rgba(20,184,166,.15)" },
  { ic:"📖", nm:"Tutorial",                sub:"Guia de uso do SIPEN",                      rota:"tutorial",        cor:"rgba(20,184,166,.15)" },
];

let _srchTimer = null;
let _srchIdx   = -1;

function buscaGlobalInput(q) {
  clearTimeout(_srchTimer);
  if (!q || q.trim().length < 2) { _srchFechar(); return; }
  _srchTimer = setTimeout(() => _srchExecutar(q.trim()), 280);
}

function buscaGlobalKey(e) {
  const dd = document.getElementById("srch-dd");
  const items = dd ? [...dd.querySelectorAll(".srch-item")] : [];
  if (e.key === "Escape") { _srchFechar(); document.getElementById("tb-search-input")?.blur(); return; }
  if (e.key === "ArrowDown") { e.preventDefault(); _srchIdx = Math.min(_srchIdx + 1, items.length - 1); _srchFocar(items); return; }
  if (e.key === "ArrowUp")   { e.preventDefault(); _srchIdx = Math.max(_srchIdx - 1, 0);                _srchFocar(items); return; }
  if (e.key === "Enter" && _srchIdx >= 0 && items[_srchIdx]) { items[_srchIdx].click(); return; }
}

function _srchFocar(items) {
  items.forEach((el, i) => el.classList.toggle("on", i === _srchIdx));
  items[_srchIdx]?.scrollIntoView({ block:"nearest" });
}

function _srchFechar() {
  const dd = document.getElementById("srch-dd");
  if (dd) dd.style.display = "none";
  _srchIdx = -1;
}

async function _srchExecutar(q) {
  const dd = document.getElementById("srch-dd");
  if (!dd) return;
  _srchIdx = -1;

  const ql = q.toLowerCase();

  // 1. Páginas (estático, instantâneo)
  const pags = _SRCH_PAGINAS.filter(p =>
    p.nm.toLowerCase().includes(ql) || p.sub.toLowerCase().includes(ql)
  ).slice(0, 4);

  // Mostra resultado parcial imediato enquanto carrega
  dd.style.display = "block";
  dd.innerHTML = _srchRender(pags, [], [], q, true);

  // 2. Membros + Demandas em paralelo
  const [membros, demandas] = await Promise.all([
    _srchMembros(q),
    _srchDemandas(q),
  ]);

  dd.innerHTML = _srchRender(pags, membros, demandas, q, false);
}

async function _srchMembros(q) {
  try {
    const sb = typeof getSupabase === "function" ? getSupabase() : null;
    if (!sb) return [];
    const { data } = await sb.from("v_membros").select("id,nome,status,congregacao")
      .ilike("nome", `%${q}%`).limit(4);
    return data || [];
  } catch(_) { return []; }
}

async function _srchDemandas(q) {
  try {
    const sb = typeof getSupabase === "function" ? getSupabase() : null;
    if (!sb) return [];
    const { data } = await sb.from("v_demandas").select("id,titulo,numero_chamado,area,status")
      .or(`titulo.ilike.%${q}%,numero_chamado.ilike.%${q}%,solicitante.ilike.%${q}%`)
      .limit(4);
    return data || [];
  } catch(_) { return []; }
}

function _srchRender(pags, membros, demandas, q, carregando) {
  const STATUS_COR = { Ativo:"var(--gr)", Inativo:"var(--tx3)", Transferido:"var(--blue)" };
  let html = "";

  if (pags.length) {
    html += `<div class="srch-grp-lbl">Módulos e Páginas</div>`;
    html += pags.map(p => `
      <div class="srch-item" onclick="document.getElementById('tb-search-input').value='';_srchFechar();go('${p.rota}')">
        <div class="srch-item-ic" style="background:${p.cor}">${p.ic}</div>
        <div class="srch-item-body">
          <div class="srch-item-nm">${_srchHL(p.nm, q)}</div>
          <div class="srch-item-sub">${p.sub}</div>
        </div>
      </div>`).join("");
  }

  if (membros.length) {
    if (pags.length) html += `<div class="srch-sep"></div>`;
    html += `<div class="srch-grp-lbl">Membros</div>`;
    html += membros.map(m => `
      <div class="srch-item" onclick="document.getElementById('tb-search-input').value='';_srchFechar();go('memb-dash')">
        <div class="srch-item-ic" style="background:rgba(107,174,214,.15)">👤</div>
        <div class="srch-item-body">
          <div class="srch-item-nm">${_srchHL(m.nome||"—", q)}</div>
          <div class="srch-item-sub">${m.congregacao||""}</div>
        </div>
        <span class="srch-item-tag" style="background:rgba(90,96,104,.1);color:${STATUS_COR[m.status]||"var(--tx3)"}">${m.status||""}</span>
      </div>`).join("");
  }

  if (demandas.length) {
    if (pags.length || membros.length) html += `<div class="srch-sep"></div>`;
    html += `<div class="srch-grp-lbl">Demandas</div>`;
    html += demandas.map(d => `
      <div class="srch-item" onclick="document.getElementById('tb-search-input').value='';_srchFechar();window.demAbrirDetalhe&&demAbrirDetalhe('${d.id}','srch')">
        <div class="srch-item-ic" style="background:rgba(224,85,85,.12)">📋</div>
        <div class="srch-item-body">
          <div class="srch-item-nm">${_srchHL(d.titulo||"—", q)}</div>
          <div class="srch-item-sub">${d.numero_chamado||""} · ${d.area||""}</div>
        </div>
        <span class="srch-item-tag" style="background:rgba(90,96,104,.1);color:var(--tx3)">${d.status||""}</span>
      </div>`).join("");
  }

  if (carregando && !pags.length) {
    html = `<div class="srch-empty">Buscando…</div>`;
  } else if (!carregando && !pags.length && !membros.length && !demandas.length) {
    html = `<div class="srch-empty">Nenhum resultado para "<strong>${q}</strong>"</div>`;
  }

  return html;
}

function _srchHL(txt, q) {
  if (!q) return escapeHtml(txt);
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return escapeHtml(txt).replace(re, '<mark style="background:rgba(20,184,166,.25);color:inherit;border-radius:2px">$1</mark>');
}

// Fecha ao clicar fora
document.addEventListener("click", e => {
  const wrap = document.getElementById("tb-search-wrap");
  if (wrap && !wrap.contains(e.target)) _srchFechar();
});

const styleEl = document.createElement("style");
styleEl.textContent = "@keyframes spin{to{transform:rotate(360deg)}}";
document.head.appendChild(styleEl);
