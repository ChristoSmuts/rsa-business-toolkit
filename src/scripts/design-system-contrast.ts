/*
 * Design-system page: read computed token colours and check WCAG contrast at runtime,
 * so drift between tokens.css and the verified pairs shows up as FAIL on the page.
 * Recomputes when the theme attribute or the system colour scheme changes.
 *
 * Timing. WebKit runs deferred and module scripts without waiting for stylesheets that come
 * after them in <head> (Astro emits the page CSS links after the scripts), so the panel can
 * run before the tokens exist and read the unstyled default (black) for every token.
 *
 * Checking `--st-bg` on `documentElement` is not enough, and that was the bug this file was
 * rewritten to fix. Measured in WebKit on a cold cache: the root reported `--st-bg` = #fbf8f3
 * while, in the same instant, a <span> appended to <body> right then reported `--st-bg` = ''
 * and `color` = rgb(0, 0, 0). The root's computed style was fresh; the freshly inserted
 * element's inherited custom properties were not. The panel measured black on black, wrote
 * "76 of 76 pairs fail", and never re-measured, so a Safari visitor saw the design system
 * permanently accusing itself.
 *
 * So the gate is on the measuring element itself, and a reading is only rendered when it can
 * be substantiated (see `measure`). Until then the panel keeps its server-rendered
 * "Measuring…" state and retries: it never shows a failure it cannot stand behind, and if it
 * never becomes measurable it says that instead of inventing failures.
 *
 * Reproduced before the fix, with getComputedStyle instrumented from document start: 10 of 24
 * cold WebKit loads under Playwright request interception wrote "76 of 76 pairs fail", 0 of 12
 * without it. On every failing load all 196 reads showed the root at #fbf8f3 and the probe at
 * '' with rgb(0, 0, 0); on every passing load, 0 of 196. After the fix, 0 of 96 loads under
 * interception: the race still happens (the first read is still blind on about one load in
 * six) and the panel refuses that reading and measures on the next pass instead.
 *
 * The DOM contract the e2e suite reads: `data-live` is `on`, `paused` or `unavailable`, and is
 * **absent** until the first substantiated reading — "not yet known" is a state of its own, and
 * the one a reader of this DOM is most likely to mishandle. `data-failures` exists **only**
 * when there is a measurement behind it. The table is held to the same contract as the summary:
 * it never keeps rows from a reading the summary has withdrawn.
 *
 * Forced colours: the system palette replaces every author colour, so `getComputedStyle`
 * returns the same forced value for every token and each pair would read 1.00:1 FAIL. That
 * is a property of the user's override, not drift in tokens.css, so the panel pauses and
 * says so instead of reporting 76 false failures. It resumes when the user turns the
 * override off.
 */
import { compositeOver, contrastRatio, formatRatio, parseCssColor, toHex, type Rgb } from './color';

/**
 * The token checked first for arrival, and the backdrop every translucent token is composited
 * over. It is checked first because the observed race delivered nothing at all, so a refusal
 * still costs one read; every other token the reading needs is checked straight after it.
 */
const CANARY = 'bg';

/** What the measurement needs from one element's computed style. */
export interface TokenReader {
  /** Computed `--st-<token>` as the cascade delivered it to the element; '' when it did not. */
  custom(token: string): string;
  /** Computed `color` once `color: var(--st-<token>)` is applied to the element. */
  colour(token: string): string;
}

export interface PairSpec {
  fg: string;
  bg: string;
  min: number;
}

export interface PairReading {
  /** Formatted ratio, or null when a token could not be parsed. */
  ratio: string | null;
  pass: boolean;
}

export interface Reading {
  /** Hex per requested swatch token, or null when it could not be parsed. */
  swatches: readonly (string | null)[];
  pairs: readonly PairReading[];
  failures: number;
  /**
   * Pairs whose ratio could not be computed at all — a subset of `failures`, carried separately
   * so the summary can say "could not be read" instead of passing a parser gap off as a
   * contrast verdict.
   */
  unreadable: number;
}

function readRgb(read: TokenReader, token: string): Rgb {
  const parsed = parseCssColor(read.colour(token));
  // Palette tokens are opaque. If one ever is not, judge it as painted on the page background.
  return parsed.alpha < 1 && token !== CANARY
    ? compositeOver(parsed, readRgb(read, CANARY))
    : parsed.rgb;
}

/**
 * Measure every swatch and pair, or return null when the reading cannot be substantiated.
 *
 * Three things make a reading untrustworthy, and the WebKit race produced the first two at once:
 *
 * 1. a token the reading needs never reached the measuring element, so its `var(--st-*)` is
 *    invalid at computed-value time and `color` falls back to the inherited initial black. Every
 *    such token is checked, not one canary: the canary alone only proves that *a* token arrived,
 *    and a partial delivery reads real colours for what arrived and black for the rest, which is
 *    neither one colour nor unparseable and so slips past both other conditions;
 * 2. every token measures as the same colour. No palette is one colour, in any theme, so this
 *    is a fault in the instrument rather than drift in tokens.css. It is a backstop for any
 *    future variant of (1) that still manages to deliver every token;
 * 3. not one token could be parsed. (2) needs two parsed colours to compare, so without this a
 *    reading the parser understood nothing of — a token syntax it does not know, an engine
 *    serialising one in a new way — is published as every pair failing at an `unreadable` ratio:
 *    the original false accusation, from a different cause.
 *
 * None of the three looks at whether a colour is *correct*, so none can turn drift into a pass:
 * a broken token still measures as itself, and the pair it breaks still reports FAIL. What (2)
 * *can* swallow is a palette that genuinely collapsed to one colour — that is reported as
 * `unavailable` rather than as failures, and a refused reading publishes no failure count at
 * all, so every assertion that reads `data-failures="0"` next to `data-live="on"` still goes
 * red. The gates can cost the panel a diagnosis; they cannot buy it a clean bill of health.
 */
export function measure(
  read: TokenReader,
  swatchTokens: readonly string[],
  pairs: readonly PairSpec[],
): Reading | null {
  const needed = new Set<string>([CANARY, ...swatchTokens]);
  for (const { fg, bg } of pairs) {
    needed.add(fg);
    needed.add(bg);
  }
  // Ordered with the canary first, and short-circuiting, so the all-or-nothing case this was
  // written for still costs a single read on each of the ~100 refused attempts.
  for (const token of needed) {
    if (read.custom(token).trim() === '') return null;
  }

  const cache = new Map<string, Rgb | null>();
  const get = (token: string): Rgb | null => {
    if (!cache.has(token)) {
      try {
        cache.set(token, readRgb(read, token));
      } catch {
        cache.set(token, null);
      }
    }
    return cache.get(token) ?? null;
  };

  const swatches = swatchTokens.map((token) => {
    const rgb = get(token);
    return rgb === null ? null : toHex(rgb);
  });

  const readings = pairs.map(({ fg, bg, min }): PairReading => {
    const front = get(fg);
    const back = get(bg);
    if (front === null || back === null) return { ratio: null, pass: false };
    const ratio = contrastRatio(front, back);
    return { ratio: formatRatio(ratio), pass: Math.floor(ratio * 100) / 100 >= min };
  });

  const measured = [...cache.values()].filter((rgb): rgb is Rgb => rgb !== null);
  if (cache.size > 0 && measured.length === 0) return null;
  const first = measured[0];
  if (
    measured.length > 1 &&
    first !== undefined &&
    measured.every((rgb) => rgb[0] === first[0] && rgb[1] === first[1] && rgb[2] === first[2])
  ) {
    return null;
  }

  return {
    swatches,
    pairs: readings,
    failures: readings.filter((p) => !p.pass).length,
    unreadable: readings.filter((p) => p.ratio === null).length,
  };
}

/* ------------------------------------------------------------------ the page ------ */

/** How often to retry while the tokens have not reached the probe. */
const RETRY_MS = 50;
/** How long to keep retrying after the last milestone before admitting defeat. */
const GIVE_UP_MS = 5000;

interface SwatchTarget {
  token: string;
  output: HTMLElement;
}

interface RowTarget {
  spec: PairSpec;
  ratioCell: HTMLElement;
  resultCell: HTMLElement;
}

let probe: HTMLSpanElement | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let deadline = 0;
/**
 * Held at module scope on purpose. A `MediaQueryList` that nothing references can be collected
 * together with its `change` listener, which would silently stop the panel from noticing that
 * forced colours went on or off.
 */
let forcedColours: MediaQueryList | undefined;
let darkScheme: MediaQueryList | undefined;

/**
 * The element every token is resolved through. It is recreated after a failed attempt so a
 * retry never re-reads the stale computed style that caused the failure.
 */
function ensureProbe(): HTMLSpanElement {
  if (!probe?.isConnected) {
    probe = document.createElement('span');
    probe.hidden = true;
    probe.dataset['stContrastProbe'] = '';
    document.body.append(probe);
  }
  return probe;
}

function discardProbe(): void {
  probe?.remove();
  probe = undefined;
}

function domReader(): TokenReader {
  const element = ensureProbe();
  return {
    custom: (token) => getComputedStyle(element).getPropertyValue(`--st-${token}`),
    colour: (token) => {
      element.style.color = `var(--st-${token})`;
      return getComputedStyle(element).color;
    },
  };
}

/**
 * The panel's write targets. The page is server-rendered and static, and this module is the
 * only thing that writes into these cells, so they are collected once: the retry loop below
 * can run a hundred times and must not walk 76 rows on every pass to find out it still cannot
 * measure.
 */
let targets: { swatches: SwatchTarget[]; rows: RowTarget[] } | undefined;

function panelTargets(): { swatches: SwatchTarget[]; rows: RowTarget[] } {
  if (targets) return targets;
  const swatches: SwatchTarget[] = [];
  for (const swatch of document.querySelectorAll<HTMLElement>('[data-swatch-token]')) {
    const token = swatch.dataset['swatchToken'];
    const output = swatch.querySelector<HTMLElement>('[data-swatch-value]');
    if (token && output) swatches.push({ token, output });
  }
  const rows: RowTarget[] = [];
  for (const row of document.querySelectorAll<HTMLElement>('[data-contrast-fg]')) {
    const fg = row.dataset['contrastFg'];
    const bg = row.dataset['contrastBg'];
    const ratioCell = row.querySelector<HTMLElement>('[data-contrast-ratio]');
    const resultCell = row.querySelector<HTMLElement>('[data-contrast-result]');
    if (fg && bg && ratioCell && resultCell) {
      rows.push({
        spec: { fg, bg, min: Number(row.dataset['contrastMin']) },
        ratioCell,
        resultCell,
      });
    }
  }
  targets = { swatches, rows };
  return targets;
}

/**
 * What `data-live` says about the panel, for the e2e tests and for anyone reading the DOM.
 * There is a fourth observable state and it is deliberately not a value here: the attribute is
 * **absent** while a reading is pending, so "not yet known" cannot be read as a verdict.
 */
type LiveState = 'on' | 'paused' | 'unavailable';

/**
 * Whether anything has been written over the server-rendered table. Until it has, the panel has
 * said nothing and there is nothing to withdraw; once it has, a state the panel cannot stand
 * behind must take the table back with it.
 */
let tableWritten = false;

/** Back to the server-rendered table: no ratio, no verdict, no swatch value. */
function clearRows(): void {
  const { swatches, rows } = panelTargets();
  for (const { output } of swatches) output.textContent = '…';
  for (const { ratioCell, resultCell } of rows) {
    ratioCell.textContent = '–';
    resultCell.textContent = 'Not checked';
    resultCell.dataset['result'] = 'pending';
  }
  tableWritten = false;
}

/**
 * Only ever called for a state the panel can stand behind. While a reading is pending the
 * summary is left exactly as the server rendered it ("Measuring…", with no `data-failures`),
 * so nothing downstream can mistake "not yet known" for "measured and fine".
 *
 * `failures` is `null` for every state that is not a measurement, and the attribute is then
 * removed rather than set to `0`. `data-failures="0"` is what the e2e suite reads as "the
 * panel measured every pair and none failed"; writing a 0 for "could not measure" or "paused"
 * would let that assertion pass without a single pair ever being measured — which is exactly
 * the bug it is there to catch.
 */
function summarise(text: string, failures: number | null, live: LiveState): void {
  const summary = document.querySelector<HTMLElement>('[data-contrast-summary]');
  if (!summary) return;
  summary.textContent = text;
  if (failures === null) delete summary.dataset['failures'];
  else summary.dataset['failures'] = String(failures);
  summary.dataset['live'] = live;
}

/** Forced colours: report the state honestly rather than 76 meaningless failures. */
function pause(): void {
  const { swatches, rows } = panelTargets();
  for (const { output } of swatches) output.textContent = 'system colour';
  for (const { ratioCell, resultCell } of rows) {
    ratioCell.textContent = '–';
    resultCell.textContent = 'Paused';
    resultCell.dataset['result'] = 'paused';
  }
  tableWritten = true;
  summarise(
    'Live checks are paused: forced colours replace every token with a system colour, so a ' +
      'measurement here would describe your Windows palette, not the design system. The Light ' +
      'and Dark columns are the build-time ratios. Turn high contrast off to measure again.',
    null,
    'paused',
  );
}

/**
 * The browser never handed the tokens to the measuring element. Say so; the one thing the
 * panel must not do is turn its own blindness into 76 accusations against tokens.css.
 *
 * A re-measure can fail after a good one — a theme change while the probe cannot resolve the
 * tokens. The summary then withdraws the reading, so the table has to go with it: leaving 76
 * `PASS` rows and the previous theme's ratios under a paragraph saying the checks are
 * unavailable shows a designer a live-looking measurement of a theme that was never measured.
 * Before the first reading there is nothing to withdraw, and the server-rendered table is left
 * untouched.
 */
function unavailable(): void {
  if (tableWritten) clearRows();
  summarise(
    'Live checks are unavailable: this browser did not resolve the colour tokens on the ' +
      'measuring element, so there is nothing here that can honestly be measured. The Light ' +
      'and Dark columns are the build-time ratios. Reload to try again.',
    null,
    'unavailable',
  );
}

function render(swatches: SwatchTarget[], rows: RowTarget[], reading: Reading): void {
  swatches.forEach(({ output }, index) => {
    output.textContent = reading.swatches[index] ?? 'unreadable';
  });
  rows.forEach(({ ratioCell, resultCell }, index) => {
    const result = reading.pairs[index];
    if (!result) return;
    ratioCell.textContent = result.ratio ?? 'unreadable';
    resultCell.textContent = result.pass ? 'PASS' : 'FAIL';
    resultCell.dataset['result'] = result.pass ? 'pass' : 'fail';
  });
  tableWritten = true;

  const theme = document.documentElement.dataset['theme'] ?? 'system';
  // An unparseable token fails its pair, which is the right way round — the pair cannot be shown
  // to meet its minimum. But "N of 76 pairs fail" on its own reads as a contrast verdict, and a
  // parser gap is not one, so the count that is not about contrast is named.
  const unreadable =
    reading.unreadable === 0
      ? ''
      : ` ${reading.unreadable} of those could not be read: a token's computed value is not a` +
        ' colour this page knows how to parse.';
  summarise(
    (reading.failures === 0
      ? `All ${rows.length} pairs pass (theme: ${theme}).`
      : `${reading.failures} of ${rows.length} pairs fail (theme: ${theme}).`) + unreadable,
    reading.failures,
    'on',
  );
}

function attempt(): void {
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
  if (forcedColours?.matches) {
    pause();
    return;
  }

  const { swatches, rows } = panelTargets();
  const reading = measure(
    domReader(),
    swatches.map(({ token }) => token),
    rows.map(({ spec }) => spec),
  );

  if (reading) {
    render(swatches, rows, reading);
    return;
  }

  // Not measurable yet. Leave whatever the panel already shows — the server-rendered
  // "Measuring…" on the first pass, or the last good reading on a re-measure — and try again
  // with a fresh probe. Nothing is written, so no false failure can flash.
  discardProbe();
  if (Date.now() >= deadline) unavailable();
  else timer = setTimeout(attempt, RETRY_MS);
}

/** Re-measure now, and keep retrying for a while if the tokens are not there yet. */
function run(): void {
  deadline = Date.now() + GIVE_UP_MS;
  attempt();
}

function boot(): void {
  forcedColours = window.matchMedia('(forced-colors: active)');
  darkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  run();
  // `load` waits for every stylesheet, so it is the milestone most likely to unstick a
  // measurement. It resets the deadline rather than replacing the retry loop: on the failing
  // WebKit loads the page was already styled by `load` and the loop had recovered before it.
  if (document.readyState !== 'complete') {
    window.addEventListener('load', run, { once: true });
  }
  new MutationObserver(run).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  darkScheme.addEventListener('change', run);
  forcedColours.addEventListener('change', run);
}

// Guarded so the measurement logic above can be unit-tested in node.
if (typeof document !== 'undefined') boot();
