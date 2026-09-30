import type { DataTableOptions, DataTableValue, ResolvedDataTableOptions } from './types.js';

export const MAX_DATA_TABLE_CELL_LENGTH = 10_000;
export const MAX_DATA_TABLE_FORMULA_LENGTH = 1_024;

export const defaultDataTablePalette = [
  { key: 'muted', label: 'Muted', background: 'var(--color-bg-secondary, #f2f2f2)' },
  { key: 'highlight', label: 'Highlight', background: 'var(--color-bg-warning-tertiary, #fff3c4)' },
  { key: 'success', label: 'Success', background: 'var(--color-bg-success-tertiary, #d9f0df)' },
  { key: 'danger', label: 'Danger', background: 'var(--color-bg-danger-tertiary, #fce0df)' },
] as const;

export function resolveDataTableOptions(options: DataTableOptions = {}): ResolvedDataTableOptions {
  const formulaOptions = typeof options.formulas === 'object' ? options.formulas : undefined;
  const resolved = {
    initialColumns: options.initialColumns ?? 3,
    initialRows: options.initialRows ?? 3,
    minColumns: options.minColumns ?? 1,
    minRows: options.minRows ?? 1,
    maxColumns: options.maxColumns ?? 20,
    maxRows: options.maxRows ?? 100,
    formulas: formulaOptions?.enabled ?? (typeof options.formulas === 'boolean' ? options.formulas : false),
    computeFormulas: formulaOptions?.compute ?? true,
    palette: options.palette ?? [...defaultDataTablePalette],
    stickyRows: {
      enabled: options.stickyRows?.enabled ?? true,
      top: options.stickyRows?.top ?? 0,
      bottom: options.stickyRows?.bottom ?? 0,
    },
  };
  for (const [name, value] of [
    ['initialColumns', resolved.initialColumns],
    ['initialRows', resolved.initialRows],
    ['minColumns', resolved.minColumns],
    ['minRows', resolved.minRows],
    ['maxColumns', resolved.maxColumns],
    ['maxRows', resolved.maxRows],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`);
  }
  if (
    resolved.minColumns > resolved.initialColumns ||
    resolved.minRows > resolved.initialRows ||
    resolved.initialColumns > resolved.maxColumns ||
    resolved.initialRows > resolved.maxRows
  )
    throw new Error('Initial dimensions must not exceed the configured maximums.');
  if (resolved.minColumns > resolved.maxColumns || resolved.minRows > resolved.maxRows)
    throw new Error('Minimum dimensions must not exceed the configured maximums.');
  if (resolved.maxColumns > 100 || resolved.maxRows > 1_000)
    throw new Error('Data tables support at most 100 columns and 1,000 rows.');
  if (!Array.isArray(resolved.palette) || resolved.palette.length > 32)
    throw new Error('Data table palettes may contain at most 32 colors.');
  const paletteKeys = new Set<string>();
  const validColor = (value: unknown): boolean =>
    (typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[;{}<>]|url\(/i.test(value)) ||
    (Boolean(value) &&
      typeof value === 'object' &&
      typeof (value as { light?: unknown }).light === 'string' &&
      typeof (value as { dark?: unknown }).dark === 'string' &&
      validColor((value as { light: string }).light) &&
      validColor((value as { dark: string }).dark));
  for (const entry of resolved.palette) {
    if (
      !entry ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(entry.key) ||
      ['__proto__', 'constructor', 'prototype'].includes(entry.key) ||
      paletteKeys.has(entry.key) ||
      typeof entry.label !== 'string' ||
      !entry.label ||
      entry.label.length > 100 ||
      !validColor(entry.background) ||
      ('text' in entry && entry.text !== undefined && !validColor(entry.text))
    )
      throw new Error('Invalid data table palette entry.');
    paletteKeys.add(entry.key);
  }
  if (
    ![resolved.stickyRows.top, resolved.stickyRows.bottom].every(
      (count) => Number.isSafeInteger(count) && count >= 0 && count <= 1_000,
    )
  )
    throw new Error('Sticky row counts must be integers between 0 and 1,000.');
  return resolved;
}

export function createDataTable(options: ResolvedDataTableOptions): DataTableValue {
  return {
    version: 1,
    columns: Array.from({ length: options.initialColumns }, (_, index) => ({
      id: crypto.randomUUID(),
      label: `Column ${index + 1}`,
    })),
    rows: Array.from({ length: options.initialRows }, () => ({
      id: crypto.randomUUID(),
      cells: Array.from({ length: options.initialColumns }, () => ''),
    })),
  };
}

function validateAppearance(
  value: unknown,
  rowIDs: string[],
  columnIDs: string[],
  paletteKeys: Set<string>,
): true | string {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Invalid data table appearance.';
  const appearance = value as { rows?: unknown; cells?: unknown; stickyRows?: unknown };
  const validRows = (rows: unknown) =>
    Boolean(rows && typeof rows === 'object' && !Array.isArray(rows)) &&
    Object.entries(rows as Record<string, unknown>).every(
      ([rowID, key]) => rowIDs.includes(rowID) && paletteKeys.has(String(key)),
    );
  if (appearance.rows !== undefined && !validRows(appearance.rows)) return 'Invalid data table row appearance.';
  if (appearance.cells !== undefined) {
    if (!appearance.cells || typeof appearance.cells !== 'object' || Array.isArray(appearance.cells))
      return 'Invalid data table cell appearance.';
    for (const [rowID, cells] of Object.entries(appearance.cells as Record<string, unknown>)) {
      if (!rowIDs.includes(rowID) || !cells || typeof cells !== 'object' || Array.isArray(cells))
        return 'Invalid data table cell appearance.';
      if (
        Object.entries(cells as Record<string, unknown>).some(
          ([columnID, key]) => !columnIDs.includes(columnID) || !paletteKeys.has(String(key)),
        )
      )
        return 'Invalid data table cell appearance.';
    }
  }
  if (appearance.stickyRows !== undefined) {
    const sticky = appearance.stickyRows as { top?: unknown; bottom?: unknown };
    if (
      !sticky ||
      typeof sticky !== 'object' ||
      !Number.isSafeInteger(sticky.top) ||
      !Number.isSafeInteger(sticky.bottom) ||
      Number(sticky.top) < 0 ||
      Number(sticky.bottom) < 0 ||
      Number(sticky.top) + Number(sticky.bottom) > rowIDs.length
    )
      return 'Invalid data table sticky row settings.';
  }
  return true;
}

export function validateDataTable(value: unknown, options: ResolvedDataTableOptions, required = false): true | string {
  if (value === null || value === undefined) return required ? 'Create a data table.' : true;
  if (!value || typeof value !== 'object') return 'Data table values must be objects.';
  const table = value as Partial<DataTableValue>;
  if (table.version !== 1 || !Array.isArray(table.columns) || !Array.isArray(table.rows))
    return 'Invalid data table value.';
  if (table.columns.length < options.minColumns || table.columns.length > options.maxColumns)
    return `Use between ${options.minColumns} and ${options.maxColumns} columns.`;
  if (table.rows.length < options.minRows || table.rows.length > options.maxRows)
    return `Use between ${options.minRows} and ${options.maxRows} rows.`;
  const appearance = validateAppearance(
    table.appearance,
    table.rows.map((row) => String(row?.id)),
    table.columns.map((column) => String(column.id)),
    new Set(options.palette.map((entry) => entry.key)),
  );
  if (appearance !== true) return appearance;
  const ids = new Set<string>();
  const uniqueID = (id: unknown) => {
    if (typeof id !== 'string' || id.length === 0 || id.length > 100 || ids.has(id)) return false;
    ids.add(id);
    return true;
  };
  for (const column of table.columns) {
    if (!column || typeof column !== 'object' || !uniqueID(column.id) || typeof column.label !== 'string')
      return 'Columns must have unique IDs and text labels.';
    if (
      column.label.length > MAX_DATA_TABLE_CELL_LENGTH ||
      (column.width !== undefined && (!Number.isFinite(column.width) || column.width < 120 || column.width > 600))
    )
      return 'Invalid column metadata.';
  }
  for (const row of table.rows) {
    if (!row || typeof row !== 'object' || !uniqueID(row.id) || !Array.isArray(row.cells))
      return 'Rows must have unique IDs and cells.';
    if (
      row.cells.length !== table.columns.length ||
      row.cells.some((cell) => {
        if (typeof cell === 'string') return cell.length > MAX_DATA_TABLE_CELL_LENGTH;
        if (!cell || typeof cell !== 'object') return true;
        return (
          !options.formulas ||
          typeof cell.formula !== 'string' ||
          !cell.formula.startsWith('=') ||
          cell.formula.length > MAX_DATA_TABLE_FORMULA_LENGTH
        );
      })
    )
      return 'Every data table cell must be text.';
  }
  return true;
}

export function normalizeDataTableValue(value: unknown): DataTableValue | null {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== 'object') return null;
  const table = value as Partial<DataTableValue> & {
    columns?: Array<Record<string, unknown>>;
    rows?: Array<Record<string, unknown>>;
  };
  if (!Array.isArray(table.columns) || !Array.isArray(table.rows)) return null;
  const columns = table.columns as unknown as Array<Record<string, unknown>>;
  const rows = table.rows as unknown as Array<Record<string, unknown>>;
  const isCompact =
    table.version === 1 &&
    columns.every((column) => !('columnId' in column)) &&
    rows.every(
      (row) =>
        !('rowId' in row) &&
        Array.isArray(row.cells) &&
        row.cells.every(
          (cell) =>
            typeof cell === 'string' ||
            (cell && typeof cell === 'object' && !('cellId' in (cell as Record<string, unknown>)) && 'formula' in cell),
        ),
    );
  if (isCompact) return value as DataTableValue;
  return {
    version: 1,
    ...(typeof table.headerRow === 'boolean' ? { headerRow: table.headerRow } : {}),
    ...(typeof table.caption === 'string' ? { caption: table.caption } : {}),
    ...(table.appearance && typeof table.appearance === 'object' ? { appearance: table.appearance } : {}),
    columns: columns.map((column) => ({
      id: String(column.id ?? column.columnId ?? ''),
      label: String(column.label ?? ''),
      ...(typeof column.width === 'number' ? { width: column.width } : {}),
    })),
    rows: rows.map((row) => ({
      id: String(row.id ?? row.rowId ?? ''),
      cells: Array.isArray(row.cells)
        ? row.cells.map((cell) => {
            if (cell && typeof cell === 'object') {
              const entry = cell as Record<string, unknown>;
              if (typeof entry.formula === 'string') return { formula: entry.formula };
              if ('value' in entry) return String(entry.value ?? '');
            }
            return typeof cell === 'string' ? cell : String(cell ?? '');
          })
        : [],
    })),
  };
}
