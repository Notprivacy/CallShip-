# CallShip

**Dialer de llamadas** con servidor propio para vender el programa a usuarios (SaaS o licencias).

## Objetivo

- **Dialer**: aplicación para realizar llamadas (listas de contactos, marcar, historial).
- **Servidor**: API, autenticación, gestión de usuarios y licencias.
- **Venta**: modelo por usuario/suscripción o licencia perpetua.

## Estructura del proyecto

```
CallShip/
├── server/          # API, auth, usuarios, licencias
├── dialer/          # Cliente del dialer (web o escritorio)
├── shared/          # Tipos/contratos compartidos (opcional)
└── docs/            # Documentación técnica y de negocio
```

## Stack propuesto

| Parte     | Tecnología              | Notas                          |
|----------|--------------------------|--------------------------------|
| Servidor | Node.js + Express        | API REST, JWT, base de datos   |
| Base de datos | SQLite → PostgreSQL | Empezar con SQLite, escalar después |
| Dialer   | React (web) o Electron   | UI del marcador y listas       |
| Llamadas | Twilio / VoIP propio     | Según presupuesto y alcance    |

## Modelo de venta a usuarios

1. **Registro**: usuario se registra en tu servidor (o en una web de ventas).
2. **Licencia / suscripción**: 
   - Por tiempo (mensual/anual) o 
   - Licencia perpetua con límite de puestos.
3. **Servidor valida**: cada cliente (dialer) se autentica contra tu API y comprueba que la licencia esté activa.
4. **Uso**: el dialer hace llamadas usando tu infra (Twilio u otro) o la del cliente, según el modelo.

## Próximos pasos

- [ ] Implementar servidor (auth, usuarios, verificación de licencia).
- [ ] Definir API que usará el dialer (login, listas, iniciar llamada, etc.).
- [ ] Crear cliente dialer mínimo (login + lista + “marcar”).
- [ ] Integrar proveedor de llamadas (ej. Twilio).
- [ ] Añadir pasarela de pago (Stripe, PayPal) para vender suscripciones.

## Cómo ejecutar (cuando esté implementado)

- **Servidor**: `cd server && npm install && npm run dev`
- **Dialer**: `cd dialer && npm install && npm run dev`
