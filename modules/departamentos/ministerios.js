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
  let _tabAtual         = 'dashboard';
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

    // Resetar para aba dashboard
    minMinTab('dashboard');

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

      if (admBtn) admBtn.style.display = _podeEditarMinisterio() ? '' : 'none';

      const reunBtn  = document.getElementById('min-min-tab-btn-reu');
      if (reunBtn)  reunBtn.style.display  = _recursosAtual.reunioes     ? '' : 'none';
      const progBtn  = document.getElementById('min-min-tab-btn-prog');
      if (progBtn)  progBtn.style.display  = _recursosAtual.programacoes ? '' : 'none';
      const escalBtn = document.getElementById('min-min-tab-btn-escal');
      if (escalBtn) escalBtn.style.display = _recursosAtual.escalas      ? '' : 'none';
      const docBtn   = document.getElementById('min-min-tab-btn-doc');
      if (docBtn)   docBtn.style.display   = _recursosAtual.documentos   ? '' : 'none';

      const btnAdd = document.getElementById('min-min-btn-add-membro');
      if (btnAdd) btnAdd.style.display = _podeEditar() ? '' : 'none';

      // Atualiza hero title
      const heroTtl = document.querySelector('#v-min-min .hero-ttl');
      if (heroTtl) heroTtl.textContent = m.nome;

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
    if (tab === 'reunioes'     && _ministerioAtual) _carregarReunioes(_ministerioAtual);
    if (tab === 'programacoes' && _ministerioAtual) _carregarProgramacoes(_ministerioAtual);
    if (tab === 'escalas'      && _ministerioAtual) _carregarEscalas(_ministerioAtual);
    if (tab === 'documentos'   && _ministerioAtual) _carregarDocumentos(_ministerioAtual);
    if (tab === 'relatorios'   && _ministerioAtual) _renderRelatorios();
  }

  /* ══ HEADER COMPACTO ═════════════════════════════════════════ */
  function _renderHeader(m, nomes) {
    const header = document.getElementById('min-min-detalhe-header');
    if (!header) return;
    const ICONES = { MUSICA:'🎵', JOVENS:'🔥', INFANTIL:'👶', INTERCESSAO:'🙏', EVANGELISMO:'✝️', DIACONIA:'🤝', COMUNICACAO:'📢', ACOLHIMENTO:'🤗', OUTRO:'⭐' };
    const ic = ICONES[m.tipo] || '⭐';
    const tipoLabel = m.tipo ? m.tipo.charAt(0) + m.tipo.slice(1).toLowerCase() : '';
    const badge = _isAdminGeral()
      ? '<span class="pill pb" style="font-size:10px">Admin Geral</span>'
      : _isSupervisorDoMinisterio()
        ? '<span class="pill pv" style="font-size:10px">Supervisor</span>'
        : '';
    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;border-radius:10px;background:var(--violetbg);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${ic}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px">
            <span style="font-size:16px;font-weight:800;color:var(--tx1)">${escapeHtml(m.nome)}</span>
            ${m.ativo === false ? '<span class="pill pa" style="font-size:10px">Inativo</span>' : ''}
            ${badge}
          </div>
          ${tipoLabel ? `<div style="font-size:11px;color:var(--tx3)">${tipoLabel}</div>` : ''}
        </div>
      </div>`;
  }

  /* ══ DASHBOARD ═══════════════════════════════════════════════ */
  function _renderDashboard(m, nomes) {
    const el = document.getElementById('min-min-dash-content');
    if (!el) return;
    const _linha = (label, pessoaId) => pessoaId && nomes[pessoaId]
      ? `<div style="display:flex;gap:8px;align-items:baseline;margin-bottom:6px">
           <span style="font-size:11px;color:var(--tx3);min-width:110px">${label}</span>
           <span style="font-size:13px;font-weight:600;color:var(--tx1)">${escapeHtml(nomes[pessoaId])}</span>
         </div>`
      : '';
    const temLideranca = m.supervisor || m.conselheiro || m.coordenador;
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:16px">
        <div class="card" style="text-align:center;padding:16px 12px;cursor:pointer" onclick="minMinTab('membros')">
          <div id="min-min-stat-membros" style="font-size:28px;font-weight:700;color:var(--violet)">—</div>
          <div style="font-size:11px;color:var(--tx3);margin-top:4px">Membros ativos</div>
        </div>
        <div class="card" style="text-align:center;padding:16px 12px;cursor:pointer" onclick="minMinTab('setores')">
          <div id="min-min-stat-setores" style="font-size:28px;font-weight:700;color:var(--violet)">—</div>
          <div style="font-size:11px;color:var(--tx3);margin-top:4px">Setores</div>
        </div>
      </div>
      ${m.descricao ? `<div class="card" style="margin-bottom:12px">
        <div style="font-size:13px;color:var(--tx2);line-height:1.65">${escapeHtml(m.descricao)}</div>
      </div>` : ''}
      ${temLideranca ? `<div class="card">
        <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Liderança</div>
        ${_linha('Supervisor', m.supervisor)}
        ${_linha('Conselheiro', m.conselheiro)}
        ${_linha('Coordenador', m.coordenador)}
      </div>` : ''}`;
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
    const actBtns = podeAct ? `
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button onclick="minMinEditarProgramacao('${p.id}')" class="tbt" style="font-size:11px;padding:4px 10px">Editar</button>
        ${p.status === 'agendado'
          ? `<button onclick="minMinToggleProgStatus('${p.id}','realizado')" class="tbt" style="font-size:11px;padding:4px 10px;color:var(--gr);border-color:rgba(48,209,88,0.4)">✓ Marcar Realizado</button>`
          : p.status === 'realizado'
            ? `<button onclick="minMinToggleProgStatus('${p.id}','agendado')" class="tbt" style="font-size:11px;padding:4px 10px">Reabrir</button>`
            : ''
        }
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
    const footer = `<button id="mpg-btn" onclick="_progSalvar()"
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
    modal.style.display = 'flex';
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
    const heroTtl = document.querySelector('#v-min-min .hero-ttl');
    if (heroTtl) heroTtl.textContent = 'Ministérios';
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
        `<div class="si" onclick="window._sbMinisterioId='${m.id}';go('min-min')">${_SB_ICONES[m.tipo]||'◆'} ${_sbNome(m.nome)}</div>`
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

})();
