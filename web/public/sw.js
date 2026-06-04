// Service worker de mi-hub (PWA).
// Estrategia conservadora para NO romper nada:
//  - Navegaciones (HTML): network-first -> fallback a /offline.html sin red.
//  - Assets estáticos hasheados (/_next/static, imágenes, fuentes): cache-first.
//  - /api/* y /auth/* y cualquier origen externo (Supabase): NUNCA se cachean.
const VERSION = "v2";
const STATIC_CACHE = `mihub-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

// Mínimo imprescindible para que la pantalla offline se vea con marca.
const PRECACHE = [OFFLINE_URL, "/icon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("mihub-") && k !== STATIC_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Solo gestionamos nuestro propio origen (deja pasar Supabase, CDNs, etc.).
  if (url.origin !== self.location.origin) return;

  // Datos dinámicos y sesión: siempre a la red, sin cache.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Navegaciones (documentos): network-first con fallback offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches
          .match(req)
          .then((cached) => cached || caches.match(OFFLINE_URL))
      )
    );
    return;
  }

  // Assets estáticos inmutables (content-hashed): cache-first.
  const esEstatico =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:js|css|woff2?|png|jpe?g|svg|webp|ico|gif)$/.test(url.pathname);

  if (esEstatico) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        });
      })
    );
  }
  // El resto: sin intervenir (comportamiento de red por defecto).
});

// Notificaciones push.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const titulo = data.title || "mi-hub";
  const opciones = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/c/hoy" },
    vibrate: [80, 40, 80],
  };
  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/c/hoy";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
