# ADR 0006 — La CI no conoce los nombres reales

- **Fecha:** 2026-10-14
- **Estado:** aceptada. Sustituye la parte del ADR 0004 que ponía la lista de nombres
  en un secreto de la CI.

## Contexto
El ADR 0004 preveía copiar la lista de nombres del barrido en el secreto
`BARRIDO_NOMBRES` de GitHub, para que la CI también los buscara en cada push. Esa
lista contiene justo lo que se quiere proteger, incluidos nombres completos de
familiares que no aparecen en ningún Excel, y el autor no quiere que salga de su
máquina en ninguna forma.

## Decisión
- **La lista de nombres existe solo en `privado/barrido-nombres.txt`.** No se sube a
  GitHub, ni como secreto, ni a ningún otro servicio.
- **La CI corre el barrido sin nombres**: importes, referencias a celdas, correos,
  IPs y rastro de la herramienta. Lo dice en su salida, para que no parezca un olvido.
- **Los nombres los vigilan los hooks locales** (`pre-commit` y `commit-msg`), que
  corren en cada commit hecho desde la máquina del autor.

## Consecuencias
- Un commit hecho en otra máquina sin la lista solo pasaría el barrido estructural.
  Es aceptable: el proyecto lo mantiene una persona, desde una máquina.
- Si algún día hay más colaboradores, habrá que revisar esta decisión.
