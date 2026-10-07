/**
 * The reader's answers to "Find my path" (build plan A5, B3 flow 1): how they trade, their kinds
 * of business, and where they are now.
 *
 * Pure and small enough for every page: no schema library at all (the top bar reads the profile on
 * every page, so a hand-written check costs a few hundred bytes where a `zod/mini` object, array and
 * refinements cost about 1.4 KB gzipped; review WP-31 pass 1, major 1). The value lists repeat
 * `PROFILE_ENTITIES`, `STAGES` and `BUSINESS_TYPE_IDS` from `src/lib/content/schema.ts`;
 * `tests/unit/profile.test.ts` keeps them equal.
 *
 * The stored value is `st.profile.v1` (`src/lib/profile-store.ts`). Without JavaScript the same
 * answers travel as a query string (`profileFromQuery`, `profileQuery`).
 */
import type { Schema } from './storage/migrate';

export const ENTITY_CHOICES = ['sole-prop', 'pty', 'undecided'] as const;
export type EntityChoice = (typeof ENTITY_CHOICES)[number];

export const STAGE_CHOICES = ['not-started', 'trading', 'pty-growing'] as const;
export type StageChoice = (typeof STAGE_CHOICES)[number];

export const TYPE_IDS = [
  'vehicle-dealer',
  'food',
  'beauty',
  'retail-online',
  'services-trades',
  'professional-creative',
] as const;
export type TypeId = (typeof TYPE_IDS)[number];

/** "General: I sell or do many things" expands to the three lighter types (`business-types.json`). */
export const GENERAL = 'general';
export const TYPE_CHOICES = [...TYPE_IDS, GENERAL] as const;
/** `presets.general.expandsTo` in `content-meta/business-types.json` (a unit test keeps them equal). */
export const GENERAL_EXPANDS_TO: readonly TypeId[] = [
  'retail-online',
  'services-trades',
  'professional-creative',
];
export type TypeChoice = (typeof TYPE_CHOICES)[number];

/**
 * A5: `{ entity, businessTypes[], stage }`. `businessTypes` is in the order the reader chose them
 * and the first is the primary type; it may hold `general`. "Pty Ltd, growing" needs a Pty Ltd.
 */
export interface Profile {
  readonly entity: EntityChoice;
  readonly businessTypes: readonly TypeChoice[];
  readonly stage: StageChoice;
}

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value);

/** A valid profile, or `null`: the A5 shape, each type once, "Pty Ltd, growing" only for a Pty Ltd. */
export function parseProfile(value: unknown): Profile | null {
  if (typeof value !== 'object' || value === null) return null;
  const { entity, businessTypes, stage } = value as Record<string, unknown>;
  if (!isOneOf(ENTITY_CHOICES, entity) || !isOneOf(STAGE_CHOICES, stage)) return null;
  if (!Array.isArray(businessTypes) || businessTypes.length === 0) return null;
  const types: TypeChoice[] = [];
  for (const type of businessTypes as unknown[]) {
    if (!isOneOf(TYPE_CHOICES, type) || types.includes(type)) return null;
    types.push(type);
  }
  if (stage === 'pty-growing' && entity !== 'pty') return null;
  return { entity, businessTypes: types, stage };
}

/** `parseProfile` in the shape the store takes (`persistentValue`). */
export const profileSchema: Schema<Profile> = {
  safeParse(data) {
    const profile = parseProfile(data);
    return profile ? { success: true, data: profile } : { success: false };
  },
};

/** Whether "Pty Ltd, growing" may be chosen with this entity. */
export function stageAllowed(stage: StageChoice, entity: EntityChoice | undefined): boolean {
  return stage !== 'pty-growing' || entity === 'pty';
}

/** Query names the wizard form uses (also the no-JavaScript form). */
export const QUERY = { entity: 'entity', type: 'type', stage: 'stage' } as const;

/** Answers from a query string (`?entity=pty&type=food&type=beauty&stage=trading`), or `null`. */
export function profileFromQuery(params: URLSearchParams): Profile | null {
  const types: string[] = [];
  for (const type of params.getAll(QUERY.type)) if (!types.includes(type)) types.push(type);
  return parseProfile({
    entity: params.get(QUERY.entity),
    businessTypes: types,
    stage: params.get(QUERY.stage),
  });
}

/** The query string for a profile, without the `?`. */
export function profileQuery(profile: Profile): string {
  const params = new URLSearchParams();
  params.set(QUERY.entity, profile.entity);
  for (const type of profile.businessTypes) params.append(QUERY.type, type);
  params.set(QUERY.stage, profile.stage);
  return params.toString();
}

/**
 * The six-type ids a profile covers, in the reader's order, with General expanded in place to
 * `general` (from `src/data/paths.json`). Duplicates are dropped.
 */
export function expandTypes(
  businessTypes: readonly TypeChoice[],
  general: readonly TypeId[],
): TypeId[] {
  const out: TypeId[] = [];
  for (const choice of businessTypes) {
    for (const id of choice === GENERAL ? general : [choice]) if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** The primary type: the first one chosen, unless that was General (then there is none). */
export function primaryType(profile: Profile): TypeId | undefined {
  const first = profile.businessTypes[0];
  return first === undefined || first === GENERAL ? undefined : first;
}

/** One pre-rendered no-JavaScript result: one entity, one type choice, one allowed stage. */
export interface SingleChoice {
  readonly entity: EntityChoice;
  readonly type: TypeChoice;
  readonly stage: StageChoice;
}

/**
 * Every combination the wizard can send without JavaScript (one kind of business), in a stable
 * order: entity, then type choice, then stage. "Pty Ltd, growing" only with a Pty Ltd, so 49.
 */
export function singleChoices(): SingleChoice[] {
  const out: SingleChoice[] = [];
  for (const entity of ENTITY_CHOICES) {
    for (const type of TYPE_CHOICES) {
      for (const stage of STAGE_CHOICES) {
        if (stageAllowed(stage, entity)) out.push({ entity, type, stage });
      }
    }
  }
  return out;
}

/** The site-relative route of a no-JavaScript result page (`find-my-path/result/pty/food/trading/`). */
export function resultRoute(wizardRoute: string, choice: SingleChoice): string {
  return `${wizardRoute}result/${choice.entity}/${choice.type}/${choice.stage}/`;
}

export function profileOf(choice: SingleChoice): Profile {
  return { entity: choice.entity, businessTypes: [choice.type], stage: choice.stage };
}
