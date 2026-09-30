import { defineConfig } from "drizzle-kit";
import { serverEnv } from "./src/lib/env";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: serverEnv("DATABASE_URL") ?? "",
  },
});
