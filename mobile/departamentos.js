/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Departamentos
   mobile/departamentos.js · v1.5.0
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('departamentos',     renderLista);
  mobRegisterPage('dep-detalhe',       renderDetalhe);
  mobRegisterPage('dep-escala-musica', renderEscalaMusica);

  /* ── Constantes ───────────────────────────────────── */
  // Mapa tipo → { label, ic, cor, bg }
  const _TIPO = {
    PASTORAL:     { label:'Pastoral',       ic:'⛪', cor:'var(--gr)',     bg:'rgba(48,209,88,.12)'   },
    ADMINISTRACAO:{ label:'Administração',  ic:'🏛', cor:'var(--blue)',   bg:'var(--bluebg)'         },
    CONSELHO:     { label:'Conselho',       ic:'⚖️', cor:'var(--gold)',   bg:'var(--goldbg)'         },
    DIACONIA:     { label:'Junta Diaconal',  ic:'🤝', cor:'var(--teal)',   bg:'var(--tealbg)'         },
    COMUNICACAO:  { label:'Comunicação',    ic:'📢', cor:'var(--violet)', bg:'var(--violetbg)'       },
    ENSINO:       { label:'Ensino',         ic:'🎓', cor:'var(--amber)',  bg:'var(--amberbg)'        },
    EVANGELISMO:  { label:'Evangelismo',    ic:'✝️', cor:'var(--rose)',   bg:'var(--rosebg)'         },
    JOVENS:       { label:'Jovens',         ic:'🔥', cor:'var(--orange)', bg:'rgba(255,120,40,.12)'  },
    INFANTIL:     { label:'Infantil',       ic:'👶', cor:'var(--sky)',    bg:'var(--skybg)'          },
    MUSICA:       { label:'Música',         ic:'🎵', cor:'var(--violet)', bg:'var(--violetbg)'       },
    INTERCESSAO:  { label:'Intercessão',    ic:'🙏', cor:'var(--gold)',   bg:'var(--goldbg)'         },
    ACOLHIMENTO:  { label:'Acolhimento',    ic:'🤗', cor:'var(--teal)',   bg:'var(--tealbg)'         },
    SOCIAL:       { label:'Ação Social',    ic:'🤲', cor:'var(--gr)',     bg:'rgba(48,209,88,.12)'   },
    OUTRO:        { label:'Outros',         ic:'⭐', cor:'var(--tx3)',    bg:'var(--bg-hover)'       },
  };
  // Ordem de exibição das seções de tipo
  const _ORDEM_TIPO = ['CONSELHO','ADMINISTRACAO','DIACONIA','PASTORAL','COMUNICACAO','ENSINO','EVANGELISMO','JOVENS','INFANTIL','MUSICA','INTERCESSAO','ACOLHIMENTO','SOCIAL','OUTRO'];

  const _NIVEL_LABEL = {
    supervisor:'Supervisor', conselheiro:'Conselheiro',
    coordenador:'Coordenador', lider_area:'Líder de Área', membro:'Membro',
  };

  let _cache = null;

  // Permissão do usuário mobile atual
  let _mobPessoaId      = null;
  let _mobIsAdmin       = false;
  let _mobPermCarregada = false;
  // Estado para adicionar membro no dep atual
  let _depNiveisAtual = [];
  let _depAdicionar   = null; // { id, nome, tipo ('min'|'soc'), orgao, _src }

  /* ══════════════════════════════════════════════════
     PERMISSÃO DO USUÁRIO MOBILE
  ══════════════════════════════════════════════════ */
  async function _carregarPermissaoMob() {
    if (_mobPermCarregada) return;
    _mobPermCarregada = true;
    const uid = window.MOB_USER?.id;
    if (!uid) return;
    const h = apiHeaders();
    try {
      const pRows = await fetch(
        `${apiBaseUrl()}/rest/v1/pessoas?auth_user_id=eq.${encodeURIComponent(uid)}&select=id&limit=1`,
        { headers: h }
      ).then(r => r.ok ? r.json() : []);
      if (!pRows?.[0]?.id) return;
      _mobPessoaId = pRows[0].id;

      const mRows = await fetch(
        `${apiBaseUrl()}/rest/v1/membros?pessoa_id=eq.${encodeURIComponent(_mobPessoaId)}&status=eq.ativo&deleted_at=is.null&select=funcao&limit=1`,
        { headers: h }
      ).then(r => r.ok ? r.json() : []);
      if (mRows?.[0]) {
        _mobIsAdmin = (mRows[0].funcao || '').toUpperCase() === 'ADMINISTRADOR_GERAL';
      }
    } catch (_) {}
  }

  function _niveisPermitidos(nivelUser) {
    if (_mobIsAdmin) return ['supervisor','conselheiro','coordenador','lider_area','membro'];
    if (nivelUser === 'supervisor' || nivelUser === 'conselheiro') return ['coordenador','lider_area','membro'];
    if (nivelUser === 'coordenador') return ['lider_area','membro'];
    if (nivelUser === 'lider_area') return ['membro'];
    return [];
  }

  /* ══════════════════════════════════════════════════
     LISTA
  ══════════════════════════════════════════════════ */
  async function renderLista(el) {
    _cache = null;
    _carregarPermissaoMob(); // pre-load em background
    el.innerHTML = `
      <div class="mob-search-wrap">
        <input class="mob-search" type="search" placeholder="Buscar departamentos…"
               oninput="_depBusca(this.value)"
               onsearch="_depBusca(this.value)">
      </div>
      <div id="dep-lista" style="padding-bottom:24px">
        <div class="mob-loading-state">Carregando…</div>
      </div>
    `;
    await _carregar();
  }

  async function _carregar() {
    const el = document.getElementById('dep-lista');
    if (!el) return;
    try {
      const h = apiHeaders();
      const [rMin, rSoc, rMemMin, rLidMin, rLidSoc] = await Promise.all([
        fetch(`${apiBaseUrl()}/rest/v1/ministerios?ativo=eq.true&select=id,nome,descricao,tipo,categoria&order=nome.asc`, { headers: h }),
        fetch(`${apiBaseUrl()}/rest/v1/sociedades?ativo=eq.true&select=id,nome,sigla,orgao,ic,descricao&order=nome.asc`, { headers: h }),
        fetch(`${apiBaseUrl()}/rest/v1/nomeados?nivel=eq.membro&status=eq.ativo&deleted_at=is.null&select=ministerio_id`, { headers: h }),
        fetch(`${apiBaseUrl()}/rest/v1/nomeados?nivel=in.(supervisor,coordenador,conselheiro)&status=eq.ativo&deleted_at=is.null&select=ministerio_id,nivel,nome`, { headers: h }),
        fetch(`${apiBaseUrl()}/rest/v1/nomeados?orgao_tipo=eq.sociedade&status=eq.ativo&deleted_at=is.null&select=orgao,nome,cargo,tipo_nomeacao&order=tipo_nomeacao.asc`, { headers: h }),
      ]);

      const ministerios = rMin.ok ? await rMin.json() : [];
      const sociedades  = rSoc.ok ? await rSoc.json() : [];
      const memRows     = rMemMin.ok ? await rMemMin.json() : [];
      const lidMinRows  = rLidMin.ok ? await rLidMin.json() : [];
      const lidSocRows  = rLidSoc.ok ? await rLidSoc.json() : [];

      // Contagem de membros por ministério
      const cntMem = {};
      (Array.isArray(memRows) ? memRows : []).forEach(r => {
        if (r.ministerio_id) cntMem[r.ministerio_id] = (cntMem[r.ministerio_id] || 0) + 1;
      });

      // Líder principal por ministério (supervisor > coordenador > conselheiro)
      const _prio = { supervisor: 0, coordenador: 1, conselheiro: 2 };
      const lidMin = {};
      (Array.isArray(lidMinRows) ? lidMinRows : []).forEach(n => {
        if (!n.ministerio_id) return;
        const atual = lidMin[n.ministerio_id];
        if (!atual || (_prio[n.nivel] ?? 9) < (_prio[atual.nivel] ?? 9)) lidMin[n.ministerio_id] = n;
      });

      // Líder principal por sociedade (por orgao)
      const lidSoc = {};
      (Array.isArray(lidSocRows) ? lidSocRows : []).forEach(n => {
        if (!n.orgao || lidSoc[n.orgao]) return;
        lidSoc[n.orgao] = n;
      });

      _cache = {
        ministerios: (Array.isArray(ministerios) ? ministerios : []).map(m => ({
          ...m, _src:'min', _cnt: cntMem[m.id] || 0, _lider: lidMin[m.id] || null,
        })),
        sociedades: (Array.isArray(sociedades) ? sociedades : []).map(s => ({
          ...s, _src:'soc', _lider: lidSoc[s.orgao] || null,
        })),
      };

      _renderTudo(el, _cache);
    } catch (e) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar departamentos.</div></div>`;
    }
  }

  function _renderTudo(el, dados, busca) {
    const q = (busca || '').toLowerCase();

    const filtrarMin = dados.ministerios
      .filter(m => !q || m.nome.toLowerCase().includes(q) || (m.descricao || '').toLowerCase().includes(q));

    const filtrarSoc = dados.sociedades
      .filter(s => !q || s.nome.toLowerCase().includes(q) || (s.sigla || '').toLowerCase().includes(q) || (s.descricao || '').toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    if (!filtrarMin.length && !filtrarSoc.length) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">🔍</div><div class="mob-empty-text">Nenhum resultado.</div></div>`;
      return;
    }

    // Agrupar ministérios por tipo
    const grupos = {};
    filtrarMin.forEach(m => {
      const t = (m.tipo || 'OUTRO').toUpperCase();
      if (!grupos[t]) grupos[t] = [];
      grupos[t].push(m);
    });
    // Ordenar itens dentro de cada grupo
    Object.values(grupos).forEach(g => g.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));

    // Ordem das seções: primeiro os tipos conhecidos (na ordem definida), depois tipos desconhecidos
    const tiposOrdenados = [
      ..._ORDEM_TIPO.filter(t => grupos[t]),
      ...Object.keys(grupos).filter(t => !_ORDEM_TIPO.includes(t)).sort(),
    ];

    let html = tiposOrdenados.map(tipo => {
      const cfg = _TIPO[tipo] || { label: tipo.charAt(0) + tipo.slice(1).toLowerCase(), ic:'⭐', cor:'var(--tx3)', bg:'var(--bg-hover)' };
      return `
        <div class="mob-section">
          <div class="mob-section-title">${cfg.label}</div>
          <div class="mob-card-list">
            ${grupos[tipo].map(m => _rowMin(m, cfg)).join('')}
          </div>
        </div>
      `;
    }).join('');

    if (filtrarSoc.length) {
      html += `
        <div class="mob-section">
          <div class="mob-section-title">Sociedades Internas</div>
          <div class="mob-card-list">
            ${filtrarSoc.map(s => _rowSoc(s)).join('')}
          </div>
        </div>
      `;
    }

    el.innerHTML = html;
  }

  function _rowMin(m, cfg) {
    const sub = [
      m._lider ? m._lider.nome.split(' ').slice(0, 2).join(' ') : null,
      m._cnt   ? `${m._cnt} membro${m._cnt !== 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' · ');

    return `
      <div class="mob-list-item" onclick="mobGo('dep-detalhe',{id:'${_esc(String(m.id))}',title:'${_esc(m.nome)}',_src:'min'})">
        <div class="mob-list-ico" style="background:${cfg.bg};color:${cfg.cor};font-size:20px">${cfg.ic}</div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(m.nome)}</div>
          ${sub ? `<div class="mob-list-sub">${_esc(sub)}</div>` : ''}
        </div>
        <div class="mob-list-chev">›</div>
      </div>
    `;
  }

  function _rowSoc(s) {
    const sub = s._lider ? s._lider.nome.split(' ').slice(0, 2).join(' ') : null;
    return `
      <div class="mob-list-item" onclick="mobGo('dep-detalhe',{id:'${_esc(String(s.id))}',title:'${_esc(s.nome)}',_src:'soc',_orgao:'${_esc(s.orgao)}'})">
        <div class="mob-list-ico" style="background:rgba(10,132,255,.1);color:var(--blue);font-size:20px">${_esc(s.ic || '🏛')}</div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(s.nome)}${s.sigla ? ` <span style="font-size:11px;color:var(--tx3);font-weight:500">(${_esc(s.sigla)})</span>` : ''}</div>
          ${sub ? `<div class="mob-list-sub">${_esc(sub)}</div>` : ''}
        </div>
        <div class="mob-list-chev">›</div>
      </div>
    `;
  }

  window._depBusca = function (val) {
    const el = document.getElementById('dep-lista');
    if (!el || !_cache) return;
    _renderTudo(el, _cache, val.trim());
  };

  /* ══════════════════════════════════════════════════
     DETALHE
  ══════════════════════════════════════════════════ */
  async function renderDetalhe(el, params) {
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;
    try {
      if (params?._src === 'soc') {
        await _renderDetalheSoc(el, params);
      } else {
        await _renderDetalheMin(el, params);
      }
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Não encontrado.</div></div>`;
    }
  }

  /* ── Detalhe de Ministério ──────────────────────── */
  async function _renderDetalheMin(el, params) {
    await _carregarPermissaoMob();

    let m = (_cache?.ministerios || []).find(x => String(x.id) === String(params?.id));
    if (!m) {
      const [d] = await fetch(
        `${apiBaseUrl()}/rest/v1/ministerios?id=eq.${encodeURIComponent(params.id)}&select=id,nome,descricao,tipo,categoria&limit=1`,
        { headers: apiHeaders() }
      ).then(r => r.json());
      m = d;
    }
    if (!m) throw new Error('não encontrado');

    const tipoKey = (m.tipo || 'OUTRO').toUpperCase();
    const cfg = _TIPO[tipoKey] || _TIPO['OUTRO'];
    const ic  = cfg.ic;

    const [rLid, rMem, rUserNivel] = await Promise.all([
      fetch(`${apiBaseUrl()}/rest/v1/nomeados?ministerio_id=eq.${encodeURIComponent(m.id)}&nivel=in.(supervisor,coordenador,conselheiro)&status=eq.ativo&deleted_at=is.null&select=nivel,nome,cargo&order=nivel.asc`, { headers: apiHeaders() }),
      fetch(`${apiBaseUrl()}/rest/v1/nomeados?ministerio_id=eq.${encodeURIComponent(m.id)}&nivel=eq.membro&status=eq.ativo&deleted_at=is.null&select=nome&order=nome.asc&limit=60`, { headers: { ...apiHeaders(), 'Prefer':'count=exact' } }),
      (_mobPessoaId && !_mobIsAdmin)
        ? fetch(`${apiBaseUrl()}/rest/v1/nomeados?ministerio_id=eq.${encodeURIComponent(m.id)}&pessoa_id=eq.${encodeURIComponent(_mobPessoaId)}&status=eq.ativo&deleted_at=is.null&select=nivel&limit=1`, { headers: apiHeaders() })
        : Promise.resolve(null),
    ]);

    const lideres = rLid.ok ? await rLid.json() : [];
    const membros = rMem.ok ? await rMem.json() : [];
    const cntMem  = _parseCount(rMem.headers?.get('content-range')) || membros.length;

    const uRows = rUserNivel?.ok ? await rUserNivel.json() : [];
    const userNivel = uRows?.[0]?.nivel || null;
    _depNiveisAtual = _niveisPermitidos(userNivel);
    _depAdicionar   = { id: m.id, nome: m.nome, tipo: 'min', _src: 'min', orgao: null };

    el.innerHTML = _htmlDetalhe({
      ic, nome: m.nome, descricao: m.descricao,
      badge1: { label: cfg.label, cor: cfg.cor, bg: cfg.bg },
      badge2: null,
      lideres, membros, cntMem,
      nivelLabel: { supervisor:'Supervisor', coordenador:'Coordenador', conselheiro:'Conselheiro' },
      podeAdicionar: _depNiveisAtual.length > 0,
      isMusica: tipoKey === 'MUSICA',
    });
  }

  /* ── Detalhe de Sociedade ───────────────────────── */
  async function _renderDetalheSoc(el, params) {
    await _carregarPermissaoMob();

    let s = (_cache?.sociedades || []).find(x => String(x.id) === String(params?.id));
    if (!s) {
      const [d] = await fetch(
        `${apiBaseUrl()}/rest/v1/sociedades?id=eq.${encodeURIComponent(params.id)}&select=id,nome,sigla,orgao,ic,descricao&limit=1`,
        { headers: apiHeaders() }
      ).then(r => r.json());
      s = d;
    }
    if (!s) throw new Error('não encontrado');

    const orgao = params._orgao || s.orgao;
    const [rLid, rUserNivel] = await Promise.all([
      fetch(`${apiBaseUrl()}/rest/v1/nomeados?orgao_tipo=eq.sociedade&orgao=eq.${encodeURIComponent(orgao)}&status=eq.ativo&deleted_at=is.null&select=nome,cargo,tipo_nomeacao&order=tipo_nomeacao.asc,nome.asc`, { headers: apiHeaders() }),
      (_mobPessoaId && !_mobIsAdmin)
        ? fetch(`${apiBaseUrl()}/rest/v1/nomeados?orgao_tipo=eq.sociedade&orgao=eq.${encodeURIComponent(orgao)}&pessoa_id=eq.${encodeURIComponent(_mobPessoaId)}&status=eq.ativo&deleted_at=is.null&select=nivel&limit=1`, { headers: apiHeaders() })
        : Promise.resolve(null),
    ]);
    const lideres   = rLid.ok ? await rLid.json() : [];
    const uRows     = rUserNivel?.ok ? await rUserNivel.json() : [];
    const userNivel = uRows?.[0]?.nivel || null;
    _depNiveisAtual = _niveisPermitidos(userNivel);
    _depAdicionar   = { id: s.id, nome: s.nome, tipo: 'soc', _src: 'soc', orgao };

    el.innerHTML = _htmlDetalhe({
      ic: s.ic || '🏛',
      nome: s.nome + (s.sigla ? ` (${s.sigla})` : ''),
      descricao: s.descricao,
      badge1: { label:'Sociedade Interna', cor:'var(--blue)', bg:'rgba(10,132,255,.1)' },
      badge2: null,
      lideres: lideres.map(l => ({ nivel: l.tipo_nomeacao, nome: l.nome, cargo: l.cargo })),
      membros: [], cntMem: 0,
      nivelLabel: { lider:'Líder', diretoria:'Diretoria' },
      podeAdicionar: _depNiveisAtual.length > 0,
    });
  }

  /* ── Template de detalhe compartilhado ─────────── */
  function _htmlDetalhe({ ic, nome, descricao, badge1, badge2, lideres, membros, cntMem, nivelLabel,
                          podeAdicionar = false, isMusica = false }) {
    return `
      <div class="mob-detail">
        <div class="mob-detail-hero">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
            <div style="width:52px;height:52px;border-radius:14px;background:${badge1.bg};
                        display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">
              ${_esc(ic)}
            </div>
            <div>
              <div class="mob-detail-title">${_esc(nome)}</div>
              <div class="mob-detail-meta" style="margin-top:6px">
                <span class="mob-badge" style="background:${badge1.bg};color:${badge1.cor}">${badge1.label}</span>
                ${badge2 ? `<span class="mob-badge" style="background:${badge2.bg};color:${badge2.cor}">${_esc(badge2.label)}</span>` : ''}
              </div>
            </div>
          </div>
          ${descricao ? `<div style="font-size:14px;color:var(--tx2);line-height:1.6">${_esc(descricao)}</div>` : ''}
        </div>

        ${Array.isArray(lideres) && lideres.length ? `
        <div class="mob-detail-card">
          <div class="mob-detail-card-title">Liderança</div>
          ${lideres.map(l => `
            <div class="mob-detail-row">
              <div class="mob-detail-row-key">${_esc(nivelLabel[l.nivel] || l.nivel || 'Líder')}</div>
              <div class="mob-detail-row-val">${_esc(l.nome)}${l.cargo ? `<br><span style="font-size:11px;color:var(--tx3)">${_esc(l.cargo)}</span>` : ''}</div>
            </div>
          `).join('')}
        </div>` : ''}

        ${cntMem > 0 ? `
        <div class="mob-detail-card">
          <div class="mob-detail-card-title">Membros</div>
          <div class="mob-detail-row" style="border-bottom:${Array.isArray(membros) && membros.length ? '1px solid var(--bd1)' : 'none'}">
            <div class="mob-detail-row-key">Total ativo</div>
            <div class="mob-detail-row-val" style="font-size:20px;font-weight:700;color:var(--tx1)">${cntMem}</div>
          </div>
          ${Array.isArray(membros) && membros.length ? `
          <div style="padding:4px 0">
            ${membros.map(mem => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid var(--bd1)">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--violetbg);color:var(--violet);
                            font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  ${_initials(mem.nome)}
                </div>
                <div style="font-size:14px;color:var(--tx1)">${_esc(mem.nome)}</div>
              </div>
            `).join('')}
            ${cntMem > membros.length ? `
            <div style="padding:10px 16px;font-size:12px;color:var(--tx3);text-align:center">
              Exibindo ${membros.length} de ${cntMem} membros
            </div>` : ''}
          </div>` : ''}
        </div>` : ''}

        ${isMusica ? `
        <div class="mob-detail-card">
          <div class="mob-detail-card-title">Escala de Música</div>
          <div style="padding:12px 16px 16px">
            <div style="font-size:13px;color:var(--tx2);margin-bottom:12px">
              Gerencie a escala mensal de dirigentes e equipes de louvor.
            </div>
            <button onclick="mobGo('dep-escala-musica',{title:'Escala de Música'})"
                    class="mob-btn-secondary">
              Ver Escala de Música
            </button>
          </div>
        </div>` : ''}

        ${podeAdicionar ? `
        <div style="padding:0 16px 24px">
          <button onclick="_depAbrirAddMembro()" class="mob-btn-primary">
            + Adicionar Membro
          </button>
        </div>` : ''}
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════
     ADICIONAR MEMBRO — Bottom Sheet
  ══════════════════════════════════════════════════ */
  window._depAbrirAddMembro = function () {
    document.getElementById('dep-add-sheet')?.remove();
    if (!_depAdicionar || !_depNiveisAtual.length) return;

    const opcoes = _depNiveisAtual
      .map(n => `<option value="${n}">${_NIVEL_LABEL[n] || n}</option>`)
      .join('');

    const sheet = document.createElement('div');
    sheet.id = 'dep-add-sheet';
    sheet.style.cssText = 'position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;justify-content:flex-end';
    sheet.innerHTML = `
      <div onclick="_depFecharAddSheet()" style="flex:1;background:rgba(0,0,0,.4)"></div>
      <div style="background:var(--bg-surface);border-radius:16px 16px 0 0;overflow:hidden;padding-bottom:var(--safe-bottom)">
        <div style="padding:16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--bd1)">
          <div style="flex:1;font-size:16px;font-weight:600;color:var(--tx1)">Adicionar Membro</div>
          <button onclick="_depFecharAddSheet()"
                  style="background:var(--bg-hover);border:none;width:28px;height:28px;border-radius:50%;
                         display:flex;align-items:center;justify-content:center;font-size:18px;
                         color:var(--tx2);cursor:pointer;line-height:1">×</button>
        </div>
        <div style="padding:16px;max-height:72vh;overflow-y:auto">
          <div style="font-size:12px;color:var(--tx3);margin-bottom:16px">${_esc(_depAdicionar.nome)}</div>

          <div class="mob-field">
            <label class="mob-label">PESSOA</label>
            <input id="dep-add-busca" class="mob-input" type="search"
                   placeholder="Buscar por nome…"
                   oninput="_depBuscarPessoas(this.value)"
                   autocomplete="off">
            <div id="dep-add-res"
                 style="display:none;margin-top:4px;border:1px solid var(--bd2);border-radius:10px;overflow:hidden"></div>
            <input type="hidden" id="dep-add-pid">
            <div id="dep-add-psel" style="margin-top:6px;font-size:13px;font-weight:500;color:var(--tx1)"></div>
          </div>

          <div class="mob-field">
            <label class="mob-label">NÍVEL</label>
            <select id="dep-add-nivel" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
              <option value="">Selecione…</option>
              ${opcoes}
            </select>
          </div>

          <div class="mob-field">
            <label class="mob-label">
              CARGO / FUNÇÃO
              <span style="font-weight:400;color:var(--tx3);text-transform:none"> (opcional)</span>
            </label>
            <input id="dep-add-cargo" class="mob-input" type="text"
                   placeholder="Ex.: Tesoureiro, Secretário…">
          </div>

          <div id="dep-add-err"
               style="font-size:13px;color:var(--rose);margin-bottom:12px;min-height:16px"></div>

          <button id="dep-add-btn" class="mob-btn-primary" onclick="_depSalvarMembro()">
            Adicionar
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(sheet);
  };

  window._depFecharAddSheet = function () {
    document.getElementById('dep-add-sheet')?.remove();
  };

  let _depBuscaTimer = null;
  window._depBuscarPessoas = function (q) {
    clearTimeout(_depBuscaTimer);
    const res = document.getElementById('dep-add-res');
    const pid = document.getElementById('dep-add-pid');
    const psel = document.getElementById('dep-add-psel');
    if (!res) return;

    // Limpar seleção anterior ao digitar de novo
    if (pid) pid.value = '';
    if (psel) { psel.textContent = ''; delete psel.dataset.nome; }

    if (!q.trim()) {
      res.style.display = 'none';
      return;
    }
    _depBuscaTimer = setTimeout(async () => {
      res.style.display = 'block';
      res.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:var(--tx3)">Buscando…</div>';
      try {
        const rows = await fetch(
          `${apiBaseUrl()}/rest/v1/pessoas?nome=ilike.*${encodeURIComponent(q.trim())}*&deleted_at=is.null&select=id,nome&order=nome.asc&limit=15`,
          { headers: apiHeaders() }
        ).then(r => r.ok ? r.json() : []);

        if (!rows.length) {
          res.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:var(--tx3)">Nenhuma pessoa encontrada.</div>';
          return;
        }
        res.innerHTML = rows.map(p => `
          <div onclick="_depSelecionarPessoa(this)"
               data-id="${_esc(String(p.id))}"
               data-nome="${_esc(p.nome)}"
               style="padding:11px 14px;font-size:14px;color:var(--tx1);
                      border-bottom:1px solid var(--bd1);cursor:pointer;
                      background:var(--bg-surface)">
            ${_esc(p.nome)}
          </div>
        `).join('');
      } catch (_) {
        res.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:var(--rose)">Erro na busca.</div>';
      }
    }, 300);
  };

  window._depSelecionarPessoa = function (el) {
    const pid   = document.getElementById('dep-add-pid');
    const psel  = document.getElementById('dep-add-psel');
    const busca = document.getElementById('dep-add-busca');
    const res   = document.getElementById('dep-add-res');
    if (!pid || !psel) return;
    pid.value = el.dataset.id || '';
    psel.textContent = el.dataset.nome || '';
    psel.dataset.nome = el.dataset.nome || '';
    if (busca) busca.value = el.dataset.nome || '';
    if (res) res.style.display = 'none';
  };

  window._depSalvarMembro = async function () {
    const pid   = document.getElementById('dep-add-pid')?.value || '';
    const pnome = document.getElementById('dep-add-psel')?.dataset.nome || '';
    const nivel = document.getElementById('dep-add-nivel')?.value || '';
    const cargo = document.getElementById('dep-add-cargo')?.value?.trim() || '';
    const errEl = document.getElementById('dep-add-err');
    const btn   = document.getElementById('dep-add-btn');

    if (errEl) errEl.textContent = '';
    if (!pid)   { if (errEl) errEl.textContent = 'Selecione uma pessoa.'; return; }
    if (!nivel) { if (errEl) errEl.textContent = 'Selecione um nível.'; return; }

    btn.disabled = true;
    btn.textContent = 'Salvando…';

    try {
      const dep = _depAdicionar;
      const payload = {
        pessoa_id: pid,
        nome:      pnome,
        nivel,
        cargo:     cargo || (_NIVEL_LABEL[nivel] || nivel),
        status:    'ativo',
        origem:    'nomeacao',
      };

      if (dep.tipo === 'min') {
        payload.ministerio_id = dep.id;
        payload.orgao_tipo    = 'ministerio';
        payload.orgao         = dep.nome;
      } else {
        payload.orgao_tipo = 'sociedade';
        payload.orgao      = dep.orgao || dep.nome;
      }

      const r = await fetch(`${apiBaseUrl()}/rest/v1/nomeados`, {
        method: 'POST',
        headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        if (r.status === 409) throw new Error('Esta pessoa já está vinculada a este departamento.');
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.message || `Erro ${r.status}`);
      }

      _depFecharAddSheet();
      mobToast('Membro adicionado');

      // Recarregar o detalhe atual
      mobGo('dep-detalhe', { id: dep.id, title: dep.nome, _src: dep._src, _orgao: dep.orgao });
    } catch (e) {
      if (errEl) errEl.textContent = e.message;
      btn.disabled = false;
      btn.textContent = 'Adicionar';
    }
  };

  /* ══════════════════════════════════════════════════
     ESCALA DE MÚSICA
  ══════════════════════════════════════════════════ */
  const _SLOTS_MUS = {
    domingo_manha:      'Domingo Manhã',
    domingo_noite:      'Domingo Noite',
    conexao_com_deus:   'Conexão com Deus',
    tarde_da_esperanca: 'Tarde da Esperança',
  };
  const _SLOT_COR = {
    domingo_manha:      'var(--blue)',
    domingo_noite:      'var(--violet)',
    conexao_com_deus:   'var(--teal)',
    tarde_da_esperanca: 'var(--amber)',
  };
  const _ST_MUS = {
    PENDENTE:   { cor:'var(--amber)', bg:'rgba(234,179,8,.12)',  label:'Pendente'   },
    PREENCHIDA: { cor:'var(--blue)',  bg:'rgba(10,132,255,.12)', label:'Preenchida' },
    CONFIRMADA: { cor:'var(--gr)',    bg:'rgba(48,209,88,.12)',  label:'Confirmada' },
  };

  let _escalaCache   = null;
  let _musicosCache  = null;
  let _escalaSlotKey = null;

  async function renderEscalaMusica(el) {
    _escalaCache = null;
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;

    const hoje = _isoOffset(0);
    const fim  = _isoOffset(60);

    try {
      const [rEsc, rMus] = await Promise.all([
        fetch(
          `${apiBaseUrl()}/rest/v1/escala_musica?data=gte.${hoje}&data=lte.${fim}&order=data.asc,culto_tipo.asc&limit=300`,
          { headers: apiHeaders() }
        ),
        fetch(
          `${apiBaseUrl()}/rest/v1/musicos?ativo=eq.true&order=nome.asc&limit=200`,
          { headers: apiHeaders() }
        ),
      ]);

      const rows  = rEsc.ok ? await rEsc.json() : [];
      _musicosCache = rMus.ok ? await rMus.json() : [];

      // Indexar por "data-culto_tipo"
      _escalaCache = {};
      (Array.isArray(rows) ? rows : []).forEach(r => {
        _escalaCache[`${r.data}-${r.culto_tipo}`] = r;
      });

      _renderEscalaLista(el, hoje, fim);
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar escala.</div></div>`;
    }
  }

  function _renderEscalaLista(el, hoje, fim) {
    // Gerar todos os dias do intervalo
    const dias = [];
    let cur = new Date(hoje + 'T12:00:00');
    const fimD = new Date(fim + 'T12:00:00');
    while (cur <= fimD) {
      dias.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }

    // Filtrar apenas dias que têm slots ou são domingo/quarta
    const diasComSlots = dias.filter(d => {
      const dow = new Date(d + 'T12:00:00').getDay();
      // Domingos (0) têm manhã e noite; quartas (3) têm Conexão; sábados (6) têm Tarde
      return dow === 0 || dow === 3 || dow === 6 ||
        Object.keys(_escalaCache).some(k => k.startsWith(d + '-'));
    });

    if (!diasComSlots.length) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">🎵</div><div class="mob-empty-text">Nenhum slot nos próximos 60 dias.</div></div>`;
      return;
    }

    const DIAS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    // Agrupar slots por data
    const grupos = diasComSlots.map(d => {
      const dt  = new Date(d + 'T12:00:00');
      const dow = dt.getDay();
      // Slots relevantes para esse dia
      const slotKeys = Object.keys(_SLOTS_MUS).filter(k => {
        if (k === 'domingo_manha' || k === 'domingo_noite') return dow === 0;
        if (k === 'conexao_com_deus') return dow === 3;
        if (k === 'tarde_da_esperanca') return dow === 6;
        return false;
      });
      // Incluir também qualquer slot existente nesse dia não coberto acima
      Object.keys(_escalaCache).filter(k => k.startsWith(d + '-')).forEach(k => {
        const tipo = k.slice(d.length + 1);
        if (!slotKeys.includes(tipo)) slotKeys.push(tipo);
      });
      if (!slotKeys.length) return null;

      const isHoje = d === hoje;
      const lbl  = `${DIAS_PT[dow]}, ${dt.getDate()} ${MESES_PT[dt.getMonth()]}`;

      return { d, lbl, isHoje, slotKeys };
    }).filter(Boolean);

    el.innerHTML = `
      <div style="padding-bottom:24px">
        ${grupos.map(g => `
          <div class="mob-day-group">
            <div class="mob-day-hdr ${g.isHoje ? 'mob-day-today' : ''}">${_esc(g.lbl)}</div>
            <div class="mob-card-list" style="margin:0 16px">
              ${g.slotKeys.map(k => {
                const slot = _escalaCache[`${g.d}-${k}`];
                const st   = slot?.status || 'PENDENTE';
                const stCfg = _ST_MUS[st] || _ST_MUS.PENDENTE;
                const slotLbl = _SLOTS_MUS[k] || k;
                const cor   = _SLOT_COR[k] || 'var(--violet)';
                return `
                  <div class="mob-list-item"
                       onclick="_depEscAbrirSlot('${_esc(g.d)}','${_esc(k)}')">
                    <div class="mob-list-ico"
                         style="background:${stCfg.bg};color:${cor};font-size:18px">🎵</div>
                    <div class="mob-list-body">
                      <div class="mob-list-title">${_esc(slotLbl)}</div>
                      <div class="mob-list-sub">
                        ${slot?.dirigente_nome
                          ? _esc(slot.dirigente_nome) + (slot.equipe ? ' · ' + _esc(slot.equipe) : '')
                          : '<span style="color:var(--tx4)">Não atribuído</span>'}
                      </div>
                    </div>
                    <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;
                                 background:${stCfg.bg};color:${stCfg.cor};white-space:nowrap;flex-shrink:0">
                      ${stCfg.label}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  window._depEscAbrirSlot = function (data, cultoTipo) {
    _escalaSlotKey = `${data}-${cultoTipo}`;
    const slot     = _escalaCache?.[_escalaSlotKey];
    const slotLbl  = _SLOTS_MUS[cultoTipo] || cultoTipo;
    const [y, m, d] = data.split('-');
    const dataFmt  = `${d}/${m}/${y}`;

    document.getElementById('dep-esc-sheet')?.remove();
    const s = document.createElement('div');
    s.id = 'dep-esc-sheet';
    s.style.cssText = 'position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;justify-content:flex-end';

    const musOpts = (_musicosCache || []).map(mu =>
      `<option value="${_esc(mu.nome)}" ${mu.nome === slot?.dirigente_nome ? 'selected' : ''}>${_esc(mu.nome)}</option>`
    ).join('');

    s.innerHTML = `
      <div onclick="document.getElementById('dep-esc-sheet')?.remove()"
           style="flex:1;background:rgba(0,0,0,.4)"></div>
      <div style="background:var(--bg-surface);border-radius:18px 18px 0 0;
                  padding:20px 16px;padding-bottom:calc(var(--safe-bottom) + 20px);
                  max-height:88vh;overflow-y:auto">
        <div style="font-size:11px;font-weight:600;color:var(--violet);text-transform:uppercase;
                    letter-spacing:.06em;margin-bottom:4px">${_esc(slotLbl)}</div>
        <div style="font-size:16px;font-weight:700;color:var(--tx1);margin-bottom:16px">${_esc(dataFmt)}</div>

        <div class="mob-field">
          <label class="mob-label">DIRIGENTE / LÍDER DE LOUVOR</label>
          <select id="esc-dirigente" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
            <option value="">Não atribuído</option>
            ${musOpts}
          </select>
        </div>

        <div class="mob-field">
          <label class="mob-label">EQUIPE <span style="font-weight:400;color:var(--tx3)">(opcional)</span></label>
          <input id="esc-equipe" class="mob-input" type="text"
                 value="${_esc(slot?.equipe || '')}"
                 placeholder="Ex: Equipe A, voz + violão…">
        </div>

        <div class="mob-field">
          <label class="mob-label">STATUS</label>
          <select id="esc-status" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
            <option value="PENDENTE"   ${(slot?.status || 'PENDENTE') === 'PENDENTE'   ? 'selected' : ''}>Pendente</option>
            <option value="PREENCHIDA" ${slot?.status === 'PREENCHIDA' ? 'selected' : ''}>Preenchida</option>
            <option value="CONFIRMADA" ${slot?.status === 'CONFIRMADA' ? 'selected' : ''}>Confirmada</option>
          </select>
        </div>

        <div class="mob-field">
          <label class="mob-label">OBSERVAÇÕES <span style="font-weight:400;color:var(--tx3)">(opcional)</span></label>
          <textarea id="esc-obs" class="mob-input" rows="2" style="resize:none"
                    placeholder="Notas, temas…">${_esc(slot?.obs || '')}</textarea>
        </div>

        <div id="esc-err" style="font-size:13px;color:var(--rose);min-height:16px"></div>
        <button id="esc-btn" class="mob-btn-primary"
                onclick="_depEscSalvarSlot('${_esc(data)}','${_esc(cultoTipo)}')">
          Salvar
        </button>
      </div>
    `;
    document.body.appendChild(s);
  };

  window._depEscSalvarSlot = async function (data, cultoTipo) {
    const dirigente = (document.getElementById('esc-dirigente')?.value || '').trim();
    const equipe    = (document.getElementById('esc-equipe')?.value    || '').trim() || null;
    const statusSel = document.getElementById('esc-status')?.value     || 'PENDENTE';
    const obs       = (document.getElementById('esc-obs')?.value       || '').trim() || null;
    const errEl     = document.getElementById('esc-err');
    const btn       = document.getElementById('esc-btn');

    if (errEl) errEl.textContent = '';
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }

    const autoSt = !dirigente ? 'PENDENTE' : (statusSel === 'PENDENTE' ? 'PREENCHIDA' : statusSel);

    try {
      const key      = `${data}-${cultoTipo}`;
      const existing = _escalaCache?.[key];
      const payload  = {
        dirigente_nome: dirigente || null,
        equipe,
        obs,
        status: autoSt,
      };

      let r;
      if (existing?.id) {
        r = await fetch(
          `${apiBaseUrl()}/rest/v1/escala_musica?id=eq.${encodeURIComponent(existing.id)}`,
          {
            method: 'PATCH',
            headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify(payload),
          }
        );
      } else {
        r = await fetch(
          `${apiBaseUrl()}/rest/v1/escala_musica`,
          {
            method: 'POST',
            headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify({ data, culto_tipo: cultoTipo, ...payload }),
          }
        );
      }

      if (!r.ok) throw new Error(`Erro ${r.status}`);
      const [saved] = await r.json();

      if (_escalaCache) _escalaCache[key] = saved;
      document.getElementById('dep-esc-sheet')?.remove();
      mobToast('Escala atualizada');

      // Re-renderiza a lista
      const conteudo = document.getElementById('mob-content');
      if (conteudo) {
        const hoje = _isoOffset(0);
        const fim  = _isoOffset(60);
        _renderEscalaLista(conteudo.querySelector('div') || conteudo, hoje, fim);
        // Re-renderiza completamente para consistência
        await renderEscalaMusica(conteudo);
      }
    } catch (e) {
      if (errEl) errEl.textContent = e.message || 'Erro ao salvar.';
      if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
    }
  };

  function _isoOffset(dias) {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  }

  /* ── Helpers ──────────────────────────────────────── */
  function _parseCount(cr) {
    if (!cr) return 0;
    const m = cr.match(/\/(\d+)$/);
    return m ? parseInt(m[1]) : 0;
  }

  function _initials(nome) {
    return (nome || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
    );
  }

})();
