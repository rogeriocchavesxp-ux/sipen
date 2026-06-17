/* ══════════════════════════════════════════════════════
   SIPEN — Tema Claro/Escuro
   Preferência salva em localStorage sob a chave 'sipen-theme'.
   Valores válidos: 'dark' | 'light' | 'system'
══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const KEY  = 'sipen-theme';
  const ROOT = document.documentElement;
  const MQ   = window.matchMedia('(prefers-color-scheme: light)');

  function _resolve(pref) {
    if (pref === 'system') return MQ.matches ? 'light' : 'dark';
    return pref === 'light' ? 'light' : 'dark';
  }

  function _applyMeta(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'light' ? '#f0f2f5' : '#1a1d21';
  }

  function _renderToggle(pref) {
    const wrap = document.getElementById('sb-theme-toggle');
    if (!wrap) return;
    const opts = [
      { v: 'light',  icon: '☀', label: 'Claro'  },
      { v: 'system', icon: '⊙', label: 'Auto'   },
      { v: 'dark',   icon: '☽', label: 'Escuro' },
    ];
    wrap.innerHTML =
      '<div class="theme-seg">' +
        opts.map(o =>
          '<button class="theme-btn' + (o.v === pref ? ' on' : '') + '"' +
          ' onclick="setTheme(\'' + o.v + '\')"' +
          ' title="Tema ' + o.label + '">' +
          o.icon + '&nbsp;' + o.label +
          '</button>'
        ).join('') +
      '</div>';
  }

  function setTheme(pref) {
    localStorage.setItem(KEY, pref);
    const theme = _resolve(pref);
    ROOT.dataset.theme = theme;
    _applyMeta(theme);
    _renderToggle(pref);
  }
  window.setTheme = setTheme;

  window.renderThemeToggle = function () {
    _renderToggle(localStorage.getItem(KEY) || 'dark');
  };

  MQ.addEventListener('change', function () {
    const pref = localStorage.getItem(KEY) || 'dark';
    if (pref === 'system') {
      ROOT.dataset.theme = _resolve('system');
      _applyMeta(ROOT.dataset.theme);
    }
  });

  const _pref = localStorage.getItem(KEY) || 'dark';
  _applyMeta(_resolve(_pref));
  _renderToggle(_pref);
})();
