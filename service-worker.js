const CACHE = "revo-stats-shell-v3.0";
const RUNTIME_CACHE = "revo-stats-runtime-v3.0";

const CORE_ASSETS = [
  "./index.html",
  "./manifest.json",

  "./css/01-base.css",
  "./css/02-layout.css",
  "./css/03-components.css",
  "./css/04-modals-responsive.css",
  "./css/05-effects.css",

  "./js/01-config.js",
  "./js/02-db.js",
  "./js/03-utils.js",
  "./js/04-parser.js",
  "./js/05-stats.js",
  "./js/06-render.js",
  "./js/07-events.js",
  "./js/08-app.js",

  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/icon-1024.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE_ASSETS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation =
    req.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname === "/" ||
    url.pathname === "";

  if (isNavigation) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch("/index.html", {
            cache: "no-store",
            redirect: "follow"
          });

          if (fresh && fresh.status === 200 && fresh.type === "basic") {
            const cache = await caches.open(CACHE);
            await cache.put("./index.html", fresh.clone());
          }

          return fresh;
        } catch (error) {
          return (
            (await caches.match("./index.html")) ||
            Response.error()
          );
        }
      })()
    );

    return;
  }

  const isCodeAsset =
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".json");

  if (isCodeAsset) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);

          if (fresh && fresh.status === 200 && fresh.type === "basic") {
            const runtime = await caches.open(RUNTIME_CACHE);
            await runtime.put(req, fresh.clone());
          }

          return fresh;
        } catch (error) {
          return caches.match(req);
        }
      })()
    );

    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);

      if (cached) {
        fetch(req)
          .then(async (res) => {
            if (!res || res.status !== 200 || res.type !== "basic") return;

            const runtime = await caches.open(RUNTIME_CACHE);
            await runtime.put(req, res.clone());
          })
          .catch(() => {});

        return cached;
      }

      try {
        const res = await fetch(req);

        if (!res || res.status !== 200 || res.type !== "basic") {
          return res;
        }

        const runtime = await caches.open(RUNTIME_CACHE);
        await runtime.put(req, res.clone());

        return res;
      } catch (error) {
        return caches.match(req);
      }
    })()
  );
});

self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (
    event.data.action === "skipWaiting" ||
    event.data.type === "SKIP_WAITING"
  ) {
    self.skipWaiting();
  }
});
