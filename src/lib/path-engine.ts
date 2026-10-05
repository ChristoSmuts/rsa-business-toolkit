/**
 * The path engine (build plan A5): which documents a reader should read, in which order, and which
 * parts of a page apply to them.
 *
 * Pure. Every function takes the profile and the data it needs, so the pages (at build time), the
 * client scripts (in the browser) and `tests/unit/path-engine.test.ts` run the same code. It
 * imports types only, never the content schemas, so a client bundle stays small.
 *
 * - `applies(appliesTo, profile)` is the one matching rule, used everywhere: a document, a heading,
 *   a task or a table row applies when its entity is `all`, the reader has not decided, or the
 *   entities are equal, **and** it is for all business types or shares one with the reader.
 * - `buildPath(profile, manifest, paths)` follows the rule for the reader's stage
 *   (`src/data/paths.json`, built from `content-meta/paths.json`).
 */
import type { Applicability, DocAppliesTo, PathCondition, PathsFile } from './content/schema';
import { expandTypes, GENERAL_EXPANDS_TO, type Profile, type TypeId } from './profile';

/** What the engine needs from the manifest (`Manifest` and `PathsFile` both have it). */
export interface PathManifest {
  readonly docs: Readonly<Record<string, { readonly appliesTo: DocAppliesTo }>>;
}

/** The rules and the business-type data from `src/data/paths.json`. */
export type PathRules = Pick<PathsFile, 'source' | 'rules' | 'businessTypes' | 'general'>;

/** A document-level or block-level condition. `undefined` applies to everyone. */
export type AppliesTo = DocAppliesTo | Applicability | undefined;

/** The six-type ids the reader's choices cover (General expanded). */
export function readerTypes(
  profile: Profile,
  general: readonly TypeId[] = GENERAL_EXPANDS_TO,
): TypeId[] {
  return expandTypes(profile.businessTypes, general);
}

/**
 * The A5 matching rule. Tags (`If working from home:`) are not part of the profile, so they never
 * hide anything.
 */
export function applies(
  appliesTo: AppliesTo,
  profile: Profile,
  general: readonly TypeId[] = GENERAL_EXPANDS_TO,
): boolean {
  if (!appliesTo) return true;
  const entity = appliesTo.entity;
  const entityOk =
    entity === undefined ||
    entity === 'all' ||
    profile.entity === 'undecided' ||
    entity === profile.entity;
  if (!entityOk) return false;
  const types = appliesTo.businessTypes;
  if (types === undefined || types === 'all') return true;
  const mine = readerTypes(profile, general);
  return types.some((type) => mine.includes(type));
}

/**
 * Why a part does not apply, for the "Hidden: …" marker: the entity when that is the reason,
 * otherwise the business types. `undefined` when it applies.
 */
export function hiddenReason(
  appliesTo: AppliesTo,
  profile: Profile,
  general: readonly TypeId[] = GENERAL_EXPANDS_TO,
): 'sole-prop' | 'pty' | 'businessTypes' | undefined {
  if (applies(appliesTo, profile, general)) return undefined;
  const entity = appliesTo?.entity;
  if ((entity === 'sole-prop' || entity === 'pty') && profile.entity !== 'undecided') {
    if (entity !== profile.entity) return entity;
  }
  return 'businessTypes';
}

/** A step condition from `paths.json`: every key given must match. */
export function conditionMatches(
  condition: PathCondition | undefined,
  profile: Profile,
  general: readonly TypeId[] = GENERAL_EXPANDS_TO,
): boolean {
  if (!condition) return true;
  if (condition.entity && !condition.entity.includes(profile.entity)) return false;
  if (condition.businessTypes) {
    const mine = readerTypes(profile, general);
    if (!condition.businessTypes.some((type) => mine.includes(type))) return false;
  }
  return true;
}

export interface PathItem {
  readonly doc: string;
  /** A heading to open the document at (`core/tax-and-sars#route-4-…`). */
  readonly anchor?: string | undefined;
}

export interface PathStepResult {
  /** 1-based step number, after steps that do not apply were left out. */
  readonly n: number;
  /** The item of the rule's list in the source document (its wording and its "why"). */
  readonly item: number;
  readonly items: readonly PathItem[];
  /** Whether the source item's "why" fits this reader (`whyWhen`). */
  readonly why: boolean;
}

export interface PathResult {
  readonly stage: Profile['stage'];
  /** The document and list block the steps come from. */
  readonly source: string;
  readonly list: string;
  readonly steps: readonly PathStepResult[];
}

const BUSINESS_TYPES_REF = '$businessTypes';

function splitRef(ref: string): PathItem {
  const hash = ref.indexOf('#');
  return hash === -1 ? { doc: ref } : { doc: ref.slice(0, hash), anchor: ref.slice(hash + 1) };
}

/**
 * The reader's path: the rule for their stage, with `$businessTypes` replaced by their type
 * documents (primary first, General expanded in place), steps whose `when` does not match left
 * out, documents that do not apply to them left out (a sole proprietor never gets "Running a Pty
 * Ltd"), a document only at its first step, and empty steps dropped and the rest renumbered.
 *
 * "Pty Ltd, growing" without a Pty Ltd is not a valid profile; if one arrives anyway, it gets the
 * "already trading" rule rather than a company's path.
 */
export function buildPath(profile: Profile, manifest: PathManifest, paths: PathRules): PathResult {
  const stage =
    profile.stage === 'pty-growing' && profile.entity !== 'pty' ? 'trading' : profile.stage;
  const rule = paths.rules.find((candidate) => candidate.stage === stage);
  if (!rule) throw new Error(`paths.json has no rule for "${stage}"`);
  const typeDocs = readerTypes(profile, paths.general).flatMap((id) => {
    const type = paths.businessTypes.find((candidate) => candidate.id === id);
    return type ? [type.doc] : [];
  });
  const seen = new Set<string>();
  const steps: PathStepResult[] = [];
  for (const step of rule.steps) {
    if (!conditionMatches(step.when, profile, paths.general)) continue;
    const refs = step.docs.flatMap((ref): PathItem[] =>
      ref === BUSINESS_TYPES_REF ? typeDocs.map((doc) => ({ doc })) : [splitRef(ref)],
    );
    const items = refs.filter((item) => {
      const entry = manifest.docs[item.doc];
      if (!entry || seen.has(item.doc)) return false;
      return applies(entry.appliesTo, profile, paths.general);
    });
    if (items.length === 0) continue;
    for (const item of items) seen.add(item.doc);
    steps.push({
      n: steps.length + 1,
      item: step.item,
      items,
      why: conditionMatches(step.whyWhen, profile, paths.general),
    });
  }
  return { stage: rule.stage, source: paths.source, list: rule.list, steps };
}

/** Every document on the path, in order. */
export function pathDocs(path: PathResult): PathItem[] {
  return path.steps.flatMap((step) => step.items);
}

/** The documents before and after `docId` on the path; both absent when it is not on it. */
export function pathNeighbours(
  path: PathResult,
  docId: string,
): { previous: PathItem | undefined; next: PathItem | undefined; onPath: boolean } {
  const docs = pathDocs(path);
  const index = docs.findIndex((item) => item.doc === docId);
  if (index === -1) return { previous: undefined, next: undefined, onPath: false };
  return { previous: docs[index - 1], next: docs[index + 1], onPath: true };
}

/** `{ [docId]: ISO date-time }`: the documents the reader marked as read (`st.path.v1`). */
export type PathDone = Readonly<Record<string, string>>;

/** A step is done when every document in it is marked. */
export function stepDone(step: PathStepResult, done: PathDone): boolean {
  return step.items.every((item) => item.doc in done);
}

export interface PathProgress {
  readonly done: number;
  readonly total: number;
  /** The first step not done yet ("Continue: step 3 of 10"), or `undefined` when all are. */
  readonly next: PathStepResult | undefined;
}

export function pathProgress(path: PathResult, done: PathDone): PathProgress {
  let count = 0;
  let next: PathStepResult | undefined;
  for (const step of path.steps) {
    if (stepDone(step, done)) count++;
    else next ??= step;
  }
  return { done: count, total: path.steps.length, next };
}

/** `done` with every document of `step` marked (or unmarked). Returns the same map when unchanged. */
export function markStep(
  done: PathDone,
  step: PathStepResult,
  value: boolean,
  now: Date = new Date(),
): PathDone {
  const next: Record<string, string> = { ...done };
  let changed = false;
  for (const item of step.items) {
    if (value && !(item.doc in next)) {
      next[item.doc] = now.toISOString();
      changed = true;
    } else if (!value && item.doc in next) {
      delete next[item.doc];
      changed = true;
    }
  }
  return changed ? next : done;
}

/**
 * Reads a part's condition back from the attributes the server wrote (`data-entity`,
 * `data-types`, space-separated), so a client script can call `applies` on any element.
 */
export function appliesFromAttributes(
  entity: string | undefined,
  types: string | undefined,
): Applicability | undefined {
  const out: { entity?: 'sole-prop' | 'pty'; businessTypes?: TypeId[] } = {};
  if (entity === 'sole-prop' || entity === 'pty') out.entity = entity;
  const list = (types ?? '').split(/\s+/).filter(Boolean) as TypeId[];
  if (list.length > 0) out.businessTypes = list;
  return out.entity === undefined && out.businessTypes === undefined ? undefined : out;
}

/** The attributes `appliesFromAttributes` reads, for a server-rendered part. */
export function appliesAttributes(appliesTo: AppliesTo): {
  'data-entity'?: string;
  'data-types'?: string;
} {
  const out: { 'data-entity'?: string; 'data-types'?: string } = {};
  if (!appliesTo) return out;
  if (appliesTo.entity === 'sole-prop' || appliesTo.entity === 'pty')
    out['data-entity'] = appliesTo.entity;
  if (Array.isArray(appliesTo.businessTypes) && appliesTo.businessTypes.length > 0)
    out['data-types'] = appliesTo.businessTypes.join(' ');
  return out;
}
