# Ampliar el mapa por regiones: cómo trabajamos en paralelo

**Fecha:** 2026-11-15 · **De:** Carlos · **Para:** Evaristo (y su asistente de IA)
**Reparto:** Carlos hace **América** (rama `datos/sudamerica`) · Evaristo hace **Europa** (rama nueva `datos/europa`).
**Regla:** `main` no se toca hasta que los dos revisemos. Lo seguro (Argentina + Chile) no se arriesga.

> **Para el asistente de Evaristo:** sigue la sección 2 en orden. No fusiones nada a `main`, no publiques releases y no
> edites `config.py` (la región `europa` ya está). Si algo no cuadra, anótalo en la sección 4 de este archivo.

---

## 1. Cómo encaja todo

- **El código por región ya está en `datos/sudamerica`** (ver [SUDAMERICA.md](SUDAMERICA.md)): 05, 06 y 07 escriben cada región
  en su carpeta (`models/region=<r>/`, `gold/region=<r>/`, `gold/entrega_<r>/`). Correr Europa no pisa Argentina + Chile.
- **Regiones en `config.py`** (solo en la rama): `america` (−170, −57, −30, 72) y `europa` (−25, 34, 45, 72).
- **El bronze ya es global** (zips 2000–2025 de todos los países) y la máscara de fuentes estáticas (`aux/static_mask.parquet`)
  también: para Europa **solo falta 2026**, que hay que bajar por la API.
- **Cada uno valida su continente.** La **entrega final** sale de una sola máquina (la de Carlos, ver `PROPUESTA_CARLOS_ENTREGA.md`),
  porque el backend carga un solo zip: al final se hace una corrida que junte las regiones (o `global`).
  Lo que Europa le aporta a esa corrida son **los CSV de 2026** (`datos_2026/api/zona_europa/`).

## 2. Pasos para Europa (máquina de Evaristo)

```powershell
git fetch origin
git checkout -b datos/europa origin/datos/sudamerica
```

**a) 2026 de Europa.** Necesita una MAP_KEY propia (gratis, solo email: https://firms.modaps.eosdis.nasa.gov/api/map_key/),
en la variable `FIRMS_MAP_KEY` o en `pipeline/.firms_map_key` (git lo ignora). La clave de Carlos no se comparte.
Usar **su propia carpeta** de salida, para que los bloques no choquen con los de América:

```bash
BBOX="-25,34,45,72" OUT="<FIRE_DATA_DIR>/datos_2026/api/zona_europa" bash pipeline/scripts/00b_descargar_2026.sh
```

El script ya parte los bloques donde termina la calidad estándar (SP) y baja el resto en NRT. Son ~260 peticiones por zona;
el límite de la clave es 5000 cada 10 minutos.

**b) Cadena:**

```powershell
python pipeline/scripts/01_to_parquet.py --years 2026     # junta todas las zonas de datos_2026/api/ en el bronze de 2026
python pipeline/scripts/03_silver.py --region europa
python pipeline/scripts/04_calibration_set.py --region europa
python pipeline/scripts/05_model.py --region europa
python pipeline/scripts/06_apply_gold.py --region europa
python pipeline/scripts/07_export.py --region europa --zip   # para medir tamaños; NO publicar
```

Referencia de tiempos (máquina de Carlos, Sudamérica, 70 M de focos): silver ~7 min, calibración ~1.5 min, 06 + 07 ~10 min.

**c) Qué revisar** (anotarlo en la sección 4):

| Revisión | Dónde | Referencia |
|---|---|---|
| Validación MODIS → NOAA-20 (sesgo, error mediano, r) | `models/region=europa/metrics.json` → `validacion.modis_cd` | AR+CL +1.9% / 8.7% / 0.995 · Sudamérica +7.3% / 5.9% / 0.996 |
| Cobertura de la banda | `validacion.modis_cd.ic95_factor` | ~95% en las dos regiones |
| Deriva del factor por año | `deriva_factor_por_anio.modis` | Estable salvo 2023–2025 |
| Fuentes estáticas | `aux/static_mask.parquet` | Europa tiene muchas industriales y quemas agrícolas: revisar que el silver no deje mecheros |
| Tamaño y memoria | `gold/paquetes/ignis-backend-europa.zip` | AR+CL 24 MB · Sudamérica 104 MB |

**d) Subir el trabajo:** solo a la rama `datos/europa` (`git push -u origin datos/europa`). Nada a `main`.

## 3. Lo que hace Carlos en paralelo (América)

✅ **Terminado (2026-11-15).** 2026 de Norte y Centroamérica bajado en dos zonas que no se solapan con Sudamérica
(`zona_norte` −170, 14, −50, 72 · `zona_centro` −95, 5, −85, 14); con eso el bronze de 2026 tiene 8.4 M de focos.

| | Sudamérica | **América** |
|---|---|---|
| Focos limpios (silver) | 69.7 M | **~100 M** |
| Tabla de calibración | 4.6 M filas · 63,661 hex r5 | 6.9 M filas · 125,636 hex r5 |
| Factor MODIS → NOAA-20 (días-celda) | 2.65 | **2.64** [2.57–2.70] |
| Validación 2023–2026: sesgo / error mediano / r | +7.3% / 5.9% / 0.996 | **+5.4% / 6.3% / 0.995** |
| Meses dentro de la banda | 95.7% | 97.9% |
| `ignis-backend-<r>.zip` | 104 MB | **152 MB** |
| `ignis-hotspots-<r>.zip` | 892 MB | **1,346 MB** (cabe en el límite de 2 GB de GitHub) |
| Memoria del backend en reposo / pico con toda la región (máquina de Carlos) | 585 MB / 1.35 GB | **779 MB / 1.85 GB** |

**Validación por franja de latitud** (mismo modelo de `america`, prueba 2023–2026):

| Franja | Factor ajustado | Sesgo sin → con armonizar | Error mediano | r |
|---|---|---|---|---|
| Boreal (lat > 50: Canadá, Alaska) | **2.27** | −58.6% → +6.9% | 12.6% | 0.992 |
| EE. UU. y México (14–50) | 2.66 | −63.3% → −1.1% | 7.3% | 0.993 |
| Sudamérica (< 14) | 2.66 | −60.8% → +7.3% | 6.0% | 0.996 |

El factor boreal es distinto (fuegos de copa grandes y episódicos), pero los factores por región H3 res 3 lo capturan.
El error mes a mes es mayor en el boreal porque sus temporadas son cortas e irregulares.

**Para Cloud Run:** el pico local fue 1.85 GB y en Cloud Run `/tmp` vive en la RAM (+~150 MB de datos). Sugerencia: **`--memory 4Gi`**
(2Gi queda justo). Zips armados en la máquina de Carlos, **no publicados**.

Pendiente: Groenlandia y el Atlántico norte al este de −50 no tienen datos de 2026 (casi no hay fuegos ahí).

## 4. Resultados y notas de Europa (Evaristo)

**Fecha:** 2026-11-15 · rama `datos/europa` (creada desde `datos/sudamerica`, sin cambios de código) · nada en `main`, nada publicado.

### Corrida
| Paso | Resultado | Tiempo |
|---|---|---|
| 00b 2026, `BBOX=-25,34,45,72` → `datos_2026/api/zona_europa/` | 254 bloques, 103 MB, sin errores. NOAA-20 y NOAA-21 con los 319 días (01-ene → 15-nov) | ~45 min |
| 01 `--years 2026` | 5.77 M filas en el bronze de 2026 (Sudamérica + Europa) | 13 s |
| 03 `--region europa` | 9.66 M focos limpios (2000–2025) + 0.84 M (2026). Máscara de estáticas: la global que ya existía | 30 s |
| 04 | 1,405,928 filas · 37,213 hexágonos r5 | 5 s |
| 05 | factores e IC en `models/region=europa/` | ~20 s |
| 06 | 4,353,915 filas · 190,018 hexágonos r6 · 2000-11-01 → 2026-11-15 | 12 s |
| 07 `--zip` | `ignis-backend-europa.zip` **29.9 MB** · `ignis-hotspots-europa.zip` 142.9 MB (en `gold/entrega_europa/`, sin publicar) | ~1 min |

Argentina + Chile no se tocó: `models/factores.parquet`, `gold/entrega/` y `gold/region=argentina_chile/` conservan sus fechas anteriores.

### Revisiones de la sección 2c
| Revisión | Europa | Referencia |
|---|---|---|
| **Validación MODIS → NOAA-20** (días-celda, 2023–2026) | sesgo −62.6% → **−2.0%** · error mediano **11.5%** · r **0.993** | AR+CL +1.9% / 8.7% / 0.995 · Sudamérica +7.3% / 5.9% / 0.996 |
| Validación MODIS → NOAA-20 (FRP) | sesgo +37.6% → **+0.6%** · error mediano 17.6% · r 0.994 | — |
| Validación S-NPP → NOAA-20 (días-celda) | sesgo −6.6% → −2.7% · error mediano 3.9% · r 0.978 | — |
| **Cobertura de la banda** (`ic95_factor`) | **89.4%** días-celda · 83.0% FRP · 97.4% S-NPP | ~95% en AR+CL y Sudamérica |
| **Deriva del factor** NOAA-20 / MODIS por año | 2.52–2.83, sin tendencia (2018 2.59 · 2022 2.83 · 2024 2.80 · 2026 2.69) | estable salvo 2023–2025 |
| Deriva S-NPP | 0.98 (2018) → 1.13 (2022) → **1.24 (2026)**: S-NPP se degrada, como en las otras regiones. No afecta: desde 2018-04 se usa NOAA-20 | — |
| **Fuentes estáticas** | ver abajo: **737 celdas r8 persistentes, 1.68% de los días-celda** | AR+CL: 100 celdas, 0.16% |
| **Tamaño y memoria** | zip 29.9 MB · `monthly` 2.65 M filas · backend: 438 MB cargado, **570 MB de pico** consultando toda la región | AR+CL 24 MB / ~340 MB · Sudamérica 104 MB / ~1.3 GB |

Factores globales: `k_modis` = 2.61 [2.54–2.83] · `k_snpp` = 1.02 [0.99–1.08] · `f_terra` = 2.02 [1.98–2.05].
Terra/Aqua ≈ 0.83 (AR+CL ≈ 0.62): en latitudes altas las pasadas de los dos se solapan más. Cae a 0.66 en 2025, igual que en todos lados.

Serie armonizada por año (miles de días-celda, banda 95%): 2003 274 [207–405] · 2007 421 [321–618] · 2011 307 [231–446] ·
2013 207 [163–271] · 2017 286 [227–384] · 2019 279 · 2020 246 · 2024 201 · 2025 176 · 2026 185 (hasta el 15-nov).
El backend con un polígono de toda la región da 2019 = 279,129: coincide.

### Hallazgos para discutir
1. **La bajada de 2011 (307 k) a 2013 (207 k) es real, no un salto entre satélites.** Llevando MODIS y S-NPP a NOAA-20 en los
   años en que coinciden dan casi lo mismo: 2013 205 k vs 207 k · 2014 351 vs 364 · 2015 340 vs 343 · 2016 236 vs 237. El empalme está bien.
2. **Fuentes industriales que la limpieza deja pasar (afecta al 03, de Carlos).** 737 celdas r8 tienen fuego en ≥ 60 meses distintos:
   1.68% de los días-celda de Europa, 10× más que en AR+CL. Las más persistentes son plantas industriales, no incendios:
   Avilés, España (43.54, −5.83; 173 meses), Gante, Bélgica (51.17, 3.80; 147), Turín y Brescia, Italia (45.11, 7.72 y 45.37, 10.34),
   Alchevsk, Ucrania (48.47, 38.77; 137). La máscara actual pide `type` 1–3 en ≥ 3 años, y FIRMS no marca estas como `type` 2.
   **Propuesta:** en el 03, agregar a la máscara las celdas r8 con fuego en ≥ N meses distintos repartidos en ≥ 10 años (p. ej. N = 60).
   El efecto en totales es chico (~2%), pero en el mapa aparecen como "fuego todo el año" y ensucian las anomalías de invierno.
3. **La banda cubre 89%, no 95%.** Es más angosta de lo que debería para Europa. Con 5 años de ajuste el remuestreo por año es grueso.
   Para decirlo bien ante los jueces: "contiene el valor real en el 89% de los meses en Europa (95.7% en AR+CL)". Mejora posible: un
   intervalo de predicción calibrado por región (la que propone Carlos en `HALLAZGOS_QA.md`).
4. **El recuadro de `europa` no es solo Europa.** El rectángulo (−25, 34, 45, 72) trae focos de 62 países, incluidos Irak (287 k), Argelia (226 k),
   Siria (200 k), Túnez, Marruecos, Líbano e Israel. Deja fuera Rusia al este de 45° E, Canarias, Svalbard y parte de las Azores.
   Para el modelo no importa (factores por h3_r3), pero en el mapa "Europa" incluye el norte de África y Oriente Medio.
   ¿Lo dejamos, recortamos por países (la columna `country`) o ajustamos el recuadro? `config.py` es tuyo según la regla.
5. **S-NPP en 2026 en Europa llega solo al 22-oct** (en Sudamérica, al 2-nov) y le faltan ~19 días. No afecta al producto (NOAA-20 desde 2018-04).
6. **Memoria para la corrida conjunta:** Europa sola son ~570 MB de pico. Sumando América (~1.3 GB por Sudamérica + Norte), la entrega
   conjunta va a necesitar Cloud Run con `--memory 4Gi` o más.

## 5. África (Evaristo) — región agregada por Carlos en `d1690d8`

Mientras se arma el MVP de América, Evaristo adelanta África en su propia rama (`datos/africa`, creada desde esta). No toca `main` ni publica nada.

**Lo que ya está corriendo (no necesita `config.py`):** 2026 de África con su propia MAP_KEY, en su carpeta y **sin solaparse con Europa**:
```bash
BBOX="-26,-36,63,34" OUT="<FIRE_DATA_DIR>/datos_2026/api/zona_africa" bash pipeline/scripts/00b_descargar_2026.sh
```
El techo de 34° N es a propósito: `zona_europa` (−25, 34, 45, 72) ya cubre la costa de Marruecos, Argelia y Túnez.

**Lo que necesita de Carlos:** agregar la región en `config.py`, que es tuyo según la regla de la sección 2. Propuesta:
```python
    # África (Evaristo): Cabo Verde y Senegal hasta Seychelles y Mauricio; de Ciudad del Cabo a Bizerta (Túnez).
    # 2026 se bajó como zona_africa (-26, -36, 63, 34) + la franja 34-37.6 N que ya trae zona_europa.
    "africa": (-26.0, -36.0, 63.0, 37.6),
```
Como `europa`, el rectángulo no sigue fronteras: incluye la península arábiga y parte de Oriente Medio, Sicilia, Creta, Chipre y el sur de España.
Para el modelo no importa (factores por h3_r3); en el mapa, sí. Para 2026 queda un hueco al este de 45° E y al norte de 34° N
(Irán y Turkmenistán): no es África y no tiene datos de 2026.

**Ojo con el tamaño:** África es la región con más fuego del planeta (sabanas). Se espera bastante más que América (~100 M focos limpios):
silver de decenas de minutos, y un backend que en local cabe (16 GB) pero que en Cloud Run pediría `--memory 8Gi` o más.

Cuando agregues la línea (en esta rama o en `main`), Evaristo corre `03 → 07 --region africa` y anota los resultados en una sección 6.

## 6. Resultados de África (Evaristo)

_En curso en la máquina de Evaristo (rama local `datos/africa`): 2026 descargado completo; silver de ~19–20 M focos limpios por año.
Resultados aquí cuando termine 03 → 07._

**Para Carlos, sobre `00b_descargar_2026.sh`:** con África la MAP_KEY llegó a su límite (5000 transacciones cada 10 min; una petición de
una zona con mucho fuego cuenta como decenas). Dos fallos del script:
1. Cuando FIRMS responde `Exceeding allowed transaction limit` (HTTP 400), el bloque se anota como **"sin datos"** y el script sigue, así que
   la descarga parece completa sin estarlo. En África faltaron NOAA-21 y S-NPP enteros.
2. Con la clave saturada, la consulta inicial de `data_availability` falla y el script sale con "ERROR: FIRMS no informó hasta dónde llega…".

**Propuesta:** antes de cada petición, leer el uso de la clave en
`https://firms.modaps.eosdis.nasa.gov/mapserver/mapkey_status/?MAP_KEY=<clave>` (`current_transactions`). Si pasa de ~4500, esperar.
Y si llega un `Exceeding…`, esperar 10 min y repetir el mismo bloque en vez de anotarlo vacío.
Mientras tanto, Evaristo usa un envoltorio que hace eso por fuera: un satélite por vez, esperando a que la clave baje de 300.

## 7. Propuesta: Asia y Oceanía, para tener el mundo completo — **Carlos reparte**

**Fecha:** 2026-11-15 · **De:** Evaristo · **Para:** Carlos. Decide tú el reparto en tu siguiente mensaje (aquí o en `MVP_AMERICA.md`).
**Prioridad:** sin frenar el MVP de América. Esto va en paralelo.

### Reparto sugerido
| Quién | Qué | Por qué |
|---|---|---|
| **Carlos** | **Asia** | Es lo más grande que falta (Siberia, India, Sudeste Asiático) y tu máquina está libre. La de Evaristo está ocupada con África (~10 GB de RAM en el silver) |
| **Evaristo** | **Oceanía** | Más chica. **La descarga de 2026 ya está corriendo** (zonas `oceania` y `pacifico`, abajo); la cadena va cuando termine África |

### Zonas de descarga de 2026 (no se solapan con ninguna ya bajada)
Ya bajadas: `sudamerica` (−85, −57, −32, 14) · `zona_norte` (−170, 14, −50, 72) · `zona_centro` (−95, 5, −85, 14) · `zona_europa` (−25, 34, 45, 72) · `zona_africa` (−26, −36, 63, 34).

| Zona | bbox (O, S, E, N) | Cubre | Quién |
|---|---|---|---|
| `zona_asia_norte` | 45, 34, 180, 82 | Rusia al este de 45° E, Asia central, China, Corea, Japón, norte de Irán | Carlos |
| `zona_asia_sur` | 63, −11, 180, 34 | India, Sudeste Asiático, Indonesia, Filipinas, Papúa Nueva Guinea, Micronesia | Carlos |
| `zona_oceania` | 110, −50, 180, −11 | Australia, Nueva Zelanda, Nueva Caledonia, Vanuatu, Fiyi (parte oeste) | Evaristo ✅ en curso |
| `zona_pacifico` | −180, −50, −120, 14 | Tonga, Samoa, Fiyi (parte este), Polinesia | Evaristo ✅ en curso |

```bash
BBOX="45,34,180,82"  OUT="<FIRE_DATA_DIR>/datos_2026/api/zona_asia_norte" bash pipeline/scripts/00b_descargar_2026.sh
BBOX="63,-11,180,34" OUT="<FIRE_DATA_DIR>/datos_2026/api/zona_asia_sur"   bash pipeline/scripts/00b_descargar_2026.sh
```
Ojo con el límite de la clave (sección 6). Asia va a chocar con él como África: conviene un satélite por vez (`SOURCES=VIIRS_NOAA20`, etc.).
Huecos que quedan: Svalbard y el Ártico ruso al oeste de 45° E (al norte de 72° N), y el Índico entre 63° y 110° E al sur del ecuador. Casi sin fuegos.

### Regiones para `config.py` (tuyo)
```python
    # Asia (Carlos): de 45° E al Pacífico; incluye Indonesia y Papúa Nueva Guinea.
    "asia": (45.0, -11.0, 180.0, 82.0),
    # Oceanía (Evaristo): Australia, Nueva Zelanda y el Pacífico oeste. Las islas al este de 180° (Tonga, Samoa, Polinesia)
    # no caben en un rectángulo que no cruza el antimeridiano: van en la región aparte "pacifico".
    "oceania": (110.0, -50.0, 180.0, -11.0),
    "pacifico": (-180.0, -50.0, -120.0, 14.0),
```
`pacifico` es opcional: tiene muy poco fuego. Puede quedar como limitación declarada.

### La entrega final: una sola corrida `global`
Juntar las entregas por continente tiene un problema: **los recuadros se solapan** (`europa` incluye el norte de África y `africa` el sur
de Europa, Sicilia y Creta; `asia` y `europa` comparten Turquía y el Cáucaso). Esos hexágonos saldrían dos veces y con factores distintos.
Propuesta:
1. **Cada uno valida su continente** con su región (cifras por continente para los jueces, como Europa, América y África).
2. Con todas las zonas de 2026 en `datos_2026/api/`, **la entrega final sale de una sola corrida `--region global`** en la máquina de
   Carlos. Los factores ya son por H3 res 3 × mes, así que no se pierde precisión regional, y no hay duplicados.
3. Costo esperado: el silver global va a tardar horas (África sola tarda ~11 min por año en la máquina de Evaristo), la calibración de `05`
   en pandas puede rondar los 8–10 GB de RAM, y el backend global ~3–5 GB (Cloud Run con `--memory 8Gi`).
   Vale la pena medir la RAM del `05` con África antes de intentar `global`: Evaristo lo anota en la sección 6.
