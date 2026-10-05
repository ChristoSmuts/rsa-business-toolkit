# content-meta: checklist task keys

Most files here are described in `docs/build-plan.md` (Part A). This page covers the three files
that decide where a reader's checklist ticks are saved. Read it before you reword a task,
link one, or remove one.

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
