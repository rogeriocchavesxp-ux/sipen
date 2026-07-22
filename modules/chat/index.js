// SIPEN — Chat Interno v6.49.1
// Mensagens em tempo real entre usuários do sistema

(function () {
  'use strict';

  let _conversaAtual = null;
  let _channel       = null;
  let _conversasCache = [];

  const _H = () => ({ ...apiHeaders(), 'Content-Type': 'application/json' });
  const _url = (path) => `${apiBaseUrl()}/rest/v1/${path}`;

  // ── Init ──────────────────────────────────────────────────────────────────

  async function chatInit() {
    if (!USUARIO_ATUAL?.pessoa_id) return;
    await _renderLista();
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
      const nome  = _conversaNome(c);
      const ativa = _conversaAtual?.id === c.id;
      const hora  = c.ultima_msg_em ? _fmtHora(c.ultima_msg_em) : '';
      const naoLida = c.meu_ultimo_lido && c.ultima_msg_em && c.ultima_msg_em > c.meu_ultimo_lido;
      return `
        <div class="chat-item${ativa ? ' ativo' : ''}" onclick="chatAbrirConversa('${c.id}')">
          <div class="chat-item-av">${(nome[0] || '?').toUpperCase()}</div>
          <div class="chat-item-info">
            <div class="chat-item-nome">${_esc(nome)}</div>
            <div class="chat-item-preview">${_esc(c.ultima_msg_preview || 'Sem mensagens')}</div>
          </div>
          <div class="chat-item-meta">
            <div class="chat-item-hora">${hora}</div>
            ${naoLida ? '<div class="chat-item-dot"></div>' : ''}
          </div>
        </div>`;
    }).join('');
  }

  async function _loadConversas() {
    const myId = USUARIO_ATUAL.pessoa_id;

    // 1. Minhas participações
    const r1 = await fetch(_url(`chat_participantes?pessoa_id=eq.${myId}&select=conversa_id,ultimo_lido_em`), { headers: apiHeaders() });
    if (!r1.ok) return [];
    const parts = await r1.json();
    if (!parts.length) return [];

    const ids   = parts.map(p => p.conversa_id);
    const lidos = Object.fromEntries(parts.map(p => [p.conversa_id, p.ultimo_lido_em]));
    const inIds = ids.map(i => `"${i}"`).join(',');

    // 2. Conversas com participantes
    const r2 = await fetch(
      _url(`chat_conversas?id=in.(${inIds})&select=id,tipo,nome,ultima_msg_em,chat_participantes(pessoa_id,pessoas(id,nome))&order=ultima_msg_em.desc.nullsfirst`),
      { headers: apiHeaders() }
    );
    const convs = r2.ok ? await r2.json() : [];

    // 3. Última mensagem de cada conversa
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
    const area = document.getElementById('chat-thread-ativo');
    Object.assign(area.style, { display: 'flex', flexDirection: 'column', flex: '1', overflow: 'hidden' });

    const nome = _conversaNome(_conversaAtual);
    document.getElementById('chat-hdr-nome').textContent = nome;
    document.getElementById('chat-hdr-av').textContent   = (nome[0] || '?').toUpperCase();

    await _renderMensagens(id);
    _subscribeToConversa(id);
    _marcarLido(id);
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

    if (!r.ok) {
      el.innerHTML = '<div class="chat-loading">Erro ao carregar mensagens.</div>';
      return;
    }

    const msgs = await r.json();
    el.innerHTML = msgs.map(m => _htmlMsg(m)).join('');
    el.scrollTop = el.scrollHeight;
  }

  function _htmlMsg(m) {
    const meu  = m.pessoa_id === USUARIO_ATUAL.pessoa_id;
    const hora = _fmtHora(m.criado_em);
    const nome = (m.pessoas?.nome || '').split(' ')[0];
    return `
      <div class="chat-msg chat-msg--${meu ? 'meu' : 'deles'}">
        ${!meu ? `<div class="chat-msg-autor">${_esc(nome)}</div>` : ''}
        <div class="chat-msg-balao">${_esc(m.texto)}</div>
        <div class="chat-msg-hora">${hora}</div>
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

  // ── Realtime (único uso do Supabase JS client) ────────────────────────────

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
    if (!texto) return;

    input.value = '';
    input.style.height = '';

    const agora = new Date().toISOString();

    // Insere e exibe otimisticamente — não depende do retorno
    const msgLocal = {
      id: crypto.randomUUID(), texto, criado_em: agora,
      pessoa_id: USUARIO_ATUAL.pessoa_id,
      pessoas: { nome: USUARIO_ATUAL.nome }
    };
    _appendMsg(msgLocal);

    await fetch(_url('chat_mensagens'), {
      method:  'POST',
      headers: { ..._H(), 'Prefer': 'return=minimal' },
      body:    JSON.stringify({ conversa_id: _conversaAtual.id, pessoa_id: USUARIO_ATUAL.pessoa_id, texto, criado_em: agora })
    });

    await fetch(
      _url(`chat_conversas?id=eq.${_conversaAtual.id}`),
      { method: 'PATCH', headers: _H(), body: JSON.stringify({ ultima_msg_em: agora }) }
    );
  };

  window.chatInputKeydown = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatEnviar(); }
  };

  window.chatInputResize = function (el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

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

    // 1. Minhas conversas
    const r1 = await fetch(_url(`chat_participantes?pessoa_id=eq.${myId}&select=conversa_id`), { headers: apiHeaders() });
    const minhoParts = r1.ok ? await r1.json() : [];

    if (minhoParts.length) {
      const minhosIds = minhoParts.map(p => `"${p.conversa_id}"`).join(',');

      // 2. Conversas em que o outro também participa
      const r2 = await fetch(_url(`chat_participantes?pessoa_id=eq.${outroPessoaId}&conversa_id=in.(${minhosIds})&select=conversa_id`), { headers: apiHeaders() });
      const comuns = r2.ok ? await r2.json() : [];

      if (comuns.length) {
        const comunsIds = comuns.map(p => `"${p.conversa_id}"`).join(',');
        const r3 = await fetch(_url(`chat_conversas?id=in.(${comunsIds})&tipo=eq.direto&select=id&limit=1`), { headers: apiHeaders() });
        const convs = r3.ok ? await r3.json() : [];
        if (convs.length) conversaId = convs[0].id;
      }
    }

    // 3. Cria nova conversa se não existe
    if (!conversaId) {
      // UUID gerado no cliente — evita depender de SELECT pós-insert bloqueado por RLS
      const newId = crypto.randomUUID();

      const rC = await fetch(_url('chat_conversas'), {
        method:  'POST',
        headers: { ..._H(), 'Prefer': 'return=minimal' },
        body:    JSON.stringify({ id: newId, tipo: 'direto', criado_por: myId })
      });
      if (!rC.ok) {
        const err = await rC.text().catch(() => rC.status);
        console.error('chat_conversas insert error:', rC.status, err);
        T('Chat', `Erro ao criar conversa (${rC.status})`);
        return;
      }

      conversaId = newId;

      const rP = await fetch(_url('chat_participantes'), {
        method:  'POST',
        headers: { ..._H(), 'Prefer': 'return=minimal' },
        body:    JSON.stringify([
          { conversa_id: conversaId, pessoa_id: myId },
          { conversa_id: conversaId, pessoa_id: outroPessoaId }
        ])
      });
      if (!rP.ok) {
        console.error('chat_participantes insert error:', rP.status);
        T('Chat', 'Erro ao adicionar participantes');
        return;
      }
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
    const hoje = new Date().toDateString() === d.toDateString();
    return hoje
      ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Registro ──────────────────────────────────────────────────────────────

  VIEW_AUTOLOAD['chat-inbox'] = { fn: chatInit };

})();
