import type { APIRoute } from "astro";

/**
 * Sign out: clears both variants of the session cookie and returns to login.
 * Clearing a cookie is safe to trigger with a plain GET link.
 */
export const GET: APIRoute = () => {
  const expire = "Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax";
  const headers = new Headers({ Location: "/login" });
  headers.append("Set-Cookie", `authjs.session-token=; ${expire}`);
  headers.append("Set-Cookie", `__Secure-authjs.session-token=; ${expire}`);

  return new Response(null, { status: 302, headers });
};
