// Le « service worker » : un petit programme que le navigateur garde de côté
// pour que le jeu s'ouvre même sans réseau.
// - la page elle-même : on demande d'abord au réseau (pour avoir la dernière
//   version), et on se rabat sur la copie gardée si on est hors ligne ;
// - le reste (code, police, icônes) : la copie gardée d'abord. Leurs noms
//   changent à chaque nouvelle version, donc une copie n'est jamais périmée.
const CACHE = 'brick-tetris-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  e.respondWith(
    caches.match(request).then(
      (cached) => cached
        || fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
