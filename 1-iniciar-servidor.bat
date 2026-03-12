@echo off
rem Lanzador rápido del servidor API de CallShip
rem Abre una ventana aparte llamada "CallShip Server" que se mantiene abierta siempre.

cd /d "%~dp0"
start "CallShip Server" cmd /k "cd server && npm run dev"
