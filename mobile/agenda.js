/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Agenda
   mobile/agenda.js · v1.3.1
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
  let _filtroAtivo  = 'semana';
  let _espacos      = null;
  let _eventoAtual  = null;

  /* ── Lista ─────────────────────────────────────────── */
  async function renderAgenda(el) {
    el.innerHTML = `
      <div style="padding-bottom:80px">
        <div class="mob-chips" id="ag-chips">
          ${FILTROS.map(f => `
            <button class="mob-chip ${f.key===_filtroAtivo?'active':''}"
                    onclick="_agFiltro('${f.key}')">${f.label}</button>
          `).join('')}
        </div>
        <div id="ag-lista"></div>
      </div>
      <!-- FAB -->
      <button onclick="_agAbrirForm()"
        style="position:fixed;bottom:calc(var(--tab-h) + var(--safe-bottom) + 16px);right:18px;
               z-index:200;width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;
               background:var(--teal,#2dd4bf);color:#fff;font-size:22px;font-weight:300;
               display:flex;align-items:center;justify-content:center;
               box-shadow:0 4px 16px rgba(45,212,191,.45)">
        +
      </button>
    `;
    _carregarEspacos();
    await _carregarAgenda();
  }

  async function _carregarEspacos() {
    const FALLBACK = ['Templo Principal','Salão Anexo','Sala 1','Sala 2','Sala 3','Hall','Auditório','Espaço Externo'];
    try {
      const res  = await fetch(
        `${apiBaseUrl()}/rest/v1/agenda?select=espaco&espaco=not.is.null&limit=500`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      const fromDB = Array.isArray(data)
        ? [...new Set(data.map(r => r.espaco).filter(Boolean))].sort()
        : [];
      _espacos = [...new Set([...fromDB, ...FALLBACK])].sort();
    } catch (_) {
      _espacos = FALLBACK;
    }
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
        `${apiBaseUrl()}/rest/v1/agenda?deleted_at=is.null&data=gte.${hoje}&data=lte.${fim}&status=not.in.(cancelado,recusado,arquivado)&select=id,titulo,tipo,data,hora_inicio,hora_fim,espaco,organizador,status&order=data.asc,hora_inicio.asc&limit=300`,
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
    const cfg  = TIPO_COR[ev.tipo] || { ico:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', cor:'var(--teal)' };
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

      _eventoAtual = ev;

      const cfg    = TIPO_COR[ev.tipo] || { ico:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', cor:'var(--teal)' };
      const hora   = ev.hora_inicio ? ev.hora_inicio.slice(0,5) : null;
      const horaF  = ev.hora_fim    ? ev.hora_fim.slice(0,5)    : null;
      const stLbl  = ev.status === 'confirmado' ? 'Confirmado' : ev.status === 'cancelado' ? 'Cancelado' : 'Pendente';
      const stCor  = ev.status === 'confirmado' ? 'var(--gr)' : ev.status === 'cancelado' ? 'var(--tx3)' : 'var(--amber)';
      const stBg   = ev.status === 'confirmado' ? 'rgba(48,209,88,0.12)' : ev.status === 'cancelado' ? 'rgba(90,96,104,.15)' : 'rgba(234,179,8,.12)';

      el.innerHTML = `
        <div class="mob-detail">
          <div class="mob-detail-hero" style="display:flex;gap:14px;align-items:flex-start">
            <div style="width:48px;height:48px;border-radius:12px;background:var(--tealbg);color:${cfg.cor};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${cfg.ico}</div>
            <div>
              <div class="mob-detail-title">${_esc(ev.titulo)}</div>
              <div class="mob-detail-meta">
                ${ev.tipo ? `<span class="mob-badge" style="background:var(--tealbg);color:var(--teal)">${_esc(ev.tipo)}</span>` : ''}
                <span class="mob-badge" style="background:${stBg};color:${stCor}">${stLbl}</span>
              </div>
            </div>
          </div>

          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Quando e onde</div>
            ${_row('Data', _fmtDia(ev.data))}
            ${hora ? _row('Horário', hora + (horaF ? ' – ' + horaF : '')) : ''}
            ${_row('Local', ev.espaco)}
          </div>

          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Organização</div>
            ${_row('Responsável', ev.responsavel || ev.organizador)}
            ${_row('Solicitante', ev.solicitante)}
          </div>

          ${(ev.observacoes || ev.observacao) ? `
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Observações</div>
            <div style="padding:14px 16px;font-size:14px;color:var(--tx2);line-height:1.6">${_esc(ev.observacoes || ev.observacao)}</div>
          </div>` : ''}

          <div style="padding:0 16px 32px">
            <button class="mob-btn-secondary" onclick="_agAbrirEditForm()">Editar Evento</button>
          </div>
        </div>
      `;
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Evento não encontrado.</div></div>`;
    }
  }

  /* ── Criar Evento ──────────────────────────────────── */
  const TIPOS_AG        = ['Culto','Reunião','Evento','Ensaio','Casamento','Conferência','Congresso','Aniversário'];
  const ESPACOS_FALLBACK = ['Templo Principal','Salão Anexo','Sala 1','Sala 2','Sala 3','Hall','Auditório','Espaço Externo'];

  window._agAbrirForm = function () {
    document.getElementById('ag-form-sheet')?.remove();
    const hoje = new Date().toISOString().split('T')[0];
    const nome = window.MOB_USER?.nome || '';
    const s = document.createElement('div');
    s.id = 'ag-form-sheet';
    s.style.cssText = 'position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;justify-content:flex-end';
    s.innerHTML = `
      <div onclick="document.getElementById('ag-form-sheet')?.remove()"
           style="flex:1;background:rgba(0,0,0,.4)"></div>
      <div style="background:var(--bg-surface);border-radius:18px 18px 0 0;
                  padding:20px 16px;padding-bottom:calc(var(--safe-bottom) + 20px);
                  max-height:92vh;overflow-y:auto">
        <div style="font-size:16px;font-weight:700;color:var(--tx1);margin-bottom:16px;text-align:center">
          Solicitar Evento
        </div>

        <div class="mob-field">
          <label class="mob-label">TÍTULO <span style="color:var(--rose)">*</span></label>
          <input id="ag-f-titulo" class="mob-input" type="text"
                 maxlength="120" placeholder="Ex: Reunião de Liderança">
        </div>

        <div class="mob-field">
          <label class="mob-label">TIPO <span style="color:var(--rose)">*</span></label>
          <select id="ag-f-tipo" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
            ${TIPOS_AG.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="mob-field">
            <label class="mob-label">DATA <span style="color:var(--rose)">*</span></label>
            <input id="ag-f-data" class="mob-input" type="date" value="${hoje}">
          </div>
          <div class="mob-field">
            <label class="mob-label">DATA FIM <span style="color:var(--tx3);font-weight:400">(opcional)</span></label>
            <input id="ag-f-data-fim" class="mob-input" type="date" value="${hoje}">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="mob-field">
            <label class="mob-label">INÍCIO</label>
            <input id="ag-f-hi" class="mob-input" type="time">
          </div>
          <div class="mob-field">
            <label class="mob-label">FIM</label>
            <input id="ag-f-hf" class="mob-input" type="time">
          </div>
        </div>

        <div class="mob-field">
          <label class="mob-label">ESPAÇO</label>
          <select id="ag-f-espaco" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
            <option value="">Selecione (opcional)</option>
            ${(_espacos || ESPACOS_FALLBACK).map(e => `<option value="${e}">${e}</option>`).join('')}
            <option value="__outro__">Outro…</option>
          </select>
        </div>
        <div class="mob-field" id="ag-f-espaco-outro-wrap" style="display:none">
          <label class="mob-label">ESPAÇO (especificar)</label>
          <input id="ag-f-espaco-outro" class="mob-input" type="text" placeholder="Nome do espaço">
        </div>

        <div class="mob-field">
          <label class="mob-label">SOLICITANTE</label>
          <input id="ag-f-sol" class="mob-input" type="text"
                 value="${_esc(nome)}" placeholder="Seu nome">
        </div>

        <div class="mob-field">
          <label class="mob-label">OBSERVAÇÕES <span style="color:var(--tx3);font-weight:400">(opcional)</span></label>
          <textarea id="ag-f-obs" class="mob-input" rows="2" style="resize:none"
                    placeholder="Detalhes, necessidades especiais…"></textarea>
        </div>

        <div id="ag-f-err" style="font-size:13px;color:var(--rose);min-height:16px"></div>
        <button id="ag-f-btn" class="mob-btn-primary" onclick="_agSalvar()">
          Solicitar Evento
        </button>
      </div>
    `;
    document.body.appendChild(s);
    document.getElementById('ag-f-espaco').onchange = function () {
      const outro = document.getElementById('ag-f-espaco-outro-wrap');
      if (outro) outro.style.display = this.value === '__outro__' ? '' : 'none';
    };
  };

  window._agSalvar = async function () {
    const btn    = document.getElementById('ag-f-btn');
    const errEl  = document.getElementById('ag-f-err');
    const titulo = (document.getElementById('ag-f-titulo')?.value || '').trim();
    const tipo   = document.getElementById('ag-f-tipo')?.value || 'Evento';
    const data   = document.getElementById('ag-f-data')?.value || '';
    const dataFim= document.getElementById('ag-f-data-fim')?.value || data;
    const hi     = document.getElementById('ag-f-hi')?.value   || null;
    const hf     = document.getElementById('ag-f-hf')?.value   || null;
    const espSel = document.getElementById('ag-f-espaco')?.value || '';
    const espOutro = (document.getElementById('ag-f-espaco-outro')?.value || '').trim();
    const espaco = espSel === '__outro__' ? espOutro : (espSel || null);
    const sol    = (document.getElementById('ag-f-sol')?.value  || '').trim();
    const obs    = (document.getElementById('ag-f-obs')?.value  || '').trim() || null;

    if (errEl) errEl.textContent = '';
    if (!titulo) { if (errEl) errEl.textContent = 'Informe o título do evento.'; return; }
    if (!data)   { if (errEl) errEl.textContent = 'Informe a data.'; return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }

    try {
      const d       = new Date(data + 'T12:00:00');
      const diaSem  = d.toLocaleDateString('pt-BR', { weekday: 'long' });
      const nomeMes = d.toLocaleDateString('pt-BR', { month: 'long' });
      const payload = {
        titulo,
        tipo,
        data,
        data_encerramento: dataFim || data,
        mes:        nomeMes,
        dia_semana: diaSem,
        hora_inicio: hi || null,
        hora_fim:    hf || null,
        espaco:      espaco || null,
        organizador: sol || null,
        solicitante_txt: sol || null,
        observacao:  obs,
        status:      'pendente',
        visibilidade_publica: false,
      };

      const { error } = await getSupabase().from('agenda').insert(payload);
      if (error) throw error;

      document.getElementById('ag-form-sheet')?.remove();
      mobToast('Evento solicitado — aguardando aprovação');
      await _carregarAgenda();
    } catch (e) {
      if (errEl) errEl.textContent = e.message || 'Erro ao solicitar evento.';
      if (btn) { btn.disabled = false; btn.textContent = 'Solicitar Evento'; }
    }
  };

  /* ── Editar Evento ─────────────────────────────────── */
  window._agAbrirEditForm = function () {
    const ev = _eventoAtual;
    if (!ev) { mobToast('Evento não carregado.', 'error'); return; }

    document.getElementById('ag-edit-sheet')?.remove();
    const s = document.createElement('div');
    s.id = 'ag-edit-sheet';
    s.style.cssText = 'position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;justify-content:flex-end';

    const dataFimVal = ev.data_encerramento || ev.data || '';
    const espValido  = (_espacos || ESPACOS_FALLBACK).includes(ev.espaco || '');
    const espSel     = ev.espaco ? (espValido ? ev.espaco : '__outro__') : '';
    const espOutroVal= espValido ? '' : (ev.espaco || '');

    s.innerHTML = `
      <div onclick="document.getElementById('ag-edit-sheet')?.remove()"
           style="flex:1;background:rgba(0,0,0,.4)"></div>
      <div style="background:var(--bg-surface);border-radius:18px 18px 0 0;
                  padding:20px 16px;padding-bottom:calc(var(--safe-bottom) + 20px);
                  max-height:92vh;overflow-y:auto">
        <div style="font-size:16px;font-weight:700;color:var(--tx1);margin-bottom:16px;text-align:center">
          Editar Evento
        </div>

        <div class="mob-field">
          <label class="mob-label">TÍTULO <span style="color:var(--rose)">*</span></label>
          <input id="ag-e-titulo" class="mob-input" type="text"
                 maxlength="120" value="${_esc(ev.titulo || '')}">
        </div>

        <div class="mob-field">
          <label class="mob-label">TIPO <span style="color:var(--rose)">*</span></label>
          <select id="ag-e-tipo" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
            ${TIPOS_AG.map(t => `<option value="${t}" ${t === ev.tipo ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>

        <div class="mob-field">
          <label class="mob-label">STATUS</label>
          <select id="ag-e-status" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
            <option value="pendente"   ${ev.status === 'pendente'   ? 'selected' : ''}>Pendente</option>
            <option value="confirmado" ${ev.status === 'confirmado' ? 'selected' : ''}>Confirmado</option>
            <option value="cancelado"  ${ev.status === 'cancelado'  ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="mob-field">
            <label class="mob-label">DATA <span style="color:var(--rose)">*</span></label>
            <input id="ag-e-data" class="mob-input" type="date" value="${_esc(ev.data || '')}">
          </div>
          <div class="mob-field">
            <label class="mob-label">DATA FIM</label>
            <input id="ag-e-data-fim" class="mob-input" type="date" value="${_esc(dataFimVal)}">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="mob-field">
            <label class="mob-label">INÍCIO</label>
            <input id="ag-e-hi" class="mob-input" type="time" value="${_esc((ev.hora_inicio || '').slice(0,5))}">
          </div>
          <div class="mob-field">
            <label class="mob-label">FIM</label>
            <input id="ag-e-hf" class="mob-input" type="time" value="${_esc((ev.hora_fim || '').slice(0,5))}">
          </div>
        </div>

        <div class="mob-field">
          <label class="mob-label">ESPAÇO</label>
          <select id="ag-e-espaco" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
            <option value="">Nenhum</option>
            ${(_espacos || ESPACOS_FALLBACK).map(e => `<option value="${e}" ${e === ev.espaco ? 'selected' : ''}>${e}</option>`).join('')}
            <option value="__outro__" ${!espValido && ev.espaco ? 'selected' : ''}>Outro…</option>
          </select>
        </div>
        <div class="mob-field" id="ag-e-espaco-outro-wrap" style="display:${espOutroVal ? '' : 'none'}">
          <label class="mob-label">ESPAÇO (especificar)</label>
          <input id="ag-e-espaco-outro" class="mob-input" type="text" value="${_esc(espOutroVal)}">
        </div>

        <div class="mob-field">
          <label class="mob-label">RESPONSÁVEL</label>
          <input id="ag-e-resp" class="mob-input" type="text"
                 value="${_esc(ev.responsavel || ev.organizador || '')}">
        </div>

        <div class="mob-field">
          <label class="mob-label">OBSERVAÇÕES</label>
          <textarea id="ag-e-obs" class="mob-input" rows="2" style="resize:none">${_esc(ev.observacao || ev.observacoes || '')}</textarea>
        </div>

        <div id="ag-e-err" style="font-size:13px;color:var(--rose);min-height:16px"></div>
        <button id="ag-e-btn" class="mob-btn-primary" onclick="_agSalvarEdit('${_esc(String(ev.id))}')">
          Salvar alterações
        </button>
      </div>
    `;
    document.body.appendChild(s);
    document.getElementById('ag-e-espaco').onchange = function () {
      const outro = document.getElementById('ag-e-espaco-outro-wrap');
      if (outro) outro.style.display = this.value === '__outro__' ? '' : 'none';
    };
  };

  window._agSalvarEdit = async function (evId) {
    const btn    = document.getElementById('ag-e-btn');
    const errEl  = document.getElementById('ag-e-err');
    const titulo = (document.getElementById('ag-e-titulo')?.value || '').trim();
    const tipo   = document.getElementById('ag-e-tipo')?.value   || 'Evento';
    const status = document.getElementById('ag-e-status')?.value || 'pendente';
    const data   = document.getElementById('ag-e-data')?.value   || '';
    const dataFim= document.getElementById('ag-e-data-fim')?.value || data;
    const hi     = document.getElementById('ag-e-hi')?.value     || null;
    const hf     = document.getElementById('ag-e-hf')?.value     || null;
    const espSel = document.getElementById('ag-e-espaco')?.value || '';
    const espOutro = (document.getElementById('ag-e-espaco-outro')?.value || '').trim();
    const espaco = espSel === '__outro__' ? espOutro : (espSel || null);
    const resp   = (document.getElementById('ag-e-resp')?.value  || '').trim() || null;
    const obs    = (document.getElementById('ag-e-obs')?.value   || '').trim() || null;

    if (errEl) errEl.textContent = '';
    if (!titulo) { if (errEl) errEl.textContent = 'Informe o título do evento.'; return; }
    if (!data)   { if (errEl) errEl.textContent = 'Informe a data.'; return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }

    try {
      const d       = new Date(data + 'T12:00:00');
      const diaSem  = d.toLocaleDateString('pt-BR', { weekday: 'long' });
      const nomeMes = d.toLocaleDateString('pt-BR', { month: 'long' });
      const { error } = await getSupabase()
        .from('agenda')
        .update({
          titulo,
          tipo,
          status,
          data,
          data_encerramento: dataFim || data,
          mes:               nomeMes,
          dia_semana:        diaSem,
          hora_inicio:       hi || null,
          hora_fim:          hf || null,
          espaco:            espaco || null,
          organizador:       resp || null,
          observacao:        obs,
          updated_at:        new Date().toISOString(),
        })
        .eq('id', evId);
      if (error) throw error;

      document.getElementById('ag-edit-sheet')?.remove();
      mobToast('Evento atualizado');
      // Re-renderiza o detalhe com dados atualizados
      const reRes = await fetch(
        `${apiBaseUrl()}/rest/v1/agenda?id=eq.${encodeURIComponent(evId)}&select=*&limit=1`,
        { headers: apiHeaders() }
      );
      const [novo] = await reRes.json();
      if (novo) {
        _eventoAtual = novo;
        const conteudo = document.getElementById('mob-content');
        if (conteudo) await renderEvento(conteudo, { id: evId });
      }
    } catch (e) {
      if (errEl) errEl.textContent = e.message || 'Erro ao salvar.';
      if (btn) { btn.disabled = false; btn.textContent = 'Salvar alterações'; }
    }
  };

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
