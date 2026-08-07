/* ═══════════════════════════════════════════════════════
   SIPEN — Módulo Financeiro
   financeiro.js · v2.1
   Solicitações (A Pagar) conectadas ao Supabase.
   Lançamentos, Fluxo, A Receber, Categorias, Relatórios
   e Auditoria aguardam integração com tabelas do Supabase.
═══════════════════════════════════════════════════════ */

(function () {

  const LANCAMENTOS    = [];
  const CONTAS_RECEBER = [];
  const AUDITORIA      = [];
  const CATEGORIAS     = [];

  /* ── ESTADO — Solicitações e Anexos (banco real) ────────── */

  let _SOLICITACOES   = null;
  let _ANEXOS         = null; // { [solicitacao_id]: [...] }
  let _DEM_FIN_CACHE  = null;
  let _DIZOF_CACHE    = null;
  let _finDizTab      = "dizimos";

  async function _loadSolicitacoes(force) {
    if (_SOLICITACOES !== null && !force) return;
    try {
      const sb = _sbClient();
      const { data, error } = await sb
        .from("financeiro_solicitacoes")
        .select("*")
        .is("deleted_at", null)
        .order("vencimento", { ascending: true, nullsFirst: false });
      if (error) throw error;
      _SOLICITACOES = data || [];
    } catch (e) {
      console.error("[financeiro] Erro ao carregar solicitações:", e);
      _SOLICITACOES = [];
    }
  }

  async function _loadAnexos(force) {
    if (_ANEXOS !== null && !force) return;
    try {
      const sb = _sbClient();
      const { data, error } = await sb
        .from("financeiro_anexos")
        .select("*")
        .is("deleted_at", null)
        .not("solicitacao_id", "is", null);
      if (error) throw error;
      _ANEXOS = {};
      (data || []).forEach(a => {
        if (!_ANEXOS[a.solicitacao_id]) _ANEXOS[a.solicitacao_id] = [];
        _ANEXOS[a.solicitacao_id].push(a);
      });
    } catch (e) {
      console.error("[financeiro] Erro ao carregar anexos:", e);
      _ANEXOS = {};
    }
  }

  async function _uploadAnexoFin(file, solicitacaoId, tipo) {
    const sb = _sbClient();
    if (!sb) throw new Error("Supabase não disponível");
    if (file.size > 10 * 1024 * 1024) throw new Error("Arquivo maior que 10 MB");
    const ts   = Date.now();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `financeiro/solicitacoes/${solicitacaoId}/${tipo}/${ts}_${safe}`;
    const { error: upErr } = await sb.storage
      .from("financial-documents")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const u = typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL : null;
    const { error: dbErr } = await sb.from("financeiro_anexos").insert({
      solicitacao_id: solicitacaoId,
      tipo_arquivo:   tipo,
      nome_original:  file.name,
      storage_bucket: "financial-documents",
      storage_path:   path,
      mime_type:      file.type,
      tamanho_bytes:  file.size,
      criado_por:     u?.nome || "",
    });
    if (dbErr) throw new Error(dbErr.message);
  }

  /* ── HELPERS ─────────────────────────────────────────────── */

  function brl(v) {
    return "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtD(d) {
    if (!d) return "—";
    const s = (d.split("T")[0] || d).split("-");
    return `${s[2]}/${s[1]}/${s[0]}`;
  }

  function hoje() {
    return new Date().toISOString().split("T")[0];
  }

  function em7dias() {
    return new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  }

  function pillStatus(st) {
    const m = {
      confirmado:        '<span class="pill pg">Confirmado</span>',
      pendente:          '<span class="pill po">Pendente</span>',
      cancelado:         '<span class="pill">Cancelado</span>',
      atrasado:          '<span class="pill pl">Atrasado</span>',
      em_processamento:  '<span class="pill pd">Em Processamento</span>',
      pago:              '<span class="pill pg">Pago</span>',
      recebido:          '<span class="pill pg">Recebido</span>',
      aguardando:        '<span class="pill po">Aguardando</span>',
    };
    return m[st] || `<span class="pill">${typeof tcPT === "function" ? tcPT(st) : st}</span>`;
  }

  function pillTipo(t) {
    return t === "receita"
      ? '<span style="font-size:10px;color:var(--gr);font-weight:600">↑ receita</span>'
      : '<span style="font-size:10px;color:var(--rose);font-weight:600">↓ despesa</span>';
  }

  function acaoColor(a) {
    if (a.includes("criação"))   return "var(--gr)";
    if (a.includes("edição"))   return "var(--blue)";
    if (a.includes("exclusão")) return "var(--rose)";
    return "var(--teal)";
  }

  function _labelForma(f) {
    const m = {
      pix:          "PIX",
      pix_reembolso:"PIX (Reembolso)",
      boleto:       "Boleto",
      boleto_pix:   "Boleto / PIX",
      transferencia:"Transferência",
      cartao:       "Cartão",
    };
    return m[f] || f || "—";
  }

  function _statusSolicitacao(row) {
    if (row.status === "pago" || row.status === "cancelado") return row.status;
    if (row.vencimento && row.vencimento < hoje()) return "atrasado";
    return row.status || "pendente";
  }

  const TIPO_ICON = { lancamento:"💰", conta_pagar:"📤", conta_receber:"📥", categoria:"🏷" };

  const EMPTY_STATE = `<div class="empty-state">Nenhum registro encontrado.</div>`;

  /* ── DEMANDAS FINANCEIRAS — helpers e carga ─────────────── */

  const _DEM_STATUS_LABEL = {
    "ABERTA": "Aberta", "EM_ANALISE": "Em Análise", "EM_ANDAMENTO": "Em Andamento",
    "AGUARDANDO_PAGAMENTO": "Aguardando Pagamento", "PENDENTE": "Pendente",
    "CONCLUIDA": "Concluída", "CANCELADA": "Cancelada", "PAGO": "Pago",
  };
  const _DEM_STATUS_CFG = {
    "Aberta":                { bg:"rgba(74,156,245,.12)",  cl:"var(--blue)"   },
    "Em Análise":            { bg:"rgba(212,168,67,.12)",  cl:"var(--gold)"   },
    "Em Andamento":          { bg:"rgba(139,111,212,.12)", cl:"var(--violet)" },
    "Aguardando Pagamento":  { bg:"rgba(234,179,8,.12)",   cl:"var(--amber)"  },
    "Pendente":              { bg:"rgba(224,138,42,.12)",  cl:"var(--amber)"  },
    "Concluída":             { bg:"rgba(58,170,92,.12)",   cl:"var(--gr)"     },
    "Cancelada":             { bg:"rgba(90,96,104,.15)",   cl:"var(--tx3)"    },
    "Pago":                  { bg:"rgba(58,170,92,.12)",   cl:"var(--gr)"     },
  };

  function _demLabel(st)  { return _DEM_STATUS_LABEL[st] || st || "Aberta"; }
  function _pillDem(st) {
    if (window.SIPEN?.status?.pill) return SIPEN.status.pill(st);
    const label = _demLabel(st);
    const s = _DEM_STATUS_CFG[label] || { bg:"rgba(90,96,104,.15)", cl:"var(--tx3)" };
    return `<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;background:${s.bg};color:${s.cl}">${label}</span>`;
  }

  async function _loadDemandasFin(force) {
    if (_DEM_FIN_CACHE !== null && !force) return _DEM_FIN_CACHE;
    try {
      const base = typeof apiBaseUrl === "function" ? apiBaseUrl() : "";
      const hdrs = typeof apiHeaders === "function" ? apiHeaders({ "Prefer": "count=none" }) : {};
      const url  = `${base}/rest/v1/v_demandas?select=*&area=eq.Financeiro&order=criado_em.desc.nullslast&limit=500`;
      const res  = await fetch(url, { method: "GET", headers: hdrs });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      _DEM_FIN_CACHE = Array.isArray(data)
        ? data.map(r => ({ ...r, status: _demLabel(r.status) }))
        : [];
    } catch (e) {
      console.error("[financeiro] Erro ao carregar demandas:", e);
      _DEM_FIN_CACHE = [];
    }
    return _DEM_FIN_CACHE;
  }

  /* ── RENDER: DASHBOARD ───────────────────────────────────── */

  async function renderDash() {
    const el = document.getElementById("fin-dash-content");
    if (!el) return;
    el.innerHTML = `<div style="padding:12px 0;color:var(--tx3);font-size:11.5px"><span style="display:inline-block;width:11px;height:11px;border:2px solid var(--gr);border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;vertical-align:middle;margin-right:6px"></span> Carregando...</div>`;

    const demFin = await _loadDemandasFin();

    const ATIVAS  = ["Aberta","Em Análise","Em Andamento","Pendente","Aguardando Pagamento"];
    const abertas  = demFin.filter(r => r.status === "Aberta");
    const analise  = demFin.filter(r => r.status === "Em Análise");
    const andando  = demFin.filter(r => r.status === "Em Andamento");
    const pendente = demFin.filter(r => r.status === "Pendente" || r.status === "Aguardando Pagamento");
    const concl    = demFin.filter(r => r.status === "Concluída");
    const ativas   = demFin.filter(r => ATIVAS.includes(r.status));

    const limite7d  = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const atrasadas = ativas.filter(r => (r.data_abertura || r.criado_em || "").split("T")[0] < limite7d);
    const urgentes  = ativas.filter(r => ["Alta","Urgente"].includes(r.prioridade));

    const recentes = [...demFin]
      .sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || ""))
      .slice(0, 8);

    const atencao = [...new Map(
      [...atrasadas, ...urgentes].map(r => [r.id, r])
    ).values()].slice(0, 6);

    const totalGeral = demFin.length || 1;
    const pipeline = [
      { label:"Aberta",       val:abertas.length,  cor:"var(--blue)"   },
      { label:"Em Análise",   val:analise.length,  cor:"var(--gold)"   },
      { label:"Em Andamento", val:andando.length,  cor:"var(--violet)" },
      { label:"Pendente",     val:pendente.length, cor:"var(--amber)"  },
      { label:"Concluída",    val:concl.length,    cor:"var(--gr)"     },
    ];

    el.innerHTML = `
      <div class="kpis" style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0;background:var(--bg-card);border:1px solid var(--bd1);border-radius:var(--rl);overflow:hidden;margin-bottom:18px">
        <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
          <div class="kpi-ico" style="background:rgba(74,156,245,.12);color:var(--blue)">◻</div>
          <div class="kpi-body"><div class="kpi-lbl">Abertas</div><div class="kpi-val">${abertas.length}</div><div class="kpi-d nu">aguardando</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
          <div class="kpi-ico" style="background:rgba(212,168,67,.12);color:var(--gold)">🔍</div>
          <div class="kpi-body"><div class="kpi-lbl">Em Análise</div><div class="kpi-val">${analise.length}</div><div class="kpi-d nu">triagem</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
          <div class="kpi-ico" style="background:rgba(139,111,212,.12);color:var(--violet)">◎</div>
          <div class="kpi-body"><div class="kpi-lbl">Em Andamento</div><div class="kpi-val">${andando.length}</div><div class="kpi-d nu">em execução</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
          <div class="kpi-ico" style="background:rgba(212,168,67,.12);color:var(--amber)">⏳</div>
          <div class="kpi-body"><div class="kpi-lbl">Pendentes</div><div class="kpi-val">${pendente.length}</div><div class="kpi-d nu">aguardando</div></div>
        </div>
        <div class="kpi" style="border-radius:0;border:none">
          <div class="kpi-ico" style="background:rgba(58,170,92,.12);color:var(--gr)">✓</div>
          <div class="kpi-body"><div class="kpi-lbl">Concluídas</div><div class="kpi-val">${concl.length}</div><div class="kpi-d up">total</div></div>
        </div>
      </div>

      <div class="g2">
        <div class="card">
          <div class="ctit">Últimas demandas financeiras <span class="cact" onclick="go('fin-demandas')">Ver todas →</span><span class="cact" style="margin-left:8px" onclick="finRecarregarDash()">↻</span></div>
          ${recentes.length === 0
            ? '<div class="empty-state">Nenhuma demanda financeira registrada</div>'
            : recentes.map(r => {
                const meta = [
                  r.subcategoria ? escapeHtml(r.subcategoria) : null,
                  r.local        ? escapeHtml(r.local)        : null,
                  nomePropio(r.solicitante || r.solicitante_txt) || null,
                  fmtD(r.data_abertura || r.criado_em),
                ].filter(Boolean).join(" · ");
                return `
                <div onclick="window.demAbrirDetalhe && demAbrirDetalhe('${r.id||r._row}','fin-dash')"
                     style="cursor:pointer;border-bottom:1px solid var(--bd1);padding:9px 0"
                     onmouseover="this.style.background='var(--bg-hover)'"
                     onmouseout="this.style.background=''">
                  <div style="display:grid;grid-template-columns:110px 1fr auto;gap:10px;align-items:center;padding:0 2px 5px">
                    <span style="font-size:10.5px;font-weight:700;color:var(--blue);font-family:var(--mono);letter-spacing:.03em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.numero_chamado ? escapeHtml(r.numero_chamado) : "—"}</span>
                    <span style="font-size:12.5px;font-weight:600;color:var(--tx1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">💰 ${escapeHtml(r.titulo) || "Sem título"}</span>
                    ${_pillDem(r.status)}
                  </div>
                  <div style="font-size:11px;color:var(--tx3);padding:0 2px;line-height:1.4">${meta}</div>
                </div>`;
              }).join("")}
        </div>

        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card" style="${atencao.length ? "border-color:rgba(224,85,85,.25)" : ""}">
            <div class="ctit" style="${atencao.length ? "color:var(--rose)" : ""}">
              Requer atenção
              ${atrasadas.length ? `<span style="font-size:11px;font-weight:600;padding:1px 8px;border-radius:10px;background:var(--rosebg);color:var(--rose);margin-left:6px">${atrasadas.length} atrasada${atrasadas.length !== 1 ? "s" : ""}</span>` : ""}
            </div>
            ${atencao.length === 0
              ? '<div class="empty-state">Sem itens críticos ✓</div>'
              : atencao.map(r => {
                  const abertoEm  = (r.data_abertura || r.criado_em || "").split("T")[0];
                  const diasAberta = Math.floor((Date.now() - new Date(abertoEm).getTime()) / 86400000);
                  const isAtrasada = abertoEm < limite7d;
                  return `
                  <div class="trow" onclick="window.demAbrirDetalhe && demAbrirDetalhe('${r.id||r._row}','fin-dash')" style="cursor:pointer">
                    <div class="tdot" style="background:${isAtrasada ? "var(--rose)" : "var(--amber)"}"></div>
                    <div class="tbody">
                      <div class="ttitle">${escapeHtml(r.titulo || "Sem título")}</div>
                      <div class="tmeta">${escapeHtml(r.subcategoria || "Financeiro")} · ${diasAberta}d aberta · ${nomePropio(r.solicitante || r.solicitante_txt) || "—"}</div>
                    </div>
                    <div class="tright">${_pillDem(r.status)}</div>
                  </div>`;
                }).join("")}
          </div>

          <div class="card">
            <div class="ctit">Pipeline de status</div>
            ${pipeline.map(p => `
              <div style="margin-bottom:9px">
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
                  <span style="color:var(--tx2)">${p.label}</span>
                  <span style="color:var(--tx1);font-weight:700">${p.val}</span>
                </div>
                <div style="height:5px;border-radius:3px;background:var(--bd1)">
                  <div style="height:5px;border-radius:3px;background:${p.cor};width:${p.val ? Math.max(Math.round(p.val / totalGeral * 100), 2) : 0}%;transition:width .3s"></div>
                </div>
              </div>`).join("")}
          </div>
        </div>
      </div>`;
  }

  /* ── RENDER: LANÇAMENTOS ─────────────────────────────────── */

  function renderLancamentos() {
    const el = document.getElementById("fin-lanc-content");
    if (!el) return;

    const ftipo   = document.getElementById("fin-lanc-ftipo")?.value   || "";
    const fstatus = document.getElementById("fin-lanc-fstatus")?.value || "";
    const fbusca  = (document.getElementById("fin-lanc-fbusca")?.value || "").toLowerCase();

    let rows = [...LANCAMENTOS].sort((a, b) => b.data.localeCompare(a.data));
    if (ftipo)   rows = rows.filter(l => l.tipo === ftipo);
    if (fstatus) rows = rows.filter(l => l.status === fstatus);
    if (fbusca)  rows = rows.filter(l =>
      l.desc.toLowerCase().includes(fbusca) ||
      l.cat.toLowerCase().includes(fbusca)  ||
      l.resp.toLowerCase().includes(fbusca)
    );

    const totalRec  = rows.filter(l => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
    const totalDesp = rows.filter(l => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);

    el.innerHTML = `
      ${LANCAMENTOS.length > 0 ? `
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:rgba(61,160,85,0.12);color:var(--gr)">↑</div><div class="kpi-body"><div class="kpi-lbl">Receitas filtradas</div><div class="kpi-val">${brl(totalRec)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">↓</div><div class="kpi-body"><div class="kpi-lbl">Despesas filtradas</div><div class="kpi-val">${brl(totalDesp)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--bluebg);color:var(--blue)">⚖</div><div class="kpi-body"><div class="kpi-lbl">Resultado</div><div class="kpi-val" style="color:${totalRec - totalDesp >= 0 ? "var(--gr)" : "var(--rose)"}">${brl(totalRec - totalDesp)}</div></div></div>
      </div>` : ""}
      <div class="card">
        <div class="ctit">Lançamentos <span class="csub">(${rows.length})</span></div>
        ${rows.length === 0
          ? '<div class="empty-state">Nenhum lançamento encontrado.</div>'
          : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr style="border-bottom:1px solid var(--bd2)">
                ${["Data","Descrição","Categoria","Tipo","Valor","Forma","Status","Responsável"].map(h =>
                  `<th style="text-align:${h==="Valor"?"right":"left"};padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`
                ).join("")}
              </tr></thead>
              <tbody>
                ${rows.map(l => `
                  <tr style="border-bottom:1px solid var(--bd1)" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
                    <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${fmtD(l.data)}</td>
                    <td style="padding:8px 6px;color:var(--tx1);max-width:200px">${l.desc}</td>
                    <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${l.cat}</td>
                    <td style="padding:8px 6px">${pillTipo(l.tipo)}</td>
                    <td style="padding:8px 6px;text-align:right;font-weight:700;color:${l.tipo==="receita"?"var(--gr)":"var(--rose)"}">${l.tipo==="receita"?"+":"−"}${brl(l.valor)}</td>
                    <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${l.forma}</td>
                    <td style="padding:8px 6px">${pillStatus(l.status)}</td>
                    <td style="padding:8px 6px;color:var(--tx2)">${l.resp}</td>
                  </tr>`).join("")}
              </tbody>
            </table></div>`
        }
      </div>`;
  }

  /* ── RENDER: FLUXO DE CAIXA ──────────────────────────────── */

  function renderFluxo() {
    const el = document.getElementById("fin-fluxo-content");
    if (!el) return;

    const byMonth = {};
    LANCAMENTOS.forEach(l => {
      const m = l.data.substring(0, 7);
      if (!byMonth[m]) byMonth[m] = { mes: m, rec: 0, desp: 0 };
      if (l.tipo === "receita") byMonth[m].rec  += l.valor;
      else                      byMonth[m].desp += l.valor;
    });

    const NOMES_MES = ["","Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const meses = Object.values(byMonth).sort((a, b) => b.mes.localeCompare(a.mes));
    let saldoAcum = meses.reduce((s, m) => s + m.rec - m.desp, 0);
    const mesesComSaldo = meses.map(m => {
      const res = { ...m, resultado: m.rec - m.desp, saldo: saldoAcum };
      saldoAcum -= m.rec - m.desp;
      return res;
    });

    const totalRec  = LANCAMENTOS.filter(l => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
    const totalDesp = LANCAMENTOS.filter(l => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);

    el.innerHTML = `
      ${LANCAMENTOS.length > 0 ? `
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:rgba(61,160,85,0.12);color:var(--gr)">↑</div><div class="kpi-body"><div class="kpi-lbl">Total entradas</div><div class="kpi-val">${brl(totalRec)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">↓</div><div class="kpi-body"><div class="kpi-lbl">Total saídas</div><div class="kpi-val">${brl(totalDesp)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--bluebg);color:var(--blue)">⚖</div><div class="kpi-body"><div class="kpi-lbl">Saldo acumulado</div><div class="kpi-val" style="color:var(--gr)">${brl(totalRec - totalDesp)}</div></div></div>
      </div>` : ""}
      <div class="card">
        <div class="ctit">Fluxo por período</div>
        ${mesesComSaldo.length === 0 ? EMPTY_STATE : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="border-bottom:1px solid var(--bd2)">
            ${["Período","Entradas","Saídas","Resultado","Saldo acumulado","Balanço"].map((h,i) =>
              `<th style="text-align:${i===0||i===5?"left":"right"};padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase">${h}</th>`
            ).join("")}
          </tr></thead>
          <tbody>
            ${mesesComSaldo.map(m => {
              const [y, mo] = m.mes.split("-");
              const pct = m.rec > 0 ? Math.round(Math.max(0, m.resultado) / m.rec * 100) : 0;
              return `
                <tr style="border-bottom:1px solid var(--bd1)" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
                  <td style="padding:8px 6px;color:var(--tx1);font-weight:500">${NOMES_MES[parseInt(mo)]}/${y}</td>
                  <td style="padding:8px 6px;text-align:right;color:var(--gr);font-weight:600">+${brl(m.rec)}</td>
                  <td style="padding:8px 6px;text-align:right;color:var(--rose);font-weight:600">−${brl(m.desp)}</td>
                  <td style="padding:8px 6px;text-align:right;font-weight:700;color:${m.resultado >= 0 ? "var(--gr)" : "var(--rose)"}">${m.resultado >= 0 ? "+" : ""}${brl(m.resultado)}</td>
                  <td style="padding:8px 6px;text-align:right;color:var(--tx1)">${brl(m.saldo)}</td>
                  <td style="padding:8px 6px">
                    <div style="display:flex;align-items:center;gap:6px">
                      <div style="flex:1;height:6px;background:var(--bg-hover);border-radius:3px;min-width:60px">
                        <div style="height:100%;width:${pct}%;background:${m.resultado >= 0 ? "var(--gr)" : "var(--rose)"};border-radius:3px"></div>
                      </div>
                      <span style="font-size:10px;color:var(--tx3);min-width:28px">${pct}%</span>
                    </div>
                  </td>
                </tr>`;
            }).join("")}
          </tbody>
        </table></div>`}
      </div>`;
  }

  /* ── RENDER: SOLICITAÇÕES / A PAGAR (SUPABASE) ───────────── */

  async function renderPagar() {
    const el = document.getElementById("fin-pagar-content");
    if (!el) return;

    el.innerHTML = '<div class="empty-state">Carregando...</div>';
    _DEM_FIN_CACHE = null;
    _SOLICITACOES  = null;
    await Promise.all([_loadSolicitacoes(), _loadDemandasFin()]);

    const H  = hoje();
    const S7 = em7dias();

    // KPIs: from financeiro_solicitacoes (vencimento-aware)
    const allSol    = _SOLICITACOES || [];
    const emAberto  = allSol.filter(r => !["pago","cancelado"].includes(r.status));
    const atrasadas = emAberto.filter(r => r.vencimento && r.vencimento < H);
    const vencBrv   = emAberto.filter(r => r.vencimento && r.vencimento >= H && r.vencimento <= S7);
    const totalAb   = emAberto.reduce((s, r) => s + Number(r.valor || 0), 0);

    // Normalize financeiro_solicitacoes → same shape as v_demandas rows
    const _cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : "Aberta";
    const solRows = (_SOLICITACOES || []).map(r => ({
      _isSol: true,
      id: r.id,
      numero_chamado: null,
      subcategoria: r.finalidade || "Financeiro",
      titulo: r.finalidade || r.descricao || "Solicitação financeira",
      solicitante: r.solicitante || null,
      responsavel: r.responsavel || null,
      financial_data: { valor: r.valor, forma_pagamento: r.forma_pagamento || null },
      status: _cap(r.status),
      data_abertura: r.created_at,
      criado_em: r.created_at,
      data_conclusao: r.pago_em || null,
    }));

    // List: merged from v_demandas + financeiro_solicitacoes
    const fstatus = document.getElementById("fin-pagar-fstatus")?.value || "__aberto";
    const fprio   = document.getElementById("fin-pagar-fprio")?.value   || "";
    const fbusca  = (document.getElementById("fin-pagar-fbusca")?.value || "").toLowerCase();

    const _FECHADAS = ["Pago", "Concluída", "Cancelada", "Cancelado"];
    let rows = [...(_DEM_FIN_CACHE || []), ...solRows];
    if (fstatus === "__aberto") rows = rows.filter(r => !_FECHADAS.includes(r.status));
    else if (fstatus) rows = rows.filter(r => r.status === fstatus);
    if (fprio)   rows = rows.filter(r => r.prioridade === fprio);
    if (fbusca)  rows = rows.filter(r =>
      (r.titulo       || "").toLowerCase().includes(fbusca) ||
      (r.solicitante  || "").toLowerCase().includes(fbusca) ||
      (r.responsavel  || "").toLowerCase().includes(fbusca) ||
      (r.area         || "").toLowerCase().includes(fbusca) ||
      (r.subcategoria || "").toLowerCase().includes(fbusca)
    );
    rows.sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || ""));

    el.innerHTML = `
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">!</div><div class="kpi-body"><div class="kpi-lbl">Total em aberto</div><div class="kpi-val">${brl(totalAb)}</div><div class="kpi-d dn">${emAberto.length} solicitações</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">✕</div><div class="kpi-body"><div class="kpi-lbl">Atrasadas</div><div class="kpi-val">${atrasadas.length}</div><div class="kpi-d dn">${brl(atrasadas.reduce((s,r)=>s+Number(r.valor||0),0))}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--goldbg);color:var(--gold)">⏰</div><div class="kpi-body"><div class="kpi-lbl">Vencendo em 7 dias</div><div class="kpi-val">${vencBrv.length}</div><div class="kpi-d wa">${brl(vencBrv.reduce((s,r)=>s+Number(r.valor||0),0))}</div></div></div>
      </div>

      <div class="card">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
          <select id="fin-pagar-fstatus" onchange="finFiltrarPagar()" style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:6px 10px;outline:none">
            <option value="__aberto" ${fstatus==="__aberto"?"selected":""}>Em aberto</option>
            <option value="" ${fstatus===""?"selected":""}>Todos os status</option>
            <option value="Aberta" ${fstatus==="Aberta"?"selected":""}>Aberta</option>
            <option value="Em Análise" ${fstatus==="Em Análise"?"selected":""}>Em Análise</option>
            <option value="Em Andamento" ${fstatus==="Em Andamento"?"selected":""}>Em Andamento</option>
            <option value="Aguardando Pagamento" ${fstatus==="Aguardando Pagamento"?"selected":""}>Aguardando Pagamento</option>
            <option value="Pendente" ${fstatus==="Pendente"?"selected":""}>Pendente</option>
            <option value="Pago" ${fstatus==="Pago"?"selected":""}>Pago</option>
            <option value="Concluída" ${fstatus==="Concluída"?"selected":""}>Concluída</option>
            <option value="Cancelada" ${fstatus==="Cancelada"?"selected":""}>Cancelada</option>
          </select>
          <select id="fin-pagar-fprio" onchange="finFiltrarPagar()" style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:6px 10px;outline:none">
            <option value="">Todas as prioridades</option>
            <option value="Baixa">Baixa</option>
            <option value="Normal">Normal</option>
            <option value="Alta">Alta</option>
            <option value="Urgente">Urgente</option>
          </select>
          <input id="fin-pagar-fbusca" type="text" placeholder="Buscar título, solicitante..." oninput="finDebouncePagar()" style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:6px 10px;outline:none;min-width:200px">
          <span style="font-size:11px;color:var(--tx3);margin-left:auto">${rows.length} demanda${rows.length !== 1 ? "s" : ""}</span>
        </div>

        ${rows.length === 0
          ? '<div class="empty-state">Nenhuma demanda encontrada.</div>'
          : `<div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;font-size:12px">
                <thead>
                  <tr style="border-bottom:1px solid var(--bd2)">
                    ${["Nº Chamado","Subcategoria","Título","Solicitante","Responsável","Valor","Forma Pgto.","Status","Abertura","Conclusão"].map((h,i) =>
                      `<th style="text-align:${i===5?"right":"left"};padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`
                    ).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${rows.map(r => `
                  <tr style="border-bottom:1px solid var(--bd1);cursor:pointer"
                      onmouseover="this.style.background='var(--bg-hover)'"
                      onmouseout="this.style.background=''"
                      onclick="${r._isSol ? `finVerSolicitacao('${escapeHtmlAttr(String(r.id))}')` : `demAbrirDetalhe('${escapeHtmlAttr(String(r.id||r._row||""))}','fin-pagar')`}">
                    <td style="padding:8px 6px;font-size:10.5px;font-weight:700;font-family:var(--mono);color:${r._isSol?"var(--tx3)":"var(--blue)"};white-space:nowrap">${r._isSol ? "FS" : escapeHtml(r.numero_chamado||"—")}</td>
                    <td style="padding:8px 6px;color:var(--tx2);font-size:11px">${escapeHtml(r.subcategoria||"—")}</td>
                    <td style="padding:8px 6px;color:var(--tx1);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.titulo||"—")}</td>
                    <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${nomePropio(r.solicitante||r.solicitante_txt)||"—"}</td>
                    <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${nomePropio(r.responsavel||r.responsavel_txt)||"—"}</td>
                    <td style="padding:8px 6px;text-align:right;font-weight:700;color:var(--tx1);white-space:nowrap">${r.financial_data?.valor!=null?`R$ ${parseFloat(r.financial_data.valor).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"}</td>
                    <td style="padding:8px 6px;color:var(--tx2);font-size:11px;white-space:nowrap">${escapeHtml(r.financial_data?.forma_pagamento||"—")}</td>
                    <td style="padding:8px 6px">${_pillDem(r.status)}</td>
                    <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${fmtD(r.data_abertura||r.criado_em)}</td>
                    <td style="padding:8px 6px;color:var(--tx2);white-space:nowrap">${fmtD(r.data_conclusao)}</td>
                  </tr>`).join("")}
                </tbody>
              </table>
            </div>`
        }
      </div>`;
  }

  /* ── RENDER: A RECEBER ───────────────────────────────────── */

  function renderReceber() {
    const el = document.getElementById("fin-receber-content");
    if (!el) return;

    const pendentes = CONTAS_RECEBER.filter(c => c.status !== "recebido");
    const recebidas = CONTAS_RECEBER.filter(c => c.status === "recebido");
    const totalPend = pendentes.reduce((s, c) => s + c.valor, 0);
    const SEMANA    = em7dias();
    const vencBreve = pendentes.filter(c => c.venc <= SEMANA).length;

    el.innerHTML = `
      ${CONTAS_RECEBER.length > 0 ? `
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:var(--tealbg);color:var(--teal)">◎</div><div class="kpi-body"><div class="kpi-lbl">Total a receber</div><div class="kpi-val">${brl(totalPend)}</div><div class="kpi-d nu">${pendentes.length} pendentes</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(61,160,85,0.12);color:var(--gr)">✓</div><div class="kpi-body"><div class="kpi-lbl">Recebidos</div><div class="kpi-val">${recebidas.length}</div><div class="kpi-d up">neste período</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--goldbg);color:var(--gold)">⏰</div><div class="kpi-body"><div class="kpi-lbl">Vencendo em breve</div><div class="kpi-val">${vencBreve}</div><div class="kpi-d wa">próximos 7 dias</div></div></div>
      </div>` : ""}
      <div class="card">
        <div class="ctit">Contas a receber <span class="csub">(${CONTAS_RECEBER.length})</span></div>
        ${CONTAS_RECEBER.length === 0 ? EMPTY_STATE : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="border-bottom:1px solid var(--bd2)">
            ${["Descrição","Origem","Categoria","Valor","Vencimento","Status","Recebido em"].map((h,i) =>
              `<th style="text-align:${i===3?"right":"left"};padding:7px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase">${h}</th>`
            ).join("")}
          </tr></thead>
          <tbody>
            ${CONTAS_RECEBER.map(c => `
              <tr style="border-bottom:1px solid var(--bd1)" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
                <td style="padding:7px 6px;color:var(--tx1)">${c.desc}</td>
                <td style="padding:7px 6px;color:var(--tx2)">${c.orig}</td>
                <td style="padding:7px 6px;color:var(--tx2)">${c.cat}</td>
                <td style="padding:7px 6px;text-align:right;font-weight:700;color:var(--gr)">${brl(c.valor)}</td>
                <td style="padding:7px 6px;color:var(--tx2)">${fmtD(c.venc)}</td>
                <td style="padding:7px 6px">${pillStatus(c.status)}</td>
                <td style="padding:7px 6px;color:var(--tx2)">${fmtD(c.recebido) || "—"}</td>
              </tr>`).join("")}
          </tbody>
        </table></div>`}
      </div>`;
  }

  /* ── RENDER: CATEGORIAS ──────────────────────────────────── */

  function renderCategorias() {
    const el = document.getElementById("fin-cat-content");
    if (!el) return;

    const receitas = CATEGORIAS.filter(c => c.tipo === "receita");
    const despesas = CATEGORIAS.filter(c => c.tipo === "despesa");

    function lista(cats) {
      return cats.map(c => `
        <div class="trow">
          <div class="tdot" style="background:${c.tipo === "receita" ? "var(--gr)" : "var(--rose)"}"></div>
          <div class="tbody">
            <div class="ttitle">${c.nome}${c.ativa ? "" : ' <span style="font-size:10px;color:var(--tx3)">(inativa)</span>'}</div>
            <div class="tmeta">${c.desc || "Sem descrição"}</div>
          </div>
          <div class="tright">${pillStatus(c.ativa ? "confirmado" : "cancelado").replace("confirmado","ativa").replace("cancelado","inativa")}</div>
        </div>`).join("");
    }

    el.innerHTML = `
      <div class="g2">
        <div class="card">
          <div class="ctit" style="color:var(--gr)">↑ Categorias de receita <span class="csub">(${receitas.length})</span></div>
          ${receitas.length === 0 ? EMPTY_STATE : lista(receitas)}
        </div>
        <div class="card">
          <div class="ctit" style="color:var(--rose)">↓ Categorias de despesa <span class="csub">(${despesas.length})</span></div>
          ${despesas.length === 0 ? EMPTY_STATE : lista(despesas)}
        </div>
      </div>`;
  }

  /* ── RENDER: RELATÓRIOS ──────────────────────────────────── */

  function renderRelatorios() {
    const el = document.getElementById("fin-rel-content");
    if (!el) return;

    const porCat = {};
    LANCAMENTOS.forEach(l => {
      if (!porCat[l.cat]) porCat[l.cat] = { cat: l.cat, rec: 0, desp: 0, qtd: 0 };
      if (l.tipo === "receita") porCat[l.cat].rec  += l.valor;
      else                      porCat[l.cat].desp += l.valor;
      porCat[l.cat].qtd++;
    });
    const cats = Object.values(porCat).sort((a, b) => (b.rec + b.desp) - (a.rec + a.desp));
    const totalRec  = LANCAMENTOS.filter(l => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
    const totalDesp = LANCAMENTOS.filter(l => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);

    el.innerHTML = `
      ${LANCAMENTOS.length > 0 ? `
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:rgba(61,160,85,0.12);color:var(--gr)">↑</div><div class="kpi-body"><div class="kpi-lbl">Total receitas</div><div class="kpi-val">${brl(totalRec)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">↓</div><div class="kpi-body"><div class="kpi-lbl">Total despesas</div><div class="kpi-val">${brl(totalDesp)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--bluebg);color:var(--blue)">⚖</div><div class="kpi-body"><div class="kpi-lbl">Resultado geral</div><div class="kpi-val" style="color:var(--gr)">${brl(totalRec - totalDesp)}</div></div></div>
      </div>` : ""}
      <div class="card">
        <div class="ctit">Relatório por categoria
          <span style="float:right">
            <button class="tbt" onclick="alert('Exportação disponível na próxima versão do módulo')" style="font-size:11px;padding:4px 10px;margin-top:-2px">⬇ Exportar</button>
          </span>
        </div>
        ${cats.length === 0 ? EMPTY_STATE : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="border-bottom:1px solid var(--bd2)">
            ${["Categoria","Receitas","Despesas","Lançamentos"].map((h,i) =>
              `<th style="text-align:${i===0?"left":"right"};padding:7px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase">${h}</th>`
            ).join("")}
          </tr></thead>
          <tbody>
            ${cats.map(c => `
              <tr style="border-bottom:1px solid var(--bd1)" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
                <td style="padding:7px 6px;color:var(--tx1);font-weight:500">${c.cat}</td>
                <td style="padding:7px 6px;text-align:right;color:var(--gr)">${c.rec > 0 ? "+"+brl(c.rec) : "—"}</td>
                <td style="padding:7px 6px;text-align:right;color:var(--rose)">${c.desp > 0 ? "−"+brl(c.desp) : "—"}</td>
                <td style="padding:7px 6px;text-align:right;color:var(--tx2)">${c.qtd}</td>
              </tr>`).join("")}
            <tr style="border-top:2px solid var(--bd2);font-weight:700">
              <td style="padding:8px 6px;color:var(--tx1)">Total</td>
              <td style="padding:8px 6px;text-align:right;color:var(--gr)">+${brl(totalRec)}</td>
              <td style="padding:8px 6px;text-align:right;color:var(--rose)">−${brl(totalDesp)}</td>
              <td style="padding:8px 6px;text-align:right;color:var(--tx1)">${LANCAMENTOS.length}</td>
            </tr>
          </tbody>
        </table></div>`}
      </div>`;
  }

  /* ── RENDER: AUDITORIA ───────────────────────────────────── */

  function renderAuditoria() {
    const el = document.getElementById("fin-aud-content");
    if (!el) return;

    el.innerHTML = `
      <div class="card">
        <div class="ctit">Histórico de ações financeiras <span class="csub">(${AUDITORIA.length} registros)</span></div>
        ${AUDITORIA.length === 0 ? EMPTY_STATE : [...AUDITORIA].sort((a, b) => b.data.localeCompare(a.data)).map(a => `
          <div class="trow">
            <div class="tdot" style="background:${acaoColor(a.acao)}"></div>
            <div class="tbody">
              <div class="ttitle">${a.desc}</div>
              <div class="tmeta">${a.usuario} · ${fmtD(a.data)} ${a.data.split("T")[1]?.substring(0,5)||""} · ${TIPO_ICON[a.tipo]||""} ${a.tipo.replace(/_/g," ")}</div>
            </div>
            <div class="tright">
              <span style="font-size:10.5px;color:${acaoColor(a.acao)};font-weight:600">${a.acao}</span>
            </div>
          </div>`).join("")}
      </div>`;
  }

  /* ── AÇÕES: DADOS BANCÁRIOS / CNAB ─────────────────────── */

  function _finCampo(id) {
    return document.getElementById(id)?.value?.trim() || "";
  }

  function _finModalCampo(id, label, value, placeholder, extra) {
    return `
      <div style="${extra || ""}">
        <label class="field-lbl">${label}</label>
        <input id="${id}" value="${escapeHtmlAttr(value || "")}" placeholder="${escapeHtmlAttr(placeholder || "")}" style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
      </div>`;
  }

  window.finVerSolicitacao = function(id) {
    const r = (_SOLICITACOES || []).find(x => String(x.id) === String(id));
    if (!r) return;
    const _fmtVal = v => v != null ? `R$ ${parseFloat(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}` : "—";
    const _fmtDt  = iso => { if (!iso) return "—"; const d = iso.slice(0,10).split("-"); return `${d[2]}/${d[1]}/${d[0]}`; };
    let modal = document.getElementById("fin-sol-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "fin-sol-modal";
      modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:355;display:flex;align-items:center;justify-content:center;padding:18px";
      modal.onclick = ev => { if (ev.target === modal) modal.remove(); };
      document.body.appendChild(modal);
    }
    const capStatus = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : "Aberta";
    const isPago = ["pago","cancelado"].includes((r.status||"").toLowerCase());
    modal.innerHTML = `
      <div style="width:min(520px,96vw);background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:20px">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px">
          <div style="flex:1">
            <div class="ctit" style="margin:0">${escapeHtml(r.finalidade || r.descricao || "Solicitação financeira")}</div>
            <div style="font-size:11px;color:var(--tx3);margin-top:3px">${r.fornecedor ? escapeHtml(r.fornecedor) : "Solicitação direta"}</div>
          </div>
          <button class="tbt" onclick="document.getElementById('fin-sol-modal').remove()">Fechar</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;font-size:12.5px">
          <div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Valor</div><div style="font-weight:700;color:var(--tx1)">${_fmtVal(r.valor)}</div></div>
          <div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Vencimento</div><div>${_fmtDt(r.vencimento)}</div></div>
          <div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Solicitante</div><div>${escapeHtml(r.solicitante||"—")}</div></div>
          <div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Status</div><div>${capStatus(r.status)}</div></div>
          <div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Forma de pagamento</div><div>${escapeHtml(r.forma_pagamento||"—")}</div></div>
          <div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Criado em</div><div>${_fmtDt(r.created_at)}</div></div>
          ${r.pago_em ? `<div><div style="font-size:10px;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Pago em</div><div>${_fmtDt(r.pago_em)}</div></div>` : ""}
          ${r.descricao && r.descricao !== r.finalidade ? `<div style="grid-column:1/-1"><div style="font-size:10px;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Descrição</div><div>${escapeHtml(r.descricao)}</div></div>` : ""}
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid var(--bd1);padding-top:14px">
          <button class="tbt" onclick="document.getElementById('fin-sol-modal').remove();finEditarDadosCnab('${escapeHtmlAttr(String(id))}')">Dados CNAB</button>
          ${!isPago ? `<button class="tbt pri" onclick="document.getElementById('fin-sol-modal').remove();finMarcarPago('${escapeHtmlAttr(String(id))}')">✓ Marcar como pago</button>` : ""}
        </div>
      </div>`;
  };

  window.finTipoOperacaoChange = function() {
    const tipo = _finCampo("fin-cnab-tipo");
    const ted = document.getElementById("fin-cnab-ted");
    const pix = document.getElementById("fin-cnab-pix");
    const cod = document.getElementById("fin-cnab-codigo");
    if (ted) ted.style.display = tipo === "transferencia" ? "grid" : "none";
    if (pix) pix.style.display = tipo === "pix" ? "grid" : "none";
    if (cod) cod.style.display = ["boleto", "tributo"].includes(tipo) ? "block" : "none";
  };

  window.finEditarDadosCnab = function(id) {
    const r = (_SOLICITACOES || []).find(x => String(x.id) === String(id));
    if (!r) return;
    let modal = document.getElementById("fin-cnab-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "fin-cnab-modal";
      modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:355;display:flex;align-items:center;justify-content:center;padding:18px";
      modal.onclick = ev => { if (ev.target === modal) modal.remove(); };
      document.body.appendChild(modal);
    }
    const tipo = r.tipo_operacao || "";
    modal.innerHTML = `
      <div style="width:min(760px,96vw);max-height:88vh;overflow:auto;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:20px">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px">
          <div><div class="ctit" style="margin:0">Dados bancários / CNAB</div><div style="font-size:11.5px;color:var(--tx3);margin-top:3px">${escapeHtml(r.fornecedor || r.finalidade || "Solicitação financeira")}</div></div>
          <button class="tbt" style="margin-left:auto" onclick="document.getElementById('fin-cnab-modal').remove()">Fechar</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label class="field-lbl">Tipo de operação</label>
            <select id="fin-cnab-tipo" onchange="finTipoOperacaoChange()" style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
              <option value="">Sem CNAB</option>
              <option value="transferencia" ${tipo === "transferencia" ? "selected" : ""}>Transferência TED</option>
              <option value="pix" ${tipo === "pix" ? "selected" : ""}>PIX</option>
              <option value="boleto" ${tipo === "boleto" ? "selected" : ""}>Boleto</option>
              <option value="tributo" ${tipo === "tributo" ? "selected" : ""}>Tributo</option>
            </select>
          </div>
          ${_finModalCampo("fin-cnab-nome", "Favorecido — nome", r.favorecido_nome || r.fornecedor || "", "Nome completo / razão social")}
          ${_finModalCampo("fin-cnab-doc", "Favorecido — CPF/CNPJ", r.favorecido_cpf_cnpj || "", "Somente números")}
        </div>
        <div id="fin-cnab-ted" style="display:${tipo === "transferencia" ? "grid" : "none"};grid-template-columns:1fr 1fr 80px 1fr 80px;gap:12px;margin-bottom:12px">
          ${_finModalCampo("fin-cnab-banco", "Banco", r.favorecido_banco || "", "237")}
          ${_finModalCampo("fin-cnab-ag", "Agência", r.favorecido_agencia || "", "0000")}
          ${_finModalCampo("fin-cnab-ag-dv", "DV", r.favorecido_agencia_dv || "", "0")}
          ${_finModalCampo("fin-cnab-conta", "Conta", r.favorecido_conta || "", "000000")}
          ${_finModalCampo("fin-cnab-conta-dv", "DV", r.favorecido_conta_dv || "", "0")}
        </div>
        <div id="fin-cnab-pix" style="display:${tipo === "pix" ? "grid" : "none"};grid-template-columns:180px 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label class="field-lbl">Tipo de chave PIX</label>
            <select id="fin-cnab-pix-tipo" style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
              ${["cpf","cnpj","telefone","email","evp"].map(t => `<option value="${t}" ${String(r.favorecido_pix_tipo || "") === t ? "selected" : ""}>${t.toUpperCase()}</option>`).join("")}
            </select>
          </div>
          ${_finModalCampo("fin-cnab-pix-chave", "Chave PIX", r.favorecido_pix_chave || "", "CPF, CNPJ, telefone, e-mail ou EVP")}
        </div>
        <div id="fin-cnab-codigo" style="display:${["boleto", "tributo"].includes(tipo) ? "block" : "none"};margin-bottom:12px">
          ${_finModalCampo("fin-cnab-cod-barras", "Código de barras / linha digitável", r.codigo_barras || r.codigo_pagamento || "", "Linha digitável ou código de barras")}
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;border-top:1px solid var(--bd1);padding-top:14px">
          <button class="tbt" onclick="document.getElementById('fin-cnab-modal').remove()">Cancelar</button>
          <button class="tbt pri" id="fin-cnab-save" onclick="finSalvarDadosCnab('${escapeHtmlAttr(id)}')">Salvar dados</button>
        </div>
      </div>`;
  };

  window.finSalvarDadosCnab = async function(id) {
    const btn = document.getElementById("fin-cnab-save");
    const old = btn?.textContent || "";
    if (btn) { btn.disabled = true; btn.textContent = "Salvando..."; }
    try {
      const tipo = _finCampo("fin-cnab-tipo");
      const payload = {
        tipo_operacao: tipo || null,
        favorecido_nome: _finCampo("fin-cnab-nome") || null,
        favorecido_cpf_cnpj: _finCampo("fin-cnab-doc").replace(/\D/g, "") || null,
        favorecido_banco: _finCampo("fin-cnab-banco").replace(/\D/g, "") || null,
        favorecido_agencia: _finCampo("fin-cnab-ag").replace(/\D/g, "") || null,
        favorecido_agencia_dv: _finCampo("fin-cnab-ag-dv") || null,
        favorecido_conta: _finCampo("fin-cnab-conta").replace(/\D/g, "") || null,
        favorecido_conta_dv: _finCampo("fin-cnab-conta-dv") || null,
        favorecido_pix_tipo: _finCampo("fin-cnab-pix-tipo") || null,
        favorecido_pix_chave: _finCampo("fin-cnab-pix-chave") || null,
        codigo_barras: _finCampo("fin-cnab-cod-barras").replace(/\D/g, "") || null,
        updated_at: new Date().toISOString()
      };
      const sb = _sbClient();
      const { error } = await sb.from("financeiro_solicitacoes").update(payload).eq("id", id);
      if (error) throw error;
      _SOLICITACOES = null;
      document.getElementById("fin-cnab-modal")?.remove();
      if (typeof T === "function") T("Dados CNAB salvos", "Solicitação atualizada.");
      await renderPagar();
    } catch(e) {
      if (typeof T === "function") T("Erro ao salvar", e.message);
      else alert("Erro: " + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = old; }
    }
  };

  /* ── AÇÕES: ANEXOS ───────────────────────────────────────── */

  window.finAnexar = function(solicitacaoId, tipo) {
    const input = document.createElement("input");
    input.type   = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      // Feedback visual
      const btnSel = document.querySelector(`[onclick="finAnexar('${solicitacaoId}','${tipo}')"]`);
      const textoOrig = btnSel ? btnSel.textContent : "";
      if (btnSel) { btnSel.textContent = "Enviando..."; btnSel.disabled = true; }
      try {
        await _uploadAnexoFin(file, solicitacaoId, tipo);
        _ANEXOS = null;
        await renderPagar();
      } catch(e) {
        if (btnSel) { btnSel.textContent = textoOrig; btnSel.disabled = false; }
        if (typeof T === "function") T("Erro no upload", e.message);
        else alert("Erro: " + e.message);
      }
    };
    input.click();
  };

  window.finAbrirAnexo = async function (storagePath) {
    const sb = _sbClient();
    if (!sb) return;
    try {
      const { data, error } = await sb.storage
        .from("financial-documents")
        .createSignedUrl(storagePath, 3600);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      if (typeof T === "function") T("Erro ao abrir arquivo", e.message);
    }
  };

  /* ── AÇÃO: MARCAR COMO PAGO ──────────────────────────────── */

  window.finMarcarPago = async function (id) {
    if (!confirm("Marcar esta solicitação como paga?")) return;
    try {
      const sb = _sbClient();
      const { error } = await sb
        .from("financeiro_solicitacoes")
        .update({ status: "pago", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      _SOLICITACOES = null;
      _ANEXOS       = null;
      await renderPagar();
    } catch (e) {
      alert("Erro ao atualizar: " + (e.message || e));
    }
  };

  /* ── RENDER: DÍZIMOS E OFERTAS ──────────────────────────── */

  const _MESES_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

  function _fmtMes(isoMonth) {
    if (!isoMonth) return "—";
    const [y, m] = isoMonth.split("-");
    return `${_MESES_PT[parseInt(m,10)-1]}/${y}`;
  }

  function _fmtData(iso) {
    if (!iso) return "—";
    const d = iso.length >= 10 ? iso.slice(0,10) : iso;
    const [y, m, dia] = d.split("-");
    return `${dia}/${m}/${y}`;
  }

  async function renderDizimosOfertas() {
    const el = document.getElementById("fin-dizof-content");
    if (!el) return;
    el.innerHTML = `<div style="padding:24px;color:var(--tx3);font-size:13px;display:flex;align-items:center;gap:8px"><span style="display:inline-block;width:13px;height:13px;border:2px solid var(--gr);border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite"></span> Carregando...</div>`;

    try {
      if (!_DIZOF_CACHE) {
        const base = typeof apiBaseUrl === "function" ? apiBaseUrl() : "";
        const hdrs = typeof apiHeaders === "function" ? apiHeaders() : {};
        const res  = await fetch(
          `${base}/rest/v1/v_demandas?area=eq.Financeiro&subcategoria=in.(D%C3%ADzimos,Ofertas)&order=criado_em.desc&limit=500`,
          { headers: hdrs }
        );
        _DIZOF_CACHE = res.ok ? await res.json() : [];
      }

      const tab      = _finDizTab;
      const subcat   = tab === "dizimos" ? "Dízimos" : "Ofertas";
      const filtrados = _DIZOF_CACHE.filter(r => r.subcategoria === subcat);

      const hoje     = new Date();
      const mesAtual = hoje.toISOString().slice(0, 7);
      const anoAtual = String(hoje.getFullYear());

      const doMes = filtrados.filter(r => (r.criado_em || "").startsWith(mesAtual));
      const doAno = filtrados.filter(r => (r.criado_em || "").startsWith(anoAtual));
      const comComp = filtrados.filter(r => r.financial_data?.comprovante || r.financial_data?.nota_fiscal);

      const soma = arr => arr.reduce((s, r) => s + (r.financial_data?.valor || 0), 0);
      const fmtBRL = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

      const linhas = filtrados.length
        ? filtrados.map(r => {
            const fd  = r.financial_data || {};
            const ref = tab === "dizimos"
              ? _fmtMes(fd.mes_referencia)
              : _fmtData(fd.data_oferta || r.criado_em);
            const temComp = !!(fd.comprovante?.storage_path || fd.nota_fiscal?.storage_path);
            return `<tr style="border-bottom:1px solid var(--bd1);cursor:pointer"
              onclick="window.demAbrirDetalhe&&demAbrirDetalhe('${r.id||r._row}','fin-dizimos-ofertas')"
              onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
              <td style="padding:9px 10px;font-size:12px;color:var(--tx1);font-weight:500;white-space:nowrap">${escapeHtml(nomePropio(r.solicitante||r.solicitante_txt)||"—")}</td>
              <td style="padding:9px 10px;font-size:12px;color:var(--tx2)">${ref}</td>
              <td style="padding:9px 10px;font-size:12px;font-weight:700;color:var(--tx1);font-variant-numeric:tabular-nums">${fd.valor ? fmtBRL(fd.valor) : "—"}</td>
              <td style="padding:9px 10px;font-size:11px;color:${temComp?"var(--teal)":"var(--tx3)"}">${temComp?"📎 Anexado":"—"}</td>
              <td style="padding:9px 10px">${_pillDem(r.status === "CONCLUIDA" ? "PAGO" : r.status)}</td>
              <td style="padding:9px 10px;font-size:11px;color:var(--tx3)">${_fmtData(r.criado_em)}</td>
            </tr>`;
          }).join("")
        : `<tr><td colspan="6" style="padding:32px;text-align:center;color:var(--tx3);font-size:12.5px">Nenhum registro encontrado</td></tr>`;

      el.innerHTML = `
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:14px">
          <div class="sni${tab==="dizimos"?" on":""}" onclick="window.finSetDizTab('dizimos')">Dízimos</div>
          <div class="sni-sep"></div>
          <div class="sni${tab==="ofertas"?" on":""}" onclick="window.finSetDizTab('ofertas')">Ofertas</div>
        </div>

        <div class="kpis" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;background:var(--bg-card);border:1px solid var(--bd1);border-radius:var(--rl);overflow:hidden;margin-bottom:16px">
          <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
            <div class="kpi-ico" style="background:rgba(61,160,85,.1);color:var(--gr)">📅</div>
            <div class="kpi-body"><div class="kpi-lbl">Total do mês</div><div class="kpi-val">${fmtBRL(soma(doMes))}</div><div class="kpi-d nu">${doMes.length} registro${doMes.length!==1?"s":""}</div></div>
          </div>
          <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
            <div class="kpi-ico" style="background:rgba(61,160,85,.1);color:var(--gr)">📆</div>
            <div class="kpi-body"><div class="kpi-lbl">Total do ano</div><div class="kpi-val">${fmtBRL(soma(doAno))}</div><div class="kpi-d nu">${doAno.length} registro${doAno.length!==1?"s":""}</div></div>
          </div>
          <div class="kpi" style="border-radius:0;border:none">
            <div class="kpi-ico" style="background:rgba(42,181,192,.1);color:var(--teal)">📎</div>
            <div class="kpi-body"><div class="kpi-lbl">Com comprovante</div><div class="kpi-val">${comComp.length}</div><div class="kpi-d nu">de ${filtrados.length} total</div></div>
          </div>
        </div>

        <div class="card" style="padding:0;overflow:hidden">
          <div style="padding:12px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between">
            <div class="ctit" style="margin:0">${subcat}</div>
            <span class="cact" style="font-size:11px" onclick="_DIZOF_CACHE=null;renderDizimosOfertas()">↻ Atualizar</span>
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="background:var(--bg-surface)">
                  <th style="padding:8px 10px;font-size:10.5px;font-weight:700;color:var(--tx3);text-align:left;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap">Membro</th>
                  <th style="padding:8px 10px;font-size:10.5px;font-weight:700;color:var(--tx3);text-align:left;text-transform:uppercase;letter-spacing:.05em">${tab==="dizimos"?"Mês ref.":"Data"}</th>
                  <th style="padding:8px 10px;font-size:10.5px;font-weight:700;color:var(--tx3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Valor</th>
                  <th style="padding:8px 10px;font-size:10.5px;font-weight:700;color:var(--tx3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Comprovante</th>
                  <th style="padding:8px 10px;font-size:10.5px;font-weight:700;color:var(--tx3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Status</th>
                  <th style="padding:8px 10px;font-size:10.5px;font-weight:700;color:var(--tx3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Enviado em</th>
                </tr>
              </thead>
              <tbody>${linhas}</tbody>
            </table>
          </div>
        </div>`;
    } catch (e) {
      el.innerHTML = `<div class="card" style="color:var(--rose)">Erro ao carregar: ${escapeHtml(e.message)}</div>`;
    }
  }

  /* ── DÍZIMOS — módulo dedicado ───────────────────────────── */

  let _DIZ_CACHE = null;

  async function renderDizimos() {
    const el = document.getElementById("fin-dizimos-content");
    if (!el) return;
    el.innerHTML = `<div style="padding:24px;color:var(--tx3);font-size:13px;display:flex;align-items:center;gap:8px"><span style="display:inline-block;width:13px;height:13px;border:2px solid var(--gr);border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite"></span> Carregando...</div>`;

    try {
      if (!_DIZ_CACHE) {
        const base = typeof apiBaseUrl === "function" ? apiBaseUrl() : "";
        const hdrs = typeof apiHeaders === "function" ? apiHeaders() : {};
        const res  = await fetch(
          `${base}/rest/v1/v_demandas?area=eq.Financeiro&subcategoria=eq.D%C3%ADzimos&order=criado_em.desc&limit=2000`,
          { headers: hdrs }
        );
        _DIZ_CACHE = res.ok ? await res.json() : [];
      }

      const todos = _DIZ_CACHE;
      const hoje  = new Date();
      const mesAtual = hoje.toISOString().slice(0, 7);
      const anoAtual = String(hoje.getFullYear());
      const h12mAtras = new Date(hoje); h12mAtras.setMonth(h12mAtras.getMonth() - 12);

      const fmtBRL  = v => (+v || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
      const soma    = arr => arr.reduce((s, r) => s + (r.financial_data?.valor || 0), 0);
      const doMes   = todos.filter(r => (r.criado_em || "").startsWith(mesAtual));
      const doAno   = todos.filter(r => (r.criado_em || "").startsWith(anoAtual));

      // Agrupar por dizimista
      const mapa = {};
      todos.forEach(r => {
        const key = r.solicitante_id || r.solicitante || "—";
        if (!mapa[key]) mapa[key] = { nome: r.solicitante || "—", id: r.solicitante_id, registros: [] };
        mapa[key].registros.push(r);
      });

      const dizimistas = Object.values(mapa).map(d => {
        const ult     = d.registros[0];
        const totalAno = soma(d.registros.filter(r => (r.criado_em||"").startsWith(anoAtual)));
        const recentes = d.registros.filter(r => new Date(r.criado_em) >= h12mAtras);
        const mesesUnicos = new Set(recentes.map(r => (r.criado_em||"").slice(0,7))).size;
        return { ...d, ult, totalAno, mesesUnicos };
      }).sort((a, b) => new Date(b.ult?.criado_em||0) - new Date(a.ult?.criado_em||0));

      const ativos = dizimistas.filter(d => d.mesesUnicos >= 1);

      const badgeReg = n => {
        if (n >= 10) return `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:rgba(61,160,85,.15);color:var(--gr)">Regular</span>`;
        if (n >= 6)  return `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:rgba(42,181,192,.15);color:var(--teal)">Frequente</span>`;
        if (n >= 1)  return `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:rgba(201,168,76,.15);color:var(--amber)">Irregular</span>`;
        return `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:var(--bg-surface);color:var(--tx3)">Inativo</span>`;
      };

      // Resumo mensal (últimos 12 meses)
      const meses12 = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        const label = d.toLocaleDateString("pt-BR", { month:"short", year:"2-digit" });
        const regs = todos.filter(r => (r.criado_em||"").startsWith(key));
        meses12.push({ key, label, total: soma(regs), qtd: regs.length });
      }

      const maxTotal = Math.max(...meses12.map(m => m.total), 1);

      el.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div></div>
          <button class="pbt" onclick="_DIZ_CACHE=null;renderDizimos()">↻ Atualizar</button>
        </div>

        <div class="kpis" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;background:var(--bg-card);border:1px solid var(--bd1);border-radius:var(--rl);overflow:hidden;margin-bottom:20px">
          <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
            <div class="kpi-ico" style="background:rgba(61,160,85,.1);color:var(--gr)">📅</div>
            <div class="kpi-body"><div class="kpi-lbl">Total do mês</div><div class="kpi-val">${fmtBRL(soma(doMes))}</div><div class="kpi-d nu">${doMes.length} reg.</div></div>
          </div>
          <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
            <div class="kpi-ico" style="background:rgba(61,160,85,.1);color:var(--gr)">📆</div>
            <div class="kpi-body"><div class="kpi-lbl">Total do ano</div><div class="kpi-val">${fmtBRL(soma(doAno))}</div><div class="kpi-d nu">${doAno.length} reg.</div></div>
          </div>
          <div class="kpi" style="border-radius:0;border:none;border-right:1px solid var(--bd1)">
            <div class="kpi-ico" style="background:rgba(42,181,192,.1);color:var(--teal)">👥</div>
            <div class="kpi-body"><div class="kpi-lbl">Dizimistas ativos</div><div class="kpi-val">${ativos.length}</div><div class="kpi-d nu">últ. 12 meses</div></div>
          </div>
          <div class="kpi" style="border-radius:0;border:none">
            <div class="kpi-ico" style="background:rgba(61,160,85,.1);color:var(--gr)">⌀</div>
            <div class="kpi-body"><div class="kpi-lbl">Média/dizimista</div><div class="kpi-val">${ativos.length ? fmtBRL(soma(doAno)/ativos.length) : "—"}</div><div class="kpi-d nu">no ano</div></div>
          </div>
        </div>

        <div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">
          <div style="padding:12px 16px;border-bottom:1px solid var(--bd1)">
            <div class="ctit" style="margin:0">Arrecadação mensal</div>
          </div>
          <div style="padding:16px 16px 8px;display:flex;align-items:flex-end;gap:5px;height:90px">
            ${meses12.map(m => {
              const h = Math.max(4, Math.round((m.total / maxTotal) * 64));
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:default" title="${m.label}: ${fmtBRL(m.total)} (${m.qtd} reg.)">
                <div style="width:100%;height:${h}px;background:${m.key===mesAtual?'var(--gr)':'rgba(61,160,85,.35)'};border-radius:3px 3px 0 0;transition:opacity .15s" onmouseover="this.style.opacity='.7'" onmouseout="this.style.opacity='1'"></div>
                <div style="font-size:9px;color:var(--tx3);white-space:nowrap">${m.label}</div>
              </div>`;
            }).join("")}
          </div>
        </div>

        <div class="card" style="padding:0;overflow:hidden">
          <div style="padding:12px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between">
            <div class="ctit" style="margin:0">Dizimistas</div>
            <span style="font-size:11px;color:var(--tx3)">${dizimistas.length} pessoa${dizimistas.length!==1?"s":""}</span>
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="background:var(--bg-surface)">
                  <th style="padding:8px 12px;font-size:10.5px;font-weight:700;color:var(--tx3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Membro</th>
                  <th style="padding:8px 12px;font-size:10.5px;font-weight:700;color:var(--tx3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Último dízimo</th>
                  <th style="padding:8px 12px;font-size:10.5px;font-weight:700;color:var(--tx3);text-align:right;text-transform:uppercase;letter-spacing:.05em">Total no ano</th>
                  <th style="padding:8px 12px;font-size:10.5px;font-weight:700;color:var(--tx3);text-align:center;text-transform:uppercase;letter-spacing:.05em">Meses/12</th>
                  <th style="padding:8px 12px;font-size:10.5px;font-weight:700;color:var(--tx3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Regularidade</th>
                </tr>
              </thead>
              <tbody>
                ${dizimistas.length ? dizimistas.map(d => {
                  const fd   = d.ult?.financial_data || {};
                  const data = _fmtData(fd.mes_referencia || d.ult?.criado_em);
                  return `<tr style="border-bottom:1px solid var(--bd1);cursor:pointer"
                    onclick="window.demAbrirDetalhe&&demAbrirDetalhe('${d.ult?.id||""}','fin-dizimos')"
                    onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
                    <td style="padding:10px 12px;font-size:12.5px;font-weight:500;color:var(--tx1)">${escapeHtml(nomePropio(d.nome)||"—")}</td>
                    <td style="padding:10px 12px;font-size:12px;color:var(--tx2)">${data}</td>
                    <td style="padding:10px 12px;font-size:12px;font-weight:700;color:var(--tx1);text-align:right;font-variant-numeric:tabular-nums">${d.totalAno ? fmtBRL(d.totalAno) : "—"}</td>
                    <td style="padding:10px 12px;font-size:12px;color:var(--tx2);text-align:center">${d.mesesUnicos}/12</td>
                    <td style="padding:10px 12px">${badgeReg(d.mesesUnicos)}</td>
                  </tr>`;
                }).join("") : `<tr><td colspan="5" style="padding:32px;text-align:center;color:var(--tx3);font-size:12.5px">Nenhum dízimo registrado</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>`;
    } catch (e) {
      el.innerHTML = `<div class="card" style="color:var(--rose)">Erro ao carregar: ${escapeHtml(e.message)}</div>`;
    }
  }

  window.finSetDizTab = function(tab) {
    _finDizTab = tab;
    renderDizimosOfertas();
  };

  window.finRegistrarDizimo = function() {
    if (window.abrirModalNovaDemanda) abrirModalNovaDemanda("Financeiro");
    // Pre-select Dízimos after modal opens
    setTimeout(() => {
      const cat = document.getElementById("dem-f-cat");
      const sub = document.getElementById("dem-f-sub");
      if (cat && sub) {
        cat.value = "Financeiro";
        if (window.demOnCatChange) demOnCatChange();
        setTimeout(() => { if (sub) { sub.value = "Dízimos"; if (window.demOnSubChange) demOnSubChange(); } }, 100);
      }
    }, 50);
  };

  window.finRegistrarOferta = function() {
    if (window.abrirModalNovaDemanda) abrirModalNovaDemanda("Financeiro");
    setTimeout(() => {
      const cat = document.getElementById("dem-f-cat");
      const sub = document.getElementById("dem-f-sub");
      if (cat && sub) {
        cat.value = "Financeiro";
        if (window.demOnCatChange) demOnCatChange();
        setTimeout(() => { if (sub) { sub.value = "Ofertas"; if (window.demOnSubChange) demOnSubChange(); } }, 100);
      }
    }, 50);
  };

  /* ── HOOK INTO go() ──────────────────────────────────────── */

  document.addEventListener("sipen:navigate", ({ detail: { id } }) => {
    const MAP = {
      "fin-dash":            () => renderDash(),
      "fin-lancamentos":     renderLancamentos,
      "fin-fluxo":           renderFluxo,
      "fin-pagar":           () => renderPagar(),
      "fin-receber":         renderReceber,
      "fin-categorias":      renderCategorias,
      "fin-relatorios":      renderRelatorios,
      "fin-auditoria":       renderAuditoria,
      "fin-dizimos-ofertas": renderDizimosOfertas,
      "fin-dizimos":         renderDizimos,
    };
    if (MAP[id]) MAP[id]();
  });

  window.finRecarregarDash = async function() { _DEM_FIN_CACHE = null; await renderDash(); };
  window.finFiltrarLanc    = renderLancamentos;
  window.finFiltrarPagar   = () => renderPagar();

  let _pagarDebTimer = null;
  window.finDebouncePagar = function() {
    clearTimeout(_pagarDebTimer);
    _pagarDebTimer = setTimeout(() => finFiltrarPagar(), 300);
  };

  if(typeof VIEW_AUTOLOAD!=='undefined'){
    VIEW_AUTOLOAD['fin-dash']={fn: renderDash};
  }

})();
