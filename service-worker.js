const CACHE = "revo-stats-shell-v3.3";
const RUNTIME_CACHE = "revo-stats-runtime-v3.3";

const CORE_ASSETS = [
  "/index.html",
  "/manifest.json",
  "/css/01-base.css",
  "/css/02-layout.css",
  "/css/03-components.css",
  "/css/04-modals-responsive.css",
  "/css/05-effects.css",
  "/js/01-config.js",
  "/js/02-db.js",
  "/js/03-utils.js",
  "/js/04-parser.js",
  "/js/05-stats.js",
  "/js/06-render.js",
  "/js/07-events.js",
  "/js/08-app.js",
  "/icons/icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/icons/icon-1024.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE_ASSETS);
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE && key !== RUNTIME_CACHE) return caches.delete(key);
        })
      );
    })()
  );
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // === NAVIGATION (HTML pages) – only from cache ===
  if (req.mode === "navigate" || url.pathname === "/" || url.pathname === "") {
    event.respondWith(
      (async () => {
        const cached = await caches.match("/index.html");
        if (cached) return cached;

        // fallback (should never happen after install)
        try {
          const fresh = await fetch("/index.html", { cache: "no-store" });
          if (fresh && fresh.ok) {
            const cache = await caches.open(CACHE);
            cache.put("/index.html", fresh.clone());
            return fresh;
          }
        } catch (e) {}
        return Response.error();
      })()
    );
    return;
  }

  // === Code assets (JS, CSS, JSON) – network first then cache ===
  if (/\.(js|css|json)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.ok && fresh.type === "basic") {
            const runtime = await caches.open(RUNTIME_CACHE);
            runtime.put(req, fresh.clone());
          }
          return fresh;
        } catch (e) {
          return caches.match(req);
        }
      })()
    );
    return;
  }

  // === Images, icons – cache first with background update ===
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) {
        fetch(req)
          .then(res => {
            if (res && res.ok && res.type === "basic") {
              caches.open(RUNTIME_CACHE).then(c => c.put(req, res));
            }
          })
          .catch(() => {});
        return cached;
      }
      try {
        const res = await fetch(req);
        if (res && res.ok && res.type === "basic") {
          const runtime = await caches.open(RUNTIME_CACHE);
          runtime.put(req, res.clone());
        }
        return res;
      } catch (e) {
        return caches.match(req);
      }
    })()
  );
});

self.addEventListener("message", event => {
  if (event.data && (event.data.action === "skipWaiting" || event.data.type === "SKIP_WAITING")) {
    self.skipWaiting();
  }
});