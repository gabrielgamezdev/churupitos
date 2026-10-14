import { z } from "zod";

// Solo comprueba que haya algo que mandar. Las reglas de la contraseña (largo,
// letras y números) las impone Supabase al crear la cuenta, no al entrar.
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Escribe tu correo.")
    .pipe(z.email("Ese correo no parece válido.")),
  password: z.string().min(1, "Escribe tu contraseña."),
});

export type LoginValues = z.infer<typeof loginSchema>;
