# SA Business Toolkit (web app)

A free, searchable guide for one person running a business in South Africa, as a sole proprietor or as a one-person Pty Ltd. It helps with registration, tax and SARS, licences, branding, paperwork templates and a master checklist.

The app is built from the markdown toolkit in `docs/rsa-business-toolkit/`. It is available in English and Afrikaans, and it is designed to add the other official South African languages later.

> The toolkit was written by an AI assistant and checked against official South African sources on 13 September 2026. Rules and fees change. Check the official source before you pay, sign or file anything. This is general information, not legal, tax or financial advice.

## Status

Under active development. See `CHANGELOG.md` and `docs/build-plan.md`.

## Requirements

- Node.js 22.12 or later (24 recommended, see `.nvmrc`)
- pnpm 11

## Quick start

```bash
pnpm install
pnpm dev
```

Open the address that Astro prints. The site runs under the base path `/business-toolkit/` by default.

## Scripts

| Script              | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `pnpm dev`          | Start the development server                         |
| `pnpm build`        | Build the static site into `dist/`                   |
| `pnpm preview`      | Serve the built site locally                         |
| `pnpm lint`         | ESLint, Prettier check and Stylelint                 |
| `pnpm typecheck`    | `astro check`                                        |
| `pnpm test`         | Unit and DOM tests (Vitest)                          |
| `pnpm test:content` | Content validation tests                             |
| `pnpm test:e2e`     | End-to-end tests (Playwright) against the built site |
| `pnpm test:a11y`    | axe accessibility checks on every page               |
| `pnpm test:visual`  | Screenshot comparison                                |
| `pnpm gate:fast`    | Lint, types, unit and content checks                 |
| `pnpm gate`         | Everything CI runs                                   |

On Windows you can run the same steps as CI with:

```bash
powershell -ExecutionPolicy Bypass -File scripts/ci/local-gate.ps1
```

## How the content works

The markdown in `docs/` is the source of truth. A script turns it into typed JSON under `src/data/`, which the site reads at build time. Do not edit the JSON by hand. Change the markdown and regenerate.

Afrikaans content lives in `docs/rsa-business-toolkit-af/` with the same file paths as English. An automated fidelity check fails the build if a translation changes a number, form code, link or placeholder. Afrikaans pages show a notice that the text is a machine translation that has not been reviewed by a person.

## Deployment

GitHub Actions builds and deploys the site to GitHub Pages on every push to `main`. Set these repository variables after the repository is created:

| Variable    | Example                     |
| ----------- | --------------------------- |
| `BASE_PATH` | `/business-toolkit/`        |
| `SITE_URL`  | `https://<owner>.github.io` |

In the repository settings, set the Pages source to GitHub Actions.

## Project documents

- `CLAUDE.md`: working rules for AI build agents
- `docs/build-plan.md`: the approved build plan
- `docs/adr/`: architecture decision records
- `docs/reviews/`: review protocol and review reports
