import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import agentRoutes from './routes/agent.routes';
import { handleMcpRequest } from './mcp/http';
import { requireAuth } from './middleware/auth.middleware';

const app = express();
app.use(cors());
app.use(express.json({ limit: '64kb' }));
app.get('/health', (_req, res) => res.json({ success: true, message: 'Banorte Boreas API is running' }));
app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);
app.all('/mcp', requireAuth, handleMcpRequest);
app.use((_req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ruta no disponible.' } }));
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(error instanceof SyntaxError ? 400 : 500).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'No se pudo procesar la solicitud.' } });
});
// Legacy controllers are retained in source but are not exposed: mutations go through the Agent API.
export default app;
