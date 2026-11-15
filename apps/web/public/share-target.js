// Compartir → Churupitos (M15). Android manda la captura con un POST a /share-capture
// (`share_target` en el manifiesto). La app es solo estáticos (ADR 0007) y no hay servidor
// que lo reciba: lo recibe este service worker, que deja la imagen en su caché y abre
// Registrar, y Registrar la saca de ahí y la lee (src/features/capture/shared-capture.ts).
// El service worker que genera Workbox lo carga antes que sus rutas: este va primero.

const SHARED_CACHE = "captura-compartida";
const SHARED_KEY = "/captura-compartida";

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/share-capture") return;
  event.respondWith(
    (async () => {
      try {
        const form = await event.request.formData();
        const image = form.getAll("capture").find((value) => value instanceof File);
        if (image) {
          const cache = await caches.open(SHARED_CACHE);
          await cache.put(
            SHARED_KEY,
            new Response(image, { headers: { "Content-Type": image.type } }),
          );
        }
      } catch {
        // Sin imagen, Registrar abre vacío: no hay nada que leer.
      }
      return Response.redirect("/operations/new?shared=1", 303);
    })(),
  );
});
