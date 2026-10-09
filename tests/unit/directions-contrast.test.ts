/**
 * WP-50 Phase 1 (TEMPORARY, deleted with `src/styles/directions.css`): measures the two direction
 * mocks' palettes the same way `tokens-contrast.test.ts` measures the live one, so the numbers in
 * docs/work-packages/WP-50-directions.md can be re-derived instead of trusted.
 *
 * A direction's palette is tokens.css with the direction's blocks applied on top, in cascade order:
 * light = tokens light + direction light; dark = tokens light + tokens dark + direction light +
 * direction dark. Its dark and system-dark blocks must be identical, like tokens.css's.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONTRAST_PAIRS,
  type ContrastPair,
  contrastRatio,
  deltaEOk,
  parseTokenBlocks,
  resolveColor,
  tokenRules,
  type TokenMap,
} from '../../src/scripts/color';

const root = resolve(import.meta.dirname, '../..');
const tokens = parseTokenBlocks(readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8'));
const rules = tokenRules(readFileSync(resolve(root, 'src/styles/directions.css'), 'utf8'));

type Direction = 'a' | 'b';

function block(direction: Direction, kind: 'light' | 'dark' | 'system'): TokenMap {
  const scope = `:has([data-direction='${direction}'])`;
  const rule = rules.find((r) => {
    if (!r.selector.endsWith(scope)) return false;
    if (kind === 'light') return r.selector === `html:root${scope}` && r.conditions.length === 0;
    if (kind === 'dark') {
      return (
        r.selector === `html:root[data-theme='dark']${scope}` &&
        r.conditions.join(' ') === '@media screen'
      );
    }
    return (
      r.selector === `html:root:not([data-theme='light'])${scope}` &&
      r.conditions.join(' ') === '@media screen and (prefers-color-scheme: dark)'
    );
  });
  if (!rule) throw new Error(`directions.css: no ${kind} block for direction ${direction}`);
  return rule.tokens;
}

/** Pairs only the mocks render: B's hero is white type on indigo cloth. */
const EXTRA_PAIRS: Record<Direction, readonly ContrastPair[]> = {
  a: [{ fg: 'dir-tool-icon', bg: 'dir-tool-icon-bg', min: 3, use: 'Tool icon on its tile' }],
  b: [
    { fg: 'dir-on-cloth', bg: 'dir-cloth', min: 4.5, use: 'Hero text on shweshwe cloth' },
    { fg: 'dir-cloth', bg: 'dir-on-cloth', min: 4.5, use: 'Hero primary button label' },
    { fg: 'dir-on-cloth', bg: 'dir-cloth', min: 3, use: 'Focus ring and button edge on cloth' },
    { fg: 'dir-tool-icon', bg: 'dir-tool-icon-bg', min: 3, use: 'Tool icon on its tile' },
    { fg: 'text', bg: 'dir-tool-bg', min: 4.5, use: 'Text on a tool' },
    { fg: 'link', bg: 'dir-tool-bg', min: 4.5, use: 'Tool action on a tool' },
    { fg: 'focus', bg: 'dir-tool-bg', min: 3, use: 'Focus ring on a tool' },
  ],
};

function directionThemes(direction: Direction): Record<'light' | 'dark', TokenMap> {
  const light = { ...tokens.light, ...block(direction, 'light') };
  const dark = {
    ...tokens.light,
    ...tokens.dark,
    ...block(direction, 'light'),
    ...block(direction, 'dark'),
  };
  return { light, dark };
}

const HUES = ['start', 'core', 'branding', 'paperwork', 'types', 'lookup'] as const;

for (const direction of ['a', 'b'] as const) {
  describe(`direction ${direction.toUpperCase()} palette`, () => {
    it('has identical explicit-dark and system-dark blocks', () => {
      expect(block(direction, 'system')).toEqual(block(direction, 'dark'));
    });

    const themes = directionThemes(direction);
    for (const [themeName, theme] of Object.entries(themes)) {
      for (const pair of [...CONTRAST_PAIRS, ...EXTRA_PAIRS[direction]]) {
        it(`${themeName}: ${pair.fg} on ${pair.bg} (${pair.use}) >= ${pair.min}:1`, () => {
          const ratio = contrastRatio(resolveColor(pair.fg, theme), resolveColor(pair.bg, theme));
          expect(ratio).toBeGreaterThanOrEqual(pair.min);
        });
      }

      it(`${themeName}: the six section tints stay apart (ΔE_OK >= 0.025)`, () => {
        for (const [i, a] of HUES.entries()) {
          for (const b of HUES.slice(i + 1)) {
            const distance = deltaEOk(
              resolveColor(`hue-${a}-tint`, theme),
              resolveColor(`hue-${b}-tint`, theme),
            );
            expect(distance, `${a} vs ${b}`).toBeGreaterThanOrEqual(0.025);
          }
        }
      });
    }
  });
}
