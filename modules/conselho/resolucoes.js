/* ═══════════════════════════════════════════════════════════════
   SIPEN — Módulo Resoluções do Conselho
   resolucoes.js · v1.0
   Repositório oficial de deliberações normativas — IPPenha
═══════════════════════════════════════════════════════════════ */

(function () {

  /* ── Estado ───────────────────────────────────────────────── */

  let _rows = [];

  /* ── Helpers ──────────────────────────────────────────────── */

  function _el(id)    { return document.getElementById(id); }
  function _sv(id, v) { const e = _el(id); if (e) e.textContent = v; }

  function _sp() {
    return `<span style="display:inline-block;width:11px;height:11px;border:2px solid var(--sky);border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;vertical-align:middle;margin-right:6px"></span>`;
  }

  function _fmtNumero(n, ano) {
    return `nº ${String(n).padStart(3, '0')}/${ano}`;
  }

  function _fmtData(d) {
    if (!d) return '';
    const [y, m, dd] = d.slice(0, 10).split('-');
    return `${dd}/${m}/${y}`;
  }

  function _fmtDataHora(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function _fmtVigencia(inicio, fim) {
    if (!fim && !inicio) return 'Vigência indeterminada';
    if (!fim) return `A partir de ${_fmtData(inicio)}`;
    return `${_fmtData(inicio)} → ${_fmtData(fim)}`;
  }

  /* ── Tabelas de lookup ────────────────────────────────────── */

  const CAT_LABEL = {
    administracao:   'Administração',
    espacos:         'Espaços',
    eventos:         'Eventos',
    financas:        'Finanças',
    comunicacao:     'Comunicação',
    patrimonio:      'Patrimônio',
    ministerio:      'Ministério',
    missoes:         'Missões',
    liturgia:        'Liturgia',
    governanca:      'Governança',
    seguranca:       'Segurança',
    recursos_humanos:'Recursos Humanos',
    tecnologia:      'Tecnologia',
    outros:          'Outros',
  };

  const CAT_STYLE = {
    administracao:   'color:var(--sky);background:var(--skybg)',
    espacos:         'color:var(--gold);background:var(--goldbg)',
    eventos:         'color:var(--teal);background:var(--tealbg)',
    financas:        'color:var(--gr);background:rgba(48,209,88,.1)',
    comunicacao:     'color:var(--violet);background:rgba(144,104,200,.1)',
    patrimonio:      'color:var(--gold);background:var(--goldbg)',
    ministerio:      'color:var(--teal);background:var(--tealbg)',
    missoes:         'color:var(--rose);background:var(--rosebg)',
    liturgia:        'color:var(--violet);background:rgba(144,104,200,.1)',
    governanca:      'color:var(--sky);background:var(--skybg)',
    seguranca:       'color:var(--rose);background:var(--rosebg)',
    recursos_humanos:'color:var(--teal);background:var(--tealbg)',
    tecnologia:      'color:var(--sky);background:var(--skybg)',
    outros:          'color:var(--tx3);background:rgba(128,128,128,.08)',
  };

  const STATUS_LABEL = {
    rascunho:    'Rascunho',
    em_analise:  'Em análise',
    aprovada:    'Aprovada',
    publicada:   'Publicada',
    revogada:    'Revogada',
    substituida: 'Substituída',
  };

  const STATUS_CLASS = {
    rascunho:    'badge-justif',
    em_analise:  'badge-online',
    aprovada:    'badge-online',
    publicada:   'badge-presente',
    revogada:    'badge-justif',
    substituida: 'badge-justif',
  };

  const ACAO_LABEL = {
    criado:     'Criado',
    editado:    'Editado',
    aprovado:   'Aprovado',
    publicado:  'Publicado',
    revogado:   'Revogado',
    substituido:'Substituído',
  };

  /* ── Carregamento ─────────────────────────────────────────── */

  async function carregarResolucoes() {
    const c = _el('res-main-container');
    if (!c) return;
    c.innerHTML = `<div style="padding:32px;text-align:center;color:var(--tx3)">${_sp()}Carregando resoluções…</div>`;

    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/resolucoes?order=ano.desc,numero.desc,versao.desc&limit=500`,
        { headers: apiHeaders() }
      );
      if (!res.ok) throw new Error(await res.text());
      _rows = await res.json();
      _popularFiltroAnos();
      _atualizarKpis(_rows);
      _renderLista(_rows);
    } catch (e) {
      c.innerHTML = `<div style="padding:24px;color:var(--rose);font-size:12px">Erro ao carregar: ${e.message}</div>`;
    }
  }

  function _popularFiltroAnos() {
    const sel = _el('res-fil-ano');
    if (!sel) return;
    const cur  = sel.value;
    const anos = [...new Set(_rows.map(r => r.ano))].sort((a, b) => b - a);
    sel.innerHTML = '<option value="">Todos os anos</option>' +
      anos.map(a => `<option value="${a}" ${String(a) === cur ? 'selected' : ''}>${a}</option>`).join('');
  }

  function _atualizarKpis(rows) {
    const anoAtual = new Date().getFullYear();
    _sv('res-kpi-vigentes',  rows.filter(r => r.status === 'publicada').length);
    _sv('res-kpi-revogadas', rows.filter(r => r.status === 'revogada' || r.status === 'substituida').length);
    _sv('res-kpi-revisao',   rows.filter(r => ['rascunho','em_analise','aprovada'].includes(r.status)).length);
    _sv('res-kpi-ano',       rows.filter(r => r.ano === anoAtual && r.status === 'publicada').length);
  }

  /* ── Filtros ──────────────────────────────────────────────── */

  function resFiltrar() {
    const q    = (_el('res-busca')?.value      || '').toLowerCase().trim();
    const ano  = _el('res-fil-ano')?.value     || '';
    const st   = _el('res-fil-status')?.value  || '';
    const cat  = _el('res-fil-cat')?.value     || '';

    let rows = _rows;
    if (q)
      rows = rows.filter(r =>
        (r.titulo         || '').toLowerCase().includes(q) ||
        (r.assunto        || '').toLowerCase().includes(q) ||
        (r.resumo         || '').toLowerCase().includes(q) ||
        (r.texto_oficial  || '').toLowerCase().includes(q) ||
        (r.ata_origem     || '').toLowerCase().includes(q) ||
        (r.relator        || '').toLowerCase().includes(q)
      );
    if (ano) rows = rows.filter(r => String(r.ano) === ano);
    if (st)  rows = rows.filter(r => r.status === st);
    if (cat) rows = rows.filter(r => r.categoria === cat);

    _renderLista(rows);
  }

  /* ── Render da lista ──────────────────────────────────────── */

  function _renderLista(rows) {
    const c = _el('res-main-container');
    if (!c) return;

    if (!rows.length) {
      c.innerHTML = `<div class="card"><p style="color:var(--tx3);font-size:11.5px;margin:0">Nenhuma resolução encontrada. Use <strong>+ Nova Resolução</strong> para cadastrar.</p></div>`;
      return;
    }

    const linhas = rows.map(r => {
      const catSty = CAT_STYLE[r.categoria] || 'color:var(--tx3);background:rgba(128,128,128,.08)';
      const catLbl = CAT_LABEL[r.categoria]  || r.categoria;
      const stCls  = STATUS_CLASS[r.status]  || 'badge-justif';
      const stLbl  = STATUS_LABEL[r.status]  || r.status;
      const vig    = r.status === 'publicada'
        ? (r.data_fim ? `Até ${_fmtData(r.data_fim)}` : 'Indeterminada')
        : '';

      return `<tr onclick="resAbrir('${r.id}')" style="cursor:pointer">
        <td style="white-space:nowrap;font-variant-numeric:tabular-nums">
          <span style="font-size:11px;font-weight:700;color:var(--tx2)">${_fmtNumero(r.numero, r.ano)}</span>
          ${r.versao > 1 ? `<span class="csub" style="margin-left:4px">v${r.versao}</span>` : ''}
        </td>
        <td class="tx1b">${escapeHtml(r.titulo)}</td>
        <td><span style="font-size:10px;font-weight:600;${catSty};padding:2px 8px;border-radius:10px">${catLbl}</span></td>
        <td><span class="${stCls}">${stLbl}</span></td>
        <td style="font-size:10.5px;color:var(--tx3)">${r.ata_origem ? escapeHtml(r.ata_origem) : '—'}</td>
        <td style="font-size:10.5px;color:var(--tx3);white-space:nowrap">${vig || '—'}</td>
        <td class="r"><button class="tbt" onclick="event.stopPropagation();resAbrir('${r.id}')">Ver</button></td>
      </tr>`;
    }).join('');

    c.innerHTML = `
      <div class="card">
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th style="white-space:nowrap">Número</th>
                <th>Título</th>
                <th>Categoria</th>
                <th>Status</th>
                <th>Ata</th>
                <th>Vigência</th>
                <th class="r">Ações</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>
      </div>`;
  }

  /* ── Detalhe ──────────────────────────────────────────────── */

  async function resAbrir(id) {
    let modal = _el('res-detail-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'res-detail-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:320';
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div style="width:min(760px,94vw);max-height:90vh;overflow:hidden;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;display:flex;flex-direction:column">
        <div style="padding:14px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;gap:10px">
          <div style="flex:1;color:var(--tx3);font-size:12px">${_sp()}Carregando…</div>
          <button onclick="document.getElementById('res-detail-modal').remove()" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer">✕</button>
        </div>
        <div style="padding:24px"></div>
      </div>`;

    try {
      const [resRes, vincRes, histRes] = await Promise.all([
        fetch(`${apiBaseUrl()}/rest/v1/resolucoes?id=eq.${id}&limit=1`,                                               { headers: apiHeaders() }),
        fetch(`${apiBaseUrl()}/rest/v1/resolucoes_vinculos?resolucao_id=eq.${id}&order=criado_em.desc`,               { headers: apiHeaders() }),
        fetch(`${apiBaseUrl()}/rest/v1/resolucoes_historico?resolucao_id=eq.${id}&order=feito_em.desc&limit=50`,      { headers: apiHeaders() }),
      ]);

      const rows = resRes.ok ? await resRes.json() : [];
      if (!rows.length) { modal.querySelector('div > div:last-child').innerHTML = `<p style="color:var(--tx3)">Não encontrada.</p>`; return; }

      _renderDetalhe(rows[0], vincRes.ok ? await vincRes.json() : [], histRes.ok ? await histRes.json() : [], modal);
    } catch (e) {
      modal.querySelector('div > div:last-child').innerHTML = `<p style="color:var(--rose);font-size:12px">Erro: ${e.message}</p>`;
    }
  }

  function _renderDetalhe(r, vinculos, historico, modal) {
    const catSty = CAT_STYLE[r.categoria] || 'color:var(--tx3);background:rgba(128,128,128,.08)';
    const catLbl = CAT_LABEL[r.categoria]  || r.categoria;
    const stCls  = STATUS_CLASS[r.status]  || 'badge-justif';
    const stLbl  = STATUS_LABEL[r.status]  || r.status;

    const _meta = (lbl, val) => val
      ? `<div><div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:3px">${lbl}</div><div style="font-size:12px;color:var(--tx1)">${val}</div></div>`
      : '';

    const acoes = [];
    if (['rascunho','em_analise','aprovada'].includes(r.status))
      acoes.push(`<button class="tbt pri" onclick="resPublicar('${r.id}')">Publicar</button>`);
    if (r.status === 'publicada')
      acoes.push(`<button class="tbt" style="color:var(--rose)" onclick="resRevogar('${r.id}')">Revogar</button>`);
    acoes.push(`<button class="tbt" onclick="resEditarRegistro('${r.id}')">Editar</button>`);
    acoes.push(`<button class="tbt" onclick="resNovaVersao('${r.id}')">Nova versão</button>`);
    acoes.push(`<button class="tbt" onclick="resCopiarLink(${r.numero},${r.ano})">Copiar link</button>`);
    acoes.push(`<button class="tbt" onclick="resImprimirResolucao('${r.id}')">Imprimir</button>`);

    const _secVinculos = () => {
      const lista = !vinculos.length ? `<p style="color:var(--tx3);font-size:11.5px;margin:0">Nenhum vínculo cadastrado.</p>` :
        vinculos.map(v => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
            <span style="font-size:10px;font-weight:700;color:var(--sky);text-transform:uppercase;min-width:90px">${escapeHtml(v.modulo)}</span>
            <span style="font-size:12px;flex:1;color:var(--tx1)">${escapeHtml(v.descricao)}</span>
          </div>`).join('');
      return `${lista}<div style="margin-top:10px"><button class="tbt" onclick="resAdicionarVinculo('${r.id}')">+ Adicionar vínculo</button></div>`;
    };

    const _secHistorico = () => !historico.length
      ? `<p style="color:var(--tx3);font-size:11.5px;margin:0">Sem registros de alteração.</p>`
      : historico.map(h => `
          <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd1)">
            <div style="font-size:10px;color:var(--tx3);white-space:nowrap;min-width:110px">${_fmtDataHora(h.feito_em)}</div>
            <div style="font-size:11.5px;flex:1">
              <span style="font-weight:600;color:var(--tx2)">${escapeHtml(h.feito_por_nm || 'Sistema')}</span>
              <span style="color:var(--tx3)"> — ${ACAO_LABEL[h.acao] || h.acao}</span>
              ${h.campo_alt ? `<div style="font-size:10px;color:var(--tx3);margin-top:2px">${escapeHtml(h.campo_alt)}: <em>${escapeHtml(h.valor_ant||'—')}</em> → <em>${escapeHtml(h.valor_nov||'—')}</em></div>` : ''}
            </div>
          </div>`).join('');

    modal.innerHTML = `
      <div style="width:min(760px,94vw);max-height:90vh;overflow:hidden;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;display:flex;flex-direction:column">

        <div style="padding:14px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:flex-start;gap:12px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px">
              <span style="font-size:12px;font-weight:700;color:var(--tx2)">${_fmtNumero(r.numero, r.ano)}</span>
              ${r.versao > 1 ? `<span class="csub">versão ${r.versao}</span>` : ''}
              <span class="${stCls}">${stLbl}</span>
              <span style="font-size:10px;font-weight:600;${catSty};padding:2px 8px;border-radius:10px">${catLbl}</span>
            </div>
            <div style="font-size:15px;font-weight:700;color:var(--tx1);line-height:1.35">${escapeHtml(r.titulo)}</div>
          </div>
          <button onclick="document.getElementById('res-detail-modal').remove()" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer;flex-shrink:0;line-height:1">✕</button>
        </div>

        <div style="flex:1;overflow:auto">
          <div style="padding:16px">

            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px 16px;padding:12px;background:var(--bg-surface);border-radius:8px;border:1px solid var(--bd1);margin-bottom:14px">
              ${_meta('Ata de Origem',   r.ata_origem  ? escapeHtml(r.ata_origem) : null)}
              ${_meta('Data da Reunião', r.data_reuniao ? _fmtData(r.data_reuniao) : null)}
              ${_meta('Relator',         r.relator     ? escapeHtml(r.relator) : null)}
              ${_meta('Comissão',        r.comissao    ? escapeHtml(r.comissao) : null)}
              ${_meta('Vigência',        _fmtVigencia(r.data_inicio, r.data_fim))}
              ${_meta('Publicado por',   r.publicado_por_nm ? escapeHtml(r.publicado_por_nm) : null)}
            </div>

            ${r.resumo ? `
              <div style="margin-bottom:14px;padding:12px 14px;background:var(--skybg);border:1px solid rgba(88,152,212,.2);border-radius:8px">
                <div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--sky);margin-bottom:5px">Resumo</div>
                <div style="font-size:12.5px;color:var(--tx1);line-height:1.6">${escapeHtml(r.resumo)}</div>
              </div>` : ''}

            <div class="bnav" style="--mc:var(--sky);margin-bottom:12px">
              <div class="bni on" id="res-dt-tab-texto"    onclick="resDetalheTab('texto',this)">Texto Oficial</div>
              <div class="bni"    id="res-dt-tab-vinculos" onclick="resDetalheTab('vinculos',this)">Vínculos</div>
              <div class="bni"    id="res-dt-tab-historico"onclick="resDetalheTab('historico',this)">Histórico</div>
            </div>

            <div id="res-dt-body-texto">
              ${r.texto_oficial
                ? `<div style="font-size:12.5px;color:var(--tx1);line-height:1.75;white-space:pre-wrap;background:var(--bg-surface);border:1px solid var(--bd1);border-radius:8px;padding:14px">${escapeHtml(r.texto_oficial)}</div>`
                : `<p style="color:var(--tx3);font-size:11.5px">Texto oficial não cadastrado. Clique em <strong>Editar</strong> para adicionar.</p>`}
            </div>
            <div id="res-dt-body-vinculos"  style="display:none">${_secVinculos()}</div>
            <div id="res-dt-body-historico" style="display:none">${_secHistorico()}</div>

          </div>
        </div>

        <div style="padding:12px 16px;border-top:1px solid var(--bd1);display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap">
          ${acoes.join('')}
          <button onclick="document.getElementById('res-detail-modal').remove()" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:7px 12px;color:var(--tx2);cursor:pointer;font-size:11.5px">Fechar</button>
        </div>

      </div>`;
  }

  function resDetalheTab(aba, btn) {
    ['texto','vinculos','historico'].forEach(t => {
      const body = _el(`res-dt-body-${t}`);
      const tab  = _el(`res-dt-tab-${t}`);
      if (body) body.style.display = t === aba ? '' : 'none';
      if (tab)  tab.classList.toggle('on', t === aba);
    });
  }

  /* ── Formulário Nova / Editar ─────────────────────────────── */

  async function resNovaResolucao() {
    const ano     = new Date().getFullYear();
    const proximo = await _proximoNumero(ano);
    _abrirFormulario(null, { numero: proximo, ano, versao: 1, status: 'rascunho' });
  }

  async function resEditarRegistro(id) {
    const res  = await fetch(`${apiBaseUrl()}/rest/v1/resolucoes?id=eq.${id}&limit=1`, { headers: apiHeaders() });
    const rows = res.ok ? await res.json() : [];
    if (!rows.length) return;
    _el('res-detail-modal')?.remove();
    _abrirFormulario(id, rows[0]);
  }

  async function _proximoNumero(ano) {
    try {
      const res  = await fetch(`${apiBaseUrl()}/rest/v1/resolucoes?ano=eq.${ano}&select=numero&order=numero.desc&limit=1`, { headers: apiHeaders() });
      const rows = res.ok ? await res.json() : [];
      return rows.length ? rows[0].numero + 1 : 1;
    } catch { return 1; }
  }

  function _abrirFormulario(id, d) {
    let modal = _el('res-form-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'res-form-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:330';
      document.body.appendChild(modal);
    }

    const titulo = id ? 'Editar Resolução' : 'Nova Resolução';
    const inp_st = 'width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none;box-sizing:border-box';
    const lbl_st = 'display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px';
    const _lbl   = (t, req) => `<label style="${lbl_st}">${t}${req ? ' <span style="color:var(--rose)">*</span>' : ''}</label>`;
    const _inp   = (fid, val, ph='', tp='text') =>
      `<input id="${fid}" type="${tp}" value="${escapeHtml(String(val||''))}" placeholder="${ph}" style="${inp_st}">`;
    const _opt   = (v, l, cur) => `<option value="${v}" ${cur===v?'selected':''}>${l}</option>`;
    const sel_st = inp_st;

    const secLabel = lbl => `<div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--sky);margin:14px 0 10px">${lbl}</div>`;

    modal.innerHTML = `
      <div style="width:min(700px,94vw);max-height:90vh;overflow:hidden;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;display:flex;flex-direction:column">
        <div style="padding:14px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:14px;font-weight:700;color:var(--tx1)">${titulo}</div>
          <button onclick="document.getElementById('res-form-modal').remove()" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer">✕</button>
        </div>
        <div style="padding:16px 16px 4px;overflow:auto;flex:1">
          <input type="hidden" id="res-f-id"     value="${id||''}">
          <input type="hidden" id="res-f-versao"  value="${d.versao||1}">
          <input type="hidden" id="res-f-pai-id"  value="${d.resolucao_pai_id||''}">

          ${secLabel('Informações Gerais')}
          <div style="display:grid;grid-template-columns:80px 100px 1fr;gap:10px;margin-bottom:12px">
            <div>
              ${_lbl('Número', true)}
              ${_inp('res-f-numero', d.numero||'', 'Auto', 'number')}
            </div>
            <div>
              ${_lbl('Ano', true)}
              ${_inp('res-f-ano', d.ano||new Date().getFullYear(), '', 'number')}
            </div>
            <div>
              ${_lbl('Assunto')}
              ${_inp('res-f-assunto', d.assunto||'', 'Ex: Utilização dos espaços aos domingos')}
            </div>
          </div>
          <div style="margin-bottom:12px">
            ${_lbl('Título', true)}
            ${_inp('res-f-titulo', d.titulo||'', 'Ex: Organização das ações de disponibilização de itens aos domingos')}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
            <div>
              ${_lbl('Categoria', true)}
              <select id="res-f-categoria" style="${sel_st}">
                ${_opt('administracao',   'Administração',     d.categoria)}
                ${_opt('espacos',         'Espaços',           d.categoria)}
                ${_opt('eventos',         'Eventos',           d.categoria)}
                ${_opt('financas',        'Finanças',          d.categoria)}
                ${_opt('comunicacao',     'Comunicação',       d.categoria)}
                ${_opt('patrimonio',      'Patrimônio',        d.categoria)}
                ${_opt('ministerio',      'Ministério',        d.categoria)}
                ${_opt('missoes',         'Missões',           d.categoria)}
                ${_opt('liturgia',        'Liturgia',          d.categoria)}
                ${_opt('governanca',      'Governança',        d.categoria)}
                ${_opt('seguranca',       'Segurança',         d.categoria)}
                ${_opt('recursos_humanos','Recursos Humanos',  d.categoria)}
                ${_opt('tecnologia',      'Tecnologia',        d.categoria)}
                ${_opt('outros',          'Outros',            d.categoria)}
              </select>
            </div>
            <div>
              ${_lbl('Status', true)}
              <select id="res-f-status" style="${sel_st}">
                ${_opt('rascunho',   'Rascunho',    d.status)}
                ${_opt('em_analise', 'Em análise',  d.status)}
                ${_opt('aprovada',   'Aprovada',    d.status)}
                ${_opt('publicada',  'Publicada',   d.status)}
                ${_opt('revogada',   'Revogada',    d.status)}
                ${_opt('substituida','Substituída', d.status)}
              </select>
            </div>
          </div>

          ${secLabel('Origem')}
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">
            <div>
              ${_lbl('Ata de Origem')}
              ${_inp('res-f-ata', d.ata_origem||'', 'Ex: Ata nº 1292')}
            </div>
            <div>
              ${_lbl('Data da Reunião')}
              ${_inp('res-f-reuniao', d.data_reuniao||'', '', 'date')}
            </div>
            <div>
              ${_lbl('Relator')}
              ${_inp('res-f-relator', d.relator||'', 'Nome')}
            </div>
          </div>
          <div style="margin-bottom:12px">
            ${_lbl('Comissão (opcional)')}
            ${_inp('res-f-comissao', d.comissao||'', 'Ex: Comissão de Patrimônio')}
          </div>

          ${secLabel('Vigência')}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
            <div>
              ${_lbl('Data de Início')}
              ${_inp('res-f-inicio', d.data_inicio||'', '', 'date')}
            </div>
            <div>
              ${_lbl('Data Final')}
              ${_inp('res-f-fim', d.data_fim||'', '', 'date')}
              <div style="font-size:10px;color:var(--tx3);margin-top:3px">Deixe vazio para vigência indeterminada</div>
            </div>
          </div>

          ${secLabel('Conteúdo')}
          <div style="margin-bottom:12px">
            ${_lbl('Resumo')}
            <textarea id="res-f-resumo" placeholder="Breve descrição para consulta rápida…"
              style="${inp_st};min-height:72px;resize:vertical">${escapeHtml(d.resumo||'')}</textarea>
          </div>
          <div style="margin-bottom:16px">
            ${_lbl('Texto Oficial')}
            <textarea id="res-f-texto" placeholder="Redação completa da resolução…"
              style="${inp_st};min-height:140px;resize:vertical;font-family:inherit">${escapeHtml(d.texto_oficial||'')}</textarea>
          </div>

        </div>
        <div style="padding:14px 16px;border-top:1px solid var(--bd1);display:flex;justify-content:flex-end;gap:8px">
          <button onclick="document.getElementById('res-form-modal').remove()" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:8px 12px;color:var(--tx2);cursor:pointer">Cancelar</button>
          <button onclick="resSalvarRegistro()" style="background:var(--gr);border:none;border-radius:6px;padding:8px 16px;color:#fff;font-weight:600;cursor:pointer">💾 Salvar</button>
        </div>
      </div>`;
  }

  /* ── Salvar ───────────────────────────────────────────────── */

  async function resSalvarRegistro() {
    const v      = fid => (_el(fid)||{}).value || null;
    const id     = v('res-f-id');
    const titulo = v('res-f-titulo');
    const cat    = v('res-f-categoria');
    const numero = parseInt(v('res-f-numero'));
    const ano    = parseInt(v('res-f-ano'));
    const versao = parseInt(v('res-f-versao')) || 1;
    const paiId  = v('res-f-pai-id');

    if (!titulo)       { T('Campo obrigatório', 'Informe o título da resolução.'); return; }
    if (!cat)          { T('Campo obrigatório', 'Selecione a categoria.'); return; }
    if (!numero || !ano){ T('Campo obrigatório', 'Informe número e ano.'); return; }

    const payload = {
      numero,
      ano,
      versao,
      titulo,
      assunto:           v('res-f-assunto'),
      categoria:         cat,
      status:            v('res-f-status') || 'rascunho',
      ata_origem:        v('res-f-ata'),
      data_reuniao:      v('res-f-reuniao'),
      relator:           v('res-f-relator'),
      comissao:          v('res-f-comissao'),
      data_inicio:       v('res-f-inicio'),
      data_fim:          v('res-f-fim'),
      resumo:            (_el('res-f-resumo')||{}).value || null,
      texto_oficial:     (_el('res-f-texto')||{}).value  || null,
      resolucao_pai_id:  paiId || null,
    };
    Object.keys(payload).forEach(k => { if (payload[k] === null || payload[k] === '') delete payload[k]; });

    try {
      const res = id
        ? await fetch(`${apiBaseUrl()}/rest/v1/resolucoes?id=eq.${id}`, {
            method: 'PATCH',
            headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify(payload),
          })
        : await fetch(`${apiBaseUrl()}/rest/v1/resolucoes`, {
            method: 'POST',
            headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error(await res.text());
      _el('res-form-modal')?.remove();
      T(id ? 'Resolução atualizada' : 'Resolução registrada', `${_fmtNumero(numero, ano)} — ${titulo}`);
      carregarResolucoes();
    } catch (e) {
      T('Erro ao salvar', e.message);
    }
  }

  /* ── Publicar / Revogar ───────────────────────────────────── */

  async function resPublicar(id) {
    if (!confirm('Publicar esta resolução? Ela ficará disponível para consulta de todos os usuários.')) return;
    try {
      const res = await fetch(`${apiBaseUrl()}/rest/v1/resolucoes?id=eq.${id}`, {
        method:  'PATCH',
        headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body:    JSON.stringify({ status: 'publicada' }),
      });
      if (!res.ok) throw new Error(await res.text());
      _el('res-detail-modal')?.remove();
      T('Publicada', 'Resolução publicada com sucesso.');
      carregarResolucoes();
    } catch (e) {
      T('Erro', e.message);
    }
  }

  async function resRevogar(id) {
    if (!confirm('Revogar esta resolução? Ela deixará de estar vigente.')) return;
    try {
      const res = await fetch(`${apiBaseUrl()}/rest/v1/resolucoes?id=eq.${id}`, {
        method:  'PATCH',
        headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body:    JSON.stringify({ status: 'revogada', data_fim: new Date().toISOString().slice(0, 10) }),
      });
      if (!res.ok) throw new Error(await res.text());
      _el('res-detail-modal')?.remove();
      T('Revogada', 'Resolução marcada como revogada.');
      carregarResolucoes();
    } catch (e) {
      T('Erro', e.message);
    }
  }

  /* ── Nova versão ──────────────────────────────────────────── */

  async function resNovaVersao(id) {
    if (!confirm('Criar nova versão? A versão atual será marcada como Substituída.')) return;
    try {
      const res  = await fetch(`${apiBaseUrl()}/rest/v1/resolucoes?id=eq.${id}&limit=1`, { headers: apiHeaders() });
      const rows = res.ok ? await res.json() : [];
      if (!rows.length) return;
      const orig = rows[0];

      await fetch(`${apiBaseUrl()}/rest/v1/resolucoes?id=eq.${id}`, {
        method:  'PATCH',
        headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body:    JSON.stringify({ status: 'substituida' }),
      });

      _el('res-detail-modal')?.remove();
      _abrirFormulario(null, {
        ...orig,
        status:           'rascunho',
        versao:           orig.versao + 1,
        resolucao_pai_id: orig.id,
        data_inicio:      null,
        data_fim:         null,
      });
    } catch (e) {
      T('Erro', e.message);
    }
  }

  /* ── Vínculos ─────────────────────────────────────────────── */

  function resAdicionarVinculo(resolucaoId) {
    const modal = _el('res-detail-modal');
    if (!modal) return;

    const existente = document.getElementById('res-vinculo-overlay');
    if (existente) existente.remove();

    const overlay = document.createElement('div');
    overlay.id = 'res-vinculo-overlay';
    overlay.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:10;border-radius:10px';

    const MODULOS = ['agenda','comunicacao','ministerios','departamentos','demandas','programacoes','espacos','financeiro','outros'];
    overlay.innerHTML = `
      <div style="width:340px;background:var(--bg-card);border:1px solid var(--bd2);border-radius:8px;padding:16px;margin:16px">
        <div style="font-size:13px;font-weight:700;color:var(--tx1);margin-bottom:12px">Adicionar vínculo</div>
        <div style="margin-bottom:10px">
          <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Módulo</label>
          <select id="vinc-modulo" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none">
            ${MODULOS.map(m => `<option value="${m}">${m.charAt(0).toUpperCase()+m.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px">Descrição</label>
          <input id="vinc-desc" type="text" placeholder="Ex: Espaço Apoio Missionário"
            style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:11.5px;padding:8px 10px;outline:none;box-sizing:border-box">
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button onclick="document.getElementById('res-vinculo-overlay').remove()"
            style="background:none;border:1px solid var(--bd1);border-radius:6px;padding:7px 12px;color:var(--tx2);cursor:pointer;font-size:11.5px">Cancelar</button>
          <button onclick="resSalvarVinculo('${resolucaoId}')"
            style="background:var(--gr);border:none;border-radius:6px;padding:7px 14px;color:#fff;font-weight:600;cursor:pointer;font-size:11.5px">Salvar</button>
        </div>
      </div>`;

    const inner = modal.querySelector('div');
    inner.style.position = 'relative';
    inner.appendChild(overlay);
  }

  async function resSalvarVinculo(resolucaoId) {
    const modulo = (_el('vinc-modulo')||{}).value;
    const desc   = ((_el('vinc-desc')||{}).value||'').trim();
    if (!desc) { T('Campo obrigatório', 'Informe a descrição do vínculo.'); return; }

    try {
      const res = await fetch(`${apiBaseUrl()}/rest/v1/resolucoes_vinculos`, {
        method:  'POST',
        headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body:    JSON.stringify({ resolucao_id: resolucaoId, modulo, descricao: desc }),
      });
      if (!res.ok) throw new Error(await res.text());
      T('Vínculo adicionado', `${modulo} — ${desc}`);
      resAbrir(resolucaoId);
    } catch (e) {
      T('Erro', e.message);
    }
  }

  /* ── Compartilhamento ─────────────────────────────────────── */

  function resCopiarLink(numero, ano) {
    const link = `https://sipen.com.br/resolucoes/${ano}/${String(numero).padStart(3, '0')}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(
        () => T('Link copiado', link),
        () => T('Link da resolução', link)
      );
    } else {
      T('Link da resolução', link);
    }
  }

  function resImprimirResolucao(id) {
    const r = _rows.find(x => x.id === id);
    if (!r) return;

    const win = window.open('', '_blank', 'width=800,height=900');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>${_fmtNumero(r.numero, r.ano).toUpperCase()} — ${r.titulo}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #222; font-size: 12pt; }
        h1   { font-size: 15pt; margin: 6px 0; }
        .inst{ font-size: 9pt; text-transform: uppercase; letter-spacing: .08em; color: #888; text-align: center; }
        .num { font-size: 12pt; font-weight: bold; text-align: center; color: #333; }
        .meta{ font-size: 10pt; color: #555; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 8px 0; margin: 16px 0; display: flex; flex-wrap: wrap; gap: 16px; }
        .resumo { background: #f0f7ff; border-left: 3px solid #3a7ed4; padding: 10px 14px; margin-bottom: 20px; font-style: italic; font-size: 11pt; line-height: 1.5; }
        .sec-t  { font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: .05em; color: #888; margin-bottom: 6px; }
        .texto  { white-space: pre-wrap; line-height: 1.75; font-size: 11pt; }
        @media print { @page { margin: 20mm; } }
      </style>
    </head><body>
      <div class="inst">Igreja Presbiteriana da Penha — Resolução do Conselho</div>
      <div class="num">${_fmtNumero(r.numero, r.ano).toUpperCase()}</div>
      <h1 style="text-align:center">${r.titulo}</h1>
      <div class="meta">
        ${r.ata_origem    ? `<span>Ata: <b>${r.ata_origem}</b></span>` : ''}
        ${r.data_reuniao  ? `<span>Reunião: <b>${_fmtData(r.data_reuniao)}</b></span>` : ''}
        <span>Status: <b>${STATUS_LABEL[r.status]||r.status}</b></span>
        <span>Vigência: <b>${_fmtVigencia(r.data_inicio, r.data_fim)}</b></span>
        ${r.relator ? `<span>Relator: <b>${r.relator}</b></span>` : ''}
      </div>
      ${r.resumo        ? `<div class="resumo">${r.resumo}</div>` : ''}
      ${r.texto_oficial ? `<div class="sec-t">Texto Oficial</div><div class="texto">${r.texto_oficial}</div>` : ''}
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }

  /* ── Exportação CSV ──────────────────────────────────────── */

  function resExportarCSV() {
    const _e = v => {
      if (v == null) return '';
      const s = String(v);
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const cab   = ['Número','Ano','Versão','Título','Assunto','Categoria','Status','Ata de Origem','Data Reunião','Relator','Vigência Início','Vigência Fim','Resumo'];
    const linhas = [
      cab.map(_e).join(','),
      ..._rows.map(r => [
        _fmtNumero(r.numero, r.ano),
        r.ano, r.versao,
        r.titulo,
        r.assunto||'',
        CAT_LABEL[r.categoria]||r.categoria,
        STATUS_LABEL[r.status]||r.status,
        r.ata_origem||'',
        r.data_reuniao||'',
        r.relator||'',
        r.data_inicio||'',
        r.data_fim||'',
        (r.resumo||'').replace(/\n/g,' '),
      ].map(_e).join(',')),
    ];
    const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `resolucoes-${new Date().getFullYear()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Registro e Exposição ─────────────────────────────────── */

  VIEW_AUTOLOAD['conselho-resolucoes'] = { fn: carregarResolucoes };

  window.resAbrir             = resAbrir;
  window.resDetalheTab        = resDetalheTab;
  window.resNovaResolucao     = resNovaResolucao;
  window.resEditarRegistro    = resEditarRegistro;
  window.resSalvarRegistro    = resSalvarRegistro;
  window.resFiltrar           = resFiltrar;
  window.resPublicar          = resPublicar;
  window.resRevogar           = resRevogar;
  window.resNovaVersao        = resNovaVersao;
  window.resAdicionarVinculo  = resAdicionarVinculo;
  window.resSalvarVinculo     = resSalvarVinculo;
  window.resCopiarLink        = resCopiarLink;
  window.resImprimirResolucao = resImprimirResolucao;
  window.resExportarCSV       = resExportarCSV;
  window._el = window._el || (id => document.getElementById(id));

})();
