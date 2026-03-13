@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ===== SUBIR A RAILWAY (CallShip) =====
echo.
echo Si cambiaste el frontend (dialer), ejecuta antes en esta carpeta: npm run build
echo.

set GIT=
if exist "C:\Program Files\Git\bin\git.exe" set GIT=C:\Program Files\Git\bin\git.exe
if exist "C:\Program Files (x86)\Git\bin\git.exe" set GIT=C:\Program Files (x86)\Git\bin\git.exe
where git >nul 2>nul && if "%GIT%"=="" set GIT=git

if "%GIT%"=="" (
  echo ERROR: No se encontro Git. Instala Git for Windows o usa Git Bash.
  echo Ver DEPLOY-RAILWAY-AHORA.txt para otras opciones.
  pause
  exit /b 1
)

echo 1. Anadiendo archivos...
"%GIT%" add server/public server/src dialer/src
if errorlevel 1 (
  echo Error en git add.
  pause
  exit /b 1
)

echo.
echo 2. Estado (debe aparecer server/public y otros):
"%GIT%" status
echo.

set /p OK="Continuar con commit y push? (S/N): "
if /i not "%OK%"=="S" (
  echo Cancelado. Para hacer commit manual: %GIT% commit -m "Deploy" ^& %GIT% push
  pause
  exit /b 0
)

echo.
echo 3. Commit...
"%GIT%" commit -m "Deploy: hash obligatorio, auto-acreditar blockchain, botones rojos, ONLY CHASE MONEY"
if errorlevel 1 (
  echo (Si dice 'nothing to commit', no hay cambios nuevos o ya se subieron.)
  pause
  exit /b 0
)

echo.
echo 4. Push a Railway (repo conectado)...
"%GIT%" push
if errorlevel 1 (
  echo Error en push. Revisa DEPLOY-RAILWAY-AHORA.txt
  pause
  exit /b 1
)

echo.
echo ===== Listo. Railway desplegara. En www.callship.us haz Ctrl+F5 =====
pause
