import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Para evitar abrir demasiadas conexiones.
  max: 5,
  // Cierra conexiones inactivas después de 10 segundos.
  idleTimeoutMillis: 10000,
  // Espera máximo 5 segundos para conectarse.
  connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
  console.error("Error inesperado en PostgreSQL:", error);
});