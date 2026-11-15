/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// La versión que muestra la app: el commit con el que Cloudflare la construyó
// (Workers Builds lo deja en WORKERS_CI_COMMIT_SHA), o «local» en la PC. Así se
// sabe a simple vista si un teléfono ya tiene lo último.
const appVersion = process.env.WORKERS_CI_COMMIT_SHA?.slice(0, 7) ?? "local";

// El lector de capturas (M15, ADR 0010): sus archivos se sirven desde la propia app, en
// una carpeta con las versiones en la ruta, y no entran en el precache: se bajan la
// primera vez que se lee una captura. De los núcleos, el lector baja solo el que entiende
// el teléfono.
const require = createRequire(import.meta.url);
const OCR_PACKAGES = ["tesseract.js", "tesseract.js-core", "@tesseract.js-data/spa"];
const ocrPath = `/ocr/${OCR_PACKAGES.map((name) => require(`${name}/package.json`).version).join("-")}/`;
const ocrFiles: Record<string, string> = {
  "worker.min.js": "tesseract.js/dist/worker.min.js",
  ...Object.fromEntries(
    ["relaxedsimd-lstm", "simd-lstm", "lstm"].map((core) => [
      `tesseract-core-${core}.wasm.js`,
      `tesseract.js-core/tesseract-core-${core}.wasm.js`,
    ]),
  ),
  "spa.traineddata.gz": "@tesseract.js-data/spa/4.0.0_best_int/spa.traineddata.gz",
};
const readOcrFile = (name: string) => readFileSync(require.resolve(ocrFiles[name]));

function ocrAssets(): Plugin {
  return {
    name: "churupitos-ocr",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const name = request.url?.split("?")[0].replace(ocrPath, "");
        if (!name || !request.url?.startsWith(ocrPath) || !(name in ocrFiles)) return next();
        response.setHeader(
          "Content-Type",
          name.endsWith(".js") ? "text/javascript" : "application/gzip",
        );
        response.end(readOcrFile(name));
      });
    },
    generateBundle() {
      for (const name of Object.keys(ocrFiles)) {
        this.emitFile({
          type: "asset",
          fileName: `${ocrPath.slice(1)}${name}`,
          source: readOcrFile(name),
        });
      }
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __OCR_PATH__: JSON.stringify(ocrPath),
  },
  plugins: [
    ocrAssets(),
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
        // Compartir → Churupitos (M15): una imagen compartida desde el banco, WhatsApp o
        // la galería llega aquí y la recibe el service worker (public/share-target.js).
        share_target: {
          action: "/share-capture",
          method: "POST",
          enctype: "multipart/form-data",
          params: { files: [{ name: "capture", accept: ["image/*"] }] },
        },
      },
      workbox: {
        // Solo el «cascarón» de la app. Los datos van a Supabase y nunca se
        // cachean aquí: la caché de datos es la de TanStack Query (M2).
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        globIgnores: ["ocr/**", "share-target.js"],
        // Va antes que las rutas de Workbox: recibe la captura compartida.
        importScripts: ["share-target.js"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            // El lector de capturas y su núcleo: se guardan la primera vez que se usan.
            // Los datos del español no: los guarda el propio lector, ya descomprimidos.
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/ocr/") && url.pathname.endsWith(".js"),
            handler: "CacheFirst",
            options: {
              cacheName: "lector",
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
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
