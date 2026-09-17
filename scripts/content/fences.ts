import type { FenceVariant } from '../../src/lib/content/schema';

export type FenceRule =
  'override' | 'hyphen-rule' | 'box-drawing' | 'doc-default' | 'prompt-heuristic' | 'short';

export interface FenceClassification {
  variant: FenceVariant;
  rule: FenceRule;
}

export interface FenceOptions {
  override?: FenceVariant | undefined;
  docDefault?: FenceVariant | undefined;
  hasPlaceholders: boolean;
}

/**
 * Classifies an untagged fence. First match wins:
 * override → a 20+ hyphen line → box-drawing characters → the doc's default variant →
 * placeholders or an `I ` / `My ` / `Here is` / `Stop.` opening → 3 lines or fewer.
 * Returns `undefined` when nothing matches; the build reports that as an error.
 */
export function classifyFence(
  text: string,
  options: FenceOptions,
): FenceClassification | undefined {
  if (options.override) return { variant: options.override, rule: 'override' };
  if (/^-{20,}\s*$/m.test(text)) return { variant: 'template-preview', rule: 'hyphen-rule' };
  if (/[─-╿]/.test(text)) return { variant: 'listing', rule: 'box-drawing' };
  if (options.docDefault) return { variant: options.docDefault, rule: 'doc-default' };
  if (options.hasPlaceholders || /^(?:I |My |Here is|Stop\.)/.test(text)) {
    return { variant: 'prompt', rule: 'prompt-heuristic' };
  }
  if (text.split('\n').length <= 3) return { variant: 'example', rule: 'short' };
  return undefined;
}

/** Number of 20+ hyphen rule lines, compared by the fidelity check for template previews. */
export function hyphenLineCount(text: string): number {
  return text.split('\n').filter((line) => /^-{20,}\s*$/.test(line)).length;
}
