/* ═══════════════════════════════════════════════════════
   SIPEN — Gestão de Recursos (Estoque)
   recursos/index.js · v2.0 (modelo Excel IPPenha)
═══════════════════════════════════════════════════════ */
(function () {

  // ── Helpers ───────────────────────────────────────────
  function _url() { return apiBaseUrl() + '/rest/v1'; }
  function _hdr()  { return apiHeaders(); }
  function _hdrJ() { return { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=representation' }; }
  function _esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function _fmtD(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
  }
  function _fmtDT(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR',{ day:'2-digit', month:'2-digit' }) + ' ' +
           d.toLocaleTimeString('pt-BR',{ hour:'2-digit', minute:'2-digit' });
  }
  function _fmtR(v) {
    return v != null
      ? 'R$ ' + Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
      : '—';
  }

  function _podeGerenciar() {
    if (typeof USUARIO_ATUAL === 'undefined' || !USUARIO_ATUAL) return false;
    if (USUARIO_ATUAL.perfil === 'ADMINISTRADOR_GERAL') return true;
    const chave = (USUARIO_ATUAL.perfil || '').toLowerCase();
    const p = typeof PERFIS !== 'undefined' ? (PERFIS[chave] || PERFIS[USUARIO_ATUAL.perfil] || null) : null;
    return p?.['Estoque'] === 'full';
  }

  function _u() { return (typeof USUARIO_ATUAL !== 'undefined' ? USUARIO_ATUAL : null) || {}; }

  function _statusEstoque(atual, min) {
    if (min <= 0) return 'ok';
    return atual <= min ? 'repor' : 'ok';
  }

  function _pillStatus(atual, min) {
    const s = _statusEstoque(atual, min);
    return s === 'repor'
      ? `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:rgba(208,104,104,.12);color:var(--rose)">REPOR</span>`
      : `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:rgba(58,170,92,.12);color:var(--gr)">OK</span>`;
  }

  function _pillReq(status) {
    const m = {
      pendente:  { bg:'rgba(212,168,67,.12)',  cl:'var(--gold)',  lbl:'Pendente'  },
      aprovada:  { bg:'rgba(58,170,92,.12)',   cl:'var(--gr)',    lbl:'Aprovada'  },
      rejeitada: { bg:'rgba(208,104,104,.12)', cl:'var(--rose)',  lbl:'Rejeitada' },
    };
    const s = m[status] || { bg:'var(--bd1)', cl:'var(--tx3)', lbl: status };
    return `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:${s.bg};color:${s.cl}">${s.lbl}</span>`;
  }

  const TIPO_CFG = {
    entrada:        { lbl:'Entrada',        bg:'rgba(58,170,92,.12)',    cl:'var(--gr)',     sinal:'+' },
    saida:          { lbl:'Saída',          bg:'rgba(208,104,104,.12)',  cl:'var(--rose)',   sinal:'−' },
    ajuste:         { lbl:'Ajuste',         bg:'rgba(212,168,67,.12)',   cl:'var(--gold)',   sinal:'=' },
    ajuste_entrada: { lbl:'Aj. Entrada',    bg:'rgba(74,156,245,.12)',   cl:'var(--blue)',   sinal:'+' },
    ajuste_saida:   { lbl:'Aj. Saída',      bg:'rgba(139,111,212,.12)',  cl:'var(--violet)', sinal:'−' },
  };

  function _pillTipo(t) {
    const c = TIPO_CFG[t] || { bg:'var(--bd1)', cl:'var(--tx3)', lbl:t };
    return `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:${c.bg};color:${c.cl}">${c.lbl}</span>`;
  }

  const DESTINOS = ['Estoque Central','Limpeza','Cozinha','Banheiros','Eventos','Secretaria'];

  const _SVG_REC = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
  const _HERO_IC = `<div class="hero-ic" style="background:rgba(208,144,64,.12);border-color:rgba(208,144,64,.28)">${_SVG_REC}</div>`;

  const _SI  = 'width:100%;padding:7px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;box-sizing:border-box';
  const _LBL = 'display:block;font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;margin-top:12px';

  // ── Cache ─────────────────────────────────────────────
  let _categorias  = null;
  let _itens       = null;
  let _filtroLista = '';
  let _filtroReq   = 'pendente';
  let _itemAtual   = null;

  async function _loadCats(force) {
    if (_categorias && !force) return _categorias;
    try {
      const r = await fetch(`${_url()}/recursos_categorias?select=*&order=nome.asc`, { headers: _hdr() });
      _categorias = r.ok ? await r.json() : [];
    } catch { _categorias = []; }
    return _categorias;
  }

  async function _loadItens(force) {
    if (_itens && !force) return _itens;
    try {
      const r = await fetch(`${_url()}/recursos_itens?select=*,categoria:recursos_categorias(id,nome,icone)&ativo=eq.true&order=nome.asc`, { headers: _hdr() });
      _itens = r.ok ? await r.json() : [];
    } catch { _itens = []; }
    return _itens;
  }

  // ══════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════
  async function renderDash() {
    const el = document.getElementById('v-recursos-dash');
    if (!el) return;

    const [cats, itens] = await Promise.all([_loadCats(true), _loadItens(true)]);

    const totalSaldo  = itens.reduce((a,i) => a + Number(i.estoque_atual||0), 0);
    const valorEstoque= itens.reduce((a,i) => a + Number(i.estoque_atual||0) * Number(i.custo_unitario||0), 0);
    const aRepor      = itens.filter(i => _statusEstoque(i.estoque_atual, i.estoque_minimo) === 'repor');

    const u      = _u();
    const podeG  = _podeGerenciar();
    let reqPend  = [];
    let movRec   = [];

    try {
      const ep = podeG
        ? `${_url()}/recursos_requisicoes?select=*,item:recursos_itens(nome,unidade)&status=eq.pendente&order=criado_em.desc&limit=8`
        : `${_url()}/recursos_requisicoes?select=*,item:recursos_itens(nome,unidade)&solicitante_id=eq.${u.id||'null'}&order=criado_em.desc&limit=8`;
      const r = await fetch(ep, { headers: _hdr() });
      reqPend = r.ok ? await r.json() : [];
    } catch {}

    if (podeG) {
      try {
        const r = await fetch(`${_url()}/recursos_movimentos?select=*,item:recursos_itens(nome,unidade)&order=criado_em.desc&limit=8`, { headers: _hdr() });
        movRec = r.ok ? await r.json() : [];
      } catch {}
    }

    // Breakdown por categoria
    const porCat = {};
    itens.forEach(i => {
      const cNome = i.categoria?.nome || 'Outros';
      if (!porCat[cNome]) porCat[cNome] = { saldo:0, valor:0, count:0 };
      porCat[cNome].saldo += Number(i.estoque_atual||0);
      porCat[cNome].valor += Number(i.estoque_atual||0) * Number(i.custo_unitario||0);
      porCat[cNome].count += 1;
    });

    const catRows = Object.entries(porCat)
      .sort((a,b) => b[1].valor - a[1].valor)
      .map(([nome, d]) => `<tr style="border-bottom:1px solid var(--bd1)">
        <td style="padding:8px 6px;font-weight:600;color:var(--tx1)">${_esc(nome)}</td>
        <td style="padding:8px 6px;color:var(--tx2);font-variant-numeric:tabular-nums;text-align:right">${d.saldo}</td>
        <td style="padding:8px 6px;color:var(--tx1);font-variant-numeric:tabular-nums;text-align:right">${_fmtR(d.valor)}</td>
      </tr>`).join('');

    const alertaHtml = aRepor.length ? `
      <div class="card" style="border-color:rgba(208,104,104,.3)">
        <div class="ctit" style="color:var(--rose)">Reposição Necessária <span style="background:rgba(208,104,104,.12);color:var(--rose);font-size:11px;padding:1px 8px;border-radius:10px">${aRepor.length}</span></div>
        ${aRepor.map(i => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bd1)">
            <div>
              <span style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(i.nome)}</span>
              <span style="font-size:11px;color:var(--tx3);margin-left:6px">${_esc(i.categoria?.nome||'—')}</span>
            </div>
            <div style="text-align:right;flex-shrink:0;display:flex;align-items:center;gap:8px">
              <span style="font-size:12px;font-weight:700;color:var(--rose)">${i.estoque_atual} ${_esc(i.unidade)}</span>
              <span style="font-size:10.5px;color:var(--tx3)">mín ${i.estoque_minimo}</span>
              ${podeG ? `<button onclick="recAbrirEntrada('${i.id}')" style="font-size:10px;padding:2px 8px;border-radius:5px;border:1px solid rgba(58,170,92,.3);background:rgba(58,170,92,.08);color:var(--gr);cursor:pointer">+ Entrada</button>` : ''}
            </div>
          </div>`).join('')}
      </div>` : '';

    const reqHtml = reqPend.length ? `
      <div class="card">
        <div class="ctit">${podeG ? 'Requisições Pendentes' : 'Minhas Requisições'} <span class="cact" onclick="go('recursos-req')">Ver todas</span></div>
        ${reqPend.map(r => `
          <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--bd1)">
            <div style="flex:1;min-width:0">
              <div style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(r.item?.nome||'—')}</div>
              <div style="font-size:11px;color:var(--tx3)">${r.quantidade} ${_esc(r.item?.unidade||'')} · ${_esc(r.solicitante_nome||'—')} · ${_fmtD(r.criado_em)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
              ${_pillReq(r.status)}
              ${podeG && r.status==='pendente' ? `
                <button onclick="recAprovarReq('${r.id}','${r.item_id}',${r.quantidade})" style="font-size:10.5px;padding:3px 10px;border-radius:5px;border:1px solid rgba(58,170,92,.4);background:rgba(58,170,92,.08);color:var(--gr);cursor:pointer;font-weight:600">Aprovar</button>
                <button onclick="recRejeitarReq('${r.id}')" style="font-size:10.5px;padding:3px 10px;border-radius:5px;border:1px solid rgba(208,104,104,.4);background:rgba(208,104,104,.08);color:var(--rose);cursor:pointer">Rejeitar</button>` : ''}
            </div>
          </div>`).join('')}
      </div>` : '';

    const movHtml = movRec.length ? `
      <div class="card">
        <div class="ctit">Movimentos Recentes <span class="cact" onclick="go('recursos-mov')">Ver todos</span></div>
        ${movRec.map(m => {
          const c = TIPO_CFG[m.tipo] || {};
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd1)">
            <div>
              <span style="font-size:12px;font-weight:600;color:var(--tx1)">${_esc(m.item?.nome||'—')}</span>
              ${m.destino_setor ? `<span style="font-size:11px;color:var(--tx3);margin-left:6px">→ ${_esc(m.destino_setor)}</span>` : ''}
            </div>
            <div style="text-align:right;flex-shrink:0">
              <span style="font-size:12px;font-weight:700;color:${c.cl||'var(--tx2)'}">${c.sinal||''}${m.quantidade} ${_esc(m.item?.unidade||'')}</span>
              <div style="font-size:10.5px;color:var(--tx3)">${_fmtDT(m.criado_em)}</div>
            </div>
          </div>`;
        }).join('')}
      </div>` : '';

    el.innerHTML = `
      <div class="hero">
        ${_HERO_IC}
        <div>
          <div class="hero-lbl">Administração</div>
          <div class="hero-ttl">Gestão de Recursos</div>
          <div class="hero-dsc">Controle de estoque, requisições e movimentações</div>
        </div>
        <div class="hero-act">
          <button class="tbt" onclick="go('recursos-lista')">Ver Estoque</button>
          <button class="tbt" onclick="recAbrirNovaReq()" style="color:var(--gr);border-color:rgba(58,170,92,.3)">+ Requisição</button>
          ${podeG ? `<button class="tbt" onclick="recAbrirEntrada()" style="color:var(--amber);border-color:rgba(208,144,64,.3)">+ Registrar Entrada</button>` : ''}
        </div>
      </div>
      <div class="ct">

        <!-- KPIs do modelo Excel -->
        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px">
          ${[
            { n:itens.length,        lbl:'Produtos cadastrados',  sub:`${cats.length} categorias`,             cor:'var(--amber)', ic:'<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',          fn:"go('recursos-lista')" },
            { n:totalSaldo,          lbl:'Saldo total',           sub:'unidades em estoque',                   cor:'var(--blue)',  ic:'<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',                                                                                                                                                                                                                                                            fn:"go('recursos-lista')" },
            { n:_fmtR(valorEstoque), lbl:'Valor do estoque',      sub:'custo unitário × saldo',                cor:'var(--gr)',    ic:'<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',                                                                                                                                                                                                    fn:"go('recursos-lista')" },
            { n:aRepor.length,       lbl:'Reposição necessária',  sub:'estoque ≤ mínimo',                      cor:aRepor.length?'var(--rose)':'var(--tx3)', ic:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',                                                                                                                                          fn:"go('recursos-lista')" },
          ].map(k => `
            <div class="card" style="padding:12px 14px;display:flex;align-items:center;gap:10px;cursor:pointer" onclick="${k.fn}">
              <div style="width:34px;height:34px;border-radius:50%;background:${k.cor}1a;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${k.cor}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${k.ic}</svg>
              </div>
              <div>
                <div style="font-size:19px;font-weight:800;color:var(--tx1);line-height:1">${k.n}</div>
                <div style="font-size:11px;color:var(--tx2);font-weight:600;margin-top:2px">${k.lbl}</div>
                <div style="font-size:10px;color:var(--tx3)">${k.sub}</div>
              </div>
            </div>`).join('')}
        </div>

        <!-- Breakdown por categoria -->
        ${Object.keys(porCat).length ? `
        <div class="card" style="margin-bottom:0">
          <div class="ctit">Estoque por Categoria <span class="cact" onclick="go('recursos-lista')">Ver todos</span></div>
          <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr style="border-bottom:1px solid var(--bd2)">
              ${['Categoria','Saldo','Valor estimado'].map(h => `<th style="padding:7px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;${h!=='Categoria'?'text-align:right':''}">${h}</th>`).join('')}
            </tr></thead>
            <tbody>${catRows}</tbody>
          </table></div>
        </div>` : ''}

        <div style="display:flex;flex-direction:column;gap:12px">
          ${alertaHtml}
          ${reqHtml}
          ${movHtml}
          ${!alertaHtml && !reqHtml && !movHtml
            ? `<div class="card"><div style="color:var(--tx3);font-size:12px;text-align:center;padding:16px 0">Nenhuma atividade recente</div></div>`
            : ''}
        </div>
      </div>`;
  }

  // ══════════════════════════════════════════════════════
  // LISTA DE ITENS (modelo Excel: Estoque Atual)
  // ══════════════════════════════════════════════════════
  async function renderLista() {
    const el = document.getElementById('v-recursos-lista');
    if (!el) return;

    const [cats, itens] = await Promise.all([_loadCats(), _loadItens(true)]);
    const filtrado = _filtroLista ? itens.filter(i => i.categoria_id === _filtroLista) : itens;

    el.innerHTML = `
      <div class="hero">
        ${_HERO_IC}
        <div>
          <div class="hero-lbl">Recursos</div>
          <div class="hero-ttl">Itens e Estoque</div>
          <div class="hero-dsc">${itens.length} produto(s) · ${itens.filter(i=>_statusEstoque(i.estoque_atual,i.estoque_minimo)==='repor').length} para repor</div>
        </div>
        <div class="hero-act">
          <button class="tbt" onclick="go('recursos-dash')">← Voltar</button>
          <button class="tbt" onclick="recImprimirInventario()" style="color:var(--blue);border-color:rgba(74,156,245,.3)">Imprimir Lista</button>
          ${_podeGerenciar() ? `<button class="tbt" onclick="recAbrirNovoItem()" style="color:var(--amber);border-color:rgba(208,144,64,.3)">+ Novo Item</button>` : ''}
        </div>
      </div>
      <div class="ct">
        <div class="card">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
            <span onclick="recFiltrarLista('')" style="cursor:pointer;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid ${!_filtroLista?'var(--amber)':'var(--bd2)'};background:${!_filtroLista?'rgba(208,144,64,.12)':'transparent'};color:${!_filtroLista?'var(--amber)':'var(--tx3)'}">Todas</span>
            ${cats.map(c => `<span onclick="recFiltrarLista('${c.id}')" style="cursor:pointer;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid ${_filtroLista===c.id?'var(--amber)':'var(--bd2)'};background:${_filtroLista===c.id?'rgba(208,144,64,.12)':'transparent'};color:${_filtroLista===c.id?'var(--amber)':'var(--tx3)'}">${_esc(c.icone||'')} ${_esc(c.nome)}</span>`).join('')}
          </div>
          ${filtrado.length === 0 ? `<div style="color:var(--tx3);font-size:12px;padding:12px 0">Nenhum item encontrado.</div>` : `
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead>
                <tr style="border-bottom:1px solid var(--bd2)">
                  ${['Código','Produto','Un','Categoria','Est.Mín','Saldo','Custo unit.','Status',''].map(h => `<th style="text-align:left;padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${filtrado.map(i => `<tr style="border-bottom:1px solid var(--bd1)">
                  <td style="padding:9px 6px;color:var(--tx3);font-family:monospace;font-size:10.5px">${_esc(i.codigo||'—')}</td>
                  <td style="padding:9px 6px;font-weight:600;color:var(--tx1);max-width:220px">${_esc(i.nome)}</td>
                  <td style="padding:9px 6px;color:var(--tx3)">${_esc(i.unidade)}</td>
                  <td style="padding:9px 6px;color:var(--tx2)">${_esc(i.categoria?.icone||'')} ${_esc(i.categoria?.nome||'—')}</td>
                  <td style="padding:9px 6px;color:var(--tx3);text-align:center">${i.estoque_minimo}</td>
                  <td style="padding:9px 6px;font-weight:700;color:${_statusEstoque(i.estoque_atual,i.estoque_minimo)==='repor'?'var(--rose)':'var(--tx1)'};text-align:center;font-variant-numeric:tabular-nums">${i.estoque_atual}</td>
                  <td style="padding:9px 6px;color:var(--tx2);font-variant-numeric:tabular-nums">${i.custo_unitario ? _fmtR(i.custo_unitario) : '—'}</td>
                  <td style="padding:9px 6px">${_pillStatus(i.estoque_atual, i.estoque_minimo)}</td>
                  <td style="padding:9px 6px;text-align:right;white-space:nowrap">
                    <button onclick="recVerHistorico('${i.id}')" style="font-size:10.5px;padding:3px 9px;border-radius:5px;border:1px solid var(--bd2);background:none;color:var(--tx2);cursor:pointer;margin-right:3px">Histórico</button>
                    <button onclick="recAbrirNovaReq('${i.id}')" style="font-size:10.5px;padding:3px 9px;border-radius:5px;border:1px solid var(--bd2);background:none;color:var(--tx2);cursor:pointer;margin-right:3px">Solicitar</button>
                    ${_podeGerenciar() ? `
                    <button onclick="recAbrirEntrada('${i.id}')" style="font-size:10.5px;padding:3px 9px;border-radius:5px;border:1px solid rgba(58,170,92,.4);background:rgba(58,170,92,.08);color:var(--gr);cursor:pointer;margin-right:3px">+ Entrada</button>
                    <button onclick="recEditarEstoque('${i.id}','${_esc(i.nome)}',${i.estoque_atual},'${_esc(i.unidade)}')" style="font-size:10.5px;padding:3px 9px;border-radius:5px;border:1px solid rgba(208,144,64,.4);background:rgba(208,144,64,.08);color:var(--amber);cursor:pointer">Editar Estoque</button>` : ''}
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`}
        </div>
      </div>`;
  }

  // ══════════════════════════════════════════════════════
  // REQUISIÇÕES
  // ══════════════════════════════════════════════════════
  async function renderReq() {
    const el = document.getElementById('v-recursos-req');
    if (!el) return;

    const u     = _u();
    const podeG = _podeGerenciar();
    let rows = [];

    try {
      const ep = podeG
        ? `${_url()}/recursos_requisicoes?select=*,item:recursos_itens(nome,unidade)&status=eq.${_filtroReq}&order=criado_em.desc`
        : `${_url()}/recursos_requisicoes?select=*,item:recursos_itens(nome,unidade)&solicitante_id=eq.${u.id||'null'}&order=criado_em.desc`;
      const r = await fetch(ep, { headers: _hdr() });
      rows = r.ok ? await r.json() : [];
    } catch {}

    const chips = podeG ? [
      { id:'pendente',  label:'Pendentes',  cor:'var(--gold)' },
      { id:'aprovada',  label:'Aprovadas',  cor:'var(--gr)'   },
      { id:'rejeitada', label:'Rejeitadas', cor:'var(--rose)'  },
    ] : [];

    el.innerHTML = `
      <div class="hero">
        <div class="hero-ic" style="background:rgba(212,168,67,.12);border-color:rgba(212,168,67,.28)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
        </div>
        <div>
          <div class="hero-lbl">Recursos</div>
          <div class="hero-ttl">Requisições</div>
          <div class="hero-dsc">${podeG ? 'Todas as solicitações de saída de estoque' : 'Suas solicitações de recursos'}</div>
        </div>
        <div class="hero-act">
          <button class="tbt" onclick="go('recursos-dash')">← Voltar</button>
          <button class="tbt" onclick="recAbrirNovaReq()" style="color:var(--gr);border-color:rgba(58,170,92,.3)">+ Nova Requisição</button>
        </div>
      </div>
      <div class="ct">
        <div class="card">
          ${chips.length ? `<div style="display:flex;gap:6px;margin-bottom:12px">
            ${chips.map(c => `<span onclick="recFiltrarReq('${c.id}')" style="cursor:pointer;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid ${_filtroReq===c.id?c.cor:'var(--bd2)'};background:${_filtroReq===c.id?c.cor+'18':'transparent'};color:${_filtroReq===c.id?c.cor:'var(--tx3)'}">${c.label}</span>`).join('')}
          </div>` : ''}
          ${rows.length === 0 ? `<div style="color:var(--tx3);font-size:12px;padding:12px 0">Nenhuma requisição encontrada.</div>` : `
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr style="border-bottom:1px solid var(--bd2)">
                ${['Item','Qtd','Solicitante','Motivo','Data','Status',''].map(h => `<th style="text-align:left;padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`).join('')}
              </tr></thead>
              <tbody>
                ${rows.map(r => `<tr style="border-bottom:1px solid var(--bd1)">
                  <td style="padding:9px 6px;font-weight:600;color:var(--tx1)">${_esc(r.item?.nome||'—')}</td>
                  <td style="padding:9px 6px;color:var(--tx2);white-space:nowrap">${r.quantidade} ${_esc(r.item?.unidade||'')}</td>
                  <td style="padding:9px 6px;color:var(--tx2)">${_esc(r.solicitante_nome||'—')}</td>
                  <td style="padding:9px 6px;color:var(--tx3);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(r.motivo||'—')}</td>
                  <td style="padding:9px 6px;color:var(--tx3);white-space:nowrap">${_fmtD(r.criado_em)}</td>
                  <td style="padding:9px 6px">${_pillReq(r.status)}</td>
                  <td style="padding:9px 6px;text-align:right;white-space:nowrap">
                    ${podeG && r.status==='pendente' ? `
                      <button onclick="recAprovarReq('${r.id}','${r.item_id}',${r.quantidade})" style="font-size:10.5px;padding:3px 9px;border-radius:5px;border:1px solid rgba(58,170,92,.4);background:rgba(58,170,92,.08);color:var(--gr);cursor:pointer;font-weight:600;margin-right:3px">Aprovar</button>
                      <button onclick="recRejeitarReq('${r.id}')" style="font-size:10.5px;padding:3px 9px;border-radius:5px;border:1px solid rgba(208,104,104,.4);background:rgba(208,104,104,.08);color:var(--rose);cursor:pointer">Rejeitar</button>` : ''}
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`}
        </div>
      </div>`;
  }

  // ══════════════════════════════════════════════════════
  // MOVIMENTAÇÕES (modelo Excel: Data, Tipo, Produto, Un, Qtd, Custo, Total, Destino, Resp, Obs)
  // ══════════════════════════════════════════════════════
  async function renderMov() {
    const el = document.getElementById('v-recursos-mov');
    if (!el) return;

    let rows = [];
    try {
      const r = await fetch(`${_url()}/recursos_movimentos?select=*,item:recursos_itens(nome,unidade,codigo)&order=criado_em.desc&limit=100`, { headers: _hdr() });
      rows = r.ok ? await r.json() : [];
    } catch {}

    el.innerHTML = `
      <div class="hero">
        <div class="hero-ic" style="background:rgba(58,170,92,.12);border-color:rgba(58,170,92,.28)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gr)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m17 5-5-3-5 3"/><path d="m17 19-5 3-5-3"/></svg>
        </div>
        <div>
          <div class="hero-lbl">Recursos</div>
          <div class="hero-ttl">Movimentações</div>
          <div class="hero-dsc">Histórico de entradas, saídas e ajustes de estoque</div>
        </div>
        <div class="hero-act">
          <button class="tbt" onclick="go('recursos-dash')">← Voltar</button>
          ${_podeGerenciar() ? `
            <button class="tbt" onclick="recAbrirEntrada()" style="color:var(--gr);border-color:rgba(58,170,92,.3)">+ Registrar Entrada</button>
            <button class="tbt" onclick="recAbrirAjuste()" style="color:var(--amber);border-color:rgba(208,144,64,.3)">Ajuste de Inventário</button>` : ''}
        </div>
      </div>
      <div class="ct">
        <div class="card">
          ${rows.length === 0 ? `<div style="color:var(--tx3);font-size:12px;padding:12px 0">Nenhuma movimentação registrada.</div>` : `
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr style="border-bottom:1px solid var(--bd2)">
                ${['Data','Tipo','Produto','Un','Qtd','Custo unit.','Total','Destino/Setor','Responsável','Obs'].map(h => `<th style="text-align:left;padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`).join('')}
              </tr></thead>
              <tbody>
                ${rows.map(m => {
                  const c = TIPO_CFG[m.tipo] || {};
                  const total = m.valor_total ?? (m.custo_unitario ? m.quantidade * m.custo_unitario : null);
                  return `<tr style="border-bottom:1px solid var(--bd1)">
                    <td style="padding:9px 6px;color:var(--tx3);white-space:nowrap;font-variant-numeric:tabular-nums">${_fmtDT(m.criado_em)}</td>
                    <td style="padding:9px 6px">${_pillTipo(m.tipo)}</td>
                    <td style="padding:9px 6px;font-weight:600;color:var(--tx1);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(m.item?.nome||'—')}</td>
                    <td style="padding:9px 6px;color:var(--tx3)">${_esc(m.item?.unidade||'')}</td>
                    <td style="padding:9px 6px;font-weight:700;color:${c.cl||'var(--tx1)'};font-variant-numeric:tabular-nums">${c.sinal||''}${m.quantidade}</td>
                    <td style="padding:9px 6px;color:var(--tx2);font-variant-numeric:tabular-nums">${m.custo_unitario ? _fmtR(m.custo_unitario) : '—'}</td>
                    <td style="padding:9px 6px;color:var(--tx1);font-variant-numeric:tabular-nums">${total ? _fmtR(total) : '—'}</td>
                    <td style="padding:9px 6px;color:var(--tx2)">${_esc(m.destino_setor||'—')}</td>
                    <td style="padding:9px 6px;color:var(--tx2)">${_esc(m.responsavel||'—')}</td>
                    <td style="padding:9px 6px;color:var(--tx3);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(m.observacao||'—')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`}
        </div>
      </div>`;
  }

  // ══════════════════════════════════════════════════════
  // CATEGORIAS
  // ══════════════════════════════════════════════════════
  async function renderCat() {
    const el = document.getElementById('v-recursos-cat');
    if (!el) return;

    const cats = await _loadCats(true);

    el.innerHTML = `
      <div class="hero">
        <div class="hero-ic" style="background:rgba(139,111,212,.12);border-color:rgba(139,111,212,.28)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
        </div>
        <div>
          <div class="hero-lbl">Recursos</div>
          <div class="hero-ttl">Categorias</div>
          <div class="hero-dsc">Organize os itens por tipo</div>
        </div>
        <div class="hero-act">
          <button class="tbt" onclick="go('recursos-dash')">← Voltar</button>
          ${_podeGerenciar() ? `<button class="tbt" onclick="recAbrirNovaCat()" style="color:var(--violet);border-color:rgba(139,111,212,.3)">+ Nova Categoria</button>` : ''}
        </div>
      </div>
      <div class="ct">
        <div class="card">
          ${cats.length === 0 ? `<div style="color:var(--tx3);font-size:12px;padding:12px 0">Nenhuma categoria.</div>` : `
          <div style="display:flex;flex-direction:column;gap:8px">
            ${cats.map(c => `<div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;border:1px solid var(--bd2)">
              <span style="font-size:20px">${_esc(c.icone||'📦')}</span>
              <span style="flex:1;font-size:13px;font-weight:600;color:var(--tx1)">${_esc(c.nome)}</span>
              ${_podeGerenciar() ? `
                <button onclick="recEditarCat('${c.id}','${_esc(c.nome)}','${_esc(c.icone||'📦')}')" style="font-size:10.5px;padding:3px 9px;border-radius:5px;border:1px solid var(--bd2);background:none;color:var(--tx2);cursor:pointer">Editar</button>
                <button onclick="recExcluirCat('${c.id}')" style="font-size:10.5px;padding:3px 9px;border-radius:5px;border:1px solid rgba(208,104,104,.3);background:none;color:var(--rose);cursor:pointer">Excluir</button>` : ''}
            </div>`).join('')}
          </div>`}
        </div>
      </div>`;
  }

  // ══════════════════════════════════════════════════════
  // MODAL HELPER
  // ══════════════════════════════════════════════════════
  function _modal(titulo, corpo, acoes) {
    let el = document.getElementById('rec-modal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rec-modal';
      el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px';
      document.body.appendChild(el);
    }
    el.innerHTML = `<div style="background:var(--bg-card);border-radius:12px;padding:24px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.2)">
      <div style="font-size:15px;font-weight:700;color:var(--tx1);margin-bottom:16px">${titulo}</div>
      ${corpo}
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
        ${acoes}
        <button onclick="document.getElementById('rec-modal').remove()" style="padding:8px 18px;border-radius:7px;border:1px solid var(--bd2);background:none;color:var(--tx2);font-size:12.5px;cursor:pointer">Cancelar</button>
      </div>
    </div>`;
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  }

  // ══════════════════════════════════════════════════════
  // AÇÕES PÚBLICAS
  // ══════════════════════════════════════════════════════

  // ── Requisição ────────────────────────────────────────
  window.recAbrirNovaReq = async function(preId) {
    const itens = await _loadItens();
    const u = _u();
    _modal('Nova Requisição',
      `<label style="${_LBL}">Item *</label>
       <select id="rec-req-item" style="${_SI}">
         <option value="">Selecione…</option>
         ${itens.map(i => `<option value="${i.id}" ${preId===i.id?'selected':''}>${_esc(i.nome)} — saldo: ${i.estoque_atual} ${_esc(i.unidade)}</option>`).join('')}
       </select>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
         <div><label style="${_LBL}">Quantidade *</label>
          <input id="rec-req-qtd" type="number" min="1" step="1" placeholder="0" style="${_SI}"></div>
         <div><label style="${_LBL}">Destino/Setor</label>
          <select id="rec-req-dest" style="${_SI}"><option value="">Selecione…</option>${DESTINOS.map(d=>`<option>${d}</option>`).join('')}</select></div>
       </div>
       <label style="${_LBL}">Seu nome *</label>
       <input id="rec-req-sol" type="text" value="${_esc(u.nome||u.email||'')}" style="${_SI}">
       <label style="${_LBL}">Para que será usado</label>
       <textarea id="rec-req-motivo" rows="2" style="${_SI};resize:vertical"></textarea>`,
      `<button onclick="recSalvarReq()" style="padding:8px 20px;border-radius:7px;border:none;background:var(--gr);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Enviar Requisição</button>`
    );
  };

  window.recSalvarReq = async function() {
    const itemId = document.getElementById('rec-req-item')?.value;
    const qtd    = parseFloat(document.getElementById('rec-req-qtd')?.value);
    const dest   = document.getElementById('rec-req-dest')?.value || null;
    const sol    = document.getElementById('rec-req-sol')?.value?.trim();
    const motivo = document.getElementById('rec-req-motivo')?.value?.trim();
    if (!itemId || !qtd || qtd <= 0 || !sol) { alert('Preencha item, quantidade e seu nome.'); return; }
    const u = _u();
    try {
      const r = await fetch(`${_url()}/recursos_requisicoes`, {
        method:'POST', headers:_hdrJ(),
        body: JSON.stringify({ item_id:itemId, quantidade:qtd, solicitante_nome:sol, solicitante_id:u.id||null, motivo:motivo||null, status:'pendente' })
      });
      if (!r.ok) throw new Error(await r.text());
      document.getElementById('rec-modal')?.remove();
      if (typeof T==='function') T('Requisição enviada','Aguardando aprovação');
      _itens = null;
      if (document.getElementById('v-recursos-dash')) renderDash();
      if (document.getElementById('v-recursos-req'))  renderReq();
    } catch(e) { alert('Erro: '+e.message); }
  };

  // ── Aprovar requisição ────────────────────────────────
  window.recAprovarReq = async function(reqId, itemId, quantidade) {
    if (!confirm(`Confirmar aprovação de ${quantidade} unidade(s)?`)) return;
    const u = _u();
    try {
      await fetch(`${_url()}/recursos_requisicoes?id=eq.${reqId}`, {
        method:'PATCH', headers:_hdrJ(),
        body: JSON.stringify({ status:'aprovada', aprovado_por: u.nome||u.email||'Responsável', resolvido_em: new Date().toISOString() })
      });
      await fetch(`${_url()}/recursos_movimentos`, {
        method:'POST', headers:_hdrJ(),
        body: JSON.stringify({ item_id:itemId, tipo:'saida', quantidade, responsavel: u.nome||u.email||'Responsável', observacao:'Requisição aprovada' })
      });
      if (typeof T==='function') T('Requisição aprovada','Estoque debitado');
      _itens = null;
      if (document.getElementById('v-recursos-dash')) renderDash();
      if (document.getElementById('v-recursos-req'))  renderReq();
    } catch(e) { alert('Erro: '+e.message); }
  };

  window.recRejeitarReq = async function(reqId) {
    const obs = prompt('Motivo da rejeição (opcional):');
    if (obs === null) return;
    const u = _u();
    try {
      await fetch(`${_url()}/recursos_requisicoes?id=eq.${reqId}`, {
        method:'PATCH', headers:_hdrJ(),
        body: JSON.stringify({ status:'rejeitada', aprovado_por: u.nome||u.email||'Responsável', observacao:obs||null, resolvido_em: new Date().toISOString() })
      });
      if (typeof T==='function') T('Requisição rejeitada', obs||'');
      _itens = null;
      if (document.getElementById('v-recursos-dash')) renderDash();
      if (document.getElementById('v-recursos-req'))  renderReq();
    } catch(e) { alert('Erro: '+e.message); }
  };

  // ── Entrada de estoque ────────────────────────────────
  window.recAbrirEntrada = async function(preId) {
    const itens = await _loadItens();
    _modal('Registrar Entrada',
      `<label style="${_LBL}">Item *</label>
       <select id="rec-ent-item" style="${_SI}">
         <option value="">Selecione…</option>
         ${itens.map(i => `<option value="${i.id}" data-cu="${i.custo_unitario||''}" ${preId===i.id?'selected':''}>${_esc(i.nome)} — saldo: ${i.estoque_atual} ${_esc(i.unidade)}</option>`).join('')}
       </select>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
         <div><label style="${_LBL}">Quantidade *</label>
          <input id="rec-ent-qtd" type="number" min="0.001" step="any" placeholder="0" style="${_SI}" oninput="recAtualizarTotalEnt()"></div>
         <div><label style="${_LBL}">Custo unitário (R$)</label>
          <input id="rec-ent-cu" type="number" min="0" step="0.01" placeholder="0,00" style="${_SI}" oninput="recAtualizarTotalEnt()"></div>
       </div>
       <div style="padding:8px 12px;border-radius:7px;background:var(--bd1);font-size:12px;color:var(--tx2);margin-top:8px">
         Total: <span id="rec-ent-total" style="font-weight:700;color:var(--tx1)">—</span>
       </div>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
         <div><label style="${_LBL}">Destino/Setor</label>
          <select id="rec-ent-dest" style="${_SI}"><option value="">Estoque Central</option>${DESTINOS.map(d=>`<option>${d}</option>`).join('')}</select></div>
         <div><label style="${_LBL}">Documento (NF, etc.)</label>
          <input id="rec-ent-doc" type="text" placeholder="Ex: NF 2191" style="${_SI}"></div>
       </div>
       <label style="${_LBL}">Observação</label>
       <input id="rec-ent-obs" type="text" style="${_SI}">`,
      `<button onclick="recSalvarEntrada()" style="padding:8px 20px;border-radius:7px;border:none;background:var(--gr);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Confirmar Entrada</button>`
    );
    // pre-fill custo if item selected
    if (preId) {
      const sel = document.getElementById('rec-ent-item');
      if (sel) {
        sel.value = preId;
        const opt = sel.querySelector(`option[value="${preId}"]`);
        const cu = opt?.dataset?.cu;
        if (cu) {
          const cuEl = document.getElementById('rec-ent-cu');
          if (cuEl) cuEl.value = cu;
        }
      }
    }
    // auto-fill custo from item selection
    const sel = document.getElementById('rec-ent-item');
    if (sel) sel.addEventListener('change', function() {
      const opt = this.options[this.selectedIndex];
      const cu = opt?.dataset?.cu;
      const cuEl = document.getElementById('rec-ent-cu');
      if (cuEl && cu) cuEl.value = cu;
      recAtualizarTotalEnt();
    });
  };

  window.recAtualizarTotalEnt = function() {
    const qtd = parseFloat(document.getElementById('rec-ent-qtd')?.value || '0');
    const cu  = parseFloat(document.getElementById('rec-ent-cu')?.value  || '0');
    const el  = document.getElementById('rec-ent-total');
    if (el) el.textContent = (qtd > 0 && cu > 0) ? _fmtR(qtd * cu) : '—';
  };

  window.recSalvarEntrada = async function() {
    const itemId = document.getElementById('rec-ent-item')?.value;
    const qtd    = parseFloat(document.getElementById('rec-ent-qtd')?.value);
    const cu     = parseFloat(document.getElementById('rec-ent-cu')?.value  || '0') || null;
    const dest   = document.getElementById('rec-ent-dest')?.value || null;
    const doc    = document.getElementById('rec-ent-doc')?.value?.trim() || null;
    const obs    = document.getElementById('rec-ent-obs')?.value?.trim() || null;
    if (!itemId || !qtd || qtd <= 0) { alert('Selecione o item e informe a quantidade.'); return; }
    const u = _u();
    const vt = (cu && qtd) ? cu * qtd : null;
    try {
      const r = await fetch(`${_url()}/recursos_movimentos`, {
        method:'POST', headers:_hdrJ(),
        body: JSON.stringify({ item_id:itemId, tipo:'entrada', quantidade:qtd, custo_unitario:cu, valor_total:vt, destino_setor:dest, observacao:doc||obs||null, responsavel:u.nome||u.email||null })
      });
      if (!r.ok) throw new Error(await r.text());
      document.getElementById('rec-modal')?.remove();
      if (typeof T==='function') T('Entrada registrada', `+${qtd} unidade(s)${vt?' · '+_fmtR(vt):''}`);
      _itens = null;
      if (document.getElementById('v-recursos-dash'))  renderDash();
      if (document.getElementById('v-recursos-lista')) renderLista();
      if (document.getElementById('v-recursos-mov'))   renderMov();
    } catch(e) { alert('Erro: '+e.message); }
  };

  // ── Ajuste de inventário ──────────────────────────────
  window.recAbrirAjuste = async function() {
    const itens = await _loadItens();
    _modal('Ajuste de Inventário',
      `<div style="font-size:11.5px;color:var(--tx3);margin-bottom:8px">Use para corrigir diferenças encontradas em contagem física.</div>
       <label style="${_LBL}">Tipo de ajuste *</label>
       <select id="rec-adj-tipo" style="${_SI}">
         <option value="ajuste">Definir estoque exato</option>
         <option value="ajuste_entrada">Ajuste entrada (acréscimo)</option>
         <option value="ajuste_saida">Ajuste saída (decréscimo)</option>
       </select>
       <label style="${_LBL}">Item *</label>
       <select id="rec-adj-item" style="${_SI}">
         <option value="">Selecione…</option>
         ${itens.map(i => `<option value="${i.id}">${_esc(i.nome)} — atual: ${i.estoque_atual} ${_esc(i.unidade)}</option>`).join('')}
       </select>
       <label style="${_LBL}">Quantidade / Novo estoque *</label>
       <input id="rec-adj-qtd" type="number" min="0" step="any" placeholder="0" style="${_SI}">
       <label style="${_LBL}">Motivo do ajuste</label>
       <input id="rec-adj-obs" type="text" placeholder="Ex: contagem física, perda, extravio" style="${_SI}">`,
      `<button onclick="recSalvarAjuste()" style="padding:8px 20px;border-radius:7px;border:none;background:var(--amber);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Confirmar Ajuste</button>`
    );
  };

  window.recSalvarAjuste = async function() {
    const tipo   = document.getElementById('rec-adj-tipo')?.value || 'ajuste';
    const itemId = document.getElementById('rec-adj-item')?.value;
    const qtd    = parseFloat(document.getElementById('rec-adj-qtd')?.value);
    const obs    = document.getElementById('rec-adj-obs')?.value?.trim();
    if (!itemId || isNaN(qtd) || qtd < 0) { alert('Selecione o item e informe a quantidade.'); return; }
    const u = _u();
    try {
      const r = await fetch(`${_url()}/recursos_movimentos`, {
        method:'POST', headers:_hdrJ(),
        body: JSON.stringify({ item_id:itemId, tipo, quantidade:qtd, observacao:obs||'Ajuste manual', responsavel:u.nome||u.email||null })
      });
      if (!r.ok) throw new Error(await r.text());
      document.getElementById('rec-modal')?.remove();
      if (typeof T==='function') T('Ajuste realizado', TIPO_CFG[tipo]?.lbl + ': ' + qtd);
      _itens = null;
      if (document.getElementById('v-recursos-dash'))  renderDash();
      if (document.getElementById('v-recursos-lista')) renderLista();
    } catch(e) { alert('Erro: '+e.message); }
  };

  // ── Novo item ─────────────────────────────────────────
  window.recAbrirNovoItem = async function() {
    const cats = await _loadCats();
    _modal('Novo Item',
      `<label style="${_LBL}">Produto *</label>
       <input id="rec-it-nome" type="text" style="${_SI}">
       <label style="${_LBL}">Código de barras (EAN)</label>
       <input id="rec-it-cod" type="text" placeholder="13 dígitos" style="${_SI}">
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
         <div><label style="${_LBL}">Categoria</label>
          <select id="rec-it-cat" style="${_SI}">
            <option value="">Sem categoria</option>
            ${cats.map(c => `<option value="${c.id}">${_esc(c.icone||'')} ${_esc(c.nome)}</option>`).join('')}
          </select></div>
         <div><label style="${_LBL}">Unidade</label>
          <select id="rec-it-und" style="${_SI}">
            ${['UN','KG','G','L','ML','CX','PCT','ROLO','GL'].map(u => `<option>${u}</option>`).join('')}
          </select></div>
       </div>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
         <div><label style="${_LBL}">Estoque mínimo</label>
          <input id="rec-it-min" type="number" min="0" step="any" value="0" style="${_SI}"></div>
         <div><label style="${_LBL}">Custo unitário (R$)</label>
          <input id="rec-it-cu" type="number" min="0" step="0.01" placeholder="0,00" style="${_SI}"></div>
       </div>`,
      `<button onclick="recSalvarNovoItem()" style="padding:8px 20px;border-radius:7px;border:none;background:var(--amber);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Criar Item</button>`
    );
  };

  window.recSalvarNovoItem = async function() {
    const nome   = document.getElementById('rec-it-nome')?.value?.trim();
    const codigo = document.getElementById('rec-it-cod')?.value?.trim() || null;
    const catId  = document.getElementById('rec-it-cat')?.value || null;
    const und    = document.getElementById('rec-it-und')?.value || 'UN';
    const min    = parseFloat(document.getElementById('rec-it-min')?.value || '0');
    const cu     = parseFloat(document.getElementById('rec-it-cu')?.value  || '0') || null;
    if (!nome) { alert('Informe o nome do produto.'); return; }
    try {
      const r = await fetch(`${_url()}/recursos_itens`, {
        method:'POST', headers:_hdrJ(),
        body: JSON.stringify({ nome, codigo, categoria_id:catId, unidade:und, estoque_minimo:min, estoque_atual:0, custo_unitario:cu })
      });
      if (!r.ok) throw new Error(await r.text());
      document.getElementById('rec-modal')?.remove();
      if (typeof T==='function') T('Item criado', nome);
      _itens = null;
      if (document.getElementById('v-recursos-lista')) renderLista();
      if (document.getElementById('v-recursos-dash'))  renderDash();
    } catch(e) { alert('Erro: '+e.message); }
  };

  // ── Categorias CRUD ───────────────────────────────────
  window.recAbrirNovaCat = function() {
    _modal('Nova Categoria',
      `<label style="${_LBL}">Nome *</label>
       <input id="rec-cat-nome" type="text" style="${_SI}">
       <label style="${_LBL}">Ícone (emoji)</label>
       <input id="rec-cat-icone" type="text" maxlength="4" placeholder="📦" style="${_SI};max-width:80px">`,
      `<button onclick="recSalvarCat()" style="padding:8px 20px;border-radius:7px;border:none;background:var(--violet);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Criar</button>`
    );
  };

  window.recEditarCat = function(id, nome, icone) {
    _modal('Editar Categoria',
      `<input type="hidden" id="rec-cat-id" value="${id}">
       <label style="${_LBL}">Nome *</label>
       <input id="rec-cat-nome" type="text" value="${_esc(nome)}" style="${_SI}">
       <label style="${_LBL}">Ícone (emoji)</label>
       <input id="rec-cat-icone" type="text" maxlength="4" value="${_esc(icone)}" style="${_SI};max-width:80px">`,
      `<button onclick="recSalvarCat()" style="padding:8px 20px;border-radius:7px;border:none;background:var(--violet);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Salvar</button>`
    );
  };

  window.recSalvarCat = async function() {
    const id    = document.getElementById('rec-cat-id')?.value;
    const nome  = document.getElementById('rec-cat-nome')?.value?.trim();
    const icone = document.getElementById('rec-cat-icone')?.value?.trim() || '📦';
    if (!nome) { alert('Informe o nome.'); return; }
    try {
      const ep  = id ? `${_url()}/recursos_categorias?id=eq.${id}` : `${_url()}/recursos_categorias`;
      const mth = id ? 'PATCH' : 'POST';
      await fetch(ep, { method:mth, headers:_hdrJ(), body: JSON.stringify({ nome, icone }) });
      document.getElementById('rec-modal')?.remove();
      if (typeof T==='function') T(id ? 'Categoria atualizada' : 'Categoria criada', nome);
      _categorias = null;
      if (document.getElementById('v-recursos-cat')) renderCat();
    } catch(e) { alert('Erro: '+e.message); }
  };

  window.recExcluirCat = async function(id) {
    if (!confirm('Excluir esta categoria?')) return;
    try {
      await fetch(`${_url()}/recursos_categorias?id=eq.${id}`, { method:'DELETE', headers:_hdr() });
      if (typeof T==='function') T('Categoria excluída','');
      _categorias = null; _itens = null;
      if (document.getElementById('v-recursos-cat')) renderCat();
    } catch(e) { alert('Erro: '+e.message); }
  };

  // ══════════════════════════════════════════════════════
  // HISTÓRICO POR PRODUTO
  // ══════════════════════════════════════════════════════
  window.recVerHistorico = function(itemId) { _itemAtual = itemId; go('recursos-hist'); };

  async function renderHist() {
    const el = document.getElementById('v-recursos-hist');
    if (!el) return;

    if (!_itemAtual) {
      el.innerHTML = `<div class="hero">${_HERO_IC}<div><div class="hero-ttl">Histórico</div></div><div class="hero-act"><button class="tbt" onclick="go('recursos-lista')">← Voltar</button></div></div><div class="ct"><div class="card"><div style="color:var(--tx3);font-size:12px;padding:12px 0">Selecione um item na lista.</div></div></div>`;
      return;
    }

    el.innerHTML = `<div class="ct" style="padding-top:20px"><div style="color:var(--tx3);font-size:12px;text-align:center;padding:40px 0">Carregando…</div></div>`;

    let item = null, movs = [];
    try {
      const [ri, rm] = await Promise.all([
        fetch(`${_url()}/recursos_itens?id=eq.${_itemAtual}&select=*,categoria:recursos_categorias(nome,icone)`, { headers: _hdr() }),
        fetch(`${_url()}/recursos_movimentos?item_id=eq.${_itemAtual}&select=*,nota:recursos_notas_fiscais(numero,serie)&order=criado_em.asc`, { headers: _hdr() }),
      ]);
      item = ri.ok ? (await ri.json())[0] : null;
      movs = rm.ok ? await rm.json() : [];
    } catch {}

    if (!item) {
      el.innerHTML = `<div class="ct"><div class="card"><div style="color:var(--rose)">Item não encontrado.</div></div></div>`;
      return;
    }

    // Saldo acumulado
    let saldo = 0;
    const comSaldo = movs.map(m => {
      if (m.tipo === 'entrada' || m.tipo === 'ajuste_entrada') saldo += Number(m.quantidade);
      else if (m.tipo === 'saida' || m.tipo === 'ajuste_saida') saldo = Math.max(0, saldo - Number(m.quantidade));
      else if (m.tipo === 'ajuste') saldo = Number(m.quantidade);
      return { ...m, _saldo: saldo };
    });
    const linhas = [...comSaldo].reverse();

    const totEnt = movs.filter(m => ['entrada','ajuste_entrada'].includes(m.tipo)).reduce((a,m) => a + Number(m.quantidade), 0);
    const totSai = movs.filter(m => ['saida','ajuste_saida'].includes(m.tipo)).reduce((a,m) => a + Number(m.quantidade), 0);
    const valorTotal = movs.filter(m => m.tipo==='entrada' && m.valor_total).reduce((a,m) => a + Number(m.valor_total), 0);
    const statusCor = _statusEstoque(item.estoque_atual, item.estoque_minimo) === 'repor' ? 'var(--rose)' : 'var(--gr)';

    el.innerHTML = `
      <div class="hero">
        ${_HERO_IC}
        <div>
          <div class="hero-lbl">Recursos · ${_esc(item.categoria?.icone||'')} ${_esc(item.categoria?.nome||'Estoque')}</div>
          <div class="hero-ttl" style="display:flex;align-items:center;gap:8px">${_esc(item.nome)} ${_pillStatus(item.estoque_atual, item.estoque_minimo)}</div>
          <div class="hero-dsc">${item.codigo ? `EAN: ${_esc(item.codigo)} · ` : ''}Custo unit.: ${_fmtR(item.custo_unitario)}</div>
        </div>
        <div class="hero-act">
          <button class="tbt" onclick="go('recursos-lista')">← Voltar</button>
          <button class="tbt" onclick="recAbrirNovaReq('${item.id}')">Solicitar</button>
          ${_podeGerenciar() ? `<button class="tbt" onclick="recAbrirEntrada('${item.id}')" style="color:var(--gr);border-color:rgba(58,170,92,.3)">+ Entrada</button>` : ''}
        </div>
      </div>
      <div class="ct">
        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px">
          ${[
            { n:item.estoque_atual, lbl:'Saldo atual', sub:`mín ${item.estoque_minimo} ${_esc(item.unidade)}`, cor:statusCor, ic:'<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>' },
            { n:'+'+totEnt,         lbl:'Total entradas', sub:`${movs.filter(m=>['entrada','ajuste_entrada'].includes(m.tipo)).length} registro(s)`, cor:'var(--gr)', ic:'<path d="M12 2v20"/><path d="m17 5-5-3-5 3"/>' },
            { n:'−'+totSai,         lbl:'Total saídas',   sub:`${movs.filter(m=>['saida','ajuste_saida'].includes(m.tipo)).length} registro(s)`, cor:'var(--rose)', ic:'<path d="M12 22V2"/><path d="m17 19-5 3-5-3"/>' },
            { n:_fmtR(valorTotal||null), lbl:'Valor em compras', sub:`${movs.filter(m=>m.tipo==='entrada').length} entrada(s)`, cor:'var(--teal)', ic:'<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
          ].map(k => `<div class="card" style="padding:12px 14px;display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:${k.cor}1a;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${k.cor}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${k.ic}</svg>
            </div>
            <div>
              <div style="font-size:18px;font-weight:800;color:${k.cor};line-height:1">${k.n}</div>
              <div style="font-size:11px;color:var(--tx2);font-weight:600;margin-top:2px">${k.lbl}</div>
              <div style="font-size:10px;color:var(--tx3)">${k.sub}</div>
            </div>
          </div>`).join('')}
        </div>

        <div class="card">
          <div class="ctit">Histórico de Movimentos</div>
          ${linhas.length === 0
            ? `<div style="color:var(--tx3);font-size:12px;padding:12px 0">Nenhum movimento registrado.</div>`
            : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr style="border-bottom:1px solid var(--bd2)">
                ${['Data/Hora','Tipo','Qtd','Custo unit.','Total','Saldo','Destino','Referência','Responsável'].map(h => `<th style="text-align:left;padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`).join('')}
              </tr></thead>
              <tbody>
                ${linhas.map(m => {
                  const c    = TIPO_CFG[m.tipo] || {};
                  const corS = m._saldo <= (item.estoque_minimo||0) ? 'var(--rose)' : 'var(--tx1)';
                  const nfRef = m.nota?.numero ? `NF ${m.nota.numero}` : (m.observacao ? _esc(m.observacao.substring(0,40)) : '—');
                  const vt   = m.valor_total ?? (m.custo_unitario ? m.quantidade * m.custo_unitario : null);
                  return `<tr style="border-bottom:1px solid var(--bd1)">
                    <td style="padding:9px 6px;color:var(--tx3);white-space:nowrap;font-variant-numeric:tabular-nums">${_fmtDT(m.criado_em)}</td>
                    <td style="padding:9px 6px">${_pillTipo(m.tipo)}</td>
                    <td style="padding:9px 6px;font-weight:700;color:${c.cl||'var(--tx2)'};;font-variant-numeric:tabular-nums">${c.sinal||''}${m.quantidade} ${_esc(item.unidade)}</td>
                    <td style="padding:9px 6px;color:var(--tx2);font-variant-numeric:tabular-nums">${m.custo_unitario ? _fmtR(m.custo_unitario) : '—'}</td>
                    <td style="padding:9px 6px;color:var(--tx1);font-variant-numeric:tabular-nums">${vt ? _fmtR(vt) : '—'}</td>
                    <td style="padding:9px 6px;font-weight:700;color:${corS};font-variant-numeric:tabular-nums">${m._saldo} ${_esc(item.unidade)}</td>
                    <td style="padding:9px 6px;color:var(--tx2)">${_esc(m.destino_setor||'—')}</td>
                    <td style="padding:9px 6px;color:var(--tx2);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nfRef}</td>
                    <td style="padding:9px 6px;color:var(--tx3)">${_esc(m.responsavel||'—')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table></div>`}
        </div>
      </div>`;
  }

  // ── Imprimir lista para inventário ───────────────────
  window.recImprimirInventario = async function() {
    const itens = await _loadItens();
    const data  = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
    const linhas = itens.map((i, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-family:monospace;font-size:10px">${i.codigo || '—'}</td>
        <td style="font-weight:600">${i.nome}</td>
        <td style="text-align:center">${i.unidade}</td>
        <td style="text-align:center">${i.categoria?.nome || '—'}</td>
        <td style="text-align:center">${i.estoque_minimo}</td>
        <td style="text-align:center;font-weight:700">${i.estoque_atual}</td>
        <td></td>
        <td></td>
        <td></td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>Inventário — ${data}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 24px; }
        h2 { margin: 0 0 2px; font-size: 15px; }
        .sub { font-size: 10px; color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f0f0f0; padding: 6px 5px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .05em; border: 1px solid #ccc; }
        td { padding: 6px 5px; border: 1px solid #ddd; vertical-align: middle; }
        tr:nth-child(even) td { background: #fafafa; }
        .footer { margin-top: 28px; display: flex; justify-content: space-between; font-size: 10px; color: #555; }
        .assin { border-top: 1px solid #555; padding-top: 4px; min-width: 200px; text-align: center; }
        @media print { body { margin: 12px; } }
      </style></head><body>
      <h2>Igreja Presbiteriana da Penha — SIPEN</h2>
      <div class="sub">Folha de Inventário · Gestão de Recursos · Data: ${data}</div>
      <table>
        <thead><tr>
          <th>#</th><th>Código</th><th>Produto</th><th>Un</th><th>Categoria</th>
          <th>Est.Mín</th><th>Saldo Sistema</th><th>Contagem Física</th><th>Diferença</th><th>Obs</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
      <div class="footer">
        <div>Total de itens: <strong>${itens.length}</strong></div>
        <div class="assin">Responsável pela conferência</div>
        <div class="assin">Aprovação</div>
      </div>
      <script>window.onload = () => window.print();<\/script>
      </body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) { w.document.write(html); w.document.close(); }
  };

  // ── Editar estoque manualmente (admin) ────────────────
  window.recEditarEstoque = function(itemId, nomeItem, estoqueAtual, unidade) {
    _modal(`Editar Estoque — ${nomeItem}`,
      `<div style="font-size:11.5px;color:var(--tx3);margin-bottom:12px">
         Saldo atual no sistema: <strong style="color:var(--tx1)">${estoqueAtual} ${unidade}</strong>
       </div>
       <label style="${_LBL}">Novo valor de estoque *</label>
       <input id="rec-ed-val" type="number" min="0" step="any" value="${estoqueAtual}" style="${_SI};font-size:15px;font-weight:700">
       <label style="${_LBL}">Motivo da alteração *</label>
       <input id="rec-ed-obs" type="text" placeholder="Ex: contagem física, correção de lançamento" style="${_SI}">
       <input type="hidden" id="rec-ed-id" value="${itemId}">
       <input type="hidden" id="rec-ed-und" value="${unidade}">`,
      `<button onclick="recSalvarEdicaoEstoque()" style="padding:8px 20px;border-radius:7px;border:none;background:var(--amber);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Confirmar Alteração</button>`
    );
    setTimeout(() => document.getElementById('rec-ed-val')?.select(), 50);
  };

  window.recSalvarEdicaoEstoque = async function() {
    const itemId = document.getElementById('rec-ed-id')?.value;
    const novoVal = parseFloat(document.getElementById('rec-ed-val')?.value);
    const obs     = document.getElementById('rec-ed-obs')?.value?.trim();
    const und     = document.getElementById('rec-ed-und')?.value || '';
    if (!itemId || isNaN(novoVal) || novoVal < 0) { alert('Informe um valor válido.'); return; }
    if (!obs) { alert('Informe o motivo da alteração.'); return; }
    const u = _u();
    try {
      const r = await fetch(`${_url()}/recursos_movimentos`, {
        method: 'POST', headers: _hdrJ(),
        body: JSON.stringify({
          item_id: itemId, tipo: 'ajuste', quantidade: novoVal,
          observacao: obs, responsavel: u.nome || u.email || 'Admin'
        })
      });
      if (!r.ok) throw new Error(await r.text());
      document.getElementById('rec-modal')?.remove();
      if (typeof T === 'function') T('Estoque atualizado', `Novo valor: ${novoVal} ${und}`);
      _itens = null;
      if (document.getElementById('v-recursos-lista')) renderLista();
      if (document.getElementById('v-recursos-dash'))  renderDash();
    } catch(e) { alert('Erro: ' + e.message); }
  };

  // ── Filtros ───────────────────────────────────────────
  window.recFiltrarLista = function(catId) { _filtroLista = catId; renderLista(); };
  window.recFiltrarReq   = function(status) { _filtroReq  = status; renderReq(); };

  // ── Registro de views ─────────────────────────────────
  if (typeof VIEW_AUTOLOAD !== 'undefined') {
    VIEW_AUTOLOAD['recursos-dash']  = { fn: renderDash };
    VIEW_AUTOLOAD['recursos-lista'] = { fn: renderLista };
    VIEW_AUTOLOAD['recursos-req']   = { fn: renderReq };
    VIEW_AUTOLOAD['recursos-mov']   = { fn: renderMov };
    VIEW_AUTOLOAD['recursos-cat']   = { fn: renderCat };
    VIEW_AUTOLOAD['recursos-hist']  = { fn: renderHist };
  }

})();
