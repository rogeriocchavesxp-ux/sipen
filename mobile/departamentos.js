/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Departamentos
   mobile/departamentos.js · v1.1.0
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
  const _CAT_CFG = {
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
      <div id="dep-lista" style="padding-bottom:24px">
        <div class="mob-loading-state">Carregando…</div>
      </div>
    `;
    await _carregar();
  }

  async function _carregar() {
    const el = document.getElementById('dep-lista');
    if (!el) return;
    try {
      const h = apiHeaders();
      const [rMin, rSoc, rMemMin, rLidMin, rLidSoc] = await Promise.all([
        fetch(`${apiBaseUrl()}/rest/v1/ministerios?ativo=eq.true&select=id,nome,descricao,tipo,categoria&order=nome.asc`, { headers: h }),
        fetch(`${apiBaseUrl()}/rest/v1/sociedades?ativo=eq.true&select=id,nome,sigla,orgao,ic,descricao&order=nome.asc`, { headers: h }),
        fetch(`${apiBaseUrl()}/rest/v1/nomeados?nivel=eq.membro&status=eq.ativo&deleted_at=is.null&select=ministerio_id`, { headers: h }),
        fetch(`${apiBaseUrl()}/rest/v1/nomeados?nivel=in.(supervisor,coordenador,conselheiro)&status=eq.ativo&deleted_at=is.null&select=ministerio_id,nivel,nome`, { headers: h }),
        fetch(`${apiBaseUrl()}/rest/v1/nomeados?orgao_tipo=eq.sociedade&status=eq.ativo&deleted_at=is.null&select=orgao,nome,cargo,tipo_nomeacao&order=tipo_nomeacao.asc`, { headers: h }),
      ]);

      const ministerios = rMin.ok ? await rMin.json() : [];
      const sociedades  = rSoc.ok ? await rSoc.json() : [];
      const memRows     = rMemMin.ok ? await rMemMin.json() : [];
      const lidMinRows  = rLidMin.ok ? await rLidMin.json() : [];
      const lidSocRows  = rLidSoc.ok ? await rLidSoc.json() : [];

      // Contagem de membros por ministério
      const cntMem = {};
      (Array.isArray(memRows) ? memRows : []).forEach(r => {
        if (r.ministerio_id) cntMem[r.ministerio_id] = (cntMem[r.ministerio_id] || 0) + 1;
      });

      // Líder principal por ministério (supervisor > coordenador > conselheiro)
      const _prio = { supervisor: 0, coordenador: 1, conselheiro: 2 };
      const lidMin = {};
      (Array.isArray(lidMinRows) ? lidMinRows : []).forEach(n => {
        if (!n.ministerio_id) return;
        const atual = lidMin[n.ministerio_id];
        if (!atual || (_prio[n.nivel] ?? 9) < (_prio[atual.nivel] ?? 9)) lidMin[n.ministerio_id] = n;
      });

      // Líder principal por sociedade (por orgao)
      const lidSoc = {};
      (Array.isArray(lidSocRows) ? lidSocRows : []).forEach(n => {
        if (!n.orgao || lidSoc[n.orgao]) return;
        lidSoc[n.orgao] = n;
      });

      _cache = {
        ministerios: (Array.isArray(ministerios) ? ministerios : []).map(m => ({
          ...m, _src:'min', _cnt: cntMem[m.id] || 0, _lider: lidMin[m.id] || null,
        })),
        sociedades: (Array.isArray(sociedades) ? sociedades : []).map(s => ({
          ...s, _src:'soc', _lider: lidSoc[s.orgao] || null,
        })),
      };

      _renderTudo(el, _cache);
    } catch (e) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar departamentos.</div></div>`;
    }
  }

  function _renderTudo(el, dados, busca) {
    const q = (busca || '').toLowerCase();

    const filtrarMin = dados.ministerios.filter(m =>
      !q || m.nome.toLowerCase().includes(q) || (m.descricao || '').toLowerCase().includes(q)
    );
    const filtrarSoc = dados.sociedades.filter(s =>
      !q || s.nome.toLowerCase().includes(q) || (s.sigla || '').toLowerCase().includes(q) || (s.descricao || '').toLowerCase().includes(q)
    );

    if (!filtrarMin.length && !filtrarSoc.length) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">🔍</div><div class="mob-empty-text">Nenhum resultado.</div></div>`;
      return;
    }

    // Agrupa ministérios por categoria
    const ordemCat = { essencial: 0, importante: 1, generico: 2 };
    const grupos = {};
    [...filtrarMin].sort((a, b) =>
      (ordemCat[a.categoria] ?? 2) - (ordemCat[b.categoria] ?? 2) || a.nome.localeCompare(b.nome, 'pt-BR')
    ).forEach(m => {
      const g = m.categoria || 'generico';
      if (!grupos[g]) grupos[g] = [];
      grupos[g].push(m);
    });

    let html = '';

    // Seções de ministérios
    html += Object.entries(grupos).map(([cat, itens]) => {
      const cfg = _CAT_CFG[cat] || _CAT_CFG['generico'];
      return `
        <div class="mob-section">
          <div class="mob-section-title">${cfg.label}s</div>
          <div class="mob-card-list">
            ${itens.map(m => _rowMin(m)).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Seção de Sociedades Internas
    if (filtrarSoc.length) {
      html += `
        <div class="mob-section">
          <div class="mob-section-title">Sociedades Internas</div>
          <div class="mob-card-list">
            ${filtrarSoc.map(s => _rowSoc(s)).join('')}
          </div>
        </div>
      `;
    }

    el.innerHTML = html;
  }

  function _rowMin(m) {
    const ic  = _ICONES[(m.tipo || '').toUpperCase()] || '⭐';
    const cfg = _CAT_CFG[m.categoria] || _CAT_CFG['generico'];
    const sub = [
      m._lider ? m._lider.nome.split(' ').slice(0, 2).join(' ') : null,
      m._cnt   ? `${m._cnt} membro${m._cnt !== 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' · ');

    return `
      <div class="mob-list-item" onclick="mobGo('dep-detalhe',{id:'${_esc(String(m.id))}',title:'${_esc(m.nome)}',_src:'min'})">
        <div class="mob-list-ico" style="background:${cfg.bg};color:${cfg.cor};font-size:20px">${ic}</div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(m.nome)}</div>
          ${sub ? `<div class="mob-list-sub">${_esc(sub)}</div>` : ''}
        </div>
        <div class="mob-list-chev">›</div>
      </div>
    `;
  }

  function _rowSoc(s) {
    const sub = s._lider ? s._lider.nome.split(' ').slice(0, 2).join(' ') : null;
    return `
      <div class="mob-list-item" onclick="mobGo('dep-detalhe',{id:'${_esc(String(s.id))}',title:'${_esc(s.nome)}',_src:'soc',_orgao:'${_esc(s.orgao)}'})">
        <div class="mob-list-ico" style="background:rgba(10,132,255,.1);color:var(--blue);font-size:20px">${_esc(s.ic || '🏛')}</div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(s.nome)}${s.sigla ? ` <span style="font-size:11px;color:var(--tx3);font-weight:500">(${_esc(s.sigla)})</span>` : ''}</div>
          ${sub ? `<div class="mob-list-sub">${_esc(sub)}</div>` : ''}
        </div>
        <div class="mob-list-chev">›</div>
      </div>
    `;
  }

  window._depBusca = function (val) {
    const el = document.getElementById('dep-lista');
    if (!el || !_cache) return;
    _renderTudo(el, _cache, val.trim());
  };

  /* ══════════════════════════════════════════════════
     DETALHE
  ══════════════════════════════════════════════════ */
  async function renderDetalhe(el, params) {
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;
    try {
      if (params?._src === 'soc') {
        await _renderDetalheSoc(el, params);
      } else {
        await _renderDetalheMin(el, params);
      }
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Não encontrado.</div></div>`;
    }
  }

  /* ── Detalhe de Ministério ──────────────────────── */
  async function _renderDetalheMin(el, params) {
    let m = (_cache?.ministerios || []).find(x => String(x.id) === String(params?.id));
    if (!m) {
      const [d] = await fetch(
        `${apiBaseUrl()}/rest/v1/ministerios?id=eq.${encodeURIComponent(params.id)}&select=id,nome,descricao,tipo,categoria&limit=1`,
        { headers: apiHeaders() }
      ).then(r => r.json());
      m = d;
    }
    if (!m) throw new Error('não encontrado');

    const ic  = _ICONES[(m.tipo || '').toUpperCase()] || '⭐';
    const cfg = _CAT_CFG[m.categoria] || _CAT_CFG['generico'];

    const [rLid, rMem] = await Promise.all([
      fetch(`${apiBaseUrl()}/rest/v1/nomeados?ministerio_id=eq.${encodeURIComponent(m.id)}&nivel=in.(supervisor,coordenador,conselheiro)&status=eq.ativo&deleted_at=is.null&select=nivel,nome,cargo&order=nivel.asc`, { headers: apiHeaders() }),
      fetch(`${apiBaseUrl()}/rest/v1/nomeados?ministerio_id=eq.${encodeURIComponent(m.id)}&nivel=eq.membro&status=eq.ativo&deleted_at=is.null&select=nome&order=nome.asc&limit=60`, { headers: { ...apiHeaders(), 'Prefer':'count=exact' } }),
    ]);

    const lideres = rLid.ok ? await rLid.json() : [];
    const membros = rMem.ok ? await rMem.json() : [];
    const cntMem  = _parseCount(rMem.headers?.get('content-range')) || membros.length;

    el.innerHTML = _htmlDetalhe({
      ic, nome: m.nome, descricao: m.descricao,
      badge1: { label: cfg.label, cor: cfg.cor, bg: cfg.bg },
      badge2: m.tipo ? { label: m.tipo.charAt(0) + m.tipo.slice(1).toLowerCase(), cor:'var(--tx2)', bg:'var(--bg-hover)' } : null,
      lideres, membros, cntMem,
      nivelLabel: { supervisor:'Supervisor', coordenador:'Coordenador', conselheiro:'Conselheiro' },
    });
  }

  /* ── Detalhe de Sociedade ───────────────────────── */
  async function _renderDetalheSoc(el, params) {
    let s = (_cache?.sociedades || []).find(x => String(x.id) === String(params?.id));
    if (!s) {
      const [d] = await fetch(
        `${apiBaseUrl()}/rest/v1/sociedades?id=eq.${encodeURIComponent(params.id)}&select=id,nome,sigla,orgao,ic,descricao&limit=1`,
        { headers: apiHeaders() }
      ).then(r => r.json());
      s = d;
    }
    if (!s) throw new Error('não encontrado');

    const orgao = params._orgao || s.orgao;
    const rLid  = await fetch(
      `${apiBaseUrl()}/rest/v1/nomeados?orgao_tipo=eq.sociedade&orgao=eq.${encodeURIComponent(orgao)}&status=eq.ativo&deleted_at=is.null&select=nome,cargo,tipo_nomeacao&order=tipo_nomeacao.asc,nome.asc`,
      { headers: apiHeaders() }
    );
    const lideres = rLid.ok ? await rLid.json() : [];

    el.innerHTML = _htmlDetalhe({
      ic: s.ic || '🏛',
      nome: s.nome + (s.sigla ? ` (${s.sigla})` : ''),
      descricao: s.descricao,
      badge1: { label:'Sociedade Interna', cor:'var(--blue)', bg:'rgba(10,132,255,.1)' },
      badge2: null,
      lideres: lideres.map(l => ({ nivel: l.tipo_nomeacao, nome: l.nome, cargo: l.cargo })),
      membros: [], cntMem: 0,
      nivelLabel: { lider:'Líder', diretoria:'Diretoria' },
    });
  }

  /* ── Template de detalhe compartilhado ─────────── */
  function _htmlDetalhe({ ic, nome, descricao, badge1, badge2, lideres, membros, cntMem, nivelLabel }) {
    return `
      <div class="mob-detail">
        <div class="mob-detail-hero">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
            <div style="width:52px;height:52px;border-radius:14px;background:${badge1.bg};
                        display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">
              ${_esc(ic)}
            </div>
            <div>
              <div class="mob-detail-title">${_esc(nome)}</div>
              <div class="mob-detail-meta" style="margin-top:6px">
                <span class="mob-badge" style="background:${badge1.bg};color:${badge1.cor}">${badge1.label}</span>
                ${badge2 ? `<span class="mob-badge" style="background:${badge2.bg};color:${badge2.cor}">${_esc(badge2.label)}</span>` : ''}
              </div>
            </div>
          </div>
          ${descricao ? `<div style="font-size:14px;color:var(--tx2);line-height:1.6">${_esc(descricao)}</div>` : ''}
        </div>

        ${Array.isArray(lideres) && lideres.length ? `
        <div class="mob-detail-card">
          <div class="mob-detail-card-title">Liderança</div>
          ${lideres.map(l => `
            <div class="mob-detail-row">
              <div class="mob-detail-row-key">${_esc(nivelLabel[l.nivel] || l.nivel || 'Líder')}</div>
              <div class="mob-detail-row-val">${_esc(l.nome)}${l.cargo ? `<br><span style="font-size:11px;color:var(--tx3)">${_esc(l.cargo)}</span>` : ''}</div>
            </div>
          `).join('')}
        </div>` : ''}

        ${cntMem > 0 ? `
        <div class="mob-detail-card">
          <div class="mob-detail-card-title">Membros</div>
          <div class="mob-detail-row" style="border-bottom:${Array.isArray(membros) && membros.length ? '1px solid var(--bd1)' : 'none'}">
            <div class="mob-detail-row-key">Total ativo</div>
            <div class="mob-detail-row-val" style="font-size:20px;font-weight:700;color:var(--tx1)">${cntMem}</div>
          </div>
          ${Array.isArray(membros) && membros.length ? `
          <div style="padding:4px 0">
            ${membros.map(mem => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid var(--bd1)">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--violetbg);color:var(--violet);
                            font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  ${_initials(mem.nome)}
                </div>
                <div style="font-size:14px;color:var(--tx1)">${_esc(mem.nome)}</div>
              </div>
            `).join('')}
            ${cntMem > membros.length ? `
            <div style="padding:10px 16px;font-size:12px;color:var(--tx3);text-align:center">
              Exibindo ${membros.length} de ${cntMem} membros
            </div>` : ''}
          </div>` : ''}
        </div>` : ''}
      </div>
    `;
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
