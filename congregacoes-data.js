/* ═══════════════════════════════════════════════════════
   SIPEN — Congregações: Camada de Dados
   congregacoes-data.js · v3.0
   localStorage (cache) + Supabase (fonte de verdade)

   Tabelas necessárias no Supabase:
     - congregacoes
     - congregacao_cultos
═══════════════════════════════════════════════════════ */

// Força re-seed quando a versão do catálogo muda
(function(){
  const VER_KEY="sipen_cong_catalog_ver", VER="2026-04-18-v10";
  if(localStorage.getItem(VER_KEY)!==VER){
    localStorage.removeItem("sipen_cong_v2");
    localStorage.setItem(VER_KEY, VER);
  }
})();

const CONG = (function(){
  const KEYS = {
    congs:  "sipen_cong_v2",
    cultos: "sipen_cultos_v2"
  };

  /* ── localStorage ────────────────────────────────────── */

  function listCongs(){
    try{ return JSON.parse(localStorage.getItem(KEYS.congs)||"[]"); }catch{ return []; }
  }
  function saveCongs(arr){ localStorage.setItem(KEYS.congs, JSON.stringify(arr)); }

  function getCong(id){ return listCongs().find(c=>c.id===id)||null; }

  function saveCong(cong){
    const arr=listCongs();
    const i=arr.findIndex(c=>c.id===cong.id);
    if(i>=0) arr[i]=cong; else arr.push(cong);
    saveCongs(arr);
  }

  function updateSection(id, section, data){
    const cong=getCong(id);
    if(!cong) return;
    cong[section]={...cong[section],...data};
    saveCong(cong);
  }

  function listCultos(congId){
    try{
      const all=JSON.parse(localStorage.getItem(KEYS.cultos)||"[]");
      return congId ? all.filter(c=>c.congId===congId) : all;
    }catch{ return []; }
  }
  function saveCultos(arr){ localStorage.setItem(KEYS.cultos, JSON.stringify(arr)); }
  function addCulto(culto){ const arr=listCultos(); arr.push(culto); saveCultos(arr); }

  /* ── Objeto vazio padrão ─────────────────────────────── */

  function emptyCong(id){
    return {
      id,
      identificacao:{
        nome:"Nova Congregação", localizacao:"", endereco:"",
        data_inicio:"", status:"ativa", cor:"#3AAA5C", icon:"⛪", obs:""
      },
      panorama_membresia:{
        membros_ativos:0, membros_cooperadores:0,
        criancas:0, jovens:0, adultos:0, idosos:0,
        batizados_ano:0, novos_membros_ano:0, desligados_ano:0, meta_membros:0
      },
      atividades_igreja:{
        cultos_por_semana:0, horarios:[], frequencia_media:0,
        escola_dominical:false, culto_jovens:false,
        culto_mulheres:false, culto_homens:false, culto_criancas:false,
        historico_cultos:[]
      },
      pequenos_grupos:{ total_grupos:0, grupos:[] },
      ministerios:{ lista:[] },
      lideranca:{ pastor_responsavel:"", lideres:[] },
      financeiro:{ receita_media_mensal:0, despesa_media_mensal:0, saldo_atual:0, historico:[] },
      desafios:{ lista:[] },
      planejamento:{ metas_ano:"", eventos:[], acoes:[] }
    };
  }

  function _empty10(id, nome, cor){
    const c=emptyCong(id);
    c.identificacao.nome=nome;
    c.identificacao.cor=cor;
    return c;
  }

  function seed(){
    if(listCongs().length>0) return;
    saveCongs([
      _empty10("ip-analia-franco",  "IP Anália Franco",       "#3AAA5C"),
      _empty10("ip-cangaiba",       "IP Cangaíba (Hispana)",  "#E67E22"),
      _empty10("ip-mueb-carrao",    "IP Mueb Carrão",         "#4A9CF5"),
      _empty10("ip-penha",          "IP Penha",               "#2ECC71"),
      _empty10("ip-penha-hispanos", "IP Penha (Hispanos)",    "#E74C3C"),
      _empty10("ip-jd-primavera",   "IP Jd Primavera",        "#9B59B6"),
      _empty10("ip-jd-piratininga", "IP Jd Piratininga",      "#1ABC9C"),
      _empty10("ip-jd-rosaria",     "IP Jd Rosária",          "#D4A843"),
      _empty10("ip-aprisco",        "IP Aprisco",             "#E84393"),
      _empty10("ip-vila-uniao",     "IP Vila União",          "#5D6D7E"),
    ]);
  }

  /* ── Supabase: helpers internos ──────────────────────── */

  function _sbAvailable(){
    return (
      typeof SUPABASE_URL !== "undefined" && !!SUPABASE_URL &&
      typeof SUPABASE_ANON_KEY !== "undefined" && !!SUPABASE_ANON_KEY
    );
  }

  function _sbBase(){
    return SUPABASE_URL.trim().replace(/\/$/,"");
  }

  function _sbHdrs(extra){
    return Object.assign({
      "apikey":        SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type":  "application/json"
    }, extra||{});
  }

  /* ── Mapeamento JS ↔ linha Supabase ──────────────────── */

  function _congToRow(cong){
    const i=cong.identificacao,   m=cong.panorama_membresia;
    const a=cong.atividades_igreja, pg=cong.pequenos_grupos;
    const min=cong.ministerios,   lid=cong.lideranca;
    const f=cong.financeiro,      d=cong.desafios, p=cong.planejamento;
    return {
      id:                   cong.id,
      nome:                 i.nome||"",
      localizacao:          i.localizacao||"",
      endereco:             i.endereco||"",
      data_inicio:          i.data_inicio||null,
      status:               i.status||"ativa",
      cor:                  i.cor||"#3AAA5C",
      icon:                 i.icon||"⛪",
      obs:                  i.obs||"",
      membros_ativos:       m.membros_ativos||0,
      membros_cooperadores: m.membros_cooperadores||0,
      criancas:             m.criancas||0,
      jovens:               m.jovens||0,
      adultos:              m.adultos||0,
      idosos:               m.idosos||0,
      batizados_ano:        m.batizados_ano||0,
      novos_membros_ano:    m.novos_membros_ano||0,
      desligados_ano:       m.desligados_ano||0,
      meta_membros:         m.meta_membros||0,
      cultos_por_semana:    a.cultos_por_semana||0,
      frequencia_media:     a.frequencia_media||0,
      horarios:             a.horarios||[],
      escola_dominical:     !!a.escola_dominical,
      culto_jovens:         !!a.culto_jovens,
      culto_mulheres:       !!a.culto_mulheres,
      culto_homens:         !!a.culto_homens,
      culto_criancas:       !!a.culto_criancas,
      total_grupos:         pg.total_grupos||0,
      grupos:               pg.grupos||[],
      ministerios:          min.lista||[],
      pastor_responsavel:   lid.pastor_responsavel||"",
      lideres:              lid.lideres||[],
      receita_media_mensal: f.receita_media_mensal||0,
      despesa_media_mensal: f.despesa_media_mensal||0,
      saldo_atual:          f.saldo_atual||0,
      financeiro_historico: f.historico||[],
      desafios:             d.lista||[],
      metas_ano:            p.metas_ano||"",
      eventos:              p.eventos||[],
      acoes:                p.acoes||[],
      atualizado_em:        new Date().toISOString()
    };
  }

  function _rowToCong(row, cultos){
    const hist = (cultos||[]).map(c=>({
      data:         c.data,
      tipo:         c.tipo||"",
      pregador:     c.pregador||"",
      tema:         c.tema||"",
      participantes:c.participantes||0,
      visitantes:   c.visitantes||0,
      decisoes:     c.decisoes||0,
      obs:          c.obs||"",
      _sbId:        c.id
    }));
    return {
      id: row.id,
      identificacao:{
        nome:        row.nome||"",
        localizacao: row.localizacao||"",
        endereco:    row.endereco||"",
        data_inicio: row.data_inicio||"",
        status:      row.status||"ativa",
        cor:         row.cor||"#3AAA5C",
        icon:        row.icon||"⛪",
        obs:         row.obs||""
      },
      panorama_membresia:{
        membros_ativos:       row.membros_ativos||0,
        membros_cooperadores: row.membros_cooperadores||0,
        criancas:             row.criancas||0,
        jovens:               row.jovens||0,
        adultos:              row.adultos||0,
        idosos:               row.idosos||0,
        batizados_ano:        row.batizados_ano||0,
        novos_membros_ano:    row.novos_membros_ano||0,
        desligados_ano:       row.desligados_ano||0,
        meta_membros:         row.meta_membros||0
      },
      atividades_igreja:{
        cultos_por_semana: row.cultos_por_semana||0,
        horarios:          row.horarios||[],
        frequencia_media:  row.frequencia_media||0,
        escola_dominical:  !!row.escola_dominical,
        culto_jovens:      !!row.culto_jovens,
        culto_mulheres:    !!row.culto_mulheres,
        culto_homens:      !!row.culto_homens,
        culto_criancas:    !!row.culto_criancas,
        historico_cultos:  hist
      },
      pequenos_grupos:{ total_grupos:row.total_grupos||0, grupos:row.grupos||[] },
      ministerios:    { lista:row.ministerios||[] },
      lideranca:      { pastor_responsavel:row.pastor_responsavel||"", lideres:row.lideres||[] },
      financeiro:{
        receita_media_mensal: row.receita_media_mensal||0,
        despesa_media_mensal: row.despesa_media_mensal||0,
        saldo_atual:          row.saldo_atual||0,
        historico:            row.financeiro_historico||[]
      },
      desafios:    { lista:row.desafios||[] },
      planejamento:{ metas_ano:row.metas_ano||"", eventos:row.eventos||[], acoes:row.acoes||[] }
    };
  }

  /* ── Supabase: operações públicas ────────────────────── */

  /**
   * Upsert de uma congregação no Supabase.
   * Usa POST com Prefer: resolution=merge-duplicates (upsert nativo).
   */
  async function saveToSupabase(cong){
    if(!_sbAvailable()) return;
    const row = _congToRow(cong);
    const res = await fetch(`${_sbBase()}/rest/v1/congregacoes`, {
      method:  "POST",
      headers: _sbHdrs({ "Prefer": "resolution=merge-duplicates,return=minimal" }),
      body:    JSON.stringify(row)
    });
    if(!res.ok){
      const err = await res.text();
      throw new Error(err || `HTTP ${res.status}`);
    }
  }

  /**
   * Registra um culto na tabela congregacao_cultos.
   */
  async function addCultoSupabase(congId, culto){
    if(!_sbAvailable()) return;
    const row = {
      cong_id:      congId,
      data:         culto.data,
      tipo:         culto.tipo||"",
      pregador:     culto.pregador||"",
      tema:         culto.tema||"",
      participantes:culto.participantes||0,
      visitantes:   culto.visitantes||0,
      decisoes:     culto.decisoes||0,
      obs:          culto.obs||""
    };
    const res = await fetch(`${_sbBase()}/rest/v1/congregacao_cultos`, {
      method:  "POST",
      headers: _sbHdrs({ "Prefer": "return=minimal" }),
      body:    JSON.stringify(row)
    });
    if(!res.ok){
      const err = await res.text();
      throw new Error(err || `HTTP ${res.status}`);
    }
  }

  /**
   * Carrega todas as congregações do Supabase e salva no localStorage.
   * Se o Supabase estiver vazio, envia o seed local para lá.
   * Retorna true se sincronizou com sucesso.
   */
  async function syncFromSupabase(){
    if(!_sbAvailable()) return false;

    // 1. Busca congregações
    const cRes = await fetch(
      `${_sbBase()}/rest/v1/congregacoes?select=*&order=nome.asc`,
      { method:"GET", headers:_sbHdrs() }
    );
    if(!cRes.ok) throw new Error(`Congregações: HTTP ${cRes.status}`);
    const rows = await cRes.json();

    if(!Array.isArray(rows) || rows.length === 0){
      // Supabase vazio → envia seed local
      const localCongs = listCongs();
      if(localCongs.length > 0){
        for(const cong of localCongs){
          try{ await saveToSupabase(cong); }
          catch(e){ console.warn("CONG seed upload:", e.message); }
        }
      }
      return true;
    }

    // 2. Busca cultos
    const cuRes = await fetch(
      `${_sbBase()}/rest/v1/congregacao_cultos?select=*&order=data.desc`,
      { method:"GET", headers:_sbHdrs() }
    );
    const cultos = cuRes.ok ? await cuRes.json() : [];

    // Agrupa cultos por congregação
    const cultosByCong = {};
    (Array.isArray(cultos)?cultos:[]).forEach(cu=>{
      if(!cultosByCong[cu.cong_id]) cultosByCong[cu.cong_id]=[];
      cultosByCong[cu.cong_id].push(cu);
    });

    // 3. Converte e salva no localStorage
    const congs = rows.map(row => _rowToCong(row, cultosByCong[row.id]||[]));
    saveCongs(congs);
    return true;
  }

  return {
    KEYS,
    listCongs, saveCongs, getCong, saveCong, updateSection,
    listCultos, saveCultos, addCulto,
    emptyCong, seed,
    // Supabase
    saveToSupabase, addCultoSupabase, syncFromSupabase
  };
})();
