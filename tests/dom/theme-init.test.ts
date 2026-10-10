/**
 * `theme-init.js` runs before any module. Its behaviour is checked twice: on the readable source,
 * and on the minified copy the pages load (`scripts/minify-theme-init.ts`; WP-50a review pass 4,
 * m3), so a minifier change that altered what it does would fail here. The checks on its text run on
 * the source only.
 * `data-st-profile` hides My path's empty state until the
 * page's module draws, so it must not be set for a stored value that is not answers (review WP-31
 * pass 1, minor 5; the CSS also reveals the empty state after a second in any case).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { minifyScript } from '../../scripts/minify-theme-init';
import { TERMS_HEADING_ID } from '../../src/lib/content/render';
import { ENTITY_CHOICES, parseProfile, STAGE_CHOICES, TYPE_CHOICES } from '../../src/lib/profile';
import { REPO_ROOT } from '../unit/site/data';

const SOURCE = readFileSync(path.join(REPO_ROOT, 'src', 'scripts', 'theme-init.js'), 'utf8');
const MINIFIED = await minifyScript(SOURCE);
/** The copy under test: set by each `describe` below. */
let code = SOURCE;
const run = (): void => {
  new Function(code)();
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-st-profile');
});

describe('theme-init’s copy of the answer lists', () => {
  it('names every entity, stage and kind of business the profile has', () => {
    for (const value of [...ENTITY_CHOICES, ...STAGE_CHOICES, ...TYPE_CHOICES])
      expect(SOURCE).toMatch(new RegExp(`['\\s]${value}['\\s]`));
  });
});

describe('theme-init’s text', () => {
  it('looks for the id the document layout renders', () => {
    expect(SOURCE).toContain(`document.getElementById('${TERMS_HEADING_ID}')`);
  });
});

for (const [label, script] of [
  ['the source', SOURCE],
  ['the minified copy', MINIFIED],
] as const) {
  describe(`theme-init, ${label}`, () => {
    beforeAll(() => {
      code = script;
    });

    describe('theme-init and saved answers', () => {
      it('marks the page when answers are saved', () => {
        localStorage.setItem(
          'st.profile.v1',
          JSON.stringify({ entity: 'pty', businessTypes: ['food'], stage: 'trading' }),
        );
        run();
        expect(document.documentElement.hasAttribute('data-st-profile')).toBe(true);
      });

      it.each([['corrupt'], ['null'], ['{"stage":"trading"}']])('not for %s', (value) => {
        localStorage.setItem('st.profile.v1', value);
        run();
        expect(document.documentElement.hasAttribute('data-st-profile')).toBe(false);
      });

      // Review WP-31 pass 3, minor 1: a value the store rejects must not keep the home card's space.
      const SAMPLES = [
        '{"entity":"pty","bad":1}',
        '{"entity":"',
        '{"entity":"pty","businessTypes":[],"stage":"trading"}',
        '{"entity":"pty","businessTypes":["food","food"],"stage":"trading"}',
        '{"entity":"pty","businessTypes":["shoes"],"stage":"trading"}',
        '{"entity":"sole-prop","businessTypes":["food"],"stage":"pty-growing"}',
        '{"entity":"llc","businessTypes":["food"],"stage":"trading"}',
        '{"entity":"pty","businessTypes":"food","stage":"trading"}',
        '{"entity":"pty","businessTypes":["food"],"stage":"later"}',
        '[]',
        '{"entity":"pty","businessTypes":["general","beauty"],"stage":"pty-growing"}',
        '{"entity":"undecided","businessTypes":["general"],"stage":"not-started"}',
      ];
      it.each(SAMPLES)('agrees with parseProfile on %s', (value) => {
        localStorage.setItem('st.profile.v1', value);
        run();
        let parsed: unknown;
        try {
          parsed = JSON.parse(value);
        } catch {
          parsed = null;
        }
        expect(document.documentElement.hasAttribute('data-st-profile')).toBe(
          parseProfile(parsed) !== null,
        );
      });
    });

    describe('theme-init and scripts that fail to load (review WP-31 pass 5, nit 1)', () => {
      it('names each failed script, so only the parts that need it give up', () => {
        document.documentElement.removeAttribute('data-st-script-failed');
        run();
        const fail = (src: string): void => {
          const script = document.createElement('script');
          script.src = src;
          document.head.append(script);
          script.dispatchEvent(new Event('error'));
          script.remove();
        };
        fail(
          '/business-toolkit/_astro/LanguageSwitcher.astro_astro_type_script_index_0_lang.Dm.js',
        );
        expect(document.documentElement.getAttribute('data-st-script-failed')).toBe(
          'LanguageSwitcher',
        );
        fail('/business-toolkit/_astro/YourPathCard.astro_astro_type_script_index_0_lang.BR.js');
        expect(document.documentElement.getAttribute('data-st-script-failed')?.split(' ')).toEqual([
          'LanguageSwitcher',
          'YourPathCard',
        ]);
        document.documentElement.removeAttribute('data-st-script-failed');
      });
    });

    /**
     * WP-50a, item 1: "Words used in this file" is closed in the HTML (the phone's first screen needs the
     * AI notice, not the word list) and opened from 1024px by theme-init, as the parser adds it, so it
     * never moves the page after the first paint.
     */
    describe('theme-init and "Words used in this file"', () => {
      const wide = (matches: boolean): void => {
        vi.stubGlobal('matchMedia', (query: string) => ({
          matches: query === '(min-width: 1024px)' ? matches : false,
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }));
      };
      const addList = (): HTMLDetailsElement => {
        const list = document.createElement('details');
        list.id = TERMS_HEADING_ID;
        document.body.append(list);
        return list;
      };

      afterEach(() => {
        vi.unstubAllGlobals();
        document.getElementById(TERMS_HEADING_ID)?.remove();
      });

      it('opens the list from 1024px as soon as it is added', async () => {
        wide(true);
        run();
        const list = addList();
        await Promise.resolve();
        expect(list.open).toBe(true);
      });

      it('leaves it closed below 1024px', async () => {
        wide(false);
        run();
        const list = addList();
        await Promise.resolve();
        expect(list.open).toBe(false);
      });
    });
  });
}
