/**
 * A value kept in `sessionStorage` for one page load: written before the browser leaves a page,
 * read once (and removed) on the next. Search uses it to carry "focus this heading" across the page
 * load a result causes (`st.search.arrival`, WP-33).
 *
 * Like the `localStorage` adapter, it never throws: when storage is blocked (some private modes,
 * disabled site data) a read gives `null` and a write does nothing, so the caller simply loses the
 * extra step. It holds no reader data and lives for one page load, so `clearAll()` leaves it alone.
 *
 * With `adapter.ts`, `session-flag.ts` and `store.ts`, this is the only code that touches Web
 * Storage (CLAUDE.md; ESLint enforces it for `localStorage`).
 */

/** A one-page-load value under one `st.` key. */
export interface SessionValue {
  /** The value, removed as it is read; `null` when unset or when storage is blocked. */
  read(win?: Window): string | null;
  /** Stores the value for the next page load; does nothing when storage is blocked. */
  write(value: string, win?: Window): void;
}

export function sessionValue(key: string): SessionValue {
  if (!key.startsWith('st.')) throw new Error(`storage keys start with "st.": ${key}`);
  return {
    read(win: Window = window): string | null {
      try {
        const value = win.sessionStorage.getItem(key);
        win.sessionStorage.removeItem(key);
        return value;
      } catch {
        return null;
      }
    },
    write(value: string, win: Window = window): void {
      try {
        win.sessionStorage.setItem(key, value);
      } catch {
        // Blocked: see above.
      }
    },
  };
}
