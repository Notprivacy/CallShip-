@echo off
title CallShip - Servidor + Dialer
cd /d "%~dp0"

echo Iniciando servidor (puerto 4000) y dialer (puerto 3000)...
echo.
echo Servidor API: http://localhost:4000
echo Dialer:       http://localhost:3000
echo.
echo Para parar: cierra esta ventana o pulsa Ctrl+C
echo.

start "CallShip Server" cmd /k "cd server && npm run dev"
timeout /t 3 /nobreak >nul
start "CallShip Dialer" cmd /k "cd dialer && npm run dev"

echo.
echo Ambas ventanas se han abierto. Cierra esta si quieres.
pause
