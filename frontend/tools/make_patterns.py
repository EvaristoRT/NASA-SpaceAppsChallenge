"""Genera las versiones para pantalla de los patrones de marca (public/brand/*.png).

Los originales (design/brand/patterns, 2360 px, líneas de ~1 px) se vuelven casi invisibles si se reducen mucho. Este script
los guarda como blanco sobre transparente (la oscuridad de la línea pasa a ser la opacidad), a doble densidad para pantallas
nítidas, con un refuerzo suave de las líneas y SIN engrosar ni binarizar (eso daba bordes pixelados).
Necesita Pillow (herramienta aparte, no es dependencia de la app). Desde frontend/:  python tools/make_patterns.py
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "design" / "brand" / "patterns"
DST = ROOT / "public" / "brand"

# salida: (original, líneas "dark" sobre blanco o "light" sobre negro, ancho en px, giro en grados, refuerzo)
# waves-vertical: las ondas giradas 90 grados, para que corran de arriba hacia abajo (explorador).
PATTERNS = {
    "waves": ("waves", "dark", 2000, 0, 1.5),
    "waves-vertical": ("waves", "dark", 2000, 90, 1.5),
    "orbits": ("orbits", "light", 2400, 0, 1.5),
}

for name, (origin, mode, width, turn, gain) in PATTERNS.items():
    gray = Image.open(SRC / f"{origin}.png").convert("RGB").convert("L")
    if turn:
        gray = gray.rotate(turn, expand=True)
    inten = ImageOps.invert(gray) if mode == "dark" else ImageOps.autocontrast(gray)
    inten = inten.resize((width, width), Image.LANCZOS).point(lambda v: min(255, int(v * gain)))
    Image.merge("LA", (Image.new("L", inten.size, 255), inten)).save(DST / f"{name}.png", optimize=True)
    print("ok", name)
