import type { DataTableOptions, DataTableValue, ResolvedDataTableOptions } from './types.js';

export const MAX_DATA_TABLE_CELL_LENGTH = 10_000;

export function resolveDataTableOptions(options: DataTableOptions = {}): ResolvedDataTableOptions {
  const resolved = {
    initialColumns: options.initialColumns ?? 3,
    initialRows: options.initialRows ?? 3,
    maxColumns: options.maxColumns ?? 20,
    maxRows: options.maxRows ?? 100,
  };
  for (const [name, value] of Object.entries(resolved)) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`);
  }
  if (resolved.initialColumns > resolved.maxColumns || resolved.initialRows > resolved.maxRows)
    throw new Error('Initial dimensions must not exceed the configured maximums.');
  if (resolved.maxColumns > 100 || resolved.maxRows > 1_000)
    throw new Error('Data tables support at most 100 columns and 1,000 rows.');
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

export function validateDataTable(value: unknown, options: ResolvedDataTableOptions, required = false): true | string {
  if (value === null || value === undefined) return required ? 'Create a data table.' : true;
  if (!value || typeof value !== 'object') return 'Data table values must be objects.';
  const table = value as Partial<DataTableValue>;
  if (table.version !== 1 || !Array.isArray(table.columns) || !Array.isArray(table.rows))
    return 'Invalid data table value.';
  if (table.columns.length < 1 || table.columns.length > options.maxColumns)
    return `Use between 1 and ${options.maxColumns} columns.`;
  if (table.rows.length < 1 || table.rows.length > options.maxRows) return `Use between 1 and ${options.maxRows} rows.`;
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
      row.cells.some((cell) => typeof cell !== 'string' || cell.length > MAX_DATA_TABLE_CELL_LENGTH)
    )
      return 'Every data table cell must be text.';
  }
  return true;
}
