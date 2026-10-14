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

/*
 * WP-50 Phase 3 (direction A): "Words used on this page" is a closed disclosure at every width, so
 * theme-init no longer opens it from 1024px. It must not come back by accident.
 */
describe('theme-init’s text', () => {
  it('does not touch the "Words used" list', () => {
    expect(SOURCE).not.toContain(TERMS_HEADING_ID);
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

    // WP-50a review pass 11, m4: the storage warning shows from the first paint, not when the
    // template's script runs and pushes the form down.
    describe('theme-init and blocked storage', () => {
      afterEach(() => {
        vi.unstubAllGlobals();
        document.documentElement.removeAttribute('data-st-storage');
      });

      it('marks the page when reading storage throws', () => {
        vi.stubGlobal('localStorage', {
          getItem: () => {
            throw new DOMException('The operation is insecure.', 'SecurityError');
          },
        });
        run();
        expect(document.documentElement.getAttribute('data-st-storage')).toBe('blocked');
      });

      it('leaves it unmarked when storage works', () => {
        run();
        expect(document.documentElement.hasAttribute('data-st-storage')).toBe(false);
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

      it('also names a module that throws as it runs, and nothing for an error with no file', () => {
        document.documentElement.removeAttribute('data-st-script-failed');
        run();
        // A module that loads but throws while it runs reaches the window as an ErrorEvent with
        // its address, not as an error on its <script> (WP-50a review pass 6, m2).
        window.dispatchEvent(new ErrorEvent('error', { message: 'x' }));
        expect(document.documentElement.hasAttribute('data-st-script-failed')).toBe(false);
        window.dispatchEvent(
          new ErrorEvent('error', {
            message: 'boom',
            filename:
              'http://localhost/business-toolkit/_astro/Wizard.astro_astro_type_script_index_0_lang.D1.js',
          }),
        );
        expect(document.documentElement.getAttribute('data-st-script-failed')).toBe('Wizard');
        document.documentElement.removeAttribute('data-st-script-failed');
      });
    });

    /**
     * WP-50a, item 1, then WP-50 Phase 3: "Words used on this page" is closed in the HTML and stays
     * closed at every width; theme-init used to open it from 1024px and no longer does.
     */
    describe('theme-init and "Words used on this page"', () => {
      afterEach(() => {
        vi.unstubAllGlobals();
        document.getElementById(TERMS_HEADING_ID)?.remove();
      });

      it('leaves the list closed on a wide screen', async () => {
        vi.stubGlobal('matchMedia', (query: string) => ({
          matches: true,
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }));
        run();
        const list = document.createElement('details');
        list.id = TERMS_HEADING_ID;
        document.body.append(list);
        await Promise.resolve();
        expect(list.open).toBe(false);
      });
    });

    /*
     * WP-50 audit, item 5: the font preloads wait in a <template> (Base.astro) and theme-init copies
     * them into <head> only when the page will use the fonts. In low data mode the CSS uses the
     * device's fonts, so a preload would only spend the reader's data.
     */
    describe('theme-init and the font preloads', () => {
      const FONTS = ['/_astro/fraunces.woff2', '/_astro/instrument.woff2'];
      /** A phone: no media query matches, so nothing but the preloads is under test. */
      const phone = (): void => {
        vi.stubGlobal('matchMedia', (query: string) => ({
          matches: false,
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }));
      };
      const preloaded = (): string[] =>
        [...document.head.querySelectorAll('link[rel="preload"][as="font"]')].map(
          (link) => link.getAttribute('href') ?? '',
        );

      beforeEach(() => {
        const template = document.createElement('template');
        template.setAttribute('data-st-preload', '');
        template.innerHTML = FONTS.map(
          (font) => `<link rel="preload" href="${font}" as="font" type="font/woff2" crossorigin>`,
        ).join('');
        document.head.append(template);
      });

      afterEach(() => {
        vi.unstubAllGlobals();
        document.head.replaceChildren();
        document.documentElement.removeAttribute('data-low-data');
      });

      it('preloads both fonts, once, with low data off', () => {
        phone();
        run();
        expect(preloaded()).toEqual(FONTS);
        const link = document.head.querySelector('link[rel="preload"]');
        expect(link?.getAttribute('crossorigin')).toBe('');
        expect(link?.getAttribute('type')).toBe('font/woff2');
      });

      it('preloads nothing with the low data toggle on', () => {
        phone();
        localStorage.setItem('st.lowData', 'true');
        run();
        expect(document.documentElement.hasAttribute('data-low-data')).toBe(true);
        expect(preloaded()).toEqual([]);
      });

      it('preloads the fonts when storage is blocked (the toggle cannot be read)', () => {
        phone();
        vi.stubGlobal('localStorage', {
          getItem: () => {
            throw new DOMException('The operation is insecure.', 'SecurityError');
          },
        });
        run();
        document.documentElement.removeAttribute('data-st-storage');
        expect(preloaded()).toEqual(FONTS);
      });
    });
  });
}
