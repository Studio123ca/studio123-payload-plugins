import { parseDelimited, stringifyDelimited } from './clipboard.js';
import { createDataTableID } from './operations.js';
import type { DataTableValue, ResolvedDataTableOptions } from './types.js';

/** Imports a CSV with its first row as column labels. */
export function csvToDataTable(csv: string, options: ResolvedDataTableOptions): DataTableValue {
  const matrix = parseDelimited(csv, ',', options.rows.max + 1, options.columns.max);
  const headers = matrix.shift() ?? [];
  const width = Math.max(options.columns.min, headers.length, ...matrix.map((row) => row.length));
  const rowCount = Math.max(options.rows.min, matrix.length);
  const columns = Array.from({ length: width }, (_, index) => ({
    id: createDataTableID(),
    label: headers[index] ?? `Column ${index + 1}`,
  }));
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => ({
    id: createDataTableID(),
    cells: Array.from({ length: width }, (_, columnIndex) => {
      const cell = matrix[rowIndex]?.[columnIndex] ?? '';
      return options.formulas.enabled && cell.startsWith('=') ? { formula: cell } : cell;
    }),
  }));
  const table = { version: 1 as const, columns, rows };
  return table;
}

/** Exports column labels followed by all cell values. */
export function dataTableToCSV(table: DataTableValue): string {
  return stringifyDelimited(
    [
      table.columns.map((column) => column.label),
      ...table.rows.map((row) =>
        row.cells.map((cell) => (typeof cell === 'object' ? cell.formula : String(cell ?? ''))),
      ),
    ],
    ',',
  );
}
