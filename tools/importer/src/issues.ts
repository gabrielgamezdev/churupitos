// Lo que el lector encuentra al pasar: un error impide importar el mes (falta algo
// en el catálogo, una hoja no tiene la forma de siempre); un aviso solo se anota,
// porque las dudas no bloquean (M1).
export type Issue = {
  level: "error" | "warning";
  code: string;
  message: string;
  // Dónde: `HOJA!B12`. Solo se muestra en local: lleva nombres reales.
  ref?: string;
  // El libro mensual, `AAAA-MM`, cuando se juntan los de varios meses.
  month?: string;
};

export class Issues {
  readonly list: Issue[] = [];

  error(code: string, message: string, ref?: string) {
    this.list.push({ level: "error", code, message, ref });
  }

  warning(code: string, message: string, ref?: string) {
    this.list.push({ level: "warning", code, message, ref });
  }
}
