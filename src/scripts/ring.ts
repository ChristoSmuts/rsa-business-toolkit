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
 */
export function drawRing(root: ParentNode, done: number, total: number, label: string): void {
  const ring = root.querySelector<HTMLElement>('.st-ring');
  if (!ring) return;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  if (percent >= 100) ring.dataset['complete'] = 'true';
  else delete ring.dataset['complete'];
  ring.querySelector('svg')?.setAttribute('aria-label', label);
  ring.querySelector('.st-ring__value')?.setAttribute('stroke-dashoffset', String(100 - percent));
  const value = ring.querySelector('.st-ring__text');
  if (value) value.textContent = `${percent}%`;
}
