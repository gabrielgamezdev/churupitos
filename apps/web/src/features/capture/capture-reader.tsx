import { ScanText } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { today } from "@/lib/months";

import { parseCapture, type CaptureAccount, type CaptureFields } from "./parse-capture";
import type { ReadStage } from "./read-capture";
import { takeSharedCapture } from "./shared-capture";

type State =
  | { stage: "idle" }
  | { stage: ReadStage; preview: string }
  | { stage: "done"; preview: string; fields: CaptureFields; seconds: number }
  | { stage: "failed"; preview: string; file: File; offline: boolean };

interface CaptureReaderProps {
  // Las cuentas que se pueden elegir, con lo que delata a cada una en sus capturas.
  accounts: CaptureAccount[];
  // Llegó una con Compartir → Churupitos: se lee sola al abrir.
  readsShared?: boolean;
  // Lo que se encontró; lo que no, en null. Quien rellena decide qué hace con cada cosa.
  onRead: (fields: CaptureFields) => void;
}

const SECONDS = new Intl.NumberFormat("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const joined = (parts: string[], last: string) =>
  parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} ${last} ${parts.at(-1)}`;

// Qué se rellenó y qué no: lo que falta se escribe a mano, y lo leído se revisa. Sin
// fecha, queda la de hoy. Una factura no dice con qué se pagó: se pide la cuenta.
function summary({ amountCents, day, description, accountId, receipt }: CaptureFields): string[] {
  const filled = [
    amountCents !== null && "el monto",
    accountId !== null && "la cuenta",
    day !== null && "la fecha",
    description !== null && "el concepto",
  ].filter((part): part is string => Boolean(part));
  // Sin concepto es lo normal: casi todas dicen «pago».
  const missing = [
    amountCents === null && "el monto",
    accountId === null && !receipt && "la cuenta",
  ].filter((part): part is string => Boolean(part));
  return [
    filled.length === 0
      ? "No se encontró nada que rellenar."
      : `${filled.length > 1 ? "Se rellenaron" : "Se rellenó"} ${joined(filled, "y")}: revisa que esté bien.`,
    ...(filled.length > 0 && missing.length > 0
      ? [`No se encontró ${joined(missing, "ni")}.`]
      : []),
    ...(day === null ? ["No trae fecha: queda la de hoy."] : []),
    ...(receipt ? ["Es una factura: elige la cuenta con la que se pagó."] : []),
  ];
}

// Cuánto se encontró: entre dos lecturas de la misma imagen, la que más.
const found = ({ amountCents, day }: CaptureFields) =>
  Number(amountCents !== null) + Number(day !== null);

// «Leer una captura» en Registrar (M15): la captura del pago se lee en el teléfono y
// rellena lo que dice. Se ve en pequeño mientras se registra, para comparar, y no se
// guarda en ningún sitio.
export function CaptureReader({ accounts, readsShared = false, onRead }: CaptureReaderProps) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ stage: "idle" });
  const [enlarged, setEnlarged] = useState(false);
  // Si se elige otra captura mientras se lee una, la que cuenta es la última.
  const attempt = useRef(0);
  // Las cuentas pueden llegar mientras se lee: se usan las de ese momento, no las de
  // cuando se eligió la captura.
  const latestAccounts = useRef(accounts);
  useEffect(() => {
    latestAccounts.current = accounts;
  }, [accounts]);

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
      const { looksLikePhoto, readCaptureText } = await import("./read-capture");
      const onStage = (stage: ReadStage) => {
        if (current === attempt.current) setState({ stage, preview: image });
      };
      const parse = (text: string | null) =>
        text === null ? null : parseCapture(text, today(), latestAccounts.current);
      // Una foto se lee primero recortando el papel, y una captura, entera. Si falta el
      // monto o la fecha, se prueba de la otra forma y se queda la que encontró más.
      const photo = await looksLikePhoto(file);
      let fields = parse(await readCaptureText(file, onStage, photo));
      if (current !== attempt.current) return;
      if (!fields || found(fields) < 2) {
        const other = parse(await readCaptureText(file, onStage, !photo));
        if (current !== attempt.current) return;
        if (other && (!fields || found(other) > found(fields))) fields = other;
      }
      if (!fields) throw new Error("No se pudo leer la imagen");
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

  // La compartida se saca de la caché del service worker y se lee en cuanto está.
  const readShared = useEffectEvent((file: File) => void read(file));
  useEffect(() => {
    if (!readsShared) return;
    let active = true;
    takeSharedCapture()
      .then((file) => {
        if (active && file) readShared(file);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [readsShared]);

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
