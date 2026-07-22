// Agenda autoloads
// Agenda autoloads completos
VIEW_AUTOLOAD["agenda-dash"]          = {fn: carregarAgendaDash};
VIEW_AUTOLOAD["agenda-calendario"]    = { tab:"AGENDA", id:"agenda-cal-list" };
VIEW_AUTOLOAD["agenda-confirmados"]   = { fn: () => agCarregarConfirmados() };
VIEW_AUTOLOAD["agenda-aprovacoes"]    = { fn: () => agCarregarAprovacoes() };
VIEW_AUTOLOAD["agenda-recusados"]     = { tab:"AGENDA", id:"ag-rec-list",    filtro:{status:"cancelado"} };
VIEW_AUTOLOAD["agenda-reagendamentos"]= { tab:"AGENDA", id:"ag-reag-list",   filtro:{status:"reagendado"} };
VIEW_AUTOLOAD["agenda-ambientes"]     = null;
VIEW_AUTOLOAD["agenda-solicitacoes"]  = null;
VIEW_AUTOLOAD["agenda-conflitos"]     = null;
VIEW_AUTOLOAD["agenda-historico"]     = null;
VIEW_AUTOLOAD["agenda-config"]        = null;


/* ── SALAS DA IGREJA — carregadas do cadastro central ──────── */
function agSalasSelect(id, valorAtual = "") {
  const inputStyle = `width:100%;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none`;
  // Skeleton preenchido imediatamente; populado pelo banco após render
  return `<select id="${id}" class="fi2" style="${inputStyle}" data-valor-atual="${valorAtual}">
    <option value="">Carregando espaços…</option>
  </select>`;
}

async function agSalasSelectPopular(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const valorAtual = el.dataset.valorAtual || "";
  try {
    const r = await fetch(`${apiBaseUrl()}/rest/v1/espacos?ativo=eq.true&order=grupo.asc,ordem.asc,nome.asc`, { headers: apiHeaders() });
    const rows = r.ok ? await r.json() : [];
    const grupos = {};
    rows.forEach(e => {
      const g = e.grupo || "Outros";
      if (!grupos[g]) grupos[g] = [];
      grupos[g].push(e);
    });
    el.innerHTML = `<option value="">— Selecione o espaço —</option>`;
    Object.entries(grupos).forEach(([g, items]) => {
      const grp = document.createElement("optgroup");
      grp.label = g;
      items.forEach(e => {
        const opt = document.createElement("option");
        opt.value = e.id;
        opt.dataset.nome = e.nome;
        opt.textContent = e.nome;
        // compatível com UUID (novo) e nome texto (legado via data-valor-atual)
        if (e.id === valorAtual || e.nome === valorAtual) opt.selected = true;
        grp.appendChild(opt);
      });
      el.appendChild(grp);
    });
  } catch (_) {
    el.innerHTML = `<option value="${valorAtual}">${valorAtual || "— Selecione o espaço —"}</option>`;
  }
}

/* ── AGENDA FUNCTIONS ─────────────────────── */
const fmtDataBrCurto = d => { if(!d) return ""; const [,m,dia] = String(d).slice(0,10).split("-"); return `${dia}/${m}`; };
let _agendaCache = null;

async function getAgenda() {
  if (_agendaCache) return _agendaCache;
  const agRes = await fetch(
    `${apiBaseUrl()}/rest/v1/agenda?deleted_at=is.null&status=not.in.(cancelado,recusado,arquivado)&select=*&order=data.asc,hora_inicio.asc&limit=2000`,
    { method:"GET", headers:apiHeaders() }
  );
  if (!agRes.ok) throw new Error(await agRes.text());
  const agData = await agRes.json();
  _agendaCache = Array.isArray(agData) ? agData.map(r=>({...r,_row:r.id})) : [];
  return _agendaCache;
}

let _agMesElAtivo = null;
let _agCalAno = new Date().getFullYear();
let _agCalMes = new Date().getMonth();

async function carregarAgendaDash() {
  _agendaCache = null;
  try {
    const rows = await getAgenda();
    const hoje = new Date().toISOString().split("T")[0];
    const d7 = new Date(); d7.setDate(d7.getDate()+7);
    const prox7 = d7.toISOString().split("T")[0];
    const d30 = new Date(); d30.setDate(d30.getDate()+30);
    const prox30str = d30.toISOString().split("T")[0];
    const anoAtual = new Date().getFullYear();
    const anoInicio = `${anoAtual}-01-01`;
    const anoFim    = `${anoAtual}-12-31`;

    // Expandir ocorrências (eventos recorrentes → instâncias individuais)
    const todasAnuais = rows.flatMap(r => agGerarOcorrencias(r, anoInicio, anoFim));
    const ocorrSemana = rows.flatMap(r => agGerarOcorrencias(r, hoje, prox7));
    const ocorrP30    = rows.flatMap(r => agGerarOcorrencias(r, hoje, prox30str));

    // --- KPIs ---
    const total      = todasAnuais.length;
    const semana     = ocorrSemana.length;
    const p30        = ocorrP30.length;
    const conf       = todasAnuais.filter(r=>r.status==="confirmado").length;
    const recorrentes= rows.filter(r=>r.recorrencia && r.recorrencia!=="Único").length;
    const espacosSet = new Set(todasAnuais.map(r=>r.espaco).filter(Boolean));
    const orgs       = new Set(todasAnuais.map(r=>r.organizador).filter(Boolean)).size;
    const espCount   = {};
    todasAnuais.forEach(r=>{if(r.espaco) espCount[r.espaco]=(espCount[r.espaco]||0)+1;});
    const topEsp = Object.entries(espCount).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—";

    const setV = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    setV("ag-total", total);
    setV("ag-semana", semana);
    setV("ag-prox30", p30);
    setV("ag-conf", conf);
    setV("ag-recorrentes", recorrentes);
    setV("ag-espacos", espacosSet.size);
    setV("ag-org", orgs);
    setV("ag-top-espaco", topEsp.length>18 ? topEsp.slice(0,16)+"…" : topEsp);

    // --- KPI requisições pendentes ---
    fetch(
      `${apiBaseUrl()}/rest/v1/requisicoes_espaco?deleted_at=is.null&status=not.in.(ESPACO_LIBERADO,ALTERNATIVA_OFERECIDA,REQUISICAO_NEGADA,CANCELADA)&select=id`,
      { headers: apiHeaders() }
    ).then(r => r.json()).then(data => {
      setV("ag-req-pendentes", Array.isArray(data) ? data.length : 0);
    }).catch(() => {});

    // --- Próximos eventos (ocorrências expandidas, ordenadas) ---
    const proximos = [...ocorrP30].sort((a,b)=>(a.data+"|"+(a.hora_inicio||"")).localeCompare(b.data+"|"+(b.hora_inicio||""))).slice(0,8);
    const proxCount = document.getElementById("ag-prox-count");
    if(proxCount) proxCount.textContent = `· ${ocorrP30.length} futuros`;
    const proxEl = document.getElementById("agenda-proximos");
    if(proxEl) {
      if(!proximos.length) {
        proxEl.innerHTML = `<div style="color:var(--tx3);text-align:center;padding:20px">Nenhum evento próximo</div>`;
      } else {
        proxEl.innerHTML = proximos.map(e => {
          const isHoje = e.data===hoje;
          return `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1);align-items:flex-start">
            <div style="background:${isHoje?'var(--teal)':'var(--bg-surface)'};border:1px solid ${isHoje?'var(--teal)':'var(--bd1)'};border-radius:6px;padding:5px 8px;text-align:center;min-width:42px;flex-shrink:0">
              <div style="font-size:8px;color:${isHoje?'rgba(255,255,255,.75)':'var(--teal)'};text-transform:uppercase;font-weight:700;letter-spacing:.05em">${e.data?["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"][parseInt(e.data.slice(5,7))-1]:""}</div>
              <div style="font-size:17px;font-weight:700;color:${isHoje?'#fff':'var(--tx1)'};font-family:var(--mono);line-height:1">${e.data?.slice(8)||"—"}</div>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:11.5px;font-weight:600;color:var(--tx1);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(e.titulo||"—")}</div>
              <div style="font-size:10px;color:var(--tx3)">${e.hora_inicio?e.hora_inicio.slice(0,5):""} ${e.hora_fim?"→ "+e.hora_fim.slice(0,5):""}${e.data_encerramento&&e.data_encerramento!==e.data?" · até "+fmtDataBrCurto(e.data_encerramento):""}</div>
              <div style="font-size:10px;color:var(--teal);margin-top:1px">${escapeHtml(e.espaco||"")}${e.organizador?" · "+escapeHtml(e.organizador):""}</div>
            </div>
            <button onclick='openCrudForm("AGENDA",${safeJsonForHtml(e)})' style="background:none;border:1px solid var(--bd1);border-radius:4px;color:var(--tx3);font-size:10px;padding:3px 6px;cursor:pointer;flex-shrink:0">✏️</button>
          </div>`;
        }).join("");
      }
    }

    // --- Mini calendário ---
    agRenderMiniCal(rows, _agCalAno, _agCalMes);

    // --- Gráfico por mês (barras clicáveis, 2 colunas) ---
    const ordem = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const cores = ["#2ab5c0","#4a9cf5","#8b6fd4","#52c46e","#f5a623","#e05555","#2ab5c0","#4a9cf5","#8b6fd4","#52c46e","#f5a623","#e05555"];
    const mNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const porMes = {};
    todasAnuais.forEach(r=>{
      const mNome = r.mes || mNomes[parseInt(r.data.slice(5,7))-1];
      if(mNome) porMes[mNome]=(porMes[mNome]||0)+1;
    });
    const maxVal = Math.max(...Object.values(porMes), 1);
    const mesEl = document.getElementById("agenda-por-mes");
    if(mesEl) {
      mesEl.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 28px">` +
        ordem.filter(m=>porMes[m]).map((m,i) => `
          <div id="ag-barra-${m}" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:5px 6px;border-radius:5px;transition:background .15s"
               onmouseover="this.style.background='var(--bg-surface)'" onmouseout="this.style.background=''"
               onclick="agVerMes('${m}',this)">
            <div style="font-size:10.5px;color:var(--tx2);width:76px;flex-shrink:0;font-weight:500">${m}</div>
            <div style="flex:1;background:var(--bg-surface);border-radius:4px;overflow:hidden;height:14px">
              <div style="height:100%;background:${cores[i]};border-radius:4px;width:${Math.round((porMes[m]/maxVal)*100)}%;opacity:.75;transition:width .4s"></div>
            </div>
            <div style="font-size:11px;font-family:var(--mono);color:var(--tx1);width:28px;text-align:right;font-weight:600">${porMes[m]}</div>
          </div>`).join("") + `</div>`;
    }

    // --- Dia da semana ---
    const diasSemana = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
    const abrevDia = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
    const contDia = {}; diasSemana.forEach(d=>contDia[d]=0);
    todasAnuais.forEach(r=>{if(r.dia_semana && contDia.hasOwnProperty(r.dia_semana)) contDia[r.dia_semana]++;});
    const maxDia = Math.max(...Object.values(contDia), 1);
    const diasEl = document.getElementById("ag-chart-diasemana");
    if(diasEl) {
      diasEl.innerHTML = diasSemana.map((dia,i) => {
        const pct = Math.round((contDia[dia]/maxDia)*100);
        const isWeekend = i===0||i===6;
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="font-size:10.5px;color:${isWeekend?'var(--teal)':'var(--tx2)'};width:32px;flex-shrink:0;font-weight:${isWeekend?600:400}">${abrevDia[i]}</div>
          <div style="flex:1;background:var(--bg-surface);border-radius:3px;overflow:hidden;height:12px;position:relative">
            <div style="height:100%;background:${isWeekend?'var(--teal)':'var(--blue)'};border-radius:3px;width:${pct}%;opacity:.7"></div>
          </div>
          <div style="font-size:10px;font-family:var(--mono);color:var(--tx1);width:28px;text-align:right">${contDia[dia]}</div>
        </div>`;
      }).join("");
    }

    // --- Recorrência ---
    const recTypes = {};
    rows.forEach(r=>{const k=r.recorrencia||"Único"; recTypes[k]=(recTypes[k]||0)+1;});
    const recSorted = Object.entries(recTypes).sort((a,b)=>b[1]-a[1]).slice(0,7);
    const maxRec = recSorted[0]?.[1]||1;
    const recCores = {Semanal:"#2ab5c0",Mensal:"#4a9cf5",Quinzenal:"#8b6fd4",Anual:"#f5a623","Único":"#52c46e",Eventual:"#d4a843","Esporádico":"#e05555"};
    const recEl = document.getElementById("ag-chart-recorrencia");
    if(recEl) {
      recEl.innerHTML = recSorted.map(([tipo,n]) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px">
          <div style="width:8px;height:8px;border-radius:50%;background:${recCores[tipo]||'var(--teal)'};flex-shrink:0"></div>
          <div style="font-size:10.5px;color:var(--tx2);flex:1">${tipo}</div>
          <div style="flex:2;background:var(--bg-surface);border-radius:3px;overflow:hidden;height:10px">
            <div style="height:100%;background:${recCores[tipo]||'var(--teal)'};border-radius:3px;width:${Math.round((n/maxRec)*100)}%;opacity:.7"></div>
          </div>
          <div style="font-size:10px;font-family:var(--mono);color:var(--tx1);width:28px;text-align:right">${n}</div>
        </div>`).join("");
    }

    // --- Top espaços ---
    const espSorted = Object.entries(espCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const maxEsp = espSorted[0]?.[1]||1;
    const espEl = document.getElementById("ag-chart-espacos");
    if(espEl) {
      espEl.innerHTML = espSorted.map(([esp,n]) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:pointer" onclick="agVerEspaco(this.dataset.e)" data-e="${escapeHtml(esp)}">
          <div style="font-size:10.5px;color:var(--tx2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(esp)}">${escapeHtml(esp)}</div>
          <div style="flex:2;background:var(--bg-surface);border-radius:3px;overflow:hidden;height:10px">
            <div style="height:100%;background:var(--blue);border-radius:3px;width:${Math.round((n/maxEsp)*100)}%;opacity:.7"></div>
          </div>
          <div style="font-size:10px;font-family:var(--mono);color:var(--tx1);width:28px;text-align:right">${n}</div>
        </div>`).join("");
    }

    // --- Top organizadores ---
    const orgCount = {};
    todasAnuais.forEach(r=>{if(r.organizador) orgCount[r.organizador]=(orgCount[r.organizador]||0)+1;});
    const orgSorted = Object.entries(orgCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const maxOrg = orgSorted[0]?.[1]||1;
    const orgEl = document.getElementById("ag-chart-orgs");
    if(orgEl) {
      orgEl.innerHTML = orgSorted.map(([org,n]) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="font-size:10.5px;color:var(--tx2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(org)}">${escapeHtml(org)}</div>
          <div style="flex:2;background:var(--bg-surface);border-radius:3px;overflow:hidden;height:10px">
            <div style="height:100%;background:var(--violet);border-radius:3px;width:${Math.round((n/maxOrg)*100)}%;opacity:.7"></div>
          </div>
          <div style="font-size:10px;font-family:var(--mono);color:var(--tx1);width:28px;text-align:right">${n}</div>
        </div>`).join("");
    }

  } catch(e) {
    T("Erro na Agenda", e.message);
  }
}

/* ── Expande um evento recorrente em todas as ocorrências dentro de [de, ate] ─ */
function agGerarOcorrencias(r, de, ate) {
  if (!r.data || r.data > ate) return [];
  const fimSerie = r.data_encerramento || r.data;
  const rec = r.recorrencia || "Único";
  if (!r.data_encerramento || fimSerie <= r.data) {
    return (r.data >= de && r.data <= ate) ? [r] : [];
  }
  if (rec === "Único" || rec === "Eventual" || rec === "Esporádico") {
    return (r.data >= de && r.data <= ate) ? [r] : [];
  }
  if (fimSerie < de) return [];
  const base = new Date(r.data + "T12:00:00");
  const rangeStart = new Date(de + "T12:00:00");
  const rangeEnd = new Date(Math.min(
    new Date(fimSerie + "T12:00:00").getTime(),
    new Date(ate + "T12:00:00").getTime()
  ));
  const result = [];
  let cursor = new Date(base);
  if (rec === "Semanal" || rec === "Quinzenal") {
    const step = rec === "Semanal" ? 7 : 14;
    const diff = Math.round((rangeStart - base) / 86400000);
    if (diff > 0) cursor = new Date(base.getTime() + Math.ceil(diff / step) * step * 86400000);
  } else {
    while (cursor < rangeStart) {
      if (rec === "Mensal")      cursor.setMonth(cursor.getMonth() + 1);
      else if (rec === "Anual")  cursor.setFullYear(cursor.getFullYear() + 1);
      else break;
    }
  }
  while (cursor <= rangeEnd) {
    result.push({ ...r, data: cursor.toISOString().split("T")[0] });
    if (rec === "Semanal")        cursor = new Date(cursor.getTime() + 7 * 86400000);
    else if (rec === "Quinzenal") cursor = new Date(cursor.getTime() + 14 * 86400000);
    else if (rec === "Mensal")  { cursor = new Date(cursor); cursor.setMonth(cursor.getMonth() + 1); }
    else if (rec === "Anual")   { cursor = new Date(cursor); cursor.setFullYear(cursor.getFullYear() + 1); }
    else break;
  }
  return result;
}

/* ── Verifica se um evento tem ocorrência em uma data específica ─────────
   Suporta recorrências: Semanal (÷7), Quinzenal (÷14), Mensal (mesmo dia),
   Anual (mesmo dia e mês). Eventos sem recorrência usam o range data→data_encerramento. */
function agTemOcorrenciaNaData(r, dataStr) {
  if (!r.data || r.data > dataStr) return false;
  const rec = r.recorrencia || "Único";

  // Evento de dia único: data_encerramento ausente ou igual a data.
  // A recorrência neste caso é apenas um rótulo informativo — não expande.
  if (!r.data_encerramento || r.data_encerramento <= r.data) {
    return r.data === dataStr;
  }

  // Evento com intervalo explícito (data_encerramento > data)
  if (!rec || rec === "Único" || rec === "Eventual" || rec === "Esporádico") {
    return dataStr <= r.data_encerramento;
  }

  // Evento genuinamente recorrente com data de encerramento definida
  if (dataStr > r.data_encerramento) return false;
  const base = new Date(r.data + "T12:00:00");
  const alvo = new Date(dataStr + "T12:00:00");
  if (alvo < base) return false;
  const diffDias = Math.round((alvo - base) / 86400000);
  switch (rec) {
    case "Semanal":   return diffDias % 7  === 0;
    case "Quinzenal": return diffDias % 14 === 0;
    case "Mensal":    return alvo.getDate() === base.getDate();
    case "Anual":     return alvo.getDate() === base.getDate() && alvo.getMonth() === base.getMonth();
    default:          return false;
  }
}

function agRenderMiniCal(rows, ano, mes) {
  const nomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const nomeMes = nomes[mes];
  const titulo = document.getElementById("ag-cal-titulo");
  if(titulo) titulo.innerHTML = `Calendário <span class="csub">· ${nomeMes} ${ano}</span>`;

  const mesStr = String(mes+1).padStart(2,"0");
  const ultimoDiaMesN = new Date(ano, mes+1, 0).getDate();
  const eventosPorDia = {};
  rows.forEach(r => {
    if(!r.data) return;
    for(let dia = 1; dia <= ultimoDiaMesN; dia++) {
      const dataStr = `${ano}-${mesStr}-${String(dia).padStart(2,"0")}`;
      if(agTemOcorrenciaNaData(r, dataStr)) {
        if(!eventosPorDia[dia]) eventosPorDia[dia] = [];
        eventosPorDia[dia].push(r);
      }
    }
  });

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const ultimoDia = new Date(ano, mes+1, 0).getDate();
  const hj = new Date(); const diaHoje = hj.getFullYear()===ano && hj.getMonth()===mes ? hj.getDate() : -1;
  const dias = ["D","S","T","Q","Q","S","S"];

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <button onclick="agNavCal(-1)" style="background:none;border:1px solid var(--bd1);border-radius:4px;color:var(--tx2);font-size:11px;padding:2px 8px;cursor:pointer">←</button>
    <span style="font-size:11px;font-weight:600;color:var(--tx1)">${nomeMes} ${ano}</span>
    <button onclick="agNavCal(1)" style="background:none;border:1px solid var(--bd1);border-radius:4px;color:var(--tx2);font-size:11px;padding:2px 8px;cursor:pointer">→</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">`;
  dias.forEach(d => { html += `<div style="font-size:8.5px;color:var(--tx3);text-align:center;padding:2px 0;font-weight:600">${d}</div>`; });
  for(let i=0;i<primeiroDia;i++) html += `<div></div>`;
  for(let dia=1;dia<=ultimoDia;dia++) {
    const evs = eventosPorDia[dia]||[];
    const isHoje = dia===diaHoje;
    const temEv = evs.length>0;
    const tip = temEv ? evs.map(e=>e.titulo).slice(0,3).join(", ")+(evs.length>3?` +${evs.length-3}`:"") : "";
    html += `<div title="${escapeHtml(tip)}"
      onclick="${temEv?`agVerDia(${ano},${mes+1},${dia})`:'void(0)'}"
      style="aspect-ratio:1;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;font-weight:${isHoje?700:400};cursor:${temEv?'pointer':'default'};
      background:${isHoje?'var(--teal)':temEv?'rgba(42,181,192,.12)':'transparent'};
      color:${isHoje?'#fff':temEv?'var(--teal)':'var(--tx3)'};
      border:1px solid ${isHoje?'var(--teal)':temEv?'rgba(42,181,192,.25)':'transparent'}">
      ${dia}${temEv?`<div style="width:3px;height:3px;border-radius:50%;background:${isHoje?'rgba(255,255,255,.7)':'var(--teal)'};margin-top:1px"></div>`:""}
    </div>`;
  }
  html += `</div>`;
  const el = document.getElementById("ag-mini-cal"); if(el) el.innerHTML = html;
}

async function agNavCal(dir) {
  _agCalMes += dir;
  if(_agCalMes>11){_agCalMes=0;_agCalAno++;} if(_agCalMes<0){_agCalMes=11;_agCalAno--;}
  const rows = await getAgenda(); agRenderMiniCal(rows, _agCalAno, _agCalMes);
}

async function agVerDia(ano, mes, dia) {
  const rows = await getAgenda();
  const m = String(mes).padStart(2,"0"); const d = String(dia).padStart(2,"0");
  const dataStr = `${ano}-${m}-${d}`;
  const evsDia = rows.filter(r => agTemOcorrenciaNaData(r, dataStr));
  agMostrarExpandido(`${evsDia.length} evento${evsDia.length!==1?"s":""} em ${d}/${m}/${ano}`, evsDia, dataStr);
}

async function agVerMes(mes, el) {
  if(_agMesElAtivo===el) {
    const exp = document.getElementById("ag-mes-expandido");
    if(exp && exp.style.display!=="none") { exp.style.display="none"; _agMesElAtivo=null; return; }
  }
  _agMesElAtivo = el;
  const rows = await getAgenda();
  // Coleta todos os dias do mês nomeado e expande recorrências
  const nomeMeses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const mesIdx = nomeMeses.indexOf(mes);
  const anoRef = new Date().getFullYear();
  const evsMesSet = new Set();
  const evsMes = [];
  if (mesIdx >= 0) {
    const ultimoDia = new Date(anoRef, mesIdx + 1, 0).getDate();
    const mesStr = String(mesIdx + 1).padStart(2, "0");
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataStr = `${anoRef}-${mesStr}-${String(dia).padStart(2, "0")}`;
      rows.forEach(r => {
        if (!evsMesSet.has(r.id || r._row) && agTemOcorrenciaNaData(r, dataStr)) {
          evsMesSet.add(r.id || r._row);
          evsMes.push(r);
        }
      });
    }
  } else {
    rows.filter(r => r.mes === mes).forEach(r => evsMes.push(r));
  }
  evsMes.sort((a,b) => (a.data||"").localeCompare(b.data||"") || (a.hora_inicio||"").localeCompare(b.hora_inicio||""));
  agMostrarExpandido(`${evsMes.length} eventos em ${mes}`, evsMes);
}

async function agVerEspaco(espaco) {
  const rows = await getAgenda();
  const evs = rows.filter(r=>r.espaco===espaco).sort((a,b)=>(a.data||"").localeCompare(b.data||"")||( a.hora_inicio||"").localeCompare(b.hora_inicio||""));
  agMostrarExpandido(`${evs.length} eventos · ${espaco}`, evs);
}

function agMostrarExpandido(titulo, evs, occurrenceDate) {
  const expEl = document.getElementById("ag-mes-expandido");
  const titEl = document.getElementById("ag-mes-exp-titulo");
  const listEl = document.getElementById("ag-mes-exp-list");
  if(!expEl||!listEl) return;
  if(titEl) titEl.textContent = titulo;
  expEl.style.display = "block";
  listEl.innerHTML = agRenderEventList(evs, occurrenceDate);
  expEl.scrollIntoView({behavior:"smooth", block:"nearest"});
}

function agRenderEventList(evs, occurrenceDate) {
  if(!evs.length) return `<div style="color:var(--tx3);font-size:11.5px;text-align:center;padding:20px">Nenhum evento</div>`;
  const byDate = {};
  // occurrenceDate: quando fornecido (agVerDia), agrupa tudo sob a data da ocorrência
  // e não sob a data original do evento (que pode ser de meses atrás para recorrentes)
  evs.forEach(e => { const k = occurrenceDate || e.data || "sem-data"; if(!byDate[k]) byDate[k]=[]; byDate[k].push(e); });
  const nomeDias = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
  return Object.entries(byDate).sort(([a],[b])=>a.localeCompare(b)).map(([data,evsDia]) => {
    const [,, dd] = data.split("-");
    const nomeDia = data!=="sem-data" ? nomeDias[new Date(data+"T12:00:00").getDay()] : "";
    return `<div style="margin-bottom:14px">
      <div style="font-size:9.5px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;display:flex;align-items:center;gap:8px">
        <span style="background:var(--teal);color:#fff;border-radius:4px;padding:1px 7px;font-size:9px">${dd||data}</span>${nomeDia}
      </div>
      ${evsDia.map(e=>`
        <div style="display:flex;gap:10px;padding:7px 10px;background:var(--bg-surface);border-radius:6px;margin-bottom:4px;align-items:flex-start">
          <div style="font-size:10px;color:var(--tx3);min-width:52px;font-family:var(--mono);padding-top:1px">${e.hora_inicio?e.hora_inicio.slice(0,5):"—"}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:11.5px;font-weight:600;color:var(--tx1)">${escapeHtml(e.titulo||"—")}</div>
            <div style="font-size:10px;color:var(--tx3);margin-top:1px">${e.espaco?'<span style="color:var(--teal)">'+escapeHtml(e.espaco)+"</span>":""} ${e.organizador?"· "+escapeHtml(e.organizador):""}</div>
            ${occurrenceDate && e.recorrencia && e.data !== occurrenceDate ? `<div style="font-size:9px;color:var(--tx4);margin-top:1px">início: ${fmtDataBrCurto(e.data)}${e.data_encerramento&&e.data_encerramento!==e.data?" · até "+fmtDataBrCurto(e.data_encerramento):""}</div>` : ""}
          </div>
          ${e.recorrencia?`<span style="font-size:9px;background:rgba(42,181,192,.1);color:var(--teal);border-radius:3px;padding:1px 5px;flex-shrink:0;white-space:nowrap">${e.recorrencia}</span>`:""}
          <button onclick='openCrudForm("AGENDA",${safeJsonForHtml(e)})' style="background:none;border:1px solid var(--bd1);border-radius:4px;color:var(--tx3);font-size:10px;padding:2px 6px;cursor:pointer;flex-shrink:0">✏️</button>
        </div>`).join("")}
    </div>`;
  }).join("");
}

async function filtrarAgendaMes() {
  const mes = document.getElementById("ag-filtro-mes")?.value;
  _agendaCache = null;
  const rows = await getAgenda();
  const filtrados = mes ? rows.filter(r=>r.mes===mes) : rows;
  const count = document.getElementById("ag-cal-count");
  if (count) count.textContent = `· ${filtrados.length} eventos`;
  renderModuloList(filtrados, "AGENDA", "agenda-cal-list");
}

async function carregarMes() {
  const mes = document.getElementById("ag-mes-sel")?.value;
  if (!mes) return;
  const titulo = document.getElementById("ag-mes-titulo");
  if (titulo) titulo.firstChild.textContent = `Eventos de ${mes} `;
  _agendaCache = null;
  const rows = await getAgenda();
  const filtrados = rows.filter(r=>r.mes===mes).sort((a,b)=>(a.data||"").localeCompare(b.data||"")||(a.hora_inicio||"").localeCompare(b.hora_inicio||""));
  renderModuloList(filtrados, "AGENDA", "agenda-mes-list");
}

async function carregarEspacos() {
  const el = document.getElementById("agenda-espacos-list");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Carregando...</div>`;
  try {
    const rows = await getAgenda();
    const espacos = {};
    rows.forEach(r => {
      const esp = r.espaco || "Não informado";
      if (!espacos[esp]) espacos[esp] = [];
      espacos[esp].push(r);
    });
    const sorted = Object.entries(espacos).sort((a,b)=>b[1].length-a[1].length);
    const max = sorted[0]?.[1].length || 1;
    el.innerHTML = sorted.map(([esp, evs]) => `
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:11.5px;font-weight:600;color:var(--tx1)">${escapeHtml(esp)}</span>
          <span style="font-size:10.5px;color:var(--tx3);font-family:var(--mono)">${evs.length} eventos</span>
        </div>
        <div style="background:var(--bg-surface);border-radius:4px;overflow:hidden;height:10px">
          <div style="height:100%;background:var(--teal);border-radius:4px;width:${Math.round((evs.length/max)*100)}%;opacity:0.75"></div>
        </div>
      </div>`).join("");
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose)">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

async function carregarIndicadores() {
  try {
    const [membros, pgs, demandas, agenda] = await Promise.all([
      apiRead("MEMBROS").catch(()=>[]),
      apiRead("PGS").catch(()=>[]),
      apiRead("DEMANDAS").catch(()=>[]),
      apiRead("AGENDA").catch(()=>[])
    ]);
    const sv = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    sv("ci-memb", membros.length);
    sv("ci-pgs", pgs.filter(r=>r.ativo!==false).length);
    sv("ci-dem", demandas.filter(r=>!["Concluída","Cancelado"].includes(r.status)).length);
    sv("ci-ag", agenda.length);
    renderModuloList(membros.slice(0,20), "MEMBROS", "conselho-ind-list");
  } catch(e) { console.warn(e); }
}

async function carregarIndicadoresGerais() {
  try {
    const [membros, visitantes, demandas, pgs] = await Promise.all([
      apiRead("MEMBROS").catch(()=>[]),
      apiRead("VISITANTES").catch(()=>[]),
      apiRead("DEMANDAS").catch(()=>[]),
      apiRead("PGS").catch(()=>[])
    ]);
    const sv = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    sv("ri-memb", membros.length);
    sv("ri-vis", visitantes.length);
    sv("ri-dem", demandas.length);
    sv("ri-pgs", pgs.length);
    const el = document.getElementById("rel-ind-list");
    if (el) el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:var(--bg-surface);border-radius:6px;padding:12px">
          <div style="font-size:10px;color:var(--tx3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em">Status das Demandas</div>
          ${["Pendente","Em Andamento","Concluída","Cancelado"].map(s=>`
            <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd1)">
              <span style="font-size:11px;color:var(--tx2)">${s}</span>
              <span style="font-size:11px;font-family:var(--mono);color:var(--tx1)">${demandas.filter(r=>r.status===s).length}</span>
            </div>`).join("")}
        </div>
        <div style="background:var(--bg-surface);border-radius:6px;padding:12px">
          <div style="font-size:10px;color:var(--tx3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em">Membros por Função</div>
          ${[...new Set(membros.map(r=>r.funcao).filter(Boolean))].slice(0,6).map(f=>`
            <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd1)">
              <span style="font-size:11px;color:var(--tx2)">${escapeHtml(f)}</span>
              <span style="font-size:11px;font-family:var(--mono);color:var(--tx1)">${membros.filter(r=>r.funcao===f).length}</span>
            </div>`).join("")}
        </div>
      </div>`;
  } catch(e) { console.warn(e); }
}

/* Módulo Membresia Core/Listagens extraído para membresia-core.js */


async function exportarDados(tab, nome) {
  try {
    T("Exportando...", `Buscando dados de ${nome}`);
    const rows = await apiRead(tab);
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sipen-${nome}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    T(`✅ ${nome} exportado!`, `${rows.length} registros baixados`);
  } catch(e) { T("Erro ao exportar", e.message); }
}

// VIEW_AUTOLOAD para novas views
const _newAutoloads = {
  "conselho-ind":    null, // handled by carregarIndicadores
  "rel-ind":         null, // handled by carregarIndicadoresGerais
  "admin-con":       null, // handled by contratos.js
  "admin-doc":       { tab:"DEMANDAS",       id:"admin-doc-list",   filtro:{area:"Documentos"} },
  "admin-parking-controls": { fn: () => ceCarregar() },
  "jur-contratos":   { tab:"DEMANDAS",       id:"jur-con-list",     filtro:{area:"Jurídico"} },
  "jur-pareceres":   { tab:"DEMANDAS",       id:"jur-par-list",     filtro:{area:"Jurídico"} },
  "jur-documentos":  { tab:"DEMANDAS",       id:"jur-doc-list",     filtro:{area:"Jurídico"} },
  "jur-riscos":      { tab:"DEMANDAS",       id:"jur-ris-list",     filtro:{area:"Jurídico"} },
  "jur-historico":   { tab:"LOG_AUDITORIA",  id:"jur-hist-list" },
  "conselho-rel":    { tab:"DEMANDAS",       id:"conselho-rel-list" },
  "conselho-doc":    { tab:"LOG_AUDITORIA",  id:"conselho-doc-list" },
  "conselho-cong":   { tab:"MEMBROS",        id:"conselho-cong-list" },
  "conselho-hist":   { tab:"LOG_AUDITORIA",  id:"conselho-hist-list" },
  "pastoral-ate":    { tab:"DEMANDAS",       id:"pastoral-ate-list", filtro:{area:"Pastoral"} },
  "pastoral-ora":    { tab:"DEMANDAS",       id:"pastoral-ora-list", filtro:{area:"Pastoral"} },
  "pastoral-aco":    { tab:"MEMBROS",        id:"pastoral-aco-list" },
  "pastoral-reg":    { tab:"DEMANDAS",       id:"pastoral-reg-list", filtro:{area:"Pastoral"} },
  "pastoral-pri":    { tab:"DEMANDAS",       id:"pastoral-pri-list", filtro:{area:"Pastoral"} },
  "min-lid":         { tab:"MEMBROS",        id:"min-lid-list" },
  "min-esc":         { tab:"AGENDA",         id:"min-esc-list" },
  "min-prog":        { tab:"AGENDA",         id:"min-prog-list" },
  "min-lit":         { tab:"AGENDA",         id:"min-lit-list" },
  "infra-lim":       { tab:"DEMANDAS",       id:"infra-lim-list",   filtro:{area:"Limpeza"} },
  "infra-sol":       { tab:"DEMANDAS",       id:"infra-sol-list",   filtro:{area:"Infraestrutura"} },
  "infra-pat":       { tab:"ESTOQUE_ITENS",  id:"infra-pat-list" },
  "infra-pre":       { tab:"MEMBROS",        id:"infra-pre-list" },
  "rel-mod":         { tab:"DEMANDAS",       id:"rel-mod-list" },
  "rel-uni":         { tab:"MEMBROS",        id:"rel-uni-list" },
  "rel-res":         { tab:"DEMANDAS",       id:"rel-res-list" },
  "memb-dash":       { fn: () => carregarMembresiaDash() },
  "memb-com":        { fn: () => com_filtrar() },
  "memb-ncom":       { fn: () => ncom_filtrar() },
  "memb-bat":        { fn: () => listarMembros("memb-bat-list","memb-bat-count",{tipo_ingresso:"batismo"}) },
  "memb-prof":       { fn: () => listarMembros("memb-prof-list","memb-prof-count",{tipo_ingresso:"profissão de fé"}) },
  "memb-trans":      { fn: () => listarMembros("memb-trans-list","memb-trans-count",{tipo_ingresso:"transferência"}) },
  "memb-hist":       { fn: () => listarMembros("memb-hist-list","memb-hist-count",{},true) },
  "memb-aniv":       { fn: () => carregarAniversariantes() },
  "pgs-encontros":   { tab:"AGENDA",         id:"pgs-enc-list" },
  "pgs-participantes":{ tab:"MEMBROS",       id:"pgs-part-list" },
  "pgs-estudos":     { tab:"AGENDA",         id:"pgs-est-list" },
  "pgs-relatorios":  { tab:"PGS",            id:"pgs-rel-list" },
  "pgs-oracao":      { tab:"DEMANDAS",       id:"pgs-ora-list",     filtro:{area:"PGs"} },
  "pgs-historico":   { tab:"PGS",            id:"pgs-hist-list" },
};
Object.assign(VIEW_AUTOLOAD, _newAutoloads);

// CRUMBs para novas views
Object.assign(CRUMB, {
  "atas-dash":  ["Conselho e Governança","Atas e Deliberações","/ painel geral"],
  "atas-todas": ["Conselho e Governança","Todas as Atas","/ lista completa"],
  "atas-nova":  ["Conselho e Governança","Nova Ata","/ formulário"],
  "atas-delib": ["Conselho e Governança","Deliberações","/ todas as deliberações"],
  "conselho-ind":["Conselho e Governança","Indicadores Institucionais","/ métricas institucionais"],
  "conselho-rel":["Conselho e Governança","Relatórios Estratégicos","/ demandas e governança"],
  "conselho-doc":["Conselho e Governança","Documentos do Conselho","/ atas e registros"],
  "conselho-cong":["Conselho e Governança","Acomp. das Congregações","/ membros por congregação"],
  "rel-ind":["Relatórios","Indicadores","/ resumo geral"],
  "rel-exp":["Relatórios","Exportações","/ download de dados"],
  "rel-mod":["Relatórios","Por Módulo","/ demandas por área"],
  "rel-uni":["Relatórios","Por Congregação",""],
  "rel-res":["Relatórios","Por Responsável",""],
  "memb-com":["Membresia","Comungantes",""],
  "memb-ncom":["Membresia","Não Comungantes",""],
  "memb-bat":["Membresia","Batismos",""],
  "memb-prof":["Membresia","Profissões de Fé",""],
  "memb-trans":["Membresia","Transferências",""],
  "memb-hist":["Membresia","Histórico",""],
  "memb-aniv":["Membresia","Aniversariantes","/ do mês"],
  "pgs-encontros":["Pequenos Grupos","Encontros",""],
  "pgs-participantes":["Pequenos Grupos","Participantes",""],
  "pgs-estudos":["Pequenos Grupos","Estudos",""],
  "pgs-relatorios":["Pequenos Grupos","Relatórios",""],
  "pgs-oracao":["Pequenos Grupos","Pedidos de Oração",""],
  "pgs-historico":["Pequenos Grupos","Histórico",""],
});


// ── Mapa de status para exibição ──────────────────────────────
const AG_STATUS = {
  "pendente":             { label: "Aguardando aprovação", cor: "var(--amber)"  },
  "aguardando_aprovacao": { label: "Aguardando aprovação", cor: "var(--amber)"  },
  "em_analise":           { label: "Em análise",           cor: "var(--sky)"    },
  "ajuste_solicitado":    { label: "Ajuste solicitado",    cor: "var(--orange)" },
  "confirmado":           { label: "Aprovada",             cor: "var(--gr)"     },
  "recusado":             { label: "Recusada",             cor: "var(--rose)"   },
  "cancelado":            { label: "Cancelada",            cor: "var(--tx3)"    },
};
function _agPill(status) {
  const cfg = AG_STATUS[status] || { label: status || "—", cor: "var(--tx3)" };
  return `<span style="font-size:9.5px;padding:2px 9px;border-radius:10px;background:${cfg.cor}18;color:${cfg.cor};border:1px solid ${cfg.cor}33;font-weight:700;white-space:nowrap">${escapeHtml(cfg.label)}</span>`;
}

let _agSolFiltro = "";   // filtro de status ativo na aba Solicitações
let _agSolRows   = [];   // cache local para o filtro

window.agFiltrarSolStatus = function(status) {
  _agSolFiltro = _agSolFiltro === status ? "" : status;
  _agRenderSolTabela();
};

function _agKpiSol(rows) {
  const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  s("sol-aguard",  rows.filter(r => ["pendente","aguardando_aprovacao"].includes(r.status)).length);
  s("sol-analise", rows.filter(r => r.status === "em_analise").length);
  s("sol-ajuste",  rows.filter(r => r.status === "ajuste_solicitado").length);
  s("sol-aprov",   rows.filter(r => r.status === "confirmado").length);
  s("sol-recus",   rows.filter(r => r.status === "recusado").length);
}

function _agRenderSolTabela() {
  const el = document.getElementById("agenda-sol-list");
  if (!el) return;
  const fmtD = d => { if (!d) return "—"; const [y,m,dia] = String(d).slice(0,10).split("-"); return `${dia}/${m}/${y}`; };
  const rows = _agSolFiltro
    ? _agSolRows.filter(r => {
        if (_agSolFiltro === "aguardando") return ["pendente","aguardando_aprovacao"].includes(r.status);
        return r.status === _agSolFiltro;
      })
    : _agSolRows;

  if (!rows.length) {
    el.innerHTML = `<div style="text-align:center;padding:28px;color:var(--tx3)">
      <div style="font-size:28px;margin-bottom:8px">📭</div>
      <div style="font-size:12px">Nenhuma solicitação ${_agSolFiltro ? "com esse status " : ""}encontrada.</div>
    </div>`;
    return;
  }

  const pendente = s => ["pendente","aguardando_aprovacao","em_analise","ajuste_solicitado"].includes(s);

  const thStyle = `text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)`;

  // Bloco de solicitações regulares
  const solHtml = rows.length ? `<div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:11.5px;min-width:780px">
      <thead><tr style="border-bottom:1px solid var(--bd2);background:var(--bg-surface)">
        <th style="${thStyle}">Protocolo</th>
        <th style="${thStyle}">Título</th>
        <th style="${thStyle}">Solicitante</th>
        <th style="${thStyle}">Data / Espaço</th>
        <th style="${thStyle}">Status</th>
        <th style="${thStyle}">Termo</th>
        <th style="text-align:right;padding:7px 10px;font-size:9.5px;color:var(--tx3)">Ações</th>
      </tr></thead>
      <tbody>${rows.map(r => {
        const ativa = pendente(r.status);
        const termoBadge = st => {
          if (st === "aceito")     return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700;background:rgba(42,158,82,.12);color:var(--gr);border:1px solid rgba(42,158,82,.28)">✅ Aceito</span>`;
          if (st === "aguardando") return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700;background:rgba(176,125,16,.10);color:#b07d10;border:1px solid rgba(176,125,16,.22)">⏳ Pendente</span>`;
          return `<span style="color:var(--tx3);font-size:10px">—</span>`;
        };
        return `<tr style="border-bottom:1px solid var(--bd1)" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
          <td style="padding:8px 10px;font-family:var(--mono);font-size:10px;color:var(--tx3)">${escapeHtml(r.protocolo||"—")}</td>
          <td style="padding:8px 10px;color:var(--tx1);font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(r.titulo||'')}">${escapeHtml(r.titulo||"—")}</td>
          <td style="padding:8px 10px;color:var(--tx2);font-size:11px">${escapeHtml(r.solicitante_txt||r.solicitante||"—")}</td>
          <td style="padding:8px 10px;color:var(--tx2);font-size:11px;white-space:nowrap">
            ${r.data ? fmtD(r.data) : "—"}
            ${r.hora_inicio ? `<div style="font-size:10px;color:var(--tx3)">${String(r.hora_inicio).slice(0,5)}${r.hora_fim ? " → " + String(r.hora_fim).slice(0,5) : ""}</div>` : ""}
            ${r.espaco ? `<div style="font-size:10px;color:var(--tx3)">${escapeHtml(r.espaco)}</div>` : ""}
          </td>
          <td style="padding:8px 10px">${_agPill(r.status)}</td>
          <td style="padding:8px 10px">${termoBadge(r.status_termo)}</td>
          <td style="padding:8px 10px;text-align:right;white-space:nowrap">
            <div style="display:flex;gap:4px;justify-content:flex-end;align-items:center">
              <button onclick='agAnalisarSolicitacao("${r.id}")' style="padding:3px 9px;border-radius:4px;border:1px solid var(--bd1);background:var(--bg-card);color:var(--tx2);font-size:10px;cursor:pointer">Analisar</button>
              ${ativa ? `
                <button onclick='agAprovarAgendamento("${r.id}")' style="padding:3px 9px;border-radius:4px;border:1px solid rgba(58,170,92,.4);background:rgba(58,170,92,.1);color:var(--gr);font-size:10px;font-weight:700;cursor:pointer">✓ Aprovar</button>
                <button onclick='agRejeitarAgendamento("${r.id}")' style="padding:3px 9px;border-radius:4px;border:1px solid rgba(224,85,85,.35);background:rgba(224,85,85,.08);color:var(--rose);font-size:10px;font-weight:700;cursor:pointer">✕ Recusar</button>
              ` : ""}
              <div style="position:relative;display:inline-block">
                <button onclick='agSolKebab(this,"${r.id}")' style="padding:3px 7px;border-radius:4px;border:1px solid var(--bd1);background:var(--bg-card);color:var(--tx2);font-size:13px;cursor:pointer;line-height:1">⋯</button>
              </div>
            </div>
          </td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>` : "";

  el.innerHTML = solHtml;
}

async function carregarSolicitacoesAgenda() {
  const el = document.getElementById("agenda-sol-list");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Carregando...</div>`;
  try {
    const [resAg, resReq] = await Promise.all([
      fetch(`${apiBaseUrl()}/rest/v1/agenda?deleted_at=is.null&select=*&order=created_at.desc&limit=300`, { headers: apiHeaders() }),
      fetch(`${apiBaseUrl()}/rest/v1/requisicoes_espaco?deleted_at=is.null&select=*&order=created_at.desc&limit=200`, { headers: apiHeaders() }),
    ]);
    if (!resAg.ok) throw new Error(await resAg.text());
    _agSolRows = await resAg.json();
    _agReqRows = resReq.ok ? await resReq.json() : [];
    _agKpiSol(_agSolRows);
    _agKpiReq(_agReqRows);
    _agRenderSolTabela();
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

// ── Modal: Analisar Solicitação de Agendamento ─────────────────
async function agAnalisarSolicitacao(id) {
  let r = _agSolRows.find(x => x.id === id);
  if (!r) {
    try {
      const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${id}&select=*&limit=1`, { headers: apiHeaders() });
      const data = await res.json();
      r = Array.isArray(data) ? data[0] : data;
    } catch (e) { T("Erro", e.message); return; }
  }
  if (!r) { T("Não encontrado", "Agendamento não encontrado."); return; }

  const fmtD = d => { if (!d) return "—"; const [y,m,dia] = String(d).slice(0,10).split("-"); return `${dia}/${m}/${y}`; };
  const fmtH = h => h ? String(h).slice(0,5) : null;
  const lbl  = (titulo, val) => val ? `<div style="flex:1;min-width:160px"><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px">${titulo}</div><div style="font-size:12.5px;color:var(--tx1)">${escapeHtml(String(val))}</div></div>` : "";

  const pendente = ["pendente","aguardando_aprovacao","em_analise","ajuste_solicitado"].includes(r.status);
  const cfg      = AG_STATUS[r.status] || { label: r.status, cor: "var(--tx3)" };

  let modal = document.getElementById("ag-analisar-modal");
  if (!modal) { modal = document.createElement("div"); modal.id = "ag-analisar-modal"; document.body.appendChild(modal); }
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:340;display:flex;align-items:flex-start;justify-content:center;padding:24px 0;overflow-y:auto";

  modal.innerHTML = `
    <div style="width:min(680px,96vw);background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;box-shadow:0 10px 50px rgba(0,0,0,.3)">

      <!-- Cabeçalho -->
      <div style="padding:20px 24px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:flex-start;gap:14px">
        <div style="flex:1">
          <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px">Analisar Solicitação de Agendamento</div>
          <div style="font-size:17px;font-weight:800;color:var(--tx1);line-height:1.3">${escapeHtml(r.titulo || "—")}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap">
            ${_agPill(r.status)}
            ${r.protocolo ? `<span style="font-size:10px;font-family:var(--mono);color:var(--tx3);background:var(--bg-surface);padding:2px 8px;border-radius:6px;border:1px solid var(--bd1)">${escapeHtml(r.protocolo)}</span>` : ""}
            <span style="font-size:10px;color:var(--tx3)">Recebida em ${fmtD(r.created_at||r.criado_em)}</span>
          </div>
        </div>
        <button onclick="document.getElementById('ag-analisar-modal')?.remove()" style="background:none;border:none;color:var(--tx3);font-size:20px;cursor:pointer;padding:0;line-height:1">✕</button>
      </div>

      <!-- Corpo -->
      <div style="padding:20px 24px;display:flex;flex-direction:column;gap:18px">

        <!-- Solicitante -->
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Solicitante</div>
          <div style="display:flex;flex-wrap:wrap;gap:12px">
            ${lbl("Nome", r.solicitante_txt || r.solicitante || r.organizador)}
            ${lbl("WhatsApp", r.solicitante_tel || r.telefone)}
            ${lbl("Ministério / Origem", r.organizador || r.origem)}
          </div>
        </div>

        <!-- Data e espaço -->
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Agendamento solicitado</div>
          <div style="display:flex;flex-wrap:wrap;gap:12px">
            ${lbl("Data", fmtD(r.data))}
            ${lbl("Horário início", fmtH(r.hora_inicio))}
            ${lbl("Horário fim", fmtH(r.hora_fim))}
            ${lbl("Espaço / Ambiente", r.espaco)}
            ${lbl("Recorrência", r.recorrencia)}
          </div>
        </div>

        <!-- Descrição -->
        ${r.descricao ? `<div>
          <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Descrição</div>
          <div style="font-size:12.5px;color:var(--tx1);white-space:pre-wrap;background:var(--bg-surface);border:1px solid var(--bd1);border-radius:8px;padding:12px 14px;line-height:1.6">${escapeHtml(r.descricao)}</div>
        </div>` : ""}

        <!-- Aprovação / recusa (quando já decidido) -->
        ${r.status === "confirmado" ? `<div style="background:rgba(58,170,92,.1);border:1px solid rgba(58,170,92,.3);border-radius:8px;padding:12px 14px">
          <div style="font-size:11px;font-weight:700;color:var(--gr);margin-bottom:4px">✅ Aprovada por ${escapeHtml(r.aprovado_por_nome||"—")}</div>
          <div style="font-size:11px;color:var(--tx2)">${r.aprovado_em ? fmtD(r.aprovado_em) : "—"}</div>
        </div>` : ""}
        ${r.status === "recusado" ? `<div style="background:rgba(224,85,85,.08);border:1px solid rgba(224,85,85,.3);border-radius:8px;padding:12px 14px">
          <div style="font-size:11px;font-weight:700;color:var(--rose);margin-bottom:4px">🚫 Recusada</div>
          ${r.motivo_rejeicao ? `<div style="font-size:11.5px;color:var(--tx2)">${escapeHtml(r.motivo_rejeicao)}</div>` : ""}
        </div>` : ""}
        ${r.status === "ajuste_solicitado" ? `<div style="background:rgba(234,88,12,.08);border:1px solid rgba(234,88,12,.3);border-radius:8px;padding:12px 14px">
          <div style="font-size:11px;font-weight:700;color:var(--orange)">🔄 Aguardando ajuste do solicitante</div>
        </div>` : ""}
      </div>

      <!-- Rodapé com ações -->
      <div style="padding:14px 24px 20px;border-top:1px solid var(--bd1);display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        <button onclick="document.getElementById('ag-analisar-modal')?.remove()" style="padding:8px 16px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12.5px;cursor:pointer">Fechar</button>
        ${pendente ? `
          <button onclick="document.getElementById('ag-analisar-modal')?.remove();agSolicitarAjuste('${r.id}')" style="padding:8px 16px;border-radius:7px;border:1px solid rgba(234,88,12,.4);background:rgba(234,88,12,.08);color:var(--orange);font-size:12.5px;font-weight:600;cursor:pointer">🔄 Solicitar ajuste</button>
          <button onclick="document.getElementById('ag-analisar-modal')?.remove();agRejeitarAgendamento('${r.id}')" style="padding:8px 16px;border-radius:7px;border:1px solid rgba(224,85,85,.4);background:rgba(224,85,85,.08);color:var(--rose);font-size:12.5px;font-weight:600;cursor:pointer">🚫 Recusar</button>
          <button onclick="document.getElementById('ag-analisar-modal')?.remove();agAprovarAgendamento('${r.id}')" style="padding:8px 18px;border-radius:7px;border:none;background:var(--gr);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">✅ Aprovar agendamento</button>
        ` : ""}
      </div>
    </div>`;
}

// ── Solicitar ajuste ───────────────────────────────────────────
async function agSolicitarAjuste(id) {
  let modal = document.getElementById("ag-ajuste-modal");
  if (!modal) { modal = document.createElement("div"); modal.id = "ag-ajuste-modal"; document.body.appendChild(modal); }
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:350;display:flex;align-items:center;justify-content:center";
  modal.innerHTML = `
    <div style="width:min(460px,94vw);background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;padding:24px;box-shadow:0 8px 40px rgba(0,0,0,.3)">
      <div style="font-size:15px;font-weight:700;color:var(--tx1);margin-bottom:6px">Solicitar ajuste</div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:16px">Informe o que precisa ser corrigido ou complementado pelo solicitante. Ele receberá a orientação via WhatsApp.</div>
      <label style="font-size:9.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em">Orientação ao solicitante *</label>
      <textarea id="ag-ajuste-texto" rows="4" placeholder="Ex.: Por favor, informe o horário exato de início e término, e se haverá uso de sonorização." style="width:100%;margin-top:6px;padding:9px 11px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input);color:var(--tx1);font-size:12.5px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box"></textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
        <button onclick="document.getElementById('ag-ajuste-modal')?.remove()" style="padding:8px 16px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12.5px;cursor:pointer">Cancelar</button>
        <button onclick="agConfirmarAjuste('${id}')" style="padding:8px 18px;border-radius:7px;border:none;background:var(--orange);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">Enviar orientação</button>
      </div>
    </div>`;
}

async function agConfirmarAjuste(id) {
  const texto = document.getElementById("ag-ajuste-texto")?.value?.trim();
  if (!texto) { T("Campo obrigatório", "Informe a orientação antes de enviar."); return; }
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify({ status: "ajuste_solicitado", atualizado_em: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    const r    = Array.isArray(rows) ? rows[0] : rows;

    // Notifica Comunicação se houver solicitação vinculada
    _comSyncStatus(id, "ajuste", texto);

    // WA ao solicitante
    const tel = r?.telefone || r?.solicitante_tel;
    const nome = r?.solicitante_txt || r?.solicitante || "";
    if (tel && typeof WA !== "undefined") {
      WA.send({
        para: tel, nome,
        mensagem: `Olá${nome ? ", " + nome.split(" ")[0] : ""}! Sua solicitação de agendamento *"${r?.titulo || ""}"* precisa de ajustes.\n\n📋 Orientação: ${texto}\n\n${r?.protocolo ? "🔖 Protocolo: " + r.protocolo : ""}`,
        modulo: "AGENDA", referenciaT: "agenda", referenciaId: id, chave: `AG_AJUSTE_${id}`,
      }).catch(() => {});
    }

    document.getElementById("ag-ajuste-modal")?.remove();
    T("Ajuste solicitado.", "O solicitante será notificado.");
    _agendaCache = null;
    carregarSolicitacoesAgenda();
  } catch(e) { T("Erro", e.message); }
}

async function agEmAnalise(id) {
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/demandas?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ status: "Em Andamento" })
    });
    if (!res.ok) throw new Error(await res.text());
    T("Status atualizado", "Demanda marcada como Em Andamento.");
    carregarSolicitacoesAgenda();
  } catch(e) { T("Erro", e.message); }
}

async function agRecusarSolicitacao(id) {
  if (!confirm("Recusar esta solicitação de agendamento?")) return;
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/demandas?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ status: "Cancelado" })
    });
    if (!res.ok) throw new Error(await res.text());
    T("Solicitação recusada", "Status atualizado para Cancelado.");
    carregarSolicitacoesAgenda();
  } catch(e) { T("Erro ao recusar", e.message); }
}

function agAprovarSolicitacao(r) {
  let modal = document.getElementById("ag-aprov-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "ag-aprov-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:340;display:flex;align-items:center;justify-content:center";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div style="width:min(600px,94vw);max-height:90vh;overflow:auto;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:24px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
      <div style="font-size:22px">✅</div>
      <div>
        <div style="font-size:14px;font-weight:800;color:var(--tx1)">Aprovar e criar evento</div>
        <div style="font-size:10.5px;color:var(--tx3)">${escapeHtml(r.titulo||"—")}${r.solicitante ? " · " + nomePropio(r.solicitante) : ""}</div>
      </div>
      <button onclick="document.getElementById('ag-aprov-modal')?.remove()" style="margin-left:auto;background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div style="grid-column:1/-1"><label class="flb">Título do evento *</label><input id="ag-ap-titulo" class="fi2" value="${escapeHtml(r.titulo||'')}" placeholder="Título do evento na agenda"></div>
      <div><label class="flb">Data *</label><input id="ag-ap-data" type="date" class="fi2"></div>
      <div><label class="flb">Horário início *</label><input id="ag-ap-hi" type="time" class="fi2" value="08:00"></div>
      <div><label class="flb">Horário fim</label><input id="ag-ap-hf" type="time" class="fi2" value="10:00"></div>
      <div><label class="flb">Espaço / Ambiente</label>${agSalasSelect("ag-ap-esp", r.local_id || r.local || "")}</div>
      <div style="grid-column:1/-1"><label class="flb">Organizador</label><input id="ag-ap-org" class="fi2" value="${escapeHtml(r.responsavel||r.solicitante||'')}" placeholder="Responsável pelo evento"></div>
      <div style="grid-column:1/-1"><label class="flb">Descrição</label><textarea id="ag-ap-desc" class="fi2" rows="3" placeholder="Detalhes do evento">${escapeHtml(r.descricao||'')}</textarea></div>
    </div>
    <label style="display:flex;align-items:center;gap:9px;margin-top:14px;cursor:pointer;user-select:none">
      <input type="checkbox" id="ag-ap-interno" style="width:16px;height:16px;accent-color:var(--sky);cursor:pointer">
      <span style="font-size:12.5px;color:var(--tx2)">Atividade interna <span style="color:var(--tx3);font-size:11px">— não aparece na Área do Membro</span></span>
    </label>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
      <button class="btn" onclick="document.getElementById('ag-aprov-modal')?.remove()">Cancelar</button>
      <button class="btn btn-p" onclick="agConfirmarAprovacao('${r.id}')">Confirmar e criar evento</button>
    </div>
  </div>`;
  agSalasSelectPopular("ag-ap-esp");
}

async function agConfirmarAprovacao(demandaId) {
  const titulo = (document.getElementById("ag-ap-titulo")?.value || "").trim();
  const data   = document.getElementById("ag-ap-data")?.value || "";
  const hi     = document.getElementById("ag-ap-hi")?.value || "";
  const hf     = document.getElementById("ag-ap-hf")?.value || null;
  const espEl   = document.getElementById("ag-ap-esp");
  const espId   = espEl?.value?.trim() || null;
  const espNome = espEl?.selectedOptions[0]?.dataset?.nome || null;
  const org    = (document.getElementById("ag-ap-org")?.value || "").trim() || null;
  const desc   = (document.getElementById("ag-ap-desc")?.value || "").trim() || null;

  if (!titulo || !data || !hi) return T("Campos obrigatórios", "Preencha título, data e horário de início.");

  const nomeMeses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const diasSemana = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
  const dt = new Date(data + "T12:00:00");
  const mes = nomeMeses[dt.getMonth()];
  const diaSemana = diasSemana[dt.getDay()];

  try {
    const resAg = await fetch(`${apiBaseUrl()}/rest/v1/agenda`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ titulo, data, hora_inicio: hi, hora_fim: hf, espaco: espNome, espaco_id: espId, organizador: org, descricao: desc, status: "confirmado", mes, dia_semana: diaSemana, recorrencia: "Único", visibilidade: document.getElementById("ag-ap-interno")?.checked ? "interna" : "publica" })
    });
    if (!resAg.ok) throw new Error(await resAg.text());

    const resDem = await fetch(`${apiBaseUrl()}/rest/v1/demandas?id=eq.${demandaId}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ status: "Concluída" })
    });
    if (!resDem.ok) throw new Error(await resDem.text());

    document.getElementById("ag-aprov-modal")?.remove();
    _agendaCache = null;
    T("Evento criado!", `"${titulo}" adicionado ao calendário como confirmado.`);
    carregarSolicitacoesAgenda();
  } catch(e) { T("Erro ao aprovar", e.message); }
}

async function detectarConflitos() {
  const el = document.getElementById("ag-conflitos-list");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Verificando conflitos...</div>`;
  try {
    const rows = await getAgenda();
    // Detectar eventos no mesmo espaço, mesma data e horários sobrepostos
    const conflitos = [];
    for (let i = 0; i < rows.length; i++) {
      for (let j = i+1; j < rows.length; j++) {
        const a = rows[i], b = rows[j];
        if (!a.espaco || !b.espaco) continue;
        if (a.espaco.toLowerCase() !== b.espaco.toLowerCase()) continue;
        // Verifica sobreposição de períodos (data + hora)
        const aIni = (a.data || "") + "T" + (a.hora_inicio || "00:00");
        const aFim = (a.data_encerramento || a.data || "") + "T" + (a.hora_fim || "23:59");
        const bIni = (b.data || "") + "T" + (b.hora_inicio || "00:00");
        const bFim = (b.data_encerramento || b.data || "") + "T" + (b.hora_fim || "23:59");
        if (aIni < bFim && bIni < aFim) conflitos.push([a,b]);
      }
    }
    if (!conflitos.length) {
      el.innerHTML = `<div style="text-align:center;padding:24px;color:var(--gr)">
        <div style="font-size:28px;margin-bottom:8px">✅</div>
        <div style="font-size:12px;font-weight:600">Nenhum conflito detectado!</div>
        <div style="font-size:10.5px;color:var(--tx3);margin-top:4px">Todos os espaços estão livres nos horários agendados</div>
      </div>`;
      return;
    }
    el.innerHTML = `
      <div style="font-size:10px;color:var(--rose);margin-bottom:10px;font-weight:600">⚠️ ${conflitos.length} conflito${conflitos.length>1?"s":""} encontrado${conflitos.length>1?"s":""}</div>
      ${conflitos.map(([a,b])=>`
        <div style="background:rgba(224,85,85,0.07);border:1px solid rgba(224,85,85,0.2);border-radius:6px;padding:10px 12px;margin-bottom:8px">
          <div style="font-size:10px;color:var(--rose);font-weight:600;margin-bottom:6px">📍 ${escapeHtml(a.espaco)} · ${a.data}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div style="background:var(--bg-surface);border-radius:4px;padding:7px 9px">
              <div style="font-size:11px;font-weight:600;color:var(--tx1)">${escapeHtml(a.titulo)}</div>
              <div style="font-size:10px;color:var(--tx3)">${a.hora_inicio||"—"} → ${a.hora_fim||"—"}</div>
              <div style="font-size:10px;color:var(--tx3)">${escapeHtml(a.organizador||"—")}</div>
            </div>
            <div style="background:var(--bg-surface);border-radius:4px;padding:7px 9px">
              <div style="font-size:11px;font-weight:600;color:var(--tx1)">${escapeHtml(b.titulo)}</div>
              <div style="font-size:10px;color:var(--tx3)">${b.hora_inicio||"—"} → ${b.hora_fim||"—"}</div>
              <div style="font-size:10px;color:var(--tx3)">${escapeHtml(b.organizador||"—")}</div>
            </div>
          </div>
        </div>`).join("")}`;
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose)">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

async function carregarHistorico() {
  const el = document.getElementById("ag-hist-list");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Carregando...</div>`;
  try {
    _agendaCache = null;
    const rows = await getAgenda();
    const hoje = new Date().toISOString().split("T")[0];
    const passados = rows.filter(r => r.data < hoje).sort((a,b) => b.data.localeCompare(a.data)||(b.hora_inicio||"").localeCompare(a.hora_inicio||""));
    renderModuloList(passados, "AGENDA", "ag-hist-list");
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose)">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

async function carregarConfigAgenda() {
  try {
    const rows = await getAgenda();
    // Organizadores únicos
    const orgs = [...new Set(rows.map(r=>r.organizador).filter(Boolean))].sort();
    const orEl = document.getElementById("ag-config-orgs");
    if (orEl) orEl.innerHTML = orgs.map(o=>`
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd1)">
        <span style="font-size:11.5px;color:var(--tx1)">${escapeHtml(o)}</span>
        <span style="font-size:10px;color:var(--tx3);font-family:var(--mono)">${rows.filter(r=>r.organizador===o).length} eventos</span>
      </div>`).join("");
  } catch(e) { console.warn("Config agenda:", e.message); }
  await carregarGerenciamentoEspacos();
}

async function carregarGerenciamentoEspacos() {
  const el = document.getElementById("ag-config-espacos");
  if (!el) return;
  el.innerHTML = `<div style="font-size:11px;color:var(--tx3)">Carregando espaços...</div>`;
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/espacos?order=ordem.asc`, { headers: apiHeaders() });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();

    if (!rows.length) {
      el.innerHTML = `<div style="font-size:11.5px;color:var(--tx3);text-align:center;padding:20px">Nenhum espaço cadastrado. Execute a migration <strong>espacos-config.sql</strong> no Supabase.</div>`;
      return;
    }

    const grupos = {};
    rows.forEach(r => {
      if (!grupos[r.grupo]) grupos[r.grupo] = [];
      grupos[r.grupo].push(r);
    });

    const publicos  = rows.filter(r => r.disponivel_publico && r.ativo).length;
    const restritos = rows.filter(r => !r.disponivel_publico && r.ativo).length;

    let html = `
      <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">
        <div style="padding:6px 14px;border-radius:20px;background:rgba(58,170,92,.1);border:1px solid rgba(58,170,92,.3);font-size:11px;font-weight:700;color:var(--gr)">✓ ${publicos} disponíveis ao público</div>
        <div style="padding:6px 14px;border-radius:20px;background:rgba(74,156,245,.1);border:1px solid rgba(74,156,245,.25);font-size:11px;font-weight:700;color:var(--sky)">${restritos} uso interno</div>
      </div>`;

    Object.entries(grupos).forEach(([grupo, itens]) => {
      html += `<div style="font-size:9.5px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.08em;padding:12px 0 6px;border-top:1px solid var(--bd1);margin-top:4px">${escapeHtml(grupo)}</div>`;
      itens.forEach(r => {
        const pub = r.disponivel_publico && r.ativo;
        html += `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:8px;margin-bottom:4px;background:${pub ? 'rgba(58,170,92,.06)' : 'var(--bg-surface)'}">
            <span style="font-size:12px;color:var(--tx1)">${escapeHtml(r.nome)}</span>
            <button
              onclick="agToggleEspacoPublico('${r.id}', ${!r.disponivel_publico})"
              style="padding:4px 12px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid ${pub ? 'rgba(58,170,92,.4)' : 'var(--bd2)'};background:${pub ? 'rgba(58,170,92,.12)' : 'var(--bg-card)'};color:${pub ? 'var(--gr)' : 'var(--tx3)'};white-space:nowrap">
              ${pub ? '✓ Público' : 'Interno'}
            </button>
          </div>`;
      });
    });

    el.innerHTML = html;
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

async function agToggleEspacoPublico(id, novoValor) {
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/espacos?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ disponivel_publico: novoValor }),
    });
    if (!res.ok) throw new Error(await res.text());
    carregarGerenciamentoEspacos();
  } catch(e) { T("Erro", e.message); }
}

async function agVerificarOcupacao() {
  const el = document.getElementById("ag-mapa-ocupacao");
  if (!el) return;

  const di = document.getElementById("ag-disp-di")?.value;
  const hi = document.getElementById("ag-disp-hi")?.value;
  const df = document.getElementById("ag-disp-df")?.value;
  const hf = document.getElementById("ag-disp-hf")?.value;

  if (!di || !hi) { el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px">Informe ao menos data e hora de início.</div>`; return; }

  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Verificando...</div>`;
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/rpc/espacos_disponibilidade_admin`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_data_inicio: di, p_hora_inicio: hi, p_data_fim: df || di, p_hora_fim: hf || null }),
    });
    if (!res.ok) throw new Error(await res.text());
    const dados = await res.json();

    const livres   = dados.filter(d => d.disponivel);
    const ocupados = dados.filter(d => !d.disponivel);

    const fmtH = h => h ? String(h).slice(0,5) : "—";
    const fmtD = d => { if(!d) return ""; const [y,m,dia]=d.split("-"); return `${dia}/${m}/${y}`; };

    let html = `<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <span style="padding:4px 12px;border-radius:20px;background:rgba(58,170,92,.1);border:1px solid rgba(58,170,92,.3);font-size:11px;font-weight:700;color:var(--gr)">✓ ${livres.length} livre${livres.length!==1?"s":""}</span>
      <span style="padding:4px 12px;border-radius:20px;background:rgba(224,85,85,.09);border:1px solid rgba(224,85,85,.25);font-size:11px;font-weight:700;color:var(--rose)">🔒 ${ocupados.length} ocupado${ocupados.length!==1?"s":""}</span>
    </div>`;

    if (ocupados.length) {
      html += `<div style="font-size:10px;font-weight:700;color:var(--rose);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Espaços ocupados</div>`;
      ocupados.forEach(d => {
        const c = d.conflito || {};
        html += `<div style="padding:10px 14px;border-radius:8px;border:1px solid rgba(224,85,85,.2);background:rgba(224,85,85,.05);margin-bottom:6px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
            <span style="font-size:12px;font-weight:700;color:var(--tx1)">🔒 ${escapeHtml(d.nome)}</span>
            ${c.status ? `<span style="font-size:9.5px;padding:2px 8px;border-radius:6px;background:rgba(214,148,0,.15);color:#8A6010;font-weight:700">${c.status.replace(/_/g," ")}</span>` : ""}
          </div>
          ${c.titulo ? `<div style="font-size:11.5px;color:var(--tx2);margin-top:5px">${escapeHtml(c.titulo)}</div>` : ""}
          <div style="font-size:10.5px;color:var(--tx3);margin-top:4px;display:flex;gap:10px;flex-wrap:wrap">
            ${c.data ? `<span>📅 ${fmtD(c.data)}${c.data_encerramento&&c.data_encerramento!==c.data?" → "+fmtD(c.data_encerramento):""}</span>` : ""}
            ${c.hora_inicio ? `<span>🕐 ${fmtH(c.hora_inicio)}${c.hora_fim?" → "+fmtH(c.hora_fim):""}</span>` : ""}
            ${c.organizador ? `<span>👤 ${escapeHtml(c.organizador)}</span>` : ""}
            ${c.solicitante ? `<span>📋 ${escapeHtml(c.solicitante)}</span>` : ""}
          </div>
        </div>`;
      });
    }

    if (livres.length) {
      html += `<div style="font-size:10px;font-weight:700;color:var(--gr);text-transform:uppercase;letter-spacing:.07em;margin:12px 0 8px">Espaços disponíveis</div>`;
      html += `<div style="display:flex;flex-wrap:wrap;gap:6px">${livres.map(d =>
        `<span style="padding:5px 12px;border-radius:20px;background:rgba(58,170,92,.09);border:1px solid rgba(58,170,92,.25);font-size:11.5px;color:var(--gr)">✓ ${escapeHtml(d.nome)}</span>`
      ).join("")}</div>`;
    }

    el.innerHTML = html;
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

window.agVerificarOcupacao          = agVerificarOcupacao;
window.carregarGerenciamentoEspacos = carregarGerenciamentoEspacos;
window.agToggleEspacoPublico        = agToggleEspacoPublico;
window.carregarSolicitacoesAgenda   = carregarSolicitacoesAgenda;
window.agAnalisarSolicitacao        = agAnalisarSolicitacao;
window.agSolicitarAjuste            = agSolicitarAjuste;
window.agConfirmarAjuste            = agConfirmarAjuste;
// legado (demandas)
window.agEmAnalise                = agEmAnalise;
window.agRecusarSolicitacao       = agRecusarSolicitacao;
window.agAprovarSolicitacao       = agAprovarSolicitacao;
window.agConfirmarAprovacao       = agConfirmarAprovacao;

/* ── Aprovações com suporte a entradas do módulo Eventos ──── */

async function agCarregarAprovacoes() {
  const el = document.getElementById("ag-aprov-list");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Carregando...</div>`;
  try {
    const [res, resReq] = await Promise.all([
      fetch(`${apiBaseUrl()}/rest/v1/agenda?deleted_at=is.null&status=in.(pendente,aguardando_aprovacao,em_analise)&select=*&order=created_at.desc&limit=200`, { headers: apiHeaders() }),
      fetch(`${apiBaseUrl()}/rest/v1/requisicoes_espaco?deleted_at=is.null&select=*&order=created_at.desc&limit=200`, { headers: apiHeaders() }),
    ]);
    if (!res.ok) throw new Error(await res.text());
    const rows    = await res.json();
    const reqRows = resReq.ok ? await resReq.json() : [];
    const reqPend = reqRows.filter(r => !REQ_FINAL.includes(r.status));

    if (!rows.length && !reqPend.length) {
      el.innerHTML = `<div style="text-align:center;padding:36px;color:var(--tx3)">
        <div style="font-size:28px;margin-bottom:8px">✅</div>
        <div style="font-size:12px;font-weight:600">Nenhuma aprovação pendente</div>
      </div>`;
      return;
    }

    const fmtD = d => {
      if (!d) return "—";
      const [y, m, dia] = String(d).slice(0, 10).split("-");
      return `${dia}/${m}/${y}`;
    };

    const deEvento = rows.filter(r => r.origem === "evento");
    const manuais  = rows.filter(r => r.origem !== "evento");

    const thR = `text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)`;

    let html = reqPend.length ? `
      <div style="margin-bottom:20px;border:1px solid rgba(249,115,22,.35);border-radius:10px;overflow:hidden">
        <div style="background:rgba(249,115,22,.08);padding:10px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(249,115,22,.25)">
          <span style="font-size:15px">📨</span>
          <span style="font-size:11.5px;font-weight:700;color:var(--orange)">Requisições de Espaço Ocupado</span>
          <span style="font-size:10px;color:var(--tx3);margin-left:auto">${reqPend.length} pendente${reqPend.length !== 1 ? "s" : ""}</span>
        </div>
        <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:11.5px;min-width:780px">
          <thead><tr style="border-bottom:1px solid rgba(249,115,22,.2);background:rgba(249,115,22,.04)">
            <th style="${thR}">Protocolo</th>
            <th style="${thR}">Título</th>
            <th style="${thR}">Solicitante</th>
            <th style="${thR}">Espaço / Data</th>
            <th style="${thR}">Status</th>
            <th style="text-align:right;padding:7px 10px;font-size:9.5px;color:var(--tx3)">Ações</th>
          </tr></thead>
          <tbody>${reqPend.map(r => {
            const h = t => { const [hh,mm] = (t||"").split(":"); return hh && mm ? `${hh}:${mm}` : ""; };
            const horario = [h(r.hora_inicio_sol), h(r.hora_fim_sol)].filter(Boolean).join("–");
            return `<tr style="border-bottom:1px solid rgba(249,115,22,.12)" onmouseover="this.style.background='rgba(249,115,22,.04)'" onmouseout="this.style.background=''">
              <td style="padding:8px 10px;font-family:var(--mono);font-size:10px;color:var(--orange)">${escapeHtml(r.protocolo||"—")}</td>
              <td style="padding:8px 10px;color:var(--tx1);font-weight:600;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.titulo||"—")}</td>
              <td style="padding:8px 10px;color:var(--tx2);font-size:11px">${escapeHtml(r.solicitante_nome||"—")}</td>
              <td style="padding:8px 10px;color:var(--tx2);font-size:11px;white-space:nowrap">
                ${escapeHtml(r.espaco_nome||"—")}
                <div style="font-size:10px;color:var(--tx3)">${fmtD(r.data_solicitada)}${horario ? " · "+horario : ""}</div>
              </td>
              <td style="padding:8px 10px">${_agReqPill(r.status)}</td>
              <td style="padding:8px 10px;text-align:right;white-space:nowrap">
                <button onclick='agAnalisarRequisicao("${r.id}")' style="padding:5px 12px;border-radius:5px;border:1px solid rgba(249,115,22,.4);background:rgba(249,115,22,.08);color:var(--orange);font-size:10px;font-weight:600;cursor:pointer">Analisar</button>
              </td>
            </tr>`;
          }).join("")}</tbody>
        </table></div>
      </div>` : "";

    if (deEvento.length) {
      html += `<div style="font-size:10px;font-weight:700;color:var(--sky);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Do Módulo Eventos — ${deEvento.length} pendente${deEvento.length !== 1 ? "s" : ""}</div>`;
      html += deEvento.map(r => `
        <div style="background:var(--bg-card);border:1px solid rgba(74,156,245,.25);border-radius:10px;padding:16px 18px;margin-bottom:10px">
          <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <div style="font-size:13.5px;font-weight:700;color:var(--tx1)">${escapeHtml(r.titulo || "—")}</div>
              <div style="font-size:11px;color:var(--tx3);margin-top:5px;display:flex;gap:10px;flex-wrap:wrap">
                <span>📅 ${fmtD(r.data)}${r.hora_inicio ? " · " + String(r.hora_inicio).slice(0,5) : ""}</span>
                ${r.espaco ? `<span>📍 ${escapeHtml(r.espaco)}</span>` : ""}
                ${r.organizador ? `<span>🏛 ${escapeHtml(r.organizador)}</span>` : ""}
              </div>
              ${r.descricao ? `<div style="font-size:11px;color:var(--tx2);margin-top:6px;white-space:pre-wrap">${escapeHtml(r.descricao.slice(0, 140))}${r.descricao.length > 140 ? "…" : ""}</div>` : ""}
            </div>
            <div style="display:flex;gap:6px;align-self:flex-start;flex-shrink:0">
              <button onclick="agAprovarEntrada('${r.id}','${r.evento_id || ''}')" style="padding:7px 16px;border-radius:7px;border:1px solid rgba(58,170,92,.35);background:rgba(58,170,92,.12);color:var(--gr);font-size:12px;font-weight:700;cursor:pointer">✓ Aprovar</button>
              <button onclick="agRejeitarEntrada('${r.id}','${r.evento_id || ''}')" style="padding:7px 14px;border-radius:7px;border:1px solid rgba(224,85,85,.3);background:rgba(224,85,85,.08);color:var(--rose);font-size:12px;font-weight:700;cursor:pointer">✕ Rejeitar</button>
            </div>
          </div>
        </div>`).join("");
    }

    // Separa solicitações públicas (com protocolo) das manuais (sem protocolo)
    const solPublicas = manuais.filter(r => r.protocolo || r.origem_sol === "link_publico" || r.origem === "solicitacao");
    const solManuais  = manuais.filter(r => !r.protocolo && r.origem_sol !== "link_publico" && r.origem !== "solicitacao");

    if (solPublicas.length) {
      if (deEvento.length) html += `<div style="margin-top:20px;margin-bottom:12px;border-top:1px solid var(--bd2);padding-top:16px"></div>`;
      html += `<div style="font-size:10px;font-weight:700;color:#8A6010;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">📋 Solicitações Públicas — ${solPublicas.length} aguardando</div>`;
      html += solPublicas.map(r => `
        <div style="background:var(--bg-card);border:1.5px solid rgba(214,148,0,.35);border-left:4px solid #D49000;border-radius:10px;padding:14px 16px;margin-bottom:10px">
          <div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap">
            <div style="flex:1;min-width:180px">
              <div style="font-size:13px;font-weight:700;color:var(--tx1)">${escapeHtml(r.titulo || "—")}</div>
              <div style="font-size:11px;color:var(--tx3);margin-top:4px;display:flex;gap:10px;flex-wrap:wrap">
                <span>📅 ${fmtD(r.data)}${r.hora_inicio ? " · " + String(r.hora_inicio).slice(0,5) + (r.hora_fim ? " → " + String(r.hora_fim).slice(0,5) : "") : ""}</span>
                ${r.espaco   ? `<span>📍 ${escapeHtml(r.espaco)}</span>` : ""}
                ${r.solicitante_txt  ? `<span>👤 ${escapeHtml(r.solicitante_txt)}</span>` : ""}
                ${r.solicitante_tel  ? `<span>📞 ${escapeHtml(r.solicitante_tel)}</span>` : ""}
              </div>
              ${r.protocolo ? `<div style="margin-top:5px"><span style="font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:6px;background:rgba(214,148,0,.15);color:#8A6010;font-family:monospace">${r.protocolo}</span></div>` : ""}
              ${r.status === "em_analise" ? `<div style="margin-top:5px"><span style="font-size:9.5px;padding:2px 7px;border-radius:6px;background:rgba(74,156,245,.12);color:var(--sky);font-weight:700">Em análise</span></div>` : ""}
            </div>
            <div style="display:flex;gap:6px;align-self:flex-start;flex-shrink:0;flex-wrap:wrap">
              ${r.status !== "em_analise" ? `<button onclick="agMarcarEmAnalise('${r.id}')" style="padding:5px 11px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--sky);font-size:10px;font-weight:700;cursor:pointer">Em análise</button>` : ""}
              <button onclick="agAprovarAgendamento('${r.id}')" style="padding:5px 12px;border-radius:6px;border:1px solid rgba(58,170,92,.35);background:rgba(58,170,92,.1);color:var(--gr);font-size:10px;font-weight:700;cursor:pointer">✓ Aprovar</button>
              <button onclick="agRejeitarAgendamento('${r.id}')" style="padding:5px 11px;border-radius:6px;border:1px solid rgba(224,85,85,.3);background:rgba(224,85,85,.08);color:var(--rose);font-size:10px;font-weight:700;cursor:pointer">✕ Recusar</button>
            </div>
          </div>
        </div>`).join("");
    }

    if (solManuais.length) {
      if (deEvento.length || solPublicas.length) html += `<div style="margin-top:20px;margin-bottom:10px;border-top:1px solid var(--bd2);padding-top:16px"></div>`;
      html += `<div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Pendentes Internos — ${solManuais.length}</div>`;
      html += `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11.5px">
        <thead><tr style="border-bottom:1px solid var(--bd2);background:var(--bg-surface)">
          <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Título</th>
          <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Data</th>
          <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Espaço</th>
          <th style="text-align:right;padding:7px 10px"></th>
        </tr></thead>
        <tbody>${solManuais.map(r => `<tr style="border-bottom:1px solid var(--bd1)">
          <td style="padding:8px 10px;color:var(--tx1);font-weight:600">${escapeHtml(r.titulo || "—")}</td>
          <td style="padding:8px 10px;color:var(--tx2);white-space:nowrap">${fmtD(r.data)}</td>
          <td style="padding:8px 10px;color:var(--tx2)">${escapeHtml(r.espaco || "—")}</td>
          <td style="padding:8px 10px;text-align:right">
            <button onclick='agAprovarSolicitacao(${safeJsonForHtml(r)})' style="background:rgba(58,170,92,.1);border:1px solid rgba(58,170,92,.35);border-radius:4px;color:var(--gr);font-size:10px;font-weight:700;padding:3px 7px;cursor:pointer;margin-right:3px">✓ Aprovar</button>
            <button onclick='agRecusarSolicitacao("${r.id}")' style="background:rgba(224,85,85,.08);border:1px solid rgba(224,85,85,.3);border-radius:4px;color:var(--rose);font-size:10px;font-weight:700;padding:3px 7px;cursor:pointer">✕ Recusar</button>
          </td>
        </tr>`).join("")}</tbody>
      </table></div>`;
    }

    el.innerHTML = html;
  } catch (e) {
    const msg = e.message || "";
    if (msg.includes("JWT expired") || msg.includes("PGRST303")) {
      try {
        const { data } = await getSupabase().auth.refreshSession();
        if (data?.session?.access_token) window._sipenFreshToken = data.session.access_token;
        await agCarregarAprovacoes();
        return;
      } catch (_) {}
    }
    el.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

async function agAprovarEntrada(agendaId, eventoId) {
  const nome = typeof USUARIO_ATUAL !== "undefined" ? (USUARIO_ATUAL?.nome || "Sistema") : "Sistema";
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${agendaId}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({
        status:             "confirmado",
        aprovado_por_nome:  nome,
        aprovado_em:        new Date().toISOString(),
        motivo_rejeicao:    null,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    _agendaCache = null;
    T("Evento aprovado!", "Aparecerá na Agenda geral para todos os usuários.");
    agCarregarAprovacoes();
  } catch (e) { T("Erro ao aprovar", e.message); }
}

function agRejeitarEntrada(agendaId, eventoId) {
  let modal = document.getElementById("ag-rejeitar-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "ag-rejeitar-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:340;display:flex;align-items:center;justify-content:center";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="width:min(440px,94vw);background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;padding:24px;box-shadow:0 8px 40px rgba(0,0,0,.3)">
      <div style="font-size:15px;font-weight:700;color:var(--tx1);margin-bottom:16px">Rejeitar solicitação</div>
      <label style="font-size:9.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em">Motivo da rejeição</label>
      <textarea id="ag-rejeitar-motivo" rows="3" placeholder="Descreva o motivo para o organizador do evento..." style="width:100%;margin-top:6px;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input);color:var(--tx1);font-size:12.5px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box"></textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
        <button onclick="document.getElementById('ag-rejeitar-modal')?.remove()" style="padding:8px 16px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12.5px;cursor:pointer">Cancelar</button>
        <button onclick="agConfirmarRejeicao('${agendaId}','${eventoId}')" style="padding:8px 18px;border-radius:7px;border:none;background:var(--rose);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">Rejeitar</button>
      </div>
    </div>`;
}

async function agConfirmarRejeicao(agendaId, eventoId) {
  const motivo = document.getElementById("ag-rejeitar-motivo")?.value?.trim() || null;
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${agendaId}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({
        status:            "cancelado",
        motivo_rejeicao:   motivo,
        aprovado_por_nome: null,
        aprovado_em:       null,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    document.getElementById("ag-rejeitar-modal")?.remove();
    _agendaCache = null;
    T("Solicitação rejeitada.", motivo ? `Motivo registrado.` : "Sem motivo registrado.");
    agCarregarAprovacoes();
  } catch (e) { T("Erro ao rejeitar", e.message); }
}

async function agMarcarEmAnalise(id) {
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ status: "em_analise" }),
    });
    if (!res.ok) throw new Error(await res.text());
    agCarregarAprovacoes();
  } catch (e) { T("Erro", e.message); }
}

async function _comSyncStatus(agendaId, acao, motivo) {
  try {
    const sol = await fetch(
      `${apiBaseUrl()}/rest/v1/com_solicitacoes_arte?agenda_id=eq.${agendaId}&status=not.in.(Cancelada,Concluída,Programação não aprovada)&select=id,status&limit=10`,
      { headers: apiHeaders() }
    );
    if (!sol.ok) return;
    const rows = await sol.json();

    for (const r of rows) {
      let novoStatus = null;
      let texto = "";

      if (acao === "aprovar") {
        novoStatus = "Aprovada para produção";
        texto = "Programação aprovada pela Administração. Produção liberada.";
      } else if (acao === "recusar") {
        novoStatus = "Programação não aprovada";
        texto = `Programação recusada pela Administração. Produção bloqueada.${motivo ? "\nMotivo: " + motivo : ""}`;
      } else if (acao === "ajuste") {
        texto = `Ajuste solicitado na programação pela Administração.${motivo ? "\nDetalhe: " + motivo : ""} Verifique se datas, horários ou local foram alterados.`;
      }

      if (novoStatus) {
        await fetch(`${apiBaseUrl()}/rest/v1/com_solicitacoes_arte?id=eq.${r.id}`, {
          method: "PATCH",
          headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
          body: JSON.stringify({ status: novoStatus, atualizado_em: new Date().toISOString() }),
        });
      }
      if (texto) {
        await fetch(`${apiBaseUrl()}/rest/v1/com_andamentos`, {
          method: "POST",
          headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
          body: JSON.stringify({ sol_id: r.id, texto, automatico: true, criado_em: new Date().toISOString() }),
        });
      }
    }
  } catch (_) {}
}

async function agAprovarAgendamento(id) {
  const aprovador = typeof USUARIO_ATUAL !== "undefined" ? (USUARIO_ATUAL?.nome || "Administrador") : "Administrador";
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/rpc/aprovar_agendamento`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_agenda_id: id, p_aprovador: aprovador }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (!data.ok) throw new Error(data.erro || "Erro ao aprovar");

    _agendaCache = null;
    T("Agendamento aprovado!", data.protocolo ? `Protocolo ${data.protocolo} confirmado.` : "Reserva confirmada na agenda.");

    if (data.telefone && typeof WA !== "undefined") {
      const fmtData = d => {
        if (!d) return "";
        const [y, m, dia] = String(d).slice(0, 10).split("-");
        return `${dia}/${m}/${y}`;
      };
      const horario = data.hora_inicio
        ? String(data.hora_inicio).slice(0, 5) + (data.hora_fim ? ` → ${String(data.hora_fim).slice(0, 5)}` : "")
        : "";
      const termoLink = data.token_termo ? `\n\n📄 *Termo de Compromisso:*\nhttps://sipen.com.br/termo?t=${data.token_termo}\n\n_Por favor, acesse o link acima, leia e assine o Termo de Compromisso e Responsabilidade para confirmar o uso do espaço._` : "";
      const msg = `Olá${data.solicitante ? `, ${data.solicitante.split(" ")[0]}` : ""}! Seu pedido de agendamento foi *aprovado* ✅\n\n`
        + `📋 *${data.titulo || "Agendamento"}*\n`
        + (fmtData(data.data) ? `📅 ${fmtData(data.data)}${horario ? " · " + horario : ""}\n` : "")
        + (data.espaco ? `📍 ${data.espaco}\n` : "")
        + (data.protocolo ? `🔖 Protocolo: ${data.protocolo}\n` : "")
        + termoLink
        + `\nQualquer dúvida, entre em contato com a secretaria.`;
      WA.send({
        para:        data.telefone,
        nome:        data.solicitante || "Solicitante",
        mensagem:    msg,
        modulo:      "AGENDA",
        referenciaT: "agenda",
        referenciaId: id,
        chave:       `AG_APROV_${id}`,
      }).catch(() => {});
    }

    // Notifica comunicação sobre aprovação
    _comSyncStatus(id, "aprovar");
    _syncDemandaStatus(id, "CONCLUIDA");
    agCarregarAprovacoes();
  } catch (e) { T("Erro ao aprovar", e.message); }
}

function agRejeitarAgendamento(id) {
  let modal = document.getElementById("ag-rejeitar-sol-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "ag-rejeitar-sol-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:340;display:flex;align-items:center;justify-content:center";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="width:min(440px,94vw);background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;padding:24px;box-shadow:0 8px 40px rgba(0,0,0,.3)">
      <div style="font-size:15px;font-weight:700;color:var(--tx1);margin-bottom:6px">Recusar solicitação</div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:16px">O solicitante receberá uma notificação via WhatsApp se houver número cadastrado.</div>
      <label style="font-size:9.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em">Motivo da recusa</label>
      <textarea id="ag-rejeitar-sol-motivo" rows="3" placeholder="Ex.: Espaço já reservado, Conflito de horário, Data indisponível..." style="width:100%;margin-top:6px;padding:8px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-input);color:var(--tx1);font-size:12.5px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box"></textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
        <button onclick="document.getElementById('ag-rejeitar-sol-modal')?.remove()" style="padding:8px 16px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12.5px;cursor:pointer">Cancelar</button>
        <button onclick="agConfirmarRecusaAgendamento('${id}')" style="padding:8px 18px;border-radius:7px;border:none;background:var(--rose);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">Recusar</button>
      </div>
    </div>`;
}

async function agConfirmarRecusaAgendamento(id) {
  const motivo   = document.getElementById("ag-rejeitar-sol-motivo")?.value?.trim() || "Indisponibilidade de espaço ou horário";
  const aprovador = typeof USUARIO_ATUAL !== "undefined" ? (USUARIO_ATUAL?.nome || "Administrador") : "Administrador";
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/rpc/recusar_agendamento`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_agenda_id: id, p_motivo: motivo, p_aprovador: aprovador }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (!data.ok) throw new Error(data.erro || "Erro ao recusar");

    document.getElementById("ag-rejeitar-sol-modal")?.remove();
    _agendaCache = null;
    T("Solicitação recusada.", motivo ? `Motivo registrado.` : "");

    // Cancela solicitações de arte vinculadas
    _comSyncStatus(id, "recusar", motivo);

    if (data.telefone && typeof WA !== "undefined") {
      const msg = `Olá${data.solicitante ? `, ${data.solicitante.split(" ")[0]}` : ""}! Infelizmente seu pedido de agendamento *não foi aprovado*.\n\n`
        + (data.protocolo ? `🔖 Protocolo: ${data.protocolo}\n` : "")
        + (data.titulo ? `📋 ${data.titulo}\n` : "")
        + `\n❌ *Motivo:* ${motivo}\n\nPara mais informações, entre em contato com a secretaria.`;
      WA.send({
        para:        data.telefone,
        nome:        data.solicitante || "Solicitante",
        mensagem:    msg,
        modulo:      "AGENDA",
        referenciaT: "agenda",
        referenciaId: id,
        chave:       `AG_RECUS_${id}`,
      }).catch(() => {});
    }

    _syncDemandaStatus(id, "CANCELADA");
    agCarregarAprovacoes();
  } catch (e) { T("Erro ao recusar", e.message); }
}

async function _syncDemandaStatus(agendaId, status) {
  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/demandas?agenda_ref_id=eq.${agendaId}&select=id&limit=1`,
      { headers: apiHeaders() }
    );
    const rows = await res.json();
    if (!rows?.length) return;
    await fetch(`${apiBaseUrl()}/rest/v1/demandas?id=eq.${rows[0].id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  } catch(_) {}
}

// ── Confirmados com badge de status do Termo ───────────────────
let _agConfRows = [];

async function agCarregarConfirmados() {
  const el = document.getElementById("ag-conf-list");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${typeof spinner==="function"?spinner():"⏳"} Carregando...</div>`;
  try {
    const url = `${apiBaseUrl()}/rest/v1/agenda?status=eq.confirmado&deleted_at=is.null&order=data.desc&select=id,titulo,data,hora_inicio,hora_fim,espaco,solicitante_txt,protocolo,aprovado_por_nome,aprovado_em,status_termo,token_termo,visibilidade`;
    const res = await fetch(url, { headers: apiHeaders() });
    if (!res.ok) throw new Error(await res.text());
    _agConfRows = await res.json();
    _agRenderConfirmados();
  } catch(e) {
    const el2 = document.getElementById("ag-conf-list");
    if (el2) el2.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

function _agRenderConfirmados() {
  const el = document.getElementById("ag-conf-list");
  if (!el) return;
  const mesSel = (document.getElementById("ag-conf-mes-sel") || {}).value || "";
  const rows = mesSel ? _agConfRows.filter(r => r.data && r.data.slice(0,7) === mesSel) : _agConfRows;

  // meses disponíveis para o select
  const meses = [...new Set(_agConfRows.map(r => r.data ? r.data.slice(0,7) : "").filter(Boolean))].sort().reverse();
  const nomeMes = m => { const [y,mo] = m.split("-"); return ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][parseInt(mo)-1] + " " + y; };

  if (!_agConfRows.length) {
    el.innerHTML = `<div style="text-align:center;padding:32px 0;color:var(--tx3)"><div style="font-size:28px;margin-bottom:8px">📭</div><div style="font-size:12px">Nenhum agendamento confirmado</div></div>`;
    return;
  }

  const termoBadge = st => {
    if (st === "aceito")     return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:9.5px;font-weight:700;background:rgba(42,158,82,.12);color:var(--gr);border:1px solid rgba(42,158,82,.3)">✅ Termo aceito</span>`;
    if (st === "aguardando") return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:9.5px;font-weight:700;background:rgba(176,125,16,.10);color:#b07d10;border:1px solid rgba(176,125,16,.25)">⏳ Aguardando termo</span>`;
    return `<span style="padding:2px 8px;border-radius:12px;font-size:9.5px;background:var(--bg-surface);color:var(--tx3);border:1px solid var(--bd1)">—</span>`;
  };
  const fmtD = d => { if(!d)return"—"; const[y,m,dia]=String(d).slice(0,10).split("-"); return`${dia}/${m}/${y}`; };
  const fmtH = h => h ? String(h).slice(0,5) : "";

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap">
      <div style="font-size:10px;color:var(--tx3)">${rows.length} de ${_agConfRows.length} confirmado${_agConfRows.length!==1?"s":""}</div>
      <select id="ag-conf-mes-sel" onchange="_agRenderConfirmados()" style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:5px 10px;outline:none;cursor:pointer">
        <option value="">Todos os meses</option>
        ${meses.map(m => `<option value="${m}" ${m===mesSel?"selected":""}>${nomeMes(m)}</option>`).join("")}
      </select>
    </div>
    ${rows.length ? `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:11.5px">
        <thead>
          <tr style="background:var(--bg-surface);border-bottom:2px solid var(--teal)">
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Título</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Data</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Horário</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Espaço</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Responsável</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Visibilidade</th>
            <th style="text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx1);font-weight:700">Termo</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid var(--bd1);transition:background .1s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
              <td style="padding:8px 10px;color:var(--tx1);font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.titulo||"—")}</td>
              <td style="padding:8px 10px;color:var(--tx2);white-space:nowrap">${fmtD(r.data)}</td>
              <td style="padding:8px 10px;color:var(--tx2);white-space:nowrap">${fmtH(r.hora_inicio)}${r.hora_fim?" → "+fmtH(r.hora_fim):""}</td>
              <td style="padding:8px 10px;color:var(--tx2);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.espaco||"—")}</td>
              <td style="padding:8px 10px;color:var(--tx2);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.solicitante_txt||"—")}</td>
              <td style="padding:8px 10px">
                <span onclick="agToggleVisibilidade('${r.id}',this)" data-vis="${r.visibilidade||'publica'}"
                  style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:12px;font-size:9.5px;font-weight:700;cursor:pointer;transition:all .15s;${(r.visibilidade||'publica')==='interna'?"background:rgba(74,156,245,.12);color:var(--sky);border:1px solid rgba(74,156,245,.3)":"background:rgba(58,170,92,.1);color:var(--gr);border:1px solid rgba(58,170,92,.3)"}">
                  ${(r.visibilidade||'publica')==='interna'?"🔒 Interna":"🌐 Pública"}
                </span>
              </td>
              <td style="padding:8px 10px">${termoBadge(r.status_termo)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>` : `<div style="text-align:center;padding:24px 0;color:var(--tx3);font-size:12px">Nenhum evento neste mês.</div>`}`;
}
window._agRenderConfirmados = _agRenderConfirmados;

async function agToggleVisibilidade(id, el) {
  const atual = el.dataset.vis || "publica";
  const nova  = atual === "interna" ? "publica" : "interna";
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ visibilidade: nova }),
    });
    if (!res.ok) throw new Error(await res.text());
    el.dataset.vis = nova;
    el.textContent = nova === "interna" ? "🔒 Interna" : "🌐 Pública";
    el.style.background    = nova === "interna" ? "rgba(74,156,245,.12)" : "rgba(58,170,92,.1)";
    el.style.color         = nova === "interna" ? "var(--sky)"           : "var(--gr)";
    el.style.borderColor   = nova === "interna" ? "rgba(74,156,245,.3)"  : "rgba(58,170,92,.3)";
    const row = _agConfRows.find(r => r.id === id);
    if (row) row.visibilidade = nova;
  } catch(e) { T("Erro", e.message); }
}
window.agToggleVisibilidade = agToggleVisibilidade;

// ── Kebab menu de solicitação ──────────────────────────────────
function agSolKebab(btn, id) {
  document.querySelectorAll(".ag-kebab-menu").forEach(m => m.remove());
  const r = _agSolRows.find(x => x.id === id);
  const temTermo = r?.token_termo && (r?.solicitante_tel || r?.telefone);
  const menu = document.createElement("div");
  menu.className = "ag-kebab-menu";
  menu.style.cssText = "position:absolute;right:0;top:calc(100% + 4px);z-index:200;background:var(--bg-card);border:1px solid var(--bd2);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);min-width:180px;overflow:hidden";
  const rJson = JSON.stringify(r||{}).replace(/'/g,"&#39;");
  menu.innerHTML = `
    <button onclick='openCrudForm("AGENDA",JSON.parse(this.dataset.r))' data-r='${rJson}' style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;border:none;background:transparent;color:var(--tx1);font-size:12px;cursor:pointer;text-align:left" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'">
      ✏️ Editar
    </button>
    ${temTermo ? `
    <button onclick='agReenviarTermo("${id}")' style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;border:none;background:transparent;color:var(--tx1);font-size:12px;cursor:pointer;text-align:left" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'">
      📲 Reenviar Termo
    </button>` : ""}
    <div style="height:1px;background:var(--bd1);margin:0 10px"></div>
    <button onclick='agExcluirSolicitacao("${id}")' style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;border:none;background:transparent;color:var(--rose);font-size:12px;cursor:pointer;text-align:left" onmouseover="this.style.background='rgba(224,85,85,.08)'" onmouseout="this.style.background='transparent'">
      🗑 Excluir
    </button>`;
  btn.parentElement.appendChild(menu);
  const close = e => { if (!menu.contains(e.target) && e.target !== btn) { menu.remove(); document.removeEventListener("click", close); } };
  setTimeout(() => document.addEventListener("click", close), 0);
}

function agReenviarTermo(id) {
  document.querySelectorAll(".ag-kebab-menu").forEach(m => m.remove());
  const r = _agSolRows.find(x => x.id === id);
  const _tel = r?.solicitante_tel || r?.telefone;
  if (!r?.token_termo || !_tel) return T("Sem dados", "Telefone ou link do termo não disponível.");
  const nome  = (r.solicitante_txt || "").split(" ")[0] || "";
  const fmtD  = s => { if (!s) return ""; const [y,m,d] = String(s).slice(0,10).split("-"); return `${d}/${m}/${y}`; };
  const msg = `Olá${nome ? `, ${nome}` : ""}! Segue novamente o link do *Termo de Compromisso e Responsabilidade* referente ao seu agendamento:\n\n`
    + `📋 *${r.titulo || "Agendamento"}*\n`
    + (r.data ? `📅 ${fmtD(r.data)}\n` : "")
    + (r.espaco ? `📍 ${r.espaco}\n` : "")
    + (r.protocolo ? `🔖 Protocolo: ${r.protocolo}\n` : "")
    + `\n📄 *Termo de Compromisso:*\nhttps://sipen.com.br/termo?t=${r.token_termo}\n\n_Por favor, acesse o link acima, leia e assine para confirmar o uso do espaço._`;
  if (typeof WA !== "undefined") {
    WA.send({ para: _tel, nome: r.solicitante_txt || "Solicitante", mensagem: msg, modulo: "AGENDA", origem_id: id });
  } else {
    const tel = _tel.replace(/\D/g, "");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, "_blank");
  }
  T("Termo reenviado", `Link enviado para ${_tel}.`);
}

async function agExcluirSolicitacao(id) {
  document.querySelectorAll(".ag-kebab-menu").forEach(m => m.remove());
  const r = _agSolRows.find(x => x.id === id);
  const label = r?.titulo ? `"${r.titulo}"` : "esta solicitação";
  if (!confirm(`Excluir ${label}? Esta ação não pode ser desfeita.`)) return;
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/agenda?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(await res.text());
    _agSolRows = _agSolRows.filter(x => x.id !== id);
    _agKpiSol(_agSolRows);
    _agRenderSolTabela();
    T("Excluído", `${label} foi removida.`);
  } catch(e) { T("Erro ao excluir", e.message); }
}

window.agSolKebab                    = agSolKebab;
window.agReenviarTermo               = agReenviarTermo;
window.agExcluirSolicitacao          = agExcluirSolicitacao;
window.agCarregarAprovacoes          = agCarregarAprovacoes;
window.agAprovarEntrada              = agAprovarEntrada;
window.agRejeitarEntrada             = agRejeitarEntrada;
window.agConfirmarRejeicao           = agConfirmarRejeicao;
window.agMarcarEmAnalise             = agMarcarEmAnalise;
window.agAprovarAgendamento          = agAprovarAgendamento;
window.agRejeitarAgendamento         = agRejeitarAgendamento;
window.agConfirmarRecusaAgendamento  = agConfirmarRecusaAgendamento;
window._comSyncStatus                = _comSyncStatus;

// ═══════════════════════════════════════════════════════════════
// REQUISIÇÕES DE ESPAÇO OCUPADO
// ═══════════════════════════════════════════════════════════════

const REQ_STATUS = {
  AGUARDANDO_ANALISE:       { label: "Aguardando análise",   cor: "var(--orange)" },
  EM_ANALISE:               { label: "Em análise",           cor: "var(--sky)"    },
  SOLICITANDO_INFORMACOES:  { label: "Solicitando info.",    cor: "var(--amber)"  },
  NEGOCIACAO_NECESSARIA:    { label: "Em negociação",        cor: "var(--violet)" },
  ESPACO_LIBERADO:          { label: "Espaço liberado",      cor: "var(--gr)"     },
  ALTERNATIVA_OFERECIDA:    { label: "Alternativa oferecida",cor: "var(--teal)"   },
  REQUISICAO_NEGADA:        { label: "Negada",               cor: "var(--rose)"   },
  CANCELADA:                { label: "Cancelada",            cor: "var(--tx3)"    },
};
const REQ_FINAL = ["ESPACO_LIBERADO","ALTERNATIVA_OFERECIDA","REQUISICAO_NEGADA","CANCELADA"];

let _agReqFiltro = "";
let _agReqRows   = [];

function _agReqPill(status) {
  const cfg = REQ_STATUS[status] || { label: status || "—", cor: "var(--tx3)" };
  return `<span style="font-size:9.5px;padding:2px 9px;border-radius:10px;background:${cfg.cor}18;color:${cfg.cor};border:1px solid ${cfg.cor}33;font-weight:700;white-space:nowrap">${escapeHtml(cfg.label)}</span>`;
}

function _agKpiReq(rows) {
  const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  const pendentes = rows.filter(r => !REQ_FINAL.includes(r.status));
  s("req-aguard",  rows.filter(r => r.status === "AGUARDANDO_ANALISE").length);
  s("req-analise", rows.filter(r => r.status === "EM_ANALISE").length);
  s("req-negoc",   rows.filter(r => r.status === "NEGOCIACAO_NECESSARIA").length);
  s("req-total",   rows.length);
  // KPI do dashboard
  s("ag-req-pendentes", pendentes.length);
}

window.agFiltrarReqStatus = function(status) {
  _agReqFiltro = _agReqFiltro === status ? "" : status;
  _agRenderReqTabela();
};

function _agRenderReqTabela() {
  const el = document.getElementById("agenda-req-list");
  if (!el) return;
  const fmtD = d => { if (!d) return "—"; const [y,m,dia] = String(d).slice(0,10).split("-"); return `${dia}/${m}/${y}`; };
  const rows = _agReqFiltro
    ? _agReqRows.filter(r => r.status === _agReqFiltro)
    : _agReqRows;

  if (!rows.length) {
    el.innerHTML = `<div style="text-align:center;padding:36px;color:var(--tx3)">
      <div style="font-size:28px;margin-bottom:8px">📭</div>
      <div style="font-size:12px">Nenhuma requisição${_agReqFiltro ? " com esse status" : ""} encontrada.</div>
    </div>`;
    return;
  }

  el.innerHTML = `<div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:11.5px;min-width:820px">
      <thead><tr style="border-bottom:1px solid var(--bd2);background:var(--bg-surface)">
        <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Protocolo</th>
        <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Espaço / Data</th>
        <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Solicitante</th>
        <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Título</th>
        <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Status</th>
        <th style="text-align:right;padding:7px 10px;font-size:9.5px;color:var(--tx3)">Ações</th>
      </tr></thead>
      <tbody>${rows.map(r => {
        const ativa = !REQ_FINAL.includes(r.status);
        const h = t => { const [hh,mm] = (t||"").split(":"); return hh && mm ? `${hh}:${mm}` : ""; };
        const horario = [h(r.hora_inicio_sol), h(r.hora_fim_sol)].filter(Boolean).join("–") || "dia todo";
        return `<tr style="border-bottom:1px solid var(--bd1)" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
          <td style="padding:8px 10px;font-family:var(--mono);font-size:10px;color:var(--orange)">${escapeHtml(r.protocolo||"—")}</td>
          <td style="padding:8px 10px;color:var(--tx2);font-size:11px;white-space:nowrap">
            ${escapeHtml(r.espaco_nome||"—")}
            <div style="font-size:10px;color:var(--tx3)">${fmtD(r.data_solicitada)} · ${horario}</div>
          </td>
          <td style="padding:8px 10px;color:var(--tx2);font-size:11px">
            ${escapeHtml(r.solicitante_nome||"—")}
            ${r.solicitante_tel ? `<div style="font-size:10px;color:var(--tx3)">${escapeHtml(r.solicitante_tel)}</div>` : ""}
          </td>
          <td style="padding:8px 10px;color:var(--tx1);font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(r.titulo||'')}">${escapeHtml(r.titulo||"—")}</td>
          <td style="padding:8px 10px">${_agReqPill(r.status)}</td>
          <td style="padding:8px 10px;text-align:right;white-space:nowrap">
            <button onclick='agAnalisarRequisicao("${r.id}")' style="padding:3px 9px;border-radius:4px;border:1px solid var(--bd1);background:var(--bg-card);color:var(--tx2);font-size:10px;cursor:pointer">Analisar</button>
            ${ativa ? `<button onclick='agAtualizarRequisicao("${r.id}","REQUISICAO_NEGADA")' style="margin-left:4px;padding:3px 9px;border-radius:4px;border:1px solid rgba(224,85,85,.35);background:rgba(224,85,85,.08);color:var(--rose);font-size:10px;cursor:pointer">✕ Negar</button>` : ""}
          </td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>`;
}

async function carregarRequisicoesEspaco() {
  const el = document.getElementById("agenda-req-list");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Carregando...</div>`;
  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/requisicoes_espaco?deleted_at=is.null&select=*&order=created_at.desc&limit=300`,
      { headers: apiHeaders() }
    );
    if (!res.ok) throw new Error(await res.text());
    _agReqRows = await res.json();
    _agKpiReq(_agReqRows);
    _agRenderReqTabela();
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

async function agAnalisarRequisicao(id) {
  let r = _agReqRows.find(x => x.id === id);
  if (!r) {
    try {
      const res = await fetch(`${apiBaseUrl()}/rest/v1/requisicoes_espaco?id=eq.${id}&select=*&limit=1`, { headers: apiHeaders() });
      const data = await res.json();
      r = Array.isArray(data) ? data[0] : data;
    } catch(e) { T("Erro", e.message); return; }
  }
  if (!r) { T("Requisição não encontrada"); return; }

  const fmtD = d => { if (!d) return "—"; const [y,m,dia] = String(d).slice(0,10).split("-"); return `${dia}/${m}/${y}`; };
  const h = t => { const [hh,mm] = (t||"").split(":"); return hh && mm ? `${hh}:${mm}` : ""; };
  const horario = [h(r.hora_inicio_sol), h(r.hora_fim_sol)].filter(Boolean).join("–") || "dia todo";

  // Ocupações conflitantes
  let occsHtml = "";
  const occs = Array.isArray(r.ocupacoes_conflito) ? r.ocupacoes_conflito : [];
  if (occs.length) {
    occsHtml = `<div style="margin-top:6px">
      ${occs.map(o => {
        const hi = h(o.hora_inicio), hf = h(o.hora_fim);
        return `<div style="display:flex;gap:6px;align-items:center;font-size:11px;padding:4px 8px;background:rgba(224,85,85,.07);border-radius:5px;margin-bottom:4px">
          <span style="color:var(--rose);font-size:14px">●</span>
          <span style="color:var(--tx2)">${fmtD(o.data)}${hi ? ` · ${hi}${hf ? "–"+hf : ""}` : ""}</span>
        </div>`;
      }).join("")}
    </div>`;
  }

  const statusOpts = Object.entries(REQ_STATUS).map(([k,v]) =>
    `<option value="${k}" ${r.status === k ? "selected" : ""}>${v.label}</option>`
  ).join("");
  const final = REQ_FINAL.includes(r.status);

  const overlay = document.createElement("div");
  overlay.id = "ag-req-anal-overlay";
  overlay.style.cssText = "position:fixed;inset:0;z-index:9800;background:rgba(0,0,0,.52);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:16px";
  overlay.innerHTML = `
    <div style="background:var(--bg-card);border-radius:13px;max-width:640px;width:100%;max-height:92vh;overflow-y:auto;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;gap:10px;padding:18px 20px 14px;border-bottom:1px solid var(--bd1)">
        <div style="font-size:22px">📨</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:var(--tx1)">${escapeHtml(r.titulo||"—")}</div>
          <div style="font-size:10px;color:var(--orange);font-family:var(--mono)">${escapeHtml(r.protocolo||"")}</div>
        </div>
        ${_agReqPill(r.status)}
        <button onclick="document.getElementById('ag-req-anal-overlay').remove()" style="background:none;border:none;font-size:18px;color:var(--tx3);cursor:pointer;margin-left:4px">✕</button>
      </div>

      <div style="padding:18px 20px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <!-- Coluna esquerda: a nova requisição -->
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--orange);margin-bottom:10px">Nova requisição</div>
          <div style="font-size:11.5px;color:var(--tx2);line-height:1.8">
            <b style="color:var(--tx1)">Espaço:</b> ${escapeHtml(r.espaco_nome||"—")}<br>
            <b style="color:var(--tx1)">Data:</b> ${fmtD(r.data_solicitada)}<br>
            <b style="color:var(--tx1)">Horário:</b> ${horario}<br>
            <b style="color:var(--tx1)">Tipo:</b> ${escapeHtml(r.tipo_programacao||"—")}<br>
            <b style="color:var(--tx1)">Participantes:</b> ${r.participantes||"—"}<br>
            <b style="color:var(--tx1)">Solicitante:</b> ${escapeHtml(r.solicitante_nome||"—")}${r.solicitante_tel ? ` · ${escapeHtml(r.solicitante_tel)}` : ""}<br>
            <b style="color:var(--tx1)">Justificativa:</b><br>
            <span style="font-size:11px;color:var(--tx3)">${escapeHtml(r.justificativa||"—")}</span>
          </div>
          ${r.aceita_outro_espaco === "Sim" ? `<div style="margin-top:8px;font-size:11px;color:var(--teal)">✓ Aceita outro espaço${r.espacos_alternativos ? `: ${escapeHtml(r.espacos_alternativos)}` : ""}</div>` : ""}
          ${r.aceita_outro_horario === "Sim" ? `<div style="font-size:11px;color:var(--teal)">✓ Aceita outro horário${r.horarios_alternativos ? `: ${escapeHtml(r.horarios_alternativos)}` : ""}</div>` : ""}
        </div>

        <!-- Coluna direita: ocupações conflitantes -->
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--rose);margin-bottom:10px">Ocupações existentes</div>
          ${occsHtml || `<div style="font-size:11px;color:var(--tx3)">Nenhum dado de ocupação registrado.</div>`}
        </div>
      </div>

      ${!final ? `
      <div style="padding:0 20px 18px;border-top:1px solid var(--bd1);padding-top:14px;margin-top:2px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:10px">Decisão administrativa</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div>
            <label style="font-size:10px;color:var(--tx3)">Novo status</label>
            <select id="req-anal-status" style="width:100%;margin-top:4px;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:7px 10px;outline:none">${statusOpts}</select>
          </div>
          <div>
            <label style="font-size:10px;color:var(--tx3)">Espaço alternativo oferecido</label>
            <input id="req-anal-alt" type="text" value="${escapeHtml(r.espaco_alternativo_oferecido||"")}" placeholder="Opcional" style="width:100%;margin-top:4px;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:7px 10px;outline:none;box-sizing:border-box">
          </div>
        </div>
        <div style="margin-bottom:10px">
          <label style="font-size:10px;color:var(--tx3)">Justificativa / mensagem ao solicitante</label>
          <textarea id="req-anal-just" rows="3" placeholder="Descreva a decisão ou próximo passo..." style="width:100%;margin-top:4px;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:7px 10px;outline:none;resize:vertical;box-sizing:border-box">${escapeHtml(r.decisao_justificativa||"")}</textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button onclick="document.getElementById('ag-req-anal-overlay').remove()" style="padding:7px 16px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx2);font-size:12px;cursor:pointer">Fechar</button>
          <button onclick='agAprovarRequisicao("${r.id}")' style="padding:7px 18px;border-radius:7px;border:1px solid rgba(58,170,92,.4);background:rgba(58,170,92,.12);color:var(--gr);font-size:12px;font-weight:700;cursor:pointer">✓ Liberar Espaço</button>
          <button onclick='agConfirmarDecisaoReq("${r.id}")' style="padding:7px 18px;border-radius:7px;border:none;background:var(--orange);color:#fff;font-size:12px;font-weight:700;cursor:pointer">Salvar decisão</button>
        </div>
      </div>
      ` : `
      <div style="padding:14px 20px 18px;border-top:1px solid var(--bd1)">
        <div style="font-size:11px;color:var(--tx3)">Requisição encerrada. Decisão: <b>${escapeHtml(r.decisao||"—")}</b></div>
        ${r.decisao_justificativa ? `<div style="font-size:11px;color:var(--tx2);margin-top:4px">${escapeHtml(r.decisao_justificativa)}</div>` : ""}
        <div style="display:flex;justify-content:flex-end;margin-top:12px">
          <button onclick="document.getElementById('ag-req-anal-overlay').remove()" style="padding:7px 16px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx2);font-size:12px;cursor:pointer">Fechar</button>
        </div>
      </div>
      `}
    </div>`;

  document.body.appendChild(overlay);
}

async function agConfirmarDecisaoReq(id) {
  const status = document.getElementById("req-anal-status")?.value;
  const just   = document.getElementById("req-anal-just")?.value?.trim();
  const alt    = document.getElementById("req-anal-alt")?.value?.trim();
  if (!status) { T("Selecione um status"); return; }

  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/rpc/admin_atualizar_requisicao`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: id, p_status: status, p_justificativa: just||null, p_espaco_alt: alt||null })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.erro || "Erro ao salvar");
    document.getElementById("ag-req-anal-overlay")?.remove();
    T("Decisão registrada", `Status: ${REQ_STATUS[status]?.label || status}`);
    carregarRequisicoesEspaco();
  } catch(e) { T("Erro ao salvar", e.message); }
}

async function agAprovarRequisicao(id) {
  if (!confirm("Confirmar liberação do espaço para este solicitante?")) return;
  try {
    const just = document.getElementById("req-anal-just")?.value?.trim() || null;
    const alt  = document.getElementById("req-anal-alt")?.value?.trim()  || null;
    const res  = await fetch(`${apiBaseUrl()}/rest/v1/rpc/admin_atualizar_requisicao`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: id, p_status: "ESPACO_LIBERADO", p_justificativa: just, p_espaco_alt: alt })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.erro || "Erro ao aprovar");
    document.getElementById("ag-req-anal-overlay")?.remove();
    T("Espaço liberado", "Requisição aprovada com sucesso.");
    agCarregarAprovacoes();
  } catch(e) { T("Erro", e.message); }
}

async function agAtualizarRequisicao(id, status) {
  if (!confirm(`Confirmar status: ${REQ_STATUS[status]?.label || status}?`)) return;
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/rpc/admin_atualizar_requisicao`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: id, p_status: status })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.erro || "Erro");
    T("Status atualizado");
    carregarRequisicoesEspaco();
  } catch(e) { T("Erro", e.message); }
}

window.carregarRequisicoesEspaco  = carregarRequisicoesEspaco;
window.agAnalisarRequisicao       = agAnalisarRequisicao;
window.agFiltrarReqStatus         = agFiltrarReqStatus;
window.agConfirmarDecisaoReq      = agConfirmarDecisaoReq;
window.agAprovarRequisicao        = agAprovarRequisicao;
window.agAtualizarRequisicao      = agAtualizarRequisicao;
window.carregarAgendaDash         = carregarAgendaDash;
