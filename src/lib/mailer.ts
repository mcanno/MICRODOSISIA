import { MAGIC_LINK_TTL_MINUTES, SECOT_EMAIL_DOMAIN } from "@/lib/magic";
import { serverEnv } from "@/lib/env";

/**
 * Delivers the access link.
 *
 * `EMAIL_TRANSPORT`:
 *   - "log"   (default) — no real mail: the link goes to the dev console.
 *             Outside localhost it refuses, so production cannot silently
 *             swallow links; set a real transport instead.
 *   - "resend"          — sends through https://resend.com (needs
 *             RESEND_API_KEY and EMAIL_FROM).
 *
 * Adding another provider (SMTP of SECOT, Brevo, SES…) only means adding a
 * branch here; nothing else in the app changes.
 */

function transport(): string {
  return (serverEnv("EMAIL_TRANSPORT") ?? "log").trim().toLowerCase();
}

export async function sendMagicLinkEmail(input: {
  to: string;
  url: string;
  /** The request comes from this machine: printing the link is acceptable. */
  local: boolean;
}): Promise<void> {
  if (transport() === "resend") {
    await sendWithResend(input.to, input.url);
    return;
  }

  if (!input.local) {
    throw new Error("EMAIL_TRANSPORT no está configurado: no se puede enviar correo en producción.");
  }

  console.log(`[mailer] Enlace de acceso para ${input.to} (no se envía correo real):`);
  console.log(`[mailer]   ${input.url}`);
}

async function sendWithResend(to: string, url: string): Promise<void> {
  const apiKey = serverEnv("RESEND_API_KEY");
  const from = serverEnv("EMAIL_FROM");
  if (!apiKey || !from) {
    throw new Error("Faltan RESEND_API_KEY o EMAIL_FROM en el entorno.");
  }

  const subject = "Tu enlace de acceso a MICRODOSISIA";
  const text = [
    "Hola,",
    "",
    `Haz clic en este enlace para entrar en MICRODOSISIA:`,
    "",
    url,
    "",
    `Caduca en ${MAGIC_LINK_TTL_MINUTES} minutos y solo sirve una vez.`,
    "Si no lo has pedido tú, puedes ignorar este mensaje.",
    "",
    "MICRODOSISIA · microaprendizajes de IA para SECOT",
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html: `<p>Hola,</p><p>Usa este enlace para entrar en <strong>MICRODOSISIA</strong>:</p><p><a href="${url}">${url}</a></p><p>Caduca en ${MAGIC_LINK_TTL_MINUTES} minutos y solo sirve una vez. Si no lo has pedido tú, ignora este mensaje.</p><p>MICRODOSISIA · microaprendizajes de IA para <a href="https://${SECOT_EMAIL_DOMAIN}">SECOT</a></p>`,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend devolvió ${response.status}: ${body.slice(0, 300)}`);
  }
}
