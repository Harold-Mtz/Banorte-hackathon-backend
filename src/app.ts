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
import agentRoutes from "./routes/agent.routes";
import testAiRoutes from "./routes/test-ai.routes";
import authRoutes from "./routes/auth.routes";
import { handleMcpRequest } from "./mcp/http";

import { requireAuth } from './middleware/auth';

const app = express();

const allowedOrigins =
  process.env.FRONTEND_URL
    ?.split(",")
    .map(origin => origin.trim());

app.use(
  cors({
    origin:
      allowedOrigins?.length
        ? allowedOrigins
        : true,
  }),
);app.use(express.json());

app.all("/mcp", (req, res, next) => {
  if (!process.env.MCP_API_KEY || req.headers.authorization !== `Bearer ${process.env.MCP_API_KEY}`) return res.status(401).json({error:'Unauthorized'});
  next();
}, handleMcpRequest);
app.use("/api/auth", authRoutes);
app.use("/api", requireAuth);
app.use("/api/users", userRoutes);
app.use("/api/financial-profiles", financialProfileRoutes);
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Banorte Adaptive Life API is running",
  });
});

app.use("/api/life-events", lifeEventRoutes);
app.use("/api/savings-goals", savingsGoalRoutes);
app.use("/api/agent/sessions", agentSessionRoutes);
app.use("/api/agent/interactions", interactionRoutes);
app.use("/api", uiStateRoutes);
app.use("/api/financial-products", financialProductRoutes);
app.use("/api/mortgages", mortgageRoutes);
app.use("/api/users/:userId", userMortgageRouter);
app.use("/api/agent", agentRoutes);
app.use("/api/test-ai", testAiRoutes);

export default app;
