@echo off
REM 🚀 AAPDA Vision AI - GETTING STARTED (Windows)
REM ===============================================

setlocal enabledelayedexpansion

echo.
echo 🚀 AapdaVision AI - Getting Started (Windows)
echo ============================================
echo.

REM Step 1: Check Prerequisites
echo Step 1: Checking Prerequisites...
python --version 2>nul || echo ❌ Python not found in PATH
node --version 2>nul || echo ❌ Node.js not found in PATH
echo.

REM Step 2: Backend Setup
echo Step 2: Backend Setup Instructions
echo -----------------------------------
echo 📁 Navigate to backend directory:
echo    cd backend
echo.
echo 🔧 Create virtual environment:
echo    python -m venv .venv
echo    .venv\Scripts\activate
echo.
echo 📦 Install dependencies:
echo    pip install -r requirements.txt
echo.
echo 🗄️  Create .env file (copy this):
echo    set FLASK_ENV=development
echo    set DATABASE_URL=sqlite:///aapda_vision_ai.db
echo    set PORT=5000
echo    set UPLOAD_FOLDER=data/uploads
echo    set OUTPUT_FOLDER=data/outputs
echo.
echo    OR create .env file with these lines in Notepad
echo.
echo 🚀 Run backend server:
echo    python app.py
echo.
echo Expected Output:
echo    * Serving Flask app 'app'
echo    * Running on http://0.0.0.0:5000
echo    ✓ Model loaded successfully
echo.

REM Step 3: Frontend Setup
echo Step 3: Frontend Setup Instructions (NEW TERMINAL)
echo --------------------------------------------------
echo 📁 Open NEW Command Prompt and Navigate to frontend:
echo    cd frontend
echo.
echo 📦 Install dependencies:
echo    npm install
echo.
echo 🚀 Run frontend dev server:
echo    npm run dev
echo.
echo Expected Output:
echo    - ready started server on 0.0.0.0:3000, url: http://localhost:3000
echo.

REM Step 4: Test the System
echo Step 4: Test the System
echo -----------------------
echo 🌐 Open browser: http://localhost:3000
echo.
echo 📸 Upload Test Image:
echo    1. Click 'Upload Image' or drag an image
echo    2. Enter latitude/longitude (or use GPS)
echo    3. Click 'Analyze Disaster Image'
echo.
echo ✅ Expected Results:
echo    - Damage percentage displayed
echo    - Severity gauge (Green/Yellow/Red)
echo    - SHAP feature importance
echo    - Assigned NGO
echo    - Alert status if damage ^> 60%%
echo.

REM Step 5: Test APIs
echo Step 5: Test APIs with curl
echo --------------------------
echo.
echo Test Health:
echo    curl http://localhost:5000/health
echo.
echo Get All Logs:
echo    curl http://localhost:5000/api/logs
echo.
echo Get ML Insights:
echo    curl http://localhost:5000/api/ml-insights
echo.

REM Step 6: Use Your Model
echo Step 6: Use Your Trained Model
echo ----------------------------
echo ⚙️  Copy your model file:
echo    1. Find your trained model (e.g., damage_classifier.pkl)
echo    2. Copy to: backend\models\damage_classifier.pkl
echo    3. Restart backend - system auto-loads your model!
echo.

REM Step 7: Update NGO Data
echo Step 7: Update NGO Data (Optional)
echo --------------------------------
echo 📋 Edit NGO dataset:
echo    notepad backend\data\ngo_dataset.json
echo.
echo Update these fields for each NGO:
echo  - name
echo  - latitude/longitude
echo  - contact_email
echo  - specialization
echo  - service_radius_km
echo.

REM Troubleshooting
echo Step 8: Troubleshooting
echo ------------------
echo.
echo Problem: Module not found errors
echo Solution: pip install -r requirements.txt --force-reinstall
echo.
echo Problem: Cannot connect to backend
echo Solution: 
echo  - Check backend running: curl http://localhost:5000/health
echo  - Check Windows Firewall settings
echo.
echo Problem: Database locked
echo Solution:
echo  - Delete: backend\aapda_vision_ai.db
echo  - Restart backend
echo.
echo Problem: Port already in use
echo Solution:
echo  - Change FLASK_PORT in .env file
echo  - Or find process: netstat -ano ^| findstr :5000
echo.

REM Success
echo.
echo ✅ READY TO GO!
echo ================
echo.
echo 1. ✅ Backend running on http://localhost:5000
echo 2. ✅ Frontend running on http://localhost:3000
echo 3. 📸 Upload test image
echo 4. 🎯 See predictions and NGO assignment
echo 5. 📊 Check disaster logs table
echo 6. 🚀 Ready for production!
echo.
echo For detailed docs, see:
echo  - IMPLEMENTATION_GUIDE.md
echo  - README_IMPLEMENTATION.md
echo  - IMPLEMENTATION_COMPLETE.py
echo.
echo Good luck! 🎉
echo.
pause
