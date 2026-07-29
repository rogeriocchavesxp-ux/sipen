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
  function _isAdminGeral() {
    return USUARIO_ATUAL?.perfil === 'ADMINISTRADOR_GERAL';
  }
  function _isSupervisorDoMinisterio() {
    return !!(_supervisorDoMinisterioAtual &&
              _supervisorDoMinisterioAtual === USUARIO_ATUAL?.pessoa_id);
  }
  function _podeEditarMinisterio() {
    return _isAdminGeral() || _isSupervisorDoMinisterio();
  }

  /* ══ ESTADO ══════════════════════════════════════════════════ */
  let _ministerioAtual  = null;
  let _ministerioDataAtual = null;
  let _recursosAtual    = {};
  let _tabAtual         = 'visao-geral';
  let _pessoasCache     = null;
  let _editandoId       = null;
  let _setorEditandoId  = null;
  let _reuEditandoId    = null;
  let _progEditandoId   = null;
  let _escalEditandoId  = null;
  let _supervisorDoMinisterioAtual = null;

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

    const heroTtl = document.querySelector('#v-min-min .hero-ttl');
    if (heroTtl) heroTtl.textContent = 'Ministérios';

    const heroAct = document.getElementById('min-min-hero-act');
    if (heroAct) heroAct.style.display = _isAdminGeral() ? '' : 'none';

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

      if (window._sbMinisterioId) {
        const pid = window._sbMinisterioId;
        window._sbMinisterioId = null;
        setTimeout(() => minMinAbrir(pid), 80);
      }

    } catch (e) {
      console.error('minMinLoad:', e);
      grid.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:32px 0;text-align:center;grid-column:1/-1">Erro ao carregar ministérios.</div>';
    }
  }

  function _cardMinisterio(m, qtdMembros, nomeSupervisor) {
    const ICONES = { MUSICA:'🎵', JOVENS:'🔥', INFANTIL:'👶', INTERCESSAO:'🙏', EVANGELISMO:'✝️', DIACONIA:'🤝', COMUNICACAO:'📢', ACOLHIMENTO:'🤗', OUTRO:'⭐' };
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
    _ministerioDataAtual = null;
    document.getElementById('min-min-painel-lista').style.display   = 'none';
    document.getElementById('min-min-painel-detalhe').style.display = '';
    const _heroActDet = document.getElementById('min-min-hero-act');
    if (_heroActDet) _heroActDet.style.display = 'none';

    // Resetar para aba Visão Geral
    minMinTab('visao-geral');

    const header = document.getElementById('min-min-detalhe-header');
    const dash   = document.getElementById('min-min-dash-content');
    header.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:12px 0">Carregando...</div>';
    if (dash) dash.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Carregando...</div>';

    const admBtn = document.getElementById('min-min-tab-btn-adm');
    if (admBtn) admBtn.style.display = 'none';

    try {
      const [rMin] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/ministerios?id=eq.${id}&select=id,nome,descricao,tipo,ativo,supervisor,conselheiro,coordenador,recursos`,
          { headers: _hdr() }
        ),
        _carregarPessoas(),
      ]);

      if (!rMin.ok) {
        const error = await _restError(rMin);
        if (error?.code === '42P01') {
          header.innerHTML = '<div style="color:var(--tx3);padding:20px;text-align:center">Tabela "ministérios" não encontrada.<br><small>Execute o SQL de criação para ativar este módulo.</small></div>';
          return;
        }
        throw new Error(error?.message || 'Erro ao carregar ministério.');
      }

      const dados = await rMin.json();
      const m = dados[0];
      if (!m) {
        header.innerHTML = '<div style="color:var(--rose);font-size:13px">Ministério não encontrado.</div>';
        return;
      }

      _supervisorDoMinisterioAtual = m.supervisor || null;
      _recursosAtual  = m.recursos || {};
      _ministerioDataAtual = m;

      // Nomes da liderança
      const pessoaIds = [m.supervisor, m.conselheiro, m.coordenador].filter(Boolean);
      const nomes = {};
      if (pessoaIds.length) {
        const rp = await fetch(
          `${SUPABASE_URL}/rest/v1/pessoas?id=in.(${pessoaIds.join(',')})&select=id,nome`,
          { headers: _hdr() }
        );
        const ps = rp.ok ? await rp.json() : [];
        ps.forEach(p => { nomes[p.id] = (p.nome || '').toUpperCase(); });
      }

      _renderHeader(m, nomes);
      _renderDashboard(m, nomes);

      // Breadcrumb dinâmico
      const cr = document.getElementById('crumb');
      if (cr) cr.innerHTML = `<span class="c-mod">Departamentos</span><span class="c-sep">/</span><span class="c-pg">Ministérios</span><span class="c-sub">/ ${escapeHtml(m.nome)}</span>`;

      // Destacar ministério ativo no sidebar
      document.querySelectorAll('#sb-min-ministerios .si').forEach(el => {
        el.classList.toggle('on', el.dataset.mid === id);
      });

      if (admBtn) admBtn.style.display = _podeEditarMinisterio() ? '' : 'none';

      const reunBtn  = document.getElementById('min-min-tab-btn-reu');
      if (reunBtn)  reunBtn.style.display  = _recursosAtual.reunioes     ? '' : 'none';
      const progBtn  = document.getElementById('min-min-tab-btn-prog');
      if (progBtn)  progBtn.style.display  = _recursosAtual.programacoes ? '' : 'none';
      const escalBtn = document.getElementById('min-min-tab-btn-escal');
      if (escalBtn) escalBtn.style.display = _recursosAtual.escalas      ? '' : 'none';
      const docBtn   = document.getElementById('min-min-tab-btn-doc');
      if (docBtn)   docBtn.style.display   = _recursosAtual.documentos   ? '' : 'none';
      const waBtn    = document.getElementById('min-min-tab-btn-wa');
      if (waBtn)    waBtn.style.display    = _recursosAtual.whatsapp     ? '' : 'none';

      // Abas específicas de Comunicação
      const isCom = m.tipo === 'COMUNICACAO';
      const solBtn  = document.getElementById('min-min-tab-btn-sol');
      if (solBtn)  solBtn.style.display  = isCom ? '' : 'none';
      const campBtn = document.getElementById('min-min-tab-btn-camp');
      if (campBtn) campBtn.style.display = isCom ? '' : 'none';
      const prodBtn = document.getElementById('min-min-tab-btn-prod');
      if (prodBtn) prodBtn.style.display = isCom ? '' : 'none';

      const modBtn   = document.getElementById('min-min-tab-btn-mod');
      if (modBtn) {
        const MOD_LABELS = {
          repertorio:              'Repertório',
          turmas:                  'Turmas',
          projetos:                'Projetos',
          projetos_missionarios:   'Missões',
          producoes:               'Produções',
          integracao:              'Integração',
        };
        modBtn.style.display = _recursosAtual.modulo ? '' : 'none';
        modBtn.textContent   = MOD_LABELS[_recursosAtual.modulo] || 'Módulo';
      }

      const btnAdd = document.getElementById('min-min-btn-add-membro');
      if (btnAdd) btnAdd.style.display = _podeEditar() ? '' : 'none';


      await Promise.all([
        _carregarMembros(id),
        _carregarSetores(id),
      ]);

    } catch (e) {
      console.error('minMinAbrir:', e);
      header.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:12px">Erro ao carregar dados do ministério.</div>';
    }
  }

  /* ══ TROCA DE ABA ════════════════════════════════════════════ */
  function minMinTab(tab) {
    document.querySelectorAll('.min-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.min-tab-panel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById('min-min-tab-' + tab);
    if (panel) panel.style.display = '';
    _tabAtual = tab;
    if (tab === 'adm'          && _ministerioAtual) _renderAdm();
    if (tab === 'lideranca'    && _ministerioAtual) _renderLideranca();
    if (tab === 'reunioes'     && _ministerioAtual) _carregarReunioes(_ministerioAtual);
    if (tab === 'programacoes' && _ministerioAtual) _carregarProgramacoes(_ministerioAtual);
    if (tab === 'escalas'      && _ministerioAtual) _carregarEscalas(_ministerioAtual);
    if (tab === 'arquivos'     && _ministerioAtual) _carregarDocumentos(_ministerioAtual);
    if (tab === 'solicitacoes' && _ministerioAtual) _renderSolicitacoes();
    if (tab === 'campanhas'    && _ministerioAtual) _renderCampanhas();
    if (tab === 'producoes'    && _ministerioAtual) _renderProducoes();
    if (tab === 'whatsapp'     && _ministerioAtual) _renderWhatsapp();
    if (tab === 'modulo'       && _ministerioAtual) _renderModulo();
    if (tab === 'relatorios'   && _ministerioAtual) _renderRelatorios();
  }

  /* ══ HEADER DO MINISTÉRIO ═══════════════════════════════════ */
  function _renderHeader(m, nomes) {
    const header = document.getElementById('min-min-detalhe-header');
    if (!header) return;
    const ICONES = { MUSICA:'🎵', JOVENS:'🔥', INFANTIL:'👶', INTERCESSAO:'🙏', EVANGELISMO:'✝️', DIACONIA:'🤝', COMUNICACAO:'📢', ACOLHIMENTO:'🤗', OUTRO:'⭐' };
    const CORES  = { MUSICA:'139,107,193', JOVENS:'224,90,90', INFANTIL:'74,156,245', INTERCESSAO:'42,181,192', EVANGELISMO:'201,168,76', DIACONIA:'58,170,92', COMUNICACAO:'139,107,193', ACOLHIMENTO:'224,138,42', OUTRO:'139,107,193' };
    const ic  = ICONES[m.tipo] || '⭐';
    const rgb = CORES[m.tipo]  || '139,107,193';

    const _card = (role, label, pessoaId, cor) => {
      const nome = pessoaId && nomes[pessoaId] ? escapeHtml(nomes[pessoaId]) : null;
      return `<div style="display:flex;align-items:center;gap:9px;padding:10px 14px;background:var(--bg2);border-radius:8px;min-width:160px;flex:1">
        <div style="width:32px;height:32px;border-radius:50%;background:rgba(${cor},.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(${cor})" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div style="min-width:0">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:2px">${label}</div>
          <div style="font-size:12.5px;font-weight:600;color:${nome ? 'var(--tx1)' : 'var(--tx3)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nome || 'Não informado'}</div>
        </div>
      </div>`;
    };

    header.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div style="display:flex;align-items:flex-start;gap:14px;flex:1;min-width:280px">
          <div style="width:52px;height:52px;border-radius:12px;background:rgba(${rgb},.15);border:1px solid rgba(${rgb},.25);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">${ic}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
              <span style="font-size:18px;font-weight:800;color:var(--tx1)">${escapeHtml(m.nome)}</span>
              ${m.ativo === false
                ? '<span class="pill pa" style="font-size:10px">Inativo</span>'
                : '<span class="pill pg" style="font-size:10px">Ativo</span>'}
            </div>
            ${m.descricao ? `<div style="font-size:12.5px;color:var(--tx2);line-height:1.6;max-width:480px">${escapeHtml(m.descricao)}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:stretch">
          ${_card('supervisor',   'Supervisor',   m.supervisor,   '58,170,92')}
          ${_card('conselheiro',  'Conselheiro',  m.conselheiro,  '74,156,245')}
          ${_card('coordenador',  'Coordenador',  m.coordenador,  '201,168,76')}
        </div>
      </div>`;
  }

  /* ══ VISÃO GERAL ════════════════════════════════════════════ */
  let _vgSemanaOffset = 0;

  function _vgSemana(offset) {
    const hoje = new Date();
    const dow  = hoje.getDay();
    const seg  = new Date(hoje); seg.setDate(hoje.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
    const sab  = new Date(seg);  sab.setDate(seg.getDate() + 6);
    const fmt  = d => d.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
    return { inicio: seg, fim: sab, label: `${seg.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})} a ${fmt(sab)}` };
  }

  async function _renderDashboard(m, nomes) {
    const el = document.getElementById('min-min-dash-content');
    if (!el) return;
    _vgSemanaOffset = 0;
    await _carregarVisaoGeral();
  }

  async function _carregarVisaoGeral() {
    const el = document.getElementById('min-min-dash-content');
    if (!el || !_ministerioAtual) return;
    const sem    = _vgSemana(_vgSemanaOffset);
    const isoIni = sem.inicio.toISOString().slice(0,10);
    const isoFim = sem.fim.toISOString().slice(0,10);

    const _ic = (svg, bg) =>
      `<div style="width:40px;height:40px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;flex-shrink:0">${svg}</div>`;

    const _svgUsers  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    const _svgLayers = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;
    const _svgCal    = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`;
    const _svgClip   = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>`;
    const _svgCheck  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;

    const _kpi = (id, icon, iconBg, iconColor, numId, label, sub, tab, linkLabel) => `
      <div class="card" style="padding:18px 16px;cursor:pointer;display:flex;flex-direction:column;gap:0" onclick="minMinTab('${tab}')" id="${id}">
        <div style="margin-bottom:12px">${_ic(`<span style="color:${iconColor}">${icon}</span>`, iconBg)}</div>
        <div style="font-size:30px;font-weight:800;color:var(--tx1);line-height:1" id="${numId}">—</div>
        <div style="font-size:13px;font-weight:600;color:var(--tx1);margin-top:5px">${label}</div>
        <div style="font-size:11.5px;color:var(--tx3);margin-top:2px;flex:1">${sub}</div>
        <div style="border-top:1px solid var(--bd1);margin-top:14px;padding-top:10px">
          <span style="font-size:12px;color:var(--violet);font-weight:500">${linkLabel} →</span>
        </div>
      </div>`;

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:17px;font-weight:700;color:var(--tx1)">Visão Geral</div>
          <div style="font-size:12.5px;color:var(--tx3);margin-top:2px">Resumo das atividades e informações do ministério.</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <span style="font-size:12px;color:var(--tx2)" id="vg-semana-label">${sem.label}</span>
          <button class="tbt" style="padding:3px 8px;font-size:13px;line-height:1" onclick="_vgNavSemana(-1)">‹</button>
          <button class="tbt" style="padding:3px 8px;font-size:13px;line-height:1" onclick="_vgNavSemana(1)">›</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:24px">
        ${_kpi('vg-kpi-membros-card',  _svgUsers,  'rgba(139,107,193,.12)', 'var(--violet)', 'min-min-stat-membros', 'Membros',           'Ativos no ministério',  'membros',      'Ver membros')}
        ${_kpi('vg-kpi-setores-card',  _svgLayers, 'rgba(58,170,92,.12)',   'var(--gmd)',    'min-min-stat-setores', 'Setores',           'Organizados',           'setores',      'Ver setores')}
        ${_kpi('vg-kpi-escalas-card',  _svgCal,    'rgba(224,138,42,.12)', 'var(--amber)',  'vg-kpi-escalas',       'Escalas esta semana','Em andamento',         'escalas',      'Ver escalas')}
        ${_kpi('vg-kpi-progs-card',    _svgClip,   'rgba(42,181,192,.12)', 'var(--teal)',   'vg-kpi-progs',         'Programações',      'Próximos eventos',      'programacoes', 'Ver programações')}
        ${_kpi('vg-kpi-tarefas-card',  _svgCheck,  'rgba(139,107,193,.12)', 'var(--violet)','vg-kpi-tarefas',       'Tarefas pendentes', 'Esta semana',           'relatorios',   'Ver tarefas')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:24px">
        <div class="card" id="vg-escalas-sec">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <span style="font-size:13px;font-weight:700;color:var(--tx1)">Próximas Escalas</span>
            <span class="cact" style="font-size:11.5px" onclick="minMinTab('escalas')">Ver todas</span>
          </div>
          <div id="vg-escalas-body"><div style="color:var(--tx3);font-size:12px;text-align:center;padding:20px 0">Carregando...</div></div>
        </div>
        <div class="card" id="vg-reunioes-sec">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <span style="font-size:13px;font-weight:700;color:var(--tx1)">Próximas Reuniões</span>
            <span class="cact" style="font-size:11.5px" onclick="minMinTab('reunioes')">Ver todas</span>
          </div>
          <div id="vg-reunioes-body"><div style="color:var(--tx3);font-size:12px;text-align:center;padding:20px 0">Carregando...</div></div>
        </div>
        <div class="card" id="vg-avisos-sec">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <span style="font-size:13px;font-weight:700;color:var(--tx1)">Avisos e Comunicados</span>
            <span class="cact" style="font-size:11.5px">Ver todos</span>
          </div>
          <div id="vg-avisos-body"><div style="color:var(--tx3);font-size:12px;text-align:center;padding:20px 0">Carregando...</div></div>
        </div>
      </div>

      <div style="margin-bottom:8px;display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:13px;font-weight:700;color:var(--tx1)">Atividades Recentes</span>
        <span class="cact" style="font-size:11.5px">Ver todas</span>
      </div>
      <div id="vg-atividades-row" style="display:flex;gap:12px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none">
        <div style="color:var(--tx3);font-size:12px;padding:20px 0">Carregando...</div>
      </div>`;

    _vgCarregarKpis(isoIni, isoFim);
  }

  function _vgNavSemana(dir) {
    _vgSemanaOffset += dir;
    const sem = _vgSemana(_vgSemanaOffset);
    const lbl = document.getElementById('vg-semana-label');
    if (lbl) lbl.textContent = sem.label;
    _vgCarregarKpis(sem.inicio.toISOString().slice(0,10), sem.fim.toISOString().slice(0,10));
  }
  window._vgNavSemana = _vgNavSemana;

  function _fmtDH(d, h) {
    const dt = new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
    return h ? `${dt} • ${h.slice(0,5)}` : dt;
  }

  async function _vgCarregarKpis(ini, fim) {
    if (!_ministerioAtual) return;
    try {
      const hdrs = _hdr();
      const hoje = new Date().toISOString().slice(0,10);
      const [rEsc, rProg, rReu, rMem, rSetores, rDoc] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/ministerio_escalas?ministerio_id=eq.${_ministerioAtual}&data=gte.${ini}&data=lte.${fim}&select=id,titulo,data,hora,ministerio_escala_pessoas(funcao)&order=data.asc`, { headers: hdrs }),
        fetch(`${SUPABASE_URL}/rest/v1/ministerio_programacoes?ministerio_id=eq.${_ministerioAtual}&data=gte.${hoje}&select=id,titulo,data,hora&order=data.asc&limit=3`, { headers: hdrs }),
        fetch(`${SUPABASE_URL}/rest/v1/ministerio_reunioes?ministerio_id=eq.${_ministerioAtual}&data=gte.${hoje}&select=id,titulo,data,hora&order=data.asc&limit=3`, { headers: hdrs }),
        fetch(`${SUPABASE_URL}/rest/v1/ministerio_membros?ministerio_id=eq.${_ministerioAtual}&ativo=eq.true&select=id,criado_em,pessoas(nome)&order=criado_em.desc&limit=2`, { headers: hdrs }),
        fetch(`${SUPABASE_URL}/rest/v1/ministerio_setores?ministerio_id=eq.${_ministerioAtual}&select=id,criado_em,nome&order=criado_em.desc&limit=1`, { headers: hdrs }),
        fetch(`${SUPABASE_URL}/rest/v1/ministerio_documentos?ministerio_id=eq.${_ministerioAtual}&select=id,nome,criado_em&order=criado_em.desc&limit=2`, { headers: hdrs }),
      ]);

      const escalas  = rEsc.ok  ? await rEsc.json()  : [];
      const progs    = rProg.ok ? await rProg.json() : [];
      const reus     = rReu.ok  ? await rReu.json()  : [];
      const recMem   = rMem.ok  ? await rMem.json()  : [];
      const recDoc   = rDoc.ok  ? await rDoc.json()  : [];

      // KPI valores
      const _set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
      _set('vg-kpi-escalas', escalas.length);
      _set('vg-kpi-progs',   progs.length);
      _set('vg-kpi-tarefas', '0');

      // ── Próximas Escalas ──────────────────────────────────────
      const TAG_CORES = { transmissao:'74,156,245', projecao:'139,107,193', audio:'58,170,92', som:'58,170,92', louvor:'224,138,42', diaconia:'224,90,90' };
      const _tagCor = f => { const k = (f||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,''); return TAG_CORES[k] || '139,107,193'; };
      const _svgCalSm = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`;
      const _svgUserSm = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

      const elEscB = document.getElementById('vg-escalas-body');
      if (elEscB) {
        elEscB.innerHTML = escalas.length
          ? escalas.slice(0,3).map(e => {
              const funcoes = (e.ministerio_escala_pessoas || []).map(p => p.funcao).filter(Boolean);
              const tag = funcoes[0];
              const cor = tag ? _tagCor(tag) : null;
              return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd1)">
                <div style="width:36px;height:36px;border-radius:8px;background:var(--bg3,var(--bg2));display:flex;align-items:center;justify-content:center;flex-shrink:0">${_svgCalSm}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(e.titulo)}</div>
                  <div style="font-size:11.5px;color:var(--tx3);margin-top:1px">${_fmtDH(e.data, e.hora)}</div>
                </div>
                ${tag ? `<span style="padding:3px 9px;border-radius:20px;background:rgba(${cor},.1);color:rgb(${cor});font-size:11px;font-weight:600;white-space:nowrap">${escapeHtml(tag)}</span>` : ''}
                <span style="color:var(--tx3);cursor:pointer;font-size:18px;padding:0 2px;line-height:1;flex-shrink:0">⋮</span>
              </div>`;
            }).join('')
          : '<div style="color:var(--tx3);font-size:12px;text-align:center;padding:20px 0">Nenhuma escala nesta semana.</div>';
      }

      // ── Próximas Reuniões ──────────────────────────────────────
      const elReuB = document.getElementById('vg-reunioes-body');
      if (elReuB) {
        elReuB.innerHTML = reus.length
          ? reus.map(r => `
              <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd1)">
                <div style="width:36px;height:36px;border-radius:8px;background:var(--bg3,var(--bg2));display:flex;align-items:center;justify-content:center;flex-shrink:0">${_svgUserSm}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.titulo)}</div>
                  <div style="font-size:11.5px;color:var(--tx3);margin-top:1px">${_fmtDH(r.data, r.hora)}</div>
                </div>
                <span style="color:var(--tx3);cursor:pointer;font-size:18px;padding:0 2px;line-height:1;flex-shrink:0">⋮</span>
              </div>`).join('')
          : '<div style="color:var(--tx3);font-size:12px;text-align:center;padding:20px 0">Nenhuma reunião próxima.</div>';
      }

      // ── Avisos e Comunicados (estado vazio elegante) ───────────
      const elAviB = document.getElementById('vg-avisos-body');
      if (elAviB) {
        elAviB.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 0;gap:8px">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
          <div style="font-size:12px;color:var(--tx3);text-align:center">Nenhum aviso publicado.</div>
        </div>`;
      }

      // ── Atividades Recentes ────────────────────────────────────
      const _tempo = iso => {
        const diff = (Date.now() - new Date(iso)) / 1000;
        if (diff < 3600)   return `há ${Math.max(1, Math.round(diff/60))} min`;
        if (diff < 86400)  return `há ${Math.round(diff/3600)} hora${diff < 7200?'':'s'}`;
        return `há ${Math.round(diff/86400)} dia${diff < 172800?'':'s'}`;
      };

      const _svgMem  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      const _svgFile = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;

      const atividades = [
        ...recMem.map(m => ({ icon: _svgMem,  cor:'139,107,193', titulo: (m.pessoas?.nome || 'Membro'), sub:'Adicionado ao ministério', ts: m.criado_em })),
        ...recDoc.map(d => ({ icon: _svgFile, cor:'74,156,245',  titulo: escapeHtml(d.nome || 'Arquivo'), sub:'Arquivo enviado', ts: d.criado_em })),
      ].sort((a,b) => new Date(b.ts) - new Date(a.ts)).slice(0,5);

      const elAtiv = document.getElementById('vg-atividades-row');
      if (elAtiv) {
        elAtiv.innerHTML = atividades.length
          ? atividades.map(a => `
              <div style="min-width:190px;max-width:220px;padding:14px 16px;background:var(--bg2);border-radius:10px;border:1px solid var(--bd1);flex-shrink:0">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                  <div style="width:32px;height:32px;border-radius:50%;background:rgba(${a.cor},.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:rgb(${a.cor})">${a.icon}</div>
                  <div style="font-size:12.5px;font-weight:700;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${a.titulo}</div>
                </div>
                <div style="font-size:12px;color:var(--tx2)">${a.sub}</div>
                <div style="font-size:11px;color:var(--tx3);margin-top:6px">${_tempo(a.ts)}</div>
              </div>`).join('')
          : '<div style="color:var(--tx3);font-size:12px;padding:16px 0">Nenhuma atividade recente.</div>';
      }

    } catch (e) {
      console.error('_vgCarregarKpis:', e);
    }
  }

  /* ══ ABA LIDERANÇA ══════════════════════════════════════════ */
  async function _renderLideranca() {
    const el = document.getElementById('min-min-lid-content');
    if (!el) return;
    el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Carregando liderança...</div>';
    try {
      // Nomeados vinculados ao ministério
      const rn = await fetch(
        `${SUPABASE_URL}/rest/v1/nomeados?ministerio_id=eq.${_ministerioAtual}&status=eq.ativo&deleted_at=is.null&select=id,cargo,funcao_lider,tipo_nomeacao,nome,orgao,pessoa_id,pessoas(id,nome)&order=funcao_lider.asc,nome.asc`,
        { headers: _hdr() }
      );
      const nomeados = rn.ok ? await rn.json() : [];

      // Fallback: liderança da tabela ministerios (supervisor/conselheiro/coordenador)
      const m = _ministerioDataAtual || {};
      const pessoas = await _carregarPessoas();
      const _pMap = {};
      (pessoas || []).forEach(p => { _pMap[p.id] = p.nome; });

      const FUNC_LABEL = { supervisor:'Supervisor', coordenador:'Coordenador', lider_area:'Líder de Área' };
      const FUNC_COR   = { supervisor:'58,170,92', coordenador:'201,168,76', lider_area:'139,107,193' };

      const _nomeCard = (label, pessoaId, cor) => {
        const nomePessoa = pessoaId ? (_pMap[pessoaId] || 'Nome não encontrado') : null;
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg2);border-radius:8px;margin-bottom:6px">
          <div style="width:34px;height:34px;border-radius:50%;background:rgba(${cor},.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(${cor})" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3)">${label}</div>
            <div style="font-size:13px;font-weight:600;color:${nomePessoa ? 'var(--tx1)' : 'var(--tx3)'}">${nomePessoa ? escapeHtml(nomePessoa) : 'Não informado'}</div>
          </div>
        </div>`;
      };

      if (nomeados.length) {
        const grupos = {};
        nomeados.forEach(n => {
          const grupo = n.funcao_lider || n.cargo || 'Outros';
          if (!grupos[grupo]) grupos[grupo] = [];
          const nomePessoa = (n.pessoas && n.pessoas.nome) ? n.pessoas.nome : n.nome;
          grupos[grupo].push(nomePessoa);
        });

        el.innerHTML = `
          <div class="card">
            <div class="ctit">Liderança do Ministério</div>
            ${Object.entries(grupos).map(([func, nomes]) => `
              <div style="margin-bottom:14px">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:6px">${FUNC_LABEL[func] || func}</div>
                ${nomes.map(n => `
                  <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg2);border-radius:8px;margin-bottom:5px">
                    <div style="width:30px;height:30px;border-radius:50%;background:rgba(${FUNC_COR[func]||'139,107,193'},.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgb(${FUNC_COR[func]||'139,107,193'})" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <span style="font-size:13px;font-weight:600;color:var(--tx1)">${escapeHtml(n)}</span>
                  </div>`).join('')}
              </div>`).join('')}
          </div>`;
      } else {
        // Fallback para os campos diretos da tabela ministerios
        const temAlgum = m.supervisor || m.conselheiro || m.coordenador;
        el.innerHTML = `
          <div class="card">
            <div class="ctit">Liderança do Ministério</div>
            ${temAlgum ? `
              ${m.supervisor   ? _nomeCard('Supervisor',  m.supervisor,  '58,170,92')  : ''}
              ${m.conselheiro  ? _nomeCard('Conselheiro', m.conselheiro, '74,156,245') : ''}
              ${m.coordenador  ? _nomeCard('Coordenador', m.coordenador, '201,168,76') : ''}
            ` : `<div style="color:var(--tx3);font-size:13px;padding:20px 0;text-align:center">Nenhuma liderança nomeada.</div>`}
            ${_podeEditarMinisterio() ? `
              <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--bd1)">
                <button class="tbt sec" style="font-size:12px" onclick="minMinTab('adm')">Gerenciar liderança</button>
              </div>` : ''}
          </div>`;
      }
    } catch (e) {
      console.error('_renderLideranca:', e);
      el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0">Erro ao carregar liderança.</div>';
    }
  }

  /* ══ ABA ADMINISTRAÇÃO ═══════════════════════════════════════ */
  async function _renderAdm() {
    const el = document.getElementById('min-min-adm-content');
    if (!el) return;
    if (!_ministerioDataAtual) {
      el.innerHTML = '<div style="color:var(--tx3);text-align:center;padding:32px">Carregando...</div>';
      return;
    }
    await _carregarPessoas();
    const m   = _ministerioDataAtual;
    const rec = _recursosAtual || {};

    const MODULOS = [
      { key: 'escalas',      label: 'Escalas',      desc: 'Escala de serviço e atribuições' },
      { key: 'programacoes', label: 'Programações',  desc: 'Agenda de eventos e cultos' },
      { key: 'reunioes',     label: 'Reuniões',      desc: 'Atas e pautas de reuniões' },
      { key: 'documentos',   label: 'Documentos',    desc: 'Regulamentos e manuais' },
      { key: 'whatsapp',     label: 'WhatsApp',      desc: 'Listas de transmissão' },
    ];

    const _tog = (key, on) =>
      `<button id="adm-tog-${key}" onclick="_admToggleRecurso('${key}',${!on})"
         style="padding:5px 14px;border-radius:20px;border:1px solid ${on ? 'transparent' : 'var(--bd2)'};font-size:11.5px;font-weight:600;cursor:pointer;
           background:${on ? 'rgba(191,90,242,0.14)' : 'transparent'};color:${on ? 'var(--violet)' : 'var(--tx3)'};transition:all .15s">
         ${on ? 'Ativado' : 'Desativado'}
       </button>`;

    el.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div class="ctit">Informações</div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div>
            <label style="${_LB}">Nome <span style="color:var(--rose)">*</span></label>
            <input type="text" id="adm-nome" value="${escapeHtml(m.nome || '')}" style="${_INP}">
          </div>
          <div>
            <label style="${_LB}">Descrição</label>
            <textarea id="adm-desc" rows="3" style="${_INP};resize:vertical;height:auto;font-family:inherit">${escapeHtml(m.descricao || '')}</textarea>
          </div>
          <div>
            <label style="${_LB}">Tipo</label>
            <select id="adm-tipo" style="${_INP}">
              <option value="">— Selecione —</option>
              <option value="MUSICA"      ${m.tipo==='MUSICA'     ?'selected':''}>Música</option>
              <option value="JOVENS"      ${m.tipo==='JOVENS'     ?'selected':''}>Jovens</option>
              <option value="INFANTIL"    ${m.tipo==='INFANTIL'   ?'selected':''}>Infantil</option>
              <option value="INTERCESSAO" ${m.tipo==='INTERCESSAO'?'selected':''}>Intercessão</option>
              <option value="EVANGELISMO" ${m.tipo==='EVANGELISMO'?'selected':''}>Evangelismo</option>
              <option value="DIACONIA"    ${m.tipo==='DIACONIA'   ?'selected':''}>Diaconia</option>
              <option value="COMUNICACAO" ${m.tipo==='COMUNICACAO'?'selected':''}>Comunicação</option>
              <option value="ACOLHIMENTO" ${m.tipo==='ACOLHIMENTO'?'selected':''}>Acolhimento &amp; Integração</option>
              <option value="OUTRO"       ${m.tipo==='OUTRO'      ?'selected':''}>Outro</option>
            </select>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">
            <div>
              <label style="${_LB}">Supervisor</label>
              <select id="adm-supervisor" style="${_INP}">${_optionsPessoa(m.supervisor || '')}</select>
            </div>
            <div>
              <label style="${_LB}">Conselheiro</label>
              <select id="adm-conselheiro" style="${_INP}">${_optionsPessoa(m.conselheiro || '')}</select>
            </div>
            <div>
              <label style="${_LB}">Coordenador</label>
              <select id="adm-coordenador" style="${_INP}">${_optionsPessoa(m.coordenador || '')}</select>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="adm-ativo" ${m.ativo !== false ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer">
            <label for="adm-ativo" style="font-size:13px;color:var(--tx2);cursor:pointer">Ministério ativo</label>
          </div>
          <div id="adm-info-err" style="color:var(--rose);font-size:12px;display:none"></div>
          <div style="display:flex;justify-content:flex-end">
            <button id="adm-info-btn" onclick="_admSalvarInfo()"
              style="padding:9px 24px;border-radius:8px;border:none;background:var(--violet);color:#fff;font-size:13px;font-weight:600;cursor:pointer">
              Salvar
            </button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="ctit">Módulos Opcionais</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${MODULOS.map(mod => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg-hover);border-radius:8px">
              <div>
                <div style="font-size:13px;font-weight:500;color:var(--tx1)">${mod.label}</div>
                <div style="font-size:11px;color:var(--tx3);margin-top:2px">${mod.desc}</div>
              </div>
              ${_tog(mod.key, !!rec[mod.key])}
            </div>`).join('')}
        </div>
      </div>`;
  }

  async function _admSalvarInfo() {
    const nome = (document.getElementById('adm-nome')?.value || '').trim();
    if (!nome) { _showErr('adm-info-err', 'Nome é obrigatório.'); return; }
    const btn = document.getElementById('adm-info-btn');
    btn.disabled = true; btn.textContent = 'Salvando...';
    const payload = {
      nome,
      descricao:   (document.getElementById('adm-desc')?.value    || '').trim() || null,
      tipo:        document.getElementById('adm-tipo')?.value      || null,
      supervisor:  document.getElementById('adm-supervisor')?.value  || null,
      conselheiro: document.getElementById('adm-conselheiro')?.value || null,
      coordenador: document.getElementById('adm-coordenador')?.value || null,
      ativo:       document.getElementById('adm-ativo')?.checked    ?? true,
    };
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerios?id=eq.${_ministerioAtual}`, {
        method: 'PATCH', headers: _hdrJson(), body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      Object.assign(_ministerioDataAtual, payload);
      _supervisorDoMinisterioAtual = payload.supervisor;
      // Atualiza header e dashboard com novos nomes
      const pessoaIds = [payload.supervisor, payload.conselheiro, payload.coordenador].filter(Boolean);
      const nomes = {};
      if (pessoaIds.length) {
        const rp = await fetch(`${SUPABASE_URL}/rest/v1/pessoas?id=in.(${pessoaIds.join(',')})&select=id,nome`, { headers: _hdr() });
        const ps = rp.ok ? await rp.json() : [];
        ps.forEach(p => { nomes[p.id] = (p.nome || '').toUpperCase(); });
      }
      _renderHeader(_ministerioDataAtual, nomes);
      _renderDashboard(_ministerioDataAtual, nomes);
      // Atualiza counts no dashboard pós-save
      const sm = document.getElementById('min-min-stat-membros');
      const ss = document.getElementById('min-min-stat-setores');
      // Re-carrega membros/setores para atualizar counts
      await Promise.all([_carregarMembros(_ministerioAtual), _carregarSetores(_ministerioAtual)]);
      _showErr('adm-info-err', '');
      btn.textContent = 'Salvo ✓';
      setTimeout(() => { if (btn) btn.textContent = 'Salvar'; btn.disabled = false; }, 2000);
    } catch (e) {
      _showErr('adm-info-err', 'Erro ao salvar: ' + e.message);
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  }

  async function _admToggleRecurso(key, value) {
    _recursosAtual = Object.assign({}, _recursosAtual || {}, { [key]: value });
    if (_ministerioDataAtual) _ministerioDataAtual.recursos = _recursosAtual;
    const btn = document.getElementById(`adm-tog-${key}`);
    if (btn) {
      btn.textContent = value ? 'Ativado' : 'Desativado';
      btn.style.background  = value ? 'rgba(191,90,242,0.14)' : 'transparent';
      btn.style.color       = value ? 'var(--violet)' : 'var(--tx3)';
      btn.style.borderColor = value ? 'transparent' : 'var(--bd2)';
      btn.setAttribute('onclick', `_admToggleRecurso('${key}',${!value})`);
    }
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerios?id=eq.${_ministerioAtual}`, {
        method: 'PATCH', headers: _hdrJson(), body: JSON.stringify({ recursos: _recursosAtual }),
      });
      if (!r.ok) throw new Error(r.status);
    } catch (e) {
      alert('Erro ao salvar configuração: ' + e.message);
      _recursosAtual[key] = !value;
      if (_ministerioDataAtual) _ministerioDataAtual.recursos = _recursosAtual;
      _renderAdm();
    }
  }

  /* ══ REUNIÕES DO MINISTÉRIO ══════════════════════════════════ */
  async function _carregarReunioes(ministerioId) {
    const el  = document.getElementById('min-min-reu-list');
    const btn = document.getElementById('min-min-btn-add-reu');
    if (!el) return;
    if (btn) btn.style.display = _podeEditar() ? '' : 'none';
    el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:20px 0;text-align:center">Carregando...</div>';
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ministerio_reunioes?ministerio_id=eq.${ministerioId}&order=data.desc,criado_em.desc`,
        { headers: _hdr() }
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        if (err?.code === '42P01') {
          el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:20px 0;text-align:center">Execute a migration <strong>ministerios-fase4-reunioes.sql</strong> para ativar reuniões.</div>';
          return;
        }
        throw new Error(err?.message || r.status);
      }
      const lista = await r.json();
      if (!lista.length) {
        el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Nenhuma reunião registrada.</div>';
        return;
      }
      const podeAct = _podeEditar();
      el.innerHTML = lista.map(reu => _cardReuniao(reu, podeAct)).join('');
    } catch (e) {
      console.error('_carregarReunioes:', e);
      el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0">Erro ao carregar reuniões.</div>';
    }
  }

  function _cardReuniao(reu, podeAct) {
    const STATUS = {
      agendada:  { label: 'Agendada',  bg: 'rgba(255,214,10,0.12)', cor: 'var(--gold,#ffd60a)' },
      realizada: { label: 'Realizada', bg: 'rgba(48,209,88,0.12)',  cor: 'var(--gr)' },
      cancelada: { label: 'Cancelada', bg: 'rgba(255,69,58,0.10)',  cor: 'var(--rose)' },
    };
    const st = STATUS[reu.status] || STATUS.agendada;
    const dataFmt = reu.data
      ? new Date(reu.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
    const hora = reu.hora ? reu.hora.slice(0, 5) : '';

    const _bloco = (titulo, conteudo) => conteudo
      ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd1)">
           <div style="font-size:10.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">${titulo}</div>
           <div style="font-size:13px;color:var(--tx2);white-space:pre-wrap;line-height:1.6">${escapeHtml(conteudo)}</div>
         </div>`
      : '';

    const actBtns = podeAct ? `
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button onclick="minMinEditarReuniao('${reu.id}')" class="tbt" style="font-size:11px;padding:4px 10px">Editar</button>
        ${reu.status === 'agendada'
          ? `<button onclick="minMinToggleReuniaoStatus('${reu.id}','realizada')" class="tbt"
               style="font-size:11px;padding:4px 10px;color:var(--gr);border-color:rgba(48,209,88,0.4)">✓ Marcar Realizada</button>`
          : reu.status === 'realizada'
            ? `<button onclick="minMinToggleReuniaoStatus('${reu.id}','agendada')" class="tbt"
                 style="font-size:11px;padding:4px 10px">Reabrir</button>`
            : ''
        }
        <button onclick="minMinRemoverReuniao('${reu.id}')" class="tbt"
          style="font-size:11px;padding:4px 10px;color:var(--rose);border-color:rgba(255,69,58,0.3)">Remover</button>
      </div>` : '';

    return `
      <div class="card" style="margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="_reuToggle('${reu.id}')">
          <div style="flex:1;min-width:0">
            <div style="font-size:13.5px;font-weight:600;color:var(--tx1);margin-bottom:2px">${escapeHtml(reu.titulo)}</div>
            <div style="font-size:12px;color:var(--tx3)">${dataFmt}${hora ? ' · ' + hora : ''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            <span style="font-size:11px;padding:2px 9px;border-radius:20px;font-weight:600;background:${st.bg};color:${st.cor}">${st.label}</span>
            <span id="reu-arrow-${reu.id}" style="color:var(--tx3);font-size:11px;transition:transform .2s">▼</span>
          </div>
        </div>
        <div id="reu-body-${reu.id}" style="display:none" onclick="event.stopPropagation()">
          ${_bloco('Pauta', reu.pauta)}
          ${_bloco('Decisões', reu.decisoes)}
          ${_bloco('Observações', reu.observacoes)}
          ${actBtns}
        </div>
      </div>`;
  }

  function _reuToggle(id) {
    const body  = document.getElementById(`reu-body-${id}`);
    const arrow = document.getElementById(`reu-arrow-${id}`);
    if (!body) return;
    const open = body.style.display !== 'none';
    body.style.display  = open ? 'none' : '';
    if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
  }

  function _garantirModalReuniao() {
    let el = document.getElementById('min-reu-modal');
    if (el) return el;
    const corpo = `
      ${_fld('mru-titulo', 'Título', 'text', true)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${_fld('mru-data', 'Data', 'date', true)}
        ${_fld('mru-hora', 'Hora', 'time', false)}
      </div>
      ${_sel('mru-status', 'Status',
        '<option value="agendada">Agendada</option><option value="realizada">Realizada</option><option value="cancelada">Cancelada</option>',
        false)}
      <div>
        <label style="${_LB}">Pauta</label>
        <textarea id="mru-pauta" rows="4"
          style="${_INP};resize:vertical;height:auto;font-family:inherit;line-height:1.5"
          placeholder="Tópicos a serem discutidos..."></textarea>
      </div>
      <div>
        <label style="${_LB}">Decisões</label>
        <textarea id="mru-decisoes" rows="3"
          style="${_INP};resize:vertical;height:auto;font-family:inherit;line-height:1.5"
          placeholder="Registre as decisões tomadas..."></textarea>
      </div>
      <div>
        <label style="${_LB}">Observações</label>
        <textarea id="mru-obs" rows="2"
          style="${_INP};resize:vertical;height:auto;font-family:inherit;line-height:1.5"></textarea>
      </div>
      ${_errEl('mru-err')}`;
    const footer = `<button id="mru-btn" onclick="_reuSalvar()"
      style="padding:9px 24px;border-radius:8px;border:none;background:var(--violet);color:#fff;font-size:13px;font-weight:600;cursor:pointer">Salvar</button>`;
    return _modalWrap('min-reu-modal', 'Nova Reunião', 'Ministerial · Reuniões', corpo, footer);
  }

  async function minMinNovaReuniao() {
    if (!_podeEditar() || !_ministerioAtual) return;
    _reuEditandoId = null;
    const modal = _garantirModalReuniao();
    document.getElementById('min-reu-modal-title').textContent = 'Nova Reunião';
    document.getElementById('mru-titulo').value   = '';
    document.getElementById('mru-data').value     = new Date().toISOString().slice(0, 10);
    document.getElementById('mru-hora').value     = '';
    document.getElementById('mru-status').value   = 'agendada';
    document.getElementById('mru-pauta').value    = '';
    document.getElementById('mru-decisoes').value = '';
    document.getElementById('mru-obs').value      = '';
    _showErr('mru-err', '');
    modal.style.display = 'flex';
  }

  async function minMinEditarReuniao(id) {
    if (!_podeEditar()) return;
    _reuEditandoId = id;
    const modal = _garantirModalReuniao();
    document.getElementById('min-reu-modal-title').textContent = 'Editar Reunião';
    _showErr('mru-err', '');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_reunioes?id=eq.${id}`, { headers: _hdr() });
    const dados = r.ok ? await r.json() : [];
    const reu = dados[0];
    if (!reu) { alert('Reunião não encontrada.'); return; }
    document.getElementById('mru-titulo').value   = reu.titulo       || '';
    document.getElementById('mru-data').value     = reu.data         || '';
    document.getElementById('mru-hora').value     = (reu.hora || '').slice(0, 5);
    document.getElementById('mru-status').value   = reu.status       || 'agendada';
    document.getElementById('mru-pauta').value    = reu.pauta        || '';
    document.getElementById('mru-decisoes').value = reu.decisoes     || '';
    document.getElementById('mru-obs').value      = reu.observacoes  || '';
    modal.style.display = 'flex';
  }

  async function _reuSalvar() {
    const titulo = (document.getElementById('mru-titulo').value || '').trim();
    const data   = document.getElementById('mru-data').value || '';
    if (!titulo) { _showErr('mru-err', 'Título é obrigatório.'); return; }
    if (!data)   { _showErr('mru-err', 'Data é obrigatória.');   return; }
    const btn = document.getElementById('mru-btn');
    btn.disabled = true; btn.textContent = 'Salvando...';
    const payload = {
      titulo,
      data,
      hora:        document.getElementById('mru-hora').value     || null,
      status:      document.getElementById('mru-status').value   || 'agendada',
      pauta:       (document.getElementById('mru-pauta').value    || '').trim() || null,
      decisoes:    (document.getElementById('mru-decisoes').value || '').trim() || null,
      observacoes: (document.getElementById('mru-obs').value      || '').trim() || null,
    };
    try {
      let r;
      if (_reuEditandoId) {
        r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_reunioes?id=eq.${_reuEditandoId}`, {
          method: 'PATCH', headers: _hdrJson(), body: JSON.stringify(payload),
        });
      } else {
        r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_reunioes`, {
          method: 'POST', headers: _hdrJson(),
          body: JSON.stringify(Object.assign({ ministerio_id: _ministerioAtual, criado_por: USUARIO_ATUAL?.auth_user_id || null }, payload)),
        });
      }
      if (!r.ok) throw new Error(await r.text());
      document.getElementById('min-reu-modal').style.display = 'none';
      await _carregarReunioes(_ministerioAtual);
    } catch (e) {
      _showErr('mru-err', 'Erro ao salvar: ' + e.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  }

  async function minMinToggleReuniaoStatus(id, novoStatus) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_reunioes?id=eq.${id}`, {
        method: 'PATCH', headers: _hdrJson(), body: JSON.stringify({ status: novoStatus }),
      });
      if (!r.ok) throw new Error(r.status);
      await _carregarReunioes(_ministerioAtual);
    } catch (e) { alert('Erro ao atualizar status: ' + e.message); }
  }

  async function minMinRemoverReuniao(id) {
    if (!confirm('Remover esta reunião permanentemente?')) return;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_reunioes?id=eq.${id}`, {
        method: 'DELETE', headers: _hdr(),
      });
      if (!r.ok) throw new Error(r.status);
      await _carregarReunioes(_ministerioAtual);
    } catch (e) { alert('Erro ao remover: ' + e.message); }
  }

  /* ══ PROGRAMAÇÕES DO MINISTÉRIO ══════════════════════════════ */
  async function _carregarProgramacoes(ministerioId) {
    const el  = document.getElementById('min-min-prog-list');
    const btn = document.getElementById('min-min-btn-add-prog');
    if (!el) return;
    if (btn) btn.style.display = _podeEditar() ? '' : 'none';
    el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:20px 0;text-align:center">Carregando...</div>';
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ministerio_programacoes?ministerio_id=eq.${ministerioId}&order=data.desc,criado_em.desc`,
        { headers: _hdr() }
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        if (err?.code === '42P01') {
          el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:20px;text-align:center">Execute a migration <strong>ministerios-fase3-programacoes-escalas.sql</strong> para ativar este módulo.</div>';
          return;
        }
        throw new Error(err?.message || r.status);
      }
      const lista = await r.json();
      if (!lista.length) {
        el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Nenhuma programação registrada.</div>';
        return;
      }
      const podeAct = _podeEditar();
      el.innerHTML = lista.map(p => _cardProgramacao(p, podeAct)).join('');
    } catch (e) {
      console.error('_carregarProgramacoes:', e);
      el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0">Erro ao carregar programações.</div>';
    }
  }

  function _cardProgramacao(p, podeAct) {
    const STATUS = {
      agendado:  { label: 'Agendado',  bg: 'rgba(255,214,10,0.12)', cor: 'var(--gold,#ffd60a)' },
      realizado: { label: 'Realizado', bg: 'rgba(48,209,88,0.12)',  cor: 'var(--gr)' },
      cancelado: { label: 'Cancelado', bg: 'rgba(255,69,58,0.10)',  cor: 'var(--rose)' },
    };
    const TIPOS = { culto:'Culto', ensaio:'Ensaio', evento:'Evento', atividade:'Atividade', outro:'Outro' };
    const st = STATUS[p.status] || STATUS.agendado;
    const dataFmt = p.data
      ? new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })
      : '—';
    const hora  = p.hora  ? p.hora.slice(0, 5) : '';
    const tipo  = TIPOS[p.tipo] || p.tipo || '';
    const _bloco = (titulo, conteudo) => conteudo
      ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd1)">
           <div style="font-size:10.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">${titulo}</div>
           <div style="font-size:13px;color:var(--tx2);line-height:1.6">${escapeHtml(conteudo)}</div>
         </div>` : '';
    const agendaStatusLabel = {
      pendente:             'Aguardando aprovação',
      aguardando_aprovacao: 'Aguardando aprovação',
      em_analise:           'Em análise',
      ajuste_solicitado:    'Ajuste solicitado',
      confirmado:           'Aprovado na agenda',
      recusado:             'Recusado',
      cancelado:            'Cancelado',
    };
    const agendaBadge = p.agenda_id
      ? `<span style="font-size:10px;padding:2px 9px;border-radius:20px;font-weight:600;background:rgba(42,181,192,.12);color:var(--teal);margin-left:4px" title="Solicitação na Agenda da Igreja">
           📅 ${agendaStatusLabel[p.agenda_status] || 'Na agenda'}
         </span>` : '';

    const btnPublicar = (podeAct && !p.agenda_id)
      ? `<button onclick="minMinPublicarNaAgenda('${p.id}')" class="tbt" style="font-size:11px;padding:4px 10px;color:var(--teal);border-color:rgba(42,181,192,0.35)">📅 Publicar na Agenda</button>`
      : '';

    const actBtns = podeAct ? `
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button onclick="minMinEditarProgramacao('${p.id}')" class="tbt" style="font-size:11px;padding:4px 10px">Editar</button>
        ${p.status === 'agendado'
          ? `<button onclick="minMinToggleProgStatus('${p.id}','realizado')" class="tbt" style="font-size:11px;padding:4px 10px;color:var(--gr);border-color:rgba(48,209,88,0.4)">✓ Marcar Realizado</button>`
          : p.status === 'realizado'
            ? `<button onclick="minMinToggleProgStatus('${p.id}','agendado')" class="tbt" style="font-size:11px;padding:4px 10px">Reabrir</button>`
            : ''
        }
        ${btnPublicar}
        <button onclick="minMinRemoverProgramacao('${p.id}')" class="tbt" style="font-size:11px;padding:4px 10px;color:var(--rose);border-color:rgba(255,69,58,0.3)">Remover</button>
      </div>` : '';
    return `
      <div class="card" style="margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="_progToggle('${p.id}')">
          <div style="flex:1;min-width:0">
            <div style="font-size:13.5px;font-weight:600;color:var(--tx1);margin-bottom:2px">${escapeHtml(p.titulo)}</div>
            <div style="font-size:12px;color:var(--tx3)">${dataFmt}${hora ? ' · ' + hora : ''}${p.local ? ' · ' + escapeHtml(p.local) : ''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            ${tipo ? `<span style="font-size:10.5px;color:var(--tx3)">${tipo}</span>` : ''}
            <span style="font-size:11px;padding:2px 9px;border-radius:20px;font-weight:600;background:${st.bg};color:${st.cor}">${st.label}</span>
            ${agendaBadge}
            <span id="prog-arrow-${p.id}" style="color:var(--tx3);font-size:11px;transition:transform .2s">▼</span>
          </div>
        </div>
        <div id="prog-body-${p.id}" style="display:none" onclick="event.stopPropagation()">
          ${_bloco('Descrição', p.descricao)}
          ${actBtns}
        </div>
      </div>`;
  }

  function _progToggle(id) {
    const body  = document.getElementById(`prog-body-${id}`);
    const arrow = document.getElementById(`prog-arrow-${id}`);
    if (!body) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : '';
    if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
  }

  function _garantirModalProg() {
    let el = document.getElementById('min-prog-modal');
    if (el) return el;
    const tipoOpts = `
      <option value="culto">Culto</option>
      <option value="ensaio">Ensaio</option>
      <option value="evento" selected>Evento</option>
      <option value="atividade">Atividade</option>
      <option value="outro">Outro</option>`;
    const corpo = `
      ${_fld('mpg-titulo', 'Título', 'text', true)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${_fld('mpg-data', 'Data', 'date', true)}
        ${_fld('mpg-hora', 'Hora', 'time', false)}
      </div>
      ${_fld('mpg-local', 'Local', 'text', false)}
      ${_sel('mpg-tipo', 'Tipo', tipoOpts, false)}
      ${_sel('mpg-status', 'Status',
        '<option value="agendado">Agendado</option><option value="realizado">Realizado</option><option value="cancelado">Cancelado</option>',
        false)}
      <div>
        <label style="${_LB}">Descrição</label>
        <textarea id="mpg-desc" rows="3"
          style="${_INP};resize:vertical;height:auto;font-family:inherit;line-height:1.5"
          placeholder="Detalhes da programação..."></textarea>
      </div>
      ${_errEl('mpg-err')}`;
    const footer = `
      <button id="mpg-btn-publicar" onclick="_progPublicarClick()"
        style="display:none;padding:9px 18px;border-radius:8px;border:1px solid rgba(42,181,192,0.4);background:rgba(42,181,192,0.08);color:var(--teal);font-size:13px;font-weight:600;cursor:pointer;margin-right:auto">
        📅 Publicar na Agenda
      </button>
      <button id="mpg-btn" onclick="_progSalvar()"
        style="padding:9px 24px;border-radius:8px;border:none;background:var(--violet);color:#fff;font-size:13px;font-weight:600;cursor:pointer">Salvar</button>`;
    return _modalWrap('min-prog-modal', 'Nova Programação', 'Ministerial · Programações', corpo, footer);
  }

  async function minMinNovaProgramacao() {
    if (!_podeEditar() || !_ministerioAtual) return;
    _progEditandoId = null;
    const modal = _garantirModalProg();
    document.getElementById('min-prog-modal-title').textContent = 'Nova Programação';
    document.getElementById('mpg-titulo').value  = '';
    document.getElementById('mpg-data').value    = new Date().toISOString().slice(0, 10);
    document.getElementById('mpg-hora').value    = '';
    document.getElementById('mpg-local').value   = '';
    document.getElementById('mpg-tipo').value    = 'evento';
    document.getElementById('mpg-status').value  = 'agendado';
    document.getElementById('mpg-desc').value    = '';
    _showErr('mpg-err', '');
    const btnPub = document.getElementById('mpg-btn-publicar');
    if (btnPub) btnPub.style.display = 'none';
    modal.style.display = 'flex';
  }

  async function minMinEditarProgramacao(id) {
    if (!_podeEditar()) return;
    _progEditandoId = id;
    const modal = _garantirModalProg();
    document.getElementById('min-prog-modal-title').textContent = 'Editar Programação';
    _showErr('mpg-err', '');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_programacoes?id=eq.${id}`, { headers: _hdr() });
    const dados = r.ok ? await r.json() : [];
    const p = dados[0];
    if (!p) { alert('Programação não encontrada.'); return; }
    document.getElementById('mpg-titulo').value = p.titulo       || '';
    document.getElementById('mpg-data').value   = p.data         || '';
    document.getElementById('mpg-hora').value   = (p.hora || '').slice(0, 5);
    document.getElementById('mpg-local').value  = p.local        || '';
    document.getElementById('mpg-tipo').value   = p.tipo         || 'evento';
    document.getElementById('mpg-status').value = p.status       || 'agendado';
    document.getElementById('mpg-desc').value   = p.descricao    || '';
    const btnPub = document.getElementById('mpg-btn-publicar');
    if (btnPub) btnPub.style.display = p.agenda_id ? 'none' : '';
    modal.style.display = 'flex';
  }

  async function _progPublicarClick() {
    if (!_progEditandoId) return;
    const titulo = (document.getElementById('mpg-titulo').value || '').trim();
    const data   = document.getElementById('mpg-data').value || '';
    if (!titulo) { _showErr('mpg-err', 'Título é obrigatório.'); return; }
    if (!data)   { _showErr('mpg-err', 'Data é obrigatória.');   return; }

    const btn = document.getElementById('mpg-btn-publicar');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

    try {
      const payload = {
        titulo, data,
        hora:      document.getElementById('mpg-hora').value || null,
        local:     (document.getElementById('mpg-local').value || '').trim() || null,
        tipo:      document.getElementById('mpg-tipo').value || 'evento',
        status:    document.getElementById('mpg-status').value || 'agendado',
        descricao: (document.getElementById('mpg-desc').value || '').trim() || null,
      };
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_programacoes?id=eq.${_progEditandoId}`, {
        method: 'PATCH', headers: _hdrJson(), body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      document.getElementById('min-prog-modal').style.display = 'none';
      await minMinPublicarNaAgenda(_progEditandoId);
    } catch (e) {
      _showErr('mpg-err', 'Erro: ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = '📅 Publicar na Agenda'; }
    }
  }

  async function _progSalvar() {
    const titulo = (document.getElementById('mpg-titulo').value || '').trim();
    const data   = document.getElementById('mpg-data').value || '';
    if (!titulo) { _showErr('mpg-err', 'Título é obrigatório.'); return; }
    if (!data)   { _showErr('mpg-err', 'Data é obrigatória.');   return; }
    const btn = document.getElementById('mpg-btn');
    btn.disabled = true; btn.textContent = 'Salvando...';
    const payload = {
      titulo,
      data,
      hora:      document.getElementById('mpg-hora').value   || null,
      local:     (document.getElementById('mpg-local').value || '').trim() || null,
      tipo:      document.getElementById('mpg-tipo').value   || 'evento',
      status:    document.getElementById('mpg-status').value || 'agendado',
      descricao: (document.getElementById('mpg-desc').value  || '').trim() || null,
    };
    try {
      let r;
      if (_progEditandoId) {
        r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_programacoes?id=eq.${_progEditandoId}`, {
          method: 'PATCH', headers: _hdrJson(), body: JSON.stringify(payload),
        });
      } else {
        r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_programacoes`, {
          method: 'POST', headers: _hdrJson(),
          body: JSON.stringify(Object.assign({ ministerio_id: _ministerioAtual, criado_por: USUARIO_ATUAL?.auth_user_id || null }, payload)),
        });
      }
      if (!r.ok) throw new Error(await r.text());
      document.getElementById('min-prog-modal').style.display = 'none';
      await _carregarProgramacoes(_ministerioAtual);
    } catch (e) {
      _showErr('mpg-err', 'Erro ao salvar: ' + e.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  }

  async function minMinToggleProgStatus(id, novoStatus) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_programacoes?id=eq.${id}`, {
        method: 'PATCH', headers: _hdrJson(), body: JSON.stringify({ status: novoStatus }),
      });
      if (!r.ok) throw new Error(r.status);
      await _carregarProgramacoes(_ministerioAtual);
    } catch (e) { alert('Erro: ' + e.message); }
  }

  async function minMinRemoverProgramacao(id) {
    if (!confirm('Remover esta programação?')) return;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_programacoes?id=eq.${id}`, {
        method: 'DELETE', headers: _hdr(),
      });
      if (!r.ok) throw new Error(r.status);
      await _carregarProgramacoes(_ministerioAtual);
    } catch (e) { alert('Erro ao remover: ' + e.message); }
  }

  async function minMinPublicarNaAgenda(progId) {
    try {
      const rp = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_programacoes?id=eq.${progId}&select=*`, { headers: _hdr() });
      if (!rp.ok) throw new Error(rp.status);
      const [p] = await rp.json();
      if (!p) throw new Error('Programação não encontrada');

      const ministerioNome = _ministerioDataAtual?.nome || 'Ministério';
      const dataFmt = p.data
        ? new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        : '';

      if (!confirm(`Enviar "${p.titulo}" (${dataFmt}) para aprovação na Agenda da Igreja?\n\nA solicitação ficará pendente até ser aprovada pelo responsável pela agenda.`)) return;

      const dataObj = p.data ? new Date(p.data + 'T12:00:00') : null;
      const diaSemana = dataObj ? dataObj.toLocaleDateString('pt-BR', { weekday: 'long' }) : null;
      const mes       = dataObj ? dataObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : null;

      const body = {
        titulo:          p.titulo,
        data:            p.data,
        hora_inicio:     p.hora || null,
        descricao:       p.descricao || null,
        status:          'pendente',
        solicitante_txt: ministerioNome,
        origem_sol:      'ministerio',
        recorrencia:     'Único',
        ...(diaSemana && { dia_semana: diaSemana }),
        ...(mes        && { mes }),
      };

      const ra = await fetch(`${SUPABASE_URL}/rest/v1/agenda`, {
        method: 'POST',
        headers: { ..._hdrJson(), 'Prefer': 'return=representation' },
        body: JSON.stringify(body),
      });
      if (!ra.ok) throw new Error(await ra.text());
      const [agendaRow] = await ra.json();

      await fetch(`${SUPABASE_URL}/rest/v1/ministerio_programacoes?id=eq.${progId}`, {
        method: 'PATCH',
        headers: { ..._hdrJson(), 'Prefer': 'return=minimal' },
        body: JSON.stringify({ agenda_id: agendaRow.id, agenda_status: 'pendente' }),
      });

      await _carregarProgramacoes(_ministerioAtual);
      T('Publicado!', 'Solicitação enviada para aprovação na Agenda da Igreja.');
    } catch (e) {
      console.error('minMinPublicarNaAgenda:', e);
      T('Erro', e.message || 'Não foi possível publicar na agenda.');
    }
  }

  /* ══ ESCALAS DE SERVIÇO ══════════════════════════════════════ */
  async function _carregarEscalas(ministerioId) {
    const el  = document.getElementById('min-min-escal-list');
    const btn = document.getElementById('min-min-btn-add-escal');
    if (!el) return;
    if (btn) btn.style.display = _podeEditar() ? '' : 'none';
    el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:20px 0;text-align:center">Carregando...</div>';
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ministerio_escalas?ministerio_id=eq.${ministerioId}&order=data.desc,criado_em.desc`,
        { headers: _hdr() }
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        if (err?.code === '42P01') {
          el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:20px;text-align:center">Execute a migration <strong>ministerios-fase3-programacoes-escalas.sql</strong> para ativar este módulo.</div>';
          return;
        }
        throw new Error(err?.message || r.status);
      }
      const lista = await r.json();
      if (!lista.length) {
        el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Nenhuma escala registrada.</div>';
        return;
      }
      const podeAct = _podeEditar();
      el.innerHTML = lista.map(e => _cardEscala(e, podeAct)).join('');
    } catch (e) {
      console.error('_carregarEscalas:', e);
      el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0">Erro ao carregar escalas.</div>';
    }
  }

  function _cardEscala(e, podeAct) {
    const dataFmt = e.data
      ? new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
    const hora = e.hora ? e.hora.slice(0, 5) : '';
    const actBtns = podeAct ? `
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button onclick="minMinEditarEscala('${e.id}')" class="tbt" style="font-size:11px;padding:4px 10px">Editar</button>
        <button onclick="minMinRemoverEscala('${e.id}')" class="tbt" style="font-size:11px;padding:4px 10px;color:var(--rose);border-color:rgba(255,69,58,0.3)">Remover</button>
      </div>` : '';
    const addPessoa = podeAct ? `
      <div style="display:flex;gap:8px;align-items:flex-end;margin-top:10px;padding-top:10px;border-top:1px solid var(--bd1)">
        <div style="flex:1">
          <label style="${_LB};margin-bottom:4px">Adicionar Pessoa</label>
          <select id="escal-add-p-${e.id}" style="${_INP};padding:7px 10px">${_optionsPessoa('')}</select>
        </div>
        <div style="flex:1">
          <label style="${_LB};margin-bottom:4px">Função</label>
          <input type="text" id="escal-add-f-${e.id}" list="escal-func-dl" placeholder="Ex: Vocal, Violão..." style="${_INP};padding:7px 10px">
        </div>
        <button onclick="minMinAdicionarEscalaPessoa('${e.id}')"
          style="padding:8px 12px;border-radius:8px;border:none;background:var(--violet);color:#fff;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0">+</button>
      </div>
      <div id="escal-add-err-${e.id}" style="color:var(--rose);font-size:11px;display:none;margin-top:4px"></div>
      <datalist id="escal-func-dl">
        <option value="Vocal"><option value="Violão"><option value="Guitarra">
        <option value="Teclado"><option value="Bateria"><option value="Baixo">
        <option value="Percussão"><option value="Flauta"><option value="Saxofone">
        <option value="Trompete"><option value="Som"><option value="Projeção">
        <option value="Pregador"><option value="Coordenador">
      </datalist>` : '';
    return `
      <div class="card" style="margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="_escalToggle('${e.id}')">
          <div style="flex:1;min-width:0">
            <div style="font-size:13.5px;font-weight:600;color:var(--tx1);margin-bottom:2px">${escapeHtml(e.titulo)}</div>
            <div style="font-size:12px;color:var(--tx3)">${dataFmt}${hora ? ' · ' + hora : ''}</div>
          </div>
          <span id="escal-arrow-${e.id}" style="color:var(--tx3);font-size:11px;transition:transform .2s;flex-shrink:0">▼</span>
        </div>
        <div id="escal-body-${e.id}" style="display:none" onclick="event.stopPropagation()">
          <div id="escal-pessoas-${e.id}" style="margin-top:8px">
            <div style="color:var(--tx3);font-size:12px;padding:6px 0">Carregando...</div>
          </div>
          ${addPessoa}
          ${e.observacoes ? `<div style="margin-top:8px;font-size:12px;color:var(--tx3);font-style:italic">${escapeHtml(e.observacoes)}</div>` : ''}
          ${actBtns}
        </div>
      </div>`;
  }

  async function _escalToggle(id) {
    const body  = document.getElementById(`escal-body-${id}`);
    const arrow = document.getElementById(`escal-arrow-${id}`);
    if (!body) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : '';
    if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
    if (!open) await _carregarEscalaPessoas(id);
  }

  async function _carregarEscalaPessoas(escalId) {
    const el = document.getElementById(`escal-pessoas-${escalId}`);
    if (!el) return;
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ministerio_escala_pessoas?escala_id=eq.${escalId}&select=id,funcao,pessoas(id,nome)&order=criado_por.asc`,
        { headers: _hdr() }
      );
      const lista = r.ok ? await r.json() : [];
      const podeAct = _podeEditar();
      if (!lista.length) {
        el.innerHTML = '<div style="color:var(--tx3);font-size:12px;padding:6px 0">Nenhuma pessoa escalada.</div>';
        return;
      }
      el.innerHTML = `<div style="display:flex;flex-direction:column;gap:4px">` +
        lista.map(m => {
          const nome  = (m.pessoas?.nome || '—').toUpperCase();
          const func  = m.funcao || '—';
          const rmBtn = podeAct
            ? `<button onclick="minMinRemoverEscalaPessoa('${m.id}','${escalId}')"
                 class="tbt" style="font-size:10px;padding:2px 7px;color:var(--rose);border-color:rgba(255,69,58,0.3)">✕</button>`
            : '';
          return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0">
            <span style="font-size:13px;color:var(--tx1);font-weight:500;flex:1">${escapeHtml(nome)}</span>
            <span style="font-size:11.5px;color:var(--tx3);min-width:80px">${escapeHtml(func)}</span>
            ${rmBtn}
          </div>`;
        }).join('') + `</div>`;
    } catch (e) {
      el.innerHTML = '<div style="color:var(--rose);font-size:12px">Erro ao carregar.</div>';
    }
  }

  function _garantirModalEscala() {
    let el = document.getElementById('min-escal-modal');
    if (el) return el;
    const corpo = `
      ${_fld('mesc-titulo', 'Título', 'text', true)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${_fld('mesc-data', 'Data', 'date', true)}
        ${_fld('mesc-hora', 'Hora', 'time', false)}
      </div>
      <div>
        <label style="${_LB}">Observações</label>
        <textarea id="mesc-obs" rows="2"
          style="${_INP};resize:vertical;height:auto;font-family:inherit;line-height:1.5"></textarea>
      </div>
      ${_errEl('mesc-err')}`;
    const footer = `<button id="mesc-btn" onclick="_escalSalvar()"
      style="padding:9px 24px;border-radius:8px;border:none;background:var(--violet);color:#fff;font-size:13px;font-weight:600;cursor:pointer">Salvar</button>`;
    return _modalWrap('min-escal-modal', 'Nova Escala', 'Ministerial · Escalas', corpo, footer);
  }

  async function minMinNovaEscala() {
    if (!_podeEditar() || !_ministerioAtual) return;
    _escalEditandoId = null;
    await _carregarPessoas();
    const modal = _garantirModalEscala();
    document.getElementById('min-escal-modal-title').textContent = 'Nova Escala';
    document.getElementById('mesc-titulo').value = '';
    document.getElementById('mesc-data').value   = new Date().toISOString().slice(0, 10);
    document.getElementById('mesc-hora').value   = '';
    document.getElementById('mesc-obs').value    = '';
    _showErr('mesc-err', '');
    modal.style.display = 'flex';
  }

  async function minMinEditarEscala(id) {
    if (!_podeEditar()) return;
    _escalEditandoId = id;
    await _carregarPessoas();
    const modal = _garantirModalEscala();
    document.getElementById('min-escal-modal-title').textContent = 'Editar Escala';
    _showErr('mesc-err', '');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_escalas?id=eq.${id}`, { headers: _hdr() });
    const dados = r.ok ? await r.json() : [];
    const e = dados[0];
    if (!e) { alert('Escala não encontrada.'); return; }
    document.getElementById('mesc-titulo').value = e.titulo       || '';
    document.getElementById('mesc-data').value   = e.data         || '';
    document.getElementById('mesc-hora').value   = (e.hora || '').slice(0, 5);
    document.getElementById('mesc-obs').value    = e.observacoes  || '';
    modal.style.display = 'flex';
  }

  async function _escalSalvar() {
    const titulo = (document.getElementById('mesc-titulo').value || '').trim();
    const data   = document.getElementById('mesc-data').value || '';
    if (!titulo) { _showErr('mesc-err', 'Título é obrigatório.'); return; }
    if (!data)   { _showErr('mesc-err', 'Data é obrigatória.');   return; }
    const btn = document.getElementById('mesc-btn');
    btn.disabled = true; btn.textContent = 'Salvando...';
    const payload = {
      titulo,
      data,
      hora:        document.getElementById('mesc-hora').value || null,
      observacoes: (document.getElementById('mesc-obs').value || '').trim() || null,
    };
    try {
      let r;
      if (_escalEditandoId) {
        r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_escalas?id=eq.${_escalEditandoId}`, {
          method: 'PATCH', headers: _hdrJson(), body: JSON.stringify(payload),
        });
      } else {
        r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_escalas`, {
          method: 'POST', headers: _hdrJson(),
          body: JSON.stringify(Object.assign({ ministerio_id: _ministerioAtual, criado_por: USUARIO_ATUAL?.auth_user_id || null }, payload)),
        });
      }
      if (!r.ok) throw new Error(await r.text());
      document.getElementById('min-escal-modal').style.display = 'none';
      await _carregarEscalas(_ministerioAtual);
    } catch (e) {
      _showErr('mesc-err', 'Erro ao salvar: ' + e.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  }

  async function minMinAdicionarEscalaPessoa(escalId) {
    const pessoaId = document.getElementById(`escal-add-p-${escalId}`)?.value;
    const funcao   = (document.getElementById(`escal-add-f-${escalId}`)?.value || '').trim();
    const errEl    = document.getElementById(`escal-add-err-${escalId}`);
    if (!pessoaId) {
      if (errEl) { errEl.textContent = 'Selecione uma pessoa.'; errEl.style.display = ''; }
      return;
    }
    if (errEl) errEl.style.display = 'none';
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_escala_pessoas`, {
        method: 'POST', headers: _hdrJson(),
        body: JSON.stringify({
          escala_id: escalId, pessoa_id: pessoaId,
          funcao: funcao || null,
          criado_por: USUARIO_ATUAL?.auth_user_id || null,
        }),
      });
      if (!r.ok) {
        if (r.status === 409) throw new Error('Esta pessoa já está nesta escala.');
        throw new Error(await r.text());
      }
      const pSel = document.getElementById(`escal-add-p-${escalId}`);
      const fInp = document.getElementById(`escal-add-f-${escalId}`);
      if (pSel) pSel.value = '';
      if (fInp) fInp.value = '';
      await _carregarEscalaPessoas(escalId);
    } catch (e) {
      if (errEl) { errEl.textContent = e.message; errEl.style.display = ''; }
    }
  }

  async function minMinRemoverEscalaPessoa(membId, escalId) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_escala_pessoas?id=eq.${membId}`, {
        method: 'DELETE', headers: _hdr(),
      });
      if (!r.ok) throw new Error(r.status);
      await _carregarEscalaPessoas(escalId);
    } catch (e) { alert('Erro ao remover: ' + e.message); }
  }

  async function minMinRemoverEscala(id) {
    if (!confirm('Remover esta escala e todas as pessoas escaladas?')) return;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_escalas?id=eq.${id}`, {
        method: 'DELETE', headers: _hdr(),
      });
      if (!r.ok) throw new Error(r.status);
      await _carregarEscalas(_ministerioAtual);
    } catch (e) { alert('Erro ao remover: ' + e.message); }
  }

  /* ══ DOCUMENTOS DO MINISTÉRIO ═══════════════════════════════ */
  const _STORAGE_BUCKET = 'ministerios-docs';

  function _storageObjUrl(path) {
    return `${SUPABASE_URL}/storage/v1/object/${_STORAGE_BUCKET}/${path}`;
  }

  function _fmtBytes(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function _fmtDataCurta(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  async function _carregarDocumentos(ministerioId) {
    const el  = document.getElementById('min-min-doc-list');
    const btn = document.getElementById('min-min-btn-upload-doc');
    if (!el) return;
    if (btn) btn.style.display = _podeEditar() ? '' : 'none';
    el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:20px 0;text-align:center">Carregando...</div>';
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ministerio_documentos?ministerio_id=eq.${ministerioId}&order=criado_em.desc`,
        { headers: _hdr() }
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        if (err?.code === '42P01') {
          el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:20px;text-align:center">Execute a migration <strong>ministerios-fase5-documentos.sql</strong> para ativar documentos.</div>';
          return;
        }
        throw new Error(err?.message || r.status);
      }
      const lista = await r.json();
      if (!lista.length) {
        el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Nenhum documento enviado.</div>';
        return;
      }
      const podeAct = _podeEditar();
      const TIPOS = { regulamento:'Regulamento', manual:'Manual', ata:'Ata', formulario:'Formulário', outro:'Outro' };
      el.innerHTML = `
        <div class="card" style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:480px">
            <thead><tr style="border-bottom:2px solid var(--bd1)">
              <th style="text-align:left;padding:7px 8px;color:var(--tx3);font-weight:600">Nome</th>
              <th style="text-align:left;padding:7px 8px;color:var(--tx3);font-weight:600">Tipo</th>
              <th style="text-align:left;padding:7px 8px;color:var(--tx3);font-weight:600">Tamanho</th>
              <th style="text-align:left;padding:7px 8px;color:var(--tx3);font-weight:600">Data</th>
              ${podeAct ? '<th style="padding:7px 8px;color:var(--tx3);font-weight:600">Ações</th>' : ''}
            </tr></thead>
            <tbody>${lista.map(doc => `
              <tr style="border-bottom:1px solid var(--bd1)">
                <td style="padding:8px;color:var(--tx1);font-weight:500">
                  <a href="${_storageObjUrl(doc.storage_path)}" target="_blank" rel="noopener"
                    style="color:var(--violet);text-decoration:none">${escapeHtml(doc.nome)}</a>
                </td>
                <td style="padding:8px;color:var(--tx2)">${TIPOS[doc.tipo] || doc.tipo}</td>
                <td style="padding:8px;color:var(--tx3);font-variant-numeric:tabular-nums">${_fmtBytes(doc.tamanho)}</td>
                <td style="padding:8px;color:var(--tx3)">${_fmtDataCurta(doc.criado_em)}</td>
                ${podeAct ? `<td style="padding:8px;white-space:nowrap">
                  <button onclick="minMinRemoverDoc('${doc.id}','${doc.storage_path}')"
                    class="tbt" style="font-size:11px;padding:3px 8px;color:var(--rose);border-color:rgba(255,69,58,0.3)">Remover</button>
                </td>` : ''}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (e) {
      console.error('_carregarDocumentos:', e);
      el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0">Erro ao carregar documentos.</div>';
    }
  }

  function minMinUploadDoc() {
    if (!_ministerioAtual) return;
    const inp = document.getElementById('min-doc-file-input');
    if (inp) inp.click();
  }

  async function _docHandleFile(input) {
    const files = Array.from(input.files || []);
    if (!files.length) return;
    const statusEl = document.getElementById('min-doc-status');
    const btnEl    = document.getElementById('min-min-btn-upload-doc');
    if (btnEl) btnEl.disabled = true;

    const TIPO_OPTS = {
      'application/pdf': 'manual',
      'application/msword': 'manual',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'manual',
      'application/vnd.ms-excel': 'formulario',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'formulario',
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (statusEl) statusEl.textContent = `Enviando ${i + 1}/${files.length}: ${file.name}`;
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `ministerios/${_ministerioAtual}/${Date.now()}_${safeName}`;
        const rUp = await fetch(`${SUPABASE_URL}/storage/v1/object/${_STORAGE_BUCKET}/${path}`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + (typeof sipenToken === 'function' ? sipenToken() : SUPABASE_ANON_KEY),
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });
        if (!rUp.ok) {
          const errTxt = await rUp.text();
          throw new Error(`Storage: ${errTxt}`);
        }
        const tipo = TIPO_OPTS[file.type] || 'outro';
        const rDb = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_documentos`, {
          method: 'POST',
          headers: _hdrJson(),
          body: JSON.stringify({
            ministerio_id: _ministerioAtual,
            nome:          file.name,
            tipo,
            storage_path:  path,
            mime_type:     file.type || null,
            tamanho:       file.size,
            criado_por:    USUARIO_ATUAL?.auth_user_id || null,
          }),
        });
        if (!rDb.ok) throw new Error('Erro ao salvar registro no banco.');
      } catch (e) {
        alert(`Erro ao enviar ${file.name}: ${e.message}`);
      }
    }

    input.value = '';
    if (statusEl) statusEl.textContent = '';
    if (btnEl) btnEl.disabled = false;
    await _carregarDocumentos(_ministerioAtual);
  }

  async function minMinRemoverDoc(id, storagePath) {
    if (!confirm('Remover este documento permanentemente?')) return;
    try {
      await Promise.all([
        fetch(`${SUPABASE_URL}/storage/v1/object/${_STORAGE_BUCKET}`, {
          method: 'DELETE',
          headers: Object.assign(_hdrJson(), { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ prefixes: [storagePath] }),
        }),
        fetch(`${SUPABASE_URL}/rest/v1/ministerio_documentos?id=eq.${id}`, {
          method: 'DELETE', headers: _hdr(),
        }),
      ]);
      await _carregarDocumentos(_ministerioAtual);
    } catch (e) { alert('Erro ao remover: ' + e.message); }
  }

  /* ══ RELATÓRIOS DO MINISTÉRIO ════════════════════════════════ */
  async function _renderRelatorios() {
    const el = document.getElementById('min-min-rel-content');
    if (!el || !_ministerioAtual) return;
    el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Carregando...</div>';
    try {
      const hoje       = new Date();
      const mesAtual   = hoje.getMonth() + 1;
      const inicio30   = new Date(hoje); inicio30.setDate(inicio30.getDate() - 30);
      const i30        = inicio30.toISOString().slice(0, 10);
      const id         = _ministerioAtual;

      const [rMb, rSt, rReu, rPrg, rAnivs, rReuRec, rPrgRec] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/ministerio_membros?ministerio_id=eq.${id}&status=eq.ativo&select=id`, { headers: _hdr() }),
        fetch(`${SUPABASE_URL}/rest/v1/ministerio_setores?ministerio_id=eq.${id}&ativo=eq.true&select=id`, { headers: _hdr() }),
        fetch(`${SUPABASE_URL}/rest/v1/ministerio_reunioes?ministerio_id=eq.${id}&status=eq.realizada&data=gte.${i30}&select=id`, { headers: _hdr() }),
        fetch(`${SUPABASE_URL}/rest/v1/ministerio_programacoes?ministerio_id=eq.${id}&status=eq.realizado&data=gte.${i30}&select=id`, { headers: _hdr() }),
        fetch(`${SUPABASE_URL}/rest/v1/ministerio_membros?ministerio_id=eq.${id}&status=eq.ativo&select=pessoas(nome,data_nascimento)`, { headers: _hdr() }),
        fetch(`${SUPABASE_URL}/rest/v1/ministerio_reunioes?ministerio_id=eq.${id}&order=data.desc&limit=5&select=titulo,data,status`, { headers: _hdr() }),
        fetch(`${SUPABASE_URL}/rest/v1/ministerio_programacoes?ministerio_id=eq.${id}&order=data.desc&limit=5&select=titulo,data,tipo,status`, { headers: _hdr() }),
      ]);

      const mb   = rMb.ok   ? (await rMb.json()).length   : 0;
      const st   = rSt.ok   ? (await rSt.json()).length   : 0;
      const reu  = rReu.ok  ? (await rReu.json()).length  : 0;
      const prg  = rPrg.ok  ? (await rPrg.json()).length  : 0;
      const anivRaw = rAnivs.ok ? await rAnivs.json() : [];
      const reuRec  = rReuRec.ok ? await rReuRec.json() : [];
      const prgRec  = rPrgRec.ok ? await rPrgRec.json() : [];

      const anivs = anivRaw
        .filter(m => {
          const dn = m.pessoas?.data_nascimento;
          return dn && parseInt(dn.slice(5, 7)) === mesAtual;
        })
        .sort((a, b) => parseInt(a.pessoas.data_nascimento.slice(8, 10)) - parseInt(b.pessoas.data_nascimento.slice(8, 10)));

      const _kpi = (v, label, sub) =>
        `<div class="card" style="text-align:center;padding:16px 10px">
           <div style="font-size:26px;font-weight:700;color:var(--violet)">${v}</div>
           <div style="font-size:11px;color:var(--tx3);margin-top:4px">${label}</div>
           ${sub ? `<div style="font-size:10px;color:var(--tx3);margin-top:2px">${sub}</div>` : ''}
         </div>`;

      const _atividade = (lista, tipoCor) => lista.length
        ? lista.map(r => {
            const d = r.data ? new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }) : '—';
            const st = r.status === 'realizada' || r.status === 'realizado'
              ? '<span style="font-size:10px;color:var(--gr)">✓</span>'
              : r.status === 'cancelada' || r.status === 'cancelado'
                ? '<span style="font-size:10px;color:var(--rose)">✕</span>'
                : '<span style="font-size:10px;color:var(--gold,#ffd60a)">●</span>';
            return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd1)">
              ${st}
              <span style="font-size:13px;color:var(--tx1);flex:1">${escapeHtml(r.titulo)}</span>
              <span style="font-size:11px;color:var(--tx3)">${d}</span>
            </div>`;
          }).join('')
        : '<div style="color:var(--tx3);font-size:12px;padding:8px 0">Nenhum registro.</div>';

      const mesNome = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][mesAtual - 1];

      el.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-bottom:16px">
          ${_kpi(mb, 'Membros ativos', '')}
          ${_kpi(st, 'Setores ativos', '')}
          ${_kpi(reu, 'Reuniões realizadas', 'últimos 30 dias')}
          ${_kpi(prg, 'Programações realizadas', 'últimos 30 dias')}
        </div>
        ${anivs.length ? `
          <div class="card" style="margin-bottom:12px">
            <div class="ctit">Aniversariantes — ${mesNome}</div>
            <div>${anivs.map(m => {
              const d = m.pessoas.data_nascimento;
              return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--bd1)">
                <div style="width:28px;height:28px;border-radius:6px;background:var(--violetbg);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--violet);flex-shrink:0">${d.slice(8,10)}</div>
                <span style="font-size:13px;color:var(--tx1)">${escapeHtml((m.pessoas.nome||'').toUpperCase())}</span>
              </div>`;
            }).join('')}</div>
          </div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="card">
            <div class="ctit" style="margin-bottom:10px">Reuniões Recentes</div>
            ${_atividade(reuRec)}
          </div>
          <div class="card">
            <div class="ctit" style="margin-bottom:10px">Programações Recentes</div>
            ${_atividade(prgRec)}
          </div>
        </div>`;

    } catch (e) {
      console.error('_renderRelatorios:', e);
      el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0;text-align:center">Erro ao carregar relatórios.</div>';
    }
  }

  /* ══ WHATSAPP DO MINISTÉRIO ══════════════════════════════════ */
  async function _renderWhatsapp() {
    const el = document.getElementById('min-min-wa-content');
    if (!el) return;
    el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Carregando membros...</div>';
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ministerio_membros?ministerio_id=eq.${_ministerioAtual}&ativo=eq.true&select=pessoa_id,pessoas(id,nome,telefone)&order=pessoas(nome).asc`,
        { headers: _hdr() }
      );
      if (!r.ok) throw new Error(r.status);
      const rows = await r.json();

      const comTel = rows.filter(r => r.pessoas && r.pessoas.telefone);
      const semTel = rows.filter(r => r.pessoas && !r.pessoas.telefone);

      if (!rows.length) {
        el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Nenhum membro ativo.</div>';
        return;
      }

      const numeros = comTel.map(r => {
        const t = r.pessoas.telefone.replace(/\D/g, '');
        return t.startsWith('55') ? t : '55' + t;
      });

      el.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
          <span style="font-size:13px;color:var(--tx2)">${comTel.length} com WhatsApp · ${semTel.length} sem telefone</span>
          ${comTel.length ? `<button class="tbt sec" onclick="_waCopiarNumeros()">Copiar todos os números</button>` : ''}
        </div>
        <input type="hidden" id="wa-numeros-raw" value="${numeros.join(',')}">
        <div style="display:flex;flex-direction:column;gap:6px">
          ${comTel.map(r => {
            const tel  = r.pessoas.telefone.replace(/\D/g, '');
            const wa   = tel.startsWith('55') ? tel : '55' + tel;
            const nome = r.pessoas.nome || '—';
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--bg2);border-radius:6px;gap:8px">
              <span style="font-size:13px;color:var(--tx1)">${nome}</span>
              <a href="https://wa.me/${wa}" target="_blank" style="font-size:12px;color:#25d366;text-decoration:none;white-space:nowrap">
                ${r.pessoas.telefone} ↗
              </a>
            </div>`;
          }).join('')}
          ${semTel.length ? `
            <div style="margin-top:10px;font-size:12px;color:var(--tx3);font-weight:500">Sem telefone cadastrado</div>
            ${semTel.map(r => `
              <div style="padding:9px 12px;background:var(--bg2);border-radius:6px;opacity:.6">
                <span style="font-size:13px;color:var(--tx2)">${r.pessoas ? r.pessoas.nome : '—'}</span>
              </div>`).join('')}
          ` : ''}
        </div>`;
    } catch (e) {
      console.error('_renderWhatsapp:', e);
      el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0">Erro ao carregar membros.</div>';
    }
  }

  function _waCopiarNumeros() {
    const raw = document.getElementById('wa-numeros-raw');
    if (!raw || !raw.value) return;
    navigator.clipboard.writeText(raw.value).then(() => {
      const btn = document.querySelector('[onclick="_waCopiarNumeros()"]');
      if (btn) { const orig = btn.textContent; btn.textContent = 'Copiado!'; setTimeout(() => btn.textContent = orig, 1800); }
    }).catch(() => alert('Não foi possível copiar. Verifique as permissões do navegador.'));
  }

  /* ══ MÓDULOS ESPECÍFICOS ══════════════════════════════════════ */
  async function _renderModulo() {
    const el = document.getElementById('min-min-mod-content');
    if (!el) return;
    const tipo = _recursosAtual.modulo;
    if (!tipo) { el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Módulo não configurado.</div>'; return; }
    if (tipo === 'repertorio')                                               return _renderRepertorio(el);
    if (tipo === 'turmas')                                                   return _renderTurmas(el);
    if (['projetos','projetos_missionarios','producoes','integracao'].includes(tipo)) return _renderProjetos(el);
    el.innerHTML = `<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Módulo "${tipo}" não reconhecido.</div>`;
  }

  /* ── Repertório ────────────────────────────────────────────── */
  let _repEditandoId = null;

  async function _renderRepertorio(el) {
    el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Carregando repertório...</div>';
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ministerio_repertorio?ministerio_id=eq.${_ministerioAtual}&order=titulo.asc`,
        { headers: _hdr() }
      );
      if (!r.ok) throw new Error(r.status);
      const rows = await r.json();

      el.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <span style="font-size:13px;color:var(--tx2)">${rows.length} música${rows.length !== 1 ? 's' : ''}</span>
          <button class="tbt pri" onclick="minMinNovaMusica()">+ Música</button>
        </div>
        ${rows.length ? `<div style="display:flex;flex-direction:column;gap:6px">
          ${rows.map(m => `
            <div style="padding:10px 12px;background:var(--bg2);border-radius:6px">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
                <div>
                  <div style="font-size:13.5px;font-weight:600;color:var(--tx1)">${_esc(m.titulo)}</div>
                  ${m.artista ? `<div style="font-size:12px;color:var(--tx3)">${_esc(m.artista)}</div>` : ''}
                  <div style="display:flex;gap:10px;margin-top:4px;flex-wrap:wrap">
                    ${m.tom  ? `<span style="font-size:11px;color:var(--tx3)">Tom: <b>${_esc(m.tom)}</b></span>`   : ''}
                    ${m.bpm  ? `<span style="font-size:11px;color:var(--tx3)">BPM: <b>${m.bpm}</b></span>`        : ''}
                    ${m.tags ? `<span style="font-size:11px;color:var(--tx3)">${_esc(m.tags)}</span>`             : ''}
                  </div>
                  <div style="display:flex;gap:10px;margin-top:4px">
                    ${m.link_youtube ? `<a href="${m.link_youtube}" target="_blank" style="font-size:11px;color:var(--violet)">YouTube ↗</a>` : ''}
                    ${m.link_cifra   ? `<a href="${m.link_cifra}"   target="_blank" style="font-size:11px;color:var(--violet)">Cifra ↗</a>`   : ''}
                  </div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0">
                  <button class="tbt sec" style="font-size:11px;padding:4px 10px" onclick="minMinEditarMusica('${m.id}')">Editar</button>
                  <button class="tbt dng" style="font-size:11px;padding:4px 10px" onclick="minMinRemoverMusica('${m.id}')">×</button>
                </div>
              </div>
            </div>`).join('')}
        </div>` : '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Nenhuma música cadastrada.</div>'}`;

      _garantirModalRepertorio();
    } catch (e) {
      console.error('_renderRepertorio:', e);
      el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0">Erro ao carregar repertório.</div>';
    }
  }

  function _garantirModalRepertorio() {
    if (document.getElementById('modal-rep')) return;
    const d = document.createElement('div');
    d.id = 'modal-rep';
    d.innerHTML = _modalWrap('modal-rep', 'Música', `
      ${_fld('Título', 'rep-titulo', 'text', 'Nome da música', true)}
      ${_fld('Artista', 'rep-artista', 'text', 'Compositor / artista')}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${_fld('Tom', 'rep-tom', 'text', 'Ex: G, Bb, C#')}
        ${_fld('BPM', 'rep-bpm', 'number', '120')}
      </div>
      ${_fld('Link YouTube', 'rep-youtube', 'url', 'https://...')}
      ${_fld('Link Cifra', 'rep-cifra', 'url', 'https://...')}
      ${_fld('Tags', 'rep-tags', 'text', 'adoração, gospel, contemporâneo...')}
      ${_errEl('rep-err')}
    `, `<button class="tbt sec" onclick="_fechModal('modal-rep')">Cancelar</button>
        <button class="tbt pri" onclick="_repSalvar()">Salvar</button>`);
    document.body.appendChild(d);
  }

  function minMinNovaMusica() {
    _repEditandoId = null;
    _garantirModalRepertorio();
    ['rep-titulo','rep-artista','rep-tom','rep-bpm','rep-youtube','rep-cifra','rep-tags'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    _showErr('rep-err', '');
    document.getElementById('modal-rep-title').textContent = 'Nova Música';
    _abrModal('modal-rep');
  }

  async function minMinEditarMusica(id) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_repertorio?id=eq.${id}`, { headers: _hdr() });
      if (!r.ok) throw new Error(r.status);
      const [m] = await r.json();
      _repEditandoId = id;
      _garantirModalRepertorio();
      const set = (fid, v) => { const el = document.getElementById(fid); if (el) el.value = v || ''; };
      set('rep-titulo', m.titulo); set('rep-artista', m.artista); set('rep-tom', m.tom);
      set('rep-bpm', m.bpm); set('rep-youtube', m.link_youtube); set('rep-cifra', m.link_cifra);
      set('rep-tags', m.tags);
      _showErr('rep-err', '');
      document.getElementById('modal-rep-title').textContent = 'Editar Música';
      _abrModal('modal-rep');
    } catch (e) { alert('Erro ao carregar música: ' + e.message); }
  }

  async function _repSalvar() {
    const titulo = document.getElementById('rep-titulo')?.value.trim();
    if (!titulo) { _showErr('rep-err', 'Título obrigatório.'); return; }
    const payload = {
      ministerio_id: _ministerioAtual,
      titulo,
      artista:      document.getElementById('rep-artista')?.value.trim() || null,
      tom:          document.getElementById('rep-tom')?.value.trim()     || null,
      bpm:          parseInt(document.getElementById('rep-bpm')?.value)  || null,
      link_youtube: document.getElementById('rep-youtube')?.value.trim() || null,
      link_cifra:   document.getElementById('rep-cifra')?.value.trim()   || null,
      tags:         document.getElementById('rep-tags')?.value.trim()    || null,
    };
    try {
      const url = _repEditandoId
        ? `${SUPABASE_URL}/rest/v1/ministerio_repertorio?id=eq.${_repEditandoId}`
        : `${SUPABASE_URL}/rest/v1/ministerio_repertorio`;
      const r = await fetch(url, {
        method:  _repEditandoId ? 'PATCH' : 'POST',
        headers: _hdrJson(),
        body:    JSON.stringify(_repEditandoId ? payload : payload),
      });
      if (!r.ok) throw new Error(r.status);
      _fechModal('modal-rep');
      _renderRepertorio(document.getElementById('min-min-mod-content'));
    } catch (e) { _showErr('rep-err', 'Erro ao salvar: ' + e.message); }
  }

  async function minMinRemoverMusica(id) {
    if (!confirm('Remover esta música?')) return;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_repertorio?id=eq.${id}`, { method: 'DELETE', headers: _hdr() });
      if (!r.ok) throw new Error(r.status);
      _renderRepertorio(document.getElementById('min-min-mod-content'));
    } catch (e) { alert('Erro ao remover: ' + e.message); }
  }

  /* ── Projetos ──────────────────────────────────────────────── */
  let _projEditandoId = null;
  const _PROJ_STATUS = { planejado:'Planejado', em_andamento:'Em andamento', concluido:'Concluído', cancelado:'Cancelado' };

  async function _renderProjetos(el) {
    el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Carregando projetos...</div>';
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ministerio_projetos?ministerio_id=eq.${_ministerioAtual}&order=criado_em.desc&select=*,pessoas(nome)`,
        { headers: _hdr() }
      );
      if (!r.ok) throw new Error(r.status);
      const rows = await r.json();

      const COR = { planejado:'var(--violet)', em_andamento:'#f59e0b', concluido:'#22c55e', cancelado:'var(--rose)' };

      el.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <span style="font-size:13px;color:var(--tx2)">${rows.length} projeto${rows.length !== 1 ? 's' : ''}</span>
          <button class="tbt pri" onclick="minMinNovoProjeto()">+ Projeto</button>
        </div>
        ${rows.length ? `<div style="display:flex;flex-direction:column;gap:6px">
          ${rows.map(p => `
            <div style="padding:10px 12px;background:var(--bg2);border-radius:6px">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span style="font-size:13.5px;font-weight:600;color:var(--tx1)">${_esc(p.titulo)}</span>
                    <span style="font-size:11px;padding:2px 7px;border-radius:10px;background:${COR[p.status]}20;color:${COR[p.status]};white-space:nowrap">${_PROJ_STATUS[p.status] || p.status}</span>
                  </div>
                  ${p.descricao ? `<div style="font-size:12px;color:var(--tx3);margin-top:2px">${_esc(p.descricao)}</div>` : ''}
                  <div style="display:flex;gap:12px;margin-top:4px;flex-wrap:wrap">
                    ${p.data_inicio ? `<span style="font-size:11px;color:var(--tx3)">Início: ${p.data_inicio}</span>`     : ''}
                    ${p.data_fim    ? `<span style="font-size:11px;color:var(--tx3)">Fim: ${p.data_fim}</span>`           : ''}
                    ${p.pessoas     ? `<span style="font-size:11px;color:var(--tx3)">Resp.: ${_esc(p.pessoas.nome)}</span>` : ''}
                  </div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0">
                  <button class="tbt sec" style="font-size:11px;padding:4px 10px" onclick="minMinEditarProjeto('${p.id}')">Editar</button>
                  <button class="tbt dng" style="font-size:11px;padding:4px 10px" onclick="minMinRemoverProjeto('${p.id}')">×</button>
                </div>
              </div>
            </div>`).join('')}
        </div>` : '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Nenhum projeto cadastrado.</div>'}`;

      _garantirModalProjeto();
    } catch (e) {
      console.error('_renderProjetos:', e);
      el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0">Erro ao carregar projetos.</div>';
    }
  }

  function _garantirModalProjeto() {
    if (document.getElementById('modal-proj')) return;
    const d = document.createElement('div');
    d.id = 'modal-proj';
    d.innerHTML = _modalWrap('modal-proj', 'Projeto', `
      ${_fld('Título', 'proj-titulo', 'text', 'Nome do projeto', true)}
      ${_fld('Descrição', 'proj-descricao', 'text', 'Breve descrição')}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${_fld('Data início', 'proj-inicio', 'date', '')}
        ${_fld('Data fim', 'proj-fim', 'date', '')}
      </div>
      ${_sel('Status', 'proj-status', [
        { v:'planejado', l:'Planejado' }, { v:'em_andamento', l:'Em andamento' },
        { v:'concluido', l:'Concluído' }, { v:'cancelado',    l:'Cancelado'    },
      ])}
      ${_errEl('proj-err')}
    `, `<button class="tbt sec" onclick="_fechModal('modal-proj')">Cancelar</button>
        <button class="tbt pri" onclick="_projSalvar()">Salvar</button>`);
    document.body.appendChild(d);
  }

  function minMinNovoProjeto() {
    _projEditandoId = null;
    _garantirModalProjeto();
    ['proj-titulo','proj-descricao','proj-inicio','proj-fim'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const s = document.getElementById('proj-status'); if (s) s.value = 'planejado';
    _showErr('proj-err', '');
    document.getElementById('modal-proj-title').textContent = 'Novo Projeto';
    _abrModal('modal-proj');
  }

  async function minMinEditarProjeto(id) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_projetos?id=eq.${id}`, { headers: _hdr() });
      if (!r.ok) throw new Error(r.status);
      const [p] = await r.json();
      _projEditandoId = id;
      _garantirModalProjeto();
      const set = (fid, v) => { const el = document.getElementById(fid); if (el) el.value = v || ''; };
      set('proj-titulo', p.titulo); set('proj-descricao', p.descricao);
      set('proj-inicio', p.data_inicio); set('proj-fim', p.data_fim);
      set('proj-status', p.status);
      _showErr('proj-err', '');
      document.getElementById('modal-proj-title').textContent = 'Editar Projeto';
      _abrModal('modal-proj');
    } catch (e) { alert('Erro ao carregar projeto: ' + e.message); }
  }

  async function _projSalvar() {
    const titulo = document.getElementById('proj-titulo')?.value.trim();
    if (!titulo) { _showErr('proj-err', 'Título obrigatório.'); return; }
    const payload = {
      ministerio_id: _ministerioAtual,
      titulo,
      descricao:   document.getElementById('proj-descricao')?.value.trim() || null,
      data_inicio: document.getElementById('proj-inicio')?.value  || null,
      data_fim:    document.getElementById('proj-fim')?.value     || null,
      status:      document.getElementById('proj-status')?.value  || 'planejado',
    };
    try {
      const url = _projEditandoId
        ? `${SUPABASE_URL}/rest/v1/ministerio_projetos?id=eq.${_projEditandoId}`
        : `${SUPABASE_URL}/rest/v1/ministerio_projetos`;
      const r = await fetch(url, {
        method:  _projEditandoId ? 'PATCH' : 'POST',
        headers: _hdrJson(),
        body:    JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(r.status);
      _fechModal('modal-proj');
      _renderProjetos(document.getElementById('min-min-mod-content'));
    } catch (e) { _showErr('proj-err', 'Erro ao salvar: ' + e.message); }
  }

  async function minMinRemoverProjeto(id) {
    if (!confirm('Remover este projeto?')) return;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_projetos?id=eq.${id}`, { method: 'DELETE', headers: _hdr() });
      if (!r.ok) throw new Error(r.status);
      _renderProjetos(document.getElementById('min-min-mod-content'));
    } catch (e) { alert('Erro ao remover: ' + e.message); }
  }

  /* ── Turmas ────────────────────────────────────────────────── */
  let _turmaEditandoId = null;

  async function _renderTurmas(el) {
    el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Carregando turmas...</div>';
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ministerio_turmas?ministerio_id=eq.${_ministerioAtual}&order=nome.asc&select=*,pessoas(nome)`,
        { headers: _hdr() }
      );
      if (!r.ok) throw new Error(r.status);
      const rows = await r.json();

      el.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <span style="font-size:13px;color:var(--tx2)">${rows.length} turma${rows.length !== 1 ? 's' : ''}</span>
          <button class="tbt pri" onclick="minMinNovaTurma()">+ Turma</button>
        </div>
        ${rows.length ? `<div style="display:flex;flex-direction:column;gap:6px">
          ${rows.map(t => `
            <div style="padding:10px 12px;background:var(--bg2);border-radius:6px${t.ativo ? '' : ';opacity:.55'}">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
                <div>
                  <div style="font-size:13.5px;font-weight:600;color:var(--tx1)">${_esc(t.nome)}</div>
                  <div style="display:flex;gap:12px;margin-top:4px;flex-wrap:wrap">
                    ${t.faixa_etaria ? `<span style="font-size:11px;color:var(--tx3)">${_esc(t.faixa_etaria)}</span>`     : ''}
                    ${t.sala         ? `<span style="font-size:11px;color:var(--tx3)">Sala: ${_esc(t.sala)}</span>`       : ''}
                    ${t.pessoas      ? `<span style="font-size:11px;color:var(--tx3)">Prof.: ${_esc(t.pessoas.nome)}</span>` : ''}
                  </div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0">
                  <button class="tbt sec" style="font-size:11px;padding:4px 10px" onclick="minMinEditarTurma('${t.id}')">Editar</button>
                  <button class="tbt dng" style="font-size:11px;padding:4px 10px" onclick="minMinRemoverTurma('${t.id}')">×</button>
                </div>
              </div>
            </div>`).join('')}
        </div>` : '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center">Nenhuma turma cadastrada.</div>'}`;

      _garantirModalTurma();
    } catch (e) {
      console.error('_renderTurmas:', e);
      el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0">Erro ao carregar turmas.</div>';
    }
  }

  function _garantirModalTurma() {
    if (document.getElementById('modal-turma')) return;
    const d = document.createElement('div');
    d.id = 'modal-turma';
    d.innerHTML = _modalWrap('modal-turma', 'Turma', `
      ${_fld('Nome', 'turma-nome', 'text', 'Ex: Primários, Juniores', true)}
      ${_fld('Faixa Etária', 'turma-faixa', 'text', 'Ex: 7 a 10 anos')}
      ${_fld('Sala', 'turma-sala', 'text', 'Ex: Sala 03')}
      ${_errEl('turma-err')}
    `, `<button class="tbt sec" onclick="_fechModal('modal-turma')">Cancelar</button>
        <button class="tbt pri" onclick="_turmaSalvar()">Salvar</button>`);
    document.body.appendChild(d);
  }

  function minMinNovaTurma() {
    _turmaEditandoId = null;
    _garantirModalTurma();
    ['turma-nome','turma-faixa','turma-sala'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    _showErr('turma-err', '');
    document.getElementById('modal-turma-title').textContent = 'Nova Turma';
    _abrModal('modal-turma');
  }

  async function minMinEditarTurma(id) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_turmas?id=eq.${id}`, { headers: _hdr() });
      if (!r.ok) throw new Error(r.status);
      const [t] = await r.json();
      _turmaEditandoId = id;
      _garantirModalTurma();
      const set = (fid, v) => { const el = document.getElementById(fid); if (el) el.value = v || ''; };
      set('turma-nome', t.nome); set('turma-faixa', t.faixa_etaria); set('turma-sala', t.sala);
      _showErr('turma-err', '');
      document.getElementById('modal-turma-title').textContent = 'Editar Turma';
      _abrModal('modal-turma');
    } catch (e) { alert('Erro ao carregar turma: ' + e.message); }
  }

  async function _turmaSalvar() {
    const nome = document.getElementById('turma-nome')?.value.trim();
    if (!nome) { _showErr('turma-err', 'Nome obrigatório.'); return; }
    const payload = {
      ministerio_id: _ministerioAtual,
      nome,
      faixa_etaria: document.getElementById('turma-faixa')?.value.trim() || null,
      sala:         document.getElementById('turma-sala')?.value.trim()  || null,
    };
    try {
      const url = _turmaEditandoId
        ? `${SUPABASE_URL}/rest/v1/ministerio_turmas?id=eq.${_turmaEditandoId}`
        : `${SUPABASE_URL}/rest/v1/ministerio_turmas`;
      const r = await fetch(url, {
        method:  _turmaEditandoId ? 'PATCH' : 'POST',
        headers: _hdrJson(),
        body:    JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(r.status);
      _fechModal('modal-turma');
      _renderTurmas(document.getElementById('min-min-mod-content'));
    } catch (e) { _showErr('turma-err', 'Erro ao salvar: ' + e.message); }
  }

  async function minMinRemoverTurma(id) {
    if (!confirm('Remover esta turma?')) return;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_turmas?id=eq.${id}`, { method: 'DELETE', headers: _hdr() });
      if (!r.ok) throw new Error(r.status);
      _renderTurmas(document.getElementById('min-min-mod-content'));
    } catch (e) { alert('Erro ao remover: ' + e.message); }
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
      const statMb = document.getElementById('min-min-stat-membros');
      if (statMb) statMb.textContent = ativos.length;

      if (lista.length === 0) {
        el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:20px 0;text-align:center">Nenhum membro adicionado a este ministério.</div>';
        return;
      }

      const podeAct = _podeEditar();
      const thAcoes = podeAct ? '<th style="width:40px;padding:6px 8px"></th>' : '';

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
            const funcao = mb.funcao || 'Membro';
            const ativo  = mb.status !== 'inativo';
            const stTag  = ativo
              ? '<span style="font-size:11px;padding:2px 7px;background:var(--greenbg,#d1fae5);color:var(--green,#059669);border-radius:20px">Ativo</span>'
              : '<span style="font-size:11px;padding:2px 7px;background:#fee2e2;color:var(--rose);border-radius:20px">Inativo</span>';
            const tdAcoes = podeAct
              ? `<td style="padding:7px 8px;text-align:right">
                   <div style="position:relative;display:inline-block">
                     <button onclick="minMinMembroKebab(this)"
                       data-id="${mb.id}"
                       data-novo-status="${ativo ? 'inativo' : 'ativo'}"
                       data-funcao="${funcao.replace(/"/g,'&quot;')}"
                       data-ativo="${ativo}"
                       style="background:none;border:1px solid var(--bd2);border-radius:5px;color:var(--tx2);font-size:15px;padding:2px 7px;cursor:pointer;line-height:1">⋯</button>
                   </div>
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
      const statSt = document.getElementById('min-min-stat-setores');
      if (statSt) statSt.textContent = ativos.length;

      if (lista.length === 0) {
        el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:16px 0;text-align:center">Nenhum setor cadastrado neste ministério.</div>';
        return;
      }

      // Resolver nomes dos líderes e membros de cada setor em paralelo
      const liderIds = [...new Set(lista.filter(s => s.lider_setorial).map(s => s.lider_setorial))];
      const setorIds = lista.map(s => s.id);
      const nomeLider = {};
      const membrosPorSetor = {};

      const fetchLideres = liderIds.length
        ? fetch(`${SUPABASE_URL}/rest/v1/pessoas?id=in.(${liderIds.join(',')})&select=id,nome`, { headers: _hdr() })
        : Promise.resolve(null);

      const fetchMembros = setorIds.length
        ? fetch(
            `${SUPABASE_URL}/rest/v1/ministerio_setor_membros` +
            `?setor_id=in.(${setorIds.join(',')})&select=setor_id,pessoas(id,nome)&order=criado_em.asc`,
            { headers: _hdr() }
          )
        : Promise.resolve(null);

      const [rl, rm] = await Promise.all([fetchLideres, fetchMembros]);

      if (rl) {
        const ps = rl.ok ? await rl.json() : [];
        ps.forEach(p => { nomeLider[p.id] = (p.nome || '').toUpperCase(); });
      }
      if (rm && rm.ok) {
        const mbs = await rm.json();
        mbs.forEach(m => {
          const nome = m.pessoas?.nome;
          if (!nome) return;
          if (!membrosPorSetor[m.setor_id]) membrosPorSetor[m.setor_id] = [];
          membrosPorSetor[m.setor_id].push(nome);
        });
      }

      const podeAct = _podeEditarSetor();
      el.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="border-bottom:2px solid var(--bd1)">
            <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Setor</th>
            <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Líder Setorial</th>
            <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Membros do Setor</th>
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

            const membros = membrosPorSetor[s.id] || [];
            let membrosHtml;
            if (membros.length === 0) {
              membrosHtml = '<span style="color:var(--tx3)">—</span>';
            } else if (membros.length <= 4) {
              membrosHtml = `<div style="font-size:12px;line-height:1.7">${membros.map(n => escapeHtml(n.toUpperCase())).join('<br>')}</div>`;
            } else {
              const visiveis = membros.slice(0, 3).map(n => escapeHtml(n.toUpperCase())).join('<br>');
              membrosHtml = `<div style="font-size:12px;line-height:1.7">${visiveis}<br><span style="color:var(--tx3)">+${membros.length - 3} mais</span></div>`;
            }

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
              <td style="padding:7px 8px;vertical-align:top">${membrosHtml}</td>
              <td style="padding:7px 8px;vertical-align:top">${stTag}</td>
              ${tdAcoes}
            </tr>`;
          }).join('')}</tbody>
        </table>`;
    } catch (e) {
      console.error('_carregarSetores:', e);
      el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0">Erro ao carregar setores.</div>';
    }
  }

  /* ══ MEMBROS DO SETOR ════════════════════════════════════════ */
  async function _carregarSetorMembros(setorId) {
    const el = document.getElementById('mst-membros-list');
    if (el) el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:10px 0">Carregando...</div>';
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ministerio_setor_membros` +
        `?setor_id=eq.${setorId}&select=id,pessoas(id,nome)&order=criado_em.asc`,
        { headers: _hdr() }
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        if (err?.code === '42P01') {
          if (el) el.innerHTML = '<div style="color:var(--rose);font-size:12px;padding:10px 0">Tabela não encontrada. Execute <strong>ministerio-setor-membros.sql</strong> no Supabase Dashboard.</div>';
          return;
        }
        throw new Error(err?.message || `HTTP ${r.status}`);
      }
      const lista = await r.json();
      _renderSetorMembros(lista);
    } catch (e) {
      console.error('_carregarSetorMembros:', e);
      if (el) el.innerHTML = `<div style="color:var(--rose);font-size:13px">Erro ao carregar membros: ${escapeHtml(e.message)}</div>`;
    }
  }

  function _renderSetorMembros(lista) {
    const el = document.getElementById('mst-membros-list');
    if (!el) return;
    if (lista.length === 0) {
      el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:10px 0;text-align:center">Nenhum membro adicionado a este setor.</div>';
      return;
    }
    el.innerHTML = lista.map(m => {
      const nome = (m.pessoas?.nome || '—').toUpperCase();
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bd1)">
        <span style="font-size:13px;color:var(--tx1)">${escapeHtml(nome)}</span>
        <button onclick="minMinRemoverMembroSetor('${m.id}')"
          class="tbt" style="font-size:11px;padding:3px 8px;color:var(--rose);border-color:var(--rose)">Remover</button>
      </div>`;
    }).join('');
  }

  /* ══ VOLTAR LISTA ════════════════════════════════════════════ */
  function minMinVoltarLista() {
    _ministerioAtual     = null;
    _ministerioDataAtual = null;
    document.getElementById('min-min-painel-detalhe').style.display = 'none';
    document.getElementById('min-min-painel-lista').style.display   = '';
    const heroAct = document.getElementById('min-min-hero-act');
    if (heroAct) heroAct.style.display = _isAdminGeral() ? '' : 'none';
    const heroTtl = document.querySelector('#v-min-min .hero-ttl');
    if (heroTtl) heroTtl.textContent = 'Ministérios';
    const cr = document.getElementById('crumb');
    if (cr) cr.innerHTML = `<span class="c-mod">Departamentos</span><span class="c-sep">/</span><span class="c-pg">Ministérios</span><span class="c-sub">/ grupos ministeriais</span>`;
    document.querySelectorAll('#sb-min-ministerios .si').forEach(el => el.classList.remove('on'));
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
      <option value="ACOLHIMENTO">🤗 Acolhimento &amp; Integração</option>
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
    if (!_isAdminGeral()) return;
    _editandoId = null;
    const modal = _garantirModalMin();
    document.getElementById('min-min-modal-title').textContent = 'Novo Ministério';
    document.getElementById('mm-nome').value  = '';
    document.getElementById('mm-desc').value  = '';
    document.getElementById('mm-tipo').value  = '';
    document.getElementById('mm-ativo').checked = true;
    _showErr('mm-err', '');
    // Supervisor só editável pelo Admin Geral
    const supWrap = document.getElementById('mm-supervisor')?.closest('div');
    if (supWrap) supWrap.style.display = _isAdminGeral() ? '' : 'none';
    modal.style.display = 'flex';
    await _preencherSelectsLideranca(null);
  }

  async function minMinEditar(id) {
    if (!_podeEditarMinisterio()) return;
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
    // Supervisor só editável pelo Admin Geral
    const supWrap = document.getElementById('mm-supervisor')?.closest('div');
    if (supWrap) supWrap.style.display = _isAdminGeral() ? '' : 'none';
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
      conselheiro: document.getElementById('mm-conselheiro').value || null,
      coordenador: document.getElementById('mm-coordenador').value || null,
      ativo:       document.getElementById('mm-ativo').checked,
    };
    // Supervisor só é enviado no payload se o usuário for Admin Geral
    if (_isAdminGeral()) {
      base.supervisor = document.getElementById('mm-supervisor').value || null;
    }
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
      ${_errEl('mst-err')}
      <div id="mst-membros-section" style="display:none;border-top:1px solid var(--bd1);padding-top:16px">
        <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Membros do Setor</div>
        <div style="display:flex;gap:8px;align-items:flex-end">
          <div style="flex:1">
            <label style="${_LB}">Adicionar Pessoa</label>
            <select id="mst-add-pessoa" style="${_INP}"><option value="">— Selecione —</option></select>
          </div>
          <button onclick="minMinAdicionarMembroSetor()"
            style="padding:9px 14px;border-radius:8px;border:none;background:var(--violet);color:#fff;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0">Adicionar</button>
        </div>
        <div id="mst-membros-err" style="color:var(--rose);font-size:12px;display:none;margin-top:4px"></div>
        <div id="mst-membros-list" style="margin-top:10px"></div>
      </div>`;

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
    const ms = document.getElementById('mst-membros-section');
    if (ms) ms.style.display = 'none';
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
    _showErr('mst-membros-err', '');

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

    const ms = document.getElementById('mst-membros-section');
    if (ms) ms.style.display = '';
    document.getElementById('mst-add-pessoa').innerHTML = _optionsPessoa('');

    modal.style.display = 'flex';
    await _carregarSetorMembros(id);
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

  function minMinMembroKebab(btn) {
    const id         = btn.dataset.id;
    const novoStatus = btn.dataset.novoStatus;
    const funcao     = btn.dataset.funcao;
    const ativo      = btn.dataset.ativo === 'true';

    document.querySelectorAll('.min-kebab-menu').forEach(m => {
      if (m !== btn._kebabMenu) m.remove();
    });
    if (btn._kebabMenu && document.contains(btn._kebabMenu)) {
      btn._kebabMenu.remove();
      btn._kebabMenu = null;
      return;
    }
    const menu = document.createElement('div');
    menu.className = 'min-kebab-menu';
    menu.style.cssText = 'position:absolute;right:0;top:100%;z-index:9999;background:var(--bg2);border:1px solid var(--bd2);border-radius:7px;box-shadow:0 4px 16px rgba(0,0,0,.15);min-width:150px;overflow:hidden;margin-top:2px';

    const btnEditar = document.createElement('button');
    btnEditar.textContent = 'Editar função';
    btnEditar.style.cssText = 'display:block;width:100%;text-align:left;padding:9px 14px;background:none;border:none;font-size:13px;color:var(--tx1);cursor:pointer';
    btnEditar.onclick = () => minMinEditarMembro(id, funcao);

    const btnToggle = document.createElement('button');
    btnToggle.textContent = ativo ? 'Inativar' : 'Reativar';
    btnToggle.style.cssText = 'display:block;width:100%;text-align:left;padding:9px 14px;background:none;border:none;font-size:13px;color:var(--tx1);cursor:pointer';
    btnToggle.onclick = () => minMinToggleMembroStatus(id, novoStatus);

    const btnRemover = document.createElement('button');
    btnRemover.textContent = 'Remover';
    btnRemover.style.cssText = 'display:block;width:100%;text-align:left;padding:9px 14px;background:none;border:none;font-size:13px;color:var(--rose);cursor:pointer';
    btnRemover.onclick = () => minMinRemoverMembro(id);

    menu.append(btnEditar, btnToggle, btnRemover);
    btn.parentElement.style.position = 'relative';
    btn.parentElement.appendChild(menu);
    btn._kebabMenu = menu;

    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!menu.contains(e.target) && e.target !== btn) {
          menu.remove();
          btn._kebabMenu = null;
          document.removeEventListener('click', handler);
        }
      });
    }, 10);
  }

  function minMinEditarMembro(id, funcaoAtual) {
    document.querySelectorAll('.min-kebab-menu').forEach(m => m.remove());
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center';
    modal.innerHTML = `
      <div style="background:var(--bg2);border-radius:10px;padding:24px;width:320px;box-shadow:0 8px 32px rgba(0,0,0,.2)">
        <p style="margin:0 0 14px;font-size:14px;font-weight:600;color:var(--tx1)">Editar função</p>
        <input id="min-edit-funcao" type="text"
          style="width:100%;padding:8px 10px;border:1px solid var(--bd2);border-radius:6px;font-size:13px;background:var(--bg1);color:var(--tx1);box-sizing:border-box"
          placeholder="Ex.: Líder, Tesoureiro, Membro...">
        <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
          <button onclick="this.closest('[style*=fixed]').remove()"
            class="tbt" style="font-size:12px;padding:5px 14px">Cancelar</button>
          <button onclick="minMinSalvarFuncao('${id}')"
            class="tbt" style="font-size:12px;padding:5px 14px;background:var(--accent);color:#fff;border-color:var(--accent)">Salvar</button>
        </div>
      </div>`;
    const inp = modal.querySelector('#min-edit-funcao');
    if (inp) inp.value = funcaoAtual || '';
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('min-edit-funcao')?.focus(), 50);
  }

  async function minMinSalvarFuncao(id) {
    const input = document.getElementById('min-edit-funcao');
    const funcao = input?.value?.trim();
    if (!funcao) { input?.focus(); return; }
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_membros?id=eq.${id}`, {
        method: 'PATCH', headers: _hdrJson(), body: JSON.stringify({ funcao }),
      });
      if (!r.ok) throw new Error(r.status);
      document.querySelector('[style*="fixed"][style*="10000"]')?.remove();
      await _carregarMembros(_ministerioAtual);
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    }
  }

  async function minMinAdicionarMembroSetor() {
    const pessoaId = document.getElementById('mst-add-pessoa').value;
    if (!pessoaId) { _showErr('mst-membros-err', 'Selecione uma pessoa.'); return; }
    _showErr('mst-membros-err', '');
    try {
      const payload = {
        setor_id:  _setorEditandoId,
        pessoa_id: pessoaId,
        criado_por: USUARIO_ATUAL?.auth_user_id || null,
      };
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_setor_membros`, {
        method: 'POST', headers: _hdrJson(), body: JSON.stringify(payload),
      });
      if (!r.ok) {
        if (r.status === 409) throw new Error('Esta pessoa já está vinculada a este setor.');
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.message || `HTTP ${r.status}`);
      }
      document.getElementById('mst-add-pessoa').value = '';
      await _carregarSetorMembros(_setorEditandoId);
      if (_ministerioAtual) _carregarSetores(_ministerioAtual);
    } catch (e) {
      console.error('minMinAdicionarMembroSetor:', e);
      _showErr('mst-membros-err', e.message);
      document.getElementById('mst-membros-err')?.scrollIntoView({ block: 'nearest' });
    }
  }

  async function minMinRemoverMembroSetor(id) {
    if (!confirm('Remover este membro do setor?')) return;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_setor_membros?id=eq.${id}`, {
        method: 'DELETE', headers: _hdr(),
      });
      if (!r.ok) throw new Error(r.status);
      await _carregarSetorMembros(_setorEditandoId);
      if (_ministerioAtual) _carregarSetores(_ministerioAtual);
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

  /* ══ COMUNICAÇÃO: SOLICITAÇÕES ══════════════════════════════ */
  async function _renderSolicitacoes() {
    const el = document.getElementById('min-min-sol-content');
    if (!el || !_ministerioAtual) return;
    el.innerHTML = '<div style="color:var(--tx3);font-size:13px;text-align:center;padding:32px 0">Carregando...</div>';
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/com_solicitacoes_arte?order=criado_em.desc&limit=50`,
        { headers: _hdr() }
      );
      const lista = r.ok ? await r.json() : [];
      if (!lista.length) {
        el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 0;gap:10px;color:var(--tx3)">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <div style="font-size:14px;font-weight:600;color:var(--tx2)">Nenhuma solicitação</div>
          <div style="font-size:12.5px">As solicitações de arte aparecerão aqui.</div>
        </div>`;
        return;
      }
      const _STATUS_COR = { pendente:'224,138,42', em_producao:'74,156,245', concluido:'58,170,92', cancelado:'224,90,90' };
      el.innerHTML = `<div style="display:flex;flex-direction:column;gap:0">
        ${lista.map(s => {
          const cor = _STATUS_COR[s.status] || '139,107,193';
          const dt  = s.criado_em ? new Date(s.criado_em).toLocaleDateString('pt-BR') : '';
          return `<div style="display:flex;align-items:center;gap:14px;padding:13px 0;border-bottom:1px solid var(--bd1)">
            <div style="flex:1;min-width:0">
              <div style="font-size:13.5px;font-weight:600;color:var(--tx1)">${escapeHtml(s.titulo || s.tipo || 'Solicitação')}</div>
              <div style="font-size:12px;color:var(--tx3);margin-top:2px">${escapeHtml(s.descricao || '')} ${dt}</div>
            </div>
            <span style="padding:4px 12px;border-radius:20px;background:rgba(${cor},.1);color:rgb(${cor});font-size:11.5px;font-weight:600;white-space:nowrap">${(s.status||'pendente').replace('_',' ')}</span>
          </div>`;
        }).join('')}
      </div>`;
    } catch (e) {
      el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:12px">Erro ao carregar solicitações.</div>';
    }
  }

  function _renderCampanhas() {
    const el = document.getElementById('min-min-camp-content');
    if (!el) return;
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 0;gap:10px;color:var(--tx3)">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
      <div style="font-size:14px;font-weight:600;color:var(--tx2)">Campanhas em breve</div>
      <div style="font-size:12.5px">Este módulo está sendo desenvolvido.</div>
    </div>`;
  }

  function _renderProducoes() {
    const el = document.getElementById('min-min-prod-content');
    if (!el) return;
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 0;gap:10px;color:var(--tx3)">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect width="15" height="14" x="1" y="5" rx="2"/></svg>
      <div style="font-size:14px;font-weight:600;color:var(--tx2)">Produções em breve</div>
      <div style="font-size:12.5px">Este módulo está sendo desenvolvido.</div>
    </div>`;
  }

  /* ══ SIDEBAR DINÂMICO ════════════════════════════════════════ */
  const _SB_ICONES = { MUSICA:'♪', JOVENS:'◈', INFANTIL:'◎', INTERCESSAO:'✦', EVANGELISMO:'✝', DIACONIA:'◇', COMUNICACAO:'◉', ACOLHIMENTO:'◌', OUTRO:'◆' };

  async function sbMinMinBuild() {
    const el = document.getElementById('sb-min-ministerios');
    if (!el) return;
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ministerios?select=id,nome,tipo&ativo=eq.true&order=nome.asc`,
        { headers: _hdr() }
      );
      if (!r.ok) return;
      const lista = await r.json();
      if (!lista.length) return;
      const _sbNome = n => n.replace(/^Minist[eé]rio\s+d[eao]\s+/i, '').replace(/^Minist[eé]rio\s+/i, '');
      el.innerHTML = '<div class="sdiv"></div>' + lista.map(m =>
        `<div class="si" data-mid="${m.id}" onclick="window._sbMinisterioId='${m.id}';go('min-min')">${_SB_ICONES[m.tipo]||'◆'} ${_sbNome(m.nome)}</div>`
      ).join('');
    } catch (e) { /* silencioso — sidebar não quebra */ }
  }

  /* ══ EXPORTS ═════════════════════════════════════════════════ */
  window.sbMinMinBuild            = sbMinMinBuild;
  window.minMinLoad               = minMinLoad;
  window.minMinAbrir              = minMinAbrir;
  window.minMinVoltarLista        = minMinVoltarLista;
  window.minMinTab                = minMinTab;
  window.minMinNovo               = minMinNovo;
  window.minMinEditar             = minMinEditar;
  window.minMinAdicionarMembro    = minMinAdicionarMembro;
  window.minMinToggleMembroStatus = minMinToggleMembroStatus;
  window.minMinRemoverMembro      = minMinRemoverMembro;
  window.minMinMembroKebab        = minMinMembroKebab;
  window.minMinEditarMembro       = minMinEditarMembro;
  window.minMinSalvarFuncao       = minMinSalvarFuncao;
  window.minMinNovoSetor          = minMinNovoSetor;
  window.minMinEditarSetor        = minMinEditarSetor;
  window.minMinToggleSetorStatus    = minMinToggleSetorStatus;
  window.minMinRemoverSetor         = minMinRemoverSetor;
  window.minMinAdicionarMembroSetor = minMinAdicionarMembroSetor;
  window.minMinRemoverMembroSetor   = minMinRemoverMembroSetor;
  // Chamados de dentro do HTML gerado dinamicamente
  window._mmSalvar         = _mmSalvar;
  window._mmbSalvar        = _mmbSalvar;
  window._mstSalvar        = _mstSalvar;
  window._admSalvarInfo    = _admSalvarInfo;
  window._admToggleRecurso = _admToggleRecurso;
  window.minMinNovaReuniao         = minMinNovaReuniao;
  window.minMinEditarReuniao       = minMinEditarReuniao;
  window.minMinToggleReuniaoStatus = minMinToggleReuniaoStatus;
  window.minMinRemoverReuniao      = minMinRemoverReuniao;
  window._reuToggle                = _reuToggle;
  window._reuSalvar                = _reuSalvar;
  window.minMinNovaProgramacao        = minMinNovaProgramacao;
  window.minMinEditarProgramacao      = minMinEditarProgramacao;
  window.minMinToggleProgStatus       = minMinToggleProgStatus;
  window.minMinRemoverProgramacao     = minMinRemoverProgramacao;
  window.minMinPublicarNaAgenda       = minMinPublicarNaAgenda;
  window._progPublicarClick           = _progPublicarClick;
  window._progToggle                  = _progToggle;
  window._progSalvar                  = _progSalvar;
  window.minMinNovaEscala             = minMinNovaEscala;
  window.minMinEditarEscala           = minMinEditarEscala;
  window.minMinRemoverEscala          = minMinRemoverEscala;
  window.minMinAdicionarEscalaPessoa  = minMinAdicionarEscalaPessoa;
  window.minMinRemoverEscalaPessoa    = minMinRemoverEscalaPessoa;
  window._escalToggle                 = _escalToggle;
  window._escalSalvar                 = _escalSalvar;
  window.minMinUploadDoc              = minMinUploadDoc;
  window.minMinRemoverDoc             = minMinRemoverDoc;
  window._docHandleFile               = _docHandleFile;
  window._renderLideranca             = _renderLideranca;
  window._carregarVisaoGeral          = _carregarVisaoGeral;
  window._waCopiarNumeros             = _waCopiarNumeros;
  window.minMinNovaMusica             = minMinNovaMusica;
  window.minMinEditarMusica           = minMinEditarMusica;
  window.minMinRemoverMusica          = minMinRemoverMusica;
  window._repSalvar                   = _repSalvar;
  window.minMinNovoProjeto            = minMinNovoProjeto;
  window.minMinEditarProjeto          = minMinEditarProjeto;
  window.minMinRemoverProjeto         = minMinRemoverProjeto;
  window._projSalvar                  = _projSalvar;
  window.minMinNovaTurma              = minMinNovaTurma;
  window.minMinEditarTurma            = minMinEditarTurma;
  window.minMinRemoverTurma           = minMinRemoverTurma;
  window._turmaSalvar                 = _turmaSalvar;

  if(typeof VIEW_AUTOLOAD!=='undefined'){
    VIEW_AUTOLOAD['min-min']={fn: minMinLoad};
    VIEW_AUTOLOAD['min-soc']={fn: minSocLoad};
  }

  /* ══ SOCIEDADES INTERNAS ════════════════════════════════════ */

  let _SOC_LIST    = null;
  let _socAtual    = null;
  let _socTabAtual = 'visao-geral';
  let _socRows     = [];

  async function _socGetList() {
    if (_SOC_LIST) return _SOC_LIST;
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/sociedades?ativo=eq.true&select=id,sigla,nome,orgao,ic,descricao,recursos&order=sigla.asc`,
        { headers: _hdr() }
      );
      if (r.ok) {
        _SOC_LIST = await r.json();
      } else {
        // Fallback se migration sociedades-recursos.sql ainda não foi executada
        const r2 = await fetch(
          `${SUPABASE_URL}/rest/v1/sociedades?ativo=eq.true&select=id,sigla,nome,orgao,ic&order=sigla.asc`,
          { headers: _hdr() }
        );
        _SOC_LIST = r2.ok ? await r2.json() : [];
      }
    } catch { _SOC_LIST = []; }
    return _SOC_LIST;
  }

  async function sbMinSocBuild() {
    const el = document.getElementById('sb-min-sociedades');
    if (!el) return;
    const socs = await _socGetList();
    el.innerHTML = '<div class="sdiv"></div>' + socs.map(s =>
      `<div class="si" data-soc="${s.sigla}" onclick="window._sbSocSigla='${s.sigla}';go('min-soc')">${s.ic} ${s.sigla}</div>`
    ).join('');
  }

  async function _socMostrarLista() {
    const lista   = document.getElementById('min-soc-painel-lista');
    const detalhe = document.getElementById('min-soc-painel-detalhe');
    const ttl     = document.getElementById('min-soc-hero-ttl');
    const dsc     = document.getElementById('min-soc-hero-dsc');
    const act     = document.getElementById('min-soc-hero-act');
    if (ttl) ttl.textContent = 'Sociedades Internas';
    if (dsc) dsc.textContent = 'UPH, SAF, UMP, UPA, UCP — grupos organizados da IPPenha';
    if (act) act.innerHTML = '';
    if (detalhe) { detalhe.style.display = 'none'; detalhe.innerHTML = ''; }
    if (!lista) return;
    lista.style.display = '';
    const socs = await _socGetList();
    lista.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
        ${socs.map(s => `
          <div class="card" style="cursor:pointer" onclick="minSocAbrir('${s.sigla}')">
            <div style="font-size:28px;margin-bottom:8px">${s.ic}</div>
            <div style="font-size:14px;font-weight:700;color:var(--tx1);margin-bottom:3px">${s.sigla}</div>
            <div style="font-size:11px;color:var(--tx3)">${s.nome}</div>
          </div>`).join('')}
      </div>`;
    document.querySelectorAll('#sb-min-sociedades .si').forEach(e => e.classList.remove('on'));
  }

  /* ── SVG helpers ────────────────────────────────────────── */
  const _socIcHome  = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;vertical-align:-1px"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
  const _socIcLider = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;vertical-align:-1px"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/><path d="m16 11 1.5 1.5L20 10"/></svg>`;
  const _socIcUsers = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;vertical-align:-1px"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  const _socIcBar   = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;vertical-align:-1px"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`;
  const _socIcReun  = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;vertical-align:-1px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`;
  const _socIcAdm   = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;vertical-align:-1px"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
  /* ── Abrir detalhe de uma sociedade ─────────────────────── */
  async function minSocAbrir(sigla) {
    const socs = await _socGetList();
    const soc  = socs.find(s => s.sigla === sigla);
    if (!soc) { _socMostrarLista(); return; }
    _socAtual    = soc;
    _socTabAtual = 'visao-geral';

    const lista   = document.getElementById('min-soc-painel-lista');
    const detalhe = document.getElementById('min-soc-painel-detalhe');
    const ttl     = document.getElementById('min-soc-hero-ttl');
    const dsc     = document.getElementById('min-soc-hero-dsc');
    const act     = document.getElementById('min-soc-hero-act');

    if (lista) lista.style.display = 'none';
    if (ttl)   ttl.textContent = `${soc.sigla} — ${soc.nome}`;
    if (dsc)   dsc.textContent = 'Sociedade Interna da IPPenha';
    if (act)   act.innerHTML   = `<button class="tbt" onclick="minSocVoltarLista()">← Todas as Sociedades</button>`;

    document.querySelectorAll('#sb-min-sociedades .si').forEach(el => {
      el.classList.toggle('on', el.dataset.soc === sigla);
    });

    if (!detalhe) return;
    detalhe.style.display = '';
    detalhe.innerHTML = `
      <div id="min-soc-detalhe-header" class="card" style="margin-bottom:16px">
        <div style="color:var(--tx3);font-size:13px;padding:12px 0">Carregando...</div>
      </div>
      <div style="display:flex;border-bottom:2px solid var(--bd1);margin-bottom:20px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;gap:2px">
        <button class="min-tab active" data-tab="visao-geral" onclick="minSocTab('visao-geral')">${_socIcHome}Visão Geral</button>
        <button class="min-tab" data-tab="lideranca"          onclick="minSocTab('lideranca')">${_socIcLider}Liderança</button>
        <button class="min-tab" data-tab="membros"            onclick="minSocTab('membros')">${_socIcUsers}Membros <span id="soc-membro-count" style="font-size:11px;font-weight:400"></span></button>
        <button class="min-tab" data-tab="reunioes"           onclick="minSocTab('reunioes')">${_socIcReun}Reuniões</button>
        <button class="min-tab" data-tab="relatorios"         onclick="minSocTab('relatorios')">${_socIcBar}Relatórios</button>
        <button class="min-tab" data-tab="adm"                onclick="minSocTab('adm')">${_socIcAdm}Configurações</button>
      </div>
      <div id="soc-tab-visao-geral"  class="min-tab-panel"><div id="soc-vg-content"><div style="color:var(--tx3);text-align:center;padding:32px">Carregando...</div></div></div>
      <div id="soc-tab-lideranca"    class="min-tab-panel" style="display:none"><div id="soc-lid-content"></div></div>
      <div id="soc-tab-membros"      class="min-tab-panel" style="display:none">
        <div class="card"><div class="ctit">Membros</div><div id="soc-membros-list"><div style="color:var(--tx3);padding:16px">Carregando...</div></div></div>
      </div>
      <div id="soc-tab-reunioes"     class="min-tab-panel" style="display:none"><div id="soc-reu-content"></div></div>
      <div id="soc-tab-relatorios"   class="min-tab-panel" style="display:none"><div id="soc-rel-content"></div></div>
      <div id="soc-tab-adm"          class="min-tab-panel" style="display:none"><div id="soc-adm-content"></div></div>`;

    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/nomeados?orgao_tipo=eq.sociedade&orgao=eq.${encodeURIComponent(soc.orgao)}&deleted_at=is.null&select=id,nome,cargo,tipo_nomeacao,funcao_lider,data_inicio&order=tipo_nomeacao.asc,cargo.asc`,
        { headers: _hdr() }
      );
      _socRows = r.ok ? await r.json() : [];
    } catch { _socRows = []; }

    _socRenderHeader();
    _socRenderVisaoGeral();
  }

  function _socRenderHeader() {
    const el = document.getElementById('min-soc-detalhe-header');
    if (!el || !_socAtual) return;
    const soc = _socAtual;

    const findByRole = (...pats) => _socRows.find(r =>
      r.tipo_nomeacao === 'lider' &&
      pats.some(p => (r.cargo || r.funcao_lider || '').toLowerCase().includes(p))
    );
    const presidente  = findByRole('presidente');
    const conselheiro = findByRole('conselh');
    const secretario  = findByRole('secretar', 'tesour');

    const _card = (label, pessoa, cor) => {
      const nome = pessoa ? _hEsc(pessoa.nome) : null;
      return `<div style="display:flex;align-items:center;gap:9px;padding:10px 14px;background:var(--bg2);border-radius:8px;min-width:140px;flex:1">
        <div style="width:32px;height:32px;border-radius:50%;background:rgba(${cor},.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(${cor})" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div style="min-width:0">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:2px">${label}</div>
          <div style="font-size:12.5px;font-weight:600;color:${nome ? 'var(--tx1)' : 'var(--tx3)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nome || 'Não informado'}</div>
        </div>
      </div>`;
    };

    el.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div style="display:flex;align-items:flex-start;gap:14px;flex:1;min-width:260px">
          <div style="width:52px;height:52px;border-radius:12px;background:rgba(139,107,193,.15);border:1px solid rgba(139,107,193,.25);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">${soc.ic || '🏛'}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
              <span style="font-size:18px;font-weight:800;color:var(--tx1)">${_hEsc(soc.nome)}</span>
              ${soc.ativo === false
                ? '<span class="pill pa" style="font-size:10px">Inativa</span>'
                : '<span class="pill pg" style="font-size:10px">Ativa</span>'}
            </div>
            ${soc.descricao ? `<div style="font-size:12.5px;color:var(--tx2);line-height:1.6;max-width:480px">${_hEsc(soc.descricao)}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:stretch">
          ${_card('Presidente',  presidente,  '201,168,76')}
          ${_card('Conselheiro', conselheiro, '74,156,245')}
          ${_card('Secretário',  secretario,  '58,170,92')}
        </div>
      </div>`;
  }

  /* ── Aba: Visão Geral ───────────────────────────────────── */
  function _socRenderVisaoGeral() {
    const el  = document.getElementById('soc-vg-content');
    if (!el || !_socAtual) return;
    const lideres = _socRows.filter(r => r.tipo_nomeacao === 'lider');
    const membros = _socRows.filter(r => r.tipo_nomeacao !== 'lider');
    const cnt     = document.getElementById('soc-membro-count');
    if (cnt) cnt.textContent = membros.length ? `(${membros.length})` : '';

    if (!_socRows.length) {
      el.innerHTML = `<div class="card"><div style="color:var(--tx3);text-align:center;padding:32px">Nenhum registro encontrado para ${_hEsc(_socAtual.orgao)}.</div></div>`;
      return;
    }

    const _kpi = (num, label, sub) => `
      <div class="card" style="padding:18px 16px">
        <div style="font-size:30px;font-weight:800;color:var(--tx1);line-height:1">${num}</div>
        <div style="font-size:13px;font-weight:600;color:var(--tx1);margin-top:5px">${label}</div>
        <div style="font-size:11.5px;color:var(--tx3);margin-top:2px">${sub}</div>
      </div>`;

    const _preview = (titulo, items, tabKey) => `
      <div class="card">
        <div class="ctit">${titulo} <span class="cact" onclick="minSocTab('${tabKey}')">Ver todos</span></div>
        ${items.length ? `
          <div style="display:flex;flex-direction:column;gap:0">
            ${items.slice(0, 5).map(r => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--bd1)">
                <div style="font-size:12.5px;font-weight:500;color:var(--tx1)">${_hEsc(r.nome)}</div>
                <div style="font-size:11px;color:var(--tx3)">${_hEsc(r.cargo || '—')}</div>
              </div>`).join('')}
            ${items.length > 5 ? `<div style="font-size:11px;color:var(--tx3);padding:7px 0;text-align:center">+${items.length - 5} mais</div>` : ''}
          </div>
        ` : `<div style="color:var(--tx3);font-size:12px;padding:8px 0">Nenhum registro.</div>`}
      </div>`;

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:20px">
        ${_kpi(lideres.length, 'Líderes',   'Diretoria e supervisão')}
        ${_kpi(membros.length, 'Membros',   'Participantes ativos')}
        ${_kpi(_socRows.length, 'Total',    'Pessoas nomeadas')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        ${_preview('Diretoria / Líderes', lideres, 'lideranca')}
        ${_preview('Membros',             membros, 'membros')}
      </div>`;
  }

  /* ── Aba: Liderança ─────────────────────────────────────── */
  function _socRenderLideranca() {
    const el = document.getElementById('soc-lid-content');
    if (!el) return;
    const lideres = _socRows.filter(r => r.tipo_nomeacao === 'lider');
    if (!lideres.length) {
      el.innerHTML = `<div class="card"><div style="color:var(--tx3);text-align:center;padding:20px">Nenhuma liderança nomeada.</div></div>`;
      return;
    }

    const FUNC_LABEL = { supervisor:'Supervisor', coordenador:'Coordenador', lider_area:'Líder de Área', conselheiro:'Conselheiro', tesoureiro:'Tesoureiro' };
    const FUNC_RGB   = { supervisor:'58,170,92', coordenador:'201,168,76', lider_area:'139,107,193', conselheiro:'74,156,245', tesoureiro:'224,138,42' };

    const grupos = {};
    lideres.forEach(r => {
      const g = r.funcao_lider || r.cargo || 'Outros';
      (grupos[g] = grupos[g] || []).push(r);
    });

    el.innerHTML = `
      <div class="card">
        <div class="ctit">Liderança — ${_hEsc(_socAtual?.sigla || '')}</div>
        ${Object.entries(grupos).map(([func, pessoas]) => `
          <div style="margin-bottom:18px">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:8px">${FUNC_LABEL[func] || func}</div>
            ${pessoas.map(r => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg2);border-radius:8px;margin-bottom:5px">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:30px;height:30px;border-radius:50%;background:rgba(${FUNC_RGB[func]||'139,107,193'},.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgb(${FUNC_RGB[func]||'139,107,193'})" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div>
                    <div style="font-size:13px;font-weight:600;color:var(--tx1)">${_hEsc(r.nome)}</div>
                    ${r.cargo && r.cargo !== func ? `<div style="font-size:11px;color:var(--tx3)">${_hEsc(r.cargo)}</div>` : ''}
                  </div>
                </div>
                ${r.data_inicio ? `<div style="font-size:11px;color:var(--tx3)">desde ${new Date(r.data_inicio+'T12:00:00').toLocaleDateString('pt-BR')}</div>` : ''}
              </div>`).join('')}
          </div>`).join('')}
      </div>`;
  }

  /* ── Aba: Membros ───────────────────────────────────────── */
  function _socRenderMembros() {
    const el = document.getElementById('soc-membros-list');
    if (!el) return;
    const membros = _socRows.filter(r => r.tipo_nomeacao !== 'lider');
    if (!membros.length) {
      el.innerHTML = `<div style="color:var(--tx3);text-align:center;padding:20px">Nenhum membro registrado.</div>`;
      return;
    }
    el.innerHTML = `
      <table class="tbl">
        <thead><tr>
          <th>Nome</th><th>Cargo / Função</th><th>Desde</th>
        </tr></thead>
        <tbody>
          ${membros.map(r => `
            <tr>
              <td style="font-size:12.5px;font-weight:500;color:var(--tx1)">${_hEsc(r.nome)}</td>
              <td style="font-size:11.5px;color:var(--tx3)">${_hEsc(r.cargo || '—')}</td>
              <td style="font-size:11.5px;color:var(--tx3)">${r.data_inicio ? new Date(r.data_inicio+'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  }

  /* ── Aba: Relatórios ────────────────────────────────────── */
  function _socRenderRelatorios() {
    const el = document.getElementById('soc-rel-content');
    if (!el) return;
    const lideres = _socRows.filter(r => r.tipo_nomeacao === 'lider');
    const membros = _socRows.filter(r => r.tipo_nomeacao !== 'lider');
    const byCargo = {};
    _socRows.forEach(r => { const c = r.cargo || 'Sem cargo'; byCargo[c] = (byCargo[c] || 0) + 1; });

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="card">
          <div class="ctit">Resumo</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <tbody>
              <tr style="border-bottom:1px solid var(--bd1)">
                <td style="padding:8px 0;color:var(--tx2)">Total de pessoas</td>
                <td style="padding:8px 0;font-weight:700;color:var(--tx1);text-align:right">${_socRows.length}</td>
              </tr>
              <tr style="border-bottom:1px solid var(--bd1)">
                <td style="padding:8px 0;color:var(--tx2)">Líderes / Diretoria</td>
                <td style="padding:8px 0;font-weight:700;color:var(--tx1);text-align:right">${lideres.length}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:var(--tx2)">Membros</td>
                <td style="padding:8px 0;font-weight:700;color:var(--tx1);text-align:right">${membros.length}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card">
          <div class="ctit">Por Cargo / Função</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <tbody>
              ${Object.entries(byCargo).sort((a,b) => b[1]-a[1]).map(([cargo, qtd]) => `
                <tr style="border-bottom:1px solid var(--bd1)">
                  <td style="padding:7px 0;color:var(--tx2)">${_hEsc(cargo)}</td>
                  <td style="padding:7px 0;font-weight:700;color:var(--tx1);text-align:right">${qtd}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  /* ── Aba: Reuniões ──────────────────────────────────────── */
  function _socRenderReunioes() {
    const el = document.getElementById('soc-reu-content');
    if (!el || !_socAtual) return;
    el.innerHTML = `
      <div class="card" style="margin-bottom:14px">
        <div class="ctit">Reuniões da Sociedade</div>
        <div style="color:var(--tx3);font-size:12.5px;padding:20px 0;text-align:center">
          Nenhuma reunião registrada para ${_hEsc(_socAtual.sigla)}.<br>
          <span style="font-size:11px;color:var(--tx4)">O registro de atas e pautas de reuniões estará disponível em breve.</span>
        </div>
      </div>`;
  }

  /* ── Aba: Administração ─────────────────────────────────── */
  async function _socRenderAdm() {
    const el = document.getElementById('soc-adm-content');
    if (!el || !_socAtual) return;
    const soc    = _socAtual;
    const rec    = soc.recursos || {};
    const lideres = _socRows.filter(r => r.tipo_nomeacao === 'lider');

    const SOC_MODULOS = [
      { key: 'reunioes',   label: 'Reuniões',   desc: 'Atas e pautas de reuniões internas' },
      { key: 'documentos', label: 'Documentos',  desc: 'Regulamentos e manuais' },
      { key: 'whatsapp',   label: 'WhatsApp',    desc: 'Listas de transmissão' },
    ];

    const _tog = (key, on) =>
      `<button id="soc-tog-${key}" onclick="window._socToggleRecurso('${key}',${!on})"
         style="padding:5px 14px;border-radius:20px;border:1px solid ${on ? 'transparent' : 'var(--bd2)'};font-size:11.5px;font-weight:600;cursor:pointer;
           background:${on ? 'rgba(191,90,242,0.14)' : 'transparent'};color:${on ? 'var(--violet)' : 'var(--tx3)'};transition:all .15s">
         ${on ? 'Ativado' : 'Desativado'}
       </button>`;

    const liderHtml = lideres.length
      ? `<div style="display:flex;flex-direction:column;gap:5px">
          ${lideres.map(r => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:var(--bg-hover);border-radius:8px">
              <div style="font-size:13px;font-weight:500;color:var(--tx1)">${_hEsc(r.nome)}</div>
              <div style="font-size:11.5px;color:var(--tx3)">${_hEsc(r.cargo || r.funcao_lider || '—')}</div>
            </div>`).join('')}
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:10px">
          <button class="tbt sec" style="font-size:12px" onclick="minSocTab('lideranca')">Gerenciar liderança →</button>
        </div>`
      : `<div style="display:flex;align-items:center;gap:12px;padding:4px 0">
          <span style="font-size:12.5px;color:var(--tx3)">Nenhuma liderança nomeada.</span>
          <button class="tbt sec" style="font-size:12px" onclick="minSocTab('lideranca')">Adicionar →</button>
        </div>`;

    el.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div class="ctit">Informações</div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div>
            <label style="${_LB}">Nome <span style="color:var(--rose)">*</span></label>
            <input type="text" id="soc-adm-nome" value="${_hEsc(soc.nome || '')}" style="${_INP}">
          </div>
          <div>
            <label style="${_LB}">Descrição</label>
            <textarea id="soc-adm-desc" rows="3" style="${_INP};resize:vertical;height:auto;font-family:inherit">${_hEsc(soc.descricao || '')}</textarea>
          </div>
          <div>
            <label style="${_LB}">Liderança</label>
            ${liderHtml}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="soc-adm-ativo" ${soc.ativo !== false ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer">
            <label for="soc-adm-ativo" style="font-size:13px;color:var(--tx2);cursor:pointer">Sociedade ativa</label>
          </div>
          <div id="soc-adm-err" style="color:var(--rose);font-size:12px;display:none"></div>
          <div style="display:flex;justify-content:flex-end">
            <button id="soc-adm-btn" onclick="window._socSalvarAdm()"
              style="padding:9px 24px;border-radius:8px;border:none;background:var(--violet);color:#fff;font-size:13px;font-weight:600;cursor:pointer">
              Salvar
            </button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="ctit">Módulos Opcionais</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${SOC_MODULOS.map(mod => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg-hover);border-radius:8px">
              <div>
                <div style="font-size:13px;font-weight:500;color:var(--tx1)">${mod.label}</div>
                <div style="font-size:11px;color:var(--tx3);margin-top:2px">${mod.desc}</div>
              </div>
              ${_tog(mod.key, !!rec[mod.key])}
            </div>`).join('')}
        </div>
      </div>`;
  }

  async function _socSalvarAdm() {
    if (!_socAtual) return;
    const nome      = (document.getElementById('soc-adm-nome')?.value || '').trim();
    const descricao = (document.getElementById('soc-adm-desc')?.value || '').trim() || null;
    const ativo     = document.getElementById('soc-adm-ativo')?.checked ?? true;
    const errEl = document.getElementById('soc-adm-err');
    const btn   = document.getElementById('soc-adm-btn');
    if (errEl) errEl.style.display = 'none';
    if (!nome) {
      if (errEl) { errEl.textContent = 'Nome é obrigatório.'; errEl.style.display = ''; }
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
    const payload = { nome, ativo };
    if ('descricao' in (_socAtual || {})) payload.descricao = descricao;
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/sociedades?id=eq.${_socAtual.id}`,
        { method: 'PATCH', headers: _hdrJson(), body: JSON.stringify(payload) }
      );
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message || 'Erro ao salvar.');
      Object.assign(_socAtual, { nome, ativo, descricao });
      _SOC_LIST = null;
      const ttl = document.getElementById('min-soc-hero-ttl');
      if (ttl) ttl.textContent = `${_socAtual.sigla} — ${nome}`;
      _socRenderHeader();
      if (btn) { btn.textContent = 'Salvo ✓'; }
      setTimeout(() => { const b = document.getElementById('soc-adm-btn'); if (b) { b.textContent = 'Salvar'; b.disabled = false; } }, 2000);
    } catch (e) {
      if (errEl) { errEl.textContent = e.message; errEl.style.display = ''; }
      if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
    }
  }
  window._socSalvarAdm = _socSalvarAdm;

  async function _socToggleRecurso(key, value) {
    if (!_socAtual) return;
    if (!_socAtual.recursos) _socAtual.recursos = {};
    _socAtual.recursos = Object.assign({}, _socAtual.recursos, { [key]: value });
    const btn = document.getElementById(`soc-tog-${key}`);
    if (btn) {
      btn.textContent       = value ? 'Ativado' : 'Desativado';
      btn.style.background  = value ? 'rgba(191,90,242,0.14)' : 'transparent';
      btn.style.color       = value ? 'var(--violet)' : 'var(--tx3)';
      btn.style.borderColor = value ? 'transparent' : 'var(--bd2)';
      btn.setAttribute('onclick', `window._socToggleRecurso('${key}',${!value})`);
    }
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/sociedades?id=eq.${_socAtual.id}`, {
        method: 'PATCH', headers: _hdrJson(), body: JSON.stringify({ recursos: _socAtual.recursos }),
      });
      if (!r.ok) throw new Error(r.status);
    } catch (e) {
      alert('Erro ao salvar configuração: ' + e.message);
      _socAtual.recursos[key] = !value;
      _socRenderAdm();
    }
  }
  window._socToggleRecurso = _socToggleRecurso;

  /* ── Troca de aba (scoped ao painel de detalhe) ─────────── */
  function minSocTab(tab) {
    const detalhe = document.getElementById('min-soc-painel-detalhe');
    if (!detalhe) return;
    detalhe.querySelectorAll('.min-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    detalhe.querySelectorAll('.min-tab-panel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById('soc-tab-' + tab);
    if (panel) panel.style.display = '';
    _socTabAtual = tab;
    if (tab === 'lideranca')  _socRenderLideranca();
    if (tab === 'membros')    _socRenderMembros();
    if (tab === 'reunioes')   _socRenderReunioes();
    if (tab === 'relatorios') _socRenderRelatorios();
    if (tab === 'adm')        _socRenderAdm();
  }

  function minSocLoad() {
    const sigla = window._sbSocSigla || null;
    window._sbSocSigla = null;
    if (sigla) minSocAbrir(sigla);
    else _socMostrarLista();
  }

  function minSocVoltarLista() {
    _socAtual = null;
    _socRows  = [];
    _socMostrarLista();
  }

  function _hEsc(v) {
    return String(v ?? '').replace(/[&<>"']/g, s =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s]));
  }

  window.sbMinSocBuild     = sbMinSocBuild;
  window.minSocLoad        = minSocLoad;
  window.minSocAbrir       = minSocAbrir;
  window.minSocTab         = minSocTab;
  window.minSocVoltarLista = minSocVoltarLista;

})();
