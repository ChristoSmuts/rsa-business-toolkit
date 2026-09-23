import { describe, expect, it } from 'vitest';
import {
  ALL_FEATURES,
  blockFeatures,
  selectCoverage,
  uncoveredFeatures,
} from '../../../src/lib/content/coverage';
import type { Block } from '../../../src/lib/content/schema';
import { realDocs } from './data';

const hash = '0123456789abcdef';

function corpus() {
  return realDocs().map((doc) => ({ id: doc.id, blocks: doc.blocks }));
}

describe('blockFeatures', () => {
  it('names the kind and the variant of a fenced block', () => {
    const block: Block = {
      id: 'p.1',
      hash,
      kind: 'code',
      variant: 'prompt',
      text: 'Hello [NAME]',
      placeholders: [{ t: 'placeholder', v: 'NAME', style: 'identity' }],
    };
    expect([...blockFeatures(block)].sort()).toEqual([
      'block:code',
      'code:prompt',
      'inline:placeholder',
    ]);
  });

  it('separates an internal link from an external one, and a doc ref from a section ref', () => {
    const block: Block = {
      id: 'x.1',
      hash,
      kind: 'paragraph',
      c: [
        { t: 'link', doc: 'core/register', c: [{ t: 'text', v: 'a' }] },
        { t: 'link', href: 'https://example.test', external: true, c: [{ t: 'em', c: [] }] },
        { t: 'docref', doc: 'core/register', label: '01' },
        { t: 'docref', section: 'core', label: '01-core/' },
      ],
    };
    const features = blockFeatures(block);
    expect(features.has('inline:link-internal')).toBe(true);
    expect(features.has('inline:link-external')).toBe(true);
    expect(features.has('inline:docref-doc')).toBe(true);
    expect(features.has('inline:docref-section')).toBe(true);
    // Reached through the external link's children, so nesting is walked.
    expect(features.has('inline:em')).toBe(true);
  });

  it('marks a block the content configuration hid', () => {
    const block: Block = { id: 'h', hash, kind: 'hr', hidden: true };
    expect(blockFeatures(block).has('block:hidden')).toBe(true);
  });

  it('tells a wide table from a narrow one and a grouped tasklist from an ungrouped one', () => {
    const wide: Block = {
      id: 'w',
      hash,
      kind: 'table',
      header: Array.from({ length: 5 }, () => [{ t: 'text', v: 'h' }] as const).map((cell) => [
        ...cell,
      ]),
      rows: [],
      align: [null, null, null, null, null],
    };
    expect(blockFeatures(wide).has('table:wide')).toBe(true);

    const grouped: Block = {
      id: 'g',
      hash,
      kind: 'tasklist',
      group: [{ t: 'text', v: 'Part A' }],
      items: [
        {
          id: 'core/register:0123abcd',
          c: [{ t: 'text', v: 'Do it' }],
          doc: 'core/register',
          block: 'g',
        },
      ],
    };
    expect(blockFeatures(grouped).has('tasklist:grouped')).toBe(true);
  });
});

describe('the corpus covers every rendering feature', () => {
  it('leaves nothing in ALL_FEATURES unexercised', () => {
    expect(uncoveredFeatures(corpus())).toEqual([]);
  });

  it('would report a feature no block has', () => {
    expect(uncoveredFeatures(corpus(), ['block:heading', 'block:not-a-kind'])).toEqual([
      'block:not-a-kind',
    ]);
  });
});

describe('selectCoverage', () => {
  const picked = selectCoverage(corpus());

  it('covers every feature', () => {
    const covered = new Set(picked.flatMap((item) => item.features));
    expect([...ALL_FEATURES].filter((feature) => !covered.has(feature))).toEqual([]);
  });

  it('picks far fewer blocks than the corpus holds', () => {
    const total = corpus().reduce((sum, doc) => sum + doc.blocks.length, 0);
    expect(picked.length).toBeLessThan(ALL_FEATURES.length);
    expect(picked.length).toBeLessThan(total / 10);
  });

  it('claims only features the picked block really has', () => {
    for (const item of picked) {
      const actual = blockFeatures(item.block);
      for (const feature of item.features) expect(actual.has(feature)).toBe(true);
    }
  });

  it('claims each feature once', () => {
    const claimed = picked.flatMap((item) => item.features);
    expect(new Set(claimed).size).toBe(claimed.length);
  });

  it('picks nothing when nothing is wanted', () => {
    expect(selectCoverage(corpus(), [])).toEqual([]);
  });
});
