/**
 * Which words the D5 trust notice uses (ADR 0006, build plan D5).
 *
 * The choice is a pure function of the document's own `verification` record and of whether the
 * page lists sources of its own, so it can be tested without rendering anything, and so no page
 * can invent a different sentence.
 *
 * The rule that matters: **"checked by a named human expert" is reserved for a real named human.**
 * The schema already refuses a `human-verified` record without a name, but a renderer that
 * trusted the status alone would credit a review that did not happen the moment a hand-written
 * or future record slipped through. So the name is checked here as well, with the same
 * `namesAPerson` test the schema uses, and a nameless `human-verified` record falls back to the
 * AI-checked wording rather than showing "Checked by".
 */
import type { TranslationKey } from '../../i18n';
import { namesAPerson, type Verification } from './schema';

export interface TrustNotice {
  /** The notice sentence: who checked the page, against what, and on which date. */
  readonly bodyKey: TranslationKey;
  /** The status, as words next to the badge. */
  readonly statusKey: TranslationKey;
  /** The one-sentence explanation of what that status means. */
  readonly meansKey: TranslationKey;
  /** Lucide icon for the status badge. */
  readonly icon: string;
  /** Empty unless a named human reviewed the page. */
  readonly reviewer: string;
  /** True when the page shows its own sources, which changes what the sentence points at. */
  readonly hasPageSources: boolean;
  /** True when the notice credits a named person. */
  readonly humanChecked: boolean;
}

/** A `human-verified` record that really names a person. */
export function isHumanVerified(verification: Verification): boolean {
  return verification.status === 'human-verified' && namesAPerson(verification.reviewedBy);
}

export function trustNotice(verification: Verification, hasPageSources: boolean): TrustNotice {
  const human = isHumanVerified(verification);
  const bodyKey = human
    ? hasPageSources
      ? 'trust.aiNotice.bodyHumanChecked'
      : 'trust.aiNotice.bodyHumanCheckedNoPageSources'
    : hasPageSources
      ? 'trust.aiNotice.body'
      : 'trust.aiNotice.bodyNoPageSources';
  return {
    bodyKey,
    statusKey: human ? 'trust.status.humanChecked' : 'trust.status.aiChecked',
    meansKey: human ? 'trust.status.humanCheckedMeans' : 'trust.status.aiCheckedMeans',
    icon: human ? 'lucide:user-check' : 'lucide:bot',
    reviewer: human ? (verification.reviewedBy ?? '') : '',
    hasPageSources,
    humanChecked: human,
  };
}

/** True when the document has at least one source of its own (register entry or Act). */
export function hasOwnSources(sources: {
  entries: readonly string[];
  acts: readonly string[];
}): boolean {
  return sources.entries.length + sources.acts.length > 0;
}
