import { createHash } from 'node:crypto';
import GithubSlugger, { slug as githubSlug } from 'github-slugger';

export function sha1(text: string): string {
  return createHash('sha1').update(text, 'utf8').digest('hex');
}

/** 16 hex characters of SHA-1: the content hash stored on blocks and docs. */
export function shortHash(text: string): string {
  return sha1(text).slice(0, 16);
}

/** github-slugger slug without de-duplication (GitHub's anchor algorithm). */
export function slug(text: string): string {
  return githubSlug(text);
}

/** One slugger per document, so repeated headings get `-1`, `-2` exactly like GitHub. */
export function createSlugger(): GithubSlugger {
  return new GithubSlugger();
}

/** Allocates `<headingId>.<n>` ids, restarting the counter under every heading. */
export class BlockIdAllocator {
  private readonly counters = new Map<string, number>();
  private current = 'intro';

  setHeading(id: string): void {
    this.current = id;
  }

  get heading(): string {
    return this.current;
  }

  next(): string {
    const n = (this.counters.get(this.current) ?? 0) + 1;
    this.counters.set(this.current, n);
    return `${this.current}.${n}`;
  }
}

/** Text used for task ids: case, spacing and a trailing full stop do not change the id. */
export function normaliseTaskText(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ').trim().replace(/\.+$/, '').toLowerCase();
}

/** `docId:sha1(normalised English text)[0..8]`. */
export function taskIdBase(docId: string, text: string): string {
  return `${docId}:${sha1(normaliseTaskText(text)).slice(0, 8)}`;
}

/**
 * Task ids are `taskIdBase`, suffixed `-2`, `-3` on collision so the output stays valid while the build
 * reports the duplicate (see `assignTaskIds`).
 */
export class TaskIdAllocator {
  private readonly used = new Map<string, number>();

  allocate(docId: string, text: string): string {
    const base = taskIdBase(docId, text);
    const count = this.used.get(base) ?? 0;
    this.used.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  }
}

/** `core/register` → `core__register.json` (flat, filesystem-safe file name). */
export function docFileName(docId: string): string {
  return `${docId.replaceAll('/', '__')}.json`;
}
