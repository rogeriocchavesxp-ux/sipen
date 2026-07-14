/* ══════════════════════════════════════════════════════════════
   SIPEN — Administração > Espaços
   Fonte única de cadastro de ambientes físicos da IPPenha.
══════════════════════════════════════════════════════════════ */

const ADM_ESP = (() => {

  /* ── estado ────────────────────────────────────────────────── */
  let _lista   = [];   // rows de espacos_com_bloco()
  let _blocos  = [];   // rows de espacos_blocos
  let _tipos   = [];   // rows de tipos_espaco
  let _editId  = null; // UUID em edição, null = novo
  let _filtro  = { busca: "", bloco: "", tipo: "", status: "ativos", portal: "" };

  /* ── fetch ─────────────────────────────────────────────────── */
  async function _fetchBlocos() {
    const r = await fetch(`${apiBaseUrl()}/rest/v1/espacos_blocos?order=ordem.asc`, { headers: apiHeaders() });
    _blocos = r.ok ? await r.json() : [];
  }
  async function _fetchTipos() {
    const r = await fetch(`${apiBaseUrl()}/rest/v1/tipos_espaco?ativo=eq.true&order=nome.asc`, { headers: apiHeaders() });
    _tipos = r.ok ? await r.json() : [];
  }
  async function _fetchEspacos() {
    const r = await fetch(`${apiBaseUrl()}/rest/v1/rpc/espacos_com_bloco`, {
      method: "POST", headers: apiHeaders(), body: JSON.stringify({})
    });
    _lista = r.ok ? await r.json() : [];
  }

  /* ── load principal ─────────────────────────────────────────── */
  async function load() {
    _renderSkeleton();
    try {
      await Promise.all([_fetchBlocos(), _fetchTipos(), _fetchEspacos()]);
      _populateFiltros();
      _render();
    } catch (e) {
      document.getElementById("adm-esp-corpo").innerHTML =
        `<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--rose)">Erro ao carregar espaços: ${e.message}</td></tr>`;
    }
  }

  function _renderSkeleton() {
    const el = document.getElementById("adm-esp-corpo");
    if (el) el.innerHTML = `<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--tx3);font-size:12px">Carregando...</td></tr>`;
  }

  /* ── filtros dropdown ──────────────────────────────────────── */
  function _populateFiltros() {
    const sel = document.getElementById("adm-esp-f-bloco");
    if (!sel || sel.dataset.loaded) return;
    _blocos.forEach(b => {
      const o = document.createElement("option");
      o.value = b.id; o.textContent = b.nome; sel.appendChild(o);
    });
    const st = document.getElementById("adm-esp-f-tipo");
    if (st && !st.dataset.loaded) {
      _tipos.forEach(t => {
        const o = document.createElement("option");
        o.value = t.nome; o.textContent = t.nome; st.appendChild(o);
      });
      st.dataset.loaded = "1";
    }
    sel.dataset.loaded = "1";
  }

  /* ── render tabela ─────────────────────────────────────────── */
  function _render() {
    const filtrado = _lista.filter(e => {
      if (_filtro.busca) {
        const q = _filtro.busca.toLowerCase();
        if (!e.nome.toLowerCase().includes(q) && !(e.codigo||"").toLowerCase().includes(q)) return false;
      }
      if (_filtro.bloco  && e.bloco_id !== _filtro.bloco)  return false;
      if (_filtro.tipo   && e.tipo !== _filtro.tipo)        return false;
      if (_filtro.portal === "sim" && !e.disponivel_publico) return false;
      if (_filtro.portal === "nao" &&  e.disponivel_publico) return false;
      if (_filtro.status === "ativos"   && !e.ativo)  return false;
      if (_filtro.status === "inativos" &&  e.ativo)  return false;
      return true;
    });

    const el = document.getElementById("adm-esp-corpo");
    if (!el) return;

    const kpiEl = document.getElementById("adm-esp-kpi");
    if (kpiEl) kpiEl.textContent = `${filtrado.length} de ${_lista.length} espaço${_lista.length !== 1 ? "s" : ""}`;

    if (!filtrado.length) {
      el.innerHTML = `<tr><td colspan="8" style="padding:28px;text-align:center;color:var(--tx3);font-size:12px">Nenhum espaço encontrado.</td></tr>`;
      return;
    }

    // Agrupa por bloco para separador visual
    let blocoAtual = null;
    el.innerHTML = filtrado.map(e => {
      let sep = "";
      if (e.bloco_nome !== blocoAtual) {
        blocoAtual = e.bloco_nome;
        sep = `<tr><td colspan="8" style="padding:10px 14px 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);background:var(--bg)">${blocoAtual || "Sem bloco"}</td></tr>`;
      }
      const ativo = e.ativo
        ? `<span style="font-size:10.5px;font-weight:600;color:var(--gr);background:rgba(34,197,94,.1);border-radius:20px;padding:2px 9px">Ativo</span>`
        : `<span style="font-size:10.5px;font-weight:600;color:var(--tx3);background:var(--bd1);border-radius:20px;padding:2px 9px">Inativo</span>`;
      const portal = e.disponivel_publico
        ? `<span style="font-size:10.5px;font-weight:600;color:var(--sky)">Sim</span>`
        : `<span style="font-size:10.5px;color:var(--tx4,var(--tx3))">Não</span>`;
      return `${sep}<tr style="border-bottom:1px solid var(--bd1)">
        <td style="padding:10px 14px;font-family:monospace;font-size:11.5px;color:var(--tx3)">${e.codigo || "—"}</td>
        <td style="padding:10px 14px"><div style="font-weight:600;font-size:13px;color:var(--tx1)">${e.nome}</div>${e.localizacao ? `<div style="font-size:11px;color:var(--tx3)">${e.localizacao}</div>` : ""}</td>
        <td style="padding:10px 14px;font-size:12px;color:var(--tx2)">${e.tipo || "—"}</td>
        <td style="padding:10px 14px;font-size:12px;color:var(--tx2);font-variant-numeric:tabular-nums">${e.capacidade ? e.capacidade + " pessoas" : "—"}</td>
        <td style="padding:10px 14px">${portal}</td>
        <td style="padding:10px 14px">${ativo}</td>
        <td style="padding:10px 14px;white-space:nowrap">
          ${e.reservavel   ? '<span title="Reservável"   style="font-size:11px;color:var(--teal)">⊞</span> ' : ""}
          ${e.acessibilidade ? '<span title="Acessível"  style="font-size:11px;color:var(--sky)">♿</span> ' : ""}
          ${e.tem_som      ? '<span title="Som"          style="font-size:11px;color:var(--violet)">🔊</span> ' : ""}
          ${e.tem_projetor ? '<span title="Projetor"     style="font-size:11px;color:var(--amber)">📽</span> ' : ""}
          ${e.tem_internet ? '<span title="Internet"     style="font-size:11px;color:var(--tx3)">📶</span>' : ""}
        </td>
        <td style="padding:10px 8px;text-align:center">
          <div class="adm-esp-menu-wrap" style="position:relative;display:inline-block">
            <button onclick="ADM_ESP.menuAbrir('${e.id}', this)" style="background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer;padding:2px 6px;border-radius:6px;line-height:1">⋮</button>
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  /* ── menu de ações ─────────────────────────────────────────── */
  function menuAbrir(id, btn) {
    document.querySelectorAll(".adm-esp-dropdown").forEach(d => d.remove());
    const e = _lista.find(x => x.id === id);
    if (!e) return;
    const menu = document.createElement("div");
    menu.className = "adm-esp-dropdown";
    menu.style.cssText = "position:absolute;right:0;top:100%;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.15);z-index:200;min-width:160px;padding:4px 0";
    const acoes = [
      { label: "Editar",            fn: `ADM_ESP.editar('${id}')` },
      { label: e.ativo ? "Desativar" : "Ativar", fn: `ADM_ESP.toggleAtivo('${id}',${!e.ativo})` },
      { label: "Duplicar",          fn: `ADM_ESP.duplicar('${id}')` },
      { label: "Histórico",         fn: `ADM_ESP.historico('${id}')` },
      ...(!e.ativo ? [{ label: "Excluir", fn: `ADM_ESP.excluir('${id}')`, danger: true }] : []),
    ];
    menu.innerHTML = acoes.map(a =>
      `<div onclick="${a.fn};this.closest('.adm-esp-dropdown').remove()" style="padding:8px 14px;font-size:12.5px;cursor:pointer;color:${a.danger ? "var(--rose)" : "var(--tx1)"};white-space:nowrap" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">${a.label}</div>`
    ).join("");
    btn.closest(".adm-esp-menu-wrap").appendChild(menu);
    setTimeout(() => document.addEventListener("click", () => menu.remove(), { once: true }), 10);
  }

  /* ── modal: abrir novo ─────────────────────────────────────── */
  function novo() { _abrirModal(null); }

  function editar(id) {
    const e = _lista.find(x => x.id === id);
    if (e) _abrirModal(e);
  }

  function duplicar(id) {
    const e = _lista.find(x => x.id === id);
    if (!e) return;
    _abrirModal({ ...e, id: null, nome: e.nome + " (cópia)", codigo: "" });
  }

  /* ── modal ─────────────────────────────────────────────────── */
  function _abrirModal(e) {
    _editId = e?.id || null;
    const isNovo = !_editId;

    const blocoOpts = _blocos.map(b =>
      `<option value="${b.id}" ${e?.bloco_id === b.id ? "selected" : ""}>${b.nome}</option>`
    ).join("");
    const tipoOpts = _tipos.map(t =>
      `<option value="${t.nome}" ${e?.tipo === t.nome ? "selected" : ""}>${t.nome}</option>`
    ).join("");

    const chk = (field, label, title = "") => {
      const val = e ? e[field] : false;
      return `<label style="display:flex;align-items:center;gap:7px;padding:5px 0;font-size:12.5px;cursor:pointer" title="${title}">
        <input type="checkbox" id="adm-esp-f-${field}" ${val ? "checked" : ""} style="accent-color:var(--teal);width:14px;height:14px;cursor:pointer;flex-shrink:0"> ${label}</label>`;
    };

    let modal = document.getElementById("adm-esp-modal");
    if (!modal) { modal = document.createElement("div"); modal.id = "adm-esp-modal"; document.body.appendChild(modal); }
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:400;display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow-y:auto";
    modal.innerHTML = `
<div style="background:var(--bg-card);border-radius:16px;width:100%;max-width:680px;box-shadow:0 8px 40px rgba(0,0,0,.2);overflow:hidden">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid var(--bd1)">
    <div style="font-size:16px;font-weight:700;color:var(--tx1)">${isNovo ? "Novo Espaço" : "Editar Espaço"}</div>
    <button onclick="document.getElementById('adm-esp-modal').remove()" style="background:none;border:none;color:var(--tx3);font-size:22px;cursor:pointer;line-height:1;padding:0">✕</button>
  </div>
  <div style="padding:20px 24px;display:flex;flex-direction:column;gap:18px;overflow-y:auto;max-height:calc(100vh - 180px)">

    <!-- 1. Identificação -->
    <section>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid var(--bd1)">Identificação</div>
      <div style="display:grid;grid-template-columns:1fr 120px;gap:10px;margin-bottom:10px">
        <div>
          <label style="font-size:11px;font-weight:600;color:var(--tx3);display:block;margin-bottom:4px">Nome *</label>
          <input id="adm-esp-f-nome" value="${e?.nome || ""}" placeholder="Ex: Sala A06" style="${_si()}">
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:var(--tx3);display:block;margin-bottom:4px">Código</label>
          <input id="adm-esp-f-codigo" value="${e?.codigo || ""}" placeholder="A06" style="${_si()}">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label style="font-size:11px;font-weight:600;color:var(--tx3);display:block;margin-bottom:4px">Bloco / Prédio *</label>
          <select id="adm-esp-f-bloco_id" style="${_si()}"><option value="">Selecione…</option>${blocoOpts}</select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:var(--tx3);display:block;margin-bottom:4px">Tipo</label>
          <select id="adm-esp-f-tipo" style="${_si()}"><option value="">Selecione…</option>${tipoOpts}</select>
        </div>
      </div>
    </section>

    <!-- 2. Localização -->
    <section>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid var(--bd1)">Localização</div>
      <div style="margin-bottom:10px">
        <label style="font-size:11px;font-weight:600;color:var(--tx3);display:block;margin-bottom:4px">Localização interna</label>
        <input id="adm-esp-f-localizacao" value="${e?.localizacao || ""}" placeholder="Ex: Primeiro andar, fundos" style="${_si()}">
      </div>
      <div>
        <label style="font-size:11px;font-weight:600;color:var(--tx3);display:block;margin-bottom:4px">Descrição</label>
        <input id="adm-esp-f-descricao" value="${e?.descricao || ""}" placeholder="Breve descrição do espaço" style="${_si()}">
      </div>
    </section>

    <!-- 3. Capacidade -->
    <section>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid var(--bd1)">Capacidade</div>
      <div>
        <label style="font-size:11px;font-weight:600;color:var(--tx3);display:block;margin-bottom:4px">Capacidade máxima (pessoas)</label>
        <input id="adm-esp-f-capacidade" type="number" min="0" value="${e?.capacidade || ""}" placeholder="Ex: 80" style="${_si()} width:160px">
      </div>
    </section>

    <!-- 4. Recursos -->
    <section>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:6px;padding-bottom:5px;border-bottom:1px solid var(--bd1)">Recursos disponíveis</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px">
        ${chk("acessibilidade",  "Acessibilidade")}
        ${chk("climatizado",     "Climatização / Ar-condicionado")}
        ${chk("tem_som",         "Equipamento de som")}
        ${chk("tem_projetor",    "Projetor ou televisão")}
        ${chk("tem_internet",    "Internet / Wi-Fi")}
      </div>
    </section>

    <!-- 5. Regras de uso -->
    <section>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:6px;padding-bottom:5px;border-bottom:1px solid var(--bd1)">Regras de uso</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px">
        ${chk("ativo",               "Espaço ativo", "Inativo = não aparece em novas solicitações")}
        ${chk("reservavel",          "Reservável",   "Pode ser selecionado em agendamentos")}
        ${chk("disponivel_publico",  "Visível no portal público")}
        ${chk("exige_aprovacao",     "Exige aprovação administrativa")}
        ${chk("uso_interno",         "Uso exclusivo interno")}
        ${chk("permite_reserva_simul","Permite múltiplas reservas simultâneas")}
      </div>
    </section>

    <!-- 6. Ordem -->
    <section>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid var(--bd1)">Exibição</div>
      <div style="display:grid;grid-template-columns:120px 1fr;gap:10px;align-items:end">
        <div>
          <label style="font-size:11px;font-weight:600;color:var(--tx3);display:block;margin-bottom:4px">Ordem de exibição</label>
          <input id="adm-esp-f-ordem" type="number" min="0" value="${e?.ordem ?? 0}" style="${_si()}">
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:var(--tx3);display:block;margin-bottom:4px">Observações</label>
          <input id="adm-esp-f-observacoes" value="${e?.observacoes || ""}" placeholder="Notas internas" style="${_si()}">
        </div>
      </div>
    </section>

  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-top:1px solid var(--bd1);gap:10px">
    <div id="adm-esp-modal-err" style="font-size:12px;color:var(--rose)"></div>
    <div style="display:flex;gap:8px">
      <button onclick="document.getElementById('adm-esp-modal').remove()" style="padding:8px 16px;border-radius:8px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12.5px;cursor:pointer">Cancelar</button>
      <button onclick="ADM_ESP.salvar()" id="adm-esp-btn-salvar" style="padding:8px 20px;border-radius:8px;border:none;background:var(--gold,#C9A84C);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">${isNovo ? "Criar Espaço" : "Salvar"}</button>
    </div>
  </div>
</div>`;
  }

  /* input style helper */
  function _si() {
    return "width:100%;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg-card));color:var(--tx1);font-size:13px;font-family:inherit;box-sizing:border-box";
  }

  /* ── salvar ──────────────────────────────────────────────────── */
  async function salvar() {
    const nome = document.getElementById("adm-esp-f-nome")?.value.trim();
    if (!nome) { _modalErr("Informe o nome do espaço."); return; }

    const bloco_id = document.getElementById("adm-esp-f-bloco_id")?.value || null;
    if (!bloco_id) { _modalErr("Selecione o bloco / prédio."); return; }

    const capacidade = parseInt(document.getElementById("adm-esp-f-capacidade")?.value) || null;
    if (capacidade !== null && capacidade < 0) { _modalErr("Capacidade não pode ser negativa."); return; }

    const btn = document.getElementById("adm-esp-btn-salvar");
    if (btn) { btn.disabled = true; btn.textContent = "Salvando…"; }

    const payload = {
      nome,
      codigo:              document.getElementById("adm-esp-f-codigo")?.value.trim() || null,
      bloco_id,
      tipo:                document.getElementById("adm-esp-f-tipo")?.value || null,
      localizacao:         document.getElementById("adm-esp-f-localizacao")?.value.trim() || null,
      descricao:           document.getElementById("adm-esp-f-descricao")?.value.trim() || null,
      capacidade,
      ordem:               parseInt(document.getElementById("adm-esp-f-ordem")?.value) || 0,
      observacoes:         document.getElementById("adm-esp-f-observacoes")?.value.trim() || null,
      ativo:               document.getElementById("adm-esp-f-ativo")?.checked ?? true,
      reservavel:          document.getElementById("adm-esp-f-reservavel")?.checked ?? true,
      disponivel_publico:  document.getElementById("adm-esp-f-disponivel_publico")?.checked ?? false,
      exige_aprovacao:     document.getElementById("adm-esp-f-exige_aprovacao")?.checked ?? false,
      uso_interno:         document.getElementById("adm-esp-f-uso_interno")?.checked ?? false,
      permite_reserva_simul: document.getElementById("adm-esp-f-permite_reserva_simul")?.checked ?? false,
      acessibilidade:      document.getElementById("adm-esp-f-acessibilidade")?.checked ?? false,
      climatizado:         document.getElementById("adm-esp-f-climatizado")?.checked ?? false,
      tem_som:             document.getElementById("adm-esp-f-tem_som")?.checked ?? false,
      tem_projetor:        document.getElementById("adm-esp-f-tem_projetor")?.checked ?? false,
      tem_internet:        document.getElementById("adm-esp-f-tem_internet")?.checked ?? false,
    };

    try {
      if (_editId) {
        const r = await fetch(`${apiBaseUrl()}/rest/v1/espacos?id=eq.${_editId}`, {
          method: "PATCH",
          headers: { ...apiHeaders(), "Prefer": "return=minimal" },
          body: JSON.stringify(payload)
        });
        if (!r.ok) throw new Error((await r.json()).message || `Erro ${r.status}`);
      } else {
        const r = await fetch(`${apiBaseUrl()}/rest/v1/espacos`, {
          method: "POST",
          headers: { ...apiHeaders(), "Prefer": "return=minimal" },
          body: JSON.stringify(payload)
        });
        if (!r.ok) throw new Error((await r.json()).message || `Erro ${r.status}`);
      }
      document.getElementById("adm-esp-modal")?.remove();
      await load();
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = "Salvar"; }
      _modalErr(e.message || "Erro ao salvar.");
    }
  }

  function _modalErr(msg) {
    const el = document.getElementById("adm-esp-modal-err");
    if (el) el.textContent = msg;
  }

  /* ── toggle ativo ──────────────────────────────────────────── */
  async function toggleAtivo(id, ativo) {
    try {
      const r = await fetch(`${apiBaseUrl()}/rest/v1/espacos?id=eq.${id}`, {
        method: "PATCH",
        headers: { ...apiHeaders(), "Prefer": "return=minimal" },
        body: JSON.stringify({ ativo })
      });
      if (!r.ok) throw new Error(`Erro ${r.status}`);
      await load();
    } catch (e) { alert(e.message); }
  }

  /* ── excluir ─────────────────────────────────────────────────── */
  async function excluir(id) {
    const e = _lista.find(x => x.id === id);
    if (!e || e.ativo) { alert("Desative o espaço antes de excluir."); return; }
    if (!confirm(`Excluir "${e.nome}" permanentemente?\n\nSó é possível se o espaço nunca teve reservas.`)) return;
    try {
      const r = await fetch(`${apiBaseUrl()}/rest/v1/espacos?id=eq.${id}`, {
        method: "DELETE", headers: apiHeaders()
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || "Não é possível excluir: o espaço pode ter histórico de reservas.");
      }
      await load();
    } catch (e) { alert(e.message); }
  }

  /* ── histórico (placeholder) ────────────────────────────────── */
  function historico(id) {
    const e = _lista.find(x => x.id === id);
    if (!e) return;
    // Navega para agenda filtrando por espaço
    if (typeof go === "function") go("agenda-prog");
    // TODO: passar filtro de espaço quando a view de agenda suportar
  }

  /* ── filtro handlers ─────────────────────────────────────────── */
  function filtrar() {
    _filtro.busca  = document.getElementById("adm-esp-f-busca")?.value || "";
    _filtro.bloco  = document.getElementById("adm-esp-f-bloco")?.value || "";
    _filtro.tipo   = document.getElementById("adm-esp-f-tipo-fil")?.value || "";
    _filtro.status = document.getElementById("adm-esp-f-status")?.value || "ativos";
    _filtro.portal = document.getElementById("adm-esp-f-portal")?.value || "";
    _render();
  }

  /* ── API pública de espacos para outros módulos ──────────────── */
  async function listarAtivos() {
    if (!_lista.length) await _fetchEspacos();
    return _lista.filter(e => e.ativo);
  }

  async function listarReservaveis() {
    if (!_lista.length) await _fetchEspacos();
    return _lista.filter(e => e.ativo && e.reservavel);
  }

  async function listarPublicos() {
    if (!_lista.length) await _fetchEspacos();
    return _lista.filter(e => e.ativo && e.disponivel_publico);
  }

  return {
    load, novo, editar, duplicar, historico, excluir,
    toggleAtivo, menuAbrir, salvar, filtrar,
    listarAtivos, listarReservaveis, listarPublicos,
  };
})();

// Expõe globalmente para VIEW_AUTOLOAD e onclick handlers
window.ADM_ESP = ADM_ESP;
function admEspacosLoad() { ADM_ESP.load(); }
