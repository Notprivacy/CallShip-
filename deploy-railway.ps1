# Actualizar deployment en Railway con los cambios nuevos
# (recuperación por código de respaldo, mensaje registro exitoso, sin recuperación por correo)

$ErrorActionPreference = "Stop"
$projectRoot = "c:\Users\Shipe\OneDrive\Escritorio\CallShip"

Set-Location $projectRoot

Write-Host "=== CallShip - Actualizar deploy en Railway ===" -ForegroundColor Cyan
Write-Host ""

# Opción 1: Si usas GitHub (push dispara el deploy en Railway)
Write-Host "1. Añadiendo cambios al staging..." -ForegroundColor Yellow
git add -A
$status = git status --short
if (-not $status) {
  Write-Host "   No hay cambios que subir. Ya está todo actualizado." -ForegroundColor Green
  exit 0
}
Write-Host "   Cambios:" -ForegroundColor Gray
git status --short
Write-Host ""

Write-Host "2. Creando commit..." -ForegroundColor Yellow
git commit -m "Login: recuperación por código de respaldo, mensaje registro exitoso, sin opción correo"
if ($LASTEXITCODE -ne 0) {
  Write-Host "   Error en commit (puede que no haya cambios nuevos)." -ForegroundColor Red
  exit 1
}
Write-Host "   Commit creado." -ForegroundColor Green
Write-Host ""

Write-Host "3. Subiendo a remoto (Git push)..." -ForegroundColor Yellow
git push
if ($LASTEXITCODE -ne 0) {
  Write-Host "   Error al hacer push. Revisa que tengas 'origin' y permisos." -ForegroundColor Red
  exit 1
}
Write-Host "   Push correcto." -ForegroundColor Green
Write-Host ""

Write-Host "=== Listo ===" -ForegroundColor Cyan
Write-Host "Si Railway está conectado a este repo, el deploy se actualizará solo en unos minutos."
Write-Host "Revisa el panel de Railway para ver el estado del deployment."
