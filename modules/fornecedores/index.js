/* ═══════════════════════════════════════════════════════
   SIPEN — Fornecedores
   modules/fornecedores/index.js
   Fornecedores = pessoas vinculadas ao departamento
   "Fornecedores" em dept_administrativos via nomeados.
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

  async function _delete(path) {
    const base = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '').replace(/\/$/, '');
    const r = await fetch(base + '/rest/v1/' + path, { method: 'DELETE', headers: _hdr() });
    if (!r.ok) throw new Error(await r.text());
  }

  function _esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function _isAdmin() {
    const p = String(typeof USUARIO_ATUAL !== 'undefined' ? (USUARIO_ATUAL?.perfil || '') : '').toUpperCase();
    return p.includes('ADMIN') || p.includes('ADM');
  }

  // Estado
  let _fornDeptId  = null;
  let _todosForns  = [];
  let _editandoId  = null; // nomeado.id em edição

  /* ── Localiza o dept "Fornecedores" ──────────────────────────── */
  async function _getDeptId() {
    if (_fornDeptId) return _fornDeptId;
    const rows = await _get('dept_administrativos?nome=eq.Fornecedores&select=id&limit=1');
    if (!rows.length) throw new Error('Departamento "Fornecedores" não encontrado. Crie-o em Departamentos.');
    _fornDeptId = rows[0].id;
    return _fornDeptId;
  }

  /* ── Carrega fornecedores (nomeados + pessoas) ──────────────── */
  async function _carregar() {
    const deptId = await _getDeptId();
    return _get(
      `nomeados?dept_id=eq.${deptId}&status=eq.ativo&select=id,nome,cargo,obs,pessoa_id,pessoas(id,celular,telefone,email)&order=nome.asc`
    );
  }

  /* ── Monta lista plana para exibição ────────────────────────── */
  function _normalizar(rows) {
    return rows.map(n => ({
      id:       n.id,
      pessoaId: n.pessoa_id,
      nome:     n.nome || '—',
      servico:  n.cargo || '',
      celular:  n.pessoas?.celular  || '',
      telefone: n.pessoas?.telefone || '',
      email:    n.pessoas?.email    || '',
      obs:      n.obs || '',
    }));
  }

  /* ── Renderiza KPIs ─────────────────────────────────────────── */
  function _renderKpis(lista) {
    const el = document.getElementById('forn-kpis');
    if (!el) return;
    const comWa  = lista.filter(f => f.celular).length;
    const servicos = [...new Set(lista.map(f => f.servico).filter(Boolean))].length;
    el.innerHTML = [
      { num: lista.length,  label: 'Fornecedores',    cor: 'var(--amber)', bg: 'rgba(224,138,42,0.1)' },
      { num: comWa,         label: 'Com WhatsApp',    cor: 'var(--gr)',    bg: 'rgba(58,170,92,0.1)'  },
      { num: servicos,      label: 'Tipos de serviço',cor: 'var(--blue)',  bg: 'rgba(74,156,245,0.1)' },
    ].map(k => `
      <div class="card" style="padding:14px 16px;text-align:center">
        <div style="font-size:26px;font-weight:800;color:${k.cor};margin-bottom:4px">${k.num}</div>
        <div style="font-size:12px;color:var(--tx3)">${k.label}</div>
      </div>`).join('');
  }

  /* ── Renderiza select de filtro por serviço ─────────────────── */
  function _renderFiltroServico(lista) {
    const sel = document.getElementById('forn-filtro-servico');
    if (!sel) return;
    const servicos = [...new Set(lista.map(f => f.servico).filter(Boolean))].sort();
    const atual = sel.value;
    sel.innerHTML = '<option value="">Todos os serviços</option>' +
      servicos.map(s => `<option value="${_esc(s)}"${s === atual ? ' selected' : ''}>${_esc(s)}</option>`).join('');
  }

  /* ── Renderiza cards dos fornecedores ───────────────────────── */
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

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
        ${lista.map(f => _card(f)).join('')}
      </div>`;
  }

  function _card(f) {
    const wa = (f.celular || '').replace(/\D/g, '');
    const waBtn = wa
      ? `<a href="https://wa.me/55${wa}" target="_blank" rel="noopener"
           style="display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:7px;background:rgba(37,211,102,0.12);border:1px solid rgba(37,211,102,0.3);color:#25d366;font-size:11.5px;font-weight:600;text-decoration:none;cursor:pointer">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
           WhatsApp
         </a>`
      : `<span style="font-size:11px;color:var(--tx3)">Sem WhatsApp</span>`;

    const admBtns = _isAdmin()
      ? `<div style="display:flex;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid var(--bd1)">
           <button class="tbt" style="font-size:11px;padding:4px 10px" onclick="fornAbrirEditar('${f.id}')">Editar</button>
           <button class="tbt" style="font-size:11px;padding:4px 10px;color:var(--rose);border-color:rgba(208,85,85,0.3)" onclick="fornRemover('${f.id}','${_esc(f.nome)}')">Remover</button>
         </div>`
      : '';

    return `
      <div class="card" style="padding:16px">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:rgba(224,138,42,0.1);border:1px solid rgba(224,138,42,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px">🏪</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13.5px;font-weight:700;color:var(--tx1);margin-bottom:2px">${_esc(f.nome)}</div>
            ${f.servico ? `<div style="font-size:11.5px;color:var(--amber);font-weight:600">${_esc(f.servico)}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:10px">
          ${f.celular  ? `<div style="font-size:12px;color:var(--tx2);display:flex;gap:6px"><span style="color:var(--tx3);min-width:60px">Celular</span>${_esc(f.celular)}</div>` : ''}
          ${f.telefone ? `<div style="font-size:12px;color:var(--tx2);display:flex;gap:6px"><span style="color:var(--tx3);min-width:60px">Fixo</span>${_esc(f.telefone)}</div>` : ''}
          ${f.email    ? `<div style="font-size:12px;color:var(--tx2);display:flex;gap:6px;overflow:hidden"><span style="color:var(--tx3);min-width:60px">E-mail</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(f.email)}</span></div>` : ''}
          ${f.obs      ? `<div style="font-size:11.5px;color:var(--tx3);margin-top:2px;line-height:1.5">${_esc(f.obs)}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px">${waBtn}</div>
        ${admBtns}
      </div>`;
  }

  /* ── Filtrar ─────────────────────────────────────────────────── */
  function fornFiltrar() {
    const busca   = (document.getElementById('forn-busca')?.value || '').toLowerCase();
    const servico = document.getElementById('forn-filtro-servico')?.value || '';
    const filtrado = _todosForns.filter(f => {
      const matchTxt = !busca || f.nome.toLowerCase().includes(busca) || f.servico.toLowerCase().includes(busca);
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
    document.getElementById('forn-inp-nome').value     = f.nome;
    document.getElementById('forn-inp-servico').value  = f.servico;
    document.getElementById('forn-inp-celular').value  = f.celular;
    document.getElementById('forn-inp-telefone').value = f.telefone;
    document.getElementById('forn-inp-email').value    = f.email;
    document.getElementById('forn-inp-obs').value      = f.obs;
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
    ['forn-inp-nome','forn-inp-servico','forn-inp-celular','forn-inp-telefone','forn-inp-email','forn-inp-obs']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const err = document.getElementById('forn-modal-err');
    if (err) err.style.display = 'none';
  }

  /* ── Salvar (criar ou atualizar) ─────────────────────────────── */
  async function fornSalvar() {
    const nome     = (document.getElementById('forn-inp-nome')?.value || '').trim();
    const servico  = (document.getElementById('forn-inp-servico')?.value || '').trim();
    const celular  = (document.getElementById('forn-inp-celular')?.value || '').trim();
    const telefone = (document.getElementById('forn-inp-telefone')?.value || '').trim();
    const email    = (document.getElementById('forn-inp-email')?.value || '').trim();
    const obs      = (document.getElementById('forn-inp-obs')?.value || '').trim();

    const errEl = document.getElementById('forn-modal-err');
    if (!nome) {
      errEl.textContent = 'Nome é obrigatório.';
      errEl.style.display = '';
      return;
    }
    errEl.style.display = 'none';

    const btn = document.getElementById('forn-btn-salvar');
    btn.disabled = true; btn.textContent = 'Salvando...';

    try {
      const deptId = await _getDeptId();

      if (_editandoId) {
        // Atualiza nomeado
        const forn = _todosForns.find(x => x.id === _editandoId);
        await _patch(`nomeados?id=eq.${_editandoId}`, { nome, cargo: servico || null, obs: obs || null });
        // Atualiza pessoa se vinculada
        if (forn?.pessoaId) {
          await _patch(`pessoas?id=eq.${forn.pessoaId}`, {
            celular:  celular  || null,
            telefone: telefone || null,
            email:    email    || null,
          });
        }
      } else {
        // Cria pessoa
        const pessoaPayload = { nome, celular: celular || null, telefone: telefone || null, email: email || null };
        const [pessoa] = await _post('pessoas', pessoaPayload);
        // Cria nomeado no dept Fornecedores
        await _post('nomeados', {
          nome,
          pessoa_id: pessoa.id,
          dept_id:   deptId,
          cargo:     servico || null,
          obs:       obs     || null,
          orgao_tipo:'comissao',
          orgao:     'Fornecedores',
          status:    'ativo',
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
