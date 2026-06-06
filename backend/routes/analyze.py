import os
import json
import re

import cv2
import numpy as np
import requests
from flask import Blueprint, current_app, jsonify, request
from werkzeug.utils import secure_filename

from models.damage_model import AnalysisResult, db
from services.analysis_service import analyze_disaster_image
from services.heatmap_service import HeatmapService
from services.segmentation_service import SegmentationService
from services.yolo_service import YoloService
from services.advanced_insights import (
    get_damage_trend,
    get_building_risk_scores,
    get_resource_recommendations,
    get_location_statistics,
)
from utils.image_utils import (
    allowed_file,
    extract_gps_coordinates,
    read_image_rgb,
    timestamped_filename,
    write_image_bgr,
)

analyze_bp = Blueprint("analyze", __name__)

yolo_service = YoloService()
segmentation_service = SegmentationService()
heatmap_service = HeatmapService()


def _to_web_data_path(path_value: str | None) -> str:
    normalized = str(path_value or "").replace("\\", "/").strip()
    if not normalized:
        return ""
    if normalized.startswith("data/"):
        return normalized

    upload_folder = str(current_app.config.get("UPLOAD_FOLDER", "")).replace("\\", "/")
    output_folder = str(current_app.config.get("OUTPUT_FOLDER", "")).replace("\\", "/")

    if upload_folder and normalized.startswith(upload_folder):
        return f"data/uploads/{os.path.basename(normalized)}"
    if output_folder and normalized.startswith(output_folder):
        return f"data/outputs/{os.path.basename(normalized)}"

    data_index = normalized.lower().find("/data/")
    if data_index >= 0:
        return normalized[data_index + 1 :]

    return normalized


def _reverse_geocode_from_coordinates(lat: float, lng: float) -> dict:
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "lat": lat,
                "lon": lng,
                "format": "jsonv2",
                "zoom": 10,
                "addressdetails": 1,
            },
            headers={"User-Agent": "AapdaVision-AI/1.0 (disaster-response)"},
            timeout=8,
        )
        response.raise_for_status()
        data = response.json() or {}
        address = data.get("address") or {}

        city = (
            address.get("city")
            or address.get("town")
            or address.get("county")
            or address.get("municipality")
            or address.get("village")
            or ""
        )
        state = address.get("state") or address.get("region") or ""
        country = address.get("country") or ""
        display_name = data.get("display_name") or ", ".join([part for part in [city, state, country] if part])

        return {
            "city": str(city).strip(),
            "state": str(state).strip(),
            "country": str(country).strip(),
            "display_name": str(display_name).strip(),
        }
    except Exception:
        return {"city": "", "state": "", "country": "", "display_name": ""}


def _classify_boxes_from_segmentation_mask(mask: np.ndarray | None, boxes: list[dict], image_shape: tuple[int, int, int]) -> list[dict]:
    if mask is None or not boxes:
        return boxes

    h, w = image_shape[:2]
    resized_mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)
    enriched: list[dict] = []

    for item in boxes:
        enriched_item = dict(item)
        bbox = enriched_item.get("bbox", [0, 0, 0, 0])
        x1, y1, x2, y2 = [int(v) for v in bbox]
        x1 = max(0, min(w - 1, x1))
        y1 = max(0, min(h - 1, y1))
        x2 = max(0, min(w, x2))
        y2 = max(0, min(h, y2))
        if x2 <= x1 or y2 <= y1:
            enriched.append(enriched_item)
            continue

        roi = resized_mask[y1:y2, x1:x2]
        if roi.size == 0:
            enriched.append(enriched_item)
            continue

        severe_ratio = float((roi == 3).sum() / roi.size)
        major_ratio = float((roi == 2).sum() / roi.size)
        minor_ratio = float((roi == 1).sum() / roi.size)
        impact_ratio = severe_ratio + major_ratio + minor_ratio

        if severe_ratio >= 0.15 or major_ratio >= 0.28:
            label = "damaged"
        elif impact_ratio >= 0.12 or minor_ratio >= 0.08:
            label = "minor_damage"
        else:
            label = "no_damage"

        base_conf = float(enriched_item.get("confidence", 0.0))
        enriched_item["class"] = label
        enriched_item["confidence"] = round(min(0.99, max(base_conf, 0.45 + (impact_ratio * 0.45))), 4)
        enriched.append(enriched_item)

    return enriched


def _risk_level(damage_percentage: float) -> str:
    if damage_percentage < 30:
        return "low"
    if damage_percentage <= 60:
        return "medium"
    return "high"


def _normalize_prediction_class(class_name: str) -> str:
    normalized = str(class_name or "").strip().lower().replace(" ", "_")
    alias_map = {
        "major_damage": "damaged",
        "severe_damage": "damaged",
        "destroyed": "damaged",
        "minor": "minor_damage",
        "low_damage": "minor_damage",
        "intact": "no_damage",
        "safe": "no_damage",
    }
    return alias_map.get(normalized, normalized)


def _count_prediction_classes(boxes: list[dict]) -> tuple[int, int, int]:
    total = 0
    damaged = 0
    minor = 0

    for item in boxes:
        if "bbox" not in item:
            continue
        total += 1
        class_name = _normalize_prediction_class(item.get("class", ""))
        if class_name == "damaged":
            damaged += 1
        elif class_name == "minor_damage":
            minor += 1

    return total, damaged, minor


def _class_intensity(class_name: str) -> float:
    normalized = _normalize_prediction_class(class_name)
    if normalized == "damaged":
        return 1.0
    if normalized == "minor_damage":
        return 0.65
    return 0.25


def _class_color(class_name: str) -> tuple[int, int, int]:
    normalized = _normalize_prediction_class(class_name)
    # OpenCV uses BGR format, not RGB
    if normalized == "damaged":
        return (0, 0, 255)  # Red in BGR
    if normalized == "minor_damage":
        return (0, 255, 255)  # Yellow in BGR
    return (0, 255, 0)  # Green in BGR


def _draw_prediction_boxes(image_rgb: np.ndarray, boxes: list[dict]) -> np.ndarray:
    canvas = image_rgb.copy()
    h, w = canvas.shape[:2]

    for item in boxes:
        bbox = item.get("bbox", [0, 0, 0, 0])
        x1, y1, x2, y2 = [int(v) for v in bbox]
        x1 = max(0, min(w - 1, x1))
        y1 = max(0, min(h - 1, y1))
        x2 = max(0, min(w, x2))
        y2 = max(0, min(h, y2))
        if x2 <= x1 or y2 <= y1:
            continue

        label = _normalize_prediction_class(item.get("class", ""))
        conf = float(item.get("confidence", 0.0))
        color = _class_color(label)

        cv2.rectangle(canvas, (x1, y1), (x2, y2), color, 2)
        cv2.putText(
            canvas,
            f"{label} {conf:.2f}",
            (x1, max(18, y1 - 6)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            2,
            cv2.LINE_AA,
        )

    return canvas


def _extract_damaged_boxes_from_mask(mask: np.ndarray, image_shape: tuple[int, int, int]) -> list[dict]:
    if mask is None:
        return []

    h, w = image_shape[:2]
    resized = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)

    # Treat segmentation classes 2 and 3 as actionable damaged regions for fallback boxing.
    binary = np.isin(resized, [2, 3]).astype(np.uint8) * 255
    if not np.any(binary):
        return []

    kernel = np.ones((5, 5), np.uint8)
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    damaged_boxes: list[dict] = []
    min_area = max(160, int((h * w) * 0.00012))

    for contour in contours:
        x, y, bw, bh = cv2.boundingRect(contour)
        area = bw * bh
        if area < min_area:
            continue

        x2, y2 = x + bw, y + bh
        roi = resized[y:y2, x:x2]
        if roi.size == 0:
            continue

        severe_ratio = float((roi == 3).sum() / roi.size)
        label = "damaged" if severe_ratio >= 0.25 else "minor_damage"
        damaged_boxes.append(
            {
                "class": label,
                "raw_class": "segmentation_fallback",
                "confidence": round(0.52 + min(severe_ratio, 0.4), 4),
                "bbox": [int(x), int(y), int(x2), int(y2)],
            }
        )

    return damaged_boxes


def _create_class_heatmap_overlay(image_rgb: np.ndarray, boxes: list[dict]) -> np.ndarray:
    h, w = image_rgb.shape[:2]
    intensity_map = np.zeros((h, w), dtype=np.float32)

    for item in boxes:
        bbox = item.get("bbox", [0, 0, 0, 0])
        x1, y1, x2, y2 = [int(v) for v in bbox]
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(w, x2)
        y2 = min(h, y2)
        if x2 <= x1 or y2 <= y1:
            continue

        level = _class_intensity(item.get("class", ""))
        current = intensity_map[y1:y2, x1:x2]
        intensity_map[y1:y2, x1:x2] = np.maximum(current, level)

    if not np.any(intensity_map):
        return image_rgb.copy()

    intensity_uint8 = np.clip(intensity_map * 255.0, 0, 255).astype(np.uint8)
    intensity_uint8 = cv2.GaussianBlur(intensity_uint8, (0, 0), sigmaX=17, sigmaY=17)
    heatmap = cv2.applyColorMap(intensity_uint8, cv2.COLORMAP_TURBO)
    heatmap_rgb = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
    return cv2.addWeighted(image_rgb, 0.72, heatmap_rgb, 0.28, 0)


def _extract_json_array(raw_text: str) -> list[dict]:
    if not raw_text:
        return []

    text = raw_text.strip()
    fenced_match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, flags=re.DOTALL)
    if fenced_match:
        text = fenced_match.group(1)

    if not text.startswith("["):
        bracket_match = re.search(r"\[.*\]", text, flags=re.DOTALL)
        if bracket_match:
            text = bracket_match.group(0)

    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return [item for item in parsed if isinstance(item, dict)]
    except json.JSONDecodeError:
        return []
    return []


def _parse_ngo_fallback(raw_text: str) -> list[dict]:
    items: list[dict] = []
    if not raw_text:
        return items

    lines = [line.strip("-• \t") for line in raw_text.splitlines() if line.strip()]
    for line in lines[:15]:
        parts = [part.strip() for part in line.split("|")]
        if len(parts) >= 4:
            items.append(
                {
                    "name": parts[0],
                    "location": parts[1],
                    "contact": parts[2],
                    "type": parts[3],
                }
            )
    return items


def _load_ngos_from_local() -> list[dict]:
    data_path = os.path.join(os.path.dirname(__file__), "../data/ngo_dataset.json")
    if not os.path.exists(data_path):
        return []

    with open(data_path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)

    structured = []
    for item in payload.get("ngos", []):
        structured.append(
            {
                "name": str(item.get("name", "")).strip(),
                "location": f"{item.get('latitude')}, {item.get('longitude')}",
                "contact": str(item.get("contact_email") or item.get("contact_phone") or "N/A").strip(),
                "type": str(item.get("specialization") or "NGO").split(",")[0].strip() or "NGO",
            }
        )
    return structured


def _fetch_ngos_with_mistral(location_query: str, api_key: str) -> list[dict]:
    prompt = (
        f"List NGOs and disaster relief centers near {location_query}. "
        "Return only a JSON array with max 8 objects. "
        "Each object must contain name, location, contact, type. "
        "Type must be one of NGO, Medical, Emergency."
    )

    payload = {
        "model": "mistral-small-latest",
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": "You are a disaster response assistant. Return only valid JSON array.",
            },
            {"role": "user", "content": prompt},
        ],
    }

    response = requests.post(
        "https://api.mistral.ai/v1/chat/completions",
        json=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        timeout=20,
    )
    response.raise_for_status()
    data = response.json()

    raw_text = ""
    choices = data.get("choices") or []
    if choices:
        message = choices[0].get("message") or {}
        raw_text = str(message.get("content") or "")

    parsed = _extract_json_array(raw_text)
    if parsed:
        return parsed
    return _parse_ngo_fallback(raw_text)


def _resolve_location_query(payload: dict) -> str:
    location = str(payload.get("location", "")).strip()
    city = str(payload.get("city", "")).strip()
    state = str(payload.get("state", "")).strip()

    if location:
        return location

    combined = ", ".join([part for part in [city, state] if part])
    if combined:
        return combined

    lat = payload.get("lat")
    lng = payload.get("lng")
    if lat is not None and lng is not None:
        try:
            lat_val = float(lat)
            lng_val = float(lng)
            geo = _reverse_geocode_from_coordinates(lat_val, lng_val)
            city_state = ", ".join([part for part in [geo.get("city"), geo.get("state")] if part])
            if city_state:
                return city_state
            return f"{lat_val:.6f}, {lng_val:.6f}"
        except (TypeError, ValueError):
            pass

    image_path = payload.get("image_path")
    if isinstance(image_path, str) and image_path and os.path.exists(image_path):
        lat, lng = extract_gps_coordinates(image_path)
        if lat is not None and lng is not None:
            return f"{lat:.6f}, {lng:.6f}"

    return ""


def _build_combined_result(
    detection_rgb: np.ndarray,
    heatmap_rgb: np.ndarray,
    alpha: float = 0.38,
) -> np.ndarray:
    if detection_rgb.shape != heatmap_rgb.shape:
        heatmap_rgb = cv2.resize(heatmap_rgb, (detection_rgb.shape[1], detection_rgb.shape[0]))
    return cv2.addWeighted(detection_rgb, 1.0 - alpha, heatmap_rgb, alpha, 0)


def _estimate_high_damage_buildings(mask: np.ndarray, boxes: list[dict], image_shape: tuple[int, int, int]) -> int:
    if mask is None or not boxes:
        return 0

    h, w = image_shape[:2]
    resized_mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)
    impacted = 0

    for item in boxes:
        x1, y1, x2, y2 = item.get("bbox", [0, 0, 0, 0])
        x1 = max(0, int(x1))
        y1 = max(0, int(y1))
        x2 = min(w, int(x2))
        y2 = min(h, int(y2))
        if x2 <= x1 or y2 <= y1:
            continue

        roi = resized_mask[y1:y2, x1:x2]
        if roi.size == 0:
            continue

        high_damage_ratio = float((roi == 3).sum() / roi.size)
        if high_damage_ratio >= 0.1:
            impacted += 1

    return impacted


def _dummy_analysis_response(image_path: str, lat, lng, location_name: str | None = None) -> dict:
    image_name = os.path.basename(image_path)
    total_buildings = 4
    damage_percentage = 35.0
    damaged_buildings = int((damage_percentage / 100.0) * total_buildings)
    minor_damage = 1
    risk_level = _risk_level(damage_percentage)

    return {
        "analysis_id": None,
        "total_buildings": total_buildings,
        "damaged_buildings": damaged_buildings,
        "minor_damage": minor_damage,
        "damage_percent": damage_percentage,
        "damage_percentage": damage_percentage,
        "risk_level": risk_level,
        "original_image_path": image_path,
        "detection_image_path": image_path,
        "heatmap_image_path": image_path,
        "combined_image_path": image_path,
        "boxes": [],
        "image_name": image_name,
        "latitude": lat,
        "longitude": lng,
        "location_name": location_name,
        "mode": "dummy-fallback",
    }


def _resolve_input_image_path(image_path: str) -> str:
    normalized = str(image_path or "").replace("\\", "/").lstrip("/")
    if os.path.isabs(normalized) and os.path.exists(normalized):
        return normalized

    backend_root = current_app.root_path
    candidates = [
        os.path.join(backend_root, normalized),
        os.path.join(current_app.config["UPLOAD_FOLDER"], os.path.basename(normalized)),
        os.path.join(current_app.config["UPLOAD_FOLDER"], normalized.split("/")[-1]),
    ]

    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate

    return normalized


@analyze_bp.post("/upload-image")
def upload_image():
    if "image" not in request.files:
        return jsonify({"error": "No image field in form-data."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No selected file."}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type."}), 400

    file_name = secure_filename(file.filename)
    stored_name = timestamped_filename("upload", file_name, ext=file_name.rsplit(".", 1)[1].lower())
    save_path = os.path.join(current_app.config["UPLOAD_FOLDER"], stored_name)
    file.save(save_path)
    relative_path = f"data/uploads/{stored_name}"

    return jsonify({"message": "Uploaded", "image_path": relative_path, "absolute_path": save_path}), 201


@analyze_bp.post("/analyze/upload")
def analyze_upload_image():
    if "image" not in request.files:
        return jsonify({"error": "No image field in form-data."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No selected file."}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type."}), 400

    file_name = secure_filename(file.filename)
    stored_name = timestamped_filename("upload", file_name, ext=file_name.rsplit(".", 1)[1].lower())
    save_path = os.path.join(current_app.config["UPLOAD_FOLDER"], stored_name)
    file.save(save_path)

    analysis = analyze_disaster_image(save_path)

    return (
        jsonify(
            {
                "message": "image received",
                "filename": stored_name,
                "analysis": analysis,
            }
        ),
        200,
    )


@analyze_bp.post("/analyze")
@analyze_bp.post("/analyze-damage")
def analyze_damage():
    payload = request.get_json(silent=True) or {}
    input_image_path = payload.get("image_path")
    image_path = input_image_path
    lat = payload.get("lat")
    lng = payload.get("lng")
    location_name = str(payload.get("location_name") or "").strip() or None

    try:
        lat = float(lat) if lat is not None and str(lat).strip() != "" else None
    except (TypeError, ValueError):
        lat = None

    try:
        lng = float(lng) if lng is not None and str(lng).strip() != "" else None
    except (TypeError, ValueError):
        lng = None

    if not location_name and lat is not None and lng is not None:
        geo = _reverse_geocode_from_coordinates(lat, lng)
        city_state = ", ".join([part for part in [geo.get("city"), geo.get("state")] if part])
        location_name = city_state or str(geo.get("display_name") or "").strip() or None

    print("[analyze_damage] Incoming request", {"image_path": image_path, "lat": lat, "lng": lng})

    if not image_path or not isinstance(image_path, str):
        return jsonify({"error": "Valid image_path is required."}), 400

    image_path = _resolve_input_image_path(image_path)

    if not os.path.exists(image_path):
        return jsonify({"error": "Valid image_path is required."}), 400

    models_loaded = bool(yolo_service.model is not None or segmentation_service.model is not None)
    if not models_loaded:
        print("[analyze_damage] Models unavailable, using dummy fallback response")
        return jsonify(_dummy_analysis_response(image_path, lat, lng, location_name)), 200

    try:
        image_rgb = read_image_rgb(image_path)

        detection = yolo_service.detect_buildings(image_rgb)
        print("[analyze_damage] Predictions", detection.boxes)
        total_buildings, damaged_buildings, minor_damage = _count_prediction_classes(detection.boxes)

        segmentation = segmentation_service.predict_damage(image_rgb, detection.boxes)
        detection.boxes = _classify_boxes_from_segmentation_mask(segmentation.mask, detection.boxes, image_rgb.shape)
        detection.annotated_image = _draw_prediction_boxes(image_rgb, detection.boxes)

        if not detection.boxes:
            fallback_boxes = _extract_damaged_boxes_from_mask(segmentation.mask, image_rgb.shape)
            if fallback_boxes:
                print("[analyze_damage] Using segmentation fallback boxes", fallback_boxes)
                detection.boxes = fallback_boxes
                detection.building_count = len(fallback_boxes)
                detection.annotated_image = _draw_prediction_boxes(image_rgb, fallback_boxes)

        # Recalculate after any fallback substitution.
        total_buildings, damaged_buildings, minor_damage = _count_prediction_classes(detection.boxes)

        base_name = os.path.basename(image_path)
        detect_name = timestamped_filename("detection", base_name)
        detect_path = os.path.join(current_app.config["OUTPUT_FOLDER"], detect_name)
        detect_web_path = f"data/outputs/{detect_name}"

        original_web_path = _to_web_data_path(input_image_path)
        if not original_web_path:
            original_web_path = _to_web_data_path(image_path)

        write_image_bgr(detect_path, detection.annotated_image)

        total_buildings = max(total_buildings, detection.building_count, len(detection.boxes))
        if total_buildings <= 0:
            total_buildings = 0

        if damaged_buildings > total_buildings:
            damaged_buildings = total_buildings
        if minor_damage > total_buildings:
            minor_damage = total_buildings

        damage_percentage = (
            float(damaged_buildings / total_buildings * 100.0)
            if total_buildings > 0
            else 0.0
        )
        if damage_percentage <= 0 and segmentation.damage_percentage > 0 and total_buildings > 0:
            estimated = int((segmentation.damage_percentage / 100.0) * total_buildings)
            damaged_buildings = max(damaged_buildings, min(estimated, total_buildings))
            damage_percentage = float(damaged_buildings / total_buildings * 100.0)

        if damage_percentage <= 10:
            damage_class = "No Damage"
        elif damage_percentage <= 30:
            damage_class = "Minor Damage"
        elif damage_percentage <= 60:
            damage_class = "Major Damage"
        else:
            damage_class = "Destroyed"

        if detection.boxes:
            confidence_score = float(np.mean([float(item.get("confidence", 0.0)) for item in detection.boxes]))
        else:
            confidence_score = float(segmentation.damage_percentage / 100.0)

        risk_level = _risk_level(damage_percentage)
        result = AnalysisResult(
            image_name=base_name,
            original_image_path=original_web_path,
            detection_image_path=detect_web_path,
            heatmap_image_path=None,
            total_buildings=total_buildings,
            damaged_buildings=damaged_buildings,
            damage_percentage=damage_percentage,
            damage_class=damage_class,
            confidence_score=confidence_score,
            risk_level=risk_level,
            latitude=lat,
            longitude=lng,
            location_name=location_name,
        )
        db.session.add(result)
        db.session.commit()

        response = {
            "analysis_id": result.id,
            "total_buildings": result.total_buildings,
            "damaged_buildings": result.damaged_buildings,
            "minor_damage": minor_damage,
            "damage_percent": round(result.damage_percentage, 2),
            "damage_percentage": round(result.damage_percentage, 2),
            "damage_class": result.damage_class,
            "confidence_score": round(result.confidence_score or 0.0, 4),
            "risk_level": result.risk_level,
            "original_image_path": result.original_image_path,
            "detection_image_path": result.detection_image_path,
            "heatmap_image_path": None,
            "combined_image_path": detect_web_path,
            "processed_image_path": detect_web_path,
            "boxes": detection.boxes,
            "latitude": lat,
            "longitude": lng,
            "location_name": location_name,
            "mode": "model",
        }
        print("[analyze_damage] Response ready", response)
        return jsonify(response)
    except Exception as exc:  # pragma: no cover
        print("[analyze_damage] Analysis failed", str(exc))
        return jsonify({"error": "Analysis failed due to server error.", "details": str(exc)}), 500


@analyze_bp.post("/get-ngos")
def get_ngos():
    payload = request.get_json(silent=True) or {}
    location_query = _resolve_location_query(payload)
    api_key = str(os.getenv("MISTRAL_API_KEY") or "").strip()

    if not location_query:
        return (
            jsonify(
                {
                    "error": "Location not found. Provide location/city/state or image_path with GPS metadata.",
                }
            ),
            400,
        )

    try:
        if api_key:
            ngos = _fetch_ngos_with_mistral(location_query, api_key)
        else:
            ngos = _load_ngos_from_local()
    except requests.HTTPError as exc:
        print(f"[get_ngos] Mistral request failed: {exc}")
        ngos = _load_ngos_from_local()
    except Exception as exc:  # pragma: no cover
        print(f"[get_ngos] Fallback to local NGO list due to error: {exc}")
        ngos = _load_ngos_from_local()

    structured = []
    for item in ngos:
        structured.append(
            {
                "name": str(item.get("name", "")).strip(),
                "location": str(item.get("location", "")).strip(),
                "contact": str(item.get("contact", "")).strip(),
                "type": str(item.get("type", "NGO")).strip() or "NGO",
            }
        )

    return jsonify(structured), 200


@analyze_bp.get("/reverse-geocode")
def reverse_geocode():
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)

    if lat is None or lng is None:
        return jsonify({"error": "lat and lng are required"}), 400

    geo = _reverse_geocode_from_coordinates(lat, lng)
    if not geo.get("city") and not geo.get("state"):
        return jsonify({"error": "Unable to resolve location", "city": "", "state": ""}), 404

    return jsonify({"success": True, **geo}), 200


@analyze_bp.get("/report")
def report():
    analysis_id = request.args.get("analysis_id", type=int)

    if analysis_id:
        item = AnalysisResult.query.get(analysis_id)
        if item is None:
            return jsonify({"error": "Report not found."}), 404
        return jsonify(item.to_dict())

    items = AnalysisResult.query.order_by(AnalysisResult.created_at.desc()).limit(20).all()
    return jsonify([item.to_dict() for item in items])


# ---------------------------
# ADVANCED ML INSIGHTS
# ---------------------------

@analyze_bp.post("/advanced-insights")
def advanced_insights():
    """
    Provide advanced ML-driven insights including:
    - Damage trend analysis over time
    - Building-level risk scoring
    - Resource allocation recommendations
    - Location-based statistics
    """
    payload = request.get_json(silent=True) or {}
    analysis_id = payload.get("analysis_id")
    location_name = payload.get("location_name")
    lat = payload.get("lat")
    lng = payload.get("lng")
    boxes = payload.get("boxes", [])
    damage_percent = payload.get("damage_percent", 0)
    total_buildings = payload.get("total_buildings", 0)
    damaged_buildings = payload.get("damaged_buildings", 0)

    insights = {}

    try:
        # Damage trend analysis
        trend_data = get_damage_trend(location_name=location_name, lat=lat, lng=lng)
        insights["damage_trend"] = trend_data
    except Exception as e:
        print(f"[advanced_insights] Trend analysis failed: {e}")
        insights["damage_trend"] = {"error": str(e)}

    try:
        # Building risk scores
        risk_scores = get_building_risk_scores(boxes)
        insights["building_risks"] = risk_scores
    except Exception as e:
        print(f"[advanced_insights] Risk scoring failed: {e}")
        insights["building_risks"] = {"error": str(e)}

    try:
        # Resource recommendations
        resources = get_resource_recommendations(damage_percent, total_buildings, damaged_buildings)
        insights["resource_allocation"] = resources
    except Exception as e:
        print(f"[advanced_insights] Resource allocation failed: {e}")
        insights["resource_allocation"] = {"error": str(e)}

    try:
        # Location statistics
        location_stats = get_location_statistics(location_name=location_name)
        insights["location_statistics"] = location_stats
    except Exception as e:
        print(f"[advanced_insights] Location statistics failed: {e}")
        insights["location_statistics"] = {"error": str(e)}

    return jsonify({
        "analysis_id": analysis_id,
        "insights": insights,
        "timestamp": True
    }), 200

