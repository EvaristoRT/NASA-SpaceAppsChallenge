# Contexto para Carlos — estado del pipeline y reparto entre dos

**Fecha:** 2026-11-15 · **De:** Evaristo · **Para:** Carlos
**Por qué existe este archivo:** Paco ya no está en el equipo de datos. Aquí está lo que pasó mientras no estabas, cómo queda todo
y una propuesta para repartir lo que falta entre los dos. Cuando estemos de acuerdo, se actualiza "Quién hace qué" en
[PLAN_EQUIPO.md](PLAN_EQUIPO.md) (ese archivo no se cambia sin avisar).

---

## 1. Resumen en 30 segundos

- **El pipeline completo funciona de punta a punta** para `argentina_chile`, con datos reales del 2000-11-01 al 2026-11-14.
- **Tus intervalos de confianza ya están en `main`.** Los hice en una rama y los pasé con acuerdo del equipo. Tu nivel 1 no cambió.
- **Paco hizo el 07** (opción B del plan de integración) y yo le corregí tres cosas.
- **Manuel ya conectó el backend y el panel del front** con nuestra entrega. Lo validó: 2019 = 307,757 días-celda, idéntico al nuestro.
- **Demo a la 1:00 PM:** Manuel corre el backend en local. Todavía no está desplegado en internet.
- **Encontré un hueco en los datos de 2026** (sección 4): no bloquea la demo, pero hay que bajarlo con tu MAP_KEY.

---

## 2. Qué cambió desde que te fuiste

| Commit | Quién | Qué |
|---|---|---|
| `49f63da` → `18e875c` | Evaristo | **IC 95% por bootstrap en tu `05_model.py`** y su uso en el 06 |
| `b66fdeb` | Evaristo | ESTADO de tu 05 actualizado a "nivel 1 + IC 95% por bootstrap, validado con datos reales" |
| `cf32e33` | Paco | **Paso 07**: `harmonized` con anomalía, `hotspots/`, LEEME y el formato del backend (`cells`, `monthly`, `months`, `info.json`) |
| `785e53b` | Evaristo | Arreglos al 07 (ver abajo) |
| `d688866`, `5f2ac1c` | Manuel | El backend sirve la entrega y el panel del front llama a `/api/search` |

### El bootstrap que agregué a tu 05 (revísalo cuando puedas)
- Función nueva `bootstrap()`: 200 réplicas, peso Poisson(1) **por hexágono r5 y por año**, misma fórmula que tu `fit()`.
- `factores.parquet` gana `factor_lo`, `factor_hi`, `factor_global_lo`, `factor_global_hi`. El `factor` central es idéntico.
- `metrics.json` gana `ic95_factores_globales`, `bootstrap` y, en cada validación, `ic95_factor` con la cobertura.
- Opción `--n-boot` (200 por defecto; con 0 no calcula IC). `--fake` sigue funcionando.
- **Cobertura en la prueba 2023–2026:** MODIS días-celda 95.7%, S-NPP 94.9%. Remuestreando solo hexágonos salía 83%: lo que más varía es el año.
- `k_modis` = 2.32 [2.24–2.42] · `k_snpp` = 1.01 [0.99–1.02] · `f_terra` = 2.77 [2.69–2.91].

### Arreglos al 07 de Paco
1. `median_same_month` por hexágono ignoraba los años sin fuego. Ahora cuentan como 0, y por eso `anomaly_pct` viene vacía en ~78% de las filas (mediana 0).
2. Sobraba una columna `region` en `harmonized.parquet`.
3. Mes incompleto: `months.parquet` trae `is_partial`, `days_observed` y `days_in_month`; `info.json` trae `last_complete_month` y `partial_month`.

Todo está documentado en [HALLAZGOS_QA.md](HALLAZGOS_QA.md).

---

## 3. Estado de cada paso

| Paso | Estado | Dueño hasta hoy |
|---|---|---|
| 00 / 00b descarga | ✅ (2026 hasta el 14-nov, con un hueco: sección 4) | Carlos |
| 01 bronze | ✅ 553 M focos, 2000–2026 | Evaristo |
| 02 QA | ✅ | Carlos |
| 03 silver | ✅ 14.6 M focos limpios | Paco → **sin dueño** |
| 04 calibración | ✅ | Evaristo |
| 05 modelo + IC | ✅ | Carlos |
| 06 gold | ✅ con IC | Evaristo |
| 07 entrega | ✅ | Paco → **sin dueño** |
| Integración con el backend | ✅ en local, ⏳ despliegue | Manuel |

---

## 4. Hallazgo nuevo: faltan 3 días de VIIRS en agosto de 2026

En bronze, **NOAA-20 no tiene ningún foco del 2026-08-01 al 2026-08-03**. Lo mismo pasa con S-NPP y NOAA-21. MODIS sí tiene esos días.
Es el empalme entre los bloques archive (`SP`, el último cubre hasta el 31-jul) y los NRT (el primero empieza el 04-ago).

- **Efecto:** agosto de 2026 queda ~10% bajo en la serie armonizada. Agosto es el mes pico de la región.
- **Arreglo:** bajar esos 3 días con `00b_descargar_2026.sh` (necesita tu MAP_KEY) y correr de nuevo 01 `--years 2026` → 03 → 04 → 05 → 06 → 07.
- **Cuándo:** después de la demo de la 1:00 PM, junto con el refresco final del NRT. Si no, Manuel tendría que recargar la entrega justo antes de presentar.

---

## 5. Preguntas de Manuel y respuesta propuesta

Manuel nos escribió a los dos. **No le he contestado:** te paso lo que encontré para que respondamos juntos.

| Pregunta | Lo que encontré / propuesta |
|---|---|
| **Octubre 2026 sale en 0.24× la mediana. ¿Es real o es por los datos NRT?** | **Parece real.** Octubre de 2026 tiene los 31 días. Los cinco satélites, que son independientes, lo ven igual de bajo (NOAA-20 15 k focos, S-NPP 16 k, NOAA-21 15 k; en 2019–2024 NOAA-20 tenía 53–158 k). La limpieza quita el mismo porcentaje que otros años (86%), y 2025 ya venía bajo (40 k). NRT y archive suelen diferir unos pocos %, no 4×. Propuesta: decirle que es real y que en la interfaz solo marque "preliminar (NRT)" |
| ¿Hacemos juntos la prueba de punta a punta? | Él ya la hizo (307,757 = nuestro total). Falta comparar **un polígono chico** (p. ej. una provincia) contra la misma suma hecha desde `monthly.parquet`. 15 min |
| Muestra chica para sus tests (tarea 8) | Él ya generó la suya en `backend/tests/test_delivery.py`. Propuesta: no hace falta otra, salvo que la pida |
| Columnas de `hotspots/` que no deba exponer | Todo es dato público de FIRMS. Ninguna es sensible. Se pueden quitar `sensor` (repite `satellite`) y `type` (todos los archive son 0 tras la limpieza y los NRT vienen vacíos) si quiere un CSV más limpio |
| ¿Mapa por hexágono además del calendario? | Decisión de producto, no nuestra. Si lo quieren: colorear por `harmonized_count`, no por `anomaly_pct` |
| Despliegue del backend | Nadie tiene servidor. Opciones: Render (gratis, 512 MB; hay que quitar la columna `src` de `monthly` para que quepa) o Hugging Face Spaces (16 GB). Datos por GitHub Release. **Después de la demo** |
| ¿Se puede borrar la rama `feat/bootstrap-ci`? | Sí, ya está en `main` |

---

## 6. Propuesta de reparto entre los dos

Criterio: cada quien se queda con los pasos que ya conoce. Las tareas que necesitan tu MAP_KEY o tu modelo son tuyas; las de la entrega y la integración, mías.

### Carlos: datos de entrada, limpieza y modelo
| # | Tarea | Prioridad | Cuándo |
|---|---|---|---|
| C1 | Revisar el bootstrap que agregué a tu 05 (sección 2) | Alta | Hoy, antes de la demo si puedes |
| C2 | Bajar los 3 días faltantes de agosto (sección 4) | Media | Después de la demo |
| C3 | Refrescar el NRT de 2026 para la entrega final (`00b`) | Media | Antes de la entrega final |
| C4 | **Quedarte con el paso 03 (silver)** que era de Paco: máscara de estáticas y región | Media | Desde ya, como dueño |
| C5 | Material para los jueces: gráficas de validación (`models/figs/`), cobertura del IC y la limitación de antes de 2012 en una sola lámina | Alta | Antes de la demo |
| C6 | Mejora opcional: quantile mapping (nivel 2), solo si gana en 2023–2026 | Baja | Si sobra tiempo |

### Evaristo: entrega, integración y despliegue
| # | Tarea | Prioridad | Cuándo |
|---|---|---|---|
| E1 | **Quedarme con el paso 07 (entrega)** que era de Paco | Media | Desde ya, como dueño |
| E2 | Contestarle a Manuel con lo que acordemos de la sección 5 | Alta | Hoy |
| E3 | Prueba con un polígono chico, junto con Manuel | Alta | Antes de la demo |
| E4 | Correr la cadena 01 → 07 cuando tú bajes los datos (C2, C3) y pasarle la entrega nueva a Manuel | Media | Después de C2/C3 |
| E5 | Despliegue: quitar `src` de `monthly`, publicar la entrega como GitHub Release y apoyar a Manuel con Render o HF Spaces | Media | Después de la demo |
| E6 | Borrar la rama `feat/bootstrap-ci` | Baja | Cuando confirmes C1 |
| E7 | Región `sudamerica` (03 → 07 con `--region sudamerica`, ~15 min) | Baja | Si sobra tiempo |

### Reglas para no pisarnos
- **Una sola máquina genera la entrega final** (la de Evaristo, que ya tiene todo). Tú le pasas los CSV nuevos de 2026.
- Si tocas el 05, avísame para volver a correr el 06 y el 07.
- `config.py` y `PLAN_EQUIPO.md` siguen sin cambiarse sin avisar al otro.

---

## 7. Datos útiles

- Entrega actual: `C:\NASA\gold\entrega` en la máquina de Evaristo (~260 MB; lo mínimo para el backend son ~30 MB).
- Totales de referencia (`argentina_chile`, días-celda armonizados): 2005 = 368 k [291–493] · 2015 = 218 k [181–271] · 2019 = 307,757 · 2020 = 534 k (año pico).
- Validación MODIS → NOAA-20 en 2023–2026: sesgo −56% → +1.9%, error mediano 8.7%, r = 0.995.
