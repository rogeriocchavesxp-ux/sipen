/* ═══════════════════════════════════════════════════════
   SIPEN — WhatsApp: Listas de Comunicação
   listas.js · v1.0
═══════════════════════════════════════════════════════ */

const WA_LISTAS = (function () {

  let _lista = null;   // lista aberta no painel de membros
  let _tab   = 'listas';

  /* ── Helpers ────────────────────────────────────────── */

  function _base() { return (SUPABASE_URL || '').trim().replace(/\/$/, ''); }

  function _hdr(json) {
    const token = typeof sipenToken === 'function' ? sipenToken() : (SUPABASE_ANON_KEY || '');
    const h = { 'apikey': SUPABASE_ANON_KEY || '', 'Authorization': `Bearer ${token}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  async function _get(path) {
    try {
      const r = await fetch(_base() + path, { headers: _hdr() });
      return r.ok ? await r.json() : [];
    } catch { return []; }
  }

  async function _post(path, body) {
    try {
      const r = await fetch(_base() + path, { method: 'POST', headers: _hdr(true), body: JSON.stringify(body) });
      return { ok: r.ok, data: r.ok ? await r.json() : await r.text() };
    } catch (e) { return { ok: false, data: e.message }; }
  }

  async function _patch(path, body) {
    try {
      const r = await fetch(_base() + path, { method: 'PATCH', headers: { ..._hdr(true), 'Prefer': 'return=representation' }, body: JSON.stringify(body) });
      return { ok: r.ok, data: r.ok ? await r.json() : await r.text() };
    } catch (e) { return { ok: false, data: e.message }; }
  }

  async function _delete(path) {
    try {
      const r = await fetch(_base() + path, { method: 'DELETE', headers: _hdr() });
      return { ok: r.ok };
    } catch (e) { return { ok: false }; }
  }

  function _esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _dt(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function _dtLocal(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function _tel(p) {
    return p?.whatsapp || p?.celular || p?.telefone || '';
  }

  /* ── Init ───────────────────────────────────────────── */

  async function init() {
    _tab = 'listas';
    const ct = document.getElementById('wa-listas-ct');
    if (!ct) return;
    ct.innerHTML = '<div style="color:var(--tx3);text-align:center;padding:40px;font-size:13px">Carregando...</div>';

    const [listas, envios, agendamentos] = await Promise.all([
      _get('/rest/v1/wa_listas?select=id,nome,descricao,icone,ativo&order=nome'),
      _get('/rest/v1/wa_envios?select=id,lista_nome,total,enviados,falhas,status,criado_em&order=criado_em.desc&limit=5'),
      _get('/rest/v1/wa_agendamentos?select=id,lista_nome,mensagem,agendado_para,status&status=eq.pendente&order=agendado_para&limit=5'),
    ]);

    const total     = listas.length;
    const ativas    = listas.filter(l => l.ativo).length;
    const pendAgend = agendamentos.length;
    const enviados  = envios.reduce((s, e) => s + (e.enviados || 0), 0);

    ct.innerHTML = `
      <div class="kpis c4" style="margin-bottom:16px">
        <div class="kpi">
          <div class="kpi-ico" style="background:rgba(37,211,102,0.12)">📋</div>
          <div class="kpi-body"><div class="kpi-lbl">Listas ativas</div><div class="kpi-val">${ativas}<span style="font-size:11px;color:var(--tx3)">/${total}</span></div></div>
        </div>
        <div class="kpi">
          <div class="kpi-ico" style="background:rgba(74,156,245,0.12)">📨</div>
          <div class="kpi-body"><div class="kpi-lbl">Mensagens enviadas</div><div class="kpi-val">${enviados}</div></div>
        </div>
        <div class="kpi">
          <div class="kpi-ico" style="background:rgba(208,144,64,0.12)">⏰</div>
          <div class="kpi-body"><div class="kpi-lbl">Agendamentos</div><div class="kpi-val">${pendAgend}</div></div>
        </div>
        <div class="kpi">
          <div class="kpi-ico" style="background:rgba(58,170,92,0.12)">✅</div>
          <div class="kpi-body"><div class="kpi-lbl">Envios recentes</div><div class="kpi-val">${envios.length}</div></div>
        </div>
      </div>

      <div class="tabs-bar" style="margin-bottom:16px">
        <button class="tbt pri" onclick="WA_LISTAS.setTab('listas')">Listas</button>
        <button class="tbt" onclick="WA_LISTAS.setTab('enviar')">Enviar Comunicado</button>
        <button class="tbt" onclick="WA_LISTAS.setTab('agendamentos')">Agendamentos</button>
        <button class="tbt" onclick="WA_LISTAS.setTab('historico')">Histórico</button>
      </div>

      <div id="wa-listas-inner"></div>`;

    _renderInner(document.getElementById('wa-listas-inner'), listas, envios, agendamentos);
  }

  async function setTab(t) {
    _tab = t;
    document.querySelectorAll('.tabs-bar .tbt').forEach(b => b.classList.remove('pri'));
    const idx = ['listas','enviar','agendamentos','historico'].indexOf(t);
    document.querySelectorAll('.tabs-bar .tbt')[idx]?.classList.add('pri');

    const inner = document.getElementById('wa-listas-inner');
    if (!inner) return;

    if (t === 'listas')       { const ls = await _get('/rest/v1/wa_listas?select=id,nome,descricao,icone,ativo&order=nome'); inner.innerHTML = _htmlListas(ls); }
    else if (t === 'enviar')  { const [ls, tpls] = await Promise.all([_get('/rest/v1/wa_listas?select=id,nome,icone&ativo=eq.true&order=nome'), _get('/rest/v1/whatsapp_templates?select=id,titulo,corpo&ativo=eq.true&order=titulo')]); inner.innerHTML = _htmlEnviar(ls, tpls); }
    else if (t === 'agendamentos') { const [ls, ag] = await Promise.all([_get('/rest/v1/wa_listas?select=id,nome,icone&ativo=eq.true&order=nome'), _get('/rest/v1/wa_agendamentos?select=*&order=agendado_para.desc&limit=50')]); inner.innerHTML = _htmlAgendamentos(ls, ag); }
    else if (t === 'historico') { const hist = await _get('/rest/v1/wa_envios?select=*&order=criado_em.desc&limit=50'); inner.innerHTML = _htmlHistorico(hist); }
  }

  function _renderInner(el, listas, envios, agendamentos) {
    if (_tab === 'listas')       el.innerHTML = _htmlListas(listas);
    else if (_tab === 'enviar')  setTab('enviar');
    else if (_tab === 'agendamentos') el.innerHTML = _htmlAgendamentos([], agendamentos);
    else if (_tab === 'historico')   el.innerHTML = _htmlHistorico(envios);
  }

  /* ── Tab: Listas ────────────────────────────────────── */

  function _htmlListas(listas) {
    const cards = listas.map(l => `
      <div class="card" style="position:relative;cursor:default">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
          <div style="width:38px;height:38px;border-radius:10px;background:rgba(37,211,102,0.12);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${_esc(l.icone||'📋')}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:var(--tx1)">${_esc(l.nome)}</div>
            <div style="font-size:11px;color:var(--tx3);margin-top:2px">${_esc(l.descricao||'')}</div>
          </div>
          <span style="font-size:10px;padding:2px 8px;border-radius:20px;background:${l.ativo?'rgba(58,170,92,0.12)':'rgba(100,100,100,0.1)'};color:${l.ativo?'var(--gr)':'var(--tx3)'}">
            ${l.ativo?'Ativa':'Pausada'}
          </span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="tbt" style="font-size:11px;padding:4px 10px" onclick="WA_LISTAS.abrirMembros('${_esc(l.id)}','${_esc(l.nome)}','${_esc(l.icone||'📋')}')">👥 Membros</button>
          <button class="tbt" style="font-size:11px;padding:4px 10px" onclick="WA_LISTAS.abrirEnvioRapido('${_esc(l.id)}','${_esc(l.nome)}')">📨 Enviar</button>
          <button class="tbt" style="font-size:11px;padding:4px 10px" onclick="WA_LISTAS.editarLista('${_esc(l.id)}','${_esc(l.nome)}','${_esc(l.descricao||'')}','${_esc(l.icone||'📋')}',${l.ativo})">✏ Editar</button>
        </div>
      </div>`).join('');

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:12px;color:var(--tx3)">${listas.length} lista(s) cadastrada(s)</div>
        <button class="tbt pri" style="font-size:12px" onclick="WA_LISTAS.novaLista()">+ Nova Lista</button>
      </div>
      ${listas.length
        ? `<div class="g3">${cards}</div>`
        : `<div class="card" style="text-align:center;padding:32px;color:var(--tx3)">Nenhuma lista cadastrada. Clique em <strong>+ Nova Lista</strong> para começar.</div>`
      }`;
  }

  /* ── Tab: Enviar ────────────────────────────────────── */

  function _htmlEnviar(listas, templates) {
    const optsListas = listas.map(l => `<option value="${_esc(l.id)}">${_esc(l.icone||'📋')} ${_esc(l.nome)}</option>`).join('');
    const optsTpls   = templates.map(t => `<option value="${_esc(t.id)}" data-corpo="${_esc(t.corpo||'')}">${_esc(t.titulo)}</option>`).join('');

    return `
      <div class="card">
        <div class="ctit" style="margin-bottom:16px">Enviar Comunicado</div>

        <div class="g2" style="margin-bottom:14px">
          <div>
            <label class="flb">Lista de destino *</label>
            <select class="fi" id="env-lista-id" onchange="WA_LISTAS.onListaChange()">
              <option value="">Selecione uma lista...</option>
              ${optsListas}
            </select>
          </div>
          <div>
            <label class="flb">Usar template</label>
            <select class="fi" id="env-template" onchange="WA_LISTAS.onTemplateChange()">
              <option value="">Escrever mensagem manualmente</option>
              ${optsTpls}
            </select>
          </div>
        </div>

        <div id="env-preview-membros" style="margin-bottom:14px;display:none">
          <div style="font-size:11px;color:var(--tx3);margin-bottom:6px">Destinatários da lista selecionada:</div>
          <div id="env-membros-chips" style="display:flex;flex-wrap:wrap;gap:4px"></div>
        </div>

        <div style="margin-bottom:14px">
          <label class="flb">Mensagem *</label>
          <textarea class="fi" id="env-mensagem" rows="5" placeholder="Digite a mensagem ou selecione um template acima...&#10;&#10;Use {{nome}} para personalizar com o nome do destinatário.&#10;Use {{data}} para inserir a data de hoje." style="resize:vertical;font-family:inherit"></textarea>
          <div style="font-size:10.5px;color:var(--tx3);margin-top:4px">Variáveis disponíveis: <code>{{nome}}</code>, <code>{{data}}</code></div>
        </div>

        <div id="env-progress" style="display:none;margin-bottom:14px">
          <div style="font-size:12px;color:var(--tx2);margin-bottom:6px">Enviando... <span id="env-prog-txt">0/0</span></div>
          <div style="background:var(--bd1);border-radius:4px;height:6px;overflow:hidden">
            <div id="env-prog-bar" style="height:100%;background:var(--gr);transition:width .3s;width:0%"></div>
          </div>
        </div>

        <div style="display:flex;gap:8px;align-items:center">
          <button class="tbt pri" onclick="WA_LISTAS.enviarAgora()" id="btn-enviar-agora">📨 Enviar Agora</button>
          <button class="tbt" onclick="WA_LISTAS.abrirModalAgendar()">⏰ Agendar</button>
          <span id="env-result" style="font-size:11.5px;color:var(--tx3)"></span>
        </div>
      </div>`;
  }

  async function onListaChange() {
    const listaId = document.getElementById('env-lista-id')?.value;
    const preview = document.getElementById('env-preview-membros');
    const chips   = document.getElementById('env-membros-chips');
    if (!listaId || !preview || !chips) return;

    preview.style.display = 'none';
    chips.innerHTML = '<span style="font-size:11px;color:var(--tx3)">Carregando...</span>';
    preview.style.display = 'block';

    const membros = await _get(`/rest/v1/wa_lista_membros?lista_id=eq.${listaId}&ativo=eq.true&select=pessoas(nome,whatsapp,celular,telefone)`);
    if (!membros.length) {
      chips.innerHTML = '<span style="font-size:11px;color:var(--gold)">⚠ Nenhum membro ativo nesta lista</span>';
      return;
    }
    chips.innerHTML = membros.map(m => {
      const p   = m.pessoas;
      const tel = _tel(p);
      const ok  = !!tel;
      return `<span style="font-size:10.5px;padding:2px 8px;border-radius:20px;background:${ok?'rgba(58,170,92,0.12)':'rgba(208,144,64,0.1)'};color:${ok?'var(--gr)':'var(--gold)'}">${_esc(p?.nome||'?')} ${ok?'':'⚠'}</span>`;
    }).join('');
  }

  function onTemplateChange() {
    const sel  = document.getElementById('env-template');
    const area = document.getElementById('env-mensagem');
    if (!sel || !area) return;
    const opt = sel.options[sel.selectedIndex];
    if (opt?.dataset?.corpo) area.value = opt.dataset.corpo.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
  }

  async function enviarAgora() {
    const listaId  = document.getElementById('env-lista-id')?.value;
    const mensagem = document.getElementById('env-mensagem')?.value?.trim();
    if (!listaId)  { alert('Selecione uma lista.'); return; }
    if (!mensagem) { alert('Escreva a mensagem.'); return; }

    const btn = document.getElementById('btn-enviar-agora');
    btn && (btn.disabled = true);

    const lista   = document.querySelector('#env-lista-id option:checked')?.textContent?.trim() || listaId;
    const membros = await _get(`/rest/v1/wa_lista_membros?lista_id=eq.${listaId}&ativo=eq.true&select=pessoas(id,nome,whatsapp,celular,telefone)`);
    const aptos   = membros.filter(m => _tel(m.pessoas));

    if (!aptos.length) {
      alert('Nenhum membro com número de WhatsApp nesta lista.');
      btn && (btn.disabled = false);
      return;
    }

    const envioRes = await _post('/rest/v1/wa_envios', {
      lista_id:   listaId,
      lista_nome: lista,
      mensagem,
      total:      aptos.length,
      status:     'enviando',
    });
    if (!envioRes.ok) { alert('Erro ao registrar envio.'); btn && (btn.disabled = false); return; }

    const envioId = Array.isArray(envioRes.data) ? envioRes.data[0]?.id : envioRes.data?.id;

    const prog    = document.getElementById('env-progress');
    const progTxt = document.getElementById('env-prog-txt');
    const progBar = document.getElementById('env-prog-bar');
    const result  = document.getElementById('env-result');
    if (prog) prog.style.display = 'block';

    let ok = 0, fail = 0;
    const hoje = new Date().toLocaleDateString('pt-BR');

    for (let i = 0; i < aptos.length; i++) {
      const p   = aptos[i].pessoas;
      const tel = _tel(p);
      const msg = WA.renderTemplate(mensagem, { nome: p.nome || '', data: hoje });

      if (progTxt) progTxt.textContent = `${i+1}/${aptos.length}`;
      if (progBar) progBar.style.width = `${Math.round((i+1)/aptos.length*100)}%`;

      const r = await WA.send({ para: tel, nome: p.nome, mensagem: msg, modulo: 'LISTAS', referenciaId: envioId });

      const dest = {
        envio_id:  envioId,
        pessoa_id: p.id,
        nome:      p.nome,
        numero:    tel,
        status:    r.ok ? 'enviado' : 'erro',
        erro_msg:  r.ok ? null : (r.error || r.status),
        enviado_em: new Date().toISOString(),
      };
      await _post('/rest/v1/wa_envio_destinatarios', dest);

      r.ok ? ok++ : fail++;
      await new Promise(res => setTimeout(res, 350));
    }

    await _patch(`/rest/v1/wa_envios?id=eq.${envioId}`, {
      enviados: ok, falhas: fail, status: 'concluido', concluido_em: new Date().toISOString()
    });

    if (prog)    prog.style.display = 'none';
    if (result)  result.textContent = `✅ ${ok} enviado(s)${fail ? ` · ⚠ ${fail} falha(s)` : ''}`;
    btn && (btn.disabled = false);
  }

  /* ── Tab: Agendamentos ──────────────────────────────── */

  function _htmlAgendamentos(listas, agendamentos) {
    const optsListas = listas.map(l => `<option value="${_esc(l.id)}">${_esc(l.icone||'📋')} ${_esc(l.nome)}</option>`).join('');

    const SC = { pendente: 'var(--gold)', enviado: 'var(--gr)', cancelado: 'var(--tx3)' };
    const linhas = agendamentos.map(a => `
      <tr style="border-bottom:1px solid var(--bd2)">
        <td style="padding:7px 10px;font-size:11.5px;font-weight:600;color:var(--tx1)">${_esc(a.lista_nome||'—')}</td>
        <td style="padding:7px 10px;font-size:11px;color:var(--tx2);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_esc(a.mensagem)}">${_esc((a.mensagem||'').slice(0,80))}</td>
        <td style="padding:7px 10px;font-size:11px;color:var(--tx3);white-space:nowrap">${_dt(a.agendado_para)}</td>
        <td style="padding:7px 10px;text-align:center">
          <span style="font-size:10.5px;font-weight:700;color:${SC[a.status]||'var(--tx3)'}">${a.status||'—'}</span>
        </td>
        <td style="padding:7px 10px;text-align:right">
          ${a.status==='pendente'?`<span style="font-size:11px;color:var(--rose);cursor:pointer" onclick="WA_LISTAS.cancelarAgendamento('${_esc(a.id)}')">Cancelar</span>`:''}
        </td>
      </tr>`).join('');

    return `
      <div class="card" style="margin-bottom:16px">
        <div class="ctit" style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <span>Agendamentos</span>
          <span class="cact" onclick="WA_LISTAS.abrirModalAgendar()">+ Novo</span>
          <span class="cact" onclick="WA_LISTAS.setTab('agendamentos')">↻</span>
        </div>
        ${agendamentos.length ? `
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="border-bottom:2px solid var(--bd2)">
                <th style="text-align:left;padding:6px 10px;color:var(--tx3);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em">Lista</th>
                <th style="text-align:left;padding:6px 10px;color:var(--tx3);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em">Mensagem</th>
                <th style="text-align:left;padding:6px 10px;color:var(--tx3);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">Agendado para</th>
                <th style="text-align:center;padding:6px 10px;color:var(--tx3);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>` : `<div style="color:var(--tx3);font-size:12px;text-align:center;padding:24px 0">Nenhum agendamento pendente.</div>`}
      </div>`;
  }

  /* ── Tab: Histórico ─────────────────────────────────── */

  function _htmlHistorico(envios) {
    const SC = { concluido: 'var(--gr)', enviando: 'var(--sky)', pendente: 'var(--gold)', erro: 'var(--rose)' };

    const linhas = envios.map(e => `
      <tr style="border-bottom:1px solid var(--bd2)">
        <td style="padding:7px 10px;font-size:11px;color:var(--tx3);white-space:nowrap">${_dt(e.criado_em)}</td>
        <td style="padding:7px 10px;font-size:11.5px;font-weight:600;color:var(--tx1)">${_esc(e.lista_nome||'—')}</td>
        <td style="padding:7px 10px;font-size:11px;color:var(--tx2);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_esc(e.mensagem)}">${_esc((e.mensagem||'').slice(0,60))}</td>
        <td style="padding:7px 10px;text-align:center;font-size:11px">
          <span style="color:var(--gr)">${e.enviados||0}</span>/<span style="color:var(--tx3)">${e.total||0}</span>
          ${e.falhas?`<span style="color:var(--rose);margin-left:4px">⚠${e.falhas}</span>`:''}
        </td>
        <td style="padding:7px 10px;text-align:center">
          <span style="font-size:10.5px;font-weight:700;color:${SC[e.status]||'var(--tx3)'}">${e.status||'—'}</span>
        </td>
        <td style="padding:7px 10px;text-align:right">
          <span style="font-size:11px;color:var(--sky);cursor:pointer" onclick="WA_LISTAS.verDestinatarios('${_esc(e.id)}','${_esc(e.lista_nome||'')}')">Ver</span>
        </td>
      </tr>`).join('');

    return `
      <div class="card">
        <div class="ctit" style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <span>Histórico de Envios</span>
          <span class="cact" onclick="WA_LISTAS.setTab('historico')">↻</span>
        </div>
        ${envios.length ? `
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="border-bottom:2px solid var(--bd2)">
                <th style="text-align:left;padding:6px 10px;color:var(--tx3);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">Data/Hora</th>
                <th style="text-align:left;padding:6px 10px;color:var(--tx3);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em">Lista</th>
                <th style="text-align:left;padding:6px 10px;color:var(--tx3);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em">Mensagem</th>
                <th style="text-align:center;padding:6px 10px;color:var(--tx3);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em">Env/Total</th>
                <th style="text-align:center;padding:6px 10px;color:var(--tx3);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>` : `<div style="color:var(--tx3);font-size:12px;text-align:center;padding:24px 0">Nenhum envio registrado ainda.</div>`}
      </div>`;
  }

  /* ── Modal: Destinatários de um envio ───────────────── */

  async function verDestinatarios(envioId, listaNome) {
    const dest = await _get(`/rest/v1/wa_envio_destinatarios?envio_id=eq.${envioId}&select=nome,numero,status,erro_msg,enviado_em&order=nome`);
    const SC = { enviado: 'var(--gr)', erro: 'var(--rose)', pendente: 'var(--gold)' };

    const linhas = dest.map(d => `
      <tr style="border-bottom:1px solid var(--bd2)">
        <td style="padding:6px 10px;font-size:11.5px;font-weight:600">${_esc(d.nome||'—')}</td>
        <td style="padding:6px 10px;font-size:11px;color:var(--tx3);font-family:var(--mono)">${_esc(d.numero||'—')}</td>
        <td style="padding:6px 10px;text-align:center">
          <span style="font-size:10.5px;font-weight:700;color:${SC[d.status]||'var(--tx3)'}">${d.status||'—'}</span>
        </td>
        <td style="padding:6px 10px;font-size:10.5px;color:var(--rose)">${_esc(d.erro_msg||'')}</td>
      </tr>`).join('');

    const html = `
      <div style="margin-bottom:14px;font-size:12px;color:var(--tx3)">
        ${dest.filter(d=>d.status==='enviado').length} enviado(s) · ${dest.filter(d=>d.status==='erro').length} falha(s) · ${dest.filter(d=>d.status==='pendente').length} pendente(s)
      </div>
      <div style="overflow-y:auto;max-height:350px">
        <table style="width:100%;border-collapse:collapse;font-size:11.5px">
          <thead><tr style="border-bottom:2px solid var(--bd2)">
            <th style="text-align:left;padding:5px 10px;color:var(--tx3);font-size:9px;text-transform:uppercase">Nome</th>
            <th style="text-align:left;padding:5px 10px;color:var(--tx3);font-size:9px;text-transform:uppercase">Número</th>
            <th style="text-align:center;padding:5px 10px;color:var(--tx3);font-size:9px;text-transform:uppercase">Status</th>
            <th style="text-align:left;padding:5px 10px;color:var(--tx3);font-size:9px;text-transform:uppercase">Erro</th>
          </tr></thead>
          <tbody>${linhas||'<tr><td colspan="4" style="padding:16px;text-align:center;color:var(--tx3)">Sem dados</td></tr>'}</tbody>
        </table>
      </div>`;

    _abrirModal(`Destinatários — ${listaNome}`, html);
  }

  /* ── Modal: Gerenciar Membros ───────────────────────── */

  async function abrirMembros(listaId, nome, icone) {
    _lista = { id: listaId, nome, icone };
    const membros = await _get(`/rest/v1/wa_lista_membros?lista_id=eq.${listaId}&ativo=eq.true&select=id,pessoas(id,nome,whatsapp,celular,telefone)&order=pessoas(nome)`);

    const linhas = membros.map(m => {
      const p   = m.pessoas;
      const tel = _tel(p);
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd2)">
          <div style="width:30px;height:30px;border-radius:50%;background:var(--bg1);border:1px solid var(--bd2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--tx2);flex-shrink:0">${(p?.nome||'?')[0].toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--tx1)">${_esc(p?.nome||'—')}</div>
            <div style="font-size:10.5px;color:${tel?'var(--tx3)':'var(--gold)'}">${tel?_esc(tel):'⚠ Sem número'}</div>
          </div>
          <span style="font-size:11px;color:var(--rose);cursor:pointer" onclick="WA_LISTAS.removerMembro('${_esc(m.id)}','${_esc(listaId)}','${_esc(nome)}','${_esc(icone)}')">✕</span>
        </div>`;
    }).join('');

    const html = `
      <div style="margin-bottom:12px;display:flex;align-items:center;gap:8px">
        <input class="fi" id="busca-pessoa-input" placeholder="Buscar pessoa pelo nome..." oninput="WA_LISTAS.buscarPessoa('${_esc(listaId)}')" style="flex:1">
      </div>
      <div id="busca-pessoa-result" style="margin-bottom:14px;display:flex;flex-direction:column;gap:4px"></div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:8px">${membros.length} membro(s) nesta lista</div>
      <div style="overflow-y:auto;max-height:280px">${linhas||'<div style="padding:16px;text-align:center;color:var(--tx3);font-size:12px">Nenhum membro ainda</div>'}</div>`;

    _abrirModal(`${icone} ${nome} — Membros`, html);
  }

  let _buscarTimer = null;
  async function buscarPessoa(listaId) {
    clearTimeout(_buscarTimer);
    _buscarTimer = setTimeout(async () => {
      const q   = document.getElementById('busca-pessoa-input')?.value?.trim();
      const res = document.getElementById('busca-pessoa-result');
      if (!res) return;
      if (!q || q.length < 2) { res.innerHTML = ''; return; }

      const pessoas = await _get(`/rest/v1/pessoas?nome=ilike.*${encodeURIComponent(q)}*&select=id,nome,whatsapp,celular,telefone&order=nome&limit=8`);
      res.innerHTML = pessoas.map(p => {
        const tel = _tel(p);
        return `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:var(--bg2);border-radius:6px;cursor:pointer" onclick="WA_LISTAS.adicionarMembro('${_esc(listaId)}','${_esc(p.id)}','${_esc(p.nome)}')">
            <div style="width:26px;height:26px;border-radius:50%;background:var(--bg1);border:1px solid var(--bd2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--tx2);flex-shrink:0">${(p.nome||'?')[0].toUpperCase()}</div>
            <div style="flex:1"><div style="font-size:12px;font-weight:600">${_esc(p.nome)}</div><div style="font-size:10px;color:${tel?'var(--tx3)':'var(--gold)'}">${tel?_esc(tel):'Sem número'}</div></div>
            <span style="font-size:11px;color:var(--gr)">+ Adicionar</span>
          </div>`;
      }).join('') || '<div style="font-size:11px;color:var(--tx3);padding:6px">Nenhuma pessoa encontrada</div>';
    }, 280);
  }

  async function adicionarMembro(listaId, pessoaId, nome) {
    const r = await _post('/rest/v1/wa_lista_membros', { lista_id: listaId, pessoa_id: pessoaId, ativo: true });
    if (!r.ok && !String(r.data).includes('unique')) { alert('Erro ao adicionar.'); return; }
    const lista = _lista;
    fecharModal();
    await abrirMembros(lista.id, lista.nome, lista.icone);
  }

  async function removerMembro(membroId, listaId, nome, icone) {
    if (!confirm('Remover este membro da lista?')) return;
    await _delete(`/rest/v1/wa_lista_membros?id=eq.${membroId}`);
    fecharModal();
    await abrirMembros(listaId, nome, icone);
  }

  /* ── Modal: Envio Rápido por lista ─────────────────── */

  async function abrirEnvioRapido(listaId, nome) {
    const tpls = await _get('/rest/v1/whatsapp_templates?select=id,titulo,corpo&ativo=eq.true&order=titulo');
    const opts = tpls.map(t => `<option value="${_esc(t.id)}" data-corpo="${_esc(t.corpo||'')}">${_esc(t.titulo)}</option>`).join('');

    const html = `
      <div style="margin-bottom:12px">
        <label class="flb">Template (opcional)</label>
        <select class="fi" id="er-template" onchange="WA_LISTAS.erTemplate()">
          <option value="">Escrever manualmente</option>${opts}
        </select>
      </div>
      <div>
        <label class="flb">Mensagem *</label>
        <textarea class="fi" id="er-mensagem" rows="5" placeholder="Digite a mensagem..." style="resize:vertical"></textarea>
        <div style="font-size:10.5px;color:var(--tx3);margin-top:4px">Variáveis: <code>{{nome}}</code>, <code>{{data}}</code></div>
      </div>
      <div id="er-progress" style="display:none;margin-top:12px">
        <div style="font-size:12px;color:var(--tx2);margin-bottom:6px">Enviando... <span id="er-prog-txt">0/0</span></div>
        <div style="background:var(--bd1);border-radius:4px;height:6px;overflow:hidden">
          <div id="er-prog-bar" style="height:100%;background:var(--gr);transition:width .3s;width:0%"></div>
        </div>
      </div>
      <div id="er-result" style="font-size:11.5px;color:var(--tx3);margin-top:10px"></div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="tbt pri" onclick="WA_LISTAS.erEnviar('${_esc(listaId)}','${_esc(nome)}')">📨 Enviar</button>
        <button class="tbt" onclick="WA_LISTAS.fecharModal()">Cancelar</button>
      </div>`;

    _abrirModal(`📨 Enviar para: ${nome}`, html);
  }

  function erTemplate() {
    const sel  = document.getElementById('er-template');
    const area = document.getElementById('er-mensagem');
    if (!sel || !area) return;
    const opt = sel.options[sel.selectedIndex];
    if (opt?.dataset?.corpo) area.value = opt.dataset.corpo.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
  }

  async function erEnviar(listaId, listaNome) {
    const mensagem = document.getElementById('er-mensagem')?.value?.trim();
    if (!mensagem) { alert('Escreva a mensagem.'); return; }

    const membros = await _get(`/rest/v1/wa_lista_membros?lista_id=eq.${listaId}&ativo=eq.true&select=pessoas(id,nome,whatsapp,celular,telefone)`);
    const aptos   = membros.filter(m => _tel(m.pessoas));
    if (!aptos.length) { alert('Nenhum membro com número de WhatsApp nesta lista.'); return; }

    const envioRes = await _post('/rest/v1/wa_envios', { lista_id: listaId, lista_nome: listaNome, mensagem, total: aptos.length, status: 'enviando' });
    const envioId  = Array.isArray(envioRes.data) ? envioRes.data[0]?.id : envioRes.data?.id;

    const prog = document.getElementById('er-progress');
    const txt  = document.getElementById('er-prog-txt');
    const bar  = document.getElementById('er-prog-bar');
    const res  = document.getElementById('er-result');
    if (prog) prog.style.display = 'block';

    let ok = 0, fail = 0;
    const hoje = new Date().toLocaleDateString('pt-BR');

    for (let i = 0; i < aptos.length; i++) {
      const p   = aptos[i].pessoas;
      const tel = _tel(p);
      const msg = WA.renderTemplate(mensagem, { nome: p.nome||'', data: hoje });

      if (txt) txt.textContent = `${i+1}/${aptos.length}`;
      if (bar) bar.style.width = `${Math.round((i+1)/aptos.length*100)}%`;

      const r = await WA.send({ para: tel, nome: p.nome, mensagem: msg, modulo: 'LISTAS', referenciaId: envioId });
      await _post('/rest/v1/wa_envio_destinatarios', { envio_id: envioId, pessoa_id: p.id, nome: p.nome, numero: tel, status: r.ok?'enviado':'erro', erro_msg: r.ok?null:(r.error||r.status), enviado_em: new Date().toISOString() });
      r.ok ? ok++ : fail++;
      await new Promise(rs => setTimeout(rs, 350));
    }

    await _patch(`/rest/v1/wa_envios?id=eq.${envioId}`, { enviados: ok, falhas: fail, status: 'concluido', concluido_em: new Date().toISOString() });
    if (prog) prog.style.display = 'none';
    if (res)  res.textContent = `✅ ${ok} enviado(s)${fail?` · ⚠ ${fail} falha(s)`:''}`;
  }

  /* ── Modal: Nova / Editar Lista ─────────────────────── */

  function novaLista() { _abrirFormLista(); }

  function editarLista(id, nome, descricao, icone, ativo) {
    _abrirFormLista({ id, nome, descricao, icone, ativo });
  }

  function _abrirFormLista(d) {
    const edit = !!d?.id;
    const html = `
      <div style="display:flex;flex-direction:column;gap:12px">
        <div>
          <label class="flb">Nome da lista *</label>
          <input class="fi" id="fl-nome" value="${_esc(d?.nome||'')}" placeholder="Ex: Líderes, Conselho, Voluntários...">
        </div>
        <div>
          <label class="flb">Descrição</label>
          <input class="fi" id="fl-desc" value="${_esc(d?.descricao||'')}" placeholder="Breve descrição do propósito desta lista">
        </div>
        <div class="g2">
          <div>
            <label class="flb">Ícone (emoji)</label>
            <input class="fi" id="fl-icone" value="${_esc(d?.icone||'📋')}" maxlength="4" style="font-size:20px;text-align:center">
          </div>
          ${edit ? `
          <div>
            <label class="flb">Status</label>
            <select class="fi" id="fl-ativo">
              <option value="true"  ${d.ativo  ?'selected':''}>Ativa</option>
              <option value="false" ${!d.ativo ?'selected':''}>Pausada</option>
            </select>
          </div>` : '<div></div>'}
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="tbt pri" onclick="WA_LISTAS.salvarLista(${edit?`'${_esc(d.id)}'`:'null'})">💾 Salvar</button>
        <button class="tbt" onclick="WA_LISTAS.fecharModal()">Cancelar</button>
      </div>`;

    _abrirModal(edit ? `Editar Lista` : 'Nova Lista de Comunicação', html);
  }

  async function salvarLista(id) {
    const nome    = document.getElementById('fl-nome')?.value?.trim();
    const descricao = document.getElementById('fl-desc')?.value?.trim();
    const icone   = document.getElementById('fl-icone')?.value?.trim() || '📋';
    const ativo   = document.getElementById('fl-ativo')?.value !== 'false';

    if (!nome) { alert('Informe o nome da lista.'); return; }

    if (id) {
      await _patch(`/rest/v1/wa_listas?id=eq.${id}`, { nome, descricao, icone, ativo, atualizado_em: new Date().toISOString() });
    } else {
      await _post('/rest/v1/wa_listas', { nome, descricao, icone, ativo });
    }

    fecharModal();
    await setTab('listas');
  }

  /* ── Modal: Agendar Envio ───────────────────────────── */

  async function abrirModalAgendar() {
    const listas = await _get('/rest/v1/wa_listas?select=id,nome,icone&ativo=eq.true&order=nome');
    const opts   = listas.map(l => `<option value="${_esc(l.id)}" data-nome="${_esc(l.nome)}">${_esc(l.icone||'📋')} ${_esc(l.nome)}</option>`).join('');

    const agora   = new Date();
    agora.setMinutes(agora.getMinutes() + 60);
    const minDt   = _dtLocal(agora.toISOString());

    const html = `
      <div style="display:flex;flex-direction:column;gap:12px">
        <div>
          <label class="flb">Lista de destino *</label>
          <select class="fi" id="ag-lista"><option value="">Selecione...</option>${opts}</select>
        </div>
        <div>
          <label class="flb">Mensagem *</label>
          <textarea class="fi" id="ag-mensagem" rows="4" placeholder="Mensagem a enviar..." style="resize:vertical"></textarea>
        </div>
        <div>
          <label class="flb">Agendar para *</label>
          <input class="fi" type="datetime-local" id="ag-data" value="${minDt}" min="${minDt}">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="tbt pri" onclick="WA_LISTAS.salvarAgendamento()">⏰ Agendar</button>
        <button class="tbt" onclick="WA_LISTAS.fecharModal()">Cancelar</button>
      </div>`;

    _abrirModal('Agendar Envio', html);
  }

  async function salvarAgendamento() {
    const listaEl  = document.getElementById('ag-lista');
    const listaId  = listaEl?.value;
    const listaNome = listaEl?.options[listaEl.selectedIndex]?.dataset?.nome || '';
    const mensagem = document.getElementById('ag-mensagem')?.value?.trim();
    const dtVal    = document.getElementById('ag-data')?.value;

    if (!listaId)  { alert('Selecione uma lista.'); return; }
    if (!mensagem) { alert('Escreva a mensagem.'); return; }
    if (!dtVal)    { alert('Defina a data/hora.'); return; }

    await _post('/rest/v1/wa_agendamentos', {
      lista_id:      listaId,
      lista_nome:    listaNome,
      mensagem,
      agendado_para: new Date(dtVal).toISOString(),
      status:        'pendente',
    });

    fecharModal();
    await setTab('agendamentos');
  }

  async function cancelarAgendamento(id) {
    if (!confirm('Cancelar este agendamento?')) return;
    await _patch(`/rest/v1/wa_agendamentos?id=eq.${id}`, { status: 'cancelado' });
    await setTab('agendamentos');
  }

  /* ── Modal genérico ─────────────────────────────────── */

  function _abrirModal(titulo, htmlBody) {
    let m = document.getElementById('wa-listas-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'wa-listas-modal';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
      m.innerHTML = `<div style="background:var(--bg1);border:1px solid var(--bd2);border-radius:12px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.4)">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--bd2)">
          <div id="walm-titulo" style="font-size:14px;font-weight:700;color:var(--tx1)"></div>
          <span style="font-size:18px;cursor:pointer;color:var(--tx3);line-height:1" onclick="WA_LISTAS.fecharModal()">✕</span>
        </div>
        <div id="walm-body" style="padding:20px"></div>
      </div>`;
      document.body.appendChild(m);
    }
    document.getElementById('walm-titulo').textContent = titulo;
    document.getElementById('walm-body').innerHTML = htmlBody;
    m.style.display = 'flex';
  }

  function fecharModal() {
    const m = document.getElementById('wa-listas-modal');
    if (m) m.style.display = 'none';
  }

  /* ── API pública ────────────────────────────────────── */
  return {
    init, setTab, novaLista, editarLista, salvarLista,
    abrirMembros, buscarPessoa, adicionarMembro, removerMembro,
    abrirEnvioRapido, erTemplate, erEnviar,
    onListaChange, onTemplateChange, enviarAgora,
    abrirModalAgendar, salvarAgendamento, cancelarAgendamento,
    verDestinatarios, fecharModal,
  };
})();

window.WA_LISTAS = WA_LISTAS;
