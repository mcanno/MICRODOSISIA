/**
 * Single source of truth for the microdosis lifecycle.
 * Routes, actions and UI must all go through these helpers so a transition
 * can never be expressed in two different ways.
 */

export const STATES = ["propuesta", "en_estudio", "realizada"] as const;

export type MicrodosisState = (typeof STATES)[number];

/** Human labels (Spanish, as shown to SECOT members). */
export const STATE_LABEL: Record<MicrodosisState, string> = {
  propuesta: "Propuesta",
  en_estudio: "En estudio",
  realizada: "Realizada",
};

/** Transitions are one-way: propuesta → en estudio → realizada. */
export const NEXT_STATE: Record<MicrodosisState, MicrodosisState | null> = {
  propuesta: "en_estudio",
  en_estudio: "realizada",
  realizada: null,
};

export function isState(value: unknown): value is MicrodosisState {
  return typeof value === "string" && (STATES as readonly string[]).includes(value);
}

export function canTransition(from: MicrodosisState, to: MicrodosisState): boolean {
  return NEXT_STATE[from] === to;
}

/** The documentation link is mandatory exactly when reaching `realizada`. */
export function requiresDocumentationUrl(to: MicrodosisState): boolean {
  return to === "realizada";
}
