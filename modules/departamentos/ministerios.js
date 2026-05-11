/* ministerios.js — v2.1
 * Módulo Ministerial > Ministérios — CRUD completo + auditoria RLS
 * Requer tabelas criadas em ministerios-migration.sql
 * e colunas de auditoria de sipen-security-migration.sql
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
  function _podeEditarSetor() {
    if (_isGestor()) return true;
    if (_isLider()) {
      return _supervisorDoMinisterioAtual &&
             _supervisorDoMinisterioAtual === USUARIO_ATUAL?.pessoa_id;
    }
    return false;
  }

  /* ══ ESTADO ══════════════════════════════════════════════════ */
  let _ministerioAtual  = null;
  let _pessoasCache     = null;
  let _editandoId       = null;
  let _setorEditandoId  = null;
  let _supervisorDoMinisterioAtual = null; // pessoa_id do supervisor do ministério aberto

  /* ══ SUPABASE HEADERS ════════════════════════════════════════ */
  // Usa o JWT do usuário autenticado (via sipenToken()) para que as
  // políticas RLS "to authenticated" sejam respeitadas.
  function _hdr() {
    const token = (typeof sipenToken === 'function') ? sipenToken() : SUPABASE_ANON_KEY;
    return { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token };
  }
  function _hdrJson() {
    return Object.assign(_hdr(), {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    });
  }

  /* ══ CAMPOS DE AUDITORIA ══════════════════════════════════════ */
  function _auditInsert() {
    return {
      criado_por: USUARIO_ATUAL?.auth_user_id || null,
      igreja_id:  USUARIO_ATUAL?.igreja_id    || null,
    };
  }

  /* ══ CACHE DE PESSOAS (para selects) ═════════════════════════ */
  async function _carregarPessoas() {
    if (_pessoasCache) return _pessoasCache;
    try {
      // sipenFetchTodos contorna o db-max-rows=1000 do Supabase buscando todas as páginas
      if (typeof sipenFetchTodos === "function") {
        _pessoasCache = await sipenFetchTodos(
          "rest/v1/pessoas?select=id,nome&deleted_at=is.null&order=nome.asc",
          _hdr()
        );
      } else {
        // Fallback: paginação manual caso sipenFetchTodos não esteja disponível
        const PAGE = 1000;
        let all = [], from = 0;
        while(true){
          const r = await fetch(
            `${SUPABASE_URL}/rest/v1/pessoas?select=id,nome&deleted_at=is.null&order=nome.asc&limit=${PAGE}&offset=${from}`,
            { headers: _hdr() }
          );
          const data = r.ok ? await r.json() : [];
          if(!data.length) break;
          all = all.concat(data);
          if(data.length < PAGE) break;
          from += PAGE;
        }
        _pessoasCache = all;
      }
    } catch (_) {
      _pessoasCache = [];
    }
    return _pessoasCache;
  }

  function _optionsPessoa(selecionado) {
    return '<option value="">— Nenhum —</option>' +
      (_pessoasCache || []).map(p =>
        `<option value="${p.id}"${p.id === selecionado ? ' selected' : ''}>${p.nome.toUpperCase()}</option>`
      ).join('');
  }

  async function _restError(res) {
    try { return await res.json(); }
    catch (_) { return { message: await res.text().catch(() => res.statusText) }; }
  }

  function _renderTabelaMinisteriosAusente(el) {
    if (!el) return;
    el.innerHTML = `<div style="color:var(--tx3);padding:20px;text-align:center;grid-column:1/-1">
    Tabela "ministérios" não encontrada no banco de dados.<br>
    <small>Execute o SQL de criação da tabela para ativar este módulo.</small>
  </div>`;
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

      if (!rMin.ok) {
        const error = await _restError(rMin);
        if (error?.code === "42P01") {
          _renderTabelaMinisteriosAusente(grid);
          return;
        }
        throw new Error(error?.message || "Erro ao carregar ministérios.");
      }

      const lista = await rMin.json();
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
        ps.forEach(p => { nomeSup[p.id] = (p.nome || "").toUpperCase(); });
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
            <div style="font-weight:700;color:var(--tx1);font-size:14px">${escapeHtml(m.nome)}${inativoTag}</div>
            ${tipoLabel ? `<div style="font-size:11px;color:var(--tx3);margin-top:1px">${tipoLabel}</div>` : ''}
          </div>
        </div>
        ${nomeSupervisor ? `<div style="font-size:12px;color:var(--tx2);margin-bottom:8px">👤 ${escapeHtml(nomeSupervisor)}</div>` : ''}
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
          `${SUPABASE_URL}/rest/v1/ministerios?id=eq.${id}&select=id,nome,descricao,tipo,ativo,supervisor,conselheiro,coordenador`,
          { headers: _hdr() }
        ),
        _carregarPessoas(),
      ]);

      if (!rMin.ok) {
        const error = await _restError(rMin);
        if (error?.code === "42P01") {
          header.innerHTML = '<div style="color:var(--tx3);padding:20px;text-align:center">Tabela "ministérios" não encontrada no banco de dados.<br><small>Execute o SQL de criação da tabela para ativar este módulo.</small></div>';
          return;
        }
        throw new Error(error?.message || "Erro ao carregar ministério.");
      }

      const dados = await rMin.json();
      const m = dados[0];
      if (!m) {
        header.innerHTML = '<div style="color:var(--rose);font-size:13px">Ministério não encontrado.</div>';
        return;
      }
      _supervisorDoMinisterioAtual = m.supervisor || null;

      // Resolver nomes dos cargos de liderança em um único request
      const pessoaIds = [m.supervisor, m.conselheiro, m.coordenador].filter(Boolean);
      const nomes = {};
      if (pessoaIds.length) {
        const rp = await fetch(
          `${SUPABASE_URL}/rest/v1/pessoas?id=in.(${pessoaIds.join(',')})&select=id,nome`,
          { headers: _hdr() }
        );
        const ps = rp.ok ? await rp.json() : [];
        ps.forEach(p => { nomes[p.id] = (p.nome || "").toUpperCase(); });
      }

      const ICONES = { MUSICA:'🎵', JOVENS:'🔥', INFANTIL:'👶', INTERCESSAO:'🙏', EVANGELISMO:'✝️', DIACONIA:'🤝', COMUNICACAO:'📢', OUTRO:'⭐' };
      const ic = ICONES[m.tipo] || '⭐';
      const tipoLabel = m.tipo ? m.tipo.charAt(0) + m.tipo.slice(1).toLowerCase() : '';

      const _linha = (label, pessoaId) => pessoaId && nomes[pessoaId]
        ? `<div style="display:flex;gap:8px;align-items:baseline;margin-bottom:6px">
             <span style="font-size:11px;color:var(--tx3);min-width:110px">${label}</span>
             <span style="font-size:13px;font-weight:600;color:var(--tx1)">${escapeHtml(nomes[pessoaId])}</span>
           </div>`
        : '';

      const temLideranca = m.supervisor || m.conselheiro || m.coordenador;
      const btnEditar = _isGestor()
        ? `<button onclick="minMinEditar('${m.id}')" class="tbt" style="font-size:12px;padding:5px 12px">✏️ Editar</button>`
        : '';

      header.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
          <div style="width:48px;height:48px;border-radius:12px;background:var(--violetbg);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">${ic}</div>
          <div style="flex:1;min-width:180px">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px">
              <div style="font-size:18px;font-weight:800;color:var(--tx1)">${escapeHtml(m.nome)}
                ${m.ativo === false ? '<span style="font-size:11px;padding:2px 8px;background:#fee2e2;color:var(--rose);border-radius:20px;margin-left:4px">Inativo</span>' : ''}
              </div>
              ${btnEditar}
            </div>
            ${tipoLabel ? `<div style="font-size:12px;color:var(--tx3);margin-bottom:8px">${tipoLabel}</div>` : ''}
            ${m.descricao ? `<div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:10px">${escapeHtml(m.descricao)}</div>` : ''}
            ${temLideranca ? `
              <div style="border-top:1px solid var(--bd1);padding-top:10px;margin-top:4px">
                <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Liderança</div>
                ${_linha('Supervisor',  m.supervisor)}
                ${_linha('Conselheiro', m.conselheiro)}
                ${_linha('Coordenador', m.coordenador)}
              </div>` : ''}
          </div>
        </div>`;

      await _carregarMembros(id);
      await _carregarSetores(id);

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
            const nome   = (mb.pessoas?.nome  || '—').toUpperCase();
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

  async function _carregarSetores(ministerioId) {
    const el  = document.getElementById('min-min-setor-list');
    const cnt = document.getElementById('min-min-setor-count');
    const btn = document.getElementById('min-min-btn-add-setor');
    if (!el) return;

    if (btn) btn.style.display = _podeEditarSetor() ? '' : 'none';

    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ministerio_setores` +
        `?ministerio_id=eq.${ministerioId}` +
        `&select=id,nome,observacoes,ativo,lider_setorial` +
        `&order=nome.asc`,
        { headers: _hdr() }
      );
      const lista = r.ok ? await r.json() : [];
      const ativos = lista.filter(s => s.ativo !== false);
      if (cnt) cnt.textContent = `(${ativos.length})`;

      if (lista.length === 0) {
        el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:16px 0;text-align:center">Nenhum setor cadastrado neste ministério.</div>';
        return;
      }

      // Resolver nomes dos líderes em lote
      const liderIds = [...new Set(lista.filter(s => s.lider_setorial).map(s => s.lider_setorial))];
      const nomeLider = {};
      if (liderIds.length) {
        const rl = await fetch(
          `${SUPABASE_URL}/rest/v1/pessoas?id=in.(${liderIds.join(',')})&select=id,nome`,
          { headers: _hdr() }
        );
        const ps = rl.ok ? await rl.json() : [];
        ps.forEach(p => { nomeLider[p.id] = (p.nome || '').toUpperCase(); });
      }

      const podeAct = _podeEditarSetor();
      el.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="border-bottom:2px solid var(--bd1)">
            <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Setor</th>
            <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Líder Setorial</th>
            <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Status</th>
            ${podeAct ? '<th style="padding:6px 8px;color:var(--tx3);font-weight:600">Ações</th>' : ''}
          </tr></thead>
          <tbody>${lista.map(s => {
            const nome   = escapeHtml(s.nome);
            const lider  = s.lider_setorial ? escapeHtml(nomeLider[s.lider_setorial] || '—') : '—';
            const ativo  = s.ativo !== false;
            const stTag  = ativo
              ? '<span style="font-size:11px;padding:2px 7px;background:var(--greenbg,#d1fae5);color:var(--green,#059669);border-radius:20px">Ativo</span>'
              : '<span style="font-size:11px;padding:2px 7px;background:#fee2e2;color:var(--rose);border-radius:20px">Inativo</span>';
            const tdAcoes = podeAct
              ? `<td style="padding:7px 8px;white-space:nowrap">
                   <button onclick="minMinEditarSetor('${s.id}')"
                     class="tbt" style="font-size:11px;padding:3px 8px;margin-right:4px">Editar</button>
                   <button onclick="minMinToggleSetorStatus('${s.id}',${!ativo})"
                     class="tbt" style="font-size:11px;padding:3px 8px;margin-right:4px">
                     ${ativo ? 'Inativar' : 'Reativar'}
                   </button>
                   <button onclick="minMinRemoverSetor('${s.id}')"
                     class="tbt" style="font-size:11px;padding:3px 8px;color:var(--rose);border-color:var(--rose)">
                     Remover
                   </button>
                 </td>`
              : '';
            return `<tr style="border-bottom:1px solid var(--bd1)">
              <td style="padding:7px 8px;color:var(--tx1);font-weight:500">${nome}</td>
              <td style="padding:7px 8px;color:var(--tx2)">${lider}</td>
              <td style="padding:7px 8px">${stTag}</td>
              ${tdAcoes}
            </tr>`;
          }).join('')}</tbody>
        </table>`;
    } catch (e) {
      console.error('_carregarSetores:', e);
      el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0">Erro ao carregar setores.</div>';
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
      ${_sel('mm-supervisor',  'Supervisor',  '<option>Carregando...</option>', false)}
      ${_sel('mm-conselheiro', 'Conselheiro', '<option>Carregando...</option>', false)}
      ${_sel('mm-coordenador', 'Coordenador', '<option>Carregando...</option>', false)}
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

    const base = {
      nome,
      descricao:   (document.getElementById('mm-desc').value || '').trim() || null,
      tipo:        document.getElementById('mm-tipo').value        || null,
      supervisor:  document.getElementById('mm-supervisor').value  || null,
      conselheiro: document.getElementById('mm-conselheiro').value || null,
      coordenador: document.getElementById('mm-coordenador').value || null,
      ativo:       document.getElementById('mm-ativo').checked,
    };
    // Inclui campos de auditoria apenas no INSERT (não no PATCH)
    const payload = _editandoId ? base : Object.assign({}, base, _auditInsert());

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

  function _garantirModalSetor() {
    let el = document.getElementById('min-setor-modal');
    if (el) return el;

    const corpo = `
      ${_fld('mst-nome', 'Nome do Setor', 'text', true)}
      ${_sel('mst-lider', 'Líder Setorial', '<option value="">Carregando...</option>', false)}
      <div>
        <label style="${_LB}">Observações</label>
        <textarea id="mst-obs" rows="3"
          style="${_INP};resize:vertical;height:auto;font-family:inherit"></textarea>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="mst-ativo" checked style="width:16px;height:16px;cursor:pointer">
        <label for="mst-ativo" style="font-size:13px;color:var(--tx2);cursor:pointer">Setor ativo</label>
      </div>
      ${_errEl('mst-err')}`;

    const footer = `<button id="mst-btn" onclick="_mstSalvar()"
      style="padding:9px 24px;border-radius:8px;border:none;background:var(--violet);color:#fff;font-size:13px;font-weight:600;cursor:pointer">Salvar</button>`;

    return _modalWrap('min-setor-modal', 'Novo Setor', 'Ministerial · Setores', corpo, footer);
  }

  async function minMinNovoSetor() {
    if (!_podeEditarSetor()) return;
    _setorEditandoId = null;
    const modal = _garantirModalSetor();
    document.getElementById('min-setor-modal-title').textContent = 'Novo Setor';
    document.getElementById('mst-nome').value  = '';
    document.getElementById('mst-obs').value   = '';
    document.getElementById('mst-ativo').checked = true;
    _showErr('mst-err', '');
    await _carregarPessoas();
    document.getElementById('mst-lider').innerHTML = _optionsPessoa('');
    modal.style.display = 'flex';
  }

  async function minMinEditarSetor(id) {
    if (!_podeEditarSetor()) return;
    _setorEditandoId = id;
    const modal = _garantirModalSetor();
    document.getElementById('min-setor-modal-title').textContent = 'Editar Setor';
    _showErr('mst-err', '');

    const [r] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/ministerio_setores?id=eq.${id}&select=*`, { headers: _hdr() }),
      _carregarPessoas(),
    ]);
    const dados = r.ok ? await r.json() : [];
    const s = dados[0];
    if (!s) { alert('Setor não encontrado.'); return; }

    document.getElementById('mst-nome').value    = s.nome        || '';
    document.getElementById('mst-obs').value     = s.observacoes || '';
    document.getElementById('mst-ativo').checked = s.ativo !== false;
    document.getElementById('mst-lider').innerHTML = _optionsPessoa(s.lider_setorial || '');
    modal.style.display = 'flex';
  }

  async function _mstSalvar() {
    const nome = (document.getElementById('mst-nome').value || '').trim();
    if (!nome) { _showErr('mst-err', 'Nome do setor é obrigatório.'); return; }

    const btn = document.getElementById('mst-btn');
    btn.disabled = true; btn.textContent = 'Salvando...';

    const base = {
      nome,
      lider_setorial: document.getElementById('mst-lider').value || null,
      observacoes:    (document.getElementById('mst-obs').value || '').trim() || null,
      ativo:          document.getElementById('mst-ativo').checked,
    };

    try {
      let r;
      if (_setorEditandoId) {
        r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_setores?id=eq.${_setorEditandoId}`, {
          method: 'PATCH', headers: _hdrJson(), body: JSON.stringify(base),
        });
      } else {
        const payload = Object.assign({ ministerio_id: _ministerioAtual }, base, _auditInsert());
        r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_setores`, {
          method: 'POST', headers: _hdrJson(), body: JSON.stringify(payload),
        });
      }
      if (!r.ok) throw new Error((await r.text()) || r.status);

      document.getElementById('min-setor-modal').style.display = 'none';
      await _carregarSetores(_ministerioAtual);
    } catch (e) {
      _showErr('mst-err', `Erro ao salvar: ${e.message}`);
    } finally {
      btn.disabled = false; btn.textContent = 'Salvar';
    }
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

    const payload = Object.assign({
      ministerio_id: _ministerioAtual,
      pessoa_id:     pessoaId,
      funcao:  (document.getElementById('mmb-funcao').value  || 'Membro').trim(),
      status:  document.getElementById('mmb-status').value   || 'ativo',
    }, _auditInsert());

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

  async function minMinToggleSetorStatus(id, novoAtivo) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_setores?id=eq.${id}`, {
        method: 'PATCH', headers: _hdrJson(), body: JSON.stringify({ ativo: novoAtivo }),
      });
      if (!r.ok) throw new Error(r.status);
      await _carregarSetores(_ministerioAtual);
    } catch (e) {
      alert('Erro ao atualizar status: ' + e.message);
    }
  }

  async function minMinRemoverSetor(id) {
    if (!confirm('Remover este setor permanentemente?')) return;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_setores?id=eq.${id}`, {
        method: 'DELETE', headers: _hdr(),
      });
      if (!r.ok) throw new Error(r.status);
      await _carregarSetores(_ministerioAtual);
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
  window.minMinNovoSetor          = minMinNovoSetor;
  window.minMinEditarSetor        = minMinEditarSetor;
  window.minMinToggleSetorStatus  = minMinToggleSetorStatus;
  window.minMinRemoverSetor       = minMinRemoverSetor;
  // Chamados de dentro do HTML gerado dinamicamente
  window._mmSalvar                = _mmSalvar;
  window._mmbSalvar               = _mmbSalvar;
  window._mstSalvar               = _mstSalvar;

})();
