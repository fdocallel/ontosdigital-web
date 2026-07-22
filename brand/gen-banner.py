#!/usr/bin/env python3
"""Banner LinkedIn 1584x396 con la marca ONTOS (logo V4 + arco de fondo).
Spec: Avenir Next en 3 pesos · alineacion optica por bbox · ritmo constante ·
logo V4 (7 dovelas, anillo 0.70, clave exenta) · arco de medio punto como
motivo de fondo. Render a 4x, downscale LANCZOS. Paleta: brand/colores.md."""
import math
from PIL import Image, ImageDraw, ImageFont

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

# ---- logo V4: 7 dovelas, anillo 0.70, clave exenta 19% ----
def logo(cx, cy, R):
    N, gap = 7, 4.0
    r = R * 0.70
    seg = 360 / N
    for k in range(N):
        c = -90 + k * seg
        a1, a2 = c - seg / 2 + gap / 2, c + seg / 2 - gap / 2
        if k == 0:
            d.polygon(sector(cx, cy, R, r, a1, a2, dy=-R * 8 / 42), fill=TEJA)
        else:
            d.polygon(sector(cx, cy, R, r, a1, a2), fill=PIEDRA)

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

X0 = 756
draw_optical((X0, 112), "ONTOS", font(DEMI, 88), TEXTO, tracking=17.6)
draw_optical((X0, 250), "Raíces sólidas. Futuro inteligente.", font(MEDIUM, 30), GRANITO_CLARO)
draw_optical((X0, 316), "ontosdigital.es", font(DEMI, 21), TEJA, tracking=0.6)

img.resize((W, H), Image.LANCZOS).save("/Users/fdocallel/Dev/ontosdigital-web/brand/banner-linkedin.png")
print("ok banner-linkedin.png")
