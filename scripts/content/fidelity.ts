import type {
  Block,
  Doc,
  InlineRun,
  PlaceholderRun,
  QuickAnswersFile,
  SourcesFile,
} from '../../src/lib/content/schema';
import type { LangMarkers } from './config';
import {
  FACT_KINDS,
  emptyFacts,
  extractFacts,
  factsFromRuns,
  mergeFacts,
  type DateAudit,
  type FactKind,
  type Facts,
} from './facts';
import { hyphenLineCount } from './fences';
import type { ParsedDoc } from './parse';
import { placeholderCase } from './placeholders';
import type { GlossaryDraft } from './special/glossary';
import { blockRunLists, runsToText, walkRuns } from './text';
import { countProtectedTerms } from './verbatim';

/** One fidelity problem. Printed as `doc:blockId: rule expected X got Y`. */
export interface Finding {
  doc: string;
  block: string;
  rule: string;
  expected: string;
  got: string;
}

export function formatFinding(finding: Finding): string {
  return `${finding.doc}:${finding.block}: ${finding.rule} expected ${finding.expected} got ${finding.got}`;
}

const FACT_RULES: Record<FactKind, string> = {
  codes: 'form-code',
  sections: 'section-ref',
  dates: 'date',
  ordinals: 'ordinal',
  rands: 'rand',
  percents: 'percent',
  numbers: 'number',
  multipliers: 'multiplier',
};

const NONE = '(none)';

export function multisetDiff(
  expected: readonly string[],
  got: readonly string[],
): { missing: string[]; extra: string[] } {
  const remaining = new Map<string, number>();
  for (const value of got) remaining.set(value, (remaining.get(value) ?? 0) + 1);
  const missing: string[] = [];
  for (const value of expected) {
    const count = remaining.get(value) ?? 0;
    if (count > 0) remaining.set(value, count - 1);
    else missing.push(value);
  }
  const extra = [...remaining].flatMap(([value, count]) => Array<string>(count).fill(value));
  return { missing: missing.sort(), extra: extra.sort() };
}

function isTranslatedFence(block: Block): block is Extract<Block, { kind: 'code' }> {
  return block.kind === 'code' && block.variant !== 'example' && block.variant !== 'listing';
}

/** Facts of a block: every inline run list, plus the text of fences that are translated. */
export function blockFacts(block: Block, markers: LangMarkers, audit?: DateAudit): Facts {
  const facts = emptyFacts();
  for (const runs of blockRunLists(block)) mergeFacts(facts, factsFromRuns(runs, markers, audit));
  if (isTranslatedFence(block)) mergeFacts(facts, extractFacts(block.text, markers, audit));
  return facts;
}

/** Visible text of a block, for protected-term counts. */
function blockVisibleText(block: Block): string {
  const texts = blockRunLists(block).map((runs) => runsToText(runs));
  if (isTranslatedFence(block)) texts.push(block.text);
  return texts.join('\n');
}

function lineBreaks(block: Block): number {
  let count = 0;
  for (const runs of blockRunLists(block)) {
    walkRuns(runs, (run) => {
      if (run.t === 'br') count += 1;
    });
  }
  return count;
}

/** A glossary entry as the paragraph it was written as, so every block rule applies to it. */
export function glossaryParagraph(draft: Pick<GlossaryDraft, 'id' | 'term' | 'definition'>): Block {
  return {
    id: draft.id,
    hash: '0000000000000000',
    kind: 'paragraph',
    c: [
      { t: 'strong', c: [{ t: 'text', v: draft.term }] },
      { t: 'text', v: ' — ' },
      ...draft.definition,
    ],
  };
}

function linkTargets(block: Block): string[] {
  const targets: string[] = [];
  for (const runs of blockRunLists(block)) {
    walkRuns(runs, (run) => {
      if (run.t !== 'link') return;
      targets.push('href' in run ? run.href : `${run.doc}${run.anchor ? `#${run.anchor}` : ''}`);
    });
  }
  return targets;
}

function docrefTargets(block: Block): string[] {
  const targets: string[] = [];
  for (const runs of blockRunLists(block)) {
    walkRuns(runs, (run) => {
      if (run.t === 'docref') targets.push('doc' in run ? run.doc : `section:${run.section}`);
    });
  }
  return targets;
}

export function placeholderList(block: Block): PlaceholderRun[] {
  const list: PlaceholderRun[] = [];
  for (const runs of blockRunLists(block)) {
    walkRuns(runs, (run) => {
      if (run.t === 'placeholder') list.push(run);
    });
  }
  if (block.kind === 'code') list.push(...(block.placeholders ?? []));
  return list;
}

export function isTodoBlock(block: Block, marker: string): boolean {
  return block.kind === 'paragraph' && runsToText(block.c).trim() === marker;
}

/** Equal block count and equal kind at every position (a `<<TODO>>` paragraph matches any kind). */
export function compareStructure(
  docId: string,
  en: Pick<ParsedDoc, 'blocks' | 'rawKinds'>,
  tr: readonly Block[],
  todo: ReadonlySet<number> = new Set(),
): Finding[] {
  const shared = Math.min(en.blocks.length, tr.length);
  let firstMismatch = -1;
  for (let i = 0; i < shared; i += 1) {
    if (!todo.has(i) && en.rawKinds[i] !== tr[i]?.kind) {
      firstMismatch = i;
      break;
    }
  }
  if (en.blocks.length !== tr.length) {
    const at = firstMismatch >= 0 ? firstMismatch : shared;
    const block = en.blocks[Math.min(at, en.blocks.length - 1)]?.id ?? 'intro';
    return [
      {
        doc: docId,
        block,
        rule: 'block-count',
        expected: String(en.blocks.length),
        got: String(tr.length),
      },
    ];
  }
  const findings: Finding[] = [];
  for (let i = 0; i < shared; i += 1) {
    const kind = en.rawKinds[i];
    const got = tr[i]?.kind;
    if (!todo.has(i) && kind !== got) {
      findings.push({
        doc: docId,
        block: en.blocks[i]?.id ?? 'intro',
        rule: 'block-kind',
        expected: String(kind),
        got: String(got),
      });
    }
  }
  return findings;
}

function firstDifferentLine(expected: string, got: string): { expected: string; got: string } {
  const a = expected.split('\n');
  const b = got.split('\n');
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    if (a[i] !== b[i]) {
      return {
        expected: `line ${i + 1} ${a[i] === undefined ? NONE : JSON.stringify(a[i])}`,
        got: b[i] === undefined ? NONE : JSON.stringify(b[i]),
      };
    }
  }
  return { expected: 'identical text', got: 'different text' };
}

/**
 * Per-position checks for two blocks of the same kind (English vs translation). `protectedTerms` are the
 * names the translation must keep verbatim (TERMS-<lang>.json): each must occur at least as often as in
 * English.
 */
export function compareBlocks(
  docId: string,
  en: Block,
  tr: Block,
  enMarkers: LangMarkers,
  trMarkers: LangMarkers,
  protectedTerms: readonly string[] = [],
): Finding[] {
  const findings: Finding[] = [];
  const add = (rule: string, expected: unknown, got: unknown): void => {
    findings.push({ doc: docId, block: en.id, rule, expected: String(expected), got: String(got) });
  };
  if (en.kind === 'toc') return findings;

  if (en.kind === 'heading' && tr.kind === 'heading') {
    if (en.depth !== tr.depth) add('heading-depth', en.depth, tr.depth);
    if (Boolean(en.pseudo) !== Boolean(tr.pseudo))
      add('pseudo-heading', Boolean(en.pseudo), Boolean(tr.pseudo));
  } else if (en.kind === 'callout' && tr.kind === 'callout') {
    if (en.style !== tr.style) {
      add(
        'callout-label',
        en.style === 'plain' ? trMarkers.plainWords : NONE,
        tr.style === 'plain' ? trMarkers.plainWords : NONE,
      );
    }
  } else if (en.kind === 'list' && tr.kind === 'list') {
    if (en.ordered !== tr.ordered) add('list-ordered', en.ordered, tr.ordered);
    if (en.start !== tr.start) add('list-start', en.start ?? NONE, tr.start ?? NONE);
    if (en.items.length !== tr.items.length) add('list-items', en.items.length, tr.items.length);
  } else if (en.kind === 'tasklist' && tr.kind === 'tasklist') {
    if (en.items.length !== tr.items.length) add('task-count', en.items.length, tr.items.length);
    if (Boolean(en.group) !== Boolean(tr.group))
      add('task-group', Boolean(en.group), Boolean(tr.group));
  } else if (en.kind === 'table' && tr.kind === 'table') {
    if (en.header.length !== tr.header.length)
      add('table-columns', en.header.length, tr.header.length);
    if (en.rows.length !== tr.rows.length) add('table-rows', en.rows.length, tr.rows.length);
  } else if (en.kind === 'terms' && tr.kind === 'terms') {
    if (en.items.length !== tr.items.length) add('terms-count', en.items.length, tr.items.length);
  } else if (en.kind === 'glossary' && tr.kind === 'glossary') {
    if (en.group !== tr.group) add('glossary-group', en.group, tr.group);
  } else if (en.kind === 'code' && tr.kind === 'code') {
    if (en.variant === 'example' || en.variant === 'listing') {
      if (en.text !== tr.text) {
        const diff = firstDifferentLine(en.text, tr.text);
        add('code-verbatim', diff.expected, diff.got);
      }
      return findings;
    }
    if (en.variant === 'template-preview') {
      const expected = hyphenLineCount(en.text);
      const got = hyphenLineCount(tr.text);
      if (expected !== got) add('hyphen-lines', expected, got);
    }
  }

  const enFacts = blockFacts(en, enMarkers);
  const trFacts = blockFacts(tr, trMarkers);
  for (const kind of FACT_KINDS) {
    const { missing, extra } = multisetDiff(enFacts[kind], trFacts[kind]);
    if (missing.length > 0 || extra.length > 0) {
      add(FACT_RULES[kind], missing.join(', ') || NONE, extra.join(', ') || NONE);
    }
  }

  const enBreaks = lineBreaks(en);
  const trBreaks = lineBreaks(tr);
  if (enBreaks !== trBreaks) add('line-breaks', enBreaks, trBreaks);

  if (protectedTerms.length > 0) {
    const expected = countProtectedTerms(blockVisibleText(en), protectedTerms);
    const got = countProtectedTerms(blockVisibleText(tr), protectedTerms);
    for (const [term, count] of expected) {
      const found = got.get(term) ?? 0;
      if (found < count)
        add('keep-verbatim', `${term} ×${count}`, found === 0 ? NONE : `${term} ×${found}`);
    }
  }

  const enLinks = linkTargets(en);
  const trLinks = linkTargets(tr);
  if (enLinks.join('\n') !== trLinks.join('\n'))
    add('links', enLinks.join(' | ') || NONE, trLinks.join(' | ') || NONE);
  const enRefs = docrefTargets(en);
  const trRefs = docrefTargets(tr);
  if (enRefs.join('\n') !== trRefs.join('\n'))
    add('docrefs', enRefs.join(' | ') || NONE, trRefs.join(' | ') || NONE);

  const enPlaceholders = placeholderList(en);
  const trPlaceholders = placeholderList(tr);
  if (enPlaceholders.length !== trPlaceholders.length) {
    add('placeholder-count', enPlaceholders.length, trPlaceholders.length);
  } else {
    enPlaceholders.forEach((placeholder, index) => {
      const other = trPlaceholders[index];
      if (!other) return;
      if (placeholderCase(placeholder.v) !== placeholderCase(other.v)) {
        add(
          'placeholder-case',
          `${placeholderCase(placeholder.v)} [${placeholder.v}]`,
          `${placeholderCase(other.v)} [${other.v}]`,
        );
      }
      if (Boolean(placeholder.nested) !== Boolean(other.nested))
        add('placeholder-nesting', Boolean(placeholder.nested), Boolean(other.nested));
    });
  }
  return findings;
}

function copyPlaceholderStyles(tr: Block, en: Block): void {
  const source = placeholderList(en);
  if (source.length !== placeholderList(tr).length) return;
  let index = 0;
  const convert = (run: PlaceholderRun): PlaceholderRun => {
    const from = source[index];
    index += 1;
    if (!from) return run;
    const next: PlaceholderRun = { t: 'placeholder', v: run.v, style: from.style };
    if (run.nested) next.nested = true;
    if (from.key) next.key = from.key;
    return next;
  };
  const mapRuns = (runs: readonly InlineRun[]): InlineRun[] =>
    runs.map((run) => {
      if (run.t === 'placeholder') return convert(run);
      if (run.t === 'strong' || run.t === 'em') return { t: run.t, c: mapRuns(run.c) };
      if (run.t === 'link') return { ...run, c: mapRuns(run.c) };
      return run;
    });
  for (const runs of blockRunLists(tr)) runs.splice(0, runs.length, ...mapRuns(runs));
  if (tr.kind === 'code' && tr.placeholders) tr.placeholders = tr.placeholders.map(convert);
}

function copyFromSource(tr: Block, en: Block): Block {
  if (en.kind === 'toc') {
    const toc: Block = { id: en.id, hash: tr.hash, sourceHash: en.hash, kind: 'toc' };
    if (en.hidden) toc.hidden = true;
    return toc;
  }
  tr.id = en.id;
  tr.sourceHash = en.hash;
  if (en.hidden) tr.hidden = true;
  if (en.kind === 'heading' && tr.kind === 'heading') {
    if (en.appliesTo) tr.appliesTo = structuredClone(en.appliesTo);
    if (en.ref) tr.ref = en.ref;
  } else if (en.kind === 'code' && tr.kind === 'code') {
    tr.variant = en.variant;
  } else if (en.kind === 'callout' && tr.kind === 'callout') {
    if (en.pairsWith && tr.style === 'plain') tr.pairsWith = en.pairsWith;
    else delete tr.pairsWith;
  } else if (en.kind === 'tasklist' && tr.kind === 'tasklist') {
    tr.items.forEach((task, index) => {
      const source = en.items[index];
      task.block = en.id;
      if (!source) return;
      task.id = source.id;
      task.doc = source.doc;
      if (source.when) task.when = structuredClone(source.when);
    });
  } else if (en.kind === 'table' && tr.kind === 'table') {
    if (en.rowWhen && en.rowWhen.length === tr.rows.length)
      tr.rowWhen = structuredClone(en.rowWhen);
    else delete tr.rowWhen;
  } else if (en.kind === 'glossary' && tr.kind === 'glossary') {
    tr.group = en.group;
  }
  return tr;
}

/** The previously built translation: only block ids and hashes are needed for stale detection. */
export interface PriorDoc {
  blocks: { id: string; hash: string; sourceHash?: string | undefined }[];
}

export interface AlignOptions {
  allowPartial: boolean;
  allowStale: boolean;
  prior?: PriorDoc | Doc | undefined;
  enMarkers: LangMarkers;
  trMarkers: LangMarkers;
  /** Names the translation keeps verbatim (keepVerbatim and extra form codes from TERMS-<lang>.json). */
  protectedTerms?: readonly string[] | undefined;
}

/**
 * Makes a translated document mirror English: after a structural match, block ids, heading
 * applicability, fence variants, task ids, table row conditions and glossary ids are copied by position and
 * every block carries `sourceHash`. Then every fidelity rule runs, on blocks and on each glossary entry, and
 * the footer dates are compared. Returns the findings (empty = faithful).
 */
export function alignTranslation(en: ParsedDoc, tr: ParsedDoc, options: AlignOptions): Finding[] {
  const docId = en.entry.id;
  const terms = options.protectedTerms ?? [];
  const footer: Finding[] =
    en.generated?.date === tr.generated?.date
      ? []
      : [
          {
            doc: docId,
            block: 'footer',
            rule: 'footer-date',
            expected: en.generated?.date ?? NONE,
            got: tr.generated?.date ?? NONE,
          },
        ];
  const todo = new Set(
    tr.blocks.flatMap((block, index) =>
      isTodoBlock(block, options.trMarkers.todoMarker) ? [index] : [],
    ),
  );
  const structure = compareStructure(docId, en, tr.blocks, todo);
  if (structure.length > 0) return [...structure, ...footer];

  const findings: Finding[] = [];
  const idMap = new Map<string, string>();
  tr.blocks = tr.blocks.map((block, index) => {
    const source = en.blocks[index] as Block;
    idMap.set(block.id, source.id);
    if (todo.has(index)) {
      if (!options.allowPartial) {
        findings.push({
          doc: docId,
          block: source.id,
          rule: 'todo',
          expected: 'a translation',
          got: options.trMarkers.todoMarker,
        });
      }
      const copy = structuredClone(source);
      copy.fallback = true;
      copy.sourceHash = source.hash;
      return copy;
    }
    return copyFromSource(block, source);
  });

  tr.blocks.forEach((block, index) => {
    const source = en.blocks[index] as Block;
    if (block.fallback) return;
    findings.push(
      ...compareBlocks(docId, source, block, options.enMarkers, options.trMarkers, terms),
    );
    copyPlaceholderStyles(block, source);
    if (block.kind === 'code' && block.variant !== 'prompt' && block.variant !== 'template-preview')
      delete block.placeholders;
  });

  for (const draft of tr.glossary) {
    draft.groupId = idMap.get(draft.groupId) ?? draft.groupId;
    draft.block = idMap.get(draft.block) ?? draft.block;
  }
  for (const block of en.blocks) {
    if (block.kind !== 'glossary') continue;
    const enEntries = en.glossary.filter((draft) => draft.block === block.id);
    const trEntries = tr.glossary.filter((draft) => draft.block === block.id);
    if (enEntries.length !== trEntries.length) {
      findings.push({
        doc: docId,
        block: block.id,
        rule: 'glossary-count',
        expected: String(enEntries.length),
        got: String(trEntries.length),
      });
      continue;
    }
    trEntries.forEach((draft, index) => {
      const source = enEntries[index];
      if (!source) return;
      draft.id = source.id;
      findings.push(
        ...compareBlocks(
          docId,
          glossaryParagraph(source),
          glossaryParagraph(draft),
          options.enMarkers,
          options.trMarkers,
          terms,
        ),
      );
    });
  }
  for (const link of tr.links) link.block = idMap.get(link.block) ?? link.block;
  for (const use of tr.legacy) use.block = idMap.get(use.block) ?? use.block;
  for (const fence of tr.fences) {
    fence.block = idMap.get(fence.block) ?? fence.block;
    const block = tr.blocks.find((candidate) => candidate.id === fence.block);
    if (block?.kind === 'code') fence.variant = block.variant;
  }

  if (options.prior) {
    const priorBlocks = new Map(options.prior.blocks.map((block) => [block.id, block]));
    for (const block of tr.blocks) {
      if (block.fallback) continue;
      const prior = priorBlocks.get(block.id);
      if (!prior?.sourceHash || prior.hash !== block.hash || prior.sourceHash === block.sourceHash)
        continue;
      if (options.allowStale) block.sourceHash = prior.sourceHash;
      else
        findings.push({
          doc: docId,
          block: block.id,
          rule: 'stale',
          expected: `sourceHash ${block.sourceHash ?? NONE}`,
          got: `sourceHash ${prior.sourceHash}`,
        });
    }
  }
  return [...findings, ...footer];
}

/**
 * Sources: entry count, URLs and the official flag by position; act locations; entry and sub-group ids
 * copied from English.
 */
export function alignSources(en: SourcesFile, tr: SourcesFile): Finding[] {
  const findings: Finding[] = [];
  const add = (block: string, rule: string, expected: unknown, got: unknown): void => {
    findings.push({ doc: en.doc, block, rule, expected: String(expected), got: String(got) });
  };
  if (en.checkedOn !== tr.checkedOn) add('intro', 'checked-on', en.checkedOn, tr.checkedOn);
  if (en.entries.length !== tr.entries.length) {
    add(
      en.entries[Math.min(en.entries.length, tr.entries.length)]?.block ?? 'intro',
      'source-count',
      en.entries.length,
      tr.entries.length,
    );
  } else {
    const entryIds = new Map<string, string>();
    en.entries.forEach((entry, index) => {
      const other = tr.entries[index];
      if (!other) return;
      entryIds.set(other.id, entry.id);
      other.id = entry.id;
      if (entry.url !== other.url)
        add(entry.block, 'source-url', entry.url ?? NONE, other.url ?? NONE);
      if (entry.official !== other.official)
        add(entry.block, 'source-official', entry.official, other.official);
    });
    const subgroupIds = new Map<string, string>();
    tr.groups.forEach((group, groupIndex) => {
      group.subgroups.forEach((subgroup, index) => {
        const source = en.groups[groupIndex]?.subgroups[index];
        if (source) {
          subgroupIds.set(subgroup.id, source.id);
          subgroup.id = source.id;
        }
        if (subgroup.entry !== undefined)
          subgroup.entry = entryIds.get(subgroup.entry) ?? subgroup.entry;
      });
    });
    for (const entry of tr.entries) {
      if (entry.subgroupId !== undefined)
        entry.subgroupId = subgroupIds.get(entry.subgroupId) ?? entry.subgroupId;
    }
  }
  if (en.acts.length !== tr.acts.length) {
    add('legislation-this-toolkit-relies-on', 'act-count', en.acts.length, tr.acts.length);
  } else {
    en.acts.forEach((act, index) => {
      const other = tr.acts[index];
      if (!other) return;
      other.id = act.id;
      if (act.appearsIn.join(',') !== other.appearsIn.join(',')) {
        add(
          'legislation-this-toolkit-relies-on',
          'act-appears-in',
          act.appearsIn.join(', '),
          other.appearsIn.join(', '),
        );
      }
    });
  }
  return findings;
}

export function alignQuickAnswers(
  en: QuickAnswersFile,
  tr: QuickAnswersFile,
  block: string,
): Finding[] {
  if (en.items.length !== tr.items.length) {
    return [
      {
        doc: en.doc,
        block,
        rule: 'quick-answer-count',
        expected: String(en.items.length),
        got: String(tr.items.length),
      },
    ];
  }
  const findings: Finding[] = [];
  en.items.forEach((item, index) => {
    const other = tr.items[index];
    if (!other) return;
    other.id = item.id;
    const expected = item.targets
      .map((target) => ('doc' in target ? target.doc : target.section))
      .join(', ');
    const got = other.targets
      .map((target) => ('doc' in target ? target.doc : target.section))
      .join(', ');
    if (expected !== got)
      findings.push({ doc: en.doc, block, rule: 'quick-answer-targets', expected, got });
  });
  return findings;
}
