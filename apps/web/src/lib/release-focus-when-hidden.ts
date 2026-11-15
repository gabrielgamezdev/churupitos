// Al salir de la app (a otra, o al apagar la pantalla) suelta el campo elegido. Si no,
// Android vuelve a abrir el teclado al volver, aunque solo se venga a mirar (M14). Lo
// escrito se queda: solo deja de estar elegido, y para seguir se toca el campo.
export function releaseFocusWhenHidden(doc: Document = document): () => void {
  const release = () => {
    if (doc.visibilityState !== "hidden") return;
    const active = doc.activeElement;
    if (
      active instanceof HTMLElement &&
      active.matches("input, textarea, select, [contenteditable]")
    ) {
      active.blur();
    }
  };
  doc.addEventListener("visibilitychange", release);
  return () => doc.removeEventListener("visibilitychange", release);
}
