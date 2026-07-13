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

if (typeof VIEW_AUTOLOAD !== "undefined") {
  VIEW_AUTOLOAD["pgs-dash"]         = { fn: () => pgsDashLoad() };
  VIEW_AUTOLOAD["pgs-encontros"]    = { tab:"PG_ENCONTROS",    id:"pgs-enc-list" };
  VIEW_AUTOLOAD["pgs-participantes"]= { tab:"PG_PARTICIPANTES",id:"pgs-part-list" };
  VIEW_AUTOLOAD["pgs-estudos"]      = { tab:"ESTUDOS",         id:"pgs-est-list" };
  VIEW_AUTOLOAD["pgs-relatorios"]   = { tab:"PG_RELATORIOS",   id:"pgs-rel-list" };
  VIEW_AUTOLOAD["pgs-oracao"]       = { tab:"DEMANDAS",        id:"pgs-ora-list", filtro:{area:"PGs"} };
  VIEW_AUTOLOAD["pgs-historico"]    = { tab:"PGS",             id:"pgs-hist-list" };
}
