import { Link, useCanGoBack, useRouter, type LinkProps } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

interface ScreenHeaderProps {
  title: string;
  // Adónde lleva la flecha cuando no hay pantalla anterior (se entró por un enlace).
  // Sin él no hay flecha: es la primera pantalla de una sección.
  back?: LinkProps;
  backLabel?: string;
  // Debajo del título: el saldo de lo que se mira.
  children?: React.ReactNode;
}

// Atrás, el título y el saldo de lo que se mira. Si se llegó desde otra pantalla de la
// app, la flecha vuelve a ella, igual que el atrás de Android; si no, va a `back` sin
// dejar rastro en el historial.
export function ScreenHeader({ title, back, backLabel, children }: ScreenHeaderProps) {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  return (
    <header className="flex flex-col gap-1">
      {back ? (
        <div className="-ml-3 flex items-center gap-1">
          <Link
            {...back}
            replace
            aria-label={backLabel}
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            onClick={(event) => {
              if (!canGoBack) return;
              event.preventDefault();
              router.history.back();
            }}
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
          <h1 className="min-w-0 truncate text-title">{title}</h1>
        </div>
      ) : (
        <h1 className="flex min-h-tap items-center text-title">{title}</h1>
      )}
      {children}
    </header>
  );
}
