# WP-50 phase 0: reader-journey audit of the nine B3 flows

Commit audited: `538366a`. Date: 9 October 2026. No source file was changed.

This audit walks the nine key flows in `docs/build-plan.md` B3 as the reader in `.claude/skills/stoep-design/SKILL.md`: a first-time sole proprietor on a cheap Android phone, on a slow connection, a little anxious about tax. It covers phase 0, item 4 of `docs/work-packages/WP-50-design-revamp.md`.

## How it was run

- `pnpm build`, then `pnpm preview` on port 4893 under `/business-toolkit/`. The preview server sends gzip, like GitHub Pages.
- Playwright 1.63 Chromium, headless, on Linux. Viewport 360×740, device scale 2, `isMobile` and touch on, an Android user agent.
- Network throttled through CDP to the DevTools "Slow 3G" preset (2,000 ms latency, about 400 kbit/s each way). CPU throttled 4× through CDP.
- English for all nine flows, then flows 1, 4 and 5 again in Afrikaans.
- Every page load starts from an empty cache unless the flow says otherwise.
- LCP comes from a `PerformanceObserver`. "Control works" is the time from navigation start until the custom element behind the main control is defined. Plain links work from first paint. "Tap to response" is the time from a tap until the expected change is in the DOM.
- The scripts are outside the repository. Each number comes from one run, so treat small differences as noise.

Screenshots are in `docs/reviews/WP-50-audit/flows/`, named `f<flow>-<lang>-<step>-<what>.webp`. Each one is 720×1480 (the 360×740 viewport at scale 2) unless its name ends in `-crop`.

Ranking: **High** blocks or misleads the reader. **Medium** slows or confuses them. **Low** is polish.

## Timings

| Flow | Page | LCP | Load event | Main control works | Tap to response |
| --- | --- | --- | --- | --- | --- |
| 1 | Home, EN | 6.7 s (AI line) | 10.6 s | "Find my path" is a link: at first paint | n/a |
| 1 | Find my path, EN | 4.3 s | 12.4 s | wizard ready at 12.4 s | radio 146 ms, Next 81 ms |
| 1 | My path, EN | 6.3 s | 14.3 s | 14.4 s | Mark as done to ring: 524 ms |
| 1 | Home / wizard / My path, AF | 6.6 / 4.3 / 6.2 s | 10.6 / 12.2 / 14.4 s | 12.3 s (wizard), 14.4 s (My path) | radio 107 ms, Next 109 ms |
| 2 | Home, returning, EN | 6.4 s | 10.4 s | "Your path" card shown at 10.5 s | n/a |
| 3 | Search dialog, EN | n/a | n/a | opens 149 ms after tap | first results 7.8 to 11.2 s after first keystroke |
| 3 | `/search/?q=vat`, EN | 18.7 s (results) | 12.4 s | results at 18.7 s, CLS 0.23 | n/a |
| 4 | Vehicle dealer, EN | 6.7 s | 14.7 s | contents list at 14.7 s | open contents 193 ms, tick 184 ms |
| 4 | Vehicle dealer, AF | 6.7 s | 14.6 s | 14.7 s | open contents 175 ms |
| 5 | Invoice, EN | 6.7 s | 13.0 s | form ready at 13.1 s | line amount 264 ms, Preview tab 124 ms |
| 5 | Invoice, AF | 6.7 s | 13.0 s | 13.1 s | line amount 281 ms, Preview tab 142 ms |
| 6 | Branding prompts, EN | 6.7 s | 12.7 s | copy ready at 12.8 s | Copied 150 ms, fill 287 ms |
| 7 | Switch EN to AF, tax page | 6.4 s (AF) | 12.3 s | n/a | tap to Afrikaans page loaded: 12.5 s |
| 8 | Checklist, EN | 6.6 s | 14.9 s | 15.0 s | tick to progress 156 ms |
| 9 | Home, first visit | 6.7 s | 10.6 s | n/a | 142 KB transferred, 97 KB of it fonts |

Once a page has loaded, every control answers a tap within 300 ms; only "Mark as done" takes 524 ms. The slow part is the wait before scripts run: 8 to 10 seconds between first paint and working controls on every tool page. Flows 1, 3 and 5 show what that costs.

## Flow 1: first visit, Find my path, My path

Steps, in English and then in Afrikaans:

1. Home, first view (`f1-en-01-home-first-view`). Above the fold: header (two rows), H1, lead, AI notice, "Find my path", "I know what I need". "Where to start" sits on the fold line. Next: tap "Find my path".
2. Wizard step 1 (`f1-en-03-wizard-step1`, `f1-af-03-wizard-step1`). Above the fold: header (three rows), breadcrumb, H1, lead, three-step stepper, "Question 1 of 3", and the legend. The first answer starts on the bottom edge. Next: scroll, then choose how you trade.
3. Choose sole proprietor (`f1-en-05-wizard-step1-chosen`), then Next.
4. Step 2 (`f1-en-07-wizard-step2`, `f1-af-08-wizard-step2-after-1s`): choose a business type, then Next.
5. Step 3 (`f1-en-13-wizard-step3-submit-visible`): choose "I have not started yet", then "See my path".
6. My path (`f1-en-14-my-path`, `f1-af-15-my-path`), then scroll through the steps (`f1-en-15-my-path-scroll1`) and the checklist (`f1-en-18-my-path-checklist-crop`).

Findings:

- **High: the wizard's Next button is visible but does nothing for about 8 seconds.** On Slow 3G, Next appears at 4.6 s. The wizard script is ready only at 12.4 s. A tap on Next at 4.7 s did nothing, and nothing happened when the script loaded either: the reader stays on step 1 with no message (`f1-en-19-next-tapped-before-scripts`). The `js-only` controls are shown as soon as the inline head script adds the `js` class, before the module scripts have loaded. A reader who taps and sees nothing will think the site is broken. The invoice tabs in flow 5 behave the same way.
- **Medium: the header grows from two rows to three after load, and the page jumps.** At first paint the header is two rows (112 px). When scripts add the "/" key hint to Search and, with a profile, the path ring, the Menu button wraps to a third row. The page moves down 52 px at about 11 to 12 s, when the reader may be about to tap. Measured layout shift: 0.21 on the Afrikaans wizard and My path, 0.13 on the English wizard. At three rows the header takes 165 px, 22% of the screen (`f1-en-03-wizard-step1`, `f1-af-15-my-path`). The "/" key hint means nothing on a phone.
- **Medium: on step 1, no answer is above the fold.** The stepper wraps into two rows. The same question then appears three times: "Step 1 of 3: How you trade", "Question 1 of 3: How you trade" and "How do you trade, or plan to trade?". The first answer card starts at 725 px of a 740 px screen (`f1-en-03-wizard-step1`, `f1-af-03-wizard-step1`).
- **Medium: each Next scrolls back up to the H1 and the stepper.** On step 2 in Afrikaans the page settles with the H1 and stepper in view and the first answer at about 590 px (`f1-af-08-wizard-step2-after-1s`). The reader has to scroll down again on every step to reach the answers and the next button.
- **Medium: My path shows no step above the fold.** On arrival the reader sees the header, H1, lead, the "saved on this device" line, their answers and the ring. Step 1 starts at about 700 px (`f1-en-14-my-path`).
- **Medium: the progress ring in the header is an empty grey circle with no number or words** (`f1-en-14-my-path`, `f1-af-15-my-path`). At 0% it looks like a loading spinner that never finished. Its name ("My path: 0 of 9 steps done") is only for screen readers.
- **Medium: step 2 of the path is "Pick your business type", but the reader has just picked it in the wizard** (`f1-en-15-my-path-scroll1`). Its reason, "find your business type", repeats what they already did. Step 3, "Services and trades", has no "Why this step" line.
- **Medium: checkboxes in the checklists change size.** A one-line item has a 20 px box. A box next to text that wraps shrinks to about 14 px and moves the text out of line (`f1-en-18-my-path-checklist-crop`). It looks broken. Cause: `.st-check > input` in `src/styles/base.css` has no `flex-shrink: 0`. The same thing happens on every checklist (flows 4 and 8).
- **Low: the "Saved on this device only. Nothing is sent anywhere." line touches the "Your answers" heading below it**, with no space between them (`f1-en-14-my-path`).
- **Low: the disabled Next button has a dashed border and a grey fill.** It looks unfinished more than unavailable. The hint under it ("Choose at least one kind of business.") does explain it (`f1-en-07-wizard-step2`).
- **Low: a tapped answer card flashes the browser's default blue tap highlight**, which is not a Stoep colour (`f1-en-05-wizard-step1-chosen`).
- **Low: in the path, tax and SARS is step 8 of 9, after branding (step 5) and free tools (step 6).** For a reader whose main worry is tax, that order may feel wrong. The order is a content decision, so the owner should confirm it.

What works and should stay:

- The hero answers "what is this and is it for me" in one screen. The AI notice is short and sits next to the two main actions (`f1-en-01-home-first-view`).
- The answer cards are large and plain. Each one has a one-line explanation, and the Pty Ltd option explains CIPC in words.
- "I have not decided" is a real, reassuring option ("That is fine. You see the steps for both.").
- The answer chips, the "Edit answers" link and the "Why this step" lines on My path.
- Focus moves to the new step's heading after Next, as B5 asks.
- Afrikaans strings fit everywhere in this flow at 360 px. Nothing is truncated.

## Flow 2: returning visitor

Steps (English, with the profile saved in flow 1):

1. My path: tap "Mark as done" on step 1 (`f2-en-02-my-path-top-after-mark`). The ring in the header and the ring on the page both update.
2. Home again (`f2-en-03-home-returning`). Above the fold: header with the small ring, then the "Your path" card ("1 of 9 done", "Continue: step 2 of 9", "Open my path", "Edit answers"), then the H1. Next: tap Continue.
3. Continue opens `/business-types/`, "Pick your business type".

Findings:

- **Medium: "Continue: step 2 of 9" sends the reader to "Pick your business type", which they already answered in the wizard.** It feels like being sent back to the start. See flow 1.
- **Medium: the header ring is a 28 px ring with no number or label** (`f2-en-02-my-path-top-after-mark`, `f2-en-03-home-returning`). A first-time reader cannot tell what it is or that they can tap it to reach My path.
- **Medium: there is no notice when the content changes.** B3 asks for a dismissible notice that links to "what has changed". `st.seenVersion` is defined in `src/lib/store.ts`, but nothing reads it and nothing shows a notice. A returning reader is not told that rules or amounts have changed since their last visit.

What works and should stay:

- The "Your path" card above the hero, with one clear primary action and a progress ring that shows a percentage (`f2-en-03-home-returning`).
- "Mark as done" turns into "Done" with an icon and a "Remove the tick" action. The status is not shown by colour alone.

## Flow 3: search first

Steps (English, first visit):

1. Home: tap Search in the header. The dialog opens 149 ms after the tap, focus is in the field, and "Common questions" are shown (`f3-en-01-dialog-open`).
2. Type "do i need to register for vat". While the index downloads, the dialog does not change (`f3b-en-03-dialog-while-loading`). The first results appear 7.8 to 11.2 s after the first keystroke (`f3-en-04-dialog-results-vat`).
3. Type "tax number", then "provisonal tax" (misspelt). Results are relevant and the misspelling is handled.
4. Tap the first result, a glossary entry. The page is blank at first (`f3-en-07-result-landing`). About 2 s later the target term has focus and a highlight (`f3-en-08-result-landing-after-2s`).
5. Open `/search/?q=vat` directly (`f3-en-09-search-page-vat`).

Findings:

- **High: search gives no sign that it is loading.** On Slow 3G the index (167 KB gzipped) takes 8 to 11 s to arrive after the first keystroke. Until then the dialog still shows "Common questions" under the typed words, and the status line is empty (`f3b-en-03-dialog-while-loading`). The reader will think nothing matched or that search is broken, and may close it. The "Loading search…" string exists, and the search page shows it, but the dialog does not.
- **Medium: on `/search/?q=vat`, "Loading search…" stays for 18.7 s.** When the results arrive they push the page down (CLS 0.23) (`f3-en-09-search-page-vat`).
- **Medium: an off-topic result with jargon ranks third.** For "do i need to register for vat", the third result is "How to get the BRNC" from the vehicles page. It matched "registered", and BRNC is not explained in the result (`f3-en-04-dialog-results-vat`).
- **Medium: the count line is hard to read.** "13 of 200 results shown (46 match every word)" is engine language. On the search page, a one-word query shows "59 results (56 match every word)", which does not make sense for one word.
- **Medium: the landing page appears blank, and the "Now reading" pill names the wrong section at first.** After the tap, the glossary was blank for at least 400 ms, with a pill that said "Registration and compa…" (`f3-en-07-result-landing`). This is a long, 24,000 px page on a 4× slowed CPU. The pill then corrected itself to "Tax" and the target got its focus ring (`f3-en-08-result-landing-after-2s`). The pill floats over the body text without a backing band.
- **Low: "I know what I need" opens search, but its label does not say so.** A reader who wants search does not see the word, and a reader who taps it does not expect a search box.
- **Low: the field's clear button is the browser's blue ×**, not a Stoep colour (`f3-en-04-dialog-results-vat`).

What works and should stay:

- The dialog opens at once and the common questions are real reader questions (`f3-en-01-dialog-open`).
- Results are grouped by section, matches are marked, and the type ("Quick answer", "Page section", "Glossary") is shown in words.
- The misspelling "provisonal" still found provisional tax.
- The landing target gets focus and a visible highlight.

## Flow 4: long document on a phone (vehicle dealer)

Steps, in English and then in Afrikaans:

1. Open `/business-types/vehicle-dealer/` (`f4-en-01-doc-first-view`). Above the fold: header, breadcrumb, section label, H1, lead, "28 min read", effort meter, and the top of the AI notice.
2. Scroll one screen at a time to reach the content (`f4-en-02-doc-screen2`, `f4-en-03-doc-screen3`, `f4-af-02-doc-screen2`).
3. Open "On this page (41 sections)" (`f4-en-05-toc-open`) and tap the VAT section (`f4-en-07-after-toc-jump`, `f4-af-07-after-toc-jump`).
4. Read four screens (`f4-en-08-reading-1`).
5. Jump to the startup checklist and tick an item (`f4-en-12-checklist-start`, `f4b-en-06-first-item-with-link`).
6. Read the sources and the pager at the end.

Findings:

- **High: the first content heading is 4.4 screens down in English and 5.2 in Afrikaans.** "Quick answer: what you must have" starts at 3,291 px in English and 3,819 px in Afrikaans. Before it come the H1 block, the AI notice (which must stay), a "Read Core first" callout, and "Words used in this file". That word list is open on phones and lists 15 terms (`f4-en-03-doc-screen3`). B6 asks for it to be open on desktop only. In Afrikaans the translation notice adds most of a screen (`f4-af-02-doc-screen2`). The reader came for the quick answer and has to scroll past a word list to find it.
- **Medium: tapping a checklist item can open another page instead of ticking it.** Some items contain a link, for example "Decide sole proprietor or company (Register: what you actually need)". The link covers 215×46 px of the 277×95 px row. A tap in the middle of the row opened `/core/register/`, and the reader lost their place on a 28-minute page. This affects 3 of 24 items here, 4 of 94 on `/checklist/` and 7 of 153 on My path (`f4b-en-06-first-item-with-link`).
- **Medium: no back-to-top control, and the header does not stay on screen on a phone.** The page is 41,406 px tall (56 screens). B3 asks for back-to-top after two screens. The `backToTop` string is in `en.json` but nothing uses it. To reach search or the menu from the sources at the end, the reader has to scroll all the way up. The pill does open the contents list.
- **Medium: the "Now reading" pill cuts headings off with an ellipsis.** Examples: "VAT: register earlier than …" and, in Afrikaans, "BTW: registreer vroeër as …" (`f4-en-07-after-toc-jump`, `f4-af-07-after-toc-jump`). Rule 8 of `stoep-design` says nothing translated truncates. The pill also floats over body text with nothing behind it, so lines show above and below it (`f4-en-08-reading-1`).
- **Low: once, a jump to the checklist left the screen blank for at least 500 ms** (`f4-en-12-checklist-start`). It happened on 2 of 4 long jumps in this audit (see also flow 3). A repeat of the same jump drew the page within 250 ms, so check this on a real low-end phone before acting on it.
- **Low: the "On this page" list has 41 entries.** It is collapsed by default, which is right, but once open it takes several screens.
- **Low: "Words used in this file".** "File" is the markdown's word. The reader is reading a page. The Afrikaans heading has the same problem ("lêer").
- **Low: on a phone the breadcrumb is a single chevron and one link ("› Your kind of business"),** which looks as if its start is cut off (`f4-en-01-doc-first-view`).
- **Low: the 2 px reading-progress bar in B3 is not on the page.** The `readingProgress` string is unused.
- **Low (content, Afrikaans):** "Die VAT Act los dit op." mixes English into the translation (`f4-af-07-after-toc-jump`). This is for the `af` content workflow, not the design.

What works and should stay:

- The "In plain words" callouts. They are large, warm and never collapsed, and they are the most reassuring thing on the page for this reader (`f4-en-08-reading-1`).
- The AI notice is plain and short and says who checked the page and when (`f4-en-02-doc-screen2`). In Afrikaans the translation notice says clearly that no person checked the translation and links to the English (`f4-af-02-doc-screen2`).
- A jump from the contents list lands with the heading clear of the pill.
- Ticking takes 184 ms. Every tick is saved, and "Ticks are saved on this device only." sits next to the list.
- Sources at the end show "Official source" or "Not an official source" in words.

## Flow 5: fill and print an invoice

Steps, in English and then in Afrikaans, with no profile:

1. Open `/templates/invoice/`. Above the fold: header, breadcrumb, section label, H1 "INVOICE", lead, read time, and the top of the AI notice.
2. Scroll 2.5 screens (3.2 in Afrikaans) to reach the Fill in / Preview tabs and the first field (`f5-en-02-screen2`, `f5-af-03-screen3`).
3. Type the business name, a line description, a quantity and a unit price (`f5-en-07-line-filled`). The line amount shows "R 850.00" 264 ms after typing.
4. Tap Preview (`f5-en-09-preview`, `f5-en-10-preview-2`).
5. Scroll to the required-items list and Print (`f5-en-11-required-items-crop`, `f5-en-12-print-button`, `f5-af-12-print-button`). Tap "Print or save as PDF". `window.print()` was called once.
6. Print emulation of the sheet (`f5-en-14-print-media-full`).

Findings:

- **High: the page tells the reader to do something the form does not need.** Directly above the form it says: "Make a copy, rename it to the invoice number, replace everything in [SQUARE BRACKETS], then export to PDF." (`f5-en-09-preview`, `f5-af-03-screen3`). That instruction is for the document template in the markdown (`docs/rsa-business-toolkit/03 Paperwork and templates/templates-to-fill-in/02-invoice-not-vat-registered.md`), not for this web form. A first-time reader will look for a file to copy.
- **High: the Fill in and Preview tabs are visible from 4.6 s but do nothing until the form script is ready at about 13 s.** A tap on Preview at 4.6 s was lost: after load the Preview tab was still not selected. This is the same cause as the wizard in flow 1.
- **Medium: the first field is 2.5 screens down (1,886 px) in English and 3.2 screens down (2,344 px) in Afrikaans.** Before it: the AI notice, a note with the check date, the "use this one if" paragraph, a note with four "Do NOT" rules, the copy instruction above and the device-storage line (`f5-en-02-screen2`).
- **Medium: after the preview, "4 of 18 required items present" is followed by 14 bare links, with no words saying these items are missing** (`f5-en-11-required-items-crop`). Print is about 700 px below the count (`f5-en-12-print-button`). A reader may not see that the links are the gaps, and has to scroll past all of them to print.
- **Low: capitals that read as shouting.** The H1 is "INVOICE" and the total is "AMOUNT DUE", which are correct on the printed sheet but not as the page heading. The notes say "Do NOT" four times. For an anxious reader the capitals read as a warning.
- **Low: the invoice date and the due date are not filled in.** The preview shows "[DD Month YYYY]" until the reader types a date. Filling in today's date would save a step.

What works and should stay:

- The line amount and the total update while the reader types, in the house format "R 850.00".
- The preview shows each missing item as a highlighted "[Customer name]" placeholder, which is clear (`f5-en-10-preview-2`).
- The printed sheet is clean. Missing items become blank lines to fill in by hand (`f5-en-14-print-media-full`).
- "Print or save as PDF" says what it does, and the hint under it explains Save as PDF. "Start next invoice" says what it keeps.
- "What you type is saved on this device only. Nothing is sent anywhere."
- The Afrikaans labels ("Druk of stoor as PDF", "Begin volgende faktuur") fit without wrapping problems (`f5-af-12-print-button`).

## Flow 6: copy a prompt

Steps (English, with a profile):

1. Open `/branding/branding-prompts/`. Above the fold: the same header block as flow 4.
2. Scroll to "Prompt 2", which has the only "Fill from my profile" button, at 14,063 px. Tap it. The message "2 blanks left to fill in" appears 287 ms later, and the button becomes "Undo" (`f6-en-06-after-fill`).
3. Scroll to the first copyable prompt, at 7,709 px. Tap "Copy prompt". The button shows "Copied" 150 ms later and the clipboard holds the prompt (`f6-en-08-after-copy`).

Findings:

- **Medium: the "copied" message uses different numbers from the headings.** Copying "The refine prompt" announces "Prompt 1 copied". The prompt under the heading "Prompt 0" announces "Prompt 4 copied", and the one under "Prompt 1" announces "Prompt 5 copied" (`f6-en-08-after-copy`). A reader working through the numbered prompts is told the wrong number.
- **Medium: the first prompt is 10 screens down (7,709 px).** Before it come the header block, an open list of 16 terms, a 35-section contents list and two sections of advice. On a phone the reader has to scroll a long way to reach the thing the page is for.
- **Low: after "Fill from my profile", the filled-in text is above the screen.** Only "2 blanks left to fill in" is in view, so the reader cannot see what changed (`f6-en-06-after-fill`).
- **Low: the prompts' own line breaks fall mid-sentence at 360 px** ("without / looking unprofessional") (`f6-en-06-after-fill`).

What works and should stay:

- The copy feedback: "Copied", then back to "Copy prompt" after a few seconds, with a written confirmation under it.
- Placeholders are highlighted with a dashed underline, and the line under each prompt says "Words in [square brackets] are blanks."
- Copying works first time and copies the whole prompt.

## Flow 7: switch language

Steps (English to Afrikaans):

1. Open `/core/tax-and-sars/` and scroll to "Provisional tax" (`f7-en-02-en-doc-midway`). The header with the language links is no longer on screen.
2. Scroll back to the top and tap "Afrikaans". The Afrikaans page loads 12.5 s after the tap and opens at the top, with no anchor (`f7-en-03-af-doc`).
3. Later, open the English home page. A banner offers "Gaan voort in Afrikaans" (`f7-en-06-en-home-banner`).

Findings:

- **Medium: switching language loses the reader's place.** The reader was in "Provisional tax", but the Afrikaans page opens at the top of a 19,000 px page (`f7-en-02-en-doc-midway`, `f7-en-03-af-doc`). Heading ids are shared across languages, so the switch could keep the current section. The reader also has to scroll back to the top to find the switch at all.
- **Medium: the language banner is added after the home page has drawn, and pushes the page down.** Measured layout shift: 0.144 (`f7-en-06-en-home-banner`). This is above the 0.1 limit in the WP-50 measures of done.
- **Low: the banner has three buttons, and two do the same thing.** "Bly op hierdie bladsy" and the × button both close it.

What works and should stay:

- The switch is two plain links, "English" and "Afrikaans", each in its own language, with the current one marked.
- The banner offers Afrikaans and does not redirect.
- On Afrikaans pages the translation notice sits directly under the AI notice and links to the English version (B6, D5).

## Flow 8: checklist ticks

Steps (English):

1. Open `/checklist/`. Above the fold: the header block and the top of the AI notice.
2. Scroll 4.7 screens to reach the first checkbox, at 3,444 px (`f8-en-03-screen3`, `f8-en-04-screen4`).
3. Tick two items. Progress shows "1 of 34" 156 ms after the first tap (`f8-en-06-two-ticked`).
4. Reload. Both ticks are kept.
5. Repeat with `localStorage` blocked, as in some private modes (`f8b-en-01-blocked-after-tick`).

Findings:

- **Medium: the "Key to the short words" table cuts its second column off mid-word** ("The customer data pro…") and needs sideways scrolling, even though it has only two columns (`f8-en-04-screen4`). Cause: `.st-table-scroll > table { min-inline-size: 36rem }` in `src/components/ui/TableScroll.astro` applies to every table, so this one is 576 px wide on a 360 px screen. The caption that says "Scroll sideways" is hidden. For a reader who needs the key to understand the abbreviations, this is the table that matters most.
- **Medium: the first checkbox is 4.7 screens down.** Before it: the AI notice, a note, "Your progress" with three bars, the Show filter, "Remove ticks", the contents list, "Print this. Tick as you go." and the key table (`f8-en-03-screen3`).
- **Medium: the "Now reading" pill can be out of date.** With Part A filling the screen, the pill still said "Key to the short words" (`f8-en-06-two-ticked`).
- **Medium: checkbox size changes with the item's length.** This is the same cause as flow 1.

What works and should stay:

- A tick answers at once and updates the group's progress. Ticks survive a reload.
- With storage blocked, a warning appears right above the list. It says what happened and what still works ("You can still tick items, but the ticks are lost when you close the page.") (`f8b-en-01-blocked-after-tick`).
- "This checklist helps you remember what to do. Ticking every item does not prove that you follow the law." This is the right tone for this reader.
- The "Everything" and "Not done yet" filter.

## Flow 9: low data

Steps (English):

1. Home and the vehicle-dealer page with default settings: 142 KB on the first home visit, of which 97 KB is the two preloaded fonts (Fraunces 67 KB, Instrument Sans 30 KB). The vehicle-dealer page then cost 52 KB with the fonts cached.
2. Look for a low data setting in the footer. The footer has only "Contents", "About" and "How this was made and how to check it".
3. Find "Low data mode" on `/about/`, 2,025 px down, under "Single-key shortcuts" (`f9-en-03-about-setting-on`). Turn it on. `data-low-data` is set 150 ms later.
4. Clear the cache and load the home page again: still 142 KB, and both fonts are still downloaded. The page draws in system fonts (`f9-en-04-home-low-data`).

Findings:

- **Medium: low data mode does not stop the font downloads.** Every page head has `<link rel="preload">` for both fonts, so the browser fetches 97 KB of fonts it will not use. On Slow 3G that is about 2 seconds of the reader's data and time on a first visit. The setting's help text says "Uses the fonts on your device".
- **Medium: a reader on prepaid data will not find the setting.** B3 puts the low data toggle in the footer. It is only on the About page, below a keyboard-shortcut setting that means nothing on a phone (`f9-en-03-about-setting-on`).

What works and should stay:

- No raster images anywhere in the nine flows. The illustrations are inline SVG.
- The page in system fonts still reads well and keeps its hierarchy (`f9-en-04-home-low-data`).
- With the fonts cached, a 28-minute document costs about 52 KB.

## Notes that cover several flows

- Every content page has the same top block: breadcrumb, section label, H1, lead, read time, the AI notice and its status line. On a 360 px phone that block alone fills one to 1.5 screens. Rule 9 keeps the AI notice near the top, and it should stay there. But what comes after it (open word lists, notes, contents lists, callouts) decides whether the reader reaches the content in two screens or in five.
- LCP is between 6.2 and 6.8 s on every page, and the LCP element is usually the lead paragraph or the AI line. Scripts finish 12 to 15 s after navigation. Any control that needs a script should either stay hidden until then or work without it.
- Nothing translated was cut off except the "Now reading" pill.

## The five changes that would most help this reader

1. **Show no control until it works, and say when the reader is waiting.** Keep the wizard's Next and the template tabs hidden until their element is defined, or let them work as plain form controls until then. In the search dialog, show "Loading search…" as soon as the reader types, and start fetching the index when the dialog opens (except in low data mode).
2. **Make the phone header one row, and keep it from growing after load.** Drop the "/" hint on touch screens. Move the language links into the menu, or shorten them. Give the path ring a visible number. A short header can then stay on screen, which also gives the reader search and the menu from deep in a long page.
3. **Put the content within two screens of the top on documents, the checklist, templates and prompts.** Keep the AI notice where it is. Close "Words used in this file" on phones, as B6 says. Move the template's copy-a-file instruction off the web form. Shorten the top of the wizard so the first answer is in view.
4. **Keep the reader's place.** The language switch should keep the current section's anchor. Add the back-to-top control from B3. The "Now reading" pill should wrap instead of truncating, and update reliably. "Continue" on My path should skip the "Pick your business type" step the wizard has already answered.
5. **Make low data mode do what it says, and put it where the reader will find it.** Skip the font preloads when `st.lowData` is on or `prefers-reduced-data` is set, and put the toggle in the footer as B3 planned. On a first visit, fonts are about two-thirds of the home page's bytes.

## Screenshots

There are 50 WebP files in `docs/reviews/WP-50-audit/flows/`, 2,518,206 bytes (2.4 MB) in total. Each file is under 150 KB, and only screenshots cited above are included.
