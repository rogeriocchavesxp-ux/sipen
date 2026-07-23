/* ═══════════════════════════════════════════════════════════════
   SIPEN — Módulo Nomeações Anuais
   nomeados.js · v2.6
   Conselho e Governança — Central de Nomeações da IPPenha
═══════════════════════════════════════════════════════════════ */

(function () {

  /* ── Estado ───────────────────────────────────────────────── */

  let _rows      = [];
  let _anuais    = [];
  let _anoAtivo  = new Date().getFullYear();
  let _tabAtiva  = 'nomeacoes';
  let _minTipos  = null; // cache: nome_upper → tipo (carregado sob demanda)

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

  async function _carregarMinTipos() {
    if (_minTipos) return _minTipos;
    try {
      const r = await fetch(`${apiBaseUrl()}/rest/v1/ministerios?select=nome,tipo`, { headers: apiHeaders() });
      const lista = r.ok ? await r.json() : [];
      _minTipos = {};
      lista.forEach(m => { if (m.nome) _minTipos[m.nome.toUpperCase()] = m.tipo || 'OUTRO'; });
    } catch { _minTipos = {}; }
    return _minTipos;
  }

  /* ── Carregamento de dados ────────────────────────────────── */

  async function carregarNomeados() {
    const container = _el('nom-main-container');
    if (!container) return;
    container.innerHTML = `<div style="padding:32px;text-align:center;color:var(--tx3)">${_sp()}Carregando nomeações…</div>`;

    try {
      // Tenta buscar com filtro de ano; fallback sem filtro
      let url = `${apiBaseUrl()}/rest/v1/nomeados?deleted_at=is.null&order=orgao.asc,nome.asc&limit=2000`;
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
    const lidsoc = lideres.filter(r => r.orgao_tipo === 'sociedade');
    const kpiSubs = {
      'nom-kpi-sub-lideres': `${lideres.filter(r=>r.funcao_lider==='supervisor').length} sup · ${lideres.filter(r=>r.funcao_lider==='coordenador').length} coord · ${lidsoc.length} soc`,
      'nom-kpi-sub-membros': `${mins.length} em ministérios · ${socs.length} em sociedades`,
    };
    Object.entries(kpiSubs).forEach(([id, v]) => _sv(id, v));
  }

  /* ── Bloco colapsável (accordion nativo SIPEN) ───────────── */

  function _bloco(uid, titulo, cor, _bg, pessoas, renderLinha) {
    const qtd = pessoas.length;
    return `
      <div style="background:var(--bg-card);border:1px solid var(--bd1);border-radius:var(--rl);overflow:hidden;margin-bottom:6px">
        <div class="ctit" onclick="nomToggle('${uid}')" style="margin-bottom:0;padding:12px 16px;cursor:pointer;user-select:none">
          <span style="width:6px;height:6px;border-radius:50%;background:${cor};flex-shrink:0;display:inline-block"></span>
          ${titulo}
          <span class="csub">${qtd} pessoa${qtd !== 1 ? 's' : ''}</span>
          <span id="${uid}-chev" style="margin-left:auto;color:var(--tx3);font-size:13px;transition:transform .2s;line-height:1">›</span>
        </div>
        <div id="${uid}-body" style="display:none;border-top:1px solid var(--bd1)">
          ${!qtd
            ? `<p style="padding:10px 16px;color:var(--tx3);font-size:11.5px;margin:0">Nenhum registro.</p>`
            : `<table class="tbl" style="margin:0">${pessoas.map(renderLinha).join('')}</table>`
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
    if (chev) chev.style.transform = open ? '' : 'rotate(90deg)';
  }

  /* ── Linhas de tabela (usa .tbl nativo) ──────────────────── */

  function _linhaLider(r) {
    const area = r.area || r.orgao || '';
    const sub  = r.suborgao ? ` <span class="csub">› ${r.suborgao}</span>` : '';
    return `<tr style="cursor:pointer" onclick="nomEditarRegistro('${r.id}')" title="Clique para editar">
      <td class="tx1b" style="padding-left:20px">${nomePropio(r.nome) || '—'}</td>
      <td><span style="color:var(--tx3);font-size:10.5px">${area}</span>${sub}</td>
      <td style="text-align:right;white-space:nowrap;color:var(--sky);font-weight:600;font-size:11px">${r.cargo || ''}</td>
    </tr>`;
  }

  function _linhaMembro(r) {
    const sub = r.suborgao ? ` <span class="csub">· ${r.suborgao}</span>` : '';
    return `<tr style="cursor:pointer" onclick="nomEditarRegistro('${r.id}')" title="Clique para editar">
      <td class="tx1b" style="padding-left:20px">${nomePropio(r.nome) || '—'}${sub}</td>
      <td style="text-align:right;white-space:nowrap;font-size:11px">${r.cargo || ''}</td>
    </tr>`;
  }

  /* ── Sub-cabeçalho de seção ──────────────────────────────── */

  function _subHeader(label, cor) {
    return `<div class="kpi-lbl" style="color:${cor};margin:14px 0 6px">${label}</div>`;
  }

  /* ── Seção: LÍDERES ───────────────────────────────────────── */

  function _renderSecaoLideres(rows) {
    const lideres = rows.filter(r => r.tipo_nomeacao === 'lider');
    if (!lideres.length) return `<p style="color:var(--tx3);font-size:11.5px;padding:4px 0">Nenhum líder cadastrado para este ano.</p>`;

    const lidsoc = lideres.filter(r => r.orgao_tipo === 'sociedade');
    const lidgov = lideres.filter(r => r.orgao_tipo !== 'sociedade');

    const bySoc = {};
    lidsoc.forEach(r => { const k = r.orgao || '—'; (bySoc[k] = bySoc[k] || []).push(r); });
    const htmlSocLid = Object.keys(bySoc).sort().map((o, i) =>
      _bloco(`nom-soc-lid-${i}`, o, 'var(--gold)', '', bySoc[o], _linhaLider)
    ).join('');

    return `
      ${_bloco('nom-sup',   'Supervisores',    'var(--rose)',   '', lidgov.filter(r => r.funcao_lider === 'supervisor'),  _linhaLider)}
      ${_bloco('nom-coord', 'Coordenadores',   'var(--sky)',    '', lidgov.filter(r => r.funcao_lider === 'coordenador'), _linhaLider)}
      ${_bloco('nom-lider', 'Líderes de Área', 'var(--violet)', '', lidgov.filter(r => r.funcao_lider === 'lider_area'),  _linhaLider)}
      ${lidsoc.length ? `${_subHeader('Liderança de Sociedades Internas', 'var(--gold)')}${htmlSocLid}` : ''}`;
  }

  /* ── Seção: MEMBROS ───────────────────────────────────────── */

  async function _renderSecaoMembros(rows) {
    const membros = rows.filter(r => r.tipo_nomeacao === 'membro');
    const socs    = membros.filter(r => r.tipo_membro === 'sociedade');
    const mins    = membros.filter(r => r.tipo_membro === 'ministerio');

    // Sociedades — agrupadas por sigla/órgão
    const bySoc = {};
    socs.forEach(r => { const k = r.orgao || r.area || '—'; (bySoc[k] = bySoc[k] || []).push(r); });
    const htmlSocs = Object.keys(bySoc).sort()
      .map((o, i) => _bloco(`nom-soc-${i}`, o, 'var(--gold)', '', bySoc[o], _linhaMembro)).join('');

    // Ministérios — agrupados por tipo/categoria
    const tipoMap = await _carregarMinTipos();
    const TIPO_LABEL = {
      MUSICA:      'Música',
      JOVENS:      'Jovens',
      INFANTIL:    'Infantil',
      INTERCESSAO: 'Intercessão',
      EVANGELISMO: 'Evangelismo',
      DIACONIA:    'Diaconia',
      COMUNICACAO: 'Comunicação',
      ACOLHIMENTO: 'Acolhimento & Integração',
      OUTRO:       'Outros',
    };
    const TIPO_ORDER = ['MUSICA','JOVENS','INFANTIL','INTERCESSAO','EVANGELISMO','DIACONIA','COMUNICACAO','ACOLHIMENTO','OUTRO'];

    const byTipo = {};
    mins.forEach(r => {
      const tipo = tipoMap[(r.orgao || '').toUpperCase()] || 'OUTRO';
      const orgao = r.orgao || '—';
      if (!byTipo[tipo]) byTipo[tipo] = {};
      (byTipo[tipo][orgao] = byTipo[tipo][orgao] || []).push(r);
    });

    let htmlMins = '';
    TIPO_ORDER.forEach(tipo => {
      if (!byTipo[tipo]) return;
      const label  = TIPO_LABEL[tipo] || tipo;
      const orgaos = Object.keys(byTipo[tipo]).sort();
      htmlMins += _subHeader(label, 'var(--teal)');
      orgaos.forEach((o, i) => {
        htmlMins += _bloco(`nom-min-${tipo}-${i}`, o, 'var(--teal)', '', byTipo[tipo][o], _linhaMembro);
      });
    });

    return `
      ${_subHeader('Sociedades Internas', 'var(--gold)')}
      ${htmlSocs || '<p style="color:var(--tx3);font-size:11.5px;padding:4px 0">Nenhum registro.</p>'}
      ${_subHeader('Ministérios', 'var(--teal)')}
      ${htmlMins || '<p style="color:var(--tx3);font-size:11.5px;padding:4px 0">Nenhum registro.</p>'}`;
  }

  /* ── Seção: OUTROS ───────────────────────────────────────── */

  function _renderSecaoOutros(rows) {
    const outros = rows.filter(r => r.tipo_nomeacao === 'outro');
    if (!outros.length) return '';

    const byTipo = {};
    outros.forEach(r => {
      const t = r.orgao_tipo || 'outros';
      (byTipo[t] = byTipo[t] || {})[r.orgao || '—'] ||= [];
      byTipo[t][r.orgao || '—'].push(r);
    });

    const LABELS = { governo:'Governo', comissao:'Comissões', grupo:'Grupos', congregacao:'Congregações', outros:'Outros' };
    const CORES  = { governo:'var(--sky)', comissao:'var(--violet)', grupo:'var(--amber)', congregacao:'var(--gr)', outros:'var(--tx3)' };

    return Object.keys(byTipo).sort().map(tipo => {
      const cor   = CORES[tipo] || 'var(--tx3)';
      const blocos = Object.keys(byTipo[tipo]).sort().map((o, i) =>
        _bloco(`nom-out-${tipo}-${i}`, o, cor, '', byTipo[tipo][o], _linhaMembro)
      ).join('');
      return `${_subHeader(LABELS[tipo] || tipo, cor)}${blocos}`;
    }).join('');
  }

  /* ── Render principal: Nomeações ──────────────────────────── */

  async function _renderNomeacoes() {
    const container = _el('nom-main-container');
    if (!container) return;

    const rows   = _rows;
    const anual  = _anuais.find(a => a.ano === _anoAtivo);
    const outros = rows.filter(r => r.tipo_nomeacao === 'outro');

    if (!rows.length) {
      container.innerHTML = `<div class="card"><p style="color:var(--tx3);font-size:11.5px;margin:0">Nenhum registro para ${_anoAtivo}. Use <strong>+ Novo Registro</strong> para cadastrar ou <strong>Duplicar ano anterior</strong> para copiar de outro ano.</p></div>`;
      return;
    }

    const _badge = (status) => {
      const MAP = { publicada:'badge-presente', aprovada:'badge-online', em_preparacao:'badge-online', rascunho:'badge-justif', encerrada:'badge-justif', arquivada:'badge-justif' };
      return `<span class="${MAP[status] || 'badge-justif'}">${_labelStatus(status)}</span>`;
    };

    container.innerHTML = `
      ${anual ? `
        <div class="alr" style="background:rgba(48,209,88,.06);border-color:rgba(48,209,88,.2)">
          <span class="alr-i" style="color:var(--gr)">◎</span>
          <div>
            <strong style="color:var(--gr)">Nomeações ${anual.ano}</strong>
            ${anual.status ? _badge(anual.status) : ''}
            ${anual.ata_origem ? `<span class="csub" style="margin-left:6px">${anual.ata_origem}</span>` : ''}
            ${anual.periodo_inicio ? `<span class="csub" style="margin-left:6px">${_fmtPeriodo(anual.periodo_inicio, anual.periodo_fim)}</span>` : ''}
          </div>
        </div>` : ''}

      <div class="card" style="margin-bottom:10px;padding:14px 16px">
        <div class="ctit" style="margin-bottom:10px;color:var(--rose)">Líderes</div>
        ${_renderSecaoLideres(rows)}
      </div>

      <div class="card" style="margin-bottom:10px;padding:14px 16px">
        <div class="ctit" style="margin-bottom:6px;color:var(--teal)">Membros</div>
        <div id="nom-membros-body"><div style="color:var(--tx3);font-size:12px;padding:8px 0">${_sp()}Carregando…</div></div>
      </div>

      ${outros.length ? `
        <div class="card" style="margin-bottom:10px;padding:14px 16px">
          <div class="ctit" style="margin-bottom:6px;color:var(--tx2)">Demais Órgãos</div>
          ${_renderSecaoOutros(rows)}
        </div>` : ''}
    `;

    // Preenche Membros de forma assíncrona (aguarda fetch de ministerios)
    const membrosEl = _el('nom-membros-body');
    if (membrosEl) membrosEl.innerHTML = await _renderSecaoMembros(rows);
  }

  /* ── Render: Histórico ────────────────────────────────────── */

  function _renderHistorico() {
    const container = _el('nom-main-container');
    if (!container) return;

    if (!_anuais.length) {
      container.innerHTML = `<div class="card"><p style="color:var(--tx3);font-size:11.5px;margin:0">Nenhum histórico disponível.</p></div>`;
      return;
    }

    const STATUS_CLASS = {
      publicada:     'badge-presente',
      aprovada:      'badge-online',
      em_preparacao: 'badge-online',
      rascunho:      'badge-justif',
      encerrada:     'badge-justif',
      arquivada:     'badge-justif',
    };

    const rows = _anuais.map(a => `
      <tr onclick="nomFiltrarAno(${a.ano}); nomTab('nomeacoes', _el('nom-tab-nomeacoes'))" style="cursor:pointer">
        <td class="tx1b">${a.ano}</td>
        <td class="tx1">${a.titulo}</td>
        <td><span class="${STATUS_CLASS[a.status] || 'badge-justif'}">${_labelStatus(a.status)}</span></td>
        <td>${_fmtPeriodo(a.periodo_inicio, a.periodo_fim)}</td>
        <td>${a.ata_origem || '—'}</td>
        <td class="r"><button class="tbt" onclick="event.stopPropagation(); nomFiltrarAno(${a.ano}); nomTab('nomeacoes', _el('nom-tab-nomeacoes'))">Ver</button></td>
      </tr>`).join('');

    container.innerHTML = `
      <div class="card">
        <div class="ctit">Histórico de Nomeações Anuais</div>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr>
              <th>Ano</th><th>Título</th><th>Status</th><th>Período</th><th>Ata</th><th class="r">Ações</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
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
      const lidsoc = lideres.filter(x => x.orgao_tipo === 'sociedade');
      const lidgov = lideres.filter(x => x.orgao_tipo !== 'sociedade');
      const grupos = [
        { key:'supervisor',  label:'Supervisores' },
        { key:'coordenador', label:'Coordenadores' },
        { key:'lider_area',  label:'Líderes de Área' },
      ];
      const _tbl = ps => `<table style="width:100%;border-collapse:collapse;font-size:11px">
        ${ps.map(p => `<tr style="border-bottom:1px solid #eee"><td style="padding:3px 0">${nomePropio(p.nome)}</td><td style="color:#777">${p.orgao||''}${p.suborgao?' › '+p.suborgao:''}</td><td style="text-align:right;color:#555">${p.cargo||''}</td></tr>`).join('')}
      </table>`;
      let html = `<h2 style="font-size:14px;margin:24px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px">LÍDERES</h2>`;
      html += grupos.map(g => {
        const ps = lidgov.filter(x => x.funcao_lider === g.key);
        if (!ps.length) return '';
        return `<h3 style="font-size:12px;margin:14px 0 4px;color:#555">${g.label}</h3>${_tbl(ps)}`;
      }).join('');
      if (lidsoc.length) {
        html += `<h3 style="font-size:12px;margin:14px 0 4px;color:#555">Liderança de Sociedades Internas</h3>`;
        const bySoc = {};
        lidsoc.forEach(x => { const k = x.orgao||'—'; (bySoc[k]=bySoc[k]||[]).push(x); });
        Object.keys(bySoc).sort().forEach(k => {
          html += `<div style="margin-bottom:6px"><strong style="font-size:11px">${k}</strong>${_tbl(bySoc[k])}</div>`;
        });
      }
      return html;
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
              ${bySoc[k].map(p => `<tr style="border-bottom:1px solid #f5f5f5"><td style="padding:2px 0 2px 8px">${nomePropio(p.nome)}</td><td style="text-align:right;color:#555">${p.cargo||''}</td></tr>`).join('')}
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
              ${byMin[k].map(p => `<tr style="border-bottom:1px solid #f5f5f5"><td style="padding:2px 0 2px 8px">${nomePropio(p.nome)}${p.suborgao?` (${p.suborgao})`:''}</td><td style="text-align:right;color:#555">${p.cargo||''}</td></tr>`).join('')}
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

  function nomNovoRegistro(opts) {
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
              <select id="nom-f-tipo" onchange="nomMostrarCampos()" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none">
                <option value="">Selecione…</option>
                <option value="lider">Líder</option>
                <option value="membro">Membro</option>
              </select>
            </div>

            <div id="nom-f-funcao-div" style="display:none">
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Função do Líder</label>
              <select id="nom-f-funcao" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none">
                <option value="supervisor">Supervisor</option>
                <option value="presidente">Presidente</option>
                <option value="coordenador">Coordenador</option>
                <option value="lider_area">Líder de Área</option>
                <option value="conselheiro">Conselheiro</option>
                <option value="tesoureiro">Tesoureiro</option>
              </select>
            </div>

            <div>
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Categoria Institucional <span style="color:var(--rose)">*</span></label>
              <select id="nom-f-categoria" onchange="nomCarregarOrgaos()" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none">
                <option value="">— Selecione o tipo de estrutura —</option>
                <option value="ministerio">Ministério</option>
                <option value="sociedade">Sociedade Interna</option>
                <option value="departamento">Departamento</option>
                <option value="congregacao">Congregação</option>
              </select>
            </div>

            <div>
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Cargo / Função</label>
              <input id="nom-f-cargo" type="text" placeholder="Ex: Coordenador, Professor, Equipe…" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none">
            </div>

            <div style="grid-column:1/-1">
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Área / Ministério / Sociedade / Congregação <span style="color:var(--rose)">*</span></label>
              <select id="nom-f-orgao-sel" onchange="nomCarregarSetores()" disabled style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none;cursor:pointer">
                <option value="">— Selecione uma Categoria Institucional primeiro —</option>
              </select>
              <input type="hidden" id="nom-f-orgao-nome">
            </div>

            <div id="nom-f-suborgao-wrap" style="grid-column:1/-1;display:none">
              <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Subárea / Grupo</label>
              <select id="nom-f-suborgao-sel" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none;cursor:pointer">
                <option value="">— Nenhuma subárea —</option>
              </select>
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

    // Pré-preenchimento via opts = { categoria, orgaoId }
    if (opts?.categoria) {
      const catSel = _el('nom-f-categoria');
      if (catSel) {
        catSel.value = opts.categoria;
        nomCarregarOrgaos().then(() => {
          if (opts.orgaoId) {
            const orgSel = _el('nom-f-orgao-sel');
            if (orgSel) {
              orgSel.value = String(opts.orgaoId);
              const opt = orgSel.options[orgSel.selectedIndex];
              const nomHid = _el('nom-f-orgao-nome');
              if (nomHid) nomHid.value = opt?.getAttribute('data-nome') || opt?.textContent || '';
            }
          }
        });
      }
    }
  }

  async function nomEditarRegistro(id) {
    const r = _rows.find(x => String(x.id) === String(id));
    if (!r) return;

    nomNovoRegistro(); // abre o modal vazio

    // Ajusta título e adiciona id oculto
    const modal = _el('nom-modal');
    const titleEl = modal?.querySelector('div[style*="font-weight:700"]');
    if (titleEl) titleEl.textContent = 'Editar Registro de Nomeação';

    const hid = document.createElement('input');
    hid.type = 'hidden'; hid.id = 'nom-f-edit-id'; hid.value = id;
    modal?.appendChild(hid);

    // Preenche campos simples
    const sv = (eid, val) => { const e = _el(eid); if (e && val != null) e.value = val; };
    sv('nom-f-ano',    r.ano || _anoAtivo);
    sv('nom-f-nome',   r.nome || '');
    sv('nom-f-cargo',  r.cargo || '');
    sv('nom-f-inicio', r.data_inicio || '');
    sv('nom-f-fim',    r.data_fim || '');
    sv('nom-f-ata',    r.ata_origem || '');
    sv('nom-f-obs',    r.obs || '');
    if (_el('nom-f-nome-pid')) _el('nom-f-nome-pid').value = r.pessoa_id || '';

    // Tipo de nomeação + campos condicionais
    sv('nom-f-tipo', r.tipo_nomeacao || '');
    nomMostrarCampos();
    if (r.funcao_lider) sv('nom-f-funcao', r.funcao_lider);

    // Categoria + Orgão (assíncrono)
    const CAT_MAP = { ministerio:'ministerio', sociedade:'sociedade', comissao:'departamento', congregacao:'congregacao' };
    const cat = CAT_MAP[r.orgao_tipo] || '';
    if (cat) {
      sv('nom-f-categoria', cat);
      await nomCarregarOrgaos();
      const orgSel = _el('nom-f-orgao-sel');
      const orgNome = (r.orgao || r.area || '').toLowerCase();
      if (orgSel && orgNome) {
        for (const opt of orgSel.options) {
          const n = (opt.getAttribute('data-nome') || opt.textContent).toLowerCase();
          if (n === orgNome) { orgSel.value = opt.value; break; }
        }
        await nomCarregarSetores();
        if (r.suborgao) {
          const subSel = _el('nom-f-suborgao-sel');
          const subNome = r.suborgao.toLowerCase();
          if (subSel) {
            for (const opt of subSel.options) {
              const n = (opt.getAttribute('data-nome') || opt.textContent).toLowerCase();
              if (n === subNome) { subSel.value = opt.value; break; }
            }
          }
        }
      }
    }
  }

  function nomMostrarCampos() {
    const tipo = (_el('nom-f-tipo') || {}).value;
    const fDiv = _el('nom-f-funcao-div');
    if (fDiv) fDiv.style.display = tipo === 'lider' ? '' : 'none';
    // Limpa seleções dependentes ao trocar o tipo
    const catSel = _el('nom-f-categoria');
    if (catSel) { catSel.value = ''; nomCarregarOrgaos(); }
  }

  /* ── Campos institucionais: carregamento dinâmico ─────────── */

  const _selSt = 'width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none;cursor:pointer';

  async function nomCarregarOrgaos() {
    const cat    = (_el('nom-f-categoria') || {}).value;
    const sel    = _el('nom-f-orgao-sel');
    const wSub   = _el('nom-f-suborgao-wrap');
    const selSub = _el('nom-f-suborgao-sel');

    if (!sel) return;

    // Limpa dependentes
    if (selSub) selSub.innerHTML = '<option value="">— Nenhuma subárea —</option>';
    if (wSub) wSub.style.display = 'none';

    if (!cat) {
      sel.innerHTML = '<option value="">— Selecione uma Categoria Institucional primeiro —</option>';
      sel.disabled = true;
      return;
    }

    sel.disabled = true;
    sel.innerHTML = '<option value="">Carregando…</option>';

    try {
      let items = [];
      if (cat === 'ministerio') {
        const r = await fetch(`${apiBaseUrl()}/rest/v1/ministerios?ativo=eq.true&select=id,nome&order=nome.asc`, { headers: apiHeaders() });
        if (r.ok) items = await r.json();
      } else if (cat === 'sociedade') {
        const r = await fetch(`${apiBaseUrl()}/rest/v1/sociedades?ativo=eq.true&select=id,orgao&order=sigla.asc`, { headers: apiHeaders() });
        if (r.ok) { const socs = await r.json(); items = socs.map(s => ({ id: s.id, nome: s.orgao })); }
      } else if (cat === 'departamento') {
        const r = await fetch(`${apiBaseUrl()}/rest/v1/dept_administrativos?select=id,nome&order=nome.asc`, { headers: apiHeaders() });
        if (r.ok) items = await r.json();
      } else if (cat === 'congregacao') {
        const r = await fetch(`${apiBaseUrl()}/rest/v1/congregacoes?deleted_at=is.null&select=id,nome&order=nome.asc`, { headers: apiHeaders() });
        if (r.ok) items = await r.json();
      }

      if (!items.length) {
        sel.innerHTML = '<option value="" disabled>Nenhum registro ativo — cadastre no módulo Departamentos</option>';
        sel.disabled = true;
        return;
      }

      sel.innerHTML = '<option value="">— Selecione —</option>' +
        items.map(i => `<option value="${i.id}" data-nome="${escapeHtml(i.nome)}">${escapeHtml(i.nome)}</option>`).join('');
      sel.disabled = false;

    } catch {
      sel.innerHTML = '<option value="">Erro ao carregar — tente novamente</option>';
      sel.disabled = true;
    }
  }

  async function nomCarregarSetores() {
    const sel    = _el('nom-f-orgao-sel');
    const wSub   = _el('nom-f-suborgao-wrap');
    const selSub = _el('nom-f-suborgao-sel');
    const cat    = (_el('nom-f-categoria') || {}).value;

    if (!sel || !wSub || !selSub) return;

    // Armazena nome do orgão selecionado
    const opt = sel.options[sel.selectedIndex];
    const nomHid = _el('nom-f-orgao-nome');
    if (nomHid) nomHid.value = opt?.getAttribute('data-nome') || opt?.textContent || '';

    const orgaoId = sel.value;

    if (!orgaoId || cat !== 'ministerio') {
      wSub.style.display = 'none';
      selSub.innerHTML = '<option value="">— Nenhuma subárea —</option>';
      return;
    }

    selSub.innerHTML = '<option value="">Carregando subáreas…</option>';

    try {
      const r = await fetch(
        `${apiBaseUrl()}/rest/v1/ministerio_setores?ministerio_id=eq.${orgaoId}&select=id,nome&order=nome.asc`,
        { headers: apiHeaders() }
      );
      const setores = r.ok ? await r.json() : [];

      if (!setores.length) {
        wSub.style.display = 'none';
        selSub.innerHTML = '<option value="">— Nenhuma subárea —</option>';
        return;
      }

      wSub.style.display = '';
      selSub.innerHTML = '<option value="">— Nenhuma / todas —</option>' +
        setores.map(s => `<option value="${s.id}" data-nome="${escapeHtml(s.nome)}">${escapeHtml(s.nome)}</option>`).join('');

    } catch {
      wSub.style.display = 'none';
    }
  }

  /* ── Salvar registro ─────────────────────────────────────── */

  async function nomSalvarRegistro() {
    const v    = id => (_el(id) || {}).value || null;
    const nome = v('nom-f-nome');
    const tipo = v('nom-f-tipo');
    const cat  = v('nom-f-categoria');

    const orgaoSel  = _el('nom-f-orgao-sel');
    const subSel    = _el('nom-f-suborgao-sel');
    const orgaoId   = orgaoSel?.value || null;
    const orgaoNome = (_el('nom-f-orgao-nome') || {}).value || orgaoSel?.options[orgaoSel.selectedIndex]?.getAttribute('data-nome') || null;
    const subNome   = subSel?.value ? (subSel.options[subSel.selectedIndex]?.getAttribute('data-nome') || null) : null;

    if (!nome)    { T('Campo obrigatório', 'Informe o nome da pessoa.');              return; }
    if (!tipo)    { T('Campo obrigatório', 'Selecione o tipo de nomeação.');           return; }
    if (!cat)     { T('Campo obrigatório', 'Selecione a categoria institucional.');    return; }
    if (!orgaoId) { T('Campo obrigatório', 'Selecione a área, ministério ou sociedade.'); return; }

    const TIPO_MEMBRO_MAP = { ministerio:'ministerio', sociedade:'sociedade', departamento:'outro', congregacao:'congregacao' };
    const ORGAO_TIPO_MAP  = { ministerio:'ministerio', sociedade:'sociedade', departamento:'comissao', congregacao:'congregacao' };

    const payload = {
      nome,
      pessoa_id:     (_el('nom-f-nome-pid') || {}).value || null,
      ano:           parseInt(v('nom-f-ano')) || _anoAtivo,
      tipo_nomeacao: tipo,
      funcao_lider:  tipo === 'lider' ? v('nom-f-funcao') : null,
      tipo_membro:   tipo === 'membro' ? (TIPO_MEMBRO_MAP[cat] || 'ministerio') : null,
      orgao_tipo:    ORGAO_TIPO_MAP[cat] || 'ministerio',
      orgao:         orgaoNome,
      suborgao:      subNome,
      area:          orgaoNome,
      cargo:         v('nom-f-cargo'),
      data_inicio:   v('nom-f-inicio'),
      data_fim:      v('nom-f-fim'),
      ata_origem:    v('nom-f-ata'),
      obs:           v('nom-f-obs'),
    };
    Object.keys(payload).forEach(k => { if (payload[k] === null || payload[k] === '') delete payload[k]; });

    const editId = (_el('nom-f-edit-id') || {}).value || null;
    try {
      const res = editId
        ? await fetch(`${apiBaseUrl()}/rest/v1/nomeados?id=eq.${editId}`, {
            method:  'PATCH',
            headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body:    JSON.stringify(payload),
          })
        : await fetch(`${apiBaseUrl()}/rest/v1/nomeados`, {
            method:  'POST',
            headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body:    JSON.stringify(payload),
          });
      if (!res.ok) throw new Error(await res.text());
      _el('nom-modal')?.remove();
      T(editId ? 'Nomeação atualizada' : 'Nomeação salva', `${nome} foi ${editId ? 'atualizado(a)' : 'adicionado(a)'} com sucesso.`);
      carregarNomeados();
    } catch (e) {
      T('Erro ao salvar', e.message);
    }
  }

  /* ── Exportação CSV ──────────────────────────────────────── */

  function nomExportarCSV() {
    const anual = _anuais.find(a => a.ano === _anoAtivo) || {};
    const _esc  = v => {
      if (v == null) return '';
      const s = String(v);
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const _tipoLabel = r => r.tipo_nomeacao === 'lider' ? 'Líder' : r.tipo_nomeacao === 'membro' ? 'Membro' : 'Outro';
    const _funcLabel = r => ({ supervisor:'Supervisor', presidente:'Presidente', coordenador:'Coordenador', lider_area:'Líder de Área', conselheiro:'Conselheiro', tesoureiro:'Tesoureiro' }[r.funcao_lider] || '');
    const _membLabel = r => ({ sociedade:'Sociedade Interna', ministerio:'Ministério', comissao:'Comissão', grupo:'Grupo', congregacao:'Congregação' }[r.tipo_membro] || r.orgao_tipo || '');

    const cab = ['Ano','Tipo','Função / Vínculo','Área / Ministério / Sociedade','Sub-área','Nome','Cargo','Ata de Origem'];
    const linhas = [
      cab.map(_esc).join(','),
      ..._rows.map(r => [
        r.ano || _anoAtivo,
        _tipoLabel(r),
        r.tipo_nomeacao === 'lider' ? _funcLabel(r) : _membLabel(r),
        r.orgao || r.area || '',
        r.suborgao || '',
        r.nome || '',
        r.cargo || '',
        r.ata_origem || anual.ata_origem || '',
      ].map(_esc).join(',')),
    ];

    const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `nomeacoes-${_anoAtivo}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Exportação Excel (HTML table → .xls) ────────────────── */

  function nomExportarExcel() {
    const anual = _anuais.find(a => a.ano === _anoAtivo) || { titulo: `Nomeações ${_anoAtivo}` };
    const rows  = _rows;

    const _cel = (v, cls = '') => `<td class="${cls}">${v == null ? '' : String(v).replace(/</g,'&lt;')}</td>`;
    const _row = (...tds) => `<tr>${tds.join('')}</tr>`;
    const _cab = (label, cols, bg, fg = '#fff') =>
      `<tr><td colspan="${cols}" style="background:${bg};color:${fg};font-weight:bold;font-size:11pt">${label}</td></tr>`;

    const _headerRow = cols => `<tr>${cols.map(c => `<td style="background:#f0f0f0;font-weight:bold;border:1px solid #ccc;padding:4px 8px">${c}</td>`).join('')}</tr>`;
    const _dataRow   = cols => `<tr>${cols.map(c => `<td style="border:1px solid #ddd;padding:4px 8px;font-size:10pt">${c == null ? '' : String(c).replace(/</g,'&lt;')}</td>`).join('')}</tr>`;

    const lideres = rows.filter(r => r.tipo_nomeacao === 'lider');
    const membros = rows.filter(r => r.tipo_nomeacao === 'membro');
    const outros  = rows.filter(r => r.tipo_nomeacao === 'outro');

    let body = `
      <tr><td colspan="5" style="font-size:16pt;font-weight:bold">${anual.titulo.toUpperCase()}</td></tr>
      <tr><td colspan="5" style="font-size:10pt;color:#555">Igreja Presbiteriana da Penha</td></tr>
      ${anual.ata_origem ? `<tr><td colspan="5" style="font-size:10pt;color:#555">${anual.ata_origem}</td></tr>` : ''}
      ${anual.periodo_inicio ? `<tr><td colspan="5" style="font-size:10pt;color:#555">${_fmtPeriodo(anual.periodo_inicio, anual.periodo_fim)}</td></tr>` : ''}
      <tr></tr>`;

    if (lideres.length) {
      body += _cab('LÍDERES', 5, '#1a3a5c');
      body += _headerRow(['Tipo', 'Nome', 'Área / Ministério', 'Sub-área', 'Cargo']);
      [
        { key: 'supervisor',  label: 'Supervisores'   },
        { key: 'coordenador', label: 'Coordenadores'  },
        { key: 'lider_area',  label: 'Líderes de Área' },
      ].forEach(g => {
        const ps = lideres.filter(r => r.funcao_lider === g.key);
        if (!ps.length) return;
        body += _cab(g.label, 5, '#2d6a9f');
        ps.forEach(p => body += _dataRow([g.label, p.nome, p.orgao || p.area || '', p.suborgao || '', p.cargo || '']));
      });
      body += `<tr></tr>`;
    }

    if (membros.length) {
      body += _cab('MEMBROS', 5, '#1a4a2e');
      body += _headerRow(['Tipo', 'Nome', 'Área / Ministério', 'Sub-área', 'Cargo']);

      const socs = membros.filter(r => r.tipo_membro === 'sociedade');
      if (socs.length) {
        body += _cab('Sociedades Internas', 5, '#2d7a4e');
        const bySoc = {};
        socs.forEach(r => { const k = r.orgao || '—'; (bySoc[k] = bySoc[k] || []).push(r); });
        Object.keys(bySoc).sort().forEach(k => {
          body += `<tr><td colspan="5" style="background:#d9f0e8;font-weight:bold;padding:3px 8px">${k}</td></tr>`;
          bySoc[k].forEach(p => body += _dataRow(['Sociedade', p.nome, k, p.suborgao || '', p.cargo || '']));
        });
      }

      const mins = membros.filter(r => r.tipo_membro === 'ministerio');
      if (mins.length) {
        body += _cab('Ministérios', 5, '#2d6a9f');
        const byMin = {};
        mins.forEach(r => { const k = r.orgao || '—'; (byMin[k] = byMin[k] || []).push(r); });
        Object.keys(byMin).sort().forEach(k => {
          body += `<tr><td colspan="5" style="background:#d9e8f5;font-weight:bold;padding:3px 8px">${k}</td></tr>`;
          byMin[k].forEach(p => body += _dataRow(['Ministério', p.nome, k, p.suborgao || '', p.cargo || '']));
        });
      }
      body += `<tr></tr>`;
    }

    if (outros.length) {
      body += _cab('DEMAIS ÓRGÃOS', 5, '#4a3a1a');
      body += _headerRow(['Tipo', 'Nome', 'Órgão', 'Sub-órgão', 'Cargo']);
      outros.forEach(p => body += _dataRow([p.orgao_tipo || '', p.nome || '', p.orgao || '', p.suborgao || '', p.cargo || '']));
    }

    const xls = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body><table style="font-family:Arial;font-size:10pt;border-collapse:collapse">${body}</table></body></html>`;

    const blob = new Blob(['﻿' + xls], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `nomeacoes-${_anoAtivo}.xls`; a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Menu dropdown de exportação ─────────────────────────── */

  function nomMenuExportar(btn) {
    const existing = document.getElementById('nom-export-menu');
    if (existing) { existing.remove(); return; }

    const menu = document.createElement('div');
    menu.id = 'nom-export-menu';
    const rect = btn.getBoundingClientRect();
    menu.style.cssText = `position:fixed;top:${rect.bottom + 4}px;left:${rect.left}px;z-index:500;background:var(--bg-card);border:1px solid var(--bd2);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.2);min-width:170px;overflow:hidden`;

    const _item = (icon, label, fn) =>
      `<div onclick="${fn};document.getElementById('nom-export-menu')?.remove()"
        style="padding:10px 14px;cursor:pointer;font-size:12px;color:var(--tx1);display:flex;align-items:center;gap:8px"
        onmouseover="this.style.background='var(--bg-surface2)'" onmouseout="this.style.background=''">
        <span>${icon}</span><span>${label}</span></div>`;

    menu.innerHTML =
      _item('📄', 'Exportar CSV',   'nomExportarCSV()') +
      `<div style="height:1px;background:var(--bd1)"></div>` +
      _item('📊', 'Exportar Excel', 'nomExportarExcel()') +
      `<div style="height:1px;background:var(--bd1)"></div>` +
      _item('🖨',  'Imprimir / PDF',  'nomImprimir()');

    document.body.appendChild(menu);
    const close = e => { if (!menu.contains(e.target) && e.target !== btn) { menu.remove(); document.removeEventListener('click', close); } };
    setTimeout(() => document.addEventListener('click', close), 0);
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
        `${apiBaseUrl()}/rest/v1/v_membros?nome=ilike.${t}&status=eq.ativo&select=pessoa_id,nome&order=nome.asc&limit=15`,
        { headers: apiHeaders() }
      );
      const pessoas = res.ok ? await res.json() : [];

      if (!pessoas.length) {
        list.innerHTML = `<div style="padding:8px 12px;color:var(--tx3);font-size:11px">Nenhum membro ativo encontrado para "<b>${escapeHtml(termo)}</b>". O nome será salvo como digitado.</div>`;
        return;
      }

      list.innerHTML = pessoas.map(p => `
        <div data-pid="${p.pessoa_id}" data-nome="${escapeHtml(p.nome)}"
          onclick="nomSelecionarPessoa('${inp.id}',this)"
          style="padding:9px 12px;cursor:pointer;font-size:12px;color:var(--tx1);border-bottom:1px solid var(--bd1)"
          onmouseover="this.style.background='var(--bg-surface2)'"
          onmouseout="this.style.background=''">
          ${nomePropio(p.nome)}
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
        `${apiBaseUrl()}/rest/v1/nomeados?ano=eq.${anoAnterior}&deleted_at=is.null&order=orgao_tipo.asc,orgao.asc,nome.asc&limit=2000`,
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
                <span style="flex:1;font-size:12px;color:var(--tx1)">${nomePropio(p.nome)}</span>
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

  /* ── Dashboard do Conselho — KPIs reais ──────────────────── */

  async function conselhoKpiLoad() {
    try {
      const hoje = new Date();
      const em90 = new Date(hoje.getTime() + 90*24*60*60*1000).toISOString().split('T')[0];
      const ano  = hoje.getFullYear();
      const api  = apiBaseUrl(), hdrs = apiHeaders();
      const [rNom, rOrd, rMand] = await Promise.all([
        fetch(`${api}/rest/v1/nomeados?ano=eq.${ano}&status=eq.ativo&deleted_at=is.null&select=id`,                                              {headers:hdrs}),
        fetch(`${api}/rest/v1/v_oficiais?status=in.(ativo,especial)&select=id`,                                                                  {headers:hdrs}),
        fetch(`${api}/rest/v1/oficiais?status=in.(ativo,especial)&deleted_at=is.null&fim_mandato=not.is.null&fim_mandato=lte.${em90}&select=id`, {headers:hdrs}),
      ]);
      const nom  = rNom.ok  ? (await rNom.json()).length  : 0;
      const ord  = rOrd.ok  ? (await rOrd.json()).length  : 0;
      const mand = rMand.ok ? (await rMand.json()).length : 0;
      const set = (id, v, d) => {
        const el = document.getElementById(id); if (el) el.textContent = v;
        const de = document.getElementById(id+'-d'); if (de && d !== undefined) de.textContent = d;
      };
      set('cdash-kpi-nom',  nom,  `nomeados ativos — ${ano}`);
      set('cdash-kpi-ord',  ord,  'pastores, presbíteros e diáconos');
      set('cdash-kpi-mand', mand, mand ? '⚠ próximos 90 dias' : 'nenhum a vencer em breve');
    } catch(e) { console.warn('[conselho-kpi]', e.message); }
  }

  /* ── Registro no router ───────────────────────────────────── */

  VIEW_AUTOLOAD['conselho-nomeados'] = { fn: carregarNomeados };
  VIEW_AUTOLOAD['conselho-dash']     = { fn: conselhoKpiLoad };

  /* ── Exposição global ─────────────────────────────────────── */

  window.nomTab              = nomTab;
  window.nomFiltrarAno       = nomFiltrarAno;
  window.nomToggle           = nomToggle;
  window.nomImprimir         = nomImprimir;
  window.nomExportarCSV      = nomExportarCSV;
  window.nomExportarExcel    = nomExportarExcel;
  window.nomMenuExportar     = nomMenuExportar;
  window.nomNovoRegistro     = nomNovoRegistro;
  window.nomEditarRegistro   = nomEditarRegistro;
  window.nomMostrarCampos    = nomMostrarCampos;
  window.nomCarregarOrgaos   = nomCarregarOrgaos;
  window.nomCarregarSetores  = nomCarregarSetores;
  window.nomSalvarRegistro   = nomSalvarRegistro;
  window.nomBuscarPessoa     = nomBuscarPessoa;
  window.nomSelecionarPessoa = nomSelecionarPessoa;
  window.nomDuplicarAno      = nomDuplicarAno;
  window.nomDupMarcarTodos   = nomDupMarcarTodos;
  window.nomConfirmarDuplicacao = nomConfirmarDuplicacao;
  window._el                 = window._el || ((id) => document.getElementById(id));

})();
