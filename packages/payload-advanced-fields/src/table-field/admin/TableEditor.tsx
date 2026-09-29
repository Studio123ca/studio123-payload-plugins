'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ResolvedTableOptions, TableCell, TableSelection, TableValue } from '../shared/types.js';
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
import { TableMenu } from './TableMenu.js';

type Props = {
  value: TableValue | null;
  onChange: (value: TableValue | null) => void;
  options: ResolvedTableOptions;
  readOnly?: boolean;
};
const initialSelection: TableSelection = { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 };

function Cell({
  cell,
  result,
  options,
  readOnly,
  label,
  onChange,
  onFocus,
  onKeyDown,
}: {
  cell: TableCell;
  result: string | number | boolean | null;
  options: ResolvedTableOptions;
  readOnly: boolean;
  label: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  return (
    <textarea
      aria-label={label}
      className="advanced-table__input"
      maxLength={typeof cell === 'object' && cell !== null ? 1024 : MAX_CELL_LENGTH}
      readOnly={readOnly}
      rows={1}
      title={typeof cell === 'object' && cell !== null ? `${cell.formula} → ${String(result ?? '')}` : undefined}
      value={focused ? draft : String(result ?? '')}
      onBlur={() => setFocused(false)}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(event.target.value);
      }}
      onFocus={() => {
        setDraft(editableCellInput(cell, options));
        setFocused(true);
        onFocus();
      }}
      onKeyDown={onKeyDown}
    />
  );
}

export function TableEditor({ value, onChange, options, readOnly = false }: Props) {
  const root = useRef<HTMLDivElement>(null);
  useRowSizing(root);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastValue = useRef(value);
  const current = useRef({ value, readOnly });
  current.current = { value, readOnly };
  const mounted = useRef(true);
  const selecting = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const history = useRef<{ undo: (TableValue | null)[]; redo: (TableValue | null)[] }>({ undo: [], redo: [] });
  const [revision, refresh] = useState(0);
  const [selection, setSelection] = useState(initialSelection);
  const [message, setMessage] = useState('');
  const [widths, setWidths] = useState<Record<string, number>>({});
  const columnWidth = (column: TableValue['columns'][number]) => widths[column.id] ?? column.width ?? 180;
  const results = useMemo(() => (value ? evaluateTable(value) : []), [value]);
  const bounds = selectionBounds(selection);
  // External form resets, locale changes and version restores start a new history.
  useEffect(() => {
    if (value !== lastValue.current) {
      history.current = { undo: [], redo: [] };
      lastValue.current = value;
      setSelection(initialSelection);
      setWidths({});
      refresh((n) => n + 1);
    }
  }, [value]);
  const commit = (next: TableValue | null) => {
    if (readOnly || next === value) return;
    if (next) next = { ...next, headerRow: options.headerRow };
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
    setSelection(initialSelection);
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
    selecting.current = true;
    root.current?.querySelector<HTMLTextAreaElement>(`[data-cell="${row}:${column}"] textarea`)?.focus();
    selecting.current = false;
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
    if (!value) return;
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
    else if (event.altKey && event.key.startsWith('Arrow')) {
      r += event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
      c += event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    } else if (event.key === 'Escape') {
      event.currentTarget.blur();
      return;
    } else return;
    event.preventDefault();
    if (r < 0 || c < 0 || r >= value.rows.length || c >= value.columns.length) return;
    setSelection(
      event.shiftKey && event.altKey
        ? { ...selection, endRow: r, endColumn: c }
        : { startRow: r, endRow: r, startColumn: c, endColumn: c },
    );
    focusCell(r, c);
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
      setSelection(initialSelection);
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
      <div className="advanced-table__toolbar" aria-label="Table actions">
        <TableMenu label="Table">
          {!readOnly && (
            <>
              {!value && (
                <button type="button" onClick={() => commit(createTable(options))}>
                  Create table
                </button>
              )}
              <button type="button" onClick={() => fileInput.current?.click()}>
                Import CSV
              </button>
              {value && (
                <button type="button" onClick={() => commit(null)}>
                  Clear table
                </button>
              )}
            </>
          )}
          {value && (
            <>
              <button type="button" onClick={exportCSV}>
                Export CSV
              </button>
            </>
          )}
        </TableMenu>
        <TableMenu label="Edit">
          {!readOnly && (
            <>
              <button type="button" disabled={!history.current.undo.length} onClick={() => travel('undo')}>
                Undo
              </button>
              <button type="button" disabled={!history.current.redo.length} onClick={() => travel('redo')}>
                Redo
              </button>
              {value && (
                <button type="button" onClick={clearSelection}>
                  Clear cells
                </button>
              )}
            </>
          )}
          {value && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (!navigator.clipboard?.writeText) {
                    setMessage('Clipboard unavailable. Select cells and use your browser’s Copy command.');
                    return;
                  }
                  void navigator.clipboard.writeText(stringifyDelimited(copyMatrix())).then(
                    () => setMessage('Selection copied.'),
                    () => setMessage('Clipboard unavailable. Select cells and use your browser’s Copy command.'),
                  );
                }}
              >
                Copy cells
              </button>
            </>
          )}
        </TableMenu>
        {!readOnly && value && (
          <TableMenu label="Insert">
            <button
              type="button"
              disabled={value.rows.length >= options.maxRows}
              onClick={() =>
                commit({
                  ...value,
                  rows: [...value.rows, { id: createTableID(), cells: value.columns.map(() => '') }],
                })
              }
            >
              Add row
            </button>
            <button
              type="button"
              disabled={value.columns.length >= options.maxColumns}
              onClick={() =>
                commit({
                  ...value,
                  columns: [...value.columns, { id: createTableID(), label: `Column ${value.columns.length + 1}` }],
                  rows: value.rows.map((row) => ({ ...row, cells: [...row.cells, ''] })),
                })
              }
            >
              Add column
            </button>
          </TableMenu>
        )}
        {value && (
          <TableMenu label="View">
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
          </TableMenu>
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
          <p className="advanced-table__help">
            Tab and Enter move between cells. Alt+Enter adds a line break. Shift-click selects a rectangle;
            Alt+Shift+Arrow extends it.
            {options.formulas
              ? ' Formulas use body-cell addresses (A1, B2). References follow positions when rows or columns move.'
              : ''}
          </p>
          <div
            className="advanced-table__scroll"
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
                    <th scope="col" key={column.id} style={{ width: columnWidth(column) }}>
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
                          <TableMenu compact label={`Column ${columnName(c)} actions`}>
                            <button
                              type="button"
                              disabled={c === 0}
                              onClick={() => {
                                commit(moveColumn(value, c, c - 1));
                                setSelection(initialSelection);
                              }}
                            >
                              Move left
                            </button>
                            <button
                              type="button"
                              disabled={c === value.columns.length - 1}
                              onClick={() => {
                                commit(moveColumn(value, c, c + 1));
                                setSelection(initialSelection);
                              }}
                            >
                              Move right
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
                                setSelection(initialSelection);
                              }}
                            >
                              Delete column
                            </button>
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
                    <th scope="row">
                      <div className="advanced-table__row-heading">
                        <span>{r + 1}</span>
                        {!readOnly && (
                          <TableMenu compact label={`Row ${r + 1} actions`}>
                            <button
                              type="button"
                              disabled={r === 0}
                              onClick={() => {
                                commit({ ...value, rows: moveItem(value.rows, r, r - 1) });
                                setSelection(initialSelection);
                              }}
                            >
                              Move up
                            </button>
                            <button
                              type="button"
                              disabled={r === value.rows.length - 1}
                              onClick={() => {
                                commit({ ...value, rows: moveItem(value.rows, r, r + 1) });
                                setSelection(initialSelection);
                              }}
                            >
                              Move down
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
                            <button
                              type="button"
                              disabled={value.rows.length <= options.minRows}
                              onClick={() => {
                                commit({ ...value, rows: value.rows.filter((_, i) => i !== r) });
                                setSelection(initialSelection);
                              }}
                            >
                              Delete row
                            </button>
                          </TableMenu>
                        )}
                      </div>
                    </th>
                    {row.cells.map((cell, c) => (
                      <td
                        key={value.columns[c].id}
                        data-cell={`${r}:${c}`}
                        data-selected={
                          (r >= bounds.top && r <= bounds.bottom && c >= bounds.left && c <= bounds.right) || undefined
                        }
                        onPointerDown={(event) => {
                          selecting.current = true;
                          setSelection(
                            event.shiftKey
                              ? { ...selection, endRow: r, endColumn: c }
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
                          label={`${columnName(c)}${r + 1}${options.headerRow ? `: ${value.columns[c].label}` : ''}`}
                          onChange={(next) => attempt(() => updateCell(r, c, parseCell(next, options)))}
                          onFocus={() => {
                            if (!selecting.current)
                              setSelection({ startRow: r, endRow: r, startColumn: c, endColumn: c });
                          }}
                          onKeyDown={(event) => navigation(event, r, c)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="advanced-table__footer">
            {value.rows.length} rows × {value.columns.length} columns · {options.storage.toUpperCase()} storage
          </div>
        </>
      )}
    </div>
  );
}
