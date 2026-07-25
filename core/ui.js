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
    const spanStyle = spanFull ? "grid-column:1 / -1" : "";
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
    if (tipo.startsWith("select:")) {
      const opts = tipo.replace("select:","").split(",").map(o => {
        const sep = o.indexOf("=");
        return sep === -1 ? { value: o, label: o } : { value: o.slice(0, sep), label: o.slice(sep + 1) };
      });
      return `<div style="${spanStyle}"><label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">${escapeHtml(lbl)}${req}</label>
        <select data-field="${escapeHtmlAttr(f)}" style="${inputStyle}">
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
  modal.innerHTML = `
    <div style="width:min(760px,92vw);max-height:88vh;overflow:hidden;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;display:flex;flex-direction:column">
      <div style="padding:14px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--tx1)">${preset ? "Editar" : "Novo"} · ${escapeHtml(tituloLabel)}</div>
        </div>
        <button onclick="document.getElementById('crud-modal').remove()" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer">✕</button>
      </div>
      <div style="padding:16px;overflow:auto">
        <div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:10px">
          ${fields.map(f => renderField(f)).join("")}
          ${tab === "MEMBROS" && preset?.pessoa_id ? `<input type="hidden" data-field="__pessoa_id" value="${escapeHtmlAttr(String(preset.pessoa_id))}">` : ""}
        </div>
      </div>
      <div style="padding:14px 16px;border-top:1px solid var(--bd1);display:flex;justify-content:flex-end;gap:8px">
        <button onclick="document.getElementById('crud-modal').remove()" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:8px 12px;color:var(--tx2);cursor:pointer">Cancelar</button>
        <button onclick='salvarRegistro(${JSON.stringify(tab)}, ${preset ? JSON.stringify(preset.id || null) : "null"})' style="background:var(--gr);border:none;border-radius:6px;padding:8px 16px;color:#fff;font-weight:600;cursor:pointer">💾 Salvar</button>
      </div>
    </div>`;

  // População assíncrona de selects de espaços e congregações
  modal.querySelectorAll('[data-tipo-async="espacos"]').forEach(el => _popularSelectEspacosCrud(el));
  modal.querySelectorAll('[data-tipo-async="congregacoes"]').forEach(el => _popularSelectCongregacoesCrud(el));
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
  // Dual-write para AGENDA: espaco (UUID do select) → espaco_id + espaco (nome legível)
  if (tab === "AGENDA" && data.espaco) {
    const espEl = modal.querySelector("[data-field='espaco'][data-tipo-async='espacos']");
    const espNome = espEl?.selectedOptions?.[0]?.dataset?.nome;
    if (espNome) {
      data.espaco_id = data.espaco; // UUID vem do value do select
      data.espaco    = espNome;     // nome legível vem do data-nome
    }
  }
  if (tab === "DEMANDAS") {
    const _sn = { "Aberta":"ABERTA","Em Análise":"EM_ANALISE","Em Andamento":"EM_ANDAMENTO","Pendente":"PENDENTE","Concluída":"CONCLUIDA","Cancelada":"CANCELADA" };
    data.status = data.status ? (_sn[data.status] || data.status) : (!recordId ? "ABERTA" : undefined);
    if (data.status === undefined) delete data.status;
    const _pv = ["Baixa","Média","Alta","Urgente"];
    data.prioridade = _pv.includes(data.prioridade) ? data.prioridade : "Média";
  }

  // Verificação de conflito de espaço antes de salvar evento de agenda
  if (tab === "AGENDA" && data.espaco && data.data && data.hora_inicio
      && !["cancelado","recusado","arquivado"].includes(data.status)) {
    try {
      const resDisp = await fetch(`${apiBaseUrl()}/rest/v1/rpc/espacos_disponibilidade_admin`, {
        method: "POST",
        headers: { ...apiHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          p_data_inicio: data.data,
          p_hora_inicio: data.hora_inicio,
          p_data_fim:    data.data_encerramento || data.data,
          p_hora_fim:    data.hora_fim || "23:59",
          p_excluir_id:  recordId || null
        })
      });
      if (resDisp.ok) {
        const listaDisp = await resDisp.json();
        const conflito = Array.isArray(listaDisp)
          ? listaDisp.find(d => !d.disponivel && d.nome === data.espaco)
          : null;
        if (conflito) {
          const c = conflito.conflito;
          const detalhe = c
            ? `\n"${c.titulo}"${c.hora_inicio ? " · " + c.hora_inicio + (c.hora_fim ? "–" + c.hora_fim : "") : ""}${c.organizador ? " · " + c.organizador : ""}`
            : "";
          const prosseguir = confirm(
            `Conflito de espaço: ${data.espaco} já está reservado neste horário.${detalhe}\n\nSalvar mesmo assim?`
          );
          if (!prosseguir) return;
        }
      }
    } catch (_) { /* não bloqueia se a verificação falhar */ }
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
    if (["MEMBROS","VISITANTES"].includes(tab)) _invalidarCacheMembresia();
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
    if (["MEMBROS","VISITANTES"].includes(tab)) _invalidarCacheMembresia();
    if (currentListTab === tab) await listarAba(tab);
    await loadKPIs();
  } catch (e) {
    T("Erro ao excluir", e.message);
  }
}

const styleEl = document.createElement("style");
styleEl.textContent = "@keyframes spin{to{transform:rotate(360deg)}}";
document.head.appendChild(styleEl);
