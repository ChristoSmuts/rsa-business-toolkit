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
    {
      // TEMPORARY, WP-50 Phase 1 only: the two direction mocks' palettes. This file and this
      // exemption are deleted when the owner picks a direction (docs/work-packages/WP-50-directions.md).
      files: ['src/styles/directions.css'],
      rules: { 'color-no-hex': null },
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
  ignoreFiles: ['.claude/**', 'dist/**', 'node_modules/**', 'coverage/**', 'playwright-report/**'],
};
