import { beforeEach, describe, expect, it } from 'vitest';
import {
  onlyMine,
  pathDone,
  profile,
  profileBusinessTypes,
  profileEntity,
  readProfile,
  resetProfile,
} from '../../src/lib/profile-store';
import { checks, clearAll, setChecked } from '../../src/lib/store';

beforeEach(() => {
  clearAll();
  localStorage.clear();
});

describe('the profile store (st.profile.v1)', () => {
  it('reads nothing on a first visit, and writes nothing', () => {
    expect(readProfile()).toBeNull();
    expect(profileBusinessTypes()).toBeNull();
    expect(profileEntity()).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('gives other packages the profile, its types with General expanded, and its entity', () => {
    profile.set({ entity: 'pty', businessTypes: ['food', 'general'], stage: 'trading' });
    expect(readProfile()).toEqual({
      entity: 'pty',
      businessTypes: ['food', 'general'],
      stage: 'trading',
    });
    expect(profileBusinessTypes()).toEqual([
      'food',
      'retail-online',
      'services-trades',
      'professional-creative',
    ]);
    expect(profileEntity()).toBe('pty');
    expect(JSON.parse(localStorage.getItem('st.profile.v1') ?? 'null')).toEqual(readProfile());
  });

  it('removes a stored profile that is not valid', () => {
    // "Pty Ltd, growing" without a Pty Ltd, written by another tab.
    localStorage.setItem(
      'st.profile.v1',
      JSON.stringify({ entity: 'sole-prop', businessTypes: ['food'], stage: 'pty-growing' }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: 'st.profile.v1' }));
    expect(readProfile()).toBeNull();
    expect(localStorage.getItem('st.profile.v1')).toBeNull();
  });

  it('resetProfile removes the answers, the read marks and the switch, and keeps the ticks', () => {
    profile.set({ entity: 'pty', businessTypes: ['food'], stage: 'trading' });
    pathDone.set({ 'core/register': '2026-10-01T10:00:00.000Z' });
    onlyMine.set(true);
    setChecked('core/register:1a2b3c4d', true);
    resetProfile();
    expect(readProfile()).toBeNull();
    expect(pathDone.get()).toEqual({});
    expect(onlyMine.get()).toBe(false);
    expect(Object.keys(checks.get())).toEqual(['core/register:1a2b3c4d']);
    expect(Object.keys(localStorage).sort()).toEqual(['st.checks.v1', 'st.meta.v1']);
  });

  it('keeps only read marks that are dates', () => {
    localStorage.setItem(
      'st.path.v1',
      JSON.stringify({ 'core/register': '2026-10-01T10:00:00.000Z', 'core/vehicles': 'yesterday' }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: 'st.path.v1' }));
    expect(pathDone.get()).toEqual({ 'core/register': '2026-10-01T10:00:00.000Z' });
  });
});
