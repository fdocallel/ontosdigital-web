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
