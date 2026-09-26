import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { seedCatalog } from "./seed-catalog.mjs";
import { seedHistorical } from "./seed-historical.mjs";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const directory = fileURLToPath(new URL("./migrations/", import.meta.url));
  try {
    await client.query("SELECT pg_advisory_lock(736241890)");
    await client.query("CREATE TABLE IF NOT EXISTS arena_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
    for (const name of (await readdir(directory)).filter(name => name.endsWith(".sql")).sort()) {
      const existing = await client.query("SELECT 1 FROM arena_migrations WHERE name=$1", [name]);
      if (existing.rowCount) continue;
      try {
        await client.query("BEGIN");
        await client.query(await readFile(join(directory, name), "utf8"));
        await client.query("INSERT INTO arena_migrations(name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    if (process.env.ARENA_SEED_HISTORICAL === "true") { await seedHistorical(client); await seedCatalog(client); }
  } finally {
    await client.query("SELECT pg_advisory_unlock(736241890)");
    client.release();
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
