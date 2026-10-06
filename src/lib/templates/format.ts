/**
 * A date picked in a template form, written the way the page's language writes dates
 * (`5 October 2026`, `5 Oktober 2026`).
 *
 * `formatDate` in `src/i18n/index.ts` does the same at build time, but it reads the month names
 * from the whole dictionary, which a client script must not bundle. The page passes the twelve
 * names and `date.format` instead, and this function uses them. Returns `undefined` for anything
 * that is not a real `YYYY-MM-DD` date, so the preview never prints a wrong one.
 */
export function formatIsoDate(
  iso: string,
  months: readonly string[],
  pattern: string,
): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return undefined;
  }
  const name = months[month - 1];
  if (name === undefined) return undefined;
  return pattern
    .replace('{day}', String(day))
    .replace('{month}', name)
    .replace('{year}', String(year));
}
