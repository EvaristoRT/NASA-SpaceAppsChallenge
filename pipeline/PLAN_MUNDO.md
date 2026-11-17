# Plan de acción: llevar IgnisSync al mundo entero

**Proyecto:** IgnisSync — armonización MODIS / VIIRS (NASA Space Apps 2026, ya terminado; ahora es un proyecto personal, a ritmo de hobby).
**Repo:** https://github.com/EvaristoRT/NASA-SpaceAppsChallenge (se sigue trabajando en el original; Carlos tiene permiso de escritura).
**Fecha del plan:** 2026-11-16 · **Autor:** Carlos

> **Si eres un asistente de IA leyendo esto en otra sesión:** lee también `AGENTS.md`, `pipeline/PLAN_EQUIPO.md`,
> `pipeline/REGIONES.md` y `pipeline/README.md` del repo. Este plan manda sobre ellos en lo que toque al mundo entero.
> Avanza **una fase a la vez**, confirma con el usuario antes de empezar cada una y nunca trabajes en `main`.
> Al terminar una fase, marca sus casillas aquí y anota cifras reales (tiempo, memoria, tamaños) en la sección 9.

---

## 1. Objetivo

1. Procesar y validar **todo el planeta** (hoy: América, Europa y África).
2. Generar **una sola entrega global** que la web pueda servir.
3. Correr la web con el mundo entero **en local** (y, si alcanza, en **GitHub Codespaces**).
4. Todo en la rama **`datos/mundo`**, sin tocar `main` hasta que funcione y esté validado.

## 2. ¿Se puede correr el mundo en local? Sí, con dos condiciones

| Pieza | Lo que se sabe (medido) | Mundo (estimado) | ¿Cabe en la laptop (20 GB RAM, 8 núcleos)? |
|---|---|---|---|
| Backend sirviendo la entrega | América: 0.8 GB en reposo, 1.9 GB de pico | ~3 GB en reposo, 4–5 GB de pico (estimación de Evaristo) | **Sí**, sobrado |
| Front | No depende del tamaño de los datos | — | **Sí** |
| **Pipeline, paso 03 (silver)** | África: 11 GB de pico **por un solo año** (máquina de Evaristo) | Un año global > África sola | **Solo si DuckDB puede usar disco** cuando se le acaba la memoria (fase 4) |
| **Pipeline, paso 05 (modelo, pandas)** | África: 3 GB · tabla de calibración: América 6.9 M filas, África 7.7 M | ~25–30 M filas | **Justo:** hay que reducirle la memoria o ajustarlo por continente (fase 4) |

**Condición 1:** limitar la memoria de DuckDB y darle una carpeta temporal en disco (hoy no lo hace: usa toda la que encuentra).
**Condición 2:** que el paso 05 no cargue la tabla global entera en pandas.

**Codespaces:** la máquina gratis de 2 núcleos trae **8 GB**: el mundo (4–5 GB de pico) entra pero justo. La de 4 núcleos trae 16 GB y
sobra, pero gasta el doble de horas (120 horas-núcleo al mes = 30 h en vez de 60 h). Codespaces sirve para **mostrar** la web; el
**pipeline** se corre en la laptop.

## 3. Estado de partida (2026-11-16)

- `main` al día. El pipeline (pasos 00 a 07) ya trabaja **por región** (`--region`): cada región escribe en su carpeta
  (`models/region=<r>/`, `gold/region=<r>/`, `gold/entrega_<r>/`).
- Regiones en `pipeline/config.py`: `argentina_chile`, `sudamerica`, `america`, `europa`, `africa`, `global`.
- Datos en `C:\Hacka\NASA` (`FIRE_DATA_DIR`):
  - `arch_Comprimidos\` — **48 zips** de FIRMS 2000–2025, todo el mundo, comprobados (CRC sin errores). **Intocable.**
  - `bronze\` — 553 M de focos 2000–2026, todo el mundo.
  - `datos_2026\api\` — 2026 por la API: Sudamérica (raíz), `zona_norte`, `zona_centro`, `zona_europa`, `zona_africa`.
  - `models\region=…` de AR+CL, Sudamérica, América, Europa y África.
- **Validaciones hechas** (MODIS → NOAA-20, prueba 2023–2026): AR+CL +1.9 %, Sudamérica +7.3 %, América +5.4 %, Europa −2.0 %,
  África −8.0 % de sesgo.
- **Falta 2026 de:** Asia, Oceanía, islas del Pacífico, y huecos chicos (Galápagos, este de Groenlandia, Svalbard y Ártico ruso al
  oeste de 45° E, Índico sur entre 63° y 110° E).
- **Bug conocido:** `00b_descargar_2026.sh` no sabe esperar cuando la clave de FIRMS llega a su límite (ver fase 1).
- **Sin resolver:** quedan fuentes industriales que FIRMS no marca (0.4 % de días-celda en América, 1.7 % en Europa).

## 4. Reglas de trabajo

- **Rama `datos/mundo`** para todo. `main` solo recibe un Pull Request al final (fase 9), cuando la entrega global esté validada.
- **Nada se borra** en `C:\Hacka\NASA` sin pedirlo explícitamente; `arch_Comprimidos\` nunca.
- **Una fase por sesión** (o varias sesiones por fase). Cada fase deja todo funcionando aunque se pare ahí.
- **Corridas largas de noche o en segundo plano**, con logs en `datos_2026\logs\`. Todos los pasos son reanudables (saltan lo ya hecho).
- **Commits sin firma de IA** (sin `Co-Authored-By`), en inglés, con el formato de `.gitmessage`.
- La clave de FIRMS vive en `C:\Hacka\NASA\scripts\.firms_map_key` (git la ignora). Nunca en el repo.

---

## 5. Fases

### Fase 0 — Preparar la rama (30 min)
- [x] `git pull` en `main` y `git checkout -b datos/mundo`.
- [x] Copiar este plan al repo como `pipeline/PLAN_MUNDO.md` y hacer el primer commit en la rama.
- [x] Borrar la rama local vieja `datos/sudamerica` (ya está fusionada): `git branch -d datos/sudamerica`.
- [x] Comprobar espacio: hacen falta **~60 GB libres** (silver y gold globales). Hay 352 GB libres (2026-11-16).

### Fase 1 — Descargador que respete el límite de la clave (1–2 h)
Problema: con mucho fuego, una petición gasta decenas de transacciones; la clave permite **5000 cada 10 minutos**. Al pasarse, FIRMS
responde `Exceeding allowed transaction limit` (HTTP 400) y el script lo anota como **"sin datos"**, así que la descarga **parece**
completa sin estarlo. En África faltaron NOAA-21 y S-NPP enteros.
- [ ] Antes de cada petición, leer `https://firms.modaps.eosdis.nasa.gov/mapserver/mapkey_status/?MAP_KEY=<clave>`
      (`current_transactions`); si pasa de ~4500, esperar hasta que baje.
- [ ] Si llega `Exceeding…`: esperar 10 minutos y **repetir el mismo bloque**, nunca anotarlo vacío.
- [ ] Si falla la consulta inicial de `data_availability`, reintentar con espera en vez de salir.
- [ ] Al final, separar en el resumen "sin fuego ese día" de "falló la descarga", y salir con error si hubo fallos.
- [ ] Probar con una zona chica (por ejemplo, Nueva Zelanda, una semana) y un caso forzado de límite.

### Fase 2 — Regiones y zonas de descarga nuevas (30 min)
Zonas de 2026 que **no se solapan** con las ya bajadas (propuesta de Evaristo en `pipeline/REGIONES.md` §7):

| Zona | bbox (O, S, E, N) | Cubre |
|---|---|---|
| `zona_asia_norte` | 45, 34, 180, 82 | Rusia al este de 45° E, Asia central, China, Corea, Japón, norte de Irán |
| `zona_asia_sur` | 63, −11, 180, 34 | India, Sudeste Asiático, Indonesia, Filipinas, Papúa Nueva Guinea |
| `zona_oceania` | 110, −50, 180, −11 | Australia, Nueva Zelanda, Nueva Caledonia, Vanuatu, oeste de Fiyi |
| `zona_pacifico` | −180, −50, −120, 14 | Tonga, Samoa, este de Fiyi, Polinesia (cruza la línea de cambio de fecha) |
| `zona_huecos` (opcional) | varias chicas | Galápagos, Svalbard / Ártico ruso, este de Groenlandia |

- [ ] Agregar a `config.py` las regiones `asia` (45, −11, 180, 82), `oceania` (110, −50, 180, −11) y `pacifico` (−180, −50, −120, 14).
- [ ] Documentar las zonas en el docstring de `00b`.

### Fase 3 — Bajar 2026 del resto del mundo (varias noches, casi sin intervención)
- [ ] Asia norte y Asia sur: **un satélite a la vez** (`SOURCES=VIIRS_NOAA20`, luego `VIIRS_NOAA21`, `VIIRS_SNPP`, `MODIS`).
- [ ] Oceanía y Pacífico.
- [ ] (Opcional) zonas de huecos.
- [ ] Comprobar en cada zona que NOAA-20 tenga los días de 2026 hasta la fecha de corte (en Europa: 319 días, 1-ene → 15-nov).
- [ ] Respaldar cada zona nueva en Drive (los datos NRT de 2026 **no se pueden volver a bajar iguales**).

### Fase 4 — Hacer que el cómputo global quepa en memoria (2–4 h de código + pruebas)
- [ ] En `config.py`: límite de memoria y carpeta temporal para DuckDB, por ejemplo `DUCKDB_MEMORY_LIMIT = "12GB"`,
      `DUCKDB_TEMP_DIR = <FIRE_DATA_DIR>/tmp_duckdb`, `DUCKDB_THREADS = 6`. Aplicarlos en el `init_duckdb()` de 03, 04, 06 y 07
      (`SET memory_limit`, `SET temp_directory`, `SET threads`). Con eso DuckDB usa disco cuando se queda sin memoria, en vez de fallar.
- [ ] **Prueba de humo:** `03_silver.py --region global --years 2019` (un año pesado). Anotar tiempo y pico de memoria (sección 9).
- [ ] **Paso 05 (pandas):** elegir una de dos y anotar por qué:
  - **A. Ajustar por continente y unir los factores.** Los factores ya son por región H3 res 3 × mes, así que se pierde poco; solo
    cambia el factor global hacia el que se "encogen" las regiones con pocos datos (sería el del continente, que incluso es más fiel).
    Hay que asignar cada región H3 res 3 a **un solo** continente donde los rectángulos se solapan.
  - **B. Reducir la memoria del 05 global:** leer con DuckDB solo las columnas y los años que usa (ajuste 2018–2022, Terra 2003–2010,
    prueba 2023–2026), en `float32`, y hacer la agregación del bootstrap en SQL.
- [ ] Prueba: el 05 corre sobre la tabla global (o los continentes) sin pasar de ~14 GB.

### Fase 5 — Validar Asia y Oceanía por separado (una o dos noches)
- [ ] `03 → 04 → 05 --region asia` y `--region oceania`.
- [ ] Anotar la validación (sesgo, error mediano, correlación, cobertura de la banda) y la deriva del factor, como las otras regiones.
- [ ] Revisar los regímenes de fuego nuevos: quemas agrícolas del norte de la India, turberas de Indonesia, taiga de Siberia, sabana
      del norte de Australia.
- [ ] Revisar fuentes industriales persistentes (mecheros del golfo Pérsico y Siberia occidental): % de días-celda en celdas con fuego en
      ≥ 60 meses. Si pasa de ~1 %, considerar la mejora de la máscara (fase 10).

### Fase 6 — Corrida global (uno o dos fines de semana de cómputo)
- [ ] `01_to_parquet.py --years 2026` (junta todas las zonas de `datos_2026\api\` en el bronze de 2026).
- [ ] `03_silver.py --region global` — año por año, reanudable. Lo más largo.
- [ ] `04_calibration_set.py --region global`
- [ ] `05_model.py --region global` (o la variante por continente de la fase 4)
- [ ] `06_apply_gold.py --region global`
- [ ] `07_export.py --region global --zip`
- [ ] **Controles:**
  - Totales por continente desde la entrega global contra los de cada corrida regional: deben parecerse (no ser idénticos, porque cambia
    el factor global de encogimiento).
  - 2019 en Argentina + Chile debe seguir dando ~307,757 días-celda.
  - Sin hexágonos duplicados (cada `h3_index` una sola vez por día).

### Fase 7 — La web con el mundo, en local (1–2 h)
- [ ] Backend con `DATA_DIR=C:\Hacka\NASA\gold\entrega_global`; medir memoria en reposo y en una consulta de todo un continente.
- [ ] Probar en la app: India, Indonesia, Australia, Rusia, China, Kazajistán, Nueva Zelanda, un polígono dibujado en el Sahel.
- [ ] Revisar que el front no tenga nada fijo a América (zoom inicial, textos "the Americas", listas de países).
- [ ] Probar el CSV de focos con un área grande (límite de meses y de filas).

### Fase 8 — El mundo en Codespaces (1 h)
- [ ] Publicar `ignis-backend-global.zip` como **pre-release** (no tocar el *latest* del sitio).
- [ ] El zip de focos global seguramente pasa el **límite de 2 GB por archivo** de GitHub: partirlo por años en el paso 07, o no
      publicarlo y dejar el CSV de focos solo en local.
- [ ] Codespace de 2 núcleos (8 GB); si el backend no aguanta, el de 4 núcleos (16 GB).
- [ ] Actualizar `/workspaces/arrancar.sh` para usar la entrega global.

### Fase 9 — Documentar y fusionar a `main` (1–2 h)
- [ ] README y README.es: cobertura mundial, tabla de validación con Asia y Oceanía, cifras de memoria.
- [ ] `pipeline/REGIONES.md`: resultados de Asia y Oceanía.
- [ ] Pull Request `datos/mundo` → `main`. Criterios para fusionar: pasos 00–07 corren con `--region global`, controles de la fase 6
      en verde, la app probada en los países de la fase 7, y ninguna región anterior cambió sus resultados.

### Fase 10 — Mantenimiento y mejoras (cuando haya ganas)
- [ ] **Cuando NASA publique los zips anuales de 2026** (`<producto>_2026_all_countries.zip`, normalmente a inicios del año siguiente):
      bajarlos con `00_get_raw.py` y usarlos en vez de los bloques de la API para 2026 (calidad definitiva). A partir de 2027, la API
      solo para el año en curso.
- [ ] Refrescar los meses NRT cuando FIRMS los pase a calidad estándar (~5 meses después).
- [ ] Mejorar la máscara de fuentes industriales (celdas con fuego en ≥ N meses de ≥ 10 años).
- [ ] Probar *quantile mapping* (nivel 2 del modelo) para los meses extremos.
- [ ] Actualización automática semanal del año en curso.

---

## 6. Tiempos esperados (estimaciones, a confirmar en la sección 9)

| Fase | Trabajo tuyo | Cómputo |
|---|---|---|
| 0–2 | 2–3 h | — |
| 3 | 15 min por zona | varias noches (límite de la clave) |
| 4 | 2–4 h | pruebas de 1–2 h |
| 5 | 1 h | 1–2 noches |
| 6 | 1 h de revisión | **muchas horas**: América (~122 M de focos crudos) tardó ~17 min en silver en esta laptop; el mundo son 553 M y con memoria limitada irá más lento |
| 7–9 | 3–5 h | — |

## 7. Riesgos

- **Memoria del 03 y del 05** con el mundo entero → fase 4 antes que nada.
- **Límite de la clave de FIRMS** al bajar Asia → fase 1 antes de la 3.
- **Rectángulos solapados** entre continentes: no afectan la corrida global (una sola región), sí la variante "por continente" del 05.
- **Disco:** silver global puede rondar decenas de GB; la carpeta temporal de DuckDB también crece durante la corrida.
- **Datos NRT de 2026:** no se pueden volver a bajar iguales → respaldarlos en Drive al bajar cada zona.

## 8. Cómo retomar en otra sesión

Pega esto al empezar:

> Estoy retomando IgnisSync. Lee `C:\Hacka\NASA\PLAN_MUNDO.md` (o `pipeline/PLAN_MUNDO.md` en la rama `datos/mundo`) y dime en qué
> fase vamos según las casillas y la sección 9. Trabajamos en la rama `datos/mundo`, nunca en `main`. Sin firma de IA en los commits.

## 9. Bitácora (cifras reales al ir avanzando)

| Fecha | Fase | Qué se hizo | Tiempo | Memoria pico | Notas |
|---|---|---|---|---|---|
| 2026-11-16 | — | Plan escrito | — | — | — |
| 2026-11-16 | 0 | Rama `datos/mundo` creada desde `main` (2c981), plan copiado a `pipeline/PLAN_MUNDO.md`, rama vieja `datos/sudamerica` borrada | 10 min | — | 352 GB libres en C: |
