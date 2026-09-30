import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { serverEnv } from "@/lib/env";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDatabase>;

function createDatabase() {
  const url = serverEnv("DATABASE_URL");
  if (!url) {
    throw new Error(
      "DATABASE_URL no está definida. Copia .env.example a .env y añade la cadena de conexión de Neon.",
    );
  }
  return drizzle({ client: neon(url), schema });
}

/**
 * Lazy singleton: importing this module must not throw at build time, when
 * `.env` may be absent. The connection is created on first query instead.
 */
let cached: Database | undefined;

export function getDb(): Database {
  cached ??= createDatabase();
  return cached;
}
