/* ═══════════════════════════════════════════════════════
   SIPEN — Section Hubs
   hub.js · v1.2.9
═══════════════════════════════════════════════════════ */
(function(){

function hubSec(sectionId){
  const sec=document.getElementById('sbs-'+sectionId);
  if(!sec) return;
  const wasCollapsed=sec.classList.contains('collapsed');
  if(typeof sbsToggle==='function') sbsToggle(sectionId);
  if(wasCollapsed) go('hub-'+sectionId);
}
window.hubSec=hubSec;

// ── Helpers ────────────────────────────────────────────
function _esc(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _fmt(iso){
  if(!iso) return '—';
  const [,m,d]=iso.split('-');
  const mn=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${+d} ${mn[+m-1]}`;
}
async function _cnt(table,qs){
  try{
    const r=await fetch(`${apiBaseUrl()}/rest/v1/${table}?select=id${qs||''}`,{
      headers:{...apiHeaders(),'Prefer':'count=exact','Range':'0-0'}
    });
    const m=(r.headers.get('Content-Range')||'').match(/\/(\d+)$/);
    return m?+m[1]:null;
  }catch{return null;}
}
function _set(id,v){const e=document.getElementById(id);if(e)e.textContent=v!=null?String(v):'—';}

// ── SVGs ───────────────────────────────────────────────
const _sv=p=>`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const _sv24=p=>`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

const IC={
  cultos:  _sv('<path d="M12 2v20"/><path d="M5 9h14"/>'),
  escalas: _sv('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01"/>'),
  pastoral:_sv('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'),
  pgs:     _sv('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'),
  users:   _sv('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  shield:  _sv('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>'),
  book:    _sv('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
  vote:    _sv('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
  hands:   _sv('<path d="M18 11c0-1.1-.9-2-2-2s-2 .9-2 2v2H8.5a2.5 2.5 0 0 0 0 5H14a6 6 0 0 0 6-6v-1"/><path d="M14 9V7a2 2 0 0 0-4 0v2"/><path d="M10 9H7.5A2.5 2.5 0 0 0 5 11.5 2.5 2.5 0 0 0 7.5 14H14"/>'),
  grid:    _sv('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'),
  proj:    _sv('<rect width="6" height="14" x="2" y="5" rx="2"/><rect width="6" height="10" x="9" y="9" rx="2"/><rect width="6" height="6" x="16" y="13" rx="2"/>'),
  case:    _sv('<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'),
  church:  _sv('<path d="M6 22V12H2l10-10 10 10h-4v10"/><path d="M6 12h12"/><path d="M9 22v-4h6v4"/>'),
  inbox:   _sv('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'),
  cal:     _sv('<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>'),
  mega:    _sv('<path d="M11 5.89A8 8 0 0 1 17 4h1v14h-1a8 8 0 0 1-6-1.89M3 10v4"/><path d="M7 9H3a2 2 0 0 0 0 4h4"/><path d="M7 9v6"/><path d="M7 15l2 4"/>'),
  ticket:  _sv('<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>'),
  gear:    _sv('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
  wallet:  _sv('<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>'),
  wrench:  _sv('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
  lock:    _sv('<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  person:  _sv('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  star:    _sv('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
  bell:    _sv('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'),
};

// ── Primitivas de UI ───────────────────────────────────
function _ball(svg,bg,color){
  return `<div style="width:36px;height:36px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="color:${color}">${svg}</span></div>`;
}
function _kpi(svg,bg,color,val,label,sub){
  return `<div class="card" style="padding:14px 16px;display:flex;align-items:center;gap:12px">
    ${_ball(svg,bg,color)}
    <div style="min-width:0">
      <div style="font-size:24px;font-weight:800;color:var(--tx1);line-height:1">${val}</div>
      <div style="font-size:12.5px;font-weight:600;color:var(--tx1);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sub}</div>
    </div>
  </div>`;
}
function _mod(svg,bg,color,title,desc,route){
  return `<div class="card" style="padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:12px" onclick="go('${route}')">
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

  const congs=(typeof CONG!=='undefined')?CONG.listCongs():[];
  const mes=new Date().toISOString().slice(0,7);

  const allCultos=congs.flatMap(c=>
    (c.atividades_igreja?.historico_cultos||[]).map(cu=>({
      ...cu,
      congNome:c.identificacao.nome,
      congCor:c.identificacao.cor||'var(--gr)'
    }))
  );
  allCultos.sort((a,b)=>(b.data||'').localeCompare(a.data||''));

  const cultosMes=allCultos.filter(cu=>(cu.data||'').startsWith(mes));
  const totalMes=cultosMes.length;
  const freqMedia=cultosMes.length
    ?Math.round(cultosMes.reduce((s,c)=>s+((c.adultos||0)+(c.criancas||0)),0)/cultosMes.length)
    :0;
  const totalPGs=congs.reduce((s,c)=>s+(c.pequenos_grupos?.total_grupos||0),0);
  const totalMembros=congs.reduce((s,c)=>s+(c.panorama_membresia?.membros_ativos||0),0);

  const cultoHtml=allCultos.slice(0,6).length===0
    ?_vazio('Nenhum culto registrado')
    :allCultos.slice(0,6).map(cu=>{
        const tot=cu.participantes||(cu.adultos||0)+(cu.criancas||0);
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
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

  const congsComPG=congs.filter(c=>(c.pequenos_grupos?.total_grupos||0)>0);
  const pgsHtml=congsComPG.length===0
    ?_vazio('Nenhum grupo cadastrado')
    :congsComPG.map(c=>{
        const pg=c.pequenos_grupos;
        const part=(pg.grupos||[]).reduce((s,g)=>s+(g.membros||0),0);
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
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

  el.innerHTML=`
    <div class="hero">
      <div class="hero-ic" style="background:rgba(90,200,250,0.12);border-color:rgba(90,200,250,0.28)">${_sv24('<path d="M12 2v20"/><path d="M5 9h14"/>')}</div>
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

// ══════════════════════════════════════════════════════
// HUB: Governança
// ══════════════════════════════════════════════════════
function renderHubGov(){
  const el=document.getElementById('v-hub-gov');
  if(!el) return;

  const sky='var(--sky)';
  const bgSky='rgba(88,152,212,';

  el.innerHTML=`
    <div class="hero">
      <div class="hero-ic" style="background:${bgSky}0.12);border-color:${bgSky}0.28)">${_sv24('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>')}</div>
      <div>
        <div class="hero-lbl">Seção</div>
        <div class="hero-ttl">Governança</div>
        <div class="hero-dsc">Conselho, oficiais, secretaria, eleições e Junta Diaconal</div>
      </div>
    </div>
    <div class="ct">
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px">
        ${_kpi(IC.users,  bgSky+'0.12)', sky, '<span id="k-gov-memb">—</span>', 'Membros Ativos', 'Comungantes e não-comungantes')}
        ${_kpi(IC.shield, bgSky+'0.12)', sky, '<span id="k-gov-nomeados">—</span>', 'Nomeados', 'Oficiais em exercício')}
        ${_kpi(IC.book,   bgSky+'0.12)', sky, '<span id="k-gov-reun">—</span>', 'Reuniões', 'Conselho este mês')}
        ${_kpi(IC.hands,  'rgba(184,122,86,0.12)', 'var(--copper)', '<span id="k-gov-diac">—</span>', 'Demandas Diaconais', 'Em aberto')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div class="card">
          <div class="ctit">Reuniões Recentes <span class="cact" onclick="go('conselho-dash')">Ver todas</span></div>
          <div id="gov-reun-list">${_vazio('Carregando…')}</div>
        </div>
        <div class="card">
          <div class="ctit">Oficiais <span class="cact" onclick="go('conselho-nomeados')">Ver todos</span></div>
          <div id="gov-nomeados-list">${_vazio('Carregando…')}</div>
        </div>
      </div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:10px">Módulos</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        ${_mod(IC.shield, bgSky+'0.12)', sky,            'Conselho e Governança', 'Reuniões, documentos, resoluções e comissões', 'conselho-dash')}
        ${_mod(IC.users,  bgSky+'0.12)', sky,            'Oficiais',              'Nomeados, ordenados e seminaristas',           'conselho-nomeados')}
        ${_mod(IC.book,   'rgba(58,170,92,0.12)',  'var(--gr)',    'Secretaria',            'Cadastro e gestão de membros',                 'memb-dash')}
        ${_mod(IC.vote,   bgSky+'0.12)', sky,            'Eleições',              'Indicações e processo eleitoral',              'conselho-eleicoes')}
        ${_mod(IC.hands,  'rgba(184,122,86,0.12)', 'var(--copper)', 'Junta Diaconal',      'Diáconos, escalas e visitação',                'diac-dash')}
      </div>
    </div>`;

  const mes=new Date().toISOString().slice(0,7);
  _cnt('membros','').then(n=>_set('k-gov-memb',n));
  _cnt('nomeados','&deleted_at=is.null').then(n=>_set('k-gov-nomeados',n));
  _cnt('conselho_reunioes',`&data_reuniao=gte.${mes}-01`).then(n=>_set('k-gov-reun',n));
  _cnt('demandas',`&area=ilike.*iaconal*&status=neq.Conclu%C3%ADda`).then(n=>_set('k-gov-diac',n));

  // Reuniões recentes
  fetch(`${apiBaseUrl()}/rest/v1/conselho_reunioes?select=id,tipo,data_reuniao,status&order=data_reuniao.desc&limit=5`,{headers:apiHeaders()})
    .then(r=>r.ok?r.json():[]).then(rows=>{
      const el=document.getElementById('gov-reun-list');
      if(!el) return;
      if(!rows.length){el.innerHTML=_vazio('Nenhuma reunião registrada');return;}
      el.innerHTML=rows.map(r=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
          <div style="width:3px;height:36px;border-radius:2px;background:${bgSky}0.6);flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(r.tipo||'Reunião')}</div>
            <div style="font-size:11px;color:var(--tx3)">${_fmt(r.data_reuniao)}</div>
          </div>
          <div style="font-size:11px;color:var(--tx3);flex-shrink:0">${_esc(r.status||'')}</div>
        </div>`).join('');
    }).catch(()=>{const el=document.getElementById('gov-reun-list');if(el)el.innerHTML=_vazio('Dados não disponíveis');});

  // Oficiais ativos
  fetch(`${apiBaseUrl()}/rest/v1/nomeados?select=id,nome,funcao&deleted_at=is.null&limit=6`,{headers:apiHeaders()})
    .then(r=>r.ok?r.json():[]).then(rows=>{
      const el=document.getElementById('gov-nomeados-list');
      if(!el) return;
      if(!rows.length){el.innerHTML=_vazio('Nenhum oficial cadastrado');return;}
      el.innerHTML=rows.map(r=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
          <div style="width:3px;height:36px;border-radius:2px;background:${bgSky}0.6);flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(r.nome||'')}</div>
            <div style="font-size:11px;color:var(--tx3)">${_esc(r.funcao||'')}</div>
          </div>
        </div>`).join('');
    }).catch(()=>{const el=document.getElementById('gov-nomeados-list');if(el)el.innerHTML=_vazio('Dados não disponíveis');});
}

// ══════════════════════════════════════════════════════
// HUB: Departamentos
// ══════════════════════════════════════════════════════
function renderHubDep(){
  const el=document.getElementById('v-hub-dep');
  if(!el) return;

  const congs=(typeof CONG!=='undefined')?CONG.listCongs():[];
  const totalCongs=congs.length;

  const violet='var(--violet)';
  const bgVio='rgba(138,107,193,';

  el.innerHTML=`
    <div class="hero">
      <div class="hero-ic" style="background:${bgVio}0.12);border-color:${bgVio}0.28)">${_sv24('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>')}</div>
      <div>
        <div class="hero-lbl">Seção</div>
        <div class="hero-ttl">Departamentos</div>
        <div class="hero-dsc">Ministérios, sociedades, projetos e congregações</div>
      </div>
    </div>
    <div class="ct">
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px">
        ${_kpi(IC.users,  bgVio+'0.12)', violet, '<span id="k-dep-min">—</span>',  'Ministérios',   'Ativos na igreja')}
        ${_kpi(IC.star,   bgVio+'0.12)', violet, '<span id="k-dep-soc">—</span>',  'Sociedades',    'UPH, SAF, UMP, UPA, UCP')}
        ${_kpi(IC.proj,   bgVio+'0.12)', violet, '<span id="k-dep-proj">—</span>', 'Projetos',      'Em andamento')}
        ${_kpi(IC.church, 'rgba(58,170,92,0.12)', 'var(--gr)', totalCongs||'—', 'Congregações', 'Unidades ativas')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div class="card">
          <div class="ctit">Departamentos <span class="cact" onclick="go('min-min')">Ver todos</span></div>
          <div id="dep-min-list">${_vazio('Carregando…')}</div>
        </div>
        <div class="card">
          <div class="ctit">Projetos <span class="cact" onclick="go('proj-lista')">Ver todos</span></div>
          <div id="dep-proj-list">${_vazio('Carregando…')}</div>
        </div>
      </div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:10px">Módulos</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        ${_mod(IC.grid,   bgVio+'0.12)', violet,         'Todos os Departamentos','Ministérios, setores e grupos de serviço',    'min-min')}
        ${_mod(IC.star,   bgVio+'0.12)', violet,         'Sociedades Internas',  'UPH, SAF, UMP, UPA e UCP',                   'min-soc')}
        ${_mod(IC.proj,   bgVio+'0.12)', violet,         'Projetos',             'Projetos e acompanhamento de metas',          'proj-lista')}
        ${_mod(IC.church, 'rgba(58,170,92,0.12)', 'var(--gr)', 'Congregações',  'Unidades, cultos e membresia local',          'cong-dash')}
      </div>
    </div>`;

  _cnt('ministerios','').then(n=>_set('k-dep-min',n));
  _cnt('sociedades','').then(n=>_set('k-dep-soc',n));
  _cnt('projetos','&status=eq.ativo').then(n=>_set('k-dep-proj',n));

  // Lista de departamentos
  fetch(`${apiBaseUrl()}/rest/v1/ministerios?select=id,nome,categoria&order=nome.asc&limit=6`,{headers:apiHeaders()})
    .then(r=>r.ok?r.json():[]).then(rows=>{
      const el=document.getElementById('dep-min-list');
      if(!el) return;
      if(!rows.length){el.innerHTML=_vazio('Nenhum departamento cadastrado');return;}
      el.innerHTML=rows.map(r=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
          <div style="width:3px;height:36px;border-radius:2px;background:${bgVio}0.6);flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(r.nome||'')}</div>
            <div style="font-size:11px;color:var(--tx3)">${_esc(r.categoria||'Departamento')}</div>
          </div>
        </div>`).join('');
    }).catch(()=>{const el=document.getElementById('dep-min-list');if(el)el.innerHTML=_vazio('Dados não disponíveis');});

  // Projetos em andamento
  fetch(`${apiBaseUrl()}/rest/v1/projetos?select=id,nome,status&status=eq.ativo&order=nome.asc&limit=6`,{headers:apiHeaders()})
    .then(r=>r.ok?r.json():[]).then(rows=>{
      const el=document.getElementById('dep-proj-list');
      if(!el) return;
      if(!rows.length){el.innerHTML=_vazio('Nenhum projeto em andamento');return;}
      el.innerHTML=rows.map(r=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
          <div style="width:3px;height:36px;border-radius:2px;background:${bgVio}0.6);flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(r.nome||'')}</div>
            <div style="font-size:11px;color:var(--tx3)">${_esc(r.status||'Ativo')}</div>
          </div>
        </div>`).join('');
    }).catch(()=>{const el=document.getElementById('dep-proj-list');if(el)el.innerHTML=_vazio('Dados não disponíveis');});
}

// ══════════════════════════════════════════════════════
// HUB: Operação
// ══════════════════════════════════════════════════════
function renderHubOp(){
  const el=document.getElementById('v-hub-op');
  if(!el) return;

  const rose='var(--rose)';
  const bgRose='rgba(208,104,104,';
  const teal='var(--teal)';
  const bgTeal='rgba(42,181,192,';
  const mes=new Date().toISOString().slice(0,7);

  el.innerHTML=`
    <div class="hero">
      <div class="hero-ic" style="background:${bgRose}0.12);border-color:${bgRose}0.28)">${_sv24('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>')}</div>
      <div>
        <div class="hero-lbl">Seção</div>
        <div class="hero-ttl">Operação</div>
        <div class="hero-dsc">Demandas, agenda, comunicação e programações</div>
      </div>
    </div>
    <div class="ct">
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px">
        ${_kpi(IC.inbox,  bgRose+'0.12)', rose,  '<span id="k-op-dem">—</span>',   'Demandas Abertas',   'Pendentes e em andamento')}
        ${_kpi(IC.cal,    bgTeal+'0.12)', teal,  '<span id="k-op-agenda">—</span>','Agendamentos',       'Confirmados este mês')}
        ${_kpi(IC.mega,   'rgba(139,111,212,0.12)', 'var(--violet)', '<span id="k-op-com">—</span>', 'Mensagens', 'Enviadas este mês')}
        ${_kpi(IC.ticket, 'rgba(74,156,245,0.12)', 'var(--sky)',    '<span id="k-op-eve">—</span>', 'Programações', 'Este mês')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div class="card">
          <div class="ctit">Demandas Recentes <span class="cact" onclick="go('dem-dash')">Ver todas</span></div>
          <div id="op-dem-list">${_vazio('Carregando…')}</div>
        </div>
        <div class="card">
          <div class="ctit">Próximos Agendamentos <span class="cact" onclick="go('agenda-dash')">Ver todos</span></div>
          <div id="op-agenda-list">${_vazio('Carregando…')}</div>
        </div>
      </div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:10px">Módulos</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        ${_mod(IC.inbox,  bgRose+'0.12)', rose,   'Central de Demandas', 'Solicitações, análise e acompanhamento',    'dem-dash')}
        ${_mod(IC.cal,    bgTeal+'0.12)', teal,   'Gestão de Agenda',    'Calendário, ambientes e agendamentos',      'agenda-dash')}
        ${_mod(IC.mega,   'rgba(139,111,212,0.12)', 'var(--violet)', 'Comunicação', 'Mensagens, modelos e WhatsApp', 'com-dash')}
        ${_mod(IC.ticket, 'rgba(74,156,245,0.12)', 'var(--sky)', 'Gestão de Eventos', 'Eventos, inscrições e presenças', 'eve-dash')}
      </div>
    </div>`;

  _cnt('demandas','&status=in.(pendente,em_analise,em_andamento)').then(n=>_set('k-op-dem',n));
  _cnt('agenda_eventos',`&status=eq.confirmado&data_inicio=gte.${mes}-01`).then(n=>_set('k-op-agenda',n));
  _cnt('com_mensagens',`&created_at=gte.${mes}-01`).then(n=>_set('k-op-com',n));
  _cnt('eventos',`&data_inicio=gte.${mes}-01`).then(n=>_set('k-op-eve',n));

  // Demandas recentes
  const hoje=new Date().toISOString().slice(0,10);
  fetch(`${apiBaseUrl()}/rest/v1/demandas?select=id,titulo,status,area&status=in.(pendente,em_analise,em_andamento)&order=criado_em.desc&limit=5`,{headers:apiHeaders()})
    .then(r=>r.ok?r.json():[]).then(rows=>{
      const el=document.getElementById('op-dem-list');
      if(!el) return;
      if(!rows.length){el.innerHTML=_vazio('Nenhuma demanda aberta');return;}
      el.innerHTML=rows.map(r=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
          <div style="width:3px;height:36px;border-radius:2px;background:${bgRose}0.6);flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(r.titulo||'Demanda')}</div>
            <div style="font-size:11px;color:var(--tx3)">${_esc(r.area||'')}${r.area&&r.status?' · ':''}${_esc(r.status||'')}</div>
          </div>
        </div>`).join('');
    }).catch(()=>{const el=document.getElementById('op-dem-list');if(el)el.innerHTML=_vazio('Dados não disponíveis');});

  // Próximos agendamentos
  fetch(`${apiBaseUrl()}/rest/v1/agenda_eventos?select=id,titulo,data_inicio,status&data_inicio=gte.${hoje}&order=data_inicio.asc&limit=5`,{headers:apiHeaders()})
    .then(r=>r.ok?r.json():[]).then(rows=>{
      const el=document.getElementById('op-agenda-list');
      if(!el) return;
      if(!rows.length){el.innerHTML=_vazio('Nenhum agendamento próximo');return;}
      el.innerHTML=rows.map(r=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
          <div style="width:3px;height:36px;border-radius:2px;background:${bgTeal}0.6);flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(r.titulo||'Agendamento')}</div>
            <div style="font-size:11px;color:var(--tx3)">${_fmt(r.data_inicio?.slice(0,10))}</div>
          </div>
          <div style="font-size:11px;color:var(--tx3);flex-shrink:0">${_esc(r.status||'')}</div>
        </div>`).join('');
    }).catch(()=>{const el=document.getElementById('op-agenda-list');if(el)el.innerHTML=_vazio('Dados não disponíveis');});
}

// ══════════════════════════════════════════════════════
// HUB: Administração
// ══════════════════════════════════════════════════════
function renderHubAdm(){
  const el=document.getElementById('v-hub-adm');
  if(!el) return;

  const gold='#c9a84c';
  const bgGold='rgba(201,168,76,';
  const amber='var(--amber)';
  const bgAmber='rgba(208,144,64,';

  el.innerHTML=`
    <div class="hero">
      <div class="hero-ic" style="background:${bgGold}0.12);border-color:${bgGold}0.28)">${_sv24('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>')}</div>
      <div>
        <div class="hero-lbl">Seção</div>
        <div class="hero-ttl">Administração</div>
        <div class="hero-dsc">Financeiro, infraestrutura e controle de acesso</div>
      </div>
    </div>
    <div class="ct">
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px">
        ${_kpi(IC.wallet,  bgGold+'0.12)',  gold,  '<span id="k-adm-pagar">—</span>',  'A Pagar',          'Itens financeiros pendentes')}
        ${_kpi(IC.wrench,  bgAmber+'0.12)', amber, '<span id="k-adm-os">—</span>',     'Ordens de Serviço','Infraestrutura em aberto')}
        ${_kpi(IC.lock,    'rgba(88,152,212,0.12)', 'var(--sky)', '<span id="k-adm-acesso">—</span>', 'Acessos Hoje', 'Registros de entrada')}
        ${_kpi(IC.gear,    bgGold+'0.12)',  gold,  '<span id="k-adm-admin">—</span>',  'Processos',        'Administrativos ativos')}
      </div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:10px">Módulos</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        ${_mod(IC.gear,   bgGold+'0.12)',  gold,  'Administração',          'Gestão administrativa geral',              'admin-dash')}
        ${_mod(IC.wallet, bgGold+'0.12)',  gold,  'Gestão Financeira',       'A pagar, CNAB e controle financeiro',      'fin-demandas')}
        ${_mod(IC.wrench, bgAmber+'0.12)', amber, 'Gestão Patrimonial',      'Manutenção, conservação e espaços físicos','infra-dash')}
        ${_mod(IC.lock,   'rgba(88,152,212,0.12)', 'var(--sky)', 'Controle de Acesso', 'Estacionamento e acesso facial', 'admin-parking-controls')}
      </div>
    </div>`;

  const hoje=new Date().toISOString().slice(0,10);
  _cnt('fin_demandas','&status=eq.pendente').then(n=>_set('k-adm-pagar',n));
  _cnt('infra_os','&status=neq.concluida').then(n=>_set('k-adm-os',n));
  _cnt('acesso_registros',`&data=gte.${hoje}`).then(n=>_set('k-adm-acesso',n));
  _cnt('admin_processos','&status=eq.ativo').then(n=>_set('k-adm-admin',n));
}

// ══════════════════════════════════════════════════════
// HUB: Portal do Membro
// ══════════════════════════════════════════════════════
function renderHubPortal(){
  const el=document.getElementById('v-hub-portal');
  if(!el) return;

  const gr='var(--gr)';
  const bgGr='rgba(58,170,92,';

  el.innerHTML=`
    <div class="hero">
      <div class="hero-ic" style="background:${bgGr}0.12);border-color:${bgGr}0.28)">${_sv24('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>')}</div>
      <div>
        <div class="hero-lbl">Seção</div>
        <div class="hero-ttl">Portal do Membro</div>
        <div class="hero-dsc">Painel pessoal, agenda, ministérios e solicitações</div>
      </div>
    </div>
    <div class="ct">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:10px">Acesso Rápido</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        ${_mod(IC.person, bgGr+'0.12)', gr, 'Painel Pessoal',    'Resumo das suas atividades e dados',          'area-dash')}
        ${_mod(IC.cal,    bgGr+'0.12)', gr, 'Minha Agenda',      'Eventos, cultos e compromissos',              'area-agenda')}
        ${_mod(IC.star,   bgGr+'0.12)', gr, 'Meus Ministérios',  'Grupos de serviço que você participa',        'area-min')}
        ${_mod(IC.pgs,    bgGr+'0.12)', gr, 'Meu Pequeno Grupo', 'Encontros, estudos e pedidos de oração',      'area-pgs')}
        ${_mod(IC.inbox,  bgGr+'0.12)', gr, 'Minhas Solicitações','Acompanhe o status das suas demandas',       'area-dem')}
        ${_mod(IC.bell,   bgGr+'0.12)', gr, 'Aniversariantes',   'Membros aniversariantes do mês',              'memb-aniv')}
      </div>
    </div>`;
}

// ── Escalas: visão geral ───────────────────────────────
function renderEscalasDash(){
  const el=document.getElementById('v-escalas-dash');
  if(!el) return;
  const sky='var(--sky)',teal='var(--teal)',violet='var(--violet)',copper='var(--copper)';
  el.innerHTML=`
    <div class="hero">
      <div class="hero-ic" style="background:rgba(90,200,250,0.12);border-color:rgba(90,200,250,0.28)">${_sv24('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01"/>')}</div>
      <div>
        <div class="hero-lbl">Vida da Igreja</div>
        <div class="hero-ttl">Escalas</div>
        <div class="hero-dsc">Pregação, música e serviço diaconal nos cultos da IPPenha</div>
      </div>
    </div>
    <div class="ct">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:10px">Módulos de Escala</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        ${_mod(IC.cultos,  'rgba(90,200,250,0.12)', sky,    'Escala de Pregação',  'Pastores e pregadores programados',        'pastoral-preg')}
        ${_mod(IC.escalas, 'rgba(90,200,250,0.12)', teal,   'Disponibilidade',     'Controle de disponibilidade para pregar',  'pastoral-disp')}
        ${_mod(IC.grid,    'rgba(139,111,212,0.12)',violet,  'Escalas de Música',   'Músicos e responsáveis pelo louvor',       'min-esc')}
        ${_mod(IC.hands,   'rgba(184,122,86,0.12)', copper,  'Escalas Diaconais',   'Diáconos de serviço nos cultos',           'diac-escalas')}
      </div>
    </div>`;
}

// ── Liderança: visão geral ─────────────────────────────
function renderLiderancaDash(){
  const el=document.getElementById('v-lideranca-dash');
  if(!el) return;
  const sky='var(--sky)',gr='var(--gr)',amber='var(--amber)',teal='var(--teal)';
  el.innerHTML=`
    <div class="hero">
      <div class="hero-ic" style="background:rgba(88,152,212,0.12);border-color:rgba(88,152,212,0.28)">${_sv24('<circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/><path d="M2 20h4M18 20h4"/>')}</div>
      <div>
        <div class="hero-lbl">Governança</div>
        <div class="hero-ttl">Liderança</div>
        <div class="hero-dsc">Oficiais ordenados, nomeados, seminaristas e corpo pastoral da IPPenha</div>
      </div>
    </div>
    <div class="ct">
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        ${_kpi(_sv('<circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>'), 'rgba(74,156,245,0.12)', sky,   '<span id="k-lid-pastores">—</span>', 'Pastores',  'corpo pastoral ativo')}
        ${_kpi(_sv('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>'), 'rgba(58,170,92,0.12)', gr,  '<span id="k-lid-nomeados">—</span>', 'Nomeados',  'funções temporárias')}
        ${_kpi(IC.shield, 'rgba(88,152,212,0.12)', sky,   '<span id="k-lid-ordenados">—</span>','Ordenados', 'ofícios permanentes')}
        ${_kpi(IC.book,   'rgba(212,168,67,0.12)', amber, '<span id="k-lid-seminario">—</span>','Seminaristas','em formação teológica')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px">
        ${_mod(IC.users,  'rgba(74,156,245,0.12)', sky,    'Nomeados',          'Funções temporárias do Conselho',          'conselho-nomeados')}
        ${_mod(IC.shield, 'rgba(88,152,212,0.12)', sky,    'Ordenados',         'Ofícios permanentes — presbíteros e diáconos', 'conselho-ordenados')}
        ${_mod(IC.book,   'rgba(212,168,67,0.12)', amber,  'Seminaristas',      'Candidatos em formação teológica',         'conselho-seminaristas')}
        ${_mod(IC.pastoral,'rgba(42,181,192,0.12)',teal,   'Pastores',          'Corpo pastoral e escala de pregação',      'pastoral-pastores')}
      </div>
    </div>`;

  // fetch KPIs
  const api=typeof apiBaseUrl==='function'?apiBaseUrl():'';
  const hdrs=typeof apiHeaders==='function'?apiHeaders():{};
  if(!api) return;
  Promise.all([
    _cnt('oficiais','&cargo=eq.pastor&status=in.(ativo,especial)&deleted_at=is.null'),
    _cnt('nomeados','&deleted_at=is.null'),
    _cnt('conselho_ordenados','&deleted_at=is.null&status=eq.ativo'),
    _cnt('conselho_seminaristas','&deleted_at=is.null'),
  ]).then(([pastores,nomeados,ordenados,seminario])=>{
    _set('k-lid-pastores',  pastores  ?? '—');
    _set('k-lid-nomeados',  nomeados  ?? '—');
    _set('k-lid-ordenados', ordenados ?? '—');
    _set('k-lid-seminario', seminario ?? '—');
  }).catch(()=>{});
}

// ══════════════════════════════════════════════════════
// HUB: Central de Demandas
// ══════════════════════════════════════════════════════
function renderHubDem(){
  const el=document.getElementById('v-hub-dem');
  if(!el) return;

  const rose='var(--rose)',bgRose='rgba(208,104,104,';
  const amber='var(--amber)',bgAmber='rgba(208,144,64,';
  const gr='var(--gr)',bgGr='rgba(58,170,92,';
  const sky='var(--sky)',bgSky='rgba(74,156,245,';
  const mes=new Date().toISOString().slice(0,7);
  const inboxSvg='<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>';

  el.innerHTML=`
    <div class="hero">
      <div class="hero-ic" style="background:${bgRose}0.12);border-color:${bgRose}0.28)">${_sv24(inboxSvg)}</div>
      <div>
        <div class="hero-lbl">Seção</div>
        <div class="hero-ttl">Central de Demandas</div>
        <div class="hero-dsc">Solicitações, análise e acompanhamento</div>
      </div>
    </div>
    <div class="ct">
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px">
        ${_kpi(IC.inbox, bgRose+'0.12)',rose,  '<span id="k-dem-abertas">—</span>','Abertas agora',    'Pendentes e em andamento')}
        ${_kpi(IC.bell,  bgAmber+'0.12)',amber,'<span id="k-dem-pend">—</span>',   'Pendentes',        'Aguardando primeira ação')}
        ${_kpi(IC.cal,   bgSky+'0.12)', sky,  '<span id="k-dem-mes">—</span>',    'Abertas este mês', 'Novas solicitações')}
        ${_kpi(IC.vote,  bgGr+'0.12)',  gr,   '<span id="k-dem-conc">—</span>',   'Resolvidas',       'Total concluídas e pagas')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="card">
          <div class="ctit">Urgentes e Prioritárias <span class="cact" onclick="go('dem-todas')">Ver todas</span></div>
          <div id="dem-hub-urg">${_vazio('Carregando…')}</div>
        </div>
        <div class="card">
          <div class="ctit">Abertas Recentemente <span class="cact" onclick="go('dem-todas')">Ver todas</span></div>
          <div id="dem-hub-rec">${_vazio('Carregando…')}</div>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <div class="ctit">Distribuição por Área <span class="cact" onclick="go('dem-todas')">Ver todas</span></div>
        <div id="dem-hub-areas">${_vazio('Carregando…')}</div>
      </div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:10px">Módulos</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        ${_mod(IC.grid,  bgRose+'0.12)', rose,  'Todas as Solicitações','Visão completa de todas as demandas',     'dem-todas')}
        ${_mod(IC.book,  bgAmber+'0.12)',amber,  'Em Análise',           'Demandas em revisão e avaliação',         'dem-analise')}
        ${_mod(IC.gear,  bgSky+'0.12)',  sky,   'Em Andamento',         'Execução e acompanhamento ativo',         'dem-and')}
        ${_mod(IC.vote,  bgGr+'0.12)',   gr,    'Concluídas',           'Demandas finalizadas e pagas',            'dem-conc')}
        ${_mod(IC.cal,   bgRose+'0.12)', rose,  'Histórico',            'Registro completo de todas as demandas',  'dem-hist')}
        ${_mod(IC.mega,  bgAmber+'0.12)',amber,  'WhatsApp',             'Notificações e mensagens de demandas',    'wa-demandas')}
      </div>
    </div>`;

  // KPIs via v_demandas (status normalizados)
  _cnt('v_demandas','&status=not.in.(Conclu%C3%ADda,Pago,Cancelada)')
    .then(n=>_set('k-dem-abertas',n));
  _cnt('v_demandas','&status=eq.Pendente')
    .then(n=>_set('k-dem-pend',n));
  _cnt('v_demandas',`&criado_em=gte.${mes}-01`)
    .then(n=>_set('k-dem-mes',n));
  _cnt('v_demandas','&status=in.(Conclu%C3%ADda,Pago)')
    .then(n=>_set('k-dem-conc',n));

  // Lista urgentes — via v_demandas (dados normalizados)
  fetch(`${apiBaseUrl()}/rest/v1/v_demandas?select=id,titulo,area,prioridade,status&prioridade=in.(Alta,Urgente)&status=not.in.(Conclu%C3%ADda,Pago,Cancelada)&order=criado_em.desc&limit=6`,
    {headers:apiHeaders()})
    .then(r=>r.ok?r.json():[])
    .then(rows=>{
      const el=document.getElementById('dem-hub-urg');
      if(!el) return;
      if(!rows.length){el.innerHTML=_vazio('Nenhuma demanda urgente');return;}
      el.innerHTML=rows.map(r=>{
        const corPri=r.prioridade==='Urgente'?rose:amber;
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
          <div style="width:3px;height:36px;border-radius:2px;background:${corPri};flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(r.titulo||'Demanda')}</div>
            <div style="font-size:11px;color:var(--tx3)">${_esc(r.area||'')}${r.area?' · ':''}${_esc(r.status||'')}</div>
          </div>
          <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:${corPri}22;color:${corPri};flex-shrink:0">${_esc(r.prioridade||'')}</span>
        </div>`;
      }).join('');
    }).catch(()=>{const el=document.getElementById('dem-hub-urg');if(el)el.innerHTML=_vazio('Dados não disponíveis');});

  // Lista recentes
  fetch(`${apiBaseUrl()}/rest/v1/v_demandas?select=id,titulo,area,criado_em,status&status=not.in.(Conclu%C3%ADda,Pago,Cancelada)&order=criado_em.desc&limit=6`,
    {headers:apiHeaders()})
    .then(r=>r.ok?r.json():[])
    .then(rows=>{
      const el=document.getElementById('dem-hub-rec');
      if(!el) return;
      if(!rows.length){el.innerHTML=_vazio('Nenhuma demanda aberta');return;}
      el.innerHTML=rows.map(r=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
          <div style="width:3px;height:36px;border-radius:2px;background:${bgRose}0.6);flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(r.titulo||'Demanda')}</div>
            <div style="font-size:11px;color:var(--tx3)">${_esc(r.area||'')}${r.area?' · ':''}${_esc(r.status||'')}</div>
          </div>
          <div style="font-size:11px;color:var(--tx3);flex-shrink:0;white-space:nowrap">${_fmt(r.criado_em?.slice(0,10))}</div>
        </div>`).join('');
    }).catch(()=>{const el=document.getElementById('dem-hub-rec');if(el)el.innerHTML=_vazio('Dados não disponíveis');});

  // Distribuição por área (das demandas abertas)
  fetch(`${apiBaseUrl()}/rest/v1/v_demandas?select=area&status=not.in.(Conclu%C3%ADda,Pago,Cancelada)&limit=2000`,
    {headers:apiHeaders()})
    .then(r=>r.ok?r.json():[])
    .then(rows=>{
      const el=document.getElementById('dem-hub-areas');
      if(!el) return;
      const grupos={Financeiro:0,'Administração':0,'Infraestrutura e Conservação':0,Outros:0};
      rows.forEach(r=>{
        const a=String(r.area||'').toLowerCase();
        if(a.includes('financeiro'))grupos.Financeiro++;
        else if(a.includes('administra'))grupos['Administração']++;
        else if(a.includes('infra')||a.includes('conserva'))grupos['Infraestrutura e Conservação']++;
        else grupos.Outros++;
      });
      const total=rows.length||1;
      const cores={Financeiro:gr,'Administração':'var(--gold)','Infraestrutura e Conservação':amber,Outros:'var(--tx3)'};
      const keys=Object.keys(grupos).filter(k=>grupos[k]>0);
      if(!keys.length){el.innerHTML=_vazio('Nenhuma demanda aberta');return;}
      el.innerHTML=keys.map(k=>{
        const pct=Math.round(grupos[k]/total*100);
        const cor=cores[k]||'var(--tx3)';
        return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--bd1)">
          <div style="font-size:12px;color:var(--tx2);min-width:180px;flex-shrink:0">${_esc(k)}</div>
          <div style="flex:1;height:6px;border-radius:3px;background:var(--bg3);overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${cor};border-radius:3px"></div>
          </div>
          <div style="font-size:12px;font-weight:700;color:${cor};min-width:36px;text-align:right;flex-shrink:0">${grupos[k]}</div>
        </div>`;
      }).join('');
    }).catch(()=>{const el=document.getElementById('dem-hub-areas');if(el)el.innerHTML=_vazio('Dados não disponíveis');});
}

// ── Registro no autoload ───────────────────────────────
if(typeof VIEW_AUTOLOAD!=='undefined'){
  VIEW_AUTOLOAD['hub-igreja']     ={fn:renderHubIgreja};
  VIEW_AUTOLOAD['hub-gov']        ={fn:renderHubGov};
  VIEW_AUTOLOAD['hub-dep']        ={fn:renderHubDep};
  VIEW_AUTOLOAD['hub-op']         ={fn:renderHubOp};
  VIEW_AUTOLOAD['hub-adm']        ={fn:renderHubAdm};
  VIEW_AUTOLOAD['hub-dem']        ={fn:renderHubDem};
  VIEW_AUTOLOAD['hub-portal']     ={fn:renderHubPortal};
  VIEW_AUTOLOAD['escalas-dash']   ={fn:renderEscalasDash};
  VIEW_AUTOLOAD['lideranca-dash'] ={fn:renderLiderancaDash};
}

})();
