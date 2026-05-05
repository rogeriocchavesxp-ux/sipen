// Agenda autoloads
// Agenda autoloads completos
VIEW_AUTOLOAD["agenda-dash"]          = null;
VIEW_AUTOLOAD["agenda-calendario"]    = { tab:"AGENDA", id:"agenda-cal-list" };
VIEW_AUTOLOAD["agenda-confirmados"]   = { tab:"AGENDA", id:"ag-conf-list",   filtro:{status:"confirmado"} };
VIEW_AUTOLOAD["agenda-aprovacoes"]    = { tab:"AGENDA", id:"ag-aprov-list",  filtro:{status:"pendente"} };
VIEW_AUTOLOAD["agenda-recusados"]     = { tab:"AGENDA", id:"ag-rec-list",    filtro:{status:"cancelado"} };
VIEW_AUTOLOAD["agenda-reagendamentos"]= { tab:"AGENDA", id:"ag-reag-list",   filtro:{status:"reagendado"} };
VIEW_AUTOLOAD["agenda-ambientes"]     = null;
VIEW_AUTOLOAD["agenda-solicitacoes"]  = null;
VIEW_AUTOLOAD["agenda-conflitos"]     = null;
VIEW_AUTOLOAD["agenda-historico"]     = null;
VIEW_AUTOLOAD["agenda-config"]        = null;


/* ── AGENDA FUNCTIONS ─────────────────────── */
let _agendaCache = null;

async function getAgenda() {
  if (_agendaCache) return _agendaCache;
  const agRes = await fetch(`${apiBaseUrl()}/rest/v1/agenda?select=*&order=data.asc,hora_inicio.asc&limit=2000`, { method:"GET", headers:apiHeaders() });
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

    // --- KPIs ---
    const total = rows.length;
    const semana = rows.filter(r=>r.data>=hoje && r.data<=prox7).length;
    const p30 = rows.filter(r=>r.data>=hoje && r.data<=prox30str).length;
    const conf = rows.filter(r=>r.status==="confirmado").length;
    const recorrentes = rows.filter(r=>r.recorrencia && r.recorrencia!=="Único").length;
    const espacosSet = new Set(rows.map(r=>r.espaco).filter(Boolean));
    const orgs = new Set(rows.map(r=>r.organizador).filter(Boolean)).size;
    const espCount = {};
    rows.forEach(r=>{if(r.espaco) espCount[r.espaco]=(espCount[r.espaco]||0)+1;});
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

    // --- Próximos eventos ---
    const proximos = rows.filter(r=>r.data>=hoje).slice(0,8);
    const proxCount = document.getElementById("ag-prox-count");
    if(proxCount) proxCount.textContent = `· ${rows.filter(r=>r.data>=hoje).length} futuros`;
    const proxEl = document.getElementById("agenda-proximos");
    if(proxEl) {
      if(!proximos.length) {
        proxEl.innerHTML = `<div style="color:var(--tx3);text-align:center;padding:20px">Nenhum evento próximo</div>`;
      } else {
        proxEl.innerHTML = proximos.map(e => {
          const isHoje = e.data===hoje;
          return `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1);align-items:flex-start">
            <div style="background:${isHoje?'var(--teal)':'var(--bg-surface)'};border:1px solid ${isHoje?'var(--teal)':'var(--bd1)'};border-radius:6px;padding:5px 8px;text-align:center;min-width:42px;flex-shrink:0">
              <div style="font-size:8px;color:${isHoje?'rgba(255,255,255,.75)':'var(--teal)'};text-transform:uppercase;font-weight:700;letter-spacing:.05em">${e.mes?.slice(0,3)||""}</div>
              <div style="font-size:17px;font-weight:700;color:${isHoje?'#fff':'var(--tx1)'};font-family:var(--mono);line-height:1">${e.data?.slice(8)||"—"}</div>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:11.5px;font-weight:600;color:var(--tx1);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(e.titulo||"—")}</div>
              <div style="font-size:10px;color:var(--tx3)">${e.hora_inicio?e.hora_inicio.slice(0,5):""} ${e.hora_fim?"→ "+e.hora_fim.slice(0,5):""}</div>
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
    const porMes = {};
    rows.forEach(r=>{if(r.mes) porMes[r.mes]=(porMes[r.mes]||0)+1;});
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
    rows.forEach(r=>{if(r.dia_semana && contDia.hasOwnProperty(r.dia_semana)) contDia[r.dia_semana]++;});
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
    rows.forEach(r=>{if(r.organizador) orgCount[r.organizador]=(orgCount[r.organizador]||0)+1;});
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

function agRenderMiniCal(rows, ano, mes) {
  const nomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const nomeMes = nomes[mes];
  const titulo = document.getElementById("ag-cal-titulo");
  if(titulo) titulo.innerHTML = `Calendário <span class="csub">· ${nomeMes} ${ano}</span>`;

  const eventosPorDia = {};
  rows.forEach(r => {
    if(!r.data) return;
    const [y,m,dia] = r.data.split("-").map(Number);
    if(y===ano && m===mes+1) { if(!eventosPorDia[dia]) eventosPorDia[dia]=[]; eventosPorDia[dia].push(r); }
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
  const evsDia = rows.filter(r=>r.data===dataStr);
  const nomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  agMostrarExpandido(`${evsDia.length} evento${evsDia.length!==1?"s":""} em ${d}/${m}/${ano}`, evsDia);
}

async function agVerMes(mes, el) {
  if(_agMesElAtivo===el) {
    const exp = document.getElementById("ag-mes-expandido");
    if(exp && exp.style.display!=="none") { exp.style.display="none"; _agMesElAtivo=null; return; }
  }
  _agMesElAtivo = el;
  const rows = await getAgenda();
  const evsMes = rows.filter(r=>r.mes===mes).sort((a,b)=>a.data?.localeCompare(b.data)||0||(a.hora_inicio||"").localeCompare(b.hora_inicio||""));
  agMostrarExpandido(`${evsMes.length} eventos em ${mes}`, evsMes);
}

async function agVerEspaco(espaco) {
  const rows = await getAgenda();
  const evs = rows.filter(r=>r.espaco===espaco).sort((a,b)=>a.data?.localeCompare(b.data)||0);
  agMostrarExpandido(`${evs.length} eventos · ${espaco}`, evs);
}

function agMostrarExpandido(titulo, evs) {
  const expEl = document.getElementById("ag-mes-expandido");
  const titEl = document.getElementById("ag-mes-exp-titulo");
  const listEl = document.getElementById("ag-mes-exp-list");
  if(!expEl||!listEl) return;
  if(titEl) titEl.textContent = titulo;
  expEl.style.display = "block";
  listEl.innerHTML = agRenderEventList(evs);
  expEl.scrollIntoView({behavior:"smooth", block:"nearest"});
}

function agRenderEventList(evs) {
  if(!evs.length) return `<div style="color:var(--tx3);font-size:11.5px;text-align:center;padding:20px">Nenhum evento</div>`;
  const byDate = {};
  evs.forEach(e => { const k=e.data||"sem-data"; if(!byDate[k]) byDate[k]=[]; byDate[k].push(e); });
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
  const filtrados = rows.filter(r=>r.mes===mes).sort((a,b)=>a.data.localeCompare(b.data));
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
  "admin-con":       { tab:"DEMANDAS",       id:"admin-con-list",   filtro:{area:"Contratos"} },
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


async function carregarSolicitacoesAgenda() {
  const el = document.getElementById("agenda-sol-list");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Carregando...</div>`;
  try {
    // Busca demandas com área Agenda
    const res = await fetch(`${apiBaseUrl()}/rest/v1/demandas?area=eq.Agenda&order=criado_em.desc&limit=100`, {
      headers: apiHeaders()
    });
    const rows = res.ok ? await res.json() : [];

    // KPIs
    const pend = rows.filter(r => String(r.status||"").toLowerCase().includes("pend")).length;
    const conc = rows.filter(r => String(r.status||"").toLowerCase().includes("conc")).length;
    const canc = rows.filter(r => String(r.status||"").toLowerCase().includes("canc")).length;
    const sp = document.getElementById("sol-pend"); if(sp) sp.textContent = pend;
    const sc = document.getElementById("sol-conc"); if(sc) sc.textContent = conc;
    const sk = document.getElementById("sol-canc"); if(sk) sk.textContent = canc;

    if (!rows.length) {
      el.innerHTML = `<div style="text-align:center;padding:28px;color:var(--tx3)">
        <div style="font-size:28px;margin-bottom:8px">📭</div>
        <div style="font-size:12px">Nenhuma solicitação recebida ainda</div>
        <div style="font-size:10.5px;margin-top:4px">As solicitações feitas pela página pública aparecerão aqui</div>
      </div>`;
      return;
    }

    el.innerHTML = `
      <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:11.5px">
        <thead><tr style="border-bottom:1px solid var(--bd2)">
          <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Evento</th>
          <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Solicitante</th>
          <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Data</th>
          <th style="text-align:left;padding:7px 10px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3)">Status</th>
          <th style="text-align:right;padding:7px 10px;font-size:9.5px;color:var(--tx3)">Ações</th>
        </tr></thead>
        <tbody>
          ${rows.map(r => {
            const status = r.status || "Pendente";
            const cor = status.toLowerCase().includes("pend") ? "var(--gold)"
              : status.toLowerCase().includes("conc") ? "var(--gr)"
              : status.toLowerCase().includes("canc") ? "var(--rose)"
              : "var(--tx2)";
            return `<tr style="border-bottom:1px solid var(--bd1)" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
              <td style="padding:8px 10px;color:var(--tx1);font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.titulo||"—")}</td>
              <td style="padding:8px 10px;color:var(--tx2)">${escapeHtml(r.solicitante||"—")}</td>
              <td style="padding:8px 10px;color:var(--tx2);white-space:nowrap;font-family:var(--mono);font-size:11px">${r.data_abertura||"—"}</td>
              <td style="padding:8px 10px">
                <span style="font-size:9.5px;padding:2px 7px;border-radius:10px;background:${cor}18;color:${cor};border:1px solid ${cor}33">${escapeHtml(status)}</span>
              </td>
              <td style="padding:8px 10px;text-align:right;white-space:nowrap">
                <button onclick='openCrudForm("DEMANDAS",${safeJsonForHtml(r)})' style="background:var(--bg-card);border:1px solid var(--bd1);border-radius:4px;color:var(--tx2);font-size:10px;padding:3px 8px;cursor:pointer">✏️ Editar</button>
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table></div>`;
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
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
        if (a.data !== b.data) continue;
        if (a.espaco.toLowerCase() !== b.espaco.toLowerCase()) continue;
        if (!a.hora_inicio || !b.hora_inicio) continue;
        // Check overlap
        const aI = a.hora_inicio, aF = a.hora_fim||"23:59";
        const bI = b.hora_inicio, bF = b.hora_fim||"23:59";
        if (aI < bF && bI < aF) conflitos.push([a,b]);
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
    const passados = rows.filter(r => r.data < hoje).sort((a,b) => b.data.localeCompare(a.data));
    renderModuloList(passados, "AGENDA", "ag-hist-list");
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose)">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

async function carregarConfigAgenda() {
  try {
    const rows = await getAgenda();
    // Espaços únicos
    const espacos = [...new Set(rows.map(r=>r.espaco).filter(Boolean))].sort();
    const esEl = document.getElementById("ag-config-espacos");
    if (esEl) esEl.innerHTML = espacos.map(e=>`
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd1)">
        <span style="font-size:11.5px;color:var(--tx1)">${escapeHtml(e)}</span>
        <span style="font-size:10px;color:var(--tx3);font-family:var(--mono)">${rows.filter(r=>r.espaco===e).length} eventos</span>
      </div>`).join("");
    // Organizadores únicos
    const orgs = [...new Set(rows.map(r=>r.organizador).filter(Boolean))].sort();
    const orEl = document.getElementById("ag-config-orgs");
    if (orEl) orEl.innerHTML = orgs.map(o=>`
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd1)">
        <span style="font-size:11.5px;color:var(--tx1)">${escapeHtml(o)}</span>
        <span style="font-size:10px;color:var(--tx3);font-family:var(--mono)">${rows.filter(r=>r.organizador===o).length} eventos</span>
      </div>`).join("");
  } catch(e) { console.warn("Config agenda:", e.message); }
}
