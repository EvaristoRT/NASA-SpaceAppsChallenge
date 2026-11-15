# Data Pipeline — Harmonization of MODIS and VIIRS Hot Spots

Este módulo implementa el pipeline de datos geoespaciales para la ingesta, indexación espacial (H3), agrupamiento espacio-temporal (ST-DBSCAN), calibración estadística y exportación a GeoParquet y DuckDB.

---

## ☁️ Arquitectura de Extracción en la Nube

Para evitar saturar la memoria RAM y el disco local con archivos CSV gigantescos de NASA FIRMS (2001–2026):
1. **Acceso Streaming / Out-of-Core:** Se leen los archivos directamente desde el almacenamiento remoto (**AWS S3**, **Google Cloud Storage**, **Azure Blob** o **HTTP/HTTPS**) mediante **DuckDB** y **fsspec**.
2. **Filtrado Espacial Temprano (Pushdown Predicates):** La consulta filtra por la latitud y longitud del Área de Interés (AOI) y nivel de confianza directamente sobre el stream de lectura antes de cargar los datos en memoria.

---

## 🚀 Configuración del Entorno

### 1. Requisitos Previos
* Python 3.10 o superior instalado.

### 2. Crear y Activar Entorno Virtual
```bash
cd data-pipeline
python -m venv venv

# En Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# En Linux / macOS:
source venv/bin/activate
```

### 3. Instalar Dependencias
```bash
pip install -r requirements.txt
```

### 4. Configurar Variables de Entorno y Credenciales Cloud
Copia la plantilla `.env.example` a un archivo `.env`:
```bash
cp .env.example .env
```
Edita `.env` con las credenciales de tu proveedor de nube:
* **`STORAGE_PROVIDER`:** `s3`, `gcs`, `azure`, `http` o `local`.
* **Credenciales S3:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`.
* **Rutas remotas:** `REMOTE_MODIS_PATH`, `REMOTE_VIIRS_PATH`.

---

## 🧪 Verificación de la Configuración
Ejecuta el script de prueba para verificar que el entorno y los conectores estén listos:
```bash
python test_setup.py
```
