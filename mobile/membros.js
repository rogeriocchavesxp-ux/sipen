/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Membros
   mobile/membros.js · v1.4.0
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('membros',     renderMembros);
  mobRegisterPage('memb-perfil', renderPerfil);
  mobRegisterPage('memb-anivs',  renderAnivs);

  const PAGE_SIZE = 50;

  let _busca     = '';
  let _offset    = 0;
  let _hasMore   = false;
  let _loading   = false;
  let _observer  = null;
  let _congs     = null;

  /* ── Lista ─────────────────────────────────────────── */
  async function renderMembros(el) {
    _offset  = 0;
    _hasMore = false;
    _loading = false;
    _congs   = null;
    if (_observer) { _observer.disconnect(); _observer = null; }

    el.innerHTML = `
      <div style="padding-bottom:80px">
        <div style="padding:12px 16px 0;display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:13px;font-weight:600;color:var(--tx2)">Membros</span>
          <button onclick="mobGo('memb-anivs',{title:'Aniversariantes'})"
            style="display:flex;align-items:center;gap:6px;background:var(--amberbg,rgba(234,179,8,.12));
                   color:var(--amber);border:none;border-radius:20px;padding:5px 12px;font-size:12px;
                   font-weight:600;cursor:pointer">
            🎂 Aniversariantes
          </button>
        </div>
        <div class="mob-search-wrap">
          <input class="mob-search" type="search" placeholder="Buscar membros…"
                 value="${_esc(_busca)}"
                 oninput="_membBusca(this.value)"
                 onsearch="_membBusca(this.value)">
        </div>
        <div id="memb-lista" class="mob-section"></div>
        <div id="memb-sentinel" style="height:1px"></div>
      </div>
      <!-- FAB -->
      <button onclick="_membAbrirNovoForm()"
        style="position:fixed;bottom:calc(var(--tab-h) + var(--safe-bottom) + 16px);right:18px;
               z-index:200;width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;
               background:var(--gr,#30d158);color:#fff;font-size:22px;font-weight:300;
               display:flex;align-items:center;justify-content:center;
               box-shadow:0 4px 16px rgba(48,209,88,.45)">
        +
      </button>
    `;
    _carregarCongsMob();
    await _carregarPagina(true);
  }

  async function _carregarPagina(reset) {
    if (_loading) return;
    _loading = true;

    const lista = document.getElementById('memb-lista');
    if (!lista) { _loading = false; return; }

    if (reset) {
      lista.innerHTML = `<div class="mob-card-list mob-loading-state">Carregando…</div>`;
    }

    const q = _busca.trim().toLowerCase();
    let url = `${apiBaseUrl()}/rest/v1/v_membros?select=id,nome,celular,email,funcao,congregacao,data_nascimento&order=nome.asc&limit=${PAGE_SIZE}&offset=${_offset}`;
    if (q) {
      url += `&or=(nome.ilike.*${encodeURIComponent(q)}*,funcao.ilike.*${encodeURIComponent(q)}*,congregacao.ilike.*${encodeURIComponent(q)}*,email.ilike.*${encodeURIComponent(q)}*)`;
    }

    try {
      const res  = await fetch(url, {
        headers: { ...apiHeaders(), 'Prefer': 'count=exact' }
      });
      const data = Array.isArray(await res.clone().json()) ? await res.json() : [];

      if (reset) lista.innerHTML = '';

      if (!data.length && reset) {
        lista.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">👥</div><div class="mob-empty-text">Nenhum membro encontrado.</div></div>`;
        _hasMore = false;
        _loading = false;
        return;
      }

      _appendRows(lista, data, reset);
      _hasMore = data.length === PAGE_SIZE;
      _offset += data.length;

    } catch (_) {
      if (reset) lista.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar membros.</div></div>`;
      _hasMore = false;
    }

    _loading = false;
    _setupObserver();
  }

  function _appendRows(lista, data, reset) {
    // Descobrir última letra já renderizada (para continuar grupos)
    let lastLetra = reset ? null : (lista.dataset.lastLetra || null);

    data.forEach(m => {
      const l = (m.nome || '?')[0].toUpperCase();
      if (l !== lastLetra) {
        const title = document.createElement('div');
        title.className = 'mob-section-title';
        title.style.paddingTop = '16px';
        title.textContent = l;
        lista.appendChild(title);

        const card = document.createElement('div');
        card.className = 'mob-card-list';
        card.dataset.letra = l;
        lista.appendChild(card);
        lastLetra = l;
      }
      const group = lista.querySelector(`.mob-card-list[data-letra="${l}"]`);
      if (group) group.insertAdjacentHTML('beforeend', _membRow(m));
    });

    lista.dataset.lastLetra = lastLetra || '';
  }

  function _setupObserver() {
    if (!_hasMore) return;
    const sentinel = document.getElementById('memb-sentinel');
    if (!sentinel) return;
    if (_observer) _observer.disconnect();
    _observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && _hasMore && !_loading) {
        _carregarPagina(false);
      }
    }, { rootMargin: '200px' });
    _observer.observe(sentinel);
  }

  function _membRow(m) {
    const initials = (m.nome || '?').trim().split(/\s+/).map(n => n[0]).slice(0,2).join('').toUpperCase();
    const aniv     = _isAnivHoje(m.data_nascimento);
    return `
      <div class="mob-list-item" onclick="mobGo('memb-perfil',{id:'${m.id}',title:'${_esc(m.nome)}'})">
        <div class="mob-list-ico" style="background:var(--bg-hover);color:var(--tx1);font-size:13px;font-weight:700;border-radius:50%;position:relative">
          ${initials}${aniv ? '<span style="position:absolute;bottom:-2px;right:-2px;font-size:10px">🎂</span>' : ''}
        </div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(m.nome)}${aniv ? ' 🎂' : ''}</div>
          <div class="mob-list-sub">${m.funcao ? _esc(m.funcao) : ''}${m.funcao && m.congregacao ? ' · ' : ''}${m.congregacao ? _esc(m.congregacao) : ''}</div>
        </div>
        <div class="mob-list-chev">›</div>
      </div>
    `;
  }

  let _buscaTimer = null;
  window._membBusca = function (val) {
    _busca = val;
    clearTimeout(_buscaTimer);
    _buscaTimer = setTimeout(() => {
      _offset = 0;
      _hasMore = false;
      if (_observer) { _observer.disconnect(); _observer = null; }
      _carregarPagina(true);
    }, 280);
  };

  /* ── Congregações (cache) ────────────────────────── */
  async function _carregarCongsMob() {
    if (_congs) return;
    try {
      const res  = await fetch(
        `${apiBaseUrl()}/rest/v1/congregacoes?status=eq.ativa&select=id,nome&order=nome.asc`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      _congs = Array.isArray(data) ? data : [];
    } catch (_) {
      _congs = [];
    }
  }

  /* ── Ingresso de Novo Membro ─────────────────────── */
  window._membAbrirNovoForm = async function () {
    if (!_congs) await _carregarCongsMob();
    const hoje = new Date().toISOString().split('T')[0];
    const congOpts = (_congs || []).map(c =>
      `<option value="${_esc(c.id)}">${_esc(c.nome)}</option>`
    ).join('');

    document.getElementById('memb-novo-sheet')?.remove();
    const s = document.createElement('div');
    s.id = 'memb-novo-sheet';
    s.style.cssText = 'position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;justify-content:flex-end';
    s.innerHTML = `
      <div onclick="document.getElementById('memb-novo-sheet')?.remove()"
           style="flex:1;background:rgba(0,0,0,.4)"></div>
      <div style="background:var(--bg-surface);border-radius:18px 18px 0 0;
                  padding:20px 16px;padding-bottom:calc(var(--safe-bottom) + 20px);
                  max-height:92vh;overflow-y:auto">
        <div style="font-size:16px;font-weight:700;color:var(--tx1);margin-bottom:16px;text-align:center">
          Novo Membro
        </div>

        <div class="mob-field">
          <label class="mob-label">NOME COMPLETO <span style="color:var(--rose)">*</span></label>
          <input id="mn-nome" class="mob-input" type="text" maxlength="120" placeholder="Nome completo">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="mob-field">
            <label class="mob-label">TIPO DE INGRESSO <span style="color:var(--rose)">*</span></label>
            <select id="mn-ingresso" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
              <option value="">Selecione</option>
              <option>Profissão de Fé</option>
              <option>Transferência</option>
              <option>Jurisdição</option>
              <option>Reversão</option>
              <option>Adesão</option>
            </select>
          </div>
          <div class="mob-field">
            <label class="mob-label">TIPO DE MEMBRO</label>
            <select id="mn-tipo" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
              <option value="">Selecione</option>
              <option>Comungante</option>
              <option>Não Comungante</option>
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="mob-field">
            <label class="mob-label">DATA DE INGRESSO <span style="color:var(--rose)">*</span></label>
            <input id="mn-data" class="mob-input" type="date" value="${hoje}">
          </div>
          <div class="mob-field">
            <label class="mob-label">CONGREGAÇÃO</label>
            <select id="mn-cong" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
              <option value="">Selecione</option>
              ${congOpts}
            </select>
          </div>
        </div>

        <div class="mob-field">
          <label class="mob-label">CELULAR <span style="color:var(--tx3);font-weight:400">(opcional)</span></label>
          <input id="mn-cel" class="mob-input" type="tel" inputmode="tel" placeholder="(11) 99999-9999">
        </div>

        <div class="mob-field">
          <label class="mob-label">E-MAIL <span style="color:var(--tx3);font-weight:400">(opcional)</span></label>
          <input id="mn-email" class="mob-input" type="email" inputmode="email" placeholder="nome@email.com">
        </div>

        <div class="mob-field">
          <label class="mob-label">DATA DE NASCIMENTO <span style="color:var(--tx3);font-weight:400">(opcional)</span></label>
          <input id="mn-nasc" class="mob-input" type="date">
        </div>

        <div id="mn-err" style="font-size:13px;color:var(--rose);min-height:16px"></div>
        <button id="mn-btn" class="mob-btn-primary" onclick="_membSalvarNovo()">
          Registrar Membro
        </button>
      </div>
    `;
    document.body.appendChild(s);
  };

  window._membSalvarNovo = async function () {
    const btn      = document.getElementById('mn-btn');
    const errEl    = document.getElementById('mn-err');
    const nome     = (document.getElementById('mn-nome')?.value     || '').trim();
    const ingresso = document.getElementById('mn-ingresso')?.value  || '';
    const tipo     = document.getElementById('mn-tipo')?.value      || null;
    const dataIng  = document.getElementById('mn-data')?.value      || null;
    const congId   = document.getElementById('mn-cong')?.value      || null;
    const cel      = (document.getElementById('mn-cel')?.value      || '').trim() || null;
    const email    = (document.getElementById('mn-email')?.value    || '').trim() || null;
    const nasc     = document.getElementById('mn-nasc')?.value      || null;

    if (errEl) errEl.textContent = '';
    if (!nome)     { if (errEl) errEl.textContent = 'Informe o nome.';                return; }
    if (!ingresso) { if (errEl) errEl.textContent = 'Selecione o tipo de ingresso.';  return; }
    if (!dataIng)  { if (errEl) errEl.textContent = 'Informe a data de ingresso.';    return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }

    const congNome = (_congs || []).find(c => c.id === congId)?.nome || null;

    try {
      const sb = getSupabase();

      const { data: pessoaRows, error: errP } = await sb
        .from('pessoas')
        .insert({ nome, celular: cel, email, data_nascimento: nasc || null })
        .select('id');
      if (errP) throw errP;
      const pessoaId = pessoaRows?.[0]?.id;
      if (!pessoaId) throw new Error('Erro ao criar registro de pessoa.');

      const { error: errM } = await sb.from('membros').insert({
        pessoa_id:     pessoaId,
        tipo_membro:   tipo    || null,
        tipo_ingresso: ingresso,
        data_ingresso: dataIng,
        congregacao:   congNome,
        status:        'ativo',
      });
      if (errM) throw errM;

      document.getElementById('memb-novo-sheet')?.remove();
      mobToast('Membro registrado');
      _offset  = 0;
      _hasMore = false;
      if (_observer) { _observer.disconnect(); _observer = null; }
      await _carregarPagina(true);
    } catch (e) {
      if (errEl) errEl.textContent = e.message || 'Erro ao registrar.';
      if (btn) { btn.disabled = false; btn.textContent = 'Registrar Membro'; }
    }
  };

  /* ── Aniversariantes ──────────────────────────────── */
  async function renderAnivs(el) {
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;
    const hoje    = new Date();
    const mes     = String(hoje.getMonth() + 1).padStart(2, '0');
    const nomeMes = hoje.toLocaleDateString('pt-BR', { month: 'long' });
    const nomeMesCap = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/v_membros?select=id,nome,data_nascimento&data_nascimento=like.*-${mes}-*&order=data_nascimento.asc&limit=300`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) {
        el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">🎂</div><div class="mob-empty-text">Nenhum aniversariante em ${nomeMesCap}.</div></div>`;
        return;
      }
      data.sort((a, b) => {
        const da = Number((a.data_nascimento || '').split('-')[2]);
        const db = Number((b.data_nascimento || '').split('-')[2]);
        return da - db;
      });
      el.innerHTML = `
        <div class="mob-section">
          <div class="mob-section-title" style="padding:16px 16px 8px">
            ${nomeMesCap} · ${data.length} aniversariante${data.length !== 1 ? 's' : ''}
          </div>
          <div class="mob-card-list">
            ${data.map(m => {
              const dia      = Number((m.data_nascimento || '').split('-')[2]);
              const initials = (m.nome || '?').trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase();
              const isHoje   = _isAnivHoje(m.data_nascimento);
              return `
                <div class="mob-list-item" onclick="mobGo('memb-perfil',{id:'${m.id}',title:'${_esc(m.nome)}'})">
                  <div class="mob-list-ico"
                       style="background:${isHoje ? 'var(--gr)' : 'rgba(234,179,8,.12)'};
                              color:${isHoje ? '#fff' : 'var(--amber)'};
                              font-size:13px;font-weight:700;border-radius:50%">
                    ${initials}
                  </div>
                  <div class="mob-list-body">
                    <div class="mob-list-title">${_esc(m.nome)}${isHoje ? ' 🎂' : ''}</div>
                    <div class="mob-list-sub">Dia ${dia}${isHoje ? ' — Hoje!' : ''}</div>
                  </div>
                  <div class="mob-list-chev">›</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar aniversariantes.</div></div>`;
    }
  }

  /* ── Editar Membro ────────────────────────────────── */
  const _TIPOS_MEMBRO = ['Comungante', 'Não Comungante'];

  window._membAbrirEditForm = function (pessoaId, membId, celular, email, dataNasc, tipoMembro) {
    document.getElementById('memb-edit-sheet')?.remove();
    const tipoOpts = _TIPOS_MEMBRO.map(t =>
      `<option value="${t}"${t === tipoMembro ? ' selected' : ''}>${t}</option>`
    ).join('');
    const tipoExtra = tipoMembro && !_TIPOS_MEMBRO.includes(tipoMembro)
      ? `<option value="${_esc(tipoMembro)}" selected>${_esc(tipoMembro)}</option>` : '';

    const s = document.createElement('div');
    s.id = 'memb-edit-sheet';
    s.style.cssText = 'position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;justify-content:flex-end';
    s.innerHTML = `
      <div onclick="document.getElementById('memb-edit-sheet')?.remove()"
           style="flex:1;background:rgba(0,0,0,.4)"></div>
      <div style="background:var(--bg-surface);border-radius:18px 18px 0 0;
                  padding:20px 16px;padding-bottom:calc(var(--safe-bottom) + 20px);
                  max-height:90vh;overflow-y:auto">
        <div style="font-size:16px;font-weight:700;color:var(--tx1);margin-bottom:16px;text-align:center">
          Editar Dados
        </div>
        <div class="mob-field">
          <label class="mob-label">TIPO DE MEMBRO</label>
          <select id="memb-e-tipo" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
            <option value="">Não definido</option>
            ${tipoExtra}${tipoOpts}
          </select>
        </div>
        <div class="mob-field">
          <label class="mob-label">CELULAR</label>
          <input id="memb-e-cel" class="mob-input" type="tel" inputmode="tel"
                 value="${_esc(celular || '')}" placeholder="(11) 99999-9999">
        </div>
        <div class="mob-field">
          <label class="mob-label">E-MAIL</label>
          <input id="memb-e-email" class="mob-input" type="email" inputmode="email"
                 value="${_esc(email || '')}" placeholder="nome@email.com">
        </div>
        <div class="mob-field">
          <label class="mob-label">DATA DE NASCIMENTO</label>
          <input id="memb-e-nasc" class="mob-input" type="date" value="${_esc(dataNasc || '')}">
        </div>
        <div id="memb-e-err" style="font-size:13px;color:var(--rose);min-height:16px"></div>
        <button id="memb-e-btn" class="mob-btn-primary"
                onclick="_membSalvarEdit('${pessoaId}','${membId}')">
          Salvar alterações
        </button>
      </div>
    `;
    document.body.appendChild(s);
  };

  window._membSalvarEdit = async function (pessoaId, membId) {
    const btn   = document.getElementById('memb-e-btn');
    const errEl = document.getElementById('memb-e-err');
    const cel   = (document.getElementById('memb-e-cel')?.value   || '').trim() || null;
    const email = (document.getElementById('memb-e-email')?.value  || '').trim() || null;
    const nasc  = (document.getElementById('memb-e-nasc')?.value   || '').trim() || null;
    const tipo  = (document.getElementById('memb-e-tipo')?.value   || '').trim() || null;
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
    try {
      const sb = getSupabase();
      const ops = [
        sb.from('pessoas').update({ celular: cel, email, data_nascimento: nasc }).eq('id', pessoaId),
      ];
      if (membId) {
        ops.push(sb.from('membros').update({ tipo_membro: tipo }).eq('id', membId));
      }
      const results = await Promise.all(ops);
      const err = results.find(r => r.error)?.error;
      if (err) throw err;
      document.getElementById('memb-edit-sheet')?.remove();
      mobToast('Dados atualizados');
      mobBack();
    } catch (e) {
      if (errEl) errEl.textContent = e.message || 'Erro ao salvar';
      if (btn) { btn.disabled = false; btn.textContent = 'Salvar alterações'; }
    }
  };

  /* ── Desligamento ───────────────────────────────────── */
  window._membAbrirDesligarSheet = function (membId, nome) {
    document.getElementById('memb-des-sheet')?.remove();
    const hoje = new Date().toISOString().split('T')[0];
    const s = document.createElement('div');
    s.id = 'memb-des-sheet';
    s.style.cssText = 'position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;justify-content:flex-end';
    s.innerHTML = `
      <div onclick="document.getElementById('memb-des-sheet')?.remove()"
           style="flex:1;background:rgba(0,0,0,.4)"></div>
      <div style="background:var(--bg-surface);border-radius:18px 18px 0 0;
                  padding:20px 16px;padding-bottom:calc(var(--safe-bottom) + 20px)">
        <div style="font-size:16px;font-weight:700;color:var(--rose);margin-bottom:4px;text-align:center">
          Registrar Desligamento
        </div>
        <div style="font-size:13px;color:var(--tx2);text-align:center;margin-bottom:16px">${_esc(nome)}</div>

        <div class="mob-field">
          <label class="mob-label">TIPO DE SAÍDA <span style="color:var(--rose)">*</span></label>
          <select id="des-tipo" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
            <option value="">Selecione</option>
            <option>Transferência</option>
            <option>Exclusão</option>
            <option>Falecimento</option>
            <option>Solicitação</option>
            <option>Jurisdição</option>
          </select>
        </div>

        <div class="mob-field">
          <label class="mob-label">DATA DE SAÍDA</label>
          <input id="des-data" class="mob-input" type="date" value="${hoje}">
        </div>

        <div id="des-err" style="font-size:13px;color:var(--rose);min-height:16px"></div>
        <button id="des-btn" class="mob-btn-primary"
                style="background:var(--rose)"
                onclick="_membConfirmarDesligamento('${membId}')">
          Confirmar Desligamento
        </button>
      </div>
    `;
    document.body.appendChild(s);
  };

  window._membConfirmarDesligamento = async function (membId) {
    const btn   = document.getElementById('des-btn');
    const errEl = document.getElementById('des-err');
    const tipoS = document.getElementById('des-tipo')?.value || '';
    const dataS = document.getElementById('des-data')?.value || null;

    if (errEl) errEl.textContent = '';
    if (!tipoS) { if (errEl) errEl.textContent = 'Selecione o tipo de saída.'; return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }

    try {
      const { error } = await getSupabase()
        .from('membros')
        .update({ status: 'INATIVO', tipo_saida: tipoS, data_saida: dataS })
        .eq('id', membId);
      if (error) throw error;
      document.getElementById('memb-des-sheet')?.remove();
      mobToast('Desligamento registrado');
      mobBack();
    } catch (e) {
      if (errEl) errEl.textContent = e.message || 'Erro ao registrar desligamento.';
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar Desligamento'; }
    }
  };

  /* ── Perfil ────────────────────────────────────────── */
  async function renderPerfil(el, params) {
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;
    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/v_membros?id=eq.${encodeURIComponent(params.id)}&select=*&limit=1`,
        { headers: apiHeaders() }
      );
      const [m] = await res.json();
      if (!m) throw new Error('não encontrado');

      const initials = (m.nome || '?').trim().split(/\s+/).map(n => n[0]).slice(0,2).join('').toUpperCase();

      el.innerHTML = `
        <div class="mob-detail">
          <div style="display:flex;flex-direction:column;align-items:center;padding:28px 16px 20px;background:var(--bg-surface);border-bottom:1px solid var(--bd1)">
            <div style="width:72px;height:72px;border-radius:50%;background:var(--gr);color:#fff;font-size:24px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-bottom:12px">
              ${initials}
            </div>
            <div style="font-size:20px;font-weight:700;color:var(--tx1);text-align:center">${_esc(m.nome)}</div>
            ${m.funcao ? `<div style="font-size:13px;color:var(--tx3);margin-top:4px">${_esc(m.funcao)}</div>` : ''}
          </div>

          ${m.celular || m.telefone || m.email ? `
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Contato</div>
            ${m.celular  ? _rowLink('Celular',    'tel:' + m.celular,  m.celular)  : ''}
            ${m.telefone ? _rowLink('Telefone',   'tel:' + m.telefone, m.telefone) : ''}
            ${m.email    ? _rowLink('E-mail', 'mailto:' + m.email,     m.email)    : ''}
          </div>` : ''}

          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Dados da Igreja</div>
            ${_row('Tipo', m.tipo_membro)}
            ${_row('Ingresso', m.tipo_ingresso)}
            ${_row('Data de ingresso', _fmtData(m.data_ingresso))}
            ${_row('Congregação', m.congregacao)}
            ${m.numero_registro ? _row('Reg.', m.numero_registro) : ''}
          </div>

          ${m.data_nascimento ? `
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Pessoal</div>
            ${_row('Nascimento', _fmtData(m.data_nascimento))}
          </div>` : ''}

          <div style="padding:0 16px 32px;display:flex;flex-direction:column;gap:10px">
            <button class="mob-btn-secondary"
                    onclick="_membAbrirEditForm('${m.pessoa_id}','${m.id}','${_esc(m.celular||'')}','${_esc(m.email||'')}','${_esc(m.data_nascimento||'')}','${_esc(m.tipo_membro||'')}')">
              Editar informações de contato
            </button>
            <button class="mob-btn-secondary"
                    style="border-color:rgba(224,85,85,.4);color:var(--rose)"
                    onclick="_membAbrirDesligarSheet('${m.id}','${_esc(m.nome)}')">
              Registrar Desligamento
            </button>
          </div>
        </div>
      `;
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Membro não encontrado.</div></div>`;
    }
  }

  /* ── Helpers ───────────────────────────────────────── */
  function _row(label, val) {
    if (!val) return '';
    return `
      <div class="mob-detail-row">
        <div class="mob-detail-row-key">${label}</div>
        <div class="mob-detail-row-val">${_esc(String(val))}</div>
      </div>
    `;
  }

  function _rowLink(label, href, text) {
    return `
      <div class="mob-detail-row">
        <div class="mob-detail-row-key">${label}</div>
        <a href="${href}" class="mob-detail-row-val" style="color:var(--blue);text-decoration:none">${_esc(text)}</a>
      </div>
    `;
  }

  function _isAnivHoje(dt) {
    if (!dt) return false;
    const hoje = new Date();
    const [, m, d] = dt.split('-');
    return Number(m) === hoje.getMonth()+1 && Number(d) === hoje.getDate();
  }

  function _fmtData(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
    );
  }

})();
