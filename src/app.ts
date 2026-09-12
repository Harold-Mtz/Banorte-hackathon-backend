import express from 'express';
import lifeEventRoutes from './routes/life-event.routes';

const app = express();

app.use(express.json());

app.use(
  '/api/life-events',
  lifeEventRoutes
);

export default app;