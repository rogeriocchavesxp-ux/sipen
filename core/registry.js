(function () {
  'use strict';

  const _STATUS_LABEL = {
    "ABERTA":                "Aberta",
    "EM_ANALISE":            "Em Análise",
    "EM_ANDAMENTO":          "Em Andamento",
    "PENDENTE":              "Pendente",
    "AGUARDANDO_PAGAMENTO":  "Aguardando Pagamento",
    "PAGAMENTO_AGENDADO":    "Pagamento Agendado",
    "CONCLUIDA":             "Concluída",
    "PAGO":                  "Pago",
    "CANCELADA":             "Cancelada",
  };

  const _STATUS_DB = {
    "Aberta":                "ABERTA",
    "Em Análise":            "EM_ANALISE",
    "Em Andamento":          "EM_ANDAMENTO",
    "Pendente":              "PENDENTE",
    "Aguardando Pagamento":  "AGUARDANDO_PAGAMENTO",
    "Pagamento Agendado":    "PAGAMENTO_AGENDADO",
    "Concluída":             "CONCLUIDA",
    "Pago":                  "PAGO",
    "Cancelada":             "CANCELADA",
  };

  const _STATUS_FECHADO = ["CONCLUIDA", "PAGO", "CANCELADA"];

  const _STATUS_CFG = {
    "Aberta":               { bg:"rgba(74,156,245,.12)",  cl:"var(--sky)" },
    "Em Análise":           { bg:"rgba(212,168,67,.12)",  cl:"var(--amber)" },
    "Em Andamento":         { bg:"rgba(144,112,236,.12)", cl:"var(--purple)" },
    "Pendente":             { bg:"rgba(212,168,67,.12)",  cl:"var(--amber)" },
    "Aguardando Pagamento": { bg:"rgba(212,168,67,.12)",  cl:"var(--amber)" },
    "Pagamento Agendado":   { bg:"rgba(74,156,245,.12)",  cl:"var(--sky)" },
    "Concluída":            { bg:"rgba(58,170,92,.12)",   cl:"var(--grn)" },
    "Pago":                 { bg:"rgba(58,170,92,.12)",   cl:"var(--grn)" },
    "Cancelada":            { bg:"rgba(224,85,85,.12)",   cl:"var(--red)" },
  };

  window.SIPEN = window.SIPEN || {};

  window.SIPEN.status = {
    toDb:    function(st) { return _STATUS_DB[st]    || st || "ABERTA"; },
    toLabel: function(st) { return _STATUS_LABEL[st] || st || "Aberta"; },

    // aceita tanto valor DB ("CONCLUIDA") quanto label ("Concluída")
    fechado: function(st) {
      const db = _STATUS_DB[st] || st;
      return _STATUS_FECHADO.includes(db);
    },

    pill: function(st) {
      const label = _STATUS_LABEL[st] || st || "—";
      const safe  = typeof escapeHtml === "function" ? escapeHtml(label) : String(label);
      const s     = _STATUS_CFG[label] || { bg:"rgba(90,96,104,.15)", cl:"var(--tx3)" };
      return '<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;background:' + s.bg + ';color:' + s.cl + '">' + safe + '</span>';
    },
  };

  window.SIPEN.format = {
    nome:  function(s) { return !s ? "—" : s.replace(/\b\w/g, function(c) { return c.toUpperCase(); }); },
    tel:   function(s) { return !s ? "" : String(s).replace(/\D/g,"").replace(/^(\d{2})(\d{4,5})(\d{4})$/,"($1) $2-$3"); },
    moeda: function(n) { return (n == null ? 0 : Number(n) || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" }); },
  };

  // registry cross-módulo: usar has() antes de call() para evitar erro
  const _registry = {};
  window.SIPEN.register = function(key, fn) { _registry[key] = fn; };
  window.SIPEN.has      = function(key)     { return !!_registry[key]; };
  window.SIPEN.call     = function(key) {
    if (!_registry[key]) {
      console.warn("SIPEN.call: '" + key + "' não registrado");
      return undefined;
    }
    var args = Array.prototype.slice.call(arguments, 1);
    return _registry[key].apply(null, args);
  };

})();
