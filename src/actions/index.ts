import { defineAction } from "astro:actions";
import { z } from "zod";
import {
  countSuperusers,
  createUser,
  deleteUser,
  findUserByEmail,
  findUserById,
  getMicrodosis,
  deleteVote,
  insertMicrodosis,
  insertVote,
  updateState,
} from "@/lib/db/queries";
import { isSecotEmail } from "@/lib/magic";
import { canTransition, isState, requiresDocumentationUrl, STATE_LABEL } from "@/lib/states";

/** Every action answers with a plain, renderable result. */
type ActionResult = { ok: true } | { ok: false; error: string };

/** Postgres unique violation (race between two identical submissions). */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

/**
 * All actions declare `accept: "form"`: the pages submit plain HTML forms, and
 * without it Astro treats the action as JSON-only and answers 415.
 */
export const server = {
  /** Step 3 of the flow: a member adds a topic (title + description). */
  addMicrodosis: defineAction({
    accept: "form",
    input: z.object({
      title: z.string().trim().min(8, "El título necesita al menos 8 caracteres").max(120),
      description: z
        .string()
        .trim()
        .min(20, "Describe el contenido en al menos 20 caracteres")
        .max(4000),
    }),
    handler: async (input, context): Promise<ActionResult> => {
      const user = context.locals.user;
      if (!user) return { ok: false, error: "Debes iniciar sesión." };

      await insertMicrodosis({
        title: input.title,
        description: input.description,
        createdBy: user.id,
      });
      return { ok: true };
    },
  }),

  /** Step 4: record a preference on an open topic (`propuesta`). */
  voteMicrodosis: defineAction({
    accept: "form",
    input: z.object({ id: z.string().uuid() }),
    handler: async (input, context): Promise<ActionResult> => {
      const user = context.locals.user;
      if (!user) return { ok: false, error: "Debes iniciar sesión." };

      const item = await getMicrodosis(input.id);
      if (!item) return { ok: false, error: "La microdosis no existe." };
      if (item.state !== "propuesta") {
        return { ok: false, error: "Solo se pueden votar temas abiertos (en estado propuesta)." };
      }

      await insertVote(input.id, user.id);
      return { ok: true };
    },
  }),

  /** Allows retracting a vote while the topic is still open. */
  unvoteMicrodosis: defineAction({
    accept: "form",
    input: z.object({ id: z.string().uuid() }),
    handler: async (input, context): Promise<ActionResult> => {
      const user = context.locals.user;
      if (!user) return { ok: false, error: "Debes iniciar sesión." };

      const item = await getMicrodosis(input.id);
      if (!item) return { ok: false, error: "La microdosis no existe." };
      if (item.state !== "propuesta") {
        return { ok: false, error: "Este tema ya no está abierto; el voto se mantiene." };
      }

      await deleteVote(input.id, user.id);
      return { ok: true };
    },
  }),

  /** Step 6: superuser-only `propuesta → en estudio → realizada`. */
  transitionMicrodosis: defineAction({
    accept: "form",
    input: z.object({
      id: z.string().uuid(),
      to: z.string(),
      documentationUrl: z.string().url().optional(),
    }),
    handler: async (input, context): Promise<ActionResult> => {
      const user = context.locals.user;
      if (!user) return { ok: false, error: "Debes iniciar sesión." };
      if (user.role !== "superuser") {
        return { ok: false, error: "Solo un superusuario puede cambiar el estado." };
      }
      if (!isState(input.to)) return { ok: false, error: "Estado de destino no válido." };

      const item = await getMicrodosis(input.id);
      if (!item) return { ok: false, error: "La microdosis no existe." };

      // Business rule + state machine, checked on the server.
      if (!canTransition(item.state, input.to)) {
        return {
          ok: false,
          error: `Transición no permitida: ${STATE_LABEL[item.state]} → ${STATE_LABEL[input.to]}.`,
        };
      }

      const needsUrl = requiresDocumentationUrl(input.to);
      if (needsUrl && !input.documentationUrl) {
        return { ok: false, error: "Indica el enlace de documentación al marcar como realizada." };
      }

      await updateState(item.id, input.to, needsUrl ? (input.documentationUrl ?? null) : null);
      return { ok: true };
    },
  }),

  /**
   * Superuser-only step 0: adds an address to the list of people allowed in.
   * The account is activated by the emailed link, never by a password.
   */
  createUser: defineAction({
    accept: "form",
    input: z.object({
      email: z
        .string()
        .trim()
        .min(1, "Indica el correo.")
        .email("Ese correo no tiene un formato válido.")
        .refine((value) => isSecotEmail(value), "Solo se permite el dominio secot.org."),
      name: z
        .string()
        .trim()
        .min(2, "El nombre necesita al menos 2 caracteres")
        .max(80, "El nombre es demasiado largo"),
      role: z.enum(["member", "superuser"]).default("member"),
    }),
    handler: async (input, context): Promise<ActionResult> => {
      const user = context.locals.user;
      if (!user) return { ok: false, error: "Debes iniciar sesión." };
      if (user.role !== "superuser") {
        return { ok: false, error: "Solo un superusuario puede dar de alta usuarios." };
      }

      const existing = await findUserByEmail(input.email);
      if (existing) return { ok: false, error: "Ese correo ya está en la lista." };

      try {
        await createUser({ email: input.email, name: input.name, role: input.role });
      } catch (error) {
        if (isUniqueViolation(error)) return { ok: false, error: "Ese correo ya está en la lista." };
        console.error("[actions] createUser:", error);
        return { ok: false, error: "No se ha podido crear el usuario." };
      }

      return { ok: true };
    },
  }),

  /** Superuser-only: removes an address (their votes disappear with it). */
  deleteUser: defineAction({
    accept: "form",
    input: z.object({ id: z.string().uuid() }),
    handler: async (input, context): Promise<ActionResult> => {
      const user = context.locals.user;
      if (!user) return { ok: false, error: "Debes iniciar sesión." };
      if (user.role !== "superuser") {
        return { ok: false, error: "Solo un superusuario puede dar de baja usuarios." };
      }
      if (input.id === user.id) {
        return { ok: false, error: "No puedes darte de baja a ti mismo." };
      }

      const target = await findUserById(input.id);
      if (!target) return { ok: false, error: "Ese usuario ya no existe." };
      if (target.role === "superuser" && (await countSuperusers()) <= 1) {
        return { ok: false, error: "Debe quedar al menos un superusuario." };
      }

      try {
        await deleteUser(input.id);
      } catch (error) {
        console.error("[actions] deleteUser:", error);
        return { ok: false, error: "No se ha podido eliminar el usuario." };
      }

      return { ok: true };
    },
  }),
};
