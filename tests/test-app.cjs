// Isolated SQL adapter for tests only. Production always uses PostgreSQL.
const { newDb, DataType } = require("pg-mem");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
process.env.DATABASE_URL = "postgresql://unused/test";
process.env.JWT_SECRET = "isolated-test-secret-not-for-production";
process.env.GEMINI_API_KEY = "isolated-test-key";
const db = newDb();
db.registerExtension("pgcrypto", (schema) =>
  schema.registerFunction({
    name: "gen_random_uuid",
    returns: DataType.uuid,
    impure: true,
    implementation: randomUUID,
  }),
);
db.public.registerFunction({
  name: "hashtext",
  args: [DataType.text],
  returns: DataType.integer,
  implementation: () => 1,
});
for (const name of ["pg_advisory_lock", "pg_advisory_unlock"])
  db.public.registerFunction({
    name,
    args: [DataType.integer],
    returns: DataType.bool,
    implementation: () => true,
  });
db.public.none(
  fs.readFileSync(path.join(__dirname, "../database/schema.sql"), "utf8"),
);
const adapter = db.adapters.createPg();
const pool = new adapter.Pool();
const databasePath = require.resolve("../dist/config/database");
require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: { pool },
};
const { GeminiClient } = require("../dist/ai/gemini-client");
GeminiClient.prototype.generate = async () => "FIRST_HOME";
const app = require("../dist/app").default;
async function start(port = 0) {
  const productId = randomUUID();
  await pool.query(
    "INSERT INTO financial_products (id,name,type,interest_rate,cat,minimum_amount,maximum_amount,minimum_term_months,maximum_term_months) VALUES ($1,$2,$3,10,12,100000,10000000,60,360)",
    [productId, "Hipoteca de prueba", "MORTGAGE"],
  );
  const server = await new Promise((resolve, reject) => {
    const server = app.listen(port, "127.0.0.1", (error) =>
      error ? reject(error) : resolve(server),
    );
  });
  return {
    server,
    pool,
    productId,
    url: `http://127.0.0.1:${server.address().port}`,
  };
}
module.exports = { start };
if (require.main === module)
  start(Number(process.env.TEST_PORT) || 3101).then(({ url }) =>
    console.log(`Isolated test API: ${url}`),
  );
