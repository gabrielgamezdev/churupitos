import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

// Inicio provisional de M0: solo demuestra que la app arranca con su stack.
// El inicio de verdad (una tarjeta por moneda) llega en M2.
function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-2 px-4">
      <h1 className="text-3xl font-semibold">Churupitos</h1>
      <p className="text-muted-foreground">Las finanzas del hogar, en el teléfono.</p>
    </main>
  );
}
