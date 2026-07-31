/* ═══════════════════════════════════════════════════════
   SIPEN — Pedidos de Compra
   modules/compras/index.js · v1.0
═══════════════════════════════════════════════════════ */
(function () {

  const LIMITE_COTACAO = 500;

  let _pedidoAtual = null;
  let _filtroLista = 'ativos';
  let _cache = null;

  // ── Helpers ────────────────────────────────────────────
  function _url()  { return apiBaseUrl() + '/rest/v1'; }
  function _hdr()  { return apiHeaders(); }
  function _hdrJ() { return { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=representation' }; }
  function _esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _fmtD(iso)  { if (!iso) return '—'; return new Date(iso).toLocaleDateString('pt-BR'); }
  function _fmtDT(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) + ' ' +
           d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  }
  function _fmtR(v) {
    return v != null
      ? 'R$ ' + Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
      : '—';
  }
  function _numPC(numero) {
    return `PC-${new Date().getFullYear()}-${String(numero).padStart(4,'0')}`;
  }

  const STATUS_CFG = {
    pendente:             { lbl:'Pendente',         bg:'rgba(212,168,67,.12)',  cl:'var(--gold)'   },
    em_analise:           { lbl:'Em análise',       bg:'rgba(74,156,245,.12)',  cl:'var(--blue)'   },
    em_cotacao:           { lbl:'Em cotação',       bg:'rgba(139,111,212,.12)', cl:'var(--violet)' },
    aguardando_aprovacao: { lbl:'Ag. aprovação',    bg:'rgba(208,144,64,.12)',  cl:'var(--amber)'  },
    aprovado:             { lbl:'Aprovado',         bg:'rgba(58,170,92,.12)',   cl:'var(--gr)'     },
    em_pedido:            { lbl:'Pedido realizado', bg:'rgba(42,181,192,.12)',  cl:'var(--teal)'   },
    recebido:             { lbl:'Recebido',         bg:'rgba(58,170,92,.2)',    cl:'var(--gr)'     },
    encerrado:            { lbl:'Encerrado',        bg:'rgba(90,96,104,.1)',    cl:'var(--tx3)'    },
    rejeitado:            { lbl:'Rejeitado',        bg:'rgba(208,104,104,.12)', cl:'var(--rose)'   },
    cancelado:            { lbl:'Cancelado',        bg:'rgba(90,96,104,.1)',    cl:'var(--tx3)'    },
  };

  const URGENCIA_CFG = {
    normal:  { lbl:'Normal',  cl:'var(--tx3)'   },
    urgente: { lbl:'Urgente', cl:'var(--amber)'  },
    critico: { lbl:'Crítico', cl:'var(--rose)'   },
  };

  function _pillStatus(s) {
    const c = STATUS_CFG[s] || { bg:'var(--bd1)', cl:'var(--tx3)', lbl:s };
    return `<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;background:${c.bg};color:${c.cl};white-space:nowrap">${c.lbl}</span>`;
  }

  function _pillUrg(u) {
    const c = URGENCIA_CFG[u] || {};
    if (!u || u === 'normal') return '';
    return `<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;background:${c.cl}1a;color:${c.cl}">${c.lbl}</span>`;
  }

  const _LBL = 'display:block;font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;margin-top:12px';
  const _INP = 'width:100%;padding:7px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12.5px;box-sizing:border-box';

  const _HERO_IC = `<div class="hero-ic" style="background:rgba(74,156,245,.12);border-color:rgba(74,156,245,.28)">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  </div>`;

  // ── Data ───────────────────────────────────────────────
  async function _loadPedidos(force) {
    if (_cache && !force) return _cache;
    try {
      const r = await fetch(`${_url()}/pedidos_compra?select=*&order=criado_em.desc`, { headers: _hdr() });
      _cache = r.ok ? await r.json() : [];
    } catch { _cache = []; }
    return _cache;
  }

  async function _loadPedido(id) {
    try {
      const [rp, ri, rh] = await Promise.all([
        fetch(`${_url()}/pedidos_compra?id=eq.${id}&select=*`, { headers: _hdr() }),
        fetch(`${_url()}/pedidos_compra_itens?pedido_id=eq.${id}&select=*&order=criado_em.asc`, { headers: _hdr() }),
        fetch(`${_url()}/pedidos_compra_historico?pedido_id=eq.${id}&select=*&order=criado_em.asc`, { headers: _hdr() }),
      ]);
      return {
        pedido: rp.ok ? (await rp.json())[0] : null,
        itens:  ri.ok ? await ri.json() : [],
        hist:   rh.ok ? await rh.json() : [],
      };
    } catch { return { pedido: null, itens: [], hist: [] }; }
  }

  // ── Modal ──────────────────────────────────────────────
  function _modal(titulo, corpo, btnConfirm) {
    let el = document.getElementById('comp-modal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'comp-modal';
      el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px';
      document.body.appendChild(el);
    }
    el.innerHTML = `<div style="background:var(--bg-card);border-radius:12px;padding:24px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.2)">
      <div style="font-size:15px;font-weight:700;color:var(--tx1);margin-bottom:16px">${titulo}</div>
      ${corpo}
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
        ${btnConfirm}
        <button onclick="document.getElementById('comp-modal').remove()" style="padding:8px 18px;border-radius:7px;border:1px solid var(--bd2);background:none;color:var(--tx2);font-size:12.5px;cursor:pointer">Cancelar</button>
      </div>
    </div>`;
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  }

  // ══════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════
  async function renderDash() {
    const el = document.getElementById('v-compras-dash');
    if (!el) return;

    const pedidos = await _loadPedidos(true);
    const ATIVOS  = ['pendente','em_analise','em_cotacao','aguardando_aprovacao','aprovado','em_pedido'];

    const ativos   = pedidos.filter(p => ATIVOS.includes(p.status));
    const agAprov  = pedidos.filter(p => p.status === 'aguardando_aprovacao');
    const recentes = pedidos.slice(0, 10);

    const agora = new Date();
    const mes = `${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}`;
    const recebMes = pedidos.filter(p => p.status === 'recebido' && (p.atualizado_em||'').startsWith(mes));

    const valorComp = pedidos
      .filter(p => ['aprovado','em_pedido'].includes(p.status))
      .reduce((a,p) => a + Number(p.valor_aprovado || p.valor_estimado || 0), 0);

    const KPI_IC = {
      ativos:  '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
      aprov:   '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
      valor:   '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
      receb:   '<polyline points="20 6 9 17 4 12"/>',
    };

    const kpis = [
      { n: ativos.length,       lbl:'Em aberto',         sub:'pedidos ativos',        cor:'var(--blue)',  ic:KPI_IC.ativos, fn:"go('compras-lista')" },
      { n: agAprov.length,      lbl:'Ag. aprovação',     sub:'aguardando decisão',    cor:'var(--amber)', ic:KPI_IC.aprov,  fn:"comprasFiltrar('aguardando_aprovacao')" },
      { n: _fmtR(valorComp),    lbl:'Valor comprometido',sub:'aprovados + em pedido', cor:'var(--gr)',    ic:KPI_IC.valor,  fn:"go('compras-lista')" },
      { n: recebMes.length,     lbl:'Recebidos no mês',  sub:mes.split('-').reverse().join('/'), cor:'var(--teal)', ic:KPI_IC.receb, fn:"comprasFiltrar('recebido')" },
    ];

    el.innerHTML = `
      <div class="hero">
        ${_HERO_IC}
        <div>
          <div class="hero-lbl">Administração</div>
          <div class="hero-ttl">Pedidos de Compra</div>
          <div class="hero-dsc">Gestão de aquisições, aprovações e cotações</div>
        </div>
        <div class="hero-act">
          <button class="tbt" onclick="comprasAbrirNovo()" style="color:var(--blue);border-color:rgba(74,156,245,.3)">+ Novo Pedido</button>
          <button class="tbt" onclick="go('compras-lista')">Ver todos</button>
        </div>
      </div>
      <div class="ct">
        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px">
          ${kpis.map(k => `
            <div class="card" style="padding:12px 14px;display:flex;align-items:center;gap:10px;cursor:pointer" onclick="${k.fn}">
              <div style="width:34px;height:34px;border-radius:50%;background:${k.cor}1a;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${k.cor}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${k.ic}</svg>
              </div>
              <div>
                <div style="font-size:20px;font-weight:800;color:var(--tx1);line-height:1">${k.n}</div>
                <div style="font-size:11px;color:var(--tx2);font-weight:600;margin-top:2px">${k.lbl}</div>
                <div style="font-size:10px;color:var(--tx3)">${k.sub}</div>
              </div>
            </div>`).join('')}
        </div>

        <div class="card">
          <div class="ctit">Pedidos Recentes <span class="cact" onclick="go('compras-lista')">Ver todos</span></div>
          ${recentes.length === 0
            ? `<div style="color:var(--tx3);font-size:12px;padding:12px 0">Nenhum pedido cadastrado.</div>`
            : _tabelaPedidos(recentes)}
        </div>
      </div>`;
  }

  // ══════════════════════════════════════════════════════
  // LISTA
  // ══════════════════════════════════════════════════════
  const GRUPOS_LISTA = [
    { id:'ativos',               lbl:'Ativos',       ids:['pendente','em_analise','em_cotacao','aguardando_aprovacao','aprovado','em_pedido'] },
    { id:'aguardando_aprovacao', lbl:'Ag. Aprovação',ids:['aguardando_aprovacao'] },
    { id:'aprovado',             lbl:'Aprovados',    ids:['aprovado','em_pedido'] },
    { id:'encerrado',            lbl:'Encerrados',   ids:['recebido','encerrado','rejeitado','cancelado'] },
    { id:'todos',                lbl:'Todos',        ids:Object.keys(STATUS_CFG) },
  ];

  async function renderLista() {
    const el = document.getElementById('v-compras-lista');
    if (!el) return;

    const pedidos = await _loadPedidos(true);
    const grupo = GRUPOS_LISTA.find(g => g.id === _filtroLista) || GRUPOS_LISTA[0];
    const filtrado = pedidos.filter(p => grupo.ids.includes(p.status));

    el.innerHTML = `
      <div class="hero">
        ${_HERO_IC}
        <div>
          <div class="hero-lbl">Compras</div>
          <div class="hero-ttl">Todos os Pedidos</div>
          <div class="hero-dsc">${pedidos.length} pedido(s) no total</div>
        </div>
        <div class="hero-act">
          <button class="tbt" onclick="go('compras-dash')">← Voltar</button>
          <button class="tbt" onclick="comprasAbrirNovo()" style="color:var(--blue);border-color:rgba(74,156,245,.3)">+ Novo Pedido</button>
        </div>
      </div>
      <div class="ct">
        <div class="card">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
            ${GRUPOS_LISTA.map(g => {
              const cnt = pedidos.filter(p => g.ids.includes(p.status)).length;
              const ativo = _filtroLista === g.id;
              return `<span onclick="comprasFiltrar('${g.id}')" style="cursor:pointer;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid ${ativo?'var(--blue)':'var(--bd2)'};background:${ativo?'rgba(74,156,245,.12)':'transparent'};color:${ativo?'var(--blue)':'var(--tx3)'}">
                ${g.lbl} <span style="opacity:.7">(${cnt})</span>
              </span>`;
            }).join('')}
          </div>
          ${filtrado.length === 0
            ? `<div style="color:var(--tx3);font-size:12px;padding:12px 0">Nenhum pedido neste filtro.</div>`
            : _tabelaPedidos(filtrado, true)}
        </div>
      </div>`;
  }

  function _tabelaPedidos(lista, completo) {
    const cols = completo
      ? ['Número','Título','Solicitante','Depto','Urgência','Valor est.','Data','Status']
      : ['Número','Título','Solicitante','Urgência','Valor est.','Status'];
    return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="border-bottom:1px solid var(--bd2)">
        ${cols.map(h => `<th style="text-align:left;padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`).join('')}
      </tr></thead>
      <tbody>
        ${lista.map(p => `<tr style="border-bottom:1px solid var(--bd1);cursor:pointer" onclick="comprasVerDetalhe('${p.id}')">
          <td style="padding:9px 6px;color:var(--tx3);font-family:monospace;font-size:11px">${_numPC(p.numero)}</td>
          <td style="padding:9px 6px;font-weight:600;color:var(--tx1);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(p.titulo)}</td>
          <td style="padding:9px 6px;color:var(--tx2)">${_esc(p.solicitante_nome)}</td>
          ${completo ? `<td style="padding:9px 6px;color:var(--tx3)">${_esc(p.departamento||'—')}</td>` : ''}
          <td style="padding:9px 6px">${_pillUrg(p.urgencia)||`<span style="color:var(--tx3);font-size:11px">Normal</span>`}</td>
          <td style="padding:9px 6px;color:var(--tx2);font-variant-numeric:tabular-nums">${_fmtR(p.valor_estimado)}</td>
          ${completo ? `<td style="padding:9px 6px;color:var(--tx3);white-space:nowrap">${_fmtD(p.criado_em)}</td>` : ''}
          <td style="padding:9px 6px">${_pillStatus(p.status)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  }

  // ══════════════════════════════════════════════════════
  // DETALHE
  // ══════════════════════════════════════════════════════
  async function renderDetalhe() {
    const el = document.getElementById('v-compras-detalhe');
    if (!el) return;

    if (!_pedidoAtual) { go('compras-lista'); return; }

    el.innerHTML = `<div class="ct" style="padding-top:20px"><div style="color:var(--tx3);font-size:12px;text-align:center;padding:40px 0">Carregando…</div></div>`;

    const { pedido, itens, hist } = await _loadPedido(_pedidoAtual);
    if (!pedido) {
      el.innerHTML = `<div class="ct"><div class="card"><div style="color:var(--rose)">Pedido não encontrado.</div></div></div>`;
      return;
    }

    const totalEst = itens.reduce((a, i) => a + Number(i.quantidade||1) * Number(i.valor_unitario||0), 0);
    const finalizado = ['encerrado','rejeitado','cancelado'].includes(pedido.status);

    const _acoes = () => {
      if (finalizado) return '';
      const s = pedido.status;
      const id = pedido.id;
      const btn = (lbl, fn, cor='var(--blue)') =>
        `<button onclick="${fn}" style="padding:7px 14px;border-radius:7px;border:1px solid ${cor}40;background:${cor}12;color:${cor};font-size:11.5px;font-weight:600;cursor:pointer">${lbl}</button>`;

      if (s === 'pendente')
        return btn('Iniciar análise', `comprasMudarStatus('${id}','em_analise','Análise iniciada')`) +
               btn('Cancelar', `comprasCancelar('${id}')`, 'var(--rose)');
      if (s === 'em_analise')
        return btn('Solicitar cotação', `comprasMudarStatus('${id}','em_cotacao','Enviado para cotação')`) +
               btn('Enviar para aprovação', `comprasMudarStatus('${id}','aguardando_aprovacao','Enviado para aprovação do gestor')`) +
               btn('Cancelar', `comprasCancelar('${id}')`, 'var(--rose)');
      if (s === 'em_cotacao')
        return btn('Enviar para aprovação', `comprasMudarStatus('${id}','aguardando_aprovacao','Cotações coletadas — enviado para aprovação')`) +
               btn('Cancelar', `comprasCancelar('${id}')`, 'var(--rose)');
      if (s === 'aguardando_aprovacao')
        return btn('Aprovar', `comprasAprovar('${id}')`, 'var(--gr)') +
               btn('Rejeitar', `comprasRejeitar('${id}')`, 'var(--rose)');
      if (s === 'aprovado')
        return btn('Marcar pedido realizado', `comprasMudarStatus('${id}','em_pedido','Pedido realizado com fornecedor')`, 'var(--teal)');
      if (s === 'em_pedido')
        return btn('Confirmar recebimento', `comprasMudarStatus('${id}','recebido','Mercadoria recebida')`, 'var(--gr)');
      if (s === 'recebido')
        return btn('Encerrar pedido', `comprasMudarStatus('${id}','encerrado','Pedido encerrado')`, 'var(--tx3)');
      return '';
    };

    const origem = pedido.origem === 'chamado' ? 'Link público (chamado)' : pedido.origem === 'requisicao' ? 'Requisição' : 'Manual';

    el.innerHTML = `
      <div class="hero">
        ${_HERO_IC}
        <div>
          <div class="hero-lbl">Compras · <span style="font-family:monospace;font-weight:600">${_numPC(pedido.numero)}</span></div>
          <div class="hero-ttl" style="display:flex;align-items:center;gap:8px">${_esc(pedido.titulo)} ${_pillUrg(pedido.urgencia)}</div>
          <div class="hero-dsc">${_pillStatus(pedido.status)}&nbsp; Criado em ${_fmtDT(pedido.criado_em)} por ${_esc(pedido.solicitante_nome)}</div>
        </div>
        <div class="hero-act">
          <button class="tbt" onclick="go('compras-lista')">← Voltar</button>
          ${!finalizado ? `<button class="tbt" onclick="comprasAdicionarItem('${pedido.id}')" style="color:var(--blue);border-color:rgba(74,156,245,.3)">+ Item</button>` : ''}
        </div>
      </div>
      <div class="ct">

        ${!finalizado && _acoes() ? `
        <div class="card" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:12px 16px;margin-bottom:0">
          <span style="font-size:11px;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;white-space:nowrap">Ações:</span>
          ${_acoes()}
        </div>` : ''}

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:14px;align-items:start">

          <div style="display:flex;flex-direction:column;gap:14px">

            <!-- Dados -->
            <div class="card">
              <div class="ctit">Dados do Pedido</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px">
                <div><div style="color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Solicitante</div><div style="color:var(--tx1);font-weight:600">${_esc(pedido.solicitante_nome)}</div></div>
                <div><div style="color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Departamento</div><div style="color:var(--tx2)">${_esc(pedido.departamento||'—')}</div></div>
                <div><div style="color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Urgência</div><div>${_pillUrg(pedido.urgencia)||'<span style="color:var(--tx2)">Normal</span>'}</div></div>
                <div><div style="color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Origem</div><div style="color:var(--tx2)">${origem}</div></div>
                <div><div style="color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Valor estimado</div><div style="color:var(--tx1);font-weight:600">${_fmtR(pedido.valor_estimado)}</div></div>
                ${pedido.valor_aprovado ? `<div><div style="color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Valor aprovado</div><div style="color:var(--gr);font-weight:700;font-size:14px">${_fmtR(pedido.valor_aprovado)}</div></div>` : ''}
                ${pedido.aprovado_por ? `<div><div style="color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Aprovado por</div><div style="color:var(--tx1);font-weight:600">${_esc(pedido.aprovado_por)}</div></div>` : ''}
                ${pedido.aprovado_em ? `<div><div style="color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Em</div><div style="color:var(--tx2)">${_fmtDT(pedido.aprovado_em)}</div></div>` : ''}
              </div>
              ${pedido.descricao ? `<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--bd1);font-size:12px;color:var(--tx2);line-height:1.6">${_esc(pedido.descricao)}</div>` : ''}
              ${pedido.motivo_rejeicao ? `<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:rgba(208,104,104,.08);border:1px solid rgba(208,104,104,.2)"><div style="font-size:10px;font-weight:600;color:var(--rose);margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Motivo da rejeição</div><div style="font-size:12px;color:var(--tx2)">${_esc(pedido.motivo_rejeicao)}</div></div>` : ''}
              ${pedido.requer_cotacao ? `<div style="margin-top:8px;font-size:11px;color:var(--amber)">⚠ Valor acima de ${_fmtR(LIMITE_COTACAO)} — cotação recomendada</div>` : ''}
            </div>

            <!-- Itens -->
            <div class="card">
              <div class="ctit">Itens do Pedido
                <span style="color:var(--tx3);font-weight:400;font-size:11px">${itens.length} item(s)${totalEst > 0 ? ' · estimativa ' + _fmtR(totalEst) : ''}</span>
              </div>
              ${itens.length === 0
                ? `<div style="color:var(--tx3);font-size:12px;padding:8px 0">Nenhum item.${!finalizado?' Clique em "+ Item" para adicionar.':''}</div>`
                : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
                  <thead><tr style="border-bottom:1px solid var(--bd2)">
                    ${['Descrição','Qtd','Un','Vlr unit.','Total',''].map(h => `<th style="text-align:left;padding:7px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase">${h}</th>`).join('')}
                  </tr></thead>
                  <tbody>
                    ${itens.map(i => {
                      const tot = Number(i.quantidade||1) * Number(i.valor_unitario||0);
                      return `<tr style="border-bottom:1px solid var(--bd1)">
                        <td style="padding:8px 6px;color:var(--tx1)">${_esc(i.descricao)}${i.obs ? `<div style="font-size:10.5px;color:var(--tx3)">${_esc(i.obs)}</div>` : ''}</td>
                        <td style="padding:8px 6px;color:var(--tx2);font-variant-numeric:tabular-nums">${i.quantidade}</td>
                        <td style="padding:8px 6px;color:var(--tx3)">${_esc(i.unidade||'un')}</td>
                        <td style="padding:8px 6px;color:var(--tx2);font-variant-numeric:tabular-nums">${i.valor_unitario ? _fmtR(i.valor_unitario) : '—'}</td>
                        <td style="padding:8px 6px;color:var(--tx1);font-weight:600;font-variant-numeric:tabular-nums">${tot > 0 ? _fmtR(tot) : '—'}</td>
                        <td style="padding:8px 6px;text-align:right">
                          ${!finalizado ? `<button onclick="comprasRemoverItem('${i.id}')" style="font-size:10px;padding:2px 7px;border-radius:5px;border:1px solid rgba(208,104,104,.3);background:none;color:var(--rose);cursor:pointer">✕</button>` : ''}
                        </td>
                      </tr>`;
                    }).join('')}
                    ${totalEst > 0 ? `<tr style="border-top:2px solid var(--bd2)">
                      <td colspan="4" style="padding:8px 6px;text-align:right;color:var(--tx3);font-size:11px;font-weight:600">TOTAL ESTIMADO</td>
                      <td style="padding:8px 6px;color:var(--gr);font-weight:700;font-size:13px;font-variant-numeric:tabular-nums">${_fmtR(totalEst)}</td>
                      <td></td>
                    </tr>` : ''}
                  </tbody>
                </table></div>`}
            </div>
          </div>

          <!-- Histórico -->
          <div class="card" style="align-self:start">
            <div class="ctit">Histórico</div>
            ${hist.length === 0
              ? `<div style="color:var(--tx3);font-size:12px">Sem registros.</div>`
              : `<div>${hist.map((h, i) => {
                  const c = STATUS_CFG[h.status_para] || {};
                  return `<div style="display:flex;gap:10px;padding:9px 0;${i < hist.length-1 ? 'border-bottom:1px solid var(--bd1)' : ''}">
                    <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
                      <div style="width:8px;height:8px;border-radius:50%;background:${c.cl||'var(--tx3)'};margin-top:4px;flex-shrink:0"></div>
                    </div>
                    <div>
                      <div style="margin-bottom:2px">${_pillStatus(h.status_para)}</div>
                      ${h.observacao ? `<div style="font-size:11px;color:var(--tx3);margin-top:3px;line-height:1.4">${_esc(h.observacao)}</div>` : ''}
                      <div style="font-size:10px;color:var(--tx3);margin-top:3px">${_fmtDT(h.criado_em)}${h.usuario ? ' · ' + _esc(h.usuario) : ''}</div>
                    </div>
                  </div>`;
                }).join('')}</div>`}
          </div>

        </div>
      </div>`;
  }

  // ══════════════════════════════════════════════════════
  // AÇÕES GLOBAIS
  // ══════════════════════════════════════════════════════

  window.comprasVerDetalhe = function(id) {
    _pedidoAtual = id;
    go('compras-detalhe');
  };

  window.comprasFiltrar = function(filtro) {
    _filtroLista = filtro;
    go('compras-lista');
  };

  // ── Criar novo ─────────────────────────────────────────
  window.comprasAbrirNovo = function() {
    const u = window._sipenUser || {};
    _modal('Novo Pedido de Compra',
      `<label style="${_LBL}">Título *</label>
       <input id="cp-titulo" type="text" placeholder="Ex: Material de limpeza — agosto" style="${_INP}">
       <label style="${_LBL}">Descrição</label>
       <textarea id="cp-desc" rows="3" style="${_INP};resize:vertical"></textarea>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
         <div><label style="${_LBL}">Solicitante *</label>
          <input id="cp-sol" type="text" value="${_esc(u.nome||u.email||'')}" style="${_INP}"></div>
         <div><label style="${_LBL}">Departamento</label>
          <input id="cp-dep" type="text" style="${_INP}"></div>
       </div>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
         <div><label style="${_LBL}">Urgência</label>
          <select id="cp-urg" style="${_INP}">
            <option value="normal">Normal</option>
            <option value="urgente">Urgente</option>
            <option value="critico">Crítico</option>
          </select></div>
         <div><label style="${_LBL}">Valor estimado (R$)</label>
          <input id="cp-val" type="number" min="0" step="0.01" placeholder="0,00" style="${_INP}"></div>
       </div>`,
      `<button onclick="comprasSalvarNovo()" style="padding:8px 20px;border-radius:7px;border:none;background:var(--blue);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Criar Pedido</button>`
    );
  };

  window.comprasSalvarNovo = async function() {
    const titulo = document.getElementById('cp-titulo')?.value?.trim();
    const desc   = document.getElementById('cp-desc')?.value?.trim();
    const sol    = document.getElementById('cp-sol')?.value?.trim();
    const dep    = document.getElementById('cp-dep')?.value?.trim();
    const urg    = document.getElementById('cp-urg')?.value || 'normal';
    const val    = parseFloat(document.getElementById('cp-val')?.value || '0') || null;
    const u      = window._sipenUser || {};

    if (!titulo || !sol) { alert('Título e solicitante são obrigatórios.'); return; }

    const requerCotacao = !!(val && val >= LIMITE_COTACAO);

    try {
      const r = await fetch(`${_url()}/pedidos_compra`, {
        method: 'POST', headers: _hdrJ(),
        body: JSON.stringify({ titulo, descricao:desc||null, solicitante_nome:sol, departamento:dep||null, urgencia:urg, valor_estimado:val, requer_cotacao:requerCotacao, criado_por:u.nome||u.email||null }),
      });
      if (!r.ok) throw new Error(await r.text());
      const [criado] = await r.json();

      await fetch(`${_url()}/pedidos_compra_historico`, {
        method: 'POST', headers: _hdrJ(),
        body: JSON.stringify({ pedido_id:criado.id, status_para:'pendente', observacao:'Pedido criado', usuario:u.nome||u.email||null }),
      });

      document.getElementById('comp-modal')?.remove();
      if (typeof T === 'function') T('Pedido criado', requerCotacao ? `Acima de ${_fmtR(LIMITE_COTACAO)} — cotação recomendada` : titulo);
      _cache = null;
      comprasVerDetalhe(criado.id);
    } catch(e) { alert('Erro ao criar pedido: ' + e.message); }
  };

  // ── Mudar status ───────────────────────────────────────
  window.comprasMudarStatus = async function(id, novoStatus, obs) {
    const u = window._sipenUser || {};
    try {
      await fetch(`${_url()}/pedidos_compra?id=eq.${id}`, {
        method: 'PATCH', headers: _hdrJ(),
        body: JSON.stringify({ status: novoStatus }),
      });
      await fetch(`${_url()}/pedidos_compra_historico`, {
        method: 'POST', headers: _hdrJ(),
        body: JSON.stringify({ pedido_id:id, status_para:novoStatus, observacao:obs||null, usuario:u.nome||u.email||null }),
      });
      if (typeof T === 'function') T(STATUS_CFG[novoStatus]?.lbl || novoStatus, obs || '');
      _cache = null;
      renderDetalhe();
    } catch(e) { alert('Erro: ' + e.message); }
  };

  // ── Aprovar ────────────────────────────────────────────
  window.comprasAprovar = function(id) {
    _modal('Aprovar Pedido',
      `<label style="${_LBL}">Valor aprovado (R$) *</label>
       <input id="cp-ap-val" type="number" min="0" step="0.01" placeholder="0,00" style="${_INP}">
       <label style="${_LBL}">Observação</label>
       <input id="cp-ap-obs" type="text" style="${_INP}">`,
      `<button onclick="comprasConfirmarAprovacao('${id}')" style="padding:8px 20px;border-radius:7px;border:none;background:var(--gr);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Confirmar Aprovação</button>`
    );
  };

  window.comprasConfirmarAprovacao = async function(id) {
    const val = parseFloat(document.getElementById('cp-ap-val')?.value || '0');
    const obs = document.getElementById('cp-ap-obs')?.value?.trim();
    if (!val || val <= 0) { alert('Informe o valor aprovado.'); return; }
    const u = window._sipenUser || {};
    try {
      await fetch(`${_url()}/pedidos_compra?id=eq.${id}`, {
        method: 'PATCH', headers: _hdrJ(),
        body: JSON.stringify({ status:'aprovado', valor_aprovado:val, aprovado_por:u.nome||u.email||null, aprovado_em:new Date().toISOString() }),
      });
      await fetch(`${_url()}/pedidos_compra_historico`, {
        method: 'POST', headers: _hdrJ(),
        body: JSON.stringify({ pedido_id:id, status_para:'aprovado', observacao:`Aprovado por ${u.nome||u.email||'Gestor'} — ${_fmtR(val)}${obs ? ' — ' + obs : ''}`, usuario:u.nome||u.email||null }),
      });
      document.getElementById('comp-modal')?.remove();
      if (typeof T === 'function') T('Pedido aprovado', _fmtR(val));
      _cache = null;
      renderDetalhe();
    } catch(e) { alert('Erro: ' + e.message); }
  };

  // ── Rejeitar ───────────────────────────────────────────
  window.comprasRejeitar = function(id) {
    _modal('Rejeitar Pedido',
      `<label style="${_LBL}">Motivo da rejeição *</label>
       <textarea id="cp-rej" rows="3" style="${_INP};resize:vertical" placeholder="Explique o motivo para o solicitante…"></textarea>`,
      `<button onclick="comprasConfirmarRejeicao('${id}')" style="padding:8px 20px;border-radius:7px;border:none;background:var(--rose);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Confirmar Rejeição</button>`
    );
  };

  window.comprasConfirmarRejeicao = async function(id) {
    const motivo = document.getElementById('cp-rej')?.value?.trim();
    if (!motivo) { alert('Informe o motivo da rejeição.'); return; }
    const u = window._sipenUser || {};
    try {
      await fetch(`${_url()}/pedidos_compra?id=eq.${id}`, {
        method: 'PATCH', headers: _hdrJ(),
        body: JSON.stringify({ status:'rejeitado', motivo_rejeicao:motivo, aprovado_por:u.nome||u.email||null, aprovado_em:new Date().toISOString() }),
      });
      await fetch(`${_url()}/pedidos_compra_historico`, {
        method: 'POST', headers: _hdrJ(),
        body: JSON.stringify({ pedido_id:id, status_para:'rejeitado', observacao:motivo, usuario:u.nome||u.email||null }),
      });
      document.getElementById('comp-modal')?.remove();
      if (typeof T === 'function') T('Pedido rejeitado', '');
      _cache = null;
      renderDetalhe();
    } catch(e) { alert('Erro: ' + e.message); }
  };

  // ── Cancelar ───────────────────────────────────────────
  window.comprasCancelar = function(id) {
    if (!confirm('Cancelar este pedido?')) return;
    const u = window._sipenUser || {};
    comprasMudarStatus(id, 'cancelado', `Cancelado por ${u.nome||u.email||'Gestor'}`);
  };

  // ── Adicionar item ─────────────────────────────────────
  window.comprasAdicionarItem = function(pedidoId) {
    _modal('Adicionar Item',
      `<label style="${_LBL}">Descrição *</label>
       <input id="cp-it-desc" type="text" style="${_INP}">
       <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
         <div><label style="${_LBL}">Quantidade</label>
          <input id="cp-it-qtd" type="number" min="0.001" step="any" value="1" style="${_INP}"></div>
         <div><label style="${_LBL}">Unidade</label>
          <select id="cp-it-und" style="${_INP}">
            ${['un','kg','g','L','ml','cx','pct','rolo','par','m','gl'].map(u => `<option>${u}</option>`).join('')}
          </select></div>
         <div><label style="${_LBL}">Valor unit. est.</label>
          <input id="cp-it-val" type="number" min="0" step="0.01" placeholder="0,00" style="${_INP}"></div>
       </div>
       <label style="${_LBL}">Observação</label>
       <input id="cp-it-obs" type="text" style="${_INP}">`,
      `<button onclick="comprasSalvarItem('${pedidoId}')" style="padding:8px 20px;border-radius:7px;border:none;background:var(--blue);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Adicionar</button>`
    );
  };

  window.comprasSalvarItem = async function(pedidoId) {
    const desc = document.getElementById('cp-it-desc')?.value?.trim();
    const qtd  = parseFloat(document.getElementById('cp-it-qtd')?.value || '1');
    const und  = document.getElementById('cp-it-und')?.value || 'un';
    const val  = parseFloat(document.getElementById('cp-it-val')?.value || '0') || null;
    const obs  = document.getElementById('cp-it-obs')?.value?.trim();
    if (!desc) { alert('Informe a descrição.'); return; }
    try {
      const r = await fetch(`${_url()}/pedidos_compra_itens`, {
        method: 'POST', headers: _hdrJ(),
        body: JSON.stringify({ pedido_id:pedidoId, descricao:desc, quantidade:qtd, unidade:und, valor_unitario:val, obs:obs||null }),
      });
      if (!r.ok) throw new Error(await r.text());
      document.getElementById('comp-modal')?.remove();
      if (typeof T === 'function') T('Item adicionado', desc);
      renderDetalhe();
    } catch(e) { alert('Erro: ' + e.message); }
  };

  // ── Remover item ───────────────────────────────────────
  window.comprasRemoverItem = async function(itemId) {
    if (!confirm('Remover este item?')) return;
    try {
      await fetch(`${_url()}/pedidos_compra_itens?id=eq.${itemId}`, { method:'DELETE', headers:_hdr() });
      renderDetalhe();
    } catch(e) { alert('Erro: ' + e.message); }
  };

  // ── Register ───────────────────────────────────────────
  if (typeof VIEW_AUTOLOAD !== 'undefined') {
    VIEW_AUTOLOAD['compras-dash']    = { fn: renderDash };
    VIEW_AUTOLOAD['compras-lista']   = { fn: renderLista };
    VIEW_AUTOLOAD['compras-detalhe'] = { fn: renderDetalhe };
  }

})();
