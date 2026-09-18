/**
 * Pure colour helpers for the Stoep design system: WCAG 2.x contrast, OKLab mixing,
 * a parser for computed CSS colour strings, and a small parser for `src/styles/tokens.css`.
 * No DOM access, so it runs in node (unit tests, Playwright, Astro frontmatter) and in the
 * browser (design-system contrast panel).
 */

export type Rgb = readonly [number, number, number];

export interface ContrastPair {
  fg: string;
  bg: string;
  /** Minimum ratio: 4.5 for text, 3 for UI boundaries and focus indicators. */
  min: 4.5 | 3;
  use: string;
}

const TEXT = 4.5;
const UI = 3;

const SECTIONS = [
  ['start', 'Start here'],
  ['core', 'Core'],
  ['branding', 'Branding'],
  ['paperwork', 'Paperwork'],
  ['types', 'Business types'],
  ['lookup', 'Look it up'],
] as const;

/** Soft backgrounds that components put text, links and focus rings on. */
const SOFT_BACKGROUNDS = [
  ['surface-2', 'note callouts and code'],
  ['primary-soft', 'official callouts and badges'],
  ['accent-soft', 'plain-words callouts'],
  ['warning-bg', 'warning callouts'],
  ['info-bg', 'info callouts'],
] as const;

/**
 * Every pair from plan B4 plus every text/background pair the components render
 * (callout bodies, toasts, links and focus rings on tints, button hover states).
 */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { fg: 'text', bg: 'bg', min: TEXT, use: 'Body text on page' },
  { fg: 'text', bg: 'surface', min: TEXT, use: 'Body text on cards' },
  { fg: 'text', bg: 'surface-2', min: TEXT, use: 'Body text on raised areas' },
  { fg: 'text-muted', bg: 'bg', min: TEXT, use: 'Secondary text on page' },
  { fg: 'text-muted', bg: 'surface', min: TEXT, use: 'Secondary text on cards' },
  { fg: 'text-muted', bg: 'surface-2', min: TEXT, use: 'Secondary text, disabled controls' },
  { fg: 'link', bg: 'bg', min: TEXT, use: 'Links on page' },
  { fg: 'link', bg: 'surface', min: TEXT, use: 'Links on cards' },
  { fg: 'link-hover', bg: 'bg', min: TEXT, use: 'Hovered links' },
  { fg: 'link-visited', bg: 'bg', min: TEXT, use: 'Visited links' },
  { fg: 'on-primary', bg: 'primary', min: TEXT, use: 'Primary button label' },
  { fg: 'on-primary', bg: 'primary-hover', min: TEXT, use: 'Primary button label, hover' },
  { fg: 'on-primary-soft', bg: 'primary-soft', min: TEXT, use: 'Text on soft green' },
  { fg: 'on-accent', bg: 'accent', min: TEXT, use: 'Accent fill label' },
  { fg: 'accent-text', bg: 'bg', min: TEXT, use: 'Accent text on page' },
  { fg: 'accent-text', bg: 'surface', min: TEXT, use: 'Accent text on cards' },
  { fg: 'on-accent-soft', bg: 'accent-soft', min: TEXT, use: 'Text on soft rooibos' },
  { fg: 'success-text', bg: 'success-bg', min: TEXT, use: 'Success message' },
  { fg: 'warning-text', bg: 'warning-bg', min: TEXT, use: 'Warning message' },
  { fg: 'danger-text', bg: 'danger-bg', min: TEXT, use: 'Error message' },
  { fg: 'info-text', bg: 'info-bg', min: TEXT, use: 'Info message' },
  { fg: 'danger-text', bg: 'bg', min: TEXT, use: 'Error text on page' },
  { fg: 'on-danger-solid', bg: 'danger-solid', min: TEXT, use: 'Danger button label' },
  {
    fg: 'on-danger-solid',
    bg: 'danger-solid-hover',
    min: TEXT,
    use: 'Danger button label, hover',
  },
  { fg: 'text', bg: 'mark-bg', min: TEXT, use: 'Highlighted search match' },
  { fg: 'bg', bg: 'text', min: TEXT, use: 'Default toast (inverse)' },
  ...SOFT_BACKGROUNDS.slice(1).map(([bg, where]): ContrastPair => ({
    fg: 'text',
    bg,
    min: TEXT,
    use: `Body text in ${where}`,
  })),
  ...SOFT_BACKGROUNDS.map(([bg, where]): ContrastPair => ({
    fg: 'link',
    bg,
    min: TEXT,
    use: `Links in ${where}`,
  })),
  ...SECTIONS.map(([id, name]): ContrastPair => ({
    fg: `hue-${id}`,
    bg: 'bg',
    min: TEXT,
    use: `${name} hue as text`,
  })),
  ...SECTIONS.map(([id, name]): ContrastPair => ({
    fg: `hue-${id}`,
    bg: 'surface',
    min: TEXT,
    use: `${name} hue on cards`,
  })),
  ...SECTIONS.map(([id, name]): ContrastPair => ({
    fg: 'text',
    bg: `hue-${id}-tint`,
    min: TEXT,
    use: `Text on ${name} tint`,
  })),
  ...SECTIONS.map(([id, name]): ContrastPair => ({
    fg: 'link',
    bg: `hue-${id}-tint`,
    min: TEXT,
    use: `Links on ${name} tint`,
  })),
  { fg: 'border-strong', bg: 'bg', min: UI, use: 'Control border on page' },
  { fg: 'border-strong', bg: 'surface', min: UI, use: 'Control border on cards' },
  { fg: 'border-strong', bg: 'surface-2', min: UI, use: 'Control border on raised areas' },
  { fg: 'focus', bg: 'bg', min: UI, use: 'Focus ring on page' },
  { fg: 'focus', bg: 'surface', min: UI, use: 'Focus ring on cards' },
  ...SOFT_BACKGROUNDS.map(([bg, where]): ContrastPair => ({
    fg: 'focus',
    bg,
    min: UI,
    use: `Focus ring in ${where}`,
  })),
  ...SECTIONS.map(([id, name]): ContrastPair => ({
    fg: 'focus',
    bg: `hue-${id}-tint`,
    min: UI,
    use: `Focus ring on ${name} tint`,
  })),
  { fg: 'primary', bg: 'bg', min: UI, use: 'Primary button edge, checkbox fill' },
];

/** Parse `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa` (case-insensitive); alpha is ignored. */
export function parseHex(hex: string): Rgb {
  const raw = hex.trim().replace(/^#/, '');
  const full =
    raw.length === 3 || raw.length === 4
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(full)) throw new Error(`Not a hex colour: ${hex}`);
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

export function toHex(rgb: Rgb): string {
  return `#${rgb
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function clampRgb(rgb: Rgb): Rgb {
  return rgb.map((v) => Math.min(255, Math.max(0, v))) as unknown as Rgb;
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value: number): number {
  const v = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return v * 255;
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = clampRgb(rgb);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG 2.x contrast ratio, from 1 to 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Truncate (not round) to two decimals so a displayed ratio never overstates a pass. */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
}

type Lab = readonly [number, number, number];

function rgbToOklab(rgb: Rgb): Lab {
  const [r, g, b] = rgb.map(srgbToLinear) as unknown as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb([L, A, B]: Lab): Rgb {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/**
 * Perceptual distance between two colours in OKLab (ΔE_OK).
 *
 * Euclidean distance in sRGB flatters dark colours: two dark section tints eight sRGB units
 * apart look like the same greige on a dim phone. In OKLab, roughly 0.02 is a just-noticeable
 * difference for two large flat areas, so the tint-separation test asks for 0.03.
 */
export function deltaEOk(a: Rgb, b: Rgb): number {
  const la = rgbToOklab(a);
  const lb = rgbToOklab(b);
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
}

/** `color-mix(in oklab, a weight%, b)` for opaque colours. `weight` is 0..1. */
export function mixOklab(a: Rgb, b: Rgb, weight: number): Rgb {
  const la = rgbToOklab(a);
  const lb = rgbToOklab(b);
  return oklabToRgb([
    la[0] * weight + lb[0] * (1 - weight),
    la[1] * weight + lb[1] * (1 - weight),
    la[2] * weight + lb[2] * (1 - weight),
  ]);
}

export interface CssColor {
  /** sRGB channels 0..255, clamped to the sRGB gamut. */
  rgb: Rgb;
  /** 0..1 */
  alpha: number;
}

/** Parse one numeric component: `none` is 0, `N%` is N/100 of `percentScale`. */
function component(token: string | undefined, percentScale: number): number {
  if (token === undefined || token === 'none') return 0;
  const value = Number.parseFloat(token);
  if (Number.isNaN(value)) throw new Error(`Bad colour component: ${token}`);
  return token.endsWith('%') ? (value / 100) * percentScale : value;
}

function hueDegrees(token: string | undefined): number {
  if (token === undefined || token === 'none') return 0;
  const value = Number.parseFloat(token);
  if (token.endsWith('turn')) return value * 360;
  if (token.endsWith('grad')) return value * 0.9;
  if (token.endsWith('rad')) return (value * 180) / Math.PI;
  return value;
}

/**
 * Parse a CSS colour string as browsers serialise computed values: `#hex`, `rgb()`/`rgba()`
 * (comma or space syntax), `color(srgb …)`, `oklab()`, `oklch()` and `transparent`.
 * WebKit and Chromium both serialise `color-mix(in oklab, …)` results as `oklab(…)`.
 */
export function parseCssColor(input: string): CssColor {
  const value = input.trim().toLowerCase();
  if (value === 'transparent') return { rgb: [0, 0, 0], alpha: 0 };
  if (value.startsWith('#')) {
    const raw = value.slice(1);
    const alphaHex = raw.length === 4 ? raw[3]! + raw[3]! : raw.length === 8 ? raw.slice(6) : '';
    return {
      rgb: parseHex(value),
      alpha: alphaHex ? Number.parseInt(alphaHex, 16) / 255 : 1,
    };
  }
  const fn = /^([a-z]+)\((.*)\)$/.exec(value);
  if (!fn?.[1] || fn[2] === undefined) throw new Error(`Unsupported colour: ${input}`);
  const [main = '', alphaPart] = fn[2].split('/');
  const parts = main
    .replace(/,/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((p) => p !== '');
  let alphaToken = alphaPart?.trim();
  switch (fn[1]) {
    case 'rgb':
    case 'rgba': {
      if (parts.length === 4 && alphaToken === undefined) alphaToken = parts[3];
      const rgb: Rgb = [
        component(parts[0], 255),
        component(parts[1], 255),
        component(parts[2], 255),
      ];
      return { rgb: clampRgb(rgb), alpha: alphaToken ? component(alphaToken, 1) : 1 };
    }
    case 'color': {
      if (parts[0] !== 'srgb') throw new Error(`Unsupported colour space: ${input}`);
      const rgb: Rgb = [
        component(parts[1], 1) * 255,
        component(parts[2], 1) * 255,
        component(parts[3], 1) * 255,
      ];
      return { rgb: clampRgb(rgb), alpha: alphaToken ? component(alphaToken, 1) : 1 };
    }
    case 'oklab': {
      const lab: Lab = [component(parts[0], 1), component(parts[1], 0.4), component(parts[2], 0.4)];
      return { rgb: clampRgb(oklabToRgb(lab)), alpha: alphaToken ? component(alphaToken, 1) : 1 };
    }
    case 'oklch': {
      const L = component(parts[0], 1);
      const C = component(parts[1], 0.4);
      const H = (hueDegrees(parts[2]) * Math.PI) / 180;
      const lab: Lab = [L, C * Math.cos(H), C * Math.sin(H)];
      return { rgb: clampRgb(oklabToRgb(lab)), alpha: alphaToken ? component(alphaToken, 1) : 1 };
    }
    default:
      throw new Error(`Unsupported colour function: ${input}`);
  }
}

/** Source-over composite of a (possibly translucent) colour on an opaque backdrop, in sRGB. */
export function compositeOver(top: CssColor, backdrop: Rgb): Rgb {
  const a = Math.min(1, Math.max(0, top.alpha));
  return [
    top.rgb[0] * a + backdrop[0] * (1 - a),
    top.rgb[1] * a + backdrop[1] * (1 - a),
    top.rgb[2] * a + backdrop[2] * (1 - a),
  ];
}

export type TokenMap = Record<string, string>;

export interface TokenBlocks {
  /** `:root { … }`, the first block in the file. */
  light: TokenMap;
  /** `:root[data-theme="dark"] { … }`. */
  dark: TokenMap;
  /** `:root:not([data-theme="light"]) { … }` inside `prefers-color-scheme: dark`. */
  darkSystem: TokenMap;
}

export interface TokenRule {
  /** Selector text, whitespace collapsed. */
  selector: string;
  /** Enclosing at-rule preludes (for example `@media screen`), outermost first. */
  conditions: string[];
  tokens: TokenMap;
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function declarations(body: string): TokenMap {
  const map: TokenMap = {};
  for (const match of stripComments(body).matchAll(/--st-([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match;
    // Collapse whitespace, including formatter line breaks inside `color-mix(\n  in oklab, …\n)`.
    if (name && value) {
      map[name] = value.replace(/\s+/g, ' ').replace(/\(\s/g, '(').replace(/\s\)/g, ')').trim();
    }
  }
  return map;
}

/**
 * Every rule in a stylesheet that declares `--st-*` properties, in source order, with its
 * enclosing at-rules. Handles nesting of at-rules (not CSS nesting of style rules).
 */
export function tokenRules(css: string): TokenRule[] {
  const source = stripComments(css);
  const rules: TokenRule[] = [];
  const stack: string[] = [];
  let preludeStart = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') {
      const prelude = source.slice(preludeStart, i).replace(/\s+/g, ' ').trim();
      if (prelude.startsWith('@')) {
        stack.push(prelude);
        preludeStart = i + 1;
        continue;
      }
      const end = source.indexOf('}', i);
      const tokens = declarations(source.slice(i + 1, end));
      if (Object.keys(tokens).length > 0) {
        rules.push({ selector: prelude, conditions: [...stack], tokens });
      }
      i = end;
      preludeStart = end + 1;
    } else if (ch === '}') {
      stack.pop();
      preludeStart = i + 1;
    } else if (ch === ';' && stack.length === 0) {
      preludeStart = i + 1; // top-level statements such as @import
    }
  }
  return rules;
}

const LIGHT_SELECTOR = /^:root$/;
const DARK_SELECTOR = /^:root\[data-theme=['"]dark['"]\]$/;
const SYSTEM_DARK_SELECTOR = /^:root:not\(\[data-theme=['"]light['"]\]\)$/;

/** Split tokens.css into its light, dark and system-dark declaration maps (names without `--st-`). */
export function parseTokenBlocks(css: string): TokenBlocks {
  const rules = tokenRules(css);
  const find = (label: string, test: (rule: TokenRule) => boolean): TokenMap => {
    const rule = rules.find(test);
    if (!rule) throw new Error(`Token block not found: ${label}`);
    return rule.tokens;
  };
  return {
    light: find(':root', (r) => LIGHT_SELECTOR.test(r.selector) && r.conditions.length === 0),
    dark: find(':root[data-theme="dark"]', (r) => DARK_SELECTOR.test(r.selector)),
    darkSystem: find(
      ':root:not([data-theme="light"])',
      (r) =>
        SYSTEM_DARK_SELECTOR.test(r.selector) &&
        r.conditions.some((c) => /prefers-color-scheme:\s*dark/.test(c)),
    ),
  };
}

/** Selector patterns for the three palette blocks, exported for the structure test. */
export const PALETTE_SELECTORS = {
  light: LIGHT_SELECTOR,
  dark: DARK_SELECTOR,
  darkSystem: SYSTEM_DARK_SELECTOR,
} as const;

function resolvePercent(raw: string, theme: TokenMap, depth: number): number {
  const alias = /^var\(--st-([a-z0-9-]+)\)$/.exec(raw);
  if (alias?.[1]) {
    const value = theme[alias[1]];
    if (value === undefined) throw new Error(`Unknown token --st-${alias[1]}`);
    if (depth > 8) throw new Error(`Token alias loop at --st-${alias[1]}`);
    return resolvePercent(value, theme, depth + 1);
  }
  const pct = /^([\d.]+)%$/.exec(raw);
  if (!pct?.[1]) throw new Error(`Not a percentage: ${raw}`);
  return Number(pct[1]) / 100;
}

/**
 * Resolve a colour token to sRGB for a theme. Supports hex literals, `var(--st-x)` aliases
 * and `color-mix(in oklab, var(--st-a) N%, var(--st-b))`, where N may also be a
 * `var(--st-x)` holding a percentage.
 */
export function resolveColor(name: string, theme: TokenMap, depth = 0): Rgb {
  if (depth > 8) throw new Error(`Token alias loop at --st-${name}`);
  const value = theme[name];
  if (value === undefined) throw new Error(`Unknown token --st-${name}`);
  if (value.startsWith('#')) return parseHex(value);
  const alias = /^var\(--st-([a-z0-9-]+)\)$/.exec(value);
  if (alias?.[1]) return resolveColor(alias[1], theme, depth + 1);
  const mix =
    /^color-mix\(in oklab, var\(--st-([a-z0-9-]+)\) ([\d.]+%|var\(--st-[a-z0-9-]+\)), var\(--st-([a-z0-9-]+)\)\)$/.exec(
      value,
    );
  if (mix?.[1] && mix[2] && mix[3]) {
    return clampRgb(
      mixOklab(
        resolveColor(mix[1], theme, depth + 1),
        resolveColor(mix[3], theme, depth + 1),
        resolvePercent(mix[2], theme, depth + 1),
      ),
    );
  }
  throw new Error(`Cannot resolve --st-${name}: ${value}`);
}

/** Light tokens with the dark overrides applied on top (how the cascade resolves on :root). */
export function darkTheme(blocks: TokenBlocks): TokenMap {
  return { ...blocks.light, ...blocks.dark };
}
