import { decode } from "@auth/core/jwt";
import { serverEnv } from "@/lib/env";

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
 * Returns `null` for anonymous or tampered cookies.
 */
export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const secret = serverEnv("AUTH_SECRET");
  if (!secret) return null;

  const cookies = parseCookies(request.headers.get("cookie") ?? "");

  for (const name of COOKIE_NAMES) {
    const token = cookies[name];
    if (!token) continue;

    // Auth.js derives the encryption key with the cookie name as salt.
    const payload = await decode({ token, secret, salt: name });
    if (!payload?.sub) continue;

    return {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : "",
      name: typeof payload.name === "string" ? payload.name : "",
      role: payload.role === "superuser" ? "superuser" : "member",
    };
  }

  return null;
}
