/** Where in a markdown file a problem is: the path shown to the user and a 1-based line. */
export interface SourceLocation {
  file: string;
  line?: number | undefined;
}

/** A problem found while building content. Every build error carries a stable `code`. */
export interface ContentIssue {
  code: string;
  message: string;
  doc?: string | undefined;
  block?: string | undefined;
  at?: SourceLocation | undefined;
}

/** `docs/…/02-register.md:17: core/register:intro.2: unresolved-link: …` */
export function formatIssue(issue: ContentIssue): string {
  const file = issue.at
    ? `${issue.at.file}${issue.at.line === undefined ? '' : `:${issue.at.line}`}: `
    : '';
  const location = issue.doc ? `${issue.doc}${issue.block ? `:${issue.block}` : ''}: ` : '';
  return `${file}${location}${issue.code}: ${issue.message}`;
}

export class ContentError extends Error {
  readonly issues: readonly ContentIssue[];

  constructor(issues: readonly ContentIssue[]) {
    super(issues.map(formatIssue).join('\n'));
    this.name = 'ContentError';
    this.issues = issues;
  }
}

/** Collects issues so one build run reports every problem, not just the first. */
export class IssueCollector {
  readonly issues: ContentIssue[] = [];

  add(code: string, message: string, doc?: string, block?: string, at?: SourceLocation): void {
    this.issues.push({ code, message, doc, block, at });
  }

  get size(): number {
    return this.issues.length;
  }

  throwIfAny(): void {
    if (this.issues.length > 0) throw new ContentError(this.issues);
  }
}
