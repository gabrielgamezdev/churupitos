// Al corregir un movimiento importado con varias comisiones, el formulario enseña una y
// las demás se conservan tal cual (M13): esto lo dice, para que no parezca que se perdieron.
export function KeptFeesNote({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <p className="text-caption text-ink-muted">
      {count === 1
        ? "Además lleva otra comisión, que se conserva tal cual."
        : `Además lleva ${count} comisiones más, que se conservan tal cual.`}
    </p>
  );
}
