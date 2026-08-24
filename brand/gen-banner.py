#!/usr/bin/env python3
"""Banner de LinkedIn 1584x396 con la marca ONTOS — lockup horizontal (24-ago-2026).

  python3 gen-banner.py ["lema alternativo"] [salida.png]

Sustituye a la versión de julio (marca + texto sin más). Las decisiones de abajo
están MEDIDAS, no opinadas — informe: ONTOS `data/_cache/estilo/banner-linkedin-2026-08-24.md`
(criterio) y las 3 planchas A/B/C que Fernando comparó el 24-ago (eligió A).

 * LEMA de producto (#317): el de consultoría («Raíces sólidas. Futuro inteligente.»)
   quedó revocado el 19-ago. Dice lo mismo que og.png y el <title> de la web.
 * ZONA SEGURA: la foto de perfil tapa la esquina INFERIOR IZQUIERDA (x<320, y>236)
   y el móvil recorta 15-20% por los lados -> ventana útil x 320..1270, aire inferior
   >= 80 px. Las guías de «safe area» que circulan son granjas SEO que discrepan 3x:
   esto es la intersección conservadora, verificada midiendo el bbox de la tinta.
 * GEOMETRÍA de la marca N5 derivada de gen-logo.py (DATO ÚNICO), no recalculada.
   Se dibuja con polígonos a 4x: medido contra rasterizar logo.svg con qlmanage, la
   vía polígono da el borde MÁS limpio (1320 vs 1426 px de transición).
 * SIN BANDING: el glow se calcula en float (no un degradado de 256 niveles
   reescalado) y se DITHERA con ruido TPDF de ±1,3 niveles cuya amplitud sigue al
   propio degradado. Antes: tiradas de 204 px con el mismo valor. Después: 21 px.
   Si LinkedIn recomprime fuerte y vuelve el escalonado, el dial es `amp` de grano().
 * TIPOGRAFÍA: Avenir Next en tres pesos (colores.md §Tipografía reserva Fraunces
   para la web; una serif fina sufre más en la recompresión).
Paleta: brand/colores.md — 60/30/10, la teja poca y mandando.
"""
import math, random, sys
from PIL import Image, ImageDraw, ImageFont

W, H = 1584, 396
S = 4                                   # supersample de formas y texto

# ---- paleta (brand/colores.md) ----
NOCHE = (15, 14, 12)
TEJA = (212, 113, 59)
GRANITO_CLARO = (163, 154, 140)
TEXTO = (236, 231, 222)
PIEDRA = (69, 63, 53)                   # la piedra del logo sobre noche

# ---- geometría canónica de la marca N5 (brand/gen-logo.py) ----
N_DOV, GAP = 8, 4.0
R_EXT, R_INT = 42.0, 29.4               # en unidades del viewBox 100
RADIO_1, RADIO_2, RADIO_W = 15.5, 29.4, 2.6
NUCLEO_R = 14.0
N_ARCO, GAP_ARCO = 7, 2.6               # arco de medio punto (motivo secundario)
ARCO_R, ARCO_r, ARCO_DY = 46.0, 27.0, 5.0

AVENIR = "/System/Library/Fonts/Avenir Next.ttc"
DEMI, MEDIUM = 2, 5

WORDMARK = "ONTOS"
LEMA = "El gemelo digital de tu vida y de tu negocio."
DOMINIO = "ontosdigital.es"
SALIDA = "/Users/fdocallel/Dev/ontosdigital-web/brand/banner-linkedin.png"
if len(sys.argv) > 1:
    LEMA = sys.argv[1]
if len(sys.argv) > 2:
    SALIDA = sys.argv[2]

X_ANCLA, X_MAX = 340, 1270              # ventana útil (ancla izquierda: no centrar)
GLOW = (560, 150, 880, 0.085)           # cx, cy, radio, intensidad


# ---------------------------------------------------------------- geometría
def sector(cx, cy, R, r, a1, a2, dy=0.0, steps=64):
    pts = []
    for i in range(steps + 1):
        a = math.radians(a1 + (a2 - a1) * i / steps)
        pts.append((cx + R * math.cos(a), cy + dy + R * math.sin(a)))
    for i in range(steps + 1):
        a = math.radians(a2 + (a1 - a2) * i / steps)
        pts.append((cx + r * math.cos(a), cy + dy + r * math.sin(a)))
    return pts


def logo(d, cx, cy, R):
    """marca N5 completa; R = radio exterior en px (equivale a R_EXT del viewBox)"""
    e = R / R_EXT
    seg = 360 / N_DOV
    for k in range(N_DOV):
        c = -90 + k * seg
        d.polygon(sector(cx, cy, R, R_INT * e, c - seg / 2 + GAP / 2, c + seg / 2 - GAP / 2),
                  fill=PIEDRA)
    for k in range(N_DOV):
        a = math.radians(-90 + k * seg)
        d.line([(cx + RADIO_1 * e * math.cos(a), cy + RADIO_1 * e * math.sin(a)),
                (cx + RADIO_2 * e * math.cos(a), cy + RADIO_2 * e * math.sin(a))],
               fill=PIEDRA, width=max(1, round(RADIO_W * e)))
    nr = NUCLEO_R * e
    d.ellipse([cx - nr, cy - nr, cx + nr, cy + nr], fill=TEJA)


def arco(d, cx, cy, R, color):
    """arco de medio punto (Acueducto) — marca de agua, geometría de gen-logo.py"""
    e = R / ARCO_R
    seg = 180 / N_ARCO
    for k in range(N_ARCO):
        a1 = 180 + k * seg + GAP_ARCO / 2
        a2 = 180 + (k + 1) * seg - GAP_ARCO / 2
        dy = -ARCO_DY * e if abs((a1 + a2) / 2 - 270) < seg / 2 else 0
        d.polygon(sector(cx, cy, R, ARCO_r * e, a1, a2, dy=dy), fill=color)


# ---------------------------------------------------------------- fondo
def fondo(glow, amp=1.3, amp_min=0.35, semilla=7):
    """noche + glow cálido en float y DITHER TPDF antes de cuantizar: mata el
    banding con grano imperceptible. La amplitud sigue al degradado — donde el
    fondo es plano basta un roce (menos ruido, menos peso). Sin numpy a propósito:
    este script tiene que correr con el Python del sistema desde gen-marca.py."""
    rnd = random.Random(semilla)
    cx, cy, R, k = glow
    dcol = [TEJA[c] - NOCHE[c] for c in range(3)]
    buf = bytearray(W * H * 3)
    i = 0
    for y in range(H):
        dy2 = (y - cy) ** 2
        for x in range(W):
            dist = math.sqrt((x - cx) ** 2 + dy2) / R
            m = (1.0 - dist) ** 2.2 if dist < 1.0 else 0.0   # mapa 0..1 del glow
            f = m * k
            a = amp_min + (amp - amp_min) * math.sqrt(m)
            n = (rnd.random() - rnd.random()) * a
            for c in range(3):
                v = NOCHE[c] + dcol[c] * f + n
                buf[i] = 0 if v < 0 else (255 if v > 255 else int(v))
                i += 1
    return Image.frombytes("RGB", (W, H), bytes(buf))


# ---------------------------------------------------------------- tipografía
def av(idx, size):
    return ImageFont.truetype(AVENIR, size * S, index=idx)


def texto(d, x, baseline, s, f, fill, tracking=0.0):
    """dibuja sobre la LÍNEA DE BASE con tracking, descontando el side bearing
    izquierdo para que todos los bloques compartan borde óptico"""
    px = x * S - f.getbbox(s[0])[0]
    for ch in s:
        d.text((px, baseline * S), ch, font=f, fill=fill, anchor="ls")
        px += d.textlength(ch, font=f) + tracking * S
    return px / S


def cap(f):
    """altura de mayúscula en px 1x (para el ritmo vertical)"""
    b = f.getbbox("H")
    return (b[3] - b[1]) / S


def lockup(d):
    """A — marca a la izquierda y texto a su derecha; el arco de medio punto brota
    como marca de agua del borde inferior derecho, que si no queda muerto."""
    arco(d, 1285 * S, 400 * S, 300 * S, PIEDRA + (26,))
    R = 84
    logo(d, (X_ANCLA + R) * S, 150 * S, R * S)
    X = X_ANCLA + 2 * R + 66
    f_w, f_l, f_d = av(DEMI, 82), av(MEDIUM, 27), av(DEMI, 19)
    b1 = 150 + cap(f_w) / 2                          # wordmark centrado con la marca
    texto(d, X, b1, WORDMARK, f_w, TEXTO, tracking=82 * 0.20)
    texto(d, X, b1 + 62, LEMA, f_l, GRANITO_CLARO)
    texto(d, X, b1 + 62 + 42, DOMINIO, f_d, TEJA, tracking=19 * 0.06)


if __name__ == "__main__":
    capa = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    lockup(ImageDraw.Draw(capa))
    base = fondo(GLOW).convert("RGBA")
    base.alpha_composite(capa.resize((W, H), Image.LANCZOS))
    base.convert("RGB").save(SALIDA, optimize=True, compress_level=9)
    print("ok", SALIDA)
