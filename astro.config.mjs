import { defineConfig } from "astro/config";
import node from "@astrojs/node";

// SSR is required: login, votes and state transitions run on the server.
// The Node adapter keeps the build portable (Railway, Render, Fly, a VPS…).
// If you deploy to Vercel or Netlify, swap it for @astrojs/vercel or
// @astrojs/netlify — nothing else in the app changes.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  server: { port: 4321 },
});
