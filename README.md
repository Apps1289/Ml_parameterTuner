# 🧠 ML Visual Explorer

> Interactive hyperparameter visualization for machine learning models — no code needed.

## Quick Start

You need **two terminals** — one for backend, one for frontend.

### Terminal 1 — Backend (FastAPI + scikit-learn)

```bash
cd ml-explorer
chmod +x start_backend.sh
./start_backend.sh
```

Backend runs at: http://localhost:8000  
API docs at: http://localhost:8000/docs

### Terminal 2 — Frontend (React + Vite)

```bash
cd ml-explorer
chmod +x start_frontend.sh
./start_frontend.sh
```

Frontend runs at: http://localhost:3000

---

## Project Structure

```
ml-explorer/
├── backend/
│   ├── main.py            ← FastAPI app, all ML models
│   └── requirements.txt   ← Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx                         ← Main layout + navigation
│   │   ├── api/index.js                    ← API client
│   │   └── components/
│   │       ├── LinearRegression.jsx        ← Main interactive page
│   │       ├── SliderControl.jsx           ← Reusable slider
│   │       ├── MetricCard.jsx              ← R², MSE cards
│   │       └── FitStatusBadge.jsx          ← Overfitting/underfitting badge
│   ├── index.html
│   └── package.json
├── start_backend.sh
└── start_frontend.sh
```

---

## Phase 1 — What's Built

### Models
- ✅ Linear Regression
- ✅ Polynomial Regression (degree 1–10)
- ✅ Ridge Regression (L2 regularization)
- ✅ Lasso Regression (L1 regularization)
- ✅ ElasticNet (L1 + L2)

### Datasets
- ✅ Linear trend
- ✅ Polynomial (quadratic)
- ✅ High noise
- ✅ Sine wave

### Features
- ✅ Live graph updates on every slider change (debounced 300ms)
- ✅ Train/test split with color-coded scatter points
- ✅ R² and MSE metrics (train + test)
- ✅ Overfitting / underfitting detector badge
- ✅ Coefficient display
- ✅ Parameter tooltips explaining each hyperparameter

---

## Coming in Phase 2
- Logistic Regression + decision boundaries
- KNN, SVM, Decision Tree, Random Forest
- Dataset upload (CSV)
- Side-by-side model comparison
- Bias-variance tradeoff curve
