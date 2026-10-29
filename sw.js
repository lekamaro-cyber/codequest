// Service worker de CodeQuest : l'appli installée fonctionne hors connexion et se met à jour toute seule.
// - Fichiers de l'appli : réseau d'abord (toujours la dernière version publiée), copie gardée pour le hors-ligne ;
//   si le réseau met plus de 3 s à répondre, on ouvre la copie gardée.
// - Polices et moteur SQL (CDN, adresses versionnées) : copie gardée d'abord, mise à jour en arrière-plan.
// Ce service worker ne touche qu'à ses propres caches (préfixe « codequest- ») : jamais à ceux d'Ajusto.

const CACHE = 'codequest-v1';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon-32.png'
];
const SLOW_NETWORK_MS = 3000;
const CDN_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('codequest-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromCache(request) {
  return caches.match(request, { ignoreSearch: true }).then((res) => {
    if (res) return res;
    // Navigation hors connexion vers une page inconnue : on ouvre l'appli.
    return request.mode === 'navigate' ? caches.match('./index.html') : undefined;
  });
}

function networkFirst(request) {
  const network = fetch(request.url, { cache: 'no-cache' }).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return res;
  });
  const slow = new Promise((resolve) => setTimeout(resolve, SLOW_NETWORK_MS)).then(() => fromCache(request));
  return Promise.race([network, slow])
    .then((res) => res || network)
    .catch(() => fromCache(request).then((res) => res || Response.error()));
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    const network = fetch(request).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return res;
    });
    return cached || network;
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    // Seulement les fichiers de CodeQuest (le site voisin, comme Ajusto, a son propre service worker).
    if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
    event.respondWith(networkFirst(request));
  } else if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request));
  }
});
