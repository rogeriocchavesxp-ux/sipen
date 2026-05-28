const MC={geral:"var(--gmd)",admin:"var(--gold)",fin:"var(--gr)",jur:"var(--blue)",conselho:"var(--sky)",proj:"var(--sky)",pastoral:"var(--teal)",min:"var(--violet)",agenda:"var(--teal)",pgs:"var(--gbr)",infra:"var(--amber)",dem:"var(--rose)",rel:"var(--gmd)",memb:"var(--gbr)",cong:"var(--gr)",diac:"var(--copper)",area:"var(--gr)",config:"var(--violet)",com:"var(--violet)",eve:"var(--sky)",acesso:"var(--sky)"};
const CRUMB={
  geral:["","Dashboard Geral","/ IPPenha · visão executiva consolidada"],
  "admin-dash":["Administrativo","Dashboard","/ visão do módulo"],
  "admin-sec":["Administrativo","Secretaria e Cadastro",""],
  "fin-dash":["Financeiro","Dashboard","/ visão consolidada"],
  "fin-lancamentos":["Financeiro","Lançamentos","/ receitas e despesas"],
  "fin-fluxo":["Financeiro","Fluxo de Caixa","/ entradas e saídas por período"],
  "fin-pagar":["Financeiro","Contas a Pagar","/ obrigações financeiras"],
  "fin-receber":["Financeiro","Contas a Receber","/ receitas pendentes"],
  "fin-categorias":["Financeiro","Categorias Financeiras","/ classificação de lançamentos"],
  "fin-relatorios":["Financeiro","Relatórios Financeiros","/ consolidados por período"],
  "fin-auditoria":["Financeiro","Auditoria Financeira","/ histórico de ações"],
  "cnab-remessas":["Financeiro","CNAB 240","/ remessas e retornos bancários"],
  "cnab-detalhe":["Financeiro","CNAB 240","/ detalhe da remessa"],
  "fin-demandas":["Financeiro","Demandas Financeiras","/ solicitações do módulo"],
  "admin-con":["Administrativo","Contratos",""],
  "admin-rh":["Administrativo","RH",""],
  "jur-dash":["Jurídico","Dashboard","/ contratos, pareceres e riscos"],
  "jur-demandas":["Jurídico","Processos e Demandas Jurídicas",""],
  "jur-contratos":["Jurídico","Contratos e Instrumentos",""],
  "jur-pareceres":["Jurídico","Pareceres",""],
  "jur-documentos":["Jurídico","Documentos Jurídicos",""],
  "jur-riscos":["Jurídico","Riscos e Pendências",""],
  "jur-historico":["Jurídico","Histórico e Auditoria Jurídica",""],
  "admin-aud":["Administrativo","Auditoria",""],
  "admin-doc":["Administrativo","Documentos",""],
  "admin-est":["Administrativo","Controle de Estoque","/ operacional e auditável"],
  "admin-parking-controls":["Administrativo","Controles do Estacionamento","/ controle de acesso"],
  "admin-facial":           ["Administrativo","Acesso Facial","/ controle administrativo de acesso"],
  "pext-lista":             ["Administrativo","Participantes Externos","/ pessoas sem membresia"],
  "admin-pessoas":          ["Administrativo","Cadastro de Pessoas","/ registro geral"],
  "conselho-dash":["Conselho e Governança","Dashboard",""],
  "conselho-nomeados":["Conselho e Governança","Nomeados","/ funções temporárias"],
  "conselho-ordenados":["Conselho e Governança","Ordenados","/ ofícios permanentes"],
  "conselho-hist":["Conselho e Governança","Histórico de Atas e Deliberações",""],
  "conselho-seminaristas":["Conselho e Governança","Seminaristas","/ formação teológica e estágio"],
  "proj-lista":["Projetos","Projetos & Acompanhamento","/ portfólio institucional"],
  "proj-detalhe":["Projetos","Detalhe do Projeto","/ etapas e progresso"],
  "proj-form":["Projetos","Cadastro de Projeto","/ criação e edição"],
  "diac-dash":["Junta Diaconal","Dashboard Diaconal","/ visão geral do serviço"],
  "diac-diaconos":["Junta Diaconal","Diáconos","/ cadastro e atuação"],
  "diac-escalas":["Junta Diaconal","Escalas de Serviço","/ cultos e atividades"],
  "diac-familias":["Junta Diaconal","Famílias Assistidas","/ acompanhamento diaconal"],
  "diac-social":["Junta Diaconal","Ação Social e Beneficência","/ doações e auxílios"],
  "diac-visitacao":["Junta Diaconal","Visitação Diaconal","/ visitas domiciliares"],
  "diac-patrimonio":["Junta Diaconal","Patrimônio e Apoio Operacional",""],
  "diac-solicitacoes":["Junta Diaconal","Solicitações Diaconais","/ triagem e atendimento"],
  "diac-relatorios":["Junta Diaconal","Relatórios Diaconais","/ indicadores e exportações"],
  "diac-historico":["Junta Diaconal","Histórico e Atas","/ reuniões e deliberações"],
  "pgs-dash":["Pequenos Grupos","Dashboard","/ discipulado e acompanhamento"],
  "pgs-lista":["Pequenos Grupos","Lista de PGs",""],
  "pgs-encontros":["Pequenos Grupos","Encontros",""],
  "pgs-participantes":["Pequenos Grupos","Participantes",""],
  "pgs-visitantes":["Pequenos Grupos","Visitantes",""],
  "pgs-estudos":["Pequenos Grupos","Estudos",""],
  "pgs-relatorios":["Pequenos Grupos","Relatórios",""],
  "pgs-oracao":["Pequenos Grupos","Pedidos de Oração",""],
  "pgs-historico":["Pequenos Grupos","Histórico",""],
  "pastoral-dash":["Pastoral","Dashboard","/ escala e disponibilidade"],
  "pastoral-preg":["Pastoral","Escala de Pregação","/ programação mensal"],
  "pastoral-disp":["Pastoral","Disponibilidade Pregação","/ gestão de disponibilidades"],
  "pastoral-pastores":["Pastoral","Cadastro de Pastores","/ corpo pastoral ativo"],
  "pastoral-historico":["Pastoral","Histórico de Pregações","/ registro histórico"],
  "pastoral-relatorios":["Pastoral","Relatórios Pastorais","/ distribuição e análise"],
  "pastoral-ate":["Pastoral","Atendimentos",""],
  "pastoral-ora":["Pastoral","Pedidos de Oração",""],
  "pastoral-aco":["Pastoral","Acompanhamentos",""],
  "pastoral-reg":["Pastoral","Registros Pastorais",""],
  "pastoral-pri":["Pastoral","Casos Prioritários",""],
  "min-dash":["Departamentos","Dashboard","/ visão geral dos departamentos"],
  "min-min":["Departamentos","Ministérios","/ grupos ministeriais"],
  "min-soc":["Departamentos","Sociedades Internas","/ UPH, SAF, UMP, UPA, UCP"],
  "min-adm":["Departamentos","Administração","/ departamentos administrativos"],
  "min-esc":["Departamentos","Escalas",""],
  "min-prog":["Departamentos","Programações",""],
  "min-vol":["Departamentos","Voluntários",""],
  "min-lit":["Departamentos","Liturgia dos Cultos",""],
  "agenda-dash":["Agenda","Dashboard","/ solicitações, aceite e estatísticas"],
  "agenda-calendario":["Agenda","Calendário Geral",""],
  "agenda-solicitacoes":["Agenda","Solicitações de Agendamento",""],
  "agenda-aprovacoes":["Agenda","Aprovações Pendentes",""],
  "agenda-confirmados":["Agenda","Eventos Confirmados",""],
  "agenda-recusados":["Agenda","Eventos Recusados",""],
  "agenda-reagendamentos":["Agenda","Reagendamentos e Ajustes",""],
  "agenda-ambientes":["Agenda","Ambientes e Recursos",""],
  "agenda-conflitos":["Agenda","Conflitos de Agenda",""],
  "agenda-historico":["Agenda","Histórico de Agendamentos",""],
  "agenda-config":["Agenda","Configurações da Agenda",""],
  "infra-dash":["Infraestrutura e Conservação","Dashboard",""],
  "infra-man":["Infraestrutura e Conservação","Manutenção",""],
  "infra-lim":["Infraestrutura e Conservação","Limpeza",""],
  "dem-dash":["Demandas","Dashboard","/ visão geral e métricas"],
  "dem-todas":["Demandas","Todas as Solicitações","/ lista completa"],
  "admin-demandas":         ["Administrativo","Demandas Administrativas","/ painel"],
  "pautas-reunioes":        ["Conselho e Governança","Reuniões do Conselho","/ pautas"],
  "pautas-lista":           ["Conselho e Governança","Reuniões do Conselho","/ itens da reunião"],
  "pautas-imprimir":        ["Conselho e Governança","Reuniões do Conselho","/ pauta oficial"],
  "atas-dash":              ["Conselho e Governança","Reuniões do Conselho","/ atas — dashboard"],
  "atas-todas":             ["Conselho e Governança","Reuniões do Conselho","/ todas as atas"],
  "atas-nova":              ["Conselho e Governança","Reuniões do Conselho","/ nova ata"],
  "atas-delib":             ["Conselho e Governança","Reuniões do Conselho","/ deliberações"],
  "conselho-demandas":      ["Conselho e Governança","Demandas do Conselho","/ todas"],
  "conselho-demandas-cons": ["Conselho e Governança","Demandas do Conselho","/ filtradas"],
  "infra-demandas":         ["Infraestrutura e Conservação","Demandas de Infraestrutura","/ todas"],
  "infra-demandas-infra":   ["Infraestrutura e Conservação","Demandas de Infraestrutura","/ filtradas"],
  "jur-demandas-tab":       ["Jurídico","Demandas Jurídicas","/ todas"],
  "jur-demandas-jur":       ["Jurídico","Demandas Jurídicas","/ filtradas"],
  "pastoral-demandas":      ["Pastoral","Demandas Pastorais","/ todas"],
  "pastoral-demandas-pas":  ["Pastoral","Demandas Pastorais","/ filtradas"],
  "dem-analise":["Demandas","Em Análise","/ triagem e classificação"],
  "dem-and":["Demandas","Em Andamento","/ execução"],
  "dem-conc":["Demandas","Concluídas","/ finalizadas"],
  "dem-pri":["Demandas","Alta Prioridade","/ urgentes e críticas"],
  "dem-hist":["Demandas","Histórico","/ todos os registros"],
  "dem-detalhe":["Demandas","Detalhe da Solicitação",""],
  "rel-dash":["Relatórios","Dashboard Gerencial",""],
  "memb-dash":["Membresia","Dashboard",""],
  "memb-cad":["Membresia","Cadastro de Membros",""],
  "memb-bat":["Membresia","Batismos",""],
  "memb-vis":["Membresia","Visitantes",""],
  "area-dash": ["Área do Membro","Painel Pessoal","/ bem-vindo"],
  "area-agenda":["Área do Membro","Agenda","/ próximos compromissos"],
  "area-min":  ["Área do Membro","Meus Ministérios","/ serviço e escala"],
  "area-pgs":  ["Área do Membro","Meu PG","/ pequeno grupo"],
  "area-dem":  ["Área do Membro","Minhas Solicitações","/ pedidos e demandas"],
  "config-whatsapp": ["Configurações","WhatsApp — BotConversa","/ status, histórico e templates"],
  "wa-listas":       ["Sistema","Listas de Comunicação","/ WhatsApp"],
  "com-dash":          ["Comunicação","Dashboard","/ solicitações e KPIs"],
  "com-solicitacoes":  ["Comunicação","Solicitações de Arte","/ artes, campanhas e transmissões"],
  "com-detalhe":       ["Comunicação","Detalhe da Solicitação","/ visualização e edição"],
  "eve-dash":          ["Eventos","Dashboard","/ visão geral dos eventos"],
  "eve-todos":         ["Eventos","Todos os Eventos","/ lista completa"],
  "eve-detalhe":       ["Eventos","Detalhe do Evento","/ inscrições e pagamentos"],
  "eve-inscricoes":    ["Eventos","Inscrições","/ todas as inscrições"],
  "eve-pagamentos":    ["Eventos","Pagamentos","/ controle financeiro dos eventos"],
  "eve-credenciamento":["Eventos","Credenciamento","/ check-in dos participantes"],
  "eve-presenca":      ["Eventos","Lista de Presença","/ controle e impressão"],
  "eve-relatorios":    ["Eventos","Relatórios","/ indicadores por evento"],
  "eve-config":        ["Eventos","Configurações","/ integrações e preferências"],
  "acesso-relatorio":  ["Controle de Acesso","Relatório de Acessos","/ análise estatística — mai/2026"],
};
const SL={dash:"Dashboard",diaconos:"Diáconos",escalas:"Escalas de Serviço",familias:"Famílias Assistidas",social:"Ação Social e Beneficência",visitacao:"Visitação Diaconal",patrimonio:"Patrimônio e Apoio Operacional",solicitacoes:"Solicitações Diaconais",relatorios:"Relatórios Diaconais",historico:"Histórico e Atas",sec:"Secretaria e Cadastro",rh:"RH / Gestão de Pessoas",doc:"Documentos",aud:"Auditoria",fin:"Financeiro",con:"Contratos",est:"Controle de Estoque",demandas:"Processos e Demandas Jurídicas",contratos:"Contratos e Instrumentos",pareceres:"Pareceres",documentos:"Documentos Jurídicos",riscos:"Riscos e Pendências",historico:"Histórico",rel:"Relatórios Estratégicos",ind:"Indicadores",cong:"Congregações",nomeados:"Nomeados",ordenados:"Ordenados",ate:"Atendimentos",ora:"Pedidos de Oração",aco:"Acompanhamentos",reg:"Registros Pastorais",pri:"Casos Prioritários",min:"Ministérios",soc:"Sociedades Internas",adm:"Administração",com:"Comissões",lid:"Liderança Ministerial",esc:"Escalas",prog:"Programações",lit:"Liturgia dos Cultos",vol:"Voluntários",calendario:"Calendário Geral",solicitacoes:"Solicitações de Agendamento",aprovacoes:"Aprovações Pendentes",confirmados:"Eventos Confirmados",recusados:"Eventos Recusados",reagendamentos:"Reagendamentos e Ajustes",ambientes:"Ambientes e Recursos",conflitos:"Conflitos de Agenda",config:"Configurações da Agenda",lista:"Lista de PGs",encontros:"Encontros",participantes:"Participantes",visitantes:"Visitantes",estudos:"Estudos",relatorios:"Relatórios",oracao:"Pedidos de Oração",man:"Manutenção",lim:"Limpeza e Conservação",sol:"Solicitações Operacionais",pat:"Patrimônio",pre:"Prestadores",todas:"Todas as Solicitações",pend:"Pendentes",and:"Em Andamento",conc:"Concluídas",hist:"Histórico",mod:"Por Módulo",exp:"Exportações",uni:"Por Congregação",res:"Por Responsável",cad:"Cadastro de Membros",bat:"Batismos",prof:"Profissões de Fé",trans:"Transferências",vis:"Visitantes"};
const MN={admin:"Administrativo",fin:"Financeiro",jur:"Jurídico",conselho:"Conselho",proj:"Projetos",pastoral:"Pastoral",min:"Departamentos",agenda:"Agenda",pgs:"Pequenos Grupos",infra:"Infraestrutura e Conservação",dem:"Demandas",rel:"Relatórios",memb:"Membresia",cong:"Congregações",diac:"Junta Diaconal",area:"Área do Membro",com:"Comunicação",eve:"Eventos",acesso:"Controle de Acesso"};

const _viewCache = {};
const _VIEW_MAP = {
  "geral":       "modules/dashboard/view.html",
  "admin":       "modules/admin/view.html?v=6.31.7",
  "pext":        "modules/admin/view.html?v=6.31.7",
  "fin":         "modules/financeiro/view.html?v=6.31.7",
  "cnab":        "modules/financeiro/view.html?v=6.31.7",
  "jur":         "modules/juridico/view.html?v=6.31.7",
  "conselho":    "modules/conselho/view.html?v=6.31.7",
  "atas":        "modules/conselho/view.html?v=6.31.7",
  "pautas":      "modules/conselho/view.html?v=6.31.7",
  "pastoral":    "modules/pastoral/view.html?v=6.31.7",
  "min":         "modules/departamentos/view.html?v=6.31.7",
  "agenda":      "modules/agenda/view.html?v=6.31.7",
  "pgs":         "modules/pgs/view.html?v=6.31.7",
  "infra":       "modules/infraestrutura/view.html?v=6.31.7",
  "dem":         "modules/demandas/view.html?v=6.31.7",
  "rel":         "modules/relatorios/view.html?v=6.31.7",
  "memb":        "modules/membresia/view.html?v=6.31.7",
  "proj":        "modules/projetos/view.html",
  "diac":        "modules/diaconal/view.html?v=6.31.7",
  "cong":        "modules/congregacoes/view.html",
  "com":         "modules/comunicacao/view.html?v=6.31.7",
  "eve":         "modules/eventos/view.html?v=6.31.7",
  "area":        "modules/area-membro/view.html?v=6.31.7",
  "config":      "modules/config/view.html",
  "generic":     "modules/shared/view.html",
  "acesso":      "modules/acesso/view.html?v=6.31.7",
};

function _getViewFileForRoute(id) {
  const prefix = String(id || "").split("-")[0];
  return _VIEW_MAP[prefix] || null;
}

window.isKnownViewRoute = function(id) {
  return !!_getViewFileForRoute(id);
};

async function _ensureViewLoaded(id) {
  const viewFile = _getViewFileForRoute(id) || _VIEW_MAP["geral"];
  if (_viewCache[viewFile]) return _viewCache[viewFile];
  _viewCache[viewFile] = fetch(viewFile).then(r => {
    if (!r.ok) throw new Error(`Falha ao carregar view: ${viewFile}`);
    return r.text();
  }).then(html => {
    document.getElementById("page").insertAdjacentHTML("afterbegin", html);
  }).catch(err => {
    delete _viewCache[viewFile];
    throw err;
  });
  return _viewCache[viewFile];
}

async function go(id){
  await _ensureViewLoaded(id);
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("on"));
  const el=document.getElementById("v-"+id);
  if(el){el.classList.remove("on");void el.offsetWidth;el.classList.add("on");}
  else{
    await _ensureViewLoaded("generic");
    const p=id.split("-"),m=p[0],s=p.slice(1).join("-");
    document.getElementById("g-title").textContent=SL[s]||id;
    document.getElementById("g-sub").textContent=(MN[m]||m)+" — seção em implementação";
    const gv=document.getElementById("v-generic");
    gv.classList.remove("on");void gv.offsetWidth;gv.classList.add("on");
  }
  const c=CRUMB[id];
  const cr=document.getElementById("crumb");
  if(c){
    if(c[0])cr.innerHTML=`<span class="c-mod">${c[0]}</span><span class="c-sep">/</span><span class="c-pg">${c[1]}</span><span class="c-sub">${c[2]}</span>`;
    else cr.innerHTML=`<span class="c-pg">${c[1]}</span><span class="c-sub">${c[2]}</span>`;
  }else{
    const p=id.split("-"),m=p[0];
    cr.innerHTML=`<span class="c-mod">${MN[m]||m}</span><span class="c-sep">/</span><span class="c-pg">${SL[p.slice(1).join("-")]||id}</span>`;
  }
  const mod=id.split("-")[0];
  document.getElementById("band").style.setProperty("--mc",MC[mod]||"var(--gmd)");
  document.querySelectorAll(".l1").forEach(e=>e.classList.remove("on"));
  if(id==="geral")document.getElementById("l1-geral").classList.add("on");
  // Jurídico está dentro de Departamentos > Administração — garante que ms-min está aberto
  if(mod==="jur"){
    const minSub=document.getElementById("ms-min");
    const minHdr=document.querySelector("#mw-min .mhdr");
    if(minSub&&!minSub.classList.contains("open")){
      document.querySelectorAll(".msub").forEach(s=>s.classList.remove("open"));
      document.querySelectorAll(".mhdr").forEach(h=>h.classList.remove("open"));
      minSub.classList.add("open");
      if(minHdr)minHdr.classList.add("open");
    }
  }
  // config-* está dentro de Sistema — garante que ms-sys está aberto
  if(mod==="config"){
    const sysSub=document.getElementById("ms-sys");
    const sysHdr=document.querySelector("#mw-sys .mhdr");
    if(sysSub&&!sysSub.classList.contains("open")){
      document.querySelectorAll(".msub").forEach(s=>s.classList.remove("open"));
      document.querySelectorAll(".mhdr").forEach(h=>h.classList.remove("open"));
      sysSub.classList.add("open");
      if(sysHdr)sysHdr.classList.add("open");
    }
  }
  document.querySelectorAll(".si").forEach(e=>{
    e.classList.remove("on");
    const fn=e.getAttribute("onclick");
    if(fn&&fn.includes(`'${id}'`))e.classList.add("on");
  });
  document.querySelectorAll(".bni").forEach(e=>{
    e.classList.remove("on");
    const fn=e.getAttribute("onclick");
    if(fn&&fn.includes(`'${id}'`))e.classList.add("on");
  });
  document.getElementById("page").scrollTo({top:0,behavior:"smooth"});

  // Auto-load Supabase data for connected views
  if (SUPABASE_URL && VIEW_AUTOLOAD[id]) {
    const cfg = VIEW_AUTOLOAD[id];
    if (cfg && cfg.fn) cfg.fn();
    else if (cfg) listarModulo(cfg.tab, cfg.id, cfg.filtro || {});
  }

  // Persistir rota atual para restauração após F5 (sessionStorage = isolado por aba)
  try { sessionStorage.setItem("sipen_route", id); } catch(_) {}
  try { history.replaceState(null, "", location.pathname + location.search + "#" + id); } catch(_) {}
  document.dispatchEvent(new CustomEvent("sipen:navigate", { detail: { id } }));
}

function tog(mod,defaultRoute){
  const sub=document.getElementById("ms-"+mod);
  const hdr=document.querySelector("#mw-"+mod+" .mhdr");
  const isOpen=sub.classList.contains("open");
  document.querySelectorAll(".msub").forEach(s=>s.classList.remove("open"));
  document.querySelectorAll(".mhdr").forEach(h=>h.classList.remove("open"));
  if(!isOpen){sub.classList.add("open");hdr.classList.add("open");go(defaultRoute||mod+"-dash");}
}

  // Warning file:// protocol already handled in entrarNoSistema flow
