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

const one = (bet: BestBetsFile['bets'][number]): BestBetsFile => ({
  filler: { en: [], af: [] },
  bets: [bet],
});

describe('search best bets', () => {
  it('resolves every target in both languages, within the size limit', () => {
    const file = loadBestBets();
    expect(BestBetsFileSchema.parse(file)).toEqual(file);
    for (const lang of ['en', 'af'] as const) {
      const { bets, filler } = resolveBestBets(lang, entries[lang], file);
      expect(bets.length).toBeLessThanOrEqual(MAX_BEST_BETS);
      expect(bets.length).toBe(file.bets.reduce((sum, bet) => sum + bet[lang].length, 0));
      expect(filler.length).toBeGreaterThan(3);
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
    expect(bestBet(bets, 'check', { typing: true, lastIsWord: true })).toBeUndefined();
    expect(bestBet(bets, 'checklsit', false)).toBeUndefined();
  });

  // Review WP-33 pass 14: filler words, and a typed beginning of another word of the guide.
  it('ignores filler words, and nothing else', () => {
    const bets = [
      { w: ['register', 'business'], id: 1 },
      { w: ['tax'], id: 2 },
    ];
    const filler = ['own', 'new', 'small', 'need'];
    expect(bestBet(bets, 'register my own business', false, filler)?.id).toBe(1);
    expect(bestBet(bets, 'how do i register my small business', false, filler)?.id).toBe(1);
    expect(bestBet(bets, 'register a new business', false, filler)?.id).toBe(1);
    // Without the filler list, the extra word blocks the bet.
    expect(bestBet(bets, 'register my own business', false)).toBeUndefined();
    // A word that is not filler blocks it too.
    expect(bestBet(bets, 'tax threshold', false, filler)).toBeUndefined();
    expect(bestBet(bets, 'register my business name', false, filler)).toBeUndefined();
  });

  it('reads a typed beginning as a phrase word only when no other word of the guide begins so', () => {
    const bets = [{ w: ['maatskappybelasting'], id: 1 }];
    const typed = (completions: string[]) =>
      bestBet(bets, 'maatskap', { typing: true, completions })?.id;
    expect(typed(['maatskappybelasting'])).toBe(1);
    expect(typed(['maatskappy', 'maatskappybelasting'])).toBeUndefined();
  });
});
