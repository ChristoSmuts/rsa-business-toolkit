/**
 * Reading paths (build plan A5, WP-31): checks `content-meta/paths.json` against the corpus and
 * builds `src/data/paths.json`.
 *
 * The rules follow the numbered lists in "How to use this toolkit" (Path 1, 2 and 4). So every step
 * names the list item it comes from, and the build fails when
 * - the source document, a rule's list or a step's item does not exist;
 * - a step names a document or `#anchor` that does not exist;
 * - a step's documents are not the ones its list item links to (a `#anchor` may narrow a link to
 *   one section; `$businessTypes` needs an item that points at the business types);
 * - the checklist parts are not headings of the checklist document.
 *
 * The markdown stays the source of truth: change a path there, and this check says which rule to
 * change with it.
 */
import type { IssueCollector } from './errors';
import { shortHash } from './ids';
import { stableStringify } from './write';
import type { ContentConfig } from './config';
import {
  BUSINESS_TYPES_REF,
  type Block,
  type Doc,
  type InlineRun,
  type Lang,
  type PathsConfig,
  type PathsFile,
} from '../../src/lib/content/schema';

type ListBlock = Extract<Block, { kind: 'list' }>;

/** `core/register#popia` → `{ doc: 'core/register', anchor: 'popia' }`. */
export function splitRef(ref: string): { doc: string; anchor: string | undefined } {
  const hash = ref.indexOf('#');
  return hash === -1
    ? { doc: ref, anchor: undefined }
    : { doc: ref.slice(0, hash), anchor: ref.slice(hash + 1) };
}

/** Every document an item links to (links and document docrefs), and whether it names a section. */
function itemTargets(runs: readonly InlineRun[]): { docs: Set<string>; sections: Set<string> } {
  const docs = new Set<string>();
  const sections = new Set<string>();
  const walk = (list: readonly InlineRun[]): void => {
    for (const run of list) {
      if (run.t === 'link' && 'doc' in run) docs.add(run.doc);
      else if (run.t === 'docref') {
        if ('doc' in run) docs.add(run.doc);
        else sections.add(run.section);
      }
      if ('c' in run && Array.isArray(run.c)) walk(run.c);
    }
  };
  walk(runs);
  return { docs, sections };
}

/** Checks the rules against the English documents. Problems go to `issues` as `paths`. */
export function checkPaths(
  paths: PathsConfig,
  config: ContentConfig,
  docs: readonly Doc[],
  issues: IssueCollector,
): void {
  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  const typeDocs = new Set(config.businessTypes.types.map((type) => type.doc));
  const source = byId.get(paths.source);
  if (!source) {
    issues.add('paths', `paths.json: source document ${paths.source} does not exist`);
    return;
  }
  for (const rule of paths.rules) {
    const list = source.blocks.find(
      (block): block is ListBlock => block.id === rule.list && block.kind === 'list',
    );
    if (!list) {
      issues.add('paths', `paths.json ${rule.stage}: ${rule.list} is not a list in ${source.id}`);
      continue;
    }
    if (!list.ordered)
      issues.add('paths', `paths.json ${rule.stage}: ${rule.list} is not a numbered list`);
    const items = new Set<number>();
    for (const step of rule.steps) {
      const where = `paths.json ${rule.stage} item ${step.item}`;
      if (items.has(step.item)) issues.add('paths', `${where}: used by two steps`);
      items.add(step.item);
      const runs = list.items[step.item];
      if (!runs) {
        issues.add('paths', `${where}: ${rule.list} has ${list.items.length} items`);
        continue;
      }
      const targets = itemTargets(runs);
      const named = new Set<string>();
      for (const ref of step.docs) {
        if (ref === BUSINESS_TYPES_REF) {
          const pointsAtTypes =
            targets.sections.has('business-types') ||
            [...targets.docs].some((doc) => typeDocs.has(doc));
          if (!pointsAtTypes)
            issues.add(
              'paths',
              `${where}: ${BUSINESS_TYPES_REF} but the item names no business type`,
            );
          for (const doc of targets.docs) if (typeDocs.has(doc)) named.add(doc);
          continue;
        }
        const { doc: id, anchor } = splitRef(ref);
        const doc = byId.get(id);
        if (!doc) {
          issues.add('paths', `${where}: ${id} does not exist`);
          continue;
        }
        if (anchor !== undefined && !doc.headings.some((heading) => heading.id === anchor))
          issues.add('paths', `${where}: #${anchor} is not a heading in ${id}`);
        if (!targets.docs.has(id))
          issues.add('paths', `${where}: the list item does not link to ${id}`);
        named.add(id);
      }
      for (const doc of targets.docs) {
        if (!named.has(doc))
          issues.add('paths', `${where}: the list item links to ${doc}, which the step leaves out`);
      }
    }
    if (items.size !== list.items.length)
      issues.add(
        'paths',
        `paths.json ${rule.stage}: ${rule.list} has ${list.items.length} items, the rule covers ${items.size}`,
      );
  }
  const checklist = byId.get(paths.checklist.doc);
  if (!checklist) {
    issues.add('paths', `paths.json checklist: ${paths.checklist.doc} does not exist`);
    return;
  }
  for (const part of paths.checklist.parts) {
    if (!checklist.headings.some((heading) => heading.id === part.heading))
      issues.add(
        'paths',
        `paths.json checklist: #${part.heading} is not a heading in ${checklist.id}`,
      );
  }
}

/** The documents a rule can add to a path, in first-mention order. */
function referencedDocs(paths: PathsConfig, config: ContentConfig): string[] {
  const ids: string[] = [];
  const add = (id: string): void => {
    if (!ids.includes(id)) ids.push(id);
  };
  for (const rule of paths.rules) {
    for (const step of rule.steps) {
      for (const ref of step.docs) {
        if (ref === BUSINESS_TYPES_REF) {
          for (const type of config.businessTypes.types) add(type.doc);
        } else add(splitRef(ref).doc);
      }
    }
  }
  add(paths.checklist.doc);
  return ids;
}

/** `src/data/paths.json`, built from the rules and every language's documents. */
export function buildPathsFile(
  paths: PathsConfig,
  config: ContentConfig,
  langs: readonly { lang: Lang; docs: readonly Doc[] }[],
): PathsFile {
  const english = new Map(
    (langs.find((build) => build.lang === 'en')?.docs ?? []).map((d) => [d.id, d]),
  );
  const docs: PathsFile['docs'] = {};
  for (const id of referencedDocs(paths, config)) {
    const doc = english.get(id);
    if (!doc) continue;
    const titles: Partial<Record<Lang, string>> = {};
    for (const build of langs) {
      const translated = build.docs.find((candidate) => candidate.id === id);
      if (translated) titles[build.lang] = translated.title;
    }
    docs[id] = { route: doc.route, titles, appliesTo: doc.appliesTo };
  }
  const content = {
    source: paths.source,
    rules: paths.rules,
    checklist: paths.checklist,
    businessTypes: [...config.businessTypes.types]
      .sort((a, b) => a.order - b.order)
      .map((type) => ({ id: type.id, doc: type.doc })),
    general: [...config.businessTypes.presets.general.expandsTo],
    docs,
  };
  return { version: 1, hash: shortHash(stableStringify(content)), ...content };
}
