/* ═══════════════════════════════════════════════════════
   SIPEN — Gestão de Recursos (Estoque)
   recursos/index.js · v1.0
═══════════════════════════════════════════════════════ */
(function () {

  // ── Helpers ───────────────────────────────────────────
  function _url() { return apiBaseUrl() + '/rest/v1'; }
  function _hdr()  { return apiHeaders(); }
  function _hdrJ() { return { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=representation' }; }
  function _esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function _fmtD(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
  }
  function _fmtDT(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR',{ day:'2-digit', month:'2-digit' }) + ' ' +
           d.toLocaleTimeString('pt-BR',{ hour:'2-digit', minute:'2-digit' });
  }

  function _podeGerenciar() {
    const u = window._sipenUser || {};
    return ['admin_geral','supervisor'].includes(u.role);
  }

  function _nivel(atual, min) {
    if (min <= 0) return 'ok';
    const r = atual / min;
    if (r <= 0) return 'critico';
    if (r < 1)  return 'baixo';
    return 'ok';
  }
  function _corNivel(n) {
    return n === 'critico' ? 'var(--rose)' : n === 'baixo' ? 'var(--amber)' : 'var(--gr)';
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

  const _SVG_RECURSOS = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
  const _HERO_IC = `<div class="hero-ic" style="background:rgba(208,144,64,.12);border-color:rgba(208,144,64,.28)">${_SVG_RECURSOS}</div>`;

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
    const criticos = itens.filter(i => _nivel(i.estoque_atual, i.estoque_minimo) === 'critico');
    const baixos   = itens.filter(i => _nivel(i.estoque_atual, i.estoque_minimo) === 'baixo');

    const u    = window._sipenUser || {};
    const podeG = _podeGerenciar();
    let reqPend = [], movRec = [];

    try {
      const filtroR = podeG
        ? `${_url()}/recursos_requisicoes?select=*,item:recursos_itens(nome,unidade)&status=eq.pendente&order=criado_em.desc&limit=8`
        : `${_url()}/recursos_requisicoes?select=*,item:recursos_itens(nome,unidade)&solicitante_id=eq.${u.id||'null'}&order=criado_em.desc&limit=8`;
      const r = await fetch(filtroR, { headers: _hdr() });
      reqPend = r.ok ? await r.json() : [];
    } catch {}

    if (podeG) {
      try {
        const r = await fetch(`${_url()}/recursos_movimentos?select=*,item:recursos_itens(nome,unidade)&order=criado_em.desc&limit=8`, { headers: _hdr() });
        movRec = r.ok ? await r.json() : [];
      } catch {}
    }

    const alertaHtml = (criticos.length || baixos.length) ? `
      <div class="card" style="border-color:rgba(208,104,104,.3)">
        <div class="ctit" style="color:var(--rose)">Estoque em alerta</div>
        ${[...criticos.map(i=>({...i,_n:'critico'})), ...baixos.map(i=>({...i,_n:'baixo'}))].map(i=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd1)">
            <div>
              <span style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(i.nome)}</span>
              <span style="font-size:11px;color:var(--tx3);margin-left:6px">${_esc(i.categoria?.nome||'—')}</span>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <span style="font-size:13px;font-weight:700;color:${_corNivel(i._n)}">${i.estoque_atual} ${_esc(i.unidade)}</span>
              <span style="font-size:10.5px;color:var(--tx3);margin-left:4px">mín ${i.estoque_minimo}</span>
            </div>
          </div>`).join('')}
      </div>` : '';

    const reqHtml = reqPend.length ? `
      <div class="card">
        <div class="ctit">${podeG ? 'Requisições Pendentes' : 'Minhas Requisições'} <span class="cact" onclick="go('recursos-req')">Ver todas</span></div>
        ${reqPend.map(r=>`
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
        ${movRec.map(m=>{
          const cor = m.tipo==='entrada'?'var(--gr)':m.tipo==='saida'?'var(--rose)':'var(--amber)';
          const sinal = m.tipo==='entrada'?'+':m.tipo==='saida'?'−':'~';
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd1)">
            <div>
              <span style="font-size:12px;font-weight:600;color:var(--tx1)">${_esc(m.item?.nome||'—')}</span>
              ${m.observacao ? `<span style="font-size:11px;color:var(--tx3);margin-left:6px">${_esc(m.observacao)}</span>` : ''}
            </div>
            <div style="text-align:right;flex-shrink:0">
              <span style="font-size:12px;font-weight:700;color:${cor}">${sinal}${m.quantidade} ${_esc(m.item?.unidade||'')}</span>
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
          <div class="hero-dsc">Estoque, requisições e movimentações</div>
        </div>
        <div class="hero-act">
          <button class="tbt" onclick="go('recursos-lista')">Ver Estoque</button>
          <button class="tbt" onclick="recAbrirNovaReq()" style="color:var(--gr);border-color:rgba(58,170,92,.3)">+ Nova Requisição</button>
          ${podeG ? `<button class="tbt" onclick="recAbrirEntrada()" style="color:var(--amber);border-color:rgba(208,144,64,.3)">+ Registrar Entrada</button>` : ''}
        </div>
      </div>
      <div class="ct">
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px">
          <div class="card" style="padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer" onclick="go('recursos-lista')">
            <div style="width:36px;height:36px;border-radius:50%;background:rgba(208,144,64,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
            </div>
            <div>
              <div style="font-size:24px;font-weight:800;color:var(--tx1);line-height:1">${itens.length}</div>
              <div style="font-size:12.5px;font-weight:600;color:var(--tx1);margin-top:4px">Itens cadastrados</div>
              <div style="font-size:11px;color:var(--tx3);margin-top:1px">${cats.length} categorias</div>
            </div>
          </div>
          <div class="card" style="padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer" onclick="go('recursos-req')">
            <div style="width:36px;height:36px;border-radius:50%;background:rgba(212,168,67,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
            </div>
            <div>
              <div style="font-size:24px;font-weight:800;color:var(--tx1);line-height:1" id="rec-kpi-pend">—</div>
              <div style="font-size:12.5px;font-weight:600;color:var(--tx1);margin-top:4px">Requisições pendentes</div>
              <div style="font-size:11px;color:var(--tx3);margin-top:1px">aguardando aprovação</div>
            </div>
          </div>
          <div class="card" style="padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer${criticos.length?';border-color:rgba(208,104,104,.3)':''}" onclick="go('recursos-lista')">
            <div style="width:36px;height:36px;border-radius:50%;background:rgba(208,104,104,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <div>
              <div style="font-size:24px;font-weight:800;line-height:1;color:${criticos.length?'var(--rose)':'var(--tx1)'}">${criticos.length + baixos.length}</div>
              <div style="font-size:12.5px;font-weight:600;color:var(--tx1);margin-top:4px">Itens em alerta</div>
              <div style="font-size:11px;color:var(--tx3);margin-top:1px">${criticos.length} crítico(s) · ${baixos.length} baixo(s)</div>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${alertaHtml}
          ${reqHtml}
          ${movHtml}
          ${!alertaHtml && !reqHtml && !movHtml
            ? `<div class="card"><div style="color:var(--tx3);font-size:12px;text-align:center;padding:16px 0">Nenhuma atividade recente</div></div>`
            : ''}
        </div>
      </div>`;

    // KPI pendentes (count)
    try {
      const r = await fetch(`${_url()}/recursos_requisicoes?select=id&status=eq.pendente`, { headers:{ ..._hdr(), 'Prefer':'count=exact','Range':'0-0' } });
      const m = (r.headers.get('Content-Range')||'').match(/\/(\d+)$/);
      const kpi = document.getElementById('rec-kpi-pend');
      if (kpi) kpi.textContent = m ? m[1] : '0';
    } catch {}
  }

  // ══════════════════════════════════════════════════════
  // LISTA DE ITENS
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
          <div class="hero-dsc">Estoque atual de todos os itens cadastrados</div>
        </div>
        <div class="hero-act">
          <button class="tbt" onclick="go('recursos-dash')">← Voltar</button>
          ${_podeGerenciar() ? `<button class="tbt" onclick="recAbrirNovoItem()" style="color:var(--amber);border-color:rgba(208,144,64,.3)">+ Novo Item</button>` : ''}
        </div>
      </div>
      <div class="ct">
        <div class="card">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
            <span onclick="recFiltrarLista('')" style="cursor:pointer;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid ${!_filtroLista?'var(--amber)':'var(--bd2)'};background:${!_filtroLista?'rgba(208,144,64,.12)':'transparent'};color:${!_filtroLista?'var(--amber)':'var(--tx3)'}">Todas</span>
            ${cats.map(c=>`<span onclick="recFiltrarLista('${c.id}')" style="cursor:pointer;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid ${_filtroLista===c.id?'var(--amber)':'var(--bd2)'};background:${_filtroLista===c.id?'rgba(208,144,64,.12)':'transparent'};color:${_filtroLista===c.id?'var(--amber)':'var(--tx3)'}">${_esc(c.icone||'')} ${_esc(c.nome)}</span>`).join('')}
          </div>
          ${filtrado.length === 0 ? `<div style="color:var(--tx3);font-size:12px;padding:12px 0">Nenhum item encontrado.</div>` : `
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead>
                <tr style="border-bottom:1px solid var(--bd2)">
                  ${['Item','Categoria','Estoque atual','Mínimo','Unidade',''].map(h=>`<th style="text-align:left;padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${filtrado.map(i=>{
                  const n   = _nivel(i.estoque_atual, i.estoque_minimo);
                  const cor = _corNivel(n);
                  const pct = i.estoque_minimo > 0 ? Math.min(100, Math.round(i.estoque_atual/i.estoque_minimo*100)) : 100;
                  return `<tr style="border-bottom:1px solid var(--bd1)">
                    <td style="padding:9px 6px;font-weight:600;color:var(--tx1)">${_esc(i.nome)}</td>
                    <td style="padding:9px 6px;color:var(--tx2)">${_esc(i.categoria?.icone||'')} ${_esc(i.categoria?.nome||'—')}</td>
                    <td style="padding:9px 6px">
                      <div style="display:flex;align-items:center;gap:8px">
                        <span style="font-weight:700;color:${cor};min-width:32px">${i.estoque_atual}</span>
                        <div style="flex:1;min-width:60px;height:4px;border-radius:2px;background:var(--bd1)">
                          <div style="height:4px;border-radius:2px;background:${cor};width:${pct}%;transition:width .3s"></div>
                        </div>
                      </div>
                    </td>
                    <td style="padding:9px 6px;color:var(--tx3)">${i.estoque_minimo}</td>
                    <td style="padding:9px 6px;color:var(--tx3)">${_esc(i.unidade)}</td>
                    <td style="padding:9px 6px;text-align:right;white-space:nowrap">
                      <button onclick="recVerHistorico('${i.id}')" style="font-size:10.5px;padding:3px 10px;border-radius:5px;border:1px solid var(--bd2);background:none;color:var(--tx2);cursor:pointer;margin-right:4px">Histórico</button>
                      <button onclick="recAbrirNovaReq('${i.id}')" style="font-size:10.5px;padding:3px 10px;border-radius:5px;border:1px solid var(--bd2);background:none;color:var(--tx2);cursor:pointer;margin-right:4px">Solicitar</button>
                      ${_podeGerenciar() ? `<button onclick="recAbrirEntrada('${i.id}')" style="font-size:10.5px;padding:3px 10px;border-radius:5px;border:1px solid rgba(58,170,92,.4);background:rgba(58,170,92,.08);color:var(--gr);cursor:pointer">+ Entrada</button>` : ''}
                    </td>
                  </tr>`;
                }).join('')}
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

    const u     = window._sipenUser || {};
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
      { id:'aprovada',  label:'Aprovadas',  cor:'var(--gr)' },
      { id:'rejeitada', label:'Rejeitadas', cor:'var(--rose)' },
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
            ${chips.map(c=>`<span onclick="recFiltrarReq('${c.id}')" style="cursor:pointer;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid ${_filtroReq===c.id?c.cor:'var(--bd2)'};background:${_filtroReq===c.id?c.cor+'18':'transparent'};color:${_filtroReq===c.id?c.cor:'var(--tx3)'}">${c.label}</span>`).join('')}
          </div>` : ''}
          ${rows.length === 0 ? `<div style="color:var(--tx3);font-size:12px;padding:12px 0">Nenhuma requisição encontrada.</div>` : `
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead>
                <tr style="border-bottom:1px solid var(--bd2)">
                  ${['Item','Qtd','Solicitante','Motivo','Data','Status',''].map(h=>`<th style="text-align:left;padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${rows.map(r=>`
                  <tr style="border-bottom:1px solid var(--bd1)">
                    <td style="padding:9px 6px;font-weight:600;color:var(--tx1)">${_esc(r.item?.nome||'—')}</td>
                    <td style="padding:9px 6px;color:var(--tx2);white-space:nowrap">${r.quantidade} ${_esc(r.item?.unidade||'')}</td>
                    <td style="padding:9px 6px;color:var(--tx2)">${_esc(r.solicitante_nome||'—')}</td>
                    <td style="padding:9px 6px;color:var(--tx3);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(r.motivo||'—')}</td>
                    <td style="padding:9px 6px;color:var(--tx3);white-space:nowrap">${_fmtD(r.criado_em)}</td>
                    <td style="padding:9px 6px">${_pillReq(r.status)}</td>
                    <td style="padding:9px 6px;text-align:right;white-space:nowrap">
                      ${podeG && r.status==='pendente' ? `
                        <button onclick="recAprovarReq('${r.id}','${r.item_id}',${r.quantidade})" style="font-size:10.5px;padding:3px 10px;border-radius:5px;border:1px solid rgba(58,170,92,.4);background:rgba(58,170,92,.08);color:var(--gr);cursor:pointer;font-weight:600;margin-right:4px">Aprovar</button>
                        <button onclick="recRejeitarReq('${r.id}')" style="font-size:10.5px;padding:3px 10px;border-radius:5px;border:1px solid rgba(208,104,104,.4);background:rgba(208,104,104,.08);color:var(--rose);cursor:pointer">Rejeitar</button>` : ''}
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`}
        </div>
      </div>`;
  }

  // ══════════════════════════════════════════════════════
  // MOVIMENTOS
  // ══════════════════════════════════════════════════════
  async function renderMov() {
    const el = document.getElementById('v-recursos-mov');
    if (!el) return;

    let rows = [];
    try {
      const r = await fetch(`${_url()}/recursos_movimentos?select=*,item:recursos_itens(nome,unidade)&order=criado_em.desc&limit=50`, { headers: _hdr() });
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
              <thead>
                <tr style="border-bottom:1px solid var(--bd2)">
                  ${['Data','Item','Tipo','Quantidade','Responsável','Observação'].map(h=>`<th style="text-align:left;padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${rows.map(m=>{
                  const cor   = m.tipo==='entrada'?'var(--gr)':m.tipo==='saida'?'var(--rose)':'var(--amber)';
                  const lbl   = m.tipo==='entrada'?'Entrada':m.tipo==='saida'?'Saída':'Ajuste';
                  const sinal = m.tipo==='entrada'?'+':m.tipo==='saida'?'−':'~';
                  return `<tr style="border-bottom:1px solid var(--bd1)">
                    <td style="padding:9px 6px;color:var(--tx3);white-space:nowrap">${_fmtDT(m.criado_em)}</td>
                    <td style="padding:9px 6px;font-weight:600;color:var(--tx1)">${_esc(m.item?.nome||'—')}</td>
                    <td style="padding:9px 6px"><span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:${cor}18;color:${cor}">${lbl}</span></td>
                    <td style="padding:9px 6px;font-weight:700;color:${cor}">${sinal}${m.quantidade} ${_esc(m.item?.unidade||'')}</td>
                    <td style="padding:9px 6px;color:var(--tx2)">${_esc(m.responsavel||'—')}</td>
                    <td style="padding:9px 6px;color:var(--tx3)">${_esc(m.observacao||'—')}</td>
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
          ${cats.length === 0 ? `<div style="color:var(--tx3);font-size:12px;padding:12px 0">Nenhuma categoria cadastrada.</div>` : `
          <div style="display:flex;flex-direction:column;gap:8px">
            ${cats.map(c=>`
              <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;border:1px solid var(--bd2)">
                <span style="font-size:20px">${_esc(c.icone||'📦')}</span>
                <span style="flex:1;font-size:13px;font-weight:600;color:var(--tx1)">${_esc(c.nome)}</span>
                ${_podeGerenciar() ? `
                  <button onclick="recEditarCat('${c.id}','${_esc(c.nome)}','${_esc(c.icone||'📦')}')" style="font-size:10.5px;padding:3px 10px;border-radius:5px;border:1px solid var(--bd2);background:none;color:var(--tx2);cursor:pointer">Editar</button>
                  <button onclick="recExcluirCat('${c.id}')" style="font-size:10.5px;padding:3px 10px;border-radius:5px;border:1px solid rgba(208,104,104,.3);background:none;color:var(--rose);cursor:pointer">Excluir</button>` : ''}
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
    el.innerHTML = `
      <div style="background:var(--bg-card);border-radius:12px;padding:24px;width:100%;max-width:480px;box-shadow:0 8px 32px rgba(0,0,0,.2)">
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

  // ── Nova Requisição ───────────────────────────────────
  window.recAbrirNovaReq = async function(preId) {
    const itens = await _loadItens();
    const u = window._sipenUser || {};
    _modal('Nova Requisição de Recurso',
      `<label style="${_LBL}">Item *</label>
       <select id="rec-req-item" style="${_SI}">
         <option value="">Selecione…</option>
         ${itens.map(i=>`<option value="${i.id}" ${preId===i.id?'selected':''}>${_esc(i.nome)} — disponível: ${i.estoque_atual} ${_esc(i.unidade)}</option>`).join('')}
       </select>
       <label style="${_LBL}">Quantidade *</label>
       <input id="rec-req-qtd" type="number" min="1" step="1" placeholder="0" style="${_SI}">
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
    const sol    = document.getElementById('rec-req-sol')?.value?.trim();
    const motivo = document.getElementById('rec-req-motivo')?.value?.trim();
    if (!itemId || !qtd || qtd <= 0 || !sol) { alert('Preencha item, quantidade e seu nome.'); return; }
    const u = window._sipenUser || {};
    try {
      const r = await fetch(`${_url()}/recursos_requisicoes`, {
        method:'POST', headers:_hdrJ(),
        body: JSON.stringify({ item_id:itemId, quantidade:qtd, solicitante_nome:sol, solicitante_id:u.id||null, motivo:motivo||null, status:'pendente' })
      });
      if (!r.ok) throw new Error(await r.text());
      document.getElementById('rec-modal')?.remove();
      if (typeof T==='function') T('Requisição enviada','Aguardando aprovação do responsável');
      _itens = null;
      if (document.getElementById('v-recursos-dash')) renderDash();
      if (document.getElementById('v-recursos-req'))  renderReq();
    } catch(e) { alert('Erro: '+e.message); }
  };

  // ── Aprovar ───────────────────────────────────────────
  window.recAprovarReq = async function(reqId, itemId, quantidade) {
    if (!confirm(`Confirmar aprovação de ${quantidade} unidade(s)?`)) return;
    const u = window._sipenUser || {};
    try {
      const r1 = await fetch(`${_url()}/recursos_requisicoes?id=eq.${reqId}`, {
        method:'PATCH', headers:_hdrJ(),
        body: JSON.stringify({ status:'aprovada', aprovado_por: u.nome||u.email||'Responsável', resolvido_em: new Date().toISOString() })
      });
      if (!r1.ok) throw new Error(await r1.text());
      const r2 = await fetch(`${_url()}/recursos_movimentos`, {
        method:'POST', headers:_hdrJ(),
        body: JSON.stringify({ item_id:itemId, tipo:'saida', quantidade, responsavel: u.nome||u.email||'Responsável', observacao:'Requisição aprovada' })
      });
      if (!r2.ok) throw new Error(await r2.text());
      if (typeof T==='function') T('Requisição aprovada','Estoque debitado automaticamente');
      _itens = null;
      if (document.getElementById('v-recursos-dash')) renderDash();
      if (document.getElementById('v-recursos-req'))  renderReq();
    } catch(e) { alert('Erro ao aprovar: '+e.message); }
  };

  // ── Rejeitar ──────────────────────────────────────────
  window.recRejeitarReq = async function(reqId) {
    const obs = prompt('Motivo da rejeição (opcional):');
    if (obs === null) return;
    const u = window._sipenUser || {};
    try {
      const r = await fetch(`${_url()}/recursos_requisicoes?id=eq.${reqId}`, {
        method:'PATCH', headers:_hdrJ(),
        body: JSON.stringify({ status:'rejeitada', aprovado_por: u.nome||u.email||'Responsável', observacao:obs||null, resolvido_em: new Date().toISOString() })
      });
      if (!r.ok) throw new Error(await r.text());
      if (typeof T==='function') T('Requisição rejeitada', obs||'');
      _itens = null;
      if (document.getElementById('v-recursos-dash')) renderDash();
      if (document.getElementById('v-recursos-req'))  renderReq();
    } catch(e) { alert('Erro: '+e.message); }
  };

  // ── Entrada de estoque ────────────────────────────────
  window.recAbrirEntrada = async function(preId) {
    const itens = await _loadItens();
    _modal('Registrar Entrada de Estoque',
      `<label style="${_LBL}">Item *</label>
       <select id="rec-ent-item" style="${_SI}">
         <option value="">Selecione…</option>
         ${itens.map(i=>`<option value="${i.id}" ${preId===i.id?'selected':''}>${_esc(i.nome)} — atual: ${i.estoque_atual} ${_esc(i.unidade)}</option>`).join('')}
       </select>
       <label style="${_LBL}">Quantidade *</label>
       <input id="rec-ent-qtd" type="number" min="0.01" step="any" placeholder="0" style="${_SI}">
       <label style="${_LBL}">Observação (nota fiscal, fornecedor…)</label>
       <input id="rec-ent-obs" type="text" style="${_SI}">`,
      `<button onclick="recSalvarEntrada()" style="padding:8px 20px;border-radius:7px;border:none;background:var(--gr);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Confirmar Entrada</button>`
    );
  };

  window.recSalvarEntrada = async function() {
    const itemId = document.getElementById('rec-ent-item')?.value;
    const qtd    = parseFloat(document.getElementById('rec-ent-qtd')?.value);
    const obs    = document.getElementById('rec-ent-obs')?.value?.trim();
    if (!itemId || !qtd || qtd <= 0) { alert('Selecione o item e informe a quantidade.'); return; }
    const u = window._sipenUser || {};
    try {
      const r = await fetch(`${_url()}/recursos_movimentos`, {
        method:'POST', headers:_hdrJ(),
        body: JSON.stringify({ item_id:itemId, tipo:'entrada', quantidade:qtd, observacao:obs||null, responsavel:u.nome||u.email||null })
      });
      if (!r.ok) throw new Error(await r.text());
      document.getElementById('rec-modal')?.remove();
      if (typeof T==='function') T('Entrada registrada',`+${qtd} unidade(s) adicionada(s)`);
      _itens = null;
      if (document.getElementById('v-recursos-dash')) renderDash();
      if (document.getElementById('v-recursos-lista')) renderLista();
      if (document.getElementById('v-recursos-mov'))  renderMov();
    } catch(e) { alert('Erro: '+e.message); }
  };

  // ── Ajuste de inventário ──────────────────────────────
  window.recAbrirAjuste = async function() {
    const itens = await _loadItens();
    _modal('Ajuste de Inventário',
      `<div style="font-size:11.5px;color:var(--tx3);margin-bottom:8px">O estoque será definido exatamente para o valor informado.</div>
       <label style="${_LBL}">Item *</label>
       <select id="rec-adj-item" style="${_SI}">
         <option value="">Selecione…</option>
         ${itens.map(i=>`<option value="${i.id}">${_esc(i.nome)} — atual: ${i.estoque_atual} ${_esc(i.unidade)}</option>`).join('')}
       </select>
       <label style="${_LBL}">Novo estoque *</label>
       <input id="rec-adj-qtd" type="number" min="0" step="any" placeholder="0" style="${_SI}">
       <label style="${_LBL}">Motivo do ajuste</label>
       <input id="rec-adj-obs" type="text" placeholder="Ex: contagem física, perda, extravio" style="${_SI}">`,
      `<button onclick="recSalvarAjuste()" style="padding:8px 20px;border-radius:7px;border:none;background:var(--amber);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Confirmar Ajuste</button>`
    );
  };

  window.recSalvarAjuste = async function() {
    const itemId = document.getElementById('rec-adj-item')?.value;
    const qtd    = parseFloat(document.getElementById('rec-adj-qtd')?.value);
    const obs    = document.getElementById('rec-adj-obs')?.value?.trim();
    if (!itemId || isNaN(qtd) || qtd < 0) { alert('Selecione o item e informe o novo estoque.'); return; }
    const u = window._sipenUser || {};
    try {
      const r = await fetch(`${_url()}/recursos_movimentos`, {
        method:'POST', headers:_hdrJ(),
        body: JSON.stringify({ item_id:itemId, tipo:'ajuste', quantidade:qtd, observacao:obs||'Ajuste manual', responsavel:u.nome||u.email||null })
      });
      if (!r.ok) throw new Error(await r.text());
      document.getElementById('rec-modal')?.remove();
      if (typeof T==='function') T('Ajuste realizado',`Novo estoque: ${qtd}`);
      _itens = null;
      if (document.getElementById('v-recursos-dash')) renderDash();
      if (document.getElementById('v-recursos-lista')) renderLista();
    } catch(e) { alert('Erro: '+e.message); }
  };

  // ── Novo item ─────────────────────────────────────────
  window.recAbrirNovoItem = async function() {
    const cats = await _loadCats();
    _modal('Novo Item',
      `<label style="${_LBL}">Nome *</label>
       <input id="rec-it-nome" type="text" style="${_SI}">
       <label style="${_LBL}">Categoria</label>
       <select id="rec-it-cat" style="${_SI}">
         <option value="">Sem categoria</option>
         ${cats.map(c=>`<option value="${c.id}">${_esc(c.icone||'')} ${_esc(c.nome)}</option>`).join('')}
       </select>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
         <div>
           <label style="${_LBL}">Unidade</label>
           <select id="rec-it-und" style="${_SI}">
             ${['un','kg','g','L','ml','cx','pct','rolo','par','m'].map(u=>`<option>${u}</option>`).join('')}
           </select>
         </div>
         <div>
           <label style="${_LBL}">Estoque mínimo</label>
           <input id="rec-it-min" type="number" min="0" step="any" value="0" style="${_SI}">
         </div>
       </div>
       <label style="${_LBL}">Estoque inicial</label>
       <input id="rec-it-ini" type="number" min="0" step="any" value="0" style="${_SI}">`,
      `<button onclick="recSalvarNovoItem()" style="padding:8px 20px;border-radius:7px;border:none;background:var(--amber);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Criar Item</button>`
    );
  };

  window.recSalvarNovoItem = async function() {
    const nome  = document.getElementById('rec-it-nome')?.value?.trim();
    const catId = document.getElementById('rec-it-cat')?.value || null;
    const und   = document.getElementById('rec-it-und')?.value || 'un';
    const min   = parseFloat(document.getElementById('rec-it-min')?.value || '0');
    const ini   = parseFloat(document.getElementById('rec-it-ini')?.value || '0');
    if (!nome) { alert('Informe o nome do item.'); return; }
    try {
      const r = await fetch(`${_url()}/recursos_itens`, {
        method:'POST', headers:_hdrJ(),
        body: JSON.stringify({ nome, categoria_id:catId, unidade:und, estoque_minimo:min, estoque_atual:ini })
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
    if (!nome) { alert('Informe o nome da categoria.'); return; }
    try {
      const ep  = id ? `${_url()}/recursos_categorias?id=eq.${id}` : `${_url()}/recursos_categorias`;
      const mth = id ? 'PATCH' : 'POST';
      const r = await fetch(ep, { method:mth, headers:_hdrJ(), body: JSON.stringify({ nome, icone }) });
      if (!r.ok) throw new Error(await r.text());
      document.getElementById('rec-modal')?.remove();
      if (typeof T==='function') T(id ? 'Categoria atualizada' : 'Categoria criada', nome);
      _categorias = null;
      if (document.getElementById('v-recursos-cat')) renderCat();
    } catch(e) { alert('Erro: '+e.message); }
  };

  window.recExcluirCat = async function(id) {
    if (!confirm('Excluir esta categoria? Os itens vinculados ficarão sem categoria.')) return;
    try {
      const r = await fetch(`${_url()}/recursos_categorias?id=eq.${id}`, { method:'DELETE', headers:_hdr() });
      if (!r.ok) throw new Error(await r.text());
      if (typeof T==='function') T('Categoria excluída','');
      _categorias = null;
      _itens = null;
      if (document.getElementById('v-recursos-cat')) renderCat();
    } catch(e) { alert('Erro: '+e.message); }
  };

  // ══════════════════════════════════════════════════════
  // HISTÓRICO POR PRODUTO
  // ══════════════════════════════════════════════════════
  window.recVerHistorico = function(itemId) {
    _itemAtual = itemId;
    go('recursos-hist');
  };

  async function renderHist() {
    const el = document.getElementById('v-recursos-hist');
    if (!el) return;

    if (!_itemAtual) {
      el.innerHTML = `<div class="hero">${_HERO_IC}<div><div class="hero-ttl">Histórico</div></div><div class="hero-act"><button class="tbt" onclick="go('recursos-lista')">← Voltar</button></div></div><div class="ct"><div class="card"><div style="color:var(--tx3);font-size:12px;padding:12px 0">Selecione um item na lista de estoque.</div></div></div>`;
      return;
    }

    el.innerHTML = `<div class="ct" style="padding-top:20px"><div style="color:var(--tx3);font-size:12px;text-align:center;padding:40px 0">Carregando histórico…</div></div>`;

    let item = null;
    let movs = [];

    try {
      const [ri, rm] = await Promise.all([
        fetch(`${_url()}/recursos_itens?id=eq.${_itemAtual}&select=*,categoria:recursos_categorias(nome,icone)`, { headers: _hdr() }),
        fetch(`${_url()}/recursos_movimentos?item_id=eq.${_itemAtual}&select=*,nota:recursos_notas_fiscais(numero,serie)&order=criado_em.asc`, { headers: _hdr() }),
      ]);
      const itens = ri.ok ? await ri.json() : [];
      item  = itens[0] || null;
      movs  = rm.ok ? await rm.json() : [];
    } catch {}

    if (!item) {
      el.innerHTML = `<div class="hero">${_HERO_IC}<div><div class="hero-ttl">Histórico</div></div><div class="hero-act"><button class="tbt" onclick="go('recursos-lista')">← Voltar</button></div></div><div class="ct"><div class="card"><div style="color:var(--rose);font-size:12px;padding:12px 0">Item não encontrado.</div></div></div>`;
      return;
    }

    // ── Calcular saldo acumulado (ordem cronológica) ─────
    let saldo = 0;
    const comSaldo = movs.map(m => {
      if (m.tipo === 'entrada') saldo += Number(m.quantidade);
      else if (m.tipo === 'saida') saldo = Math.max(0, saldo - Number(m.quantidade));
      else if (m.tipo === 'ajuste') saldo = Number(m.quantidade);
      return { ...m, _saldo: saldo };
    });
    const linhas = [...comSaldo].reverse(); // exibir mais recente primeiro

    // ── KPIs ────────────────────────────────────────────
    const totEnt  = movs.filter(m => m.tipo === 'entrada').reduce((a, m) => a + Number(m.quantidade), 0);
    const totSai  = movs.filter(m => m.tipo === 'saida').reduce((a, m) => a + Number(m.quantidade), 0);
    const totAdj  = movs.filter(m => m.tipo === 'ajuste').length;
    const nivel   = _nivel(item.estoque_atual, item.estoque_minimo);
    const corSaldo = _corNivel(nivel);

    const _pillTipo = (t) => {
      const m = {
        entrada: { bg:'rgba(58,170,92,.12)',    cl:'var(--gr)',    lbl:'Entrada' },
        saida:   { bg:'rgba(208,104,104,.12)',  cl:'var(--rose)',  lbl:'Saída'   },
        ajuste:  { bg:'rgba(212,168,67,.12)',   cl:'var(--gold)',  lbl:'Ajuste'  },
      };
      const s = m[t] || { bg:'var(--bd1)', cl:'var(--tx3)', lbl: t };
      return `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:${s.bg};color:${s.cl}">${s.lbl}</span>`;
    };

    const _sinal = (t, q) => {
      const cor = t==='entrada'?'var(--gr)':t==='saida'?'var(--rose)':'var(--amber)';
      const s   = t==='entrada'?'+':t==='saida'?'−':'~';
      return `<span style="font-weight:700;color:${cor}">${s}${q} ${_esc(item.unidade)}</span>`;
    };

    el.innerHTML = `
      <div class="hero">
        ${_HERO_IC}
        <div>
          <div class="hero-lbl">Recursos · ${_esc(item.categoria?.icone||'')} ${_esc(item.categoria?.nome||'Estoque')}</div>
          <div class="hero-ttl">${_esc(item.nome)}</div>
          <div class="hero-dsc">Histórico completo de entradas e saídas</div>
        </div>
        <div class="hero-act">
          <button class="tbt" onclick="go('recursos-lista')">← Voltar</button>
          <button class="tbt" onclick="recAbrirNovaReq('${item.id}')" style="color:var(--tx2);border-color:var(--bd2)">Solicitar</button>
          ${_podeGerenciar() ? `<button class="tbt" onclick="recAbrirEntrada('${item.id}')" style="color:var(--gr);border-color:rgba(58,170,92,.3)">+ Entrada</button>` : ''}
        </div>
      </div>
      <div class="ct">

        <!-- KPIs -->
        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px">
          <div class="card" style="padding:12px 14px;display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:rgba(208,144,64,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
            </div>
            <div>
              <div style="font-size:20px;font-weight:800;color:${corSaldo};line-height:1">${item.estoque_atual}</div>
              <div style="font-size:11px;color:var(--tx2);font-weight:600;margin-top:2px">Saldo atual</div>
              <div style="font-size:10px;color:var(--tx3)">mín ${item.estoque_minimo} ${_esc(item.unidade)}</div>
            </div>
          </div>
          <div class="card" style="padding:12px 14px;display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:rgba(58,170,92,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gr)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m17 5-5-3-5 3"/></svg>
            </div>
            <div>
              <div style="font-size:20px;font-weight:800;color:var(--gr);line-height:1">+${totEnt}</div>
              <div style="font-size:11px;color:var(--tx2);font-weight:600;margin-top:2px">Total entradas</div>
              <div style="font-size:10px;color:var(--tx3)">${movs.filter(m=>m.tipo==='entrada').length} registro(s)</div>
            </div>
          </div>
          <div class="card" style="padding:12px 14px;display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:rgba(208,104,104,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V2"/><path d="m17 19-5 3-5-3"/></svg>
            </div>
            <div>
              <div style="font-size:20px;font-weight:800;color:var(--rose);line-height:1">−${totSai}</div>
              <div style="font-size:11px;color:var(--tx2);font-weight:600;margin-top:2px">Total saídas</div>
              <div style="font-size:10px;color:var(--tx3)">${movs.filter(m=>m.tipo==='saida').length} registro(s)</div>
            </div>
          </div>
          <div class="card" style="padding:12px 14px;display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:rgba(212,168,67,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            </div>
            <div>
              <div style="font-size:20px;font-weight:800;color:var(--tx1);line-height:1">${movs.length}</div>
              <div style="font-size:11px;color:var(--tx2);font-weight:600;margin-top:2px">Movimentos</div>
              <div style="font-size:10px;color:var(--tx3)">${totAdj} ajuste(s)</div>
            </div>
          </div>
        </div>

        <!-- Tabela de histórico -->
        <div class="card">
          <div class="ctit">Histórico de Movimentos</div>
          ${linhas.length === 0
            ? `<div style="color:var(--tx3);font-size:12px;padding:12px 0">Nenhum movimento registrado para este item.</div>`
            : `<div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;font-size:12px">
                <thead>
                  <tr style="border-bottom:1px solid var(--bd2)">
                    ${['Data/Hora','Tipo','Quantidade','Saldo','Referência','Responsável'].map(h=>`<th style="text-align:left;padding:8px 6px;color:var(--tx3);font-weight:600;font-size:10px;text-transform:uppercase;white-space:nowrap">${h}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${linhas.map(m => {
                    const nfRef = m.nota?.numero ? `NF ${m.nota.numero}` : (m.observacao ? _esc(m.observacao.substring(0,40)) : '—');
                    const corS  = m._saldo <= (item.estoque_minimo||0) ? 'var(--rose)' : 'var(--tx1)';
                    return `<tr style="border-bottom:1px solid var(--bd1)">
                      <td style="padding:9px 6px;color:var(--tx3);white-space:nowrap;font-variant-numeric:tabular-nums">${_fmtDT(m.criado_em)}</td>
                      <td style="padding:9px 6px">${_pillTipo(m.tipo)}</td>
                      <td style="padding:9px 6px">${_sinal(m.tipo, m.quantidade)}</td>
                      <td style="padding:9px 6px;font-weight:700;color:${corS};font-variant-numeric:tabular-nums">${m._saldo} ${_esc(item.unidade)}</td>
                      <td style="padding:9px 6px;color:var(--tx2);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nfRef}</td>
                      <td style="padding:9px 6px;color:var(--tx3)">${_esc(m.responsavel||'—')}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>`;
  }

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
