# 0007: Vendor a small set of third-party agent skills for design work, under a project skill

- Status: accepted
- Date: 2026-10-07

## Context

The site is built mostly by AI coding agents. Their frontend output tends toward the same generic looks and misses interaction details unless they are told otherwise. Agent Skills (a `SKILL.md` folder that Claude Code loads from `.claude/skills/`) are a way to give every agent session the same design guidance.

On 2026-10-07 we surveyed the most adopted design, UX and accessibility skills. Evidence came from GitHub stars and forks (exact, read through the GitHub API) and directory install counts (from search snippets only, since the directories were blocked from the build container, so order of magnitude). We kept skills that met three tests:

- they are open-source;
- they are framework-neutral or easy to read that way;
- they make no network calls and run no scripts.

Many popular skills fail on this project's constraints:

- some assume React, Tailwind or shadcn (`web-artifacts-builder`, `react-best-practices`);
- some load Google Fonts or CDN assets (`ui-ux-pro-max`, `hallmark`);
- `impeccable` runs a downloaded binary and writes hooks into settings;
- Vercel's `web-design-guidelines` wrapper fetches its rules from GitHub, unpinned, on every run;
- the strongest print and progressive-enhancement skills (`mgifford/accessibility-skills`) are AGPL-3.0.

## Decision

1. **Vendor four skills into `.claude/skills/`, pinned to a commit, each with its licence and an `UPSTREAM.md`** recording source, commit, date and project notes:

   | Skill | Source | Licence |
   | --- | --- | --- |
   | `frontend-design` | `anthropics/skills` | Apache-2.0 |
   | `web-interface-guidelines` | `vercel-labs/web-interface-guidelines` | MIT |
   | `accessibility` | `addyosmani/web-quality-skills` | MIT |
   | `review-animations` | `emilkowalski/skills` | MIT |

   The second vendors only the rules file. Its `SKILL.md` is written for this project and reads the local copy.
2. **Vendored files are not edited.** Project-specific differences go in `UPSTREAM.md`, in our own wrapper, or in the project skill. Updates are deliberate `chore(deps)` commits that diff and read every changed line.
3. **A project skill, `stoep-design`, sits above them.** It states the brief and the hard rules from CLAUDE.md and the build plan, and says that it wins over any third-party skill when they disagree.
4. **No vendored skill may fetch remote content, install packages or run scripts.** A skill that needs any of these is used as reading material, not vendored.
5. **AGPL material is not vendored.** Its print and progressive-enhancement rules are summarised in our own words in `stoep-design` or `docs/design-system.md` where they add something.

## Consequences

- Every agent session that touches the UI gets the same direction, review checklist and accessibility audit, without a network dependency.
- The skills ship with the repository, not with the site. They never reach a reader's browser, and the "only free and open-source dependencies" rule holds.
- Upstream improvements arrive only when someone updates the pin on purpose.
- The guidance has layers. A reader of a vendored skill has to remember that `stoep-design` and CLAUDE.md override it. The vendored `SKILL.md` files say nothing about this, so `stoep-design`'s description names them and CLAUDE.md points to it.
