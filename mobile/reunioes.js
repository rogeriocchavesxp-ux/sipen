/* ════════════════════════════════════════════════════
   SIPEN Mobile — Reuniões & Atas
   mobile/reunioes.js · v1.0.1

   Páginas:
   - reunioes-hub     → hub com submenu
   - reunioes-mob     → lista de reuniões (conselho_reunioes)
   - reuniao-detalhe  → detalhe + pautas (conselho_pautas)
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('reunioes-hub',    renderHub);
  mobRegisterPage('reunioes-mob',    renderReunioes);
  mobRegisterPage('reuniao-detalhe', renderDetalhe);

  /* ── Helpers ──────────────────────────────────── */
  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
    );
  }

  function _fmtData(iso) {
    if (!iso) return '—';
    const [y, m, d] = (iso.split('T')[0]).split('-');
    return `${d}/${m}/${y}`;
  }

  function _tipoLabel(t) {
    return { ORDINARIA:'Ordinária', EXTRAORDINARIA:'Extraordinária', COMISSAO_EXECUTIVA:'Comissão Executiva' }[t] || t || '—';
  }

  const ST_REUNIAO = {
    AGENDADA:  { label:'Agendada',  bg:'rgba(10,132,255,.12)',  cor:'var(--blue)'  },
    REALIZADA: { label:'Realizada', bg:'rgba(48,209,88,.12)',   cor:'var(--gr)'    },
    CANCELADA: { label:'Cancelada', bg:'rgba(90,96,104,.15)',   cor:'var(--tx3)'   },
  };

  const ST_PAUTA = {
    PENDENTE:   { label:'Pendente',   bg:'rgba(212,168,67,.12)',  cor:'var(--gold)'   },
    APROVADO:   { label:'Aprovado',   bg:'rgba(48,209,88,.12)',   cor:'var(--gr)'     },
    REJEITADO:  { label:'Rejeitado',  bg:'rgba(224,85,85,.12)',   cor:'var(--rose)'   },
    ADIADO:     { label:'Adiado',     bg:'rgba(10,132,255,.12)',  cor:'var(--blue)'   },
    EM_ANALISE: { label:'Em Análise', bg:'rgba(212,168,67,.12)',  cor:'var(--gold)'   },
    CONCLUIDO:  { label:'Concluído',  bg:'rgba(48,209,88,.12)',   cor:'var(--gr)'     },
  };

  function _pillR(st) {
    const s = ST_REUNIAO[st] || { label: st || '—', bg:'rgba(90,96,104,.15)', cor:'var(--tx3)' };
    return `<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;background:${s.bg};color:${s.cor}">${s.label}</span>`;
  }

  function _pillP(st) {
    const s = ST_PAUTA[st] || { label: st || '—', bg:'rgba(90,96,104,.15)', cor:'var(--tx3)' };
    return `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;white-space:nowrap;background:${s.bg};color:${s.cor}">${s.label}</span>`;
  }

  /* ════════════════════════════════════════════════
     HUB
  ════════════════════════════════════════════════ */
  function renderHub(el) {
    el.innerHTML = `
      <div style="padding:16px 16px 40px">

        <div class="mob-card-list" style="margin-bottom:16px">
          <div class="mob-list-item" onclick="mobGo('reunioes-mob',{title:'Reuniões'})">
            <div class="mob-list-ico" style="background:rgba(10,132,255,.12);color:var(--blue)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
            <div class="mob-list-body">
              <div class="mob-list-title">Reuniões do Conselho</div>
              <div class="mob-list-sub">Ordinárias, extraordinárias e pautas</div>
            </div>
            <div class="mob-list-chev">›</div>
          </div>
          <div class="mob-list-item" onclick="mobGo('atas',{title:'Atas'})">
            <div class="mob-list-ico" style="background:rgba(139,111,212,.12);color:var(--violet)">📜</div>
            <div class="mob-list-body">
              <div class="mob-list-title">Atas</div>
              <div class="mob-list-sub">Documentos formais aprovados</div>
            </div>
            <div class="mob-list-chev">›</div>
          </div>
        </div>

        <div id="hub-proxima"></div>
      </div>
    `;

    _carregarProxima();
  }

  async function _carregarProxima() {
    const el = document.getElementById('hub-proxima');
    if (!el) return;
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const res  = await fetch(
        `${apiBaseUrl()}/rest/v1/conselho_reunioes?status=eq.AGENDADA&data_reuniao=gte.${hoje}&select=id,titulo,tipo,data_reuniao,horario,local&order=data_reuniao.asc&limit=1`,
        { headers: apiHeaders() }
      );
      const [r] = await res.json();
      if (!r) return;
      el.innerHTML = `
        <div style="background:rgba(10,132,255,.06);border:1px solid rgba(10,132,255,.2);border-radius:14px;padding:14px 16px">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--blue);margin-bottom:6px">Próxima Reunião</div>
          <div style="font-size:15px;font-weight:700;color:var(--tx1)">${_esc(r.titulo)}</div>
          <div style="font-size:13px;color:var(--tx3);margin-top:3px">
            ${_fmtData(r.data_reuniao)}${r.horario ? ' · ' + r.horario.slice(0,5) : ''}${r.local ? ' · ' + _esc(r.local) : ''}
          </div>
          <button onclick="mobGo('reuniao-detalhe',{id:'${r.id}',title:'${_esc(r.titulo)}'})"
            style="margin-top:10px;padding:7px 16px;border-radius:10px;border:none;
                   background:var(--blue);color:#fff;font-size:13px;font-weight:600;cursor:pointer">
            Ver detalhes
          </button>
        </div>
      `;
    } catch (_) {}
  }

  /* ════════════════════════════════════════════════
     LISTA DE REUNIÕES
  ════════════════════════════════════════════════ */
  let _cache  = null;
  let _filtro = 'todas';

  async function renderReunioes(el) {
    _cache  = null;
    _filtro = 'todas';

    el.innerHTML = `
      <div style="padding-bottom:80px">
        <div id="reun-kpi" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:14px 16px 0">
          ${[0,1,2].map(() => `<div style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:12px;padding:12px 8px;text-align:center">
            <div class="mob-skeleton" style="height:22px;width:32px;margin:0 auto 4px;border-radius:6px"></div>
            <div class="mob-skeleton" style="height:12px;width:100%;border-radius:4px"></div>
          </div>`).join('')}
        </div>

        <div class="mob-chips" id="reun-chips">
          ${[['todas','Todas'],['AGENDADA','Agendada'],['REALIZADA','Realizada'],['CANCELADA','Cancelada']].map(([k,l]) =>
            `<button class="mob-chip ${k==='todas'?'active':''}" data-key="${k}"
               onclick="_reunFiltro('${k}')">${l}</button>`
          ).join('')}
        </div>

        <div id="reun-lista" class="mob-section">
          <div class="mob-card-list mob-loading-state">Carregando…</div>
        </div>
      </div>

      <button onclick="mobGo('reuniao-detalhe',{title:'Nova Reunião',novo:true})"
        style="position:fixed;bottom:calc(var(--tab-h) + var(--safe-bottom) + 16px);right:18px;
               z-index:200;width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;
               background:var(--blue);color:#fff;font-size:22px;font-weight:300;
               display:flex;align-items:center;justify-content:center;
               box-shadow:0 4px 16px rgba(10,132,255,.45)">
        +
      </button>
    `;

    await Promise.all([_fetchReunioes(), _fetchKPIs()]);
  }

  async function _fetchReunioes() {
    const el = document.getElementById('reun-lista');
    if (!el) return;
    try {
      const res  = await fetch(
        `${apiBaseUrl()}/rest/v1/conselho_reunioes?select=id,titulo,tipo,data_reuniao,horario,local,status&order=data_reuniao.desc&limit=200`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      _cache = Array.isArray(data) ? data : [];
      _renderLista(el);
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar reuniões.</div></div>`;
    }
  }

  async function _fetchKPIs() {
    const kpiEl = document.getElementById('reun-kpi');
    if (!kpiEl) return;
    const h = { ...apiHeaders(), Prefer: 'count=exact' };
    try {
      const [rT, rA, rR] = await Promise.all([
        fetch(`${apiBaseUrl()}/rest/v1/conselho_reunioes?select=id`, { headers: h }),
        fetch(`${apiBaseUrl()}/rest/v1/conselho_reunioes?status=eq.AGENDADA&select=id`, { headers: h }),
        fetch(`${apiBaseUrl()}/rest/v1/conselho_reunioes?status=eq.REALIZADA&select=id`, { headers: h }),
      ]);
      const cnt = r => { const m = (r.headers.get('content-range')||'').match(/\/(\d+)$/); return m ? parseInt(m[1]) : '—'; };
      const KPI = (val, lbl, cor) => `
        <div style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:12px;padding:12px 8px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:${cor};line-height:1">${val}</div>
          <div style="font-size:11px;color:var(--tx3);margin-top:3px">${lbl}</div>
        </div>`;
      kpiEl.innerHTML =
        KPI(cnt(rT), 'Total', 'var(--blue)') +
        KPI(cnt(rA), 'Agendadas', 'var(--gold)') +
        KPI(cnt(rR), 'Realizadas', 'var(--gr)');
    } catch (_) {}
  }

  function _renderLista(el) {
    if (!el || !_cache) return;
    const rows = _filtro === 'todas' ? _cache : _cache.filter(r => r.status === _filtro);

    if (!rows.length) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">🤝</div><div class="mob-empty-text">Nenhuma reunião encontrada.</div></div>`;
      return;
    }

    el.innerHTML = `
      <div class="mob-card-list">
        ${rows.map(r => {
          const st   = ST_REUNIAO[r.status] || ST_REUNIAO.AGENDADA;
          const tipo = _tipoLabel(r.tipo);
          return `
            <div class="mob-list-item" onclick="mobGo('reuniao-detalhe',{id:'${r.id}',title:'${_esc(r.titulo)}'})">
              <div class="mob-list-ico" style="background:${st.bg};color:${st.cor}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
              <div class="mob-list-body">
                <div class="mob-list-title">${_esc(r.titulo)}</div>
                <div class="mob-list-sub">${_fmtData(r.data_reuniao)}${r.horario ? ' · ' + r.horario.slice(0,5) : ''} · ${_esc(tipo)}</div>
              </div>
              ${_pillR(r.status)}
            </div>`;
        }).join('')}
      </div>
      <div style="padding:10px 0 6px;text-align:center;font-size:11px;color:var(--tx4)">${rows.length} reunião${rows.length !== 1 ? 'ões' : ''}</div>
    `;
  }

  window._reunFiltro = function (key) {
    _filtro = key;
    document.querySelectorAll('#reun-chips .mob-chip').forEach(b => b.classList.toggle('active', b.dataset.key === key));
    const el = document.getElementById('reun-lista');
    if (el) _renderLista(el);
  };

  /* ════════════════════════════════════════════════
     DETALHE DA REUNIÃO
  ════════════════════════════════════════════════ */
  async function renderDetalhe(el, params) {
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;
    try {
      const [rRows, pautas] = await Promise.all([
        fetch(`${apiBaseUrl()}/rest/v1/conselho_reunioes?id=eq.${encodeURIComponent(params.id)}&select=*&limit=1`, { headers: apiHeaders() }).then(r => r.json()),
        fetch(`${apiBaseUrl()}/rest/v1/conselho_pautas?reuniao_id=eq.${encodeURIComponent(params.id)}&select=*&order=ordem.asc,created_at.asc&limit=100`, { headers: apiHeaders() }).then(r => r.json()),
      ]);

      const r = Array.isArray(rRows) ? rRows[0] : null;
      if (!r) throw new Error('não encontrada');
      const ps = Array.isArray(pautas) ? pautas : [];
      const st = ST_REUNIAO[r.status] || ST_REUNIAO.AGENDADA;

      const pendentes  = ps.filter(p => p.status === 'PENDENTE' || p.status === 'EM_ANALISE').length;
      const aprovados  = ps.filter(p => p.status === 'APROVADO').length;

      el.innerHTML = `
        <div class="mob-detail" style="padding-bottom:40px">

          <!-- Hero -->
          <div style="padding:20px 16px;background:var(--bg-surface);border-bottom:1px solid var(--bd1)">
            <div style="display:flex;align-items:flex-start;gap:12px">
              <div style="width:44px;height:44px;border-radius:12px;background:${st.bg};color:${st.cor};
                          display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
              <div style="flex:1;min-width:0">
                <div style="font-size:17px;font-weight:700;color:var(--tx1);line-height:1.3">${_esc(r.titulo)}</div>
                <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap">
                  ${_pillR(r.status)}
                  <span style="font-size:12px;color:var(--tx3)">${_tipoLabel(r.tipo)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Info -->
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Informações</div>
            ${_row('Data',      _fmtData(r.data_reuniao))}
            ${_row('Horário',   r.horario ? r.horario.slice(0,5) + (r.horario_encerramento ? ' – ' + r.horario_encerramento.slice(0,5) : '') : null)}
            ${_row('Local',     r.local)}
            ${_row('Presidente', r.presidente)}
            ${_row('Secretário', r.secretario)}
            ${r.observacoes ? `
            <div class="mob-detail-row" style="align-items:flex-start">
              <div class="mob-detail-row-key">Obs.</div>
              <div class="mob-detail-row-val" style="white-space:pre-wrap;line-height:1.5">${_esc(r.observacoes)}</div>
            </div>` : ''}
          </div>

          <!-- KPIs pautas -->
          ${ps.length ? `
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--bd1);margin:0 0 1px">
            ${_kpi(ps.length, 'Pautas')}
            ${_kpi(pendentes, 'Pendentes', pendentes ? 'var(--gold)' : undefined)}
            ${_kpi(aprovados, 'Aprovados', aprovados ? 'var(--gr)' : undefined)}
          </div>` : ''}

          <!-- Pautas -->
          <div class="mob-detail-card">
            <div class="mob-detail-card-title" style="display:flex;align-items:center;justify-content:space-between">
              <span>Pautas <span style="font-size:11px;font-weight:400;color:var(--tx3)">(${ps.length})</span></span>
            </div>
            ${!ps.length
              ? `<div style="padding:12px 0;font-size:13px;color:var(--tx3)">Nenhuma pauta registrada.</div>`
              : ps.map((p, i) => `
                <div style="padding:12px 0;${i < ps.length-1 ? 'border-bottom:1px solid var(--bd1)' : ''}">
                  <div style="display:flex;align-items:flex-start;gap:10px">
                    <div style="width:22px;height:22px;border-radius:6px;background:var(--bg-body);
                                display:flex;align-items:center;justify-content:center;
                                font-size:11px;font-weight:700;color:var(--tx3);flex-shrink:0;margin-top:1px">
                      ${p.ordem || i+1}
                    </div>
                    <div style="flex:1;min-width:0">
                      <div style="font-size:14px;color:var(--tx1);line-height:1.4">${_esc(p.titulo)}</div>
                      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:5px;align-items:center">
                        ${_pillP(p.status)}
                        ${p.categoria ? `<span style="font-size:11px;color:var(--tx3)">${_esc(p.categoria)}</span>` : ''}
                        ${p.responsaveis ? `<span style="font-size:11px;color:var(--tx3)">· ${_esc(p.responsaveis)}</span>` : ''}
                      </div>
                      ${p.encaminhamento ? `<div style="font-size:12px;color:var(--tx2);margin-top:6px;line-height:1.4;padding:8px;background:var(--bg-body);border-radius:8px">${_esc(p.encaminhamento)}</div>` : ''}
                    </div>
                  </div>
                </div>`).join('')
            }
          </div>

        </div>
      `;
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Reunião não encontrada.</div></div>`;
    }
  }

  /* ── Helpers de detalhe ───────────────────────── */
  function _row(label, val) {
    if (!val) return '';
    return `
      <div class="mob-detail-row">
        <div class="mob-detail-row-key">${label}</div>
        <div class="mob-detail-row-val">${_esc(String(val))}</div>
      </div>`;
  }

  function _kpi(val, lbl, cor = 'var(--tx1)') {
    return `
      <div style="background:var(--bg-surface);padding:12px 8px;text-align:center">
        <div style="font-size:20px;font-weight:700;color:${cor};line-height:1">${val}</div>
        <div style="font-size:10px;color:var(--tx3);margin-top:3px">${lbl}</div>
      </div>`;
  }

})();
