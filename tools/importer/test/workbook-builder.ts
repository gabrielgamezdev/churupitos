// Excels inventados para las pruebas: se construyen en memoria con la misma forma
// que los de verdad y se escriben como `.xlsx`, para que el lector pase por el
// mismo formato. Nunca se prueba con un Excel real (privado/).

import * as XLSX from "xlsx";
import type { CellObject } from "xlsx";

// Una celda: un valor, o un objeto con su fórmula (`f`) o su formato (`z`).
// `date` escribe una fecha como lo hace el Excel: un número de serie con formato.
export type CellSpec =
  string | number | null | { v: string | number; f?: string; z?: string } | { date: string };

const VES = "[$Bs]#,##0.00";
const USD = "[$$]#,##0.00";
export const bs = (v: number, f?: string): CellSpec => ({ v, z: VES, ...(f ? { f } : {}) });
export const usd = (v: number): CellSpec => ({ v, z: USD });
export const date = (iso: string): CellSpec => ({ date: iso });

export function isoToSerial(iso: string): number {
  return (Date.parse(`${iso}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86_400_000;
}

// Las filas se dan por su número en el Excel y empiezan en la columna B, como en
// los libros de verdad.
export function buildSheet(rows: Record<number, CellSpec[]>): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  let lastRow = 0;
  let lastCol = 0;
  for (const [rowNumber, cells] of Object.entries(rows)) {
    cells.forEach((spec, i) => {
      if (spec === null) return;
      const ref = XLSX.utils.encode_cell({ r: Number(rowNumber) - 1, c: i + 1 });
      ws[ref] = toCell(spec);
      lastRow = Math.max(lastRow, Number(rowNumber) - 1);
      lastCol = Math.max(lastCol, i + 1);
    });
  }
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: lastCol } });
  return ws;
}

function toCell(spec: Exclude<CellSpec, null>): CellObject {
  if (typeof spec === "string") return { t: "s", v: spec };
  if (typeof spec === "number") return { t: "n", v: spec };
  if ("date" in spec) return { t: "n", v: isoToSerial(spec.date), z: "dd/mm/yyyy" };
  return { t: typeof spec.v === "number" ? "n" : "s", v: spec.v, f: spec.f, z: spec.z };
}

// Una hoja de cuenta: título, cabecera en la fila 3 y movimientos desde la 4.
export function ledgerSheet(title: string, movements: CellSpec[][]): XLSX.WorkSheet {
  const rows: Record<number, CellSpec[]> = {
    2: [title],
    3: ["Fecha", "Fuente", "Concepto", "Monto", "Restante"],
  };
  movements.forEach((movement, i) => (rows[i + 4] = movement));
  return buildSheet(rows);
}

export function writeWorkbook(sheets: Record<string, XLSX.WorkSheet>): Uint8Array {
  const workbook = XLSX.utils.book_new();
  for (const [name, ws] of Object.entries(sheets)) XLSX.utils.book_append_sheet(workbook, ws, name);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Uint8Array;
}
