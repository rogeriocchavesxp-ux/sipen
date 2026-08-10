/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Demandas
   mobile/demandas.js · v1.0.0
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('demandas',    renderLista);
  mobRegisterPage('dem-detalhe', renderDetalhe);

  const STATUS_COR = {
    'Em Análise':   { bg:'rgba(212,166,67,.12)',  cl:'var(--gold)'   },
    'Em Andamento': { bg:'rgba(191,90,242,.12)',  cl:'var(--violet)' },
    'Aguardando Pagamento': { bg:'rgba(255,159,10,.12)', cl:'var(--amber)'  },
    'Pagamento Agendado':   { bg:'rgba(10,132,255,.12)', cl:'var(--blue)'   },
    'Concluída':    { bg:'rgba(48,209,88,.12)',   cl:'var(--gr)'     },
    'Pago':         { bg:'rgba(48,209,88,.12)',   cl:'var(--gr)'     },
    'Cancelada':    { bg:'rgba(90,96,104,.15)',   cl:'var(--tx3)'    },
    'Pendente':     { bg:'rgba(255,159,10,.12)',  cl:'var(--amber)'  },
  };

  const _FECHADAS_SET = new Set(['concluída','concluida','cancelada','cancelado','pago','paga']);
  const _isFechada = st => _FECHADAS_SET.has((st||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''));

  const FILTROS = [
    { key:'abertas',     label:'Abertas',     query:'', clientFilter: d => !_isFechada(d.status) },
    { key:'analise',     label:'Em Análise',  query:'status=eq.Em%20An%C3%A1lise' },
    { key:'andamento',   label:'Andamento',   query:'status=eq.Em%20Andamento' },
    { key:'concluidas',  label:'Concluídas',  query:'', clientFilter: d => _isFechada(d.status) },
    { key:'todas',       label:'Todas',       query:'' },
  ];

  let _filtroAtivo = 'abertas';
  let _busca       = '';
  let _cache       = null;

  /* ── Lista ─────────────────────────────────────────── */
  async function renderLista(el) {
    _cache = null;
    el.innerHTML = `
      <div class="mob-search-wrap">
        <input class="mob-search" type="search" placeholder="Buscar demandas…"
               value="${_esc(_busca)}"
               oninput="_demBusca(this.value)"
               onsearch="_demBusca(this.value)">
      </div>
      <div class="mob-chips" id="dem-chips">
        ${FILTROS.map(f => `
          <button class="mob-chip ${f.key===_filtroAtivo?'active':''}"
                  onclick="_demFiltro('${f.key}')">${f.label}</button>
        `).join('')}
      </div>
      <div id="dem-lista" class="mob-section">
        <div class="mob-card-list mob-loading-state">Carregando…</div>
      </div>
    `;
    await _carregarLista();
  }

  async function _carregarLista() {
    const el = document.getElementById('dem-lista');
    if (!el) return;

    const f = FILTROS.find(x => x.key === _filtroAtivo) || FILTROS[0];
    let url  = `${apiBaseUrl()}/rest/v1/demandas?${f.query}&select=id,titulo,status,area,prioridade,solicitante,criado_em&order=criado_em.desc&limit=60`;
    if (f.query) url += '&';
    else url += '?';
    // trim trailing ?/&
    url = url.replace(/[?&]$/, '');

    // rebuild cleanly
    const params = [];
    if (f.query) params.push(f.query);
    params.push('select=id,titulo,status,area,prioridade,solicitante,criado_em');
    params.push('order=criado_em.desc');
    params.push('limit=60');

    try {
      const res  = await fetch(
        `${apiBaseUrl()}/rest/v1/demandas?${params.join('&')}`,
        { headers: apiHeaders() }
      );
      let data = await res.json();
      if (!Array.isArray(data)) data = [];

      if (f.clientFilter) data = data.filter(f.clientFilter);

      if (_busca) {
        const q = _busca.toLowerCase();
        data = data.filter(d =>
          (d.titulo || '').toLowerCase().includes(q) ||
          (d.area   || '').toLowerCase().includes(q) ||
          (d.solicitante || '').toLowerCase().includes(q)
        );
      }

      _cache = data;
      _renderRows(el, data);
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar demandas.</div></div>`;
    }
  }

  function _renderRows(el, data) {
    if (!data.length) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">✅</div><div class="mob-empty-text">Nenhuma demanda encontrada.</div></div>`;
      return;
    }
    el.innerHTML = `
      <div class="mob-card-list">
        ${data.map(d => _rowHtml(d)).join('')}
      </div>
      <div style="padding:12px 0 8px;text-align:center;font-size:11px;color:var(--tx4)">${data.length} demanda${data.length !== 1 ? 's' : ''}</div>
    `;
  }

  function _rowHtml(d) {
    const sc = STATUS_COR[d.status] || { bg:'var(--bg-hover)', cl:'var(--tx3)' };
    const pr = d.prioridade === 'Urgente' || d.prioridade === 'Alta' ? `<span style="color:var(--rose);font-size:10px;font-weight:700"> ●</span>` : '';
    return `
      <div class="mob-list-item" onclick="mobGo('dem-detalhe',{id:'${d.id}',title:'${_esc(d.titulo||'Demanda')}'})">
        <div class="mob-list-ico" style="background:${sc.bg};color:${sc.cl}">
          ${_catEmoji(d.area)}
        </div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(d.titulo || 'Sem título')}${pr}</div>
          <div class="mob-list-sub">${d.area ? _esc(d.area) + ' · ' : ''}${_statusBadge(d.status)}</div>
        </div>
        <div class="mob-list-chev">›</div>
      </div>
    `;
  }

  window._demFiltro = function (key) {
    _filtroAtivo = key;
    document.querySelectorAll('#dem-chips .mob-chip').forEach(c => {
      c.classList.toggle('active', c.textContent.trim() === (FILTROS.find(f=>f.key===key)?.label));
    });
    _carregarLista();
  };

  window._demBusca = function (val) {
    _busca = val;
    if (_cache) {
      const q    = val.toLowerCase();
      const data = q ? _cache.filter(d =>
        (d.titulo||'').toLowerCase().includes(q) ||
        (d.area  ||'').toLowerCase().includes(q) ||
        (d.solicitante||'').toLowerCase().includes(q)
      ) : _cache;
      _renderRows(document.getElementById('dem-lista'), data);
    } else {
      _carregarLista();
    }
  };

  /* ── Detalhe ───────────────────────────────────────── */
  async function renderDetalhe(el, params) {
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;
    try {
      const res  = await fetch(
        `${apiBaseUrl()}/rest/v1/demandas?id=eq.${encodeURIComponent(params.id)}&select=*&limit=1`,
        { headers: apiHeaders() }
      );
      const [d] = await res.json();
      if (!d) throw new Error('não encontrado');

      const sc  = STATUS_COR[d.status] || { bg:'var(--bg-hover)', cl:'var(--tx3)' };

      el.innerHTML = `
        <div class="mob-detail">
          <div class="mob-detail-hero">
            <div class="mob-detail-title">${_esc(d.titulo || 'Sem título')}</div>
            <div class="mob-detail-meta">
              ${_statusBadgeEl(d.status)}
              ${d.prioridade ? `<span class="mob-badge" style="background:var(--rosebg);color:var(--rose)">${_esc(d.prioridade)}</span>` : ''}
            </div>
          </div>

          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Informações</div>
            ${_row('Área', d.area)}
            ${_row('Subcategoria', d.subcategoria)}
            ${_row('Solicitante', d.solicitante)}
            ${_row('Responsável', d.responsavel)}
            ${_row('Abertura', _fmtTs(d.criado_em))}
            ${d.data_conclusao ? _row('Conclusão', _fmtTs(d.data_conclusao)) : ''}
          </div>

          ${d.descricao ? `
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Descrição</div>
            <div style="padding:14px 16px;font-size:14px;color:var(--tx2);line-height:1.6">${_esc(d.descricao)}</div>
          </div>` : ''}

          ${d.observacoes ? `
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Observações</div>
            <div style="padding:14px 16px;font-size:14px;color:var(--tx2);line-height:1.6">${_esc(d.observacoes)}</div>
          </div>` : ''}
        </div>
      `;
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Demanda não encontrada.</div></div>`;
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

  function _statusBadge(s) {
    const sc = STATUS_COR[s] || { bg:'var(--bg-hover)', cl:'var(--tx3)' };
    return `<span style="color:${sc.cl}">${_esc(s || '—')}</span>`;
  }

  function _statusBadgeEl(s) {
    const sc = STATUS_COR[s] || { bg:'var(--bg-hover)', cl:'var(--tx3)' };
    return `<span class="mob-badge" style="background:${sc.bg};color:${sc.cl}">${_esc(s || '—')}</span>`;
  }

  function _catEmoji(area) {
    const map = {
      'Financeiro':'💰','Manutenção':'🛠','Comunicação e Divulgação':'📢',
      'Secretaria':'📄','Agendamentos':'📅','Cadastro':'👥',
      'Oração e Aconselhamento':'🙏','Visitação':'🏠','Apoio ao Culto':'🎶',
      'Ensino (EBT)':'🎓','Ação Social / Hebron':'🤝','Administrativo Geral':'🧾',
      'Logística':'🚚','Limpeza e Organização':'🧹','Conselho':'🏛',
      'Eventos':'🎉',
    };
    return map[area] || '📋';
  }

  function _fmtTs(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' })
         + ' ' + d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
    );
  }

})();
