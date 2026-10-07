/**
 * What "Find my path" keeps on the device (WP-31), through WP-30's store.
 *
 * | Store      | Key             | Value                                                       |
 * | ---------- | --------------- | ----------------------------------------------------------- |
 * | `profile`  | `st.profile.v1` | `{ entity, businessTypes[], stage }` (`src/lib/profile.ts`) |
 * | `pathDone` | `st.path.v1`    | `{ [docId]: ISO date-time it was marked as read }`          |
 * | `onlyMine` | `st.onlyMine`   | `true` / `false`: "Only what applies to me", default off    |
 * | `pathView` | `st.pathView.v1`| the path built for these answers (`src/lib/path-view.ts`)   |
 *
 * A stored profile that fails the schema (another shape, "Pty Ltd, growing" without a Pty Ltd) is
 * removed and reads as `null`; the store does that (`storage/migrate.ts`, per-key reset).
 *
 * For other packages, read the profile with these and never parse `st.profile.v1` yourself:
 * - `readProfile()`: the profile now, or `null`;
 * - `profileBusinessTypes()`: the reader's six-type ids (General expanded), or `null` (WP-33's
 *   "My business types" search filter);
 * - `profileEntity()`: `sole-prop`, `pty`, `undecided`, or `null` (WP-32 can pre-fill company
 *   fields only for a Pty Ltd).
 * Subscribe to `profile` to follow changes, including from another tab.
 */
import { checks, entriesOf, persistentValue, type PersistentStore } from './store';
import type { PathDone } from './path-engine';
import { pathViewSchema, type PathView } from './path-view';
import * as z from 'zod/mini';
import {
  expandTypes,
  GENERAL_EXPANDS_TO,
  profileSchema,
  type EntityChoice,
  type Profile,
  type TypeId,
} from './profile';

export { storageAvailable } from './store';

export const profile: PersistentStore<Profile | null> = persistentValue<Profile | null>(
  'st.profile.v1',
  profileSchema,
  null,
);

export const pathDone: PersistentStore<PathDone> = persistentValue<PathDone>(
  'st.path.v1',
  entriesOf(z.iso.datetime({ offset: true })),
  {},
);

export const onlyMine: PersistentStore<boolean> = persistentValue<boolean>(
  'st.onlyMine',
  z.boolean(),
  false,
);

/** The path built for the saved answers and content version, so most pages need no rules. */
export const pathView: PersistentStore<PathView | null> = persistentValue<PathView | null>(
  'st.pathView.v1',
  pathViewSchema,
  null,
);

/** The saved profile, or `null` when there is none. */
export function readProfile(): Profile | null {
  return profile.get();
}

/** The reader's business types with General expanded, or `null` without a profile. */
export function profileBusinessTypes(
  general: readonly TypeId[] = GENERAL_EXPANDS_TO,
): TypeId[] | null {
  const current = profile.get();
  return current ? expandTypes(current.businessTypes, general) : null;
}

/** How the reader trades, or `null` without a profile. */
export function profileEntity(): EntityChoice | null {
  return profile.get()?.entity ?? null;
}

/**
 * Removes the answers, the "read" marks and the stored path, and turns "Only what applies to me" off. Checklist
 * ticks stay (`myPath.resetConfirm.body` says so): they record what the reader did, not who they
 * said they were.
 */
export function resetProfile(): void {
  profile.reset();
  pathDone.reset();
  onlyMine.reset();
  pathView.reset();
}

/** Re-exported so a page script needs one import for the ticks and the profile. */
export { checks };
