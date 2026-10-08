import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DOC_BUDGET,
  moduleImports,
  onDemand,
  pageScripts,
  PROFILE_CHUNKS,
  runCli,
  scriptGraph,
} from '../../scripts/dist/check-budget';

describe('moduleImports', () => {
  it('finds static and dynamic relative imports, in any quotes', () => {
    const source =
      'import{a}from"./a.js";import"./b.js";export{c}from"../c.js";' +
      'const d=()=>import("./path-data.x1.js");const e=()=>import(`./e.js`);import"https://x/y.js";';
    expect(moduleImports(source)).toEqual({
      static: ['./a.js', './b.js', '../c.js'],
      dynamic: ['./path-data.x1.js', './e.js'],
    });
  });
});

describe('pageScripts', () => {
  it('lists external scripts only', () => {
    expect(
      pageScripts(
        '<script src="/bt/_astro/a.js"></script><script>inline()</script>' +
          '<script type="module" src="/bt/_astro/b.js?v=1"></script>',
      ),
    ).toEqual(['/bt/_astro/a.js', '/bt/_astro/b.js?v=1']);
  });
});

describe('scriptGraph', () => {
  const files: Record<string, string> = {
    '_astro/page.js': 'import"./shared.js";const p=()=>import("./path-data.abc.js");',
    '_astro/shared.js': 'export const s=1;',
    '_astro/path-data.abc.js': 'import"./engine.js";',
    '_astro/engine.js': '',
  };
  const read = (file: string): string => files[file] ?? '';

  it('follows static imports, and only the lazy chunks it is asked for', () => {
    expect(scriptGraph(['_astro/page.js'], read)).toEqual(['_astro/page.js', '_astro/shared.js']);
    expect(scriptGraph(['_astro/page.js'], read, (name) => PROFILE_CHUNKS.test(name))).toEqual([
      '_astro/page.js',
      '_astro/shared.js',
      '_astro/path-data.abc.js',
      '_astro/engine.js',
    ]);
  });
});

describe('onDemand', () => {
  // WP-33: the search dialog's code loads on demand. It is reported, not counted in a page's figure.
  it('follows every dynamic import but the profile chunks, once each', () => {
    const files: Record<string, string> = {
      '_astro/page.js': 'import"./shared.js";const p=()=>import("./path-data.abc.js");',
      '_astro/search.js': 'const s=()=>import("./search-ui.def.js");',
      '_astro/other.js': 'const s=()=>import("./search-ui.def.js");',
      '_astro/search-ui.def.js': 'import"./minisearch.js";import"./shared.js";',
      '_astro/minisearch.js': '',
      '_astro/shared.js': '',
      '_astro/path-data.abc.js': '',
    };
    const read = (file: string): string => files[file] ?? '';
    expect(onDemand(Object.keys(files), read).sort()).toEqual([
      '_astro/minisearch.js',
      '_astro/search-ui.def.js',
      '_astro/shared.js',
    ]);
  });
});

describe('runCli', () => {
  let root: string | undefined;
  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
    vi.restoreAllMocks();
  });

  /** Incompressible JavaScript of about `bytes` gzipped. */
  const weight = (bytes: number): string => `/*${randomBytes(bytes).toString('base64')}*/`;

  function site(lazyBytes: number): string {
    root = mkdtempSync(path.join(os.tmpdir(), 'budget-'));
    mkdirSync(path.join(root, '_astro'));
    mkdirSync(path.join(root, 'core', 'register'), { recursive: true });
    writeFileSync(
      path.join(root, '_astro', 'page.js'),
      `${weight(15 * 1024)}const p=()=>import("./path-data.abc.js");`,
    );
    writeFileSync(path.join(root, '_astro', 'path-data.abc.js'), weight(lazyBytes));
    writeFileSync(path.join(root, 'index.html'), '<main>Home</main>');
    writeFileSync(
      path.join(root, 'core', 'register', 'index.html'),
      '<article data-kind="core"></article><script type="module" src="/bt/_astro/page.js"></script>',
    );
    return root;
  }

  it('counts the chunks a reader with answers loads (review WP-31 pass 1, major 1)', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Under the budget without a profile, over it with one.
    expect(runCli(site(DOC_BUDGET - 15 * 1024), '/bt/')).toBe(1);
    expect(error.mock.calls.join('\n')).toContain('/core/register/');
    expect(log.mock.calls.join('\n')).toMatch(
      /heaviest document page \/core\/register\/: 1\d\.\d KB without a profile, 2\d\.\d KB with one/,
    );
  });

  it('passes a page within the budget with a profile', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(runCli(site(2 * 1024), '/bt/')).toBe(0);
  });

  it('reports what loads on demand and each search index, outside the page figures', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const dir = site(2 * 1024);
    writeFileSync(path.join(dir, '_astro', 'search.js'), 'const s=()=>import("./search-ui.js");');
    writeFileSync(path.join(dir, '_astro', 'search-ui.js'), weight(30 * 1024));
    mkdirSync(path.join(dir, 'search'));
    writeFileSync(path.join(dir, 'search', 'en.abc.json'), '{"v":7}');
    expect(runCli(dir, '/bt/')).toBe(0);
    const out = log.mock.calls.join('\n');
    expect(out).toMatch(/loaded on demand .*: 3\d\.\d KB gzip/);
    expect(out).toContain('search index en.abc.json:');
  });
});
