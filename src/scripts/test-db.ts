import { pool } from "../config/database";

async function testDatabase() {
  try {
    const result = await pool.query(`
      SELECT
        NOW() AS server_time,
        current_database() AS database
    `);

    console.log("✅ PostgreSQL conectado correctamente");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("❌ Error conectando a PostgreSQL");
    console.error(error);
  } finally {
    await pool.end();
  }
}

testDatabase();