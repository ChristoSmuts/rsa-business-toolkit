/**
 * Build-time helpers for the pages WP-31 adds or personalises: the wizard's result pages, My path
 * and the document pages. Pure, so `tests/unit/path-pages.test.ts` checks them without Astro.
 */
import { appliesAttributes, type PathResult, type PathRules } from './path-engine';
import { plainText } from './content/render';
import { QUERY, singleChoices, type SingleChoice } from './profile';
import type { Block, Doc } from './content/schema';

const EM_DASH = ' — ';

/**
 * Why a step is on the path: the words after the em dash in its item of the "Choose your path"
 * list ("Core: start here — the order to do things"), or, in an item without one, the words
 * before its first link ("If you decide yes, Running a Pty Ltd and …" gives "If you decide yes";
 * review WP-31 pass 2, nit 3) or, when it starts with its link, the words after its last link
 * ("Register: what you actually need, specifically the POPIA section"; pass 3, nit 1). The markdown says it, in every language, so the page never invents
 * a reason. `undefined` when the item gives none.
 */
export function stepWhy(source: Doc, listId: string, item: number): string | undefined {
  const list = source.blocks.find(
    (block): block is Extract<Block, { kind: 'list' }> =>
      block.id === listId && block.kind === 'list',
  );
  const runs = list?.items[item];
  const text = plainText(runs);
  const at = text.indexOf(EM_DASH);
  if (at === -1) {
    const list = runs ?? [];
    const first = list.findIndex((run) => run.t === 'link');
    if (first === -1) return undefined;
    const tidy = (words: string): string | undefined => {
      const out = words
        .trim()
        .replace(/^[,:;]\s*/, '')
        .replace(/\s*[,:;]$/, '')
        .trim();
      return out === '' ? undefined : out;
    };
    // "If you decide yes, [Running a Pty Ltd] and …": the words before the first link.
    if (first > 0) return tidy(plainText(list.slice(0, first)));
    // "[Register: …], specifically the POPIA section": the words after the last link (pass 3, nit 1).
    const last = list.map((run) => run.t).lastIndexOf('link');
    return tidy(plainText(list.slice(last + 1)));
  }
  const why = text.slice(at + EM_DASH.length).trim();
  return why === '' ? undefined : why;
}

/** Whether "Only what applies to me" can hide anything on this document. */
export function docHasConditions(doc: Pick<Doc, 'blocks'>): boolean {
  const has = (value: Parameters<typeof appliesAttributes>[0]): boolean =>
    Object.keys(appliesAttributes(value)).length > 0;
  return doc.blocks.some((block) => {
    if (block.kind === 'heading') return has(block.appliesTo);
    if (block.kind === 'tasklist') return block.items.some((task) => has(task.when));
    if (block.kind === 'table') return (block.rowWhen ?? []).some((row) => has(row ?? undefined));
    return false;
  });
}

/** One step card My path renders for every rule, so a script only shows and orders them. */
export interface StepCard {
  readonly stage: string;
  readonly item: number;
  /** Every document the step can hold: for `$businessTypes`, all six type documents. */
  readonly docs: readonly { readonly doc: string; readonly anchor?: string | undefined }[];
}

/** Every step of every rule, as cards (`stage` + `item` identify a card). */
export function allStepCards(paths: PathRules): StepCard[] {
  return paths.rules.flatMap((rule) =>
    rule.steps.map((step) => ({
      stage: rule.stage,
      item: step.item,
      docs: step.docs.flatMap((ref) => {
        if (ref === '$businessTypes') return paths.businessTypes.map((type) => ({ doc: type.doc }));
        const hash = ref.indexOf('#');
        return hash === -1
          ? [{ doc: ref }]
          : [{ doc: ref.slice(0, hash), anchor: ref.slice(hash + 1) }];
      }),
    })),
  );
}

/** The cards of one path, in order, for a page rendered for one known profile. */
export function resultCards(path: PathResult): StepCard[] {
  return path.steps.map((step) => ({ stage: path.stage, item: step.item, docs: step.items }));
}

/** The master checklist's blocks from each listed part's heading to the next `##`. */
export function checklistPartBlocks(
  doc: Pick<Doc, 'blocks'>,
  headings: readonly string[],
): Block[] {
  const out: Block[] = [];
  let inPart = false;
  for (const block of doc.blocks) {
    if (block.kind === 'heading' && block.depth === 2 && !block.pseudo) {
      inPart = headings.includes(block.id);
    }
    if (inPart && block.kind !== 'hr') out.push(block);
  }
  return out;
}

/** A business-type document's own checklists (the "Your checklist" tier). */
export function docTaskLists(doc: Pick<Doc, 'blocks'>): Extract<Block, { kind: 'tasklist' }>[] {
  return doc.blocks.filter(
    (block): block is Extract<Block, { kind: 'tasklist' }> => block.kind === 'tasklist',
  );
}

/** The id of a wizard answer's input (`wz-entity-pty`). */
export function wizardInputId(name: string, value: string): string {
  return `wz-${name}-${value}`;
}

/** The key of a no-JavaScript result button (`pty/food/trading`). */
export function resultKey(choice: SingleChoice): string {
  return `${choice.entity}/${choice.type}/${choice.stage}`;
}

/**
 * The wizard's no-JavaScript CSS (`Wizard.astro`): of the 49 result buttons, show the one whose
 * answers are checked; hide "Choose an answer first." once one shows; and say why "Pty Ltd,
 * growing" leads nowhere without a Pty Ltd. Only while `<st-wizard>` is not ready (`data-ready`),
 * which is always without JavaScript and, with it, until the wizard's script has run (WP-50a), and
 * only where the browser has `:has()`: elsewhere the list of every result page
 * (`.st-wizard__fallback`) is the way on.
 */
export function wizardNoJsCss(): string {
  const checked = (name: string, value: string): string =>
    `:has(#${wizardInputId(name, value)}:checked)`;
  const rules = singleChoices().map((choice) => ({
    key: resultKey(choice),
    form:
      `st-wizard:not([data-ready]) .st-wizard__form${checked(QUERY.entity, choice.entity)}` +
      `${checked(QUERY.type, choice.type)}${checked(QUERY.stage, choice.stage)}`,
  }));
  const ptyMismatch =
    `st-wizard:not([data-ready]) .st-wizard__form${checked(QUERY.stage, 'pty-growing')}` +
    `:not(${checked(QUERY.entity, 'pty')})`;
  return [
    // Where `:has()` works, ask for an answer and hide the list of every result (review WP-31
    // pass 1, major 2). Where it does not, none of these rules apply, so the list stays.
    '@supports selector(:has(*)){st-wizard:not([data-ready]) .st-wizard__incomplete{display:block}' +
      'st-wizard:not([data-ready]) .st-wizard__fallback{display:none}}',
    ...rules.map(
      (rule) => `${rule.form} .st-wizard__result[data-result="${rule.key}"]{display:inline-flex}`,
    ),
    `${rules.map((rule) => `${rule.form} .st-wizard__incomplete`).join(',')}{display:none}`,
    `${ptyMismatch} .st-wizard__pty-only{display:block}`,
    `${ptyMismatch} .st-wizard__incomplete{display:none}`,
  ].join('\n');
}
