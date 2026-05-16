@echo off
REM ML Explorer - Start Backend Server
REM This script starts the FastAPI backend server

echo.
echo ====================================
echo  ML Visual Explorer - Backend
echo ====================================
echo.
echo Backend is starting on http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.

cd backend
python main.py

pause
