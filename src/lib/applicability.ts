/**
 * The A5 matching rule and the attributes that carry a part's condition into the page. Kept apart
 * from the path engine (`path-engine.ts`, which re-exports it) because "Only what applies to me"
 * needs only this, and it ships on every document page with something to hide.
 */
import type { Applicability, DocAppliesTo } from './content/schema';
import { expandTypes, GENERAL_EXPANDS_TO, type Profile, type TypeId } from './profile';

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
