#!/usr/bin/env python3
"""SIMULADOR de escala real de LinkedIn — la unica vista en la que se juzga.

  python3 sim-linkedin.py banner-linkedin.png [vista.png]

Medido el 24-ago-2026 en www.linkedin.com/in/fercalle-ontos (desktop):
  * el banner 1584x396 se pinta a 605 px de ANCHO -> escala 605/1584 = 0,3819
  * la altura real es 136 px, no 151 (=396*0,3819): LinkedIn RECORTA ~40 px de
    diseno en vertical (centrado). Zona segura vertical real: y 60..336.
  * la foto de perfil tapa desde el borde izquierdo hasta x=411 de diseno y desde
    y~240 hacia abajo -> circulo de 157 px reales anclado abajo a la izquierda,
    que sobresale del banner sobre la tarjeta blanca.
Todo lo demas del perfil (nombre, titular) va debajo y no nos afecta.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

W_D, H_D = 1584, 396
W_R, H_R = 605, 136                     # lo que se ve de verdad
ESCALA = W_R / W_D                      # 0,381944
CROP = (H_D * ESCALA - H_R) / 2         # 7,63 px recortados arriba y abajo

FOTO_X2_D = 411                         # borde derecho de la foto en coords de diseno
FOTO_Y_D = 240                          # borde superior de la foto en coords de diseno
FOTO = Path("/Users/fdocallel/Dev/ontosdigital-web/brand/fernando.jpg")

CARD_H = 230                            # alto del recorte de tarjeta que dibujamos
BLANCO = (255, 255, 255)


def a_sim(v):
    """px de diseno -> px reales (horizontal)"""
    return v * ESCALA


def simula(src, dst, foto=FOTO):
    im = Image.open(src).convert("RGB")
    assert im.size == (W_D, H_D), im.size
    chico = im.resize((W_R, round(H_D * ESCALA)), Image.LANCZOS)
    chico = chico.crop((0, round(CROP), W_R, round(CROP) + H_R))

    card = Image.new("RGB", (W_R, CARD_H), BLANCO)
    card.paste(chico, (0, 0))

    # --- foto de perfil ---
    r = a_sim(FOTO_X2_D) / 2
    cx = r
    cy = a_sim(FOTO_Y_D) - CROP + r
    d = round(2 * r)

    src_img = Image.open(foto).convert("RGB")
    lado = min(src_img.size)
    x0 = (src_img.width - lado) // 2
    y0 = 0                                     # cara arriba
    src_img = src_img.crop((x0, y0, x0 + lado, y0 + lado)).resize((d * 4, d * 4), Image.LANCZOS)

    masc = Image.new("L", (d * 4, d * 4), 0)
    ImageDraw.Draw(masc).ellipse([0, 0, d * 4 - 1, d * 4 - 1], fill=255)
    src_img = src_img.resize((d, d), Image.LANCZOS)
    masc = masc.resize((d, d), Image.LANCZOS)

    # aro blanco de la tarjeta (LinkedIn deja ~4 px)
    aro = ImageDraw.Draw(card)
    aro.ellipse([cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4], fill=BLANCO)
    card.paste(src_img, (round(cx - r), round(cy - r)), masc)
    card.save(dst)
    return card


def mide(dst):
    p = Path(dst)
    return p.stat().st_size


if __name__ == "__main__":
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else src.replace(".png", "-sim.png")
    simula(src, dst)
    print(f"ok {dst}  escala={ESCALA:.4f}  crop_vertical={CROP:.1f}px")
