import { describe, expect, it } from 'vitest';
import { formatDate } from '../../../src/i18n';
import { plainText } from '../../../src/lib/content/render';
import { HOME_FOUR_THINGS, HOME_NUMBERS, resolveHomeNumbers } from '../../../src/lib/home';
import { realDoc, realSources } from './data';

const sources = realSources();

/** The register's own "supports" sentence for an entry, as plain text. */
function supports(id: string): string {
  const entry = sources.entries.find((candidate) => candidate.id === id);
  return entry?.supports ? plainText(entry.supports) : '';
}

describe('the home page figures', () => {
  it('leave out the 0% band while the register does not support it', () => {
    // The guide states R600,000; the register does not. When it does, this fails: add the band back.
    const withBand = { ...HOME_NUMBERS[2], zeroBand: { rate: 0, amount: 'R600,000' } };
    expect(supports(withBand.sourceId ?? '')).not.toContain('R600,000');
  });

  it('each cite an official register entry with a link', () => {
    for (const item of resolveHomeNumbers(sources)) {
      expect(item.official, item.id).toBe(true);
      expect(item.sourceUrl, item.id).toMatch(/^https:\/\/www\.sars\.gov\.za\//);
    }
  });

  it('state only figures and dates their own source supports', () => {
    for (const item of HOME_NUMBERS) {
      const text = supports(item.sourceId);
      expect(text, item.sourceId).toContain(item.amount);
      // Only the cited entry counts. The guide's own text is not a source (reviews WP-20 p2, p3).
      if (item.oldAmount) expect(text, `${item.id} old figure`).toContain(item.oldAmount);
      if (item.from) expect(text, `${item.id} date`).toContain(formatDate('en', item.from));
      if (item.zeroBand) expect(text, item.sourceId).toContain(item.zeroBand.amount);
    }
  });

  it('agree with "Start here", which states the same figures', () => {
    const startHere = plainTextOf('start/start-here');
    for (const item of HOME_NUMBERS) {
      expect(startHere).toContain(item.amount);
      if (item.oldAmount) expect(startHere, item.id).toContain(`not ${item.oldAmount}`);
    }
  });

  it('fail the build when a cited entry has no link', () => {
    const broken = structuredClone(sources);
    broken.entries = broken.entries.filter((entry) => entry.id !== HOME_NUMBERS[0]?.sourceId);
    expect(() => resolveHomeNumbers(broken)).toThrow(/no link/);
    expect(() => resolveHomeNumbers(undefined)).toThrow();
  });
});

/** Every text run anywhere in a document's blocks, whatever the block kind. */
function plainTextOf(docId: string): string {
  const parts: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value !== null && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (record['t'] === 'text' && typeof record['v'] === 'string') parts.push(record['v']);
      Object.values(record).forEach(walk);
    }
  };
  walk(realDoc(docId).blocks);
  return parts.join('');
}

describe('"Four things that matter early"', () => {
  it('links each rule to a section that exists on a page with its own sources', () => {
    for (const item of HOME_FOUR_THINGS) {
      const doc = realDoc(item.doc);
      expect(
        doc.headings.map((heading) => heading.id),
        item.labelKey,
      ).toContain(item.anchor);
      expect(doc.sources.entries.length + doc.sources.acts.length, item.doc).toBeGreaterThan(0);
    }
  });
});
