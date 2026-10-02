/**
 * `scripts/dist/js-budget.ts`: which built files a page loads up front, and which only on demand.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  chunkImports,
  DOC_BUDGET,
  eagerFiles,
  isDocumentPage,
  TOOL_BUDGET,
} from '../../scripts/dist/js-budget';

describe('chunkImports', () => {
  it('separates static imports from dynamic ones, in any quote style', () => {
    const source =
      'import{a as b}from"./paths.abc.js";import"./side.js";export{c}from\'./re.js\';' +
      'const m=()=>import(`./search-ui.def.js`);import("./other.js");';
    expect(chunkImports(source)).toEqual({
      static: ['./paths.abc.js', './side.js', './re.js'],
      dynamic: ['./search-ui.def.js', './other.js'],
    });
  });
});

describe('eagerFiles', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'st-budget-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('follows static imports only, once each, and skips files that do not exist', () => {
    writeFileSync(path.join(dir, 'entry.js'), 'import"./a.js";const x=()=>import("./lazy.js");');
    writeFileSync(path.join(dir, 'a.js'), 'import"./b.js";import"./entry.js";import"./gone.js";');
    writeFileSync(path.join(dir, 'b.js'), 'export const b=1;');
    writeFileSync(path.join(dir, 'lazy.js'), 'export const l=1;');
    const files = [...eagerFiles([path.join(dir, 'entry.js')])].map((f) => path.basename(f)).sort();
    expect(files).toEqual(['a.js', 'b.js', 'entry.js']);
  });
});

describe('budgets', () => {
  it('tells a document page from a tool page and holds the B3 numbers', () => {
    expect(isDocumentPage('<main><article class="x" data-kind="guide">')).toBe(true);
    expect(isDocumentPage('<main><article class="x">')).toBe(false);
    expect(DOC_BUDGET).toBe(25 * 1024);
    expect(TOOL_BUDGET).toBe(45 * 1024);
  });
});
