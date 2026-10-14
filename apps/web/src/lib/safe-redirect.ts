// Adónde volver después de iniciar sesión. Solo vale una ruta de esta misma app:
// un enlace con `?redirect=https://otro-sitio` no puede sacar a nadie de aquí.
export function safeRedirect(target: unknown, fallback = "/"): string {
  if (typeof target !== "string") return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return fallback;
  }
  return target;
}
