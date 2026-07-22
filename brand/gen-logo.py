#!/usr/bin/env python3
"""Genera los SVG del logo ONTOS (3 variantes) con geometria exacta."""
import math, os

ACCENT = "#d4713b"
OUT = "/Users/fdocallel/Dev/ontosdigital-web/brand"
os.makedirs(OUT, exist_ok=True)

def pt(cx, cy, r, deg):
    a = math.radians(deg)
    return (cx + r * math.cos(a), cy + r * math.sin(a))

def seg_path(cx, cy, R, r, a1, a2, dx=0.0, dy=0.0):
    """sector de anillo de a1 a a2 (grados), trasladado (dx,dy)"""
    x1, y1 = pt(cx, cy, R, a1); x2, y2 = pt(cx, cy, R, a2)
    x3, y3 = pt(cx, cy, r, a2); x4, y4 = pt(cx, cy, r, a1)
    f = lambda v: round(v, 2)
    large = 1 if abs(a2 - a1) > 180 else 0
    return (f"M{f(x1+dx)},{f(y1+dy)} A{R},{R} 0 {large} 1 {f(x2+dx)},{f(y2+dy)} "
            f"L{f(x3+dx)},{f(y3+dy)} A{r},{r} 0 {large} 0 {f(x4+dx)},{f(y4+dy)} Z")

def svg(paths, vb="0 0 100 100"):
    body = "\n".join(paths)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">\n{body}\n</svg>\n')

# ---- Variante A (V4, 22-jul-2026): 7 dovelas, anillo fino 0.70, clave exenta -19% ----
# (la version de 11 dovelas gruesas queda superseded: estudio 2026-07-marca-critica-logo)
def variante_a(stone):
    N, gap = 7, 4.0
    cx, cy, R, r = 50, 53, 42, 29.4
    seg = 360 / N
    paths = []
    for k in range(N):
        c = -90 + k * seg
        a1, a2 = c - seg/2 + gap/2, c + seg/2 - gap/2
        if k == 0:  # clave: acento, claramente exenta (8u = 19% de R)
            paths.append(f'<path d="{seg_path(cx,cy,R,r,a1,a2,0,-8)}" fill="{ACCENT}"/>')
        else:
            paths.append(f'<path d="{seg_path(cx,cy,R,r,a1,a2)}" fill="{stone}"/>')
    return paths
open(f"{OUT}/logo-a-anillo.svg","w").write(svg(variante_a("currentColor")))
open(f"{OUT}/logo.svg","w").write(svg(variante_a("currentColor")))
open(f"{OUT}/favicon.svg","w").write(svg(variante_a("#8a8177")))

# ---- Variante B: arco de medio punto (Acueducto), clave en acento ----
N, gap = 7, 2.6
cx, cy, R, r = 50, 78, 46, 27
seg = 180 / N
paths = []
for k in range(N):
    a1 = 180 + k * seg + gap/2
    a2 = 180 + (k+1) * seg - gap/2
    mid = (a1 + a2) / 2
    if abs(mid - 270) < seg/2:  # clave (centro arriba)
        paths.append(f'<path d="{seg_path(cx,cy,R,r,a1,a2,0,-5)}" fill="{ACCENT}"/>')
    else:
        paths.append(f'<path d="{seg_path(cx,cy,R,r,a1,a2)}" fill="currentColor"/>')
open(f"{OUT}/logo-b-arco.svg","w").write(svg(paths))

# ---- Variante C: la dovela sola (clave grande) ----
cx, cy, R, r = 50, 96, 78, 34
half = 11  # semiangulo en grados
paths = [f'<path d="{seg_path(cx,cy,R,r,270-half,270+half)}" fill="{ACCENT}"/>']
# dos vecinas fantasma (aportan lectura de arco sin robar protagonismo)
for a1, a2 in [(270-3.4*half, 270-1.4*half), (270+1.4*half, 270+3.4*half)]:
    paths.append(f'<path d="{seg_path(cx,cy,R,r,a1,a2)}" fill="currentColor" opacity="0.35"/>')
open(f"{OUT}/logo-c-dovela.svg","w").write(svg(paths))

print("ok:", os.listdir(OUT))
