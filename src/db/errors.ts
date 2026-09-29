/**
 * Whether a query failed because its table isn't there yet: code that reads a
 * new table can reach a server before `bun run db:migrate` has run against
 * its database.
 */
export function isMissingTable(error: unknown): boolean {
  for (let current = error; current; current = (current as { cause?: unknown }).cause) {
    if ((current as { code?: string }).code === "42P01") return true;
  }
  return false;
}
