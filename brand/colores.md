# ONTOS — color de marca

Definido 21-jul-2026 (análisis en sesión; contrastes WCAG medidos, no estimados).

## El color: TEJA `#d4713b`

**Por qué este y no azul.** El sector AEC en España viste de azul corporativo (ingenierías clásicas)
y el mundo IA de morados/degradados; ambos son ruido. El terracota viene del relato de la marca:
la **clave del arco** — arcilla y teja castellana, el atardecer sobre el granito del Acueducto.
Cálido (humano, artesanal) sobre neutros minerales (riguroso, estructural): exactamente lo que vende
ONTOS — tecnología dirigida por una persona. Riesgo asumido: vecindad con el clay de Anthropic
(#CC785C), más rosado y desaturado que el nuestro; en nuestro mercado (consultoría AEC ES) no compite
y la asociación no perjudica.

## Paleta

| Token | Hex | Rol |
|---|---|---|
| **teja** | `#d4713b` | EL color de marca: la clave del logo, CTAs y acentos **sobre fondo oscuro** (5,7:1 ✓ texto) |
| **teja-quemada** | `#b0532a` | la teja para **texto/enlaces sobre fondo claro** (4,8-5,1:1 ✓ AA; la teja base ahí solo como gráfico ≥3:1) |
| **teja-clara** | `#e8956a` | realces finos sobre oscuro (8,2:1, AAA) |
| **tinta** | `#1c1a17` | texto sobre claro; negro cálido, nunca #000 |
| **granito** | `#6b6257` | secundario sobre claro (5,6-6,0:1 ✓) — la piedra del arco |
| **granito-claro** | `#a39a8c` | secundario sobre oscuro (6,6-6,9:1 ✓) |
| **hueso** | `#faf8f5` | fondo claro (papel/cal) |
| **noche** | `#0f0e0c` · panel `#171512` | fondo oscuro (el de la web) |

## Reglas de uso

1. **La teja es la clave: una sola pieza del arco.** Proporción ~60/30/10 — neutros dominan
   (noche/hueso + granito), la teja aparece poco y por eso manda. Si un diseño tiene mucha teja,
   está mal.
2. Par accesible obligatorio: teja sobre oscuro · teja-quemada sobre claro. Nunca teja base como
   texto normal sobre claro.
3. El logo no cambia de teja: clave `#d4713b` fija; la piedra hereda (`currentColor` → tinta en
   claro, granito en oscuro).
4. Sin degradados, sin segundos colores de fantasía. Estados (ok/aviso/error) se definirán cuando
   haya producto que los necesite — no antes.

## Verificación

Matriz de contraste (umbral: 3:1 gráfico/texto grande · 4,5:1 texto AA):
`teja` → blanco 3,37 · hueso 3,18 · noche 5,72 · panel 5,40
`teja-quemada` → blanco 5,10 · hueso 4,81 · noche 3,78
`granito` → hueso 5,64 · `granito-claro` → noche 6,94 · `tinta` → hueso 16,4

Tokens listos para CSS en `tokens.css`.
