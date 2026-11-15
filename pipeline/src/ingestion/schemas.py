from typing import Dict

# Esquema de tipos esperados para NASA FIRMS MODIS (Collection 6.1)
MODIS_COLUMNS: Dict[str, str] = {
    "latitude": "DOUBLE",
    "longitude": "DOUBLE",
    "brightness": "DOUBLE",
    "scan": "DOUBLE",
    "track": "DOUBLE",
    "acq_date": "DATE",
    "acq_time": "VARCHAR",
    "satellite": "VARCHAR",
    "instrument": "VARCHAR",
    "confidence": "INTEGER",
    "version": "VARCHAR",
    "bright_t31": "DOUBLE",
    "frp": "DOUBLE",
    "daynight": "VARCHAR",
}

# Esquema de tipos esperados para NASA FIRMS VIIRS (S-NPP, NOAA-20, NOAA-21)
VIIRS_COLUMNS: Dict[str, str] = {
    "latitude": "DOUBLE",
    "longitude": "DOUBLE",
    "bright_ti4": "DOUBLE",
    "scan": "DOUBLE",
    "track": "DOUBLE",
    "acq_date": "DATE",
    "acq_time": "VARCHAR",
    "satellite": "VARCHAR",
    "instrument": "VARCHAR",
    "confidence": "VARCHAR",  # VIIRS utiliza 'l' (low), 'n' (nominal), 'h' (high)
    "version": "VARCHAR",
    "bright_ti5": "DOUBLE",
    "frp": "DOUBLE",
    "daynight": "VARCHAR",
}
