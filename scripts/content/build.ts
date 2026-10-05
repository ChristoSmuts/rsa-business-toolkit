import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import {
  DocSchema,
  GlossaryFileSchema,
  LANGS,
  ManifestSchema,
  QuickAnswersFileSchema,
  SourcesFileSchema,
  TaskKeysFileSchema,
  TasksFileSchema,
  type Block,
  type Doc,
  type GlossaryFile,
  type Lang,
  type Manifest,
  type QuickAnswersFile,
  type SourcesFile,
  type TaskKeysFile,
  type TasksFile,
  type TranslationStatus,
} from '../../src/lib/content/schema';
import { applyApplicability, checkUnusedOverrides, type ApplicabilityRow } from './applicability';
import {
  defaultConfigPaths,
  loadConfig,
  loadTranslationTerms,
  markersFor,
  translationTermsPath,
  type ConfigPaths,
  type ContentConfig,
} from './config';
import { applySourceFixes, discover, readSource } from './discover';
import { ContentError, IssueCollector } from './errors';
import {
  alignQuickAnswers,
  alignSources,
  alignTranslation,
  formatFinding,
  type Finding,
  type PriorDoc,
} from './fidelity';
import { docFileName, shortHash } from './ids';
import type { LegacyUse, LinkUse } from './inline';
import { buildDoc } from './meta';
import { parseDocument, type FenceRecord, type ParsedDoc } from './parse';
import {
  checkProvenanceConfig,
  checkVerificationDates,
  mapDocSources,
  verificationFor,
  type DocProvenance,
} from './provenance';
import { createDocIndex, type DocIndex } from './refs';
import { assignTaskIds, collectTaskRecords, linkTasks, taskKeyRenames } from './special/checklist';
import { assignGlossaryIds, buildGlossaryFile } from './special/glossary';
import { buildQuickAnswers } from './special/quick-answers';
import { buildSourcesFile } from './special/sources';
import { runsToText } from './text';
import { protectedTerms } from './verbatim';
import { byCodeUnit, stableStringify, type OutputFile } from './write';

export interface BuildOptions {
  repoRoot: string;
  configPaths?: Partial<ConfigPaths>;
  /** Override `docs.meta.json` source roots (absolute, or relative to `repoRoot`). */
  sourceRoots?: Partial<Record<Lang, string>>;
  outDir?: string;
  /**
   * Where the previous build's JSON is read from for stale detection. Defaults to `src/data`, the
   * committed output, so `--out <scratch>` still compares a translation against the English it was
   * translated from instead of silently checking nothing.
   */
  priorDir?: string | undefined;
  /** `build` throws on fidelity findings; `fidelity` returns them. */
  mode?: 'build' | 'fidelity';
  /** Translated languages to process. Default: every configured root that exists. */
  langs?: readonly Lang[];
  /** Restrict translated-document checks to one doc id (fidelity mode). */
  doc?: string | undefined;
  allowPartial?: boolean;
  allowStale?: boolean;
  /** Cross-check business-types.json against the corpus (off for small fixture corpora). */
  strictTaxonomy?: boolean;
}

export interface LangBuild {
  lang: Lang;
  /** The markdown root the language was read from. */
  root?: string | undefined;
  parsed: ParsedDoc[];
  docs: Doc[];
  skipped: string[];
  fallback: string[];
  glossary?: GlossaryFile | undefined;
  sources?: SourcesFile | undefined;
  quickAnswers?: QuickAnswersFile | undefined;
  tasks: TasksFile;
}

export interface BuildResult {
  config: ContentConfig;
  outDir: string;
  files: OutputFile[];
  managedPrefixes: string[];
  langs: LangBuild[];
  findings: Finding[];
  applicability: ApplicabilityRow[];
  missingRoots: { lang: Lang; root: string }[];
  fences: FenceRecord[];
  legacy: LegacyUse[];
  links: LinkUse[];
  externalLinks: string[];
  /** Hosts of bare domains in English prose that became links. */
  bareDomains: string[];
}

function validate<T>(
  schema: z.ZodType<T>,
  data: unknown,
  label: string,
  issues: IssueCollector,
): void {
  const result = schema.safeParse(data);
  if (!result.success)
    issues.add('schema', `${label} does not match its schema:\n${z.prettifyError(result.error)}`);
}

/** Every link anchor is a heading in its target, and every docref points at a listed document. */
function validateReferences(
  parsed: readonly ParsedDoc[],
  index: DocIndex,
  issues: IssueCollector,
): void {
  const headings = new Map(
    parsed.map((doc) => [
      doc.entry.id,
      new Set(doc.blocks.filter((block) => block.kind === 'heading').map((block) => block.id)),
    ]),
  );
  for (const doc of parsed) {
    for (const link of doc.links) {
      if (link.anchor !== undefined && !headings.get(link.doc)?.has(link.anchor)) {
        issues.add(
          'unresolved-anchor',
          `#${link.anchor} is not a heading in ${link.doc}`,
          doc.entry.id,
          link.block,
        );
      }
    }
    for (const use of doc.legacy) {
      if (!use.target.startsWith('section:') && !index.byId.has(use.target)) {
        issues.add(
          'unresolved-legacy-ref',
          `\`${use.code}\` maps to ${use.target}, which is not in docs.meta.json`,
          doc.entry.id,
          use.block,
        );
      }
    }
  }
}

function checkTaxonomy(config: ContentConfig, docs: readonly Doc[], issues: IssueCollector): void {
  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  const checklist = docs.find((doc) => doc.kind === 'checklist');
  for (const type of config.businessTypes.types) {
    const doc = byId.get(type.doc);
    if (!doc) issues.add('taxonomy', `business type ${type.id}: doc ${type.doc} does not exist`);
    else if (
      doc.appliesTo.businessTypes === 'all' ||
      !doc.appliesTo.businessTypes.includes(type.id)
    ) {
      issues.add(
        'taxonomy',
        `business type ${type.id}: ${type.doc} must declare appliesTo.businessTypes ["${type.id}"]`,
      );
    }
    if (
      checklist &&
      !checklist.headings.some(
        (heading) => heading.id === type.masterChecklistGroup && heading.pseudo,
      )
    ) {
      issues.add(
        'taxonomy',
        `business type ${type.id}: no pseudo heading "${type.masterChecklistGroup}" in ${checklist.id}`,
      );
    }
  }
  const { pickTable } = config.businessTypes;
  const pick = docs.find((doc) => doc.headings.some((heading) => heading.id === pickTable.heading));
  if (!pick) {
    issues.add('taxonomy', `no document has the effort table heading "${pickTable.heading}"`);
    return;
  }
  const start = pick.blocks.findIndex((block) => block.id === pickTable.heading);
  const table = pick.blocks
    .slice(start + 1)
    .find((block): block is Extract<Block, { kind: 'table' }> => block.kind === 'table');
  const seen = new Set<string>();
  for (const row of table?.rows ?? []) {
    const label = runsToText(row[0] ?? []).trim();
    const effortLabel = runsToText(row[1] ?? []).trim();
    const typeId = pickTable.rows[label];
    const effort = pickTable.effortLabels[effortLabel];
    if (!typeId || !effort) {
      issues.add(
        'taxonomy',
        `effort table row "${label}" / "${effortLabel}" is not mapped in business-types.json`,
        pick.id,
      );
      continue;
    }
    seen.add(typeId);
    const declared = config.businessTypes.types.find((type) => type.id === typeId)?.effort;
    if (declared !== effort) {
      issues.add(
        'taxonomy',
        `${typeId}: business-types.json effort "${declared ?? '?'}" but the table says "${effort}"`,
        pick.id,
      );
    }
  }
  if (seen.size !== config.businessTypes.types.length)
    issues.add('taxonomy', 'the effort table does not list all six business types', pick.id);
}

function businessTypeDocsOf(config: ContentConfig): string[] {
  return [...config.businessTypes.types].sort((a, b) => a.order - b.order).map((type) => type.doc);
}

interface SpecialOptions {
  /** Documents that are English fallback copies inside a translation. */
  fallbackDocs?: ReadonlySet<string>;
  /** Translations: the English register, whose citation reasons are reused. */
  englishSources?: SourcesFile | undefined;
  /** The register when it was built already (English builds it before the documents). */
  built?: { sources: SourcesFile | undefined };
}

function buildSpecial(
  lang: Lang,
  parsed: readonly ParsedDoc[],
  docs: readonly Doc[],
  config: ContentConfig,
  issues: IssueCollector,
  options: SpecialOptions = {},
) {
  const glossaryDoc = parsed.find((doc) => doc.entry.kind === 'glossary');
  const sourcesDoc = parsed.find((doc) => doc.entry.kind === 'sources');
  const quickDoc = parsed.find((doc) => doc.entry.special?.quickAnswers);
  const fallbackDocs = options.fallbackDocs ?? new Set<string>();
  /** An English fallback copy still reads with English markers. */
  const markersOf = (doc: ParsedDoc) =>
    markersFor(config, fallbackDocs.has(doc.entry.id) ? 'en' : lang);
  return {
    glossary: glossaryDoc
      ? buildGlossaryFile(lang, glossaryDoc.entry.id, glossaryDoc.blocks, glossaryDoc.glossary)
      : undefined,
    sources: options.built
      ? options.built.sources
      : sourcesDoc
        ? buildSourcesFile({
            lang,
            entry: sourcesDoc.entry,
            blocks: sourcesDoc.blocks,
            markers: markersOf(sourcesDoc),
            businessTypeDocs: businessTypeDocsOf(config),
            issues,
            source: options.englishSources,
          })
        : undefined,
    quickAnswers:
      quickDoc?.entry.special?.quickAnswers !== undefined
        ? buildQuickAnswers(
            lang,
            quickDoc.entry.id,
            quickDoc.blocks,
            quickDoc.entry.special.quickAnswers.heading,
            issues,
          )
        : undefined,
    tasks: { lang, tasks: collectTaskRecords(docs) },
  };
}

function translationStatus(config: ContentConfig, lang: Lang, docId: string): TranslationStatus {
  const langConfig = config.translations.langs[lang];
  return langConfig?.docs[docId]?.status ?? langConfig?.defaultStatus ?? 'machine-unreviewed';
}

/** Only block ids and hashes matter for stale detection, so JSON from an older schema still counts. */
const PriorDocSchema = z.object({
  blocks: z.array(
    z.object({ id: z.string(), hash: z.string(), sourceHash: z.string().optional() }),
  ),
});

function readPrior(outDir: string, lang: Lang, docId: string): PriorDoc | undefined {
  const path = join(outDir, lang, 'docs', docFileName(docId));
  if (!existsSync(path)) return undefined;
  try {
    const result = PriorDocSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

function fallbackCopy(en: ParsedDoc, lang: Lang): ParsedDoc {
  const copy = structuredClone(en);
  copy.lang = lang;
  for (const block of copy.blocks) {
    block.fallback = true;
    block.sourceHash = block.hash;
  }
  return copy;
}

/** `manifest.contentHash`: files ordered by code unit, so the hash is the same under every locale. */
export function computeContentHash(files: readonly OutputFile[]): string {
  return shortHash(
    [...files]
      .sort((a, b) => byCodeUnit(a.path, b.path))
      .map((file) => `${file.path}\n${stableStringify(file.data)}`)
      .join('\n'),
  );
}

function buildManifest(
  config: ContentConfig,
  langs: readonly LangBuild[],
  contentHash: string,
): Manifest {
  const [source] = langs;
  const enDocs = source?.docs ?? [];
  const titles = new Map<string, Partial<Record<Lang, string>>>();
  const available = new Map<string, Lang[]>();
  for (const build of langs) {
    for (const doc of build.docs) {
      titles.set(doc.id, { ...titles.get(doc.id), [build.lang]: doc.title });
      available.set(doc.id, [...(available.get(doc.id) ?? []), build.lang]);
    }
  }
  const langStatus: Manifest['langs'] = {};
  for (const build of langs) {
    if (build.lang === 'en') {
      langStatus.en = { status: 'source', docCount: build.docs.length };
      continue;
    }
    const statuses = build.docs.map((doc) => doc.translation.status);
    const status =
      build.docs.length < enDocs.length || statuses.includes('fallback')
        ? 'partial'
        : statuses.every((value) => value === 'reviewed')
          ? 'reviewed'
          : 'machine-unreviewed';
    langStatus[build.lang] = { status, docCount: build.docs.length };
  }
  return {
    version: 1,
    contentHash,
    sections: [...config.docsMeta.sections]
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        id: section.id,
        order: section.order,
        route: section.route,
        titles: section.titles,
        docs: enDocs
          .filter((doc) => doc.section === section.id)
          .sort((a, b) => a.order - b.order)
          .map((doc) => doc.id),
      })),
    docs: Object.fromEntries(
      enDocs.map((doc) => [
        doc.id,
        {
          slug: doc.slug,
          route: doc.route,
          section: doc.section,
          order: doc.order,
          kind: doc.kind,
          titles: titles.get(doc.id) ?? { en: doc.title },
          langs: available.get(doc.id) ?? ['en'],
          appliesTo: doc.appliesTo,
        },
      ]),
    ),
    langs: langStatus,
  };
}

interface ParseContext {
  repoRoot: string;
  config: ContentConfig;
  index: DocIndex;
  issues: IssueCollector;
  linkifyIgnore: ReadonlySet<string>;
  linkifyAllow: ReadonlySet<string>;
}

/** A repository-relative posix path for files inside the repository, the absolute path otherwise. */
export function displayPath(repoRoot: string, path: string): string {
  const rel = relative(repoRoot, path);
  const shown = rel === '' || rel.startsWith('..') || isAbsolute(rel) ? path : rel;
  return shown.split(sep).join('/');
}

function parseFromDisk(
  path: string,
  entry: ParsedDoc['entry'],
  lang: Lang,
  ctx: ParseContext,
): ParsedDoc {
  const shown = displayPath(ctx.repoRoot, path);
  const source = applySourceFixes(
    readSource(path),
    entry,
    lang,
    markersFor(ctx.config, lang),
    ctx.issues,
    shown,
  );
  return parseDocument({
    entry,
    lang,
    source,
    sourcePath: entry.source,
    displayPath: shown,
    config: ctx.config,
    index: ctx.index,
    issues: ctx.issues,
    linkifyIgnore: ctx.linkifyIgnore,
    linkifyAllow: ctx.linkifyAllow,
  });
}

/** Runs the whole pipeline in memory. Nothing is written; see `writeOutputs` / `diffOutputs`. */
export function buildContent(options: BuildOptions): BuildResult {
  const { repoRoot } = options;
  const config = loadConfig({
    ...defaultConfigPaths(join(repoRoot, 'content-meta')),
    ...options.configPaths,
  });
  const outDir = options.outDir ?? join(repoRoot, 'src', 'data');
  const priorDir = options.priorDir ?? join(repoRoot, 'src', 'data');
  const mode = options.mode ?? 'build';
  const issues = new IssueCollector();
  const ctx: ParseContext = {
    repoRoot,
    config,
    index: createDocIndex(config.docsMeta),
    issues,
    linkifyIgnore: new Set(config.docsMeta.linkify.ignoreDomains),
    linkifyAllow: new Set(config.docsMeta.linkify.allowDomains),
  };
  const rootFor = (lang: Lang): string | undefined => {
    const root = options.sourceRoots?.[lang] ?? config.docsMeta.sourceRoots[lang];
    return root === undefined ? undefined : resolve(repoRoot, root);
  };

  const enRoot = rootFor('en');
  if (!enRoot || !existsSync(enRoot))
    throw new ContentError([
      { code: 'missing-root', message: `English source root not found: ${enRoot ?? '(unset)'}` },
    ]);
  const enParsed: ParsedDoc[] = [];
  for (const found of discover(enRoot, config.docsMeta, 'en', issues)) {
    if (!found.exists)
      issues.add(
        'missing-source',
        `"${found.entry.source}" is listed in docs.meta.json but missing`,
        found.entry.id,
      );
    else enParsed.push(parseFromDisk(found.path, found.entry, 'en', ctx));
  }
  issues.throwIfAny();

  const usedOverrides = new Set<string>();
  for (const parsed of enParsed) assignTaskIds(parsed.blocks, parsed.entry.id, issues);
  const linkable = enParsed.map((parsed) => ({
    id: parsed.entry.id,
    kind: parsed.entry.kind,
    blocks: parsed.blocks,
  }));
  linkTasks(linkable, config.taskLinks.links, issues);
  const taskKeys: TaskKeysFile = {
    version: 1,
    renames: taskKeyRenames(linkable, config.taskRenames.renames, issues),
  };
  const applicability = enParsed.flatMap((parsed) =>
    applyApplicability(parsed, config, usedOverrides),
  );
  checkUnusedOverrides(
    config,
    usedOverrides,
    new Set(enParsed.map((parsed) => parsed.entry.id)),
    issues,
  );
  for (const parsed of enParsed) assignGlossaryIds(parsed.glossary, parsed.entry.id, issues);
  validateReferences(enParsed, ctx.index, issues);

  // The register comes first: every document lists the register entries and acts that support it.
  const enSourcesDoc = enParsed.find((parsed) => parsed.entry.kind === 'sources');
  const enSources = enSourcesDoc
    ? buildSourcesFile({
        lang: 'en',
        entry: enSourcesDoc.entry,
        blocks: enSourcesDoc.blocks,
        markers: markersFor(config, 'en'),
        businessTypeDocs: businessTypeDocsOf(config),
        issues,
      })
    : undefined;
  const docSources = mapDocSources({
    parsed: enParsed,
    sources: enSources,
    sourceMap: config.sourceMap,
    issues,
    exemptions: config.provenance.sourceNoteExemptions,
    registerDocId: enSourcesDoc?.entry.id,
  });
  checkProvenanceConfig(config, new Set(enParsed.map((parsed) => parsed.entry.id)), issues);
  const provenanceOf = (docId: string): DocProvenance => ({
    sources: { entries: [], acts: [] },
    ...docSources.get(docId),
    generated: config.provenance.generated,
    verification: verificationFor(docId, config, enSources?.checkedOn),
  });

  const enDocs = enParsed.map((parsed) =>
    buildDoc(parsed, { status: 'source', sourceLang: 'en' }, provenanceOf(parsed.entry.id)),
  );
  checkVerificationDates(enDocs, issues);
  if (options.strictTaxonomy !== false) checkTaxonomy(config, enDocs, issues);
  const enBuild: LangBuild = {
    lang: 'en',
    root: enRoot,
    parsed: enParsed,
    docs: enDocs,
    skipped: [],
    fallback: [],
    ...buildSpecial('en', enParsed, enDocs, config, issues, { built: { sources: enSources } }),
  };
  issues.throwIfAny();

  const langs: LangBuild[] = [enBuild];
  const findings: Finding[] = [];
  const missingRoots: BuildResult['missingRoots'] = [];
  const translated =
    options.langs ??
    LANGS.filter((lang) => lang !== 'en' && config.docsMeta.sourceRoots[lang] !== undefined);
  const enById = new Map(enParsed.map((parsed) => [parsed.entry.id, parsed]));

  for (const lang of translated) {
    const root = rootFor(lang);
    if (!root || !existsSync(root)) {
      missingRoots.push({ lang, root: root ?? '(unset)' });
      continue;
    }
    const trMarkers = markersFor(config, lang);
    const enMarkers = markersFor(config, 'en');
    const terms = protectedTerms(loadTranslationTerms(translationTermsPath(repoRoot, lang)));
    const build: LangBuild = {
      lang,
      root,
      parsed: [],
      docs: [],
      skipped: [],
      fallback: [],
      tasks: { lang, tasks: [] },
    };
    for (const found of discover(root, config.docsMeta, lang, issues)) {
      const en = enById.get(found.entry.id);
      if (!en || (options.doc && found.entry.id !== options.doc)) continue;
      if (!found.exists) {
        if (options.allowPartial) {
          build.parsed.push(fallbackCopy(en, lang));
          build.fallback.push(found.entry.id);
        } else {
          build.skipped.push(found.entry.id);
        }
        continue;
      }
      const tr = parseFromDisk(found.path, found.entry, lang, ctx);
      const docFindings = alignTranslation(en, tr, {
        allowPartial: options.allowPartial === true,
        allowStale: options.allowStale === true,
        prior: readPrior(priorDir, lang, found.entry.id),
        enMarkers,
        trMarkers,
        protectedTerms: terms,
      });
      findings.push(...docFindings);
      if (docFindings.length === 0) build.parsed.push(tr);
    }
    issues.throwIfAny();
    build.docs = build.parsed.map((parsed) => {
      const fallback = build.fallback.includes(parsed.entry.id);
      const en = enById.get(parsed.entry.id);
      const status: TranslationStatus = fallback
        ? 'fallback'
        : translationStatus(config, lang, parsed.entry.id);
      const enSummary = en ? enDocs.find((doc) => doc.id === en.entry.id)?.summary : undefined;
      return buildDoc(
        parsed,
        { status, sourceLang: 'en' },
        provenanceOf(parsed.entry.id),
        enSummary,
      );
    });
    checkVerificationDates(build.docs, issues);
    const special = buildSpecial(lang, build.parsed, build.docs, config, issues, {
      fallbackDocs: new Set(build.fallback),
      englishSources: enBuild.sources,
    });
    Object.assign(build, special);
    if (special.sources && enBuild.sources)
      findings.push(...alignSources(enBuild.sources, special.sources));
    if (special.quickAnswers && enBuild.quickAnswers) {
      const heading =
        enParsed.find((parsed) => parsed.entry.special?.quickAnswers)?.entry.special?.quickAnswers
          ?.heading ?? 'intro';
      findings.push(...alignQuickAnswers(enBuild.quickAnswers, special.quickAnswers, heading));
    }
    issues.throwIfAny();
    langs.push(build);
  }

  if (mode === 'build' && findings.length > 0) {
    throw new ContentError(
      findings.map((finding) => ({ code: 'fidelity', message: formatFinding(finding) })),
    );
  }

  const files: OutputFile[] = [];
  const add = <T>(path: string, data: T, schema: z.ZodType<T>): void => {
    validate(schema, data, path, issues);
    files.push({ path, data });
  };
  for (const build of langs) {
    for (const doc of build.docs) add(`${build.lang}/docs/${docFileName(doc.id)}`, doc, DocSchema);
    if (build.glossary) add(`${build.lang}/glossary.json`, build.glossary, GlossaryFileSchema);
    if (build.sources) add(`${build.lang}/sources.json`, build.sources, SourcesFileSchema);
    if (build.quickAnswers)
      add(`${build.lang}/quick-answers.json`, build.quickAnswers, QuickAnswersFileSchema);
    add(`${build.lang}/tasks.json`, build.tasks, TasksFileSchema);
  }
  add('task-keys.json', taskKeys, TaskKeysFileSchema);
  add('manifest.json', buildManifest(config, langs, computeContentHash(files)), ManifestSchema);
  issues.throwIfAny();

  return {
    config,
    outDir,
    files,
    managedPrefixes: [...langs.map((build) => `${build.lang}/`), 'manifest.json', 'task-keys.json'],
    langs,
    findings,
    applicability,
    missingRoots,
    fences: enParsed.flatMap((parsed) => parsed.fences),
    legacy: enParsed.flatMap((parsed) => parsed.legacy),
    links: enParsed.flatMap((parsed) => parsed.links),
    externalLinks: enParsed.flatMap((parsed) => parsed.externalLinks),
    bareDomains: enParsed.flatMap((parsed) => parsed.bareDomains),
  };
}
