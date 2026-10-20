import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RegisterButtonProps {
  // Lo que ya viene elegido: la cuenta o el sobre de la pantalla desde la que se abre.
  account?: string;
  envelope?: string;
}

// «Registrar», flotando sobre la barra de secciones. Deja su hueco al final de la
// pantalla para no tapar la última fila.
export function RegisterButton({ account, envelope }: RegisterButtonProps) {
  return (
    <>
      <div aria-hidden="true" className="h-tap" />
      <Link
        to="/operations/new"
        search={{ account, envelope }}
        className={cn(
          buttonVariants(),
          // A la derecha de la columna de la app, también en una pantalla ancha.
          "fixed right-[max(1rem,calc(50vw-13rem))] bottom-[calc(var(--tab-bar-height)_+_env(safe-area-inset-bottom,0px)_+_1rem)] z-20 rounded-full pr-5 shadow-card",
        )}
      >
        <Plus aria-hidden="true" />
        Registrar
      </Link>
    </>
  );
}
