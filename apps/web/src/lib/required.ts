// Las columnas de una vista llegan como opcionales en los tipos generados, aunque
// nunca vengan vacías: si alguna faltara, mejor un error que un cero inventado.
export function required<T>(value: T | null, column: string): T {
  if (value === null) throw new Error(`La base devolvió una fila sin ${column}`);
  return value;
}
