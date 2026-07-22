#!/usr/bin/env python3
"""Banner LinkedIn 1584x396 con la marca ONTOS (noche + O de dovelas + lema).
Render a 4x y downscale LANCZOS. Paleta: brand/colores.md."""
import math
from PIL import Image, ImageDraw, ImageFont

W, H, S = 1584, 396, 4  # tamano final y supersampling
NOCHE = (15, 14, 12)
TEJA = (212, 113, 59)
GRANITO_CLARO = (163, 154, 140)
TEXTO = (236, 231, 222)
PIEDRA = (58, 53, 44)  # piedra del logo sobre noche

img = Image.new("RGB", (W * S, H * S), NOCHE)
d = ImageDraw.Draw(img)

# ---- glow radial teja, sutil, tras el bloque de marca ----
glow = Image.radial_gradient("L").resize((1500 * S, 1500 * S))
glow = glow.point(lambda v: int((255 - v) * 0.09))  # centro ~9% alpha
teja_layer = Image.new("RGB", glow.size, TEJA)
img.paste(teja_layer, (int(800 * S - glow.size[0] / 2), int(190 * S - glow.size[1] / 2)), glow)
d = ImageDraw.Draw(img)

# ---- logo: anillo de 11 dovelas, clave teja levantada ----
def sector(cx, cy, R, r, a1, a2, dy=0.0, steps=24):
    pts = []
    for i in range(steps + 1):
        a = math.radians(a1 + (a2 - a1) * i / steps)
        pts.append((cx + R * math.cos(a), cy + dy + R * math.sin(a)))
    for i in range(steps + 1):
        a = math.radians(a2 + (a1 - a2) * i / steps)
        pts.append((cx + r * math.cos(a), cy + dy + r * math.sin(a)))
    return pts

def logo(cx, cy, radius, color_piedra, color_clave, alpha=None):
    # geometria de gen-logo.py: N=11, gap 3 grados, R=42/r=26 sobre viewBox 100, clave dy=-5
    N, gap = 11, 3.0
    k_R, k_r, k_dy = radius * 42 / 42, radius * 26 / 42, -radius * 5 / 42
    seg = 360 / N
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    dl = ImageDraw.Draw(layer)
    for k in range(N):
        c = -90 + k * seg
        a1, a2 = c - seg / 2 + gap / 2, c + seg / 2 - gap / 2
        if k == 0:
            dl.polygon(sector(cx, cy, k_R, k_r, a1, a2, dy=k_dy), fill=color_clave + (alpha or 255,))
        else:
            dl.polygon(sector(cx, cy, k_R, k_r, a1, a2), fill=color_piedra + (alpha or 255,))
    img.paste(layer, (0, 0), layer)

# logo principal, a la izquierda del wordmark (zona segura, sobre el avatar no)
logo(560 * S, 190 * S, 105 * S, PIEDRA, TEJA)

# ---- tipografia ----
def font(size, bold=False):
    try:
        return ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", size * S, index=1 if bold else 0)
    except Exception:
        return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size * S, index=1 if bold else 0)

def tracked(draw, xy, text, f, fill, tracking):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill)
        x += draw.textlength(ch, font=f) + tracking * S
    return x - tracking * S

# wordmark ONTOS
f_word = font(92, bold=True)
end_x = tracked(d, (742 * S, 118 * S), "ONTOS", f_word, TEXTO, tracking=26)

# lema (2 lineas, granito claro)
f_lema = font(27)
d.text((746 * S, 254 * S), "El modelo digital de lo que tu negocio es,", font=f_lema, fill=GRANITO_CLARO)
d.text((746 * S, 292 * S), "y la IA que lo opera.", font=f_lema, fill=GRANITO_CLARO)

# dominio en teja, alineado con el lema
f_dom = font(24, bold=True)
d.text((746 * S, 338 * S), "ontosdigital.es", font=f_dom, fill=TEJA)

out = img.resize((W, H), Image.LANCZOS)
out.save("/Users/fdocallel/Dev/ontosdigital-web/brand/banner-linkedin.png")
print("ok banner-linkedin.png", out.size)
