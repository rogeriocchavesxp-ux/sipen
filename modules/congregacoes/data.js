/* ═══════════════════════════════════════════════════════
   SIPEN — Congregações: Camada de Dados
   congregacoes-data.js · v4.0
   localStorage (cache) + Supabase (fonte de verdade)

   Tabelas necessárias no Supabase:
     - congregacoes
     - congregacao_cultos
═══════════════════════════════════════════════════════ */

// Força re-seed quando a versão do catálogo muda
(function(){
  const VER_KEY="sipen_cong_catalog_ver", VER="2026-05-06-v11";
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
      lideranca_estruturada:{
        supervisao:"", conselheiro:"", coordenacao:"", tesoureiro:"",
        equipe:[], mesa_administrativa:[], professores_ebd:[],
        ministerios_auxiliares:[]
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
      planejamento:{ metas_ano:"", eventos:[], acoes:[] },
      departamentos:{ lista:[] }
    };
  }

  /* ── Helper para criar congregação com liderança ──────── */

  function _mkCong(id, nome, cor, icon, le){
    const c = emptyCong(id);
    c.identificacao.nome   = nome;
    c.identificacao.cor    = cor;
    c.identificacao.icon   = icon;
    c.identificacao.status = "ativa";
    c.lideranca_estruturada = {
      supervisao:             le.supervisao             || "",
      conselheiro:            le.conselheiro            || "",
      coordenacao:            le.coordenacao            || "",
      tesoureiro:             le.tesoureiro             || "",
      equipe:                 le.equipe                 || [],
      mesa_administrativa:    le.mesa_administrativa    || [],
      professores_ebd:        le.professores_ebd        || [],
      ministerios_auxiliares: le.ministerios_auxiliares || []
    };
    c.lideranca.pastor_responsavel = le.supervisao || le.conselheiro || "";
    return c;
  }

  /* ── Seed com 8 congregações reais da IPPenha ─────────── */

  function seed(){
    if(listCongs().length > 0) return;
    saveCongs([

      _mkCong("ip-vila-uniao", "IP Vila União", "#5D6D7E", "⛪", {
        supervisao:  "Pr. Paulo Erben",
        coordenacao: "Presb. Percílio",
        equipe:      ["Joseneide"]
      }),

      _mkCong("ip-hispana-cangaiba", "IP Hispana (Cangaíba)", "#E67E22", "⛪", {
        supervisao:  "Rev. Jairo Isaque e Miss. Kênia",
        conselheiro: "Presb. Percílio",
        equipe:      ["Miss. Elinalda", "Diác. José Bohorques", "Floraci Bohorques"]
      }),

      _mkCong("ip-jd-primavera", "IP Jardim Primavera", "#9B59B6", "⛪", {
        supervisao:  "Rev. Adriano Pedrosa e Luciana Pedrosa",
        conselheiro: "Presb. Marcus Novais"
      }),

      _mkCong("ip-mueb-carrao", "IP Mueb (Carrão)", "#4A9CF5", "⛪", {
        supervisao:          "Rev. Filipe Checon",
        conselheiro:         "Presb. Edson Vieira",
        tesoureiro:          "Luiz Júnior",
        mesa_administrativa: [
          "Alexandre Trevisan",
          "Edson Vieira (Presb.)",
          "Joel Ferreira (Presb.)",
          "Luiz Júnior",
          "Marcos Pereira",
          "Washington Palmieri"
        ]
      }),

      _mkCong("ip-jd-piratininga", "IP Jardim Piratininga", "#1ABC9C", "⛪", {
        supervisao:  "Rev. Rogério Castro e Daniela França",
        conselheiro: "Presb. Laercio Lima",
        coordenacao: "Sem. Guilherme Athu",
        tesoureiro:  "Eder Fonseca",
        equipe: [
          "Bárbara Gomes", "Cláudia", "David Franco",
          "Deniel de Castro Flor", "Edson", "João Sobrinho", "Patrícia"
        ]
      }),

      _mkCong("ip-analia-franco", "IP Anália Franco", "#3AAA5C", "⛪", {
        supervisao:          "Rev. Michael Fassheber",
        tesoureiro:          "Rodrigo Cunha Nascimento",
        mesa_administrativa: [
          "André Colette",
          "Pb Alberto Noguti",
          "Eli Coelho",
          "Rafael Cavalcante",
          "Sergio"
        ]
      }),

      _mkCong("ip-aprisco", "IP Aprisco", "#E84393", "⛪", {
        conselheiro:         "Pr. Rogério Castro",
        tesoureiro:          "Ismael Gomes de Oliveira",
        mesa_administrativa: [
          "Cesar Augusto",
          "Edson Carvalho",
          "Eliton Ribeiro",
          "Ismael Gomes de Oliveira",
          "Laércio Xavier",
          "Lucas Johann Cruvinel Carvalho (Sem.)"
        ],
        professores_ebd: [
          "Claudia Carvalho",
          "Eliton Ribeiro",
          "Ismael Oliveira",
          "Lucas Johann Cruvinel Carvalho (Sem.)",
          "Raquel de Albuquerque",
          "Suelem Ribeiro"
        ],
        ministerios_auxiliares: [
          {
            nome: "UMP — Aprisco",
            membros: [
              { cargo:"Presidente", nome:"Cesar Augusto" },
              { cargo:"Vice",       nome:"Maurício" }
            ]
          }
        ]
      }),

      _mkCong("ip-vila-rosaria", "IP Vila Rosária", "#D4A843", "⛪", {
        supervisao:          "Rev. Ricardo Riul",
        conselheiro:         "Presb. Éder Gões",
        tesoureiro:          "Rubem",
        mesa_administrativa: ["Em organização"]
      })

    ]);
  }

  /* ── Supabase: helpers internos ──────────────────────── */

  function _sbAvailable(){
    return (
      typeof SUPABASE_URL !== "undefined" && !!SUPABASE_URL &&
      typeof SUPABASE_ANON_KEY !== "undefined" && !!SUPABASE_ANON_KEY
    );
  }
  function _sbBase(){ return SUPABASE_URL.trim().replace(/\/$/,""); }
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
    const le=cong.lideranca_estruturada || {};
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
      // lideres JSONB armazena a estrutura institucional completa
      lideres:              le,
      receita_media_mensal: f.receita_media_mensal||0,
      despesa_media_mensal: f.despesa_media_mensal||0,
      saldo_atual:          f.saldo_atual||0,
      financeiro_historico: f.historico||[],
      desafios:             d.lista||[],
      metas_ano:            p.metas_ano||"",
      eventos:              p.eventos||[],
      acoes:                p.acoes||[],
      departamentos:        (cong.departamentos?.lista)||[],
      atualizado_em:        new Date().toISOString()
    };
  }

  function _emptyLE(){
    return {
      supervisao:"", conselheiro:"", coordenacao:"", tesoureiro:"",
      equipe:[], mesa_administrativa:[], professores_ebd:[], ministerios_auxiliares:[]
    };
  }

  function _rowToCong(row, cultos){
    const hist = (cultos||[]).map(c=>({
      data:          c.data,
      tipo:          c.tipo||"",
      pregador:      c.pregador||"",
      tema:          c.tema||"",
      participantes: c.participantes||0,
      visitantes:    c.visitantes||0,
      decisoes:      c.decisoes||0,
      obs:           c.obs||"",
      _sbId:         c.id
    }));
    // Detecta formato: lideres pode ser objeto (novo) ou array (legado)
    const leRaw = row.lideres;
    const le = (leRaw && !Array.isArray(leRaw) && typeof leRaw === "object")
      ? { ..._emptyLE(), ...leRaw }
      : _emptyLE();
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
      lideranca_estruturada: le,
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
      lideranca:      { pastor_responsavel:row.pastor_responsavel||"", lideres:[] },
      financeiro:{
        receita_media_mensal: row.receita_media_mensal||0,
        despesa_media_mensal: row.despesa_media_mensal||0,
        saldo_atual:          row.saldo_atual||0,
        historico:            row.financeiro_historico||[]
      },
      desafios:     { lista:row.desafios||[] },
      planejamento: { metas_ano:row.metas_ano||"", eventos:row.eventos||[], acoes:row.acoes||[] },
      departamentos:{ lista:row.departamentos||[] }
    };
  }

  /* ── Supabase: operações públicas ────────────────────── */

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

  async function addCultoSupabase(congId, culto){
    if(!_sbAvailable()) return;
    const row = {
      cong_id:       congId,
      data:          culto.data,
      tipo:          culto.tipo||"",
      pregador:      culto.pregador||"",
      tema:          culto.tema||"",
      participantes: culto.participantes||0,
      visitantes:    culto.visitantes||0,
      decisoes:      culto.decisoes||0,
      obs:           culto.obs||""
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

  async function syncFromSupabase(){
    if(!_sbAvailable()) return false;

    const cRes = await fetch(
      `${_sbBase()}/rest/v1/congregacoes?deleted_at=is.null&select=*&order=nome.asc`,
      { method:"GET", headers:_sbHdrs() }
    );
    if(!cRes.ok) return false; // sem permissão ou tabela inexistente — não loga
    const rows = await cRes.json();

    if(!Array.isArray(rows) || rows.length === 0){
      const localCongs = listCongs();
      if(localCongs.length > 0){
        for(const cong of localCongs){
          try{ await saveToSupabase(cong); }
          catch(e){ console.warn("CONG seed upload:", e.message); }
        }
      }
      return true;
    }

    const cuRes = await fetch(
      `${_sbBase()}/rest/v1/congregacao_cultos?select=*&order=data.desc`,
      { method:"GET", headers:_sbHdrs() }
    );
    const cultos = cuRes.ok ? await cuRes.json() : [];

    const cultosByCong = {};
    (Array.isArray(cultos)?cultos:[]).forEach(cu=>{
      if(!cultosByCong[cu.cong_id]) cultosByCong[cu.cong_id]=[];
      cultosByCong[cu.cong_id].push(cu);
    });

    const congs = rows.map(row => _rowToCong(row, cultosByCong[row.id]||[]));
    saveCongs(congs);
    return true;
  }

  return {
    KEYS,
    listCongs, saveCongs, getCong, saveCong, updateSection,
    listCultos, saveCultos, addCulto,
    emptyCong, seed,
    saveToSupabase, addCultoSupabase, syncFromSupabase
  };
})();
