import type { CSSProperties } from 'react';
import type {
  DataTableAppearance,
  DataTableTextStyle,
  DataTableThemeColor,
  DataTableValue,
  ResolvedDataTableOptions,
} from './types.js';

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
  const entry = options.formats.find((item) => item.key === key);
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

export function dataTableTextStyle(
  table: DataTableValue,
  rowID: string,
  columnID: string,
): DataTableTextStyle | undefined {
  return table.appearance?.text?.[rowID]?.[columnID];
}

export function setDataTableTextStyle(
  appearance: DataTableAppearance | undefined,
  rows: string[],
  columns: string[],
  patch: DataTableTextStyle | undefined,
): DataTableAppearance | undefined {
  const next = appearance ?? {};
  const text = { ...next.text };
  rows.forEach((rowID) => {
    const rowStyles = { ...text[rowID] };
    columns.forEach((columnID) => {
      if (!patch) delete rowStyles[columnID];
      else {
        const current = rowStyles[columnID] ?? {};
        const style = { ...current, ...patch };
        if (!Object.values(style).some((value) => value !== undefined && value !== false && value !== 'left'))
          delete rowStyles[columnID];
        else rowStyles[columnID] = style;
      }
    });
    if (Object.keys(rowStyles).length) text[rowID] = rowStyles;
    else delete text[rowID];
  });
  return Object.keys(text).length ? { ...next, text } : { ...next, text: undefined };
}

export function stickyRowCounts(table: DataTableValue, options: ResolvedDataTableOptions) {
  const configured = table.appearance?.stickyRows ?? options.stickyRows;
  const top = options.stickyRows.enabled ? Math.min(configured.top, table.rows.length) : 0;
  return { top, bottom: options.stickyRows.enabled ? Math.min(configured.bottom, table.rows.length - top) : 0 };
}
