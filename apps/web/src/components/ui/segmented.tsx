import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

// Elegir una de pocas opciones a la vista, como Gasto o Ingreso: un grupo de radios con
// la elegida en relieve.
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-md bg-surface-sunken p-1"
    >
      {options.map((option) => {
        const checked = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-10 rounded-sm px-2 text-body",
              checked ? "bg-surface-raised font-medium text-ink shadow-card" : "text-ink-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
