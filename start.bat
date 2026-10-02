@echo off
title Aethra Vision Core - Tactical Command Center
echo ===================================================================
echo       STARTING AETHRA VISION CORE (AI PIPELINE + BACKEND + FRONTEND)
echo ===================================================================

set "ROOT=%~dp0"
set "PYTHON=%ROOT%.venv\Scripts\python.exe"

if not exist "%PYTHON%" (
    set "PYTHON=python"
)

echo [1/3] Launching FastAPI Backend on Port 8000...
start "Aethra Backend (Port 8000)" cmd /k "cd /d "%ROOT%backend" && "%PYTHON%" main.py"

echo [2/3] Launching AI Detection Pipeline on Port 8002...
start "Aethra AI Pipeline (Port 8002)" cmd /k "cd /d "%ROOT%ai_pipeline" && "%PYTHON%" main.py"

echo [3/3] Launching React Dashboard on Port 5050...
start "Aethra Frontend (Port 5050)" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo.
echo All services are launching in their respective windows!
echo Initializing AI models and connecting camera streams...
timeout /t 5 >nul

echo.
echo Opening Command Center Dashboard in browser: http://localhost:5050/
start http://localhost:5050/

echo.
echo ===================================================================
echo System is running!
echo Admin Login:    liyanagesasiru@gmail.com  /  admin123  (OTP: 892014)
echo Operator Login: SEC-OP-1024-A             /  PIN: 1234
echo ===================================================================
echo.
pause
