import { defineMiddleware } from "astro:middleware";
import { getSessionUser } from "@/lib/session";

/** Routes reachable without a session. */
const PUBLIC_PATHS = ["/login", "/api/login", "/api/magic", "/api/logout"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  context.locals.user = await getSessionUser(context.request);

  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (isPublic) return next();

  if (!context.locals.user) return context.redirect("/login");

  // Role check lives here too: `/admin` never renders for a plain member.
  if (pathname.startsWith("/admin") && context.locals.user.role !== "superuser") {
    return context.redirect("/");
  }

  return next();
});
