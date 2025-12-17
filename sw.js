const CACHE_NAME = "attendance-cache"; // Main cache for PWA assets
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
];

// Domains that should be cached (External Libraries)
const STATIC_DOMAINS = [
  "cdn.tailwindcss.com",
  "cdnjs.cloudflare.com",
  "www.gstatic.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "cdn-icons-png.flaticon.com"
];

// Domains that should NEVER be cached (API & Database calls)
const API_DOMAINS = [
  "firestore.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com"
];

// Install Event
self.addEventListener("install", (e) => {
  self.skipWaiting(); // Force new SW to activate immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate Event (Cleanup)
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim(); // Take control of page immediately
});

// Fetch Event
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // 1. IGNORE APIs: Always fetch from network (Firebase DB, Auth)
  if (API_DOMAINS.some(d => url.hostname.includes(d))) {
    return; // Default network behavior
  }

  // 2. CACHE EXTERNAL LIBS: Tailwind, Icons, Firebase JS SDKs
  if (STATIC_DOMAINS.some(d => url.hostname.includes(d))) {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse; // Return from cache if available

        return fetch(e.request).then((networkResponse) => {
          // Cache the new file for next time
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 3. Network First Strategy for HTML (to get app updates)
  if (e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // 4. Stale-While-Revalidate for local assets and others
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request)
        .then((networkResponse) => {
          // Clone immediately to avoid "already used" error
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Network failed - return cache if available
          return cachedResponse;
        });

      // Return cache first if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});

// NETWORK STATUS MESSAGING
// Handle messages from main app requesting network status
self.addEventListener('message', (event) => {
  if (event.data.type === 'REQUEST_NETWORK_STATUS') {
    event.ports[0].postMessage({
      type: 'NETWORK_STATUS',
      isOnline: navigator.onLine
    });
  }
});

// Broadcast network status changes to all clients
self.addEventListener('online', () => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'NETWORK_STATUS_CHANGED', isOnline: true });
    });
  });
});

self.addEventListener('offline', () => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'NETWORK_STATUS_CHANGED', isOnline: false });
    });
  });
});
