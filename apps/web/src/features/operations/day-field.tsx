import { useRef, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { addDays } from "@/lib/months";

type DayChoice = "today" | "yesterday" | "other";

const CHOICES: { value: DayChoice; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "other", label: "Otro día" },
];

interface DayFieldProps {
  value: string;
  today: string;
  onChange: (day: string) => void;
  // El campo de la fecha, que solo se ve con «Otro día».
  dateInput: UseFormRegisterReturn;
  error?: string;
}

// La fecha en tres botones (M7): casi todo es de hoy o de ayer, y para lo demás, el
// calendario del teléfono. Los días se cuentan sin zona horaria (R13).
export function DayField({ value, today, onChange, dateInput, error }: DayFieldProps) {
  const yesterday = addDays(today, -1);
  const [other, setOther] = useState(value !== today && value !== yesterday);
  const dateRef = useRef<HTMLInputElement | null>(null);
  const choice: DayChoice = other ? "other" : value === yesterday ? "yesterday" : "today";

  const choose = (next: DayChoice) => {
    setOther(next === "other");
    if (next === "today") onChange(today);
    else if (next === "yesterday") onChange(yesterday);
    // El calendario se abre solo; si el navegador no deja, queda el campo para tocarlo.
    else
      requestAnimationFrame(() => {
        try {
          dateRef.current?.showPicker();
        } catch {
          dateRef.current?.focus();
        }
      });
  };

  return (
    <div className="flex flex-col gap-2">
      <span id="day-label" className="text-body font-medium">
        Fecha
      </span>
      <Segmented label="Fecha" options={CHOICES} value={choice} onChange={choose} />
      {other && (
        <Input
          id="day"
          type="date"
          aria-labelledby="day-label"
          aria-invalid={error ? true : undefined}
          {...dateInput}
          ref={(element) => {
            dateInput.ref(element);
            dateRef.current = element;
          }}
        />
      )}
      {error && <p className="text-body text-destructive">{error}</p>}
    </div>
  );
}
