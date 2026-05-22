/* ═══════════════════════════════════════════════════════
   SIPEN — Módulo Financeiro
   financeiro.js · v2.0
   Solicitações (A Pagar) conectadas ao Supabase.
   Lançamentos, Fluxo, A Receber, Categorias, Relatórios
   e Auditoria permanecem com dados demonstrativos.
═══════════════════════════════════════════════════════ */

(function () {

  /* ── DADOS DEMONSTRATIVOS ──────────────────────────────── */

  const CATEGORIAS = [
    { id:1,  nome:"Dízimos",           tipo:"receita",  desc:"Contribuições de dízimo dos membros",        ativa:true  },
    { id:2,  nome:"Ofertas",           tipo:"receita",  desc:"Ofertas gerais nos cultos",                  ativa:true  },
    { id:3,  nome:"Missões (entrada)", tipo:"receita",  desc:"Ofertas especiais para campos missionários", ativa:true  },
    { id:4,  nome:"Aluguel de espaço", tipo:"receita",  desc:"Locação de salões para eventos externos",    ativa:true  },
    { id:5,  nome:"Folha de pagamento",tipo:"despesa",  desc:"Salários e encargos trabalhistas",           ativa:true  },
    { id:6,  nome:"Aluguel",           tipo:"despesa",  desc:"Aluguel do templo e sede",                   ativa:true  },
    { id:7,  nome:"Utilities",         tipo:"despesa",  desc:"Água, luz, internet e telefone",             ativa:true  },
    { id:8,  nome:"Manutenção",        tipo:"despesa",  desc:"Reparos e manutenções preventivas",          ativa:true  },
    { id:9,  nome:"Material",          tipo:"despesa",  desc:"Materiais de escritório e ministério",       ativa:true  },
    { id:10, nome:"Eventos",           tipo:"despesa",  desc:"Custos de eventos e programações",           ativa:true  },
    { id:11, nome:"Missões (saída)",   tipo:"despesa",  desc:"Repasse para campos missionários",           ativa:true  },
    { id:12, nome:"Outros",            tipo:"despesa",  desc:"Despesas diversas não categorizadas",        ativa:false },
  ];

  const LANCAMENTOS = [
    { id:1,  tipo:"receita",  cat:"Dízimos",            desc:"Dízimos 1ª semana Abr/26",             valor:4200,  data:"2026-04-07", forma:"transferência",     status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:2,  tipo:"receita",  cat:"Dízimos",            desc:"Dízimos 2ª semana Abr/26",             valor:3850,  data:"2026-04-14", forma:"transferência",     status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:3,  tipo:"receita",  cat:"Dízimos",            desc:"Dízimos 3ª semana Abr/26",             valor:4100,  data:"2026-04-21", forma:"transferência",     status:"pendente",   resp:"Tesoureiro",    obs:"Aguardar confirmação bancária" },
    { id:4,  tipo:"receita",  cat:"Ofertas",            desc:"Oferta culto 07/04",                   valor:680,   data:"2026-04-07", forma:"dinheiro",          status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:5,  tipo:"receita",  cat:"Ofertas",            desc:"Oferta culto 14/04",                   valor:720,   data:"2026-04-14", forma:"dinheiro",          status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:6,  tipo:"receita",  cat:"Missões (entrada)",  desc:"Oferta de missões — Abr/26",           valor:1200,  data:"2026-04-14", forma:"pix",               status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:7,  tipo:"despesa",  cat:"Aluguel",            desc:"Aluguel sede — Abr/2026",              valor:3500,  data:"2026-04-05", forma:"transferência",     status:"confirmado", resp:"Administrador", obs:"" },
    { id:8,  tipo:"despesa",  cat:"Utilities",          desc:"Conta de luz — Mar/26",                valor:480,   data:"2026-04-10", forma:"boleto",            status:"confirmado", resp:"Administrador", obs:"" },
    { id:9,  tipo:"despesa",  cat:"Utilities",          desc:"Internet e telefone — Abr/26",         valor:180,   data:"2026-04-10", forma:"débito automático",  status:"confirmado", resp:"Administrador", obs:"" },
    { id:10, tipo:"despesa",  cat:"Folha de pagamento", desc:"Salários — Abr/2026",                  valor:4800,  data:"2026-04-15", forma:"transferência",     status:"confirmado", resp:"Administrador", obs:"" },
    { id:11, tipo:"despesa",  cat:"Material",           desc:"Material de escritório Q2",            valor:240,   data:"2026-04-08", forma:"cartão",            status:"confirmado", resp:"Secretaria",    obs:"" },
    { id:12, tipo:"despesa",  cat:"Manutenção",         desc:"Reparo sistema de som",                valor:650,   data:"2026-04-12", forma:"dinheiro",          status:"confirmado", resp:"Infraestrutura e Conservação", obs:"" },
    { id:13, tipo:"receita",  cat:"Dízimos",            desc:"Dízimos 1ª semana Mar/26",             valor:3900,  data:"2026-03-03", forma:"transferência",     status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:14, tipo:"receita",  cat:"Dízimos",            desc:"Dízimos 2ª semana Mar/26",             valor:4050,  data:"2026-03-10", forma:"transferência",     status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:15, tipo:"receita",  cat:"Dízimos",            desc:"Dízimos 3ª semana Mar/26",             valor:3750,  data:"2026-03-17", forma:"transferência",     status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:16, tipo:"receita",  cat:"Dízimos",            desc:"Dízimos 4ª semana Mar/26",             valor:4200,  data:"2026-03-24", forma:"transferência",     status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:17, tipo:"receita",  cat:"Ofertas",            desc:"Oferta cultos — Mar/26",               valor:2400,  data:"2026-03-31", forma:"dinheiro",          status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:18, tipo:"receita",  cat:"Missões (entrada)",  desc:"Oferta de missões — Mar/26",           valor:980,   data:"2026-03-24", forma:"pix",               status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:19, tipo:"despesa",  cat:"Aluguel",            desc:"Aluguel sede — Mar/2026",              valor:3500,  data:"2026-03-05", forma:"transferência",     status:"confirmado", resp:"Administrador", obs:"" },
    { id:20, tipo:"despesa",  cat:"Folha de pagamento", desc:"Salários — Mar/2026",                  valor:4800,  data:"2026-03-15", forma:"transferência",     status:"confirmado", resp:"Administrador", obs:"" },
    { id:21, tipo:"despesa",  cat:"Utilities",          desc:"Conta de luz — Fev/26",                valor:510,   data:"2026-03-08", forma:"boleto",            status:"confirmado", resp:"Administrador", obs:"" },
    { id:22, tipo:"despesa",  cat:"Eventos",            desc:"Semana Santa — materiais e logística", valor:1200,  data:"2026-03-28", forma:"cartão",            status:"confirmado", resp:"Pastoral",      obs:"" },
    { id:23, tipo:"despesa",  cat:"Missões (saída)",    desc:"Repasse campo missionário — Mar/26",   valor:600,   data:"2026-03-31", forma:"transferência",     status:"confirmado", resp:"Conselho",      obs:"" },
    { id:24, tipo:"receita",  cat:"Dízimos",            desc:"Dízimos — Fev/26 (consolidado)",       valor:14200, data:"2026-02-28", forma:"transferência",     status:"confirmado", resp:"Tesoureiro",    obs:"Consolidado do mês" },
    { id:25, tipo:"receita",  cat:"Ofertas",            desc:"Oferta cultos — Fev/26",               valor:2100,  data:"2026-02-28", forma:"dinheiro",          status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:26, tipo:"despesa",  cat:"Aluguel",            desc:"Aluguel sede — Fev/2026",              valor:3500,  data:"2026-02-05", forma:"transferência",     status:"confirmado", resp:"Administrador", obs:"" },
    { id:27, tipo:"despesa",  cat:"Folha de pagamento", desc:"Salários — Fev/2026",                  valor:4800,  data:"2026-02-15", forma:"transferência",     status:"confirmado", resp:"Administrador", obs:"" },
  ];

  const CONTAS_RECEBER = [
    { id:1, desc:"Dízimos semana 21/04",              orig:"Membros ativos",         cat:"Dízimos",           valor:4200, venc:"2026-04-21", status:"pendente",  recebido:"" },
    { id:2, desc:"Oferta dominical 21/04",            orig:"Congregação",            cat:"Ofertas",           valor:650,  venc:"2026-04-21", status:"pendente",  recebido:"" },
    { id:3, desc:"Aluguel salão — Evento externo",    orig:"Assoc. Cultural Penha",  cat:"Aluguel de espaço", valor:800,  venc:"2026-04-25", status:"pendente",  recebido:"" },
    { id:4, desc:"Dízimos semana 28/04",              orig:"Membros ativos",         cat:"Dízimos",           valor:4100, venc:"2026-04-28", status:"pendente",  recebido:"" },
    { id:5, desc:"Repasse Missões — Sede denominac.", orig:"IPPenha Denominação",    cat:"Missões (entrada)", valor:1500, venc:"2026-05-01", status:"pendente",  recebido:"" },
    { id:6, desc:"Oferta especial — Congresso Jovens",orig:"Depto de Jovens",        cat:"Ofertas",           valor:400,  venc:"2026-04-19", status:"recebido",  recebido:"2026-04-18" },
  ];

  const AUDITORIA = [
    { id:1, acao:"criação",               desc:"Lançamento: Dízimos 3ª semana Abr/26",               usuario:"Tesoureiro",    data:"2026-04-14T14:23:00", tipo:"lancamento"    },
    { id:2, acao:"edição",               desc:"Lançamento #11 — valor de R$ 220 → R$ 240",           usuario:"Tesoureiro",    data:"2026-04-10T09:15:00", tipo:"lancamento"    },
    { id:3, acao:"marcado como pago",    desc:"Conta a pagar: Material pastoral — visitas",          usuario:"Administrador", data:"2026-04-12T16:40:00", tipo:"conta_pagar"   },
    { id:4, acao:"criação",               desc:"Nova conta a pagar: Manutenção projetor",             usuario:"Administrador", data:"2026-04-11T10:00:00", tipo:"conta_pagar"   },
    { id:5, acao:"marcado como recebido", desc:"Conta a receber: Oferta especial — Congresso Jovens",usuario:"Tesoureiro",    data:"2026-04-18T08:30:00", tipo:"conta_receber" },
    { id:6, acao:"criação",               desc:"Categoria criada: Missões (saída) — despesa",         usuario:"Administrador", data:"2026-04-05T11:20:00", tipo:"categoria"     },
    { id:7, acao:"exclusão",             desc:"Lançamento de teste excluído",                         usuario:"admin_geral",   data:"2026-04-01T17:00:00", tipo:"lancamento"    },
    { id:8, acao:"criação",               desc:"Lançamento: Dízimos 2ª semana Abr/26",               usuario:"Tesoureiro",    data:"2026-04-08T13:00:00", tipo:"lancamento"    },
  ];

  /* ── ESTADO — Solicitações e Anexos (banco real) ────────── */

  let _SOLICITACOES = null;
  let _ANEXOS       = null; // { [solicitacao_id]: [...] }

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
      confirmado: '<span class="pill pg">confirmado</span>',
      pendente:   '<span class="pill po">pendente</span>',
      cancelado:  '<span class="pill">cancelado</span>',
      atrasado:   '<span class="pill pl">atrasado</span>',
      em_processamento: '<span class="pill pd">em processamento</span>',
      pago:       '<span class="pill pg">pago</span>',
      recebido:   '<span class="pill pg">recebido</span>',
      aguardando: '<span class="pill po">aguardando</span>',
    };
    return m[st] || `<span class="pill">${st}</span>`;
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

  const BANNER_DEMO = `<div style="background:rgba(212,168,67,.12);border:1px solid rgba(212,168,67,.4);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11.5px;color:var(--gold);display:flex;align-items:center;gap:8px">
  <span>⚠</span>
  <span><strong>Dados demonstrativos</strong> — estas informações não refletem o saldo ou movimentações reais da igreja.</span>
</div>`;

  /* ── RENDER: DASHBOARD ───────────────────────────────────── */

  async function renderDash() {
    const el = document.getElementById("fin-dash-content");
    if (!el) return;

    await _loadSolicitacoes();

    const abr      = LANCAMENTOS.filter(l => l.data.startsWith("2026-04"));
    const recAbr   = abr.filter(l => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
    const despAbr  = abr.filter(l => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);
    const saldoAbr = recAbr - despAbr;
    const saldoGeral = LANCAMENTOS.reduce((s, l) => s + (l.tipo === "receita" ? l.valor : -l.valor), 0);

    const H = hoje();
    const S7 = em7dias();
    const solPend     = (_SOLICITACOES || []).filter(r => !["pago","cancelado"].includes(r.status));
    const solAtrasadas= solPend.filter(r => r.vencimento && r.vencimento < H);
    const solBreve    = solPend.filter(r => r.vencimento && r.vencimento >= H && r.vencimento <= S7);
    const totalPagar  = solPend.reduce((s, r) => s + Number(r.valor || 0), 0);
    const proxPagar   = [...solPend].filter(r => r.vencimento).sort((a, b) => a.vencimento.localeCompare(b.vencimento)).slice(0, 4);

    const receberPend = CONTAS_RECEBER.filter(c => c.status !== "recebido");
    const ultLanc     = [...LANCAMENTOS].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 7);

    el.innerHTML = `
      <div class="kpis c3">
        <div class="kpi"><div class="kpi-ico" style="background:var(--bluebg);color:var(--blue)">⚖</div><div class="kpi-body"><div class="kpi-lbl">Saldo atual</div><div class="kpi-val" style="color:${saldoGeral >= 0 ? "var(--gr)" : "var(--rose)"}">${brl(saldoGeral)}</div><div class="kpi-d nu">acumulado geral (demonstrativo)</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(61,160,85,0.12);color:var(--gr)">↑</div><div class="kpi-body"><div class="kpi-lbl">Entradas — Abr</div><div class="kpi-val">${brl(recAbr)}</div><div class="kpi-d up">▲ no mês (demonstrativo)</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">↓</div><div class="kpi-body"><div class="kpi-lbl">Saídas — Abr</div><div class="kpi-val">${brl(despAbr)}</div><div class="kpi-d dn">no mês (demonstrativo)</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--goldbg);color:var(--gold)">◆</div><div class="kpi-body"><div class="kpi-lbl">Resultado — Abr</div><div class="kpi-val" style="color:${saldoAbr >= 0 ? "var(--gr)" : "var(--rose)"}">${brl(saldoAbr)}</div><div class="kpi-d ${saldoAbr >= 0 ? "up" : "dn"}">${saldoAbr >= 0 ? "▲ positivo" : "▼ negativo"} (demonstrativo)</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">!</div><div class="kpi-body"><div class="kpi-lbl">Solicitações a pagar</div><div class="kpi-val">${brl(totalPagar)}</div><div class="kpi-d ${solAtrasadas.length ? "dn" : "wa"}">${solPend.length} pendentes${solAtrasadas.length ? ` · ${solAtrasadas.length} atrasadas` : ""}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--tealbg);color:var(--teal)">◎</div><div class="kpi-body"><div class="kpi-lbl">A receber</div><div class="kpi-val">${brl(receberPend.reduce((s, c) => s + c.valor, 0))}</div><div class="kpi-d nu">${receberPend.length} pendentes (demonstrativo)</div></div></div>
      </div>
      <div class="g2">
        <div class="card">
          <div class="ctit">Últimos lançamentos <span class="cact" onclick="go('fin-lancamentos')">Ver todos →</span></div>
          ${ultLanc.map(l => `
            <div class="trow">
              <div class="tdot" style="background:${l.tipo === "receita" ? "var(--gr)" : "var(--rose)"}"></div>
              <div class="tbody">
                <div class="ttitle">${l.desc}</div>
                <div class="tmeta">${fmtD(l.data)} · ${l.cat} · ${l.forma}</div>
              </div>
              <div class="tright" style="font-size:12px;font-weight:700;color:${l.tipo === "receita" ? "var(--gr)" : "var(--rose)"}">${l.tipo === "receita" ? "+" : "−"}${brl(l.valor)}</div>
            </div>`).join("")}
        </div>
        <div>
          <div class="card" style="margin-bottom:10px;${solAtrasadas.length ? "border-color:rgba(224,85,85,.3)" : ""}">
            <div class="ctit" style="${solAtrasadas.length ? "color:var(--rose)" : ""}">Alertas financeiros <span class="cact" onclick="go('fin-pagar')">Ver todas →</span></div>
            ${solAtrasadas.length
              ? solAtrasadas.map(r => `
                  <div class="trow">
                    <div class="tdot" style="background:var(--rose)"></div>
                    <div class="tbody"><div class="ttitle">${escapeHtml(r.finalidade || r.fornecedor) || "—"}</div><div class="tmeta">Venceu ${fmtD(r.vencimento)} · ${escapeHtml(r.fornecedor) || "—"}</div></div>
                    <div class="tright"><span class="pill pl">atrasado</span></div>
                  </div>`)
                .join("")
              : '<div style="color:var(--tx3);font-size:11.5px;padding:4px 0">Nenhuma solicitação atrasada ✓</div>'
            }
          </div>
          <div class="card">
            <div class="ctit">Próximos vencimentos <span class="cact" onclick="go('fin-pagar')">Ver todos →</span></div>
            ${proxPagar.length
              ? proxPagar.map(r => `
                  <div class="trow">
                    <div class="tdot" style="background:var(--gold)"></div>
                    <div class="tbody"><div class="ttitle">${escapeHtml(r.finalidade || r.fornecedor) || "—"}</div><div class="tmeta">Vence ${fmtD(r.vencimento)} · ${r.categoria || "—"}</div></div>
                    <div class="tright" style="font-size:12px;font-weight:600;color:var(--tx1)">${brl(r.valor)}</div>
                  </div>`).join("")
              : '<div style="color:var(--tx3);font-size:11.5px;padding:4px 0">Sem vencimentos próximos</div>'
            }
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
      ${BANNER_DEMO}
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:rgba(61,160,85,0.12);color:var(--gr)">↑</div><div class="kpi-body"><div class="kpi-lbl">Receitas filtradas</div><div class="kpi-val">${brl(totalRec)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">↓</div><div class="kpi-body"><div class="kpi-lbl">Despesas filtradas</div><div class="kpi-val">${brl(totalDesp)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--bluebg);color:var(--blue)">⚖</div><div class="kpi-body"><div class="kpi-lbl">Resultado</div><div class="kpi-val" style="color:${totalRec - totalDesp >= 0 ? "var(--gr)" : "var(--rose)"}">${brl(totalRec - totalDesp)}</div></div></div>
      </div>
      <div class="card">
        <div class="ctit">Lançamentos <span class="csub">(${rows.length}) — dados demonstrativos</span></div>
        ${rows.length === 0
          ? '<div style="color:var(--tx3);font-size:11.5px;padding:6px 0">Nenhum lançamento encontrado.</div>'
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
      ${BANNER_DEMO}
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:rgba(61,160,85,0.12);color:var(--gr)">↑</div><div class="kpi-body"><div class="kpi-lbl">Total entradas</div><div class="kpi-val">${brl(totalRec)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">↓</div><div class="kpi-body"><div class="kpi-lbl">Total saídas</div><div class="kpi-val">${brl(totalDesp)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--bluebg);color:var(--blue)">⚖</div><div class="kpi-body"><div class="kpi-lbl">Saldo acumulado</div><div class="kpi-val" style="color:var(--gr)">${brl(totalRec - totalDesp)}</div></div></div>
      </div>
      <div class="card">
        <div class="ctit">Fluxo por período <span class="csub">— dados demonstrativos</span></div>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
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
        </table></div>
      </div>`;
  }

  /* ── RENDER: SOLICITAÇÕES / A PAGAR (SUPABASE) ───────────── */

  async function renderPagar() {
    const el = document.getElementById("fin-pagar-content");
    if (!el) return;

    el.innerHTML = '<div style="color:var(--tx3);font-size:11.5px;padding:12px 0">Carregando solicitações...</div>';
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
          ? '<div style="color:var(--tx3);font-size:11.5px;padding:6px 0">Nenhuma solicitação encontrada.</div>'
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
                        : `<span style="font-size:10px;color:var(--tx3);margin-right:4px">pendente</span>`}
                      ${r.id && !pago ? `<button onclick="finEditarDadosCnab('${escapeHtmlAttr(r.id)}')" style="font-size:10px;padding:2px 8px;border-radius:5px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--gr);cursor:pointer;white-space:nowrap">Dados CNAB</button>` : ""}
                    </td>
                    <td style="padding:7px 6px;color:${st === "atrasado" ? "var(--rose)" : "var(--tx2)"};white-space:nowrap;font-weight:${st === "atrasado" ? "600" : "400"}">${fmtD(r.vencimento)}</td>
                    <td style="padding:7px 6px;color:var(--tx2);white-space:nowrap">${escapeHtml(r.solicitante) || "—"}</td>
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
      ${BANNER_DEMO}
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:var(--tealbg);color:var(--teal)">◎</div><div class="kpi-body"><div class="kpi-lbl">Total a receber</div><div class="kpi-val">${brl(totalPend)}</div><div class="kpi-d nu">${pendentes.length} pendentes</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(61,160,85,0.12);color:var(--gr)">✓</div><div class="kpi-body"><div class="kpi-lbl">Recebidos</div><div class="kpi-val">${recebidas.length}</div><div class="kpi-d up">neste período</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--goldbg);color:var(--gold)">⏰</div><div class="kpi-body"><div class="kpi-lbl">Vencendo em breve</div><div class="kpi-val">${vencBreve}</div><div class="kpi-d wa">próximos 7 dias</div></div></div>
      </div>
      <div class="card">
        <div class="ctit">Contas a receber <span class="csub">(${CONTAS_RECEBER.length}) — dados demonstrativos</span></div>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
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
        </table></div>
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
          ${lista(receitas)}
        </div>
        <div class="card">
          <div class="ctit" style="color:var(--rose)">↓ Categorias de despesa <span class="csub">(${despesas.length})</span></div>
          ${lista(despesas)}
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
      ${BANNER_DEMO}
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:rgba(61,160,85,0.12);color:var(--gr)">↑</div><div class="kpi-body"><div class="kpi-lbl">Total receitas</div><div class="kpi-val">${brl(totalRec)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">↓</div><div class="kpi-body"><div class="kpi-lbl">Total despesas</div><div class="kpi-val">${brl(totalDesp)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--bluebg);color:var(--blue)">⚖</div><div class="kpi-body"><div class="kpi-lbl">Resultado geral</div><div class="kpi-val" style="color:var(--gr)">${brl(totalRec - totalDesp)}</div></div></div>
      </div>
      <div class="card">
        <div class="ctit">Relatório por categoria <span class="csub">— dados demonstrativos</span>
          <span style="float:right">
            <button class="tbt" onclick="alert('Exportação disponível na próxima versão do módulo')" style="font-size:11px;padding:4px 10px;margin-top:-2px">⬇ Exportar</button>
          </span>
        </div>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
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
        </table></div>
      </div>`;
  }

  /* ── RENDER: AUDITORIA ───────────────────────────────────── */

  function renderAuditoria() {
    const el = document.getElementById("fin-aud-content");
    if (!el) return;

    el.innerHTML = `
      ${BANNER_DEMO}
      <div class="card">
        <div class="ctit">Histórico de ações financeiras <span class="csub">(${AUDITORIA.length} registros — demonstrativo)</span></div>
        ${[...AUDITORIA].sort((a, b) => b.data.localeCompare(a.data)).map(a => `
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
        <label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">${label}</label>
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
            <label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">Tipo de operação</label>
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
            <label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">Tipo de chave PIX</label>
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

  window.finFiltrarLanc  = renderLancamentos;
  window.finFiltrarPagar = () => renderPagar();

  let _pagarDebTimer = null;
  window.finDebouncePagar = function() {
    clearTimeout(_pagarDebTimer);
    _pagarDebTimer = setTimeout(() => finFiltrarPagar(), 300);
  };

})();
