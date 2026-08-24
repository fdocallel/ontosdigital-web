#!/usr/bin/env python3
"""Banner LinkedIn 1584x396 con la marca ONTOS (marca N5 + arco de fondo).
Lema = mensaje de PRODUCTO (24-ago-2026, #317): el de consultoria («Raices solidas»)
quedo revocado el 19-ago. Lema y salida se pueden pasar por argv para probar variantes.
Spec: Avenir Next en 3 pesos · alineacion optica por bbox · ritmo constante ·
marca N5 (8 dovelas + radios + nucleo) · arco de medio punto como
motivo de fondo. Render a 4x, downscale LANCZOS. Paleta: brand/colores.md."""
import math
from PIL import Image, ImageDraw, ImageFont

import sys
W, H, S = 1584, 396, 4
NOCHE = (15, 14, 12)
TEJA = (212, 113, 59)
GRANITO_CLARO = (163, 154, 140)
TEXTO = (236, 231, 222)
PIEDRA = (69, 63, 53)  # un punto sobre la piedra web para no hundirse en noche

AVENIR = "/System/Library/Fonts/Avenir Next.ttc"
DEMI, MEDIUM = 2, 5

img = Image.new("RGB", (W * S, H * S), NOCHE)

def sector(cx, cy, R, r, a1, a2, dy=0.0, steps=40):
    pts = []
    for i in range(steps + 1):
        a = math.radians(a1 + (a2 - a1) * i / steps)
        pts.append((cx + R * math.cos(a), cy + dy + R * math.sin(a)))
    for i in range(steps + 1):
        a = math.radians(a2 + (a1 - a2) * i / steps)
        pts.append((cx + r * math.cos(a), cy + dy + r * math.sin(a)))
    return pts

# ---- fondo: arco de medio punto (variante B) en marca de agua, lado izquierdo ----
def arco_fondo(cx, cy, R, alpha):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    dl = ImageDraw.Draw(layer)
    N, gap = 7, 2.6
    r = R * 27 / 46
    seg = 180 / N
    for k in range(N):
        a1 = 180 + k * seg + gap / 2
        a2 = 180 + (k + 1) * seg - gap / 2
        dy = -R * 5 / 46 if abs((a1 + a2) / 2 - 270) < seg / 2 else 0
        dl.polygon(sector(cx, cy, R, r, a1, a2, dy=dy), fill=PIEDRA + (alpha,))
    img.paste(layer, (0, 0), layer)

arco_fondo(150 * S, 560 * S, 510 * S, 26)

# ---- glow calido muy sutil tras el lockup ----
glow = Image.radial_gradient("L").resize((1600 * S, 1600 * S))
glow = glow.point(lambda v: int((255 - v) * 0.07))
img.paste(Image.new("RGB", glow.size, TEJA), (int(820 * S - glow.size[0] / 2), int(198 * S - glow.size[1] / 2)), glow)
d = ImageDraw.Draw(img)

# ---- marca N5 'conectado' (23-ago-2026): 8 dovelas + radios + nucleo teja ----
def logo(cx, cy, R):
    N, gap = 8, 4.0
    r = R * 0.70
    seg = 360 / N
    for k in range(N):
        c = -90 + k * seg
        a1, a2 = c - seg / 2 + gap / 2, c + seg / 2 - gap / 2
        d.polygon(sector(cx, cy, R, r, a1, a2), fill=PIEDRA)
    e = R / 42  # unidades del viewBox 100 -> px
    for k in range(N):
        a = math.radians(-90 + k * seg)
        d.line([(cx + 15.5 * e * math.cos(a), cy + 15.5 * e * math.sin(a)),
                (cx + 29.4 * e * math.cos(a), cy + 29.4 * e * math.sin(a))],
               fill=PIEDRA, width=round(2.6 * e))
    nr = 14 * e
    d.ellipse([cx - nr, cy - nr, cx + nr, cy + nr], fill=TEJA)

logo(590 * S, 206 * S, 96 * S)

# ---- tipografia: Avenir Next, alineacion optica ----
def font(idx, size):
    return ImageFont.truetype(AVENIR, size * S, index=idx)

def draw_optical(xy, text, f, fill, tracking=0.0):
    x, y = xy[0] * S, xy[1] * S
    x -= d.textbbox((0, 0), text[0], font=f)[0]
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + tracking * S

# lema: el de producto (19-ago, #317) — mismo mensaje que og.png y la web
LEMA = "El gemelo digital de tu vida y de tu negocio."
SALIDA = "/Users/fdocallel/Dev/ontosdigital-web/brand/banner-linkedin.png"
if len(sys.argv) > 2:
    LEMA, SALIDA = sys.argv[1], sys.argv[2]

X0, XMAX = 756, 1520          # zona util: nunca tocar el borde derecho
draw_optical((X0, 112), "ONTOS", font(DEMI, 88), TEXTO, tracking=17.6)

def ajusta(texto, tam_max=30, tam_min=22):
    """Baja el cuerpo y, si hace falta, parte en 2 lineas hasta caber en XMAX-X0."""
    ancho = (XMAX - X0) * S
    for tam in range(tam_max, tam_min - 1, -1):
        f = font(MEDIUM, tam)
        if d.textlength(texto, font=f) <= ancho:
            return f, [texto]
        pal = texto.split()
        for corte in range(len(pal) - 1, 0, -1):
            l1, l2 = ' '.join(pal[:corte]), ' '.join(pal[corte:])
            if max(d.textlength(l1, font=f), d.textlength(l2, font=f)) <= ancho:
                return f, [l1, l2]
    return font(MEDIUM, tam_min), [texto]

f_lema, lineas = ajusta(LEMA)
y = 244 if len(lineas) == 1 else 236
for ln in lineas:
    draw_optical((X0, y), ln, f_lema, GRANITO_CLARO)
    y += 44
draw_optical((X0, 316 if len(lineas) == 1 else 340), "ontosdigital.es", font(DEMI, 21), TEJA, tracking=0.6)

img.resize((W, H), Image.LANCZOS).save(SALIDA)
print("ok", SALIDA, "|", len(lineas), "linea(s)")
