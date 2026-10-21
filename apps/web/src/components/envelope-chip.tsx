import { cn } from "@/lib/utils";

interface EnvelopeChipProps {
  name: string;
  emoji?: string | null;
  // «Otro» no es del hogar (R11): va sin emoji y en su color.
  isThirdParty?: boolean;
  className?: string;
}

// El sobre de un movimiento o de una fila, como en el Excel: su emoji y su nombre.
// El emoji es adorno para quien lee la pantalla; el lector de pantalla dice el nombre.
export function EnvelopeChip({ name, emoji, isThirdParty = false, className }: EnvelopeChipProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1 whitespace-nowrap",
        // «Otro», sin emoji y con borde punteado: se distingue sin depender del color.
        isThirdParty
          ? "rounded-sm border border-dashed border-third-party px-1 text-third-party"
          : "text-ink-muted",
        className,
      )}
    >
      {!isThirdParty && emoji && <span aria-hidden="true">{emoji}</span>}
      {/* Un nombre largo se corta con «…» si no cabe, en vez de empujar lo de al lado. */}
      <span className="truncate">{name}</span>
    </span>
  );
}
