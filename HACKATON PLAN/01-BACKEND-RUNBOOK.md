# Backend runbook

```powershell
npm install
npm run build
npm run dev
```

Variables mínimas:

```env
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash-lite
JWT_SECRET=...
JWT_EXPIRES_IN=1d
PORT=3000
```

Antes de la demo:

1. Aplicar `database/schema.sql` y `database/seed.sql`.
2. Verificar `GET /health`.
3. Verificar login.
4. Verificar un `POST /api/agent/message` con Bearer.
5. Verificar que el dashboard muestre datos del usuario autenticado.
