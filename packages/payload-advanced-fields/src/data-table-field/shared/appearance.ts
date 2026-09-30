import type { CSSProperties } from 'react';
import type { DataTableAppearance, DataTableThemeColor, DataTableValue, ResolvedDataTableOptions } from './types.js';

function color(value: DataTableThemeColor, theme: 'light' | 'dark') {
  return typeof value === 'string' ? value : value[theme];
}

export function dataTableBackgroundStyle(
  table: DataTableValue,
  options: ResolvedDataTableOptions,
  rowID: string,
  columnID?: string,
): CSSProperties | undefined {
  const key = (columnID && table.appearance?.cells?.[rowID]?.[columnID]) || table.appearance?.rows?.[rowID];
  const entry = options.palette.find((item) => item.key === key);
  if (!entry) return undefined;
  return {
    '--data-table-bg-light': color(entry.background, 'light'),
    '--data-table-bg-dark': color(entry.background, 'dark'),
    '--data-table-text-light': entry.text ? color(entry.text, 'light') : 'var(--color-text, inherit)',
    '--data-table-text-dark': entry.text ? color(entry.text, 'dark') : 'var(--color-text, inherit)',
  } as CSSProperties;
}

export function setDataTableBackground(
  appearance: DataTableAppearance | undefined,
  rows: string[],
  columns: string[] | undefined,
  key?: string,
): DataTableAppearance | undefined {
  const next = appearance ?? {};
  if (!columns) {
    const rowStyles = { ...next.rows };
    rows.forEach((row) => (key ? (rowStyles[row] = key) : delete rowStyles[row]));
    return Object.keys(rowStyles).length ? { ...next, rows: rowStyles } : { ...next, rows: undefined };
  }
  const cellStyles = { ...next.cells };
  rows.forEach((row) => {
    const rowStyles = { ...cellStyles[row] };
    columns.forEach((column) => (key ? (rowStyles[column] = key) : delete rowStyles[column]));
    if (Object.keys(rowStyles).length) cellStyles[row] = rowStyles;
    else delete cellStyles[row];
  });
  return Object.keys(cellStyles).length ? { ...next, cells: cellStyles } : { ...next, cells: undefined };
}

export function stickyRowCounts(table: DataTableValue, options: ResolvedDataTableOptions) {
  const configured = table.appearance?.stickyRows ?? options.stickyRows;
  const top = options.stickyRows.enabled ? Math.min(configured.top, table.rows.length) : 0;
  return { top, bottom: options.stickyRows.enabled ? Math.min(configured.bottom, table.rows.length - top) : 0 };
}
