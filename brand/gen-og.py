#!/usr/bin/env python3
"""og:image 1200x630 con la marca ONTOS (marca N5 centrada + wordmark + tagline).
Mismo sistema que gen-banner.py: Avenir Next, alineacion optica por bbox,
render a 4x con downscale LANCZOS. Paleta: brand/colores.md."""
import math, runpy
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# geometria canonica de la marca: se LEE de gen-logo.py, nunca se copia a mano
# (el 24-ago las copias se desincronizaron; DATO UNICO tambien aqui)
_g = runpy.run_path(str(Path(__file__).resolve().parent / 'gen-logo.py'))
N_DOV, GAP_DOV = _g['N'], _g['GAP']
R_EXT, R_INT = float(_g['R_EXT']), float(_g['R_INT'])
RADIO_1, RADIO_2, RADIO_W = _g['RADIO_1'], _g['RADIO_2'], _g['RADIO_W']
NUCLEO_R = float(_g['NUCLEO_R'])

W, H, S = 1200, 630, 4
NOCHE = (15, 14, 12)
TEJA = (212, 113, 59)
GRANITO_CLARO = (163, 154, 140)
TEXTO = (236, 231, 222)
PIEDRA = (69, 63, 53)

AVENIR = "/System/Library/Fonts/Avenir Next.ttc"
FRAUNCES = __file__.rsplit("/", 1)[0] + "/fraunces-600.ttf"  # wordmark (decision 1-sep-2026, colores.md)
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

# marca N5 'conectado' (23-ago-2026): 8 dovelas + radios + nucleo teja
def logo(cx, cy, R):
    e = R / R_EXT  # unidades del viewBox 100 -> px
    seg = 360 / N_DOV
    for k in range(N_DOV):
        c = -90 + k * seg
        a1, a2 = c - seg / 2 + GAP_DOV / 2, c + seg / 2 - GAP_DOV / 2
        d.polygon(sector(cx, cy, R, R_INT * e, a1, a2), fill=PIEDRA)
    for k in range(N_DOV):
        a = math.radians(-90 + k * seg)
        d.line([(cx + RADIO_1 * e * math.cos(a), cy + RADIO_1 * e * math.sin(a)),
                (cx + RADIO_2 * e * math.cos(a), cy + RADIO_2 * e * math.sin(a))],
               fill=PIEDRA, width=round(RADIO_W * e))
    nr = NUCLEO_R * e
    d.ellipse([cx - nr, cy - nr, cx + nr, cy + nr], fill=TEJA)

logo(W * S / 2, 180 * S, 92 * S)

def font(idx, size):
    return ImageFont.truetype(AVENIR, size * S, index=idx)

def draw_centered(y, text, f, fill, tracking=0.0):
    total = sum(d.textlength(ch, font=f) for ch in text) + tracking * S * (len(text) - 1)
    x = (W * S - total) / 2 - d.textbbox((0, 0), text[0], font=f)[0]
    for ch in text:
        d.text((x, y * S), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + tracking * S

draw_centered(322, "ONTOS", ImageFont.truetype(FRAUNCES, 92 * S), TEXTO, tracking=1.8)
draw_centered(468, "El modelo digital de tu negocio, operado con IA", font(MEDIUM, 31), GRANITO_CLARO)
draw_centered(541, "ontosdigital.es", font(DEMI, 22), TEJA, tracking=0.6)

img.resize((W, H), Image.LANCZOS).save("/Users/fdocallel/Dev/ontosdigital-web/brand/og.png")
print("ok og.png")
