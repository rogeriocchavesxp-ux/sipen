/* ══════════════════════════════════════════════════════
   CONTROLE DE ACESSO — Controles do Estacionamento
══════════════════════════════════════════════════════ */
(function(){
  const TBL = "controle_estacionamento_controles";
  const HIST = "controle_estacionamento_historico";
  const STATUS = {
    disponivel:{label:"Disponível", cor:"#9aa4b2", bg:"rgba(154,164,178,.12)"},
    entregue:{label:"Entregue", cor:"#3aaa5c", bg:"rgba(58,170,92,.13)"},
    devolvido:{label:"Devolvido", cor:"#9aa4b2", bg:"rgba(154,164,178,.12)"},
    perdido:{label:"Perdido", cor:"#d4a843", bg:"rgba(212,168,67,.15)"},
    bloqueado:{label:"Bloqueado", cor:"#d06868", bg:"rgba(208,104,104,.14)"},
  };
  const PAGAMENTO = {
    pago:{label:"Pago", cor:"#3aaa5c", bg:"rgba(58,170,92,.13)"},
    pendente:{label:"Pendente", cor:"#d4a843", bg:"rgba(212,168,67,.15)"},
  };
  let _controles = [];
  let _pessoas = [];

  function _isAdmin(){
    const p = String(USUARIO_ATUAL?.perfil || "").toUpperCase();
    return ["ADMINISTRADOR_GERAL","ADM_OPERACIONAL","ADMIN_GERAL"].includes(p) || p.includes("ADMIN");
  }
  function _authId(){ return USUARIO_ATUAL?.auth_user_id || null; }
  function _adminNome(){ return USUARIO_ATUAL?.nome || "Administrador SIPEN"; }
  function _fmtDate(v){ return v ? new Date(v+"T12:00:00").toLocaleDateString("pt-BR") : "—"; }
  function _hoje(){ return new Date().toISOString().slice(0,10); }
  function _statusPill(st){
    const s = STATUS[st] || STATUS.disponivel;
    return `<span style="display:inline-flex;align-items:center;border-radius:999px;padding:3px 8px;background:${s.bg};color:${s.cor};font-size:10px;font-weight:800">${escapeHtml(s.label)}</span>`;
  }
  function _pagamentoPill(st){
    const s = PAGAMENTO[st] || PAGAMENTO.pendente;
    return `<span style="display:inline-flex;align-items:center;border-radius:999px;padding:3px 8px;background:${s.bg};color:${s.cor};font-size:10px;font-weight:800">${escapeHtml(s.label)}</span>`;
  }
  function _selectVisual(cfg, value){
    const s = cfg[value] || Object.values(cfg)[0];
    return `background:${s.bg};color:${s.cor};border:1px solid ${s.cor}44;border-radius:999px;font-size:10px;font-weight:800;padding:4px 24px 4px 8px;outline:none;cursor:pointer`;
  }
  function _pagamentoSelect(r){
    const v = r.status_pagamento || "pendente";
    return `<select onchange="ceMudarPagamento('${escapeHtmlAttr(r.id)}',this.value)" style="${_selectVisual(PAGAMENTO,v)}">
      <option value="pago"${v==="pago"?" selected":""}>Pago</option>
      <option value="pendente"${v==="pendente"?" selected":""}>Pendente</option>
    </select>`;
  }
  function _statusSelect(r){
    const v = r.status || "disponivel";
    return `<select onchange="ceMudarStatus('${escapeHtmlAttr(r.id)}',this.value,false)" style="${_selectVisual(STATUS,v)}">
      <option value="entregue"${v==="entregue"?" selected":""}>Entregue</option>
      <option value="perdido"${v==="perdido"?" selected":""}>Perdido</option>
      <option value="bloqueado"${v==="bloqueado"?" selected":""}>Bloqueado</option>
      <option value="disponivel"${v==="disponivel"?" selected":""}>Disponível</option>
    </select>`;
  }
  function _pessoaNome(id){
    const p = _pessoas.find(x => x.id === id);
    return p ? p.nome : "—";
  }
  function _nomePessoa(r){
    if(!r?.pessoa_id) return "";
    const p = _pessoas.find(x => x.id === r.pessoa_id);
    return p?.nome || "";
  }
  // Padronização visual: uppercase apenas na apresentação, sem alterar o dado
  function _dn(s){ return (s || "").toUpperCase(); }
  function _ordemControle(a, b){
    const nomeA = _nomePessoa(a);
    const nomeB = _nomePessoa(b);
    const aEntregue = a.status === "entregue";
    const bEntregue = b.status === "entregue";
    const aGrupo = aEntregue && nomeA ? 0 : aEntregue ? 1 : nomeA ? 2 : 3;
    const bGrupo = bEntregue && nomeB ? 0 : bEntregue ? 1 : nomeB ? 2 : 3;
    if(aGrupo !== bGrupo) return aGrupo - bGrupo;
    if(nomeA && nomeB){
      const porNome = nomeA.localeCompare(nomeB, "pt-BR", {sensitivity:"base"});
      if(porNome) return porNome;
    }
    return String(a.codigo_controle || "").localeCompare(String(b.codigo_controle || ""), "pt-BR", {sensitivity:"base", numeric:true});
  }
  function _membroCell(r){
    if(r.pessoa_id){
      return `<span style="color:var(--tx1);font-weight:700">${escapeHtml(_dn(_pessoaNome(r.pessoa_id)))}</span>`;
    }
    return `<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
      <span style="display:inline-flex;align-items:center;border-radius:999px;padding:3px 8px;background:rgba(212,168,67,.15);color:#d4a843;font-size:10px;font-weight:800">Não vinculado</span>
      <button onclick="ceVincularMembro('${escapeHtmlAttr(r.id)}')" style="background:none;border:1px solid rgba(42,181,192,.35);border-radius:5px;color:var(--teal);font-size:10px;font-weight:800;padding:3px 7px;cursor:pointer">Vincular pessoa</button>
    </div>`;
  }
  function _erro(e){
    const msg = e?.message || String(e || "Erro desconhecido");
    if(msg.includes("does not exist") || msg.includes("PGRST205")) return "Execute o script supabase-controle-estacionamento.sql no Supabase.";
    if(msg.includes("permission denied") || msg.includes("row-level security")) return "Sem permissão para acessar controles do estacionamento. Verifique o login administrativo e as policies no Supabase.";
    return msg;
  }

  async function _registrarHistorico(controle, acao, anterior, novo, observacao=""){
    try {
      await getSupabase().from(HIST).insert({
        controle_id: controle,
        acao,
        status_anterior: anterior || null,
        status_novo: novo || null,
        usuario_id: _authId(),
        observacao: `${observacao}${observacao ? " · " : ""}Usuário: ${_adminNome()}`
      });
    } catch(e) { console.warn("histórico estacionamento:", e.message); }
  }

  async function _fetchTodasPessoas(sb){
    // Supabase limita 1000 linhas por request (db-max-rows).
    // Busca em páginas de 1000 até esgotar para garantir lista completa.
    const PAGE = 1000;
    let all = [], from = 0;
    while(true){
      const { data, error } = await sb.from("pessoas")
        .select("id,nome,email,celular,telefone")
        .is("deleted_at", null)
        .order("nome", {ascending:true})
        .range(from, from + PAGE - 1);
      if(error) throw error;
      if(!data || !data.length) break;
      all = all.concat(data);
      if(data.length < PAGE) break;
      from += PAGE;
    }
    return all;
  }

  async function ceCarregar(){
    const el = document.getElementById("ce-list");
    if(!el) return;
    if(!_isAdmin()){
      el.innerHTML = `<div style="color:var(--rose);font-size:12px">Acesso restrito a administradores.</div>`;
      return;
    }
    el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px">${spinner()} Carregando controles...</div>`;
    try {
      const sb = getSupabase();
      const [rc, pessoas] = await Promise.all([
        sb.from(TBL).select("*").order("created_at", {ascending:false}),
        _fetchTodasPessoas(sb),
      ]);
      if(rc.error) throw rc.error;
      _controles = Array.isArray(rc.data) ? rc.data : [];
      _pessoas = pessoas;
      ceRender();
    } catch(e) {
      console.error("controle estacionamento:", e);
      el.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(_erro(e))}</div>`;
    }
  }

  function _filtrados(){
    const busca = (document.getElementById("ce-f-busca")?.value || "").toLowerCase().trim();
    const codigo = (document.getElementById("ce-f-codigo")?.value || "").toLowerCase().trim();
    const status = document.getElementById("ce-f-status")?.value || "";
    const pagamento = document.getElementById("ce-f-pagamento")?.value || "";
    const marca = (document.getElementById("ce-f-marca")?.value || "").toLowerCase().trim();
    return _controles.filter(r => {
      const nome = _pessoaNome(r.pessoa_id).toLowerCase();
      return (!busca || nome.includes(busca)) &&
             (!codigo || String(r.codigo_controle || "").toLowerCase().includes(codigo)) &&
             (!status || r.status === status) &&
             (!pagamento || (r.status_pagamento || "pendente") === pagamento) &&
             (!marca || String(r.marca || "").toLowerCase().includes(marca));
    }).sort(_ordemControle);
  }

  function ceRender(){
    const el = document.getElementById("ce-list");
    if(!el) return;
    const rows = _filtrados();
    const sv = (id,v)=>{ const x=document.getElementById(id); if(x) x.textContent=v; };
    sv("ce-kpi-total", _controles.length);
    sv("ce-kpi-disponiveis", _controles.filter(r=>r.status==="disponivel").length);
    sv("ce-kpi-entregues", _controles.filter(r=>r.status==="entregue").length);
    sv("ce-kpi-alertas", _controles.filter(r=>["perdido","bloqueado"].includes(r.status)).length);
    if(!rows.length){
      el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px;padding:14px 0">Nenhum controle encontrado.</div>`;
      return;
    }
    el.innerHTML = `<div style="overflow:auto">
      <table style="width:100%;border-collapse:collapse;font-size:11.5px;min-width:860px">
        <thead><tr style="border-bottom:1px solid var(--bd2);background:var(--bg-surface)">
          <th style="text-align:left;padding:9px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase">Pessoa</th>
          <th style="text-align:left;padding:9px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase">Código</th>
          <th style="text-align:left;padding:9px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase">Marca</th>
          <th style="text-align:left;padding:9px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase">Pagamento</th>
          <th style="text-align:left;padding:9px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase">Status</th>
          <th style="text-align:left;padding:9px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase">Entrega</th>
          <th style="text-align:right;padding:9px 10px;color:var(--tx3);font-size:10px;text-transform:uppercase">Editar</th>
        </tr></thead>
        <tbody>${rows.map(r => {
          return `<tr style="border-bottom:1px solid var(--bd1)">
            <td style="padding:9px 10px">${_membroCell(r)}</td>
            <td style="padding:9px 10px;color:var(--tx1);font-family:var(--mono);font-weight:800">${escapeHtml(r.codigo_controle || "—")}</td>
            <td style="padding:9px 10px;color:var(--tx2)">${escapeHtml(r.marca || "Nice")}</td>
            <td style="padding:9px 10px">${_pagamentoSelect(r)}</td>
            <td style="padding:9px 10px">${_statusSelect(r)}</td>
            <td style="padding:9px 10px;color:var(--tx2)">${escapeHtml(_fmtDate(r.data_entrega))}</td>
            <td style="padding:9px 10px;text-align:right;white-space:nowrap">
              <button onclick="ceAbrirModal('${escapeHtmlAttr(r.id)}')" style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:5px;color:var(--tx2);font-size:10px;font-weight:800;padding:5px 9px;cursor:pointer">Editar</button>
            </td>
          </tr>`;
        }).join("")}</tbody>
      </table>
    </div>`;
  }

  async function ceAbrirModal(id="", focoMembro=false){
    if(!_pessoas.length) await ceCarregar();
    const reg = id ? _controles.find(r => r.id === id) : null;
    let modal = document.getElementById("ce-modal");
    if(!modal){
      modal = document.createElement("div");
      modal.id = "ce-modal";
      modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:340;display:flex;align-items:center;justify-content:center";
      document.body.appendChild(modal);
    }
    const opts = `<option value="">— Selecionar pessoa —</option>` + _pessoas.map(p=>`<option value="${escapeHtmlAttr(p.id)}"${reg?.pessoa_id===p.id?" selected":""}>${escapeHtml(_dn(p.nome))}</option>`).join("");
    const status = reg?.status || "disponivel";
    modal.innerHTML = `<div style="width:min(720px,94vw);max-height:90vh;overflow:auto;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:20px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px"><div style="font-size:20px">🅿</div><div><div style="font-size:14px;font-weight:800;color:var(--tx1)">${reg?"Editar":"Novo"} controle</div><div style="font-size:10.5px;color:var(--tx3)">Nice · código base 1EF9C96</div></div><button onclick="ceFecharModal()" style="margin-left:auto;background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer">✕</button></div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        <div style="grid-column:1/-1"><label class="flb">Pessoa</label><select id="ce-membro" class="fi2" style="text-transform:uppercase">${opts}</select></div>
        <div><label class="flb">Código do controle *</label><input id="ce-codigo" class="fi2" value="${escapeHtmlAttr(reg?.codigo_controle || "")}" placeholder="Ex.: 1EF9C96-001"></div>
        <div><label class="flb">Marca</label><input id="ce-marca" class="fi2" value="${escapeHtmlAttr(reg?.marca || "Nice")}"></div>
        <div><label class="flb">Código base / padrão</label><input id="ce-base" class="fi2" value="${escapeHtmlAttr(reg?.codigo_base || "1EF9C96")}"></div>
        <div><label class="flb">Pagamento</label><select id="ce-pagamento" class="fi2">
          <option value="pendente"${(reg?.status_pagamento||"pendente")==="pendente"?" selected":""}>Pendente</option>
          <option value="pago"${reg?.status_pagamento==="pago"?" selected":""}>Pago</option>
        </select></div>
        <div><label class="flb">Data de entrega</label><input id="ce-entrega" type="date" class="fi2" value="${escapeHtmlAttr(reg?.data_entrega || "")}"></div>
        <div><label class="flb">Status</label><select id="ce-status" class="fi2">
          ${Object.entries(STATUS).map(([k,v])=>`<option value="${k}"${status===k?" selected":""}>${escapeHtml(v.label)}</option>`).join("")}
        </select></div>
        <div style="grid-column:1/-1"><label class="flb">Observações</label><textarea id="ce-obs" class="fi2" rows="3" placeholder="Observações sobre entrega, devolução ou bloqueio">${escapeHtml(reg?.observacoes || "")}</textarea></div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <button class="btn" onclick="ceFecharModal()">Cancelar</button>
        <button class="btn btn-p" onclick="ceSalvar('${escapeHtmlAttr(id)}')">Salvar</button>
      </div>
    </div>`;
    if(focoMembro) setTimeout(()=>document.getElementById("ce-membro")?.focus(), 0);
  }

  async function ceVincularMembro(id){
    await ceAbrirModal(id, true);
  }

  async function ceSalvar(id=""){
    const pessoa_id = document.getElementById("ce-membro")?.value || null;
    const codigo_controle = (document.getElementById("ce-codigo")?.value || "").trim().toUpperCase();
    const marca = (document.getElementById("ce-marca")?.value || "Nice").trim();
    const codigo_base = (document.getElementById("ce-base")?.value || "1EF9C96").trim().toUpperCase();
    const status_pagamento = document.getElementById("ce-pagamento")?.value || "pendente";
    const status = document.getElementById("ce-status")?.value || "disponivel";
    let data_entrega = document.getElementById("ce-entrega")?.value || null;
    const observacoes = document.getElementById("ce-obs")?.value || "";
    if(!codigo_controle) return T("Campo obrigatório", "Informe o código do controle.");
    if(status === "entregue" && !pessoa_id) return T("Pessoa obrigatória", "Selecione a pessoa que recebeu o controle.");
    if(status === "entregue" && !data_entrega) data_entrega = _hoje();
    const duplicado = _controles.find(r => r.codigo_controle?.toLowerCase() === codigo_controle.toLowerCase() && r.id !== id);
    if(duplicado) return T("Código duplicado", "Este código de controle já está cadastrado.");
    const ativo = status === "entregue" && pessoa_id && _controles.find(r => r.pessoa_id === pessoa_id && r.status === "entregue" && r.id !== id);
    if(ativo && !confirm("Esta pessoa já possui um controle entregue. Deseja continuar mesmo assim?")) return;
    const anterior = id ? _controles.find(r => r.id === id) : null;
    const payload = {pessoa_id, codigo_controle, marca, codigo_base, status_pagamento, status, data_entrega, observacoes};
    if(status === "entregue" && !anterior?.entregue_por) payload.entregue_por = _authId();
    try {
      const sb = getSupabase();
      const req = id ? sb.from(TBL).update(payload).eq("id", id).select().single()
                     : sb.from(TBL).insert(payload).select().single();
      const { data, error } = await req;
      if(error) throw error;
      await _registrarHistorico(data.id, id ? "editar" : "criar", anterior?.status, data.status, observacoes);
      ceFecharModal();
      T("Controle salvo", `${codigo_controle} registrado com sucesso.`);
      await ceCarregar();
    } catch(e) {
      console.error("salvar controle:", e);
      T("Erro ao salvar", _erro(e));
    }
  }

  async function ceMudarPagamento(id, status_pagamento){
    const reg = _controles.find(r => r.id === id);
    if(!reg || (reg.status_pagamento || "pendente") === status_pagamento) return;
    try {
      const { error } = await getSupabase().from(TBL).update({status_pagamento}).eq("id", id);
      if(error) throw error;
      await _registrarHistorico(id, "pagamento", reg.status_pagamento || "pendente", status_pagamento, `Pagamento: ${PAGAMENTO[status_pagamento]?.label || status_pagamento}`);
      const idx = _controles.findIndex(r => r.id === id);
      if(idx >= 0) _controles[idx] = {..._controles[idx], status_pagamento};
      ceRender();
      T("Pagamento atualizado", `${reg.codigo_controle}: ${PAGAMENTO[status_pagamento]?.label || status_pagamento}`);
    } catch(e) {
      T("Erro ao atualizar pagamento", _erro(e));
      await ceCarregar();
    }
  }

  async function ceMudarStatus(id, status, confirmar=true){
    const reg = _controles.find(r => r.id === id);
    if(!reg || reg.status === status) return;
    const label = STATUS[status]?.label || status;
    if(confirmar && !confirm(`Marcar controle ${reg.codigo_controle} como ${label}?`)) return;
    const payload = {status};
    if(status === "entregue" && !reg.data_entrega) payload.data_entrega = _hoje();
    if(status === "devolvido") payload.pessoa_id = null;
    try {
      const { error } = await getSupabase().from(TBL).update(payload).eq("id", id);
      if(error) throw error;
      await _registrarHistorico(id, "status", reg.status, status, `Status alterado para ${label}`);
      const idx = _controles.findIndex(r => r.id === id);
      if(idx >= 0) _controles[idx] = {..._controles[idx], ...payload};
      T("Status atualizado", `${reg.codigo_controle}: ${label}`);
      ceRender();
    } catch(e) {
      T("Erro ao atualizar", _erro(e));
      await ceCarregar();
    }
  }

  async function ceExcluir(id){
    const reg = _controles.find(r => r.id === id);
    if(!reg || reg.status === "entregue") return T("Exclusão bloqueada", "Controles entregues devem ser devolvidos ou bloqueados antes.");
    if(!confirm(`Excluir controle ${reg.codigo_controle}?`)) return;
    try {
      const { error } = await getSupabase().from(TBL).delete().eq("id", id);
      if(error) throw error;
      T("Controle excluído", reg.codigo_controle);
      await ceCarregar();
    } catch(e) { T("Erro ao excluir", _erro(e)); }
  }

  function cePrint(){
    const rows = _filtrados();
    const now = new Date();
    const emissao = now.toLocaleDateString("pt-BR") + " às " + now.toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"});

    const busca    = (document.getElementById("ce-f-busca")?.value || "").trim();
    const codigo   = (document.getElementById("ce-f-codigo")?.value || "").trim();
    const status   = document.getElementById("ce-f-status")?.value || "";
    const pagamento = document.getElementById("ce-f-pagamento")?.value || "";
    const marca    = (document.getElementById("ce-f-marca")?.value || "").trim();
    const filtros = [
      busca    && `Nome: "${busca}"`,
      codigo   && `Código: "${codigo}"`,
      status   && `Status: ${STATUS[status]?.label || status}`,
      pagamento && `Pagamento: ${PAGAMENTO[pagamento]?.label || pagamento}`,
      marca    && `Marca: "${marca}"`,
    ].filter(Boolean);

    const entregues    = rows.filter(r => r.status === "entregue");
    const naoEntregues = rows.filter(r => r.status !== "entregue");

    function stLabel(s){ return STATUS[s]?.label || s || "—"; }
    function pgLabel(s){ return PAGAMENTO[s]?.label || s || "Pendente"; }
    function fmtDate(v){ return v ? new Date(v+"T12:00:00").toLocaleDateString("pt-BR") : "—"; }

    function renderRows(list){
      return list.map(r => `
        <tr>
          <td>${_dn(_pessoaNome(r.pessoa_id))}</td>
          <td>${r.codigo_controle || "—"}</td>
          <td>${r.marca || "—"}</td>
          <td>${stLabel(r.status)}</td>
          <td>${pgLabel(r.status_pagamento || "pendente")}</td>
          <td>${fmtDate(r.data_entrega)}</td>
          <td>${r.observacoes || ""}</td>
        </tr>`).join("");
    }

    let tbody = "";
    if(entregues.length){
      tbody += `<tr class="sec-hdr"><td colspan="7">Controles Entregues (${entregues.length})</td></tr>`;
      tbody += renderRows(entregues);
    }
    if(naoEntregues.length){
      tbody += `<tr class="sec-hdr"><td colspan="7">Demais Controles (${naoEntregues.length})</td></tr>`;
      tbody += renderRows(naoEntregues);
    }

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Controles do Estacionamento</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px 24px}
  h1{font-size:15px;font-weight:700;margin-bottom:2px}
  .org{font-size:10px;color:#555;margin-bottom:12px}
  .meta{font-size:10px;color:#444;margin-bottom:14px;display:flex;gap:24px;flex-wrap:wrap}
  .meta span{white-space:nowrap}
  table{width:100%;border-collapse:collapse;margin-top:4px}
  th{background:#1a2236;color:#fff;font-size:10px;font-weight:700;padding:6px 7px;text-align:left}
  td{padding:5px 7px;border-bottom:1px solid #e8eaf0;vertical-align:top}
  tr:nth-child(even) td{background:#f5f7fb}
  tr.sec-hdr td{background:#e8eaf0;font-weight:700;font-size:10px;color:#334;padding:4px 7px;border-bottom:1px solid #ccc}
  .footer{margin-top:16px;font-size:9px;color:#888;text-align:right}
  @media print{body{padding:10px 14px}button{display:none}}
</style></head><body>
<h1>Relação de Controles do Estacionamento</h1>
<div class="org">IPPenha — Sistema SIPEN</div>
<div class="meta">
  <span>Emissão: ${emissao}</span>
  <span>Total de registros: ${rows.length}</span>
  ${filtros.length ? `<span>Filtros: ${filtros.join(" | ")}</span>` : ""}
</div>
<table>
  <thead><tr><th>Nome</th><th>Código</th><th>Marca</th><th>Status</th><th>Pagamento</th><th>Data Entrega</th><th>Observações</th></tr></thead>
  <tbody>${tbody || "<tr><td colspan='7' style='text-align:center;color:#888;padding:12px'>Nenhum registro</td></tr>"}</tbody>
</table>
<div class="footer">Documento gerado automaticamente pelo SIPEN</div>
<script>window.onload=()=>window.print();<\/script>
</body></html>`;

    const w = window.open("", "_blank");
    if(!w) return T("Bloqueio de popup", "Permita popups para este site e tente novamente.");
    w.document.write(html);
    w.document.close();
  }

  window.ceCarregar = ceCarregar;
  window.ceRender = ceRender;
  window.ceAbrirModal = ceAbrirModal;
  window.ceVincularMembro = ceVincularMembro;
  window.ceFecharModal = function(){ document.getElementById("ce-modal")?.remove(); };
  window.ceSalvar = ceSalvar;
  window.ceMudarPagamento = ceMudarPagamento;
  window.ceMudarStatus = ceMudarStatus;
  window.ceExcluir = ceExcluir;
  window.cePrint = cePrint;
})();

