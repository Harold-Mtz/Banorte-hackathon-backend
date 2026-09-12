import express from "express";
import userRoutes from "./routes/user.routes";
import financialProfileRoutes from "./routes/financial-profile.routes";


const app = express();

app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/financial-profiles", financialProfileRoutes);
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Banorte Adaptive Life API is running",
  });
});

export default app;
