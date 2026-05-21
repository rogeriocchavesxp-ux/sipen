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
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd2)">
          <div style="width:30px;height:30px;border-radius:50%;background:var(--bg1);border:1px solid var(--bd2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--tx2);flex-shrink:0">${_esc(nome.trim()[0]?.toUpperCase() || "?")}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(nome)}</div>
            <div style="font-size:10.5px;color:var(--tx3)">${tel ? _esc(tel) : "⚠ Sem número"}</div>
          </div>
          <span style="font-size:11px">${apto ? "✅" : (!r.ativo ? "⛔" : "⚠")}</span>
        </div>`;
    }).join("");

    const vazio = `
      <div style="padding:12px;background:var(--bg2);border-radius:8px;font-size:11px;color:var(--gold);cursor:pointer"
           onclick="WA_CFG.abrirResponsaveisModal('${_esc(key)}')">
        ⚠ Nenhum responsável — clique em "Gerenciar" para adicionar
      </div>`;

    return `
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="ctit" style="margin:0">Receberão mensagens</div>
          <span style="font-size:11.5px;color:var(--sky);cursor:pointer;font-weight:600"
                onclick="WA_CFG.abrirResponsaveisModal('${_esc(key)}')">+ Gerenciar</span>
        </div>
        ${resps.length ? linhas : vazio}
      </div>`;
  }

  function _renderTemplates(key, tpls, cfg) {
    const linhas = tpls.map(t => `
      <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bd2)">
        <span style="color:${t.ativo ? "var(--gr)" : "var(--tx3)"};font-size:12px">${t.ativo ? "✅" : "⬜"}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:11.5px;font-weight:600;color:var(--tx1)">${_esc(t.titulo || t.chave)}</div>
          <div style="font-size:10px;color:var(--tx3);font-family:var(--mono)">${_esc(t.chave)}</div>
        </div>
      </div>`).join("");

    const vazio = `<div style="font-size:11px;color:var(--tx3)">Nenhum template cadastrado para este módulo</div>`;

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
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="ctit" style="margin:0">Tipos de mensagem</div>
          <span style="font-size:11.5px;color:var(--sky);cursor:pointer;font-weight:600" onclick="go('config-whatsapp')">↗ Templates</span>
        </div>
        ${tpls.length ? linhas : vazio}
        ${toggleHtml}
      </div>`;
  }

  /* ── Logs de envio ────────────────────────────────── */

  function _renderLogs(logs) {
    if (!logs.length) return `
      <div class="card">
        <div class="ctit">Últimos envios</div>
        <div style="color:var(--tx3);font-size:12px;padding:16px 0;text-align:center">Nenhuma mensagem enviada ainda</div>
      </div>`;

    const SC = { enviado: "var(--gr)", pendente: "var(--gold)", erro: "var(--rose)" };
    const SL = { enviado: "Enviado",   pendente: "Pendente",    erro: "Erro" };

    const linhas = logs.map(r => `
      <tr style="border-bottom:1px solid var(--bd2)">
        <td style="padding:7px 10px;color:var(--tx3);font-size:11px;white-space:nowrap">${_dt(r.criado_em)}</td>
        <td style="padding:7px 10px;font-size:11.5px;font-family:var(--mono)">${_esc(r.para_numero || "—")}</td>
        <td style="padding:7px 10px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--tx2)" title="${_esc(r.mensagem || "")}">${_esc((r.mensagem || "").slice(0, 80))}</td>
        <td style="padding:7px 10px;text-align:center">
          <span style="font-size:10.5px;font-weight:700;color:${SC[r.status] || "var(--tx3)"}">${SL[r.status] || _esc(r.status || "—")}</span>
        </td>
      </tr>`).join("");

    return `
      <div class="card">
        <div class="ctit" style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <span>Últimos envios</span>
          <span style="font-size:11px;color:var(--tx3)">(últimos 20)</span>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:11.5px">
            <thead>
              <tr style="border-bottom:1px solid var(--bd2)">
                <th style="text-align:left;padding:6px 10px;color:var(--tx3);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">Data/Hora</th>
                <th style="text-align:left;padding:6px 10px;color:var(--tx3);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em">Número</th>
                <th style="text-align:left;padding:6px 10px;color:var(--tx3);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em">Mensagem</th>
                <th style="text-align:center;padding:6px 10px;color:var(--tx3);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em">Status</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>
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
