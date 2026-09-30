/**
 * Small request helpers shared by the magic-link endpoints.
 * The app can run behind a reverse proxy, so `X-Forwarded-*` wins when set.
 */

function forwarded(request: Request, header: string): string | null {
  const value = request.headers.get(header);
  return value ? value.split(",")[0].trim() : null;
}

/** Absolute origin of the current request (`https://host`). */
export function requestOrigin(url: URL, request: Request): string {
  const proto = forwarded(request, "x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = forwarded(request, "x-forwarded-host") ?? url.host;
  return `${proto}://${host}`;
}

/** Cookies only get the `Secure` flag when the page really arrived over HTTPS. */
export function isSecureRequest(url: URL, request: Request): boolean {
  const proto = forwarded(request, "x-forwarded-proto") ?? url.protocol.replace(":", "");
  return proto === "https";
}

/**
 * The request comes from this machine (dev server or local preview). Used to
 * decide whether it is safe to show/send the link without a mail provider.
 */
export function isLocalRequest(url: URL, request: Request): boolean {
  let hostname: string;
  try {
    hostname = new URL(requestOrigin(url, request)).hostname;
  } catch {
    return false;
  }
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
