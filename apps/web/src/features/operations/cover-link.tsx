import { Link } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CoverLinkProps {
  accountId: string;
  envelopeId: string;
  // Lo que le falta a la celda para llegar a cero: lo que se propone mover.
  shortfallCents: number;
  // Para el lector de pantalla: «Cubrir Comida en Banco A».
  label: string;
}

// «Cubrir» un descubierto (M8): abre Mover con el destino puesto (esa celda) y el monto
// que le falta; solo queda elegir de qué sobre de la misma cuenta sale. Así se cubre en
// el Excel: después, en bloque, con lo que sobra en otro sobre.
export function CoverLink({ accountId, envelopeId, shortfallCents, label }: CoverLinkProps) {
  return (
    <Link
      to="/operations/new"
      search={{ mode: "move", account: accountId, toEnvelope: envelopeId, amount: shortfallCents }}
      aria-label={label}
      className={cn(buttonVariants({ variant: "outline" }), "shrink-0 px-3")}
    >
      Cubrir
    </Link>
  );
}
