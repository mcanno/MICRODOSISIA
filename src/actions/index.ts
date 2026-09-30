import { defineAction } from "astro:actions";
import { z } from "zod";
import { getMicrodosis, deleteVote, insertMicrodosis, insertVote, updateState } from "@/lib/db/queries";
import { canTransition, isState, requiresDocumentationUrl, STATE_LABEL } from "@/lib/states";

/** Every action answers with a plain, renderable result. */
type ActionResult = { ok: true } | { ok: false; error: string };

export const server = {
  /** Step 3 of the flow: a member adds a topic (title + description). */
  addMicrodosis: defineAction({
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
};
