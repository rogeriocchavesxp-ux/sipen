/* Comunicação — Listas Personalizadas v1.0.0 */
(function(){
'use strict';

let _listas = [];
let _listaSelecionada = null;
let _membrosCache = [];

const _url = p => `${apiBaseUrl()}/rest/v1/${p}`;
const _H   = () => ({ ...apiHeaders(), 'Content-Type': 'application/json' });

// ── Init ──────────────────────────────────────────────────────────────────

async function comListasInit(){
  await _renderListas();
}

// ── Listagem ──────────────────────────────────────────────────────────────

async function _renderListas(){
  const el = document.getElementById('com-listas-grid');
  if(!el) return;
  el.innerHTML = '<div style="color:var(--tx3);padding:20px">Carregando...</div>';

  try{
    const r = await fetch(_url(`com_listas?criado_por=eq.${USUARIO_ATUAL.pessoa_id}&order=nome.asc&select=id,nome,descricao,criado_em`), { headers: apiHeaders() });
    _listas = r.ok ? await r.json() : [];
  }catch(_){ _listas = []; }

  if(!Array.isArray(_listas) || !_listas.length){
    el.innerHTML = `<div class="card" style="padding:48px;text-align:center;grid-column:1/-1">
      <div style="font-size:36px;margin-bottom:14px">📋</div>
      <div style="font-weight:600;font-size:15px;margin-bottom:8px">Nenhuma lista ainda</div>
      <div style="color:var(--tx3);font-size:13px;margin-bottom:24px">Crie listas personalizadas com membros específicos para usar como destinatários nas mensagens.</div>
      <button class="tbt pri" onclick="comListasNova()">+ Nova Lista</button>
    </div>`;
    return;
  }

  // Contar membros por lista
  const ids = _listas.map(l => `"${l.id}"`).join(',');
  let contagens = {};
  try{
    const rc = await fetch(_url(`com_lista_membros?lista_id=in.(${ids})&select=lista_id`), { headers: apiHeaders() });
    const rows = rc.ok ? await rc.json() : [];
    rows.forEach(r => { contagens[r.lista_id] = (contagens[r.lista_id]||0) + 1; });
  }catch(_){}

  el.innerHTML = _listas.map(l => {
    const n = contagens[l.id] || 0;
    const sel = _listaSelecionada === l.id;
    return `<div class="card" style="cursor:pointer;border:2px solid ${sel?'var(--violet)':'var(--bd1)'};transition:.12s"
      onclick="comListasSelecionar('${l.id}')">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <div style="width:38px;height:38px;border-radius:10px;background:rgba(139,111,212,.12);
          display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📋</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px;color:var(--tx1)">${escapeHtml(l.nome)}</div>
          ${l.descricao?`<div style="font-size:12px;color:var(--tx3);margin-top:2px">${escapeHtml(l.descricao)}</div>`:''}
          <div style="font-size:11px;color:var(--violet);font-weight:600;margin-top:6px">${n} membro${n!==1?'s':''}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button onclick="event.stopPropagation();comListasEditar('${l.id}')"
            style="padding:5px 10px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx3);font-size:11px;cursor:pointer">Editar</button>
          <button onclick="event.stopPropagation();comListasExcluir('${l.id}','${escapeHtml(l.nome).replace(/'/g,"&#39;")}')"
            style="padding:5px 10px;border-radius:7px;border:1px solid rgba(208,104,104,.3);background:transparent;color:var(--rose);font-size:11px;cursor:pointer">Excluir</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Selecionar lista para gerenciar membros ───────────────────────────────

window.comListasSelecionar = async function(id){
  _listaSelecionada = id;
  await _renderListas();
  await _renderMembros(id);
  document.getElementById('com-listas-painel')?.scrollIntoView({ behavior:'smooth', block:'start' });
};

async function _renderMembros(listaId){
  const painel = document.getElementById('com-listas-painel');
  if(!painel) return;

  const lista = _listas.find(l => l.id === listaId);
  painel.style.display = 'block';
  painel.innerHTML = `
    <div class="card" style="border-color:rgba(139,111,212,.3)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px;color:var(--violet)">
            ${escapeHtml(lista?.nome||'Lista')} — Membros
          </div>
          <div style="font-size:12px;color:var(--tx3);margin-top:2px">Adicione ou remova membros desta lista</div>
        </div>
        <button onclick="document.getElementById('com-listas-painel').style.display='none'"
          style="background:none;border:none;cursor:pointer;color:var(--tx3);font-size:18px;padding:0">✕</button>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px">
        <input id="com-listas-busca" type="text" placeholder="Buscar membro para adicionar..."
          oninput="comListasBuscar(this.value)"
          style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid var(--bd2);
            background:var(--bg-card);color:var(--tx1);font-size:13px">
      </div>
      <div id="com-listas-busca-res" style="display:none;background:var(--bg-card);border:1px solid var(--bd2);
        border-radius:8px;max-height:200px;overflow-y:auto;margin-bottom:12px"></div>

      <div id="com-listas-membros-lista" style="display:flex;flex-direction:column;gap:4px">
        <div style="color:var(--tx3);font-size:12px;padding:8px">Carregando membros...</div>
      </div>
    </div>`;

  await _carregarMembros(listaId);
}

async function _carregarMembros(listaId){
  const el = document.getElementById('com-listas-membros-lista');
  if(!el) return;

  try{
    const r = await fetch(_url(`com_lista_membros?lista_id=eq.${listaId}&select=id,pessoa_id,pessoas(id,nome)&order=pessoas(nome).asc`), { headers: apiHeaders() });
    _membrosCache = r.ok ? await r.json() : [];
  }catch(_){ _membrosCache = []; }

  if(!Array.isArray(_membrosCache) || !_membrosCache.length){
    el.innerHTML = '<div style="color:var(--tx3);font-size:12px;padding:8px">Nenhum membro nesta lista ainda.</div>';
    return;
  }

  el.innerHTML = _membrosCache.map(m => {
    const nome = m.pessoas?.nome || '—';
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:var(--bg-hover,rgba(139,111,212,.04))">
      <div style="width:30px;height:30px;border-radius:50%;background:rgba(139,111,212,.15);
        display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--violet);flex-shrink:0">
        ${escapeHtml(nome[0]||'?').toUpperCase()}
      </div>
      <span style="flex:1;font-size:13px;color:var(--tx1)">${escapeHtml(nome)}</span>
      <button onclick="comListasRemoverMembro('${m.id}')"
        style="background:none;border:none;cursor:pointer;color:var(--tx3);font-size:14px;padding:2px 4px;border-radius:5px">✕</button>
    </div>`;
  }).join('');
}

// ── Buscar membro para adicionar ──────────────────────────────────────────

let _buscaTimer = null;
window.comListasBuscar = function(q){
  clearTimeout(_buscaTimer);
  const res = document.getElementById('com-listas-busca-res');
  if(!q || q.length < 2){ if(res) res.style.display='none'; return; }
  _buscaTimer = setTimeout(async () => {
    try{
      const r = await fetch(_url(`pessoas?nome=ilike.*${encodeURIComponent(q)}*&select=id,nome&order=nome.asc&limit=10`), { headers: apiHeaders() });
      const rows = r.ok ? await r.json() : [];
      if(!res) return;
      if(!rows.length){
        res.style.display='block';
        res.innerHTML='<div style="padding:10px;font-size:12px;color:var(--tx3)">Nenhum membro encontrado.</div>';
        return;
      }
      // Excluir já adicionados
      const jaAdd = new Set(_membrosCache.map(m => m.pessoa_id));
      const disponiveis = rows.filter(p => !jaAdd.has(p.id));
      if(!disponiveis.length){
        res.style.display='block';
        res.innerHTML='<div style="padding:10px;font-size:12px;color:var(--tx3)">Todos já estão na lista.</div>';
        return;
      }
      res.style.display='block';
      res.innerHTML = disponiveis.map(p =>
        `<div onclick="comListasAdicionarMembro('${_listaSelecionada}','${p.id}')"
          style="padding:9px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--bd1);color:var(--tx1)"
          onmouseover="this.style.background='rgba(139,111,212,.06)'"
          onmouseout="this.style.background=''">${escapeHtml(p.nome)}</div>`
      ).join('');
    }catch(_){}
  }, 300);
};

window.comListasAdicionarMembro = async function(listaId, pessoaId){
  const input = document.getElementById('com-listas-busca');
  const res   = document.getElementById('com-listas-busca-res');
  if(input) input.value='';
  if(res) res.style.display='none';

  try{
    const r = await fetch(_url('com_lista_membros'), {
      method:'POST',
      headers: _H(),
      body: JSON.stringify({ lista_id: listaId, pessoa_id: pessoaId })
    });
    if(r.ok || r.status === 409){
      await _carregarMembros(listaId);
    } else {
      T('Lista', 'Erro ao adicionar membro');
    }
  }catch(_){ T('Lista', 'Erro de conexão'); }
};

window.comListasRemoverMembro = async function(membroId){
  try{
    const r = await fetch(_url(`com_lista_membros?id=eq.${membroId}`), { method:'DELETE', headers: apiHeaders() });
    if(r.ok || r.status === 204){
      if(_listaSelecionada) await _carregarMembros(_listaSelecionada);
    } else {
      T('Lista', 'Erro ao remover membro');
    }
  }catch(_){ T('Lista', 'Erro de conexão'); }
};

// ── Nova lista ────────────────────────────────────────────────────────────

window.comListasNova = function(){
  _abrirModal('', '', null);
};

window.comListasEditar = function(id){
  const lista = _listas.find(l => l.id === id);
  if(!lista) return;
  _abrirModal(lista.nome, lista.descricao||'', id);
};

function _abrirModal(nome, desc, id){
  document.getElementById('com-lista-modal-bg')?.remove();
  const isEdit = !!id;
  const modal = document.createElement('div');
  modal.id = 'com-lista-modal-bg';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="background:var(--bg-card);border-radius:14px;padding:28px;width:420px;max-width:92vw;box-shadow:0 8px 40px rgba(0,0,0,.25)">
      <div style="font-weight:700;font-size:15px;margin-bottom:20px">${isEdit?'Editar Lista':'Nova Lista'}</div>
      <label style="display:block;font-size:12px;font-weight:600;color:var(--tx3);margin-bottom:6px">Nome *</label>
      <input id="com-lista-nome" type="text" value="${escapeHtml(nome)}" placeholder="Ex: Líderes de Célula"
        style="width:100%;padding:9px 11px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg);color:var(--tx1);font-size:13px;box-sizing:border-box;margin-bottom:14px">
      <label style="display:block;font-size:12px;font-weight:600;color:var(--tx3);margin-bottom:6px">Descrição (opcional)</label>
      <input id="com-lista-desc" type="text" value="${escapeHtml(desc)}" placeholder="Finalidade desta lista..."
        style="width:100%;padding:9px 11px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg);color:var(--tx1);font-size:13px;box-sizing:border-box;margin-bottom:24px">
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button onclick="document.getElementById('com-lista-modal-bg').remove()"
          style="padding:9px 20px;border-radius:8px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);cursor:pointer">Cancelar</button>
        <button onclick="comListasSalvar('${id||''}')" class="tbt pri" style="padding:9px 20px;border-radius:8px">
          ${isEdit?'Salvar':'Criar Lista'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
  setTimeout(() => document.getElementById('com-lista-nome')?.focus(), 50);
}

window.comListasSalvar = async function(id){
  const nome = (document.getElementById('com-lista-nome')?.value||'').trim();
  const desc = (document.getElementById('com-lista-desc')?.value||'').trim();
  if(!nome){ T('Lista', 'Informe um nome para a lista'); return; }

  document.getElementById('com-lista-modal-bg')?.remove();

  try{
    if(id){
      const r = await fetch(_url(`com_listas?id=eq.${id}`), {
        method:'PATCH', headers:_H(),
        body: JSON.stringify({ nome, descricao: desc||null, atualizado_em: new Date().toISOString() })
      });
      if(!r.ok){ const e=await r.json().catch(()=>({})); throw new Error(e.message||e.hint||`HTTP ${r.status}`); }
      T('Lista', 'Lista atualizada');
    } else {
      const sb = getSupabase();
      const { data, error } = await sb.from('com_listas').insert({
        nome,
        descricao: desc||null,
        criado_por: USUARIO_ATUAL.pessoa_id
      }).select('id').single();
      if(error) throw new Error(error.message||error.hint||'Erro desconhecido');
      _listaSelecionada = data?.id || null;
      T('Lista', 'Lista criada');
    }
    await _renderListas();
    if(_listaSelecionada) await _renderMembros(_listaSelecionada);
  }catch(e){ T('Lista', e.message||'Erro ao salvar lista'); }
};

// ── Excluir ───────────────────────────────────────────────────────────────

window.comListasExcluir = async function(id, nome){
  if(!confirm(`Excluir a lista "${nome}"? Esta ação não pode ser desfeita.`)) return;
  try{
    const r = await fetch(_url(`com_listas?id=eq.${id}`), { method:'DELETE', headers: apiHeaders() });
    if(r.ok || r.status===204){
      if(_listaSelecionada === id){
        _listaSelecionada = null;
        const painel = document.getElementById('com-listas-painel');
        if(painel) painel.style.display='none';
      }
      T('Lista', 'Lista excluída');
      await _renderListas();
    } else {
      T('Lista', 'Erro ao excluir');
    }
  }catch(_){ T('Lista', 'Erro de conexão'); }
};

// ── Registro ──────────────────────────────────────────────────────────────

VIEW_AUTOLOAD['com-listas'] = { fn: comListasInit };

})();
