
const CACHE = "grey-sloan-pager-v2";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Receive push notifications
self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "Grey Sloan Memorial",
      body: event.data ? event.data.text() : "You have received a new page."
    };
  }

  const title = data.title || "Grey Sloan Memorial";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "You have received a new page.",
      icon: "./icons/apple-touch-icon.png",
      badge: "./icons/apple-touch-icon.png",
      tag: "grey-sloan-page",
      data: {
        url: "./"
      }
    })
  );
});

// Open the pager when the notification is tapped
self.addEventListener("notificationclick", event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(windowClients => {
      for (const client of windowClients) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      return clients.openWindow("./");
    })
  );
});

// Offline caching
self.addEventListener("fetch", event => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  ) return;

  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
