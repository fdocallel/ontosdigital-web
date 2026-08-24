#!/usr/bin/env python3
"""Portada de la PÁGINA DE EMPRESA de LinkedIn (1128x191) — distinta del perfil.

  python3 gen-banner-empresa.py ["lema"] [salida.png]

No es el banner del perfil recortado: la proporción es 5,9:1 en vez de 4:1, y
sobre todo cambia lo que hay alrededor.

 * SIN WORDMARK. LinkedIn ya pinta «ONTOS» en grande justo debajo, junto al
   logo. Repetirlo en la portada es decir dos veces lo mismo y gastar el único
   sitio donde cabe un argumento.
 * ESQUINA INFERIOR IZQUIERDA RESERVADA: el logo de la Página se superpone ahí
   (~200 px de ancho contando el margen), así que la tinta arranca en x=270.
 * ESCALA ~1:1 (se sirve a ~1128 px en escritorio), al contrario que el banner
   del perfil, que se reduce a 605 y obliga a cuerpos enormes. Aquí un cuerpo
   de 44 px se lee como 44.
 * La marca N5 va a la DERECHA y sólida, no de marca de agua: a este tamaño los
   radios se distinguen, que era justo el motivo por el que se descartó en el
   perfil.
 * Geometría, paleta, fondo con dither y tipografía se REUTILIZAN de
   gen-banner.py (DATO ÚNICO: no se copia ni una constante).
"""
import runpy, sys
from pathlib import Path

from PIL import Image, ImageDraw

BASE = Path(__file__).resolve().parent
g = runpy.run_path(str(BASE / "gen-banner.py"))     # no ejecuta su __main__

W, H = 1128, 191
g["fondo"].__globals__["W"], g["fondo"].__globals__["H"] = W, H   # run_path DEVUELVE UNA COPIA:
# hay que tocar el namespace real de las funciones, no el dict que devuelve
S = g["S"]

LEMA = "Ingeniería de la información."
SUB = "Datos, procesos y conocimiento en orden."
DOMINIO = g["DOMINIO"]
SALIDA = str(BASE / "banner-empresa-linkedin.png")
if len(sys.argv) > 1:
    LEMA = sys.argv[1]
if len(sys.argv) > 2:
    SALIDA = sys.argv[2]

X0 = 270                        # el logo de la Página tapa hasta ~200
CY = 95                         # centro óptico de la banda
R_MARCA = 58                    # radio de la marca N5, a la derecha
X_MARCA = W - 118
CUERPO_LEMA, CUERPO_SUB, CUERPO_DOM = 44, 23, 20
GLOW = (X_MARCA, CY, 520, 0.085)


def lockup(d):
    f_l = g["av"](g["MEDIUM"], CUERPO_LEMA)
    f_s = g["av"](g["MEDIUM"], CUERPO_SUB)
    f_d = g["av"](g["DEMI"], CUERPO_DOM)
    sep1, sep2 = 38, 30
    desc = CUERPO_DOM * 0.24
    top = CY - (g["cap"](f_l) + sep1 + sep2 + desc) / 2
    b1 = top + g["cap"](f_l)
    g["texto"](d, X0, b1, LEMA, f_l, g["TEXTO"])
    g["texto"](d, X0, b1 + sep1, SUB, f_s, g["GRANITO_CLARO"])
    g["texto"](d, X0, b1 + sep1 + sep2, DOMINIO, f_d, g["TEJA"],
               tracking=CUERPO_DOM * 0.06)
    g["logo"](d, X_MARCA * S, CY * S, R_MARCA * S)


if __name__ == "__main__":
    capa = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    lockup(ImageDraw.Draw(capa))
    base = g["fondo"](GLOW).convert("RGBA")
    base.alpha_composite(capa.resize((W, H), Image.LANCZOS))
    base.convert("RGB").save(SALIDA, optimize=True, compress_level=9)
    print("ok", SALIDA)
