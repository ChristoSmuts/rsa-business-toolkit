import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONTRAST_PAIRS,
  PALETTE_SELECTORS,
  compositeOver,
  contrastRatio,
  darkTheme,
  deltaEOk,
  mixOklab,
  parseCssColor,
  parseHex,
  parseTokenBlocks,
  relativeLuminance,
  resolveColor,
  toHex,
  tokenRules,
} from '../../src/scripts/color';

const root = resolve(import.meta.dirname, '../..');
const css = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8');
const blocks = parseTokenBlocks(css);
const light = blocks.light;
const dark = darkTheme(blocks);

/** Non-palette `:root` rules may only switch these tokens (motion and data preferences). */
const PREFERENCE_TOKENS = new Set([
  'duration-fast',
  'duration-base',
  'duration-slow',
  'lift',
  'font-display',
  'font-body',
  'pattern-display',
]);

/**
 * Every way the cascade could silently override a verified palette: a second palette block,
 * a palette block under the wrong condition, or any other rule declaring colour tokens.
 */
function structureProblems(source: string): string[] {
  const problems: string[] = [];
  const rules = tokenRules(source);
  const lightRules = rules.filter((r) => PALETTE_SELECTORS.light.test(r.selector));
  const darkRules = rules.filter((r) => PALETTE_SELECTORS.dark.test(r.selector));
  const systemRules = rules.filter((r) => PALETTE_SELECTORS.darkSystem.test(r.selector));
  const baseLight = lightRules.filter((r) => r.conditions.length === 0);
  if (baseLight.length !== 1) problems.push(`${baseLight.length} unconditional :root blocks`);
  if (darkRules.length !== 1) problems.push(`${darkRules.length} dark blocks`);
  if (systemRules.length !== 1) problems.push(`${systemRules.length} system dark blocks`);
  if (darkRules[0] && darkRules[0].conditions.join(' ') !== '@media screen') {
    problems.push(`dark block under "${darkRules[0].conditions.join(' ')}"`);
  }
  if (
    systemRules[0] &&
    systemRules[0].conditions.join(' ') !== '@media screen and (prefers-color-scheme: dark)'
  ) {
    problems.push(`system dark block under "${systemRules[0].conditions.join(' ')}"`);
  }
  const palette = new Set([baseLight[0], darkRules[0], systemRules[0]]);
  for (const rule of rules) {
    if (palette.has(rule)) continue;
    if (rule.selector !== ':root' && rule.selector !== ':root[data-low-data]') {
      problems.push(`tokens declared on "${rule.selector}"`);
    }
    for (const name of Object.keys(rule.tokens)) {
      if (!PREFERENCE_TOKENS.has(name))
        problems.push(`--st-${name} overridden in "${rule.selector}"`);
    }
  }
  return problems;
}

describe('WCAG helpers', () => {
  it('computes known ratios', () => {
    expect(contrastRatio(parseHex('#000'), parseHex('#fff'))).toBeCloseTo(21, 5);
    expect(contrastRatio(parseHex('#fff'), parseHex('#fff'))).toBeCloseTo(1, 5);
    // #767676 on white is the classic 4.54:1 AA boundary.
    expect(contrastRatio(parseHex('#767676'), parseHex('#ffffff'))).toBeCloseTo(4.54, 2);
    expect(relativeLuminance(parseHex('#808080'))).toBeCloseTo(0.2159, 4);
  });

  it('mixes in OKLab like CSS color-mix', () => {
    expect(toHex(mixOklab(parseHex('#123456'), parseHex('#abcdef'), 1))).toBe('#123456');
    expect(toHex(mixOklab(parseHex('#123456'), parseHex('#abcdef'), 0))).toBe('#abcdef');
    const mid = mixOklab(parseHex('#000000'), parseHex('#ffffff'), 0.5);
    // OKLab L 0.5 is perceptual mid-grey, #636363 in sRGB.
    expect(toHex(mid)).toBe('#636363');
  });
});

describe('computed colour strings (contrast panel and e2e sampling)', () => {
  const hex = (value: string) => toHex(parseCssColor(value).rgb);

  it('parses hex, rgb() and rgba() in comma and space syntax', () => {
    expect(parseCssColor('#1E1B16')).toEqual({ rgb: [30, 27, 22], alpha: 1 });
    expect(parseCssColor('#fff')).toEqual({ rgb: [255, 255, 255], alpha: 1 });
    expect(parseCssColor('#11223380').alpha).toBeCloseTo(0.502, 3);
    expect(parseCssColor('#0000').alpha).toBe(0);
    expect(parseCssColor('rgb(30, 27, 22)')).toEqual({ rgb: [30, 27, 22], alpha: 1 });
    expect(parseCssColor('rgba(0, 0, 0, 0)')).toEqual({ rgb: [0, 0, 0], alpha: 0 });
    expect(parseCssColor('rgb(30 27 22 / 50%)')).toEqual({ rgb: [30, 27, 22], alpha: 0.5 });
    expect(parseCssColor('rgb(100% 0% none)')).toEqual({ rgb: [255, 0, 0], alpha: 1 });
    expect(parseCssColor('transparent').alpha).toBe(0);
  });

  it('parses color(srgb …), including alpha', () => {
    expect(hex('color(srgb 1 1 1)')).toBe('#ffffff');
    expect(parseCssColor('color(srgb 0 0 0 / 0.7)').alpha).toBeCloseTo(0.7, 5);
    expect(() => parseCssColor('color(display-p3 1 0 0)')).toThrow(/colour space/);
  });

  it('parses oklab() and oklch() as browsers serialise color-mix results', () => {
    expect(hex('oklab(1 0 0)')).toBe('#ffffff');
    expect(hex('oklab(0 0 0)')).toBe('#000000');
    expect(hex('oklab(50% 0 0)')).toBe('#636363');
    expect(parseCssColor('oklab(1 0 0 / 0.7)').alpha).toBeCloseTo(0.7, 5);
    expect(hex('oklch(0.627955 0.257683 29.2339)')).toBe('#ff0000');
    expect(hex('oklch(1 0 none)')).toBe('#ffffff');
    expect(hex('oklch(0.627955 0.257683 0.0812053turn)')).toBe('#ff0000');
  });

  it('reads the strings WebKit and Chromium return for a 12% oklab tint', () => {
    // color-mix(in oklab, #1e5a3c 12%, #fbf8f3), measured in WebKit 26 and Chromium 147.
    const expected = mixOklab(parseHex('#1e5a3c'), parseHex('#fbf8f3'), 0.12);
    for (const serialised of [
      'oklab(0.912828 -0.007864 0.00997)', // WebKit
      'oklab(0.912823 -0.00782233 0.00998762)', // Chromium
      'color(srgb 0.876787 0.893794 0.85917)', // color-mix(in srgb, <tint> 100%, transparent)
    ]) {
      const got = parseCssColor(serialised).rgb;
      for (const [i, channel] of got.entries()) {
        expect(Math.abs(channel - (expected[i] ?? 0)), serialised).toBeLessThan(1);
      }
    }
  });

  it('rejects unsupported syntax instead of guessing', () => {
    expect(() => parseCssColor('hsl(0 0% 0%)')).toThrow(/Unsupported/);
    expect(() => parseCssColor('red')).toThrow(/Unsupported/);
  });

  it('composites translucent colours over an opaque backdrop', () => {
    expect(compositeOver(parseCssColor('rgb(0 0 0 / 50%)'), [255, 255, 255])).toEqual([
      127.5, 127.5, 127.5,
    ]);
    expect(compositeOver(parseCssColor('transparent'), [1, 2, 3])).toEqual([1, 2, 3]);
  });
});

describe('tokens.css structure', () => {
  it('has exactly one of each palette block and no other colour overrides', () => {
    expect(structureProblems(css)).toEqual([]);
  });

  it('detects overrides that would bypass the contrast checks (mutation self-test)', () => {
    const mutations = [
      "@media screen { :root[data-theme='dark'] { --st-text: #555555; } }",
      ':root { --st-text: #bbbbbb; }',
      '@media print { :root { --st-bg: #000000; } }',
      "html[data-theme='dark'] { --st-link: #333333; }",
      ':root[data-low-data] { --st-surface: #eeeeee; }',
    ];
    for (const extra of mutations) {
      expect(structureProblems(`${css}\n${extra}\n`), extra).not.toEqual([]);
    }
  });

  it('defines a light palette and a dark override block', () => {
    expect(Object.keys(light).length).toBeGreaterThan(80);
    expect(Object.keys(blocks.dark).length).toBeGreaterThan(30);
  });

  it('system dark block matches the explicit dark block exactly', () => {
    expect(blocks.darkSystem).toEqual(blocks.dark);
  });

  it('dark blocks only override tokens that exist in the light palette', () => {
    for (const name of Object.keys(blocks.dark)) expect(light, name).toHaveProperty(name);
  });

  it('dark blocks redefine every literal colour token', () => {
    const literal = Object.entries(light)
      .filter(([, value]) => value.startsWith('#'))
      .map(([name]) => name);
    for (const name of literal) expect(blocks.dark, `--st-${name}`).toHaveProperty(name);
  });

  it('uses the plan B4 hex values', () => {
    const plan: Record<string, [string, string]> = {
      bg: ['#FBF8F3', '#15130F'],
      surface: ['#FFFFFF', '#1F1C17'],
      'surface-2': ['#F3EEE5', '#292520'],
      text: ['#1E1B16', '#F1ECE2'],
      'text-muted': ['#5C5648', '#B3AA99'],
      border: ['#DDD5C7', '#3A342B'],
      'border-strong': ['#7D7362', '#8C8271'],
      primary: ['#1E5A3C', '#7CC79A'],
      'primary-hover': ['#174730', '#A9E0BE'],
      'on-primary': ['#FFFFFF', '#0E2A1B'],
      'primary-soft': ['#E3F0E8', '#1B3A29'],
      'on-primary-soft': ['#174730', '#A9E0BE'],
      accent: ['#B5561A', '#E8A25C'],
      'accent-text': ['#9A4A10', '#E8A25C'],
      'on-accent': ['#FFFFFF', '#2A1A08'],
      'accent-soft': ['#FBEBDD', '#3A2410'],
      'on-accent-soft': ['#7A3A0C', '#F5C89A'],
      'link-visited': ['#4A3F8F', '#B3A6EE'],
      'success-bg': ['#E3F0E8', '#1B3A29'],
      'success-text': ['#174730', '#A9E0BE'],
      'warning-bg': ['#FFF3D6', '#3A2A08'],
      'warning-text': ['#7A4B00', '#F5C86A'],
      'danger-bg': ['#FCE6E4', '#3E1A18'],
      'danger-text': ['#8F2323', '#F4A5A0'],
      'info-bg': ['#DDF0EF', '#0F3333'],
      'info-text': ['#155A5A', '#8FD3D0'],
      'mark-bg': ['#FFE9A8', '#5A4A12'],
      'hue-start': ['#8A5A00', '#E6B85A'],
      'hue-core': ['#1E5A3C', '#7CC79A'],
      'hue-branding': ['#9C2E63', '#E48BB4'],
      'hue-paperwork': ['#1F6B6B', '#79C9C4'],
      'hue-types': ['#A3401A', '#EE9A72'],
      'hue-lookup': ['#4A3F8F', '#B3A6EE'],
    };
    for (const [name, [l, d]] of Object.entries(plan)) {
      expect(toHex(resolveColor(name, light)), `light --st-${name}`).toBe(l.toLowerCase());
      expect(toHex(resolveColor(name, dark)), `dark --st-${name}`).toBe(d.toLowerCase());
    }
    expect(light['link']).toBe('var(--st-primary)');
    expect(light['focus']).toBe('var(--st-accent)');
  });

  it('mixes each section tint at its own strength', () => {
    expect(light['tint-strength']).toBe('18%');
    expect(dark['tint-strength']).toBe('22%');

    // Every tint, so a reviewer can re-derive it from the hue, the background and the strength.
    const tintIs = (
      theme: Record<string, string>,
      label: string,
      hue: string,
      hex: string,
      bg: string,
      strength: number,
    ): void => {
      expect(toHex(resolveColor(`hue-${hue}-tint`, theme)), `${label} --st-hue-${hue}-tint`).toBe(
        toHex(mixOklab(parseHex(hex), parseHex(bg), strength)),
      );
    };

    // Light: Paperwork and Your kind of business are weaker than the 18% default. That both
    // separates them from their neighbours and *raises* their focus-ring contrast.
    tintIs(light, 'light', 'start', '#8a5a00', '#fbf8f3', 0.18);
    tintIs(light, 'light', 'core', '#1e5a3c', '#fbf8f3', 0.18);
    tintIs(light, 'light', 'branding', '#9c2e63', '#fbf8f3', 0.18);
    tintIs(light, 'light', 'paperwork', '#1f6b6b', '#fbf8f3', 0.14);
    tintIs(light, 'light', 'types', '#a3401a', '#fbf8f3', 0.12);
    tintIs(light, 'light', 'lookup', '#4a3f8f', '#fbf8f3', 0.18);

    // Dark: Start here and Paperwork carry more hue, Branding less, off a 22% default.
    tintIs(dark, 'dark', 'start', '#e6b85a', '#15130f', 0.26);
    tintIs(dark, 'dark', 'core', '#7cc79a', '#15130f', 0.22);
    tintIs(dark, 'dark', 'branding', '#e48bb4', '#15130f', 0.16);
    tintIs(dark, 'dark', 'paperwork', '#79c9c4', '#15130f', 0.28);
    tintIs(dark, 'dark', 'types', '#ee9a72', '#15130f', 0.22);
    tintIs(dark, 'dark', 'lookup', '#b3a6ee', '#15130f', 0.22);
  });

  /*
   * Measured in OKLab, not sRGB. The old sRGB threshold (> 5 out of 441) passed pairs that read
   * as one colour: dark Core vs Paperwork at ΔE_OK 0.0126, dark Start here vs Your kind of
   * business at 0.0194, and light Start here vs Your kind of business at 0.0141.
   *
   * 0.025 is not an aspiration, it is what this palette can actually hold while every contrast
   * pair keeps its margin. The binding constraint is the light focus ring on a tint, the
   * tightest pair in the system: a tint darkens as its strength rises, and pushing light
   * separation to 0.0400 would drop that ring to 3.02:1 against a 3:1 minimum. Accessibility
   * wins, so the light tints were instead chosen to lose no margin at all (worst focus ring
   * still 3.37:1) for a worst pair of 0.0280 (Start here vs Core). Dark has far more headroom
   * and reaches 0.0389 (Core vs Your kind of business) with its worst ring at 5.10:1.
   *
   * Re-derive with the strengths asserted above; docs/design-system.md carries the same numbers.
   */
  it('keeps every section tint distinguishable from the others in OKLab', () => {
    const hues = ['start', 'core', 'branding', 'paperwork', 'types', 'lookup'];
    for (const [themeName, theme] of [
      ['light', light],
      ['dark', dark],
    ] as const) {
      for (const [i, a] of hues.entries()) {
        for (const b of hues.slice(i + 1)) {
          const distance = deltaEOk(
            resolveColor(`hue-${a}-tint`, theme),
            resolveColor(`hue-${b}-tint`, theme),
          );
          expect(distance, `${themeName}: ${a} vs ${b}`).toBeGreaterThanOrEqual(0.025);
        }
      }
    }
  });
});

describe('verified contrast pairs (plan B4)', () => {
  for (const [themeName, theme] of [
    ['light', light],
    ['dark', dark],
  ] as const) {
    for (const pair of CONTRAST_PAIRS) {
      it(`${themeName}: --st-${pair.fg} on --st-${pair.bg} >= ${pair.min}:1`, () => {
        const ratio = contrastRatio(resolveColor(pair.fg, theme), resolveColor(pair.bg, theme));
        expect(ratio).toBeGreaterThanOrEqual(pair.min);
      });
    }
  }

  it('matches the ratios quoted in the plan (to one decimal)', () => {
    const ratio = (fg: string, bg: string, theme: Record<string, string>) =>
      Math.round(contrastRatio(resolveColor(fg, theme), resolveColor(bg, theme)) * 10) / 10;
    expect(ratio('text', 'bg', light)).toBe(16.2);
    expect(ratio('text', 'bg', dark)).toBe(15.8);
    expect(ratio('text-muted', 'bg', light)).toBe(6.9);
    expect(ratio('text-muted', 'bg', dark)).toBe(8.1);
    expect(ratio('on-primary', 'primary', light)).toBe(8.1);
    expect(ratio('on-primary', 'primary', dark)).toBe(7.7);
    expect(ratio('on-accent', 'accent', light)).toBe(4.9);
    expect(ratio('on-accent', 'accent', dark)).toBe(7.8);
    expect(ratio('accent-text', 'bg', light)).toBe(5.9);
    expect(ratio('accent-text', 'bg', dark)).toBe(8.6);
    expect(ratio('focus', 'bg', light)).toBe(4.6);
    expect(ratio('focus', 'bg', dark)).toBe(8.6);
    expect(ratio('border-strong', 'bg', light)).toBe(4.4);
  });

  it('covers every pair named in plan B4', () => {
    const names = new Set(CONTRAST_PAIRS.map((p) => `${p.fg}|${p.bg}`));
    for (const required of [
      'text|bg',
      'text-muted|bg',
      'on-primary|primary',
      'on-accent|accent',
      'accent-text|bg',
      'focus|bg',
      'border-strong|bg',
      'hue-start|bg',
      'hue-core|bg',
      'hue-branding|bg',
      'hue-paperwork|bg',
      'hue-types|bg',
      'hue-lookup|bg',
    ]) {
      expect(names.has(required), required).toBe(true);
    }
  });

  // Plan B4 says "section hues as text >= 5.6 light, >= 7.6 dark". The real light minimum is
  // Start here at 5.59:1, which rounds to the plan's 5.6; assert that, not a looser 5.5, so
  // the hues cannot drift down while still passing.
  it('section hues as text reach >= 5.59 light and >= 7.6 dark', () => {
    for (const hue of ['start', 'core', 'branding', 'paperwork', 'types', 'lookup']) {
      const name = `hue-${hue}`;
      expect(
        contrastRatio(resolveColor(name, light), resolveColor('bg', light)),
        `light --st-${name}`,
      ).toBeGreaterThanOrEqual(5.59);
      expect(
        contrastRatio(resolveColor(name, dark), resolveColor('bg', dark)),
        `dark --st-${name}`,
      ).toBeGreaterThanOrEqual(7.6);
    }
  });
});

describe('favicon', () => {
  it('only uses colours that exist as tokens', () => {
    const svg = readFileSync(resolve(root, 'public/favicon.svg'), 'utf8');
    const used = new Set([...svg.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0].toLowerCase()));
    const tokenColours = new Set(
      [...Object.values(light), ...Object.values(blocks.dark)]
        .filter((v) => v.startsWith('#'))
        .map((v) => toHex(parseHex(v))),
    );
    expect(used.size).toBeGreaterThan(0);
    for (const colour of used) expect(tokenColours.has(colour), colour).toBe(true);
  });
});
