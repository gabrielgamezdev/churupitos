# Trampas ya pisadas

Cada una costó tiempo de verdad, en esta versión o en las anteriores.
**Leer esto antes de depurar algo raro sale más barato que volver a descubrirlo.**

Formato: síntoma → causa → arreglo.

---

## Entorno (Windows)

### `python` no existe pero `py -3` sí
`python --version` responde *"Python was not found; run without arguments to install
from the Microsoft Store"*. Es el alias de la Store, no un intérprete.
**Usar `py -3`.**

### `bash` desde npm abre el de WSL
Un script de npm que llama a `bash ops/algo.sh` falla o corre en otro sistema de
archivos: `cmd` resuelve `bash` a `C:\Windows\System32\bash.exe`, que es WSL, no el
bash de Git. Los hooks de git sí usan el bash de Git, pero npm no.
**Los scripts del proyecto se escriben en Node (`.mjs`).**

### Un script escrito con CRLF rompe su shebang
En la versión anterior, un script generado desde Python en Windows salió con `\r\n`
y falló con *"env: 'bash\r': No such file or directory"*; además git vio el
archivo entero como cambiado. **`.gitattributes` fuerza LF en todo el texto**, y al
generar archivos desde Python hay que escribir con `newline="\n"`.

### Generar código desde un heredoc de bash pierde las barras invertidas
Una `\\` escrita en el comando llega al proceso como una sola `\`, y dentro de un
literal de Python de triple comilla una `\` antes del salto de línea se lo come. Lo
mismo con `node -e "…"`: un regex `\p{…}` pierde su barra, y una palabra entre
comillas invertidas se ejecuta como orden y desaparece del texto.
**Usar cadenas *raw* (`r'''...'''`), o escribir el archivo con la herramienta de
edición (o un script en un archivo) en vez de con un heredoc o un `-e`.**

### Un script que edita SQL con `replace` convierte `$$` en `$`
En JavaScript, `texto.replace(a, b)` interpreta los `$` de `b`: `$$` se vuelve `$`,
`$&` es lo encontrado. Una prueba de pgTAP editada así perdió la mitad de sus `$$` y
dejó de ser SQL válido. **Para reemplazar texto literal, `texto.split(a).join(b)` o
`replace(a, () => b)`.**

### Parar `npm run preview` deja vivo el servidor de Vite
En Windows, cerrar el `npm` que se lanzó en segundo plano no cierra el `node` de
`vite preview` que arrancó: sigue sirviendo, y la siguiente vista previa toma otro
puerto o, peor, las pruebas hablan con la vieja. En una tarde de pruebas se juntaron diez.
**Al terminar, cerrar también los `node` cuya línea de órdenes tenga `vite.js" preview`**
(PowerShell: `Get-CimInstance Win32_Process` filtrando por `CommandLine`).

## El importador

### Un mes preparado antes de tiempo rompe la carga
El libro del mes siguiente se prepara para planificarlo antes de que empiece. En
noviembre de 2026 rompió tres cosas: su plantilla de arrastre (un «Lo que tenía antes»
a cero) parecía decir que las cuentas abrían en cero, con solo un aviso, y habría
vaciado los saldos de hoy; sus saldos, aún sin rellenar, no coincidían con la app (eso
sí paró la carga); y otro bloque «Deudas» tapó la lista de verdad, sin avisar.
**Un arrastre a cero no declara nada, un libro que solo trae la plantilla no se
compara, y un título repetido se resuelve por la cabecera que más columnas reconoce**
(DOMINIO.md §5). Con un libro nuevo: `import:read` y revisar los avisos nuevos.

## Privacidad

### Un ejemplo copiado del Excel se cuela en un comentario
Al explicar el importador apetece citar una fila de verdad («el título del Bono de
octubre»), y con ella entran el importe, el apodo o el banco. El barrido para los
nombres de la lista y los importes con miles y céntimos, pero **no ve una cifra
suelta** («$40», «20 USDT», «400000»): así llegaron algunas a GitHub, y sacarlas
obligó a reescribir el historial.
**Los ejemplos de comentarios, pruebas y documentos se inventan siempre**, con
«Banco A», «Ahorro» y cifras redondas, aunque el caso real se haya visto en privado/.

## Supabase

### Una tabla nueva sin `grant` da «permission denied» desde la app
Desde el 2026-10-30, Supabase ya no da permisos automáticos a las tablas nuevas de
`public`, tampoco al recrear la base desde las migraciones (`db reset`, un proyecto
nuevo). Lo que ya existe los conserva, así que el fallo aparece solo al recrear.
**Cada tabla y cada vista da los suyos en su misma migración**: `revoke all … from anon,
authenticated` y `grant select … to authenticated`. `rls.test.sql` falla si falta uno o
sobra alguno.

### `[auth.email] enable_signup = false` apaga el login por correo
Con eso en `supabase/config.toml`, iniciar sesión responde *"Email logins are
disabled"* (`email_provider_disabled`), aunque el usuario exista y la contraseña
sea correcta. Esa clave no cierra el registro: desactiva el proveedor de correo
entero. **El registro se cierra con `enable_signup = false` en `[auth]`**, y la de
`[auth.email]` se queda en `true`.

### `supabase login` falla dentro del asistente con `LoginMissingTokenError`
*"Cannot use automatic login flow inside non-TTY environments"*. Los comandos que
el asistente lanza (también con `!`) no tienen una terminal interactiva, y el login
necesita una para abrir el navegador. **`npx supabase login` y `npx supabase link`
se corren en una terminal propia**; así, además, ni el token ni la contraseña de la
base pasan por la conversación. Después, la CLI ya funciona desde el asistente.

### Las pruebas de la base no ven los triggers diferidos
La forma de cada operación (R5) se comprueba con triggers `deferrable initially
deferred`, que corren al confirmar. Una prueba de pgTAP acaba en `rollback`, así que
nunca confirma: una operación mal formada **pasa sin error y la prueba sale verde**.
**Cada archivo de pruebas que escriba en el libro empieza con
`set constraints all immediate`**, y registra cada operación con sus asientos en una
sola sentencia (un `with … insert`), para que se compruebe entera.

### `supabase test db --linked` no encuentra pgTAP en la nube
Falla con *"function plan(integer) does not exist"* en cada archivo, aunque diga que
la extensión ya existe: el usuario temporal con el que entra la CLI no tiene
`extensions` en su `search_path`. **Para probar la nube, `npm run db:test:cloud`**, que
corre los mismos archivos con la conexión del importador. Allí aparece además una
función de Supabase (`rls_auto_enable`, la del RLS automático) que las pruebas
tienen en cuenta.

### «Success. No rows returned» tras un `insert` no significa cero filas
El editor SQL del panel de Supabase lo dice siempre que la sentencia no devuelve
una tabla, haya insertado algo o no. **Para saber qué pasó, un `select` después** (o
`insert … returning`).

## La app

### Lo que una ruta declara fuera de su componente va al bundle principal
Con `autoCodeSplitting`, TanStack Router separa el **componente** de cada ruta, pero
`validateSearch`, `beforeLoad` y compañía viajan en el bundle que se descarga al
arrancar. Un `validateSearch: z.object(...)` en el login metió zod entero ahí
(+23 KB comprimidos). **En esas opciones, funciones simples; zod, dentro del
componente o de los formularios.**

### `debts.tsx` y `debts.new.tsx` hacen de la segunda una hija que no se ve
Con rutas en archivos planos, `debts.new.tsx` cuelga de `debts.tsx`, que es su layout:
sin un `<Outlet />` en ella, `/debts/new` cambia la dirección pero sigue pintando la
lista. **Si una sección tiene pantallas debajo, su primera pantalla va en
`debts.index.tsx` (ruta `"/_authenticated/debts/"`), como `envelopes.index.tsx`.**

### Una ruta nueva no compila hasta que Vite regenera el árbol de rutas
`src/routeTree.gen.ts` lo escribe el plugin de TanStack Router al arrancar Vite. Con
una ruta nueva, `npm run build` falla en `tsc -b` («no es asignable a
`keyof FileRoutesByPath`»), que corre antes que Vite. **Regenerarlo primero con
`npx vite build` (o `npm run dev`) en `apps/web`, y después el check.**

### Un contenedor con otro tema sigue pintando el del teléfono
Con los colores en `light-dark()` declarados solo en `:root`, poner `color-scheme: dark`
en un contenedor no cambia nada, aunque en `npm run dev` pueda parecer que sí. El build
(Lightning CSS, dentro de Tailwind) traduce `light-dark()` a variables auxiliares
(`--lightningcss-light` y `-dark`) para navegadores viejos, y una variable se resuelve
donde se declara: los hijos heredan el color de `:root` ya resuelto. Un `color-scheme`
puesto en `style` ni siquiera se traduce.
**Los tokens se declaran en `:root, [data-theme]`, y el tema se fija con `data-theme`.**
Lo que sale de verdad se ve en `apps/web/dist/assets/*.css`.

### Un color o un tamaño de texto desaparece al pasar por `cn`
`cn` junta clases y, si dos chocan, se queda con la última. Solo conoce los tamaños
de Tailwind (`text-sm`…): `text-amount` o `text-label` los toma por colores, así que
`cn("text-money-in", "text-amount")` tira el color sin avisar. Los importes salían
sin su verde o su rojo y las etiquetas, con el tamaño del texto de alrededor.
**`cn` se importa de `@/lib/utils`, que conoce los nombres del design system**; eslint
rechaza el paquete `cn` a secas, que es como lo trae shadcn al añadir un componente.
Un nombre nuevo en `@theme` (styles.css) se añade también allí.

### La caché guardada vuelve vacía al abrir la app
TanStack Query tira las consultas sin uso al cumplirse su `gcTime`, y al arrancar la
caché aparece vacía **sin un solo aviso**: lo guardado está bien, pero se descarta
nada más recuperarlo. Pasa con un `gcTime` menor que el `maxAge` de lo guardado, y
también con uno de más de 24,8 días (2³¹ ms): el `setTimeout` que lo programa se
desborda y salta al instante (con 30 días, en M2). Se ve como «la app no guarda
nada» y se busca el fallo en el almacén.
**`gcTime` y `maxAge` comparten constante, de menos de 24 días**
(`apps/web/src/lib/query-client.ts`).

### Una prueba en el navegador que escribe deprisa dispara el freno de consultas
Cada escritura vuelve a pedir todo lo que hay en pantalla, y el freno (ADR 0007) corta
**todas** las consultas al pasar de 60 en un minuto, hasta recargar. Una prueba con
Puppeteer que guarda, deshace y corrige seguido lo pasa: la siguiente escritura falla
con «Inténtalo de nuevo» y se busca el fallo en la función de la base. Peor: si falla
un «Deshacer», la base local queda a medias.
**Recargar la página entre bloques de escrituras, comparar la base antes y después, y
si algo quedó a medias, `npm run import:load`.**

### Una prueba que recarga la página justo después de guardar ve datos de antes
La caché se guarda en el teléfono con hasta un segundo de retraso, y lo traído hace
menos de un minuto no se vuelve a pedir. Si una prueba guarda y enseguida hace
`page.goto`, la página nueva arranca con la caché de antes de guardar y no la refresca:
parece que la pantalla no se entera del cambio. En la app no pasa, porque guardar
invalida la caché sin recargar.
**En las pruebas, navegar por la app (la barra, los botones), no con `page.goto`, entre
una escritura y lo que la comprueba.**

### Sin red y con la sesión caducada, la app se queda en blanco o va al login
La sesión de Supabase caduca cada hora. Sin red, `getSession` intenta renovarla, se
queda segundos reintentando y acaba diciendo que no hay sesión. Y TanStack Query
arranca creyendo que hay red, así que reintenta cada consulta antes de enseñar nada.
**Sin red, la ruta protegida usa la sesión guardada (`readStoredSession`) y la caché
arranca sabiendo que no hay red.** Se prueba con la app construida (`npm run preview`)
y Chrome sin red: con `npm run dev` no hay service worker.
