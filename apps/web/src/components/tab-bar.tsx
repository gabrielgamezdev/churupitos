import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { ChartPie, HandCoins, House, Mail, Plus, type LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import {
  isFormScreen,
  registerContext,
  SECTIONS,
  SECTIONS_BEFORE_REGISTER,
  sectionOf,
  type Section,
  type SectionId,
} from "@/components/sections";
import { cn } from "@/lib/utils";

const ICONS: Record<SectionId, LucideIcon> = {
  home: House,
  envelopes: Mail,
  budget: ChartPie,
  debts: HandCoins,
};

// La barra de secciones: Inicio · Sobres · ＋ · Presupuesto · Deudas (M7). El centro es
// para lo que más se hace, registrar, y no para una pantalla; así desaparecen los botones
// flotantes, que tapaban la columna de los importes.
//
// Deja el historial siempre como Inicio → la primera pantalla de una sección → lo que
// se abrió dentro. Así el atrás de Android vuelve a Inicio desde la primera pantalla
// de cualquier sección, y tocar la sección en la que se está vuelve a su principio.
// Para saber dónde está Inicio en el historial usa la posición que TanStack Router
// guarda en cada entrada (`__TSR_index`).
export function TabBar() {
  const router = useRouter();
  const location = useRouterState({ select: (state) => state.location });
  const index = location.state.__TSR_index;
  const current = sectionOf(location.pathname);
  // Dónde se vio Inicio por última vez.
  const homeIndex = useRef<number | null>(null);

  useEffect(() => {
    if (location.pathname === "/") homeIndex.current = index;
  }, [location.pathname, index]);

  const goTo = (section: Section) => {
    const home = homeIndex.current;
    const homeBelow = home !== null && home < index;

    if (section.id === "home") {
      if (location.pathname === "/") return;
      if (homeBelow) router.history.go(home - index);
      else void router.navigate({ to: "/", replace: true });
      return;
    }
    if (location.pathname === section.path) return;
    if (location.pathname === "/") {
      void router.navigate({ to: section.path });
      return;
    }
    if (homeBelow && home + 1 < index) {
      // Vuelve a la pantalla de justo encima de Inicio y la cambia por la sección.
      const stop = router.history.subscribe(() => {
        stop();
        void router.navigate({ to: section.path, replace: true });
      });
      router.history.go(home + 1 - index);
      return;
    }
    if (homeBelow) {
      void router.navigate({ to: section.path, replace: true });
      return;
    }
    // Se entró directo por una dirección: Inicio debajo, y la sección encima.
    void router
      .navigate({ to: "/", replace: true })
      .then(() => router.navigate({ to: section.path }));
  };

  if (isFormScreen(location.pathname)) return null;

  const tab = (section: Section) => {
    const Icon = ICONS[section.id];
    const active = current === section.id;
    return (
      // Las cinco del mismo ancho, aunque «Presupuesto» no quepa en el suyo: así el ＋ queda
      // en el centro, y la etiqueta larga se sale un poco por los lados.
      <li key={section.id} className="flex min-w-0 flex-1">
        <Link
          to={section.path}
          aria-current={active ? "page" : undefined}
          onClick={(event) => {
            event.preventDefault();
            goTo(section);
          }}
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-label whitespace-nowrap",
            active ? "text-brand" : "text-ink-muted",
          )}
        >
          <Icon aria-hidden="true" className="size-6" />
          {section.label}
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface-raised pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)]"
    >
      <ul className="mx-auto flex h-(--tab-bar-height) max-w-md">
        {SECTIONS.slice(0, SECTIONS_BEFORE_REGISTER).map(tab)}
        <li className="flex min-w-0 flex-1">
          {/* Registrar no es una sección: se abre encima de la pantalla en la que se está,
              con su cuenta o su sobre ya elegidos, y al guardar vuelve a ella. */}
          <Link
            to="/operations/new"
            search={registerContext(location.pathname)}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-label whitespace-nowrap text-brand"
          >
            <span className="grid size-12 place-items-center rounded-full bg-brand text-on-brand shadow-card">
              <Plus aria-hidden="true" className="size-6" />
            </span>
            Registrar
          </Link>
        </li>
        {SECTIONS.slice(SECTIONS_BEFORE_REGISTER).map(tab)}
      </ul>
    </nav>
  );
}
