// Una hoja del Excel vista como cuadrícula, con filas numeradas como en el Excel
// (la primera es la 1) y columnas desde 0 (la A). Las cabeceras y los bloques se
// buscan por su texto y no por su posición: cambian de sitio de un mes a otro.

import * as XLSX from "xlsx";
import type { CellObject, WorkSheet } from "xlsx";
import { parseDateText, serialToIsoDate } from "./dates.ts";
import { normalizeLabel, normalizeText } from "./text.ts";

export type Sheet = { name: string; ws: WorkSheet; lastRow: number; lastCol: number };

export type Position = { row: number; col: number };

export function toSheet(name: string, ws: WorkSheet): Sheet {
  const range = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : null;
  return { name, ws, lastRow: range ? range.e.r + 1 : 0, lastCol: range ? range.e.c : -1 };
}

// La celda tal cual, también si está vacía o es una fórmula sin valor guardado.
export function rawCellAt(sheet: Sheet, row: number, col: number): CellObject | undefined {
  return sheet.ws[XLSX.utils.encode_cell({ r: row - 1, c: col })] as CellObject | undefined;
}

export function cellAt(sheet: Sheet, row: number, col: number): CellObject | undefined {
  const cell = rawCellAt(sheet, row, col);
  // Una celda con formato pero sin valor (o con un error de fórmula) cuenta como vacía.
  if (!cell || cell.t === "z" || cell.t === "e" || cell.v === undefined) return undefined;
  if (cell.t === "s" && normalizeText(cell.v) === "") return undefined;
  return cell;
}

export function textAt(sheet: Sheet, row: number, col: number): string {
  return normalizeText(cellAt(sheet, row, col)?.v);
}

export function labelAt(sheet: Sheet, row: number, col: number): string {
  return normalizeLabel(cellAt(sheet, row, col)?.v);
}

export function numberAt(sheet: Sheet, row: number, col: number): number | null {
  const cell = cellAt(sheet, row, col);
  return cell?.t === "n" ? (cell.v as number) : null;
}

// La fecha de una celda: un número de serie o un texto que se entienda. `text`
// guarda lo escrito cuando no se pudo leer como fecha («???»).
export function dateAt(
  sheet: Sheet,
  row: number,
  col: number,
): { date: string | null; text: string | null } {
  const cell = cellAt(sheet, row, col);
  if (!cell) return { date: null, text: null };
  if (cell.t === "n") return { date: serialToIsoDate(cell.v as number), text: null };
  if (cell.t === "d") return { date: (cell.v as Date).toISOString().slice(0, 10), text: null };
  const written = normalizeText(cell.v);
  const date = parseDateText(written);
  return { date, text: date ? null : written };
}

export function cellRef(sheet: Sheet, row: number, col: number): string {
  return `${sheet.name}!${XLSX.utils.encode_col(col)}${row}`;
}

// La primera celda (por filas) cuyo texto normalizado cumple la condición.
export function findCell(
  sheet: Sheet,
  matches: (label: string) => boolean,
  { fromRow = 1, toRow = sheet.lastRow, fromCol = 0, toCol = sheet.lastCol } = {},
): Position | null {
  for (let row = fromRow; row <= toRow; row++) {
    for (let col = fromCol; col <= toCol; col++) {
      const label = labelAt(sheet, row, col);
      if (label && matches(label)) return { row, col };
    }
  }
  return null;
}

// Todas las celdas cuya etiqueta cumple, de arriba abajo y de izquierda a derecha.
export function findCells(sheet: Sheet, matches: (label: string) => boolean): Position[] {
  const found: Position[] = [];
  for (let row = 1; row <= sheet.lastRow; row++) {
    for (let col = 0; col <= sheet.lastCol; col++) {
      const label = labelAt(sheet, row, col);
      if (label && matches(label)) found.push({ row, col });
    }
  }
  return found;
}

// Las columnas de una fila de cabecera, por su etiqueta normalizada. Las
// etiquetas que no se conocen se ignoran.
export function headerColumns<Field extends string>(
  sheet: Sheet,
  row: number,
  fields: Record<Field, (label: string, raw: string) => boolean>,
  { fromCol = 0, toCol = sheet.lastCol } = {},
): Partial<Record<Field, number>> {
  const columns: Partial<Record<Field, number>> = {};
  for (let col = fromCol; col <= toCol; col++) {
    const raw = textAt(sheet, row, col);
    if (!raw) continue;
    const label = normalizeLabel(raw);
    for (const field of Object.keys(fields) as Field[]) {
      if (columns[field] === undefined && fields[field](label, raw)) {
        columns[field] = col;
        break;
      }
    }
  }
  return columns;
}
