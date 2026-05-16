# ML Visual Explorer — Architecture & Scalability Guide

## New Structure

The backend has been refactored into modular components while **maintaining 100% backward compatibility** with all existing APIs:

```
backend/
├── main.py                 # FastAPI app + all endpoints (refactored, same APIs)
├── config.py              # Environment configuration management
├── logger.py              # Structured logging
├── schemas.py             # Pydantic request models (extracted from main.py)
├── data_generators.py     # Dataset generation functions
├── utils.py               # Shared utilities (boundary, fit_status, etc.)
├── .env                   # Environment variables
├── requirements.txt       # Python dependencies (updated with dotenv, pytest)
├── Dockerfile             # Container image for backend
├── test_main.py           # Test suite for all endpoints
└── __pycache__/          # Auto-generated
```

## Key Improvements

### 1. **Configuration Management** (`config.py` + `.env`)
- No more hard-coded values
- Environment-based configuration
- Easy multi-environment setup (dev, prod, staging)

```bash
# Use .env to customize:
DEBUG=False
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 2. **Modular Organization**
- **schemas.py** — All Pydantic models for request validation
- **data_generators.py** — Dataset generation (regression + classification)
- **utils.py** — Shared functions (decision boundaries, fit status detection)
- **logger.py** — Structured logging setup

**Benefit:** Each module has a single responsibility. Easy to test, extend, and maintain.

### 3. **Logging**
- Structured logging with timestamps
- Configurable log level (INFO, DEBUG, ERROR)
- Optional file output via `.env`

```python
from logger import get_logger
logger = get_logger(__name__)
logger.info("Linear regression request: model_type=linear")
```

### 4. **Testing**
- `test_main.py` — 15+ tests covering all endpoints
- Run: `pytest backend/`
- Tests validate response structure, model types, metrics

### 5. **Docker Containerization**
- **Dockerfile** (backend) — Python 3.11 slim image
- **Frontend Dockerfile** — Node.js 18 alpine
- **docker-compose.yml** — Orchestrates both services

**Run both services:**
```bash
docker-compose up
```

Backend: http://localhost:8000
Frontend: http://localhost:3000

---

## Running the App

### Option 1: Traditional Setup (2 Terminals)

**Terminal 1 — Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Backend runs at `http://localhost:8000`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:3000`

### Option 2: Docker (Single Command)

```bash
docker-compose up
```
Both services start automatically with proper networking.

---

## Testing

Run all tests:
```bash
cd backend
pip install pytest httpx
pytest test_main.py -v
```

Expected output: All 15+ tests pass ✅

---

## All APIs Preserved

Every endpoint remains **exactly the same**:

| Endpoint | Status |
|----------|--------|
| POST `/api/linear-regression` | ✅ Working |
| GET `/api/datasets` | ✅ Working |
| POST `/api/logistic-regression` | ✅ Working |
| POST `/api/knn` | ✅ Working |
| POST `/api/svm` | ✅ Working |
| POST `/api/decision-tree` | ✅ Working |
| POST `/api/random-forest` | ✅ Working |
| POST `/api/bias-variance` | ✅ Working |
| POST `/api/compare` | ✅ Working |
| POST `/api/gradient-boosting` | ✅ Working |
| POST `/api/naive-bayes` | ✅ Working |
| POST `/api/neural-net` | ✅ Working |
| POST `/api/csv/upload` | ✅ Working |
| POST `/api/csv/run` | ✅ Working |

---

## Scalability Benefits

### Immediate (Already Done)
✅ Configuration management — easy deployment to different environments  
✅ Logging — debug production issues  
✅ Tests — catch regressions  
✅ Docker — reproducible deployments  
✅ Modular code — easier to extend  

### Next Steps (Optional)
- Add caching layer for frequently-used models
- Database persistence (experiment history, CSV data)
- API versioning (v1, v2, etc.)
- CI/CD pipeline (GitHub Actions)
- Performance monitoring & metrics

---

## File Reference

- **config.py** — All environment variables & defaults
- **logger.py** — Logging setup (can add file output, structured JSON logs)
- **schemas.py** — Pydantic models for validation
- **data_generators.py** — Regression/classification dataset generation
- **utils.py** — Boundary computation, fit status detection, scatter points
- **.env** — Local overrides for config
- **Dockerfile** — Container setup
- **test_main.py** — 15+ endpoint tests

## API Documentation

Visit `http://localhost:8000/docs` for interactive Swagger UI with all endpoints.
