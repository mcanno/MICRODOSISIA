/// <reference types="astro/client" />

type SessionUser = import("@/lib/session").SessionUser;

declare namespace App {
  interface Locals {
    /** Set by middleware on every request; `null` when anonymous. */
    user: SessionUser | null;
  }
}
