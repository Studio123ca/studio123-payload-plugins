import { resolveTablePresentation, validateAppearance } from './presentation.js';
import type { ResolvedTableOptions, TableCell, TableOptions, TableSelection, TableValue } from './types.js';

export const MAX_CELL_LENGTH = 10000;
export const MAX_FORMULA_LENGTH = 1024;
export const MAX_IMPORT_LENGTH = 2_000_000;

export function resolveTableOptions(options: TableOptions = {}): ResolvedTableOptions {
  const mode = options.mode ?? 'content';
  if (mode !== 'content' && mode !== 'spreadsheet') throw new Error('Unknown table mode.');
  const resolved: ResolvedTableOptions = {
    ...resolveTablePresentation(options),
    mode,
    storage: options.storage ?? 'json',
    minRows: options.minRows ?? 0,
    maxRows: options.maxRows ?? (mode === 'spreadsheet' ? 500 : 100),
    minColumns: options.minColumns ?? 1,
    maxColumns: options.maxColumns ?? (mode === 'spreadsheet' ? 30 : 20),
    initialRows: options.initialRows ?? Math.max(options.minRows ?? 0, Math.min(2, options.maxRows ?? 100)),
    initialColumns: options.initialColumns ?? Math.max(options.minColumns ?? 1, Math.min(2, options.maxColumns ?? 20)),
    headerRow: options.headerRow ?? true,
    caption: options.caption ?? options.storage !== 'csv',
    formulas: options.formulas ?? false,
  };
  for (const key of ['minRows', 'maxRows', 'initialRows', 'minColumns', 'maxColumns', 'initialColumns'] as const) {
    if (!Number.isSafeInteger(resolved[key]) || resolved[key] < 0)
      throw new Error(`${key} must be a nonnegative integer.`);
  }
  if (
    resolved.maxRows < 1 ||
    resolved.maxRows > 1000 ||
    resolved.maxColumns > 100 ||
    resolved.minColumns < 1 ||
    resolved.maxColumns < resolved.minColumns ||
    resolved.maxRows < resolved.minRows
  ) {
    throw new Error('Table limits must allow 1–1000 rows and 1–100 columns, with minimums no greater than maximums.');
  }
  if (
    resolved.initialRows < resolved.minRows ||
    resolved.initialRows > resolved.maxRows ||
    resolved.initialColumns < resolved.minColumns ||
    resolved.initialColumns > resolved.maxColumns
  ) {
    throw new Error('Initial table dimensions must be within the configured limits.');
  }
  if (resolved.formulas && mode !== 'spreadsheet') throw new Error('Formulas require spreadsheet mode.');
  if (!['json', 'csv'].includes(resolved.storage)) throw new Error('Unknown table storage.');
  if (resolved.storage === 'csv' && (mode !== 'content' || resolved.caption || resolved.formulas))
    throw new Error('CSV storage supports content tables without captions or formulas.');
  return resolved;
}

export const createTableID = (): string => globalThis.crypto.randomUUID();
export function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

export function createTable(options: ResolvedTableOptions): TableValue {
  return {
    version: 1,
    caption: '',
    headerRow: options.headerRow,
    columns: Array.from({ length: options.initialColumns }, (_, index) => ({
      id: createTableID(),
      label: `Column ${index + 1}`,
    })),
    rows: Array.from({ length: options.initialRows }, () => ({
      id: createTableID(),
      cells: Array.from({ length: options.initialColumns }, () => ''),
    })),
  };
}

export function cellInput(cell: TableCell): string {
  if (cell === null) return '';
  return typeof cell === 'object' ? cell.formula : String(cell);
}

export function parseCell(input: string, options: ResolvedTableOptions): TableCell {
  if (input.length > MAX_CELL_LENGTH) throw new Error(`Cells may contain at most ${MAX_CELL_LENGTH} characters.`);
  if (options.mode === 'content') return input;
  // A leading apostrophe escapes literal strings, including strings beginning with '='.
  if (input.startsWith("'")) return input.slice(1);
  if (options.formulas && input.startsWith('=')) {
    if (input.length > MAX_FORMULA_LENGTH)
      throw new Error(`Formulas may contain at most ${MAX_FORMULA_LENGTH} characters.`);
    return { formula: input };
  }
  if (input === 'true' || input === 'false') return input === 'true';
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(input) && Number.isFinite(Number(input)))
    return Number(input);
  return input;
}

export function editableCellInput(cell: TableCell, options: ResolvedTableOptions): string {
  if (
    options.mode === 'spreadsheet' &&
    typeof cell === 'string' &&
    (cell.startsWith("'") || typeof parseCell(cell, options) !== 'string')
  )
    return `'${cell}`;
  return cellInput(cell);
}

const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));
export function validateTable(value: unknown, options: ResolvedTableOptions, required = false): true | string {
  if (value === null || value === undefined) return required ? 'Enter table content.' : true;
  if (
    !record(value) ||
    value.version !== 1 ||
    typeof value.caption !== 'string' ||
    value.caption.length > MAX_CELL_LENGTH ||
    typeof value.headerRow !== 'boolean' ||
    !Array.isArray(value.columns) ||
    !Array.isArray(value.rows)
  )
    return 'Invalid table data (expected version 1).';
  if (value.columns.length < options.minColumns || value.columns.length > options.maxColumns)
    return `Use between ${options.minColumns} and ${options.maxColumns} columns.`;
  if (value.rows.length < options.minRows || value.rows.length > options.maxRows)
    return `Use between ${options.minRows} and ${options.maxRows} rows.`;
  const ids = new Set<string>();
  const checkID = (id: unknown) => {
    if (
      typeof id !== 'string' ||
      !id ||
      id.length > 100 ||
      ['__proto__', 'constructor', 'prototype'].includes(id) ||
      ids.has(id)
    )
      return false;
    ids.add(id);
    return true;
  };
  for (const column of value.columns) {
    if (
      !record(column) ||
      !checkID(column.id) ||
      typeof column.label !== 'string' ||
      column.label.length > MAX_CELL_LENGTH ||
      (column.width !== undefined &&
        (typeof column.width !== 'number' ||
          !Number.isFinite(column.width) ||
          column.width < 100 ||
          column.width > 600))
    )
      return 'Invalid column metadata or duplicate ID.';
  }
  const appearance = validateAppearance(
    value.appearance,
    value.rows.map((row) => String(row?.id)),
    value.columns.map((column) => String(column.id)),
  );
  if (appearance !== true) return appearance;
  let hasContent = false;
  for (const [rowIndex, row] of value.rows.entries()) {
    if (!record(row) || !checkID(row.id) || !Array.isArray(row.cells) || row.cells.length !== value.columns.length)
      return `Row ${rowIndex + 1} must have a unique ID and one cell per column.`;
    for (const [columnIndex, cell] of row.cells.entries()) {
      const scalar =
        cell === null ||
        typeof cell === 'boolean' ||
        (typeof cell === 'number' && Number.isFinite(cell)) ||
        (typeof cell === 'string' && cell.length <= MAX_CELL_LENGTH);
      const formula =
        options.formulas &&
        record(cell) &&
        Object.keys(cell).length === 1 &&
        typeof cell.formula === 'string' &&
        cell.formula.startsWith('=') &&
        cell.formula.length <= MAX_FORMULA_LENGTH;
      if ((options.mode === 'content' && typeof cell !== 'string') || (!scalar && !formula))
        return `Invalid cell at ${columnName(columnIndex)}${rowIndex + 1}.`;
      if (cell !== null && (typeof cell !== 'string' || cell.trim() !== '')) hasContent = true;
    }
  }
  return required && !hasContent ? 'Enter at least one nonempty table cell.' : true;
}

export function selectionBounds(selection: TableSelection) {
  return {
    top: Math.min(selection.startRow, selection.endRow),
    bottom: Math.max(selection.startRow, selection.endRow),
    left: Math.min(selection.startColumn, selection.endColumn),
    right: Math.max(selection.startColumn, selection.endColumn),
  };
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return items;
  const result = [...items];
  result.splice(to, 0, result.splice(from, 1)[0]);
  return result;
}

export function moveColumn(table: TableValue, from: number, to: number): TableValue {
  return {
    ...table,
    columns: moveItem(table.columns, from, to),
    rows: table.rows.map((row) => ({ ...row, cells: moveItem(row.cells, from, to) })),
  };
}

/** Atomic: dimension/type failures leave the original value untouched. */
export function pasteCells(
  table: TableValue,
  matrix: string[][],
  startRow: number,
  startColumn: number,
  options: ResolvedTableOptions,
): TableValue {
  if (!Number.isSafeInteger(startRow) || !Number.isSafeInteger(startColumn) || startRow < 0 || startColumn < 0)
    throw new Error('Invalid paste destination.');
  const width = Math.max(0, ...matrix.map((row) => row.length));
  if (!matrix.length || !width) return table;
  const rowCount = Math.max(table.rows.length, startRow + matrix.length);
  const columnCount = Math.max(table.columns.length, startColumn + width);
  if (rowCount > options.maxRows || columnCount > options.maxColumns)
    throw new Error(`Paste exceeds the ${options.maxRows} row / ${options.maxColumns} column limit.`);
  const columns = Array.from(
    { length: columnCount },
    (_, index) => table.columns[index] ?? { id: createTableID(), label: `Column ${index + 1}` },
  );
  const rows: TableValue['rows'] = Array.from({ length: rowCount }, (_, index) => ({
    id: table.rows[index]?.id ?? createTableID(),
    cells: Array.from({ length: columnCount }, (_, column) => table.rows[index]?.cells[column] ?? ''),
  }));
  matrix.forEach((row, y) =>
    row.forEach((cell, x) => {
      rows[startRow + y].cells[startColumn + x] = parseCell(cell, options);
    }),
  );
  return { ...table, columns, rows };
}
