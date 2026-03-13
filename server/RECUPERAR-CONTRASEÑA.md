# Recuperar contraseña (CallShip)

## Flujo actual

1. **Usuario indica su correo** en la pantalla «¿Olvidaste tu contraseña?».
2. **POST /api/auth/forgot-password** con body `{ "email": "correo@ejemplo.com" }`:
   - Se busca una cuenta cuyo **perfil** tenga ese correo (tabla `user_profiles.email`).
   - **Si no hay ninguna cuenta con ese correo** → respuesta **404** con mensaje **"Cuenta no encontrada"**.
   - **Si la cuenta existe** → se genera un token (válido 1 hora), se envía un **correo** al usuario con un enlace para restablecer la contraseña, y se responde 200: *"Se ha enviado un correo con el enlace para restablecer tu contraseña"*.
3. El usuario abre el **enlace del correo** (ej. `https://www.callship.us/reset-password?token=...`), introduce la nueva contraseña y envía.
4. **POST /api/auth/reset-password** con `{ "token": "...", "password": "nueva_contraseña" }` actualiza la contraseña y el usuario puede iniciar sesión.

**Importante:** La cuenta se identifica por el **correo guardado en el perfil** (My Account → perfil). Si el usuario nunca guardó un correo, no podrá usar «Recuperar contraseña» hasta que lo añada en su perfil.

---

## Configurar el envío de correo (SMTP)

Para que los correos se envíen de verdad, en **Railway → Variables** (o en tu `.env` local) define:

| Variable       | Descripción |
|----------------|-------------|
| `SMTP_HOST`    | Servidor SMTP (ej. `smtp.gmail.com`, `smtp.office365.com`) |
| `SMTP_PORT`    | Puerto (ej. `587` para TLS) |
| `SMTP_SECURE`  | `true` si usas puerto 465 |
| `SMTP_USER`    | Usuario SMTP |
| `SMTP_PASS`    | Contraseña o contraseña de aplicación |
| `EMAIL_FROM`   | Dirección que aparece como remitente (opcional; si no, se usa `SMTP_USER`) |
| `FRONTEND_URL` | URL base del front para el enlace (ej. `https://www.callship.us`) |

Si **no** configuras SMTP, al solicitar recuperación con un correo válido la API responderá **503** indicando que no se pudo enviar el correo.

---

## Resumen

- **Cuenta no encontrada** → se devuelve cuando el correo no está asociado a ningún perfil.
- **Correo enviado** → solo si la cuenta existe y SMTP está configurado; el enlace del correo lleva a `/reset-password?token=...` para poner la nueva contraseña.
