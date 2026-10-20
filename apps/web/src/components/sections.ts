// Las secciones de la barra, en su orden visual: Inicio va en el centro, como en la
// v2. Deudas y Presupuesto se suman en su sitio con sus módulos (M5 y M4):
// Sobres · Deudas · Inicio · Presupuesto · Ajustes.

export type SectionId = "envelopes" | "home" | "settings";

export type Section = { id: SectionId; label: string; path: "/envelopes" | "/" | "/settings" };

export const SECTIONS: readonly Section[] = [
  { id: "envelopes", label: "Sobres", path: "/envelopes" },
  { id: "home", label: "Inicio", path: "/" },
  { id: "settings", label: "Ajustes", path: "/settings" },
];

// A qué sección pertenece una pantalla. Las monedas y las cuentas cuelgan de Inicio,
// y la galería, de Ajustes.
export function sectionOf(pathname: string): SectionId {
  if (pathname === "/envelopes" || pathname.startsWith("/envelopes/")) return "envelopes";
  if (pathname === "/settings" || pathname === "/gallery") return "settings";
  return "home";
}

// Si es la primera pantalla de su sección: desde ella, el atrás vuelve a Inicio.
export function isSectionRoot(pathname: string): boolean {
  return SECTIONS.some((section) => section.path === pathname);
}
