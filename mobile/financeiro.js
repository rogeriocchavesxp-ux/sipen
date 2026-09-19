/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Financeiro
   mobile/financeiro.js · v1.4.1
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('financeiro',      renderHub);
  mobRegisterPage('fin-demandas',    renderDemandas);
  mobRegisterPage('fin-dem-detalhe', renderDemDetalhe);
  mobRegisterPage('fin-pagar',       renderPagar);
  mobRegisterPage('fin-pagar-det',   renderPagarDetalhe);
  mobRegisterPage('fin-lancamentos', renderLancamentos);
  mobRegisterPage('fin-fluxo',       renderFluxo);

  /* ── Constantes ──────────────────────────────────── */
  const _FECHADAS = new Set(['Pago','Concluída','Cancelada','Cancelado','PAGO','CONCLUIDA','CANCELADA','CANCELADO']);

  const _ST_CFG = {
    'Pendente':             { cor:'var(--amber)',  bg:'rgba(234,179,8,.12)'   },
    'Em Análise':           { cor:'var(--gold)',   bg:'rgba(212,168,67,.12)'  },
    'Em Andamento':         { cor:'var(--violet)', bg:'rgba(139,111,212,.12)' },
    'Aguardando Pagamento': { cor:'var(--amber)',  bg:'rgba(234,179,8,.12)'   },
    'Pagamento Agendado':   { cor:'var(--blue)',   bg:'rgba(10,132,255,.12)'  },
    'Pago':                 { cor:'var(--gr)',     bg:'rgba(48,209,88,.12)'   },
    'Concluída':            { cor:'var(--gr)',     bg:'rgba(48,209,88,.12)'   },
    'Cancelada':            { cor:'var(--tx3)',    bg:'rgba(90,96,104,.15)'   },
    'Cancelado':            { cor:'var(--tx3)',    bg:'rgba(90,96,104,.15)'   },
  };

  const _ST_ENUM = {
    'Pendente':             'PENDENTE',
    'Em Análise':           'EM_ANALISE',
    'Em Andamento':         'EM_ANDAMENTO',
    'Aguardando Pagamento': 'AGUARDANDO_PAGAMENTO',
    'Pagamento Agendado':   'PAGAMENTO_AGENDADO',
    'Pago':                 'PAGO',
    'Concluída':            'CONCLUIDA',
    'Cancelada':            'CANCELADA',
    'Cancelado':            'CANCELADO',
  };

  const _ST_TRANSITIONS = {
    'Pendente':             ['Em Análise','Em Andamento','Cancelada'],
    'Em Análise':           ['Em Andamento','Aguardando Pagamento','Cancelada'],
    'Em Andamento':         ['Aguardando Pagamento','Concluída','Cancelada'],
    'Aguardando Pagamento': ['Pagamento Agendado','Pago','Cancelada'],
    'Pagamento Agendado':   ['Pago','Cancelada'],
    'Pago':                 [],
    'Concluída':            [],
    'Cancelada':            [],
    'Cancelado':            [],
  };

  function _normSt(s) {
    const m = {
      'PENDENTE':'Pendente','ABERTA':'Pendente',
      'EM_ANALISE':'Em Análise','EM_ANDAMENTO':'Em Andamento',
      'AGUARDANDO_PAGAMENTO':'Aguardando Pagamento',
      'PAGAMENTO_AGENDADO':'Pagamento Agendado',
      'CONCLUIDA':'Concluída','PAGO':'Pago',
      'CANCELADA':'Cancelada','CANCELADO':'Cancelado',
    };
    return m[s] || s || 'Pendente';
  }

  /* ── Cache ───────────────────────────────────────── */
  let _demCache   = null;
  let _pagarCache = null;
  let _demFiltro  = 'abertas';
  let _pagarFiltro = 'abertas';

  /* ══════════════════════════════════════════════════
     HUB
  ══════════════════════════════════════════════════ */
  async function renderHub(el) {
    el.innerHTML = `
      <div class="mob-kpi-row" id="fin-kpi-row">
        ${[0,1,2].map(() => `
          <div class="mob-kpi">
            <div class="mob-kpi-val mob-skeleton" style="height:28px;width:40px;margin:0 auto 4px"></div>
            <div class="mob-kpi-lbl mob-skeleton" style="height:14px;width:100%"></div>
          </div>
        `).join('')}
      </div>

      <div class="mob-section">
        <div class="mob-section-title">Acesso Rápido</div>
        <div class="mob-card-list">
          <div class="mob-list-item" onclick="mobGo('fin-demandas',{title:'Demandas Financeiras'})">
            <div class="mob-list-ico" style="background:var(--rosebg);color:var(--rose)">💰</div>
            <div class="mob-list-body">
              <div class="mob-list-title">Demandas Financeiras</div>
              <div class="mob-list-sub">Solicitações por área</div>
            </div>
            <div class="mob-list-chev">›</div>
          </div>
          <div class="mob-list-item" onclick="mobGo('fin-pagar',{title:'A Pagar'})">
            <div class="mob-list-ico" style="background:rgba(234,179,8,.12);color:var(--amber)">📤</div>
            <div class="mob-list-body">
              <div class="mob-list-title">A Pagar</div>
              <div class="mob-list-sub">Solicitações financeiras</div>
            </div>
            <div class="mob-list-chev">›</div>
          </div>
          <div class="mob-list-item" onclick="mobGo('fin-lancamentos',{title:'Lançamentos'})">
            <div class="mob-list-ico" style="background:rgba(10,132,255,.12);color:var(--blue)">📒</div>
            <div class="mob-list-body">
              <div class="mob-list-title">Lançamentos</div>
              <div class="mob-list-sub">Receitas e despesas</div>
            </div>
            <div class="mob-list-chev">›</div>
          </div>
          <div class="mob-list-item" onclick="mobGo('fin-fluxo',{title:'Fluxo de Caixa'})">
            <div class="mob-list-ico" style="background:rgba(48,209,88,.12);color:var(--gr)">📈</div>
            <div class="mob-list-body">
              <div class="mob-list-title">Fluxo de Caixa</div>
              <div class="mob-list-sub">Resumo mensal</div>
            </div>
            <div class="mob-list-chev">›</div>
          </div>
        </div>
      </div>

      <div class="mob-section">
        <div class="mob-section-title">Demandas em aberto</div>
        <div id="fin-hub-dem" class="mob-card-list mob-loading-state">Carregando…</div>
      </div>

      <div class="mob-section" style="padding-bottom:24px">
        <div class="mob-section-title">Próximas a vencer</div>
        <div id="fin-hub-pagar" class="mob-card-list mob-loading-state">Carregando…</div>
      </div>
    `;

    await Promise.all([_loadHubKPIs(), _loadHubDem(), _loadHubPagar()]);
  }

  async function _loadHubKPIs() {
    const row = document.getElementById('fin-kpi-row');
    if (!row) return;
    const h    = { ...apiHeaders(), 'Prefer': 'count=exact' };
    const hoje = _isoHoje();
    try {
      const [rDem, rPagar, rAtras] = await Promise.all([
        fetch(`${apiBaseUrl()}/rest/v1/v_demandas?area=eq.Financeiro&status=not.in.(PAGO,CONCLUIDA,CANCELADA,CANCELADO)&select=id`, { headers: h }),
        fetch(`${apiBaseUrl()}/rest/v1/financeiro_solicitacoes?status=not.in.(pago,cancelado)&select=id`, { headers: h }),
        fetch(`${apiBaseUrl()}/rest/v1/financeiro_solicitacoes?status=not.in.(pago,cancelado)&vencimento=lt.${hoje}&select=id`, { headers: h }),
      ]);
      const cDem   = _parseCnt(rDem.headers.get('content-range'));
      const cPagar = _parseCnt(rPagar.headers.get('content-range'));
      const cAtras = _parseCnt(rAtras.headers.get('content-range'));
      row.innerHTML = `
        <div class="mob-kpi">
          <div class="mob-kpi-val" style="color:var(--rose)">${cDem}</div>
          <div class="mob-kpi-lbl">Demandas abertas</div>
        </div>
        <div class="mob-kpi">
          <div class="mob-kpi-val" style="color:var(--amber)">${cPagar}</div>
          <div class="mob-kpi-lbl">A pagar</div>
        </div>
        <div class="mob-kpi">
          <div class="mob-kpi-val" style="color:${Number(cAtras) > 0 ? 'var(--rose)' : 'var(--tx2)'}">${cAtras}</div>
          <div class="mob-kpi-lbl">Atrasadas</div>
        </div>
      `;
    } catch (_) {
      row.innerHTML = `
        <div class="mob-kpi"><div class="mob-kpi-val">—</div><div class="mob-kpi-lbl">Demandas abertas</div></div>
        <div class="mob-kpi"><div class="mob-kpi-val">—</div><div class="mob-kpi-lbl">A pagar</div></div>
        <div class="mob-kpi"><div class="mob-kpi-val">—</div><div class="mob-kpi-lbl">Atrasadas</div></div>
      `;
    }
  }

  async function _loadHubDem() {
    const el = document.getElementById('fin-hub-dem');
    if (!el) return;
    try {
      const res  = await fetch(
        `${apiBaseUrl()}/rest/v1/v_demandas?area=eq.Financeiro&status=not.in.(PAGO,CONCLUIDA,CANCELADA,CANCELADO)&select=id,titulo,status,subcategoria,financial_data&order=criado_em.desc.nullslast&limit=5`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) {
        el.innerHTML = `<div class="mob-empty-small">Nenhuma demanda em aberto.</div>`;
        return;
      }
      el.innerHTML = data.map(d => _rowDem(d)).join('');
    } catch (_) {
      el.innerHTML = `<div class="mob-empty-small">Erro ao carregar.</div>`;
    }
  }

  async function _loadHubPagar() {
    const el = document.getElementById('fin-hub-pagar');
    if (!el) return;
    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/financeiro_solicitacoes?status=not.in.(pago,cancelado)&select=id,finalidade,valor,vencimento,status&order=vencimento.asc.nullslast&limit=5`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) {
        el.innerHTML = `<div class="mob-empty-small">Nenhuma solicitação pendente.</div>`;
        return;
      }
      el.innerHTML = data.map(s => _rowPagar(s)).join('');
    } catch (_) {
      el.innerHTML = `<div class="mob-empty-small">Erro ao carregar.</div>`;
    }
  }

  /* ══════════════════════════════════════════════════
     DEMANDAS FINANCEIRAS — Lista
  ══════════════════════════════════════════════════ */
  async function renderDemandas(el) {
    _demCache  = null;
    _demFiltro = 'abertas';

    const chips = [
      { key:'abertas',     label:'Em aberto'            },
      { key:'Em Análise',  label:'Em Análise'            },
      { key:'Em Andamento',label:'Em Andamento'          },
      { key:'Aguardando Pagamento', label:'Aguardando'   },
      { key:'Pago',        label:'Pago'                  },
      { key:'todas',       label:'Todas'                 },
    ];

    el.innerHTML = `
      <div class="mob-chips" id="fin-dem-chips">
        ${chips.map(c => `
          <button class="mob-chip ${c.key === 'abertas' ? 'active' : ''}"
                  data-key="${c.key}"
                  onclick="_finDemFiltro('${c.key}')">${_esc(c.label)}</button>
        `).join('')}
      </div>
      <div id="fin-dem-lista" class="mob-section">
        <div class="mob-card-list mob-loading-state">Carregando…</div>
      </div>
    `;

    await _fetchDemandas();
  }

  async function _fetchDemandas() {
    const el = document.getElementById('fin-dem-lista');
    if (!el) return;
    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/v_demandas?area=eq.Financeiro&select=id,titulo,status,numero_chamado,subcategoria,solicitante,criado_em,financial_data&order=criado_em.desc.nullslast&limit=500`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      _demCache = Array.isArray(data) ? data : [];
      _renderDemRows(el);
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar demandas.</div></div>`;
    }
  }

  function _renderDemRows(el) {
    if (!el || !_demCache) return;
    let rows = [..._demCache];
    if (_demFiltro === 'abertas') {
      rows = rows.filter(r => !_FECHADAS.has(_normSt(r.status)));
    } else if (_demFiltro !== 'todas') {
      rows = rows.filter(r => _normSt(r.status) === _demFiltro);
    }
    if (!rows.length) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">📋</div><div class="mob-empty-text">Nenhuma demanda encontrada.</div></div>`;
      return;
    }
    el.innerHTML = `
      <div class="mob-card-list">${rows.map(d => _rowDem(d)).join('')}</div>
      <div style="padding:12px 0;text-align:center;font-size:11px;color:var(--tx4)">${rows.length} demanda${rows.length !== 1 ? 's' : ''}</div>
    `;
  }

  window._finDemFiltro = function (key) {
    _demFiltro = key;
    document.querySelectorAll('#fin-dem-chips .mob-chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.key === key);
    });
    const el = document.getElementById('fin-dem-lista');
    if (el) _renderDemRows(el);
  };

  function _rowDem(d) {
    const st  = _normSt(d.status);
    const cfg = _ST_CFG[st] || { cor:'var(--tx3)', bg:'rgba(90,96,104,.15)' };
    const val = d.financial_data?.valor;
    const aguard = st === 'Aguardando Pagamento';
    return `
      <div class="mob-list-item" onclick="mobGo('fin-dem-detalhe',{id:'${_esc(String(d.id || d._row))}',title:'${_esc(d.titulo || 'Demanda')}',_area:'fin-demandas'})">
        <div class="mob-list-ico" style="background:var(--rosebg);color:var(--rose)">💰</div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(d.titulo || 'Sem título')}</div>
          <div class="mob-list-sub">${d.subcategoria ? _esc(d.subcategoria) + (val != null ? ' · ' : '') : ''}${val != null ? _brl(val) : _fmtDat(d.criado_em) || ''}</div>
        </div>
        ${aguard
          ? `<button onclick="event.stopPropagation();_demAprovar('${_esc(String(d.id))}',event)"
               style="flex-shrink:0;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:600;
                      background:var(--gr);color:#fff;cursor:pointer;line-height:1.3">
               Aprovar
             </button>`
          : `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:${cfg.bg};color:${cfg.cor};white-space:nowrap;flex-shrink:0">${_esc(st)}</span>`
        }
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════
     DETALHE DA DEMANDA
  ══════════════════════════════════════════════════ */
  async function renderDemDetalhe(el, params) {
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;
    try {
      let d = (_demCache || []).find(x => String(x.id || x._row) === String(params?.id));
      if (!d) {
        const res = await fetch(
          `${apiBaseUrl()}/rest/v1/v_demandas?id=eq.${encodeURIComponent(params.id)}&select=*&limit=1`,
          { headers: apiHeaders() }
        );
        [d] = await res.json();
      }
      if (!d) throw new Error('não encontrado');

      const st  = _normSt(d.status);
      const cfg = _ST_CFG[st] || { cor:'var(--tx3)', bg:'rgba(90,96,104,.15)' };
      const fd  = d.financial_data || {};

      el.innerHTML = `
        <div class="mob-detail">
          <div style="padding:20px 16px;background:var(--bg-surface);border-bottom:1px solid var(--bd1)">
            <div style="font-size:18px;font-weight:700;color:var(--tx1);line-height:1.3;margin-bottom:10px">${_esc(d.titulo || 'Sem título')}</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:10px;background:${cfg.bg};color:${cfg.cor}">${_esc(st)}</span>
              ${d.numero_chamado ? `<span style="font-size:11px;color:var(--tx3);font-family:monospace">${_esc(d.numero_chamado)}</span>` : ''}
            </div>
          </div>

          ${fd.valor != null || fd.forma_pagamento || fd.data_vencimento ? `
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Financeiro</div>
            ${fd.valor != null ? `
            <div class="mob-detail-row">
              <div class="mob-detail-row-key">Valor</div>
              <div class="mob-detail-row-val" style="font-size:17px;font-weight:700;color:var(--tx1)">${_brl(fd.valor)}</div>
            </div>` : ''}
            ${_det('Forma de pagamento', fd.forma_pagamento)}
            ${_det('Vencimento', _fmtDat(fd.data_vencimento))}
            ${_det('Centro de custo', fd.centro_custo)}
          </div>` : ''}

          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Detalhes</div>
            ${_det('Área', d.area)}
            ${_det('Subcategoria', d.subcategoria)}
            ${_det('Solicitante', d.solicitante || d.solicitante_txt)}
            ${_det('Responsável', d.responsavel)}
            ${_det('Prioridade', d.prioridade)}
            ${_det('Abertura', _fmtDat(d.data_abertura || d.criado_em))}
            ${d.data_conclusao ? _det('Conclusão', _fmtDat(d.data_conclusao)) : ''}
          </div>

          ${d.descricao ? `
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Descrição</div>
            <div style="padding:14px 16px;font-size:14px;color:var(--tx2);line-height:1.7;word-break:break-word">${_fmtTxt(d.descricao)}</div>
          </div>` : ''}

          <!-- Alterar status -->
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Status</div>
            <div style="padding:12px 16px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px">
              <span id="dem-status-badge-${d.id}" style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:10px;background:${cfg.bg};color:${cfg.cor}">${_esc(st)}</span>
              <button class="mob-btn-secondary" style="flex-shrink:0"
                      onclick="_finDemAbrirStatusSheet('${d.id}','${_esc(st)}')">
                Alterar
              </button>
            </div>
          </div>

          <!-- Andamentos -->
          <div class="mob-detail-card" style="padding-bottom:24px">
            <div class="mob-detail-card-title">Andamento</div>
            <div id="dem-and-list-${d.id}" style="padding:0 16px">
              <div class="mob-loading-state" style="font-size:13px;padding:12px 0">Carregando…</div>
            </div>
            <div style="padding:12px 16px 0;display:flex;flex-direction:column;gap:8px">
              <textarea id="dem-and-txt-${d.id}"
                style="width:100%;min-height:72px;border:1px solid var(--bd2);border-radius:10px;
                       background:var(--bg-input);color:var(--tx1);font-size:14px;
                       padding:10px 12px;resize:none;font-family:var(--sans);outline:none;
                       box-sizing:border-box"
                placeholder="Registre um andamento…"></textarea>
              <button class="mob-btn-primary" id="dem-and-btn-${d.id}"
                      onclick="_finDemRegistrarAndamento('${d.id}')">
                Registrar andamento
              </button>
            </div>
          </div>
        </div>
      `;

      window._finDemCarregarAndamentos(d.id);
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Demanda não encontrada.</div></div>`;
    }
  }

  /* ══════════════════════════════════════════════════
     A PAGAR — Lista
  ══════════════════════════════════════════════════ */
  async function renderPagar(el) {
    _pagarCache  = null;
    _pagarFiltro = 'abertas';

    el.innerHTML = `
      <div class="mob-chips" id="fin-pagar-chips">
        <button class="mob-chip active" data-key="abertas" onclick="_finPagarFiltro('abertas')">Em aberto</button>
        <button class="mob-chip" data-key="pago"    onclick="_finPagarFiltro('pago')">Pago</button>
        <button class="mob-chip" data-key="todas"   onclick="_finPagarFiltro('todas')">Todas</button>
      </div>
      <div id="fin-pagar-lista" class="mob-section">
        <div class="mob-card-list mob-loading-state">Carregando…</div>
      </div>
    `;

    await _fetchPagar();
  }

  async function _fetchPagar() {
    const el = document.getElementById('fin-pagar-lista');
    if (!el) return;
    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/financeiro_solicitacoes?deleted_at=is.null&select=*&order=vencimento.asc.nullslast&limit=500`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      _pagarCache = Array.isArray(data) ? data : [];
      _renderPagarRows(el);
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar.</div></div>`;
    }
  }

  function _renderPagarRows(el) {
    if (!el || !_pagarCache) return;
    let rows = [..._pagarCache];
    const f = _pagarFiltro;
    if (f === 'abertas') rows = rows.filter(r => !['pago','cancelado'].includes((r.status || '').toLowerCase()));
    else if (f === 'pago') rows = rows.filter(r => (r.status || '').toLowerCase() === 'pago');

    if (!rows.length) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">📤</div><div class="mob-empty-text">Nenhuma solicitação.</div></div>`;
      return;
    }
    const hoje = _isoHoje();
    el.innerHTML = `
      <div class="mob-card-list">${rows.map(s => _rowPagar(s, hoje)).join('')}</div>
      <div style="padding:12px 0;text-align:center;font-size:11px;color:var(--tx4)">${rows.length} solicitaç${rows.length !== 1 ? 'ões' : 'ão'}</div>
    `;
  }

  window._finPagarFiltro = function (key) {
    _pagarFiltro = key;
    document.querySelectorAll('#fin-pagar-chips .mob-chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.key === key);
    });
    const el = document.getElementById('fin-pagar-lista');
    if (el) _renderPagarRows(el);
  };

  function _rowPagar(s, hoje) {
    const st     = (s.status || 'pendente').toLowerCase();
    const isPago = st === 'pago';
    const isCan  = st === 'cancelado';
    const label  = isPago ? 'Pago' : isCan ? 'Cancelado' : 'Pendente';
    const cor    = isPago ? 'var(--gr)' : isCan ? 'var(--tx3)' : 'var(--amber)';
    const bg     = isPago ? 'rgba(48,209,88,.12)' : isCan ? 'rgba(90,96,104,.15)' : 'rgba(234,179,8,.12)';
    const venc   = s.vencimento;
    const atraso = !isPago && !isCan && venc && venc < (hoje || _isoHoje());
    const titulo = s.finalidade || 'Solicitação financeira';
    const sub    = [
      s.valor != null ? _brl(s.valor) : null,
      venc ? (atraso ? 'Vencido ' + _fmtDat(venc) : 'Vence ' + _fmtDat(venc)) : null,
    ].filter(Boolean).join(' · ');

    return `
      <div class="mob-list-item" onclick="mobGo('fin-pagar-det',{id:'${_esc(String(s.id))}',title:'${_esc(titulo)}'})">
        <div class="mob-list-ico" style="background:rgba(234,179,8,.12);color:var(--amber)">📤</div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(titulo)}</div>
          <div class="mob-list-sub" style="${atraso ? 'color:var(--rose)' : ''}">${_esc(sub)}</div>
        </div>
        <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:${bg};color:${cor};white-space:nowrap;flex-shrink:0">${label}</span>
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════
     DETALHE A PAGAR
  ══════════════════════════════════════════════════ */
  async function renderPagarDetalhe(el, params) {
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;
    try {
      let s = (_pagarCache || []).find(x => String(x.id) === String(params?.id));
      if (!s) {
        const res = await fetch(
          `${apiBaseUrl()}/rest/v1/financeiro_solicitacoes?id=eq.${encodeURIComponent(params.id)}&select=*&limit=1`,
          { headers: apiHeaders() }
        );
        [s] = await res.json();
      }
      if (!s) throw new Error('não encontrado');

      const st     = (s.status || 'pendente').toLowerCase();
      const isPago = st === 'pago';
      const isCan  = st === 'cancelado';
      const label  = isPago ? 'Pago' : isCan ? 'Cancelado' : 'Pendente';
      const cor    = isPago ? 'var(--gr)' : isCan ? 'var(--tx3)' : 'var(--amber)';
      const bg     = isPago ? 'rgba(48,209,88,.12)' : isCan ? 'rgba(90,96,104,.15)' : 'rgba(234,179,8,.12)';
      const titulo = s.finalidade || 'Solicitação financeira';
      const atraso = !isPago && !isCan && s.vencimento && s.vencimento < _isoHoje();
      const forma  = _labelForma(s.forma_pagamento);

      el.innerHTML = `
        <div class="mob-detail">
          <div style="padding:20px 16px;background:var(--bg-surface);border-bottom:1px solid var(--bd1)">
            <div style="font-size:18px;font-weight:700;color:var(--tx1);line-height:1.3;margin-bottom:10px">${_esc(titulo)}</div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:10px;background:${bg};color:${cor}">${label}</span>
              ${atraso ? `<span style="font-size:11px;color:var(--rose);font-weight:500">Vencido</span>` : ''}
            </div>
          </div>

          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Pagamento</div>
            ${s.valor != null ? `
            <div class="mob-detail-row">
              <div class="mob-detail-row-key">Valor</div>
              <div class="mob-detail-row-val" style="font-size:20px;font-weight:700;color:var(--tx1)">${_brl(s.valor)}</div>
            </div>` : ''}
            ${_det('Vencimento', _fmtDat(s.vencimento))}
            ${_det('Forma de pagamento', forma)}
            ${isPago ? _det('Pago em', _fmtDat(s.pago_em)) : ''}
          </div>

          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Detalhes</div>
            ${_det('Solicitante', s.solicitante)}
            ${_det('Responsável', s.responsavel)}
            ${_det('Fornecedor', s.fornecedor)}
            ${_det('Criado em', _fmtDat(s.created_at))}
            ${_det('Observações', s.observacoes)}
          </div>

          ${!isPago && !isCan ? `
          <div style="padding:0 16px 32px">
            <button class="mob-btn-primary" onclick="_finMarcarPago('${_esc(String(s.id))}')">Marcar como Pago</button>
          </div>` : ''}
        </div>
      `;
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Solicitação não encontrada.</div></div>`;
    }
  }

  window._finMarcarPago = function (id) {
    document.getElementById('fin-confirm-sheet')?.remove();
    const s = document.createElement('div');
    s.id = 'fin-confirm-sheet';
    s.style.cssText = 'position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;justify-content:flex-end';
    s.innerHTML = `
      <div onclick="document.getElementById('fin-confirm-sheet')?.remove()"
           style="flex:1;background:rgba(0,0,0,.4)"></div>
      <div style="background:var(--bg-surface);border-radius:18px 18px 0 0;
                  padding:24px 16px;padding-bottom:calc(var(--safe-bottom,0px) + 24px)">
        <div style="font-size:16px;font-weight:700;color:var(--tx1);text-align:center;margin-bottom:6px">
          Confirmar Pagamento
        </div>
        <div style="font-size:13px;color:var(--tx3);text-align:center;margin-bottom:20px">
          Marcar esta solicitação como paga?
        </div>
        <button id="fin-conf-btn" class="mob-btn-primary"
                onclick="_finConfirmarPago('${_esc(String(id))}')">
          Marcar como Pago
        </button>
        <button onclick="document.getElementById('fin-confirm-sheet')?.remove()"
          style="width:100%;padding:13px;background:transparent;border:none;
                 font-size:15px;color:var(--tx2);cursor:pointer;margin-top:4px">
          Cancelar
        </button>
      </div>
    `;
    document.body.appendChild(s);
  };

  window._finConfirmarPago = async function (id) {
    const btn = document.getElementById('fin-conf-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
    document.getElementById('fin-confirm-sheet')?.remove();
    try {
      const sb = getSupabase();
      const { error } = await sb
        .from('financeiro_solicitacoes')
        .update({ status: 'pago', pago_em: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      _pagarCache = null;
      mobToast('Marcado como pago');
      mobBack();
    } catch (e) {
      mobToast('Erro: ' + (e.message || 'falha ao atualizar'));
    }
  };

  /* ── Status sheet e andamentos ───────────────────── */
  window._demAprovar = async function (id, ev) {
    const btn = ev?.target;
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    try {
      const { error } = await getSupabase()
        .from('demandas')
        .update({ status: 'PAGAMENTO_AGENDADO', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      _demCache = null;
      mobToast('Pagamento aprovado — Agendado');
      const el = document.getElementById('fin-dem-lista');
      if (el) await _fetchDemandas();
      await _loadHubDem();
    } catch (e) {
      mobToast('Erro: ' + (e.message || 'falha'), 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Aprovar'; }
    }
  };

  window._finDemAbrirStatusSheet = function (demId, stAtual) {
    const proximos = _ST_TRANSITIONS[stAtual] || [];
    if (!proximos.length) { mobToast('Nenhuma transição disponível neste status.'); return; }
    document.getElementById('dem-status-sheet')?.remove();
    const s = document.createElement('div');
    s.id = 'dem-status-sheet';
    s.style.cssText = 'position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;justify-content:flex-end';
    s.innerHTML = `
      <div onclick="document.getElementById('dem-status-sheet')?.remove()"
           style="flex:1;background:rgba(0,0,0,.4)"></div>
      <div style="background:var(--bg-surface);border-radius:18px 18px 0 0;
                  padding:20px 16px;padding-bottom:calc(var(--safe-bottom) + 20px)">
        <div style="font-size:16px;font-weight:700;color:var(--tx1);margin-bottom:16px;text-align:center">
          Alterar Status
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${proximos.map(novoSt => {
            const cfg = _ST_CFG[novoSt] || { cor:'var(--tx1)', bg:'var(--bg-hover)' };
            const isAprovar = novoSt === 'Pagamento Agendado' || novoSt === 'Pago';
            return `<button onclick="_demAlterarStatus('${demId}','${novoSt}')"
              style="padding:12px 16px;border-radius:12px;border:1.5px solid ${cfg.cor};
                     background:${isAprovar ? cfg.bg : 'transparent'};color:${cfg.cor};
                     font-size:14px;font-weight:600;cursor:pointer;text-align:left">
              ${novoSt}${novoSt === 'Pagamento Agendado' ? ' — Aprovar pagamento' : ''}
            </button>`;
          }).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(s);
  };

  window._demAlterarStatus = async function (demId, novoLabel) {
    const novoEnum = _ST_ENUM[novoLabel];
    if (!novoEnum) return;
    document.getElementById('dem-status-sheet')?.remove();
    try {
      const { error } = await getSupabase()
        .from('demandas')
        .update({ status: novoEnum, updated_at: new Date().toISOString() })
        .eq('id', demId);
      if (error) throw error;
      const cfg = _ST_CFG[novoLabel] || { cor:'var(--tx3)', bg:'rgba(90,96,104,.15)' };
      const badge = document.getElementById(`dem-status-badge-${demId}`);
      if (badge) {
        badge.textContent = novoLabel;
        badge.style.background = cfg.bg;
        badge.style.color = cfg.cor;
      }
      _demCache = null;
      mobToast('Status atualizado: ' + novoLabel);
    } catch (e) {
      mobToast('Erro: ' + (e.message || 'falha'), 'error');
    }
  };

  window._finDemCarregarAndamentos = async function (demId) {
    const el = document.getElementById(`dem-and-list-${demId}`);
    if (!el) return;
    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/demanda_andamentos?demanda_id=eq.${encodeURIComponent(demId)}&select=id,texto,usuario_nome,created_at&order=created_at.asc&limit=50`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) {
        el.innerHTML = `<div style="padding:8px 0;font-size:13px;color:var(--tx3)">Nenhum andamento registrado.</div>`;
        return;
      }
      el.innerHTML = data.map(a => `
        <div style="padding:10px 0;border-bottom:1px solid var(--bd1)">
          <div style="font-size:12px;color:var(--tx3);margin-bottom:4px">
            ${_esc(a.usuario_nome || 'Sistema')} · ${_fmtDat(a.created_at) || ''}
          </div>
          <div style="font-size:14px;color:var(--tx1);line-height:1.5">${_esc(a.texto || '')}</div>
        </div>
      `).join('');
    } catch (_) {
      el.innerHTML = `<div style="padding:8px 0;font-size:13px;color:var(--tx3)">Erro ao carregar andamentos.</div>`;
    }
  };

  window._finDemRegistrarAndamento = async function (demId) {
    const txtEl = document.getElementById(`dem-and-txt-${demId}`);
    const btn   = document.getElementById(`dem-and-btn-${demId}`);
    const texto = (txtEl?.value || '').trim();
    if (!texto) { mobToast('Digite um andamento.'); return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Registrando…'; }
    try {
      const { error } = await getSupabase()
        .from('demanda_andamentos')
        .insert({
          demanda_id:   demId,
          texto,
          usuario_nome: window.MOB_USER?.nome || null,
          automatico:   false,
        });
      if (error) throw error;
      if (txtEl) txtEl.value = '';
      if (btn) { btn.disabled = false; btn.textContent = 'Registrar andamento'; }
      mobToast('Andamento registrado');
      window._finDemCarregarAndamentos(demId);
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = 'Registrar andamento'; }
      mobToast('Erro: ' + (e.message || 'falha'), 'error');
    }
  };

  /* ══════════════════════════════════════════════════
     LANÇAMENTOS — Receitas e Despesas
  ══════════════════════════════════════════════════ */
  let _lancCache  = null;
  let _lancFiltro = 'todos';

  async function renderLancamentos(el) {
    _lancCache  = null;
    _lancFiltro = 'todos';

    el.innerHTML = `
      <div class="mob-chips" id="fin-lanc-chips">
        <button class="mob-chip active" data-key="todos"    onclick="_finLancFiltro('todos')">Todos</button>
        <button class="mob-chip"        data-key="receita"  onclick="_finLancFiltro('receita')">Receitas</button>
        <button class="mob-chip"        data-key="despesa"  onclick="_finLancFiltro('despesa')">Despesas</button>
      </div>
      <div id="fin-lanc-lista" class="mob-section">
        <div class="mob-card-list mob-loading-state">Carregando…</div>
      </div>
    `;

    await _fetchLancamentos();
  }

  async function _fetchLancamentos() {
    const el = document.getElementById('fin-lanc-lista');
    if (!el) return;
    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/v_demandas?area=eq.Financeiro&select=id,titulo,status,subcategoria,financial_data,criado_em&order=criado_em.desc.nullslast&limit=200`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      _lancCache = Array.isArray(data)
        ? data.map(d => ({
            id:          d.id,
            titulo:      d.titulo,
            status:      d.status,
            subcategoria: d.subcategoria,
            tipo:        (d.financial_data?.tipo || '').toLowerCase(),
            valor:       d.financial_data?.valor ?? null,
            data:        d.financial_data?.data_vencimento || d.criado_em,
          }))
        : [];
      _renderLancRows(el);
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar lançamentos.</div></div>`;
    }
  }

  function _renderLancRows(el) {
    if (!el || !_lancCache) return;
    let rows = [..._lancCache];
    if (_lancFiltro === 'receita') rows = rows.filter(r => r.tipo === 'receita');
    else if (_lancFiltro === 'despesa') rows = rows.filter(r => r.tipo === 'despesa');

    const totalRec  = rows.filter(r => r.tipo === 'receita').reduce((s, r) => s + (r.valor || 0), 0);
    const totalDesp = rows.filter(r => r.tipo === 'despesa').reduce((s, r) => s + (r.valor || 0), 0);

    if (!rows.length) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">📒</div><div class="mob-empty-text">Nenhum lançamento encontrado.</div></div>`;
      return;
    }

    el.innerHTML = `
      <div style="display:flex;gap:8px;padding:0 0 12px">
        <div style="flex:1;background:rgba(48,209,88,.1);border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:11px;color:var(--gr);font-weight:600;margin-bottom:4px">Receitas</div>
          <div style="font-size:15px;font-weight:700;color:var(--gr)">${_brl(totalRec)}</div>
        </div>
        <div style="flex:1;background:rgba(255,69,58,.1);border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:11px;color:var(--rose);font-weight:600;margin-bottom:4px">Despesas</div>
          <div style="font-size:15px;font-weight:700;color:var(--rose)">${_brl(totalDesp)}</div>
        </div>
      </div>
      <div class="mob-card-list">${rows.map(r => _rowLanc(r)).join('')}</div>
      <div style="padding:12px 0;text-align:center;font-size:11px;color:var(--tx4)">${rows.length} lançamento${rows.length !== 1 ? 's' : ''}</div>
    `;
  }

  window._finLancFiltro = function (key) {
    _lancFiltro = key;
    document.querySelectorAll('#fin-lanc-chips .mob-chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.key === key);
    });
    const el = document.getElementById('fin-lanc-lista');
    if (el) _renderLancRows(el);
  };

  function _rowLanc(r) {
    const isRec  = r.tipo === 'receita';
    const isDesp = r.tipo === 'despesa';
    const cor    = isRec ? 'var(--gr)' : isDesp ? 'var(--rose)' : 'var(--tx3)';
    const ico    = isRec ? '⬆' : isDesp ? '⬇' : '•';
    const icoBg  = isRec ? 'rgba(48,209,88,.12)' : isDesp ? 'rgba(255,69,58,.12)' : 'rgba(90,96,104,.15)';
    const st     = _normSt(r.status);
    const cfg    = _ST_CFG[st] || { cor:'var(--tx3)', bg:'rgba(90,96,104,.15)' };

    return `
      <div class="mob-list-item" onclick="mobGo('fin-dem-detalhe',{id:'${_esc(String(r.id))}',title:'${_esc(r.titulo || 'Lançamento')}',_area:'fin-lancamentos'})">
        <div class="mob-list-ico" style="background:${icoBg};color:${cor};font-size:16px">${ico}</div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(r.titulo || 'Sem título')}</div>
          <div class="mob-list-sub">${r.subcategoria ? _esc(r.subcategoria) + (r.valor != null ? ' · ' : '') : ''}${r.valor != null ? `<span style="color:${cor};font-weight:600">${_brl(r.valor)}</span>` : _fmtDat(r.data) || ''}</div>
        </div>
        <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:${cfg.bg};color:${cfg.cor};white-space:nowrap;flex-shrink:0">${_esc(st)}</span>
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════
     FLUXO DE CAIXA — Resumo Mensal
  ══════════════════════════════════════════════════ */
  async function renderFluxo(el) {
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;
    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/v_demandas?area=eq.Financeiro&select=financial_data,criado_em&order=criado_em.desc.nullslast&limit=500`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) {
        el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">📈</div><div class="mob-empty-text">Nenhum dado disponível.</div></div>`;
        return;
      }

      const meses = {};
      for (const d of data) {
        const tipo  = (d.financial_data?.tipo || '').toLowerCase();
        const valor = d.financial_data?.valor;
        if (valor == null) continue;
        const mes = (d.financial_data?.data_vencimento || d.criado_em || '').substring(0, 7);
        if (!mes || mes.length < 7) continue;
        if (!meses[mes]) meses[mes] = { rec: 0, desp: 0 };
        if (tipo === 'receita')       meses[mes].rec  += Number(valor);
        else if (tipo === 'despesa')  meses[mes].desp += Number(valor);
      }

      const keys = Object.keys(meses).sort().reverse();
      if (!keys.length) {
        el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">📈</div><div class="mob-empty-text">Nenhum lançamento com valor registrado.</div></div>`;
        return;
      }

      const totalRec  = keys.reduce((s, k) => s + meses[k].rec, 0);
      const totalDesp = keys.reduce((s, k) => s + meses[k].desp, 0);
      const resultado = totalRec - totalDesp;

      el.innerHTML = `
        <div style="display:flex;gap:8px;padding:0 0 16px">
          <div style="flex:1;background:rgba(48,209,88,.1);border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:10px;color:var(--gr);font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Total Rec.</div>
            <div style="font-size:14px;font-weight:700;color:var(--gr)">${_brl(totalRec)}</div>
          </div>
          <div style="flex:1;background:rgba(255,69,58,.1);border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:10px;color:var(--rose);font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Total Desp.</div>
            <div style="font-size:14px;font-weight:700;color:var(--rose)">${_brl(totalDesp)}</div>
          </div>
          <div style="flex:1;background:${resultado >= 0 ? 'rgba(48,209,88,.1)' : 'rgba(255,69,58,.1)'};border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:10px;color:${resultado >= 0 ? 'var(--gr)' : 'var(--rose)'};font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Resultado</div>
            <div style="font-size:14px;font-weight:700;color:${resultado >= 0 ? 'var(--gr)' : 'var(--rose)'}">${_brl(resultado)}</div>
          </div>
        </div>

        <div class="mob-card-list">
          ${keys.map(mes => {
            const m = meses[mes];
            const res = m.rec - m.desp;
            const [ano, num] = mes.split('-');
            const nomeMes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(num, 10) - 1] || num;
            return `
              <div class="mob-list-item" style="flex-direction:column;align-items:stretch;gap:8px;padding:14px 16px">
                <div style="font-size:14px;font-weight:700;color:var(--tx1)">${nomeMes} ${ano}</div>
                <div style="display:flex;gap:12px">
                  <div style="flex:1">
                    <div style="font-size:10px;color:var(--tx3);margin-bottom:2px">Receitas</div>
                    <div style="font-size:13px;font-weight:600;color:var(--gr)">${_brl(m.rec)}</div>
                  </div>
                  <div style="flex:1">
                    <div style="font-size:10px;color:var(--tx3);margin-bottom:2px">Despesas</div>
                    <div style="font-size:13px;font-weight:600;color:var(--rose)">${_brl(m.desp)}</div>
                  </div>
                  <div style="flex:1">
                    <div style="font-size:10px;color:var(--tx3);margin-bottom:2px">Resultado</div>
                    <div style="font-size:13px;font-weight:700;color:${res >= 0 ? 'var(--gr)' : 'var(--rose)'}">${_brl(res)}</div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="padding:12px 0;text-align:center;font-size:11px;color:var(--tx4)">${keys.length} ${keys.length !== 1 ? 'meses' : 'mês'}</div>
      `;
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar fluxo de caixa.</div></div>`;
    }
  }

  /* ── Helpers ─────────────────────────────────────── */
  function _brl(v) {
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
  }

  function _isoHoje() {
    return new Date().toISOString().split('T')[0];
  }

  function _fmtDat(iso) {
    if (!iso) return null;
    const d = (iso.split('T')[0]).split('-');
    return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : null;
  }

  function _labelForma(f) {
    const m = { pix:'PIX', boleto:'Boleto', boleto_pix:'Boleto / PIX', transferencia:'Transferência', cartao:'Cartão', pix_reembolso:'PIX (Reembolso)' };
    return m[f] || f || null;
  }

  function _parseCnt(cr) {
    if (!cr) return '—';
    const m = cr.match(/\/(\d+)$/);
    return m ? parseInt(m[1]) : '—';
  }

  function _det(label, val) {
    if (val == null || val === '') return '';
    return `
      <div class="mob-detail-row">
        <div class="mob-detail-row-key">${label}</div>
        <div class="mob-detail-row-val">${_esc(String(val))}</div>
      </div>
    `;
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
    );
  }

  function _fmtTxt(raw) {
    if (!raw) return '';
    return _esc(raw)
      .replace(/\n/g, '<br>')
      .replace(/—{2,}([^—<]{0,80})—{2,}/g, (_, titulo) => {
        const t = titulo.trim();
        if (t) {
          return `<div style="display:flex;align-items:center;gap:8px;margin:10px 0">` +
            `<div style="flex:1;height:1px;background:var(--bd2)"></div>` +
            `<span style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap">${t}</span>` +
            `<div style="flex:1;height:1px;background:var(--bd2)"></div>` +
          `</div>`;
        }
        return `<div style="height:1px;background:var(--bd2);margin:10px 0"></div>`;
      })
      .replace(/—{2,}/g, `<div style="height:1px;background:var(--bd2);margin:10px 0"></div>`);
  }

})();
