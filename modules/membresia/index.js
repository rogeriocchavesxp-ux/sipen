/* ══════════════════════════════════════════════════════════════
   MÓDULO MEMBRESIA — Cadastro de Membros v1.1
   SIPEN · IPPenha
   Insere em `pessoas` + `membros` (nunca em v_membros)
══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  let _congregacoes = [];
  let _editandoId = null;
  let _pessoaIdAtual = null;
  let _nomeMembroAtual = null;

  const _MIN_IC = { MUSICA:'🎵', JOVENS:'🔥', INFANTIL:'👶', INTERCESSAO:'🙏', EVANGELISMO:'✝️', DIACONIA:'🤝', COMUNICACAO:'📢', ACOLHIMENTO:'🤗', OUTRO:'⭐' };

  function sb() { return getSupabase(); }
  function v(id) { return document.getElementById(id); }
  function gv(id) {
    const el = v(id);
    return el ? String(el.value || "").trim() : "";
  }
  function toast(t, s) {
    if (typeof T === "function") T(t, s);
  }

  function setErro(msg) {
    const el = v("mem-novo-erro");
    if (!el) return;
    el.textContent = msg || "";
    el.style.display = msg ? "block" : "none";
  }

  function setBusy(busy) {
    const btn = v("mem-novo-salvar");
    if (!btn) return;
    btn.disabled = busy;
    btn.textContent = busy ? "Salvando…" : (_editandoId ? "Salvar alterações" : "Cadastrar Membro");
  }

  function dateOrNull(val) {
    return val && val.trim() ? val.trim() : null;
  }

  function _podeGerenciarAcessoFacial() {
    const p = String(USUARIO_ATUAL?.perfil || '').toUpperCase();
    return ['ADMINISTRADOR_GERAL', 'ADM_OPERACIONAL', 'ADMIN_GERAL'].includes(p) || p.includes('ADMIN');
  }

  async function _carregarStatusFacial(pessoaId) {
    try {
      const { data } = await sb().from('acesso_facial').select('status').eq('pessoa_id', pessoaId).maybeSingle();
      const chk = v('mem-f-acesso-facial');
      if (chk) chk.checked = data?.status === 'ativo';
    } catch (e) {
      console.warn('[membresia] carregarStatusFacial:', e.message);
    }
  }

  async function _sincronizarAcessoFacial(pessoaId, liberado) {
    try {
      const authId = USUARIO_ATUAL?.auth_user_id || null;
      const { data: existing } = await sb().from('acesso_facial').select('id,status').eq('pessoa_id', pessoaId).maybeSingle();
      if (liberado) {
        if (existing) {
          if (existing.status !== 'ativo') {
            await sb().from('acesso_facial').update({ status: 'ativo', updated_by: authId }).eq('id', existing.id);
          }
        } else {
          await sb().from('acesso_facial').insert({
            pessoa_id: pessoaId, status: 'ativo',
            data_cadastro_facial: new Date().toISOString().slice(0, 10),
            created_by: authId
          });
        }
      } else if (existing && existing.status === 'ativo') {
        await sb().from('acesso_facial').update({ status: 'inativo', updated_by: authId }).eq('id', existing.id);
      }
    } catch (e) {
      console.warn('[membresia] sincronizarAcessoFacial:', e.message);
    }
  }

  function normalizarTipoMembro(valor) {
    const mapa = {
      COMUNGANTE: "comungante",
      NAO_COMUNGANTE: "nao_comungante",
      Comungante: "comungante",
      "Não Comungante": "nao_comungante",
      "Nao Comungante": "nao_comungante",
      comungante: "comungante",
      nao_comungante: "nao_comungante"
    };

    return mapa[valor] || valor;
  }

  function normalizarTipoIngresso(valor) {
    const mapa = {
      batismo:            "batismo",
      Batismo:            "batismo",
      profissao_de_fe:    "profissao_de_fe",
      "profissão de fé":  "profissao_de_fe",
      "Profissão de Fé":  "profissao_de_fe",
      "profissão_de_fé":  "profissao_de_fe",
      "profissao de fe":  "profissao_de_fe",
      transferencia:      "transferencia",
      transferência:      "transferencia",
      Transferência:      "transferencia",
      Transferencia:      "transferencia",
      restauracao:        "restauracao",
      restauração:        "restauracao",
      Restauração:        "restauracao",
      Restauracao:        "restauracao",
      outro:              "outro",
      Outro:              "outro",
    };

    return mapa[valor] || valor || null;
  }

  function normalizarFuncao(valor) {
    const mapa = {
      LIDER_MINISTERIO: "lider_ministerio",
      LIDER_PG: "lider_pg",
      SECRETARIO: "secretario",
      TESOUREIRO: "tesoureiro",
      MEMBRO: "membro"
    };

    return mapa[valor] || valor || null;
  }

  async function _carregarCongregacoes() {
    try {
      const { data, error } = await sb()
        .from("congregacoes")
        .select("id, nome, status")
        .in("status", ["ativa", "plantio"])
        .order("nome");

      if (error) throw error;
      _congregacoes = data || [];
    } catch (e) {
      _congregacoes = [];
    }

    const sel = v("mem-f-cong");
    if (!sel) return;

    sel.innerHTML =
      '<option value="">Nenhum</option>' +
      _congregacoes
        .map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`)
        .join("");
  }

  async function _abrirModal(membroId = null) {
    _editandoId = membroId;
    setErro("");
    setBusy(false);

    const modal = v("modal-novo-membro");
    if (!modal) {
      console.error("[membresia] modal não encontrado");
      return;
    }

    v("mem-modal-title").textContent = membroId ? "Editar Membro" : "Novo Membro";
    _limparForm();
    modal.style.display = "flex";

    const histBtn = v("mem-tab-hist-btn");
    if (histBtn) histBtn.style.display = membroId ? "block" : "none";

    const sec = v("mem-acesso-section");
    if (sec) sec.style.display = _podeGerenciarAcessoFacial() ? "block" : "none";

    await _carregarCongregacoes();

    if (membroId) await _preencherForm(membroId);
  }

  function _fecharModal() {
    const modal = v("modal-novo-membro");
    if (modal) modal.style.display = "none";

    _editandoId = null;
    _pessoaIdAtual = null;
    _nomeMembroAtual = null;
    setErro("");

    const mf = v("mem-min-form"); if (mf) mf.style.display = "none";
    const sf = v("mem-soc-form"); if (sf) sf.style.display = "none";
    const ms = v("mem-min-sel");  if (ms) delete ms.dataset.loaded;
    const ss = v("mem-soc-sel");  if (ss) delete ss.dataset.loaded;
    const hl = v("mem-hist-lista"); if (hl) delete hl.dataset.loaded;
    if (typeof window.membMudarTab === "function") window.membMudarTab("dados");
  }

  function _limparForm() {
    [
      "mem-f-nome",
      "mem-f-email",
      "mem-f-telefone",
      "mem-f-celular",
      "mem-f-nascimento",
      "mem-f-status",
      "mem-f-tipo-membro",
      "mem-f-tipo-ingresso",
      "mem-f-ingresso",
      "mem-f-funcao",
      "mem-f-cong",
      "mem-f-batismo",
      "mem-f-registro"
    ].forEach(id => {
      const el = v(id);
      if (!el) return;
      el.value = "";
    });

    const status = v("mem-f-status");
    if (status) status.value = "ativo";

    const tipo = v("mem-f-tipo-membro");
    if (tipo) tipo.value = "comungante";

    const funcao = v("mem-f-funcao");
    if (funcao) funcao.value = "";

    const chk = v("mem-f-acesso-facial");
    if (chk) chk.checked = false;

    const pe = v("mem-part-edit"); if (pe) pe.style.display = "none";
    const pn = v("mem-part-novo"); if (pn) pn.style.display = "block";
    const ml = v("mem-min-lista"); if (ml) ml.innerHTML = "";
    const sl = v("mem-soc-lista"); if (sl) sl.innerHTML = "";
  }

  async function _preencherForm(membroId) {
    try {
      const { data, error } = await sb()
        .from("v_membros")
        .select("*")
        .eq("id", membroId)
        .single();

      if (error) throw error;
      if (!data) return;

      const set = (id, val) => {
        const el = v(id);
        if (el) el.value = val || "";
      };

      set("mem-f-nome", data.nome);
      set("mem-f-email", data.email);
      set("mem-f-telefone", data.telefone);
      set("mem-f-celular", data.celular);
      set("mem-f-nascimento", data.data_nascimento);
      set("mem-f-status", data.status);
      set("mem-f-tipo-membro", normalizarTipoMembro(data.tipo_membro));
      set("mem-f-tipo-ingresso", normalizarTipoIngresso(data.tipo_ingresso));
      set("mem-f-ingresso", data.data_ingresso);
      set("mem-f-funcao", normalizarFuncao(data.funcao));
      set("mem-f-cong", data.congregacao_id);
      set("mem-f-batismo", data.data_batismo);
      set("mem-f-registro", data.numero_registro);

      if (_podeGerenciarAcessoFacial()) {
        const pessoaId = data.pessoa_id
          || (await sb().from("membros").select("pessoa_id").eq("id", membroId).single()).data?.pessoa_id;
        if (pessoaId) await _carregarStatusFacial(pessoaId);
      }

      if (data.pessoa_id) await _carregarParticipacoes(data.pessoa_id, data.nome);
    } catch (e) {
      console.error("[membresia] preencherForm:", e.message);
      toast("Erro ao carregar dados", e.message);
    }
  }

  function _validar() {
    if (!gv("mem-f-nome")) return "Nome é obrigatório.";
    if (!gv("mem-f-status")) return "Status é obrigatório.";
    if (!gv("mem-f-tipo-ingresso")) return "Forma de ingresso é obrigatória.";

    const email = gv("mem-f-email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "E-mail inválido.";
    }

    return null;
  }

  async function _emailExiste(email, excluirId = null) {
    if (!email) return false;

    try {
      let query = sb()
        .from("pessoas")
        .select("id", { count: "exact", head: true })
        .eq("email", email);

      if (excluirId) query = query.neq("id", excluirId);

      const { count, error } = await query;

      if (error) {
        console.warn("[membresia] emailExiste:", error.message);
        return false;
      }

      return count > 0;
    } catch (e) {
      console.warn("[membresia] emailExiste:", e.message);
      return false;
    }
  }

  async function _salvar() {
    setErro("");

    const nivel = (permissoesUsuario || {})["MEMBRESIA"] || "SEM_ACESSO";
    const podeEditar = USUARIO_ATUAL?.perfil === "ADMINISTRADOR_GERAL" ||
                       nivel === "COMPLETO" || nivel === "EDICAO";
    if (!podeEditar) { setErro("Sem permissão para salvar membros."); return; }

    const erro = _validar();
    if (erro) {
      setErro(erro);
      return;
    }

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

  async function _inserir(email) {
    if (email && await _emailExiste(email)) {
      setErro("Já existe um cadastro com este e-mail.");
      return;
    }

    const payloadPessoa = {
      nome: gv("mem-f-nome"),
      email: email,
      telefone: gv("mem-f-telefone") || null,
      celular: gv("mem-f-celular") || null,
      data_nascimento: dateOrNull(gv("mem-f-nascimento"))
    };

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

    const _funcaoInsert = normalizarFuncao(gv("mem-f-funcao"));
    const payloadMembro = {
      pessoa_id: pessoa.id,
      status: gv("mem-f-status"),
      tipo_membro: normalizarTipoMembro(gv("mem-f-tipo-membro")),
      tipo_ingresso: normalizarTipoIngresso(gv("mem-f-tipo-ingresso")),
      data_ingresso: dateOrNull(gv("mem-f-ingresso")),
      ...(_funcaoInsert != null ? { funcao: _funcaoInsert } : {}),
      congregacao_id: gv("mem-f-cong") || null,
      data_batismo: dateOrNull(gv("mem-f-batismo")),
      numero_registro: gv("mem-f-registro") || null,
      batizado: !!dateOrNull(gv("mem-f-batismo"))
    };

    const { error: errMembro } = await sb()
      .from("membros")
      .insert(payloadMembro);

    if (errMembro) {
      console.error("[membresia] INSERT membros:", errMembro);

      await sb()
        .from("pessoas")
        .delete()
        .eq("id", pessoa.id);

      console.warn("[membresia] rollback: pessoa removida");
      setErro("Erro ao vincular membro: " + errMembro.message);
      return;
    }

    const acessoFacial = _podeGerenciarAcessoFacial() ? (v("mem-f-acesso-facial")?.checked || false) : null;
    toast("✅ Membro cadastrado!", gv("mem-f-nome"));
    _fecharModal();
    _invalidarCache();
    if (acessoFacial !== null) await _sincronizarAcessoFacial(pessoa.id, acessoFacial);
  }

  async function _atualizar(membroId, email) {
    const { data: membro, error: errBusca } = await sb()
      .from("membros")
      .select("id, pessoa_id")
      .eq("id", membroId)
      .single();

    if (errBusca || !membro) {
      setErro("Membro não encontrado para edição.");
      return;
    }

    if (email && await _emailExiste(email, membro.pessoa_id)) {
      setErro("Já existe outro cadastro com este e-mail.");
      return;
    }

    const payloadPessoa = {
      nome: gv("mem-f-nome"),
      email: email,
      telefone: gv("mem-f-telefone") || null,
      celular: gv("mem-f-celular") || null,
      data_nascimento: dateOrNull(gv("mem-f-nascimento"))
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

    const _funcaoUpdate = normalizarFuncao(gv("mem-f-funcao"));
    const payloadMembro = {
      status: gv("mem-f-status"),
      tipo_membro: normalizarTipoMembro(gv("mem-f-tipo-membro")),
      tipo_ingresso: normalizarTipoIngresso(gv("mem-f-tipo-ingresso")),
      data_ingresso: dateOrNull(gv("mem-f-ingresso")),
      ...(_funcaoUpdate != null ? { funcao: _funcaoUpdate } : {}),
      congregacao_id: gv("mem-f-cong") || null,
      data_batismo: dateOrNull(gv("mem-f-batismo")),
      numero_registro: gv("mem-f-registro") || null,
      batizado: !!dateOrNull(gv("mem-f-batismo"))
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

    const acessoFacial = _podeGerenciarAcessoFacial() ? (v("mem-f-acesso-facial")?.checked || false) : null;
    toast("✅ Membro atualizado!", gv("mem-f-nome"));
    _fecharModal();
    _invalidarCache();
    if (acessoFacial !== null) await _sincronizarAcessoFacial(membro.pessoa_id, acessoFacial);
  }

  /* ══ PARTICIPAÇÕES (Ministérios e Sociedades) ═══════════════ */

  async function _carregarParticipacoes(pessoaId, nome) {
    _pessoaIdAtual = pessoaId;
    _nomeMembroAtual = nome;

    const pe = v("mem-part-edit"); if (pe) pe.style.display = "flex";
    const pn = v("mem-part-novo"); if (pn) pn.style.display = "none";

    try {
      const [rMin, rSoc, rLid] = await Promise.all([
        fetch(`${apiBaseUrl()}/rest/v1/ministerio_membros?pessoa_id=eq.${encodeURIComponent(pessoaId)}&select=id,funcao,status,ministerios(id,nome,tipo)&order=ministerios(nome).asc`, { headers: apiHeaders() }),
        fetch(`${apiBaseUrl()}/rest/v1/nomeados?orgao_tipo=eq.sociedade&pessoa_id=eq.${encodeURIComponent(pessoaId)}&deleted_at=is.null&select=id,orgao,cargo,status&order=orgao.asc`, { headers: apiHeaders() }),
        fetch(`${apiBaseUrl()}/rest/v1/nomeados?orgao_tipo=eq.ministerio&pessoa_id=eq.${encodeURIComponent(pessoaId)}&deleted_at=is.null&select=id,orgao,cargo,funcao_lider,status&order=orgao.asc`, { headers: apiHeaders() })
      ]);
      _renderMinLista(rMin.ok ? await rMin.json() : []);
      _renderSocLista(rSoc.ok ? await rSoc.json() : []);
      _renderLidLista(rLid.ok ? await rLid.json() : []);
    } catch (e) {
      console.warn("[membresia] carregarParticipacoes:", e.message);
    }
  }

  function _renderMinLista(lista) {
    const el = v("mem-min-lista");
    if (!el) return;
    const cnt = v("mem-min-count");
    if (cnt) { cnt.textContent = lista.length || ""; cnt.style.display = lista.length ? "" : "none"; }
    if (!lista.length) {
      el.innerHTML = `<div class="mpart-vazio"><div class="mpart-vazio-ic">⛪</div><div class="mpart-vazio-txt">Nenhum ministério vinculado</div><div class="mpart-vazio-sub">Clique em + Adicionar para incluir</div></div>`;
      return;
    }
    el.innerHTML = lista.map(m => {
      const min = m.ministerios || {};
      const ic = _MIN_IC[min.tipo] || "⭐";
      const ativo = m.status === "ativo";
      return `<div class="mpart-item">
        <span class="mpart-item-ic">${ic}</span>
        <div class="mpart-item-body">
          <div class="mpart-item-nome">${escapeHtml(min.nome || "—")}</div>
          ${m.funcao ? `<div class="mpart-item-meta">${escapeHtml(m.funcao)}</div>` : ""}
        </div>
        <span class="mpart-pill ${ativo ? "mpart-pill--gr" : "mpart-pill--off"}">${ativo ? "Ativo" : "Inativo"}</span>
        <button data-id="${m.id}" onclick="membMinRemover(this.dataset.id)" class="mpart-del" title="Remover">✕</button>
      </div>`;
    }).join("");
  }

  function _renderSocLista(lista) {
    const el = v("mem-soc-lista");
    if (!el) return;
    const cnt = v("mem-soc-count");
    if (cnt) { cnt.textContent = lista.length || ""; cnt.style.display = lista.length ? "" : "none"; }
    if (!lista.length) {
      el.innerHTML = `<div class="mpart-vazio"><div class="mpart-vazio-ic">🤝</div><div class="mpart-vazio-txt">Nenhuma sociedade vinculada</div><div class="mpart-vazio-sub">Clique em + Adicionar para incluir</div></div>`;
      return;
    }
    el.innerHTML = lista.map(s => {
      const ativo = s.status === "ativo";
      return `<div class="mpart-item">
        <span class="mpart-item-ic">🏛</span>
        <div class="mpart-item-body">
          <div class="mpart-item-nome">${escapeHtml(s.orgao || "—")}</div>
          ${s.cargo ? `<div class="mpart-item-meta">${escapeHtml(s.cargo)}</div>` : ""}
        </div>
        <span class="mpart-pill ${ativo ? "mpart-pill--gr" : "mpart-pill--off"}">${ativo ? "Ativo" : "Inativo"}</span>
        <button data-id="${s.id}" onclick="membSocRemover(this.dataset.id)" class="mpart-del" title="Remover">✕</button>
      </div>`;
    }).join("");
  }

  function _renderLidLista(lista) {
    const el = v("mem-lid-lista");
    if (!el) return;
    const cnt = v("mem-lid-count");
    if (cnt) { cnt.textContent = lista.length || ""; cnt.style.display = lista.length ? "" : "none"; }
    if (!lista.length) {
      el.innerHTML = `<div class="mpart-vazio"><div class="mpart-vazio-ic">👑</div><div class="mpart-vazio-txt">Nenhuma liderança vinculada</div><div class="mpart-vazio-sub">Vínculos de liderança são gerenciados pelos módulos correspondentes</div></div>`;
      return;
    }
    el.innerHTML = lista.map(n => {
      const cargo = n.funcao_lider || n.cargo || "";
      const ativo = n.status === "ativo";
      return `<div class="mpart-item">
        <span class="mpart-item-ic">👑</span>
        <div class="mpart-item-body">
          <div class="mpart-item-nome">${escapeHtml(n.orgao || "—")}</div>
          ${cargo ? `<div class="mpart-item-meta">${escapeHtml(cargo)}</div>` : ""}
        </div>
        <span class="mpart-pill ${ativo ? "mpart-pill--amb" : "mpart-pill--off"}">${ativo ? "Ativo" : "Inativo"}</span>
      </div>`;
    }).join("");
  }

  window.membMinMostrarForm = async function () {
    const form = v("mem-min-form");
    if (!form) return;
    form.style.display = "flex";
    const sel = v("mem-min-sel");
    if (!sel || sel.dataset.loaded) return;
    sel.innerHTML = "<option value=''>Carregando…</option>";
    const r = await fetch(`${apiBaseUrl()}/rest/v1/ministerios?ativo=eq.true&select=id,nome,tipo&order=nome.asc`, { headers: apiHeaders() });
    const lista = r.ok ? await r.json() : [];
    sel.innerHTML = "<option value=''>Selecione um ministério…</option>" +
      lista.map(m => `<option value="${m.id}">${_MIN_IC[m.tipo] || "⭐"} ${escapeHtml(m.nome)}</option>`).join("");
    sel.dataset.loaded = "1";
  };

  window.membMinOcultarForm = function () {
    const f = v("mem-min-form"); if (f) f.style.display = "none";
    const s = v("mem-min-sel"); if (s) delete s.dataset.loaded;
  };

  window.membMinSalvar = async function () {
    const sel = v("mem-min-sel");
    const minId = sel?.value;
    if (!minId) { toast("Selecione um ministério", ""); return; }
    const funcao = (v("mem-min-funcao")?.value || "Membro").trim() || "Membro";
    const { error } = await sb().from("ministerio_membros").insert({ ministerio_id: minId, pessoa_id: _pessoaIdAtual, funcao, status: "ativo" });
    if (error) { toast(error.code === "23505" ? "Já faz parte deste ministério" : "Erro: " + error.message, ""); return; }
    membMinOcultarForm();
    if (v("mem-min-funcao")) v("mem-min-funcao").value = "";
    await _carregarParticipacoes(_pessoaIdAtual, _nomeMembroAtual);
  };

  window.membMinRemover = async function (id) {
    if (!confirm("Remover deste ministério?")) return;
    await sb().from("ministerio_membros").delete().eq("id", id);
    await _carregarParticipacoes(_pessoaIdAtual, _nomeMembroAtual);
  };

  window.membSocMostrarForm = async function () {
    const form = v("mem-soc-form");
    if (!form) return;
    form.style.display = "flex";
    const sel = v("mem-soc-sel");
    if (!sel || sel.dataset.loaded) return;
    sel.innerHTML = "<option value=''>Carregando…</option>";
    const r = await fetch(`${apiBaseUrl()}/rest/v1/sociedades?ativo=eq.true&select=id,sigla,nome,orgao,ic&order=sigla.asc`, { headers: apiHeaders() });
    const lista = r.ok ? await r.json() : [];
    sel.innerHTML = "<option value=''>Selecione uma sociedade…</option>" +
      lista.map(s => `<option value="${escapeHtml(s.orgao)}">${s.ic || ""} ${escapeHtml(s.sigla)} – ${escapeHtml(s.nome)}</option>`).join("");
    sel.dataset.loaded = "1";
  };

  window.membSocOcultarForm = function () {
    const f = v("mem-soc-form"); if (f) f.style.display = "none";
    const s = v("mem-soc-sel"); if (s) delete s.dataset.loaded;
  };

  window.membSocSalvar = async function () {
    const sel = v("mem-soc-sel");
    const orgao = sel?.value;
    if (!orgao) { toast("Selecione uma sociedade", ""); return; }
    const cargo = (v("mem-soc-cargo")?.value || "Membro").trim() || "Membro";
    const { error } = await sb().from("nomeados").insert({
      nome: _nomeMembroAtual || gv("mem-f-nome") || "Membro",
      orgao_tipo: "sociedade",
      orgao,
      cargo,
      pessoa_id: _pessoaIdAtual,
      status: "ativo"
    });
    if (error) { toast("Erro: " + error.message, ""); return; }
    membSocOcultarForm();
    if (v("mem-soc-cargo")) v("mem-soc-cargo").value = "";
    await _carregarParticipacoes(_pessoaIdAtual, _nomeMembroAtual);
  };

  window.membSocRemover = async function (id) {
    if (!confirm("Remover desta sociedade?")) return;
    await sb().from("nomeados").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    await _carregarParticipacoes(_pessoaIdAtual, _nomeMembroAtual);
  };

  /* ══ HISTÓRICO ════════════════════════════════════════════════ */

  const _EVT_CFG = {
    ingresso:             { symbol:"✝",  r:42,  g:181, b:192, cat:"Ingresso"    },
    batismo:              { symbol:"💧", r:74,  g:156, b:245, cat:"Batismo"     },
    status_membro:        { symbol:"◎",  r:212, g:168, b:67,  cat:"Status"      },
    ministerio_entrada:   { symbol:"◉",  r:58,  g:170, b:92,  cat:"Ministério"  },
    ministerio_inativado: { symbol:"◌",  r:139, g:107, b:193, cat:"Ministério"  },
    ministerio_reativado: { symbol:"◉",  r:58,  g:170, b:92,  cat:"Ministério"  },
    ministerio_removido:  { symbol:"✕",  r:224, g:85,  b:85,  cat:"Ministério"  },
    ministerio_funcao:    { symbol:"✎",  r:212, g:168, b:67,  cat:"Ministério"  },
    sociedade_entrada:    { symbol:"⬟",  r:212, g:168, b:67,  cat:"Sociedade"   },
    sociedade_saida:      { symbol:"⬠",  r:139, g:107, b:193, cat:"Sociedade"   },
    sociedade_cargo:      { symbol:"✎",  r:212, g:168, b:67,  cat:"Sociedade"   },
  };

  function _renderEvento(evt) {
    const c = _EVT_CFG[evt.evento_tipo] || { symbol:"◆", r:139, g:107, b:193, cat: evt.evento_tipo };
    const data = evt.data_evento
      ? new Date(evt.data_evento + "T00:00:00").toLocaleDateString("pt-BR")
      : "—";
    return `<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--bd1)">
      <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:32px">
        <div style="width:32px;height:32px;border-radius:50%;background:rgba(${c.r},${c.g},${c.b},.15);border:1.5px solid rgba(${c.r},${c.g},${c.b},.35);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">${c.symbol}</div>
        <div style="width:1px;flex:1;background:var(--bd1);margin-top:4px;min-height:8px"></div>
      </div>
      <div style="flex:1;min-width:0;padding-bottom:4px">
        <div style="font-size:9.5px;font-weight:700;color:rgba(${c.r},${c.g},${c.b},1);text-transform:uppercase;letter-spacing:.07em;margin-bottom:2px">${c.cat}</div>
        <div style="font-size:13px;color:var(--tx1);line-height:1.4">${escapeHtml(evt.descricao)}</div>
        <div style="font-size:11px;color:var(--tx3);margin-top:2px">${data}</div>
      </div>
    </div>`;
  }

  async function _carregarHistorico(pessoaId) {
    const lista = v("mem-hist-lista");
    if (!lista) return;
    lista.dataset.loaded = "1";
    lista.innerHTML = `<div style="color:var(--tx3);text-align:center;padding:24px 0;font-size:13px">Carregando…</div>`;
    try {
      const r = await fetch(
        `${apiBaseUrl()}/rest/v1/pessoa_eventos?pessoa_id=eq.${encodeURIComponent(pessoaId)}&order=data_evento.desc.nullslast,created_at.desc&limit=200`,
        { headers: apiHeaders() }
      );
      const eventos = r.ok ? await r.json() : [];
      if (!eventos.length) {
        lista.innerHTML = `<div style="color:var(--tx3);text-align:center;padding:24px 0;font-size:13px">Nenhum evento registrado ainda.</div>`;
        return;
      }
      lista.innerHTML = eventos.map(_renderEvento).join("") +
        `<div style="font-size:10.5px;color:var(--tx3);text-align:center;padding:12px 0;margin-top:4px">
           Eventos registrados automaticamente a partir desta versão do SIPEN.
         </div>`;
    } catch (e) {
      lista.innerHTML = `<div style="color:var(--rose);padding:12px;font-size:13px">Erro ao carregar: ${escapeHtml(e.message)}</div>`;
    }
  }

  window.membMudarTab = function (tab) {
    ["dados","part","hist"].forEach(t => {
      const el = v("mem-tab-" + t); if (el) el.style.display = "none";
    });
    const show = v("mem-tab-" + tab); if (show) show.style.display = "block";
    document.querySelectorAll(".mem-tab-btn").forEach(btn => {
      btn.classList.toggle("mem-tab-on", btn.dataset.tab === tab);
    });
    const nota = v("mem-hist-nota"); if (nota) nota.style.display = tab === "hist" ? "block" : "none";
    const salvar = v("mem-novo-salvar"); if (salvar) salvar.style.display = tab === "hist" ? "none" : "block";
    if (tab === "hist" && _pessoaIdAtual) {
      const hl = v("mem-hist-lista");
      if (hl && !hl.dataset.loaded) _carregarHistorico(_pessoaIdAtual);
    }
  };

  function _invalidarCache() {
    if (typeof listarMembros === "function") {
      listarMembros("memb-cad-list", "memb-cad-count");
    }
  }

  function _injetarModal() {
    if (v("modal-novo-membro")) return;

    const html = `
<div id="modal-novo-membro"
     style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center;padding:16px"
     onclick="if(event.target===this)membFecharModal()">
  <div style="background:var(--bg-card);border-radius:12px;width:100%;max-width:720px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4)">

    <!-- Cabeçalho + abas (fixo no topo) -->
    <div style="flex-shrink:0;border-bottom:1px solid var(--bd1);border-radius:12px 12px 0 0;background:var(--bg-card)">
      <div style="padding:16px 24px 10px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Membresia · IPPenha</div>
          <div id="mem-modal-title" style="font-size:17px;font-weight:700;color:var(--tx1)">Novo Membro</div>
        </div>
        <button onclick="membFecharModal()" style="background:none;border:none;font-size:22px;color:var(--tx3);cursor:pointer;padding:4px 8px;border-radius:6px">×</button>
      </div>
      <div style="display:flex;padding:0 20px;gap:0">
        <button class="mem-tab-btn mem-tab-on" data-tab="dados" onclick="membMudarTab('dados')">Dados</button>
        <button class="mem-tab-btn" data-tab="part" onclick="membMudarTab('part')">Participações</button>
        <button class="mem-tab-btn" id="mem-tab-hist-btn" data-tab="hist" onclick="membMudarTab('hist')" style="display:none">Histórico</button>
      </div>
    </div>

    <!-- Área rolável -->
    <div style="flex:1;overflow-y:auto;min-height:0">

      <div id="mem-novo-erro"
           style="display:none;margin:16px 24px 0;background:rgba(224,85,85,.12);border:1px solid var(--rose);border-radius:8px;padding:10px 14px;font-size:12.5px;color:var(--rose)"></div>

      <!-- Aba: Dados -->
      <div id="mem-tab-dados" style="padding:20px 24px">

        <div class="mem-section-hd">Informações Pessoais</div>

        <div class="mem-grid-3">
          <div>
            <label class="mem-lbl">Nome completo <span style="color:var(--rose)">*</span></label>
            <input id="mem-f-nome" type="text" placeholder="Nome completo" class="mem-inp" />
          </div>
          <div>
            <label class="mem-lbl">E-mail</label>
            <input id="mem-f-email" type="email" placeholder="email@exemplo.com" class="mem-inp" />
          </div>
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
            <label class="mem-lbl">Telefone</label>
            <input id="mem-f-telefone" type="tel" placeholder="(11) 99999-9999" class="mem-inp" />
          </div>
          <div>
            <label class="mem-lbl">Celular</label>
            <input id="mem-f-celular" type="tel" placeholder="(11) 99999-9999" class="mem-inp" />
          </div>
          <div>
            <label class="mem-lbl">Data de Nascimento</label>
            <input id="mem-f-nascimento" type="date" class="mem-inp" />
          </div>
        </div>

        <div class="mem-section-hd" style="margin-top:4px">Informações Eclesiásticas</div>

        <div class="mem-grid-3">
          <div>
            <label class="mem-lbl">Tipo de Membro</label>
            <select id="mem-f-tipo-membro" class="mem-inp">
              <option value="">Nenhum</option>
              <option value="comungante">Comungante</option>
              <option value="nao_comungante">Não Comungante</option>
            </select>
          </div>
          <div>
            <label class="mem-lbl">Forma de Ingresso <span style="color:var(--rose)">*</span></label>
            <select id="mem-f-tipo-ingresso" class="mem-inp">
              <option value="">Selecione…</option>
              <option value="batismo">Batismo</option>
              <option value="profissao_de_fe">Profissão de Fé</option>
              <option value="transferencia">Transferência</option>
              <option value="restauracao">Restauração</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label class="mem-lbl">Data de Ingresso</label>
            <input id="mem-f-ingresso" type="date" class="mem-inp" />
          </div>
          <div>
            <label class="mem-lbl">Função</label>
            <select id="mem-f-funcao" class="mem-inp">
              <option value="membro">Membro</option>
              <option value="pastor">Pastor</option>
              <option value="presbitero">Presbítero</option>
              <option value="diacono">Diácono</option>
              <option value="supervisor">Supervisor</option>
              <option value="coordenador">Coordenador</option>
              <option value="lider_ministerio">Líder de Ministério</option>
              <option value="lider_pg">Líder de PG</option>
              <option value="secretario">Secretário(a)</option>
              <option value="tesoureiro">Tesoureiro(a)</option>
              <option value="colaborador">Colaborador</option>
              <option value="colaborador_membro">Colaborador - Membro</option>
            </select>
          </div>
          <div>
            <label class="mem-lbl">Vínculo</label>
            <select id="mem-f-cong" class="mem-inp">
              <option value="">Carregando…</option>
            </select>
          </div>
          <div>
            <label class="mem-lbl">Data de Batismo</label>
            <input id="mem-f-batismo" type="date" class="mem-inp" />
          </div>
          <div style="grid-column:span 2">
            <label class="mem-lbl">Nº de Registro</label>
            <input id="mem-f-registro" type="text" placeholder="Ex.: 0342" class="mem-inp" />
          </div>
        </div>

        <div id="mem-acesso-section" style="display:none;background:rgba(42,181,192,.05);border:1px solid rgba(42,181,192,.2);border-radius:8px;padding:14px 16px">
          <div style="font-size:10px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">Controle de Acesso</div>
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none">
            <input type="checkbox" id="mem-f-acesso-facial" style="width:16px;height:16px;accent-color:var(--teal);cursor:pointer;flex-shrink:0">
            <span>
              <span style="font-size:13px;font-weight:600;color:var(--tx1)">Acesso facial liberado</span>
              <span style="display:block;font-size:10.5px;color:var(--tx3);margin-top:1px">Libera o acesso à portaria via reconhecimento facial</span>
            </span>
          </label>
        </div>

      </div>

      <!-- Aba: Participações -->
      <div id="mem-tab-part" style="display:none;padding:16px 20px 20px">

        <div id="mem-part-novo" style="color:var(--tx3);font-size:12px;text-align:center;padding:10px 0">
          Salve o membro primeiro para gerenciar participações.
        </div>

        <div id="mem-part-edit" style="display:none;flex-direction:column;gap:12px">

          <!-- Bloco: Ministérios -->
          <div class="mpart-bloco">
            <div class="mpart-hd mpart-hd--teal">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:15px;line-height:1">⛪</span>
                <span class="mpart-titulo">Ministérios</span>
                <span id="mem-min-count" class="mpart-badge mpart-badge--teal" style="display:none"></span>
              </div>
              <button onclick="membMinMostrarForm()" class="mpart-add mpart-add--teal">+ Adicionar</button>
            </div>
            <div id="mem-min-lista"></div>
            <div id="mem-min-form" style="display:none;flex-direction:column;gap:8px;padding:12px 14px;border-top:1px solid var(--bd1);background:var(--bg-surface,var(--bg-card))">
              <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em">Novo vínculo de ministério</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <select id="mem-min-sel" class="mem-inp"><option value="">Selecione o ministério…</option></select>
                <input id="mem-min-funcao" type="text" class="mem-inp" placeholder="Função (ex.: Membro, Líder)" />
              </div>
              <div style="display:flex;gap:8px;justify-content:flex-end">
                <button onclick="membMinOcultarForm()" style="font-size:12px;padding:5px 12px;border-radius:6px;border:1px solid var(--bd2);background:none;color:var(--tx2);cursor:pointer">Cancelar</button>
                <button onclick="membMinSalvar()" style="font-size:12px;padding:5px 14px;border-radius:6px;border:none;background:var(--teal);color:#fff;cursor:pointer;font-weight:600">Adicionar</button>
              </div>
            </div>
          </div>

          <!-- Bloco: Liderança -->
          <div class="mpart-bloco">
            <div class="mpart-hd mpart-hd--amb">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:15px;line-height:1">👑</span>
                <span class="mpart-titulo">Liderança em Ministérios</span>
                <span id="mem-lid-count" class="mpart-badge mpart-badge--amb" style="display:none"></span>
              </div>
            </div>
            <div id="mem-lid-lista"></div>
          </div>

          <!-- Bloco: Sociedades -->
          <div class="mpart-bloco">
            <div class="mpart-hd mpart-hd--sky">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:15px;line-height:1">🤝</span>
                <span class="mpart-titulo">Sociedades Internas</span>
                <span id="mem-soc-count" class="mpart-badge mpart-badge--sky" style="display:none"></span>
              </div>
              <button onclick="membSocMostrarForm()" class="mpart-add mpart-add--sky">+ Adicionar</button>
            </div>
            <div id="mem-soc-lista"></div>
            <div id="mem-soc-form" style="display:none;flex-direction:column;gap:8px;padding:12px 14px;border-top:1px solid var(--bd1);background:var(--bg-surface,var(--bg-card))">
              <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em">Nova vinculação</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <select id="mem-soc-sel" class="mem-inp"><option value="">Selecione a sociedade…</option></select>
                <input id="mem-soc-cargo" type="text" class="mem-inp" placeholder="Cargo / função" />
              </div>
              <div style="display:flex;gap:8px;justify-content:flex-end">
                <button onclick="membSocOcultarForm()" style="font-size:12px;padding:5px 12px;border-radius:6px;border:1px solid var(--bd2);background:none;color:var(--tx2);cursor:pointer">Cancelar</button>
                <button onclick="membSocSalvar()" style="font-size:12px;padding:5px 14px;border-radius:6px;border:none;background:var(--sky,var(--teal));color:#fff;cursor:pointer;font-weight:600">Adicionar</button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Aba: Histórico -->
      <div id="mem-tab-hist" style="display:none;padding:20px 24px">
        <div id="mem-hist-lista">
          <div style="color:var(--tx3);text-align:center;padding:24px 0;font-size:13px">Carregando histórico…</div>
        </div>
      </div>

    </div><!-- fim área rolável -->

    <!-- Rodapé fixo -->
    <div style="flex-shrink:0;padding:14px 24px;border-top:1px solid var(--bd1);display:flex;gap:10px;justify-content:flex-end;align-items:center;background:var(--bg-card);border-radius:0 0 12px 12px">
      <div id="mem-hist-nota" style="display:none;font-size:10.5px;color:var(--tx3);flex:1">
        Saídas de ministérios e mudanças de status anteriores a esta versão podem não constar.
      </div>
      <button onclick="membFecharModal()"
              style="padding:8px 18px;border-radius:8px;border:1px solid var(--bd2);background:none;color:var(--tx2);font-size:13px;cursor:pointer">
        Cancelar
      </button>
      <button id="mem-novo-salvar" onclick="membSalvar()"
              style="padding:8px 22px;border-radius:8px;border:none;background:var(--grd);color:#fff;font-size:13px;font-weight:600;cursor:pointer">
        Cadastrar Membro
      </button>
    </div>

  </div>
</div>

<style>
  .mem-section-hd {
    font-size:10px;
    font-weight:700;
    color:var(--teal);
    text-transform:uppercase;
    letter-spacing:.1em;
    padding-bottom:8px;
    margin-bottom:12px;
    border-bottom:1px solid var(--bd1);
  }
  .mem-lbl {
    display:block;
    font-size:10.5px;
    font-weight:600;
    color:var(--tx3);
    text-transform:uppercase;
    letter-spacing:.05em;
    margin-bottom:4px;
  }
  .mem-inp {
    width:100%;
    padding:8px 10px;
    border-radius:7px;
    border:1px solid var(--bd2);
    background:var(--bg-input,var(--bg-card));
    color:var(--tx1);
    font-size:13px;
    font-family:var(--ff);
    outline:none;
    box-sizing:border-box;
  }
  .mem-inp:focus { border-color:var(--ac); }
  .mem-grid-3 {
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:10px;
    margin-bottom:20px;
  }
  .mem-tab-btn {
    padding:9px 16px;
    border:none;
    background:none;
    font-size:12.5px;
    font-weight:600;
    color:var(--tx3);
    cursor:pointer;
    border-bottom:2px solid transparent;
    margin-bottom:-1px;
    transition:color .15s,border-color .15s;
  }
  .mem-tab-on {
    color:var(--teal);
    border-bottom-color:var(--teal);
  }
  @media(max-width:580px) {
    .mem-grid-3 { grid-template-columns:repeat(2,1fr); }
    #modal-novo-membro > div {
      border-radius:12px 12px 0 0;
      max-height:96vh;
      margin-top:auto;
    }
    #modal-novo-membro {
      align-items:flex-end;
      padding:0;
    }
  }
  @media(max-width:380px) {
    .mem-grid-3 { grid-template-columns:1fr; }
  }

  /* ── Aba Participações ──────────────────────────────────────── */
  .mpart-bloco {
    border:1px solid var(--bd1);
    border-radius:10px;
    overflow:hidden;
    background:var(--bg-card);
  }
  .mpart-hd {
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:10px 14px;
    border-bottom:1px solid var(--bd1);
  }
  .mpart-hd--teal { background:rgba(42,181,192,.06);  border-left:3px solid var(--teal); }
  .mpart-hd--amb  { background:rgba(212,168,67,.06);  border-left:3px solid #d4a843; }
  .mpart-hd--sky  { background:rgba(74,156,245,.06);  border-left:3px solid var(--sky,#4a9cf5); }
  .mpart-titulo {
    font-size:11.5px;
    font-weight:700;
    color:var(--tx1);
    letter-spacing:.01em;
  }
  .mpart-badge {
    font-size:10px;
    font-weight:700;
    padding:1px 7px;
    border-radius:10px;
    line-height:1.6;
  }
  .mpart-badge--teal { background:rgba(42,181,192,.15);  color:var(--teal); }
  .mpart-badge--amb  { background:rgba(212,168,67,.15);  color:#b07d10; }
  .mpart-badge--sky  { background:rgba(74,156,245,.15);  color:var(--sky,#4a9cf5); }
  .mpart-add {
    font-size:11px;
    font-weight:600;
    padding:3px 10px;
    border-radius:6px;
    cursor:pointer;
    border:1px solid;
    background:transparent;
    transition:background .12s, color .12s;
  }
  .mpart-add--teal { color:var(--teal);            border-color:rgba(42,181,192,.4); }
  .mpart-add--sky  { color:var(--sky,#4a9cf5);     border-color:rgba(74,156,245,.4); }
  .mpart-add--teal:hover { background:var(--teal);         color:#fff; }
  .mpart-add--sky:hover  { background:var(--sky,#4a9cf5);  color:#fff; }
  .mpart-item {
    display:flex;
    align-items:center;
    gap:10px;
    padding:9px 14px;
    border-bottom:1px solid var(--bd1);
    transition:background .1s;
  }
  .mpart-item:last-child { border-bottom:none; }
  .mpart-item:hover { background:var(--bg-hover,var(--bg-surface)); }
  .mpart-item-ic {
    font-size:16px;
    line-height:1;
    flex-shrink:0;
    width:22px;
    text-align:center;
  }
  .mpart-item-body { flex:1; min-width:0; }
  .mpart-item-nome {
    font-size:12.5px;
    font-weight:600;
    color:var(--tx1);
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .mpart-item-meta {
    font-size:10.5px;
    color:var(--tx3);
    margin-top:1px;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .mpart-pill {
    font-size:9.5px;
    font-weight:700;
    padding:2px 8px;
    border-radius:10px;
    border:1px solid;
    white-space:nowrap;
    flex-shrink:0;
  }
  .mpart-pill--gr  { background:rgba(58,170,92,.1);  color:var(--gr);         border-color:rgba(58,170,92,.25); }
  .mpart-pill--amb { background:rgba(212,168,67,.1); color:#b07d10;            border-color:rgba(212,168,67,.3); }
  .mpart-pill--off { background:var(--bg-surface);    color:var(--tx3);        border-color:var(--bd1); }
  .mpart-del {
    background:none;
    border:none;
    color:var(--tx3);
    cursor:pointer;
    font-size:13px;
    line-height:1;
    padding:3px 4px;
    border-radius:5px;
    flex-shrink:0;
    opacity:.6;
    transition:opacity .1s, color .1s, background .1s;
  }
  .mpart-del:hover { opacity:1; color:var(--rose); background:rgba(224,85,85,.08); }
  .mpart-vazio {
    text-align:center;
    padding:20px 16px;
    color:var(--tx3);
  }
  .mpart-vazio-ic  { font-size:24px; margin-bottom:6px; opacity:.5; }
  .mpart-vazio-txt { font-size:12px; font-weight:600; color:var(--tx2); }
  .mpart-vazio-sub { font-size:10.5px; margin-top:3px; color:var(--tx3); }
  @media(max-width:480px) {
    .mpart-item-meta { display:none; }
    .mpart-hd { padding:9px 12px; }
    .mpart-item { padding:8px 12px; gap:8px; }
  }
</style>`;

    document.body.insertAdjacentHTML("beforeend", html);
  }

  window.openNovoMembro = (id = null) => _abrirModal(id);
  window.membFecharModal = _fecharModal;
  window.membSalvar = _salvar;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _injetarModal);
  } else {
    _injetarModal();
  }
})();
