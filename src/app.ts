import express from 'express';
import lifeEventRoutes from './routes/life-event.routes';
import savingsGoalRoutes from './routes/savings-goal.routes';
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

export default app;