// ════════════════════════════════════════════════════════════════
// SIPEN — PWA: registro do Service Worker + Install Prompt
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const SW_URL      = '/sw.js';
  const DISMISS_KEY = 'sipen_pwa_dismissed';
  const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias

  let _deferredPrompt  = null;
  let _swRegistration  = null;

  // ── Detecção de plataforma ────────────────────────────────────
  const _isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const _isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;

  // Marca o <html> para CSS saber que está instalado
  if (_isStandalone) {
    document.documentElement.setAttribute('data-pwa', 'standalone');
  }

  // ── Registro do Service Worker ────────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', _registerSW);
  }

  async function _registerSW() {
    try {
      _swRegistration = await navigator.serviceWorker.register(SW_URL);
      _swRegistration.addEventListener('updatefound', _onUpdateFound);

      if (_swRegistration.waiting) _showUpdateBanner();

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    } catch (err) {
      console.warn('[PWA] SW não registrado:', err.message);
    }
  }

  function _onUpdateFound() {
    const w = _swRegistration.installing;
    if (!w) return;
    w.addEventListener('statechange', () => {
      if (w.state === 'installed' && navigator.serviceWorker.controller) {
        _showUpdateBanner();
      }
    });
  }

  // ── Install Prompt — Android / Chrome / Edge ──────────────────
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _deferredPrompt = e;
    _showInstallBanner();       // banner padrão com botão "Instalar"
  });

  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    _hideInstallBanner();
    _hideIOSBanner();
  });

  // ── iOS Safari: instrução manual ──────────────────────────────
  // beforeinstallprompt nunca dispara no iOS — exibe tutorial de como
  // usar Compartilhar → "Adicionar à Tela de Início"
  if (_isIOS && !_isStandalone) {
    // Aguarda 3 s para o usuário já ter visto a página
    window.addEventListener('load', () => {
      setTimeout(_maybeShowIOSBanner, 3000);
    });
  }

  function _maybeShowIOSBanner() {
    const ts = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    if (Date.now() - ts < DISMISS_TTL) return;
    _showIOSBanner();
  }

  function _showIOSBanner() {
    const el = document.getElementById('pwa-ios-banner');
    if (el) el.classList.add('visible');
  }

  function _hideIOSBanner() {
    const el = document.getElementById('pwa-ios-banner');
    if (el) el.classList.remove('visible');
  }

  // ── API pública ───────────────────────────────────────────────

  window.pwaInstall = async function () {
    if (!_deferredPrompt) return;
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    if (outcome === 'accepted') { _deferredPrompt = null; _hideInstallBanner(); }
  };

  window.pwaDismiss = function () {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    _hideInstallBanner();
    _hideIOSBanner();
  };

  window.pwaApplyUpdate = function () {
    if (_swRegistration?.waiting) {
      _swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    _hideUpdateBanner();
  };

  window.pwaDismissUpdate = function () { _hideUpdateBanner(); };

  // ── Banners Android/Desktop ───────────────────────────────────

  function _showInstallBanner() {
    if (_isStandalone) return;
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
    if (el) { el.classList.add('visible'); return; }
    if (typeof T === 'function') T('Atualização disponível', 'Recarregue para usar a versão mais recente.');
  }

  function _hideUpdateBanner() {
    const el = document.getElementById('pwa-update-banner');
    if (el) el.classList.remove('visible');
  }

})();
