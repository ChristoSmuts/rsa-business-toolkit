import { describe, expect, it } from 'vitest';
import { trustProblems } from '../../scripts/dist/check-trust';

const notice = '<aside class="st-callout st-ai-notice">About this page</aside>';
const sources = '<section class="st-sources" aria-labelledby="sources-for-this-page"></section>';

function page(kind: string, header: string, body: string): string {
  return `<main><article data-doc="x" data-kind="${kind}"><header><h1>T</h1>${header}</header>${body}</article></main>`;
}

describe('trustProblems (build plan D5 on the rendered page)', () => {
  it('passes a document page with the notice in its header and a sources section', () => {
    expect(trustProblems(page('guide', notice, sources))).toEqual([]);
  });

  it('ignores a page that is not a document page', () => {
    expect(trustProblems('<main><h1>Home</h1></main>')).toEqual([]);
  });

  it('fails a page without the AI notice, or with it outside the header', () => {
    expect(trustProblems(page('template', '', sources))).toEqual([
      'no AI notice in the article header',
    ]);
    expect(trustProblems(page('template', '', notice + sources))).toEqual([
      'no AI notice in the article header',
    ]);
  });

  it('fails a page without "Sources for this page"', () => {
    expect(trustProblems(page('checklist', notice, '<p>Body</p>'))).toEqual([
      'no "Sources for this page" section',
    ]);
  });

  it('fails a kind it does not know, so a new kind is a decision, not a gap', () => {
    expect(trustProblems(page('recipe', notice, sources))).toEqual([
      'unknown document kind "recipe"',
    ]);
  });
});
