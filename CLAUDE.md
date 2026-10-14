# Churupitos — instrucciones del proyecto

App de finanzas del hogar para dos personas, en Venezuela: bolívares y dólares,
presupuesto por sobres y varias cuentas. Es una **PWA para Android** que sustituye
unos Excels mensuales. Hasta el día del corte, esos Excels siguen siendo la fuente
de verdad y la app se recarga desde ellos.

Es la tercera versión. Las dos anteriores se abandonaron por crecer antes de que
nadie las usara: aquí se construye **por módulos pequeños, y cada uno se prueba en
los teléfonos antes de empezar el siguiente**.

---

## Lee esto antes de tocar nada

| Documento | Para qué |
|---|---|
| `docs/ESTADO.md` | En qué módulo estamos, qué toca y las decisiones ya tomadas |
| `docs/modulos/` | El plan del módulo en curso: qué entra, qué no y cuándo está hecho |
| `docs/TRAMPAS.md` | Fallos que ya costaron tiempo. **Leerlo ahorra horas** |
| `docs/adr/` | Decisiones de arquitectura, una por archivo, con su porqué |
| `README.md` | Qué es, cómo se arranca y **todos los comandos** |

`docs/DOMINIO.md` (el método del Excel: conceptos, reglas y decisiones de dominio)
nace en M1, junto al esquema de la base.

---

## Mantener la documentación al día

**Al terminar cualquier trabajo, revisar si algún documento quedó desfasado.**
Forma parte de dar el trabajo por terminado, igual que dejar `npm run check` en verde.

El criterio es **actualizar antes que crear**: si un documento ya cubre el tema y
dejó de ser cierto, se corrige ahí. Uno nuevo que contradice a uno viejo deja dos
versiones compitiendo. Cada dato vive en un solo sitio y los demás enlazan.

| Documento | Trato |
|---|---|
| `CLAUDE.md`, `README.md`, `docs/ESTADO.md`, `docs/TRAMPAS.md` | **Vivos** |
| `docs/modulos/Mn-*.md` | **Vivo mientras dure el módulo.** Al cerrarlo se congela |
| `docs/adr/` | **Se supersede, no se edita.** Si la decisión cambia, se escribe un ADR nuevo que reemplaza al anterior, y el viejo se marca como sustituido |

Topes de tamaño: `CLAUDE.md` y `README.md`, 200 líneas; `ESTADO.md`, 120; un ADR,
80; una entrada de TRAMPAS, 15. Los números que caducan con cada commit (cuántas
pruebas, cuántos archivos) no se escriben a mano.

### Al cambiar algo, revisar en concreto

- ¿Cambió una orden que se teclea? → `README.md`, y solo ahí.
- ¿Se cerró o abrió un módulo? → `docs/ESTADO.md` y su `docs/modulos/Mn-*.md`.
- ¿Costó tiempo un fallo no evidente? → `docs/TRAMPAS.md`.
- ¿Cambió una decisión de arquitectura? → un ADR nuevo.
- ¿Cambió una carpeta o una pieza de la arquitectura? → «Arquitectura en una pantalla», aquí abajo.

---

## Reglas duras

No son preferencias. Romper cualquiera de estas es un error, no un estilo distinto.

### 1. Nada personal entra en git

**El repositorio es público.** Un dato dentro de un commit sobrevive al borrado
del archivo, y sacarlo obliga a reescribir la historia.

Prohibido en cualquier archivo versionado, incluidos comentarios, pruebas, datos
de ejemplo, capturas y **mensajes de commit**:

- Nombres de los bancos y plataformas reales donde hay dinero o deudas.
- Nombres de personas: los dos usuarios, sus apodos, familiares y terceros.
- Importes tomados del histórico. En ejemplos, cifras redondas inventadas.
- Referencias a celdas de los Excels.
- Correos personales e IPs de la casa.

Todo lo real vive en **`privado/`**, ignorada entera: los Excels, el catálogo del
importador, la investigación, las copias y la lista de nombres del barrido.
Ver `docs/adr/0004-privacidad.md`.

El barrido de privacidad (`ops/barrido-privacidad.mjs`) corre solo en cada commit
(hooks de `.githooks/`, activados por `npm install`) y en cada push (CI). La lista
de nombres **no sale nunca de `privado/`**, ni como secreto de la CI: allí solo se
buscan patrones (ADR 0006).

### 2. El dinero son enteros de céntimos

`Bs 19,85` es `1985`, con su moneda aparte. Jamás decimales ni tolerancias del tipo
`abs(a - b) < 0.001`. Ver `docs/adr/0002-dinero-enteros.md`.

### 3. Ningún saldo se almacena

Todos los saldos salen de vistas que suman asientos. Una columna `balance`,
`running_balance` o `remaining_amount` es un error: son justo los datos que se
corrompían en las versiones anteriores. Ver `docs/adr/0003-saldos-derivados.md`.

### 4. Las reglas viven en la base de datos

Restricciones, funciones y vistas de Postgres. La app solo mejora la experiencia:
avisa antes, pero nunca es la única que impide algo.

### 5. Ninguna tabla sin permisos por fila

Cada tabla expuesta tiene RLS activado y una política que solo deja pasar a los dos
usuarios. Una tabla sin RLS es pública para cualquiera que tenga la URL de la app.
Las pruebas de la base lo comprueban.

### 6. Se puede registrar en descubierto

Un gasto que deja una celda en negativo se guarda con un aviso, nunca se rechaza.
Así funciona el Excel: entre el 6 % y el 20 % de los gastos lo hacen y se cubren
en bloque después.

### 7. Nada que pueda cobrar por uso

Planes gratis y **sin método de pago** en Cloudflare, Supabase y GitHub: así lo que
pase de un límite se corta, nunca se factura. Cloudflare solo sirve estáticos;
`ops/guardia-costos.mjs` hace fallar el check si `wrangler.jsonc` pide algo más.
Añadir algo que se pague por uso es decisión del autor, con su ADR. Ver ADR 0007.

---

## Cómo se trabaja aquí

- **Por módulos** (M0, M1…), en el orden de `docs/ESTADO.md`: primero ver, después
  registrar. Un módulo está **hecho** cuando `npm run check` está en verde **y** se
  probó en los teléfonos.
- **Los comandos están en `README.md`**. No se copian a otros documentos.
- **Hasta el corte**, la base se puede vaciar y recargar entera desde los Excels.
  Lo que se registre en la app antes de ese día es de prueba.

### Al hacer un commit

**Conventional Commits**, en español: `tipo(ámbito): resumen en minúscula`.
Tipos: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `build`, `ci`.
Ámbitos: `web`, `db`, `import`, `ops`, `docs`. El hook `commit-msg` lo comprueba.

El cuerpo explica **por qué**, no qué: qué se rompía, qué se decidió, qué se midió.

**Prohibido cualquier rastro de coautoría o mención a la herramienta** con la que
se escribió el código. Ni trailers, ni firmas, ni referencias en el cuerpo. Está
desactivado en `.claude/settings.json` y el barrido lo bloquea. Los commits se
firman con la identidad pública del autor, configurada en el repositorio
(`git config user.name` / `user.email`): nunca con otro correo personal.

### Al escribir código

- **Identificadores en inglés**: variables, constantes, funciones, tipos, tablas y
  columnas. **Texto en español**: comentarios, mensajes al usuario, descripciones
  de las pruebas y commits. No se mezclan los dos idiomas en un mismo nombre.
- Se comenta el **porqué**, no lo que hace la línea, y solo donde no es obvio.
- TypeScript estricto. Nada de `any` sin un comentario que explique por qué.

---

## Arquitectura en una pantalla

```
apps/web/            la PWA: React + Vite + Tailwind + shadcn/ui        (M0)
supabase/            migraciones, vistas de saldos, funciones, RLS      (M0–M1)
tools/importer/      Excels → base de datos, sin datos dentro           (M1)
ops/                 barrido de privacidad; luego copias de seguridad
.githooks/           pre-commit y commit-msg
docs/                estado, módulos, trampas, ADR
privado/             FUERA DE GIT: todo lo real
```

Backend: Supabase (Postgres + Auth + API), en la nube para el uso real y en Docker
para desarrollar. La PWA se publica como estáticos en Cloudflare. Ver
`docs/adr/0001-stack.md` y `docs/adr/0005-hosting-y-acceso.md`.

### El modelo, en tres frases

1. **La celda es la unidad de saldo**: la intersección de una cuenta y un sobre.
   «Ahorro tiene 500» no dice nada sin decir en qué cuenta, porque no se puede
   pagar desde un banco con dinero que está en otro.
2. **La tasa es del ingreso**, nunca del día ni del mes: pueden convivir varias en
   un mes. Se deriva del importe en dólares y en bolívares de cada cobro.
3. **El invariante de cuadre**: por cada moneda, la suma de los saldos de las
   cuentas es igual a la suma de los restantes de los sobres. Si no da cero, hay
   un bug.

---

## Entorno de la máquina (Windows)

- **`python` es el alias roto de Microsoft Store**: usar `py -3`.
- **`bash` desde npm o desde `cmd` es el de WSL**, no el de Git: los scripts del
  proyecto van en Node (`.mjs`), no en bash.
- **`mise` está bloqueado** por Smart App Control. Si un binario nuevo no arranca
  sin dar error, sospechar de lo mismo.
- **`nvm use` cambia el enlace global** y afecta a otros proyectos: no tocarlo.
  Node 24 ya está activo y sirve.
- **Docker Desktop** tiene que estar encendido para el Supabase local.
- **GitHub**: el repositorio es de la cuenta `gabrielgamezdev` y se sube por SSH con
  el alias `github-personal` (`git@github-personal:gabrielgamezdev/…`). La CLI `gh`
  tiene sesión con **otra** cuenta: nada de `gh repo create` sin cambiar antes de cuenta.
