// SIPEN — Chat Interno v6.49.0
// Mensagens em tempo real entre usuários do sistema

(function () {
  'use strict';

  let _conversaAtual = null;  // objeto completo da conversa aberta
  let _channel = null;        // Supabase Realtime channel
  let _conversasCache = [];   // cache local para re-render da lista

  // ── Init ────────────────────────────────────────────────────────────────────

  async function chatInit() {
    if (!USUARIO_ATUAL?.pessoa_id) return;
    await _renderLista();
  }

  // ── Lista de conversas ──────────────────────────────────────────────────────

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
      const nome = _conversaNome(c);
      const ativa = _conversaAtual?.id === c.id;
      const preview = c.ultima_msg_preview || 'Sem mensagens';
      const hora = c.ultima_msg_em ? _fmtHora(c.ultima_msg_em) : '';
      const av = (nome[0] || '?').toUpperCase();
      const naoLida = c.meu_ultimo_lido && c.ultima_msg_em && c.ultima_msg_em > c.meu_ultimo_lido;
      return `
        <div class="chat-item${ativa ? ' ativo' : ''}" onclick="chatAbrirConversa('${c.id}')">
          <div class="chat-item-av">${av}</div>
          <div class="chat-item-info">
            <div class="chat-item-nome">${_esc(nome)}</div>
            <div class="chat-item-preview">${_esc(preview)}</div>
          </div>
          <div class="chat-item-meta">
            <div class="chat-item-hora">${hora}</div>
            ${naoLida ? '<div class="chat-item-dot"></div>' : ''}
          </div>
        </div>`;
    }).join('');
  }

  async function _loadConversas() {
    const sb = getSupabase();
    const myId = USUARIO_ATUAL.pessoa_id;

    // 1. Busca minhas participações
    const { data: parts, error: e1 } = await sb
      .from('chat_participantes')
      .select('conversa_id, ultimo_lido_em')
      .eq('pessoa_id', myId);

    if (e1 || !parts?.length) return [];

    const ids = parts.map(p => p.conversa_id);
    const lidos = Object.fromEntries(parts.map(p => [p.conversa_id, p.ultimo_lido_em]));

    // 2. Busca conversas com participantes e última mensagem
    const { data: convs } = await sb
      .from('chat_conversas')
      .select('id, tipo, nome, ultima_msg_em, chat_participantes(pessoa_id, pessoas(id, nome))')
      .in('id', ids)
      .order('ultima_msg_em', { ascending: false, nullsFirst: false });

    if (!convs?.length) return [];

    // 3. Busca última mensagem de cada conversa
    const { data: msgs } = await sb
      .from('chat_mensagens')
      .select('conversa_id, texto, criado_em')
      .in('conversa_id', ids)
      .order('criado_em', { ascending: false });

    const ultimaMsg = {};
    (msgs || []).forEach(m => {
      if (!ultimaMsg[m.conversa_id]) ultimaMsg[m.conversa_id] = m.texto;
    });

    return convs.map(c => ({
      ...c,
      meu_ultimo_lido: lidos[c.id],
      ultima_msg_preview: ultimaMsg[c.id] || null
    }));
  }

  function _conversaNome(c) {
    if (c.tipo === 'grupo') return c.nome || 'Grupo';
    const outros = (c.chat_participantes || []).filter(p => p.pessoa_id !== USUARIO_ATUAL.pessoa_id);
    return outros[0]?.pessoas?.nome || 'Usuário';
  }

  // ── Abrir conversa ──────────────────────────────────────────────────────────

  window.chatAbrirConversa = async function (id) {
    _conversaAtual = _conversasCache.find(c => c.id === id) || { id };

    // Atualiza visual da lista
    document.querySelectorAll('.chat-item').forEach(el => {
      el.classList.toggle('ativo', el.getAttribute('onclick')?.includes(`'${id}'`));
    });

    // Mostra área de thread
    document.getElementById('chat-vazio').style.display = 'none';
    const area = document.getElementById('chat-thread-ativo');
    area.style.display = 'flex';
    area.style.flexDirection = 'column';
    area.style.flex = '1';
    area.style.overflow = 'hidden';

    // Preenche cabeçalho
    const nome = _conversaNome(_conversaAtual);
    document.getElementById('chat-hdr-nome').textContent = nome;
    document.getElementById('chat-hdr-av').textContent = (nome[0] || '?').toUpperCase();

    // Carrega mensagens
    await _renderMensagens(id);

    // Realtime
    _subscribeToConversa(id);

    // Marca como lido
    _marcarLido(id);
  };

  // ── Mensagens ───────────────────────────────────────────────────────────────

  async function _renderMensagens(conversaId) {
    const el = document.getElementById('chat-msgs');
    if (!el) return;
    el.innerHTML = '<div class="chat-loading">Carregando...</div>';

    const sb = getSupabase();
    const { data: msgs } = await sb
      .from('chat_mensagens')
      .select('id, texto, criado_em, pessoa_id, pessoas(nome)')
      .eq('conversa_id', conversaId)
      .order('criado_em', { ascending: true })
      .limit(60);

    el.innerHTML = (msgs || []).map(m => _htmlMsg(m)).join('');
    el.scrollTop = el.scrollHeight;
  }

  function _htmlMsg(m) {
    const meu = m.pessoa_id === USUARIO_ATUAL.pessoa_id;
    const hora = _fmtHora(m.criado_em);
    const primeiroNome = (m.pessoas?.nome || '').split(' ')[0];
    return `
      <div class="chat-msg chat-msg--${meu ? 'meu' : 'deles'}">
        ${!meu ? `<div class="chat-msg-autor">${_esc(primeiroNome)}</div>` : ''}
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
    _renderLista(); // atualiza preview na lista
  }

  // ── Realtime ────────────────────────────────────────────────────────────────

  function _subscribeToConversa(conversaId) {
    const sb = getSupabase();
    if (_channel) { sb.removeChannel(_channel); _channel = null; }

    _channel = sb.channel('chat-' + conversaId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_mensagens',
        filter: `conversa_id=eq.${conversaId}`
      }, payload => {
        // Ignora mensagem própria — já foi inserida localmente por chatEnviar
        if (payload.new.pessoa_id !== USUARIO_ATUAL.pessoa_id) {
          _appendMsg(payload.new);
        }
        _marcarLido(conversaId);
      })
      .subscribe();
  }

  async function _marcarLido(conversaId) {
    const sb = getSupabase();
    await sb.from('chat_participantes')
      .update({ ultimo_lido_em: new Date().toISOString() })
      .eq('conversa_id', conversaId)
      .eq('pessoa_id', USUARIO_ATUAL.pessoa_id);
  }

  // ── Enviar mensagem ─────────────────────────────────────────────────────────

  window.chatEnviar = async function () {
    if (!_conversaAtual?.id) return;
    const input = document.getElementById('chat-input');
    const texto = (input?.value || '').trim();
    if (!texto) return;

    input.value = '';
    input.style.height = '';

    const sb = getSupabase();
    const agora = new Date().toISOString();

    const { data: [msg] } = await sb.from('chat_mensagens').insert({
      conversa_id: _conversaAtual.id,
      pessoa_id: USUARIO_ATUAL.pessoa_id,
      texto,
      criado_em: agora
    }).select('id, texto, criado_em, pessoa_id');

    if (msg) _appendMsg({ ...msg, pessoas: { nome: USUARIO_ATUAL.nome } });

    await sb.from('chat_conversas')
      .update({ ultima_msg_em: agora })
      .eq('id', _conversaAtual.id);
  };

  window.chatInputKeydown = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatEnviar();
    }
  };

  window.chatInputResize = function (el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // ── Nova conversa ───────────────────────────────────────────────────────────

  window.chatNovaConversa = async function () {
    const sb = getSupabase();

    // Busca pessoas com login no sistema (auth_user_id preenchido)
    const r = await fetch(
      `${apiBaseUrl()}/rest/v1/pessoas?auth_user_id=not.is.null&select=id,nome&order=nome`,
      { headers: apiHeaders() }
    );
    const usuarios = r.ok ? await r.json() : [];

    const outros = (usuarios || []).filter(p => p.id !== USUARIO_ATUAL.pessoa_id);
    if (!outros.length) { T('Chat', 'Nenhum outro usuário encontrado'); return; }

    // Remove modal anterior se existir
    document.getElementById('chat-modal-bg')?.remove();

    const opts = outros
      .map(p => `<option value="${p.id}">${_esc(p.nome || 'Usuário')}</option>`)
      .join('');

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

    const sb = getSupabase();
    const myId = USUARIO_ATUAL.pessoa_id;

    // Verifica se DM já existe entre os dois
    const { data: existentes } = await sb
      .from('chat_participantes')
      .select('conversa_id')
      .eq('pessoa_id', myId);

    let conversaId = null;

    if (existentes?.length) {
      const minhosIds = existentes.map(p => p.conversa_id);
      const { data: check } = await sb
        .from('chat_participantes')
        .select('conversa_id')
        .eq('pessoa_id', outroPessoaId)
        .in('conversa_id', minhosIds);

      if (check?.length) {
        // Verifica se é DM (tipo=direto)
        const { data: convs } = await sb
          .from('chat_conversas')
          .select('id, tipo')
          .in('id', check.map(c => c.conversa_id))
          .eq('tipo', 'direto');
        if (convs?.length) conversaId = convs[0].id;
      }
    }

    if (!conversaId) {
      // Cria nova conversa
      const { data: [nova] } = await sb
        .from('chat_conversas')
        .insert({ tipo: 'direto', criado_por: myId })
        .select('id');

      conversaId = nova?.id;

      if (conversaId) {
        await sb.from('chat_participantes').insert([
          { conversa_id: conversaId, pessoa_id: myId },
          { conversa_id: conversaId, pessoa_id: outroPessoaId }
        ]);
      }
    }

    if (conversaId) {
      await _renderLista();
      await chatAbrirConversa(conversaId);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function _fmtHora(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const agora = new Date();
    const hoje = agora.toDateString() === d.toDateString();
    if (hoje) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Registro ─────────────────────────────────────────────────────────────────

  VIEW_AUTOLOAD['chat-inbox'] = { fn: chatInit };

})();
