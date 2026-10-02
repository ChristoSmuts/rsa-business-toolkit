# WP-20 review pass 7 (whole package)

- **Reviewer:** an independent reviewer agent that did not write this code.
- **Date:** 2026-10-02
- **Commit reviewed:** `9227013` ("fix(components): resolve wp-20 review pass 6"). This is the tip of `claude/lucid-bell-t5acdn`. I checked it out detached in a clean worktree.
- **Scope:** `git diff b010d5b...9227013`: 29 commits, 84 files, +10223 / -114. That includes the pass 6 fix commit, which I verify below.

## Gate results

I re-ran all of these myself.

- `pnpm install --frozen-lockfile`: OK.
- `pnpm gate:fast`: exit 0.
  - Lint, Prettier and stylelint: clean.
  - `astro check`: 176 files, 0 errors, 0 warnings.
  - vitest unit+dom: 30 files, **939 passed (939)**.
  - Content drift: none.
  - vitest content: **32 passed (32)**.
- `pnpm build`: exit 0, 96 pages.
  - `dist:audit`: 96 HTML files, 13351 URLs checked under `/business-toolkit/`, no problems.
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with no English text marked as Afrikaans." 46 is 48 Afrikaans pages minus the two `af/design-system/` pages, which the check leaves out.
- Playwright `chromium`, `mobile` and `nojs` in one process (`PW_PORT=5020`): 597 tests, **512 passed, 85 skipped, 0 failed**.
  - chromium: 248 passed (one more than pass 6: the new menu test).
  - mobile: 163 passed, 85 skipped.
  - nojs: 101 passed.
- `pnpm test:a11y`: **192 passed** (96 routes × light and dark).
- **WebKit was not run.** It is not available in this environment.
- I used the existing shim read-only (`PLAYWRIGHT_BROWSERS_PATH=<scratchpad>/pw`). I did not run `playwright install`, and I changed nothing under `/opt`. My own preview ran on port 5031 and is stopped. The installed browser reports as Chromium 141.0.7390.37.

## My own checks

I ran Playwright scripts against `astro preview` on port 5031.

**Desktop menus at 1280px** (`/core/register/`, `/af/core/tax-and-sars/`, `/af/`):

- These work:
  - Escape from the summary or from a link closes the menu and puts focus on the summary.
  - Shift+Tab out of the menu closes it.
  - Tabbing from the last Read link to "Nutsgoed" closes Read. Opening Tools then keeps Read closed.
  - A click in the article closes the menu.
  - Without JavaScript, the shared `name` keeps only one menu open.
- These do not:
  - **Clicking anywhere inside an open list that is not a link crashes the renderer.** That means the list padding or the 4px gap between links. See blocker 1.
  - A menu opened without focus inside it (as Safari does on a mouse click) ignores Escape.
  - An open menu still rides the sticky bar when the reader scrolls without clicking.

**Drawer at 375px** (`/af/core/register/`):

- It opens by keyboard with focus on the close button. The dialog is named by `aria-labelledby`.
- Escape closes it and returns focus to "Kieslys".
- The skip link is the first tab stop, and its text is Afrikaans.

**Theme control:**

- It is a radio group with a visually hidden legend.
- The arrow keys move System → Light → Dark and apply each theme at once.
- Dark survives a reload.

**Pager:** it is named "Previous and next page links". The links read "Previous: Core: start here" and "Next: Tax and SARS".

**Screenshots I looked at.** All eight of these pages, at 320, 768 and 1280px, in light and dark:

- `/`, `/af/`
- `/core/register/`, `/af/core/register/`
- `/checklist/`
- `/af/business-types/food/`, `/af/business-types/`
- `/templates/quotation/`

Plus:

- Forced colours on `/af/core/register/` and `/af/business-types/` with a menu open.
- No-JS menus at 1280px and on `/af/` at 375px.

No page scrolls sideways. The AI notice, status and "Hoe dit gemaak is" sit together in the header. The effort meter's hidden scale text is now localised.

**Print** (`emulateMedia('print')`, `/af/checklist/`):

- The not-saved line, the table of contents `<details>` and the top bar are `display: none`.
- The AI notice prints.

**Language of parts:**

- **English marked as Afrikaans.** `dist:trust` sweeps this direction itself.
- **Afrikaans marked as English.** I swept every `af/**` page for text marked `en*` that does not appear in the English twin. Found none.
- **Attributes.** I compared `aria-label`, `title`, `alt` and `placeholder` values with the English twin. The only matches sit inside English fallback blocks, which is consistent with the content-language policy.
- **English titles inside Afrikaans text.** I searched for text nodes that contain an English document title inside Afrikaans text. There are none in the body. Only `<title>` mixes the two ("Register: what you actually need · Kern: geld vir almal · …"). That follows the policy already accepted for the meta description (backlog, pass 3 nit).

**Facts outside the markdown in the new code:** `businessTypes.effortScale` with `total: 5` matches the five-step meter. There is nothing else new.

**Ownership:**

- The cross-package set is the same as in pass 6. It is all recorded or accepted.
- The pass 6 fix adds two cross-package edits:
  - One `ParamNames` line in `src/i18n/index.ts` (`businessTypes.effortScale`). It is the same kind of edit pass 5 accepted.
  - Documentation lines in `docs/design-system.md` and `docs/testing.md`, which describe this package's own behaviour.
- `scripts/dist/check-trust.ts` grew by about 100 lines. It is already recorded as a tooling change for the orchestrator to confirm at merge (pass 4, `merge-checklist.md`).

| File | Owner | Recorded |
|---|---|---|
| `.prettierignore` | tooling | Yes (M1 p1 m5) |
| `src/components/ui/TableScroll.astro` | WP-11 | Yes |
| `src/components/ui/Card.astro` (`titleLang`) | WP-11 | Yes (p3) |
| `src/pages/design-system.astro` (register link) | WP-11 | Yes (p2) |
| `package.json` (`build` runs `dist:trust`) | orchestrator | Yes (p4), and on the merge checklist |
| `scripts/dist/check-trust.ts` | tooling | Yes (p4). The pass 6 language check is in the same file. |
| `src/i18n/index.ts` (two `ParamNames` lines) | WP-12 | Accepted in p5; the second line is the same kind |
| `docs/design-system.md`, `docs/testing.md` | WP-11 / WP-22a docs | Describe this package's behaviour. Accepted. |

## Mutation tests

Each mutation was reverted with `git checkout -- <file>`. I then rebuilt `dist/` from the clean tree, and `git status` is clean.

| # | Mutation | Guard | Result |
|---|---|---|---|
| 1 (pass 6 guard) | `navigation.ts:131`: the document `pointerdown` listener renamed to a dead event | `pages.spec.ts` "the desktop menus close on Escape, outside clicks, focus leaving, and each other"; unit | **Survives.** The e2e test passes (1/1) and unit passes (939). The "outside click" step is closed by the `focusout` handler, not by `pointerdown`. See minor 2. |
| 2 (pass 6 guard) | `TaskListBlock.astro:42`: `lang={siteLang}` removed from the not-saved line | `dist:trust`, `pages.spec.ts` "every page with a checklist says, once…", chromium+nojs, unit | **Survives.** Build exit 0; chromium+nojs 349 passed; unit 939. The Afrikaans sentence now sits inside `lang="en-ZA"` on all 13 Afrikaans checklist pages. See minor 1. |
| 3 (pass 6 guard) | `check-trust.ts:54`: `'[^.]+?'` back to `'.+?'` | `tests/unit/check-trust.test.ts` | **Caught.** "credits a person only when the status names one" fails. |
| 4 (pass 6 guard) | `Doc.astro:207`: `lang={contentLangTag}` removed from the "Words used in this file" block | `dist:trust` language check | **Caught.** The build fails with 351 findings, for example `/af/branding/brand-applications-and-polish/: English text marked as Afrikaans: "Glossary"`. |

## Earlier findings

| Pass | # | Finding | Status |
|---|---|---|---|
| M1 p1 | B1 | "Read the English version" link marked `lang="en"` | Fixed. |
| M1 p1 | M1 | English text outside `.st-blocks` not marked | Fixed. `dist:trust` now guards the English-as-Afrikaans direction (mutation 4 caught). |
| M1 p1 | M2 | Pseudo headings render `h4` under `h2` | Fixed. |
| M1 p1 | m1 | Official badge misses `www`/slash variants | Fixed. |
| M1 p1 | m2 | Stale fragment in the switcher | Fixed. |
| M1 p1 | m3 | Unnamed `<pre>` tab stops | Fixed. |
| M1 p1 | m4 | English-only text on the AF reference page | Fixed. |
| M1 p1 | m5 | Ownership: `TableScroll`, `.prettierignore` | Recorded in the backlog. Accepted. |
| M1 p1 | n1, n2 | Comments point at missing tests; missing link targets degrade silently | Fixed. |
| M1 p1 | n3 | `.js` set but module blocked | Recorded in the backlog. Accepted. |
| p2 | M1 | English titles on AF cards, contents, pager | Fixed. |
| p2 | M2 | Home 0% band unsupported | Fixed (removed). |
| p2 | M3 | Contradictory hreflang/canonical | Fixed. |
| p2 | m1 | Search query lost | Message fixed. Echoing the query is deferred to WP-33. Accepted. |
| p2 | m2, m3 | `/` hint; wizard links | Fixed. |
| p2 | m4 | Removing D5 pieces does not fail the build | Fixed (`dist:trust` with a page count). |
| p2 | m5 | Hub; per-entry anchors on `/sources/` | Hub fixed. Anchors deferred. Accepted. |
| p2 | n1, n2 | 404 suggestion; `design-system.astro` line | Deferred or recorded. Accepted. |
| p3 | B1, B2 | Bar covers anchors below 1024px; switcher name language | Fixed. |
| p3 | M1, M2 | Empty sources under "the sources below"; home figures | Fixed. |
| p3 | m1–m5, n1–n3 | Assorted | Fixed, or deferred with reasons I accept (n3, the AF meta description). |
| p4 | B1 | Sticky bar from 1024px covers anchors | Fixed. |
| p4 | M1 | Prompts do not reflow | Fixed. |
| p4 | m1–m5 | Search link; home figure test; notice sentence; ownership; trust lines | Fixed or recorded. |
| p4 | n1 | Checklist ticks lost with no notice | Fixed (p5 m2, p6 m1). |
| p5 | m1–m3, n1 | Notice sentence variant; not-saved line; 44px targets; scroll-padding comment | Fixed. The pass 6 mutations still hold. |
| p6 | M1 | Desktop menus cannot be dismissed | **Fixed in behaviour:** Escape, outside click, focus leaving and the shared `name` all work. **The fix introduced blocker 1** (renderer crash). One path is untested (minor 2). |
| p6 | m1 | Not-saved line in English on AF pages | **Fixed.** All 13 AF pages say "Merkies op hierdie bladsy word nog nie gestoor nie…" with `lang="af-ZA"`, and the e2e test checks the text. The `lang` itself is unguarded (mutation 2; minor 1). |
| p6 | m2 | No guard for language of parts | **Fixed for English marked as Afrikaans** (mutation 4 caught). It has no reverse direction (minor 1) and it has false positives (minor 3). |
| p6 | n1 | Person check in `dist:trust` holds in one direction | **Fixed.** Mutation 3 caught. |
| p6 | n2 | TOC summary prints alone | **Fixed.** The `<details>` is `st-no-print`; confirmed under print emulation. |

I reviewed every WP-20 row in `backlog.md` again and accept each reason as written. No new WP-20 rows were added after pass 6.

## Findings

### blocker: clicking inside an open desktop menu, but not on a link, crashes the browser tab
File: src/scripts/navigation.ts:124-128 (`focusout` handler in `enhanceTopbarMenus`)
Acceptance item: M1.3 (header with the Read and Tools menus); pass 6 major 1 fix; general correctness
What is wrong:
- The `focusout` handler closes the `<details>` synchronously (`menu.open = false`).
- A mouse press on a non-focusable part of the open list (its 8px padding, or the 4px gap between links) moves focus to `<body>`. That fires `focusout` with `relatedTarget === null` during the `mousedown` default action, so the handler hides the content box under the pointer while the press is still being handled.
- In Chromium 141.0.7390.37 this kills the renderer: Playwright reports `Target crashed` and the page fires `crash`. A reader sees the "Aw, Snap" page and loses their place. I reproduced it with both the headless shell and full Chromium (`channel: 'chromium'`).
- It happens with focus on the summary (opened by mouse) and with focus on a link inside the menu (opened by keyboard). It happens on English and Afrikaans pages.
- Controls:
  - With JavaScript off there is no crash.
  - With the `name` attribute removed it still crashes.
  - With the per-menu listeners removed (`replaceWith(cloneNode(true))`) there is no crash.
  - With only `focusout` suppressed by a capturing listener there is no crash.
  - So the cause is the `focusout` close.
- The e2e test never presses inside the list, so the suite is green.
- This is wrong behaviour, so it is a blocker. A tab crash from an ordinary click is worse than the pass 6 major it fixes.
How to reproduce:
1. Run `pnpm build`, then run the preview launcher on a free port.
2. In Chromium at 1280×800, open `/business-toolkit/core/register/`.
3. Click "Read".
4. Click 3px inside the top-left corner of `.st-menu__list`, or midway between the first two `<li>`s.
5. Scripted: `await read.locator('summary').click(); const b = await read.locator('.st-menu__list').boundingBox(); await page.mouse.click(b.x + 3, b.y + 3);` throws `mouse.click: Target crashed`.

Suggested fix:
- Close on `focusout` only when `relatedTarget` is a node outside the menu: `if (!(next instanceof Node) || menu.contains(next)) return;`. Leave pointer presses to the existing `pointerdown` handler, which already ignores presses inside the menu.
  - I injected that variant: no crash, and the menu stays open.
  - A deferred close (`setTimeout(() => { if (!menu.contains(document.activeElement)) menu.open = false; })`) also avoids the crash, but it closes the menu on a click in its padding.
- Add a step to the e2e test: open Read, click the list padding and the gap between links, then assert the page did not crash and the menu is still open.

### minor: the language-of-parts check runs one way only, so Afrikaans text marked as English passes
File: scripts/dist/check-trust.ts:238-250 (`langProblems`); src/components/content/TaskListBlock.astro:42; tests/e2e/pages.spec.ts:111-127
Acceptance item: M2.4 / B5 (`lang="en"` on fallback blocks, and the page language on everything else); pass 6 minor 1 and 2
What is wrong:
- `langProblems` only flags text that inherits `af*` and also appears in the English twin.
- Afrikaans UI text inside an English fallback block that loses its own `lang` is read with an English voice. Nothing catches that. It is exactly the regression pass 6 minor 1 was about.
- Mutation 2 removed `lang={siteLang}` from the not-saved line. Then `dist:trust`, the not-saved e2e test (which checks only the text), chromium+nojs (349) and unit (939) all stayed green.
- My reverse sweep of today's output is clean, so the output is correct and only the guard is missing. That makes it minor.
How to reproduce: Delete `lang={siteLang}` on `TaskListBlock.astro:42`, then run `pnpm build && playwright test --project chromium --project nojs`. Everything passes, and `grep -o 'not-saved st-no-print">[^<]*' dist/af/checklist/index.html` shows the Afrikaans sentence with no `lang`, under `lang="en-ZA"`.
Suggested fix:
- In `langProblems`, also flag text on the Afrikaans page that inherits `en*`, is not language-neutral, and does not occur in the English twin.
- Or, in the not-saved e2e test, assert that the line's nearest `[lang]` on `/af/` pages starts with `af`.

### minor: the "outside click" path of the menu fix is untested, and does not run where it matters
File: tests/e2e/pages.spec.ts:301-343; src/scripts/navigation.ts:131-133
Acceptance item: pass 6 major 1 ("extend the e2e test to cover … an outside click")
What is wrong:
- The test's "a click in the article closes it" step passes because clicking the `h1` blurs the focused summary, so `focusout` closes the menu.
- The document `pointerdown` listener is never needed in Chromium. Mutation 1 disabled it and the test still passed.
- `pointerdown` is the only thing that closes a menu when focus is not inside it. That is the WebKit/Safari case, where clicking a `<summary>` does not focus it. The test is `chromium`-only (`test.skip(... !== 'chromium')`), so it never runs on WebKit either.
- In that same no-focus state, Escape does nothing: the `keydown` listener is on the menu, and focus is outside it. I reproduced this in Chromium by opening a menu with focus on `<body>`.
- Missing test coverage for a stated behaviour is a test gap. The behaviour I could check works, so this is minor.
How to reproduce: Rename the `pointerdown` listener (mutation 1), rebuild, and run `playwright test --project chromium -g "desktop menus close"`. It passes.
Suggested fix:
- Before the outside click, call `document.activeElement.blur()` so that only `pointerdown` can close the menu.
- Let the test run on `webkit` too.
- Optionally, listen for Escape on the document while a top-bar menu is open.

### minor: the language check will fail the build on URLs, form codes and names once Afrikaans content lands
File: scripts/dist/check-trust.ts:226-236 (`sharedStrings`, `LANGUAGE_NEUTRAL`)
Acceptance item: CLAUDE.md "Afrikaans keeps numbers, rand amounts, form codes, URLs and placeholder counts byte-identical to English"; general quality
What is wrong:
- The allowlist is limited to:
  - strings that are identical in the two dictionaries;
  - text without letters;
  - `R<digits>`.
- A translated Afrikaans document must keep URLs, form codes and names byte-identical, so the same text nodes appear in both twins and are reported as "English text marked as Afrikaans". Examples: `www.bizportal.gov.za` as link text, `<code>VAT201</code>`, `<strong>SARS</strong>`, "Google Drive".
- `LANGUAGE_NEUTRAL` also accepts "R1 million", which is English. The Afrikaans is "R1 miljoen".
- Nothing ships wrong today, because there are no Afrikaans documents. But the `content/af-glossary` branch (121 entries) and the first document translation will turn the build red in a tooling file the translation package does not own.
- It fails closed, and the fix is small, so this is minor rather than major.
How to reproduce: `langProblems('<html lang="af-ZA"><p>Registreer by <a href="x">www.bizportal.gov.za</a>. Dien <code>VAT201</code> in by <strong>SARS</strong>. Gebruik <em>Google Drive</em>.</p></html>', '<html lang="en-ZA"><p>Register at <a href="x">www.bizportal.gov.za</a>. File the <code>VAT201</code> with <strong>SARS</strong>. Use <em>Google Drive</em>.</p></html>')` returns four problems.
Suggested fix:
- Only compare text inside `.st-blocks` or chrome when the page itself is a fallback (`lang="en-ZA"` content container), or skip `<code>`, link text that is a URL, and all-caps tokens.
- Or record in `backlog.md` that the translation package must extend the allowlist, with the cases above.

### minor: every signature line is announced as "Signature", including the name and date lines
File: src/components/content/Inline.astro:76
Acceptance item: M1.1 ("Placeholders and siglines render visibly and accessibly in templates")
What is wrong:
- Every `sigline` run gets `role="img" aria-label="Signature"` (`templates.fields.signature`).
- In the quotation template's "Acceptance" block, the three lines follow "Accepted by:", "Name (print):" and "Date:". A screen reader says "Name (print): Signature, image" and "Date: Signature, image". The text alternative is wrong for two of the three lines.
- The visible label before each line is correct, and this is a read-only preview, not a form control, so a reader is misled rather than blocked. That makes it minor, not a blocker.
How to reproduce: `grep -o '.\{40\}<span class="st-sigline"[^>]*>' dist/templates/quotation/index.html`
Suggested fix: Label the line neutrally, for example `templates.fields.blankLine` ("blank line to fill in"), or use `aria-hidden` and rely on the visible label. Add the string to both dictionaries.

### nit: an open menu still rides the sticky bar when the reader scrolls without clicking
File: src/scripts/navigation.ts (`enhanceTopbarMenus`)
What is wrong: Open Read at 1280px on `/core/register/`, then scroll 1500px with the wheel. The list stays open over the article text. Escape, a click, or Tab now closes it, so the reader can recover. This is polish.
Suggested fix: Close an open top-bar menu on the first `scroll` event after it opens, or accept and document it.

## Verdict

**Not clean: 1 blocker, 0 major, 4 minor, 1 nit.**

- The pass 6 major, minors and nits are fixed in behaviour. Mutations 3 and 4 show two of the new guards go red.
- The menu fix introduced a renderer crash on an ordinary click inside an open menu (blocker 1). Under the protocol this resets the two-pass count.
- WebKit was not run because it is not available in this environment. Neither the crash nor the Safari-only menu path was checked there.
