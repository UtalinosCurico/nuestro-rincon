// Subir esta versión en cada cambio de index.html o de los juegos: limpia
// la caché vieja de golpe. Aunque se olvide, los archivos de los juegos se
// sirven "de caché y se actualizan por detrás", así que la siguiente carga
// ya trae lo nuevo.
const CACHE_NAME = "nuestro-rincon-v35";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/assets/icons/icon.svg",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/assets/icons/icon-180.png",
  "/juegos/invernadero/",
  "/juegos/invernadero/style.css",
  "/juegos/invernadero/script.js",
  "/juegos/observatorio/",
  "/juegos/observatorio/style.css",
  "/juegos/observatorio/astro.js",
  "/juegos/observatorio/datos.js",
  "/juegos/observatorio/motor.js",
  "/juegos/observatorio/arte.js",
  "/juegos/observatorio/escena.js",
  "/juegos/observatorio/ui.js",
  "/juegos/michi/",
  "/juegos/michi/style.css",
  "/juegos/michi/datos.js",
  "/juegos/michi/michi.js",
  "/juegos/michi/estado.js",
  "/juegos/michi/sonido.js",
  "/juegos/michi/minijuegos.js",
  "/juegos/michi/ui.js",
  "/juegos/pesadillas/",
  "/juegos/pesadillas/style.css",
  "/juegos/pesadillas/datos.js",
  "/juegos/pesadillas/motor.js",
  "/juegos/pesadillas/arte.js",
  "/juegos/pesadillas/sonido.js",
  "/juegos/pesadillas/ui.js",
  "/juegos/metro/",
  "/juegos/metro/style.css",
  "/juegos/metro/datos.js",
  "/juegos/metro/motor.js",
  "/juegos/metro/arte.js",
  "/juegos/metro/ui.js",
  "/juegos/clinica/clinica.js",
  "/juegos/clinica/clinica.css"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // uno por uno: si falta un archivo, el resto igual queda guardado
      .then((cache) => Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => null))))
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
  if (url.origin !== location.origin) return;           // fuentes, Spotify, fotos de Blob: directo a la red
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/assets/audio/")) return;

  if (event.request.mode === "navigate") {
    // Red primero. Ojo: solo la portada se guarda bajo "/". Antes se cacheaba
    // cualquier navegación en esa clave, así que entrar a un juego dejaba su
    // HTML como página principal sin conexión.
    const esPortada = url.pathname === "/" || url.pathname === "/index.html";
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copia = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(esPortada ? "/" : event.request, copia));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match(esPortada ? "/" : url.pathname) || caches.match("/")))
    );
    return;
  }

  // Archivos: lo que hay en caché sale al tiro y por detrás se pide la
  // versión nueva para la próxima vez.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const red = fetch(event.request)
          .then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || red;
      })
    )
  );
});
