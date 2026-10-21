"""Dessine l'icône du jeu (public/icon.svg) : un T en briques à rivets et une fée.

Relancer seulement si on change l'icône, puis convertir en PNG :
    python3 scripts/make-icons.py
    for s in 180 192 512; do inkscape public/icon.svg -w $s -h $s -o public/icon-$s.png; done
"""
from pathlib import Path

N = 32  # l'icône fait 32 × 32 pixels d'art
rects = []


def px(x: int, y: int, color: str, w: int = 1, h: int = 1) -> None:
    rects.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{color}"/>')


def brick(x: int, y: int, base: str, light: str, dark: str) -> None:
    px(x, y, "#10080c", 7, 7)
    px(x + 1, y + 1, base, 5, 5)
    px(x + 1, y + 1, light, 5, 1)
    px(x + 1, y + 1, light, 1, 5)
    px(x + 1, y + 5, dark, 5, 1)
    px(x + 5, y + 2, dark, 1, 4)
    px(x + 2, y + 2, "#fcfcfc")


px(0, 0, "#0e1428", N, N)
# Le T, centré, dans une zone sûre pour les icônes rondes d'Android.
brick(5, 10, "#d03ce8", "#f8a0fc", "#7c0090")
brick(12, 10, "#f8d800", "#fcfc9c", "#a88800")
brick(19, 10, "#3cbcfc", "#a4e4fc", "#0058c8")
brick(12, 17, "#58d854", "#c0f878", "#007800")
# La fée, en haut à droite.
for x, y, c in [(22, 4, "#a8e4fc"), (26, 4, "#a8e4fc"), (23, 5, "#fcfcfc"), (24, 5, "#fcfcfc"),
                (25, 5, "#fcfcfc"), (24, 4, "#fcfcfc"), (24, 6, "#fcfcfc"), (22, 6, "#a8e4fc"),
                (26, 6, "#a8e4fc")]:
    px(x, y, c)

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}" shape-rendering="crispEdges">'
       + "".join(rects) + "</svg>\n")
Path(__file__).resolve().parent.parent.joinpath("public", "icon.svg").write_text(svg)
