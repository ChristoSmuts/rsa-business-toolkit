import {
  BUSINESS_TYPE_IDS,
  type Applicability,
  type BusinessTypeId,
  type DocAppliesTo,
} from '../../src/lib/content/schema';
import type { ContentConfig, DocMetaEntry } from './config';
import type { IssueCollector } from './errors';
import type { ParsedDoc } from './parse';
import { runsToText } from './text';

export interface ApplicabilityRow {
  doc: string;
  kind: 'doc' | 'heading' | 'task' | 'row';
  target: string;
  text: string;
  appliesTo: string;
  source: string;
}

export function docAppliesTo(entry: DocMetaEntry): DocAppliesTo {
  return {
    entity: entry.appliesTo?.entity ?? 'all',
    businessTypes: entry.appliesTo?.businessTypes ?? 'all',
  };
}

function sortTypes(types: Iterable<BusinessTypeId>): BusinessTypeId[] {
  const set = new Set(types);
  return BUSINESS_TYPE_IDS.filter((id) => set.has(id));
}

function compact(value: Applicability): Applicability | undefined {
  const out: Applicability = {};
  if (value.entity) out.entity = value.entity;
  if (value.businessTypes && value.businessTypes.length > 0)
    out.businessTypes = sortTypes(value.businessTypes);
  if (value.tags && value.tags.length > 0) out.tags = [...new Set(value.tags)].sort();
  return Object.keys(out).length > 0 ? out : undefined;
}

/** `over` wins for entity and business types; tags are the union. */
export function mergeApplicability(
  base?: Applicability,
  over?: Applicability,
): Applicability | undefined {
  const merged: Applicability = {};
  const entity = over?.entity ?? base?.entity;
  const businessTypes = over?.businessTypes ?? base?.businessTypes;
  if (entity) merged.entity = entity;
  if (businessTypes) merged.businessTypes = [...businessTypes];
  merged.tags = [...(base?.tags ?? []), ...(over?.tags ?? [])];
  return compact(merged);
}

/** Several rules matching one heading or row: business types and tags are unioned. */
function unionRules(matches: readonly Applicability[]): Applicability | undefined {
  const union: Applicability = {};
  const entity = matches.map((m) => m.entity).findLast((value) => value !== undefined);
  if (entity) union.entity = entity;
  union.businessTypes = matches.flatMap((m) => m.businessTypes ?? []);
  union.tags = matches.flatMap((m) => m.tags ?? []);
  return compact(union);
}

export function formatApplicability(value: Applicability | DocAppliesTo | undefined): string {
  if (!value) return 'all';
  const parts: string[] = [];
  if (value.entity && value.entity !== 'all') parts.push(`entity=${value.entity}`);
  if (value.businessTypes && value.businessTypes !== 'all')
    parts.push(`types=${value.businessTypes.join(',')}`);
  if ('tags' in value && value.tags) parts.push(`tags=${value.tags.join(',')}`);
  return parts.length > 0 ? parts.join('; ') : 'all';
}

function docLevel(entry: DocMetaEntry): Applicability | undefined {
  const value: Applicability = {};
  if (entry.appliesTo?.entity) value.entity = entry.appliesTo.entity;
  if (entry.appliesTo?.businessTypes) value.businessTypes = entry.appliesTo.businessTypes;
  return compact(value);
}

/**
 * English only. Doc level from docs.meta.json; heading level from inference rules, pseudo-heading refs to
 * a business-type doc, inheritance and `applicability.json` overrides; task `when` from the doc, the
 * enclosing heading, task prefixes (`If a company:`) and task overrides; table `rowWhen` from the
 * `tableRows` rules for rows whose text states a condition (`if you run payroll`).
 */
export function applyApplicability(
  parsed: ParsedDoc,
  config: ContentConfig,
  usedOverrides: Set<string>,
): ApplicabilityRow[] {
  const { entry } = parsed;
  const rows: ApplicabilityRow[] = [];
  const level = docAppliesTo(entry);
  if (level.entity !== 'all' || level.businessTypes !== 'all') {
    rows.push({
      doc: entry.id,
      kind: 'doc',
      target: entry.id,
      text: parsed.h1,
      appliesTo: formatApplicability(level),
      source: 'docs.meta',
    });
  }
  const {
    inference,
    headings: headingOverrides,
    taskPrefixes,
    tasks: taskOverrides,
    tableRows,
  } = config.applicability;
  const inferEnabled =
    inference.sections.includes(entry.section) && inference.kinds.includes(entry.kind);
  const rules = inference.rules
    .filter((rule) => !rule.docs || rule.docs.includes(entry.id))
    .map((rule) => ({ re: new RegExp(rule.pattern, 'u'), appliesTo: rule.appliesTo }));
  const prefixes = taskPrefixes.map((prefix) => ({
    re: new RegExp(prefix.pattern, 'u'),
    appliesTo: prefix.appliesTo,
  }));
  const rowRules = tableRows
    .filter((rule) => !rule.docs || rule.docs.includes(entry.id))
    .map((rule) => ({
      re: new RegExp(rule.pattern, 'iu'),
      appliesTo: rule.appliesTo,
      headings: rule.headings,
    }));
  const typeByDoc = new Map(config.businessTypes.types.map((type) => [type.doc, type.id]));
  const base = docLevel(entry);
  const chain: Record<2 | 3 | 4, Applicability | undefined> = {
    2: undefined,
    3: undefined,
    4: undefined,
  };
  let current: Applicability | undefined;

  for (const block of parsed.blocks) {
    if (block.kind === 'heading') {
      const parent =
        block.depth === 2 ? undefined : block.depth === 3 ? chain[2] : (chain[3] ?? chain[2]);
      const matches = inferEnabled
        ? rules.filter((rule) => rule.re.test(block.text)).map((rule) => rule.appliesTo)
        : [];
      let own = unionRules(matches);
      let source = matches.length > 0 ? 'rule' : '';
      const refType = block.ref ? typeByDoc.get(block.ref) : undefined;
      if (refType) {
        own = mergeApplicability(own, { businessTypes: [refType] });
        source = 'ref';
      }
      const key = `${entry.id}#${block.id}`;
      const override = headingOverrides[key];
      let effective: Applicability | undefined;
      if (override) {
        usedOverrides.add(key);
        effective = compact(override);
        source = 'override';
      } else {
        effective = mergeApplicability(parent, own);
        if (source === '' && effective) source = 'inherited';
      }
      chain[block.depth] = effective;
      if (block.depth === 2) {
        chain[3] = undefined;
        chain[4] = undefined;
      } else if (block.depth === 3) {
        chain[4] = undefined;
      }
      current = effective;
      if (effective) {
        block.appliesTo = effective;
        rows.push({
          doc: entry.id,
          kind: 'heading',
          target: block.id,
          text: block.text,
          appliesTo: formatApplicability(effective),
          source,
        });
      } else {
        delete block.appliesTo;
      }
      continue;
    }
    if (block.kind === 'table') {
      const rowWhen = block.rows.map((row) => {
        const text = row.map((cell) => runsToText(cell)).join(' | ');
        const heading = block.id.split('.')[0] ?? '';
        const matches = rowRules.filter(
          (rule) => (!rule.headings || rule.headings.includes(heading)) && rule.re.test(text),
        );
        return unionRules(matches.map((rule) => rule.appliesTo)) ?? null;
      });
      if (rowWhen.some((value) => value !== null)) {
        block.rowWhen = rowWhen;
        rowWhen.forEach((value, index) => {
          if (!value) return;
          rows.push({
            doc: entry.id,
            kind: 'row',
            target: `${block.id}[${index}]`,
            text: (block.rows[index] ?? [])
              .map((cell) => runsToText(cell))
              .join(' | ')
              .slice(0, 60),
            appliesTo: formatApplicability(value),
            source: 'row',
          });
        });
      } else {
        delete block.rowWhen;
      }
      continue;
    }
    if (block.kind !== 'tasklist') continue;
    for (const task of block.items) {
      const text = runsToText(task.c);
      let when = mergeApplicability(base, current);
      const sources: string[] = [];
      if (current) sources.push('heading');
      for (const prefix of prefixes) {
        if (prefix.re.test(text)) {
          when = mergeApplicability(when, prefix.appliesTo);
          sources.push('prefix');
        }
      }
      const override = taskOverrides[task.id];
      if (override) {
        usedOverrides.add(`task:${task.id}`);
        when = mergeApplicability(when, override);
        sources.push('override');
      }
      if (when) {
        task.when = when;
        rows.push({
          doc: entry.id,
          kind: 'task',
          target: task.id,
          text: text.slice(0, 60),
          appliesTo: formatApplicability(when),
          source: sources.length > 0 ? sources.join('+') : 'doc',
        });
      } else {
        delete task.when;
      }
    }
  }
  return rows;
}

/**
 * Every heading and task override in applicability.json must match something in the corpus.
 * Overrides for documents that were not part of this build are not checked.
 */
export function checkUnusedOverrides(
  config: ContentConfig,
  usedOverrides: ReadonlySet<string>,
  builtDocs: ReadonlySet<string>,
  issues: IssueCollector,
): void {
  for (const key of Object.keys(config.applicability.headings)) {
    const doc = key.split('#')[0] ?? '';
    if (builtDocs.has(doc) && !usedOverrides.has(key)) {
      issues.add(
        'unknown-override',
        `applicability.json heading override "${key}" matches no heading`,
      );
    }
  }
  for (const key of Object.keys(config.applicability.tasks)) {
    const doc = key.split(':')[0] ?? '';
    if (builtDocs.has(doc) && !usedOverrides.has(`task:${key}`)) {
      issues.add('unknown-override', `applicability.json task override "${key}" matches no task`);
    }
  }
}
