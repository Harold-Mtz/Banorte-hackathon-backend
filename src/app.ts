import express from 'express';
import lifeEventRoutes from './routes/life-event.routes';
import agentSessionRoutes from './routes/agent-session.routes';
import interactionRoutes from './routes/interaction.routes';
import uiStateRoutes from './routes/ui-state.routes';

const app = express();

app.use(express.json());

app.use(
  '/api/life-events',
  lifeEventRoutes
);

app.use(
  '/api/agent/sessions',
  agentSessionRoutes
);

app.use(
  '/api/agent/interactions',
  interactionRoutes
);


app.use('/api', uiStateRoutes);

export default app;