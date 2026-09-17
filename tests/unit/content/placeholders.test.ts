import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Link } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../../../scripts/content/parse';
import {
  applyPlaceholders,
  applySiglines,
  classifyPlaceholder,
  extractFencePlaceholders,
  isLiteralBracket,
  placeholderCase,
  scanBrackets,
} from '../../../scripts/content/placeholders';
import type { InlineRun } from '../../../src/lib/content/schema';
import { corpusDir, enMarkers, parseMd, realEntry } from './helpers';

const TEMPLATES = [
  { file: '01-quotation.md', id: 'paperwork/templates/quotation' },
  { file: '02-invoice-not-vat-registered.md', id: 'paperwork/templates/invoice' },
  { file: '03-tax-invoice-vat-registered.md', id: 'paperwork/templates/tax-invoice' },
  { file: '04-receipt.md', id: 'paperwork/templates/receipt' },
].map((template) => {
  const source = readFileSync(
    join(corpusDir, '03 Paperwork and templates', 'templates-to-fill-in', template.file),
    'utf8',
  ).replace(/\r\n?/g, '\n');
  const line = source.split('\n').find((candidate) => candidate.startsWith('[If a company:')) ?? '';
  return { ...template, source, line };
});

describe('nested [If a company: … [REGISTERED NAME] (Pty) Ltd …] lines', () => {
  it('occur exactly four times in the templates', () => {
    expect(
      TEMPLATES.filter((template) => template.line.includes('[REGISTERED NAME] (Pty) Ltd')),
    ).toHaveLength(4);
  });

  it.each(TEMPLATES)(
    'remark produces no link node and loses no text in $file',
    ({ source, line }) => {
      const tree = parseMarkdown(source);
      const links: Link[] = [];
      visit(tree, 'link', (node) => {
        links.push(node);
      });
      expect(links).toEqual([]);
      const paragraphs: string[] = [];
      visit(tree, 'paragraph', (node) => {
        paragraphs.push(toString(node));
      });
      expect(paragraphs.some((text) => text.split('\n').includes(line))).toBe(true);
    },
  );

  it.each(TEMPLATES)(
    'becomes one nested instruction placeholder in $file',
    ({ source, line, id }) => {
      const { parsed, issues } = parseMd(source, realEntry(id));
      expect(issues.issues).toEqual([]);
      const nested = parsed.blocks
        .flatMap((block) => (block.kind === 'paragraph' ? block.c : []))
        .filter((run) => run.t === 'placeholder' && run.nested);
      expect(nested).toEqual([
        { t: 'placeholder', v: line.slice(1, -1), style: 'instruction', nested: true },
      ]);
    },
  );
});

describe('scanBrackets', () => {
  it('is depth aware', () => {
    expect(scanBrackets('A [B] c [D [E] F] g')).toEqual([
      { type: 'text', v: 'A ' },
      { type: 'placeholder', v: 'B', nested: false },
      { type: 'text', v: ' c ' },
      { type: 'placeholder', v: 'D [E] F', nested: true },
      { type: 'text', v: ' g' },
    ]);
  });

  it.each([['[open'], ['close]'], ['[ ]'], ['[a\nb]']])('keeps %j as text', (input) => {
    expect(scanBrackets(input)).toEqual([{ type: 'text', v: input }]);
  });
});

describe('classifyPlaceholder', () => {
  const markers = enMarkers();
  it.each([
    ['YOUR BUSINESS NAME', 'identity', 'businessName'],
    ['Phone', 'identity', 'phone'],
    ['TRADING NAME, if different', 'identity', 'tradingName'],
    ['DD Month YYYY', 'format', undefined],
    ['X', 'format', undefined],
    ['NUMBER', 'field', undefined],
    ['PASTE THE THREE WORDS AND THE DO / DO NOT LISTS', 'field', undefined],
    ['EFT / PayShap / Cash / Card', 'choice', undefined],
    ['on completion / within X days of invoice', 'choice', undefined],
    ['Be specific', 'instruction', undefined],
    ['List it, or you will be asked to do it free', 'instruction', undefined],
    ['State your late payment terms here.', 'instruction', undefined],
    ['Customer name', 'field', undefined],
  ])('%s → %s', (value, style, key) => {
    expect(classifyPlaceholder(value, false, markers)).toEqual(key ? { style, key } : { style });
  });

  it('classifies every nested placeholder as an instruction', () => {
    expect(classifyPlaceholder('If a company: [REGISTERED NAME]', true, markers)).toEqual({
      style: 'instruction',
    });
  });

  it('knows the case style and the literal [SQUARE BRACKETS]', () => {
    expect(placeholderCase('JOU BESIGHEIDSNAAM')).toBe('upper');
    expect(placeholderCase('Jou naam')).toBe('mixed');
    expect(isLiteralBracket('square  brackets', markers)).toBe(true);
    expect(isLiteralBracket('Phone', markers)).toBe(false);
  });
});

describe('placeholder and sigline runs', () => {
  const markers = enMarkers();
  it('converts text, strong and emphasis but leaves code and literals alone', () => {
    const runs: InlineRun[] = [
      { t: 'strong', c: [{ t: 'text', v: '[YOUR BUSINESS NAME]' }] },
      { t: 'em', c: [{ t: 'text', v: 'replace [SQUARE BRACKETS]' }] },
      { t: 'code', v: '[not a placeholder]' },
      { t: 'text', v: 'Due [date].' },
    ];
    expect(applyPlaceholders(runs, markers)).toEqual([
      {
        t: 'strong',
        c: [{ t: 'placeholder', v: 'YOUR BUSINESS NAME', style: 'identity', key: 'businessName' }],
      },
      {
        t: 'em',
        c: [
          { t: 'text', v: 'replace ' },
          { t: 'text', v: '[SQUARE BRACKETS]' },
        ],
      },
      { t: 'code', v: '[not a placeholder]' },
      { t: 'text', v: 'Due ' },
      { t: 'placeholder', v: 'date', style: 'field' },
      { t: 'text', v: '.' },
    ]);
  });

  it('extracts fence placeholders in order and skips literals', () => {
    expect(
      extractFencePlaceholders(
        'I like option [NUMBER] best.\nUse [SQUARE BRACKETS] for [X].',
        markers,
      ),
    ).toEqual([
      { t: 'placeholder', v: 'NUMBER', style: 'field' },
      { t: 'placeholder', v: 'X', style: 'format' },
    ]);
  });

  it('turns 10 or more underscores into a sigline, including inside strong text', () => {
    expect(
      applySiglines([{ t: 'text', v: 'Accepted by: ______________ Date: _________' }]),
    ).toEqual([
      { t: 'text', v: 'Accepted by: ' },
      { t: 'sigline' },
      { t: 'text', v: ' Date: _________' },
    ]);
    expect(applySiglines([{ t: 'strong', c: [{ t: 'text', v: '__________' }] }])).toEqual([
      { t: 'strong', c: [{ t: 'sigline' }] },
    ]);
  });
});
