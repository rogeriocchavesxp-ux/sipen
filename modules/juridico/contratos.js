/* ═══════════════════════════════════════════════════════
   SIPEN — Módulo Contratos
   contratos.js · v2.0
   Categorias: Software, Segurança, Portaria Remota, Locação,
               Infraestrutura, Serviços, Seguro, Fornecimento,
               Telefonia, Internet, Outro
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
        { id: "titulo",               label: "Título / Identificação",    tipo: "text",   req: true  },
        { id: "produto",              label: "Produto / Sistema",         tipo: "text",   req: false },
        { id: "fornecedor",           label: "Fornecedor",                tipo: "text",   req: false },
        { id: "num_licencas",         label: "Nº de licenças",            tipo: "number", req: false },
        { id: "tipo_licenca",         label: "Tipo de licença",           tipo: "select", req: false,
          opcoes: ["Assinatura anual","Assinatura mensal","Perpétua","Teste/Trial","Educacional"] },
        { id: "data_inicio",          label: "Data de início",            tipo: "date",   req: false },
        { id: "data_vencimento",      label: "Data de vencimento",        tipo: "date",   req: true  },
        { id: "renovacao_automatica", label: "Renovação automática",      tipo: "toggle", req: false },
        { id: "contato_fornecedor",   label: "Contato do fornecedor",     tipo: "text",   req: false },
        { id: "forma_pagamento",      label: "Forma de pagamento",        tipo: "select", req: false,
          opcoes: ["Boleto Bancário","Débito Automático","Cartão de Crédito","Transferência/PIX","Cheque","Nota Fiscal","Outros"] },
      ]
    },
    {
      id: "Segurança",
      icon: "🔒",
      cor: "var(--rose)",
      corbg: "var(--rosebg)",
      desc: "Monitoramento, alarmes e câmeras",
      campos: [
        { id: "titulo",               label: "Descrição do serviço",      tipo: "text",   req: true  },
        { id: "fornecedor",           label: "Empresa / Prestador",       tipo: "text",   req: false },
        { id: "data_inicio",          label: "Data de início",            tipo: "date",   req: false },
        { id: "data_vencimento",      label: "Data de vencimento",        tipo: "date",   req: true  },
        { id: "renovacao_automatica", label: "Renovação automática",      tipo: "toggle", req: false },
        { id: "contato_fornecedor",   label: "Contato do prestador",      tipo: "text",   req: false },
        { id: "forma_pagamento",      label: "Forma de pagamento",        tipo: "select", req: false,
          opcoes: ["Boleto Bancário","Débito Automático","Cartão de Crédito","Transferência/PIX","Cheque","Nota Fiscal","Outros"] },
      ]
    },
    {
      id: "Portaria Remota",
      icon: "🚪",
      cor: "var(--amber)",
      corbg: "var(--amberbg)",
      desc: "Controle de acesso e portaria digital",
      campos: [
        { id: "titulo",               label: "Descrição do serviço",      tipo: "text",   req: true  },
        { id: "fornecedor",           label: "Empresa / Prestador",       tipo: "text",   req: false },
        { id: "data_inicio",          label: "Data de início",            tipo: "date",   req: false },
        { id: "data_vencimento",      label: "Data de vencimento",        tipo: "date",   req: true  },
        { id: "renovacao_automatica", label: "Renovação automática",      tipo: "toggle", req: false },
        { id: "contato_fornecedor",   label: "Contato do prestador",      tipo: "text",   req: false },
        { id: "forma_pagamento",      label: "Forma de pagamento",        tipo: "select", req: false,
          opcoes: ["Boleto Bancário","Débito Automático","Cartão de Crédito","Transferência/PIX","Cheque","Nota Fiscal","Outros"] },
      ]
    },
    {
      id: "Locação",
      icon: "🏢",
      cor: "var(--gold)",
      corbg: "var(--goldbg)",
      desc: "Aluguéis, comodatos e ocupação de espaços",
      campos: [
        { id: "titulo",               label: "Nome / Identificação",      tipo: "text",   req: true  },
        { id: "endereco",             label: "Endereço completo",         tipo: "text",   req: false },
        { id: "proprietario",         label: "Proprietário / Locador",    tipo: "text",   req: false },
        { id: "fornecedor",           label: "Imobiliária (se houver)",   tipo: "text",   req: false },
        { id: "indice_reajuste",      label: "Índice de reajuste",        tipo: "select", req: false,
          opcoes: ["IPCA","IGP-M","INPC","IPCA-E","Fixo","Negociado"] },
        { id: "perc_reajuste",        label: "% de reajuste",             tipo: "number", req: false },
        { id: "data_inicio",          label: "Início do contrato",        tipo: "date",   req: false },
        { id: "data_vencimento",      label: "Vencimento do contrato",    tipo: "date",   req: true  },
        { id: "contato_fornecedor",   label: "Contato do proprietário",   tipo: "text",   req: false },
        { id: "forma_pagamento",      label: "Forma de pagamento",        tipo: "select", req: false,
          opcoes: ["Boleto Bancário","Débito Automático","Cartão de Crédito","Transferência/PIX","Cheque","Nota Fiscal","Outros"] },
      ]
    },
    {
      id: "Infraestrutura",
      icon: "⚙",
      cor: "var(--sky)",
      corbg: "var(--skybg)",
      desc: "Manutenção predial, conservação e instalações",
      campos: [
        { id: "titulo",               label: "Descrição do serviço",      tipo: "text",   req: true  },
        { id: "fornecedor",           label: "Empresa / Prestador",       tipo: "text",   req: false },
        { id: "data_inicio",          label: "Data de início",            tipo: "date",   req: false },
        { id: "data_vencimento",      label: "Data de vencimento",        tipo: "date",   req: true  },
        { id: "renovacao_automatica", label: "Renovação automática",      tipo: "toggle", req: false },
        { id: "contato_fornecedor",   label: "Contato do prestador",      tipo: "text",   req: false },
        { id: "forma_pagamento",      label: "Forma de pagamento",        tipo: "select", req: false,
          opcoes: ["Boleto Bancário","Débito Automático","Cartão de Crédito","Transferência/PIX","Cheque","Nota Fiscal","Outros"] },
      ]
    },
    {
      id: "Serviços",
      icon: "🛠",
      cor: "var(--teal)",
      corbg: "var(--tealbg)",
      desc: "Prestadores de serviço gerais",
      campos: [
        { id: "titulo",               label: "Descrição do serviço",      tipo: "text",   req: true  },
        { id: "fornecedor",           label: "Empresa / Prestador",       tipo: "text",   req: false },
        { id: "data_inicio",          label: "Data de início",            tipo: "date",   req: false },
        { id: "data_vencimento",      label: "Data de vencimento",        tipo: "date",   req: true  },
        { id: "renovacao_automatica", label: "Renovação automática",      tipo: "toggle", req: false },
        { id: "contato_fornecedor",   label: "Contato do prestador",      tipo: "text",   req: false },
        { id: "forma_pagamento",      label: "Forma de pagamento",        tipo: "select", req: false,
          opcoes: ["Boleto Bancário","Débito Automático","Cartão de Crédito","Transferência/PIX","Cheque","Nota Fiscal","Outros"] },
      ]
    },
    {
      id: "Seguro",
      icon: "🛡",
      cor: "var(--blue)",
      corbg: "var(--bluebg)",
      desc: "Apólices de seguro patrimonial, veicular e outros",
      campos: [
        { id: "titulo",               label: "Tipo de cobertura",         tipo: "text",   req: true  },
        { id: "fornecedor",           label: "Seguradora",                tipo: "text",   req: false },
        { id: "num_apolice",          label: "Nº da apólice",             tipo: "text",   req: false },
        { id: "tipo_seguro",          label: "Tipo de seguro",            tipo: "select", req: false,
          opcoes: ["Patrimonial","Incêndio","Responsabilidade Civil","Veicular","Vida em Grupo","Outros"] },
        { id: "valor_segurado",       label: "Valor segurado (R$)",       tipo: "money",  req: false },
        { id: "data_inicio",          label: "Início da vigência",        tipo: "date",   req: false },
        { id: "data_vencimento",      label: "Fim da vigência",           tipo: "date",   req: true  },
        { id: "renovacao_automatica", label: "Renovação automática",      tipo: "toggle", req: false },
        { id: "contato_fornecedor",   label: "Contato da seguradora",     tipo: "text",   req: false },
        { id: "forma_pagamento",      label: "Forma de pagamento",        tipo: "select", req: false,
          opcoes: ["Boleto Bancário","Débito Automático","Cartão de Crédito","Transferência/PIX","Cheque","Nota Fiscal","Outros"] },
      ]
    },
    {
      id: "Fornecimento",
      icon: "📦",
      cor: "var(--gr)",
      corbg: "rgba(58,170,92,.12)",
      desc: "Contratos de fornecimento de materiais e insumos",
      campos: [
        { id: "titulo",               label: "Objeto do fornecimento",    tipo: "text",   req: true  },
        { id: "fornecedor",           label: "Fornecedor",                tipo: "text",   req: false },
        { id: "produto",              label: "Material / Produto",        tipo: "text",   req: false },
        { id: "data_inicio",          label: "Início",                    tipo: "date",   req: false },
        { id: "data_vencimento",      label: "Vencimento",                tipo: "date",   req: true  },
        { id: "contato_fornecedor",   label: "Contato do fornecedor",     tipo: "text",   req: false },
        { id: "forma_pagamento",      label: "Forma de pagamento",        tipo: "select", req: false,
          opcoes: ["Boleto Bancário","Débito Automático","Cartão de Crédito","Transferência/PIX","Cheque","Nota Fiscal","Outros"] },
      ]
    },
    {
      id: "Telefonia",
      icon: "📱",
      cor: "var(--sky)",
      corbg: "var(--skybg)",
      desc: "Planos corporativos de telefonia",
      campos: [
        { id: "titulo",               label: "Plano / Serviço",           tipo: "text",   req: true  },
        { id: "fornecedor",           label: "Operadora",                 tipo: "text",   req: false },
        { id: "data_inicio",          label: "Data de início",            tipo: "date",   req: false },
        { id: "data_vencimento",      label: "Data de vencimento",        tipo: "date",   req: true  },
        { id: "renovacao_automatica", label: "Renovação automática",      tipo: "toggle", req: false },
        { id: "contato_fornecedor",   label: "Contato da operadora",      tipo: "text",   req: false },
        { id: "forma_pagamento",      label: "Forma de pagamento",        tipo: "select", req: false,
          opcoes: ["Boleto Bancário","Débito Automático","Cartão de Crédito","Transferência/PIX","Cheque","Nota Fiscal","Outros"] },
      ]
    },
    {
      id: "Internet",
      icon: "🌐",
      cor: "var(--blue)",
      corbg: "var(--bluebg)",
      desc: "Links de internet e conectividade",
      campos: [
        { id: "titulo",               label: "Plano / Link",              tipo: "text",   req: true  },
        { id: "fornecedor",           label: "Provedor / Operadora",      tipo: "text",   req: false },
        { id: "produto",              label: "Velocidade / Especificação",tipo: "text",   req: false },
        { id: "data_inicio",          label: "Data de início",            tipo: "date",   req: false },
        { id: "data_vencimento",      label: "Data de vencimento",        tipo: "date",   req: true  },
        { id: "renovacao_automatica", label: "Renovação automática",      tipo: "toggle", req: false },
        { id: "contato_fornecedor",   label: "Contato do provedor",       tipo: "text",   req: false },
        { id: "forma_pagamento",      label: "Forma de pagamento",        tipo: "select", req: false,
          opcoes: ["Boleto Bancário","Débito Automático","Cartão de Crédito","Transferência/PIX","Cheque","Nota Fiscal","Outros"] },
      ]
    },
    {
      id: "Outro",
      icon: "📄",
      cor: "var(--gold)",
      corbg: "var(--goldbg)",
      desc: "Outros tipos de contratos institucionais",
      campos: [
        { id: "titulo",               label: "Título do contrato",        tipo: "text",   req: true  },
        { id: "fornecedor",           label: "Contraparte / Empresa",     tipo: "text",   req: false },
        { id: "data_inicio",          label: "Data de início",            tipo: "date",   req: false },
        { id: "data_vencimento",      label: "Data de vencimento",        tipo: "date",   req: true  },
        { id: "contato_fornecedor",   label: "Contato",                   tipo: "text",   req: false },
        { id: "forma_pagamento",      label: "Forma de pagamento",        tipo: "select", req: false,
          opcoes: ["Boleto Bancário","Débito Automático","Cartão de Crédito","Transferência/PIX","Cheque","Nota Fiscal","Outros"] },
      ]
    },
  ];

  /* Backward-compat: tipos legados no banco mapeiam para config de tipo novo */
  const _ALIASES = { "Imóvel": "Locação", "Serviço": "Serviços" };

  /* ── Status ─────────────────────────────────────────── */

  const STATUS_CFG = {
    "Ativo":         { bg: "rgba(58,170,92,.12)",  cl: "var(--gr)"    },
    "A vencer":      { bg: "rgba(224,138,42,.12)", cl: "var(--amber)" },
    "Vencido":       { bg: "rgba(224,85,85,.12)",  cl: "var(--rose)"  },
    "Em negociação": { bg: "rgba(74,156,245,.12)", cl: "var(--blue)"  },
    "Cancelado":     { bg: "rgba(90,96,104,.15)",  cl: "var(--tx3)"   },
    "Encerrado":     { bg: "rgba(90,96,104,.15)",  cl: "var(--tx3)"   },
  };

  function pillStatus(st) {
    const s = STATUS_CFG[st] || { bg: "rgba(90,96,104,.15)", cl: "var(--tx3)" };
    return `<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;background:${s.bg};color:${s.cl}">${st || "—"}</span>`;
  }

  function tipoInfo(tipo) {
    return TIPOS.find(t => t.id === tipo)
      || TIPOS.find(t => t.id === _ALIASES[tipo])
      || TIPOS[TIPOS.length - 1];
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
    if (dias < 0)   return "Vencido";
    if (dias <= 30) return "A vencer";
    return "Ativo";
  }

  function _sp() {
    return `<span style="display:inline-block;width:11px;height:11px;border:2px solid var(--gr);border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;vertical-align:middle;margin-right:6px"></span>`;
  }

  /* ── Cálculo de custo ───────────────────────────────── */

  const _FATOR_MENSAL = {
    "Mensal": 1, "Bimestral": 0.5, "Trimestral": 1/3,
    "Semestral": 1/6, "Anual": 1/12, "Único": 0, "Sob demanda": 0
  };

  function _parseCustos(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "string") {
      try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
  }

  function _custosMensal(row) {
    const custos = _parseCustos(row.custos);
    if (custos.length > 0) {
      return custos.reduce((s, c) => s + (parseFloat(c.valor) || 0) * (_FATOR_MENSAL[c.periodicidade] ?? 0), 0);
    }
    return (parseFloat(row.valor) || 0) * (_FATOR_MENSAL[row.periodicidade] ?? 0);
  }

  function _custosLabel(row) {
    const custos = _parseCustos(row.custos);
    if (custos.length > 0) {
      const mensal = _custosMensal(row);
      if (mensal > 0) return fmtMoney(mensal) + "/mês";
      const total = custos.reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
      return total > 0 ? fmtMoney(total) : "—";
    }
    if (!row.valor) return "—";
    return fmtMoney(row.valor) + (row.periodicidade ? `/${row.periodicidade.toLowerCase()}` : "");
  }

  /* ── Cache e filtros ────────────────────────────────── */

  let _cache = [];
  let _loadError    = null;
  let _tipoFiltro   = "";
  let _buscaFiltro  = "";
  let _statusFiltro = "";
  let _responsaveis = [];

  async function _carregarResponsaveis() {
    if (_responsaveis.length) return _responsaveis;
    try {
      const [oficiais, nomeados] = await Promise.all([
        apiRead("OFICIAIS_TABLE"),
        apiRead("NOMEADOS_TABLE"),
      ]);
      const labels = { pastor: "Rev.", presbitero: "Presb.", diacono: "Diác." };
      const ordens = oficiais
        .filter(o => ["ativo", "especial"].includes(o.status))
        .map(o => `${labels[o.cargo] || ""} ${o.nome}`.trim());
      const noms = nomeados.filter(n => n.status === "ativo").map(n => n.nome);
      const seen = new Set();
      _responsaveis = [...ordens, ...noms].filter(n => { if (seen.has(n)) return false; seen.add(n); return true; });
    } catch (e) {
      console.warn("Responsáveis load:", e.message);
    }
    return _responsaveis;
  }

  async function _load() {
    _loadError = null;
    try {
      const url = `${apiBaseUrl()}/rest/v1/contratos?select=*&deleted_at=is.null&order=created_at.desc.nullslast&limit=500`;
      console.log("[Contratos] fetch →", url);
      const res = await fetch(url, { headers: apiHeaders({ "Prefer": "count=none" }) });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data = await res.json();
      console.log(`[Contratos] resultado: ${Array.isArray(data) ? data.length : "inválido"} registro(s)`, data[0] ?? "(vazio)");
      _cache = Array.isArray(data) ? data.map(r => ({ ...r, _row: r.id })) : [];
    } catch (e) {
      console.warn("[Contratos] erro:", e.message);
      _cache = [];
      _loadError = e.message;
    }
    return _cache;
  }

  function _invalidate() { _cache = []; _loadError = null; }

  function _filtrarLista(rows) {
    let r = [...rows];
    if (_tipoFiltro)   r = r.filter(x => x.tipo === _tipoFiltro);
    if (_statusFiltro) r = r.filter(x => _autoStatus(x) === _statusFiltro);
    if (_buscaFiltro) {
      const q = _buscaFiltro.toLowerCase();
      r = r.filter(x => [x.titulo, x.produto, x.fornecedor, x.responsavel, x.tipo]
        .some(v => v && String(v).toLowerCase().includes(q)));
    }
    return r;
  }

  /* ── Render principal ───────────────────────────────── */

  async function renderContratos() {
    const el = document.getElementById("con-list");
    if (!el) return;

    el.innerHTML = `<div style="padding:12px 0;color:var(--tx3);font-size:11.5px">${_sp()} Carregando...</div>`;
    await _load();

    if (_loadError) {
      el.innerHTML = `<div style="color:var(--rose);font-size:12px;padding:12px 0">
        Erro ao carregar contratos: ${escapeHtml(_loadError)}<br>
        <button onclick="conRecarregar()" style="margin-top:8px;padding:5px 12px;border-radius:6px;border:1px solid var(--bd2);background:none;color:var(--tx2);font-size:11.5px;cursor:pointer">↻ Tentar novamente</button>
      </div>`;
      return;
    }

    /* KPIs */
    const kpiEl = document.getElementById("con-kpis");
    if (kpiEl) {
      const ativos  = _cache.filter(r => _autoStatus(r) === "Ativo");
      const avencer = _cache.filter(r => _autoStatus(r) === "A vencer");
      const vencido = _cache.filter(r => _autoStatus(r) === "Vencido");
      const vigentes = _cache.filter(r => !["Cancelado","Encerrado"].includes(_autoStatus(r)));
      const valMensal = vigentes.reduce((s, r) => s + _custosMensal(r), 0);
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
          <div class="kpi-body"><div class="kpi-lbl">Custo mensal</div><div class="kpi-val" style="font-size:15px">${valMensal > 0 ? fmtMoney(valMensal) : "—"}</div><div class="kpi-d nu">${valMensal > 0 ? fmtMoney(valMensal * 12) + "/ano" : "contratos ativos"}</div></div>
        </div>`;
    }

    /* Alert banner — contratos urgentes */
    const alertasEl = document.getElementById("con-alertas");
    if (alertasEl) {
      const urgentes = _cache
        .filter(r => {
          const st = _autoStatus(r);
          if (st === "Cancelado" || st === "Encerrado") return false;
          const d = diasParaVencer(r.data_vencimento);
          return d !== null && d <= 30;
        })
        .sort((a, b) => (a.data_vencimento || "").localeCompare(b.data_vencimento || ""));

      if (urgentes.length > 0) {
        const items = urgentes.slice(0, 3).map(r => {
          const dias = diasParaVencer(r.data_vencimento);
          const nome = escapeHtml(r.produto || r.titulo || r.tipo);
          const cor  = dias <= 7 ? "var(--rose)" : "var(--amber)";
          const txt  = dias < 0 ? `vencido há ${Math.abs(dias)}d` : dias === 0 ? "vence hoje" : `vence em ${dias}d`;
          return `<span onclick="conAbrirDetalhe('${r.id}')" style="cursor:pointer;color:${cor};font-weight:600;text-decoration:underline;text-underline-offset:2px">${nome}</span> <span style="color:var(--tx3);font-size:10px">(${txt})</span>`;
        }).join(" · ");
        const extra = urgentes.length > 3 ? ` <span style="color:var(--tx3);font-size:10px">+${urgentes.length - 3}</span>` : "";
        alertasEl.innerHTML = `<div class="alr alr-w" style="margin-bottom:12px"><span class="alr-i">⚠</span><div style="font-size:12px">${items}${extra}</div></div>`;
      } else {
        alertasEl.innerHTML = "";
      }
    }

    /* Filtrar + ordenar */
    let rows = _filtrarLista(_cache);
    rows.sort((a, b) => {
      const ordem = { "Vencido": 0, "A vencer": 1, "Em negociação": 2, "Ativo": 3, "Encerrado": 4, "Cancelado": 5 };
      const oa = ordem[_autoStatus(a)] ?? 9, ob = ordem[_autoStatus(b)] ?? 9;
      if (oa !== ob) return oa - ob;
      return (a.data_vencimento || "").localeCompare(b.data_vencimento || "");
    });

    const countEl = document.getElementById("con-count");
    if (countEl) countEl.textContent = rows.length ? `${rows.length} registro${rows.length > 1 ? "s" : ""}` : "";

    if (rows.length === 0) {
      el.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:16px 0;text-align:center">
        Nenhum contrato encontrado.<br>
        <button class="tbt pri" style="margin-top:10px" onclick="conAbrirModal()">+ Novo Contrato</button>
      </div>`;
      return;
    }

    el.innerHTML = `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="border-bottom:1px solid var(--bd2)">
              ${["Tipo","Título / Produto","Fornecedor","Custo","Vencimento","Dias","Status",""].map(h =>
                `<th style="text-align:left;padding:8px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`
              ).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => {
              const t   = tipoInfo(r.tipo);
              const st  = _autoStatus(r);
              const dias = diasParaVencer(r.data_vencimento);
              const diasTxt = dias === null ? "—"
                : dias < 0  ? `<span style="color:var(--rose);font-weight:700">${Math.abs(dias)}d atrás</span>`
                : dias <= 7  ? `<span style="color:var(--rose);font-weight:700">${dias}d</span>`
                : dias <= 30 ? `<span style="color:var(--amber);font-weight:700">${dias}d</span>`
                : `<span style="color:var(--tx3)">${dias}d</span>`;
              return `
              <tr style="border-bottom:1px solid var(--bd1);cursor:pointer"
                  onclick="conAbrirDetalhe('${r.id}')"
                  onmouseover="this.style.background='var(--bg-hover)'"
                  onmouseout="this.style.background=''">
                <td style="padding:8px"><span style="font-size:11px;font-weight:600;color:${t.cor}">${t.icon} ${escapeHtml(r.tipo || "—")}</span></td>
                <td style="padding:8px;color:var(--tx1);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500">
                  ${r.produto ? `<div style="font-size:10.5px;color:var(--tx3)">${escapeHtml(r.produto)}</div>` : ""}
                  <div>${escapeHtml(r.titulo || "—")}</div>
                </td>
                <td style="padding:8px;color:var(--tx2);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.fornecedor || "—")}</td>
                <td style="padding:8px;color:var(--tx1);white-space:nowrap;font-weight:500">${_custosLabel(r)}</td>
                <td style="padding:8px;color:var(--tx2);white-space:nowrap">${fmtD(r.data_vencimento)}</td>
                <td style="padding:8px;white-space:nowrap">${diasTxt}</td>
                <td style="padding:8px">${pillStatus(st)}</td>
                <td style="padding:8px">
                  <button onclick="event.stopPropagation();conAbrirModal('${r.id}')"
                    style="font-size:10px;padding:3px 8px;border-radius:5px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx2);cursor:pointer">✎</button>
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
    if (typeof go === "function") await go("admin-con-detalhe");
    _renderDetalhe(con, "dados");
  };

  function _renderDetalhe(con, tab) {
    const el = document.getElementById("v-admin-con-detalhe");
    if (!el) return;
    const tabAtiva = tab || "dados";
    const t  = tipoInfo(con.tipo);
    const st = _autoStatus(con);
    const dias = diasParaVencer(con.data_vencimento);
    const mensal = _custosMensal(con);

    /* Linhas da aba Dados */
    const dadosLinhas = [
      ["Tipo", `<span style="color:${t.cor};font-weight:600">${t.icon} ${escapeHtml(con.tipo)}</span>`],
      con.produto        ? ["Produto / Sistema",   escapeHtml(con.produto)]                                                     : null,
      con.fornecedor     ? ["Fornecedor",           escapeHtml(con.fornecedor)]                                                  : null,
      con.proprietario   ? ["Proprietário",         escapeHtml(con.proprietario)]                                                : null,
      con.endereco       ? ["Endereço",             escapeHtml(con.endereco)]                                                    : null,
      con.num_licencas   ? ["Nº de licenças",       String(con.num_licencas)]                                                    : null,
      con.tipo_licenca   ? ["Tipo de licença",      escapeHtml(con.tipo_licenca)]                                                : null,
      con.num_apolice    ? ["Nº da apólice",        escapeHtml(con.num_apolice)]                                                 : null,
      con.tipo_seguro    ? ["Tipo de seguro",       escapeHtml(con.tipo_seguro)]                                                 : null,
      con.valor_segurado ? ["Valor segurado",       fmtMoney(con.valor_segurado)]                                               : null,
      con.valor          ? ["Valor contratual",     fmtMoney(con.valor) + (con.periodicidade ? ` / ${escapeHtml(con.periodicidade)}` : "")] : null,
      con.indice_reajuste ? ["Índice de reajuste",  `${escapeHtml(String(con.indice_reajuste))}${con.perc_reajuste ? ` (${con.perc_reajuste}%)` : ""}`] : null,
      ["Início",     fmtD(con.data_inicio)],
      ["Vencimento", fmtD(con.data_vencimento)],
      dias !== null ? ["Prazo", dias < 0
        ? `<span style="color:var(--rose);font-weight:600">Vencido há ${Math.abs(dias)} dias</span>`
        : dias <= 30
          ? `<span style="color:var(--amber);font-weight:600">Vence em ${dias} dias</span>`
          : `<span style="color:var(--gr)">${dias} dias restantes</span>`] : null,
      con.renovacao_automatica != null ? ["Renovação automática", con.renovacao_automatica ? "✅ Sim" : "Não"] : null,
      con.responsavel        ? ["Responsável",         escapeHtml(con.responsavel)]                                             : null,
      con.contato_fornecedor ? ["Contato",             escapeHtml(con.contato_fornecedor)]                                      : null,
      con.forma_pagamento    ? ["Forma de pagamento",  escapeHtml(con.forma_pagamento)]                                         : null,
    ].filter(Boolean);

    /* Custos JSONB */
    const custos = _parseCustos(con.custos);

    /* HTML das tabs */
    const tabsHtml = `
      <div style="display:flex;gap:0;border-bottom:2px solid var(--bd2);margin-bottom:16px">
        ${[["dados","Dados"],["custos","Custos"],["anexos","Anexos"]].map(([tid, lbl]) =>
          `<button onclick="conDetalheTab('${con.id}','${tid}')"
            style="padding:8px 18px;border:none;background:none;font-size:12px;font-weight:600;cursor:pointer;color:${tabAtiva===tid?"var(--gold)":"var(--tx3)"};border-bottom:${tabAtiva===tid?"2px solid var(--gold)":"2px solid transparent"};margin-bottom:-2px;transition:color .15s">${lbl}</button>`
        ).join("")}
      </div>`;

    const dadosTabHtml = `
      <table style="width:100%;font-size:11.5px;border-collapse:collapse">
        ${dadosLinhas.map(([lbl, val], i) => `
          <tr style="${i > 0 ? "border-top:1px solid var(--bd1)" : ""}">
            <td style="color:var(--tx3);padding:7px 0;width:38%">${lbl}</td>
            <td style="color:var(--tx1)">${val}</td>
          </tr>`).join("")}
      </table>
      ${con.descricao  ? `<div class="ctit" style="margin-top:16px">Descrição</div><div style="font-size:12px;color:var(--tx1);line-height:1.7;margin-top:6px">${escapeHtml(con.descricao)}</div>` : ""}
      ${con.observacoes ? `<div class="ctit" style="margin-top:16px">Observações</div><div style="font-size:12px;color:var(--tx2);line-height:1.7;margin-top:6px">${escapeHtml(con.observacoes)}</div>` : ""}`;

    const custosTabHtml = custos.length === 0 ? `
      <div style="text-align:center;padding:24px 0;color:var(--tx3)">
        <div style="font-size:28px;margin-bottom:8px">💰</div>
        <div style="font-size:12px">Nenhum item de custo cadastrado.</div>
        ${con.valor ? `<div style="font-size:11px;margin-top:6px">${fmtMoney(con.valor)}${con.periodicidade ? " / " + con.periodicidade : ""} (campo legado)</div>` : ""}
        <button onclick="conAbrirModal('${con.id}')" style="margin-top:12px;padding:7px 14px;border-radius:6px;border:1px solid var(--bd2);background:none;color:var(--tx2);font-size:11.5px;cursor:pointer">Adicionar custos detalhados</button>
      </div>` : `
      <div style="margin-bottom:12px;padding:10px 14px;background:rgba(212,168,67,.1);border-radius:8px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11.5px;color:var(--tx2)">Custo mensal equivalente</span>
        <span style="font-size:18px;font-weight:700;color:var(--gold)">${fmtMoney(mensal)}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="border-bottom:1px solid var(--bd2)">
          ${["Descrição","Valor","Periodicidade","Equiv./mês"].map(h =>
            `<th style="text-align:left;padding:7px 8px;font-size:10px;text-transform:uppercase;color:var(--tx3);font-weight:600">${h}</th>`
          ).join("")}
        </tr></thead>
        <tbody>
          ${custos.map(c => {
            const eq = (parseFloat(c.valor) || 0) * (_FATOR_MENSAL[c.periodicidade] ?? 0);
            return `<tr style="border-bottom:1px solid var(--bd1)">
              <td style="padding:7px 8px;color:var(--tx1)">${escapeHtml(c.descricao || "—")}</td>
              <td style="padding:7px 8px;font-weight:500">${fmtMoney(c.valor)}</td>
              <td style="padding:7px 8px;color:var(--tx2)">${escapeHtml(c.periodicidade || "—")}</td>
              <td style="padding:7px 8px;font-weight:500;color:${eq > 0 ? "var(--tx1)" : "var(--tx3)"}">${eq > 0 ? fmtMoney(eq) : "—"}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;

    const anexosTabHtml = `
      <div id="con-det-anexos-list">
        <div style="color:var(--tx3);font-size:11.5px">${_sp()} Carregando documentos...</div>
      </div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--bd1)">
        <div class="ctit" style="margin-bottom:10px">Adicionar documento</div>
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end">
          <div>
            <label style="display:block;font-size:10.5px;color:var(--tx3);margin-bottom:4px">Nome do documento</label>
            <input id="con-anx-nome" type="text" placeholder="Ex: Contrato assinado"
              style="width:100%;padding:7px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px;box-sizing:border-box">
          </div>
          <div>
            <label style="display:block;font-size:10.5px;color:var(--tx3);margin-bottom:4px">URL / Link</label>
            <input id="con-anx-url" type="url" placeholder="https://drive.google.com/..."
              style="width:100%;padding:7px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px;box-sizing:border-box">
          </div>
          <button onclick="conAnexoAdd('${con.id}')"
            style="padding:7px 14px;border-radius:6px;border:none;background:var(--gold);color:#fff;font-size:12px;font-weight:600;cursor:pointer">Adicionar</button>
        </div>
      </div>`;

    el.innerHTML = `
      <div class="hero">
        <div class="hero-ic" style="background:${t.corbg};border-color:${t.cor}44;font-size:22px">${t.icon}</div>
        <div>
          <div class="hero-lbl">Contrato · ${t.icon} ${escapeHtml(con.tipo)}</div>
          <div class="hero-ttl">${escapeHtml(con.produto || con.titulo || "—")}</div>
          <div class="hero-dsc" style="display:flex;gap:8px;align-items:center;margin-top:4px">
            ${pillStatus(st)}
            ${con.fornecedor ? `<span style="color:var(--tx3);font-size:11px">${escapeHtml(con.fornecedor)}</span>` : ""}
            ${mensal > 0 ? `<span style="color:var(--gold);font-size:11px;font-weight:600">${fmtMoney(mensal)}/mês</span>` : ""}
          </div>
        </div>
        <div class="hero-act">
          <button class="tbt" onclick="go('admin-con')">← Voltar</button>
          <button class="tbt pri" onclick="conAbrirModal('${con.id}')">✎ Editar</button>
          <button class="tbt" onclick="conExcluir('${con.id}')" style="color:var(--rose)">Excluir</button>
        </div>
      </div>
      <div class="ct">
        <div class="g2">
          <div class="card">
            ${tabsHtml}
            ${tabAtiva === "dados"  ? dadosTabHtml  :
              tabAtiva === "custos" ? custosTabHtml :
              anexosTabHtml}
          </div>
          <div class="card">
            <div class="ctit">Status</div>
            <div style="font-size:11px;color:var(--tx3);margin-bottom:10px">Atual: ${pillStatus(st)}</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${["Ativo","Em negociação","Cancelado","Encerrado"].map(s => `
                <button onclick="conAtualizarStatus('${con.id}','${s}')"
                  style="text-align:left;padding:9px 14px;border-radius:6px;border:1px solid ${con.status===s?"var(--gr)":"var(--bd2)"};background:${con.status===s?"rgba(58,170,92,.1)":"var(--bg-card)"};color:${con.status===s?"var(--gr)":"var(--tx1)"};font-size:12px;font-weight:${con.status===s?"700":"400"};cursor:pointer;transition:all .15s"
                  onmouseover="if('${con.status}'!=='${s}')this.style.background='var(--bg-hover)'"
                  onmouseout="if('${con.status}'!=='${s}')this.style.background='var(--bg-card)'">
                  ${con.status===s?"✓ ":"○ "}${s}
                </button>`).join("")}
            </div>
          </div>
        </div>
      </div>`;

    if (tabAtiva === "anexos") {
      _carregarAnexos(con.id).then(anx => _renderAnexos(anx, con.id));
    }
  }

  window.conDetalheTab = function (id, tab) {
    const con = _cache.find(r => String(r.id) === String(id));
    if (!con) return;
    _renderDetalhe(con, tab);
  };

  /* ── Anexos ─────────────────────────────────────────── */

  async function _carregarAnexos(conId) {
    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/contrato_anexos?contrato_id=eq.${encodeURIComponent(conId)}&order=criado_em.asc`,
        { headers: apiHeaders() }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn("Anexos load:", e.message);
      return [];
    }
  }

  function _renderAnexos(anexos, conId) {
    const el = document.getElementById("con-det-anexos-list");
    if (!el) return;
    if (!anexos.length) {
      el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;text-align:center;padding:12px 0">Nenhum documento vinculado.</div>`;
      return;
    }
    el.innerHTML = anexos.map(a => `
      <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd1)">
        <span style="font-size:16px">📎</span>
        <div style="flex:1;min-width:0">
          <a href="${escapeHtml(a.url)}" target="_blank"
            style="color:var(--blue);font-size:12px;font-weight:500;text-decoration:none">${escapeHtml(a.nome)}</a>
          ${a.enviado_por ? `<div style="font-size:10.5px;color:var(--tx3)">${escapeHtml(a.enviado_por)}</div>` : ""}
        </div>
        <button onclick="conAnexoRemover('${a.id}','${conId}')"
          style="background:none;border:none;color:var(--rose);cursor:pointer;font-size:16px;padding:2px 6px">×</button>
      </div>`).join("");
  }

  window.conAnexoAdd = async function (conId) {
    const nomeEl = document.getElementById("con-anx-nome");
    const urlEl  = document.getElementById("con-anx-url");
    const nome   = nomeEl?.value?.trim();
    const url    = urlEl?.value?.trim();
    if (!nome || !url) { if (typeof T === "function") T("Campos obrigatórios", "Informe nome e URL"); return; }
    try {
      const usuarioNome = (typeof USUARIO_ATUAL !== "undefined" && USUARIO_ATUAL?.nome) || null;
      const res = await fetch(`${apiBaseUrl()}/rest/v1/contrato_anexos`, {
        method: "POST",
        headers: apiHeaders({ "Prefer": "return=representation" }),
        body: JSON.stringify({ contrato_id: conId, nome, url, enviado_por: usuarioNome })
      });
      if (!res.ok) throw new Error(await res.text());
      if (nomeEl) nomeEl.value = "";
      if (urlEl)  urlEl.value  = "";
      const anexos = await _carregarAnexos(conId);
      _renderAnexos(anexos, conId);
      if (typeof T === "function") T("Documento adicionado", nome);
    } catch (e) {
      if (typeof T === "function") T("Erro", "Não foi possível adicionar");
      console.error(e);
    }
  };

  window.conAnexoRemover = async function (anexoId, conId) {
    if (!confirm("Remover este documento?")) return;
    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/contrato_anexos?id=eq.${encodeURIComponent(anexoId)}`,
        { method: "DELETE", headers: apiHeaders() }
      );
      if (!res.ok) throw new Error(await res.text());
      const anexos = await _carregarAnexos(conId);
      _renderAnexos(anexos, conId);
    } catch (e) {
      if (typeof T === "function") T("Erro", "Não foi possível remover");
      console.error(e);
    }
  };

  /* ── Atualizar status ───────────────────────────────── */

  window.conAtualizarStatus = async function (id, novoStatus) {
    try {
      await apiWrite("update", "CONTRATOS", { _row: id, status: novoStatus });
      if (typeof T === "function") T("Status atualizado", novoStatus);
      const idx = _cache.findIndex(r => String(r.id) === String(id));
      if (idx >= 0) _cache[idx].status = novoStatus;
      _renderDetalhe(_cache[idx]);
      _atualizarBadgeVencer();
    } catch (e) {
      if (typeof T === "function") T("Erro", "Não foi possível atualizar");
      console.error(e);
    }
  };

  /* ── Modal ──────────────────────────────────────────── */

  let _editandoId = null;

  window.conAbrirModal = async function (id) {
    _editandoId = id || null;
    const m = document.getElementById("modal-contrato");
    if (!m) return;
    let dados = {};
    if (_editandoId) {
      if (!_cache.length) await _load();
      dados = _cache.find(r => String(r.id) === String(_editandoId)) || {};
    }
    const tipoAtual = dados.tipo || "";
    m.querySelector("#con-f-tipo").value = tipoAtual;
    m.querySelector("#con-modal-title").textContent = _editandoId ? "Editar Contrato" : "Novo Contrato";
    await _carregarResponsaveis();
    _renderCamposModal(tipoAtual, dados);
    m.style.display = "flex";
  };

  window.conFecharModal = function () {
    const m = document.getElementById("modal-contrato");
    if (m) m.style.display = "none";
    _editandoId = null;
  };

  window.conOnTipoChange = function () {
    _renderCamposModal(document.getElementById("con-f-tipo")?.value || "", {});
  };

  function _renderCamposModal(tipo, dados) {
    const el = document.getElementById("con-campos-dinamicos");
    if (!el) return;
    if (!tipo) {
      el.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:8px 0">Selecione o tipo de contrato para ver os campos.</div>`;
      return;
    }
    const t = tipoInfo(tipo);
    const custosIniciais = _parseCustos(dados.custos);

    el.innerHTML = t.campos.map(c => {
      const val = dados[c.id] !== undefined ? dados[c.id] : "";
      const req = c.req ? ' <span style="color:var(--rose)">*</span>' : "";
      let input;
      if (c.tipo === "select") {
        input = `<select id="con-cf-${c.id}" style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px">
          <option value="">Selecionar...</option>
          ${c.opcoes.map(o => `<option value="${o}" ${val===o?"selected":""}>${typeof tcPT==="function"?tcPT(o):o}</option>`).join("")}
        </select>`;
      } else if (c.tipo === "toggle") {
        input = `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--tx1)">
          <input type="checkbox" id="con-cf-${c.id}" ${val?"checked":""} style="width:16px;height:16px"> Sim
        </label>`;
      } else if (c.tipo === "money" || c.tipo === "number") {
        input = `<input type="number" id="con-cf-${c.id}" value="${val}" step="${c.tipo==="money"?"0.01":"1"}" min="0"
          style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px;box-sizing:border-box">`;
      } else if (c.tipo === "date") {
        input = `<input type="date" id="con-cf-${c.id}" value="${val||""}"
          style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px;box-sizing:border-box">`;
      } else {
        input = `<input type="text" id="con-cf-${c.id}" value="${escapeHtmlAttr(val||"")}" placeholder="${escapeHtmlAttr(c.label)}"
          style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px;box-sizing:border-box">`;
      }
      return `<div style="margin-bottom:12px">
        <label style="display:block;font-size:11px;color:var(--tx3);margin-bottom:4px">${typeof tcPT==="function"?tcPT(c.label):c.label}${req}</label>
        ${input}
      </div>`;
    }).join("") + `
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:11px;color:var(--tx3);margin-bottom:4px">Responsável interno</label>
        <input type="text" id="con-cf-responsavel" value="${escapeHtmlAttr(dados.responsavel||"")}"
          placeholder="Digite ou selecione..." list="con-resp-datalist" autocomplete="off"
          style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px;box-sizing:border-box">
        <datalist id="con-resp-datalist">
          ${_responsaveis.map(n => `<option value="${escapeHtmlAttr(n)}">`).join("")}
        </datalist>
      </div>
      <div style="margin-bottom:16px">
        <label style="display:block;font-size:11px;color:var(--tx3);margin-bottom:4px">Observações</label>
        <textarea id="con-cf-observacoes" rows="2" placeholder="Informações adicionais..."
          style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px;box-sizing:border-box;resize:vertical">${escapeHtml(dados.observacoes||"")}</textarea>
      </div>
      ${_renderCustosModal(custosIniciais)}`;
  }

  const _PERIODOS = ["Mensal","Bimestral","Trimestral","Semestral","Anual","Único","Sob demanda"];

  function _custoRowHtml(c) {
    return `
      <div class="con-custo-row" style="display:grid;grid-template-columns:1fr 110px 120px auto;gap:6px;align-items:end;margin-bottom:8px">
        <input type="text" class="con-custo-desc" value="${escapeHtmlAttr(c.descricao||"")}" placeholder="Descrição"
          style="padding:7px 9px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px">
        <input type="number" class="con-custo-val" value="${c.valor||""}" step="0.01" min="0" placeholder="R$ 0,00"
          style="padding:7px 9px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px;text-align:right">
        <select class="con-custo-per" style="padding:7px 9px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg2));color:var(--tx1);font-size:12px">
          ${_PERIODOS.map(p => `<option value="${p}" ${(c.periodicidade||"Mensal")===p?"selected":""}>${p}</option>`).join("")}
        </select>
        <button type="button" onclick="conCustoRemover(this)"
          style="padding:7px 10px;border-radius:6px;border:1px solid var(--bd2);background:none;color:var(--rose);cursor:pointer;font-size:15px">×</button>
      </div>`;
  }

  function _renderCustosModal(custosIniciais) {
    return `
      <div style="border-top:1px solid var(--bd1);padding-top:14px;margin-bottom:4px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em">Itens de Custo</div>
          <button type="button" onclick="conCustoAdicionar()"
            style="font-size:11px;padding:4px 10px;border-radius:5px;border:1px solid var(--bd2);background:none;color:var(--tx2);cursor:pointer">+ Adicionar</button>
        </div>
        <div id="con-custos-rows">
          ${custosIniciais.length > 0
            ? custosIniciais.map(c => _custoRowHtml(c)).join("")
            : `<div class="con-custo-vazio" style="font-size:11.5px;color:var(--tx3);padding:4px 0">Nenhum item. Use "+ Adicionar" para detalhar os custos.</div>`}
        </div>
      </div>`;
  }

  window.conCustoAdicionar = function () {
    const container = document.getElementById("con-custos-rows");
    if (!container) return;
    const vazio = container.querySelector(".con-custo-vazio");
    if (vazio) vazio.remove();
    const div = document.createElement("div");
    div.innerHTML = _custoRowHtml({});
    container.appendChild(div.firstElementChild);
  };

  window.conCustoRemover = function (btn) {
    const row = btn.closest(".con-custo-row");
    if (row) row.remove();
    const container = document.getElementById("con-custos-rows");
    if (container && !container.querySelector(".con-custo-row")) {
      const div = document.createElement("div");
      div.className = "con-custo-vazio";
      div.style.cssText = "font-size:11.5px;color:var(--tx3);padding:4px 0";
      div.textContent = "Nenhum item. Use \"+ Adicionar\" para detalhar os custos.";
      container.appendChild(div);
    }
  };

  window.conSalvar = async function () {
    const tipo = document.getElementById("con-f-tipo")?.value;
    if (!tipo) { if (typeof T === "function") T("Campo obrigatório", "Selecione o tipo de contrato"); return; }

    const t = tipoInfo(tipo);
    const payload = { tipo };

    for (const c of t.campos) {
      const el = document.getElementById(`con-cf-${c.id}`);
      if (!el) continue;
      let val = c.tipo === "toggle" ? el.checked : el.value?.trim() || null;
      if (c.tipo === "money" || c.tipo === "number") val = val ? parseFloat(val) : null;
      if (c.req && !val && val !== false) {
        if (typeof T === "function") T("Campo obrigatório", c.label);
        el.focus(); return;
      }
      payload[c.id] = val;
    }

    const respEl = document.getElementById("con-cf-responsavel");
    const obsEl  = document.getElementById("con-cf-observacoes");
    if (respEl) payload.responsavel = respEl.value?.trim() || null;
    if (obsEl)  payload.observacoes = obsEl.value?.trim() || null;

    payload.custos = [...(document.querySelectorAll(".con-custo-row") || [])].map(row => ({
      descricao:    row.querySelector(".con-custo-desc")?.value?.trim() || "",
      valor:        parseFloat(row.querySelector(".con-custo-val")?.value) || 0,
      periodicidade: row.querySelector(".con-custo-per")?.value || "Mensal",
    })).filter(c => c.descricao || c.valor > 0);

    if (!_editandoId) payload.status = "Ativo";
    if (!payload.titulo) payload.titulo = payload.produto || tipo;

    try {
      if (_editandoId) {
        await apiWrite("update", "CONTRATOS", { _row: _editandoId, ...payload });
        if (typeof T === "function") T("Contrato atualizado!", payload.titulo || tipo);
        const idx = _cache.findIndex(r => String(r.id) === String(_editandoId));
        if (idx >= 0) Object.assign(_cache[idx], payload);
      } else {
        await apiWrite("create", "CONTRATOS", payload);
        if (typeof T === "function") T("Contrato registrado!", payload.titulo || tipo);
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
      if (typeof go === "function") await go("admin-con");
      else await renderContratos();
    } catch (e) {
      if (typeof T === "function") T("Erro", "Não foi possível excluir");
      console.error(e);
    }
  };

  /* ── Filtros ────────────────────────────────────────── */

  window.conFiltrarTipo = function (tipo) {
    _tipoFiltro = tipo;
    document.querySelectorAll("#con-tipo-tabs .bni").forEach(el => {
      el.classList.toggle("on", (el.dataset.tipo || "") === tipo);
    });
    renderContratos();
  };

  window.conFiltrar = function () {
    _buscaFiltro  = (document.getElementById("con-f-busca")?.value  || "").trim();
    _statusFiltro =  document.getElementById("con-f-status")?.value || "";
    renderContratos();
  };

  /* ── Badge no menu ──────────────────────────────────── */

  function _atualizarBadgeVencer() {
    const badge = document.querySelector("#mw-admin-con .mbadge");
    if (!badge) return;
    const n = _cache.filter(r => ["A vencer","Vencido"].includes(_autoStatus(r))).length;
    badge.textContent = n || "";
    badge.style.display = n ? "" : "none";
  }

  /* ── Hook no go() ───────────────────────────────────── */

  async function renderAdminDash() {
    if (!_cache.length && !_loadError) await _load();
    const sv = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    const avencer  = _cache.filter(r => _autoStatus(r) === "A vencer");
    const vencidos = _cache.filter(r => _autoStatus(r) === "Vencido");
    const urgentes = _cache
      .filter(r => {
        const st = _autoStatus(r);
        if (["Cancelado","Encerrado"].includes(st)) return false;
        const d = diasParaVencer(r.data_vencimento);
        return d !== null && d <= 30;
      })
      .sort((a, b) => (a.data_vencimento || "").localeCompare(b.data_vencimento || ""));

    const totalAlerta = avencer.length + vencidos.length;
    sv("adm-kpi-contratos", totalAlerta);

    const qaEl = document.getElementById("adm-qa-con");
    if (qaEl) qaEl.textContent = totalAlerta > 0 ? `${totalAlerta} a vencer` : "todos em dia";

    try {
      const estRes = await fetch(
        `${apiBaseUrl()}/rest/v1/estoque_itens?select=id&ativo=eq.true&limit=1`,
        { headers: apiHeaders({ "Prefer": "count=exact" }) }
      );
      if (estRes.ok) {
        const cr = estRes.headers.get("content-range");
        const n  = cr ? parseInt(cr.split("/")[1], 10) : NaN;
        sv("adm-kpi-estoque", isNaN(n) ? "—" : n);
      }
    } catch (_) {}

    try {
      const mbRes = await fetch(
        `${apiBaseUrl()}/rest/v1/v_membros?select=id&limit=1`,
        { headers: apiHeaders({ "Prefer": "count=exact" }) }
      );
      if (mbRes.ok) {
        const cr = mbRes.headers.get("content-range");
        const n  = cr ? parseInt(cr.split("/")[1], 10) : NaN;
        sv("adm-kpi-colab", isNaN(n) ? "—" : n);
      }
    } catch (_) {}

    const alertEl = document.getElementById("adm-dash-alerta");
    if (alertEl) {
      if (urgentes.length > 0) {
        const items = urgentes.slice(0, 3).map(r => {
          const d   = diasParaVencer(r.data_vencimento);
          const cor = d !== null && d <= 7 ? "var(--rose)" : "var(--amber)";
          const txt = d < 0 ? `vencido há ${Math.abs(d)}d` : d === 0 ? "vence hoje" : `vence em ${d}d`;
          return `<span onclick="conAbrirDetalhe('${r.id}')" style="cursor:pointer;color:${cor};font-weight:600">${escapeHtml(r.produto || r.titulo || r.tipo || "—")}</span> <span style="color:var(--tx3);font-size:10px">(${txt})</span>`;
        }).join(" · ");
        const extra = urgentes.length > 3 ? ` <span style="color:var(--tx3);font-size:10px">+${urgentes.length - 3}</span>` : "";
        alertEl.innerHTML = `<div class="alr alr-w" style="margin-bottom:12px"><span class="alr-i">⚠</span><div style="font-size:12px">${items}${extra}</div><span class="alr-a" onclick="go('admin-con')">Ver →</span></div>`;
      } else {
        alertEl.innerHTML = "";
      }
    }

    const contEl = document.getElementById("adm-dash-contratos");
    if (contEl) {
      if (!_cache.length) {
        contEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--tx3);font-size:12px">
          <div style="font-size:22px;margin-bottom:6px">📄</div>Nenhum contrato cadastrado.
          <div style="margin-top:10px"><button class="tbt pri" onclick="go('admin-con')">Cadastrar contrato</button></div></div>`;
      } else if (!urgentes.length) {
        contEl.innerHTML = `<div style="padding:16px 0;color:var(--tx3);font-size:12px;text-align:center">Nenhum contrato próximo do vencimento. <span onclick="go('admin-con')" style="color:var(--tx2);cursor:pointer">Ver todos →</span></div>`;
      } else {
        contEl.innerHTML = urgentes.slice(0, 5).map(r => {
          const d    = diasParaVencer(r.data_vencimento);
          const dot  = d !== null && d <= 7 ? "var(--rose)" : "var(--amber)";
          const pill = d < 0 ? `<span class="pill pl">Vencido</span>` : d <= 7 ? `<span class="pill pl">Urgente</span>` : `<span class="pill po">Atenção</span>`;
          const custo = _custosLabel(r);
          return `<div class="trow" onclick="conAbrirDetalhe('${r.id}')" style="cursor:pointer">
            <div class="tdot" style="background:${dot}"></div>
            <div class="tbody">
              <div class="ttitle">${escapeHtml(r.produto || r.titulo || "—")}</div>
              <div class="tmeta">${escapeHtml(r.fornecedor || "—")}${custo ? " · " + custo : ""} · vence ${fmtD(r.data_vencimento)}</div>
            </div>${pill}</div>`;
        }).join("");
      }
    }

    const pendEl = document.getElementById("adm-dash-pendencias");
    if (pendEl) {
      pendEl.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:8px 0">${_sp()} Carregando...</div>`;
      try {
        const url = `${apiBaseUrl()}/rest/v1/demandas?area=eq.Administrativo&status=not.in.(CONCLUIDA,CANCELADA)&select=id,titulo,prioridade,status,criado_em&order=criado_em.desc&limit=5`;
        const res = await fetch(url, { headers: apiHeaders() });
        if (!res.ok) throw new Error("fetch failed");
        const dems = await res.json();
        if (!Array.isArray(dems) || !dems.length) {
          pendEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--tx3);font-size:12px">
            <div style="font-size:22px;margin-bottom:6px">✅</div>Nenhuma pendência administrativa.</div>`;
        } else {
          const stCor = { ABERTA:"var(--sky)", EM_ANALISE:"var(--gold)", EM_ANDAMENTO:"var(--violet)", PENDENTE:"var(--amber)" };
          const stLbl = { ABERTA:"Aberta", EM_ANALISE:"Em Análise", EM_ANDAMENTO:"Em Andamento", PENDENTE:"Pendente" };
          pendEl.innerHTML = dems.map(r => {
            const cor  = stCor[r.status] || "var(--tx3)";
            const lbl  = stLbl[r.status] || r.status || "—";
            const pill = r.prioridade === "Urgente" ? `<span class="pill pl">Urgente</span>`
                       : r.prioridade === "Alta"    ? `<span class="pill po">Alta</span>`
                       :                              `<span class="pill pd">${escapeHtml(r.prioridade || "Normal")}</span>`;
            return `<div class="trow" style="cursor:pointer" onclick="demAbrirDetalhe('${r.id}','admin-dash')">
              <div class="tdot" style="background:${cor}"></div>
              <div class="tbody"><div class="ttitle">${escapeHtml(r.titulo || "—")}</div><div class="tmeta">${lbl}</div></div>
              ${pill}</div>`;
          }).join("");
        }
      } catch (_) {
        pendEl.innerHTML = `<div style="padding:12px;color:var(--tx3);font-size:12px">Não foi possível carregar as pendências.</div>`;
      }
    }
  }

  async function renderAdminEst() {
    try {
      const url = `${apiBaseUrl()}/rest/v1/estoque_itens?select=nome,categoria,quantidade,quantidade_min,unidade,localizacao,ativo&ativo=eq.true&limit=500`;
      const res = await fetch(url, { headers: apiHeaders({ "Prefer": "count=none" }) });
      if (!res.ok) return;
      const items = await res.json();
      if (!Array.isArray(items)) return;

      const sv = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      sv("est-kpi-total", items.length);

      const criticos = items.filter(r =>
        r.quantidade_min != null && r.quantidade != null &&
        Number(r.quantidade) < Number(r.quantidade_min)
      );
      sv("est-kpi-criticos", criticos.length);

      const tbody = document.getElementById("est-criticos-body");
      if (tbody) {
        if (!criticos.length) {
          tbody.innerHTML = `<tr><td colspan="4" style="padding:14px;text-align:center;color:var(--tx3);font-size:12px">Nenhum item abaixo do mínimo.</td></tr>`;
        } else {
          tbody.innerHTML = criticos.slice(0, 8).map(r =>
            `<tr>
              <td class="tdp">${escapeHtml(r.nome || "—")}</td>
              <td>${escapeHtml(r.localizacao || r.categoria || "—")}</td>
              <td class="mono neg">${r.quantidade ?? "—"} ${escapeHtml(r.unidade || "")}</td>
              <td class="tdc">${r.quantidade_min ?? "—"}</td>
            </tr>`
          ).join("");
        }
      }
    } catch (e) {
      console.warn("[AdminEst]", e);
    }
  }

  async function renderJurDash() {
    if (!_cache.length && !_loadError) await _load();
    const sv = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    const ativos  = _cache.filter(r => _autoStatus(r) === "Ativo");
    const avencer = _cache.filter(r => _autoStatus(r) === "A vencer");
    const vencido = _cache.filter(r => _autoStatus(r) === "Vencido");
    sv("jur-kpi-con",    ativos.length);
    sv("jur-kpi-avencer", avencer.length);
    sv("jur-kpi-venc",   vencido.length);

    const urgentes = _cache
      .filter(r => {
        const st = _autoStatus(r);
        if (["Cancelado","Encerrado"].includes(st)) return false;
        const d = diasParaVencer(r.data_vencimento);
        return d !== null && d <= 30;
      })
      .sort((a, b) => (a.data_vencimento || "").localeCompare(b.data_vencimento || ""));

    const conEl = document.getElementById("jur-dash-contratos");
    if (conEl) {
      if (!urgentes.length) {
        conEl.innerHTML = `<div style="padding:16px 0;color:var(--tx3);font-size:12px;text-align:center">Nenhum contrato próximo do vencimento.</div>`;
      } else {
        conEl.innerHTML = urgentes.slice(0, 5).map(r => {
          const d    = diasParaVencer(r.data_vencimento);
          const dot  = d !== null && d <= 7 ? "var(--rose)" : "var(--amber)";
          const pill = d < 0 ? `<span class="pill pl">Vencido</span>` : d <= 7 ? `<span class="pill pl">Urgente</span>` : `<span class="pill po">Atenção</span>`;
          return `<div class="trow" onclick="conAbrirDetalhe('${r.id}')" style="cursor:pointer">
            <div class="tdot" style="background:${dot}"></div>
            <div class="tbody">
              <div class="ttitle">${escapeHtml(r.produto || r.titulo || "—")}</div>
              <div class="tmeta">${escapeHtml(r.fornecedor || "—")} · vence ${fmtD(r.data_vencimento)}</div>
            </div>${pill}</div>`;
        }).join("");
      }
    }

    const filaEl = document.getElementById("jur-dash-fila");
    if (filaEl) {
      filaEl.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:6px 0">${_sp()} Carregando...</div>`;
      try {
        const url = `${apiBaseUrl()}/rest/v1/demandas?area=eq.Jurídico&status=not.in.(CONCLUIDA,CANCELADA)&select=id,titulo,prioridade,status,criado_em&order=prioridade.asc,criado_em.desc&limit=5`;
        const res = await fetch(url, { headers: apiHeaders() });
        if (!res.ok) throw new Error("fetch failed");
        const dems = await res.json();
        if (!Array.isArray(dems) || !dems.length) {
          // count demandas ativas
          sv("jur-kpi-dem", 0);
          filaEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--tx3);font-size:12px">
            <div style="font-size:22px;margin-bottom:6px">✅</div>Nenhuma demanda jurídica em aberto.</div>`;
        } else {
          sv("jur-kpi-dem", dems.length < 5 ? dems.length : dems.length + "+");
          const stCor = { ABERTA:"var(--sky)", EM_ANALISE:"var(--gold)", EM_ANDAMENTO:"var(--violet)", PENDENTE:"var(--amber)" };
          const stLbl = { ABERTA:"Aberta", EM_ANALISE:"Em Análise", EM_ANDAMENTO:"Em Andamento", PENDENTE:"Pendente" };
          filaEl.innerHTML = dems.map(r => {
            const cor  = stCor[r.status] || "var(--tx3)";
            const lbl  = stLbl[r.status] || r.status || "—";
            const pill = r.prioridade === "Urgente" ? `<span class="pill pl">Urgente</span>`
                       : r.prioridade === "Alta"    ? `<span class="pill po">Alta</span>`
                       :                              `<span class="pill pd">${escapeHtml(r.prioridade || "Normal")}</span>`;
            return `<div class="trow" style="cursor:pointer" onclick="demAbrirDetalhe('${r.id}','jur-dash')">
              <div class="tdot" style="background:${cor}"></div>
              <div class="tbody"><div class="ttitle">${escapeHtml(r.titulo || "—")}</div><div class="tmeta">${lbl}</div></div>
              ${pill}</div>`;
          }).join("");
        }
      } catch (_) {
        filaEl.innerHTML = `<div style="padding:12px;color:var(--tx3);font-size:12px">Não foi possível carregar as demandas.</div>`;
        sv("jur-kpi-dem", "—");
      }
    }
  }

  window.renderAdminDash = renderAdminDash;
  window.renderAdminEst  = renderAdminEst;
  window.renderJurDash   = renderJurDash;

  document.addEventListener("sipen:navigate", ({ detail: { id } }) => {
    if (id === "admin-con") {
      _invalidate();
      _tipoFiltro = ""; _buscaFiltro = ""; _statusFiltro = "";
      const busca = document.getElementById("con-f-busca");
      const status = document.getElementById("con-f-status");
      if (busca)  busca.value  = "";
      if (status) status.value = "";
      document.querySelectorAll("#con-tipo-tabs .bni").forEach((el, i) => el.classList.toggle("on", i === 0));
      renderContratos();
    }
    if (id === "admin-dash") { _invalidate(); renderAdminDash(); }
    if (id === "admin-est")  renderAdminEst();
    if (id === "jur-dash")   { _invalidate(); renderJurDash(); }
  });

  window.conRecarregar = async function () { _invalidate(); await renderContratos(); };

})();
