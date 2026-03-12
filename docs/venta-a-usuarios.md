# Vender CallShip a usuarios

## Flujo básico

1. **Usuario se registra** en tu web o desde el propio dialer (ya implementado en `/api/auth/register`).
2. **Usuario paga** (fuera de la app por ahora: transferencia, Stripe, PayPal, etc.).
3. **Tú activas la licencia**: por ejemplo creas una licencia desde tu base de datos o un panel admin:
   - `POST /api/licenses` con el usuario logueado (o un admin que cree licencias para otros).
   - Plan: `basic`, `pro`, `enterprise`, etc.
   - `expires_at`: opcional; si no se pone, no caduca.
4. **El dialer** al abrir llama a `GET /api/licenses/check`. Si `valid: true`, deja usar la app; si no, muestra mensaje de “sin licencia”.

## Cómo dar de alta una licencia (manual)

Con el servidor en marcha y un usuario registrado:

1. El usuario hace login (desde el dialer o con `POST /api/auth/login`).
2. Con ese token, puede llamar a `POST /api/licenses` con body `{ "plan": "basic" }` (o tú lo haces por él con un script/admin).
3. A partir de ahí, `GET /api/licenses/check` devolverá `valid: true` y el dialer funcionará.

## Próximos pasos para monetizar

- **Panel de administración**: listar usuarios, activar/desactivar licencias, ver planes.
- **Pasarela de pago**: Stripe/PayPal; al confirmar el pago, tu backend crea la licencia automáticamente.
- **Planes y precios**: definir planes (basic/pro) y límites (número de agentes, minutos, etc.).
- **Facturación**: guardar historial de pagos y emitir facturas si lo necesitas.
