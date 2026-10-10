/**
 * A build plugin that minifies the blocking `src/scripts/theme-init.js` in the output (WP-50a
 * review pass 3, m6). `Base.astro` imports it with `?url`, which copies the file as it is, comments
 * and all, to `_astro/theme-init.<hash>.js`; every page loads it, so it counted 1.68 KB gzip on
 * every page's budget, where the minified file is about 1.0 KB.
 *
 * Only the emitted copy changes. The file keeps its name and its hash (from the source), stays a
 * classic external script with `script-src 'self'`, and the readable source is still what
 * `tests/dom/theme-init.test.ts` runs. The minifier is Vite's own (Oxc, through Rolldown), the one
 * that already minifies every module: no dependency is added. Vite is Astro's dependency, not this
 * project's, so it is resolved from Astro.
 */
import { createRequire } from 'node:module';
import path from 'node:path';

/** The emitted copy of theme-init, by its output name. */
export const THEME_INIT_ASSET = /(^|\/)theme-init\.[\w-]+\.js$/;

interface Minifier {
  minify(
    filename: string,
    code: string,
    options: { compress: { target: string }; mangle: boolean },
  ): Promise<{ code: string; errors: readonly { message: string }[] }>;
}

let minifier: Minifier | undefined;

/**
 * Loaded with `require` (Node loads an ES module that way since 22.12): Astro runs this config in
 * Vite's module runner, which is closed by the time the bundle is written, so a dynamic `import()`
 * here failed the build.
 */
function loadMinifier(): Minifier {
  if (!minifier) {
    const fromProject = createRequire(path.join(process.cwd(), 'package.json'));
    const fromAstro = createRequire(fromProject.resolve('astro/package.json'));
    minifier = fromAstro('vite') as Minifier;
  }
  return minifier;
}

/** `source` minified as an ES2019 classic script. Throws on a syntax error. */
export async function minifyScript(source: string, filename = 'theme-init.js'): Promise<string> {
  const { minify } = loadMinifier();
  const out = await minify(filename, source, { compress: { target: 'es2019' }, mangle: true });
  if (out.errors.length > 0) {
    throw new Error(`${filename}: ${out.errors.map((error) => error.message).join('; ')}`);
  }
  return out.code;
}

/** The part of an output asset this plugin reads and replaces. */
interface Asset {
  readonly type: 'asset';
  readonly fileName: string;
  source: string | Uint8Array;
}

/** The part of a Vite plugin this one uses. */
interface GenerateBundlePlugin {
  readonly name: string;
  readonly apply: 'build';
  generateBundle(
    options: unknown,
    bundle: Record<string, Asset | { readonly type: 'chunk' }>,
  ): Promise<void>;
}

export function minifyThemeInit(): GenerateBundlePlugin {
  return {
    name: 'st-minify-theme-init',
    apply: 'build',
    async generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset' || !THEME_INIT_ASSET.test(file.fileName)) continue;
        const source =
          typeof file.source === 'string' ? file.source : new TextDecoder().decode(file.source);
        file.source = await minifyScript(source);
      }
    },
  };
}
