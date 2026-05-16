#!/bin/bash
echo "🧠 Starting ML Explorer Backend..."
cd "$(dirname "$0")/backend"

# Create venv if not exists
if [ ! -d "venv" ]; then
  echo "📦 Creating virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate

echo "📦 Installing dependencies..."
pip install -r requirements.txt -q

echo ""
echo "✅ Backend starting at http://localhost:8000"
echo "📖 API docs at  http://localhost:8000/docs"
echo ""
uvicorn main:app --reload --port 8000
