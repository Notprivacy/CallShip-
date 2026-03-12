# Cómo aplicar cambios en www.callship.us

Los cambios en el **código** no se ven en la web hasta que **reconstruyes el frontend y vuelves a desplegar**.

---

## Pasos obligatorios cada vez que cambies algo (dialer o server)

### 1. Generar el frontend nuevo y copiarlo al servidor

En la **raíz del proyecto** (carpeta CallShip):

```bash
npm run build
```

Eso hace: build del dialer → copia a `server/public`. Sin este paso, **www.callship.us sigue sirviendo el frontend viejo**.

### 2. Subir todo a GitHub (incluido `server/public`)

```bash
git add .
git commit -m "Fix: ocultar Clientes a no-admin y recarga manual sin abonar saldo"
git push
```

**Importante:** Tiene que entrar en el commit la carpeta **`server/public`** (con el nuevo `index.html` y `assets/`). Si no la subes, Railway sigue desplegando el frontend antiguo.

### 3. Esperar el deploy en Railway

En Railway → Deployments, espera a que el último deploy pase a **Success**.

### 4. Probar en la web

- Abre **www.callship.us** y recarga con **Ctrl+F5** (recarga forzada para no usar caché).
- Entra con **nicol2** → no debe verse "Clientes" y al usar "Recarga manual" no debe decir "Recarga aplicada correctamente" ni abonar saldo.
- Entra con **medinax6** (o tu usuario en ADMIN_USERS) → debe verse "Clientes" y poder aplicar recargas.

---

## Resumen

| Si cambias…        | Qué hacer antes de push        |
|--------------------|---------------------------------|
| Solo **server/**   | Push (no hace falta `npm run build`) |
| **dialer/** o ambos | **`npm run build`** y luego push (con `server/public` incluido) |

Si no haces `npm run build` cuando tocas el dialer, la web **no** mostrará esos cambios.
