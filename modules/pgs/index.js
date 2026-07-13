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
  VIEW_AUTOLOAD["pgs-sorteio"]      = { fn: () => pgsSorteioLoad() };
}

/* ══════════════════════════════════════════════════════════
   FAMÍLIA DE ORAÇÃO — SORTEIO SEMANAL
══════════════════════════════════════════════════════════ */

let _sorteioRascunho = []; // pares em memória antes de salvar

function _pgsShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function _fmtDataBRSorteio(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Carrega histórico de rodadas
async function pgsSorteioLoad() {
  const el = document.getElementById("pgs-sorteio-lista");
  if (!el) return;
  el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px">Carregando...</div>`;
  try {
    const url = `${apiBaseUrl()}/rest/v1/pgs_sorteio_rodadas`
      + `?select=id,data,descricao,criado_em,pares:pgs_sorteio_pares(id,wa_enviado,pg:pg_id(id,nome),ora_por:ora_por_pg_id(id,nome,lider:lider_id(id,nome)))`
      + `&order=criado_em.desc&limit=20`;
    const res = await fetch(url, { headers: apiHeaders() });
    if (!res.ok) throw new Error(await res.text());
    const rodadas = await res.json();

    if (!rodadas.length) {
      el.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:8px 0">Nenhuma rodada registrada ainda.</div>`;
      return;
    }

    el.innerHTML = rodadas.map(r => {
      const total   = r.pares?.length || 0;
      const enviados = r.pares?.filter(p => p.wa_enviado).length || 0;
      const pares   = (r.pares || []).map(p =>
        `<tr>
          <td style="padding:5px 8px">${p.pg?.nome || "—"}</td>
          <td style="padding:5px 8px;color:var(--tx3)">ora por</td>
          <td style="padding:5px 8px"><strong>${p.ora_por?.nome || "—"}</strong></td>
          <td style="padding:5px 8px;color:var(--tx3);font-size:11px">${p.ora_por?.lider?.nome || "—"}</td>
          <td style="padding:5px 8px;text-align:center">${p.wa_enviado ? `<span style="color:var(--gr);font-size:11px">✓ Enviado</span>` : `<span style="color:var(--tx3);font-size:11px">Pendente</span>`}</td>
          <td style="padding:5px 8px">
            ${!p.wa_enviado ? `<button class="tbt" style="font-size:11px;padding:3px 8px" onclick="pgsSendWApar('${p.id}','${(p.ora_por?.lider?.nome||'').replace(/'/g,"\\'")}','${(p.pg?.nome||'').replace(/'/g,"\\'")}','${(p.ora_por?.nome||'').replace(/'/g,"\\'")}')">WhatsApp</button>` : ""}
          </td>
        </tr>`
      ).join("");

      return `<details style="margin-bottom:12px;border:1px solid var(--bd);border-radius:8px;overflow:hidden">
        <summary style="padding:10px 14px;cursor:pointer;font-size:13px;font-weight:600;display:flex;justify-content:space-between;align-items:center;background:var(--bg);list-style:none">
          <span>Rodada de ${_fmtDataBRSorteio(r.data)}${r.descricao ? " — " + r.descricao : ""}</span>
          <span style="font-size:11.5px;font-weight:400;color:${enviados===total&&total>0?'var(--gr)':'var(--tx3)'}">
            ${enviados}/${total} WhatsApp enviados
          </span>
        </summary>
        <div style="padding:0 8px 10px">
          <table style="width:100%;border-collapse:collapse;font-size:12.5px">
            <thead><tr style="border-bottom:1px solid var(--bd);color:var(--tx3);font-size:11px">
              <th style="padding:5px 8px;text-align:left;font-weight:500">Família</th>
              <th></th>
              <th style="padding:5px 8px;text-align:left;font-weight:500">Ora por</th>
              <th style="padding:5px 8px;text-align:left;font-weight:500">Responsável</th>
              <th style="padding:5px 8px;text-align:center;font-weight:500">WhatsApp</th>
              <th></th>
            </tr></thead>
            <tbody>${pares}</tbody>
          </table>
        </div>
      </details>`;
    }).join("");

  } catch (e) {
    el.innerHTML = `<div style="color:var(--rose);font-size:12px">Erro ao carregar: ${e.message}</div>`;
  }
}

// Gera novo sorteio (só em memória — exibe preview)
async function pgsGerarSorteio() {
  const prevEl = document.getElementById("pgs-sorteio-preview");
  const infoEl = document.getElementById("pgs-sorteio-preview-info");
  const tabEl  = document.getElementById("pgs-sorteio-preview-table");
  const errEl  = document.getElementById("pgs-sorteio-preview-err");
  if (!prevEl) return;

  if (infoEl) infoEl.textContent = "Buscando famílias ativas...";
  if (tabEl)  tabEl.innerHTML    = "";
  if (errEl)  errEl.textContent  = "";
  prevEl.style.display = "";
  prevEl.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const url = `${apiBaseUrl()}/rest/v1/pgs`
      + `?select=id,nome,lider:lider_id(id,nome,whatsapp,celular,telefone)`
      + `&status=eq.ativo&deleted_at=is.null&order=nome`;
    const res = await fetch(url, { headers: apiHeaders() });
    if (!res.ok) throw new Error(await res.text());
    const pgs = await res.json();

    if (pgs.length < 2) {
      if (infoEl) infoEl.textContent = "";
      if (errEl)  errEl.textContent  = "É necessário ao menos 2 famílias ativas para gerar um sorteio.";
      return;
    }

    const embaralhadas = _pgsShuffle(pgs);
    // Circular: posição i → ora pela família na posição (i+1) % n
    _sorteioRascunho = embaralhadas.map((pg, i) => ({
      pg_id:         pg.id,
      ora_por_pg_id: embaralhadas[(i + 1) % embaralhadas.length].id,
      pg_nome:       pg.nome,
      pg_lider_nome: pg.lider?.nome    || "—",
      pg_lider_wa:   pg.lider?.whatsapp || pg.lider?.celular || pg.lider?.telefone || null,
      ora_por_nome:  embaralhadas[(i + 1) % embaralhadas.length].nome,
    }));

    if (infoEl) infoEl.textContent = `${pgs.length} famílias ativas — sorteio circular gerado.`;

    if (tabEl) {
      tabEl.innerHTML =
        `<table style="width:100%;border-collapse:collapse;font-size:12.5px">
          <thead><tr style="border-bottom:1px solid var(--bd);color:var(--tx3);font-size:11px">
            <th style="padding:5px 8px;text-align:left;font-weight:500">Família</th>
            <th style="padding:5px 0;color:var(--tx3)"></th>
            <th style="padding:5px 8px;text-align:left;font-weight:500">Ora por</th>
            <th style="padding:5px 8px;text-align:left;font-weight:500">Responsável</th>
            <th style="padding:5px 8px;text-align:center;font-weight:500">WhatsApp</th>
          </tr></thead>
          <tbody>
            ${_sorteioRascunho.map(p =>
              `<tr style="border-bottom:1px solid var(--bd)">
                <td style="padding:7px 8px">${p.pg_nome}</td>
                <td style="padding:7px 4px;color:var(--tx3);font-size:11px">→</td>
                <td style="padding:7px 8px"><strong>${p.ora_por_nome}</strong></td>
                <td style="padding:7px 8px;color:var(--tx2);font-size:12px">${p.pg_lider_nome}</td>
                <td style="padding:7px 8px;text-align:center;font-size:11.5px">
                  ${p.pg_lider_wa ? `<span style="color:var(--gr)">✓</span>` : `<span style="color:var(--rose)">Sem número</span>`}
                </td>
              </tr>`
            ).join("")}
          </tbody>
        </table>`;
    }

    const semWA = _sorteioRascunho.filter(p => !p.pg_lider_wa).length;
    if (semWA && errEl) {
      errEl.textContent = `⚠ ${semWA} família(s) sem número de WhatsApp — não receberão a mensagem.`;
      errEl.style.color = "var(--amber)";
    }

  } catch (e) {
    if (errEl) { errEl.textContent = e.message; errEl.style.color = "var(--rose)"; }
    if (infoEl) infoEl.textContent = "";
  }
}

// Salva rodada no banco (com ou sem envio de WA)
async function pgsSalvarSorteio(enviarWA = false) {
  if (!_sorteioRascunho.length) return;
  const errEl  = document.getElementById("pgs-sorteio-preview-err");
  const btnSW  = document.getElementById("btn-sorteio-salvar-wa");
  const btnS   = document.getElementById("btn-sorteio-salvar");
  if (btnSW) btnSW.disabled = true;
  if (btnS)  btnS.disabled  = true;
  if (errEl) { errEl.textContent = "Salvando..."; errEl.style.color = "var(--tx3)"; }

  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/rpc/pgs_salvar_sorteio`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_pares: _sorteioRascunho.map(p => ({
          pg_id:         p.pg_id,
          ora_por_pg_id: p.ora_por_pg_id,
        })),
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (!data.ok) throw new Error("Falha ao salvar rodada.");

    if (enviarWA) await _pgsSendTodosWA(data.rodada_id);

    pgsCancelarSorteio();
    pgsSorteioLoad();
    if (errEl) { errEl.textContent = ""; }

  } catch (e) {
    if (errEl) { errEl.textContent = e.message; errEl.style.color = "var(--rose)"; }
    if (btnSW) btnSW.disabled = false;
    if (btnS)  btnS.disabled  = false;
  }
}

async function pgsSalvarESendWA() {
  await pgsSalvarSorteio(true);
}

function pgsCancelarSorteio() {
  _sorteioRascunho = [];
  const el = document.getElementById("pgs-sorteio-preview");
  if (el) el.style.display = "none";
}

// Envia WA para todos os pares do rascunho atual
async function _pgsSendTodosWA(rodadaId) {
  for (const p of _sorteioRascunho) {
    if (!p.pg_lider_wa) continue;
    const primeiroNome = (p.pg_lider_nome || "").split(" ")[0];
    const msg =
      `Olá ${primeiroNome}! Esta semana a família *${p.pg_nome}* irá orar pela família *${p.ora_por_nome}*. ` +
      `Que Deus abençoe essa corrente de oração!`;
    try {
      await WA.send({
        para:        p.pg_lider_wa,
        nome:        p.pg_lider_nome,
        mensagem:    msg,
        modulo:      "PGS",
        referenciaT: "pgs_sorteio_pares",
        chave:       `SORTEIO_${rodadaId}_${p.pg_id}`,
      });
    } catch (_) {}
  }
}

// Envia WA para um par individual (já salvo no banco)
async function pgsSendWApar(parId, liderNome, pgNome, oraPorNome) {
  const primeiroNome = (liderNome || "").split(" ")[0];
  const msg =
    `Olá ${primeiroNome}! Esta semana a família *${pgNome}* irá orar pela família *${oraPorNome}*. ` +
    `Que Deus abençoe essa corrente de oração!`;

  // Busca o número de WA do líder via par_id
  try {
    const url = `${apiBaseUrl()}/rest/v1/pgs_sorteio_pares`
      + `?id=eq.${parId}&select=pg:pg_id(lider:lider_id(whatsapp,celular,telefone))`;
    const res = await fetch(url, { headers: apiHeaders() });
    const rows = await res.json();
    const lider = rows?.[0]?.pg?.lider;
    const tel   = lider?.whatsapp || lider?.celular || lider?.telefone;
    if (!tel) { T("Sem número", "Este responsável não tem WhatsApp cadastrado."); return; }

    await WA.send({
      para:        tel,
      nome:        liderNome,
      mensagem:    msg,
      modulo:      "PGS",
      referenciaT: "pgs_sorteio_pares",
      referenciaId: parId,
      chave:       `SORTEIO_PAR_${parId}`,
    });

    // Marca como enviado
    await fetch(`${apiBaseUrl()}/rest/v1/rpc/pgs_marcar_wa_enviado`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_par_id: parId }),
    });

    pgsSorteioLoad();
  } catch (e) { T("Erro", e.message); }
}
