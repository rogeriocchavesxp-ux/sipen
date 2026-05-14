// ════════════════════════════════════════════════════════════════
// SIPEN — PWA: registro do Service Worker + Install Prompt
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const SW_URL   = '/sw.js';
  const DISMISS_KEY = 'sipen_pwa_dismissed';
  const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias

  let _deferredPrompt = null;
  let _swRegistration = null;

  // ── Registro do Service Worker ────────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', _registerSW);
  }

  async function _registerSW() {
    try {
      _swRegistration = await navigator.serviceWorker.register(SW_URL);

      // Detecta novo worker aguardando ativação
      _swRegistration.addEventListener('updatefound', _onUpdateFound);

      // Se um worker já estava ativo e um novo ficou waiting (retorno à página)
      if (_swRegistration.waiting) {
        _showUpdateBanner();
      }

      // Ouve mudanças de estado do controller (após skipWaiting)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

    } catch (err) {
      console.warn('[PWA] SW não registrado:', err.message);
    }
  }

  function _onUpdateFound() {
    const newWorker = _swRegistration.installing;
    if (!newWorker) return;
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        _showUpdateBanner();
      }
    });
  }

  // ── Install Prompt (Android/Desktop Chrome/Edge) ──────────────
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _deferredPrompt = e;
    _showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    _hideInstallBanner();
  });

  // ── API pública ───────────────────────────────────────────────

  /** Aciona o prompt nativo de instalação */
  window.pwaInstall = async function () {
    if (!_deferredPrompt) return;
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      _deferredPrompt = null;
      _hideInstallBanner();
    }
  };

  /** Dispensa o banner por 7 dias */
  window.pwaDismiss = function () {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    _hideInstallBanner();
  };

  /** Aplica atualização disponível e recarrega */
  window.pwaApplyUpdate = function () {
    if (_swRegistration?.waiting) {
      _swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    _hideUpdateBanner();
  };

  /** Dispensa o banner de atualização */
  window.pwaDismissUpdate = function () {
    _hideUpdateBanner();
  };

  // ── Banners ───────────────────────────────────────────────────

  function _showInstallBanner() {
    // Não mostra se já instalado como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (navigator.standalone) return;

    // Não mostra se foi dispensado recentemente
    const ts = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    if (Date.now() - ts < DISMISS_TTL) return;

    const el = document.getElementById('pwa-install-banner');
    if (el) el.classList.add('visible');
  }

  function _hideInstallBanner() {
    const el = document.getElementById('pwa-install-banner');
    if (el) el.classList.remove('visible');
  }

  function _showUpdateBanner() {
    const el = document.getElementById('pwa-update-banner');
    if (el) {
      el.classList.add('visible');
      return;
    }
    // Fallback: usa o Toast se disponível
    if (typeof T === 'function') {
      T('Atualização disponível', 'Clique em "Atualizar" para usar a versão mais recente.');
    }
  }

  function _hideUpdateBanner() {
    const el = document.getElementById('pwa-update-banner');
    if (el) el.classList.remove('visible');
  }

  // ── Detecta modo standalone ───────────────────────────────────
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;

  if (isStandalone) {
    document.documentElement.setAttribute('data-pwa', 'standalone');
  }

})();
