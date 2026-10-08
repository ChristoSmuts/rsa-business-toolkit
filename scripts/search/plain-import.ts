/**
 * A build plugin that drops Vite's preload wrapper from the one `import()` every page makes: the
 * search dialog's script, imported by `src/scripts/search-boot.ts` (review WP-33 pass 21, major 1).
 *
 * Vite wraps every dynamic `import()` in `__vitePreload(() => import(…), deps)`, so that the
 * imported chunk's own imports are fetched in parallel, and the wrapper's helper chunk is a static
 * import of the module that makes the call. On a document page that helper (0.75 KB gzip) is the
 * single largest piece of search, and the dialog's script needs nothing it would preload: its
 * imports (the store, the locales) are on the page already. Without the wrapper the import is a
 * plain `import()`, and the helper leaves every page that loads nothing else lazily.
 *
 * Only an `import()` of the dialog's chunk (`./search.<hash>.js`) is unwrapped; every other lazy
 * import (the results code, WP-31's path data) keeps its preloading. It runs in `renderChunk`,
 * before Vite fills the wrapper's dependency list, and the minifier runs after it.
 */

/** The part of a Vite plugin this one uses (`vite` is Astro's dependency, not this project's). */
interface RenderChunkPlugin {
  readonly name: string;
  readonly apply: 'build';
  renderChunk(code: string): { code: string; map: null } | null;
}

const WRAPPED = '__vitePreload(() => import("./search.';
const END = ', __VITE_PRELOAD__)';
const HELPER_IMPORT = /import \{ [\w$]+ as __vitePreload \} from "[^"]+";\n?/;

/** `code` with every preload wrapper around an import of the dialog's chunk removed. */
export function unwrapSearchImport(code: string): string {
  let out = code;
  for (let at = out.indexOf(WRAPPED); at >= 0; at = out.indexOf(WRAPPED, at)) {
    const end = out.indexOf(END, at);
    if (end < 0) break;
    const inner = out.slice(at + '__vitePreload(() => '.length, end);
    out = `${out.slice(0, at)}${inner}${out.slice(end + END.length)}`;
  }
  // The helper's import goes with its last use.
  if (out !== code && !out.includes('__vitePreload(')) out = out.replace(HELPER_IMPORT, '');
  return out;
}

export function plainSearchImport(): RenderChunkPlugin {
  return {
    name: 'st:plain-search-import',
    apply: 'build',
    renderChunk(code) {
      if (!code.includes(WRAPPED)) return null;
      return { code: unwrapSearchImport(code), map: null };
    },
  };
}
