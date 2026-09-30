import { and, count, desc, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "./index";
import { magicLinks, microdosis, users, votes, type Microdosis } from "./schema";
import type { MicrodosisState } from "@/lib/states";

/* ---------- users ---------- */

export async function findUserByEmail(email: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string) {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listUsers() {
  const db = getDb();
  return db.select().from(users).orderBy(users.createdAt);
}

/** Used to keep at least one superuser alive. */
export async function countSuperusers(): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, "superuser"));
  return rows[0]?.value ?? 0;
}

/** Users are created by a superuser (`/admin`) or by the CLI bootstrap script. */
export async function createUser(input: {
  email: string;
  name: string;
  role?: "member" | "superuser";
}) {
  const db = getDb();
  const rows = await db
    .insert(users)
    .values({ ...input, email: input.email.trim().toLowerCase() })
    .returning();
  return rows[0];
}

/** Removes a user together with their magic links (votes disappear by cascade). */
export async function deleteUser(id: string) {
  const db = getDb();
  const rows = await db.delete(users).where(eq(users.id, id)).returning();
  const deleted = rows[0];
  if (deleted) await deleteMagicLinks(deleted.email);
  return deleted ?? null;
}

/* ---------- magic links ---------- */

/** Replaces any outstanding link: at most one live token per address. */
export async function insertMagicLink(input: {
  email: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  const db = getDb();
  await db.delete(magicLinks).where(eq(magicLinks.email, input.email));
  await db.insert(magicLinks).values(input);
}

/**
 * Atomically consumes a token: only an unused, unexpired row updates, so the
 * link works exactly once. Returns the address it belongs to.
 */
export async function consumeMagicLink(tokenHash: string): Promise<string | null> {
  const db = getDb();
  const now = new Date();
  const rows = await db
    .update(magicLinks)
    .set({ usedAt: now })
    .where(
      and(
        eq(magicLinks.tokenHash, tokenHash),
        isNull(magicLinks.usedAt),
        gt(magicLinks.expiresAt, now),
      ),
    )
    .returning({ email: magicLinks.email });
  return rows[0]?.email ?? null;
}

/** `true` when the address asked for a link less than `seconds` ago. */
export async function hasFreshMagicLink(email: string, seconds: number): Promise<boolean> {
  const db = getDb();
  const since = new Date(Date.now() - seconds * 1000);
  const rows = await db
    .select({ id: magicLinks.id })
    .from(magicLinks)
    .where(
      and(
        eq(magicLinks.email, email),
        isNull(magicLinks.usedAt),
        gt(magicLinks.createdAt, since),
        gt(magicLinks.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Drops live and expired tokens for an address (also used on user removal). */
export async function deleteMagicLinks(email: string) {
  const db = getDb();
  await db.delete(magicLinks).where(eq(magicLinks.email, email));
}

/* ---------- microdosis ---------- */

export type MicrodosisWithStats = Microdosis & {
  voteCount: number;
  votedByMe: boolean;
};

export async function listMicrodosis(states?: MicrodosisState[]): Promise<MicrodosisWithStats[]> {
  const db = getDb();
  const all = await db.select().from(microdosis).orderBy(desc(microdosis.createdAt));

  const counted = await db
    .select({ microdosisId: votes.microdosisId, total: count() })
    .from(votes)
    .groupBy(votes.microdosisId);

  const countByItem = new Map(counted.map((row) => [row.microdosisId, row.total]));

  const rows: MicrodosisWithStats[] = all.map((item) => ({
    ...item,
    voteCount: countByItem.get(item.id) ?? 0,
    votedByMe: false,
  }));

  return states ? rows.filter((row) => states.includes(row.state)) : rows;
}

/** Same as `listMicrodosis` but flagging the votes cast by `userId`. */
export async function listMicrodosisForUser(
  userId: string | undefined,
  states?: MicrodosisState[],
): Promise<MicrodosisWithStats[]> {
  const rows = await listMicrodosis(states);
  if (!userId) return rows;

  const db = getDb();
  const mine = await db.select({ microdosisId: votes.microdosisId }).from(votes).where(eq(votes.userId, userId));
  const mineSet = new Set(mine.map((row) => row.microdosisId));
  return rows.map((row) => ({ ...row, votedByMe: mineSet.has(row.id) }));
}

export async function getMicrodosis(id: string) {
  const db = getDb();
  const rows = await db.select().from(microdosis).where(eq(microdosis.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function insertMicrodosis(input: {
  title: string;
  description: string;
  createdBy: string;
}) {
  const db = getDb();
  const rows = await db.insert(microdosis).values(input).returning();
  return rows[0];
}

/**
 * Persists a state transition. Callers must have validated it with
 * `canTransition()`; the database trigger is the second line of defence.
 */
export async function updateState(
  id: string,
  state: MicrodosisState,
  documentationUrl: string | null,
) {
  const db = getDb();
  const rows = await db
    .update(microdosis)
    .set({ state, documentationUrl, updatedAt: new Date() })
    .where(eq(microdosis.id, id))
    .returning();
  return rows[0] ?? null;
}

/* ---------- votes ---------- */

/** Returns `true` when the vote was created, `false` if it already existed. */
export async function insertVote(microdosisId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .insert(votes)
    .values({ microdosisId, userId })
    .onConflictDoNothing()
    .returning();
  return rows.length > 0;
}

export async function deleteVote(microdosisId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .delete(votes)
    .where(and(eq(votes.microdosisId, microdosisId), eq(votes.userId, userId)))
    .returning();
  return rows.length > 0;
}
