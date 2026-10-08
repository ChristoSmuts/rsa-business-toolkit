/**
 * Element ids for a template page. Field names (`intro.4:r0`, `lines.2.unitPrice`) are not valid
 * in a CSS selector or a URL fragment as they are, so every id is built here, by the page and by
 * the script alike.
 */
export const fieldId = (name: string): string => `st-tf-${name.replace(/[^a-zA-Z0-9-]/g, '-')}`;

/** The control names of line `index` (0-based). */
export const lineNames = (index: number) =>
  ({
    description: `lines.${index}.description`,
    quantity: `lines.${index}.quantity`,
    unitPrice: `lines.${index}.unitPrice`,
  }) as const;
