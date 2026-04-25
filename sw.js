const CACHE = 'subtracker-v4';
const PRECACHE = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});

self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(d.title || 'SubTracker', {
      body: d.body || 'A subscription needs your attention',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: d.tag || 'subtracker',
      data: { url: './' },
      actions: [
        { action: 'open', title: 'Review' }
      ]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || './'));
});

self.addEventListener('periodicsync', e => {
  if (e.tag === 'check-renewals') {
    e.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(cls =>
        cls.forEach(c => c.postMessage({ type: 'CHECK_RENEWALS' }))
      )
    );
  }
});
