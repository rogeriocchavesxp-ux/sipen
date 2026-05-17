/* ═══════════════════════════════════════════════════════
   SIPEN — Congregações: UI e Lógica
   congregacoes.js · v2.0
   Sidebar dinâmica + 9 abas por congregação
═══════════════════════════════════════════════════════ */

(function(){

CONG.seed();
if(typeof MC!=="undefined") MC["cong"]="var(--gr)";
if(typeof MN!=="undefined") MN["cong"]="Congregações";
if(typeof CRUMB!=="undefined"){
  CRUMB["cong-dash"]=["cong","Congregações","Dashboard Geral"];
  CRUMB["cong-ver"] =["cong","Congregações",""];
}

// ── Estado ────────────────────────────────────────────
let _activeCongId=null;
let _activeTab=0;

// ── Utilitários ───────────────────────────────────────
function fmtData(iso){
  if(!iso) return "—";
  const [y,m,d]=iso.split("-");
  const mn=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${d} ${mn[+m-1]} ${y}`;
}
function fmtMes(iso){
  if(!iso) return "—";
  const [y,m]=iso.split("-");
  const mn=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${mn[+m-1]}/${y}`;
}
function iniciais(nome){
  return (nome||"?").split(" ").slice(0,2).map(p=>p[0]).join("").toUpperCase();
}
function badge(txt,color){
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;background:${color}22;color:${color}">${txt}</span>`;
}
function statusBadge(s){
  const map={ativa:"#3AAA5C",inativa:"#888",ativo:"#3AAA5C","em andamento":"#4A9CF5",identificado:"#E67E22",planejado:"#9B59B6","em análise":"#E67E22"};
  const c=map[(s||"").toLowerCase()]||"#888";
  return badge(s,c);
}
function prioBadge(p){
  return badge(p,{Alta:"#E74C3C",Média:"#E67E22",Baixa:"#3AAA5C"}[p]||"#888");
}

// ── Sidebar dinâmica ──────────────────────────────────
function buildCongMenu(){
  const msub=document.getElementById("ms-cong");
  if(!msub) return;
  msub.querySelectorAll(".si-cong-item,.sdiv-cong").forEach(el=>el.remove());
  const congs=CONG.listCongs();
  if(congs.length===0) return;
  const divider=document.createElement("div");
  divider.className="sdiv sdiv-cong";
  msub.appendChild(divider);
  congs.forEach(c=>{
    const el=document.createElement("div");
    el.className="si si-cong-item";
    el.innerHTML=`<span style="margin-right:6px;font-size:11px">${escapeHtml(c.identificacao.icon||"⛪")}</span>${escapeHtml(c.identificacao.nome)}`;
    if(_activeCongId===c.id) el.classList.add("ativo");
    el.onclick=()=>abrirCongView(c.id);
    msub.appendChild(el);
  });
}
window.buildCongMenu=buildCongMenu;

// ── Dashboard Geral ───────────────────────────────────
function renderDashboardGeral(){
  const congs=CONG.listCongs();
  const ativas       =congs.filter(c=>c.identificacao.status==="ativa").length;
  const comSupervisao=congs.filter(c=>(c.lideranca_estruturada||{}).supervisao).length;
  const comEBD       =congs.filter(c=>((c.lideranca_estruturada||{}).professores_ebd||[]).length>0).length;
  const totalLideres =congs.reduce((s,c)=>{
    const le=c.lideranca_estruturada||{};
    return s + (le.supervisao?1:0) + (le.conselheiro?1:0) + (le.coordenacao?1:0) + (le.tesoureiro?1:0)
             + (le.equipe||[]).length + (le.mesa_administrativa||[]).length
             + (le.professores_ebd||[]).length;
  },0);

  const kpisEl=document.getElementById("cong-dash-kpis");
  if(kpisEl) kpisEl.innerHTML=`
    <div class="kpi"><div class="kn">Congregações Ativas</div><div class="kv">${ativas}</div></div>
    <div class="kpi"><div class="kn">Com Supervisão</div><div class="kv">${comSupervisao}</div></div>
    <div class="kpi"><div class="kn">Líderes Cadastrados</div><div class="kv">${totalLideres}</div></div>
    <div class="kpi"><div class="kn">Com EBD</div><div class="kv">${comEBD}</div></div>
  `;

  const listaEl=document.getElementById("cong-dash-lista");
  if(listaEl) listaEl.innerHTML=congs.map(c=>{
    const le=c.lideranca_estruturada||{};
    const sub=le.supervisao||le.conselheiro||c.identificacao.localizacao||"—";
    return `
    <div onclick="abrirCongView('${c.id}')" style="cursor:pointer;margin-bottom:8px;padding:10px 12px;border-radius:8px;border:1px solid var(--bd1);background:var(--bg2);display:flex;align-items:center;gap:12px;transition:background .15s" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='var(--bg2)'">
      <div style="width:36px;height:36px;border-radius:50%;background:${c.identificacao.cor}22;border:2px solid ${c.identificacao.cor};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${c.identificacao.icon||"⛪"}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:12.5px;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(c.identificacao.nome)}</div>
        <div style="font-size:10.5px;color:var(--tx3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(sub)}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        ${statusBadge(c.identificacao.status)}
      </div>
    </div>
  `}).join("")||`<div style="color:var(--tx3);font-size:11px">Nenhuma congregação cadastrada</div>`;

  const todosOsCultos=congs.flatMap(c=>(c.atividades_igreja.historico_cultos||[]).map(cu=>({...cu,congNome:c.identificacao.nome})));
  todosOsCultos.sort((a,b)=>b.data.localeCompare(a.data));
  const cultosEl=document.getElementById("cong-dash-cultos");
  if(cultosEl) cultosEl.innerHTML=todosOsCultos.slice(0,6).map(cu=>`
    <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--bd1)">
      <div style="font-size:10px;color:var(--tx3);width:68px;flex-shrink:0">${fmtData(cu.data)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11.5px;font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(cu.congNome)}</div>
        <div style="font-size:10px;color:var(--tx3)">${cu.tipo}</div>
      </div>
      <div style="font-size:12px;font-weight:700;color:var(--gr);flex-shrink:0">${cu.participantes}</div>
    </div>
  `).join("")||`<div style="color:var(--tx3);font-size:11px">Nenhum culto registrado</div>`;
}
window.renderDashboardGeral=renderDashboardGeral;

// ── Abrir congregação individual ──────────────────────
async function abrirCongView(id){
  _activeCongId=id;
  _activeTab=0;
  buildCongMenu();
  const cong=CONG.getCong(id);
  if(!cong) return;
  if(typeof CRUMB!=="undefined") CRUMB["cong-ver"]=["cong","Congregações",cong.identificacao.nome];
  if(typeof go==="function") await go("cong-ver");
  renderCongView(cong);
}
window.abrirCongView=abrirCongView;

function renderCongView(cong){
  const el=document.getElementById("v-cong-ver");
  if(!el) return;
  const id=cong.id;
  const tabs=["Visão Geral","Membresia","Cultos e Oração","Pequenos Grupos","Ministérios","Liderança","Financeiro","Desafios","Planejamento"];
  el.innerHTML=`
    <div class="hero">
      <div class="hero-ic" style="background:${cong.identificacao.cor}22;border-color:${cong.identificacao.cor}55">${cong.identificacao.icon||"⛪"}</div>
      <div>
        <div class="hero-lbl">Congregações</div>
        <div class="hero-ttl">${escapeHtml(cong.identificacao.nome)}</div>
        <div class="hero-dsc">${escapeHtml(cong.identificacao.localizacao||"")}${cong.identificacao.localizacao?" — ":""}${statusBadge(cong.identificacao.status)}</div>
      </div>
      <div class="hero-act">
        <button class="tbt" onclick="go('cong-dash')">← Dashboard</button>
        <button class="tbt pri" onclick="abrirModalEditarCong('${id}')">Editar</button>
      </div>
    </div>
    <div class="ct" style="padding-top:0">
      <div class="citabs" id="cong-tabs-bar">
        ${tabs.map((t,i)=>`<div class="citab${i===_activeTab?" on":""}" onclick="switchCongTab(${i})">${t}</div>`).join("")}
      </div>
      <div id="cong-tab-content" style="padding-top:2px"></div>
    </div>
  `;
  renderCongTab(_activeTab, cong);
}

function switchCongTab(i){
  _activeTab=i;
  document.querySelectorAll("#cong-tabs-bar .citab").forEach((t,idx)=>t.classList.toggle("on",idx===i));
  const cong=CONG.getCong(_activeCongId);
  if(cong) renderCongTab(i,cong);
}
window.switchCongTab=switchCongTab;

function renderCongTab(i, cong){
  const el=document.getElementById("cong-tab-content");
  if(!el) return;
  const renderers=[
    renderTab_visaoGeral, renderTab_membresia, renderTab_cultos,
    renderTab_pgs, renderTab_ministerios, renderTab_lideranca,
    renderTab_financeiro, renderTab_desafios, renderTab_planejamento
  ];
  el.innerHTML="";
  if(renderers[i]) renderers[i](cong,el);
}

// ── Tab 0: Visão Geral ────────────────────────────────
function renderTab_visaoGeral(cong, el){
  const m=cong.panorama_membresia, a=cong.atividades_igreja, f=cong.financeiro;
  el.innerHTML=`
    <div class="g2" style="margin-top:14px">
      <div class="card">
        <div class="ctit">Identificação</div>
        <table style="width:100%;font-size:11.5px;border-collapse:collapse">
          <tr><td style="color:var(--tx3);padding:5px 0;width:42%">Status</td><td>${statusBadge(cong.identificacao.status)}</td></tr>
          <tr><td style="color:var(--tx3);padding:5px 0">Localização</td><td style="color:var(--tx1)">${escapeHtml(cong.identificacao.localizacao||"—")}</td></tr>
          <tr><td style="color:var(--tx3);padding:5px 0">Endereço</td><td style="color:var(--tx1)">${escapeHtml(cong.identificacao.endereco||"—")}</td></tr>
          <tr><td style="color:var(--tx3);padding:5px 0">Início</td><td style="color:var(--tx1)">${fmtData(cong.identificacao.data_inicio)}</td></tr>
          ${(()=>{const le=cong.lideranca_estruturada||{};return [
            le.supervisao?`<tr><td style="color:var(--tx3);padding:5px 0">Supervisão</td><td style="color:var(--tx1)">${escapeHtml(le.supervisao)}</td></tr>`:"",
            le.conselheiro?`<tr><td style="color:var(--tx3);padding:5px 0">Conselheiro</td><td style="color:var(--tx1)">${escapeHtml(le.conselheiro)}</td></tr>`:"",
            le.coordenacao?`<tr><td style="color:var(--tx3);padding:5px 0">Coordenação</td><td style="color:var(--tx1)">${escapeHtml(le.coordenacao)}</td></tr>`:"",
            le.tesoureiro?`<tr><td style="color:var(--tx3);padding:5px 0">Tesoureiro</td><td style="color:var(--tx1)">${escapeHtml(le.tesoureiro)}</td></tr>`:""
          ].join("") || `<tr><td style="color:var(--tx3);padding:5px 0">Responsável</td><td style="color:var(--tx1)">${escapeHtml(cong.lideranca.pastor_responsavel||"—")}</td></tr>`})()}
          ${cong.identificacao.obs?`<tr><td style="color:var(--tx3);padding:5px 0">Obs.</td><td style="color:var(--tx1)">${escapeHtml(cong.identificacao.obs)}</td></tr>`:""}
        </table>
      </div>
      <div class="card">
        <div class="ctit">Resumo</div>
        <div class="kpis c2" style="margin:0 0 10px">
          <div class="kpi" style="padding:10px"><div class="kn">Membros Ativos</div><div class="kv" style="font-size:22px">${m.membros_ativos}</div></div>
          <div class="kpi" style="padding:10px"><div class="kn">Freq. Média</div><div class="kv" style="font-size:22px">${a.frequencia_media}</div></div>
        </div>
        <div style="font-size:11px;color:var(--tx3);margin-top:8px">Cultos/semana: <b style="color:var(--tx1)">${a.cultos_por_semana}</b> &nbsp;|&nbsp; PGs: <b style="color:var(--tx1)">${cong.pequenos_grupos.total_grupos}</b> &nbsp;|&nbsp; Ministérios: <b style="color:var(--tx1)">${cong.ministerios.lista.length}</b></div>
        <div style="font-size:11px;color:var(--tx3);margin-top:5px">Batizados este ano: <b style="color:var(--gr)">${m.batizados_ano}</b> &nbsp;|&nbsp; Novos membros: <b style="color:var(--gr)">${m.novos_membros_ano}</b></div>
        <div style="font-size:11px;color:var(--tx3);margin-top:5px">Receita média: <b style="color:var(--tx1)">R$ ${f.receita_media_mensal.toLocaleString("pt-BR")}</b> &nbsp;|&nbsp; Saldo: <b style="color:${f.saldo_atual>=0?"var(--gr)":"var(--rose)"}">R$ ${f.saldo_atual.toLocaleString("pt-BR")}</b></div>
      </div>
    </div>
    ${cong.desafios.lista.length>0?`
    <div class="card" style="margin-top:12px">
      <div class="ctit">Desafios Ativos</div>
      ${cong.desafios.lista.slice(0,3).map(d=>`
        <div style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid var(--bd1)">
          <div style="flex:1"><div style="font-size:11.5px;font-weight:600;color:var(--tx1)">${escapeHtml(d.titulo)}</div><div style="font-size:10px;color:var(--tx3);margin-top:2px">${escapeHtml(d.descricao)}</div></div>
          <div style="display:flex;gap:5px;flex-shrink:0">${prioBadge(d.prioridade)}${statusBadge(d.status)}</div>
        </div>`).join("")}
    </div>`:""}
  `;
}

// ── Tab 1: Membresia ──────────────────────────────────
function renderTab_membresia(cong, el){
  const m=cong.panorama_membresia;
  const total=m.membros_ativos+(m.membros_cooperadores||0)||1;
  el.innerHTML=`
    <div class="kpis c4" style="margin-top:14px">
      <div class="kpi"><div class="kn">Membros Ativos</div><div class="kv">${m.membros_ativos}</div></div>
      <div class="kpi"><div class="kn">Cooperadores</div><div class="kv">${m.membros_cooperadores||0}</div></div>
      <div class="kpi"><div class="kn">Batizados/Ano</div><div class="kv" style="color:var(--gr)">${m.batizados_ano}</div></div>
      <div class="kpi"><div class="kn">Meta ${new Date().getFullYear()}</div><div class="kv">${m.meta_membros||"—"}</div></div>
    </div>
    <div class="g2" style="margin-top:12px">
      <div class="card">
        <div class="ctit">Composição por Faixa Etária</div>
        ${[["Crianças",m.criancas,"#3AAA5C"],["Jovens",m.jovens,"#4A9CF5"],["Adultos",m.adultos,"#E67E22"],["Idosos",m.idosos,"#9B59B6"]].map(([lbl,val,cor])=>{
          const pct=Math.round((val/total)*100);
          return `<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
              <span style="color:var(--tx2)">${lbl}</span>
              <span style="color:var(--tx1);font-weight:600">${val} <span style="font-weight:400;color:var(--tx3)">(${pct}%)</span></span>
            </div>
            <div style="height:5px;border-radius:3px;background:var(--bd1)"><div style="height:5px;border-radius:3px;background:${cor};width:${pct}%"></div></div>
          </div>`;
        }).join("")}
      </div>
      <div class="card">
        <div class="ctit">Movimentação Anual</div>
        <table style="width:100%;font-size:11.5px;border-collapse:collapse">
          <tr><td style="color:var(--tx3);padding:6px 0">Novos membros</td><td style="color:var(--gr);font-weight:700">+ ${m.novos_membros_ano}</td></tr>
          <tr style="border-top:1px solid var(--bd1)"><td style="color:var(--tx3);padding:6px 0">Batizados</td><td style="color:var(--gr);font-weight:700">+ ${m.batizados_ano}</td></tr>
          <tr style="border-top:1px solid var(--bd1)"><td style="color:var(--tx3);padding:6px 0">Desligados</td><td style="color:var(--rose);font-weight:700">− ${m.desligados_ano||0}</td></tr>
          <tr style="border-top:2px solid var(--bd1)">
            <td style="color:var(--tx2);padding:8px 0;font-weight:700">Crescimento líquido</td>
            <td style="font-weight:700;color:${(m.novos_membros_ano-(m.desligados_ano||0))>=0?"var(--gr)":"var(--rose)"}">${(m.novos_membros_ano-(m.desligados_ano||0))>=0?"+":""}${m.novos_membros_ano-(m.desligados_ano||0)}</td>
          </tr>
        </table>
        ${m.meta_membros?`<div style="margin-top:14px">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span style="color:var(--tx3)">Progresso para meta</span><span style="color:var(--tx1);font-weight:600">${m.membros_ativos}/${m.meta_membros}</span></div>
          <div style="height:7px;border-radius:4px;background:var(--bd1)"><div style="height:7px;border-radius:4px;background:var(--gr);width:${Math.min(100,Math.round(m.membros_ativos/m.meta_membros*100))}%"></div></div>
          <div style="font-size:10px;color:var(--tx3);margin-top:3px;text-align:right">${Math.min(100,Math.round(m.membros_ativos/m.meta_membros*100))}%</div>
        </div>`:""}
      </div>
    </div>
  `;
}

// ── Tab 2: Cultos e Oração ────────────────────────────
function renderTab_cultos(cong, el){
  const a=cong.atividades_igreja;
  const hist=a.historico_cultos||[];
  const atividades=[
    ["Escola Dominical",a.escola_dominical],["Culto de Jovens",a.culto_jovens],
    ["Culto de Mulheres",a.culto_mulheres],["Culto de Homens",a.culto_homens],
    ["Culto de Crianças",a.culto_criancas]
  ];
  el.innerHTML=`
    <div class="g2" style="margin-top:14px">
      <div class="card">
        <div class="ctit" style="display:flex;justify-content:space-between;align-items:center">
          Programação
          <button class="tbt" style="font-size:10px;padding:4px 9px" onclick="abrirModalNovoCulto('${cong.id}')">+ Registrar Culto</button>
        </div>
        <div style="font-size:11px;color:var(--tx3);margin-bottom:8px">${a.cultos_por_semana} culto(s)/semana &nbsp;|&nbsp; Freq. média: <b style="color:var(--tx1)">${a.frequencia_media}</b></div>
        ${(a.horarios||[]).map(h=>`<div style="padding:5px 0;border-bottom:1px solid var(--bd1);font-size:11.5px;color:var(--tx1)">🕐 ${h}</div>`).join("")||`<div style="color:var(--tx3);font-size:11px">Sem horários cadastrados</div>`}
        <div style="margin-top:14px">
          <div class="ctit" style="margin-bottom:6px">Atividades</div>
          ${atividades.map(([nome,ativo])=>`<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11.5px"><span style="color:${ativo?"var(--gr)":"var(--tx3)"}">${ativo?"✓":"○"}</span><span style="color:${ativo?"var(--tx1)":"var(--tx3)"}">${nome}</span></div>`).join("")}
        </div>
      </div>
      <div class="card">
        <div class="ctit">Histórico de Cultos</div>
        ${hist.length===0?`<div style="color:var(--tx3);font-size:11px">Nenhum culto registrado</div>`:
          hist.slice(0,8).map(cu=>`
            <div style="padding:9px 0;border-bottom:1px solid var(--bd1)">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                  <div style="font-size:11.5px;font-weight:600;color:var(--tx1)">${fmtData(cu.data)} — ${cu.tipo}</div>
                  <div style="font-size:10px;color:var(--tx3);margin-top:1px">Pregador: ${cu.pregador||"—"}</div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-size:14px;font-weight:700;color:var(--gr)">${cu.participantes}</div>
                  <div style="font-size:9.5px;color:var(--tx3)">presentes</div>
                </div>
              </div>
              ${cu.visitantes>0||cu.decisoes>0?`<div style="font-size:10px;color:var(--tx3);margin-top:3px">Visitantes: <b style="color:var(--tx1)">${cu.visitantes}</b> &nbsp;|&nbsp; Decisões: <b style="color:var(--gr)">${cu.decisoes}</b></div>`:""}
              ${cu.obs?`<div style="font-size:10px;color:var(--tx3);font-style:italic;margin-top:2px">${cu.obs}</div>`:""}
            </div>`).join("")}
      </div>
    </div>
  `;
}

// ── Tab 3: Pequenos Grupos ────────────────────────────
function renderTab_pgs(cong, el){
  const pg=cong.pequenos_grupos;
  const totalPart=(pg.grupos||[]).reduce((s,g)=>s+(g.membros||0),0);
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;margin-bottom:12px">
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--tx1)">${pg.total_grupos} Pequenos Grupos</div>
        <div style="font-size:11px;color:var(--tx3)">${totalPart} participantes no total</div>
      </div>
      <button class="tbt pri" onclick="abrirModalNovoPG('${cong.id}')">+ Novo Grupo</button>
    </div>
    <div class="card">
      ${(pg.grupos||[]).length===0?`<div style="color:var(--tx3);font-size:11px">Nenhum grupo cadastrado</div>`:
        (pg.grupos||[]).map(g=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bd1)">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--gr);flex-shrink:0">${iniciais(g.lider)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:700;color:var(--tx1)">${g.nome}</div>
              <div style="font-size:10.5px;color:var(--tx3)">Líder: ${g.lider} &nbsp;|&nbsp; ${g.dia} ${g.horario}</div>
              <div style="font-size:10px;color:var(--tx3)">📍 ${g.local}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:13px;font-weight:700;color:var(--gr)">${g.membros}</div>
              <div style="font-size:9.5px;color:var(--tx3);margin-bottom:4px">membros</div>
              ${statusBadge(g.status)}
            </div>
          </div>`).join("")}
    </div>
  `;
}

// ── Tab 4: Ministérios ────────────────────────────────
function renderTab_ministerios(cong, el){
  const lista=cong.ministerios.lista||[];
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;margin-bottom:12px">
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--tx1)">${lista.length} Ministérios</div>
        <div style="font-size:11px;color:var(--tx3)">${lista.filter(m=>m.status==="ativo").length} ativos</div>
      </div>
      <button class="tbt pri" onclick="abrirModalNovoMinisterio('${cong.id}')">+ Novo Ministério</button>
    </div>
    <div class="card">
      ${lista.length===0?`<div style="color:var(--tx3);font-size:11px">Nenhum ministério cadastrado</div>`:
        lista.map(m=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bd1)">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--acc);flex-shrink:0">${iniciais(m.lider)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:700;color:var(--tx1)">${escapeHtml(m.nome)}</div>
              <div style="font-size:10.5px;color:var(--tx3)">Líder: ${escapeHtml(m.lider)}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:13px;font-weight:700;color:var(--acc)">${m.membros}</div>
              <div style="font-size:9.5px;color:var(--tx3);margin-bottom:4px">membros</div>
              ${statusBadge(m.status)}
            </div>
          </div>`).join("")}
    </div>
  `;
}

// ── Tab 5: Liderança ──────────────────────────────────
function _leRow(label, valor){
  if(!valor) return "";
  return `<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--bd1)">
    <div style="font-size:11px;color:var(--tx3);width:110px;flex-shrink:0">${label}</div>
    <div style="font-size:11.5px;font-weight:600;color:var(--tx1)">${escapeHtml(valor)}</div>
  </div>`;
}
function _leList(label, arr){
  if(!arr||arr.length===0) return "";
  return `<div style="padding:8px 0;border-bottom:1px solid var(--bd1)">
    <div style="font-size:11px;color:var(--tx3);margin-bottom:5px">${label}</div>
    ${arr.map(n=>`<div style="font-size:11.5px;color:var(--tx1);padding:2px 0">• ${escapeHtml(n)}</div>`).join("")}
  </div>`;
}
function _leMinisterio(min){
  const membros=(min.membros||[]).map(m=>`<span style="font-size:10.5px;color:var(--tx2)">${escapeHtml(m.cargo)}: <b style="color:var(--tx1)">${escapeHtml(m.nome)}</b></span>`).join(" &nbsp;|&nbsp; ");
  return `<div style="padding:8px 0;border-bottom:1px solid var(--bd1)">
    <div style="font-size:12px;font-weight:700;color:var(--tx1);margin-bottom:4px">${escapeHtml(min.nome)}</div>
    <div>${membros||"<span style='font-size:11px;color:var(--tx3)'>Sem membros cadastrados</span>"}</div>
  </div>`;
}
function renderTab_lideranca(cong, el){
  const le=cong.lideranca_estruturada||{};
  const temEstrutura=le.supervisao||le.conselheiro||le.coordenacao||le.tesoureiro
    ||(le.equipe||[]).length||(le.mesa_administrativa||[]).length
    ||(le.professores_ebd||[]).length||(le.ministerios_auxiliares||[]).length;

  el.innerHTML=`
    <div style="margin-top:14px">
      <div class="card">
        <div class="ctit">Estrutura de Liderança</div>
        ${temEstrutura ? [
          _leRow("Supervisão",  le.supervisao),
          _leRow("Conselheiro", le.conselheiro),
          _leRow("Coordenação", le.coordenacao),
          _leRow("Tesoureiro",  le.tesoureiro),
          _leList("Equipe", le.equipe),
          _leList("Mesa Administrativa", le.mesa_administrativa),
          _leList("Professores EBD", le.professores_ebd),
          (le.ministerios_auxiliares||[]).length?`
            <div style="padding:8px 0">
              <div style="font-size:11px;color:var(--tx3);margin-bottom:6px">Ministérios Auxiliares</div>
              ${(le.ministerios_auxiliares||[]).map(_leMinisterio).join("")}
            </div>`:"",
        ].join("") : `<div style="color:var(--tx3);font-size:11px">Estrutura de liderança não cadastrada</div>`}
      </div>
    </div>
  `;
}

// ── Tab 6: Financeiro ─────────────────────────────────

// ── Tab 7: Desafios ───────────────────────────────────
function renderTab_desafios(cong, el){
  const lista=cong.desafios.lista||[];
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;margin-bottom:12px">
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--tx1)">${lista.length} Desafio(s) Mapeado(s)</div>
        <div style="font-size:11px;color:var(--tx3)">${lista.filter(d=>d.prioridade==="Alta").length} de alta prioridade</div>
      </div>
      <button class="tbt pri" onclick="abrirModalNovoDesafio('${cong.id}')">+ Novo Desafio</button>
    </div>
    <div class="card">
      ${lista.length===0?`<div style="color:var(--tx3);font-size:11px">Nenhum desafio mapeado</div>`:
        lista.map(d=>`
          <div style="padding:10px 0;border-bottom:1px solid var(--bd1)">
            <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px">
              <div style="flex:1"><div style="font-size:12px;font-weight:700;color:var(--tx1)">${escapeHtml(d.titulo)}</div></div>
              <div style="display:flex;gap:5px;flex-shrink:0">${prioBadge(d.prioridade)}${statusBadge(d.status)}</div>
            </div>
            <div style="font-size:10.5px;color:var(--tx3)">${escapeHtml(d.descricao)}</div>
          </div>`).join("")}
    </div>
  `;
}

// ── Tab 8: Planejamento ───────────────────────────────
function renderTab_planejamento(cong, el){
  const p=cong.planejamento;
  const eventos=(p.eventos||[]).slice().sort((a,b)=>a.data.localeCompare(b.data));
  const acoes=p.acoes||[];
  el.innerHTML=`
    ${p.metas_ano?`<div class="card" style="margin-top:14px;margin-bottom:12px">
      <div class="ctit">Meta do Ano</div>
      <div style="font-size:12px;color:var(--tx1);font-style:italic">"${p.metas_ano}"</div>
    </div>`:"<div style='margin-top:14px'></div>"}
    <div class="g2">
      <div class="card">
        <div class="ctit" style="display:flex;justify-content:space-between;align-items:center">
          Eventos Planejados
          <button class="tbt" style="font-size:10px;padding:4px 9px" onclick="abrirModalNovoEvento('${cong.id}')">+ Evento</button>
        </div>
        ${eventos.length===0?`<div style="color:var(--tx3);font-size:11px">Nenhum evento planejado</div>`:
          eventos.map(e=>`
            <div style="padding:8px 0;border-bottom:1px solid var(--bd1)">
              <div style="display:flex;align-items:flex-start;gap:10px">
                <div style="width:46px;text-align:center;flex-shrink:0">
                  <div style="font-size:11px;font-weight:700;color:var(--gr)">${fmtData(e.data).split(" ").slice(0,2).join(" ")}</div>
                  <div style="font-size:9px;color:var(--tx3)">${fmtData(e.data).split(" ")[2]||""}</div>
                </div>
                <div>
                  <div style="font-size:11.5px;font-weight:700;color:var(--tx1)">${e.titulo}</div>
                  <div style="font-size:10px;color:var(--tx3)">${e.tipo}${e.descricao?" — "+e.descricao:""}</div>
                </div>
              </div>
            </div>`).join("")}
      </div>
      <div class="card">
        <div class="ctit">Ações Previstas</div>
        ${acoes.length===0?`<div style="color:var(--tx3);font-size:11px">Nenhuma ação registrada</div>`:
          acoes.map(a=>`<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd1);font-size:11.5px;color:var(--tx1)"><span style="color:var(--gr);flex-shrink:0">→</span>${a}</div>`).join("")}
      </div>
    </div>
  `;
}

// ── Modais ────────────────────────────────────────────
function abrirModalNovaCong(){
  const m=document.getElementById("modal-nova-cong");
  if(!m) return;
  m.querySelector(".md-t").textContent="Nova Congregação";
  const btn=m.querySelector(".btn-p");
  if(btn){ btn.textContent="Cadastrar Congregação"; btn.onclick=salvarNovaCong; }
  ["nc-nome","nc-local","nc-lider","nc-inicio","nc-endereco","nc-obs"].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=""; });
  const st=document.getElementById("nc-status"); if(st) st.value="ativa";
  m.style.display="flex";
}
window.abrirModalNovaCong=abrirModalNovaCong;

function fecharModalNovaCong(){ const m=document.getElementById("modal-nova-cong"); if(m) m.style.display="none"; }
window.fecharModalNovaCong=fecharModalNovaCong;

function salvarNovaCong(){
  const nome=document.getElementById("nc-nome")?.value?.trim();
  if(!nome){ alert("Informe o nome da congregação"); return; }
  const id="cong-"+Date.now();
  const cong=CONG.emptyCong(id);
  cong.identificacao.nome=nome;
  cong.identificacao.localizacao=document.getElementById("nc-local")?.value||"";
  cong.identificacao.status=document.getElementById("nc-status")?.value||"ativa";
  cong.lideranca.pastor_responsavel=document.getElementById("nc-lider")?.value||"";
  cong.identificacao.data_inicio=document.getElementById("nc-inicio")?.value||"";
  cong.identificacao.endereco=document.getElementById("nc-endereco")?.value||"";
  cong.identificacao.obs=document.getElementById("nc-obs")?.value||"";
  CONG.saveCong(cong);
  _sbSaveCong(cong);
  fecharModalNovaCong();
  buildCongMenu();
  abrirCongView(id);
}
window.salvarNovaCong=salvarNovaCong;

function abrirModalEditarCong(id){
  const cong=CONG.getCong(id);
  if(!cong) return;
  const m=document.getElementById("modal-nova-cong");
  if(!m) return;
  m.querySelector(".md-t").textContent="Editar Congregação";
  document.getElementById("nc-nome").value=cong.identificacao.nome;
  document.getElementById("nc-local").value=cong.identificacao.localizacao;
  document.getElementById("nc-status").value=cong.identificacao.status;
  document.getElementById("nc-lider").value=cong.lideranca.pastor_responsavel;
  document.getElementById("nc-inicio").value=cong.identificacao.data_inicio;
  document.getElementById("nc-endereco").value=cong.identificacao.endereco;
  document.getElementById("nc-obs").value=cong.identificacao.obs||"";
  const btn=m.querySelector(".btn-p");
  if(btn){ btn.textContent="Salvar Alterações"; btn.onclick=()=>salvarEdicaoCong(id); }
  m.style.display="flex";
}
window.abrirModalEditarCong=abrirModalEditarCong;

function salvarEdicaoCong(id){
  const cong=CONG.getCong(id);
  if(!cong) return;
  cong.identificacao.nome=document.getElementById("nc-nome")?.value?.trim()||cong.identificacao.nome;
  cong.identificacao.localizacao=document.getElementById("nc-local")?.value||"";
  cong.identificacao.status=document.getElementById("nc-status")?.value||"ativa";
  cong.lideranca.pastor_responsavel=document.getElementById("nc-lider")?.value||"";
  cong.identificacao.data_inicio=document.getElementById("nc-inicio")?.value||"";
  cong.identificacao.endereco=document.getElementById("nc-endereco")?.value||"";
  cong.identificacao.obs=document.getElementById("nc-obs")?.value||"";
  CONG.saveCong(cong);
  _sbSaveCong(cong);
  fecharModalNovaCong();
  buildCongMenu();
  abrirCongView(id);
}
window.salvarEdicaoCong=salvarEdicaoCong;

function abrirModalNovoCulto(congId){
  const sel=document.getElementById("culto-cong-select");
  if(sel) sel.innerHTML=CONG.listCongs().map(c=>`<option value="${c.id}"${c.id===congId?" selected":""}>${escapeHtml(c.identificacao.nome)}</option>`).join("");
  ["culto-data","culto-pregador","culto-obs"].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=""; });
  ["culto-participantes","culto-visitantes","culto-decisoes"].forEach(id=>{ const el=document.getElementById(id); if(el) el.value="0"; });
  const m=document.getElementById("modal-novo-culto"); if(m) m.style.display="flex";
}
window.abrirModalNovoCulto=abrirModalNovoCulto;

function fecharModalNovoCulto(){ const m=document.getElementById("modal-novo-culto"); if(m) m.style.display="none"; }
window.fecharModalNovoCulto=fecharModalNovoCulto;

function salvarNovoCulto(){
  const congId=document.getElementById("culto-cong-select")?.value;
  const data=document.getElementById("culto-data")?.value;
  if(!congId||!data){ alert("Preencha os campos obrigatórios"); return; }
  const cong=CONG.getCong(congId);
  if(!cong) return;
  const culto={
    data, tipo:document.getElementById("culto-tipo")?.value||"",
    participantes:parseInt(document.getElementById("culto-participantes")?.value)||0,
    visitantes:parseInt(document.getElementById("culto-visitantes")?.value)||0,
    decisoes:parseInt(document.getElementById("culto-decisoes")?.value)||0,
    pregador:document.getElementById("culto-pregador")?.value||"",
    obs:document.getElementById("culto-obs")?.value||""
  };
  if(!cong.atividades_igreja.historico_cultos) cong.atividades_igreja.historico_cultos=[];
  cong.atividades_igreja.historico_cultos.unshift(culto);
  CONG.saveCong(cong);
  CONG.addCultoSupabase(congId, culto)
    .then(()=>{ if(typeof T==="function") T("☁ Sincronizado","Culto salvo no Supabase"); })
    .catch(e=>console.warn("CONG addCultoSupabase:", e.message));
  fecharModalNovoCulto();
  if(_activeCongId===congId) abrirCongView(congId);
  else if(document.getElementById("v-cong-dash")?.classList.contains("on")) renderDashboardGeral();
}
window.salvarNovoCulto=salvarNovoCulto;

function abrirModalNovoEvento(congId){
  const sel=document.getElementById("evento-cong-select");
  if(sel) sel.innerHTML=CONG.listCongs().map(c=>`<option value="${c.id}"${c.id===congId?" selected":""}>${escapeHtml(c.identificacao.nome)}</option>`).join("");
  ["evento-titulo","evento-data","evento-desc"].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=""; });
  const m=document.getElementById("modal-novo-evento"); if(m) m.style.display="flex";
}
window.abrirModalNovoEvento=abrirModalNovoEvento;

function fecharModalNovoEvento(){ const m=document.getElementById("modal-novo-evento"); if(m) m.style.display="none"; }
window.fecharModalNovoEvento=fecharModalNovoEvento;

function salvarNovoEvento(){
  const congId=document.getElementById("evento-cong-select")?.value;
  const titulo=document.getElementById("evento-titulo")?.value?.trim();
  const data=document.getElementById("evento-data")?.value;
  if(!congId||!titulo||!data){ alert("Preencha os campos obrigatórios"); return; }
  const cong=CONG.getCong(congId);
  if(!cong) return;
  cong.planejamento.eventos.push({titulo,data,tipo:document.getElementById("evento-tipo")?.value||"",descricao:document.getElementById("evento-desc")?.value||""});
  CONG.saveCong(cong);
  _sbSaveCong(cong);
  fecharModalNovoEvento();
  if(_activeCongId===congId) abrirCongView(congId);
}
window.salvarNovoEvento=salvarNovoEvento;

function abrirModalNovaDemandaCong(){
  const sel=document.getElementById("dem-cong-select");
  if(sel) sel.innerHTML=CONG.listCongs().map(c=>`<option value="${c.id}">${escapeHtml(c.identificacao.nome)}</option>`).join("");
  const m=document.getElementById("modal-nova-demanda-cong"); if(m) m.style.display="flex";
}
window.abrirModalNovaDemandaCong=abrirModalNovaDemandaCong;

function fecharModalNovaDemandaCong(){ const m=document.getElementById("modal-nova-demanda-cong"); if(m) m.style.display="none"; }
window.fecharModalNovaDemandaCong=fecharModalNovaDemandaCong;

function salvarNovaDemandaCong(){
  const titulo  = document.getElementById("dem-titulo")?.value?.trim();
  const congId  = document.getElementById("dem-cong-select")?.value;
  const congNome= document.getElementById("dem-cong-select")?.selectedOptions?.[0]?.text || "";
  const prio    = document.getElementById("dem-prioridade")?.value || "Média";
  const resp    = document.getElementById("dem-resp")?.value?.trim();
  const venc    = document.getElementById("dem-venc")?.value || null;
  const obs     = document.getElementById("dem-obs")?.value?.trim();

  if (!titulo) {
    if (typeof T === "function") T("Campo obrigatório", "Informe o título da demanda");
    return;
  }

  const _payload = {
    titulo,
    area:          "Congregações",
    subcategoria:  "Demanda de Congregação",
    descricao:     obs || "",
    prioridade:    prio,
    status:        "ABERTA",
    solicitante:   congNome || (congId ? `Congregação #${congId}` : ""),
    responsavel:   resp || "Secretaria / Administração",
    data_abertura: new Date().toISOString().split("T")[0],
    data_conclusao: venc,
  };
  apiWrite("create", "DEMANDAS", _payload).then(() => {
    if (typeof T === "function") T("✅ Demanda criada!", `Roteada para: ${resp || "Secretaria / Administração"}`);
    fecharModalNovaDemandaCong();
    if (typeof window.demRecarregarDash === "function") window.demRecarregarDash();
  }).catch(e => {
    if (typeof T === "function") T("Erro ao criar demanda", e.message || "Tente novamente");
    console.error("salvarNovaDemandaCong:", e);
  });
}
window.salvarNovaDemandaCong=salvarNovaDemandaCong;

function abrirModalNovoPG(){ if(typeof T==="function") T("Em desenvolvimento","Módulo de PGs em implementação"); }
window.abrirModalNovoPG=abrirModalNovoPG;
function abrirModalNovoMinisterio(){ if(typeof T==="function") T("Em desenvolvimento","Módulo de ministérios em implementação"); }
window.abrirModalNovoMinisterio=abrirModalNovoMinisterio;
function abrirModalNovoLider(){ if(typeof T==="function") T("Em desenvolvimento","Cadastro de líderes em implementação"); }
window.abrirModalNovoLider=abrirModalNovoLider;
function abrirModalNovoDesafio(){ if(typeof T==="function") T("Em desenvolvimento","Mapeamento de desafios em implementação"); }
window.abrirModalNovoDesafio=abrirModalNovoDesafio;

// ── Financeiro: lançamentos por congregação ────────────────────
let _lancTipo = "receita";
let _lancCongId = null;

async function _lancamentosLoad(congId) {
  if (!SUPABASE_URL || !congId) return [];
  try {
    const url = `${apiBaseUrl()}/rest/v1/congregacao_lancamentos?congregacao_id=eq.${encodeURIComponent(congId)}&deleted_at=is.null&order=data.desc&limit=200`;
    const r = await fetch(url, { headers: apiHeaders() });
    if (!r.ok) return [];
    return await r.json();
  } catch(e) { return []; }
}

async function renderTab_financeiro(cong, el) {
  const f = cong.financeiro;
  el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--tx3);font-size:12px">Carregando lançamentos...</div>`;

  const lancs = await _lancamentosLoad(cong.id);
  const receitas = lancs.filter(l => l.tipo === "receita");
  const despesas = lancs.filter(l => l.tipo === "despesa");
  const totalR = receitas.reduce((s,l) => s + Number(l.valor), 0);
  const totalD = despesas.reduce((s,l) => s + Number(l.valor), 0);
  const saldoR = totalR - totalD;

  const podeEditar = typeof USUARIO_ATUAL !== "undefined" &&
    (USUARIO_ATUAL?.perfil === "ADMINISTRADOR_GERAL" || USUARIO_ATUAL?.perfil === "LIDER_CONGREGACAO");

  const btnNovos = podeEditar ? `
    <div style="display:flex;gap:8px">
      <button class="tbt" style="background:rgba(58,170,92,0.1);border-color:rgba(58,170,92,0.3);color:var(--gr)"
        onclick="abrirModalNovoLancamento('${cong.id}','receita')">+ Nova Entrada</button>
      <button class="tbt" style="background:rgba(208,104,104,0.1);border-color:rgba(208,104,104,0.3);color:var(--rose)"
        onclick="abrirModalNovoLancamento('${cong.id}','despesa')">+ Nova Despesa</button>
    </div>` : "";

  const linhas = lancs.length === 0
    ? `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--tx3)">Nenhum lançamento registrado</td></tr>`
    : lancs.map(l => `
      <tr style="border-bottom:1px solid var(--bd1)">
        <td style="padding:7px 0;color:var(--tx3);font-size:11px">${l.data}</td>
        <td style="padding:7px 0">
          <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;
            background:${l.tipo==="receita"?"rgba(58,170,92,0.12)":"rgba(208,104,104,0.12)"};
            color:${l.tipo==="receita"?"var(--gr)":"var(--rose)"}">
            ${l.tipo === "receita" ? "Entrada" : "Despesa"}
          </span>
        </td>
        <td style="padding:7px 8px;font-size:11.5px;color:var(--tx2)">${escapeHtml(l.descricao || l.categoria || "—")}</td>
        <td style="padding:7px 0;text-align:right;font-weight:700;
          color:${l.tipo==="receita"?"var(--gr)":"var(--rose)"}">
          ${l.tipo==="receita"?"+":"-"} R$ ${Number(l.valor).toLocaleString("pt-BR",{minimumFractionDigits:2})}
        </td>
        <td style="padding:7px 0 7px 8px;font-size:10px;color:var(--tx3)">${escapeHtml(l.categoria||"")}</td>
      </tr>`).join("");

  el.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-top:14px;margin-bottom:12px;flex-wrap:wrap">
      <div class="kpis c3" style="flex:1;margin:0">
        <div class="kpi"><div class="kn">Entradas</div>
          <div class="kv" style="color:var(--gr)">R$ ${totalR.toLocaleString("pt-BR",{minimumFractionDigits:2})}</div></div>
        <div class="kpi"><div class="kn">Despesas</div>
          <div class="kv" style="color:var(--rose)">R$ ${totalD.toLocaleString("pt-BR",{minimumFractionDigits:2})}</div></div>
        <div class="kpi"><div class="kn">Saldo</div>
          <div class="kv" style="color:${saldoR>=0?"var(--gr)":"var(--rose)"}">R$ ${saldoR.toLocaleString("pt-BR",{minimumFractionDigits:2})}</div></div>
      </div>
      ${btnNovos}
    </div>
    <div class="card">
      <div class="ctit">Lançamentos <span style="font-weight:400;color:var(--tx3);font-size:11px">(${lancs.length} registros)</span></div>
      <div style="overflow-x:auto">
        <table style="width:100%;font-size:11.5px;border-collapse:collapse">
          <thead><tr style="border-bottom:1px solid var(--bd1)">
            <th style="text-align:left;padding:6px 0;color:var(--tx3);font-weight:600;min-width:80px">Data</th>
            <th style="text-align:left;padding:6px 0;color:var(--tx3);font-weight:600">Tipo</th>
            <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Descrição</th>
            <th style="text-align:right;padding:6px 0;color:var(--tx3);font-weight:600">Valor</th>
            <th style="text-align:left;padding:6px 0 6px 8px;color:var(--tx3);font-weight:600">Categoria</th>
          </tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    </div>
  `;
}

function abrirModalNovoLancamento(congId, tipo) {
  _lancCongId = congId;
  _lancTipo   = tipo || "receita";
  const tituloEl = document.getElementById("lanc-tipo-titulo");
  if (tituloEl) tituloEl.textContent = tipo === "receita" ? "Nova Entrada" : "Nova Despesa";
  const tipoEl = document.getElementById("lanc-tipo-hidden");
  if (tipoEl) tipoEl.value = _lancTipo;
  ["lanc-data","lanc-valor","lanc-categoria","lanc-descricao","lanc-obs"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === "lanc-data" ? new Date().toISOString().slice(0,10) : "";
  });
  const m = document.getElementById("modal-novo-lancamento");
  if (m) m.style.display = "flex";
}
window.abrirModalNovoLancamento = abrirModalNovoLancamento;

function fecharModalNovoLancamento() {
  const m = document.getElementById("modal-novo-lancamento");
  if (m) m.style.display = "none";
}
window.fecharModalNovoLancamento = fecharModalNovoLancamento;

async function salvarNovoLancamento() {
  const data      = document.getElementById("lanc-data")?.value;
  const valor     = parseFloat(document.getElementById("lanc-valor")?.value);
  const categoria = document.getElementById("lanc-categoria")?.value?.trim() || "";
  const descricao = document.getElementById("lanc-descricao")?.value?.trim() || "";
  const obs       = document.getElementById("lanc-obs")?.value?.trim() || "";

  if (!data || !valor || valor <= 0) {
    if (typeof T === "function") T("Campos obrigatórios", "Informe data e valor");
    return;
  }
  if (!_lancCongId) return;

  const payload = { congregacao_id: _lancCongId, data, tipo: _lancTipo, categoria, descricao, valor, obs };
  try {
    const url = `${apiBaseUrl()}/rest/v1/congregacao_lancamentos`;
    const r = await fetch(url, {
      method: "POST",
      headers: apiHeaders({ "Prefer": "return=minimal" }),
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error(await r.text());
    fecharModalNovoLancamento();
    if (typeof T === "function") T("Lançamento salvo", `${_lancTipo === "receita" ? "Entrada" : "Despesa"} registrada`);
    const cong = CONG.getCong(_lancCongId);
    if (cong) renderTab_financeiro(cong, document.getElementById("cong-tab-content"));
  } catch(e) {
    if (typeof T === "function") T("Erro ao salvar", e.message || "Tente novamente");
  }
}
window.salvarNovoLancamento = salvarNovoLancamento;

// ── Hook no go() ──────────────────────────────────────
(function(){
  const _orig=window.go;
  window.go=async function(id){
    await _orig(id);
    if(id==="cong-dash") setTimeout(renderDashboardGeral,0);
  };
})();

// ── Supabase sync helper ──────────────────────────────
function _sbSaveCong(cong){
  CONG.saveToSupabase(cong)
    .then(()=>{ if(typeof T==="function") T("☁ Sincronizado","Congregação salva no Supabase"); })
    .catch(e=>{ console.warn("CONG saveToSupabase:", e.message); });
}

// ── Init local (sem chamada à API — evita 401 para usuários sem permissão) ─
buildCongMenu();
try{
  if(document.getElementById("v-cong-dash")?.classList.contains("on")) renderDashboardGeral();
}catch(e){}

// Sync remoto: chamado sob demanda ao navegar para a tela (ver go() em auth.js)
window._congSyncOnNav = function(){
  CONG.syncFromSupabase()
    .then(ok=>{
      if(!ok) return;
      buildCongMenu();
      if(document.getElementById("v-cong-dash")?.classList.contains("on")) renderDashboardGeral();
      if(_activeCongId){
        const c=CONG.getCong(_activeCongId);
        if(c) renderCongView(c);
      }
    })
    .catch(()=>{});
};

})();
