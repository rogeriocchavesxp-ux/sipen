/* ═══════════════════════════════════════════════════════
   SIPEN — WhatsApp Admin Panel
   config-whatsapp.js · v2.0

   Painel administrativo: status, módulos, histórico, templates.
   Depende de: whatsapp.js (WA), supabase globals (SUPABASE_URL, SUPABASE_ANON_KEY, sipenToken)
═══════════════════════════════════════════════════════ */

const WA_CFG = (function(){

  /* ── Helpers ─────────────────────────────────── */

  function _base(){ return (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "").trim().replace(/\/$/,""); }

  function _headers(){
    const token = typeof sipenToken === "function" ? sipenToken() : (typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "");
    return {
      "apikey":        typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "",
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
      "Prefer":        "return=representation",
    };
  }

  async function _fetch(path, opts = {}){
    try{
      const res = await fetch(_base() + path, { headers: _headers(), ...opts });
      if(!res.ok) return null;
      const ct = res.headers.get("content-type") || "";
      return ct.includes("json") ? await res.json() : null;
    }catch{ return null; }
  }

  function _dt(iso){
    if(!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  }

  function _esc(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  /* ── Status da instância ─────────────────────────────── */

  async function carregarStatus(){
    const el  = document.getElementById("wa-kpi-status");
    const ico = document.getElementById("wa-kpi-ico-status");
    if(!el) return;

    el.textContent = "...";
    const s = await WA.status();

    if(s.conectado){
      el.textContent = "Configurado";
      el.style.color = "var(--gr)";
      if(ico){ ico.textContent = "🟢"; ico.style.background = "rgba(58,170,92,0.12)"; }
    } else {
      const label = s.estado === "sem_chave" ? "Sem chave"
                  : s.estado === "chave_invalida" ? "Chave inválida"
                  : s.estado === "erro_conexao"   ? "Sem conexão"
                  : "Não configurado";
      el.textContent = label;
      el.style.color = "var(--rose)";
      if(ico){ ico.textContent = "🔴"; ico.style.background = "rgba(224,85,85,0.12)"; }
    }
  }

  async function carregarKpis(){
    const hoje = new Date().toISOString().split("T")[0];
    const [enviados, erros] = await Promise.all([
      _fetch(`/rest/v1/whatsapp_mensagens?select=id&status=eq.enviado&criado_em=gte.${hoje}T00:00:00`),
      _fetch(`/rest/v1/whatsapp_mensagens?select=id&status=eq.erro&criado_em=gte.${hoje}T00:00:00`),
    ]);
    const kHoje  = document.getElementById("wa-kpi-hoje");
    const kErros = document.getElementById("wa-kpi-erros");
    if(kHoje)  kHoje.textContent  = Array.isArray(enviados) ? enviados.length : "—";
    if(kErros){ kErros.textContent = Array.isArray(erros) ? erros.length : "—";
      if(kErros.textContent !== "0" && kErros.textContent !== "—")
        kErros.style.color = "var(--rose)";
    }
  }

  /* ── Módulos ──────────────────────────────────────────── */

  const MODULO_META = {
    DEMANDAS:      { ic:"📋", bg:"rgba(224,85,85,0.12)",    cor:"var(--rose)",   cat:"Administrativo",  eventos:["Nova demanda","Mudança de status","Atribuição"] },
    FINANCEIRO:    { ic:"💰", bg:"rgba(58,170,92,0.12)",    cor:"var(--gr)",     cat:"Administrativo",  eventos:["Pix confirmado","Aprovação","Solicitação financeira"] },
    AGENDA:        { ic:"📅", bg:"rgba(74,156,245,0.12)",   cor:"var(--sky)",    cat:"Administrativo",  eventos:["Novo agendamento","Lembrete","Cancelamento"] },
    SECRETARIA:    { ic:"🗂", bg:"rgba(208,144,64,0.12)",   cor:"var(--amber)",  cat:"Administrativo",  eventos:["Novo documento","Protocolo gerado"] },
    COMUNICACAO:   { ic:"📢", bg:"rgba(139,111,212,0.12)",  cor:"var(--violet)", cat:"Comunicação",     eventos:["Novo aviso","Transmissão","Publicação"] },
    PASTORAL:      { ic:"✝️", bg:"rgba(208,144,64,0.12)",   cor:"var(--amber)",  cat:"Pastoral",        eventos:["Pedido de oração","Visita pastoral","Aconselhamento"] },
    MINISTERIAL:   { ic:"🎵", bg:"rgba(139,111,212,0.12)",  cor:"var(--violet)", cat:"Pastoral",        eventos:["Escala publicada","Convocação"] },
    MEMBRESIA:     { ic:"👥", bg:"rgba(74,156,245,0.12)",   cor:"var(--sky)",    cat:"Membresia",       eventos:["Novo membro","Transferência","Atualização"] },
    CONSELHO:      { ic:"🏛", bg:"rgba(74,156,245,0.12)",   cor:"var(--sky)",    cat:"Governança",      eventos:["Decisão do Conselho","Documento aprovado","Reunião"] },
    JUNTA_DIACONAL:{ ic:"🤝", bg:"rgba(184,122,86,0.12)",   cor:"var(--copper)", cat:"Governança",      eventos:["Solicitação diaconal","Visita","Atendimento social"] },
    INFRAESTRUTURA:{ ic:"🔧", bg:"rgba(208,144,64,0.12)",   cor:"var(--amber)",  cat:"Operacional",     eventos:["Nova manutenção","Conclusão","Urgência"] },
    JURIDICO:      { ic:"⚖", bg:"rgba(74,156,245,0.12)",   cor:"var(--blue)",   cat:"Governança",      eventos:["Novo processo","Prazo","Documento jurídico"] },
    CULTO:         { ic:"🙏", bg:"rgba(208,144,64,0.12)",   cor:"var(--amber)",  cat:"Pastoral",        eventos:["Programação","Escala de culto"] },
    ENSINO:        { ic:"📖", bg:"rgba(74,156,245,0.12)",   cor:"var(--sky)",    cat:"Membresia",       eventos:["Material EBT","Convocação de aula"] },
    SOCIAL:        { ic:"🤝", bg:"rgba(58,170,92,0.12)",    cor:"var(--gr)",     cat:"Pastoral",        eventos:["Ação social","Distribuição","Cadastro"] },
  };

  const CAT_ORDER = ["Administrativo","Comunicação","Pastoral","Membresia"];

  async function carregarModulos(){
    const el = document.getElementById("wa-modulos-list");
    if(!el) return;
    el.innerHTML = `<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center;grid-column:1/-1">Carregando...</div>`;

    const [modulos, responsaveis] = await Promise.all([
      _fetch("/rest/v1/whatsapp_modulo_config?select=*&order=modulo"),
      _fetch("/rest/v1/whatsapp_modulo_responsaveis?select=id,modulo,ativo,pessoas(nome,celular,whatsapp,telefone)&order=modulo"),
    ]);

    if(!modulos){
      el.innerHTML = `<div style="color:var(--rose);font-size:13px;padding:32px 0;text-align:center;grid-column:1/-1">Erro ao carregar módulos</div>`;
      return;
    }
    if(!modulos.length){
      el.innerHTML = `<div style="color:var(--tx3);font-size:13px;padding:32px 0;text-align:center;grid-column:1/-1">Nenhum módulo configurado</div>`;
      return;
    }

    const respByModulo = {};
    (responsaveis || []).forEach(r => {
      const m = (r.modulo || "").toUpperCase();
      if(!respByModulo[m]) respByModulo[m] = [];
      respByModulo[m].push(r);
    });

    el.innerHTML = modulos.map(mod => _cardModulo(mod, respByModulo)).join("");
  }

  function _cardModulo(mod, respByModulo){
    const key  = (mod.modulo || "").toUpperCase();
    const meta = MODULO_META[key] || { ic:"💬", bg:"rgba(100,100,100,0.1)", cor:"var(--tx3)", cat:"Operacional", eventos:[] };
    const resp = respByModulo[key] || [];

    const aptos     = resp.filter(p => p.ativo && (p.pessoas?.whatsapp || p.pessoas?.celular || p.pessoas?.telefone)).length;
    const total     = resp.length;

    const badgeAtivo = mod.ativo
      ? `<span style="font-size:10px;padding:2px 8px;background:rgba(58,170,92,0.15);color:var(--gr);border-radius:20px;font-weight:700">Ativo</span>`
      : `<span style="font-size:10px;padding:2px 8px;background:rgba(224,85,85,0.12);color:var(--rose);border-radius:20px;font-weight:700">Pausado</span>`;

    const eventos = meta.eventos.map(e =>
      `<div style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--tx2)">
        <span style="color:var(--gr);font-size:10px">✓</span> ${_esc(e)}
      </div>`
    ).join("");

    return `
      <div class="card" style="display:flex;flex-direction:column;gap:0;transition:box-shadow .15s"
           onmouseenter="this.style.boxShadow='0 4px 18px rgba(0,0,0,.12)'"
           onmouseleave="this.style.boxShadow=''">

        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:${meta.bg};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${meta.ic}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:14px;color:var(--tx1);display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              ${_esc(mod.modulo)} ${badgeAtivo}
            </div>
            <div style="font-size:11px;color:var(--tx3);margin-top:2px">${_esc(mod.descricao||"")}</div>
          </div>
          <label class="wa-toggle" style="flex-shrink:0">
            <input type="checkbox" ${mod.ativo?"checked":""} onchange="WA_CFG.toggleModulo('${_esc(mod.modulo)}',this.checked)">
            <span></span>
          </label>
        </div>

        <span style="font-size:9.5px;color:var(--tx3);background:var(--bg2);padding:1px 8px;border-radius:20px;display:inline-block;margin-bottom:10px;width:fit-content">${meta.cat}</span>

        ${eventos ? `<div style="display:flex;flex-direction:column;gap:3px;margin-bottom:10px">${eventos}</div>` : ""}

        ${_renderResponsaveisModulo(resp, key)}

        <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--bd1);padding-top:8px;margin-top:auto">
          <span style="font-size:11px;color:var(--tx3)">
            👥 ${total ? `${aptos}/${total} aptos a receber` : "Nenhum responsável"}
          </span>
          <span style="font-size:11.5px;color:${meta.cor};cursor:pointer;font-weight:600"
                onclick="WA_CFG.abrirResponsaveisModal('${_esc(mod.modulo)}')">+ Gerenciar</span>
        </div>
      </div>`;
  }

  function _renderResponsaveisModulo(resp, modulo){
    if(!resp.length) return `
      <div style="padding:10px;background:var(--bg2);border-radius:8px;font-size:11px;color:var(--gold);margin-bottom:10px;cursor:pointer"
           onclick="WA_CFG.abrirResponsaveisModal('${_esc(modulo)}')">
        ⚠ Nenhum responsável — clique em "Gerenciar" para adicionar
      </div>`;

    const linhas = resp.map(p => {
      const nome = p.pessoas?.nome || "—";
      const tel  = p.pessoas?.whatsapp || p.pessoas?.celular || p.pessoas?.telefone || "";
      const apto = p.ativo && !!tel;
      const inicial = nome.trim()[0]?.toUpperCase() || "?";
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bd2)">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--bg2);border:1px solid var(--bd2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--tx2);flex-shrink:0">${_esc(inicial)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:11.5px;font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(nome)}</div>
            <div style="font-size:10px;color:var(--tx3)">${tel ? _esc(tel) : "Sem número"}</div>
          </div>
          <span style="font-size:11px;color:${apto?"var(--gr)":"var(--rose)"}">
            ${apto ? "✅" : (!p.ativo ? "⛔" : "⚠")}
          </span>
        </div>`;
    }).join("");

    const aptos = resp.filter(p => p.ativo && (p.pessoas?.whatsapp || p.pessoas?.celular || p.pessoas?.telefone)).length;
    return `
      <div style="background:var(--bg2);border-radius:8px;border:1px solid var(--bd2);padding:10px 12px;margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:10.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px">Receberão mensagens</span>
          <span style="font-size:10px;padding:1px 8px;border-radius:20px;background:${aptos>0?"rgba(58,170,92,0.12)":"rgba(224,85,85,0.1)"};color:${aptos>0?"var(--gr)":"var(--rose)"}">
            ${aptos}/${resp.length} aptos
          </span>
        </div>
        ${linhas}
      </div>`;
  }

  /* ── Modal de responsáveis por módulo ───────────────────── */

  let _respModalModulo = "";

  async function abrirResponsaveisModal(modulo){
    _respModalModulo = modulo;
    const modal = document.getElementById("wa-resp-modal");
    if(!modal) return;
    document.getElementById("wa-resp-modal-titulo").textContent = `Responsáveis — ${modulo}`;
    document.getElementById("wa-resp-busca").value = "";
    document.getElementById("wa-resp-resultados").innerHTML = "";
    modal.classList.add("on");
    await _carregarListaResponsaveis();
  }

  function fecharResponsaveisModal(){
    document.getElementById("wa-resp-modal").classList.remove("on");
    _respModalModulo = "";
  }

  async function _carregarListaResponsaveis(){
    const el = document.getElementById("wa-resp-lista");
    if(!el) return;
    el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:8px 0">Carregando...</div>`;

    const rows = await _fetch(
      `/rest/v1/whatsapp_modulo_responsaveis?select=id,ativo,pessoas(id,nome,celular,whatsapp,telefone)&modulo=eq.${encodeURIComponent(_respModalModulo)}&order=pessoas(nome)`
    );

    if(!rows || !rows.length){
      el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:8px 0">Nenhum responsável cadastrado</div>`;
      return;
    }

    el.innerHTML = rows.map(r => {
      const nome = r.pessoas?.nome || "—";
      const tel  = r.pessoas?.whatsapp || r.pessoas?.celular || r.pessoas?.telefone || "";
      const apto = r.ativo && !!tel;
      const inicial = nome.trim()[0]?.toUpperCase() || "?";
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd2)">
          <div style="width:30px;height:30px;border-radius:50%;background:var(--bg1);border:1px solid var(--bd2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--tx2);flex-shrink:0">${_esc(inicial)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--tx1)">${_esc(nome)}</div>
            <div style="font-size:10.5px;color:var(--tx3)">${tel ? _esc(tel) : "⚠ Sem número"}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:11px;color:${apto?"var(--gr)":"var(--rose)"}">${apto?"✅":(!r.ativo?"⛔":"⚠")}</span>
            <button class="tbt" style="font-size:10px;padding:2px 8px;color:var(--rose)"
              onclick="WA_CFG.removerResponsavel('${_esc(r.id)}')">remover</button>
          </div>
        </div>`;
    }).join("");
  }

  async function buscarPessoasParaAdicionar(){
    const q = (document.getElementById("wa-resp-busca")?.value || "").trim();
    const el = document.getElementById("wa-resp-resultados");
    if(!el) return;
    if(q.length < 2){ el.innerHTML = ""; return; }

    el.innerHTML = `<div style="color:var(--tx3);font-size:11px;padding:4px 0">Buscando...</div>`;
    const rows = await _fetch(
      `/rest/v1/pessoas?select=id,nome,celular,whatsapp,telefone&nome=ilike.*${encodeURIComponent(q)}*&limit=8&order=nome`
    );

    if(!rows || !rows.length){
      el.innerHTML = `<div style="color:var(--tx3);font-size:11px;padding:4px 0">Nenhuma pessoa encontrada</div>`;
      return;
    }

    el.innerHTML = rows.map(p => {
      const tel = p.whatsapp || p.celular || p.telefone || "";
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;cursor:pointer;background:var(--bg1);margin-bottom:4px"
             onclick="WA_CFG.adicionarResponsavel('${_esc(p.id)}','${_esc(p.nome.replace(/'/g,""))}')"
             onmouseenter="this.style.background='var(--bg2)'" onmouseleave="this.style.background='var(--bg1)'">
          <div style="width:26px;height:26px;border-radius:50%;background:var(--bg2);border:1px solid var(--bd2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--tx2);flex-shrink:0">${_esc(p.nome.trim()[0]?.toUpperCase()||"?")}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:11.5px;font-weight:600;color:var(--tx1)">${_esc(p.nome)}</div>
            <div style="font-size:10px;color:var(--tx3)">${tel ? _esc(tel) : "Sem número"}</div>
          </div>
          <span style="font-size:10.5px;color:var(--sky)">+ adicionar</span>
        </div>`;
    }).join("");
  }

  async function adicionarResponsavel(pessoaId, nome){
    const res = await _fetch("/rest/v1/whatsapp_modulo_responsaveis", {
      method: "POST",
      body: JSON.stringify({ modulo: _respModalModulo, pessoa_id: pessoaId, ativo: true }),
    });
    if(res !== null){
      if(typeof T === "function") T("Responsável adicionado", nome);
      document.getElementById("wa-resp-busca").value = "";
      document.getElementById("wa-resp-resultados").innerHTML = "";
      await _carregarListaResponsaveis();
      carregarModulos();
    }
  }

  async function removerResponsavel(id){
    await _fetch(`/rest/v1/whatsapp_modulo_responsaveis?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    if(typeof T === "function") T("Responsável removido", "");
    await _carregarListaResponsaveis();
    carregarModulos();
  }

  async function toggleModulo(modulo, ativo){
    await _fetch(`/rest/v1/whatsapp_modulo_config?modulo=eq.${encodeURIComponent(modulo)}`, {
      method: "PATCH",
      body: JSON.stringify({ ativo }),
    });
    if(typeof T === "function")
      T(ativo ? "Módulo ativado" : "Módulo pausado", `Envio de WhatsApp ${ativo?"habilitado":"desabilitado"} para ${modulo}`);
  }

  /* ── Salvar configuração de instância (informativo) ──────── */

  function salvarConfig(){
    if(typeof T === "function")
      T("Configuração necessária", "As credenciais de integração não estão configuradas. Contate o administrador.");
  }

  /* ── Estado da configuração BotConversa ───────────────── */

  async function carregarEstadoConfig(){
    const el = document.getElementById("wa-cfg-estado");
    if(!el) return;
    const s = await WA.status();
    if(s.conectado){
      el.innerHTML = `<span style="color:var(--gr);font-weight:600">✓ Chave configurada</span> — BotConversa pronto para envio.`;
    } else if(s.estado === "sem_chave"){
      el.innerHTML = `<span style="color:var(--rose);font-weight:600">✗ Chave ausente</span> — Adicione <code style="font-size:10.5px">BOTCONVERSA_API_KEY</code> nos secrets do Supabase.`;
    } else if(s.estado === "chave_invalida"){
      el.innerHTML = `<span style="color:var(--rose);font-weight:600">✗ Chave inválida</span> — Verifique a chave no painel BotConversa → Configurações → Integrações.`;
    } else {
      el.innerHTML = `<span style="color:var(--gold);font-weight:600">⚠ ${s.estado||"erro"}</span> — Não foi possível verificar o status.`;
    }
  }

  /* ── Histórico de mensagens ───────────────────────────── */

  async function carregarHistorico(){
    const tbody = document.getElementById("wa-hist-body");
    if(!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="padding:16px;text-align:center;color:var(--tx3)">Carregando...</td></tr>`;

    const modulo = document.getElementById("wa-hist-modulo")?.value || "";
    const status = document.getElementById("wa-hist-status")?.value || "";

    let url = `/rest/v1/whatsapp_mensagens?select=*&order=criado_em.desc&limit=100`;
    if(modulo) url += `&modulo=eq.${encodeURIComponent(modulo)}`;
    if(status) url += `&status=eq.${encodeURIComponent(status)}`;

    const rows = await _fetch(url);
    if(!rows || !rows.length){
      tbody.innerHTML = `<tr><td colspan="5" style="padding:16px;text-align:center;color:var(--tx3)">Nenhuma mensagem encontrada</td></tr>`;
      return;
    }

    const SC = { enviado:"var(--gr)", pendente:"var(--gold)", erro:"var(--rose)" };
    const SL = { enviado:"Enviado",   pendente:"Pendente",    erro:"Erro" };

    tbody.innerHTML = rows.map(r => `
      <tr style="border-bottom:1px solid var(--bd2)">
        <td style="padding:8px 10px;color:var(--tx3);font-size:11px;white-space:nowrap">${_dt(r.criado_em)}</td>
        <td style="padding:8px 10px;font-size:11.5px;font-family:var(--mono)">${_esc(r.para_numero||"—")}</td>
        <td style="padding:8px 10px"><span style="font-size:10px;background:var(--bd2);padding:2px 6px;border-radius:4px;font-weight:600">${_esc(r.modulo||"—")}</span></td>
        <td style="padding:8px 10px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px" title="${_esc(r.mensagem||"")}">${_esc(r.mensagem||"—")}</td>
        <td style="padding:8px 10px;text-align:center">
          <span style="font-size:10px;font-weight:700;color:${SC[r.status]||"var(--tx3)"}">${SL[r.status]||_esc(r.status||"—")}</span>
          ${r.erro_msg ? `<div style="font-size:9.5px;color:var(--rose);margin-top:2px" title="${_esc(r.erro_msg)}">⚠ detalhe</div>` : ""}
        </td>
      </tr>
    `).join("");
  }

  /* ── Templates ────────────────────────────────────────── */

  async function carregarTemplates(){
    const el = document.getElementById("wa-templates-list");
    if(!el) return;
    el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px">Carregando...</div>`;

    const rows = await _fetch("/rest/v1/whatsapp_templates?select=*&order=modulo,nome");
    if(!rows || !rows.length){
      el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px">Nenhum template cadastrado. Clique em "+ Novo" para criar.</div>`;
      return;
    }

    el.innerHTML = rows.map(r => {
      const dataJson = _esc(JSON.stringify(r));
      return `
      <div style="background:var(--bg2);border:1px solid var(--bd2);border-radius:8px;padding:12px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:700;color:var(--tx1);margin-bottom:4px">${_esc(r.titulo||r.nome||r.chave)}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
              <span style="font-size:10px;background:var(--bd2);padding:1px 6px;border-radius:4px;color:var(--tx3);font-family:var(--mono)">${_esc(r.chave)}</span>
              <span style="font-size:10px;background:var(--bd2);padding:1px 6px;border-radius:4px;color:var(--tx3)">${_esc(r.modulo||"GERAL")}</span>
              ${!r.ativo ? `<span style="font-size:10px;color:var(--rose);font-weight:600">Inativo</span>` : ""}
            </div>
            <div style="font-size:11px;color:var(--tx2);white-space:pre-wrap;background:var(--bg-sidebar);padding:8px;border-radius:4px;border:1px solid var(--bd2);line-height:1.5">${_esc(r.corpo||"")}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
            <button class="tbt" onclick='WA_CFG._editTpl("${dataJson}")'>Editar</button>
            <button class="tbt" onclick="WA_CFG.toggleTemplate('${_esc(r.id)}',${!r.ativo})"
              style="color:${r.ativo?"var(--rose)":"var(--gr)"}">
              ${r.ativo ? "Pausar" : "Ativar"}
            </button>
          </div>
        </div>
      </div>
      `;
    }).join("");
  }

  function _editTpl(jsonStr){
    // jsonStr comes from an HTML attribute — already HTML-unescaped by the browser
    try{
      const r = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
      openTemplateModal(r);
    }catch(e){ console.error("[WA_CFG] _editTpl parse:", e); }
  }

  function openTemplateModal(tpl){
    document.getElementById("wa-tpl-modal-titulo").textContent = tpl ? "Editar Template" : "Novo Template";
    document.getElementById("wa-tpl-id").value    = tpl?.id    || "";
    document.getElementById("wa-tpl-chave").value = tpl?.chave || "";
    document.getElementById("wa-tpl-nome").value  = tpl?.titulo || tpl?.nome || "";
    document.getElementById("wa-tpl-corpo").value = tpl?.corpo || "";
    const sel = document.getElementById("wa-tpl-modulo");
    if(sel && tpl?.modulo) sel.value = tpl.modulo;
    document.getElementById("wa-tpl-modal").classList.add("on");
  }

  function closeTplModal(){ document.getElementById("wa-tpl-modal").classList.remove("on"); }

  async function toggleTemplate(id, ativo){
    await _fetch(`/rest/v1/whatsapp_templates?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ ativo }),
    });
    carregarTemplates();
  }

  async function salvarTemplate(){
    const id     = document.getElementById("wa-tpl-id")?.value    || "";
    const chave  = (document.getElementById("wa-tpl-chave")?.value || "").trim().toUpperCase().replace(/\s+/g,"_");
    const titulo = (document.getElementById("wa-tpl-nome")?.value  || "").trim();
    const corpo  = (document.getElementById("wa-tpl-corpo")?.value || "").trim();
    const modulo = document.getElementById("wa-tpl-modulo")?.value || "COMUNICACAO";

    if(!chave || !corpo){
      if(typeof T === "function") T("Campos obrigatórios","Preencha chave e corpo do template");
      return;
    }

    if(id){
      await _fetch(`/rest/v1/whatsapp_templates?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ chave, titulo, corpo, modulo }),
      });
    } else {
      await _fetch("/rest/v1/whatsapp_templates", {
        method: "POST",
        body: JSON.stringify({ chave, titulo, corpo, modulo, ativo: true }),
      });
    }

    closeTplModal();
    if(typeof T === "function") T("Template salvo","Atualizado com sucesso");
    carregarTemplates();
  }

  /* ── Envio de teste ───────────────────────────────────── */

  function openTesteModal(){
    const num = document.getElementById("wa-teste-num");
    const msg = document.getElementById("wa-teste-msg");
    if(num) num.value = "";
    if(msg) msg.value = "Olá! Esta é uma mensagem de teste do SIPEN — Sistema Integrado da IPPenha.";
    document.getElementById("wa-teste-modal").classList.add("on");
  }

  function closeTesteModal(){ document.getElementById("wa-teste-modal").classList.remove("on"); }

  async function enviarTeste(){
    const para = (document.getElementById("wa-teste-num")?.value || "").trim();
    const msg  = (document.getElementById("wa-teste-msg")?.value || "").trim();
    if(!para || !msg){
      if(typeof T === "function") T("Campos obrigatórios","Informe número e mensagem");
      return;
    }

    const btn = document.querySelector("#wa-teste-modal .btn-p");
    if(btn){ btn.disabled = true; btn.textContent = "Enviando..."; }

    const r = await WA.send({ para, mensagem: msg, modulo: "COMUNICACAO", nome: "Teste" });

    if(btn){ btn.disabled = false; btn.textContent = "Enviar via WhatsApp"; }

    if(r && r.ok){
      if(typeof T === "function") T("Mensagem enviada!","WhatsApp entregue com sucesso via BotConversa");
      closeTesteModal();
      setTimeout(carregarHistorico, 800);
    } else {
      if(typeof T === "function") T("Falha no envio", r?.error || r?.status || "Serviço de mensagens não configurado. Contate o administrador.");
    }
  }

  /* ── IA Log (demandas recebidas via WhatsApp) ────────── */

  async function carregarIaLog(){
    const tbody = document.getElementById("wa-ia-log-body");
    if(!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="padding:16px;text-align:center;color:var(--tx3)">Carregando...</td></tr>`;

    const rows = await _fetch("/rest/v1/whatsapp_ia_log?select=*&order=criado_em.desc&limit=100");
    if(!rows || !rows.length){
      tbody.innerHTML = `<tr><td colspan="5" style="padding:16px;text-align:center;color:var(--tx3)">Nenhuma mensagem recebida via WhatsApp ainda</td></tr>`;
      return;
    }

    const SC = {
      recebido:        "var(--tx3)",
      classificado:    "var(--blue)",
      demanda_criada:  "var(--gr)",
      nao_classificado:"var(--gold)",
      erro:            "var(--rose)",
    };
    const SL = {
      recebido:        "Recebido",
      classificado:    "Classificado",
      demanda_criada:  "Demanda criada",
      nao_classificado:"Não classificado",
      erro:            "Erro",
    };

    tbody.innerHTML = rows.map(r => {
      const ia  = r.ia_resultado || {};
      const raw = (r.mensagem_raw || "—").slice(0, 120);
      return `
        <tr style="border-bottom:1px solid var(--bd2)">
          <td style="padding:8px 10px;color:var(--tx3);font-size:11px;white-space:nowrap">${_dt(r.criado_em)}</td>
          <td style="padding:8px 10px">
            <div style="font-size:11.5px;font-family:var(--mono)">${_esc(r.phone||"—")}</div>
            ${r.nome_remetente ? `<div style="font-size:10.5px;color:var(--tx3)">${_esc(r.nome_remetente)}</div>` : ""}
          </td>
          <td style="padding:8px 10px;max-width:220px">
            ${r.protocolo ? `<div style="font-size:10.5px;font-weight:700;color:var(--blue);margin-bottom:3px">${_esc(r.protocolo)}</div>` : ""}
            <div style="font-size:11px;color:var(--tx2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${_esc(r.mensagem_raw||"")}">${_esc(raw)}</div>
          </td>
          <td style="padding:8px 10px;font-size:11px;color:var(--tx2)">
            ${ia.area_nome ? `<div style="font-weight:600">${_esc(ia.area_nome)}</div>` : ""}
            ${ia.subcategoria ? `<div style="color:var(--tx3)">${_esc(ia.subcategoria)}</div>` : ""}
            ${ia.confidence != null ? `<div style="font-size:10px;color:var(--tx3)">confiança: ${Math.round((ia.confidence||0)*100)}%</div>` : ""}
          </td>
          <td style="padding:8px 10px;text-align:center">
            <span style="font-size:10.5px;font-weight:700;color:${SC[r.status]||"var(--tx3)"}">${SL[r.status]||_esc(r.status||"—")}</span>
            ${r.erro_msg ? `<div style="font-size:9.5px;color:var(--rose);margin-top:2px" title="${_esc(r.erro_msg)}">⚠ erro</div>` : ""}
          </td>
        </tr>
      `;
    }).join("");
  }

  /* ── Refresh geral ────────────────────────────────────── */

  async function refresh(){
    await Promise.all([
      carregarStatus(),
      carregarKpis(),
      carregarModulos(),
      carregarHistorico(),
      carregarTemplates(),
      carregarEstadoConfig(),
      carregarIaLog(),
    ]);
  }

  /* ── API pública ──────────────────────────────────────── */
  return {
    refresh,
    carregarStatus, carregarKpis,
    carregarModulos, toggleModulo,
    abrirResponsaveisModal, fecharResponsaveisModal,
    buscarPessoasParaAdicionar, adicionarResponsavel, removerResponsavel,
    salvarConfig,
    carregarEstadoConfig,
    carregarHistorico,
    carregarTemplates, openTemplateModal, closeTplModal, _editTpl, toggleTemplate, salvarTemplate,
    openTesteModal, closeTesteModal, enviarTeste,
    carregarIaLog,
  };
})();

window.WA_CFG = WA_CFG;
