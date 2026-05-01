/* ministerios.js — v2.0
 * Módulo Ministerial > Ministérios — CRUD completo
 * Requer tabela ministerio_membros (ver ministerios-migration.sql)
 */
(function () {
  'use strict';

  /* ══ PERFIL / PERMISSÃO ══════════════════════════════════════ */
  function _isGestor() {
    const p = USUARIO_ATUAL?.perfil;
    return ['ADMINISTRADOR_GERAL','CONSELHO','PASTORAL','ADM_OPERACIONAL'].includes(p);
  }
  function _isLider() {
    const p = USUARIO_ATUAL?.perfil;
    return p === 'LIDER_MINISTERIO' || p === 'LIDER_AREA';
  }
  function _podeEditar() { return _isGestor() || _isLider(); }

  /* ══ ESTADO ══════════════════════════════════════════════════ */
  let _ministerioAtual  = null;
  let _pessoasCache     = null;
  let _editandoId       = null;

  /* ══ SUPABASE HEADERS ════════════════════════════════════════ */
  function _hdr() {
    return { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY };
  }
  function _hdrJson() {
    return Object.assign(_hdr(), {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    });
  }

  /* ══ CACHE DE PESSOAS (para selects) ═════════════════════════ */
  async function _carregarPessoas() {
    if (_pessoasCache) return _pessoasCache;
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/pessoas?select=id,nome&order=nome.asc`,
        { headers: _hdr() }
      );
      _pessoasCache = r.ok ? await r.json() : [];
    } catch (_) {
      _pessoasCache = [];
    }
    return _pessoasCache;
  }

  function _optionsPessoa(selecionado) {
    return '<option value="">— Nenhum —</option>' +
      (_pessoasCache || []).map(p =>
        `<option value="${p.id}"${p.id === selecionado ? ' selected' : ''}>${p.nome}</option>`
      ).join('');
  }

  /* ══ LISTA DE MINISTÉRIOS ════════════════════════════════════ */
  async function minMinLoad() {
    document.getElementById('min-min-painel-detalhe').style.display = 'none';
    document.getElementById('min-min-painel-lista').style.display   = '';
    _ministerioAtual = null;

    const heroAct = document.getElementById('min-min-hero-act');
    if (heroAct) heroAct.style.display = _isGestor() ? '' : 'none';

    const grid = document.getElementById('min-min-grid');
    grid.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center;grid-column:1/-1">Carregando...</div>';

    try {
      let url = `${SUPABASE_URL}/rest/v1/ministerios?select=id,nome,descricao,tipo,ativo,supervisor&order=nome.asc`;

      if (!_isGestor()) {
        const ids = USUARIO_ATUAL?.ministerios;
        if (!ids || ids.length === 0) {
          grid.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center;grid-column:1/-1">Nenhum ministério associado ao seu perfil.</div>';
          return;
        }
        url += `&id=in.(${ids.join(',')})`;
      }

      // Buscar lista, contagens e pessoas em paralelo
      const [rMin, rCnt] = await Promise.all([
        fetch(url, { headers: _hdr() }),
        fetch(`${SUPABASE_URL}/rest/v1/ministerio_membros?select=ministerio_id&status=eq.ativo`, { headers: _hdr() }),
        _carregarPessoas(),
      ]);

      const lista   = rMin.ok ? await rMin.json() : [];
      const cntRows = rCnt.ok ? await rCnt.json() : [];

      // Contagem de membros ativos por ministério
      const contagem = {};
      cntRows.forEach(m => { contagem[m.ministerio_id] = (contagem[m.ministerio_id] || 0) + 1; });

      // Resolver nomes dos supervisores em lote
      const supIds = [...new Set(lista.filter(m => m.supervisor).map(m => m.supervisor))];
      const nomeSup = {};
      if (supIds.length) {
        const rSup = await fetch(
          `${SUPABASE_URL}/rest/v1/pessoas?id=in.(${supIds.join(',')})&select=id,nome`,
          { headers: _hdr() }
        );
        const ps = rSup.ok ? await rSup.json() : [];
        ps.forEach(p => { nomeSup[p.id] = p.nome; });
      }

      if (lista.length === 0) {
        grid.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center;grid-column:1/-1">Nenhum ministério encontrado.</div>';
        return;
      }

      grid.innerHTML = lista.map(m =>
        _cardMinisterio(m, contagem[m.id] || 0, nomeSup[m.supervisor] || null)
      ).join('');

    } catch (e) {
      console.error('minMinLoad:', e);
      grid.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:32px 0;text-align:center;grid-column:1/-1">Erro ao carregar ministérios.</div>';
    }
  }

  function _cardMinisterio(m, qtdMembros, nomeSupervisor) {
    const ICONES = { MUSICA:'🎵', JOVENS:'🔥', INFANTIL:'👶', INTERCESSAO:'🙏', EVANGELISMO:'✝️', DIACONIA:'🤝', COMUNICACAO:'📢', OUTRO:'⭐' };
    const ic = ICONES[m.tipo] || '⭐';
    const inativoTag = m.ativo === false
      ? '<span style="font-size:10px;padding:2px 7px;background:#fee2e2;color:var(--rose);border-radius:20px;margin-left:6px">Inativo</span>'
      : '';
    const tipoLabel = m.tipo ? m.tipo.charAt(0) + m.tipo.slice(1).toLowerCase() : '';
    return `
      <div class="card" style="cursor:pointer;transition:box-shadow .15s"
           onclick="minMinAbrir('${m.id}')"
           onmouseenter="this.style.boxShadow='0 4px 18px rgba(0,0,0,.12)'"
           onmouseleave="this.style.boxShadow=''">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="width:38px;height:38px;border-radius:10px;background:var(--violetbg);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${ic}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;color:var(--tx1);font-size:14px">${m.nome}${inativoTag}</div>
            ${tipoLabel ? `<div style="font-size:11px;color:var(--tx3);margin-top:1px">${tipoLabel}</div>` : ''}
          </div>
        </div>
        ${nomeSupervisor ? `<div style="font-size:12px;color:var(--tx2);margin-bottom:8px">👤 ${nomeSupervisor}</div>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--bd1);padding-top:8px;margin-top:4px">
          <span style="font-size:12px;color:var(--tx3)">👥 ${qtdMembros} membro${qtdMembros !== 1 ? 's' : ''}</span>
          <span style="font-size:11.5px;color:var(--violet)">Abrir →</span>
        </div>
      </div>`;
  }

  /* ══ DETALHE DO MINISTÉRIO ═══════════════════════════════════ */
  async function minMinAbrir(id) {
    _ministerioAtual = id;
    document.getElementById('min-min-painel-lista').style.display   = 'none';
    document.getElementById('min-min-painel-detalhe').style.display = '';

    const header   = document.getElementById('min-min-detalhe-header');
    const memList  = document.getElementById('min-min-membro-list');
    const memCount = document.getElementById('min-min-membro-count');
    const btnAdd   = document.getElementById('min-min-btn-add-membro');

    header.innerHTML  = '<div style="color:var(--tx3);font-size:13px;padding:16px 0">Carregando...</div>';
    memList.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:16px 0">Carregando...</div>';
    memCount.textContent = '';
    if (btnAdd) btnAdd.style.display = _podeEditar() ? '' : 'none';

    try {
      const [rMin] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/ministerios?id=eq.${id}&select=id,nome,descricao,tipo,ativo,supervisor,conselheiro,coordenador,lider_area`,
          { headers: _hdr() }
        ),
        _carregarPessoas(),
      ]);

      const dados = rMin.ok ? await rMin.json() : [];
      const m = dados[0];
      if (!m) {
        header.innerHTML = '<div style="color:var(--rose);font-size:13px">Ministério não encontrado.</div>';
        return;
      }

      // Resolver nomes dos cargos de liderança em um único request
      const pessoaIds = [m.supervisor, m.conselheiro, m.coordenador, m.lider_area].filter(Boolean);
      const nomes = {};
      if (pessoaIds.length) {
        const rp = await fetch(
          `${SUPABASE_URL}/rest/v1/pessoas?id=in.(${pessoaIds.join(',')})&select=id,nome`,
          { headers: _hdr() }
        );
        const ps = rp.ok ? await rp.json() : [];
        ps.forEach(p => { nomes[p.id] = p.nome; });
      }

      const ICONES = { MUSICA:'🎵', JOVENS:'🔥', INFANTIL:'👶', INTERCESSAO:'🙏', EVANGELISMO:'✝️', DIACONIA:'🤝', COMUNICACAO:'📢', OUTRO:'⭐' };
      const ic = ICONES[m.tipo] || '⭐';
      const tipoLabel = m.tipo ? m.tipo.charAt(0) + m.tipo.slice(1).toLowerCase() : '';

      const _linha = (label, pessoaId) => pessoaId && nomes[pessoaId]
        ? `<div style="display:flex;gap:8px;align-items:baseline;margin-bottom:6px">
             <span style="font-size:11px;color:var(--tx3);min-width:110px">${label}</span>
             <span style="font-size:13px;font-weight:600;color:var(--tx1)">${nomes[pessoaId]}</span>
           </div>`
        : '';

      const temLideranca = m.supervisor || m.conselheiro || m.coordenador || m.lider_area;
      const btnEditar = _isGestor()
        ? `<button onclick="minMinEditar('${m.id}')" class="tbt" style="font-size:12px;padding:5px 12px">✏️ Editar</button>`
        : '';

      header.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
          <div style="width:48px;height:48px;border-radius:12px;background:var(--violetbg);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">${ic}</div>
          <div style="flex:1;min-width:180px">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px">
              <div style="font-size:18px;font-weight:800;color:var(--tx1)">${m.nome}
                ${m.ativo === false ? '<span style="font-size:11px;padding:2px 8px;background:#fee2e2;color:var(--rose);border-radius:20px;margin-left:4px">Inativo</span>' : ''}
              </div>
              ${btnEditar}
            </div>
            ${tipoLabel ? `<div style="font-size:12px;color:var(--tx3);margin-bottom:8px">${tipoLabel}</div>` : ''}
            ${m.descricao ? `<div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:10px">${m.descricao}</div>` : ''}
            ${temLideranca ? `
              <div style="border-top:1px solid var(--bd1);padding-top:10px;margin-top:4px">
                <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Liderança</div>
                ${_linha('Supervisor',   m.supervisor)}
                ${_linha('Conselheiro',  m.conselheiro)}
                ${_linha('Coordenador',  m.coordenador)}
                ${_linha('Líder de Área', m.lider_area)}
              </div>` : ''}
          </div>
        </div>`;

      await _carregarMembros(id);

    } catch (e) {
      console.error('minMinAbrir:', e);
      header.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:12px">Erro ao carregar dados do ministério.</div>';
    }
  }

  /* ══ MEMBROS DO MINISTÉRIO ═══════════════════════════════════ */
  async function _carregarMembros(ministerioId) {
    const el   = document.getElementById('min-min-membro-list');
    const cnt  = document.getElementById('min-min-membro-count');
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ministerio_membros?ministerio_id=eq.${ministerioId}` +
        `&select=id,funcao,status,pessoas(id,nome,telefone,email)&order=pessoas(nome).asc`,
        { headers: _hdr() }
      );
      const lista = r.ok ? await r.json() : [];
      const ativos = lista.filter(x => x.status !== 'inativo');
      cnt.textContent = `(${ativos.length})`;

      if (lista.length === 0) {
        el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:20px 0;text-align:center">Nenhum membro adicionado a este ministério.</div>';
        return;
      }

      const podeAct = _podeEditar();
      const thAcoes = podeAct ? '<th style="padding:6px 8px;color:var(--tx3);font-weight:600">Ações</th>' : '';

      el.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="border-bottom:2px solid var(--bd1)">
            <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Nome</th>
            <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Função</th>
            <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Status</th>
            ${thAcoes}
          </tr></thead>
          <tbody>${lista.map(mb => {
            const nome   = mb.pessoas?.nome  || '—';
            const funcao = mb.funcao          || 'Membro';
            const ativo  = mb.status !== 'inativo';
            const stTag  = ativo
              ? '<span style="font-size:11px;padding:2px 7px;background:var(--greenbg,#d1fae5);color:var(--green,#059669);border-radius:20px">Ativo</span>'
              : '<span style="font-size:11px;padding:2px 7px;background:#fee2e2;color:var(--rose);border-radius:20px">Inativo</span>';
            const tdAcoes = podeAct
              ? `<td style="padding:7px 8px;white-space:nowrap">
                   <button onclick="minMinToggleMembroStatus('${mb.id}','${ativo ? 'inativo' : 'ativo'}')"
                     class="tbt" style="font-size:11px;padding:3px 8px;margin-right:4px">
                     ${ativo ? 'Inativar' : 'Reativar'}
                   </button>
                   <button onclick="minMinRemoverMembro('${mb.id}')"
                     class="tbt" style="font-size:11px;padding:3px 8px;color:var(--rose);border-color:var(--rose)">
                     Remover
                   </button>
                 </td>`
              : '';
            return `<tr style="border-bottom:1px solid var(--bd1)">
              <td style="padding:7px 8px;color:var(--tx1);font-weight:500">${nome}</td>
              <td style="padding:7px 8px;color:var(--tx2)">${funcao}</td>
              <td style="padding:7px 8px">${stTag}</td>
              ${tdAcoes}
            </tr>`;
          }).join('')}</tbody>
        </table>`;
    } catch (e) {
      console.error('_carregarMembros:', e);
      el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0">Erro ao carregar membros.</div>';
    }
  }

  /* ══ VOLTAR LISTA ════════════════════════════════════════════ */
  function minMinVoltarLista() {
    _ministerioAtual = null;
    document.getElementById('min-min-painel-detalhe').style.display = 'none';
    document.getElementById('min-min-painel-lista').style.display   = '';
  }

  /* ══ UTILITÁRIOS DE ESTILO (modal) ═══════════════════════════ */
  const _LB  = 'display:block;font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px';
  const _INP = 'width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg-card));color:var(--tx1);font-size:13px;box-sizing:border-box';

  function _fld(id, label, type, req) {
    const star = req ? ' <span style="color:var(--rose)">*</span>' : '';
    return `<div>
      <label style="${_LB}">${label}${star}</label>
      <input type="${type}" id="${id}" style="${_INP}" placeholder="${label}">
    </div>`;
  }
  function _sel(id, label, opts, req) {
    const star = req ? ' <span style="color:var(--rose)">*</span>' : '';
    return `<div>
      <label style="${_LB}">${label}${star}</label>
      <select id="${id}" style="${_INP}">${opts}</select>
    </div>`;
  }
  function _errEl(id) {
    return `<div id="${id}" style="color:var(--rose);font-size:12px;display:none;margin-top:4px"></div>`;
  }
  function _showErr(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? '' : 'none';
  }
  function _modalWrap(id, titulo, breadcrumb, corpo, footerBtns) {
    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center;padding:16px';
    el.innerHTML = `
      <div style="background:var(--bg-card);border-radius:12px;width:100%;max-width:540px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.4)">
        <div style="padding:20px 24px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--bg-card);z-index:1">
          <div>
            <div style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">${breadcrumb}</div>
            <div id="${id}-title" style="font-size:17px;font-weight:700;color:var(--tx1)">${titulo}</div>
          </div>
          <button onclick="document.getElementById('${id}').style.display='none'"
            style="background:none;border:none;font-size:22px;color:var(--tx3);cursor:pointer;padding:4px 8px;border-radius:6px">×</button>
        </div>
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px">${corpo}</div>
        <div style="padding:16px 24px 20px;border-top:1px solid var(--bd1);display:flex;gap:10px;justify-content:flex-end;position:sticky;bottom:0;background:var(--bg-card)">
          <button onclick="document.getElementById('${id}').style.display='none'"
            style="padding:9px 20px;border-radius:8px;border:1px solid var(--bd2);background:none;color:var(--tx2);font-size:13px;cursor:pointer">Cancelar</button>
          ${footerBtns}
        </div>
      </div>`;
    document.body.appendChild(el);
    return el;
  }

  /* ══ MODAL: NOVO / EDITAR MINISTÉRIO ═════════════════════════ */
  function _garantirModalMin() {
    let el = document.getElementById('min-min-modal');
    if (el) return el;

    const tiposOpts = `
      <option value="">— Selecione —</option>
      <option value="MUSICA">🎵 Música</option>
      <option value="JOVENS">🔥 Jovens</option>
      <option value="INFANTIL">👶 Infantil</option>
      <option value="INTERCESSAO">🙏 Intercessão</option>
      <option value="EVANGELISMO">✝️ Evangelismo</option>
      <option value="DIACONIA">🤝 Diaconia</option>
      <option value="COMUNICACAO">📢 Comunicação</option>
      <option value="OUTRO">⭐ Outro</option>`;

    const corpo = `
      ${_fld('mm-nome', 'Nome do Ministério', 'text', true)}
      ${_fld('mm-desc', 'Descrição', 'text', false)}
      ${_sel('mm-tipo', 'Tipo', tiposOpts, false)}
      ${_sel('mm-supervisor',  'Supervisor',    '<option>Carregando...</option>', false)}
      ${_sel('mm-conselheiro', 'Conselheiro',   '<option>Carregando...</option>', false)}
      ${_sel('mm-coordenador', 'Coordenador',   '<option>Carregando...</option>', false)}
      ${_sel('mm-lider',       'Líder de Área', '<option>Carregando...</option>', false)}
      <div style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="mm-ativo" checked style="width:16px;height:16px;cursor:pointer">
        <label for="mm-ativo" style="font-size:13px;color:var(--tx2);cursor:pointer">Ministério ativo</label>
      </div>
      ${_errEl('mm-err')}`;

    const footer = `<button id="mm-btn" onclick="_mmSalvar()"
      style="padding:9px 24px;border-radius:8px;border:none;background:var(--violet);color:#fff;font-size:13px;font-weight:600;cursor:pointer">Salvar</button>`;

    return _modalWrap('min-min-modal', 'Novo Ministério', 'Ministerial · Ministérios', corpo, footer);
  }

  async function _preencherSelectsLideranca(m) {
    await _carregarPessoas();
    [
      ['mm-supervisor',  m?.supervisor],
      ['mm-conselheiro', m?.conselheiro],
      ['mm-coordenador', m?.coordenador],
      ['mm-lider',       m?.lider_area],
    ].forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = _optionsPessoa(val || '');
    });
  }

  async function minMinNovo() {
    if (!_isGestor()) return;
    _editandoId = null;
    const modal = _garantirModalMin();
    document.getElementById('min-min-modal-title').textContent = 'Novo Ministério';
    document.getElementById('mm-nome').value  = '';
    document.getElementById('mm-desc').value  = '';
    document.getElementById('mm-tipo').value  = '';
    document.getElementById('mm-ativo').checked = true;
    _showErr('mm-err', '');
    modal.style.display = 'flex';
    await _preencherSelectsLideranca(null);
  }

  async function minMinEditar(id) {
    if (!_isGestor()) return;
    _editandoId = id;
    const modal = _garantirModalMin();
    document.getElementById('min-min-modal-title').textContent = 'Editar Ministério';
    _showErr('mm-err', '');

    const [r] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/ministerios?id=eq.${id}&select=*`, { headers: _hdr() }),
      _carregarPessoas(),
    ]);
    const dados = r.ok ? await r.json() : [];
    const m = dados[0];
    if (!m) { alert('Ministério não encontrado.'); return; }

    document.getElementById('mm-nome').value    = m.nome        || '';
    document.getElementById('mm-desc').value    = m.descricao   || '';
    document.getElementById('mm-tipo').value    = m.tipo        || '';
    document.getElementById('mm-ativo').checked = m.ativo !== false;
    modal.style.display = 'flex';
    await _preencherSelectsLideranca(m);
  }

  async function _mmSalvar() {
    const nome = (document.getElementById('mm-nome').value || '').trim();
    if (!nome) { _showErr('mm-err', 'Nome do ministério é obrigatório.'); return; }

    const btn = document.getElementById('mm-btn');
    btn.disabled = true; btn.textContent = 'Salvando...';

    const payload = {
      nome,
      descricao:   (document.getElementById('mm-desc').value || '').trim() || null,
      tipo:        document.getElementById('mm-tipo').value        || null,
      supervisor:  document.getElementById('mm-supervisor').value  || null,
      conselheiro: document.getElementById('mm-conselheiro').value || null,
      coordenador: document.getElementById('mm-coordenador').value || null,
      lider_area:  document.getElementById('mm-lider').value       || null,
      ativo:       document.getElementById('mm-ativo').checked,
    };

    try {
      let r;
      if (_editandoId) {
        r = await fetch(`${SUPABASE_URL}/rest/v1/ministerios?id=eq.${_editandoId}`, {
          method: 'PATCH', headers: _hdrJson(), body: JSON.stringify(payload),
        });
      } else {
        r = await fetch(`${SUPABASE_URL}/rest/v1/ministerios`, {
          method: 'POST', headers: _hdrJson(), body: JSON.stringify(payload),
        });
      }
      if (!r.ok) throw new Error((await r.text()) || r.status);

      document.getElementById('min-min-modal').style.display = 'none';

      if (_editandoId && _ministerioAtual === _editandoId) {
        await minMinAbrir(_editandoId);
      } else {
        _pessoasCache = null; // Invalida cache se criou um novo
        await minMinLoad();
      }
    } catch (e) {
      _showErr('mm-err', `Erro ao salvar: ${e.message}`);
    } finally {
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  }

  /* ══ MODAL: ADICIONAR MEMBRO ═════════════════════════════════ */
  function _garantirModalMembro() {
    let el = document.getElementById('min-min-modal-mb');
    if (el) return el;

    const funcOpts = ['Membro','Líder','Apoio','Músico','Coordenador','Auxiliar','Intercessor','Comunicação'];
    const corpo = `
      ${_sel('mmb-pessoa', 'Pessoa', '<option value="">Carregando...</option>', true)}
      <div>
        <label style="${_LB}">Função</label>
        <input type="text" id="mmb-funcao" list="mmb-funcoes-dl"
          placeholder="Ex: Membro, Músico..." style="${_INP}">
        <datalist id="mmb-funcoes-dl">
          ${funcOpts.map(f => `<option value="${f}">`).join('')}
        </datalist>
      </div>
      ${_sel('mmb-status', 'Status',
        '<option value="ativo">Ativo</option><option value="inativo">Inativo</option>', false)}
      ${_errEl('mmb-err')}`;

    const footer = `<button id="mmb-btn" onclick="_mmbSalvar()"
      style="padding:9px 24px;border-radius:8px;border:none;background:var(--violet);color:#fff;font-size:13px;font-weight:600;cursor:pointer">Adicionar</button>`;

    return _modalWrap('min-min-modal-mb', 'Adicionar Membro', 'Ministerial · Membros', corpo, footer);
  }

  async function minMinAdicionarMembro() {
    if (!_podeEditar() || !_ministerioAtual) return;
    const modal = _garantirModalMembro();
    document.getElementById('min-min-modal-mb-title').textContent = 'Adicionar Membro';
    document.getElementById('mmb-funcao').value  = '';
    document.getElementById('mmb-status').value  = 'ativo';
    _showErr('mmb-err', '');

    await _carregarPessoas();
    document.getElementById('mmb-pessoa').innerHTML = _optionsPessoa('');
    modal.style.display = 'flex';
  }

  async function _mmbSalvar() {
    const pessoaId = document.getElementById('mmb-pessoa').value;
    if (!pessoaId) { _showErr('mmb-err', 'Selecione uma pessoa.'); return; }

    const btn = document.getElementById('mmb-btn');
    btn.disabled = true; btn.textContent = 'Salvando...';

    const payload = {
      ministerio_id: _ministerioAtual,
      pessoa_id:     pessoaId,
      funcao:  (document.getElementById('mmb-funcao').value  || 'Membro').trim(),
      status:  document.getElementById('mmb-status').value   || 'ativo',
    };

    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_membros`, {
        method: 'POST', headers: _hdrJson(), body: JSON.stringify(payload),
      });
      if (!r.ok) {
        if (r.status === 409) throw new Error('Esta pessoa já está neste ministério.');
        throw new Error((await r.text()) || r.status);
      }
      document.getElementById('min-min-modal-mb').style.display = 'none';
      await _carregarMembros(_ministerioAtual);
    } catch (e) {
      _showErr('mmb-err', e.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Adicionar';
    }
  }

  /* ══ AÇÕES SOBRE MEMBROS ═════════════════════════════════════ */
  async function minMinToggleMembroStatus(id, novoStatus) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_membros?id=eq.${id}`, {
        method: 'PATCH', headers: _hdrJson(), body: JSON.stringify({ status: novoStatus }),
      });
      if (!r.ok) throw new Error(r.status);
      await _carregarMembros(_ministerioAtual);
    } catch (e) {
      alert('Erro ao atualizar status: ' + e.message);
    }
  }

  async function minMinRemoverMembro(id) {
    if (!confirm('Remover este membro do ministério?')) return;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_membros?id=eq.${id}`, {
        method: 'DELETE', headers: _hdr(),
      });
      if (!r.ok) throw new Error(r.status);
      await _carregarMembros(_ministerioAtual);
    } catch (e) {
      alert('Erro ao remover: ' + e.message);
    }
  }

  /* ══ EXPORTS ═════════════════════════════════════════════════ */
  window.minMinLoad               = minMinLoad;
  window.minMinAbrir              = minMinAbrir;
  window.minMinVoltarLista        = minMinVoltarLista;
  window.minMinNovo               = minMinNovo;
  window.minMinEditar             = minMinEditar;
  window.minMinAdicionarMembro    = minMinAdicionarMembro;
  window.minMinToggleMembroStatus = minMinToggleMembroStatus;
  window.minMinRemoverMembro      = minMinRemoverMembro;
  // Chamados de dentro do HTML gerado dinamicamente
  window._mmSalvar                = _mmSalvar;
  window._mmbSalvar               = _mmbSalvar;

})();
