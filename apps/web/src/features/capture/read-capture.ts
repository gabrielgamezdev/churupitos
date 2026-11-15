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

function releaseLater() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    const current = worker;
    worker = null;
    void current?.then((w) => w.terminate()).catch(() => undefined);
  }, IDLE_MS);
}

export async function readCaptureText(
  image: Blob,
  onStage: (stage: ReadStage) => void,
): Promise<string> {
  onStage("preparing");
  const [ready, prepared] = await Promise.all([ocrWorker(), prepareImage(image)]);
  onStage("reading");
  try {
    const { data } = await ready.recognize(prepared);
    return data.text;
  } finally {
    releaseLater();
  }
}

// En grises y con el contraste estirado, del 1 % más oscuro al 1 % más claro: así se
// leyeron bien todas las capturas de la prueba; en color, algunas no.
async function prepareImage(image: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(image);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return image;
  context.drawImage(bitmap, 0, 0, width, height);
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
