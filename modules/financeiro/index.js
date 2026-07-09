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
    "CONCLUIDA": "Concluída", "CANCELADA": "Cancelada",
  };
  const _DEM_STATUS_CFG = {
    "Aberta":                { bg:"rgba(74,156,245,.12)",  cl:"var(--blue)"   },
    "Em Análise":            { bg:"rgba(212,168,67,.12)",  cl:"var(--gold)"   },
    "Em Andamento":          { bg:"rgba(139,111,212,.12)", cl:"var(--violet)" },
    "Aguardando Pagamento":  { bg:"rgba(234,179,8,.12)",   cl:"var(--amber)"  },
    "Pendente":              { bg:"rgba(224,138,42,.12)",  cl:"var(--amber)"  },
    "Concluída":             { bg:"rgba(58,170,92,.12)",   cl:"var(--gr)"     },
    "Cancelada":             { bg:"rgba(90,96,104,.15)",   cl:"var(--tx3)"    },
  };

  function _demLabel(st)  { return _DEM_STATUS_LABEL[st] || st || "Aberta"; }
  function _pillDem(st) {
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

    el.innerHTML = '<div class="empty-state">Carregando solicitações...</div>';
    await Promise.all([_loadSolicitacoes(), _loadAnexos()]);

    const H   = hoje();
    const S7  = em7dias();
    const fstatus = document.getElementById("fin-pagar-fstatus")?.value || "";
    const fcat    = document.getElementById("fin-pagar-fcat")?.value    || "";
    const fbusca  = (document.getElementById("fin-pagar-fbusca")?.value || "").toLowerCase();

    let rows = [...(_SOLICITACOES || [])];
    if (fstatus === "atrasado") {
      rows = rows.filter(r => !["pago","cancelado"].includes(r.status) && r.vencimento && r.vencimento < H);
    } else if (fstatus) {
      rows = rows.filter(r => r.status === fstatus);
    }
    if (fcat)   rows = rows.filter(r => r.categoria === fcat);
    if (fbusca) rows = rows.filter(r =>
      (r.fornecedor   || "").toLowerCase().includes(fbusca) ||
      (r.finalidade   || "").toLowerCase().includes(fbusca) ||
      (r.solicitante  || "").toLowerCase().includes(fbusca) ||
      (r.observacoes  || "").toLowerCase().includes(fbusca)
    );

    const all      = _SOLICITACOES || [];
    const emAberto = all.filter(r => !["pago","cancelado"].includes(r.status));
    const atrasadas= emAberto.filter(r => r.vencimento && r.vencimento < H);
    const vencBrv  = emAberto.filter(r => r.vencimento && r.vencimento >= H && r.vencimento <= S7);
    const totalAb  = emAberto.reduce((s, r) => s + Number(r.valor || 0), 0);

    const cats = [...new Set(all.map(r => r.categoria).filter(Boolean))].sort();

    el.innerHTML = `
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">!</div><div class="kpi-body"><div class="kpi-lbl">Total em aberto</div><div class="kpi-val">${brl(totalAb)}</div><div class="kpi-d dn">${emAberto.length} solicitações</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">✕</div><div class="kpi-body"><div class="kpi-lbl">Atrasadas</div><div class="kpi-val">${atrasadas.length}</div><div class="kpi-d dn">${brl(atrasadas.reduce((s, r) => s + Number(r.valor || 0), 0))}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--goldbg);color:var(--gold)">⏰</div><div class="kpi-body"><div class="kpi-lbl">Vencendo em 7 dias</div><div class="kpi-val">${vencBrv.length}</div><div class="kpi-d wa">${brl(vencBrv.reduce((s, r) => s + Number(r.valor || 0), 0))}</div></div></div>
      </div>

      <div class="card">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
          <select id="fin-pagar-fstatus" onchange="finFiltrarPagar()" style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:6px 10px;outline:none">
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="atrasado">Atrasado</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <select id="fin-pagar-fcat" onchange="finFiltrarPagar()" style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:6px 10px;outline:none">
            <option value="">Todas as categorias</option>
            ${cats.map(c => `<option value="${c}">${c}</option>`).join("")}
          </select>
          <input id="fin-pagar-fbusca" type="text" placeholder="Buscar fornecedor, finalidade..." oninput="finDebouncePagar()" style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:6px 10px;outline:none;min-width:200px">
          <span style="font-size:11px;color:var(--tx3);margin-left:auto">${rows.length} resultado${rows.length !== 1 ? "s" : ""}</span>
        </div>

        ${rows.length === 0
          ? '<div class="empty-state">Nenhuma solicitação encontrada.</div>'
          : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr style="border-bottom:1px solid var(--bd2)">
                ${["Fornecedor","Finalidade","Valor","Forma","Código","CNAB","Vencimento","Solicitante","Categoria","Status","",""].map((h,i) =>
                  `<th style="text-align:${i===2?"right":"left"};padding:7px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`
                ).join("")}
              </tr></thead>
              <tbody>
                ${rows.map(r => {
                  const st     = _statusSolicitacao(r);
                  const anexos = (_ANEXOS || {})[r.id] || [];
                  const boleto = anexos.find(a => a.tipo_arquivo === "boleto");
                  const nf     = anexos.find(a => a.tipo_arquivo === "nota_fiscal");
                  const pago   = ["pago","cancelado"].includes(r.status);
                  const rowBg  = st === "atrasado"
                    ? "background:rgba(224,85,85,.04)"
                    : (r.vencimento && r.vencimento >= H && r.vencimento <= S7 && !pago)
                      ? "background:rgba(212,168,67,.04)"
                      : "";
                  const demandaBadge = r.demanda_id
                    ? `<span style="font-size:9.5px;background:rgba(234,179,8,.12);color:var(--amber,#ca8a04);border-radius:4px;padding:1px 6px;margin-left:4px;cursor:pointer;white-space:nowrap"
                        onclick="window.demAbrirDetalhe && demAbrirDetalhe('${escapeHtmlAttr(r.demanda_id)}','fin-pagar')"
                        title="Ver demanda de origem">Demanda ↗</span>`
                    : "";
                  return `
                  <tr style="border-bottom:1px solid var(--bd1);${rowBg}" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='${rowBg ? rowBg.split(":")[1].split(";")[0].trim() : ""}'">
                    <td style="padding:7px 6px;color:var(--tx1);font-weight:500;white-space:nowrap">${escapeHtml(r.fornecedor) || "—"}${demandaBadge}</td>
                    <td style="padding:7px 6px;color:var(--tx1);max-width:180px">${escapeHtml(r.finalidade) || "—"}</td>
                    <td style="padding:7px 6px;text-align:right;font-weight:700;color:var(--rose)">${brl(r.valor)}</td>
                    <td style="padding:7px 6px;color:var(--tx2);white-space:nowrap">${_labelForma(r.forma_pagamento)}</td>
                    <td style="padding:7px 6px;color:var(--tx3);font-size:10px;max-width:160px;word-break:break-all">${escapeHtml(r.codigo_pagamento) || "—"}</td>
                    <td style="padding:7px 6px;white-space:nowrap">
                      ${r.tipo_operacao
                        ? `<span class="pill pd" style="font-size:9.5px;margin-right:4px">${escapeHtml(r.tipo_operacao)}</span>`
                        : `<span style="font-size:10px;color:var(--tx3);margin-right:4px">Pendente</span>`}
                      ${r.id && !pago ? `<button onclick="finEditarDadosCnab('${escapeHtmlAttr(r.id)}')" style="font-size:10px;padding:2px 8px;border-radius:5px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--gr);cursor:pointer;white-space:nowrap">Dados CNAB</button>` : ""}
                    </td>
                    <td style="padding:7px 6px;color:${st === "atrasado" ? "var(--rose)" : "var(--tx2)"};white-space:nowrap;font-weight:${st === "atrasado" ? "600" : "400"}">${fmtD(r.vencimento)}</td>
                    <td style="padding:7px 6px;color:var(--tx2);white-space:nowrap">${nomePropio(r.solicitante) || "—"}</td>
                    <td style="padding:7px 6px;color:var(--tx2);white-space:nowrap">${r.categoria || "—"}</td>
                    <td style="padding:7px 6px">${pillStatus(st)}</td>
                    <td style="padding:7px 6px;min-width:160px">
                      <div style="display:flex;flex-direction:column;gap:3px">
                        ${boleto
                          ? `<button onclick="finAbrirAnexo('${escapeHtmlAttr(boleto.storage_path)}')" style="font-size:10px;padding:2px 8px;border-radius:5px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--blue);cursor:pointer;text-align:left;white-space:nowrap">📎 ${escapeHtml(boleto.nome_original)}</button>`
                          : r.id && !pago ? `<button onclick="finAnexar('${r.id}','boleto')" style="font-size:10px;padding:2px 8px;border-radius:5px;border:1px dashed var(--bd2);background:transparent;color:var(--tx3);cursor:pointer;white-space:nowrap">+ Boleto</button>` : ""}
                        ${nf
                          ? `<button onclick="finAbrirAnexo('${escapeHtmlAttr(nf.storage_path)}')" style="font-size:10px;padding:2px 8px;border-radius:5px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--blue);cursor:pointer;text-align:left;white-space:nowrap">📎 ${escapeHtml(nf.nome_original)}</button>`
                          : r.id && !pago ? `<button onclick="finAnexar('${r.id}','nota_fiscal')" style="font-size:10px;padding:2px 8px;border-radius:5px;border:1px dashed var(--bd2);background:transparent;color:var(--tx3);cursor:pointer;white-space:nowrap">+ Nota Fiscal</button>` : ""}
                      </div>
                    </td>
                    <td style="padding:7px 6px">
                      ${r.id && !pago
                        ? `<button class="tbt" style="font-size:10px;padding:3px 8px;white-space:nowrap" onclick="finMarcarPago('${r.id}')">✓ Pago</button>`
                        : ""}
                    </td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table></div>`
        }
        ${rows.some(r => r.observacoes) ? `
          <div style="margin-top:14px;display:flex;flex-direction:column;gap:6px">
            <div style="font-size:10px;color:var(--tx3);font-weight:600;text-transform:uppercase;letter-spacing:.05em">Observações</div>
            ${rows.filter(r => r.observacoes).map(r => `
              <div style="font-size:11.5px;color:var(--tx2);padding:6px 10px;background:var(--bg-hover);border-radius:6px">
                <span style="font-weight:600;color:var(--tx1)">${escapeHtml(r.fornecedor) || "—"}</span> — ${escapeHtml(r.observacoes)}
              </div>`).join("")}
          </div>` : ""}
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

  /* ── HOOK INTO go() ──────────────────────────────────────── */

  document.addEventListener("sipen:navigate", ({ detail: { id } }) => {
    const MAP = {
      "fin-dash":        () => renderDash(),
      "fin-lancamentos": renderLancamentos,
      "fin-fluxo":       renderFluxo,
      "fin-pagar":       () => renderPagar(),
      "fin-receber":     renderReceber,
      "fin-categorias":  renderCategorias,
      "fin-relatorios":  renderRelatorios,
      "fin-auditoria":   renderAuditoria,
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

})();
