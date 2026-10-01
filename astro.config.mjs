import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import vercel from "@astrojs/vercel";

// Vercel sets VERCEL=1 for the build it runs in the cloud. Local builds keep
// the Node adapter so `npm run dev` and `npm run preview` behave exactly as
// before (the Vercel adapter only works under `vercel dev`/deploy).
const onVercel = process.env.VERCEL === "1";

/**
 * Hosts whose requests Astro is allowed to rebuild: without an entry here it
 * ignores the `Host` header and falls back to `http://localhost`, which makes
 * `checkOrigin` reject every form POST (403) in production.
 *
 * `microdosis-ia.vercel.app` is the deployed hostname — if the Vercel project
 * is renamed or a custom domain is added, add it here (PUBLIC_SITE_URL is
 * picked up automatically as well).
 */
const hosts = new Set(["localhost", "microdosis-ia.vercel.app"]);
if (process.env.PUBLIC_SITE_URL) {
  try {
    hosts.add(new URL(process.env.PUBLIC_SITE_URL).hostname);
  } catch {
    // An unparseable PUBLIC_SITE_URL must not break the build.
  }
}

export default defineConfig({
  output: "server",
  adapter: onVercel ? vercel({ maxDuration: 30 }) : node({ mode: "standalone" }),
  server: { port: 4321 },
  security: {
    allowedDomains: [...hosts].map((hostname) => ({ hostname })),
  },
});
