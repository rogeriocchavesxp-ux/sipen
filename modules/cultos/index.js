/* ═══════════════════════════════════════════════════════
   SIPEN — Cultos · Dashboard
   modules/cultos/index.js · v1.0.0
═══════════════════════════════════════════════════════ */
(function(){

const _sb=()=>getSupabase();

const STATUS={
  em_preparacao:      {lbl:'Em preparação',          cor:'var(--tx3)',   bg:'rgba(138,145,158,.12)'},
  aguardando_info:    {lbl:'Aguardando informações',  cor:'var(--amber)', bg:'rgba(208,144,64,.12)'},
  escalas_incompletas:{lbl:'Escalas incompletas',     cor:'var(--amber)', bg:'rgba(208,144,64,.12)'},
  liturgia_revisao:   {lbl:'Em revisão',              cor:'var(--sky)',   bg:'rgba(74,156,245,.12)'},
  pronto:             {lbl:'Pronto',                  cor:'var(--gr)',    bg:'rgba(58,170,92,.12)'},
  em_andamento:       {lbl:'Em andamento',            cor:'var(--teal)', bg:'rgba(42,181,192,.12)'},
  encerrado:          {lbl:'Encerrado',               cor:'var(--tx3)',   bg:'rgba(138,145,158,.12)'},
  cancelado:          {lbl:'Cancelado',               cor:'var(--rose)', bg:'rgba(229,62,62,.12)'},
  arquivado:          {lbl:'Arquivado',               cor:'var(--tx4)',   bg:'rgba(60,64,80,.12)'},
};

const PEND_STATUS=['em_preparacao','aguardando_info','escalas_incompletas','liturgia_revisao'];

function _esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function _fmtData(iso){
  if(!iso) return '—';
  const d=new Date(iso);
  const dias=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${dias[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]}`;
}
function _fmtHora(iso){
  if(!iso) return '';
  const d=new Date(iso);
  const h=d.getHours(),m=d.getMinutes();
  return `${String(h).padStart(2,'0')}h${m?String(m).padStart(2,'0'):''}`;
}

function _badge(status){
  const s=STATUS[status]||{lbl:status,cor:'var(--tx3)',bg:'rgba(138,145,158,.12)'};
  return `<span style="font-size:10px;font-weight:600;color:${s.cor};background:${s.bg};padding:2px 8px;border-radius:4px;white-space:nowrap">${s.lbl}</span>`;
}

const _sv=p=>`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

function _ball(svg,bg,color){
  return `<div style="width:40px;height:40px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="color:${color}">${svg}</span></div>`;
}
function _kpi(icon,bg,color,id,label,sub){
  return `<div class="card" style="padding:18px 16px;display:flex;flex-direction:column">
    <div style="margin-bottom:12px">${_ball(icon,bg,color)}</div>
    <div style="font-size:30px;font-weight:800;color:var(--tx1);line-height:1" id="${id}">—</div>
    <div style="font-size:13px;font-weight:600;color:var(--tx1);margin-top:5px">${label}</div>
    <div style="font-size:11.5px;color:var(--tx3);margin-top:2px">${sub}</div>
  </div>`;
}
function _mod(icon,bg,color,title,desc,route){
  return `<div class="card" style="cursor:pointer;display:flex;align-items:center;gap:14px" onclick="go('${route}')">
    ${_ball(icon,bg,color)}
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:600;color:var(--tx1)">${title}</div>
      <div style="font-size:11.5px;color:var(--tx3);margin-top:2px">${desc}</div>
    </div>
    <span style="font-size:12px;color:var(--gr);font-weight:500;flex-shrink:0">Abrir →</span>
  </div>`;
}

function _cultoRow(c){
  const tipo=c.culto_tipos?.nome||'Culto';
  const tipoCor=c.culto_tipos?.cor||'var(--sky)';
  const data=_fmtData(c.data_inicio);
  const hora=_fmtHora(c.data_inicio);
  return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bd1)">
    <div style="width:3px;height:38px;border-radius:2px;background:${tipoCor};flex-shrink:0"></div>
    <div style="flex:1;min-width:0">
      <div style="font-size:12.5px;font-weight:600;color:var(--tx1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(tipo)}${c.tema?` — ${_esc(c.tema)}`:''}</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:2px">${data}${hora?` · ${hora}`:''}</div>
    </div>
    <div style="flex-shrink:0">${_badge(c.status)}</div>
  </div>`;
}

async function renderCultosDash(){
  const el=document.getElementById('v-cultos-dash');
  if(!el) return;

  const IC_CROSS  =_sv('<path d="M12 2v20"/><path d="M5 9h14"/>');
  const IC_CHECK  =_sv('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>');
  const IC_WARN   =_sv('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>');
  const IC_CAL    =_sv('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>');
  const IC_MUSIC  =_sv('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>');
  const IC_HANDS  =_sv('<path d="M18 11c0-1.1-.9-2-2-2s-2 .9-2 2v2H8.5a2.5 2.5 0 0 0 0 5H14a6 6 0 0 0 6-6v-1"/><path d="M14 9V7a2 2 0 0 0-4 0v2"/>');

  el.innerHTML=`
    <div class="hero">
      <div class="hero-ic" style="background:rgba(90,200,250,0.12);border-color:rgba(90,200,250,0.28);font-size:22px">✝</div>
      <div>
        <div class="hero-lbl">Módulo</div>
        <div class="hero-ttl">Cultos</div>
        <div class="hero-dsc">Liturgia, escalas e acompanhamento dos cultos</div>
      </div>
    </div>
    <div class="ct">

      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px">
        ${_kpi(IC_CROSS, 'rgba(90,200,250,.12)', 'var(--sky)',  'kpi-c-mes',    'Este mês',   'Total de cultos programados')}
        ${_kpi(IC_CHECK, 'rgba(58,170,92,.12)',  'var(--gr)',   'kpi-c-pronto', 'Prontos',    'Preparação concluída')}
        ${_kpi(IC_WARN,  'rgba(208,144,64,.12)', 'var(--amber)','kpi-c-pend',   'Pendências', 'Aguardando ações')}
        ${_kpi(IC_CAL,   'rgba(74,156,245,.12)', 'var(--sky)',  'kpi-c-enc',    'Realizados', 'Encerrados este mês')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div class="card">
          <div class="ctit">Próximos Cultos <span class="cact" onclick="go('proculto-dash')">Ver todos</span></div>
          <div id="c-dash-prox"><div style="padding:20px 0;text-align:center;color:var(--tx3);font-size:11.5px">Carregando...</div></div>
        </div>
        <div class="card">
          <div class="ctit">Cultos Recentes <span class="cact" onclick="go('pastoral-proculto')">Ver todos</span></div>
          <div id="c-dash-rec"><div style="padding:20px 0;text-align:center;color:var(--tx3);font-size:11.5px">Carregando...</div></div>
        </div>
      </div>

      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:10px">Módulos</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        ${_mod(IC_CROSS, 'rgba(90,200,250,.12)',  'var(--sky)',    'Liturgia dos Cultos',  'Programação e liturgia de cada culto',   'pastoral-proculto')}
        ${_mod(IC_CAL,   'rgba(90,200,250,.12)',  'var(--sky)',    'Escalas de Pregação',  'Pastores e pregadores escalados',        'pastoral-preg')}
        ${_mod(IC_MUSIC, 'rgba(138,107,193,.12)', 'var(--violet)', 'Escalas de Música',   'Músicos e responsáveis pelo louvor',     'min-esc')}
        ${_mod(IC_HANDS, 'rgba(184,122,86,.12)',  'var(--copper)', 'Escalas Diaconais',   'Diáconos de serviço nos cultos',         'diac-escalas')}
      </div>

    </div>`;

  // ── Fetch data ────────────────────────────────────────
  const sb=_sb();
  if(!sb) return;

  const hoje=new Date();
  const ano=hoje.getFullYear();
  const mes=String(hoje.getMonth()+1).padStart(2,'0');
  const inicioMes=`${ano}-${mes}-01T00:00:00`;
  const fimMes=`${ano}-${mes}-31T23:59:59`;
  const hojeIso=hoje.toISOString();

  const [resMes,resProx,resRec]=await Promise.all([
    sb.from('cultos').select('id,status').gte('data_inicio',inicioMes).lte('data_inicio',fimMes).is('deleted_at',null),
    sb.from('cultos').select('id,data_inicio,status,tema,culto_tipos(nome,cor)').gte('data_inicio',hojeIso).is('deleted_at',null).order('data_inicio').limit(6),
    sb.from('cultos').select('id,data_inicio,status,tema,culto_tipos(nome,cor)').lt('data_inicio',hojeIso).is('deleted_at',null).order('data_inicio',{ascending:false}).limit(6),
  ]);

  const cultosMes=resMes.data||[];
  const proximos=resProx.data||[];
  const recentes=resRec.data||[];

  // KPIs
  const _sk=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v??'0');};
  _sk('kpi-c-mes',   cultosMes.length);
  _sk('kpi-c-pronto',cultosMes.filter(c=>c.status==='pronto').length);
  _sk('kpi-c-pend',  cultosMes.filter(c=>PEND_STATUS.includes(c.status)).length);
  _sk('kpi-c-enc',   cultosMes.filter(c=>c.status==='encerrado').length);

  // Listas
  const VAZIO=`<div style="padding:20px 0;text-align:center;color:var(--tx3);font-size:11.5px">— Nenhum culto encontrado</div>`;
  const proxEl=document.getElementById('c-dash-prox');
  if(proxEl) proxEl.innerHTML=proximos.length?proximos.map(_cultoRow).join(''):VAZIO;
  const recEl=document.getElementById('c-dash-rec');
  if(recEl) recEl.innerHTML=recentes.length?recentes.map(_cultoRow).join(''):VAZIO;
}

if(typeof VIEW_AUTOLOAD!=='undefined'){
  VIEW_AUTOLOAD['cultos-dash']={fn:renderCultosDash};
}

})();
