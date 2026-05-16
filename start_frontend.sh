#!/bin/bash
echo "🎨 Starting ML Explorer Frontend..."
cd "$(dirname "$0")/frontend"

if [ ! -d "node_modules" ]; then
  echo "📦 Installing npm packages (first time only)..."
  npm install
fi

echo ""
echo "✅ Frontend starting at http://localhost:3000"
echo ""
npm run dev
