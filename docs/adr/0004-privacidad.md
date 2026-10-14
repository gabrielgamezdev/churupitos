# ADR 0004 — Repositorio público sin un solo dato personal

- **Fecha:** 2026-10-12
- **Estado:** aceptada. Lo de la lista de nombres en la CI lo sustituye el ADR 0006.

## Contexto
El repositorio es público porque forma parte de un portafolio, pero la app gestiona
las finanzas reales de un hogar. Hay dos sitios con reglas distintas:

- **Los datos viven en Supabase**, detrás del login y de RLS: solo los ven los dos
  miembros del hogar. Ahí sí están los nombres, los bancos y los importes reales.
- **El código vive en GitHub**, público y para siempre: lo que entra en un commit se
  puede clonar, indexar y leer años después, aunque luego se borre el archivo.

El riesgo está en el segundo sitio, y casi siempre entra por descuido: un ejemplo
copiado de una fila real, un nombre de banco en el código del importador o una cifra
en un mensaje de commit. Juntos, el nombre del autor (público en su perfil), sus
bancos, sus deudas y su familia dan un mapa de sus finanzas que sirve para estafas
de ingeniería social. Además, los familiares y terceros que salen en los Excels no
eligieron aparecer. En la versión anterior, con esta misma regla, se colaron apodos
en comentarios y cifras en mensajes de commit, porque el barrido solo corría cuando
el asistente commiteaba y no revisaba ni los mensajes ni los apodos.

## Decisión
- **Todo lo real vive en `privado/`**, ignorada entera: Excels, catálogo del
  importador, investigación, copias de seguridad y la lista de nombres del barrido.
  Una sola regla de `.gitignore` en vez de muchas.
- **El barrido corre en tres sitios:** el hook `pre-commit` (lo que entra), el hook
  `commit-msg` (el mensaje) y la CI en cada push (todo el árbol). Los hooks son de
  git, no del asistente, así que también vigilan los commits hechos a mano.
- **La lista de nombres nunca se versiona.** En local está en `privado/`; en CI, en
  el secreto `BARRIDO_NOMBRES`. En CI el barrido dice dónde está un hallazgo pero
  no imprime la línea, porque los registros de un repositorio público son públicos.
- **Ejemplos, pruebas, datos de desarrollo y capturas usan datos inventados.**
- **Autor de los commits: la identidad pública del autor**, el nombre y el correo de
  su cuenta de GitHub, configurados en el repositorio. Ningún otro correo personal.
- **Claves:** la secreta de Supabase y la contraseña de la base solo existen en `.env`
  locales y en los secretos de CI. La clave pública de Supabase sí va en la app: está
  hecha para eso, y quien protege los datos es RLS.

## Consecuencias
- Un hallazgo bloquea el commit. Si es un falso positivo, la línea se marca con
  `barrido:permitido` y se explica en el commit.
- Sin `privado/barrido-nombres.txt`, el barrido local avisa de que no buscó nombres.
  En CI, sin el secreto, falla.
