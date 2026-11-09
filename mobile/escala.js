/* ════════════════════════════════════════════════════
   SIPEN Mobile — Escala Pastoral
   mobile/escala.js · v1.0.5-diag

   Páginas:
   - escala-mob → visualização da escala + disponibilidade (pastores)
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('escala-mob', renderEscalaMob);

  /* ── Configurações ────────────────────────────── */
  const TIPO = {
    domingo_manha:      { label: 'Domingo Manhã',      ico: '☀️', cor: '#4a9cf5' },
    domingo_noite:      { label: 'Domingo Noite',       ico: '🌙', cor: '#8b6fd4' },
    conexao_com_deus:   { label: 'Conexão com Deus',    ico: '🙏', cor: '#2ab5c0' },
    tarde_da_esperanca: { label: 'Tarde da Esperança',  ico: '✝️', cor: '#d4a843' },
  };

  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const WDAYS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  /* ── Helpers ──────────────────────────────────── */
  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  }

  function _pad(n) { return String(n).padStart(2, '0'); }

  function _fmtDia(dateStr) {
    const [, , d] = dateStr.split('-');
    return parseInt(d, 10);
  }

  function _fmtWday(dateStr) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    return WDAYS[new Date(y, mo - 1, d).getDay()];
  }

  function _fmtDataCurta(dateStr) {
    const [, mo, d] = dateStr.split('-');
    return `${d}/${mo}`;
  }

  function _fmtDataLonga(dateStr) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    return `${_pad(d)} ${MONTHS[mo - 1]} · ${WDAYS[dt.getDay()]}`;
  }

  function _monthRange(y, m) {
    const start  = `${y}-${_pad(m + 1)}-01`;
    const ultimo = new Date(y, m + 1, 0).getDate();
    const end    = `${y}-${_pad(m + 1)}-${_pad(ultimo)}`;
    return { start, end };
  }

  function _weekStart(dateStr) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const dt  = new Date(y, mo - 1, d);
    const sun = new Date(y, mo - 1, d - dt.getDay());
    return `${sun.getFullYear()}-${_pad(sun.getMonth() + 1)}-${_pad(sun.getDate())}`;
  }

  function _weekLabel(ws) {
    const [y, mo, d] = ws.split('-').map(Number);
    const sun = new Date(y, mo - 1, d);
    const sat = new Date(y, mo - 1, d + 6);
    const fmt = dt => `${_pad(dt.getDate())}/${_pad(dt.getMonth() + 1)}`;
    return `${fmt(sun)} – ${fmt(sat)}`;
  }

  /* ── Permissão ────────────────────────────────── */
  let _perm = null;

  async function _carregarPerm() {
    if (_perm !== null) return _perm;
    _perm = { pessoaId: null, nome: '', oficialId: null, pastorId: null, podeDisp: false };

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

      // 1. Busca na tabela oficiais (novo sistema — pastor por pessoa_id)
      const [oRows, nRows] = await Promise.all([
        fetch(
          `${apiBaseUrl()}/rest/v1/oficiais?pessoa_id=eq.${encodeURIComponent(_perm.pessoaId)}&cargo=eq.pastor&status=eq.ativo&deleted_at=is.null&select=id&limit=1`,
          { headers: apiHeaders() }
        ).then(r => r.ok ? r.json() : []),
        fetch(
          `${apiBaseUrl()}/rest/v1/nomeados?pessoa_id=eq.${encodeURIComponent(_perm.pessoaId)}&status=eq.ativo&deleted_at=is.null&select=funcao_lider,cargo&limit=10`,
          { headers: apiHeaders() }
        ).then(r => r.ok ? r.json() : []),
      ]);

      if (oRows?.[0]?.id) {
        _perm.oficialId = oRows[0].id;
        _perm.podeDisp  = true;
        return _perm;
      }

      // 2. Busca por nome na tabela legada pastores
      const primeiro = _perm.nome.split(' ')[0];
      if (primeiro) {
        const legado = await fetch(
          `${apiBaseUrl()}/rest/v1/pastores?nome_completo=ilike.*${encodeURIComponent(primeiro)}*&ativo=eq.true&select=id,nome_completo&limit=5`,
          { headers: apiHeaders() }
        ).then(r => r.ok ? r.json() : []);

        const nomeLower = _perm.nome.toLowerCase();
        const match = legado.find(p =>
          nomeLower.includes(p.nome_completo?.toLowerCase()?.split(' ').filter(w => w.length > 3)[0] || '__') ||
          (p.nome_completo || '').toLowerCase().includes(primeiro.toLowerCase())
        );
        if (match) {
          _perm.pastorId = match.id;
          _perm.podeDisp = true;
          return _perm;
        }
      }

      // 3. Fallback: nomeados com funcao_lider/cargo contendo "pastor"
      const funcoes = nRows.map(n => (n.funcao_lider || n.cargo || '').toLowerCase()).join(' ');
      _perm.podeDisp = /pastor/.test(funcoes);
    } catch (_) {}

    return _perm;
  }

  /* ── Cache de dados da escala ─────────────────── */
  const _cache = {};

  async function _loadMes(y, m) {
    const key = `${y}-${_pad(m + 1)}`;
    if (_cache[key]) return _cache[key];

    const { start, end } = _monthRange(y, m);
    const q = `&data=gte.${start}&data=lte.${end}`;

    const [pregacao, musica, diaconal] = await Promise.all([
      fetch(
        `${apiBaseUrl()}/rest/v1/escala_pregacao?select=id,data,culto_tipo,pastor_id,oficial_id,status,local${q}&order=data.asc,culto_tipo.asc`,
        { headers: apiHeaders() }
      ).then(r => r.ok ? r.json() : []),
      fetch(
        `${apiBaseUrl()}/rest/v1/escala_musica?select=data,culto_tipo,dirigente_nome,equipe,status${q}&order=data.asc,culto_tipo.asc`,
        { headers: apiHeaders() }
      ).then(r => r.ok ? r.json() : []),
      fetch(
        `${apiBaseUrl()}/rest/v1/escala_diaconal?select=data,programacao,posto,diacono_nome,ordem${q}&order=data.asc,ordem.asc`,
        { headers: apiHeaders() }
      ).then(r => r.ok ? r.json() : []),
    ]);

    _cache[key] = { pregacao, musica, diaconal };
    return _cache[key];
  }

  let _nomesMap = {};

  async function _loadNomes() {
    if (Object.keys(_nomesMap).length) return;
    try {
      const [view, legacy] = await Promise.all([
        fetch(`${apiBaseUrl()}/rest/v1/vw_pastores_escala?select=id,nome_exibicao&status=eq.ativo`, { headers: apiHeaders() })
          .then(r => r.ok ? r.json() : []),
        fetch(`${apiBaseUrl()}/rest/v1/pastores?select=id,nome_completo,nome_exibicao&ativo=eq.true`, { headers: apiHeaders() })
          .then(r => r.ok ? r.json() : []),
      ]);
      legacy.forEach(p => { _nomesMap[p.id] = p.nome_exibicao || p.nome_completo; });
      view.forEach(o => { _nomesMap[o.id] = o.nome_exibicao; });
    } catch (_) {}
  }

  /* ── Render: Pregação ─────────────────────────── */
  function _renderPregacao(rows) {
    if (!rows.length) return _vazio('☀️', 'Sem pregações cadastradas para este mês.');

    const semanas = {};
    rows.forEach(r => {
      const ws = _weekStart(r.data);
      if (!semanas[ws]) semanas[ws] = [];
      semanas[ws].push(r);
    });

    let h = '';
    Object.keys(semanas).sort().forEach(ws => {
      h += `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);padding:6px 12px;background:var(--bg-card);border:1px solid var(--bd2);border-radius:8px;margin:14px 0 8px">${_weekLabel(ws)}</div>`;
      semanas[ws].forEach(r => {
        const t    = TIPO[r.culto_tipo] || { label: r.culto_tipo, ico: '•', cor: '#888' };
        const nome = _nomesMap[r.oficial_id] || _nomesMap[r.pastor_id] || null;
        const st   = _statusBadge(r.status);
        h += `
          <div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:12px 14px;margin-bottom:6px;display:flex;align-items:center;gap:10px">
            <div style="min-width:34px;text-align:center;flex-shrink:0">
              <div style="font-size:18px;font-weight:800;color:var(--tx1);line-height:1">${_fmtDia(r.data)}</div>
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--tx3)">${_fmtWday(r.data)}</div>
            </div>
            <div style="width:1px;align-self:stretch;background:var(--bd2);flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 7px;border-radius:5px;background:${t.cor}1a;color:${t.cor};margin-bottom:3px">${t.ico} ${_esc(t.label)}</div>
              <div style="font-size:13px;font-weight:600;color:${nome ? 'var(--tx1)' : 'var(--tx3)'};font-style:${nome ? 'normal' : 'italic'}">${nome ? _esc(nome) : 'a definir'}</div>
            </div>
            <span style="flex-shrink:0;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;background:${st.bg};color:${st.cl}">${st.lbl}</span>
          </div>`;
      });
    });
    return h;
  }

  /* ── Render: Música ───────────────────────────── */
  function _renderMusica(rows) {
    if (!rows.length) return _vazio('🎵', 'Sem escala de música cadastrada para este mês.');

    const byDate = {};
    rows.forEach(r => {
      if (!byDate[r.data]) byDate[r.data] = [];
      byDate[r.data].push(r);
    });

    let h = '';
    Object.keys(byDate).sort().forEach(d => {
      h += `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--tx2);padding:6px 12px;background:var(--bg-card);border:1px solid var(--bd2);border-radius:8px;margin:14px 0 8px">${_fmtDataLonga(d)}</div>`;
      byDate[d].forEach(r => {
        const t  = TIPO[r.culto_tipo] || { label: r.culto_tipo, ico: '•', cor: '#888' };
        const st = _statusBadge(r.status);
        h += `
          <div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:12px 14px;margin-bottom:6px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:5px;background:${t.cor}1a;color:${t.cor}">${t.ico} ${_esc(t.label)}</span>
              <span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;background:${st.bg};color:${st.cl}">${st.lbl}</span>
            </div>
            <div style="font-size:13px;font-weight:600;color:${r.dirigente_nome ? 'var(--tx1)' : 'var(--tx3)'};font-style:${r.dirigente_nome ? 'normal' : 'italic'}">
              ${r.dirigente_nome ? '♪ ' + _esc(r.dirigente_nome) : 'Dirigente a definir'}
            </div>
            ${r.equipe ? `<div style="font-size:11px;color:var(--tx2);margin-top:3px">Equipe: ${_esc(r.equipe)}</div>` : ''}
          </div>`;
      });
    });
    return h;
  }

  /* ── Render: Diaconal ─────────────────────────── */
  function _renderDiaconal(rows) {
    if (!rows.length) return _vazio('🤝', 'Sem escala diaconal cadastrada para este mês.');

    const byDate = {};
    rows.forEach(r => {
      if (!byDate[r.data]) byDate[r.data] = {};
      if (!byDate[r.data][r.programacao]) byDate[r.data][r.programacao] = [];
      byDate[r.data][r.programacao].push(r);
    });

    let h = '';
    Object.keys(byDate).sort().forEach(d => {
      h += `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--tx2);padding:6px 12px;background:var(--bg-card);border:1px solid var(--bd2);border-radius:8px;margin:14px 0 8px">${_fmtDataLonga(d)}</div>`;
      Object.entries(byDate[d]).forEach(([prog, items]) => {
        h += `
          <div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;overflow:hidden;margin-bottom:6px">
            <div style="padding:9px 14px;border-bottom:1px solid var(--bd1);background:rgba(172,142,104,.06);display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#ac8e68">${_esc(prog)}</span>
              <span style="font-size:10px;color:var(--tx3)">${items.length} diác.</span>
            </div>`;
        items.forEach(item => {
          h += `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid var(--bd1)">
              <span style="font-size:10px;color:var(--tx3);min-width:120px;flex-shrink:0">${_esc(item.posto)}</span>
              <span style="font-size:12px;color:var(--tx1);font-weight:500">${_esc(item.diacono_nome)}</span>
            </div>`;
        });
        h += `</div>`;
      });
    });
    return h;
  }

  /* ── Status badge ─────────────────────────────── */
  function _statusBadge(s) {
    const map = {
      CONFIRMADA: { cl: 'var(--gr)',    bg: 'rgba(48,209,88,.12)',   lbl: 'Confirmada' },
      PREENCHIDA: { cl: 'var(--blue)',  bg: 'rgba(10,132,255,.12)',  lbl: 'Preenchida' },
      PENDENTE:   { cl: 'var(--amber)', bg: 'rgba(255,159,10,.12)',  lbl: 'Pendente'   },
    };
    return map[s] || map.PENDENTE;
  }

  /* ── Vazio / Loading ──────────────────────────── */
  function _vazio(ico, msg) {
    return `<div class="mob-empty" style="padding:40px 0"><div class="mob-empty-icon" style="font-size:28px">${ico}</div><div class="mob-empty-text">${msg}</div></div>`;
  }

  /* ── Aba: Visualização da Escala ──────────────── */
  async function _renderEscalaAba(el) {
    const now   = new Date();
    let _year   = now.getFullYear();
    let _month  = now.getMonth();
    let _subAba = 'pregacao';

    function _buildSubBtn(id, lbl, cor) {
      const on = _subAba === id;
      return `<button onclick="window._escalaSubAba('${id}')"
        style="flex:1;padding:7px 0;font-size:12px;font-weight:600;border:none;border-bottom:2px solid ${on ? cor : 'transparent'};background:transparent;color:${on ? cor : 'var(--tx3)'};cursor:pointer;transition:all .15s">${lbl}</button>`;
    }

    function _buildHtml() {
      const mesLabel = `${MONTHS[_month]} ${_year}`;
      return `
        <div style="padding:0 16px 16px">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0 14px">
            <button onclick="window._escalaMudarMes(-1)"
              style="width:36px;height:36px;border-radius:50%;background:var(--bg-card);border:1px solid var(--bd2);color:var(--tx2);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">‹</button>
            <span style="font-size:16px;font-weight:700;color:var(--tx1)">${mesLabel}</span>
            <button onclick="window._escalaMudarMes(1)"
              style="width:36px;height:36px;border-radius:50%;background:var(--bg-card);border:1px solid var(--bd2);color:var(--tx2);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">›</button>
          </div>

          <div style="display:flex;border-bottom:1px solid var(--bd2);margin-bottom:12px" id="esc-subnav">
            ${_buildSubBtn('pregacao', 'Pregação',   '#4a9cf5')}
            ${_buildSubBtn('musica',   'Música',      '#8b6fd4')}
            ${_buildSubBtn('diaconal', 'Diaconal',    '#ac8e68')}
          </div>

          <div id="esc-conteudo"><div class="mob-loading">Carregando…</div></div>
        </div>`;
    }

    async function _carregarConteudo() {
      const c = document.getElementById('esc-conteudo');
      if (!c) return;
      c.innerHTML = '<div class="mob-loading">Carregando…</div>';
      try {
        if (_subAba === 'pregacao') await _loadNomes();
        const data = await _loadMes(_year, _month);
        if      (_subAba === 'pregacao') c.innerHTML = _renderPregacao(data.pregacao);
        else if (_subAba === 'musica')   c.innerHTML = _renderMusica(data.musica);
        else                             c.innerHTML = _renderDiaconal(data.diaconal);
      } catch (e) {
        c.innerHTML = `<div class="mob-empty"><div class="mob-empty-text">Erro: ${_esc(e.message)}</div></div>`;
      }
    }

    el.innerHTML = _buildHtml();
    _carregarConteudo();

    window._escalaSubAba = function (id) {
      _subAba = id;
      const nav = document.getElementById('esc-subnav');
      if (nav) nav.innerHTML = `
        ${_buildSubBtn('pregacao', 'Pregação',  '#4a9cf5')}
        ${_buildSubBtn('musica',   'Música',     '#8b6fd4')}
        ${_buildSubBtn('diaconal', 'Diaconal',   '#ac8e68')}`;
      _carregarConteudo();
    };

    window._escalaMudarMes = function (dir) {
      _month += dir;
      if (_month < 0)  { _month = 11; _year--; }
      if (_month > 11) { _month = 0;  _year++; }
      el.innerHTML = _buildHtml();
      window._escalaSubAba(_subAba);
    };
  }

  /* ── Aba: Disponibilidade ─────────────────────── */
  async function _renderDisponibilidadeAba(el) {
    const perm = await _carregarPerm();
    if (!perm.podeDisp) {
      el.innerHTML = `<div class="mob-empty" style="padding:40px 16px"><div class="mob-empty-text">Disponibilidade acessível apenas para pastores cadastrados.</div></div>`;
      return;
    }

    el.innerHTML = '<div class="mob-loading">Carregando…</div>';

    try {
      await _loadNomes();

      const hoje = new Date();
      const start = `${hoje.getFullYear()}-${_pad(hoje.getMonth() + 1)}-${_pad(hoje.getDate())}`;

      // — diagnóstico: busca sem filtro de data para ver se há qualquer dado
      const _diagRes = await fetch(
        `${apiBaseUrl()}/rest/v1/escala_pregacao?select=id,data&limit=5`,
        { headers: apiHeaders() }
      );
      const _diagStatus = _diagRes.status;
      const _diagBody   = _diagRes.ok ? await _diagRes.json() : await _diagRes.text();

      // Busca cultos futuros
      let slots = null;
      const _res = await fetch(
        `${apiBaseUrl()}/rest/v1/escala_pregacao?data=gte.${start}&order=data.asc,culto_tipo.asc&select=id,data,culto_tipo,pastor_id,oficial_id,status&limit=300`,
        { headers: apiHeaders() }
      );
      if (_res.ok) {
        slots = await _res.json();
      } else {
        const _errText = await _res.text();
        if (_res.status === 400 && _errText.includes('oficial_id')) {
          const _res2 = await fetch(
            `${apiBaseUrl()}/rest/v1/escala_pregacao?data=gte.${start}&order=data.asc,culto_tipo.asc&select=id,data,culto_tipo,pastor_id,status&limit=300`,
            { headers: apiHeaders() }
          );
          slots = _res2.ok ? await _res2.json() : [];
        } else {
          el.innerHTML = `<div style="padding:16px"><div style="color:var(--rose);font-size:12px">Erro (${_res.status}): ${_errText.slice(0,200)}</div></div>`;
          return;
        }
      }

      const _diagInfo = `<div style="margin:12px 16px;padding:10px 12px;background:#f5f5f5;border-radius:8px;font-size:10px;color:#555;font-family:monospace">
        DIAG: status_sem_filtro=${_diagStatus} | total_sem_filtro=${Array.isArray(_diagBody)?_diagBody.length:'err'} | datas=[${Array.isArray(_diagBody)?_diagBody.map(r=>r.data).join(','):''}]<br>
        hoje=${start} | slots_futuros=${slots?.length ?? 0} | pastorId=${perm.pastorId||'null'} | oficialId=${perm.oficialId||'null'}
      </div>`;

      if (!slots.length) {
        el.innerHTML = `${_diagInfo}<div style="padding:0 16px">${_vazio('📅', 'Nenhum culto cadastrado a partir de hoje.')}</div>`;
        return;
      }

      function _slotStatus(s) {
        if (!s.oficial_id && !s.pastor_id)              return 'vaga';
        if (perm.oficialId && s.oficial_id === perm.oficialId) return 'meu';
        if (perm.pastorId  && s.pastor_id  === perm.pastorId)  return 'meu';
        return 'outro';
      }

      function _buildSlots() {
        const byMes = {};
        slots.forEach(s => {
          const chave = s.data.slice(0, 7);
          if (!byMes[chave]) byMes[chave] = [];
          byMes[chave].push(s);
        });

        let h = `<div style="padding:0 16px 24px">
          <div style="font-size:11px;color:var(--tx3);margin-bottom:16px;line-height:1.5">Toque em um culto para marcar ou cancelar sua disponibilidade.</div>`;

        Object.keys(byMes).sort().forEach(chave => {
          const [y, m] = chave.split('-').map(Number);
          h += `<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">${MONTHS[m - 1]} ${y}</div>
                <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px">`;

          byMes[chave].forEach(s => {
            const t   = TIPO[s.culto_tipo] || { label: s.culto_tipo, ico: '•', cor: '#888' };
            const st  = _slotStatus(s);
            const outroPastor = st === 'outro' ? (_nomesMap[s.oficial_id] || _nomesMap[s.pastor_id] || 'outro pastor') : null;

            const bg  = st === 'meu'   ? 'rgba(48,209,88,.08)'    : 'var(--bg-card)';
            const bd  = st === 'meu'   ? '1.5px solid var(--gr)'  : '1px solid var(--bd2)';
            const btn = st === 'outro'
              ? `<span style="font-size:10px;color:var(--tx3);font-style:italic">${_esc(_nomesMap[s.oficial_id] || _nomesMap[s.pastor_id] || '—')}</span>`
              : st === 'meu'
                ? `<button onclick="window._escalaDesmarcar('${s.id}')"
                    style="padding:5px 12px;background:rgba(255,69,58,.1);border:1px solid rgba(255,69,58,.3);border-radius:8px;color:var(--rose);font-size:11px;font-weight:700;cursor:pointer">Cancelar</button>`
                : `<button onclick="window._escalaMarcar('${s.id}','${s.data}','${s.culto_tipo}')"
                    style="padding:5px 12px;background:rgba(48,209,88,.1);border:1px solid rgba(48,209,88,.3);border-radius:8px;color:var(--gr);font-size:11px;font-weight:700;cursor:pointer">Disponível</button>`;

            h += `
              <div style="background:${bg};border:${bd};border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px" data-slot-id="${s.id}">
                <div style="min-width:32px;text-align:center;flex-shrink:0">
                  <div style="font-size:17px;font-weight:800;color:var(--tx1);line-height:1">${_fmtDia(s.data)}</div>
                  <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--tx3)">${_fmtWday(s.data)}</div>
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:1px 7px;border-radius:5px;display:inline-block;background:${t.cor}1a;color:${t.cor};margin-bottom:3px">${t.ico} ${_esc(t.label)}</div>
                  <div style="font-size:11px;color:${st === 'meu' ? 'var(--gr)' : 'var(--tx3)'}">
                    ${st === 'meu' ? '✓ Marcado por você' : st === 'outro' ? '' : 'Vaga'}
                  </div>
                </div>
                ${btn}
              </div>`;
          });

          h += `</div>`;
        });

        h += `</div>`;
        return h;
      }

      el.innerHTML = _buildSlots();

      window._escalaMarcar = async function (slotId, data, culto_tipo) {
        const btn = document.querySelector(`[data-slot-id="${slotId}"] button`);
        if (btn) { btn.disabled = true; btn.textContent = '…'; }

        // Monta payload: prefere oficial_id (novo), fallback pastor_id (legado)
        const payload = perm.oficialId
          ? { oficial_id: perm.oficialId, status: 'PREENCHIDA' }
          : { pastor_id: perm.pastorId,   status: 'PREENCHIDA' };

        try {
          const existing = slots.find(s => s.id === slotId);
          if (existing) {
            const r = await fetch(`${apiBaseUrl()}/rest/v1/escala_pregacao?id=eq.${slotId}`, {
              method: 'PATCH',
              headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
              body: JSON.stringify(payload)
            });
            if (!r.ok) throw new Error(await r.text());
            Object.assign(existing, payload);
          } else {
            const r = await fetch(`${apiBaseUrl()}/rest/v1/escala_pregacao`, {
              method: 'POST',
              headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
              body: JSON.stringify({ data, culto_tipo, local: 'Templo Principal', ...payload })
            });
            if (!r.ok) throw new Error(await r.text());
          }
          delete _cache[data.slice(0, 7)];
          mobToast('Disponibilidade registrada', 'success');
          _renderDisponibilidadeAba(el);
        } catch (e) {
          if (btn) { btn.disabled = false; btn.textContent = 'Disponível'; }
          mobToast('Erro ao salvar', 'error');
        }
      };

      window._escalaDesmarcar = async function (slotId) {
        const btn = document.querySelector(`[data-slot-id="${slotId}"] button`);
        if (btn) { btn.disabled = true; btn.textContent = '…'; }

        try {
          const r = await fetch(`${apiBaseUrl()}/rest/v1/escala_pregacao?id=eq.${slotId}`, {
            method: 'PATCH',
            headers: { ...apiHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({ oficial_id: null, pastor_id: null, status: 'PENDENTE' })
          });
          if (!r.ok) throw new Error(await r.text());
          const s = slots.find(x => x.id === slotId);
          if (s) { s.oficial_id = null; s.pastor_id = null; s.status = 'PENDENTE'; }
          mobToast('Disponibilidade cancelada', 'success');
          _renderDisponibilidadeAba(el);
        } catch (e) {
          if (btn) { btn.disabled = false; btn.textContent = 'Cancelar'; }
          mobToast('Erro ao salvar', 'error');
        }
      };

    } catch (e) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-text">Erro ao carregar: ${_esc(e.message)}</div></div>`;
    }
  }

  /* ── Página principal ─────────────────────────── */
  async function renderEscalaMob(container) {
    const perm = await _carregarPerm();
    let _aba = perm.podeDisp ? 'disponibilidade' : 'escala';

    function _btnAba(id, lbl) {
      const on = _aba === id;
      return `<button onclick="window._escalaToggleAba('${id}')"
        style="flex:1;padding:9px 0;font-size:13px;font-weight:600;border:none;background:${on ? 'var(--blue)' : 'transparent'};color:${on ? '#fff' : 'var(--tx3)'};border-radius:8px;cursor:pointer;transition:all .15s">${lbl}</button>`;
    }

    const tabHtml = perm.podeDisp
      ? `${_btnAba('disponibilidade', 'Disponibilidade')}${_btnAba('escala', 'Ver Escala')}`
      : `${_btnAba('escala', 'Ver Escala')}`;

    container.innerHTML = `
      <div style="padding:12px 16px 8px">
        <div style="display:flex;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:3px;gap:3px">
          ${tabHtml}
        </div>
      </div>
      <div id="esc-aba-conteudo" style="padding-top:4px"></div>`;

    window._escalaToggleAba = function (aba) {
      _aba = aba;
      container.querySelectorAll('[onclick^="window._escalaToggleAba"]').forEach(btn => {
        const on = btn.getAttribute('onclick').includes(`'${aba}'`);
        btn.style.background = on ? 'var(--blue)' : 'transparent';
        btn.style.color      = on ? '#fff'        : 'var(--tx3)';
      });
      const c = document.getElementById('esc-aba-conteudo');
      if (aba === 'escala') _renderEscalaAba(c);
      else                   _renderDisponibilidadeAba(c);
    };

    const conteudo = document.getElementById('esc-aba-conteudo');
    if (_aba === 'escala') await _renderEscalaAba(conteudo);
    else                    await _renderDisponibilidadeAba(conteudo);
  }

})();
