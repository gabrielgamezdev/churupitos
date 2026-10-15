# M1 · Histórico

- **Estado:** en curso (desde 2026-10-14). El autor aprobó este plan y
  `docs/DOMINIO.md` el 2026-10-14.
- **Objetivo:** que la base tenga **todos** los meses de los Excels, tal cual, y que
  se pueda demostrar celda a celda que dicen lo mismo.

## Prioridad
Lo primero es que **el estado de hoy** coincida con el último Excel: el total en Bs y
en $, el saldo de cada cuenta y lo que tiene cada sobre aunque esté repartido en varias
cuentas. Lo segundo, que al ir hacia atrás cada mes también coincida.

Los Excels siguen existiendo y son el respaldo, así que **las dudas no bloquean**: se
carga con una decisión razonable por defecto, el autor compara contra el Excel, y lo
que no convenza se ajusta en el catálogo y se recarga todo. Equivocarse en una duda
cuesta una recarga, no datos.

## Hecho cuando
- **Hoy:** cada celda cuenta × sobre, cada cuenta y los totales por moneda (con y sin
  «Otro») dan exactamente lo mismo que el último Excel. Cero diferencias.
- **Hacia atrás:** lo mismo al cierre de cada mes importado.
- Las comprobaciones del presupuesto (`R12`) se calculan para cada mes y se comparan
  con el Excel; una diferencia ahí se anota y se revisa, pero no bloquea.
- Los datos están en la base de la nube, y una consulta desde el teléfono los ve.
- `npm run check` y las pruebas de la base en verde, en local y en la CI.

## Pasos
1. [x] **`DOMINIO.md` aprobado** por el autor.
2. [x] **Esquema del libro**: cuentas, sobres, operaciones y asientos, con los
   invariantes de `R5` en la base y los saldos por celda, cuenta, sobre y moneda,
   a hoy o al cierre de cualquier día, más el libro de cada cuenta.
   Pruebas de la base con datos inventados: un gasto en descubierto, un traspaso que
   no suma cero (rechazado), un cambio de divisa, un arrastre entre meses.
3. [x] **Esquema del presupuesto y las deudas**: ingresos esperados, cobros y su
   reparto, plan por sobre, deudas y deudores. Mismas pruebas, mismos datos inventados.
4. [x] **Lector de Excels** (`tools/importer`): de un `.xlsx` a filas limpias, con el
   catálogo privado. Probado con un Excel **inventado** generado por las propias
   pruebas, nunca con uno real.
5. [x] **Agrupador**: de filas a operaciones (pares espejo, cobros con su reparto,
   cambios de divisa, comisiones). Ante la duda, no agrupa: deja la fila sola y la
   anota en el informe.
6. [ ] **Informe en seco**: el importador corre sin escribir y lista cada caso raro
   con la decisión por defecto que tomó. Las que el autor quiera cambiar van al
   catálogo privado; las demás se quedan como están.
7. [ ] **Carga local y oráculo**: vaciar y recargar el Supabase local (con el candado
   del corte) y comparar contra el Excel, primero el estado de hoy y luego cada mes
   hacia atrás, hasta cero diferencias.
8. [ ] **Carga en la nube**: migraciones con `db:push`, importación a la nube y una
   comprobación desde el teléfono.

Cada paso termina con su commit; los pasos 3, 7 y 8 terminan además con un push.

## Tope de complejidad
- **Tablas:** como mucho 10, más las vistas de saldos.
- **Importador:** si pasa de ~2.500 líneas, se para y se revisa el plan. El de la
  versión anterior tenía más de 10.000, y el 28 % era el presupuesto histórico.
- **Pantallas:** ninguna. La app sigue mostrando el saludo; las pantallas son M2.

## Fuera de M1
- Pantallas para ver o registrar (M2 en adelante).
- Seguimiento de préstamos, comisiones automáticas, notas libres (`DOMINIO.md` §7).
- Importar meses nuevos de forma incremental: hasta el corte, siempre se vacía y se
  recarga todo.

## Referencias
- El estudio de los Excels y del importador anterior está en `privado/investigacion/`.
  Fuera de git: cita cifras y nombres reales.
- El importador de la versión anterior está en `../churupitos_mobile/apps/api/app/importers/`.
  Sirve de referencia para las reglas, no para copiar código.
