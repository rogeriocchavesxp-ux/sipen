/* ═══════════════════════════════════════════════════════════════
   ESCALA DE PREGAÇÃO v2.0 — Supabase · CRUD · Geração automática
   Tabelas: pastores, escala_pregacao
═══════════════════════════════════════════════════════════════ */
(function () {

  /* ── Configuração de cultos ──────────────────────────────────── */
  const _TIPO_SLOT = {
    domingo_manha:     {label:"Domingo Manhã",      cor:"#4a9cf5", ico:"☀️"},
    domingo_noite:     {label:"Domingo Noite",      cor:"#8b6fd4", ico:"🌙"},
    conexao_com_deus:  {label:"Conexão com Deus",   cor:"#2ab5c0", ico:"🙏"},
    tarde_da_esperanca:{label:"Tarde da Esperança", cor:"#d4a843", ico:"✝️"},
  };
  const _STATUS_CFG = {
    PENDENTE:   {bg:"rgba(212,168,67,.15)",  cl:"#d4a843", label:"Pendente"},
    PREENCHIDA: {bg:"rgba(74,156,245,.15)",  cl:"#4a9cf5", label:"Preenchida"},
    CONFIRMADA: {bg:"rgba(58,170,92,.15)",   cl:"#3aaa5c", label:"Confirmada"},
  };
  const TC = {
    domingo_manha:     {bg:"rgba(74,156,245,.13)",  cl:"#4a9cf5"},
    domingo_noite:     {bg:"rgba(139,111,212,.13)", cl:"#8b6fd4"},
    conexao_com_deus:  {bg:"rgba(42,181,192,.13)",  cl:"#2ab5c0"},
    tarde_da_esperanca:{bg:"rgba(212,168,67,.13)",  cl:"#d4a843"},
  };
  const PCORES = ["#2ab5c0","#4a9cf5","#8b6fd4","#e08a2a","#e05555","#3aaa5c","#d4a843"];

  /* ── Estado ──────────────────────────────────────────────────── */
  const _nowMesKey = (() => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; })();
  const _st = {
    mes: (() => { const d=new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; })(),
    modo: "mensal",
    pastor: "",
    openMonths: new Set([_nowMesKey]),
    loaded: false,
    loading: false,
  };
  let _editingSlotKey  = null;
  let _editingPastorId = null;

  /* ── Dados ───────────────────────────────────────────────────── */
  let _pastores = [];
  const _escala = new Map(); // "YYYY-MM-DD-culto_tipo" → {id, pastor_id, local, observacoes, status, origem}

  const _SEED_PASTORES = [
    {id:"p1",nome_completo:"Rev. Amauri Oliveira",  nome_exibicao:"Rev. Amauri",    funcao:"Pastor Presidente", ativo:true},
    {id:"p2",nome_completo:"Rev. Carlos Henrique",  nome_exibicao:"Rev. C. Henrique",funcao:"Pastor",           ativo:true},
    {id:"p3",nome_completo:"Rev. Carlos Lima",       nome_exibicao:"Rev. C. Lima",   funcao:"Pastor",            ativo:true},
    {id:"p4",nome_completo:"Rev. Cornélio Castro",   nome_exibicao:"Rev. Cornélio",  funcao:"Pastor",            ativo:true},
    {id:"p5",nome_completo:"Rev. Fábio Carvalho",   nome_exibicao:"Rev. Fábio",     funcao:"Pastor",            ativo:true},
    {id:"p6",nome_completo:"Rev. Flávio Ramos",      nome_exibicao:"Rev. Flávio",    funcao:"Pastor",            ativo:true},
  ];

  /* ── Supabase ────────────────────────────────────────────────── */
  async function _loadAll() {
    if (_st.loading) return;
    _st.loading = true;
    try {
      const r = await fetch(`${apiBaseUrl()}/rest/v1/pastores?select=*&order=nome_completo.asc`, {headers:apiHeaders()});
      if (r.ok) { const d=await r.json(); if(Array.isArray(d)&&d.length){_pastores=d;}else{console.warn("pastores: tabela vazia, usando seed");_pastores=_SEED_PASTORES;} }
      else { console.warn("pastores: HTTP",r.status,"usando seed"); _pastores=_SEED_PASTORES; }
    } catch(e) { console.warn("pastores: erro de rede, usando seed",e); _pastores=_SEED_PASTORES; }
    try {
      const r = await fetch(`${apiBaseUrl()}/rest/v1/escala_pregacao?select=*&order=data.asc&limit=3000`, {headers:apiHeaders()});
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d)) {
          _escala.clear();
          d.forEach(row => {
            const key = `${row.data}-${row.culto_tipo}`;
            _escala.set(key, {id:row.id, pastor_id:row.pastor_id||"", local:row.local||"Templo Principal", observacoes:row.observacoes||"", status:row.status||"PENDENTE", origem:row.origem||"manual"});
          });
        }
      }
    } catch(e) {}
    _st.loaded = true; _st.loading = false;
    _render();
  }

  async function _upsertSlot(key, fields) {
    const data = key.slice(0,10), culto_tipo = key.slice(11);
    if (!culto_tipo) return;
    const existing = _escala.get(key);
    const autoStatus = !fields.pastor_id ? "PENDENTE" : (fields.status==="PENDENTE" ? "PREENCHIDA" : fields.status);
    const payload = {...fields, status:autoStatus};
    if (existing?.id) {
      let r;
      try { r = await fetch(`${apiBaseUrl()}/rest/v1/escala_pregacao?id=eq.${existing.id}`, {method:"PATCH", headers:apiHeaders({"Prefer":"return=minimal"}), body:JSON.stringify(payload)}); }
      catch(e) { console.error("PATCH escala_pregacao:", e); T("Erro de rede", e.message); return; }
      if (!r.ok) { const err=await r.text(); console.error("PATCH escala_pregacao:",r.status,err); T(`Erro ao salvar (${r.status})`,err); return; }
      _escala.set(key, {...existing, ...payload});
    } else {
      let r;
      const url = `${apiBaseUrl()}/rest/v1/escala_pregacao?on_conflict=data,culto_tipo`;
      const body = JSON.stringify({data, culto_tipo, ...payload});
      const headers = apiHeaders({"Prefer":"resolution=merge-duplicates,return=representation"});
      try { r = await fetch(url, {method:"POST", headers, body}); }
      catch(e) { console.error("UPSERT escala_pregacao:", e); T("Erro de rede", e.message); return; }
      if (!r.ok) { const err=await r.text(); console.error("UPSERT escala_pregacao:",r.status,err); T(`Erro ao salvar (${r.status})`,err); return; }
      const rows = await r.json();
      const row  = Array.isArray(rows) ? rows[0] : rows;
      if(row) _escala.set(key, {id:row.id, pastor_id:row.pastor_id||"", local:row.local||"Templo Principal", observacoes:row.observacoes||"", status:row.status||"PENDENTE", origem:row.origem||"manual"});
    }
  }

  async function _gerarMes(ano, mes) {
    const ativos = _pastores.filter(p=>p.ativo!==false);
    if (!ativos.length) return;
    const slots = _slotsForMes(ano, mes);
    const novos = slots.filter(s=>!_escala.has(s.key));
    if (!novos.length) return;
    const cnt = {};
    ativos.forEach(p=>{cnt[p.id]=0;});
    _escala.forEach(s=>{if(s.pastor_id&&cnt[s.pastor_id]!==undefined) cnt[s.pastor_id]++;});
    let idx = ativos.reduce((mi,p,i)=>(cnt[p.id]<cnt[ativos[mi].id]?i:mi), 0);
    const inserts = novos.map(slot => {
      const pastor = ativos[idx % ativos.length]; idx++;
      return {data:slot.ds, culto_tipo:slot.tipo, pastor_id:pastor.id, local:"Templo Principal", observacoes:"", status:"PENDENTE", origem:"automatico"};
    });
    try {
      const r = await fetch(`${apiBaseUrl()}/rest/v1/escala_pregacao`, {method:"POST", headers:apiHeaders({"Prefer":"return=minimal,resolution=ignore-duplicates"}), body:JSON.stringify(inserts)});
      if (!r.ok) { const err=await r.text(); console.error("POST batch escala:",r.status,err); T(`Erro ao gerar (${r.status})`,err); }
    } catch(e) { console.error("POST batch escala:", e); T("Erro ao gerar",e.message); }
    await _loadAll();
  }

  /* ── Helpers ─────────────────────────────────────────────────── */
  function _addM(d,n){const r=new Date(d);r.setMonth(r.getMonth()+n);r.setDate(1);return r;}
  function _fmtMes(d){return d.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});}
  function _iso(d){return d.toISOString().slice(0,10);}
  function _today(){return new Date().toISOString().slice(0,10);}
  function _byId(id){return _pastores.find(p=>p.id===id);}
  function _nomePastor(id){const p=_byId(id);return p?p.nome_exibicao||p.nome_completo:"—";}
  function _canEdit(){
    return (typeof temPermissao==="function"&&temPermissao("Pastoral","full"))||
           (typeof USUARIO_ATUAL!=="undefined"&&(USUARIO_ATUAL?.perfil==="admin_geral"||USUARIO_ATUAL?.perfil==="ADMINISTRADOR_GERAL"));
  }
  function _isAdmin(){return typeof USUARIO_ATUAL!=="undefined"&&(USUARIO_ATUAL?.perfil==="admin_geral"||USUARIO_ATUAL?.perfil==="ADMINISTRADOR_GERAL");}
  function _slotsForMes(ano,mes){
    const slots=[],last=new Date(ano,mes+1,0).getDate();
    for(let d=1;d<=last;d++){
      const dt=new Date(ano,mes,d),dow=dt.getDay(),ds=_iso(dt);
      if(dow===0){slots.push({ds,tipo:"domingo_manha",key:`${ds}-domingo_manha`});slots.push({ds,tipo:"domingo_noite",key:`${ds}-domingo_noite`});}
      if(dow===1) slots.push({ds,tipo:"conexao_com_deus",key:`${ds}-conexao_com_deus`});
      if(dow===3) slots.push({ds,tipo:"tarde_da_esperanca",key:`${ds}-tarde_da_esperanca`});
    }
    return slots;
  }
  function _forDate(ds){
    const res=[];
    Object.keys(_TIPO_SLOT).forEach(tipo=>{
      const key=`${ds}-${tipo}`;
      if(_escala.has(key)){
        const s=_escala.get(key);
        if(!_st.pastor||s.pastor_id===_st.pastor) res.push({key,tipo,...s});
      }
    });
    return res;
  }

  /* ── Modal de slot ───────────────────────────────────────────── */
  function _openSlotModal(key){
    if(!_canEdit()) return;
    _editingSlotKey = key;
    const tipo = key.slice(11), ts = _TIPO_SLOT[tipo]||_TIPO_SLOT.domingo_manha;
    const st   = _escala.get(key)||{pastor_id:"",local:"Templo Principal",observacoes:"",status:"PENDENTE"};
    const ativos = _pastores.filter(p=>p.ativo!==false);
    const dt = new Date(key.slice(0,10)+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
    const dispIds = (typeof dp_getDisponiveisIds==="function") ? dp_getDisponiveisIds(key.slice(0,10),tipo) : [];
    const dispObs = (typeof dp_getObsDisponiveis==="function") ? dp_getObsDisponiveis(key.slice(0,10),tipo) : [];
    const dispAtivos = ativos.filter(p=>dispIds.includes(p.id));
    const outrosAtivos = ativos.filter(p=>!dispIds.includes(p.id));
    let opts = `<option value="">— Selecionar pastor —</option>`;
    if(dispAtivos.length){
      opts+=`<optgroup label="✅ Disponíveis para esta data">`;
      dispAtivos.forEach(p=>{opts+=`<option value="${p.id}"${st.pastor_id===p.id?" selected":""}>${p.nome_completo}</option>`;});
      opts+=`</optgroup>`;
    }
    if(outrosAtivos.length){
      opts+=`<optgroup label="${dispAtivos.length?"Outros pastores":"Todos os pastores"}">`;
      outrosAtivos.forEach(p=>{opts+=`<option value="${p.id}"${st.pastor_id===p.id?" selected":""}>${p.nome_completo}</option>`;});
      opts+=`</optgroup>`;
    }
    const dispBanner = dispAtivos.length
      ? `<div style="background:rgba(58,170,92,0.08);border:1px solid rgba(58,170,92,0.25);border-radius:6px;padding:8px 12px;font-size:10.5px;color:var(--gmd);margin-bottom:4px">✅ <strong>${dispAtivos.length} pastor${dispAtivos.length>1?"es":""}  disponível${dispAtivos.length>1?"is":""}</strong> para esta data: ${dispAtivos.map(p=>p.nome_exibicao||p.nome_completo).join(", ")}${dispObs.filter(o=>o).length?`<div style="margin-top:3px;color:var(--tx3)">Obs: ${dispObs.filter(o=>o).join(" · ")}</div>`:""}</div>`
      : `<div style="background:rgba(212,168,67,0.08);border:1px solid rgba(212,168,67,0.2);border-radius:6px;padding:8px 12px;font-size:10.5px;color:var(--gold);margin-bottom:4px">⚠ Nenhum pastor informou disponibilidade para esta data. <a onclick="go('pastoral-disp')" style="color:var(--teal);cursor:pointer;text-decoration:underline">Cadastrar disponibilidade</a></div>`;
    let sOpts = "";
    Object.entries(_STATUS_CFG).forEach(([k,v])=>{sOpts+=`<option value="${k}"${st.status===k?" selected":""}>${v.label}</option>`;});
    const modal = document.getElementById("ep-modal"); if(!modal) return;
    modal.innerHTML = `<div style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9990;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)ep_closeModal()"><div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;width:460px;max-width:94vw;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,.4)"><div style="display:flex;align-items:center;gap:10px;margin-bottom:18px"><span style="font-size:20px">${ts.ico}</span><div><div style="font-size:13px;font-weight:700;color:${ts.cor}">${ts.label}</div><div style="font-size:10.5px;color:var(--tx3);text-transform:capitalize">${dt}</div></div><button onclick="ep_closeModal()" style="margin-left:auto;background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer;padding:4px 8px">✕</button></div><div style="display:flex;flex-direction:column;gap:12px">${dispBanner}<div><label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:4px">Pastor</label><select id="ep-modal-pastor" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none;font-family:var(--sans)">${opts}</select></div><div><label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:4px">Local</label><input id="ep-modal-local" type="text" value="${(st.local||"Templo Principal").replace(/"/g,"&quot;")}" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none;font-family:var(--sans);box-sizing:border-box"></div><div><label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:4px">Status</label><select id="ep-modal-status" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none;font-family:var(--sans)">${sOpts}</select></div><div><label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:4px">Observações</label><input id="ep-modal-obs" type="text" value="${(st.observacoes||"").replace(/"/g,"&quot;")}" placeholder="Observações opcionais..." style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none;font-family:var(--sans);box-sizing:border-box"></div></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px"><button onclick="ep_closeModal()" style="padding:8px 16px;background:var(--bg-surface);border:1px solid var(--bd2);border-radius:6px;color:var(--tx2);font-size:12px;cursor:pointer;font-family:var(--sans)">Cancelar</button><button onclick="ep_saveModal()" style="padding:8px 16px;background:var(--teal);border:none;border-radius:6px;color:#fff;font-size:12px;cursor:pointer;font-weight:600;font-family:var(--sans)">Salvar</button></div></div></div>`;
    modal.style.display = "block";
  }
  window.ep_closeModal = function(){const m=document.getElementById("ep-modal");if(m){m.innerHTML="";m.style.display="none";}};
  window.ep_saveModal  = async function(){
    const key=_editingSlotKey; if(!key) return;
    const pastor_id  = document.getElementById("ep-modal-pastor")?.value||"";
    const local      = document.getElementById("ep-modal-local")?.value||"Templo Principal";
    const status     = document.getElementById("ep-modal-status")?.value||"PENDENTE";
    const observacoes= document.getElementById("ep-modal-obs")?.value||"";
    await _upsertSlot(key, {pastor_id, local, observacoes, status});
    ep_closeModal(); _render();
  };
  window.ep_openSlot = function(key){_openSlotModal(key);};

  /* ── Modal de pastor ─────────────────────────────────────────── */
  function _openPastorModal(pastor){
    _editingPastorId = pastor?.id||null;
    const isNew = !pastor;
    const v = n=>(n||"").replace(/"/g,"&quot;");
    const modal = document.getElementById("ep-modal"); if(!modal) return;
    modal.innerHTML = `<div style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9990;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)ep_closeModal()"><div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;width:420px;max-width:94vw;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,.4)"><div style="display:flex;align-items:center;margin-bottom:18px"><div style="font-size:13px;font-weight:700;color:var(--tx1)">${isNew?"Novo Pastor":"Editar Pastor"}</div><button onclick="ep_closeModal()" style="margin-left:auto;background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer">✕</button></div><div style="display:flex;flex-direction:column;gap:12px"><div><label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:4px;display:block">Nome Completo</label><input id="ep-pm-nome" type="text" value="${v(pastor?.nome_completo)}" placeholder="Rev. Nome Sobrenome" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none;font-family:var(--sans);box-sizing:border-box"></div><div><label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:4px;display:block">Nome de Exibição</label><input id="ep-pm-exib" type="text" value="${v(pastor?.nome_exibicao)}" placeholder="Rev. Nome" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none;font-family:var(--sans);box-sizing:border-box"></div><div><label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:4px;display:block">Função</label><input id="ep-pm-funcao" type="text" value="${v(pastor?.funcao)}" placeholder="Pastor, Diácono, etc." style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none;font-family:var(--sans);box-sizing:border-box"></div><div><label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:4px;display:block">Unidade</label><input id="ep-pm-unidade" type="text" value="${v(pastor?.unidade)}" placeholder="Sede, Filial, etc." style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none;font-family:var(--sans);box-sizing:border-box"></div><div style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="ep-pm-ativo" ${pastor?.ativo!==false?"checked":""} style="width:14px;height:14px;accent-color:var(--teal)"><label for="ep-pm-ativo" style="font-size:12px;color:var(--tx2)">Pastor ativo (aparece nas escalas)</label></div></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px"><button onclick="ep_closeModal()" style="padding:8px 16px;background:var(--bg-surface);border:1px solid var(--bd2);border-radius:6px;color:var(--tx2);font-size:12px;cursor:pointer;font-family:var(--sans)">Cancelar</button><button onclick="ep_savePastor()" style="padding:8px 16px;background:var(--teal);border:none;border-radius:6px;color:#fff;font-size:12px;cursor:pointer;font-weight:600;font-family:var(--sans)">Salvar</button></div></div></div>`;
    modal.style.display = "block";
  }
  window.ep_novoPastor   = function(){_openPastorModal(null);};
  window.ep_editarPastor = function(id){const p=_byId(id);if(p)_openPastorModal(p);};
  window.ep_savePastor   = async function(){
    const nome_completo=(document.getElementById("ep-pm-nome")?.value||"").trim();
    if(!nome_completo){alert("Nome completo é obrigatório.");return;}
    const payload={nome_completo, nome_exibicao:(document.getElementById("ep-pm-exib")?.value||"").trim(), funcao:(document.getElementById("ep-pm-funcao")?.value||"").trim(), unidade:(document.getElementById("ep-pm-unidade")?.value||"").trim(), ativo:document.getElementById("ep-pm-ativo")?.checked??true};
    try {
      const id=_editingPastorId;
      if(id) await fetch(`${apiBaseUrl()}/rest/v1/pastores?id=eq.${id}`,{method:"PATCH",headers:apiHeaders({"Prefer":"return=minimal"}),body:JSON.stringify(payload)});
      else   await fetch(`${apiBaseUrl()}/rest/v1/pastores`,{method:"POST",headers:apiHeaders({"Prefer":"return=representation"}),body:JSON.stringify(payload)});
    } catch(e){alert("Erro ao salvar: "+e.message);return;}
    ep_closeModal(); await _loadAll();
  };
  window.ep_togglePastorAtivo = async function(id,ativo){
    try{await fetch(`${apiBaseUrl()}/rest/v1/pastores?id=eq.${id}`,{method:"PATCH",headers:apiHeaders({"Prefer":"return=minimal"}),body:JSON.stringify({ativo})});await _loadAll();}catch(e){}
  };

  /* ── Painel de gerenciamento (admin) ─────────────────────────── */
  function _renderGerenciarPastores(){
    if(!_isAdmin()) return "";
    let h=`<div class="card" style="margin-bottom:14px"><div class="ctit" style="display:flex;align-items:center">Gerenciar Pastores <span class="csub">/ cadastro e ativação</span><button onclick="ep_novoPastor()" style="margin-left:auto;padding:5px 12px;background:var(--teal);border:none;border-radius:5px;color:#fff;font-size:11px;cursor:pointer;font-weight:600">+ Novo</button></div><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">`;
    _pastores.forEach(p=>{
      const cor=p.ativo!==false?"#3aaa5c":"#888";
      h+=`<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-surface);border:1px solid var(--bd2);border-radius:7px;min-width:200px"><span style="color:${cor};font-size:12px">●</span><div style="flex:1;min-width:0"><div style="font-size:11.5px;font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nome_completo}</div><div style="font-size:9.5px;color:var(--tx3)">${p.funcao||""}</div></div><button onclick="ep_editarPastor('${p.id}')" style="background:none;border:1px solid var(--bd2);border-radius:4px;color:var(--tx3);font-size:10px;padding:3px 7px;cursor:pointer">✏️</button><button onclick="ep_togglePastorAtivo('${p.id}',${!p.ativo})" style="background:none;border:1px solid var(--bd2);border-radius:4px;color:${p.ativo!==false?"var(--rose)":"var(--gr)"};font-size:10px;padding:3px 7px;cursor:pointer">${p.ativo!==false?"Desativar":"Ativar"}</button></div>`;
    });
    return h+`</div></div>`;
  }

  /* ── Pills de calendário ─────────────────────────────────────── */
  function _pill(item,compact){
    const t=TC[item.tipo]||TC.domingo_manha, ts=_TIPO_SLOT[item.tipo]||_TIPO_SLOT.domingo_manha;
    const nomeP=item.pastor_id?_nomePastor(item.pastor_id):"—";
    const shortN=nomeP.replace(/Rev\.\s*/,"").split(" ")[0];
    if(compact) return `<div style="background:${t.bg};border-left:2px solid ${t.cl};padding:2px 5px;border-radius:3px;margin-top:2px;font-size:9px;color:${t.cl};cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%" title="${nomeP} · ${ts.label}" onclick="ep_openSlot('${item.key}')">${ts.ico} ${shortN}</div>`;
    return `<div style="background:${t.bg};border-left:3px solid ${t.cl};padding:5px 9px;border-radius:5px;margin-top:5px;cursor:pointer;transition:opacity .12s" onclick="ep_openSlot('${item.key}')" onmouseover="this.style.opacity='.72'" onmouseout="this.style.opacity='1'"><div style="font-size:9px;font-weight:700;color:${t.cl};text-transform:uppercase;letter-spacing:.05em">${ts.ico} ${ts.label}</div><div style="font-size:11.5px;color:var(--tx1);font-weight:600;margin-top:1px">${nomeP}</div></div>`;
  }
  function _pillEmpty(ds,tipo){
    if(!_canEdit()) return "";
    const t=TC[tipo]||TC.domingo_manha, ts=_TIPO_SLOT[tipo]||_TIPO_SLOT.domingo_manha;
    return `<div style="border:1px dashed ${t.cl}44;padding:2px 5px;border-radius:3px;margin-top:2px;font-size:9px;color:${t.cl}88;cursor:pointer" onclick="ep_openSlot('${ds}-${tipo}')" title="Adicionar ${ts.label}">${ts.ico} +</div>`;
  }

  /* ── Grid calendário ─────────────────────────────────────────── */
  function _grid(targetMes,compact){
    const ano=targetMes.getFullYear(),mes=targetMes.getMonth();
    const today=_today(),lastDay=new Date(ano,mes+1,0).getDate(),firstDow=new Date(ano,mes,1).getDay();
    const DIAS=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
    let h=`<div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:8px;overflow:hidden">`;
    h+=`<div style="display:grid;grid-template-columns:repeat(7,1fr);background:var(--bg-surface);border-bottom:1px solid var(--bd1)">`;
    DIAS.forEach((d,i)=>{h+=`<div style="padding:${compact?'5px':'7px'} 4px;text-align:center;font-size:${compact?'8.5':'9.5'}px;font-weight:700;color:${i===0||i===6?'var(--tx2)':'var(--tx3)'};text-transform:uppercase">${compact?d[0]:d}</div>`;});
    h+=`</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--bd1)">`;
    const mh=compact?"60px":"88px";
    for(let i=0;i<firstDow;i++) h+=`<div style="min-height:${mh};background:var(--bg-body)"></div>`;
    for(let day=1;day<=lastDay;day++){
      const ds=`${ano}-${String(mes+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      const dow=(firstDow+day-1)%7, isToday=ds===today, isWe=dow===0||dow===6;
      const bg=isToday?"rgba(58,170,92,0.07)":isWe?"rgba(255,255,255,0.02)":"var(--bg-card)";
      h+=`<div style="min-height:${mh};background:${bg};padding:${compact?'4':'5'}px;border-top:2px solid ${isToday?'#3aaa5c':'transparent'}">`;
      h+=isToday?`<span style="display:inline-flex;align-items:center;justify-content:center;width:${compact?'16':'20'}px;height:${compact?'16':'20'}px;background:#3aaa5c;color:#fff;border-radius:50%;font-size:${compact?'9':'10.5'}px;font-weight:800">${day}</span>`:
                 `<span style="font-size:${compact?'9.5':'11'}px;font-weight:600;color:${isWe?'var(--tx2)':'var(--tx3)'}">${day}</span>`;
      _forDate(ds).forEach(item=>{h+=_pill(item,compact);});
      if(!compact){
        const empties=dow===0?["domingo_manha","domingo_noite"]:dow===1?["conexao_com_deus"]:dow===3?["tarde_da_esperanca"]:[];
        empties.forEach(tipo=>{if(!_escala.has(`${ds}-${tipo}`)) h+=_pillEmpty(ds,tipo);});
      }
      h+=`</div>`;
    }
    const trail=(firstDow+lastDay)%7; if(trail>0) for(let i=0;i<7-trail;i++) h+=`<div style="min-height:${mh};background:var(--bg-body)"></div>`;
    return h+`</div></div>`;
  }

  /* ── Modos de calendário ─────────────────────────────────────── */
  function _renderMensal(){return _grid(_st.mes,false);}
  function _renderTrimestral(){
    let h=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;overflow-x:auto">`;
    for(let i=0;i<3;i++){const m=_addM(_st.mes,i);h+=`<div><div style="font-size:12px;font-weight:700;color:var(--tx1);text-transform:capitalize;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid var(--teal)">${_fmtMes(m)}</div>${_grid(m,true)}</div>`;}
    return h+`</div>`;
  }
  function _renderSemestral(){
    const ps=_pastores.filter(p=>p.ativo!==false);
    const weeks=[];
    for(let mi=0;mi<6;mi++){
      const m=_addM(_st.mes,mi),ano=m.getFullYear(),mes=m.getMonth(),last=new Date(ano,mes+1,0).getDate();
      for(let d=1;d<=last;d++){const dt=new Date(ano,mes,d);if(dt.getDay()===0) weeks.push({ds:_iso(dt),lbl:dt.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}),mes});}
    }
    function _cnt(pid,ds){
      const mon=new Date(ds+"T12:00:00"),wed=new Date(ds+"T12:00:00");
      mon.setDate(mon.getDate()+1); wed.setDate(wed.getDate()+3);
      const dates=[ds,_iso(mon),_iso(wed)]; let n=0;
      dates.forEach(d=>Object.keys(_TIPO_SLOT).forEach(tipo=>{const s=_escala.get(`${d}-${tipo}`);if(s?.pastor_id===pid)n++;}));
      return n;
    }
    const today=_today();
    let h=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:540px"><thead><tr><th style="text-align:left;padding:8px 12px;font-size:10px;color:var(--tx3);font-weight:700;white-space:nowrap;background:var(--bg-card);border-bottom:1px solid var(--bd2);position:sticky;left:0;z-index:2;min-width:140px">Pastor / Semana</th>`;
    let lastM=-1;
    weeks.forEach(w=>{const sep=w.mes!==lastM;lastM=w.mes;h+=`<th style="padding:5px 3px;font-size:9px;color:${w.ds===today?'var(--gr)':'var(--tx3)'};font-weight:600;text-align:center;min-width:40px;background:${sep?"var(--bg-surface)":"var(--bg-card)"};border-bottom:1px solid var(--bd2);border-left:${sep?'2px solid var(--bd2)':'1px solid var(--bd1)'}">${w.lbl}</th>`;});
    h+=`</tr></thead><tbody>`;
    ps.forEach((p,pi)=>{
      const tot=weeks.reduce((s,w)=>s+_cnt(p.id,w.ds),0),rowBg=pi%2===0?"var(--bg-card)":"var(--bg-surface)";
      h+=`<tr style="border-bottom:1px solid var(--bd1)"><td style="padding:7px 12px;font-size:11px;font-weight:600;color:var(--tx1);white-space:nowrap;background:${rowBg};position:sticky;left:0;z-index:1;border-right:1px solid var(--bd2)"><span style="color:${PCORES[pi%PCORES.length]}">●</span> ${p.nome_exibicao||p.nome_completo}<span style="color:var(--tx3);font-size:9.5px;margin-left:8px">${tot} total</span></td>`;
      let lM=-1;
      weeks.forEach(w=>{const n=_cnt(p.id,w.ds),sep=w.mes!==lM;lM=w.mes;const col=n>=3?"#e05555":n===2?"#e08a2a":"#2ab5c0";const cell=n>0?`<div style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:${n>=3?"rgba(224,85,85,.18)":n===2?"rgba(224,138,42,.18)":"rgba(42,181,192,.18)"};color:${col};border-radius:50%;font-size:10.5px;font-weight:700">${n}</div>`:"";h+=`<td style="text-align:center;padding:4px 2px;border-left:${sep?'2px solid var(--bd2)':'1px solid var(--bd1)'};background:${w.ds===today?"rgba(58,170,92,0.05)":"transparent"}">${cell}</td>`;});
      h+=`</tr>`;
    });
    return h+`</tbody></table></div>`;
  }

  /* ── Indicadores ─────────────────────────────────────────────── */
  function _renderIndicadores(){
    const el=document.getElementById("ep-indicadores"); if(!el) return;
    const ps=_pastores.filter(p=>p.ativo!==false);
    if(!ps.length){el.innerHTML="";return;}
    const cnt={};
    ps.forEach(p=>{cnt[p.id]=0;});
    _escala.forEach(s=>{if(s.pastor_id&&cnt[s.pastor_id]!==undefined)cnt[s.pastor_id]++;});
    const vals=Object.values(cnt),total=vals.reduce((s,v)=>s+v,0),media=ps.length>0?total/ps.length:0,maxV=Math.max(...vals,1);
    const sorted=[...ps].sort((a,b)=>(cnt[b.id]||0)-(cnt[a.id]||0));
    const semEscala=ps.filter(p=>!cnt[p.id]);
    const semPastor=[..._escala.values()].filter(s=>!s.pastor_id).length;
    const pendentes=[..._escala.values()].filter(s=>s.status==="PENDENTE"&&s.pastor_id).length;
    let alerts="";
    if(semEscala.length) alerts+=`<div style="background:rgba(224,138,42,.1);border:1px solid rgba(224,138,42,.3);border-radius:6px;padding:8px 12px;font-size:11px;color:var(--amber);margin-bottom:10px">⚠️ Sem escalas: ${semEscala.map(p=>p.nome_exibicao||p.nome_completo).join(", ")}</div>`;
    if(semPastor) alerts+=`<div style="background:rgba(212,168,67,.1);border:1px solid rgba(212,168,67,.3);border-radius:6px;padding:8px 12px;font-size:11px;color:#d4a843;margin-bottom:10px">◌ ${semPastor} cultos sem pastor definido</div>`;
    if(pendentes) alerts+=`<div style="background:rgba(74,156,245,.1);border:1px solid rgba(74,156,245,.3);border-radius:6px;padding:8px 12px;font-size:11px;color:#4a9cf5;margin-bottom:10px">● ${pendentes} escalas aguardando confirmação</div>`;
    let h=`<div class="card">${alerts}<div class="ctit">Distribuição de Carga <span class="csub">/ ${total} escalas · média ${Math.round(media)}/pastor</span><span class="cact" onclick="ep_render()">↻</span></div><div class="bars" style="gap:9px;margin-top:12px">`;
    sorted.forEach((p,i)=>{
      const n=cnt[p.id]||0,pct=Math.round((n/maxV)*100),over=n>media*1.45,under=n<media*0.55&&n>0,cor=PCORES[i%PCORES.length];
      const badge=over?`<span style="background:rgba(224,85,85,.15);color:var(--rose);font-size:8.5px;padding:1px 6px;border-radius:8px;margin-left:6px;font-weight:700">▲ sobrecarregado</span>`:under?`<span style="background:rgba(224,138,42,.15);color:var(--amber);font-size:8.5px;padding:1px 6px;border-radius:8px;margin-left:6px;font-weight:700">▼ poucas atribuições</span>`:"";
      h+=`<div><div class="bh"><span class="bn">${p.nome_exibicao||p.nome_completo}${badge}</span><span class="bv">${n}</span></div><div class="bt"><div class="bf" style="width:${pct}%;background:${cor}"></div></div></div>`;
    });
    el.innerHTML=h+`</div></div>`;
  }

  /* ── Lista (accordion) ───────────────────────────────────────── */
  function _renderMesSlots(slots,canEdit){
    if(!slots.length) return `<div style="color:var(--tx3);font-size:11.5px;padding:12px 4px">Nenhum culto neste mês.</div>`;
    let h="",lastDs="";
    slots.forEach(slot=>{
      const st=_escala.get(slot.key)||{pastor_id:"",local:"Templo Principal",observacoes:"",status:"PENDENTE"};
      const sc=_STATUS_CFG[st.status]||_STATUS_CFG.PENDENTE, tc=_TIPO_SLOT[slot.tipo];
      const nomeP=st.pastor_id?_nomePastor(st.pastor_id):"";
      if(slot.ds!==lastDs){
        lastDs=slot.ds;
        const dt=new Date(slot.ds+"T12:00:00"),isToday=slot.ds===_today();
        h+=`<div style="font-size:10.5px;font-weight:700;color:${isToday?"#3aaa5c":"var(--tx3)"};text-transform:capitalize;padding:14px 4px 5px;border-top:1px solid var(--bd1);margin-top:4px">${isToday?"● ":""}${dt.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"})}</div>`;
      }
      h+=`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:7px 10px;margin:3px 0;background:var(--bg-card);border-radius:6px;border-left:3px solid ${tc.cor}"><div style="min-width:154px;flex-shrink:0"><span style="font-size:9.5px;font-weight:700;color:${tc.cor};text-transform:uppercase;letter-spacing:.04em">${tc.ico} ${tc.label}</span></div>`;
      if(canEdit){
        h+=`<div style="flex:1;min-width:170px;font-size:11.5px;color:${nomeP?"var(--tx1)":"var(--tx3)"};cursor:pointer" onclick="ep_openSlot('${slot.key}')">${nomeP||"— Clique para definir —"}</div>`;
        h+=`<span style="font-size:9.5px;padding:3px 9px;border-radius:8px;font-weight:700;background:${sc.bg};color:${sc.cl};cursor:pointer" onclick="ep_openSlot('${slot.key}')">${sc.label}</span>`;
        h+=`<button onclick="ep_openSlot('${slot.key}')" style="background:none;border:1px solid var(--bd2);border-radius:4px;color:var(--tx3);font-size:10px;padding:3px 8px;cursor:pointer">✏️</button>`;
      }else{
        h+=`<div style="flex:1;min-width:170px;font-size:11.5px;color:${nomeP?"var(--tx1)":"var(--tx3)"}">${nomeP||"— Não definido —"}</div>`;
        h+=`<span style="font-size:9.5px;padding:3px 9px;border-radius:8px;font-weight:700;background:${sc.bg};color:${sc.cl}">${sc.label}</span>`;
        if(st.observacoes) h+=`<span style="font-size:10px;color:var(--tx3);font-style:italic">${st.observacoes}</span>`;
      }
      h+=`</div>`;
    });
    return h;
  }

  function _renderLista(){
    const canEdit=_canEdit();
    let h="";
    if(_isAdmin()) h+=_renderGerenciarPastores();
    if(canEdit){
      const ano=_st.mes.getFullYear(),mes=_st.mes.getMonth();
      const mn=_st.mes.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
      h+=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button onclick="ep_gerarMes(${ano},${mes})" style="padding:7px 14px;background:var(--bg-card);border:1px solid var(--teal);border-radius:6px;color:var(--teal);font-size:11.5px;cursor:pointer;font-weight:600;font-family:var(--sans)">⚡ Gerar ${mn.charAt(0).toUpperCase()+mn.slice(1)}</button><button onclick="ep_gerar3Meses(${ano},${mes})" style="padding:7px 14px;background:var(--bg-card);border:1px solid var(--bd2);border-radius:6px;color:var(--tx2);font-size:11.5px;cursor:pointer;font-family:var(--sans)">⚡⚡ Gerar Próximos 3 Meses</button></div>`;
    }
    for(let i=0;i<14;i++){
      const m=_addM(_st.mes,i),ano=m.getFullYear(),mes=m.getMonth();
      const mk=`${ano}-${String(mes+1).padStart(2,"0")}`;
      const isOpen=_st.openMonths.has(mk),isCurrent=mk===_nowMesKey;
      const slots=_slotsForMes(ano,mes);
      const cnt={PENDENTE:0,PREENCHIDA:0,CONFIRMADA:0};
      slots.forEach(s=>{const st=(_escala.get(s.key)||{}).status||"PENDENTE";cnt[st]=(cnt[st]||0)+1;});
      const nomeMes=m.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
      h+=`<div style="border:1px solid ${isCurrent?"var(--teal)":"var(--bd2)"};border-radius:8px;overflow:hidden;margin-bottom:8px"><div onclick="ep_toggleMes('${mk}')" style="display:flex;align-items:center;gap:10px;padding:11px 16px;cursor:pointer;background:${isCurrent?"rgba(42,181,192,0.06)":"var(--bg-card)"};user-select:none" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'"><span style="font-size:12px;color:var(--teal)">${isOpen?"▼":"▶"}</span><span style="font-size:12.5px;font-weight:700;color:var(--tx1);text-transform:capitalize;flex:1">${nomeMes}</span>`;
      if(isCurrent) h+=`<span style="font-size:8.5px;background:rgba(42,181,192,.18);color:var(--teal);padding:2px 8px;border-radius:10px;font-weight:700;flex-shrink:0">MÊS ATUAL</span>`;
      if(cnt.CONFIRMADA) h+=`<span style="font-size:9px;background:rgba(58,170,92,.15);color:#3aaa5c;padding:2px 8px;border-radius:8px;font-weight:700;flex-shrink:0">✓ ${cnt.CONFIRMADA}</span>`;
      if(cnt.PREENCHIDA) h+=`<span style="font-size:9px;background:rgba(74,156,245,.15);color:#4a9cf5;padding:2px 8px;border-radius:8px;font-weight:700;flex-shrink:0">● ${cnt.PREENCHIDA}</span>`;
      if(cnt.PENDENTE)   h+=`<span style="font-size:9px;background:rgba(212,168,67,.15);color:#d4a843;padding:2px 8px;border-radius:8px;font-weight:700;flex-shrink:0">◌ ${cnt.PENDENTE}</span>`;
      h+=`</div>`;
      if(isOpen){h+=`<div style="border-top:1px solid var(--bd1);padding:8px 12px 14px;background:var(--bg-surface)">`;if(!canEdit)h+=`<div style="font-size:10px;color:var(--tx3);padding:4px 4px 10px">Visualização somente leitura.</div>`;h+=_renderMesSlots(slots,canEdit)+`</div>`;}
      h+=`</div>`;
    }
    return h;
  }

  /* ── Render principal ────────────────────────────────────────── */
  function _render(){
    if(!_st.loaded&&!_st.loading){
      const ct=document.getElementById("ep-conteudo");
      if(ct) ct.innerHTML=`<div style="text-align:center;padding:40px;color:var(--tx3)">Carregando escala...</div>`;
      _loadAll(); return;
    }
    if(_st.loading) return;
    const lbl=document.getElementById("ep-mes-label");
    if(lbl){
      const t=_st.modo==="mensal"?_fmtMes(_st.mes):_st.modo==="trimestral"?`${_fmtMes(_st.mes)} → ${_fmtMes(_addM(_st.mes,2))}`:_st.modo==="semestral"?`${_fmtMes(_st.mes)} → ${_fmtMes(_addM(_st.mes,5))}`:`${_fmtMes(_st.mes)} → ${_fmtMes(_addM(_st.mes,13))}`;
      lbl.textContent=t.charAt(0).toUpperCase()+t.slice(1);
    }
    ["mensal","trimestral","semestral","lista"].forEach(m=>{
      const btn=document.getElementById(`ep-btn-${m}`); if(!btn) return;
      const on=_st.modo===m;
      btn.style.cssText=`padding:6px 12px;border:none;${m!=="mensal"?"border-left:1px solid var(--bd2);":""}cursor:pointer;font-size:11.5px;font-family:var(--sans);transition:all .15s;background:${on?"var(--teal)":"var(--bg-card)"};color:${on?"#fff":"var(--tx2)"};font-weight:${on?700:400}`;
    });
    const sel=document.getElementById("ep-pastor-filter");
    if(sel){
      const curVal=sel.value;
      sel.innerHTML=`<option value="">Todos os pastores</option>`;
      _pastores.filter(p=>p.ativo!==false).forEach(p=>{const o=new Option(p.nome_exibicao||p.nome_completo,p.id);if(p.id===curVal)o.selected=true;sel.add(o);});
    }
    const ct=document.getElementById("ep-conteudo"); if(!ct) return;
    ct.innerHTML=_st.modo==="mensal"?_renderMensal():_st.modo==="trimestral"?_renderTrimestral():_st.modo==="semestral"?_renderSemestral():_renderLista();
    if(_st.modo!=="lista") _renderIndicadores();
    else {const ind=document.getElementById("ep-indicadores");if(ind)ind.innerHTML="";}
  }

  /* ── API pública ─────────────────────────────────────────────── */
  window.ep_render      = _render;
  window.ep_mesAnterior = ()=>{_st.mes=_addM(_st.mes,-1);_render();};
  window.ep_mesProximo  = ()=>{_st.mes=_addM(_st.mes,1); _render();};
  window.ep_setModo     = m=>{_st.modo=m;_render();};
  window.ep_filtrarPastor=()=>{const s=document.getElementById("ep-pastor-filter");_st.pastor=s?s.value:"";_render();};
  window.ep_toggleMes   = function(mk){if(_st.openMonths.has(mk))_st.openMonths.delete(mk);else _st.openMonths.add(mk);_render();};
  window.ep_novaEscala  = ()=>{if(_isAdmin()) ep_setModo("lista"); else T("Escala de Pregação","Acesse o modo Lista para visualizar a programação pastoral.");};
  window.ep_gerarMes    = async function(ano,mes){
    const nm=new Date(ano,mes,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
    if(!confirm(`Gerar escala automática para ${nm}?\nSlots já preenchidos serão preservados.`)) return;
    const ct=document.getElementById("ep-conteudo");
    if(ct) ct.innerHTML=`<div style="text-align:center;padding:40px;color:var(--teal)">⚡ Gerando escala de ${nm}...</div>`;
    await _gerarMes(ano,mes);
  };
  window.ep_gerar3Meses = async function(ano,mes){
    if(!confirm("Gerar escala automática para os próximos 3 meses?\nSlots já preenchidos serão preservados.")) return;
    const ct=document.getElementById("ep-conteudo");
    if(ct) ct.innerHTML=`<div style="text-align:center;padding:40px;color:var(--teal)">⚡ Gerando escalas...</div>`;
    for(let i=0;i<3;i++){const m=new Date(ano,mes+i,1);await _gerarMes(m.getFullYear(),m.getMonth());}
  };
  window.ep_setPastor = function(){};
  window.ep_setStatus = function(){};
  window.ep_setObs    = function(){};
  window.ep_ver       = function(key){ep_openSlot(key);};
  window.ep_getPastores = () => _pastores;
  window.ep_getEscala   = () => _escala;

})();

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD PASTORAL v1.0
   Renders: pd-content, pd-pastores-content, pd-historico-content,
            pd-relatorios-content
   Depends on: ep_getPastores(), ep_getEscala(), dp_getDisponiveisIds()
═══════════════════════════════════════════════════════════════ */
(function () {

  const _TIPO = {
    domingo_manha:     {label:"Domingo Manhã",      ico:"☀️", cor:"#4a9cf5", dow:0},
    domingo_noite:     {label:"Domingo Noite",      ico:"🌙", cor:"#8b6fd4", dow:0},
    conexao_com_deus:  {label:"Conexão com Deus",   ico:"🙏", cor:"#2ab5c0", dow:1},
    tarde_da_esperanca:{label:"Tarde da Esperança", ico:"✝️", cor:"#d4a843", dow:3},
  };

  function _iso(d){ return d.toISOString().slice(0,10); }
  function _today(){ return _iso(new Date()); }
  function _pastores(){ return (typeof ep_getPastores==="function") ? ep_getPastores().filter(p=>p.ativo!==false) : []; }
  function _escala(){ return (typeof ep_getEscala==="function") ? ep_getEscala() : new Map(); }
  function _nomePastor(id){
    const p=_pastores().find(p=>p.id===id);
    return p ? (p.nome_exibicao||p.nome_completo) : (id ? "Pastor" : "—");
  }
  function _dispIds(ds,tipo){
    return (typeof dp_getDisponiveisIds==="function") ? dp_getDisponiveisIds(ds,tipo) : [];
  }
  function _fmtDate(ds, opts){ return new Date(ds+"T12:00:00").toLocaleDateString("pt-BR", opts||{}); }

  function _slotsInRange(fromIso, toIso){
    const esc=_escala(), res=[];
    const cur=new Date(fromIso+"T12:00:00"), end=new Date(toIso+"T12:00:00");
    while(cur<=end){
      const ds=_iso(cur), dow=cur.getDay();
      Object.keys(_TIPO).forEach(tipo=>{
        if(_TIPO[tipo].dow===dow){
          const key=`${ds}-${tipo}`, sl=esc.get(key)||{};
          res.push({ds,tipo,key,...sl});
        }
      });
      cur.setDate(cur.getDate()+1);
    }
    return res;
  }
  function _weekBounds(){
    const t=new Date(), dow=t.getDay();
    const sun=new Date(t); sun.setDate(t.getDate()-dow);
    const sat=new Date(sun); sat.setDate(sun.getDate()+6);
    return {from:_iso(sun),to:_iso(sat)};
  }
  function _addDays(d,n){ const r=new Date(d+"T12:00:00"); r.setDate(r.getDate()+n); return _iso(r); }

  /* ══ DASHBOARD PRINCIPAL ══════════════════════════════════════ */
  function _renderDash(){
    const cont=document.getElementById("pd-content"); if(!cont) return;
    const pasts=_pastores(), today=_today();
    const {from:wFrom,to:wTo}=_weekBounds();
    const lim14=_addDays(today,14), lim30=_addDays(today,30);
    const weekSlots=_slotsInRange(wFrom,wTo);
    const upSlots=_slotsInRange(today,lim30);
    const mn=new Date(), mFrom=`${mn.getFullYear()}-${String(mn.getMonth()+1).padStart(2,"0")}-01`;
    const mTo=_iso(new Date(mn.getFullYear(),mn.getMonth()+1,0));
    const mthSlots=_slotsInRange(mFrom,mTo);

    /* ── Distribuição do mês ── */
    const dist={};
    pasts.forEach(p=>{dist[p.id]={count:0,last:null,next:null,p};});
    mthSlots.forEach(s=>{
      if(s.pastor_id&&dist[s.pastor_id]){
        dist[s.pastor_id].count++;
        if(s.ds<today&&(!dist[s.pastor_id].last||s.ds>dist[s.pastor_id].last)) dist[s.pastor_id].last=s.ds;
        if(s.ds>=today&&(!dist[s.pastor_id].next||s.ds<dist[s.pastor_id].next)) dist[s.pastor_id].next=s.ds;
      }
    });

    /* ── Alertas ── */
    const alerts=[];
    upSlots.filter(s=>s.ds<=lim14&&!s.pastor_id).forEach(s=>{
      const t=_TIPO[s.tipo];
      alerts.push({k:"danger",msg:`Culto sem pregador: ${t.ico} ${t.label} — ${_fmtDate(s.ds,{weekday:"short",day:"2-digit",month:"2-digit"})}`});
    });
    const wkCnt={};
    weekSlots.filter(s=>s.pastor_id).forEach(s=>{ wkCnt[s.pastor_id]=(wkCnt[s.pastor_id]||0)+1; });
    Object.entries(wkCnt).filter(([,c])=>c>1).forEach(([id,c])=>{
      alerts.push({k:"warning",msg:`${_nomePastor(id)} escalado ${c}× esta semana`});
    });
    upSlots.filter(s=>s.ds<=lim14&&s.ds>=today&&!s.pastor_id).forEach(s=>{
      if(!_dispIds(s.ds,s.tipo).length){
        const t=_TIPO[s.tipo];
        alerts.push({k:"info",msg:`Sem disponibilidade: ${t.ico} ${t.label} — ${_fmtDate(s.ds,{day:"2-digit",month:"2-digit"})}`});
      }
    });

    /* ── KPIs ── */
    const cobertos=weekSlots.filter(s=>s.pastor_id).length;
    const semPreg=weekSlots.filter(s=>!s.pastor_id).length;
    const semDisp=upSlots.filter(s=>s.ds<=lim14&&s.ds>=today&&!s.pastor_id&&!_dispIds(s.ds,s.tipo).length).length;

    let h="";

    /* Alertas — ocultados no Dashboard (disponíveis em Escala / Relatórios) */

    /* KPIs */
    h+=`<div class="kpis c4" style="margin-bottom:16px">
      <div class="kpi"><div class="kpi-ico" style="background:rgba(58,176,184,.15);color:var(--teal)">🎙</div><div class="kpi-body"><div class="kpi-lbl">Cultos desta semana</div><div class="kpi-val">${weekSlots.length}</div><div class="kpi-d ${semPreg>0?"wa":"up"}">${semPreg>0?`⚠ ${semPreg} sem pregador`:"✓ todos preenchidos"}</div></div></div>
      <div class="kpi"><div class="kpi-ico" style="background:rgba(58,170,92,.15);color:var(--gmd)">✅</div><div class="kpi-body"><div class="kpi-lbl">Escalas preenchidas</div><div class="kpi-val">${cobertos}</div><div class="kpi-d nu">de ${weekSlots.length} esta semana</div></div></div>
      <div class="kpi"><div class="kpi-ico" style="background:rgba(74,156,245,.15);color:#4a9cf5">👥</div><div class="kpi-body"><div class="kpi-lbl">Pastores ativos</div><div class="kpi-val">${pasts.length}</div><div class="kpi-d nu">disponíveis para escalar</div></div></div>
      <div class="kpi"><div class="kpi-ico" style="background:rgba(212,168,67,.15);color:var(--gold)">📅</div><div class="kpi-body"><div class="kpi-lbl">Sem disponibilidade</div><div class="kpi-val">${semDisp}</div><div class="kpi-d wa">próx. 14 dias</div></div></div>
    </div>`;

    /* Layout 2 colunas: Escala semana + Próximas */
    h+=`<div class="g2" style="margin-bottom:16px">`;

    /* Escala da semana */
    h+=`<div class="card"><div class="ctit">Escala da Semana<span class="csub"> / ${_fmtDate(wFrom,{day:"2-digit",month:"2-digit"})}–${_fmtDate(wTo,{day:"2-digit",month:"2-digit"})}</span><span class="cact" onclick="go('pastoral-preg')">ver tudo →</span></div>`;
    if(!weekSlots.length){
      h+=`<div style="color:var(--tx3);font-size:11.5px;padding:10px 0">Nenhum culto esta semana.</div>`;
    } else {
      h+=`<div style="display:flex;flex-direction:column;gap:6px;margin-top:10px">`;
      weekSlots.forEach(s=>{
        const t=_TIPO[s.tipo];
        const nome=s.pastor_id?_nomePastor(s.pastor_id):null;
        const dtF=_fmtDate(s.ds,{weekday:"short",day:"2-digit",month:"2-digit"});
        const isToday=s.ds===today;
        const disp=_dispIds(s.ds,s.tipo);
        let sc,sl,sb;
        if(nome)             {sc="#3aaa5c";sl="Preenchido";  sb="rgba(58,170,92,.12)";}
        else if(disp.length) {sc="#d4a843";sl=`${disp.length} disponív.`;sb="rgba(212,168,67,.12)";}
        else                 {sc="#d06868";sl="Sem pregador";sb="rgba(208,104,104,.12)";}
        const dispBadge=!nome&&disp.length?`<div style="font-size:9px;color:var(--teal);margin-top:1px">✅ ${disp.map(_nomePastor).join(", ")}</div>`:"";
        h+=`<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:${isToday?"rgba(58,176,184,.06)":"var(--bg-surface)"};border:1px solid ${isToday?"rgba(58,176,184,.3)":"var(--bd2)"};border-radius:7px;cursor:pointer" onclick="${nome?"ep_openSlot('"+s.key+"')":"go('pastoral-preg')"}">`;
        h+=`<span style="font-size:14px">${t.ico}</span>`;
        h+=`<div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:700;color:${t.cor}">${t.label}</div><div style="font-size:10px;color:var(--tx3);text-transform:capitalize">${dtF}${isToday?" · hoje":""}</div>${dispBadge}</div>`;
        h+=`<div style="text-align:right"><div style="font-size:11px;font-weight:600;color:${nome?"var(--tx1)":"var(--tx3)"}">${nome||"— sem pregador —"}</div><span style="font-size:9px;padding:1px 7px;border-radius:5px;font-weight:700;background:${sb};color:${sc}">${sl}</span></div>`;
        h+=`</div>`;
      });
      h+=`</div>`;
    }
    h+=`</div>`;

    /* Coluna direita: Próximas escalas + Disponibilidade */
    const nextSlots=upSlots.filter(s=>s.ds>wTo).slice(0,6);
    h+=`<div class="gcol">`;

    /* Próximas escalas */
    h+=`<div class="card"><div class="ctit">Próximas Escalas<span class="cact" onclick="go('pastoral-preg')">abrir →</span></div>`;
    if(!nextSlots.length){
      h+=`<div style="color:var(--tx3);font-size:11.5px;padding:8px 0">Sem escalas cadastradas.</div>`;
    } else {
      nextSlots.forEach(s=>{
        const t=_TIPO[s.tipo];
        const nome=s.pastor_id?_nomePastor(s.pastor_id):null;
        const dtF=_fmtDate(s.ds,{weekday:"short",day:"2-digit",month:"2-digit"});
        const dot=nome?"var(--gmd)":"var(--rose)";
        h+=`<div class="trow"><div class="tdot" style="background:${dot}"></div><div class="tbody"><div class="ttitle">${t.ico} ${t.label}</div><div class="tmeta">${dtF} · ${nome||`<span style="color:var(--rose)">sem pregador</span>`}</div></div></div>`;
      });
    }
    h+=`</div>`;

    /* Disponibilidade próx. 14 dias */
    const nextDisp=upSlots.filter(s=>s.ds>=today&&s.ds<=lim14).slice(0,5);
    h+=`<div class="card"><div class="ctit">Disponíveis — próx. 14 dias<span class="cact" onclick="go('pastoral-disp')">gerenciar →</span></div>`;
    let anyDisp=false;
    nextDisp.forEach(s=>{
      const ids=_dispIds(s.ds,s.tipo);
      if(!ids.length) return;
      anyDisp=true;
      const t=_TIPO[s.tipo];
      const dtF=_fmtDate(s.ds,{weekday:"short",day:"2-digit",month:"2-digit"});
      h+=`<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;color:${t.cor};margin-bottom:3px">${t.ico} ${dtF}</div>`;
      h+=`<div style="display:flex;flex-wrap:wrap;gap:3px">`;
      ids.forEach(id=>{ h+=`<span style="font-size:10px;padding:2px 8px;background:rgba(58,170,92,.10);border:1px solid rgba(58,170,92,.2);border-radius:5px;color:var(--gmd)">✅ ${_nomePastor(id)}</span>`; });
      h+=`</div></div>`;
    });
    if(!anyDisp) h+=`<div style="color:var(--tx3);font-size:11px;padding:6px 0">Nenhuma disponibilidade nos próximos 14 dias.<br><a onclick="go('pastoral-disp')" style="color:var(--teal);cursor:pointer">Cadastrar disponibilidades →</a></div>`;
    h+=`</div>`;

    h+=`</div>`; // gcol
    h+=`</div>`; // g2

    /* Distribuição do mês */
    const mNomeLabel=new Date().toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
    h+=`<div class="card" style="margin-bottom:16px"><div class="ctit">Distribuição de Pregações — ${mNomeLabel.charAt(0).toUpperCase()+mNomeLabel.slice(1)}<span class="cact" onclick="go('pastoral-relatorios')">relatório →</span></div>`;
    const dArr=Object.values(dist).sort((a,b)=>b.count-a.count);
    if(!dArr.length||dArr.every(d=>d.count===0)){
      h+=`<div style="color:var(--tx3);font-size:11.5px;padding:10px 0">Nenhuma pregação registrada este mês.</div>`;
    } else {
      const maxC=Math.max(...dArr.map(d=>d.count),1);
      h+=`<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Pastor</th><th style="text-align:center">Pregações</th><th>Última</th><th>Próxima</th><th>Carga</th></tr></thead><tbody>`;
      dArr.forEach(({p,count,last,next})=>{
        const pct=Math.round((count/maxC)*100);
        const overload=count===maxC&&maxC>1;
        const lF=last?_fmtDate(last,{day:"2-digit",month:"2-digit"}):"—";
        const nF=next?_fmtDate(next,{day:"2-digit",month:"2-digit"}):"—";
        const barC=overload?"var(--amber)":"var(--teal)";
        h+=`<tr><td class="tdp">${p.nome_exibicao||p.nome_completo}</td><td style="text-align:center;font-weight:700;color:${count>0?"var(--tx1)":"var(--tx3)"}">${count}</td><td class="tdc">${lF}</td><td class="tdc">${nF}</td><td style="min-width:90px"><div style="background:var(--bg-surface);border-radius:4px;height:6px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${barC};border-radius:4px;transition:width .3s"></div></div></td></tr>`;
      });
      h+=`</tbody></table></div>`;
    }
    h+=`</div>`;

    /* Atividade recente pastoral */
    const atv=[
      {i:"📅",d:"Disponibilidade informada",   m:"Rev. Fábio · Dom Manhã, 04/05",            t:"há 1h"},
      {i:"✏️",d:"Escala alterada",             m:"Dom Noite 27/04 → Rev. Flávio p/ Rev. Carlos", t:"ontem"},
      {i:"🎙",d:"Escala confirmada",            m:"Conexão com Deus 28/04 · Rev. Amauri",    t:"ontem"},
      {i:"⚠️",d:"Culto ficou sem pregador",    m:"Tarde da Esperança 30/04",                 t:"há 2 dias"},
      {i:"📅",d:"Disponibilidade informada",   m:"Rev. Flávio · Quarta 07/05",               t:"há 3 dias"},
    ];
    h+=`<div class="card"><div class="ctit">Atividade Recente<span class="csub">/ escala e disponibilidade</span></div>`;
    atv.forEach(a=>{
      h+=`<div class="trow"><div style="font-size:15px;min-width:20px;text-align:center">${a.i}</div><div class="tbody"><div class="ttitle">${a.d}</div><div class="tmeta">${a.m}</div></div><div style="font-size:10px;color:var(--tx3);white-space:nowrap;padding-left:8px">${a.t}</div></div>`;
    });
    h+=`</div>`;

    cont.innerHTML=h;
  }

  /* ══ CADASTRO DE PASTORES ════════════════════════════════════ */
  function _renderPastores(){
    const cont=document.getElementById("pd-pastores-content"); if(!cont) return;
    const pasts=(typeof ep_getPastores==="function")?ep_getPastores():[];
    const ativos=pasts.filter(p=>p.ativo!==false), inativos=pasts.filter(p=>p.ativo===false);
    let h=`<div class="card" style="margin-bottom:14px"><div class="ctit" style="display:flex;align-items:center">Pastores Ativos<span class="csub"> / ${ativos.length} no corpo pastoral</span><button onclick="ep_novoPastor()" style="margin-left:auto;padding:5px 14px;background:var(--teal);border:none;border-radius:5px;color:#fff;font-size:11px;cursor:pointer;font-weight:600">+ Novo Pastor</button></div>`;
    if(!ativos.length){
      h+=`<div style="color:var(--tx3);font-size:11.5px;padding:10px 0">Nenhum pastor ativo cadastrado.</div>`;
    } else {
      h+=`<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px">`;
      ativos.forEach(p=>{
        h+=`<div style="flex:1;min-width:220px;padding:12px 14px;background:var(--bg-surface);border:1px solid var(--bd2);border-radius:8px;display:flex;flex-direction:column;gap:6px">`;
        h+=`<div style="display:flex;align-items:center;gap:8px"><span style="font-size:20px">👤</span><div style="flex:1"><div style="font-size:12px;font-weight:700;color:var(--tx1)">${p.nome_completo}</div><div style="font-size:10px;color:var(--teal)">${p.nome_exibicao||""}</div></div></div>`;
        h+=`<div style="font-size:10.5px;color:var(--tx3)">${p.funcao||"Pastor"}${p.unidade?` · ${p.unidade}`:""}</div>`;
        h+=`<div style="display:flex;gap:6px;margin-top:4px"><button onclick="ep_editarPastor('${p.id}')" style="flex:1;padding:5px;background:none;border:1px solid var(--bd2);border-radius:5px;color:var(--tx2);font-size:10px;cursor:pointer">✏️ Editar</button><button onclick="ep_togglePastorAtivo('${p.id}',false)" style="padding:5px 8px;background:none;border:1px solid rgba(208,104,104,.3);border-radius:5px;color:#d06868;font-size:10px;cursor:pointer">Desativar</button></div>`;
        h+=`</div>`;
      });
      h+=`</div>`;
    }
    h+=`</div>`;
    if(inativos.length){
      h+=`<div class="card"><div class="ctit">Inativos<span class="csub"> / ${inativos.length}</span></div><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">`;
      inativos.forEach(p=>{
        h+=`<div style="padding:8px 12px;background:var(--bg-surface);border:1px solid var(--bd2);border-radius:7px;display:flex;align-items:center;gap:8px;opacity:.6"><span style="font-size:12px;color:var(--tx3)">●</span><div style="font-size:11.5px;color:var(--tx2)">${p.nome_completo}</div><button onclick="ep_togglePastorAtivo('${p.id}',true)" style="padding:3px 9px;background:none;border:1px solid rgba(58,170,92,.3);border-radius:4px;color:var(--gmd);font-size:10px;cursor:pointer">Ativar</button></div>`;
      });
      h+=`</div></div>`;
    }
    /* Modal slot passthrough */
    let mDiv=document.getElementById("ep-modal");
    if(!mDiv){ mDiv=document.createElement("div"); mDiv.id="ep-modal"; mDiv.style.display="none"; document.body.appendChild(mDiv); }
    cont.innerHTML=h;
  }

  /* ══ HISTÓRICO ═══════════════════════════════════════════════ */
  function _renderHistorico(){
    const cont=document.getElementById("pd-historico-content"); if(!cont) return;
    const today=_today();
    const from90=_addDays(today,-90);
    const slots=_slotsInRange(from90,today).filter(s=>s.pastor_id).reverse();
    const pasts=_pastores();
    let h=`<div class="card"><div class="ctit">Pregações Realizadas<span class="csub"> / últimos 90 dias · ${slots.length} registros</span></div>`;
    if(!slots.length){
      h+=`<div style="color:var(--tx3);font-size:11.5px;padding:12px 0">Nenhuma pregação registrada nos últimos 90 dias.</div>`;
    } else {
      h+=`<div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap"><select id="pd-hist-fpastor" onchange="pd_renderHistorico()" style="background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx2);font-size:11.5px;padding:5px 10px;outline:none;height:32px;font-family:var(--sans)"><option value="">Todos os pastores</option>${pasts.map(p=>`<option value="${p.id}">${p.nome_exibicao||p.nome_completo}</option>`).join("")}</select><select id="pd-hist-fculto" onchange="pd_renderHistorico()" style="background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx2);font-size:11.5px;padding:5px 10px;outline:none;height:32px;font-family:var(--sans)"><option value="">Todos os cultos</option>${Object.keys(_TIPO).map(k=>`<option value="${k}">${_TIPO[k].ico} ${_TIPO[k].label}</option>`).join("")}</select></div>`;
      const fP=document.getElementById("pd-hist-fpastor")?.value||"";
      const fC=document.getElementById("pd-hist-fculto")?.value||"";
      const filtered=slots.filter(s=>(!fP||s.pastor_id===fP)&&(!fC||s.tipo===fC));
      h+=`<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Data</th><th>Culto</th><th>Pastor</th><th>Status</th></tr></thead><tbody>`;
      filtered.slice(0,60).forEach(s=>{
        const t=_TIPO[s.tipo];
        const dtF=_fmtDate(s.ds,{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"});
        const sc=s.status==="CONFIRMADA"?{bg:"rgba(58,170,92,.12)",cl:"#3aaa5c",lb:"Confirmada"}:{bg:"rgba(74,156,245,.12)",cl:"#4a9cf5",lb:"Preenchida"};
        h+=`<tr><td class="tdc" style="text-transform:capitalize">${dtF}</td><td><span style="color:${t.cor};font-size:11px">${t.ico} ${t.label}</span></td><td class="tdp">${_nomePastor(s.pastor_id)}</td><td><span style="font-size:9px;padding:2px 7px;border-radius:5px;font-weight:700;background:${sc.bg};color:${sc.cl}">${sc.lb}</span></td></tr>`;
      });
      h+=`</tbody></table></div>`;
      if(filtered.length>60) h+=`<div style="font-size:10.5px;color:var(--tx3);margin-top:6px">Exibindo 60 de ${filtered.length} registros.</div>`;
    }
    h+=`</div>`;
    cont.innerHTML=h;
  }

  /* ══ RELATÓRIOS ══════════════════════════════════════════════ */
  function _renderRelatorios(){
    const cont=document.getElementById("pd-relatorios-content"); if(!cont) return;
    const today=_today();
    const mn=new Date(), mFrom=`${mn.getFullYear()}-${String(mn.getMonth()+1).padStart(2,"0")}-01`;
    const mTo=_iso(new Date(mn.getFullYear(),mn.getMonth()+1,0));
    const from90=_addDays(today,-90);
    const mthSlots=_slotsInRange(mFrom,mTo);
    const hist90=_slotsInRange(from90,today).filter(s=>s.pastor_id);
    const pasts=_pastores();

    /* Cobertura do mês */
    const total=mthSlots.length, filled=mthSlots.filter(s=>s.pastor_id).length;
    const pct=total?Math.round((filled/total)*100):0;

    let h=``;

    /* KPIs relatório */
    h+=`<div class="kpis c4" style="margin-bottom:16px">
      <div class="kpi"><div class="kpi-ico" style="background:rgba(58,176,184,.15);color:var(--teal)">📊</div><div class="kpi-body"><div class="kpi-lbl">Cobertura do mês</div><div class="kpi-val">${pct}%</div><div class="kpi-d ${pct>=80?"up":"wa"}">${filled}/${total} cultos preenchidos</div></div></div>
      <div class="kpi"><div class="kpi-ico" style="background:rgba(74,156,245,.15);color:#4a9cf5">🎙</div><div class="kpi-body"><div class="kpi-lbl">Pregações (90 dias)</div><div class="kpi-val">${hist90.length}</div><div class="kpi-d nu">registros confirmados</div></div></div>
      <div class="kpi"><div class="kpi-ico" style="background:rgba(58,170,92,.15);color:var(--gmd)">👥</div><div class="kpi-body"><div class="kpi-lbl">Pastores escalados</div><div class="kpi-val">${new Set(hist90.map(s=>s.pastor_id)).size}</div><div class="kpi-d nu">nos últimos 90 dias</div></div></div>
      <div class="kpi"><div class="kpi-ico" style="background:rgba(212,168,67,.15);color:var(--gold)">⚡</div><div class="kpi-body"><div class="kpi-lbl">Média por pastor</div><div class="kpi-val">${pasts.length?Math.round(hist90.length/pasts.length):0}</div><div class="kpi-d nu">pregações (90 dias)</div></div></div>
    </div>`;

    /* Distribuição por culto */
    h+=`<div class="g2" style="margin-bottom:16px">`;
    h+=`<div class="card"><div class="ctit">Distribuição por Culto (90 dias)</div><div class="bars" style="gap:9px;margin-top:10px">`;
    const byTipo={};
    Object.keys(_TIPO).forEach(k=>{byTipo[k]=0;});
    hist90.forEach(s=>{if(byTipo[s.tipo]!==undefined) byTipo[s.tipo]++;});
    const maxT=Math.max(...Object.values(byTipo),1);
    Object.entries(byTipo).forEach(([k,v])=>{
      const t=_TIPO[k];
      h+=`<div><div class="bh"><span class="bn">${t.ico} ${t.label}</span><span class="bv">${v}</span></div><div class="bt"><div class="bf" style="width:${Math.round(v/maxT*100)}%;background:${t.cor}"></div></div></div>`;
    });
    h+=`</div></div>`;

    /* Distribuição por pastor */
    h+=`<div class="card"><div class="ctit">Pregações por Pastor (90 dias)</div><div class="bars" style="gap:9px;margin-top:10px">`;
    const byPastor={};
    pasts.forEach(p=>{byPastor[p.id]=0;});
    hist90.forEach(s=>{if(byPastor[s.pastor_id]!==undefined) byPastor[s.pastor_id]++;});
    const maxP=Math.max(...Object.values(byPastor),1);
    pasts.sort((a,b)=>(byPastor[b.id]||0)-(byPastor[a.id]||0)).forEach(p=>{
      const v=byPastor[p.id]||0, nome=p.nome_exibicao||p.nome_completo;
      h+=`<div><div class="bh"><span class="bn">${nome}</span><span class="bv">${v}</span></div><div class="bt"><div class="bf" style="width:${Math.round(v/maxP*100)}%;background:var(--teal)"></div></div></div>`;
    });
    h+=`</div></div>`;
    h+=`</div>`;

    /* Botão exportar */
    h+=`<div style="display:flex;gap:8px;justify-content:flex-end"><button onclick="dp_exportar()" style="padding:7px 16px;background:var(--bg-card);border:1px solid var(--teal);border-radius:6px;color:var(--teal);font-size:11.5px;cursor:pointer;font-weight:600">⬇ Exportar CSV Disponibilidades</button></div>`;

    cont.innerHTML=h;
  }

  /* ══ API pública ═════════════════════════════════════════════ */
  window.pd_renderDash       = _renderDash;
  window.pd_renderPastores   = _renderPastores;
  window.pd_renderHistorico  = _renderHistorico;
  window.pd_renderRelatorios = _renderRelatorios;

})();

/* ═══════════════════════════════════════════════════════════════
   DISPONIBILIDADE PREGAÇÃO v1.0 — Supabase · CRUD
   Tabela real: escala_pregacao
   Integra com: pastores, escala_pregacao (via ep_getPastores)
═══════════════════════════════════════════════════════════════ */
(function () {

  const _TIPO = {
    domingo_manha:     {label:"Domingo Manhã",      ico:"☀️",  cor:"#4a9cf5", hora:"09:00"},
    domingo_noite:     {label:"Domingo Noite",      ico:"🌙",  cor:"#8b6fd4", hora:"18:00"},
    conexao_com_deus:  {label:"Conexão com Deus",   ico:"🙏",  cor:"#2ab5c0", hora:"Segunda-feira"},
    tarde_da_esperanca:{label:"Tarde da Esperança", ico:"✝️",  cor:"#d4a843", hora:"Quarta-feira"},
  };
	  const _STATUS = {
	    PENDENTE:   {label:"Sem resposta", bg:"rgba(212,168,67,.15)",   cl:"#d4a843"},
	    PREENCHIDA: {label:"Disponível",   bg:"rgba(58,170,92,.15)",    cl:"#3aaa5c"},
	    CONFIRMADA: {label:"Confirmada",   bg:"rgba(74,156,245,.15)",   cl:"#4a9cf5"},
	  };

  /* ── Estado ───────────────────────────────────────────────────── */
  const _st = {
    mes: (() => { const d=new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; })(),
    tab: "minha",
    pastorFiltro: "",
  };
	  let _disps = []; // registros derivados de escala_pregacao
  let _pastoresDp = [];
  let _pastoresLoading = null;
  const _PASTORES_PADRAO = [
    {nome_completo:"Rev. Amauri Oliveira",nome_exibicao:"Rev. Amauri",funcao:"Pastor Presidente",ativo:true},
    {nome_completo:"Rev. Carlos Henrique",nome_exibicao:"Rev. C. Henrique",funcao:"Pastor",ativo:true},
    {nome_completo:"Rev. Carlos Lima",nome_exibicao:"Rev. C. Lima",funcao:"Pastor",ativo:true},
    {nome_completo:"Rev. Cornélio Castro",nome_exibicao:"Rev. Cornélio",funcao:"Pastor",ativo:true},
    {nome_completo:"Rev. Fábio Carvalho",nome_exibicao:"Rev. Fábio",funcao:"Pastor",ativo:true},
    {nome_completo:"Rev. Flávio Ramos",nome_exibicao:"Rev. Flávio",funcao:"Pastor",ativo:true},
  ];
  let _loaded = false;

  /* ── Helpers ──────────────────────────────────────────────────── */
  function _isUuid(v){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||"")); }
  function _normalizarPastores(lista){
    return (Array.isArray(lista)?lista:[])
      .filter(p=>p&&_isUuid(p.id)&&p.ativo!==false)
      .sort((a,b)=>(a.nome_exibicao||a.nome_completo||"").localeCompare(b.nome_exibicao||b.nome_completo||"","pt-BR"));
  }
  function _getPastores(){
    const local=_normalizarPastores(_pastoresDp);
    if(local.length) return local;
    return _normalizarPastores((typeof ep_getPastores==="function") ? ep_getPastores() : []);
  }
  function _getPastorById(id){ return _getPastores().find(p=>p.id===id); }
  function _nomePastor(id){ const p=_getPastorById(id); return p ? (p.nome_exibicao||p.nome_completo) : id; }
  function _iso(d){ return d.toISOString().slice(0,10); }
  function _addM(d,n){ const r=new Date(d); r.setMonth(r.getMonth()+n); r.setDate(1); return r; }
  function _fmtMes(d){ return d.toLocaleDateString("pt-BR",{month:"long",year:"numeric"}); }
  function _isAdmin(){return typeof USUARIO_ATUAL!=="undefined"&&(USUARIO_ATUAL?.perfil==="admin_geral"||USUARIO_ATUAL?.perfil==="ADMINISTRADOR_GERAL"||USUARIO_ATUAL?.perfil==="pastoral"||USUARIO_ATUAL?.perfil==="PASTORAL");}
  function _mesFmt(mesKey){ const [y,m]=mesKey.split("-"); return new Date(+y,+m-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}); }
  function _mesKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
  function _slotsDoMes(d){
    const ano=d.getFullYear(),mes=d.getMonth(),last=new Date(ano,mes+1,0).getDate(),slots=[];
    for(let day=1;day<=last;day++){
      const dt=new Date(ano,mes,day),dow=dt.getDay(),ds=_iso(dt);
      if(dow===0){slots.push({ds,tipo:"domingo_manha"});slots.push({ds,tipo:"domingo_noite"});}
      if(dow===1) slots.push({ds,tipo:"conexao_com_deus"});
      if(dow===3) slots.push({ds,tipo:"tarde_da_esperanca"});
    }
    return slots;
  }
  function _dispKey(pastor_id,data,culto_tipo){ return `${pastor_id}|${data}|${culto_tipo}`; }
  function _dispMap(){
    const m=new Map();
    _disps.forEach(r=>m.set(_dispKey(r.pastor_id,r.data,r.culto_tipo),r));
    return m;
	  }
	  function _statusPill(s){
	    const cfg=_STATUS[s]||_STATUS.PENDENTE;
	    return `<span style="font-size:9px;padding:2px 7px;border-radius:8px;font-weight:700;background:${cfg.bg};color:${cfg.cl}">${cfg.label}</span>`;
	  }
	  function _eh(v){ return typeof escapeHtml==="function" ? escapeHtml(v) : String(v ?? ""); }
	  function _ea(v){ return typeof escapeHtmlAttr==="function" ? escapeHtmlAttr(v) : _eh(v); }
	  function _erroAmigavel(status, detalhe){
	    const txt=String(detalhe||"");
	    if(status===404||txt.includes("PGRST205")||txt.includes("schema cache")){
	      return "A estrutura de disponibilidade não foi encontrada no Supabase. A tela foi ajustada para usar a Escala de Pregação; atualize a página e tente novamente.";
	    }
	    if(txt.includes("22P02")||txt.includes("invalid input syntax for type uuid")){
	      return "Pastor sem ID real do Supabase. Atualize a página; se o campo Pastor continuar vazio ou inválido, execute o script de permissões da Escala de Pregação no Supabase.";
	    }
	    if(status===401||status===403||txt.includes("42501")||txt.includes("permission denied")){
	      return "Sem permissão para salvar em escala_pregacao. Execute o script supabase-escala-pregacao.sql atualizado no Supabase para liberar gravação do SIPEN.";
	    }
	    return txt||`Erro HTTP ${status}`;
	  }
	  function _inferPastorAtualId(){
	    const nome=(typeof USUARIO_ATUAL!=="undefined" ? (USUARIO_ATUAL?.nome||"") : "").toLowerCase().trim();
	    if(!nome) return "";
	    const first=nome.split(/\s+/)[0];
	    const ps=_getPastores().filter(p=>p.ativo!==false);
	    const found=ps.find(p=>(p.nome_completo||"").toLowerCase()===nome)||
	                ps.find(p=>(p.nome_completo||"").toLowerCase().includes(nome))||
	                ps.find(p=>first&&(p.nome_completo||"").toLowerCase().includes(first));
	    return found?.id||"";
	  }
	  function _estadoDisp(reg){
	    if(!reg) return {key:"pendente",label:"Sem resposta",bg:"rgba(212,168,67,.15)",cl:"#d4a843"};
	    if(reg.disponivel&&reg.pastor_id) return {key:"disponivel",label:"Disponível",bg:"rgba(58,170,92,.15)",cl:"#3aaa5c"};
	    return {key:"indisponivel",label:"Indisponível",bg:"rgba(208,104,104,.15)",cl:"#d06868"};
	  }
	  function _slotCard(pastorId, ds, tipo, reg, isFuture){
	    const t=_TIPO[tipo]||_TIPO.domingo_manha;
	    const estado=_estadoDisp(reg);
	    let btnBg,btnColor,btnBorder,btnLabel,nextAction;
	    if(estado.key==="disponivel"){
	      btnBg="rgba(58,170,92,0.12)";btnColor="#2a7d3f";btnBorder="rgba(58,170,92,0.4)";
	      btnLabel="🟢 Estou disponível";
	      nextAction=`dp_toggleDisp('${_ea(pastorId)}','${_ea(ds)}','${_ea(tipo)}',false)`;
	    } else if(estado.key==="indisponivel"){
	      btnBg="rgba(208,104,104,0.12)";btnColor="#c62828";btnBorder="rgba(208,104,104,0.4)";
	      btnLabel="🔴 Indisponível";
	      nextAction=`dp_toggleDisp('${_ea(pastorId)}','${_ea(ds)}','${_ea(tipo)}',true)`;
	    } else {
	      btnBg="var(--bg-surface)";btnColor="var(--tx3)";btnBorder="var(--bd2)";
	      btnLabel="⚪ Sem resposta";
	      nextAction=`dp_toggleDisp('${_ea(pastorId)}','${_ea(ds)}','${_ea(tipo)}',true)`;
	    }
	    const borderCard=estado.key==="disponivel"?"rgba(58,170,92,0.3)":estado.key==="indisponivel"?"rgba(208,104,104,0.2)":"var(--bd2)";
	    const editBtn=_isAdmin()&&reg?.id?`<button onclick="dp_editarDisp('${_ea(reg.id)}')" style="position:absolute;top:10px;right:10px;background:none;border:1px solid var(--bd2);border-radius:5px;color:var(--tx3);font-size:10px;padding:3px 8px;cursor:pointer">✏️</button>`:"";
	    const btn=isFuture&&pastorId
	      ?`<button onclick="${nextAction}" style="width:100%;padding:16px;border-radius:10px;border:1.5px solid ${btnBorder};background:${btnBg};color:${btnColor};font-size:15px;font-weight:700;cursor:pointer;font-family:var(--sans);text-align:center;-webkit-tap-highlight-color:transparent;touch-action:manipulation" onmousedown="this.style.opacity='.6'" onmouseup="this.style.opacity='1'" ontouchstart="this.style.opacity='.6'" ontouchend="this.style.opacity='1'">${_eh(btnLabel)}</button>`
	      :`<div style="font-size:11px;color:var(--tx3);padding:4px 0">${_eh(estado.label)}</div>`;
	    return `<div style="position:relative;background:var(--bg-card);border:1px solid ${borderCard};border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:10px">${editBtn}<div style="display:flex;align-items:center;gap:10px"><span style="font-size:22px">${_eh(t.ico)}</span><div><div style="font-size:13px;font-weight:700;color:${t.cor}">${_eh(t.label)}</div>${t.hora?`<div style="font-size:11px;color:var(--tx3)">${_eh(t.hora)}</div>`:""}</div></div>${btn}</div>`;
	  }

	  /* ── API Supabase ─────────────────────────────────────────────── */
	  async function _criarPastoresPadrao(){
	    try {
	      const r=await fetch(`${apiBaseUrl()}/rest/v1/pastores`,{method:"POST",headers:apiHeaders({"Prefer":"return=representation"}),body:JSON.stringify(_PASTORES_PADRAO)});
	      if(r.ok){
	        const d=await r.json();
	        _pastoresDp=_normalizarPastores(d);
	        return _pastoresDp;
	      }
	      const err=await r.text().catch(()=>"");
	      console.error("dp_: erro ao criar pastores padrão",r.status,err);
	      T("Pastores","A tabela de pastores está vazia e o SIPEN não conseguiu cadastrar os pastores padrão. Execute o script supabase-escala-pregacao.sql no Supabase.");
	    } catch(e){
	      console.error("dp_: erro de rede ao criar pastores padrão",e);
	      T("Pastores","A tabela de pastores está vazia e não foi possível cadastrar os pastores padrão agora.");
	    }
	    return [];
	  }

	  async function _loadPastores(force=false){
	    if(_pastoresLoading&&!force) return _pastoresLoading;
	    if(_pastoresDp.length&&!force) return _pastoresDp;
	    _pastoresLoading=(async()=>{
	      try {
	        const r=await fetch(`${apiBaseUrl()}/rest/v1/pastores?select=*&order=nome_completo.asc`,{headers:apiHeaders()});
	        if(r.ok){
	          const d=await r.json();
	          _pastoresDp=_normalizarPastores(d);
	          if(!_pastoresDp.length){
	            console.warn("dp_: tabela pastores vazia ou sem UUID real; criando pastores padrão");
	            return await _criarPastoresPadrao();
	          }
	          return _pastoresDp;
	        }
	        const err=await r.text().catch(()=>"");
	        console.error("dp_: erro ao carregar pastores",r.status,err);
	        T("Pastores","Não foi possível carregar a lista de pastores. Tente novamente em instantes.");
	      } catch(e){
	        console.error("dp_: erro de rede ao carregar pastores",e);
	        T("Pastores","Não foi possível carregar a lista de pastores. Verifique sua conexão e tente novamente.");
	      } finally {
	        _pastoresLoading=null;
	      }
	      return _pastoresDp;
	    })();
	    return _pastoresLoading;
	  }

	  async function _loadDisps(){
	    try {
	      const r=await fetch(`${apiBaseUrl()}/rest/v1/escala_pregacao?select=*&order=data.asc,culto_tipo.asc&limit=5000`,{headers:apiHeaders()});
	      if(r.ok){
	        const d=await r.json();
	        if(Array.isArray(d)) _disps=d.map(row=>({
	          id:row.id,
	          pastor_id:row.pastor_id||"",
	          data:row.data,
	          culto_tipo:row.culto_tipo,
	          disponivel:!!row.pastor_id,
	          observacoes:row.observacoes||"",
	          status:row.status||"PENDENTE",
	          local:row.local||"Templo Principal",
	          origem:row.origem||"manual"
	        }));
	      }
	      else {
	        const err=await r.text().catch(()=>"");
	        console.warn("dp_: escala_pregacao HTTP",r.status,err);
	        T("Disponibilidade Pregação",`Não foi possível carregar a escala de pregação (${r.status}).`);
	      }
	    } catch(e){ console.warn("dp_: erro de rede",e); T("Erro de rede",e.message); }
	    await _loadPastores();
	    _loaded=true;
	    _renderAll();
	    _atualizarKpis();
	  }

	  async function _upsert(payload){
	    const {pastor_id,data,culto_tipo}=payload;
	    const existing=_disps.find(r=>r.data===data&&r.culto_tipo===culto_tipo);
	    const escalaPayload={
	      pastor_id:payload.disponivel ? pastor_id : null,
	      local:payload.local||existing?.local||"Templo Principal",
	      observacoes:payload.observacoes||"",
	      status:payload.disponivel ? (payload.status==="CONFIRMADA"?"CONFIRMADA":"PREENCHIDA") : "PENDENTE",
	      origem:payload.origem||existing?.origem||"manual"
	    };
	    try {
	      if(existing){
	        const r=await fetch(`${apiBaseUrl()}/rest/v1/escala_pregacao?id=eq.${existing.id}`,{method:"PATCH",headers:apiHeaders({"Prefer":"return=representation"}),body:JSON.stringify(escalaPayload)});
	        if(r.ok){
	          const d=await r.json();
	          if(Array.isArray(d)&&d[0]){
	            const row=d[0];
	            const idx=_disps.findIndex(x=>x.id===existing.id);
	            const next={id:row.id,pastor_id:row.pastor_id||"",data:row.data,culto_tipo:row.culto_tipo,disponivel:!!row.pastor_id,observacoes:row.observacoes||"",status:row.status||"PENDENTE",local:row.local||"Templo Principal",origem:row.origem||"manual"};
	            if(idx>=0) _disps[idx]=next;
	          }
	        }
	        else { const e=await r.text(); T("Erro ao salvar disponibilidade",_erroAmigavel(r.status,e)); return false; }
	      } else {
	        const r=await fetch(`${apiBaseUrl()}/rest/v1/escala_pregacao`,{method:"POST",headers:apiHeaders({"Prefer":"return=representation"}),body:JSON.stringify({data,culto_tipo,...escalaPayload})});
	        if(r.ok){
	          const d=await r.json();
	          if(Array.isArray(d)&&d[0]){
	            const row=d[0];
	            _disps.push({id:row.id,pastor_id:row.pastor_id||"",data:row.data,culto_tipo:row.culto_tipo,disponivel:!!row.pastor_id,observacoes:row.observacoes||"",status:row.status||"PENDENTE",local:row.local||"Templo Principal",origem:row.origem||"manual"});
	          }
	        }
	        else { const e=await r.text(); T("Erro ao salvar disponibilidade",_erroAmigavel(r.status,e)); return false; }
	      }
	    } catch(e){ T("Erro de rede",e.message); return false; }
	    return true;
	  }

	  async function _delete(id){
	    try {
	      const r=await fetch(`${apiBaseUrl()}/rest/v1/escala_pregacao?id=eq.${id}`,{method:"PATCH",headers:apiHeaders({"Prefer":"return=representation"}),body:JSON.stringify({pastor_id:null,status:"PENDENTE",observacoes:""})});
	      if(r.ok){
	        const d=await r.json();
	        const row=Array.isArray(d)?d[0]:d;
	        const idx=_disps.findIndex(x=>x.id===id);
	        if(row&&idx>=0) _disps[idx]={..._disps[idx],pastor_id:"",disponivel:false,status:row.status||"PENDENTE",observacoes:row.observacoes||""};
	      }
	      else { const e=await r.text(); T("Erro ao remover",_erroAmigavel(r.status,e)); }
	    } catch(e){ T("Erro de rede",e.message); }
	  }

  /* ── KPIs ─────────────────────────────────────────────────────── */
  function _atualizarKpis(){
    const mk=_mesKey(_st.mes);
    const deMes=_disps.filter(r=>r.data&&r.data.startsWith(mk));
    const sv=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    sv("dp-kpi-enviadas", deMes.length);
    sv("dp-kpi-confirmadas", deMes.filter(r=>r.status==="CONFIRMADA").length);
	    sv("dp-kpi-pendentes", deMes.filter(r=>!r.pastor_id||r.status==="PENDENTE").length);
    const hoje=new Date(), lim=new Date(hoje.getTime()+60*24*60*60*1000);
    const limisoHoje=_iso(hoje), limisoLim=_iso(lim);
    sv("dp-kpi-escala", _disps.filter(r=>r.data>=limisoHoje&&r.data<=limisoLim).length);
  }

	  /* ── Render: Tab Minha ───────────────────────────────────────── */
	  function _renderMinha(){
	    const sel=document.getElementById("dp-pastor-sel");
	    const inferredPastorId=_inferPastorAtualId();
	    if(sel){
	      const pastores=_getPastores();
	      const current=sel.value||_st.pastorFiltro||inferredPastorId||"";
	      let pOpts=`<option value="${_ea(inferredPastorId)}">Minha disponibilidade</option>`;
	      if(_isAdmin()) pastores.forEach(p=>{pOpts+=`<option value="${_ea(p.id)}">${_eh(p.nome_exibicao||p.nome_completo)}</option>`;});
	      if(sel.innerHTML!==pOpts){sel.innerHTML=pOpts;if([...sel.options].some(o=>o.value===current))sel.value=current;}
	      _st.pastorFiltro=sel.value||"";
	      sel.style.display=_isAdmin()?"":"none";
	    }
	    // Ocultar navegação de mês (não necessária no modo lista)
	    const navMes=document.getElementById("dp-nav-mes");
	    if(navMes) navMes.style.display="none";

	    const grade=document.getElementById("dp-grade"); if(!grade) return;
	    const pastorId=sel?.value||inferredPastorId||"";
	    const map=_dispMap();
	    const hoje=_iso(new Date());

	    // Monta slots dos próximos 3 meses
	    const allSlots=[];
	    for(let i=0;i<4;i++){
	      const d=new Date(_st.mes.getFullYear(),_st.mes.getMonth()+i,1);
	      _slotsDoMes(d).forEach(s=>{if(s.ds>=hoje) allSlots.push(s);});
	    }
	    const porData={};
	    allSlots.forEach(s=>{if(!porData[s.ds])porData[s.ds]=[];porData[s.ds].push(s.tipo);});
	    const dates=Object.keys(porData).sort().slice(0,60);

	    if(!pastorId){
	      grade.innerHTML=`<div style="text-align:center;padding:40px 0;color:var(--tx3);font-size:12.5px">Seu usuário não está vinculado a um pastor cadastrado.<br>Solicite ao administrador que faça o vínculo.</div>`;
	      return;
	    }
	    if(!dates.length){
	      grade.innerHTML=`<div style="text-align:center;padding:40px 0;color:var(--tx3);font-size:12.5px">Nenhum culto programado nos próximos 3 meses.</div>`;
	      return;
	    }

	    let h=`<div style="display:flex;flex-direction:column;gap:20px">`;
	    dates.forEach(ds=>{
	      const isToday=ds===hoje;
	      const dtFmt=new Date(ds+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
	      h+=`<div>`;
	      h+=`<div style="font-size:11px;font-weight:700;text-transform:capitalize;letter-spacing:.04em;padding:0 2px;margin-bottom:8px;color:${isToday?"var(--teal)":"var(--tx3)"}">`;
	      if(isToday) h+=`📍 HOJE — `;
	      h+=`${_eh(dtFmt)}</div>`;
	      h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">`;
	      porData[ds].forEach(tipo=>{
	        const reg=map.get(_dispKey(pastorId,ds,tipo));
	        h+=_slotCard(pastorId,ds,tipo,reg,true);
	      });
	      h+=`</div></div>`;
	    });
	    h+=`</div>`;
	    grade.innerHTML=h;
	  }

  /* ── Render: Tab Admin ───────────────────────────────────────── */
  function _renderAdmin(){
    const cont=document.getElementById("dp-admin-content"); if(!cont) return;
    const mesKey=document.getElementById("dp-admin-mes")?.value||_mesKey(_st.mes);
    const fPastor=document.getElementById("dp-admin-pastor")?.value||"";
    const fCulto=document.getElementById("dp-admin-culto")?.value||"";
    const pastores=_getPastores();
    const slots=_slotsDoMes(new Date(mesKey+"-01T12:00:00"));
    const map=_dispMap();

    // Alerta de pastores que não enviaram nenhuma disponibilidade no mês
    const enviaram=new Set(_disps.filter(r=>r.data&&r.data.startsWith(mesKey)).map(r=>r.pastor_id));
    const naoEnviaram=pastores.filter(p=>!enviaram.has(p.id));

    let h="";
	    if(naoEnviaram.length){
	      h+=`<div style="background:rgba(208,104,104,0.08);border:1px solid rgba(208,104,104,0.25);border-radius:7px;padding:10px 14px;font-size:11px;color:#d06868;margin-bottom:12px">`;
	      h+=`⚠ <strong>${naoEnviaram.length} pastor${naoEnviaram.length>1?"es":""} sem disponibilidade neste mês:</strong> ${naoEnviaram.map(p=>_eh(p.nome_exibicao||p.nome_completo)).join(", ")}</div>`;
	    }

    // Tabela por slot
    const porData={};
    slots.forEach(s=>{if(!porData[s.ds]) porData[s.ds]=[];porData[s.ds].push(s.tipo);});

    h+=`<div style="display:flex;flex-direction:column;gap:6px">`;
    Object.keys(porData).sort().forEach(ds=>{
      const dtFmt=new Date(ds+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
      const dispsNaData=_disps.filter(r=>r.data===ds&&(!fPastor||r.pastor_id===fPastor)&&(!fCulto||r.culto_tipo===fCulto));
      if(fPastor&&!dispsNaData.length) return;
      h+=`<div style="border:1px solid var(--bd2);border-radius:7px;overflow:hidden">`;
	      h+=`<div style="padding:9px 14px;background:var(--bg-card);border-bottom:1px solid var(--bd1);display:flex;align-items:center;gap:8px"><span style="font-size:11px;font-weight:700;color:var(--tx1);text-transform:capitalize;flex:1">${_eh(dtFmt)}</span>`;
      if(!dispsNaData.length) h+=`<span style="font-size:9.5px;color:var(--rose)">⚠ sem disponibilidade</span>`;
      h+=`</div><div style="padding:10px 14px">`;
      (fCulto?[fCulto]:Object.keys(_TIPO)).forEach(tipo=>{
        const t=_TIPO[tipo];
        if(!porData[ds].includes(tipo)) return;
        const dispsTipo=dispsNaData.filter(r=>r.culto_tipo===tipo&&r.disponivel);
        h+=`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bd1);flex-wrap:wrap">`;
        h+=`<span style="font-size:10.5px;color:${t.cor};font-weight:700;min-width:140px">${t.ico} ${t.label}</span>`;
        if(dispsTipo.length){
          h+=`<div style="display:flex;flex-wrap:wrap;gap:4px">`;
	          dispsTipo.forEach(r=>{
	            const nomeP=_nomePastor(r.pastor_id);
	            h+=`<span style="font-size:10px;padding:2px 9px;border-radius:8px;background:rgba(58,170,92,0.12);color:var(--gmd);border:1px solid rgba(58,170,92,0.2)" title="${_ea(r.observacoes||"")}">✅ ${_eh(nomeP)}${r.observacoes?` · ${_eh(r.observacoes)}`:""}</span>`;
	          });
          h+=`</div>`;
        } else {
          h+=`<span style="font-size:10px;color:var(--tx3)">— sem disponibilidade informada</span>`;
        }
        h+=`</div>`;
      });
      h+=`</div></div>`;
    });
    h+=`</div>`;
    cont.innerHTML=h;
  }

  /* ── Render: Tab Relatório ───────────────────────────────────── */
  function _renderRelatorio(){
    const cont=document.getElementById("dp-rel-content"); if(!cont) return;
    const mesKey=document.getElementById("dp-rel-mes")?.value||_mesKey(_st.mes);
    const slots=_slotsDoMes(new Date(mesKey+"-01T12:00:00"));
    const porData={};
    slots.forEach(s=>{if(!porData[s.ds]) porData[s.ds]=[];porData[s.ds].push(s.tipo);});
    let h=`<div style="font-family:var(--sans);font-size:11.5px;display:flex;flex-direction:column;gap:10px">`;
    Object.keys(porData).sort().forEach(ds=>{
      const dtFmt=new Date(ds+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
	      h+=`<div class="card"><div class="ctit" style="text-transform:capitalize">${_eh(dtFmt)}</div>`;
      porData[ds].forEach(tipo=>{
        const t=_TIPO[tipo];
        const dispsTipo=_disps.filter(r=>r.data===ds&&r.culto_tipo===tipo&&r.disponivel);
        h+=`<div style="margin-bottom:8px"><div style="font-size:10.5px;font-weight:700;color:${t.cor};margin-bottom:4px">${t.ico} ${t.label}</div>`;
        if(dispsTipo.length){
          h+=`<div style="display:flex;flex-wrap:wrap;gap:4px">`;
	          dispsTipo.forEach(r=>{h+=`<span style="font-size:10.5px;padding:3px 10px;background:rgba(58,170,92,0.10);border:1px solid rgba(58,170,92,0.2);border-radius:6px;color:var(--gmd)">✅ ${_eh(_nomePastor(r.pastor_id))}</span>`;});
          h+=`</div>`;
        } else {
          h+=`<span style="color:var(--tx3);font-size:10px">Nenhum pastor informou disponibilidade.</span>`;
        }
        h+=`</div>`;
      });
      h+=`</div>`;
    });
    h+=`</div>`;
    cont.innerHTML=h;
  }

  /* ── Render geral ─────────────────────────────────────────────── */
  function _renderAll(){
    _renderMinha();
    if(document.getElementById("dp-tab-admin")?.style.display!=="none") _renderAdmin();
    if(document.getElementById("dp-tab-relatorio")?.style.display!=="none") _renderRelatorio();
    _preencherMesSelects();
    _preencherPastorSelect();
  }

  function _preencherMesSelects(){
    const hoje=new Date(), meses=[];
    for(let i=-1;i<6;i++){
      const d=new Date(hoje.getFullYear(),hoje.getMonth()+i,1);
      const k=_mesKey(d);
      const lbl=d.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
      meses.push({k,lbl});
    }
    const curMk=_mesKey(_st.mes);
    ["dp-admin-mes","dp-rel-mes"].forEach(sid=>{
      const s=document.getElementById(sid); if(!s) return;
      if(s.options.length===meses.length) return;
	      s.innerHTML=meses.map(m=>`<option value="${_ea(m.k)}"${m.k===curMk?" selected":""}>${_eh(m.lbl.charAt(0).toUpperCase()+m.lbl.slice(1))}</option>`).join("");
    });
  }

  function _preencherPastorSelect(){
    const s=document.getElementById("dp-admin-pastor"); if(!s) return;
    const pastores=_getPastores();
    if(s.options.length===pastores.length+1) return;
    let opts=`<option value="">Todos os pastores</option>`;
	    pastores.forEach(p=>{opts+=`<option value="${_ea(p.id)}">${_eh(p.nome_exibicao||p.nome_completo)}</option>`;});
    s.innerHTML=opts;
  }

  /* ── Modal de disponibilidade ─────────────────────────────────── */
  function _openModal(pastor_id, data, culto_tipo, regId){
	    const modal=document.getElementById("dp-modal"); if(!modal) return;
	    const pastores=_getPastores();
	    if(!pastores.length){
	      T("Pastores","Não foi possível carregar nem cadastrar os pastores reais no Supabase. Execute o script supabase-escala-pregacao.sql no Supabase e atualize a página.");
	    }
	    const reg=regId?_disps.find(r=>r.id===regId):null;
	    const pOpts=`<option value="">— Selecionar pastor —</option>`+pastores.map(p=>`<option value="${_ea(p.id)}"${(pastor_id===p.id||reg?.pastor_id===p.id)?" selected":""}>${_eh(p.nome_completo)}</option>`).join("");
	    const tipoOpts=Object.keys(_TIPO).map(k=>`<option value="${_ea(k)}"${(culto_tipo===k||reg?.culto_tipo===k)?" selected":""}>${_eh(_TIPO[k].ico)} ${_eh(_TIPO[k].label)}</option>`).join("");
	    const dispVal=reg?reg.data:(data||"");
	    const statusOpts=Object.entries(_STATUS).map(([k,v])=>`<option value="${_ea(k)}"${reg?.status===k?" selected":""}>${_eh(v.label)}</option>`).join("");
	    const obsVal=_ea(reg?.observacoes||"");
	    modal.innerHTML=`<div style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9990;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)dp_fecharModal()"><div style="background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;width:480px;max-width:94vw;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,.4)"><div style="display:flex;align-items:center;gap:10px;margin-bottom:18px"><span style="font-size:20px">📅</span><div style="font-size:13px;font-weight:700;color:var(--teal)">${regId?"Editar Disponibilidade":"Nova Disponibilidade"}</div><button onclick="dp_fecharModal()" style="margin-left:auto;background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer">✕</button></div><div style="display:flex;flex-direction:column;gap:12px"><div><label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:4px">Pastor</label><select id="dp-m-pastor" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none;font-family:var(--sans)">${pOpts}</select></div><div style="display:flex;gap:10px"><div style="flex:1"><label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:4px">Data</label><input id="dp-m-data" type="date" value="${_ea(dispVal)}" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none;font-family:var(--sans);box-sizing:border-box"></div><div style="flex:1"><label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:4px">Culto</label><select id="dp-m-culto" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none;font-family:var(--sans)">${tipoOpts}</select></div></div><div style="display:flex;gap:10px"><div style="flex:1"><label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:4px">Status</label><select id="dp-m-status" style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none;font-family:var(--sans)">${statusOpts}</select></div><div style="flex:1;display:flex;align-items:center;gap:8px;padding-top:18px"><input type="checkbox" id="dp-m-disp" ${!reg||reg.disponivel?"checked":""} style="width:14px;height:14px;accent-color:var(--teal)"><label for="dp-m-disp" style="font-size:12px;color:var(--tx2)">Disponível</label></div></div><div><label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:4px">Observações</label><input id="dp-m-obs" type="text" value="${obsVal}" placeholder="Observações opcionais..." style="width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none;font-family:var(--sans);box-sizing:border-box"></div></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">${regId?`<button onclick="dp_removerDisp('${_ea(regId)}')" style="padding:8px 14px;background:rgba(208,104,104,0.12);border:1px solid rgba(208,104,104,0.3);border-radius:6px;color:#d06868;font-size:12px;cursor:pointer;font-family:var(--sans);margin-right:auto">🗑 Remover</button>`:""}<button onclick="dp_fecharModal()" style="padding:8px 16px;background:var(--bg-surface);border:1px solid var(--bd2);border-radius:6px;color:var(--tx2);font-size:12px;cursor:pointer;font-family:var(--sans)">Cancelar</button><button onclick="dp_salvarModal('${_ea(regId||"")}')" style="padding:8px 16px;background:var(--teal);border:none;border-radius:6px;color:#fff;font-size:12px;cursor:pointer;font-weight:600;font-family:var(--sans)">Salvar</button></div></div></div>`;
    modal.style.display="block";
  }

  /* ── API pública para Escala de Pregação ─────────────────────── */
	  window.dp_getDisponiveisIds = function(data, culto_tipo){
	    return _disps.filter(r=>r.data===data&&r.culto_tipo===culto_tipo&&r.disponivel&&r.pastor_id).map(r=>r.pastor_id);
	  };
	  window.dp_getObsDisponiveis = function(data, culto_tipo){
	    return _disps.filter(r=>r.data===data&&r.culto_tipo===culto_tipo&&r.disponivel&&r.pastor_id).map(r=>r.observacoes||"");
	  };

  /* ── Funções públicas ─────────────────────────────────────────── */
  window.dp_setTab = function(tab){
    _st.tab=tab;
    ["minha","admin","relatorio"].forEach(t=>{
      const div=document.getElementById(`dp-tab-${t}`);
      const btn=document.getElementById(`dp-tab-btn-${t}`);
      if(div) div.style.display=t===tab?"block":"none";
      if(btn){
        btn.style.background=t===tab?"var(--teal)":"var(--bg-card)";
        btn.style.color=t===tab?"#fff":"var(--tx2)";
        btn.style.fontWeight=t===tab?"600":"400";
      }
    });
    if(tab==="admin") _renderAdmin();
    if(tab==="relatorio") _renderRelatorio();
  };

  window.dp_render = function(){ _renderMinha(); _atualizarKpis(); };
  window.dp_renderAdmin = function(){ _renderAdmin(); };
  window.dp_renderRelatorio = function(){ _renderRelatorio(); };
  window.dp_mesAnterior = ()=>{ _st.mes=_addM(_st.mes,-1); _renderMinha(); _atualizarKpis(); };
  window.dp_mesProximo  = ()=>{ _st.mes=_addM(_st.mes,1);  _renderMinha(); _atualizarKpis(); };

  window.dp_abrirFormDisp = async function(){
    await _loadPastores();
    const hoje=_iso(new Date());
    _openModal("",hoje,"domingo_manha",null);
  };
	  window.dp_marcarDisp = async function(pastor_id, data, culto_tipo, disponivel){
	    if(_isAdmin()){ await _loadPastores(); _openModal(pastor_id,data,culto_tipo,null); return; }
	    if(!pastor_id){ T("Pastor não identificado","Seu usuário não está vinculado a um pastor cadastrado."); return; }
	    const ok=await _upsert({pastor_id,data,culto_tipo,disponivel:true,status:"PREENCHIDA",observacoes:""});
	    if(ok){ _renderMinha(); _atualizarKpis(); }
	  };
	  window.dp_marcarIndisp = async function(pastor_id, data, culto_tipo){
	    if(!pastor_id){ T("Pastor não identificado","Seu usuário não está vinculado a um pastor cadastrado."); return; }
	    const ok=await _upsert({pastor_id,data,culto_tipo,disponivel:false,status:"PENDENTE",observacoes:""});
	    if(ok){ _renderMinha(); _atualizarKpis(); }
	  };
	  window.dp_toggleDisp = async function(pastor_id, data, culto_tipo, disponivel){
	    if(!pastor_id){ T("Pastor não identificado","Seu usuário não está vinculado a um pastor cadastrado."); return; }
	    const ok=await _upsert({pastor_id,data,culto_tipo,disponivel,status:disponivel?"PREENCHIDA":"PENDENTE",observacoes:""});
	    if(ok){ _renderMinha(); _atualizarKpis(); }
	  };
	  window.dp_editarDisp = async function(id){
	    await _loadPastores();
	    const reg=_disps.find(r=>r.id===id); if(!reg) return;
	    _openModal(reg.pastor_id,reg.data,reg.culto_tipo,id);
	  };
  window.dp_cancelarDisp = async function(id){
    if(!confirm("Cancelar disponibilidade?")) return;
    const idx=_disps.findIndex(r=>r.id===id); if(idx<0) return;
    const r=_disps[idx];
    const ok=await _upsert({pastor_id:r.pastor_id,data:r.data,culto_tipo:r.culto_tipo,disponivel:false,status:"PENDENTE",observacoes:r.observacoes});
    if(ok){ _disps[idx]={..._disps[idx],status:"PENDENTE",pastor_id:"",disponivel:false}; _renderAll(); _atualizarKpis(); }
  };
	  window.dp_removerDisp = async function(id){
	    if(!confirm("Limpar esta disponibilidade da escala?")) return;
	    await _delete(id);
	    dp_fecharModal();
	    _renderAll(); _atualizarKpis();
  };
  window.dp_fecharModal = function(){
    const m=document.getElementById("dp-modal"); if(m){m.innerHTML="";m.style.display="none";}
  };
  window.dp_salvarModal = async function(regId){
    const pastor_id=document.getElementById("dp-m-pastor")?.value||"";
    const data=document.getElementById("dp-m-data")?.value||"";
    const culto_tipo=document.getElementById("dp-m-culto")?.value||"";
	    const status=document.getElementById("dp-m-status")?.value||"PREENCHIDA";
    const disponivel=document.getElementById("dp-m-disp")?.checked??true;
    const observacoes=document.getElementById("dp-m-obs")?.value||"";
    if(!pastor_id){alert("Selecione um pastor.");return;}
    if(!data){alert("Informe a data.");return;}
    if(!culto_tipo){alert("Selecione o culto.");return;}
	    const ok=await _upsert({pastor_id,data,culto_tipo,disponivel,observacoes,status:disponivel?status:"PENDENTE"});
    if(ok){
      _st.pastorFiltro=pastor_id;
      const sel=document.getElementById("dp-pastor-sel");
      if(sel&&[...sel.options].some(o=>o.value===pastor_id)) sel.value=pastor_id;
      dp_fecharModal();
      _renderAll();
      _atualizarKpis();
    }
  };
  window.dp_exportar = function(){
    const mesKey=document.getElementById("dp-admin-mes")?.value||_mesKey(_st.mes);
    const rows=_disps.filter(r=>r.data&&r.data.startsWith(mesKey)&&r.disponivel);
    if(!rows.length){alert("Nenhum dado para exportar neste mês.");return;}
    const header="Data,Culto,Pastor,Status,Observações";
    const lines=rows.sort((a,b)=>a.data.localeCompare(b.data)||a.culto_tipo.localeCompare(b.culto_tipo)).map(r=>`${r.data},${_TIPO[r.culto_tipo]?.label||r.culto_tipo},"${_nomePastor(r.pastor_id)}",${r.status},"${r.observacoes||""}"`);
    const csv=header+"\n"+lines.join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`disponibilidade_${mesKey}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  window.dp_loadDisps = _loadDisps;

  // Exibe controles administrativos apenas para admins
  function _ajustarUiPorPerfil(){
    const isAdm=_isAdmin();
    const heroAct=document.getElementById("dp-hero-act-admin");
    const tabAdmin=document.getElementById("dp-tab-btn-admin");
    const tabRel=document.getElementById("dp-tab-btn-relatorio");
    if(heroAct) heroAct.style.display=isAdm?"":"none";
    if(tabAdmin) tabAdmin.style.display=isAdm?"":"none";
    if(tabRel) tabRel.style.display=isAdm?"":"none";
  }
  // Chama após carregar (USUARIO_ATUAL já disponível)
  setTimeout(_ajustarUiPorPerfil, 100);

})();
