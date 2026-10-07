/**
 * Search best bets (`content-meta/search-best-bets.json`, review WP-33 pass 13): the table resolves
 * against the real entries in both languages, and the index build refuses a broken one.
 */
import { describe, expect, it } from 'vitest';
import {
  BestBetsFileSchema,
  loadBestBets,
  MAX_BEST_BETS,
  resolveBestBets,
  type BestBetsFile,
} from '../../../scripts/search/best-bets';
import { buildEntries } from '../../../scripts/search/entries';
import { loadIndexInput } from '../../../scripts/search/load';
import { bestBet } from '../../../src/lib/search-client';

const entries = { en: buildEntries(loadIndexInput('en')), af: buildEntries(loadIndexInput('af')) };

const one = (bet: BestBetsFile['bets'][number]): BestBetsFile => ({ bets: [bet] });

describe('search best bets', () => {
  it('resolves every target in both languages, within the size limit', () => {
    const file = loadBestBets();
    expect(BestBetsFileSchema.parse(file)).toEqual(file);
    for (const lang of ['en', 'af'] as const) {
      const bets = resolveBestBets(lang, entries[lang], file);
      expect(bets.length).toBeLessThanOrEqual(MAX_BEST_BETS);
      expect(bets.length).toBe(file.bets.reduce((sum, bet) => sum + bet[lang].length, 0));
    }
  });

  it('fails on a renamed page or heading, so `pnpm build` fails', () => {
    expect(() =>
      resolveBestBets(
        'en',
        entries.en,
        one({ doc: 'core/registration', en: ['x y'], af: ['x y'] }),
      ),
    ).toThrow(/core\/registration has no en entry/);
    expect(() =>
      resolveBestBets(
        'af',
        entries.af,
        one({ doc: 'core/register', anchor: 'gone', en: ['x'], af: ['x'] }),
      ),
    ).toThrow(/core\/register#gone has no af entry/);
  });

  it('fails on a phrase of stop words only, and on two phrases that read the same', () => {
    expect(() =>
      resolveBestBets('en', entries.en, one({ doc: 'core/register', en: ['how do i'], af: ['x'] })),
    ).toThrow(/only stop words/);
    expect(() =>
      resolveBestBets(
        'en',
        entries.en,
        one({
          doc: 'core/register',
          en: ['register my business', 'register a business'],
          af: ['x'],
        }),
      ),
    ).toThrow(/read the same/);
  });

  it('matches the whole query, or its typed last word from four letters', () => {
    const bets = [
      { w: ['register', 'business'], id: 1 },
      { w: ['checklist'], id: 2 },
    ];
    expect(bestBet(bets, 'How do I register my business?', false)?.id).toBe(1);
    expect(bestBet(bets, 'register my busi', true)?.id).toBe(1);
    expect(bestBet(bets, 'register my busi', false)).toBeUndefined();
    expect(bestBet(bets, 'register my bus', true)).toBeUndefined();
    expect(bestBet(bets, 'register', true)).toBeUndefined();
    expect(bestBet(bets, 'register my business today', false)).toBeUndefined();
    expect(bestBet(bets, 'chec', true)?.id).toBe(2);
    // A whole word of the guide is finished, not the beginning of a longer phrase word.
    expect(bestBet(bets, 'check', true, true)).toBeUndefined();
    expect(bestBet(bets, 'checklsit', false)).toBeUndefined();
  });
});
