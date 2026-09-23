import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

function createDb(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string."
    );
  }

  // A TCP pool, as Neon recommends for Node servers and Vercel Fluid compute.
  // On Vercel, attachDatabasePool closes idle connections before the function
  // is suspended; everywhere else it does nothing.
  const pool = new Pool({ connectionString });
  attachDatabasePool(pool);
  return drizzle({ client: pool, schema });
}

// One pool per server instance. The global survives dev hot reloads, which
// would otherwise open a new pool on every edit.
const globalForDb = globalThis as typeof globalThis & { astaadDb?: Database };

/** The Drizzle client. Created on first use so builds and static pages never need DATABASE_URL. */
export function getDb(): Database {
  globalForDb.astaadDb ??= createDb();
  return globalForDb.astaadDb;
}

export { schema };
