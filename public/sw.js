// Service worker PokeSmash : le jeu fonctionne hors-ligne une fois chargé ; les sprites déjà vus sont gardés en cache.
const SHELL = 'pokesmash-shell-v1', SPRITES = 'pokesmash-sprites-v1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== SPRITES).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.startsWith('/api/')) return;                // l'API n'est jamais mise en cache
  if (u.hostname === 'raw.githubusercontent.com' || u.hostname === 'unpkg.com' || u.hostname === 'cdn.jsdelivr.net') {   // sprites et PeerJS : cache d'abord
    e.respondWith(caches.open(SPRITES).then(async c => { const hit = await c.match(e.request); if (hit) return hit; try { const r = await fetch(e.request); if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone()); return r; } catch (err) { return hit || Response.error(); } }));
    return;
  }
  if (u.origin === location.origin) {                                                       // le jeu : réseau d'abord, cache en secours
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(SHELL).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html'))));
  }
});
