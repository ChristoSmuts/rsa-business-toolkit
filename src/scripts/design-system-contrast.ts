/*
 * Design-system page: read computed token colours and check WCAG contrast at runtime,
 * so drift between tokens.css and the verified pairs shows up as FAIL on the page.
 * Recomputes when the theme attribute or the system colour scheme changes.
 *
 * Timing: WebKit runs deferred and module scripts without waiting for stylesheets that come
 * after them in <head> (Astro emits the page CSS links after the scripts). Reading colours
 * then returns the unstyled default (black). So measure only once the tokens resolve, and
 * otherwise wait for the `load` event, which waits for every stylesheet.
 *
 * Forced colours: the system palette replaces every author colour, so `getComputedStyle`
 * returns the same forced value for every token and each pair would read 1.00:1 FAIL. That
 * is a property of the user's override, not drift in tokens.css, so the panel pauses and
 * says so instead of reporting 76 false failures. It resumes when the user turns the
 * override off.
 */
import { compositeOver, contrastRatio, formatRatio, parseCssColor, toHex, type Rgb } from './color';

let probe: HTMLSpanElement | undefined;

const forcedColors = window.matchMedia('(forced-colors: active)');

function stylesApplied(): boolean {
  return getComputedStyle(document.documentElement).getPropertyValue('--st-bg').trim() !== '';
}

/** Resolve a token through the cascade and parse the computed colour string (no canvas). */
function resolveToken(token: string): Rgb {
  if (!probe) {
    probe = document.createElement('span');
    probe.hidden = true;
    document.body.append(probe);
  }
  probe.style.color = `var(--st-${token})`;
  const parsed = parseCssColor(getComputedStyle(probe).color);
  // Palette tokens are opaque. If one ever is not, judge it as painted on the page background.
  return parsed.alpha < 1 && token !== 'bg'
    ? compositeOver(parsed, resolveToken('bg'))
    : parsed.rgb;
}

function swatches(): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>('[data-swatch-token]');
}

function rows(): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>('[data-contrast-fg]');
}

function summarise(text: string, failures: number, live: 'on' | 'paused'): void {
  const summary = document.querySelector<HTMLElement>('[data-contrast-summary]');
  if (!summary) return;
  summary.textContent = text;
  summary.dataset['failures'] = String(failures);
  summary.dataset['live'] = live;
}

/** Forced colours: report the state honestly rather than 76 meaningless failures. */
function pause(): void {
  for (const swatch of swatches()) {
    const output = swatch.querySelector<HTMLElement>('[data-swatch-value]');
    if (output) output.textContent = 'system colour';
  }
  for (const row of rows()) {
    const ratioCell = row.querySelector<HTMLElement>('[data-contrast-ratio]');
    const resultCell = row.querySelector<HTMLElement>('[data-contrast-result]');
    if (ratioCell) ratioCell.textContent = '–';
    if (resultCell) {
      resultCell.textContent = 'Paused';
      resultCell.dataset['result'] = 'paused';
    }
  }
  summarise(
    'Live checks are paused: forced colours replace every token with a system colour, so a ' +
      'measurement here would describe your Windows palette, not the design system. The Light ' +
      'and Dark columns are the build-time ratios. Turn high contrast off to measure again.',
    0,
    'paused',
  );
}

function update(): void {
  for (const swatch of swatches()) {
    const token = swatch.dataset['swatchToken'];
    const output = swatch.querySelector<HTMLElement>('[data-swatch-value]');
    if (!token || !output) continue;
    try {
      output.textContent = toHex(resolveToken(token));
    } catch {
      output.textContent = 'unreadable';
    }
  }

  let failures = 0;
  const list = rows();
  for (const row of list) {
    const fg = row.dataset['contrastFg'];
    const bg = row.dataset['contrastBg'];
    const min = Number(row.dataset['contrastMin']);
    const ratioCell = row.querySelector<HTMLElement>('[data-contrast-ratio]');
    const resultCell = row.querySelector<HTMLElement>('[data-contrast-result]');
    if (!fg || !bg || !ratioCell || !resultCell) continue;
    let pass = false;
    try {
      const ratio = contrastRatio(resolveToken(fg), resolveToken(bg));
      pass = Math.floor(ratio * 100) / 100 >= min;
      ratioCell.textContent = formatRatio(ratio);
    } catch {
      ratioCell.textContent = 'unreadable';
    }
    if (!pass) failures += 1;
    resultCell.textContent = pass ? 'PASS' : 'FAIL';
    resultCell.dataset['result'] = pass ? 'pass' : 'fail';
  }

  const theme = document.documentElement.dataset['theme'] ?? 'system';
  summarise(
    failures === 0
      ? `All ${list.length} pairs pass (theme: ${theme}).`
      : `${failures} of ${list.length} pairs fail (theme: ${theme}).`,
    failures,
    'on',
  );
}

function run(): void {
  if (forcedColors.matches) pause();
  else update();
}

function init(): void {
  run();
  new MutationObserver(run).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', run);
  forcedColors.addEventListener('change', run);
}

function unavailable(): void {
  summarise('Live checks are unavailable: the stylesheet did not load.', 0, 'paused');
}

if (stylesApplied()) init();
else if (document.readyState === 'complete') unavailable();
else
  window.addEventListener('load', () => (stylesApplied() ? init() : unavailable()), { once: true });
