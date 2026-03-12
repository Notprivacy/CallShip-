@echo off
title CallShip Server - Reiniciar
cd /d "%~dp0"

echo Deteniendo servidor en puerto 4000...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :4000') do (
  taskkill /F /PID %%a 2>nul
)
timeout /t 2 /nobreak >nul

echo Iniciando servidor Node...
echo.
npm run dev
