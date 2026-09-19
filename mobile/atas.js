/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Atas e Deliberações
   mobile/atas.js · v1.0.3
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('atas',        renderAtas);
  mobRegisterPage('ata-detalhe', renderAtaDetalhe);
  mobRegisterPage('ata-form',    renderAtaForm);

  /* ── Constantes ──────────────────────────────────── */
  const TIPO_ATA = {
    ORDINARIA:          'Ordinária',
    EXTRAORDINARIA:     'Extraordinária',
    COMISSAO_EXECUTIVA: 'Comissão Executiva',
  };

  const ST_ATA = {
    RASCUNHO:  { label:'Rascunho',  bg:'rgba(212,168,67,.12)',  cor:'var(--gold)' },
    APROVADA:  { label:'Aprovada',  bg:'rgba(48,209,88,.12)',   cor:'var(--gr)'   },
    ARQUIVADA: { label:'Arquivada', bg:'rgba(10,132,255,.12)',  cor:'var(--blue)' },
  };

  const ST_DELIB = {
    APROVADO:    { label:'Aprovado',    bg:'rgba(48,209,88,.12)',   cor:'var(--gr)'    },
    REJEITADO:   { label:'Rejeitado',   bg:'rgba(224,85,85,.12)',   cor:'var(--rose)'  },
    ENCAMINHADO: { label:'Encaminhado', bg:'rgba(139,111,212,.12)', cor:'var(--violet)'},
    EM_ANALISE:  { label:'Em Análise',  bg:'rgba(212,168,67,.12)',  cor:'var(--gold)'  },
  };

  const ST_DEM = {
    ABERTA:       { label:'Aberta',       bg:'rgba(10,132,255,.12)',  cor:'var(--blue)'  },
    EM_ANALISE:   { label:'Em Análise',   bg:'rgba(212,168,67,.12)',  cor:'var(--gold)'  },
    EM_ANDAMENTO: { label:'Em Andamento', bg:'rgba(139,111,212,.12)', cor:'var(--violet)'},
    PENDENTE:     { label:'Pendente',     bg:'rgba(234,138,42,.12)',  cor:'var(--amber)' },
    CONCLUIDA:    { label:'Concluída',    bg:'rgba(48,209,88,.12)',   cor:'var(--gr)'    },
    CANCELADA:    { label:'Cancelada',    bg:'rgba(90,96,104,.15)',   cor:'var(--tx3)'   },
  };

  /* ── Estado ──────────────────────────────────────── */
  let _cache     = null;
  let _filtro    = 'todas';
  let _busca     = '';
  let _ataEd     = null;  // ata em edição (para o form)
  let _delibsEd  = [];    // deliberações temporárias no form

  /* ── Helpers ─────────────────────────────────────── */
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

  function _hoje() { return new Date().toISOString().split('T')[0]; }
  function _atrasada(prazo) { return !!prazo && prazo < _hoje(); }
  function _tipoLabel(t) { return TIPO_ATA[t] || t || '—'; }

  function _pillAta(st) {
    const s = ST_ATA[st] || { label: st || '—', bg:'rgba(90,96,104,.15)', cor:'var(--tx3)' };
    return `<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;background:${s.bg};color:${s.cor}">${s.label}</span>`;
  }

  function _pillDelib(st) {
    const s = ST_DELIB[st] || { label: st || '—', bg:'rgba(90,96,104,.15)', cor:'var(--tx3)' };
    return `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;white-space:nowrap;background:${s.bg};color:${s.cor}">${s.label}</span>`;
  }

  function _pillDem(st) {
    const s = ST_DEM[st] || { label: (st || '—').replace(/_/g,' '), bg:'rgba(90,96,104,.15)', cor:'var(--tx3)' };
    return `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;white-space:nowrap;background:${s.bg};color:${s.cor}">${s.label}</span>`;
  }

  /* ════════════════════════════════════════════════════
     LISTA
  ════════════════════════════════════════════════════ */
  async function renderAtas(el) {
    _cache  = null;
    _filtro = 'todas';
    _busca  = '';

    el.innerHTML = `
      <div style="padding-bottom:80px">
        <div id="atas-kpi" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:14px 16px 0">
          ${[0,1,2].map(() => `<div style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:12px;padding:12px 8px;text-align:center">
            <div class="mob-skeleton" style="height:22px;width:32px;margin:0 auto 4px;border-radius:6px"></div>
            <div class="mob-skeleton" style="height:12px;width:100%;border-radius:4px"></div>
          </div>`).join('')}
        </div>

        <div class="mob-chips" id="atas-chips">
          ${['todas','RASCUNHO','APROVADA','ARQUIVADA'].map((k,i) => {
            const labels = ['Todas','Rascunho','Aprovada','Arquivada'];
            return `<button class="mob-chip ${k==='todas'?'active':''}" data-key="${k}"
                      onclick="_atasFiltro('${k}')">${labels[i]}</button>`;
          }).join('')}
        </div>

        <div class="mob-search-wrap">
          <input class="mob-search" type="search" placeholder="Buscar número, presidente, secretário…"
                 oninput="_atasBusca(this.value)" onsearch="_atasBusca(this.value)">
        </div>

        <div id="atas-lista" class="mob-section">
          <div class="mob-card-list mob-loading-state">Carregando…</div>
        </div>
      </div>

      <!-- FAB -->
      <button onclick="mobGo('ata-form',{title:'Nova Ata'})"
        style="position:fixed;bottom:calc(var(--tab-h) + var(--safe-bottom) + 16px);right:18px;
               z-index:200;width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;
               background:var(--blue);color:#fff;font-size:22px;font-weight:300;
               display:flex;align-items:center;justify-content:center;
               box-shadow:0 4px 16px rgba(10,132,255,.45)">
        +
      </button>
    `;

    await Promise.all([_carregarAtas(), _carregarKPIs()]);
  }

  async function _carregarAtas() {
    const el = document.getElementById('atas-lista');
    if (!el) return;
    try {
      const res  = await fetch(
        `${apiBaseUrl()}/rest/v1/atas?select=id,numero,tipo,data,presidente,secretario,sintese,status&order=data.desc,numero.desc&limit=500`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      _cache = Array.isArray(data) ? data : [];
      _renderLista(el);
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar atas.</div></div>`;
    }
  }

  async function _carregarKPIs() {
    const kpiEl = document.getElementById('atas-kpi');
    if (!kpiEl) return;
    const h = { ...apiHeaders(), Prefer: 'count=exact' };
    try {
      const [rTotal, rRasc, rDelibs] = await Promise.all([
        fetch(`${apiBaseUrl()}/rest/v1/atas?select=id`, { headers: h }),
        fetch(`${apiBaseUrl()}/rest/v1/atas?status=eq.RASCUNHO&select=id`, { headers: h }),
        fetch(`${apiBaseUrl()}/rest/v1/atas_deliberacoes?select=id`, { headers: h }),
      ]);
      const cnt = r => { const m = (r.headers.get('content-range')||'').match(/\/(\d+)$/); return m ? parseInt(m[1]) : '—'; };
      const KPI = (val, lbl, cor) => `
        <div style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:12px;padding:12px 8px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:${cor};line-height:1">${val}</div>
          <div style="font-size:11px;color:var(--tx3);margin-top:3px">${lbl}</div>
        </div>`;
      kpiEl.innerHTML =
        KPI(cnt(rTotal),  'Total de atas',    'var(--blue)')  +
        KPI(cnt(rRasc),   'Rascunhos',         'var(--gold)')  +
        KPI(cnt(rDelibs), 'Deliberações',      'var(--violet)');
    } catch (_) { /* silencioso */ }
  }

  function _renderLista(el) {
    if (!el || !_cache) return;
    const q = _busca.toLowerCase();
    let rows = _cache.filter(a => {
      if (_filtro !== 'todas' && a.status !== _filtro) return false;
      if (q && ![a.numero, a.presidente, a.secretario, a.sintese].some(v => (v||'').toLowerCase().includes(q))) return false;
      return true;
    });

    if (!rows.length) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">📋</div><div class="mob-empty-text">Nenhuma ata encontrada.</div></div>`;
      return;
    }

    el.innerHTML = `
      <div class="mob-card-list">
        ${rows.map(a => {
          const st  = ST_ATA[a.status] || { label: a.status || '—', bg:'rgba(90,96,104,.15)', cor:'var(--tx3)' };
          const tipo = _tipoLabel(a.tipo);
          return `
            <div class="mob-list-item" onclick="mobGo('ata-detalhe',{id:'${a.id}',title:'Ata ${_esc(a.numero||'')}'})">
              <div class="mob-list-ico" style="background:var(--bluebg,rgba(10,132,255,.1));color:var(--blue);font-size:13px;font-weight:700;border-radius:10px;font-family:var(--mono)">
                ${a.numero ? _esc(a.numero).slice(-3) : '—'}
              </div>
              <div class="mob-list-body">
                <div class="mob-list-title">Ata ${_esc(a.numero||'—')} · ${_esc(tipo)}</div>
                <div class="mob-list-sub">${_fmtData(a.data)}${a.presidente ? ' · ' + _esc(a.presidente) : ''}</div>
              </div>
              <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:${st.bg};color:${st.cor};white-space:nowrap;flex-shrink:0">${st.label}</span>
            </div>`;
        }).join('')}
      </div>
      <div style="padding:10px 0 6px;text-align:center;font-size:11px;color:var(--tx4)">${rows.length} ata${rows.length !== 1 ? 's' : ''}</div>
    `;
  }

  window._atasFiltro = function (key) {
    _filtro = key;
    document.querySelectorAll('#atas-chips .mob-chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.key === key);
    });
    const el = document.getElementById('atas-lista');
    if (el) _renderLista(el);
  };

  let _buscaTimer = null;
  window._atasBusca = function (val) {
    _busca = val;
    clearTimeout(_buscaTimer);
    _buscaTimer = setTimeout(() => {
      const el = document.getElementById('atas-lista');
      if (el) _renderLista(el);
    }, 250);
  };

  /* ════════════════════════════════════════════════════
     DETALHE
  ════════════════════════════════════════════════════ */
  async function renderAtaDetalhe(el, params) {
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;
    try {
      const [ataRows, deliberRows, demRows] = await Promise.all([
        fetch(`${apiBaseUrl()}/rest/v1/atas?id=eq.${encodeURIComponent(params.id)}&select=*&limit=1`, { headers: apiHeaders() }).then(r => r.json()),
        fetch(`${apiBaseUrl()}/rest/v1/atas_deliberacoes?ata_id=eq.${encodeURIComponent(params.id)}&select=*&order=created_at.asc&limit=100`, { headers: apiHeaders() }).then(r => r.json()),
        fetch(`${apiBaseUrl()}/rest/v1/demandas?ata_id=eq.${encodeURIComponent(params.id)}&select=id,titulo,area,status,responsavel,responsavel_txt,prazo,data_prazo&order=criado_em.desc&limit=50`, { headers: apiHeaders() }).then(r => r.json()).catch(() => []),
      ]);

      const ata    = ataRows[0];
      if (!ata) throw new Error('não encontrada');
      const delibs = Array.isArray(deliberRows) ? deliberRows : [];
      const dems   = Array.isArray(demRows) ? demRows : [];
      const st     = ST_ATA[ata.status] || { label: ata.status || '—', bg:'rgba(90,96,104,.15)', cor:'var(--tx3)' };
      const tipo   = _tipoLabel(ata.tipo);

      el.innerHTML = `
        <div class="mob-detail" style="padding-bottom:80px">
          <!-- Cabeçalho -->
          <div style="padding:20px 16px;background:var(--bg-surface);border-bottom:1px solid var(--bd1)">
            <div style="display:flex;align-items:flex-start;gap:12px">
              <div style="width:44px;height:44px;border-radius:10px;background:var(--bluebg,rgba(10,132,255,.1));color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;font-family:var(--mono)">
                ${ata.numero ? _esc(ata.numero).slice(-3) : '—'}
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:17px;font-weight:700;color:var(--tx1);line-height:1.3">Ata ${_esc(ata.numero||'—')} — ${_esc(tipo)}</div>
                <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap">
                  ${_pillAta(ata.status)}
                  <span style="font-size:12px;color:var(--tx3)">${_fmtData(ata.data)}</span>
                  ${ata.hora_inicio ? `<span style="font-size:12px;color:var(--tx3)">${ata.hora_inicio}${ata.hora_fim ? ' – ' + ata.hora_fim : ''}</span>` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- Info principal -->
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Informações</div>
            ${_row('Data',        _fmtData(ata.data))}
            ${_row('Tipo',        tipo)}
            ${_row('Local',       ata.local)}
            ${_row('Presidente',  ata.presidente)}
            ${_row('Secretário',  ata.secretario)}
            ${ata.sintese ? `
            <div class="mob-detail-row" style="align-items:flex-start">
              <div class="mob-detail-row-key">Síntese</div>
              <div class="mob-detail-row-val" style="white-space:pre-wrap;line-height:1.5">${_esc(ata.sintese)}</div>
            </div>` : ''}
          </div>

          <!-- Deliberações -->
          <div class="mob-detail-card">
            <div class="mob-detail-card-title" style="display:flex;align-items:center;justify-content:space-between">
              <span>Deliberações <span style="font-size:11px;font-weight:400;color:var(--tx3)">(${delibs.length})</span></span>
              ${ata.status !== 'APROVADA' && ata.status !== 'ARQUIVADA' ? `
                <button onclick="_ataAbrirFormDelib('${ata.id}', null)"
                  style="border:none;background:var(--blue);color:#fff;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer">
                  + Adicionar
                </button>` : ''}
            </div>
            ${!delibs.length ? `<div style="padding:12px 16px;font-size:13px;color:var(--tx3)">Nenhuma deliberação.</div>` :
              delibs.map(d => {
                const ds = ST_DELIB[d.tipo] || { label: d.tipo || '—', bg:'rgba(90,96,104,.15)', cor:'var(--tx3)' };
                const atrasada = _atrasada(d.prazo);
                return `
                  <div style="padding:10px 16px;border-bottom:1px solid var(--bd1)${atrasada ? ';background:rgba(224,85,85,.04)' : ''}">
                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
                      <div style="flex:1;min-width:0">
                        <div style="font-size:14px;color:var(--tx1);line-height:1.4">${_esc(d.descricao || '—')}</div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;align-items:center">
                          ${_pillDelib(d.tipo)}
                          ${d.departamento ? `<span style="font-size:11px;color:var(--tx3)">${_esc(d.departamento)}</span>` : ''}
                          ${d.responsavel  ? `<span style="font-size:11px;color:var(--tx3)">· ${_esc(d.responsavel)}</span>` : ''}
                          ${d.prazo ? `<span style="font-size:11px;color:${atrasada ? 'var(--rose)' : 'var(--tx3)'}">Prazo: ${_fmtData(d.prazo)}${atrasada ? ' ⚠' : ''}</span>` : ''}
                          ${d.demanda_id ? `<span style="font-size:10px;background:rgba(48,209,88,.12);color:var(--gr);padding:1px 7px;border-radius:8px;font-weight:600">✓ Demanda gerada</span>` : ''}
                        </div>
                      </div>
                      ${ata.status !== 'APROVADA' && ata.status !== 'ARQUIVADA' ? `
                        <button onclick="_ataAbrirFormDelib('${ata.id}','${d.id}')"
                          style="border:1px solid var(--bd2);background:none;color:var(--tx2);border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer;flex-shrink:0">
                          ✎
                        </button>` : ''}
                    </div>
                  </div>`;
              }).join('')
            }
          </div>

          <!-- Demandas geradas -->
          ${dems.length > 0 ? `
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Demandas geradas <span style="font-size:11px;font-weight:400;color:var(--tx3)">(${dems.length})</span></div>
            <div class="mob-card-list" style="margin:0">
              ${dems.map(d => {
                const dst  = ST_DEM[d.status] || { label: d.status || '—', bg:'rgba(90,96,104,.15)', cor:'var(--tx3)' };
                const praz = d.prazo || d.data_prazo;
                const at   = _atrasada(praz);
                return `
                  <div class="mob-list-item">
                    <div class="mob-list-ico" style="background:var(--rosebg,rgba(224,85,85,.1));color:var(--rose)">📋</div>
                    <div class="mob-list-body">
                      <div class="mob-list-title">${_esc(d.titulo || 'Sem título')}</div>
                      <div class="mob-list-sub" style="${at ? 'color:var(--rose)' : ''}">
                        ${d.area ? _esc(d.area) + ' · ' : ''}${praz ? (at ? 'Vencido ' : 'Prazo ') + _fmtData(praz) : ''}
                      </div>
                    </div>
                    ${_pillDem(d.status)}
                  </div>`;
              }).join('')}
            </div>
          </div>` : (ata.status === 'APROVADA' ? `
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Demandas geradas</div>
            <div style="padding:12px 16px;font-size:13px;color:var(--tx3)">Nenhuma demanda vinculada a esta ata.</div>
          </div>` : '')}

          <!-- Ações -->
          <div style="padding:0 16px 32px;display:flex;flex-direction:column;gap:10px">
            ${ata.status === 'RASCUNHO' ? `
              <button class="mob-btn-primary" onclick="_ataAprovar('${ata.id}')">Aprovar Ata</button>
              <button class="mob-btn-secondary" onclick="mobGo('ata-form',{id:'${ata.id}',title:'Editar Ata'})">Editar Ata</button>
            ` : ata.status === 'ARQUIVADA' ? '' : `
              <button class="mob-btn-secondary" style="opacity:.6" disabled>Ata Aprovada</button>
            `}
          </div>
        </div>
      `;
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Ata não encontrada.</div></div>`;
    }
  }

  /* ════════════════════════════════════════════════════
     FORMULÁRIO (Criar / Editar)
  ════════════════════════════════════════════════════ */
  async function renderAtaForm(el, params) {
    _ataEd    = null;
    _delibsEd = [];

    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;

    if (params?.id) {
      try {
        const [ataRows, delibRows] = await Promise.all([
          fetch(`${apiBaseUrl()}/rest/v1/atas?id=eq.${encodeURIComponent(params.id)}&select=*&limit=1`, { headers: apiHeaders() }).then(r => r.json()),
          fetch(`${apiBaseUrl()}/rest/v1/atas_deliberacoes?ata_id=eq.${encodeURIComponent(params.id)}&select=*&order=created_at.asc&limit=100`, { headers: apiHeaders() }).then(r => r.json()),
        ]);
        _ataEd    = ataRows[0] || null;
        _delibsEd = Array.isArray(delibRows) ? delibRows : [];
      } catch (_) { /* usa null */ }
    }

    _renderFormHtml(el);
  }

  function _renderFormHtml(el) {
    const a    = _ataEd;
    const hoje = _hoje();

    el.innerHTML = `
      <div style="padding:0 0 32px">
        <!-- Dados da Ata -->
        <div class="mob-detail-card">
          <div class="mob-detail-card-title">${a ? 'Editar Ata' : 'Nova Ata'}</div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 16px">
            <div class="mob-field">
              <label class="mob-label">NÚMERO <span style="color:var(--rose)">*</span></label>
              <input id="af-numero" class="mob-input" type="text"
                     value="${_esc(a?.numero||'')}" placeholder="Ex: 001/2025">
            </div>
            <div class="mob-field">
              <label class="mob-label">TIPO <span style="color:var(--rose)">*</span></label>
              <select id="af-tipo" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
                <option value="">Selecione</option>
                ${Object.entries(TIPO_ATA).map(([v,l]) =>
                  `<option value="${v}" ${a?.tipo===v?'selected':''}>${l}</option>`
                ).join('')}
              </select>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 16px">
            <div class="mob-field">
              <label class="mob-label">DATA <span style="color:var(--rose)">*</span></label>
              <input id="af-data" class="mob-input" type="date" value="${_esc(a?.data||hoje)}">
            </div>
            <div class="mob-field">
              <label class="mob-label">LOCAL</label>
              <input id="af-local" class="mob-input" type="text"
                     value="${_esc(a?.local||'')}" placeholder="Ex: Sala do Conselho">
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 16px">
            <div class="mob-field">
              <label class="mob-label">HORA INÍCIO</label>
              <input id="af-hi" class="mob-input" type="time" value="${_esc(a?.hora_inicio||'')}">
            </div>
            <div class="mob-field">
              <label class="mob-label">HORA FIM</label>
              <input id="af-hf" class="mob-input" type="time" value="${_esc(a?.hora_fim||'')}">
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 16px">
            <div class="mob-field">
              <label class="mob-label">PRESIDENTE</label>
              <input id="af-pres" class="mob-input" type="text"
                     value="${_esc(a?.presidente||'')}" placeholder="Nome do presidente">
            </div>
            <div class="mob-field">
              <label class="mob-label">SECRETÁRIO</label>
              <input id="af-sec" class="mob-input" type="text"
                     value="${_esc(a?.secretario||'')}" placeholder="Nome do secretário">
            </div>
          </div>

          <div class="mob-field" style="padding:0 16px">
            <label class="mob-label">SÍNTESE / PAUTA</label>
            <textarea id="af-sintese" class="mob-input" rows="3" style="resize:none"
                      placeholder="Descrição geral da reunião e pauta principal…">${_esc(a?.sintese||'')}</textarea>
          </div>

          <div id="af-err" style="padding:0 16px;font-size:13px;color:var(--rose);min-height:16px"></div>

          <div style="padding:12px 16px 0;display:flex;gap:10px">
            <button class="mob-btn-secondary" style="flex:1" onclick="mobBack()">Cancelar</button>
            <button id="af-btn" class="mob-btn-primary" style="flex:2"
                    onclick="_ataSalvar()">
              ${a ? 'Salvar Alterações' : 'Criar Ata'}
            </button>
          </div>
        </div>

        <!-- Deliberações (só após salvar) -->
        <div id="af-delib-section" style="${_ataEd ? '' : 'display:none'}">
          ${_ataEd ? _renderDelibSection() : ''}
        </div>
      </div>
    `;
  }

  function _renderDelibSection() {
    return `
      <div class="mob-detail-card">
        <div class="mob-detail-card-title" style="display:flex;align-items:center;justify-content:space-between">
          <span>Deliberações <span style="font-size:11px;font-weight:400;color:var(--tx3)">(${_delibsEd.length})</span></span>
          <button onclick="_ataAbrirFormDelib('${_ataEd?.id}', null)"
            style="border:none;background:var(--blue);color:#fff;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer">
            + Adicionar
          </button>
        </div>
        ${!_delibsEd.length ? `<div style="padding:12px 16px;font-size:13px;color:var(--tx3)">Nenhuma deliberação ainda.</div>` :
          _delibsEd.map(d => {
            const atrasada = _atrasada(d.prazo);
            return `
              <div style="padding:10px 16px;border-bottom:1px solid var(--bd1)${atrasada ? ';background:rgba(224,85,85,.04)' : ''}">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13px;color:var(--tx1)">${_esc(d.descricao || '—')}</div>
                    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;align-items:center">
                      ${_pillDelib(d.tipo)}
                      ${d.departamento ? `<span style="font-size:11px;color:var(--tx3)">${_esc(d.departamento)}</span>` : ''}
                      ${d.prazo ? `<span style="font-size:11px;color:${atrasada ? 'var(--rose)' : 'var(--tx3)'}">Prazo: ${_fmtData(d.prazo)}${atrasada ? ' ⚠' : ''}</span>` : ''}
                    </div>
                  </div>
                  <div style="display:flex;gap:4px;flex-shrink:0">
                    <button onclick="_ataAbrirFormDelib('${_ataEd?.id}','${d.id}')"
                      style="border:1px solid var(--bd2);background:none;color:var(--tx2);border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer">
                      ✎
                    </button>
                    <button onclick="_ataRemoverDelib('${d.id}')"
                      style="border:1px solid rgba(224,85,85,.3);background:none;color:var(--rose);border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer">
                      ×
                    </button>
                  </div>
                </div>
              </div>`;
          }).join('')
        }
      </div>
    `;
  }

  window._ataSalvar = async function () {
    const btn    = document.getElementById('af-btn');
    const errEl  = document.getElementById('af-err');
    const numero = (document.getElementById('af-numero')?.value || '').trim();
    const tipo   = document.getElementById('af-tipo')?.value || '';
    const data   = document.getElementById('af-data')?.value || '';

    if (errEl) errEl.textContent = '';
    if (!numero) { if (errEl) errEl.textContent = 'Informe o número da ata.'; return; }
    if (!tipo)   { if (errEl) errEl.textContent = 'Selecione o tipo.'; return; }
    if (!data)   { if (errEl) errEl.textContent = 'Informe a data.'; return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }

    const payload = {
      numero,
      tipo,
      data,
      hora_inicio: document.getElementById('af-hi')?.value      || null,
      hora_fim:    document.getElementById('af-hf')?.value      || null,
      local:       (document.getElementById('af-local')?.value  || '').trim() || null,
      presidente:  (document.getElementById('af-pres')?.value   || '').trim() || null,
      secretario:  (document.getElementById('af-sec')?.value    || '').trim() || null,
      sintese:     (document.getElementById('af-sintese')?.value || '').trim() || null,
    };

    try {
      const sb = getSupabase();
      let savedAta;
      if (_ataEd) {
        const { data: rows, error } = await sb.from('atas').update(payload).eq('id', _ataEd.id).select();
        if (error) throw error;
        savedAta = rows?.[0] || { ..._ataEd, ...payload };
      } else {
        payload.status = 'RASCUNHO';
        const { data: rows, error } = await sb.from('atas').insert(payload).select();
        if (error) throw error;
        savedAta = rows?.[0];
        if (!savedAta) throw new Error('Erro ao obter ata criada.');
      }

      _ataEd = savedAta;
      _cache = null;
      mobToast(_ataEd ? 'Ata atualizada.' : 'Ata criada! Adicione as deliberações abaixo.');

      if (btn) { btn.disabled = false; btn.textContent = 'Salvar Alterações'; }

      // Mostra seção de deliberações
      const sec = document.getElementById('af-delib-section');
      if (sec) { sec.style.display = ''; sec.innerHTML = _renderDelibSection(); }

    } catch (e) {
      if (errEl) errEl.textContent = e.message || 'Erro ao salvar.';
      if (btn) { btn.disabled = false; btn.textContent = _ataEd ? 'Salvar Alterações' : 'Criar Ata'; }
    }
  };

  window._ataAprovar = async function (ataId) {
    // Validação antes de confirmar
    try {
      const [ataRows, deliberRows] = await Promise.all([
        fetch(`${apiBaseUrl()}/rest/v1/atas?id=eq.${encodeURIComponent(ataId)}&select=numero,presidente,secretario&limit=1`, { headers: apiHeaders() }).then(r => r.json()),
        fetch(`${apiBaseUrl()}/rest/v1/atas_deliberacoes?ata_id=eq.${encodeURIComponent(ataId)}&select=id&limit=1`, { headers: apiHeaders() }).then(r => r.json()),
      ]);
      const ata = Array.isArray(ataRows) ? ataRows[0] : null;
      if (ata) {
        const erros = [];
        if (!(ata.presidente || '').trim()) erros.push('presidente não preenchido');
        if (!(ata.secretario || '').trim()) erros.push('secretário não preenchido');
        if (!Array.isArray(deliberRows) || !deliberRows.length) erros.push('nenhuma deliberação registrada');
        if (erros.length) {
          mobToast('Não é possível aprovar: ' + erros.join(', ') + '.', 'error');
          return;
        }
      }
    } catch (_) { /* prossegue se validação não acessível */ }

    if (!confirm('Aprovar esta ata? O banco irá gerar automaticamente as demandas das deliberações encaminhadas.')) return;
    try {
      const { error } = await getSupabase().from('atas').update({ status: 'APROVADA' }).eq('id', ataId);
      if (error) throw error;
      _cache = null;
      mobToast('Ata aprovada. Demandas geradas automaticamente.');
      mobBack();
    } catch (e) {
      mobToast('Erro: ' + (e.message || 'falha'), 'error');
    }
  };

  /* ── Formulário de Deliberação (bottom sheet) ────── */
  window._ataAbrirFormDelib = function (ataId, delibId) {
    const d = _delibsEd.find(x => x.id === delibId) || null;
    document.getElementById('ata-delib-sheet')?.remove();
    const s = document.createElement('div');
    s.id = 'ata-delib-sheet';
    s.style.cssText = 'position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;justify-content:flex-end';
    s.innerHTML = `
      <div onclick="document.getElementById('ata-delib-sheet')?.remove()"
           style="flex:1;background:rgba(0,0,0,.4)"></div>
      <div style="background:var(--bg-surface);border-radius:18px 18px 0 0;
                  padding:20px 16px;padding-bottom:calc(var(--safe-bottom) + 20px);
                  max-height:92vh;overflow-y:auto">
        <div style="font-size:16px;font-weight:700;color:var(--tx1);margin-bottom:16px;text-align:center">
          ${d ? 'Editar Deliberação' : 'Nova Deliberação'}
        </div>

        <div class="mob-field">
          <label class="mob-label">DESCRIÇÃO <span style="color:var(--rose)">*</span></label>
          <textarea id="dl-desc" class="mob-input" rows="3" style="resize:none"
                    placeholder="Descreva a deliberação…">${_esc(d?.descricao||'')}</textarea>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="mob-field">
            <label class="mob-label">TIPO <span style="color:var(--rose)">*</span></label>
            <select id="dl-tipo" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
              <option value="">Selecione</option>
              ${Object.entries(ST_DELIB).map(([v,s]) =>
                `<option value="${v}" ${d?.tipo===v?'selected':''}>${s.label}</option>`
              ).join('')}
            </select>
          </div>
          <div class="mob-field">
            <label class="mob-label">DEPARTAMENTO</label>
            <input id="dl-dept" class="mob-input" type="text"
                   value="${_esc(d?.departamento||'')}" placeholder="Ex: Financeiro">
          </div>
          <div class="mob-field">
            <label class="mob-label">RESPONSÁVEL</label>
            <input id="dl-resp" class="mob-input" type="text"
                   value="${_esc(d?.responsavel||'')}" placeholder="Nome">
          </div>
          <div class="mob-field">
            <label class="mob-label">PRAZO</label>
            <input id="dl-prazo" class="mob-input" type="date" value="${_esc(d?.prazo||'')}">
          </div>
        </div>

        <div class="mob-field">
          <label class="mob-label">PRIORIDADE</label>
          <select id="dl-prio" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
            ${['Baixa','Média','Alta','Urgente'].map(p =>
              `<option value="${p}" ${(d?.prioridade||'Média')===p?'selected':''}>${p}</option>`
            ).join('')}
          </select>
        </div>

        <label style="display:flex;align-items:center;gap:10px;padding:4px 0 12px;cursor:pointer;font-size:14px;color:var(--tx2)">
          <input type="checkbox" id="dl-gerar" style="width:16px;height:16px"
                 ${(!d || d.gerar_demanda !== false) ? 'checked' : ''}>
          Gerar demanda automaticamente
        </label>

        <div id="dl-err" style="font-size:13px;color:var(--rose);min-height:16px"></div>
        <button id="dl-btn" class="mob-btn-primary"
                onclick="_ataSalvarDelib('${ataId}',${d ? `'${d.id}'` : 'null'})">
          ${d ? 'Salvar' : 'Adicionar'}
        </button>
      </div>
    `;
    document.body.appendChild(s);
  };

  window._ataSalvarDelib = async function (ataId, delibId) {
    const btn   = document.getElementById('dl-btn');
    const errEl = document.getElementById('dl-err');
    const desc  = (document.getElementById('dl-desc')?.value  || '').trim();
    const tipo  = document.getElementById('dl-tipo')?.value   || '';

    if (errEl) errEl.textContent = '';
    if (!desc) { if (errEl) errEl.textContent = 'Informe a descrição.'; return; }
    if (!tipo) { if (errEl) errEl.textContent = 'Selecione o tipo.'; return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }

    const payload = {
      ata_id:       ataId,
      descricao:    desc,
      tipo,
      departamento: (document.getElementById('dl-dept')?.value  || '').trim() || null,
      responsavel:  (document.getElementById('dl-resp')?.value  || '').trim() || null,
      prazo:        document.getElementById('dl-prazo')?.value  || null,
      prioridade:   document.getElementById('dl-prio')?.value   || 'Média',
      gerar_demanda: document.getElementById('dl-gerar')?.checked ?? true,
    };

    try {
      const sb = getSupabase();
      if (delibId) {
        const { error } = await sb.from('atas_deliberacoes').update(payload).eq('id', delibId);
        if (error) throw error;
        const idx = _delibsEd.findIndex(x => x.id === delibId);
        if (idx >= 0) _delibsEd[idx] = { ..._delibsEd[idx], ...payload };
      } else {
        const { data: rows, error } = await sb.from('atas_deliberacoes').insert(payload).select();
        if (error) throw error;
        if (rows?.[0]) _delibsEd.push(rows[0]);
      }

      document.getElementById('ata-delib-sheet')?.remove();
      mobToast(delibId ? 'Deliberação atualizada.' : 'Deliberação adicionada.');

      // Atualiza seções
      const sec = document.getElementById('af-delib-section');
      if (sec) sec.innerHTML = _renderDelibSection();

    } catch (e) {
      if (errEl) errEl.textContent = e.message || 'Erro ao salvar.';
      if (btn) { btn.disabled = false; btn.textContent = delibId ? 'Salvar' : 'Adicionar'; }
    }
  };

  window._ataRemoverDelib = async function (delibId) {
    if (!confirm('Remover esta deliberação?')) return;
    try {
      const { error } = await getSupabase().from('atas_deliberacoes').delete().eq('id', delibId);
      if (error) throw error;
      _delibsEd = _delibsEd.filter(x => x.id !== delibId);
      const sec = document.getElementById('af-delib-section');
      if (sec) sec.innerHTML = _renderDelibSection();
      mobToast('Deliberação removida.');
    } catch (e) {
      mobToast('Erro: ' + (e.message || 'falha'), 'error');
    }
  };

  /* ── Helpers de detalhe ──────────────────────────── */
  function _row(label, val) {
    if (!val) return '';
    return `
      <div class="mob-detail-row">
        <div class="mob-detail-row-key">${label}</div>
        <div class="mob-detail-row-val">${_esc(String(val))}</div>
      </div>`;
  }

})();
