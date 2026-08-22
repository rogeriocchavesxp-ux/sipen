/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Congregações
   mobile/congregacoes.js · v1.0.0
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('congregacoes-mob', renderLista);
  mobRegisterPage('cong-detalhe',     renderDetalhe);

  let _cache = null;

  /* ── Lista ─────────────────────────────────────────── */
  async function renderLista(el) {
    _cache = null;
    el.innerHTML = `
      <div class="mob-search-wrap">
        <input class="mob-search" type="search" placeholder="Buscar congregações…"
               oninput="_congBusca(this.value)"
               onsearch="_congBusca(this.value)">
      </div>
      <div id="cong-lista" class="mob-section">
        <div class="mob-loading-state">Carregando…</div>
      </div>
    `;
    await _carregar();
  }

  async function _carregar() {
    const el = document.getElementById('cong-lista');
    if (!el) return;
    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/congregacoes?deleted_at=is.null&select=id,nome,localizacao,status,cor,icon,membros_ativos,supervisao,coordenacao,pastor_responsavel&order=nome.asc`,
        { headers: apiHeaders() }
      );
      _cache = res.ok ? await res.json() : [];
      _renderRows(el, _cache);
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar congregações.</div></div>`;
    }
  }

  function _renderRows(el, data) {
    if (!data.length) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⛪</div><div class="mob-empty-text">Nenhuma congregação encontrada.</div></div>`;
      return;
    }
    const ativas   = data.filter(c => c.status === 'ativa');
    const inativas = data.filter(c => c.status !== 'ativa');

    let html = '';
    if (ativas.length) {
      html += `<div class="mob-section-title" style="padding-top:16px">Ativas (${ativas.length})</div>
               <div class="mob-card-list">${ativas.map(_row).join('')}</div>`;
    }
    if (inativas.length) {
      html += `<div class="mob-section-title" style="padding-top:16px">Inativas</div>
               <div class="mob-card-list">${inativas.map(_row).join('')}</div>`;
    }
    el.innerHTML = html;
  }

  function _row(c) {
    const cor  = c.cor  || '#30d158';
    const icon = c.icon || '⛪';
    const lider = c.supervisao || c.coordenacao || c.pastor_responsavel || '';
    const sub  = [lider ? lider.split(' ').slice(0,3).join(' ') : '', c.localizacao || ''].filter(Boolean).join(' · ');
    return `
      <div class="mob-list-item" onclick="mobGo('cong-detalhe',{id:'${_esc(String(c.id))}',title:'${_esc(c.nome)}'})">
        <div class="mob-list-ico" style="background:${cor}22;color:${cor};font-size:20px;border-radius:12px">${_esc(icon)}</div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(c.nome)}</div>
          ${sub ? `<div class="mob-list-sub">${_esc(sub)}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
          ${c.membros_ativos ? `<div style="font-size:13px;font-weight:700;color:var(--tx1)">${c.membros_ativos}</div><div style="font-size:10px;color:var(--tx3)">membros</div>` : ''}
          ${c.status !== 'ativa' ? `<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:8px;background:var(--bg-hover);color:var(--tx3)">Inativa</span>` : ''}
        </div>
      </div>
    `;
  }

  window._congBusca = function (val) {
    const el = document.getElementById('cong-lista');
    if (!el || !_cache) return;
    const q = val.trim().toLowerCase();
    const r = q ? _cache.filter(c =>
      (c.nome        || '').toLowerCase().includes(q) ||
      (c.localizacao || '').toLowerCase().includes(q) ||
      (c.supervisao  || '').toLowerCase().includes(q)
    ) : _cache;
    _renderRows(el, r);
  };

  /* ── Detalhe ───────────────────────────────────────── */
  async function renderDetalhe(el, params) {
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;
    try {
      const [rCong, rCultos, rNomeados] = await Promise.all([
        fetch(
          `${apiBaseUrl()}/rest/v1/congregacoes?id=eq.${encodeURIComponent(params.id)}&deleted_at=is.null&select=*&limit=1`,
          { headers: apiHeaders() }
        ),
        fetch(
          `${apiBaseUrl()}/rest/v1/congregacao_cultos?congregacao_id=eq.${encodeURIComponent(params.id)}&order=data.desc&limit=5`,
          { headers: apiHeaders() }
        ),
        fetch(
          `${apiBaseUrl()}/rest/v1/nomeados?orgao_tipo=eq.congregacao&deleted_at=is.null&status=eq.ativo&select=nome,cargo,funcao_lider&order=funcao_lider.asc`,
          { headers: apiHeaders() }
        ),
      ]);

      const [c]     = rCong.ok   ? await rCong.json()     : [];
      const cultos  = rCultos.ok ? await rCultos.json()   : [];
      const nomeados = rNomeados.ok ? await rNomeados.json() : [];
      if (!c) throw new Error('não encontrada');

      const cor  = c.cor  || '#30d158';
      const icon = c.icon || '⛪';

      const lideranca = [
        ['Supervisor',  c.supervisao],
        ['Conselheiro', c.conselheiro],
        ['Coordenação', c.coordenacao],
        ['Tesoureiro',  c.tesoureiro],
        ['Pastor',      c.pastor_responsavel],
      ].filter(([, v]) => v);

      // complementar com nomeados se liderança estiver vazia
      const lidRows = lideranca.length ? lideranca :
        nomeados.map(n => [n.cargo || n.funcao_lider || 'Líder', n.nome]);

      el.innerHTML = `
        <div class="mob-detail">
          <!-- Hero -->
          <div style="display:flex;align-items:center;gap:14px;padding:20px 16px;background:var(--bg-surface);border-bottom:1px solid var(--bd1)">
            <div style="width:56px;height:56px;border-radius:14px;background:${cor}22;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">
              ${_esc(icon)}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:18px;font-weight:700;color:var(--tx1)">${_esc(c.nome)}</div>
              ${c.localizacao ? `<div style="font-size:13px;color:var(--tx3);margin-top:2px">${_esc(c.localizacao)}</div>` : ''}
              <span style="display:inline-block;margin-top:6px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:8px;
                           background:${c.status === 'ativa' ? 'rgba(48,209,88,.15)' : 'var(--bg-hover)'};
                           color:${c.status === 'ativa' ? 'var(--gr)' : 'var(--tx3)'}">
                ${c.status === 'ativa' ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </div>

          <!-- KPIs -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--bd1);margin-bottom:8px">
            ${_kpi(c.membros_ativos || 0, 'Membros ativos')}
            ${_kpi(c.membros_cooperadores || 0, 'Cooperadores')}
            ${_kpi(c.cultos_por_semana || '—', 'Cultos/semana')}
          </div>

          <!-- Liderança -->
          ${lidRows.length ? `
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Liderança</div>
            ${lidRows.map(([label, nome]) => `
              <div class="mob-detail-row">
                <div class="mob-detail-row-key">${_esc(label)}</div>
                <div class="mob-detail-row-val">${_esc(nome)}</div>
              </div>
            `).join('')}
          </div>` : ''}

          <!-- Cultos recentes -->
          ${cultos.length ? `
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Cultos Recentes</div>
            ${cultos.map(cu => {
              const total = cu.participantes || ((cu.adultos || 0) + (cu.criancas || 0));
              const [y, m, d] = (cu.data || '').split('-');
              const data = d ? `${d}/${m}/${y}` : '—';
              return `
                <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--bd1)">
                  <div style="width:40px;text-align:center;flex-shrink:0">
                    <div style="font-size:16px;font-weight:700;color:var(--tx1)">${total}</div>
                    <div style="font-size:10px;color:var(--tx3)">presentes</div>
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13px;font-weight:500;color:var(--tx1)">${_esc(cu.tipo || 'Culto')}</div>
                    <div style="font-size:11px;color:var(--tx3)">${data}${cu.pregador ? ' · ' + _esc(cu.pregador.split(' ').slice(0,2).join(' ')) : ''}</div>
                  </div>
                  ${(cu.visitantes || 0) > 0 ? `<div style="font-size:11px;color:var(--amber);font-weight:600">${cu.visitantes} vis.</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>` : ''}

          <!-- Grupos e Ministérios -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--bd1);margin-bottom:8px">
            ${_kpi2(c.pequenos_grupos_total || 0, 'Pequenos Grupos')}
            ${_kpi2(c.ministerios_total    || 0, 'Ministérios')}
          </div>
        </div>
      `;
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Congregação não encontrada.</div></div>`;
    }
  }

  /* ── Helpers ───────────────────────────────────────── */
  function _kpi(val, label) {
    return `
      <div style="background:var(--bg-surface);padding:14px 12px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:var(--tx1)">${val}</div>
        <div style="font-size:10px;color:var(--tx3);margin-top:2px">${label}</div>
      </div>`;
  }

  function _kpi2(val, label) {
    return `
      <div style="background:var(--bg-surface);padding:12px;text-align:center">
        <div style="font-size:18px;font-weight:700;color:var(--tx2)">${val}</div>
        <div style="font-size:10px;color:var(--tx3);margin-top:2px">${label}</div>
      </div>`;
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
    );
  }

})();
