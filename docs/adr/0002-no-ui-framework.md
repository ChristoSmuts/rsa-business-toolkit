# 0002: No UI framework; custom elements enhance server-rendered HTML

- Status: accepted
- Date: 2026-09-15

## Context

Interactive parts are small: ticking checklists, copying prompts, a three-step wizard, a template form with live totals, a search dialog, a theme control. Readers are often on low-cost phones with limited data. Every page must stay usable without JavaScript.

## Decision

Do not use Preact, Svelte, Solid or React. Astro renders the full HTML for every feature. Small vanilla TypeScript custom elements named `st-*` attach behaviour to that HTML. Shared state lives in `src/lib/store.ts` using `nanostores` and `@nanostores/persistent`.

## Consequences

- Interactive JavaScript stays under about 25 KB gzipped per page.
- Logic such as the path engine and placeholder parser is written as pure modules and unit-tested without a DOM.
- There is no hydration gap where controls are visible but do nothing.
- Developers write a little more DOM wiring by hand. Each element follows the same rules: the constructor does nothing, `connectedCallback` wires listeners, and all state changes go through the store.
