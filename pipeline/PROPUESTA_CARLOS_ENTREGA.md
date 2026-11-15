# Propuesta de Carlos: encargarse de generar y publicar la entrega

**Fecha:** 2026-11-15 · **De:** Carlos · **Para:** Evaristo (y su asistente de IA)
**Responde a:** la sección 6 de [CONTEXTO_CARLOS.md](CONTEXTO_CARLOS.md) ("Una sola máquina genera la entrega final")

> **Para el asistente de Evaristo:** esto es una **propuesta**, no un cambio ya acordado. No actualices
> `PLAN_EQUIPO.md` ni otros archivos por tu cuenta: pregúntale a Evaristo si la acepta. Si dice que sí, aplica lo de la
> sección 5. Si pide cambios, anótalos al final de este archivo para que Carlos los lea.

---

## 1. Qué propongo

Que **la entrega salga de la máquina de Carlos**: él corre la cadena, arma los zip y publica los releases de GitHub.
Evaristo sigue siendo **dueño del código** de 06 y 07 y del despliegue en Render.

| Tarea | Hoy (propuesta de Evaristo) | Propuesta de Carlos |
|---|---|---|
| Bajar datos de 2026 y refrescar NRT (00b) | Carlos | Carlos |
| Correr la cadena 01 → 07 `--zip` para la entrega | Evaristo | **Carlos** |
| Publicar el GitHub Release de datos | Evaristo | **Carlos** |
| Reiniciar Render para que tome el release nuevo | Evaristo | Evaristo (tiene el acceso) |
| Código de 01, 04, 06 y 07 | Evaristo | Evaristo |
| Código de 00b, 02, 03 y 05 | Carlos | Carlos |
| Contacto de datos con Manuel | Evaristo | **Carlos** |
| Despliegue (Render, Vercel) con Manuel | Evaristo | Evaristo |

**Por qué:** lo que cambia en los datos de aquí a la entrega final sale de la máquina de Carlos (refresco del NRT, arreglos
de 2026). Si la entrega también sale de ahí, los datos no tienen que viajar de una máquina a otra y no circulan dos versiones.

## 2. Por qué es seguro: la máquina de Carlos ya genera la misma entrega

Comprobado el 2026-11-15 contra los valores de referencia de `CONTEXTO_CARLOS.md` §7:

| Año | Referencia de Evaristo | Máquina de Carlos |
|---|---|---|
| 2005 | 368 k [291–493 k] | 367,673 [291,155–492,640] |
| 2015 | 218 k [181–271 k] | 218,325 [181,065–271,475] |
| 2019 | 307,757 | 307,757 |
| 2020 | 534 k | 533,865 |

Factores e IC iguales. El zip `ignis-backend-argentina_chile.zip` sale con los mismos 5 archivos y las mismas columnas que el
del release `datos-2026-11-14` (sin `src` en `monthly.parquet`; 07 corrido con tu commit `433ac`).

## 3. Lo que ya está listo (en la máquina de Carlos, sin publicar)

Entrega con el **hueco de 2026 arreglado** (ver la última entrada de `HALLAZGOS_QA.md`):

- `gold/paquetes/ignis-backend-argentina_chile.zip` (24.2 MB) · `ignis-hotspots-argentina_chile.zip` (183.1 MB)
- Corte `2026-11-15` · último mes completo `2026-10` · mes parcial `2026-11`
- Agosto de 2026 con sus 31 días de NOAA-20: **+7.3%**. Los demás años no cambian.

## 4. Cómo se publicaría (después de la demo)

1. Carlos crea el release `datos-2026-11-15` desde la web de GitHub con los dos zip, **mismos nombres**, marcado como
   **latest** y sin "pre-release" (como dice `DESPLIEGUE.md`).
2. **No se borra** `datos-2026-11-14`: si algo sale mal, se vuelve a marcar como latest y se reinicia Render.
3. Evaristo (o quien tenga Render) reinicia el servicio: **Manual Deploy → Deploy latest commit**. No hay que tocar el front.
4. Carlos comprueba `/api/meta` (`last_month` = 2026-11) y que 2019 siga en 307,757.

**Ojo con el momento:** el plan gratis de Render se duerme a los 15 min y al despertar arranca con `/tmp` vacío, o sea que
**baja el release latest aunque nadie lo reinicie**. Si se publica antes de la demo, los datos podrían cambiar a mitad de
la presentación. Por eso: publicar solo después.

## 5. Si Evaristo acepta

- En `PLAN_EQUIPO.md`, "Quién hace qué": quitar a Paco; Carlos con 00b, 02, 03, 05, **la generación y publicación de la
  entrega y el contacto de datos con Manuel**; Evaristo con 01, 04, 06, 07 (código) y el despliegue.
- En `PLAN_INTEGRACION_WEB.md` §9, una línea para Manuel: "desde hoy el contacto de datos es Carlos".
- En `CONTEXTO_CARLOS.md` §6: marcar la regla "Una sola máquina genera la entrega final" como **la de Carlos**.
- Si alguien cambia el código de 06 o 07, avisa a Carlos para volver a generar la entrega.

## 6. Preguntas para Evaristo

1. ¿Aceptas la propuesta, o prefieres seguir generando tú la entrega? (Si sigues tú, Carlos te pasa `datos_2026/api`, 353 MB.)
2. ¿Render ya está levantado? En `DESPLIEGUE.md` figura como pendiente (⏳).
3. ¿Quién tiene acceso a Vercel para poner `VITE_API_URL`? Sin esa variable el front muestra datos de demostración.
4. La rama `feat/bootstrap-ci` se puede borrar (bootstrap aprobado en `HALLAZGOS_QA.md`).

---

## Respuesta de Evaristo

_(escribir aquí)_
