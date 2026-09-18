/**
 * Build-time unique ids for components that must point ARIA at their own markup
 * (for example `Callout`, whose `role="note"` needs an accessible name from its label).
 *
 * Astro frontmatter runs once per render, so a counter has to live in a module. Ids are
 * unique within a page, which is all `aria-labelledby` needs; they are not stable between
 * builds, and nothing is asserted against them.
 *
 * The counter is module-global and is never reset, so the numbers a page gets depend on how
 * many components rendered before it in the same build. That is harmless today. It stops being
 * harmless the moment something diffs built HTML — `dist` snapshots, visual baselines keyed on
 * ids, or a "no unexpected change" check: an unrelated new page would then renumber every id
 * downstream. Whoever adds such a check should call `resetUid()` per page render first.
 */
let counter = 0;

export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

/** Restart the numbering. Only for callers that need ids to be stable per page (see above). */
export function resetUid(): void {
  counter = 0;
}
