import { createCn } from "cn/config";

// `cn` junta clases y, si dos chocan, se queda con la última. Solo conoce los nombres
// de Tailwind: los del design system (styles.css) los tomaría por otra cosa. Con
// `text-amount` por un color, `cn("text-money-in", "text-amount")` tiraba el color.
// Toda la app lo importa de aquí, nunca del paquete `cn` (lo vigila eslint).
export const cn = createCn({
  extend: {
    theme: {
      text: [
        "display-amount",
        "title",
        "heading",
        "body",
        "amount",
        "amount-small",
        "caption",
        "label",
      ],
      spacing: ["tap"],
      shadow: ["card"],
    },
  },
});
