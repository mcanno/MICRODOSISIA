import type { APIRoute } from "astro";
import { createSessionCookie } from "@/lib/auth";
import { isSecureRequest } from "@/lib/http";
import { consumeMagicLinkToken } from "@/lib/magic";

/**
 * Step 2 of the login: the emailed link lands here. The token is consumed
 * (single use) and the session cookie is issued, then the user is sent on
 * their way. Public on purpose — see `middleware.ts`.
 */
export const GET: APIRoute = async ({ url, request, redirect }) => {
  const token = url.searchParams.get("token") ?? "";

  let user = null;
  try {
    user = token ? await consumeMagicLinkToken(token) : null;
  } catch (error) {
    console.error("[magic] no se pudo validar el enlace:", error);
    return redirect("/login?error=config");
  }

  if (!user) return redirect("/login?error=expired");

  const cookie = await createSessionCookie(user, isSecureRequest(url, request));
  if (!cookie) return redirect("/login?error=config");

  const headers = new Headers({ Location: "/" });
  headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
};
