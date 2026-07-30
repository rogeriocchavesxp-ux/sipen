/* ══════════════════════════════════════
   EVANGELIZAÇÃO E MISSÕES — módulo essencial
══════════════════════════════════════ */

async function evangelismoDashLoad() {
  const _set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  try {
    const [rProj, rObr, rCam] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/evangelismo_projetos?status=eq.ativo&select=id`, { headers: _hdr() }),
      fetch(`${SUPABASE_URL}/rest/v1/evangelismo_obreiros?status=eq.ativo&select=id`, { headers: _hdr() }),
      fetch(`${SUPABASE_URL}/rest/v1/evangelismo_campos?status=eq.ativo&select=id`,   { headers: _hdr() }),
    ]);
    _set('ev-kpi-projetos', rProj.ok ? (await rProj.json()).length : '—');
    _set('ev-kpi-obreiros', rObr.ok  ? (await rObr.json()).length  : '—');
    _set('ev-kpi-campos',   rCam.ok  ? (await rCam.json()).length  : '—');
  } catch (e) {
    console.error('evangelismoDashLoad:', e.message);
  }
}

async function evangelismoListLoad(tabela, elId, countId, cols, renderRow) {
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

function _evRow(label, sub) {
  return `<div style="padding:10px 0;border-bottom:1px solid var(--bd1);display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:13px;color:var(--tx1);font-weight:500">${label}</span>
    ${sub ? `<span style="font-size:12px;color:var(--tx3)">${sub}</span>` : ''}
  </div>`;
}

if (typeof VIEW_AUTOLOAD !== 'undefined') {
  VIEW_AUTOLOAD['evangelismo-dash']      = { fn: () => evangelismoDashLoad() };
  VIEW_AUTOLOAD['evangelismo-projetos']  = { fn: () => evangelismoListLoad('evangelismo_projetos', 'ev-projetos-list', 'ev-projetos-count', 'id,nome,tipo,status',    r => _evRow((r.nome||'—').toUpperCase(), r.tipo)) };
  VIEW_AUTOLOAD['evangelismo-obreiros']  = { fn: () => evangelismoListLoad('evangelismo_obreiros', 'ev-obreiros-list', 'ev-obreiros-count', 'id,nome,campo,status',   r => _evRow((r.nome||'—').toUpperCase(), r.campo)) };
  VIEW_AUTOLOAD['evangelismo-campos']    = { fn: () => evangelismoListLoad('evangelismo_campos',   'ev-campos-list',   'ev-campos-count',   'id,nome,regiao,status',  r => _evRow((r.nome||'—').toUpperCase(), r.regiao)) };
}
