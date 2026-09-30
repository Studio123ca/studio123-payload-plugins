import type { CSSProperties } from 'react';
import type {
  DataTableAppearance,
  DataTableLink,
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
  const textKey =
    (columnID && table.appearance?.textColors?.cells?.[rowID]?.[columnID]) ||
    table.appearance?.textColors?.rows?.[rowID];
  const textEntry = options.formats.find((item) => item.key === textKey);
  if (!entry && !textEntry) return undefined;
  return {
    ...(entry
      ? {
          '--data-table-bg-light': color(entry.background, 'light'),
          '--data-table-bg-dark': color(entry.background, 'dark'),
        }
      : {}),
    '--data-table-text-light': textEntry?.text
      ? color(textEntry.text, 'light')
      : entry?.text
        ? color(entry.text, 'light')
        : 'var(--color-text, inherit)',
    '--data-table-text-dark': textEntry?.text
      ? color(textEntry.text, 'dark')
      : entry?.text
        ? color(entry.text, 'dark')
        : 'var(--color-text, inherit)',
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

export function setDataTableTextColor(
  appearance: DataTableAppearance | undefined,
  rows: string[],
  columns: string[] | undefined,
  key?: string,
): DataTableAppearance | undefined {
  const next = appearance ?? {};
  const textColors = next.textColors ?? {};
  if (!columns) {
    const rowStyles = { ...textColors.rows };
    rows.forEach((row) => (key ? (rowStyles[row] = key) : delete rowStyles[row]));
    const nextTextColors = { ...textColors, rows: Object.keys(rowStyles).length ? rowStyles : undefined };
    if (!nextTextColors.rows && !nextTextColors.cells) {
      const { textColors: _removed, ...rest } = next;
      return rest;
    }
    return { ...next, textColors: nextTextColors };
  }
  const cellStyles = { ...textColors.cells };
  rows.forEach((row) => {
    const rowStyles = { ...cellStyles[row] };
    columns.forEach((column) => (key ? (rowStyles[column] = key) : delete rowStyles[column]));
    if (Object.keys(rowStyles).length) cellStyles[row] = rowStyles;
    else delete cellStyles[row];
  });
  const nextTextColors = { ...textColors, cells: Object.keys(cellStyles).length ? cellStyles : undefined };
  if (!nextTextColors.rows && !nextTextColors.cells) {
    const { textColors: _removed, ...rest } = next;
    return rest;
  }
  return { ...next, textColors: nextTextColors };
}

export function dataTableTextStyle(
  table: DataTableValue,
  rowID: string,
  columnID: string,
): DataTableTextStyle | undefined {
  return table.appearance?.text?.[rowID]?.[columnID];
}

export function dataTableLink(table: DataTableValue, rowID: string, columnID: string): DataTableLink | undefined {
  return table.appearance?.links?.[rowID]?.[columnID];
}

export function setDataTableLink(
  appearance: DataTableAppearance | undefined,
  rows: string[],
  columns: string[],
  link: DataTableLink | undefined,
): DataTableAppearance | undefined {
  const next = appearance ?? {};
  const links = { ...next.links };
  rows.forEach((rowID) => {
    const rowLinks = { ...links[rowID] };
    columns.forEach((columnID) => (link ? (rowLinks[columnID] = link) : delete rowLinks[columnID]));
    if (Object.keys(rowLinks).length) links[rowID] = rowLinks;
    else delete links[rowID];
  });
  return Object.keys(links).length ? { ...next, links } : { ...next, links: undefined };
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
        const hasExplicitStyle = Object.entries(style).some(
          ([key, value]) => value !== undefined && value !== 'left' && (value !== false || key === 'wrap'),
        );
        if (!hasExplicitStyle) delete rowStyles[columnID];
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
