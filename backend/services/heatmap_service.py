import cv2
import numpy as np


class HeatmapService:
    def create_heatmap_overlay(self, image_rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
        if mask.shape[:2] != image_rgb.shape[:2]:
            mask = cv2.resize(mask, (image_rgb.shape[1], image_rgb.shape[0]), interpolation=cv2.INTER_NEAREST)

        normalized = np.zeros_like(mask, dtype=np.uint8)
        normalized[mask == 1] = 85
        normalized[mask == 2] = 170
        normalized[mask == 3] = 255

        heatmap = cv2.applyColorMap(normalized, cv2.COLORMAP_TURBO)
        heatmap_rgb = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        overlay = cv2.addWeighted(image_rgb, 0.72, heatmap_rgb, 0.28, 0)
        return overlay
