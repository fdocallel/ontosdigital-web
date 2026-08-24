#!/usr/bin/env python3
"""Genera los SVG del logo ONTOS con geometria exacta.

Marca N5 'conectado' (23-ago-2026, estudio 2026-08-logo-nucleo-conectado):
ONTOS ya no es la clave del arco sino el NUCLEO — el centro que ordena,
como la portada del sistema (nucleo + 8 areas conectadas).
Sistema adaptativo: marca completa (dovelas + radios + nucleo) en >=96px;
esqueleto (sin radios) en pequeno y favicon. V4 (clave) queda superseded.

Radios a 3,2u desde el 24-ago-2026 (antes 2,6): medido sobre plancha, la separacion
radio/hueco a 32px sube de 56 a 66 sobre noche y de 145 a 170 sobre hueso, sin que
la marca engorde en grande. A 4,0u el radio pesa ya como la dovela (rueda de carro).
El grosor sigue rimando con el gap: la cuerda del gap a la altura de la dovela mide
2,49u. Sin tocar color: el radio hereda currentColor como el resto de la piedra.
"""
import math, os

ACCENT = "#d4713b"
OUT = "/Users/fdocallel/Dev/ontosdigital-web/brand"
os.makedirs(OUT, exist_ok=True)

# geometria comun: anillo R 42 / r 29.4 (0.70) · 8 dovelas (las 8 areas) · gap 4
N, GAP = 8, 4.0
CX = CY = 50
R_EXT, R_INT = 42, 29.4
NUCLEO_R, NUCLEO_R_ESQ = 14, 16.5     # con radios el nucleo cede algo de aire
RADIO_1, RADIO_2, RADIO_W = 15.5, 29.4, 3.2   # 24-ago: 2,6 -> 3,2 (plancha /tmp/logo-v/p2)

def pt(cx, cy, r, deg):
    a = math.radians(deg)
    return (cx + r * math.cos(a), cy + r * math.sin(a))

def seg_path(cx, cy, R, r, a1, a2):
    """sector de anillo de a1 a a2 (grados)"""
    x1, y1 = pt(cx, cy, R, a1); x2, y2 = pt(cx, cy, R, a2)
    x3, y3 = pt(cx, cy, r, a2); x4, y4 = pt(cx, cy, r, a1)
    f = lambda v: round(v, 2)
    large = 1 if abs(a2 - a1) > 180 else 0
    return (f"M{f(x1)},{f(y1)} A{R},{R} 0 {large} 1 {f(x2)},{f(y2)} "
            f"L{f(x3)},{f(y3)} A{r},{r} 0 {large} 0 {f(x4)},{f(y4)} Z")

def svg(paths, vb="0 0 100 100"):
    body = "\n".join(paths)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">\n{body}\n</svg>\n')

def dovelas(stone):
    seg = 360 / N
    out = []
    for k in range(N):
        c = -90 + k * seg
        a1, a2 = c - seg / 2 + GAP / 2, c + seg / 2 - GAP / 2
        out.append(f'<path d="{seg_path(CX, CY, R_EXT, R_INT, a1, a2)}" fill="{stone}"/>')
    return out

def radios(stone):
    seg = 360 / N
    out = []
    for k in range(N):
        a = -90 + k * seg
        x1, y1 = pt(CX, CY, RADIO_1, a); x2, y2 = pt(CX, CY, RADIO_2, a)
        out.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" '
                   f'stroke="{stone}" stroke-width="{RADIO_W}"/>')
    return out

def nucleo(r):
    return [f'<circle cx="{CX}" cy="{CY}" r="{r}" fill="{ACCENT}"/>']

def marca_completa(stone):     # N5b: dovelas + radios + nucleo
    return dovelas(stone) + radios(stone) + nucleo(NUCLEO_R)

def esqueleto(stone):          # sin radios: barra, favicon, tamanos <96px
    return dovelas(stone) + nucleo(NUCLEO_R_ESQ)

open(f"{OUT}/logo.svg", "w").write(svg(marca_completa("currentColor")))
open(f"{OUT}/logo-esqueleto.svg", "w").write(svg(esqueleto("currentColor")))
open(f"{OUT}/favicon.svg", "w").write(svg(esqueleto("#8a8177")))

# ---- motivo secundario: arco de medio punto (Acueducto), clave en acento ----
# (sigue vivo como FONDO del banner y cabeceras; ya no es la marca primaria)
n_arco, gap_arco = 7, 2.6
cx, cy, R, r = 50, 78, 46, 27
seg = 180 / n_arco
paths = []
for k in range(n_arco):
    a1 = 180 + k * seg + gap_arco / 2
    a2 = 180 + (k + 1) * seg - gap_arco / 2
    mid = (a1 + a2) / 2
    if abs(mid - 270) < seg / 2:  # clave (centro arriba)
        x1, y1 = pt(cx, cy - 5, R, a1); _ = (x1, y1)
        p = seg_path(cx, cy - 5, R, r, a1, a2)
        paths.append(f'<path d="{p}" fill="{ACCENT}"/>')
    else:
        paths.append(f'<path d="{seg_path(cx, cy, R, r, a1, a2)}" fill="currentColor"/>')
open(f"{OUT}/logo-b-arco.svg", "w").write(svg(paths))

print("ok:", sorted(f for f in os.listdir(OUT) if f.endswith(".svg")))
