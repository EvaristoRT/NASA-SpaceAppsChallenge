from abc import ABC, abstractmethod
from typing import List, BinaryIO
import duckdb


class BaseStorageClient(ABC):
    """Interfaz base para clientes de almacenamiento (Cloud / Local)."""

    @abstractmethod
    def list_files(self, prefix: str, extension: str = ".csv") -> List[str]:
        """Lista archivos remotos o locales que coincidan con el prefijo y extensión."""
        pass

    @abstractmethod
    def configure_duckdb(self, conn: duckdb.DuckDBPyConnection) -> None:
        """Configura credenciales y extensiones en DuckDB para acceso directo por streaming."""
        pass
