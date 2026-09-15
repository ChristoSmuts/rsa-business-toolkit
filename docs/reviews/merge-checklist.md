# Merge checklist

Tasks the orchestrator committed to doing when work packages merge into `main`. Tick each one when done and note the commit.

## When WP-22a (test harness) merges

- [ ] Switch `tests/e2e/smoke.spec.ts` to import `test` and `expect` from `tests/e2e/fixtures.ts`, and remove its entry from `KNOWN_DIRECT_PLAYWRIGHT_IMPORTS` in `tests/unit/e2e-harness.test.ts`.
- [ ] Check that `pnpm test` passes after the merge; the "no direct `@playwright/test` import" check must stay green.

## When WP-11 (design system) merges

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

- [ ] Switch `tests/e2e/design-system.spec.ts` to import from `tests/e2e/fixtures.ts`.
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

- [ ] Merge `main` into the WP-10 branch first, so it picks up the content corrections in `34175e9` and `745e387`, then run `pnpm content:build` and commit the regenerated `src/data`. `pnpm content:drift` must be clean.
- [ ] Squash-merge with a `feat(content):` message, replacing the `chore(content): wip checkpoint` subject.
- [ ] Rebase or merge `content/af-glossary` onto the merged pipeline, drop its `scripts/translate/TERMS-af.json` changes in favour of the pipeline branch's version, then start the glossary fix round (review `WP-40-glossary-pass1.md`, `’n`, notes file rename, fidelity over glossary definitions, stale `sourceHash` after the English corrections).
- [ ] Start the accuracy review phase (build plan P4a): the WP-45 fact inventory first, then the topic reviewers.

## Before any page package starts

- [ ] Page and component briefs must include build plan D5: the AI notice near the top of every content page, the "Sources for this page" section from `doc.sources`, dated facts, and no overclaiming.
