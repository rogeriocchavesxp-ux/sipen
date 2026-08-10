/* ════════════════════════════════════════════════════
   SIPEN Mobile — Tela Inicial
   mobile/home.js · v1.0.0
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('home', renderHome);

  async function renderHome(el) {
    const u = window.MOB_USER;
    const hora = new Date().getHours();
    const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    const nome     = u ? u.nome.split(' ')[0] : 'usuário';

    el.innerHTML = `
      <div class="mob-home-greeting-block">
        <div class="mob-home-greeting">${saudacao}, ${nome}</div>
        <div class="mob-home-date">${_fmtDataLonga()}</div>
      </div>

      <!-- KPIs -->
      <div class="mob-kpi-row" id="m-kpi-row">
        ${[0,1,2].map(() => `
          <div class="mob-kpi">
            <div class="mob-kpi-val mob-skeleton" style="height:28px;width:40px;margin:0 auto 4px"></div>
            <div class="mob-kpi-lbl mob-skeleton" style="height:24px;width:100%"></div>
          </div>
        `).join('')}
      </div>

      <!-- Acesso Rápido -->
      <div class="mob-section">
        <div class="mob-section-title">Acesso Rápido</div>
        <div class="mob-actions-grid">
          <button class="mob-action-btn" onclick="mobGo('demandas')">
            <span class="mob-action-ico" style="background:var(--rosebg);color:var(--rose)">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
            </span>
            <span class="mob-action-lbl">Demandas</span>
          </button>
          <button class="mob-action-btn" onclick="mobGo('agenda')">
            <span class="mob-action-ico" style="background:var(--tealbg);color:var(--teal)">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </span>
            <span class="mob-action-lbl">Agenda</span>
          </button>
          <button class="mob-action-btn" onclick="mobGo('membros')">
            <span class="mob-action-ico" style="background:rgba(48,209,88,0.12);color:var(--gr)">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </span>
            <span class="mob-action-lbl">Membros</span>
          </button>
          <button class="mob-action-btn" onclick="mobGo('mais')">
            <span class="mob-action-ico" style="background:var(--violetbg);color:var(--violet)">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </span>
            <span class="mob-action-lbl">Mais</span>
          </button>
        </div>
      </div>

      <!-- Próximos Eventos -->
      <div class="mob-section">
        <div class="mob-section-title">Próximos Eventos</div>
        <div id="m-home-eventos" class="mob-card-list mob-loading-state">Carregando…</div>
      </div>

      <!-- Demandas Recentes -->
      <div class="mob-section" style="padding-bottom:24px">
        <div class="mob-section-title">Demandas em Aberto</div>
        <div id="m-home-demandas" class="mob-card-list mob-loading-state">Carregando…</div>
      </div>
    `;

    await Promise.all([_loadKPIs(), _loadEventos(), _loadDemandas()]);
  }

  /* ── KPIs ──────────────────────────────────────────── */
  async function _loadKPIs() {
    const row = document.getElementById('m-kpi-row');
    if (!row) return;

    const headers = { ...apiHeaders(), 'Prefer': 'count=exact' };

    try {
      const [rDem, rMemb] = await Promise.all([
        fetch(`${apiBaseUrl()}/rest/v1/demandas?status=neq.Conclu%C3%ADda&status=neq.Cancelada&status=neq.Pago&select=id`, { headers }),
        fetch(`${apiBaseUrl()}/rest/v1/v_membros?deleted_at=is.null&select=id`, { headers }),
      ]);

      const cntDem  = _parseCount(rDem.headers.get('content-range'));
      const cntMemb = _parseCount(rMemb.headers.get('content-range'));

      row.innerHTML = `
        <div class="mob-kpi">
          <div class="mob-kpi-val" style="color:var(--rose)">${cntDem}</div>
          <div class="mob-kpi-lbl">Demandas abertas</div>
        </div>
        <div class="mob-kpi">
          <div class="mob-kpi-val" style="color:var(--gr)">${cntMemb}</div>
          <div class="mob-kpi-lbl">Membros ativos</div>
        </div>
        <div class="mob-kpi" id="m-kpi-eventos">
          <div class="mob-kpi-val" style="color:var(--teal)">…</div>
          <div class="mob-kpi-lbl">Esta semana</div>
        </div>
      `;
    } catch (_) {
      row.innerHTML = `
        <div class="mob-kpi"><div class="mob-kpi-val">—</div><div class="mob-kpi-lbl">Demandas abertas</div></div>
        <div class="mob-kpi"><div class="mob-kpi-val">—</div><div class="mob-kpi-lbl">Membros ativos</div></div>
        <div class="mob-kpi"><div class="mob-kpi-val">—</div><div class="mob-kpi-lbl">Esta semana</div></div>
      `;
    }
  }

  /* ── Próximos Eventos ──────────────────────────────── */
  async function _loadEventos() {
    const el = document.getElementById('m-home-eventos');
    if (!el) return;
    try {
      const hoje = _isoDate(0);
      const fim  = _isoDate(7);
      const res  = await fetch(
        `${apiBaseUrl()}/rest/v1/agenda?data_inicio=gte.${hoje}&data_inicio=lte.${fim}&status=eq.confirmado&select=id,titulo,data_inicio,horario_inicio,local&order=data_inicio.asc,horario_inicio.asc&limit=5`,
        { headers: { ...apiHeaders(), 'Prefer': 'count=exact' } }
      );
      const data = await res.json();

      const cnt = _parseCount(res.headers.get('content-range'));
      const kpi = document.getElementById('m-kpi-eventos');
      if (kpi) kpi.querySelector('.mob-kpi-val').textContent = cnt;

      if (!Array.isArray(data) || !data.length) {
        el.innerHTML = `<div class="mob-empty-small">Nenhum evento nos próximos 7 dias.</div>`;
        return;
      }
      el.innerHTML = data.map(ev => `
        <div class="mob-list-item" onclick="mobGo('agenda-evento',{id:'${ev.id}',title:'${_esc(ev.titulo)}'})">
          <div class="mob-list-ico" style="background:var(--tealbg);color:var(--teal)">🗓</div>
          <div class="mob-list-body">
            <div class="mob-list-title">${_esc(ev.titulo)}</div>
            <div class="mob-list-sub">${_fmtDia(ev.data_inicio)}${ev.horario_inicio ? ' · ' + ev.horario_inicio.slice(0,5) : ''}${ev.local ? ' · ' + _esc(ev.local) : ''}</div>
          </div>
          <div class="mob-list-chev">›</div>
        </div>
      `).join('');
    } catch (e) {
      el.innerHTML = `<div class="mob-empty-small">Erro ao carregar eventos.</div>`;
    }
  }

  /* ── Demandas ──────────────────────────────────────── */
  async function _loadDemandas() {
    const el = document.getElementById('m-home-demandas');
    if (!el) return;
    try {
      const res  = await fetch(
        `${apiBaseUrl()}/rest/v1/demandas?status=neq.Conclu%C3%ADda&status=neq.Cancelada&status=neq.Pago&select=id,titulo,status,area&order=criado_em.desc&limit=6`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) {
        el.innerHTML = `<div class="mob-empty-small">Nenhuma demanda em aberto.</div>`;
        return;
      }
      el.innerHTML = data.map(d => `
        <div class="mob-list-item" onclick="mobGo('dem-detalhe',{id:'${d.id}',title:'${_esc(d.titulo || 'Demanda')}'})">
          <div class="mob-list-ico" style="background:var(--rosebg);color:var(--rose)">📋</div>
          <div class="mob-list-body">
            <div class="mob-list-title">${_esc(d.titulo || 'Sem título')}</div>
            <div class="mob-list-sub">${d.area ? _esc(d.area) + ' · ' : ''}${_statusHtml(d.status)}</div>
          </div>
          <div class="mob-list-chev">›</div>
        </div>
      `).join('');
    } catch (_) {
      el.innerHTML = `<div class="mob-empty-small">Erro ao carregar demandas.</div>`;
    }
  }

  /* ── Helpers ───────────────────────────────────────── */
  function _parseCount(cr) {
    if (!cr) return '—';
    const m = cr.match(/\/(\d+)$/);
    return m ? parseInt(m[1]).toLocaleString('pt-BR') : '—';
  }

  function _isoDate(plusDays) {
    const d = new Date();
    d.setDate(d.getDate() + plusDays);
    return d.toISOString().split('T')[0];
  }

  function _fmtDia(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const dt   = new Date(Number(y), Number(m)-1, Number(d));
    const diff = (dt - hoje) / 86400000;
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Amanhã';
    return dt.toLocaleDateString('pt-BR', { weekday:'short', day:'numeric', month:'short' });
  }

  function _fmtDataLonga() {
    return new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
    );
  }

  const _STATUS_COLOR = {
    'Em Análise':   'var(--gold)',
    'Em Andamento': 'var(--violet)',
    'Aguardando Pagamento': 'var(--amber)',
    'Pagamento Agendado':   'var(--blue)',
    'Concluída':    'var(--gr)',
    'Pago':         'var(--gr)',
    'Cancelada':    'var(--tx3)',
    'Pendente':     'var(--amber)',
  };

  function _statusHtml(s) {
    const cor = _STATUS_COLOR[s] || 'var(--tx3)';
    return `<span style="color:${cor}">${_esc(s)}</span>`;
  }

})();
