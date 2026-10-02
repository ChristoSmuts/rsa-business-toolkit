import { describe, expect, it } from 'vitest';
import { expectedDocumentPages, trustProblems } from '../../scripts/dist/check-trust';

const notice =
  '<aside class="st-callout st-ai-notice"><p>About this page</p>' +
  '<p class="st-ai-notice__status"><span>AI-checked</span></p>' +
  '<p><a href="/business-toolkit/start/how-this-was-made/">How this was made</a></p></aside>';
const listed =
  '<section class="st-sources" aria-labelledby="sources-for-this-page"><h2 id="sources-for-this-page">Sources</h2>' +
  '<p class="st-hint">2 sources</p><ul><li class="st-source">SARS</li></ul>' +
  '<p><a href="/business-toolkit/sources/">See the full register</a></p></section>';
const noted =
  '<section class="st-sources" aria-labelledby="sources-for-this-page"><h2 id="sources-for-this-page">Sources</h2>' +
  '<p class="st-hint">This start page orients you; its figures are sourced on the pages it names.</p>' +
  '<p><a href="/business-toolkit/sources/">See the full register</a></p></section>';

function page(kind: string, header: string, body: string, doc = 'x/y'): string {
  return `<main><article data-doc="${doc}" data-kind="${kind}"><header><h1>T</h1>${header}</header>${body}</article></main>`;
}

describe('trustProblems (build plan D5 on the rendered page)', () => {
  it('passes a page with its notice and a list of sources, or a note and the register link', () => {
    expect(trustProblems(page('guide', notice, listed))).toEqual([]);
    expect(trustProblems(page('guide', notice, noted))).toEqual([]);
  });

  it('ignores a page that is not a document page', () => {
    expect(trustProblems('<main><h1>Home</h1></main>')).toEqual([]);
  });

  it('fails a page without the AI notice, or with it outside the header', () => {
    expect(trustProblems(page('template', '', listed))).toEqual([
      'no AI notice in the article header',
    ]);
    expect(trustProblems(page('template', '', notice + listed))).toEqual([
      'no AI notice in the article header',
    ]);
  });

  it('fails a notice without its status or its "How this was made" link', () => {
    const bare = '<aside class="st-callout st-ai-notice"><p>About this page</p></aside>';
    expect(trustProblems(page('guide', bare, listed))).toEqual([
      'the AI notice has no status',
      'the AI notice does not link "How this was made"',
    ]);
  });

  it('fails a page without "Sources for this page"', () => {
    expect(trustProblems(page('checklist', notice, '<p>Body</p>'))).toEqual([
      'no "Sources for this page" section',
    ]);
  });

  it('fails a sources section that renders empty, as when the register does not resolve', () => {
    const empty =
      '<section class="st-sources" aria-labelledby="sources-for-this-page"><h2 id="sources-for-this-page">S</h2>' +
      '<p class="st-hint">None.</p></section>';
    expect(trustProblems(page('guide', notice, empty))).toEqual([
      '"Sources for this page" lists nothing and has no note',
      '"Sources for this page" does not link the register',
    ]);
  });

  it('lets the register itself go without a link to itself', () => {
    const own = noted.replace(/<p><a href="[^"]*sources\/">[^<]*<\/a><\/p>/, '');
    expect(trustProblems(page('sources', notice, own, 'lookup/sources'))).toEqual([]);
  });

  it('fails a kind it does not know, so a new kind is a decision, not a gap', () => {
    expect(trustProblems(page('recipe', notice, listed))).toEqual([
      'unknown document kind "recipe"',
    ]);
  });

  it('expects every manifest document in every enabled locale', () => {
    expect(expectedDocumentPages()).toBe(72);
  });
});
