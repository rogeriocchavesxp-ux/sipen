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

  /* ── Dropdown de 3 pontos ────────────────────────────────────── */
  function _getDD() {
    let dd = document.getElementById('forn-row-dd');
    if (!dd) {
      dd = document.createElement('div');
      dd.id = 'forn-row-dd';
      dd.style.cssText = 'position:fixed;z-index:9999;background:var(--bg1);border:1px solid var(--bd2);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);min-width:130px;display:none;overflow:hidden';
      document.body.appendChild(dd);
      document.addEventListener('click', e => {
        if (!dd.contains(e.target) && !e.target.closest('.forn-dd-btn')) dd.style.display = 'none';
      });
    }
    return dd;
  }

  function fornMenuAbrir(nomeadoId, nome, btn) {
    const dd = _getDD();
    const r  = btn.getBoundingClientRect();
    dd.innerHTML = `
      <button onclick="fornAbrirEditar('${nomeadoId}');document.getElementById('forn-row-dd').style.display='none'"
        style="display:block;width:100%;text-align:left;padding:9px 14px;border:none;background:none;font-size:13px;color:var(--tx1);cursor:pointer"
        onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='none'">Editar</button>
      <button onclick="fornRemover('${nomeadoId}','${nome.replace(/'/g,"\\'")}');document.getElementById('forn-row-dd').style.display='none'"
        style="display:block;width:100%;text-align:left;padding:9px 14px;border:none;background:none;font-size:13px;color:var(--rose);cursor:pointer"
        onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='none'">Remover</button>`;
    const ddW = 140;
    let left = r.right - ddW;
    if (left < 8) left = 8;
    dd.style.top  = (r.bottom + 4) + 'px';
    dd.style.left = left + 'px';
    dd.style.display = 'block';
  }
  window.fornMenuAbrir = fornMenuAbrir;
  if (window.SIPEN?.register) SIPEN.register('fornecedores:abrirMenu', fornMenuAbrir);

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
          <table class="forn-tbl" style="table-layout:fixed;width:100%">
            <colgroup>
              <col style="width:32%">
              <col style="width:20%">
              <col style="width:22%">
              <col style="width:22%">
              ${adm ? '<col style="width:40px">' : ''}
            </colgroup>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contato</th>
                <th>PIX</th>
                <th>Banco / Ag / Conta</th>
                ${adm ? '<th></th>' : ''}
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
    const trunc = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    const contato = [
      f.celular  ? `<div style="${trunc}">${_esc(f.celular)}</div>`  : '',
      f.telefone ? `<div style="color:var(--tx3);${trunc}">${_esc(f.telefone)}</div>` : '',
      f.email    ? `<div style="color:var(--tx3);font-size:11.5px;${trunc}">${_esc(f.email)}</div>` : '',
    ].join('') || '<span style="color:var(--tx3)">—</span>';

    const banco = (f.banco || f.agencia || f.conta)
      ? `<div style="font-size:12px;${trunc}">${_esc(f.banco || '')}${f.agencia ? ` · Ag ${_esc(f.agencia)}` : ''}${f.conta ? ` · C/C ${_esc(f.conta)}` : ''}</div>`
      : '<span style="color:var(--tx3)">—</span>';

    const pix = f.pix
      ? `<div style="${trunc}"><span class="forn-pix-pill" style="max-width:100%;${trunc}">PIX &nbsp;${_esc(f.pix)}</span></div>`
      : '<span style="color:var(--tx3)">—</span>';

    const acoes = adm ? `
      <td style="text-align:center">
        <button class="forn-dd-btn" onclick="fornMenuAbrir('${f.id}','${_esc(f.nome)}',this)"
          style="background:none;border:none;color:var(--tx3);cursor:pointer;font-size:18px;padding:2px 6px;border-radius:6px;line-height:1"
          onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='none'">⋯</button>
      </td>` : '';

    return `
      <tr>
        <td style="max-width:0">
          <div style="font-weight:600;color:var(--tx1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_esc(f.nome)}">${_esc(f.nome)}</div>
          ${f.servico ? `<div style="font-size:11.5px;color:var(--amber);font-weight:500;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(f.servico)}</div>` : ''}
        </td>
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
