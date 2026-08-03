/* ═══════════════════════════════════════════════════════
   SIPEN — WhatsApp Tab Component
   tab.js · v1.1

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
    EVENTOS:       { label: "Eventos",            ic: "🎉",  cor: "var(--sky)",    bg: "rgba(74,156,245,0.12)"   },
  };

  /* ── Carregar tudo ────────────────────────────────── */

  async function load(modulo) {
    const key = modulo.toUpperCase();
    const el  = document.getElementById("wa-tab-" + key);
    if (!el) return;

    el.innerHTML = `<div style="color:var(--tx3);text-align:center;padding:40px;font-size:13px">Carregando...</div>`;

    const hoje = new Date().toISOString().split("T")[0];

    const [config, responsaveis, templates, envios, countHoje] = await Promise.all([
      _fetch(`/rest/v1/whatsapp_modulo_config?modulo=eq.${encodeURIComponent(key)}&select=*`),
      _fetch(`/rest/v1/whatsapp_modulo_responsaveis?modulo=eq.${encodeURIComponent(key)}&select=id,ativo,pessoas(nome,celular,whatsapp,telefone)&order=pessoas(nome)`),
      _fetch(`/rest/v1/whatsapp_templates?modulo=eq.${encodeURIComponent(key)}&select=titulo,chave,ativo&order=titulo`),
      _fetch(`/rest/v1/whatsapp_mensagens?modulo=eq.${encodeURIComponent(key)}&select=id,para_numero,para_nome,mensagem,status,criado_em&order=criado_em.desc&limit=500`),
      _fetch(`/rest/v1/whatsapp_mensagens?modulo=eq.${encodeURIComponent(key)}&select=id&status=eq.enviado&criado_em=gte.${hoje}T00:00:00`),
    ]);

    const cfg        = Array.isArray(config) ? config[0] : null;
    const resps      = Array.isArray(responsaveis) ? responsaveis : [];
    const tpls       = Array.isArray(templates) ? templates : [];
    const logs       = Array.isArray(envios) ? envios : [];
    const aptos      = resps.filter(r => r.ativo && (r.pessoas?.whatsapp || r.pessoas?.celular || r.pessoas?.telefone)).length;
    const enviodHoje = Array.isArray(countHoje) ? countHoje.length : logs.filter(l => l.criado_em?.startsWith(hoje)).length;
    const tplsAtivos = tpls.filter(t => t.ativo).length;

    let anivHtml = "";
    if (key === "MEMBRESIA") {
      const [listasRes, agendRec] = await Promise.all([
        _fetch("/rest/v1/wa_listas?ativo=eq.true&select=id,nome,icone&order=nome"),
        _fetch("/rest/v1/wa_agendamentos?tipo=eq.aniversariantes&recorrente=eq.true&status=eq.pendente&select=id,lista_nome,horario_diario,ultimo_envio_em&order=criado_em.desc&limit=1"),
      ]);
      anivHtml = _renderAnivCard(Array.isArray(listasRes) ? listasRes : [], Array.isArray(agendRec) ? agendRec[0] : null);
    }

    el.innerHTML = `
      ${_renderKpis(cfg, resps.length, aptos, enviodHoje, tplsAtivos)}
      ${anivHtml}
      ${_renderGrid(key, resps, tpls, cfg)}
      ${_renderLogs(logs, key)}
    `;

    if (key === "MEMBRESIA" && typeof anivVerificarAgendamentoPendente === "function") {
      anivVerificarAgendamentoPendente();
    }
  }

  /* ── Aniversariantes do Dia (MEMBRESIA) ──────────── */

  function _renderAnivCard(listas, agendAtivo) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const jaEnviouHoje = agendAtivo?.ultimo_envio_em?.slice(0, 10) === todayStr;

    const listasOpts = listas.length
      ? listas.map(l => `<option value="${_esc(l.id)}">${_esc(l.icone || "📋")} ${_esc(l.nome)}</option>`).join("")
      : `<option value="">Nenhuma lista cadastrada</option>`;

    const agendBanner = agendAtivo ? `
      <div style="margin-bottom:12px;padding:8px 12px;border-radius:7px;background:rgba(${jaEnviouHoje ? "58,170,92" : "208,144,64"},.08);border:1px solid rgba(${jaEnviouHoje ? "58,170,92" : "208,144,64"},.2);font-size:11.5px;color:var(--${jaEnviouHoje ? "gr" : "gold"})">
        ${jaEnviouHoje
          ? `✓ Enviado hoje para "${_esc(agendAtivo.lista_nome)}" · próximo envio amanhã às ${_esc(agendAtivo.horario_diario || "08:00")}`
          : `⏰ Agendamento diário ativo: "${_esc(agendAtivo.lista_nome)}" às ${_esc(agendAtivo.horario_diario || "08:00")} — aguardando disparo`
        }
      </div>` : "";

    return `
      <div class="card" style="margin-bottom:16px;border:1.5px solid rgba(212,168,67,0.3);border-left:4px solid var(--gold)">
        <div class="ctit" style="color:var(--gold)">🎂 Aniversariantes do Dia</div>
        <div style="font-size:11.5px;color:var(--tx3);margin-bottom:14px">Envie a lista de aniversariantes de hoje para responsáveis e líderes</div>
        ${agendBanner}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Lista destinatária</div>
            <select id="wa-aniv-lista" style="width:100%;padding:7px 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px;outline:none;margin-bottom:14px">
              <option value="">— Selecionar lista —</option>
              ${listasOpts}
            </select>

            <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Agendamento diário</div>
            <label style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--tx2);cursor:pointer;margin-bottom:8px">
              <input type="checkbox" id="wa-aniv-recorrente" onchange="document.getElementById('wa-aniv-horario-row').style.display=this.checked?'flex':'none'" style="cursor:pointer">
              Repetir todos os dias
            </label>
            <div id="wa-aniv-horario-row" style="display:none;align-items:center;gap:8px;margin-bottom:14px">
              <span style="font-size:11.5px;color:var(--tx3)">Horário:</span>
              <input type="time" id="wa-aniv-horario" value="08:00" style="padding:5px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px;outline:none">
            </div>

            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button onclick="anivWaEnviarAgora()" style="padding:8px 18px;border-radius:7px;border:1px solid rgba(212,168,67,.4);background:rgba(212,168,67,.1);color:var(--gold);font-size:12px;font-weight:700;cursor:pointer">📨 Enviar agora</button>
              <button onclick="anivWaAgendar()" style="padding:8px 16px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--tx2);font-size:12px;font-weight:700;cursor:pointer">⏰ Agendar</button>
            </div>
          </div>

          <div>
            <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Preview da mensagem</div>
            <div style="padding:12px 14px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-surface);font-size:11.5px;color:var(--tx2);line-height:1.7;white-space:pre-wrap;font-family:var(--mono)">🎂 *Aniversariantes de hoje — ${today.toLocaleDateString("pt-BR")}*\n\n• [nomes e telefones gerados no momento do envio]\n\n📋 https://sipen.com.br/aniversariantes\n_SIPEN · IPPenha_</div>
            <div style="margin-top:6px;font-size:10.5px;color:var(--tx3)">A mensagem é enviada individualmente para cada membro da lista selecionada</div>
          </div>
        </div>
      </div>`;
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

  function _renderLogs(logs, key) {
    const SC = { enviado: "var(--gr)", pendente: "var(--gold)", erro: "var(--rose)" };
    const SL = { enviado: "Enviado",   pendente: "Pendente",    erro: "Erro" };

    return `
      <div class="card">
        <div class="ctit">Histórico de envios <span class="csub">(${logs.length})</span></div>
        ${!logs.length
          ? `<div class="empty-state">Nenhuma mensagem enviada ainda</div>`
          : `<div class="tbl-wrap"><table class="tbl">
            <thead><tr>
              <th style="white-space:nowrap">Data/Hora</th>
              <th>Nome</th>
              <th>Número</th>
              <th>Mensagem</th>
              <th class="r">Status</th>
            </tr></thead>
            <tbody>${logs.map(r => {
              const podeReenviar = r.status === "erro" || r.status === "pendente";
              const reenviarBtn  = podeReenviar
                ? `<button
                     style="margin-left:8px;font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid rgba(208,144,64,.4);background:rgba(208,144,64,.1);color:var(--amber);cursor:pointer;vertical-align:middle"
                     onclick="WA_TAB.reenviar(${JSON.stringify(r.id)},${JSON.stringify(r.para_numero)},${JSON.stringify(r.para_nome||'')},${JSON.stringify(r.mensagem||'')},${JSON.stringify(key||'')},this)"
                   >Reenviar</button>`
                : "";
              const msgCurta = (r.mensagem || "").slice(0, 55);
              const temMais  = (r.mensagem || "").length > 55;
              return `
              <tr>
                <td class="wa" style="color:var(--tx3);white-space:nowrap">${_dt(r.criado_em)}</td>
                <td style="font-size:12px;font-weight:500;color:var(--tx1);white-space:nowrap">${_esc(r.para_nome || "—")}</td>
                <td class="mono" style="color:var(--tx3)">${_esc(r.para_numero || "—")}</td>
                <td style="max-width:240px">
                  <span style="font-size:12px;color:var(--tx2)">${_esc(msgCurta)}${temMais ? "…" : ""}</span>
                  ${temMais ? `<button
                    style="margin-left:6px;font-size:10px;padding:1px 6px;border-radius:4px;border:1px solid var(--bd1);background:var(--bg-surface);color:var(--tx3);cursor:pointer;vertical-align:middle"
                    onclick="WA_TAB.verMensagem(${JSON.stringify(r.para_nome||'')},${JSON.stringify(r.criado_em||'')},${JSON.stringify(r.mensagem||'')})"
                  >ver</button>` : ""}
                </td>
                <td class="r" style="white-space:nowrap">
                  <span style="font-size:10.5px;font-weight:700;color:${SC[r.status] || "var(--tx3)"}">${SL[r.status] || _esc(r.status || "—")}</span>
                  ${reenviarBtn}
                </td>
              </tr>`;
            }).join("")}
            </tbody>
          </table></div>`}
      </div>`;
  }

  /* ── Reenvio de mensagem com falha ────────────────── */

  async function reenviar(id, numero, nome, mensagem, modulo, btn) {
    if (btn) { btn.disabled = true; btn.textContent = "…"; }
    try {
      if (typeof WA === "undefined") throw new Error("WA não definido");
      const chave = `REENVIO_${id}_${Date.now()}`;
      const res = await WA.send({ para: numero, nome: nome || "", mensagem, modulo, chave });
      if (res.ok || res.status === "enviado" || res.status === "pendente") {
        if (typeof T === "function") T("Reenviado", "Mensagem encaminhada com sucesso");
      } else {
        if (typeof T === "function") T("Erro ao reenviar", res.error || res.status || "Tente novamente");
        if (btn) { btn.disabled = false; btn.textContent = "Reenviar"; }
        return;
      }
    } catch (e) {
      if (typeof T === "function") T("Erro ao reenviar", e.message || "Tente novamente");
      if (btn) { btn.disabled = false; btn.textContent = "Reenviar"; }
      return;
    }
    await load(modulo);
  }

  /* ── Modal leitura de mensagem ───────────────────── */

  function verMensagem(nome, criadoEm, mensagem) {
    const exist = document.getElementById("wa-msg-modal");
    if (exist) exist.remove();

    const data = criadoEm ? new Date(criadoEm).toLocaleString("pt-BR") : "";
    const div  = document.createElement("div");
    div.id = "wa-msg-modal";
    div.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:20px";
    div.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--bd1);border-radius:12px;width:100%;max-width:480px;box-shadow:0 8px 40px rgba(0,0,0,.25);overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--tx1)">${_esc(nome || "—")}</div>
            <div style="font-size:11px;color:var(--tx3);margin-top:2px">${_esc(data)}</div>
          </div>
          <button onclick="document.getElementById('wa-msg-modal').remove()"
            style="width:28px;height:28px;border-radius:50%;border:1px solid var(--bd1);background:var(--bg-surface);cursor:pointer;font-size:14px;color:var(--tx3);display:flex;align-items:center;justify-content:center">✕</button>
        </div>
        <div style="padding:18px;max-height:60vh;overflow-y:auto">
          <pre style="font-family:var(--mono,monospace);font-size:12.5px;color:var(--tx2);white-space:pre-wrap;word-break:break-word;margin:0;line-height:1.6">${_esc(mensagem || "")}</pre>
        </div>
      </div>`;
    div.addEventListener("click", e => { if (e.target === div) div.remove(); });
    document.body.appendChild(div);
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
  return { load, reenviar, verMensagem };

})();

window.WA_TAB = WA_TAB;
