'use client';

import {
  BackgroundChoices,
  FreezeChoices,
  backgroundStyle,
  setBackground,
  stickyCounts,
  useStickyRows,
} from './Appearance.js';
import { cleanAppearance } from '../shared/presentation.js';

import { useEffect, useMemo, useRef, useState, useId } from 'react';
import { ConfirmationModal, Drawer, useModal } from '@payloadcms/ui';
import type { DragEvent, KeyboardEvent, ReactNode } from 'react';
import type { ResolvedTableOptions, TableCell, TableSelection, TableValue, TableAppearance } from '../shared/types.js';
import {
  columnName,
  createTable,
  createTableID,
  editableCellInput,
  MAX_CELL_LENGTH,
  MAX_IMPORT_LENGTH,
  moveColumn,
  moveItem,
  parseCell,
  pasteCells,
  selectionBounds,
} from '../shared/table.js';
import { evaluateTable } from '../shared/formulas.js';
import { parseDelimited, safeCSVCell, stringifyDelimited } from '../shared/clipboard.js';
import './styles.css';
import { useRowSizing } from './useRowSizing.js';
import { ColumnResize } from './ColumnResize.js';
import { FormatMenu } from './FormatMenu.js';
import { TableMenu, ToolbarMenu } from './TableMenu.js';

type Props = {
  maxHeight?: number | string;
  value: TableValue | null;
  onChange: (value: TableValue | null) => void;
  options: ResolvedTableOptions;
  readOnly?: boolean;
};
const initialSelection: TableSelection = { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 };
const sortCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function MenuGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="advanced-table__menu-group" role="group" aria-label={label}>
      {children}
    </div>
  );
}

function TableHelpModal({ formulas, modalSlug }: { formulas: boolean; modalSlug: string }) {
  return (
    <Drawer slug={modalSlug} title="Table help">
      <div className="advanced-table__help-content">
        <section>
          <strong>Navigate</strong>
          <p>
            Click a cell to select it. Arrow keys and <kbd>Tab</kbd> move the selection; hold <kbd>Shift</kbd> with an
            arrow key to extend it. Press <kbd>Enter</kbd> or double-click a cell to edit. While editing, <kbd>Alt</kbd>{' '}
            + <kbd>Enter</kbd> adds a line break and <kbd>Esc</kbd> stops editing while keeping the cell selected.
          </p>
        </section>
        <section>
          <strong>Select, copy, and clear</strong>
          <p>
            Drag across cells or <kbd>Shift</kbd>-click to select a rectangle. Copy and paste tab- or line-separated
            values with the keyboard or the <strong>Edit</strong> menu. Press <kbd>Delete</kbd> or <kbd>Backspace</kbd>{' '}
            to clear the selected cells.
          </p>
        </section>
        <section>
          <strong>Rows and columns</strong>
          <p>
            Click a row number or column letter to select that full row or column. Drag a selected header to reorder it.
            Drag a column border to resize it. Right-click a row or column header for insert, duplicate, move, delete,
            background, and sticky-row actions.
          </p>
        </section>
        <section>
          <strong>Menus and history</strong>
          <p>
            Use <strong>Table</strong> for CSV import/export and clearing the table; <strong>Edit</strong> for undo,
            redo, copy, paste, and clearing cells; <strong>Sort</strong> for the active column; <strong>Insert</strong>{' '}
            for rows and columns; <strong>Format</strong> for cell and row backgrounds; and <strong>View</strong> to
            reset column widths. Clear table asks for confirmation.
          </p>
        </section>
        {formulas && (
          <section>
            <strong>Formulas</strong>
            <p>
              Start with <code>=</code> and use body-cell addresses such as <code>A1</code>. References follow their
              positions when rows or columns move.
            </p>
            <p>
              Individual cells: <code>=A1+B1</code>
            </p>
            <div className="advanced-table__formula-examples" aria-label="Formula examples">
              <code>=SUM(C1:C4)</code>
              <code>=AVERAGE(C1:C4)</code>
              <code>=SUM(A1,C3,E5)</code>
              <code>=MAX(A1:A10)</code>
              <code>=COUNT(A1:C10)</code>
            </div>
            <p>Available functions: SUM, AVERAGE, MIN, MAX, and COUNT.</p>
          </section>
        )}
      </div>
    </Drawer>
  );
}

function Cell({
  cell,
  result,
  options,
  readOnly,
  editing,
  label,
  onChange,
  onFocus,
  onKeyDown,
  onStartEditing,
  onStopEditing,
}: {
  cell: TableCell;
  result: string | number | boolean | null;
  options: ResolvedTableOptions;
  readOnly: boolean;
  editing: boolean;
  label: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onStartEditing: () => void;
  onStopEditing: () => void;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (editing) input.current?.focus();
  }, [editing]);

  return (
    <textarea
      ref={input}
      aria-label={label}
      className="advanced-table__input"
      maxLength={typeof cell === 'object' && cell !== null ? 1024 : MAX_CELL_LENGTH}
      readOnly={readOnly || !editing}
      rows={1}
      tabIndex={editing ? 0 : -1}
      title={typeof cell === 'object' && cell !== null ? `${cell.formula} → ${String(result ?? '')}` : undefined}
      value={focused ? draft : String(result ?? '')}
      onBlur={() => {
        setFocused(false);
        onStopEditing();
      }}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(event.target.value);
      }}
      onFocus={() => {
        if (!editing) return;
        setDraft(editableCellInput(cell, options));
        setFocused(true);
        onFocus();
      }}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        if (!editing) event.preventDefault();
      }}
      onDoubleClick={() => {
        if (!readOnly) onStartEditing();
      }}
    />
  );
}

export function TableEditor({ value, onChange, options, readOnly = false, maxHeight = 640 }: Props) {
  const clearModalSlug = `clear-table-${useId()}`;
  const helpModalSlug = `table-help-${useId()}`;
  const { openModal, closeModal } = useModal();
  useEffect(
    () => () => {
      closeModal(clearModalSlug);
      closeModal(helpModalSlug);
    },
    [closeModal, clearModalSlug, helpModalSlug],
  );
  const root = useRef<HTMLDivElement>(null);
  useRowSizing(root);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastValue = useRef(value);
  const current = useRef({ value, readOnly });
  current.current = { value, readOnly };
  const mounted = useRef(true);
  const selecting = useRef(false);
  const movingFocus = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const history = useRef<{ undo: (TableValue | null)[]; redo: (TableValue | null)[] }>({ undo: [], redo: [] });
  const [revision, refresh] = useState(0);
  const [selection, setSelection] = useState<TableSelection | null>(null);
  const [message, setMessage] = useState('');
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [dragging, setDragging] = useState<{ kind: 'column' | 'row'; index: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ kind: 'column' | 'row'; index: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ column: number; row: number } | null>(null);
  const columnWidth = (column: TableValue['columns'][number]) => widths[column.id] ?? column.width ?? 180;
  const results = useMemo(() => (value ? evaluateTable(value) : []), [value]);
  const bounds = selectionBounds(selection ?? initialSelection);
  const [sessionAppearance, setSessionAppearance] = useState<TableAppearance>({});
  const appearance = options.storage === 'json' ? (value?.appearance ?? {}) : sessionAppearance;
  const frozen = stickyCounts(appearance, options, value?.rows.length ?? 0);
  useStickyRows(root, frozen.top, frozen.bottom, `${revision}:${value?.rows.map((row) => row.id).join(':') ?? ''}`);
  const changeAppearance = (next: TableAppearance) => {
    if (readOnly || !value) return;
    if (options.storage === 'json') commit({ ...value, appearance: next });
    else setSessionAppearance(next);
  };
  const insertColumn = (index: number) => {
    if (!value || value.columns.length >= options.maxColumns) return;
    const columns = [...value.columns];
    columns.splice(index, 0, { id: createTableID(), label: `Column ${index + 1}` });
    commit({
      ...value,
      columns,
      rows: value.rows.map((row) => ({ ...row, cells: [...row.cells.slice(0, index), '', ...row.cells.slice(index)] })),
    });
    setSelection(null);
  };
  const insertRow = (index: number) => {
    if (!value || value.rows.length >= options.maxRows) return;
    const rows = [...value.rows];
    rows.splice(index, 0, { id: createTableID(), cells: value.columns.map(() => '') });
    commit({ ...value, rows });
    setSelection(null);
  };
  const beginDrag = (event: DragEvent<HTMLElement>, kind: 'column' | 'row', index: number) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${kind}:${index}`);
    setDragging({ kind, index });
  };
  const dropReorder = (kind: 'column' | 'row', index: number) => {
    if (!value || !dragging || dragging.kind !== kind) return;
    if (dragging.index !== index) {
      commit(
        kind === 'column'
          ? moveColumn(value, dragging.index, index)
          : { ...value, rows: moveItem(value.rows, dragging.index, index) },
      );
      setSelection(null);
    }
    setDragging(null);
    setDropTarget(null);
  };
  const copySelection = async () => {
    if (!value || !selection) return;
    if (!navigator.clipboard?.writeText) {
      setMessage('Clipboard unavailable. Select cells and use your browser’s Copy command.');
      return;
    }
    try {
      await navigator.clipboard.writeText(stringifyDelimited(copyMatrix()));
      setMessage('Selection copied.');
    } catch {
      setMessage('Clipboard unavailable. Select cells and use your browser’s Copy command.');
    }
  };
  const pasteSelection = async () => {
    const target = value;
    if (!target || !selection || !navigator.clipboard?.readText) {
      setMessage('Clipboard unavailable. Use your browser’s Paste command in the selected cell.');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!mounted.current || current.current.value !== target || current.current.readOnly) return;
      attempt(() =>
        commit(
          pasteCells(
            target,
            parseDelimited(text, '\t', options.maxRows, options.maxColumns),
            bounds.top,
            bounds.left,
            options,
          ),
        ),
      );
    } catch {
      setMessage('Clipboard unavailable. Use your browser’s Paste command in the selected cell.');
    }
  };
  const sortRows = (direction: 'ascending' | 'descending') => {
    if (!value) return;
    const column = bounds.left;
    const sorted = value.rows
      .map((row, index) => ({ index, row, value: results[index]?.[column] }))
      .sort((left, right) => {
        const leftBlank = left.value === null || left.value === '';
        const rightBlank = right.value === null || right.value === '';
        if (leftBlank || rightBlank) return leftBlank === rightBlank ? left.index - right.index : leftBlank ? 1 : -1;
        const comparison =
          typeof left.value === 'number' && typeof right.value === 'number'
            ? left.value - right.value
            : sortCollator.compare(String(left.value), String(right.value));
        return direction === 'ascending' ? comparison : -comparison;
      })
      .map(({ row }) => row);
    commit({ ...value, rows: sorted });
    setSelection(null);
  };

  // External form resets, locale changes and version restores start a new history.
  useEffect(() => {
    if (value !== lastValue.current) {
      history.current = { undo: [], redo: [] };
      lastValue.current = value;
      setSelection(null);
      setWidths({});
      setSessionAppearance({});
      refresh((n) => n + 1);
    }
  }, [value]);
  const commit = (next: TableValue | null) => {
    if (readOnly || next === value) return;
    if (next)
      next = {
        ...next,
        headerRow: options.headerRow,
        ...(next.appearance ? { appearance: cleanAppearance(next.appearance, next) } : {}),
      };
    history.current.undo = [...history.current.undo.slice(-49), value];
    history.current.redo = [];
    lastValue.current = next;
    onChange(next);
    setMessage('');
  };
  const travel = (direction: 'undo' | 'redo') => {
    if (readOnly || !history.current[direction].length) return;
    const previous = history.current[direction].pop()!;
    const next = previous ? { ...previous, headerRow: options.headerRow } : previous;
    history.current[direction === 'undo' ? 'redo' : 'undo'].push(value);
    lastValue.current = next;
    onChange(next);
    setSelection(null);
    setMessage('');
    refresh((n) => n + 1);
  };
  const attempt = (action: () => void) => {
    try {
      action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update table.');
    }
  };
  const focusCell = (row: number, column: number) => {
    movingFocus.current = true;
    root.current?.querySelector<HTMLElement>(`td[data-cell="${row}:${column}"]`)?.focus();
    movingFocus.current = false;
  };
  const moveSelection = (row: number, column: number, extend = false) => {
    if (!value || row < 0 || column < 0 || row >= value.rows.length || column >= value.columns.length) return;
    setEditingCell(null);
    setSelection(
      extend
        ? { ...(selection ?? initialSelection), endRow: row, endColumn: column }
        : { startRow: row, endRow: row, startColumn: column, endColumn: column },
    );
    focusCell(row, column);
  };
  const updateCell = (row: number, column: number, cell: TableCell) => {
    if (!value) return;
    commit({
      ...value,
      rows: value.rows.map((item, r) =>
        r === row ? { ...item, cells: item.cells.map((itemCell, c) => (c === column ? cell : itemCell)) } : item,
      ),
    });
  };
  const copyMatrix = () =>
    value
      ? value.rows
          .slice(bounds.top, bounds.bottom + 1)
          .map((row) => row.cells.slice(bounds.left, bounds.right + 1).map((cell) => editableCellInput(cell, options)))
      : [];
  const clearSelection = () => {
    if (!value || !selection) return;
    commit({
      ...value,
      rows: value.rows.map((row, r) =>
        r < bounds.top || r > bounds.bottom
          ? row
          : { ...row, cells: row.cells.map((cell, c) => (c >= bounds.left && c <= bounds.right ? '' : cell)) },
      ),
    });
  };
  const navigation = (event: KeyboardEvent<HTMLTextAreaElement>, row: number, column: number) => {
    if (!value) return;
    let r = row,
      c = column;
    if (event.key === 'Tab') {
      const next = row * value.columns.length + column + (event.shiftKey ? -1 : 1);
      if (next < 0 || next >= value.rows.length * value.columns.length) return;
      r = Math.floor(next / value.columns.length);
      c = next % value.columns.length;
    } else if (event.key === 'Enter' && !event.altKey) r += event.shiftKey ? -1 : 1;
    else if (event.key === 'Escape') {
      event.preventDefault();
      setEditingCell(null);
      focusCell(row, column);
      return;
    } else return;
    event.preventDefault();
    if (r < 0 || c < 0 || r >= value.rows.length || c >= value.columns.length) return;
    moveSelection(r, c, event.shiftKey && event.altKey);
  };
  const importCSV = async (file: File) => {
    // Capture the document value: do not apply a delayed import to another locale/version.
    const target = value;
    if (file.size > MAX_IMPORT_LENGTH) {
      setMessage('CSV is too large (maximum 2 MB).');
      return;
    }
    try {
      const text = await file.text();
      if (!mounted.current || current.current.value !== target || current.current.readOnly) return;
      const hasHeader = options.headerRow;
      const matrix = parseDelimited(text, ',', options.maxRows + (hasHeader ? 1 : 0), options.maxColumns);
      const headers = hasHeader ? (matrix.shift() ?? []) : [];
      const width = Math.max(options.minColumns, headers.length, ...matrix.map((row) => row.length));
      if (matrix.length < options.minRows) throw new Error(`Import requires at least ${options.minRows} rows.`);
      let next: TableValue = {
        version: 1,
        caption: target?.caption ?? '',
        headerRow: hasHeader,
        columns: Array.from({ length: width }, (_, index) => ({
          id: createTableID(),
          label: headers[index] ?? `Column ${index + 1}`,
        })),
        rows: [],
      };
      next = pasteCells(next, matrix, 0, 0, options);
      commit(next);
      setSelection(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to read CSV.');
    }
  };
  const exportCSV = () => {
    if (!value) return;
    const matrix = [
      ...(options.headerRow ? [value.columns.map((column) => column.label)] : []),
      ...results.map((row) => row.map((cell) => String(cell ?? ''))),
    ];
    const blob = new Blob(
      [
        stringifyDelimited(
          matrix.map((row) => row.map(safeCSVCell)),
          ',',
        ),
      ],
      { type: 'text/csv;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob),
      anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'table.csv';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="advanced-table" ref={root}>
      <ConfirmationModal
        modalSlug={clearModalSlug}
        heading="Clear table?"
        body="This removes all rows, columns, and cell content from this table. You can undo this while editing."
        confirmLabel="Clear table"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (!readOnly) {
            commit(null);
            setSessionAppearance({});
          }
        }}
      />
      <TableHelpModal formulas={options.formulas} modalSlug={helpModalSlug} />
      <div className="advanced-table__toolbar" aria-label="Table actions">
        <ToolbarMenu label="Table">
          {!value && !readOnly && (
            <button type="button" onClick={() => commit(createTable(options))}>
              Create table
            </button>
          )}
          {!readOnly && (
            <button type="button" onClick={() => fileInput.current?.click()}>
              Import CSV
            </button>
          )}
          {value && (
            <button type="button" onClick={exportCSV}>
              Export CSV
            </button>
          )}
          {!readOnly && value && <div className="advanced-table__menu-divider" />}
          {!readOnly && value && (
            <button type="button" onClick={() => openModal(clearModalSlug)}>
              Clear table
            </button>
          )}
        </ToolbarMenu>
        <ToolbarMenu label="Edit">
          {!readOnly && (
            <MenuGroup label="History">
              <button type="button" disabled={!history.current.undo.length} onClick={() => travel('undo')}>
                Undo
              </button>
              <button type="button" disabled={!history.current.redo.length} onClick={() => travel('redo')}>
                Redo
              </button>
            </MenuGroup>
          )}
          {value && (
            <MenuGroup label="Selection">
              <button type="button" disabled={!selection} onClick={() => void copySelection()}>
                Copy cells
              </button>
              {!readOnly && (
                <button type="button" disabled={!selection} onClick={() => void pasteSelection()}>
                  Paste cells
                </button>
              )}
              {value && (
                <button type="button" disabled={readOnly || !selection} onClick={clearSelection}>
                  Clear cells
                </button>
              )}
            </MenuGroup>
          )}
        </ToolbarMenu>
        {value && (
          <ToolbarMenu label="Sort">
            <button type="button" disabled={readOnly || value.rows.length < 2} onClick={() => sortRows('ascending')}>
              Sort column {columnName(bounds.left)} A–Z
            </button>
            <button type="button" disabled={readOnly || value.rows.length < 2} onClick={() => sortRows('descending')}>
              Sort column {columnName(bounds.left)} Z–A
            </button>
          </ToolbarMenu>
        )}
        {!readOnly && value && (
          <ToolbarMenu label="Insert">
            <MenuGroup label="Rows">
              <button
                type="button"
                disabled={value.rows.length >= options.maxRows}
                onClick={() => insertRow(value.rows.length)}
              >
                Add row
              </button>
            </MenuGroup>
            <MenuGroup label="Columns">
              <button
                type="button"
                disabled={value.columns.length >= options.maxColumns}
                onClick={() => insertColumn(value.columns.length)}
              >
                Add column
              </button>
            </MenuGroup>
          </ToolbarMenu>
        )}
        {value && !readOnly && options.palette.length > 0 && (
          <FormatMenu
            options={options}
            applyCell={(key) =>
              changeAppearance(
                setBackground(
                  appearance,
                  value.rows.slice(bounds.top, bounds.bottom + 1).map((row) => row.id),
                  value.columns.slice(bounds.left, bounds.right + 1).map((column) => column.id),
                  key,
                ),
              )
            }
            applyRow={(key) =>
              changeAppearance(
                setBackground(
                  appearance,
                  value.rows.slice(bounds.top, bounds.bottom + 1).map((row) => row.id),
                  undefined,
                  key,
                ),
              )
            }
          />
        )}
        {value && (
          <ToolbarMenu label="View">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => {
                setWidths({});
                if (options.storage === 'json')
                  commit({ ...value, columns: value.columns.map(({ width: _width, ...column }) => column) });
              }}
            >
              Reset column widths
            </button>
            {options.stickyRows.enabled && (
              <button
                type="button"
                disabled={readOnly || (!frozen.top && !frozen.bottom)}
                onClick={() => changeAppearance({ ...appearance, stickyRows: { top: 0, bottom: 0 } })}
              >
                Unfreeze rows
              </button>
            )}
          </ToolbarMenu>
        )}
        {value && (
          <button className="advanced-table__menu-trigger" type="button" onClick={() => openModal(helpModalSlug)}>
            Help
          </button>
        )}
        {!readOnly && (
          <>
            <input
              hidden
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void importCSV(file);
              }}
            />
          </>
        )}
      </div>
      <div role="status" className="advanced-table__status">
        {message}
      </div>
      {!value ? (
        <p>No table content.</p>
      ) : (
        <>
          <div
            className="advanced-table__scroll"
            style={{ maxHeight }}
            onBlur={(event) => {
              if (event.relatedTarget && root.current?.contains(event.relatedTarget as Node)) return;
              setSelection(null);
            }}
            onPaste={(event) => {
              if (readOnly || !(event.target instanceof HTMLTextAreaElement)) return;
              const text = event.clipboardData.getData('text/plain');
              if (!/[\t\r\n]/.test(text)) return;
              event.preventDefault();
              attempt(() =>
                commit(
                  pasteCells(
                    value,
                    parseDelimited(text, '\t', options.maxRows, options.maxColumns),
                    bounds.top,
                    bounds.left,
                    options,
                  ),
                ),
              );
            }}
            onCopy={(event) => {
              if (bounds.top === bounds.bottom && bounds.left === bounds.right) return;
              event.preventDefault();
              event.clipboardData.setData('text/plain', stringifyDelimited(copyMatrix()));
            }}
            onPointerUp={() => {
              selecting.current = false;
            }}
            onPointerMove={(event) => {
              if (!selecting.current || event.buttons !== 1) return;
              const target = document.elementFromPoint(event.clientX, event.clientY) ?? event.target;
              const cell = target instanceof HTMLElement ? target.closest<HTMLElement>('[data-cell]') : null;
              const [row, column] = cell?.dataset.cell?.split(':').map(Number) ?? [];
              if (!Number.isInteger(row) || !Number.isInteger(column)) return;
              setSelection((currentSelection) => ({
                ...(currentSelection ?? { startRow: row, startColumn: column }),
                endRow: row,
                endColumn: column,
              }));
            }}
          >
            <table
              aria-label="Table content"
              style={{ width: 64 + value.columns.reduce((sum, column) => sum + columnWidth(column), 0) }}
            >
              <colgroup>
                <col style={{ width: 64 }} />
                {value.columns.map((column) => (
                  <col key={column.id} style={{ width: columnWidth(column) }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="advanced-table__sr">Row</span>
                  </th>
                  {value.columns.map((column, c) => (
                    <th
                      scope="col"
                      key={column.id}
                      style={{ width: columnWidth(column) }}
                      draggable={Boolean(
                        !readOnly &&
                        selection &&
                        bounds.left === c &&
                        bounds.right === c &&
                        bounds.top === 0 &&
                        bounds.bottom === value.rows.length - 1,
                      )}
                      data-selected={
                        selection &&
                        bounds.left === c &&
                        bounds.right === c &&
                        bounds.top === 0 &&
                        bounds.bottom === value.rows.length - 1
                          ? true
                          : undefined
                      }
                      data-drop-target={dropTarget?.kind === 'column' && dropTarget.index === c ? true : undefined}
                      onDragOver={(event) => {
                        if (dragging?.kind !== 'column') return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                      }}
                      onDragEnter={() => {
                        if (dragging?.kind === 'column') setDropTarget({ kind: 'column', index: c });
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        dropReorder('column', c);
                      }}
                      onDragStart={(event) => beginDrag(event, 'column', c)}
                      onDragEnd={() => {
                        setDragging(null);
                        setDropTarget(null);
                      }}
                      onClick={(event) => {
                        if (event.target instanceof HTMLElement && event.target.closest('input, button')) return;
                        setEditingCell(null);
                        setSelection({ startRow: 0, endRow: value.rows.length - 1, startColumn: c, endColumn: c });
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setEditingCell(null);
                        setSelection({ startRow: 0, endRow: value.rows.length - 1, startColumn: c, endColumn: c });
                        event.currentTarget
                          .querySelector<HTMLButtonElement>('.advanced-table__context-menu-trigger')
                          ?.click();
                      }}
                    >
                      <div className="advanced-table__column-heading">
                        <span>{columnName(c)}</span>
                        {options.headerRow && (
                          <input
                            aria-label={`Header ${columnName(c)}`}
                            readOnly={readOnly}
                            maxLength={MAX_CELL_LENGTH}
                            value={column.label}
                            onChange={(event) =>
                              commit({
                                ...value,
                                columns: value.columns.map((item, i) =>
                                  i === c ? { ...item, label: event.target.value } : item,
                                ),
                              })
                            }
                          />
                        )}
                        {!readOnly && (
                          <TableMenu context label={`Column ${columnName(c)} actions`}>
                            <MenuGroup label="Insert">
                              <button
                                type="button"
                                disabled={value.columns.length >= options.maxColumns}
                                onClick={() => insertColumn(c)}
                              >
                                Add column before
                              </button>
                              <button
                                type="button"
                                disabled={value.columns.length >= options.maxColumns}
                                onClick={() => insertColumn(c + 1)}
                              >
                                Add column after
                              </button>
                              <button
                                type="button"
                                disabled={value.columns.length >= options.maxColumns}
                                onClick={() => {
                                  const columns = [...value.columns];
                                  columns.splice(c + 1, 0, { ...column, id: createTableID() });
                                  commit({
                                    ...value,
                                    columns,
                                    rows: value.rows.map((row) => {
                                      const cells = [...row.cells];
                                      cells.splice(c + 1, 0, row.cells[c]);
                                      return { ...row, cells };
                                    }),
                                  });
                                }}
                              >
                                Duplicate column
                              </button>
                            </MenuGroup>
                            <MenuGroup label="Move">
                              <button
                                type="button"
                                disabled={c === 0}
                                onClick={() => {
                                  commit(moveColumn(value, c, c - 1));
                                  setSelection(null);
                                }}
                              >
                                Move left
                              </button>
                              <button
                                type="button"
                                disabled={c === value.columns.length - 1}
                                onClick={() => {
                                  commit(moveColumn(value, c, c + 1));
                                  setSelection(null);
                                }}
                              >
                                Move right
                              </button>
                            </MenuGroup>
                            <MenuGroup label="Remove">
                              <button
                                type="button"
                                disabled={value.columns.length <= options.minColumns}
                                onClick={() => {
                                  commit({
                                    ...value,
                                    columns: value.columns.filter((_, i) => i !== c),
                                    rows: value.rows.map((row) => ({
                                      ...row,
                                      cells: row.cells.filter((_, i) => i !== c),
                                    })),
                                  });
                                  setSelection(null);
                                }}
                              >
                                Delete column
                              </button>
                            </MenuGroup>
                          </TableMenu>
                        )}
                      </div>
                      {!readOnly && (
                        <ColumnResize
                          label={`column ${columnName(c)}`}
                          width={columnWidth(column)}
                          onResize={(width, final) => {
                            setWidths((previous) => ({ ...previous, [column.id]: width }));
                            if (final && options.storage === 'json') {
                              commit({
                                ...value,
                                columns: value.columns.map((item) =>
                                  item.id === column.id ? { ...item, width } : item,
                                ),
                              });
                              setWidths((previous) => {
                                const next = { ...previous };
                                delete next[column.id];
                                return next;
                              });
                            }
                          }}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {value.rows.map((row, r) => (
                  <tr key={`${row.id}:${revision}`}>
                    <th
                      scope="row"
                      style={backgroundStyle(appearance, options, row.id)}
                      draggable={Boolean(
                        !readOnly &&
                        selection &&
                        bounds.top === r &&
                        bounds.bottom === r &&
                        bounds.left === 0 &&
                        bounds.right === value.columns.length - 1,
                      )}
                      data-selected={
                        selection &&
                        bounds.top === r &&
                        bounds.bottom === r &&
                        bounds.left === 0 &&
                        bounds.right === value.columns.length - 1
                          ? true
                          : undefined
                      }
                      data-colored={Boolean(backgroundStyle(appearance, options, row.id)) || undefined}
                      data-drop-target={dropTarget?.kind === 'row' && dropTarget.index === r ? true : undefined}
                      onDragOver={(event) => {
                        if (dragging?.kind !== 'row') return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                      }}
                      onDragEnter={() => {
                        if (dragging?.kind === 'row') setDropTarget({ kind: 'row', index: r });
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        dropReorder('row', r);
                      }}
                      onDragStart={(event) => beginDrag(event, 'row', r)}
                      onDragEnd={() => {
                        setDragging(null);
                        setDropTarget(null);
                      }}
                      onClick={(event) => {
                        if (event.target instanceof HTMLElement && event.target.closest('button')) return;
                        setEditingCell(null);
                        setSelection({ startRow: r, endRow: r, startColumn: 0, endColumn: value.columns.length - 1 });
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setEditingCell(null);
                        setSelection({ startRow: r, endRow: r, startColumn: 0, endColumn: value.columns.length - 1 });
                        event.currentTarget
                          .querySelector<HTMLButtonElement>('.advanced-table__context-menu-trigger')
                          ?.click();
                      }}
                    >
                      <div className="advanced-table__row-heading">
                        <span>{r + 1}</span>
                        {!readOnly && (
                          <TableMenu context label={`Row ${r + 1} actions`}>
                            <BackgroundChoices
                              options={options}
                              label="Row background"
                              apply={(key) => changeAppearance(setBackground(appearance, [row.id], undefined, key))}
                            />
                            <FreezeChoices
                              index={r}
                              count={value.rows.length}
                              appearance={appearance}
                              options={options}
                              apply={changeAppearance}
                            />
                            <MenuGroup label="Insert">
                              <button
                                type="button"
                                disabled={value.rows.length >= options.maxRows}
                                onClick={() => insertRow(r)}
                              >
                                Add row before
                              </button>
                              <button
                                type="button"
                                disabled={value.rows.length >= options.maxRows}
                                onClick={() => insertRow(r + 1)}
                              >
                                Add row after
                              </button>
                              <button
                                type="button"
                                disabled={value.rows.length >= options.maxRows}
                                onClick={() => {
                                  const rows = [...value.rows];
                                  rows.splice(r + 1, 0, { ...row, id: createTableID(), cells: [...row.cells] });
                                  commit({ ...value, rows });
                                }}
                              >
                                Duplicate row
                              </button>
                            </MenuGroup>
                            <MenuGroup label="Move">
                              <button
                                type="button"
                                disabled={r === 0}
                                onClick={() => {
                                  commit({ ...value, rows: moveItem(value.rows, r, r - 1) });
                                  setSelection(null);
                                }}
                              >
                                Move up
                              </button>
                              <button
                                type="button"
                                disabled={r === value.rows.length - 1}
                                onClick={() => {
                                  commit({ ...value, rows: moveItem(value.rows, r, r + 1) });
                                  setSelection(null);
                                }}
                              >
                                Move down
                              </button>
                            </MenuGroup>
                            <MenuGroup label="Remove">
                              <button
                                type="button"
                                disabled={value.rows.length <= options.minRows}
                                onClick={() => {
                                  commit({ ...value, rows: value.rows.filter((_, i) => i !== r) });
                                  setSelection(null);
                                }}
                              >
                                Delete row
                              </button>
                            </MenuGroup>
                          </TableMenu>
                        )}
                      </div>
                    </th>
                    {row.cells.map((cell, c) => (
                      <td
                        key={value.columns[c].id}
                        style={backgroundStyle(appearance, options, row.id, value.columns[c].id)}
                        data-colored={
                          Boolean(backgroundStyle(appearance, options, row.id, value.columns[c].id)) || undefined
                        }
                        data-cell={`${r}:${c}`}
                        data-selected={
                          (selection &&
                            r >= bounds.top &&
                            r <= bounds.bottom &&
                            c >= bounds.left &&
                            c <= bounds.right) ||
                          undefined
                        }
                        tabIndex={0}
                        onFocus={(event) => {
                          if (event.target === event.currentTarget && !movingFocus.current) {
                            setSelection({ startRow: r, endRow: r, startColumn: c, endColumn: c });
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.target instanceof HTMLTextAreaElement) return;
                          if ((event.key === 'Backspace' || event.key === 'Delete') && !readOnly) {
                            event.preventDefault();
                            clearSelection();
                            return;
                          }
                          if (event.key === 'Enter' && !readOnly) {
                            event.preventDefault();
                            setSelection({ startRow: r, endRow: r, startColumn: c, endColumn: c });
                            setEditingCell({ row: r, column: c });
                            return;
                          }
                          if (event.key === 'Tab') {
                            const nextIndex = r * value.columns.length + c + (event.shiftKey ? -1 : 1);
                            if (nextIndex < 0 || nextIndex >= value.rows.length * value.columns.length) return;
                            event.preventDefault();
                            moveSelection(
                              Math.floor(nextIndex / value.columns.length),
                              nextIndex % value.columns.length,
                            );
                            return;
                          }
                          const next = {
                            ArrowDown: [r + 1, c],
                            ArrowLeft: [r, c - 1],
                            ArrowRight: [r, c + 1],
                            ArrowUp: [r - 1, c],
                          }[event.key];
                          if (!next) return;
                          event.preventDefault();
                          moveSelection(next[0], next[1], event.shiftKey);
                        }}
                        onPointerDown={(event) => {
                          selecting.current = true;
                          if (editingCell?.row !== r || editingCell.column !== c) {
                            setEditingCell(null);
                            event.currentTarget.focus();
                          }
                          setSelection(
                            event.shiftKey
                              ? { ...(selection ?? initialSelection), endRow: r, endColumn: c }
                              : { startRow: r, endRow: r, startColumn: c, endColumn: c },
                          );
                        }}
                        onPointerUp={() => {
                          selecting.current = false;
                        }}
                      >
                        <Cell
                          cell={cell}
                          result={results[r][c]}
                          options={options}
                          readOnly={readOnly}
                          editing={editingCell?.row === r && editingCell.column === c}
                          label={`${columnName(c)}${r + 1}${options.headerRow ? `: ${value.columns[c].label}` : ''}`}
                          onChange={(next) => attempt(() => updateCell(r, c, parseCell(next, options)))}
                          onFocus={() => {
                            if (!selecting.current)
                              setSelection({ startRow: r, endRow: r, startColumn: c, endColumn: c });
                          }}
                          onKeyDown={(event) => navigation(event, r, c)}
                          onStartEditing={() => setEditingCell({ row: r, column: c })}
                          onStopEditing={() => setEditingCell(null)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="advanced-table__footer">
            {value.rows.length} rows × {value.columns.length} columns
          </div>
        </>
      )}
    </div>
  );
}
