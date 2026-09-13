# Banorte Boreas API

Express, TypeScript y PostgreSQL. El frontend consume solo la Agent API autenticada; las tools MCP reutilizan los mismos servicios.

## Ejecutar

```powershell
npm.cmd run db:migrate
npm.cmd start
```

Para desarrollo: `npm.cmd run dev`.

Variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` y `PORT`. Gemini es opcional para clasificación de intenciones no reconocidas; configurar `GEMINI_API_KEY` y `GEMINI_MODEL` si se utiliza. La clasificación tiene un fallback local y el dominio no depende de respuestas financieras del modelo.

Una base nueva requiere aplicar primero `database/schema.sql` y `database/seed.sql`. El seed es para inicialización, no para reiniciar saldos. La migración de demo puede repetirse.

## Verificar

```powershell
npm.cmd run build
npm.cmd run test:demo
```

La prueba de integración comprueba auth, ownership, sesiones, confirmación concurrente, movimientos, metas, hipotecas y registro de tools. Crea y elimina únicamente sus propios usuarios/productos temporales. Requiere permisos de lectura/escritura en la base de pruebas configurada.

Las respuestas de prueba se guardan sin tokens en `artifacts/contract-fixtures.json`, ignorado por git, para que el frontend valide y renderice el contrato completo.

## Rutas públicas

- GET /health
- POST /api/auth/login

Rutas con Bearer JWT:

- POST /api/agent/message
- POST /api/agent/interact
- /mcp

Las rutas antiguas de dominio no se exponen en app.ts; el código queda disponible para refactor futuro.

## Integridad

Cada interacción financiera corre en una transacción que bloquea el usuario. La confirmación usa los valores pendientes del servidor; sus recibos evitan duplicados. Los movimientos y saldos de metas se guardan juntos. Los IDs históricos del seed se validan con sintaxis compatible con UUID de PostgreSQL.

La migración 001-demo-integrity.sql añade metadata y estados de metas, además de goal_audit. Ya se aplicó a la base configurada durante esta entrega.

## Convenciones de cálculo

Ingreso/gasto: base del perfil más movimientos del mes en America/Mexico_City. Ahorro: base más depósitos acumulados menos retiros. Disponible: ingreso menos gastos, deuda y retiros mensuales. El campo legado current_debt representa el pago mensual en el contrato existente.

Tasas del catálogo en puntos porcentuales: 10.5 = 10.5%. No hay tasas de respaldo, productos de respaldo ni mensualidades inventadas. Los escenarios y retrasos son estimaciones. El catálogo seed representa datos de demostración, no una oferta ni aprobación vigente.
