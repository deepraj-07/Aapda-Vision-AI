<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=00C9A7&height=200&section=header&text=AapdaVision%20AI&fontSize=50&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Transparent%20Damage%20Analytics%20for%20India&descAlignY=55&descSize=18" width="100%"/>

<br/>

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

<br/>

> **See the Damage. Save Lives Faster.**
>
> AapdaVision AI turns satellite and drone imagery into actionable disaster intelligence —
> with building detection, damage segmentation, and on-map risk insights.

<br/>

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-00C9A7?style=for-the-badge&logoColor=white)](https://your-demo-link.vercel.app)
[![Stars](https://img.shields.io/github/stars/deepraj-07/aapda-vision-ai?style=for-the-badge&color=00C9A7)](https://github.com/deepraj-07/aapda-vision-ai/stargazers)
[![Issues](https://img.shields.io/github/issues/deepraj-07/aapda-vision-ai?style=for-the-badge&color=EE4C2C)](https://github.com/deepraj-07/aapda-vision-ai/issues)
[![License](https://img.shields.io/github/license/deepraj-07/aapda-vision-ai?style=for-the-badge&color=4169E1)](LICENSE)

<br/>

[🎯 Features](#-features) &nbsp;•&nbsp; [🏗️ Architecture](#%EF%B8%8F-architecture) &nbsp;•&nbsp; [⚙️ Getting Started](#%EF%B8%8F-getting-started) &nbsp;•&nbsp; [📡 API](#-api-reference) &nbsp;•&nbsp; [📸 Screenshots](#-screenshots)

<br/>

![visitors](https://visitor-badge.laobi.icu/badge?page_id=deepraj-07.aapda-vision-ai&left_color=00C9A7&right_color=0D1117)

</div>

---

## 📸 Screenshots

<div align="center">

### 🏠 Dashboard — Disaster Intelligence Platform
<img src="docs/screenshots/dashboard.png" width="100%" alt="AapdaVision Dashboard"/>

<br/>

### 📤 Image Upload · Location Map · Operational Response
<img src="docs/screenshots/img-upload.png" width="100%" alt="Image Upload and Map"/>

<br/>

### 🔍 Analysis Output — YOLOv8 Building Detection
<img src="docs/screenshots/analysis-output.png" width="100%" alt="Before and After Analysis"/>

<br/>

### 📊 AI Insights — Damage Stats & Field Recommendations
<img src="docs/screenshots/ai-insights.png" width="100%" alt="AI Insights Dashboard"/>

<br/>

### 🏥 Nearby NGOs & Relief Centers
<img src="docs/screenshots/nearby-ngos.png" width="100%" alt="Nearby NGOs"/>

<br/>

### 📡 Live Disaster Timeline & Urgent Campaigns
<table width="100%">
  <tr>
    <td width="50%"><img src="docs/screenshots/disaster-timeline.png" width="100%" alt="Disaster Timeline"/></td>
    <td width="50%"><img src="docs/screenshots/urgent-campaigns.png" width="100%" alt="Urgent Campaigns"/></td>
  </tr>
</table>

</div>

---

## 🎯 Problem Statement

During disasters, rapid damage assessment is critical — yet traditional methods are:

- ❌ **Slow** — ground surveys take days or weeks
- ❌ **Dangerous** — putting responders at risk in unstable zones
- ❌ **Inconsistent** — manual scoring varies across assessors
- ❌ **Unscalable** — can't cover large affected areas quickly

---

## 🚀 Solution

**AapdaVision AI** automates satellite/drone imagery analysis end-to-end:

- ✅ YOLOv8 building detection with bounding boxes
- ✅ U-Net damage segmentation per building
- ✅ Risk scoring: `Low` · `Moderate` · `High` · `Critical`
- ✅ Actionable field recommendations auto-generated
- ✅ Nearby NGO & relief center locator
- ✅ Live disaster intelligence dashboard
- ✅ Transparent relief campaigns with funding tracker

---

## ✨ Features

### 🛰️ Image Upload & Analysis
- Accepts satellite or drone images via drag-and-drop
- YOLOv8 object detection draws bounding boxes per building
- U-Net + ResNet backbone segments damage masks with **89%+ model confidence**

### 📊 AI Insights Dashboard
- Outputs: `total_buildings`, `damaged_buildings`, `damage_%`, `damage_class`, `model_confidence`
- Actionable recommendations: ambulances required, rescue teams, evacuation status
- Advanced ML Insights: urgency level, avg building risk, recommended teams

### 🗺️ Interactive Map & Location
- Leaflet map with clickable coordinates
- Disaster Safety Insights by zone (Flood, Earthquake, Fire/Landslide)
- Operational Response Panel with Response Priority Index

### 🏥 Nearby NGO Finder
- Auto-fetches relief centers by city/state
- Shows contact info, coordinates, and service type (Medical Aid / Search & Rescue / Food Relief)

### 📡 Live Disaster Intelligence
- Aggregate stats across all analyses: total events, high-risk alerts, avg damage %
- Disaster Timeline with per-location logs
- Active Campaign Signals for NGO coordination

### 💰 Relief Campaigns
- Gov-verified campaigns with funding progress
- Contribute Relief flow for donors

---

## 🏗️ Architecture

```
User (Browser)
     │
     ▼
Next.js Frontend  ──────────────────────────────────────┐
(Upload / Dashboard / Campaigns / Risk AI)              │
     │                                                  │
     ▼                                                  ▼
Flask REST API (app.py)                        PostgreSQL DB
     │                                       (analyses, campaigns,
     ├──► YOLOv8 Service      → Building detection        NGO data)
     ├──► U-Net Segmentation  → Damage mask per building
     ├──► ML Pipeline         → Scoring, risk classification
     ├──► Heatmap Service     → Visual overlays
     ├──► NGO Service         → Nearby relief centers
     └──► SHAP Explainer      → Feature attribution
```

**End-to-End Flow:**
```
Upload Image → YOLO Detection → U-Net Segmentation
    → Damage Scoring → Heatmap → DB Persist
        → Dashboard · Recommendations · NGO Locator · Report
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask, Flask-CORS, Flask-SQLAlchemy |
| AI / Detection | PyTorch, YOLOv8 (Ultralytics) |
| AI / Segmentation | segmentation_models_pytorch (U-Net + ResNet) |
| Explainability | SHAP, matplotlib, seaborn |
| Image Processing | OpenCV, Pillow |
| Frontend | Next.js, React, Tailwind CSS |
| Maps | Leaflet, OpenStreetMap |
| Charts | Chart.js |
| Database | PostgreSQL (psycopg2), SQLite fallback |

---

## ⚙️ Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL (or SQLite for local dev)

### Backend

```bash
git clone https://github.com/deepraj-07/aapda-vision-ai.git
cd aapda-vision-ai

python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env             # Fill in your values
python backend/app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

---

## 🔐 Environment Variables

```env
FLASK_APP=backend.app
FLASK_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/aapda_vision
SECRET_KEY=your_secret_key_here
MODEL_PATH=instance/best.pt
YOLO_MODEL_PATH=backend/yolov8n.pt
DAMAGE_MODEL_PATH=backend/models/damage_classifier_best.pth
FRONTEND_URL=http://localhost:3000
```

> ⚠️ Never commit `.env` to Git. Use `.env.example` for safe defaults.

---

## 📡 API Reference

### `POST /upload-image`
Upload a satellite or drone image.

**Request:** `multipart/form-data` — field: `image` (PNG/JPG)

**Response:**
```json
{ "analysis_id": "abc123", "message": "Image received. Analysis started." }
```

### `POST /analyze`
Runs YOLO detection + U-Net segmentation, returns full damage report.

**Request:** `{ "analysis_id": "abc123" }`

**Response:**
```json
{
  "analysis_id": "abc123",
  "total_buildings": 35,
  "damaged_buildings": 34,
  "damage_percentage": 97.14,
  "damage_class": "Destroyed",
  "risk_level": "HIGH",
  "model_confidence": 0.892,
  "annotated_image_url": "/outputs/abc123_annotated.jpg",
  "heatmap_url": "/outputs/abc123_heatmap.jpg"
}
```

### `GET /report`
- No params → list of all analyses
- `?analysis_id=abc123` → single result

---

## 📁 Project Structure

```
aapda-vision-ai/
├── .github/workflows/
├── backend/
│   ├── app.py
│   ├── inference.py
│   ├── analyze.py
│   ├── damage_model.py
│   ├── image_utils.py
│   ├── models/
│   │   ├── best.pt
│   │   ├── yolov8n.pt
│   │   └── damage_classifier_best.pth
│   └── services/
│       ├── yolo_service.py
│       ├── segmentation_service.py
│       ├── heatmap_service.py
│       ├── ml_pipeline.py
│       └── ngo_service.py
├── frontend/
│   ├── pages/
│   ├── components/
│   └── styles/
├── ai-training/
│   ├── dataset.py
│   ├── model.py
│   └── train.py
├── docs/
│   └── screenshots/
├── data/
├── requirements.txt
├── package.json
└── .env.example
```

---

## 🤖 Model Weights

> ⚠️ Do NOT commit `.pt` / `.pth` files to Git. Use [Git LFS](https://git-lfs.github.com/) or store on S3/GDrive.

| File | Purpose |
|---|---|
| `yolov8n.pt` | YOLOv8 nano — building detection |
| `best.pt` | Fine-tuned YOLO — domain-specific |
| `damage_classifier_best.pth` | U-Net/ResNet — damage segmentation |

### Retraining

```bash
cd ai-training
python dataset.py --data_dir data/raw --output_dir data/processed
python train.py --epochs 50 --batch_size 16 --model_save_path ../instance/best.pt
```

---

## 🗄️ Database Setup

```bash
psql -U postgres -c "CREATE DATABASE aapda_vision;"
# SQLAlchemy auto-creates tables on first run
# Falls back to instance/app.db (SQLite) if DATABASE_URL is not set
```

---

## ⚠️ Ethics & Limitations

- Not validated for all geographic regions or building types
- Low-resolution or cloudy imagery may reduce accuracy
- **Must not be used as the sole basis for life-critical decisions** — always verify with ground truth

---

## 📌 Roadmap

- [ ] User authentication & role-based access (Responder / Analyst / Admin)
- [ ] Mobile PWA for field teams
- [ ] Multi-zone batch analysis
- [ ] Auto-generated PDF damage reports
- [ ] GeoJSON export for GIS tools
- [ ] Real-time WebSocket inference updates

---

## 🙏 Acknowledgements

- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics)
- [segmentation_models_pytorch](https://github.com/qubvel/segmentation_models.pytorch)
- [SHAP](https://github.com/slundberg/shap)
- [Leaflet](https://leafletjs.com/) & [OpenStreetMap](https://www.openstreetmap.org/)

---

<div align="center">

**Built solo with ❤️ for faster disaster response**

[![GitHub](https://img.shields.io/badge/Deep_Raj-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/deepraj-07)

*AapdaVision AI — Disaster Intelligence Platform*

</div>