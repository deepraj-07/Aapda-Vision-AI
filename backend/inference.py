import os
from typing import Any
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

YOLO_MODEL_PATH = "models/best.pt"
OUTPUT_IMAGE_PATH = "data/outputs/processed_image.png"


def _resolve_model_path(model_path: str) -> Path:
    env_path = os.getenv("YOLO_MODEL_PATH", "").strip()
    selected = Path(env_path) if env_path else Path(model_path)
    if selected.is_absolute():
        return selected

    backend_root = Path(__file__).resolve().parent
    candidate = backend_root / selected
    if candidate.exists():
        return candidate

    workspace_candidate = backend_root.parent / selected
    if workspace_candidate.exists():
        return workspace_candidate
    return candidate


_model = YOLO(str(_resolve_model_path(YOLO_MODEL_PATH)))


def _normalize_class_name(class_name: str) -> str:
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


def _class_color(class_name: str) -> tuple[int, int, int]:
    normalized = _normalize_class_name(class_name)
    if normalized == "damaged":
        return (255, 0, 0)
    if normalized == "minor_damage":
        return (255, 255, 0)
    return (0, 255, 0)


def _scale_bbox_from_normalized(normalized_bbox: list[float], image_shape: tuple[int, int, int]) -> list[int]:
    h, w = image_shape[:2]
    x1 = int(max(0.0, min(1.0, normalized_bbox[0])) * w)
    y1 = int(max(0.0, min(1.0, normalized_bbox[1])) * h)
    x2 = int(max(0.0, min(1.0, normalized_bbox[2])) * w)
    y2 = int(max(0.0, min(1.0, normalized_bbox[3])) * h)

    x1 = max(0, min(w - 1, x1))
    y1 = max(0, min(h - 1, y1))
    x2 = max(0, min(w, x2))
    y2 = max(0, min(h, y2))
    return [x1, y1, x2, y2]


def _draw_prediction_boxes(image_rgb: np.ndarray, predictions: list[dict[str, Any]]) -> np.ndarray:
    canvas = image_rgb.copy()
    h, w = canvas.shape[:2]

    for prediction in predictions:
        x1, y1, x2, y2 = [int(v) for v in prediction["bbox"]]
        x1 = max(0, min(w - 1, x1))
        y1 = max(0, min(h - 1, y1))
        x2 = max(0, min(w, x2))
        y2 = max(0, min(h, y2))
        if x2 <= x1 or y2 <= y1:
            continue

        label = _normalize_class_name(prediction.get("class", ""))
        confidence = float(prediction.get("confidence", 0.0))
        color = _class_color(label)

        cv2.rectangle(canvas, (x1, y1), (x2, y2), color, 2)
        cv2.putText(
            canvas,
            f"{label} {confidence:.2f}",
            (x1, max(18, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            2,
            cv2.LINE_AA,
        )

    return canvas


def _class_intensity(class_name: str) -> float:
    normalized = _normalize_class_name(class_name)
    if normalized == "damaged":
        return 1.0
    if normalized == "minor_damage":
        return 0.65
    return 0.25


def _create_heatmap_overlay(image_rgb: np.ndarray, predictions: list[dict[str, Any]]) -> np.ndarray:
    h, w = image_rgb.shape[:2]
    intensity_map = np.zeros((h, w), dtype=np.float32)

    for prediction in predictions:
        x1, y1, x2, y2 = prediction["bbox"]
        x1 = max(0, int(x1))
        y1 = max(0, int(y1))
        x2 = min(w, int(x2))
        y2 = min(h, int(y2))
        if x2 <= x1 or y2 <= y1:
            continue

        severity = _class_intensity(prediction.get("class", ""))
        current = intensity_map[y1:y2, x1:x2]
        intensity_map[y1:y2, x1:x2] = np.maximum(current, severity)

    if not np.any(intensity_map):
        return image_rgb.copy()

    intensity_uint8 = np.clip(intensity_map * 255.0, 0, 255).astype(np.uint8)
    intensity_uint8 = cv2.GaussianBlur(intensity_uint8, (0, 0), sigmaX=17, sigmaY=17)
    heatmap = cv2.applyColorMap(intensity_uint8, cv2.COLORMAP_TURBO)
    heatmap_rgb = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
    return cv2.addWeighted(image_rgb, 0.72, heatmap_rgb, 0.28, 0)


def analyze_image(image_path: str, output_image_path: str = OUTPUT_IMAGE_PATH) -> dict[str, int | str | list[dict[str, Any]]]:
    results = _model.predict(image_path, conf=0.25, verbose=False)

    image_bgr = cv2.imread(image_path)
    if image_bgr is None:
        raise ValueError(f"Could not read image: {image_path}")
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

    predictions: list[dict[str, Any]] = []
    annotated = image_rgb.copy()

    if results:
        result = results[0]
        names = result.names
        for box in result.boxes:
            cls_id = int(box.cls.item())
            raw_label = names.get(cls_id, str(cls_id))
            label = _normalize_class_name(raw_label)
            confidence = float(box.conf.item())
            xyxyn = [float(v) for v in box.xyxyn[0].tolist()]
            x1, y1, x2, y2 = _scale_bbox_from_normalized(xyxyn, image_rgb.shape)

            prediction = {
                "class": label,
                "raw_class": str(raw_label),
                "confidence": round(confidence, 4),
                "bbox": [x1, y1, x2, y2],
            }
            predictions.append(prediction)

    annotated = _draw_prediction_boxes(annotated, predictions)

    print("[inference] Predictions:", predictions)

    total_buildings = len(predictions)
    damaged_buildings = sum(1 for item in predictions if item.get("class") == "damaged")
    minor_damage = sum(1 for item in predictions if item.get("class") == "minor_damage")

    heatmap_overlay = _create_heatmap_overlay(image_rgb, predictions)
    combined = cv2.addWeighted(annotated, 0.7, heatmap_overlay, 0.3, 0)
    combined = _draw_prediction_boxes(combined, predictions)

    os.makedirs(os.path.dirname(output_image_path), exist_ok=True)
    cv2.imwrite(output_image_path, cv2.cvtColor(combined, cv2.COLOR_RGB2BGR))
    print(f"[inference] Saved processed image: {output_image_path}")

    return {
        "total_buildings": total_buildings,
        "damaged_buildings": damaged_buildings,
        "minor_damage": minor_damage,
        "damage_percent": round((damaged_buildings / total_buildings * 100.0), 2) if total_buildings > 0 else 0.0,
        "output_image_path": output_image_path,
        "processed_image_path": output_image_path,
        "predictions": predictions,
    }


if __name__ == "__main__":
    sample_path = "data/uploads/test2.png"
    if os.path.exists(sample_path):
        print(analyze_image(sample_path))
    else:
        print(f"Sample image not found at: {sample_path}")
