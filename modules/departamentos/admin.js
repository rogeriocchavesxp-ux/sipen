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
    { slug:'infraestrutura', nome:'Infraestrutura e Conservação', ico:'🔧', cor:'var(--violet)', desc:'Manutenção, conservação e espaços físicos' },
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
    if(heroDsc) heroDsc.textContent = "Secretaria, Tesouraria, Patrimônio, Comunicação, Infraestrutura e Conservação, Jurídico";
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
        <div class="card" style="cursor:pointer;transition:box-shadow .15s"
          onmouseenter="this.style.boxShadow='0 4px 18px rgba(0,0,0,.14)'"
          onmouseleave="this.style.boxShadow=''"
          onclick="go('jur-dash')">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
            <div style="width:40px;height:40px;border-radius:10px;background:var(--bg2);border:1px solid var(--bd2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">⚖</div>
            <div>
              <div style="font-size:13.5px;font-weight:700;color:var(--tx1)">Jurídico</div>
              <div style="font-size:10.5px;color:var(--tx3);margin-top:2px">Contratos, processos, pareceres e documentos jurídicos</div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:10px;font-weight:700;color:var(--blue);background:var(--bd2);padding:2px 8px;border-radius:20px">Ativo</span>
            <span style="font-size:11px;color:var(--tx3)">Ver área →</span>
          </div>
        </div>
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

/* ═══════════════════════════════════════════════════════
   COMISSÕES — gestão de comissões institucionais
═══════════════════════════════════════════════════════ */

const _COR_STATUS = {
  ativo:     { bg:"rgba(58,170,92,0.12)",  txt:"var(--gmd)",  label:"Ativa" },
  inativo:   { bg:"rgba(150,150,150,0.12)",txt:"var(--tx3)",  label:"Inativa" },
  encerrada: { bg:"rgba(208,104,104,0.12)",txt:"var(--rose)", label:"Encerrada" },
};

const _COM_STATUS_OPTS = [
  { v:"ativo",     l:"Ativa" },
  { v:"inativo",   l:"Inativa" },
  { v:"encerrada", l:"Encerrada" },
];

const _inputStyle = "width:100%;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;color:var(--tx1);font-size:12px;padding:8px 10px;outline:none;box-sizing:border-box";
const _labelStyle = "display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:4px";

/* ── Lista ─────────────────────────────────────────── */

function _minComNomesCell(c) {
  const vinculados = Array.isArray(c.comissao_membros) ? c.comissao_membros : [];
  if (vinculados.length) {
    const nomes = vinculados
      .map(m => m.pessoas?.nome || "")
      .filter(Boolean)
      .map(n => n.split(" ")[0].toUpperCase());
    const visiveis = nomes.slice(0, 3);
    const resto = nomes.length - visiveis.length;
    return escapeHtml(visiveis.join(", ")) + (resto > 0 ? ` <span style="color:var(--tx3)">+${resto}</span>` : "");
  }
  if (c.membros) {
    const partes = c.membros.split(";").map(m => m.trim()).filter(Boolean);
    const visiveis = partes.slice(0, 3);
    const resto = partes.length - visiveis.length;
    return escapeHtml(visiveis.join("; ")) + (resto > 0 ? ` <span style="color:var(--tx3)">+${resto}</span>` : "");
  }
  return `<span style="color:var(--tx3)">—</span>`;
}

window.minComLoad = async function() {
  const el = document.getElementById("min-com-list");
  if (!el) return;
  if (!SUPABASE_URL) {
    el.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:12px 0">Configure a conexão com o Supabase para carregar as comissões.</div>`;
    return;
  }
  el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px">${spinner()}Carregando...</div>`;
  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/comissoes?select=id,nome,descricao,relator,status,membros,comissao_membros(id,pessoas(id,nome))&order=nome.asc`,
      { headers: apiHeaders() }
    );
    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 400 || res.status === 404 || txt.includes("does not exist") || txt.includes("não existe")) {
        el.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:16px 0">
          Tabela <code style="background:var(--bg-surface);padding:1px 5px;border-radius:4px">comissoes</code> não encontrada.<br>
          <span style="font-size:11px">Execute <code>comissoes-migration.sql</code> no Supabase para ativar este módulo.</span>
        </div>`;
        return;
      }
      throw new Error(txt);
    }
    const data = await res.json();
    if (!data.length) {
      el.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:16px 0">Nenhuma comissão cadastrada. Clique em <b>+ Nova Comissão</b> para começar.</div>`;
      return;
    }
    el.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="border-bottom:2px solid var(--bd1)">
            <th style="text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);font-weight:600">Nome</th>
            <th style="text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);font-weight:600">Relator</th>
            <th style="text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);font-weight:600;min-width:180px">Membros</th>
            <th style="text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);font-weight:600">Status</th>
            <th style="padding:8px 10px"></th>
          </tr>
        </thead>
        <tbody>
          ${data.map(c => {
            const st = _COR_STATUS[c.status] || _COR_STATUS.inativo;
            return `<tr style="border-bottom:1px solid var(--bd1)"
                onmouseover="this.style.background='var(--bg-hover)'"
                onmouseout="this.style.background=''">
              <td style="padding:9px 10px">
                <div style="font-weight:600;color:var(--tx1)">${escapeHtml(c.nome)}</div>
                ${c.descricao ? `<div style="font-size:11px;color:var(--tx3);margin-top:2px">${escapeHtml(c.descricao)}</div>` : ""}
              </td>
              <td style="padding:9px 10px;color:var(--tx2);font-size:11.5px">${escapeHtml(c.relator || "—")}</td>
              <td style="padding:9px 10px;font-size:11.5px">${_minComNomesCell(c)}</td>
              <td style="padding:9px 10px">
                <span style="font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600;background:${st.bg};color:${st.txt}">${st.label}</span>
              </td>
              <td style="padding:9px 10px;text-align:right">
                <button class="tbt" onclick="minComDetalhe('${escapeHtmlAttr(c.id)}')">Abrir</button>
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose);font-size:12px;padding:12px 0">${escapeHtml(e.message)}</div>`;
  }
};

/* ── Nova comissão ─────────────────────────────────── */

window.minComNova = function() {
  _minComAbrirModal(null);
};

/* ── Abrir comissão existente ──────────────────────── */

window.minComDetalhe = async function(id) {
  if (!SUPABASE_URL) { T("Configuração necessária", "Configure a conexão com o Supabase"); return; }
  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/comissoes?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
      { headers: apiHeaders() }
    );
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (!data.length) { T("Não encontrado", "Comissão não encontrada no banco"); return; }
    _minComAbrirModal(data[0]);
  } catch(e) {
    T("Erro ao carregar", e.message);
  }
};

/* ── Modal compartilhado (nova / edição) ───────────── */

function _minComAbrirModal(com) {
  const isEdit = !!(com && com.id);

  let overlay = document.getElementById("min-com-modal");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "min-com-modal";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:310";
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div style="width:min(700px,94vw);max-height:90vh;overflow:hidden;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;display:flex;flex-direction:column">
      <div style="padding:14px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--tx1)">${isEdit ? "Editar" : "Nova"} Comissão${isEdit ? " · " + escapeHtml(com.nome) : ""}</div>
          <div style="font-size:10px;color:var(--tx3)">Comissões Permanentes do Conselho</div>
        </div>
        <button onclick="document.getElementById('min-com-modal').remove()" style="background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer;line-height:1">✕</button>
      </div>
      <div style="padding:16px;overflow-y:auto;flex:1">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">

          <div style="grid-column:1/-1">
            <label style="${_labelStyle}">Nome <span style="color:var(--rose)">*</span></label>
            <input id="mcd-nome" type="text" value="${escapeHtmlAttr(com?.nome || "")}"
              style="${_inputStyle}" placeholder="Nome da comissão">
          </div>

          <div style="grid-column:1/-1">
            <label style="${_labelStyle}">Descrição</label>
            <textarea id="mcd-descricao"
              style="${_inputStyle};min-height:72px;resize:vertical"
              placeholder="Finalidade ou objetivo da comissão">${escapeHtml(com?.descricao || "")}</textarea>
          </div>

          <div>
            <label style="${_labelStyle}">Relator / Responsável</label>
            <input id="mcd-relator" type="text" value="${escapeHtmlAttr(com?.relator || "")}"
              style="${_inputStyle}" placeholder="Nome do relator">
          </div>

          <div>
            <label style="${_labelStyle}">Status</label>
            <select id="mcd-status" style="${_inputStyle}">
              ${_COM_STATUS_OPTS.map(o =>
                `<option value="${o.v}" ${(com?.status || "ativo") === o.v ? "selected" : ""}>${o.l}</option>`
              ).join("")}
            </select>
          </div>

          ${isEdit ? `
          <div style="grid-column:1/-1">
            <label style="${_labelStyle}">Membros</label>
            <div id="mcd-membros-tags"
              style="display:flex;flex-wrap:wrap;gap:5px;padding:8px;background:var(--bg-input);border:1px solid var(--bd2);border-radius:6px;min-height:42px;align-items:flex-start">
              <span style="color:var(--tx3);font-size:11.5px;padding:2px 4px">Carregando...</span>
            </div>
            <div style="position:relative;margin-top:6px">
              <input id="mcd-busca-membro" type="text" placeholder="Buscar membro pelo nome..."
                autocomplete="off"
                oninput="_minComBuscarPessoa(this.value,'${escapeHtmlAttr(com.id)}')"
                onkeydown="if(event.key==='Escape')_minComFecharDropdown()"
                style="${_inputStyle}">
              <div id="mcd-busca-dropdown"
                style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--bg-card);border:1px solid var(--bd2);border-radius:0 0 6px 6px;z-index:320;max-height:200px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.18)">
              </div>
            </div>
          </div>` : ""}

        </div>
      </div>
      <div style="padding:12px 16px;border-top:1px solid var(--bd1);display:flex;justify-content:flex-end;gap:8px;flex-shrink:0">
        <button onclick="document.getElementById('min-com-modal').remove()"
          style="background:var(--bg-surface);border:1px solid var(--bd1);border-radius:6px;padding:8px 14px;color:var(--tx2);cursor:pointer;font-size:12px">
          ${isEdit ? "Fechar" : "Cancelar"}
        </button>
        ${isEdit
          ? `<button id="mcd-btn-salvar" onclick="_minComSalvar('${escapeHtmlAttr(com.id)}')"
              style="background:var(--gr);border:none;border-radius:6px;padding:8px 18px;color:#fff;font-weight:600;cursor:pointer;font-size:12px">
              Salvar alterações
            </button>`
          : `<button id="mcd-btn-salvar" onclick="_minComCriar()"
              style="background:var(--gr);border:none;border-radius:6px;padding:8px 18px;color:#fff;font-weight:600;cursor:pointer;font-size:12px">
              Criar comissão
            </button>`
        }
      </div>
    </div>`;

  if (isEdit) _minComCarregarMembros(com.id);
}

/* ── Membros: carregar do banco ─────────────────────── */

async function _minComCarregarMembros(comissaoId) {
  const el = document.getElementById("mcd-membros-tags");
  if (!el) return;
  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/comissao_membros?comissao_id=eq.${encodeURIComponent(comissaoId)}&select=id,funcao,pessoa_id,pessoas(id,nome)&order=created_at.asc`,
      { headers: apiHeaders() }
    );
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    _minComRenderMembros(rows, comissaoId);
  } catch(e) {
    if (el) el.innerHTML = `<span style="color:var(--rose);font-size:11px">${escapeHtml(e.message)}</span>`;
  }
}

function _minComRenderMembros(rows, comissaoId) {
  const el = document.getElementById("mcd-membros-tags");
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = `<span style="color:var(--tx3);font-size:11.5px;padding:2px 4px">Nenhum membro vinculado</span>`;
    return;
  }
  el.innerHTML = rows.map(m => {
    const nome = m.pessoas?.nome ? m.pessoas.nome.toUpperCase() : `ID: ${m.pessoa_id}`;
    const funcaoBadge = m.funcao !== "membro"
      ? `<span style="color:var(--tx3);font-size:10px"> · ${escapeHtml(m.funcao)}</span>`
      : "";
    return `
      <span style="display:inline-flex;align-items:center;gap:4px;background:var(--bg-surface);border:1px solid var(--bd2);border-radius:20px;padding:3px 10px 3px 8px;font-size:11.5px;color:var(--tx2)">
        ${escapeHtml(nome)}${funcaoBadge}
        <button onclick="_minComRemMembro('${escapeHtmlAttr(m.id)}','${escapeHtmlAttr(comissaoId)}')"
          style="background:none;border:none;color:var(--tx3);cursor:pointer;font-size:13px;padding:0;line-height:1;margin-left:2px"
          title="Remover">✕</button>
      </span>`;
  }).join("");
}

/* ── Membros: remover vínculo ───────────────────────── */

window._minComRemMembro = async function(vinculoId, comissaoId) {
  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/comissao_membros?id=eq.${encodeURIComponent(vinculoId)}`,
      { method: "DELETE", headers: apiHeaders({ "Prefer": "return=minimal" }) }
    );
    if (!res.ok) throw new Error(await res.text());
    await _minComCarregarMembros(comissaoId);
  } catch(e) {
    T("Erro ao remover", e.message);
  }
};

/* ── Membros: busca autocomplete ───────────────────── */

let _minComBuscaTimer = null;

window._minComBuscarPessoa = function(query, comissaoId) {
  clearTimeout(_minComBuscaTimer);
  const dd = document.getElementById("mcd-busca-dropdown");
  if (!dd) return;
  if (!query.trim() || query.trim().length < 2) { dd.style.display = "none"; return; }
  _minComBuscaTimer = setTimeout(async () => {
    try {
      const res = await fetch(
        `${apiBaseUrl()}/rest/v1/pessoas?nome=ilike.*${encodeURIComponent(query.trim())}*&select=id,nome&deleted_at=is.null&order=nome.asc&limit=8`,
        { headers: apiHeaders() }
      );
      if (!res.ok) { dd.style.display = "none"; return; }
      const rows = await res.json();
      if (!rows.length) {
        dd.innerHTML = `<div style="padding:8px 12px;color:var(--tx3);font-size:11.5px">Nenhuma pessoa encontrada</div>`;
        dd.style.display = "block";
        return;
      }
      dd.innerHTML = rows.map(p =>
        `<div onclick="_minComAdicionarMembro('${escapeHtmlAttr(p.id)}','${escapeHtmlAttr(p.nome)}','${escapeHtmlAttr(comissaoId)}')"
          style="padding:8px 12px;cursor:pointer;font-size:12px;color:var(--tx1);border-bottom:1px solid var(--bd1)"
          onmouseover="this.style.background='var(--bg-hover)'"
          onmouseout="this.style.background=''">
          ${escapeHtml(p.nome.toUpperCase())}
        </div>`
      ).join("");
      dd.style.display = "block";
    } catch(_) {
      dd.style.display = "none";
    }
  }, 280);
};

window._minComFecharDropdown = function() {
  const dd = document.getElementById("mcd-busca-dropdown");
  if (dd) dd.style.display = "none";
};

/* ── Membros: adicionar vínculo ─────────────────────── */

window._minComAdicionarMembro = async function(pessoaId, pessoaNome, comissaoId) {
  _minComFecharDropdown();
  const input = document.getElementById("mcd-busca-membro");
  if (input) input.value = "";
  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/comissao_membros`,
      {
        method: "POST",
        headers: apiHeaders({ "Prefer": "return=minimal" }),
        body: JSON.stringify({ comissao_id: comissaoId, pessoa_id: pessoaId, funcao: "membro" }),
      }
    );
    if (!res.ok) {
      const txt = await res.text();
      if (txt.includes("unique") || txt.includes("duplicate")) {
        T("Já vinculado", `${pessoaNome.toUpperCase()} já é membro desta comissão`);
        return;
      }
      throw new Error(txt);
    }
    await _minComCarregarMembros(comissaoId);
  } catch(e) {
    T("Erro ao adicionar", e.message);
  }
};

/* ── Persistência: salvar dados da comissão ─────────── */

window._minComSalvar = async function(id) {
  if (!id) return;
  const payload = {
    nome:       document.getElementById("mcd-nome")?.value.trim() || "",
    descricao:  document.getElementById("mcd-descricao")?.value.trim() || null,
    relator:    document.getElementById("mcd-relator")?.value.trim() || null,
    status:     document.getElementById("mcd-status")?.value || "ativo",
    updated_at: new Date().toISOString(),
  };
  if (!payload.nome) { T("Campo obrigatório", "Informe o nome da comissão"); return; }

  const btn = document.getElementById("mcd-btn-salvar");
  if (btn) { btn.disabled = true; btn.textContent = "Salvando..."; }

  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/comissoes?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: apiHeaders({ "Prefer": "return=minimal" }),
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) throw new Error(await res.text());
    T("Salvo", "Comissão atualizada");
    document.getElementById("min-com-modal")?.remove();
    await minComLoad();
  } catch(e) {
    T("Erro ao salvar", e.message);
    if (btn) { btn.disabled = false; btn.textContent = "Salvar alterações"; }
  }
};

/* ── Criar nova comissão ────────────────────────────── */

window._minComCriar = async function() {
  const payload = {
    nome:      document.getElementById("mcd-nome")?.value.trim() || "",
    descricao: document.getElementById("mcd-descricao")?.value.trim() || null,
    relator:   document.getElementById("mcd-relator")?.value.trim() || null,
    status:    document.getElementById("mcd-status")?.value || "ativo",
  };
  if (!payload.nome) { T("Campo obrigatório", "Informe o nome da comissão"); return; }

  const btn = document.getElementById("mcd-btn-salvar");
  if (btn) { btn.disabled = true; btn.textContent = "Criando..."; }

  try {
    const res = await fetch(
      `${apiBaseUrl()}/rest/v1/comissoes`,
      {
        method: "POST",
        headers: apiHeaders({ "Prefer": "return=representation" }),
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    const com = Array.isArray(rows) ? rows[0] : rows;
    await minComLoad();
    _minComAbrirModal(com);
  } catch(e) {
    T("Erro ao criar", e.message);
    if (btn) { btn.disabled = false; btn.textContent = "Criar comissão"; }
  }
};
