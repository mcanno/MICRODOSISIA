import { MAGIC_LINK_TTL_MINUTES, SECOT_EMAIL_DOMAIN } from "@/lib/magic";
import { serverEnv } from "@/lib/env";

/**
 * Delivers the access link.
 *
 * `EMAIL_TRANSPORT`:
 *   - "log"   (default) — no real mail: the link goes to the dev console.
 *             Outside localhost it refuses, so production cannot silently
 *             swallow links; set a real transport instead.
 *   - "smtp"            — real mail through any SMTP server (nodemailer).
 *             Microsoft 365, which is what secot.org runs on:
 *             SMTP_HOST=smtp.office365.com, SMTP_PORT=587, SMTP_USER and
 *             SMTP_PASS = the mailbox (an app password when MFA is on),
 *             EMAIL_FROM = that same mailbox.
 *   - "resend"          — sends through https://resend.com (needs
 *             RESEND_API_KEY and EMAIL_FROM); needs DNS records for the domain.
 *
 * Adding another provider only means adding a branch here; nothing else in
 * the app changes.
 */

function transport(): string {
  return (serverEnv("EMAIL_TRANSPORT") ?? "log").trim().toLowerCase();
}

/** True while nothing can really be emailed, so the link is shown instead. */
export function isLogTransport(): boolean {
  return transport() === "log";
}

export async function sendMagicLinkEmail(input: {
  to: string;
  url: string;
  /** The request comes from this machine: printing the link is acceptable. */
  local: boolean;
}): Promise<void> {
  const kind = transport();

  if (kind === "smtp") {
    await sendWithSmtp(input.to, input.url);
    return;
  }

  if (kind === "resend") {
    await sendWithResend(input.to, input.url);
    return;
  }

  if (!input.local) {
    throw new Error("EMAIL_TRANSPORT no está configurado: no se puede enviar correo en producción.");
  }

  console.log(`[mailer] Enlace de acceso para ${input.to} (no se envía correo real):`);
  console.log(`[mailer]   ${input.url}`);
}

/** The message itself, identical for every transport. */
function message(url: string): { subject: string; text: string; html: string } {
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
  const html = `<p>Hola,</p><p>Usa este enlace para entrar en <strong>MICRODOSISIA</strong>:</p><p><a href="${url}">${url}</a></p><p>Caduca en ${MAGIC_LINK_TTL_MINUTES} minutos y solo sirve una vez. Si no lo has pedido tú, ignora este mensaje.</p><p>MICRODOSISIA · microaprendizajes de IA para <a href="https://${SECOT_EMAIL_DOMAIN}">SECOT</a></p>`;

  return { subject, text, html };
}

async function sendWithSmtp(to: string, url: string): Promise<void> {
  const host = serverEnv("SMTP_HOST");
  const user = serverEnv("SMTP_USER");
  const pass = serverEnv("SMTP_PASS");
  const from = serverEnv("EMAIL_FROM");
  if (!host || !user || !pass || !from) {
    throw new Error("Faltan SMTP_HOST, SMTP_USER, SMTP_PASS o EMAIL_FROM en el entorno.");
  }

  const port = Number(serverEnv("SMTP_PORT") ?? "587");
  const { createTransport } = await import("nodemailer");
  const tls = await extraCa();
  const transporter = createTransport({
    host,
    port,
    // 465 speaks implicit TLS; 587 (the M365 default) starts plain and upgrades.
    secure: port === 465,
    auth: { user, pass },
    ...(tls ? { tls } : {}),
  });

  const { subject, text, html } = message(url);
  // Resolves only once the server accepts the message, so failures surface
  // as `error=send` on the login page instead of a link nobody received.
  await transporter.sendMail({ from, to, subject, text, html });
}

/**
 * Optional `SMTP_CA_FILE`: a PEM bundle trusted *in addition to* Node's own
 * roots. Only needed on a machine whose antivirus intercepts SMTP STARTTLS
 * (Avast Mail Shield does, and Node does not read the Windows cert store).
 * Empty in production, where the real certificate chain is used.
 */
async function extraCa(): Promise<{ ca: string[] } | undefined> {
  const file = serverEnv("SMTP_CA_FILE");
  if (!file) return undefined;

  const { readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const { rootCertificates } = await import("node:tls");
  return { ca: [...rootCertificates, readFileSync(resolve(file), "utf8")] };
}

async function sendWithResend(to: string, url: string): Promise<void> {
  const apiKey = serverEnv("RESEND_API_KEY");
  const from = serverEnv("EMAIL_FROM");
  if (!apiKey || !from) {
    throw new Error("Faltan RESEND_API_KEY o EMAIL_FROM en el entorno.");
  }

  const { subject, text, html } = message(url);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend devolvió ${response.status}: ${body.slice(0, 300)}`);
  }
}
