/* ═══════════════════════════════════════════════════════════════
   SIPEN — Grade de Escalas Diaconais  v1.0
   Grid mensal: datas × programações · diáconos por posto
═══════════════════════════════════════════════════════════════ */
(function () {

  const SLOTS = [
    { prog: "Culto Matinal",    cor: "#4a9cf5" },
    { prog: "Culto Vespertino", cor: "#8b6fd4" },
    { prog: "Conexão com Deus", cor: "#2ab5c0" },
    { prog: "SOS - Jovens",     cor: "#e08a2a" },
  ];

  const POSTOS = [
    "Hall / Templo",
    "Galeria / Ronda",
    "Estacionamento (Igreja)",
    "Estacionamento (Rua)",
    "Recepção",
    "Outro",
  ];

  const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  let _mes        = (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; })();
  let _diaconos   = [];
  let _escala     = [];
  let _activeSlot = null;

  function _api()   { return typeof apiBaseUrl  === "function" ? apiBaseUrl()  : ""; }
  function _hdrs(x) { return typeof apiHeaders  === "function" ? apiHeaders(x || {}) : {}; }
  function _esc(s)  { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function _root()  { return document.getElementById("diac-grid-root"); }
  function _mesRef(){ return `${_mes.getFullYear()}-${String(_mes.getMonth()+1).padStart(2,"0")}`; }
  function _mesLbl(){ return `${MESES_PT[_mes.getMonth()]} ${_mes.getFullYear()}`; }

  /* ── Dados ───────────────────────────────────────────────── */

  async function _loadDiaconos() {
    if (_diaconos.length) return;
    const r = await fetch(
      `${_api()}/rest/v1/v_oficiais?select=id,pessoa_id,nome&cargo=eq.diacono&status=in.(ativo,especial)&order=nome.asc&limit=300`,
      { headers: _hdrs() }
    );
    _diaconos = r.ok ? await r.json() : [];
  }

  async function _loadEscala() {
    const r = await fetch(
      `${_api()}/rest/v1/v_escala_diaconal?mes_ref=eq.${_mesRef()}&order=data.asc,programacao.asc,posto.asc&limit=1000`,
      { headers: _hdrs() }
    );
    _escala = r.ok ? await r.json() : [];
  }

  /* ── Datas do mês ────────────────────────────────────────── */

  function _datasDoMes() {
    const out = [];
    const d   = new Date(_mes);
    while (d.getMonth() === _mes.getMonth()) { out.push(new Date(d)); d.setDate(d.getDate()+1); }
    return out;
  }

  /* ── Render ──────────────────────────────────────────────── */

  function _render() {
    const el = _root();
    if (!el) return;
    const datas  = _datasDoMes();
    const DIAS   = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
    const isSun  = d => d.getDay() === 0;
    const slotIt = (ds, prog) => _escala.filter(i => i.data === ds && i.programacao === prog);

    const totalSlots = datas.filter(isSun).length * SLOTS.length;
    const preenchidos = new Set(_escala.filter(i=>i.diacono).map(i=>`${i.data}-${i.programacao}`)).size;

    el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
  <div style="display:flex;align-items:center;gap:8px">
    <button onclick="degGridMudarMes(-1)" style="background:none;border:1px solid var(--bd2);border-radius:6px;padding:5px 12px;color:var(--tx2);cursor:pointer;font-size:15px">‹</button>
    <span style="font-size:14px;font-weight:700;color:var(--tx1);min-width:170px;text-align:center">${_mesLbl()}</span>
    <button onclick="degGridMudarMes(1)"  style="background:none;border:1px solid var(--bd2);border-radius:6px;padding:5px 12px;color:var(--tx2);cursor:pointer;font-size:15px">›</button>
  </div>
  <div style="font-size:11px;color:var(--tx3)">${preenchidos} de ${totalSlots} cultos com diáconos</div>
</div>

<div style="overflow-x:auto">
<table style="border-collapse:collapse;width:100%;font-size:12px;table-layout:fixed">
  <colgroup>
    <col style="width:60px">
    ${SLOTS.map(() => `<col style="min-width:140px">`).join("")}
  </colgroup>
  <thead>
    <tr style="background:var(--bg-surface)">
      <th style="padding:7px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx4);border:1px solid var(--bd1);text-align:center">Data</th>
      ${SLOTS.map(s => `<th style="padding:7px 10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${s.cor};border:1px solid var(--bd1);text-align:left">${_esc(s.prog)}</th>`).join("")}
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
        ${SLOTS.map(s => {
          const its    = slotIt(ds, s.prog);
          const active = _activeSlot?.dataStr === ds && _activeSlot?.prog === s.prog;
          return `<td onclick="degGridAbrirSlot('${ds}','${_esc(s.prog)}')"
            style="padding:6px 8px;border:1px solid var(--bd1);cursor:pointer;vertical-align:top;${active ? `background:${s.cor}14;outline:2px solid ${s.cor};outline-offset:-1px` : ""}"
            onmouseover="if(!${active}) this.style.background='var(--bg-surface)'"
            onmouseout="this.style.background='${active ? s.cor+"14" : ""}'">
            ${its.length
              ? its.map(i => `<div style="font-size:10px;padding:2px 7px;margin:1px 0;border-radius:10px;background:${s.cor}1a;color:${s.cor};overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_esc(i.diacono||"")} — ${_esc(i.posto||"")}">${_esc(i.diacono||"—")}</div>`).join("")
              : `<div style="font-size:10px;color:var(--tx4);padding:2px 4px">Vazio</div>`}
          </td>`;
        }).join("")}
      </tr>`;
    }).join("")}
  </tbody>
</table>
</div>

<div id="deg-painel" style="margin-top:14px"></div>`;

    if (_activeSlot) _renderPainel(_activeSlot.dataStr, _activeSlot.prog);
  }

  function _renderPainel(dataStr, prog) {
    const el   = document.getElementById("deg-painel");
    if (!el) return;
    const slot = SLOTS.find(s => s.prog === prog);
    const its  = _escala.filter(i => i.data === dataStr && i.programacao === prog);
    const [ano, mes, dia] = dataStr.split("-");

    el.innerHTML = `
<div style="border:1.5px solid ${slot?.cor||"var(--bd2)"};border-radius:10px;overflow:hidden">
  <div style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;background:${slot?.cor||"var(--sky)"}18">
    <div style="font-size:12.5px;font-weight:700;color:${slot?.cor||"var(--sky)"}">
      ${dia}/${mes}/${ano} — ${_esc(prog)}
    </div>
    <button onclick="degGridFecharPainel()" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer">✕</button>
  </div>
  <div style="padding:14px 16px;background:var(--bg-card)">
    ${its.length ? `
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
      ${its.map(i => `
      <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:7px;background:var(--bg-surface);border:1px solid var(--bd1)">
        <div style="flex:1">
          <div style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(i.diacono||"—")}</div>
          <div style="font-size:10.5px;color:var(--tx3)">${_esc(i.posto||"")}${i.horario_chegada ? " · " + i.horario_chegada.slice(0,5) : ""}</div>
        </div>
        <button onclick="degGridRemover('${i.id}')"
          style="background:none;border:1px solid var(--bd2);border-radius:5px;padding:4px 9px;font-size:11px;color:var(--rose);cursor:pointer">✕</button>
      </div>`).join("")}
    </div>` : `<div style="text-align:center;padding:16px 0;font-size:12px;color:var(--tx4);margin-bottom:12px">Nenhum diácono escalado.</div>`}
    <div id="deg-form-area">
      ${_btnAddDiac(dataStr, prog)}
    </div>
  </div>
</div>`;
  }

  function _btnAddDiac(ds, prog) {
    return `<button onclick="degGridMostrarForm('${ds}','${_esc(prog)}')"
      style="width:100%;padding:8px;border-radius:6px;border:1.5px dashed var(--bd2);background:none;color:var(--tx2);font-size:11.5px;cursor:pointer;text-align:center">
      + Adicionar diácono
    </button>`;
  }

  window.degGridMostrarForm = function(ds, prog) {
    const el = document.getElementById("deg-form-area");
    if (!el) return;
    const inp = "padding:7px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px;outline:none;font-family:inherit;width:100%;box-sizing:border-box";
    el.innerHTML = `
<div style="border:1px solid var(--bd2);border-radius:8px;padding:12px;background:var(--bg-surface);display:flex;flex-direction:column;gap:8px">
  <div>
    <div style="font-size:9px;font-weight:700;color:var(--tx4);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Diácono</div>
    <select id="deg-sel-diac" style="${inp}">
      <option value="">— Selecione —</option>
      ${_diaconos.map(d => `<option value="${_esc(d.nome)}">${_esc(d.nome)}</option>`).join("")}
    </select>
  </div>
  <div>
    <div style="font-size:9px;font-weight:700;color:var(--tx4);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Posto</div>
    <select id="deg-sel-posto" style="${inp}">
      <option value="">— Selecione —</option>
      ${POSTOS.map(p => `<option value="${_esc(p)}">${_esc(p)}</option>`).join("")}
    </select>
  </div>
  <div>
    <div style="font-size:9px;font-weight:700;color:var(--tx4);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Horário de chegada</div>
    <input id="deg-inp-hr" type="time" style="${inp}">
  </div>
  <div id="deg-form-msg" style="font-size:11px;min-height:14px"></div>
  <div style="display:flex;gap:8px">
    <button onclick="degGridAdicionarDiacono('${ds}','${_esc(prog)}')"
      style="flex:1;padding:8px;border-radius:6px;border:none;background:#B87A56;color:#fff;font-size:12px;font-weight:700;cursor:pointer">Salvar</button>
    <button onclick="degGridFecharForm('${ds}','${_esc(prog)}')"
      style="padding:8px 14px;border-radius:6px;border:1px solid var(--bd2);background:none;color:var(--tx2);font-size:12px;cursor:pointer">Cancelar</button>
  </div>
</div>`;
  };

  window.degGridFecharForm = function(ds, prog) {
    const el = document.getElementById("deg-form-area");
    if (el) el.innerHTML = _btnAddDiac(ds, prog);
  };

  window.degGridAdicionarDiacono = async function(ds, prog) {
    const nome  = document.getElementById("deg-sel-diac")?.value?.trim();
    const posto = document.getElementById("deg-sel-posto")?.value?.trim();
    const hr    = document.getElementById("deg-inp-hr")?.value || null;
    const msg   = document.getElementById("deg-form-msg");
    if (!nome)  { if(msg){msg.textContent="Selecione um diácono."; msg.style.color="var(--rose)";}  return; }
    if (!posto) { if(msg){msg.textContent="Selecione um posto.";   msg.style.color="var(--rose)";}  return; }
    if (msg) { msg.textContent="Salvando…"; msg.style.color="var(--tx3)"; }
    try {
      const ref = ds.slice(0,7);
      const r   = await fetch(`${_api()}/rest/v1/escala_diaconal`, {
        method: "POST",
        headers: _hdrs({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
        body: JSON.stringify({ mes_ref: ref, data: ds, programacao: prog, posto, diacono_nome: nome, horario_chegada: hr, ordem: 0 }),
      });
      if (!r.ok) throw new Error(await r.text());
      await _loadEscala();
      _render();
      if (typeof T === "function") T("Diácono adicionado", `${nome} — ${posto}`);
    } catch(e) {
      if (msg) { msg.textContent = "Erro: " + e.message; msg.style.color = "var(--rose)"; }
    }
  };

  window.degGridRemover = async function(id) {
    if (!confirm("Remover este diácono da escala?")) return;
    await fetch(`${_api()}/rest/v1/escala_diaconal?id=eq.${id}`, { method: "DELETE", headers: _hdrs() });
    await _loadEscala();
    _render();
  };

  window.degGridAbrirSlot = function(ds, prog) {
    _activeSlot = (_activeSlot?.dataStr === ds && _activeSlot?.prog === prog) ? null : { dataStr: ds, prog };
    _render();
  };

  window.degGridFecharPainel = function() {
    _activeSlot = null;
    _render();
  };

  window.degGridMudarMes = async function(delta) {
    _mes.setMonth(_mes.getMonth() + delta);
    _activeSlot = null;
    const el = _root();
    if (el) el.innerHTML = `<div style="padding:32px;text-align:center;color:var(--tx3)">Carregando ${_mesLbl()}…</div>`;
    await _loadEscala();
    _render();
  };

  window.degGridLoad = async function() {
    const el = _root();
    if (!el) return;
    el.innerHTML = `<div style="padding:32px;text-align:center;color:var(--tx3)">Carregando escala…</div>`;
    try {
      await Promise.all([_loadDiaconos(), _loadEscala()]);
      _render();
    } catch(e) {
      if (el) el.innerHTML = `<div style="padding:20px;color:var(--rose);font-size:12px">Erro: ${_esc(e.message)}</div>`;
    }
  };

  window.diacEscModo = function(modo) {
    const grid  = document.getElementById("diac-grid-root");
    const lista = document.getElementById("diac-esc-content");
    const btnG  = document.getElementById("diac-esc-btn-grid");
    const btnL  = document.getElementById("diac-esc-btn-lista");
    if (!grid || !lista) return;
    const atv   = "font-size:11px;padding:5px 12px;border-radius:6px;border:1px solid var(--sky);background:var(--sky);color:#fff;cursor:pointer;font-weight:700";
    const inativ = "font-size:11px;padding:5px 12px;border-radius:6px;border:1px solid var(--bd2);background:none;color:var(--tx2);cursor:pointer";
    if (modo === "grid") {
      grid.style.display  = "";
      lista.style.display = "none";
      if (btnG) btnG.style.cssText = atv;
      if (btnL) btnL.style.cssText = inativ;
      if (!grid.innerHTML.trim()) degGridLoad();
    } else {
      grid.style.display  = "none";
      lista.style.display = "";
      if (btnG) btnG.style.cssText = inativ;
      if (btnL) btnL.style.cssText = atv;
      if (typeof diacEscalaLoad === "function") diacEscalaLoad();
    }
  };

  document.addEventListener("sipen:navigate", function(e) {
    if (e.detail?.id === "diac-escalas") {
      degGridLoad();
      const btnG = document.getElementById("diac-esc-btn-grid");
      if (btnG) btnG.click();
    }
  });

})();
