import { encode } from "@auth/core/jwt";
import { serverEnv } from "@/lib/env";
import type { SessionUser } from "@/lib/session";

/**
 * Auth.js issues and reads the session JWT (`@auth/core/jwt`), but there is no
 * credential provider any more: `/api/login` mints the cookie after the magic
 * link check. The cookie name doubles as the key-derivation salt, so it must
 * match `session.ts` exactly.
 */
export const SESSION_COOKIE = "authjs.session-token";
export const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token";

/** Same lifetime Auth.js uses by default: 30 days. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Builds the `Set-Cookie` value that signs the user in.
 * Returns `null` when AUTH_SECRET is missing (misconfigured deployment).
 */
export async function createSessionCookie(
  user: SessionUser,
  secure: boolean,
): Promise<string | null> {
  const secret = serverEnv("AUTH_SECRET");
  if (!secret) return null;

  const name = secure ? SECURE_SESSION_COOKIE : SESSION_COOKIE;
  const token = await encode({
    secret,
    salt: name,
    maxAge: SESSION_MAX_AGE,
    token: { sub: user.id, email: user.email, name: user.name, role: user.role },
  });

  const flags = ["Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${SESSION_MAX_AGE}`];
  if (secure) flags.push("Secure");
  return `${name}=${token}; ${flags.join("; ")}`;
}
