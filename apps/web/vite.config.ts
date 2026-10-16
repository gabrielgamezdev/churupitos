/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// La versión que muestra la app: el commit con el que Cloudflare la construyó
// (Workers Builds lo deja en WORKERS_CI_COMMIT_SHA), o «local» en la PC. Así se
// sabe a simple vista si un teléfono ya tiene lo último.
const appVersion = process.env.WORKERS_CI_COMMIT_SHA?.slice(0, 7) ?? "local";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    // Genera src/routeTree.gen.ts a partir de src/routes/. Tiene que ir antes
    // que el plugin de React.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      // La versión nueva no se activa sola: la app pregunta antes, para no
      // recargar a mitad de un registro (ver src/features/pwa/update-prompt.tsx).
      registerType: "prompt",
      // Iconos y enlaces del <head> generados desde public/favicon.svg
      // (ver pwa-assets.config.ts). El theme-color no: index.html pone uno por tema,
      // y el que inyecta el plugin (sin tema) les ganaría.
      pwaAssets: { config: true, overrideManifestIcons: true, injectThemeColor: false },
      manifest: {
        name: "Churupitos",
        short_name: "Churupitos",
        description: "Las finanzas del hogar: bolívares y dólares, sobres y cuentas.",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        // El manifiesto solo admite un color: el fondo claro (surface). En oscuro,
        // la barra del sistema la pone el theme-color de index.html.
        theme_color: "#f6f8f6",
        background_color: "#f6f8f6",
      },
      workbox: {
        // Solo el «cascarón» de la app. Los datos van a Supabase y nunca se
        // cachean aquí: la caché de datos es la de TanStack Query (M2).
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    // El bundle principal (React, supabase-js, el router y la caché de datos) hace
    // falta para pintar la primera pantalla, y el service worker lo guarda una vez
    // por versión. El aviso salta si crece más allá de lo que ya cuesta eso.
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
