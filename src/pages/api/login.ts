import type { APIRoute } from "astro";
import { z } from "zod";
import { isLocalRequest, requestOrigin } from "@/lib/http";
import { isSecotEmail, issueMagicLink } from "@/lib/magic";
import { sendMagicLinkEmail } from "@/lib/mailer";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Indica tu correo.")
  .pipe(z.email("Ese correo no tiene un formato válido."));

/**
 * Step 1 of the login: the form posts the address here. If it is a SECOT
 * address already added by a superuser, a one-time link is emailed.
 *
 * This is one of the two write endpoints outside Astro actions on purpose:
 * the caller is anonymous, so it cannot go through a session-guarded action
 * (see `middleware.ts` PUBLIC_PATHS and AGENTS.md).
 */
export const POST: APIRoute = async ({ request, url, redirect }) => {
  const form = await request.formData().catch(() => null);
  const back = (params: Record<string, string>) =>
    redirect(`/login?${new URLSearchParams(params).toString()}`);

  const parsed = emailSchema.safeParse(String(form?.get("email") ?? ""));
  if (!parsed.success) return back({ error: "email" });
  if (!isSecotEmail(parsed.data)) return back({ error: "domain" });

  let issued;
  try {
    issued = await issueMagicLink(parsed.data);
  } catch (error) {
    console.error("[login] no se pudo crear el enlace:", error);
    return back({ error: "config" });
  }

  if (!issued.ok) return back({ error: "unknown" });

  const params = new URLSearchParams({ sent: "1" });

  if (issued.token) {
    const link = `${requestOrigin(url, request)}/api/magic?token=${encodeURIComponent(issued.token)}`;
    const local = isLocalRequest(url, request);

    try {
      await sendMagicLinkEmail({ to: parsed.data, url: link, local });
    } catch (error) {
      console.error("[login] no se pudo enviar el correo:", error);
      return back({ error: "send" });
    }

    // Without a mail provider the link is shown on the next page instead of
    // being emailed — only ever possible from this machine.
    if (local) params.set("link", link);
  }

  return back(Object.fromEntries(params));
};
