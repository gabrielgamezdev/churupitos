import type { Worker as OcrWorker } from "tesseract.js";

// Leer el texto de una captura en el propio teléfono (M15, ADR 0010): la imagen no sale de
// él. El lector (Tesseract.js) y sus datos del español los sirve la app desde
// `__OCR_PATH__`; se bajan la primera vez y los guarda el service worker.

export type ReadStage = "preparing" | "reading";

// El lector tarda en arrancar: se deja listo un rato, por si viene otra captura, y luego
// se suelta, que ocupa memoria.
const IDLE_MS = 2 * 60_000;
// Una foto grande no se lee mejor que una captura, y tarda mucho más.
const MAX_WIDTH = 1600;
// La de la cámara, menos aún: se lee al tamaño al que la deja WhatsApp, que se leyó bien,
// y no a los 4000 px con los que sale, que en un teléfono tardaban más de 10 s.
const PHOTO_MAX_SIDE = 1280;
// Una pantalla de teléfono es alta: de 16:9 hacia arriba. Lo más ancho es una foto.
const MIN_SCREEN_RATIO = 1.6;
// El papel: claro y sin color. Las filas en las que lo es al menos esta parte, y las
// columnas de esas filas en las que lo es esta otra. Medido con la primera foto de una
// factura (M15): se irá ajustando con más.
const PAPER_GRAY = 150;
const PAPER_COLOR = 35;
const PAPER_ROWS = 0.35;
const PAPER_COLUMNS = 0.55;
// Para buscarlo basta una copia pequeña.
const PAPER_SAMPLE_WIDTH = 240;

type Box = { x: number; y: number; width: number; height: number };

let worker: Promise<OcrWorker> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;

function ocrWorker(): Promise<OcrWorker> {
  clearTimeout(idleTimer);
  worker ??= import("tesseract.js")
    .then(({ createWorker }) =>
      createWorker("spa", undefined, {
        workerPath: `${__OCR_PATH__}worker.min.js`,
        corePath: __OCR_PATH__,
        langPath: __OCR_PATH__,
        // Es del mismo origen: no hace falta copiarlo a un blob, y así lo guarda el
        // service worker.
        workerBlobURL: false,
      }),
    )
    .catch((error: unknown) => {
      worker = null;
      throw error;
    });
  return worker;
}

// Dejar de leer: se suelta el lector a mitad, que en una foto puede tardar, y libera el
// teléfono. La próxima lectura lo arranca otra vez.
export function stopReading() {
  clearTimeout(idleTimer);
  const current = worker;
  worker = null;
  void current?.then((w) => w.terminate()).catch(() => undefined);
}

function releaseLater() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    const current = worker;
    worker = null;
    void current?.then((w) => w.terminate()).catch(() => undefined);
  }, IDLE_MS);
}

// Una foto (de una factura, por ejemplo) y no una captura de la pantalla.
export async function looksLikePhoto(image: Blob): Promise<boolean> {
  const bitmap = await createImageBitmap(image);
  const photo = isPhoto(bitmap);
  bitmap.close();
  return photo;
}

const isPhoto = (bitmap: ImageBitmap) => bitmap.height / bitmap.width < MIN_SCREEN_RATIO;

// Con `paper`, solo el papel: en una foto, lo que hay alrededor (las manos, la mesa) mete
// ruido y el lector se pierde. Si no hay nada que recortar, no lee: daría lo mismo que
// leerla entera.
export async function readCaptureText(
  image: Blob,
  onStage: (stage: ReadStage) => void,
  paper = false,
): Promise<string | null> {
  onStage("preparing");
  const bitmap = await createImageBitmap(image);
  const box = paper ? paperBox(bitmap) : wholeBox(bitmap);
  if (!box) {
    bitmap.close();
    return null;
  }
  const [ready, prepared] = await Promise.all([ocrWorker(), prepareImage(bitmap, box)]);
  onStage("reading");
  try {
    const { data } = await ready.recognize(prepared);
    return data.text;
  } finally {
    releaseLater();
  }
}

const wholeBox = (bitmap: ImageBitmap): Box => ({
  x: 0,
  y: 0,
  width: bitmap.width,
  height: bitmap.height,
});

// Las filas en las que casi todo es papel, de la primera a la última, y en ellas las
// columnas. Sin papel, o si es casi toda la foto, nada.
function paperBox(bitmap: ImageBitmap): Box | null {
  const width = Math.min(PAPER_SAMPLE_WIDTH, bitmap.width);
  const scale = bitmap.width / width;
  const height = Math.round(bitmap.height / scale);
  const context = new OffscreenCanvas(width, height).getContext("2d", {
    willReadFrequently: true,
  });
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const isPaper = (x: number, y: number) => {
    const at = (y * width + x) * 4;
    const red = data[at] ?? 0;
    const green = data[at + 1] ?? 0;
    const blue = data[at + 2] ?? 0;
    const gray = 0.299 * red + 0.587 * green + 0.114 * blue;
    return (
      gray > PAPER_GRAY && Math.max(red, green, blue) - Math.min(red, green, blue) < PAPER_COLOR
    );
  };
  const share = (count: number, along: (index: number) => boolean) => {
    let found = 0;
    for (let index = 0; index < count; index += 1) if (along(index)) found += 1;
    return found / count;
  };
  const rows = Array.from({ length: height }, (_, y) => share(width, (x) => isPaper(x, y)));
  const top = rows.findIndex((value) => value >= PAPER_ROWS);
  const bottom = rows.findLastIndex((value) => value >= PAPER_ROWS);
  if (top < 0) return null;
  const tall = bottom - top + 1;
  const columns = Array.from({ length: width }, (_, x) => share(tall, (y) => isPaper(x, top + y)));
  const left = columns.findIndex((value) => value >= PAPER_COLUMNS);
  const right = columns.findLastIndex((value) => value >= PAPER_COLUMNS);
  if (left < 0 || (right - left + 1) * tall > 0.85 * width * height) return null;
  // Un margen, para no cortar la primera ni la última línea.
  const margin = 2;
  const x = Math.max(0, left - margin);
  const y = Math.max(0, top - margin);
  return {
    x: Math.round(x * scale),
    y: Math.round(y * scale),
    width: Math.round((Math.min(width - 1, right + margin) - x + 1) * scale),
    height: Math.round((Math.min(height - 1, bottom + margin) - y + 1) * scale),
  };
}

// En grises y con el contraste estirado, del 1 % más oscuro al 1 % más claro: así se
// leyeron bien todas las capturas de la prueba; en color, algunas no. Agrandar el papel
// de una foto no se probó mejor: con la primera, cada tamaño confundía otra cifra.
async function prepareImage(bitmap: ImageBitmap, box: Box): Promise<Blob> {
  const scale = Math.min(
    1,
    MAX_WIDTH / box.width,
    isPhoto(bitmap) ? PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height) : 1,
  );
  const width = Math.round(box.width * scale);
  const height = Math.round(box.height * scale);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Sin lienzo para preparar la imagen");
  context.drawImage(bitmap, box.x, box.y, box.width, box.height, 0, 0, width, height);
  bitmap.close();
  const pixels = context.getImageData(0, 0, width, height);
  const { data } = pixels;
  const gray = new Uint8ClampedArray(width * height);
  const histogram = new Array<number>(256).fill(0);
  for (let pixel = 0; pixel < gray.length; pixel += 1) {
    const at = pixel * 4;
    const value = Math.round(
      0.299 * (data[at] ?? 0) + 0.587 * (data[at + 1] ?? 0) + 0.114 * (data[at + 2] ?? 0),
    );
    gray[pixel] = value;
    histogram[value] = (histogram[value] ?? 0) + 1;
  }
  const low = percentile(histogram, gray.length * 0.01);
  const high = percentile(histogram, gray.length * 0.99);
  const span = Math.max(1, high - low);
  gray.forEach((value, pixel) => {
    // El arreglo de la imagen recorta solo lo que pasa de 0 o de 255.
    const stretched = ((value - low) * 255) / span;
    data[pixel * 4] = stretched;
    data[pixel * 4 + 1] = stretched;
    data[pixel * 4 + 2] = stretched;
  });
  context.putImageData(pixels, 0, 0);
  return canvas.convertToBlob({ type: "image/png" });
}

function percentile(histogram: number[], rank: number): number {
  let seen = 0;
  for (const [value, count] of histogram.entries()) {
    seen += count;
    if (seen >= rank) return value;
  }
  return histogram.length - 1;
}
