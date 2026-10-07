/**
 * The home card when the path rules fail to load (a dropped request for the lazy `path-data`
 * chunk): it gives back the space kept for it, and a later trigger tries again (review WP-31
 * pass 5, minor 1). The rules module is mocked to fail, so this file never loads it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pathView, profile } from '../../src/lib/profile-store';
import { clearAll } from '../../src/lib/store';
import { StYourPath } from '../../src/scripts/your-path';
import { mount } from './helpers';

vi.mock('../../src/scripts/path-data', () => {
  throw new Error('Failed to fetch dynamically imported module');
});

beforeEach(() => {
  clearAll();
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<st-your-path> when the rules do not load', () => {
  it('marks itself so the kept space goes, and stays hidden', async () => {
    profile.set({ entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' });
    mount(`<st-your-path data-version="v" hidden><p data-progress-text></p></st-your-path>`);
    const card = document.querySelector('st-your-path') as StYourPath;
    expect(card).toBeInstanceOf(StYourPath);
    await card.rebuilt;
    expect(card.hasAttribute('data-path-failed')).toBe(true);
    expect(card.hidden).toBe(true);
    expect(pathView.get()).toBeNull();
  });
});
