# Quick Start

## 🚀 Option 1: Docker (Recommended)

**One command to run everything:**

```bash
docker-compose up
```

Then open: http://localhost:3000

Backend API: http://localhost:8000/docs

---

## 🔧 Option 2: Local Setup

**Terminal 1 — Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Runs on: http://localhost:8000

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Runs on: http://localhost:3000

---

## 📚 What Can You Do?

- **Visualize 11 ML Models** — Linear Regression, Logistic Regression, KNN, SVM, Decision Tree, Random Forest, Gradient Boosting, Naive Bayes, Neural Network, and more
- **Interactive Hyperparameter Tuning** — Adjust sliders to see live model updates
- **Decision Boundaries** — Visualize classification boundaries in 2D space
- **Bias-Variance Tradeoff** — Understand overfitting vs underfitting
- **Model Comparison** — Compare two models side-by-side
- **CSV Upload** — Train models on your own datasets
- **Real-time Metrics** — See train/test accuracy, R², MSE, confusion matrices

---

## 🧪 Run Tests

```bash
cd backend
pytest test_main.py -v
```

All 15+ endpoint tests should pass ✅

---

## 📖 Documentation

- **ARCHITECTURE.md** — How the code is organized
- **DEPLOYMENT.md** — Deploy to production
- **API Docs** — http://localhost:8000/docs (interactive Swagger)

---

## 🛑 Stop Services

```bash
# Docker
docker-compose down

# Local
Ctrl+C in both terminals
```

---

## ❓ Troubleshooting

**Backend won't start:**
```bash
pip install -r requirements.txt
```

**Frontend can't connect to backend:**
- Check backend is running on port 8000
- In Docker: services connect via `backend:8000`

**Port already in use:**
```bash
# Change in .env or docker-compose.yml
PORT=8001
```

---

## 📁 Project Structure

```
ml-explorer/
├── backend/           # FastAPI + ML models (Python)
│   ├── main.py       # All 14 API endpoints
│   ├── config.py     # Configuration
│   ├── schemas.py    # Request models
│   ├── data_generators.py
│   ├── utils.py
│   └── requirements.txt
├── frontend/          # React + Vite (JavaScript)
│   ├── src/
│   │   ├── components/  # 12+ model components
│   │   ├── api/
│   │   └── App.jsx
│   └── package.json
└── docker-compose.yml # Single command deployment
```

---

**Happy learning! 🧠**
