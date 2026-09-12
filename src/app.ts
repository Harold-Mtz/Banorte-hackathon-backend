import express from "express";
import financialProductRoutes from "./routes/financial-product.routes";
import mortgageRoutes, { userMortgageRouter } from "./routes/mortgage.routes";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Banorte Adaptive Life API is running",
  });
});

app.use("/api/financial-products", financialProductRoutes);
app.use("/api/mortgages", mortgageRoutes);
app.use("/api/mortgage", mortgageRoutes);
app.use("/api/users/:userId", userMortgageRouter);

export default app;
