/* ══════════════════════════════════════════
   UI helpers globais
══════════════════════════════════════════ */
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

function openCrudForm(tab, preset = null) {
  if (["MEMBROS","VISITANTES"].includes(tab)) {
    const nivel = (window.permissoesUsuario || {})["MEMBRESIA"] || "SEM_ACESSO";
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

  function renderField(f) {
    const val = preset && preset[f] !== undefined ? preset[f] : "";
    const req = obrig.includes(f) ? ' <span style="color:var(--rose)">*</span>' : "";
    const label = `<label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">${escapeHtml(f)}${req}</label>`;
    const tipo = tipos[f] || "";
    const isLong = /descricao|observacoes|solucao|detalhes/i.test(f);
    const inputStyle = `width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none`;

    if (tipo === "boolean") {
      const checked = val === true || val === "true" ? "checked" : "";
      return `<div style="grid-column:auto"><label style="font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" data-field="${escapeHtmlAttr(f)}" data-type="boolean" ${checked} style="width:14px;height:14px;accent-color:var(--gr)">
        ${escapeHtml(f)}</label></div>`;
    }
    if (tipo.startsWith("select:")) {
      const opts = tipo.replace("select:","").split(",").map(o => {
        const sep = o.indexOf("=");
        return sep === -1 ? { value: o, label: o } : { value: o.slice(0, sep), label: o.slice(sep + 1) };
      });
      return `<div><label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">${escapeHtml(f)}${req}</label>
        <select data-field="${escapeHtmlAttr(f)}" style="${inputStyle}">
          ${opts.map(o=>`<option value="${escapeHtmlAttr(o.value)}" ${String(val)===o.value?"selected":""}>${escapeHtml(o.label)}</option>`).join("")}
        </select></div>`;
    }
    if (tipo === "number") {
      return `<div>${label}<input type="number" step="0.01" data-field="${escapeHtmlAttr(f)}" value="${escapeHtmlAttr(String(val))}" style="${inputStyle}"></div>`;
    }
    if (tipo === "date") {
      return `<div>${label}<input type="date" data-field="${escapeHtmlAttr(f)}" value="${escapeHtmlAttr(String(val))}" style="${inputStyle}"></div>`;
    }
    if (isLong) {
      return `<div style="grid-column:1 / -1">${label}<textarea data-field="${escapeHtmlAttr(f)}" style="${inputStyle};min-height:84px;resize:vertical">${escapeHtml(String(val))}</textarea></div>`;
    }
    return `<div>${label}<input type="text" data-field="${escapeHtmlAttr(f)}" value="${escapeHtmlAttr(String(val))}" style="${inputStyle}"></div>`;
  }

  modal.innerHTML = `
    <div style="width:min(760px,92vw);max-height:88vh;overflow:hidden;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;display:flex;flex-direction:column">
      <div style="padding:14px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--tx1)">${preset ? "Editar" : "Novo"} · ${SCHEMA.labels[tab] || tab}</div>
          <div style="font-size:10px;color:var(--tx3)">${tab}</div>
        </div>
        <button onclick="document.getElementById('crud-modal').remove()" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer">✕</button>
      </div>
      <div style="padding:16px;overflow:auto">
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
          ${fields.map(f => renderField(f)).join("")}
          ${tab === "MEMBROS" && preset?.pessoa_id ? `<input type="hidden" data-field="__pessoa_id" value="${escapeHtmlAttr(String(preset.pessoa_id))}">` : ""}
        </div>
      </div>
      <div style="padding:14px 16px;border-top:1px solid var(--bd1);display:flex;justify-content:flex-end;gap:8px">
        <button onclick="document.getElementById('crud-modal').remove()" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:8px 12px;color:var(--tx2);cursor:pointer">Cancelar</button>
        <button onclick='salvarRegistro(${JSON.stringify(tab)}, ${preset ? JSON.stringify(preset.id || null) : "null"})' style="background:var(--gr);border:none;border-radius:6px;padding:8px 16px;color:#fff;font-weight:600;cursor:pointer">💾 Salvar</button>
      </div>
    </div>`;
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
  if (tab === "DEMANDAS") {
    const _sn = { "Aberta":"ABERTA","Em Análise":"EM_ANALISE","Em Andamento":"EM_ANDAMENTO","Pendente":"PENDENTE","Concluída":"CONCLUIDA","Cancelada":"CANCELADA" };
    data.status = data.status ? (_sn[data.status] || data.status) : (!recordId ? "ABERTA" : undefined);
    if (data.status === undefined) delete data.status;
    const _pv = ["Baixa","Média","Alta","Urgente"];
    data.prioridade = _pv.includes(data.prioridade) ? data.prioridade : "Média";
  }
  try {
    if (tab === "MEMBROS" && recordId) {
      const pessoaId = data.__pessoa_id;
      delete data.__pessoa_id;

      const CAMPOS_PESSOA  = ["nome","email","telefone","celular","data_nascimento"];
      const CAMPOS_MEMBRO  = ["status","tipo_ingresso","funcao","data_batismo","data_ingresso","batizado","casado_na_igreja"];

      const payloadPessoa = {};
      const payloadMembro = {};
      Object.entries(data).forEach(([k, v]) => {
        if (CAMPOS_PESSOA.includes(k))  payloadPessoa[k] = v || null;
        else if (CAMPOS_MEMBRO.includes(k)) payloadMembro[k] = v || null;
      });
      if (data.numero_registro) payloadMembro.numero_registro = data.numero_registro;

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
