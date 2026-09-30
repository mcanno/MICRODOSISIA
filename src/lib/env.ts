import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Server-side environment access.
 *
 * Astro does *not* put `.env` values into `process.env` (they go to
 * `import.meta.env` instead), but Auth.js, Drizzle and the `tsx` scripts all
 * read `process.env`. This module loads `.env` once into `process.env` and
 * exposes one accessor. Real environment variables always win, so on a host
 * with DATABASE_URL/AUTH_SECRET configured the file is irrelevant.
 */
let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  const file = resolve(process.cwd(), ".env");
  if (!existsSync(file)) return;

  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = line.indexOf("=");
    if (index === -1) continue;

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

/** Reads a server variable; an empty value counts as unset. */
export function serverEnv(key: string): string | undefined {
  loadEnv();
  const value = process.env[key];
  return value === "" || value === undefined ? undefined : value;
}
