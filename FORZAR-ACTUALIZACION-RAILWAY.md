# Forzar que se vean los cambios en Railway (toggle rojo, etc.)

Si en Railway sigues viendo el toggle **morado** o los cambios no se aplican, haz esto en orden:

---

## 1. Subir el código (PowerShell)

Abre **PowerShell** y ejecuta:

```powershell
cd "c:\Users\Shipe\OneDrive\Escritorio\CallShip"
git add -A
git status
git commit -m "SIP toggle rojo en CSS; forzar actualizacion"
git push
```

Si `git push` pide usuario/contraseña, usa tu cuenta de GitHub (o un Personal Access Token si tienes 2FA).

---

## 2. Comprobar el deploy en Railway

1. Entra en [railway.app](https://railway.app) → tu proyecto → servicio de la app.
2. Pestaña **Deployments**.
3. Espera a que el **último deployment** pase a estado **Success** / **Active** (puede tardar 2–5 minutos).
4. Si no se creó uno nuevo, en el menú (⋯) del último deploy → **Redeploy**.

---

## 3. Forzar que el navegador cargue la versión nueva

La parte más importante: el navegador suele guardar la versión antigua en caché.

1. Abre la URL de tu app en Railway (la página del panel/dialer).
2. Haz **recarga forzada**:
   - **Windows:** `Ctrl + Shift + R` o `Ctrl + F5`
   - O: `Shift + F5`
3. Si sigue igual, **borra la caché** de ese sitio:
   - Pulsa **F12** (DevTools).
   - Pestaña **Application** (Chrome) o **Almacenamiento** (Firefox).
   - En el menú de la izquierda: **Storage** → **Clear site data** / **Borrar datos del sitio**.
   - Recarga de nuevo con `Ctrl + Shift + R`.

---

## 4. Cómo saber si ya estás con la versión nueva

- El **toggle de Status** en "My Account / SIP Devices" se ve **rojo** (igual que el botón "+ Create") cuando está activo.
- Al hacer clic en el toggle, cambia entre activo/inactivo y aparece el mensaje "Dispositivo activado..." o "Dispositivo desactivado."

Si después de todo esto sigues viendo el toggle morado, es que el navegador sigue usando caché: prueba en **ventana de incógnito** o en otro navegador.
