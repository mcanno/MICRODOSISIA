import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";

/**
 * Auth.js endpoint router: everything under `/api/auth/*`
 * (csrf, callback/credentials, signout, session…) is handled here.
 */
export const GET: APIRoute = ({ request }) => auth(request);
export const POST: APIRoute = ({ request }) => auth(request);
