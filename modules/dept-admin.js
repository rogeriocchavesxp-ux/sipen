/* ═══════════════════════════════════════════════════════
   SIPEN — Departamentos Administrativos
   dept-admin.js · v1.0

   Gestão de Secretaria, Tesouraria, Patrimônio,
   Comunicação e Infraestrutura com equipes por função.
═══════════════════════════════════════════════════════ */

const DEPT_ADM = (function(){

  /* ── Config estática dos 5 departamentos ────────────────── */
  const CFG = [
    { slug:'secretaria',     nome:'Secretaria',     ico:'📋', cor:'var(--blue)',   desc:'Documentação, atas e registros administrativos' },
    { slug:'tesouraria',     nome:'Tesouraria',     ico:'💰', cor:'var(--gr)',     desc:'Finanças, pagamentos e prestação de contas' },
    { slug:'patrimonio',     nome:'Patrimônio',     ico:'🏗',  cor:'var(--amber)',  desc:'Gestão de bens, imóveis e equipamentos' },
    { slug:'comunicacao',    nome:'Comunicação',    ico:'📢', cor:'var(--teal)',   desc:'Mídias, redes sociais e comunicados oficiais' },
    { slug:'infraestrutura', nome:'Infraestrutura', ico:'🔧', cor:'var(--violet)', desc:'Manutenção, conservação e espaços físicos' },
  ];

  const FUNCOES = [
    { key:'supervisor',     label:'Supervisor',      max:1 },
    { key:'coordenador',    label:'Coordenador',     max:1 },
    { key:'lider_setorial', label:'Líder Setorial',  max:null },
    { key:'membro',         label:'Membro da Equipe',max:null },
  ];

  /* ── Estado ─────────────────────────────────────────────── */
  let _depts   = [];   // registros do banco (com UUID)
  let _pessoas = [];   // cache completo de pessoas
  let _detalhe = null; // dept atual no painel de detalhe

  /* ── Helpers ────────────────────────────────────────────── */

  function _base(){ return (typeof SUPABASE_URL!=="undefined"?SUPABASE_URL:"").trim().replace(/\/$/,""); }

  function _hdr(){
    const token = typeof sipenToken==="function" ? sipenToken() : (typeof SUPABASE_ANON_KEY!=="undefined"?SUPABASE_ANON_KEY:"");
    return {
      "apikey":        typeof SUPABASE_ANON_KEY!=="undefined" ? SUPABASE_ANON_KEY : "",
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
      "Prefer":        "return=representation",
    };
  }

  async function _fetch(path, opts={}){
    try{
      const res = await fetch(_base()+"/rest/v1/"+path, { headers:_hdr(), ...opts });
      if(!res.ok){ const t=await res.text(); throw new Error(t); }
      const ct = res.headers.get("content-type")||"";
      return ct.includes("json") ? await res.json() : [];
    }catch(e){ throw e; }
  }

  function _esc(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function _dn(s){ return (s||"").toUpperCase(); }

  function _isAdmin(){
    const p = String(typeof USUARIO_ATUAL!=="undefined" ? (USUARIO_ATUAL?.perfil||"") : "").toUpperCase();
    return ["ADMINISTRADOR_GERAL","ADM_OPERACIONAL","ADMIN_GERAL"].includes(p) || p.includes("ADMIN");
  }

  function _authId(){ return typeof USUARIO_ATUAL!=="undefined" ? (USUARIO_ATUAL?.auth_user_id||null) : null; }

  function _cfgBySlug(slug){ return CFG.find(c=>c.slug===slug)||CFG[0]; }
  function _deptById(id){ return _depts.find(d=>d.id===id)||null; }

  /* ── Carregamento de dados ──────────────────────────────── */

  async function _carregarDepts(){
    if(_depts.length) return;
    const rows = await _fetch("dept_administrativos?select=*&order=nome.asc");
    _depts = Array.isArray(rows) ? rows : [];
  }

  async function _carregarPessoas(){
    if(_pessoas.length) return;
    if(typeof sipenFetchTodos==="function"){
      _pessoas = await sipenFetchTodos("rest/v1/pessoas?select=id,nome&deleted_at=is.null&order=nome.asc", _hdr());
    } else {
      const rows = await _fetch("pessoas?select=id,nome&deleted_at=is.null&order=nome.asc&limit=1000");
      _pessoas = Array.isArray(rows) ? rows : [];
    }
  }

  async function _carregarMembros(deptId){
    const rows = await _fetch(
      `dept_membros?departamento_id=eq.${encodeURIComponent(deptId)}&status=eq.ativo&select=id,funcao,status,data_inicio,observacoes,pessoa_id&order=funcao.asc,created_at.asc`
    );
    return Array.isArray(rows) ? rows : [];
  }

  /* ── Painel: lista de departamentos ─────────────────────── */

  function _renderLista(){
    const lista = document.getElementById("dept-adm-lista");
    const detalhe = document.getElementById("dept-adm-detalhe");
    const heroAct = document.getElementById("dept-adm-hero-act");
    const heroTtl = document.getElementById("dept-adm-titulo");
    const heroDsc = document.getElementById("dept-adm-subtitulo");
    if(!lista) return;

    if(heroTtl) heroTtl.textContent = "Administração";
    if(heroDsc) heroDsc.textContent = "Secretaria, Tesouraria, Patrimônio, Comunicação e Infraestrutura";
    if(heroAct) heroAct.innerHTML = "";
    if(detalhe){ detalhe.style.display="none"; detalhe.innerHTML=""; }

    // Contar membros por dept
    const countMap = {};
    for(const d of _depts){ countMap[d.id] = 0; }

    lista.style.display = "";
    lista.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">
        ${CFG.map(cfg => {
          const dept = _depts.find(d=>d.slug===cfg.slug);
          if(!dept) return "";
          return `
            <div class="card" style="cursor:pointer;transition:box-shadow .15s"
              onmouseenter="this.style.boxShadow='0 4px 18px rgba(0,0,0,.14)'"
              onmouseleave="this.style.boxShadow=''"
              onclick="DEPT_ADM.abrirDetalhe('${_esc(dept.id)}')">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
                <div style="width:40px;height:40px;border-radius:10px;background:var(--bg2);border:1px solid var(--bd2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${cfg.ico}</div>
                <div>
                  <div style="font-size:13.5px;font-weight:700;color:var(--tx1)">${_esc(dept.nome)}</div>
                  <div style="font-size:10.5px;color:var(--tx3);margin-top:2px">${_esc(cfg.desc)}</div>
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:10px;font-weight:700;color:${cfg.cor};background:var(--bd2);padding:2px 8px;border-radius:20px">
                  ${dept.status==="ativo"?"Ativo":"Inativo"}
                </span>
                <span style="font-size:11px;color:var(--tx3)">Ver equipe →</span>
              </div>
            </div>`;
        }).join("")}
      </div>`;
  }

  /* ── Painel: detalhe do departamento ────────────────────── */

  async function abrirDetalhe(deptId){
    const lista   = document.getElementById("dept-adm-lista");
    const detalhe = document.getElementById("dept-adm-detalhe");
    const heroAct = document.getElementById("dept-adm-hero-act");
    const heroTtl = document.getElementById("dept-adm-titulo");
    const heroDsc = document.getElementById("dept-adm-subtitulo");
    if(!detalhe) return;

    const dept = _deptById(deptId);
    if(!dept) return;
    _detalhe = dept;

    const cfg = _cfgBySlug(dept.slug);

    if(heroTtl) heroTtl.textContent = cfg.nome;
    if(heroDsc) heroDsc.textContent = cfg.desc;
    if(heroAct) heroAct.innerHTML = `<button class="tbt" onclick="DEPT_ADM.voltarLista()">← Voltar</button>`;
    if(lista){ lista.style.display="none"; }

    detalhe.style.display = "";
    detalhe.innerHTML = `<div style="color:var(--tx3);font-size:11.5px">${typeof spinner==="function"?spinner():""} Carregando equipe...</div>`;

    try{
      const membros = await _carregarMembros(deptId);
      _renderDetalhe(dept, cfg, membros);
    }catch(e){
      detalhe.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${_esc(e.message)}</div>`;
    }
  }

  function _renderDetalhe(dept, cfg, membros){
    const detalhe = document.getElementById("dept-adm-detalhe");
    if(!detalhe) return;

    const admin = _isAdmin();

    const byFuncao = {};
    for(const f of FUNCOES) byFuncao[f.key] = membros.filter(m=>m.funcao===f.key);

    const secoes = FUNCOES.map(f => {
      const lista = byFuncao[f.key]||[];
      const podAdd = admin && (f.max===null || lista.length < f.max);
      return `
        <div class="card" style="margin-bottom:14px">
          <div class="ctit" style="display:flex;align-items:center;gap:10px">
            <span>${_esc(f.label)}</span>
            <span style="font-size:10px;color:var(--tx3);background:var(--bd2);padding:1px 7px;border-radius:20px">${lista.length}</span>
            ${podAdd ? `<span class="cact" style="margin-left:auto" onclick="DEPT_ADM.openAddModal('${_esc(dept.id)}','${f.key}','${_esc(f.label)}')">+ Adicionar</span>` : ""}
          </div>
          ${lista.length===0
            ? `<div style="color:var(--tx3);font-size:11.5px;padding:8px 0">Nenhum ${f.label.toLowerCase()} vinculado.</div>`
            : `<div style="display:flex;flex-direction:column;gap:4px">
                ${lista.map(m => {
                  const p = _pessoas.find(x=>x.id===m.pessoa_id);
                  const nome = p ? _dn(p.nome) : `ID: ${m.pessoa_id}`;
                  return `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bd1)">
                      <div>
                        <div style="font-size:12.5px;font-weight:600;color:var(--tx1)">${_esc(nome)}</div>
                        ${m.data_inicio ? `<div style="font-size:10.5px;color:var(--tx3)">desde ${new Date(m.data_inicio+"T12:00:00").toLocaleDateString("pt-BR")}</div>` : ""}
                      </div>
                      ${admin ? `
                        <div style="display:flex;gap:6px">
                          <button class="tbt" style="font-size:10px;padding:2px 8px;color:var(--rose);border-color:var(--rose)"
                            onclick="DEPT_ADM.removerMembro('${_esc(m.id)}','${_esc(dept.id)}','${_esc(nome)}')">Remover</button>
                        </div>` : ""}
                    </div>`;
                }).join("")}
              </div>`}
        </div>`;
    }).join("");

    detalhe.innerHTML = `
      <div style="max-width:860px">
        ${admin && dept.status==="ativo" ? `
          <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
            <button class="tbt" onclick="DEPT_ADM.openAddModal('${_esc(dept.id)}',null,'Membro da Equipe')">+ Adicionar Pessoa</button>
          </div>` : ""}
        ${secoes}
        ${dept.observacoes ? `
          <div class="card">
            <div class="ctit">Observações</div>
            <div style="font-size:12px;color:var(--tx2)">${_esc(dept.observacoes)}</div>
          </div>` : ""}
      </div>`;
  }

  function voltarLista(){
    _detalhe = null;
    _renderLista();
  }

  /* ── Modal: adicionar pessoa ────────────────────────────── */

  function openAddModal(deptId, funcaoPreset, funcaoLabel){
    let modal = document.getElementById("dept-adm-modal");
    if(!modal){
      modal = document.createElement("div");
      modal.id = "dept-adm-modal";
      modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:350;display:flex;align-items:center;justify-content:center";
      document.body.appendChild(modal);
    }

    const optsFunc = FUNCOES.map(f =>
      `<option value="${f.key}"${f.key===funcaoPreset?" selected":""}>${_esc(f.label)}</option>`
    ).join("");

    const optsPessoa = `<option value="">— Selecionar pessoa —</option>` +
      _pessoas.map(p=>`<option value="${_esc(p.id)}">${_esc(_dn(p.nome))}</option>`).join("");

    modal.innerHTML = `
      <div style="width:min(500px,94vw);background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <div style="font-size:15px;font-weight:800;color:var(--tx1)">Adicionar Pessoa</div>
          <button onclick="DEPT_ADM.closeAddModal()" style="margin-left:auto;background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer">✕</button>
        </div>
        <input type="hidden" id="dam-dept-id" value="${_esc(deptId)}">
        <div class="fg" style="margin-bottom:10px">
          <label class="flb">Pessoa</label>
          <select class="fi2" id="dam-pessoa" style="text-transform:uppercase">${optsPessoa}</select>
        </div>
        <div class="fg" style="margin-bottom:10px">
          <label class="flb">Função</label>
          <select class="fi2" id="dam-funcao">${optsFunc}</select>
        </div>
        <div class="fg" style="margin-bottom:10px">
          <label class="flb">Data de início</label>
          <input class="fi2" type="date" id="dam-inicio" value="${new Date().toISOString().slice(0,10)}">
        </div>
        <div class="fg" style="margin-bottom:16px">
          <label class="flb">Observações (opcional)</label>
          <textarea class="fi2" id="dam-obs" rows="2"></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button class="btn" onclick="DEPT_ADM.closeAddModal()">Cancelar</button>
          <button class="btn btn-p" onclick="DEPT_ADM.salvarMembro()">Adicionar</button>
        </div>
      </div>`;

    modal.style.display = "flex";
  }

  function closeAddModal(){
    const m = document.getElementById("dept-adm-modal");
    if(m) m.style.display = "none";
  }

  async function salvarMembro(){
    const deptId    = document.getElementById("dam-dept-id")?.value;
    const pessoaId  = document.getElementById("dam-pessoa")?.value;
    const funcao    = document.getElementById("dam-funcao")?.value;
    const inicio    = document.getElementById("dam-inicio")?.value || null;
    const obs       = document.getElementById("dam-obs")?.value || null;

    if(!pessoaId){ if(typeof T==="function") T("Campo obrigatório","Selecione uma pessoa."); return; }
    if(!funcao)  { if(typeof T==="function") T("Campo obrigatório","Selecione a função."); return; }

    const btn = document.querySelector("#dept-adm-modal .btn-p");
    if(btn){ btn.disabled=true; btn.textContent="Salvando..."; }

    try{
      await _fetch("dept_membros", {
        method: "POST",
        body: JSON.stringify({
          departamento_id: deptId,
          pessoa_id:       pessoaId,
          funcao,
          status:          "ativo",
          data_inicio:     inicio || null,
          observacoes:     obs || null,
          criado_por:      _authId(),
        }),
      });
      closeAddModal();
      if(typeof T==="function") T("Pessoa adicionada","Vínculo registrado com sucesso.");
      await abrirDetalhe(deptId);
    }catch(e){
      if(btn){ btn.disabled=false; btn.textContent="Adicionar"; }
      const msg = e.message.includes("unique") ? "Essa pessoa já possui essa função neste departamento." : e.message;
      if(typeof T==="function") T("Erro ao adicionar", msg);
    }
  }

  async function removerMembro(membroId, deptId, nome){
    if(!confirm(`Remover ${nome} deste departamento?`)) return;
    try{
      await _fetch(`dept_membros?id=eq.${encodeURIComponent(membroId)}`, { method:"DELETE" });
      if(typeof T==="function") T("Removido","Vínculo encerrado com sucesso.");
      await abrirDetalhe(deptId);
    }catch(e){
      if(typeof T==="function") T("Erro ao remover", e.message);
    }
  }

  /* ── Entrada principal ──────────────────────────────────── */

  async function load(){
    const lista = document.getElementById("dept-adm-lista");
    const detalhe = document.getElementById("dept-adm-detalhe");
    if(!lista) return;

    lista.style.display = "";
    lista.innerHTML = `<div style="color:var(--tx3);font-size:11.5px">${typeof spinner==="function"?spinner():""} Carregando...</div>`;
    if(detalhe){ detalhe.style.display="none"; detalhe.innerHTML=""; }

    try{
      await Promise.all([_carregarDepts(), _carregarPessoas()]);
      if(!_depts.length){
        lista.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Tabelas não encontradas. Execute o script <b>supabase-dept-admin.sql</b> no Supabase.</div>`;
        return;
      }
      _renderLista();
    }catch(e){
      lista.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro ao carregar: ${_esc(e.message)}</div>`;
    }
  }

  /* ── Limpar cache (forçar reload) ───────────────────────── */
  function invalidate(){ _depts=[]; _pessoas=[]; _detalhe=null; }

  /* ── API pública ────────────────────────────────────────── */
  return { load, invalidate, abrirDetalhe, voltarLista, openAddModal, closeAddModal, salvarMembro, removerMembro };
})();

window.DEPT_ADM = DEPT_ADM;
