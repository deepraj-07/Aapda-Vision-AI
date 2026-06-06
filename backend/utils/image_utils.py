import os
from datetime import datetime
from PIL import ExifTags

import cv2
import numpy as np
from PIL import Image


ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "tif", "tiff", "webp"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def timestamped_filename(prefix: str, original_name: str, ext: str = "png") -> str:
    safe_base = os.path.splitext(original_name)[0].replace(" ", "_")
    stamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    return f"{prefix}_{safe_base}_{stamp}.{ext}"


def read_image_rgb(path: str) -> np.ndarray:
    with Image.open(path) as img:
        return np.array(img.convert("RGB"))


def write_image_bgr(path: str, image_rgb: np.ndarray) -> None:
    bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    cv2.imwrite(path, bgr)


def _gps_dms_to_decimal(dms_value, ref) -> float | None:
    if not dms_value or len(dms_value) < 3:
        return None

    def _to_float(component):
        if isinstance(component, (int, float)):
            return float(component)
        if hasattr(component, "numerator") and hasattr(component, "denominator"):
            denominator = float(component.denominator) if component.denominator else 1.0
            return float(component.numerator) / denominator
        if isinstance(component, tuple) and len(component) == 2 and component[1]:
            return float(component[0]) / float(component[1])
        return float(component)

    try:
        degrees = _to_float(dms_value[0])
        minutes = _to_float(dms_value[1])
        seconds = _to_float(dms_value[2])
    except (TypeError, ValueError, ZeroDivisionError):
        return None

    decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
    if str(ref).upper() in {"S", "W"}:
        decimal = -decimal
    return decimal


def extract_gps_coordinates(path: str) -> tuple[float | None, float | None]:
    try:
        with Image.open(path) as img:
            exif = img.getexif()
    except Exception:
        return None, None

    if not exif:
        return None, None

    gps_tag_id = None
    for key, value in ExifTags.TAGS.items():
        if value == "GPSInfo":
            gps_tag_id = key
            break

    if gps_tag_id is None or gps_tag_id not in exif:
        return None, None

    gps_info = exif.get(gps_tag_id)
    if not gps_info:
        return None, None

    decoded = {}
    for key, value in gps_info.items():
        tag_name = ExifTags.GPSTAGS.get(key, key)
        decoded[tag_name] = value

    lat = _gps_dms_to_decimal(decoded.get("GPSLatitude"), decoded.get("GPSLatitudeRef"))
    lng = _gps_dms_to_decimal(decoded.get("GPSLongitude"), decoded.get("GPSLongitudeRef"))
    return lat, lng
