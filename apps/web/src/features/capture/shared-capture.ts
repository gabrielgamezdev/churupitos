// La captura que llegó con Compartir → Churupitos (M15): el service worker la deja en su
// caché (public/share-target.js, con los mismos nombres) y Registrar la saca de ahí. Se
// saca una vez por cada vez que se abre la app: compartir otra la abre de nuevo, y quien
// la pida dos veces (React, al montar dos veces en desarrollo) recibe la misma.
const SHARED_CACHE = "captura-compartida";
const SHARED_KEY = "/captura-compartida";

let taken: Promise<File | null> | null = null;

export function takeSharedCapture(): Promise<File | null> {
  taken ??= take();
  return taken;
}

async function take(): Promise<File | null> {
  if (!("caches" in window)) return null;
  const cache = await caches.open(SHARED_CACHE);
  const response = await cache.match(SHARED_KEY);
  if (!response) return null;
  await cache.delete(SHARED_KEY);
  const image = await response.blob();
  return new File([image], "captura", { type: image.type });
}
