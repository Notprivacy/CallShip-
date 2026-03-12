# Cómo probar CallShip – Paso a paso

## Requisito: PostgreSQL instalado

Si no tienes PostgreSQL, instálalo desde https://www.postgresql.org/download/windows/  
Durante la instalación anota la contraseña del usuario `postgres`.

---

## Paso 1: Crear la base de datos y el usuario

Abre **PowerShell** o **CMD** y ejecuta (con la contraseña que pongas a `postgres` cuando te la pida):

```powershell
psql -U postgres
```

Dentro de `psql` escribe (o pega) y pulsa Enter después de cada bloque:

```sql
CREATE USER callship WITH PASSWORD 'callship123';
CREATE DATABASE callship_db OWNER callship;
\q
```

(Si ya creaste el usuario o la base antes, puedes saltar las líneas que den error.)

---

## Paso 2: Arrancar el servidor (API)

En una ventana de **PowerShell**:

```powershell
cd C:\Users\Shipe\OneDrive\Escritorio\CallShip\server
npm install
npm run dev
```

Debes ver algo como: **"API CallShip escuchando en http://localhost:4000"** y **"Tablas users, calls y licenses listas"**.

Si sale error de conexión a PostgreSQL, revisa que el servicio de PostgreSQL esté corriendo y que usuario/contraseña/base coincidan (o copia `server\.env.example` a `server\.env` y ajusta ahí).

---

## Paso 3: Comprobar que la API responde

En **otra** ventana de PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/health" -Method Get
```

O abre en el navegador: **http://localhost:4000/api/health**  
Deberías ver: `{"ok":true,"service":"callship-server"}`.

---

## Paso 4: Arrancar el dialer (página web)

En **otra** ventana de PowerShell (deja el servidor corriendo en la anterior):

```powershell
cd C:\Users\Shipe\OneDrive\Escritorio\CallShip\dialer
npm install
npm run dev
```

Verás una URL tipo **http://localhost:3000**. Ábrela en el navegador.

---

## Paso 5: Registrarte e iniciar sesión

1. En **http://localhost:3000** haz clic en **"Crear cuenta"**.
2. Pon **Usuario** (por ejemplo: `demo`) y **Contraseña** (por ejemplo: `demo123`).
3. Clic en **"Registrarse"**.
4. Luego inicia sesión con ese mismo usuario y contraseña y clic en **"Entrar"**.

---

## Paso 6: Activar licencia (para poder usar el dialer)

Si al entrar te dice que no tienes licencia:

- Opción A – Desde el navegador (consola F12 → pestaña Console), pega y ejecuta (cambia `TU_TOKEN` por el token que tengas; si no tienes token, haz primero login y en Network/Headers verás el response con `token`):

```javascript
fetch('/api/licenses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('callship_token') },
  body: JSON.stringify({ plan: 'basic' })
}).then(r => r.json()).then(console.log);
```

- Opción B – Desde PowerShell (después de hacer login en la web y copiar el token de `localStorage` o de la respuesta de login):

```powershell
$token = "PEGA_AQUI_EL_TOKEN"
Invoke-RestMethod -Uri "http://localhost:4000/api/licenses" -Method Post -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } -Body '{"plan":"basic"}'
```

Luego **recarga la página** del dialer (F5). Ya deberías ver la pantalla del dialer.

---

## Paso 7: Probar el dialer (registrar y ver llamadas)

1. En la pantalla del dialer, rellena:
   - **Cliente / contacto**: por ejemplo "Juan Pérez"
   - **Teléfono**: por ejemplo "600123456"
   - **Notas** (opcional): por ejemplo "Llamar mañana"
2. Clic en **"Registrar llamada"**.
3. Deberías ver "Llamada registrada" y la llamada aparecer en **"Historial de llamadas"** debajo.

---

## Resumen rápido

| Paso | Dónde | Acción |
|------|--------|--------|
| 1 | PowerShell + psql | Crear usuario `callship` y base `callship_db` |
| 2 | PowerShell | `cd server` → `npm install` → `npm run dev` |
| 3 | Navegador o PowerShell | Comprobar http://localhost:4000/api/health |
| 4 | Otra PowerShell | `cd dialer` → `npm install` → `npm run dev` |
| 5 | Navegador http://localhost:3000 | Registrarte e iniciar sesión |
| 6 | Navegador / API | Crear licencia si te pide "sin licencia" |
| 7 | Navegador | Registrar una llamada y ver el historial |

Si algo falla en un paso, dime en cuál y el mensaje de error y lo vemos.
