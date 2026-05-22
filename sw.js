// ════════════════════════════════════════════════════════════════
// SIPEN — Service Worker
// Estratégia: network-first com cache fallback para o app shell.
// Nunca cacheamos chamadas à API do Supabase (dados sensíveis).
//
// ⚠ Ao fazer deploy de uma nova versão, incremente CACHE_VERSION.
// ════════════════════════════════════════════════════════════════

const CACHE_VERSION = 'sipen-v6.30.88';

// Base path — detectado automaticamente para funcionar em qualquer subdiretório
// Ex.: GitHub Pages em /sipen/ → BASE = '/sipen'
//      Domínio próprio em /  → BASE = ''
const BASE = self.location.pathname.replace(/\/sw\.js$/, '');

const OFFLINE_URL = BASE + '/offline.html';

// Arquivos do app shell — cacheados no install
const APP_SHELL = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/sipen.css',
  BASE + '/offline.html',
  BASE + '/manifest.json',
  BASE + '/icons/icon-192.png',
  BASE + '/icons/icon-512.png',
  BASE + '/icons/apple-touch-icon.png',
  BASE + '/core/router.js',
  BASE + '/core/api.js',
  BASE + '/core/auth.js',
  BASE + '/core/init.js',
  BASE + '/core/ui.js',
  BASE + '/core/pwa.js',
  BASE + '/core/theme.js',
];

// Padrões que NUNCA devem ser cacheados (API Supabase)
const NETWORK_ONLY_RE = /supabase\.co\/(rest|auth|storage|realtime|functions)\//;

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  // Ativa imediatamente sem esperar o SW antigo liberar clientes
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return Promise.allSettled(
        APP_SHELL.map(url => cache.add(url).catch(() => null))
      );
    })
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => clients.claim())
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = request.url;

  // Ignorar: não-GET, chrome-extension, data URIs etc.
  if (request.method !== 'GET') return;
  if (!url.startsWith('http'))  return;

  // Supabase API → network only, sem interferência
  if (NETWORK_ONLY_RE.test(url)) return;

  // Navegação (document): network-first, fallback para index.html em cache,
  // último recurso offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() =>
          caches.match(BASE + '/index.html').then(r => r || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Recursos estáticos: network-first, atualiza cache no sucesso,
  // serve cache se a rede falhar
  event.respondWith(
    caches.open(CACHE_VERSION).then(cache =>
      fetch(request)
        .then(response => {
          // Só cacheia respostas válidas e de mesma origem / CDNs confiáveis
          if (response.ok && response.status < 400) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cache.match(request))
    )
  );
});

// ─── Message: skipWaiting (acionado pelo pwa.js ao detectar atualização) ─────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
