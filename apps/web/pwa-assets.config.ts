import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Un solo SVG de origen; vite-plugin-pwa genera los PNG al construir.
const BRAND_GREEN = "#065f46";

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...minimal2023Preset,
    // Android recorta el icono «maskable» con su propia forma: el margen se rellena
    // del mismo verde que el fondo del SVG para que no aparezca un borde blanco.
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: BRAND_GREEN } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: BRAND_GREEN } },
  },
  images: ["public/favicon.svg"],
});
