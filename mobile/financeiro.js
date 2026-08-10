/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Financeiro
   mobile/financeiro.js · v1.0.0
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('financeiro',      renderHub);
  mobRegisterPage('fin-demandas',    renderDemandas);
  mobRegisterPage('fin-dem-detalhe', renderDemDetalhe);
  mobRegisterPage('fin-pagar',       renderPagar);
  mobRegisterPage('fin-pagar-det',   renderPagarDetalhe);

  /* ── Constantes ──────────────────────────────────── */
  const _FECHADAS = new Set(['Pago', 'Concluída', 'Cancelada', 'Cancelado']);

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
        fetch(`${apiBaseUrl()}/rest/v1/v_demandas?area=eq.Financeiro&status=not.in.(Pago,Conclu%C3%ADda,Cancelada,Cancelado)&select=id`, { headers: h }),
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
        `${apiBaseUrl()}/rest/v1/v_demandas?area=eq.Financeiro&status=not.in.(Pago,Conclu%C3%ADda,Cancelada,Cancelado)&select=id,titulo,status,subcategoria,financial_data&order=criado_em.desc.nullslast&limit=5`,
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
        `${apiBaseUrl()}/rest/v1/financeiro_solicitacoes?status=not.in.(pago,cancelado)&select=id,finalidade,descricao,valor,vencimento,status&order=vencimento.asc.nullslast&limit=5`,
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
        `${apiBaseUrl()}/rest/v1/v_demandas?area=eq.Financeiro&select=id,titulo,status,numero_chamado,subcategoria,solicitante,criado_em,financial_data&order=criado_em.desc.nullslast&limit=300`,
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
      rows = rows.filter(r => !_FECHADAS.has(r.status));
    } else if (_demFiltro !== 'todas') {
      rows = rows.filter(r => r.status === _demFiltro);
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
    const st  = d.status || 'Pendente';
    const cfg = _ST_CFG[st] || { cor:'var(--tx3)', bg:'rgba(90,96,104,.15)' };
    const val = d.financial_data?.valor;
    return `
      <div class="mob-list-item" onclick="mobGo('fin-dem-detalhe',{id:'${_esc(String(d.id || d._row))}',title:'${_esc(d.titulo || 'Demanda')}',_area:'fin-demandas'})">
        <div class="mob-list-ico" style="background:var(--rosebg);color:var(--rose)">💰</div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(d.titulo || 'Sem título')}</div>
          <div class="mob-list-sub">${d.subcategoria ? _esc(d.subcategoria) + (val != null ? ' · ' : '') : ''}${val != null ? _brl(val) : _fmtDat(d.criado_em) || ''}</div>
        </div>
        <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:${cfg.bg};color:${cfg.cor};white-space:nowrap;flex-shrink:0">${_esc(st)}</span>
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

      const st  = d.status || 'Pendente';
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
          <div class="mob-detail-card" style="padding-bottom:24px">
            <div class="mob-detail-card-title">Descrição</div>
            <div style="font-size:13px;color:var(--tx2);line-height:1.6;padding-top:4px">${_esc(d.descricao)}</div>
          </div>` : ''}
        </div>
      `;
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
        `${apiBaseUrl()}/rest/v1/financeiro_solicitacoes?select=*&order=vencimento.asc.nullslast&limit=300`,
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
    const titulo = s.finalidade || s.descricao || 'Solicitação financeira';
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
      const titulo = s.finalidade || s.descricao || 'Solicitação financeira';
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
            ${s.descricao && s.descricao !== s.finalidade ? _det('Descrição', s.descricao) : ''}
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

  window._finMarcarPago = async function (id) {
    if (!confirm('Marcar esta solicitação como paga?')) return;
    try {
      const sb = getSupabase();
      const { error } = await sb
        .from('financeiro_solicitacoes')
        .update({ status: 'pago', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      _pagarCache = null;
      mobToast('Marcado como pago');
      mobBack();
    } catch (e) {
      mobToast('Erro: ' + (e.message || 'falha ao atualizar'));
    }
  };

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

})();
