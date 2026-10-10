/**
 * The build minifies the blocking theme-init copy (WP-50a review pass 3, m6). The readable source
 * stays what `tests/dom/theme-init.test.ts` runs; this checks the copy the pages load.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { minifyScript, minifyThemeInit, THEME_INIT_ASSET } from '../../scripts/minify-theme-init';
import { REPO_ROOT } from './site/data';

const SOURCE = readFileSync(path.join(REPO_ROOT, 'src', 'scripts', 'theme-init.js'), 'utf8');

describe('the minified theme-init', () => {
  it('is a classic script with no imports or exports, and much smaller', async () => {
    const code = await minifyScript(SOURCE);
    // It compiles as a function body, which a module (import, export, top-level await) would not.
    expect(() => new Function(code)).not.toThrow();
    expect(code).not.toMatch(/(^|[;}])\s*(import|export)\b|\bimport\s*\(/);
    const before = gzipSync(SOURCE, { level: 9 }).length;
    const after = gzipSync(code, { level: 9 }).length;
    expect(after).toBeLessThan(before * 0.7);
    // Names the page and other scripts read are strings, so they survive minification.
    for (const name of ['st.theme', 'st.lowData', 'st.lang', 'st.profile.v1', 'data-st-profile']) {
      expect(code).toContain(name);
    }
  });

  it('replaces only the theme-init asset in the bundle, under the same name', async () => {
    const bundle = {
      '_astro/theme-init.AbC1-2.js': {
        type: 'asset' as const,
        fileName: '_astro/theme-init.AbC1-2.js',
        source: new TextEncoder().encode(SOURCE),
      },
      '_astro/other.js': { type: 'asset' as const, fileName: '_astro/other.js', source: 'x  =  1' },
      '_astro/page.js': { type: 'chunk' as const },
    };
    await minifyThemeInit().generateBundle({}, bundle);
    expect(bundle['_astro/theme-init.AbC1-2.js'].source).toBe(await minifyScript(SOURCE));
    expect(bundle['_astro/other.js'].source).toBe('x  =  1');
    expect(THEME_INIT_ASSET.test('_astro/theme-init.goNHpT6q.js')).toBe(true);
    expect(THEME_INIT_ASSET.test('_astro/theme-control.CV9EtFUV.js')).toBe(false);
  });

  it('fails the build on a syntax error rather than shipping it', async () => {
    await expect(minifyScript('(function () {', 'broken.js')).rejects.toThrow(/broken\.js/);
  });
});
