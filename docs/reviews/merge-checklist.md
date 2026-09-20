# Merge checklist

Tasks the orchestrator committed to doing when work packages merge into `main`. Tick each one when done and note the commit.

> The content-pipeline conflicts below are resolved and merged (`78d3437`, `22e14b0`). The `astro.config.ts` one is still open. Re-check the remaining two branches against `main` at `22e14b0` before merging, since the corpus merge moved `main` a long way.

## Known merge conflicts (re-checked 2026-09-17 against `main` at `3781d6d` with `git merge-tree`)

Every conflict below is additive: both sides append to the same region and neither contradicts the other. None needs a judgement call about behaviour.

- `astro.config.ts`: WP-22a only. WP-22a replaced the inline `normaliseBase` with `import { normaliseBase } from './scripts/base-path'` (shared with `playwright.config.ts`, review nit n4). `main` added `import { DEFAULT_LOCALE, ENABLED_LOCALES, sitemapLocales } from './src/i18n/locales'` and uses them in `i18n` and the sitemap. Resolution: keep both imports, delete the inline function, keep main's locale wiring. Re-check after WP-11 merges — WP-11 also edits this file (`assetsInlineLimit` function form, `assetFileNames`), though it merges clean today.
- `package.json`: WP-10 only, on `gate:fast`. WP-10 also adds the `content:*` and `translate:status` scripts, which main does not have. Resolution: keep all of WP-10's new scripts, and combine the gate line as `pnpm lint && pnpm typecheck && tsc --noEmit -p . && pnpm test && pnpm content:drift && pnpm test:content` (main contributes `tsc --noEmit -p .`, WP-10 contributes `content:drift`).
- `docs/reviews/backlog.md`: WP-10 only. Main's table is header-only; the WP-10 branch carries six rows (three WP-12 rows plus WP-10 m1, n6 and the m2 residue). Resolution: take the branch's rows wholesale.
- WP-11 merges clean against `main` with no conflicts at all.

Merge order does not matter for correctness, but merging WP-11 last means re-running `git merge-tree` for `astro.config.ts` after WP-22a lands.

## When WP-22a (test harness) merges

**Merged as `fd8bbe7` on 2026-09-20** after clean passes 5 (Reviewer U) and 6 (Reviewer W), plus an integration round against the merged content pipeline and design system. `pnpm gate:fast` green on `main`.

- [x] Switch `tests/e2e/smoke.spec.ts` to import `test` and `expect` from `tests/e2e/fixtures.ts`, and remove its entry from `KNOWN_DIRECT_PLAYWRIGHT_IMPORTS` in `tests/unit/e2e-harness.test.ts`. — done in the integration round; the list (renamed `KNOWN_UNGUARDED_SPECS`) is now empty and a unit test asserts it stays empty.
- [x] Check that `pnpm test` passes after the merge; the "no direct `@playwright/test` import" check must stay green. — 808 unit and dom tests green on `main`.

## When WP-11 (design system) merges

**Merged as `337ae26` on 2026-09-18** after clean passes 5 (Reviewer S) and 6 (Reviewer V). Gate green on merged `main`: lint, typecheck, `tsc --noEmit -p .`, 681 unit and dom tests, 32 content tests, no drift, build complete. Its own Playwright suite was 91 passed / 2 skipped at review. Two minors deferred to `backlog.md` (the 13 blind grid caps, and the WebKit `<select>` overflow).

Superseded on 2026-09-16. Pass 3 was NOT clean: it rated the `Badge` no-wrap overflow a major (a 38-character Afrikaans label makes a 320px page 336px wide, a WCAG 1.4.10 reflow failure), so the diff had to change anyway. Every item below was folded into the WP-11 fix round on branch `worktree-agent-a2273231b664d89f3` instead of a separate WP-11b package, together with the pass-3 findings and the D5 AI-notice and sources demos. The package now needs two fresh consecutive clean passes. Kept here for the record:

- [ ] `Icon` inside prose: `.st-icon { display: inline-block; vertical-align: -0.125em }`; the global `svg { display: block }` rule must not break inline icons in error messages.
- [ ] `Badge` must wrap, so long Afrikaans labels never cause horizontal scrolling at 320px (WCAG 1.4.10).
- [ ] Restore CSS inlining for tiny stylesheets without re-inlining scripts (the `assetsInlineLimit: 0` regression adds a 232-byte request on `/`).
- [ ] Forced colours: the selected theme option must differ by more than border colour below 560px.
- [ ] Section header dot pattern: move it out from behind the lead text on narrow screens.
- [ ] Dark section tints: test separation in OKLab and raise the Start here and Paperwork dark tints so each section is distinct.
- [ ] WebKit axe tests: make timeouts configurable rather than failing under load.
- [ ] Design guidance and live demos on `/design-system/` for the D5 AI notice and "Sources for this page" pattern, using the existing Callout and Official badge, with the `trust.*` strings from WP-12b.
- [ ] Remaining pass-2 and pass-3 nits.

## When WP-11 (design system) and WP-22a have both merged

All done in the WP-22a integration round (`341b42c`) unless noted.

- [x] Switch `tests/e2e/design-system.spec.ts` to import from `tests/e2e/fixtures.ts`. Running it guarded for the first time found no console error, CSP violation or off-origin request on `/design-system/` — but the WebKit run did expose a real contrast-panel bug, fixed separately in `da6dcb0`.
- [x] Confirm `pnpm test:e2e` and `pnpm test:a11y` no longer exit 1 with "No tests found". Verified: `test:a11y` is 4 passed, and every `test:e2e` project runs. `test:visual` still has no specs or baselines, which is expected until a package adds pages.
- [x] Give the placeholder home page a meta description through `Base.astro` — already done by WP-11.
- [x] Remove the home-page entry from `tests/e2e/helpers/exceptions.ts`. Done: the stale-exception check caught it as soon as the home page started rendering through `Base.astro`, and `PAGE_CHECK_EXCEPTIONS` is now empty.
- [ ] Give the placeholder home page a meta description through `Base.astro`, so the Lighthouse SEO assertion passes.
- [ ] Remove the home-page entry from `tests/e2e/helpers/exceptions.ts` once the home page renders through `Base.astro`; the stale-exception check will fail until it is removed.

## When WP-12 (i18n) merges

WP-12 merged as `33bf2a8` after clean passes 3 and 4. The items below are delegated to follow-up package WP-12b (branch `wp/wp12b-i18n-followup`), which gets its own two review passes.

- [ ] Add `tsc --noEmit -p .` to `gate:fast` in `package.json` (WP-12 pass 1 nit n6).
- [ ] Fix the three deferred nits recorded in `docs/reviews/backlog.md` (P1–P3), plus pass 4 minors m1–m4 and its nits.
- [ ] Add UI strings for the per-page AI notice and verification status required by build plan D5: the notice sentence with `{date}`, "AI-checked", "Checked by {reviewer}", "Sources for this page", and the source-note text for pages without their own sources. Both `en.json` and `af.json`, regenerate `ParamNames`, and run the i18n tests.
- [ ] Resolve the `gate:fast` line in `package.json` when merging WP-12b, WP-10 and the glossary branch: WP-12b adds `tsc --noEmit -p .`, WP-10 adds `pnpm content:drift`. The combined line keeps both, in the order lint, typecheck, tsc, test, content:drift, test:content (see `WP-12b-pass1.md`).
- Decision on pass 4 m5: no generic "layer count" key. The plan's "3 registration layers" is content specific to the vehicle dealer document, not a UI element.

## When WP-10 (content pipeline) merges

**Merged as `22e14b0` on 2026-09-18** after clean passes 4 (Reviewer Q) and 5 (Reviewer T). Gate green on merged `main`: lint, typecheck, `tsc --noEmit -p .`, 503 unit and dom tests, 32 content tests, no content drift, build complete.

- [x] Merge `main` into the WP-10 branch first, so it picks up the content corrections in `34175e9` and `745e387`, then run `pnpm content:build` and commit the regenerated `src/data`. `pnpm content:drift` must be clean. — merge commit `78d3437`; the regenerated corpus was byte-identical, so there was nothing to commit.
- [x] Squash-merge with a `feat(content):` message, replacing the `chore(content): wip checkpoint` subject.
- [ ] Rebase or merge `content/af-glossary` onto the merged pipeline, drop its `scripts/translate/TERMS-af.json` changes in favour of the pipeline branch's version, then start the glossary fix round (review `WP-40-glossary-pass1.md`, `’n`, notes file rename, fidelity over glossary definitions, stale `sourceHash` after the English corrections).
- [ ] Start the accuracy review phase (build plan P4a): the WP-45 fact inventory first, then the topic reviewers.

## Before any page package starts

- [ ] Page and component briefs must include build plan D5: the AI notice near the top of every content page, the "Sources for this page" section from `doc.sources`, dated facts, and no overclaiming.
