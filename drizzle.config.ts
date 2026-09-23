import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so load .env.local the same way Next does.
loadEnvConfig(process.cwd());

// Migrations use the direct connection: Neon's pooler (PgBouncer) does not
// suit schema changes. Neon's Vercel integration sets both variables.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  ...(url ? { dbCredentials: { url } } : {}),
  strict: true,
  verbose: true,
});
