# Deployment Guide

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (optional)

### Setup

**1. Clone and navigate:**
```bash
cd ml-explorer-phase5-complete
```

**2. Install dependencies:**
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

**3. Run services:**

Terminal 1:
```bash
cd backend
python main.py
```

Terminal 2:
```bash
cd frontend
npm run dev
```

Visit: `http://localhost:3000`

---

## Docker Deployment

### Prerequisites
- Docker & Docker Compose

### Single Command Deployment

```bash
docker-compose up
```

The app will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

### Environment Configuration

Edit `.env` in the backend folder or override in `docker-compose.yml`:

```yaml
environment:
  - DEBUG=False
  - HOST=0.0.0.0
  - PORT=8000
  - LOG_LEVEL=INFO
  - ALLOWED_ORIGINS=http://localhost:3000
```

---

## Production Deployment (Docker)

### 1. Update Environment

Create `.env.prod`:
```
DEBUG=False
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=WARNING
ALLOWED_ORIGINS=https://yourdomain.com
```

### 2. Build Images

```bash
docker build -t ml-explorer-backend:latest ./backend
docker build -t ml-explorer-frontend:latest ./frontend
```

### 3. Run Containers

```bash
# Backend
docker run -d \
  --name ml-explorer-backend \
  -p 8000:8000 \
  --env-file .env.prod \
  ml-explorer-backend:latest

# Frontend
docker run -d \
  --name ml-explorer-frontend \
  -p 3000:3000 \
  -e VITE_API_URL=http://backend:8000 \
  ml-explorer-frontend:latest
```

### 4. With Reverse Proxy (nginx)

```nginx
upstream backend {
    server localhost:8000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
    }
}
```

---

## Cloud Deployment

### AWS (EC2 + Docker)

```bash
# SSH into instance
ssh -i key.pem ubuntu@instance

# Install Docker
sudo apt update
sudo apt install docker.io docker-compose
sudo usermod -aG docker ubuntu

# Clone repo
git clone <repo>
cd ml-explorer-phase5-complete

# Run
docker-compose up -d
```

### Heroku

```bash
# Install Heroku CLI
brew install heroku/brew/heroku

# Login
heroku login

# Create app
heroku create ml-explorer

# Set environment
heroku config:set DEBUG=False

# Deploy
git push heroku main
```

### Google Cloud Run

```bash
# Build image
gcloud builds submit --tag gcr.io/PROJECT_ID/ml-explorer

# Deploy
gcloud run deploy ml-explorer \
  --image gcr.io/PROJECT_ID/ml-explorer \
  --platform managed \
  --region us-central1
```

---

## Monitoring & Logs

### Local Development

View logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Production

Backend logs location (if configured in `.env`):
```
LOG_FILE=/var/log/ml-explorer.log
```

### Health Check

```bash
curl http://localhost:8000/
# Response: {"status": "ML Visual Explorer API running"}
```

---

## Scaling

### Load Balancing

For high traffic, run multiple backend instances:

```yaml
# docker-compose.yml (updated)
services:
  backend:
    deploy:
      replicas: 3
  nginx:
    image: nginx
    ports:
      - "80:80"
```

### Caching

Add Redis for model caching (future):
```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Check port conflicts
lsof -i :8000
```

### Frontend can't reach backend
```bash
# Verify CORS settings in .env
ALLOWED_ORIGINS=http://frontend:3000
```

### Permission denied errors
```bash
sudo chown -R $USER:$USER .
```

---

## Rollback

If issues occur:

```bash
# Docker
docker-compose down
docker system prune

# Or switch to previous version
git checkout v1.0.0
docker-compose up
```
