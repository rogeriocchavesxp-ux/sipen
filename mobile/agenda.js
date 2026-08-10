/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Agenda
   mobile/agenda.js · v1.0.0
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('agenda',        renderAgenda);
  mobRegisterPage('agenda-evento', renderEvento);

  const TIPO_COR = {
    'Culto':        { ico:'⛪', cor:'var(--violet)' },
    'Reunião':      { ico:'🤝', cor:'var(--blue)'   },
    'Evento':       { ico:'🎉', cor:'var(--teal)'   },
    'Ensaio':       { ico:'🎶', cor:'var(--amber)'  },
    'Casamento':    { ico:'💍', cor:'var(--rose)'   },
    'Conferência':  { ico:'🏛', cor:'var(--sky)'    },
    'Congresso':    { ico:'🏛', cor:'var(--sky)'    },
    'Aniversário':  { ico:'🎂', cor:'var(--gold)'   },
  };

  const FILTROS = [
    { key:'semana',   label:'Esta semana',   dias:7  },
    { key:'mes',      label:'Este mês',      dias:30 },
    { key:'proximos', label:'Próximos 90d',  dias:90 },
  ];
  let _filtroAtivo = 'semana';

  /* ── Lista ─────────────────────────────────────────── */
  async function renderAgenda(el) {
    el.innerHTML = `
      <div class="mob-chips" id="ag-chips">
        ${FILTROS.map(f => `
          <button class="mob-chip ${f.key===_filtroAtivo?'active':''}"
                  onclick="_agFiltro('${f.key}')">${f.label}</button>
        `).join('')}
      </div>
      <div id="ag-lista"></div>
    `;
    await _carregarAgenda();
  }

  async function _carregarAgenda() {
    const el = document.getElementById('ag-lista');
    if (!el) return;
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;

    const f    = FILTROS.find(x => x.key === _filtroAtivo) || FILTROS[0];
    const hoje = _isoDate(0);
    const fim  = _isoDate(f.dias);

    try {
      const res  = await fetch(
        `${apiBaseUrl()}/rest/v1/agenda?deleted_at=is.null&data=gte.${hoje}&data=lte.${fim}&status=not.in.(cancelado,recusado,arquivado)&select=id,titulo,tipo,data,hora_inicio,hora_fim,espaco,organizador,status&order=data.asc,hora_inicio.asc&limit=80`,
        { headers: apiHeaders() }
      );
      const data = await res.json();

      if (!Array.isArray(data) || !data.length) {
        el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">🗓</div><div class="mob-empty-text">Nenhum evento no período.</div></div>`;
        return;
      }

      // Agrupar por data
      const grupos = {};
      data.forEach(ev => {
        const dt = ev.data || 'sem-data';
        if (!grupos[dt]) grupos[dt] = [];
        grupos[dt].push(ev);
      });

      el.innerHTML = Object.entries(grupos).map(([dt, evs]) => `
        <div class="mob-day-group">
          <div class="mob-day-hdr ${_isHoje(dt) ? 'mob-day-today' : ''}">${_fmtDia(dt)}</div>
          <div class="mob-card-list" style="margin:0 16px">
            ${evs.map(ev => _eventoRow(ev)).join('')}
          </div>
        </div>
      `).join('') + '<div style="height:24px"></div>';

    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar agenda.</div></div>`;
    }
  }

  function _eventoRow(ev) {
    const cfg  = TIPO_COR[ev.tipo] || { ico:'📅', cor:'var(--teal)' };
    const hora = ev.hora_inicio ? ev.hora_inicio.slice(0,5) : '';
    return `
      <div class="mob-list-item" onclick="mobGo('agenda-evento',{id:'${ev.id}',title:'${_esc(ev.titulo)}'})">
        <div class="mob-list-ico" style="background:var(--tealbg);color:${cfg.cor}">${cfg.ico}</div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(ev.titulo)}</div>
          <div class="mob-list-sub">${hora ? hora + ' · ' : ''}${ev.espaco ? _esc(ev.espaco) : ev.tipo || ''}</div>
        </div>
        <div class="mob-list-chev">›</div>
      </div>
    `;
  }

  window._agFiltro = function (key) {
    _filtroAtivo = key;
    document.querySelectorAll('#ag-chips .mob-chip').forEach((c, i) => {
      c.classList.toggle('active', FILTROS[i].key === key);
    });
    _carregarAgenda();
  };

  /* ── Detalhe ───────────────────────────────────────── */
  async function renderEvento(el, params) {
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;
    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/agenda?id=eq.${encodeURIComponent(params.id)}&select=*&limit=1`,
        { headers: apiHeaders() }
      );
      const [ev] = await res.json();
      if (!ev) throw new Error('não encontrado');

      const cfg   = TIPO_COR[ev.tipo] || { ico:'📅', cor:'var(--teal)' };
      const hora  = ev.hora_inicio ? ev.hora_inicio.slice(0,5) : null;
      const horaF = ev.hora_fim    ? ev.hora_fim.slice(0,5)    : null;

      el.innerHTML = `
        <div class="mob-detail">
          <div class="mob-detail-hero" style="display:flex;gap:14px;align-items:flex-start">
            <div style="width:48px;height:48px;border-radius:12px;background:var(--tealbg);color:${cfg.cor};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${cfg.ico}</div>
            <div>
              <div class="mob-detail-title">${_esc(ev.titulo)}</div>
              <div class="mob-detail-meta">
                ${ev.tipo ? `<span class="mob-badge" style="background:var(--tealbg);color:var(--teal)">${_esc(ev.tipo)}</span>` : ''}
                ${ev.status === 'confirmado' ? `<span class="mob-badge" style="background:rgba(48,209,88,0.12);color:var(--gr)">Confirmado</span>` : ''}
              </div>
            </div>
          </div>

          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Quando e onde</div>
            ${_row('Data', _fmtDia(ev.data_inicio))}
            ${hora ? _row('Horário', hora + (horaF ? ' – ' + horaF : '')) : ''}
            ${_row('Local', ev.espaco)}
          </div>

          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Organização</div>
            ${_row('Responsável', ev.responsavel || ev.organizador)}
            ${_row('Solicitante', ev.solicitante)}
          </div>

          ${ev.observacao ? `
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Observações</div>
            <div style="padding:14px 16px;font-size:14px;color:var(--tx2);line-height:1.6">${_esc(ev.observacao)}</div>
          </div>` : ''}
        </div>
      `;
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Evento não encontrado.</div></div>`;
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

  function _isHoje(iso) {
    return iso === _isoDate(0);
  }

  function _isoDate(plusDays) {
    const d = new Date();
    d.setDate(d.getDate() + plusDays);
    return d.toISOString().split('T')[0];
  }

  function _fmtDia(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const dt   = new Date(Number(y), Number(m)-1, Number(d));
    const diff = (dt - hoje) / 86400000;
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Amanhã';
    return dt.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
    );
  }

})();
