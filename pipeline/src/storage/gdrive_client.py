import io
from pathlib import Path
from typing import List, Dict, Any, Optional
from loguru import logger

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

from config.settings import settings

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


class GoogleDriveClient:
    """Cliente para listar y descargar archivos desde Google Drive API."""

    def __init__(self):
        self.service = self._authenticate()

    def _authenticate(self):
        """Autenticación mediante OAuth2 (usuario) o Cuenta de Servicio."""
        creds = None
        base_dir = settings.BASE_DIR

        if settings.GDRIVE_AUTH_TYPE == "service_account":
            sa_path = base_dir / (settings.GDRIVE_SERVICE_ACCOUNT_FILE or "credentials/service_account.json")
            if not sa_path.exists():
                raise FileNotFoundError(
                    f"Archivo de Service Account no encontrado en: {sa_path}\n"
                    f"Coloca tu service_account.json en data-pipeline/credentials/"
                )
            logger.info(f"Autenticando con Google Drive vía Service Account: {sa_path}")
            creds = service_account.Credentials.from_service_account_file(
                str(sa_path), scopes=SCOPES
            )
        else:
            # Flujo OAuth2 de usuario personal
            token_path = base_dir / (settings.GDRIVE_TOKEN_FILE or "credentials/token.json")
            client_secrets_path = base_dir / (
                settings.GDRIVE_CLIENT_SECRETS_FILE or "credentials/client_secrets.json"
            )

            if token_path.exists():
                creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    logger.info("Refrescando token OAuth expirado de Google Drive...")
                    creds.refresh(Request())
                else:
                    if not client_secrets_path.exists():
                        raise FileNotFoundError(
                            f"No se encontró el archivo client_secrets.json en: {client_secrets_path}\n"
                            f"Descárgalo desde Google Cloud Console y colócalo en data-pipeline/credentials/"
                        )
                    logger.info("Iniciando flujo interactivo de autenticación OAuth...")
                    flow = InstalledAppFlow.from_client_secrets_file(
                        str(client_secrets_path), SCOPES
                    )
                    creds = flow.run_local_server(port=0)

                token_path.parent.mkdir(parents=True, exist_ok=True)
                with open(token_path, "w", encoding="utf-8") as token_file:
                    token_file.write(creds.to_json())
                logger.info("Token guardado exitosamente.")

        return build("drive", "v3", credentials=creds)

    def list_files_in_folder(
        self, folder_id: str, extension: str = ".csv", name_filter: Optional[str] = None, recursive: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Lista archivos en una carpeta de Google Drive.
        Si recursive=True, busca recursivamente en todas las subcarpetas (ej. carpetas por año o sensor).
        """
        results = []
        folders_to_scan = [folder_id]
        scanned_folders = set()

        logger.info(f"Escaneando carpeta de Google Drive (ID: {folder_id}, recursivo={recursive})...")

        while folders_to_scan:
            current_folder = folders_to_scan.pop(0)
            if current_folder in scanned_folders:
                continue
            scanned_folders.add(current_folder)

            query = f"'{current_folder}' in parents and trashed = false"
            page_token = None

            while True:
                response = (
                    self.service.files()
                    .list(
                        q=query,
                        spaces="drive",
                        fields="nextPageToken, files(id, name, mimeType, size, modifiedTime)",
                        pageToken=page_token,
                    )
                    .execute()
                )
                items = response.get("files", [])
                for item in items:
                    if item.get("mimeType") == "application/vnd.google-apps.folder":
                        if recursive:
                            folders_to_scan.append(item["id"])
                    else:
                        name = item.get("name", "")
                        if name.endswith(extension):
                            if not name_filter or name_filter.lower() in name.lower():
                                results.append(item)

                page_token = response.get("nextPageToken", None)
                if not page_token:
                    break

        logger.info(f"Se encontraron {len(results)} archivos coincidentes con {extension}.")
        return results

    def download_file_to_cache(self, file_id: str, file_name: str) -> Path:
        """
        Descarga el archivo a la caché local si no existe previamente o si cambió.
        Maneja la descarga en chunks para evitar problemas de memoria.
        """
        cache_dir = settings.CACHE_DIR / "gdrive"
        cache_dir.mkdir(parents=True, exist_ok=True)
        destination_path = cache_dir / file_name

        if destination_path.exists():
            logger.info(f"Archivo ya disponible en caché local: {destination_path.name}")
            return destination_path

        logger.info(f"Descargando archivo desde Google Drive: {file_name} (ID: {file_id})...")
        request = self.service.files().get_media(fileId=file_id)

        with open(destination_path, "wb") as fh:
            downloader = MediaIoBaseDownload(fh, request, chunksize=1024 * 1024 * 10)  # 10MB chunks
            done = False
            while not done:
                status, done = downloader.next_chunk()
                if status:
                    progress = int(status.progress() * 100)
                    logger.debug(f"Descargando {file_name}: {progress}%")

        logger.success(f"Descarga finalizada y cacheada: {destination_path}")
        return destination_path
