// Las secciones de la barra, en su orden visual: Inicio va en el centro, como en la
// v2. Deudas está desde M4 para que la barra no cambie de forma, aunque su pantalla
// llega en M5.

export type SectionId = "envelopes" | "debts" | "home" | "budget" | "settings";

export type Section = {
  id: SectionId;
  label: string;
  path: "/envelopes" | "/debts" | "/" | "/budget" | "/settings";
};

export const SECTIONS: readonly Section[] = [
  { id: "envelopes", label: "Sobres", path: "/envelopes" },
  { id: "debts", label: "Deudas", path: "/debts" },
  { id: "home", label: "Inicio", path: "/" },
  { id: "budget", label: "Presupuesto", path: "/budget" },
  { id: "settings", label: "Ajustes", path: "/settings" },
];

// A qué sección pertenece una pantalla. Las monedas y las cuentas cuelgan de Inicio,
// y la galería, de Ajustes.
export function sectionOf(pathname: string): SectionId {
  if (pathname === "/envelopes" || pathname.startsWith("/envelopes/")) return "envelopes";
  if (pathname === "/debts") return "debts";
  if (pathname === "/budget") return "budget";
  if (pathname === "/settings" || pathname === "/gallery") return "settings";
  return "home";
}

// Si es la primera pantalla de su sección: desde ella, el atrás vuelve a Inicio.
export function isSectionRoot(pathname: string): boolean {
  return SECTIONS.some((section) => section.path === pathname);
}
