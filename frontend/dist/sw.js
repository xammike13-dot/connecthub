const CACHE_NAME = "connecthub-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable.png"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching static assets");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activated");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Clearing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.startsWith("/api") || requestUrl.pathname.startsWith("/uploads")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && event.request.method === "GET") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
      })
  );
});

// Handle Push Notifications
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push event received");

  let data = {
    title: "ConnectHub",
    body: "You have a new update",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: "/" }
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.log("[Service Worker] Push data is text, not JSON:", event.data.text());
      data = {
        title: "ConnectHub",
        body: event.data.text(),
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: "/" }
      };
    }
  }

  const options = {
    body: data.body || data.message || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    vibrate: [120, 80, 120],
    data: data.data || { url: "/" },
    actions: [
      { action: "open", title: "Open ConnectHub" },
      { action: "close", title: "Dismiss" }
    ]
  };

  // Handle App Badging in Background Push Event
  let unreadCount = data.unreadCount || (data.data && data.data.unreadCount) || 0;
  if ('setAppBadge' in self.navigator) {
    if (unreadCount > 0) {
      self.navigator.setAppBadge(unreadCount).catch(err => console.error('[SW AppBadge] Error setting:', err));
    } else {
      self.navigator.clearAppBadge().catch(err => console.error('[SW AppBadge] Error clearing:', err));
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle Notification Clicks (Deep Linking)
self.addEventListener("notificationclick", (event) => {
  console.log("[Service Worker] Notification click received. Action:", event.action);

  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "/";

  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  // Clear or reset app badge on notification click
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          if ("navigate" in client) {
            client.navigate(absoluteUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl);
      }
    })
  );
});
