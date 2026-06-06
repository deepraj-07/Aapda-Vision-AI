# AapdaVision AI

Production-ready scaffold for an AI disaster damage assessment platform.

## Final Tech Stack

- AI/ML: PyTorch, OpenCV, YOLOv8, segmentation_models_pytorch
- Backend: Flask REST API
- Frontend: Next.js + Tailwind CSS
- Database: PostgreSQL (with SQLite fallback)
- Visualization: Chart.js + Mapbox

## System Architecture

User -> Frontend (Next.js Dashboard) -> Flask Backend API -> AI Inference Engine -> YOLO Building Detection -> Damage Segmentation Model -> PostgreSQL -> Analytics Dashboard

## Project Structure

```text
aapda-vision-ai
├── backend
│   ├── app.py
│   ├── routes
│   │   └── analyze.py
│   ├── services
│   │   ├── yolo_service.py
│   │   ├── segmentation_service.py
│   │   └── heatmap_service.py
│   ├── models
│   │   └── damage_model.py
│   └── utils
│       └── image_utils.py
├── ai-training
│   ├── train.py
│   ├── dataset.py
│   └── model.py
├── frontend
│   ├── pages
│   ├── components
│   └── styles
├── data
└── requirements.txt
```

## API Endpoints

- `POST /upload-image`: Accepts image form-data field `image`.
- `POST /analyze`: Runs YOLO detection + segmentation + heatmap + DB save.
- `POST /analyze-damage`: Alias of analyze endpoint.
- `GET /report`: Returns recent analysis results.
- `GET /report?analysis_id=<id>`: Returns one report.

## Phase Plan

1. Environment setup and dependency installation
2. YOLO building detection integration
3. U-Net segmentation model pipeline
4. Heatmap overlay generation
5. Flask API integration with PostgreSQL
6. Next.js dashboard for upload, analytics, map, and report views

## Local Setup

### 1) Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r ..\requirements.txt
copy .env.example .env
python app.py
```

### 2) Frontend

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Backend default URL: `http://localhost:5000`  
Frontend default URL: `http://localhost:3000`

## Production Prompt Pack

### Master Prompt

You are helping build a production-level AI disaster damage assessment platform.

The system analyzes satellite or drone images and detects building damage after disasters.

Tech stack:

Backend:
Flask REST API
Python

AI Models:
YOLOv8 for building detection
U-Net with ResNet encoder for damage segmentation
PyTorch

Image Processing:
OpenCV

Frontend:
Next.js
React
Tailwind CSS

Database:
PostgreSQL

System flow:

1 User uploads satellite image
2 Backend preprocesses image
3 YOLO model detects buildings
4 Segmentation model predicts damage mask
5 System calculates damage percentage
6 Heatmap visualization generated
7 Results stored in database
8 Dashboard displays analytics

Build a modular Python backend architecture including:

Flask app
image upload API
AI inference service
heatmap generation
database integration

Code should be clean, modular, production-ready, and structured using service layers.

### YOLO Prompt

Create a Python module using YOLOv8 to detect buildings in satellite images.

Requirements:

Load pretrained YOLO model
Accept image input
Return bounding boxes
Return building count
Save detection image with bounding boxes

Use OpenCV for image reading and visualization.

### Segmentation Prompt

Create a PyTorch implementation of a U-Net segmentation model using segmentation_models_pytorch.

The model should classify satellite image pixels into 4 damage classes:

0 no damage
1 minor damage
2 major damage
3 destroyed

Include training pipeline and inference function.

### Flask Prompt

Create a Flask backend for an AI disaster detection platform.

Endpoints required:

POST /upload-image
Accept satellite image file

POST /analyze
Run building detection and damage segmentation

GET /report
Return JSON with:

total buildings
damaged buildings
damage percentage
risk level

Use modular architecture with services folder.

### Frontend Prompt

Create a Next.js dashboard UI for an AI disaster damage assessment system.

Features:

image upload
damage heatmap display
damage statistics cards
interactive map visualization
downloadable report

Use Tailwind CSS and make the UI feel like a premium modern disaster-response intelligence dashboard.
