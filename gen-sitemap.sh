#!/bin/sh
# Regenera sitemap.xml con el lastmod real de cada página (fecha del último commit que la tocó).
# Incluye el espejo inglés de /en/, que se genera con ./i18n/gen-en.py.
# Uso: ./gen-sitemap.sh   ·   se llama solo desde el pre-commit.
set -e
cd "$(dirname "$0")"
PAGINAS="index.html bim.html escrito-plan-bim-ingenieria.html caso-sistema.html caso-finanzas.html caso-organizacion.html caso-salud.html"
fecha_de() {
  f=$(git log -1 --format=%cs -- "$1" 2>/dev/null)
  [ -n "$f" ] || f=$(date +%F)
  echo "$f"
}
{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  for f in $PAGINAS; do
    [ -f "$f" ] || continue
    grep -q '<meta name="robots" content="noindex"' "$f" && continue
    fecha=$(fecha_de "$f")
    if [ "$f" = "index.html" ]; then loc="https://ontosdigital.es/"; else loc="https://ontosdigital.es/$f"; fi
    printf '  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n  </url>\n' "$loc" "$fecha"
    # espejo inglés: cambia cuando cambia la página española o su traducción
    en="en/$f"
    [ -f "$en" ] || continue
    fecha_tr=$(fecha_de "i18n/en/$(echo "$f" | sed 's/\.html$/.json/')")
    [ "$fecha_tr" \> "$fecha" ] && fecha="$fecha_tr"
    if [ "$f" = "index.html" ]; then loc="https://ontosdigital.es/en/"; else loc="https://ontosdigital.es/en/$f"; fi
    printf '  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n  </url>\n' "$loc" "$fecha"
  done
  echo '</urlset>'
} > sitemap.xml
echo "sitemap.xml regenerado ($(grep -c '<loc>' sitemap.xml) URLs)"
