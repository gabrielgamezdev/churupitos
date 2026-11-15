import { ScanText } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { today } from "@/lib/months";

import { parseCapture, type CaptureFields } from "./parse-capture";
import type { ReadStage } from "./read-capture";

type State =
  | { stage: "idle" }
  | { stage: ReadStage; preview: string }
  | { stage: "done"; preview: string; fields: CaptureFields; seconds: number }
  | { stage: "failed"; preview: string; file: File; offline: boolean };

interface CaptureReaderProps {
  // Lo que se encontró; lo que no, en null. Quien rellena decide qué hace con cada cosa.
  onRead: (fields: CaptureFields) => void;
}

const SECONDS = new Intl.NumberFormat("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const joined = (parts: string[], last: string) =>
  parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} ${last} ${parts.at(-1)}`;

// Qué se rellenó y qué no: lo que falta se escribe a mano, y lo leído se revisa.
function summary({ amountCents, day, description }: CaptureFields): string[] {
  const filled = [
    amountCents !== null && "el monto",
    day !== null && "la fecha",
    description !== null && "el concepto",
  ].filter((part): part is string => Boolean(part));
  const missing = [amountCents === null && "el monto", day === null && "la fecha"].filter(
    (part): part is string => Boolean(part),
  );
  return [
    filled.length === 0
      ? "No se encontró nada que rellenar."
      : `${filled.length > 1 ? "Se rellenaron" : "Se rellenó"} ${joined(filled, "y")}: revisa que esté bien.`,
    ...(filled.length > 0 && missing.length > 0
      ? [`No se encontró ${joined(missing, "ni")}.`]
      : []),
  ];
}

// «Leer una captura» en Registrar (M15): la captura del pago se lee en el teléfono y
// rellena lo que dice. Se ve en pequeño mientras se registra, para comparar, y no se
// guarda en ningún sitio.
export function CaptureReader({ onRead }: CaptureReaderProps) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ stage: "idle" });
  const [enlarged, setEnlarged] = useState(false);
  // Si se elige otra captura mientras se lee una, la que cuenta es la última.
  const attempt = useRef(0);

  const preview = state.stage === "idle" ? null : state.preview;
  // La miniatura apunta a la imagen en memoria: se suelta al cambiarla o al salir.
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const read = async (file: File) => {
    const current = ++attempt.current;
    const image = URL.createObjectURL(file);
    const started = performance.now();
    setEnlarged(false);
    setState({ stage: "preparing", preview: image });
    try {
      const { readCaptureText } = await import("./read-capture");
      const text = await readCaptureText(file, (stage) => {
        if (current === attempt.current) setState({ stage, preview: image });
      });
      if (current !== attempt.current) return;
      const fields = parseCapture(text, today());
      setState({
        stage: "done",
        preview: image,
        fields,
        seconds: (performance.now() - started) / 1000,
      });
      onRead(fields);
    } catch {
      if (current === attempt.current) {
        setState({ stage: "failed", preview: image, file, offline: !navigator.onLine });
      }
    }
  };

  const pick = () => input.current?.click();
  const fileInput = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      hidden
      aria-label="Captura del pago"
      onChange={(event) => {
        const file = event.target.files?.[0];
        // Vacío otra vez: así elegir la misma captura dos veces también la lee.
        event.target.value = "";
        if (file) void read(file);
      }}
    />
  );

  if (state.stage === "idle") {
    return (
      <>
        <Button type="button" variant="outline" className="self-start" onClick={pick}>
          <ScanText aria-hidden="true" />
          Leer una captura
        </Button>
        {fileInput}
      </>
    );
  }

  return (
    <section aria-label="Captura" className="flex flex-col gap-3 rounded-lg bg-surface-raised p-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={enlarged ? "Achicar la captura" : "Ampliar la captura"}
          aria-expanded={enlarged}
          onClick={() => setEnlarged(!enlarged)}
          className="shrink-0 overflow-hidden rounded-md border border-hairline"
        >
          <img src={state.preview} alt="" className="h-24 w-14 object-cover object-top" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1" aria-live="polite">
          {state.stage === "preparing" && (
            <>
              <p className="text-body">Preparando el lector…</p>
              <p className="text-caption text-ink-muted">La primera vez se baja: unos 5 MB.</p>
            </>
          )}
          {state.stage === "reading" && <p className="text-body">Leyendo la captura…</p>}
          {state.stage === "done" && (
            <>
              <p className="text-body">Leída en {SECONDS.format(state.seconds)} s</p>
              {summary(state.fields).map((line) => (
                <p key={line} className="text-caption text-ink-muted">
                  {line}
                </p>
              ))}
              <Button type="button" variant="link" className="self-start px-0" onClick={pick}>
                Leer otra
              </Button>
            </>
          )}
          {state.stage === "failed" && (
            <>
              <p className="text-body">No se pudo leer la captura.</p>
              <p className="text-caption text-ink-muted">
                {state.offline
                  ? "Sin conexión: la primera vez hace falta red para bajar el lector."
                  : "Vuelve a intentarlo, o escribe los datos a mano."}
              </p>
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() => void read(state.file)}
              >
                Reintentar
              </Button>
            </>
          )}
        </div>
      </div>
      {enlarged && <img src={state.preview} alt="La captura" className="w-full rounded-md" />}
      {fileInput}
    </section>
  );
}
