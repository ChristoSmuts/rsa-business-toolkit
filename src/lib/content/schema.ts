/**
 * Zod schemas for every generated content file under `src/data/**` (Part A4 of the build plan).
 *
 * `z` is imported from `zod`. Astro's `astro/zod` re-exports `zod/v4` from the same single
 * installed `zod` package, so these schemas are one instance shared by the content pipeline
 * (`scripts/content/**`, run with tsx) and by `src/content.config.ts`.
 */
import { z } from 'zod';

export const LANGS = ['en', 'af', 'zu', 'xh', 'st', 'tn', 'nso', 'ts', 'ss', 've', 'nr'] as const;
export const LangSchema = z.enum(LANGS);
export type Lang = z.infer<typeof LangSchema>;

export const EntitySchema = z.enum(['all', 'sole-prop', 'pty']);
export type Entity = z.infer<typeof EntitySchema>;

export const BUSINESS_TYPE_IDS = [
  'vehicle-dealer',
  'food',
  'beauty',
  'retail-online',
  'services-trades',
  'professional-creative',
] as const;
export const BusinessTypeIdSchema = z.enum(BUSINESS_TYPE_IDS);
export type BusinessTypeId = z.infer<typeof BusinessTypeIdSchema>;

export const SECTION_IDS = [
  'start',
  'core',
  'branding',
  'paperwork',
  'business-types',
  'lookup',
] as const;
export const SectionIdSchema = z.enum(SECTION_IDS);
export type SectionId = z.infer<typeof SectionIdSchema>;

export const DocKindSchema = z.enum(['guide', 'template', 'glossary', 'sources', 'checklist']);
export type DocKind = z.infer<typeof DocKindSchema>;

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
export const DocIdSchema = z
  .string()
  .regex(new RegExp(`^(?:${SECTION_IDS.join('|')})(?:/${SLUG}){1,2}$`), 'invalid doc id');
export type DocId = z.infer<typeof DocIdSchema>;

/** Heading ids are github-slugger slugs of the English heading text. */
export const HeadingIdSchema = z
  .string()
  .regex(/^[\p{Ll}\p{N}_][\p{Ll}\p{N}_-]*$/u, 'invalid heading id');
/** Non-heading blocks: `<headingId>.<n>` or `intro.<n>`. */
export const BlockIdSchema = z
  .string()
  .regex(/^[\p{Ll}\p{N}_][\p{Ll}\p{N}_-]*(?:\.[1-9]\d*)?$/u, 'invalid block id');
export const HashSchema = z.string().regex(/^[0-9a-f]{16}$/, 'invalid hash');
/**
 * `2026-09-13`, and a day that exists in the calendar: `2026-13-45`, `2026-02-30` and `2025-02-29`
 * are not dates. Used for every date the pipeline writes, so a page can never show an impossible one.
 */
export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export const IsoDateSchema = z
  .string()
  .refine(isIsoDate, 'invalid ISO date: expected a real calendar date written as YYYY-MM-DD');
export const TaskIdSchema = z
  .string()
  .regex(
    new RegExp(`^(?:${SECTION_IDS.join('|')})(?:/${SLUG}){1,2}:[0-9a-f]{8}(?:-[2-9]|-[1-9]\\d+)?$`),
    'invalid task id',
  );

export const ApplicabilitySchema = z.strictObject({
  entity: z.enum(['sole-prop', 'pty']).optional(),
  businessTypes: z.array(BusinessTypeIdSchema).min(1).optional(),
  tags: z
    .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
    .min(1)
    .optional(),
});
export type Applicability = z.infer<typeof ApplicabilitySchema>;

export const PlaceholderStyleSchema = z.enum([
  'identity',
  'field',
  'format',
  'choice',
  'instruction',
]);
export type PlaceholderStyle = z.infer<typeof PlaceholderStyleSchema>;

export type TextRun = { t: 'text'; v: string };
export type StrongRun = { t: 'strong'; c: InlineRun[] };
export type EmRun = { t: 'em'; c: InlineRun[] };
export type CodeRun = { t: 'code'; v: string };
export type InternalLinkRun = {
  t: 'link';
  doc: string;
  anchor?: string | undefined;
  c: InlineRun[];
};
export type ExternalLinkRun = { t: 'link'; href: string; external: true; c: InlineRun[] };
export type DocDocrefRun = { t: 'docref'; doc: string; label: string };
export type SectionDocrefRun = { t: 'docref'; section: SectionId; label: string };
export type DocrefRun = DocDocrefRun | SectionDocrefRun;
export type PlaceholderRun = {
  t: 'placeholder';
  v: string;
  style: PlaceholderStyle;
  nested?: true | undefined;
  key?: string | undefined;
};
export type SiglineRun = { t: 'sigline' };
export type BreakRun = { t: 'br' };
export type InlineRun =
  | TextRun
  | StrongRun
  | EmRun
  | CodeRun
  | InternalLinkRun
  | ExternalLinkRun
  | DocrefRun
  | PlaceholderRun
  | SiglineRun
  | BreakRun;

export const PlaceholderRunSchema = z.strictObject({
  t: z.literal('placeholder'),
  v: z.string().min(1),
  style: PlaceholderStyleSchema,
  nested: z.literal(true).optional(),
  key: z
    .string()
    .regex(/^[a-z][A-Za-z]+$/)
    .optional(),
});

export const DocrefRunSchema = z.union([
  z.strictObject({ t: z.literal('docref'), doc: DocIdSchema, label: z.string().min(1) }),
  z.strictObject({ t: z.literal('docref'), section: SectionIdSchema, label: z.string().min(1) }),
]);

export const InlineRunSchema: z.ZodType<InlineRun> = z.lazy(() =>
  z.union([
    z.strictObject({ t: z.literal('text'), v: z.string().min(1) }),
    z.strictObject({ t: z.literal('strong'), c: InlineRunsSchema }),
    z.strictObject({ t: z.literal('em'), c: InlineRunsSchema }),
    z.strictObject({ t: z.literal('code'), v: z.string().min(1) }),
    z.strictObject({
      t: z.literal('link'),
      doc: DocIdSchema,
      anchor: HeadingIdSchema.optional(),
      c: InlineRunsSchema,
    }),
    z.strictObject({
      t: z.literal('link'),
      href: z.url({ protocol: /^https?$/ }),
      external: z.literal(true),
      c: InlineRunsSchema,
    }),
    DocrefRunSchema,
    PlaceholderRunSchema,
    z.strictObject({ t: z.literal('sigline') }),
    z.strictObject({ t: z.literal('br') }),
  ]),
);
export const InlineRunsSchema: z.ZodType<InlineRun[]> = z.lazy(() => z.array(InlineRunSchema));

export const TaskSchema = z.strictObject({
  id: TaskIdSchema,
  c: InlineRunsSchema,
  when: ApplicabilitySchema.optional(),
  doc: DocIdSchema,
  block: BlockIdSchema,
  /**
   * The master-checklist task this one repeats (`content-meta/task-links.json`). A tick is saved
   * under `sameAs ?? id`, so ticking either copy ticks both. Taken from the English task, so it is
   * the same in every language.
   */
  sameAs: TaskIdSchema.optional(),
});
export type Task = z.infer<typeof TaskSchema>;

/**
 * `prompt`: translated, rendered with a copy button. `template-preview`: field labels translated, rule
 * lines kept. `example` and `listing`: never translated (byte-identical in every language). `snippet`:
 * translated, rendered as plain preformatted text without a copy button (for example worked answers).
 */
export const FenceVariantSchema = z.enum([
  'prompt',
  'template-preview',
  'example',
  'listing',
  'snippet',
]);
export type FenceVariant = z.infer<typeof FenceVariantSchema>;

const blockBase = {
  id: BlockIdSchema,
  hash: HashSchema,
  /** AF (and other translated) blocks: hash of the English block they translate. */
  sourceHash: HashSchema.optional(),
  /** Block is an English fallback inside a translated doc. */
  fallback: z.literal(true).optional(),
  /** Section hidden via `hideSections` (kept so anchors keep resolving). */
  hidden: z.literal(true).optional(),
};

/** `##` and `###` are depth 2 and 3; a bold-only line is depth 4 with `pseudo: true` (checked on Doc). */
export const HeadingBlockSchema = z.strictObject({
  ...blockBase,
  kind: z.literal('heading'),
  depth: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  text: z.string().min(1),
  c: InlineRunsSchema,
  pseudo: z.literal(true).optional(),
  ref: DocIdSchema.optional(),
  appliesTo: ApplicabilitySchema.optional(),
});

export const BlockSchema = z.discriminatedUnion('kind', [
  HeadingBlockSchema,
  z.strictObject({ ...blockBase, kind: z.literal('paragraph'), c: InlineRunsSchema }),
  z.strictObject({
    ...blockBase,
    kind: z.literal('callout'),
    style: z.enum(['plain', 'note']),
    c: InlineRunsSchema,
    pairsWith: BlockIdSchema.optional(),
  }),
  z.strictObject({
    ...blockBase,
    kind: z.literal('list'),
    ordered: z.boolean(),
    start: z.number().int().nonnegative().optional(),
    items: z.array(InlineRunsSchema).min(1),
  }),
  z.strictObject({
    ...blockBase,
    kind: z.literal('tasklist'),
    group: InlineRunsSchema.optional(),
    items: z.array(TaskSchema).min(1),
  }),
  z.strictObject({
    ...blockBase,
    kind: z.literal('table'),
    header: z.array(InlineRunsSchema).min(1),
    rows: z.array(z.array(InlineRunsSchema)),
    align: z.array(z.enum(['left', 'center', 'right']).nullable()),
    /**
     * One entry per row: the condition the row's own text states (`Monthly, if you run payroll`), or `null`.
     * Combine it with the enclosing heading's `appliesTo`. Absent when no row states a condition.
     */
    rowWhen: z.array(ApplicabilitySchema.nullable()).optional(),
  }),
  z.strictObject({
    ...blockBase,
    kind: z.literal('code'),
    variant: FenceVariantSchema,
    text: z.string(),
    placeholders: z.array(PlaceholderRunSchema).optional(),
  }),
  z.strictObject({
    ...blockBase,
    kind: z.literal('terms'),
    intro: InlineRunsSchema,
    items: z.array(z.strictObject({ term: InlineRunsSchema, meaning: InlineRunsSchema })).min(1),
  }),
  z.strictObject({ ...blockBase, kind: z.literal('note'), c: InlineRunsSchema }),
  z.strictObject({ ...blockBase, kind: z.literal('hr') }),
  z.strictObject({ ...blockBase, kind: z.literal('toc') }),
  z.strictObject({ ...blockBase, kind: z.literal('glossary'), group: HeadingIdSchema }),
]);
export type Block = z.infer<typeof BlockSchema>;
export type BlockKind = Block['kind'];
export type HeadingBlock = z.infer<typeof HeadingBlockSchema>;

export const TranslationStatusSchema = z.enum([
  'source',
  'machine-unreviewed',
  'reviewed',
  'fallback',
]);
export type TranslationStatus = z.infer<typeof TranslationStatusSchema>;

export const DocAppliesToSchema = z.strictObject({
  entity: EntitySchema,
  businessTypes: z.union([z.literal('all'), z.array(BusinessTypeIdSchema).min(1)]),
});
export type DocAppliesTo = z.infer<typeof DocAppliesToSchema>;

export const DocHeadingSchema = z.strictObject({
  id: HeadingIdSchema,
  depth: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  text: z.string().min(1),
  appliesTo: ApplicabilitySchema.optional(),
  pseudo: z.literal(true).optional(),
  hidden: z.literal(true).optional(),
});
export type DocHeading = z.infer<typeof DocHeadingSchema>;

/** Ids of the `sources.json` entries and acts that support a document's claims. */
export const DocSourcesSchema = z.strictObject({
  entries: z.array(HeadingIdSchema),
  acts: z.array(HeadingIdSchema),
});
export type DocSources = z.infer<typeof DocSourcesSchema>;

/** Instead of a source list, by design: why, and where readers find the sources. */
export const SourceNoteSchema = z.strictObject({
  reason: z.string().min(10),
  see: z.array(DocIdSchema),
});
export type SourceNote = z.infer<typeof SourceNoteSchema>;

export const VerificationStatusSchema = z.enum(['ai-checked', 'human-verified']);

/**
 * A reviewer's name must contain at least one letter. `trim` alone lets through a zero-width space or a
 * lone `-`, which would show "Checked by" with no visible name.
 */
export function namesAPerson(name: string | undefined): boolean {
  return /\p{L}/u.test(name ?? '');
}

/**
 * How the facts of a document were checked. `human-verified` names the person who checked it and the
 * date they did, both required: a page may never credit a review that did not happen. `ai-checked`
 * never carries a name, so an unreviewed page cannot borrow a reviewer's authority.
 */
export const VerificationSchema = z
  .strictObject({
    status: VerificationStatusSchema,
    checkedOn: IsoDateSchema,
    reviewedBy: z.string().optional(),
  })
  .superRefine((verification, ctx) => {
    if (verification.status === 'human-verified') {
      if (!namesAPerson(verification.reviewedBy)) {
        ctx.addIssue({
          code: 'custom',
          path: ['reviewedBy'],
          message: 'a human-verified document names the reviewer in reviewedBy',
        });
      }
    } else if (verification.reviewedBy !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['reviewedBy'],
        message: 'only a human-verified document has reviewedBy',
      });
    }
  });
export type Verification = z.infer<typeof VerificationSchema>;

export const DocSchema = z
  .strictObject({
    id: DocIdSchema,
    lang: LangSchema,
    slug: z.string().regex(new RegExp(`^${SLUG}$`)),
    route: z.string().regex(new RegExp(`^(?:${SLUG}/)+$`)),
    section: SectionIdSchema,
    order: z.number().int().positive(),
    kind: DocKindSchema,
    title: z.string().min(1),
    h1: z.string().min(1),
    summary: z.string().min(1).max(200),
    readingTime: z.number().int().positive(),
    appliesTo: DocAppliesToSchema,
    tags: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
    related: z.array(DocIdSchema).max(5),
    terms: z.array(z.strictObject({ term: z.string().min(1), meaning: z.string().min(1) })),
    headings: z.array(DocHeadingSchema),
    blocks: z.array(BlockSchema).min(1),
    /** Every page says it was generated by AI: from the footer, or the project default. */
    generated: z.strictObject({ date: IsoDateSchema, tool: z.string().min(1) }),
    sources: DocSourcesSchema,
    sourceNote: SourceNoteSchema.optional(),
    verification: VerificationSchema,
    translation: z.strictObject({ status: TranslationStatusSchema, sourceLang: LangSchema }),
    archived: z.boolean().optional(),
    sourcePath: z.string().min(1),
    contentHash: HashSchema,
  })
  .superRefine((doc, ctx) => {
    const seen = new Set<string>();
    const pseudoRule = (heading: { id: string; depth: number; pseudo?: true | undefined }) => {
      if ((heading.depth === 4) !== (heading.pseudo === true)) {
        ctx.addIssue({
          code: 'custom',
          message: `heading ${heading.id}: depth 4 is used exactly for pseudo headings`,
        });
      }
    };
    for (const block of doc.blocks) {
      if (seen.has(block.id))
        ctx.addIssue({ code: 'custom', message: `duplicate block id ${block.id}` });
      seen.add(block.id);
      if (block.kind === 'heading') pseudoRule(block);
      if (block.kind === 'table' && block.rowWhen && block.rowWhen.length !== block.rows.length) {
        ctx.addIssue({ code: 'custom', message: `table ${block.id}: rowWhen must match the rows` });
      }
    }
    for (const heading of doc.headings) pseudoRule(heading);
    if (doc.verification.status === 'human-verified' && !namesAPerson(doc.verification.reviewedBy))
      ctx.addIssue({ code: 'custom', message: 'a human-verified document names reviewedBy' });
    if (doc.verification.checkedOn < doc.generated.date)
      ctx.addIssue({
        code: 'custom',
        message: `checked on ${doc.verification.checkedOn}, before it was generated on ${doc.generated.date}`,
      });
    if (doc.verification.status === 'ai-checked' && doc.verification.reviewedBy !== undefined)
      ctx.addIssue({ code: 'custom', message: 'only a human-verified document has reviewedBy' });
    if (doc.sources.entries.length + doc.sources.acts.length === 0 && doc.sourceNote === undefined)
      ctx.addIssue({
        code: 'custom',
        message: 'a document lists at least one source or carries a sourceNote',
      });
    if (!doc.id.endsWith(`/${doc.slug}`))
      ctx.addIssue({ code: 'custom', message: 'slug must be the last id segment' });
  });
export type Doc = z.infer<typeof DocSchema>;

export const GlossaryEntrySchema = z.strictObject({
  id: HeadingIdSchema,
  term: z.string().min(1),
  definition: InlineRunsSchema,
  group: z.string().min(1),
  groupId: HeadingIdSchema,
});
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;

export const GlossaryFileSchema = z.strictObject({
  lang: LangSchema,
  doc: DocIdSchema,
  groups: z.array(
    z.strictObject({
      id: HeadingIdSchema,
      title: z.string().min(1),
      order: z.number().int().positive(),
    }),
  ),
  entries: z.array(GlossaryEntrySchema),
});
export type GlossaryFile = z.infer<typeof GlossaryFileSchema>;

export const ActSchema = z.strictObject({
  id: HeadingIdSchema,
  name: z.string().min(1),
  governs: InlineRunsSchema,
  appearsIn: z.array(DocIdSchema).min(1),
});
export type Act = z.infer<typeof ActSchema>;

/**
 * One source in the register. Nothing is shortened: `title`, `qualifier` (the rest of the title line),
 * `supports` and `notes` together hold every word the register writes for the source.
 */
export const SourceEntrySchema = z
  .strictObject({
    id: HeadingIdSchema,
    group: z.string().min(1),
    groupId: HeadingIdSchema,
    /** The sub-group this entry is listed under (a bold label line, or an entry followed by a list). */
    subgroupId: HeadingIdSchema.optional(),
    title: z.string().min(1),
    official: z.boolean(),
    /** `web`: open `url`. `citation`: the register gives no link, and `noUrlReason` says why. */
    type: z.enum(['web', 'citation']),
    url: z.url({ protocol: /^https$/ }).optional(),
    noUrlReason: z.string().min(10).optional(),
    /** Every external link in the entry, in order. */
    urls: z.array(z.url({ protocol: /^https$/ })),
    qualifier: InlineRunsSchema.optional(),
    /**
     * What the source supports, ready to render. The register's own `Supports:` line when it wrote one;
     * otherwise the title-line qualifier or the entry's single note, moved here so a page has one field
     * to show and no text appears twice. An entry with no `supports` has no such text in the register,
     * and a page omits the label for it rather than printing an empty one.
     */
    supports: InlineRunsSchema.optional(),
    /** Where `supports` came from, when it was not a `Supports:` line. */
    supportsFrom: z.enum(['qualifier', 'note']).optional(),
    notes: z.array(InlineRunsSchema).optional(),
    block: BlockIdSchema,
    item: z.number().int().nonnegative().optional(),
  })
  .superRefine((entry, ctx) => {
    if (entry.type === 'web' && (entry.url === undefined || entry.noUrlReason !== undefined)) {
      ctx.addIssue({
        code: 'custom',
        message: `${entry.id}: a web source has a url and no reason`,
      });
    }
    if (
      entry.type === 'citation' &&
      (entry.url !== undefined || entry.urls.length > 0 || entry.noUrlReason === undefined)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: `${entry.id}: a citation has no url and states a noUrlReason`,
      });
    }
    if (entry.supportsFrom !== undefined && entry.supports === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `${entry.id}: supportsFrom says where supports came from, so supports must be set`,
      });
    }
  });
export type SourceEntry = z.infer<typeof SourceEntrySchema>;

/** A label inside a group: a bold line that introduces a list, or an entry whose list follows it. */
export const SourceSubgroupSchema = z.strictObject({
  id: HeadingIdSchema,
  title: z.string().min(1),
  block: BlockIdSchema,
  notes: z.array(InlineRunsSchema),
  /** Set when the label is itself a source entry (for example "…, as reported by:"). */
  entry: HeadingIdSchema.optional(),
});
export type SourceSubgroup = z.infer<typeof SourceSubgroupSchema>;

export const SourcesFileSchema = z
  .strictObject({
    lang: LangSchema,
    doc: DocIdSchema,
    checkedOn: IsoDateSchema,
    acts: z.array(ActSchema).min(1),
    groups: z.array(
      z.strictObject({
        id: HeadingIdSchema,
        title: z.string().min(1),
        order: z.number().int().positive(),
        notes: z.array(InlineRunsSchema),
        subgroups: z.array(SourceSubgroupSchema),
      }),
    ),
    entries: z.array(SourceEntrySchema).min(1),
  })
  .superRefine((file, ctx) => {
    const entryIds = new Set<string>();
    for (const entry of file.entries) {
      if (entryIds.has(entry.id))
        ctx.addIssue({ code: 'custom', message: `duplicate source id ${entry.id}` });
      entryIds.add(entry.id);
    }
    const subgroups = new Map<string, string>();
    for (const group of file.groups) {
      for (const subgroup of group.subgroups) {
        if (subgroups.has(subgroup.id))
          ctx.addIssue({ code: 'custom', message: `duplicate sub-group id ${subgroup.id}` });
        subgroups.set(subgroup.id, group.id);
        if (subgroup.entry !== undefined && !entryIds.has(subgroup.entry))
          ctx.addIssue({ code: 'custom', message: `sub-group ${subgroup.id}: unknown entry` });
      }
    }
    for (const entry of file.entries) {
      if (entry.subgroupId !== undefined && subgroups.get(entry.subgroupId) !== entry.groupId)
        ctx.addIssue({ code: 'custom', message: `${entry.id}: sub-group not in its group` });
    }
  });
export type SourcesFile = z.infer<typeof SourcesFileSchema>;

export const TaskRecordSchema = z.strictObject({
  id: TaskIdSchema,
  c: InlineRunsSchema,
  when: ApplicabilitySchema.optional(),
  doc: DocIdSchema,
  block: BlockIdSchema,
  heading: HeadingIdSchema.optional(),
  group: InlineRunsSchema.optional(),
  order: z.number().int().nonnegative(),
  /** See `TaskSchema.sameAs`. */
  sameAs: TaskIdSchema.optional(),
});
export type TaskRecord = z.infer<typeof TaskRecordSchema>;

export const TasksFileSchema = z.strictObject({
  lang: LangSchema,
  tasks: z.array(TaskRecordSchema),
});
export type TasksFile = z.infer<typeof TasksFileSchema>;

/**
 * `src/data/task-keys.json`: every key a tick may have been saved under that is no longer a key,
 * mapped to the key now (a linked task's own id -> its master task; a reworded task's old id -> the
 * new one, from `content-meta/task-renames.json`). `src/scripts/checklist.ts` moves saved ticks by
 * it. Language-independent.
 */
export const TaskKeysFileSchema = z.strictObject({
  version: z.literal(1),
  renames: z.record(TaskIdSchema, TaskIdSchema),
});
export type TaskKeysFile = z.infer<typeof TaskKeysFileSchema>;

export const QuickAnswerSchema = z.strictObject({
  id: HeadingIdSchema,
  question: InlineRunsSchema,
  targets: z.array(DocrefRunSchema).min(1),
  note: InlineRunsSchema.optional(),
});
export type QuickAnswer = z.infer<typeof QuickAnswerSchema>;

export const QuickAnswersFileSchema = z.strictObject({
  lang: LangSchema,
  doc: DocIdSchema,
  items: z.array(QuickAnswerSchema).min(1),
});
export type QuickAnswersFile = z.infer<typeof QuickAnswersFileSchema>;

export const LangStatusSchema = z.enum(['source', 'machine-unreviewed', 'reviewed', 'partial']);

export const ManifestSchema = z.strictObject({
  version: z.literal(1),
  contentHash: HashSchema,
  sections: z.array(
    z.strictObject({
      id: SectionIdSchema,
      order: z.number().int().positive(),
      route: z.string().regex(new RegExp(`^(?:${SLUG}/)+$`)),
      titles: z.partialRecord(LangSchema, z.string().min(1)),
      docs: z.array(DocIdSchema),
    }),
  ),
  docs: z.record(
    DocIdSchema,
    z.strictObject({
      slug: z.string().min(1),
      route: z.string().min(1),
      section: SectionIdSchema,
      order: z.number().int().positive(),
      kind: DocKindSchema,
      titles: z.partialRecord(LangSchema, z.string().min(1)),
      langs: z.array(LangSchema).min(1),
      appliesTo: DocAppliesToSchema,
    }),
  ),
  langs: z.partialRecord(
    LangSchema,
    z.strictObject({ status: LangStatusSchema, docCount: z.number().int().nonnegative() }),
  ),
  /** Filled by the search build (WP-33); absent until then. */
  searchIndex: z.partialRecord(LangSchema, z.string()).optional(),
});
export type Manifest = z.infer<typeof ManifestSchema>;

export const EffortSchema = z.enum(['lowest', 'low-medium', 'medium', 'medium-high', 'high']);
export type Effort = z.infer<typeof EffortSchema>;

export const BusinessTypeSchema = z.strictObject({
  id: BusinessTypeIdSchema,
  doc: DocIdSchema,
  order: z.number().int().positive(),
  effort: EffortSchema,
  masterChecklistGroup: HeadingIdSchema,
  titles: z.partialRecord(LangSchema, z.string().min(1)),
});
export type BusinessType = z.infer<typeof BusinessTypeSchema>;

export const BusinessTypesFileSchema = z
  .strictObject({
    types: z.array(BusinessTypeSchema).length(BUSINESS_TYPE_IDS.length),
    effortScale: z.array(EffortSchema).length(EffortSchema.options.length),
    pickTable: z.strictObject({
      heading: HeadingIdSchema,
      rows: z.record(z.string().min(1), BusinessTypeIdSchema),
      effortLabels: z.record(z.string().min(1), EffortSchema),
    }),
    presets: z.strictObject({
      general: z.strictObject({
        expandsTo: z.array(BusinessTypeIdSchema).min(1),
        requireExplicit: z.array(BusinessTypeIdSchema).min(1),
      }),
    }),
  })
  .superRefine((file, ctx) => {
    const ids = new Set(file.types.map((t) => t.id));
    if (ids.size !== BUSINESS_TYPE_IDS.length)
      ctx.addIssue({ code: 'custom', message: 'business type ids must be unique' });
    const { expandsTo, requireExplicit } = file.presets.general;
    const covered = new Set([...expandsTo, ...requireExplicit]);
    if (
      covered.size !== BUSINESS_TYPE_IDS.length ||
      expandsTo.some((t) => requireExplicit.includes(t))
    ) {
      ctx.addIssue({ code: 'custom', message: 'general preset must partition the six types' });
    }
  });
export type BusinessTypesFile = z.infer<typeof BusinessTypesFileSchema>;

/*
 * Reading paths (build plan A5, WP-31). `content-meta/paths.json` holds the rules; the pipeline
 * checks every reference against the corpus and writes `src/data/paths.json`, which adds what the
 * path engine and the pages need about each referenced document. The profile values are repeated,
 * as `zod/mini` schemas, in `src/lib/profile.ts` for client code; a unit test keeps them equal.
 */
export const PROFILE_ENTITIES = ['sole-prop', 'pty', 'undecided'] as const;
export const ProfileEntitySchema = z.enum(PROFILE_ENTITIES);
export type ProfileEntity = z.infer<typeof ProfileEntitySchema>;

export const STAGES = ['not-started', 'trading', 'pty-growing'] as const;
export const StageSchema = z.enum(STAGES);
export type Stage = z.infer<typeof StageSchema>;

/** A rule step that stands for the reader's own business-type documents. */
export const BUSINESS_TYPES_REF = '$businessTypes';
export const PathRefSchema = z
  .string()
  .regex(
    new RegExp(
      `^(?:\\$businessTypes|(?:${SECTION_IDS.join('|')})(?:/${SLUG}){1,2}(?:#[\\p{Ll}\\p{N}_][\\p{Ll}\\p{N}_-]*)?)$`,
      'u',
    ),
    'invalid path reference',
  );

/** A step's condition: every key given must match the profile (the A5 matching rule). */
export const PathConditionSchema = z
  .strictObject({
    entity: z.array(ProfileEntitySchema).min(1).optional(),
    businessTypes: z.array(BusinessTypeIdSchema).min(1).optional(),
  })
  .refine((value) => value.entity !== undefined || value.businessTypes !== undefined, {
    message: 'a condition needs entity or businessTypes',
  });
export type PathCondition = z.infer<typeof PathConditionSchema>;

export const PathStepSchema = z.strictObject({
  /** The item of the rule's list in the source document: the step's wording and its "why". */
  item: z.number().int().nonnegative(),
  docs: z.array(PathRefSchema).min(1),
  /** The step is left out unless the profile matches. */
  when: PathConditionSchema.optional(),
  /** The "why" from the source list shows only when the profile matches (Path 4 is a dealer's). */
  whyWhen: PathConditionSchema.optional(),
});
export type PathStep = z.infer<typeof PathStepSchema>;

export const PathRuleSchema = z.strictObject({
  stage: StageSchema,
  /** The ordered list block in the source document that this rule follows. */
  list: BlockIdSchema,
  steps: z.array(PathStepSchema).min(1),
});
export type PathRule = z.infer<typeof PathRuleSchema>;

const PathChecklistSchema = z.strictObject({
  doc: DocIdSchema,
  parts: z.array(z.strictObject({ heading: HeadingIdSchema })).min(1),
});

function oneRulePerStage(file: { rules: readonly PathRule[] }, ctx: z.RefinementCtx): void {
  const stages = new Set(file.rules.map((rule) => rule.stage));
  if (stages.size !== STAGES.length)
    ctx.addIssue({ code: 'custom', message: 'paths need exactly one rule per stage' });
}

/** `content-meta/paths.json`. */
export const PathsConfigSchema = z
  .strictObject({
    version: z.literal(1),
    /** The document whose lists the rules follow ("How to use this toolkit"). */
    source: DocIdSchema,
    rules: z.array(PathRuleSchema).length(STAGES.length),
    /** The personalised checklist: these parts of the master checklist, filtered by the profile. */
    checklist: PathChecklistSchema,
  })
  .superRefine(oneRulePerStage);
export type PathsConfig = z.infer<typeof PathsConfigSchema>;

/** What the engine and the pages need about a document a rule refers to. */
export const PathDocSchema = z.strictObject({
  route: z.string().min(1),
  titles: z.partialRecord(LangSchema, z.string().min(1)),
  appliesTo: DocAppliesToSchema,
});
export type PathDoc = z.infer<typeof PathDocSchema>;

/** `src/data/paths.json`: the rules plus the business types and documents they refer to. */
export const PathsFileSchema = z
  .strictObject({
    version: z.literal(1),
    source: DocIdSchema,
    rules: z.array(PathRuleSchema).length(STAGES.length),
    checklist: PathChecklistSchema,
    /** The six types in their order, with the document each one adds to a path. */
    businessTypes: z
      .array(z.strictObject({ id: BusinessTypeIdSchema, doc: DocIdSchema }))
      .length(BUSINESS_TYPE_IDS.length),
    /** What the General preset expands to. */
    general: z.array(BusinessTypeIdSchema).min(1),
    docs: z.record(DocIdSchema, PathDocSchema),
  })
  .superRefine(oneRulePerStage);
export type PathsFile = z.infer<typeof PathsFileSchema>;
