import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import financialProfileRoutes from "./routes/financial-profile.routes";
import financialProductRoutes from "./routes/financial-product.routes";
import mortgageRoutes, { userMortgageRouter } from "./routes/mortgage.routes";
import lifeEventRoutes from "./routes/life-event.routes";
import savingsGoalRoutes from "./routes/savings-goal.routes";
import agentSessionRoutes from "./routes/agent-session.routes";
import interactionRoutes from "./routes/interaction.routes";
import uiStateRoutes from "./routes/ui-state.routes";
import agentRoutes from "./routes/agent.routes"

const app = express();

app.use(cors());

app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/financial-profiles", financialProfileRoutes);
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Banorte Adaptive Life API is running",
  });
});

app.use('/api/life-events',lifeEventRoutes);
app.use('/api/life-events',lifeEventRoutes);
app.use('/api/savings-goals',savingsGoalRoutes);
app.use('/api/agent/sessions',agentSessionRoutes);
app.use('/api/agent/interactions',interactionRoutes);
app.use('/api', uiStateRoutes);
app.use("/api/financial-products", financialProductRoutes);
app.use("/api/mortgages", mortgageRoutes);
app.use("/api/mortgage", mortgageRoutes);
app.use("/api/users/:userId", userMortgageRouter);
app.use('/api/agent', agentRoutes);


export default app;
