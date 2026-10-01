import { decode } from "@auth/core/jwt";
import { serverEnv } from "@/lib/env";
import { findUserById } from "@/lib/db/queries";

export type Role = "member" | "superuser";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

/** Auth.js cookie name, with and without the `__Secure-` prefix (HTTPS). */
const COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"] as const;

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

/**
 * Reads the Auth.js session cookie without hitting `/api/auth/session`.
 *
 * The cookie only proves *who* you are; the role, the name and whether the
 * account still exist are read from the database on every request, so a
 * promotion, a demotion or a removal applies immediately instead of lasting
 * the 30 days of the token.
 *
 * Returns `null` for anonymous, tampered or stale cookies.
 */
export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const secret = serverEnv("AUTH_SECRET");
  if (!secret) return null;

  const cookies = parseCookies(request.headers.get("cookie") ?? "");

  for (const name of COOKIE_NAMES) {
    const token = cookies[name];
    if (!token) continue;

    // Auth.js derives the encryption key with the cookie name as salt.
    // A tampered or expired token throws; treat it as "not signed in".
    let payload;
    try {
      payload = await decode({ token, secret, salt: name });
    } catch {
      continue;
    }
    if (!payload?.sub) continue;

    try {
      const user = await findUserById(payload.sub);
      // Banned account: the leftover cookie stops working right away.
      if (!user) continue;
      return { id: user.id, email: user.email, name: user.name, role: user.role };
    } catch (error) {
      // No database (misconfigured deployment): anonymous is safer than a
      // session nobody can validate. The pages that need data fail on their own.
      console.error("[session] no se pudo validar el usuario contra la base de datos:", error);
      return null;
    }
  }

  return null;
}
