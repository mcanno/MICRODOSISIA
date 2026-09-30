import { Auth, type AuthConfig } from "@auth/core";
import Credentials from "@auth/core/providers/credentials";
import { z } from "zod";
import { findUserByEmail } from "@/lib/db/queries";
import { serverEnv } from "@/lib/env";
import { verifyPassword } from "@/lib/password";

const credentialsSchema = z.object({
  email: z.string().trim().email("Email no válido"),
  password: z.string().min(1, "Contraseña obligatoria"),
});

export const authConfig: AuthConfig = {
  secret: serverEnv("AUTH_SECRET"),
  // The catch-all route lives at `/api/auth/*`, so Auth.js must strip that
  // prefix when parsing the action from the URL.
  basePath: "/api/auth",
  // The app decides its own origin; required behind a reverse proxy.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await findUserByEmail(parsed.data.email);
        if (!user) return null;

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        // Becomes the `user` argument in the `jwt` callback below.
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    // Persist id + role in the session cookie; `session.ts` reads them back.
    jwt: ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.role = (user as unknown as { role?: string }).role;
      }
      return token;
    },
  },
};

/** Runs an Auth.js request (csrf, callback, signout…) and returns its response. */
export function auth(request: Request): Promise<Response> {
  return Auth(request, authConfig);
}

export { Auth };
