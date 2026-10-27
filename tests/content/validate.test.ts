import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildContent } from '../../scripts/content/build';
import { ProvenanceSchema } from '../../scripts/content/config';
import { docFileName } from '../../scripts/content/ids';
import { blockRunLists, runsToText, walkRuns } from '../../scripts/content/text';
import { diffOutputs } from '../../scripts/content/write';
import {
  BusinessTypesFileSchema,
  DocSchema,
  GlossaryFileSchema,
  ManifestSchema,
  QuickAnswersFileSchema,
  SECTION_IDS,
  SourcesFileSchema,
  TaskKeysFileSchema,
  TasksFileSchema,
  type Block,
  type Doc,
  type InlineRun,
} from '../../src/lib/content/schema';
import { effortReason } from '../../src/lib/business-types';
import { docLead } from '../../src/lib/pages';
import { isTemplateSlug } from '../../src/lib/templates/draft';
import { formHowToKey, formIntro } from '../../src/lib/templates/intro';
import { parseTemplate } from '../../src/lib/templates/placeholders';
import { useTranslations } from '../../src/i18n';
import type { Locale } from '../../src/i18n/locales';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dataDir = join(repoRoot, 'src', 'data');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const manifest = ManifestSchema.parse(readJson(join(dataDir, 'manifest.json')));
const langs = Object.keys(manifest.langs) as (keyof typeof manifest.langs)[];
const docsByLang = new Map(
  langs.map((lang) => {
    const dir = join(dataDir, lang, 'docs');
    const docs = readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => DocSchema.parse(readJson(join(dir, name))));
    return [lang, docs] as const;
  }),
);
const enDocs = docsByLang.get('en') ?? [];
const enById = new Map(enDocs.map((doc) => [doc.id, doc]));
const meta = JSON.parse(readFileSync(join(repoRoot, 'content-meta', 'docs.meta.json'), 'utf8')) as {
  docs: { id: string; source: string }[];
};

function allRuns(doc: Doc): InlineRun[] {
  const runs: InlineRun[] = [];
  for (const block of doc.blocks)
    for (const list of blockRunLists(block)) walkRuns(list, (run) => runs.push(run));
  return runs;
}

/** Sentences of visible text. Inline code is excluded (it quotes, it does not state). */
function sentences(doc: Doc): string[] {
  const out: string[] = [];
  const strip = (runs: readonly InlineRun[]): InlineRun[] =>
    runs.flatMap((run): InlineRun[] => {
      if (run.t === 'code') return [];
      if (run.t === 'strong' || run.t === 'em' || run.t === 'link')
        return [{ ...run, c: strip(run.c) }];
      return [run];
    });
  for (const block of doc.blocks) {
    const texts =
      block.kind === 'code'
        ? [block.text]
        : blockRunLists(block).map((runs) => runsToText(strip(runs)));
    for (const text of texts)
      out.push(...text.split(/(?<=[.!?])\s+|\n/).filter((sentence) => sentence.trim() !== ''));
  }
  return out;
}

describe('committed content data', () => {
  it('matches a fresh build of the markdown', () => {
    const result = buildContent({ repoRoot });
    expect(diffOutputs(result.outDir, result.files, result.managedPrefixes)).toEqual({
      changed: [],
      missing: [],
      extra: [],
    });
  }, 300_000);

  it('has all 37 English documents, each in the manifest, and every file matches its schema', () => {
    expect(enDocs).toHaveLength(37);
    expect(Object.keys(manifest.docs).sort()).toEqual(enDocs.map((doc) => doc.id).sort());
    expect(meta.docs.map((doc) => doc.id).sort()).toEqual(enDocs.map((doc) => doc.id).sort());
    for (const lang of langs) {
      if (existsSync(join(dataDir, lang, 'glossary.json')))
        GlossaryFileSchema.parse(readJson(join(dataDir, lang, 'glossary.json')));
      if (existsSync(join(dataDir, lang, 'sources.json')))
        SourcesFileSchema.parse(readJson(join(dataDir, lang, 'sources.json')));
      if (existsSync(join(dataDir, lang, 'quick-answers.json')))
        QuickAnswersFileSchema.parse(readJson(join(dataDir, lang, 'quick-answers.json')));
      TasksFileSchema.parse(readJson(join(dataDir, lang, 'tasks.json')));
      expect(manifest.langs[lang]?.docCount).toBe(docsByLang.get(lang)?.length);
      for (const doc of docsByLang.get(lang) ?? []) {
        expect(existsSync(join(dataDir, lang, 'docs', docFileName(doc.id)))).toBe(true);
        expect(doc.lang).toBe(lang);
      }
    }
    BusinessTypesFileSchema.parse(readJson(join(repoRoot, 'content-meta', 'business-types.json')));
  });

  it('resolves every link, docref and anchor', () => {
    const problems: string[] = [];
    for (const [lang, docs] of docsByLang) {
      const headings = new Map(
        docs.map((doc) => [doc.id, new Set(doc.headings.map((heading) => heading.id))]),
      );
      for (const doc of docs) {
        for (const run of allRuns(doc)) {
          if (run.t === 'link' && 'doc' in run) {
            if (!enById.has(run.doc))
              problems.push(`${lang}:${doc.id}: link to missing doc ${run.doc}`);
            else if (
              run.anchor &&
              !(
                headings.get(run.doc) ?? new Set(enById.get(run.doc)?.headings.map((h) => h.id))
              ).has(run.anchor)
            ) {
              problems.push(`${lang}:${doc.id}: link to missing anchor ${run.doc}#${run.anchor}`);
            }
          }
          if (run.t === 'link' && 'href' in run && !/^https?:\/\//.test(run.href))
            problems.push(`${lang}:${doc.id}: bad href ${run.href}`);
          if (run.t === 'docref' && 'doc' in run && !enById.has(run.doc))
            problems.push(`${lang}:${doc.id}: docref to missing doc ${run.doc}`);
          if (run.t === 'docref' && 'section' in run && !SECTION_IDS.includes(run.section))
            problems.push(`${lang}:${doc.id}: docref to missing section`);
        }
        for (const block of doc.blocks) {
          if (block.kind === 'heading' && block.ref && !enById.has(block.ref))
            problems.push(`${lang}:${doc.id}: pseudo-heading ref ${block.ref}`);
          if (
            block.kind === 'callout' &&
            block.pairsWith &&
            !doc.blocks.some((candidate) => candidate.id === block.pairsWith)
          ) {
            problems.push(`${lang}:${doc.id}: callout pairs with missing ${block.pairsWith}`);
          }
        }
        for (const related of doc.related)
          if (!enById.has(related)) problems.push(`${lang}:${doc.id}: related ${related}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('resolves every #anchor in docs/rsa-business-toolkit/INDEX.md to a heading in the right document', () => {
    const index = readFileSync(join(repoRoot, 'docs', 'rsa-business-toolkit', 'INDEX.md'), 'utf8');
    const bySource = new Map(meta.docs.map((doc) => [doc.source, doc.id]));
    const anchors = [...index.matchAll(/\]\(([^)#]+\.md)#([^)]+)\)/g)];
    expect(anchors.length).toBeGreaterThan(250);
    const problems = anchors.flatMap((match) => {
      const docId = bySource.get(decodeURIComponent(match[1] ?? ''));
      const anchor = match[2] ?? '';
      if (!docId) return [`no doc for ${match[1]}`];
      return enById.get(docId)?.headings.some((heading) => heading.id === anchor)
        ? []
        : [`${docId}#${anchor}`];
    });
    expect(problems).toEqual([]);
  });

  it('has unique task ids that match the task lists in the documents, in manifest order', () => {
    for (const [lang, docs] of docsByLang) {
      const tasks = TasksFileSchema.parse(readJson(join(dataDir, lang, 'tasks.json'))).tasks;
      expect(new Set(tasks.map((task) => task.id)).size).toBe(tasks.length);
      expect(tasks.every((task) => !/-\d+$/.test(task.id))).toBe(true);
      const byId = new Map(docs.map((doc) => [doc.id, doc]));
      const ordered = meta.docs.flatMap((entry) => byId.get(entry.id) ?? []);
      const fromDocs = ordered.flatMap((doc) =>
        doc.blocks.flatMap((block) =>
          block.kind === 'tasklist' ? block.items.map((item) => item.id) : [],
        ),
      );
      expect(tasks.map((task) => task.id)).toEqual(fromDocs);
    }
  });

  it('links document tasks to master-checklist tasks: both exist, no chains, none twice, same in every language', () => {
    const links = (
      readJson(join(repoRoot, 'content-meta', 'task-links.json')) as {
        links: Record<string, string>;
      }
    ).links;
    const en = TasksFileSchema.parse(readJson(join(dataDir, 'en', 'tasks.json'))).tasks;
    const enTask = new Map(en.map((task) => [task.id, task]));
    const checklistDoc = enDocs.find((doc) => doc.kind === 'checklist')?.id;
    const problems: string[] = [];
    const targets = new Set<string>();
    for (const [from, to] of Object.entries(links)) {
      const source = enTask.get(from);
      const target = enTask.get(to);
      if (!source || !target) problems.push(`${from} -> ${to}: unknown task`);
      else if (target.doc !== checklistDoc || source.doc === checklistDoc)
        problems.push(`${from} -> ${to}: not a document task to a master-checklist task`);
      if (to in links) problems.push(`${from} -> ${to}: chain`);
      if (targets.has(to)) problems.push(`${to}: linked twice`);
      targets.add(to);
      if (source && source.sameAs !== to) problems.push(`${from}: sameAs is ${source.sameAs}`);
    }
    // Every emitted link comes from the file, in tasks.json and in the documents, in every language.
    for (const [lang, docs] of docsByLang) {
      const tasks = TasksFileSchema.parse(readJson(join(dataDir, lang, 'tasks.json'))).tasks;
      for (const task of tasks)
        if (task.sameAs !== links[task.id]) problems.push(`${lang} ${task.id}: ${task.sameAs}`);
      for (const doc of docs)
        for (const block of doc.blocks)
          if (block.kind === 'tasklist')
            for (const item of block.items)
              if (item.sameAs !== links[item.id])
                problems.push(`${lang} ${doc.id} ${item.id}: ${item.sameAs}`);
    }
    expect(Object.keys(links).length).toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });

  /*
   * Ticks are saved under task keys (`sameAs ?? id`), and a task id is a hash of its wording. So a
   * key that a released build used must never just disappear: rewording a task needs an entry in
   * `content-meta/task-renames.json`, and the store moves the tick (`renameChecks`). The released
   * keys are committed in `content-meta/released-task-keys.json`. After adding tasks, record them:
   *   pnpm exec cross-env TASK_KEYS_UPDATE=1 vitest run --project content -t "released task key"
   */
  it('keeps every released task key, or carries it to a new one', () => {
    const path = join(repoRoot, 'content-meta', 'released-task-keys.json');
    const en = TasksFileSchema.parse(readJson(join(dataDir, 'en', 'tasks.json'))).tasks;
    const current = [...new Set(en.map((task) => task.sameAs ?? task.id))].sort();
    const renames = TaskKeysFileSchema.parse(readJson(join(dataDir, 'task-keys.json'))).renames;
    if (process.env['TASK_KEYS_UPDATE'] === '1') {
      const released = existsSync(path) ? (readJson(path) as { keys: string[] }).keys : [];
      const keys = [...new Set([...released, ...current])];
      writeFileSync(path, `${JSON.stringify({ version: 1, keys: keys.sort() }, null, 2)}\n`);
    }
    const released = (readJson(path) as { keys: string[] }).keys;
    const live = new Set(current);
    const lost = released.filter((key) => !live.has(key) && !live.has(renames[key] ?? ''));
    expect(
      lost,
      'released task keys that no longer exist: add each to content-meta/task-renames.json (old id -> new id); see content-meta/README.md',
    ).toEqual([]);
    const unrecorded = current.filter((key) => !released.includes(key));
    expect(
      unrecorded,
      'task keys not yet recorded: run the TASK_KEYS_UPDATE command in content-meta/README.md',
    ).toEqual([]);
  });

  it('has 121 glossary entries in 7 groups with unique ids', () => {
    const glossary = GlossaryFileSchema.parse(readJson(join(dataDir, 'en', 'glossary.json')));
    expect(glossary.entries).toHaveLength(121);
    expect(glossary.groups).toHaveLength(7);
    expect(new Set(glossary.entries.map((entry) => entry.id)).size).toBe(121);
  });

  it('has sources with existing appearsIn documents, https links, reasons for citations and full titles', () => {
    const sources = SourcesFileSchema.parse(readJson(join(dataDir, 'en', 'sources.json')));
    expect(sources.checkedOn).toBe('2026-09-13');
    for (const act of sources.acts)
      for (const doc of act.appearsIn) expect(enById.has(doc), `${act.id} → ${doc}`).toBe(true);
    const urls = sources.entries.flatMap((entry) => [
      ...entry.urls,
      ...(entry.url ? [entry.url] : []),
    ]);
    expect(urls.length).toBeGreaterThan(100);
    expect(urls.filter((url) => !url.startsWith('https://'))).toEqual([]);
    expect(new Set(sources.entries.map((entry) => entry.id)).size).toBe(sources.entries.length);
    for (const entry of sources.entries) {
      if (entry.type === 'web') expect(entry.url, entry.id).toMatch(/^https:\/\//);
      else expect(entry.noUrlReason, entry.id).toBeTruthy();
      expect(entry.title.endsWith('…'), entry.id).toBe(false);
    }
    const subgroups = new Set(sources.groups.flatMap((group) => group.subgroups.map((s) => s.id)));
    for (const entry of sources.entries)
      if (entry.subgroupId) expect(subgroups.has(entry.subgroupId), entry.id).toBe(true);
  });

  it('gives every document the AI notice, a verification status and its sources', () => {
    const sources = SourcesFileSchema.parse(readJson(join(dataDir, 'en', 'sources.json')));
    const entryIds = new Set(sources.entries.map((entry) => entry.id));
    const actIds = new Set(sources.acts.map((act) => act.id));
    const provenance = ProvenanceSchema.parse(
      readJson(join(repoRoot, 'content-meta', 'provenance.json')),
    );
    const required = (doc: Doc): boolean =>
      ['guide', 'template', 'checklist'].includes(doc.kind) &&
      ['core', 'branding', 'paperwork', 'business-types', 'lookup'].includes(doc.section);
    const problems: string[] = [];
    for (const [lang, docs] of docsByLang) {
      for (const doc of docs) {
        const where = `${lang}:${doc.id}`;
        // A page is ai-checked on the register's date unless provenance.json records its own date.
        const pinned = provenance.verification[doc.id];
        if (
          doc.verification.status === 'ai-checked' &&
          doc.verification.checkedOn !== (pinned?.checkedOn ?? sources.checkedOn)
        )
          problems.push(`${where}: checked on ${doc.verification.checkedOn}`);
        if (doc.verification.checkedOn < doc.generated.date)
          problems.push(`${where}: checked before it was generated`);
        for (const id of doc.sources.entries)
          if (!entryIds.has(id)) problems.push(`${where}: unknown source ${id}`);
        for (const id of doc.sources.acts)
          if (!actIds.has(id)) problems.push(`${where}: unknown act ${id}`);
        if (
          required(doc) &&
          doc.sources.entries.length + doc.sources.acts.length === 0 &&
          !doc.sourceNote
        )
          problems.push(`${where}: no sources and no note`);
        if (doc.verification.status === 'ai-checked' && doc.verification.reviewedBy !== undefined)
          problems.push(`${where}: ai-checked with a reviewer name`);
        if (
          doc.verification.status === 'human-verified' &&
          !/\p{L}/u.test(doc.verification.reviewedBy ?? '')
        )
          problems.push(`${where}: human-verified without a reviewer`);
        const english = enById.get(doc.id);
        if (lang !== 'en' && JSON.stringify(doc.sources) !== JSON.stringify(english?.sources))
          problems.push(`${where}: sources differ from English`);
      }
    }
    expect(problems).toEqual([]);
    expect(
      enDocs
        .filter((doc) => doc.sourceNote)
        .map((doc) => doc.id)
        .sort(),
    ).toEqual([
      'branding/marketing-prompts',
      'lookup/sources',
      'start/how-this-was-made',
      'start/how-to-use',
      'start/start-here',
      'start/what-has-changed',
    ]);
    expect(
      enDocs
        .filter((doc) => !doc.sourceNote && doc.kind !== 'sources')
        .every((doc) => doc.sources.entries.length + doc.sources.acts.length > 0),
    ).toBe(true);
  });

  it('marks the master checklist Part C rows that state a condition', () => {
    const table = enById
      .get('lookup/checklist')
      ?.blocks.find((block) => block.id === 'part-c-recurring-calendar.2');
    const marked =
      table?.kind === 'table'
        ? (table.rowWhen ?? []).flatMap((when, index) =>
            when ? [`${runsToText(table.rows[index]?.[1] ?? [])} → ${JSON.stringify(when)}`] : [],
          )
        : [];
    expect(marked).toEqual([
      'VAT return, if registered → {"tags":["vat-registered"]}',
      'EMP201 by the 7th, or the business day before if the 7th is a weekend → {"tags":["employer"]}',
      'Check and clear the director\'s loan account → {"entity":"pty"}',
      'EMP501 reconciliation → {"tags":["employer"]}',
      'CIPC annual return, within 30 business days, if you have a company → {"entity":"pty"}',
      'Beneficial ownership declaration, or the return is blocked → {"entity":"pty"}',
      'ITR14 company tax return → {"entity":"pty"}',
    ]);
  });

  it('has business types whose documents and master-checklist groups exist', () => {
    const types = BusinessTypesFileSchema.parse(
      readJson(join(repoRoot, 'content-meta', 'business-types.json')),
    );
    const checklist = enById.get('lookup/checklist');
    for (const type of types.types) {
      expect(enById.get(type.doc)?.appliesTo.businessTypes).toEqual([type.id]);
      expect(
        checklist?.headings.some(
          (heading) => heading.id === type.masterChecklistGroup && heading.pseudo,
        ),
      ).toBe(true);
    }
  });

  // WP-50a, item 10: a summary is a page's lead and meta description, so it is plain words, never a
  // raw folder or file name from the markdown tree ("Lees eers 01-core/. …").
  it('has no raw folder or file name in any summary, in any language', () => {
    const raw = /(?:^|[\s(`"'])\d{2}-[\w-]+(?:\/|\.md\b)|\.md\b/;
    const found = langs.flatMap((lang) =>
      (docsByLang.get(lang) ?? [])
        .filter((doc) => raw.test(doc.summary))
        .map((doc) => `${lang} ${doc.id}: ${doc.summary}`),
    );
    expect(found).toEqual([]);
  });

  // WP-50 "Found on the way": the Afrikaans vehicle-dealer lead was the document's first line, not
  // the curated summary the English page has. Both now come from `content-meta/docs.meta.json`.
  it('gives the vehicle-dealer page the same curated summary in English and Afrikaans', () => {
    const summary = (lang: (typeof langs)[number]): string | undefined =>
      docsByLang.get(lang)?.find((doc) => doc.id === 'business-types/vehicle-dealer')?.summary;
    expect(summary('en')).toMatch(
      /^SAPS registration, stock registered to the business or your ID, /,
    );
    expect(summary('af')).toMatch(
      /^SAPS-registrasie, voorraad wat op die besigheid of jou ID-nommer /,
    );
  });

  // WP-50a review pass 1, M4: a template's summary is the lead and meta description of its form
  // page, so it never tells the reader to copy a file or replace [PLACEHOLDERS].
  it('has no copy-the-file instruction and no [placeholder] in any template summary', () => {
    const file =
      /\[|make a copy|maak ’n afskrif|export to PDF|na PDF uit|SQUARE BRACKETS|VIERKANTIGE HAKIES/i;
    const found = langs.flatMap((lang) =>
      (docsByLang.get(lang) ?? [])
        .filter((doc) => doc.kind === 'template' && file.test(doc.summary))
        .map((doc) => `${lang} ${doc.id}: ${doc.summary}`),
    );
    expect(found).toEqual([]);
    expect(
      langs.flatMap((lang) => docsByLang.get(lang) ?? []).filter((d) => d.kind === 'template'),
    ).toHaveLength(10);
  });

  // A summary taken from the page's own first paragraph made 48 of 74 pages show that paragraph
  // twice, once as the lead and once as the text. Only a summary written for the language in
  // content-meta/docs.meta.json is a lead (`docLead`), and none may repeat the opening paragraph.
  it('marks a summary as an override exactly when docs.meta.json has one for that language', () => {
    const written = JSON.parse(
      readFileSync(join(repoRoot, 'content-meta', 'docs.meta.json'), 'utf8'),
    ) as { docs: { id: string; summary?: Partial<Record<string, string>> }[] };
    const wrong = langs.flatMap((lang) =>
      (docsByLang.get(lang) ?? [])
        .filter((doc) => {
          const has =
            written.docs.find((entry) => entry.id === doc.id)?.summary?.[lang] !== undefined;
          return has !== (doc.summarySource === 'override');
        })
        .map((doc) => `${lang} ${doc.id}: ${doc.summarySource}`),
    );
    expect(wrong).toEqual([]);
  });

  /*
   * A lead that says again what the reader sees first is the same fault in a smaller dose: review
   * passes 1 to 4 of lead-dedupe found hand-written leads that repeated a sentence of their page's
   * opening, echoed a heading, or were a short line of the text itself. The check compares words
   * only (case, punctuation and a closing "…" ignored) with what the reader sees first:
   *
   * - the H1, compared as a heading;
   * - the first OPENING_BLOCKS visible blocks that carry text: paragraphs, notes, callouts, list and
   *   task-list items, table cells and headings;
   * - on a business type, the "Main reason" its facts show under the H1 (`effortReason`).
   *
   * The lead fails when the whole of it is inside one of those texts, or when every one of its
   * sentences (split at . ! ?) is inside one, whatever their length. A single sentence fails when it
   * shares a run of RUN words with a text or, at five words or more, is inside one; against a heading
   * when it is inside it or shares a run of HEADING_RUN words; against the main reason when it is
   * inside it. A "Topic: …" lead that names the page's subject passes, and so does a lead that names
   * a heading's topic in passing ("the turnover tax trap"): that is a contents line, not a repeat.
   * Both renderings of a template count: the form page (`formIntro` replaces the "make a copy" note)
   * and the plain document view, so the rule holds with `TEMPLATES_FILLABLE` on or off.
   *
   * Not compared: blocks from the eleventh on, the closed "Words used" table, and a lead sentence
   * pieced together from several list items or cells of fewer than five words each (no single text
   * holds it, and no run of eight words crosses them). This guards the data; `doc-page.spec.ts`
   * guards that the layout shows a lead only through `docLead`.
   */
  const docOf = (lang: (typeof langs)[number], id: string): Doc => {
    const doc = docsByLang.get(lang)?.find((item) => item.id === id);
    if (!doc) throw new Error(`no ${lang} ${id}`);
    return doc;
  };
  const businessTypesMeta = JSON.parse(
    readFileSync(join(repoRoot, 'content-meta', 'business-types.json'), 'utf8'),
  ) as { types: { id: string; doc: string }[]; pickTable: Parameters<typeof effortReason>[0] };
  const OPENING_BLOCKS = 10;
  const RUN = 8;
  const HEADING_RUN = 6;
  const words = (text: string): string[] =>
    text
      .toLowerCase()
      .replace(/[’']/g, '')
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word !== '');
  const sentencesOf = (text: string): string[] =>
    text
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/…$/, '')
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => words(sentence).length > 0);
  const hasRun = (list: readonly string[], body: string, size: number): boolean => {
    for (let index = 0; index + size <= list.length; index += 1)
      if (body.includes(` ${list.slice(index, index + size).join(' ')} `)) return true;
    return false;
  };
  /** The blocks the form page shows: the "make a copy" note gives way to the form's line. */
  const formView = (doc: Doc): readonly Block[] | undefined => {
    const slug = doc.kind === 'template' && isTemplateSlug(doc.slug) ? doc.slug : undefined;
    if (slug === undefined) return undefined;
    const template = parseTemplate(doc);
    const key = formHowToKey(slug);
    const intro = formIntro(
      template.before,
      key ? useTranslations(doc.lang as Locale)(key) : undefined,
    );
    return [...intro, ...doc.blocks.slice(template.before.length)];
  };
  const TEXT_KINDS = new Set([
    'paragraph',
    'note',
    'callout',
    'list',
    'tasklist',
    'table',
    'heading',
  ]);
  /** On a business type, the hub table's "Main reason" that its facts show under the H1. */
  const typeReason = (doc: Doc): string[] => {
    const type = businessTypesMeta.types.find((item) => item.doc === doc.id);
    if (!type) return [];
    const hub = docOf(doc.lang as (typeof langs)[number], 'business-types/pick-your-business-type');
    const englishHub = docOf('en', 'business-types/pick-your-business-type');
    const reason = effortReason(businessTypesMeta.pickTable, englishHub, hub, type.id);
    return reason ? [runsToText(reason)] : [];
  };
  type Seen = { text: string; kind: 'body' | 'heading' | 'reason' };
  /** What the reader sees first: the texts of the first visible blocks that carry words. */
  const opening = (blocks: readonly Block[]): Seen[] =>
    blocks
      .filter((block) => !block.hidden && TEXT_KINDS.has(block.kind))
      .slice(0, OPENING_BLOCKS)
      .flatMap((block) =>
        blockRunLists(block).map((runs): Seen => ({
          text: runsToText(runs),
          kind: block.kind === 'heading' ? 'heading' : 'body',
        })),
      );
  /** The part of `lead` that repeats what the reader of `doc` sees first, or undefined. */
  const repeatsOpening = (
    lead: string,
    doc: Doc,
    options: { formView?: boolean } = {},
  ): string | undefined => {
    const views = [doc.blocks, options.formView === false ? undefined : formView(doc)].filter(
      (blocks): blocks is readonly Block[] => blocks !== undefined,
    );
    const seen: Seen[] = [
      { text: doc.h1, kind: 'heading' },
      ...views.flatMap(opening),
      ...typeReason(doc).map((text): Seen => ({ text, kind: 'reason' })),
    ];
    const texts = seen.map(({ text, kind }): Seen => ({
      text: ` ${words(text).join(' ')} `,
      kind,
    }));
    const inside = (list: readonly string[], body: string): boolean =>
      list.length > 0 && body.includes(` ${list.join(' ')} `);
    const whole = words(lead);
    if (texts.some(({ text }) => inside(whole, text))) return lead;
    const sentences = sentencesOf(lead);
    if (sentences.every((sentence) => texts.some(({ text }) => inside(words(sentence), text))))
      return lead;
    return sentences.find((sentence) => {
      const list = words(sentence);
      return texts.some(({ text, kind }) => {
        if (kind === 'reason') return inside(list, text);
        if (kind === 'heading') return inside(list, text) || hasRun(list, text, HEADING_RUN);
        return (list.length >= 5 && inside(list, text)) || hasRun(list, text, RUN);
      });
    });
  };

  it('shows no lead that repeats what the reader sees first on its page', () => {
    const found = langs.flatMap((lang) =>
      (docsByLang.get(lang) ?? []).flatMap((doc) => {
        const lead = docLead(doc);
        if (lead === undefined) return [];
        const sentence = repeatsOpening(lead, doc);
        return sentence === undefined ? [] : [`${lang} ${doc.id}: "${sentence}"`];
      }),
    );
    expect(found).toEqual([]);
    // The rule has something to check: some pages keep a lead, and a derived summary gives none.
    const all = langs.flatMap((lang) => docsByLang.get(lang) ?? []);
    expect(all.filter((doc) => docLead(doc) !== undefined).length).toBeGreaterThan(0);
    expect(
      all.filter((doc) => doc.summarySource !== 'override' && docLead(doc) !== undefined),
    ).toEqual([]);
    // Every derived summary would fail the check, which is why a derived summary is never a lead.
    const derived = all.filter((doc) => doc.summarySource === 'derived');
    expect(derived.length).toBeGreaterThan(0);
    expect(
      derived
        .filter(
          (doc) =>
            repeatsOpening(doc.summary, doc) === undefined &&
            !doc.blocks.some(
              (block) =>
                !block.hidden &&
                (block.kind === 'paragraph' || block.kind === 'note') &&
                runsToText(block.c).replace(/\s+/g, ' ').includes(doc.summary.replace(/…$/, '')),
            ),
        )
        .map((doc) => `${doc.lang} ${doc.id}`),
    ).toEqual([]);
  });

  // Review pass 2 of lead-dedupe: probes that hold the check to what it should catch and pass.
  it('catches a lead that repeats what the reader sees first, and passes a topic line', () => {
    const dealer = docOf('en', 'business-types/vehicle-dealer');
    const receipt = docOf('en', 'paperwork/templates/receipt');
    const marketing = docOf('en', 'branding/marketing-prompts');
    // A: the dealer's old lead, the second sentence of its second paragraph.
    expect(
      repeatsOpening(
        'Vehicle dealing has three registration layers other businesses do not have, and one legal risk that can destroy a small dealer in a single transaction.',
        dealer,
      ),
    ).toBeDefined();
    // C: an item of the dealer's "Quick answer" list.
    expect(
      repeatsOpening(
        'Registration as a second-hand goods dealer with SAPS, free but compulsory.',
        dealer,
      ),
    ).toBeDefined();
    // E: the receipt's callout.
    expect(
      repeatsOpening('Only send a receipt once the money is in your account balance.', receipt),
    ).toBeDefined();
    // The marketing page's old lead echoed its first heading.
    expect(
      repeatsOpening(
        'Where South African small businesses actually find customers, plus AI prompts for content pillars, posts, WhatsApp messages and your Google Business Profile.',
        marketing,
      ),
    ).toBeDefined();
    // Review pass 3: a cell of a table near the top (the hub's effort table) and a business
    // type's "Main reason", which its facts show under the H1.
    expect(
      repeatsOpening(
        'Some trades need professional registration.',
        docOf('en', 'business-types/pick-your-business-type'),
      ),
    ).toBeDefined();
    expect(
      repeatsOpening(
        'Health inspection and municipal licence.',
        docOf('en', 'business-types/beauty'),
      ),
    ).toBeDefined();
    // Review pass 4: a lead of short sentences that are all in the text, a lead equal to the
    // type's main reason, and a line caught only in the form view.
    expect(repeatsOpening('Print this. Tick as you go.', docOf('en', 'lookup/checklist'))).toBe(
      'Print this. Tick as you go.',
    );
    expect(repeatsOpening('Pick two channels. Do those two properly.', marketing)).toBeDefined();
    expect(repeatsOpening('Three separate registration layers.', dealer)).toBeDefined();
    // A short sentence that is the main reason, or the H1, beside a sentence that is new.
    expect(
      repeatsOpening('Three separate registration layers. Plus the consumer law and VAT.', dealer),
    ).toBe('Three separate registration layers.');
    expect(
      repeatsOpening('Buying and selling vehicles. What to register and what to sign.', dealer),
    ).toBe('Buying and selling vehicles.');
    const formLine = 'Fill in the form, check the preview, then save it as a PDF to send.';
    expect(repeatsOpening(formLine, receipt)).toBeDefined();
    expect(repeatsOpening(formLine, receipt, { formView: false })).toBeUndefined();
    // H: a "Topic: …" lead that names the page's subject is not a repeat.
    expect(
      repeatsOpening('Vehicle dealing: the registrations, the consumer law and VAT.', dealer),
    ).toBeUndefined();
  });

  // Review pass 4, m4: every written English summary has a written Afrikaans one, with the same
  // numbers (CLAUDE.md: Afrikaans keeps numbers byte-identical to English).
  it('gives every English summary override an Afrikaans one with the same numbers', () => {
    const written = JSON.parse(
      readFileSync(join(repoRoot, 'content-meta', 'docs.meta.json'), 'utf8'),
    ) as { docs: { id: string; summary?: Partial<Record<string, string>> }[] };
    const numbers = (text: string): string[] => text.match(/\d[\d,. ]*\d|\d/g) ?? [];
    const withEnglish = written.docs.filter((entry) => entry.summary?.['en'] !== undefined);
    expect(withEnglish.length).toBeGreaterThan(0);
    expect(
      withEnglish.filter((entry) => entry.summary?.['af'] === undefined).map((e) => e.id),
    ).toEqual([]);
    expect(
      withEnglish
        .filter(
          (entry) =>
            numbers(entry.summary?.['en'] ?? '').join('|') !==
            numbers(entry.summary?.['af'] ?? '').join('|'),
        )
        .map((entry) => entry.id),
    ).toEqual([]);
  });

  it('has a sane heading tree in every document', () => {
    for (const doc of enDocs) {
      let previous = 1;
      for (const heading of doc.headings) {
        if (!heading.pseudo)
          expect(heading.depth - previous, `${doc.id}#${heading.id}`).toBeLessThanOrEqual(1);
        if (!heading.pseudo) previous = heading.depth;
      }
    }
  });
});

/** Parts of a sentence; a current figure only excuses an old one in the same part. */
function clauses(sentence: string): string[] {
  // A comma splits only when a space follows, so `R50,000` stays whole.
  return sentence.split(/[;(]\s*|,\s+|\s+(?:and|but|en|maar)\s+/u);
}

/** The old figure is explicitly marked as old or wrong: `not R1 million`, `nie R50,000 nie`, `up from R20,000`. */
function markedOld(clause: string, figure: string): boolean {
  return new RegExp(
    `\\b(?:not|nie|old|ou|previous|vorige|was|up from|verhoog van|replaced(?: the)?|vervang(?: die)?)\\s+${figure}|${figure}\\s+nie\\b|\\b(?:ou|vorige)\\s+[\\p{L}-]*(?:drempel|limiet|grens)\\s+van\\s+${figure}`,
    'u',
  ).test(clause);
}

const R1_MILLION = 'R1 (?:million|miljoen)';
const OUT_OF_DATE = /\bout of date\b|\bverouderd\b/u;

function onlyWithCurrent(sentence: string, figure: string, current: RegExp): boolean {
  const old = new RegExp(`\\b${figure}\\b`, 'u');
  return clauses(sentence).every(
    (clause) => !old.test(clause) || current.test(clause) || markedOld(clause, figure),
  );
}

const FORBIDDEN = [
  {
    name: 'the VAT registration threshold stated as R1 million',
    matches: (s: string) =>
      new RegExp(`\\b${R1_MILLION}\\b`, 'u').test(s) && /\b(?:VAT|BTW)/u.test(s),
    allowed: (s: string) =>
      OUT_OF_DATE.test(s) || onlyWithCurrent(s, R1_MILLION, /R2\.3 (?:million|miljoen)/u),
  },
  {
    name: 'the turnover tax limit stated as R1 million',
    matches: (s: string) =>
      new RegExp(`\\b${R1_MILLION}\\b`, 'u').test(s) && /turnover tax|omsetbelasting/iu.test(s),
    allowed: (s: string) =>
      OUT_OF_DATE.test(s) || onlyWithCurrent(s, R1_MILLION, /R2\.3 (?:million|miljoen)/u),
  },
  {
    name: 'the voluntary VAT threshold stated as R50,000',
    matches: (s: string) => /\bR50,000\b/u.test(s) && /voluntary|vrywillig/iu.test(s),
    allowed: (s: string) => onlyWithCurrent(s, 'R50,000', /R120,000/u),
  },
  {
    name: 'the Small Claims Court limit stated as R20,000',
    matches: (s: string) => /\bR20,000\b/u.test(s) && /Small Claims|Klein Eise|Kleineise/iu.test(s),
    allowed: (s: string) => onlyWithCurrent(s, 'R20,000', /R30,000/u),
  },
  {
    name: 'unfinished text',
    matches: (s: string) => /\bTODO\b|\{\{|<<TODO>>/.test(s),
    allowed: () => false,
  },
  {
    name: 'a leaked citation tag',
    matches: (s: string) => /cite index=/.test(s),
    allowed: () => false,
  },
];

describe('forbidden stale strings', () => {
  it.each([
    [0, 'You must register for VAT once turnover reaches R1 million.', true],
    [0, 'The VAT threshold is R1 million and the turnover tax limit R2.3 million.', true],
    [0, 'Compulsory VAT registration: R2.3 million, not R1 million, from 1 April 2026', false],
    [0, 'If a website tells you the VAT threshold is R1 million, that site is out of date.', false],
    [0, 'The compulsory VAT registration threshold rose from R1 million to R2.3 million.', false],
    [0, 'Jy moet vir BTW registreer sodra jou omset R1 miljoen bereik.', true],
    [0, 'Verpligte BTW-registrasie: R2.3 miljoen, nie R1 miljoen nie, vanaf 1 April 2026', false],
    // Afrikaans puts the noun between "old" and the figure: "die ou BTW-drempel van R1 miljoen".
    [0, 'Baie webwerwe noem nog die ou BTW-drempel van R1 miljoen.', false],
    [0, 'Die BTW-drempel van R1 miljoen geld nou.', true],
    [0, 'Jou vorige omset van R1 miljoen beteken jy moet vir BTW registreer.', true],
    [1, 'Omsetbelasting geld tot R1 miljoen omset.', true],
    [2, 'Vrywillige BTW-registrasie is moontlik vanaf R50,000.', true],
    [2, 'Voluntary VAT registration: R120,000, not R50,000', false],
    [2, 'Vrywillige BTW-registrasie: R120,000, nie R50,000 nie', false],
    [3, 'Die limiet van die Kleineisehof is R20,000.', true],
    [3, 'Small Claims Court: limit R30,000 from 1 August 2026, up from R20,000.', false],
    [3, 'Die Kleineisehof se limiet is R30,000 vanaf 1 Augustus 2026, verhoog van R20,000.', false],
  ])('rule %i flags %j: %s', (index, sentence, flagged) => {
    const rule = FORBIDDEN[index];
    expect(rule !== undefined && rule.matches(sentence) && !rule.allowed(sentence)).toBe(flagged);
  });

  it.each(FORBIDDEN.map((rule) => [rule.name, rule] as const))(
    'no document contains %s',
    (_name, rule) => {
      const hits = [...docsByLang].flatMap(([lang, docs]) =>
        docs.flatMap((doc) =>
          sentences(doc)
            .filter((s) => rule.matches(s) && !rule.allowed(s))
            .map((s) => `${lang}:${doc.id}: ${s}`),
        ),
      );
      expect(hits).toEqual([]);
    },
  );

  it('states the three numbers that changed in 2026 in core/tax-and-sars', () => {
    const text = sentences(enById.get('core/tax-and-sars') as Doc).join(' ');
    for (const value of ['R2.3 million', 'R120,000', 'R600,000']) expect(text).toContain(value);
  });
});
