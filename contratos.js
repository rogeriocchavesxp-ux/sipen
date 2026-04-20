/* ═══════════════════════════════════════════════════════
   SIPEN — Módulo Contratos
   contratos.js · v1.0
   Tipos: Software, Imóvel, Serviço, Seguro, Fornecimento, Outro
═══════════════════════════════════════════════════════ */

(function () {

  /* ── Tipos de contrato ──────────────────────────────── */

  const TIPOS = [
    {
      id: "Software",
      icon: "💻",
      cor: "var(--violet)",
      corbg: "var(--violetbg)",
      desc: "Licenças, assinaturas e plataformas digitais",
      campos: [
        { id: "produto",            label: "Produto / Sistema",      tipo: "text",   req: true  },
        { id: "fornecedor",         label: "Fornecedor",             tipo: "text",   req: true  },
        { id: "num_licencas",       label: "Nº de licenças",         tipo: "number", req: false },
        { id: "tipo_licenca",       label: "Tipo de licença",        tipo: "select", req: false,
          opcoes: ["Assinatura anual","Assinatura mensal","Perpétua","Teste/Trial","Educacional"] },
        { id: "valor",              label: "Valor (R$)",             tipo: "money",  req: false },
        { id: "periodicidade",      label: "Periodicidade",          tipo: "select", req: false,
          opcoes: ["Mensal","Trimestral","Semestral","Anual","Único"] },
        { id: "data_inicio",        label: "Data de início",         tipo: "date",   req: false },
        { id: "data_vencimento",    label: "Data de vencimento",     tipo: "date",   req: true  },
        { id: "renovacao_automatica", label: "Renovação automática", tipo: "toggle", req: false },
        { id: "contato_fornecedor", label: "Contato do fornecedor",  tipo: "text",   req: false },
      ]
    },
    {
      id: "Imóvel",
      icon: "🏢",
      cor: "var(--amber)",
      corbg: "var(--amberbg)",
      desc: "Aluguéis, comodatos e ocupação de espaços",
      campos: [
        { id: "titulo",             label: "Nome / Identificação",   tipo: "text",   req: true  },
        { id: "endereco",           label: "Endereço completo",      tipo: "text",   req: true  },
        { id: "proprietario",       label: "Proprietário / Locador", tipo: "text",   req: true  },
        { id: "fornecedor",         label: "Imobiliária (se houver)",tipo: "text",   req: false },
        { id: "valor",              label: "Valor do aluguel (R$)",  tipo: "money",  req: false },
        { id: "periodicidade",      label: "Periodicidade",          tipo: "select", req: false,
          opcoes: ["Mensal","Trimestral","Semestral","Anual"] },
        { id: "indice_reajuste",    label: "Índice de reajuste",     tipo: "select", req: false,
          opcoes: ["IPCA","IGP-M","INPC","IPCA-E","Fixo","Negociado"] },
        { id: "perc_reajuste",      label: "% de reajuste",          tipo: "number", req: false },
        { id: "data_inicio",        label: "Início do contrato",     tipo: "date",   req: false },
        { id: "data_vencimento",    label: "Vencimento do contrato", tipo: "date",   req: true  },
        { id: "contato_fornecedor", label: "Contato do proprietário",tipo: "text",   req: false },
      ]
    },
    {
      id: "Serviço",
      icon: "🛠",
      cor: "var(--teal)",
      corbg: "rgba(42,181,192,.12)",
      desc: "Prestadores de serviço, manutenção, limpeza, segurança",
      campos: [
        { id: "titulo",             label: "Descrição do serviço",   tipo: "text",   req: true  },
        { id: "fornecedor",         label: "Empresa / Prestador",    tipo: "text",   req: true  },
        { id: "valor",              label: "Valor (R$)",             tipo: "money",  req: false },
        { id: "periodicidade",      label: "Periodicidade",          tipo: "select", req: false,
          opcoes: ["Mensal","Trimestral","Semestral","Anual","Único","Sob demanda"] },
        { id: "data_inicio",        label: "Data de início",         tipo: "date",   req: false },
        { id: "data_vencimento",    label: "Data de vencimento",     tipo: "date",   req: true  },
        { id: "renovacao_automatica", label: "Renovação automática", tipo: "toggle", req: false },
        { id: "contato_fornecedor", label: "Contato do prestador",   tipo: "text",   req: false },
      ]
    },
    {
      id: "Seguro",
      icon: "🛡",
      cor: "var(--sky)",
      corbg: "rgba(88,152,212,.12)",
      desc: "Apólices de seguro patrimonial, veicular e outros",
      campos: [
        { id: "titulo",             label: "Tipo de cobertura",      tipo: "text",   req: true  },
        { id: "fornecedor",         label: "Seguradora",             tipo: "text",   req: true  },
        { id: "num_apolice",        label: "Nº da apólice",          tipo: "text",   req: false },
        { id: "tipo_seguro",        label: "Tipo de seguro",         tipo: "select", req: false,
          opcoes: ["Patrimonial","Incêndio","Responsabilidade civil","Veicular","Vida em grupo","Outros"] },
        { id: "valor_segurado",     label: "Valor segurado (R$)",    tipo: "money",  req: false },
        { id: "valor",              label: "Prêmio / Mensalidade (R$)", tipo: "money", req: false },
        { id: "periodicidade",      label: "Periodicidade",          tipo: "select", req: false,
          opcoes: ["Mensal","Trimestral","Semestral","Anual","Único"] },
        { id: "data_inicio",        label: "Início da vigência",     tipo: "date",   req: false },
        { id: "data_vencimento",    label: "Fim da vigência",        tipo: "date",   req: true  },
        { id: "renovacao_automatica", label: "Renovação automática", tipo: "toggle", req: false },
        { id: "contato_fornecedor", label: "Contato da seguradora",  tipo: "text",   req: false },
      ]
    },
    {
      id: "Fornecimento",
      icon: "📦",
      cor: "var(--gr)",
      corbg: "rgba(58,170,92,.12)",
      desc: "Contratos de fornecimento de materiais e insumos",
      campos: [
        { id: "titulo",             label: "Objeto do fornecimento", tipo: "text",   req: true  },
        { id: "fornecedor",         label: "Fornecedor",             tipo: "text",   req: true  },
        { id: "produto",            label: "Material / Produto",     tipo: "text",   req: false },
        { id: "valor",              label: "Valor estimado (R$)",    tipo: "money",  req: false },
        { id: "periodicidade",      label: "Periodicidade",          tipo: "select", req: false,
          opcoes: ["Mensal","Trimestral","Semestral","Anual","Único","Sob demanda"] },
        { id: "data_inicio",        label: "Início",                 tipo: "date",   req: false },
        { id: "data_vencimento",    label: "Vencimento",             tipo: "date",   req: true  },
        { id: "contato_fornecedor", label: "Contato do fornecedor",  tipo: "text",   req: false },
      ]
    },
    {
      id: "Outro",
      icon: "📄",
      cor: "var(--gold)",
      corbg: "var(--goldbg)",
      desc: "Outros tipos de contratos institucionais",
      campos: [
        { id: "titulo",             label: "Título do contrato",     tipo: "text",   req: true  },
        { id: "fornecedor",         label: "Contraparte / Empresa",  tipo: "text",   req: false },
        { id: "valor",              label: "Valor (R$)",             tipo: "money",  req: false },
        { id: "periodicidade",      label: "Periodicidade",          tipo: "select", req: false,
          opcoes: ["Mensal","Trimestral","Semestral","Anual","Único"] },
        { id: "data_inicio",        label: "Data de início",         tipo: "date",   req: false },
        { id: "data_vencimento",    label: "Data de vencimento",     tipo: "date",   req: true  },
        { id: "contato_fornecedor", label: "Contato",                tipo: "text",   req: false },
      ]
    },
  ];

  /* ── Status ─────────────────────────────────────────── */

  const STATUS_CFG = {
    "Ativo":          { bg: "rgba(58,170,92,.12)",   cl: "var(--gr)"     },
    "A vencer":       { bg: "rgba(224,138,42,.12)",  cl: "var(--amber)"  },
    "Vencido":        { bg: "rgba(224,85,85,.12)",   cl: "var(--rose)"   },
    "Em negociação":  { bg: "rgba(74,156,245,.12)",  cl: "var(--blue)"   },
    "Cancelado":      { bg: "rgba(90,96,104,.15)",   cl: "var(--tx3)"    },
    "Encerrado":      { bg: "rgba(90,96,104,.15)",   cl: "var(--tx3)"    },
  };

  function pillStatus(st) {
    const s = STATUS_CFG[st] || { bg: "rgba(90,96,104,.15)", cl: "var(--tx3)" };
    return `<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;background:${s.bg};color:${s.cl}">${st || "—"}</span>`;
  }

  function tipoInfo(tipo) {
    return TIPOS.find(t => t.id === tipo) || TIPOS[TIPOS.length - 1];
  }

  function fmtD(d) {
    if (!d) return "—";
    const s = d.split("T")[0].split("-");
    return `${s[2]}/${s[1]}/${s[0]}`;
  }

  function fmtMoney(v) {
    if (v == null || v === "") return "—";
    return "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function diasParaVencer(dataVenc) {
    if (!dataVenc) return null;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const venc = new Date(dataVenc + "T00:00:00");
    return Math.round((venc - hoje) / 86400000);
  }

  function _autoStatus(row) {
    if (row.status === "Cancelado" || row.status === "Encerrado") return row.status;
    const dias = diasParaVencer(row.data_vencimento);
    if (dias === null) return row.status || "Ativo";
    if (dias < 0)  return "Vencido";
    if (dias <= 30) return "A vencer";
    return "Ativo";
  }

  function _sp() {
    return `<span style="display:inline-block;width:11px;height:11px;border:2px solid var(--gr);border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;vertical-align:middle;margin-right:6px"></span>`;
  }

  /* ── Cache ──────────────────────────────────────────── */

  let _cache = [];
  let _tipoFiltro = "";
  let _abrirApos = null;

  async function _load() {
    try { _cache = await apiRead("CONTRATOS"); }
    catch (e) { console.warn("Contratos load:", e.message); _cache = []; }
    return _cache;
  }

  function _invalidate() { _cache = []; }

  /* ── Render principal ───────────────────────────────── */

  async function renderContratos() {
    const el = document.getElementById("con-list");
    const kpiEl = document.getElementById("con-kpis");
    if (!el) return;

    el.innerHTML = `<div style="padding:12px 0;color:var(--tx3);font-size:11.5px">${_sp()} Carregando...</div>`;

    if (!_cache.length) await _load();

    /* KPIs */
    if (kpiEl) {
      const todos   = _cache;
      const ativos  = todos.filter(r => _autoStatus(r) === "Ativo");
      const avencer = todos.filter(r => _autoStatus(r) === "A vencer");
      const vencido = todos.filter(r => _autoStatus(r) === "Vencido");
      const valMensal = todos
        .filter(r => _autoStatus(r) !== "Cancelado" && _autoStatus(r) !== "Encerrado" && r.periodicidade === "Mensal")
        .reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);

      kpiEl.innerHTML = `
        <div class="kpi">
          <div class="kpi-ico" style="background:rgba(58,170,92,.12);color:var(--gr)">✓</div>
          <div class="kpi-body"><div class="kpi-lbl">Ativos</div><div class="kpi-val">${ativos.length}</div><div class="kpi-d up">contratos vigentes</div></div>
        </div>
        <div class="kpi">
          <div class="kpi-ico" style="background:rgba(224,138,42,.12);color:var(--amber)">⚠</div>
          <div class="kpi-body"><div class="kpi-lbl">A vencer</div><div class="kpi-val">${avencer.length}</div><div class="kpi-d wa">próximos 30 dias</div></div>
        </div>
        <div class="kpi">
          <div class="kpi-ico" style="background:rgba(224,85,85,.12);color:var(--rose)">!</div>
          <div class="kpi-body"><div class="kpi-lbl">Vencidos</div><div class="kpi-val">${vencido.length}</div><div class="kpi-d dn">requer atenção</div></div>
        </div>
        <div class="kpi">
          <div class="kpi-ico" style="background:rgba(212,168,67,.12);color:var(--gold)">$</div>
          <div class="kpi-body"><div class="kpi-lbl">Custo mensal</div><div class="kpi-val" style="font-size:15px">${valMensal > 0 ? fmtMoney(valMensal) : "—"}</div><div class="kpi-d nu">contratos mensais</div></div>
        </div>`;
    }

    /* Filtro por tipo */
    let rows = [..._cache];
    if (_tipoFiltro) rows = rows.filter(r => r.tipo === _tipoFiltro);

    /* Ordenar: A vencer primeiro, depois por data */
    rows.sort((a, b) => {
      const sa = _autoStatus(a), sb = _autoStatus(b);
      const ordem = { "Vencido": 0, "A vencer": 1, "Em negociação": 2, "Ativo": 3, "Encerrado": 4, "Cancelado": 5 };
      const oa = ordem[sa] ?? 9, ob = ordem[sb] ?? 9;
      if (oa !== ob) return oa - ob;
      return (a.data_vencimento || "").localeCompare(b.data_vencimento || "");
    });

    const countEl = document.getElementById("con-count");
    if (countEl) countEl.textContent = rows.length ? `${rows.length} registro${rows.length > 1 ? "s" : ""}` : "";

    if (rows.length === 0) {
      el.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:16px 0;text-align:center">
        Nenhum contrato encontrado${_tipoFiltro ? " para este tipo" : ""}.<br>
        <button class="tbt pri" style="margin-top:10px" onclick="conAbrirModal()">+ Novo Contrato</button>
      </div>`;
      return;
    }

    el.innerHTML = `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="border-bottom:1px solid var(--bd2)">
              ${["Tipo","Título / Produto","Fornecedor","Valor","Periodicidade","Vencimento","Dias","Status",""].map(h =>
        `<th style="text-align:left;padding:8px 8px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`
      ).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => {
        const t = tipoInfo(r.tipo);
        const st = _autoStatus(r);
        const dias = diasParaVencer(r.data_vencimento);
        const diasTxt = dias === null ? "—"
          : dias < 0 ? `<span style="color:var(--rose);font-weight:700">${Math.abs(dias)}d atrás</span>`
          : dias <= 7 ? `<span style="color:var(--rose);font-weight:700">${dias}d</span>`
          : dias <= 30 ? `<span style="color:var(--amber);font-weight:700">${dias}d</span>`
          : `<span style="color:var(--tx3)">${dias}d</span>`;
        return `
              <tr style="border-bottom:1px solid var(--bd1);cursor:pointer"
                  onclick="conAbrirDetalhe('${r.id}')"
                  onmouseover="this.style.background='var(--bg-hover)'"
                  onmouseout="this.style.background=''">
                <td style="padding:8px 8px">
                  <span style="font-size:11px;font-weight:600;color:${t.cor}">${t.icon} ${r.tipo || "—"}</span>
                </td>
                <td style="padding:8px 8px;color:var(--tx1);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500">
                  ${r.produto ? `<div style="font-size:11px">${r.produto}</div>` : ""}
                  <div style="${r.produto ? "color:var(--tx2);font-size:10.5px" : ""}">${r.titulo || "—"}</div>
                </td>
                <td style="padding:8px 8px;color:var(--tx2);white-space:nowrap">${r.fornecedor || "—"}</td>
                <td style="padding:8px 8px;color:var(--tx1);white-space:nowrap;font-weight:500">${r.valor ? fmtMoney(r.valor) : "—"}</td>
                <td style="padding:8px 8px;color:var(--tx3);white-space:nowrap">${r.periodicidade || "—"}</td>
                <td style="padding:8px 8px;color:var(--tx2);white-space:nowrap">${fmtD(r.data_vencimento)}</td>
                <td style="padding:8px 8px;white-space:nowrap">${diasTxt}</td>
                <td style="padding:8px 8px">${pillStatus(st)}</td>
                <td style="padding:8px 8px">
                  <button onclick="event.stopPropagation();conAbrirModal('${r.id}')"
                    style="font-size:10px;padding:3px 8px;border-radius:5px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx2);cursor:pointer">
                    ✎ Editar
                  </button>
                </td>
              </tr>`;
      }).join("")}
          </tbody>
        </table>
      </div>`;
  }

  /* ── Detalhe ────────────────────────────────────────── */

  window.conAbrirDetalhe = async function (id) {
    if (!_cache.length) await _load();
    const con = _cache.find(r => String(r.id) === String(id));
    if (!con) { if (typeof T === "function") T("Erro", "Contrato não encontrado"); return; }
    _renderDetalhe(con);
    if (typeof go === "function") go("admin-con-detalhe");
  };

  function _renderDetalhe(con) {
    const el = document.getElementById("v-admin-con-detalhe");
    if (!el) return;
    const t = tipoInfo(con.tipo);
    const st = _autoStatus(con);
    const dias = diasParaVencer(con.data_vencimento);

    const linhas = [
      ["Tipo", `<span style="color:${t.cor};font-weight:600">${t.icon} ${con.tipo}</span>`],
      con.produto       ? ["Produto / Sistema", con.produto]                : null,
      con.fornecedor    ? ["Fornecedor",         con.fornecedor]            : null,
      con.proprietario  ? ["Proprietário",       con.proprietario]          : null,
      con.endereco      ? ["Endereço",           con.endereco]              : null,
      con.num_licencas  ? ["Nº de licenças",     con.num_licencas]          : null,
      con.tipo_licenca  ? ["Tipo de licença",    con.tipo_licenca]          : null,
      con.num_apolice   ? ["Nº da apólice",      con.num_apolice]           : null,
      con.tipo_seguro   ? ["Tipo de seguro",     con.tipo_seguro]           : null,
      con.valor_segurado? ["Valor segurado",     fmtMoney(con.valor_segurado)] : null,
      con.valor         ? ["Valor contratual",   fmtMoney(con.valor) + (con.periodicidade ? ` / ${con.periodicidade}` : "")] : null,
      con.indice_reajuste ? ["Índice de reajuste", `${con.indice_reajuste}${con.perc_reajuste ? ` (${con.perc_reajuste}%)` : ""}`] : null,
      ["Início",     fmtD(con.data_inicio)],
      ["Vencimento", fmtD(con.data_vencimento)],
      dias !== null ? ["Situação prazo", dias < 0 ? `<span style="color:var(--rose);font-weight:600">Vencido há ${Math.abs(dias)} dias</span>`
        : dias <= 30 ? `<span style="color:var(--amber);font-weight:600">Vence em ${dias} dias</span>`
        : `<span style="color:var(--gr)">${dias} dias restantes</span>`] : null,
      con.renovacao_automatica != null ? ["Renovação automática", con.renovacao_automatica ? "✅ Sim" : "Não"] : null,
      con.responsavel   ? ["Responsável",        con.responsavel]           : null,
      con.contato_fornecedor ? ["Contato",        con.contato_fornecedor]   : null,
    ].filter(Boolean);

    el.innerHTML = `
      <div class="hero">
        <div class="hero-ic" style="background:${t.corbg};border-color:${t.cor}44;font-size:22px">${t.icon}</div>
        <div>
          <div class="hero-lbl">Contrato · ${t.icon} ${con.tipo}</div>
          <div class="hero-ttl">${con.produto || con.titulo || "—"}</div>
          <div class="hero-dsc" style="display:flex;gap:8px;align-items:center;margin-top:4px">
            ${pillStatus(st)}
            ${con.fornecedor ? `<span style="color:var(--tx3);font-size:11px">${con.fornecedor}</span>` : ""}
          </div>
        </div>
        <div class="hero-act">
          <button class="tbt" onclick="go('admin-con')">← Voltar</button>
          <button class="tbt pri" onclick="conAbrirModal('${con.id}')">✎ Editar</button>
        </div>
      </div>
      <div class="ct">
        <div class="g2">
          <div class="card">
            <div class="ctit">Dados do Contrato</div>
            <table style="width:100%;font-size:11.5px;border-collapse:collapse">
              ${linhas.map(([lbl, val], i) => `
                <tr style="${i > 0 ? "border-top:1px solid var(--bd1)" : ""}">
                  <td style="color:var(--tx3);padding:7px 0;width:38%">${lbl}</td>
                  <td style="color:var(--tx1)">${val}</td>
                </tr>`).join("")}
            </table>
            ${con.descricao ? `
              <div class="ctit" style="margin-top:16px">Descrição / Observações</div>
              <div style="font-size:12px;color:var(--tx1);line-height:1.7;margin-top:6px">${con.descricao}</div>` : ""}
            ${con.observacoes ? `
              <div class="ctit" style="margin-top:16px">Observações internas</div>
              <div style="font-size:12px;color:var(--tx2);line-height:1.7;margin-top:6px">${con.observacoes}</div>` : ""}
          </div>
          <div class="card">
            <div class="ctit">Atualizar Status</div>
            <div style="font-size:11px;color:var(--tx3);margin-bottom:10px">Status atual: ${pillStatus(st)}</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${["Ativo","Em negociação","Cancelado","Encerrado"].map(s => `
                <button onclick="conAtualizarStatus('${con.id}','${s}')"
                  style="text-align:left;padding:9px 14px;border-radius:6px;border:1px solid ${con.status === s ? "var(--gr)" : "var(--bd2)"};background:${con.status === s ? "rgba(58,170,92,.1)" : "var(--bg-card)"};color:${con.status === s ? "var(--gr)" : "var(--tx1)"};font-size:12px;font-weight:${con.status === s ? "700" : "400"};cursor:pointer;transition:all .15s"
                  onmouseover="if('${con.status}'!=='${s}')this.style.background='var(--bg-hover)'"
                  onmouseout="if('${con.status}'!=='${s}')this.style.background='var(--bg-card)'">
                  ${con.status === s ? "✓ " : "○ "} ${s}
                </button>`).join("")}
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ── Atualizar status ───────────────────────────────── */

  window.conAtualizarStatus = async function (id, novoStatus) {
    try {
      await apiWrite("update", "CONTRATOS", { _row: id, status: novoStatus, atualizado_em: new Date().toISOString() });
      if (typeof T === "function") T("✅ Status atualizado", novoStatus);
      const idx = _cache.findIndex(r => String(r.id) === String(id));
      if (idx >= 0) _cache[idx].status = novoStatus;
      _renderDetalhe(_cache[idx]);
      _atualizarBadgeVencer();
    } catch (e) {
      if (typeof T === "function") T("Erro", "Não foi possível atualizar");
      console.error(e);
    }
  };

  /* ── Modal: Novo / Editar ───────────────────────────── */

  let _editandoId = null;

  window.conAbrirModal = async function (id) {
    _editandoId = id || null;
    const m = document.getElementById("modal-contrato");
    if (!m) return;

    /* Se for edição, carrega os dados */
    let dados = {};
    if (_editandoId) {
      if (!_cache.length) await _load();
      dados = _cache.find(r => String(r.id) === String(_editandoId)) || {};
    }

    const tipoAtual = dados.tipo || "";
    m.querySelector("#con-f-tipo").value = tipoAtual;
    m.querySelector("#con-modal-title").textContent = _editandoId ? "Editar Contrato" : "Novo Contrato";

    _renderCamposModal(tipoAtual, dados);
    m.style.display = "flex";
  };

  window.conFecharModal = function () {
    const m = document.getElementById("modal-contrato");
    if (m) m.style.display = "none";
    _editandoId = null;
  };

  window.conOnTipoChange = function () {
    const tipo = document.getElementById("con-f-tipo")?.value;
    _renderCamposModal(tipo, {});
  };

  function _renderCamposModal(tipo, dados) {
    const el = document.getElementById("con-campos-dinamicos");
    if (!el) return;

    if (!tipo) {
      el.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:8px 0">Selecione o tipo de contrato para ver os campos.</div>`;
      return;
    }

    const t = tipoInfo(tipo);
    el.innerHTML = t.campos.map(c => {
      const val = dados[c.id] !== undefined ? dados[c.id] : "";
      const req = c.req ? ' <span style="color:var(--rose)">*</span>' : "";
      let input = "";

      if (c.tipo === "select") {
        input = `<select id="con-cf-${c.id}" style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px">
          <option value="">Selecionar...</option>
          ${c.opcoes.map(o => `<option value="${o}" ${val === o ? "selected" : ""}>${o}</option>`).join("")}
        </select>`;
      } else if (c.tipo === "toggle") {
        input = `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--tx1)">
          <input type="checkbox" id="con-cf-${c.id}" ${val ? "checked" : ""} style="width:16px;height:16px">
          Sim
        </label>`;
      } else if (c.tipo === "money" || c.tipo === "number") {
        input = `<input type="number" id="con-cf-${c.id}" value="${val}" step="${c.tipo === "money" ? "0.01" : "1"}" min="0"
          style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px;box-sizing:border-box">`;
      } else if (c.tipo === "date") {
        input = `<input type="date" id="con-cf-${c.id}" value="${val || ""}"
          style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px;box-sizing:border-box">`;
      } else {
        input = `<input type="text" id="con-cf-${c.id}" value="${val || ""}" placeholder="${c.label}"
          style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px;box-sizing:border-box">`;
      }

      return `<div style="margin-bottom:12px">
        <label style="display:block;font-size:11px;color:var(--tx3);margin-bottom:4px">${c.label}${req}</label>
        ${input}
      </div>`;
    }).join("") + `
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:11px;color:var(--tx3);margin-bottom:4px">Responsável interno</label>
        <input type="text" id="con-cf-responsavel" value="${dados.responsavel || ""}" placeholder="Nome do responsável"
          style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px;box-sizing:border-box">
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:11px;color:var(--tx3);margin-bottom:4px">Observações</label>
        <textarea id="con-cf-observacoes" rows="3" placeholder="Informações adicionais..."
          style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px;box-sizing:border-box;resize:vertical">${dados.observacoes || ""}</textarea>
      </div>`;
  }

  window.conSalvar = async function () {
    const tipo = document.getElementById("con-f-tipo")?.value;
    if (!tipo) {
      if (typeof T === "function") T("Campo obrigatório", "Selecione o tipo de contrato");
      return;
    }

    const t = tipoInfo(tipo);
    const payload = { tipo };

    /* Coleta campos dinâmicos */
    for (const c of t.campos) {
      const el = document.getElementById(`con-cf-${c.id}`);
      if (!el) continue;
      let val = c.tipo === "toggle" ? el.checked : el.value?.trim() || null;
      if (c.tipo === "money" || c.tipo === "number") val = val ? parseFloat(val) : null;
      if (c.req && !val && val !== false) {
        if (typeof T === "function") T("Campo obrigatório", c.label);
        el.focus();
        return;
      }
      payload[c.id] = val;
    }

    /* Campos fixos extras */
    const respEl = document.getElementById("con-cf-responsavel");
    const obsEl = document.getElementById("con-cf-observacoes");
    if (respEl) payload.responsavel = respEl.value?.trim() || null;
    if (obsEl)  payload.observacoes = obsEl.value?.trim() || null;

    /* Status inicial */
    if (!_editandoId) {
      payload.status = "Ativo";
      payload.criado_em = new Date().toISOString();
    }
    payload.atualizado_em = new Date().toISOString();

    /* Garante titulo para tipos que não têm campo titulo explícito */
    if (!payload.titulo) payload.titulo = payload.produto || tipo;

    try {
      if (_editandoId) {
        await apiWrite("update", "CONTRATOS", { _row: _editandoId, ...payload });
        if (typeof T === "function") T("✅ Contrato atualizado!", payload.titulo || tipo);
        const idx = _cache.findIndex(r => String(r.id) === String(_editandoId));
        if (idx >= 0) Object.assign(_cache[idx], payload);
      } else {
        const novo = await apiWrite("create", "CONTRATOS", payload);
        if (typeof T === "function") T("✅ Contrato registrado!", payload.titulo || tipo);
        _invalidate();
      }
      window.conFecharModal();
      await renderContratos();
      _atualizarBadgeVencer();
    } catch (e) {
      if (typeof T === "function") T("Erro", "Não foi possível salvar o contrato");
      console.error(e);
    }
  };

  /* ── Excluir ────────────────────────────────────────── */

  window.conExcluir = async function (id) {
    if (!confirm("Excluir este contrato permanentemente?")) return;
    try {
      await apiWrite("delete", "CONTRATOS", { _row: id });
      if (typeof T === "function") T("Contrato excluído", "");
      _invalidate();
      if (typeof go === "function") go("admin-con");
      else await renderContratos();
    } catch (e) {
      if (typeof T === "function") T("Erro", "Não foi possível excluir");
      console.error(e);
    }
  };

  /* ── Filtro por tipo (abas) ─────────────────────────── */

  window.conFiltrarTipo = function (tipo) {
    _tipoFiltro = tipo;
    document.querySelectorAll("#con-tipo-tabs .ini").forEach(el => {
      el.classList.toggle("on", (el.dataset.tipo || "") === tipo);
    });
    renderContratos();
  };

  /* ── Badge no menu ──────────────────────────────────── */

  function _atualizarBadgeVencer() {
    const badge = document.querySelector("#mw-admin-con .mbadge");
    if (!badge) return;
    const n = _cache.filter(r => ["A vencer", "Vencido"].includes(_autoStatus(r))).length;
    badge.textContent = n || "";
    badge.style.display = n ? "" : "none";
  }

  /* ── Hook no go() ────────────────────────────────────── */

  const _origGo = window.go;
  window.go = function (id) {
    _origGo(id);
    if (id === "admin-con") {
      _tipoFiltro = "";
      document.querySelectorAll("#con-tipo-tabs .ini").forEach((el, i) => el.classList.toggle("on", i === 0));
      renderContratos();
    }
  };

  /* ── Expor ───────────────────────────────────────────── */
  window.conRecarregar = async function () { _invalidate(); await renderContratos(); };

})();
