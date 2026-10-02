# WP-30: the store and the shared interactive pieces

Status: brief, ready to start. WP-20 is on `main`.

Read first: `CLAUDE.md`, `docs/build-plan.md` B2, B3 (flows 2, 6, 7, 8), C2 and D4, `docs/design-system.md`, `docs/i18n.md`, `docs/testing.md`.

WP-31 (wizard and My path) and WP-32 (fillable templates) start from what this package provides, so the store's API is part of the deliverable. Keep it small and documented.

## What already exists

- Server-rendered checklists (`src/components/content/TaskListBlock.astro`): real checkboxes carrying the pipeline's task id, the same id `/checklist/` uses. The first checklist on a page says ticks are not saved while `CHECKLIST_SAVES` is `false` (`src/lib/routes.ts`).
- Prompts (`src/components/content/CodeBlock.astro`): the prompt text with placeholders marked. No copy button yet.
- The table of contents (`src/components/navigation/TableOfContents.astro`): a `<details>` under the header and a column at ≥1280px, plain anchors.
- The theme control (`src/scripts/theme-control.ts`, `src/scripts/theme-init.js`): reads and writes `st.theme` with `localStorage` directly. Its comment asks this package to move it behind the store.
- The About page has the settings and shortcuts headings and their strings (`about.settings.*`, `about.shortcuts.*`).
- Strings already in both dictionaries: `prompts.*`, `checklist.*`, `storage.*`, `lang.continueBanner.*`, `about.settings.*`. Add a key only when none fits, in both files.
- `nanostores` and `@nanostores/persistent` are already dependencies; `happy-dom` is set up as the `dom` Vitest project (`tests/dom/**`).

## Build

1. **Store** (`src/lib/store.ts`, `src/lib/storage/`):
   - `src/lib/storage/migrate.ts`: `SCHEMA_VERSION`, `st.meta.v1 = {schema, createdAt}`, forward migrations, per-key reset when JSON is corrupt or fails its schema (Zod), and `clearAll()` that removes every `st.` key and nothing else.
   - A storage adapter that survives `localStorage` throwing (private mode, quota, disabled). When it throws, the store keeps working in memory for the session and exposes `storageAvailable` so the UI can show `storage.unavailable`.
   - A helper for a typed persistent JSON value (key, Zod schema, default) that WP-31 uses for `st.profile.v1` and WP-32 for `st.template.<id>.v1`. Do not define the profile or template shapes here.
   - Stores this package owns: `checks` (`st.checks.v1`, `{[taskId]: ISO date}`), `theme` (`st.theme`), `lang` (`st.lang`), `promptsCopied` (`st.prompts.v1`), `shortcuts` (`st.shortcuts`, on by default), `lowData` (`st.lowData`), `seenVersion` (`st.seenVersion`).
   - Values written in one tab show up in another (`storage` event).
2. **Theme:** move `theme-control.ts` onto the store. `theme-init.js` stays a tiny blocking script that reads `st.theme` before paint (it may keep its direct read, as the one documented exception, because it must run before any module loads). Remove `src/scripts/**` from the ESLint `localStorage` allow-list if nothing else there needs it.
3. **Checklists** (`<st-checklist>`): ticks persist by task id on document pages and on `/checklist/`; a tick on one page shows on the other. Group progress and the page's progress update from the store. Storage failure shows the notice and ticks still work for the session. Without JavaScript the boxes still tick and the existing not-saved line stays (in a `<noscript>` or a class the script removes). Flip `CHECKLIST_SAVES` and make every place that reads it right for both values. `/checklist/` gets the reset button with a confirm dialog (`checklist.resetDialog.*`) and "Not done yet" filtering. The "Only mine" filter needs the profile, so leave it to WP-31.
4. **Copy buttons** (`<st-copy>`) on prompts only: Copy → "Copied" with a polite live announcement, the whole prompt with its line breaks on the clipboard, and a select-the-text fallback when the clipboard API fails. The button is added by script or hidden without it, so no dead button shows without JavaScript. Record copied prompts in `promptsCopied`. "Fill from my profile" is WP-31.
5. **Table of contents** (`<st-toc>`): scroll-spy marks the current section (`aria-current="location"`) in the column; a current-section pill below 1280px. Respect `prefers-reduced-motion`. The anchors keep working without JavaScript and with the sticky top bar (WP-20 pass 3 and its e2e tests).
6. **About, settings and shortcuts** (`<st-clear-data>`, toggles): clear-my-data with a confirm dialog that calls `clearAll()` and says it is done; shortcuts on/off; low data on/off (disables web fonts through a class on `<html>`). Shortcuts this package owns: `?` (go to the shortcuts list), Alt+← and Alt+→ (pager previous and next), Escape (close the open dialog or menu). `/` and Ctrl+K belong to WP-33; give it a documented way to check the shortcuts setting. Never fire a shortcut while focus is in a field.
7. **Language banner:** on a visit to the English home page when `st.lang` is `af`, show "Gaan voort in Afrikaans" (`lang.continueBanner.*`) with the action, stay and dismiss. Never redirect. Choosing a language in the switcher saves `st.lang`.

Every element follows C2: the constructor does nothing, `connectedCallback` reads the store and wires listeners, `disconnectedCallback` removes them, no markup Astro did not render (except the copy button and live-region text), explicit keyboard handling. Interactive JS on a document page stays under 25 KB gzipped; measure it and record the number in `docs/testing.md`.

## Tests

- Unit (`tests/unit/`): migrations, corrupt-key reset, `clearAll`, the adapter with a throwing `localStorage`, every pure helper. Coverage of `src/lib/store.ts` and `src/lib/storage/**` at least 90% (add the floor to `vitest.config.ts`).
- Dom (`tests/dom/`): each element connects and disconnects cleanly, round-trips through the store, and handles the keyboard.
- E2e (`tests/e2e/interactive.spec.ts` or similar): tick on a doc page, reload, see it on `/checklist/`; reset; copy a prompt and read the clipboard; scroll-spy marks the right heading; clear data empties every `st.` key; storage throwing still lets you tick; the language banner. The `nojs` project must stay green.
- `pnpm test:a11y` with each dialog open.

## Definition of done

- `pnpm gate:fast` green, pasted verbatim.
- `pnpm build` green (link audit and `dist:trust` included).
- Playwright chromium, mobile and nojs green. WebKit is not installed in the cloud container; say so in the hand-over and leave it on the merge checklist.
- `pnpm test:a11y` green.
- `docs/design-system.md`, `docs/testing.md` and the store's own doc comment describe the API WP-31 and WP-32 use.
- Two consecutive clean review passes (D4). This package touches `src/lib`, so the second pass is by a different reviewer instance.

## Out of scope

The profile shape, the wizard, My path and "Fill from my profile" (WP-31). Template drafts (WP-32). Search, `/` and Ctrl+K (WP-33). Afrikaans content (WP-40).
