@echo off
REM ML Explorer - Start Frontend Server
REM This script starts the React development server

echo.
echo ====================================
echo  ML Visual Explorer - Frontend
echo ====================================
echo.
echo Frontend is starting on http://localhost:3000
echo.
echo Make sure backend is already running on port 8000
echo.

cd frontend
npm run dev

pause
