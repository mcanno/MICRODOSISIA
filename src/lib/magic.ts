import { createHash, randomBytes } from "node:crypto";
import { consumeMagicLink, findUserByEmail, hasFreshMagicLink, insertMagicLink } from "@/lib/db/queries";
import type { SessionUser } from "@/lib/session";

/** Only SECOT addresses may ask for access; everyone is added by a superuser. */
export const SECOT_EMAIL_DOMAIN = "secot.org";

export function isSecotEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${SECOT_EMAIL_DOMAIN}`);
}

/** One link, one use, short lived. */
export const MAGIC_LINK_TTL_MINUTES = 15;
/** Do not send another link to the same address within this window. */
export const MAGIC_LINK_COOLDOWN_SECONDS = 60;

export type IssueResult =
  /** A fresh link was created (or one is already on its way). */
  | { ok: true; token: string | null }
  /** The address is not on the list of advisors. */
  | { ok: false; reason: "unknown" };

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a one-time token for `email` and returns it in clear text (it is
 * only stored hashed). Returns `null` for the token when a link was already
 * issued moments ago, so the caller does not send it twice.
 */
export async function issueMagicLink(email: string): Promise<IssueResult> {
  const normalized = email.trim().toLowerCase();

  const user = await findUserByEmail(normalized);
  if (!user) return { ok: false, reason: "unknown" };

  if (await hasFreshMagicLink(normalized, MAGIC_LINK_COOLDOWN_SECONDS)) {
    return { ok: true, token: null };
  }

  const token = randomBytes(32).toString("base64url");
  await insertMagicLink({
    email: normalized,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60_000),
  });
  return { ok: true, token };
}

/** Consumes a token and returns the signed-in user, or `null` if invalid. */
export async function consumeMagicLinkToken(token: string): Promise<SessionUser | null> {
  if (token.length < 16 || token.length > 128) return null;

  const email = await consumeMagicLink(hashToken(token));
  if (!email) return null;

  const user = await findUserByEmail(email);
  if (!user) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
