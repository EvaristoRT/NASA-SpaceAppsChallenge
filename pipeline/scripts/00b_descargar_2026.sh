#!/usr/bin/env bash
# Paso 00b - Baja los focos del año en curso (2026) con la API de área de FIRMS.
#
# El archivo histórico (zips) llega solo hasta 2025; 2026 se baja por bloques de 5 días.
# Pide calidad estándar (SP) donde existe y cae a NRT en los meses recientes.
# Es REANUDABLE: salta los bloques ya bajados. Volver a correrlo refresca la cola NRT.
#
# Necesita una MAP_KEY (gratis, solo pide un email): https://firms.modaps.eosdis.nasa.gov/api/map_key/
#   - variable de entorno FIRMS_MAP_KEY, o
#   - archivo pipeline/.firms_map_key (git lo ignora). NUNCA subir la clave al repo.
#
# Destino: $FIRE_DATA_DIR/datos_2026/api/<SENSOR>/<SENSOR>_<SP|NRT>_<fecha>.csv
#
# Uso (Git Bash):
#   bash pipeline/scripts/00b_descargar_2026.sh
#   SOURCES="VIIRS_NOAA20" DESDE=2026-11-12 bash pipeline/scripts/00b_descargar_2026.sh
#   BBOX=world bash pipeline/scripts/00b_descargar_2026.sh        # global (mucho más pesado)

set -u

# ---------------------------------------------------------------- rutas
AQUI="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$AQUI/.." && pwd)"          # pipeline/
[ -z "${FIRE_DATA_DIR:-}" ] && [ -f "$RAIZ/.env" ] && FIRE_DATA_DIR="$(grep -E '^FIRE_DATA_DIR=' "$RAIZ/.env" | head -1 | cut -d= -f2- | tr -d '\r"')"
if [ -z "${FIRE_DATA_DIR:-}" ] && [ -z "${OUT:-}" ]; then
  echo "ERROR: define FIRE_DATA_DIR (variable de entorno o pipeline/.env)"; exit 1
fi
FIRE_DATA_DIR="$(printf '%s' "${FIRE_DATA_DIR:-}" | tr '\134' '/')"

# ---------------------------------------------------------------- configuración
BBOX="${BBOX:--85,-57,-32,14}"          # Sudamérica completa (west,south,east,north)
DESDE="${DESDE:-2026-01-01}"
HASTA="${HASTA:-$(date +%F)}"
OUT="${OUT:-$FIRE_DATA_DIR/datos_2026/api}"
DAY_RANGE=5                             # máximo que admite la API
SOURCES="${SOURCES:-MODIS VIIRS_NOAA20 VIIRS_NOAA21 VIIRS_SNPP}"

# ---------------------------------------------------------------- clave
if [ -n "${FIRMS_MAP_KEY:-}" ]; then
  KEY="$FIRMS_MAP_KEY"
else
  KEY=""
  for kf in "$AQUI/.firms_map_key" "$RAIZ/.firms_map_key"; do
    [ -f "$kf" ] && { KEY="$(tr -d ' \t\r\n' < "$kf")"; break; }
  done
  if [ -z "$KEY" ]; then
    echo "ERROR: no encuentro la MAP_KEY."
    echo "  Pídela en https://firms.modaps.eosdis.nasa.gov/api/map_key/ (solo necesita tu email)"
    echo "  y luego:  echo \"TU_CLAVE\" > \"$AQUI/.firms_map_key\""
    exit 1
  fi
fi

API="https://firms.modaps.eosdis.nasa.gov/api/area/csv"

echo "bbox      : $BBOX"
echo "periodo   : $DESDE .. $HASTA"
echo "destino   : $OUT/"
echo

# ---------------------------------------------------------------- descarga
# Estrategia: para cada bloque de 5 días se intenta primero SP (Standard
# Processing, calidad científica) y solo si viene vacío se cae a NRT. Así los
# meses antiguos de 2026 salen en calidad estándar y la cola reciente en NRT.

total_ok=0; total_vacio=0; total_fallo=0; total_salt=0

for src in $SOURCES; do
  mkdir -p "$OUT/$src"
  d="$DESDE"
  while [ "$(date -d "$d" +%s)" -le "$(date -d "$HASTA" +%s)" ]; do
    # ya descargado en cualquiera de los dos modos?
    ya=""
    for m in SP NRT; do
      f="$OUT/$src/${src}_${m}_${d}.csv"
      [ -s "$f" ] && [ "$(wc -l < "$f")" -gt 1 ] && ya="$m"
    done
    if [ -n "$ya" ]; then
      total_salt=$((total_salt+1))
      d="$(date -d "$d +$DAY_RANGE days" +%F)"
      continue
    fi

    got=""
    for modo in SP NRT; do
      tmp="$(mktemp)"
      code="$(curl -sS -o "$tmp" -w '%{http_code}' \
                "$API/$KEY/${src}_${modo}/$BBOX/$DAY_RANGE/$d" 2>/dev/null)"
      filas=$(( $(wc -l < "$tmp") - 1 ))
      if [ "$code" = "200" ] && [ "$filas" -gt 0 ]; then
        mv "$tmp" "$OUT/$src/${src}_${modo}_${d}.csv"
        printf "  %-14s %s  %-4s %6d filas\n" "$src" "$d" "$modo" "$filas"
        got="$modo"; total_ok=$((total_ok+1))
        break
      fi
      if [ "$code" != "200" ]; then
        head -c 200 "$tmp" | tr -d '\n'; echo "   <- HTTP $code  $src $d $modo"
      fi
      rm -f "$tmp"
    done

    if [ -z "$got" ]; then
      printf "  %-14s %s  ---  sin datos\n" "$src" "$d"
      total_vacio=$((total_vacio+1))
    fi

    d="$(date -d "$d +$DAY_RANGE days" +%F)"
  done
done

echo
echo "bloques descargados : $total_ok"
echo "bloques vacios      : $total_vacio"
echo "bloques ya existian : $total_salt"
echo
echo "Para unir todo por sensor (requiere que las cabeceras coincidan):"
echo "  for s in $SOURCES; do"
echo "    { head -1 \"\$(ls $OUT/\$s/*.csv | head -1)\";"
echo "      tail -q -n +2 $OUT/\$s/*.csv; } > $OUT/\${s}_2026.csv"
echo "  done"
