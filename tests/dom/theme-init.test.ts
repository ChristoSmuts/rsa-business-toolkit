/**
 * `theme-init.js` runs before any module. `data-st-profile` hides My path's empty state until the
 * page's module draws, so it must not be set for a stored value that is not answers (review WP-31
 * pass 1, minor 5; the CSS also reveals the empty state after a second in any case).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
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
});
