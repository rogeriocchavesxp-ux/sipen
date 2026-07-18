/* ═══════════════════════════════════════════════════════════════
   SIPEN — Escala do Ministério de Música  v1.0
   Grid mensal idêntico ao pastoral: datas × cultos · um dirigente por slot
═══════════════════════════════════════════════════════════════ */
(function () {

  const SLOTS = {
    domingo_manha:     { lbl: "Domingo Manhã",      cor: "#4a9cf5" },
    domingo_noite:     { lbl: "Domingo Noite",      cor: "#8b6fd4" },
    conexao_com_deus:  { lbl: "Conexão com Deus",   cor: "#2ab5c0" },
    tarde_da_esperanca:{ lbl: "Tarde da Esperança", cor: "#d4a843" },
  };

  const STATUS_CFG = {
    PENDENTE:   { bg: "rgba(212,168,67,.15)",  cl: "#d4a843", lbl: "Pendente"   },
    PREENCHIDA: { bg: "rgba(74,156,245,.15)",  cl: "#4a9cf5", lbl: "Preenchida" },
    CONFIRMADA: { bg: "rgba(58,170,92,.15)",   cl: "#3aaa5c", lbl: "Confirmada" },
  };

  const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  let _mes     = (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; })();
  let _musicos = [];
  let _escala  = new Map(); // "YYYY-MM-DD-culto_tipo" → {id, dirigente_nome, equipe, obs, status}
  let _editKey = null;

  function _api()   { return typeof apiBaseUrl === "function" ? apiBaseUrl() : ""; }
  function _hdrs(x) { return typeof apiHeaders === "function" ? apiHeaders(x || {}) : {}; }
  function _esc(s)  { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function _root()  { return document.getElementById("musica-esc-root"); }
  function _mesRef(){ return `${_mes.getFullYear()}-${String(_mes.getMonth()+1).padStart(2,"0")}`; }
  function _mesLbl(){ return `${MESES_PT[_mes.getMonth()]} ${_mes.getFullYear()}`; }

  /* ── Dados ───────────────────────────────────────────────── */

  async function _loadMusicos() {
    if (_musicos.length) return;
    const r = await fetch(`${_api()}/rest/v1/musicos?ativo=eq.true&order=nome.asc&limit=200`, { headers: _hdrs() });
    _musicos = r.ok ? (await r.json()) : [];
  }

  async function _loadEscala() {
    const ref = _mesRef();
    const ano = ref.slice(0,4), mes = ref.slice(5,7);
    const de  = `${ano}-${mes}-01`;
    const ate = `${ano}-${mes}-31`;
    const r   = await fetch(
      `${_api()}/rest/v1/escala_musica?data=gte.${de}&data=lte.${ate}&order=data.asc,culto_tipo.asc&limit=500`,
      { headers: _hdrs() }
    );
    _escala.clear();
    if (r.ok) {
      const rows = await r.json();
      rows.forEach(row => _escala.set(`${row.data}-${row.culto_tipo}`, {
        id: row.id, dirigente_nome: row.dirigente_nome, equipe: row.equipe,
        obs: row.obs, status: row.status || "PENDENTE",
      }));
    }
  }

  /* ── Upsert ──────────────────────────────────────────────── */

  async function _upsert(dateStr, cultoTipo, fields) {
    const key      = `${dateStr}-${cultoTipo}`;
    const existing = _escala.get(key);
    const autoSt   = !fields.dirigente_nome ? "PENDENTE" : (fields.status === "PENDENTE" ? "PREENCHIDA" : fields.status);
    const payload  = { ...fields, status: autoSt };
    let r;
    if (existing?.id) {
      r = await fetch(`${_api()}/rest/v1/escala_musica?id=eq.${existing.id}`, {
        method: "PATCH",
        headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=representation" }),
        body: JSON.stringify(payload),
      });
    } else {
      r = await fetch(`${_api()}/rest/v1/escala_musica`, {
        method: "POST",
        headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=representation" }),
        body: JSON.stringify({ data: dateStr, culto_tipo: cultoTipo, ...payload }),
      });
    }
    if (!r.ok) throw new Error(await r.text());
    const [saved] = await r.json();
    _escala.set(key, { id: saved.id, dirigente_nome: saved.dirigente_nome, equipe: saved.equipe, obs: saved.obs, status: saved.status });
  }

  /* ── Render ──────────────────────────────────────────────── */

  function _datasDoMes() {
    const out = [], d = new Date(_mes);
    while (d.getMonth() === _mes.getMonth()) { out.push(new Date(d)); d.setDate(d.getDate()+1); }
    return out;
  }

  function _render() {
    const el = _root();
    if (!el) return;

    const datas  = _datasDoMes();
    const DIAS   = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
    const isSun  = d => d.getDay() === 0;
    const slotKeys = Object.keys(SLOTS);

    const totalPreench = [..._escala.values()].filter(v => v.dirigente_nome).length;
    const totalEquipe  = [..._escala.values()].filter(v => v.equipe).length;
    const totalPend    = [..._escala.values()].filter(v => v.status === "PENDENTE").length;

    el.innerHTML = `
<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
  <div style="flex:1;min-width:140px;padding:10px 14px;border-radius:8px;border:1px solid var(--bd1);background:var(--bg-card)">
    <div style="font-size:10px;color:var(--tx4);text-transform:uppercase;letter-spacing:.06em">Com dirigente</div>
    <div style="font-size:20px;font-weight:700;color:var(--tx1)">${totalPreench}</div>
  </div>
  <div style="flex:1;min-width:140px;padding:10px 14px;border-radius:8px;border:1px solid var(--bd1);background:var(--bg-card)">
    <div style="font-size:10px;color:var(--tx4);text-transform:uppercase;letter-spacing:.06em">Com equipe</div>
    <div style="font-size:20px;font-weight:700;color:var(--teal)">${totalEquipe}</div>
  </div>
  <div style="flex:1;min-width:140px;padding:10px 14px;border-radius:8px;border:1px solid var(--bd1);background:var(--bg-card)">
    <div style="font-size:10px;color:var(--tx4);text-transform:uppercase;letter-spacing:.06em">Pendentes</div>
    <div style="font-size:20px;font-weight:700;color:${totalPend?"var(--amber)":"var(--tx3)"}">${totalPend}</div>
  </div>
</div>

<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px">
  <div style="display:flex;align-items:center;gap:8px">
    <button onclick="mEscMudarMes(-1)" style="background:none;border:1px solid var(--bd2);border-radius:6px;padding:5px 12px;color:var(--tx2);cursor:pointer;font-size:15px">‹</button>
    <span style="font-size:14px;font-weight:700;color:var(--tx1);min-width:170px;text-align:center">${_mesLbl()}</span>
    <button onclick="mEscMudarMes(1)"  style="background:none;border:1px solid var(--bd2);border-radius:6px;padding:5px 12px;color:var(--tx2);cursor:pointer;font-size:15px">›</button>
  </div>
</div>

<div style="overflow-x:auto">
<table style="border-collapse:collapse;width:100%;font-size:12px">
  <thead>
    <tr style="background:var(--bg-surface)">
      <th style="padding:7px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx4);border:1px solid var(--bd1);width:60px;text-align:center">Data</th>
      ${slotKeys.map(k => `<th style="padding:7px 10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${SLOTS[k].cor};border:1px solid var(--bd1);text-align:left">${SLOTS[k].lbl}</th>`).join("")}
    </tr>
  </thead>
  <tbody>
    ${datas.map(d => {
      const ds  = d.toISOString().slice(0,10);
      const dom = isSun(d);
      return `<tr style="${dom?"background:rgba(74,156,245,.03)":""}">
        <td style="padding:6px 8px;border:1px solid var(--bd1);text-align:center;background:var(--bg-surface);cursor:default">
          <div style="font-size:9px;color:${dom?"var(--sky)":"var(--tx4)"}">${DIAS[d.getDay()]}</div>
          <div style="font-size:13px;font-weight:700;color:${dom?"var(--sky)":"var(--tx2)"}">${d.getDate()}</div>
        </td>
        ${slotKeys.map(k => {
          const key  = `${ds}-${k}`;
          const slot = _escala.get(key);
          const scfg = STATUS_CFG[slot?.status] || STATUS_CFG.PENDENTE;
          return `<td onclick="mEscAbrirSlot('${ds}','${k}')"
            style="padding:8px 10px;border:1px solid var(--bd1);cursor:pointer;vertical-align:top;min-width:130px"
            onmouseover="this.style.background='var(--bg-surface)'"
            onmouseout="this.style.background=''">
            ${slot?.dirigente_nome
              ? `<div style="font-size:12px;font-weight:600;color:var(--tx1);margin-bottom:3px">${_esc(slot.dirigente_nome)}</div>
                 ${slot.equipe ? `<div style="font-size:10px;color:var(--tx3);margin-bottom:3px">${_esc(slot.equipe)}</div>` : ""}
                 <span style="font-size:9px;padding:2px 7px;border-radius:10px;background:${scfg.bg};color:${scfg.cl};font-weight:700">${scfg.lbl}</span>`
              : `<div style="font-size:10px;color:var(--tx4)">+ atribuir</div>`}
          </td>`;
        }).join("")}
      </tr>`;
    }).join("")}
  </tbody>
</table>
</div>`;
  }

  /* ── Modal de edição ─────────────────────────────────────── */

  function _renderModal(dateStr, cultoTipo) {
    document.getElementById("mesc-modal")?.remove();
    const key   = `${dateStr}-${cultoTipo}`;
    const slot  = _escala.get(key);
    const scfg  = SLOTS[cultoTipo];
    const [ano, mes, dia] = dateStr.split("-");
    const inp   = "width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;outline:none;font-family:inherit;box-sizing:border-box";
    const lbl   = "display:block;font-size:9px;font-weight:700;color:var(--tx4);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px";

    const modal = document.createElement("div");
    modal.id    = "mesc-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9990;display:flex;align-items:center;justify-content:center;padding:16px";
    modal.innerHTML = `
<div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;width:420px;max-width:94vw;padding:22px;box-shadow:0 8px 32px rgba(0,0,0,.4)">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div>
      <div style="font-size:11px;color:${scfg?.cor||"var(--sky)"};font-weight:700;text-transform:uppercase;letter-spacing:.06em">${scfg?.lbl||cultoTipo}</div>
      <div style="font-size:14px;font-weight:700;color:var(--tx1)">${dia}/${mes}/${ano}</div>
    </div>
    <button onclick="mEscFechar()" style="background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer;line-height:1">✕</button>
  </div>

  <div style="display:flex;flex-direction:column;gap:12px">
    <div>
      <label style="${lbl}">Dirigente / Líder de Louvor</label>
      <select id="mesc-sel" style="${inp}" onchange="document.getElementById('mesc-nome').value=this.value">
        <option value="">— Selecione da lista —</option>
        ${_musicos.map(m => `<option value="${_esc(m.nome)}" ${slot?.dirigente_nome===m.nome?"selected":""}>${_esc(m.nome)}${m.funcao?" · "+m.funcao:""}</option>`).join("")}
      </select>
      <input id="mesc-nome" style="${inp};margin-top:6px" placeholder="Ou digite o nome livremente"
        value="${_esc(slot?.dirigente_nome||"")}"
        oninput="document.getElementById('mesc-sel').value=''">
    </div>
    <div>
      <label style="${lbl}">Equipe / Grupo</label>
      <input id="mesc-equipe" style="${inp}" value="${_esc(slot?.equipe||"")}" placeholder="Ex: Equipe A, Coral, Banda">
    </div>
    <div>
      <label style="${lbl}">Status</label>
      <select id="mesc-status" style="${inp}">
        ${Object.entries(STATUS_CFG).map(([k,v]) => `<option value="${k}" ${(slot?.status||"PENDENTE")===k?"selected":""}>${v.lbl}</option>`).join("")}
      </select>
    </div>
    <div>
      <label style="${lbl}">Observações</label>
      <input id="mesc-obs" style="${inp}" value="${_esc(slot?.obs||"")}" placeholder="Obs. internas">
    </div>
  </div>

  <div id="mesc-msg" style="font-size:11px;min-height:14px;margin-top:8px"></div>

  <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
    <button onclick="mEscSalvar('${dateStr}','${cultoTipo}')"
      style="flex:1;padding:9px;border-radius:7px;border:none;background:var(--violet);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">Salvar</button>
    ${slot?.id ? `<button onclick="mEscLimpar('${dateStr}','${cultoTipo}')"
      style="padding:9px 14px;border-radius:7px;border:1px solid var(--bd2);background:none;color:var(--rose);font-size:12px;cursor:pointer">Limpar</button>` : ""}
    <button onclick="mEscFechar()"
      style="padding:9px 14px;border-radius:7px;border:1px solid var(--bd2);background:none;color:var(--tx2);font-size:12px;cursor:pointer">Cancelar</button>
  </div>
</div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", e => { if (e.target === modal) mEscFechar(); });
  }

  /* ── Window functions ────────────────────────────────────── */

  window.mEscAbrirSlot = function(dateStr, cultoTipo) {
    _editKey = `${dateStr}-${cultoTipo}`;
    _renderModal(dateStr, cultoTipo);
  };

  window.mEscFechar = function() {
    document.getElementById("mesc-modal")?.remove();
    _editKey = null;
  };

  window.mEscSalvar = async function(dateStr, cultoTipo) {
    const nome   = (document.getElementById("mesc-nome")?.value?.trim() || document.getElementById("mesc-sel")?.value || "");
    const equipe = document.getElementById("mesc-equipe")?.value?.trim() || null;
    const obs    = document.getElementById("mesc-obs")?.value?.trim()    || null;
    const status = document.getElementById("mesc-status")?.value          || "PENDENTE";
    const msg    = document.getElementById("mesc-msg");
    if (msg) { msg.textContent = "Salvando…"; msg.style.color = "var(--tx3)"; }
    try {
      await _upsert(dateStr, cultoTipo, { dirigente_nome: nome || null, equipe, obs, status });
      mEscFechar();
      _render();
      if (typeof T === "function") T("Escala salva", nome || "sem dirigente");
    } catch(e) {
      if (msg) { msg.textContent = "Erro: " + e.message; msg.style.color = "var(--rose)"; }
    }
  };

  window.mEscLimpar = async function(dateStr, cultoTipo) {
    if (!confirm("Limpar este slot?")) return;
    const key = `${dateStr}-${cultoTipo}`;
    const it  = _escala.get(key);
    if (!it?.id) return;
    await fetch(`${_api()}/rest/v1/escala_musica?id=eq.${it.id}`, { method: "DELETE", headers: _hdrs() });
    _escala.delete(key);
    mEscFechar();
    _render();
  };

  window.mEscMudarMes = async function(delta) {
    _mes.setMonth(_mes.getMonth() + delta);
    const el = _root();
    if (el) el.innerHTML = `<div style="padding:32px;text-align:center;color:var(--tx3)">Carregando ${_mesLbl()}…</div>`;
    await _loadEscala();
    _render();
  };

  window.mEscLoad = async function() {
    const el = _root();
    if (!el) return;
    el.innerHTML = `<div style="padding:32px;text-align:center;color:var(--tx3)">Carregando escala de música…</div>`;
    try {
      await Promise.all([_loadMusicos(), _loadEscala()]);
      _render();
    } catch(e) {
      if (el) el.innerHTML = `<div style="padding:20px;color:var(--rose);font-size:12px">Erro: ${_esc(e.message)}</div>`;
    }
  };

  document.addEventListener("sipen:navigate", function(e) {
    if (e.detail?.id === "min-esc") mEscLoad();
  });

})();
