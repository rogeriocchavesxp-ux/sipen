/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Congregações
   mobile/congregacoes.js · v2.2.0

   Permissões:
   - Supervisor / Coordenador / Conselheiro → edita tudo
   - Tesoureiro → edita só financeiro
   - Demais → somente leitura (info básica das outras congregações)
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('congregacoes-mob', renderLista);
  mobRegisterPage('cong-detalhe',     renderDetalhe);

  /* ── Estado de permissão ───────────────────────────── */
  let _perm = null; // null = não carregado

  async function _carregarPermissao() {
    if (_perm !== null) return _perm;
    _perm = { congId: null, congNome: null, papel: null, podeEditar: false, podeFin: false };

    const uid = window.MOB_USER?.id;
    if (!uid) return _perm;

    try {
      const h = apiHeaders();

      // 1. Pessoa
      const pRows = await fetch(
        `${apiBaseUrl()}/rest/v1/pessoas?auth_user_id=eq.${encodeURIComponent(uid)}&select=id&limit=1`,
        { headers: h }
      ).then(r => r.ok ? r.json() : []);
      if (!pRows?.[0]?.id) return _perm;
      const pessoaId = pRows[0].id;

      // 2. Papel em uma congregação
      const nRows = await fetch(
        `${apiBaseUrl()}/rest/v1/nomeados?orgao_tipo=eq.congregacao&pessoa_id=eq.${encodeURIComponent(pessoaId)}&status=eq.ativo&deleted_at=is.null&select=orgao,funcao_lider,cargo&limit=1`,
        { headers: h }
      ).then(r => r.ok ? r.json() : []);
      if (!nRows?.[0]) return _perm;

      const n       = nRows[0];
      const funcao  = (n.funcao_lider || n.cargo || '').toLowerCase();
      const isSup   = /supervisor|coordenador|conselheiro|pastor/.test(funcao);
      const isTes   = /tesourei/.test(funcao);

      _perm.papel      = funcao;
      _perm.podeEditar = isSup;
      _perm.podeFin    = isSup || isTes;

      // 3. ID da congregação pelo nome (estrutura existente usa orgao=nome)
      if (n.orgao) {
        const cRows = await fetch(
          `${apiBaseUrl()}/rest/v1/congregacoes?nome=ilike.${encodeURIComponent(n.orgao)}&deleted_at=is.null&select=id,nome&limit=1`,
          { headers: h }
        ).then(r => r.ok ? r.json() : []);
        if (cRows?.[0]) {
          _perm.congId   = cRows[0].id;
          _perm.congNome = cRows[0].nome;
        }
      }
    } catch (_) {}

    return _perm;
  }

  /* ── Lista ─────────────────────────────────────────── */
  let _cache = null;

  async function renderLista(el) {
    _cache = null;
    el.innerHTML = `
      <div style="padding-bottom:80px">
        <div class="mob-search-wrap">
          <input class="mob-search" type="search" placeholder="Buscar congregações…"
                 oninput="_congBusca(this.value)"
                 onsearch="_congBusca(this.value)">
        </div>
        <div id="cong-lista" style="padding-bottom:24px">
          <div class="mob-loading-state">Carregando…</div>
        </div>
      </div>
    `;

    await Promise.all([_carregarPermissao(), _carregar()]);

    if (_perm?.podeEditar) {
      const fab = document.createElement('button');
      fab.onclick = _congAbrirNovaSheet;
      fab.style.cssText = 'position:fixed;bottom:calc(var(--tab-h) + var(--safe-bottom) + 16px);right:18px;' +
        'z-index:200;width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;' +
        'background:var(--violet,#8b6fd4);color:#fff;font-size:22px;font-weight:300;' +
        'display:flex;align-items:center;justify-content:center;' +
        'box-shadow:0 4px 16px rgba(139,111,212,.45)';
      fab.textContent = '+';
      el.appendChild(fab);
    }
  }

  async function _carregar() {
    const el = document.getElementById('cong-lista');
    if (!el) return;
    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/congregacoes?deleted_at=is.null&select=id,nome,localizacao,endereco,status,cor,icon,membros_ativos,supervisao,coordenacao,tesoureiro,pastor_responsavel,cultos_por_semana&order=nome.asc`,
        { headers: apiHeaders() }
      );
      _cache = res.ok ? await res.json() : [];
      _renderLista(el, _cache);
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar congregações.</div></div>`;
    }
  }

  function _renderLista(el, data) {
    if (!data.length) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⛪</div><div class="mob-empty-text">Nenhuma congregação encontrada.</div></div>`;
      return;
    }

    const perm    = _perm || {};
    const minhaCong = perm.congId ? data.find(c => String(c.id) === String(perm.congId)) : null;
    const demais    = data.filter(c => !minhaCong || String(c.id) !== String(perm.congId));
    const ativas    = demais.filter(c => c.status === 'ativa');
    const inativas  = demais.filter(c => c.status !== 'ativa');

    let html = '';

    if (minhaCong) {
      html += `
        <div class="mob-section-title" style="padding-top:16px">Minha Congregação</div>
        <div class="mob-card-list">${_rowMinha(minhaCong, perm)}</div>
      `;
    }

    if (ativas.length) {
      html += `
        <div class="mob-section-title" style="padding-top:16px">Outras Congregações (${ativas.length})</div>
        <div class="mob-card-list">${ativas.map(_rowBasico).join('')}</div>
      `;
    }
    if (inativas.length) {
      html += `
        <div class="mob-section-title" style="padding-top:16px">Inativas</div>
        <div class="mob-card-list">${inativas.map(_rowBasico).join('')}</div>
      `;
    }

    el.innerHTML = html;
  }

  function _rowMinha(c, perm) {
    const cor  = c.cor  || '#30d158';
    const icon = c.icon || '⛪';
    const lider = c.supervisao || c.coordenacao || c.pastor_responsavel || '';
    return `
      <div class="mob-list-item" onclick="mobGo('cong-detalhe',{id:'${_esc(String(c.id))}',title:'${_esc(c.nome)}'})">
        <div class="mob-list-ico" style="background:${cor}22;color:${cor};font-size:20px;border-radius:12px">${_esc(icon)}</div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(c.nome)}</div>
          <div class="mob-list-sub">${lider ? _esc(lider.split(' ').slice(0,3).join(' ')) : ''}${c.localizacao ? (lider ? ' · ' : '') + _esc(c.localizacao) : ''}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
          <div style="font-size:14px;font-weight:700;color:var(--tx1)">${c.membros_ativos || 0}</div>
          <div style="font-size:10px;color:var(--tx3)">membros</div>
          ${perm.podeEditar || perm.podeFin ? `<span style="font-size:10px;color:var(--gr);font-weight:600">Editar →</span>` : ''}
        </div>
      </div>
    `;
  }

  function _rowBasico(c) {
    const cor  = c.cor  || '#30d158';
    const icon = c.icon || '⛪';
    const lider = c.supervisao || c.coordenacao || c.pastor_responsavel || '';
    return `
      <div class="mob-list-item" onclick="mobGo('cong-detalhe',{id:'${_esc(String(c.id))}',title:'${_esc(c.nome)}'})">
        <div class="mob-list-ico" style="background:${cor}22;color:${cor};font-size:20px;border-radius:12px;opacity:.8">${_esc(icon)}</div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(c.nome)}</div>
          <div class="mob-list-sub">${lider ? _esc(lider.split(' ').slice(0,2).join(' ')) : ''}${c.localizacao ? (lider ? ' · ' : '') + _esc(c.localizacao) : ''}</div>
        </div>
        <div class="mob-list-chev">›</div>
      </div>
    `;
  }

  window._congBusca = function (val) {
    const el = document.getElementById('cong-lista');
    if (!el || !_cache) return;
    const q = val.trim().toLowerCase();
    const r = q ? _cache.filter(c =>
      (c.nome        || '').toLowerCase().includes(q) ||
      (c.localizacao || '').toLowerCase().includes(q) ||
      (c.supervisao  || '').toLowerCase().includes(q)
    ) : _cache;
    _renderLista(el, r);
  };

  /* ── Detalhe ───────────────────────────────────────── */
  async function renderDetalhe(el, params) {
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;
    try {
      const perm = await _carregarPermissao();
      const ehMinha = perm.congId && String(perm.congId) === String(params.id);

      const [rCong, rCultos] = await Promise.all([
        fetch(
          `${apiBaseUrl()}/rest/v1/congregacoes?id=eq.${encodeURIComponent(params.id)}&deleted_at=is.null&select=*&limit=1`,
          { headers: apiHeaders() }
        ),
        fetch(
          `${apiBaseUrl()}/rest/v1/congregacao_cultos?cong_id=eq.${encodeURIComponent(params.id)}&order=data.desc&limit=6`,
          { headers: apiHeaders() }
        ),
      ]);

      const [c]    = rCong.ok   ? await rCong.json()   : [];
      const cultos = rCultos.ok ? await rCultos.json() : [];
      if (!c) throw new Error('não encontrada');
      _cacheDetalhe = c;

      const cor  = c.cor  || '#30d158';
      const icon = c.icon || '⛪';

      // Liderança de campos diretos + JSONB lideres
      const le = (c.lideres && typeof c.lideres === 'object' && !Array.isArray(c.lideres)) ? c.lideres : {};
      const lidRows = [
        ['Supervisor',  c.supervisao  || le.supervisao],
        ['Conselheiro', c.conselheiro || le.conselheiro],
        ['Coordenação', c.coordenacao || le.coordenacao],
        ['Tesoureiro',  c.tesoureiro  || le.tesoureiro],
        ['Pastor',      c.pastor_responsavel],
      ].filter(([, v]) => v);

      if (ehMinha) {
        _renderDetalheMinha(el, c, cultos, lidRows, cor, icon, perm);
      } else {
        _renderDetalheBasico(el, c, lidRows, cor, icon);
      }
    } catch (e) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Congregação não encontrada.</div></div>`;
    }
  }

  /* ── Detalhe COMPLETO (minha congregação) ──────────── */
  function _renderDetalheMinha(el, c, cultos, lidRows, cor, icon, perm) {
    const total_cultos = cultos.reduce((s, cu) => {
      const tot = cu.participantes || ((cu.adultos || 0) + (cu.criancas || 0));
      return s + tot;
    }, 0);
    const media = cultos.length ? Math.round(total_cultos / cultos.length) : 0;

    el.innerHTML = `
      <div class="mob-detail">

        <!-- Hero -->
        <div style="display:flex;align-items:center;gap:14px;padding:20px 16px;background:var(--bg-surface);border-bottom:1px solid var(--bd1)">
          <div style="width:56px;height:56px;border-radius:14px;background:${cor}22;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">${_esc(icon)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:18px;font-weight:700;color:var(--tx1)">${_esc(c.nome)}</div>
            ${c.localizacao ? `<div style="font-size:13px;color:var(--tx3);margin-top:2px">${_esc(c.localizacao)}</div>` : ''}
            <span style="display:inline-block;margin-top:6px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:8px;
                         background:${c.status === 'ativa' ? 'rgba(48,209,88,.15)' : 'var(--bg-hover)'};
                         color:${c.status === 'ativa' ? 'var(--gr)' : 'var(--tx3)'}">
              ${c.status === 'ativa' ? 'Ativa' : 'Inativa'}
            </span>
          </div>
          ${perm.podeEditar ? `
          <button onclick="_congAbrirEditSheet('${_esc(String(c.id))}')"
            style="flex-shrink:0;padding:6px 14px;border-radius:10px;border:1.5px solid var(--bd2);
                   background:transparent;color:var(--tx2);font-size:13px;font-weight:600;cursor:pointer">
            Editar
          </button>` : ''}
        </div>

        <!-- KPIs -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--bd1)">
          ${_kpi(c.membros_ativos || 0, 'Membros')}
          ${_kpi(media || '—', 'Média/culto')}
          ${_kpi(c.cultos_por_semana || '—', 'Cultos/sem.')}
        </div>

        <!-- Liderança -->
        ${lidRows.length ? `
        <div class="mob-detail-card">
          <div class="mob-detail-card-title">Liderança</div>
          ${lidRows.map(([label, nome]) => `
            <div class="mob-detail-row">
              <div class="mob-detail-row-key">${_esc(label)}</div>
              <div class="mob-detail-row-val">${_esc(nome)}</div>
            </div>
          `).join('')}
        </div>` : ''}

        <!-- Cultos recentes -->
        <div class="mob-detail-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
            <div class="mob-detail-card-title" style="margin-bottom:0">Cultos Recentes</div>
            ${perm.podeEditar ? `<button onclick="_congAbrirCultoSheet('${_esc(String(c.id))}')"
              style="font-size:12px;font-weight:600;color:var(--blue);background:none;border:none;padding:0;cursor:pointer">
              + Registrar
            </button>` : ''}
          </div>
          ${cultos.length ? cultos.map(cu => {
            const tot = cu.participantes || ((cu.adultos || 0) + (cu.criancas || 0));
            const [y, m, d] = (cu.data || '').split('-');
            const data = d ? `${d}/${m}/${y}` : '—';
            return `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bd1)">
                <div style="width:38px;text-align:center;flex-shrink:0">
                  <div style="font-size:16px;font-weight:700;color:var(--tx1)">${tot}</div>
                  <div style="font-size:9px;color:var(--tx3)">pres.</div>
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:500;color:var(--tx1)">${_esc(cu.tipo || 'Culto')}</div>
                  <div style="font-size:11px;color:var(--tx3)">${data}${cu.pregador ? ' · ' + _esc(cu.pregador.split(' ').slice(0,2).join(' ')) : ''}</div>
                  ${(cu.criancas || 0) > 0 || (cu.visitantes || 0) > 0 ? `
                  <div style="font-size:10px;color:var(--tx3);margin-top:1px">
                    ${(cu.criancas  || 0) > 0 ? `Cr: ${cu.criancas}` : ''}
                    ${(cu.visitantes|| 0) > 0 ? ` · Vis: ${cu.visitantes}` : ''}
                    ${(cu.decisoes  || 0) > 0 ? ` · Dec: <span style="color:var(--gr)">${cu.decisoes}</span>` : ''}
                  </div>` : ''}
                </div>
              </div>`;
          }).join('') : `<div style="padding:12px 0;font-size:13px;color:var(--tx3)">Nenhum culto registrado.</div>`}
        </div>

        <!-- Financeiro -->
        <div class="mob-detail-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div class="mob-detail-card-title" style="margin-bottom:0">Financeiro</div>
            ${perm.podeFin ? `<button onclick="_congAbrirFinSheet('${_esc(String(c.id))}')"
              style="font-size:12px;font-weight:600;color:var(--blue);background:none;border:none;padding:0;cursor:pointer">
              Editar
            </button>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            ${_finKpi('Receita média/mês', _brl(c.receita_media_mensal), 'var(--gr)')}
            ${_finKpi('Despesa média/mês', _brl(c.despesa_media_mensal), 'var(--rose)')}
          </div>
          <div style="margin-top:8px;padding:12px;background:var(--bg-body);border-radius:10px;text-align:center">
            <div style="font-size:11px;color:var(--tx3);margin-bottom:4px">Saldo atual</div>
            <div style="font-size:22px;font-weight:700;color:${(c.saldo_atual || 0) >= 0 ? 'var(--gr)' : 'var(--rose)'}">
              ${_brl(c.saldo_atual)}
            </div>
          </div>
        </div>

        <!-- Planejamento -->
        <div class="mob-detail-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div class="mob-detail-card-title" style="margin-bottom:0">Planejamento</div>
            ${perm.podeEditar ? `<button onclick="_congAbrirPlanSheet('${_esc(String(c.id))}', ${JSON.stringify(_esc(c.metas_ano || ''))})"
              style="font-size:12px;font-weight:600;color:var(--blue);background:none;border:none;padding:0;cursor:pointer">
              Editar
            </button>` : ''}
          </div>
          ${c.metas_ano
            ? `<div style="font-size:13px;color:var(--tx1);line-height:1.6;white-space:pre-wrap">${_esc(c.metas_ano)}</div>`
            : `<div style="font-size:13px;color:var(--tx3)">Nenhuma meta registrada.</div>`}
          ${Array.isArray(c.eventos) && c.eventos.length ? `
          <div style="margin-top:12px">
            <div style="font-size:11px;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Eventos Planejados</div>
            ${c.eventos.map(ev => `
              <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
                <div style="font-size:12px;font-weight:600;color:var(--blue);width:70px;flex-shrink:0">${_esc(ev.data || '—')}</div>
                <div style="flex:1;font-size:13px;color:var(--tx1)">${_esc(ev.titulo || ev.nome || '')}</div>
              </div>
            `).join('')}
          </div>` : ''}
        </div>
      </div>
    `;
  }

  /* ── Detalhe BÁSICO (outras congregações) ──────────── */
  function _renderDetalheBasico(el, c, lidRows, cor, icon) {
    const le = (c.lideres && typeof c.lideres === 'object' && !Array.isArray(c.lideres)) ? c.lideres : {};
    const horarios = c.horarios || le.horarios || [];

    el.innerHTML = `
      <div class="mob-detail">
        <!-- Hero -->
        <div style="display:flex;align-items:center;gap:14px;padding:20px 16px;background:var(--bg-surface);border-bottom:1px solid var(--bd1)">
          <div style="width:56px;height:56px;border-radius:14px;background:${cor}22;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">${_esc(icon)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:18px;font-weight:700;color:var(--tx1)">${_esc(c.nome)}</div>
            ${c.localizacao ? `<div style="font-size:13px;color:var(--tx3);margin-top:2px">${_esc(c.localizacao)}</div>` : ''}
            <span style="display:inline-block;margin-top:6px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:8px;
                         background:${c.status === 'ativa' ? 'rgba(48,209,88,.15)' : 'var(--bg-hover)'};
                         color:${c.status === 'ativa' ? 'var(--gr)' : 'var(--tx3)'}">
              ${c.status === 'ativa' ? 'Ativa' : 'Inativa'}
            </span>
          </div>
        </div>

        <!-- Info básica -->
        ${c.endereco || c.localizacao ? `
        <div class="mob-detail-card">
          <div class="mob-detail-card-title">Localização</div>
          ${c.endereco ? `<div class="mob-detail-row"><div class="mob-detail-row-key">Endereço</div><div class="mob-detail-row-val">${_esc(c.endereco)}</div></div>` : ''}
          ${c.localizacao ? `<div class="mob-detail-row"><div class="mob-detail-row-key">Bairro/Região</div><div class="mob-detail-row-val">${_esc(c.localizacao)}</div></div>` : ''}
        </div>` : ''}

        <!-- Liderança -->
        ${lidRows.length ? `
        <div class="mob-detail-card">
          <div class="mob-detail-card-title">Liderança</div>
          ${lidRows.map(([label, nome]) => `
            <div class="mob-detail-row">
              <div class="mob-detail-row-key">${_esc(label)}</div>
              <div class="mob-detail-row-val">${_esc(nome)}</div>
            </div>
          `).join('')}
        </div>` : ''}

        <!-- Cultos -->
        ${(c.cultos_por_semana || horarios.length) ? `
        <div class="mob-detail-card">
          <div class="mob-detail-card-title">Cultos</div>
          ${c.cultos_por_semana ? `<div class="mob-detail-row"><div class="mob-detail-row-key">Por semana</div><div class="mob-detail-row-val">${c.cultos_por_semana}</div></div>` : ''}
          ${horarios.map(h => `<div class="mob-detail-row"><div class="mob-detail-row-key">Horário</div><div class="mob-detail-row-val">${_esc(String(h))}</div></div>`).join('')}
        </div>` : ''}

        <div style="height:24px"></div>
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════
     BOTTOM SHEETS DE EDIÇÃO
  ══════════════════════════════════════════════════ */

  /* ── Sheet: Registrar Culto ────────────────────── */
  window._congAbrirCultoSheet = function (congId) {
    document.getElementById('cong-sheet')?.remove();
    const hoje = new Date().toISOString().slice(0, 10);
    _abrirSheet('Registrar Culto', `
      <div class="mob-field">
        <label class="mob-label">DATA</label>
        <input id="cs-data" class="mob-input" type="date" value="${hoje}">
      </div>
      <div class="mob-field">
        <label class="mob-label">TIPO</label>
        <select id="cs-tipo" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
          <option value="Culto Dominical">Culto Dominical</option>
          <option value="Culto de Oração">Culto de Oração</option>
          <option value="Culto de Jovens">Culto de Jovens</option>
          <option value="Culto de Mulheres">Culto de Mulheres</option>
          <option value="Culto de Homens">Culto de Homens</option>
          <option value="Culto de Crianças">Culto de Crianças</option>
          <option value="Outro">Outro</option>
        </select>
      </div>
      <div class="mob-field">
        <label class="mob-label">PREGADOR</label>
        <input id="cs-pregador" class="mob-input" type="text" placeholder="Nome do pregador">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="mob-field">
          <label class="mob-label">ADULTOS</label>
          <input id="cs-adultos" class="mob-input" type="number" min="0" value="0" inputmode="numeric">
        </div>
        <div class="mob-field">
          <label class="mob-label">CRIANÇAS</label>
          <input id="cs-criancas" class="mob-input" type="number" min="0" value="0" inputmode="numeric">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="mob-field">
          <label class="mob-label">VISITANTES</label>
          <input id="cs-visitantes" class="mob-input" type="number" min="0" value="0" inputmode="numeric">
        </div>
        <div class="mob-field">
          <label class="mob-label">DECISÕES DE FÉ</label>
          <input id="cs-decisoes" class="mob-input" type="number" min="0" value="0" inputmode="numeric">
        </div>
      </div>
      <div class="mob-field">
        <label class="mob-label">OBSERVAÇÕES <span style="font-weight:400;color:var(--tx3)">(opcional)</span></label>
        <textarea id="cs-obs" class="mob-input" rows="2" placeholder="Tema, notas…" style="resize:none"></textarea>
      </div>
      <div id="cs-err" style="font-size:13px;color:var(--rose);min-height:16px;margin-bottom:4px"></div>
      <button id="cs-btn" class="mob-btn-primary" onclick="_congSalvarCulto('${congId}')">Salvar Culto</button>
    `);
  };

  window._congSalvarCulto = async function (congId) {
    const data      = document.getElementById('cs-data')?.value || '';
    const tipo      = document.getElementById('cs-tipo')?.value || '';
    const pregador  = document.getElementById('cs-pregador')?.value?.trim() || '';
    const adultos   = parseInt(document.getElementById('cs-adultos')?.value || '0');
    const criancas  = parseInt(document.getElementById('cs-criancas')?.value || '0');
    const visitantes= parseInt(document.getElementById('cs-visitantes')?.value || '0');
    const decisoes  = parseInt(document.getElementById('cs-decisoes')?.value || '0');
    const obs       = document.getElementById('cs-obs')?.value?.trim() || '';
    const errEl     = document.getElementById('cs-err');
    const btn       = document.getElementById('cs-btn');

    if (!data) { if (errEl) errEl.textContent = 'Informe a data.'; return; }
    if (errEl) errEl.textContent = '';
    btn.disabled = true; btn.textContent = 'Salvando…';

    try {
      const r = await fetch(`${apiBaseUrl()}/rest/v1/congregacao_cultos`, {
        method: 'POST',
        headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          cong_id:      congId,
          data, tipo, pregador, adultos, criancas,
          visitantes,  decisoes, obs,
          participantes: adultos + criancas,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.message || `Erro ${r.status}`);
      }
      _fecharSheet();
      mobToast('Culto registrado');
      mobGo('cong-detalhe', { id: congId, title: _perm?.congNome || '' });
    } catch (e) {
      if (errEl) errEl.textContent = e.message;
      btn.disabled = false; btn.textContent = 'Salvar Culto';
    }
  };

  /* ── Sheet: Editar Financeiro ──────────────────── */
  window._congAbrirFinSheet = function (congId) {
    document.getElementById('cong-sheet')?.remove();
    const c = _cacheDetalhe;
    _abrirSheet('Financeiro', `
      <div class="mob-field">
        <label class="mob-label">RECEITA MÉDIA MENSAL (R$)</label>
        <input id="fin-receita" class="mob-input" type="number" min="0" step="0.01" inputmode="decimal"
               value="${c?.receita_media_mensal || 0}">
      </div>
      <div class="mob-field">
        <label class="mob-label">DESPESA MÉDIA MENSAL (R$)</label>
        <input id="fin-despesa" class="mob-input" type="number" min="0" step="0.01" inputmode="decimal"
               value="${c?.despesa_media_mensal || 0}">
      </div>
      <div class="mob-field">
        <label class="mob-label">SALDO ATUAL (R$)</label>
        <input id="fin-saldo" class="mob-input" type="number" step="0.01" inputmode="decimal"
               value="${c?.saldo_atual || 0}">
      </div>
      <div id="fin-err" style="font-size:13px;color:var(--rose);min-height:16px;margin-bottom:4px"></div>
      <button id="fin-btn" class="mob-btn-primary" onclick="_congSalvarFin('${congId}')">Salvar</button>
    `);
  };

  window._congSalvarFin = async function (congId) {
    const receita = parseFloat(document.getElementById('fin-receita')?.value || '0');
    const despesa = parseFloat(document.getElementById('fin-despesa')?.value || '0');
    const saldo   = parseFloat(document.getElementById('fin-saldo')?.value || '0');
    const errEl   = document.getElementById('fin-err');
    const btn     = document.getElementById('fin-btn');

    if (errEl) errEl.textContent = '';
    btn.disabled = true; btn.textContent = 'Salvando…';

    try {
      const r = await fetch(
        `${apiBaseUrl()}/rest/v1/congregacoes?id=eq.${encodeURIComponent(congId)}`,
        {
          method: 'PATCH',
          headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ receita_media_mensal: receita, despesa_media_mensal: despesa, saldo_atual: saldo }),
        }
      );
      if (!r.ok) throw new Error(`Erro ${r.status}`);
      _fecharSheet();
      mobToast('Financeiro atualizado');
      mobGo('cong-detalhe', { id: congId, title: _perm?.congNome || '' });
    } catch (e) {
      if (errEl) errEl.textContent = e.message;
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  };

  /* ── Sheet: Editar Planejamento ────────────────── */
  window._congAbrirPlanSheet = function (congId, metasEscapadas) {
    document.getElementById('cong-sheet')?.remove();
    const metas = metasEscapadas || '';
    _abrirSheet('Planejamento', `
      <div class="mob-field">
        <label class="mob-label">METAS DO ANO</label>
        <textarea id="plan-metas" class="mob-input" rows="6"
                  placeholder="Descreva as metas e objetivos para o ano…"
                  style="resize:none">${_esc(metas)}</textarea>
      </div>
      <div id="plan-err" style="font-size:13px;color:var(--rose);min-height:16px;margin-bottom:4px"></div>
      <button id="plan-btn" class="mob-btn-primary" onclick="_congSalvarPlan('${congId}')">Salvar</button>
    `);
  };

  window._congSalvarPlan = async function (congId) {
    const metas = document.getElementById('plan-metas')?.value?.trim() || '';
    const errEl = document.getElementById('plan-err');
    const btn   = document.getElementById('plan-btn');

    if (errEl) errEl.textContent = '';
    btn.disabled = true; btn.textContent = 'Salvando…';

    try {
      const r = await fetch(
        `${apiBaseUrl()}/rest/v1/congregacoes?id=eq.${encodeURIComponent(congId)}`,
        {
          method: 'PATCH',
          headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ metas_ano: metas }),
        }
      );
      if (!r.ok) throw new Error(`Erro ${r.status}`);
      _fecharSheet();
      mobToast('Planejamento atualizado');
      mobGo('cong-detalhe', { id: congId, title: _perm?.congNome || '' });
    } catch (e) {
      if (errEl) errEl.textContent = e.message;
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  };

  /* ── Sheet: Nova Congregação ──────────────────── */
  function _congAbrirNovaSheet() {
    document.getElementById('cong-sheet')?.remove();
    _abrirSheet('Nova Congregação', `
      <div class="mob-field">
        <label class="mob-label">NOME <span style="color:var(--rose)">*</span></label>
        <input id="nc-nome" class="mob-input" type="text" maxlength="100" placeholder="Ex: Congregação Ermelino">
      </div>
      <div class="mob-field">
        <label class="mob-label">BAIRRO / REGIÃO</label>
        <input id="nc-loc" class="mob-input" type="text" placeholder="Ex: Ermelino Matarazzo">
      </div>
      <div class="mob-field">
        <label class="mob-label">ENDEREÇO</label>
        <input id="nc-end" class="mob-input" type="text" placeholder="Rua, número, bairro…">
      </div>
      <div class="mob-field">
        <label class="mob-label">STATUS</label>
        <select id="nc-status" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
          <option value="ativa">Ativa</option>
          <option value="inativa">Inativa</option>
        </select>
      </div>
      <div class="mob-field">
        <label class="mob-label">SUPERVISOR</label>
        <input id="nc-sup" class="mob-input" type="text" placeholder="Nome do supervisor">
      </div>
      <div class="mob-field">
        <label class="mob-label">COORDENAÇÃO</label>
        <input id="nc-coord" class="mob-input" type="text" placeholder="Nome do coordenador(a)">
      </div>
      <div class="mob-field">
        <label class="mob-label">CULTOS POR SEMANA</label>
        <input id="nc-cultos" class="mob-input" type="number" min="0" value="1" inputmode="numeric">
      </div>
      <div id="nc-err" style="font-size:13px;color:var(--rose);min-height:16px;margin-bottom:4px"></div>
      <button id="nc-btn" class="mob-btn-primary" onclick="_congSalvarNova()">Criar Congregação</button>
    `);
  }

  window._congSalvarNova = async function () {
    const nome   = (document.getElementById('nc-nome')?.value   || '').trim();
    const loc    = (document.getElementById('nc-loc')?.value    || '').trim() || null;
    const end    = (document.getElementById('nc-end')?.value    || '').trim() || null;
    const status = document.getElementById('nc-status')?.value  || 'ativa';
    const sup    = (document.getElementById('nc-sup')?.value    || '').trim() || null;
    const coord  = (document.getElementById('nc-coord')?.value  || '').trim() || null;
    const cultos = parseInt(document.getElementById('nc-cultos')?.value || '1') || null;
    const errEl  = document.getElementById('nc-err');
    const btn    = document.getElementById('nc-btn');

    if (!nome) { if (errEl) errEl.textContent = 'Informe o nome da congregação.'; return; }
    if (errEl) errEl.textContent = '';
    btn.disabled = true; btn.textContent = 'Criando…';

    try {
      const { data: rows, error } = await getSupabase()
        .from('congregacoes')
        .insert({
          nome,
          localizacao:       loc,
          endereco:          end,
          status,
          supervisao:        sup,
          coordenacao:       coord,
          cultos_por_semana: cultos,
          membros_ativos:    0,
        })
        .select('id,nome');
      if (error) throw error;
      _fecharSheet();
      _cache = null;
      mobToast('Congregação criada');
      const nova = rows?.[0];
      if (nova) {
        mobGo('cong-detalhe', { id: nova.id, title: nova.nome });
      } else {
        await _carregar();
      }
    } catch (e) {
      if (errEl) errEl.textContent = e.message || 'Erro ao criar congregação.';
      btn.disabled = false; btn.textContent = 'Criar Congregação';
    }
  };

  /* ── Sheet: Editar Congregação ───────────────── */
  window._congAbrirEditSheet = function (congId) {
    document.getElementById('cong-sheet')?.remove();
    const c = _cacheDetalhe;
    _abrirSheet('Editar Congregação', `
      <div class="mob-field">
        <label class="mob-label">NOME <span style="color:var(--rose)">*</span></label>
        <input id="ec-nome" class="mob-input" type="text" maxlength="100"
               value="${_esc(c?.nome || '')}">
      </div>
      <div class="mob-field">
        <label class="mob-label">BAIRRO / REGIÃO</label>
        <input id="ec-loc" class="mob-input" type="text"
               value="${_esc(c?.localizacao || '')}" placeholder="Ex: Ermelino Matarazzo">
      </div>
      <div class="mob-field">
        <label class="mob-label">ENDEREÇO</label>
        <input id="ec-end" class="mob-input" type="text"
               value="${_esc(c?.endereco || '')}" placeholder="Rua, número, bairro…">
      </div>
      <div class="mob-field">
        <label class="mob-label">STATUS</label>
        <select id="ec-status" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
          <option value="ativa"${c?.status === 'ativa' ? ' selected' : ''}>Ativa</option>
          <option value="inativa"${c?.status === 'inativa' ? ' selected' : ''}>Inativa</option>
        </select>
      </div>
      <div class="mob-field">
        <label class="mob-label">SUPERVISOR</label>
        <input id="ec-sup" class="mob-input" type="text"
               value="${_esc(c?.supervisao || '')}" placeholder="Nome do supervisor">
      </div>
      <div class="mob-field">
        <label class="mob-label">COORDENAÇÃO</label>
        <input id="ec-coord" class="mob-input" type="text"
               value="${_esc(c?.coordenacao || '')}" placeholder="Nome do coordenador(a)">
      </div>
      <div class="mob-field">
        <label class="mob-label">CULTOS POR SEMANA</label>
        <input id="ec-cultos" class="mob-input" type="number" min="0" inputmode="numeric"
               value="${c?.cultos_por_semana || 1}">
      </div>
      <div id="ec-err" style="font-size:13px;color:var(--rose);min-height:16px;margin-bottom:4px"></div>
      <button id="ec-btn" class="mob-btn-primary" onclick="_congSalvarEdit('${_esc(String(congId))}')">Salvar</button>
    `);
  };

  window._congSalvarEdit = async function (congId) {
    const nome   = (document.getElementById('ec-nome')?.value   || '').trim();
    const loc    = (document.getElementById('ec-loc')?.value    || '').trim() || null;
    const end    = (document.getElementById('ec-end')?.value    || '').trim() || null;
    const status = document.getElementById('ec-status')?.value  || 'ativa';
    const sup    = (document.getElementById('ec-sup')?.value    || '').trim() || null;
    const coord  = (document.getElementById('ec-coord')?.value  || '').trim() || null;
    const cultos = parseInt(document.getElementById('ec-cultos')?.value || '1') || null;
    const errEl  = document.getElementById('ec-err');
    const btn    = document.getElementById('ec-btn');

    if (!nome) { if (errEl) errEl.textContent = 'Informe o nome da congregação.'; return; }
    if (errEl) errEl.textContent = '';
    btn.disabled = true; btn.textContent = 'Salvando…';

    try {
      const r = await fetch(
        `${apiBaseUrl()}/rest/v1/congregacoes?id=eq.${encodeURIComponent(congId)}`,
        {
          method: 'PATCH',
          headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            nome,
            localizacao:       loc,
            endereco:          end,
            status,
            supervisao:        sup,
            coordenacao:       coord,
            cultos_por_semana: cultos,
          }),
        }
      );
      if (!r.ok) throw new Error(`Erro ${r.status}`);
      _cacheDetalhe = null;
      _fecharSheet();
      mobToast('Congregação atualizada');
      mobGo('cong-detalhe', { id: congId, title: nome });
    } catch (e) {
      if (errEl) errEl.textContent = e.message;
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  };

  /* ── Utilitário de sheet ───────────────────────── */
  let _cacheDetalhe = null;

  function _abrirSheet(titulo, conteudo) {
    const sheet = document.createElement('div');
    sheet.id = 'cong-sheet';
    sheet.style.cssText = 'position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;justify-content:flex-end';
    sheet.innerHTML = `
      <div onclick="_fecharSheet()" style="flex:1;background:rgba(0,0,0,.4)"></div>
      <div style="background:var(--bg-surface);border-radius:16px 16px 0 0;overflow:hidden;padding-bottom:calc(var(--safe-bottom) + 8px);max-height:90vh;overflow-y:auto">
        <div style="padding:16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--bd1);position:sticky;top:0;background:var(--bg-surface);z-index:1">
          <div style="flex:1;font-size:16px;font-weight:600;color:var(--tx1)">${titulo}</div>
          <button onclick="_fecharSheet()"
                  style="background:var(--bg-hover);border:none;width:28px;height:28px;border-radius:50%;
                         display:flex;align-items:center;justify-content:center;font-size:18px;
                         color:var(--tx2);cursor:pointer;line-height:1">×</button>
        </div>
        <div style="padding:16px">${conteudo}</div>
      </div>
    `;
    document.body.appendChild(sheet);
  }

  window._fecharSheet = function () {
    document.getElementById('cong-sheet')?.remove();
  };

  /* ── Helpers de render ─────────────────────────── */
  function _kpi(val, label) {
    return `
      <div style="background:var(--bg-surface);padding:14px 12px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:var(--tx1)">${val}</div>
        <div style="font-size:10px;color:var(--tx3);margin-top:2px">${label}</div>
      </div>`;
  }

  function _finKpi(label, val, cor) {
    return `
      <div style="background:var(--bg-body);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:10px;color:var(--tx3);margin-bottom:4px">${label}</div>
        <div style="font-size:16px;font-weight:700;color:${cor}">${val}</div>
      </div>`;
  }

  function _brl(val) {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
    );
  }

})();
