/*!
 * Celia Decorações — Service Worker
 * Habilita a instalação do site como aplicativo (Android/Chrome/iOS)
 * e mantém as páginas já visitadas disponíveis mesmo com internet fraca.
 */

const CACHE_VERSION = "celia-v1";
const APP_SHELL = [
  "./index.html",
  "./telainicial.html",
  "./alugueis.html",
  "./calendario.html",
  "./decoracoes.html",
  "./espaco.html",
  "./pacotedia.html",
  "./pacotenoite.html",
  "./peguemonte.html",
  "./promocao.html",
  "./manifest.json",
  "./nav-history.js",
  "./produtos/icon-192.png",
  "./produtos/icon-512.png",
  "./produtos/icon-maskable-192.png",
  "./produtos/icon-maskable-512.png",
  "./produtos/apple-touch-icon.png",
  "./produtos/favicon-32x32.png",
  "./produtos/favicon-16x16.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => (name !== CACHE_VERSION ? caches.delete(name) : null))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Apenas GET do mesmo site
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    // Páginas: tenta a rede primeiro (conteúdo sempre atualizado);
    // se falhar (sem internet), usa a cópia salva em cache.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match("./telainicial.html")))
    );
    return;
  }

  // Demais arquivos (js, ícones, imagens): cache primeiro, com atualização em segundo plano.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
