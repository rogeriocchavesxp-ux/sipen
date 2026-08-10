/* ═══════════════════════════════════════════════════════
   SIPEN — Notificações de Demandas
   notif-dem.js · v1.0.0
═══════════════════════════════════════════════════════ */
(function(){

  const _KEY     = 'sipen_dem_notif_last';
  let _notifs    = [];
  let _open      = false;
  let _shakeInt  = null;

  // ── Helpers ────────────────────────────────────────────
  function _esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _fmt(iso){
    if(!iso) return '';
    try{
      const d=new Date(iso);
      const mn=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return `${d.getDate()} ${mn[d.getMonth()]}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }catch{return '';}
  }

  // ── CSS ────────────────────────────────────────────────
  function _css(){
    if(document.getElementById('dem-notif-css')) return;
    const s=document.createElement('style');
    s.id='dem-notif-css';
    s.textContent=`
      @keyframes _dem-shake {
        0%,100%{ transform:rotate(0) }
        15%    { transform:rotate(14deg) }
        30%    { transform:rotate(-12deg) }
        45%    { transform:rotate(9deg) }
        60%    { transform:rotate(-6deg) }
        75%    { transform:rotate(3deg) }
      }
      #btn-notif-bell { position:relative !important; }
      #btn-notif-bell.dem-ringing {
        animation:_dem-shake .75s ease-in-out;
        transform-origin:top center;
      }
      #dem-nc {
        position:absolute;top:1px;right:0px;
        min-width:15px;height:15px;line-height:15px;
        background:var(--rose);color:#fff;
        font-size:9px;font-weight:800;
        border-radius:8px;padding:0 3px;
        display:none;text-align:center;pointer-events:none;
      }
      #dem-nc.on { display:block; }
      #dem-notif-panel {
        position:fixed;right:12px;
        width:316px;max-height:440px;overflow-y:auto;
        background:var(--bg-card);border:1px solid var(--bd1);
        border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.18);
        z-index:9999;display:none;
      }
      .dem-np-hdr {
        padding:13px 16px 11px;font-size:12px;font-weight:700;
        color:var(--tx1);border-bottom:1px solid var(--bd1);
        display:flex;justify-content:space-between;align-items:center;
        position:sticky;top:0;background:var(--bg-card);z-index:1;
      }
      .dem-np-lbl { display:flex;align-items:center;gap:6px; }
      .dem-np-lbl::before {
        content:'';display:inline-block;width:8px;height:8px;
        border-radius:50%;background:var(--rose);
      }
      .dem-np-clr {
        cursor:pointer;color:var(--tx3);font-size:11px;
        font-weight:500;padding:3px 8px;border-radius:6px;
        border:1px solid var(--bd2);
      }
      .dem-np-clr:hover { background:var(--bg2); }
      .dem-np-item {
        padding:11px 16px;cursor:pointer;
        border-bottom:1px solid var(--bd1);
        display:flex;align-items:flex-start;gap:10px;
        transition:background .1s;
      }
      .dem-np-item:hover { background:var(--bg2); }
      .dem-np-item:last-child { border-bottom:none; }
      .dem-np-dot {
        width:6px;height:6px;border-radius:50%;
        background:var(--rose);flex-shrink:0;margin-top:5px;
      }
      .dem-np-body { flex:1;min-width:0; }
      .dem-np-ttl {
        font-size:12.5px;font-weight:600;color:var(--tx1);
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      }
      .dem-np-meta { font-size:11px;color:var(--tx3);margin-top:2px; }
      .dem-np-empty {
        padding:28px 16px;text-align:center;
        color:var(--tx3);font-size:12px;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Bell & badge ───────────────────────────────────────
  function _bell(){ return document.getElementById('btn-notif-bell'); }
  function _cnt(){  return document.getElementById('dem-nc'); }

  function _shake(){
    const b=_bell();
    if(!b) return;
    b.classList.remove('dem-ringing');
    void b.offsetWidth;
    b.classList.add('dem-ringing');
    b.addEventListener('animationend',()=>b.classList.remove('dem-ringing'),{once:true});
  }

  function _startRinging(){
    _shake();
    clearInterval(_shakeInt);
    _shakeInt=setInterval(_shake, 8000);
  }

  function _stopRinging(){
    clearInterval(_shakeInt);
    _shakeInt=null;
    const b=_bell();
    if(b) b.classList.remove('dem-ringing');
  }

  function _setBadge(){
    const c=_cnt();
    if(!c) return;
    if(_notifs.length){
      c.textContent=_notifs.length>9?'9+':String(_notifs.length);
      c.classList.add('on');
    } else {
      c.textContent='';
      c.classList.remove('on');
    }
  }

  // ── Panel ──────────────────────────────────────────────
  function _panel(){
    let p=document.getElementById('dem-notif-panel');
    if(!p){ p=document.createElement('div'); p.id='dem-notif-panel'; document.body.appendChild(p); }
    return p;
  }

  function _renderPanel(){
    const p=_panel();
    const b=_bell();
    if(b){
      const r=b.getBoundingClientRect();
      p.style.top=(r.bottom+6)+'px';
      p.style.right=(window.innerWidth-r.right)+'px';
    }
    if(!_notifs.length){
      p.innerHTML=`<div class="dem-np-empty">Sem novas demandas</div>`;
    } else {
      p.innerHTML=`
        <div class="dem-np-hdr">
          <span class="dem-np-lbl">Novas Demandas</span>
          <span class="dem-np-clr" onclick="window._demNotifLimpar()">Limpar</span>
        </div>
        ${_notifs.map(n=>`
          <div class="dem-np-item" onclick="window._demNotifAbrir('${_esc(String(n.id))}')">
            <div class="dem-np-dot"></div>
            <div class="dem-np-body">
              <div class="dem-np-ttl">${_esc(n.titulo||'Nova demanda')}</div>
              <div class="dem-np-meta">${_esc(n.area||'')}${n.area?' · ':''}${_fmt(n.criado_em)}</div>
            </div>
          </div>
        `).join('')}
      `;
    }
    p.style.display='block';
  }

  function _toggle(e){
    if(e){ e.stopPropagation(); e.preventDefault(); }
    const p=_panel();
    _open=!_open;
    if(_open){
      _renderPanel();
      _stopRinging();
      _notifs=[]; // mark all as seen
      _setBadge();
    } else {
      p.style.display='none';
    }
  }

  document.addEventListener('click',()=>{
    if(_open){
      _open=false;
      const p=document.getElementById('dem-notif-panel');
      if(p) p.style.display='none';
    }
  });

  // ── Public ─────────────────────────────────────────────
  window._demNotifAbrir=function(id){
    _open=false;
    const p=document.getElementById('dem-notif-panel');
    if(p) p.style.display='none';
    if(typeof window.demAbrirDetalhe==='function'){
      window.demAbrirDetalhe(id,'hub-dem');
    } else if(typeof window.go==='function'){
      window.go('dem-dash');
    }
  };

  window._demNotifLimpar=function(){
    _notifs=[];
    _open=false;
    _stopRinging();
    _setBadge();
    const p=_panel();
    p.innerHTML=`<div class="dem-np-empty">Sem novas demandas</div>`;
    setTimeout(()=>{ p.style.display='none'; },1000);
  };

  // ── Polling ────────────────────────────────────────────
  async function _check(){
    if(typeof apiBaseUrl!=='function'||typeof apiHeaders!=='function') return;
    const base=apiBaseUrl();
    const hdrs=apiHeaders();
    const last=localStorage.getItem(_KEY)||'';

    try{
      // Quick count check first
      let url=`${base}/rest/v1/v_demandas?select=id&order=criado_em.desc&limit=1`;
      if(last) url+=`&criado_em=gt.${last}`;
      const r=await fetch(url,{headers:{...hdrs,'Prefer':'count=exact','Range':'0-0'}});
      if(!r.ok) return;

      if(!last){
        // First run: just set the baseline from the most recent demand
        const rows=await r.json();
        if(rows&&rows.length&&rows[0].id){
          // fetch the actual latest timestamp
          const r2=await fetch(`${base}/rest/v1/v_demandas?select=criado_em&order=criado_em.desc&limit=1`,{headers:hdrs});
          if(r2.ok){
            const d=await r2.json();
            if(d&&d[0]&&d[0].criado_em) localStorage.setItem(_KEY,d[0].criado_em);
          }
        }
        return;
      }

      const m=(r.headers.get('Content-Range')||'').match(/\/(\d+)$/);
      const total=m?+m[1]:0;
      if(!total) return;

      // Fetch the new ones (up to 20)
      const r2=await fetch(
        `${base}/rest/v1/v_demandas?select=id,titulo,area,criado_em&order=criado_em.desc&criado_em=gt.${last}&limit=20`,
        {headers:hdrs}
      );
      if(!r2.ok) return;
      const novas=await r2.json();
      if(!novas||!novas.length) return;

      // Prepend to list (newest first), cap at 20
      _notifs=[...novas,..._notifs].slice(0,20);
      localStorage.setItem(_KEY,novas[0].criado_em);
      _setBadge();
      if(!_open) _startRinging();
    }catch(e){}
  }

  // ── Init ───────────────────────────────────────────────
  function _init(){
    _css();
    const b=_bell();
    if(!b){ setTimeout(_init,600); return; }
    b.onclick=_toggle;
    b.title='Notificações de demandas';
    _check();
    setInterval(_check,60000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(_init,1200));
  } else {
    setTimeout(_init,1200);
  }

})();
