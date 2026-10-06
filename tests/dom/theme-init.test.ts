/**
 * `theme-init.js` runs before any module. `data-st-profile` hides My path's empty state until the
 * page's module draws, so it must not be set for a stored value that is not answers (review WP-31
 * pass 1, minor 5; the CSS also reveals the empty state after a second in any case).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_CHOICES, parseProfile, STAGE_CHOICES, TYPE_CHOICES } from '../../src/lib/profile';
import { REPO_ROOT } from '../unit/site/data';

const SOURCE = readFileSync(path.join(REPO_ROOT, 'src', 'scripts', 'theme-init.js'), 'utf8');
const run = (): void => {
  new Function(SOURCE)();
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-st-profile');
});

describe('theme-init and saved answers', () => {
  it('marks the page when answers are saved', () => {
    localStorage.setItem(
      'st.profile.v1',
      JSON.stringify({ entity: 'pty', businessTypes: ['food'], stage: 'trading' }),
    );
    run();
    expect(document.documentElement.hasAttribute('data-st-profile')).toBe(true);
  });

  it.each([['corrupt'], ['null'], ['{"stage":"trading"}']])('not for %s', (value) => {
    localStorage.setItem('st.profile.v1', value);
    run();
    expect(document.documentElement.hasAttribute('data-st-profile')).toBe(false);
  });

  // Review WP-31 pass 3, minor 1: a value the store rejects must not keep the home card's space.
  const SAMPLES = [
    '{"entity":"pty","bad":1}',
    '{"entity":"',
    '{"entity":"pty","businessTypes":[],"stage":"trading"}',
    '{"entity":"pty","businessTypes":["food","food"],"stage":"trading"}',
    '{"entity":"pty","businessTypes":["shoes"],"stage":"trading"}',
    '{"entity":"sole-prop","businessTypes":["food"],"stage":"pty-growing"}',
    '{"entity":"llc","businessTypes":["food"],"stage":"trading"}',
    '{"entity":"pty","businessTypes":"food","stage":"trading"}',
    '{"entity":"pty","businessTypes":["food"],"stage":"later"}',
    '[]',
    '{"entity":"pty","businessTypes":["general","beauty"],"stage":"pty-growing"}',
    '{"entity":"undecided","businessTypes":["general"],"stage":"not-started"}',
  ];
  it.each(SAMPLES)('agrees with parseProfile on %s', (value) => {
    localStorage.setItem('st.profile.v1', value);
    run();
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = null;
    }
    expect(document.documentElement.hasAttribute('data-st-profile')).toBe(
      parseProfile(parsed) !== null,
    );
  });
});

describe('theme-init’s copy of the answer lists', () => {
  it('names every entity, stage and kind of business the profile has', () => {
    for (const value of [...ENTITY_CHOICES, ...STAGE_CHOICES, ...TYPE_CHOICES])
      expect(SOURCE).toMatch(new RegExp(`['\\s]${value}['\\s]`));
  });
});
