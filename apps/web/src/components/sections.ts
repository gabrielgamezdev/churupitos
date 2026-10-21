// Las secciones de la barra, en su orden visual: Inicio · Sobres · ＋ · Presupuesto ·
// Deudas. El ＋ del centro no es una sección: abre Registrar (M7). Ajustes tampoco tiene
// pestaña: se abre desde Inicio.

export type SectionId = "home" | "envelopes" | "budget" | "debts";

export type Section = {
  id: SectionId;
  label: string;
  path: "/" | "/envelopes" | "/budget" | "/debts";
};

export const SECTIONS: readonly Section[] = [
  { id: "home", label: "Inicio", path: "/" },
  { id: "envelopes", label: "Sobres", path: "/envelopes" },
  { id: "budget", label: "Presupuesto", path: "/budget" },
  { id: "debts", label: "Deudas", path: "/debts" },
];

// Cuántas secciones van antes del ＋: queda en el centro, con dos a cada lado.
export const SECTIONS_BEFORE_REGISTER = 2;

// A qué sección pertenece una pantalla. Las monedas, las cuentas, Ajustes y la galería
// cuelgan de Inicio.
export function sectionOf(pathname: string): SectionId {
  if (pathname === "/envelopes" || pathname.startsWith("/envelopes/")) return "envelopes";
  if (pathname === "/debts" || pathname.startsWith("/debts/")) return "debts";
  if (pathname === "/budget") return "budget";
  return "home";
}

// Los formularios ocupan la pantalla entera, sin barra: se sale guardando o con la flecha.
export function isFormScreen(pathname: string): boolean {
  return (
    pathname.startsWith("/operations/") ||
    pathname === "/debts/new" ||
    (pathname.startsWith("/debts/") && pathname.endsWith("/edit"))
  );
}

// Si es la primera pantalla de su sección: desde ella, el atrás vuelve a Inicio.
export function isSectionRoot(pathname: string): boolean {
  return SECTIONS.some((section) => section.path === pathname);
}

// Lo que el ＋ deja elegido en Registrar: la cuenta o el sobre de la pantalla en la que se
// está, como hacía el botón flotante de cada una.
export function registerContext(pathname: string): { account?: string; envelope?: string } {
  const account = /^\/accounts\/([^/]+)$/.exec(pathname)?.[1];
  if (account) return { account };
  const envelope = /^\/envelopes\/([^/]+)$/.exec(pathname)?.[1];
  if (envelope) return { envelope };
  return {};
}
