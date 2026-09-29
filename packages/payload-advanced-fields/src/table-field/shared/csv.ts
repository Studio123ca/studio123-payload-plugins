import type { ResolvedTableOptions, TableValue } from './types.js';
import { parseDelimited, stringifyDelimited } from './clipboard.js';
import { createTableID, validateTable } from './table.js';

/** CSV has no IDs or metadata. IDs are assigned for the current editing session. */
export function csvToTable(csv: string, options: ResolvedTableOptions): TableValue {
  const matrix = parseDelimited(csv, ',', options.maxRows + (options.headerRow ? 1 : 0), options.maxColumns);
  const headers = options.headerRow ? (matrix.shift() ?? []) : [];
  const width = Math.max(headers.length, ...matrix.map((row) => row.length), options.minColumns);
  const table: TableValue = {
    version: 1,
    caption: '',
    headerRow: options.headerRow,
    columns: Array.from({ length: width }, (_, index) => ({
      id: createTableID(),
      label: headers[index] ?? `Column ${index + 1}`,
    })),
    rows: matrix.map((row) => ({
      id: createTableID(),
      cells: Array.from({ length: width }, (_, index) => row[index] ?? ''),
    })),
  };
  const result = validateTable(table, options);
  if (result !== true) throw new Error(result);
  return table;
}

/** Lossless cell text, not a spreadsheet-safe export. Use safeCSVCell for downloaded exports. */
export function tableToCSV(table: TableValue): string {
  return stringifyDelimited(
    [
      ...(table.headerRow ? [table.columns.map((column) => column.label)] : []),
      ...table.rows.map((row) =>
        row.cells.map((cell) => (cell === null ? '' : typeof cell === 'object' ? cell.formula : String(cell))),
      ),
    ],
    ',',
  );
}

export function validateCSVTable(value: unknown, options: ResolvedTableOptions, required = false): true | string {
  if (value === null || value === undefined || value === '') return required ? 'Enter table content.' : true;
  if (typeof value !== 'string') return 'Expected a CSV string.';
  try {
    return validateTable(csvToTable(value, options), options, required);
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid CSV data.';
  }
}
