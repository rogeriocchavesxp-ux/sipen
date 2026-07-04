/* ═══════════════════════════════════════════════════════════
   SIPEN — Eleições / Indicações de Oficiais  v6.40.0
   modules/conselho/eleicoes.js
   Formulário de indicação (membros) + painel admin (conselho)
═══════════════════════════════════════════════════════════ */

(function () {

  /* ── Estado ─────────────────────────────────────────── */
  let _membros   = [];
  let _items     = [];
  let _itemCtr   = 0;
  let _indicacoes = [];
  let _filtroTipo    = "todos";
  let _filtroCongreg = "todas";

  /* ── Helpers ────────────────────────────────────────── */
  const _sb  = () => (typeof getSupabase === "function" ? getSupabase() : null);
  const _usr = () => (typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL : null);

  function _isAdmin() {
    const u = _usr();
    if (!u) return false;
    return ["ADMINISTRADOR_GERAL", "CONSELHO", "PASTORAL"].includes(u.perfil);
  }

  function _calcIdade(dn) {
    if (!dn) return null;
    try {
      const hoje = new Date();
      const nasc = new Date(dn + "T00:00:00");
      let a = hoje.getFullYear() - nasc.getFullYear();
      if (hoje.getMonth() < nasc.getMonth() ||
          (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) a--;
      return a;
    } catch { return null; }
  }

  function _calcMeses(di) {
    if (!di) return null;
    try {
      const hoje = new Date();
      const ing  = new Date(di + "T00:00:00");
      return (hoje.getFullYear() - ing.getFullYear()) * 12 +
             (hoje.getMonth() - ing.getMonth());
    } catch { return null; }
  }

  function _fmtDtHr(d) {
    if (!d) return "—";
    try { return new Date(d).toLocaleString("pt-BR"); } catch { return d; }
  }

  function _esc(s) {
    if (!s) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  /* ── Carregar membros ativos ─────────────────────────── */
  async function _carregarMembros() {
    if (_membros.length) return;
    try {
      const { data } = await _sb()
        .from("v_membros")
        .select("id,pessoa_id,nome,data_nascimento,data_ingresso,congregacao,status")
        .eq("status", "ativo")
        .limit(2000);
      _membros = data || [];
    } catch (e) { console.warn("eleicoes:membros", e); }
  }

  /* ── Verificar se o usuário já indicou ─────────────────── */
  async function _jaIndicou() {
    const u = _usr();
    if (!u || !u.pessoa_id) return false;
    try {
      const { data } = await _sb()
        .from("eleicao_indicacoes")
        .select("id")
        .eq("indicante_pessoa_id", u.pessoa_id)
        .is("deleted_at", null)
        .limit(1);
      return !!(data && data.length);
    } catch { return false; }
  }

  /* ═══════════════════════════════════════════════════════
     FORMULÁRIO DE INDICAÇÃO
  ═══════════════════════════════════════════════════════ */

  async function _renderFormulario() {
    const el = document.getElementById("eleicao-form-area");
    if (!el) return;

    el.innerHTML = `<div style="padding:28px;text-align:center;color:var(--tx3);font-size:12px">Verificando elegibilidade...</div>`;

    await _carregarMembros();

    const u = _usr();
    const membro = _membros.find(m => m.pessoa_id === u?.pessoa_id);
    const idade  = membro ? _calcIdade(membro.data_nascimento) : null;
    const meses  = membro ? _calcMeses(membro.data_ingresso)   : null;

    if (idade !== null && idade < 18) {
      el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--rose);font-size:13px">Você precisa ter 18 anos ou mais para participar deste processo.</div>`;
      return;
    }
    if (meses !== null && meses < 12) {
      el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--amber);font-size:13px">Você precisa ter pelo menos 1 ano de membresia para participar deste processo.</div>`;
      return;
    }

    const jaFez = await _jaIndicou();
    if (jaFez) {
      el.innerHTML = `
        <div style="text-align:center;padding:48px 20px">
          <div style="font-size:36px;margin-bottom:14px">✅</div>
          <div style="font-size:15px;font-weight:700;color:var(--tx1);margin-bottom:8px">Indicação registrada</div>
          <div style="font-size:13px;color:var(--tx3);line-height:1.6">Você já enviou suas indicações para esta eleição.<br>Agradecemos sua participação.</div>
        </div>`;
      return;
    }

    _items = [];
    _itemCtr = 0;
    _adicionarItem();

    el.innerHTML = `
      <div style="max-width:680px">
        <div style="font-size:13px;color:var(--tx3);margin-bottom:20px;line-height:1.7;border-left:3px solid var(--sky);padding-left:12px">
          Indique nomes de membros que, em sua percepção, reúnem condições para o ofício de
          <strong style="color:var(--tx2)">diácono</strong> ou <strong style="color:var(--tx2)">presbítero</strong>.
          Você pode indicar mais de uma pessoa.
        </div>
        <div id="eleicao-items-container" style="display:flex;flex-direction:column;gap:14px"></div>
        <button onclick="eleicaoAdicionarItem()"
          style="margin-top:14px;padding:9px 20px;border-radius:8px;border:1.5px dashed var(--bd2);background:transparent;color:var(--tx3);font-size:13px;cursor:pointer">
          + Adicionar indicação
        </button>
        <div style="margin-top:24px;padding-top:18px;border-top:1px solid var(--bd1);display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <button onclick="eleicaoSubmeter()"
            style="padding:11px 30px;border-radius:8px;border:none;background:var(--sky);color:#fff;font-size:13px;font-weight:700;cursor:pointer">
            Enviar indicações
          </button>
          <div id="eleicao-form-msg" style="font-size:12px"></div>
        </div>
      </div>`;

    _renderItems();
  }

  function _adicionarItem() {
    const id = ++_itemCtr;
    _items.push({ id, tipo: "presbitero", indicado_id: null, indicado_nome: "", obs: "" });
    return id;
  }

  function _renderItems() {
    const c = document.getElementById("eleicao-items-container");
    if (!c) return;
    c.innerHTML = _items.map(it => _itemHTML(it)).join("");
  }

  function _itemHTML(it) {
    const podeRemover = _items.length > 1;
    const corP = it.tipo === "presbitero" ? "var(--sky)"  : "var(--bd2)";
    const corD = it.tipo === "diacono"    ? "var(--teal)" : "var(--bd2)";
    const bgP  = it.tipo === "presbitero" ? "rgba(74,156,245,.07)"  : "var(--bg-surface)";
    const bgD  = it.tipo === "diacono"    ? "rgba(42,181,192,.07)"  : "var(--bg-surface)";
    const txP  = it.tipo === "presbitero" ? "var(--sky)"  : "var(--tx3)";
    const txD  = it.tipo === "diacono"    ? "var(--teal)" : "var(--tx3)";
    const inp  = "width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:13px;box-sizing:border-box;outline:none";
    return `
      <div id="eleicao-item-${it.id}" style="border:1px solid var(--bd2);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:10px;font-weight:700;color:var(--tx4);text-transform:uppercase;letter-spacing:.1em">Indicação #${it.id}</span>
          ${podeRemover ? `<button type="button" onclick="eleicaoRemoverItem(${it.id})" style="background:none;border:none;color:var(--rose);cursor:pointer;font-size:14px;padding:2px 6px" title="Remover">✕</button>` : ""}
        </div>
        <div>
          <div style="font-size:10px;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">Tipo de Ofício *</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <label style="display:flex;align-items:center;gap:7px;padding:9px 16px;border-radius:8px;border:1.5px solid ${corP};background:${bgP};cursor:pointer;font-size:13px;font-weight:500;color:${txP}">
              <input type="radio" name="tipo-${it.id}" value="presbitero" ${it.tipo==="presbitero"?"checked":""} onchange="eleicaoSetTipo(${it.id},'presbitero')" style="accent-color:var(--sky)"> Presbítero
            </label>
            <label style="display:flex;align-items:center;gap:7px;padding:9px 16px;border-radius:8px;border:1.5px solid ${corD};background:${bgD};cursor:pointer;font-size:13px;font-weight:500;color:${txD}">
              <input type="radio" name="tipo-${it.id}" value="diacono" ${it.tipo==="diacono"?"checked":""} onchange="eleicaoSetTipo(${it.id},'diacono')" style="accent-color:var(--teal)"> Diácono
            </label>
          </div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">Nome Indicado *</div>
          <div style="position:relative">
            <input id="eleicao-search-${it.id}" type="text" placeholder="Digite o nome do membro..."
              value="${_esc(it.indicado_nome)}"
              oninput="eleicaoBuscar(${it.id},this.value)"
              onblur="eleicaoBlurSearch(${it.id})"
              style="${inp}">
            <div id="eleicao-drop-${it.id}" style="position:absolute;top:calc(100% + 2px);left:0;right:0;z-index:60;background:var(--bg-card);border:1px solid var(--bd2);border-radius:8px;max-height:210px;overflow-y:auto;display:none;box-shadow:0 4px 18px rgba(0,0,0,.22)"></div>
          </div>
          <div id="eleicao-sel-${it.id}" style="margin-top:5px;font-size:11px;color:${it.indicado_id?"var(--gr)":"var(--tx4)"}">
            ${it.indicado_id ? `✅ ${_esc(it.indicado_nome)} selecionado(a)` : "Nenhum membro selecionado"}
          </div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">Observação (opcional)</div>
          <input type="text" maxlength="200" placeholder="Motivo da indicação..."
            oninput="eleicaoSetObs(${it.id},this.value)"
            value="${_esc(it.obs)}"
            style="${inp}">
        </div>
      </div>`;
  }

  /* ── Autocomplete ────────────────────────────────────── */
  window.eleicaoBuscar = function (id, query) {
    const drop = document.getElementById(`eleicao-drop-${id}`);
    if (!drop) return;
    const q    = (query || "").trim().toLowerCase();
    const item = _items.find(i => i.id == id);
    if (item) { item.indicado_id = null; item.indicado_nome = query; }
    const sel = document.getElementById(`eleicao-sel-${id}`);
    if (sel) { sel.textContent = "Nenhum membro selecionado"; sel.style.color = "var(--tx4)"; }

    if (q.length < 2) { drop.style.display = "none"; return; }

    const matches = _membros.filter(m => m.nome?.toLowerCase().includes(q)).slice(0, 10);

    if (!matches.length) {
      drop.innerHTML = `<div style="padding:10px 14px;font-size:12px;color:var(--tx3)">Nenhum membro encontrado</div>`;
      drop.style.display = "block";
      return;
    }

    drop.innerHTML = matches.map(m => {
      const idade    = _calcIdade(m.data_nascimento);
      const meses    = _calcMeses(m.data_ingresso);
      const invalido = (idade !== null && idade < 18) || (meses !== null && meses < 12);
      const motivo   = invalido
        ? (idade !== null && idade < 18 ? "Menor de 18 anos" : "Menos de 1 ano de membresia")
        : "";
      const nome_esc = _esc(m.nome).replace(/'/g, "\\'");
      return `<div
        onclick="${invalido ? `alert('Não permitido: ${motivo}')` : `eleicaoSelecionarMembro(${id},'${m.pessoa_id}','${nome_esc}')`}"
        style="padding:10px 14px;font-size:12.5px;cursor:${invalido?"not-allowed":"pointer"};color:${invalido?"var(--tx4)":"var(--tx1)"};border-bottom:1px solid var(--bd1);display:flex;justify-content:space-between;align-items:center"
        ${invalido?"":` onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''"`}>
        <span>${_esc(m.nome)}</span>
        <span style="font-size:10px;color:${invalido?"var(--rose)":"var(--tx3)"}">
          ${invalido ? motivo : (m.congregacao || "Sede")}
        </span>
      </div>`;
    }).join("");
    drop.style.display = "block";
  };

  window.eleicaoSelecionarMembro = function (id, pessoaId, nome) {
    const item = _items.find(i => i.id == id);
    if (!item) return;
    item.indicado_id   = pessoaId;
    item.indicado_nome = nome;
    const inp  = document.getElementById(`eleicao-search-${id}`);
    const drop = document.getElementById(`eleicao-drop-${id}`);
    const sel  = document.getElementById(`eleicao-sel-${id}`);
    if (inp)  inp.value = nome;
    if (drop) drop.style.display = "none";
    if (sel)  { sel.textContent = `✅ ${nome} selecionado(a)`; sel.style.color = "var(--gr)"; }
  };

  window.eleicaoBlurSearch = function (id) {
    setTimeout(() => {
      const drop = document.getElementById(`eleicao-drop-${id}`);
      if (drop) drop.style.display = "none";
    }, 200);
  };

  window.eleicaoSetTipo = function (id, tipo) {
    const item = _items.find(i => i.id == id);
    if (!item) return;
    item.tipo = tipo;
    const el = document.getElementById(`eleicao-item-${id}`);
    if (el) el.outerHTML = _itemHTML(item);
  };

  window.eleicaoSetObs = function (id, val) {
    const item = _items.find(i => i.id == id);
    if (item) item.obs = val;
  };

  window.eleicaoAdicionarItem = function () {
    _adicionarItem();
    const c = document.getElementById("eleicao-items-container");
    if (c) c.insertAdjacentHTML("beforeend", _itemHTML(_items[_items.length - 1]));
    _syncRemoveBtns();
  };

  window.eleicaoRemoverItem = function (id) {
    _items = _items.filter(i => i.id != id);
    document.getElementById(`eleicao-item-${id}`)?.remove();
    _syncRemoveBtns();
  };

  function _syncRemoveBtns() {
    _items.forEach(it => {
      const el  = document.getElementById(`eleicao-item-${it.id}`);
      const btn = el?.querySelector(`[onclick*="eleicaoRemoverItem"]`);
      if (btn) btn.style.display = _items.length > 1 ? "" : "none";
    });
  }

  /* ── Submeter ────────────────────────────────────────── */
  window.eleicaoSubmeter = async function () {
    const msgEl = document.getElementById("eleicao-form-msg");
    const u = _usr();
    if (!u) { _msg(msgEl, "Usuário não identificado.", true); return; }

    const validos = _items.filter(i => i.indicado_id);
    if (!validos.length) {
      _msg(msgEl, "Selecione ao menos um membro para indicar.", true);
      return;
    }

    const vistos = new Set();
    for (const it of validos) {
      const key = `${it.indicado_id}-${it.tipo}`;
      if (vistos.has(key)) {
        _msg(msgEl, `Indicação duplicada: ${it.indicado_nome} (${it.tipo === "presbitero" ? "Presbítero" : "Diácono"}).`, true);
        return;
      }
      vistos.add(key);
    }

    if (await _jaIndicou()) {
      _msg(msgEl, "Você já enviou indicações para esta eleição.", false);
      await _renderFormulario();
      return;
    }

    const btn = document.querySelector('[onclick="eleicaoSubmeter()"]');
    if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }
    _msg(msgEl, "");

    const membro = _membros.find(m => m.pessoa_id === u.pessoa_id);
    const rows = validos.map(it => ({
      indicante_pessoa_id: u.pessoa_id,
      indicante_nome:      u.nome || "",
      indicado_pessoa_id:  it.indicado_id,
      indicado_nome:       it.indicado_nome,
      tipo:                it.tipo,
      observacao:          it.obs || null,
      congregacao:         membro?.congregacao || null,
      ip_dispositivo:      navigator.userAgent?.slice(0, 200) || null,
    }));

    try {
      const { error } = await _sb().from("eleicao_indicacoes").insert(rows);
      if (error) throw new Error(error.message);
      if (typeof T === "function") T("Indicações enviadas!", `${validos.length} indicação(ões) registrada(s).`);
      await _renderFormulario();
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = "Enviar indicações"; }
      _msg(msgEl, `Erro: ${e.message}`, true);
    }
  };

  function _msg(el, txt, erro) {
    if (!el) return;
    el.textContent = txt;
    el.style.color = erro ? "var(--rose)" : "var(--tx3)";
  }

  /* ═══════════════════════════════════════════════════════
     PAINEL ADMINISTRATIVO
  ═══════════════════════════════════════════════════════ */

  async function _renderPainel() {
    const el = document.getElementById("eleicao-painel-area");
    if (!el) return;
    el.innerHTML = `<div style="color:var(--tx3);font-size:12px;padding:28px 0">Carregando indicações...</div>`;

    try {
      const { data, error } = await _sb()
        .from("eleicao_indicacoes")
        .select("id,indicante_nome,indicado_nome,tipo,observacao,congregacao,criado_em")
        .is("deleted_at", null)
        .order("criado_em", { ascending: false });
      if (error) throw new Error(error.message);
      _indicacoes = data || [];
      _renderPainelHTML(el);
    } catch (e) {
      el.innerHTML = `<div style="color:var(--rose);font-size:12px;padding:16px">Erro: ${e.message}</div>`;
    }
  }

  function _renderPainelHTML(el) {
    if (!el) el = document.getElementById("eleicao-painel-area");
    if (!el) return;

    const total     = _indicacoes.length;
    const presb     = _indicacoes.filter(i => i.tipo === "presbitero").length;
    const diac      = _indicacoes.filter(i => i.tipo === "diacono").length;
    const indicantes = new Set(_indicacoes.map(i => i.indicante_nome)).size;

    // Ranking por indicado+tipo
    const cnt = {};
    _indicacoes.forEach(i => {
      const k = `${i.indicado_nome}||${i.tipo}`;
      if (!cnt[k]) cnt[k] = { nome: i.indicado_nome, tipo: i.tipo, n: 0 };
      cnt[k].n++;
    });
    const ranking = Object.values(cnt).sort((a, b) => b.n - a.n).slice(0, 10);

    const congregs = [...new Set(_indicacoes.map(i => i.congregacao || "Sede"))];

    let rows = _indicacoes;
    if (_filtroTipo    !== "todos")  rows = rows.filter(i => i.tipo === _filtroTipo);
    if (_filtroCongreg !== "todas")  rows = rows.filter(i => (i.congregacao || "Sede") === _filtroCongreg);

    const si = "padding:7px 10px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--tx1);font-size:12px";
    const thS = "text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);font-weight:700";
    const tdS = "padding:8px 10px;color:var(--tx2)";

    el.innerHTML = `
      <div class="kpis c4" style="margin-bottom:18px">
        <div class="kpi"><div class="kpi-ico" style="background:rgba(74,156,245,.12);color:var(--sky)">◎</div><div class="kpi-body"><div class="kpi-lbl">Total indicações</div><div class="kpi-val">${total}</div><div class="kpi-d nu">${indicantes} participante(s)</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(42,181,192,.12);color:var(--teal)">◈</div><div class="kpi-body"><div class="kpi-lbl">Presbíteros</div><div class="kpi-val">${presb}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(139,111,212,.12);color:var(--violet)">◉</div><div class="kpi-body"><div class="kpi-lbl">Diáconos</div><div class="kpi-val">${diac}</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:rgba(58,170,92,.12);color:var(--gr)">✓</div><div class="kpi-body"><div class="kpi-lbl">Membros participantes</div><div class="kpi-val">${indicantes}</div></div></div>
      </div>

      ${ranking.length ? `
      <div class="card" style="margin-bottom:14px">
        <div class="ctit">Mais Indicados</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
          ${ranking.map((r, i) => {
            const cor = r.tipo === "presbitero" ? "var(--sky)" : "var(--teal)";
            const max = ranking[0].n;
            return `<div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:10px;color:var(--tx4);width:18px;text-align:right;font-weight:700">${i+1}.</span>
              <div style="flex:1">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                  <span style="font-size:12.5px;color:var(--tx1);font-weight:600">${_esc(r.nome)}</span>
                  <span style="font-size:10px;padding:1px 9px;border-radius:8px;border:1px solid ${cor}44;color:${cor};background:${cor}11;white-space:nowrap;margin-left:10px">${r.tipo === "presbitero" ? "Presbítero" : "Diácono"} · ${r.n}x</span>
                </div>
                <div style="background:var(--bg-surface);border-radius:3px;height:5px">
                  <div style="height:100%;background:${cor};border-radius:3px;width:${Math.round(r.n/max*100)}%;opacity:.65"></div>
                </div>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>` : ""}

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div class="ctit" style="margin-bottom:0">Todas as Indicações</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <select onchange="eleicaoFiltroTipo(this.value)" style="${si}">
              <option value="todos"     ${_filtroTipo==="todos"?"selected":""}>Todos os tipos</option>
              <option value="presbitero"${_filtroTipo==="presbitero"?"selected":""}>Presbítero</option>
              <option value="diacono"   ${_filtroTipo==="diacono"?"selected":""}>Diácono</option>
            </select>
            <select onchange="eleicaoFiltroCongreg(this.value)" style="${si}">
              <option value="todas">Todas as congregações</option>
              ${congregs.map(c => `<option value="${_esc(c)}" ${_filtroCongreg===c?"selected":""}>${_esc(c)}</option>`).join("")}
            </select>
            <button onclick="eleicaoExportar()"
              style="padding:7px 14px;border-radius:6px;border:1px solid var(--bd2);background:var(--bg-surface);color:var(--tx2);font-size:12px;cursor:pointer">
              ⬇ CSV
            </button>
            <button onclick="eleicaoAtualizarPainel()"
              style="padding:7px 10px;border-radius:6px;border:none;background:var(--sky);color:#fff;font-size:12px;cursor:pointer" title="Atualizar">↻</button>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:var(--bg-surface);border-bottom:2px solid var(--sky)">
                <th style="${thS}">Nome Indicado</th>
                <th style="${thS}">Tipo</th>
                <th style="${thS}">Indicado por</th>
                <th style="${thS}">Congregação</th>
                <th style="${thS}">Data</th>
                <th style="${thS}">Observação</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map(r => {
                const cor = r.tipo === "presbitero" ? "var(--sky)" : "var(--teal)";
                const lbl = r.tipo === "presbitero" ? "Presbítero" : "Diácono";
                return `<tr style="border-bottom:1px solid var(--bd1)"
                  onmouseover="this.style.background='var(--bg-hover)'"
                  onmouseout="this.style.background=''">
                  <td style="${tdS};font-weight:600;color:var(--tx1)">${_esc(r.indicado_nome)}</td>
                  <td style="${tdS}"><span style="font-size:10px;padding:2px 9px;border-radius:6px;border:1px solid ${cor}44;color:${cor};background:${cor}11">${lbl}</span></td>
                  <td style="${tdS}">${_esc(r.indicante_nome || "—")}</td>
                  <td style="${tdS};font-size:11px;color:var(--tx3)">${_esc(r.congregacao || "Sede")}</td>
                  <td style="${tdS};font-size:11px;color:var(--tx3);white-space:nowrap">${_fmtDtHr(r.criado_em)}</td>
                  <td style="${tdS};font-size:11px;color:var(--tx3);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(r.observacao || "—")}</td>
                </tr>`;
              }).join("") : `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--tx3)">Nenhuma indicação encontrada.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  window.eleicaoFiltroTipo    = function (v) { _filtroTipo    = v; _renderPainelHTML(); };
  window.eleicaoFiltroCongreg = function (v) { _filtroCongreg = v; _renderPainelHTML(); };
  window.eleicaoAtualizarPainel = function () { _renderPainel(); };

  window.eleicaoExportar = function () {
    let rows = _indicacoes;
    if (_filtroTipo    !== "todos")  rows = rows.filter(i => i.tipo === _filtroTipo);
    if (_filtroCongreg !== "todas")  rows = rows.filter(i => (i.congregacao || "Sede") === _filtroCongreg);
    if (!rows.length) return;
    const hdr  = "Nome Indicado,Tipo,Indicado por,Congregação,Data,Observação";
    const body = rows.map(r => [
      `"${(r.indicado_nome||"").replace(/"/g,'""')}"`,
      r.tipo === "presbitero" ? "Presbítero" : "Diácono",
      `"${(r.indicante_nome||"").replace(/"/g,'""')}"`,
      `"${(r.congregacao||"Sede").replace(/"/g,'""')}"`,
      _fmtDtHr(r.criado_em),
      `"${(r.observacao||"").replace(/"/g,'""')}"`
    ].join(",")).join("\n");
    const blob = new Blob(["﻿" + hdr + "\n" + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `indicacoes_eleicao_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ═══════════════════════════════════════════════════════
     TABS E ENTRY POINT
  ═══════════════════════════════════════════════════════ */

  function _setTab(tab) {
    const isForm   = tab === "form";
    document.getElementById("eleicao-tab-form")  ?.classList.toggle("on",  isForm);
    document.getElementById("eleicao-tab-painel")?.classList.toggle("on", !isForm);
    document.getElementById("eleicao-area-form")  ?.toggleAttribute("hidden",  !isForm);
    document.getElementById("eleicao-area-painel")?.toggleAttribute("hidden",   isForm);
    if (isForm) _renderFormulario();
    else         _renderPainel();
  }

  window.eleicaoTabForm   = function () { _setTab("form"); };
  window.eleicaoTabPainel = function () { _setTab("painel"); };

  window.eleicaoInit = function () {
    _setTab(_isAdmin() ? "painel" : "form");
  };

})();
