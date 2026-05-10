/* ═══════════════════════════════════════════════════════
   SIPEN — WhatsApp / Evolution API
   whatsapp.js · v1.0

   Serviço central de comunicação via WhatsApp.
   Todos os módulos chamam WA.send() — nunca a Evolution API diretamente.
   A apikey fica exclusivamente no Supabase Secret (EVOLUTION_API_KEY).
═══════════════════════════════════════════════════════ */

const WA = (function(){

  /* ── Helpers internos ──────────────────────────────── */

  function _jwt(){
    // Reutiliza o token da sessão Supabase ativa
    try{
      const key = Object.keys(localStorage).find(k => k.includes("supabase.auth.token") || k.includes("sb-"));
      if(!key) return null;
      const s = JSON.parse(localStorage.getItem(key) || "{}");
      return s?.access_token || s?.currentSession?.access_token || null;
    }catch{ return null; }
  }

  function _fnUrl(fn){
    if(typeof SUPABASE_URL === "undefined" || !SUPABASE_URL) return null;
    return SUPABASE_URL.trim().replace(/\/$/,"") + "/functions/v1/" + fn;
  }

  // Converte número para E.164 sem +: 5511999999999
  function _normalizar(tel){
    const d = (tel||"").replace(/\D/g,"");
    if(!d || d.length < 8) return null;
    return d.startsWith("55") ? d : "55" + d;
  }

  // Substitui {{variavel}} no template
  function renderTemplate(corpo, vars){
    return (corpo||"").replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
  }

  /* ── Envio de mensagem ─────────────────────────────── */

  /**
   * Envia mensagem via Edge Function (nunca acessa a Evolution API diretamente).
   *
   * @param {object} opts
   * @param {string}  opts.para           - Número do destinatário
   * @param {string}  opts.nome           - Nome do destinatário (para exibição)
   * @param {string}  opts.mensagem       - Texto a enviar
   * @param {string}  opts.modulo         - Módulo de origem (ex: 'AGENDA')
   * @param {string}  [opts.referenciaT]  - Tipo do registro (ex: 'evento')
   * @param {string}  [opts.referenciaId] - UUID do registro
   * @param {string}  [opts.chave]        - Chave de idempotência (evita duplo envio)
   * @returns {Promise<{ok:boolean, status:string, id?:string, error?:string}>}
   */
  async function send({ para, nome, mensagem, modulo, referenciaT, referenciaId, chave }){
    const numero = _normalizar(para);
    if(!numero){
      console.warn("[WA] número inválido:", para);
      return { ok:false, status:"numero_invalido" };
    }

    const jwt = _jwt();
    if(!jwt){
      console.warn("[WA] usuário não autenticado");
      return { ok:false, status:"nao_autenticado" };
    }

    const url = _fnUrl("whatsapp-send");
    if(!url){
      console.warn("[WA] SUPABASE_URL não definida");
      return { ok:false, status:"nao_configurado" };
    }

    // Chave de idempotência: módulo + referência + timestamp arredondado (janela de 60s)
    const idempotencyKey = chave
      || `${modulo}_${referenciaId||numero}_${Math.floor(Date.now()/60000)}`;

    try{
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          para_numero:     numero,
          para_nome:       nome || "",
          mensagem,
          modulo,
          referencia_tipo: referenciaT  || null,
          referencia_id:   referenciaId || null,
          idempotency_key: idempotencyKey,
        }),
      });

      const data = await res.json();
      if(!res.ok && !data.status){
        console.error("[WA] edge function:", data);
        return { ok:false, status:"erro", error: data.error };
      }
      return data;
    }catch(e){
      console.error("[WA] rede:", e.message);
      return { ok:false, status:"erro_rede", error: e.message };
    }
  }

  /* ── Status da instância ───────────────────────────── */

  async function status(){
    const jwt = _jwt();
    if(!jwt) return { conectado:false, estado:"nao_autenticado" };

    const url = _fnUrl("whatsapp-status");
    if(!url) return { conectado:false, estado:"nao_configurado" };

    try{
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${jwt}` }
      });
      return await res.json();
    }catch(e){
      return { conectado:false, estado:"erro_rede", error:e.message };
    }
  }

  /* ── Histórico de mensagens (query direta ao Supabase) */

  async function historico({ modulo, limite=50 } = {}){
    if(typeof SUPABASE_URL==="undefined") return [];
    const base = SUPABASE_URL.trim().replace(/\/$/,"");
    const jwt  = _jwt();
    if(!jwt) return [];

    let url = `${base}/rest/v1/whatsapp_mensagens?select=*&order=criado_em.desc&limit=${limite}`;
    if(modulo) url += `&modulo=eq.${encodeURIComponent(modulo)}`;

    try{
      const res = await fetch(url, {
        headers: {
          "apikey":        SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${jwt}`,
        }
      });
      return res.ok ? await res.json() : [];
    }catch{ return []; }
  }

  /* ── Templates (query direta ao Supabase) ─────────── */

  async function buscarTemplate(chave){
    if(typeof SUPABASE_URL==="undefined") return null;
    const base = SUPABASE_URL.trim().replace(/\/$/,"");
    const jwt  = _jwt();
    if(!jwt) return null;

    try{
      const res = await fetch(
        `${base}/rest/v1/whatsapp_templates?chave=eq.${encodeURIComponent(chave)}&ativo=eq.true&limit=1`,
        { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${jwt}` } }
      );
      const rows = res.ok ? await res.json() : [];
      return rows[0] || null;
    }catch{ return null; }
  }

  /* ── API pública ───────────────────────────────────── */

  return { send, status, historico, buscarTemplate, renderTemplate };
})();

window.WA = WA;
