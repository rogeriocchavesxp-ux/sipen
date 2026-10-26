/* ════════════════════════════════════════════════════
   SIPEN Mobile — Rede de Cuidado
   mobile/rede.js · v1.2.1

   Páginas:
   - rede-mob  → minha rede + visão geral (admin/pastor)

   v1.2.0 — registro de contatos + relatório mensal
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('rede-mob', renderRedeMob);

  /* ── Permissão ────────────────────────────────── */
  let _perm = null;

  async function _carregarPerm() {
    if (_perm !== null) return _perm;
    _perm = { pessoaId: null, nome: '', podeVerGeral: false, podeGerirRede: false };

    const uid = window.MOB_USER?.id;
    if (!uid) return _perm;

    try {
      const pRows = await fetch(
        `${apiBaseUrl()}/rest/v1/pessoas?auth_user_id=eq.${encodeURIComponent(uid)}&select=id,nome&limit=1`,
        { headers: apiHeaders() }
      ).then(r => r.ok ? r.json() : []);

      if (!pRows?.[0]?.id) return _perm;
      _perm.pessoaId = pRows[0].id;
      _perm.nome     = pRows[0].nome || '';

      const nRows = await fetch(
        `${apiBaseUrl()}/rest/v1/nomeados?pessoa_id=eq.${encodeURIComponent(_perm.pessoaId)}&status=eq.ativo&deleted_at=is.null&select=funcao_lider,cargo&limit=10`,
        { headers: apiHeaders() }
      ).then(r => r.ok ? r.json() : []);

      const funcoes = nRows.map(n => (n.funcao_lider || n.cargo || '').toLowerCase()).join(' ');
      _perm.podeVerGeral  = /admin|pastor|pastoral|presbitero|presidente/.test(funcoes);
      _perm.podeGerirRede = _perm.podeVerGeral;
    } catch (_) {}

    return _perm;
  }

  /* ── Helpers ──────────────────────────────────── */
  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  }

  function _primeiroNome(nome) {
    return nome ? nome.split(' ')[0] : '—';
  }

  function _fmtFone(f) {
    if (!f) return null;
    return f.replace(/\D/g, '');
  }

  function _fmtDias(dataContato) {
    if (!dataContato) return null;
    const d    = new Date(dataContato + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((hoje - d) / 86400000);
    if (diff === 0)  return { txt: 'hoje',             cor: 'var(--gr)'    };
    if (diff === 1)  return { txt: 'ontem',            cor: 'var(--gr)'    };
    if (diff < 14)   return { txt: `há ${diff} dias`,  cor: 'var(--gr)'    };
    if (diff < 30)   return { txt: `há ${diff} dias`,  cor: 'var(--amber)' };
    return               { txt: `há ${diff} dias`,  cor: 'var(--rose)'  };
  }

  /* ── Botões de contato ────────────────────────── */
  function _btnContato(celular, telefone, nome) {
    const fone = _fmtFone(celular || telefone);
    if (!fone) return '';
    const wa = `https://wa.me/55${fone}?text=${encodeURIComponent('Olá ' + _primeiroNome(nome) + ', tudo bem?')}`;
    return `
      <div style="display:flex;gap:6px;margin-top:8px">
        <a href="${_esc(wa)}" target="_blank"
           style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:7px 0;background:#25d36618;border:1px solid #25d36640;border-radius:8px;color:#25d366;font-size:12px;font-weight:600;text-decoration:none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp
        </a>
        <a href="tel:${_esc(fone)}"
           style="display:flex;align-items:center;justify-content:center;gap:5px;padding:7px 12px;background:var(--bg-card);border:1px solid var(--bd2);border-radius:8px;color:var(--tx2);font-size:12px;font-weight:600;text-decoration:none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12.5 19.79 19.79 0 0 1 1.61 4a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Ligar
        </a>
      </div>`;
  }

  /* ── Sheet: adicionar membro ──────────────────── */
  let _addEl      = null;
  let _buscaTimer = null;

  function _abrirAddSheet(el) {
    _addEl = el;
    const sheet = document.createElement('div');
    sheet.id = 'rc-add-sheet';
    sheet.innerHTML = `
      <div class="mob-sheet-overlay" onclick="document.getElementById('rc-add-sheet')?.remove()"></div>
      <div class="mob-sheet-panel" style="max-height:85vh;display:flex;flex-direction:column">
        <div class="mob-sheet-drag-handle"></div>
        <div style="padding:0 16px 12px;border-bottom:1px solid var(--bd2)">
          <div style="font-size:15px;font-weight:700;color:var(--tx1);margin-bottom:12px">Adicionar à rede</div>
          <div style="position:relative">
            <input id="rc-busca-inp" type="search" autocomplete="off" placeholder="Digite o nome do membro…"
              style="width:100%;box-sizing:border-box;background:var(--bg-surface,var(--bg-card));border:1px solid var(--bd2);border-radius:10px;color:var(--tx1);font-size:14px;padding:10px 14px;outline:none;-webkit-appearance:none">
          </div>
          <div id="rc-add-err" style="display:none;margin-top:8px;font-size:12px;color:var(--rose)"></div>
        </div>
        <div id="rc-sugestoes" style="flex:1;overflow-y:auto;padding:8px 0">
          <div style="padding:20px 16px;text-align:center;font-size:13px;color:var(--tx3)">Digite ao menos 2 letras para buscar.</div>
        </div>
        <div class="mob-safe-bottom"></div>
      </div>`;
    document.body.appendChild(sheet);
    requestAnimationFrame(() => sheet.querySelector('.mob-sheet-panel').classList.add('open'));

    const inp = document.getElementById('rc-busca-inp');
    inp.focus();
    inp.addEventListener('input', () => {
      clearTimeout(_buscaTimer);
      const termo = inp.value.trim();
      if (termo.length < 2) {
        document.getElementById('rc-sugestoes').innerHTML =
          '<div style="padding:20px 16px;text-align:center;font-size:13px;color:var(--tx3)">Digite ao menos 2 letras para buscar.</div>';
        return;
      }
      _buscaTimer = setTimeout(() => _buscarSugestoes(termo), 280);
    });
  }

  async function _buscarSugestoes(termo) {
    const el = document.getElementById('rc-sugestoes');
    if (!el) return;
    el.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--tx3)">Buscando…</div>';
    try {
      const rows = await fetch(
        `${apiBaseUrl()}/rest/v1/pessoas?nome=ilike.*${encodeURIComponent(termo)}*&deleted_at=is.null&select=id,nome&order=nome.asc&limit=20`,
        { headers: apiHeaders() }
      ).then(r => r.ok ? r.json() : []);

      if (!rows.length) {
        el.innerHTML = '<div style="padding:20px 16px;text-align:center;font-size:13px;color:var(--tx3)">Nenhum resultado.</div>';
        return;
      }
      el.innerHTML = rows.map(p => `
        <div onclick="window._redeSelecionar('${_esc(p.id)}','${_esc(p.nome.replace(/'/g, '&#39;'))}')"
          style="padding:13px 16px;display:flex;align-items:center;gap:10px;cursor:pointer;border-bottom:1px solid var(--bd1)">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--rosebg,rgba(224,85,85,.1));display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--rose);flex-shrink:0">
            ${_esc(_primeiroNome(p.nome).charAt(0).toUpperCase())}
          </div>
          <div style="font-size:14px;color:var(--tx1)">${_esc(p.nome)}</div>
        </div>`).join('');
    } catch (e) {
      el.innerHTML = `<div style="padding:16px;font-size:12px;color:var(--rose)">Erro: ${_esc(e.message)}</div>`;
    }
  }

  window._redeSelecionar = async function (pessoaId, nome) {
    const errEl = document.getElementById('rc-add-err');
    const sugg  = document.getElementById('rc-sugestoes');
    if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

    const perm = await _carregarPerm();
    if (!perm.pessoaId) return;

    if (pessoaId === perm.pessoaId) {
      if (errEl) { errEl.textContent = 'Você não pode se adicionar à própria rede.'; errEl.style.display = 'block'; }
      return;
    }

    if (sugg) sugg.innerHTML = '<div style="padding:16px;text-align:center;font-size:13px;color:var(--tx3)">Salvando…</div>';

    try {
      const res = await fetch(`${apiBaseUrl()}/rest/v1/rpc/adicionar_membro_rede_cuidado`, {
        method: 'POST',
        headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ p_cuidador_id: perm.pessoaId, p_cuidado_id: pessoaId, p_nivel: 1 })
      }).then(r => r.json());

      if (res?.ok === false) {
        if (errEl) { errEl.textContent = res.erro || 'Erro ao adicionar.'; errEl.style.display = 'block'; }
        if (sugg) sugg.innerHTML = '';
        return;
      }

      document.getElementById('rc-add-sheet')?.remove();
      mobToast(`${_primeiroNome(nome)} adicionado(a) à rede`, 'success');
      if (_addEl) _renderMinhaRede(_addEl);
    } catch (e) {
      if (errEl) { errEl.textContent = e.message; errEl.style.display = 'block'; }
      if (sugg) sugg.innerHTML = '';
    }
  };

  /* ── Sheet: registrar contato ─────────────────── */
  let _contatoVinculoId = null;
  let _contatoEl        = null;
  let _contatoTipo      = 'ligacao';

  const _TIPOS = [
    { id: 'ligacao',  ico: '📞', lbl: 'Ligação'  },
    { id: 'whatsapp', ico: '💬', lbl: 'WhatsApp' },
    { id: 'visita',   ico: '🏠', lbl: 'Visita'   },
    { id: 'outro',    ico: '✍️', lbl: 'Outro'    },
  ];

  function _abrirContatoSheet(vinculoId, nome, el) {
    _contatoVinculoId = vinculoId;
    _contatoEl        = el;
    _contatoTipo      = 'ligacao';

    const sheet = document.createElement('div');
    sheet.id = 'rc-contato-sheet';
    sheet.innerHTML = `
      <div class="mob-sheet-overlay" onclick="document.getElementById('rc-contato-sheet')?.remove()"></div>
      <div class="mob-sheet-panel">
        <div class="mob-sheet-drag-handle"></div>
        <div style="padding:16px 16px 0">
          <div style="font-size:15px;font-weight:700;color:var(--tx1);margin-bottom:3px">Registrar contato</div>
          <div style="font-size:13px;color:var(--tx3);margin-bottom:20px">${_esc(nome)}</div>

          <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Tipo de contato</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px" id="rc-tipo-grid">
            ${_TIPOS.map(t => `
              <button data-tipo="${t.id}" onclick="window._redeContatoTipo('${t.id}')"
                style="display:flex;align-items:center;gap:8px;padding:11px 12px;border-radius:10px;cursor:pointer;transition:all .12s;font-size:13px;font-weight:600;background:${t.id === 'ligacao' ? 'var(--rosebg,rgba(224,85,85,.1))' : 'var(--bg-card)'};border:1.5px solid ${t.id === 'ligacao' ? 'var(--rose)' : 'var(--bd2)'};color:${t.id === 'ligacao' ? 'var(--rose)' : 'var(--tx2)'}">
                <span style="font-size:16px">${t.ico}</span>
                ${t.lbl}
              </button>`).join('')}
          </div>

          <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Observação <span style="font-weight:400;text-transform:none;letter-spacing:0">(opcional)</span></div>
          <textarea id="rc-contato-obs" rows="3"
            placeholder="Como foi o contato? Algum pedido de oração?"
            style="width:100%;box-sizing:border-box;background:var(--bg-surface,var(--bg-card));border:1px solid var(--bd2);border-radius:10px;color:var(--tx1);font-size:14px;padding:10px 14px;outline:none;resize:none;font-family:inherit;line-height:1.5"></textarea>

          <div id="rc-contato-err" style="display:none;margin-top:8px;font-size:12px;color:var(--rose)"></div>

          <button id="rc-contato-save-btn" onclick="window._redeSalvarContato()"
            style="width:100%;margin-top:14px;padding:13px;background:var(--rose);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:700;cursor:pointer">
            Salvar
          </button>
        </div>
        <div class="mob-safe-bottom" style="height:24px"></div>
      </div>`;

    document.body.appendChild(sheet);
    requestAnimationFrame(() => sheet.querySelector('.mob-sheet-panel').classList.add('open'));
  }

  window._redeContatoTipo = function (tipo) {
    _contatoTipo = tipo;
    document.querySelectorAll('#rc-tipo-grid [data-tipo]').forEach(btn => {
      const on = btn.dataset.tipo === tipo;
      btn.style.background = on ? 'var(--rosebg,rgba(224,85,85,.1))' : 'var(--bg-card)';
      btn.style.border     = on ? '1.5px solid var(--rose)' : '1.5px solid var(--bd2)';
      btn.style.color      = on ? 'var(--rose)' : 'var(--tx2)';
    });
  };

  window._redeSalvarContato = async function () {
    const errEl  = document.getElementById('rc-contato-err');
    const saveBtn = document.getElementById('rc-contato-save-btn');
    const obs    = (document.getElementById('rc-contato-obs')?.value || '').trim();

    if (errEl)  { errEl.style.display = 'none'; errEl.textContent = ''; }
    if (saveBtn) saveBtn.disabled = true;

    try {
      await fetch(`${apiBaseUrl()}/rest/v1/rpc/registrar_interacao_rede`, {
        method: 'POST',
        headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_vinculo_id: _contatoVinculoId,
          p_tipo:       _contatoTipo,
          p_observacao: obs || null,
        })
      }).then(async r => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      });

      document.getElementById('rc-contato-sheet')?.remove();
      mobToast('Contato registrado', 'success');
      if (_contatoEl) _renderMinhaRede(_contatoEl);
    } catch (e) {
      if (errEl)  { errEl.textContent = 'Erro ao salvar. Tente novamente.'; errEl.style.display = 'block'; }
      if (saveBtn) saveBtn.disabled = false;
    }
  };

  /* ── Minha Rede ───────────────────────────────── */
  async function _renderMinhaRede(el) {
    const perm = await _carregarPerm();
    if (!perm.pessoaId) {
      el.innerHTML = '<div class="mob-empty"><div class="mob-empty-text">Perfil não encontrado.</div></div>';
      return;
    }

    el.innerHTML = '<div class="mob-loading">Carregando…</div>';

    try {
      const vinculos = await fetch(
        `${apiBaseUrl()}/rest/v1/v_rede_cuidado?cuidador_id=eq.${encodeURIComponent(perm.pessoaId)}&ativo=eq.true&select=id,cuidado_id,cuidado_nome&limit=10`,
        { headers: apiHeaders() }
      ).then(r => r.ok ? r.json() : []);

      let pessoaMap   = {};
      let ultimoMap   = {};

      if (vinculos.length > 0) {
        const ids    = vinculos.map(v => v.cuidado_id).join(',');
        const vIds   = vinculos.map(v => v.id).join(',');

        const [contatos, ultimas] = await Promise.all([
          fetch(
            `${apiBaseUrl()}/rest/v1/pessoas?id=in.(${ids})&deleted_at=is.null&select=id,celular,telefone`,
            { headers: apiHeaders() }
          ).then(r => r.ok ? r.json() : []),
          fetch(
            `${apiBaseUrl()}/rest/v1/rede_interacoes?vinculo_id=in.(${vIds})&order=data_contato.desc&select=vinculo_id,data_contato,tipo&limit=100`,
            { headers: apiHeaders() }
          ).then(r => r.ok ? r.json() : []),
        ]);

        pessoaMap = Object.fromEntries(contatos.map(p => [p.id, p]));
        ultimas.forEach(i => {
          if (!ultimoMap[i.vinculo_id]) ultimoMap[i.vinculo_id] = i;
        });
      }

      const vagas       = 5 - vinculos.length;
      const podeAdicionar = vagas > 0;

      let html = `
        <div style="padding:0 16px 16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div>
              <div style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Sua rede</div>
              <div style="font-size:17px;font-weight:700;color:var(--tx1)">${_esc(perm.nome)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="text-align:right">
                <div style="font-size:26px;font-weight:800;color:var(--rose)">${vinculos.length}<span style="font-size:13px;color:var(--tx3);font-weight:400">/5</span></div>
                <div style="font-size:10px;color:var(--tx3)">${vagas > 0 ? vagas + ' vaga' + (vagas > 1 ? 's' : '') : 'Completa'}</div>
              </div>
              ${podeAdicionar ? `
              <button onclick="window._redeAbrirAdd()"
                style="width:36px;height:36px;border-radius:50%;background:var(--rose);border:none;color:#fff;font-size:22px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">+</button>
              ` : ''}
            </div>
          </div>`;

      if (vinculos.length === 0) {
        html += `<div class="mob-empty" style="padding:24px 0">
          <div class="mob-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--tx3)"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="mob-empty-text">Nenhuma pessoa vinculada ainda.</div>
          ${vagas === 0 ? '<div class="mob-empty-sub">Sua rede está completa (5/5).</div>' : ''}
        </div>`;
      } else {
        html += `<div style="display:flex;flex-direction:column;gap:10px">`;
        vinculos.forEach(v => {
          const p       = pessoaMap[v.cuidado_id] || {};
          const nome    = v.cuidado_nome || '—';
          const ultimo  = ultimoMap[v.id];
          const dias    = ultimo ? _fmtDias(ultimo.data_contato) : null;
          const tipoLbl = ultimo ? ({ ligacao: 'Ligação', whatsapp: 'WhatsApp', visita: 'Visita', outro: 'Contato' }[ultimo.tipo] || 'Contato') : null;

          html += `
            <div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;padding:14px 16px">
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--rosebg,rgba(224,85,85,.1));display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--rose);flex-shrink:0">
                  ${_esc(_primeiroNome(nome).charAt(0).toUpperCase())}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:14px;font-weight:600;color:var(--tx1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(nome)}</div>
                  ${dias
                    ? `<div style="font-size:11px;color:${dias.cor};margin-top:1px">${tipoLbl} · ${dias.txt}</div>`
                    : `<div style="font-size:11px;color:var(--tx3);margin-top:1px">Sem contato registrado</div>`
                  }
                </div>
              </div>
              ${_btnContato(p.celular, p.telefone, nome)}
              <button onclick="window._redeRegistrarContato('${_esc(v.id)}','${_esc(nome.replace(/'/g, "&#39;"))}')"
                style="width:100%;margin-top:8px;padding:8px 0;background:transparent;border:1px dashed var(--bd2);border-radius:8px;color:var(--tx3);font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12.5 19.79 19.79 0 0 1 1.61 4a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Registrar contato
              </button>
            </div>`;
        });
        html += `</div>`;
      }

      html += `</div>`;
      el.innerHTML = html;

      window._redeAbrirAdd = () => _abrirAddSheet(el);
      window._redeRegistrarContato = (vinculoId, nome) => _abrirContatoSheet(vinculoId, nome, el);
    } catch (e) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-text">Erro ao carregar: ${_esc(e.message)}</div></div>`;
    }
  }

  /* ── Visão Geral (admin/pastor) ───────────────── */
  async function _renderVisaoGeral(el) {
    el.innerHTML = '<div class="mob-loading">Carregando rede completa…</div>';

    try {
      const hoje30 = new Date();
      hoje30.setDate(hoje30.getDate() - 30);
      const limite = hoje30.toISOString().slice(0, 10);

      const [todos, interacoes30] = await Promise.all([
        fetch(
          `${apiBaseUrl()}/rest/v1/v_rede_cuidado?ativo=eq.true&order=cuidador_nome.asc,cuidado_nome.asc&limit=500`,
          { headers: apiHeaders() }
        ).then(r => r.ok ? r.json() : []),
        fetch(
          `${apiBaseUrl()}/rest/v1/rede_interacoes?data_contato=gte.${limite}&order=data_contato.desc&select=cuidador_id,cuidado_id,vinculo_id,tipo,data_contato&limit=1000`,
          { headers: apiHeaders() }
        ).then(r => r.ok ? r.json() : []),
      ]);

      const porCuidador = {};
      todos.forEach(v => {
        if (!porCuidador[v.cuidador_id]) {
          porCuidador[v.cuidador_id] = { nome: v.cuidador_nome, membros: [], membrosIds: new Set() };
        }
        porCuidador[v.cuidador_id].membros.push(v.cuidado_nome);
        porCuidador[v.cuidador_id].membrosIds.add(v.cuidado_id);
      });

      // Contatos únicos por cuidador nos últimos 30 dias
      const contatados30 = {};
      interacoes30.forEach(i => {
        if (!contatados30[i.cuidador_id]) contatados30[i.cuidador_id] = new Set();
        contatados30[i.cuidador_id].add(i.cuidado_id);
      });

      const cuidadosIds = [...new Set(todos.map(v => v.cuidado_id))];
      let semCuidador = 0;
      const semUrl = cuidadosIds.length > 0
        ? `${apiBaseUrl()}/rest/v1/membros?deleted_at=is.null&select=id&id=not.in.(${cuidadosIds.join(',')})&limit=1`
        : `${apiBaseUrl()}/rest/v1/membros?deleted_at=is.null&select=id&limit=1`;
      const semRes = await fetch(semUrl, { headers: { ...apiHeaders(), 'Prefer': 'count=exact' } });
      const cr = semRes.headers.get('content-range');
      semCuidador = cr ? parseInt(cr.split('/')[1]) || 0 : 0;

      const nCuidadores = Object.keys(porCuidador).length;
      let html = `<div style="padding:0 16px 24px">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px">
          ${_kpi(todos.length, 'Vínculos', 'var(--rose)')}
          ${_kpi(nCuidadores, 'Cuidadores', 'var(--gr)')}
          ${_kpi(semCuidador, 'Sem cuidador', semCuidador > 0 ? 'var(--amber)' : 'var(--tx3)')}
        </div>`;

      // Relatório 30 dias
      if (nCuidadores > 0) {
        html += `
          <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Contatos — últimos 30 dias</div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px">`;

        Object.entries(porCuidador)
          .sort(([,a],[,b]) => a.nome.localeCompare(b.nome))
          .forEach(([cuidadorId, g]) => {
            const total    = g.membros.length;
            const contats  = contatados30[cuidadorId]?.size || 0;
            const pct      = total > 0 ? contats / total : 0;
            const cor      = pct === 0 ? 'var(--rose)' : pct < 0.8 ? 'var(--amber)' : 'var(--gr)';
            const bg       = pct === 0 ? 'rgba(224,85,85,.08)' : pct < 0.8 ? 'rgba(255,159,10,.08)' : 'rgba(52,199,89,.08)';
            const bdCor    = pct === 0 ? 'rgba(224,85,85,.25)' : pct < 0.8 ? 'rgba(255,159,10,.25)' : 'rgba(52,199,89,.25)';
            html += `
              <div style="background:${bg};border:1px solid ${bdCor};border-radius:10px;padding:11px 14px;display:flex;align-items:center;justify-content:space-between">
                <div style="font-size:13px;font-weight:600;color:var(--tx1)">${_esc(g.nome)}</div>
                <div style="font-size:12px;font-weight:700;color:${cor}">${contats}/${total}</div>
              </div>`;
          });
        html += `</div>`;
      }

      // Lista por cuidador
      if (nCuidadores === 0) {
        html += `<div class="mob-empty"><div class="mob-empty-text">Nenhum vínculo cadastrado.</div></div>`;
      } else {
        html += `<div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Por cuidador</div>
                 <div style="display:flex;flex-direction:column;gap:8px">`;
        Object.values(porCuidador)
          .sort((a, b) => a.nome.localeCompare(b.nome))
          .forEach(g => {
            html += `
              <div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;padding:14px 16px">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                  <div style="font-size:13px;font-weight:600;color:var(--tx1)">${_esc(g.nome)}</div>
                  <span style="font-size:11px;background:var(--rosebg,rgba(224,85,85,.1));color:var(--rose);border-radius:10px;padding:2px 8px;font-weight:600">${g.membros.length}/5</span>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:5px">
                  ${g.membros.map(m => `<span style="font-size:11px;background:var(--bg3,rgba(0,0,0,.05));border-radius:6px;padding:3px 8px;color:var(--tx2)">${_esc(m)}</span>`).join('')}
                </div>
              </div>`;
          });
        html += `</div>`;
      }

      html += `</div>`;
      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-text">Erro ao carregar: ${_esc(e.message)}</div></div>`;
    }
  }

  function _kpi(val, lbl, cor) {
    return `<div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:12px;text-align:center">
      <div style="font-size:22px;font-weight:800;color:${cor};line-height:1">${val}</div>
      <div style="font-size:10px;color:var(--tx3);margin-top:3px">${lbl}</div>
    </div>`;
  }

  /* ── Página principal ─────────────────────────── */
  async function renderRedeMob(container, params) {
    const perm = await _carregarPerm();

    if (!perm.podeVerGeral) {
      container.innerHTML = `<div id="rc-minha"></div>`;
      await _renderMinhaRede(document.getElementById('rc-minha'));
      return;
    }

    let _aba = params?._aba || 'minha';

    const _btnAba = (id, lbl) => {
      const on = _aba === id;
      return `<button onclick="window._redeToggleAba('${id}')"
        style="flex:1;padding:9px 0;font-size:13px;font-weight:600;border:none;background:${on ? 'var(--rose)' : 'transparent'};color:${on ? '#fff' : 'var(--tx3)'};border-radius:8px;cursor:pointer;transition:all .15s">${lbl}</button>`;
    };

    container.innerHTML = `
      <div style="padding:12px 16px 8px">
        <div style="display:flex;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:3px;gap:3px">
          ${_btnAba('minha', 'Minha Rede')}
          ${_btnAba('geral', 'Visão Geral')}
        </div>
      </div>
      <div id="rc-conteudo" style="padding-top:4px"></div>`;

    window._redeToggleAba = function (aba) {
      _aba = aba;
      container.querySelectorAll('[onclick^="window._redeToggleAba"]').forEach(btn => {
        const on = btn.getAttribute('onclick').includes(`'${aba}'`);
        btn.style.background = on ? 'var(--rose)' : 'transparent';
        btn.style.color      = on ? '#fff'        : 'var(--tx3)';
      });
      const c = document.getElementById('rc-conteudo');
      if (aba === 'minha') _renderMinhaRede(c);
      else                  _renderVisaoGeral(c);
    };

    const conteudo = document.getElementById('rc-conteudo');
    if (_aba === 'minha') await _renderMinhaRede(conteudo);
    else                   await _renderVisaoGeral(conteudo);
  }

})();
