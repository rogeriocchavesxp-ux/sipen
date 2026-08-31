/* ═══════════════════════════════════════════════════════
   SIPEN — Frequência de Cultos
   modules/frequencia/index.js · v1.1.0
═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Helpers ─────────────────────────────────────────── */
  const _sb  = () => getSupabase();
  const _esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const _fmt = n  => (n || 0).toLocaleString('pt-BR');

  function _fmtData(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    const dias  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return `${dias[dt.getDay()]}, ${d} ${meses[Number(m)-1]}`;
  }

  function _mesLabel(iso) {
    const [y, m] = iso.split('-');
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${meses[Number(m)-1]}/${y.slice(2)}`;
  }

  /* ── Estado ──────────────────────────────────────────── */
  let _congs    = [];
  let _registros = [];
  let _filtros  = { cong: '', tipo: '', mes: '' };

  /* ── Render principal ────────────────────────────────── */
  async function renderFreqDash() {
    const el = document.getElementById('v-freq-dash');
    if (!el) return;

    el.innerHTML = `
      <div class="mod-header">
        <div>
          <div class="mod-title">Frequência de Cultos</div>
          <div class="mod-sub">Registros de participação por congregação</div>
        </div>
      </div>
      <div id="freq-body" style="padding:0 24px 40px">
        <div class="kpi-skeleton" style="display:flex;gap:12px;margin-bottom:24px">
          ${[0,1,2,3].map(()=>`<div class="skel" style="height:80px;flex:1;border-radius:10px"></div>`).join('')}
        </div>
        <div class="skel" style="height:300px;border-radius:10px"></div>
      </div>
    `;

    await _carregar();
    _renderBody(el);
  }

  async function _carregar() {
    try {
      const [rC, rR] = await Promise.all([
        _sb().from('congregacoes').select('id,nome').is('deleted_at', null).order('nome'),
        _sb().from('congregacao_cultos')
          .select('id,cong_id,data,tipo,adultos,criancas,participantes,online,obs')
          .order('data', { ascending: false })
          .limit(500),
      ]);
      _congs     = rC.data  || [];
      _registros = rR.data  || [];
    } catch (_) {}
  }

  function _filtrados() {
    return _registros.filter(r => {
      if (_filtros.cong && r.cong_id !== _filtros.cong) return false;
      if (_filtros.tipo && r.tipo !== _filtros.tipo)     return false;
      if (_filtros.mes  && !r.data?.startsWith(_filtros.mes)) return false;
      return true;
    });
  }

  /* ── Render do corpo ─────────────────────────────────── */
  function _renderBody(el) {
    const congMap = Object.fromEntries(_congs.map(c => [c.id, c.nome]));
    const tipos   = [...new Set(_registros.map(r => r.tipo).filter(Boolean))].sort();
    const meses   = [...new Set(_registros.map(r => r.data?.slice(0,7)).filter(Boolean))].sort().reverse();

    const dados = _filtrados();

    const totalPart    = dados.reduce((s,r) => s + (r.participantes || (r.adultos||0)+(r.criancas||0)), 0);
    const totalAdultos = dados.reduce((s,r) => s + (r.adultos  || 0), 0);
    const totalCriancas= dados.reduce((s,r) => s + (r.criancas || 0), 0);
    const totalOnline  = dados.reduce((s,r) => s + (r.online   || 0), 0);
    const media        = dados.length ? Math.round(totalPart / dados.length) : 0;

    const body = document.getElementById('freq-body');
    if (!body) return;

    body.innerHTML = `
      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px">
        ${_kpi('Cultos', _fmt(dados.length),        'var(--violet)', 'var(--violetbg)')}
        ${_kpi('Total',  _fmt(totalPart),            'var(--teal)',   'var(--tealbg)')}
        ${_kpi('Média',  _fmt(media),                'var(--blue)',   'var(--bluebg)')}
        ${_kpi('Adultos / Crianças', `${_fmt(totalAdultos)} / ${_fmt(totalCriancas)}`, 'var(--gr)', 'rgba(48,209,88,.12)')}
        ${_kpi('Online', _fmt(totalOnline),          'var(--amber)',  'rgba(255,159,10,.12)')}
      </div>

      <!-- Filtros -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">
        <select id="freq-f-cong" onchange="_freqFiltrar()" style="${_selStyle()}">
          <option value="">Todas as congregações</option>
          ${_congs.map(c => `<option value="${_esc(c.id)}"${_filtros.cong===c.id?' selected':''}>${_esc(c.nome)}</option>`).join('')}
        </select>
        <select id="freq-f-tipo" onchange="_freqFiltrar()" style="${_selStyle()}">
          <option value="">Todos os tipos</option>
          ${tipos.map(t => `<option value="${_esc(t)}"${_filtros.tipo===t?' selected':''}>${_esc(t)}</option>`).join('')}
        </select>
        <select id="freq-f-mes" onchange="_freqFiltrar()" style="${_selStyle()}">
          <option value="">Todos os meses</option>
          ${meses.map(m => `<option value="${_esc(m)}"${_filtros.mes===m?' selected':''}>${_mesLabel(m)}</option>`).join('')}
        </select>
        ${dados.length !== _registros.length ? `<button onclick="_freqLimpar()" style="padding:6px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg-surface);color:var(--rose);font-size:12px;cursor:pointer">Limpar filtros</button>` : ''}
      </div>

      <!-- Gráfico de barras por mês -->
      ${_graficoMeses(dados)}

      <!-- Tabela -->
      <div style="background:var(--bg-surface);border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-top:20px">
        <table style="width:100%;border-collapse:collapse;font-size:12.5px">
          <thead>
            <tr style="background:var(--bg-hover)">
              <th style="${_th()}">Data</th>
              <th style="${_th()}">Congregação</th>
              <th style="${_th()}">Tipo</th>
              <th style="${_th()} text-align:right">Adultos</th>
              <th style="${_th()} text-align:right">Crianças</th>
              <th style="${_th()} text-align:right">Total</th>
              <th style="${_th()} text-align:right">Online</th>
              <th style="${_th()}">Obs</th>
            </tr>
          </thead>
          <tbody>
            ${dados.length === 0
              ? `<tr><td colspan="8" style="padding:32px;text-align:center;color:var(--tx3)">Nenhum registro encontrado.</td></tr>`
              : dados.slice(0, 100).map((r, i) => {
                  const tot = r.participantes || ((r.adultos||0)+(r.criancas||0));
                  return `<tr style="border-top:1px solid var(--border);${i%2===1?'background:var(--bg-hover)':''}">
                    <td style="${_td()};color:var(--tx1);font-weight:500">${_fmtData(r.data)}</td>
                    <td style="${_td()}">${_esc(congMap[r.cong_id] || '—')}</td>
                    <td style="${_td()}">${_esc(r.tipo || '—')}</td>
                    <td style="${_td()} text-align:right">${r.adultos ?? '—'}</td>
                    <td style="${_td()} text-align:right">${r.criancas ?? '—'}</td>
                    <td style="${_td()} text-align:right;font-weight:700;color:var(--tx1)">${tot || '—'}</td>
                    <td style="${_td()} text-align:right;color:var(--tx2)">${r.online || '—'}</td>
                    <td style="${_td()};color:var(--tx3);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(r.obs || '')}</td>
                  </tr>`;
                }).join('')
            }
          </tbody>
        </table>
        ${dados.length > 100 ? `<div style="padding:10px 16px;font-size:11px;color:var(--tx3);border-top:1px solid var(--border)">Mostrando 100 de ${dados.length} registros. Use os filtros para refinar.</div>` : ''}
      </div>
    `;
  }

  /* ── Gráfico barras por mês ──────────────────────────── */
  function _graficoMeses(dados) {
    if (!dados.length) return '';
    const por = {};
    dados.forEach(r => {
      const m = r.data?.slice(0,7);
      if (!m) return;
      if (!por[m]) por[m] = 0;
      por[m] += r.participantes || ((r.adultos||0)+(r.criancas||0));
    });
    const entradas = Object.entries(por).sort(([a],[b]) => a.localeCompare(b)).slice(-12);
    if (!entradas.length) return '';
    const max = Math.max(...entradas.map(([,v])=>v)) || 1;

    return `
      <div style="background:var(--bg-surface);border-radius:12px;border:1px solid var(--border);padding:20px">
        <div style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:16px;text-transform:uppercase;letter-spacing:.04em">Participantes por mês</div>
        <div style="display:flex;align-items:flex-end;gap:8px;height:120px">
          ${entradas.map(([mes, val]) => {
            const h = Math.max(4, Math.round((val / max) * 100));
            return `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0">
                <div style="font-size:10px;color:var(--tx2);font-weight:600">${val}</div>
                <div style="width:100%;height:${h}px;background:var(--violet);border-radius:4px 4px 0 0;opacity:.85" title="${val} participantes"></div>
                <div style="font-size:9px;color:var(--tx3);text-align:center">${_mesLabel(mes)}</div>
              </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  /* ── Filtros ─────────────────────────────────────────── */
  window._freqFiltrar = function () {
    _filtros.cong = document.getElementById('freq-f-cong')?.value || '';
    _filtros.tipo = document.getElementById('freq-f-tipo')?.value || '';
    _filtros.mes  = document.getElementById('freq-f-mes')?.value  || '';
    const el = document.getElementById('v-freq-dash');
    if (el) _renderBody(el);
  };

  window._freqLimpar = function () {
    _filtros = { cong: '', tipo: '', mes: '' };
    const el = document.getElementById('v-freq-dash');
    if (el) _renderBody(el);
  };

  /* ── Estilos inline ──────────────────────────────────── */
  function _kpi(lbl, val, cor, bg) {
    return `
      <div style="background:${bg};border-radius:10px;padding:14px 16px">
        <div style="font-size:11px;font-weight:600;color:${cor};text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">${lbl}</div>
        <div style="font-size:22px;font-weight:700;color:var(--tx1)">${val}</div>
      </div>`;
  }

  function _selStyle() {
    return 'padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-surface);color:var(--tx1);font-size:12.5px;cursor:pointer';
  }

  const _th = () => 'padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;';
  const _td = () => 'padding:10px 14px;color:var(--tx2);';

  /* ── Registro ────────────────────────────────────────── */
  if (typeof VIEW_AUTOLOAD !== 'undefined') {
    VIEW_AUTOLOAD['freq-dash'] = { fn: renderFreqDash };
  }

})();
