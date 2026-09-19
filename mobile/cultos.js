/* ════════════════════════════════════════════════════
   SIPEN Mobile — Módulo Cultos / Frequência
   mobile/cultos.js · v1.4.0
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('cultos-mob', renderCultos);

  const TIPOS = [
    'Culto Manhã', 'Culto Tarde', 'Culto Noite', 'Conexão Com Deus', 'Tarde da Esperança', 'S.O.S',
  ];

  let _congregacoes = [];   // lista de congregações do usuário (pode editar)
  let _cache        = null; // cache dos últimos registros

  /* ── Página principal ─────────────────────────────── */
  async function renderCultos(el) {
    _cache = null;
    el.innerHTML = `<div class="mob-loading-state">Carregando…</div>`;

    await _carregarCongsPermitidas();

    if (!_congregacoes.length) {
      el.innerHTML = `
        <div class="mob-empty">
          <div class="mob-empty-icon">⛪</div>
          <div class="mob-empty-text">Você não está vinculado a nenhuma congregação com permissão de registro.</div>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div style="padding-bottom:80px">
        <div id="cult-kpi" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:14px 16px 0"></div>
        <div id="cult-lista" class="mob-section">
          <div class="mob-card-list mob-loading-state">Carregando registros…</div>
        </div>
      </div>
      <!-- FAB -->
      <button onclick="_cultAbrirForm()"
        style="position:fixed;bottom:calc(var(--tab-h) + var(--safe-bottom) + 16px);right:18px;
               z-index:200;width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;
               background:var(--violet);color:#fff;font-size:22px;font-weight:300;
               display:flex;align-items:center;justify-content:center;
               box-shadow:0 4px 16px rgba(191,90,242,.45)">
        +
      </button>
    `;

    await _carregarLista();
  }

  async function _carregarLista() {
    const el = document.getElementById('cult-lista');
    if (!el) return;

    const ids = _congregacoes.map(c => c.id);
    const filter = ids.length === 1
      ? `cong_id=eq.${ids[0]}`
      : `cong_id=in.(${ids.join(',')})`;

    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/congregacao_cultos?${filter}&select=id,data,tipo,adultos,criancas,participantes,online,obs,cong_id&order=data.desc&limit=30`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) {
        el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">📋</div><div class="mob-empty-text">Nenhum culto registrado ainda.</div></div>`;
        return;
      }
      _cache = data;
      _renderLista(el, data);
      _renderKPIs(data);
    } catch (_) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">⚠️</div><div class="mob-empty-text">Erro ao carregar registros.</div></div>`;
    }
  }

  function _renderKPIs(data) {
    const kpiEl = document.getElementById('cult-kpi');
    if (!kpiEl || !data.length) return;

    const hoje  = new Date();
    const mesAt = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const doMes = data.filter(c => (c.data || '').startsWith(mesAt));

    const totalCultos = doMes.length;
    const totalPres   = doMes.reduce((s, c) => s + (c.participantes || ((c.adultos || 0) + (c.criancas || 0))), 0);
    const totalOnline = doMes.reduce((s, c) => s + (c.online || 0), 0);
    const media       = totalCultos ? Math.round(totalPres / totalCultos) : 0;

    const nomeMes = hoje.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const KPI = (val, lbl, cor = 'var(--violet)') => `
      <div style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:12px;
                  padding:12px 8px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:${cor};line-height:1">${val}</div>
        <div style="font-size:11px;color:var(--tx3);margin-top:3px">${lbl}</div>
      </div>
    `;

    kpiEl.innerHTML =
      KPI(totalCultos, `Cultos (${nomeMes})`) +
      KPI(media, 'Média presentes', 'var(--blue)') +
      KPI(totalOnline || totalPres, totalOnline ? 'Online' : 'Total presentes', totalOnline ? 'var(--amber)' : 'var(--gr)');
  }

  function _renderLista(el, data) {
    const mapCong = Object.fromEntries(_congregacoes.map(c => [c.id, c.nome]));
    el.innerHTML = `
      <div class="mob-card-list">
        ${data.map(cu => {
          const tot = cu.participantes || ((cu.adultos || 0) + (cu.criancas || 0));
          const onl = cu.online || 0;
          const dt  = cu.data ? new Date(cu.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'2-digit' }) : '—';
          const congNome = mapCong[cu.cong_id] || '—';
          return `
            <div class="mob-list-item">
              <div class="mob-list-ico" style="background:var(--violetbg);color:var(--violet)">⛪</div>
              <div class="mob-list-body">
                <div class="mob-list-title">${_esc(cu.tipo || 'Culto')}</div>
                <div class="mob-list-sub">${dt} · ${_esc(congNome)}${onl ? ` · ${onl} online` : ''}</div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
                <div style="font-size:18px;font-weight:700;color:var(--tx1)">${tot || '—'}</div>
                <button onclick="event.stopPropagation();_cultEditarRegistro('${_esc(String(cu.id))}')"
                  style="border:1px solid var(--bd2);background:transparent;color:var(--tx3);
                         border-radius:8px;padding:4px 8px;font-size:11px;cursor:pointer;
                         line-height:1.3;flex-shrink:0">
                  Editar
                </button>
              </div>
            </div>`;
        }).join('')}
      </div>
      <div style="padding:10px 0 6px;text-align:center;font-size:11px;color:var(--tx4)">${data.length} registro${data.length !== 1 ? 's' : ''}</div>
    `;
  }

  window._cultEditarRegistro = function (id) {
    const registro = (_cache || []).find(c => String(c.id) === String(id));
    if (!registro) { mobToast('Registro não encontrado'); return; }
    _cultAbrirForm(registro);
  };

  /* ── Carregar congregações com permissão ──────────── */
  async function _carregarCongsPermitidas() {
    const userId = window.MOB_USER?.id;
    if (!userId) return;
    try {
      // status=eq.ativa — congregacoes não tem deleted_at
      const rC = await fetch(
        `${apiBaseUrl()}/rest/v1/congregacoes?status=eq.ativa&select=id,nome&order=nome.asc`,
        { headers: apiHeaders() }
      );
      const todas = await rC.json();
      if (!Array.isArray(todas) || !todas.length) return;

      // Tenta obter congregacao_id da pessoa (requer migration pessoas-add-congregacao-id.sql)
      try {
        const rP = await fetch(
          `${apiBaseUrl()}/rest/v1/pessoas?auth_user_id=eq.${encodeURIComponent(userId)}&select=id,congregacao_id&limit=1`,
          { headers: apiHeaders() }
        );
        const [pessoa] = await rP.json();
        if (pessoa?.congregacao_id) {
          const filtrada = todas.filter(c => c.id === pessoa.congregacao_id);
          if (filtrada.length) { _congregacoes = filtrada; return; }
        }
      } catch (_) { /* coluna ainda não existe — fallback para todas */ }

      // Sem congregacao_id definido → acesso a todas (admin/pastor/gestor)
      _congregacoes = todas;
    } catch (_) { /* silencioso */ }
  }

  /* ── Formulário (bottom sheet) ────────────────────── */
  window._cultAbrirForm = function (registro) {
    const hoje = new Date().toISOString().split('T')[0];
    const congOpts = _congregacoes.map(c =>
      `<option value="${_esc(c.id)}"${registro?.cong_id === c.id ? ' selected' : ''}>${_esc(c.nome)}</option>`
    ).join('');

    _cultAbrirSheet(registro ? 'Editar Registro' : 'Registrar Culto', `
      ${_congregacoes.length > 1 ? `
      <div class="mob-field">
        <label class="mob-label">CONGREGAÇÃO</label>
        <select id="cult-f-cong" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
          ${congOpts}
        </select>
      </div>` : `<input type="hidden" id="cult-f-cong" value="${_esc(_congregacoes[0].id)}">`}

      <div class="mob-field">
        <label class="mob-label">TIPO DE CULTO <span style="color:var(--rose)">*</span></label>
        <select id="cult-f-tipo" class="mob-input" style="-webkit-appearance:auto;appearance:auto">
          ${TIPOS.map(t => `<option value="${_esc(t)}"${registro?.tipo === t ? ' selected' : ''}>${_esc(t)}</option>`).join('')}
        </select>
      </div>

      <div class="mob-field">
        <label class="mob-label">DATA <span style="color:var(--rose)">*</span></label>
        <input id="cult-f-data" class="mob-input" type="date" value="${_esc(registro?.data || hoje)}">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div class="mob-field">
          <label class="mob-label">ADULTOS</label>
          <input id="cult-f-adultos" class="mob-input" type="number" inputmode="numeric"
                 min="0" value="${registro?.adultos || ''}" placeholder="0">
        </div>
        <div class="mob-field">
          <label class="mob-label">CRIANÇAS</label>
          <input id="cult-f-criancas" class="mob-input" type="number" inputmode="numeric"
                 min="0" value="${registro?.criancas || ''}" placeholder="0">
        </div>
        <div class="mob-field">
          <label class="mob-label">ONLINE</label>
          <input id="cult-f-online" class="mob-input" type="number" inputmode="numeric"
                 min="0" value="${registro?.online || ''}" placeholder="0">
        </div>
      </div>

      <div class="mob-field">
        <label class="mob-label">OBSERVAÇÕES <span style="color:var(--tx3);font-weight:400">(opcional)</span></label>
        <textarea id="cult-f-obs" class="mob-input" rows="2" style="resize:none"
                  placeholder="Destaques, visitantes, eventos…">${_esc(registro?.obs || '')}</textarea>
      </div>

      <div id="cult-f-err" style="font-size:13px;color:var(--rose);min-height:16px"></div>
      <button id="cult-f-btn" class="mob-btn-primary" onclick="_cultSalvar(${registro ? `'${registro.id}'` : 'null'})">
        ${registro ? 'Atualizar' : 'Registrar'}
      </button>
    `);
  };

  window._cultSalvar = async function (id) {
    const congEl = document.getElementById('cult-f-cong');
    const congId = congEl?.value || _congregacoes[0]?.id;
    const tipo   = document.getElementById('cult-f-tipo')?.value   || '';
    const data   = document.getElementById('cult-f-data')?.value   || '';
    const adultos  = parseInt(document.getElementById('cult-f-adultos')?.value  || '0', 10);
    const criancas = parseInt(document.getElementById('cult-f-criancas')?.value || '0', 10);
    const online   = parseInt(document.getElementById('cult-f-online')?.value   || '0', 10);
    const obs    = document.getElementById('cult-f-obs')?.value?.trim() || null;
    const errEl  = document.getElementById('cult-f-err');
    const btn    = document.getElementById('cult-f-btn');

    const err = msg => { if (errEl) errEl.textContent = msg; };
    err('');

    if (!data) { err('Informe a data do culto.'); return; }
    if (!adultos && !criancas) { err('Informe pelo menos adultos ou crianças.'); return; }

    if (!congId) { err('Selecione uma congregação.'); return; }

    btn.disabled = true; btn.textContent = 'Salvando…';

    const _mostrarErro = (msg) => {
      if (btn) { btn.disabled = false; btn.textContent = id ? 'Atualizar' : 'Registrar'; }
      err(msg);
      try { mobToast(msg, 'error'); } catch (_) {}
      console.error('[cultos] erro ao salvar:', msg);
    };

    try {
      const adultosN  = isNaN(adultos)  ? 0 : adultos;
      const criancasN = isNaN(criancas) ? 0 : criancas;
      const onlineN   = isNaN(online)   ? 0 : online;

      const payload = {
        cong_id:       congId,
        tipo,
        data,
        adultos:       adultosN,
        criancas:      criancasN,
        participantes: adultosN + criancasN,
        online:        onlineN,
        obs,
      };

      const sb = getSupabase();
      let sbRes;
      if (id) {
        sbRes = await sb.from('congregacao_cultos').update(payload).eq('id', id);
      } else {
        sbRes = await sb.from('congregacao_cultos').insert(payload);
      }

      if (sbRes.error) {
        _mostrarErro(sbRes.error.message || JSON.stringify(sbRes.error));
        return;
      }

      _cultFecharSheet();
      mobToast(id ? 'Registro atualizado' : 'Culto registrado');
      _cache = null;
      await _carregarLista();
    } catch (e) {
      _mostrarErro(e.message || 'Erro ao salvar.');
    }
  };

  /* ── Bottom sheet genérico ────────────────────────── */
  function _cultAbrirSheet(titulo, html) {
    document.getElementById('cult-sheet')?.remove();
    const s = document.createElement('div');
    s.id = 'cult-sheet';
    s.style.cssText = 'position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;justify-content:flex-end';
    s.innerHTML = `
      <div onclick="_cultFecharSheet()" style="flex:1;background:rgba(0,0,0,.4)"></div>
      <div style="background:var(--bg-surface);border-radius:18px 18px 0 0;
                  padding:20px 16px;padding-bottom:calc(var(--safe-bottom) + 20px);
                  max-height:90vh;overflow-y:auto">
        <div style="font-size:16px;font-weight:700;color:var(--tx1);margin-bottom:16px;
                    text-align:center">${titulo}</div>
        ${html}
      </div>`;
    document.body.appendChild(s);
  }

  window._cultFecharSheet = function () {
    document.getElementById('cult-sheet')?.remove();
  };

  /* ── Helpers ──────────────────────────────────────── */
  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
    );
  }

})();
