/*
 * Small DOM helpers the path elements share (WP-31).
 */
import { DEFAULT_LOCALE, isLocale, type Locale } from '../lib/paths';

/** The page's language: the nearest `data-locale`, else `<html lang>` (`af-ZA` → `af`). */
export function pageLocale(element: Element): Locale {
  const code = (
    element.closest('[data-locale]')?.getAttribute('data-locale') ??
    element.ownerDocument.documentElement.lang ??
    ''
  ).split('-')[0];
  return isLocale(code) ? code : DEFAULT_LOCALE;
}

/**
 * Fills a server-rendered `ProgressRing` inside `root`: the arc, the percentage and the label.
 * The same drawing `<st-checklist-progress>` does for ticks.
 *
 * The first drawing is the value the page opens with, so it is shown at once. Only after it does
 * the ring get `data-animate`, which lets later changes on the page move the arc
 * (`ProgressRing.astro`). Reading the style in between applies the first value before the
 * transition is switched on, or the two would land in the same style change and animate.
 */
export function drawRing(root: ParentNode, done: number, total: number, label: string): void {
  const ring = root.querySelector<HTMLElement>('.st-ring');
  if (!ring) return;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  if (percent >= 100) ring.dataset['complete'] = 'true';
  else delete ring.dataset['complete'];
  ring.querySelector('svg')?.setAttribute('aria-label', label);
  const arc = ring.querySelector('.st-ring__value');
  arc?.setAttribute('stroke-dashoffset', String(100 - percent));
  if (arc && !ring.hasAttribute('data-animate')) {
    void getComputedStyle(arc).strokeDashoffset;
    ring.setAttribute('data-animate', '');
  }
  const value = ring.querySelector('.st-ring__text');
  if (value) value.textContent = `${percent}%`;
}
