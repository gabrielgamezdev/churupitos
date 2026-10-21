import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  // Qué mide, para el lector de pantalla: «Entregado».
  label: string;
  // Lo mismo en palabras: «$ 85,00 de $ 150,00».
  valueText: string;
  className?: string;
}

// Cuánto va de algo que tiene referencia (M7): lo entregado de lo planeado, lo cobrado de
// lo esperado. Solo donde hay con qué comparar: nada de tartas ni barras sueltas. Pasar
// de la referencia la deja llena.
export function ProgressBar({ value, max, label, valueText, className }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={valueText}
      className={cn("h-1.5 overflow-hidden rounded-full bg-surface-sunken", className)}
    >
      <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
    </div>
  );
}
