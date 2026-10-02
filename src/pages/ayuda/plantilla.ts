import type { APIRoute } from "astro";
import { plantillaHtml } from "@/lib/docs";

/**
 * Serves the study `index.html` template as a download. Keeping a single copy
 * in `docs/plantilla-archivo/` means the help page and this route can never
 * disagree about which version advisors get.
 *
 * Like every non-public path, the middleware requires a session first.
 */
export const GET: APIRoute = () =>
  new Response(plantillaHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": 'attachment; filename="index.html"',
      "Cache-Control": "no-store",
    },
  });
