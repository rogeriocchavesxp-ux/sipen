/* ═══════════════════════════════════════════════════════════════
   SIPEN — Módulo Nomeações Anuais
   nomeados.js · v2.1
   Conselho e Governança — Central de Nomeações da IPPenha
═══════════════════════════════════════════════════════════════ */

(function () {

  /* ── Estado ───────────────────────────────────────────────── */

  let _rows      = [];
  let _anuais    = [];
  let _anoAtivo  = new Date().getFullYear();
  let _tabAtiva  = 'nomeacoes';

  /* ── Helpers ──────────────────────────────────────────────── */

  function _sp() {
    return `<span style="display:inline-block;width:11px;height:11px;border:2px solid var(--sky);border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;vertical-align:middle;margin-right:6px"></span>`;
  }

  function _el(id) { return document.getElementById(id); }
  function _sv(id, v) { const e = _el(id); if (e) e.textContent = v; }

  function _nomalizarCargo(c) {
    return (c || '').toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu, '');
  }

  /* ── Classificação dos registros ──────────────────────────── */

  function _classificar(r) {
    // Se o banco já tem a coluna tipo_nomeacao preenchida, usa diretamente
    if (r.tipo_nomeacao) return r;

    const cargo    = _nomalizarCargo(r.cargo);
    const orgTipo  = r.orgao_tipo || '';
    const clone    = Object.assign({}, r);

    if (/supervisor|supervisao|pastor supervisor/.test(cargo) || cargo === 'pastor') {
      clone.tipo_nomeacao = 'lider';
      clone.funcao_lider  = 'supervisor';
    } else if (/^coordena|^presidente|^vice.presidente|^dir[ei]|^regente/.test(cargo)) {
      clone.tipo_nomeacao = 'lider';
      clone.funcao_lider  = 'coordenador';
    } else if (/^lider|^lideranca|^responsavel|^gestao|^gerencia/.test(cargo)) {
      clone.tipo_nomeacao = 'lider';
      clone.funcao_lider  = 'lider_area';
    } else if (orgTipo === 'sociedade') {
      clone.tipo_nomeacao = 'membro';
      clone.tipo_membro   = 'sociedade';
    } else if (orgTipo === 'ministerio') {
      clone.tipo_nomeacao = 'membro';
      clone.tipo_membro   = 'ministerio';
    } else {
      clone.tipo_nomeacao = 'outro';
      clone.tipo_membro   = orgTipo;
    }

    if (!clone.area) clone.area = r.orgao;
    return clone;
  }

  /* ── Carregamento de dados ────────────────────────────────── */

  async function carregarNomeados() {
    const container = _el('nom-main-container');
    if (!container) return;
    container.innerHTML = `<div style="padding:32px;text-align:center;color:var(--tx3)">${_sp()}Carregando nomeações…</div>`;

    try {
      // Tenta buscar com filtro de ano; fallback sem filtro
      let url = `${apiBaseUrl()}/rest/v1/nomeados?deleted_at=is.null&status=eq.ativo&order=orgao.asc,nome.asc&limit=2000`;
      try {
        const r = await fetch(url + `&ano=eq.${_anoAtivo}`, { headers: apiHeaders() });
        if (r.ok) {
          const data = await r.json();
          if (data.length > 0) {
            _rows = data.map(_classificar);
          } else {
            // Nenhum dado para esse ano — tenta sem filtro de ano
            const r2 = await fetch(url, { headers: apiHeaders() });
            _rows = r2.ok ? (await r2.json()).map(_classificar) : [];
          }
        } else {
          // Coluna ano pode não existir ainda
          const r2 = await fetch(url, { headers: apiHeaders() });
          _rows = r2.ok ? (await r2.json()).map(_classificar) : [];
        }
      } catch {
        const r2 = await fetch(url, { headers: apiHeaders() });
        _rows = r2.ok ? (await r2.json()).map(_classificar) : [];
      }

      // Carrega nomeações anuais (tabela pode não existir ainda)
      try {
        const rA = await fetch(`${apiBaseUrl()}/rest/v1/nomeacoes_anuais?order=ano.desc&limit=20`, { headers: apiHeaders() });
        _anuais = rA.ok ? await rA.json() : [];
      } catch { _anuais = []; }

      _popularFiltroAnos();
      _atualizarKpis();

      if (_tabAtiva === 'historico') {
        _renderHistorico();
      } else {
        _renderNomeacoes();
      }

    } catch (e) {
      container.innerHTML = `<div style="padding:24px;color:var(--rose);font-size:12px">Erro ao carregar: ${e.message}</div>`;
    }
  }

  function _popularFiltroAnos() {
    const sel = _el('nom-ano-sel');
    if (!sel) return;
    // Anos disponíveis: da tabela nomeacoes_anuais + anos distintos nos dados
    const anosAnuais = _anuais.map(a => a.ano);
    const anosRows   = [...new Set(_rows.map(r => r.ano).filter(Boolean))];
    const todos      = [...new Set([..._anoAtivo === new Date().getFullYear() ? [_anoAtivo] : [], ...anosAnuais, ...anosRows])].sort((a,b) => b - a);
    if (todos.length === 0) todos.push(new Date().getFullYear());

    sel.innerHTML = todos.map(a => `<option value="${a}" ${a === _anoAtivo ? 'selected' : ''}>${a}</option>`).join('');
  }

  function _atualizarKpis() {
    const rows    = _rows;
    const lideres = rows.filter(r => r.tipo_nomeacao === 'lider');
    const membros = rows.filter(r => r.tipo_nomeacao === 'membro');
    const socs    = membros.filter(r => r.tipo_membro === 'sociedade');
    const mins    = membros.filter(r => r.tipo_membro === 'ministerio');

    _sv('nom-kpi-total',   rows.length);
    _sv('nom-kpi-lideres', lideres.length);
    _sv('nom-kpi-membros', membros.length);
    _sv('nom-kpi-socs',    [...new Set(socs.map(r => r.orgao))].length);

    // Subtextos
    const kpiSubs = {
      'nom-kpi-sub-lideres': `${lideres.filter(r=>r.funcao_lider==='supervisor').length} sup · ${lideres.filter(r=>r.funcao_lider==='coordenador').length} coord`,
      'nom-kpi-sub-membros': `${mins.length} em ministérios · ${socs.length} em sociedades`,
    };
    Object.entries(kpiSubs).forEach(([id, v]) => _sv(id, v));
  }

  /* ── Bloco colapsável genérico ────────────────────────────── */

  function _bloco(uid, titulo, cor, bg, pessoas, renderLinha) {
    const qtd = pessoas.length;
    return `
      <div style="border-radius:8px;overflow:hidden;border:1px solid var(--bd1);margin-bottom:4px">
        <div onclick="nomToggle('${uid}')" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:11px 14px;background:var(--bg-surface);user-select:none" onmouseover="this.style.background='var(--bg-surface2)'" onmouseout="this.style.background='var(--bg-surface)'">
          <div style="width:8px;height:8px;border-radius:50%;background:${cor};flex-shrink:0"></div>
          <span style="flex:1;font-size:13px;font-weight:600;color:var(--tx1)">${titulo}</span>
          <span style="font-size:10px;color:var(--tx3);margin-right:6px">${qtd} pessoa${qtd !== 1 ? 's' : ''}</span>
          <span id="${uid}-chev" style="color:var(--tx4);font-size:14px;transition:transform .2s">›</span>
        </div>
        <div id="${uid}-body" style="display:none;border-top:1px solid var(--bd1)">
          ${pessoas.length === 0
            ? `<div style="padding:12px 14px;color:var(--tx4);font-size:11.5px">Nenhum registro.</div>`
            : pessoas.map((p, i) => renderLinha(p, i, pessoas.length)).join('')
          }
        </div>
      </div>`;
  }

  function nomToggle(uid) {
    const body = _el(uid + '-body');
    const chev = _el(uid + '-chev');
    if (!body) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    if (chev) chev.textContent = open ? '›' : '⌄';
  }

  /* ── Seção: LÍDERES ───────────────────────────────────────── */

  function _linhaLider(r, i, total) {
    const bdr = i < total - 1 ? 'border-bottom:1px solid var(--bd1)' : '';
    const area = r.area || r.orgao || '';
    const sub  = r.suborgao ? ` › ${r.suborgao}` : '';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px 8px 32px;${bdr}">
        <div>
          <div style="font-size:12px;color:var(--tx1);font-weight:500">${r.nome}</div>
          <div style="font-size:10px;color:var(--tx3)">${area}${sub}</div>
        </div>
        <div style="text-align:right">
          <span style="font-size:10px;color:var(--sky);font-weight:600;white-space:nowrap">${r.cargo || ''}</span>
        </div>
      </div>`;
  }

  function _renderSecaoLideres(rows) {
    const lideres = rows.filter(r => r.tipo_nomeacao === 'lider');
    const porFuncao = {
      supervisor:  lideres.filter(r => r.funcao_lider === 'supervisor'),
      coordenador: lideres.filter(r => r.funcao_lider === 'coordenador'),
      lider_area:  lideres.filter(r => r.funcao_lider === 'lider_area'),
    };

    const total = lideres.length;
    if (total === 0) return `<div style="color:var(--tx3);font-size:12px;padding:16px">Nenhum líder cadastrado para este ano.</div>`;

    return `
      ${_bloco('nom-sup', 'Supervisores', 'var(--rose)', 'rgba(224,85,85,.1)', porFuncao.supervisor, _linhaLider)}
      ${_bloco('nom-coord', 'Coordenadores', 'var(--sky)', 'rgba(74,156,245,.1)', porFuncao.coordenador, _linhaLider)}
      ${_bloco('nom-lider', 'Líderes de Área', 'var(--violet)', 'rgba(139,111,212,.1)', porFuncao.lider_area, _linhaLider)}
    `;
  }

  /* ── Seção: MEMBROS ───────────────────────────────────────── */

  function _linhaMembro(r, i, total) {
    const bdr = i < total - 1 ? 'border-bottom:1px solid var(--bd1)' : '';
    const sub = r.suborgao ? ` <span style="font-size:10px;color:var(--tx4)">· ${r.suborgao}</span>` : '';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px 8px 32px;${bdr}">
        <span style="font-size:12px;color:var(--tx1)">${r.nome}${sub}</span>
        <span style="font-size:10px;color:var(--tx3);white-space:nowrap;margin-left:8px">${r.cargo || ''}</span>
      </div>`;
  }

  function _grupoMembros(uid, orgao, pessoas, cor) {
    return _bloco(uid, orgao, cor, '', pessoas, _linhaMembro);
  }

  function _renderSecaoMembros(rows) {
    const membros = rows.filter(r => r.tipo_nomeacao === 'membro');
    const socs    = membros.filter(r => r.tipo_membro === 'sociedade');
    const mins    = membros.filter(r => r.tipo_membro === 'ministerio');

    // Agrupa sociedades por orgao
    const bySoc = {};
    socs.forEach(r => { const k = r.orgao || r.area || '—'; (bySoc[k] = bySoc[k] || []).push(r); });

    // Agrupa ministérios por orgao
    const byMin = {};
    mins.forEach(r => { const k = r.orgao || r.area || '—'; (byMin[k] = byMin[k] || []).push(r); });

    const secSocs = Object.keys(bySoc).sort().map((orgao, i) =>
      _grupoMembros(`nom-soc-${i}`, orgao, bySoc[orgao], 'var(--gold)')
    ).join('');

    const secMins = Object.keys(byMin).sort().map((orgao, i) =>
      _grupoMembros(`nom-min-${i}`, orgao, byMin[orgao], 'var(--teal)')
    ).join('');

    return `
      <div style="margin-bottom:20px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);margin-bottom:8px;padding:0 2px">Sociedades Internas</div>
        ${secSocs || '<div style="color:var(--tx3);font-size:12px;padding:8px">Nenhum registro.</div>'}
      </div>
      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--teal);margin-bottom:8px;padding:0 2px">Ministérios</div>
        ${secMins || '<div style="color:var(--tx3);font-size:12px;padding:8px">Nenhum registro.</div>'}
      </div>
    `;
  }

  /* ── Seção: OUTROS (governo, comissões, grupos, congregações) */

  function _renderSecaoOutros(rows) {
    const outros = rows.filter(r => r.tipo_nomeacao === 'outro');
    if (!outros.length) return '';

    const byTipo = {};
    outros.forEach(r => {
      const t = r.orgao_tipo || 'outros';
      (byTipo[t] = byTipo[t] || {})[r.orgao || '—'] = byTipo[t][r.orgao || '—'] || [];
      byTipo[t][r.orgao || '—'].push(r);
    });

    const labels = { governo:'Governo', comissao:'Comissões', grupo:'Grupos', congregacao:'Congregações', outros:'Outros' };
    const cores  = { governo:'var(--sky)', comissao:'var(--violet)', grupo:'var(--amber)', congregacao:'var(--gr)', outros:'var(--tx3)' };

    let html = '';
    Object.keys(byTipo).sort().forEach(tipo => {
      const label = labels[tipo] || tipo;
      const cor   = cores[tipo] || 'var(--tx3)';
      const byOrgao = byTipo[tipo];
      html += `<div style="margin-bottom:16px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${cor};margin-bottom:8px;padding:0 2px">${label}</div>`;
      Object.keys(byOrgao).sort().forEach((orgao, i) => {
        html += _bloco(`nom-out-${tipo}-${i}`, orgao, cor, '', byOrgao[orgao], _linhaMembro);
      });
      html += '</div>';
    });
    return html;
  }

  /* ── Render principal: Nomeações ──────────────────────────── */

  function _renderNomeacoes() {
    const container = _el('nom-main-container');
    if (!container) return;

    const rows   = _rows;
    const anual  = _anuais.find(a => a.ano === _anoAtivo);
    const outros = rows.filter(r => r.tipo_nomeacao === 'outro');

    container.innerHTML = `
      ${anual ? `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(58,170,92,.07);border:1px solid rgba(58,170,92,.2);border-radius:8px;margin-bottom:16px">
          <span style="font-size:11px;color:var(--gr);font-weight:600">Nomeações ${anual.ano}</span>
          ${anual.status ? `<span style="font-size:10px;padding:2px 7px;border-radius:4px;background:rgba(58,170,92,.15);color:var(--gr)">${_labelStatus(anual.status)}</span>` : ''}
          ${anual.ata_origem ? `<span style="font-size:10px;color:var(--tx3)">· ${anual.ata_origem}</span>` : ''}
          <span style="flex:1"></span>
          ${anual.periodo_inicio ? `<span style="font-size:10px;color:var(--tx3)">${_fmtPeriodo(anual.periodo_inicio, anual.periodo_fim)}</span>` : ''}
        </div>` : ''}

      <!-- LÍDERES -->
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--rose)">Líderes</div>
          <div style="flex:1;height:1px;background:var(--bd1)"></div>
        </div>
        ${_renderSecaoLideres(rows)}
      </div>

      <!-- MEMBROS -->
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--teal)">Membros</div>
          <div style="flex:1;height:1px;background:var(--bd1)"></div>
        </div>
        ${_renderSecaoMembros(rows)}
      </div>

      <!-- OUTROS (gov, comissões, grupos, congregações) -->
      ${outros.length ? `
        <div style="margin-bottom:24px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--tx3)">Demais Órgãos</div>
            <div style="flex:1;height:1px;background:var(--bd1)"></div>
          </div>
          ${_renderSecaoOutros(rows)}
        </div>` : ''}
    `;
  }

  /* ── Render: Histórico ────────────────────────────────────── */

  function _renderHistorico() {
    const container = _el('nom-main-container');
    if (!container) return;

    if (!_anuais.length) {
      container.innerHTML = `<div style="padding:24px;color:var(--tx3);font-size:12px">Nenhum histórico disponível. Execute a migration no Supabase.</div>`;
      return;
    }

    const STATUS_COR = {
      rascunho:      'var(--tx3)',
      em_preparacao: 'var(--amber)',
      aprovada:      'var(--sky)',
      publicada:     'var(--gr)',
      encerrada:     'var(--tx3)',
      arquivada:     'var(--tx4)',
    };

    let html = `
      <div class="card">
        <div class="ctit">Histórico de Nomeações Anuais</div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="border-bottom:1px solid var(--bd1)">
                <th style="text-align:left;padding:8px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.06em">Ano</th>
                <th style="text-align:left;padding:8px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.06em">Título</th>
                <th style="text-align:left;padding:8px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.06em">Status</th>
                <th style="text-align:left;padding:8px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.06em">Período</th>
                <th style="text-align:left;padding:8px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.06em">Ata</th>
                <th style="text-align:right;padding:8px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.06em">Ações</th>
              </tr>
            </thead>
            <tbody>`;

    _anuais.forEach((a, i) => {
      const cor   = STATUS_COR[a.status] || 'var(--tx3)';
      const bdr   = i < _anuais.length - 1 ? 'border-bottom:1px solid var(--bd1)' : '';
      html += `
        <tr style="${bdr}" onmouseover="this.style.background='var(--bg-surface2)'" onmouseout="this.style.background=''" onclick="nomFiltrarAno(${a.ano}); nomTab('nomeacoes', document.getElementById('nom-tab-nomeacoes'))" style="cursor:pointer">
          <td style="padding:10px 10px;font-weight:700;color:var(--tx1)">${a.ano}</td>
          <td style="padding:10px 10px;color:var(--tx1)">${a.titulo}</td>
          <td style="padding:10px 10px">
            <span style="font-size:10px;padding:2px 8px;border-radius:4px;font-weight:600;color:${cor};background:${cor.replace(')', ',.12)').replace('var(','rgba(').replace('--tx3','90,96,104').replace('--tx4','90,96,104').replace('--sky','74,156,245').replace('--gr','58,170,92').replace('--amber','212,168,67')}">
              ${_labelStatus(a.status)}
            </span>
          </td>
          <td style="padding:10px 10px;color:var(--tx2)">${_fmtPeriodo(a.periodo_inicio, a.periodo_fim)}</td>
          <td style="padding:10px 10px;color:var(--tx3);font-size:11px">${a.ata_origem || '—'}</td>
          <td style="padding:10px 10px;text-align:right">
            <button onclick="event.stopPropagation(); nomFiltrarAno(${a.ano}); nomTab('nomeacoes', document.getElementById('nom-tab-nomeacoes'))" style="background:none;border:1px solid var(--bd1);border-radius:4px;padding:3px 8px;color:var(--tx2);cursor:pointer;font-size:11px">Ver</button>
          </td>
        </tr>`;
    });

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
  }

  /* ── Helpers de formato ───────────────────────────────────── */

  function _labelStatus(s) {
    return { rascunho:'Rascunho', em_preparacao:'Em Preparação', aprovada:'Aprovada', publicada:'Publicada', encerrada:'Encerrada', arquivada:'Arquivada' }[s] || s;
  }

  function _fmtData(d) {
    if (!d) return '';
    const [y, m, dd] = d.slice(0,10).split('-');
    return `${dd}/${m}/${y}`;
  }

  function _fmtPeriodo(inicio, fim) {
    if (!inicio && !fim) return '—';
    if (!fim) return `A partir de ${_fmtData(inicio)}`;
    return `${_fmtData(inicio)} → ${_fmtData(fim)}`;
  }

  /* ── Troca de aba ─────────────────────────────────────────── */

  function nomTab(aba, btn) {
    _tabAtiva = aba;
    document.querySelectorAll('.nom-tab-btn').forEach(b => b.classList.remove('on'));
    if (btn) btn.classList.add('on');
    if (aba === 'historico') {
      _renderHistorico();
    } else {
      _renderNomeacoes();
    }
  }

  /* ── Filtro de ano ────────────────────────────────────────── */

  function nomFiltrarAno(ano) {
    _anoAtivo = parseInt(ano);
    const sel = _el('nom-ano-sel');
    if (sel) sel.value = _anoAtivo;
    carregarNomeados();
  }

  /* ── Impressão ────────────────────────────────────────────── */

  function nomImprimir() {
    const rows   = _rows;
    const anual  = _anuais.find(a => a.ano === _anoAtivo) || { titulo: `Nomeações ${_anoAtivo}` };

    const _secaoLideres = (r) => {
      const lideres = r.filter(x => x.tipo_nomeacao === 'lider');
      if (!lideres.length) return '';
      const grupos = [
        { key:'supervisor',  label:'Supervisores' },
        { key:'coordenador', label:'Coordenadores' },
        { key:'lider_area',  label:'Líderes de Área' },
      ];
      return `<h2 style="font-size:14px;margin:24px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px">LÍDERES</h2>` +
        grupos.map(g => {
          const ps = lideres.filter(x => x.funcao_lider === g.key);
          if (!ps.length) return '';
          return `<h3 style="font-size:12px;margin:14px 0 4px;color:#555">${g.label}</h3>
            <table style="width:100%;border-collapse:collapse;font-size:11px">
              ${ps.map(p => `<tr style="border-bottom:1px solid #eee"><td style="padding:3px 0">${p.nome}</td><td style="color:#777">${p.orgao||''}${p.suborgao?' › '+p.suborgao:''}</td><td style="text-align:right;color:#555">${p.cargo||''}</td></tr>`).join('')}
            </table>`;
        }).join('');
    };

    const _secaoMembros = (r) => {
      const membros = r.filter(x => x.tipo_nomeacao === 'membro');
      if (!membros.length) return '';
      const socs = membros.filter(x => x.tipo_membro === 'sociedade');
      const mins = membros.filter(x => x.tipo_membro === 'ministerio');
      let html = `<h2 style="font-size:14px;margin:24px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px">MEMBROS</h2>`;

      if (socs.length) {
        html += `<h3 style="font-size:12px;margin:14px 0 4px;color:#555">Sociedades Internas</h3>`;
        const bySoc = {};
        socs.forEach(x => { const k = x.orgao||'—'; (bySoc[k]=bySoc[k]||[]).push(x); });
        Object.keys(bySoc).sort().forEach(k => {
          html += `<div style="margin-bottom:8px"><strong style="font-size:11px">${k}</strong>
            <table style="width:100%;border-collapse:collapse;font-size:11px">
              ${bySoc[k].map(p => `<tr style="border-bottom:1px solid #f5f5f5"><td style="padding:2px 0 2px 8px">${p.nome}</td><td style="text-align:right;color:#555">${p.cargo||''}</td></tr>`).join('')}
            </table></div>`;
        });
      }

      if (mins.length) {
        html += `<h3 style="font-size:12px;margin:14px 0 4px;color:#555">Ministérios</h3>`;
        const byMin = {};
        mins.forEach(x => { const k = x.orgao||'—'; (byMin[k]=byMin[k]||[]).push(x); });
        Object.keys(byMin).sort().forEach(k => {
          html += `<div style="margin-bottom:8px"><strong style="font-size:11px">${k}</strong>
            <table style="width:100%;border-collapse:collapse;font-size:11px">
              ${byMin[k].map(p => `<tr style="border-bottom:1px solid #f5f5f5"><td style="padding:2px 0 2px 8px">${p.nome}${p.suborgao?` (${p.suborgao})`:''}</td><td style="text-align:right;color:#555">${p.cargo||''}</td></tr>`).join('')}
            </table></div>`;
        });
      }
      return html;
    };

    const win = window.open('', '_blank', 'width=800,height:900');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>${anual.titulo}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 32px; color: #222; }
        @media print { @page { margin: 20mm; } }
      </style>
    </head><body>
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#777">Igreja Presbiteriana da Penha</div>
        <h1 style="font-size:18px;margin:6px 0">${anual.titulo.toUpperCase()}</h1>
        ${anual.ata_origem ? `<div style="font-size:10px;color:#777">${anual.ata_origem}</div>` : ''}
        ${anual.periodo_inicio ? `<div style="font-size:10px;color:#777">${_fmtPeriodo(anual.periodo_inicio, anual.periodo_fim)}</div>` : ''}
      </div>
      ${_secaoLideres(rows)}
      ${_secaoMembros(rows)}
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }

  /* ── Novo Registro ────────────────────────────────────────── */

  function nomNovoRegistro() {
    let modal = _el('nom-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'nom-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:320';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="width:min(640px,92vw);max-height:88vh;overflow:hidden;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;display:flex;flex-direction:column">
        <div style="padding:14px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:14px;font-weight:700;color:var(--tx1)">Novo Registro de Nomeação</div>
          <button onclick="_el('nom-modal').remove()" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer">✕</button>
        </div>
        <div style="padding:16px;overflow:auto">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">

            <div style="grid-column:1/-1">
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Ano da Nomeação <span style="color:var(--rose)">*</span></label>
              <select id="nom-f-ano" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px">
                ${[2026,2027,2028].map(a => `<option value="${a}" ${a===_anoAtivo?'selected':''}>${a}</option>`).join('')}
              </select>
            </div>

            <div style="grid-column:1/-1">
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Nome da Pessoa <span style="color:var(--rose)">*</span></label>
              ${_htmlAutocomplete('nom-f-nome', 'Digite para buscar na membresia…')}
            </div>

            <div>
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Tipo de Nomeação <span style="color:var(--rose)">*</span></label>
              <select id="nom-f-tipo" onchange="nomMostrarCampos()" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px">
                <option value="">Selecione…</option>
                <option value="lider">Líder</option>
                <option value="membro">Membro</option>
              </select>
            </div>

            <div id="nom-f-funcao-div" style="display:none">
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Função</label>
              <select id="nom-f-funcao" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px">
                <option value="supervisor">Supervisor</option>
                <option value="coordenador">Coordenador</option>
                <option value="lider_area">Líder de Área</option>
              </select>
            </div>

            <div id="nom-f-tipo-membro-div" style="display:none">
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Tipo de Vínculo</label>
              <select id="nom-f-tipo-membro" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px">
                <option value="sociedade">Sociedade Interna</option>
                <option value="ministerio">Ministério</option>
                <option value="comissao">Comissão</option>
                <option value="grupo">Grupo</option>
              </select>
            </div>

            <div>
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Cargo / Função</label>
              <input id="nom-f-cargo" type="text" placeholder="Ex: Coordenador, Equipe, Professor…" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none">
            </div>

            <div style="grid-column:1/-1">
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Área / Ministério / Sociedade <span style="color:var(--rose)">*</span></label>
              <input id="nom-f-orgao" type="text" placeholder="Ex: Ministério de Ensino, SAF…" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none">
            </div>

            <div>
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Sub-área / Grupo</label>
              <input id="nom-f-suborgao" type="text" placeholder="Ex: EBD Geral, Penha Kids…" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none">
            </div>

            <div>
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Departamento</label>
              <input id="nom-f-depto" type="text" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none">
            </div>

            <div>
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Data de Início</label>
              <input id="nom-f-inicio" type="date" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none">
            </div>

            <div>
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Data de Encerramento</label>
              <input id="nom-f-fim" type="date" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none">
            </div>

            <div style="grid-column:1/-1">
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Ata de Origem</label>
              <input id="nom-f-ata" type="text" placeholder="Ex: Ata nº 1298, de 12/12/2026" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none">
            </div>

            <div style="grid-column:1/-1">
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Observações</label>
              <textarea id="nom-f-obs" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none;min-height:60px;resize:vertical"></textarea>
            </div>

          </div>
        </div>
        <div style="padding:14px 16px;border-top:1px solid var(--bd1);display:flex;justify-content:flex-end;gap:8px">
          <button onclick="_el('nom-modal').remove()" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:8px 12px;color:var(--tx2);cursor:pointer">Cancelar</button>
          <button onclick="nomSalvarRegistro()" style="background:var(--gr);border:none;border-radius:6px;padding:8px 16px;color:#fff;font-weight:600;cursor:pointer">💾 Salvar</button>
        </div>
      </div>`;
  }

  function nomMostrarCampos() {
    const tipo = (_el('nom-f-tipo') || {}).value;
    const fDiv = _el('nom-f-funcao-div');
    const mDiv = _el('nom-f-tipo-membro-div');
    if (fDiv) fDiv.style.display = tipo === 'lider'  ? '' : 'none';
    if (mDiv) mDiv.style.display = tipo === 'membro' ? '' : 'none';
  }

  async function nomSalvarRegistro() {
    const v = (id) => (_el(id) || {}).value || null;
    const nome = v('nom-f-nome');
    const tipo = v('nom-f-tipo');
    const orgao = v('nom-f-orgao');

    if (!nome) { T('Campo obrigatório', 'Informe o nome da pessoa.'); return; }
    if (!tipo)  { T('Campo obrigatório', 'Selecione o tipo de nomeação.'); return; }
    if (!orgao) { T('Campo obrigatório', 'Informe a área, ministério ou sociedade.'); return; }

    const pidEl = document.getElementById('nom-f-nome-pid');
    const payload = {
      nome,
      pessoa_id:     pidEl?.value || null,
      ano:           parseInt(v('nom-f-ano')) || _anoAtivo,
      tipo_nomeacao: tipo,
      funcao_lider:  tipo === 'lider'  ? v('nom-f-funcao')       : null,
      tipo_membro:   tipo === 'membro' ? v('nom-f-tipo-membro')   : null,
      orgao_tipo:    tipo === 'membro' ? (v('nom-f-tipo-membro') || 'ministerio') : 'governo',
      orgao,
      suborgao:      v('nom-f-suborgao'),
      departamento:  v('nom-f-depto'),
      cargo:         v('nom-f-cargo'),
      area:          orgao,
      data_inicio:   v('nom-f-inicio'),
      data_fim:      v('nom-f-fim'),
      ata_origem:    v('nom-f-ata'),
      obs:           v('nom-f-obs'),
      status:        'ativo',
    };
    // Remove campos nulos para não sobrescrever defaults do banco
    Object.keys(payload).forEach(k => { if (payload[k] === null || payload[k] === '') delete payload[k]; });

    try {
      const res = await fetch(`${apiBaseUrl()}/rest/v1/nomeados`, {
        method:  'POST',
        headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      _el('nom-modal')?.remove();
      T('Nomeação salva', `${nome} foi adicionado(a) com sucesso.`);
      carregarNomeados();
    } catch (e) {
      T('Erro ao salvar', e.message);
    }
  }

  /* ── Autocomplete de Membresia ────────────────────────────── */

  function _htmlAutocomplete(inpId, placeholder) {
    return `
      <div style="position:relative">
        <input id="${inpId}" type="text" placeholder="${placeholder}" autocomplete="off"
          oninput="nomBuscarPessoa(this)"
          onblur="setTimeout(()=>{ const l=document.getElementById('${inpId}-list'); if(l)l.style.display='none'; },180)"
          style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none;box-sizing:border-box">
        <input type="hidden" id="${inpId}-pid">
        <div id="${inpId}-list" style="display:none;position:absolute;left:0;right:0;top:100%;z-index:500;background:var(--bg-card);border:1px solid var(--bd2);border-radius:0 0 6px 6px;box-shadow:0 6px 20px rgba(0,0,0,.2);max-height:200px;overflow:auto"></div>
      </div>`;
  }

  async function nomBuscarPessoa(inp) {
    const termo = (inp.value || '').trim();
    const list  = document.getElementById(inp.id + '-list');
    const pid   = document.getElementById(inp.id + '-pid');
    if (pid) pid.value = '';
    if (!list) return;
    if (termo.length < 2) { list.style.display = 'none'; return; }

    list.innerHTML = `<div style="padding:8px 12px;color:var(--tx3);font-size:11px">Buscando…</div>`;
    list.style.display = 'block';

    try {
      const t   = encodeURIComponent(`*${termo}*`);
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/pessoas?nome=ilike.${t}&deleted_at=is.null&select=id,nome&order=nome.asc&limit=15`,
        { headers: apiHeaders() }
      );
      const pessoas = res.ok ? await res.json() : [];

      if (!pessoas.length) {
        list.innerHTML = `<div style="padding:8px 12px;color:var(--tx3);font-size:11px">Nenhum resultado para "<b>${escapeHtml(termo)}</b>". O nome será salvo como digitado.</div>`;
        return;
      }

      list.innerHTML = pessoas.map(p => `
        <div data-pid="${p.id}" data-nome="${escapeHtml(p.nome)}"
          onclick="nomSelecionarPessoa('${inp.id}',this)"
          style="padding:9px 12px;cursor:pointer;font-size:12px;color:var(--tx1);border-bottom:1px solid var(--bd1)"
          onmouseover="this.style.background='var(--bg-surface2)'"
          onmouseout="this.style.background=''">
          ${escapeHtml(p.nome)}
        </div>`).join('');
    } catch {
      list.innerHTML = `<div style="padding:8px 12px;color:var(--tx3);font-size:11px">Erro na busca.</div>`;
    }
  }

  function nomSelecionarPessoa(inpId, div) {
    const inp  = document.getElementById(inpId);
    const pidEl = document.getElementById(inpId + '-pid');
    const list  = document.getElementById(inpId + '-list');
    if (inp)   inp.value   = div.dataset.nome;
    if (pidEl) pidEl.value = div.dataset.pid;
    if (list)  list.style.display = 'none';
  }

  /* ── Duplicar ano anterior ────────────────────────────────── */

  async function nomDuplicarAno() {
    const anoAnterior = _anoAtivo - 1;
    const anoNovo     = _anoAtivo;

    let modal = document.getElementById('nom-dup-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'nom-dup-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:320';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="width:min(700px,92vw);max-height:88vh;overflow:hidden;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;display:flex;flex-direction:column">
        <div style="padding:14px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:14px;font-weight:700;color:var(--tx1)">Duplicar ${anoAnterior} → ${anoNovo}</div>
          <button onclick="document.getElementById('nom-dup-modal').remove()" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer">✕</button>
        </div>
        <div style="padding:20px;text-align:center;color:var(--tx3);font-size:12px">
          <span style="display:inline-block;width:14px;height:14px;border:2px solid var(--sky);border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;vertical-align:middle;margin-right:8px"></span>
          Carregando registros de ${anoAnterior}…
        </div>
      </div>`;

    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/nomeados?ano=eq.${anoAnterior}&deleted_at=is.null&status=eq.ativo&order=orgao_tipo.asc,orgao.asc,nome.asc&limit=2000`,
        { headers: apiHeaders() }
      );

      let rows = res.ok ? await res.json() : [];

      // Fallback: se não há resultados com filtro de ano (coluna pode não existir), usa todos
      if (!rows.length) {
        const r2 = await fetch(
          `${apiBaseUrl()}/rest/v1/nomeados?deleted_at=is.null&status=eq.ativo&order=orgao_tipo.asc,orgao.asc,nome.asc&limit=2000`,
          { headers: apiHeaders() }
        );
        rows = r2.ok ? await r2.json() : [];
      }

      if (!rows.length) {
        modal.querySelector('div > div:last-child').innerHTML =
          `<div style="padding:20px;color:var(--tx3);font-size:12px">Nenhum registro encontrado em ${anoAnterior}.</div>`;
        return;
      }

      // Monta lista com checkboxes para remoção
      const byOrgao = {};
      rows.forEach(r => {
        const k = (r.orgao_tipo || 'outro') + '||' + (r.orgao || '—');
        (byOrgao[k] = byOrgao[k] || []).push(r);
      });

      let listaHtml = '';
      Object.keys(byOrgao).sort().forEach(k => {
        const [tipo, orgao] = k.split('||');
        const pessoas = byOrgao[k];
        listaHtml += `
          <div style="margin-bottom:12px">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:4px;padding:0 2px">${orgao}</div>
            ${pessoas.map(p => `
              <label style="display:flex;align-items:center;gap:8px;padding:6px 6px;border-radius:4px;cursor:pointer" onmouseover="this.style.background='var(--bg-surface2)'" onmouseout="this.style.background=''">
                <input type="checkbox" data-id="${p.id}" checked style="width:14px;height:14px;accent-color:var(--gr);flex-shrink:0">
                <span style="flex:1;font-size:12px;color:var(--tx1)">${p.nome}</span>
                <span style="font-size:10px;color:var(--tx3)">${p.cargo || ''}</span>
              </label>`).join('')}
          </div>`;
      });

      modal.innerHTML = `
        <div style="width:min(700px,92vw);max-height:88vh;overflow:hidden;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;display:flex;flex-direction:column">
          <div style="padding:14px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--tx1)">Duplicar ${anoAnterior} → ${anoNovo}</div>
              <div style="font-size:11px;color:var(--tx3);margin-top:2px">${rows.length} registros encontrados · Desmarque os que não devem ser copiados</div>
            </div>
            <button onclick="document.getElementById('nom-dup-modal').remove()" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer">✕</button>
          </div>
          <div style="padding:14px 16px;border-bottom:1px solid var(--bd1);display:flex;gap:8px">
            <button onclick="nomDupMarcarTodos(true)"  style="background:none;border:1px solid var(--bd1);border-radius:4px;padding:4px 10px;color:var(--tx2);cursor:pointer;font-size:11px">Marcar todos</button>
            <button onclick="nomDupMarcarTodos(false)" style="background:none;border:1px solid var(--bd1);border-radius:4px;padding:4px 10px;color:var(--tx2);cursor:pointer;font-size:11px">Desmarcar todos</button>
          </div>
          <div style="padding:16px;overflow:auto;flex:1" id="nom-dup-lista">
            ${listaHtml}
          </div>
          <div style="padding:14px 16px;border-top:1px solid var(--bd1);display:flex;justify-content:flex-end;gap:8px">
            <button onclick="document.getElementById('nom-dup-modal').remove()" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:8px 12px;color:var(--tx2);cursor:pointer">Cancelar</button>
            <button onclick="nomConfirmarDuplicacao(${anoAnterior},${anoNovo})" style="background:var(--sky);border:none;border-radius:6px;padding:8px 16px;color:#fff;font-weight:600;cursor:pointer">Duplicar selecionados →</button>
          </div>
        </div>`;

    } catch (e) {
      modal.innerHTML = `<div style="padding:24px;color:var(--rose)">Erro: ${e.message}</div>`;
    }
  }

  function nomDupMarcarTodos(checked) {
    document.querySelectorAll('#nom-dup-lista input[type="checkbox"]').forEach(cb => { cb.checked = checked; });
  }

  async function nomConfirmarDuplicacao(anoAnterior, anoNovo) {
    const selecionados = [...document.querySelectorAll('#nom-dup-lista input[type="checkbox"]:checked')]
      .map(cb => cb.dataset.id);

    if (!selecionados.length) { T('Nenhum selecionado', 'Marque ao menos um registro.'); return; }

    // Busca registros originais
    const ids = selecionados.join(',');
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/nomeados?id=in.(${ids})&deleted_at=is.null&limit=2000`,
      { headers: apiHeaders() }
    );
    if (!res.ok) { T('Erro', 'Não foi possível buscar os registros.'); return; }
    const originais = await res.json();

    const copies = originais.map(r => {
      const c = Object.assign({}, r);
      delete c.id;
      delete c.criado_em;
      delete c.atualizado_em;
      c.ano = anoNovo;
      return c;
    });

    // Insere em lotes
    const BATCH = 50;
    let inseridos = 0;
    for (let i = 0; i < copies.length; i += BATCH) {
      const lote = copies.slice(i, i + BATCH);
      const r = await fetch(`${apiBaseUrl()}/rest/v1/nomeados`, {
        method:  'POST',
        headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body:    JSON.stringify(lote),
      });
      if (r.ok || r.status === 201) inseridos += lote.length;
    }

    document.getElementById('nom-dup-modal')?.remove();
    T('Duplicação concluída', `${inseridos} registros copiados para ${anoNovo}.`);
    _anoAtivo = anoNovo;
    const sel = document.getElementById('nom-ano-sel');
    if (sel) sel.value = anoNovo;
    carregarNomeados();
  }

  /* ── Registro no router ───────────────────────────────────── */

  VIEW_AUTOLOAD['conselho-nomeados'] = { fn: carregarNomeados };

  /* ── Exposição global ─────────────────────────────────────── */

  window.nomTab              = nomTab;
  window.nomFiltrarAno       = nomFiltrarAno;
  window.nomToggle           = nomToggle;
  window.nomImprimir         = nomImprimir;
  window.nomNovoRegistro     = nomNovoRegistro;
  window.nomMostrarCampos    = nomMostrarCampos;
  window.nomSalvarRegistro   = nomSalvarRegistro;
  window.nomBuscarPessoa     = nomBuscarPessoa;
  window.nomSelecionarPessoa = nomSelecionarPessoa;
  window.nomDuplicarAno      = nomDuplicarAno;
  window.nomDupMarcarTodos   = nomDupMarcarTodos;
  window.nomConfirmarDuplicacao = nomConfirmarDuplicacao;
  window._el                 = window._el || ((id) => document.getElementById(id));

})();
