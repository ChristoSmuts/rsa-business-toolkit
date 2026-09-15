/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  overrides: [
    { files: ['**/*.astro'], customSyntax: 'postcss-html' },
    {
      // The design tokens file is the only place allowed to hold literal colours.
      files: ['src/styles/tokens.css'],
      rules: { 'color-no-hex': null, 'function-disallowed-list': null, 'color-named': null },
    },
  ],
  rules: {
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'oklch',
      'oklab',
      'lab',
      'lch',
      'hwb',
    ],
    'custom-property-pattern': [
      '^st-[a-z0-9-]+$',
      { message: 'Custom properties use the --st- prefix.' },
    ],
    'selector-class-pattern': null,
    'no-descending-specificity': null,
  },
  ignoreFiles: ['dist/**', 'node_modules/**', 'coverage/**', 'playwright-report/**'],
};
