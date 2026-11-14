# Backend de armonización MODIS + VIIRS

API en FastAPI que arma una serie de tiempo consistente de puntos de calor a partir de MODIS y VIIRS (NASA FIRMS) y la devuelve
para un área dibujada: serie mensual, climatología, anomalías contra la mediana histórica y CSV.

## Cómo correrlo (Windows, PowerShell)
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt pytest httpx
python ..\data\build_demo.py      # datos SINTÉTICOS de demostración -> data\processed
uvicorn main:app --reload --port 8000    # documentación en http://localhost:8000/docs
pytest
```
Los datos de demostración están generados artificialmente y la API lo indica con `synthetic: true`. No son observaciones reales.

## Datos reales
Descargar los CSV del archivo de FIRMS (https://firms.modaps.eosdis.nasa.gov/download/, requiere Earthdata Login), guardarlos en `data/raw/`
con "modis" o "viirs" en el nombre y correr `python ..\data\build_from_firms.py`.

## Armonización
- Unidad: **día-celda en quemas** (celda H3 de resolución 8, ~0.74 km², con al menos un punto de calor en un día). Elimina la diferencia
  de huella entre VIIRS (375 m) y MODIS (1 km).
- Referencia: MODIS Terra + Aqua. Los años con solo Terra y cada era de VIIRS se llevan a esa escala con factores por región (H3 res. 3),
  ajustados en los meses de traslape y encogidos hacia el factor global.
- Validación: ajuste con años impares y prueba con años pares (sobre datos sintéticos con verdad conocida).
- Anomalía: mediana y MAD del mismo mes calendario sobre los años base.

## Limitaciones conocidas
- Un solo factor multiplicativo por región y era; no modela que VIIRS detecte proporcionalmente más fuegos pequeños.
- La era de VIIRS se define por el **número** de satélites activos. Suomi-NPP dejó de entregar datos el 2 de noviembre de 2026, así que
  NOAA-20 + NOAA-21 se mezclaría con NPP + NOAA-20. Hay que definirla por el **conjunto** de satélites.
- Aún no se ha probado con datos reales de FIRMS; el lector de CSV solo se probó con archivos pequeños hechos a mano.

## Contrato
Vive en `ignis/models.py` (pydantic) y se publica en `/openapi.json`. Endpoints: `GET /health`, `GET /api/meta`,
`POST /api/search` (acepta un Polygon, MultiPolygon, Feature o FeatureCollection de GeoJSON) y `POST /api/export.csv?level=monthly|cells`.
`contracts/mock_data.json` es un ejemplo generado con datos sintéticos.
