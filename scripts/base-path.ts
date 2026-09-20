/**
 * Base path normalisation shared by `astro.config.ts`, `playwright.config.ts` and the build and
 * test scripts. Kept free of `import.meta.env` (unlike `src/lib/paths.ts`) so Node config loaders can
 * import it.
 */

export const DEFAULT_BASE = '/business-toolkit/';

/** Always a leading and trailing slash; blank or `/` is the site root. */
export function normaliseBase(raw: string | undefined): string {
  const value = (raw ?? DEFAULT_BASE).trim();
  if (value === '' || value === '/') return '/';
  return `/${value.replace(/^\/+|\/+$/g, '')}/`;
}
