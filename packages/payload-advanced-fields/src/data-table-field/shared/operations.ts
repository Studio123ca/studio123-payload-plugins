import type { DataTableCell, DataTableValue, ResolvedDataTableOptions } from './types.js';

export type TableSelection = { startRow: number; endRow: number; startColumn: number; endColumn: number };

export type SelectionBounds = { top: number; bottom: number; left: number; right: number };

export const createDataTableID = () => globalThis.crypto.randomUUID();

export function selectionBounds(selection: TableSelection): SelectionBounds {
  return {
    top: Math.min(selection.startRow, selection.endRow),
    bottom: Math.max(selection.startRow, selection.endRow),
    left: Math.min(selection.startColumn, selection.endColumn),
    right: Math.max(selection.startColumn, selection.endColumn),
  };
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

export function insertDataTableRow(table: DataTableValue, index: number, options: ResolvedDataTableOptions) {
  if (table.rows.length >= options.rows.max) return table;
  const rows = [...table.rows];
  rows.splice(index, 0, { id: createDataTableID(), cells: table.columns.map(() => '') });
  return { ...table, rows };
}

export function insertDataTableColumn(table: DataTableValue, index: number, options: ResolvedDataTableOptions) {
  if (table.columns.length >= options.columns.max) return table;
  const columns = [...table.columns];
  columns.splice(index, 0, { id: createDataTableID(), label: `Column ${index + 1}` });
  return {
    ...table,
    columns,
    rows: table.rows.map((row) => ({ ...row, cells: [...row.cells.slice(0, index), '', ...row.cells.slice(index)] })),
  };
}

export function duplicateDataTableRow(table: DataTableValue, index: number, options: ResolvedDataTableOptions) {
  if (table.rows.length >= options.rows.max) return table;
  const row = table.rows[index];
  if (!row) return table;
  const rows = [...table.rows];
  rows.splice(index + 1, 0, { id: createDataTableID(), cells: [...row.cells] });
  return { ...table, rows };
}

export function duplicateDataTableColumn(table: DataTableValue, index: number, options: ResolvedDataTableOptions) {
  if (table.columns.length >= options.columns.max) return table;
  const column = table.columns[index];
  if (!column) return table;
  const columns = [...table.columns];
  columns.splice(index + 1, 0, { ...column, id: createDataTableID(), label: `${column.label} copy` });
  return {
    ...table,
    columns,
    rows: table.rows.map((row) => ({
      ...row,
      cells: [...row.cells.slice(0, index + 1), row.cells[index], ...row.cells.slice(index + 1)],
    })),
  };
}

export function moveDataTableRow(table: DataTableValue, from: number, to: number) {
  return { ...table, rows: moveItem(table.rows, from, to) };
}

export function moveDataTableColumn(table: DataTableValue, from: number, to: number) {
  return {
    ...table,
    columns: moveItem(table.columns, from, to),
    rows: table.rows.map((row) => ({ ...row, cells: moveItem(row.cells, from, to) })),
  };
}

export function deleteDataTableRow(table: DataTableValue, index: number, options: ResolvedDataTableOptions) {
  if (table.rows.length <= options.rows.min) return table;
  return { ...table, rows: table.rows.filter((_, rowIndex) => rowIndex !== index) };
}

export function deleteDataTableColumn(table: DataTableValue, index: number, options: ResolvedDataTableOptions) {
  if (table.columns.length <= options.columns.min) return table;
  return {
    ...table,
    columns: table.columns.filter((_, columnIndex) => columnIndex !== index),
    rows: table.rows.map((row) => ({ ...row, cells: row.cells.filter((_, columnIndex) => columnIndex !== index) })),
  };
}

export function clearDataTableSelection(table: DataTableValue, selection: TableSelection): DataTableValue {
  const bounds = selectionBounds(selection);
  return {
    ...table,
    rows: table.rows.map((row, rowIndex) => ({
      ...row,
      cells: row.cells.map((cell, columnIndex) =>
        rowIndex >= bounds.top && rowIndex <= bounds.bottom && columnIndex >= bounds.left && columnIndex <= bounds.right
          ? ''
          : cell,
      ),
    })),
  };
}

export function clearDataTableSelections(table: DataTableValue, selections: TableSelection[]): DataTableValue {
  if (!selections.length) return table;
  const bounds = selections.map(selectionBounds);
  return {
    ...table,
    rows: table.rows.map((row, rowIndex) => ({
      ...row,
      cells: row.cells.map((cell, columnIndex) =>
        bounds.some(
          (selection) =>
            rowIndex >= selection.top &&
            rowIndex <= selection.bottom &&
            columnIndex >= selection.left &&
            columnIndex <= selection.right,
        )
          ? ''
          : cell,
      ),
    })),
  };
}

export function copyDataTableSelection(table: DataTableValue, selection: TableSelection): string[][] {
  const bounds = selectionBounds(selection);
  return table.rows
    .slice(bounds.top, bounds.bottom + 1)
    .map((row) =>
      row.cells
        .slice(bounds.left, bounds.right + 1)
        .map((cell: DataTableCell) => (typeof cell === 'object' ? cell.formula : cell)),
    );
}

export function pasteDataTableCells(
  table: DataTableValue,
  matrix: string[][],
  startRow: number,
  startColumn: number,
  options: ResolvedDataTableOptions,
): DataTableValue {
  const width = Math.max(0, ...matrix.map((row) => row.length));
  const rowCount = Math.max(table.rows.length, startRow + matrix.length);
  const columnCount = Math.max(table.columns.length, startColumn + width);
  if (rowCount > options.rows.max || columnCount > options.columns.max)
    throw new Error(
      `Pasted data exceeds the table limits of ${options.rows.max} rows and ${options.columns.max} columns.`,
    );
  const columns = [...table.columns];
  while (columns.length < columnCount) columns.push({ id: createDataTableID(), label: `Column ${columns.length + 1}` });
  const rows = [...table.rows];
  while (rows.length < rowCount) rows.push({ id: createDataTableID(), cells: columns.map(() => '') });
  return {
    ...table,
    columns,
    rows: rows.map((row, rowIndex) => ({
      ...row,
      cells: columns.map((_, columnIndex) => {
        const pasted = matrix[rowIndex - startRow]?.[columnIndex - startColumn];
        return pasted === undefined ? (row.cells[columnIndex] ?? '') : pasted;
      }),
    })),
  };
}
