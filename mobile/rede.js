/* ════════════════════════════════════════════════════
   SIPEN Mobile — Rede de Cuidado
   mobile/rede.js · v1.0.0

   Página:
   - rede-mob  → minha rede + visão geral (admin/pastor)
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('rede-mob', renderRedeMob);

  /* ── Permissão ────────────────────────────────── */
  let _perm = null;

  async function _carregarPerm() {
    if (_perm !== null) return _perm;
    _perm = { pessoaId: null, nome: '', podeVerGeral: false };

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
      _perm.podeVerGeral = /admin|pastor|pastoral|presbitero|presidente/.test(funcoes);
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
        `${apiBaseUrl()}/rest/v1/rede_cuidado?cuidador_id=eq.${encodeURIComponent(perm.pessoaId)}&ativo=eq.true&select=id,cuidado_id&limit=10`,
        { headers: apiHeaders() }
      ).then(r => r.ok ? r.json() : []);

      let pessoas = [];
      if (vinculos.length > 0) {
        const ids = vinculos.map(v => v.cuidado_id).join(',');
        pessoas = await fetch(
          `${apiBaseUrl()}/rest/v1/pessoas?id=in.(${ids})&deleted_at=is.null&select=id,nome,celular,telefone`,
          { headers: apiHeaders() }
        ).then(r => r.ok ? r.json() : []);
      }

      const pessoaMap = Object.fromEntries(pessoas.map(p => [p.id, p]));
      const vagas = 5 - vinculos.length;

      let html = `
        <div style="padding:0 16px 16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div>
              <div style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Sua rede</div>
              <div style="font-size:17px;font-weight:700;color:var(--tx1)">${_esc(perm.nome)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:26px;font-weight:800;color:var(--rose)">${vinculos.length}<span style="font-size:13px;color:var(--tx3);font-weight:400">/5</span></div>
              <div style="font-size:10px;color:var(--tx3)">${vagas > 0 ? vagas + ' vaga' + (vagas > 1 ? 's' : '') : 'Completa'}</div>
            </div>
          </div>`;

      if (vinculos.length === 0) {
        html += `<div class="mob-empty" style="padding:32px 0">
          <div class="mob-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--tx3)"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="mob-empty-text">Nenhuma pessoa vinculada ainda.</div>
          <div class="mob-empty-sub">Fale com o pastor ou administrador para configurar sua rede.</div>
        </div>`;
      } else {
        html += `<div style="display:flex;flex-direction:column;gap:10px">`;
        vinculos.forEach(v => {
          const p = pessoaMap[v.cuidado_id] || {};
          const nome = p.nome || '—';
          html += `
            <div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:12px;padding:14px 16px">
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--rosebg,rgba(224,85,85,.1));display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--rose);flex-shrink:0">
                  ${_esc(_primeiroNome(nome).charAt(0).toUpperCase())}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:14px;font-weight:600;color:var(--tx1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(nome)}</div>
                  ${p.celular || p.telefone ? `<div style="font-size:11px;color:var(--tx3);margin-top:1px">${_esc(p.celular || p.telefone)}</div>` : ''}
                </div>
              </div>
              ${_btnContato(p.celular, p.telefone, nome)}
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

  /* ── Visão Geral (admin/pastor) ───────────────── */
  async function _renderVisaoGeral(el) {
    el.innerHTML = '<div class="mob-loading">Carregando rede completa…</div>';

    try {
      const todos = await fetch(
        `${apiBaseUrl()}/rest/v1/v_rede_cuidado?ativo=eq.true&order=cuidador_nome.asc,cuidado_nome.asc&limit=500`,
        { headers: apiHeaders() }
      ).then(r => r.ok ? r.json() : []);

      // Agrupa por cuidador
      const porCuidador = {};
      todos.forEach(v => {
        if (!porCuidador[v.cuidador_id]) {
          porCuidador[v.cuidador_id] = { nome: v.cuidador_nome, membros: [] };
        }
        porCuidador[v.cuidador_id].membros.push(v.cuidado_nome);
      });

      const cuidadosIds = [...new Set(todos.map(v => v.cuidado_id))];
      let semCuidador = 0;
      if (cuidadosIds.length > 0) {
        const r = await fetch(
          `${apiBaseUrl()}/rest/v1/membros?deleted_at=is.null&select=id&id=not.in.(${
            // pessoas que já têm cuidador
            cuidadosIds.join(',')
          })&limit=1`,
          { headers: { ...apiHeaders(), 'Prefer': 'count=exact' } }
        );
        const cr = r.headers.get('content-range');
        semCuidador = cr ? parseInt(cr.split('/')[1]) || 0 : 0;
      } else {
        const r = await fetch(
          `${apiBaseUrl()}/rest/v1/membros?deleted_at=is.null&select=id&limit=1`,
          { headers: { ...apiHeaders(), 'Prefer': 'count=exact' } }
        );
        const cr = r.headers.get('content-range');
        semCuidador = cr ? parseInt(cr.split('/')[1]) || 0 : 0;
      }

      const nCuidadores = Object.keys(porCuidador).length;

      let html = `<div style="padding:0 16px 24px">`;

      // KPIs
      html += `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px">
          ${_kpi(todos.length, 'Vínculos', 'var(--rose)')}
          ${_kpi(nCuidadores, 'Cuidadores', 'var(--gr)')}
          ${_kpi(semCuidador, 'Sem cuidador', semCuidador > 0 ? 'var(--amber)' : 'var(--tx3)')}
        </div>`;

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
      // Líder normal: apenas minha rede, sem tabs
      container.innerHTML = `<div id="rc-minha"></div>`;
      await _renderMinhaRede(document.getElementById('rc-minha'));
      return;
    }

    // Admin/pastor: tabs Minha Rede | Visão Geral
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
      const tabs = container.querySelectorAll('[onclick^="window._redeToggleAba"]');
      tabs.forEach(btn => {
        const isOn = btn.getAttribute('onclick').includes(`'${aba}'`);
        btn.style.background = isOn ? 'var(--rose)' : 'transparent';
        btn.style.color      = isOn ? '#fff'        : 'var(--tx3)';
      });
      const conteudo = document.getElementById('rc-conteudo');
      if (aba === 'minha') _renderMinhaRede(conteudo);
      else                  _renderVisaoGeral(conteudo);
    };

    const conteudo = document.getElementById('rc-conteudo');
    if (_aba === 'minha') await _renderMinhaRede(conteudo);
    else                   await _renderVisaoGeral(conteudo);
  }

})();
