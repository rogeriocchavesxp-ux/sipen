/* ── CACHE E DADOS DA AGENDA ─────────────────────────────────── */
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

/* ── DASHBOARD ───────────────────────────────────────────────── */
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

    const todasAnuais = rows.flatMap(r => agGerarOcorrencias(r, anoInicio, anoFim));
    const ocorrSemana = rows.flatMap(r => agGerarOcorrencias(r, hoje, prox7));
    const ocorrP30    = rows.flatMap(r => agGerarOcorrencias(r, hoje, prox30str));

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

    fetch(
      `${apiBaseUrl()}/rest/v1/requisicoes_espaco?deleted_at=is.null&status=not.in.(ESPACO_LIBERADO,ALTERNATIVA_OFERECIDA,REQUISICAO_NEGADA,CANCELADA)&select=id`,
      { headers: apiHeaders() }
    ).then(r => r.json()).then(data => {
      setV("ag-req-pendentes", Array.isArray(data) ? data.length : 0);
    }).catch(() => {});

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
              <div style="font-size:10px;color:var(--tx3)">${e.hora_inicio?e.hora_inicio.slice(0,5):""} ${e.hora_fim?"→ "+e.hora_fim.slice(0,5):""}${e.data_encerramento&&e.data_encerramento!==e.data?" · até "+fmtDataBrCurto(e.data_encerramento):""}${Array.isArray(e.dias)&&e.dias.length>1?` · <strong>${e.dias.length} dias</strong>`:""}</div>
              <div style="font-size:10px;color:var(--teal);margin-top:1px">${escapeHtml(e.espaco||"")}${e.organizador?" · "+escapeHtml(e.organizador):""}</div>
            </div>
            <button onclick='agAbrirForm(${safeJsonForHtml(e)})' style="background:none;border:1px solid var(--bd1);border-radius:4px;color:var(--tx3);font-size:10px;padding:3px 6px;cursor:pointer;flex-shrink:0">✏️</button>
          </div>`;
        }).join("");
      }
    }

    agRenderMiniCal(rows, _agCalAno, _agCalMes);

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

/* ── RECORRÊNCIAS ────────────────────────────────────────────── */
function agGerarOcorrencias(r, de, ate) {
  if (!r.data || r.data > ate) return [];
  const fimSerie = r.data_encerramento || r.data;
  const rec = r.recorrencia || "Único";
  if (!r.data_encerramento || fimSerie <= r.data) {
    return (r.data >= de && r.data <= ate) ? [r] : [];
  }
  if (rec === "Único" || rec === "Eventual" || rec === "Esporádico") {
    const result = [];
    let cursor = new Date(r.data + "T12:00:00");
    const end   = new Date(r.data_encerramento + "T12:00:00");
    while (cursor <= end) {
      const dateStr = cursor.toISOString().split("T")[0];
      if (dateStr >= de && dateStr <= ate) {
        const diaInfo = Array.isArray(r.dias) ? r.dias.find(d => d.data === dateStr) : null;
        result.push({ ...r, data: dateStr,
          hora_inicio: diaInfo?.hora_inicio ?? r.hora_inicio,
          hora_fim:    diaInfo?.hora_fim    ?? r.hora_fim });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
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

function agTemOcorrenciaNaData(r, dataStr) {
  if (!r.data || r.data > dataStr) return false;
  const rec = r.recorrencia || "Único";
  if (!r.data_encerramento || r.data_encerramento <= r.data) {
    return r.data === dataStr;
  }
  if (!rec || rec === "Único" || rec === "Eventual" || rec === "Esporádico") {
    return dataStr <= r.data_encerramento;
  }
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

/* ── MINI CALENDÁRIO ─────────────────────────────────────────── */
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
window.agNavCal = agNavCal;

async function agVerDia(ano, mes, dia) {
  const rows = await getAgenda();
  const m = String(mes).padStart(2,"0"); const d = String(dia).padStart(2,"0");
  const dataStr = `${ano}-${m}-${d}`;
  const evsDia = rows.filter(r => agTemOcorrenciaNaData(r, dataStr));
  agMostrarExpandido(`${evsDia.length} evento${evsDia.length!==1?"s":""} em ${d}/${m}/${ano}`, evsDia, dataStr);
}
window.agVerDia = agVerDia;

async function agVerMes(mes, el) {
  if(_agMesElAtivo===el) {
    const exp = document.getElementById("ag-mes-expandido");
    if(exp && exp.style.display!=="none") { exp.style.display="none"; _agMesElAtivo=null; return; }
  }
  _agMesElAtivo = el;
  const rows = await getAgenda();
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
window.agVerMes = agVerMes;

async function agVerEspaco(espaco) {
  const rows = await getAgenda();
  const evs = rows.filter(r=>r.espaco===espaco).sort((a,b)=>(a.data||"").localeCompare(b.data||"")||(a.hora_inicio||"").localeCompare(b.hora_inicio||""));
  agMostrarExpandido(`${evs.length} eventos · ${espaco}`, evs);
}
window.agVerEspaco = agVerEspaco;

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
          <button onclick='agAbrirForm(${safeJsonForHtml(e)})' style="background:none;border:1px solid var(--bd1);border-radius:4px;color:var(--tx3);font-size:10px;padding:2px 6px;cursor:pointer;flex-shrink:0">✏️</button>
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
window.filtrarAgendaMes = filtrarAgendaMes;

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
window.carregarMes = carregarMes;

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
window.carregarEspacos = carregarEspacos;

/* ── INDICADORES E RELATÓRIOS ────────────────────────────────── */
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
window.carregarIndicadores = carregarIndicadores;

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
window.carregarIndicadoresGerais = carregarIndicadoresGerais;

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
window.exportarDados = exportarDados;

async function relDashLoad() {
  try {
    const [dem, memb] = await Promise.all([
      apiRead("DEMANDAS").catch(()=>[]),
      apiRead("MEMBROS").catch(()=>[]),
    ]);
    const total  = dem.length;
    const concl  = dem.filter(d => d.status === 'Concluída').length;
    const aber   = dem.filter(d => !['Concluída','Cancelado'].includes(d.status)).length;
    const taxa   = total ? Math.round((concl / total) * 100) : null;
    const set = (id, v, d) => {
      const el = document.getElementById(id); if (el) el.textContent = v;
      const de = document.getElementById(id+'-sub'); if (de && d) de.textContent = d;
    };
    set('rel-kpi-taxa',   taxa !== null ? `${taxa}%` : '—', taxa !== null ? `${concl} de ${total} demandas` : 'sem dados');
    set('rel-kpi-abertas', aber || '—');
    set('rel-kpi-memb',   memb.length || '—');
  } catch(e) { console.warn('[rel-dash]', e.message); }
}
window.relDashLoad = relDashLoad;
