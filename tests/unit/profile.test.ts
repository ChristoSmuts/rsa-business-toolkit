import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BUSINESS_TYPE_IDS,
  BusinessTypesFileSchema,
  PROFILE_ENTITIES,
  STAGES,
} from '../../src/lib/content/schema';
import {
  ENTITY_CHOICES,
  expandTypes,
  GENERAL_EXPANDS_TO,
  parseProfile,
  primaryType,
  profileFromQuery,
  profileOf,
  profileQuery,
  resultRoute,
  singleChoices,
  STAGE_CHOICES,
  stageAllowed,
  TYPE_IDS,
  type Profile,
} from '../../src/lib/profile';
import { REPO_ROOT } from './site/data';

const businessTypes = BusinessTypesFileSchema.parse(
  JSON.parse(readFileSync(path.join(REPO_ROOT, 'content-meta', 'business-types.json'), 'utf8')),
);

describe('the client copy of the profile values', () => {
  it('matches the content schema and business-types.json', () => {
    expect([...ENTITY_CHOICES]).toEqual([...PROFILE_ENTITIES]);
    expect([...STAGE_CHOICES]).toEqual([...STAGES]);
    expect([...TYPE_IDS]).toEqual([...BUSINESS_TYPE_IDS]);
    expect([...GENERAL_EXPANDS_TO]).toEqual(businessTypes.presets.general.expandsTo);
  });
});

describe('parseProfile', () => {
  const valid: Profile = {
    entity: 'pty',
    businessTypes: ['food', 'general'],
    stage: 'pty-growing',
  };

  it('accepts the A5 shape', () => {
    expect(parseProfile(valid)).toEqual(valid);
    expect(
      parseProfile({ entity: 'undecided', businessTypes: ['general'], stage: 'not-started' }),
    ).not.toBeNull();
  });

  it('rejects anything else', () => {
    expect(parseProfile(null)).toBeNull();
    expect(parseProfile({ ...valid, entity: 'cc' })).toBeNull();
    expect(parseProfile({ ...valid, businessTypes: [] })).toBeNull();
    expect(parseProfile({ ...valid, businessTypes: ['food', 'food'] })).toBeNull();
    expect(parseProfile({ ...valid, businessTypes: ['farming'] })).toBeNull();
    expect(parseProfile({ ...valid, stage: 'retired' })).toBeNull();
  });

  it('rejects “Pty Ltd, growing” without a Pty Ltd', () => {
    expect(parseProfile({ ...valid, entity: 'sole-prop' })).toBeNull();
    expect(parseProfile({ ...valid, entity: 'undecided' })).toBeNull();
    expect(stageAllowed('pty-growing', 'pty')).toBe(true);
    expect(stageAllowed('pty-growing', undefined)).toBe(false);
    expect(stageAllowed('trading', 'sole-prop')).toBe(true);
  });
});

describe('the query string', () => {
  it('round-trips a profile with several types, in order', () => {
    const profile: Profile = {
      entity: 'sole-prop',
      businessTypes: ['beauty', 'general'],
      stage: 'trading',
    };
    const query = profileQuery(profile);
    expect(query).toBe('entity=sole-prop&type=beauty&type=general&stage=trading');
    expect(profileFromQuery(new URLSearchParams(query))).toEqual(profile);
  });

  it('drops a repeated type and refuses an incomplete answer', () => {
    expect(
      profileFromQuery(new URLSearchParams('entity=pty&type=food&type=food&stage=trading')),
    ).toEqual({ entity: 'pty', businessTypes: ['food'], stage: 'trading' });
    expect(profileFromQuery(new URLSearchParams('entity=pty&stage=trading'))).toBeNull();
    expect(profileFromQuery(new URLSearchParams(''))).toBeNull();
  });
});

describe('types', () => {
  it('expands General in place and keeps the first choice first', () => {
    expect(expandTypes(['food', 'general', 'services-trades'], GENERAL_EXPANDS_TO)).toEqual([
      'food',
      'retail-online',
      'services-trades',
      'professional-creative',
    ]);
  });

  it('has a primary type unless the first choice was General', () => {
    expect(
      primaryType({ entity: 'pty', businessTypes: ['beauty', 'food'], stage: 'trading' }),
    ).toBe('beauty');
    expect(
      primaryType({ entity: 'pty', businessTypes: ['general', 'food'], stage: 'trading' }),
    ).toBeUndefined();
  });
});

describe('the pre-rendered no-JavaScript results', () => {
  const choices = singleChoices();

  it('are every entity × one type or General × allowed stage: 49', () => {
    expect(choices).toHaveLength(3 * 7 * 2 + 7);
    expect(new Set(choices.map((choice) => resultRoute('find-my-path/', choice))).size).toBe(49);
    expect(
      choices.filter((choice) => choice.stage === 'pty-growing').every((c) => c.entity === 'pty'),
    ).toBe(true);
  });

  it('each one is a valid profile with one kind of business', () => {
    for (const choice of choices) {
      const profile = profileOf(choice);
      expect(parseProfile(profile)).toEqual(profile);
    }
    expect(resultRoute('find-my-path/', choices[0]!)).toBe(
      'find-my-path/result/sole-prop/vehicle-dealer/not-started/',
    );
  });
});
