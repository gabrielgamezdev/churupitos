// Por qué no se guardó, no se borró o no se deshizo. Los errores de las reglas ya vienen
// en español desde la base; los de red, no.
export function writeErrorMessage(error: unknown): string {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  if (code === "23514" || code === "42501" || code === "P0001") return message ?? "";
  if (message?.includes("fetch")) return "No se pudo conectar. Inténtalo de nuevo.";
  return "Inténtalo de nuevo.";
}
