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

const _CONG_TAB_NOMES=["Visão Geral","Membresia","Cultos e Oração","Pequenos Grupos","Ministérios","Liderança","Financeiro","Desafios","Planejamento","Agenda","Departamentos"];

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

// ── Permissões ────────────────────────────────────────
function _podeEditar(congId){
  if(typeof USUARIO_ATUAL==="undefined"||!USUARIO_ATUAL) return false;
  const p=USUARIO_ATUAL?.perfil||"";
  if(["ADMINISTRADOR_GERAL","GESTOR"].includes(p)) return true;
  if(p==="LIDER_CONGREGACAO") return String(USUARIO_ATUAL.congregacao_id)===String(congId);
  return false;
}
function _isLiderCong(){ return typeof USUARIO_ATUAL!=="undefined"&&USUARIO_ATUAL?.perfil==="LIDER_CONGREGACAO"; }

// ── Sidebar dinâmica ──────────────────────────────────
function buildCongMenu(){
  const msub=document.getElementById("ms-cong");
  if(!msub) return;
  msub.querySelectorAll(".si-cong-item,.sdiv-cong,.si-cong-sub").forEach(el=>el.remove());

  const dashLink=document.getElementById("sb-cong-dash-link");
  if(dashLink) dashLink.style.display=_isLiderCong()?"none":"block";

  // Para LIDER: header não é retrátil e mostra o nome da congregação
  const mhdr=document.querySelector("#mw-cong .mhdr");
  if(mhdr){
    const mname=mhdr.querySelector(".mname");
    if(_isLiderCong()){
      mhdr.onclick=null;
      mhdr.style.pointerEvents="none";
      mhdr.style.cursor="default";
      const marr=mhdr.querySelector(".marr");
      if(marr) marr.style.display="none";
      const congNome=CONG.listCongs().find(c=>String(c.id)===String(USUARIO_ATUAL?.congregacao_id))?.identificacao?.nome;
      if(mname && congNome) mname.textContent=congNome;
    } else {
      mhdr.onclick=()=>tog("cong");
      mhdr.style.pointerEvents="";
      mhdr.style.cursor="";
      const marr=mhdr.querySelector(".marr");
      if(marr) marr.style.display="";
      if(mname) mname.textContent="Congregações";
    }
  }

  const allCongs=CONG.listCongs();
  const congs=_isLiderCong()
    ?allCongs.filter(c=>String(c.id)===String(USUARIO_ATUAL?.congregacao_id))
    :allCongs;
  if(congs.length===0) return;

  const divider=document.createElement("div");
  divider.className="sdiv sdiv-cong";
  msub.appendChild(divider);

  congs.forEach(c=>{
    if(_isLiderCong()){
      // Nome da congregação como rótulo estático (não clicável)
      const label=document.createElement("div");
      label.className="si-cong-item";
      label.style.cssText="padding:8px 12px 4px;font-size:10.5px;font-weight:700;color:var(--tx3);letter-spacing:.04em;text-transform:uppercase;cursor:default";
      label.textContent=c.identificacao.nome;
      msub.appendChild(label);

      // Itens de cada aba como entradas planas no menu
      _CONG_TAB_NOMES.forEach((nome,idx)=>{
        const sub=document.createElement("div");
        sub.className="si si-cong-sub";
        sub.setAttribute("data-cong-tab",idx);
        if(idx===_activeTab) sub.classList.add("ativo");
        sub.textContent=nome;
        sub.onclick=()=>irParaSecaoCong(idx);
        msub.appendChild(sub);
      });
    } else {
      const el=document.createElement("div");
      el.className="si si-cong-item";
      el.innerHTML=`<span style="margin-right:6px;font-size:11px">${escapeHtml(c.identificacao.icon||"⛪")}</span>${escapeHtml(c.identificacao.nome)}`;
      if(_activeCongId===c.id) el.classList.add("ativo");
      el.onclick=()=>abrirCongView(c.id);
      msub.appendChild(el);
    }
  });
}
window.buildCongMenu=buildCongMenu;

// ── Navega entre seções no menu lateral (LIDER_CONGREGACAO) ──
function irParaSecaoCong(i){
  _activeTab=i;
  document.querySelectorAll("#ms-cong .si-cong-sub").forEach((sub,idx)=>{
    sub.classList.toggle("ativo",idx===i);
  });
  document.querySelectorAll("#cong-tabs-bar .citab").forEach((tab,idx)=>{
    tab.classList.toggle("on",idx===i);
  });
  const cong=CONG.getCong(_activeCongId);
  if(cong) renderCongTab(i,cong);
}
window.irParaSecaoCong=irParaSecaoCong;

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

  let cong=CONG.getCong(id);

  // Cache miss: tenta resync (caso seja chamado independente do fluxo de login)
  if(!cong){
    try{ await CONG.syncFromSupabase(); }catch(e){}
    cong=CONG.getCong(id);
    buildCongMenu();
  }

  // Último recurso: busca direta por UUID, converte para formato JS e salva no cache
  if(!cong){
    try{
      const r=await fetch(`${apiBaseUrl()}/rest/v1/congregacoes?id=eq.${encodeURIComponent(id)}&deleted_at=is.null&select=*`,{headers:apiHeaders()});
      if(r.ok){
        const rows=await r.json();
        if(Array.isArray(rows)&&rows.length>0){
          const converted=CONG.rowToCong(rows[0],[]);
          CONG.saveCong(converted);
          cong=CONG.getCong(id);
        }
      }
    }catch(e){}
  }

  // Navega para a view (necessário quando chamado a partir da sidebar)
  if(typeof go==="function") await go("cong-ver");

  if(!cong){
    const el=document.getElementById("v-cong-ver");
    if(el) el.innerHTML=`<div class="ct" style="text-align:center;padding:60px;color:var(--tx3)">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--tx1)">Não foi possível carregar a congregação</div>
      <div style="font-size:11px;margin-bottom:16px">Verifique sua conexão ou contate o administrador.</div>
      <button class="tbt pri" onclick="abrirCongView('${id}')">Tentar novamente</button>
    </div>`;
    return;
  }

  if(typeof CRUMB!=="undefined") CRUMB["cong-ver"]=["cong","Congregações",cong.identificacao.nome];
  renderCongView(cong);
}
window.abrirCongView=abrirCongView;

function renderCongView(cong){
  const el=document.getElementById("v-cong-ver");
  if(!el) return;
  const id=cong.id;
  const hero=`
    <div class="hero">
      <div class="hero-ic" style="background:${cong.identificacao.cor}22;border-color:${cong.identificacao.cor}55">${cong.identificacao.icon||"⛪"}</div>
      <div>
        <div class="hero-lbl">Congregações</div>
        <div class="hero-ttl">${escapeHtml(cong.identificacao.nome)}</div>
        <div class="hero-dsc">${escapeHtml(cong.identificacao.localizacao||"")}${cong.identificacao.localizacao?" — ":""}${statusBadge(cong.identificacao.status)}</div>
      </div>
      <div class="hero-act">
        ${!_isLiderCong()?`<button class="tbt" onclick="go('cong-dash')">← Dashboard</button>`:""}
        ${_podeEditar(id)?`<button class="tbt pri" onclick="abrirModalEditarCong('${id}')">Editar</button>`:""}
      </div>
    </div>`;

  if(_isLiderCong()){
    // Sem barra de abas no conteúdo — navegação está no menu lateral
    el.innerHTML=`${hero}<div class="ct" style="padding-top:0"><div id="cong-tab-content" style="padding-top:2px"></div></div>`;
  } else {
    // Com barra de abas para perfis administrativos
    el.innerHTML=`${hero}
    <div class="ct" style="padding-top:0">
      <div class="citabs" id="cong-tabs-bar">
        ${_CONG_TAB_NOMES.map((t,i)=>`<div class="citab${i===_activeTab?" on":""}" onclick="switchCongTab(${i})">${t}</div>`).join("")}
      </div>
      <div id="cong-tab-content" style="padding-top:2px"></div>
    </div>`;
  }
  renderCongTab(_activeTab,cong);
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
    renderTab_financeiro, renderTab_desafios, renderTab_planejamento,
    renderTab_agenda, renderTab_departamentos
  ];
  el.innerHTML="";
  const r=renderers[i];
  if(r){ const p=r(cong,el); if(p instanceof Promise) p.catch(e=>console.warn("cong-tab",i,e)); }
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
async function _membrosLoad(congId){
  if(!congId) return [];
  try{
    const r=await fetch(`${apiBaseUrl()}/rest/v1/rpc/listar_membros_congregacao`,{
      method:"POST",
      headers:apiHeaders(),
      body:JSON.stringify({p_congregacao_id:congId})
    });
    if(!r.ok){ console.warn("listar_membros_congregacao erro",r.status,await r.text()); return []; }
    return await r.json();
  }catch(e){ console.error("_membrosLoad:",e); return []; }
}

async function renderTab_membresia(cong, el){
  const m=cong.panorama_membresia;
  const total=m.membros_ativos+(m.membros_cooperadores||0)||1;
  const podeEd=_podeEditar(cong.id);

  el.innerHTML=`
    <div class="kpis c4" style="margin-top:14px">
      <div class="kpi"><div class="kn">Membros Ativos</div><div class="kv">${m.membros_ativos}</div></div>
      <div class="kpi"><div class="kn">Cooperadores</div><div class="kv">${m.membros_cooperadores||0}</div></div>
      <div class="kpi"><div class="kn">Batizados/Ano</div><div class="kv" style="color:var(--gr)">${m.batizados_ano}</div></div>
      <div class="kpi"><div class="kn">Meta ${new Date().getFullYear()}</div><div class="kv">${m.meta_membros||"—"}</div></div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="ctit" style="display:flex;justify-content:space-between;align-items:center">
        Membros Vinculados
        <div style="display:flex;gap:8px">
          <span id="cong-mbr-count" style="font-size:11px;color:var(--tx3);font-weight:400"></span>
          ${podeEd?`<button class="tbt" style="font-size:10px;padding:4px 9px" onclick="abrirModalVincularMembro('${cong.id}')">+ Vincular Membro</button>`:""}
        </div>
      </div>
      <div id="cong-mbr-lista" style="min-height:40px"><div style="color:var(--tx3);font-size:11px;padding:8px 0">Carregando...</div></div>
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

  const membros=await _membrosLoad(cong.id);
  const listaEl=document.getElementById("cong-mbr-lista");
  const countEl=document.getElementById("cong-mbr-count");
  if(!listaEl) return;
  if(countEl) countEl.textContent=`${membros.length} cadastrado(s)`;
  listaEl.innerHTML=membros.length===0
    ?`<div style="color:var(--tx3);font-size:11px;padding:8px 0">Nenhum membro vinculado a esta congregação ainda.</div>`
    :membros.map(mb=>{
      const nome=mb.nome||`Membro #${mb.pessoa_id?.slice(0,6)}`;
      const sub=[mb.email,mb.telefone].filter(Boolean).join(" · ");
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
        <div style="width:30px;height:30px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gr);flex-shrink:0">${iniciais(nome)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:11.5px;font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(nome)}</div>
          ${sub?`<div style="font-size:10px;color:var(--tx3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(sub)}</div>`:""}
          ${mb.funcao?`<div style="font-size:10px;color:var(--tx3)">${escapeHtml(mb.funcao)}</div>`:""}
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          ${statusBadge(mb.status||"ativo")}
          ${podeEd?`<button class="tbt" style="font-size:9px;padding:2px 6px;color:var(--rose)" onclick="desvincularMembroCong('${mb.id}','${cong.id}')">Remover</button>`:""}
        </div>
      </div>`;
    }).join("");
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
          ${_podeEditar(cong.id)?`<button class="tbt" style="font-size:10px;padding:4px 9px" onclick="abrirModalNovoCulto('${cong.id}')">+ Registrar Culto</button>`:""}
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
      ${_podeEditar(cong.id)?`<button class="tbt pri" onclick="abrirModalNovoPG('${cong.id}')">+ Novo Grupo</button>`:""}
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
      ${_podeEditar(cong.id)?`<button class="tbt pri" onclick="abrirModalNovoMinisterio('${cong.id}')">+ Novo Ministério</button>`:""}
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
      ${_podeEditar(cong.id)?`<button class="tbt pri" onclick="abrirModalNovoDesafio('${cong.id}')">+ Novo Desafio</button>`:""}
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
          ${_podeEditar(cong.id)?`<button class="tbt" style="font-size:10px;padding:4px 9px" onclick="abrirModalNovoEvento('${cong.id}')">+ Evento</button>`:""}
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
  if(sel){
    const lista=_isLiderCong()
      ? CONG.listCongs().filter(c=>String(c.id)===String(USUARIO_ATUAL?.congregacao_id))
      : CONG.listCongs();
    sel.innerHTML=lista.map(c=>`<option value="${c.id}"${c.id===congId?" selected":""}>${escapeHtml(c.identificacao.nome)}</option>`).join("");
  }
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
  if(sel){
    const lista=_isLiderCong()
      ? CONG.listCongs().filter(c=>String(c.id)===String(USUARIO_ATUAL?.congregacao_id))
      : CONG.listCongs();
    sel.innerHTML=lista.map(c=>`<option value="${c.id}"${c.id===congId?" selected":""}>${escapeHtml(c.identificacao.nome)}</option>`).join("");
  }
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
  if(_activeCongId===congId) irParaSecaoCong(8);
}
window.salvarNovoEvento=salvarNovoEvento;

function abrirModalNovaDemandaCong(){
  const sel=document.getElementById("dem-cong-select");
  if(sel){
    const lista=_isLiderCong()
      ? CONG.listCongs().filter(c=>String(c.id)===String(USUARIO_ATUAL?.congregacao_id))
      : CONG.listCongs();
    sel.innerHTML=lista.map(c=>`<option value="${c.id}">${escapeHtml(c.identificacao.nome)}</option>`).join("");
  }
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

// ── Pequenos Grupos ────────────────────────────────────────────
function abrirModalNovoPG(congId){
  _pgCongId=congId||_activeCongId;
  ["pg-nome","pg-lider","pg-dia","pg-horario","pg-local"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  const m=document.getElementById("pg-membros");if(m)m.value="0";
  const s=document.getElementById("pg-status");if(s)s.value="ativo";
  const modal=document.getElementById("modal-novo-pg");if(modal)modal.style.display="flex";
}
window.abrirModalNovoPG=abrirModalNovoPG;
function fecharModalNovoPG(){ const m=document.getElementById("modal-novo-pg");if(m)m.style.display="none"; }
window.fecharModalNovoPG=fecharModalNovoPG;
function salvarNovoPG(){
  const nome=document.getElementById("pg-nome")?.value?.trim();
  const lider=document.getElementById("pg-lider")?.value?.trim();
  if(!nome||!lider){ if(typeof T==="function") T("Campos obrigatórios","Informe nome e líder do grupo"); return; }
  const cong=CONG.getCong(_pgCongId);
  if(!cong) return;
  cong.pequenos_grupos.grupos.push({
    nome, lider,
    dia:    document.getElementById("pg-dia")?.value||"",
    horario:document.getElementById("pg-horario")?.value||"",
    local:  document.getElementById("pg-local")?.value||"",
    membros:parseInt(document.getElementById("pg-membros")?.value)||0,
    status: document.getElementById("pg-status")?.value||"ativo"
  });
  cong.pequenos_grupos.total_grupos=cong.pequenos_grupos.grupos.length;
  CONG.saveCong(cong); _sbSaveCong(cong);
  fecharModalNovoPG();
  if(typeof T==="function") T("Grupo criado",nome);
  _activeCongId=_pgCongId; irParaSecaoCong(3);
}
window.salvarNovoPG=salvarNovoPG;

// ── Ministérios ───────────────────────────────────────────────
function abrirModalNovoMinisterio(congId){
  _minCongId=congId||_activeCongId;
  ["min-cong-nome","min-cong-lider"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  const m=document.getElementById("min-cong-membros");if(m)m.value="0";
  const s=document.getElementById("min-cong-status");if(s)s.value="ativo";
  const modal=document.getElementById("modal-novo-ministerio-cong");if(modal)modal.style.display="flex";
}
window.abrirModalNovoMinisterio=abrirModalNovoMinisterio;
function fecharModalNovoMinistrioCong(){ const m=document.getElementById("modal-novo-ministerio-cong");if(m)m.style.display="none"; }
window.fecharModalNovoMinistrioCong=fecharModalNovoMinistrioCong;
function salvarNovoMinistrioCong(){
  const nome=document.getElementById("min-cong-nome")?.value?.trim();
  if(!nome){ if(typeof T==="function") T("Campo obrigatório","Informe o nome do ministério"); return; }
  const cong=CONG.getCong(_minCongId);
  if(!cong) return;
  cong.ministerios.lista.push({
    nome,
    lider:  document.getElementById("min-cong-lider")?.value?.trim()||"",
    membros:parseInt(document.getElementById("min-cong-membros")?.value)||0,
    status: document.getElementById("min-cong-status")?.value||"ativo"
  });
  CONG.saveCong(cong); _sbSaveCong(cong);
  fecharModalNovoMinistrioCong();
  if(typeof T==="function") T("Ministério criado",nome);
  _activeCongId=_minCongId; irParaSecaoCong(4);
}
window.salvarNovoMinistrioCong=salvarNovoMinistrioCong;

// ── Liderança ─────────────────────────────────────────────────
function abrirModalNovoLider(){ if(typeof T==="function") T("Em desenvolvimento","Edição de liderança em breve"); }
window.abrirModalNovoLider=abrirModalNovoLider;

// ── Desafios ──────────────────────────────────────────────────
function abrirModalNovoDesafio(congId){
  _desCongId=congId||_activeCongId;
  ["des-titulo","des-descricao"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  const p=document.getElementById("des-prioridade");if(p)p.value="Média";
  const s=document.getElementById("des-status");if(s)s.value="identificado";
  const modal=document.getElementById("modal-novo-desafio");if(modal)modal.style.display="flex";
}
window.abrirModalNovoDesafio=abrirModalNovoDesafio;
function fecharModalNovoDesafio(){ const m=document.getElementById("modal-novo-desafio");if(m)m.style.display="none"; }
window.fecharModalNovoDesafio=fecharModalNovoDesafio;
function salvarNovoDesafio(){
  const titulo=document.getElementById("des-titulo")?.value?.trim();
  if(!titulo){ if(typeof T==="function") T("Campo obrigatório","Informe o título do desafio"); return; }
  const cong=CONG.getCong(_desCongId);
  if(!cong) return;
  cong.desafios.lista.push({
    titulo,
    descricao: document.getElementById("des-descricao")?.value?.trim()||"",
    prioridade:document.getElementById("des-prioridade")?.value||"Média",
    status:    document.getElementById("des-status")?.value||"identificado"
  });
  CONG.saveCong(cong); _sbSaveCong(cong);
  fecharModalNovoDesafio();
  if(typeof T==="function") T("Desafio registrado",titulo);
  _activeCongId=_desCongId; irParaSecaoCong(7);
}
window.salvarNovoDesafio=salvarNovoDesafio;

// ── Financeiro: lançamentos por congregação ────────────────────
let _lancTipo = "receita";
let _lancCongId = null;
let _finMes = new Date().getMonth();
let _finAno = new Date().getFullYear();
let _finAllLancs = null;
let _finCongId = null;

const _MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                   "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

async function _lancamentosLoad(congId) {
  if (!SUPABASE_URL || !congId) return [];
  try {
    const url = `${apiBaseUrl()}/rest/v1/congregacao_lancamentos?congregacao_id=eq.${encodeURIComponent(congId)}&deleted_at=is.null&order=data.desc&limit=500`;
    const r = await fetch(url, { headers: apiHeaders() });
    if (!r.ok) return [];
    return await r.json();
  } catch(e) { return []; }
}

async function renderTab_financeiro(cong, el) {
  if (_finCongId !== cong.id) {
    _finCongId = cong.id;
    _finAllLancs = null;
    _finMes = new Date().getMonth();
    _finAno = new Date().getFullYear();
  }
  el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--tx3);font-size:12px">Carregando lançamentos...</div>`;
  if (!_finAllLancs) {
    _finAllLancs = await _lancamentosLoad(cong.id);
  }
  _renderFinanceiroPorMes(cong, el);
}

function _renderFinanceiroPorMes(cong, el) {
  const podeEditar = typeof USUARIO_ATUAL !== "undefined" &&
    (USUARIO_ATUAL?.perfil === "ADMINISTRADOR_GERAL" || USUARIO_ATUAL?.perfil === "LIDER_CONGREGACAO");

  const lancs = _finAllLancs || [];
  const fmt = v => `R$ ${Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2})}`;

  const lancsDoMes = lancs.filter(l => {
    if (!l.data) return false;
    const d = new Date(l.data + "T00:00:00");
    return d.getMonth() === _finMes && d.getFullYear() === _finAno;
  });

  const totalR = lancsDoMes.filter(l => l.tipo === "receita").reduce((s,l) => s + Number(l.valor), 0);
  const totalD = lancsDoMes.filter(l => l.tipo === "despesa").reduce((s,l) => s + Number(l.valor), 0);
  const saldoMes = totalR - totalD;

  const saldoAcum = lancs.filter(l => {
    if (!l.data) return false;
    const d = new Date(l.data + "T00:00:00");
    const y = d.getFullYear(), m = d.getMonth();
    return y < _finAno || (y === _finAno && m <= _finMes);
  }).reduce((s,l) => s + (l.tipo === "receita" ? Number(l.valor) : -Number(l.valor)), 0);

  const btnNovos = podeEditar ? `
    <div style="display:flex;gap:8px;flex-shrink:0">
      <button class="tbt" style="background:rgba(58,170,92,0.1);border-color:rgba(58,170,92,0.3);color:var(--gr)"
        onclick="abrirModalNovoLancamento('${cong.id}','receita')">+ Entrada</button>
      <button class="tbt" style="background:rgba(208,104,104,0.1);border-color:rgba(208,104,104,0.3);color:var(--rose)"
        onclick="abrirModalNovoLancamento('${cong.id}','despesa')">+ Despesa</button>
    </div>` : "";

  const linhas = lancsDoMes.length === 0
    ? `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--tx3)">Nenhum lançamento neste mês</td></tr>`
    : lancsDoMes.map(l => {
        const isR = l.tipo === "receita";
        const dataFmt = l.data ? new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR") : "—";
        return `<tr style="border-bottom:1px solid var(--bd1)">
          <td style="padding:7px 8px 7px 0;color:var(--tx3);font-size:11px;white-space:nowrap">${dataFmt}</td>
          <td style="padding:7px 0">
            <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;
              background:${isR?"rgba(58,170,92,0.12)":"rgba(208,104,104,0.12)"};
              color:${isR?"var(--gr)":"var(--rose)"}">
              ${isR ? "Entrada" : "Despesa"}
            </span>
          </td>
          <td style="padding:7px 8px;font-size:11.5px;color:var(--tx2);max-width:160px">${escapeHtml(l.descricao||"—")}</td>
          <td style="padding:7px 8px;font-size:11px;color:var(--tx3)">${escapeHtml(l.categoria||"—")}</td>
          <td style="padding:7px 8px;font-size:11px;color:var(--tx3)">${escapeHtml(l.responsavel||"—")}</td>
          <td style="padding:7px 0;text-align:right;font-weight:700;white-space:nowrap;color:${isR?"var(--gr)":"var(--rose)"}">
            ${isR?"+":"-"} ${fmt(l.valor)}
          </td>
          <td style="padding:7px 0 7px 8px;font-size:10px;color:var(--tx3);max-width:120px">${escapeHtml(l.obs||"—")}</td>
        </tr>`;
      }).join("");

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;margin-bottom:14px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:8px">
        <button class="tbt" onclick="navegarFinMes(-1)" style="padding:5px 12px;font-size:15px;line-height:1">&#8592;</button>
        <span style="font-weight:700;font-size:14px;min-width:148px;text-align:center">${_MESES_PT[_finMes]} ${_finAno}</span>
        <button class="tbt" onclick="navegarFinMes(1)" style="padding:5px 12px;font-size:15px;line-height:1">&#8594;</button>
      </div>
      ${btnNovos}
    </div>
    <div class="kpis c4" style="margin-bottom:16px">
      <div class="kpi"><div class="kn">Entradas do Mês</div>
        <div class="kv" style="color:var(--gr)">${fmt(totalR)}</div></div>
      <div class="kpi"><div class="kn">Despesas do Mês</div>
        <div class="kv" style="color:var(--rose)">${fmt(totalD)}</div></div>
      <div class="kpi"><div class="kn">Saldo do Mês</div>
        <div class="kv" style="color:${saldoMes>=0?"var(--gr)":"var(--rose)"}">${fmt(saldoMes)}</div></div>
      <div class="kpi"><div class="kn">Saldo Acumulado</div>
        <div class="kv" style="color:${saldoAcum>=0?"var(--gr)":"var(--rose)"}">${fmt(saldoAcum)}</div></div>
    </div>
    <div class="card">
      <div class="ctit">${_MESES_PT[_finMes]} ${_finAno}
        <span style="font-weight:400;color:var(--tx3);font-size:11px">${lancsDoMes.length} lançamento${lancsDoMes.length!==1?"s":""}</span>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;font-size:11.5px;border-collapse:collapse">
          <thead><tr style="border-bottom:1px solid var(--bd1)">
            <th style="text-align:left;padding:6px 8px 6px 0;color:var(--tx3);font-weight:600;white-space:nowrap">Data</th>
            <th style="text-align:left;padding:6px 0;color:var(--tx3);font-weight:600">Tipo</th>
            <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Descrição</th>
            <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Categoria</th>
            <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Responsável</th>
            <th style="text-align:right;padding:6px 0;color:var(--tx3);font-weight:600">Valor</th>
            <th style="text-align:left;padding:6px 0 6px 8px;color:var(--tx3);font-weight:600">Obs</th>
          </tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    </div>
  `;
}

function navegarFinMes(delta) {
  _finMes += delta;
  if (_finMes < 0)  { _finMes = 11; _finAno--; }
  if (_finMes > 11) { _finMes = 0;  _finAno++; }
  const el  = document.getElementById("cong-tab-content");
  const cong = CONG.getCong(_finCongId);
  if (el && cong) _renderFinanceiroPorMes(cong, el);
}
window.navegarFinMes = navegarFinMes;

function abrirModalNovoLancamento(congId, tipo) {
  _lancCongId = congId;
  _lancTipo   = tipo || "receita";
  const tituloEl = document.getElementById("lanc-tipo-titulo");
  if (tituloEl) tituloEl.textContent = tipo === "receita" ? "Nova Entrada" : "Nova Despesa";
  const tipoEl = document.getElementById("lanc-tipo-hidden");
  if (tipoEl) tipoEl.value = _lancTipo;
  ["lanc-data","lanc-valor","lanc-categoria","lanc-descricao","lanc-responsavel","lanc-obs"].forEach(id => {
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
  const data        = document.getElementById("lanc-data")?.value;
  const valor       = parseFloat(document.getElementById("lanc-valor")?.value);
  const categoria   = document.getElementById("lanc-categoria")?.value?.trim() || "";
  const descricao   = document.getElementById("lanc-descricao")?.value?.trim() || "";
  const responsavel = document.getElementById("lanc-responsavel")?.value?.trim() || "";
  const obs         = document.getElementById("lanc-obs")?.value?.trim() || "";

  if (!data || !valor || valor <= 0) {
    if (typeof T === "function") T("Campos obrigatórios", "Informe data e valor");
    return;
  }
  if (!_lancCongId) return;

  const payload = { congregacao_id: _lancCongId, data, tipo: _lancTipo, categoria, descricao, responsavel, valor, obs };
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
    // Sync selected month to match saved lancamento's date
    const savedDate = new Date(data + "T00:00:00");
    _finMes = savedDate.getMonth();
    _finAno = savedDate.getFullYear();
    _finAllLancs = null; // force reload from DB
    const cong = CONG.getCong(_lancCongId);
    if (cong) renderTab_financeiro(cong, document.getElementById("cong-tab-content"));
  } catch(e) {
    if (typeof T === "function") T("Erro ao salvar", e.message || "Tente novamente");
  }
}
window.salvarNovoLancamento = salvarNovoLancamento;

// ── Estado dos novos contextos ────────────────────────
let _pgCongId=null, _minCongId=null, _desCongId=null;

// ── Vincular Membro ────────────────────────────────────────────
let _vmCongId=null, _vmTimer=null;

function abrirModalVincularMembro(congId){
  _vmCongId=congId||_activeCongId;
  const input=document.getElementById("vm-busca");
  if(input) input.value="";
  const res=document.getElementById("vm-resultados");
  if(res) res.innerHTML=`<div style="color:var(--tx3);font-size:11px;padding:20px 0;text-align:center">Digite para buscar</div>`;
  const m=document.getElementById("modal-vincular-membro");
  if(m) m.style.display="flex";
  setTimeout(()=>input?.focus(),80);
}
window.abrirModalVincularMembro=abrirModalVincularMembro;

function fecharModalVincularMembro(){
  const m=document.getElementById("modal-vincular-membro");
  if(m) m.style.display="none";
}
window.fecharModalVincularMembro=fecharModalVincularMembro;

function _vmBuscaDebounce(){
  clearTimeout(_vmTimer);
  _vmTimer=setTimeout(_vmBuscar,350);
}
window._vmBuscaDebounce=_vmBuscaDebounce;

async function _vmBuscar(){
  const q=(document.getElementById("vm-busca")?.value||"").trim();
  const res=document.getElementById("vm-resultados");
  if(!res) return;
  if(q.length<2){
    res.innerHTML=`<div style="color:var(--tx3);font-size:11px;padding:20px 0;text-align:center">Digite ao menos 2 caracteres</div>`;
    return;
  }
  res.innerHTML=`<div style="color:var(--tx3);font-size:11px;padding:20px 0;text-align:center">Buscando...</div>`;
  try{
    const pUrl=`${apiBaseUrl()}/rest/v1/pessoas?nome=ilike.*${encodeURIComponent(q)}*&select=id,nome,email,telefone,data_nascimento&order=nome.asc&limit=30`;
    const pRes=await fetch(pUrl,{headers:apiHeaders()});
    if(!pRes.ok){ res.innerHTML=`<div style="color:var(--rose);font-size:11px;padding:20px 0;text-align:center">Erro ao buscar membros</div>`; return; }
    const pessoas=await pRes.json();
    if(pessoas.length===0){
      res.innerHTML=`<div style="color:var(--tx3);font-size:11px;padding:20px 0;text-align:center">Nenhum cadastro encontrado para "${escapeHtml(q)}"</div>`;
      return;
    }
    // Busca vínculos existentes para essas pessoas
    const ids=pessoas.map(p=>p.id).join(",");
    const mUrl=`${apiBaseUrl()}/rest/v1/membros?pessoa_id=in.(${ids})&deleted_at=is.null&select=id,pessoa_id,congregacao_id,status`;
    const mRes=await fetch(mUrl,{headers:apiHeaders()});
    const membros=mRes.ok?await mRes.json():[];
    const mbrMap={};
    membros.forEach(mb=>{ mbrMap[mb.pessoa_id]=mb; });
    // Monta nomes das congregações para membros já vinculados a outra
    const congs=CONG.listCongs();
    const _congNome=id=>{ const c=congs.find(c=>String(c.id)===String(id)); return c?c.identificacao.nome:`Congregação #${String(id).slice(0,6)}`; };
    res.innerHTML=pessoas.map(p=>{
      const mb=mbrMap[p.id];
      const jaVinculado=mb&&String(mb.congregacao_id)===String(_vmCongId);
      const outraCong=mb&&mb.congregacao_id&&String(mb.congregacao_id)!==String(_vmCongId);
      const nomeCong=outraCong?_congNome(mb.congregacao_id):"";
      const idade=p.data_nascimento?`${Math.floor((Date.now()-new Date(p.data_nascimento))/(365.25*864e5))} anos`:"";
      const sub=[p.email,idade].filter(Boolean).join(" · ");
      const mbIdSafe=mb?mb.id:"";
      return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bd1)">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gr);flex-shrink:0">${iniciais(p.nome)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:11.5px;font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.nome)}</div>
          <div style="font-size:10px;color:var(--tx3)">
            ${sub?escapeHtml(sub):""}
            ${outraCong?`<span style="color:var(--rose)"> · ${escapeHtml(nomeCong)}</span>`:""}
            ${jaVinculado?`<span style="color:var(--gr)"> · Já vinculado</span>`:""}
          </div>
        </div>
        <div style="flex-shrink:0">
          ${jaVinculado
            ?`<span style="font-size:10px;color:var(--gr);font-weight:600">Vinculado</span>`
            :outraCong
              ?`<button class="tbt" style="font-size:10px;padding:3px 8px;color:var(--rose)" onclick="_vmTransferir('${p.id}','${escapeHtml(p.nome).replace(/'/g,"\\'")}','${mbIdSafe}','${escapeHtml(nomeCong).replace(/'/g,"\\'")}')">Transferir</button>`
              :`<button class="tbt pri" style="font-size:10px;padding:3px 8px" onclick="_vmVincular('${p.id}','${escapeHtml(p.nome).replace(/'/g,"\\'")}','${mbIdSafe}')">Vincular</button>`
          }
        </div>
      </div>`;
    }).join("");
  }catch(e){
    res.innerHTML=`<div style="color:var(--rose);font-size:11px;padding:20px 0;text-align:center">Erro: ${escapeHtml(e.message)}</div>`;
  }
}
window._vmBuscar=_vmBuscar;

async function _vmVincular(pessoaId, nome, membroId){
  try{
    const r=await fetch(`${apiBaseUrl()}/rest/v1/rpc/vincular_membro_congregacao`,{
      method:"POST",
      headers:apiHeaders(),
      body:JSON.stringify({
        p_membro_id:     membroId||null,
        p_congregacao_id:_vmCongId,
        p_pessoa_id:     pessoaId
      })
    });
    const result=r.ok?await r.json():null;
    if(result?.ok){
      if(typeof T==="function") T("Membro vinculado",nome);
      fecharModalVincularMembro();
      _activeCongId=_vmCongId; irParaSecaoCong(1);
    }else{
      const msg=result?.erro||(r.ok?"Erro desconhecido":await r.text().catch(()=>""));
      console.error("vincular_membro_congregacao:",msg);
      if(typeof T==="function") T("Erro ao vincular",msg||"Verifique as permissões");
    }
  }catch(e){
    console.error("_vmVincular:",e);
    if(typeof T==="function") T("Erro",e.message);
  }
}
window._vmVincular=_vmVincular;

async function _vmTransferir(pessoaId, nome, membroId, congAtual){
  if(!confirm(`"${nome}" está vinculado à "${congAtual}".\nDeseja transferir para esta congregação?`)) return;
  await _vmVincular(pessoaId,nome,membroId);
}
window._vmTransferir=_vmTransferir;

async function desvincularMembroCong(membroId, congId){
  if(!confirm("Remover vínculo deste membro com a congregação?")) return;
  try{
    const r=await fetch(`${apiBaseUrl()}/rest/v1/rpc/desvincular_membro_congregacao`,{
      method:"POST",
      headers:apiHeaders(),
      body:JSON.stringify({p_membro_id:membroId, p_congregacao_id:congId})
    });
    const result=r.ok?await r.json():null;
    if(result?.ok){
      if(typeof T==="function") T("Vínculo removido","");
      _activeCongId=congId; irParaSecaoCong(1);
    }else{
      const msg=result?.erro||(r.ok?"Erro desconhecido":await r.text().catch(()=>""));
      console.error("desvincular_membro_congregacao:",msg);
      if(typeof T==="function") T("Erro ao remover",msg||"Verifique as permissões");
    }
  }catch(e){
    console.error("desvincularMembroCong:",e);
    if(typeof T==="function") T("Erro",e.message);
  }
}
window.desvincularMembroCong=desvincularMembroCong;

// ── Tab 9: Agenda ─────────────────────────────────────
async function _agendaLoad(congId){
  if(!congId) return [];
  try{
    const url=`${apiBaseUrl()}/rest/v1/congregacao_agenda?congregacao_id=eq.${encodeURIComponent(congId)}&deleted_at=is.null&order=data.asc&limit=200`;
    const r=await fetch(url,{headers:apiHeaders()});
    if(!r.ok) return [];
    return await r.json();
  }catch(e){ return []; }
}

async function renderTab_agenda(cong, el){
  const podeEd=_podeEditar(cong.id);
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;margin-bottom:12px">
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--tx1)">Agenda da Congregação</div>
        <div style="font-size:11px;color:var(--tx3)">Próximos eventos e programações</div>
      </div>
      ${podeEd?`<button class="tbt pri" onclick="abrirModalNovoAgendaCong('${cong.id}')">+ Novo Evento</button>`:""}
    </div>
    <div class="card" id="cong-agenda-lista"><div style="color:var(--tx3);font-size:11px;padding:8px 0">Carregando...</div></div>
  `;
  const items=await _agendaLoad(cong.id);
  const listaEl=document.getElementById("cong-agenda-lista");
  if(!listaEl) return;
  const hoje=new Date().toISOString().slice(0,10);
  const proximos=items.filter(i=>i.data>=hoje).slice(0,30);
  const passados =items.filter(i=>i.data<hoje).slice(0,10);
  const renderItem=(item,passado)=>`
    <div style="display:flex;align-items:flex-start;gap:12px;padding:9px 0;border-bottom:1px solid var(--bd1);${passado?"opacity:.55":""}">
      <div style="width:48px;text-align:center;flex-shrink:0">
        <div style="font-size:12px;font-weight:700;color:var(--gr)">${fmtData(item.data).split(" ").slice(0,2).join(" ")}</div>
        <div style="font-size:9px;color:var(--tx3)">${fmtData(item.data).split(" ")[2]||""}</div>
        ${item.hora?`<div style="font-size:10px;color:var(--tx3)">${item.hora.slice(0,5)}</div>`:""}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11.5px;font-weight:700;color:var(--tx1)">${escapeHtml(item.titulo)}</div>
        <div style="font-size:10px;color:var(--tx3)">${escapeHtml(item.tipo||"")}${item.descricao?" — "+escapeHtml(item.descricao.slice(0,80)):""}</div>
      </div>
      ${podeEd&&!passado?`<button class="tbt" style="font-size:9px;padding:3px 7px;color:var(--rose)" onclick="excluirAgendaCong('${item.id}','${cong.id}')">Remover</button>`:""}
    </div>`;
  listaEl.innerHTML=(proximos.length===0&&passados.length===0)
    ?`<div style="color:var(--tx3);font-size:11px;padding:8px 0">Nenhum evento na agenda</div>`
    :[
      proximos.length?proximos.map(i=>renderItem(i,false)).join(""):"",
      passados.length?`<div style="font-size:10px;font-weight:700;color:var(--tx3);padding:10px 0 4px">Passados</div>`+passados.map(i=>renderItem(i,true)).join(""):""
    ].join("");
}

let _agCongId=null;
function abrirModalNovoAgendaCong(congId){
  _agCongId=congId||_activeCongId;
  ["ag-titulo","ag-descricao"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  const d=document.getElementById("ag-data");if(d)d.value=new Date().toISOString().slice(0,10);
  const h=document.getElementById("ag-hora");if(h)h.value="";
  const t=document.getElementById("ag-tipo");if(t)t.value="Culto";
  const m=document.getElementById("modal-novo-agenda-cong");if(m)m.style.display="flex";
}
window.abrirModalNovoAgendaCong=abrirModalNovoAgendaCong;
function fecharModalNovoAgendaCong(){ const m=document.getElementById("modal-novo-agenda-cong");if(m)m.style.display="none"; }
window.fecharModalNovoAgendaCong=fecharModalNovoAgendaCong;
async function salvarNovoAgendaCong(){
  const titulo=document.getElementById("ag-titulo")?.value?.trim();
  const data=document.getElementById("ag-data")?.value;
  if(!titulo||!data){ if(typeof T==="function") T("Campos obrigatórios","Informe título e data"); return; }
  const payload={
    congregacao_id: _agCongId,
    titulo, data,
    hora:     document.getElementById("ag-hora")?.value||null,
    tipo:     document.getElementById("ag-tipo")?.value||"Evento",
    descricao:document.getElementById("ag-descricao")?.value?.trim()||""
  };
  try{
    const r=await fetch(`${apiBaseUrl()}/rest/v1/congregacao_agenda`,{
      method:"POST", headers:apiHeaders({"Prefer":"return=minimal"}), body:JSON.stringify(payload)
    });
    if(!r.ok) throw new Error(await r.text());
    fecharModalNovoAgendaCong();
    if(typeof T==="function") T("Evento adicionado",titulo);
    const cong=CONG.getCong(_agCongId);
    if(cong) renderTab_agenda(cong,document.getElementById("cong-tab-content"));
  }catch(e){ if(typeof T==="function") T("Erro ao salvar",e.message); }
}
window.salvarNovoAgendaCong=salvarNovoAgendaCong;
async function excluirAgendaCong(itemId, congId){
  if(!confirm("Remover este evento da agenda?")) return;
  try{
    const r=await fetch(`${apiBaseUrl()}/rest/v1/congregacao_agenda?id=eq.${itemId}`,{
      method:"PATCH", headers:apiHeaders({"Prefer":"return=minimal"}),
      body:JSON.stringify({deleted_at:new Date().toISOString()})
    });
    if(!r.ok) throw new Error(await r.text());
    if(typeof T==="function") T("Removido","Evento excluído da agenda");
    const cong=CONG.getCong(congId);
    if(cong) renderTab_agenda(cong,document.getElementById("cong-tab-content"));
  }catch(e){ if(typeof T==="function") T("Erro",e.message); }
}
window.excluirAgendaCong=excluirAgendaCong;

// ── Tab 10: Departamentos ─────────────────────────────
function renderTab_departamentos(cong, el){
  const lista=cong.departamentos?.lista||[];
  const podeEd=_podeEditar(cong.id);
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;margin-bottom:12px">
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--tx1)">${lista.length} Departamento(s)</div>
        <div style="font-size:11px;color:var(--tx3)">${lista.filter(d=>d.status==="ativo").length} ativo(s)</div>
      </div>
      ${podeEd?`<button class="tbt pri" onclick="abrirModalNovoDeptCong('${cong.id}')">+ Novo Departamento</button>`:""}
    </div>
    <div class="card">
      ${lista.length===0?`<div style="color:var(--tx3);font-size:11px">Nenhum departamento cadastrado</div>`:
        lista.map((d,i)=>`
          <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--bd1)">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--acc);flex-shrink:0">${iniciais(d.lider||d.nome)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:700;color:var(--tx1)">${escapeHtml(d.nome)}</div>
              ${d.lider?`<div style="font-size:10.5px;color:var(--tx3)">Responsável: ${escapeHtml(d.lider)}</div>`:""}
              ${d.desc?`<div style="font-size:10px;color:var(--tx3);margin-top:2px">${escapeHtml(d.desc.slice(0,100))}</div>`:""}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">
              ${statusBadge(d.status||"ativo")}
              ${podeEd?`<button class="tbt" style="font-size:9px;padding:3px 7px;color:var(--rose)" onclick="excluirDeptCong(${i},'${cong.id}')">Remover</button>`:""}
            </div>
          </div>`).join("")}
    </div>
  `;
}

let _deptCongId=null;
function abrirModalNovoDeptCong(congId){
  _deptCongId=congId||_activeCongId;
  ["dept-nome","dept-lider","dept-desc"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  const s=document.getElementById("dept-status");if(s)s.value="ativo";
  const m=document.getElementById("modal-novo-dept-cong");if(m)m.style.display="flex";
}
window.abrirModalNovoDeptCong=abrirModalNovoDeptCong;
function fecharModalNovoDeptCong(){ const m=document.getElementById("modal-novo-dept-cong");if(m)m.style.display="none"; }
window.fecharModalNovoDeptCong=fecharModalNovoDeptCong;
function salvarNovoDeptCong(){
  const nome=document.getElementById("dept-nome")?.value?.trim();
  if(!nome){ if(typeof T==="function") T("Campo obrigatório","Informe o nome do departamento"); return; }
  const cong=CONG.getCong(_deptCongId);
  if(!cong) return;
  if(!cong.departamentos) cong.departamentos={lista:[]};
  cong.departamentos.lista.push({
    nome,
    lider: document.getElementById("dept-lider")?.value?.trim()||"",
    desc:  document.getElementById("dept-desc")?.value?.trim()||"",
    status:document.getElementById("dept-status")?.value||"ativo"
  });
  CONG.saveCong(cong); _sbSaveCong(cong);
  fecharModalNovoDeptCong();
  if(typeof T==="function") T("Departamento criado",nome);
  _activeCongId=_deptCongId; irParaSecaoCong(10);
}
window.salvarNovoDeptCong=salvarNovoDeptCong;
function excluirDeptCong(idx, congId){
  if(!confirm("Remover este departamento?")) return;
  const cong=CONG.getCong(congId);
  if(!cong) return;
  cong.departamentos.lista.splice(idx,1);
  CONG.saveCong(cong); _sbSaveCong(cong);
  _activeCongId=congId; irParaSecaoCong(10);
}
window.excluirDeptCong=excluirDeptCong;

// ── Hook no go() ──────────────────────────────────────
(function(){
  const _orig=window.go;
  window.go=async function(id){
    const perfil=typeof USUARIO_ATUAL!=="undefined"?USUARIO_ATUAL?.perfil:null;
    const isCongUser=perfil==="LIDER_CONGREGACAO"||perfil==="MEMBRO_CONGREGACAO";
    if(isCongUser){
      if(id==="cong-dash"){
        // Nunca mostrar o dashboard geral — redireciona para a própria congregação
        const congId=USUARIO_ATUAL?.congregacao_id;
        if(congId) _activeCongId=congId;
        await _orig("cong-ver");
        return;
      }
      if(!id.startsWith("cong")){
        if(typeof T==="function") T("Acesso restrito","Sem permissão para este módulo");
        return;
      }
    }
    await _orig(id);
    // dashboard geral: apenas para não-congregation users
    if(id==="cong-dash"&&!isCongUser) setTimeout(renderDashboardGeral,0);
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
  // Dashboard geral: apenas para perfis administrativos
  if(!_isLiderCong() && document.getElementById("v-cong-dash")?.classList.contains("on")) renderDashboardGeral();
}catch(e){}

// Sync remoto: chamado sob demanda ao navegar para a tela (ver go() em auth.js)
window._congSyncOnNav = function(){
  CONG.syncFromSupabase()
    .then(ok=>{
      if(!ok) return;
      buildCongMenu();
      // Dashboard geral: apenas para perfis administrativos
      if(!_isLiderCong() && document.getElementById("v-cong-dash")?.classList.contains("on")) renderDashboardGeral();
      if(_activeCongId){
        const c=CONG.getCong(_activeCongId);
        if(c) renderCongView(c);
      }
    })
    .catch(()=>{});
};

})();
