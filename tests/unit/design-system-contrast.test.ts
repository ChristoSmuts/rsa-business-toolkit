/**
 * The contrast panel's measurement gate.
 *
 * The bug this guards against: in WebKit, on a cold cache, a <span> appended to <body> at the
 * moment the panel first ran received none of the `--st-*` properties, although
 * `documentElement` already resolved them. Every `var(--st-…)` was then invalid at
 * computed-value time, `color` fell back to the inherited initial black, all 76 pairs measured
 * 1.00:1, and the panel wrote "76 of 76 pairs fail" and never re-measured.
 *
 * `measure` must refuse such a reading — and it must still report real drift, otherwise the
 * gate has bought safety by making the panel useless. Both directions are asserted below, and
 * each of the gate's three conditions has a case that isolates it, paired with a control that
 * differs only in the thing under test.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONTRAST_PAIRS,
  darkTheme,
  parseTokenBlocks,
  resolveColor,
  type TokenMap,
} from '../../src/scripts/color';
import { measure, type PairSpec, type TokenReader } from '../../src/scripts/design-system-contrast';

const root = resolve(import.meta.dirname, '../..');
const blocks = parseTokenBlocks(readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8'));

const PAIRS: PairSpec[] = CONTRAST_PAIRS.map(({ fg, bg, min }) => ({ fg, bg, min }));
const SWATCHES = ['bg', 'surface', 'text', 'text-muted', 'primary', 'accent'];

function asRgb(token: string, theme: TokenMap): string {
  const [r, g, b] = resolveColor(token, theme);
  return `rgb(${r}, ${g}, ${b})`;
}

/** A browser that has applied the stylesheet: tokens arrive, `var()` substitutes. */
function styled(theme: TokenMap): TokenReader {
  return {
    custom: (token) => (theme[token] === undefined ? '' : `--resolved-${token}`),
    colour: (token) => asRgb(token, theme),
  };
}

/**
 * The failing WebKit state, exactly as observed: no `--st-*` on the measuring element, so
 * every `var(--st-…)` is invalid at computed-value time and `color` is the inherited initial.
 */
const unstyled: TokenReader = {
  custom: () => '',
  colour: () => 'rgb(0, 0, 0)',
};

describe('contrast panel measurement gate', () => {
  for (const [name, theme] of [
    ['light', blocks.light],
    ['dark', darkTheme(blocks)],
  ] as const) {
    it(`measures every verified pair as passing in ${name}`, () => {
      const reading = measure(styled(theme), SWATCHES, PAIRS);
      expect(reading).not.toBeNull();
      expect(reading?.failures).toBe(0);
      expect(reading?.pairs).toHaveLength(CONTRAST_PAIRS.length);
      expect(reading?.swatches).toHaveLength(SWATCHES.length);
      expect(reading?.swatches[0]).toMatch(/^#[0-9a-f]{6}$/);
    });
  }

  it('refuses an unstyled probe instead of reporting every pair as a failure', () => {
    // The whole bug in one line: without the gate this returns 76 failures at 1.00:1.
    expect(measure(unstyled, SWATCHES, PAIRS)).toBeNull();
  });

  /**
   * The case above trips every condition at once, so on its own it cannot tell whether the
   * delivery check is still there: delete it and the all-one-colour backstop still catches an
   * unstyled reader, and the suite stays green. This reader is refused by the delivery check and
   * by nothing else — it reads a different, correct colour for every token — so deleting that
   * check turns this red.
   */
  it('refuses a probe the tokens never reached, even when every colour it reads differs', () => {
    const undelivered: TokenReader = { custom: () => '', colour: (t) => asRgb(t, blocks.light) };
    expect(measure(undelivered, SWATCHES, PAIRS)).toBeNull();
    // The same colours with the tokens delivered are accepted, so it is delivery that decides.
    expect(measure(styled(blocks.light), SWATCHES, PAIRS)).not.toBeNull();
  });

  /**
   * Review pass 1, minor 2. The canary alone only proves that *a* token arrived. A partial
   * delivery — `--st-bg` through the cascade, the rest not — reads the canary's real colour and
   * the inherited black for everything else. That is not one colour, so the all-one-colour
   * backstop stays quiet too, and the panel published 59 fabricated failures. The delivery
   * check therefore covers every token the reading needs, not one of them.
   */
  it('refuses a probe that received only some of the tokens it needs', () => {
    const delivered = (token: string): boolean => token === 'bg';
    const colour = (token: string): string =>
      delivered(token) ? asRgb(token, blocks.light) : 'rgb(0, 0, 0)';
    const partialDelivery: TokenReader = {
      custom: (token) => (delivered(token) ? `--resolved-${token}` : ''),
      colour,
    };
    expect(measure(partialDelivery, SWATCHES, PAIRS)).toBeNull();
    // Exactly the same colours with every token delivered are published — two distinct colours,
    // all of them parseable — so it is the delivery check deciding here and neither other gate.
    const delivering: TokenReader = { custom: (token) => `--resolved-${token}`, colour };
    expect(measure(delivering, SWATCHES, PAIRS)?.failures).toBeGreaterThan(0);
  });

  it('refuses a probe that resolves the canary but reads one colour for everything', () => {
    // The backstop: the tokens arrived, yet no palette is a single colour in any theme, so
    // this is the instrument misreading rather than tokens.css drifting.
    const oneColour: TokenReader = { custom: () => '#fbf8f3', colour: () => 'rgb(0, 0, 0)' };
    expect(measure(oneColour, SWATCHES, PAIRS)).toBeNull();
  });

  /**
   * Review pass 1, minor 1. The all-one-colour backstop needs two parsed colours to compare, so
   * a reading in which *nothing* parsed slipped past every gate and published "76 of 76 pairs
   * fail" with every ratio "unreadable" — the instrument announcing its own breakage as drift in
   * tokens.css, which is the exact headline this file exists to prevent. It becomes reachable
   * the day a token uses a syntax the parser does not know, or an engine serialises one that
   * way. A single unparseable token among readable ones is a different thing and still renders;
   * that is asserted below.
   */
  for (const value of ['lab(50% 20 30)', 'color(display-p3 0.2 0.3 0.4)']) {
    it(`refuses a reading in which not one token could be parsed (${value})`, () => {
      const unparseable: TokenReader = {
        custom: (token) => `--resolved-${token}`,
        colour: () => value,
      };
      expect(measure(unparseable, SWATCHES, PAIRS)).toBeNull();
    });
  }

  it('still reports real drift, so the gate has not silenced the panel', () => {
    const drifted: TokenMap = { ...blocks.light, 'text-muted': 'var(--st-bg)' };
    const reading = measure(styled(drifted), SWATCHES, PAIRS);
    expect(reading).not.toBeNull();
    const broken = CONTRAST_PAIRS.filter((p) => p.fg === 'text-muted' || p.bg === 'text-muted');
    expect(broken.length).toBeGreaterThan(0);
    expect(reading?.failures).toBe(broken.length);
    CONTRAST_PAIRS.forEach((pair, index) => {
      expect(reading?.pairs[index]?.pass).toBe(!broken.includes(pair));
    });
  });

  it('marks a token it cannot parse as unreadable rather than guessing', () => {
    const partial: TokenReader = {
      custom: () => '#fbf8f3',
      colour: (token) => (token === 'text' ? 'not-a-colour' : asRgb(token, blocks.light)),
    };
    const reading = measure(partial, ['text', 'bg'], [{ fg: 'text', bg: 'bg', min: 4.5 }]);
    expect(reading?.swatches).toEqual([null, expect.stringMatching(/^#/)]);
    expect(reading?.pairs[0]).toEqual({ ratio: null, pass: false });
  });

  /**
   * Review pass 1, nit 3. An unparseable token fails its pair, which is the right way round —
   * the pair genuinely cannot be shown to meet its minimum. But "N of 76 pairs fail" reads as a
   * contrast verdict, so the count of pairs that could not be read is carried separately and the
   * summary says so.
   */
  it('counts the pairs it could not read separately from the pairs that fail', () => {
    const partial: TokenReader = {
      custom: (token) => `--resolved-${token}`,
      colour: (token) => (token === 'text' ? 'not-a-colour' : asRgb(token, blocks.light)),
    };
    const reading = measure(partial, SWATCHES, PAIRS);
    const involving = CONTRAST_PAIRS.filter((p) => p.fg === 'text' || p.bg === 'text');
    expect(involving.length).toBeGreaterThan(0);
    expect(reading?.unreadable).toBe(involving.length);
    expect(reading?.failures).toBe(involving.length);
    // A reading with nothing wrong claims no unreadable pairs, so the count cannot be constant.
    expect(measure(styled(blocks.light), SWATCHES, PAIRS)?.unreadable).toBe(0);
  });
});
