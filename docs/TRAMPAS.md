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

## Supabase

### `[auth.email] enable_signup = false` apaga el login por correo
Con eso en `supabase/config.toml`, iniciar sesión responde *"Email logins are
disabled"* (`email_provider_disabled`), aunque el usuario exista y la contraseña
sea correcta. Esa clave no cierra el registro: desactiva el proveedor de correo
entero. **El registro se cierra con `enable_signup = false` en `[auth]`**, y la de
`[auth.email]` se queda en `true`.

## La app

### Lo que una ruta declara fuera de su componente va al bundle principal
Con `autoCodeSplitting`, TanStack Router separa el **componente** de cada ruta, pero
`validateSearch`, `beforeLoad` y compañía viajan en el bundle que se descarga al
arrancar. Un `validateSearch: z.object(...)` en el login metió zod entero ahí
(+23 KB comprimidos). **En esas opciones, funciones simples; zod, dentro del
componente o de los formularios.**

### `gcTime` por debajo de `maxAge` rehidrata la caché vacía
TanStack Query descarta la consulta en memoria antes de que caduque lo guardado en
disco, y al arrancar la caché aparece vacía **sin un solo aviso**. Se ve como «la
app no guarda nada» y se busca el fallo en el almacén, que está bien.
**Los dos valen lo mismo y comparten constante.**
