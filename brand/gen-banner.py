#!/usr/bin/env python3
"""Banner LinkedIn 1584x396 con la marca ONTOS.
Spec: una familia (Avenir Next) en 3 pesos · alineacion optica por bbox ·
ritmo vertical constante · logo con geometria exacta de gen-logo.py.
Render a 4x, downscale LANCZOS. Paleta: brand/colores.md."""
import math
from PIL import Image, ImageDraw, ImageFont

W, H, S = 1584, 396, 4
NOCHE = (15, 14, 12)
TEJA = (212, 113, 59)
GRANITO_CLARO = (163, 154, 140)
TEXTO = (236, 231, 222)
PIEDRA = (69, 63, 53)  # un punto sobre la piedra web para no hundirse en noche a este tamano

AVENIR = "/System/Library/Fonts/Avenir Next.ttc"
DEMI, MEDIUM, REGULAR = 2, 5, 7

img = Image.new("RGB", (W * S, H * S), NOCHE)

# ---- glow: halo calido muy sutil tras el lockup ----
glow = Image.radial_gradient("L").resize((1600 * S, 1600 * S))
glow = glow.point(lambda v: int((255 - v) * 0.07))
img.paste(Image.new("RGB", glow.size, TEJA), (int(820 * S - glow.size[0] / 2), int(198 * S - glow.size[1] / 2)), glow)
d = ImageDraw.Draw(img)

# ---- logo: anillo de 11 dovelas, clave teja levantada (geometria gen-logo.py) ----
def sector(cx, cy, R, r, a1, a2, dy=0.0, steps=32):
    pts = []
    for i in range(steps + 1):
        a = math.radians(a1 + (a2 - a1) * i / steps)
        pts.append((cx + R * math.cos(a), cy + dy + R * math.sin(a)))
    for i in range(steps + 1):
        a = math.radians(a2 + (a1 - a2) * i / steps)
        pts.append((cx + r * math.cos(a), cy + dy + r * math.sin(a)))
    return pts

def logo(cx, cy, radius):
    N, gap = 11, 3.0
    R, r, dy_clave = radius, radius * 26 / 42, -radius * 5 / 42
    seg = 360 / N
    for k in range(N):
        c = -90 + k * seg
        a1, a2 = c - seg / 2 + gap / 2, c + seg / 2 - gap / 2
        if k == 0:
            d.polygon(sector(cx, cy, R, r, a1, a2, dy=dy_clave), fill=TEJA)
        else:
            d.polygon(sector(cx, cy, R, r, a1, a2), fill=PIEDRA)

logo(590 * S, 202 * S, 96 * S)

# ---- tipografia: Avenir Next, alineacion optica ----
def font(idx, size):
    return ImageFont.truetype(AVENIR, size * S, index=idx)

def draw_optical(xy, text, f, fill, tracking=0.0):
    """dibuja alineando el borde optico izquierdo en x (descuenta side bearing)"""
    x, y = xy[0] * S, xy[1] * S
    off = d.textbbox((0, 0), text[0], font=f)[0]
    x -= off
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + tracking * S
    return (x - tracking * S) / S  # borde derecho final en coords 1x

X0 = 756  # borde optico izquierdo del bloque de texto

# wordmark: Demi Bold, tracking 0.2em
f_word = font(DEMI, 88)
draw_optical((X0, 112), "ONTOS", f_word, TEXTO, tracking=17.6)

# tagline: Medium, granito claro
f_tag = font(MEDIUM, 30)
draw_optical((X0, 250), "Raíces sólidas. Futuro inteligente.", f_tag, GRANITO_CLARO)

# dominio: Demi pequeno en teja, mismo borde optico
f_dom = font(DEMI, 21)
draw_optical((X0, 316), "ontosdigital.es", f_dom, TEJA, tracking=0.6)

img.resize((W, H), Image.LANCZOS).save("/Users/fdocallel/Dev/ontosdigital-web/brand/banner-linkedin.png")
print("ok banner-linkedin.png")
