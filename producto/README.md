# producto/ — capturas reales del sistema

Las seis imágenes que la landing no tenía (#335). Son **el producto de verdad corriendo**, no
maquetas: WebKit sobre `http://localhost:8777`, la app tal cual la ve un usuario.

## Por qué se pueden publicar

Están tomadas **con el modo demo puesto**. Con la cookie `ontos-demo=1`, `serve.py` no sirve el
repo de Fernando: responde con la lista blanca (#342) y sustituye cada `.json` por el del juego
sintético de `data/demo/` (#348) — un titular inventado de arriba abajo. Lo que se ve en estas
capturas —Nayara Quilis, Berta Olmedilla, Monteclaro, Ribera de Alcor, Ribalta, Cordal, los
78.421 €— **no existe**. La garantía es de servidor, no de pantalla: al navegador que hizo estas
capturas el dato real nunca le llegó.

Además, cada página pasó por una sonda automática antes de exportarse: un diccionario de nombres
propios reales construido en caliente desde `data/` (perfil e identificadores del titular, la RED
entera con sus lugares, las posiciones de patrimonio, emisor y clientes de facturación) más los
patrones duros (DNI, IBAN, correo, teléfono). Las seis salieron limpias, y las seis se revisaron
después a ojo, una por una.

## El set — seis planos, una historia

No es un muestrario de pantallas: **qué es → el día → el trabajo → el dinero → la gente → y va en
el bolsillo**. Si #336 solo puede montar tres, el orden de fuerza es 02 · 01 · 04.

| # | Fichero | De qué pantalla sale | Qué cuenta | px |
|---|---|---|---|---|
| 01 | `01-portada-sistema` | `app/portada.html` | La portada: las ocho áreas del sistema en una rueda, con el menú real al lado. Cero datos — es el plano de identidad. | 1400×984 |
| 02 | `02-hoy-cockpit` | `app/hoy.html` | **La imagen fuerte.** El día entero en una pantalla: el brief redactado por el agente, el foco con las tareas y su siguiente paso, los próximos días, el dinero y el cuerpo. Es la que demuestra que esto no es un cuaderno. | 1185×1499 |
| 03 | `03-agenda-backlog` | `app/agenda.html` | El trabajo: el backlog vivo repartido por estatus (esta semana / disponibles / más adelante) con el recuento arriba. | 1400×908 |
| 04 | `04-patrimonio` | `app/patrimonio.html` | El dinero: evolución semanal, asignación por categoría y las posiciones una a una. | 1400×1422 |
| 05 | `05-red-crm` | `app/red.html` | La gente: CRM personal con círculos, cadencia vencida y el siguiente paso de cada persona. | 1200×1500 |
| 06 | `06-hoy-movil` | `app/hoy.html` (iPhone 14) | El mismo `hoy` en el móvil: el brief de la mañana en la mano. Va sin marco — el teléfono se pinta en CSS si se quiere. | 600×1169 |

Se descartaron a propósito: `tree.html` y `buscar.html` (en demo salen vacías por diseño: el
índice de la wiki no sale de la máquina), `chat.html` (la consola del titular es 404 en demo),
`apis.html` (los 24 conectores salen todos «sin vigilar», que se lee como un panel roto) y
`calendario.html` (repite lo que ya cuenta 02 en «Próximos días»).

## Formato

WebP como formato de servicio + JPEG de respaldo, **las doce por debajo de 150 KB**. Ancho de
servicio 1.400 px, bajado en las pantallas largas para que ninguna pase de 1.500 px de alto: antes
menos píxeles que peor compresión, que una captura emborronada no vende.

```html
<picture>
  <source srcset="producto/02-hoy-cockpit.webp" type="image/webp">
  <img src="producto/02-hoy-cockpit.jpg" width="1185" height="1499" loading="lazy"
       alt="La pantalla Hoy de ONTOS: el brief del día escrito por el agente, las tareas en foco
            con su siguiente paso, la agenda de la semana, el patrimonio y la recuperación del día.">
</picture>
```

- Desde `/en/` la ruta la reescribe `gen-en.py` sola (`producto/x.webp` → `/producto/x.webp`).
- El `alt` **es texto traducible**: al añadirlo hay que correr `./i18n/gen-en.py --extraer` y
  traducirlo, o `gen-en.py` no deja generar.
- El pie que acompañe a cada imagen debe decir que **los datos son de demostración**. No es solo
  honestidad: es el argumento de venta (el sistema enseña sin enseñar el dato).

## Rehacerlas

```sh
node ~/Dev/ONTOS/scripts/capturas-web.js          # captura, verifica fugas y exporta aquí
node ~/Dev/ONTOS/scripts/capturas-web.js --solo-sonda
```

El script falla (exit 1) si una pantalla sale vacía o si la sonda ve un nombre real: una captura
vacía es peor que ninguna, y una con dato real no se publica. El set, los recortes y el destino
viven en su cabecera.
