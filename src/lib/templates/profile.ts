/**
 * The one place the templates read the reader's profile (build plan B3 flow 5: "profile pre-fills
 * business fields").
 *
 * WP-31 HOOK. The wizard and the profile (`st.profile.v1`) are WP-31, built at the same time as
 * the templates. Its profile, as build plan A5 defines it, holds the entity, the business types
 * and the stage; it has no business name or contact details yet. Until it does,
 * `readBusinessDetails()` returns `null` and no field is pre-filled. When the profile carries
 * business details, WP-31 (or whoever merges the two) makes this function read them from the
 * profile store and nothing else changes: the template form calls only this. Tracked in
 * `docs/reviews/backlog.md` ("Templates: pre-fill from the profile").
 */
import type { ProfileKey } from './placeholders';

/** Business details a profile can give: any of the template's profile fields, each optional. */
export type BusinessDetails = Readonly<Partial<Record<ProfileKey, string>>>;

/** The reader's business details, or `null` when there is no profile or it holds none. */
export function readBusinessDetails(): BusinessDetails | null {
  return null;
}
