# WP-50a review, pass 8

Tree: `741f1dc`. That is the WP-50a package on `204a2a2`, with the reviews from passes 1 to 7 and their fixes. The pass 7 fix is `3020532..741f1dc`. The reviewer is fresh and independent, and changed no code for this review.

## Verdict: clean

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 0 |
| Minor | 2 |

- **m1:** after Back, when the back/forward cache does not serve the page, the kinds of business the wizard saves match the ticks. But their order can differ from the order the reader ticked them, so the primary type can change without a word. `204a2a2` was worse on the same route: it saved the wrong kinds, or Next was dead.
- **m2:** the backlog row "the wizard never becomes ready" cites pass 7 minor 1, but its source column links only `WP-50a-pass6.md`.

The pass 7 fixes do what they say:

- **The `pageshow` re-sync.** It holds with and without saved answers, after Back, Forward, reload and an ordinary load, in both languages. A tap at `pageshow`, or between `pageshow` and the next frame, is kept. Next in that gap is not undone. A page served from the back/forward cache needs nothing.
- **"Loading the next step…"** is in Chromium's accessibility tree before the script, right after "What is the difference?". After the script it is gone.
- **The backlog row** describes what happens.

All 11 items are fixed on the built site, and each one reproduces on a `204a2a2` build.

## Checks run

All logs are in the session scratchpad as `wp50a-review8-*.log`, and the probe scripts are in `r8/`.

- **Builds.** The probes ran against a copy of the built `dist/` (`r8/dist`, port 4994). The `204a2a2` build is a fresh `git archive 204a2a2` in `r8/base`, built with the same `node_modules` (no dependency changes in the package; port 4993). Its log is `wp50a-review8-base204-build.log`, and its heaviest document page is `/af/templates/invoice/` at 24.2 KB.
- **Server and browser.** Both builds were served under `/business-toolkit/` by `r8/serve.mjs`, and the probes used Playwright Chromium.
- **Timing.** The probes ran only after e2e and a11y had finished.

`pnpm gate:fast` (`wp50a-review8-gatefast.log`):

```
All matched files use Prettier code style!
- 0 errors
- 0 warnings
 Test Files  78 passed (78)
      Tests  3277 passed (3277)
Content drift: none.
 Test Files  1 passed (1)
      Tests  39 passed (39)
EXIT 0
```

`pnpm build` (`wp50a-review8-build.log`):

```
06:58:23 [build] 198 page(s) built in 5.34s
dist:audit: 198 HTML file(s), 26715 URL(s) checked under base /business-toolkit/. No problems.
dist:trust: 72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways.
dist:budget: heaviest document page /af/business-types/food/: 24.0 KB without a profile, 24.0 KB with one (budget 25.0 KB, 1.0 KB left).
dist:budget: heaviest other page /af/search/: 34.1 KB without a profile, 34.1 KB with one (budget 45.0 KB, 10.9 KB left).
dist:budget: 198 page(s) within budget.
EXIT 0
```

`pnpm content:fidelity --lang af` (`wp50a-review8-fidelity.log`):

```
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
EXIT 0
```

e2e (`wp50a-review8-e2e.log`), with the brief's exact command (chromium, mobile and nojs, `PW_PORT=4991`, default reporters):

```
  93 skipped
  1567 passed (14.7m)
EXIT 0
```

- **Failures.** The log has 0 `✘` lines, and no flaky or retried tests.
- **The new Back test** passes in chromium and mobile, with and without saved answers. That is the 4 tests added since pass 7's 1563.
- **The wizard sweep** is the same as pass 7. Every arrival and reader line has worst shift 0.000, and the gap below Next is 119 to 141px, equal to `204a2a2`.

`pnpm test:a11y`, `PW_PORT=4992` (`wp50a-review8-a11y.log`):

```
Running 416 tests using 2 workers
  416 passed (7.4m)
EXIT 0
```

The log has 0 `✘` lines.

After the build and the runs, the worktree had no changes besides this file.

## The 11 items, end to end

Probes: `r8/items.mjs`, `r8/dead.mjs`, `r8/table.mjs` and `r8/venda.mjs`. The logs are `wp50a-review8-probe-items-204a2a2.log` and `-items.log`, plus `-dead.log`, `-table.log` and `-venda.log`. The modules were held with `/_astro/(?!theme-init)…js`: `theme-init` is a blocking script, and holding it stops the page from parsing at all.

| # | Audit problem | On `204a2a2` (reproduced) | On `741f1dc` | Result |
| --- | --- | --- | --- | --- |
| 1 | AI notice below the first screen at 320×568 on vehicle-dealer | Notice top 753px (en), 696px (af): below the 568px screen | 414px in both languages; the 44px label row is in view | Fixed |
| 2 | Wizard Next and template tabs show but do nothing before their script | Modules held: wizard Next visible (112×44), a tap leaves question 1. "Fill in" / "Preview" visible (en and af), and a tap on "Preview" moves focus but does not select it | Modules held: Next and both tabs are `visibility: hidden` in their room. "Loading the next step…" shows in Next's room and is in the accessibility tree. The Back route (pass 7 M1) is fixed, see below | Fixed |
| 3 | Search dialog shows nothing while the index downloads | Index held, dialog open 1.5 s: no "Loading search…" | "Loading search…" shows | Fixed |
| 4 | Invoice page shows the markdown's "make a copy … [SQUARE BRACKETS] … PDF" | That instruction is above the form (en and af) | Not above the form, and not in the meta description (en and af) | Fixed |
| 5 | "Now reading" pill cuts translated headings with an ellipsis | Pill text `white-space: nowrap; text-overflow: ellipsis; overflow: hidden`, and clipped for the longest heading (en "Prompt: generate the file checklist for your brand", af "Deel 2: basiese beginsels van drukwerk wat geld spaar") | `normal` / `clip` / `visible`, not clipped, full title shown | Fixed |
| 6 | Language banner shifts the layout by 0.144 | Home, `st.lang=af`, fonts held then released, 360px: banner 237 to 185px, CLS 0.136, all of it from the banner | Banner 237 to 237px, no shift from the banner (total 0.020). At 320px the 0.19 total is the header changing rows (288 to 288px banner), which is recorded and deferred to WP-50 Phase 1 | Fixed |
| 7 | Ring draws in for 960ms on every view; smooth scroll on Tab | `/checklist/` with a profile: `st-ring-draw:960` runs after load; `scroll-behavior: smooth` after Tab | No animation after load; `auto` after Tab | Fixed |
| 8 | Checkboxes shrink beside wrapped text; 576px tables cut two-column tables | `/checklist/` at 320px: visible checkboxes 13 to 20px wide; both two-column tables 576px in a 288px box (en and af) | Every checkbox 20px; en tables 288/288; af "Kort/Beteken" 288/288 | Fixed. One table still scrolls: the af checklist calendar ("Wanneer/Wat") is 385px in 288px (was 576px), because "inkomstebelastingopgawes" will not break. That is documented in `docs/design-system.md:240` and accepted in pass 3 |
| 9 | "Copied" names the wrong prompt | All 16 buttons say "Prompt N copied" by position ("Prompt 0: the business brief" gives "Prompt 4 copied"); af the same | 0 of 16 wrong in each language ("Copied: The refine prompt (use after every step)", "Gekopieer: Die verfyningsopdrag …") | Fixed |
| 10 | Raw folder name in summaries | 7 af business-type pages have `01-core/` in their meta description, for example "Lees eers 01-core/. Hierdie lêer …" | 0 pages | Fixed |
| 11 | Docs claim the web fonts cover the Venda letters | `docs/design-system.md:169` says latin-ext covers "ḓ, ṱ, ṋ, ṅ", and `/design-system/` shows them in the test string as if in every family | Measured: neither the latin nor the latin-ext file of Fraunces or Instrument Sans has ḓ ṱ ṋ ṅ Ḓ Ṱ Ṋ Ṅ. The controls (ł ő ā in latin-ext; ô ë in latin) are found. The doc now says so, and the page puts them on their own line labelled "system font" | Fixed |

## The pass 7 fixes

### The `pageshow` re-sync (`src/scripts/wizard.ts:62-66`, `:131-146`, `:176`, `:245`)

`r8/back.mjs` ran at 360×740 in both languages, against both builds (`wp50a-review8-probe-back.log`, `-back-204a2a2.log`).

**Back after "What is the difference?", with saved answers** (`sole-prop` / `services-trades, food` / `trading`). The reader unticks services and ticks beauty, follows the link, then goes Back:

```
204a2a2 en A ... saved=true: ... screen{entity=sole-prop types=food,beauty stage=trading} answers()={"entity":"sole-prop","businessTypes":["services-trades","food"],...}; then saved {"entity":"sole-prop","businessTypes":["services-trades","food"],"stage":"trading"}
tip en A ... saved=true: ... screen{entity=sole-prop types=food,beauty stage=trading} answers()={"entity":"sole-prop","businessTypes":["food","beauty"],...} button aria-disabled=no hint=hidden; then saved {"entity":"sole-prop","businessTypes":["food","beauty"],"stage":"trading"}
```

**The same with no saved answers** (Pty Ltd, beauty, food):

```
204a2a2 en A ... saved=false: ... screen{entity=pty types=food,beauty stage=-} answers()=null button aria-disabled=true hint=SHOWN ...; then stuck at step 0
tip en A ... saved=false: ... screen{entity=pty types=food,beauty stage=-} answers()=null button aria-disabled=no hint=hidden ...; then saved {"entity":"pty","businessTypes":["food","beauty"],"stage":"trading"}
```

Afrikaans gives the same lines.

**The other navigation types:**

- **Reload** (`nav=reload`): the saved answers fill the form, and the order is the saved one.
- **Forward** to the wizard (`nav=back_forward`): the ticks shown are what it holds, and Next works.
- **Ordinary load with saved answers** (`nav=navigate`): `#order` keeps the saved order `["services-trades","food"]`, not page order. So the sync on the initial `pageshow` changes nothing.
- **Back/forward cache.** Pass 7 could not get headless Chromium to use it. With Playwright's full Chromium (`channel: "chromium"`) and the cache enabled, Back is `persisted=true` (`wp50a-review8-probe-back-bfcache.log`). The ticks, `answers()` and Next all match, and the order is kept (`["beauty","food"]`).

**Does it ever fight the reader?** Case E injects a tap after Back at three points:

1. at `pageshow`, before the wizard's own listener;
2. between `pageshow` and the next frame;
3. Next in that gap.

```
tip en E tap before-listener: state at the tap 0:undecided; after the frame ... screen{entity=undecided ...} answers()={"entity":"undecided",...}
tip en E tap between-pageshow-and-frame: state at the tap 0:undecided; after the frame ... screen{entity=undecided ...}
tip en E tap next-in-gap: state at the tap 1:pty; after the frame ... step=1 ... focus=wz-h-type
```

- The reader's answer stays.
- Next to question 2 is not undone: `#sync` re-shows `#current` and never moves focus.
- Afrikaans is the same.

A slower case is a tap after `data-ready` but before `load`, on a Back with the web fonts held for 3 s (`wp50a-review8-probe-order.log`):

```
tip late-load Back: readyState at tap interactive; just after the tap {entity=undecided ...}; after load {entity=undecided ...}
```

Neither the browser's restore nor the sync undoes the tap.

**The tests.**

- The DOM test sets ticks with no event, fires `pageshow`, and checks Next and `answers()`.
- The e2e test covers both seeds through to the saved profile.
- Neither checks the order (see m1).

**Not run:** Firefox, which restores form state on reload. Only Chromium is installed. From reading the code: a reload is not `back_forward`, so `#restore` keeps the restored answers, and the `pageshow` sync then reads them.

### "Loading the next step…" in the accessibility tree

`r8/axtree.mjs` (`wp50a-review8-probe-axtree.log`) reads Chromium's own tree over CDP:

```
tip en/ held: nodes StaticText ignored=false; InlineTextBox ignored=false; after the difference link: "Loading the next step…", "Contents", "About"
tip en/ ready: nodes none; after the difference link: "Next", "Choose an answer first.", "Contents"
tip af/ held: ... after the difference link: "Die volgende stap laai…", "Inhoud", "Oor"
```

- **Before the script:** the line is read after "What is the difference?". It is plain text, not a live region, so it is read once.
- **After the script:** it is gone.
- **When the wizard module fails** (`r8/tree.mjs`): the line is not shown.

One caution for whoever extends the tests: Playwright's `ariaSnapshot()` leaves the line out (`wp50a-review8-probe-tree.log`), although Chromium exposes it. It sits in a `visibility: hidden` parent with `visibility: visible` itself. The e2e test checks `toBeVisible()` and the missing `aria-hidden`, which is sound. An `ariaSnapshot`-based assertion would fail for a reason that is not real.

### The backlog row

`docs/reviews/backlog.md:58` is accurate: a hanging module, or a throw in a module the wizard imports, leaves question 1 with "Loading the next step…" for good, and `204a2a2` was as stuck. See m2 for its link.

### The rest of the package

- **Rules.** The `src` diff `204a2a2..741f1dc` was searched for literal colours, `href="/…"` literals, direct storage access, `nowrap` and ellipsis. None was added (the only hit is a comment).
- **Accepted fixes.** Everything accepted in passes 1 to 7 still passes in the e2e, dom and unit runs above. The budget is unchanged at 24.0 KB.

## Minor

### m1. After Back, the kinds of business are saved in page order, so the primary type can change without a word

**Category:** minor. This is not a regression: on the same route `204a2a2` saved kinds the reader had unticked, or left Next dead (M1 of pass 7). It is also not one of the 11 items left unfixed. The set of kinds the wizard saves now always matches the ticks.

**Where:**

- `src/scripts/wizard.ts:142-146` (`#currentOrder`);
- `:232-233` (`#restore`, which on Back sets `#order` before the browser has put the ticks back);
- `src/lib/profile.ts:122-124` (the first kind is the primary type).

**Reproduced** with `r8/order.mjs` (`wp50a-review8-probe-order.log`): no saved answers, sole proprietor, tick "beauty" and then "food".

```
tip order: ticked beauty then food, straight through: ... saved {"entity":"sole-prop","businessTypes":["beauty","food"],"stage":"trading"}
tip order: ticked beauty then food, via "What is the difference?" and Back: ... saved {"entity":"sole-prop","businessTypes":["food","beauty"],"stage":"trading"}
```

**What happens.** On Back, `#restore` runs before the browser restores the ticks, so `#order` is empty (or the saved order). `#currentOrder()` then appends the restored ticks in page order. The page order is vehicle-dealer, food, beauty, and so on.

**What it costs.** The reader chose beauty first, and the profile now has food as its primary type. That type fills the branding prompts' blanks (`src/scripts/prompt-fill.ts:53`). With saved answers the same thing happens whenever the reader's order differs from the saved order and page order.

**Why minor.** The wizard never tells the reader that order matters. Every kind shown ticked is saved. A page served from the back/forward cache keeps the order. So the effect is a wrong example business in a prompt, not a wrong path.

**Fix.** Either of these:

- **Keep the order across the navigation.** Write `#order` to `history.replaceState` (or a `st.`-prefixed `sessionStorage` key through `src/lib/storage/`) on each change. Read it in `#sync` before falling back to page order, keeping only entries still ticked.
- **Record it as a known limit.** Put it next to the `#currentOrder` comment and in `docs/design-system.md` ("after Back without the cache the order is page order").

Add an order assertion to the Back e2e test either way.

**Backlog row:**

| WP-50a | Pass 8 minor 1: after Back without the back/forward cache, the wizard saves the kinds of business in page order, not the order ticked, so the primary type can change (it fills the branding prompts' blanks). | Keep `#order` in `history.state` and read it in `#sync`. | `WP-50a-pass8.md` |

### m2. The backlog row for "the wizard never becomes ready" links only pass 6

**Category:** minor (documentation).

**Where:** `docs/reviews/backlog.md:58`. The row names "Pass 6 minor 2 (part) and pass 7 minor 1", but its last column is only `` `WP-50a-pass6.md` ``. The pass 7 cases (a throw in `storage-notice`, in `path-data`, or in a dependency function) are only in `WP-50a-pass7.md`.

**Fix:** make the last column `` `WP-50a-pass6.md`, `WP-50a-pass7.md` ``.
