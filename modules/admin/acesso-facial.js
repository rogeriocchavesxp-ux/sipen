/* ══════════════════════════════════════════════════════
   CONTROLE DE ACESSO FACIAL — SIPEN
   Módulo administrativo. Não armazena dados biométricos.
══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const TBL = 'acesso_facial';

  const ST = {
    ativo:   { label: 'Ativo',   cor: '#3aaa5c', bg: 'rgba(58,170,92,.13)'  },
    inativo: { label: 'Inativo', cor: '#d06868', bg: 'rgba(208,104,104,.14)' },
  };

  let _registros = [];
  let _pessoas   = [];

  /* ── helpers ─────────────────────────────────────── */

  function _isAdmin() {
    const p = String(USUARIO_ATUAL?.perfil || '').toUpperCase();
    return ['ADMINISTRADOR_GERAL', 'ADM_OPERACIONAL', 'ADMIN_GERAL'].includes(p) || p.includes('ADMIN');
  }
  function _authId()   { return USUARIO_ATUAL?.auth_user_id || null; }
  function _hoje()     { return new Date().toISOString().slice(0, 10); }
  function _fmtDate(v) { return v ? new Date(v + 'T12:00:00').toLocaleDateString('pt-BR') : '—'; }
  function _dn(s)      { return (s || '').toUpperCase(); }

  function _statusPill(st) {
    const s = ST[st] || ST.ativo;
    return `<span style="display:inline-flex;align-items:center;border-radius:999px;padding:3px 8px;background:${s.bg};color:${s.cor};font-size:10px;font-weight:800">${escapeHtml(s.label)}</span>`;
  }

  function _pessoaNome(id) {
    if (!id) return '';
    return _pessoas.find(p => p.id === id)?.nome || '';
  }

  function _erro(e) {
    const msg = e?.message || String(e || 'Erro desconhecido');
    if (msg.includes('does not exist') || msg.includes('PGRST205'))
      return 'Execute o script acesso-facial.sql no Supabase Dashboard.';
    if (msg.includes('permission denied') || msg.includes('row-level security'))
      return 'Sem permissão. Verifique o login administrativo.';
    if (msg.includes('duplicate key') || msg.includes('unique'))
      return 'Esta pessoa já possui um registro de acesso facial.';
    return msg;
  }

  /* ── paginação de pessoas ────────────────────────── */

  async function _fetchPessoas() {
    const PAGE = 1000;
    let all = [], from = 0;
    const sb = getSupabase();
    while (true) {
      const { data, error } = await sb.from('pessoas')
        .select('id,nome')
        .is('deleted_at', null)
        .order('nome', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data?.length) break;
      all = all.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return all;
  }

  /* ── carregar ────────────────────────────────────── */

  async function afCarregar() {
    const el = document.getElementById('af-list');
    if (!el) return;
    if (!_isAdmin()) {
      el.innerHTML = `<div style="color:var(--rose);font-size:12px">Acesso restrito a administradores.</div>`;
      return;
    }
    el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px">${spinner()} Carregando...</div>`;
    try {
      const sb = getSupabase();
      const [{ data, error }, pessoas] = await Promise.all([
        sb.from(TBL).select('*').order('created_at', { ascending: false }),
        _fetchPessoas(),
      ]);
      if (error) throw error;
      _registros = Array.isArray(data) ? data : [];
      _pessoas   = pessoas;
      afRender();
    } catch (e) {
      console.error('acesso-facial carregar:', e);
      el.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(_erro(e))}</div>`;
    }
  }

  /* ── filtrar ─────────────────────────────────────── */

  function _filtrados() {
    const busca   = (document.getElementById('af-f-busca')?.value   || '').toLowerCase().trim();
    const status  =  document.getElementById('af-f-status')?.value  || '';
    const vinculo =  document.getElementById('af-f-vinculo')?.value || '';
    return _registros.filter(r => {
      const nome  = _pessoaNome(r.pessoa_id).toLowerCase();
      const nomei = (r.nome_importado || '').toLowerCase();
      const fBusca  = !busca   || nome.includes(busca) || nomei.includes(busca);
      const fStatus = !status  || r.status === status;
      const fVinculo = !vinculo
        || (vinculo === 'vinculado'     && !!r.pessoa_id)
        || (vinculo === 'nao_vinculado' && !r.pessoa_id);
      return fBusca && fStatus && fVinculo;
    }).sort((a, b) => {
      const na = _pessoaNome(a.pessoa_id) || a.nome_importado || '';
      const nb = _pessoaNome(b.pessoa_id) || b.nome_importado || '';
      return na.localeCompare(nb, 'pt-BR', { sensitivity: 'base' });
    });
  }

  /* ── render ──────────────────────────────────────── */

  function afRender() {
    const el = document.getElementById('af-list');
    if (!el) return;
    const rows = _filtrados();
    const _sv  = (id, v) => { const x = document.getElementById(id); if (x) x.textContent = v; };
    _sv('af-kpi-total',   _registros.length);
    _sv('af-kpi-ativos',  _registros.filter(r => r.status === 'ativo').length);
    _sv('af-kpi-inativos',_registros.filter(r => r.status === 'inativo').length);
    _sv('af-kpi-nv',      _registros.filter(r => !r.pessoa_id).length);

    if (!rows.length) {
      el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:14px 0">Nenhum registro encontrado.</div>`;
      return;
    }

    el.innerHTML = `<div style="overflow:auto">
      <table style="width:100%;border-collapse:collapse;font-size:11.5px;min-width:760px">
        <thead><tr style="border-bottom:1px solid var(--bd2);background:var(--bg-surface)">
          <th style="text-align:left;padding:9px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase">Nome</th>
          <th style="text-align:left;padding:9px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase">Status</th>
          <th style="text-align:left;padding:9px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase">Data Cadastro</th>
          <th style="text-align:left;padding:9px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase">Observações</th>
          <th style="text-align:right;padding:9px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase">Ações</th>
        </tr></thead>
        <tbody>${rows.map(r => {
          const nome = r.pessoa_id ? _dn(_pessoaNome(r.pessoa_id)) : '';
          const nomeCell = r.pessoa_id
            ? `<span style="color:var(--tx1);font-weight:700">${escapeHtml(nome)}</span>`
            : `<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
                <span style="font-size:10px;font-weight:700;color:var(--amber)">${escapeHtml(_dn(r.nome_importado || ''))}</span>
                <span style="border-radius:999px;padding:2px 7px;background:rgba(212,168,67,.15);color:#d4a843;font-size:9px;font-weight:800">Não vinculado</span>
                <button onclick="afVincular('${escapeHtmlAttr(r.id)}')" style="background:none;border:1px solid rgba(42,181,192,.35);border-radius:5px;color:var(--teal);font-size:9.5px;font-weight:800;padding:3px 7px;cursor:pointer">Vincular</button>
              </div>`;
          const inativoBt = r.status === 'ativo'
            ? `<button onclick="afAlterarStatus('${escapeHtmlAttr(r.id)}','inativo')" style="background:none;border:1px solid rgba(208,104,104,.3);border-radius:5px;color:var(--rose);font-size:9.5px;font-weight:800;padding:4px 8px;cursor:pointer">Inativar</button>`
            : `<button onclick="afAlterarStatus('${escapeHtmlAttr(r.id)}','ativo')" style="background:none;border:1px solid rgba(58,170,92,.3);border-radius:5px;color:var(--gr);font-size:9.5px;font-weight:800;padding:4px 8px;cursor:pointer">Reativar</button>`;
          return `<tr style="border-bottom:1px solid var(--bd1)">
            <td style="padding:9px 10px">${nomeCell}</td>
            <td style="padding:9px 10px">${_statusPill(r.status)}</td>
            <td style="padding:9px 10px;color:var(--tx2);font-family:var(--mono)">${escapeHtml(_fmtDate(r.data_cadastro_facial))}</td>
            <td style="padding:9px 10px;color:var(--tx3);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtmlAttr(r.observacoes || '')}">${escapeHtml(r.observacoes || '—')}</td>
            <td style="padding:9px 10px;text-align:right;white-space:nowrap;display:flex;gap:5px;justify-content:flex-end">
              ${inativoBt}
              <button onclick="afAbrirModal('${escapeHtmlAttr(r.id)}')" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:5px;color:var(--tx2);font-size:9.5px;font-weight:800;padding:4px 9px;cursor:pointer">Editar</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
  }

  /* ── modal add/edit ──────────────────────────────── */

  function _getModal() {
    let m = document.getElementById('af-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'af-modal';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:340;display:flex;align-items:center;justify-content:center';
      document.body.appendChild(m);
    }
    return m;
  }

  async function afAbrirModal(id = '') {
    if (!_pessoas.length) await afCarregar();
    const reg = id ? _registros.find(r => r.id === id) : null;
    const modal = _getModal();

    const pessoasDisponiveis = _pessoas.filter(p => {
      if (reg?.pessoa_id === p.id) return true;
      return !_registros.find(r => r.pessoa_id === p.id);
    });

    const optsSelect = `<option value="">— Selecionar pelo nome —</option>` +
      pessoasDisponiveis.map(p =>
        `<option value="${escapeHtmlAttr(p.id)}"${reg?.pessoa_id === p.id ? ' selected' : ''}>${escapeHtml(_dn(p.nome))}</option>`
      ).join('');

    modal.innerHTML = `<div style="width:min(560px,94vw);max-height:90vh;overflow:auto;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:22px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
        <div style="font-size:20px">⊙</div>
        <div>
          <div style="font-size:14px;font-weight:800;color:var(--tx1)">${reg ? 'Editar' : 'Novo'} cadastro facial</div>
          <div style="font-size:10.5px;color:var(--tx3)">Controle administrativo — sem dados biométricos</div>
        </div>
        <button onclick="afFecharModal()" style="margin-left:auto;background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer">✕</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr;gap:10px">
        <div>
          <label class="flb">Pessoa <span style="color:var(--rose)">*</span></label>
          <div style="position:relative">
            <input id="af-busca-pessoa" class="fi2" placeholder="Digite o nome para filtrar..." autocomplete="off"
              value="${escapeHtmlAttr(reg ? _dn(_pessoaNome(reg.pessoa_id)) : '')}"
              oninput="afFiltrarPessoas(this.value)"
              style="padding-right:32px">
            <div id="af-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:200px;overflow-y:auto;background:var(--bg-card);border:1px solid var(--bd2);border-radius:0 0 6px 6px;z-index:10;box-shadow:0 8px 20px rgba(0,0,0,.3)"></div>
          </div>
          <input type="hidden" id="af-pessoa-id" value="${escapeHtmlAttr(reg?.pessoa_id || '')}">
        </div>
        <div>
          <label class="flb">Status</label>
          <select id="af-status" class="fi2">
            <option value="ativo"${(reg?.status || 'ativo') === 'ativo' ? ' selected' : ''}>Ativo</option>
            <option value="inativo"${reg?.status === 'inativo' ? ' selected' : ''}>Inativo</option>
          </select>
        </div>
        <div>
          <label class="flb">Data do cadastro facial</label>
          <input id="af-data" type="date" class="fi2" value="${escapeHtmlAttr(reg?.data_cadastro_facial || '')}">
        </div>
        <div>
          <label class="flb">Observações</label>
          <textarea id="af-obs" class="fi2" rows="3" placeholder="Ex.: cadastrado no módulo facial da portaria principal">${escapeHtml(reg?.observacoes || '')}</textarea>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <button class="btn" onclick="afFecharModal()">Cancelar</button>
        <button class="btn btn-p" onclick="afSalvar('${escapeHtmlAttr(id)}')">Salvar</button>
      </div>
    </div>`;

    // Inicializa lista do dropdown com as pessoas disponíveis
    _dropdownPessoas = pessoasDisponiveis;
    modal.querySelector('#af-busca-pessoa').focus();
  }

  let _dropdownPessoas = [];

  function afFiltrarPessoas(q) {
    const dd = document.getElementById('af-dropdown');
    if (!dd) return;
    const termo = q.trim().toLowerCase();
    if (!termo) { dd.style.display = 'none'; return; }
    const matches = _dropdownPessoas
      .filter(p => _norm(p.nome).includes(_norm(termo)))
      .slice(0, 40);
    if (!matches.length) { dd.style.display = 'none'; return; }
    dd.style.display = 'block';
    dd.innerHTML = matches.map(p =>
      `<div onclick="afSelecionarPessoa('${escapeHtmlAttr(p.id)}','${escapeHtmlAttr(p.nome)}')"
        style="padding:8px 11px;cursor:pointer;font-size:11.5px;color:var(--tx1);border-bottom:1px solid var(--bd1)"
        onmouseenter="this.style.background='var(--bg-hover)'"
        onmouseleave="this.style.background=''">${escapeHtml(_dn(p.nome))}</div>`
    ).join('');
  }

  function afSelecionarPessoa(id, nome) {
    const inp  = document.getElementById('af-busca-pessoa');
    const hid  = document.getElementById('af-pessoa-id');
    const dd   = document.getElementById('af-dropdown');
    if (inp) inp.value  = _dn(nome);
    if (hid) hid.value  = id;
    if (dd)  dd.style.display = 'none';
  }

  async function afVincular(id) {
    await afAbrirModal(id);
  }

  async function afSalvar(id = '') {
    const pessoa_id          = (document.getElementById('af-pessoa-id')?.value || '').trim() || null;
    const status             = document.getElementById('af-status')?.value || 'ativo';
    const data_cadastro_facial = document.getElementById('af-data')?.value || null;
    const observacoes        = (document.getElementById('af-obs')?.value || '').trim();

    if (!pessoa_id) return T('Campo obrigatório', 'Selecione uma pessoa na lista.');

    const payload = { pessoa_id, status, data_cadastro_facial: data_cadastro_facial || null, observacoes, updated_by: _authId() };
    if (!id) payload.created_by = _authId();

    try {
      const sb  = getSupabase();
      const req = id
        ? sb.from(TBL).update(payload).eq('id', id).select().single()
        : sb.from(TBL).insert(payload).select().single();
      const { data, error } = await req;
      if (error) throw error;
      afFecharModal();
      T('Cadastro salvo', `${_dn(_pessoaNome(data.pessoa_id))} registrado com sucesso.`);
      await afCarregar();
    } catch (e) {
      console.error('af salvar:', e);
      T('Erro ao salvar', _erro(e));
    }
  }

  async function afAlterarStatus(id, novoStatus) {
    const reg = _registros.find(r => r.id === id);
    if (!reg) return;
    const label = ST[novoStatus]?.label || novoStatus;
    if (!confirm(`Marcar "${_dn(_pessoaNome(reg.pessoa_id) || reg.nome_importado)}" como ${label}?`)) return;
    try {
      const { error } = await getSupabase().from(TBL).update({ status: novoStatus, updated_by: _authId() }).eq('id', id);
      if (error) throw error;
      const idx = _registros.findIndex(r => r.id === id);
      if (idx >= 0) _registros[idx] = { ..._registros[idx], status: novoStatus };
      afRender();
      T('Status atualizado', label);
    } catch (e) { T('Erro ao atualizar', _erro(e)); }
  }

  function afFecharModal() {
    document.getElementById('af-modal')?.remove();
    document.getElementById('af-wizard')?.remove();
  }

  /* ── normalização para matching ─────────────────── */

  function _norm(s) {
    return (s || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function _similitude(a, b) {
    const s1 = _norm(a), s2 = _norm(b);
    if (!s1 || !s2) return 0;
    if (s1 === s2)  return 1;
    // Pontuação composta: Levenshtein + cobertura de palavras
    const m = s1.length, n = s2.length;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = s1[i-1] === s2[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    const lev = 1 - dp[m][n] / Math.max(m, n);

    // Cobertura de palavras (quantas palavras do menor aparecem no maior)
    const w1 = s1.split(' '), w2 = s2.split(' ');
    const [shorter, longer] = w1.length <= w2.length ? [w1, w2] : [w2, w1];
    const match = shorter.filter(w => w.length > 1 && longer.some(lw => lw.startsWith(w) || w.startsWith(lw)));
    const cob = shorter.length ? match.length / shorter.length : 0;

    return Math.max(lev, cob * 0.9);
  }

  function _buscarMelhorMatch(nome) {
    let best = null, bestSim = 0;
    for (const p of _pessoas) {
      const sim = _similitude(nome, p.nome);
      if (sim > bestSim) { bestSim = sim; best = p; }
    }
    return { pessoa: best, sim: bestSim };
  }

  /* ── wizard de importação ────────────────────────── */

  function afImportar() {
    if (!_isAdmin()) return T('Acesso negado', 'Apenas administradores podem importar.');
    const w = document.getElementById('af-wizard') || (() => {
      const el = document.createElement('div');
      el.id = 'af-wizard';
      el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:350;display:flex;align-items:center;justify-content:center';
      document.body.appendChild(el);
      return el;
    })();

    w.innerHTML = `<div style="width:min(680px,95vw);max-height:92vh;overflow-y:auto;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:24px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
        <div style="font-size:20px">↑</div>
        <div>
          <div style="font-size:14px;font-weight:800;color:var(--tx1)">Importar Lista de Acesso Facial</div>
          <div style="font-size:10.5px;color:var(--tx3)">Cole os nomes extraídos do PDF — um por linha</div>
        </div>
        <button onclick="afFecharModal()" style="margin-left:auto;background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer">✕</button>
      </div>

      <div style="background:rgba(212,168,67,.07);border:1px solid rgba(212,168,67,.2);border-radius:6px;padding:10px 13px;font-size:11px;color:var(--tx2);margin-bottom:14px;line-height:1.6">
        ⚠ Cole os nomes como aparecem no PDF. O sistema comparará com o banco, sugerirá correspondências e permitirá revisão antes de salvar. Nenhum dado biométrico é armazenado.
      </div>

      <label class="flb">Nomes (um por linha)</label>
      <textarea id="af-import-nomes" class="fi2" rows="12" placeholder="JOÃO DA SILVA&#10;MARIA APARECIDA SANTOS&#10;PEDRO ALVES&#10;..."></textarea>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
        <button class="btn" onclick="afFecharModal()">Cancelar</button>
        <button class="btn btn-p" onclick="afAnalisarImportacao()">Analisar →</button>
      </div>
    </div>`;
  }

  async function afAnalisarImportacao() {
    if (!_pessoas.length) await _fetchPessoas().then(p => { _pessoas = p; });

    const raw = (document.getElementById('af-import-nomes')?.value || '').trim();
    if (!raw) return T('Lista vazia', 'Cole pelo menos um nome.');

    const nomes = [...new Set(
      raw.split('\n').map(s => s.trim()).filter(s => s.length > 1)
    )];
    if (!nomes.length) return T('Lista vazia', 'Nenhum nome válido encontrado.');

    const jaImportados = new Set(_registros.map(r => r.pessoa_id).filter(Boolean));
    const resultados   = nomes.map(nome => {
      const { pessoa, sim } = _buscarMelhorMatch(nome);
      const tipo = sim >= 0.97 ? 'exato'
                 : sim >= 0.72 ? 'provavel'
                 : 'sem_match';
      const jaCadastrado = pessoa && jaImportados.has(pessoa.id);
      return { nome, pessoa, sim, tipo, jaCadastrado, selecionado: tipo !== 'sem_match' && !jaCadastrado };
    });

    _renderWizardResultados(resultados);
  }

  let _wzResultados = [];

  function _renderWizardResultados(resultados) {
    _wzResultados = resultados;
    const w = document.getElementById('af-wizard');
    if (!w) return;

    const semMatch  = resultados.filter(r => r.tipo === 'sem_match');
    const jaCad     = resultados.filter(r => r.jaCadastrado);
    const novos     = resultados.filter(r => r.tipo !== 'sem_match' && !r.jaCadastrado);

    w.innerHTML = `<div style="width:min(820px,97vw);max-height:94vh;overflow-y:auto;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:24px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div style="font-size:18px">↑</div>
        <div>
          <div style="font-size:13px;font-weight:800;color:var(--tx1)">Resultado da Análise</div>
          <div style="font-size:10.5px;color:var(--tx3)">${resultados.length} nomes analisados · marque os que deseja importar</div>
        </div>
        <button onclick="afFecharModal()" style="margin-left:auto;background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer">✕</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
        <div style="background:rgba(58,170,92,.08);border:1px solid rgba(58,170,92,.2);border-radius:6px;padding:10px 12px;text-align:center">
          <div style="font-size:18px;font-weight:800;color:var(--gr)">${novos.length}</div>
          <div style="font-size:10px;color:var(--tx3);margin-top:2px">Para importar</div>
        </div>
        <div style="background:rgba(212,168,67,.08);border:1px solid rgba(212,168,67,.2);border-radius:6px;padding:10px 12px;text-align:center">
          <div style="font-size:18px;font-weight:800;color:var(--amber)">${semMatch.length}</div>
          <div style="font-size:10px;color:var(--tx3);margin-top:2px">Sem correspondência</div>
        </div>
        <div style="background:rgba(42,181,192,.08);border:1px solid rgba(42,181,192,.2);border-radius:6px;padding:10px 12px;text-align:center">
          <div style="font-size:18px;font-weight:800;color:var(--teal)">${jaCad.length}</div>
          <div style="font-size:10px;color:var(--tx3);margin-top:2px">Já cadastrados</div>
        </div>
      </div>

      <div style="border:1px solid var(--bd1);border-radius:8px;overflow:hidden;margin-bottom:14px">
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="background:var(--bg-surface);border-bottom:1px solid var(--bd2)">
            <th style="padding:8px 10px;text-align:center;color:var(--tx3);font-size:9.5px;text-transform:uppercase;width:36px">
              <input type="checkbox" id="af-sel-all" onchange="afToggleAll(this.checked)" title="Selecionar todos importáveis">
            </th>
            <th style="padding:8px 10px;text-align:left;color:var(--tx3);font-size:9.5px;text-transform:uppercase">Nome do PDF</th>
            <th style="padding:8px 10px;text-align:left;color:var(--tx3);font-size:9.5px;text-transform:uppercase">Correspondência no banco</th>
            <th style="padding:8px 10px;text-align:center;color:var(--tx3);font-size:9.5px;text-transform:uppercase">Conf.</th>
            <th style="padding:8px 10px;text-align:center;color:var(--tx3);font-size:9.5px;text-transform:uppercase">Situação</th>
          </tr></thead>
          <tbody>
          ${resultados.map((r, i) => {
            const cor = r.tipo === 'exato'   ? '#3aaa5c'
                      : r.tipo === 'provavel' ? '#d4a843'
                      : '#9aa4b2';
            const siLabel = r.tipo === 'exato'   ? 'Exato'
                          : r.tipo === 'provavel' ? `${Math.round(r.sim * 100)}%`
                          : '—';
            const situacao = r.jaCadastrado
              ? `<span style="border-radius:999px;padding:2px 7px;background:rgba(42,181,192,.13);color:var(--teal);font-size:9px;font-weight:800">Já cadastrado</span>`
              : r.tipo === 'sem_match'
                ? `<span style="border-radius:999px;padding:2px 7px;background:rgba(154,164,178,.13);color:var(--tx3);font-size:9px;font-weight:800">Sem match</span>`
                : r.tipo === 'exato'
                  ? `<span style="border-radius:999px;padding:2px 7px;background:rgba(58,170,92,.13);color:var(--gr);font-size:9px;font-weight:800">Exato</span>`
                  : `<span style="border-radius:999px;padding:2px 7px;background:rgba(212,168,67,.13);color:var(--amber);font-size:9px;font-weight:800">Provável</span>`;
            const disabled = r.jaCadastrado || r.tipo === 'sem_match';

            // Select para override de pessoa
            const pessoaSelect = r.tipo !== 'sem_match'
              ? `<select id="af-wz-pid-${i}" style="background:var(--bg-input);border:1px solid var(--bd${r.tipo === 'provavel' ? '3' : '1'});border-radius:5px;color:var(--tx1);font-size:10.5px;padding:4px 6px;max-width:260px">
                  ${_pessoas.map(p => `<option value="${escapeHtmlAttr(p.id)}"${r.pessoa?.id === p.id ? ' selected' : ''}>${escapeHtml(_dn(p.nome))}</option>`).join('')}
                </select>`
              : `<span style="color:var(--tx3);font-size:10px;font-style:italic">não encontrado</span>`;

            return `<tr style="border-bottom:1px solid var(--bd1);${disabled ? 'opacity:.5' : ''}">
              <td style="padding:7px 10px;text-align:center">
                <input type="checkbox" id="af-wz-ck-${i}" ${r.selecionado && !disabled ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
              </td>
              <td style="padding:7px 10px;color:var(--tx1);font-weight:600">${escapeHtml(r.nome)}</td>
              <td style="padding:7px 10px">${pessoaSelect}</td>
              <td style="padding:7px 10px;text-align:center;font-size:10px;font-weight:800;color:${cor}">${siLabel}</td>
              <td style="padding:7px 10px;text-align:center">${situacao}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>

      <div style="display:flex;gap:8px;justify-content:space-between;align-items:center">
        <button class="btn" onclick="afImportar()">← Voltar</button>
        <div style="display:flex;gap:8px">
          <button class="btn" onclick="afFecharModal()">Cancelar</button>
          <button class="btn btn-p" onclick="afConfirmarImportacao(${resultados.length})">Importar selecionados</button>
        </div>
      </div>
    </div>`;

    // marcar o "selecionar todos" se todos estiverem selecionados
    const allSel = document.getElementById('af-sel-all');
    const importaveis = resultados.filter(r => !r.jaCadastrado && r.tipo !== 'sem_match');
    const todosOk     = importaveis.every(r => r.selecionado);
    if (allSel) allSel.checked = todosOk && importaveis.length > 0;
  }

  function afToggleAll(checked) {
    _wzResultados.forEach((r, i) => {
      if (!r.jaCadastrado && r.tipo !== 'sem_match') {
        const ck = document.getElementById(`af-wz-ck-${i}`);
        if (ck) ck.checked = checked;
      }
    });
  }

  async function afConfirmarImportacao(total) {
    const para_inserir = [];
    for (let i = 0; i < total; i++) {
      const ck = document.getElementById(`af-wz-ck-${i}`);
      if (!ck?.checked) continue;
      const pid = document.getElementById(`af-wz-pid-${i}`)?.value;
      if (!pid) continue;
      const nomePdf = _wzResultados[i]?.nome || '';
      // verificar se pessoa já existe no banco de acesso_facial
      if (_registros.find(r => r.pessoa_id === pid)) continue;
      para_inserir.push({ pessoa_id: pid, nome_importado: nomePdf, status: 'ativo', created_by: _authId() });
    }

    if (!para_inserir.length) return T('Nenhum item', 'Marque pelo menos um registro para importar.');
    if (!confirm(`Importar ${para_inserir.length} registro(s) de acesso facial?`)) return;

    try {
      const { error } = await getSupabase().from(TBL).insert(para_inserir);
      if (error) throw error;
      afFecharModal();
      T('Importação concluída', `${para_inserir.length} registro(s) importados.`);
      await afCarregar();
    } catch (e) {
      console.error('af importar:', e);
      T('Erro na importação', _erro(e));
    }
  }

  /* ── impressão ───────────────────────────────────── */

  function afPrint() {
    const rows = _filtrados();
    const now  = new Date();
    const em   = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Acesso Facial — SIPEN</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px}
    h2{margin:0 0 4px;font-size:16px}
    .sub{font-size:10px;color:#666;margin-bottom:16px}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;padding:7px 8px;background:#f0f0f0;border-bottom:2px solid #ccc;font-size:10px;text-transform:uppercase}
    td{padding:7px 8px;border-bottom:1px solid #e0e0e0;font-size:11px}
    .ativo{color:#1a7a3c;font-weight:700} .inativo{color:#c0392b}
    .footer{margin-top:20px;font-size:9px;color:#888;text-align:center}
    </style></head><body>
    <h2>Controle de Acesso Facial — SIPEN</h2>
    <div class="sub">Emissão: ${em} · Total: ${rows.length} registros</div>
    <table>
      <thead><tr><th>#</th><th>Nome</th><th>Status</th><th>Data Cadastro</th><th>Observações</th></tr></thead>
      <tbody>${rows.map((r, i) => {
        const nome = r.pessoa_id ? _dn(_pessoaNome(r.pessoa_id)) : _dn(r.nome_importado || '—');
        const st   = ST[r.status]?.label || r.status;
        return `<tr>
          <td>${i + 1}</td><td>${nome}</td>
          <td class="${r.status}">${st}</td>
          <td>${_fmtDate(r.data_cadastro_facial)}</td>
          <td>${r.observacoes || ''}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>
    <div class="footer">Documento gerado automaticamente pelo SIPEN · Nenhum dado biométrico é armazenado neste sistema</div>
    <script>window.onload=()=>window.print();<\/script>
    </body></html>`;
    const win = window.open('', '_blank');
    if (!win) return T('Bloqueio de popup', 'Permita popups para imprimir.');
    win.document.write(html);
    win.document.close();
  }

  /* ── exports ─────────────────────────────────────── */

  window.afCarregar          = afCarregar;
  window.afRender            = afRender;
  window.afAbrirModal        = afAbrirModal;
  window.afFecharModal       = afFecharModal;
  window.afSalvar            = afSalvar;
  window.afAlterarStatus     = afAlterarStatus;
  window.afVincular          = afVincular;
  window.afFiltrarPessoas    = afFiltrarPessoas;
  window.afSelecionarPessoa  = afSelecionarPessoa;
  window.afImportar          = afImportar;
  window.afAnalisarImportacao = afAnalisarImportacao;
  window.afConfirmarImportacao = afConfirmarImportacao;
  window.afToggleAll         = afToggleAll;
  window.afPrint             = afPrint;
})();
