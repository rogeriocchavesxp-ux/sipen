/* ═══════════════════════════════════════════════════════════════════
   SIPEN — Participantes Externos
   Cadastro de pessoas que utilizam recursos da igreja sem serem membros.
═══════════════════════════════════════════════════════════════════ */
(function () {
  let _lista  = [];
  let _filtroTipo  = "";
  let _filtroBusca = "";

  const TIPOS = {
    homeschool:       { label: "Homeschool",        cls: "pn" },
    acesso_controlado:{ label: "Acesso Controlado",  cls: "po" },
    responsavel:      { label: "Responsável",        cls: "pt" },
    convidado:        { label: "Convidado",          cls: "pd" },
    operacional:      { label: "Operacional",        cls: "pv" },
    outro:            { label: "Outro",              cls: "pz" },
  };

  function _eh(v)  { return typeof escapeHtml     === "function" ? escapeHtml(v)     : String(v ?? "").replace(/[&<>"']/g, s => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[s])); }
  function _api()  { return typeof apiBaseUrl      === "function" ? apiBaseUrl()      : ""; }
  function _hdrs(x){ return typeof apiHeaders      === "function" ? apiHeaders(x||{}) : {}; }
  function _toast(t,s){ if (typeof T==="function") T(t,s||""); }

  function _pode() {
    if (typeof USUARIO_ATUAL === "undefined") return false;
    const p = USUARIO_ATUAL?.perfil || "";
    return ["ADMINISTRADOR_GERAL","ADM_OPERACIONAL","SECRETARIA"].includes(p);
  }

  function _badgeTipo(t) {
    const cfg = TIPOS[t] || { label: t || "—", cls: "pz" };
    return `<span class="pill ${cfg.cls}">${_eh(cfg.label)}</span>`;
  }

  function _fmtData(d) {
    if (!d) return "—";
    const [y,m,day] = String(d).slice(0,10).split("-");
    return day && m && y ? `${day}/${m}/${y}` : _eh(d);
  }

  async function _fetch(path, opts) {
    const res = await fetch(_api() + path, opts || { headers: _hdrs() });
    if (!res.ok) {
      const txt = await res.text().catch(()=>"");
      let msg = txt;
      try { msg = JSON.parse(txt).message || txt; } catch(_){}
      throw new Error(msg || `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    const t = await res.text();
    return t ? JSON.parse(t) : null;
  }

  async function _carregar() {
    _lista = await _fetch("/rest/v1/v_participantes_externos?order=nome.asc&limit=500") || [];
  }

  function _filtrados() {
    return _lista.filter(r => {
      if (_filtroTipo && r.tipo !== _filtroTipo) return false;
      if (_filtroBusca) {
        const q = _filtroBusca.toLowerCase();
        if (!(r.nome||"").toLowerCase().includes(q) &&
            !(r.email||"").toLowerCase().includes(q) &&
            !(r.descricao||"").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  /* ── LISTA ─────────────────────────────────────────────────────── */

  window.pextCarregar = async function () {
    const wrap = document.getElementById("pext-lista-content");
    if (!wrap) return;
    wrap.innerHTML = `<div class="msg"><span class="spin"></span> Carregando...</div>`;
    try {
      await _carregar();
      _renderLista();
    } catch (e) {
      wrap.innerHTML = `<div class="msg err">Erro ao carregar: ${_eh(e.message)}</div>`;
    }
  };

  function _renderLista() {
    const wrap = document.getElementById("pext-lista-content");
    if (!wrap) return;
    const rows = _filtrados();
    const totalAtivos = _lista.filter(r => r.ativo).length;

    wrap.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--tx1)">Participantes Externos</div>
          <div style="font-size:11px;color:var(--tx3);margin-top:2px">${totalAtivos} cadastro${totalAtivos!==1?"s":""} ativo${totalAtivos!==1?"s":""}</div>
        </div>
        ${_pode() ? `<button class="btn-pri" onclick="pextAbrirForm(null)">+ Novo Cadastro</button>` : ""}
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <input id="pext-busca" type="text" placeholder="Buscar por nome, e-mail ou descrição…"
          style="flex:1;min-width:200px;background:var(--bg2);border:1px solid var(--bd);border-radius:6px;color:var(--tx1);font-size:12px;padding:7px 10px;outline:none"
          value="${_eh(_filtroBusca)}" oninput="pextFiltrar()">
        <select id="pext-ftipo" onchange="pextFiltrar()"
          style="background:var(--bg2);border:1px solid var(--bd);border-radius:6px;color:var(--tx1);font-size:12px;padding:7px 10px;cursor:pointer">
          <option value="">Todos os tipos</option>
          ${Object.entries(TIPOS).map(([v,c])=>`<option value="${v}"${_filtroTipo===v?" selected":""}>${_eh(c.label)}</option>`).join("")}
        </select>
      </div>

      ${rows.length === 0
        ? `<div class="msg">Nenhum participante encontrado.</div>`
        : `<div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead>
                <tr>${["Nome","E-mail","Telefone","Tipo","Descrição","Status",""].map(h=>
                  `<th style="text-align:left;padding:8px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;border-bottom:1px solid var(--bd);white-space:nowrap">${h}</th>`
                ).join("")}</tr>
              </thead>
              <tbody>
                ${rows.map(r => `
                  <tr style="border-bottom:1px solid var(--bg3)">
                    <td style="padding:10px;font-weight:600;color:var(--tx1)">${_eh(r.nome||"—")}</td>
                    <td style="padding:10px;color:var(--tx2)">${_eh(r.email||"—")}</td>
                    <td style="padding:10px;color:var(--tx2)">${_eh(r.celular||r.telefone||"—")}</td>
                    <td style="padding:10px">${_badgeTipo(r.tipo)}</td>
                    <td style="padding:10px;color:var(--tx3);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_eh(r.descricao||"")}</td>
                    <td style="padding:10px">
                      <span class="pill ${r.ativo?"pd":"pz"}">${r.ativo?"Ativo":"Inativo"}</span>
                    </td>
                    <td style="padding:10px;white-space:nowrap">
                      ${_pode() ? `<button class="btn-sm" onclick="pextAbrirForm('${r.id}')">Editar</button>` : ""}
                    </td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>`}
    `;
  }

  window.pextFiltrar = function () {
    _filtroBusca = document.getElementById("pext-busca")?.value || "";
    _filtroTipo  = document.getElementById("pext-ftipo")?.value || "";
    _renderLista();
  };

  /* ── MODAL CRIAR / EDITAR ──────────────────────────────────────── */

  window.pextAbrirForm = function (id) {
    const reg = id ? _lista.find(r => r.id === id) : null;

    const html = `
      <div id="pext-modal-bg" style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px">
        <div style="background:var(--bg2);border:1px solid var(--bd);border-radius:10px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;padding:24px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
            <h2 style="font-size:14px;font-weight:700;color:var(--tx1)">${reg ? "Editar Participante" : "Novo Participante Externo"}</h2>
            <button onclick="pextFecharForm()" style="background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer">✕</button>
          </div>

          <div style="display:grid;gap:12px">
            ${!reg ? `
              <div style="background:rgba(74,156,245,.08);border:1px solid rgba(74,156,245,.2);border-radius:6px;padding:10px 12px;font-size:11px;color:var(--blue)">
                Preencha os dados da pessoa. Ela será cadastrada em <strong>Pessoas</strong> e vinculada como participante externo — sem campos eclesiásticos.
              </div>` : ""}

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div style="grid-column:1/-1">
                <label style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Nome completo *</label>
                <input id="pext-f-nome" type="text" value="${_eh(reg?.nome||"")}"
                  style="width:100%;margin-top:4px;background:var(--bg3);border:1px solid var(--bd);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none">
              </div>
              <div>
                <label style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">E-mail</label>
                <input id="pext-f-email" type="email" value="${_eh(reg?.email||"")}"
                  style="width:100%;margin-top:4px;background:var(--bg3);border:1px solid var(--bd);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none">
              </div>
              <div>
                <label style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Celular</label>
                <input id="pext-f-celular" type="tel" value="${_eh(reg?.celular||"")}"
                  style="width:100%;margin-top:4px;background:var(--bg3);border:1px solid var(--bd);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none">
              </div>
              <div>
                <label style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">CPF</label>
                <input id="pext-f-cpf" type="text" value="${_eh(reg?.cpf||"")}" placeholder="000.000.000-00"
                  style="width:100%;margin-top:4px;background:var(--bg3);border:1px solid var(--bd);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none">
              </div>
              <div>
                <label style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Data de nascimento</label>
                <input id="pext-f-nasc" type="date" value="${_eh(reg?.data_nascimento||"")}"
                  style="width:100%;margin-top:4px;background:var(--bg3);border:1px solid var(--bd);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none">
              </div>
              <div>
                <label style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Tipo de vínculo *</label>
                <select id="pext-f-tipo"
                  style="width:100%;margin-top:4px;background:var(--bg3);border:1px solid var(--bd);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;cursor:pointer;outline:none">
                  <option value="">Selecione…</option>
                  ${Object.entries(TIPOS).map(([v,c])=>`<option value="${v}"${reg?.tipo===v?" selected":""}>${_eh(c.label)}</option>`).join("")}
                </select>
              </div>
              <div style="grid-column:1/-1">
                <label style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Descrição do vínculo</label>
                <input id="pext-f-desc" type="text" value="${_eh(reg?.descricao||"")}"
                  placeholder="Ex: Turma Manhã — Homeschool 2026"
                  style="width:100%;margin-top:4px;background:var(--bg3);border:1px solid var(--bd);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none">
              </div>
              <div style="grid-column:1/-1">
                <label style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Observações</label>
                <textarea id="pext-f-obs" rows="2"
                  style="width:100%;margin-top:4px;background:var(--bg3);border:1px solid var(--bd);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none;resize:vertical">${_eh(reg?.observacoes||"")}</textarea>
              </div>
              ${reg ? `
              <div style="grid-column:1/-1;display:flex;align-items:center;gap:8px">
                <input id="pext-f-ativo" type="checkbox" ${reg.ativo?"checked":""} style="width:14px;height:14px;cursor:pointer">
                <label for="pext-f-ativo" style="font-size:12px;color:var(--tx2);cursor:pointer">Cadastro ativo</label>
              </div>` : ""}
            </div>

            <div id="pext-form-erro" style="display:none;color:var(--rose);font-size:11px;margin-top:4px"></div>

            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px">
              <button onclick="pextFecharForm()" class="btn-sec">Cancelar</button>
              <button onclick="pextSalvar(${reg ? `'${reg.id}','${reg.pessoa_id}'` : "null,null"})" class="btn-pri">Salvar</button>
            </div>
          </div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML("beforeend", html);
  };

  window.pextFecharForm = function () {
    document.getElementById("pext-modal-bg")?.remove();
  };

  window.pextSalvar = async function (pextId, pessoaId) {
    const nome    = document.getElementById("pext-f-nome")?.value?.trim();
    const email   = document.getElementById("pext-f-email")?.value?.trim() || null;
    const celular = document.getElementById("pext-f-celular")?.value?.trim() || null;
    const cpf     = document.getElementById("pext-f-cpf")?.value?.trim() || null;
    const nasc    = document.getElementById("pext-f-nasc")?.value || null;
    const tipo    = document.getElementById("pext-f-tipo")?.value;
    const desc    = document.getElementById("pext-f-desc")?.value?.trim() || null;
    const obs     = document.getElementById("pext-f-obs")?.value?.trim() || null;
    const ativo   = pextId ? (document.getElementById("pext-f-ativo")?.checked ?? true) : true;

    const erroEl = document.getElementById("pext-form-erro");
    const _erro  = (msg) => { if(erroEl){ erroEl.style.display="block"; erroEl.textContent=msg; } };

    if (!nome)  return _erro("Nome é obrigatório.");
    if (!tipo)  return _erro("Tipo de vínculo é obrigatório.");

    const btn = document.querySelector("#pext-modal-bg .btn-pri");
    if (btn) { btn.disabled = true; btn.textContent = "Salvando…"; }
    if (erroEl) erroEl.style.display = "none";

    try {
      let pid = pessoaId;

      if (!pid) {
        // Novo: criar pessoa primeiro
        const pRes = await _fetch("/rest/v1/pessoas", {
          method: "POST",
          headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=representation" }),
          body: JSON.stringify({ nome, email, celular, cpf, data_nascimento: nasc })
        });
        pid = Array.isArray(pRes) ? pRes[0]?.id : pRes?.id;
        if (!pid) throw new Error("Falha ao criar pessoa: ID não retornado.");

        await _fetch("/rest/v1/participantes_externos", {
          method: "POST",
          headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
          body: JSON.stringify({ pessoa_id: pid, tipo, descricao: desc, observacoes: obs, ativo: true })
        });
      } else {
        // Edição: atualizar pessoa e participante
        await _fetch(`/rest/v1/pessoas?id=eq.${pid}`, {
          method: "PATCH",
          headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
          body: JSON.stringify({ nome, email, celular, cpf, data_nascimento: nasc })
        });
        await _fetch(`/rest/v1/participantes_externos?id=eq.${pextId}`, {
          method: "PATCH",
          headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
          body: JSON.stringify({ tipo, descricao: desc, observacoes: obs, ativo })
        });
      }

      pextFecharForm();
      _toast("Salvo", nome);
      await _carregar();
      _renderLista();
    } catch (e) {
      _erro(e.message);
      if (btn) { btn.disabled = false; btn.textContent = "Salvar"; }
    }
  };

  /* ── AUTOLOAD ──────────────────────────────────────────────────── */
  if (typeof VIEW_AUTOLOAD !== "undefined") {
    VIEW_AUTOLOAD["pext-lista"] = { fn: () => window.pextCarregar() };
  }

})();
