@echo off
chcp 65001 >nul
echo ============================================
echo   CallShip - Preparar deploy para Railway
echo ============================================
echo.

cd /d "%~dp0"

echo [1/2] Construyendo frontend y copiando a server/public...
call npm run build
if errorlevel 1 (
  echo ERROR: Fallo el build. Revisa que tengas Node instalado.
  pause
  exit /b 1
)
echo.

echo [2/2] Creando instrucciones de deploy...
(
echo LOS CAMBIOS NO SE VEN EN WWW.CALLSHIP.US HASTA QUE SUBAS server/public A GIT.
echo.
echo Ejecuta estos comandos EN LA RAÍZ del proyecto ^(donde está PREPARAR-DEPLOY.bat^):
echo.
echo   git add server/public server/src
echo   git status
echo   git commit -m "Deploy frontend: Clientes solo admin, hover KPIs"
echo   git push
echo.
echo IMPORTANTE: En "git status" DEBE aparecer server/public. Si no aparece, los cambios no se verán en la web.
echo.
echo Después del push: Railway desplegará solo. En www.callship.us haz Ctrl+F5.
echo Para comprobar que es el build nuevo: abre https://www.callship.us/build.txt
echo.
echo En Railway: Variables - ADMIN_USERS debe ser SOLO el usuario admin ^(ej: medinax6^). No incluyas nicol2.
) > DEPLOY-PASOS.txt
echo Creado: DEPLOY-PASOS.txt
echo.

echo Contenido de server/public:
dir /b server\public 2>nul
dir /b server\public\assets 2>nul
type server\public\build.txt 2>nul
echo.

echo ============================================
echo   SIGUIENTE PASO OBLIGATORIO
echo ============================================
echo   Abre DEPLOY-PASOS.txt y ejecuta los comandos git que indica.
echo   Sin "git add server/public" y "git push", la web NUNCA se actualiza.
echo ============================================
pause
