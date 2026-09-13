import dotenv from "dotenv";
import app from "./app";
import { pool } from "./config/database";
import { startGoalReminderScheduler } from "./schedulers/goal-reminder.scheduler";
dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    const result = await pool.query("SELECT NOW()");

    console.log("✅ PostgreSQL conectado");
    console.log("Database time:", result.rows[0].now);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
    startGoalReminderScheduler();
  } catch (error) {
    console.error("❌ No fue posible conectar con PostgreSQL");
    console.error(error);

    process.exit(1);
  }
}

startServer();
