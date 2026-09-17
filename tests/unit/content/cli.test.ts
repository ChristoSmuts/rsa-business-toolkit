import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCliArgs } from '../../../scripts/content/cli';

describe('content CLI arguments', () => {
  const cwd = resolve('work');

  it('reads the language, a document, source roots and an output directory', () => {
    expect(
      parseCliArgs(
        [
          '--fidelity-only',
          '--lang',
          'af',
          '--doc',
          'core/register',
          '--source-root',
          'af=scratch/af-mirror',
          '--out',
          'out',
        ],
        cwd,
      ),
    ).toEqual({
      lang: 'af',
      doc: 'core/register',
      check: false,
      drift: false,
      report: false,
      fidelityOnly: true,
      allowPartial: false,
      allowStale: false,
      sourceRoots: { af: resolve(cwd, 'scratch/af-mirror') },
      outDir: resolve(cwd, 'out'),
    });
  });

  it('accepts --lang on a build and keeps an absolute source root', () => {
    const root = resolve('elsewhere');
    const options = parseCliArgs(['--lang', 'af', '--report', '--source-root', `af=${root}`], cwd);
    expect(options.lang).toBe('af');
    expect(options.report).toBe(true);
    expect(options.sourceRoots).toEqual({ af: root });
    expect(options.outDir).toBeUndefined();
  });

  it.each([
    [['--lang', 'en'], '--lang must be a translated language'],
    [['--lang', 'xx'], '--lang: unknown language "xx"'],
    [['--doc', 'core/register'], '--doc is only valid with pnpm content:fidelity'],
    [['--drift', '--out', 'x'], '--out cannot be combined with --drift'],
    [['--source-root', 'af'], '--source-root expects <lang>=<directory>'],
    [['--source-root', '=dir'], '--source-root expects <lang>=<directory>'],
    [['--source-root', 'af='], '--source-root expects <lang>=<directory>'],
    [['--source-root', 'qq=dir'], '--source-root: unknown language "qq"'],
    [['--source-root', 'af=a', '--source-root', 'af=b'], '--source-root is given twice for af'],
    [['--nope'], "Unknown option '--nope'"],
  ])('rejects %j', (args, message) => {
    expect(() => parseCliArgs(args, cwd)).toThrow(message);
  });
});
