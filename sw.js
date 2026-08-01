// Subir esta versión en cada cambio de index.html: fuerza a los teléfonos a
// descartar el HTML viejo en vez de seguir ejecutándolo desde la caché.
const CACHE_NAME = "nuestro-rincon-v12";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/assets/icons/icon.svg",
  "/assets/icons/icon-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/assets/audio/")) return;
  // El juego de Unity NO se cachea. Si se cachea, el teléfono se queda con la
  // primera versión que cargó y nunca ve las nuevas, aunque se publiquen.
  // Fue exactamente lo que pasó con /juego3d.
  if (url.pathname.startsWith("/juego3d")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copia = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copia));
          return response;
        })
        .catch(() => caches.match("/") || caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && url.origin === location.origin) {
          const copia = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        }
        return response;
      });
    })
  );
});
