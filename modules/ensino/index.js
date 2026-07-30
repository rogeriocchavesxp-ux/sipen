/* ══════════════════════════════════════
   ENSINO — módulo essencial
══════════════════════════════════════ */

async function ensinoDashLoad() {
  const _set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  try {
    const [rTur, rCur, rProf] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/ensino_turmas?status=eq.ativo&select=id`, { headers: _hdr() }),
      fetch(`${SUPABASE_URL}/rest/v1/ensino_cursos?status=eq.ativo&select=id`, { headers: _hdr() }),
      fetch(`${SUPABASE_URL}/rest/v1/ensino_professores?status=eq.ativo&select=id`, { headers: _hdr() }),
    ]);
    _set('ens-kpi-turmas',     rTur.ok  ? (await rTur.json()).length  : '—');
    _set('ens-kpi-cursos',     rCur.ok  ? (await rCur.json()).length  : '—');
    _set('ens-kpi-professores', rProf.ok ? (await rProf.json()).length : '—');
  } catch (e) {
    console.error('ensinoDashLoad:', e.message);
  }
}

async function ensinoListLoad(tabela, elId, countId, cols, renderRow) {
  const el  = document.getElementById(elId);
  const cnt = document.getElementById(countId);
  if (!el) return;
  el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:20px 0;text-align:center">Carregando...</div>';
  try {
    const r     = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}?select=${cols}&order=nome.asc&limit=200`, { headers: _hdr() });
    const lista = r.ok ? await r.json() : [];
    if (cnt) cnt.textContent = `(${lista.length})`;
    if (!lista.length) {
      el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:20px 0;text-align:center">Nenhum registro encontrado.</div>';
      return;
    }
    el.innerHTML = lista.map(renderRow).join('');
  } catch (e) {
    el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0">Erro ao carregar.</div>';
  }
}

function _ensRow(label, sub) {
  return `<div style="padding:10px 0;border-bottom:1px solid var(--bd1);display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:13px;color:var(--tx1);font-weight:500">${label}</span>
    ${sub ? `<span style="font-size:12px;color:var(--tx3)">${sub}</span>` : ''}
  </div>`;
}

if (typeof VIEW_AUTOLOAD !== 'undefined') {
  VIEW_AUTOLOAD['ensino-dash']       = { fn: () => ensinoDashLoad() };
  VIEW_AUTOLOAD['ensino-ebd']        = { fn: () => ensinoListLoad('ensino_turmas',     'ens-ebd-list',  'ens-ebd-count',   'id,nome,faixa_etaria,professor,status', r => _ensRow((r.nome||'—').toUpperCase(), r.professor)) };
  VIEW_AUTOLOAD['ensino-cursos']     = { fn: () => ensinoListLoad('ensino_cursos',     'ens-cursos-list','ens-cursos-count','id,nome,categoria,status',              r => _ensRow((r.nome||'—').toUpperCase(), r.categoria)) };
  VIEW_AUTOLOAD['ensino-professores']= { fn: () => ensinoListLoad('ensino_professores','ens-prof-list',  'ens-prof-count',  'id,nome,especialidade,status',          r => _ensRow((r.nome||'—').toUpperCase(), r.especialidade)) };
  VIEW_AUTOLOAD['ensino-materiais']  = { fn: () => ensinoListLoad('ensino_materiais',  'ens-mat-list',   'ens-mat-count',   'id,nome,tipo,status',                   r => _ensRow((r.nome||'—').toUpperCase(), r.tipo)) };
}
