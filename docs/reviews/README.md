# Review protocol

Every work package is reviewed before it is merged into `main`. This file is the checklist reviewer agents follow. The full rationale is in `docs/build-plan.md`, Part D4.

## What the author hands over

- Branch or worktree path, and the final commit SHA.
- `git diff --stat main...<branch>`.
- The acceptance checklist from the package brief, ticked.
- Verbatim output of `pnpm gate:fast`, plus `pnpm build` and any Playwright projects the package touches.

## What the reviewer does

1. Re-run the gate yourself. Never trust pasted output.
2. Check file ownership: `git diff --name-only main...<branch>` must stay inside the package's allowed paths.
3. Review through five lenses:
   - **Correctness.** Edge cases, error paths, deterministic output on Windows and Linux, no silent data loss.
   - **Accessibility.** Roles and names, focus order, keyboard use, live regions, contrast through tokens only, reduced motion, 44px targets, works without JavaScript.
   - **Internationalisation.** No hard-coded UI strings, both locales render, anchors shared across languages, `href()` used for every internal link.
   - **Performance.** JavaScript budget per page, no layout shift, search loaded lazily, no unneeded dependencies.
   - **Security.** Compatible with the meta CSP, no unsanitised `innerHTML`, no third-party requests, no secrets.
4. Write findings to `docs/reviews/<package>-pass<n>.md`.

## Finding format

```
### <severity>: <short title>
File: path/to/file.ts:42
Acceptance item: <which item it violates, or "general quality">
What is wrong: <one or two sentences>
How to reproduce: <command or steps>
Suggested fix: <optional>
```

Severities:

| Severity | Meaning |
|---|---|
| blocker | Wrong behaviour, broken build, accessibility or security failure. Must be fixed. |
| major | Missing required behaviour or test, ownership breach, maintainability risk. Must be fixed before merge. |
| minor | Worth fixing. May move to `backlog.md` with a reason. |
| nit | Optional polish. |

## Passing

- A pass is clean when it has zero blocker and zero major findings.
- A package merges only after two consecutive clean passes. The second pass reviews the whole diff again, not only the fixes.
- Packages that touch `src/lib/**` or `src/pages/**` get the second pass from a different reviewer instance.
- Reviewers never edit the author's code. They may add a failing test that reproduces a finding, in a separate commit clearly labelled as such.

## After merge

The orchestrator runs `pnpm gate:fast` and the affected Playwright projects on `main`. If `main` goes red, the merge is reverted and the package goes back to review.
