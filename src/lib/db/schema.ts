import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["member", "superuser"]);
export const microdosisStateEnum = pgEnum("microdosis_state", ["propuesta", "en_estudio", "realizada"]);

/** No passwords: access is granted by emailing a one-time link (magic link). */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One-time access tokens. Only the SHA-256 digest is stored, so a database
 * dump cannot be replayed as a login link. A row is consumed atomically
 * (`used_at` set) on the first visit.
 */
export const magicLinks = pgTable(
  "magic_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => [index("magic_links_email_idx").on(t.email)],
);

export const microdosis = pgTable("microdosis", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  state: microdosisStateEnum("state").notNull().default("propuesta"),
  /** Required on the transition into `realizada`. */
  documentationUrl: text("documentation_url"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    microdosisId: uuid("microdosis_id")
      .notNull()
      .references(() => microdosis.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("votes_microdosis_user_unique").on(t.microdosisId, t.userId)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type MagicLink = typeof magicLinks.$inferSelect;
export type Microdosis = typeof microdosis.$inferSelect;
export type NewMicrodosis = typeof microdosis.$inferInsert;
export type Vote = typeof votes.$inferSelect;
