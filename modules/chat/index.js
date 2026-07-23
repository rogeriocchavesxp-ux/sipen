// SIPEN — Chat Interno v6.49.16
// Mensagens em tempo real entre usuários do sistema

(function () {
  'use strict';

  let _conversaAtual  = null;
  let _channel        = null;
  let _globalChannel  = null;
  let _globalInitDone = false;
  let _unreadCount    = 0;
  let _conversasCache = [];
  let _pendingAnexo   = null; // { file, url (object URL), nome, tipo }

  const STORAGE_URL = 'https://erhwryfzpycahgsohhbh.supabase.co/storage/v1';

  const _H = () => ({ ...apiHeaders(), 'Content-Type': 'application/json' });
  const _url = (path) => `${apiBaseUrl()}/rest/v1/${path}`;

  // ── Badge no sino ─────────────────────────────────────────────────────────

  function _setBadge(n) {
    _unreadCount = Math.max(0, n);

    // Ícone do app na tela inicial (PWA — iOS 16.4+, Android Chrome)
    if ('setAppBadge' in navigator) {
      if (_unreadCount > 0) navigator.setAppBadge(_unreadCount).catch(() => {});
      else navigator.clearAppBadge().catch(() => {});
    }

    const dot  = document.querySelector('.ndot');
    const bell = dot?.closest('.tbt');
    if (!dot) return;

    if (_unreadCount > 0) {
      dot.textContent = _unreadCount > 99 ? '99+' : String(_unreadCount);
      if (bell) {
        bell.title   = `${_unreadCount} mensagem(ns) não lida(s)`;
        bell.onclick = () => go('chat-inbox');
      }
    } else {
      dot.textContent = '';
      if (bell) {
        bell.title   = 'Notificações';
        bell.onclick = () => T('Notificações', 'Sem alertas no momento');
      }
    }
  }

  function _calcUnread() {
    const n = _conversasCache.filter(c =>
      c.ultima_msg_em && (!c.meu_ultimo_lido || c.ultima_msg_em > c.meu_ultimo_lido)
    ).length;
    _setBadge(n);
  }

  // ── Realtime global (persiste fora do módulo) ─────────────────────────────

  function _subscribeGlobal() {
    if (_globalInitDone) return;
    _globalInitDone = true;

    const sb = getSupabase();
    _globalChannel = sb.channel('chat-notif-global')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'chat_mensagens'
      }, payload => {
        const m = payload.new;
        if (m.pessoa_id === USUARIO_ATUAL?.pessoa_id) return;
        if (_conversaAtual?.id === m.conversa_id) return;
        _setBadge(_unreadCount + 1);
      })
      .subscribe();
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  async function chatInit() {
    if (!USUARIO_ATUAL?.pessoa_id) return;
    await _renderLista();
    _calcUnread();
    _subscribeGlobal();
  }

  // ── Lista ─────────────────────────────────────────────────────────────────

  async function _renderLista() {
    const el = document.getElementById('chat-lista');
    if (!el) return;

    const conversas = await _loadConversas();
    _conversasCache = conversas;

    if (!conversas.length) {
      el.innerHTML = '<div class="chat-item-sem">Nenhuma conversa.<br>Clique em <b>+</b> para iniciar.</div>';
      return;
    }

    el.innerHTML = conversas.map(c => {
      const nome   = _conversaNome(c);
      const ativa  = _conversaAtual?.id === c.id;
      const hora   = c.ultima_msg_em ? _fmtHora(c.ultima_msg_em) : '';
      const naoLida = c.ultima_msg_em && (!c.meu_ultimo_lido || c.ultima_msg_em > c.meu_ultimo_lido);
      return `
        <div class="chat-item${ativa ? ' ativo' : ''}" onclick="chatAbrirConversa('${c.id}')">
          <div class="chat-item-av">${(nome[0] || '?').toUpperCase()}</div>
          <div class="chat-item-info">
            <div class="chat-item-nome">${_esc(nome)}</div>
            <div class="chat-item-preview">${_esc(c.ultima_msg_preview || 'Sem mensagens')}</div>
          </div>
          <div class="chat-item-meta">
            <div class="chat-item-hora">${hora}</div>
            ${naoLida ? '<div class="chat-item-dot">1</div>' : ''}
          </div>
        </div>`;
    }).join('');
  }

  async function _loadConversas() {
    const myId = USUARIO_ATUAL.pessoa_id;

    const r1 = await fetch(_url(`chat_participantes?pessoa_id=eq.${myId}&select=conversa_id,ultimo_lido_em`), { headers: apiHeaders() });
    if (!r1.ok) return [];
    const parts = await r1.json();
    if (!parts.length) return [];

    const ids   = parts.map(p => p.conversa_id);
    const lidos = Object.fromEntries(parts.map(p => [p.conversa_id, p.ultimo_lido_em]));
    const inIds = ids.map(i => `"${i}"`).join(',');

    const r2 = await fetch(
      _url(`chat_conversas?id=in.(${inIds})&select=id,tipo,nome,ultima_msg_em,chat_participantes(pessoa_id,pessoas(id,nome))&order=ultima_msg_em.desc.nullsfirst`),
      { headers: apiHeaders() }
    );
    const convs = r2.ok ? await r2.json() : [];

    const r3 = await fetch(
      _url(`chat_mensagens?conversa_id=in.(${inIds})&select=conversa_id,texto,criado_em&order=criado_em.desc`),
      { headers: apiHeaders() }
    );
    const msgs = r3.ok ? await r3.json() : [];
    const ultimaMsg = {};
    msgs.forEach(m => { if (!ultimaMsg[m.conversa_id]) ultimaMsg[m.conversa_id] = m.texto; });

    return convs.map(c => ({ ...c, meu_ultimo_lido: lidos[c.id], ultima_msg_preview: ultimaMsg[c.id] || null }));
  }

  function _conversaNome(c) {
    if (c.tipo === 'grupo') return c.nome || 'Grupo';
    const outros = (c.chat_participantes || []).filter(p => p.pessoa_id !== USUARIO_ATUAL.pessoa_id);
    return outros[0]?.pessoas?.nome || 'Usuário';
  }

  // ── Abrir conversa ────────────────────────────────────────────────────────

  window.chatAbrirConversa = async function (id) {
    _conversaAtual = _conversasCache.find(c => c.id === id) || { id };

    document.querySelectorAll('.chat-item').forEach(el =>
      el.classList.toggle('ativo', el.getAttribute('onclick')?.includes(`'${id}'`))
    );

    document.getElementById('chat-vazio').style.display = 'none';
    document.getElementById('chat-thread-ativo').style.display = 'flex';

    const nome = _conversaNome(_conversaAtual);
    document.getElementById('chat-hdr-nome').textContent = nome;
    document.getElementById('chat-hdr-av').textContent   = (nome[0] || '?').toUpperCase();

    await _renderMensagens(id);
    _subscribeToConversa(id);
    _marcarLido(id);

    // Atualizar badge se essa conversa tinha não-lidas
    const cached = _conversasCache.find(c => c.id === id);
    if (cached?.ultima_msg_em && (!cached.meu_ultimo_lido || cached.ultima_msg_em > cached.meu_ultimo_lido)) {
      _setBadge(Math.max(0, _unreadCount - 1));
      cached.meu_ultimo_lido = new Date().toISOString();
    }
  };

  // ── Mensagens ─────────────────────────────────────────────────────────────

  async function _renderMensagens(conversaId) {
    const el = document.getElementById('chat-msgs');
    if (!el) return;
    el.innerHTML = '<div class="chat-loading">Carregando...</div>';

    const r = await fetch(
      _url(`chat_mensagens?conversa_id=eq.${conversaId}&select=id,texto,criado_em,pessoa_id,pessoas(nome)&order=criado_em.asc&limit=60`),
      { headers: apiHeaders() }
    );

    if (!r.ok) { el.innerHTML = '<div class="chat-loading">Erro ao carregar mensagens.</div>'; return; }

    const msgs = await r.json();
    el.innerHTML = msgs.map(m => _htmlMsg(m)).join('');
    el.scrollTop = el.scrollHeight;
  }

  function _htmlMsg(m) {
    const meu  = m.pessoa_id === USUARIO_ATUAL.pessoa_id;
    const hora = _fmtHora(m.criado_em);
    const nome = (m.pessoas?.nome || '').split(' ')[0];

    let conteudo = '';
    if (m.anexo_url) {
      if (m.anexo_tipo?.startsWith('image/')) {
        conteudo += `<img src="${_esc(m.anexo_url)}" class="chat-msg-img" onclick="window.open('${_esc(m.anexo_url)}','_blank')" loading="lazy">`;
      } else {
        const ext = (m.anexo_nome || '').split('.').pop().toUpperCase().slice(0, 5);
        conteudo += `<a href="${_esc(m.anexo_url)}" target="_blank" class="chat-msg-file">
          <span class="chat-msg-file-ic">📄</span>
          <span class="chat-msg-file-nome">${_esc(m.anexo_nome || 'Arquivo')}</span>
        </a>`;
      }
    }
    if (m.texto) conteudo += _esc(m.texto);

    return `
      <div class="chat-msg chat-msg--${meu ? 'meu' : 'deles'}">
        ${!meu ? `<div class="chat-msg-autor">${_esc(nome)}</div>` : ''}
        <div class="chat-msg-balao">${conteudo}<span class="chat-msg-meta">${hora}</span></div>
      </div>`;
  }

  function _appendMsg(msg) {
    const el = document.getElementById('chat-msgs');
    if (!el) return;
    const div = document.createElement('div');
    div.innerHTML = _htmlMsg(msg);
    el.appendChild(div.firstElementChild);
    el.scrollTop = el.scrollHeight;
    _renderLista();
  }

  // ── Realtime por conversa ─────────────────────────────────────────────────

  function _subscribeToConversa(conversaId) {
    const sb = getSupabase();
    if (_channel) { try { sb.removeChannel(_channel); } catch(_) {} _channel = null; }

    _channel = sb.channel('chat-' + conversaId)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'chat_mensagens',
        filter: `conversa_id=eq.${conversaId}`
      }, payload => {
        if (payload.new.pessoa_id !== USUARIO_ATUAL.pessoa_id) _appendMsg(payload.new);
        _marcarLido(conversaId);
      })
      .subscribe();
  }

  async function _marcarLido(conversaId) {
    await fetch(
      _url(`chat_participantes?conversa_id=eq.${conversaId}&pessoa_id=eq.${USUARIO_ATUAL.pessoa_id}`),
      { method: 'PATCH', headers: _H(), body: JSON.stringify({ ultimo_lido_em: new Date().toISOString() }) }
    );
  }

  // ── Enviar ────────────────────────────────────────────────────────────────

  window.chatEnviar = async function () {
    if (!_conversaAtual?.id) return;
    const input = document.getElementById('chat-input');
    const texto = (input?.value || '').trim();

    if (!texto && !_pendingAnexo) return;

    input.value = '';
    input.style.height = '';

    let anexo = null;
    if (_pendingAnexo) {
      const fileRef = _pendingAnexo.file;
      chatRemoverAnexo();
      anexo = await _uploadAnexo(fileRef);
      if (!anexo && !texto) return;
    }

    const agora = new Date().toISOString();
    const msgLocal = {
      id: crypto.randomUUID(), texto: texto || null, criado_em: agora,
      pessoa_id: USUARIO_ATUAL.pessoa_id, pessoas: { nome: USUARIO_ATUAL.nome },
      anexo_url: anexo?.url || null, anexo_nome: anexo?.nome || null, anexo_tipo: anexo?.tipo || null
    };
    _appendMsg(msgLocal);

    const sb = getSupabase();
    const payload = {
      conversa_id: _conversaAtual.id,
      pessoa_id:   USUARIO_ATUAL.pessoa_id,
      texto:       texto || null,
      criado_em:   agora,
      ...(anexo ? { anexo_url: anexo.url, anexo_nome: anexo.nome, anexo_tipo: anexo.tipo } : {})
    };
    await sb.from('chat_mensagens').insert(payload);
    await sb.from('chat_conversas').update({ ultima_msg_em: agora }).eq('id', _conversaAtual.id);
    _marcarLido(_conversaAtual.id);
  };

  window.chatInputKeydown = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatEnviar(); }
  };

  window.chatInputResize = function (el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // ── Anexos ────────────────────────────────────────────────────────────────

  window.chatArquivoSelecionado = function (input) {
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    if (file.size > 10 * 1024 * 1024) { T('Chat', 'Arquivo muito grande — máximo 10 MB'); return; }

    _pendingAnexo = { file, nome: file.name, tipo: file.type, objectUrl: URL.createObjectURL(file) };

    const preview = document.getElementById('chat-anexo-preview');
    const thumb   = document.getElementById('chat-anexo-thumb');
    const nomeEl  = document.getElementById('chat-anexo-nome');

    preview.classList.add('ativo');
    nomeEl.textContent = file.name;

    if (file.type.startsWith('image/')) {
      thumb.innerHTML = `<img src="${_pendingAnexo.objectUrl}" class="chat-anexo-preview-thumb">`;
    } else {
      const ext = file.name.split('.').pop().toUpperCase().slice(0, 4);
      thumb.innerHTML = `<div class="chat-anexo-preview-file">${ext}</div>`;
    }
  };

  window.chatRemoverAnexo = function () {
    if (_pendingAnexo?.objectUrl) URL.revokeObjectURL(_pendingAnexo.objectUrl);
    _pendingAnexo = null;
    document.getElementById('chat-anexo-preview').classList.remove('ativo');
    document.getElementById('chat-anexo-thumb').innerHTML = '';
  };

  async function _uploadAnexo(file) {
    const sb   = getSupabase();
    const ext  = file.name.split('.').pop();
    const path = `${USUARIO_ATUAL.pessoa_id}/${Date.now()}-${crypto.randomUUID().slice(0,8)}.${ext}`;

    const { data, error } = await sb.storage.from('chat-anexos').upload(path, file, {
      contentType: file.type,
      upsert: false
    });

    if (error) { T('Chat', `Erro ao enviar arquivo: ${error.message}`); return null; }

    return {
      url:  `${STORAGE_URL}/object/public/chat-anexos/${data.path}`,
      nome: file.name,
      tipo: file.type
    };
  }

  // ── Nova conversa ─────────────────────────────────────────────────────────

  window.chatNovaConversa = async function () {
    const r = await fetch(_url('pessoas?auth_user_id=not.is.null&select=id,nome&order=nome'), { headers: apiHeaders() });
    const usuarios = r.ok ? await r.json() : [];
    const outros = usuarios.filter(p => p.id !== USUARIO_ATUAL.pessoa_id);
    if (!outros.length) { T('Chat', 'Nenhum outro usuário encontrado'); return; }

    document.getElementById('chat-modal-bg')?.remove();

    const opts = outros.map(p => `<option value="${p.id}">${_esc(p.nome || 'Usuário')}</option>`).join('');
    const modal = document.createElement('div');
    modal.id = 'chat-modal-bg';
    modal.className = 'chat-modal-bg';
    modal.innerHTML = `
      <div class="chat-modal">
        <h3>Nova Conversa</h3>
        <select id="chat-modal-select">${opts}</select>
        <div class="chat-modal-btns">
          <button onclick="document.getElementById('chat-modal-bg').remove()">Cancelar</button>
          <button class="pri" onclick="chatIniciarDM()">Iniciar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  };

  window.chatIniciarDM = async function () {
    const sel = document.getElementById('chat-modal-select');
    const outroPessoaId = sel?.value;
    if (!outroPessoaId) return;

    document.getElementById('chat-modal-bg')?.remove();

    const myId = USUARIO_ATUAL.pessoa_id;
    let conversaId = null;

    const r1 = await fetch(_url(`chat_participantes?pessoa_id=eq.${myId}&select=conversa_id`), { headers: apiHeaders() });
    const minhoParts = r1.ok ? await r1.json() : [];

    if (minhoParts.length) {
      const minhosIds = minhoParts.map(p => `"${p.conversa_id}"`).join(',');
      const r2 = await fetch(_url(`chat_participantes?pessoa_id=eq.${outroPessoaId}&conversa_id=in.(${minhosIds})&select=conversa_id`), { headers: apiHeaders() });
      const comuns = r2.ok ? await r2.json() : [];
      if (comuns.length) {
        const comunsIds = comuns.map(p => `"${p.conversa_id}"`).join(',');
        const r3 = await fetch(_url(`chat_conversas?id=in.(${comunsIds})&tipo=eq.direto&select=id&limit=1`), { headers: apiHeaders() });
        const convs = r3.ok ? await r3.json() : [];
        if (convs.length) conversaId = convs[0].id;
      }
    }

    if (!conversaId) {
      const sb = getSupabase();
      const newId = crypto.randomUUID();
      const { error: eConv } = await sb.from('chat_conversas').insert({ id: newId, tipo: 'direto', criado_por: myId });
      if (eConv) { T('Chat', `Erro ao criar conversa: ${eConv.message}`); return; }
      conversaId = newId;
      const { error: ePart } = await sb.from('chat_participantes').insert([
        { conversa_id: conversaId, pessoa_id: myId },
        { conversa_id: conversaId, pessoa_id: outroPessoaId }
      ]);
      if (ePart) { T('Chat', `Erro ao adicionar participantes: ${ePart.message}`); return; }
    }

    if (conversaId) {
      await _renderLista();
      await chatAbrirConversa(conversaId);
    } else {
      T('Chat', 'Não foi possível abrir a conversa');
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _fmtHora(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return new Date().toDateString() === d.toDateString()
      ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Registro ──────────────────────────────────────────────────────────────

  VIEW_AUTOLOAD['chat-inbox'] = { fn: chatInit };

})();
