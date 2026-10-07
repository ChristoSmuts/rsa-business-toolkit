# Upstream

| | |
| --- | --- |
| Source | `anthropics/skills`, folder `skills/frontend-design/` |
| Commit | `683bc88e56f3e09ba94f7055977f3d3aa499f202` (2026-10-05) |
| Licence | Apache-2.0 (`LICENSE.txt`, shipped in the skill folder) |
| Vendored | 2026-10-07 |

`SKILL.md` and `LICENSE.txt` are unmodified. The same `SKILL.md` also ships in `anthropics/claude-code/plugins/frontend-design/`, but that repository's licence is Anthropic's commercial terms, so this copy comes from `anthropics/skills`.

This skill pushes for distinctive, risk-taking design. In this project it works under `.claude/skills/stoep-design/SKILL.md`, which sets the brief (a calm, trustworthy reference guide), routes every colour through `src/styles/tokens.css` and requires self-hosted fonts. Where they disagree, Stoep wins.

To update: copy the folder at a named commit, diff it, read every change, and commit it with this table updated in one `chore(deps)` commit.
