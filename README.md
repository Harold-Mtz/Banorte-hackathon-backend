# Banorte Adaptive Life API

Express, TypeScript, PostgreSQL, JWT, Gemini y MCP. El frontend hermano está en `../../Frontend/Banorte-hackathon2026-frontend`.

## Iniciar

```sh
npm install
# Configura .env según .env.example
npm run build
npm start
```

Para desarrollo: `npm run dev`. Se necesita PostgreSQL con `database/schema.sql` aplicado. El esquema usa `pgcrypto`. Si ya tienes la base del proyecto, no necesitas migraciones para los cambios de Adaptive Life.

Variables privadas:

- `DATABASE_URL`: conexión PostgreSQL. Para TLS con verificación completa usa `sslmode=verify-full`.
- `JWT_SECRET`: secreto aleatorio seguro; obligatorio.
- `JWT_EXPIRES_IN`: duración del token, por defecto `1d`.
- `GEMINI_API_KEY`: clave de Gemini; obligatoria en la configuración actual.
- `GEMINI_MODEL`: modelo autorizado por tu cuenta; el código conserva el valor predeterminado existente.
- `FRONTEND_URL`: orígenes CORS permitidos separados por comas, por ejemplo `http://localhost:5173`.
- `PORT`: por defecto `3000`.
- `MCP_API_KEY`: opcional; habilita acceso de integraciones de confianza a `/mcp` con `Authorization: Bearer <MCP_API_KEY>`. Sin esta variable, el endpoint externo permanece cerrado. El agente interno no la necesita.

No publiques estos valores ni los transfieras al frontend. Usa HTTPS en despliegue.

## Cambios para el frontend completo

- `POST /api/auth/register` acepta `name`, `email`, `password` (8 caracteres mínimo, 72 bytes máximo). Hash bcrypt, email normalizado y creación de usuario/perfil en transacción. Responde igual que login: `{success:true,data:{token,user:{id,name,email}}}`.
- Las rutas privadas verifican JWT y propiedad de usuario, sesión, experiencia y meta. Login y registro son públicos; `/health` permanece disponible.
- `POST /api/agent/message` persiste la sesión, el mensaje y la UI. Registra la experiencia detectada si no existe una activa.
- `POST /api/agent/interact` acepta `{sessionId,componentId,action,payload?}`. Solo ejecuta acciones disponibles en la UI persistida.
- Primera casa devuelve resumen, capacidad, catálogo, simulador y formulario de ahorro. Los resultados provienen de servicios y PostgreSQL.
- Simulaciones y creación de metas atraviesan el protocolo MCP con `InMemoryTransport`, usando el servidor y las tools del proyecto. No se necesita una petición HTTP del backend a sí mismo.
- `REQUEST_CREATE_SAVINGS_GOAL` prepara datos pendientes; `CONFIRM_CREATE_SAVINGS_GOAL` usa esos datos del servidor. La UI posterior elimina la acción confirmada para impedir repetirla. Las interacciones de una sesión se serializan mediante un advisory lock PostgreSQL.
- La UI se recupera con `GET /api/agent/sessions/:sessionId/ui-states/latest`.

El clasificador Gemini conserva el fallback local existente. Los demás eventos registran el objetivo y muestran que su experiencia especializada aún está pendiente; no simulan productos o lógica falsos.

## Pruebas

```sh
npm test
node scripts/check-services.cjs
```

`npm test` compila y ejecuta pruebas HTTP contra Express, repositorios, servicios y MCP, con PostgreSQL emulado por `pg-mem` y LLM determinista **solo en pruebas**. Comprueba auth, perfil, simulaciones, confirmación, recuperación y restricciones de acceso. No modifica la base real. La emulación no reproduce bloqueo/concurrencia o rollback PostgreSQL de manera completa.

`check-services.cjs` usa `.env` real, ejecuta una consulta de conectividad y una petición mínima a Gemini. No modifica registros ni imprime secretos.

Para crear una base nueva aplica `database/schema.sql` con tu herramienta PostgreSQL. `database/seed.sql` es material de demostración existente: revísalo antes de ejecutarlo y no lo apliques automáticamente sobre datos reales. Sin catálogo hipotecario activo la aplicación muestra un estado vacío.

## Límites del MVP

Las confirmaciones no son operaciones bancarias reales. Los importes hipotecarios son simulaciones informativas. Un fallo de proceso entre guardar un resultado y guardar su UI puede requerir consultar el historial antes de reintentar; no se ofrece garantía transaccional distribuida entre MCP, auditoría y UI. Para una producción bancaria se necesita endurecimiento operativo adicional, incluidos rate limits y auditoría transaccional.
