import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { microdosis, users, votes, type Microdosis } from "./schema";
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

export async function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
  role?: "member" | "superuser";
}) {
  const db = getDb();
  const rows = await db
    .insert(users)
    .values({ ...input, email: input.email.trim().toLowerCase() })
    .returning();
  return rows[0];
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
