import type {
  Act,
  Block,
  ExternalLinkRun,
  InlineRun,
  Lang,
  SourceEntry,
  SourceSubgroup,
  SourcesFile,
} from '../../../src/lib/content/schema';
import type { DocMetaEntry, LangMarkers } from '../config';
import type { IssueCollector } from '../errors';
import { createSlugger } from '../ids';
import { joinLines, mergeTextRuns, runsToText, splitLines, trimRuns, walkRuns } from '../text';
import { parseDayMonthYear } from './footer';

export interface SourcesContext {
  lang: Lang;
  entry: DocMetaEntry;
  blocks: readonly Block[];
  markers: LangMarkers;
  businessTypeDocs: readonly string[];
  issues: IssueCollector;
  /** Translations: the English register. Its `noUrlReason`s are reused by block and list item. */
  source?: SourcesFile | undefined;
}

function externalHrefs(runs: readonly InlineRun[]): string[] {
  const hrefs: string[] = [];
  walkRuns(runs, (run) => {
    if (run.t === 'link' && 'href' in run && !hrefs.includes(run.href)) hrefs.push(run.href);
  });
  return hrefs;
}

function isExternalLink(run: InlineRun | undefined): run is ExternalLinkRun {
  return run?.t === 'link' && 'href' in run;
}

/** Removes a leading text prefix such as `Supports:` from runs; `undefined` when absent. */
export function stripPrefix(runs: readonly InlineRun[], prefix: string): InlineRun[] | undefined {
  const first = runs[0];
  if (first?.t !== 'text' || !first.v.startsWith(prefix)) return undefined;
  return trimRuns([{ t: 'text', v: first.v.slice(prefix.length) }, ...runs.slice(1)]);
}

const DASH = ' — ';

/** Splits runs at every ` — ` (spaced em dash) inside top-level text runs; each part is trimmed. */
export function splitAtDashes(runs: readonly InlineRun[]): InlineRun[][] {
  const segments: InlineRun[][] = [[]];
  for (const run of runs) {
    if (run.t !== 'text') {
      segments.at(-1)?.push(run);
      continue;
    }
    run.v.split(DASH).forEach((part, index) => {
      if (index > 0) segments.push([]);
      if (part !== '') segments.at(-1)?.push({ t: 'text', v: part });
    });
  }
  return segments.map((segment) => trimRuns(segment));
}

function joinWithDashes(segments: readonly InlineRun[][]): InlineRun[] {
  const out: InlineRun[] = [];
  segments.forEach((segment, index) => {
    if (index > 0) out.push({ t: 'text', v: DASH });
    out.push(...segment);
  });
  return mergeTextRuns(out);
}

const LINK_LIST_GLUE = /^[\s,;]*(?:(?:and|or|en|of)[\s,;]*)?$/u;

/** `https://a and https://b`: links joined only by commas or a connector word. */
function isLinkList(runs: readonly InlineRun[]): boolean {
  return (
    runs.some(isExternalLink) &&
    runs.every((run) => isExternalLink(run) || (run.t === 'text' && LINK_LIST_GLUE.test(run.v)))
  );
}

const LEADING_DASH = /^[\s–—-]+/u;

/** `— Labelling and Advertising of Foodstuffs` → `Labelling and …`: the register's dash is not text. */
function stripLeadingDash(runs: readonly InlineRun[]): InlineRun[] {
  const [first, ...rest] = runs;
  if (first?.t !== 'text') return [...runs];
  const trimmed = first.v.replace(LEADING_DASH, '');
  return trimRuns(trimmed === '' ? rest : [{ t: 'text', v: trimmed }, ...rest]);
}

/** Words outside links. A qualifier that is only bare URLs says nothing about what a source supports. */
function proseWordCount(runs: readonly InlineRun[]): number {
  let count = 0;
  for (const run of runs) {
    if (run.t === 'link') continue;
    if (run.t === 'text' || run.t === 'code') count += (run.v.match(WORD) ?? []).length;
    else if ('c' in run) count += proseWordCount(run.c);
  }
  return count;
}

/** Ids only: long list-item titles are cut at a word boundary so anchors stay readable. */
function idTitle(title: string): string {
  if (title.length <= 120) return title;
  const cut = title.slice(0, 119);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '');
}

function cleanTitle(raw: string, markers: LangMarkers): { title: string; official: boolean } {
  let title = raw.replace(/\s+/g, ' ').trim();
  const official = title.startsWith(markers.officialTag);
  if (official) title = title.slice(markers.officialTag.length).trim();
  return { title, official };
}

interface ParsedFields {
  title: string;
  official: boolean;
  url?: string | undefined;
  qualifier?: InlineRun[] | undefined;
  supports?: InlineRun[] | undefined;
  notes: InlineRun[][];
}

/** `**[Official] Title** qualifier` / URL line / `Supports:` line / further lines as notes. */
function paragraphFields(
  runs: readonly InlineRun[],
  markers: LangMarkers,
): ParsedFields | undefined {
  const lines = splitLines(runs);
  const firstLine = trimRuns(lines[0] ?? []);
  const lead = firstLine[0];
  if (lead?.t !== 'strong') return undefined;
  const raw = runsToText(lead.c).trim();
  if (raw === '' || raw.endsWith(':')) return undefined;
  const { title: withStop, official } = cleanTitle(raw, markers);
  const title = withStop.replace(/\.$/, '');
  if (title === '') return undefined;
  const fields: ParsedFields = { title, official, notes: [] };
  const qualifier = trimRuns(firstLine.slice(1));
  if (qualifier.length > 0) fields.qualifier = qualifier;
  for (const line of lines.slice(1)) {
    const trimmed = trimRuns(line);
    if (trimmed.length === 0) continue;
    const [only] = trimmed;
    const supported = stripPrefix(trimmed, markers.supports);
    if (fields.url === undefined && trimmed.length === 1 && isExternalLink(only)) {
      fields.url = only.href;
    } else if (supported && fields.supports === undefined) {
      fields.supports = supported;
    } else {
      fields.notes.push(trimmed);
    }
  }
  return fields;
}

/**
 * The first line of a list item: `Title — URL — what it supports`, `Title — what it supports`, or a
 * sentence with inline links. `undefined` when the item has neither a link nor a ` — ` separator.
 */
function listItemFields(
  line: readonly InlineRun[],
  markers: LangMarkers,
): ParsedFields | undefined {
  const runs = trimRuns(line);
  const segments = splitAtDashes(runs);
  const [head = [], ...rest] = segments;
  if (rest.length > 0 && !head.some(isExternalLink) && runsToText(head).trim() !== '') {
    const fields: ParsedFields = { ...cleanTitle(runsToText(head), markers), notes: [] };
    const [second = []] = rest;
    let from = 0;
    if (second.length === 1 && isExternalLink(second[0])) {
      fields.url = second[0].href;
      from = 1;
    } else if (isLinkList(second)) {
      fields.qualifier = second;
      from = 1;
    }
    if (rest.length > from) fields.supports = joinWithDashes(rest.slice(from));
    return fields;
  }
  const first = runs.findIndex(isExternalLink);
  const link = runs[first];
  if (!isExternalLink(link)) return undefined;
  const before = runsToText(runs.slice(0, first)).trim();
  const fields: ParsedFields = {
    ...cleanTitle(before === '' ? runsToText(link.c) : before, markers),
    notes: [],
  };
  const qualifier = trimRuns(runs.slice(before === '' ? first + 1 : first));
  if (qualifier.length > 0) fields.qualifier = qualifier;
  return fields;
}

function buildAct(row: readonly InlineRun[][], ctx: SourcesContext): Omit<Act, 'id'> | undefined {
  const [nameCell, governs, where] = row;
  if (!nameCell || !governs || !where) return undefined;
  const appearsIn: string[] = [];
  walkRuns(where, (run) => {
    if (run.t !== 'docref') return;
    if ('doc' in run) {
      if (!appearsIn.includes(run.doc)) appearsIn.push(run.doc);
    } else {
      ctx.issues.add(
        'act-appears-in',
        `a whole folder (\`${run.label}\`) cannot be an act location`,
        ctx.entry.id,
      );
    }
  });
  if (runsToText(where).toLowerCase().includes(ctx.markers.allBusinessTypes.toLowerCase())) {
    for (const doc of ctx.businessTypeDocs) if (!appearsIn.includes(doc)) appearsIn.push(doc);
  }
  return { name: runsToText(nameCell).trim(), governs, appearsIn };
}

type Part = readonly InlineRun[] | string | undefined;

const WORD = /[\p{L}\p{N}]+/gu;

function wordCounts(parts: readonly Part[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const part of parts) {
    if (part === undefined) continue;
    const text = typeof part === 'string' ? part : runsToText(part);
    for (const [word] of text.matchAll(WORD)) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return counts;
}

const unitKey = (block: string, item?: number): string =>
  item === undefined ? block : `${block}#${item}`;

/**
 * Derives `sources.json` from the parsed register: the check date, the legislation table as `acts[]`
 * (with `all business types` expanded and bare `03` continuations resolved), groups with their notes and
 * sub-groups, and one entry per bold-titled paragraph or per list item that carries a link or a ` — `
 * separator. A bold line with no link that introduces a list is a sub-group label, not an entry.
 *
 * Nothing is dropped: every word of every paragraph, list item and act row in the register must be kept
 * in some field, or the build fails with `sources-text-lost`. An entry without a link must be listed in
 * `special.citationsWithoutUrl` with a reason (translations reuse the English reason).
 */
export function buildSourcesFile(ctx: SourcesContext): SourcesFile | undefined {
  const { blocks, markers, entry, issues } = ctx;
  const checkedRe = new RegExp(markers.checkedOnPattern, 'u');
  let checkedOn: string | undefined;
  for (const block of blocks) {
    if (block.kind === 'heading') break;
    if (block.kind === 'paragraph') {
      const text = runsToText(block.c);
      if (checkedRe.test(text)) checkedOn = parseDayMonthYear(text, markers.months);
    }
  }
  if (!checkedOn)
    issues.add('sources-checked-on', 'no "checked on" date before the first heading', entry.id);

  const actsHeading = entry.special?.acts?.heading;
  const skip = new Set(entry.special?.sourceGroupsSkip ?? []);
  const acts: Act[] = [];
  const groups: SourcesFile['groups'] = [];
  const entries: SourceEntry[] = [];
  const ids = createSlugger();
  const actIds = createSlugger();
  const units: { key: string; block: string; item?: number; runs: readonly InlineRun[] }[] = [];
  const kept = new Map<string, Part[]>();
  const keep = (key: string, ...parts: Part[]): void => {
    kept.set(key, [...(kept.get(key) ?? []), ...parts]);
  };
  let mode: 'none' | 'skip' | 'acts' | 'group' = 'none';
  let group: SourcesFile['groups'][number] | undefined;
  /** The last bold-titled entry: a later standalone `Supports:` paragraph belongs to it. */
  let lastTitled: SourceEntry | undefined;
  /** Set by a titled paragraph that directly introduces a list. */
  let introducing: { subgroup: SourceSubgroup; entry?: SourceEntry } | undefined;

  const createEntry = (
    fields: ParsedFields,
    base: { group: string; groupId: string; block: string },
    urls: string[],
    id: string,
  ): SourceEntry => {
    const created: SourceEntry = {
      id,
      title: fields.title,
      official: fields.official,
      type: 'web',
      urls,
      ...base,
    };
    const url = fields.url ?? urls[0];
    if (url !== undefined) created.url = url;
    const qualifier = fields.qualifier ? stripLeadingDash(fields.qualifier) : undefined;
    if (qualifier && qualifier.length > 0) created.qualifier = qualifier;
    if (fields.supports && fields.supports.length > 0) created.supports = fields.supports;
    if (fields.notes.length > 0) created.notes = fields.notes;
    entries.push(created);
    return created;
  };

  blocks.forEach((block, index) => {
    if (block.kind === 'heading' && block.depth === 2) {
      lastTitled = undefined;
      introducing = undefined;
      if (block.id === actsHeading) mode = 'acts';
      else if (skip.has(block.id)) mode = 'skip';
      else {
        mode = 'group';
        group = {
          id: block.id,
          title: block.text,
          order: groups.length + 1,
          notes: [],
          subgroups: [],
        };
        groups.push(group);
      }
      return;
    }
    if (mode === 'acts' && block.kind === 'table') {
      block.rows.forEach((row, rowIndex) => {
        const act = buildAct(row, ctx);
        if (!act || act.appearsIn.length === 0) {
          issues.add(
            'act-row',
            `legislation row "${act?.name ?? '?'}" has no locations`,
            entry.id,
            block.id,
          );
          return;
        }
        const key = unitKey(block.id, rowIndex);
        units.push({
          key,
          block: block.id,
          item: rowIndex,
          runs: [...(row[0] ?? []), { t: 'text', v: ' ' }, ...(row[1] ?? [])],
        });
        keep(key, act.name, act.governs);
        acts.push({ id: actIds.slug(act.name), ...act });
      });
      return;
    }
    if (mode !== 'group' || !group) return;
    const currentGroup = group;
    const base = { group: currentGroup.title, groupId: currentGroup.id, block: block.id };
    const leadsList = blocks[index + 1]?.kind === 'list';

    if (block.kind === 'paragraph') {
      introducing = undefined;
      const key = unitKey(block.id);
      units.push({ key, block: block.id, runs: block.c });
      const fields = paragraphFields(block.c, markers);
      const hrefs = externalHrefs(block.c);
      if (fields) {
        const officialTag = fields.official ? markers.officialTag : undefined;
        if (leadsList && hrefs.length === 0 && fields.supports === undefined) {
          const subgroup: SourceSubgroup = {
            id: ids.slug(fields.title),
            title: fields.title,
            block: block.id,
            notes: [...(fields.qualifier ? [fields.qualifier] : []), ...fields.notes],
          };
          currentGroup.subgroups.push(subgroup);
          introducing = { subgroup };
          lastTitled = undefined;
          keep(key, fields.title, officialTag, ...subgroup.notes);
          return;
        }
        const created = createEntry(fields, base, hrefs, ids.slug(fields.title));
        keep(key, fields.title, officialTag, fields.qualifier, created.url, ...fields.notes);
        if (created.supports) keep(key, markers.supports, created.supports);
        if (leadsList) {
          const subgroup: SourceSubgroup = {
            id: created.id,
            title: created.title,
            block: block.id,
            notes: [],
            entry: created.id,
          };
          currentGroup.subgroups.push(subgroup);
          introducing = { subgroup, entry: created };
        }
        lastTitled = created;
        return;
      }
      const supports = stripPrefix(trimRuns(block.c), markers.supports);
      if (supports && lastTitled && !lastTitled.supports) {
        lastTitled.supports = supports;
        keep(key, markers.supports, supports);
        return;
      }
      currentGroup.notes.push(block.c);
      keep(key, block.c);
      return;
    }

    if (block.kind === 'list') {
      const parent = introducing;
      introducing = undefined;
      block.items.forEach((item, itemIndex) => {
        const key = unitKey(block.id, itemIndex);
        units.push({ key, block: block.id, item: itemIndex, runs: item });
        const [line = [], ...more] = splitLines(item);
        const fields = listItemFields(line, markers);
        const rest: InlineRun[][] = [];
        let ownSupports: InlineRun[] | undefined;
        for (const extra of more) {
          const trimmed = trimRuns(extra);
          if (trimmed.length === 0) continue;
          const supported = stripPrefix(trimmed, markers.supports);
          if (supported && parent?.entry && !parent.entry.supports) {
            // A `Supports:` line right under the list continues the last item in markdown, but it
            // describes the entry that introduced the list.
            parent.entry.supports = supported;
            for (const href of externalHrefs(supported))
              if (!parent.entry.urls.includes(href)) parent.entry.urls.push(href);
            keep(key, markers.supports, supported);
          } else if (supported && fields && fields.supports === undefined && !ownSupports) {
            ownSupports = supported;
            keep(key, markers.supports, supported);
          } else {
            rest.push(trimmed);
          }
        }
        if (!fields) {
          const note = joinLines([line, ...rest]);
          (parent ? parent.subgroup.notes : currentGroup.notes).push(note);
          keep(key, note);
          return;
        }
        fields.notes.push(...rest);
        if (ownSupports) fields.supports = ownSupports;
        const urls = externalHrefs([...line, ...rest.flat(), ...(ownSupports ?? [])]);
        const created = createEntry(fields, base, urls, ids.slug(idTitle(fields.title)));
        created.item = itemIndex;
        if (parent) created.subgroupId = parent.subgroup.id;
        const officialTag = fields.official ? markers.officialTag : undefined;
        keep(
          key,
          fields.title,
          officialTag,
          fields.qualifier,
          fields.supports,
          created.url,
          ...rest,
        );
      });
      return;
    }
    if (block.kind === 'hr') return;
    issues.add(
      'sources-block',
      `a ${block.kind} block is not supported inside a source group`,
      entry.id,
      block.id,
    );
  });

  // Every entry has a link or is a citation with a stated reason.
  const reasons = ctx.lang === 'en' ? (entry.special?.citationsWithoutUrl ?? {}) : undefined;
  const englishByUnit = new Map(
    (ctx.source?.entries ?? []).map((source) => [unitKey(source.block, source.item), source]),
  );
  const usedReasons = new Set<string>();
  for (const item of entries) {
    if (item.url !== undefined) continue;
    item.type = 'citation';
    const reason = reasons
      ? reasons[item.id]
      : englishByUnit.get(unitKey(item.block, item.item))?.noUrlReason;
    usedReasons.add(item.id);
    if (reason === undefined) {
      issues.add(
        'source-without-url',
        reasons
          ? `"${item.title}" has no link. Add the link to the register, or add "${item.id}" with a reason to special.citationsWithoutUrl in docs.meta.json`
          : `"${item.title}" has no link, and the English register has no citation at this position`,
        entry.id,
        item.block,
      );
    } else {
      item.noUrlReason = reason;
    }
  }
  for (const id of Object.keys(reasons ?? {})) {
    if (!usedReasons.has(id)) {
      issues.add(
        'unknown-override',
        `special.citationsWithoutUrl lists "${id}", which is not a source without a link`,
        entry.id,
      );
    }
  }

  /*
   * What each source supports, in one field a page can render or omit: the register's own `Supports:`
   * line, else the title-line qualifier, else a single note. The text moves rather than being copied,
   * so nothing renders twice, and `supportsFrom` records where it came from. An entry that has no such
   * text keeps none, so a page omits the label instead of printing an empty one; `--report` lists them.
   * This runs after parsing, so a later standalone `Supports:` paragraph still wins over the fallback.
   */
  for (const item of entries) {
    if (item.supports && item.supports.length > 0) continue;
    if (item.qualifier && proseWordCount(item.qualifier) >= 2) {
      item.supports = item.qualifier;
      item.supportsFrom = 'qualifier';
      delete item.qualifier;
    } else if (item.notes?.length === 1 && proseWordCount(item.notes[0] ?? []) >= 2) {
      item.supports = item.notes[0];
      item.supportsFrom = 'note';
      delete item.notes;
    }
  }

  // Completeness: every word of the register is kept somewhere in sources.json.
  for (const unit of units) {
    const have = wordCounts(kept.get(unit.key) ?? []);
    const missing: string[] = [];
    for (const [word, count] of wordCounts([unit.runs])) {
      if ((have.get(word) ?? 0) < count) missing.push(word);
    }
    if (missing.length > 0) {
      const where = unit.item === undefined ? '' : `item ${unit.item + 1}: `;
      issues.add(
        'sources-text-lost',
        `${where}words not kept in sources.json: ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ` (+${missing.length - 12} more)` : ''}`,
        entry.id,
        unit.block,
      );
    }
  }

  if (acts.length === 0)
    issues.add('sources-acts', `no legislation table under "${actsHeading ?? '?'}"`, entry.id);
  if (!checkedOn) return undefined;
  return { lang: ctx.lang, doc: entry.id, checkedOn, acts, groups, entries };
}
