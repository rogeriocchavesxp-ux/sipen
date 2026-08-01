/* ═══════════════════════════════════════════════════════
   SIPEN — Módulo Ofertas Especiais
   ofertas-especiais.js · v1.0.0
   Campanhas · Contribuições · Conciliação · Relatórios
═══════════════════════════════════════════════════════ */

(function () {

  /* ── ESTADO ───────────────────────────────────────────── */

  let _campanhas    = null;
  let _contribuicoes = null;

  /* ── HELPERS ─────────────────────────────────────────── */

  function brl(v) {
    return "R$ " + Number(v || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  function fmtD(d) {
    if (!d) return "—";
    const s = (d.split("T")[0] || d).split("-");
    return `${s[2]}/${s[1]}/${s[0]}`;
  }

  function hoje() {
    return new Date().toISOString().split("T")[0];
  }

  function _sb() {
    return typeof getSupabase === "function" ? getSupabase() : null;
  }

  function _loading(el) {
    el.innerHTML = `<div style="padding:12px 0;color:var(--tx3);font-size:11.5px">
      <span style="display:inline-block;width:11px;height:11px;border:2px solid var(--violet);border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;vertical-align:middle;margin-right:6px"></span>
      Carregando...</div>`;
  }

  const STATUS_CFG = {
    rascunho:             { label: "Rascunho",             cor: "var(--tx3)",     bg: "rgba(90,96,104,.12)" },
    aguardando_aprovacao: { label: "Aguardando Aprovação", cor: "var(--gold)",    bg: "rgba(212,168,67,.12)" },
    aprovada:             { label: "Aprovada",              cor: "var(--teal)",    bg: "rgba(57,170,167,.12)" },
    publicada:            { label: "Publicada",             cor: "var(--blue)",    bg: "rgba(74,156,245,.12)" },
    em_andamento:         { label: "Em Andamento",          cor: "var(--violet)",  bg: "rgba(139,111,212,.12)" },
    meta_atingida:        { label: "Meta Atingida",         cor: "var(--gr)",      bg: "rgba(58,170,92,.12)" },
    encerrada:            { label: "Encerrada",             cor: "var(--tx2)",     bg: "rgba(90,96,104,.12)" },
    suspensa:             { label: "Suspensa",              cor: "var(--amber)",   bg: "rgba(224,138,42,.12)" },
    cancelada:            { label: "Cancelada",             cor: "var(--rose)",    bg: "rgba(224,85,85,.12)" },
  };

  const CONCIL_CFG = {
    aguardando:     { label: "Aguardando",      cor: "var(--gold)"   },
    confirmada:     { label: "Confirmada",      cor: "var(--gr)"     },
    divergente:     { label: "Divergente",      cor: "var(--rose)"   },
    nao_localizada: { label: "Não localizada",  cor: "var(--amber)"  },
    cancelada:      { label: "Cancelada",       cor: "var(--tx3)"    },
  };

  const FORMA_LABEL = {
    pix: "PIX", transferencia: "Transferência", dinheiro: "Dinheiro",
    cartao: "Cartão", boleto: "Boleto", manual: "Manual", outro: "Outro"
  };

  function _pillStatus(st) {
    const c = STATUS_CFG[st] || { label: st, cor: "var(--tx3)", bg: "rgba(90,96,104,.12)" };
    return `<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;background:${c.bg};color:${c.cor}">${c.label}</span>`;
  }

  function _pillConcil(st) {
    const c = CONCIL_CFG[st] || { label: st, cor: "var(--tx3)" };
    return `<span style="font-size:10px;font-weight:600;color:${c.cor}">${c.label}</span>`;
  }

  function _pct(arrecadado, meta) {
    if (!meta || meta <= 0) return null;
    return Math.min(Math.round((arrecadado / meta) * 100), 100);
  }

  /* ── CARREGAMENTO ─────────────────────────────────────── */

  async function _loadCampanhas(force) {
    if (_campanhas !== null && !force) return;
    try {
      const sb = _sb();
      const { data, error } = await sb
        .from("ofertas_especiais")
        .select("id,titulo,status,meta,sem_meta,valor_inicial,data_inicio,data_fim,sem_data_fim,publica,categoria,departamento,codigo_campanha,criado_em")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      _campanhas = data || [];

      // Agrega arrecadado por campanha
      const ids = _campanhas.map(c => c.id);
      if (ids.length) {
        const { data: totais } = await sb
          .from("oe_contribuicoes")
          .select("campanha_id,valor")
          .in("campanha_id", ids)
          .eq("status_conciliacao", "confirmada");
        const map = {};
        (totais || []).forEach(r => {
          map[r.campanha_id] = (map[r.campanha_id] || 0) + Number(r.valor || 0);
        });
        _campanhas = _campanhas.map(c => ({
          ...c,
          arrecadado: (map[c.id] || 0) + Number(c.valor_inicial || 0)
        }));
      }
    } catch (e) {
      console.error("[oe] Erro ao carregar campanhas:", e);
      _campanhas = [];
    }
  }

  async function _loadContribuicoes(force) {
    if (_contribuicoes !== null && !force) return;
    try {
      const sb = _sb();
      const { data, error } = await sb
        .from("oe_contribuicoes")
        .select("id,campanha_id,data,valor,forma,nome_contribuinte,anonimo,status_conciliacao,origem,obs,criado_em,ofertas_especiais(titulo)")
        .order("data", { ascending: false });
      if (error) throw error;
      _contribuicoes = data || [];
    } catch (e) {
      console.error("[oe] Erro ao carregar contribuições:", e);
      _contribuicoes = [];
    }
  }

  /* ── VIEW: DASHBOARD ──────────────────────────────────── */

  async function renderOeDash() {
    const el = document.getElementById("fin-oe-dash-content");
    if (!el) return;
    _loading(el);
    await _loadCampanhas();

    const ativas    = _campanhas.filter(c => ["publicada","em_andamento"].includes(c.status));
    const encerradas = _campanhas.filter(c => ["encerrada","meta_atingida"].includes(c.status));
    const pendentes  = _campanhas.filter(c => ["rascunho","aguardando_aprovacao","aprovada"].includes(c.status));
    const totArrecadado = ativas.reduce((s, c) => s + (c.arrecadado || 0), 0);
    const totMeta = ativas.filter(c => !c.sem_meta).reduce((s, c) => s + Number(c.meta || 0), 0);

    const recentes = [..._campanhas].slice(0, 6);

    el.innerHTML = `
      <div class="kpis" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;background:var(--bg-card);border:1px solid var(--bd1);border-radius:var(--rl);overflow:hidden;margin-bottom:18px">
        <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
          <div class="kpi-ico" style="background:rgba(139,111,212,.12);color:var(--violet)">◎</div>
          <div class="kpi-body"><div class="kpi-lbl">Em andamento</div><div class="kpi-val">${ativas.length}</div><div class="kpi-d nu">campanhas ativas</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
          <div class="kpi-ico" style="background:rgba(58,170,92,.12);color:var(--gr)">↑</div>
          <div class="kpi-body"><div class="kpi-lbl">Arrecadado (ativas)</div><div class="kpi-val" style="font-size:15px">${brl(totArrecadado)}</div><div class="kpi-d ${totMeta ? "up" : "nu"}">${totMeta ? "de " + brl(totMeta) + " de meta" : "sem meta definida"}</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
          <div class="kpi-ico" style="background:rgba(212,168,67,.12);color:var(--gold)">◻</div>
          <div class="kpi-body"><div class="kpi-lbl">Aguardando</div><div class="kpi-val">${pendentes.length}</div><div class="kpi-d nu">aprovação ou publicação</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none">
          <div class="kpi-ico" style="background:rgba(90,96,104,.12);color:var(--tx2)">✓</div>
          <div class="kpi-body"><div class="kpi-lbl">Encerradas</div><div class="kpi-val">${encerradas.length}</div><div class="kpi-d nu">total histórico</div></div>
        </div>
      </div>

      <div class="g2">
        <div class="card">
          <div class="ctit">Campanhas recentes
            <span class="cact" onclick="go('fin-oe-campanhas')">Ver todas →</span>
            <span class="cact" style="margin-left:8px" onclick="oeRecarregar()">↻</span>
          </div>
          ${recentes.length === 0
            ? '<div class="empty-state">Nenhuma campanha cadastrada.</div>'
            : recentes.map(c => _campCard(c)).join("")}
        </div>

        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card">
            <div class="ctit">Ações rápidas</div>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px">
              <button class="tbt pri" onclick="oeAbrirFormCampanha()" style="width:100%;justify-content:center">+ Nova campanha</button>
              <button class="tbt" onclick="go('fin-oe-contribuicoes')" style="width:100%;justify-content:center">Registrar contribuição</button>
              <button class="tbt" onclick="go('fin-oe-conciliacao')" style="width:100%;justify-content:center">Conciliar pendências</button>
            </div>
          </div>
          ${ativas.length > 0 ? `
          <div class="card">
            <div class="ctit">Progresso das ativas</div>
            ${ativas.map(c => {
              const pct = _pct(c.arrecadado, c.meta);
              return `
              <div style="margin-bottom:12px;cursor:pointer" onclick="oeAbrirCampanha('${c.id}')">
                <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px">
                  <span style="color:var(--tx1);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%">${escapeHtml(c.titulo)}</span>
                  <span style="color:var(--tx3);font-size:10.5px">${brl(c.arrecadado)}${pct !== null ? ` · ${pct}%` : ""}</span>
                </div>
                ${pct !== null ? `
                <div style="height:6px;border-radius:3px;background:var(--bd1)">
                  <div style="height:6px;border-radius:3px;background:${pct >= 100 ? "var(--gr)" : "var(--violet)"};width:${pct}%;transition:width .3s"></div>
                </div>` : `<div style="font-size:10px;color:var(--tx3)">Sem meta definida</div>`}
              </div>`;
            }).join("")}
          </div>` : ""}
        </div>
      </div>`;
  }

  function _campCard(c) {
    const pct = _pct(c.arrecadado, c.meta);
    return `
    <div onclick="oeAbrirCampanha('${c.id}')"
         style="cursor:pointer;border-bottom:1px solid var(--bd1);padding:10px 0"
         onmouseover="this.style.background='var(--bg-hover)'"
         onmouseout="this.style.background=''">
      <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;margin-bottom:4px">
        <span style="font-size:12.5px;font-weight:600;color:var(--tx1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c.titulo)}</span>
        ${_pillStatus(c.status)}
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--tx3)">${brl(c.arrecadado)} arrecadado</span>
        ${!c.sem_meta && c.meta ? `<span style="font-size:11px;color:var(--tx3)">de ${brl(c.meta)}</span>` : ""}
        ${c.data_fim && !c.sem_data_fim ? `<span style="font-size:11px;color:var(--tx3)">até ${fmtD(c.data_fim)}</span>` : ""}
        ${pct !== null ? `<span style="font-size:10.5px;font-weight:700;color:var(--violet);margin-left:auto">${pct}%</span>` : ""}
      </div>
    </div>`;
  }

  /* ── VIEW: CAMPANHAS CRUD ─────────────────────────────── */

  async function renderOeCampanhas() {
    const el = document.getElementById("fin-oe-campanhas-content");
    if (!el) return;
    _loading(el);
    await _loadCampanhas();

    const fbusca  = (document.getElementById("oe-c-fbusca")?.value  || "").toLowerCase();
    const fstatus = document.getElementById("oe-c-fstatus")?.value || "";

    let rows = [..._campanhas];
    if (fstatus) rows = rows.filter(c => c.status === fstatus);
    if (fbusca)  rows = rows.filter(c =>
      (c.titulo       || "").toLowerCase().includes(fbusca) ||
      (c.categoria    || "").toLowerCase().includes(fbusca) ||
      (c.departamento || "").toLowerCase().includes(fbusca)
    );

    el.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
        <button class="tbt pri" onclick="oeAbrirFormCampanha()">+ Nova campanha</button>
        <select id="oe-c-fstatus" onchange="oeFiltraCampanhas()" style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:6px 10px;outline:none">
          <option value="">Todos os status</option>
          ${Object.entries(STATUS_CFG).map(([k, v]) => `<option value="${k}" ${fstatus===k?"selected":""}>${v.label}</option>`).join("")}
        </select>
        <input id="oe-c-fbusca" type="text" placeholder="Buscar título, categoria..." oninput="oeFiltraCampanhas()"
               value="${escapeHtmlAttr(fbusca)}"
               style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:6px 10px;outline:none;min-width:200px">
        <span style="font-size:11px;color:var(--tx3);margin-left:auto">${rows.length} campanha${rows.length !== 1 ? "s" : ""}</span>
      </div>

      <div class="card" style="padding:0;overflow:hidden">
        ${rows.length === 0
          ? '<div class="empty-state" style="padding:24px">Nenhuma campanha encontrada.</div>'
          : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr style="border-bottom:1px solid var(--bd2)">
                ${["Título","Categoria","Status","Arrecadado","Meta","Início","Fim",""].map((h,i) =>
                  `<th style="text-align:${i>=3&&i<=5?"right":"left"};padding:9px 12px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`
                ).join("")}
              </tr></thead>
              <tbody>
                ${rows.map(c => {
                  const pct = _pct(c.arrecadado, c.meta);
                  return `
                  <tr style="border-bottom:1px solid var(--bd1);cursor:pointer"
                      onmouseover="this.style.background='var(--bg-hover)'"
                      onmouseout="this.style.background=''"
                      onclick="oeAbrirCampanha('${c.id}')">
                    <td style="padding:9px 12px;color:var(--tx1);font-weight:600;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c.titulo)}</td>
                    <td style="padding:9px 12px;color:var(--tx2)">${escapeHtml(c.categoria || "—")}</td>
                    <td style="padding:9px 12px">${_pillStatus(c.status)}</td>
                    <td style="padding:9px 12px;text-align:right;color:var(--gr);font-weight:600">${brl(c.arrecadado)}</td>
                    <td style="padding:9px 12px;text-align:right;color:var(--tx2)">${c.sem_meta ? "—" : brl(c.meta)}</td>
                    <td style="padding:9px 12px;text-align:right;color:var(--tx2);white-space:nowrap">${fmtD(c.data_inicio)}</td>
                    <td style="padding:9px 12px;text-align:right;color:var(--tx2);white-space:nowrap">${c.sem_data_fim ? "Aberta" : fmtD(c.data_fim)}</td>
                    <td style="padding:9px 12px">
                      <div style="display:flex;gap:6px" onclick="event.stopPropagation()">
                        <button class="tbt" onclick="oeAbrirFormCampanha('${c.id}')" style="font-size:10.5px;padding:3px 8px">Editar</button>
                        <button class="tbt" onclick="oeAlterarStatus('${c.id}','${c.status}')" style="font-size:10.5px;padding:3px 8px">Status</button>
                      </div>
                    </td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table></div>`
        }
      </div>`;
  }

  /* ── VIEW: CONTRIBUIÇÕES ──────────────────────────────── */

  async function renderOeContrib() {
    const el = document.getElementById("fin-oe-contrib-content");
    if (!el) return;
    _loading(el);
    await Promise.all([_loadCampanhas(), _loadContribuicoes()]);

    const fcampanha = document.getElementById("oe-v-fcampanha")?.value || "";
    const fforma    = document.getElementById("oe-v-fforma")?.value    || "";
    const fconcil   = document.getElementById("oe-v-fconcil")?.value   || "";

    let rows = [..._contribuicoes];
    if (fcampanha) rows = rows.filter(r => r.campanha_id === fcampanha);
    if (fforma)    rows = rows.filter(r => r.forma === fforma);
    if (fconcil)   rows = rows.filter(r => r.status_conciliacao === fconcil);

    const total = rows.reduce((s, r) => s + Number(r.valor || 0), 0);
    const confirmadas = rows.filter(r => r.status_conciliacao === "confirmada").reduce((s, r) => s + Number(r.valor || 0), 0);

    el.innerHTML = `
      <div class="kpis" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;background:var(--bg-card);border:1px solid var(--bd1);border-radius:var(--rl);overflow:hidden;margin-bottom:18px">
        <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
          <div class="kpi-ico" style="background:rgba(58,170,92,.12);color:var(--gr)">↑</div>
          <div class="kpi-body"><div class="kpi-lbl">Total (filtro)</div><div class="kpi-val" style="font-size:15px">${brl(total)}</div><div class="kpi-d nu">${rows.length} contribuições</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
          <div class="kpi-ico" style="background:rgba(58,170,92,.12);color:var(--gr)">✓</div>
          <div class="kpi-body"><div class="kpi-lbl">Confirmadas</div><div class="kpi-val" style="font-size:15px">${brl(confirmadas)}</div><div class="kpi-d up">${rows.filter(r => r.status_conciliacao==="confirmada").length} registros</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none">
          <div class="kpi-ico" style="background:rgba(212,168,67,.12);color:var(--gold)">⏳</div>
          <div class="kpi-body"><div class="kpi-lbl">Aguardando</div><div class="kpi-val">${rows.filter(r => r.status_conciliacao==="aguardando").length}</div><div class="kpi-d wa">para conciliar</div></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:2px">
          <button class="tbt pri" onclick="oeAbrirFormContrib()">+ Registrar contribuição</button>
          <select id="oe-v-fcampanha" onchange="oeFiltrarContrib()"
                  style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:6px 10px;outline:none;max-width:200px">
            <option value="">Todas as campanhas</option>
            ${_campanhas.map(c => `<option value="${c.id}" ${fcampanha===c.id?"selected":""}>${escapeHtml(c.titulo)}</option>`).join("")}
          </select>
          <select id="oe-v-fforma" onchange="oeFiltrarContrib()"
                  style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:6px 10px;outline:none">
            <option value="">Todas as formas</option>
            ${Object.entries(FORMA_LABEL).map(([k,v]) => `<option value="${k}" ${fforma===k?"selected":""}>${v}</option>`).join("")}
          </select>
          <select id="oe-v-fconcil" onchange="oeFiltrarContrib()"
                  style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:6px 10px;outline:none">
            <option value="">Todos os status</option>
            ${Object.entries(CONCIL_CFG).map(([k,v]) => `<option value="${k}" ${fconcil===k?"selected":""}>${v.label}</option>`).join("")}
          </select>
          <span style="font-size:11px;color:var(--tx3);margin-left:auto">${rows.length} registro${rows.length!==1?"s":""}</span>
        </div>
      </div>

      <div class="card" style="padding:0;overflow:hidden">
        ${rows.length === 0
          ? '<div class="empty-state" style="padding:24px">Nenhuma contribuição encontrada.</div>'
          : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr style="border-bottom:1px solid var(--bd2)">
                ${["Data","Campanha","Contribuinte","Valor","Forma","Origem","Conciliação",""].map((h,i) =>
                  `<th style="text-align:${i===3?"right":"left"};padding:9px 12px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`
                ).join("")}
              </tr></thead>
              <tbody>
                ${rows.map(r => `
                <tr style="border-bottom:1px solid var(--bd1)">
                  <td style="padding:9px 12px;color:var(--tx2);white-space:nowrap">${fmtD(r.data)}</td>
                  <td style="padding:9px 12px;color:var(--tx1);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.ofertas_especiais?.titulo || "—")}</td>
                  <td style="padding:9px 12px;color:var(--tx2)">${r.anonimo ? '<em style="color:var(--tx3)">Anônimo</em>' : escapeHtml(r.nome_contribuinte || "—")}</td>
                  <td style="padding:9px 12px;text-align:right;font-weight:700;color:var(--gr)">${brl(r.valor)}</td>
                  <td style="padding:9px 12px;color:var(--tx2);white-space:nowrap">${FORMA_LABEL[r.forma] || r.forma}</td>
                  <td style="padding:9px 12px;color:var(--tx2)">${r.origem === "publico" ? "Público" : "Interno"}</td>
                  <td style="padding:9px 12px">${_pillConcil(r.status_conciliacao)}</td>
                  <td style="padding:9px 12px">
                    ${r.status_conciliacao === "aguardando"
                      ? `<button class="tbt" onclick="oeConfirmarContrib('${r.id}')" style="font-size:10.5px;padding:3px 8px">Confirmar</button>`
                      : ""}
                  </td>
                </tr>`).join("")}
              </tbody>
            </table></div>`
        }
      </div>`;
  }

  /* ── VIEW: CONCILIAÇÃO ────────────────────────────────── */

  async function renderOeConcil() {
    const el = document.getElementById("fin-oe-concil-content");
    if (!el) return;
    _loading(el);
    await _loadContribuicoes();

    const pendentes = _contribuicoes.filter(r => r.status_conciliacao === "aguardando");
    const hoje_ = hoje();
    const hoje30 = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const recentes = pendentes.filter(r => r.data >= hoje30);

    el.innerHTML = `
      <div class="kpis" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;background:var(--bg-card);border:1px solid var(--bd1);border-radius:var(--rl);overflow:hidden;margin-bottom:18px">
        <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
          <div class="kpi-ico" style="background:rgba(212,168,67,.12);color:var(--gold)">⏳</div>
          <div class="kpi-body"><div class="kpi-lbl">Aguardando conciliação</div><div class="kpi-val">${pendentes.length}</div><div class="kpi-d wa">${brl(pendentes.reduce((s,r)=>s+Number(r.valor||0),0))}</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
          <div class="kpi-ico" style="background:rgba(74,156,245,.12);color:var(--blue)">◎</div>
          <div class="kpi-body"><div class="kpi-lbl">Últimos 30 dias</div><div class="kpi-val">${recentes.length}</div><div class="kpi-d nu">pendentes recentes</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none">
          <div class="kpi-ico" style="background:rgba(224,85,85,.12);color:var(--rose)">!</div>
          <div class="kpi-body"><div class="kpi-lbl">Divergentes</div><div class="kpi-val">${_contribuicoes.filter(r=>r.status_conciliacao==="divergente").length}</div><div class="kpi-d dn">requerem atenção</div></div>
        </div>
      </div>

      <div class="card">
        <div class="ctit">Pendentes de conciliação
          <span class="cact" style="margin-left:8px" onclick="oeConcilRecarregar()">↻</span>
        </div>
        ${pendentes.length === 0
          ? '<div class="empty-state">Nenhuma pendência de conciliação.</div>'
          : pendentes.map(r => `
          <div class="trow">
            <div class="tdot" style="background:var(--gold)"></div>
            <div class="tbody">
              <div class="ttitle">${r.anonimo ? "Anônimo" : escapeHtml(r.nome_contribuinte || "Sem nome")} — ${brl(r.valor)}</div>
              <div class="tmeta">${FORMA_LABEL[r.forma]||r.forma} · ${fmtD(r.data)} · ${escapeHtml(r.ofertas_especiais?.titulo || "")}</div>
              ${r.obs ? `<div style="font-size:10.5px;color:var(--tx3);margin-top:2px">${escapeHtml(r.obs)}</div>` : ""}
            </div>
            <div class="tright" style="display:flex;gap:6px">
              <button class="tbt pri" onclick="oeConfirmarContrib('${r.id}')" style="font-size:10.5px;padding:3px 9px">Confirmar</button>
              <button class="tbt" onclick="oeDivergirContrib('${r.id}')" style="font-size:10.5px;padding:3px 9px">Divergente</button>
            </div>
          </div>`).join("")}
      </div>

      ${_contribuicoes.filter(r=>r.status_conciliacao==="divergente").length > 0 ? `
      <div class="card" style="margin-top:14px;border-color:rgba(224,85,85,.2)">
        <div class="ctit" style="color:var(--rose)">Divergentes</div>
        ${_contribuicoes.filter(r=>r.status_conciliacao==="divergente").map(r => `
        <div class="trow">
          <div class="tdot" style="background:var(--rose)"></div>
          <div class="tbody">
            <div class="ttitle">${r.anonimo ? "Anônimo" : escapeHtml(r.nome_contribuinte || "Sem nome")} — ${brl(r.valor)}</div>
            <div class="tmeta">${FORMA_LABEL[r.forma]||r.forma} · ${fmtD(r.data)} · ${escapeHtml(r.ofertas_especiais?.titulo || "")}</div>
          </div>
          <div class="tright">
            <button class="tbt" onclick="oeConfirmarContrib('${r.id}')" style="font-size:10.5px;padding:3px 9px">Confirmar mesmo assim</button>
          </div>
        </div>`).join("")}
      </div>` : ""}`;
  }

  /* ── VIEW: RELATÓRIOS ─────────────────────────────────── */

  async function renderOeRel() {
    const el = document.getElementById("fin-oe-rel-content");
    if (!el) return;
    _loading(el);
    await Promise.all([_loadCampanhas(), _loadContribuicoes()]);

    const confirmadas = _contribuicoes.filter(r => r.status_conciliacao === "confirmada");
    const totalGeral  = confirmadas.reduce((s, r) => s + Number(r.valor || 0), 0);

    // Agrupamento por campanha
    const porCampanha = {};
    confirmadas.forEach(r => {
      const id  = r.campanha_id;
      const tit = r.ofertas_especiais?.titulo || id;
      if (!porCampanha[id]) porCampanha[id] = { titulo: tit, total: 0, qtd: 0 };
      porCampanha[id].total += Number(r.valor || 0);
      porCampanha[id].qtd++;
    });
    const ranking = Object.values(porCampanha).sort((a, b) => b.total - a.total);

    // Agrupamento por forma
    const porForma = {};
    confirmadas.forEach(r => {
      if (!porForma[r.forma]) porForma[r.forma] = { total: 0, qtd: 0 };
      porForma[r.forma].total += Number(r.valor || 0);
      porForma[r.forma].qtd++;
    });

    // Agrupamento mensal
    const porMes = {};
    confirmadas.forEach(r => {
      const m = (r.data || "").substring(0, 7);
      if (!m) return;
      if (!porMes[m]) porMes[m] = 0;
      porMes[m] += Number(r.valor || 0);
    });
    const meses = Object.entries(porMes).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
    const maxMes = Math.max(...meses.map(m => m[1]), 1);

    const NOMES_MES = ["","Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

    el.innerHTML = `
      <div class="kpis" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;background:var(--bg-card);border:1px solid var(--bd1);border-radius:var(--rl);overflow:hidden;margin-bottom:18px">
        <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
          <div class="kpi-ico" style="background:rgba(58,170,92,.12);color:var(--gr)">↑</div>
          <div class="kpi-body"><div class="kpi-lbl">Total arrecadado</div><div class="kpi-val" style="font-size:15px">${brl(totalGeral)}</div><div class="kpi-d up">${confirmadas.length} contribuições confirmadas</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
          <div class="kpi-ico" style="background:rgba(139,111,212,.12);color:var(--violet)">◎</div>
          <div class="kpi-body"><div class="kpi-lbl">Campanhas com receita</div><div class="kpi-val">${ranking.length}</div><div class="kpi-d nu">com contribuições confirmadas</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none">
          <div class="kpi-ico" style="background:rgba(74,156,245,.12);color:var(--blue)">◎</div>
          <div class="kpi-body"><div class="kpi-lbl">Ticket médio</div><div class="kpi-val" style="font-size:15px">${confirmadas.length ? brl(totalGeral / confirmadas.length) : "—"}</div><div class="kpi-d nu">por contribuição</div></div>
        </div>
      </div>

      <div class="g2">
        <div class="card">
          <div class="ctit">Por campanha</div>
          ${ranking.length === 0
            ? '<div class="empty-state">Sem contribuições confirmadas.</div>'
            : ranking.map(r => `
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px">
                <span style="color:var(--tx1);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:55%">${escapeHtml(r.titulo)}</span>
                <span style="color:var(--gr);font-weight:700">${brl(r.total)}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="flex:1;height:5px;border-radius:3px;background:var(--bd1)">
                  <div style="height:5px;border-radius:3px;background:var(--violet);width:${Math.round(r.total/totalGeral*100)}%"></div>
                </div>
                <span style="font-size:10px;color:var(--tx3);min-width:35px;text-align:right">${r.qtd} contrib.</span>
              </div>
            </div>`).join("")}
        </div>

        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card">
            <div class="ctit">Por forma de pagamento</div>
            ${Object.entries(porForma).sort((a,b)=>b[1].total-a[1].total).map(([forma, d]) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--bd1)">
              <span style="font-size:12px;color:var(--tx1)">${FORMA_LABEL[forma]||forma}</span>
              <div style="text-align:right">
                <div style="font-size:12px;font-weight:700;color:var(--gr)">${brl(d.total)}</div>
                <div style="font-size:10px;color:var(--tx3)">${d.qtd} contribuições</div>
              </div>
            </div>`).join("") || '<div class="empty-state">Sem dados.</div>'}
          </div>

          ${meses.length > 0 ? `
          <div class="card">
            <div class="ctit">Evolução mensal</div>
            ${meses.map(([m, v]) => {
              const [y, mo] = m.split("-");
              const pct = Math.max(Math.round(v / maxMes * 100), 2);
              return `
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <span style="font-size:10.5px;color:var(--tx2);min-width:40px">${NOMES_MES[parseInt(mo)]}/${y.slice(2)}</span>
                <div style="flex:1;height:6px;border-radius:3px;background:var(--bd1)">
                  <div style="height:6px;border-radius:3px;background:var(--violet);width:${pct}%"></div>
                </div>
                <span style="font-size:10.5px;color:var(--gr);font-weight:600;min-width:70px;text-align:right">${brl(v)}</span>
              </div>`;
            }).join("")}
          </div>` : ""}
        </div>
      </div>`;
  }

  /* ── MODAL: FORMULÁRIO DE CAMPANHA ────────────────────── */

  window.oeAbrirFormCampanha = async function(id) {
    const sb = _sb();
    let camp = null;
    if (id) {
      const { data } = await sb.from("ofertas_especiais").select("*").eq("id", id).single();
      camp = data;
    }

    // Busca departamentos e pessoas em paralelo
    const [{ data: depts }, { data: pessoas }] = await Promise.all([
      sb.from("departamentos").select("id,nome").order("nome"),
      sb.from("pessoas").select("id,nome").eq("ativo", true).order("nome"),
    ]);

    let modal = document.getElementById("oe-form-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "oe-form-modal";
      modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:355;display:flex;align-items:center;justify-content:center;padding:18px";
      modal.onclick = ev => { if (ev.target === modal) modal.remove(); };
      document.body.appendChild(modal);
    }

    const v = (f) => escapeHtmlAttr(camp?.[f] ?? "");
    const selStyle = "width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none";

    const deptOpts = (depts || []).map(d =>
      `<option value="${escapeHtmlAttr(d.nome)}" ${camp?.departamento === d.nome ? "selected" : ""}>${escapeHtml(d.nome)}</option>`
    ).join("");

    const pessoaOpts = (pessoas || []).map(p =>
      `<option value="${p.id}" ${camp?.responsavel_id === p.id ? "selected" : ""}>${escapeHtml(p.nome)}</option>`
    ).join("");

    modal.innerHTML = `
      <div style="width:min(680px,96vw);max-height:90vh;overflow:auto;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:22px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
          <div>
            <div class="ctit" style="margin:0">${camp ? "Editar campanha" : "Nova campanha"}</div>
            ${camp ? `<div style="font-size:11px;color:var(--tx3);margin-top:2px">${_pillStatus(camp.status)}</div>` : ""}
          </div>
          <button class="tbt" style="margin-left:auto" onclick="document.getElementById('oe-form-modal').remove()">Fechar</button>
        </div>

        <div style="display:grid;gap:12px">
          <div>
            <label class="field-lbl">Título *</label>
            <input id="oe-f-titulo" value="${v("titulo")}" placeholder="Nome da campanha"
                   style="${selStyle}">
          </div>
          <div>
            <label class="field-lbl">Descrição breve</label>
            <input id="oe-f-descricao" value="${v("descricao")}" placeholder="Resumo em uma linha"
                   style="${selStyle}">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label class="field-lbl">Departamento</label>
              <select id="oe-f-departamento" style="${selStyle}">
                <option value="">Nenhum</option>
                ${deptOpts}
              </select>
            </div>
            <div>
              <label class="field-lbl">Responsável</label>
              <select id="oe-f-responsavel" style="${selStyle}">
                <option value="">Nenhum</option>
                ${pessoaOpts}
              </select>
            </div>
          </div>
          <div>
            <label class="field-lbl">Categoria</label>
            <input id="oe-f-categoria" value="${v("categoria")}" placeholder="Ex: Obra, Missão, Benevolência"
                   style="${selStyle}">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label class="field-lbl">Meta (R$)</label>
              <input id="oe-f-meta" type="number" min="0" step="0.01" value="${camp?.meta ?? ""}" placeholder="Deixe em branco para sem meta"
                     style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
            </div>
            <div>
              <label class="field-lbl">Valor inicial (já arrecadado)</label>
              <input id="oe-f-valor-inicial" type="number" min="0" step="0.01" value="${camp?.valor_inicial ?? 0}"
                     style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label class="field-lbl">Data início</label>
              <input id="oe-f-data-inicio" type="date" value="${v("data_inicio")}"
                     style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
            </div>
            <div>
              <label class="field-lbl">Data fim <span style="color:var(--tx3);font-weight:normal">(deixe vazio para aberta)</span></label>
              <input id="oe-f-data-fim" type="date" value="${camp?.sem_data_fim ? "" : v("data_fim")}"
                     style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label class="field-lbl">Chave PIX da conta</label>
              <input id="oe-f-pix" value="${v("chave_pix")}" placeholder="PIX para recebimento"
                     style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
            </div>
            <div>
              <label class="field-lbl">Código da campanha</label>
              <input id="oe-f-codigo" value="${v("codigo_campanha")}" placeholder="Código único (opcional)"
                     style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
            </div>
          </div>
          <div>
            <label class="field-lbl">Finalidade / como os recursos serão usados</label>
            <textarea id="oe-f-finalidade" rows="2" placeholder="Descreva a finalidade dos recursos arrecadados"
                      style="width:100%;box-sizing:border-box;resize:vertical;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">${escapeHtml(camp?.finalidade_recursos ?? "")}</textarea>
          </div>
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px;border-top:1px solid var(--bd1);padding-top:14px">
          <button class="tbt" onclick="document.getElementById('oe-form-modal').remove()">Cancelar</button>
          <button class="tbt pri" id="oe-form-save" onclick="oeSalvarCampanha('${id || ""}')">
            ${camp ? "Salvar alterações" : "Criar campanha"}
          </button>
        </div>
      </div>`;
  };

  window.oeSalvarCampanha = async function(id) {
    const btn = document.getElementById("oe-form-save");
    const old = btn?.textContent || "";
    if (btn) { btn.disabled = true; btn.textContent = "Salvando..."; }

    try {
      const titulo = document.getElementById("oe-f-titulo")?.value?.trim();
      if (!titulo) throw new Error("Título é obrigatório.");

      const dataFim = document.getElementById("oe-f-data-fim")?.value || null;
      const metaVal = document.getElementById("oe-f-meta")?.value;

      const payload = {
        titulo,
        descricao:          document.getElementById("oe-f-descricao")?.value?.trim()    || null,
        categoria:          document.getElementById("oe-f-categoria")?.value?.trim()    || null,
        departamento:       document.getElementById("oe-f-departamento")?.value || null,
        responsavel_id:     document.getElementById("oe-f-responsavel")?.value    || null,
        meta:               metaVal ? parseFloat(metaVal) : null,
        sem_meta:           !metaVal,
        valor_inicial:      parseFloat(document.getElementById("oe-f-valor-inicial")?.value || 0),
        data_inicio:        document.getElementById("oe-f-data-inicio")?.value  || null,
        data_fim:           dataFim || null,
        sem_data_fim:       !dataFim,
        chave_pix:          document.getElementById("oe-f-pix")?.value?.trim()          || null,
        codigo_campanha:    document.getElementById("oe-f-codigo")?.value?.trim()       || null,
        finalidade_recursos: document.getElementById("oe-f-finalidade")?.value?.trim() || null,
        atualizado_em:      new Date().toISOString(),
      };

      const sb = _sb();
      if (id) {
        const { error } = await sb.from("ofertas_especiais").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        payload.status = "rascunho";
        const { error } = await sb.from("ofertas_especiais").insert(payload);
        if (error) throw error;
      }

      _campanhas = null;
      document.getElementById("oe-form-modal")?.remove();
      if (typeof T === "function") T(id ? "Campanha atualizada" : "Campanha criada", titulo);
      await renderOeCampanhas();
    } catch (e) {
      if (typeof T === "function") T("Erro ao salvar", e.message);
      else alert("Erro: " + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = old; }
    }
  };

  /* ── MODAL: STATUS DA CAMPANHA ────────────────────────── */

  window.oeAlterarStatus = function(id, currentStatus) {
    const camp = (_campanhas || []).find(c => c.id === id);
    const status  = currentStatus || camp?.status;
    const titulo  = camp?.titulo || "";
    if (!status) return;

    const opcoes = Object.entries(STATUS_CFG).filter(([k]) => k !== status);

    let modal = document.getElementById("oe-status-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "oe-status-modal";
      modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:399;display:flex;align-items:center;justify-content:center;padding:18px";
      modal.onclick = ev => { if (ev.target === modal) modal.remove(); };
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="width:min(360px,96vw);background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:20px">
        <div class="ctit" style="margin-bottom:12px">Alterar status</div>
        <div style="font-size:12px;color:var(--tx2);margin-bottom:14px">
          ${titulo ? escapeHtml(titulo) + "<br>" : ""}
          <span style="font-size:11px">Status atual: </span>${_pillStatus(status)}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
          ${opcoes.map(([k, v]) => `
          <button class="tbt" onclick="oeAplicarStatus('${id}','${k}')"
                  style="width:100%;text-align:left;padding:7px 12px;font-size:12px;color:${v.cor}">
            ${v.label}
          </button>`).join("")}
        </div>
        <button class="tbt" onclick="document.getElementById('oe-status-modal').remove()" style="width:100%">Cancelar</button>
      </div>`;
  };

  window.oeAplicarStatus = async function(id, status) {
    try {
      const sb = _sb();
      const extra = {};
      if (status === "publicada") { extra.publicado_em = new Date().toISOString(); extra.publica = true; }
      if (status === "encerrada") { extra.encerrado_em = new Date().toISOString(); }
      const { error } = await sb.from("ofertas_especiais").update({ status, atualizado_em: new Date().toISOString(), ...extra }).eq("id", id);
      if (error) throw error;
      _campanhas = null;
      document.getElementById("oe-status-modal")?.remove();
      if (typeof T === "function") T("Status atualizado", STATUS_CFG[status]?.label || status);
      await renderOeCampanhas();
    } catch (e) {
      if (typeof T === "function") T("Erro", e.message);
    }
  };

  /* ── MODAL: REGISTRAR CONTRIBUIÇÃO ───────────────────── */

  window.oeAbrirFormContrib = async function(campanhaId) {
    await _loadCampanhas();
    const ativas = (_campanhas || []).filter(c =>
      ["publicada","em_andamento","aprovada"].includes(c.status)
    );

    let modal = document.getElementById("oe-contrib-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "oe-contrib-modal";
      modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:355;display:flex;align-items:center;justify-content:center;padding:18px";
      modal.onclick = ev => { if (ev.target === modal) modal.remove(); };
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="width:min(520px,96vw);max-height:88vh;overflow:auto;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:22px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
          <div class="ctit" style="margin:0">Registrar contribuição</div>
          <button class="tbt" style="margin-left:auto" onclick="document.getElementById('oe-contrib-modal').remove()">Fechar</button>
        </div>
        <div style="display:grid;gap:12px">
          <div>
            <label class="field-lbl">Campanha *</label>
            <select id="oe-cf-campanha"
                    style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
              <option value="">Selecionar...</option>
              ${ativas.map(c => `<option value="${c.id}" ${campanhaId===c.id?"selected":""}>${escapeHtml(c.titulo)}</option>`).join("")}
              ${ativas.length === 0 ? `<option disabled>Nenhuma campanha ativa</option>` : ""}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label class="field-lbl">Data *</label>
              <input id="oe-cf-data" type="date" value="${hoje()}"
                     style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
            </div>
            <div>
              <label class="field-lbl">Valor (R$) *</label>
              <input id="oe-cf-valor" type="number" min="0.01" step="0.01" placeholder="0,00"
                     style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
            </div>
          </div>
          <div>
            <label class="field-lbl">Forma de pagamento</label>
            <select id="oe-cf-forma"
                    style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
              ${Object.entries(FORMA_LABEL).map(([k,v]) => `<option value="${k}">${v}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="field-lbl">Nome do contribuinte</label>
            <input id="oe-cf-nome" placeholder="Nome (deixe vazio para anônimo)"
                   style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
          </div>
          <div>
            <label class="field-lbl">Observações</label>
            <input id="oe-cf-obs" placeholder="Referência, comprovante, etc."
                   style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px;border-top:1px solid var(--bd1);padding-top:14px">
          <button class="tbt" onclick="document.getElementById('oe-contrib-modal').remove()">Cancelar</button>
          <button class="tbt pri" id="oe-cf-save" onclick="oeSalvarContrib()">Registrar</button>
        </div>
      </div>`;
  };

  window.oeSalvarContrib = async function() {
    const btn = document.getElementById("oe-cf-save");
    const old = btn?.textContent || "";
    if (btn) { btn.disabled = true; btn.textContent = "Salvando..."; }

    try {
      const campanhaId = document.getElementById("oe-cf-campanha")?.value;
      if (!campanhaId) throw new Error("Selecione uma campanha.");
      const valor = parseFloat(document.getElementById("oe-cf-valor")?.value || 0);
      if (!valor || valor <= 0) throw new Error("Valor inválido.");
      const nome = document.getElementById("oe-cf-nome")?.value?.trim();

      const payload = {
        campanha_id:       campanhaId,
        data:              document.getElementById("oe-cf-data")?.value || hoje(),
        valor,
        forma:             document.getElementById("oe-cf-forma")?.value || "pix",
        nome_contribuinte: nome || null,
        anonimo:           !nome,
        obs:               document.getElementById("oe-cf-obs")?.value?.trim() || null,
        origem:            "interno",
        status_conciliacao: "aguardando",
      };

      const sb = _sb();
      const { error } = await sb.from("oe_contribuicoes").insert(payload);
      if (error) throw error;

      _contribuicoes = null;
      document.getElementById("oe-contrib-modal")?.remove();
      if (typeof T === "function") T("Contribuição registrada", brl(valor));
      await renderOeContrib();
    } catch (e) {
      if (typeof T === "function") T("Erro ao salvar", e.message);
      else alert("Erro: " + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = old; }
    }
  };

  /* ── AÇÕES: CONCILIAÇÃO ───────────────────────────────── */

  window.oeConfirmarContrib = async function(id) {
    try {
      const sb = _sb();
      const { error } = await sb.from("oe_contribuicoes")
        .update({ status_conciliacao: "confirmada", conciliado_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      _contribuicoes = null;
      _campanhas     = null;
      if (typeof T === "function") T("Contribuição confirmada", "Conciliação registrada.");
      const el = document.getElementById("fin-oe-concil-content");
      if (el) await renderOeConcil();
      else await renderOeContrib();
    } catch (e) {
      if (typeof T === "function") T("Erro", e.message);
    }
  };

  window.oeDivergirContrib = async function(id) {
    try {
      const sb = _sb();
      const { error } = await sb.from("oe_contribuicoes")
        .update({ status_conciliacao: "divergente" })
        .eq("id", id);
      if (error) throw error;
      _contribuicoes = null;
      if (typeof T === "function") T("Marcado como divergente", "Revise os dados.");
      await renderOeConcil();
    } catch (e) {
      if (typeof T === "function") T("Erro", e.message);
    }
  };

  /* ── DETALHE DE CAMPANHA ──────────────────────────────── */

  window.oeAbrirCampanha = async function(id) {
    const sb = _sb();
    const { data: camp } = await sb.from("ofertas_especiais").select("*").eq("id", id).single();
    if (!camp) return;
    const { data: contribs } = await sb
      .from("oe_contribuicoes")
      .select("*")
      .eq("campanha_id", id)
      .order("data", { ascending: false });

    const confirmadas = (contribs || []).filter(r => r.status_conciliacao === "confirmada");
    const arrecadado  = confirmadas.reduce((s, r) => s + Number(r.valor || 0), 0)
                      + Number(camp.valor_inicial || 0);
    const pct = _pct(arrecadado, camp.meta);

    let modal = document.getElementById("oe-det-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "oe-det-modal";
      modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:355;display:flex;align-items:center;justify-content:center;padding:18px";
      modal.onclick = ev => { if (ev.target === modal) modal.remove(); };
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="width:min(720px,96vw);max-height:90vh;overflow:auto;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:22px">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px">
          <div style="flex:1">
            <div style="font-size:16px;font-weight:700;color:var(--tx1)">${escapeHtml(camp.titulo)}</div>
            <div style="margin-top:4px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              ${_pillStatus(camp.status)}
              ${camp.categoria ? `<span style="font-size:11px;color:var(--tx3)">${escapeHtml(camp.categoria)}</span>` : ""}
              ${camp.departamento ? `<span style="font-size:11px;color:var(--tx3)">${escapeHtml(camp.departamento)}</span>` : ""}
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="tbt" onclick="oeAbrirFormCampanha('${id}')" style="font-size:11px;padding:4px 10px">Editar</button>
            <button class="tbt" onclick="oeAlterarStatus('${id}','${camp.status}')" style="font-size:11px;padding:4px 10px">${_pillStatus(camp.status)}</button>
            <button class="tbt pri" onclick="oeAbrirFormContrib('${id}')" style="font-size:11px;padding:4px 10px">+ Contribuição</button>
            <button class="tbt" onclick="document.getElementById('oe-det-modal').remove()">Fechar</button>
          </div>
        </div>

        <div class="kpis" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;background:var(--bg-card);border:1px solid var(--bd1);border-radius:var(--rl);overflow:hidden;margin-bottom:18px">
          <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
            <div class="kpi-ico" style="background:rgba(58,170,92,.12);color:var(--gr)">↑</div>
            <div class="kpi-body"><div class="kpi-lbl">Arrecadado</div><div class="kpi-val" style="font-size:15px">${brl(arrecadado)}</div>${pct !== null ? `<div class="kpi-d up">${pct}% da meta</div>` : ""}</div>
          </div>
          <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
            <div class="kpi-ico" style="background:rgba(139,111,212,.12);color:var(--violet)">◎</div>
            <div class="kpi-body"><div class="kpi-lbl">Meta</div><div class="kpi-val" style="font-size:15px">${camp.sem_meta ? "—" : brl(camp.meta)}</div></div>
          </div>
          <div class="kpi" style="border-radius:0;border:none">
            <div class="kpi-ico" style="background:rgba(74,156,245,.12);color:var(--blue)">◎</div>
            <div class="kpi-body"><div class="kpi-lbl">Contribuições</div><div class="kpi-val">${(contribs||[]).length}</div><div class="kpi-d nu">${confirmadas.length} confirmadas</div></div>
          </div>
        </div>

        ${pct !== null ? `
        <div style="margin-bottom:18px">
          <div style="height:8px;border-radius:4px;background:var(--bd1)">
            <div style="height:8px;border-radius:4px;background:${pct >= 100 ? "var(--gr)" : "var(--violet)"};width:${pct}%;transition:width .5s"></div>
          </div>
        </div>` : ""}

        ${camp.descricao ? `<div style="font-size:12.5px;color:var(--tx2);margin-bottom:14px">${escapeHtml(camp.descricao)}</div>` : ""}
        ${camp.finalidade_recursos ? `
        <div style="background:var(--bg-hover);border-radius:8px;padding:10px 12px;margin-bottom:16px;font-size:11.5px;color:var(--tx2)">
          <span style="font-weight:600;color:var(--tx1)">Finalidade:</span> ${escapeHtml(camp.finalidade_recursos)}
        </div>` : ""}

        <div class="ctit">Contribuições</div>
        ${(contribs || []).length === 0
          ? '<div class="empty-state">Nenhuma contribuição registrada.</div>'
          : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr style="border-bottom:1px solid var(--bd2)">
                ${["Data","Contribuinte","Valor","Forma","Status",""].map((h,i) =>
                  `<th style="text-align:${i===2?"right":"left"};padding:7px 8px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase">${h}</th>`
                ).join("")}
              </tr></thead>
              <tbody>
                ${(contribs || []).map(r => `
                <tr style="border-bottom:1px solid var(--bd1)">
                  <td style="padding:7px 8px;color:var(--tx2);white-space:nowrap">${fmtD(r.data)}</td>
                  <td style="padding:7px 8px;color:var(--tx1)">${r.anonimo ? '<em style="color:var(--tx3)">Anônimo</em>' : escapeHtml(r.nome_contribuinte || "—")}</td>
                  <td style="padding:7px 8px;text-align:right;font-weight:700;color:var(--gr)">${brl(r.valor)}</td>
                  <td style="padding:7px 8px;color:var(--tx2)">${FORMA_LABEL[r.forma]||r.forma}</td>
                  <td style="padding:7px 8px">${_pillConcil(r.status_conciliacao)}</td>
                  <td style="padding:7px 8px">
                    ${r.status_conciliacao === "aguardando"
                      ? `<button class="tbt" onclick="oeConfirmarContrib('${r.id}')" style="font-size:10px;padding:2px 7px">Confirmar</button>`
                      : ""}
                  </td>
                </tr>`).join("")}
              </tbody>
            </table></div>`
        }
      </div>`;
  };

  /* ── AÇÕES PÚBLICAS ───────────────────────────────────── */

  window.oeRecarregar = async function() {
    _campanhas = null;
    _contribuicoes = null;
    const id = document.querySelector(".view[style*='display:block']")?.id?.replace("v-", "");
    if (id === "fin-ofertas-especiais") await renderOeDash();
    else if (id === "fin-oe-campanhas") await renderOeCampanhas();
    else await renderOeDash();
  };

  window.oeFiltraCampanhas = renderOeCampanhas;
  window.oeFiltrarContrib  = renderOeContrib;
  window.oeConcilRecarregar = async function() {
    _contribuicoes = null;
    await renderOeConcil();
  };

  /* ── NAVIGATE EVENT ───────────────────────────────────── */

  document.addEventListener("sipen:navigate", ({ detail: { id } }) => {
    const MAP = {
      "fin-ofertas-especiais":  () => renderOeDash(),
      "fin-oe-campanhas":       () => renderOeCampanhas(),
      "fin-oe-contribuicoes":   () => renderOeContrib(),
      "fin-oe-conciliacao":     () => renderOeConcil(),
      "fin-oe-relatorios":      () => renderOeRel(),
    };
    if (MAP[id]) MAP[id]();
  });

  if (typeof VIEW_AUTOLOAD !== "undefined") {
    VIEW_AUTOLOAD["fin-ofertas-especiais"] = { fn: renderOeDash };
  }

})();
