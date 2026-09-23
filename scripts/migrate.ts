/**
 * Apply pending Drizzle migrations from ./drizzle.
 *
 *   bun scripts/migrate.ts                  fails if no database URL is set
 *   bun scripts/migrate.ts --if-configured  skips until one is set (used by `bun run dev`)
 *
 * Reads .env files the way Next.js does and prefers the direct (unpooled)
 * Neon connection, which suits schema changes.
 */
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const root = fileURLToPath(new URL("..", import.meta.url));
const ifConfigured = process.argv.includes("--if-configured");

// Dev mode unless NODE_ENV says otherwise, matching the env files `next dev` loads.
loadEnvConfig(root, process.env.NODE_ENV !== "production", { info: () => {}, error: console.error });

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

async function appliedCount(pool: Pool): Promise<number> {
  try {
    const { rows } = await pool.query<{ count: string }>(
      "select count(*) from drizzle.__drizzle_migrations"
    );
    return Number(rows[0].count);
  } catch {
    return 0; // No migrations table yet.
  }
}

async function main() {
  if (!url) {
    if (ifConfigured) {
      console.log("db: migrations skipped, DATABASE_URL is not set (see .env.example)");
      return;
    }
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection strings.");
  }

  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const before = await appliedCount(pool);
    await migrate(drizzle({ client: pool }), { migrationsFolder: `${root}drizzle` });
    const applied = (await appliedCount(pool)) - before;
    console.log(
      applied ? `db: applied ${applied} migration${applied === 1 ? "" : "s"}` : "db: schema is up to date"
    );
  } finally {
    await pool.end();
  }
}

/** One line per error in the cause chain, e.g. the failed query, then "connect ECONNREFUSED". */
function describe(error: unknown): string[] {
  const lines: string[] = [];
  for (let current = error; current; current = (current as { cause?: unknown }).cause) {
    if (!(current instanceof Error)) {
      lines.push(String(current));
      break;
    }
    // node-postgres reports "localhost" refusals as an AggregateError with an empty message.
    const inner = current instanceof AggregateError ? current.errors[0] : undefined;
    lines.push((current.message || (inner instanceof Error ? inner.message : current.name)).split("\n")[0]);
  }
  return lines;
}

main().catch((error: unknown) => {
  console.error(`db: migration failed\n  ${describe(error).join("\n  ")}`);
  process.exit(1);
});
