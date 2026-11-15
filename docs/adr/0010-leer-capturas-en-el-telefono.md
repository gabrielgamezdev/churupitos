# ADR 0010 — Leer las capturas en el propio teléfono

- **Fecha:** 2026-11-15
- **Estado:** aceptada

## Contexto
Registrar un gasto es copiar a mano lo que ya dice la captura del pago: el monto, la
fecha y la cuenta. M15 lo lee de la imagen, y leer texto de una imagen se puede hacer en un
servicio o en el propio dispositivo.

Lo que se descartó:
- **Un servicio de lectura o un modelo de IA en la nube:** las capturas son datos
  bancarios (cuentas, cédulas, teléfonos de otros) y saldrían del teléfono hacia un
  tercero (ADR 0004). Se pagan por uso (regla 7, ADR 0007), y Cloudflare solo sirve
  estáticos: haría falta además un servidor.
- **El lector de texto del navegador (`TextDetector`):** sigue siendo experimental; no se
  puede contar con él en Chrome para Android.
- **Bajar el lector de un CDN:** la app dependería de otro sitio, que además vería cuándo
  se usa.

## Decisión
- **Tesseract.js**, en WebAssembly y en un worker del navegador, con los datos del
  español. La imagen no sale del teléfono ni se guarda: solo existe mientras se registra.
- **Sus archivos los sirve la propia app**, en `/ocr/` con las versiones en la ruta y en
  caché para siempre. No entran en el precache: se bajan la primera vez que se lee una
  captura (unos 5 MB) y los guarda el service worker; los datos del idioma, el propio
  lector, ya descomprimidos. De sus núcleos, el teléfono baja solo el que entiende.
- **La imagen se pasa a grises y se estira su contraste** antes de leerla: fue lo que leyó
  bien todas las capturas de la prueba (2026-11-07); en color, algunas no.
- **Los datos se buscan por sus etiquetas y su forma,** sin reglas de ningún banco en el
  código, que es público. Lo que distingue a una cuenta vive en la base.
- **Rellena Registrar y nunca guarda:** la persona revisa, elige el sobre y guarda.

## Consecuencias
- La primera vez hace falta red y se bajan unos MB. Después lee sin pedir nada, pero
  guardar sigue necesitando red.
- La velocidad depende del teléfono: en una computadora tarda menos de un segundo.
- Puede leer mal: por eso rellena sin guardar, y lo que no encuentra no lo inventa.
- Al actualizar Tesseract.js cambia la ruta de sus archivos, y cada teléfono baja los
  nuevos una vez.
- Una foto de una factura en papel es más difícil que una captura: no está probada.
