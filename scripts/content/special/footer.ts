import type { RootContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import type { LangMarkers } from '../config';
import type { IssueCollector, SourceLocation } from '../errors';
import { EN_MONTHS } from '../facts';

export interface Generated {
  date: string;
  tool: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** First `13 September 2026` style date in the text (language month names or English) → `2026-09-13`. */
export function parseDayMonthYear(text: string, months: readonly string[]): string | undefined {
  const names = [...new Set([...months, ...EN_MONTHS])];
  const re = new RegExp(
    `(?<!\\d)(\\d{1,2})\\s+(${names.map(escapeRegExp).join('|')})\\s+(\\d{4})(?!\\d)`,
    'iu',
  );
  const match = re.exec(text);
  if (!match) return undefined;
  const word = (match[2] ?? '').toLowerCase();
  let index = months.findIndex((month) => month.toLowerCase() === word);
  if (index < 0) index = EN_MONTHS.findIndex((month) => month.toLowerCase() === word);
  return `${match[3]}-${String(index + 1).padStart(2, '0')}-${(match[1] ?? '').padStart(2, '0')}`;
}

function isFooterParagraph(node: RootContent | undefined, markers: LangMarkers): boolean {
  if (node?.type !== 'paragraph') return false;
  const children = node.children.filter(
    (child) => !(child.type === 'text' && child.value.trim() === ''),
  );
  return (
    children.length === 1 &&
    children[0]?.type === 'emphasis' &&
    toString(node).trim().startsWith(markers.footerPrefix)
  );
}

/**
 * Removes the generated-by-AI footer: a trailing thematic break followed by one italic paragraph that
 * starts with the language's footer marker. Its date and tool become `doc.generated`.
 */
export function stripFooter(
  children: readonly RootContent[],
  markers: LangMarkers,
  issues: IssueCollector,
  docId: string,
  file?: string,
): { children: RootContent[]; generated?: Generated | undefined } {
  const at = (node: RootContent | undefined): SourceLocation | undefined =>
    file === undefined ? undefined : { file, line: node?.position?.start.line };
  const all = [...children];
  const lastIndex = all.length - 1;
  all.forEach((node, index) => {
    if (index !== lastIndex && isFooterParagraph(node, markers)) {
      issues.add(
        'footer-misplaced',
        'a generated-by-AI footer must be the last paragraph',
        docId,
        undefined,
        at(node),
      );
    }
  });
  const last = all[lastIndex];
  if (!last || !isFooterParagraph(last, markers)) return { children: all };
  const rule = all[lastIndex - 1];
  if (rule?.type !== 'thematicBreak') {
    issues.add(
      'footer-without-rule',
      'the footer must follow a --- line',
      docId,
      undefined,
      at(last),
    );
    return { children: all };
  }
  const text = toString(last);
  const tool = /\(([^)]+)\)/.exec(text)?.[1]?.trim();
  const date = parseDayMonthYear(text, markers.months);
  if (!tool || !date) {
    issues.add(
      'footer-unparsed',
      `cannot read the tool and date from the footer "${text.slice(0, 80)}"`,
      docId,
      undefined,
      at(last),
    );
    return { children: all.slice(0, -2) };
  }
  return { children: all.slice(0, -2), generated: { date, tool } };
}
