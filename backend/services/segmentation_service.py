from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np
import torch

try:
    import segmentation_models_pytorch as smp
except ImportError:  # pragma: no cover
    smp = None


@dataclass
class SegmentationResult:
    mask: np.ndarray
    damaged_buildings: int
    damage_percentage: float


class SegmentationService:
    def __init__(self) -> None:
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = self._build_model()

    def _build_model(self):
        if smp is None:
            return None
        model = smp.Unet(
            encoder_name="resnet34",
            encoder_weights=None,
            in_channels=3,
            classes=4,
        )
        model.to(self.device)
        model.eval()
        return model

    def predict_damage(
        self,
        image_rgb: np.ndarray,
        building_boxes: list[dict],
    ) -> SegmentationResult:
        if self.model is None:
            return self._fallback_predict(image_rgb, building_boxes)

        image = cv2.resize(image_rgb, (512, 512)).astype(np.float32) / 255.0
        tensor = torch.from_numpy(image).permute(2, 0, 1).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(tensor)
            mask = torch.argmax(logits, dim=1).squeeze(0).cpu().numpy().astype(np.uint8)

        damage_pixels = np.isin(mask, [1, 2, 3]).sum()
        total_pixels = mask.size
        damage_percentage = float(damage_pixels / max(total_pixels, 1) * 100.0)

        damaged_buildings = self._estimate_damaged_buildings(mask, building_boxes, image_rgb.shape)
        return SegmentationResult(mask=mask, damaged_buildings=damaged_buildings, damage_percentage=damage_percentage)

    def _estimate_damaged_buildings(
        self,
        mask: np.ndarray,
        building_boxes: list[dict],
        original_shape: tuple[int, int, int],
    ) -> int:
        if not building_boxes:
            return 0

        h, w = original_shape[:2]
        resized = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)
        damaged = 0
        for item in building_boxes:
            x1, y1, x2, y2 = item["bbox"]
            roi = resized[y1:y2, x1:x2]
            if roi.size == 0:
                continue
            ratio = np.isin(roi, [1, 2, 3]).sum() / roi.size
            if ratio > 0.2:
                damaged += 1
        return damaged

    def _fallback_predict(
        self,
        image_rgb: np.ndarray,
        building_boxes: list[dict],
    ) -> SegmentationResult:
        hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
        value = hsv[:, :, 2]

        mask = np.zeros(image_rgb.shape[:2], dtype=np.uint8)
        mask[value < 60] = 3
        mask[(value >= 60) & (value < 110)] = 2
        mask[(value >= 110) & (value < 150)] = 1

        damage_pixels = np.isin(mask, [1, 2, 3]).sum()
        damage_percentage = float(damage_pixels / max(mask.size, 1) * 100.0)
        damaged_buildings = self._estimate_damaged_buildings(mask, building_boxes, image_rgb.shape)

        return SegmentationResult(mask=mask, damaged_buildings=damaged_buildings, damage_percentage=damage_percentage)
