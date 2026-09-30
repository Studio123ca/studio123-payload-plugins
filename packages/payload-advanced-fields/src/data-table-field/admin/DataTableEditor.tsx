'use client';

import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Button } from '@payloadcms/ui';
import {
  columnResizingFeature,
  columnSizingFeature,
  createSortedRowModel,
  cellSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { DataTableMenubar } from './DataTableMenubar.js';
import { DataTableContextMenu, type DataTableContextTarget } from './DataTableContextMenu.js';
import { createDataTable, MAX_DATA_TABLE_CELL_LENGTH } from '../shared/dataTable.js';
import { dataTableBackgroundStyle, setDataTableBackground, stickyRowCounts } from '../shared/appearance.js';
import { evaluateDataTable } from '../shared/formulas.js';
import { parseDelimited, stringifyDelimited } from '../shared/clipboard.js';
import {
  clearDataTableSelections,
  deleteDataTableColumn,
  deleteDataTableRow,
  duplicateDataTableColumn,
  duplicateDataTableRow,
  insertDataTableColumn,
  insertDataTableRow,
  moveDataTableColumn,
  moveDataTableRow,
  pasteDataTableCells,
} from '../shared/operations.js';
import type { DataTableCell, DataTableRow, DataTableValue, ResolvedDataTableOptions } from '../shared/types.js';
import { useDataTableController } from './useDataTableController.js';
import './styles.css';

const features = tableFeatures({
  cellSelectionFeature,
  columnSizingFeature,
  columnResizingFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});
const emptyRows: DataTableRow[] = [];

function columnName(index: number) {
  let name = '';
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

type Props = {
  value: DataTableValue | null;
  options: ResolvedDataTableOptions;
  maxHeight?: number | string;
  readOnly?: boolean;
  onChange: (value: DataTableValue | null) => void;
};

export function DataTableEditor({ value, options, maxHeight = 640, readOnly = false, onChange }: Props) {
  const { commit, undo, redo, canUndo, canRedo } = useDataTableController({
    value,
    readOnly,
    onChange,
  });
  const [contextTarget, setContextTarget] = useState<DataTableContextTarget | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowID: string; columnID: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => (value ? evaluateDataTable(value) : []), [value]);
  const sticky = useMemo(() => (value ? stickyRowCounts(value, options) : { top: 0, bottom: 0 }), [value, options]);
  const columns = useMemo<ColumnDef<typeof features, DataTableRow>[]>(
    () =>
      value?.columns.map((column, index) => ({
        id: column.id,
        header: column.label,
        accessorFn: (row) => {
          const cell = row.cells[index];
          return typeof cell === 'object' ? cell.formula : cell;
        },
      })) ?? [],
    [value?.columns],
  );
  const columnSizing = useMemo(
    () =>
      Object.fromEntries(value?.columns.flatMap((column) => (column.width ? [[column.id, column.width]] : [])) ?? []),
    [value?.columns],
  );
  const table = useTable({
    features,
    columns,
    data: value?.rows ?? emptyRows,
    getRowId: (row) => row.id,
    defaultColumn: { size: 180, minSize: 120, maxSize: 600 },
    state: { columnSizing },
    columnResizeMode: 'onEnd',
    enableCellSelection: !readOnly,
    enableCellSelectionDrag: !readOnly,
    enableColumnResizing: !readOnly,
    enableSorting: true,
    onColumnSizingChange: (update) => {
      if (!value || readOnly) return;
      const next = typeof update === 'function' ? update(columnSizing) : update;
      commit({
        ...value,
        columns: value.columns.map((column) => ({ ...column, width: next[column.id] ?? column.width })),
      });
    },
  });
  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container || (!sticky.top && !sticky.bottom)) return;
    const rows = Array.from(container.querySelectorAll<HTMLTableRowElement>('tbody > tr'));
    const header = container.querySelector('thead');
    const position = () => {
      let topOffset = header?.getBoundingClientRect().height ?? 0;
      rows.forEach((row, index) => {
        row.removeAttribute('data-sticky');
        row.style.removeProperty('--data-table-sticky-offset');
        if (index < sticky.top) {
          row.dataset.sticky = 'top';
          row.style.setProperty('--data-table-sticky-offset', `${topOffset}px`);
          topOffset += row.getBoundingClientRect().height;
        }
      });
      let bottomOffset = 0;
      for (let index = rows.length - 1; index >= rows.length - sticky.bottom; index -= 1) {
        const row = rows[index];
        if (!row) continue;
        row.dataset.sticky = 'bottom';
        row.style.setProperty('--data-table-sticky-offset', `${bottomOffset}px`);
        bottomOffset += row.getBoundingClientRect().height;
      }
    };
    position();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(position);
    rows.forEach((row) => observer.observe(row));
    if (header) observer.observe(header);
    return () => observer.disconnect();
  }, [sticky.bottom, sticky.top, value?.rows.length, editingCell]);
  const updateCell = (rowID: string, columnIndex: number, cell: string) => {
    if (!value) return;
    const nextCell: DataTableCell = options.formulas && cell.startsWith('=') ? { formula: cell } : cell;
    commit({
      ...value,
      rows: value.rows.map((row) =>
        row.id === rowID
          ? { ...row, cells: row.cells.map((value, index) => (index === columnIndex ? nextCell : value)) }
          : row,
      ),
    });
  };
  const updateColumn = (columnID: string, label: string) => {
    if (!value) return;
    commit({
      ...value,
      columns: value.columns.map((column) => (column.id === columnID ? { ...column, label } : column)),
    });
  };
  const addRow = () => {
    if (!value) return;
    commit(insertDataTableRow(value, value.rows.length, options));
  };
  const addColumn = () => {
    if (!value) return;
    commit(insertDataTableColumn(value, value.columns.length, options));
  };
  const sortRows = (direction: 'ascending' | 'descending', columnIndex: number) => {
    if (!value) return;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const rows = [...value.rows].sort((left, right) => {
      const leftValue = left.cells[columnIndex];
      const rightValue = right.cells[columnIndex];
      const comparison = collator.compare(
        typeof leftValue === 'object' ? leftValue.formula : leftValue,
        typeof rightValue === 'object' ? rightValue.formula : rightValue,
      );
      return direction === 'ascending' ? comparison : -comparison;
    });
    commit({ ...value, rows });
  };
  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const cell = target?.closest<HTMLElement>('[data-context-cell]');
    const row = target?.closest<HTMLElement>('[data-context-row]');
    const column = target?.closest<HTMLElement>('[data-context-column]');
    if (cell) {
      const [rowIndex, columnIndex] = cell.dataset.contextCell?.split(':').map(Number) ?? [];
      if (Number.isInteger(rowIndex) && Number.isInteger(columnIndex)) {
        const row = value?.rows[rowIndex];
        const column = value?.columns[columnIndex];
        if (row && column)
          table.selectCellRange({
            anchorRowId: row.id,
            anchorColumnId: column.id,
            focusRowId: row.id,
            focusColumnId: column.id,
          });
        setContextTarget({ kind: 'cell', row: rowIndex, column: columnIndex });
      }
    } else if (row) {
      const rowIndex = Number(row.dataset.contextRow);
      if (Number.isInteger(rowIndex)) {
        const targetRow = value?.rows[rowIndex];
        const firstColumn = value?.columns[0];
        const lastColumn = value?.columns.at(-1);
        if (targetRow && firstColumn && lastColumn)
          table.selectCellRange({
            anchorRowId: targetRow.id,
            anchorColumnId: firstColumn.id,
            focusRowId: targetRow.id,
            focusColumnId: lastColumn.id,
          });
        setContextTarget({ kind: 'row', row: rowIndex });
      }
    } else if (column) {
      const columnIndex = Number(column.dataset.contextColumn);
      if (Number.isInteger(columnIndex)) {
        const firstRow = value?.rows[0];
        const lastRow = value?.rows.at(-1);
        const targetColumn = value?.columns[columnIndex];
        if (firstRow && lastRow && targetColumn)
          table.selectCellRange({
            anchorRowId: firstRow.id,
            anchorColumnId: targetColumn.id,
            focusRowId: lastRow.id,
            focusColumnId: targetColumn.id,
          });
        setContextTarget({ kind: 'column', column: columnIndex });
      }
    } else {
      setContextTarget({ kind: 'table' });
    }
  };
  const clearSelection = () => {
    if (!value) return;
    const selections = table.getCellSelectionBounds().map((selection) => ({
      startRow: selection.minRowIndex,
      endRow: selection.maxRowIndex,
      startColumn: selection.minColumnIndex,
      endColumn: selection.maxColumnIndex,
    }));
    commit(clearDataTableSelections(value, selections));
  };
  const copySelection = () => {
    if (!navigator.clipboard?.writeText) return;
    const ranges = table.getSelectedCellRangesData() as string[][][];
    const rows = ranges.flatMap((range, index) => (index ? [[''], ...range.map((row) => row.map(String))] : range));
    if (rows.length) void navigator.clipboard.writeText(stringifyDelimited(rows));
  };
  const pasteSelection = () => {
    if (!value || !navigator.clipboard?.readText) return;
    const focused = table.getFocusedCell();
    const rowIndex = focused?.row.index;
    const columnIndex = focused ? value.columns.findIndex((column) => column.id === focused.column.id) : -1;
    if (rowIndex === undefined || columnIndex < 0) return;
    void navigator.clipboard.readText().then((text) => {
      const matrix = parseDelimited(text, '\t', options.maxRows, options.maxColumns);
      commit(pasteDataTableCells(value, matrix, rowIndex, columnIndex, options));
    });
  };
  const cutSelection = () => {
    copySelection();
    clearSelection();
  };
  const applyBackground = (key?: string) => {
    if (!value || !contextTarget || contextTarget.kind === 'table') return;
    let rows: string[] = [];
    let columns: string[] | undefined;
    if (contextTarget.kind === 'row') {
      rows = value.rows[contextTarget.row] ? [value.rows[contextTarget.row].id] : [];
    } else if (contextTarget.kind === 'column') {
      rows = value.rows.map((row) => row.id);
      columns = value.columns[contextTarget.column] ? [value.columns[contextTarget.column].id] : [];
    } else {
      const bounds = table.getCellSelectionBounds();
      bounds.forEach((bound) => {
        rows.push(...value.rows.slice(bound.minRowIndex, bound.maxRowIndex + 1).map((row) => row.id));
        const selectedColumns = value.columns
          .slice(bound.minColumnIndex, bound.maxColumnIndex + 1)
          .map((column) => column.id);
        columns = columns ? [...columns, ...selectedColumns] : selectedColumns;
      });
    }
    if (!rows.length || (columns && !columns.length)) return;
    commit({ ...value, appearance: setDataTableBackground(value.appearance, rows, columns, key) });
  };
  const freezeRows = (top: number, bottom: number) => {
    if (!value) return;
    commit({ ...value, appearance: { ...value.appearance, stickyRows: { top, bottom } } });
  };
  const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return;
    const modifier = event.metaKey || event.ctrlKey;
    if (!modifier && (event.key === 'Backspace' || event.key === 'Delete') && table.getSelectedCellCount()) {
      event.preventDefault();
      clearSelection();
      return;
    }
    if (!modifier) return;
    const key = event.key.toLowerCase();
    if (key === 'c' && table.getSelectedCellCount()) {
      event.preventDefault();
      copySelection();
    } else if (key === 'v' && table.getFocusedCell()) {
      event.preventDefault();
      pasteSelection();
    } else if (key === 'x' && table.getSelectedCellCount()) {
      event.preventDefault();
      cutSelection();
    } else if (key === 'z') {
      event.preventDefault();
      event.shiftKey ? redo() : undo();
    }
  };
  if (!value) {
    return readOnly ? (
      <p className="data-table__empty">No data table has been created.</p>
    ) : (
      <Button
        type="button"
        buttonStyle="primary"
        size="medium"
        margin={false}
        onClick={() => commit(createDataTable(options))}
      >
        Create data table
      </Button>
    );
  }
  return (
    <div className="data-table">
      {!readOnly && (
        <DataTableMenubar
          canAddRow={value.rows.length < options.maxRows}
          canAddColumn={value.columns.length < options.maxColumns}
          onAddRow={addRow}
          onAddColumn={addColumn}
          onClear={() => commit(null)}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          canCopy={table.getSelectedCellCount() > 0}
          canPaste={Boolean(table.getFocusedCell())}
          canCut={table.getSelectedCellCount() > 0}
          onCopy={copySelection}
          onPaste={pasteSelection}
          onCut={cutSelection}
          onClearSelection={clearSelection}
        />
      )}
      <DataTableContextMenu
        target={contextTarget}
        disabled={readOnly}
        value={value}
        options={options}
        onTargetChange={setContextTarget}
        onAddRow={addRow}
        onAddColumn={addColumn}
        onInsertRow={(index) => commit(insertDataTableRow(value, index, options))}
        onInsertColumn={(index) => commit(insertDataTableColumn(value, index, options))}
        onDuplicateRow={(index) => commit(duplicateDataTableRow(value, index, options))}
        onDuplicateColumn={(index) => commit(duplicateDataTableColumn(value, index, options))}
        onMoveRow={(from, to) => commit(moveDataTableRow(value, from, to))}
        onMoveColumn={(from, to) => commit(moveDataTableColumn(value, from, to))}
        onDeleteRow={(index) => commit(deleteDataTableRow(value, index, options))}
        onDeleteColumn={(index) => commit(deleteDataTableColumn(value, index, options))}
        onClearSelection={clearSelection}
        onCopy={copySelection}
        onPaste={pasteSelection}
        onCut={cutSelection}
        onApplyBackground={applyBackground}
        onFreezeRows={freezeRows}
        onSort={sortRows}
      >
        <div
          ref={scrollRef}
          className="data-table__scroll"
          style={{ maxHeight }}
          onContextMenu={handleContextMenu}
          onKeyDown={handleGridKeyDown}
        >
          <table aria-label="Data table" style={{ width: 48 + table.getTotalSize() }}>
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  <th scope="col">#</th>
                  {group.headers.map((header, index) => {
                    const column = value.columns[index];
                    return (
                      <th key={header.id} style={{ width: header.getSize() }} data-context-column={index} tabIndex={0}>
                        <div className="data-table__header">
                          <span className="data-table__column-letter" aria-hidden>
                            {columnName(index)}
                          </span>
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
                  <th scope="row" data-context-row={row.getDisplayIndex()} tabIndex={0}>
                    {row.getDisplayIndex() + 1}
                  </th>
                  {row.getAllCells().map((cell, index) => {
                    const rawCell = value.rows[row.index].cells[index];
                    const selectionEdges = cell.getSelectionEdges();
                    const background = dataTableBackgroundStyle(value, options, row.original.id, cell.column.id);
                    const isEditing = editingCell?.rowID === row.original.id && editingCell.columnID === cell.column.id;
                    const activateEditing = () => {
                      if (!readOnly) setEditingCell({ rowID: row.original.id, columnID: cell.column.id });
                    };
                    return (
                      <td
                        key={cell.id}
                        style={{
                          width: cell.column.getSize(),
                          ...background,
                        }}
                        data-colored={background ? true : undefined}
                        data-context-cell={`${row.getDisplayIndex()}:${index}`}
                        data-selected={cell.getIsSelected() || undefined}
                        data-selection-edge-top={selectionEdges.top || undefined}
                        data-selection-edge-right={selectionEdges.right || undefined}
                        data-selection-edge-bottom={selectionEdges.bottom || undefined}
                        data-selection-edge-left={selectionEdges.left || undefined}
                        tabIndex={cell.getTabIndex()}
                        aria-label={`${value.columns[index].label}, row ${row.getDisplayIndex() + 1}`}
                        onMouseDown={cell.getSelectionStartHandler()}
                        onMouseEnter={cell.getSelectionExtendHandler()}
                        onDoubleClick={activateEditing}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === 'F2') {
                            event.preventDefault();
                            activateEditing();
                          }
                        }}
                      >
                        {isEditing ? (
                          <textarea
                            aria-label={`Edit ${value.columns[index].label}, row ${row.getDisplayIndex() + 1}`}
                            autoFocus
                            value={typeof rawCell === 'object' ? rawCell.formula : rawCell}
                            maxLength={MAX_DATA_TABLE_CELL_LENGTH}
                            rows={1}
                            onBlur={() => setEditingCell(null)}
                            onChange={(event) => updateCell(row.original.id, index, event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey)) {
                                event.preventDefault();
                                setEditingCell(null);
                              }
                            }}
                          />
                        ) : (
                          <span className="data-table__cell-value">{String(results[row.index]?.[index] ?? '')}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataTableContextMenu>
    </div>
  );
}
