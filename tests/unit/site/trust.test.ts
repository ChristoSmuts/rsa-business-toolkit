/**
 * The D5 trust notice chooses its words from the document's own verification record. ADR 0006
 * reserves "checked by a named human expert" for a real named human, so the nameless case is the
 * test that matters most here.
 */
import { describe, expect, it } from 'vitest';
import { t } from '../../../src/i18n';
import { hasOwnSources, isHumanVerified, trustNotice } from '../../../src/lib/content/trust';
import type { Verification } from '../../../src/lib/content/schema';
import { realDocs } from './data';

const aiChecked: Verification = { status: 'ai-checked', checkedOn: '2026-09-13' };
const humanChecked: Verification = {
  status: 'human-verified',
  checkedOn: '2026-09-13',
  reviewedBy: 'A. Reviewer',
};

describe('trustNotice', () => {
  it('names an AI check, and points at the sources on the page', () => {
    const notice = trustNotice(aiChecked, true);
    expect(notice.bodyKey).toBe('trust.aiNotice.body');
    expect(notice.statusKey).toBe('trust.status.aiChecked');
    expect(notice.meansKey).toBe('trust.status.aiCheckedMeans');
    expect(notice.icon).toBe('lucide:bot');
    expect(notice.reviewer).toBe('');
    expect(notice.humanChecked).toBe(false);
  });

  it('points at the register instead when the page has no sources of its own', () => {
    expect(trustNotice(aiChecked, false).bodyKey).toBe('trust.aiNotice.bodyNoPageSources');
    expect(trustNotice(humanChecked, false).bodyKey).toBe(
      'trust.aiNotice.bodyHumanCheckedNoPageSources',
    );
  });

  it('names the reviewer once a person has checked the page', () => {
    const notice = trustNotice(humanChecked, true);
    expect(notice.bodyKey).toBe('trust.aiNotice.bodyHumanChecked');
    expect(notice.statusKey).toBe('trust.status.humanChecked');
    expect(notice.meansKey).toBe('trust.status.humanCheckedMeans');
    expect(notice.icon).toBe('lucide:user-check');
    expect(notice.reviewer).toBe('A. Reviewer');
    expect(notice.humanChecked).toBe(true);
  });

  /*
   * The schema refuses a `human-verified` record with no name, but a renderer that trusted the
   * status alone would print "Checked by" with nothing after it — a page claiming a review that
   * did not happen, which is the one thing ADR 0006 exists to prevent.
   */
  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['blank', '   '],
    ['a zero-width space', '​'],
    ['punctuation only', '-'],
  ])('falls back to the AI wording when the reviewer name is %s', (_label, reviewedBy) => {
    const record = { ...humanChecked, reviewedBy } as Verification;
    expect(isHumanVerified(record)).toBe(false);
    const notice = trustNotice(record, true);
    expect(notice.humanChecked).toBe(false);
    expect(notice.statusKey).toBe('trust.status.aiChecked');
    expect(notice.bodyKey).toBe('trust.aiNotice.body');
    expect(notice.reviewer).toBe('');
  });

  it('renders a notice sentence with no placeholder left in it, in both languages', () => {
    for (const locale of ['en', 'af'] as const) {
      for (const [verification, hasSources] of [
        [aiChecked, true],
        [aiChecked, false],
        [humanChecked, true],
        [humanChecked, false],
      ] as const) {
        const notice = trustNotice(verification, hasSources);
        for (const key of [notice.bodyKey, notice.statusKey, notice.meansKey]) {
          const text = t(locale, key, { date: '13 September 2026', reviewer: notice.reviewer });
          expect(text, `${locale} ${key}`).not.toMatch(/\{[A-Za-z]+\}/);
          expect(text.length).toBeGreaterThan(5);
        }
      }
    }
  });
});

describe('hasOwnSources', () => {
  it('is true with an entry, with an act, and false with neither', () => {
    expect(hasOwnSources({ entries: ['a'], acts: [] })).toBe(true);
    expect(hasOwnSources({ entries: [], acts: ['b'] })).toBe(true);
    expect(hasOwnSources({ entries: [], acts: [] })).toBe(false);
  });

  it('matches the corpus: a document with no sources always carries a note', () => {
    for (const doc of realDocs()) {
      if (hasOwnSources(doc.sources)) continue;
      expect(doc.sourceNote, `${doc.id} has no sources and no note`).toBeDefined();
    }
  });

  it('confirms no document in the corpus claims a human review yet', () => {
    const claimed = realDocs().filter((doc) => isHumanVerified(doc.verification));
    expect(claimed.map((doc) => doc.id)).toEqual([]);
  });
});
