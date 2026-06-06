from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from pathlib import Path
import os

import cv2
import numpy as np

try:
    from ultralytics import YOLO
except ImportError:  # pragma: no cover
    YOLO = None


@dataclass
class YoloDetectionResult:
    boxes: list[dict[str, Any]]
    building_count: int
    annotated_image: np.ndarray


class YoloService:
    def __init__(self, model_path: str = "models/best.pt") -> None:
        self.model = None
        if YOLO is None:
            return

        resolved = self._resolve_model_path(model_path)
        try:
            self.model = YOLO(str(resolved))
            print(f"[YoloService] Loaded model: {resolved}")
        except Exception as exc:  # pragma: no cover
            print(f"[YoloService] Failed to load {resolved}: {exc}")
            fallback = self._resolve_model_path("yolov8n.pt")
            try:
                self.model = YOLO(str(fallback))
                print(f"[YoloService] Fallback model loaded: {fallback}")
            except Exception as fallback_exc:  # pragma: no cover
                print(f"[YoloService] Fallback model failed: {fallback_exc}")
                self.model = None

    @staticmethod
    def _resolve_model_path(model_path: str) -> Path:
        env_path = os.getenv("YOLO_MODEL_PATH", "").strip()
        selected = Path(env_path) if env_path else Path(model_path)
        if selected.is_absolute():
            return selected

        service_dir = Path(__file__).resolve().parent
        backend_root = service_dir.parent
        candidate = backend_root / selected
        if candidate.exists():
            return candidate

        workspace_candidate = backend_root.parent / selected
        if workspace_candidate.exists():
            return workspace_candidate

        return candidate

    @staticmethod
    def _normalize_class_name(class_name: str) -> str:
        normalized = str(class_name).strip().lower().replace(" ", "_")
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

    @staticmethod
    def _class_color(class_name: str) -> tuple[int, int, int]:
        normalized = YoloService._normalize_class_name(class_name)
        if normalized == "damaged":
            return (255, 0, 0)
        if normalized == "minor_damage":
            return (255, 255, 0)
        return (0, 255, 0)

    @staticmethod
    def _scale_bbox_from_normalized(
        normalized_bbox: list[float],
        image_shape: tuple[int, int, int],
    ) -> list[int]:
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

    def detect_buildings(self, image_rgb: np.ndarray) -> YoloDetectionResult:
        if self.model is None:
            return self._fallback_detection(image_rgb)

        predictions = self.model.predict(image_rgb, verbose=False)
        boxes: list[dict[str, Any]] = []
        annotated = image_rgb.copy()

        if predictions:
            result = predictions[0]
            names = result.names
            for box in result.boxes:
                cls_id = int(box.cls.item())
                cls_name = names.get(cls_id, str(cls_id))
                conf = float(box.conf.item())
                xyxyn = [float(v) for v in box.xyxyn[0].tolist()]
                x1, y1, x2, y2 = self._scale_bbox_from_normalized(xyxyn, image_rgb.shape)

                normalized_class = self._normalize_class_name(cls_name)
                boxes.append(
                    {
                        "class": normalized_class,
                        "raw_class": str(cls_name),
                        "confidence": round(conf, 4),
                        "bbox": [x1, y1, x2, y2],
                    }
                )

                color = self._class_color(normalized_class)
                cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
                label = f"{normalized_class} {conf:.2f}"
                text_y = max(18, y1 - 8)
                cv2.putText(
                    annotated,
                    label,
                    (x1, text_y),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.48,
                    color,
                    2,
                    cv2.LINE_AA,
                )

        return YoloDetectionResult(
            boxes=boxes,
            building_count=len(boxes),
            annotated_image=annotated,
        )

    def _fallback_detection(self, image_rgb: np.ndarray) -> YoloDetectionResult:
        gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blur, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        annotated = image_rgb.copy()
        boxes: list[dict[str, Any]] = []

        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h
            if area < 2500:
                continue
            x2, y2 = x + w, y + h
            boxes.append({"class": "no_damage", "confidence": 0.55, "bbox": [x, y, x2, y2]})
            cv2.rectangle(annotated, (x, y), (x2, y2), self._class_color("no_damage"), 2)

        return YoloDetectionResult(
            boxes=boxes,
            building_count=len(boxes),
            annotated_image=annotated,
        )
