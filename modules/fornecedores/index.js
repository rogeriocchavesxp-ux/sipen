/* ═══════════════════════════════════════════════════════
   SIPEN — Fornecedores
   modules/fornecedores/index.js
═══════════════════════════════════════════════════════ */
(function () {

  function _hdr() {
    const key = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
    const tok = typeof sipenToken === 'function' ? sipenToken() : key;
    return { apikey: key, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };
  }

  async function _get(path) {
    const base = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '').replace(/\/$/, '');
    const r = await fetch(base + '/rest/v1/' + path, { headers: _hdr() });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async function _patch(path, body) {
    const base = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '').replace(/\/$/, '');
    const r = await fetch(base + '/rest/v1/' + path, {
      method: 'PATCH', headers: Object.assign(_hdr(), { Prefer: 'return=representation' }),
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async function _post(path, body) {
    const base = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '').replace(/\/$/, '');
    const r = await fetch(base + '/rest/v1/' + path, {
      method: 'POST', headers: Object.assign(_hdr(), { Prefer: 'return=representation' }),
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  const _MINORS = new Set(['de','da','do','das','dos','e','a','o','em','com','para','por','ou']);
  function _titleCase(s) {
    if (!s) return '';
    return String(s).toLowerCase().replace(/\b\w+/g, (w, i) =>
      (i === 0 || !_MINORS.has(w)) ? w.charAt(0).toUpperCase() + w.slice(1) : w
    );
  }

  function _isAdmin() {
    const p = String(typeof USUARIO_ATUAL !== 'undefined' ? (USUARIO_ATUAL?.perfil || '') : '').toUpperCase();
    return p.includes('ADMIN') || p.includes('ADM');
  }

  let _fornDeptId = null;
  let _todosForns = [];
  let _editandoId = null;

  async function _getDeptId() {
    if (_fornDeptId) return _fornDeptId;
    const rows = await _get('dept_administrativos?nome=eq.Fornecedores&select=id&limit=1');
    if (!rows.length) throw new Error('Departamento "Fornecedores" não encontrado.');
    _fornDeptId = rows[0].id;
    return _fornDeptId;
  }

  async function _carregar() {
    const deptId = await _getDeptId();
    return _get(
      `nomeados?dept_id=eq.${deptId}&status=eq.ativo` +
      `&select=id,nome,cargo,obs,pessoa_id,documento,pix,banco,agencia,conta,` +
      `pessoas!nomeados_pessoa_id_fkey(id,celular,telefone,email)` +
      `&order=nome.asc`
    );
  }

  function _normalizar(rows) {
    return rows.map(n => ({
      id:        n.id,
      pessoaId:  n.pessoa_id,
      nome:      _titleCase(n.nome || ''),
      servico:   _titleCase(n.cargo || ''),
      documento: n.documento || '',
      celular:   n.pessoas?.celular  || '',
      telefone:  n.pessoas?.telefone || '',
      email:     n.pessoas?.email    || '',
      pix:       n.pix      || '',
      banco:     n.banco    || '',
      agencia:   n.agencia  || '',
      conta:     n.conta    || '',
      obs:       n.obs      || '',
    }));
  }

  /* ── KPIs ────────────────────────────────────────────────────── */
  function _renderKpis(lista) {
    const el = document.getElementById('forn-kpis');
    if (!el) return;
    const comPix    = lista.filter(f => f.pix).length;
    const servicos  = [...new Set(lista.map(f => f.servico).filter(Boolean))].length;
    el.innerHTML = [
      { num: lista.length, label: 'Fornecedores',    cor: 'var(--amber)', bg: 'rgba(224,138,42,0.1)' },
      { num: comPix,       label: 'Com PIX',          cor: 'var(--gr)',    bg: 'rgba(58,170,92,0.1)'  },
      { num: servicos,     label: 'Tipos de serviço', cor: 'var(--blue)',  bg: 'rgba(74,156,245,0.1)' },
    ].map(k => `
      <div class="card" style="padding:14px 16px;text-align:center">
        <div style="font-size:26px;font-weight:800;color:${k.cor};margin-bottom:4px">${k.num}</div>
        <div style="font-size:12px;color:var(--tx3)">${k.label}</div>
      </div>`).join('');
  }

  /* ── Filtro por serviço ──────────────────────────────────────── */
  function _renderFiltroServico(lista) {
    const sel = document.getElementById('forn-filtro-servico');
    if (!sel) return;
    const servicos = [...new Set(lista.map(f => f.servico).filter(Boolean))].sort();
    const atual = sel.value;
    sel.innerHTML = '<option value="">Todos os serviços</option>' +
      servicos.map(s => `<option value="${_esc(s)}"${s === atual ? ' selected' : ''}>${_esc(s)}</option>`).join('');
  }

  /* ── Tabela ──────────────────────────────────────────────────── */
  function _renderLista(lista) {
    const el = document.getElementById('forn-lista');
    if (!el) return;

    if (!lista.length) {
      el.innerHTML = `
        <div class="card" style="text-align:center;padding:48px 24px">
          <div style="font-size:32px;margin-bottom:12px">📦</div>
          <div style="font-size:14px;font-weight:600;color:var(--tx2);margin-bottom:6px">Nenhum fornecedor cadastrado</div>
          <div style="font-size:12.5px;color:var(--tx3)">Adicione fornecedores usando o botão acima.</div>
        </div>`;
      return;
    }

    const adm = _isAdmin();
    el.innerHTML = `
      <div class="card" style="padding:0;overflow:hidden">
        <div style="overflow-x:auto">
          <table class="forn-tbl">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>Contato</th>
                <th>PIX</th>
                <th>Banco / Ag / Conta</th>
                ${adm ? '<th style="text-align:right">Ações</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${lista.map(f => _row(f, adm)).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function _row(f, adm) {
    const contato = [
      f.celular  ? `<div>${_esc(f.celular)}</div>`  : '',
      f.telefone ? `<div style="color:var(--tx3)">${_esc(f.telefone)}</div>` : '',
      f.email    ? `<div style="color:var(--tx3);font-size:11.5px">${_esc(f.email)}</div>` : '',
    ].join('') || '<span style="color:var(--tx3)">—</span>';

    const banco = (f.banco || f.agencia || f.conta)
      ? `<div style="font-size:12px">${_esc(f.banco || '')}${f.agencia ? ` · Ag ${_esc(f.agencia)}` : ''}${f.conta ? ` · C/C ${_esc(f.conta)}` : ''}</div>`
      : '<span style="color:var(--tx3)">—</span>';

    const pix = f.pix
      ? `<span class="forn-pix-pill">PIX &nbsp;${_esc(f.pix)}</span>`
      : '<span style="color:var(--tx3)">—</span>';

    const acoes = adm ? `
      <td style="text-align:right;white-space:nowrap">
        <button class="tbt" style="font-size:11px;padding:4px 10px" onclick="fornAbrirEditar('${f.id}')">Editar</button>
        <button class="tbt" style="font-size:11px;padding:4px 10px;color:var(--rose);border-color:rgba(208,85,85,0.3)" onclick="fornRemover('${f.id}','${_esc(f.nome)}')">Remover</button>
      </td>` : '';

    return `
      <tr>
        <td>
          <div style="font-weight:600;color:var(--tx1)">${_esc(f.nome)}</div>
          ${f.servico ? `<div style="font-size:11.5px;color:var(--amber);font-weight:500;margin-top:2px">${_esc(f.servico)}</div>` : ''}
          ${f.obs ? `<div style="font-size:11px;color:var(--tx3);margin-top:2px">${_esc(f.obs)}</div>` : ''}
        </td>
        <td style="font-size:12.5px;color:var(--tx2)">${f.documento ? _esc(f.documento) : '<span style="color:var(--tx3)">—</span>'}</td>
        <td style="font-size:12.5px">${contato}</td>
        <td>${pix}</td>
        <td style="font-size:12px;color:var(--tx2)">${banco}</td>
        ${acoes}
      </tr>`;
  }

  /* ── Filtrar ─────────────────────────────────────────────────── */
  function fornFiltrar() {
    const busca   = (document.getElementById('forn-busca')?.value || '').toLowerCase();
    const servico = document.getElementById('forn-filtro-servico')?.value || '';
    const filtrado = _todosForns.filter(f => {
      const matchTxt = !busca ||
        f.nome.toLowerCase().includes(busca) ||
        f.servico.toLowerCase().includes(busca) ||
        f.documento.toLowerCase().includes(busca) ||
        f.pix.toLowerCase().includes(busca);
      const matchSrv = !servico || f.servico === servico;
      return matchTxt && matchSrv;
    });
    _renderLista(filtrado);
  }
  window.fornFiltrar = fornFiltrar;

  /* ── Carga principal ─────────────────────────────────────────── */
  async function fornLoad() {
    const elLista = document.getElementById('forn-lista');
    const elKpis  = document.getElementById('forn-kpis');
    const elHero  = document.getElementById('forn-hero-act');

    if (elLista) elLista.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:40px 0;text-align:center">Carregando...</div>';
    if (elHero && _isAdmin()) {
      elHero.innerHTML = '<button class="tbt pri" onclick="fornAbrirNovo()">+ Novo Fornecedor</button>';
    }

    try {
      const rows = await _carregar();
      _todosForns = _normalizar(rows);
      _renderKpis(_todosForns);
      _renderFiltroServico(_todosForns);
      _renderLista(_todosForns);
    } catch (e) {
      if (elKpis) elKpis.innerHTML = '';
      if (elLista) elLista.innerHTML = `<div class="card" style="color:var(--rose);font-size:13px;padding:24px;text-align:center">${_esc(e.message)}</div>`;
    }
  }

  /* ── Modal: Novo ─────────────────────────────────────────────── */
  function fornAbrirNovo() {
    _editandoId = null;
    document.getElementById('forn-modal-titulo').textContent = 'Novo Fornecedor';
    _limparModal();
    document.getElementById('forn-modal').style.display = 'flex';
    document.getElementById('forn-inp-nome').focus();
  }
  window.fornAbrirNovo = fornAbrirNovo;

  /* ── Modal: Editar ───────────────────────────────────────────── */
  function fornAbrirEditar(nomeadoId) {
    const f = _todosForns.find(x => x.id === nomeadoId);
    if (!f) return;
    _editandoId = nomeadoId;
    document.getElementById('forn-modal-titulo').textContent = 'Editar Fornecedor';
    document.getElementById('forn-inp-nome').value      = f.nome;
    document.getElementById('forn-inp-servico').value   = f.servico;
    document.getElementById('forn-inp-documento').value = f.documento;
    document.getElementById('forn-inp-celular').value   = f.celular;
    document.getElementById('forn-inp-telefone').value  = f.telefone;
    document.getElementById('forn-inp-email').value     = f.email;
    document.getElementById('forn-inp-pix').value       = f.pix;
    document.getElementById('forn-inp-banco').value     = f.banco;
    document.getElementById('forn-inp-agencia').value   = f.agencia;
    document.getElementById('forn-inp-conta').value     = f.conta;
    document.getElementById('forn-inp-obs').value       = f.obs;
    document.getElementById('forn-modal-err').style.display = 'none';
    document.getElementById('forn-modal').style.display = 'flex';
  }
  window.fornAbrirEditar = fornAbrirEditar;

  function fornFecharModal() {
    document.getElementById('forn-modal').style.display = 'none';
    _editandoId = null;
  }
  window.fornFecharModal = fornFecharModal;

  function _limparModal() {
    ['forn-inp-nome','forn-inp-servico','forn-inp-documento','forn-inp-celular',
     'forn-inp-telefone','forn-inp-email','forn-inp-pix','forn-inp-banco',
     'forn-inp-agencia','forn-inp-conta','forn-inp-obs']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const err = document.getElementById('forn-modal-err');
    if (err) err.style.display = 'none';
  }

  /* ── Salvar ──────────────────────────────────────────────────── */
  async function fornSalvar() {
    const nome      = (document.getElementById('forn-inp-nome')?.value || '').trim();
    const servico   = (document.getElementById('forn-inp-servico')?.value || '').trim();
    const documento = (document.getElementById('forn-inp-documento')?.value || '').trim();
    const celular   = (document.getElementById('forn-inp-celular')?.value || '').trim();
    const telefone  = (document.getElementById('forn-inp-telefone')?.value || '').trim();
    const email     = (document.getElementById('forn-inp-email')?.value || '').trim();
    const pix       = (document.getElementById('forn-inp-pix')?.value || '').trim();
    const banco     = (document.getElementById('forn-inp-banco')?.value || '').trim();
    const agencia   = (document.getElementById('forn-inp-agencia')?.value || '').trim();
    const conta     = (document.getElementById('forn-inp-conta')?.value || '').trim();
    const obs       = (document.getElementById('forn-inp-obs')?.value || '').trim();

    const errEl = document.getElementById('forn-modal-err');
    if (!nome) { errEl.textContent = 'Nome é obrigatório.'; errEl.style.display = ''; return; }
    errEl.style.display = 'none';

    const btn = document.getElementById('forn-btn-salvar');
    btn.disabled = true; btn.textContent = 'Salvando...';

    try {
      const deptId = await _getDeptId();

      const nomeadoPayload = {
        nome,
        cargo:     servico   || null,
        obs:       obs       || null,
        documento: documento || null,
        pix:       pix       || null,
        banco:     banco     || null,
        agencia:   agencia   || null,
        conta:     conta     || null,
      };

      if (_editandoId) {
        const forn = _todosForns.find(x => x.id === _editandoId);
        await _patch(`nomeados?id=eq.${_editandoId}`, nomeadoPayload);
        if (forn?.pessoaId) {
          await _patch(`pessoas?id=eq.${forn.pessoaId}`, {
            celular:  celular  || null,
            telefone: telefone || null,
            email:    email    || null,
          });
        }
      } else {
        const [pessoa] = await _post('pessoas', { nome, celular: celular || null, telefone: telefone || null, email: email || null });
        await _post('nomeados', {
          ...nomeadoPayload,
          pessoa_id:  pessoa.id,
          dept_id:    deptId,
          orgao_tipo: 'comissao',
          orgao:      'Fornecedores',
          status:     'ativo',
        });
      }

      fornFecharModal();
      await fornLoad();
    } catch (e) {
      errEl.textContent = 'Erro: ' + e.message;
      errEl.style.display = '';
    } finally {
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  }
  window.fornSalvar = fornSalvar;

  /* ── Remover ─────────────────────────────────────────────────── */
  async function fornRemover(nomeadoId, nome) {
    if (!confirm(`Remover "${nome}" dos fornecedores?`)) return;
    try {
      await _patch(`nomeados?id=eq.${nomeadoId}`, { status: 'inativo' });
      await fornLoad();
    } catch (e) {
      alert('Erro ao remover: ' + e.message);
    }
  }
  window.fornRemover = fornRemover;

  /* ── Navegação ───────────────────────────────────────────────── */
  document.addEventListener('sipen:navigate', function (e) {
    const id = e.detail?.id || '';
    if (id === 'forn-dash' || id.startsWith('forn-')) fornLoad();
  });

}());
