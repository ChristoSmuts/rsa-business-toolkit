import type { InlineRun } from '../../src/lib/content/schema';

/** Bare domains such as `inforegulator.org.za` or `webaim.org/resources/contrastchecker`. */
const DOMAIN_RE =
  /(?<![\p{L}\p{N}@./_-])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:za|com|org|net|io)(?![\p{L}\p{N}-])(?:\/[^\s<>"'`]*)?/giu;

/** Strips trailing sentence punctuation, keeping a `)` only when it closes a `(` inside the URL. */
export function trimTrailingPunctuation(candidate: string): string {
  let value = candidate;
  for (;;) {
    const last = value.at(-1);
    if (last === undefined) return value;
    if ('.,;:!?\'"'.includes(last)) {
      value = value.slice(0, -1);
      continue;
    }
    if (last === ')') {
      const opens = value.split('(').length - 1;
      const closes = value.split(')').length - 1;
      if (closes > opens) {
        value = value.slice(0, -1);
        continue;
      }
    }
    return value;
  }
}

/** Upgrades the `http://www.` that GFM autolinks add to a bare `www.` domain. */
export function normaliseExternalHref(href: string, text: string): string {
  if (href.startsWith('http://') && !text.startsWith('http://'))
    return `https://${href.slice('http://'.length)}`;
  return href;
}

/** Turns bare domains in plain text into external link runs. Domains in `ignore` stay text. */
export function linkifyText(text: string, ignore: ReadonlySet<string>): InlineRun[] {
  const out: InlineRun[] = [];
  let cursor = 0;
  for (const match of text.matchAll(DOMAIN_RE)) {
    const raw = trimTrailingPunctuation(match[0]);
    const host = raw.split('/')[0]?.toLowerCase() ?? '';
    if (ignore.has(host) || !host.includes('.')) continue;
    const start = match.index;
    if (start > cursor) out.push({ t: 'text', v: text.slice(cursor, start) });
    const path = raw.slice(host.length);
    out.push({
      t: 'link',
      href: new URL(`https://${host}${path}`).href,
      external: true,
      c: [{ t: 'text', v: raw }],
    });
    cursor = start + raw.length;
  }
  if (cursor < text.length) out.push({ t: 'text', v: text.slice(cursor) });
  return out;
}
