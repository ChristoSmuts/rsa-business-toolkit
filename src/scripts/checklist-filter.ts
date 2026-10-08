/*
 * The event `/checklist/`'s "Show" choice sends (`detail`: `all`, `mine` or `not-done`). Its own
 * module, so `applies.ts` can listen for it without loading the checklist elements on pages that
 * have no checklist.
 */
export const FILTER_EVENT = 'st-checklist-filter';
