/**
 * Everything the block and inline renderers need, in one object, so a component tree does not
 * thread six props through every level.
 *
 * Pure: the caller loads the collections (see `collections.ts`) and passes them in.
 */
import type { Locale } from '../../i18n/locales';
import { officialUrls } from './render';
import type { GlossaryFile, Manifest, SourcesFile } from './schema';

export interface ContentContext {
  /** The reader's language: every internal link is built for this locale. */
  readonly locale: Locale;
  /**
   * The language of the blocks themselves. It differs from `locale` when a page falls back to the
   * English document, and the renderers then set `lang` on the content (build plan B5).
   *
   * Everything a renderer writes *inside* the content is in this language too: the "In plain
   * words" label, a table's region name, a docref's document title. A fallback block is then one
   * English island under one `lang`, instead of English text with Afrikaans labels read in an
   * English voice. Every URL still uses `locale`, so links keep the reader in their language.
   */
  readonly contentLang: Locale;
  readonly manifest: Manifest;
  readonly glossary: GlossaryFile | undefined;
  readonly sources: SourcesFile | undefined;
  /**
   * The language of `sources`. The register is one document (`lookup/sources`) translated on its
   * own schedule, so a translated page can carry the English register until the Afrikaans one
   * exists. Register text is then marked with this language, not with `contentLang`.
   */
  readonly sourcesLang: Locale;
  /** Every URL the register marks as official, for the `Official` badge on external links. */
  readonly officialUrls: ReadonlySet<string>;
  /** The document being rendered, when there is one. Used for task ids and same-page anchors. */
  readonly docId: string | undefined;
}

export interface ContentContextInput {
  readonly locale: Locale;
  readonly manifest: Manifest;
  readonly contentLang?: Locale | undefined;
  readonly glossary?: GlossaryFile | undefined;
  readonly sources?: SourcesFile | undefined;
  /** Defaults to `contentLang`. */
  readonly sourcesLang?: Locale | undefined;
  readonly docId?: string | undefined;
}

export function createContentContext(input: ContentContextInput): ContentContext {
  const contentLang = input.contentLang ?? input.locale;
  return {
    locale: input.locale,
    contentLang,
    manifest: input.manifest,
    glossary: input.glossary,
    sources: input.sources,
    sourcesLang: input.sourcesLang ?? contentLang,
    officialUrls: officialUrls(input.sources),
    docId: input.docId,
  };
}

/** True when the blocks are in another language than the page (English fallback). */
export function isFallbackContent(context: ContentContext): boolean {
  return context.contentLang !== context.locale;
}
