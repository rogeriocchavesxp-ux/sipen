/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Membros
   mobile/membros.js · v1.0.0
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('membros',     renderMembros);
  mobRegisterPage('memb-perfil', renderPerfil);

  let _cache = null;
  let _busca = '';

  /* ── Lista ─────────────────────────────────────────── */
  async function renderMembros(el) {
    _cache = null;
    el.innerHTML = `
      <div class="mob-search-wrap">
        <input class="mob-search" type="search" placeholder="Buscar membros…"
               value="${_esc(_busca)}"
               oninput="_membBusca(this.value)"
               onsearch="_membBusca(this.value)">
      </div>
      <div id="memb-lista" class="mob-section">
        <div class="mob-card-list mob-loading-state">Carregando…</div>
      </div>
    `;
    await _carregar();
  }

  async function _carregar() {
    const el = document.getElementById('memb-lista');
    if (!el) return;
    try {
      const res  = await fetch(
        `${apiBaseUrl()}/rest/v1/v_membros?select=id,nome,celular,email,funcao,congregacao,data_nascimento&order=nome.asc&limit=500`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      _cache = Array.isArray(data) ? data : [];
      _renderRows(el, _cache);
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar membros.</div></div>`;
    }
  }

  function _renderRows(el, data) {
    if (!data.length) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">👥</div><div class="mob-empty-text">Nenhum membro encontrado.</div></div>`;
      return;
    }

    // Agrupar por letra inicial
    const grupos = {};
    data.forEach(m => {
      const l = (m.nome || '?')[0].toUpperCase();
      if (!grupos[l]) grupos[l] = [];
      grupos[l].push(m);
    });

    el.innerHTML = Object.entries(grupos).map(([letra, lista]) => `
      <div class="mob-section-title" style="padding-top:16px">${letra}</div>
      <div class="mob-card-list">
        ${lista.map(m => _membRow(m)).join('')}
      </div>
    `).join('') + `<div style="padding:12px 0;text-align:center;font-size:11px;color:var(--tx4)">${data.length} membros</div>`;
  }

  function _membRow(m) {
    const initials = (m.nome || '?').trim().split(/\s+/).map(n => n[0]).slice(0,2).join('').toUpperCase();
    const aniv     = _isAnivHoje(m.data_nascimento);
    return `
      <div class="mob-list-item" onclick="mobGo('memb-perfil',{id:'${m.id}',title:'${_esc(m.nome)}'})">
        <div class="mob-list-ico" style="background:var(--bg-hover);color:var(--tx1);font-size:13px;font-weight:700;border-radius:50%">
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

  window._membBusca = function (val) {
    _busca = val;
    const el = document.getElementById('memb-lista');
    if (!el) return;
    if (!_cache) { _carregar(); return; }
    const q = val.toLowerCase();
    const r = q ? _cache.filter(m =>
      (m.nome      || '').toLowerCase().includes(q) ||
      (m.funcao    || '').toLowerCase().includes(q) ||
      (m.congregacao || '').toLowerCase().includes(q) ||
      (m.email     || '').toLowerCase().includes(q)
    ) : _cache;
    _renderRows(el, r);
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
