const CACHE_NAME = 'brain-boost-v2';
const APP_SHELL = ['/offline.html', '/manifest.webmanifest', '/brainboost-logo-192.webp', '/brainboost-logo-512.webp'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/.well-known/') || url.pathname.startsWith('/downloads/')) {
    return;
  }

  if (request.mode === 'navigate') {
    const offlineResponse = async () => {
      const cached = await caches.match('/offline.html');
      if (!cached) return new Response('No Internet Connection. Please reconnect and retry.', {status:503,headers:{'Content-Type':'text/plain'}});
      const html = await cached.text();
      // Keep the original URL (including OAuth callback state) available for Retry.
      const returnTo = JSON.stringify(url.pathname + url.search).replace(/</g, '\\u003c');
      return new Response(html.replace('const params=new URLSearchParams(location.search);', `const params=new URLSearchParams({returnTo:${returnTo}});`), {status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    };
    event.respondWith(fetch(request).then(response => response.status >= 500 ? offlineResponse() : response).catch(offlineResponse));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/#connectivity', self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(target.href); return existing.focus(); }
    return self.clients.openWindow(target.href);
  }));
});

// Ready for standards-based Web Push. Subscriptions and VAPID sender credentials
// must be provisioned server-side; no messaging secret belongs in the APK.
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* Use a generic alert. */ }
  let destination = '/#connectivity';
  try { const url = new URL(payload.url || destination, self.location.origin); if (url.origin === self.location.origin) destination = url.pathname + url.search + url.hash; } catch {}
  event.waitUntil(self.registration.showNotification(String(payload.title || 'Brain Boost').slice(0,120), {
    body: String(payload.body || 'You have a new update.').slice(0,500),
    icon: '/brainboost-logo-192.webp', tag: String(payload.tag || 'brainboost-update').slice(0,120),
    data: { url: destination }
  }));
});
