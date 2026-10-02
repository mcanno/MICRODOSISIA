import manualSource from "../../docs/manual-usuario.md?raw";
import estructuraSource from "../../docs/estructura-drive.md?raw";
import plantillaSource from "../../docs/plantilla-archivo/index.html?raw";
import { marked } from "marked";

/**
 * Help content is loaded from `docs/` at build time (`?raw`), so editing the
 * Markdown and pushing is enough to update the page — no component changes.
 *
 * The Markdown is first-party content from this repository, never user input;
 * it is rendered with `marked` and served as-is.
 */

/** Repo-relative links that make no sense inside the app. */
function adaptLinks(markdown: string): string {
  return (
    markdown
      // Friendly labels first: advisors should not see file names.
      .replaceAll(
        "[`plantilla-archivo/index.html`](../plantilla-archivo/index.html)",
        "[plantilla `index.html`](/ayuda/plantilla)",
      )
      .replaceAll(
        "[`plantilla-archivo/index.html`](plantilla-archivo/index.html)",
        "[plantilla `index.html`](/ayuda/plantilla)",
      )
      .replaceAll(
        "[`estructura-drive.md`](estructura-drive.md)",
        "[cómo preparar un estudio](/ayuda#estructura)",
      )
      .replaceAll("[`manual-usuario.md`](manual-usuario.md)", "[manual de usuario](/ayuda#manual)")
      // Safety net for any other relative link to these documents.
      .replaceAll("](../plantilla-archivo/index.html)", "](/ayuda/plantilla)")
      .replaceAll("](plantilla-archivo/index.html)", "](/ayuda/plantilla)")
      .replaceAll("](estructura-drive.md)", "](/ayuda#estructura)")
      .replaceAll("](manual-usuario.md)", "](/ayuda#manual)")
      // Internal (developer) documents: dropped from the advisor view —
      // `pendientes.md` in particular is not meant to be public.
      .replace(/\nRelacionado:.*$/s, "\n")
  );
}

/** Renders one of the `docs/` Markdown files to HTML. */
export function renderDoc(markdown: string): string {
  const html = marked.parse(adaptLinks(markdown), { async: false });
  // Open external links in a new tab; internal `/ayuda…` links stay put.
  return html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"');
}

export const docs = {
  manual: { id: "manual", title: "Manual de usuario", source: manualSource },
  estructura: { id: "estructura", title: "Estructura de un estudio", source: estructuraSource },
} as const;

/** The study template, served as a download from `/ayuda/plantilla`. */
export const plantillaHtml = plantillaSource;
