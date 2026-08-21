/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Membros
   mobile/membros.js · v1.1.0
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('membros',     renderMembros);
  mobRegisterPage('memb-perfil', renderPerfil);

  const PAGE_SIZE = 50;

  let _busca     = '';
  let _offset    = 0;
  let _hasMore   = false;
  let _loading   = false;
  let _observer  = null;

  /* ── Lista ─────────────────────────────────────────── */
  async function renderMembros(el) {
    _offset  = 0;
    _hasMore = false;
    _loading = false;
    if (_observer) { _observer.disconnect(); _observer = null; }

    el.innerHTML = `
      <div class="mob-search-wrap">
        <input class="mob-search" type="search" placeholder="Buscar membros…"
               value="${_esc(_busca)}"
               oninput="_membBusca(this.value)"
               onsearch="_membBusca(this.value)">
      </div>
      <div id="memb-lista" class="mob-section"></div>
      <div id="memb-sentinel" style="height:1px"></div>
    `;
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
