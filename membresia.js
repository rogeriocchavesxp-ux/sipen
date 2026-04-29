/* ══════════════════════════════════════════════════════════════
   MÓDULO MEMBRESIA — Cadastro de Membros v1.0
   SIPEN · IPPenha
   Insere em `pessoas` + `membros` (nunca em v_membros)
══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ── ESTADO ─────────────────────────────────────────── */
  let _congregacoes = [];   // cache de congregações para o select
  let _editandoId   = null; // null = novo cadastro; UUID = edição

  /* ── HELPERS ────────────────────────────────────────── */
  function sb()   { return getSupabase(); }
  function v(id)  { return document.getElementById(id); }
  function gv(id) { const el = v(id); return el ? el.value.trim() : ""; }
  function toast(t, s) { if (typeof T === "function") T(t, s); }

  function setErro(msg) {
    const el = v("mem-novo-erro");
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? "block" : "none";
  }

  function setBusy(busy) {
    const btn = v("mem-novo-salvar");
    if (!btn) return;
    btn.disabled  = busy;
    btn.textContent = busy ? "Salvando…" : "Salvar Membro";
  }

  function dateOrNull(val) {
    return val && val.trim() ? val.trim() : null;
  }

  /* ── CARREGAR CONGREGAÇÕES ──────────────────────────── */
  async function _carregarCongregacoes() {
    try {
      const { data, error } = await sb()
        .from("congregacoes")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      _congregacoes = data || [];
    } catch (e) {
      console.warn("[membresia] congregacoes:", e.message);
      _congregacoes = [];
    }

    const sel = v("mem-f-cong");
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione…</option>' +
      _congregacoes.map(c =>
        `<option value="${c.id}">${c.nome}</option>`
      ).join("");
  }

  /* ── ABRIR MODAL ────────────────────────────────────── */
  async function _abrirModal(membroId = null) {
    _editandoId = membroId;
    setErro("");
    setBusy(false);

    const modal = v("modal-novo-membro");
    if (!modal) { console.error("[membresia] modal não encontrado"); return; }

    v("mem-modal-title").textContent = membroId ? "Editar Membro" : "Novo Membro";
    _limparForm();
    modal.style.display = "flex";

    await _carregarCongregacoes();

    if (membroId) await _preencherForm(membroId);
  }

  function _fecharModal() {
    const modal = v("modal-novo-membro");
    if (modal) modal.style.display = "none";
    _editandoId = null;
    setErro("");
  }

  function _limparForm() {
    [
      "mem-f-nome","mem-f-email","mem-f-telefone","mem-f-nascimento",
      "mem-f-status","mem-f-tipo-membro","mem-f-tipo-ingresso",
      "mem-f-ingresso","mem-f-funcao","mem-f-cong","mem-f-batismo",
      "mem-f-registro",
    ].forEach(id => {
      const el = v(id);
      if (!el) return;
      el.value = el.tagName === "SELECT" ? "" : "";
    });
  }

  /* ── PRÉ-PREENCHER (EDIÇÃO) ─────────────────────────── */
  async function _preencherForm(membroId) {
    try {
      const { data, error } = await sb()
        .from("v_membros")
        .select("*")
        .eq("id", membroId)
        .single();
      if (error) throw error;
      if (!data) return;

      const set = (id, val) => { const el = v(id); if (el) el.value = val || ""; };
      set("mem-f-nome",          data.nome);
      set("mem-f-email",         data.email);
      set("mem-f-telefone",      data.telefone);
      set("mem-f-nascimento",    data.data_nascimento);
      set("mem-f-status",        data.status);
      set("mem-f-tipo-membro",   data.tipo_membro);
      set("mem-f-tipo-ingresso", data.tipo_ingresso);
      set("mem-f-ingresso",      data.data_ingresso);
      set("mem-f-funcao",        data.funcao);
      set("mem-f-cong",          data.congregacao_id);
      set("mem-f-batismo",       data.data_batismo);
      set("mem-f-registro",      data.numero_registro);
    } catch (e) {
      console.error("[membresia] preencherForm:", e.message);
      toast("Erro ao carregar dados", e.message);
    }
  }

  /* ── VALIDAÇÃO ──────────────────────────────────────── */
  function _validar() {
    if (!gv("mem-f-nome"))          return "Nome é obrigatório.";
    if (!gv("mem-f-status"))        return "Status é obrigatório.";
    if (!gv("mem-f-tipo-membro"))   return "Tipo de membro é obrigatório.";
    if (!gv("mem-f-tipo-ingresso")) return "Forma de ingresso é obrigatória.";
    const email = gv("mem-f-email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "E-mail inválido.";
    return null;
  }

  /* ── VERIFICAR DUPLICATA ────────────────────────────── */
  async function _emailExiste(email, excluirId = null) {
    if (!email) return false;
    try {
      let query = sb()
        .from("pessoas")
        .select("id", { count: "exact", head: true })
        .eq("email", email);
      if (excluirId) query = query.neq("id", excluirId);
      const { count, error } = await query;
      if (error) { console.warn("[membresia] emailExiste:", error.message); return false; }
      return count > 0;
    } catch (e) {
      console.warn("[membresia] emailExiste:", e.message);
      return false;
    }
  }

  /* ── SALVAR (INSERT OU UPDATE) ──────────────────────── */
  async function _salvar() {
    setErro("");
    const erro = _validar();
    if (erro) { setErro(erro); return; }

    const email = gv("mem-f-email") || null;

    setBusy(true);
    try {
      if (_editandoId) {
        await _atualizar(_editandoId, email);
      } else {
        await _inserir(email);
      }
    } catch (e) {
      setErro("Erro inesperado: " + e.message);
      console.error("[membresia] salvar:", e);
    } finally {
      setBusy(false);
    }
  }

  /* ── INSERT: pessoas → membros ──────────────────────── */
  async function _inserir(email) {
    // Verificar duplicata de e-mail
    if (email && await _emailExiste(email)) {
      setErro("Já existe um cadastro com este e-mail.");
      return;
    }

    // 1. Inserir em `pessoas`
    const payloadPessoa = {
      nome:             gv("mem-f-nome"),
      email:            email,
      telefone:         gv("mem-f-telefone") || null,
      data_nascimento:  dateOrNull(gv("mem-f-nascimento")),
    };

    console.log("[membresia] INSERT pessoas:", payloadPessoa);

    const { data: pessoa, error: errPessoa } = await sb()
      .from("pessoas")
      .insert(payloadPessoa)
      .select("id")
      .single();

    if (errPessoa) {
      console.error("[membresia] INSERT pessoas:", errPessoa);
      setErro("Erro ao cadastrar pessoa: " + errPessoa.message);
      return;
    }

    console.log("[membresia] pessoa criada id:", pessoa.id);

    // 2. Inserir em `membros` usando pessoa_id
    const payloadMembro = {
      pessoa_id:        pessoa.id,
      status:           gv("mem-f-status"),
      tipo_membro:      gv("mem-f-tipo-membro"),
      tipo_ingresso:    gv("mem-f-tipo-ingresso"),
      data_ingresso:    dateOrNull(gv("mem-f-ingresso")),
      funcao:           gv("mem-f-funcao") || null,
      congregacao_id:   gv("mem-f-cong") || null,
      data_batismo:     dateOrNull(gv("mem-f-batismo")),
      numero_registro:  gv("mem-f-registro") || null,
      batizado:         !!dateOrNull(gv("mem-f-batismo")),
    };

    console.log("[membresia] INSERT membros:", payloadMembro);

    const { error: errMembro } = await sb()
      .from("membros")
      .insert(payloadMembro);

    if (errMembro) {
      console.error("[membresia] INSERT membros:", errMembro);
      // Rollback: excluir pessoa recém-criada
      await sb().from("pessoas").delete().eq("id", pessoa.id);
      console.warn("[membresia] rollback: pessoa removida");
      setErro("Erro ao vincular membro: " + errMembro.message);
      return;
    }

    toast("✅ Membro cadastrado!", gv("mem-f-nome"));
    _fecharModal();
    _invalidarCache();
  }

  /* ── UPDATE: pessoas + membros ──────────────────────── */
  async function _atualizar(membroId, email) {
    // Buscar pessoa_id vinculada
    const { data: membro, error: errBusca } = await sb()
      .from("membros")
      .select("id, pessoa_id")
      .eq("id", membroId)
      .single();

    if (errBusca || !membro) {
      setErro("Membro não encontrado para edição.");
      return;
    }

    // Verificar duplicata de e-mail (excluindo esta pessoa)
    if (email && await _emailExiste(email, membro.pessoa_id)) {
      setErro("Já existe outro cadastro com este e-mail.");
      return;
    }

    // 1. Atualizar `pessoas`
    const payloadPessoa = {
      nome:            gv("mem-f-nome"),
      email:           email,
      telefone:        gv("mem-f-telefone") || null,
      data_nascimento: dateOrNull(gv("mem-f-nascimento")),
    };

    const { error: errPessoa } = await sb()
      .from("pessoas")
      .update(payloadPessoa)
      .eq("id", membro.pessoa_id);

    if (errPessoa) {
      console.error("[membresia] UPDATE pessoas:", errPessoa);
      setErro("Erro ao atualizar dados pessoais: " + errPessoa.message);
      return;
    }

    // 2. Atualizar `membros`
    const payloadMembro = {
      status:          gv("mem-f-status"),
      tipo_membro:     gv("mem-f-tipo-membro"),
      tipo_ingresso:   gv("mem-f-tipo-ingresso"),
      data_ingresso:   dateOrNull(gv("mem-f-ingresso")),
      funcao:          gv("mem-f-funcao") || null,
      congregacao_id:  gv("mem-f-cong") || null,
      data_batismo:    dateOrNull(gv("mem-f-batismo")),
      numero_registro: gv("mem-f-registro") || null,
      batizado:        !!dateOrNull(gv("mem-f-batismo")),
    };

    const { error: errMembro } = await sb()
      .from("membros")
      .update(payloadMembro)
      .eq("id", membroId);

    if (errMembro) {
      console.error("[membresia] UPDATE membros:", errMembro);
      setErro("Erro ao atualizar membro: " + errMembro.message);
      return;
    }

    toast("✅ Membro atualizado!", gv("mem-f-nome"));
    _fecharModal();
    _invalidarCache();
  }

  /* ── INVALIDAR CACHE DAS LISTAS ─────────────────────── */
  function _invalidarCache() {
    // Recarregar a lista ativa no módulo de membresia
    if (typeof listarMembros === "function") {
      listarMembros("memb-cad-list", "memb-cad-count");
    }
  }

  /* ── INJETAR MODAL NO DOM ───────────────────────────── */
  function _injetarModal() {
    if (v("modal-novo-membro")) return; // já existe

    const html = `
<div id="modal-novo-membro"
     style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center;padding:16px"
     onclick="if(event.target===this)membFecharModal()">
  <div style="background:var(--bg-card);border-radius:12px;width:100%;max-width:600px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.4)">

    <!-- cabeçalho -->
    <div style="padding:20px 24px 16px;border-bottom:1px solid var(--bd1);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--bg-card);z-index:1">
      <div>
        <div style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Membresia · IPPenha</div>
        <div id="mem-modal-title" style="font-size:17px;font-weight:700;color:var(--tx1)">Novo Membro</div>
      </div>
      <button onclick="membFecharModal()" style="background:none;border:none;font-size:22px;color:var(--tx3);cursor:pointer;padding:4px 8px;border-radius:6px">×</button>
    </div>

    <!-- corpo -->
    <div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px">

      <!-- erro -->
      <div id="mem-novo-erro"
           style="display:none;background:rgba(224,85,85,.12);border:1px solid var(--rose);border-radius:8px;padding:10px 14px;font-size:12.5px;color:var(--rose)"></div>

      <!-- DADOS PESSOAIS -->
      <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em;border-bottom:1px solid var(--bd1);padding-bottom:6px">
        Dados Pessoais
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="grid-column:1/-1">
          <label class="mem-lbl">Nome completo <span style="color:var(--rose)">*</span></label>
          <input id="mem-f-nome" type="text" placeholder="Nome completo do membro" class="mem-inp" />
        </div>
        <div>
          <label class="mem-lbl">E-mail</label>
          <input id="mem-f-email" type="email" placeholder="email@exemplo.com" class="mem-inp" />
        </div>
        <div>
          <label class="mem-lbl">Telefone / Celular</label>
          <input id="mem-f-telefone" type="tel" placeholder="(11) 99999-9999" class="mem-inp" />
        </div>
        <div>
          <label class="mem-lbl">Data de Nascimento</label>
          <input id="mem-f-nascimento" type="date" class="mem-inp" />
        </div>
      </div>

      <!-- DADOS ECLESIÁSTICOS -->
      <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em;border-bottom:1px solid var(--bd1);padding-bottom:6px;margin-top:4px">
        Dados Eclesiásticos
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label class="mem-lbl">Status <span style="color:var(--rose)">*</span></label>
          <select id="mem-f-status" class="mem-inp">
            <option value="">Selecione…</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="transferido">Transferido</option>
            <option value="afastado">Afastado</option>
            <option value="falecido">Falecido</option>
            <option value="disciplinado">Disciplinado</option>
          </select>
        </div>
        <div>
          <label class="mem-lbl">Tipo de Membro <span style="color:var(--rose)">*</span></label>
          <select id="mem-f-tipo-membro" class="mem-inp">
            <option value="">Selecione…</option>
            <option value="COMUNGANTE">Comungante</option>
            <option value="NAO_COMUNGANTE">Não Comungante</option>
          </select>
        </div>
        <div>
          <label class="mem-lbl">Forma de Ingresso <span style="color:var(--rose)">*</span></label>
          <select id="mem-f-tipo-ingresso" class="mem-inp">
            <option value="">Selecione…</option>
            <option value="batismo">Batismo</option>
            <option value="profissão de fé">Profissão de Fé</option>
            <option value="transferência">Transferência</option>
            <option value="restauração">Restauração</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <label class="mem-lbl">Data de Ingresso</label>
          <input id="mem-f-ingresso" type="date" class="mem-inp" />
        </div>
        <div>
          <label class="mem-lbl">Data de Batismo</label>
          <input id="mem-f-batismo" type="date" class="mem-inp" />
        </div>
        <div>
          <label class="mem-lbl">Função / Cargo</label>
          <select id="mem-f-funcao" class="mem-inp">
            <option value="">Sem função especial</option>
            <option value="PASTOR">Pastor</option>
            <option value="EVANGELISTA">Evangelista</option>
            <option value="PRESBITERO">Presbítero</option>
            <option value="DIACONO">Diácono</option>
            <option value="MISSIONARIO">Missionário</option>
            <option value="LIDER_MINISTERIO">Líder de Ministério</option>
            <option value="LIDER_PG">Líder de PG</option>
            <option value="SECRETARIO">Secretário</option>
            <option value="TESOUREIRO">Tesoureiro</option>
            <option value="MEMBRO">Membro</option>
          </select>
        </div>
        <div>
          <label class="mem-lbl">Congregação</label>
          <select id="mem-f-cong" class="mem-inp">
            <option value="">Carregando…</option>
          </select>
        </div>
        <div>
          <label class="mem-lbl">Nº de Registro</label>
          <input id="mem-f-registro" type="text" placeholder="Ex.: 0342" class="mem-inp" />
        </div>
      </div>

    </div>

    <!-- rodapé -->
    <div style="padding:16px 24px;border-top:1px solid var(--bd1);display:flex;gap:10px;justify-content:flex-end;position:sticky;bottom:0;background:var(--bg-card)">
      <button onclick="membFecharModal()"
              style="padding:9px 20px;border-radius:8px;border:1px solid var(--bd2);background:none;color:var(--tx2);font-size:13px;cursor:pointer">
        Cancelar
      </button>
      <button id="mem-novo-salvar" onclick="membSalvar()"
              style="padding:9px 22px;border-radius:8px;border:none;background:var(--grd);color:#fff;font-size:13px;font-weight:600;cursor:pointer">
        Salvar Membro
      </button>
    </div>

  </div>
</div>

<style>
  .mem-lbl{display:block;font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
  .mem-inp{width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg-card));color:var(--tx1);font-size:13px;font-family:var(--ff);outline:none;box-sizing:border-box}
  .mem-inp:focus{border-color:var(--ac)}
  @media(max-width:520px){
    #modal-novo-membro > div{border-radius:12px 12px 0 0;max-height:96vh;margin-top:auto}
    #modal-novo-membro{align-items:flex-end;padding:0}
    #modal-novo-membro .grid-2{grid-template-columns:1fr}
  }
</style>`;

    document.body.insertAdjacentHTML("beforeend", html);
  }

  /* ── EXPORTS GLOBAIS ────────────────────────────────── */
  window.openNovoMembro  = (id = null) => _abrirModal(id);
  window.membFecharModal = _fecharModal;
  window.membSalvar      = _salvar;

  /* ── INICIALIZAÇÃO ──────────────────────────────────── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _injetarModal);
  } else {
    _injetarModal();
  }

})();
