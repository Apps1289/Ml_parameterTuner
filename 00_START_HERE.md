# START HERE: Get Your App Running

## ✅ Prerequisites Check

- [x] Python 3.12.2 ✓
- [x] Node.js v22.15.0 ✓
- [x] npm 11.3.0 ✓
- [x] Backend dependencies installed ✓
- [x] Frontend dependencies installed ✓

---

## 🚀 Quick Start (2 Minutes)

### Option A: Windows Users (Easiest)

**Step 1:** Open `ml-explorer-phase5-complete` folder  
**Step 2:** Double-click `START_BACKEND.bat`
- Wait for message: "Application startup complete"
- Leave window open

**Step 3:** Double-click `START_FRONTEND.bat`
- Wait for message: "Local: http://localhost:3000"
- Browser should open automatically

**Step 4:** Start using the app at http://localhost:3000

---

### Option B: Manual (All Platforms)

**Terminal 1:**
```bash
cd ml-explorer-phase5-complete
cd backend
python main.py
```

Wait for output:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Terminal 2:**
```bash
cd ml-explorer-phase5-complete
cd frontend
npm run dev
```

Wait for output:
```
➜  Local:   http://localhost:3000/
```

**Step 3:** Open browser to **http://localhost:3000**

---

## 📡 Services Running

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend (React)** | http://localhost:3000 | User interface |
| **Backend API** | http://localhost:8000 | ML model server |
| **API Docs** | http://localhost:8000/docs | Interactive API explorer |

---

## 🎯 What You Can Do

### 1. Train ML Models Interactively
- 11 different algorithms (Linear Regression, SVM, KNN, Neural Networks, etc.)
- Adjust hyperparameters with sliders
- See real-time visualizations

### 2. Understand Model Behavior
- Train/test split visualization
- Performance metrics (R², MSE, Accuracy)
- Overfitting/Underfitting detection
- Decision boundaries for classifiers

### 3. Compare Models
- Run 2 models side-by-side
- See which performs better
- Try different datasets

### 4. Upload Custom Data
- CSV upload support
- Train models on your own datasets
- Two-class classification

---

## 📊 Example: Linear Regression

1. Go to **Linear Regression** in sidebar
2. Select dataset: "Linear", "Polynomial", "High Noise", or "Sine Wave"
3. Choose model: "Linear", "Polynomial", "Ridge", "Lasso", "ElasticNet"
4. Adjust sliders:
   - Samples: 20-200
   - Noise: 0.1-1.0
   - Degree (for polynomial): 1-10
   - Alpha values (for regularization)
5. Watch graph update in real-time
6. See metrics change: R² (goodness of fit), MSE (error)
7. Read fit status: "Good", "Overfitting", "Underfitting"

---

## 🔧 Troubleshooting

**Q: Backend won't start - "Port 8000 already in use"**
```bash
# Windows - Find and kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <XXXXX> /F
# Then restart: python main.py
```

**Q: Frontend can't connect to backend**
- Make sure backend is running first
- Check: http://localhost:8000/ should return `{"status": "...running"}`
- Refresh browser (Ctrl+F5)

**Q: npm command not found**
- Install Node.js: https://nodejs.org/
- Restart terminal
- Try again: `npm run dev`

**Q: ImportError in Python**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Q: Changes not appearing in frontend**
- Hard refresh: Ctrl+Shift+R (Chrome) or Cmd+Shift+R (Mac)
- Or just hard refresh: Ctrl+F5

---

## 📚 Detailed Documentation

| File | Purpose |
|------|---------|
| **LOCALHOST_SETUP.md** | Complete localhost setup guide with flow diagrams |
| **QUICKSTART.md** | 2-minute quick start reference |
| **ARCHITECTURE.md** | Code structure and design patterns |
| **DEPLOYMENT.md** | Deploy to production (Docker, AWS, Heroku, etc.) |
| **CHANGES_SUMMARY.md** | What was improved for scalability |

---

## 🔍 Testing

### Run All Tests
```bash
cd backend
pytest test_main.py -v
```

Expected: All 15+ tests pass ✓

### Test Specific Endpoint
```bash
# Test root endpoint
curl http://localhost:8000/

# Response: {"status": "ML Visual Explorer API running"}
```

### Try API Documentation
Visit: **http://localhost:8000/docs**
- See all 14 endpoints
- Interactive test forms
- Full request/response schemas

---

## 📁 Project Structure

```
ml-explorer-phase5-complete/
├── backend/
│   ├── main.py                 ← FastAPI with all 14 endpoints
│   ├── config.py               ← Configuration management
│   ├── schemas.py              ← Request validation models
│   ├── data_generators.py      ← Dataset generation
│   ├── utils.py                ← Shared utilities
│   ├── logger.py               ← Structured logging
│   ├── .env                    ← Configuration (local)
│   ├── requirements.txt        ← Python dependencies
│   └── test_main.py            ← 15+ tests
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx             ← Main React component
│   │   ├── components/         ← 12+ model visualizations
│   │   ├── api/index.js        ← API client
│   │   └── index.css           ← Tailwind styles
│   ├── package.json            ← Node dependencies
│   └── vite.config.js          ← Build config
│
├── docker-compose.yml          ← Docker orchestration
├── START_BACKEND.bat           ← Windows batch script
├── START_FRONTEND.bat          ← Windows batch script
├── LOCALHOST_SETUP.md          ← Detailed guide (this folder)
├── ARCHITECTURE.md             ← Code organization
└── DEPLOYMENT.md               ← Production deployment
```

---

## 🎓 Learning Path

1. **Start with Linear Regression**
   - Easiest to visualize
   - Understand train/test split
   - Learn about regularization (Ridge, Lasso)

2. **Try Classification Models**
   - Logistic Regression (linear boundaries)
   - KNN (instance-based learning)
   - SVM (support vector machines)

3. **Explore Tree-Based Models**
   - Decision Trees (interpretable)
   - Random Forest (ensemble)
   - Gradient Boosting (advanced)

4. **Understand Model Comparison**
   - Compare two models side-by-side
   - See which fits better
   - Learn about bias-variance tradeoff

5. **Try With Custom Data**
   - CSV Upload section
   - Train on your own dataset
   - See if concepts generalize

---

## 💡 Tips

- **Real-time Updates:** Every slider change triggers a new model training (~300ms)
- **Decision Boundaries:** Visualized for 2D classification models
- **Metrics Explained:**
  - **R²:** How well model fits (0=bad, 1=perfect)
  - **MSE:** Average error magnitude
  - **Accuracy:** % correct predictions
  - **Confusion Matrix:** True/False positives/negatives

---

## 🌐 Access from Other Devices

To access from another machine on your network:

```
Backend: http://<your-ip>:8000
Frontend: http://<your-ip>:3000
```

Find your IP:
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

---

## 📞 Need Help?

1. Check **LOCALHOST_SETUP.md** for detailed explanations
2. Visit **http://localhost:8000/docs** for API documentation
3. Check **TROUBLESHOOTING** section in this file
4. Review **ARCHITECTURE.md** to understand code structure

---

## ✨ You're All Set!

Everything is installed and ready to go.

**Next Step:** 
1. Start Backend: `python main.py` (in `backend/` folder)
2. Start Frontend: `npm run dev` (in `frontend/` folder)
3. Open: **http://localhost:3000**

**Happy Learning! 🚀**
