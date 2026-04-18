/* ═══════════════════════════════════════════════════════
   SIPEN — Módulo Financeiro
   financeiro.js · v1.0
   Mock data + render functions para as 8 telas do módulo
═══════════════════════════════════════════════════════ */

(function () {

  /* ── MOCK DATA ──────────────────────────────────────────── */

  const CATEGORIAS = [
    { id:1,  nome:"Dízimos",          tipo:"receita",  desc:"Contribuições de dízimo dos membros",        ativa:true  },
    { id:2,  nome:"Ofertas",          tipo:"receita",  desc:"Ofertas gerais nos cultos",                  ativa:true  },
    { id:3,  nome:"Missões (entrada)",tipo:"receita",  desc:"Ofertas especiais para campos missionários", ativa:true  },
    { id:4,  nome:"Aluguel de espaço",tipo:"receita",  desc:"Locação de salões para eventos externos",    ativa:true  },
    { id:5,  nome:"Folha de pagamento",tipo:"despesa", desc:"Salários e encargos trabalhistas",           ativa:true  },
    { id:6,  nome:"Aluguel",          tipo:"despesa",  desc:"Aluguel do templo e sede",                   ativa:true  },
    { id:7,  nome:"Utilities",        tipo:"despesa",  desc:"Água, luz, internet e telefone",             ativa:true  },
    { id:8,  nome:"Manutenção",       tipo:"despesa",  desc:"Reparos e manutenções preventivas",          ativa:true  },
    { id:9,  nome:"Material",         tipo:"despesa",  desc:"Materiais de escritório e ministério",       ativa:true  },
    { id:10, nome:"Eventos",          tipo:"despesa",  desc:"Custos de eventos e programações",           ativa:true  },
    { id:11, nome:"Missões (saída)",  tipo:"despesa",  desc:"Repasse para campos missionários",           ativa:true  },
    { id:12, nome:"Outros",           tipo:"despesa",  desc:"Despesas diversas não categorizadas",        ativa:false },
  ];

  const LANCAMENTOS = [
    // ── Abril 2026
    { id:1,  tipo:"receita",  cat:"Dízimos",           desc:"Dízimos 1ª semana Abr/26",             valor:4200,  data:"2026-04-07", forma:"transferência",    status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:2,  tipo:"receita",  cat:"Dízimos",           desc:"Dízimos 2ª semana Abr/26",             valor:3850,  data:"2026-04-14", forma:"transferência",    status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:3,  tipo:"receita",  cat:"Dízimos",           desc:"Dízimos 3ª semana Abr/26",             valor:4100,  data:"2026-04-21", forma:"transferência",    status:"pendente",   resp:"Tesoureiro",    obs:"Aguardar confirmação bancária" },
    { id:4,  tipo:"receita",  cat:"Ofertas",           desc:"Oferta culto 07/04",                   valor:680,   data:"2026-04-07", forma:"dinheiro",         status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:5,  tipo:"receita",  cat:"Ofertas",           desc:"Oferta culto 14/04",                   valor:720,   data:"2026-04-14", forma:"dinheiro",         status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:6,  tipo:"receita",  cat:"Missões (entrada)", desc:"Oferta de missões — Abr/26",           valor:1200,  data:"2026-04-14", forma:"pix",              status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:7,  tipo:"despesa",  cat:"Aluguel",           desc:"Aluguel sede — Abr/2026",              valor:3500,  data:"2026-04-05", forma:"transferência",    status:"confirmado", resp:"Administrador", obs:"" },
    { id:8,  tipo:"despesa",  cat:"Utilities",         desc:"Conta de luz — Mar/26",                valor:480,   data:"2026-04-10", forma:"boleto",           status:"confirmado", resp:"Administrador", obs:"" },
    { id:9,  tipo:"despesa",  cat:"Utilities",         desc:"Internet e telefone — Abr/26",         valor:180,   data:"2026-04-10", forma:"débito automático", status:"confirmado", resp:"Administrador", obs:"" },
    { id:10, tipo:"despesa",  cat:"Folha de pagamento",desc:"Salários — Abr/2026",                  valor:4800,  data:"2026-04-15", forma:"transferência",    status:"confirmado", resp:"Administrador", obs:"" },
    { id:11, tipo:"despesa",  cat:"Material",          desc:"Material de escritório Q2",            valor:240,   data:"2026-04-08", forma:"cartão",           status:"confirmado", resp:"Secretaria",    obs:"" },
    { id:12, tipo:"despesa",  cat:"Manutenção",        desc:"Reparo sistema de som",                valor:650,   data:"2026-04-12", forma:"dinheiro",         status:"confirmado", resp:"Infraestrutura", obs:"" },
    // ── Março 2026
    { id:13, tipo:"receita",  cat:"Dízimos",           desc:"Dízimos 1ª semana Mar/26",             valor:3900,  data:"2026-03-03", forma:"transferência",    status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:14, tipo:"receita",  cat:"Dízimos",           desc:"Dízimos 2ª semana Mar/26",             valor:4050,  data:"2026-03-10", forma:"transferência",    status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:15, tipo:"receita",  cat:"Dízimos",           desc:"Dízimos 3ª semana Mar/26",             valor:3750,  data:"2026-03-17", forma:"transferência",    status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:16, tipo:"receita",  cat:"Dízimos",           desc:"Dízimos 4ª semana Mar/26",             valor:4200,  data:"2026-03-24", forma:"transferência",    status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:17, tipo:"receita",  cat:"Ofertas",           desc:"Oferta cultos — Mar/26",               valor:2400,  data:"2026-03-31", forma:"dinheiro",         status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:18, tipo:"receita",  cat:"Missões (entrada)", desc:"Oferta de missões — Mar/26",           valor:980,   data:"2026-03-24", forma:"pix",              status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:19, tipo:"despesa",  cat:"Aluguel",           desc:"Aluguel sede — Mar/2026",              valor:3500,  data:"2026-03-05", forma:"transferência",    status:"confirmado", resp:"Administrador", obs:"" },
    { id:20, tipo:"despesa",  cat:"Folha de pagamento",desc:"Salários — Mar/2026",                  valor:4800,  data:"2026-03-15", forma:"transferência",    status:"confirmado", resp:"Administrador", obs:"" },
    { id:21, tipo:"despesa",  cat:"Utilities",         desc:"Conta de luz — Fev/26",                valor:510,   data:"2026-03-08", forma:"boleto",           status:"confirmado", resp:"Administrador", obs:"" },
    { id:22, tipo:"despesa",  cat:"Eventos",           desc:"Semana Santa — materiais e logística", valor:1200,  data:"2026-03-28", forma:"cartão",           status:"confirmado", resp:"Pastoral",      obs:"" },
    { id:23, tipo:"despesa",  cat:"Missões (saída)",   desc:"Repasse campo missionário — Mar/26",   valor:600,   data:"2026-03-31", forma:"transferência",    status:"confirmado", resp:"Conselho",      obs:"" },
    // ── Fevereiro 2026
    { id:24, tipo:"receita",  cat:"Dízimos",           desc:"Dízimos — Fev/26 (consolidado)",       valor:14200, data:"2026-02-28", forma:"transferência",    status:"confirmado", resp:"Tesoureiro",    obs:"Consolidado do mês" },
    { id:25, tipo:"receita",  cat:"Ofertas",           desc:"Oferta cultos — Fev/26",               valor:2100,  data:"2026-02-28", forma:"dinheiro",         status:"confirmado", resp:"Tesoureiro",    obs:"" },
    { id:26, tipo:"despesa",  cat:"Aluguel",           desc:"Aluguel sede — Fev/2026",              valor:3500,  data:"2026-02-05", forma:"transferência",    status:"confirmado", resp:"Administrador", obs:"" },
    { id:27, tipo:"despesa",  cat:"Folha de pagamento",desc:"Salários — Fev/2026",                  valor:4800,  data:"2026-02-15", forma:"transferência",    status:"confirmado", resp:"Administrador", obs:"" },
  ];

  const CONTAS_PAGAR = [
    { id:1, desc:"Aluguel sede — Mai/2026",           forn:"Imobiliária São Paulo", cat:"Aluguel",           valor:3500, venc:"2026-05-05", status:"pendente", forma:"transferência"     },
    { id:2, desc:"Folha de pagamento — Mai/2026",     forn:"Colaboradores",         cat:"Folha de pagamento",valor:4800, venc:"2026-05-15", status:"pendente", forma:"transferência"     },
    { id:3, desc:"Internet e telefone — Mai/26",      forn:"Operadora",             cat:"Utilities",         valor:180,  venc:"2026-05-10", status:"pendente", forma:"débito automático" },
    { id:4, desc:"Manutenção projetor",               forn:"TechAV Ltda",           cat:"Manutenção",        valor:350,  venc:"2026-04-25", status:"pendente", forma:"pix"               },
    { id:5, desc:"Materiais congresso jovens",        forn:"Gráfica São Paulo",     cat:"Material",          valor:480,  venc:"2026-04-30", status:"pendente", forma:"pix"               },
    { id:6, desc:"Conta de luz — Abr/26",             forn:"Concessionária",        cat:"Utilities",         valor:490,  venc:"2026-05-12", status:"pendente", forma:"boleto"            },
    { id:7, desc:"Seguro do imóvel — anual",          forn:"Seguradora IPPenha",    cat:"Outros",            valor:1200, venc:"2026-04-18", status:"atrasado", forma:"boleto"            },
    { id:8, desc:"Material pastoral — visitas",       forn:"Livraria Gospel",       cat:"Material",          valor:320,  venc:"2026-04-10", status:"pago",     forma:"cartão"            },
  ];

  const CONTAS_RECEBER = [
    { id:1, desc:"Dízimos semana 21/04",             orig:"Membros ativos",         cat:"Dízimos",          valor:4200, venc:"2026-04-21", status:"pendente",  recebido:"" },
    { id:2, desc:"Oferta dominical 21/04",           orig:"Congregação",            cat:"Ofertas",          valor:650,  venc:"2026-04-21", status:"pendente",  recebido:"" },
    { id:3, desc:"Aluguel salão — Evento externo",   orig:"Assoc. Cultural Penha",  cat:"Aluguel de espaço",valor:800,  venc:"2026-04-25", status:"pendente",  recebido:"" },
    { id:4, desc:"Dízimos semana 28/04",             orig:"Membros ativos",         cat:"Dízimos",          valor:4100, venc:"2026-04-28", status:"pendente",  recebido:"" },
    { id:5, desc:"Repasse Missões — Sede denominac.",orig:"IPPenha Denominação",    cat:"Missões (entrada)",valor:1500, venc:"2026-05-01", status:"pendente",  recebido:"" },
    { id:6, desc:"Oferta especial — Congresso Jovens",orig:"Depto de Jovens",       cat:"Ofertas",          valor:400,  venc:"2026-04-19", status:"recebido",  recebido:"2026-04-18" },
  ];

  const AUDITORIA = [
    { id:1, acao:"criação",              desc:"Lançamento: Dízimos 3ª semana Abr/26",              usuario:"Tesoureiro",    data:"2026-04-14T14:23:00", tipo:"lancamento"    },
    { id:2, acao:"edição",              desc:"Lançamento #11 — valor de R$ 220 → R$ 240",          usuario:"Tesoureiro",    data:"2026-04-10T09:15:00", tipo:"lancamento"    },
    { id:3, acao:"marcado como pago",   desc:"Conta a pagar: Material pastoral — visitas",         usuario:"Administrador", data:"2026-04-12T16:40:00", tipo:"conta_pagar"   },
    { id:4, acao:"criação",              desc:"Nova conta a pagar: Manutenção projetor",            usuario:"Administrador", data:"2026-04-11T10:00:00", tipo:"conta_pagar"   },
    { id:5, acao:"marcado como recebido",desc:"Conta a receber: Oferta especial — Congresso Jovens",usuario:"Tesoureiro",   data:"2026-04-18T08:30:00", tipo:"conta_receber" },
    { id:6, acao:"criação",              desc:"Categoria criada: Missões (saída) — despesa",        usuario:"Administrador", data:"2026-04-05T11:20:00", tipo:"categoria"     },
    { id:7, acao:"exclusão",            desc:"Lançamento de teste excluído",                        usuario:"admin_geral",   data:"2026-04-01T17:00:00", tipo:"lancamento"    },
    { id:8, acao:"criação",              desc:"Lançamento: Dízimos 2ª semana Abr/26",              usuario:"Tesoureiro",    data:"2026-04-08T13:00:00", tipo:"lancamento"    },
  ];

  /* ── HELPERS ─────────────────────────────────────────────── */

  function brl(v) {
    return "R$\u00a0" + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtD(d) {
    if (!d) return "—";
    const s = d.split("T")[0].split("-");
    return `${s[2]}/${s[1]}/${s[0]}`;
  }

  function pillStatus(st) {
    const m = {
      confirmado: '<span class="pill pg">confirmado</span>',
      pendente:   '<span class="pill po">pendente</span>',
      cancelado:  '<span class="pill">cancelado</span>',
      atrasado:   '<span class="pill pl">atrasado</span>',
      pago:       '<span class="pill pg">pago</span>',
      recebido:   '<span class="pill pg">recebido</span>',
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

  const TIPO_ICON = { lancamento:"💰", conta_pagar:"📤", conta_receber:"📥", categoria:"🏷" };

  /* ── RENDER FUNCTIONS ────────────────────────────────────── */

  function renderDash() {
    const el = document.getElementById("fin-dash-content");
    if (!el) return;

    const abr     = LANCAMENTOS.filter(l => l.data.startsWith("2026-04"));
    const recAbr  = abr.filter(l => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
    const despAbr = abr.filter(l => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);
    const saldoAbr = recAbr - despAbr;
    const saldoGeral = LANCAMENTOS.reduce((s, l) => s + (l.tipo === "receita" ? l.valor : -l.valor), 0);
    const pagarPend   = CONTAS_PAGAR.filter(c => c.status !== "pago");
    const receberPend = CONTAS_RECEBER.filter(c => c.status !== "recebido");
    const atrasadas   = CONTAS_PAGAR.filter(c => c.status === "atrasado");
    const proxPagar   = CONTAS_PAGAR.filter(c => c.status === "pendente").sort((a, b) => a.venc.localeCompare(b.venc)).slice(0, 4);
    const ultLanc     = [...LANCAMENTOS].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 7);

    el.innerHTML = `
      <div class="kpis c3">
        <div class="kpi"><div class="kpi-ico" style="background:var(--bluebg);color:var(--blue)">⚖</div><div class="kpi-body"><div class="kpi-lbl">Saldo atual</div><div class="kpi-val" style="color:${saldoGeral >= 0 ? "var(--gr)" : "var(--rose)"}">${brl(saldoGeral)}</div><div class="kpi-d nu">acumulado geral</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(61,160,85,0.12);color:var(--gr)">↑</div><div class="kpi-body"><div class="kpi-lbl">Entradas — Abr</div><div class="kpi-val">${brl(recAbr)}</div><div class="kpi-d up">▲ no mês</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">↓</div><div class="kpi-body"><div class="kpi-lbl">Saídas — Abr</div><div class="kpi-val">${brl(despAbr)}</div><div class="kpi-d dn">no mês</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--goldbg);color:var(--gold)">◆</div><div class="kpi-body"><div class="kpi-lbl">Resultado — Abr</div><div class="kpi-val" style="color:${saldoAbr >= 0 ? "var(--gr)" : "var(--rose)"}">${brl(saldoAbr)}</div><div class="kpi-d ${saldoAbr >= 0 ? "up" : "dn"}">${saldoAbr >= 0 ? "▲ positivo" : "▼ negativo"}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">!</div><div class="kpi-body"><div class="kpi-lbl">Contas a pagar</div><div class="kpi-val">${brl(pagarPend.reduce((s, c) => s + c.valor, 0))}</div><div class="kpi-d wa">${pagarPend.length} pendentes</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--tealbg);color:var(--teal)">◎</div><div class="kpi-body"><div class="kpi-lbl">A receber</div><div class="kpi-val">${brl(receberPend.reduce((s, c) => s + c.valor, 0))}</div><div class="kpi-d nu">${receberPend.length} pendentes</div></div></div>
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
            </div>
          `).join("")}
        </div>
        <div>
          <div class="card" style="margin-bottom:10px;${atrasadas.length ? "border-color:rgba(224,85,85,.3)" : ""}">
            <div class="ctit" style="${atrasadas.length ? "color:var(--rose)" : ""}">Alertas financeiros</div>
            ${atrasadas.length
              ? atrasadas.map(c => `
                  <div class="trow">
                    <div class="tdot" style="background:var(--rose)"></div>
                    <div class="tbody"><div class="ttitle">${c.desc}</div><div class="tmeta">Venceu ${fmtD(c.venc)} · ${c.forn}</div></div>
                    <div class="tright"><span class="pill pl">atrasado</span></div>
                  </div>`)
                .join("")
              : '<div style="color:var(--tx3);font-size:11.5px;padding:4px 0">Nenhuma conta atrasada ✓</div>'
            }
          </div>
          <div class="card">
            <div class="ctit">Próximos vencimentos <span class="cact" onclick="go('fin-pagar')">Ver todos →</span></div>
            ${proxPagar.map(c => `
              <div class="trow">
                <div class="tdot" style="background:var(--gold)"></div>
                <div class="tbody"><div class="ttitle">${c.desc}</div><div class="tmeta">Vence ${fmtD(c.venc)} · ${c.cat}</div></div>
                <div class="tright" style="font-size:12px;font-weight:600;color:var(--tx1)">${brl(c.valor)}</div>
              </div>`).join("")}
          </div>
        </div>
      </div>`;
  }

  function renderLancamentos() {
    const el = document.getElementById("fin-lanc-content");
    if (!el) return;

    const ftipo   = document.getElementById("fin-lanc-ftipo")?.value || "";
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
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:rgba(61,160,85,0.12);color:var(--gr)">↑</div><div class="kpi-body"><div class="kpi-lbl">Receitas filtradas</div><div class="kpi-val">${brl(totalRec)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">↓</div><div class="kpi-body"><div class="kpi-lbl">Despesas filtradas</div><div class="kpi-val">${brl(totalDesp)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--bluebg);color:var(--blue)">⚖</div><div class="kpi-body"><div class="kpi-lbl">Resultado</div><div class="kpi-val" style="color:${totalRec - totalDesp >= 0 ? "var(--gr)" : "var(--rose)"}">${brl(totalRec - totalDesp)}</div></div></div>
      </div>
      <div class="card">
        <div class="ctit">Lançamentos <span class="csub">(${rows.length})</span></div>
        ${rows.length === 0
          ? '<div style="color:var(--tx3);font-size:11.5px;padding:6px 0">Nenhum lançamento encontrado com os filtros aplicados.</div>'
          : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr style="border-bottom:1px solid var(--bd2)">
                ${["Data","Descrição","Categoria","Tipo","Valor","Forma","Status","Responsável"].map(h =>
                  `<th style="text-align:${h==="Valor"?"right":"left"};padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap">${h}</th>`
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
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:rgba(61,160,85,0.12);color:var(--gr)">↑</div><div class="kpi-body"><div class="kpi-lbl">Total entradas</div><div class="kpi-val">${brl(totalRec)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">↓</div><div class="kpi-body"><div class="kpi-lbl">Total saídas</div><div class="kpi-val">${brl(totalDesp)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--bluebg);color:var(--blue)">⚖</div><div class="kpi-body"><div class="kpi-lbl">Saldo acumulado</div><div class="kpi-val" style="color:var(--gr)">${brl(totalRec - totalDesp)}</div></div></div>
      </div>
      <div class="card">
        <div class="ctit">Fluxo por período</div>
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

  function _tabelaContas(contas, comForn) {
    return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="border-bottom:1px solid var(--bd2)">
        <th style="text-align:left;padding:7px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase">Descrição</th>
        ${comForn ? '<th style="text-align:left;padding:7px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase">Fornecedor / Origem</th>' : ""}
        <th style="text-align:left;padding:7px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase">Categoria</th>
        <th style="text-align:right;padding:7px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase">Valor</th>
        <th style="text-align:left;padding:7px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase">Vencimento</th>
        <th style="text-align:left;padding:7px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase">Status</th>
        <th style="text-align:left;padding:7px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase">Forma</th>
      </tr></thead>
      <tbody>
        ${contas.map(c => `
          <tr style="border-bottom:1px solid var(--bd1)" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
            <td style="padding:7px 6px;color:var(--tx1)">${c.desc}</td>
            ${comForn ? `<td style="padding:7px 6px;color:var(--tx2)">${c.forn || c.orig || "—"}</td>` : ""}
            <td style="padding:7px 6px;color:var(--tx2)">${c.cat}</td>
            <td style="padding:7px 6px;text-align:right;font-weight:700;color:${c.orig ? "var(--gr)" : "var(--rose)"}">${brl(c.valor)}</td>
            <td style="padding:7px 6px;color:var(--tx2)">${fmtD(c.venc)}</td>
            <td style="padding:7px 6px">${pillStatus(c.status)}</td>
            <td style="padding:7px 6px;color:var(--tx2)">${c.forma}</td>
          </tr>`).join("")}
      </tbody>
    </table></div>`;
  }

  function renderPagar() {
    const el = document.getElementById("fin-pagar-content");
    if (!el) return;

    const HOJE      = "2026-04-18";
    const SEMANA    = "2026-04-25";
    const atrasadas = CONTAS_PAGAR.filter(c => c.status === "atrasado");
    const vencHoje  = CONTAS_PAGAR.filter(c => c.status === "pendente" && c.venc === HOJE);
    const vencSem   = CONTAS_PAGAR.filter(c => c.status === "pendente" && c.venc > HOJE && c.venc <= SEMANA);
    const emAberto  = CONTAS_PAGAR.filter(c => c.status !== "pago");
    const totalAb   = emAberto.reduce((s, c) => s + c.valor, 0);

    el.innerHTML = `
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">!</div><div class="kpi-body"><div class="kpi-lbl">Total em aberto</div><div class="kpi-val">${brl(totalAb)}</div><div class="kpi-d dn">${emAberto.length} contas</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">✕</div><div class="kpi-body"><div class="kpi-lbl">Atrasadas</div><div class="kpi-val">${atrasadas.length}</div><div class="kpi-d dn">${brl(atrasadas.reduce((s, c) => s + c.valor, 0))}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--goldbg);color:var(--gold)">⏰</div><div class="kpi-body"><div class="kpi-lbl">Vencendo em breve</div><div class="kpi-val">${vencHoje.length + vencSem.length}</div><div class="kpi-d wa">próximos 7 dias</div></div></div>
      </div>
      ${atrasadas.length ? `
        <div class="card" style="border-color:rgba(224,85,85,.3);margin-bottom:10px">
          <div class="ctit" style="color:var(--rose)">Contas atrasadas (${atrasadas.length})</div>
          ${_tabelaContas(atrasadas, true)}
        </div>` : ""}
      ${vencHoje.length || vencSem.length ? `
        <div class="card" style="border-color:rgba(212,168,67,.3);margin-bottom:10px">
          <div class="ctit" style="color:var(--gold)">Vencendo em breve (${vencHoje.length + vencSem.length})</div>
          ${_tabelaContas([...vencHoje, ...vencSem], true)}
        </div>` : ""}
      <div class="card">
        <div class="ctit">Todas as contas a pagar <span class="csub">(${CONTAS_PAGAR.length})</span></div>
        ${_tabelaContas(CONTAS_PAGAR, true)}
      </div>`;
  }

  function renderReceber() {
    const el = document.getElementById("fin-receber-content");
    if (!el) return;

    const pendentes = CONTAS_RECEBER.filter(c => c.status === "pendente");
    const recebidas = CONTAS_RECEBER.filter(c => c.status === "recebido");
    const totalPend = pendentes.reduce((s, c) => s + c.valor, 0);
    const SEMANA    = "2026-04-25";
    const vencBreve = pendentes.filter(c => c.venc <= SEMANA).length;

    el.innerHTML = `
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:var(--tealbg);color:var(--teal)">◎</div><div class="kpi-body"><div class="kpi-lbl">Total a receber</div><div class="kpi-val">${brl(totalPend)}</div><div class="kpi-d nu">${pendentes.length} pendentes</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(61,160,85,0.12);color:var(--gr)">✓</div><div class="kpi-body"><div class="kpi-lbl">Recebidos</div><div class="kpi-val">${recebidas.length}</div><div class="kpi-d up">neste período</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--goldbg);color:var(--gold)">⏰</div><div class="kpi-body"><div class="kpi-lbl">Vencendo em breve</div><div class="kpi-val">${vencBreve}</div><div class="kpi-d wa">próximos 7 dias</div></div></div>
      </div>
      <div class="card">
        <div class="ctit">Contas a receber <span class="csub">(${CONTAS_RECEBER.length})</span></div>
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
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:rgba(61,160,85,0.12);color:var(--gr)">↑</div><div class="kpi-body"><div class="kpi-lbl">Total receitas</div><div class="kpi-val">${brl(totalRec)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--rosebg);color:var(--rose)">↓</div><div class="kpi-body"><div class="kpi-lbl">Total despesas</div><div class="kpi-val">${brl(totalDesp)}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--bluebg);color:var(--blue)">⚖</div><div class="kpi-body"><div class="kpi-lbl">Resultado geral</div><div class="kpi-val" style="color:var(--gr)">${brl(totalRec - totalDesp)}</div></div></div>
      </div>
      <div class="card">
        <div class="ctit">Relatório por categoria
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

  function renderAuditoria() {
    const el = document.getElementById("fin-aud-content");
    if (!el) return;

    el.innerHTML = `
      <div class="card">
        <div class="ctit">Histórico de ações financeiras <span class="csub">(${AUDITORIA.length} registros)</span></div>
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

  /* ── HOOK INTO go() ────────────────────────────────────── */

  const _origGo = window.go;
  window.go = function (id) {
    _origGo(id);
    const MAP = {
      "fin-dash":       renderDash,
      "fin-lancamentos":renderLancamentos,
      "fin-fluxo":      renderFluxo,
      "fin-pagar":      renderPagar,
      "fin-receber":    renderReceber,
      "fin-categorias": renderCategorias,
      "fin-relatorios": renderRelatorios,
      "fin-auditoria":  renderAuditoria,
    };
    if (MAP[id]) MAP[id]();
  };

  /* ── GLOBAL: filter re-render for Lançamentos ──────────── */
  window.finFiltrarLanc = renderLancamentos;

})();
