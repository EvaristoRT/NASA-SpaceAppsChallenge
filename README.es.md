# Armonización de focos de calor MODIS y VIIRS

> 🇬🇧 English version: [README.md](README.md)

**NASA Space Apps Challenge 2026 · reto "Harmonization of MODIS and VIIRS Hot Spots"** (propuesto por CONAE, Argentina).

Una aplicación web que muestra el **calendario de actividad de quema** de cualquier zona de América desde 2000 hasta noviembre de 2026,
con una sola serie comparable aunque los datos vengan de satélites distintos. El usuario elige un país o dibuja un área, ve qué meses y
qué años tuvieron más fuego, compara el mes actual con lo normal de la zona y descarga los datos y las gráficas.

> **Alcance de la demo: solo América** (de Alaska a Tierra del Fuego), que es la región cargada en la app.
> Europa y África se procesaron **solo para validar el método** en otros regímenes de fuego (resultados en la sección 3) y **no** están en la app.
> Asia y Oceanía no se procesaron. El pipeline corre por región: sumar un continente es volver a correrlo con `--region`.

---

## 1. El problema

Los satélites detectan fuego activo desde hace más de 20 años, pero el registro está partido entre instrumentos que **no se pueden
comparar directamente**:

| Instrumento | Satélites | Años | Píxel |
|---|---|---|---|
| MODIS | Terra (desde 2000-11), Aqua (desde 2002-07) | 2000 → hoy, **al final de su vida útil** | ~1 km |
| VIIRS | S-NPP (2012-01 → **terminó el 2026-11-02**), NOAA-20 (desde 2018-04), NOAA-21 (desde 2023-03) | 2012 → hoy | 375 m |

Para el mismo fuego, VIIRS cuenta **unas 4 veces más focos** que MODIS (píxel más chico, más sensible). Sumar los conteos crudos inventa
tendencias: la serie "sube" en 2002 (entra Aqua), en 2012 (entra VIIRS) y en 2018 (entra NOAA-20) sin que haya más fuego.

## 2. Lo que hicimos

### La idea en una frase
Toda la serie se expresa en **"equivalente NOAA-20"**: del 2018 en adelante es lo que mide NOAA-20, y los años anteriores se estiman
llevando cada satélite a esa escala con factores aprendidos en los años en que ambos funcionaron a la vez.

### Decisiones de método (y por qué)

| Decisión | Por qué |
|---|---|
| **Referencia: VIIRS NOAA-20**, no MODIS ni S-NPP | S-NPP dejó de operar el 2026-11-02 (y en sus últimos meses perdía sensibilidad: NOAA-20 / S-NPP pasó de 0.98 a 1.26 entre enero y julio de 2026). MODIS se está apagando: la razón Terra/Aqua, estable en ~0.50 entre 2003 y 2021, cae a 0.43 en 2024 y 0.38 en 2025. NOAA-20 sigue activo y NOAA-21 concuerda con él al ~1%. Así **el presente es dato medido** y lo estimado es el pasado |
| **Unidad: "día-celda"** = un hexágono H3 de resolución 8 (~0.7 km², parecido a un píxel MODIS) con al menos un foco ese día | Quita buena parte de la diferencia de huella: un frente que VIIRS parte en 20 detecciones de 375 m cuenta como un solo día-celda. Medido: la brecha NOAA-20 / MODIS baja de 3.98× (focos) a 2.84× (días-celda) |
| **Un factor por satélite y nunca sumar satélites VIIRS entre sí** | Sumarlos crea saltos falsos cada vez que entra un satélite |
| **Tramo "solo Terra" aparte** (2000-11 → 2002-06) | Antes de Aqua la capacidad de observación era la mitad |
| **Segunda métrica: FRP** (potencia radiativa del fuego, MW), con su propio factor | Mide cuánto arde, no solo dónde. Depende menos del sensor que los focos, pero no es neutra (NOAA-20 / MODIS ≈ 0.7–0.85) |
| **Limpieza** de volcanes, plataformas marinas, mecheros de gas e industria | FIRMS marca muchas fuentes estáticas (`type` 1–3). Los datos recientes (NRT) no traen esa marca: se filtran con una **máscara de celdas estáticas** armada con el histórico |

### El modelo
No es una red neuronal: es un **modelo de razones**, elegido porque se puede explicar en una frase y validar con datos reales.

- Para cada región (hexágono padre H3 de resolución 3, ~12,000 km²) y cada mes del año se calcula
  `factor = días-celda de NOAA-20 / días-celda del otro satélite`, en los meses en que ambos funcionaron.
- Las regiones con pocos datos se **encogen hacia el factor global** (prior de pseudo-cuentas), para que no den factores absurdos.
- Cadena hacia NOAA-20: S-NPP × `k_snpp` (2012–2018), MODIS × `k_modis` (2002–2011), Terra × `f_terra` × `k_modis` (2000–2002).
  Un solo salto en todo, salvo el tramo solo Terra, que nunca coincidió con VIIRS.
- **Incertidumbre:** banda del 95% por **bootstrap** (200 réplicas, remuestreando hexágonos y años).

### El pipeline
Siete pasos en `pipeline/scripts/`, todos con DuckDB y Parquet. Cada uno documenta sus entradas, salidas y reglas al inicio del archivo.

| Paso | Qué hace |
|---|---|
| `00` / `00b` | Baja el archivo histórico de FIRMS (zips anuales, públicos) y el año en curso por la API, partiendo cada bloque donde termina la calidad estándar |
| `01` | **Bronze:** convierte todo a Parquet con un esquema único — **553 millones de focos**, 2000–2026, todo el mundo |
| `02` | Revisión de calidad: cobertura por satélite, nulos, duplicados, razón Terra/Aqua |
| `03` | **Silver:** limpieza, celdas H3 (res 8, 6, 5 y 3) y recorte por región |
| `04` | Tabla de calibración: días-celda, focos y FRP por hexágono × mes, **una columna por satélite** |
| `05` | Modelo: factores, banda por bootstrap y validación |
| `06` | **Gold:** serie armonizada por hexágono y día |
| `07` | Entrega para la app: serie con anomalías, focos para el CSV y zips para publicar |

Detalle de decisiones y contratos de columnas: [`pipeline/PLAN_EQUIPO.md`](pipeline/PLAN_EQUIPO.md) · cómo correrlo: [`pipeline/README.md`](pipeline/README.md).

## 3. Resultados: ¿funciona la armonización?

**Validación temporal:** los factores se ajustan con **2018–2022** y se prueban en **2023–2026**, años que el modelo nunca vio,
contra lo que NOAA-20 midió de verdad. Se hizo en cinco regiones.

![Sesgo de MODIS antes y después de armonizar, por región](docs/img/validacion_regiones.png)

| Región | Focos limpios | Factor MODIS → NOAA-20 | Sesgo sin → con armonizar | Error mediano mensual | Correlación | Meses dentro de la banda |
|---|---|---|---|---|---|---|
| Argentina + Chile | 14.6 M | 2.32 [2.24–2.42] | −56% → **+1.9%** | 8.7% | 0.995 | 95.7% |
| Sudamérica | 69.7 M | 2.65 [2.60–2.69] | −61% → **+7.3%** | 5.9% | 0.996 | 95.7% |
| **América (la de la app)** | ~100 M | 2.64 [2.57–2.70] | −61% → **+5.4%** | 6.3% | 0.995 | 97.9% |
| Europa | 10.5 M | 2.61 [2.54–2.83] | −63% → **−2.0%** | 11.5% | 0.993 | 89.4% |
| África | 265.6 M | 3.03 [2.93–3.13] | −70% → **−8.0%** | 10.0% | 0.974 | 80.9% |

S-NPP → NOAA-20 (los años 2012–2018): sesgo de −0.8% a −2.7% y error mediano de 2.0% a 3.9% en todas las regiones.

**Serie mensual de América en los años de prueba** — negro: lo que midió NOAA-20; rojo: MODIS llevado a escala NOAA-20; gris: MODIS sin armonizar.

![Validación en América, 2023–2026](docs/img/validacion_america_serie.png)

### Otras comprobaciones
- **Sin saltos falsos al cambiar de satélite.** En 2013–2017, años sin NOAA-20, el mismo año llevado a NOAA-20 por dos caminos
  independientes (desde MODIS y desde S-NPP) coincide entre −3% y +4%.
- **El factor cambia con el tipo de fuego, y el modelo lo capta.** En América, la franja boreal (Canadá y Alaska) tiene factor 2.27
  frente a 2.66 en EE. UU., México y Sudamérica; validada por separado da sesgo +6.9%.
- **Fuentes industriales que se cuelan:** 0.4% de los días-celda en América, 1.7% en Europa (acerías).
- **Cómo leer la banda:** la incertidumbre del factor es chica (entre ±2% y +8% según la región); lo que más varía es la relación entre sensores de un año a otro.
  La banda que se muestra **contiene el valor real en el 95.7–97.9% de los meses de prueba en América y Sudamérica** (menos en Europa y
  África). Es una banda empírica comprobada, no un intervalo de confianza del total en sentido estricto.

Todas las cifras, con su método: [`pipeline/HALLAZGOS_QA.md`](pipeline/HALLAZGOS_QA.md), [`pipeline/REGIONES.md`](pipeline/REGIONES.md),
[`pipeline/MVP_AMERICA.md`](pipeline/MVP_AMERICA.md). Prueba del producto contra cada punto del reto: [`pipeline/PRUEBA_RETO.md`](pipeline/PRUEBA_RETO.md).

## 4. La aplicación

- **Elegir la zona:** continentes y países en el mapa, **polígono dibujado** o **coordenadas escritas**.
- **Calendario de quema** años × meses, con rampas de color perceptualmente uniformes y aptas para daltonismo, navegable con teclado.
- **Mes actual contra lo normal** de la zona (mediana 2003–2020), con anomalía y percentil. El mes en curso se marca como parcial y los
  meses recientes como preliminares (NRT).
- **Meses que vienen:** el rango esperado según la historia de la zona, marcado como "esperado, no medido".
- **Serie con su banda de incertidumbre** y la fuente de cada mes.
- **Selector de periodo**, conteo de focos en el área y **descargas**: CSV de la serie, de los hexágonos de un mes y de los **focos
  individuales recortados al polígono exacto**, y las gráficas en PNG.
- Mapa de hexágonos con fuego del mes elegido. Español e inglés.

Stack: **pipeline** Python + DuckDB + Parquet + H3 · **backend** FastAPI · **frontend** React + Vite + Mapbox GL, desplegable en Vercel.

## 5. Correrlo en tu computadora

Necesitas Python 3.12+, Node 20+, un token **público** de Mapbox (empieza con `pk.`) y la carpeta de la entrega de datos
(`ignis-backend-america.zip` descomprimido).

```powershell
# backend
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:DATA_DIR = "C:\ruta\a\entrega_america"
uvicorn main:app --port 8000
```

```powershell
# frontend (otra terminal)
cd frontend
npm install
# crear frontend\.env.local con dos líneas:
#   VITE_MAPBOX_TOKEN=pk.tu_token
#   VITE_API_URL=http://localhost:8000
npm run dev
```

Con la entrega de América el backend usa ~0.8 GB de memoria en reposo y ~1.9 GB al consultar el continente entero.
Más detalle en [`backend/README.md`](backend/README.md) y [`frontend/README.md`](frontend/README.md). Despliegue: [`pipeline/DESPLIEGUE.md`](pipeline/DESPLIEGUE.md).

## 6. Limitaciones (las decimos nosotros antes de que alguien las encuentre)

- **Antes de 2012 no hay con qué comprobar MODIS** (no existía VIIRS). En Argentina + Chile la razón Terra/Aqua sube de 0.47 (2003) a
  ~0.62 (2011) y no se puede saber si es el fuego o el sensor. Es el tramo menos verificable.
- **Los meses recientes de 2026 son preliminares (NRT):** NASA los reemplaza por la versión definitiva unos 5 meses después. El sesgo
  entre ambas versiones no se puede medir (no se solapan). Corte de los datos: **2026-11-15**.
- **La app muestra América.** Europa y África están procesadas y validadas (cifras arriba) pero no cargadas en la app.
- **Las regiones son rectángulos**, no fronteras. En 2026 faltan Galápagos y el este de Groenlandia (casi sin fuegos de vegetación).
- **Quedan fuentes industriales** que FIRMS no marca: ~0.4% de los días-celda en América, 1.7% en Europa.
- **En África la armonización es menos precisa** (banda que contiene el 81% de los meses, sesgo −8%): MODIS se degrada en 2025–2026 y allí
  pesa más.
- **La unidad es "día-celda", no "focos".** Es lo que hace comparables los sensores; el número de focos crudos se muestra aparte y está en el CSV.

## 7. Datos y créditos

- Focos de calor: **NASA FIRMS** (Fire Information for Resource Management System), MODIS Collection 6.1 y VIIRS 375 m (S-NPP, NOAA-20,
  NOAA-21): archivo anual por país y API de área. Datos públicos; ver la [cita y el aviso de LANCE/FIRMS](https://www.earthdata.nasa.gov/data/tools/firms).
- Grilla hexagonal: **H3** (Uber).
- Reto propuesto por la **Comisión Nacional de Actividades Espaciales (CONAE)**, Argentina.

**Equipo:** Evaristo y Carlos (datos y modelo), Manuel (backend y aplicación web) y el resto del equipo de diseño y front.
