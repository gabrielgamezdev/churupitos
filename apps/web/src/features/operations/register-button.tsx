import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { floatingActionClass } from "@/components/floating-action";

interface RegisterButtonProps {
  // Lo que ya viene elegido: la cuenta o el sobre de la pantalla desde la que se abre.
  account?: string;
  envelope?: string;
}

// «Registrar», flotando sobre la barra de secciones.
export function RegisterButton({ account, envelope }: RegisterButtonProps) {
  return (
    <>
      <div aria-hidden="true" className="h-tap" />
      <Link to="/operations/new" search={{ account, envelope }} className={floatingActionClass}>
        <Plus aria-hidden="true" />
        Registrar
      </Link>
    </>
  );
}
