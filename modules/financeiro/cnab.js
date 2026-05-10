/* ═══════════════════════════════════════════════════════
   SIPEN — CNAB 240 Bradesco
   cnab.js · v1.2 · v6.30.18
   Geração de remessas e importação de retornos bancários.
═══════════════════════════════════════════════════════ */

(function () {
  let _remessas = [];
  let _retornos = [];
  let _itens = [];
  let _config = null;

  function _eh(v) { return typeof escapeHtml === "function" ? escapeHtml(v) : String(v ?? "").replace(/[&<>"']/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m])); }
  function _ea(v) { return typeof escapeHtmlAttr === "function" ? escapeHtmlAttr(v) : _eh(v); }
  function _toast(t, s) { if (typeof T === "function") T(t, s || ""); else alert([t, s].filter(Boolean).join("\n")); }
  function _api() { return apiBaseUrl(); }
  function _headers(x) { return apiHeaders(x || {}); }
  function _perms() { return typeof permissoesUsuario !== "undefined" ? permissoesUsuario : {}; }
  function _user() { return typeof USUARIO_ATUAL !== "undefined" ? USUARIO_ATUAL : null; }
  function _podeEditar() {
    const nivel = _perms().FINANCEIRO || "SEM_ACESSO";
    return _user()?.perfil === "ADMINISTRADOR_GERAL" || ["EDICAO", "COMPLETO"].includes(nivel);
  }
  function _money(v) { return Number(v || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" }); }
  function _date(v) { return v ? String(v).slice(0, 10).split("-").reverse().join("/") : "—"; }
  function _todayISO() { return new Date().toISOString().slice(0, 10); }
  function _digits(v) { return String(v || "").replace(/\D/g, ""); }
  function _normalizar(v) {
    return String(v ?? "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s.\-/@]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }
  function _pad(v, len, fill, align) {
    const raw = _normalizar(v);
    const chr = fill == null ? " " : String(fill).slice(0, 1);
    const txt = raw.length > len ? raw.slice(0, len) : raw;
    return align === "right" ? txt.padStart(len, chr) : txt.padEnd(len, chr);
  }
  function _num(v, len) { return _digits(v).slice(-len).padStart(len, "0"); }
  function _val(v, len) {
    const cents = Math.round(Number(v || 0) * 100);
    return String(Math.max(cents, 0)).padStart(len, "0").slice(-len);
  }
  function _data(v) {
    const s = String(v || _todayISO()).slice(0, 10);
    const [y, m, d] = s.split("-");
    return `${d || "01"}${m || "01"}${y || "1900"}`;
  }
  function _hora() {
    const d = new Date();
    return String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0") + String(d.getSeconds()).padStart(2, "0");
  }
  function _line(parts, label) {
    const out = parts.join("");
    if (out.length !== 240) throw new Error(`Linha CNAB inválida (${label}): ${out.length} chars`);
    return out;
  }
  async function _fetchJson(url, opts) {
    const res = await fetch(url, opts || { headers:_headers() });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message || e.details || `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }
  function _statusClass(st) {
    if (["processada", "pago", "liquidado"].includes(st)) return "pg";
    if (["erro", "rejeitado", "saldo_insuficiente", "conta_invalida", "pix_invalido", "erro_banco"].includes(st)) return "pn";
    if (st === "enviada" || st === "agendado") return "po";
    return "pd";
  }
  function _pill(st) { return `<span class="pill ${_statusClass(st)}">${_eh(st || "—")}</span>`; }

  async function _loadBase() {
    const [remessas, retornos] = await Promise.all([
      _fetchJson(`${_api()}/rest/v1/cnab_remessas?select=*&order=created_at.desc&limit=100`, { headers:_headers() }),
      _fetchJson(`${_api()}/rest/v1/cnab_retornos?select=*&order=created_at.desc&limit=50`, { headers:_headers() }).catch(() => []),
    ]);
    _remessas = remessas || [];
    _retornos = retornos || [];
  }
  async function _loadConfig() {
    const rows = await _fetchJson(`${_api()}/rest/v1/cnab_config_empresa?ativo=eq.true&select=*&limit=1`, { headers:_headers() });
    _config = rows?.[0] || null;
    return _config;
  }
  async function _loadPagamentos() {
    const qs = [
      "select=*",
      "deleted_at=is.null",
      "status=eq.pendente",
      "tipo_operacao=not.is.null",
      "order=vencimento.asc"
    ].join("&");
    const rows = await _fetchJson(`${_api()}/rest/v1/financeiro_solicitacoes?${qs}`, { headers:_headers() });
    return (rows || []).filter(r => r.tipo_operacao && Number(r.valor || 0) > 0);
  }

  function _headerArquivo(cfg, seq) {
    return _line([
      "237", "0000", "0", _pad("", 9), "2", _num(cfg.cnpj, 14), _pad(cfg.convenio || "", 20),
      _num(cfg.agencia, 5), _pad(cfg.agencia_dv || "", 1), _num(cfg.conta, 12), _pad(cfg.conta_dv, 1), _pad("", 1),
      _pad(cfg.nome_empresa, 30), _pad("BANCO BRADESCO S.A.", 30), _pad("", 10), "1", _data(),
      _hora(), _num(seq, 6), "089", "01600", _pad("", 20), _pad("", 20), _pad("", 29)
    ], "header arquivo");
  }
  function _headerLote(cfg, lote, forma, seq) {
    const formaLanc = { transferencia:"41", pix:"45", boleto:"30", tributo:"11" }[forma] || "41";
    return _line([
      "237", _num(lote, 4), "1", "C", "98", formaLanc, "045", " ", "2", _num(cfg.cnpj, 14), _pad(cfg.convenio || "", 20),
      _num(cfg.agencia, 5), _pad(cfg.agencia_dv || "", 1), _num(cfg.conta, 12), _pad(cfg.conta_dv, 1), _pad("", 1),
      _pad(cfg.nome_empresa, 30), _pad(`PAGAMENTOS ${forma}`, 40), _num(seq, 10), _data(), _data(), _pad("", 62), _pad("", 10)
    ], "header lote");
  }
  function _segmentoA(p, lote, seq) {
    const pix = p.tipo_operacao === "pix";
    return _line([
      "237", _num(lote, 4), "3", _num(seq, 5), "A", "0", "00", pix ? "009" : "018",
      _num(p.favorecido_banco || "000", 3), _num(p.favorecido_agencia, 5), _pad(p.favorecido_agencia_dv || "", 1),
      _num(p.favorecido_conta, 12), _pad(p.favorecido_conta_dv || "", 1), _pad("", 1), _pad(p.favorecido_nome || p.fornecedor, 30),
      _pad(p.id || seq, 20), _data(p.vencimento), "BRL", _num(0, 15), _val(p.valor, 15), _pad("", 20), _pad("", 8),
      _num(0, 15), _pad(p.finalidade || "", 40), pix ? _pad("", 4) : "0001", _pad("", 3), "0", "0", _pad("", 4), _pad("", 10)
    ], "segmento A");
  }
  function _tipoInscricao(cpfCnpj) {
    return _digits(cpfCnpj).length > 11 ? "2" : "1";
  }
  function _tipoPix(t) {
    return { cpf:"01", cnpj:"02", telefone:"03", email:"04", evp:"05" }[String(t || "").toLowerCase()] || "05";
  }
  function _segmentoB(p, lote, seq) {
    const cabecalho = ["237", _num(lote, 4), "3", _num(seq, 5), "B", " ", "00", _tipoInscricao(p.favorecido_cpf_cnpj), _num(p.favorecido_cpf_cnpj, 14)];
    if (p.tipo_operacao === "pix") {
      // PIX: chave ocupa posições 33-77 (45 chars); tipo chave em 78-79; restante brancos
      return _line([...cabecalho, _pad(p.favorecido_pix_chave || "", 45), _tipoPix(p.favorecido_pix_tipo), _pad("", 161)], "segmento B PIX");
    }
    // TED: layout padrão com campos de endereço
    return _line([
      ...cabecalho,
      _pad("", 30), _pad("", 5), _pad("", 15), _pad("", 15), _pad("", 20),
      _pad("", 2), _pad("", 3), _pad("", 5), _pad("", 15), _num(0, 10), _num(0, 10),
      _num(0, 15), _num(0, 15), _num(0, 15), _num(0, 15), _pad("", 2), _pad("", 16)
    ], "segmento B TED");
  }
  function _codigoBarras(v) { return _digits(v).slice(0, 48).padEnd(40, " ").slice(0, 40); }
  function _segmentoJ(p, lote, seq) {
    return _line([
      "237", _num(lote, 4), "3", _num(seq, 5), "J", "0", "00", _codigoBarras(p.codigo_barras || p.codigo_pagamento),
      _pad(p.favorecido_nome || p.fornecedor, 34), _data(p.vencimento), _val(p.valor, 15), _num(0, 15), _num(0, 15),
      _val(p.valor, 15), _pad(p.id || seq, 20), _pad("", 20), _data(p.vencimento), _pad("", 8), _num(0, 15), _pad("", 10)
    ], "segmento J");
  }
  function _segmentoO(p, lote, seq) {
    return _line([
      "237", _num(lote, 4), "3", _num(seq, 5), "O", "0", "00", _codigoBarras(p.codigo_barras || p.codigo_pagamento),
      _pad(p.favorecido_nome || p.fornecedor, 30), _data(p.vencimento), _val(p.valor, 15), _val(p.valor, 15),
      _pad(p.id || seq, 20), _data(p.vencimento), _pad("", 87)
    ], "segmento O");
  }
  function _trailerLote(lote, qtd, total) {
    return _line(["237", _num(lote, 4), "5", _pad("", 9), _num(qtd, 6), _val(total, 18), _num(0, 18), _num(0, 6), _pad("", 165), _pad("", 10)], "trailer lote");
  }
  function _trailerArquivo(qtdLotes, qtdRegistros) {
    return _line(["237", "9999", "9", _pad("", 9), _num(qtdLotes, 6), _num(qtdRegistros, 6), _num(0, 6), _pad("", 205)], "trailer arquivo");
  }
  function _buildCnab240(config, pagamentos, seqArquivo) {
    const tipos = [
      ["transferencia", 1],
      ["pix", 2],
      ["boleto", 3],
      ["tributo", 4],
    ];
    const linhas = [_headerArquivo(config, seqArquivo)];
    let lotes = 0;
    tipos.forEach(([tipo, lote]) => {
      const rows = pagamentos.filter(p => p.tipo_operacao === tipo);
      if (!rows.length) return;
      lotes++;
      linhas.push(_headerLote(config, lote, tipo, seqArquivo));
      let seq = 1;
      rows.forEach(p => {
        if (tipo === "transferencia" || tipo === "pix") {
          linhas.push(_segmentoA(p, lote, seq));
          linhas.push(_segmentoB(p, lote, seq + 1));
          seq += 2;
        } else if (tipo === "boleto") {
          linhas.push(_segmentoJ(p, lote, seq++));
        } else {
          linhas.push(_segmentoO(p, lote, seq++));
        }
      });
      linhas.push(_trailerLote(lote, rows.length + 2, rows.reduce((s, p) => s + Number(p.valor || 0), 0)));
    });
    linhas.push(_trailerArquivo(lotes, linhas.length + 1));
    return linhas.join("\r\n") + "\r\n";
  }
  function _parseValor(s) { return Number(String(s || "0").replace(/\D/g, "")) / 100; }
  function _parseData(s) {
    const d = String(s || "");
    if (d.length !== 8 || /^0+$/.test(d)) return null;
    return `${d.slice(4,8)}-${d.slice(2,4)}-${d.slice(0,2)}`;
  }
  function _statusOcorrencia(o) {
    const c = String(o || "").trim().slice(0, 2);
    return ({ "00":"pago", AG:"agendado", BD:"saldo_insuficiente", CD:"conta_invalida", PD:"pix_invalido", ER:"erro_banco", AC:"liquidado" }[c]) || "rejeitado";
  }
  function _parseCnab240Retorno(conteudo) {
    return String(conteudo || "").split(/\r?\n/).filter(Boolean).map(l => l.padEnd(240, " ")).filter(l => l[7] === "3").map(l => {
      const segmento = l[13];
      const ocorrencia = l.slice(230, 240).trim() || "00";
      const valor = segmento === "J" || segmento === "O" ? _parseValor(l.slice(144, 159)) : _parseValor(l.slice(162, 177) || l.slice(119, 134));
      const data = segmento === "J" || segmento === "O" ? _parseData(l.slice(199, 207)) : _parseData(l.slice(154, 162) || l.slice(93, 101));
      return {
        seq_lote: Number(l.slice(8, 13)) || null,
        segmento,
        ocorrencia,
        status: _statusOcorrencia(ocorrencia),
        valor_pago: valor,
        data_pagamento: data
      };
    });
  }

  function _renderLista() {
    const el = document.getElementById("cnab-remessas-body");
    if (!el) return;
    const total = _remessas.reduce((s, r) => s + Number(r.valor_total || 0), 0);
    const banner = !_config ? `
      <div class="card" style="border-left:3px solid var(--amber,#ca8a04);background:rgba(234,179,8,.07);padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;gap:12px">
        <div style="flex:1">
          <div style="font-weight:600;color:var(--amber,#ca8a04);font-size:13px">Configuração bancária ausente</div>
          <div style="font-size:12px;color:var(--tx2);margin-top:2px">Cadastre os dados da conta Bradesco para habilitar a geração de remessas.</div>
        </div>
        <button class="tbt" style="color:var(--amber,#ca8a04);border-color:rgba(202,138,4,.35)" onclick="cnabAbrirConfig()">Configurar Agora</button>
      </div>` : "";
    el.innerHTML = banner + `
      <div class="kpis c3" style="margin-bottom:14px">
        <div class="kpi"><div class="kpi-ico" style="background:var(--grbg,rgba(61,160,85,.14));color:var(--gr)">◇</div><div class="kpi-body"><div class="kpi-lbl">Remessas</div><div class="kpi-val">${_remessas.length}</div><div class="kpi-d nu">últimas 100</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--bluebg);color:var(--blue)">TXT</div><div class="kpi-body"><div class="kpi-lbl">Valor total</div><div class="kpi-val">${_money(total)}</div><div class="kpi-d nu">gerado no período</div></div></div>
        <div class="kpi"><div class="kpi-ico" style="background:var(--goldbg);color:var(--gold)">↩</div><div class="kpi-body"><div class="kpi-lbl">Retornos</div><div class="kpi-val">${_retornos.length}</div><div class="kpi-d wa">importados</div></div></div>
      </div>
      <div class="card">
        <div class="ctit">Remessas Bradesco <span class="csub">CNAB 240</span></div>
        ${_remessas.length ? `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="border-bottom:1px solid var(--bd2)">${["Seq.","Descrição","Pagamentos","Valor","Status","Criada em",""].map(h => `<th style="text-align:left;padding:8px 6px;color:var(--tx3);font-size:10px;text-transform:uppercase">${h}</th>`).join("")}</tr></thead>
          <tbody>${_remessas.map(r => `
            <tr style="border-bottom:1px solid var(--bd1)">
              <td style="padding:8px 6px;color:var(--tx1);font-weight:700">${_eh(r.numero_sequencial)}</td>
              <td style="padding:8px 6px;color:var(--tx1)">${_eh(r.descricao || "Remessa Bradesco")}</td>
              <td style="padding:8px 6px;color:var(--tx2)">${Number(r.total_pagamentos || 0)}</td>
              <td style="padding:8px 6px;color:var(--tx1);font-weight:700">${_money(r.valor_total)}</td>
              <td style="padding:8px 6px">${_pill(r.status)}</td>
              <td style="padding:8px 6px;color:var(--tx2)">${_date(r.created_at)}</td>
              <td style="padding:8px 6px;white-space:nowrap">
                <button class="tbt" style="font-size:10.5px;padding:4px 9px" onclick="cnabVerDetalhe('${_ea(r.id)}','remessa')">Detalhe</button>
                <button class="tbt" style="font-size:10.5px;padding:4px 9px" onclick="cnabExportar('${_ea(r.id)}')">Exportar</button>
              </td>
            </tr>`).join("")}</tbody>
        </table></div>` : `<div style="padding:18px 0;color:var(--tx3);font-size:12px">Nenhuma remessa gerada ainda.</div>`}
      </div>`;
  }

  function _openModal(html) {
    let modal = document.getElementById("cnab-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "cnab-modal";
      modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:360;display:flex;align-items:center;justify-content:center;padding:18px";
      modal.onclick = ev => { if (ev.target === modal) modal.remove(); };
      document.body.appendChild(modal);
    }
    modal.innerHTML = html;
  }
  function _closeModal() { document.getElementById("cnab-modal")?.remove(); }

  async function cnabInit() {
    const el = document.getElementById("cnab-remessas-body");
    if (el) el.innerHTML = `<div class="card" style="padding:28px;color:var(--tx3)">${typeof spinner === "function" ? spinner() : "⏳"} Carregando CNAB...</div>`;
    try { await Promise.all([_loadBase(), _loadConfig()]); _renderLista(); }
    catch (e) { if (el) el.innerHTML = `<div class="card" style="padding:24px;color:var(--rose)">Erro ao carregar CNAB: ${_eh(e.message)}</div>`; }
  }

  async function cnabGerarRemessa() {
    if (!_podeEditar()) return _toast("Acesso negado", "Sem permissão para gerar remessa.");
    try {
      const cfg = await _loadConfig();
      if (!cfg) {
        _toast("Configuração ausente", "Preencha os dados bancários antes de gerar remessa.");
        if (_podeEditar()) cnabAbrirConfig();
        return;
      }
      const pagamentos = await _loadPagamentos();
      if (!pagamentos.length) return _toast("Sem pagamentos", "Não há solicitações pendentes com tipo de operação CNAB.");
      _openModal(`
        <div style="width:min(980px,96vw);max-height:88vh;overflow:auto;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:20px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
            <div><div class="ctit" style="margin:0">Nova Remessa Bradesco</div><div style="font-size:11.5px;color:var(--tx3)">Selecione os pagamentos que entrarão no arquivo CNAB 240.</div></div>
            <button class="tbt" style="margin-left:auto" onclick="document.getElementById('cnab-modal').remove()">Fechar</button>
          </div>
          <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr style="border-bottom:1px solid var(--bd2)">${["","Favorecido","Operação","Valor","Vencimento","Dados bancários"].map(h => `<th style="text-align:left;padding:7px 6px;color:var(--tx3);font-size:10px;text-transform:uppercase">${h}</th>`).join("")}</tr></thead>
            <tbody>${_renderPagamentosRows(pagamentos)}</tbody>
          </table></div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
            <button class="tbt" onclick="document.getElementById('cnab-modal').remove()">Cancelar</button>
            <button class="tbt pri" id="cnab-confirmar-remessa" onclick="cnabConfirmarRemessa()">Gerar .TXT</button>
          </div>
        </div>`);
      window._cnabPagamentosTemp = pagamentos;
    } catch (e) { _toast("Erro", e.message); }
  }

  function _pagamentoValido(p) {
    if (!p.tipo_operacao || !(p.favorecido_nome || p.fornecedor) || !Number(p.valor || 0)) return false;
    if (["transferencia", "pix"].includes(p.tipo_operacao) && !p.favorecido_cpf_cnpj) return false;
    if (p.tipo_operacao === "transferencia") return !!(p.favorecido_banco && p.favorecido_agencia && p.favorecido_conta);
    if (p.tipo_operacao === "pix") return !!(p.favorecido_pix_tipo && p.favorecido_pix_chave);
    if (["boleto", "tributo"].includes(p.tipo_operacao)) return !!p.codigo_barras;
    return true;
  }

  function _pagamentoFaltando(p) {
    const falta = [];
    if (!(p.favorecido_nome || p.fornecedor)) falta.push("nome do favorecido");
    if (["transferencia", "pix"].includes(p.tipo_operacao) && !p.favorecido_cpf_cnpj) falta.push("CPF/CNPJ");
    if (p.tipo_operacao === "transferencia") {
      if (!p.favorecido_banco) falta.push("banco");
      if (!p.favorecido_agencia) falta.push("agência");
      if (!p.favorecido_conta) falta.push("conta");
    }
    if (p.tipo_operacao === "pix") {
      if (!p.favorecido_pix_chave) falta.push("chave PIX");
      if (!p.favorecido_pix_tipo) falta.push("tipo de chave PIX");
    }
    if (["boleto", "tributo"].includes(p.tipo_operacao) && !p.codigo_barras) falta.push("código de barras");
    return falta;
  }

  function _renderPagamentosRows(pagamentos) {
    return (pagamentos || []).map(p => {
      const ok = _pagamentoValido(p);
      const falta = _pagamentoFaltando(p);
      const podeEditar = typeof finEditarDadosCnab === "function";
      return `<tr style="border-bottom:1px solid var(--bd1)">
        <td style="padding:7px 6px"><input type="checkbox" class="cnab-pag-check" value="${_ea(p.id)}" ${ok ? "checked" : "disabled"}></td>
        <td style="padding:7px 6px;color:var(--tx1)">${_eh(p.favorecido_nome || p.fornecedor)}<div style="font-size:10.5px;color:var(--tx3)">${_eh(p.finalidade || "")}</div></td>
        <td style="padding:7px 6px">${_pill(p.tipo_operacao)}</td>
        <td style="padding:7px 6px;color:var(--tx1);font-weight:700">${_money(p.valor)}</td>
        <td style="padding:7px 6px;color:var(--tx2)">${_date(p.vencimento)}</td>
        ${ok
          ? `<td style="padding:7px 6px;color:var(--gr)">ok</td>`
          : `<td style="padding:7px 6px"><span style="color:var(--rose);font-size:11px">falta: ${_eh(falta.join(", "))}</span>${podeEditar ? `<button onclick="cnabEditarDadosPagamento('${_ea(p.id)}')" style="margin-left:6px;font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--bd2);background:var(--bg-card);color:var(--blue,#3b82f6);cursor:pointer">Preencher</button>` : ""}</td>`}
      </tr>`;
    }).join("");
  }

  async function cnabConfirmarRemessa() {
    if (!_podeEditar()) return _toast("Acesso negado", "Sem permissão para gerar remessa.");
    const btn = document.getElementById("cnab-confirmar-remessa");
    const old = btn?.textContent || "";
    if (btn) { btn.disabled = true; btn.textContent = "Gerando..."; }
    try {
      const ids = [...document.querySelectorAll(".cnab-pag-check:checked")].map(i => i.value);
      const pagamentos = (window._cnabPagamentosTemp || []).filter(p => ids.includes(String(p.id)));
      if (!pagamentos.length) throw new Error("Selecione pelo menos um pagamento válido.");
      const cfg = _config || await _loadConfig();
      const maxRows = await _fetchJson(`${_api()}/rest/v1/cnab_remessas?select=numero_sequencial&order=numero_sequencial.desc&limit=1`, { headers:_headers() });
      const seq = Number(maxRows?.[0]?.numero_sequencial || 0) + 1;
      const conteudo = _buildCnab240(cfg, pagamentos, seq);
      const total = pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0);
      const remRows = await _fetchJson(`${_api()}/rest/v1/cnab_remessas`, {
        method:"POST",
        headers:_headers({ "Prefer":"return=representation" }),
        body:JSON.stringify({
          numero_sequencial: seq,
          descricao: `Remessa Bradesco ${seq}`,
          banco:"237",
          agencia_empresa: cfg.agencia,
          conta_empresa: cfg.conta,
          conta_empresa_dv: cfg.conta_dv,
          cnpj_empresa: _digits(cfg.cnpj),
          nome_empresa: cfg.nome_empresa,
          total_pagamentos: pagamentos.length,
          valor_total: total,
          status:"gerada",
          conteudo_arquivo: conteudo
        })
      });
      const remessa = remRows?.[0];
      if (!remessa?.id) throw new Error("Remessa não retornou ID.");
      const itens = [];
      pagamentos.forEach((p, idx) => {
        const lote = { transferencia:1, pix:2, boleto:3, tributo:4 }[p.tipo_operacao] || 1;
        itens.push({ remessa_id:remessa.id, solicitacao_id:p.id, lote, numero_seq_lote:idx + 1, tipo_operacao:p.tipo_operacao, favorecido_nome:p.favorecido_nome || p.fornecedor, valor:p.valor, vencimento:p.vencimento || null });
      });
      await _fetchJson(`${_api()}/rest/v1/cnab_remessa_itens`, { method:"POST", headers:_headers({ "Prefer":"return=minimal" }), body:JSON.stringify(itens) });
      await Promise.all(pagamentos.map(p => _fetchJson(`${_api()}/rest/v1/financeiro_solicitacoes?id=eq.${encodeURIComponent(p.id)}`, {
        method:"PATCH",
        headers:_headers({ "Prefer":"return=minimal" }),
        body:JSON.stringify({ status:"em_processamento" })
      })));
      delete window._cnabPagamentosTemp;
      _closeModal();
      await cnabInit();
      await cnabExportar(remessa.id);
    } catch (e) { _toast("Erro ao gerar", e.message); }
    finally { if (btn) { btn.disabled = false; btn.textContent = old; } }
  }

  async function cnabExportar(remessaId) {
    try {
      const rows = await _fetchJson(`${_api()}/rest/v1/cnab_remessas?id=eq.${encodeURIComponent(remessaId)}&select=*`, { headers:_headers() });
      const rem = rows?.[0];
      if (!rem?.conteudo_arquivo) throw new Error("Remessa sem conteúdo de arquivo.");
      const bytes = new Uint8Array([...rem.conteudo_arquivo].map(ch => ch.charCodeAt(0) <= 255 ? ch.charCodeAt(0) : 32));
      const blob = new Blob([bytes], { type:"text/plain;charset=iso-8859-1" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `remessa_bradesco_${String(rem.numero_sequencial).padStart(3, "0")}_${_data().slice(0,8)}.txt`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      if (rem.status === "gerada") await _fetchJson(`${_api()}/rest/v1/cnab_remessas?id=eq.${encodeURIComponent(remessaId)}`, { method:"PATCH", headers:_headers({ "Prefer":"return=minimal" }), body:JSON.stringify({ status:"enviada" }) });
    } catch (e) { _toast("Erro ao exportar", e.message); }
  }

  async function cnabVerDetalhe(id, tipo) {
    go("cnab-detalhe");
    const body = document.getElementById("cnab-detalhe-body");
    if (body) body.innerHTML = `<div class="card" style="padding:28px;color:var(--tx3)">Carregando detalhe...</div>`;
    try {
      const rem = (await _fetchJson(`${_api()}/rest/v1/cnab_remessas?id=eq.${encodeURIComponent(id)}&select=*`, { headers:_headers() }))?.[0];
      _itens = await _fetchJson(`${_api()}/rest/v1/cnab_remessa_itens?remessa_id=eq.${encodeURIComponent(id)}&select=*&order=lote.asc,numero_seq_lote.asc`, { headers:_headers() });
      document.getElementById("cnab-detalhe-titulo").textContent = `Remessa ${rem?.numero_sequencial || ""}`;
      const btn = document.getElementById("cnab-detalhe-exportar-btn");
      if (btn) btn.onclick = () => cnabExportar(id);
      if (body) body.innerHTML = `
        <div class="kpis c3" style="margin-bottom:14px">
          <div class="kpi"><div class="kpi-body"><div class="kpi-lbl">Status</div><div class="kpi-val">${_eh(rem?.status || "—")}</div></div></div>
          <div class="kpi"><div class="kpi-body"><div class="kpi-lbl">Pagamentos</div><div class="kpi-val">${Number(rem?.total_pagamentos || 0)}</div></div></div>
          <div class="kpi"><div class="kpi-body"><div class="kpi-lbl">Valor</div><div class="kpi-val">${_money(rem?.valor_total)}</div></div></div>
        </div>
        <div class="card">
          <div class="ctit">Itens da remessa</div>
          ${_itens.length ? _itens.map(i => `<div class="trow"><div class="tdot" style="background:var(--gr)"></div><div class="tbody"><div class="ttitle">${_eh(i.favorecido_nome)}</div><div class="tmeta">Lote ${_eh(i.lote)} · ${_eh(i.tipo_operacao)} · ${_date(i.vencimento)}</div></div><div class="tright">${_money(i.valor)}<div style="margin-top:4px">${_pill(i.status_retorno)}</div></div></div>`).join("") : `<div style="color:var(--tx3);font-size:12px">Sem itens.</div>`}
        </div>`;
    } catch (e) { if (body) body.innerHTML = `<div class="card" style="padding:24px;color:var(--rose)">Erro: ${_eh(e.message)}</div>`; }
  }

  async function cnabImportarRetorno() {
    if (!_podeEditar()) return _toast("Acesso negado", "Sem permissão para importar retorno.");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.ret";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const conteudo = await file.text();
      const remessas = await _fetchJson(`${_api()}/rest/v1/cnab_remessas?status=eq.enviada&select=id,numero_sequencial,descricao,valor_total&order=created_at.desc&limit=50`, { headers:_headers() });
      if (!remessas?.length) return _toast("Sem remessa enviada", "Não há remessas enviadas para conciliar.");
      _openModal(`
        <div style="width:min(520px,94vw);background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:20px">
          <div class="ctit">Importar retorno Bradesco</div>
          <select id="cnab-ret-remessa" style="width:100%;margin:12px 0;padding:9px 12px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg-card));color:var(--tx1)">
            ${remessas.map(r => `<option value="${_ea(r.id)}">Remessa ${_eh(r.numero_sequencial)} · ${_money(r.valor_total)}</option>`).join("")}
          </select>
          <div style="display:flex;justify-content:flex-end;gap:8px">
            <button class="tbt" onclick="document.getElementById('cnab-modal').remove()">Cancelar</button>
            <button class="tbt pri" onclick="cnabProcessarRetorno(document.getElementById('cnab-ret-remessa').value, window._cnabRetornoConteudo)">Processar</button>
          </div>
        </div>`);
      window._cnabRetornoConteudo = conteudo;
      window._cnabRetornoNome = file.name;
    };
    input.click();
  }

  async function cnabProcessarRetorno(remessaId, conteudo) {
    if (!_podeEditar()) return _toast("Acesso negado", "Sem permissão para processar retorno.");
    try {
      const parsed = _parseCnab240Retorno(conteudo);
      const itensRemessa = await _fetchJson(`${_api()}/rest/v1/cnab_remessa_itens?remessa_id=eq.${encodeURIComponent(remessaId)}&select=*`, { headers:_headers() });
      const totalPagos = parsed.filter(i => ["pago", "liquidado"].includes(i.status));
      const retRows = await _fetchJson(`${_api()}/rest/v1/cnab_retornos`, {
        method:"POST",
        headers:_headers({ "Prefer":"return=representation" }),
        body:JSON.stringify({
          remessa_id:remessaId,
          nome_arquivo:window._cnabRetornoNome || "retorno.txt",
          total_registros:parsed.length,
          total_pagos:totalPagos.length,
          total_rejeitados:parsed.length - totalPagos.length,
          valor_total_pago:totalPagos.reduce((s, i) => s + Number(i.valor_pago || 0), 0),
          conteudo_arquivo:conteudo
        })
      });
      const retorno = retRows?.[0];
      const payload = parsed.map((p, idx) => {
        const remItem = itensRemessa?.find(i => Number(i.numero_seq_lote) === Number(p.seq_lote)) || itensRemessa?.[idx] || null;
        return {
          retorno_id:retorno.id,
          remessa_item_id:remItem?.id || null,
          solicitacao_id:remItem?.solicitacao_id || null,
          numero_seq_lote:p.seq_lote,
          ocorrencia:p.ocorrencia,
          descricao_ocorrencia:p.status,
          valor_pago:p.valor_pago,
          data_pagamento:p.data_pagamento,
          status:p.status
        };
      });
      if (payload.length) await _fetchJson(`${_api()}/rest/v1/cnab_retorno_itens`, { method:"POST", headers:_headers({ "Prefer":"return=minimal" }), body:JSON.stringify(payload) });
      await Promise.all(payload.filter(i => ["pago", "liquidado"].includes(i.status) && i.solicitacao_id).map(i => _fetchJson(`${_api()}/rest/v1/financeiro_solicitacoes?id=eq.${encodeURIComponent(i.solicitacao_id)}`, { method:"PATCH", headers:_headers({ "Prefer":"return=minimal" }), body:JSON.stringify({ status:"pago" }) })));
      await _fetchJson(`${_api()}/rest/v1/cnab_remessas?id=eq.${encodeURIComponent(remessaId)}`, { method:"PATCH", headers:_headers({ "Prefer":"return=minimal" }), body:JSON.stringify({ status:"processada" }) });
      _closeModal();
      await cnabInit();
      _toast("Retorno processado", `${parsed.length} registros conciliados.`);
    } catch (e) { _toast("Erro no retorno", e.message); }
  }

  async function cnabEditarDadosPagamento(id) {
    // Busca direto do Supabase — não depende de _SOLICITACOES do módulo financeiro
    let r;
    try {
      const rows = await _fetchJson(`${_api()}/rest/v1/financeiro_solicitacoes?id=eq.${encodeURIComponent(id)}&select=*&limit=1`, { headers: _headers() });
      r = rows?.[0];
    } catch(e) { _toast("Erro", e.message); return; }
    if (!r) { _toast("Erro", "Registro não encontrado."); return; }

    document.getElementById("cnab-preencher-modal")?.remove();

    const tipo = r.tipo_operacao || "";
    const _cp = (fid, label, val, ph) => `<div>
      <label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">${label}</label>
      <input id="${fid}" type="text" value="${_ea(val || "")}" placeholder="${_ea(ph || "")}"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg-card));color:var(--tx1);font-size:12.5px;outline:none">
    </div>`;

    const wrap = document.createElement("div");
    wrap.id = "cnab-preencher-modal";
    wrap.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px";
    wrap.onclick = ev => { if (ev.target === wrap) wrap.remove(); };
    wrap.innerHTML = `
      <div style="width:min(600px,96vw);max-height:90vh;overflow:auto;background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:20px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--tx1)">Dados CNAB — Preencher</div>
            <div style="font-size:11.5px;color:var(--tx3);margin-top:3px">${_eh(r.fornecedor || r.finalidade || "Solicitação financeira")}</div>
          </div>
          <button style="margin-left:auto;background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer" onclick="document.getElementById('cnab-preencher-modal').remove()">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">Tipo de operação</label>
            <select id="cp-tipo" onchange="cnabPreencherTipoChange()" style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
              <option value="">Sem CNAB</option>
              <option value="transferencia" ${tipo==="transferencia"?"selected":""}>Transferência TED</option>
              <option value="pix" ${tipo==="pix"?"selected":""}>PIX</option>
              <option value="boleto" ${tipo==="boleto"?"selected":""}>Boleto</option>
              <option value="tributo" ${tipo==="tributo"?"selected":""}>Tributo</option>
            </select>
          </div>
          ${_cp("cp-nome", "Favorecido — nome", r.favorecido_nome || r.fornecedor, "Nome completo / razão social")}
          ${_cp("cp-doc", "Favorecido — CPF/CNPJ", r.favorecido_cpf_cnpj, "Somente números")}
        </div>
        <div id="cp-ted" style="display:${tipo==="transferencia"?"grid":"none"};grid-template-columns:1fr 1fr 80px 1fr 80px;gap:12px;margin-bottom:12px">
          ${_cp("cp-banco","Banco",r.favorecido_banco,"237")}
          ${_cp("cp-ag","Agência",r.favorecido_agencia,"0000")}
          ${_cp("cp-ag-dv","DV",r.favorecido_agencia_dv,"0")}
          ${_cp("cp-conta","Conta",r.favorecido_conta,"000000")}
          ${_cp("cp-conta-dv","DV",r.favorecido_conta_dv,"0")}
        </div>
        <div id="cp-pix" style="display:${tipo==="pix"?"grid":"none"};grid-template-columns:180px 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">Tipo de chave PIX</label>
            <select id="cp-pix-tipo" style="width:100%;box-sizing:border-box;background:var(--bg-input,var(--bg-card));border:1px solid var(--bd2);border-radius:8px;color:var(--tx1);font-size:12.5px;padding:8px 10px;outline:none">
              ${["cpf","cnpj","telefone","email","evp"].map(t=>`<option value="${t}" ${String(r.favorecido_pix_tipo||"")===t?"selected":""}>${t.toUpperCase()}</option>`).join("")}
            </select>
          </div>
          ${_cp("cp-pix-chave","Chave PIX",r.favorecido_pix_chave,"CPF, CNPJ, telefone, e-mail ou EVP")}
        </div>
        <div id="cp-codigo" style="display:${["boleto","tributo"].includes(tipo)?"block":"none"};margin-bottom:12px">
          ${_cp("cp-cod-barras","Código de barras / linha digitável",r.codigo_barras||r.codigo_pagamento,"Linha digitável ou código de barras")}
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;border-top:1px solid var(--bd1);padding-top:14px">
          <button class="tbt" onclick="document.getElementById('cnab-preencher-modal').remove()">Cancelar</button>
          <button class="tbt pri" id="cp-save" onclick="cnabSalvarDadosPagamento('${_ea(id)}')">Salvar dados</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
  }

  window.cnabPreencherTipoChange = function() {
    const tipo = document.getElementById("cp-tipo")?.value || "";
    document.getElementById("cp-ted").style.display    = tipo === "transferencia" ? "grid"  : "none";
    document.getElementById("cp-pix").style.display    = tipo === "pix"           ? "grid"  : "none";
    document.getElementById("cp-codigo").style.display = ["boleto","tributo"].includes(tipo) ? "block" : "none";
  };

  window.cnabSalvarDadosPagamento = async function(id) {
    const btn = document.getElementById("cp-save");
    const old = btn?.textContent || "";
    if (btn) { btn.disabled = true; btn.textContent = "Salvando..."; }
    try {
      const _v = fid => (document.getElementById(fid)?.value || "").trim();
      const tipo = _v("cp-tipo");
      const payload = {
        tipo_operacao:         tipo || null,
        favorecido_nome:       _v("cp-nome") || null,
        favorecido_cpf_cnpj:   _v("cp-doc").replace(/\D/g,"") || null,
        favorecido_banco:      _v("cp-banco").replace(/\D/g,"") || null,
        favorecido_agencia:    _v("cp-ag").replace(/\D/g,"") || null,
        favorecido_agencia_dv: _v("cp-ag-dv") || null,
        favorecido_conta:      _v("cp-conta").replace(/\D/g,"") || null,
        favorecido_conta_dv:   _v("cp-conta-dv") || null,
        favorecido_pix_tipo:   tipo === "pix" ? (_v("cp-pix-tipo") || null) : null,
        favorecido_pix_chave:  tipo === "pix" ? (_v("cp-pix-chave") || null) : null,
        codigo_barras:         ["boleto","tributo"].includes(tipo) ? (_v("cp-cod-barras").replace(/\D/g,"") || null) : null,
        updated_at:            new Date().toISOString()
      };
      await _fetchJson(
        `${_api()}/rest/v1/financeiro_solicitacoes?id=eq.${encodeURIComponent(id)}`,
        { method:"PATCH", headers:_headers({ "Prefer":"return=minimal" }), body:JSON.stringify(payload) }
      );
      document.getElementById("cnab-preencher-modal")?.remove();
      _toast("Dados salvos", "Pagamento atualizado.");
      const novos = await _loadPagamentos();
      window._cnabPagamentosTemp = novos;
      const tbody = document.querySelector("#cnab-modal tbody");
      if (tbody) tbody.innerHTML = _renderPagamentosRows(novos);
    } catch(e) {
      _toast("Erro ao salvar", e.message);
      if (btn) { btn.disabled = false; btn.textContent = old; }
    }
  };

  function _cfgCampo(id, label, value, placeholder) {
    return `<div>
      <label style="font-size:11px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px">${label}</label>
      <input id="${_ea(id)}" type="text" value="${_ea(value)}" placeholder="${_ea(placeholder)}"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg-input,var(--bg-card));color:var(--tx1);font-size:12.5px;outline:none">
    </div>`;
  }

  async function cnabAbrirConfig() {
    if (!_podeEditar()) return _toast("Acesso negado", "Sem permissão para configurar.");
    const cfg = _config || await _loadConfig().catch(() => null);
    _openModal(`
      <div style="width:min(520px,96vw);background:var(--bg-card);border:1px solid var(--bd2);border-radius:10px;padding:24px">
        <div class="ctit" style="margin:0 0 18px">Configuração Bancária — Bradesco CNAB 240</div>
        <div style="display:grid;gap:12px">
          <div style="display:grid;grid-template-columns:1fr 80px;gap:12px">
            ${_cfgCampo("cnab-cfg-agencia", "Agência *", cfg?.agencia || "", "0118")}
            ${_cfgCampo("cnab-cfg-agencia-dv", "DV", cfg?.agencia_dv || "", "0")}
          </div>
          <div style="display:grid;grid-template-columns:1fr 80px;gap:12px">
            ${_cfgCampo("cnab-cfg-conta", "Conta Corrente *", cfg?.conta || "", "208606")}
            ${_cfgCampo("cnab-cfg-conta-dv", "DV *", cfg?.conta_dv || "", "9")}
          </div>
          ${_cfgCampo("cnab-cfg-cnpj", "CNPJ *", cfg?.cnpj || "", "62.946.058/0001-80")}
          ${_cfgCampo("cnab-cfg-nome", "Nome da Empresa *", cfg?.nome_empresa || "", "IGREJA PRESBITERIANA DA PENHA")}
          ${_cfgCampo("cnab-cfg-convenio", "Nº Convênio (opcional)", cfg?.convenio || "", "")}
          <div style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="cnab-cfg-ativo" ${cfg?.ativo !== false ? "checked" : ""}>
            <label for="cnab-cfg-ativo" style="font-size:12.5px;color:var(--tx2);cursor:pointer">Configuração ativa</label>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
            <button class="tbt" onclick="document.getElementById('cnab-modal').remove()">Cancelar</button>
            <button class="tbt pri" id="cnab-cfg-save-btn" onclick="cnabSalvarConfig()">Salvar</button>
          </div>
        </div>
      </div>`);
  }

  async function cnabSalvarConfig() {
    if (!_podeEditar()) return _toast("Acesso negado", "Sem permissão para configurar.");
    const agencia    = (document.getElementById("cnab-cfg-agencia")?.value || "").replace(/\D/g, "");
    const agencia_dv = (document.getElementById("cnab-cfg-agencia-dv")?.value || "").trim();
    const conta      = (document.getElementById("cnab-cfg-conta")?.value || "").replace(/\D/g, "");
    const conta_dv   = (document.getElementById("cnab-cfg-conta-dv")?.value || "").trim();
    const cnpj       = (document.getElementById("cnab-cfg-cnpj")?.value || "").replace(/\D/g, "");
    const nome       = (document.getElementById("cnab-cfg-nome")?.value || "").trim().toUpperCase();
    const convenio   = (document.getElementById("cnab-cfg-convenio")?.value || "").trim();
    const ativo      = document.getElementById("cnab-cfg-ativo")?.checked ?? true;
    if (!agencia || !conta || !conta_dv || !cnpj || !nome) {
      return _toast("Campos obrigatórios", "Preencha agência, conta, dígito, CNPJ e nome da empresa.");
    }
    const payload = { banco:"237", agencia, agencia_dv:agencia_dv||"0", conta, conta_dv, cnpj, nome_empresa:nome, convenio, ativo };
    const btn = document.getElementById("cnab-cfg-save-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Salvando..."; }
    try {
      let rows;
      if (_config?.id) {
        rows = await _fetchJson(`${_api()}/rest/v1/cnab_config_empresa?id=eq.${encodeURIComponent(_config.id)}`, {
          method:"PATCH", headers:_headers({ "Content-Type":"application/json", "Prefer":"return=representation" }),
          body:JSON.stringify(payload)
        });
      } else {
        rows = await _fetchJson(`${_api()}/rest/v1/cnab_config_empresa`, {
          method:"POST", headers:_headers({ "Content-Type":"application/json", "Prefer":"return=representation" }),
          body:JSON.stringify(payload)
        });
      }
      _config = rows?.[0] || payload;
      _closeModal();
      _renderLista();
      _toast("Configuração salva", "Dados bancários atualizados com sucesso.");
    } catch (e) {
      _toast("Erro ao salvar", e.message);
      if (btn) { btn.disabled = false; btn.textContent = "Salvar"; }
    }
  }

  window.cnabInit = cnabInit;
  window.cnabGerarRemessa = cnabGerarRemessa;
  window.cnabConfirmarRemessa = cnabConfirmarRemessa;
  window.cnabExportar = cnabExportar;
  window.cnabImportarRetorno = cnabImportarRetorno;
  window.cnabVerDetalhe = cnabVerDetalhe;
  window.cnabProcessarRetorno = cnabProcessarRetorno;
  window.cnabEditarDadosPagamento = cnabEditarDadosPagamento;
  window.cnabAbrirConfig  = cnabAbrirConfig;
  window.cnabSalvarConfig = cnabSalvarConfig;

  const _goOrig = window.go;
  window.go = function (id, ...args) {
    const ret = _goOrig(id, ...args);
    if (id === "cnab-remessas") cnabInit();
    return ret;
  };
})();
