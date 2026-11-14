/* ═══════════════════════════════════════════════════════════════
   SIPEN — Relatório de Liderança
   relatorio-lideranca.js · v1.0
   Conselho e Governança — Relatório consolidado por ano
═══════════════════════════════════════════════════════════════ */

(function () {

  /* ── Estado ───────────────────────────────────────────────── */

  let _oficiais   = [];
  let _nomeados   = [];
  let _anoAtivo   = new Date().getFullYear();
  let _filtroTipo = 'todos';   // todos | ordenados | nomeados
  let _filtroOrg  = '';
  let _busca      = '';

  const TIPO_LABEL = {
    ministerio:  'Ministérios',
    governo:     'Órgãos de Governo',
    comissao:    'Comissões',
    sociedade:   'Sociedades',
    grupo:       'Grupos de Apoio',
    congregacao: 'Congregações',
    departamento:'Departamentos',
  };

  const TIPO_ORDER = ['governo','ministerio','comissao','sociedade','congregacao','grupo','departamento'];

  const CARGO_LABEL = {
    supervisor:    'Supervisão',
    coordenador:   'Coordenação',
    conselheiro:   'Conselheiro',
    lider_area:    'Líder de Área',
    presidente:    'Presidente',
    vice_presidente:'Vice-Presidente',
    secretario:    'Secretário(a)',
    tesoureiro:    'Tesoureiro(a)',
    membro:        'Equipe',
  };

  /* ── Helpers ──────────────────────────────────────────────── */

  function _el(id)       { return document.getElementById(id); }
  function _api()        { return apiBaseUrl(); }
  function _hdrs()       { return apiHeaders(); }

  function _nomePessoa(r) {
    return r.pessoas?.nome || r.nome || '—';
  }

  function _capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  function _matchBusca(str) {
    if (!_busca) return true;
    return (str || '').toLowerCase().normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .includes(
        _busca.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
      );
  }

  /* ── Carregamento ─────────────────────────────────────────── */

  async function carregarRelatorioLideranca() {
    const ct = _el('rel-lid-ct');
    if (!ct) return;
    ct.innerHTML = '<div style="padding:32px;text-align:center;color:var(--tx3)">Carregando…</div>';

    try {
      const api  = _api();
      const hdrs = _hdrs();

      const [resOfc, resNom] = await Promise.all([
        fetch(`${api}/rest/v1/oficiais?deleted_at=is.null&status=in.(ativo,especial)&select=id,cargo,status,posse,fim_mandato,area,obs,pessoa_id,pessoas(id,nome)&order=cargo.asc,pessoas(nome).asc`, { headers: hdrs }),
        fetch(`${api}/rest/v1/nomeados?deleted_at=is.null&status=in.(ativo,indicado)&ano=eq.${_anoAtivo}&select=id,orgao_tipo,orgao,suborgao,cargo,nivel,nome,pessoa_id,tipo_nomeacao,funcao_lider,ano,pessoas(id,nome)&order=orgao_tipo.asc,orgao.asc,suborgao.asc,cargo.asc`, { headers: hdrs }),
      ]);

      if (!resOfc.ok) throw new Error(`Oficiais: HTTP ${resOfc.status}`);
      if (!resNom.ok) throw new Error(`Nomeados: HTTP ${resNom.status}`);

      _oficiais = await resOfc.json();
      _nomeados = await resNom.json();

      _popularFiltroAnos();
      _popularFiltroOrgs();
      _renderRelatorio();

    } catch (e) {
      if (ct) ct.innerHTML = `<div style="padding:32px;color:var(--rose)">${e.message}</div>`;
    }
  }

  /* ── Filtro de anos ───────────────────────────────────────── */

  function _popularFiltroAnos() {
    const sel = _el('rel-lid-ano');
    if (!sel) return;
    const anos = [...new Set(_nomeados.map(r => r.ano).filter(Boolean))];
    const ano  = new Date().getFullYear();
    const todos = [...new Set([ano, ano + 1, ...anos])].sort((a, b) => b - a);
    const cur = _anoAtivo;
    sel.innerHTML = todos.map(a =>
      `<option value="${a}" ${a === cur ? 'selected' : ''}>${a}</option>`
    ).join('');
  }

  /* ── Filtro de órgãos ─────────────────────────────────────── */

  function _popularFiltroOrgs() {
    const sel = _el('rel-lid-org');
    if (!sel) return;
    const orgs = [...new Set(_nomeados.map(r => r.orgao).filter(Boolean))].sort();
    sel.innerHTML = `<option value="">Todos os ministérios</option>` +
      orgs.map(o => `<option value="${o}" ${o === _filtroOrg ? 'selected' : ''}>${o}</option>`).join('');
  }

  /* ── Render principal ─────────────────────────────────────── */

  function _renderRelatorio() {
    const ct = _el('rel-lid-ct');
    if (!ct) return;

    const partes = [];

    if (_filtroTipo !== 'nomeados') {
      const html = _renderOrdenados();
      if (html) partes.push(html);
    }

    if (_filtroTipo !== 'ordenados') {
      const html = _renderNomeados();
      if (html) partes.push(html);
    }

    if (!partes.length) {
      ct.innerHTML = '<div style="padding:40px;text-align:center;color:var(--tx3)">Nenhum resultado encontrado.</div>';
      return;
    }

    ct.innerHTML = partes.join('');
  }

  /* ── Seção: Ordenados ─────────────────────────────────────── */

  function _renderOrdenados() {
    let lista = _oficiais;
    if (_busca) lista = lista.filter(r => _matchBusca(_nomePessoa(r)));

    if (!lista.length) return '';

    const grupos = { pastor: [], presbitero: [], diacono: [] };
    for (const r of lista) {
      if (grupos[r.cargo]) grupos[r.cargo].push(r);
    }

    const _cardCargo = (cargo, label, cor) => {
      const ps = grupos[cargo];
      if (!ps.length) return '';
      const items = ps.map(r =>
        `<div class="rel-pessoa">${_nomePessoa(r)}</div>`
      ).join('');
      return `<div class="rel-cargo-blk" style="border-top:3px solid ${cor}">
        <div class="rel-cargo-label" style="color:${cor}">${label}</div>
        ${items}
      </div>`;
    };

    return `
      <div class="rel-secao" id="rel-sec-ordenados">
        <div class="rel-secao-hdr">
          <span class="rel-secao-ic" style="background:rgba(88,152,212,0.12);color:var(--sky)">✠</span>
          <span class="rel-secao-ttl">Ordenados</span>
          <span class="rel-secao-cnt">${lista.length} oficial${lista.length !== 1 ? 'is' : ''}</span>
        </div>
        <div class="rel-ordenados-grid">
          ${_cardCargo('pastor',     'Pastores',    'var(--sky)')}
          ${_cardCargo('presbitero', 'Presbíteros', 'var(--teal)')}
          ${_cardCargo('diacono',    'Diáconos',    'var(--violet)')}
        </div>
      </div>`;
  }

  /* ── Seção: Nomeados ──────────────────────────────────────── */

  function _renderNomeados() {
    let lista = _nomeados;
    if (_filtroOrg) lista = lista.filter(r => r.orgao === _filtroOrg);
    if (_busca)     lista = lista.filter(r => _matchBusca(_nomePessoa(r)) || _matchBusca(r.orgao) || _matchBusca(r.suborgao));
    if (!lista.length) return '';

    // Agrupa por orgao_tipo → orgao → suborgao
    const byTipo = {};
    for (const r of lista) {
      const tipo = r.orgao_tipo || 'ministerio';
      const org  = r.orgao || '—';
      const sub  = r.suborgao || '';
      if (!byTipo[tipo]) byTipo[tipo] = {};
      if (!byTipo[tipo][org]) byTipo[tipo][org] = {};
      if (!byTipo[tipo][org][sub]) byTipo[tipo][org][sub] = [];
      byTipo[tipo][org][sub].push(r);
    }

    const secoes = [];
    for (const tipo of TIPO_ORDER) {
      if (!byTipo[tipo]) continue;
      const ministerios = byTipo[tipo];
      const blocos = [];

      for (const orgNome of Object.keys(ministerios).sort()) {
        const subsMap = ministerios[orgNome];
        const subHtmls = [];

        for (const subNome of Object.keys(subsMap).sort()) {
          const rows = subsMap[subNome];
          const isRoot = subNome === '';

          // Separa líderes de equipe
          const lideres = rows.filter(r => ['supervisor','coordenador','conselheiro','presidente','vice_presidente','secretario','tesoureiro'].includes(r.nivel || r.funcao_lider || _inferirNivel(r)));
          const membros = rows.filter(r => !lideres.includes(r));

          const liderRows = lideres.map(r => {
            const nivel   = r.nivel || r.funcao_lider || _inferirNivel(r);
            const label   = CARGO_LABEL[nivel] || (r.cargo ? _capitalize(r.cargo) : 'Cargo');
            return `<div class="rel-lider-row">
              <span class="rel-lider-cargo">${label}</span>
              <span class="rel-lider-nome">${_nomePessoa(r)}</span>
            </div>`;
          }).join('');

          const membroItems = membros.map(r =>
            `<span class="rel-membro-chip">${_nomePessoa(r)}</span>`
          ).join('');

          if (isRoot) {
            subHtmls.push(`
              <div class="rel-lideranca-blk">
                ${liderRows}
                ${membroItems ? `<div class="rel-membros-wrap">${membroItems}</div>` : ''}
              </div>`);
          } else {
            subHtmls.push(`
              <div class="rel-sub-blk">
                <div class="rel-sub-nome">${subNome}</div>
                ${liderRows}
                ${membroItems ? `<div class="rel-membros-wrap">${membroItems}</div>` : ''}
              </div>`);
          }
        }

        blocos.push(`
          <div class="rel-min-card">
            <div class="rel-min-nome">${orgNome}</div>
            ${subHtmls.join('')}
          </div>`);
      }

      secoes.push(`
        <div class="rel-secao">
          <div class="rel-secao-hdr">
            <span class="rel-secao-ic" style="background:var(--skybg);color:var(--sky)">◎</span>
            <span class="rel-secao-ttl">${TIPO_LABEL[tipo] || tipo}</span>
            <span class="rel-secao-cnt">${Object.keys(ministerios).length}</span>
          </div>
          <div class="rel-min-grid">${blocos.join('')}</div>
        </div>`);
    }

    return secoes.join('');
  }

  /* ── Inferir nível a partir do cargo (legado) ─────────────── */

  function _inferirNivel(r) {
    if (r.nivel) return r.nivel;
    if (r.funcao_lider) return r.funcao_lider;
    if (r.tipo_nomeacao === 'membro') return 'membro';
    const c = (r.cargo || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    if (c.includes('supervis')) return 'supervisor';
    if (c.includes('coordena') || c === 'presidente' || c === 'diretor') return 'coordenador';
    if (c.includes('conselheiro')) return 'conselheiro';
    if (c.includes('lider') || c.includes('liderança')) return 'lider_area';
    if (c === 'secretario' || c === 'secretaria') return 'secretario';
    if (c === 'tesoureiro' || c === 'tesoureira') return 'tesoureiro';
    return 'membro';
  }

  /* ── Impressão ────────────────────────────────────────────── */

  function relLidImprimir() {
    const ct = _el('rel-lid-ct');
    if (!ct) return;

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8">
      <title>Relatório de Liderança ${_anoAtivo} — IPPenha</title>
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:system-ui,sans-serif; font-size:11px; color:#111; padding:20mm 15mm; }
        h1 { font-size:16px; font-weight:700; margin-bottom:2px; }
        .sub { font-size:11px; color:#666; margin-bottom:16px; }
        .secao { margin-bottom:20px; }
        .secao-ttl { font-size:13px; font-weight:700; border-bottom:2px solid #333; padding-bottom:4px; margin-bottom:10px; text-transform:uppercase; letter-spacing:.05em; }
        .min-blk { margin-bottom:12px; break-inside:avoid; }
        .min-nome { font-size:12px; font-weight:700; margin-bottom:4px; color:#1a3a5c; }
        .lider-row { display:flex; gap:8px; font-size:10.5px; margin-bottom:2px; }
        .lider-cargo { color:#555; min-width:110px; }
        .lider-nome { font-weight:600; }
        .sub-nome { font-size:10px; font-weight:600; color:#444; margin:6px 0 2px; text-transform:uppercase; letter-spacing:.05em; }
        .membros { font-size:10px; color:#333; margin-top:4px; }
        .grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:0 24px; }
        .cargo-blk { margin-bottom:12px; }
        .cargo-ttl { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; }
        @media print { body { padding:10mm 10mm; } }
      </style>
    </head><body>
      <h1>Relatório de Liderança ${_anoAtivo}</h1>
      <div class="sub">Igreja Presbiteriana da Penha — IPPenha</div>
      ${_gerarHtmlImpressao()}
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

  function _gerarHtmlImpressao() {
    const partes = [];

    // Ordenados
    const ofc = _oficiais.filter(r => !_busca || _matchBusca(_nomePessoa(r)));
    if (ofc.length && _filtroTipo !== 'nomeados') {
      const grupos = { pastor: [], presbitero: [], diacono: [] };
      ofc.forEach(r => { if (grupos[r.cargo]) grupos[r.cargo].push(r); });
      partes.push(`<div class="secao">
        <div class="secao-ttl">Ordenados</div>
        <div class="grid3">
          ${['pastor','presbitero','diacono'].map(c => {
            const ps = grupos[c];
            if (!ps.length) return '';
            const lab = c === 'pastor' ? 'Pastores' : c === 'presbitero' ? 'Presbíteros' : 'Diáconos';
            return `<div class="cargo-blk"><div class="cargo-ttl">${lab}</div>
              ${ps.map(r => `<div>${_nomePessoa(r)}</div>`).join('')}</div>`;
          }).join('')}
        </div>
      </div>`);
    }

    // Nomeados
    if (_filtroTipo !== 'ordenados') {
      let lista = _nomeados;
      if (_filtroOrg) lista = lista.filter(r => r.orgao === _filtroOrg);
      if (_busca)     lista = lista.filter(r => _matchBusca(_nomePessoa(r)) || _matchBusca(r.orgao));

      const byTipo = {};
      lista.forEach(r => {
        const t = r.orgao_tipo || 'ministerio';
        const o = r.orgao || '—';
        const s = r.suborgao || '';
        if (!byTipo[t]) byTipo[t] = {};
        if (!byTipo[t][o]) byTipo[t][o] = {};
        if (!byTipo[t][o][s]) byTipo[t][o][s] = [];
        byTipo[t][o][s].push(r);
      });

      for (const tipo of TIPO_ORDER) {
        if (!byTipo[tipo]) continue;
        const blocos = Object.keys(byTipo[tipo]).sort().map(orgNome => {
          const subsMap = byTipo[tipo][orgNome];
          const subHtmls = Object.keys(subsMap).sort().map(sub => {
            const rows   = subsMap[sub];
            const lideres = rows.filter(r => _inferirNivel(r) !== 'membro');
            const membros = rows.filter(r => _inferirNivel(r) === 'membro');
            const lRows = lideres.map(r => `<div class="lider-row">
              <span class="lider-cargo">${CARGO_LABEL[_inferirNivel(r)] || (r.cargo || '')}</span>
              <span class="lider-nome">${_nomePessoa(r)}</span>
            </div>`).join('');
            const mTxt = membros.length ? `<div class="membros">${membros.map(r => _nomePessoa(r)).join(' · ')}</div>` : '';
            return (sub ? `<div class="sub-nome">${sub}</div>` : '') + lRows + mTxt;
          }).join('');
          return `<div class="min-blk"><div class="min-nome">${orgNome}</div>${subHtmls}</div>`;
        }).join('');

        partes.push(`<div class="secao">
          <div class="secao-ttl">${TIPO_LABEL[tipo] || tipo}</div>
          ${blocos}
        </div>`);
      }
    }

    return partes.join('');
  }

  /* ── Handlers de filtro ───────────────────────────────────── */

  function relLidFiltrarAno(ano) {
    _anoAtivo = parseInt(ano);
    carregarRelatorioLideranca();
  }

  function relLidFiltrarTipo(tipo) {
    _filtroTipo = tipo;
    document.querySelectorAll('.rel-tipo-btn').forEach(b => b.classList.remove('on'));
    const btn = _el('rel-tipo-' + tipo);
    if (btn) btn.classList.add('on');
    _renderRelatorio();
  }

  function relLidFiltrarOrg(org) {
    _filtroOrg = org;
    _renderRelatorio();
  }

  function relLidBuscar(val) {
    _busca = val;
    _renderRelatorio();
  }

  /* ── Registro no router ───────────────────────────────────── */

  VIEW_AUTOLOAD['conselho-relatorio'] = { fn: carregarRelatorioLideranca };

  /* ── Exposição global ─────────────────────────────────────── */

  window.carregarRelatorioLideranca = carregarRelatorioLideranca;
  window.relLidImprimir             = relLidImprimir;
  window.relLidFiltrarAno           = relLidFiltrarAno;
  window.relLidFiltrarTipo          = relLidFiltrarTipo;
  window.relLidFiltrarOrg           = relLidFiltrarOrg;
  window.relLidBuscar               = relLidBuscar;

})();
