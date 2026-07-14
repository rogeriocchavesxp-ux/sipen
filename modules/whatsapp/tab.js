/* ═══════════════════════════════════════════════════════
   SIPEN — WhatsApp Tab Component
   tab.js · v1.0

   Aba WhatsApp genérica reutilizada em todos os módulos.
   Registra VIEW_AUTOLOAD para cada módulo.
   Depende de: WA_CFG (config.js), supabase globals
═══════════════════════════════════════════════════════ */

const WA_TAB = (function () {

  /* ── Helpers ──────────────────────────────────────── */

  function _base() { return (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "").trim().replace(/\/$/, ""); }

  function _headers() {
    const token = typeof sipenToken === "function" ? sipenToken() : (typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "");
    return {
      "apikey":        typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "",
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
    };
  }

  async function _fetch(path, opts = {}) {
    try {
      const res = await fetch(_base() + path, { headers: _headers(), ...opts });
      if (!res.ok) return null;
      const ct = res.headers.get("content-type") || "";
      return ct.includes("json") ? await res.json() : null;
    } catch { return null; }
  }

  function _esc(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function _dt(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  /* ── Meta por módulo ──────────────────────────────── */

  const MODULO_META = {
    AGENDA:        { label: "Agenda",            ic: "🗓",  cor: "var(--teal)",   bg: "rgba(42,181,192,0.12)"   },
    DEMANDAS:      { label: "Demandas",           ic: "📋",  cor: "var(--rose)",   bg: "rgba(224,85,85,0.12)"    },
    PASTORAL:      { label: "Pastoral",           ic: "✦",   cor: "var(--teal)",   bg: "rgba(42,181,192,0.12)"   },
    MINISTERIAL:   { label: "Departamentos",      ic: "◉",   cor: "var(--violet)", bg: "rgba(139,111,212,0.12)"  },
    MEMBRESIA:     { label: "Membresia",          ic: "✝",   cor: "var(--gbr)",    bg: "rgba(82,196,110,0.12)"   },
    FINANCEIRO:    { label: "Financeiro",         ic: "💰",  cor: "var(--gr)",     bg: "rgba(58,170,92,0.12)"    },
    CONSELHO:      { label: "Conselho",           ic: "◈",   cor: "var(--sky)",    bg: "rgba(74,156,245,0.12)"   },
    JUNTA_DIACONAL:{ label: "Junta Diaconal",     ic: "✚",   cor: "var(--copper)", bg: "rgba(184,122,86,0.12)"   },
    INFRAESTRUTURA:{ label: "Infraestrutura",     ic: "🛠",  cor: "var(--amber)",  bg: "rgba(208,144,64,0.12)"   },
    JURIDICO:      { label: "Jurídico",           ic: "⚖",   cor: "var(--blue)",   bg: "rgba(74,156,245,0.12)"   },
    COMUNICACAO:   { label: "Comunicação",        ic: "📢",  cor: "var(--violet)", bg: "rgba(139,111,212,0.12)"  },
    EVENTOS:       { label: "Eventos",            ic: "🎪",  cor: "var(--sky)",    bg: "rgba(74,156,245,0.12)"   },
  };

  /* ── Carregar tudo ────────────────────────────────── */

  async function load(modulo) {
    const key = modulo.toUpperCase();
    const el  = document.getElementById("wa-tab-" + key);
    if (!el) return;

    el.innerHTML = `<div style="color:var(--tx3);text-align:center;padding:40px;font-size:13px">Carregando...</div>`;

    const hoje = new Date().toISOString().split("T")[0];

    const [config, responsaveis, templates, envios] = await Promise.all([
      _fetch(`/rest/v1/whatsapp_modulo_config?modulo=eq.${encodeURIComponent(key)}&select=*`),
      _fetch(`/rest/v1/whatsapp_modulo_responsaveis?modulo=eq.${encodeURIComponent(key)}&select=id,ativo,pessoas(nome,celular,whatsapp,telefone)&order=pessoas(nome)`),
      _fetch(`/rest/v1/whatsapp_templates?modulo=eq.${encodeURIComponent(key)}&select=titulo,chave,ativo&order=titulo`),
      _fetch(`/rest/v1/whatsapp_mensagens?modulo=eq.${encodeURIComponent(key)}&select=para_numero,mensagem,status,criado_em&order=criado_em.desc&limit=20`),
    ]);

    const cfg        = Array.isArray(config) ? config[0] : null;
    const resps      = Array.isArray(responsaveis) ? responsaveis : [];
    const tpls       = Array.isArray(templates) ? templates : [];
    const logs       = Array.isArray(envios) ? envios : [];
    const aptos      = resps.filter(r => r.ativo && (r.pessoas?.whatsapp || r.pessoas?.celular || r.pessoas?.telefone)).length;
    const enviodHoje = logs.filter(l => l.criado_em?.startsWith(hoje)).length;
    const tplsAtivos = tpls.filter(t => t.ativo).length;

    el.innerHTML = `
      ${_renderKpis(cfg, resps.length, aptos, enviodHoje, tplsAtivos)}
      ${_renderGrid(key, resps, tpls, cfg)}
      ${_renderLogs(logs)}
    `;
  }

  /* ── KPIs ─────────────────────────────────────────── */

  function _renderKpis(cfg, total, aptos, enviodHoje, tplsAtivos) {
    const ativo = cfg?.ativo;
    const statusBg  = ativo ? "rgba(58,170,92,0.12)"  : "rgba(224,85,85,0.12)";
    const statusCor = ativo ? "var(--gr)"              : "var(--rose)";
    const statusTxt = cfg === null ? "Não configurado" : (ativo ? "Ativo" : "Pausado");
    const statusIco = cfg === null ? "⚙" : (ativo ? "🟢" : "🔴");

    return `
      <div class="kpis c4" style="margin-bottom:16px">
        <div class="kpi">
          <div class="kpi-ico" style="background:${statusBg}">${statusIco}</div>
          <div class="kpi-body">
            <div class="kpi-lbl">Status WhatsApp</div>
            <div class="kpi-val" style="color:${statusCor}">${statusTxt}</div>
          </div>
        </div>
        <div class="kpi">
          <div class="kpi-ico" style="background:rgba(74,156,245,0.12)">👥</div>
          <div class="kpi-body">
            <div class="kpi-lbl">Responsáveis</div>
            <div class="kpi-val">${aptos}<span style="font-size:11px;color:var(--tx3)">/${total} aptos</span></div>
          </div>
        </div>
        <div class="kpi">
          <div class="kpi-ico" style="background:rgba(58,170,92,0.12)">📨</div>
          <div class="kpi-body">
            <div class="kpi-lbl">Enviados hoje</div>
            <div class="kpi-val">${enviodHoje}</div>
          </div>
        </div>
        <div class="kpi">
          <div class="kpi-ico" style="background:rgba(208,144,64,0.12)">📋</div>
          <div class="kpi-body">
            <div class="kpi-lbl">Templates ativos</div>
            <div class="kpi-val">${tplsAtivos}</div>
          </div>
        </div>
      </div>`;
  }

  /* ── Grid: responsáveis + templates ──────────────── */

  function _renderGrid(key, resps, tpls, cfg) {
    return `
      <div class="g2" style="margin-bottom:16px">
        ${_renderResponsaveis(key, resps)}
        ${_renderTemplates(key, tpls, cfg)}
      </div>`;
  }

  function _renderResponsaveis(key, resps) {
    const linhas = resps.map(r => {
      const nome = r.pessoas?.nome || "—";
      const tel  = r.pessoas?.whatsapp || r.pessoas?.celular || r.pessoas?.telefone || "";
      const apto = r.ativo && !!tel;
      return `
        <div class="trow">
          <div class="tdot" style="background:${apto ? "var(--gr)" : (r.ativo ? "var(--gold)" : "var(--rose)")}"></div>
          <div class="tbody">
            <div class="ttitle">${_esc(nome)}</div>
            <div class="tmeta">${tel ? _esc(tel) : "Sem número cadastrado"}</div>
          </div>
          <span style="font-size:10px;color:${apto ? "var(--gr)" : "var(--tx3)"}">${apto ? "Apto" : (!r.ativo ? "Inativo" : "Sem número")}</span>
        </div>`;
    }).join("");

    const vazio = `<div class="empty-state" style="cursor:pointer;color:var(--gold)"
         onclick="WA_CFG.abrirResponsaveisModal('${_esc(key)}')">
      Nenhum responsável — clique para adicionar
    </div>`;

    return `
      <div class="card">
        <div class="ctit">Receberão mensagens <span class="cact" onclick="WA_CFG.abrirResponsaveisModal('${_esc(key)}')">+ Gerenciar</span></div>
        ${resps.length ? linhas : vazio}
      </div>`;
  }

  function _renderTemplates(key, tpls, cfg) {
    const linhas = tpls.map(t => `
      <div class="trow">
        <div class="tdot" style="background:${t.ativo ? "var(--gr)" : "var(--tx4)"}"></div>
        <div class="tbody">
          <div class="ttitle">${_esc(t.titulo || t.chave)}</div>
          <div class="tmeta" style="font-family:var(--mono)">${_esc(t.chave)}</div>
        </div>
        <span style="font-size:10px;color:${t.ativo ? "var(--gr)" : "var(--tx3)"}">${t.ativo ? "Ativo" : "Inativo"}</span>
      </div>`).join("");

    const vazio = `<div class="empty-state">Nenhum template cadastrado para este módulo</div>`;

    const toggleHtml = cfg ? `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid var(--bd1);margin-top:8px">
        <span style="font-size:11.5px;color:var(--tx2)">Notificações WhatsApp</span>
        <label class="wa-toggle">
          <input type="checkbox" ${cfg.ativo ? "checked" : ""} onchange="WA_CFG.toggleModulo('${_esc(key)}',this.checked);setTimeout(()=>WA_TAB.load('${_esc(key)}'),400)">
          <span></span>
        </label>
      </div>` : `
      <div style="padding:8px 0;border-top:1px solid var(--bd1);margin-top:8px;font-size:11px;color:var(--gold)">
        ⚙ Módulo não configurado no painel WhatsApp
      </div>`;

    return `
      <div class="card">
        <div class="ctit">Notificações <span class="cact" onclick="go('config-whatsapp')">↗ Templates</span></div>
        ${tpls.length ? linhas : vazio}
        ${toggleHtml}
      </div>`;
  }

  /* ── Logs de envio ────────────────────────────────── */

  function _renderLogs(logs) {
    const SC = { enviado: "var(--gr)", pendente: "var(--gold)", erro: "var(--rose)" };
    const SL = { enviado: "Enviado",   pendente: "Pendente",    erro: "Erro" };

    return `
      <div class="card">
        <div class="ctit">Últimos envios <span class="csub">(${logs.length})</span></div>
        ${!logs.length
          ? `<div class="empty-state">Nenhuma mensagem enviada ainda</div>`
          : `<div class="tbl-wrap"><table class="tbl">
            <thead><tr>
              <th style="white-space:nowrap">Data/Hora</th>
              <th>Número</th>
              <th>Mensagem</th>
              <th class="r">Status</th>
            </tr></thead>
            <tbody>${logs.map(r => `
              <tr>
                <td class="wa" style="color:var(--tx3)">${_dt(r.criado_em)}</td>
                <td class="mono">${_esc(r.para_numero || "—")}</td>
                <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_esc(r.mensagem || "")}">${_esc((r.mensagem || "").slice(0, 60))}${(r.mensagem || "").length > 60 ? "…" : ""}</td>
                <td class="r"><span style="font-size:10.5px;font-weight:700;color:${SC[r.status] || "var(--tx3)"}">${SL[r.status] || _esc(r.status || "—")}</span></td>
              </tr>`).join("")}
            </tbody>
          </table></div>`}
      </div>`;
  }

  /* ── VIEW_AUTOLOAD ────────────────────────────────── */

  const MODULO_VIEWS = {
    "agenda-whatsapp":         "AGENDA",
    "dem-whatsapp":            "DEMANDAS",
    "pastoral-whatsapp":       "PASTORAL",
    "min-whatsapp":            "MINISTERIAL",
    "memb-whatsapp":           "MEMBRESIA",
    "fin-whatsapp":            "FINANCEIRO",
    "conselho-whatsapp":       "CONSELHO",
    "diac-whatsapp":           "JUNTA_DIACONAL",
    "infra-whatsapp":          "INFRAESTRUTURA",
    "jur-whatsapp":            "JURIDICO",
  };

  Object.entries(MODULO_VIEWS).forEach(([viewId, moduloKey]) => {
    VIEW_AUTOLOAD[viewId] = { fn: () => load(moduloKey) };
  });

  /* ── API pública ──────────────────────────────────── */
  return { load };

})();

window.WA_TAB = WA_TAB;
