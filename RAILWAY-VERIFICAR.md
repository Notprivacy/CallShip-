# Por qué no se ven los cambios en www.callship.us

Si ya hiciste `git add server/public`, `git commit` y `git push` y la web sigue igual, el fallo está en **Railway**, no en tu código.

## 1. Comprobar qué está desplegado AHORA

Abre en el navegador:

- **https://www.callship.us/api/build-info**

Interpretación:

- Si ves algo como `"build": "CallShip frontend build\n2026-03-12T21-05-44"` → el servidor **sí** tiene el frontend nuevo. Entonces el problema puede ser caché del navegador (prueba en ventana de incógnito o otro navegador).
- Si ves `"hasPublic": false` o `"No existe build.txt"` → en Railway **no** está la carpeta `public` (o está vacía). El deploy no está usando tu último código.
- Si la página no carga o da error → el dominio puede estar apuntando a otro servicio o el deploy falló.

## 2. Revisar en el panel de Railway

1. Entra en **https://railway.app** → tu proyecto → el servicio que sirve CallShip.

2. **Settings → General**
   - **Root Directory** debe ser exactamente: `server`
   - Si está vacío o es otra cosa, los cambios de `server/public` no se usan. Pon `server` y guarda.

3. **Settings → Deploy**
   - Comprueba que **Branch** sea la rama a la que haces push (normalmente `main`).
   - Comprueba que el **último deploy** sea **después** de tu último commit (por ejemplo `241cf2d`). Si el último deploy es de un commit anterior, Railway no ha desplegado tu push.

4. **Redeploy manual**
   - En la pestaña **Deployments**, abre el menú del último deploy y elige **Redeploy** (o **Deploy** desde la rama `main`).
   - Así te aseguras de que Railway use el código actual del repo.

5. **Variables**
   - **ADMIN_USERS**: solo el usuario admin, por ejemplo `medinax6`. Si pones `nicol2`, ese usuario seguirá viendo "Clientes".

## 3. Si Root Directory estaba mal

Si tenías Root vacío o distinto de `server`:

1. Pon **Root Directory** = `server`.
2. Guarda.
3. Haz un nuevo deploy (Redeploy o push un cambio).
4. Espera a que termine y prueba de nuevo **https://www.callship.us/api/build-info** y la web con **Ctrl+F5**.

## 4. Resumen

| Qué ves en /api/build-info | Qué hacer |
|----------------------------|-----------|
| `build` con fecha reciente | Frontend nuevo está desplegado. Prueba en incógnito o revisa ADMIN_USERS. |
| `No existe build.txt` / `hasPublic: false` | En Railway no está `server/public`. Revisa Root Directory = `server` y que el repo tenga la carpeta `server/public` en el último commit. |
| Error o no carga | Revisa que el dominio apunte a este servicio y que el último deploy haya terminado bien. |

Después de cambiar Root Directory o de hacer Redeploy, espera 1–2 minutos y vuelve a probar.
