// ════════════════════════════════════════════════════════════════
// SIPEN — PWA v6.30.33
// Cria banners dinamicamente no JS — não depende do HTML em cache.
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const SW_URL      = '/sw.js';
  const DISMISS_KEY = 'sipen_pwa_dismissed';
  const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000;

  let _deferredPrompt = null;
  let _swRegistration = null;

  // ── Detecção ──────────────────────────────────────────────────
  const _isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

  const _isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;

  console.log('[PWA] isIOS=' + _isIOS + ' standalone=' + _isStandalone + ' ua=' + navigator.userAgent.slice(0, 80));

  if (_isStandalone) {
    document.documentElement.setAttribute('data-pwa', 'standalone');
  }

  // ── Injeta estilos do banner no <head> ────────────────────────
  // Inline para não depender do sipen.css em cache
  (function _injectStyles() {
    const s = document.createElement('style');
    s.id = 'pwa-styles';
    s.textContent = `
#pwa-ios-sheet {
  display: block;
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #212529;
  border-top: 1px solid rgba(255,255,255,.12);
  border-radius: 18px 18px 0 0;
  padding: 20px 20px 36px;
  z-index: 9999;
  box-shadow: 0 -8px 32px rgba(0,0,0,.6);
  font-family: -apple-system, system-ui, sans-serif;
  color: #e4e8ed;
  animation: _pwa_slide .3s ease;
}
@keyframes _pwa_slide { from{transform:translateY(100%)} to{transform:translateY(0)} }
#pwa-ios-sheet .pwa-hd {
  display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
}
#pwa-ios-sheet .pwa-ico {
  width: 48px; height: 48px; border-radius: 12px;
  background: #3aaa5c;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 900; color: #fff; flex-shrink: 0;
}
#pwa-ios-sheet .pwa-ttl { font-size: 15px; font-weight: 700; color: #e4e8ed; display: block; margin-bottom: 2px; }
#pwa-ios-sheet .pwa-sub { font-size: 12px; color: #7a8490; }
#pwa-ios-sheet ol { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; counter-reset: s; }
#pwa-ios-sheet ol li {
  counter-increment: s;
  display: flex; align-items: flex-start; gap: 12px;
  font-size: 14px; color: #a4adb8; line-height: 1.5;
}
#pwa-ios-sheet ol li::before {
  content: counter(s);
  min-width: 26px; height: 26px; border-radius: 50%;
  background: #2b2f33; border: 1px solid rgba(255,255,255,.12);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #3aaa5c; flex-shrink: 0;
}
#pwa-ios-sheet ol li strong { color: #e4e8ed; }
#pwa-ios-sheet .pwa-chip {
  display: inline-flex; align-items: center; gap: 5px;
  background: #2b2f33; border: 1px solid rgba(255,255,255,.12);
  border-radius: 6px; padding: 2px 8px;
  font-size: 12.5px; color: #e4e8ed; vertical-align: middle;
}
`;
    document.head.appendChild(s);
  })();

  // ── Cria o banner iOS dinamicamente ──────────────────────────
  function _createIOSSheet() {
    if (document.getElementById('pwa-ios-sheet')) return;
    const d = document.createElement('div');
    d.id = 'pwa-ios-sheet';
    d.innerHTML = `
      <div class="pwa-hd">
        <div class="pwa-ico">S</div>
        <div>
          <span class="pwa-ttl">Instalar o SIPEN</span>
          <span class="pwa-sub">Adicione à tela de início do iPhone</span>
        </div>
      </div>
      <ol>
        <li>Toque em <span class="pwa-chip">&#x2B06; Compartilhar</span> na barra inferior do Safari</li>
        <li>Role a lista e toque em <strong>"Adicionar à Tela de Início"</strong></li>
        <li>Toque em <strong>"Adicionar"</strong> no canto superior direito</li>
      </ol>`;
    document.body.appendChild(d);
    console.log('[PWA] banner iOS criado');
  }

  // ── Service Worker ────────────────────────────────────────────
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(SW_URL).then(reg => {
      _swRegistration = reg;
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) {
            if (typeof T === 'function') T('Atualização disponível', 'Recarregue a página para atualizar o SIPEN.');
          }
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
    }).catch(e => console.warn('[PWA] SW:', e.message));
  }

  // ── Install Prompt (Android / Chrome / Edge) ──────────────────
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _deferredPrompt = e;
    _showAndroidBanner();
  });
  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    const el = document.getElementById('pwa-android-banner');
    if (el) el.remove();
    const ios = document.getElementById('pwa-ios-sheet');
    if (ios) ios.remove();
  });

  function _showAndroidBanner() {
    if (_isStandalone) return;
    const ts = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    if (Date.now() - ts < DISMISS_TTL) return;
    let el = document.getElementById('pwa-android-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pwa-android-banner';
      el.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#212529;border:1px solid #3aaa5c;border-radius:8px;padding:12px 14px;z-index:9999;display:flex;align-items:center;gap:10px;max-width:min(400px,calc(100vw - 24px));box-shadow:0 8px 32px rgba(0,0,0,.5);font-family:system-ui,sans-serif;color:#e4e8ed;';
      el.innerHTML = `<div style="width:36px;height:36px;border-radius:9px;background:#3aaa5c;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;color:#fff;flex-shrink:0">S</div><div style="flex:1;min-width:0"><strong style="display:block;font-size:13px">Instalar SIPEN</strong><span style="font-size:11.5px;color:#a4adb8">Use como app no dispositivo</span></div><button onclick="pwaInstall()" style="background:#3aaa5c;color:#fff;border:none;border-radius:6px;padding:7px 13px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">Instalar</button><button onclick="pwaDismiss()" style="background:none;border:none;color:#7a8490;font-size:16px;cursor:pointer;padding:0 2px">✕</button>`;
      document.body.appendChild(el);
    }
  }

  window.pwaInstall = async function () {
    if (!_deferredPrompt) return;
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    if (outcome === 'accepted') { _deferredPrompt = null; document.getElementById('pwa-android-banner')?.remove(); }
  };

  window.pwaDismiss = function () {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    document.getElementById('pwa-android-banner')?.remove();
  };

  // ── Mostra banner iOS ─────────────────────────────────────────
  if (_isIOS && !_isStandalone) {
    _createIOSSheet();
  }

})();
