import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pool } from '../config/database';
async function main() {
  try {
    await pool.query(readFileSync(resolve('database/migrations/001-demo-integrity.sql'), 'utf8'));
    console.log('Applied: 001-demo-integrity.sql');
  } finally { await pool.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });