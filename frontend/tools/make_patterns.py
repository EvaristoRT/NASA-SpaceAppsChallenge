"""Genera las versiones para pantalla de los patrones de marca (public/brand/*.png).

Los originales (design/brand/patterns, 2360 px, líneas de ~1 px) casi desaparecen al reducirlos. Este script engrosa las
líneas y las guarda como blanco sobre transparente, listas para usarse con `opacity` sobre el degradado azul.
Necesita Pillow (herramienta aparte, no es dependencia de la app). Desde frontend/:  python tools/make_patterns.py
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "design" / "brand" / "patterns"
DST = ROOT / "public" / "brand"

# salida: (original, líneas "dark" sobre blanco o "light" sobre negro, ancho en px, filtro de engrosado, giro en grados)
# waves-vertical: las ondas giradas 90 grados, para que corran de arriba hacia abajo (explorador).
PATTERNS = {
    "waves": ("waves", "dark", 1000, 3, 0),
    "waves-vertical": ("waves", "dark", 1000, 3, 90),
    "orbits": ("orbits", "light", 1400, 3, 0),
}

for name, (origin, mode, width, dilate, turn) in PATTERNS.items():
    gray = Image.open(SRC / f"{origin}.png").convert("RGB").convert("L")
    if turn:
        gray = gray.rotate(turn, expand=True)
    inten = ImageOps.invert(gray) if mode == "dark" else ImageOps.autocontrast(gray)
    inten = inten.point(lambda v: 255 if v > 40 else v * 6)   # bordes suavizados -> trazo sólido
    inten = inten.filter(ImageFilter.MaxFilter(dilate)).resize((width, width), Image.LANCZOS)
    inten = inten.point(lambda v: min(255, int(v * 1.6)))
    Image.merge("LA", (Image.new("L", inten.size, 255), inten)).save(DST / f"{name}.png", optimize=True)
    print("ok", name)
