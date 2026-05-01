/* ministerios.js — v1.0
 * Módulo Ministerial > Ministérios
 * Lista de ministérios em cards + painel de detalhe com liderança e membros
 */
(function () {
  'use strict';

  /* ── helpers de perfil ─────────────────────────────────────── */
  function _isGestor() {
    const p = USUARIO_ATUAL?.perfil;
    return ['ADMINISTRADOR_GERAL','CONSELHO','PASTORAL','ADM_OPERACIONAL'].includes(p);
  }
  function _isLider() {
    const p = USUARIO_ATUAL?.perfil;
    return p === 'LIDER_MINISTERIO' || p === 'LIDER_AREA';
  }
  function _podeEditar() { return _isGestor() || _isLider(); }

  /* ── estado ────────────────────────────────────────────────── */
  let _ministerioAtual = null;

  /* ── cabeçalhos Supabase ───────────────────────────────────── */
  function _hdr() {
    return { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY };
  }

  /* ── load da lista ─────────────────────────────────────────── */
  async function minMinLoad() {
    document.getElementById('min-min-painel-detalhe').style.display = 'none';
    document.getElementById('min-min-painel-lista').style.display   = '';
    _ministerioAtual = null;

    const heroAct = document.getElementById('min-min-hero-act');
    if (heroAct) heroAct.style.display = _isGestor() ? '' : 'none';

    const grid = document.getElementById('min-min-grid');
    grid.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center;grid-column:1/-1">Carregando...</div>';

    try {
      let url = `${SUPABASE_URL}/rest/v1/ministerios?select=id,nome,descricao,tipo,ativo&order=nome.asc`;

      if (!_isGestor()) {
        const ids = USUARIO_ATUAL?.ministerios;
        if (!ids || ids.length === 0) {
          grid.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center;grid-column:1/-1">Nenhum ministério associado ao seu perfil.</div>';
          return;
        }
        url += `&id=in.(${ids.join(',')})`;
      }

      const r = await fetch(url, { headers: _hdr() });
      const lista = r.ok ? await r.json() : [];

      if (lista.length === 0) {
        grid.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center;grid-column:1/-1">Nenhum ministério encontrado.</div>';
        return;
      }

      grid.innerHTML = lista.map(_cardMinisterio).join('');
    } catch (_) {
      grid.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:32px 0;text-align:center;grid-column:1/-1">Erro ao carregar ministérios.</div>';
    }
  }

  function _cardMinisterio(m) {
    const icones = {
      MUSICA:'🎵', JOVENS:'🔥', INFANTIL:'👶', INTERCESSAO:'🙏',
      EVANGELISMO:'✝️', DIACONIA:'🤝', COMUNICACAO:'📢', OUTRO:'⭐'
    };
    const ic = icones[m.tipo] || '⭐';
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
          <div>
            <div style="font-weight:700;color:var(--tx1);font-size:14px">${m.nome}${inativoTag}</div>
            ${tipoLabel ? `<div style="font-size:11px;color:var(--tx3);margin-top:1px">${tipoLabel}</div>` : ''}
          </div>
        </div>
        ${m.descricao ? `<div style="font-size:12px;color:var(--tx2);line-height:1.5;border-top:1px solid var(--bd1);padding-top:8px">${m.descricao}</div>` : ''}
        <div style="margin-top:10px;text-align:right;font-size:11.5px;color:var(--violet)">Ver detalhes →</div>
      </div>`;
  }

  /* ── abrir detalhe ─────────────────────────────────────────── */
  async function minMinAbrir(id) {
    _ministerioAtual = id;
    document.getElementById('min-min-painel-lista').style.display   = 'none';
    document.getElementById('min-min-painel-detalhe').style.display = '';

    const header = document.getElementById('min-min-detalhe-header');
    const memList = document.getElementById('min-min-membro-list');
    const memCount = document.getElementById('min-min-membro-count');
    const btnAdd = document.getElementById('min-min-btn-add-membro');

    header.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:16px 0">Carregando...</div>';
    memList.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:16px 0">Carregando...</div>';
    memCount.textContent = '';
    if (btnAdd) btnAdd.style.display = _podeEditar() ? '' : 'none';

    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ministerios?id=eq.${id}&select=id,nome,descricao,tipo,ativo,supervisor,conselheiro,coordenador,lider_area`,
        { headers: _hdr() }
      );
      const dados = r.ok ? await r.json() : [];
      const m = dados[0];
      if (!m) {
        header.innerHTML = '<div style="color:var(--rose);font-size:13px">Ministério não encontrado.</div>';
        return;
      }

      const _buscaNome = async (pessoaId) => {
        if (!pessoaId) return null;
        const rp = await fetch(
          `${SUPABASE_URL}/rest/v1/pessoas?id=eq.${pessoaId}&select=nome`,
          { headers: _hdr() }
        );
        const d = rp.ok ? await rp.json() : [];
        return d[0]?.nome || null;
      };

      const [nSup, nCon, nCoo, nLid] = await Promise.all([
        _buscaNome(m.supervisor), _buscaNome(m.conselheiro),
        _buscaNome(m.coordenador), _buscaNome(m.lider_area)
      ]);

      const icones = {
        MUSICA:'🎵', JOVENS:'🔥', INFANTIL:'👶', INTERCESSAO:'🙏',
        EVANGELISMO:'✝️', DIACONIA:'🤝', COMUNICACAO:'📢', OUTRO:'⭐'
      };
      const ic = icones[m.tipo] || '⭐';
      const tipoLabel = m.tipo ? m.tipo.charAt(0) + m.tipo.slice(1).toLowerCase() : '';

      const _linhaCargo = (label, nome) => nome
        ? `<div style="display:flex;gap:8px;align-items:baseline;margin-bottom:6px">
             <span style="font-size:11px;color:var(--tx3);min-width:110px">${label}</span>
             <span style="font-size:13px;font-weight:600;color:var(--tx1)">${nome}</span>
           </div>`
        : '';

      const temLideranca = nSup || nCon || nCoo || nLid;

      header.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
          <div style="width:48px;height:48px;border-radius:12px;background:var(--violetbg);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">${ic}</div>
          <div style="flex:1;min-width:180px">
            <div style="font-size:18px;font-weight:800;color:var(--tx1);margin-bottom:2px">${m.nome}
              ${m.ativo === false ? '<span style="font-size:11px;padding:2px 8px;background:#fee2e2;color:var(--rose);border-radius:20px;margin-left:6px">Inativo</span>' : ''}
            </div>
            ${tipoLabel ? `<div style="font-size:12px;color:var(--tx3);margin-bottom:8px">${tipoLabel}</div>` : ''}
            ${m.descricao ? `<div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:10px">${m.descricao}</div>` : ''}
            ${temLideranca ? `
              <div style="border-top:1px solid var(--bd1);padding-top:10px;margin-top:4px">
                <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Liderança</div>
                ${_linhaCargo('Supervisor', nSup)}
                ${_linhaCargo('Conselheiro', nCon)}
                ${_linhaCargo('Coordenador', nCoo)}
                ${_linhaCargo('Líder de Área', nLid)}
              </div>` : ''}
          </div>
        </div>`;

      await _carregarMembros(id);

    } catch (_) {
      header.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:12px">Erro ao carregar dados do ministério.</div>';
    }
  }

  /* ── membros do ministério ─────────────────────────────────── */
  async function _carregarMembros(ministerioId) {
    const el = document.getElementById('min-min-membro-list');
    const cnt = document.getElementById('min-min-membro-count');
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/membros?ministerios=cs.{"${ministerioId}"}&select=id,pessoas(nome,email,telefone),cargo_ministerial,ativo&order=pessoas(nome).asc`,
        { headers: _hdr() }
      );
      const lista = r.ok ? await r.json() : [];
      const ativos = lista.filter(x => x.ativo !== false);
      cnt.textContent = `(${ativos.length})`;

      if (lista.length === 0) {
        el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:16px 0;text-align:center">Nenhum membro associado a este ministério.</div>';
        return;
      }

      el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="border-bottom:2px solid var(--bd1)">
          <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Nome</th>
          <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Cargo</th>
          <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Contato</th>
        </tr></thead>
        <tbody>${lista.map(mb => {
          const nome  = mb.pessoas?.nome     || '—';
          const tel   = mb.pessoas?.telefone || '';
          const email = mb.pessoas?.email    || '';
          const cargo = mb.cargo_ministerial || '—';
          const tag   = mb.ativo === false
            ? ' <span style="font-size:10px;color:var(--rose)">(inativo)</span>' : '';
          return `<tr style="border-bottom:1px solid var(--bd1)">
            <td style="padding:7px 8px;color:var(--tx1);font-weight:500">${nome}${tag}</td>
            <td style="padding:7px 8px;color:var(--tx2)">${cargo}</td>
            <td style="padding:7px 8px;color:var(--tx3);font-size:12px">${tel || email || '—'}</td>
          </tr>`;
        }).join('')}</tbody></table>`;
    } catch (_) {
      el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0">Erro ao carregar membros.</div>';
    }
  }

  /* ── voltar à lista ────────────────────────────────────────── */
  function minMinVoltarLista() {
    _ministerioAtual = null;
    document.getElementById('min-min-painel-detalhe').style.display = 'none';
    document.getElementById('min-min-painel-lista').style.display   = '';
  }

  /* ── novo ministério — apenas gestores ────────────────────── */
  function minMinNovo() {
    alert('Cadastro de novo ministério em breve.');
  }

  /* ── adicionar membro — gestores e líderes ────────────────── */
  function minMinAdicionarMembro() {
    alert('Adição de membros ao ministério em breve.');
  }

  /* ── exports ───────────────────────────────────────────────── */
  window.minMinLoad            = minMinLoad;
  window.minMinAbrir           = minMinAbrir;
  window.minMinVoltarLista     = minMinVoltarLista;
  window.minMinNovo            = minMinNovo;
  window.minMinAdicionarMembro = minMinAdicionarMembro;

})();
