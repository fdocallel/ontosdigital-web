# ontosdigital.es

Landing pública de ONTOS. HTML vanilla, sin build. Deploy: GitHub Pages (push a main).

## Español e inglés

El sitio está en dos idiomas y cumple DATO ÚNICO: **la estructura vive una sola vez**.
La página española es la fuente (HTML, CSS, animaciones); lo único duplicado es el texto,
y su versión inglesa vive en `i18n/en/<pagina>.json`.

- `/*.html` — **fuente**. Se edita a mano.
- `/en/*.html` — **GENERADO**. No se edita nunca: se borra y se vuelve a generar.
- `i18n/en/*.json` — las traducciones, una clave por frase (la frase española normalizada).
- `i18n/gen-en.py` — el generador. Traduce el texto, reescribe rutas a `/en/`, pone
  `lang="en"`, canonical propio, `hreflang` en las dos versiones y localiza el JSON-LD.
- `i18n/pon.py` — utilidad: rellena un JSON con las traducciones leídas de stdin, en orden.

### Flujo

```sh
./i18n/gen-en.py --extraer   # vuelca a i18n/en/*.json las frases nuevas (vacías)
#                              … se traducen a mano …
./i18n/gen-en.py             # genera /en/ · FALLA si queda algo sin traducir
```

El hook de pre-commit (`hooks/pre-commit`, instalar con
`ln -sf ../../hooks/pre-commit .git/hooks/pre-commit`) hace las dos cosas y el sitemap
en cada commit, así que en la práctica basta con editar la página española y su JSON.

### Reglas

- Si tocas texto español, la clave cambia: `--extraer` la saca vacía y `gen-en.py` no
  deja generar hasta traducirla. Esa es la red de seguridad contra un espejo a medias.
- Página nueva → añadirla a `PAGINAS` en `gen-en.py` (con si es indexable o no) y meterle
  el conmutador de idioma en la barra: `<a class="item idioma" data-i18n-alt href="/en/…">EN</a>`.
- Los legales llevan nota de traducción de cortesía: **prevalece el texto español**.


## Demos interactivas de Servicios

`juego-2d.html`, `animacion-3d.html` y `visita-3d.html` son páginas públicas independientes, con teclado, controles táctiles y regreso a Servicios. La visita contiene únicamente el mundo normal. Sus espejos ingleses se generan con el flujo anterior.

Los motores de `experiencias/` son **copias de entrega generadas**, no fuentes para editar. `experiencias/provenance.json` registra la procedencia y las huellas SHA256 de entrada y salida. La actualización es explícita:

```sh
python3 scripts/import-experiencias.py /ruta/al/repositorio/ONTOS
./i18n/gen-en.py
```

El importador admite solo los dos motores procedurales, elimina la geometría y carga de assets de Segovia y valida ambos antes de escribir. No copia la navegación, los datos ni los servicios de la consola privada. Si cambia la estructura de las fuentes, el importador falla para que se revise la transformación.

`i18n/en/experiencias-runtime.json` contiene los mensajes dinámicos traducidos; el generador produce `experiencias/i18n.js`. Al añadir mensajes al motor, actualizar ese diccionario, volver a importar y regenerar. Los HTML españoles y `experiencias/demo.css` definen la presentación pública.

Antes de publicar una actualización de motores, revisar el diff y comprobar las tres demos con teclado y controles táctiles: movimiento, saludo, zoom, pausa/reinicio, errores WebGL, vuelta a Servicios y versión inglesa. La importación nunca se ejecuta automáticamente desde el despliegue público.
