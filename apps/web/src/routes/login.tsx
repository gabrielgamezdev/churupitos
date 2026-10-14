import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";

import { LoginForm } from "@/features/auth/login-form";
import type { LoginValues } from "@/features/auth/login-schema";
import { safeRedirect } from "@/lib/safe-redirect";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  // Una función y no un esquema de zod: lo que no es el componente va en el bundle
  // principal, y zod pesa más que toda esta pantalla.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  // Con la sesión ya iniciada, la pantalla de login no tiene nada que hacer.
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ href: safeRedirect(search.redirect) });
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const search = Route.useSearch();

  const signIn = async ({ email, password }: LoginValues) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await router.navigate({ href: safeRedirect(search.redirect) });
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-4 py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <img src="/favicon.svg" alt="" className="size-16" />
        <h1 className="text-2xl font-semibold">Churupitos</h1>
        <p className="text-sm text-muted-foreground">
          Inicia sesión para ver las finanzas del hogar.
        </p>
      </div>
      <LoginForm onSubmit={signIn} />
    </main>
  );
}
