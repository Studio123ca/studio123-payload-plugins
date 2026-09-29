import type {
  TablePaletteEntry,
  TableAppearance,
  TablePresentationConfig,
  ResolvedTablePresentation,
  TableValue,
} from './types.js';

export const defaultTablePalette: TablePaletteEntry[] = [
  { key: 'muted', label: 'Muted', background: 'var(--color-bg-secondary, #f2f2f2)' },
  { key: 'highlight', label: 'Highlight', background: 'var(--color-bg-warning-tertiary, #fff3c4)' },
  { key: 'success', label: 'Success', background: 'var(--color-bg-success-tertiary, #d9f0df)' },
  { key: 'danger', label: 'Danger', background: 'var(--color-bg-danger-tertiary, #fce0df)' },
];
const safeKey = (key: unknown): key is string =>
  typeof key === 'string' &&
  /^[a-zA-Z0-9_-]{1,100}$/.test(key) &&
  !['__proto__', 'constructor', 'prototype'].includes(key);
const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));
export function resolveTablePresentation(
  field: TablePresentationConfig = {},
  global: TablePresentationConfig = {},
): ResolvedTablePresentation {
  const palette = field.palette ?? global.palette ?? defaultTablePalette;
  if (!Array.isArray(palette) || palette.length > 32) throw new Error('Table palettes may contain at most 32 colors.');
  const keys = new Set<string>();
  const color = (value: unknown): boolean =>
    typeof value === 'string'
      ? value.length > 0 && value.length <= 200 && !/[;{}<>]|url\(/i.test(value)
      : record(value) &&
        typeof value.light === 'string' &&
        typeof value.dark === 'string' &&
        color(value.light) &&
        color(value.dark);
  for (const item of palette) {
    if (
      !safeKey(item.key) ||
      keys.has(item.key) ||
      typeof item.label !== 'string' ||
      !item.label ||
      item.label.length > 100 ||
      !color(item.background) ||
      (item.text !== undefined && !color(item.text))
    )
      throw new Error('Invalid table palette entry or duplicate key.');
    keys.add(item.key);
  }
  const stickyRows = {
    enabled: field.stickyRows?.enabled ?? global.stickyRows?.enabled ?? true,
    top: field.stickyRows?.top ?? global.stickyRows?.top ?? 0,
    bottom: field.stickyRows?.bottom ?? global.stickyRows?.bottom ?? 0,
  };
  if (
    typeof stickyRows.enabled !== 'boolean' ||
    ![stickyRows.top, stickyRows.bottom].every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 1000)
  )
    throw new Error('Sticky row counts must be integers between 0 and 1000.');
  return { palette: palette.map((item) => ({ ...item })), stickyRows };
}

export function validateAppearance(value: unknown, rows: string[], columns: string[]): true | string {
  if (value === undefined) return true;
  if (!record(value) || Object.keys(value).some((key) => !['rows', 'cells', 'stickyRows'].includes(key)))
    return 'Invalid table appearance metadata.';
  if (value.stickyRows !== undefined) {
    const sticky = value.stickyRows;
    if (
      !record(sticky) ||
      Object.keys(sticky).some((key) => !['top', 'bottom'].includes(key)) ||
      ![sticky.top, sticky.bottom].every((n) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= 1000)
    )
      return 'Invalid sticky row counts.';
  }
  if (
    value.rows !== undefined &&
    (!record(value.rows) || Object.entries(value.rows).some(([id, key]) => !rows.includes(id) || !safeKey(key)))
  )
    return 'Invalid row background metadata.';
  if (
    value.cells !== undefined &&
    (!record(value.cells) ||
      Object.entries(value.cells).some(
        ([id, cells]) =>
          !rows.includes(id) ||
          !record(cells) ||
          Object.entries(cells).some(([column, key]) => !columns.includes(column) || !safeKey(key)),
      ))
  )
    return 'Invalid cell background metadata.';
  return true;
}

/** Remove deleted row/column references without changing stable-ID styling after a reorder. */
export function cleanAppearance(
  appearance: TableAppearance | undefined,
  table: TableValue,
): TableAppearance | undefined {
  if (!appearance) return undefined;
  const rows = new Set(table.rows.map((row) => row.id));
  const columns = new Set(table.columns.map((column) => column.id));
  return {
    ...appearance,
    rows: Object.fromEntries(Object.entries(appearance.rows ?? {}).filter(([id]) => rows.has(id))),
    cells: Object.fromEntries(
      Object.entries(appearance.cells ?? {})
        .filter(([id]) => rows.has(id))
        .map(([id, cells]) => [
          id,
          Object.fromEntries(Object.entries(cells).filter(([column]) => columns.has(column))),
        ]),
    ),
  };
}
