# ML Visual Explorer — Live Localhost Setup

## Quick Start (2 Terminals)

### Terminal 1: Start Backend

```bash
cd backend
python main.py
```

**Expected Output:**
```
2026-05-15 12:54:09,842 - __main__ - INFO - Starting ML Visual Explorer API
INFO:     Started server process [19800]
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Backend is ready at: **http://localhost:8000**
API Docs: **http://localhost:8000/docs**

---

### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in 234 ms

  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

Frontend is ready at: **http://localhost:3000**

---

## Step-by-Step Explanation

### What Each Service Does

**Backend (Port 8000)**
- Runs the FastAPI server
- Provides 14 ML model APIs
- Handles data generation, model training, predictions
- Written in: Python + FastAPI + scikit-learn

**Frontend (Port 3000)**
- React application with interactive UI
- Real-time model visualization
- Slider controls for hyperparameter tuning
- Written in: React + Vite + Tailwind CSS

### Flow When You Use the App

```
User Interaction (Browser)
         ↓
Frontend React App (localhost:3000)
         ↓
Sends AJAX request to Backend
         ↓
Backend FastAPI Server (localhost:8000)
         ↓
Trains ML Model (scikit-learn)
         ↓
Returns JSON Response
         ↓
Frontend Updates Visualization
         ↓
User Sees Updated Graph
```

---

## Testing Each Endpoint

### 1. Test Backend Root Endpoint

```bash
curl http://localhost:8000/
```

**Response:**
```json
{"status": "ML Visual Explorer API running"}
```

### 2. Test Linear Regression API

```bash
curl -X POST http://localhost:8000/api/linear-regression \
  -H "Content-Type: application/json" \
  -d '{"dataset":"linear", "model_type":"linear"}'
```

### 3. Interactive API Documentation

Visit: **http://localhost:8000/docs**
- Try all endpoints directly from the browser
- See request/response schemas
- Test with different parameters

---

## Windows: Easy Startup Scripts

We created two batch files for convenience:

### START_BACKEND.bat
- Located in: `ml-explorer-phase5-complete/`
- Double-click to start backend on port 8000
- Window will show all logs in real-time

### START_FRONTEND.bat
- Located in: `ml-explorer-phase5-complete/`
- Double-click to start frontend on port 3000
- Window will show Vite dev server logs

**Usage:**
1. Double-click `START_BACKEND.bat` → Starts on port 8000
2. Wait 3-5 seconds
3. Double-click `START_FRONTEND.bat` → Starts on port 3000
4. Browser should open at `http://localhost:3000`

---

## Using the Application

### 1. Open in Browser
Navigate to: **http://localhost:3000**

### 2. Select a Model
- Click on any model in the left sidebar
- Linear Regression, Logistic Regression, KNN, SVM, Decision Tree, etc.

### 3. Adjust Hyperparameters
- Use sliders to change model parameters
- See live updates in real-time
- Watch the graph and metrics change

### 4. Understand the Visualization
- **Blue dots** = Training data
- **Orange dots** = Test data
- **Graph/Boundary** = Model prediction
- **Metrics** = R², MSE, Accuracy, Confusion Matrix
- **Status badge** = Underfitting/Good/Overfitting

### 5. Try Different Datasets
- Each model has different dataset options
- Linear, Polynomial, High Noise, Sine Wave (for regression)
- Moons, Circles, Blobs, Linear (for classification)

### 6. Compare Models
- Go to "Compare" section
- Choose 2 models to compare side-by-side
- See how different models perform on same data

### 7. Upload Your Own Data
- CSV Upload section
- Select X, Y features and label column
- Train models on your custom dataset

---

## Troubleshooting

### Issue: "Port 8000 already in use"

**Solution:**
```bash
# Windows - Find process using port 8000
netstat -ano | findstr :8000

# Kill process (replace XXXX with PID)
taskkill /PID XXXX /F

# Then restart backend
python main.py
```

### Issue: Frontend can't connect to backend

**Cause:** Backend on port 8000 not running

**Solution:**
1. Make sure Terminal 1 shows "Application startup complete"
2. Check: `curl http://localhost:8000/` in another terminal
3. If that works, frontend should connect automatically

### Issue: npm command not found

**Solution:**
```bash
# Install Node.js from: https://nodejs.org/
# Then reinstall dependencies:
cd frontend
npm install
npm run dev
```

### Issue: Python module not found

**Solution:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

---

## What's Happening Behind the Scenes

### Backend Startup (main.py)
```
1. Loads configuration from .env
2. Sets up logging (logs all requests)
3. Creates FastAPI app instance
4. Registers 14 API endpoints
5. Adds CORS middleware (allows frontend to connect)
6. Starts Uvicorn server on port 8000
7. Waits for requests
```

### Frontend Startup (npm run dev)
```
1. Vite starts development server
2. Watches for file changes
3. Hot module replacement (HMR) enabled
4. Opens dev server on port 3000
5. Connects to backend at http://localhost:8000
6. Ready for browser requests
```

### User Request Flow
```
User clicks slider → Frontend React state updates
                  → useEffect triggers API call
                  → Fetch to http://localhost:8000/api/linear-regression
                  → Backend receives request
                  → Trains model with new parameters
                  → Returns JSON with predictions & metrics
                  → Frontend receives response
                  → Updates graph and metrics display
                  → User sees changes in ~300ms
```

---

## Architecture Overview

```
Your Computer (localhost)
│
├─ Backend Server (Port 8000)
│  ├─ main.py ─────────────────── FastAPI app + all endpoints
│  ├─ config.py ────────────────── Configuration from .env
│  ├─ schemas.py ───────────────── Request validation
│  ├─ data_generators.py ───────── Dataset generation
│  ├─ utils.py ──────────────────── Shared functions
│  └─ logger.py ─────────────────── Structured logging
│
├─ Frontend Server (Port 3000)
│  ├─ src/App.jsx ───────────────── Main component + navigation
│  ├─ src/components/ ───────────── 12+ model visualizations
│  ├─ src/api/index.js ──────────── API client (communicates with backend)
│  └─ vite.config.js ────────────── Build configuration
│
└─ Browser (http://localhost:3000)
   └─ React App Interface
```

---

## Performance Notes

- **First API call:** ~1-2 seconds (model training time)
- **Subsequent calls:** ~300-500ms (depends on model complexity)
- **Decision boundaries:** Computed in <500ms
- **Large datasets:** May take 2-5 seconds

---

## Next Steps

1. **Explore all 11 models** — Try each one to learn how they work
2. **Adjust hyperparameters** — See how changes affect model performance
3. **View API docs** — Visit http://localhost:8000/docs for interactive docs
4. **Run tests** — `pytest backend/` to verify everything works
5. **Deploy to production** — See DEPLOYMENT.md for cloud hosting

---

## Commands Reference

```bash
# Backend only
cd backend && python main.py

# Frontend only
cd frontend && npm run dev

# Run tests
cd backend && pytest test_main.py -v

# View logs (backend)
cat backend.log

# Kill process on port 8000
taskkill /F /IM python.exe

# Restart everything
# Terminal 1: cd backend && python main.py
# Terminal 2: cd frontend && npm run dev
```

---

**Your app is now live! Open http://localhost:3000 in your browser and start exploring ML models. 🚀**
