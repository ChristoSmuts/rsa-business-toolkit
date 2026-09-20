import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  auditDist,
  auditDocument,
  classifyUrl,
  collectIds,
  decodeEntities,
  documentUrlPath,
  extractTags,
  formatFindings,
  isInlineHandlerAttribute,
  listFiles,
  NOT_EVENT_HANDLER_ATTRIBUTES,
  normaliseBase,
  originOf,
  parseSrcset,
  refreshUrl,
  resolveDistRoot,
  resolveTargetFile,
  runCli,
  toPosixPath,
  urlCandidates,
  type AuditContext,
} from '../../scripts/dist/audit-links';
import { type FutureRoute } from '../e2e/helpers/exceptions';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'audit-links');
const base = '/bt/';
const siteOrigin = 'https://example.github.io';

function capture(): { out: string[]; err: string[]; write: Parameters<typeof runCli>[2] } {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, write: { out: (t) => out.push(t), err: (t) => err.push(t) } };
}

describe('normaliseBase', () => {
  it('matches astro.config.ts', () => {
    expect(normaliseBase(undefined)).toBe('/business-toolkit/');
    expect(normaliseBase('')).toBe('/');
    expect(normaliseBase('/')).toBe('/');
    expect(normaliseBase('bt')).toBe('/bt/');
    expect(normaliseBase(' //bt/sub// ')).toBe('/bt/sub/');
  });
});

describe('toPosixPath and documentUrlPath', () => {
  it('converts Windows separators', () => {
    expect(toPosixPath('core\\register\\index.html')).toBe('core/register/index.html');
    expect(toPosixPath('core/register/index.html')).toBe('core/register/index.html');
  });

  it('maps dist files to served URL paths, including Windows paths', () => {
    expect(documentUrlPath('index.html', base)).toBe('/bt/');
    expect(documentUrlPath('core\\register\\index.html', base)).toBe('/bt/core/register/');
    expect(documentUrlPath('af/core/index.html', base)).toBe('/bt/af/core/');
    expect(documentUrlPath('404.html', base)).toBe('/bt/404.html');
    expect(documentUrlPath('index.html', '/')).toBe('/');
  });
});

describe('originOf', () => {
  it('returns the origin or null', () => {
    expect(originOf('https://example.github.io/bt/')).toBe(siteOrigin);
    expect(originOf('not a url')).toBeNull();
    expect(originOf(undefined)).toBeNull();
    expect(originOf('mailto:x@example.com')).toBeNull();
  });
});

describe('decodeEntities', () => {
  it('decodes named and numeric references and leaves unknown ones', () => {
    expect(decodeEntities('/a/?x=1&amp;y=2')).toBe('/a/?x=1&y=2');
    expect(decodeEntities('&#47;bt&#x2F;&quot;&apos;&lt;&gt;')).toBe('/bt/"\'<>');
    expect(decodeEntities('a&nbsp;b&NBSP;c')).toBe(['a', 'b', 'c'].join(String.fromCharCode(0xa0)));
    expect(decodeEntities('&unknown; &#xZZ;')).toBe('&unknown; &#xZZ;');
  });
});

describe('extractTags', () => {
  it('reads quoted, unquoted, valueless and uppercase attributes', () => {
    const tags = extractTags(
      '<A HREF=/bt/one/ data-x="a > b" hidden title=\'t\'>x</A><img src="/bt/i.png"/>',
    );
    expect(tags.map((t) => t.name)).toEqual(['a', 'img']);
    expect(Object.fromEntries(tags[0]?.attrs ?? [])).toEqual({
      href: '/bt/one/',
      'data-x': 'a > b',
      hidden: '',
      title: 't',
    });
    expect(tags[1]?.attrs.get('src')).toBe('/bt/i.png');
  });

  it('skips comments, doctype, closing tags and raw text elements', () => {
    const html = [
      '<!doctype html>',
      '<!-- <a href="/c/"> -->',
      '<script>document.write("<a href=\'/s/\'>")</script>',
      '<style>a[href="/st/"]{}</style>',
      '<textarea><a href="/t/"></textarea>',
      '<a href="/real/">ok</a>',
    ].join('\n');
    const tags = extractTags(html);
    expect(tags.filter((t) => t.name === 'a').map((t) => t.attrs.get('href'))).toEqual(['/real/']);
    expect(tags.find((t) => t.name === 'a')?.line).toBe(6);
  });

  it('keeps the first duplicate attribute and survives truncated markup', () => {
    expect(extractTags('<a href="/1/" href="/2/">')[0]?.attrs.get('href')).toBe('/1/');
    expect(extractTags('<a href="/open')[0]?.attrs.get('href')).toBe('/open');
    expect(extractTags('a < b and <3 <')).toEqual([]);
    expect(extractTags('<script>never closed <a href="/x/">')).toHaveLength(1);
  });

  it('treats <!--> and <!---> as complete empty comments', () => {
    const tags = extractTags('<!--><a href="/one/"><!---><a href="/two/"><!-- <a href="/no/"> -->');
    expect(tags.map((t) => t.attrs.get('href'))).toEqual(['/one/', '/two/']);
  });

  it('handles CRLF line endings when counting lines', () => {
    const tags = extractTags('<p>\r\n<a href="/a/">\r\n<a href="/b/">');
    expect(tags.map((t) => t.line)).toEqual([1, 2, 3]);
  });
});

describe('collectIds', () => {
  it('collects id attributes and legacy <a name> anchors', () => {
    const ids = collectIds(extractTags('<h2 id="x"></h2><a name="y"></a><div name="z"></div>'));
    expect([...ids].sort()).toEqual(['x', 'y']);
  });
});

describe('parseSrcset', () => {
  it('returns candidate URLs without descriptors', () => {
    expect(parseSrcset('/a.png 1x, /b.png 2x')).toEqual(['/a.png', '/b.png']);
    expect(parseSrcset('/a.png,, /b.png 480w')).toEqual(['/a.png', '/b.png']);
    // Without whitespace a comma is part of the URL (HTML srcset parsing rules).
    expect(parseSrcset('/a.png,/b.png 480w')).toEqual(['/a.png,/b.png']);
    expect(parseSrcset('  /only.png  ')).toEqual(['/only.png']);
    expect(parseSrcset('data:image/png;base64,AAA= 1x, /b.png 2x')).toEqual([
      'data:image/png;base64,AAA=',
      '/b.png',
    ]);
    expect(parseSrcset('')).toEqual([]);
  });
});

describe('classifyUrl', () => {
  const options = { siteOrigin, documentPath: '/bt/core/' };

  it('skips empty values and non-web schemes', () => {
    for (const value of ['', '   ', 'mailto:a@b.co', 'tel:+27', 'data:,x', 'blob:abc']) {
      expect(classifyUrl(value, options)).toEqual({ kind: 'skip' });
    }
  });

  it('recognises javascript: URLs in any case', () => {
    expect(classifyUrl('javascript:void(0)', options)).toEqual({ kind: 'javascript' });
    expect(classifyUrl(' JavaScript:alert(1)', options)).toEqual({ kind: 'javascript' });
  });

  it('recognises same-page fragments', () => {
    expect(classifyUrl('#register', options)).toEqual({ kind: 'fragment', fragment: 'register' });
  });

  it('separates external URLs from internal ones on the site origin', () => {
    expect(classifyUrl('https://www.sars.gov.za/', options)).toEqual({
      kind: 'external',
      protocol: 'https:',
    });
    expect(classifyUrl('http://www.cipc.co.za/', options)).toEqual({
      kind: 'external',
      protocol: 'http:',
    });
    expect(classifyUrl('//cdn.example.com/x.js', options)).toEqual({
      kind: 'external',
      protocol: 'https:',
    });
    expect(classifyUrl('https://example.github.io/bt/core/#a', options)).toEqual({
      kind: 'internal',
      pathname: '/bt/core/',
      fragment: 'a',
      pathRelative: false,
    });
  });

  it('marks path-relative URLs, but not root-relative or query-only ones', () => {
    expect(classifyUrl('register/', options)).toMatchObject({
      kind: 'internal',
      pathname: '/bt/core/register/',
      pathRelative: true,
    });
    expect(classifyUrl('/core/', options)).toMatchObject({
      pathname: '/core/',
      pathRelative: false,
    });
    expect(classifyUrl('?q=vat#top', options)).toMatchObject({
      pathname: '/bt/core/',
      fragment: 'top',
      pathRelative: false,
    });
  });

  it('treats absolute URLs as external when no site origin is known', () => {
    expect(
      classifyUrl('https://example.github.io/bt/', { siteOrigin: null, documentPath: '/bt/' }),
    ).toEqual({ kind: 'external', protocol: 'https:' });
  });
});

describe('resolveTargetFile', () => {
  const files = new Set(
    [
      'index.html',
      'core\\index.html',
      'core\\register\\index.html',
      '_astro\\a b.css',
      'robots.txt',
      'plain.html',
    ].map(toPosixPath),
  );

  it('maps directory URLs to index.html', () => {
    expect(resolveTargetFile('/bt/', base, files)).toBe('index.html');
    expect(resolveTargetFile('/bt/core/register/', base, files)).toBe('core/register/index.html');
  });

  it('resolves files, extensionless pages and percent-encoded names', () => {
    expect(resolveTargetFile('/bt/robots.txt', base, files)).toBe('robots.txt');
    expect(resolveTargetFile('/bt/core', base, files)).toBe('core/index.html');
    expect(resolveTargetFile('/bt/plain', base, files)).toBe('plain.html');
    expect(resolveTargetFile('/bt/_astro/a%20b.css', base, files)).toBe('_astro/a b.css');
  });

  it('returns null for missing targets, paths outside the base and malformed encoding', () => {
    expect(resolveTargetFile('/bt/missing/', base, files)).toBeNull();
    expect(resolveTargetFile('/core/', base, files)).toBeNull();
    expect(resolveTargetFile('/bt/%E0%A4%A/', base, files)).toBeNull();
    expect(resolveTargetFile('/bt/_astro/', base, files)).toBeNull();
  });

  it('does not treat an encoded slash or backslash as a separator', () => {
    expect(resolveTargetFile('/bt/core%2Findex.html', base, files)).toBeNull();
    expect(resolveTargetFile('/bt/core%2findex.html', base, files)).toBeNull();
    expect(resolveTargetFile('/bt/core%5Cindex.html', base, files)).toBeNull();
  });
});

describe('refreshUrl and urlCandidates', () => {
  it('reads the URL of a meta refresh', () => {
    expect(refreshUrl('0;url=/bt/x/')).toBe('/bt/x/');
    expect(refreshUrl("5; URL='/bt/y/'")).toBe('/bt/y/');
    expect(refreshUrl('0, /bt/z/')).toBe('/bt/z/');
    expect(refreshUrl('30')).toBeNull();
    expect(refreshUrl('0;url=')).toBeNull();
  });

  it('lists URL attributes, formaction, meta refresh and og/twitter URL meta', () => {
    const html = [
      '<img src="/bt/a.png" srcset="/bt/a.png 1x, /bt/b.png 2x">',
      '<button formaction="/bt/send/">',
      '<meta http-equiv="Refresh" content="0; url=/bt/new/">',
      '<meta property="og:image" content="https://example.github.io/bt/og.png">',
      '<meta property="OG:URL" content="https://example.github.io/bt/">',
      '<meta name="twitter:image" content="/bt/tw.png">',
      '<meta property="og:title" content="/not/a/url/">',
      '<meta name="description" content="/also/not/">',
    ].join('\n');
    expect(extractTags(html).flatMap((tag) => urlCandidates(tag))).toEqual([
      ['src', '/bt/a.png'],
      ['srcset', '/bt/a.png'],
      ['srcset', '/bt/b.png'],
      ['formaction', '/bt/send/'],
      ['content', '/bt/new/'],
      ['content', 'https://example.github.io/bt/og.png'],
      ['content', 'https://example.github.io/bt/'],
      ['content', '/bt/tw.png'],
    ]);
  });
});

describe('adversarial markup (review WP-22a pass 1)', () => {
  const lines = [
    '<!doctype html><html lang="en"><head><title>t</title></head><body>',
    '<a title="a>b" href="/x/">quote-gt root-relative: EXPECT base-path</a>',
    '<a href=/bt/core/#sec>unquoted ok: EXPECT none</a>',
    '<a href=/bt/core/#nope>unquoted bad frag: EXPECT missing-fragment</a>',
    '<img alt="" srcset="/bt/a.png 1x, /nope.png 2x" src="/bt/a.png">',
    '<base href="/other/"><a href="core/">path-relative after base: EXPECT base-path</a>',
    '<template><a href="/tmpl/">in template</a></template>',
    '<!-- <a href="/comment/"> --> EXPECT none',
    '<script>var s = \'<a href="/script/">\';</script> EXPECT none',
    '<a href="/bt/core/?a=1&amp;b=2#sec">entity query: EXPECT none</a>',
    '<A HREF="HTTP://insecure.example/" TARGET="_BLANK" REL="NOOPENER">EXPECT insecure-http only</A>',
    '<a href="//cdn.example.com/x">protocol-relative: EXPECT none (external)</a>',
    '<a href="mailto:a@b.c">m</a><a href="tel:+27">t</a><img alt="" src="data:image/gif;base64,R0lGOD">',
    '<a href="#top">top ok</a><a href="#sec2">EXPECT missing-fragment</a>',
    '<a href="/bt/core%2Findex.html">encoded slash: server would 404</a>',
    '<a href="/bt/sp%20ace/">encoded space: EXPECT none</a>',
    '<!--><a href="/hidden-by-empty-comment/">EXPECT base-path</a><!-- later -->',
    '<a href="javascript:alert(1)">js url</a>',
    '<meta http-equiv="refresh" content="0;url=/elsewhere/">',
    '<a href="/bt/core/" target="_blank" rel="noreferrer">noreferrer implies noopener</a>',
    '<a href="http://example.github.io/bt/">http on site host: EXPECT insecure-http</a>',
    '<a href="https://example.github.io/core/">site origin off-base: EXPECT base-path</a>',
    '<noscript><a href="/bt/nojs-missing/">EXPECT missing-target</a></noscript>',
    '<a href="\\\\evil.example/">backslash protocol-relative: EXPECT flagged</a>',
    '<a href="/bt/core/#%73ec">encoded fragment ok: EXPECT none</a>',
    '<form><button formaction="/nope/">formaction</button></form>',
    '<link rel="stylesheet" href="/bt/_astro/missing.css">EXPECT missing-target',
    '<svg><use href="/bt/sprite.svg#icon"></use></svg>EXPECT missing-target',
    '<a href="/bt/_astro/">dir without index: EXPECT missing-target</a>',
    '<a href="/bt/core/index.html#sec">EXPECT none</a>',
    '<a href="HTTPS://EXAMPLE.GITHUB.IO/bt/core/#nope">upper-case site origin: EXPECT missing-fragment</a>',
    '<a href="/BT/core/">case of base: EXPECT base-path</a>',
    '<textarea><a href="/ta/"></textarea><title>x</title>',
    '<a data-x=\'"\' href="/q/">single-quoted dq: EXPECT base-path</a>',
    '<a href="https://example.github.io/bt/sp ace/">raw space: EXPECT none</a>',
    '<area href="/bt/core/" target="_blank">EXPECT noopener</area>',
    '<a href="/bt/core/#sec" target=" _blank ">EXPECT noopener</a>',
    '</body></html>',
  ];

  it('reports exactly the expected findings', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'audit-adv-'));
    try {
      const put = (rel: string, body: string): void => {
        const file = path.join(root, ...rel.split('/'));
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, body);
      };
      put('index.html', lines.join('\n'));
      put('core/index.html', '<h2 id="sec">s</h2>');
      put('sp ace/index.html', '<h1>x</h1>');
      put('a.png', '');
      put('_astro/x.js', '');

      const result = auditDist(root, { base, siteOrigin });
      expect(
        result.findings.map((f) => `${f.line} [${f.rule}] <${f.tag} ${f.attr}="${f.value}">`),
      ).toEqual([
        '2 [base-path] <a href="/x/">',
        '4 [missing-fragment] <a href="/bt/core/#nope">',
        '5 [base-path] <img srcset="/nope.png">',
        '6 [base-element] <base href="/other/">',
        '6 [base-path] <base href="/other/">',
        '6 [base-path] <a href="core/">',
        '7 [base-path] <a href="/tmpl/">',
        '11 [insecure-http] <a href="HTTP://insecure.example/">',
        // The <base href="/other/"> on line 6 sends every later #fragment link to /other/.
        '14 [base-fragment] <a href="#sec2">',
        '14 [base-fragment] <a href="#top">',
        '15 [missing-target] <a href="/bt/core%2Findex.html">',
        '17 [base-path] <a href="/hidden-by-empty-comment/">',
        '18 [javascript-url] <a href="javascript:alert(1)">',
        '19 [base-path] <meta content="/elsewhere/">',
        '20 [noopener] <a rel="noreferrer">',
        '21 [insecure-http] <a href="http://example.github.io/bt/">',
        '22 [base-path] <a href="https://example.github.io/core/">',
        '23 [missing-target] <a href="/bt/nojs-missing/">',
        '24 [base-path] <a href="\\\\evil.example/">',
        '26 [base-path] <button formaction="/nope/">',
        '27 [missing-target] <link href="/bt/_astro/missing.css">',
        '28 [missing-target] <use href="/bt/sprite.svg#icon">',
        '29 [missing-target] <a href="/bt/_astro/">',
        '31 [missing-fragment] <a href="HTTPS://EXAMPLE.GITHUB.IO/bt/core/#nope">',
        '32 [base-path] <a href="/BT/core/">',
        '34 [base-path] <a href="/q/">',
        '36 [noopener] <area rel="">',
        '37 [noopener] <a rel="">',
      ]);
      expect(formatFindings(result.findings)).toContain(
        '28 problem(s) (base-path: 12, missing-fragment: 2, base-element: 1, insecure-http: 2, base-fragment: 2, missing-target: 5, javascript-url: 1, noopener: 3)',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('review WP-22a pass 2: base, third-party, forms, refresh, entities', () => {
  const run = (html: string, extra: Partial<AuditContext> = {}): string[] => {
    const tags = extractTags(html);
    const context: AuditContext = {
      base,
      siteOrigin,
      files: new Set(['index.html', 'p/index.html', 'core/index.html', 'a.png']),
      idsFor: (file) => (file === 'p/index.html' ? collectIds(tags) : new Set(['details'])),
      ...extra,
    };
    return auditDocument('p/index.html', tags, context).findings.map(
      (f) => `${f.line} [${f.rule}] <${f.tag} ${f.attr}="${f.value}">`,
    );
  };

  it('reports any <base>, and #fragment links that it sends to another page', () => {
    const html = [
      '<base href="/bt/core/">',
      '<a href="#details">toc</a><h2 id="details">d</h2>',
      '<a href="/bt/p/#details">absolute ok</a>',
    ].join('\n');
    expect(run(html)).toEqual([
      '1 [base-element] <base href="/bt/core/">',
      '2 [base-fragment] <a href="#details">',
    ]);
    expect(run(html, { baseElementAllowed: () => true })).toEqual([
      '2 [base-fragment] <a href="#details">',
    ]);
    expect(run('<base target="_self"><a href="#details">x</a><i id="details"></i>')).toEqual([
      '1 [base-element] <base href="">',
    ]);
  });

  it('reports third-party resources and resource hints, but not navigational links', () => {
    const html = [
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
      '<link rel="dns-prefetch" href="//cdn.example.com">',
      '<link rel="PRELOAD" as="font" href="https://cdn.example.com/f.woff2">',
      '<link rel="modulepreload" href="https://cdn.example.com/m.js">',
      '<link rel="prefetch" href="https://cdn.example.com/p.html">',
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2">',
      '<link rel="icon" href="https://cdn.example.com/i.png">',
      '<link rel="canonical" href="https://other.example/p/"><link rel="alternate" hreflang="af" href="https://other.example/af/">',
      '<img alt="" src="https://cdn.example.com/a.png" srcset="/bt/a.png 1x, https://cdn.example.com/b.png 2x">',
      '<link rel="preload" as="image" imagesrcset="https://cdn.example.com/c.png 1x">',
      '<a href="https://www.sars.gov.za/" ping="https://tracker.example/p">SARS</a>',
      '<object data="https://cdn.example.com/x.svg"></object><svg><use href="https://cdn.example.com/s.svg#i"></use></svg>',
      '<blockquote cite="https://www.sars.gov.za/quote"></blockquote>',
    ].join('\n');
    expect(run(html)).toEqual([
      '1 [third-party-resource] <link href="https://fonts.gstatic.com">',
      '2 [third-party-resource] <link href="//cdn.example.com">',
      '3 [third-party-resource] <link href="https://cdn.example.com/f.woff2">',
      '4 [third-party-resource] <link href="https://cdn.example.com/m.js">',
      '5 [third-party-resource] <link href="https://cdn.example.com/p.html">',
      '6 [third-party-resource] <link href="https://fonts.googleapis.com/css2">',
      '7 [third-party-resource] <link href="https://cdn.example.com/i.png">',
      '9 [third-party-resource] <img src="https://cdn.example.com/a.png">',
      '9 [third-party-resource] <img srcset="https://cdn.example.com/b.png">',
      '10 [third-party-resource] <link imagesrcset="https://cdn.example.com/c.png">',
      '11 [third-party-resource] <a ping="https://tracker.example/p">',
      '12 [third-party-resource] <object data="https://cdn.example.com/x.svg">',
      '12 [third-party-resource] <use href="https://cdn.example.com/s.svg#i">',
    ]);
  });

  it('reports forms and meta refresh to another origin, at any delay', () => {
    const html = [
      '<form action="https://evil.example/collect" method="post"><button>Send</button></form>',
      '<form action="/bt/core/"><button formaction="https://evil.example/x">Send</button></form>',
      '<meta http-equiv="refresh" content="0; url=https://evil.example/">',
      '<meta http-equiv="refresh" content="4; url=https://evil.example/">',
      '<meta http-equiv="refresh" content="4; url=/elsewhere/">',
      '<meta http-equiv="refresh" content="4; url=https://example.github.io/bt/core/">',
    ].join('\n');
    expect(run(html)).toEqual([
      '1 [external-form] <form action="https://evil.example/collect">',
      '2 [external-form] <button formaction="https://evil.example/x">',
      '3 [external-refresh] <meta content="https://evil.example/">',
      '4 [external-refresh] <meta content="https://evil.example/">',
      '5 [base-path] <meta content="/elsewhere/">',
    ]);
  });

  it('reports inline event handlers and leaves other on-ish attribute names alone', () => {
    const html = [
      '<button onclick="send()">Send</button>',
      '<body ONLOAD="boot()">',
      '<img src="/bt/a.png" onerror="fallback()" alt="">',
      '<st-toc once="1" only="x" online="y"><a href="/bt/core/">ok</a></st-toc>',
      '<input onbeforeinput="x()" oninvalid="y()">',
    ].join('\n');
    expect(run(html)).toEqual([
      '1 [inline-handler] <button onclick="send()">',
      '2 [inline-handler] <body onload="boot()">',
      '3 [inline-handler] <img onerror="fallback()">',
      '5 [inline-handler] <input onbeforeinput="x()">',
      '5 [inline-handler] <input oninvalid="y()">',
    ]);
  });

  /**
   * Review WP-22a pass 4 (m2): the rule was a hand-written alternation of handler names, so it
   * failed open. It missed six real ones, including the two print handlers — and this site has a
   * print-sheet flow (build plan C6). The rule is `^on[a-z]+$` minus a short allowlist now, so a
   * handler the platform adds later is reported without anyone editing a list.
   */
  it('reports the handlers the hand-written list missed, including the print ones', () => {
    const missed = [
      'onafterprint',
      'onbeforeprint',
      'onlanguagechange',
      'ongotpointercapture',
      'onlostpointercapture',
      'ondragexit',
      'onsomethingthespecaddslater',
    ];
    expect(run(`<body ${missed.map((name) => `${name}="x()"`).join(' ')}>`)).toEqual(
      missed.map((name) => `1 [inline-handler] <body ${name}="x()">`),
    );
    expect(isInlineHandlerAttribute('onbeforeprint')).toBe(true);
    expect(isInlineHandlerAttribute('onclick')).toBe(true);
    for (const name of [...NOT_EVENT_HANDLER_ATTRIBUTES, 'on', 'data-online', 'open', 'on-click']) {
      expect(isInlineHandlerAttribute(name), name).toBe(false);
    }
  });

  it('decodes punctuation entities and strips tab and newline before the scheme', () => {
    expect(decodeEntities('&sol;wrong&sol; &colon;&Tab;&NewLine;&num;')).toBe('/wrong/ :\t\n#');
    expect(
      run(
        '<a href="&sol;wrong/">x</a>\n<a href="java\tscript:alert(1)">y</a>\n<a href="java&Tab;script:void(0)">z</a>',
      ),
    ).toEqual([
      '1 [base-path] <a href="/wrong/">',
      '2 [javascript-url] <a href="java\tscript:alert(1)">',
      '3 [javascript-url] <a href="java\tscript:void(0)">',
    ]);
  });
});

describe('auditDocument', () => {
  const context = (ids: Record<string, string[]>): AuditContext => ({
    base,
    siteOrigin,
    files: new Set(['index.html', 'core/index.html', 'guide.pdf']),
    idsFor: (file) => new Set(ids[file] ?? []),
  });

  it('accepts fragments that need no id and non-HTML targets with fragments', () => {
    const tags = extractTags(
      '<a href="#"></a><a href="#top"></a><a href="/bt/guide.pdf#page=2"></a>',
    );
    expect(auditDocument('index.html', tags, context({})).findings).toEqual([]);
  });

  it('reports every rule once per offending URL', () => {
    const html = [
      '<a href="/core/">root-relative</a>',
      '<a href="/bt/nope/">missing</a>',
      '<a href="/bt/core/#x">bad fragment</a>',
      '<a href="#y">bad same-page fragment</a>',
      '<a href="https://ok.example/" target="_BLANK" rel="noreferrer">opener</a>',
      '<a href="http://insecure.example/">http</a>',
    ].join('\n');
    const { urls, findings } = auditDocument(
      'core\\index.html'.replace(/\\/g, '/'),
      extractTags(html),
      context({}),
    );
    expect(urls).toBe(6);
    expect(findings.map((f) => [f.line, f.rule])).toEqual([
      [1, 'base-path'],
      [2, 'missing-target'],
      [3, 'missing-fragment'],
      [4, 'missing-fragment'],
      [5, 'noopener'],
      [6, 'insecure-http'],
    ]);
  });
});

describe('resolveDistRoot and listFiles', () => {
  it('uses dist/ when the site is at its root', () => {
    expect(resolveDistRoot(path.join(fixtures, 'good'), base)).toBe(path.join(fixtures, 'good'));
  });

  it('falls back to dist/<base>/ when Astro nests the output', () => {
    expect(resolveDistRoot(path.join(fixtures, 'nested'), base)).toBe(
      path.join(fixtures, 'nested', 'bt'),
    );
  });

  it('throws a pnpm build hint when dist/ is missing', () => {
    expect(() => resolveDistRoot(path.join(fixtures, 'does-not-exist'), base)).toThrow(
      /pnpm build/,
    );
  });

  it('lists files with forward slashes in a stable order', () => {
    expect(listFiles(path.join(fixtures, 'good'))).toEqual([
      '_astro/logo.svg',
      '_astro/page.js',
      '_astro/site.css',
      'core/index.html',
      'index.html',
      'search/index.html',
    ]);
  });
});

describe('auditDist', () => {
  it('finds no problems in a correct site', () => {
    const result = auditDist(path.join(fixtures, 'good'), { base, siteOrigin });
    expect(result.findings).toEqual([]);
    expect(result.htmlFiles).toBe(3);
    expect(result.urls).toBeGreaterThan(10);
  });

  it('reports each broken link in the broken site', () => {
    const result = auditDist(path.join(fixtures, 'bad'), { base, siteOrigin });
    expect(
      result.findings.map((f) => `${f.file}:${f.line} ${f.rule} ${f.attr}=${f.value}`),
    ).toEqual([
      'index.html:6 base-path href=/_astro/site.css',
      'index.html:11 base-path href=core/',
      'index.html:12 missing-target href=/bt/missing/',
      'index.html:13 missing-fragment href=/bt/core/#nope',
      'index.html:14 missing-fragment href=#also-nope',
      'index.html:15 noopener rel=',
      'index.html:16 insecure-http href=http://www.cipc.co.za/',
      'index.html:17 missing-target src=/bt/logo.png',
      'index.html:17 base-path srcset=/elsewhere.png',
      'index.html:18 missing-target action=/bt/nowhere/',
    ]);
    const report = formatFindings(result.findings);
    expect(report).toContain('dist/index.html:12  [missing-target] <a href="/bt/missing/">');
    expect(report).toContain(
      '10 problem(s) (base-path: 3, missing-target: 3, missing-fragment: 2, noopener: 1, insecure-http: 1)',
    );
  });
});

describe('runCli', () => {
  it('exits 0 and prints a summary for a correct site', () => {
    const io = capture();
    const code = runCli(
      { BASE_PATH: 'bt', DIST_DIR: 'good', SITE_URL: siteOrigin },
      fixtures,
      io.write,
      [],
    );
    expect(code).toBe(0);
    expect(io.out.join('\n')).toMatch(
      /3 HTML file\(s\), \d+ URL\(s\) checked under base \/bt\/\. No problems\./,
    );
    expect(io.err).toEqual([]);
  });

  it('exits 1 with the findings for a broken site', () => {
    const io = capture();
    const code = runCli({ BASE_PATH: '/bt/', DIST_DIR: 'bad' }, fixtures, io.write, []);
    expect(code).toBe(1);
    expect(io.err.join('\n')).toContain('bad/index.html:11  [base-path] <a href="core/">');
  });

  it('exits 1 when dist/ is missing or holds no HTML', () => {
    const missing = capture();
    expect(runCli({ BASE_PATH: '/bt/', DIST_DIR: 'nope' }, fixtures, missing.write, [])).toBe(1);
    expect(missing.err.join('\n')).toMatch(/Run `pnpm build` first/);

    const empty = capture();
    expect(runCli({ BASE_PATH: '/bt/', DIST_DIR: 'good/_astro' }, fixtures, empty.write, [])).toBe(
      1,
    );
    expect(empty.err.join('\n')).toMatch(/no HTML files/);
  });

  /**
   * The design system links to routes that the page packages have not built yet (the D5 AI notice
   * and "Sources for this page" demos). `KNOWN_FUTURE_ROUTES` lets exactly those through, and the
   * entry has to disappear by failing: once `dist` serves the route, or once nothing links to it.
   */
  it('allows a listed future route, names it in the summary, and fails a stale entry', () => {
    const entry = (route: string, extra: Partial<FutureRoute> = {}): FutureRoute => ({
      route,
      reason: 'The design system demo links to it and the page package has not landed.',
      expires: 'Remove when the page package builds the route.',
      ...extra,
    });

    const allowed = capture();
    expect(
      runCli({ BASE_PATH: '/bt/', DIST_DIR: 'bad' }, fixtures, allowed.write, [entry('missing/')]),
    ).toBe(1);
    expect(allowed.err.join('\n')).not.toContain('missing-target] <a href="/bt/missing/">');
    expect(allowed.err.join('\n')).not.toContain('KNOWN_FUTURE_ROUTES');

    // Built now: the audit says so instead of quietly doing nothing.
    const built = capture();
    expect(
      runCli({ BASE_PATH: 'bt', DIST_DIR: 'good', SITE_URL: siteOrigin }, fixtures, built.write, [
        entry('core/'),
      ]),
    ).toBe(1);
    expect(built.err.join('\n')).toContain(
      'route "core/" is built now (dist serves /bt/core/), so it is no longer a future route',
    );

    // Nothing links to it any more: also a failure, so the list cannot rot.
    const unused = capture();
    expect(
      runCli({ BASE_PATH: 'bt', DIST_DIR: 'good', SITE_URL: siteOrigin }, fixtures, unused.write, [
        entry('never-linked/'),
      ]),
    ).toBe(1);
    expect(unused.err.join('\n')).toContain(
      'nothing in dist links to "never-linked/" any more, so the allowance is unused',
    );

    // A malformed entry fails the audit too, not only `pnpm test`.
    const invalid = capture();
    expect(
      runCli({ BASE_PATH: '/bt/', DIST_DIR: 'bad' }, fixtures, invalid.write, [
        entry('/missing/', { expires: '' }),
      ]),
    ).toBe(1);
    expect(invalid.err.join('\n')).toContain('route must be site-relative without a leading slash');
  });

  it('names the allowed routes in the green summary and warns about an overdue one', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'audit-future-'));
    try {
      writeFileSync(
        path.join(root, 'index.html'),
        '<!doctype html><html lang="en"><head><title>t</title></head><body>' +
          '<a href="/bt/later/">not built yet</a></body></html>',
      );
      const io = capture();
      expect(
        runCli({ BASE_PATH: '/bt/', DIST_DIR: '.', CI: '1' }, root, io.write, [
          {
            route: 'later/',
            reason: 'The only page links to it and the package has not landed.',
            expires: 'Remove when the page package builds it.',
            expiresOn: '2020-01-01',
          },
        ]),
      ).toBe(0);
      expect(io.err).toEqual([]);
      expect(io.out.join('\n')).toContain(
        'No problems. 1 route(s) not built yet, allowed to be missing by KNOWN_FUTURE_ROUTES (tests/e2e/helpers/exceptions.ts): later/.',
      );
      expect(io.out.join('\n')).toContain(
        '::warning title=Overdue known-future route::known-future route "later/" was due on 2020-01-01',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
