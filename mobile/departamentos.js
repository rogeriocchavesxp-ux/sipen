/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Departamentos
   mobile/departamentos.js · v1.0.0
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('departamentos', renderLista);
  mobRegisterPage('dep-detalhe',   renderDetalhe);

  /* ── Constantes ───────────────────────────────────── */
  const _ICONES = {
    MUSICA:'🎵', JOVENS:'🔥', INFANTIL:'👶', INTERCESSAO:'🙏',
    EVANGELISMO:'✝️', DIACONIA:'🤝', COMUNICACAO:'📢', ACOLHIMENTO:'🤗',
    ENSINO:'🎓', PASTORAL:'⛪', ADMINISTRACAO:'🏛', SOCIAL:'🤲',
  };
  const _CAT_LABEL = {
    'essencial':  { label:'Essencial',  cor:'var(--gr)',     bg:'rgba(48,209,88,.12)' },
    'importante': { label:'Importante', cor:'var(--blue)',   bg:'var(--bluebg)'       },
    'generico':   { label:'Ministério', cor:'var(--violet)', bg:'var(--violetbg)'     },
  };

  let _cache = null;

  /* ══════════════════════════════════════════════════
     LISTA
  ══════════════════════════════════════════════════ */
  async function renderLista(el) {
    _cache = null;
    el.innerHTML = `
      <div class="mob-search-wrap">
        <input class="mob-search" type="search" placeholder="Buscar departamentos…"
               oninput="_depBusca(this.value)"
               onsearch="_depBusca(this.value)">
      </div>
      <div id="dep-lista" class="mob-section" style="padding-bottom:24px">
        <div class="mob-card-list mob-loading-state">Carregando…</div>
      </div>
    `;
    await _carregar();
  }

  async function _carregar() {
    const el = document.getElementById('dep-lista');
    if (!el) return;
    try {
      const headers = { ...apiHeaders(), 'Prefer': 'count=exact' };
      const [rMin, rMem, rLid] = await Promise.all([
        fetch(`${apiBaseUrl()}/rest/v1/ministerios?ativo=eq.true&select=id,nome,descricao,tipo,categoria,modulo_rota&order=nome.asc`, { headers: apiHeaders() }),
        fetch(`${apiBaseUrl()}/rest/v1/nomeados?nivel=eq.membro&status=eq.ativo&deleted_at=is.null&select=ministerio_id`, { headers: apiHeaders() }),
        fetch(`${apiBaseUrl()}/rest/v1/nomeados?nivel=in.(supervisor,conselheiro,coordenador)&status=eq.ativo&deleted_at=is.null&select=ministerio_id,nivel,nome`, { headers: apiHeaders() }),
      ]);

      const lista = await rMin.json();
      if (!Array.isArray(lista) || !lista.length) {
        el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">📂</div><div class="mob-empty-text">Nenhum departamento encontrado.</div></div>`;
        return;
      }

      const memRows = rMem.ok ? await rMem.json() : [];
      const lidRows = rLid.ok ? await rLid.json() : [];

      // Contagem de membros por ministério
      const cntMem = {};
      (Array.isArray(memRows) ? memRows : []).forEach(r => {
        if (r.ministerio_id) cntMem[r.ministerio_id] = (cntMem[r.ministerio_id] || 0) + 1;
      });

      // Liderança principal por ministério (supervisor > coordenador > conselheiro)
      const lidMap = {};
      (Array.isArray(lidRows) ? lidRows : []).forEach(n => {
        if (!n.ministerio_id) return;
        const atual = lidMap[n.ministerio_id];
        const prioridade = { supervisor: 0, coordenador: 1, conselheiro: 2 };
        if (!atual || prioridade[n.nivel] < prioridade[atual.nivel]) {
          lidMap[n.ministerio_id] = n;
        }
      });

      _cache = lista.map(m => ({ ...m, _cnt: cntMem[m.id] || 0, _lider: lidMap[m.id] || null }));
      _renderRows(el, _cache);
    } catch (e) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar departamentos.</div></div>`;
    }
  }

  function _renderRows(el, lista) {
    if (!lista.length) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">🔍</div><div class="mob-empty-text">Nenhum resultado.</div></div>`;
      return;
    }

    // Agrupar: essenciais primeiro, depois importantes, depois genéricos
    const ordem = { essencial: 0, importante: 1, generico: 2 };
    const grupos = {};
    [...lista].sort((a, b) => (ordem[a.categoria] ?? 2) - (ordem[b.categoria] ?? 2) || a.nome.localeCompare(b.nome, 'pt-BR')).forEach(m => {
      const g = m.categoria || 'generico';
      if (!grupos[g]) grupos[g] = [];
      grupos[g].push(m);
    });

    el.innerHTML = Object.entries(grupos).map(([cat, itens]) => {
      const cfg = _CAT_LABEL[cat] || _CAT_LABEL['generico'];
      return `
        <div class="mob-section-title" style="margin-top:16px">${cfg.label}s</div>
        <div class="mob-card-list">
          ${itens.map(m => _rowMin(m)).join('')}
        </div>
      `;
    }).join('');
  }

  function _rowMin(m) {
    const ic  = _ICONES[(m.tipo || '').toUpperCase()] || '⭐';
    const cfg = _CAT_LABEL[m.categoria] || _CAT_LABEL['generico'];
    const sub = [
      m._lider ? m._lider.nome.split(' ').slice(0, 2).join(' ') : null,
      m._cnt ? `${m._cnt} membro${m._cnt !== 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' · ');

    return `
      <div class="mob-list-item" onclick="mobGo('dep-detalhe',{id:'${_esc(String(m.id))}',title:'${_esc(m.nome)}'})">
        <div class="mob-list-ico" style="background:${cfg.bg};color:${cfg.cor};font-size:20px">${ic}</div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(m.nome)}</div>
          ${sub ? `<div class="mob-list-sub">${_esc(sub)}</div>` : ''}
        </div>
        <div class="mob-list-chev">›</div>
      </div>
    `;
  }

  window._depBusca = function (val) {
    const el = document.getElementById('dep-lista');
    if (!el || !_cache) return;
    const q = val.trim().toLowerCase();
    const filtrado = q
      ? _cache.filter(m => m.nome.toLowerCase().includes(q) || (m.descricao || '').toLowerCase().includes(q))
      : _cache;
    _renderRows(el, filtrado);
  };

  /* ══════════════════════════════════════════════════
     DETALHE
  ══════════════════════════════════════════════════ */
  async function renderDetalhe(el, params) {
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;
    try {
      // Tenta usar cache da lista
      let m = (_cache || []).find(x => String(x.id) === String(params?.id));
      if (!m) {
        const res = await fetch(
          `${apiBaseUrl()}/rest/v1/ministerios?id=eq.${encodeURIComponent(params.id)}&select=id,nome,descricao,tipo,categoria,modulo_rota&limit=1`,
          { headers: apiHeaders() }
        );
        [m] = await res.json();
      }
      if (!m) throw new Error('não encontrado');

      const ic  = _ICONES[(m.tipo || '').toUpperCase()] || '⭐';
      const cfg = _CAT_LABEL[m.categoria] || _CAT_LABEL['generico'];

      // Carrega líderes e membros em paralelo
      const [rLid, rMem] = await Promise.all([
        fetch(`${apiBaseUrl()}/rest/v1/nomeados?ministerio_id=eq.${encodeURIComponent(m.id)}&nivel=in.(supervisor,conselheiro,coordenador)&status=eq.ativo&deleted_at=is.null&select=nivel,nome,cargo&order=nivel.asc`, { headers: apiHeaders() }),
        fetch(`${apiBaseUrl()}/rest/v1/nomeados?ministerio_id=eq.${encodeURIComponent(m.id)}&nivel=eq.membro&status=eq.ativo&deleted_at=is.null&select=nome&order=nome.asc&limit=60`, { headers: { ...apiHeaders(), 'Prefer': 'count=exact' } }),
      ]);

      const lideres = rLid.ok ? (await rLid.json()) : [];
      const membros = rMem.ok ? (await rMem.json()) : [];
      const cntMem  = rMem.ok ? _parseCount(rMem.headers.get('content-range')) : membros.length;

      const _nivelLabel = { supervisor: 'Supervisor', coordenador: 'Coordenador', conselheiro: 'Conselheiro' };

      el.innerHTML = `
        <div class="mob-detail">
          <div class="mob-detail-hero">
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
              <div style="width:52px;height:52px;border-radius:14px;background:${cfg.bg};
                          display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">
                ${ic}
              </div>
              <div>
                <div class="mob-detail-title">${_esc(m.nome)}</div>
                <div class="mob-detail-meta" style="margin-top:6px">
                  <span class="mob-badge" style="background:${cfg.bg};color:${cfg.cor}">${cfg.label}</span>
                  ${m.tipo ? `<span class="mob-badge" style="background:var(--bg-hover);color:var(--tx2)">${_esc(m.tipo.charAt(0) + m.tipo.slice(1).toLowerCase())}</span>` : ''}
                </div>
              </div>
            </div>
            ${m.descricao ? `<div style="font-size:14px;color:var(--tx2);line-height:1.6">${_esc(m.descricao)}</div>` : ''}
          </div>

          ${Array.isArray(lideres) && lideres.length ? `
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Liderança</div>
            ${lideres.map(l => `
              <div class="mob-detail-row">
                <div class="mob-detail-row-key">${_esc(_nivelLabel[l.nivel] || l.nivel || 'Líder')}</div>
                <div class="mob-detail-row-val">${_esc(l.nome)}${l.cargo ? `<br><span style="font-size:11px;color:var(--tx3)">${_esc(l.cargo)}</span>` : ''}</div>
              </div>
            `).join('')}
          </div>` : ''}

          <div class="mob-detail-card" style="padding-bottom:${membros.length ? '0' : '4px'}">
            <div class="mob-detail-card-title">Membros</div>
            <div class="mob-detail-row" style="border-bottom:${membros.length ? '1px solid var(--bd1)' : 'none'}">
              <div class="mob-detail-row-key">Total ativo</div>
              <div class="mob-detail-row-val" style="font-size:20px;font-weight:700;color:var(--tx1)">${cntMem}</div>
            </div>
            ${Array.isArray(membros) && membros.length ? `
            <div style="padding:8px 0">
              ${membros.map(mem => `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid var(--bd1)">
                  <div style="width:32px;height:32px;border-radius:50%;background:var(--violetbg);color:var(--violet);
                              font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    ${_initials(mem.nome)}
                  </div>
                  <div style="font-size:14px;color:var(--tx1)">${_esc(mem.nome)}</div>
                </div>
              `).join('')}
              ${Number(cntMem) > membros.length ? `
              <div style="padding:10px 16px;font-size:12px;color:var(--tx3);text-align:center">
                Exibindo ${membros.length} de ${cntMem} membros
              </div>` : ''}
            </div>` : ''}
          </div>
        </div>
      `;
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Departamento não encontrado.</div></div>`;
    }
  }

  /* ── Helpers ──────────────────────────────────────── */
  function _parseCount(cr) {
    if (!cr) return 0;
    const m = cr.match(/\/(\d+)$/);
    return m ? parseInt(m[1]) : 0;
  }

  function _initials(nome) {
    return (nome || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
    );
  }

})();
