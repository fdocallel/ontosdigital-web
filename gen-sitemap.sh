#!/bin/sh
# Regenera sitemap.xml con el lastmod real de cada página (fecha del último commit que la tocó).
# Uso: ./gen-sitemap.sh   ·   se llama solo desde el pre-commit.
set -e
cd "$(dirname "$0")"
PAGINAS="index.html bim.html escrito-plan-bim-ingenieria.html caso-sistema.html caso-finanzas.html caso-organizacion.html caso-salud.html"
{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  for f in $PAGINAS; do
    [ -f "$f" ] || continue
    grep -q '<meta name="robots" content="noindex"' "$f" && continue
    fecha=$(git log -1 --format=%cs -- "$f" 2>/dev/null)
    [ -n "$fecha" ] || fecha=$(date +%F)
    if [ "$f" = "index.html" ]; then loc="https://ontosdigital.es/"; else loc="https://ontosdigital.es/$f"; fi
    printf '  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n  </url>\n' "$loc" "$fecha"
  done
  echo '</urlset>'
} > sitemap.xml
echo "sitemap.xml regenerado ($(grep -c '<loc>' sitemap.xml) URLs)"
