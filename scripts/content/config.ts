import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import {
  ApplicabilitySchema,
  BlockIdSchema,
  BusinessTypeIdSchema,
  BusinessTypesFileSchema,
  DocIdSchema,
  DocKindSchema,
  FenceVariantSchema,
  HeadingIdSchema,
  IsoDateSchema,
  LangSchema,
  namesAPerson,
  SectionIdSchema,
  TaskIdSchema,
  TranslationStatusSchema,
  type Lang,
} from '../../src/lib/content/schema';

const TagSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const RouteSchema = z.string().regex(/^(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)+$/);
const LangTextSchema = z.partialRecord(LangSchema, z.string().min(1));

/**
 * An audited in-memory correction of a markdown source, applied before parsing.
 * `find` replaces exact text; `pattern` is a regular expression (flags `mu`, `$1` in `replace`) for fixes
 * that must also work on translated wording. `lang: "translations"` applies to every language but English.
 * A fix must match exactly once, unless `optional` allows zero matches (the markdown is already correct).
 */
export const SourceFixSchema = z
  .strictObject({
    lang: z.union([LangSchema, z.literal('translations')]),
    find: z.string().min(1).optional(),
    pattern: z.string().min(1).optional(),
    replace: z.string(),
    optional: z.boolean().optional(),
    reason: z.string().min(10),
  })
  .superRefine((fix, ctx) => {
    if ((fix.find === undefined) === (fix.pattern === undefined)) {
      ctx.addIssue({
        code: 'custom',
        message: 'a source fix needs exactly one of find or pattern',
      });
    }
    if (fix.pattern !== undefined) {
      try {
        new RegExp(fix.pattern, 'mu');
      } catch (error) {
        ctx.addIssue({ code: 'custom', message: `invalid pattern: ${(error as Error).message}` });
      }
    }
  });
export type SourceFix = z.infer<typeof SourceFixSchema>;

export const DocMetaEntrySchema = z.strictObject({
  source: z.string().regex(/\.md$/),
  id: DocIdSchema,
  route: RouteSchema,
  section: SectionIdSchema,
  order: z.number().int().positive(),
  kind: DocKindSchema,
  title: LangTextSchema.optional(),
  summary: z.partialRecord(LangSchema, z.string().min(1).max(200)).optional(),
  appliesTo: z
    .strictObject({
      entity: z.enum(['sole-prop', 'pty']).optional(),
      businessTypes: z.array(BusinessTypeIdSchema).min(1).optional(),
    })
    .optional(),
  tags: z.array(TagSchema).optional(),
  fenceVariant: FenceVariantSchema.optional(),
  fenceOverrides: z.record(BlockIdSchema, FenceVariantSchema).optional(),
  blockOverrides: z
    .record(BlockIdSchema, z.strictObject({ replaceWith: z.literal('toc') }))
    .optional(),
  hideSections: z.array(HeadingIdSchema).optional(),
  sourceFixes: z.array(SourceFixSchema).optional(),
  special: z
    .strictObject({
      quickAnswers: z.strictObject({ heading: HeadingIdSchema }).optional(),
      acts: z.strictObject({ heading: HeadingIdSchema }).optional(),
      sourceGroupsSkip: z.array(HeadingIdSchema).optional(),
      /** English source entry id → why the register gives no link for it. */
      citationsWithoutUrl: z.record(HeadingIdSchema, z.string().min(10)).optional(),
    })
    .optional(),
});
export type DocMetaEntry = z.infer<typeof DocMetaEntrySchema>;

export const DocsMetaSchema = z
  .strictObject({
    version: z.literal(1),
    sourceRoots: z.partialRecord(LangSchema, z.string().min(1)),
    /** Paths relative to every language root that are not documents (INDEX.md, translator notes …). */
    ignore: z.array(z.string().min(1)),
    linkify: z.strictObject({
      /** Example domains in prose that must stay plain text. */
      ignoreDomains: z.array(z.string().min(1)),
      /** Real hosts that a bare domain in prose may turn into a link. Any other bare domain fails. */
      allowDomains: z.array(z.string().min(1)),
    }),
    sections: z.array(
      z.strictObject({
        id: SectionIdSchema,
        order: z.number().int().positive(),
        folder: z.string().min(1),
        route: RouteSchema,
        titles: LangTextSchema,
      }),
    ),
    docs: z.array(DocMetaEntrySchema).min(1),
  })
  .superRefine((meta, ctx) => {
    const unique = (label: string, values: string[]): void => {
      const seen = new Set<string>();
      for (const value of values) {
        if (seen.has(value))
          ctx.addIssue({ code: 'custom', message: `duplicate ${label}: ${value}` });
        seen.add(value);
      }
    };
    unique(
      'doc id',
      meta.docs.map((d) => d.id),
    );
    unique(
      'doc source',
      meta.docs.map((d) => d.source),
    );
    unique(
      'doc route',
      meta.docs.map((d) => d.route),
    );
    unique(
      'section order',
      meta.sections.map((s) => String(s.order)),
    );
    unique(
      'doc order',
      meta.docs.map((d) => `${d.section}#${d.order}`),
    );
    /*
     * The sources register is the one document exempt from `source-note-with-evidence`, because every
     * link on it is a register entry by definition. That exception belongs to one known document: a
     * second `kind: "sources"` entry would buy any page the same escape with one word of JSON.
     */
    const registers = meta.docs.filter((doc) => doc.kind === 'sources').map((doc) => doc.id);
    if (registers.length > 1) {
      ctx.addIssue({
        code: 'custom',
        message: `only one document is the sources register, but ${registers.length} declare kind "sources": ${registers.join(', ')}. The register is exempt from the source-note evidence check, so it must stay a single known document`,
      });
    }
    const sections = new Set(meta.sections.map((s) => s.id));
    for (const doc of meta.docs) {
      if (!sections.has(doc.section))
        ctx.addIssue({ code: 'custom', message: `${doc.id}: unknown section ${doc.section}` });
      if (!doc.id.startsWith(`${doc.section}/`)) {
        ctx.addIssue({ code: 'custom', message: `${doc.id}: id must start with its section` });
      }
    }
  });
export type DocsMeta = z.infer<typeof DocsMetaSchema>;

export const LegacyRefsSchema = z.strictObject({
  version: z.literal(1),
  folders: z.record(z.string().regex(/^\d{2}-[a-z]+(?:-[a-z]+)*$/), SectionIdSchema),
  refs: z.record(z.string().regex(/^\d{2}-[a-z]+(?:-[a-z]+)*\/\d{2}[a-z]?$/), DocIdSchema),
});
export type LegacyRefs = z.infer<typeof LegacyRefsSchema>;

export const LangMarkersSchema = z.strictObject({
  plainWords: z.string().min(1),
  supports: z.string().min(1),
  wordsUsedHeading: z.string().min(1),
  footerPrefix: z.string().min(1),
  /** Regex source, matched case-insensitively against the nearest H2/H3. */
  checklistHeading: z.string().min(1),
  officialTag: z.string().min(1),
  allBusinessTypes: z.string().min(1),
  /** Regex source for the "All sources were checked on …" sentence in the sources register. */
  checkedOnPattern: z.string().min(1),
  /** Capitalised as the language writes them; month matching is case-sensitive. */
  months: z.array(z.string().min(1)).length(12),
  multipliers: z.strictObject({ thousand: z.string(), million: z.string(), billion: z.string() }),
  sectionWords: z.array(z.string().min(1)).min(1),
  /** Words before a month without a day or year that make it a date (`in`, `by`, `end of` …). */
  dateContextWords: z.array(z.string().min(1)).min(1),
  /** Words that add a further month to a dated month (`and`, `or`, `to` …). */
  dateListWords: z.array(z.string().min(1)).min(1),
  /** Words that make `Month <word> Month` a range on their own (`to`). */
  dateRangeWords: z.array(z.string().min(1)).min(1),
  /** Suffixes written after an ordinal's digits (`th` for `7th`, `ste` and `de` for `28ste`, `7de`). */
  ordinalSuffixes: z.array(z.string().min(1)).min(1),
  placeholderLiterals: z.array(z.string().min(1)),
  placeholderIdentity: z.record(z.string().min(1), z.string().regex(/^[a-z][A-Za-z]+$/)),
  todoMarker: z.string().min(1),
});
export type LangMarkers = z.infer<typeof LangMarkersSchema>;

export const MarkersSchema = z
  .partialRecord(LangSchema, LangMarkersSchema)
  .refine((markers) => markers.en !== undefined, 'markers.json must define en');
export type Markers = z.infer<typeof MarkersSchema>;

export const InferenceRuleSchema = z.strictObject({
  pattern: z.string().min(1),
  docs: z.array(DocIdSchema).optional(),
  appliesTo: ApplicabilitySchema,
});

export const ApplicabilityConfigSchema = z.strictObject({
  version: z.literal(1),
  inference: z.strictObject({
    sections: z.array(SectionIdSchema),
    kinds: z.array(DocKindSchema),
    rules: z.array(InferenceRuleSchema),
  }),
  /** `docId#headingId` → effective applicability for that heading (replaces inherited and inferred). */
  headings: z.record(z.string().regex(/^[^#]+#[^#]+$/), ApplicabilitySchema),
  taskPrefixes: z.array(
    z.strictObject({ pattern: z.string().min(1), appliesTo: ApplicabilitySchema }),
  ),
  /** Task id → applicability merged over the computed `when`. */
  tasks: z.record(z.string(), ApplicabilitySchema),
  /**
   * A table row whose text states a condition (`if you run payroll`) gets `rowWhen` from the matching
   * rules. `docs` limits a rule to those documents.
   */
  tableRows: z.array(
    z.strictObject({
      docs: z.array(DocIdSchema).optional(),
      /** Only tables under these headings (the block id before the dot). */
      headings: z.array(HeadingIdSchema).optional(),
      pattern: z.string().min(1),
      appliesTo: ApplicabilitySchema,
      /** Why the matching rows apply only to that audience, for reviewers. */
      reason: z.string().min(10),
    }),
  ),
});
export type ApplicabilityConfig = z.infer<typeof ApplicabilityConfigSchema>;

export const TranslationsSchema = z.strictObject({
  version: z.literal(1),
  langs: z.partialRecord(
    LangSchema,
    z.strictObject({
      defaultStatus: TranslationStatusSchema.exclude(['source', 'fallback']),
      docs: z.record(
        DocIdSchema,
        z.strictObject({
          status: TranslationStatusSchema.exclude(['source', 'fallback']),
          notes: z.string().optional(),
        }),
      ),
    }),
  ),
});
export type Translations = z.infer<typeof TranslationsSchema>;

/**
 * The parts of `scripts/translate/TERMS-<lang>.json` that the fidelity check enforces. Every term has the
 * same shape; `keepVerbatim: true` marks an official English name that the translation must keep.
 */
export const TranslationTermsSchema = z.looseObject({
  keepVerbatim: z.array(z.string().min(1)),
  formCodes: z.array(z.string().min(1)),
  terms: z.array(
    z.strictObject({
      en: z.string().min(1),
      af: z.string().min(1),
      note: z.string(),
      keepVerbatim: z.boolean(),
    }),
  ),
});
export type TranslationTerms = z.infer<typeof TranslationTermsSchema>;

const MappingSchema = z.strictObject({
  docs: z.array(DocIdSchema).min(1),
  /** One line a reviewer can audit: the claim in each document that the source supports. */
  reason: z.string().min(10),
});

/**
 * `content-meta/source-map.json`: which register groups and entries support which documents, beyond what
 * the pipeline finds itself (links to register pages and act locations). `notes.docs` lists documents that
 * get a source note instead of a list, pointing at `notes.see`.
 */
export const SourceMapSchema = z.strictObject({
  version: z.literal(1),
  notes: z.strictObject({
    see: z.array(DocIdSchema).min(1),
    docs: z.record(DocIdSchema, z.string().min(10)),
  }),
  groups: z.array(MappingSchema.extend({ group: HeadingIdSchema })),
  entries: z.array(MappingSchema.extend({ entry: HeadingIdSchema })),
  /** Acts that support a document the legislation table does not list it for. */
  acts: z.array(MappingSchema.extend({ act: HeadingIdSchema })),
});
export type SourceMap = z.infer<typeof SourceMapSchema>;

/**
 * `content-meta/provenance.json`: the generated-by-AI notice for documents without a footer, and the
 * accuracy review of each document. A document not listed is `ai-checked` on the register's check date.
 */
export const ProvenanceSchema = z.strictObject({
  version: z.literal(1),
  generated: z.strictObject({ date: IsoDateSchema, tool: z.string().min(1) }),
  /**
   * Documents that must list sources (guide, template or checklist outside `start`) but carry a source note
   * instead, by decision. Doc id → the reason.
   */
  sourceNoteExemptions: z.record(DocIdSchema, z.string().min(10)),
  /**
   * A document's accuracy review. `human-verified` must state the date it was checked and name the
   * person who checked it, with no fallback to the register's date: a page may never credit a review
   * that did not happen. `ai-checked` may pin the date, with the reason for that date, and can never
   * carry a reviewer's name.
   */
  verification: z.record(
    DocIdSchema,
    z.discriminatedUnion('status', [
      z.strictObject({
        status: z.literal('ai-checked'),
        checkedOn: IsoDateSchema,
        /** Why this page's check date differs from the register's: the evidence for the date. */
        reason: z.string().min(10),
      }),
      z.strictObject({
        status: z.literal('human-verified'),
        checkedOn: IsoDateSchema,
        reviewedBy: z
          .string()
          .refine(namesAPerson, 'reviewedBy names the person who checked the document'),
      }),
    ]),
  ),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

/**
 * `content-meta/task-links.json`: document task id -> the master-checklist task it repeats. Link a
 * pair only when both ask for the same action under the same condition (WP-30). See `linkTasks`.
 */
export const TaskLinksSchema = z.strictObject({
  version: z.literal(1),
  links: z.record(TaskIdSchema, TaskIdSchema),
  /**
   * Pairs that were compared and deliberately left unlinked, with the reason, so the next editor
   * can tell a decision from a pair nobody looked at. Not used by the build.
   */
  considered: z
    .record(TaskIdSchema, z.strictObject({ with: TaskIdSchema, reason: z.string().min(10) }))
    .optional(),
});
export type TaskLinks = z.infer<typeof TaskLinksSchema>;

/**
 * `content-meta/task-renames.json`: an old task id -> the task that replaced it, for a task whose
 * wording changed after release (its id is a hash of the text), so saved ticks follow it. See
 * `taskKeyRenames` and `content-meta/README.md`.
 */
export const TaskRenamesSchema = z.strictObject({
  version: z.literal(1),
  renames: z.record(TaskIdSchema, TaskIdSchema),
});
export type TaskRenames = z.infer<typeof TaskRenamesSchema>;

export interface ContentConfig {
  docsMeta: DocsMeta;
  legacyRefs: LegacyRefs;
  markers: Markers;
  applicability: ApplicabilityConfig;
  businessTypes: z.infer<typeof BusinessTypesFileSchema>;
  translations: Translations;
  sourceMap: SourceMap;
  provenance: Provenance;
  /** Empty when the file does not exist (the unit-test fixtures have none). */
  taskLinks: TaskLinks;
  /** Empty when the file does not exist. */
  taskRenames: TaskRenames;
}

export interface ConfigPaths {
  docsMeta: string;
  legacyRefs: string;
  markers: string;
  applicability: string;
  businessTypes: string;
  translations: string;
  sourceMap: string;
  provenance: string;
  taskLinks?: string | undefined;
  taskRenames?: string | undefined;
}

export function defaultConfigPaths(metaDir: string): ConfigPaths {
  return {
    docsMeta: join(metaDir, 'docs.meta.json'),
    legacyRefs: join(metaDir, 'legacy-refs.json'),
    markers: join(metaDir, 'markers.json'),
    applicability: join(metaDir, 'applicability.json'),
    businessTypes: join(metaDir, 'business-types.json'),
    translations: join(metaDir, 'translations.json'),
    sourceMap: join(metaDir, 'source-map.json'),
    provenance: join(metaDir, 'provenance.json'),
    taskLinks: join(metaDir, 'task-links.json'),
    taskRenames: join(metaDir, 'task-renames.json'),
  };
}

function readJson<T>(path: string, schema: z.ZodType<T>): T {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`${path}: cannot read JSON (${(error as Error).message})`, { cause: error });
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(`${path}: invalid\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export function loadConfig(paths: ConfigPaths): ContentConfig {
  return {
    docsMeta: readJson(paths.docsMeta, DocsMetaSchema),
    legacyRefs: readJson(paths.legacyRefs, LegacyRefsSchema),
    markers: readJson(paths.markers, MarkersSchema),
    applicability: readJson(paths.applicability, ApplicabilityConfigSchema),
    businessTypes: readJson(paths.businessTypes, BusinessTypesFileSchema),
    translations: readJson(paths.translations, TranslationsSchema),
    sourceMap: readJson(paths.sourceMap, SourceMapSchema),
    provenance: readJson(paths.provenance, ProvenanceSchema),
    taskLinks:
      paths.taskLinks !== undefined && existsSync(paths.taskLinks)
        ? readJson(paths.taskLinks, TaskLinksSchema)
        : { version: 1, links: {} },
    taskRenames:
      paths.taskRenames !== undefined && existsSync(paths.taskRenames)
        ? readJson(paths.taskRenames, TaskRenamesSchema)
        : { version: 1, renames: {} },
  };
}

export function translationTermsPath(repoRoot: string, lang: Lang): string {
  return join(repoRoot, 'scripts', 'translate', `TERMS-${lang}.json`);
}

/** `undefined` when the language has no terms file yet. */
export function loadTranslationTerms(path: string): TranslationTerms | undefined {
  return existsSync(path) ? readJson(path, TranslationTermsSchema) : undefined;
}

export function markersFor(config: ContentConfig, lang: Lang): LangMarkers {
  const markers = config.markers[lang];
  if (!markers) throw new Error(`markers.json has no entry for language "${lang}"`);
  return markers;
}
