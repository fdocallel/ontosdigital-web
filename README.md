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

`juego-2d.html`, `animacion-3d.html` y `visita-3d.html` son páginas públicas independientes, con teclado, controles táctiles y regreso a Servicios. La visita abre el mundo normal por defecto; `?mundo=segovia` muestra Segovia. Sus espejos ingleses se generan con el flujo anterior.

Los motores y la malla de `experiencias/` son **copias de entrega generadas**, no fuentes para editar. `experiencias/provenance.json` registra la procedencia y las huellas SHA256 de entrada y salida. La actualización es explícita:

```sh
python3 scripts/import-experiencias.py /ruta/al/repositorio/ONTOS
./i18n/gen-en.py
```

El importador admite solo los dos motores procedurales y la malla del Alcázar con campos y licencia validados antes de escribir. Solo Segovia solicita esa malla; el mundo normal y la figurita no la descargan. No copia la navegación, los datos ni los servicios de la consola privada. Si cambia la estructura de las fuentes, el importador falla para que se revise la transformación.

`i18n/en/experiencias-runtime.json` contiene los mensajes dinámicos traducidos; el generador produce `experiencias/i18n.js`. Al añadir mensajes al motor, actualizar ese diccionario, volver a importar y regenerar. Los HTML españoles y `experiencias/demo.css` definen la presentación pública.

Antes de publicar una actualización de motores, revisar el diff y comprobar las tres demos con teclado y controles táctiles: movimiento, saludo, zoom, pausa/reinicio, errores WebGL, vuelta a Servicios y versión inglesa. La importación nunca se ejecuta automáticamente desde el despliegue público.

## Medición de Servicios · 11-sep-2026

Servicios y las demos usan la cuenta GoatCounter existente. Las visitas mantienen sus rutas ES/EN; la visita 3D distingue `?mundo=normal` y `?mundo=segovia` aunque ambas compartan canonical de SEO.

Los cinco enlaces «Probar» de Servicios emiten `servicio-probar-editor-pdf`, `servicio-probar-juego-2d`, `servicio-probar-animacion-3d`, `servicio-probar-mundo-normal` y `servicio-probar-segovia`. Los ids son estables entre idiomas. Son **clics de intención**, no usuarios únicos ni prueba de que se haya usado una función. `data-goatcounter-no-session="1"` conserva clics repetidos; no calcular una conversión de personas dividiendo estos clics por visitas. No hay tracking retrospectivo anterior al despliegue. Los referidos ayudan a relacionar tráfico con LinkedIn, pero no identifican por sí solos un post concreto ni demuestran causalidad.

Para excluir las visitas propias en cada navegador/perfil, abrir una vez [Servicios sin estadísticas](https://ontosdigital.es/servicios.html?sinestadisticas=1). Es idempotente y muestra confirmación. La preferencia nativa `skipgc=t` se conserva en ese navegador y afecta también al Editor PDF y al resto del sitio, cuyos contadores existentes la respetan. No depende de una IP fija. [Reactivar explícitamente](https://ontosdigital.es/servicios.html?sinestadisticas=0) elimina la preferencia; la siguiente página vuelve a contar. Las visitas de configuración no cuentan. Borrar almacenamiento, usar incógnito o cambiar navegador/perfil requiere excluir de nuevo.

La integración sigue la documentación oficial de [eventos](https://www.goatcounter.com/help/events), [API JavaScript](https://www.goatcounter.com/help/js) y [exclusión de visitas propias](https://www.goatcounter.com/help/skip-dev), comprobada el 11-sep-2026. No añade proveedores ni identificadores propios de visitantes.

Prueba sin contaminar analítica: descargar `https://gc.zgo.at/count.js` a un fichero temporal y ejecutar `node scripts/test-servicios-analytics.cjs /tmp/count.js` desde este repo. Utiliza Chrome headless y Playwright de ONTOS (o `PLAYWRIGHT_MODULE`); intercepta **todas** las peticiones y simula el host público localmente. Comprueba ES/EN, rutas y cinco eventos, exclusión persistente/idempotente, páginas anteriores y reactivación.

Control Web puede confirmar la exclusión **en el navegador que pulsa el botón**, sin guardar una confirmación ficticia en el origen local. Abre una ventana por gesto del usuario con `servicios.html?sinestadisticas=1&ontos_request=<nonce>` (nonce aleatorio de 16–128 caracteres alfanuméricos, `_` o `-`). Conserva la referencia a esa ventana y envía `{type:'ontos-analytics-status-request', nonce}` a `https://ontosdigital.es`. La página pública responde únicamente a su `opener`, con `{type:'ontos-analytics-status', nonce, disabled}`; lee `skipgc` en ese momento (`null` si no puede acceder al almacenamiento) y usa como `targetOrigin` el origen HTTP(S) exacto del mensaje recibido. No acepta navegación ni comandos desde mensajes.

La consola debe validar **origin, source y nonce**, mostrar estado desconocido hasta la respuesta y aplicar timeout si el navegador bloquea la ventana o separa el opener. La confirmación vive solo en memoria: no certifica otros dispositivos/perfiles ni sustituye la lectura real. `node scripts/test-analytics-popup.cjs` comprueba origen cruzado, mensajes falsificados, lectura actualizada y almacenamiento inaccesible con red interceptada. Cabeceras públicas comprobadas el 11-sep: sin `Cross-Origin-Opener-Policy` que corte el opener; si eso cambia, el timeout debe conservar «no confirmado».
