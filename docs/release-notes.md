# Release Notes & Large-file Handling

This document describes recommended practices for releasing Aapda-Vision-AI on GitHub and handling large model weights and datasets.

## Large files (do NOT keep in repo)
- Model weights: `*.pt`, `*.pth`, `*.onnx`, `weights/`, `models/` — these are large binary files and should be provided as release assets or hosted externally (S3, Google Cloud, etc.).
- Datasets and generated outputs: `data/uploads/`, `data/outputs/`, `datasets/` — keep only representative samples (or none) in the repo.

## Recommended workflow
1. Remove model files from the repository history if they were previously committed. Use `git filter-repo` or BFG to purge large binaries and then rotate any keys if necessary.
2. Upload final trained weights to GitHub Releases, or provide a download script that fetches from a cloud store.
3. Add small sample models (if helpful) under `ai-training/samples/` (kept small <10MB).

## How to reference models in production
- Place model files in a local path not tracked by git (for example, use environment variable `MODEL_PATH` pointing to the downloaded file in `instance/weights/`).
- Example `.env` entry:

```
MODEL_PATH=instance/weights/damage_classifier_best.pth
```

## CI / Release automation
- Create a release build step that uploads model artifacts as release assets.
- Include checksums for model artifacts and a short verification script.
