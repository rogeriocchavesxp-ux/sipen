/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Demandas
   mobile/demandas.js · v1.3.2
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('demandas',     renderLista);
  mobRegisterPage('dem-detalhe',  renderDetalhe);
  mobRegisterPage('nova-demanda', renderNovaDemanda);

  /* ── Categorias (espelha chamado.html) ─────────────── */
  const CATS = [
    { nome:'Administração',        icon:'🏛', resp:'Departamento de Administração', subcats:[
      { grupo:'Patrimônio e Bens',         itens:['Cadastro de patrimônio','Baixa de bem','Inventário','Cessão de uso','Avaliação de bem'] },
      { grupo:'Contratos e Fornecedores',  itens:['Novo contrato','Renovação de contrato','Rescisão de contrato','Cadastro de fornecedor','Aditivo contratual'] },
      { grupo:'Compras e Aquisições',      itens:['Solicitação de compra','Cotação de preço','Aprovação de despesa','Prestação de contas'] },
      { grupo:'Recursos Humanos',          itens:['Cadastro de colaborador','Desligamento','Férias e afastamento','Benefícios','Voluntariado'] },
      { grupo:'Controle de Acesso',        itens:['Uso do estacionamento','Controle de Acesso — Estacionamento','Controle de Acesso — Facial'] },
      { grupo:'Planejamento e Documentos', itens:['Planejamento estratégico','Relatório administrativo','Documentação interna','Outros (Administração)'] },
    ]},
    { nome:'Manutenção',           icon:'🛠', resp:'Departamento de Manutenção', subcats:[
      { grupo:'Infraestrutura Civil',     itens:['Elétrica','Hidráulica','Estrutural','Civil','Pintura','Marcenaria','Manutenção predial','Chaveiro'] },
      { grupo:'Tecnologia',               itens:['Internet','Telefonia','Rede/Wi-Fi','Informática','Computadores','Impressoras'] },
      { grupo:'Audiovisual',              itens:['Som','Projeção','Streaming/Transmissão','Equipamentos musicais'] },
      { grupo:'Climatização e Segurança', itens:['Ar-condicionado','Câmeras','Alarmes','Portão eletrônico'] },
      { grupo:'Conservação',              itens:['Iluminação','Jardinagem','Limpeza','Dedetização'] },
      { grupo:'Geral',                    itens:['Equipamentos','Pequenos reparos'] },
    ]},
    { nome:'Limpeza e Organização',icon:'🧹', resp:'Equipe de Limpeza / Zeladoria',   subcats:['Limpeza geral','Limpeza pós-evento','Organização de espaços','Solicitação de materiais de limpeza'] },
    { nome:'Pastoral',             icon:'✦',  resp:'Pastores / Liderança', subcats:[
      { grupo:'Aconselhamento', itens:['Aconselhamento pastoral','Atendimento pastoral'] },
      { grupo:'Visitas',        itens:['Visita hospitalar','Visita no Lar','Visita na Empresa','Visita Carcerária'] },
    ]},
    { nome:'Agendamentos',         icon:'📅', resp:'Secretaria / Liderança', subcats:[
      { grupo:'Programação / Espaços', itens:['Culto','Reunião','Evento','Ensaio','Casamento','Aniversário','Congresso','Conferência','Outros'] },
    ]},
    { nome:'Secretaria',           icon:'📄', resp:'Secretaria / Conselho',   subcats:['Emissão de documentos','Elaboração de relatórios','Solicitação ao Conselho','Protocolos oficiais','Registro de atas/documentos'] },
    { nome:'Oração',               icon:'🙏', resp:'Pastores / Liderança',    subcats:['Pedido de oração'] },
    { nome:'Financeiro',           icon:'💰', resp:'Tesouraria / Financeiro', subcats:['Solicitação de pagamento','Reembolso','Prestação de contas','Solicitação de verba','Orçamento de despesas'] },
    { nome:'Ação Social / Hebron', icon:'🤝', resp:'Hebron / Ação Social',    subcats:['Solicitação de ajuda','Projetos sociais','Distribuição de recursos','Cadastro em programas sociais'] },
    { nome:'Comunicação',          icon:'📢', resp:'Ministério de Comunicação', subcats:[
      { grupo:'Arte Digital', itens:['Banner e Redes Sociais','Arte para WhatsApp','Story / Reels','Apresentação e Slides','Material Impresso'] },
      { grupo:'Produção AV',  itens:['Transmissão ao Vivo','Sonorização','Projeção','Iluminação Especial'] },
      { grupo:'Geral',        itens:['Comunicação Geral'] },
    ]},
    { nome:'Conselho',             icon:'⚖️', resp:'Conselho Presbiterial', subcats:[
      { grupo:'Recursos e Apelações',     itens:['Recurso de decisão','Apelação','Revisão de processo'] },
      { grupo:'Audiências e Atendimento', itens:['Pedido de audiência com o Conselho','Atendimento pastoral especializado'] },
      { grupo:'Fé e Disciplina',          itens:['Assunto de fé ou doutrina','Questão disciplinar','Restauração'] },
      { grupo:'Comunicações Oficiais',    itens:['Sugestão ao Conselho','Comunicação oficial','Pedido de deliberação','Outros assuntos ao Conselho'] },
    ]},
  ];

  const STATUS_COR = {
    'Em Análise':   { bg:'rgba(212,166,67,.12)',  cl:'var(--gold)'   },
    'Em Andamento': { bg:'rgba(191,90,242,.12)',  cl:'var(--violet)' },
    'Aguardando Pagamento': { bg:'rgba(255,159,10,.12)', cl:'var(--amber)'  },
    'Pagamento Agendado':   { bg:'rgba(10,132,255,.12)', cl:'var(--blue)'   },
    'Concluída':    { bg:'rgba(48,209,88,.12)',   cl:'var(--gr)'     },
    'Pago':         { bg:'rgba(48,209,88,.12)',   cl:'var(--gr)'     },
    'Cancelada':    { bg:'rgba(90,96,104,.15)',   cl:'var(--tx3)'    },
    'Pendente':     { bg:'rgba(255,159,10,.12)',  cl:'var(--amber)'  },
  };

  const _FECHADAS_SET = new Set(['concluída','concluida','cancelada','cancelado','pago','paga']);
  const _isFechada = st => _FECHADAS_SET.has((st||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''));

  const FILTROS = [
    { key:'abertas',     label:'Abertas',     query:'', clientFilter: d => !_isFechada(d.status) },
    { key:'analise',     label:'Em Análise',  query:'status=eq.Em%20An%C3%A1lise' },
    { key:'andamento',   label:'Andamento',   query:'status=eq.Em%20Andamento' },
    { key:'concluidas',  label:'Concluídas',  query:'', clientFilter: d => _isFechada(d.status) },
    { key:'todas',       label:'Todas',       query:'' },
  ];

  let _filtroAtivo = 'abertas';
  let _busca       = '';
  let _cache       = null;

  /* ── Lista ─────────────────────────────────────────── */
  async function renderLista(el) {
    _cache = null;
    el.innerHTML = `
      <div style="padding-bottom:80px">
        <div class="mob-search-wrap">
          <input class="mob-search" type="search" placeholder="Buscar demandas…"
                 value="${_esc(_busca)}"
                 oninput="_demBusca(this.value)"
                 onsearch="_demBusca(this.value)">
        </div>
        <div class="mob-chips" id="dem-chips">
          ${FILTROS.map(f => `
            <button class="mob-chip ${f.key===_filtroAtivo?'active':''}"
                    onclick="_demFiltro('${f.key}')">${f.label}</button>
          `).join('')}
        </div>
        <div id="dem-lista" class="mob-section">
          <div class="mob-card-list mob-loading-state">Carregando…</div>
        </div>
      </div>
      <!-- FAB +Nova -->
      <button onclick="mobGo('nova-demanda',{title:'Nova Demanda'})"
        style="position:fixed;bottom:calc(var(--tab-h) + var(--safe-bottom) + 16px);right:18px;
               z-index:200;width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;
               background:var(--blue);color:#fff;font-size:22px;font-weight:300;
               display:flex;align-items:center;justify-content:center;
               box-shadow:0 4px 16px rgba(10,132,255,.45)">
        +
      </button>
    `;
    await _carregarLista();
  }

  async function _carregarLista() {
    const el = document.getElementById('dem-lista');
    if (!el) return;

    const f = FILTROS.find(x => x.key === _filtroAtivo) || FILTROS[0];

    // build cleanly
    const params = ['select=id,titulo,status,area,prioridade,solicitante,criado_em','order=criado_em.desc','limit=60'];
    if (f.query) params.unshift(f.query);

    try {
      const res  = await fetch(
        `${apiBaseUrl()}/rest/v1/demandas?${params.join('&')}`,
        { headers: apiHeaders() }
      );
      let data = await res.json();
      if (!Array.isArray(data)) data = [];

      if (f.clientFilter) data = data.filter(f.clientFilter);

      if (_busca) {
        const q = _busca.toLowerCase();
        data = data.filter(d =>
          (d.titulo || '').toLowerCase().includes(q) ||
          (d.area   || '').toLowerCase().includes(q) ||
          (d.solicitante || '').toLowerCase().includes(q)
        );
      }

      _cache = data;
      _renderRows(el, data);
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar demandas.</div></div>`;
    }
  }

  function _renderRows(el, data) {
    if (!data.length) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">✅</div><div class="mob-empty-text">Nenhuma demanda encontrada.</div></div>`;
      return;
    }
    el.innerHTML = `
      <div class="mob-card-list">
        ${data.map(d => _rowHtml(d)).join('')}
      </div>
      <div style="padding:12px 0 8px;text-align:center;font-size:11px;color:var(--tx4)">${data.length} demanda${data.length !== 1 ? 's' : ''}</div>
    `;
  }

  function _rowHtml(d) {
    const sc = STATUS_COR[d.status] || { bg:'var(--bg-hover)', cl:'var(--tx3)' };
    const pr = d.prioridade === 'Urgente' || d.prioridade === 'Alta' ? `<span style="color:var(--rose);font-size:10px;font-weight:700"> ●</span>` : '';
    return `
      <div class="mob-list-item" onclick="mobGo('dem-detalhe',{id:'${d.id}',title:'${_esc(d.titulo||'Demanda')}'})">
        <div class="mob-list-ico" style="background:${sc.bg};color:${sc.cl}">
          ${_catEmoji(d.area)}
        </div>
        <div class="mob-list-body">
          <div class="mob-list-title">${_esc(d.titulo || 'Sem título')}${pr}</div>
          <div class="mob-list-sub">${d.area ? _esc(d.area) + ' · ' : ''}${_statusBadge(d.status)}</div>
        </div>
        <div class="mob-list-chev">›</div>
      </div>
    `;
  }

  window._demFiltro = function (key) {
    _filtroAtivo = key;
    document.querySelectorAll('#dem-chips .mob-chip').forEach(c => {
      c.classList.toggle('active', c.textContent.trim() === (FILTROS.find(f=>f.key===key)?.label));
    });
    _carregarLista();
  };

  window._demBusca = function (val) {
    _busca = val;
    if (_cache) {
      const q    = val.toLowerCase();
      const data = q ? _cache.filter(d =>
        (d.titulo||'').toLowerCase().includes(q) ||
        (d.area  ||'').toLowerCase().includes(q) ||
        (d.solicitante||'').toLowerCase().includes(q)
      ) : _cache;
      _renderRows(document.getElementById('dem-lista'), data);
    } else {
      _carregarLista();
    }
  };

  /* ── Status maps ────────────────────────────────────── */
  const _STATUS_DB = {
    'Pendente':             'PENDENTE',
    'Em Análise':           'EM_ANALISE',
    'Em Andamento':         'EM_ANDAMENTO',
    'Aguardando Pagamento': 'AGUARDANDO_PAGAMENTO',
    'Pagamento Agendado':   'PAGAMENTO_AGENDADO',
    'Concluída':            'CONCLUIDA',
    'Pago':                 'PAGO',
    'Cancelada':            'CANCELADA',
  };
  const _STATUS_LABEL = {
    'PENDENTE':             'Pendente',
    'ABERTA':               'Pendente',
    'EM_ANALISE':           'Em Análise',
    'EM_ANDAMENTO':         'Em Andamento',
    'AGUARDANDO_PAGAMENTO': 'Aguardando Pagamento',
    'PAGAMENTO_AGENDADO':   'Pagamento Agendado',
    'CONCLUIDA':            'Concluída',
    'PAGO':                 'Pago',
    'CANCELADA':            'Cancelada',
  };
  const _STATUS_OPCOES = [
    'Pendente','Em Análise','Em Andamento',
    'Aguardando Pagamento','Concluída','Pago','Cancelada',
  ];
  function _toLabel(st) { return _STATUS_LABEL[st] || st || 'Pendente'; }
  function _toDb(st)    { return _STATUS_DB[st]    || st || 'PENDENTE'; }

  /* ── Detalhe ───────────────────────────────────────── */
  async function renderDetalhe(el, params) {
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;
    try {
      const res  = await fetch(
        `${apiBaseUrl()}/rest/v1/demandas?id=eq.${encodeURIComponent(params.id)}&select=*&limit=1`,
        { headers: apiHeaders() }
      );
      const [d] = await res.json();
      if (!d) throw new Error('não encontrado');

      const stLabel = _toLabel(d.status);

      el.innerHTML = `
        <div class="mob-detail">
          <div class="mob-detail-hero">
            <div class="mob-detail-title">${_esc(d.titulo || 'Sem título')}</div>
            <div class="mob-detail-meta">
              ${_statusBadgeEl(stLabel)}
              ${d.prioridade ? `<span class="mob-badge" style="background:var(--rosebg);color:var(--rose)">${_esc(d.prioridade)}</span>` : ''}
            </div>
          </div>

          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Informações</div>
            ${_row('Área', d.area)}
            ${_row('Subcategoria', d.subcategoria)}
            ${_row('Solicitante', d.solicitante)}
            ${_row('Responsável', d.responsavel)}
            ${_row('Abertura', _fmtTs(d.criado_em))}
            ${d.data_conclusao ? _row('Conclusão', _fmtTs(d.data_conclusao)) : ''}
          </div>

          ${d.descricao ? `
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Descrição</div>
            <div style="padding:14px 16px;font-size:14px;color:var(--tx2);line-height:1.7;word-break:break-word">${_fmtTexto(d.descricao)}</div>
          </div>` : ''}

          ${d.observacoes ? `
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Observações</div>
            <div style="padding:14px 16px;font-size:14px;color:var(--tx2);line-height:1.7;word-break:break-word">${_fmtTexto(d.observacoes)}</div>
          </div>` : ''}

          <!-- Alterar status -->
          <div class="mob-detail-card">
            <div class="mob-detail-card-title">Status</div>
            <div style="padding:12px 16px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px">
              <span id="dem-status-badge-${d.id}">${_statusBadgeEl(stLabel)}</span>
              <button class="mob-btn-secondary" style="flex-shrink:0"
                      onclick="_demAbrirStatusSheet('${d.id}','${_esc(stLabel)}')">
                Alterar
              </button>
            </div>
          </div>

          <!-- Andamentos -->
          <div class="mob-detail-card" style="padding-bottom:24px">
            <div class="mob-detail-card-title">Andamento</div>
            <div id="dem-and-list-${d.id}" style="padding:0 16px">
              <div class="mob-loading-state" style="font-size:13px;padding:12px 0">Carregando…</div>
            </div>
            <div style="padding:12px 16px 0;display:flex;flex-direction:column;gap:8px">
              <textarea id="dem-and-txt-${d.id}"
                style="width:100%;min-height:72px;border:1px solid var(--bd2);border-radius:10px;
                       background:var(--bg-input);color:var(--tx1);font-size:14px;
                       padding:10px 12px;resize:none;font-family:var(--sans);outline:none;
                       box-sizing:border-box"
                placeholder="Registre um andamento…"></textarea>
              <button class="mob-btn-primary" id="dem-and-btn-${d.id}"
                      onclick="_demRegistrarAndamento('${d.id}')">
                Registrar andamento
              </button>
            </div>
          </div>
        </div>
      `;

      _demCarregarAndamentos(d.id);
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Demanda não encontrada.</div></div>`;
    }
  }

  /* ── Status Sheet ────────────────────────────────────── */
  window._demAbrirStatusSheet = function (demId, stAtual) {
    const existing = document.getElementById('dem-status-sheet');
    if (existing) existing.remove();

    const sheet = document.createElement('div');
    sheet.id = 'dem-status-sheet';
    sheet.style.cssText = 'position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;justify-content:flex-end';

    const SC = STATUS_COR;
    const opcoes = _STATUS_OPCOES.map(st => {
      const cfg = SC[st] || { bg:'var(--bg-hover)', cl:'var(--tx3)' };
      const ativo = st === stAtual;
      return `
        <button onclick="_demSelecionarStatus('${demId}','${_esc(st)}')"
          style="display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;
                 background:${ativo ? 'var(--bg-hover)' : 'transparent'};
                 border:none;border-bottom:1px solid var(--bd1);
                 cursor:pointer;text-align:left">
          <span style="width:10px;height:10px;border-radius:50%;flex-shrink:0;background:${cfg.cl}"></span>
          <span style="font-size:15px;color:var(--tx1);font-weight:${ativo?'700':'400'}">${_esc(st)}</span>
          ${ativo ? '<span style="margin-left:auto;color:var(--gr);font-size:14px">✓</span>' : ''}
        </button>`;
    }).join('');

    sheet.innerHTML = `
      <div onclick="_demFecharStatusSheet()" style="flex:1;background:rgba(0,0,0,.35)"></div>
      <div style="background:var(--bg-surface);border-radius:16px 16px 0 0;overflow:hidden;padding-bottom:var(--safe-bottom)">
        <div style="padding:16px;text-align:center;font-size:13px;font-weight:600;color:var(--tx2);
                    border-bottom:1px solid var(--bd1)">Alterar status</div>
        ${opcoes}
        <button onclick="_demFecharStatusSheet()"
          style="width:100%;padding:15px;background:transparent;border:none;
                 font-size:16px;color:var(--blue);font-weight:600;cursor:pointer;
                 margin-top:4px">
          Cancelar
        </button>
      </div>
    `;
    document.body.appendChild(sheet);
  };

  window._demFecharStatusSheet = function () {
    document.getElementById('dem-status-sheet')?.remove();
  };

  window._demSelecionarStatus = async function (demId, novoStatus) {
    _demFecharStatusSheet();
    try {
      const sb = getSupabase();
      const payload = { status: _toDb(novoStatus) };
      if (['Concluída','Pago'].includes(novoStatus)) {
        payload.data_conclusao = new Date().toISOString().split('T')[0];
      }
      const { error } = await sb.from('demandas').update(payload).eq('id', demId);
      if (error) throw error;

      // Atualiza badge na tela
      const badge = document.getElementById(`dem-status-badge-${demId}`);
      if (badge) badge.innerHTML = _statusBadgeEl(novoStatus);

      // Registra andamento automático
      await _demInserirAndamento(demId, `Status alterado para "${novoStatus}"`, novoStatus, true);
      _demCarregarAndamentos(demId);

      // Invalida cache da lista
      _cache = null;
      mobToast('Status atualizado');
    } catch (e) {
      mobToast('Erro: ' + (e.message || 'falha ao atualizar'));
    }
  };

  /* ── Andamentos ──────────────────────────────────────── */
  async function _demCarregarAndamentos(demId) {
    const el = document.getElementById(`dem-and-list-${demId}`);
    if (!el) return;
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('demanda_andamentos')
        .select('id,texto,usuario_nome,status_demanda,automatico,created_at')
        .eq('demanda_id', demId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      if (!data || !data.length) {
        el.innerHTML = `<div style="padding:12px 0;font-size:13px;color:var(--tx3);font-style:italic">Nenhum andamento registrado.</div>`;
        return;
      }

      el.innerHTML = data.map(a => {
        const dt = a.created_at ? _fmtTs(a.created_at) : '—';
        const stCfg = a.status_demanda ? (STATUS_COR[_toLabel(a.status_demanda)] || {}) : null;

        if (a.automatico) {
          return `
            <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--bd1)">
              <div style="width:20px;height:20px;border-radius:50%;background:var(--bg-hover);
                          display:flex;align-items:center;justify-content:center;font-size:10px;
                          flex-shrink:0;margin-top:1px">🔄</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;color:var(--tx3);font-style:italic;line-height:1.5">
                  ${_esc(a.texto)}
                </div>
                <div style="font-size:11px;color:var(--tx4);margin-top:2px">${dt}</div>
              </div>
            </div>`;
        }

        const initials = (a.usuario_nome || '?').split(' ').slice(0,2).map(w => w[0] || '').join('').toUpperCase();
        return `
          <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd1)">
            <div style="width:30px;height:30px;border-radius:50%;background:var(--bluebg);
                        color:var(--blue);font-size:11px;font-weight:700;display:flex;
                        align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">
              ${_esc(initials)}
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
                <span style="font-size:13px;font-weight:600;color:var(--tx1)">${_esc(a.usuario_nome || 'Sistema')}</span>
                <span style="font-size:11px;color:var(--tx3)">${dt}</span>
                ${stCfg ? `<span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:10px;background:${stCfg.bg||'var(--bg-hover)'};color:${stCfg.cl||'var(--tx3)'}">${_esc(_toLabel(a.status_demanda))}</span>` : ''}
              </div>
              <div style="font-size:14px;color:var(--tx1);line-height:1.6;word-break:break-word">${_fmtTexto(a.texto)}</div>
            </div>
          </div>`;
      }).join('');
    } catch (e) {
      const el2 = document.getElementById(`dem-and-list-${demId}`);
      if (el2) el2.innerHTML = `<div style="padding:8px 0;font-size:13px;color:var(--rose)">Erro ao carregar andamentos.</div>`;
    }
  }

  window._demRegistrarAndamento = async function (demId) {
    const txtEl = document.getElementById(`dem-and-txt-${demId}`);
    const btn   = document.getElementById(`dem-and-btn-${demId}`);
    const texto = txtEl?.value?.trim();
    if (!texto) { mobToast('Escreva um andamento antes de registrar'); return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
    try {
      await _demInserirAndamento(demId, texto, null, false);
      if (txtEl) txtEl.value = '';
      mobToast('Andamento registrado');
      _demCarregarAndamentos(demId);
    } catch (e) {
      mobToast('Erro: ' + (e.message || 'falha ao salvar'));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Registrar andamento'; }
    }
  };

  window._demCarregarAndamentos = _demCarregarAndamentos;

  async function _demInserirAndamento(demId, texto, statusDemanda, automatico) {
    const sb    = getSupabase();
    const nomeU = window.MOB_USER?.nome || '';
    const { error } = await sb.from('demanda_andamentos').insert({
      demanda_id:     demId,
      usuario_nome:   nomeU,
      texto,
      status_demanda: statusDemanda ? _toDb(statusDemanda) : null,
      automatico:     !!automatico,
    });
    if (error) throw error;
  }

  /* ══════════════════════════════════════════════════
     NOVA DEMANDA
  ══════════════════════════════════════════════════ */
  function renderNovaDemanda(el) {
    el.innerHTML = `
      <div style="padding:16px 16px 120px">

        <!-- Área -->
        <div class="mob-field">
          <label class="mob-label">ÁREA / DEPARTAMENTO <span style="color:var(--rose)">*</span></label>
          <select id="nd-area" class="mob-input" style="-webkit-appearance:auto;appearance:auto"
                  onchange="_ndAreaChange()">
            <option value="">Selecione a área</option>
            ${[...CATS].sort((a,b) => a.nome === 'Administração' ? -1 : b.nome === 'Administração' ? 1 : a.nome.localeCompare(b.nome,'pt-BR'))
              .map(c => `<option value="${_esc(c.nome)}">${_esc(c.icon + ' ' + c.nome)}</option>`).join('')}
          </select>
        </div>

        <!-- Tipo de solicitação -->
        <div class="mob-field" id="nd-wrap-tipo" style="display:none">
          <label class="mob-label">TIPO DE SOLICITAÇÃO <span style="color:var(--rose)">*</span></label>
          <select id="nd-tipo" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
            <option value="">Selecione</option>
          </select>
        </div>

        <!-- Título -->
        <div class="mob-field">
          <label class="mob-label">TÍTULO <span style="color:var(--rose)">*</span></label>
          <input id="nd-titulo" class="mob-input" type="text"
                 placeholder="Descreva brevemente sua solicitação" maxlength="200">
        </div>

        <!-- Descrição -->
        <div class="mob-field">
          <label class="mob-label">DESCRIÇÃO DETALHADA <span style="color:var(--rose)">*</span></label>
          <textarea id="nd-desc" class="mob-input" rows="4" style="resize:none"
                    placeholder="Forneça todos os detalhes: quando ocorreu, urgência, contexto…"></textarea>
        </div>

        <!-- Localização -->
        <div class="mob-field">
          <label class="mob-label">LOCALIZAÇÃO <span style="color:var(--tx3);font-weight:400">(opcional)</span></label>
          <input id="nd-local" class="mob-input" type="text"
                 placeholder="Ex: Hall da Secretaria, Templo Principal, Sala 3…">
        </div>

        <!-- Bloco Financeiro (condicional) -->
        <div id="nd-fin-bloco" style="display:none">
          <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;
                      letter-spacing:.06em;padding:16px 0 8px;border-top:1px solid var(--bd1);margin-top:8px">
            Dados Financeiros
          </div>

          <div class="mob-field">
            <label class="mob-label">TIPO</label>
            <select id="nd-fin-tipo" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
              <option value="Pagamento">Pagamento</option>
              <option value="Reembolso">Reembolso</option>
              <option value="Adiantamento">Adiantamento</option>
            </select>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="mob-field">
              <label class="mob-label">VALOR (R$) <span style="color:var(--rose)">*</span></label>
              <input id="nd-fin-valor" class="mob-input" type="text" inputmode="decimal" placeholder="0,00">
            </div>
            <div class="mob-field">
              <label class="mob-label">VENCIMENTO</label>
              <input id="nd-fin-venc" class="mob-input" type="date">
            </div>
          </div>

          <div class="mob-field">
            <label class="mob-label">BENEFICIÁRIO / FAVORECIDO <span style="color:var(--rose)">*</span></label>
            <input id="nd-fin-benefic" class="mob-input" type="text" placeholder="Nome ou razão social">
          </div>

          <div class="mob-field">
            <label class="mob-label">FORMA DE PAGAMENTO <span style="color:var(--rose)">*</span></label>
            <select id="nd-fin-forma" class="mob-input" style="-webkit-appearance:auto;appearance:auto"
                    onchange="_ndFormaChange()">
              <option value="">Selecione</option>
              ${['PIX','Boleto','Cartão de Crédito','Cartão de Débito','Dinheiro','Transferência Bancária','Débito em Conta','Cheque','Outro']
                .map(f => `<option value="${f}">${f}</option>`).join('')}
            </select>
          </div>

          <div class="mob-field" id="nd-wrap-pix" style="display:none">
            <label class="mob-label">CHAVE PIX <span style="color:var(--rose)">*</span></label>
            <input id="nd-fin-pix" class="mob-input" type="text"
                   placeholder="CPF, e-mail, telefone ou chave aleatória">
          </div>

          <div class="mob-field">
            <label class="mob-label">OBSERVAÇÕES FINANCEIRAS <span style="color:var(--tx3);font-weight:400">(opcional)</span></label>
            <textarea id="nd-fin-obs" class="mob-input" rows="2" style="resize:none"
                      placeholder="Informações adicionais para o pagamento"></textarea>
          </div>
        </div>

        <!-- Erro -->
        <div id="nd-err" style="font-size:13px;color:var(--rose);min-height:16px;margin-bottom:8px"></div>

        <!-- Botão -->
        <button id="nd-btn" class="mob-btn-primary" onclick="_ndEnviar()">
          Enviar Demanda
        </button>
      </div>
    `;
  }

  window._ndAreaChange = function () {
    const area   = document.getElementById('nd-area')?.value || '';
    const cat    = CATS.find(c => c.nome === area);
    const wrapTipo = document.getElementById('nd-wrap-tipo');
    const selTipo  = document.getElementById('nd-tipo');
    const finBloco = document.getElementById('nd-fin-bloco');

    // Subcategorias
    if (cat && selTipo) {
      const primeiro = cat.subcats[0];
      if (primeiro && typeof primeiro === 'object' && primeiro.grupo) {
        selTipo.innerHTML = `<option value="">Selecione</option>` +
          cat.subcats.map(g =>
            `<optgroup label="${_esc(g.grupo)}">${g.itens.map(s => `<option value="${_esc(s)}">${_esc(s)}</option>`).join('')}</optgroup>`
          ).join('');
      } else {
        selTipo.innerHTML = `<option value="">Selecione</option>` +
          cat.subcats.map(s => `<option value="${_esc(s)}">${_esc(s)}</option>`).join('');
      }
      if (wrapTipo) wrapTipo.style.display = '';
    } else {
      if (wrapTipo) wrapTipo.style.display = 'none';
    }

    // Bloco financeiro
    if (finBloco) finBloco.style.display = area === 'Financeiro' ? '' : 'none';
  };

  window._ndFormaChange = function () {
    const forma  = document.getElementById('nd-fin-forma')?.value || '';
    const wrapPix = document.getElementById('nd-wrap-pix');
    if (wrapPix) wrapPix.style.display = forma === 'PIX' ? '' : 'none';
  };

  window._ndEnviar = async function () {
    const area   = document.getElementById('nd-area')?.value   || '';
    const tipo   = document.getElementById('nd-tipo')?.value   || '';
    const titulo = document.getElementById('nd-titulo')?.value?.trim() || '';
    const desc   = document.getElementById('nd-desc')?.value?.trim()   || '';
    const local  = document.getElementById('nd-local')?.value?.trim()  || null;
    const errEl  = document.getElementById('nd-err');
    const btn    = document.getElementById('nd-btn');

    const err = (msg) => { if (errEl) errEl.textContent = msg; };
    err('');

    if (!area)   { err('Selecione a área de atendimento.');    return; }
    if (!tipo)   { err('Selecione o tipo de solicitação.');    return; }
    if (!titulo) { err('Informe o título da solicitação.');    return; }
    if (!desc)   { err('Informe a descrição detalhada.');      return; }

    // Validação financeira
    let fd = null;
    if (area === 'Financeiro') {
      const valor   = document.getElementById('nd-fin-valor')?.value?.trim()   || '';
      const benefic = document.getElementById('nd-fin-benefic')?.value?.trim() || '';
      const forma   = document.getElementById('nd-fin-forma')?.value           || '';
      const pix     = document.getElementById('nd-fin-pix')?.value?.trim()     || '';
      const venc    = document.getElementById('nd-fin-venc')?.value            || null;
      const finTipo = document.getElementById('nd-fin-tipo')?.value            || 'Pagamento';
      const finObs  = document.getElementById('nd-fin-obs')?.value?.trim()     || '';

      if (!valor)   { err('Informe o valor da solicitação financeira.');    return; }
      if (!benefic) { err('Informe o beneficiário / favorecido.');          return; }
      if (!forma)   { err('Selecione a forma de pagamento.');               return; }
      if (forma === 'PIX' && !pix) { err('Informe a chave PIX.');           return; }

      fd = {
        tipo_fin:      finTipo,
        valor:         parseFloat(valor.replace(',','.')),
        beneficiario:  benefic,
        forma_pagamento: forma,
        chave_pix:     pix || null,
        data_vencimento: venc || null,
        obs_financeiro: finObs || null,
      };
    }

    btn.disabled = true; btn.textContent = 'Enviando…';

    try {
      const nome  = window.MOB_USER?.nome || window.MOB_USER?.email || 'Usuário';
      const cat   = CATS.find(c => c.nome === area);
      const resp  = cat?.resp || 'Administração Geral';
      const hoje  = new Date().toISOString().split('T')[0];
      const newId = crypto.randomUUID();

      const SB_URL = apiBaseUrl().replace('/rest/v1', '').replace('/rest', '');
      const SB_KEY = apiHeaders()['apikey'] || apiHeaders()['Authorization']?.replace('Bearer ','') || '';

      const res = await fetch(`${SB_URL}/functions/v1/chamado-publico`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SB_KEY },
        body: JSON.stringify({
          id:              newId,
          area,
          subcategoria:    tipo,
          titulo,
          descricao:       desc,
          local,
          solicitante:     nome,
          solicitante_txt: nome,
          responsavel:     resp,
          responsavel_txt: resp,
          financial_data:  fd,
          data_abertura:   hoje,
          origem:          'mobile_interno',
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || e.message || `Erro ${res.status}`);
      }

      mobToast('Demanda enviada com sucesso');
      _cache = null;
      mobGo('demandas', { title: 'Demandas' });
    } catch (e) {
      err(e.message || 'Erro ao enviar. Tente novamente.');
      btn.disabled = false; btn.textContent = 'Enviar Demanda';
    }
  };

  /* ── Helpers ───────────────────────────────────────── */
  function _row(label, val) {
    if (!val) return '';
    return `
      <div class="mob-detail-row">
        <div class="mob-detail-row-key">${label}</div>
        <div class="mob-detail-row-val">${_esc(String(val))}</div>
      </div>
    `;
  }

  function _statusBadge(s) {
    const sc = STATUS_COR[s] || { bg:'var(--bg-hover)', cl:'var(--tx3)' };
    return `<span style="color:${sc.cl}">${_esc(s || '—')}</span>`;
  }

  function _statusBadgeEl(s) {
    const sc = STATUS_COR[s] || { bg:'var(--bg-hover)', cl:'var(--tx3)' };
    return `<span class="mob-badge" style="background:${sc.bg};color:${sc.cl}">${_esc(s || '—')}</span>`;
  }

  function _catEmoji(area) {
    const cat = CATS.find(c => c.nome === area);
    return cat ? cat.icon : '📋';
  }

  function _fmtTs(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' })
         + ' ' + d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
    );
  }

  function _fmtTexto(raw) {
    if (!raw) return '';
    return _esc(raw)
      // Newlines → <br>
      .replace(/\n/g, '<br>')
      // "——— Título ———" → section header com linha
      .replace(/—{2,}([^—<]{0,80})—{2,}/g, (_, titulo) => {
        const t = titulo.trim();
        if (t) {
          return `<div style="display:flex;align-items:center;gap:8px;margin:10px 0">` +
            `<div style="flex:1;height:1px;background:var(--bd2)"></div>` +
            `<span style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap">${t}</span>` +
            `<div style="flex:1;height:1px;background:var(--bd2)"></div>` +
          `</div>`;
        }
        return `<div style="height:1px;background:var(--bd2);margin:10px 0"></div>`;
      })
      // Divisores restantes (——— sem título)
      .replace(/—{2,}/g, `<div style="height:1px;background:var(--bd2);margin:10px 0"></div>`);
  }

})();
