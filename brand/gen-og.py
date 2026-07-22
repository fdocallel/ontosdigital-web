#!/usr/bin/env python3
"""og:image 1200x630 con la marca ONTOS (logo V4 centrado + wordmark + tagline).
Mismo sistema que gen-banner.py: Avenir Next, alineacion optica por bbox,
render a 4x con downscale LANCZOS. Paleta: brand/colores.md."""
import math
from PIL import Image, ImageDraw, ImageFont

W, H, S = 1200, 630, 4
NOCHE = (15, 14, 12)
TEJA = (212, 113, 59)
GRANITO_CLARO = (163, 154, 140)
TEXTO = (236, 231, 222)
PIEDRA = (69, 63, 53)

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

# glow calido muy sutil tras el lockup, centrado
glow = Image.radial_gradient("L").resize((1700 * S, 1700 * S))
glow = glow.point(lambda v: int((255 - v) * 0.07))
img.paste(Image.new("RGB", glow.size, TEJA), (int(W * S / 2 - glow.size[0] / 2), int(215 * S - glow.size[1] / 2)), glow)
d = ImageDraw.Draw(img)

# logo V4: 7 dovelas, anillo 0.70, clave teja exenta
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

logo(W * S / 2, 180 * S, 92 * S)

def font(idx, size):
    return ImageFont.truetype(AVENIR, size * S, index=idx)

def draw_centered(y, text, f, fill, tracking=0.0):
    total = sum(d.textlength(ch, font=f) for ch in text) + tracking * S * (len(text) - 1)
    x = (W * S - total) / 2 - d.textbbox((0, 0), text[0], font=f)[0]
    for ch in text:
        d.text((x, y * S), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + tracking * S

draw_centered(322, "ONTOS", font(DEMI, 92), TEXTO, tracking=18.4)
draw_centered(468, "El modelo digital de tu negocio, operado con IA", font(MEDIUM, 31), GRANITO_CLARO)
draw_centered(541, "ontosdigital.es", font(DEMI, 22), TEJA, tracking=0.6)

img.resize((W, H), Image.LANCZOS).save("/Users/fdocallel/Dev/ontosdigital-web/brand/og.png")
print("ok og.png")
