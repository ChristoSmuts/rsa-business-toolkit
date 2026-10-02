import { describe, expect, it } from 'vitest';
import {
  expectedDocumentPages,
  langProblems,
  noticeSentences,
  textNodesWithLang,
  trustProblems,
} from '../../scripts/dist/check-trust';

const notice =
  '<aside class="st-callout st-ai-notice"><p>About this page</p>' +
  '<p>Written by AI (Claude, Anthropic). An AI checked it against the sources below on 13 September 2026. No person has checked it yet. Rules change: check the official source before you act. Not legal, tax or financial advice.</p>' +
  '<p class="st-ai-notice__status"><span>AI-checked</span></p>' +
  '<p><a href="/business-toolkit/start/how-this-was-made/">How this was made</a></p></aside>';
/** The same notice with the sentence for a page that has no sources of its own. */
const noteNotice = notice.replace(
  /<p>Written by AI[^<]*<\/p>/,
  '<p>Written by AI (Claude, Anthropic). An AI checked it on 13 September 2026 against the sources in the sources register, where official sources are marked. No person has checked it yet. Rules change: check the official source before you act. Not legal, tax or financial advice.</p>',
);
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
    expect(trustProblems(page('guide', noteNotice, noted))).toEqual([]);
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
      'the AI notice does not say who wrote and checked the page',
      'the AI notice does not link "How this was made"',
    ]);
  });

  it('fails a page without "Sources for this page"', () => {
    expect(trustProblems(page('checklist', noteNotice, '<p>Body</p>'))).toEqual([
      'no "Sources for this page" section',
    ]);
  });

  it('does not count an empty source entry as a listed source', () => {
    const hollow = listed.replace('<li class="st-source">SARS</li>', '<li class="st-source"></li>');
    expect(trustProblems(page('guide', notice, hollow))).toContain(
      'the AI notice says "the sources below" but the page lists none',
    );
  });

  it('fails a sources section that renders empty, as when the register does not resolve', () => {
    const empty =
      '<section class="st-sources" aria-labelledby="sources-for-this-page"><h2 id="sources-for-this-page">S</h2>' +
      '<p class="st-hint">None.</p></section>';
    expect(trustProblems(page('guide', notice, empty))).toEqual([
      'the AI notice says "the sources below" but the page lists none',
      '"Sources for this page" lists nothing and has no note',
      '"Sources for this page" does not link the register',
    ]);
  });

  it('lets the register itself go without a link to itself', () => {
    const own = noted.replace(/<p><a href="[^"]*sources\/">[^<]*<\/a><\/p>/, '');
    expect(trustProblems(page('sources', noteNotice, own, 'lookup/sources'))).toEqual([]);
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

describe('the AI notice sentence', () => {
  it('must match what the page shows: "the sources below" only over a list', () => {
    expect(trustProblems(page('guide', notice, noted))).toEqual([
      'the AI notice says "the sources below" but the page lists none',
    ]);
    expect(trustProblems(page('guide', noteNotice, listed))).toEqual([
      'the AI notice points at the register although the page lists its own sources',
    ]);
  });

  it('credits a person only when the status names one', () => {
    const human = notice.replace(
      /<p>Written by AI[^<]*<\/p>/,
      '<p>Written by AI (Claude, Anthropic). Jane Doe checked it against the sources below on 13 September 2026. Rules change: check the official source before you act. Not legal, tax or financial advice.</p>',
    );
    expect(trustProblems(page('guide', human, listed))).toEqual([
      'the AI notice and its status disagree on who checked the page',
    ]);
    const withStatus = human.replace('<span>AI-checked</span>', '<span>Checked by Jane Doe</span>');
    expect(trustProblems(page('guide', withStatus, listed))).toEqual([]);
    // The inverse: a status that names a person over the AI sentence ("No person has checked it").
    const claimsPerson = notice.replace(
      '<span>AI-checked</span>',
      '<span>Checked by Jane Doe</span>',
    );
    expect(trustProblems(page('guide', claimsPerson, listed))).toEqual([
      'the AI notice and its status disagree on who checked the page',
    ]);
  });

  it("requires one of the page language's notice sentences, with any date", () => {
    const silent = notice.replace(/<p>Written by AI[^<]*<\/p>/, '<p>Some other words.</p>');
    expect(trustProblems(page('guide', silent, listed))).toEqual([
      'the AI notice does not say who wrote and checked the page',
    ]);
    const later = notice.replace('13 September 2026', '1 January 2027');
    expect(trustProblems(page('guide', later, listed))).toEqual([]);
  });

  it('reads the Afrikaans sentences on an Afrikaans page', () => {
    expect(noticeSentences('af').length).toBe(noticeSentences('en').length);
    const english = `<html lang="af-ZA">${page('guide', notice, listed)}</html>`;
    expect(trustProblems(english)).toEqual([
      'the AI notice does not say who wrote and checked the page',
    ]);
  });
});

describe('language of parts on an Afrikaans page', () => {
  const en =
    '<html lang="en-ZA"><body><h1>Register: what you actually need</h1><p>Home</p><p>R2.3 million</p><p>SA Business Toolkit</p></body></html>';

  it('reads each text node with the lang it inherits, skipping scripts and styles', () => {
    expect(
      textNodesWithLang(
        '<html lang="af-ZA"><head><title>T</title></head><body><p>Tuis <span lang="en-ZA">Tax and SARS</span></p><script>x</script><br><p>Klaar</p></body></html>',
      ),
    ).toEqual([
      { text: 'Tuis', lang: 'af-ZA' },
      { text: 'Tax and SARS', lang: 'en-ZA' },
      { text: 'Klaar', lang: 'af-ZA' },
    ]);
  });

  it('passes English text marked English, Afrikaans text, names and amounts', () => {
    const af =
      '<html lang="af-ZA"><body><h1 lang="en-ZA">Register: what you actually need</h1><p>Tuis</p><p>R2.3 million</p><p>SA Business Toolkit</p></body></html>';
    expect(langProblems(af, en)).toEqual([]);
  });

  it('fails Afrikaans text that inherits English, as inside an English fallback block', () => {
    const af =
      '<html lang="af-ZA"><body><div lang="en-ZA"><p>Merkies word nie gestoor nie.</p></div></body></html>';
    expect(langProblems(af, en)).toEqual([
      'Afrikaans text marked as English: "Merkies word nie gestoor nie."',
    ]);
  });

  it('skips what Afrikaans keeps byte-identical: code, URLs, all-caps codes', () => {
    const enText =
      '<html lang="en-ZA"><body><p><code>VAT201</code></p><p>www.bizportal.gov.za</p><p>SARS</p><p>EMP201</p></body></html>';
    const afText =
      '<html lang="af-ZA"><body><p><code>VAT201</code></p><p>www.bizportal.gov.za</p><p>SARS</p><p>EMP201</p></body></html>';
    expect(langProblems(afText, enText)).toEqual([]);
  });

  it('checks upper-case words: only single-token codes are neutral', () => {
    const enText = '<html lang="en-ZA"><body><h1>TAX INVOICE</h1><p>CIPC</p></body></html>';
    const afText = '<html lang="af-ZA"><body><h1>TAX INVOICE</h1><p>CIPC</p></body></html>';
    expect(langProblems(afText, enText)).toEqual([
      'English text marked as Afrikaans: "TAX INVOICE"',
    ]);
  });

  it('treats a short run of codes as a name, the same in both languages', () => {
    const enName = '<html lang="en-ZA"><body><p>CC0 1.0</p><p>SARS EMP201</p></body></html>';
    const afName = '<html lang="af-ZA"><body><p>CC0 1.0</p><p>SARS EMP201</p></body></html>';
    expect(langProblems(afName, enName)).toEqual([]);
  });

  it('fails English text that inherits Afrikaans', () => {
    const af = '<html lang="af-ZA"><body><h1>Register: what you actually need</h1></body></html>';
    expect(langProblems(af, en)).toEqual([
      'English text marked as Afrikaans: "Register: what you actually need"',
    ]);
  });
});
