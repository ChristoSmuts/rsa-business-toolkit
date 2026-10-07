# content-meta: checklist task keys and reading paths

Most files here are described in `docs/build-plan.md` (Part A). This page covers the three files
that decide where a reader's checklist ticks are saved (read it before you reword a task, link one,
or remove one), and `paths.json`, the "Find my path" rules ([Reading paths](#pathsjson-reading-paths)).

## How a tick is saved

Every checklist item has a task id: `<document id>:<first 8 hex digits of a hash of its wording>`.
So **rewording a task gives it a new id**.

A tick is saved on the reader's device under the task's **key**:

- `sameAs`, when the task is linked to a master-checklist task;
- otherwise the task's own id.

## `task-links.json`

`links` maps a document task to the master-checklist (`/checklist/`) task that asks for the same
action under the same condition. The pipeline emits the target as `sameAs`, so ticking either copy
ticks both.

The build fails when:

- either id is not a task;
- the link does not go from a document task to a master task;
- a target is itself linked (a chain);
- one master task is linked from two document tasks.

`considered` records pairs that were compared and deliberately left unlinked, with the reason.
The build ignores it. Add to it when you decide against a link, so the next editor can tell a
decision from a pair nobody looked at.

The build also checks `considered`: both ids must be tasks, and a considered task must not be
linked as well, so a reworded task cannot leave a stale entry behind.

### Removing or retargeting a link after release

Removing a link, or pointing it at another master task, changes the document task's key. The old
key is still a live key, because the master task still owns it, so nothing moves the tick and the
released-keys test passes. The master copy stays ticked, but **readers who ticked the document
copy find it unticked**. Moving the tick would be wrong, because the master task's tick belongs to
the master task. So decide knowingly, and say so in the commit.

## `task-renames.json` and `released-task-keys.json`

`released-task-keys.json` lists every key a released build has used.
`tests/content/validate.test.ts` fails when one of them is no longer a key. When you **reword a
task** (or otherwise change its id), add the old id to `task-renames.json`:

```json
{ "version": 1, "renames": { "core/register:1a2b3c4d": "core/register:5e6f7a8b" } }
```

The pipeline checks each entry:

- the new id is a task;
- the old id is not a task any more;
- there are no chains, so point every old id straight at the current one.

It writes `src/data/task-keys.json`, which maps each old key to the current key. That file also
holds every linked task's own id, mapped to its master task, so a link added after release moves
ticks too. When a checklist page loads, `src/scripts/checklist.ts` calls `renameChecks()`, which
moves any tick saved under an old key to the new one. **Without the entry, every reader who ticked
the task finds it unticked.**

After adding tasks, record their keys:

```
pnpm exec cross-env TASK_KEYS_UPDATE=1 vitest run --project content -t "released task key"
```

The update only ever adds keys. A key stays listed after it is renamed, so a rename entry that is
later removed is caught.

Removing a task outright is the one case with no new key to carry a tick to. Remove the key from
`released-task-keys.json` by hand in the same change, and say why in the commit.

## `paths.json`: reading paths

The rules "Find my path" follows (build plan A5, WP-31). There is one rule per stage, and each one
follows a numbered list in "How to use this toolkit" (`start/how-to-use`):

| Stage         | List in "Choose your path"                                        |
| ------------- | ----------------------------------------------------------------- |
| `not-started` | Path 1: I have not started yet                                    |
| `trading`     | Path 2: I am already trading and want to get compliant            |
| `pty-growing` | Path 4, generalised from a vehicle dealer to any kind of business |

Each step names the list `item` it comes from and the documents it adds:

```json
{
  "item": 5,
  "docs": ["core/tax-and-sars#route-4-small-business-corporation-rates-companies-only"],
  "whyWhen": { "businessTypes": ["vehicle-dealer"] }
}
```

- `docs`: document ids, optionally with `#heading` to open the document at one section, or
  `$businessTypes` for the reader's own business-type documents (primary type first, General
  expanded to `presets.general.expandsTo` in `business-types.json`).
- `when` (optional): the step is left out unless the profile matches (`entity` is a list of
  `sole-prop`, `pty`, `undecided`; `businessTypes` needs one in common).
- `whyWhen` (optional): the step's "why" (the words after the em dash in its list item) shows only
  when the profile matches. Path 4 is written for a dealer, so its reasons say so.

A document that does not apply to the reader (the A5 matching rule on its `appliesTo`) is left out
of every step, so a sole proprietor never gets "Running a Pty Ltd"; a document appears only at its
first step; empty steps are dropped and the rest renumbered. `checklist` lists the parts of the
master checklist that My path shows, filtered by the same rule.

The build fails (`scripts/content/paths.ts`, code `paths`) when the source document, a list or an
item does not exist, a step names a document or `#anchor` that does not exist, a step's documents
are not the ones its list item links to (a `#anchor` may narrow a link to one section;
`$businessTypes` needs an item that points at the business types), a list item is left out or used
twice, or a checklist part is not a heading of the checklist. **So when you change a path in the
markdown, the build tells you which rule to change with it.**

The pipeline writes `src/data/paths.json`: the rules, the business types in order, the General
preset, and the route, titles and `appliesTo` of every document a rule can name. The `paths` content
collection validates it; the browser bundles it for My path and loads it lazily elsewhere.
