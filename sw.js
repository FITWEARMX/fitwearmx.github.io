/* Guarda las apps en el aparato para que abran sin internet.
   Las páginas salen siempre nuevas si hay internet; lo demás se revisa en segundo plano. */
const CACHE = 'mis-apps-v17';
const FILES = ["/", "/index.html", "/manifest.webmanifest", "/icon-180.png", "/icon-512.png", "/cotizador/", "/cotizador/index.html", "/cotizador/manifest.webmanifest", "/cotizador/icon-180.png", "/cotizador/icon-512.png", "/facturas/prueba.html", "/facturas/", "/facturas/index.html", "/facturas/manifest.webmanifest", "/facturas/icon-180.png", "/facturas/icon-512.png", "/clientes/prueba.html", "/clientes/", "/clientes/index.html", "/clientes/manifest.webmanifest", "/clientes/icon-180.png", "/clientes/icon-512.png", "/catalogo/prueba.html", "/catalogo/", "/catalogo/index.html", "/catalogo/catalogo-inventario.js", "/catalogo/manifest.webmanifest", "/catalogo/icon-180.png", "/catalogo/icon-512.png", "/historias/", "/historias/index.html", "/historias/manifest.webmanifest", "/historias/icon-180.png", "/historias/icon-512.png", "/recortador/", "/recortador/index.html", "/recortador/comercial.html", "/recortador/studio-sonidos.js", "/recortador/studio-exportar.js", "/recortador/studio-ritmo.js", "/recortador/studio-estilos.css", "/recortador/studio-base.js", "/recortador/studio-dibujo.js", "/recortador/studio-sombra.js", "/recortador/studio-escenas.js", "/recortador/studio-reproducir.js", "/recortador/studio-proyecto.js", "/recortador/studio-linea.js", "/recortador/studio-acciones.js", "/recortador/studio-vistas.js", "/recortador/studio-generar.js", "/recortador/studio-creaciones.js"];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const u = new URL(req.url);
  // La tienda pública (/tienda/) no se guarda aquí: siempre se ve la versión más nueva
  if (req.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/tienda/')) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    // Las páginas se piden primero a internet para que siempre salga lo más nuevo
    if (req.mode === 'navigate' && cached) {
      try {
        const res = await fetch(req);
        if (res && res.ok) { cache.put(req, res.clone()); return res; }
      } catch (_) {}
      return cached;
    }
    const fresh = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }
    const res = await fresh;
    if (res) return res;
    if (req.mode === 'navigate') {
      const u = new URL(req.url);
      const fallback = await cache.match(u.pathname.replace(/[^/]*$/, '') + 'index.html');
      if (fallback) return fallback;
    }
    return new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});
