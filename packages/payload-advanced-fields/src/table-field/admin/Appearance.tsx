'use client';

import { useLayoutEffect, type CSSProperties, type RefObject } from 'react';
import type { ResolvedTablePresentation, TableAppearance, TableThemeColor } from '../shared/types.js';

const themeColor = (color: TableThemeColor | undefined, theme: 'light' | 'dark') =>
  typeof color === 'string' ? color : color?.[theme];
export function backgroundStyle(
  appearance: TableAppearance,
  options: ResolvedTablePresentation,
  row: string,
  column?: string,
): CSSProperties | undefined {
  const key = (column && appearance.cells?.[row]?.[column]) || appearance.rows?.[row];
  const color = options.palette.find((item) => item.key === key);
  if (!color) return undefined;
  return {
    '--table-bg-light': themeColor(color.background, 'light'),
    '--table-bg-dark': themeColor(color.background, 'dark'),
    '--table-text-light': themeColor(color.text, 'light') ?? 'var(--color-text, #222)',
    '--table-text-dark': themeColor(color.text, 'dark') ?? 'var(--color-text, #fff)',
  } as CSSProperties;
}
export function setBackground(
  appearance: TableAppearance,
  rows: string[],
  columns: string[] | undefined,
  key?: string,
): TableAppearance {
  if (!columns) {
    const next = { ...appearance.rows };
    for (const row of rows) {
      if (key) next[row] = key;
      else delete next[row];
    }
    return { ...appearance, rows: next };
  }
  const cells = { ...appearance.cells };
  for (const row of rows) {
    const next = { ...cells[row] };
    for (const column of columns) {
      if (key) next[column] = key;
      else delete next[column];
    }
    if (Object.keys(next).length) cells[row] = next;
    else delete cells[row];
  }
  return { ...appearance, cells };
}
export function BackgroundChoices({
  options,
  label,
  apply,
}: {
  options: ResolvedTablePresentation;
  label: string;
  apply: (key?: string) => void;
}) {
  if (!options.palette.length) return null;
  return (
    <div className="advanced-table__menu-group" role="group" aria-label={label}>
      <span>{label}</span>
      {options.palette.map((color) => (
        <button type="button" key={color.key} onClick={() => apply(color.key)}>
          <i
            aria-hidden
            className="advanced-table__swatch"
            style={backgroundStyle({ rows: { preview: color.key } }, options, 'preview')}
          />
          {color.label}
        </button>
      ))}
      <button type="button" onClick={() => apply()}>
        Clear {label.toLowerCase()}
      </button>
    </div>
  );
}
export function stickyCounts(appearance: TableAppearance, options: ResolvedTablePresentation, count: number) {
  const configured = appearance.stickyRows ?? options.stickyRows;
  const top = options.stickyRows.enabled ? Math.min(configured.top, count) : 0;
  return { top, bottom: options.stickyRows.enabled ? Math.min(configured.bottom, count - top) : 0 };
}
export function FreezeChoices({
  index,
  count,
  appearance,
  options,
  apply,
}: {
  index: number;
  count: number;
  appearance: TableAppearance;
  options: ResolvedTablePresentation;
  apply: (value: TableAppearance) => void;
}) {
  if (!options.stickyRows.enabled) return null;
  const current = stickyCounts(appearance, options, count);
  return (
    <div className="advanced-table__menu-group" role="group" aria-label="Sticky rows">
      <span>Sticky rows</span>
      <button
        type="button"
        onClick={() =>
          apply({ ...appearance, stickyRows: { top: index + 1, bottom: Math.min(current.bottom, count - index - 1) } })
        }
      >
        Freeze through this row
      </button>
      <button
        type="button"
        onClick={() =>
          apply({ ...appearance, stickyRows: { bottom: count - index, top: Math.min(current.top, index) } })
        }
      >
        Freeze from this row to bottom
      </button>
      <button
        type="button"
        disabled={!current.top && !current.bottom}
        onClick={() => apply({ ...appearance, stickyRows: { top: 0, bottom: 0 } })}
      >
        Unfreeze rows
      </button>
    </div>
  );
}

/** Actual measurements keep stacked rows aligned after resizing, validation messages and reordering. */
export function useStickyRows(root: RefObject<HTMLElement | null>, top: number, bottom: number, rowOrder: string) {
  useLayoutEffect(() => {
    const container = root.current;
    if (!container) return;
    const rows = Array.from(container.querySelectorAll<HTMLTableRowElement>('tbody > tr'));
    const header = container.querySelector('thead');
    const position = () => {
      let offset = header?.getBoundingClientRect().height ?? 0;
      for (const [index, row] of rows.entries()) {
        row.removeAttribute('data-sticky');
        if (index < top) {
          row.dataset.sticky = 'top';
          row.style.setProperty('--table-sticky-offset', `${offset}px`);
          offset += row.getBoundingClientRect().height;
        }
      }
      offset = 0;
      for (let index = rows.length - 1; index >= rows.length - bottom; index--) {
        const row = rows[index];
        if (!row) continue;
        row.dataset.sticky = 'bottom';
        row.style.setProperty('--table-sticky-offset', `${offset}px`);
        offset += row.getBoundingClientRect().height;
      }
    };
    position();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(position);
    rows.forEach((row) => observer.observe(row));
    if (header) observer.observe(header);
    return () => observer.disconnect();
  }, [root, top, bottom, rowOrder]);
}
