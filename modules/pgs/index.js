/* ══════════════════════════════
   PGS MODULE — dashboard + autoload
══════════════════════════════ */

async function pgsDashLoad() {
  try {
    const [pgsRows, visRows, encRows, oracaoRows] = await Promise.all([
      apiRead("PGS"),
      apiRead("VISITANTES"),
      apiRead("PG_ENCONTROS"),
      apiRead("DEMANDAS"),
    ]);

    const ativos    = pgsRows.filter(r => r.ativo === true || r.ativo === "true").length;
    const total     = pgsRows.length;
    const encontros = encRows.length;
    const vis       = visRows.length;
    const oracao    = oracaoRows.filter(r =>
      String(r.area || "").toLowerCase() === "pgs"
    ).length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("pgs-kpi-ativos",     ativos);
    set("pgs-kpi-encontros",  encontros);
    set("pgs-kpi-membros",    total);
    set("pgs-kpi-visitantes", vis);

    const sub1 = document.getElementById("pgs-kpi-ativos-sub");
    if (sub1) sub1.textContent = `▲ ${total} grupos no total`;

    const sub4 = document.getElementById("pgs-kpi-oracao-sub");
    if (sub4) sub4.textContent = `${oracao} pedido${oracao !== 1 ? "s" : ""} de oração`;
  } catch (e) {
    console.error("pgsDashLoad:", e.message);
  }
}

async function pgsLiderancaLoad() {
  const el = document.getElementById('pgs-lider-list');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--tx3);font-size:12px;padding:20px 0;text-align:center">Carregando...</div>';
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/pgs?select=nome,lider,horario,status&status=eq.ativo&order=nome.asc`,
      { headers: _hdr() }
    );
    const lista = r.ok ? await r.json() : [];
    if (!lista.length) {
      el.innerHTML = '<div style="color:var(--tx3);font-size:12px;padding:20px 0;text-align:center">Nenhum líder cadastrado.</div>';
      return;
    }
    el.innerHTML = `<table class="tbl"><thead><tr><th>PG</th><th>Líder</th><th>Horário</th></tr></thead><tbody>
      ${lista.map(p => `<tr><td>${p.nome||'—'}</td><td>${p.lider||'—'}</td><td>${p.horario||'—'}</td></tr>`).join('')}
    </tbody></table>`;
  } catch (e) { el.innerHTML = '<div style="color:var(--rose);font-size:12px;padding:20px 0;text-align:center">Erro ao carregar.</div>'; }
}

function pgsConfigLoad() {
  const el = document.getElementById('pgs-config-content');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;max-width:480px">
      <div style="font-size:13px;color:var(--tx1);font-weight:500">Módulo de Pequenos Grupos</div>
      <div style="font-size:12px;color:var(--tx2)">Gerencie as configurações gerais do módulo de PGs, incluindo regras de visitantes, estudos e relatórios.</div>
      <div style="border-top:1px solid var(--bd1);padding-top:12px;font-size:12px;color:var(--tx3)">
        Configurações avançadas em desenvolvimento.
      </div>
    </div>`;
}

if (typeof VIEW_AUTOLOAD !== "undefined") {
  VIEW_AUTOLOAD["pgs-dash"]         = { fn: () => pgsDashLoad() };
  VIEW_AUTOLOAD["pgs-encontros"]    = { tab:"PG_ENCONTROS",    id:"pgs-enc-list" };
  VIEW_AUTOLOAD["pgs-participantes"]= { tab:"PG_PARTICIPANTES",id:"pgs-part-list" };
  VIEW_AUTOLOAD["pgs-estudos"]      = { tab:"ESTUDOS",         id:"pgs-est-list" };
  VIEW_AUTOLOAD["pgs-relatorios"]   = { tab:"PG_RELATORIOS",   id:"pgs-rel-list" };
  VIEW_AUTOLOAD["pgs-oracao"]       = { tab:"DEMANDAS",        id:"pgs-ora-list", filtro:{area:"PGs"} };
  VIEW_AUTOLOAD["pgs-historico"]    = { tab:"PGS",             id:"pgs-hist-list" };
  VIEW_AUTOLOAD["pgs-lideranca"]    = { fn: () => pgsLiderancaLoad() };
  VIEW_AUTOLOAD["pgs-membros"]      = { tab:"PG_PARTICIPANTES", id:"pgs-mem-list" };
  VIEW_AUTOLOAD["pgs-config"]       = { fn: () => pgsConfigLoad() };
}
