/**
 * `scripts/search/plain-import.ts`: the search dialog's `import()` loses Vite's preload wrapper,
 * and the helper's import goes with it; other lazy imports keep theirs (review WP-33 pass 21).
 */
import { describe, expect, it } from 'vitest';
import { plainSearchImport, unwrapSearchImport } from '../../../scripts/search/plain-import';

const HELPER = 'import { t as __vitePreload } from "./preload-helper.!~{00G}~.js";\n';
const DIALOG =
  'var load = () => __vitePreload(() => import("./search.!~{00I}~.js").then((n) => n.n), __VITE_PRELOAD__);\n';
const OTHER =
  'var ui = () => __vitePreload(() => import("./search-ui.!~{00J}~.js"), __VITE_PRELOAD__);\n';

describe('unwrapSearchImport', () => {
  it('unwraps the dialog import and drops the helper import when nothing else uses it', () => {
    expect(unwrapSearchImport(HELPER + DIALOG + DIALOG)).toBe(
      'var load = () => import("./search.!~{00I}~.js").then((n) => n.n);\n'.repeat(2),
    );
  });

  it('keeps the wrapper of every other lazy import, and then the helper too', () => {
    const out = unwrapSearchImport(HELPER + DIALOG + OTHER);
    expect(out).toContain(HELPER);
    expect(out).toContain(OTHER);
    expect(out).toContain('var load = () => import("./search.!~{00I}~.js")');
  });

  it('leaves a chunk without the dialog import alone', () => {
    expect(unwrapSearchImport(HELPER + OTHER)).toBe(HELPER + OTHER);
    expect(plainSearchImport().renderChunk(HELPER + OTHER)).toBeNull();
  });
});
