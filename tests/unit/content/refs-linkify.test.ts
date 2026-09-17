import { describe, expect, it } from 'vitest';
import {
  linkifyText,
  normaliseExternalHref,
  trimTrailingPunctuation,
} from '../../../scripts/content/linkify';
import {
  createDocIndex,
  resolveInternalLink,
  resolveLegacyRef,
} from '../../../scripts/content/refs';
import { codes, parseMd, realConfig, realEntry } from './helpers';

describe('resolveInternalLink', () => {
  const index = createDocIndex(realConfig().docsMeta);
  const from = '01 Core - applies to everyone/02-register.md';

  it('decodes %20, resolves ../ and keeps the anchor', () => {
    expect(resolveInternalLink('../05%20Look%20it%20up/01-glossary.md#tax', from, index)).toEqual({
      doc: 'lookup/glossary',
      anchor: 'tax',
    });
    expect(resolveInternalLink('05-vehicles.md', from, index)).toEqual({ doc: 'core/vehicles' });
    expect(
      resolveInternalLink(
        'templates-to-fill-in/01-quotation.md',
        '03 Paperwork and templates/01-which-template-to-use-when.md',
        index,
      ),
    ).toEqual({
      doc: 'paperwork/templates/quotation',
    });
  });

  it.each([
    ['../../outside.md', 'points outside the toolkit'],
    ['99-missing.md', 'is not a document listed'],
    ['#only-an-anchor', 'has no document path'],
    ['%E0%A4%A.md', 'cannot decode'],
  ])('rejects %s', (url, message) => {
    const result = resolveInternalLink(url, from, index);
    expect('error' in result && result.error).toContain(message);
  });
});

describe('resolveLegacyRef', () => {
  const legacy = realConfig().legacyRefs;

  it.each([
    ['01-core/04', { t: 'docref', doc: 'core/what-you-need-to-sell-things', label: '01-core/04' }],
    [
      '02-branding-and-marketing/01a',
      { t: 'docref', doc: 'branding/mood-and-materials', label: '02-branding-and-marketing/01a' },
    ],
    [
      '03-documents/01',
      { t: 'docref', doc: 'paperwork/which-template-to-use-when', label: '03-documents/01' },
    ],
    [
      '04-business-types/02',
      { t: 'docref', doc: 'business-types/food', label: '04-business-types/02' },
    ],
    ['01-core/', { t: 'docref', section: 'core', label: '01-core/' }],
    ['04-business-types/', { t: 'docref', section: 'business-types', label: '04-business-types/' }],
    ['05-reference', { t: 'docref', section: 'lookup', label: '05-reference' }],
  ])('%s', (code, run) => {
    const result = resolveLegacyRef(code, legacy);
    expect(result.kind === 'docref' && result.run).toEqual(run);
  });

  it('continues a bare 03 after a folder ref', () => {
    const result = resolveLegacyRef('03', legacy, '04-business-types');
    expect(result).toEqual({
      kind: 'docref',
      run: { t: 'docref', doc: 'business-types/beauty', label: '03' },
      folder: '04-business-types',
    });
    expect(resolveLegacyRef('03', legacy).kind).toBe('none');
  });

  it.each(['06-unknown/01', '01-core/99', '02-branding-and-marketing/01b'])(
    'reports %s as unresolved',
    (code) => {
      expect(resolveLegacyRef(code, legacy).kind).toBe('error');
      expect(resolveLegacyRef('77', legacy, '01-core').kind).toBe('error');
    },
  );

  it.each(['yourname.co.za', '2026-09-13 Invoice Nkosi.pdf', '.md', '(cite index="57-1">'])(
    'leaves %s as code',
    (code) => {
      expect(resolveLegacyRef(code, legacy).kind).toBe('none');
    },
  );
});

describe('bare URLs and domains', () => {
  const ignore = new Set(['a.co.za']);

  it.each([
    [
      'Register at inforegulator.org.za.',
      'https://inforegulator.org.za/',
      'inforegulator.org.za',
      ' .',
    ],
    [
      'Go to webaim.org/resources/contrastchecker, paste it',
      'https://webaim.org/resources/contrastchecker',
      'webaim.org/resources/contrastchecker',
      ', paste it',
    ],
    ['(see fonts.google.com)', 'https://fonts.google.com/', 'fonts.google.com', ')'],
    ['Try Cars.co.za; then', 'https://cars.co.za/', 'Cars.co.za', '; then'],
  ])('linkifies %j', (text, href, label, after) => {
    const runs = linkifyText(text, ignore);
    const link = runs.find((run) => run.t === 'link');
    expect(link).toEqual({ t: 'link', href, external: true, c: [{ t: 'text', v: label }] });
    const last = runs.at(-1);
    expect(last?.t === 'text' && last.v.endsWith(after.trim())).toBe(true);
  });

  it('keeps ignored and non-domain text unlinked', () => {
    expect(linkifyText('as a.co.za domain, brand-guide.pdf and e.g. this', ignore)).toEqual([
      { t: 'text', v: 'as a.co.za domain, brand-guide.pdf and e.g. this' },
    ]);
  });

  it('trims punctuation but keeps balanced parentheses', () => {
    expect(trimTrailingPunctuation('example.org/a_(b)).')).toBe('example.org/a_(b)');
    expect(normaliseExternalHref('http://www.sars.gov.za', 'www.sars.gov.za')).toBe(
      'https://www.sars.gov.za',
    );
    expect(normaliseExternalHref('http://example.org', 'http://example.org')).toBe(
      'http://example.org',
    );
  });

  it('upgrades GFM www autolinks to https and drops trailing full stops', () => {
    const { parsed, issues } = parseMd(
      '# T\n\nFile at https://annualreturns.cipc.co.za. Check www.sars.gov.za, then miosa.co.za.\n',
      realEntry('core/running-a-pty-ltd'),
    );
    expect(codes(issues)).toEqual([]);
    const block = parsed.blocks[0];
    const hrefs =
      block?.kind === 'paragraph'
        ? block.c.flatMap((run) => (run.t === 'link' && 'href' in run ? [run.href] : []))
        : [];
    expect(hrefs).toEqual([
      'https://annualreturns.cipc.co.za',
      'https://www.sars.gov.za',
      'https://miosa.co.za/',
    ]);
    expect(parsed.externalLinks).toEqual(hrefs);
  });
});
