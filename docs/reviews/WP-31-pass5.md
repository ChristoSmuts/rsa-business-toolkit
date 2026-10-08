# WP-31 review pass 5 (Find my path and My path)

- **Reviewer:** an independent reviewer agent, a different instance from passes 1 to 4. It did not write this code.
- **Date:** 7 October 2026
- **Commit reviewed:** `bf19183` ("docs: update WP-31 budget figures to the pass 4 build"), the tip of `worktree-agent-a0193f6dbc3887574`. I reset a clean worktree to it.
- **Scope:** the whole diff, `git diff 61bb68c bf19183`: 107 files, +10271 / -241. I looked hardest at the pass 4 fixes, `git diff 237f4b3 bf19183` (`61ad10d`, `9f180ca`, `d7b1bd8`, `bf19183`).

## Verdict

**Clean: 0 blocker, 0 major, 2 minor, 2 nit.**

Pass 4 was clean, so this is the second consecutive clean pass, by a different reviewer instance.

Every pass 4 finding is fixed as the commits say. I checked each one in the browser and with mutations (see "Pass 4 fixes" below).

## Gate results

I ran all of these myself on `bf19183`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile`: OK ("Done in 2.5s using pnpm v11.22.0").
- `pnpm gate:fast`: exit 0.
  - "All matched files use Prettier code style!"
  - `astro check`: "Result (260 files)", 0 errors, 0 warnings, 0 hints.
  - vitest unit + dom: "Test Files 63 passed (63)", "Tests 1308 passed (1308)".
  - "Wrote 0 changed files, removed 0, 83 files in total." "Content drift: none."
  - vitest content: "Tests 37 passed (37)".
- `pnpm build`: exit 0, "198 page(s) built in 7.98s".
  - `dist:audit`: "198 HTML file(s), 23338 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`:
    - "heaviest document page /af/business-types/food/: 22.0 KB without a profile, 22.0 KB with one (budget 25.0 KB, 3.0 KB left)."
    - "heaviest other page /af/my-path/: 24.6 KB without a profile, 24.6 KB with one (budget 45.0 KB, 20.4 KB left)."
    - "198 page(s) within budget."
- `pnpm content:fidelity --lang af`: "Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet."
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4795`, default reporters): "Running 1015 tests using 2 workers", **926 passed, 89 skipped, 0 failed** (8.1 min). The list has no `✘` line.
- `pnpm test:a11y` (same environment, `PW_PORT=4795`): "Running 408 tests using 2 workers", **408 passed, 0 failed** (6.7 min). The first run was cut off when the container restarted; I reran it in full on the same build.
- **WebKit was not run.** It is not installed in this environment. It stays on `merge-checklist.md`.

## My own checks

### The home card: no JavaScript, slow JavaScript, failed JavaScript

I wrote a Playwright probe (chromium, 390 × 844) against `astro preview` of this build. Each case seeds `st.profile.v1` (sole proprietor, food, trading), waits 5 to 6 s, then reads the card's height, the `h1`'s top and every `layout-shift` entry.

| Case | Card height | `h1` top | Shifts | Right? |
| --- | --- | --- | --- | --- |
| A. No JavaScript | 0 (`hidden`, no `html.js`) | 245 | none | Yes |
| B. Answers, no stored path | 285, drawn | 478 | none | Yes |
| C. Answers, current stored path | 285, drawn | 478 | none | Yes |
| G. Every module except `theme-init` 2.5 s late | 285, drawn | 478 | none | Yes: pass 4 minor 2 is fixed |
| I. Only `path-data` 3 s late | 285, drawn | 478 | none | Yes |
| H. The card's module (`YourPathCard…js`) dropped | 0, `data-st-script-failed` set | 145 | one, 0.3 at 192 ms | Yes: one shift, the space goes |
| J. A shared chunk it imports (`path-progress…js`) dropped | 0, `data-st-script-failed` set | 145 | one, 0.3 at 139 ms | Yes |
| **D/E. `path-data` chunk dropped, no or stale stored path** | **285, invisible** | **478** | none | **No: a permanent blank box (minor 1)** |
| **F. An unrelated module (`LanguageSwitcher…js`) dropped** | 285, drawn | 478 | **0.3 at 246 ms** | **The card's module was fine, but the space went and came back (nit 1)** |

- Without JavaScript nothing is reserved and nothing is hidden: the card is `js-only` and `hidden`, and `theme-init.js` does not run, so `html.js[data-st-profile]` never matches.
- The new e2e test "when the home page's scripts come late, the card moves nothing (pass 4, minor 2)" passes, and my probe agrees (case G, no shift at all).
- The e2e test "if the home card's module fails to load, its kept space goes" passes. `theme-init.js` runs before every module script (it is a classic blocking script in `<head>`), so its capturing `error` listener is in place before any module can fail. Chromium fires `error` on the `<script type="module">` element when any module in its static graph fails, so the listener also catches a dropped shared chunk (case J).
- No dom test covers the listener. The e2e test does, so I do not report it.

### My path with slow JavaScript

Same probe on `/my-path/` with every module except `theme-init` 2.5 s late (the chunks load in a chain, so the page was ready at about 7.7 s):

| Time | Empty state "You have not answered the questions yet" | `data-ready` |
| --- | --- | --- |
| 0.8 s | `visibility: hidden` | no |
| 1.6 s | **visible** | no |
| 4.5 s | **visible** | no |
| 9 s | hidden (the path is drawn), after a shift of 0.116 at 7.7 s | yes |

See minor 2.

### The content commit `61ad10d`

**The moved sentence.**

- English and Afrikaans each move one line, unchanged. `git diff --word-diff=porcelain 237f4b3 bf19183` on both files shows the same line removed and added, byte for byte.
- So numbers, codes and form names (TRN, BRNC) stay byte-identical to English, and `content:fidelity --lang af` reports 0 findings.
- The sentence is now the second paragraph of "Layer 2" (`layer-2-getting-vehicles-registered-to-the-business.2`), with no condition. I confirmed in the generated JSON (en and af) that it has no `appliesTo`, and that "If you trade as a company" after it keeps `entity: pty`.

**Is the commit acceptable without an official source?** Yes.

- CLAUDE.md asks for a source when content "is found to be wrong" and is fixed. Here no fact changes: the same sentence moves to a place every dealer reads, so "Only what applies to me" stops hiding it from a Pty Ltd dealer.
- The commit message says "No facts change", and the diff proves it.
- The `fix(content):` type is a fair choice: it fixes what a reader sees, in the English markdown first and the translation second, as CLAUDE.md asks.
- One small cost of the move is nit 2.

**The three continuity tasks.** The three tasks in "Continuity" now have `entity: pty`:

- "A second director appointed, or a deliberate decision not to";
- "Checked whether my MOI allows an executor to appoint a director";
- "A will that deals with the shares, consistent with the MOI".

I read the guide's own words in `docs/rsa-business-toolkit/01 Core - applies to everyone/10-you-are-the-business.md`:

- These are fixes 1, 2 and 3 of "The four fixes, cheapest first" (lines 139-149).
- That list answers "Pty Ltd: this is the serious one" (lines 121-137): "it can only act through its directors", "depends on what your MOI says", "The shares fall into the deceased estate".
- The sole proprietor's part (lines 117-119) asks only for the one-page record. The last two continuity tasks are about that record, and they keep no condition.
- So the marking agrees with the guide. A sole proprietor has no directors, MOI or shares.
- An undecided reader still sees all three, because `applies` shows both entities to an undecided reader.

**In chromium**, with the switch on for a sole proprietor (services and trades) on `core/you-are-the-business/`:

- English: the Continuity list says "3 items are hidden because they do not apply to you" and offers "Show 3 hidden items".
- Afrikaans: "3 items is versteek omdat hulle nie vir jou geld nie" and "Wys 3 versteekte items".
- A Pty Ltd reader sees no hidden items.
- `tasks.json` (en and af) carries the same `when` on the same three ids, so My path's checklist agrees.

### "Show N hidden items" focus (pass 4, nit 2)

**In chromium:**

- "Show 1 hidden item" on Protection moves focus to the item that came back, "If I have a company and pay myself a salary …", not to the list's first item.
- "Show 3 hidden items" on Continuity moves focus to "A second director appointed …".
- Afrikaans is the same.

**Mutation:** I put back `list.querySelector('input[type="checkbox"]')?.focus()`. "offers Show on a partly hidden checklist too, named by the count" in `tests/dom/applies.test.ts` then fails.

### The new `hiddenPart` test (pass 4, minor 1)

I deleted `|| matches(element, who)` at `src/scripts/applies.ts:68`. Pass 4 found that nothing failed with this change. Now the new test fails: "a sub-heading whose own condition applies under a heading that does not (pass 4, minor 1) > stays visible for that reader, with what is under it" (1 failed, 23 passed).

### The container-API markup test (pass 4, nit 4)

`tests/unit/components/applies-markup.test.ts` renders three real documents with `Blocks.astro`.

- When I renamed `data-depth` in `Block.astro`, three tests failed.
- When I removed the `HiddenMarker` before conditional headings, the same three tests failed.
- `filterable` is computed from the block itself, not from a context flag, so the marker assertion is not vacuous.

### Other checks

- **CLAUDE.md rules in the pass 4 diff:**
  - no `href="/…"` literals and no colour literals;
  - `theme-init.js` reads storage (the documented exception) and adds only a DOM attribute;
  - `docs/design-system.md:417` and `:461` document `data-st-script-failed`.
- **Generated data:** it changed only through the pipeline. `content:drift` is clean.
- **Worktree:** after every mutation, `git status --short` was empty.

## Accessibility

`pnpm test:a11y`, `PW_PORT=4795`: **408 passed, 0 failed** (6.7 min). This covers axe on every sitemap URL in both themes, the wizard steps, and My path with the reset dialog open.

## Findings

### minor 1: if the path rules fail to load, the home card leaves a 285 px blank box above the hero for good
File: src/scripts/your-path.ts:33-38, src/components/wizard/YourPathCard.astro:73
Acceptance item: Build 5 (home "Your path" card); D4 performance lens; the pass 4 fix's own promise ("a dropped request leaves no gap")
What is wrong:
- When the stored path is missing or out of date, `rebuild` loads the rules with a dynamic `import('./path-data')`.
- If that request fails, the promise rejects and nothing handles it. The card stays `hidden` without `data-no-path`, so the CSS keeps its box, invisible.
- A failed dynamic import fires no `error` event on a `<script>` element, so `theme-init.js` never sets `data-st-script-failed`.
- In chromium at 390 px the `h1` stays at 478 px instead of 145 px, under a 285 px blank box, for as long as the page is open. The page logs "TypeError: Failed to fetch dynamically imported module …/path-data.CUlQ4sYH.js".
- The stored path is out of date for every returning reader after any deploy that changes `paths.json` or a path document's route, title or conditions (`scripts/content/paths.ts:183-193`). So this is the normal first home-page load after a content update, on whatever connection the reader has.
Why it matters:
- On a phone, a reader with answers opens the home page and gets a third of the screen of blank space above the hero, and no card.
- Nothing is lost, and a reload fixes it, so this is minor.
- It is the same symptom as pass 3 minor 1, by another route.
How to reproduce: Run `astro preview` of this build. Seed `st.profile.v1` = `{"entity":"sole-prop","businessTypes":["food"],"stage":"trading"}` and no `st.pathView.v1`, or a stale one. In Playwright, abort every request whose URL contains `/path-data.`, open `/business-toolkit/`, wait 5 s, and read `st-your-path`'s `getBoundingClientRect().height`: it is 285 and the card is `visibility: hidden`. (Probe cases D and E above.)
Suggested fix: Catch the rejection in `rebuild` and give the space back. For example, `loadPathData().then(…).catch(() => { pending = undefined; this.setAttribute('data-no-path', ''); })`, so a later trigger can try again. Add a dom test that makes `loadPathData` reject and expects `data-no-path`. An e2e test like the "fails to load" one, aborting `/path-data.`, would also do.

### minor 2: on a slow load, My path tells a reader with answers "You have not answered the questions yet"
File: src/pages/[...locale]/my-path.astro:248-264
Acceptance item: Build 4 (My path; "Empty state when there is no profile"); D4 performance lens
What is wrong:
- My path still uses the 1 s timer that pass 4 minor 2 removed from the home card.
- With answers saved, the empty state is `visibility: hidden` for one second. Then `st-my-path-reveal` shows it, whether the module has failed or is only slow.
- With every module 2.5 s late, chromium at 390 px showed "You have not answered the questions yet" and "Find my path" from 1 s until about 7.7 s.
- The path then replaced the empty state, with a layout shift of 0.116.
Why it matters:
- A reader who has answered is told, for several seconds, that they have not.
- They may think the device lost their answers and go through the wizard again.
- Nothing is actually lost, so this is minor.
- The home card no longer has this problem, and `data-st-script-failed` now exists to tell "failed" from "slow".
How to reproduce: Seed `st.profile.v1` as above. In Playwright, delay every same-origin `.js` request except `theme-init` by 2.5 s. Open `/business-toolkit/my-path/` and read `.st-my-path__empty`'s computed `visibility` at 0.8 s, 1.6 s and 4.5 s: `hidden`, then `visible`, then `visible`, while `st-my-path` has no `data-ready`.
Suggested fix:
- Reveal the empty state on `html[data-st-script-failed]` instead of on a timer, the same way as the home card.
- Keep a long fallback (for example 10 s) only if you also want to cover a module that loads but throws.
- Adjust the pass 1 minor 5 e2e test to abort the module rather than wait a second.

### nit 1: any failed script gives back the home card's space, even when the card's own module loads
File: src/scripts/theme-init.js:36-43
What is wrong:
- The listener sets `data-st-script-failed` for any `<script>` that fails, not only the card's.
- I dropped only `LanguageSwitcher…js`. The card's module loaded and drew the card, but the page shifted by 0.3 at 246 ms: the space went, and the card came back.
- The home page has eight module scripts, so the card's space now depends on all eight.
Suggested fix: Optional. Keep the space while the card's module is alive. For example, have `your-path.ts` set `data-connected` again and add `:not([data-connected])` only to the give-back rule. Or check `event.target.src` against the card's script.

### nit 2: the moved sentence now uses "BRNC" before the guide defines it, and "TRN" is never defined
File: docs/rsa-business-toolkit/04 Your kind of business/01-vehicle-dealer.md:124 (and the Afrikaans file, same line)
What is wrong:
- "For a dealer, a TRN or BRNC is worth having" (line 124) now comes before "Business Register Number Certificate (BRNC)" (line 128). Before the move it came after.
- "TRN" is never paired with "Traffic Register Number" anywhere in the document (lines 38 and 138 use only the full name). This was already so before the move.
- A Pty Ltd reader also reads "worth having" and then, four lines later, "You need a BRNC".
Suggested fix: Optional, in a later `fix(content):` change. Write the names out in that sentence, for example "a Traffic Register Number (TRN) or Business Register Number Certificate (BRNC)", in both languages. Optionally add "(a company needs a BRNC)". No fact changes.

## Pass 4 fixes

| Pass 4 finding | Fixed in | My check |
| --- | --- | --- |
| minor 1: one branch of `hiddenPart` has no test | `9f180ca` | The new synthetic test fails when `\|\| matches(element, who)` is removed. |
| minor 2: a slow home page makes the card jump twice | `9f180ca` | No shift with every module 2.5 s late (probe G and the new e2e test). A dropped card module still gives the space back (probe H, e2e). A dropped `path-data` chunk does not (minor 1). |
| nit 1: dealers' TRN/BRNC sentence in the sole-proprietor part | `61ad10d` | Moved, byte-identical, in both languages. It has no condition. Fidelity is clean. |
| nit 2: "Show N" focuses the list's first box | `9f180ca` | Focus goes to the first item that came back, in en and af. The dom test fails without the fix. |
| nit 3: company-only continuity tasks are not marked | `61ad10d` | `entity: pty` on the three tasks, which agrees with the guide (see above). `applicability-real.test.ts` checks it in both languages. |
| nit 4: the all-profiles test models the page | `9f180ca` | The container-API test fails when `data-depth` or the marker is removed from `Block.astro`. |

## Not findings

- **The content commit has no official source.** No fact changed, so CLAUDE.md's source rule for wrong content does not apply (see above).
- **`/checklist/` "Only mine" did not hide the continuity tasks in my probe.** It has its own filter (`st-checklist-filter`), not `st.onlyMine`, and that filter is not what I switched on. It is not a defect.
- **The container-API test checks only headings for the flat-sibling shape, not every block.** The all-profiles test needs headings to be siblings. A wrapper around other blocks would still leave each block inside the heading's section, so this is not a gap.
- **No ring on document pages until the home page or My path rebuilds an out-of-date stored path.** This is the documented trade-off. Passes 2 to 4 accepted it, and so do I.
