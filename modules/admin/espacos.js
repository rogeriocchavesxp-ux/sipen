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

  // estado da agenda panorâmica
  let _agSemana   = null;  // Date: segunda-feira da semana exibida
  let _agEventos  = [];    // eventos retornados pela RPC
  let _agTabAtiva = "lista"; // "lista" | "agenda"

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
    const _rect = btn.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.className = "adm-esp-dropdown";
    menu.style.cssText = `position:fixed;top:${_rect.bottom + 4}px;right:${window.innerWidth - _rect.right}px;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.15);z-index:9999;min-width:160px;padding:4px 0`;
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
    document.body.appendChild(menu);
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
      const padraoNovo = field === "ativo" || field === "reservavel";
      const val = e ? e[field] : padraoNovo;
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

  /* ══════════════════════════════════════════════════════════════
     AGENDA PANORÂMICA
  ══════════════════════════════════════════════════════════════ */

  /* ── helpers de data ──────────────────────────────────────── */
  function _fmtDate(d) {
    return d.toISOString().slice(0, 10);
  }

  function _mondayOf(d) {
    const day = new Date(d);
    const dow = day.getDay(); // 0=Dom
    day.setDate(day.getDate() - (dow === 0 ? 6 : dow - 1));
    day.setHours(0, 0, 0, 0);
    return day;
  }

  function _addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }

  function _nomeDiaSemana(d) {
    return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d.getDay()];
  }

  function _nomeMes(m) {
    return ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][m];
  }

  function _fmtRangeLabel(ini, fim) {
    if (ini.getMonth() === fim.getMonth() && ini.getFullYear() === fim.getFullYear()) {
      return `${ini.getDate()} – ${fim.getDate()} de ${_nomeMes(ini.getMonth())} de ${ini.getFullYear()}`;
    }
    if (ini.getFullYear() === fim.getFullYear()) {
      return `${ini.getDate()} ${_nomeMes(ini.getMonth())} – ${fim.getDate()} ${_nomeMes(fim.getMonth())} de ${ini.getFullYear()}`;
    }
    return `${ini.getDate()}/${ini.getMonth()+1}/${ini.getFullYear()} – ${fim.getDate()}/${fim.getMonth()+1}/${fim.getFullYear()}`;
  }

  function _fmtHora(h) {
    if (!h) return "";
    return h.slice(0, 5); // "HH:MM"
  }

  function _dateFromStr(s) {
    // "YYYY-MM-DD" → Date local (sem deslocamento de fuso)
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  /* ── cores por status ─────────────────────────────────────── */
  function _corStatus(status) {
    switch ((status || "").toLowerCase()) {
      case "confirmado":   return { bg: "rgba(42,181,192,.15)",  border: "var(--teal)",  txt: "var(--teal)" };
      case "pendente":     return { bg: "rgba(212,168,67,.15)",  border: "var(--amber)", txt: "var(--amber)" };
      case "em análise":
      case "em analise":   return { bg: "rgba(74,156,245,.15)",  border: "var(--sky)",   txt: "var(--sky)" };
      default:             return { bg: "rgba(160,160,160,.12)", border: "var(--tx4,#aaa)", txt: "var(--tx3)" };
    }
  }

  /* ── sub-tabs ─────────────────────────────────────────────── */
  function tabIr(tab) {
    _agTabAtiva = tab;
    const secLista  = document.getElementById("adm-esp-sec-lista");
    const secAgenda = document.getElementById("adm-esp-sec-agenda");
    const tabLista  = document.getElementById("adm-esp-tab-lista");
    const tabAgenda = document.getElementById("adm-esp-tab-agenda");
    if (!secLista || !secAgenda) return;

    const ativo   = "padding:10px 20px;font-size:12.5px;font-weight:600;border:none;background:none;cursor:pointer;color:var(--teal);border-bottom:2px solid var(--teal);margin-bottom:-1px";
    const inativo = "padding:10px 20px;font-size:12.5px;font-weight:600;border:none;background:none;cursor:pointer;color:var(--tx3);border-bottom:2px solid transparent;margin-bottom:-1px";

    if (tab === "lista") {
      secLista.style.display  = "";
      secAgenda.style.display = "none";
      tabLista.style.cssText  = ativo;
      tabAgenda.style.cssText = inativo;
    } else {
      secLista.style.display  = "none";
      secAgenda.style.display = "";
      tabLista.style.cssText  = inativo;
      tabAgenda.style.cssText = ativo;
      agendaLoad();
    }
  }

  /* ── carrega dados da semana ─────────────────────────────── */
  async function agendaLoad() {
    if (!_agSemana) _agSemana = _mondayOf(new Date());

    const ini = _agSemana;
    const fim = _addDays(ini, 6);

    const rangeEl = document.getElementById("adm-esp-ag-range");
    if (rangeEl) rangeEl.textContent = _fmtRangeLabel(ini, fim);

    const grid = document.getElementById("adm-esp-ag-grid");
    if (grid) grid.innerHTML = `<div style="padding:28px;text-align:center;color:var(--tx3);font-size:12px">Carregando…</div>`;

    try {
      // garante que a lista de espaços está carregada
      if (!_lista.length) await _fetchEspacos();

      const r = await fetch(`${apiBaseUrl()}/rest/v1/rpc/espacos_agenda_admin`, {
        method:  "POST",
        headers: apiHeaders(),
        body:    JSON.stringify({ p_inicio: _fmtDate(ini), p_fim: _fmtDate(fim) })
      });
      _agEventos = r.ok ? await r.json() : [];
      _agendaRender(ini, fim);
    } catch (e) {
      if (grid) grid.innerHTML = `<div style="padding:28px;text-align:center;color:var(--rose);font-size:12px">Erro ao carregar: ${e.message}</div>`;
    }
  }

  /* ── navegar semanas ──────────────────────────────────────── */
  function agendaNav(delta) {
    if (!_agSemana) _agSemana = _mondayOf(new Date());
    _agSemana = _addDays(_agSemana, delta * 7);
    agendaLoad();
  }

  function agendaHoje() {
    _agSemana = _mondayOf(new Date());
    agendaLoad();
  }

  /* ── renderiza a grade panorâmica ────────────────────────── */
  function _agendaRender(ini, fim) {
    const grid = document.getElementById("adm-esp-ag-grid");
    if (!grid) return;

    // 7 dias da semana (Seg → Dom)
    const dias = Array.from({ length: 7 }, (_, i) => _addDays(ini, i));
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    // espaços ativos, ordenados por bloco + ordem
    const espacos = _lista.filter(e => e.ativo);

    if (!espacos.length) {
      grid.innerHTML = `<div style="padding:28px;text-align:center;color:var(--tx3);font-size:12px">Nenhum espaço ativo cadastrado.</div>`;
      return;
    }

    // índice de eventos por (espaco_id|espaco_nome) por dia ISO
    const idx = {};
    _agEventos.forEach(ev => {
      const evIni = _dateFromStr(ev.data);
      const evFim = ev.data_enc ? _dateFromStr(ev.data_enc) : evIni;
      dias.forEach(dia => {
        if (evIni <= dia && evFim >= dia) {
          const key = ev.espaco_id || ev.espaco_nome;
          if (!key) return;
          const dKey = _fmtDate(dia);
          if (!idx[key]) idx[key] = {};
          if (!idx[key][dKey]) idx[key][dKey] = [];
          idx[key][dKey].push(ev);
        }
      });
    });

    // coluna de espaços: largura fixa; colunas de dias: flex
    const thStyle = "padding:10px 10px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);white-space:nowrap;border-bottom:2px solid var(--bd1)";
    const tdEspStyle = "padding:0;vertical-align:top;border-right:1px solid var(--bd1);border-bottom:1px solid var(--bd1)";
    const tdDayStyle = "padding:6px 5px;vertical-align:top;border-right:1px solid var(--bd1);border-bottom:1px solid var(--bd1);min-height:56px";

    const cabecalho = `
      <tr style="background:var(--bg)">
        <th style="${thStyle};text-align:left;width:160px;min-width:140px;border-right:1px solid var(--bd1)">Espaço</th>
        ${dias.map(d => {
          const isHoje = d.getTime() === hoje.getTime();
          return `<th style="${thStyle};${isHoje ? "color:var(--teal)" : ""}">
            <div>${_nomeDiaSemana(d)}</div>
            <div style="font-size:13px;font-weight:700;margin-top:1px;${isHoje ? "color:var(--teal)" : "color:var(--tx1)"}">${d.getDate()}/${d.getMonth()+1}</div>
          </th>`;
        }).join("")}
      </tr>`;

    let blocoAtual = null;
    const linhas = espacos.map(esp => {
      const espKey = esp.id || esp.nome;
      let sepBloco = "";
      if (esp.bloco_nome !== blocoAtual) {
        blocoAtual = esp.bloco_nome;
        sepBloco = `<tr><td colspan="8" style="padding:6px 12px 3px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);background:var(--bg);border-bottom:1px solid var(--bd1)">${blocoAtual || "Sem bloco"}</td></tr>`;
      }

      const colunaEspaco = `
        <td style="${tdEspStyle};background:var(--bg)">
          <div style="padding:8px 10px">
            <div style="font-size:12px;font-weight:700;color:var(--tx1);line-height:1.3">${escapeHtml(esp.nome)}</div>
            ${esp.tipo ? `<div style="font-size:10px;color:var(--tx3);margin-top:1px">${escapeHtml(esp.tipo)}</div>` : ""}
          </div>
        </td>`;

      const colunasDias = dias.map(dia => {
        const dKey = _fmtDate(dia);
        const isHoje = dia.getTime() === hoje.getTime();
        const evsDia = (idx[espKey] || {})[dKey] || [];

        const badgesHtml = evsDia.map(ev => {
          const c = _corStatus(ev.status);
          const hora = ev.hora_inicio ? `${_fmtHora(ev.hora_inicio)}${ev.hora_fim ? "–" + _fmtHora(ev.hora_fim) : ""}` : "";
          const titulo = escapeHtml((ev.titulo || "").substring(0, 26) + ((ev.titulo || "").length > 26 ? "…" : ""));
          const dataJson = escapeHtml(JSON.stringify({
            id: ev.evento_id, titulo: ev.titulo, status: ev.status,
            tipo: ev.tipo, data: ev.data, data_enc: ev.data_enc,
            hora_inicio: ev.hora_inicio, hora_fim: ev.hora_fim,
            solicitante: ev.solicitante, espaco_nome: ev.espaco_nome
          }));
          return `<div
            onclick="ADM_ESP.agDetalhe(this, '${dataJson}')"
            style="margin:2px 0;padding:3px 6px;border-radius:5px;border-left:3px solid ${c.border};background:${c.bg};cursor:pointer;font-size:10.5px;color:${c.txt};line-height:1.4;transition:opacity .15s"
            onmouseover="this.style.opacity='.75'" onmouseout="this.style.opacity='1'"
          >${hora ? `<div style="font-size:9.5px;font-weight:600;opacity:.85">${hora}</div>` : ""}
          <div style="font-weight:600;color:var(--tx1)">${titulo}</div></div>`;
        }).join("");

        return `<td style="${tdDayStyle}${isHoje ? ";background:rgba(42,181,192,.04)" : ""}">
          <div style="min-height:48px">${badgesHtml}</div>
        </td>`;
      }).join("");

      return `${sepBloco}<tr style="border-bottom:1px solid var(--bd1)">${colunaEspaco}${colunasDias}</tr>`;
    }).join("");

    const nTotal = _agEventos.length;
    grid.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--bd1);background:var(--bg)">
        <span style="font-size:11.5px;color:var(--tx2);font-weight:600">${espacos.length} espaço${espacos.length !== 1 ? "s" : ""}</span>
        <span style="font-size:11.5px;color:var(--tx3)">${nTotal} evento${nTotal !== 1 ? "s" : ""} na semana</span>
      </div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed">
        <colgroup>
          <col style="width:160px">
          ${dias.map(() => '<col>').join("")}
        </colgroup>
        <thead>${cabecalho}</thead>
        <tbody>${linhas}</tbody>
      </table>`;
  }

  /* ── popup de detalhe do evento ──────────────────────────── */
  function agDetalhe(el, dataJson) {
    document.querySelectorAll(".adm-esp-ag-detalhe-ativo").forEach(x => x.classList.remove("adm-esp-ag-detalhe-ativo"));

    const panel = document.getElementById("adm-esp-ag-detalhe");
    if (!panel) return;

    let ev;
    try { ev = JSON.parse(dataJson); } catch { return; }

    const c = _corStatus(ev.status);
    const fmtD = s => {
      if (!s) return "—";
      const [y, m, d] = s.split("-");
      return `${d}/${m}/${y}`;
    };

    panel.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:12px">
        <div style="font-size:14px;font-weight:700;color:var(--tx1);line-height:1.3;flex:1">${escapeHtml(ev.titulo || "—")}</div>
        <button onclick="document.getElementById('adm-esp-ag-detalhe').style.display='none'" style="background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer;padding:0;line-height:1;flex-shrink:0">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:7px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:var(--tx3)">Status</span>
          <span style="font-size:11.5px;font-weight:700;color:${c.txt}">${ev.status || "—"}</span>
        </div>
        ${ev.tipo ? `<div style="display:flex;justify-content:space-between">
          <span style="font-size:11px;color:var(--tx3)">Tipo</span>
          <span style="font-size:11.5px;color:var(--tx2)">${escapeHtml(ev.tipo)}</span>
        </div>` : ""}
        <div style="display:flex;justify-content:space-between">
          <span style="font-size:11px;color:var(--tx3)">Espaço</span>
          <span style="font-size:11.5px;color:var(--tx2)">${escapeHtml(ev.espaco_nome || "—")}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="font-size:11px;color:var(--tx3)">Solicitante</span>
          <span style="font-size:11.5px;color:var(--tx2)">${escapeHtml(ev.solicitante || "—")}</span>
        </div>
        <div style="border-top:1px solid var(--bd1);padding-top:7px;display:flex;justify-content:space-between">
          <span style="font-size:11px;color:var(--tx3)">Data</span>
          <span style="font-size:11.5px;color:var(--tx2)">${fmtD(ev.data)}${ev.data_enc && ev.data_enc !== ev.data ? " → " + fmtD(ev.data_enc) : ""}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="font-size:11px;color:var(--tx3)">Horário</span>
          <span style="font-size:11.5px;color:var(--tx2)">${ev.hora_inicio ? ev.hora_inicio.slice(0,5) : "—"}${ev.hora_fim ? " – " + ev.hora_fim.slice(0,5) : ""}</span>
        </div>
      </div>`;

    // posiciona o painel próximo ao badge clicado
    const rect = el.getBoundingClientRect();
    panel.style.display = "block";
    const panelW = 320;
    let left = rect.right + 8;
    if (left + panelW > window.innerWidth - 16) left = rect.left - panelW - 8;
    if (left < 8) left = 8;
    let top = rect.top;
    if (top + 280 > window.innerHeight) top = window.innerHeight - 288;
    if (top < 8) top = 8;
    panel.style.left = left + "px";
    panel.style.top  = top + "px";

    // fecha ao clicar fora
    setTimeout(() => {
      document.addEventListener("click", e => {
        if (!panel.contains(e.target)) panel.style.display = "none";
      }, { once: true });
    }, 10);
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
    tabIr, agendaLoad, agendaNav, agendaHoje, agDetalhe,
  };
})();

// Expõe globalmente para VIEW_AUTOLOAD e onclick handlers
window.ADM_ESP = ADM_ESP;
function admEspacosLoad() { ADM_ESP.load(); }
