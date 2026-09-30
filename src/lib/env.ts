import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Server-side environment access.
 *
 * Astro does *not* put `.env` values into `process.env` (they go to
 * `import.meta.env` instead), but Auth.js, Drizzle and the `tsx` scripts all
 * read `process.env`. This module loads `.env` into `process.env` and
 * exposes one accessor.
 *
 * Rules:
 * - Variables already set by the real environment always win.
 * - An empty value (`KEY=`) counts as unset, so a later `.env` write (for
 *   example `neon link` pulling the real DATABASE_URL) is picked up.
 * - The file is re-read when its mtime changes, because the dev server
 *   restarts in-process when `.env` changes.
 */
type Loaded = { file: string; mtimeMs: number };

let loaded: Loaded | undefined;
/** Keys this module wrote, so they can be refreshed on the next reload. */
const injected = new Set<string>();

export function loadEnv(): void {
  const file = resolve(process.cwd(), ".env");
  if (!existsSync(file)) return;

  const mtimeMs = statSync(file).mtimeMs;
  if (loaded?.file === file && loaded.mtimeMs === mtimeMs) return;
  loaded = { file, mtimeMs };

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
    if (!key || value === "") continue;

    const current = process.env[key];
    if (current === undefined || current === "" || injected.has(key)) {
      process.env[key] = value;
      injected.add(key);
    }
  }
}

/** Reads a server variable; an empty value counts as unset. */
export function serverEnv(key: string): string | undefined {
  loadEnv();
  const value = process.env[key];
  return value === "" || value === undefined ? undefined : value;
}
