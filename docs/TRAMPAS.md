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
literal de Python de triple comilla una `\` antes del salto de línea se lo come.
**Usar cadenas *raw* (`r'''...'''`), o escribir el archivo con la herramienta de
edición en vez de con un heredoc.**

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

### Un contenedor con otro tema sigue pintando el del teléfono
Con los colores en `light-dark()` declarados solo en `:root`, poner `color-scheme: dark`
en un contenedor no cambia nada, aunque en `npm run dev` pueda parecer que sí. El build
(Lightning CSS, dentro de Tailwind) traduce `light-dark()` a variables auxiliares
(`--lightningcss-light` y `-dark`) para navegadores viejos, y una variable se resuelve
donde se declara: los hijos heredan el color de `:root` ya resuelto. Un `color-scheme`
puesto en `style` ni siquiera se traduce.
**Los tokens se declaran en `:root, [data-theme]`, y el tema se fija con `data-theme`.**
Lo que sale de verdad se ve en `apps/web/dist/assets/*.css`.

### `gcTime` por debajo de `maxAge` rehidrata la caché vacía
TanStack Query descarta la consulta en memoria antes de que caduque lo guardado en
disco, y al arrancar la caché aparece vacía **sin un solo aviso**. Se ve como «la
app no guarda nada» y se busca el fallo en el almacén, que está bien.
**Los dos valen lo mismo y comparten constante.**
