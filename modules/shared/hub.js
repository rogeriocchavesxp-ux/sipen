/* ═══════════════════════════════════════════════════════
   SIPEN — Section Hubs
   hub.js · v1.0
   Dashboard de entrada para cada seção da sidebar
═══════════════════════════════════════════════════════ */
(function(){

// ── Navegar para hub da seção ──────────────────────────
// Chamado pelo cabeçalho de seção da sidebar
function hubSec(sectionId){
  const sec=document.getElementById('sbs-'+sectionId);
  const collapsed=!sec||sec.classList.contains('collapsed');
  if(typeof sbsToggle==='function') sbsToggle(sectionId);
  if(collapsed) go('hub-'+sectionId);
}
window.hubSec=hubSec;

// ── Helpers ────────────────────────────────────────────
function _esc(s){
  return String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _fmt(iso){
  if(!iso) return '—';
  const [,m,d]=iso.split('-');
  const mn=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${+d} ${mn[+m-1]}`;
}

// ── SVGs ───────────────────────────────────────────────
const _sv=p=>`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const IC={
  cultos:  _sv('<path d="M12 2v20"/><path d="M5 9h14"/>'),
  escalas: _sv('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01"/>'),
  pastoral:_sv('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'),
  pgs:     _sv('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'),
  users:   _sv('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
};

// ── Primitivas de UI ───────────────────────────────────
function _ball(svg,bg,color){
  return `<div style="width:40px;height:40px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="color:${color}">${svg}</span></div>`;
}

function _kpi(svg,bg,color,val,label,sub){
  return `
    <div class="card" style="padding:18px 16px;display:flex;flex-direction:column">
      <div style="margin-bottom:12px">${_ball(svg,bg,color)}</div>
      <div style="font-size:30px;font-weight:800;color:var(--tx1);line-height:1">${val}</div>
      <div style="font-size:13px;font-weight:600;color:var(--tx1);margin-top:5px">${label}</div>
      <div style="font-size:11.5px;color:var(--tx3);margin-top:2px">${sub}</div>
    </div>`;
}

function _mod(svg,bg,color,title,desc,route){
  return `
    <div class="card" style="cursor:pointer;display:flex;align-items:center;gap:14px" onclick="go('${route}')">
      ${_ball(svg,bg,color)}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--tx1)">${title}</div>
        <div style="font-size:11.5px;color:var(--tx3);margin-top:2px">${desc}</div>
      </div>
      <span style="font-size:12px;color:var(--gr);font-weight:500;flex-shrink:0">Abrir →</span>
    </div>`;
}

function _vazio(txt){
  return `<div style="padding:20px 0;text-align:center;color:var(--tx3);font-size:11.5px">—&ensp;${txt}</div>`;
}

// ══════════════════════════════════════════════════════
// HUB: Vida da Igreja
// ══════════════════════════════════════════════════════
function renderHubIgreja(){
  const el=document.getElementById('v-hub-igreja');
  if(!el) return;

  // Dados das congregações (localStorage, síncrono)
  const congs=(typeof CONG!=='undefined')?CONG.listCongs():[];
  const mes=new Date().toISOString().slice(0,7); // YYYY-MM

  // Agregar cultos de todas as congregações
  const allCultos=congs.flatMap(c=>
    (c.atividades_igreja?.historico_cultos||[]).map(cu=>({
      ...cu,
      congNome:c.identificacao.nome,
      congCor:c.identificacao.cor||'var(--gr)'
    }))
  );
  allCultos.sort((a,b)=>(b.data||'').localeCompare(a.data||''));

  // KPIs
  const cultosMes=allCultos.filter(cu=>(cu.data||'').startsWith(mes));
  const totalMes=cultosMes.length;
  const freqMedia=cultosMes.length
    ?Math.round(cultosMes.reduce((s,c)=>s+((c.adultos||0)+(c.criancas||0)),0)/cultosMes.length)
    :0;
  const totalPGs=congs.reduce((s,c)=>s+(c.pequenos_grupos?.total_grupos||0),0);
  const totalMembros=congs.reduce((s,c)=>s+(c.panorama_membresia?.membros_ativos||0),0);

  // Painel: cultos recentes
  const cultoHtml=allCultos.slice(0,6).length===0
    ?_vazio('Nenhum culto registrado')
    :allCultos.slice(0,6).map(cu=>{
        const tot=cu.participantes||(cu.adultos||0)+(cu.criancas||0);
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
            <div style="width:3px;height:36px;border-radius:2px;background:${cu.congCor};flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(cu.tipo||'Culto')}</div>
              <div style="font-size:11px;color:var(--tx3)">${_fmt(cu.data)}&ensp;·&ensp;${_esc(cu.congNome)}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:13px;font-weight:700;color:var(--gr)">${tot||'—'}</div>
              <div style="font-size:10.5px;color:var(--tx3)">presentes</div>
            </div>
          </div>`;
      }).join('');

  // Painel: PGs por congregação
  const congsComPG=congs.filter(c=>(c.pequenos_grupos?.total_grupos||0)>0);
  const pgsHtml=congsComPG.length===0
    ?_vazio('Nenhum grupo cadastrado')
    :congsComPG.map(c=>{
        const pg=c.pequenos_grupos;
        const part=(pg.grupos||[]).reduce((s,g)=>s+(g.membros||0),0);
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
            <div style="width:3px;height:36px;border-radius:2px;background:${c.identificacao.cor||'var(--gr)'};flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(c.identificacao.nome)}</div>
              <div style="font-size:11px;color:var(--tx3)">${part} participantes</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:13px;font-weight:700;color:var(--gmd)">${pg.total_grupos}</div>
              <div style="font-size:10.5px;color:var(--tx3)">grupos</div>
            </div>
          </div>`;
      }).join('');

  // Render
  el.innerHTML=`
    <div class="hero">
      <div class="hero-ic" style="background:rgba(90,200,250,0.12);border-color:rgba(90,200,250,0.28);font-size:22px">✝</div>
      <div>
        <div class="hero-lbl">Seção</div>
        <div class="hero-ttl">Vida da Igreja</div>
        <div class="hero-dsc">Cultos, escalas, pastoral e pequenos grupos</div>
      </div>
    </div>
    <div class="ct">

      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px">
        ${_kpi(IC.cultos,  'rgba(90,200,250,.12)', 'var(--sky)',  totalMes    ||'—', 'Cultos no mês',    'Todas as congregações')}
        ${_kpi(IC.users,   'rgba(58,170,92,.12)',  'var(--gr)',   freqMedia   ||'—', 'Frequência média', 'Por culto este mês')}
        ${_kpi(IC.pgs,     'rgba(82,196,110,.12)', 'var(--gmd)',  totalPGs    ||'—', 'Pequenos Grupos',  'Ativos no total')}
        ${_kpi(IC.pastoral,'rgba(208,104,104,.12)','var(--rose)', totalMembros||'—', 'Membros Ativos',   'Todas as congregações')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div class="card">
          <div class="ctit">Cultos Recentes <span class="cact" onclick="go('cong-dash')">Ver congregações</span></div>
          ${cultoHtml}
        </div>
        <div class="card">
          <div class="ctit">Pequenos Grupos <span class="cact" onclick="go('pgs-dash')">Ver todos</span></div>
          ${pgsHtml}
        </div>
      </div>

      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:10px">Módulos</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        ${_mod(IC.cultos,  'rgba(90,200,250,.12)', 'var(--sky)',  'Cultos',         'Liturgia e programação dos cultos',         'pastoral-proculto')}
        ${_mod(IC.escalas, 'rgba(90,200,250,.12)', 'var(--sky)',  'Escalas',        'Pregação, diaconal e ministério de música', 'pastoral-preg')}
        ${_mod(IC.pastoral,'rgba(208,104,104,.12)','var(--rose)', 'Pastoral',       'Atendimentos, oração e acompanhamento',     'pastoral-dash')}
        ${_mod(IC.pgs,     'rgba(82,196,110,.12)', 'var(--gmd)',  'Pequenos Grupos','Grupos de crescimento e comunhão',          'pgs-dash')}
      </div>

    </div>`;
}

// ── Registro no autoload ───────────────────────────────
if(typeof VIEW_AUTOLOAD!=='undefined'){
  VIEW_AUTOLOAD['hub-igreja']={fn:renderHubIgreja};
}

})();
