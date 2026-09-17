import type { Block, InlineRun } from '../../src/lib/content/schema';

/** Plain text of inline runs. Docrefs render as their label, placeholders keep their brackets. */
export function runsToText(runs: readonly InlineRun[]): string {
  let out = '';
  for (const run of runs) {
    switch (run.t) {
      case 'text':
      case 'code':
        out += run.v;
        break;
      case 'strong':
      case 'em':
      case 'link':
        out += runsToText(run.c);
        break;
      case 'docref':
        out += run.label;
        break;
      case 'placeholder':
        out += `[${run.v}]`;
        break;
      case 'sigline':
        out += '__________';
        break;
      case 'br':
        out += '\n';
        break;
    }
  }
  return out;
}

/** Joins adjacent text runs and drops empty ones. */
export function mergeTextRuns(runs: readonly InlineRun[]): InlineRun[] {
  const out: InlineRun[] = [];
  for (const run of runs) {
    if (run.t === 'text') {
      if (run.v === '') continue;
      const last = out.at(-1);
      if (last?.t === 'text') {
        out[out.length - 1] = { t: 'text', v: last.v + run.v };
        continue;
      }
    }
    out.push(run);
  }
  return out;
}

/** Trims whitespace at the start of the first and end of the last text run. */
export function trimRuns(runs: readonly InlineRun[]): InlineRun[] {
  const out = [...runs];
  const first = out[0];
  if (first?.t === 'text') out[0] = { t: 'text', v: first.v.replace(/^\s+/, '') };
  const lastIndex = out.length - 1;
  const last = out[lastIndex];
  if (last?.t === 'text') out[lastIndex] = { t: 'text', v: last.v.replace(/\s+$/, '') };
  return mergeTextRuns(out);
}

/** Splits runs into lines at top-level `br` runs. */
export function splitLines(runs: readonly InlineRun[]): InlineRun[][] {
  const lines: InlineRun[][] = [[]];
  for (const run of runs) {
    if (run.t === 'br') lines.push([]);
    else lines.at(-1)?.push(run);
  }
  return lines;
}

/** Joins lines back together with `br` runs. */
export function joinLines(lines: readonly (readonly InlineRun[])[]): InlineRun[] {
  const out: InlineRun[] = [];
  lines.forEach((line, index) => {
    if (index > 0) out.push({ t: 'br' });
    out.push(...line);
  });
  return out;
}

/** Visits every run, depth first, including runs nested in strong/em/link. */
export function walkRuns(runs: readonly InlineRun[], visit: (run: InlineRun) => void): void {
  for (const run of runs) {
    visit(run);
    if (run.t === 'strong' || run.t === 'em' || run.t === 'link') walkRuns(run.c, visit);
  }
}

/** Every inline-run list in a block, in document order. Code text is not included. */
export function blockRunLists(block: Block): InlineRun[][] {
  switch (block.kind) {
    case 'heading':
    case 'paragraph':
    case 'callout':
    case 'note':
      return [block.c];
    case 'list':
      return block.items;
    case 'tasklist':
      return [...(block.group ? [block.group] : []), ...block.items.map((item) => item.c)];
    case 'table':
      return [...block.header, ...block.rows.flat()];
    case 'terms':
      return [block.intro, ...block.items.flatMap((item) => [item.term, item.meaning])];
    case 'code':
    case 'hr':
    case 'toc':
    case 'glossary':
      return [];
  }
}

/** Plain text of a whole block (code blocks return their text). */
export function blockText(block: Block): string {
  if (block.kind === 'code') return block.text;
  return blockRunLists(block)
    .map((runs) => runsToText(runs))
    .join('\n');
}

export function wordCount(text: string): number {
  return text.match(/\S+/g)?.length ?? 0;
}
