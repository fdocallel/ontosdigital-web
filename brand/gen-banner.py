#!/usr/bin/env python3
"""Banner de LinkedIn 1584x396 con la marca ONTOS — v3, diseñado a ESCALA REAL.

  python3 gen-banner.py ["lema alternativo"] [salida.png]
  python3 sim-linkedin.py banner-linkedin.png    <- la vista en la que se juzga

La v2 (24-ago por la mañana) se diseñó mirando el fichero a tamaño completo y
fallaba en el perfil: LinkedIn lo pinta a 605 px de ancho, así que el lema de
27 px se leía a 10 y la marca de agua se volvía una nube marrón. Medido en el
perfil real (www.linkedin.com/in/fercalle-ontos, 24-ago) y corregido:

 * ESCALA 605/1584 = 0,3819 -> divide cualquier cuerpo entre 2,6 para saber lo
   que se lee. Aquí: ONTOS 112 -> 43 px · lema 48 -> 18 · dominio 30 -> 11.
 * RECORTE VERTICAL: se ven 136 px de alto, no 151. LinkedIn se come ~40 px de
   diseño, mitad arriba y mitad abajo -> toda la tinta entre y 60 y y 336.
 * FOTO DE PERFIL: tapa hasta x=411 (con y>240) -> el lockup arranca en x=440.
   Las guías de «safe area» que circulan daban x<320: se quedaban cortas.
 * LEMA CORTO: con la foto comiéndose el arranque y el móvil el final, el ancho
   útil son ~810 px, no 1.180. Una frase de 44 caracteres no cabe ahí a cuerpo
   legible; con 31 se sube de 40 a 48 px (+78% de tamaño real). Por eso el lema
   de la web se acorta AQUÍ y solo aquí.
 * SIN MARCA DE AGUA: el anillo N5 grande se probó y a 605 px no se reconoce como
   la marca (los radios desaparecen); con brasa además emborronaba. Descartada
   por inútil, no por fallida: no compra nada que no dé ya el logo del lockup.
 * SIN BANDING: el glow se calcula en float y se dithera con ruido TPDF de ±1,3
   niveles cuya amplitud sigue al degradado. Si LinkedIn recomprime fuerte y
   aparece escalonado, el dial es `amp` en fondo().
 * GEOMETRÍA de la marca N5 leída en vivo de gen-logo.py (DATO ÚNICO), no copiada.
 * TIPOGRAFÍA Avenir Next (colores.md §Tipografía reserva Fraunces para la web).
Paleta: brand/colores.md — 60/30/10, la teja poca y mandando.
"""
import math, random, runpy, sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1584, 396
S = 4                                   # supersample de formas y texto

# ---- paleta (brand/colores.md) ----
NOCHE = (15, 14, 12)
TEJA = (212, 113, 59)
GRANITO_CLARO = (163, 154, 140)
TEXTO = (236, 231, 222)
PIEDRA = (69, 63, 53)                   # la piedra del logo sobre noche

# ---- geometría canónica de la marca N5: se LEE de gen-logo.py, no se copia ----
_g = runpy.run_path(str(Path(__file__).resolve().parent / 'gen-logo.py'))
N_DOV, GAP = _g['N'], _g['GAP']
R_EXT, R_INT = float(_g['R_EXT']), float(_g['R_INT'])
RADIO_1, RADIO_2, RADIO_W = _g['RADIO_1'], _g['RADIO_2'], _g['RADIO_W']
NUCLEO_R = float(_g['NUCLEO_R'])

AVENIR = "/System/Library/Fonts/Avenir Next.ttc"
FRAUNCES = __file__.rsplit("/", 1)[0] + "/fraunces-600.ttf"  # wordmark (decision 1-sep-2026, colores.md)
DEMI, MEDIUM = 2, 5

WORDMARK = "ONTOS"
LEMA = "Tu vida y tu negocio, modelados."      # corto A PROPÓSITO: ver cabecera
DOMINIO = "ontosdigital.es"
SALIDA = str(Path(__file__).resolve().parent / "banner-linkedin.png")
if len(sys.argv) > 1:
    LEMA = sys.argv[1]
if len(sys.argv) > 2:
    SALIDA = sys.argv[2]

# ---- encuadre medido en el perfil real (no estimado) ----
X0 = 440                    # borde izquierdo del lockup (la foto llega a 411)
Y_MIN, Y_MAX = 60, 336      # banda visible tras el recorte vertical
CY = 198                    # centro óptico
R_MARCA = 92                # radio de la marca N5
CUERPO_WORD, CUERPO_LEMA, CUERPO_DOM = 112, 48, 30
GLOW = (900, 168, 900, 0.090)           # cx, cy, radio, intensidad


# ---------------------------------------------------------------- geometría
def sector(cx, cy, R, r, a1, a2, steps=64):
    pts = []
    for i in range(steps + 1):
        a = math.radians(a1 + (a2 - a1) * i / steps)
        pts.append((cx + R * math.cos(a), cy + R * math.sin(a)))
    for i in range(steps + 1):
        a = math.radians(a2 + (a1 - a2) * i / steps)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
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


# ---------------------------------------------------------------- fondo
def fondo(glow, amp=1.3, amp_min=0.35, semilla=7):
    """noche + glow cálido en float y DITHER TPDF antes de cuantizar: mata el
    banding con grano imperceptible. La amplitud sigue al degradado — donde el
    fondo es plano basta un roce. Sin numpy a propósito: este script corre con el
    Python del sistema desde gen-marca.py (0,8 s)."""
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
    return ImageFont.truetype(AVENIR, int(size * S), index=idx)


def fr(size):
    return ImageFont.truetype(FRAUNCES, int(size * S))


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
    """marca N5 + ONTOS + lema + dominio, en columna a la derecha de la foto y
    centrado en la banda que LinkedIn deja ver."""
    logo(d, (X0 + R_MARCA) * S, CY * S, R_MARCA * S)
    X = X0 + 2 * R_MARCA + 60
    f_w, f_l, f_d = fr(CUERPO_WORD), av(MEDIUM, CUERPO_LEMA), av(DEMI, CUERPO_DOM)
    sep1, sep2 = 84, 64
    desc = CUERPO_DOM * 0.24
    top = CY - (cap(f_w) + sep1 + sep2 + desc) / 2
    b1 = top + cap(f_w)
    texto(d, X, b1, WORDMARK, f_w, TEXTO, tracking=CUERPO_WORD * 0.02)
    texto(d, X, b1 + sep1, LEMA, f_l, GRANITO_CLARO)
    texto(d, X, b1 + sep1 + sep2, DOMINIO, f_d, TEJA, tracking=CUERPO_DOM * 0.06)


if __name__ == "__main__":
    capa = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    lockup(ImageDraw.Draw(capa))
    base = fondo(GLOW).convert("RGBA")
    base.alpha_composite(capa.resize((W, H), Image.LANCZOS))
    base.convert("RGB").save(SALIDA, optimize=True, compress_level=9)
    print("ok", SALIDA, "— compruébalo con: python3 sim-linkedin.py", SALIDA)
