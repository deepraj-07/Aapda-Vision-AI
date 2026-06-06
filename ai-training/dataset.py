from __future__ import annotations

import os

import cv2
import numpy as np
import torch
from torch.utils.data import Dataset


class DamageDataset(Dataset):
    def __init__(self, image_dir: str, mask_dir: str, image_size: tuple[int, int] = (512, 512)) -> None:
        self.image_dir = image_dir
        self.mask_dir = mask_dir
        self.image_size = image_size
        self.images = [f for f in os.listdir(image_dir) if f.lower().endswith((".png", ".jpg", ".jpeg", ".tif", ".tiff"))]

    def __len__(self) -> int:
        return len(self.images)

    def __getitem__(self, idx: int):
        image_name = self.images[idx]
        image_path = os.path.join(self.image_dir, image_name)
        mask_path = os.path.join(self.mask_dir, image_name)

        image = cv2.imread(image_path)
        if image is None:
            raise FileNotFoundError(f"Could not read image: {image_path}")
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = cv2.resize(image, self.image_size).astype(np.float32) / 255.0

        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if mask is None:
            raise FileNotFoundError(f"Could not read mask: {mask_path}")
        mask = cv2.resize(mask, self.image_size, interpolation=cv2.INTER_NEAREST).astype(np.int64)
        mask = np.clip(mask, 0, 3)

        image_tensor = torch.from_numpy(image).permute(2, 0, 1)
        mask_tensor = torch.from_numpy(mask)
        return image_tensor, mask_tensor
