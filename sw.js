'use strict';
/*
  Modo sin internet: guarda una copia de la app en el navegador.
  - Con internet siempre se usa la versión más nueva (y se actualiza la copia).
  - Sin internet se abre la copia guardada.
  Los archivos se leen de index.html, así que no hay una lista que mantener.
*/
const CACHE = 'jmg-english-app';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const NETWORK_WAIT_MS = 4000;   // si la red no responde en este tiempo y hay copia, se usa la copia

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const page = await fetch('./index.html', { cache: 'no-cache' });
    const html = await page.clone().text();
    const files = [...html.matchAll(/(?:src|href)="((?:js|css|assets)\/[^"]+|manifest\.webmanifest)"/g)].map((m) => './' + m[1]);
    await cache.put('./index.html', page);
    await cache.addAll(files);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) event.respondWith(networkFirst(req));
  else if (FONT_HOSTS.includes(url.hostname)) event.respondWith(cacheFirst(req));
  // Todo lo demás (por ejemplo, el traductor por internet) pasa sin tocarse
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  const saved = (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await cache.match('./index.html') : null);
  const network = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  if (!saved) return network;
  const timeout = new Promise((resolve) => setTimeout(() => resolve(saved), NETWORK_WAIT_MS));
  return Promise.race([network.catch(() => saved), timeout]);
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(req);
  if (saved) return saved;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
    return res;
  } catch (err) {
    return new Response('', { status: 504 });
  }
}
