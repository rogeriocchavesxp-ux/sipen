/* rede-cuidado.js — v1.0
 * Módulo: Rede de Cuidado Pastoral Progressivo
 * Requer: supabase-rede-cuidado.sql aplicado no Supabase
 * Depende de: USUARIO_ATUAL, SUPABASE_URL, SUPABASE_ANON_KEY, sipenToken(), escapeHtml()
 */
(function () {
  'use strict';

  /* ══ PERMISSÕES ══════════════════════════════════════════════════ */

  function _isAdmin() {
    const p = USUARIO_ATUAL?.perfil;
    return ['ADMINISTRADOR_GERAL', 'CONSELHO'].includes(p);
  }

  function _podeGerirRede() {
    const p = USUARIO_ATUAL?.perfil;
    return ['ADMINISTRADOR_GERAL', 'PASTORAL'].includes(p);
  }

  // Qualquer usuário autenticado pode ver sua própria rede
  function _pessoaId() {
    return USUARIO_ATUAL?.pessoa_id || USUARIO_ATUAL?.id || null;
  }

  /* ══ HTTP HELPERS ════════════════════════════════════════════════ */

  function _hdr() {
    const token = (typeof sipenToken === 'function') ? sipenToken() : SUPABASE_ANON_KEY;
    return { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token };
  }

  function _hdrJson() {
    return Object.assign({}, _hdr(), {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    });
  }

  async function _get(path) {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: _hdr() });
    if (!r.ok) throw new Error((await r.json()).message || r.statusText);
    return r.json();
  }

  async function _rpc(fn, body) {
    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: _hdrJson(),
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || r.statusText);
    return data; // { ok, erro? }
  }

  /* ══ ESTADO ══════════════════════════════════════════════════════ */

  let _vinculosCache   = null; // vínculos do cuidador atual
  let _pessoasCache    = null; // lista para autocomplete
  let _buscaTimeout    = null;

  function _invalidate() { _vinculosCache = null; }

  /* ══ CARREGAMENTO DE DADOS ═══════════════════════════════════════ */

  async function _carregarVinculos() {
    if (_vinculosCache) return _vinculosCache;
    const pid = _pessoaId();
    if (!pid) return [];

    try {
      if (_isAdmin()) {
        // Admin: carrega a view completa
        const rows = await _get('v_rede_cuidado?ativo=eq.true&order=cuidador_nome.asc,cuidado_nome.asc&limit=500');
        _vinculosCache = rows;
      } else {
        // Líder: só os seus vínculos ativos
        const rows = await _get(
          `rede_cuidado?cuidador_id=eq.${pid}&ativo=eq.true&select=id,cuidado_id,nivel,observacoes,criado_em`
        );
        // Enriquece com nome do cuidado
        if (rows.length > 0) {
          const ids = rows.map(r => r.cuidado_id).join(',');
          const pessoas = await _get(`pessoas?id=in.(${ids})&select=id,nome&deleted_at=is.null`);
          const map = Object.fromEntries(pessoas.map(p => [p.id, p.nome]));
          rows.forEach(r => { r.cuidado_nome = map[r.cuidado_id] || '—'; });
        }
        _vinculosCache = rows;
      }
    } catch (e) {
      console.error('[rede-cuidado] carregarVinculos:', e.message);
      _vinculosCache = [];
    }
    return _vinculosCache;
  }

  async function _buscarPessoas(termo) {
    if (!termo || termo.length < 2) return [];
    try {
      const rows = await _get(
        `pessoas?nome=ilike.*${encodeURIComponent(termo)}*&deleted_at=is.null&select=id,nome&order=nome.asc&limit=20`
      );
      return rows;
    } catch (e) {
      return [];
    }
  }

  /* ══ TELA PRINCIPAL (LÍDER) ══════════════════════════════════════ */

  async function _renderLider(container) {
    const pid    = _pessoaId();
    const nome   = escapeHtml(USUARIO_ATUAL?.nome || '');
    const vinculos = await _carregarVinculos();
    const vagas  = 5 - vinculos.length;

    container.innerHTML = `
      <div style="max-width:640px;margin:0 auto;padding:24px 0">

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div>
            <div style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Rede de Cuidado Pastoral</div>
            <div style="font-size:20px;font-weight:700;color:var(--tx1)">${nome}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:28px;font-weight:800;color:var(--accent)">${vinculos.length}<span style="font-size:14px;color:var(--tx3)">/5</span></div>
            <div style="font-size:11px;color:var(--tx3)">${vagas > 0 ? vagas + ' vaga' + (vagas > 1 ? 's' : '') : 'Lotado'}</div>
          </div>
        </div>

        <div id="rc-lista" style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">
          ${_renderItensLider(vinculos)}
        </div>

        ${_podeGerirRede() && vagas > 0 ? _renderFormAdicionar() : ''}
        ${_podeGerirRede() && vagas === 0 ? `<div style="font-size:12px;color:var(--tx3);text-align:center;padding:12px;border:1px dashed var(--bd2);border-radius:8px">Limite de 5 pessoas atingido. Remova um vínculo para adicionar outro.</div>` : ''}
        ${!_podeGerirRede() ? `<div style="font-size:12px;color:var(--tx3);text-align:center;padding:16px">Você pode visualizar sua rede. Para solicitar alterações, fale com um pastor ou administrador.</div>` : ''}

        <div id="rc-erro" style="display:none;margin-top:12px;padding:10px 14px;border-radius:6px;background:#fee;color:#c00;font-size:12px;border:1px solid #fcc"></div>
        <div id="rc-ok"   style="display:none;margin-top:12px;padding:10px 14px;border-radius:6px;background:#efe;color:#080;font-size:12px;border:1px solid #cfc"></div>

      </div>
    `;

    _bindFormAdicionar(container, pid);
  }

  function _renderItensLider(vinculos) {
    if (vinculos.length === 0) {
      return `<div style="padding:32px 0;text-align:center;color:var(--tx3);font-size:13px">Nenhuma pessoa vinculada ainda.</div>`;
    }
    return vinculos.map(v => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--bg2);border:1px solid var(--bd2);border-radius:8px">
        <div style="font-size:13px;color:var(--tx1);font-weight:500">${escapeHtml(v.cuidado_nome || '—')}</div>
        ${_podeGerirRede() ? `
          <button
            onclick="window._rcRemover('${v.id}')"
            style="font-size:11px;color:var(--danger,#c00);background:transparent;border:1px solid currentColor;border-radius:4px;padding:4px 10px;cursor:pointer"
          >Remover</button>
        ` : ''}
      </div>
    `).join('');
  }

  function _renderFormAdicionar() {
    return `
      <div style="border:1px solid var(--bd2);border-radius:8px;padding:16px;background:var(--bg2)">
        <div style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:12px">Adicionar pessoa à sua rede</div>
        <div style="position:relative">
          <input
            id="rc-busca"
            type="text"
            placeholder="Digite o nome do membro..."
            autocomplete="off"
            style="width:100%;box-sizing:border-box;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:13px;padding:9px 12px;outline:none"
          />
          <div id="rc-suggestions" style="display:none;position:absolute;left:0;right:0;top:100%;background:var(--bg2);border:1px solid var(--bd2);border-top:none;border-radius:0 0 6px 6px;z-index:100;max-height:200px;overflow-y:auto"></div>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--tx3)">Selecione um nome da lista para vincular.</div>
      </div>
    `;
  }

  function _bindFormAdicionar(container, cuidadorId) {
    const inp  = container.querySelector('#rc-busca');
    const sugg = container.querySelector('#rc-suggestions');
    if (!inp) return;

    let _selecionado = null;

    inp.addEventListener('input', () => {
      clearTimeout(_buscaTimeout);
      const termo = inp.value.trim();
      sugg.style.display = 'none';
      _selecionado = null;

      if (termo.length < 2) return;

      _buscaTimeout = setTimeout(async () => {
        const pessoas = await _buscarPessoas(termo);
        if (!pessoas.length) {
          sugg.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:var(--tx3)">Nenhum resultado.</div>';
          sugg.style.display = 'block';
          return;
        }
        sugg.innerHTML = pessoas.map(p => `
          <div
            data-id="${p.id}"
            data-nome="${escapeHtml(p.nome)}"
            style="padding:10px 14px;font-size:13px;color:var(--tx1);cursor:pointer"
            onmouseover="this.style.background='var(--bg3,#eee)'"
            onmouseout="this.style.background=''"
          >${escapeHtml(p.nome)}</div>
        `).join('');
        sugg.style.display = 'block';

        sugg.querySelectorAll('[data-id]').forEach(el => {
          el.addEventListener('click', () => {
            _selecionado = { id: el.dataset.id, nome: el.dataset.nome };
            inp.value = el.dataset.nome;
            sugg.style.display = 'none';
            _confirmarAdicionar(container, cuidadorId, _selecionado);
          });
        });
      }, 300);
    });

    document.addEventListener('click', e => {
      if (!sugg.contains(e.target) && e.target !== inp) sugg.style.display = 'none';
    }, { once: false });
  }

  async function _confirmarAdicionar(container, cuidadorId, pessoa) {
    _setErro(container, '');
    _setOk(container, '');

    // Validação frontend: não pode ser ele mesmo
    if (pessoa.id === cuidadorId) {
      _setErro(container, 'Você não pode se vincular a si mesmo.');
      return;
    }

    // Validação frontend: já está na lista local
    const jaVinculado = (_vinculosCache || []).some(v => v.cuidado_id === pessoa.id);
    if (jaVinculado) {
      _setErro(container, 'Este membro já está na sua rede.');
      return;
    }

    const btn = container.querySelector('#rc-busca');
    if (btn) { btn.disabled = true; btn.placeholder = 'Salvando…'; }

    try {
      const res = await _rpc('adicionar_membro_rede_cuidado', {
        p_cuidador_id: cuidadorId,
        p_cuidado_id:  pessoa.id,
        p_nivel:       1,
      });

      if (!res.ok) {
        _setErro(container, res.erro || 'Erro ao adicionar.');
        return;
      }

      _invalidate();
      _setOk(container, `${pessoa.nome} adicionado à sua rede.`);
      await _renderLider(container);
    } catch (e) {
      _setErro(container, e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.placeholder = 'Digite o nome do membro…'; btn.value = ''; }
    }
  }

  window._rcRemover = async function (vinculoId) {
    if (!confirm('Remover este vínculo da rede de cuidado?')) return;
    const container = document.getElementById('rc-modulo');
    if (!container) return;

    _setErro(container, '');
    _setOk(container, '');

    try {
      const res = await _rpc('remover_membro_rede_cuidado', { p_vinculo_id: vinculoId });
      if (!res.ok) {
        _setErro(container, res.erro || 'Erro ao remover.');
        return;
      }
      _invalidate();
      _setOk(container, 'Vínculo removido.');
      await _renderLider(container);
    } catch (e) {
      _setErro(container, e.message);
    }
  };

  /* ══ TELA ADMIN — VISÃO COMPLETA DA REDE ════════════════════════ */

  async function _renderAdmin(container) {
    container.innerHTML = `<div style="padding:24px 0;color:var(--tx3);font-size:13px;text-align:center">Carregando rede completa…</div>`;

    const todos = await _carregarVinculos();

    // Agrupa por cuidador
    const porCuidador = {};
    todos.forEach(v => {
      if (!porCuidador[v.cuidador_id]) {
        porCuidador[v.cuidador_id] = { nome: v.cuidador_nome, membros: [] };
      }
      porCuidador[v.cuidador_id].membros.push(v.cuidado_nome);
    });

    // Pessoas sem cuidador (requer query separada)
    let semCuidador = [];
    try {
      const comCuidador = todos.map(v => v.cuidado_id);
      const qs = comCuidador.length > 0
        ? `pessoas?deleted_at=is.null&select=id,nome&id=not.in.(${comCuidador.join(',')})&order=nome.asc&limit=200`
        : `pessoas?deleted_at=is.null&select=id,nome&order=nome.asc&limit=200`;
      semCuidador = await _get(qs);
    } catch (_) {}

    container.innerHTML = `
      <div style="max-width:860px;margin:0 auto;padding:24px 0">

        <div style="font-size:18px;font-weight:700;color:var(--tx1);margin-bottom:20px">Rede de Cuidado — Visão Completa</div>

        <!-- Resumo -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
          ${_statCard('Vínculos ativos', todos.length, 'var(--accent)')}
          ${_statCard('Cuidadores', Object.keys(porCuidador).length, 'var(--success,#0a0)')}
          ${_statCard('Sem cuidador', semCuidador.length, semCuidador.length > 0 ? '#c60' : 'var(--tx3)')}
        </div>

        <!-- Cuidadores e seus membros -->
        <div style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">Por cuidador</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:28px">
          ${Object.values(porCuidador).length === 0
            ? '<div style="color:var(--tx3);font-size:13px">Nenhum vínculo cadastrado.</div>'
            : Object.entries(porCuidador).map(([, g]) => `
                <div style="border:1px solid var(--bd2);border-radius:8px;padding:14px 16px;background:var(--bg2)">
                  <div style="font-size:13px;font-weight:600;color:var(--tx1);margin-bottom:8px">
                    ${escapeHtml(g.nome)}
                    <span style="font-size:11px;font-weight:400;color:var(--tx3);margin-left:8px">${g.membros.length}/5</span>
                  </div>
                  <div style="display:flex;flex-wrap:wrap;gap:6px">
                    ${g.membros.map(m => `<span style="font-size:11px;background:var(--bg3,#eee);border-radius:4px;padding:3px 8px;color:var(--tx2)">${escapeHtml(m)}</span>`).join('')}
                  </div>
                </div>
              `).join('')
          }
        </div>

        <!-- Sem cuidador -->
        <div style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">Sem cuidador (${semCuidador.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${semCuidador.length === 0
            ? '<div style="color:var(--tx3);font-size:12px">Todos os membros têm cuidador.</div>'
            : semCuidador.map(p => `<span style="font-size:12px;background:var(--bg2);border:1px solid var(--bd2);border-radius:4px;padding:4px 10px;color:var(--tx2)">${escapeHtml(p.nome)}</span>`).join('')
          }
        </div>

      </div>
    `;
  }

  function _statCard(label, valor, cor) {
    return `
      <div style="border:1px solid var(--bd2);border-radius:8px;padding:14px 16px;background:var(--bg2);text-align:center">
        <div style="font-size:28px;font-weight:800;color:${cor}">${valor}</div>
        <div style="font-size:11px;color:var(--tx3);margin-top:2px">${label}</div>
      </div>
    `;
  }

  /* ══ HELPERS DE FEEDBACK ═════════════════════════════════════════ */

  function _setErro(container, msg) {
    const el = container.querySelector('#rc-erro');
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  function _setOk(container, msg) {
    const el = container.querySelector('#rc-ok');
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
    if (msg) setTimeout(() => { if (el) el.style.display = 'none'; }, 4000);
  }

  /* ══ ENTRY POINT ═════════════════════════════════════════════════ */

  async function redeCuidadoLoad() {
    const container = document.getElementById('rc-modulo');
    if (!container) {
      console.error('[rede-cuidado] #rc-modulo não encontrado');
      return;
    }

    container.innerHTML = '<div style="padding:32px;text-align:center;color:var(--tx3);font-size:13px">Carregando…</div>';
    _invalidate();

    try {
      if (_isAdmin()) {
        // Admin tem duas abas: sua rede + visão completa
        container.innerHTML = `
          <div style="display:flex;gap:4px;margin-bottom:20px">
            <button id="rc-aba-minha" onclick="window._rcAba('minha')" style="font-size:12px;padding:6px 14px;border-radius:6px;border:1px solid var(--bd2);cursor:pointer;background:var(--accent);color:#fff">Minha Rede</button>
            <button id="rc-aba-geral" onclick="window._rcAba('geral')" style="font-size:12px;padding:6px 14px;border-radius:6px;border:1px solid var(--bd2);cursor:pointer;background:var(--bg2);color:var(--tx1)">Visão Geral</button>
          </div>
          <div id="rc-conteudo"></div>
        `;
        await _renderLider(container.querySelector('#rc-conteudo'));

        window._rcAba = async function (aba) {
          const conteudo = document.getElementById('rc-conteudo');
          if (!conteudo) return;
          _invalidate();
          document.getElementById('rc-aba-minha').style.background = aba === 'minha' ? 'var(--accent)' : 'var(--bg2)';
          document.getElementById('rc-aba-minha').style.color      = aba === 'minha' ? '#fff' : 'var(--tx1)';
          document.getElementById('rc-aba-geral').style.background = aba === 'geral' ? 'var(--accent)' : 'var(--bg2)';
          document.getElementById('rc-aba-geral').style.color      = aba === 'geral' ? '#fff' : 'var(--tx1)';
          if (aba === 'minha') await _renderLider(conteudo);
          else await _renderAdmin(conteudo);
        };

      } else {
        await _renderLider(container);
      }
    } catch (e) {
      container.innerHTML = `<div style="padding:24px;color:#c00;font-size:13px">Erro ao carregar: ${escapeHtml(e.message)}</div>`;
    }
  }

  /* ══ EXPORTS ═════════════════════════════════════════════════════ */

  window.redeCuidadoLoad = redeCuidadoLoad;

})();
