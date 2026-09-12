import express from 'express';
import lifeEventRoutes from './routes/life-event.routes';
import savingsGoalRoutes from './routes/savings-goal.routes';
import agentSessionRoutes from './routes/agent-session.routes';
import interactionRoutes from './routes/interaction.routes';
import uiStateRoutes from './routes/ui-state.routes';
import cors from 'cors';


const app = express();

app.use(cors());

app.use(express.json());

app.use(
  '/api/life-events',
  lifeEventRoutes
);

app.use(
  '/api/savings-goals',
  savingsGoalRoutes
);

  app.use('/api/agent/sessions',
  agentSessionRoutes
);

app.use(
  '/api/agent/interactions',
  interactionRoutes
);

app.use('/api', uiStateRoutes);

export default app;