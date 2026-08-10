/* ════════════════════════════════════════════════════
   SIPEN Mobile — App Shell
   mobile/app.js · v1.0.0
   Auth, routing, navigation, toast, user menu
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── State ───────────────────────────────────────────── */
  let _user         = null;
  let _navStack     = [];
  let _curTab       = 'home';
  let _curPageState = null;
  let _toastTm;

  const TAB_TITLES = { home:'SIPEN', demandas:'Demandas', agenda:'Agenda', membros:'Membros', mais:'Mais' };
  const TABS       = new Set(['home', 'demandas', 'agenda', 'membros', 'mais']);
  const _renderers = {};

  /* ── Public API ──────────────────────────────────────── */
  window.mobGo              = mobGo;
  window.mobEsqueceuSenha   = mobEsqueceuSenha;
  window.mobBack           = mobBack;
  window.mobToast          = mobToast;
  window.mobSetTitle       = mobSetTitle;
  window.mobDoLogin        = mobDoLogin;
  window.mobDoLogout       = mobDoLogout;
  window.mobOpenUserSheet  = mobOpenUserSheet;
  window.mobCloseUserSheet = mobCloseUserSheet;
  window.mobRegisterPage   = (name, fn) => { _renderers[name] = fn; };
  window.MOB_USER          = null;

  /* ── Boot ────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    _boot();
  });

  async function _boot() {
    try {
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase client não inicializado');
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { _showLogin(); return; }
      await _loadUser(session);
      _showApp();
      mobGo('home');
    } catch (e) {
      console.error('[mob] boot error:', e);
      _showLogin();
    }
  }

  async function _loadUser(session) {
    const u = session.user;
    const nome = u.user_metadata?.full_name
              || u.user_metadata?.name
              || u.email.split('@')[0];
    _user = {
      id:       u.id,
      email:    u.email,
      nome,
      initials: nome.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase(),
    };
    window.MOB_USER = _user;
    const av = document.getElementById('mob-user-av');
    if (av) av.textContent = _user.initials;
  }

  /* ── Auth ────────────────────────────────────────────── */
  function _showLogin() {
    document.getElementById('mob-login').style.display = 'flex';
    document.getElementById('mob-app').style.display   = 'none';
    setTimeout(() => document.getElementById('mob-login-email')?.focus(), 200);
  }

  function _showApp() {
    document.getElementById('mob-login').style.display = 'none';
    document.getElementById('mob-app').style.display   = 'flex';
  }

  async function mobDoLogin() {
    const email    = document.getElementById('mob-login-email').value.trim();
    const password = document.getElementById('mob-login-senha').value;
    const btn      = document.getElementById('mob-login-btn');
    const err      = document.getElementById('mob-login-err');

    if (!email || !password) { err.textContent = 'Preencha e-mail e senha.'; return; }

    btn.disabled    = true;
    btn.textContent = 'Entrando…';
    err.textContent = '';

    try {
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase indisponível');
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[mob] login error:', error);
        err.textContent = error.message.includes('Invalid') ? 'E-mail ou senha incorretos.' : error.message;
        btn.disabled    = false;
        btn.textContent = 'Entrar';
        return;
      }
      await _loadUser(data.session);
      _showApp();
      mobGo('home');
    } catch (e) {
      console.error('[mob] login exception:', e);
      err.textContent = e.message || 'Erro ao conectar. Tente novamente.';
      btn.disabled    = false;
      btn.textContent = 'Entrar';
    }
  }

  async function mobEsqueceuSenha() {
    const email = document.getElementById('mob-login-email').value.trim();
    if (!email) {
      document.getElementById('mob-login-err').textContent = 'Digite seu e-mail primeiro.';
      return;
    }
    const btn = document.getElementById('mob-login-btn');
    btn.disabled = true;
    try {
      const sb = getSupabase();
      await sb.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/mobile.html',
      });
      document.getElementById('mob-login-err').style.color = 'var(--gr)';
      document.getElementById('mob-login-err').textContent = 'E-mail de redefinição enviado. Verifique sua caixa de entrada.';
    } catch (e) {
      document.getElementById('mob-login-err').textContent = 'Erro ao enviar e-mail.';
    } finally {
      btn.disabled = false;
    }
  }

  async function mobDoLogout() {
    await getSupabase().auth.signOut();
    _user = null;
    window.MOB_USER = null;
    mobCloseUserSheet();
    _showLogin();
  }

  /* ── Router ──────────────────────────────────────────── */
  function mobGo(page, params) {
    const isTab = TABS.has(page);

    if (isTab) {
      _curTab   = page;
      _navStack = [];
      _setTabActive(page);
    } else {
      if (_navStack.length === 0 || _navStack[_navStack.length - 1]?.page !== _curPage()) {
        _navStack.push({ page: _curPage(), params: _curParams() });
      }
    }

    _curPageState = { page, params };
    _renderPage(page, params);
    _updateBackBtn();
    mobSetTitle(params?.title || TAB_TITLES[page] || page);
  }

  function _curPage()   { return _curPageState?.page; }
  function _curParams() { return _curPageState?.params; }

  function mobBack() {
    if (_navStack.length === 0) return;
    const prev = _navStack.pop();
    _curPageState = prev;
    _renderPage(prev.page, prev.params);
    _updateBackBtn();
    mobSetTitle(prev.params?.title || TAB_TITLES[prev.page] || prev.page);
    if (TABS.has(prev.page)) _setTabActive(prev.page);
  }

  function _updateBackBtn() {
    const btn = document.getElementById('mob-back-btn');
    if (btn) btn.style.visibility = _navStack.length > 0 ? 'visible' : 'hidden';
  }

  function _setTabActive(tab) {
    document.querySelectorAll('.mob-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
  }

  function _renderPage(page, params) {
    const el = document.getElementById('mob-content');
    if (!el) return;
    el.scrollTop = 0;
    const fn = _renderers[page];
    if (!fn) {
      el.innerHTML = `<div class="mob-empty"><div class="mob-empty-icon">🚧</div><div class="mob-empty-text">Página em construção</div></div>`;
      return;
    }
    el.innerHTML = '';
    fn(el, params);
  }

  /* ── Header ──────────────────────────────────────────── */
  function mobSetTitle(title) {
    const logo  = document.getElementById('mob-header-logo');
    const titleEl = document.getElementById('mob-page-title');
    const isHome = (title === 'SIPEN');
    if (logo)    logo.style.display    = isHome ? 'block' : 'none';
    if (titleEl) { titleEl.style.display = isHome ? 'none' : 'block'; titleEl.textContent = title; }
  }

  /* ── User Menu ───────────────────────────────────────── */
  function mobOpenUserSheet() {
    const sheet = document.getElementById('mob-user-sheet');
    const info  = document.getElementById('mob-user-sheet-info');

    if (info && _user) {
      info.innerHTML = `
        <div class="mob-sheet-user-av">${_user.initials}</div>
        <div class="mob-sheet-user-name">${_user.nome}</div>
        <div class="mob-sheet-user-email">${_user.email}</div>
      `;
    }

    sheet.style.display = 'flex';
    requestAnimationFrame(() => sheet.classList.add('open'));
  }

  function mobCloseUserSheet() {
    const sheet = document.getElementById('mob-user-sheet');
    sheet.classList.add('closing');
    setTimeout(() => {
      sheet.style.display = 'none';
      sheet.classList.remove('open', 'closing');
    }, 260);
  }

  /* ── Toast ───────────────────────────────────────────── */
  function mobToast(msg, type = 'info') {
    const el = document.getElementById('mob-toast');
    if (!el) return;
    el.textContent = msg;
    el.className   = `mob-toast mob-toast--${type}`;
    el.style.display = 'block';
    clearTimeout(_toastTm);
    _toastTm = setTimeout(() => { el.style.display = 'none'; }, 3200);
  }

})();
