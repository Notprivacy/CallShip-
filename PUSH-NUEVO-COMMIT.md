# Importante: "Redeploy" no suele aplicar cambios nuevos

Si quitaste el root **server** y diste **Redeploy** pero todo sigue igual, es porque **Redeploy** vuelve a construir **el mismo commit**. Railway puede usar **caché** de ese commit y el resultado no cambia.

Para que se apliquen los cambios del toggle rojo y el badge "UI v2" hace falta que Railway construya un **commit nuevo**.

---

## Qué hacer (en orden)

### 1. Asegurarte de estar en la carpeta correcta del proyecto

En PowerShell:

```powershell
cd "c:\Users\Shipe\OneDrive\Escritorio\CallShip"
```

### 2. Ver si hay cambios sin commit

```powershell
git status
```

Si ves archivos en "Changes not staged" o "Untracked files", esos cambios **no están en el repo** y Railway no los puede desplegar. Sigue al paso 3.

Si dice "nothing to commit, working tree clean", tus cambios ya están commiteados. En ese caso haz un **commit vacío** solo para forzar un commit nuevo (paso 4).

### 3. Subir todos los cambios (commit + push)

```powershell
git add -A
git commit -m "Toggle SIP rojo, UI v2, build info con commit"
git push origin main
```

(Si tu rama se llama `master`, usa `git push origin master`.)

### 4. Si ya todo estaba commiteado: forzar un commit nuevo

```powershell
git commit --allow-empty -m "Forzar rebuild en Railway"
git push origin main
```

### 5. No uses "Redeploy" en Railway

Después del **push**, deja que Railway despliegue **solo** (por el webhook de GitHub). O en Railway elige **"Deploy"** desde el **último commit** (el que acabas de subir), no **"Redeploy"** de un deploy anterior.

### 6. Comprobar qué commit se desplegó

Cuando termine el deploy, abre:

**https://www.callship.us/api/build-info**

Ahí deberías ver algo como:

- `"build": "CallShip frontend build\n2026-03-13T...\nabc1234"`  
  (el último trozo es el **commit** que Railway usó para construir).

Compara ese commit con el último en GitHub (o `git log -1` en tu PC). Si es el mismo, el build sí usó el código nuevo. Si no ves el badge **"UI v2"** en la web, haz **Ctrl+Shift+R** (recarga forzada).

---

## Resumen

| Acción | Resultado |
|--------|-----------|
| **Redeploy** del mismo commit | Railway puede usar caché → mismo build viejo. |
| **Push de un commit nuevo** | Railway clona/actualiza y construye de nuevo → debería salir el toggle rojo y "UI v2". |

Haz **push de un commit nuevo** (con los cambios o con `git commit --allow-empty`) y espera el deploy automático. Luego revisa **/api/build-info** y la página con **Ctrl+Shift+R**.
