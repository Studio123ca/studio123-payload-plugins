'use client';

import { useMemo } from 'react';
import {
  columnResizingFeature,
  columnSizingFeature,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { createDataTable, MAX_DATA_TABLE_CELL_LENGTH } from '../shared/dataTable.js';
import type { DataTableRow, DataTableValue, ResolvedDataTableOptions } from '../shared/types.js';
import './styles.css';

const features = tableFeatures({
  columnSizingFeature,
  columnResizingFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});
const emptyRows: DataTableRow[] = [];

type Props = {
  value: DataTableValue | null;
  options: ResolvedDataTableOptions;
  maxHeight?: number | string;
  readOnly?: boolean;
  onChange: (value: DataTableValue | null) => void;
};

export function DataTableEditor({ value, options, maxHeight = 640, readOnly = false, onChange }: Props) {
  const columns = useMemo<ColumnDef<typeof features, DataTableRow>[]>(
    () =>
      value?.columns.map((column, index) => ({
        id: column.id,
        header: column.label,
        accessorFn: (row) => row.cells[index],
      })) ?? [],
    [value?.columns],
  );
  const columnSizing = useMemo(
    () =>
      Object.fromEntries(value?.columns.flatMap((column) => (column.width ? [[column.id, column.width]] : [])) ?? []),
    [value?.columns],
  );
  const replace = (next: DataTableValue | null) => {
    if (!readOnly) onChange(next);
  };
  const table = useTable({
    features,
    columns,
    data: value?.rows ?? emptyRows,
    getRowId: (row) => row.id,
    defaultColumn: { size: 180, minSize: 120, maxSize: 600 },
    state: { columnSizing },
    columnResizeMode: 'onEnd',
    enableColumnResizing: !readOnly,
    enableSorting: true,
    onColumnSizingChange: (update) => {
      if (!value || readOnly) return;
      const next = typeof update === 'function' ? update(columnSizing) : update;
      replace({
        ...value,
        columns: value.columns.map((column) => ({ ...column, width: next[column.id] ?? column.width })),
      });
    },
  });
  const updateCell = (rowID: string, columnIndex: number, cell: string) => {
    if (!value) return;
    replace({
      ...value,
      rows: value.rows.map((row) =>
        row.id === rowID
          ? { ...row, cells: row.cells.map((value, index) => (index === columnIndex ? cell : value)) }
          : row,
      ),
    });
  };
  const updateColumn = (columnID: string, label: string) => {
    if (!value) return;
    replace({
      ...value,
      columns: value.columns.map((column) => (column.id === columnID ? { ...column, label } : column)),
    });
  };
  const addRow = () => {
    if (!value || value.rows.length >= options.maxRows) return;
    replace({ ...value, rows: [...value.rows, { id: crypto.randomUUID(), cells: value.columns.map(() => '') }] });
  };
  const addColumn = () => {
    if (!value || value.columns.length >= options.maxColumns) return;
    replace({
      ...value,
      columns: [...value.columns, { id: crypto.randomUUID(), label: `Column ${value.columns.length + 1}` }],
      rows: value.rows.map((row) => ({ ...row, cells: [...row.cells, ''] })),
    });
  };
  if (!value) {
    return readOnly ? (
      <p className="data-table__empty">No data table has been created.</p>
    ) : (
      <button type="button" onClick={() => replace(createDataTable(options))}>
        Create data table
      </button>
    );
  }
  return (
    <div className="data-table">
      {!readOnly && (
        <div className="data-table__toolbar">
          <button type="button" disabled={value.rows.length >= options.maxRows} onClick={addRow}>
            Add row
          </button>
          <button type="button" disabled={value.columns.length >= options.maxColumns} onClick={addColumn}>
            Add column
          </button>
          <button type="button" onClick={() => replace(null)}>
            Clear
          </button>
        </div>
      )}
      <div className="data-table__scroll" style={{ maxHeight }}>
        <table aria-label="Data table" style={{ width: 48 + table.getTotalSize() }}>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                <th scope="col">#</th>
                {group.headers.map((header, index) => {
                  const column = value.columns[index];
                  return (
                    <th key={header.id} style={{ width: header.getSize() }}>
                      <div className="data-table__header">
                        {readOnly ? (
                          <span>{column.label}</span>
                        ) : (
                          <input
                            aria-label={`Column ${index + 1}`}
                            value={column.label}
                            maxLength={MAX_DATA_TABLE_CELL_LENGTH}
                            onChange={(event) => updateColumn(column.id, event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                          />
                        )}
                        <button
                          type="button"
                          className="data-table__sort"
                          onClick={header.column.getToggleSortingHandler()}
                          aria-label={`Sort ${column.label}`}
                        >
                          ↕
                        </button>
                        {!readOnly && (
                          <button
                            type="button"
                            className="data-table__remove"
                            aria-label={`Remove ${column.label}`}
                            disabled={value.columns.length === 1}
                            onClick={() =>
                              replace({
                                ...value,
                                columns: value.columns.filter((item) => item.id !== column.id),
                                rows: value.rows.map((row) => ({
                                  ...row,
                                  cells: row.cells.filter((_, cellIndex) => cellIndex !== index),
                                })),
                              })
                            }
                          >
                            ×
                          </button>
                        )}
                        {!readOnly && header.column.getCanResize() && (
                          <span
                            role="separator"
                            tabIndex={0}
                            aria-label={`Resize ${column.label}`}
                            className="data-table__resize"
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                          />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">
                  {row.getDisplayIndex() + 1}
                  {!readOnly && (
                    <button
                      type="button"
                      aria-label={`Remove row ${row.getDisplayIndex() + 1}`}
                      disabled={value.rows.length === 1}
                      onClick={() => replace({ ...value, rows: value.rows.filter((item) => item.id !== row.id) })}
                    >
                      ×
                    </button>
                  )}
                </th>
                {row.getAllCells().map((cell, index) => (
                  <td key={cell.id} style={{ width: cell.column.getSize() }}>
                    <textarea
                      aria-label={`${value.columns[index].label}, row ${row.getDisplayIndex() + 1}`}
                      value={cell.getValue<string>()}
                      readOnly={readOnly}
                      maxLength={MAX_DATA_TABLE_CELL_LENGTH}
                      rows={1}
                      onChange={(event) => updateCell(row.id, index, event.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
