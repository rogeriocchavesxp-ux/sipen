/* ═══════════════════════════════════════════════════════
   SIPEN — Dep. Administrativos Dashboard
   modules/dep-adm/index.js · v1.0
═══════════════════════════════════════════════════════ */

(function () {

  const CFG = [
    { slug:'secretaria',     ico:'📋', cor:'var(--blue)',   bgCor:'rgba(74,156,245,.1)',   desc:'Documentação, atas e registros administrativos' },
    { slug:'tesouraria',     ico:'💰', cor:'var(--gr)',     bgCor:'rgba(58,170,92,.1)',    desc:'Finanças, pagamentos e prestação de contas' },
    { slug:'patrimonio',     ico:'🏗',  cor:'var(--amber)',  bgCor:'rgba(224,138,42,.1)',   desc:'Gestão de bens, imóveis e equipamentos' },
    { slug:'comunicacao',    ico:'📢', cor:'var(--teal)',   bgCor:'rgba(20,184,166,.1)',   desc:'Mídias, redes sociais e comunicados oficiais' },
    { slug:'infraestrutura', ico:'🔧', cor:'var(--violet)', bgCor:'rgba(138,107,193,.1)',  desc:'Manutenção, conservação e espaços físicos' },
  ];

  function _esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function _hdr() {
    const key = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
    const tok = typeof sipenToken === 'function' ? sipenToken() : key;
    return { 'apikey': key, 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' };
  }

  async function _get(path) {
    const base = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '').replace(/\/$/, '');
    const r = await fetch(base + '/rest/v1/' + path, { headers: _hdr() });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  function _isAdmin() {
    const p = String(typeof USUARIO_ATUAL !== 'undefined' ? (USUARIO_ATUAL?.perfil || '') : '').toUpperCase();
    return p.includes('ADMIN');
  }

  async function depAdmLoad() {
    const elCards   = document.getElementById('dep-adm-cards');
    const elTotal   = document.getElementById('dep-kpi-total');
    const elMembros = document.getElementById('dep-kpi-membros');
    const elDem     = document.getElementById('dep-kpi-demandas');
    const elConcl   = document.getElementById('dep-kpi-concl');
    const elHeroAct = document.getElementById('dep-adm-hero-act');

    if (!elCards) return;

    if (elHeroAct) {
      elHeroAct.innerHTML = _isAdmin()
        ? '<button class="tbt pri" onclick="DEPT_ADM.openDeptModal(null)">+ Novo Departamento</button>'
        : '';
    }

    elCards.innerHTML = '<div style="color:var(--tx3);font-size:11.5px;grid-column:1/-1;text-align:center;padding:40px 0">Carregando...</div>';

    try {
      const [depts, membros] = await Promise.all([
        _get('dept_administrativos?select=id,nome,slug,status,descricao&order=nome.asc').catch(() => []),
        _get('nomeados?status=eq.ativo&dept_id=not.is.null&select=dept_id').catch(() => []),
      ]);

      const ativos = (Array.isArray(depts) ? depts : []).filter(d => d.status === 'ativo');
      const totalMembros = Array.isArray(membros) ? membros.length : 0;

      if (elTotal)   elTotal.textContent   = ativos.length;
      if (elMembros) elMembros.textContent = totalMembros;

      // Contagem por departamento
      const countByDept = {};
      (Array.isArray(membros) ? membros : []).forEach(m => {
        const key = m.dept_id || m.departamento_id;
        if (key) countByDept[key] = (countByDept[key] || 0) + 1;
      });

      // Demandas abertas e concluídas
      try {
        const d30 = new Date();
        d30.setDate(d30.getDate() - 30);
        const iso = d30.toISOString();
        const [ab, co] = await Promise.all([
          _get('demandas?status=in.(Aberta,Pendente,Em%20Andamento,Em%20An%C3%A1lise)&select=id&limit=1').catch(() => null),
          _get('demandas?status=eq.Concluida&updated_at=gte.' + encodeURIComponent(iso) + '&select=id&limit=1').catch(() => null),
        ]);
        // Supabase retorna header Content-Range para contagem — usamos tamanho do array como fallback
        if (elDem)   elDem.textContent   = Array.isArray(ab) ? ab.length : '—';
        if (elConcl) elConcl.textContent = Array.isArray(co) ? co.length : '—';
      } catch (_) { /* sem contagem */ }

      if (!ativos.length) {
        elCards.innerHTML = '<div style="color:var(--tx3);font-size:11.5px;grid-column:1/-1;text-align:center;padding:40px 0">'
          + 'Nenhum departamento cadastrado.<br>Execute o script <b>supabase-dept-admin.sql</b> no Supabase.</div>';
        return;
      }

      elCards.innerHTML = ativos.map(dept => {
        const cfg  = CFG.find(c => c.slug === dept.slug) || { ico: '🏢', cor: 'var(--blue)', bgCor: 'rgba(74,156,245,.1)', desc: '' };
        const desc = dept.descricao || cfg.desc;
        const cnt  = countByDept[dept.id] || 0;
        const id   = _esc(dept.id);
        const nm   = _esc(dept.nome);
        const dsc  = _esc(desc);

        return '<div class="card" style="cursor:pointer;transition:box-shadow .15s;padding:16px" '
          + 'onmouseenter="this.style.boxShadow=\'0 4px 18px rgba(0,0,0,.14)\'" '
          + 'onmouseleave="this.style.boxShadow=\'\'" '
          + 'onclick="window._deptAdmId=\'' + id + '\';go(\'min-adm\')">'

          +   '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">'
          +     '<div style="width:44px;height:44px;border-radius:11px;background:' + cfg.bgCor + ';border:1px solid ' + cfg.cor.replace('var(--','var(--') + ';display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">' + cfg.ico + '</div>'
          +     '<div style="flex:1;min-width:0">'
          +       '<div style="font-size:13.5px;font-weight:700;color:var(--tx1);margin-bottom:3px">' + nm + '</div>'
          +       '<div style="font-size:10.5px;color:var(--tx3);line-height:1.45;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + dsc + '</div>'
          +     '</div>'
          +   '</div>'

          +   '<div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid var(--bd1)">'
          +     '<span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--tx3)">'
          +       '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
          +       cnt + ' membro' + (cnt !== 1 ? 's' : '')
          +     '</span>'
          +     '<span style="font-size:11px;color:' + cfg.cor + ';font-weight:600">Ver equipe →</span>'
          +   '</div>'

          + '</div>';
      }).join('');

    } catch (e) {
      elCards.innerHTML = '<div style="color:var(--rose);font-size:11.5px;grid-column:1/-1;text-align:center;padding:40px 0">'
        + 'Erro ao carregar: ' + _esc(e.message) + '</div>';
    }
  }

  document.addEventListener('sipen:navigate', function (e) {
    if (e.detail && e.detail.id === 'dep-adm-dash') depAdmLoad();
  });

  window.depAdmLoad = depAdmLoad;

}());
