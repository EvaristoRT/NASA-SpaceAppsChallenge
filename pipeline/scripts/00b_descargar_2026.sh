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
# Estrategia: calidad estándar (SP) donde FIRMS la tiene y NRT después.
# La fecha donde termina el SP de cada sensor se pide a /api/data_availability y
# cada bloque de 5 días se PARTE en esa fecha: la parte vieja se pide en SP y la
# nueva en NRT. (Antes se pedía el bloque entero en SP y, si traía filas, no se
# pedía nada más: así se perdieron VIIRS 2026-08-01..03 y MODIS 2026-09-01..02.)
#
# Los bloques NRT que tocan los últimos REFRESH_DAYS días se vuelven a bajar
# siempre: FIRMS sigue agregando focos a esos días.

REFRESH_DAYS="${REFRESH_DAYS:-7}"
AVAIL="$(curl -sS "https://firms.modaps.eosdis.nasa.gov/api/data_availability/csv/$KEY/all" 2>/dev/null)"
sp_max() { printf '%s\n' "$AVAIL" | awk -F, -v id="$1_SP" '$1==id {print $3}' | tr -d '\r'; }
ts() { date -d "$1" +%s; }
REFRESH_FROM="$(date -d "$HASTA -$REFRESH_DAYS days" +%F)"

total_ok=0; total_vacio=0; total_salt=0

# fetch SENSOR MODO INICIO DIAS FIN  -> baja una parte, salvo que ya exista (o haya que refrescarla)
fetch() {
  local src="$1" modo="$2" ini="$3" dias="$4" fin="$5"
  local f="$OUT/$src/${src}_${modo}_${ini}.csv"
  local refrescar=""
  [ "$modo" = "NRT" ] && [ "$(ts "$fin")" -ge "$(ts "$REFRESH_FROM")" ] && refrescar="si"
  if [ -s "$f" ] && [ "$(wc -l < "$f")" -gt 1 ] && [ -z "$refrescar" ]; then
    total_salt=$((total_salt+1)); return
  fi
  local tmp; tmp="$(mktemp)"
  local code; code="$(curl -sS -o "$tmp" -w '%{http_code}' "$API/$KEY/${src}_${modo}/$BBOX/$dias/$ini" 2>/dev/null)"
  local filas=$(( $(wc -l < "$tmp") - 1 ))
  if [ "$code" = "200" ] && [ "$filas" -gt 0 ]; then
    mv "$tmp" "$f"
    printf "  %-14s %s  %-3s %d día(s)  %6d filas%s\n" "$src" "$ini" "$modo" "$dias" "$filas" "${refrescar:+  (refresco)}"
    total_ok=$((total_ok+1))
  else
    [ "$code" != "200" ] && { head -c 200 "$tmp" | tr -d '\n'; echo "   <- HTTP $code  $src $ini $modo"; }
    printf "  %-14s %s  %-3s %d día(s)  sin datos\n" "$src" "$ini" "$modo" "$dias"
    rm -f "$tmp"; total_vacio=$((total_vacio+1))
  fi
}

for src in $SOURCES; do
  mkdir -p "$OUT/$src"
  spmax="$(sp_max "$src")"
  if [ -z "$spmax" ]; then
    echo "ERROR: FIRMS no informó hasta dónde llega ${src}_SP (¿clave inválida o sin red?)."; exit 1
  fi
  echo "$src: SP hasta $spmax, NRT después"
  d="$DESDE"
  while [ "$(ts "$d")" -le "$(ts "$HASTA")" ]; do
    fin="$(date -d "$d +$((DAY_RANGE-1)) days" +%F)"
    [ "$(ts "$fin")" -gt "$(ts "$HASTA")" ] && fin="$HASTA"
    dias=$(( ($(ts "$fin") - $(ts "$d") + 43200) / 86400 + 1 ))
    if [ "$(ts "$fin")" -le "$(ts "$spmax")" ]; then
      fetch "$src" SP "$d" "$dias" "$fin"
    elif [ "$(ts "$d")" -gt "$(ts "$spmax")" ]; then
      fetch "$src" NRT "$d" "$dias" "$fin"
    else  # el bloque cruza el fin del SP: se parte en dos
      d_sp=$(( ($(ts "$spmax") - $(ts "$d") + 43200) / 86400 + 1 ))
      ini_nrt="$(date -d "$spmax +1 day" +%F)"
      fetch "$src" SP "$d" "$d_sp" "$spmax"
      fetch "$src" NRT "$ini_nrt" "$((dias - d_sp))" "$fin"
    fi
    d="$(date -d "$d +$DAY_RANGE days" +%F)"
  done
done

echo
echo "bloques descargados : $total_ok"
echo "partes sin datos    : $total_vacio"
echo "bloques ya existian : $total_salt"
echo
echo "Para unir todo por sensor (requiere que las cabeceras coincidan):"
echo "  for s in $SOURCES; do"
echo "    { head -1 \"\$(ls $OUT/\$s/*.csv | head -1)\";"
echo "      tail -q -n +2 $OUT/\$s/*.csv; } > $OUT/\${s}_2026.csv"
echo "  done"
