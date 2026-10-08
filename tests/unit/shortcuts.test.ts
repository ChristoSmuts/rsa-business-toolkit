import { describe, expect, it } from 'vitest';
import { isTypingTarget, matchShortcut, type KeyLike } from '../../src/lib/shortcuts';

const key = (overrides: Partial<KeyLike> & { key: string }): KeyLike => ({
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...overrides,
});

describe('matchShortcut', () => {
  it('maps ? to the shortcuts list while single-key shortcuts are on', () => {
    expect(matchShortcut(key({ key: '?', shiftKey: true }), true)).toBe('help');
  });

  it('ignores ? when single-key shortcuts are off', () => {
    expect(matchShortcut(key({ key: '?', shiftKey: true }), false)).toBeUndefined();
  });

  it('ignores ? with Ctrl, Alt or Meta', () => {
    for (const modifier of ['ctrlKey', 'altKey', 'metaKey'] as const) {
      expect(matchShortcut(key({ key: '?', [modifier]: true }), true)).toBeUndefined();
    }
  });

  it('maps Alt+← and Alt+→ to the pager, whatever the single-key setting', () => {
    expect(matchShortcut(key({ key: 'ArrowLeft', altKey: true }), false)).toBe('previous');
    expect(matchShortcut(key({ key: 'ArrowRight', altKey: true }), true)).toBe('next');
  });

  it('ignores the arrows without Alt, or with another modifier too', () => {
    expect(matchShortcut(key({ key: 'ArrowLeft' }), true)).toBeUndefined();
    expect(
      matchShortcut(key({ key: 'ArrowLeft', altKey: true, ctrlKey: true }), true),
    ).toBeUndefined();
    expect(
      matchShortcut(key({ key: 'ArrowRight', altKey: true, shiftKey: true }), true),
    ).toBeUndefined();
    expect(matchShortcut(key({ key: 'a', altKey: true }), true)).toBeUndefined();
  });

  it('ignores keys already handled or still being composed', () => {
    expect(matchShortcut(key({ key: '?', defaultPrevented: true }), true)).toBeUndefined();
    expect(matchShortcut(key({ key: '?', isComposing: true }), true)).toBeUndefined();
  });

  // WP-33 integration: one handler for every shortcut; `search` opens the search dialog.
  it('maps / (a single key) and Ctrl+K or ⌘K to search', () => {
    expect(matchShortcut(key({ key: '/' }), true)).toBe('search');
    expect(matchShortcut(key({ key: '/' }), false)).toBeUndefined();
    expect(matchShortcut(key({ key: 'k', ctrlKey: true }), false)).toBe('search');
    expect(matchShortcut(key({ key: 'K', metaKey: true }), true)).toBe('search');
    expect(matchShortcut(key({ key: 'k', ctrlKey: true, shiftKey: true }), true)).toBeUndefined();
    expect(matchShortcut(key({ key: 'k', ctrlKey: true, altKey: true }), true)).toBeUndefined();
    expect(matchShortcut(key({ key: '/', altKey: true }), true)).toBeUndefined();
    expect(matchShortcut(key({ key: '/', ctrlKey: true }), true)).toBeUndefined();
  });
});

describe('isTypingTarget outside a browser', () => {
  it('is false when there is no DOM', () => {
    expect(isTypingTarget(null)).toBe(false);
  });
});
