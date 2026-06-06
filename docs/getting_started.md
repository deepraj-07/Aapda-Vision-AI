# Getting Started — Aapda Vision AI

This document consolidates the quick-start steps for running the project locally.

## Prerequisites
- Python 3.10+
- Node.js 16+

## Backend
1. Change to the backend directory:

   cd backend

2. Create and activate a virtual environment:

   python -m venv .venv
   # On Linux/macOS
   source .venv/bin/activate
   # On Windows (PowerShell)
   .venv\Scripts\Activate.ps1

3. Install dependencies:

   pip install -r requirements.txt

4. Create a `.env` file from the provided example:

   cp ../.env.example .env

5. Run the backend server:

   python app.py

## Frontend
1. Open a new terminal and change to `frontend`:

   cd frontend

2. Install dependencies:

   npm install

3. Run the dev server:

   npm run dev

Access the app at `http://localhost:3000` and the backend at `http://localhost:5000`.

## Testing the APIs
- Health check: `curl http://localhost:5000/health`
- Predict (example):

```
curl -X POST http://localhost:5000/api/predict \
  -F 'image=@/path/to/image.jpg' \
  -F 'latitude=28.6139' \
  -F 'longitude=77.2090' \
  -F 'location_name=Delhi'
```

## Notes
- Place trained model weights outside of the repository and reference them via environment variables or download scripts. See `docs/release-notes.md` for recommendations.
