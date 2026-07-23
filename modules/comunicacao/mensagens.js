/* Central de Comunicação — mensagens.js v1.0 */
(function(){
'use strict';

let _campanhas = [];
let _modelos   = [];
let _wz        = null;
let _wzCongs   = [];
let _wzMins    = [];

const CANAL_IC  = { whatsapp:'💬', email:'📧', notificacao:'🔔', todos:'📢' };
const CANAL_LBL = { whatsapp:'WhatsApp', email:'E-mail', notificacao:'Notificação SIPEN', todos:'Todos os canais' };
const STATUS_STYLE = {
  rascunho:  'background:rgba(120,120,120,.14);color:var(--tx3)',
  agendada:  'background:rgba(74,156,245,.14);color:var(--sky)',
  enviando:  'background:rgba(212,168,67,.14);color:var(--gold)',
  enviada:   'background:rgba(61,160,85,.14);color:var(--gr)',
  parcial:   'background:rgba(208,144,64,.14);color:var(--amber)',
  falha:     'background:rgba(208,104,104,.14);color:var(--rose)',
};
const STATUS_LBL = { rascunho:'Rascunho', agendada:'Agendada', enviando:'Enviando', enviada:'Enviada', parcial:'Parcial', falha:'Falha' };
const CAT_LBL    = { convocacao:'Convocação', aviso:'Aviso', culto:'Culto', funeral:'Funeral', casamento:'Casamento', aniversario:'Aniversário', pgs:'PG', missoes:'Missões', escala:'Escala', outros:'Outros' };

const _LOWER_PT = new Set(['de','da','do','das','dos','e','a','o','em','com','por','para']);
function _fmtNome(str){
  return (str||'').toLowerCase().split(' ').map((w,i)=>
    (i>0&&_LOWER_PT.has(w))?w:w.charAt(0).toUpperCase()+w.slice(1)
  ).join(' ');
}

function _badge(status){
  return `<span style="padding:2px 9px;border-radius:99px;font-size:11px;font-weight:600;${STATUS_STYLE[status]||''}">${STATUS_LBL[status]||status}</span>`;
}

function _fmtDt(dt){
  if(!dt) return '—';
  return new Date(dt).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function _fmtDtHr(dt){
  if(!dt) return '—';
  return new Date(dt).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

// ══════════════════════════════════════════════════════════════
// LISTA DE MENSAGENS
// ══════════════════════════════════════════════════════════════

async function carregarMensagens(){
  const el=document.getElementById('msg-main');
  if(!el) return;
  el.innerHTML='<div style="padding:32px;text-align:center;color:var(--tx3)">Carregando...</div>';
  try{
    const r=await fetch(`${apiBaseUrl()}/rest/v1/msg_campanhas?order=criado_em.desc&limit=60`,{headers:apiHeaders()});
    _campanhas=await r.json();
    if(!Array.isArray(_campanhas)) throw new Error('Resposta inválida');
    _renderMensagens(_campanhas);
  }catch(e){
    el.innerHTML=`<div class="alr" style="margin:16px">Erro ao carregar: ${escapeHtml(e.message)}</div>`;
  }
}

function _renderMensagens(rows){
  const el=document.getElementById('msg-main');
  if(!el) return;
  if(!rows.length){
    el.innerHTML=`<div class="card" style="padding:48px;text-align:center">
      <div style="font-size:36px;margin-bottom:14px">📢</div>
      <div style="font-weight:600;font-size:15px;margin-bottom:8px">Nenhuma mensagem ainda</div>
      <div style="color:var(--tx3);font-size:13px;margin-bottom:24px">Use a Central de Comunicação para enviar mensagens segmentadas à sua base de membros.</div>
      <button class="tbt pri" onclick="msgNovaMensagem()">+ Nova Mensagem</button>
    </div>`;
    return;
  }
  el.innerHTML=`<div class="card" style="padding:0;overflow:hidden">
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr>
        <th style="width:130px">Canal</th>
        <th>Mensagem</th>
        <th style="width:90px">Status</th>
        <th style="width:110px;text-align:center">Entregas</th>
        <th style="width:100px">Data</th>
        <th style="width:48px"></th>
      </tr></thead>
      <tbody>${rows.map(r=>{
        const entregue = r.total_entregue||0;
        const total    = r.total_dest||0;
        const falha    = r.total_falha||0;
        const entregaPct = total>0 ? Math.round((entregue/total)*100) : null;
        const entregaClr = falha>0&&entregue===0 ? 'var(--rose)' : falha>0 ? 'var(--amber)' : 'var(--gr)';
        const entregaStr = total>0
          ? `<span style="font-weight:600;color:${entregaClr};font-variant-numeric:tabular-nums">${entregue}</span><span style="color:var(--tx3)">/${total}</span>${falha>0?`<span style="font-size:10px;color:var(--rose);margin-left:4px">${falha} ✗</span>`:''}`
          : `<span style="color:var(--tx3)">—</span>`;
        return `<tr style="cursor:pointer" onclick="msgAbrir('${r.id}')">
          <td>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:16px;line-height:1">${CANAL_IC[r.canal]||'📢'}</span>
              <span style="font-size:11px;color:var(--tx3);font-weight:500">${CANAL_LBL[r.canal]||r.canal}</span>
            </div>
          </td>
          <td>
            <div style="font-weight:500;font-size:13px">${escapeHtml(r.titulo||'—')}</div>
            ${r.filtros_desc?`<div style="font-size:11px;color:var(--tx3);margin-top:2px;max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">→ ${escapeHtml(r.filtros_desc)}</div>`:''}
          </td>
          <td>${_badge(r.status)}</td>
          <td style="text-align:center;font-size:12px;font-variant-numeric:tabular-nums">${entregaStr}</td>
          <td style="font-size:11px;color:var(--tx3);white-space:nowrap">${_fmtDt(r.criado_em)}</td>
          <td style="white-space:nowrap">
            <button onclick="event.stopPropagation();msgAbrir('${r.id}')" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);cursor:pointer">Ver</button>
            <button onclick="event.stopPropagation();msgReutilizarCampanha('${r.id}')" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(139,111,212,.35);background:transparent;color:var(--violet);cursor:pointer;margin-left:4px">Reutilizar</button>
          </td>
        </tr>`;
      }).join('')}
      </tbody>
    </table></div>
  </div>`;
}

window.msgFiltrar=function(){
  const q=(document.getElementById('msg-f-busca')||{}).value?.toLowerCase()||'';
  const canal=(document.getElementById('msg-f-canal')||{}).value||'';
  const status=(document.getElementById('msg-f-status')||{}).value||'';
  _renderMensagens(_campanhas.filter(r=>{
    return (!q||(r.titulo||'').toLowerCase().includes(q))
        && (!canal||r.canal===canal)
        && (!status||r.status===status);
  }));
};

// ══════════════════════════════════════════════════════════════
// DETALHE (modal overlay)
// ══════════════════════════════════════════════════════════════

window.msgAbrir=async function(id){
  try{
    const r=await fetch(`${apiBaseUrl()}/rest/v1/msg_campanhas?id=eq.${id}`,{headers:apiHeaders()});
    const [c]=await r.json();
    if(!c) return T('Erro','Mensagem não encontrada.');
    const ov=document.createElement('div');
    ov.id='msg-det-overlay';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9100;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto';
    ov.innerHTML=`<div style="background:var(--bg-card);border-radius:14px;border:1px solid var(--bd1);width:100%;max-width:560px;max-height:90vh;overflow-y:auto">
      <div style="padding:20px 24px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--bd1)">
        <div style="font-weight:700;font-size:16px">${escapeHtml(c.titulo)}</div>
        <button onclick="document.getElementById('msg-det-overlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--tx3)">✕</button>
      </div>
      <div style="padding:20px 24px 24px;display:flex;flex-direction:column;gap:14px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:3px">Canal</div>
            <div>${CANAL_IC[c.canal]||'📢'} ${CANAL_LBL[c.canal]||c.canal}</div></div>
          <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:3px">Status</div>
            <div>${_badge(c.status)}</div></div>
          <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:3px">Criado em</div>
            <div style="font-size:13px">${_fmtDtHr(c.criado_em)}</div></div>
          <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:3px">Criado por</div>
            <div style="font-size:13px">${escapeHtml(c.criado_por_nm||'—')}</div></div>
          <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:3px">Destinatários</div>
            <div style="font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--violet)">${c.total_dest}</div></div>
          <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:3px">Entregues</div>
            <div style="font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--gr)">${c.total_entregue}</div></div>
        </div>
        ${c.filtros_desc?`<div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:4px">Destinatários selecionados</div>
          <div style="font-size:13px;color:var(--tx2)">${escapeHtml(c.filtros_desc)}</div>
        </div>`:''}
        ${c.agendado_para?`<div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:4px">Agendado para</div>
          <div style="font-size:13px">${_fmtDtHr(c.agendado_para)}</div>
        </div>`:''}
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:6px">Conteúdo</div>
          <div style="background:rgba(139,111,212,.05);border:1px solid rgba(139,111,212,.15);border-radius:10px;padding:14px 16px;font-size:13px;white-space:pre-wrap;line-height:1.7;color:var(--tx1)">${escapeHtml(c.conteudo||'—')}</div>
        </div>
      </div>
    </div>`;
    document.getElementById('msg-det-overlay')?.remove();
    document.body.appendChild(ov);
  }catch(e){ T('Erro',e.message); }
};

// ══════════════════════════════════════════════════════════════
// MODELOS
// ══════════════════════════════════════════════════════════════

async function carregarModelos(){
  const el=document.getElementById('msg-modelos-grid');
  if(!el) return;
  el.innerHTML='<div style="color:var(--tx3);padding:20px">Carregando...</div>';
  try{
    const r=await fetch(`${apiBaseUrl()}/rest/v1/msg_modelos?ativo=eq.true&order=criado_em.asc`,{headers:apiHeaders()});
    _modelos=await r.json();
    _renderModelos(_modelos);
  }catch(e){
    el.innerHTML=`<div class="alr" style="margin:8px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

function _renderModelos(rows){
  const el=document.getElementById('msg-modelos-grid');
  if(!el) return;
  if(!rows.length){
    el.innerHTML='<div class="card" style="padding:40px;text-align:center;grid-column:1/-1"><div style="font-size:28px;margin-bottom:10px">📝</div><div style="color:var(--tx3)">Nenhum modelo cadastrado.</div></div>';
    return;
  }
  el.innerHTML=rows.map(m=>`<div class="card">
    <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:10px">
      <span style="font-size:20px;line-height:1;padding-top:2px">${CANAL_IC[m.canal]||'📢'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(m.nome)}</div>
        <div style="font-size:11px;color:var(--tx3);margin-top:1px">${CAT_LBL[m.categoria]||m.categoria}</div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--tx2);line-height:1.55;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;white-space:pre-wrap;margin-bottom:12px">${escapeHtml(m.conteudo)}</div>
    <div style="display:flex;gap:6px">
      <button onclick="msgAbrirFormModelo('${m.id}')" style="flex:1;font-size:11px;padding:5px;border-radius:7px;border:1px solid rgba(139,111,212,.3);background:rgba(139,111,212,.07);color:var(--violet);cursor:pointer;font-weight:600">Editar</button>
      <button onclick="msgNovaComModelo('${m.id}')" style="flex:1;font-size:11px;padding:5px;border-radius:7px;border:none;background:var(--violet);color:#fff;cursor:pointer;font-weight:600">Usar</button>
    </div>
  </div>`).join('');
}

window.msgAbrirFormModelo=function(id){
  const m=id?_modelos.find(x=>x.id===id):null;
  const ov=document.createElement('div');
  ov.id='msg-mod-overlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9100;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML=`<div style="background:var(--bg-card);border-radius:14px;border:1px solid var(--bd1);width:100%;max-width:520px;max-height:90vh;overflow-y:auto">
    <div style="padding:20px 24px 0;display:flex;align-items:center;justify-content:space-between">
      <div style="font-weight:700;font-size:15px">${m?'Editar Modelo':'Novo Modelo'}</div>
      <button onclick="document.getElementById('msg-mod-overlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--tx3)">✕</button>
    </div>
    <div style="padding:20px 24px 24px;display:flex;flex-direction:column;gap:13px">
      <div>
        <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Nome do modelo</label>
        <input id="mf-nome" type="text" value="${escapeHtml(m?.nome||'')}" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:13px;box-sizing:border-box">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Canal</label>
          <select id="mf-canal" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:13px">
            <option value="todos" ${(m?.canal||'todos')==='todos'?'selected':''}>Todos</option>
            <option value="whatsapp" ${m?.canal==='whatsapp'?'selected':''}>WhatsApp</option>
            <option value="email" ${m?.canal==='email'?'selected':''}>E-mail</option>
            <option value="notificacao" ${m?.canal==='notificacao'?'selected':''}>Notificação</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Categoria</label>
          <select id="mf-cat" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:13px">
            ${Object.entries(CAT_LBL).map(([v,l])=>`<option value="${v}" ${m?.categoria===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
      </div>
      <div>
        <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Conteúdo <span style="opacity:.55">(use {{nome}}, {{data}}, {{local}}, {{evento}} como variáveis)</span></label>
        <textarea id="mf-conteudo" rows="9" style="width:100%;padding:9px 11px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:13px;resize:vertical;box-sizing:border-box;font-family:inherit;line-height:1.65"></textarea>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button onclick="document.getElementById('msg-mod-overlay').remove()" style="padding:8px 18px;border-radius:8px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);cursor:pointer;font-size:13px">Cancelar</button>
        <button onclick="msgSalvarModelo('${m?.id||''}')" style="padding:8px 20px;border-radius:8px;border:none;background:var(--violet);color:#fff;cursor:pointer;font-size:13px;font-weight:600">Salvar</button>
      </div>
    </div>
  </div>`;
  document.getElementById('msg-mod-overlay')?.remove();
  document.body.appendChild(ov);
  // Set textarea value after DOM insertion
  const ta=document.getElementById('mf-conteudo');
  if(ta) ta.value=m?.conteudo||'';
};

window.msgSalvarModelo=async function(id){
  const nome=document.getElementById('mf-nome')?.value?.trim();
  const canal=document.getElementById('mf-canal')?.value;
  const categoria=document.getElementById('mf-cat')?.value;
  const conteudo=document.getElementById('mf-conteudo')?.value?.trim();
  if(!nome||!conteudo) return T('Atenção','Preencha nome e conteúdo.');
  try{
    const url=id
      ?`${apiBaseUrl()}/rest/v1/msg_modelos?id=eq.${id}`
      :`${apiBaseUrl()}/rest/v1/msg_modelos`;
    const r=await fetch(url,{
      method:id?'PATCH':'POST',
      headers:{...apiHeaders(),'Content-Type':'application/json'},
      body:JSON.stringify({nome,canal,categoria,conteudo})
    });
    if(!r.ok) throw new Error(await r.text());
    document.getElementById('msg-mod-overlay')?.remove();
    T('Modelo salvo','Template salvo com sucesso.');
    carregarModelos();
  }catch(e){ T('Erro',e.message); }
};

window.msgNovaComModelo=function(id){
  const m=_modelos.find(x=>x.id===id);
  if(!m) return;
  msgNovaMensagem();
  setTimeout(()=>{ if(_wz){ _wz.conteudo=m.conteudo; _wz.canal=m.canal; } },50);
};

window.msgReutilizarCampanha=async function(id){
  let c=_campanhas.find(x=>x.id===id);
  if(!c){
    try{
      const r=await fetch(`${apiBaseUrl()}/rest/v1/msg_campanhas?id=eq.${id}&select=*`,{headers:apiHeaders()});
      const rows=await r.json(); c=rows?.[0];
    }catch(_){}
  }
  if(!c){ T('Erro','Mensagem não encontrada.'); return; }
  msgNovaMensagem();
  setTimeout(()=>{
    if(!_wz) return;
    _wz.canal    = c.canal    || 'whatsapp';
    _wz.conteudo = c.conteudo || '';
    _wz.titulo   = c.titulo   || '';
    _renderWzBody();
  },50);
};

// ══════════════════════════════════════════════════════════════
// HISTÓRICO
// ══════════════════════════════════════════════════════════════

async function carregarHistorico(){
  const el=document.getElementById('msg-hist-container');
  if(!el) return;
  el.innerHTML='<div style="color:var(--tx3);padding:24px">Carregando...</div>';
  try{
    const r=await fetch(
      `${apiBaseUrl()}/rest/v1/msg_campanhas?status=in.(enviada,parcial,falha)&order=enviado_em.desc&limit=100`,
      {headers:apiHeaders()}
    );
    const rows=await r.json();
    if(!rows.length){
      el.innerHTML='<div class="card" style="padding:40px;text-align:center"><div style="font-size:28px;margin-bottom:10px">📋</div><div style="color:var(--tx3)">Nenhuma mensagem enviada ainda.</div></div>';
      return;
    }
    el.innerHTML=`<div class="card" style="padding:0;overflow:hidden">
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Canal</th><th>Título</th><th>Status</th><th>Total</th><th>Entregues</th><th>Falhas</th><th>Data</th><th></th></tr></thead>
        <tbody>${rows.map(r=>`<tr>
          <td title="${CANAL_LBL[r.canal]||r.canal}">${CANAL_IC[r.canal]||'📢'}</td>
          <td style="font-weight:500">${escapeHtml(r.titulo)}</td>
          <td>${_badge(r.status)}</td>
          <td style="text-align:center;font-variant-numeric:tabular-nums">${r.total_dest}</td>
          <td style="text-align:center;font-variant-numeric:tabular-nums;color:var(--gr)">${r.total_entregue}</td>
          <td style="text-align:center;font-variant-numeric:tabular-nums;color:var(--rose)">${r.total_falha}</td>
          <td style="font-size:11px;color:var(--tx3)">${_fmtDt(r.enviado_em||r.criado_em)}</td>
          <td><button onclick="msgReutilizarCampanha('${r.id}')" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(139,111,212,.35);background:transparent;color:var(--violet);cursor:pointer">Reutilizar</button></td>
        </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  }catch(e){
    el.innerHTML=`<div class="alr" style="margin:8px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

// ══════════════════════════════════════════════════════════════
// AGENDAMENTOS
// ══════════════════════════════════════════════════════════════

async function carregarAgendamentos(){
  const el=document.getElementById('msg-agend-container');
  if(!el) return;
  el.innerHTML='<div style="color:var(--tx3);padding:24px">Carregando...</div>';
  try{
    const r=await fetch(
      `${apiBaseUrl()}/rest/v1/msg_campanhas?status=eq.agendada&order=agendado_para.asc`,
      {headers:apiHeaders()}
    );
    const rows=await r.json();
    if(!rows.length){
      el.innerHTML=`<div class="card" style="padding:48px;text-align:center">
        <div style="font-size:32px;margin-bottom:12px">📅</div>
        <div style="font-weight:600;margin-bottom:8px">Nenhuma mensagem agendada</div>
        <div style="color:var(--tx3);font-size:13px;margin-bottom:20px">Use "Nova Mensagem" e escolha "Agendar" para programar envios futuros.</div>
        <button class="tbt" onclick="msgNovaMensagem()">+ Nova Mensagem</button>
      </div>`;
      return;
    }
    el.innerHTML=`<div class="card" style="padding:0;overflow:hidden">
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Canal</th><th>Título</th><th>Destinatários</th><th>Agendado para</th><th></th></tr></thead>
        <tbody>${rows.map(r=>`<tr>
          <td>${CANAL_IC[r.canal]||'📢'} ${CANAL_LBL[r.canal]||r.canal}</td>
          <td style="font-weight:500">${escapeHtml(r.titulo)}</td>
          <td style="text-align:center;font-variant-numeric:tabular-nums">${r.total_dest}</td>
          <td style="font-size:12px">${_fmtDtHr(r.agendado_para)}</td>
          <td><button onclick="msgCancelarAgendamento('${r.id}')" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(208,104,104,.3);background:transparent;color:var(--rose);cursor:pointer">Cancelar</button></td>
        </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  }catch(e){
    el.innerHTML=`<div class="alr" style="margin:8px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

window.msgCancelarAgendamento=async function(id){
  if(!confirm('Cancelar este agendamento e mover para rascunho?')) return;
  try{
    const r=await fetch(`${apiBaseUrl()}/rest/v1/msg_campanhas?id=eq.${id}`,{
      method:'PATCH',
      headers:{...apiHeaders(),'Content-Type':'application/json'},
      body:JSON.stringify({status:'rascunho',agendado_para:null})
    });
    if(!r.ok) throw new Error(await r.text());
    T('Agendamento cancelado','Mensagem movida para rascunho.');
    carregarAgendamentos();
  }catch(e){ T('Erro',e.message); }
};

// ══════════════════════════════════════════════════════════════
// WIZARD — Nova Mensagem
// ══════════════════════════════════════════════════════════════

function _initWz(){
  _wz={passo:1,canal:null,filtros:[],individuais:[],titulo:'',conteudo:'',agendado:null,
    _d:{nivel:1,tipo:null,busca:''}};  // step 2 drill-down state
}

window.msgNovaMensagem=function(){
  _initWz();
  if(!_modelos.length) carregarModelos();
  _renderWizard();
};

function _renderWizard(){
  document.getElementById('msg-wz-overlay')?.remove();
  const ov=document.createElement('div');
  ov.id='msg-wz-overlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto';
  ov.innerHTML=`<div id="msg-wz-panel" style="background:var(--bg-card);border-radius:16px;border:1px solid var(--bd1);width:100%;max-width:700px;margin:auto">
    <div style="padding:20px 24px 16px;display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--bd1)">
      <div style="flex:1">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:2px">NOVA MENSAGEM</div>
        <div style="font-weight:700;font-size:16px">Central de Comunicação</div>
      </div>
      <div id="msg-wz-steps" style="display:flex;gap:6px;align-items:center"></div>
      <button onclick="document.getElementById('msg-wz-overlay').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--tx3);padding:0 4px;line-height:1">✕</button>
    </div>
    <div id="msg-wz-body" style="padding:24px;min-height:320px"></div>
    <div style="padding:16px 24px;border-top:1px solid var(--bd1);display:flex;justify-content:space-between;align-items:center">
      <button id="msg-wz-btn-back" onclick="msgWzBack()" style="padding:9px 20px;border-radius:9px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);cursor:pointer;font-size:13px;display:none">← Voltar</button>
      <span></span>
      <button id="msg-wz-btn-next" onclick="msgWzNext()" style="padding:9px 24px;border-radius:9px;border:none;background:var(--violet);color:#fff;cursor:pointer;font-size:13px;font-weight:600">Próximo →</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  _renderWzBody();
}

function _renderWzSteps(){
  const el=document.getElementById('msg-wz-steps');
  if(!el) return;
  const labels=['Canal','Destinatários','Conteúdo','Envio'];
  el.innerHTML=labels.map((l,i)=>{
    const n=i+1,active=n===_wz.passo,done=n<_wz.passo;
    return `<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:${active?'var(--violet)':done?'var(--gr)':'var(--tx3)'}">
      <div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;
        background:${active?'var(--violet)':done?'var(--gr)':'var(--bd2)'};
        color:${active||done?'#fff':'var(--tx3)'}">${done?'✓':n}</div>
    </div>${n<4?'<div style="width:20px;height:1px;background:var(--bd2)"></div>':''}`;
  }).join('');
}

function _renderWzBody(){
  if(!_wz) return;
  _renderWzSteps();
  const body=document.getElementById('msg-wz-body');
  if(!body) return;
  body.style.padding=_wz.passo===2?'0':'24px';
  body.style.minHeight=_wz.passo===2?'420px':'320px';
  const backBtn=document.getElementById('msg-wz-btn-back');
  const nextBtn=document.getElementById('msg-wz-btn-next');
  if(backBtn) backBtn.style.display=_wz.passo>1?'block':'none';
  if(nextBtn) nextBtn.style.display=_wz.passo<4?'block':'none';
  if(_wz.passo===1) _wzStep1(body);
  else if(_wz.passo===2) _wzStep2(body);
  else if(_wz.passo===3) _wzStep3(body);
  else _wzStep4(body);
}

// ── Passo 1: Canal ─────────────────────────
function _wzStep1(body){
  const chans=[
    {key:'whatsapp',ic:'💬',lbl:'WhatsApp',dsc:'Para contatos com número de telefone cadastrado'},
    {key:'email',ic:'📧',lbl:'E-mail',dsc:'Para membros com endereço de e-mail cadastrado'},
    {key:'notificacao',ic:'🔔',lbl:'Notificação SIPEN',dsc:'Notificação interna para usuários do sistema'},
    {key:'todos',ic:'📢',lbl:'Todos os canais',dsc:'Envia por WhatsApp, e-mail e notificação simultaneamente'}
  ];
  body.innerHTML=`<div style="font-weight:600;margin-bottom:4px">Canal de envio</div>
    <div style="font-size:12px;color:var(--tx3);margin-bottom:20px">Por qual canal a mensagem será enviada?</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${chans.map(c=>`<div onclick="msgWzSetCanal('${c.key}')" style="display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:12px;
        border:2px solid ${_wz.canal===c.key?'var(--violet)':'var(--bd1)'};
        background:${_wz.canal===c.key?'rgba(139,111,212,.07)':'transparent'};cursor:pointer;transition:.12s">
        <span style="font-size:26px">${c.ic}</span>
        <div style="flex:1"><div style="font-weight:600;font-size:14px">${c.lbl}</div>
          <div style="font-size:11px;color:var(--tx3);margin-top:2px">${c.dsc}</div></div>
        <div style="width:18px;height:18px;border-radius:50%;border:2px solid ${_wz.canal===c.key?'var(--violet)':'var(--bd2)'};
          background:${_wz.canal===c.key?'var(--violet)':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          ${_wz.canal===c.key?'<div style="width:7px;height:7px;border-radius:50%;background:#fff"></div>':''}
        </div>
      </div>`).join('')}
    </div>`;
}

window.msgWzSetCanal=function(canal){ if(_wz){_wz.canal=canal;_renderWzBody();} };

// ── Passo 2: Destinatários (progressive disclosure) ──────────────
function _wzStep2(body){
  const d=_wz._d;
  const left=d.nivel===1?_wzD1():d.nivel===2?_wzD2():_wzD3();
  body.innerHTML=`
    <div style="display:flex;min-height:420px">
      <div style="flex:1;padding:24px;overflow-y:auto;min-width:0;max-height:500px">${left}</div>
      <div id="msg-wz-d-summary" style="width:200px;flex-shrink:0;border-left:1px solid var(--bd1);
        padding:18px 14px;background:rgba(139,111,212,.025);display:flex;flex-direction:column">
        ${_wzDSummary()}
      </div>
    </div>`;
  if(d.nivel===3) _wzD3Carregar();
}

function _wzD1(){
  const hasTodos=_wz.filtros.some(f=>f.tipo==='todos_membros');
  const hasGrupo=_wz.filtros.some(f=>
    ['min_','cong_','aniv_','nomeados_','oficial_'].some(p=>f.tipo.startsWith(p))||
    ['visitantes','congregados','nomeados','seminaristas'].includes(f.tipo));
  const hasInd=_wz.individuais.length>0;
  const hasLista=_wz.filtros.some(f=>f.tipo.startsWith('lista_'));
  return `<div style="font-size:12px;color:var(--tx3);margin-bottom:16px;font-weight:500">Para quem você quer enviar?</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${_wzD1Card('todos','Todos os membros','Toda a membresia ativa',hasTodos,false)}
      ${_wzD1Card('grupo','Grupo específico','Por ministério, congregação, função...',hasGrupo,true)}
      ${_wzD1Card('lista','Lista personalizada','Grupos criados por você com membros específicos',hasLista,true)}
      ${_wzD1Card('individual','Pessoas específicas','Adicionar membros individualmente',hasInd,true)}
      ${_wzD1Card('avancado','Pesquisa avançada','Aniversariantes, visitantes, congregados...',false,true)}
    </div>`;
}

function _wzD1Card(mode,title,desc,active,hasArrow){
  return `<div onclick="msgWzD1('${mode}')" style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-radius:12px;
    border:2px solid ${active?'var(--violet)':'var(--bd1)'};
    background:${active?'rgba(139,111,212,.06)':'transparent'};cursor:pointer;transition:.12s">
    <div style="width:20px;height:20px;border-radius:50%;flex-shrink:0;
      border:2px solid ${active?'var(--violet)':'var(--bd2)'};
      background:${active?'var(--violet)':'transparent'};display:flex;align-items:center;justify-content:center">
      ${active?'<div style="width:7px;height:7px;border-radius:50%;background:#fff"></div>':''}
    </div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:600;font-size:13px;color:var(--tx1)">${title}</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:2px">${desc}</div>
    </div>
    ${hasArrow?'<span style="color:var(--tx3);font-size:16px;flex-shrink:0">›</span>':''}
  </div>`;
}

function _wzD2(){
  const tipos=[
    {k:'ministerio',  ic:'🎵', t:'Ministério',                d:'Louvor, Comunicação, Infantil...',        drill:true},
    {k:'congregacao', ic:'⛪', t:'Congregação',               d:'Penha, Aprisco, Vila Rosária...',         drill:true},
    {k:'funcao',      ic:'👔', t:'Função / Ofício',           d:'Pastores, Presbíteros, Supervisores...',  drill:true},
    {k:'pgs',         ic:'🏠', t:'Pequeno Grupo',             d:'Grupos de discipulado e comunhão',        drill:true},
    {k:'todos_ministerios', ic:'🎼', t:'Membros de Ministérios',    d:'Todos os membros de qualquer ministério', drill:false},
    {k:'todos_sociedades',  ic:'🤝', t:'Membros de Sociedades',     d:'UMP, SAF, UCP e outras sociedades',      drill:false},
  ];
  return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:16px">
    <button onclick="msgWzDBack()" style="background:none;border:none;cursor:pointer;color:var(--tx3);font-size:13px;padding:0">← Voltar</button>
    <span style="color:var(--bd2);font-size:12px">/</span>
    <span style="font-size:12px;font-weight:600;color:var(--tx2)">Grupo específico</span>
  </div>
  <div style="font-size:12px;color:var(--tx3);margin-bottom:14px">Escolha o tipo de grupo:</div>
  <div style="display:flex;flex-direction:column;gap:7px">
    ${tipos.map(t=>{
      const sel=_wz.filtros.some(f=>f.tipo===t.k);
      return `<div onclick="msgWzD2('${t.k}')" style="display:flex;align-items:center;gap:12px;padding:12px 15px;border-radius:10px;
        border:1px solid ${sel?'var(--violet)':'var(--bd1)'};
        background:${sel?'rgba(139,111,212,.06)':'transparent'};cursor:pointer;transition:.1s"
        onmouseover="this.style.background='rgba(139,111,212,.05)'"
        onmouseout="this.style.background='${sel?'rgba(139,111,212,.06)':'transparent'}'">
        <span style="font-size:20px;line-height:1">${t.ic}</span>
        <div style="flex:1"><div style="font-weight:600;font-size:13px">${t.t}${sel?' ✓':''}</div>
          <div style="font-size:11px;color:var(--tx3);margin-top:1px">${t.d}</div></div>
        ${t.drill?'<span style="color:var(--tx3);font-size:16px">›</span>':''}
      </div>`;
    }).join('')}
  </div>`;
}

function _wzD3(){
  const tipo=_wz._d.tipo;
  const LABELS={ministerio:'Ministérios',congregacao:'Congregações',funcao:'Funções',pgs:'Pequenos Grupos',avancado:'Pesquisa avançada',individual:'Pessoas específicas',lista:'Listas personalizadas'};
  const PHOLDERS={ministerio:'Pesquisar ministério...',congregacao:'Pesquisar congregação...',funcao:'Pesquisar função...',pgs:'Pesquisar grupo...',individual:'Buscar membro pelo nome...',lista:'Pesquisar lista...'};
  const showSearch=tipo!=='avancado'&&tipo!=='pgs';
  return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:16px">
    <button onclick="msgWzDBack()" style="background:none;border:none;cursor:pointer;color:var(--tx3);font-size:13px;padding:0">← Voltar</button>
    <span style="color:var(--bd2);font-size:12px">/</span>
    <span style="font-size:12px;font-weight:600;color:var(--tx2)">${LABELS[tipo]||tipo}</span>
  </div>
  ${showSearch?`<input id="msg-wz-d3-q" type="text" placeholder="${PHOLDERS[tipo]||'Pesquisar...'}"
    value="${escapeHtml(_wz._d.busca||'')}" oninput="msgWzD3Search(this.value)"
    style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:13px;box-sizing:border-box;margin-bottom:10px">`:''}
  <div id="msg-wz-d3-list" style="display:flex;flex-direction:column;gap:3px;max-height:320px;overflow-y:auto">
    <div style="color:var(--tx3);font-size:12px;padding:8px">Carregando...</div>
  </div>`;
}

async function _wzD3Carregar(){
  const tipo=_wz._d?.tipo;
  const el=document.getElementById('msg-wz-d3-list');
  if(!tipo||!el) return;
  const busca=(_wz._d.busca||'').toLowerCase().trim();

  if(tipo==='ministerio'){
    if(!_wzMins.length){
      try{ const r=await fetch(`${apiBaseUrl()}/rest/v1/ministerios?ativo=eq.true&order=nome.asc&select=id,nome`,{headers:apiHeaders()}); _wzMins=await r.json()||[]; }catch(_){_wzMins=[];}
    }
    const rows=busca?_wzMins.filter(m=>m.nome.toLowerCase().includes(busca)):_wzMins;
    el.innerHTML=rows.length?rows.map(m=>_wzD3Item(`min_${m.id}`,m.nome)).join('')
      :'<div style="color:var(--tx3);font-size:12px;padding:8px">Nenhum ministério encontrado.</div>';

  } else if(tipo==='congregacao'){
    if(!_wzCongs.length){
      try{ const r=await fetch(`${apiBaseUrl()}/rest/v1/congregacoes?order=nome.asc&select=id,nome`,{headers:apiHeaders()}); _wzCongs=await r.json()||[]; }catch(_){_wzCongs=[];}
    }
    const rows=busca?_wzCongs.filter(c=>c.nome.toLowerCase().includes(busca)):_wzCongs;
    el.innerHTML=rows.length?rows.map(c=>_wzD3Item(`cong_${c.id}`,c.nome)).join('')
      :'<div style="color:var(--tx3);font-size:12px;padding:8px">Nenhuma congregação encontrada.</div>';

  } else if(tipo==='funcao'){
    const funcoes=[
      {k:'oficial_pastor',l:'Pastores'},{k:'oficial_presbitero',l:'Presbíteros'},
      {k:'oficial_diacono',l:'Diáconos'},{k:'nomeados_supervisor',l:'Supervisores'},
      {k:'nomeados_coordenador',l:'Coordenadores'},{k:'nomeados_lider_area',l:'Líderes de Área'},
      {k:'seminaristas',l:'Seminaristas'},
    ];
    const rows=busca?funcoes.filter(f=>f.l.toLowerCase().includes(busca)):funcoes;
    el.innerHTML=rows.map(f=>_wzD3Item(f.k,f.l)).join('');

  } else if(tipo==='avancado'){
    const opts=[
      {k:'todos_membros',l:'Todos os membros ativos'},
      {k:'visitantes',l:'Visitantes recentes'},
      {k:'congregados',l:'Congregados'},
      {k:'aniv_hoje',l:'Aniversariantes de hoje'},
      {k:'aniv_semana',l:'Aniversariantes da semana'},
      {k:'aniv_mes',l:'Aniversariantes do mês'},
    ];
    el.innerHTML=opts.map(o=>_wzD3Item(o.k,o.l)).join('')+
      '<div id="msg-wz-aniv-preview" style="margin-top:10px"></div>';
    _wzAnivPreview();

  } else if(tipo==='pgs'){
    el.innerHTML='<div style="color:var(--tx3);font-size:12px;padding:8px">Integração com Pequenos Grupos em breve.</div>';

  } else if(tipo==='individual'){
    if(_wz._d.busca&&_wz._d.busca.length>=2){
      await _wzD3BuscarInd(_wz._d.busca);
      return;
    }
    el.innerHTML=_wz.individuais.length
      ?_wz.individuais.map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;background:rgba(139,111,212,.06)">
          <span style="font-size:13px;flex:1;color:var(--tx1)">${escapeHtml(p.nome)}</span>
          <button onclick="msgWzRemInd('${p.pessoa_id}')" style="background:none;border:none;cursor:pointer;color:var(--tx3);font-size:14px;padding:0">✕</button>
        </div>`).join('')
      :'<div style="color:var(--tx3);font-size:12px;padding:8px">Digite o nome acima para pesquisar.</div>';

  } else if(tipo==='lista'){
    try{
      const r=await fetch(`${apiBaseUrl()}/rest/v1/com_listas?criado_por=eq.${USUARIO_ATUAL.pessoa_id}&order=nome.asc&select=id,nome,descricao`,{headers:apiHeaders()});
      const rows=r.ok?await r.json():[];
      if(!rows.length){
        el.innerHTML=`<div style="color:var(--tx3);font-size:12px;padding:8px">Nenhuma lista encontrada.
          <a href="#" onclick="event.preventDefault();document.querySelector('.modal-close,.modal-bg,#msg-wz-modal')?.remove();go('com-listas')"
            style="color:var(--violet);font-weight:600">Criar lista →</a></div>`;
        return;
      }
      const filtered=busca?rows.filter(l=>l.nome.toLowerCase().includes(busca)):rows;
      el.innerHTML=filtered.length?filtered.map(l=>_wzD3Item(`lista_${l.id}`,l.nome)).join('')
        :'<div style="color:var(--tx3);font-size:12px;padding:8px">Nenhuma lista encontrada.</div>';
    }catch(_){
      el.innerHTML='<div style="color:var(--tx3);font-size:12px;padding:8px">Erro ao carregar listas.</div>';
    }
  }
}

async function _wzAnivPreview(){
  const el=document.getElementById('msg-wz-aniv-preview');
  if(!el||!_wz) return;
  const anivSel=_wz.filtros.filter(f=>f.tipo.startsWith('aniv_'));
  if(!anivSel.length){el.innerHTML='';return;}
  el.innerHTML='<div style="color:var(--tx3);font-size:11px;padding:6px 0">Carregando aniversariantes...</div>';
  try{
    const r=await fetch(`${apiBaseUrl()}/rest/v1/pessoas?select=id,nome,data_nascimento&data_nascimento=not.is.null&order=nome.asc`,{headers:apiHeaders()});
    const all=await r.json();
    const hoje=new Date();
    const mes=hoje.getMonth()+1;
    const dia=hoje.getDate();
    const pessoas=all.filter(p=>{
      if(!p.data_nascimento) return false;
      const d=new Date(p.data_nascimento);
      const dm=d.getMonth()+1, dd=d.getDate();
      return anivSel.some(f=>{
        if(f.tipo==='aniv_hoje') return dm===mes&&dd===dia;
        if(f.tipo==='aniv_semana'){
          for(let i=0;i<7;i++){const t=new Date(hoje);t.setDate(hoje.getDate()+i);if(dm===t.getMonth()+1&&dd===t.getDate())return true;}
          return false;
        }
        return dm===mes; // aniv_mes
      });
    });
    if(!pessoas.length){
      el.innerHTML='<div style="color:var(--tx3);font-size:11px;padding:6px 0">Nenhum aniversariante no período.</div>';
      return;
    }
    el.innerHTML=`<div style="padding-top:10px;border-top:1px solid var(--bd1)">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:8px">${pessoas.length} aniversariante${pessoas.length!==1?'s':''}</div>
      ${pessoas.map(p=>{
        const d=new Date(p.data_nascimento);
        const meses=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
        const data=`${d.getDate()} de ${meses[d.getMonth()]}`;
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd1)">
          <span style="font-size:15px">🎂</span>
          <div style="flex:1">
            <div style="font-size:12px;color:var(--tx1);font-weight:500">${escapeHtml(_fmtNome(p.nome))}</div>
            <div style="font-size:10px;color:var(--tx3)">${data}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }catch(_){el.innerHTML='';}
}

function _wzD3Item(tipo,label){
  const sel=_wz.filtros.some(f=>f.tipo===tipo);
  const esc=escapeHtml(label).replace(/'/g,"\\'");
  return `<div onclick="msgWzToggleGrupo('${tipo}','${esc}')"
    style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;transition:.1s;
    background:${sel?'rgba(139,111,212,.07)':'transparent'}"
    onmouseover="this.style.background='rgba(139,111,212,.${sel?'10':'04'})'"
    onmouseout="this.style.background='${sel?'rgba(139,111,212,.07)':'transparent'}'">
    <div style="width:16px;height:16px;border-radius:4px;flex-shrink:0;
      border:2px solid ${sel?'var(--violet)':'var(--bd2)'};
      background:${sel?'var(--violet)':'transparent'};display:flex;align-items:center;justify-content:center">
      ${sel?'<span style="color:#fff;font-size:10px;font-weight:800;line-height:1">✓</span>':''}
    </div>
    <span style="font-size:13px;${sel?'color:var(--violet);font-weight:500':'color:var(--tx1)'}">${escapeHtml(label)}</span>
  </div>`;
}

function _wzDSummary(){
  const grupos=_wz.filtros;
  const inds=_wz.individuais;
  if(!grupos.length&&!inds.length){
    return `<div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;color:var(--tx3);margin-bottom:12px">Destinatários</div>
      <div style="color:var(--tx3);font-size:12px;line-height:1.6">Nenhum grupo selecionado.</div>`;
  }
  const rows=[
    ...grupos.map(f=>`<div style="display:flex;align-items:flex-start;gap:5px;margin-bottom:7px">
      <span style="color:var(--violet);flex-shrink:0;font-size:11px;margin-top:2px">✓</span>
      <span style="font-size:11px;flex:1;color:var(--tx1);line-height:1.4">${escapeHtml(f.label)}</span>
      <button onclick="msgWzRemoveFiltro('${f.tipo}')" style="background:none;border:none;cursor:pointer;color:var(--tx3);font-size:11px;padding:0;flex-shrink:0;line-height:1">✕</button>
    </div>`),
    ...inds.map(p=>`<div style="display:flex;align-items:flex-start;gap:5px;margin-bottom:7px">
      <span style="color:var(--violet);flex-shrink:0;font-size:11px;margin-top:2px">✓</span>
      <span style="font-size:11px;flex:1;color:var(--tx1);line-height:1.4">${escapeHtml(p.nome)}</span>
      <button onclick="msgWzRemInd('${p.pessoa_id}')" style="background:none;border:none;cursor:pointer;color:var(--tx3);font-size:11px;padding:0;flex-shrink:0;line-height:1">✕</button>
    </div>`),
  ];
  return `<div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;color:var(--tx3);margin-bottom:12px">Destinatários</div>
    <div style="flex:1;overflow-y:auto">${rows.join('')}</div>
    <div style="padding-top:14px;border-top:1px solid var(--bd1);margin-top:auto">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:4px">Total estimado</div>
      <div id="msg-wz-d-count" style="font-size:24px;font-weight:800;color:var(--violet);font-variant-numeric:tabular-nums">—</div>
      <div style="font-size:11px;color:var(--tx3)">pessoas</div>
    </div>`;
}

window.msgWzD1=function(mode){
  if(!_wz) return;
  if(mode==='todos'){
    const idx=_wz.filtros.findIndex(f=>f.tipo==='todos_membros');
    if(idx>=0) _wz.filtros.splice(idx,1);
    else _wz.filtros.push({tipo:'todos_membros',label:'Todos os membros'});
    _wzStep2(document.getElementById('msg-wz-body'));
    _wzD3EstimarTotal();
  } else {
    _wz._d.nivel=mode==='grupo'?2:3;
    _wz._d.tipo=mode==='individual'?'individual':mode==='avancado'?'avancado':mode==='lista'?'lista':null;
    _wz._d.busca='';
    _wzStep2(document.getElementById('msg-wz-body'));
  }
};

window.msgWzD2=function(tipo){
  if(!_wz) return;
  const LABELS={'todos_ministerios':'Membros de Ministérios','todos_sociedades':'Membros de Sociedades Internas'};
  if(LABELS[tipo]){
    msgWzToggleGrupo(tipo, LABELS[tipo]);
    return;
  }
  _wz._d.nivel=3;
  _wz._d.tipo=tipo;
  _wz._d.busca='';
  _wzStep2(document.getElementById('msg-wz-body'));
};

window.msgWzDBack=function(){
  if(!_wz) return;
  _wz._d.nivel=Math.max(1,_wz._d.nivel-1);
  if(_wz._d.nivel<2) _wz._d.tipo=null;
  _wz._d.busca='';
  _wzStep2(document.getElementById('msg-wz-body'));
};

window.msgWzD3Search=function(q){
  if(!_wz) return;
  _wz._d.busca=q;
  if(_wz._d.tipo==='individual') _wzD3BuscarInd(q);
  else _wzD3Carregar();
};

window.msgWzToggleGrupo=function(tipo,label){
  if(!_wz) return;
  const idx=_wz.filtros.findIndex(f=>f.tipo===tipo);
  if(idx>=0) _wz.filtros.splice(idx,1);
  else _wz.filtros.push({tipo,label});
  const el=document.getElementById('msg-wz-d3-list');
  if(el) _wzD3Carregar();
  else if(tipo.startsWith('aniv_')) _wzAnivPreview();
  const sum=document.getElementById('msg-wz-d-summary');
  if(sum) sum.innerHTML=_wzDSummary();
  _wzD3EstimarTotal();
};

window.msgWzRemoveFiltro=function(tipo){
  if(!_wz) return;
  _wz.filtros=_wz.filtros.filter(f=>f.tipo!==tipo);
  _wzStep2(document.getElementById('msg-wz-body'));
};

window.msgWzAddInd=function(pid,nome,ev){
  if(ev){ev.stopPropagation();ev.preventDefault();}
  if(!_wz||_wz.individuais.some(p=>p.pessoa_id===pid)) return;
  _wz.individuais.push({pessoa_id:pid,nome});
  _wz._d.busca='';
  _wzStep2(document.getElementById('msg-wz-body'));
};

window.msgWzRemInd=function(pid){
  if(!_wz) return;
  _wz.individuais=_wz.individuais.filter(p=>p.pessoa_id!==pid);
  const el=document.getElementById('msg-wz-d3-list');
  if(el) _wzD3Carregar();
  const sum=document.getElementById('msg-wz-d-summary');
  if(sum) sum.innerHTML=_wzDSummary();
};

async function _wzD3BuscarInd(q){
  const el=document.getElementById('msg-wz-d3-list');
  if(!el) return;
  if(!q||q.length<2){ await _wzD3Carregar(); return; }
  try{
    const r=await fetch(
      `${apiBaseUrl()}/rest/v1/v_membros?nome=ilike.*${encodeURIComponent(q)}*&status=eq.ativo&select=pessoa_id,nome&order=nome.asc&limit=10`,
      {headers:apiHeaders()}
    );
    const rows=await r.json();
    if(!rows.length){ el.innerHTML='<div style="color:var(--tx3);font-size:12px;padding:8px">Nenhum membro encontrado.</div>'; return; }
    el.innerHTML=rows.map(p=>`<div onclick="msgWzAddInd('${p.pessoa_id}','${escapeHtml(p.nome).replace(/'/g,"\\'")}',event)"
      style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;transition:.1s"
      onmouseover="this.style.background='rgba(139,111,212,.06)'"
      onmouseout="this.style.background='transparent'">
      <span style="font-size:18px;color:var(--tx3)">👤</span>
      <span style="font-size:13px;color:var(--tx1)">${escapeHtml(p.nome)}</span>
    </div>`).join('');
  }catch(_){el.innerHTML='<div style="color:var(--tx3);font-size:12px;padding:8px">Erro ao buscar.</div>';}
}

async function _wzD3EstimarTotal(){
  const el=document.getElementById('msg-wz-d-count');
  if(!el||!_wz) return;
  if(!_wz.filtros.length&&!_wz.individuais.length){ el.textContent='—'; return; }
  if(_wz.filtros.some(f=>f.tipo==='todos_membros')){
    try{
      const r=await fetch(`${apiBaseUrl()}/rest/v1/v_membros?status=eq.ativo`,
        {method:'HEAD',headers:{...apiHeaders(),'Prefer':'count=exact','Range':'0-0'}});
      const ct=r.headers.get('content-range');
      const n=ct?ct.split('/')[1]:null;
      if(n&&n!=='*') el.textContent=n;
    }catch(_){}
  }
}

// ── Passo 3: Conteúdo ──────────────────────
function _wzStep3(body){
  const VARS=[
    {v:'{{nome}}',l:'Nome'},{v:'{{data}}',l:'Data'},{v:'{{hora}}',l:'Hora'},
    {v:'{{local}}',l:'Local'},{v:'{{ministerio}}',l:'Ministério'},{v:'{{evento}}',l:'Evento'},{v:'{{mes}}',l:'Mês'}
  ];
  const needTitle=_wz.canal==='email'||_wz.canal==='notificacao';
  body.innerHTML=`<div style="font-weight:600;margin-bottom:4px">Conteúdo da mensagem</div>
    <div style="font-size:12px;color:var(--tx3);margin-bottom:18px">Escreva a mensagem. Use variáveis para personalização individual.</div>
    ${needTitle?`<div style="margin-bottom:14px">
      <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Assunto / Título</label>
      <input id="msg-wz-titulo-inp" type="text" placeholder="Ex: Aviso importante da Igreja"
        style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:13px;box-sizing:border-box"
        oninput="msgWzSetTitulo(this.value)">
    </div>`:''}
    <div style="margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
        <label style="font-size:11px;color:var(--tx3)">Mensagem</label>
        <div style="display:flex;gap:3px">
          <button onclick="msgWzFormat('*')" title="Negrito (*texto*)"
            style="padding:3px 8px;border-radius:5px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx2);font-size:12px;font-weight:700;cursor:pointer;line-height:1.4">B</button>
          <button onclick="msgWzFormat('_')" title="Itálico (_texto_)"
            style="padding:3px 8px;border-radius:5px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx2);font-size:12px;font-style:italic;cursor:pointer;line-height:1.4">I</button>
          <button onclick="msgWzFormat('~')" title="Tachado (~texto~)"
            style="padding:3px 8px;border-radius:5px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx2);font-size:12px;text-decoration:line-through;cursor:pointer;line-height:1.4">S</button>
          <button onclick="msgWzFormat('```')" title="Código (```texto```)"
            style="padding:3px 8px;border-radius:5px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx2);font-size:11px;font-family:monospace;cursor:pointer;line-height:1.4">{ }</button>
        </div>
      </div>
      <textarea id="msg-wz-content-ta" rows="10" placeholder="Olá {{nome}}, ..."
        oninput="msgWzSetConteudo(this.value)"
        style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:13px;resize:vertical;box-sizing:border-box;font-family:inherit;line-height:1.65"></textarea>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-bottom:${_modelos.length?'16px':'0'}">
      <span style="font-size:11px;color:var(--tx3)">Inserir:</span>
      ${VARS.map(v=>`<button onclick="msgWzInsertVar('${v.v}')" title="${v.v}" style="padding:4px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx2);font-size:12px;cursor:pointer">${v.l}</button>`).join('')}
    </div>
    ${_modelos.length?`<div style="border-top:1px solid var(--bd1);padding-top:13px">
      <div style="font-size:11px;color:var(--tx3);margin-bottom:7px">Aplicar modelo:</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${_modelos.filter(m=>m.ativo).map(m=>`<button onclick="msgWzUsarModelo('${m.id}')" style="padding:5px 11px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:11px;cursor:pointer">${escapeHtml(m.nome)}</button>`).join('')}
      </div>
    </div>`:''}`;
  // set values after DOM insert
  const ta=document.getElementById('msg-wz-content-ta');
  if(ta) ta.value=_wz.conteudo;
  const ti=document.getElementById('msg-wz-titulo-inp');
  if(ti) ti.value=_wz.titulo;
}

window.msgWzSetConteudo=function(v){ if(_wz) _wz.conteudo=v; };
window.msgWzSetTitulo=function(v){ if(_wz) _wz.titulo=v; };

window.msgWzInsertVar=function(v){
  const ta=document.getElementById('msg-wz-content-ta');
  if(!ta) return;
  const s=ta.selectionStart,e=ta.selectionEnd;
  ta.value=ta.value.slice(0,s)+v+ta.value.slice(e);
  ta.selectionStart=ta.selectionEnd=s+v.length;
  ta.focus();
  if(_wz) _wz.conteudo=ta.value;
};

window.msgWzFormat=function(marker){
  const ta=document.getElementById('msg-wz-content-ta');
  if(!ta) return;
  const s=ta.selectionStart, e=ta.selectionEnd;
  const sel=ta.value.slice(s,e);
  const wrapped=sel?marker+sel+marker:marker+marker;
  ta.value=ta.value.slice(0,s)+wrapped+ta.value.slice(e);
  // posiciona cursor dentro dos marcadores se não havia seleção
  const cur=sel?s+wrapped.length:s+marker.length;
  ta.selectionStart=ta.selectionEnd=cur;
  ta.focus();
  if(_wz) _wz.conteudo=ta.value;
};

window.msgWzUsarModelo=function(id){
  const m=_modelos.find(x=>x.id===id);
  if(!m||!_wz) return;
  _wz.conteudo=m.conteudo;
  if(m.titulo) _wz.titulo=m.titulo;
  const ta=document.getElementById('msg-wz-content-ta');
  if(ta) ta.value=m.conteudo;
  const ti=document.getElementById('msg-wz-titulo-inp');
  if(ti&&m.titulo) ti.value=m.titulo;
  T('Modelo aplicado',m.nome);
};

// ── Passo 4: Revisão e Envio ───────────────
function _wzStep4(body){
  const nextBtn=document.getElementById('msg-wz-btn-next');
  if(nextBtn) nextBtn.style.display='none';
  const desc=[..._wz.filtros.map(f=>f.label),..._wz.individuais.map(p=>p.nome)].join(', ')||'Nenhum';
  body.innerHTML=`<div style="font-weight:600;margin-bottom:4px">Revisão e Envio</div>
    <div style="font-size:12px;color:var(--tx3);margin-bottom:20px">Confirme os dados antes de enviar.</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
      <div style="padding:12px 16px;border-radius:10px;border:1px solid var(--bd1);background:var(--bg-card)">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:4px">Canal</div>
        <div>${CANAL_IC[_wz.canal]||'📢'} <strong>${CANAL_LBL[_wz.canal]||'—'}</strong></div>
      </div>
      <div style="padding:12px 16px;border-radius:10px;border:1px solid var(--bd1);background:var(--bg-card)">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:4px">Destinatários</div>
        <div style="font-size:13px">${escapeHtml(desc)}</div>
      </div>
      <div style="padding:12px 16px;border-radius:10px;border:1px solid var(--bd1);background:var(--bg-card)">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:4px">Mensagem</div>
        <div style="font-size:12px;white-space:pre-wrap;line-height:1.6;max-height:100px;overflow:hidden;color:var(--tx2)">${escapeHtml((_wz.conteudo||'').slice(0,300))}</div>
      </div>
    </div>
    <div style="margin-bottom:18px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:8px">Quando enviar?</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div onclick="msgWzSetAgend(false)" style="flex:1;padding:12px 16px;border-radius:10px;cursor:pointer;text-align:center;
          border:2px solid ${!_wz.agendado?'var(--violet)':'var(--bd1)'};background:${!_wz.agendado?'rgba(139,111,212,.07)':'transparent'}">
          <div style="font-size:18px;margin-bottom:4px">⚡</div>
          <div style="font-weight:600;font-size:13px">Agora</div>
          <div style="font-size:11px;color:var(--tx3)">Envio imediato</div>
        </div>
        <div onclick="msgWzSetAgend(true)" style="flex:1;padding:12px 16px;border-radius:10px;cursor:pointer;text-align:center;
          border:2px solid ${_wz.agendado?'var(--violet)':'var(--bd1)'};background:${_wz.agendado?'rgba(139,111,212,.07)':'transparent'}">
          <div style="font-size:18px;margin-bottom:4px">📅</div>
          <div style="font-weight:600;font-size:13px">Agendar</div>
          <div style="font-size:11px;color:var(--tx3)">Escolher data/hora</div>
        </div>
      </div>
      ${_wz.agendado?`<input id="msg-wz-agend-dt" type="datetime-local"
        value="${typeof _wz.agendado==='string'?_wz.agendado:''}"
        oninput="msgWzSetAgendDt(this.value)"
        style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:13px;box-sizing:border-box">`:''}
    </div>
    <div style="margin-bottom:20px">
      <label style="font-size:11px;color:var(--tx3);display:block;margin-bottom:4px">Título para o histórico</label>
      <input id="msg-wz-titulo-camp" type="text" placeholder="Ex: Aviso Culto de Aniversário"
        value="${escapeHtml(_wz.titulo)}"
        oninput="msgWzSetTitulo(this.value)"
        style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:13px;box-sizing:border-box">
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="msgWzRascunho()" style="padding:9px 18px;border-radius:9px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);cursor:pointer;font-size:13px">Salvar Rascunho</button>
      <button id="msg-wz-btn-enviar" onclick="msgWzEnviar()" style="padding:9px 24px;border-radius:9px;border:none;background:var(--violet);color:#fff;cursor:pointer;font-size:13px;font-weight:600">
        ${_wz.agendado?'📅 Agendar Envio':'📢 Enviar Agora'}
      </button>
    </div>`;
}

window.msgWzSetAgend=function(agend){ if(_wz){_wz.agendado=agend?true:null;_renderWzBody();} };
window.msgWzSetAgendDt=function(v){ if(_wz) _wz.agendado=v; };

window.msgWzNext=function(){
  if(!_wz) return;
  if(_wz.passo===1&&!_wz.canal){ T('Atenção','Selecione um canal.'); return; }
  if(_wz.passo===2&&!_wz.filtros.length&&!_wz.individuais.length){ T('Atenção','Selecione ao menos um grupo ou pessoa destinatária.'); return; }
  if(_wz.passo===3){
    const ta=document.getElementById('msg-wz-content-ta');
    if(ta) _wz.conteudo=ta.value;
    const ti=document.getElementById('msg-wz-titulo-inp');
    if(ti) _wz.titulo=ti.value;
    if(!_wz.conteudo?.trim()){ T('Atenção','Digite o conteúdo da mensagem.'); return; }
  }
  if(_wz.passo<4){ _wz.passo++; _renderWzBody(); }
};

window.msgWzBack=function(){
  if(!_wz||_wz.passo<2) return;
  if(_wz.passo===2) _wz._d={nivel:1,tipo:null,busca:''};
  _wz.passo--;
  _renderWzBody();
};

// Retorna o ID da campanha criada, ou null em caso de erro
async function _wzSalvar(status){
  if(!_wz) return null;
  const tiEl=document.getElementById('msg-wz-titulo-camp')||document.getElementById('msg-wz-titulo-inp');
  if(tiEl) _wz.titulo=tiEl.value.trim();
  if(!_wz.titulo){ T('Atenção','Informe um título para identificar esta mensagem.'); return null; }
  const isAgend=typeof _wz.agendado==='string'&&_wz.agendado;
  const filtrosDesc=[..._wz.filtros.map(f=>f.label),..._wz.individuais.map(p=>p.nome)].join(', ');
  const payload={
    titulo:_wz.titulo,canal:_wz.canal||'whatsapp',
    conteudo:_wz.conteudo,status,filtros_desc:filtrosDesc,
    agendado_para:isAgend?new Date(_wz.agendado).toISOString():null,
    total_dest:0
  };
  const r=await fetch(`${apiBaseUrl()}/rest/v1/msg_campanhas`,{
    method:'POST',
    headers:{...apiHeaders(),'Content-Type':'application/json','Prefer':'return=representation'},
    body:JSON.stringify(payload)
  });
  if(!r.ok){
    const txt=await r.text();
    let msg=txt;
    try{ const j=JSON.parse(txt); msg=j.message||j.hint||j.details||txt; }catch(_){}
    console.error('[msg_campanhas POST]',txt,'payload:',payload);
    throw new Error(msg);
  }
  const [camp]=await r.json();
  if(camp?.id){
    const registros=[
      ..._wz.filtros.map(f=>({campanha_id:camp.id,tipo:f.tipo,valor:f.label})),
      ..._wz.individuais.map(p=>({campanha_id:camp.id,tipo:'individual',valor:p.nome,valor_id:p.pessoa_id}))
    ];
    if(registros.length){
      await fetch(`${apiBaseUrl()}/rest/v1/msg_filtros`,{
        method:'POST',
        headers:{...apiHeaders(),'Content-Type':'application/json'},
        body:JSON.stringify(registros)
      }).catch(()=>{});
    }
  }
  return camp?.id||null;
}

window.msgWzEnviar=async function(){
  if(!_wz) return;
  const agendDtEl=document.getElementById('msg-wz-agend-dt');
  if(agendDtEl) _wz.agendado=agendDtEl.value;
  if(_wz.agendado===true){ T('Atenção','Informe a data e hora do agendamento.'); return; }
  const btn=document.getElementById('msg-wz-btn-enviar');
  if(btn){btn.disabled=true;btn.textContent='Salvando...';}
  try{
    const isAgend=typeof _wz.agendado==='string'&&_wz.agendado;

    // Salva campanha
    const statusInicial = isAgend ? 'agendada' : (_wz.canal==='whatsapp'||_wz.canal==='todos') ? 'enviando' : 'enviada';
    const campanhaId = await _wzSalvar(statusInicial);
    if(!campanhaId){ if(btn){btn.disabled=false;btn.textContent=isAgend?'📅 Agendar Envio':'📢 Enviar Agora';} return; }

    document.getElementById('msg-wz-overlay')?.remove();

    if(isAgend){
      T('Agendada','Mensagem agendada com sucesso.');
      carregarMensagens();
      return;
    }

    // Envio real via WhatsApp
    if(_wz.canal==='whatsapp'||_wz.canal==='todos'){
      if(typeof WA==='undefined'){
        T('Erro','Módulo WhatsApp não carregado.');
        await fetch(`${apiBaseUrl()}/rest/v1/msg_campanhas?id=eq.${campanhaId}`,{method:'PATCH',headers:{...apiHeaders(),'Content-Type':'application/json'},body:JSON.stringify({status:'falha'})});
        return;
      }
      const pessoas = await _resolverDests(_wz);
      if(!pessoas.length){
        T('Atenção','Nenhum destinatário encontrado. Verifique os filtros selecionados.');
        await fetch(`${apiBaseUrl()}/rest/v1/msg_campanhas?id=eq.${campanhaId}`,{method:'PATCH',headers:{...apiHeaders(),'Content-Type':'application/json'},body:JSON.stringify({status:'falha',total_dest:0})});
        return;
      }
      const comTel = await _resolverTels(pessoas);
      await _dispararWA(campanhaId, comTel, _wz.conteudo);
    } else {
      // E-mail / Notificação — integração pendente
      T('Registrado','Canal '+(CANAL_LBL[_wz.canal]||_wz.canal)+' registrado. Integração de envio em breve.');
      carregarMensagens();
    }
  }catch(e){
    T('Erro',e.message);
    if(btn){btn.disabled=false;btn.textContent='Enviar Agora';}
  }
};

window.msgWzRascunho=async function(){
  try{
    const id=await _wzSalvar('rascunho');
    if(!id) return;
    document.getElementById('msg-wz-overlay')?.remove();
    T('Rascunho salvo','Continue depois em Mensagens.');
    carregarMensagens();
  }catch(e){ T('Erro',e.message); }
};

// ══════════════════════════════════════════════════════════════
// ENVIO REAL VIA BOTCONVERSA
// ══════════════════════════════════════════════════════════════

// Resolve filtros → lista de { pessoa_id, nome }
async function _resolverDests(wz){
  const map = new Map(); // pessoa_id → nome (dedup)

  for(const f of wz.filtros){
    let rows = [];
    if(f.tipo === 'todos_membros'){
      const r = await fetch(`${apiBaseUrl()}/rest/v1/v_membros?status=eq.ativo&select=pessoa_id,nome&limit=5000`,{headers:apiHeaders()});
      rows = r.ok ? await r.json() : [];
      if(Array.isArray(rows)) rows.forEach(p => { if(p.pessoa_id && !map.has(p.pessoa_id)) map.set(p.pessoa_id, p.nome); });

    } else if(f.tipo.startsWith('cong_')){
      const congId = f.tipo.slice(5);
      try{
        const r = await fetch(`${apiBaseUrl()}/rest/v1/v_membros?congregacao_id=eq.${congId}&status=eq.ativo&select=pessoa_id,nome&limit=500`,{headers:apiHeaders()});
        rows = await r.json();
        if(Array.isArray(rows)) rows.forEach(p => { if(p.pessoa_id && !map.has(p.pessoa_id)) map.set(p.pessoa_id, p.nome); });
      }catch(_){}

    } else if(f.tipo.startsWith('min_')){
      const minId = f.tipo.slice(4);
      try{
        const r = await fetch(`${apiBaseUrl()}/rest/v1/ministerio_membros?ministerio_id=eq.${minId}&ativo=eq.true&select=pessoa_id,pessoas(nome)&limit=500`,{headers:apiHeaders()});
        rows = await r.json();
        if(Array.isArray(rows)) rows.forEach(p => {
          const pid = p.pessoa_id, nm = p.pessoas?.nome||'';
          if(pid && nm && !map.has(pid)) map.set(pid, nm);
        });
      }catch(_){}

    } else if(f.tipo === 'aniv_mes'){
      const mes = new Date().getMonth()+1;
      try{
        const r = await fetch(`${apiBaseUrl()}/rest/v1/pessoas?select=id,nome&data_nascimento=not.is.null&order=nome`,{headers:apiHeaders()});
        const all = await r.json();
        if(Array.isArray(all)) all.filter(p=>{ const d=p.data_nascimento; return d&&(new Date(d).getMonth()+1)===mes; })
          .forEach(p=>{ if(!map.has(p.id)) map.set(p.id, p.nome); });
      }catch(_){}

    } else if(f.tipo.startsWith('oficial_')){
      const cargo = f.tipo.slice(8); // pastor | presbitero | diacono
      try{
        const r = await fetch(`${apiBaseUrl()}/rest/v1/oficiais?cargo=eq.${cargo}&status=eq.ativo&deleted_at=is.null&select=pessoa_id,pessoas(nome)&limit=300`,{headers:apiHeaders()});
        const rows2 = await r.json();
        if(Array.isArray(rows2)) rows2.forEach(p=>{ const nm=p.pessoas?.nome; if(p.pessoa_id&&nm&&!map.has(p.pessoa_id)) map.set(p.pessoa_id, nm); });
      }catch(_){}

    } else if(f.tipo.startsWith('nomeados_')){
      const funcaoLider = f.tipo.slice(9); // supervisor | coordenador | lider_area
      try{
        const r = await fetch(`${apiBaseUrl()}/rest/v1/nomeados?funcao_lider=eq.${funcaoLider}&deleted_at=is.null&select=pessoa_id,nome&limit=500`,{headers:apiHeaders()});
        const rows2 = await r.json();
        if(Array.isArray(rows2)) rows2.forEach(p=>{ if(p.pessoa_id&&!map.has(p.pessoa_id)) map.set(p.pessoa_id, p.nome); });
      }catch(_){}

    } else if(f.tipo.startsWith('lista_')){
      const listaId=f.tipo.slice(6);
      try{
        const r=await fetch(`${apiBaseUrl()}/rest/v1/com_lista_membros?lista_id=eq.${listaId}&select=pessoa_id,pessoas(nome)&limit=500`,{headers:apiHeaders()});
        const rows2=await r.json();
        if(Array.isArray(rows2)) rows2.forEach(p=>{ const nm=p.pessoas?.nome; if(p.pessoa_id&&nm&&!map.has(p.pessoa_id)) map.set(p.pessoa_id, nm); });
      }catch(_){}

    } else if(f.tipo === 'todos_ministerios' || f.tipo === 'todos_sociedades'){
      const tipoMin = f.tipo === 'todos_sociedades' ? 'SOCIEDADE' : null;
      try{
        // Busca IDs dos ministérios pelo tipo
        const qMin = tipoMin
          ? `${apiBaseUrl()}/rest/v1/ministerios?tipo=eq.${tipoMin}&ativo=eq.true&select=id`
          : `${apiBaseUrl()}/rest/v1/ministerios?tipo=neq.SOCIEDADE&ativo=eq.true&select=id`;
        const rMin = await fetch(qMin,{headers:apiHeaders()});
        const mins = await rMin.json();
        if(!Array.isArray(mins)||!mins.length) continue;
        const ids = mins.map(m=>m.id).join(',');
        const rMb = await fetch(`${apiBaseUrl()}/rest/v1/ministerio_membros?ministerio_id=in.(${ids})&ativo=eq.true&select=pessoa_id,pessoas(nome)&limit=2000`,{headers:apiHeaders()});
        const mbs = await rMb.json();
        if(Array.isArray(mbs)) mbs.forEach(m=>{ const nm=m.pessoas?.nome; if(m.pessoa_id&&nm&&!map.has(m.pessoa_id)) map.set(m.pessoa_id, nm); });
      }catch(_){}
    }
    // demais filtros (seminaristas etc): não resolvidos automaticamente
  }

  // individuais adicionados manualmente
  for(const ind of wz.individuais){
    if(!map.has(ind.pessoa_id)) map.set(ind.pessoa_id, ind.nome);
  }

  return Array.from(map.entries()).map(([pessoa_id,nome])=>({pessoa_id,nome}));
}

// Busca telefone de cada pessoa_id
async function _resolverTels(pessoas){
  if(!pessoas.length) return [];
  const CHUNK = 100; // URL segura: ~4KB por batch
  const byId = {};
  for(let i=0; i<pessoas.length; i+=CHUNK){
    const slice = pessoas.slice(i, i+CHUNK).map(p=>p.pessoa_id);
    try{
      const r = await fetch(
        `${apiBaseUrl()}/rest/v1/pessoas?id=in.(${slice.join(',')})&select=id,nome,celular,whatsapp,telefone`,
        {headers:apiHeaders()}
      );
      if(r.ok){ const rows=await r.json(); if(Array.isArray(rows)) rows.forEach(p=>byId[p.id]=p); }
    }catch(_){}
  }
  return pessoas.map(p=>{
    const d = byId[p.pessoa_id]||{};
    const tel = d.whatsapp||d.celular||d.telefone||null;
    return {...p, contato:tel};
  });
}

// Modal de progresso
function _progressModal(total){
  const ov=document.createElement('div');
  ov.id='msg-prog-overlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML=`<div style="background:var(--bg-card);border-radius:14px;border:1px solid var(--bd1);width:100%;max-width:420px;padding:28px 32px;text-align:center">
    <div style="font-size:28px;margin-bottom:12px">📤</div>
    <div style="font-weight:700;font-size:15px;margin-bottom:6px">Enviando mensagens</div>
    <div id="msg-prog-atual" style="font-size:12px;color:var(--tx3);margin-bottom:16px">Preparando...</div>
    <div style="background:var(--bd1);border-radius:99px;height:6px;overflow:hidden;margin-bottom:10px">
      <div id="msg-prog-bar" style="height:100%;background:var(--violet);width:0%;transition:width .3s;border-radius:99px"></div>
    </div>
    <div id="msg-prog-cnt" style="font-size:11px;color:var(--tx3)">0 / ${total}</div>
  </div>`;
  document.getElementById('msg-prog-overlay')?.remove();
  document.body.appendChild(ov);
  return ov;
}

function _progressUpdate(ov, i, total, nome){
  const pct = Math.round((i/total)*100);
  const bar = ov.querySelector('#msg-prog-bar');
  const atual = ov.querySelector('#msg-prog-atual');
  const cnt = ov.querySelector('#msg-prog-cnt');
  if(bar) bar.style.width = pct+'%';
  if(atual) atual.textContent = `Enviando para ${escapeHtml(nome)}...`;
  if(cnt) cnt.textContent = `${i} / ${total}`;
}

// Loop de envio via WA.send()
async function _dispararWA(campanhaId, dests, conteudo){
  const ov = _progressModal(dests.length);
  let entregue=0, falha=0, semTel=0;

  for(let i=0;i<dests.length;i++){
    const d = dests[i];
    _progressUpdate(ov, i+1, dests.length, d.nome);

    if(!d.contato){
      semTel++;
      // Registra sem contato
      await fetch(`${apiBaseUrl()}/rest/v1/msg_destinatarios`,{
        method:'POST',
        headers:{...apiHeaders(),'Content-Type':'application/json'},
        body:JSON.stringify({campanha_id:campanhaId,pessoa_id:d.pessoa_id,nome:d.nome,contato:null,canal:'whatsapp',status:'falha',erro:'Sem número cadastrado'})
      }).catch(()=>{});
      falha++;
      continue;
    }

    // Substitui {{nome}} pelo primeiro nome em title case
    const primeiroNome = _fmtNome((d.nome||'').split(' ')[0]);
    const mensagem = conteudo.replace(/\{\{nome\}\}/g, primeiroNome);

    // Salva destinatário como enviando
    const destR = await fetch(`${apiBaseUrl()}/rest/v1/msg_destinatarios`,{
      method:'POST',
      headers:{...apiHeaders(),'Content-Type':'application/json','Prefer':'return=representation'},
      body:JSON.stringify({campanha_id:campanhaId,pessoa_id:d.pessoa_id,nome:d.nome,contato:d.contato,canal:'whatsapp',status:'enviando'})
    }).catch(()=>null);
    let destId = null;
    try{ const rows=await destR?.json(); destId=rows?.[0]?.id; }catch(_){}

    // Envia via BotConversa
    const res = typeof WA !== 'undefined'
      ? await WA.send({para:d.contato, nome:d.nome, mensagem, modulo:'COMUNICACAO'})
      : {ok:false, status:'wa_nao_disponivel'};

    const status = res.ok ? 'enviado' : 'falha';
    if(res.ok) entregue++; else falha++;

    // Atualiza destinatário
    if(destId){
      await fetch(`${apiBaseUrl()}/rest/v1/msg_destinatarios?id=eq.${destId}`,{
        method:'PATCH',
        headers:{...apiHeaders(),'Content-Type':'application/json'},
        body:JSON.stringify({status, erro:res.error||null, enviado_em:new Date().toISOString()})
      }).catch(()=>{});
    }

    // Intervalo para não ultrapassar rate limit do BotConversa
    if(i<dests.length-1) await new Promise(r=>setTimeout(r,600));
  }

  // Atualiza totais da campanha
  const finalStatus = falha===dests.length ? 'falha' : entregue===dests.length ? 'enviada' : 'parcial';
  await fetch(`${apiBaseUrl()}/rest/v1/msg_campanhas?id=eq.${campanhaId}`,{
    method:'PATCH',
    headers:{...apiHeaders(),'Content-Type':'application/json'},
    body:JSON.stringify({status:finalStatus,total_dest:dests.length,total_entregue:entregue,total_falha:falha,enviado_em:new Date().toISOString()})
  }).catch(()=>{});

  ov.remove();

  const semTelMsg = semTel ? ` (${semTel} sem número)` : '';
  T(entregue>0?'Mensagens enviadas':'Falha no envio',
    `${entregue} entregues, ${falha} falhas${semTelMsg}.`);
  carregarMensagens();
}

// ══════════════════════════════════════════════════════════════
// AUTOLOAD
// ══════════════════════════════════════════════════════════════
VIEW_AUTOLOAD['com-mensagens']    = { fn: carregarMensagens };
VIEW_AUTOLOAD['com-modelos']      = { fn: carregarModelos };
VIEW_AUTOLOAD['com-historico']    = { fn: carregarHistorico };
VIEW_AUTOLOAD['com-agendamentos'] = { fn: carregarAgendamentos };

})();
