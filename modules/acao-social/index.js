/* ══════════════════════════════════════
   AÇÃO SOCIAL — módulo essencial
══════════════════════════════════════ */

async function asSocialDashLoad() {
  const _set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  try {
    const [rAss, rBen, rPar] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/acao_social_assistidos?status=eq.ativo&select=id`, { headers: _hdr() }),
      fetch(`${SUPABASE_URL}/rest/v1/acao_social_beneficios?select=id`, { headers: _hdr() }),
      fetch(`${SUPABASE_URL}/rest/v1/acao_social_parcerias?status=eq.ativo&select=id`, { headers: _hdr() }),
    ]);
    _set('as-kpi-assistidos',   rAss.ok ? (await rAss.json()).length : '—');
    _set('as-kpi-beneficios',   rBen.ok ? (await rBen.json()).length : '—');
    _set('as-kpi-parcerias',    rPar.ok ? (await rPar.json()).length : '—');
  } catch (e) {
    console.error('asSocialDashLoad:', e.message);
  }
}

async function asSocialListLoad(tabela, elId, countId, cols, renderRow) {
  const el  = document.getElementById(elId);
  const cnt = document.getElementById(countId);
  if (!el) return;
  el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:20px 0;text-align:center">Carregando...</div>';
  try {
    const r    = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}?select=${cols}&order=criado_em.desc&limit=200`, { headers: _hdr() });
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

function _asRow(label, sub) {
  return `<div style="padding:10px 0;border-bottom:1px solid var(--bd1);display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:13px;color:var(--tx1);font-weight:500">${label}</span>
    ${sub ? `<span style="font-size:12px;color:var(--tx3)">${sub}</span>` : ''}
  </div>`;
}

if (typeof VIEW_AUTOLOAD !== 'undefined') {
  VIEW_AUTOLOAD['acao-social-dash']       = { fn: () => asSocialDashLoad() };
  VIEW_AUTOLOAD['acao-social-assistidos'] = { fn: () => asSocialListLoad('acao_social_assistidos', 'as-assistidos-list', 'as-assistidos-count', 'id,nome,status,criado_em', r => _asRow((r.nome||'—').toUpperCase(), r.status)) };
  VIEW_AUTOLOAD['acao-social-beneficios'] = { fn: () => asSocialListLoad('acao_social_beneficios', 'as-beneficios-list', 'as-beneficios-count', 'id,tipo,descricao,criado_em', r => _asRow(r.tipo||'—', r.descricao)) };
  VIEW_AUTOLOAD['acao-social-parcerias']  = { fn: () => asSocialListLoad('acao_social_parcerias',  'as-parcerias-list',  'as-parcerias-count',  'id,nome,tipo,status', r => _asRow((r.nome||'—').toUpperCase(), r.tipo)) };
}
