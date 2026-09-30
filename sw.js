// Football United - Progressive Web App Service Worker (v10 Network-First & Direct APK Bypass)
const CACHE_NAME = "football-united-v10";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/football_united_logo.svg",
  "/app.js",
  "/firebase.js"
];

// Third-party CDN resources that should be cached for full offline UI rendering
const CDN_HOSTS = [
  "cdn.tailwindcss.com",
  "cdn.jsdelivr.net",
  "cdnjs.cloudflare.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    }).catch((err) => {
      console.warn("PWA precache notice:", err);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
  if (event.data && event.data.action === "clearCache") {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});

self.addEventListener("fetch", (event) => {
  // 1. Explicitly check if the request URL ends with .apk
  // If it is an .apk, completely bypass the PWA cache and fallback logic, allowing the browser to download the raw binary file
  if (event.request.url.endsWith(".apk") || event.request.url.includes(".apk")) {
    return event.respondWith(fetch(event.request));
  }

  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Exclude live dynamic APIs, Firestore, Auth, Storage, Google APIs, and Microsoft Graph from Service Worker interception
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("graph.microsoft.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.hostname.includes("securetoken.googleapis.com") ||
    url.hostname.includes("firebasestorage.googleapis.com") ||
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    url.protocol.startsWith("chrome-extension")
  ) {
    return;
  }

  // 1. Third-party CDN runtime caching (Tailwind, Alpine.js, Fonts, QR, PDF)
  const isCdnAsset = CDN_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith("." + host));
  if (isCdnAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then((networkRes) => {
          if (networkRes && (networkRes.status === 200 || networkRes.type === "opaque")) {
            cache.put(event.request, networkRes.clone());
          }
          return networkRes;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 2. Navigation & App Code: Network-first with cache fallback (prevents stale code / offline caching trap)
  const isNavigationOrCode = 
    event.request.mode === "navigate" || 
    url.pathname === "/" || 
    url.pathname === "/index.html" || 
    url.pathname === "/manifest.json" ||
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/firebase.js");

  if (isNavigationOrCode) {
    event.respondWith(
      fetch(event.request).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkRes;
      }).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          return (await caches.match("/index.html")) || (await caches.match("/"));
        }
      })
    );
    return;
  }

  // 2.1 Logo & Official Crest: Network-first so updates made take effect instantly on client devices
  if (url.pathname.includes("football_united_logo.svg") || url.pathname.startsWith("/icons/") || url.pathname.includes("custom_profile_photo")) {
    event.respondWith(
      fetch(event.request).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkRes;
      }).catch(async () => {
        return (await caches.match(event.request)) || (await caches.match("/football_united_logo.svg"));
      })
    );
    return;
  }

  // 3. Static assets: Cache-first with network fallback
  const isAppShellAsset = APP_SHELL.some((path) => url.pathname === path) ||
    url.pathname.match(/\.(css|png|jpg|jpeg|svg|webp|ico|woff2?|json)$/);

  if (isAppShellAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((networkRes) => {
          if (networkRes && networkRes.status === 200 && (networkRes.type === "basic" || networkRes.type === "cors")) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return networkRes;
        });
      })
    );
  }
});
