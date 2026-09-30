'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Button } from '@payloadcms/ui';
import {
  columnResizingFeature,
  columnSizingFeature,
  createSortedRowModel,
  cellSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnSizingState,
  type columnResizingState,
  type ColumnDef,
} from '@tanstack/react-table';
import { DataTableMenubar } from './DataTableMenubar.js';
import { DataTableContextMenu, type DataTableContextTarget } from './DataTableContextMenu.js';
import { createDataTable, MAX_DATA_TABLE_CELL_LENGTH } from '../shared/dataTable.js';
import {
  dataTableBackgroundStyle,
  dataTableTextStyle,
  setDataTableBackground,
  setDataTableTextStyle,
  stickyRowCounts,
} from '../shared/appearance.js';
import { evaluateDataTable } from '../shared/formulas.js';
import { parseDelimited, stringifyDelimited } from '../shared/clipboard.js';
import { csvToDataTable, dataTableToCSV } from '../shared/csv.js';
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
  copyDataTableSelection,
  pasteDataTableCells,
} from '../shared/operations.js';
import type {
  DataTableCell,
  DataTableRow,
  DataTableTextStyle,
  DataTableValue,
  ResolvedDataTableOptions,
} from '../shared/types.js';
import { useDataTableController } from './useDataTableController.js';
import { useRowSizing } from './useRowSizing.js';
import './styles.css';

const features = tableFeatures({
  cellSelectionFeature,
  columnSizingFeature,
  columnResizingFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const MIN_COLUMN_WIDTH = 120;
const MAX_COLUMN_WIDTH = 600;

function persistedColumnWidth(width: unknown, fallback?: number) {
  const candidate = typeof width === 'number' && Number.isFinite(width) ? width : fallback;
  if (candidate === undefined || !Number.isFinite(candidate)) return undefined;
  return Math.round(Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, candidate)) * 100) / 100;
}
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
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ kind: 'row' | 'column'; index: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ kind: 'row' | 'column'; index: number } | null>(null);
  const [csvError, setCSVError] = useState<string | null>(null);
  const [virtualScrollTop, setVirtualScrollTop] = useState(0);
  const [stickyLayoutVersion, setStickyLayoutVersion] = useState(0);
  const pendingSelectionRef = useRef<{ rowID: string; columnID: string } | null>(null);
  const typingCellRef = useRef<{ rowID: string; columnID: string } | null>(null);
  const resizingColumnRef = useRef<string | null>(null);
  const tableRootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickyBodyNode = useRef<HTMLTableSectionElement | null>(null);
  const stickyBodyRef = useCallback((node: HTMLTableSectionElement | null) => {
    if (node === stickyBodyNode.current) return;
    stickyBodyNode.current = node;
    if (node) setStickyLayoutVersion((version) => version + 1);
  }, []);
  useRowSizing(scrollRef);
  useEffect(() => {
    const clearResizingColumn = () => {
      resizingColumnRef.current = null;
    };
    window.addEventListener('mouseup', clearResizingColumn);
    window.addEventListener('touchend', clearResizingColumn);
    window.addEventListener('touchcancel', clearResizingColumn);
    return () => {
      window.removeEventListener('mouseup', clearResizingColumn);
      window.removeEventListener('touchend', clearResizingColumn);
      window.removeEventListener('touchcancel', clearResizingColumn);
    };
  }, []);
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
  const initialColumnSizing = useMemo<ColumnSizingState>(
    () =>
      Object.fromEntries(value?.columns.flatMap((column) => (column.width ? [[column.id, column.width]] : [])) ?? []),
    [value?.columns],
  );
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(initialColumnSizing);
  const [columnResizing, setColumnResizing] = useState<columnResizingState>({
    columnSizingStart: [],
    deltaOffset: null,
    deltaPercentage: null,
    isResizingColumn: false,
    startOffset: null,
    startSize: null,
  });
  const columnSizingRef = useRef(columnSizing);
  useEffect(() => {
    setColumnSizing(initialColumnSizing);
    columnSizingRef.current = initialColumnSizing;
  }, [initialColumnSizing]);
  const table = useTable({
    features,
    columns,
    data: value?.rows ?? emptyRows,
    getRowId: (row) => row.id,
    defaultColumn: { size: 180, minSize: MIN_COLUMN_WIDTH, maxSize: MAX_COLUMN_WIDTH },
    state: { columnSizing, columnResizing },
    columnResizeMode: 'onChange',
    enableCellSelection: !readOnly,
    enableCellSelectionDrag: !readOnly,
    autoResetCellSelection: false,
    enableColumnResizing: !readOnly,
    enableSorting: true,
    onColumnSizingChange: (update) => {
      if (!value || readOnly) return;
      const next = typeof update === 'function' ? update(columnSizingRef.current) : update;
      columnSizingRef.current = next;
      setColumnSizing(next);
    },
    onColumnResizingChange: (update) => {
      const next = typeof update === 'function' ? update(columnResizing) : update;
      setColumnResizing(next);
      if (value && !readOnly && !next.isResizingColumn && columnResizing.isResizingColumn) {
        commit({
          ...value,
          columns: value.columns.map((column) => {
            const width = persistedColumnWidth(columnSizingRef.current[column.id], column.width);
            return width === undefined ? column : { ...column, width };
          }),
        });
      }
    },
  });
  useEffect(() => {
    const container =
      scrollRef.current ?? tableRootRef.current?.querySelector<HTMLDivElement>('.data-table__scroll') ?? null;
    if (!container) return;
    const root = container;
    let resizeObserver: ResizeObserver | null = null;
    function position() {
      const rows = Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody > tr'));
      const header = root.querySelector('thead');
      rows.forEach((row) => {
        row.style.removeProperty('--data-table-sticky-offset');
      });
      if (!sticky.top && !sticky.bottom) return;
      const topRows = rows.filter((row) => row.dataset.sticky === 'top');
      const bottomRows = rows.filter((row) => row.dataset.sticky === 'bottom');
      let topOffset = header?.getBoundingClientRect().height ?? 0;
      topRows.forEach((row) => {
        row.style.setProperty('--data-table-sticky-offset', `${topOffset}px`);
        topOffset += row.getBoundingClientRect().height;
      });
      let bottomOffset = 0;
      bottomRows.reverse().forEach((row) => {
        row.style.setProperty('--data-table-sticky-offset', `${bottomOffset}px`);
        bottomOffset += row.getBoundingClientRect().height;
      });
      resizeObserver?.disconnect();
      rows.forEach((row) => resizeObserver?.observe(row));
      if (header) resizeObserver?.observe(header);
    }
    resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(position);
    position();
    const mutationObserver = new MutationObserver(position);
    mutationObserver.observe(root, { childList: true, subtree: true });
    return () => {
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
    };
  }, [editingCell, sticky.bottom, sticky.top, stickyLayoutVersion, value?.rows.map((row) => row.id).join(':')]);
  const updateCell = (rowID: string, columnIndex: number, cell: string) => {
    if (!value) return;
    const nextCell: DataTableCell = options.formulas.enabled && cell.startsWith('=') ? { formula: cell } : cell;
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
  const activateColumnEditing = (columnID: string) => {
    if (!readOnly) setEditingColumn(columnID);
  };
  const addRow = () => {
    if (!value) return;
    commit(insertDataTableRow(value, value.rows.length, options));
  };
  const addColumn = () => {
    if (!value) return;
    commit(insertDataTableColumn(value, value.columns.length, options));
  };
  const addRows = (count: number) => {
    if (!value || count < 1) return;
    let next = value;
    for (let index = 0; index < count && next.rows.length < options.rows.max; index += 1) {
      next = insertDataTableRow(next, next.rows.length, options);
    }
    if (next !== value) commit(next);
  };
  const addColumns = (count: number) => {
    if (!value || count < 1) return;
    let next = value;
    for (let index = 0; index < count && next.columns.length < options.columns.max; index += 1) {
      next = insertDataTableColumn(next, next.columns.length, options);
    }
    if (next !== value) commit(next);
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
  const isCellSelected = (rowIndex: number, columnIndex: number) =>
    table
      .getCellSelectionBounds()
      .some(
        (selection) =>
          rowIndex >= selection.minRowIndex &&
          rowIndex <= selection.maxRowIndex &&
          columnIndex >= selection.minColumnIndex &&
          columnIndex <= selection.maxColumnIndex,
      );
  const isRowSelected = (rowIndex: number) =>
    Boolean(value?.columns.length) && value?.columns.every((_, columnIndex) => isCellSelected(rowIndex, columnIndex));
  const isColumnSelected = (columnIndex: number) =>
    Boolean(value?.rows.length) && value?.rows.every((_, rowIndex) => isCellSelected(rowIndex, columnIndex));
  const selectionLabel = table
    .getCellSelectionBounds()
    .map((bounds) => {
      const start = `${columnName(bounds.minColumnIndex)}${bounds.minRowIndex + 1}`;
      const end = `${columnName(bounds.maxColumnIndex)}${bounds.maxRowIndex + 1}`;
      return start === end ? start : `${start}:${end}`;
    })
    .join(', ');
  const copySelectionLabel = async () => {
    if (selectionLabel && navigator.clipboard?.writeText) await navigator.clipboard.writeText(selectionLabel);
  };
  const insertFormula = (functionName: string) => {
    if (!value || !options.formulas.enabled) return;
    const focused = table.getFocusedCell();
    if (!focused) return;
    const columnIndex = value.columns.findIndex((column) => column.id === focused.column.id);
    if (columnIndex < 0) return;
    updateCell(focused.row.id, columnIndex, `=${functionName}()`);
    setEditingCell({ rowID: focused.row.id, columnID: focused.column.id });
  };
  const selectRow = (rowIndex: number) => {
    if (!value || readOnly) return;
    const row = value.rows[rowIndex];
    const firstColumn = value.columns[0];
    const lastColumn = value.columns.at(-1);
    if (!row || !firstColumn || !lastColumn) return;
    table.selectCellRange({
      anchorRowId: row.id,
      anchorColumnId: firstColumn.id,
      focusRowId: row.id,
      focusColumnId: lastColumn.id,
    });
  };
  const selectColumn = (columnIndex: number) => {
    if (!value || readOnly) return;
    const firstRow = value.rows[0];
    const lastRow = value.rows.at(-1);
    const column = value.columns[columnIndex];
    if (!firstRow || !lastRow || !column) return;
    table.selectCellRange({
      anchorRowId: firstRow.id,
      anchorColumnId: column.id,
      focusRowId: lastRow.id,
      focusColumnId: column.id,
    });
  };
  const startDragging = (kind: 'row' | 'column', index: number, event: React.DragEvent<HTMLElement>) => {
    if (readOnly || resizingColumnRef.current || (event.target as HTMLElement).closest('input, [role="separator"]')) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${kind}:${index}`);
    setDragging({ kind, index });
    setDropTarget({ kind, index });
  };
  const updateDropTarget = (kind: 'row' | 'column', index: number, event: React.DragEvent<HTMLElement>) => {
    if (!dragging || dragging.kind !== kind) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTarget({ kind, index });
  };
  const dropReordered = (kind: 'row' | 'column', index: number, event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (!value || !dragging || dragging.kind !== kind || dragging.index === index) {
      setDragging(null);
      setDropTarget(null);
      return;
    }
    commit(
      kind === 'row'
        ? moveDataTableRow(value, dragging.index, index)
        : moveDataTableColumn(value, dragging.index, index),
    );
    setDragging(null);
    setDropTarget(null);
  };
  const stopDragging = () => {
    setDragging(null);
    setDropTarget(null);
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
    if (!value) return;
    const ranges = table.getCellSelectionBounds().map((bounds) =>
      copyDataTableSelection(value, {
        startRow: bounds.minRowIndex,
        endRow: bounds.maxRowIndex,
        startColumn: bounds.minColumnIndex,
        endColumn: bounds.maxColumnIndex,
      }),
    );
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
      const matrix = parseDelimited(text, '\t', options.rows.max, options.columns.max);
      commit(pasteDataTableCells(value, matrix, rowIndex, columnIndex, options));
    });
  };
  const cutSelection = () => {
    copySelection();
    clearSelection();
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importCSV = () => fileInputRef.current?.click();
  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setCSVError(null);
      commit(csvToDataTable(await file.text(), options));
    } catch (error) {
      setCSVError(error instanceof Error ? error.message : 'Could not import CSV.');
    }
  };
  const exportCSV = () => {
    if (!value) return;
    const blob = new Blob([dataTableToCSV(value)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data-table.csv';
    link.click();
    URL.revokeObjectURL(url);
  };
  const handleGridBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null;
    if (next?.closest('.data-table__context-content, .data-table__menu-content')) return;
    if (!next || !tableRootRef.current?.contains(next)) table.resetCellSelection(true);
  };
  const applyBackground = (key?: string) => {
    if (!value) return;
    let rows: string[] = [];
    let columns: string[] | undefined;
    if (contextTarget?.kind === 'row') {
      rows = value.rows[contextTarget.row] ? [value.rows[contextTarget.row].id] : [];
    } else if (contextTarget?.kind === 'column') {
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
  const applyTextStyle = (patch: DataTableTextStyle | undefined) => {
    if (!value || !options.textFormats.enabled || !table.getSelectedCellCount()) return;
    const bounds = table.getCellSelectionBounds();
    const rows = [
      ...new Set(
        bounds.flatMap((selection) =>
          value.rows.slice(selection.minRowIndex, selection.maxRowIndex + 1).map((row) => row.id),
        ),
      ),
    ];
    const columns = [
      ...new Set(
        bounds.flatMap((selection) =>
          value.columns.slice(selection.minColumnIndex, selection.maxColumnIndex + 1).map((column) => column.id),
        ),
      ),
    ];
    commit({ ...value, appearance: setDataTableTextStyle(value.appearance, rows, columns, patch) });
  };
  const toggleTextStyle = (key: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'wrap') => {
    const focused = table.getFocusedCell();
    if (!focused || !value) return;
    const current = dataTableTextStyle(value, focused.row.id, focused.column.id);
    applyTextStyle({ [key]: !current?.[key] });
  };
  const freezeRows = (top: number, bottom: number) => {
    if (!value) return;
    commit({ ...value, appearance: { ...value.appearance, stickyRows: { top, bottom } } });
  };
  const focusedRowIndex = table.getFocusedCell()?.row.index;
  const focusedCell = table.getFocusedCell();
  const activeTextStyle =
    value && focusedCell ? dataTableTextStyle(value, focusedCell.row.id, focusedCell.column.id) : undefined;
  const canFreezeRows = options.stickyRows.enabled && focusedRowIndex !== undefined;
  const freezeThroughFocusedRow = () => {
    if (!value || focusedRowIndex === undefined) return;
    freezeRows(focusedRowIndex + 1, 0);
  };
  const freezeFromFocusedRow = () => {
    if (!value || focusedRowIndex === undefined) return;
    freezeRows(0, value.rows.length - focusedRowIndex);
  };
  const focusActiveCell = () => {
    const focused = table.getFocusedCell();
    if (!focused || !scrollRef.current || !value) return;
    const columnIndex = value.columns.findIndex((column) => column.id === focused.column.id);
    if (columnIndex < 0) return;
    scrollRef.current
      .querySelector<HTMLElement>(`[data-context-cell="${focused.row.getDisplayIndex()}:${columnIndex}"]`)
      ?.focus({ preventScroll: true });
  };
  useEffect(() => {
    const pending = pendingSelectionRef.current;
    if (!pending || !value) return;
    if (
      !value.rows.some((row) => row.id === pending.rowID) ||
      !value.columns.some((column) => column.id === pending.columnID)
    ) {
      pendingSelectionRef.current = null;
      return;
    }
    table.selectCellRange({
      anchorRowId: pending.rowID,
      anchorColumnId: pending.columnID,
      focusRowId: pending.rowID,
      focusColumnId: pending.columnID,
    });
    pendingSelectionRef.current = null;
    focusActiveCell();
  }, [editingCell, table, value]);
  const ensureFocusedCell = (target: EventTarget | null) => {
    if (!value || !(target instanceof HTMLElement)) return;
    const focused = table.getFocusedCell();
    if (
      focused &&
      table.getRowModel().rows.some((row) => row.id === focused.row.id) &&
      value.columns.some((column) => column.id === focused.column.id)
    )
      return;
    const cell = target.closest<HTMLElement>('[data-context-cell]');
    const [rowIndex, columnIndex] = cell?.dataset.contextCell?.split(':').map(Number) ?? [];
    const row = table.getRowModel().rows.find((candidate) => candidate.getDisplayIndex() === rowIndex);
    const column = value.columns[columnIndex];
    if (row && column) table.setFocusedCell(row.id, column.id);
  };
  const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return;
    const direction = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    } as const;
    const selectedDirection = direction[event.key as keyof typeof direction];
    if (selectedDirection) {
      typingCellRef.current = null;
      event.preventDefault();
      event.stopPropagation();
      ensureFocusedCell(event.target);
      if (event.shiftKey) table.extendCellSelection(selectedDirection);
      else table.moveCellSelection(selectedDirection);
      focusActiveCell();
      return;
    }
    if (event.key === 'Tab') {
      typingCellRef.current = null;
      event.preventDefault();
      event.stopPropagation();
      ensureFocusedCell(event.target);
      const focused = table.getFocusedCell();
      if (!focused || !value?.columns.length || !value.rows.length) return;
      const rows = table.getRowModel().rows;
      const rowIndex = rows.findIndex((row) => row.id === focused.row.id);
      const columnIndex = value.columns.findIndex((column) => column.id === focused.column.id);
      if (rowIndex < 0 || columnIndex < 0) return;
      const step = event.shiftKey ? -1 : 1;
      let nextRowIndex = rowIndex;
      let nextColumnIndex = columnIndex + step;
      if (nextColumnIndex < 0) {
        nextRowIndex -= 1;
        nextColumnIndex = value.columns.length - 1;
      } else if (nextColumnIndex >= value.columns.length) {
        nextRowIndex += 1;
        nextColumnIndex = 0;
      }
      const nextRow = rows[nextRowIndex];
      const nextColumn = value.columns[nextColumnIndex];
      if (nextRow && nextColumn) table.setFocusedCell(nextRow.id, nextColumn.id);
      focusActiveCell();
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      typingCellRef.current = null;
      event.preventDefault();
      event.stopPropagation();
      ensureFocusedCell(event.target);
      const focused = table.getFocusedCell();
      const rows = table.getRowModel().rows;
      if (!focused || !rows.length || !value?.columns.length) return;
      const rowIndex =
        event.ctrlKey || event.metaKey
          ? event.key === 'Home'
            ? 0
            : rows.length - 1
          : rows.findIndex((row) => row.id === focused.row.id);
      const columnIndex =
        event.ctrlKey || event.metaKey
          ? event.key === 'Home'
            ? 0
            : value.columns.length - 1
          : event.key === 'Home'
            ? 0
            : value.columns.length - 1;
      const row = rows[rowIndex];
      const column = value.columns[columnIndex];
      if (row && column) table.setFocusedCell(row.id, column.id);
      focusActiveCell();
      return;
    }
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      typingCellRef.current = null;
      event.preventDefault();
      event.stopPropagation();
      ensureFocusedCell(event.target);
      const pageSize = Math.max(1, Math.floor((scrollRef.current?.clientHeight ?? 0) / 43) - 1);
      const pageDirection = event.key === 'PageUp' ? 'up' : 'down';
      for (let index = 0; index < pageSize; index += 1) {
        if (event.shiftKey) table.extendCellSelection(pageDirection);
        else table.moveCellSelection(pageDirection);
      }
      focusActiveCell();
      return;
    }
    const modifier = event.metaKey || event.ctrlKey;
    if (modifier && event.key.toLowerCase() === 'a') {
      typingCellRef.current = null;
      event.preventDefault();
      event.stopPropagation();
      table.selectAllCells();
      focusActiveCell();
      return;
    }
    if (!modifier && (event.key === 'Backspace' || event.key === 'Delete') && table.getSelectedCellCount()) {
      typingCellRef.current = null;
      event.preventDefault();
      event.stopPropagation();
      clearSelection();
      return;
    }
    if (!modifier) return;
    const key = event.key.toLowerCase();
    if (options.textFormats.enabled && table.getSelectedCellCount()) {
      if (key === 'b' && options.textFormats.bold) {
        event.preventDefault();
        event.stopPropagation();
        toggleTextStyle('bold');
        return;
      }
      if (key === 'i' && options.textFormats.italic) {
        event.preventDefault();
        event.stopPropagation();
        toggleTextStyle('italic');
        return;
      }
      if (key === 'u' && options.textFormats.underline) {
        event.preventDefault();
        event.stopPropagation();
        toggleTextStyle('underline');
        return;
      }
      if (key === 'x' && event.shiftKey && options.textFormats.strikethrough) {
        event.preventDefault();
        event.stopPropagation();
        toggleTextStyle('strikethrough');
        return;
      }
      if (event.shiftKey && options.textFormats.alignment && ['l', 'e', 'r'].includes(key)) {
        event.preventDefault();
        event.stopPropagation();
        applyTextStyle({ align: key === 'l' ? 'left' : key === 'e' ? 'center' : 'right' });
        return;
      }
    }
    if (key === 'c' && table.getSelectedCellCount()) {
      event.preventDefault();
      event.stopPropagation();
      copySelection();
    } else if (key === 'v' && table.getFocusedCell()) {
      event.preventDefault();
      event.stopPropagation();
      pasteSelection();
    } else if (key === 'x' && table.getSelectedCellCount()) {
      event.preventDefault();
      event.stopPropagation();
      cutSelection();
    } else if (key === 'z') {
      event.preventDefault();
      event.stopPropagation();
      event.shiftKey ? redo() : undo();
    }
  };
  const allRows = value ? table.getRowModel().rows : [];
  const virtualizeRows = allRows.length > 200;
  const virtualRowHeight = 43;
  const virtualViewportHeight = typeof maxHeight === 'number' ? maxHeight : 640;
  const virtualOverscan = 8;
  const virtualStart = virtualizeRows
    ? Math.max(sticky.top, Math.floor(virtualScrollTop / virtualRowHeight) - virtualOverscan)
    : sticky.top;
  const virtualEnd = virtualizeRows
    ? Math.min(
        allRows.length - sticky.bottom,
        Math.ceil((virtualScrollTop + virtualViewportHeight) / virtualRowHeight) + virtualOverscan,
      )
    : allRows.length - sticky.bottom;
  const renderedRows = virtualizeRows
    ? [
        ...allRows.slice(0, sticky.top),
        ...allRows.slice(virtualStart, Math.max(virtualStart, virtualEnd)),
        ...allRows.slice(Math.max(allRows.length - sticky.bottom, 0)),
      ]
    : allRows;
  const virtualTopSpacer = virtualizeRows ? Math.max(0, virtualStart - sticky.top) * virtualRowHeight : 0;
  const virtualBottomSpacer = virtualizeRows
    ? Math.max(0, allRows.length - sticky.bottom - virtualEnd) * virtualRowHeight
    : 0;
  if (!value) {
    return readOnly ? (
      <p className="data-table__empty">No data table has been created.</p>
    ) : (
      <Button
        type="button"
        className="data-table__create-button"
        buttonStyle="primary"
        size="medium"
        margin={false}
        onClick={() => commit(createDataTable(options))}
      >
        Create Table
      </Button>
    );
  }
  return (
    <div ref={tableRootRef} className="data-table">
      {!readOnly && (
        <DataTableMenubar
          canAddRow={value.rows.length < options.rows.max}
          canAddColumn={value.columns.length < options.columns.max}
          canAddRows={value.rows.length < options.rows.max}
          canAddColumns={value.columns.length < options.columns.max}
          maxRowsToAdd={options.rows.max - value.rows.length}
          maxColumnsToAdd={options.columns.max - value.columns.length}
          onAddRow={addRow}
          onAddColumn={addColumn}
          onAddRows={addRows}
          onAddColumns={addColumns}
          onClear={() => commit(null)}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          canCopy={table.getSelectedCellCount() > 0}
          canPaste={table.getSelectedCellCount() > 0}
          canCut={table.getSelectedCellCount() > 0}
          onCopy={copySelection}
          onPaste={pasteSelection}
          onCut={cutSelection}
          onClearSelection={clearSelection}
          canFreezeRows={canFreezeRows}
          onFreezeThroughCurrentRow={freezeThroughFocusedRow}
          onFreezeFromCurrentRow={freezeFromFocusedRow}
          onUnfreezeRows={() => freezeRows(0, 0)}
          onImportCSV={importCSV}
          onExportCSV={exportCSV}
          formats={options.formats}
          textFormats={options.textFormats}
          activeTextStyle={activeTextStyle}
          hasSelection={table.getSelectedCellCount() > 0}
          formulasEnabled={options.formulas.enabled}
          onApplyBackground={applyBackground}
          onApplyTextStyle={applyTextStyle}
          onToggleTextStyle={toggleTextStyle}
          selectionLabel={selectionLabel}
          onCopySelection={copySelectionLabel}
          onInsertFormula={insertFormula}
        />
      )}
      <input
        ref={fileInputRef}
        className="data-table__file-input"
        type="file"
        accept=".csv,text/csv"
        aria-label="Import CSV"
        onChange={handleCSVImport}
      />
      {csvError && (
        <p className="data-table__csv-error" role="alert">
          {csvError}
        </p>
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
        onApplyTextStyle={applyTextStyle}
        onToggleTextStyle={toggleTextStyle}
        onFreezeRows={freezeRows}
        onSort={sortRows}
        hasSelection={table.getSelectedCellCount() > 0}
      >
        <div
          ref={scrollRef}
          className="data-table__scroll"
          style={{ maxHeight }}
          tabIndex={0}
          aria-label="Data table grid"
          onScroll={(event) => {
            if (virtualizeRows) setVirtualScrollTop(event.currentTarget.scrollTop);
          }}
          onContextMenu={handleContextMenu}
          onBlur={handleGridBlur}
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
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        data-context-column={index}
                        data-selected={isColumnSelected(index) || undefined}
                        data-drop-target={
                          dropTarget?.kind === 'column' && dropTarget.index === index ? true : undefined
                        }
                        draggable={!readOnly && editingColumn !== column.id}
                        tabIndex={0}
                        onDragStart={(event) => startDragging('column', index, event)}
                        onDragOver={(event) => updateDropTarget('column', index, event)}
                        onDrop={(event) => dropReordered('column', index, event)}
                        onDragEnd={stopDragging}
                        onClick={(event) => {
                          if ((event.target as HTMLElement).closest('input, [role="separator"]')) return;
                          selectColumn(index);
                        }}
                        onDoubleClick={() => activateColumnEditing(column.id)}
                        onKeyDown={(event) => {
                          if (event.target instanceof HTMLInputElement) return;
                          if (event.key === 'Tab') {
                            const nextIndex = index + (event.shiftKey ? -1 : 1);
                            const nextHeader =
                              nextIndex >= 0
                                ? tableRootRef.current?.querySelector<HTMLElement>(
                                    `[data-context-column="${nextIndex}"]`,
                                  )
                                : null;
                            if (nextHeader) {
                              event.preventDefault();
                              event.stopPropagation();
                              selectColumn(nextIndex);
                              nextHeader.focus();
                            }
                            return;
                          }
                          if (event.key === 'Enter' || event.key === 'F2') {
                            event.preventDefault();
                            activateColumnEditing(column.id);
                          }
                        }}
                      >
                        <div className="data-table__header">
                          <span className="data-table__column-letter" aria-hidden>
                            {columnName(index)}
                          </span>
                          {readOnly || editingColumn !== column.id ? (
                            <span>{column.label}</span>
                          ) : (
                            <input
                              aria-label={`Column ${index + 1}`}
                              value={column.label}
                              maxLength={MAX_DATA_TABLE_CELL_LENGTH}
                              autoFocus
                              onChange={(event) => updateColumn(column.id, event.target.value)}
                              onClick={(event) => event.stopPropagation()}
                              onBlur={() => setEditingColumn(null)}
                              onKeyDown={(event) => {
                                if (event.key === 'Tab') {
                                  const nextIndex = index + (event.shiftKey ? -1 : 1);
                                  const nextColumn = value.columns[nextIndex];
                                  if (nextColumn) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setEditingColumn(nextColumn.id);
                                  }
                                  return;
                                }
                                if (event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey)) {
                                  event.preventDefault();
                                  setEditingColumn(null);
                                }
                              }}
                            />
                          )}
                          {!readOnly && header.column.getCanResize() && (
                            <span
                              role="separator"
                              tabIndex={0}
                              aria-label={`Resize ${column.label}`}
                              className="data-table__resize"
                              onMouseDown={(event) => {
                                event.stopPropagation();
                                resizingColumnRef.current = column.id;
                                header.getResizeHandler()(event);
                              }}
                              onTouchStart={(event) => {
                                event.stopPropagation();
                                resizingColumnRef.current = column.id;
                                header.getResizeHandler()(event);
                              }}
                              onDragStart={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                            />
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody ref={stickyBodyRef}>
              {virtualTopSpacer > 0 && (
                <tr aria-hidden>
                  <td colSpan={value.columns.length + 1} style={{ height: virtualTopSpacer, padding: 0 }} />
                </tr>
              )}
              {renderedRows.map((row) => {
                const rowIndex = allRows.indexOf(row);
                const displayIndex = row.getDisplayIndex();
                const stickyPosition =
                  rowIndex < sticky.top ? 'top' : rowIndex >= allRows.length - sticky.bottom ? 'bottom' : undefined;
                const stickyOffset =
                  stickyPosition === 'top'
                    ? `${41 + rowIndex * 43}px`
                    : stickyPosition === 'bottom'
                      ? `${(allRows.length - rowIndex - 1) * 43}px`
                      : undefined;
                return (
                  <tr
                    key={row.id}
                    data-sticky={stickyPosition}
                    style={stickyOffset ? ({ '--data-table-sticky-offset': stickyOffset } as CSSProperties) : undefined}
                  >
                    <th
                      scope="row"
                      data-context-row={row.getDisplayIndex()}
                      data-selected={isRowSelected(row.index) || undefined}
                      data-drop-target={dropTarget?.kind === 'row' && dropTarget.index === row.index ? true : undefined}
                      draggable={!readOnly}
                      tabIndex={0}
                      onDragStart={(event) => startDragging('row', row.index, event)}
                      onDragOver={(event) => updateDropTarget('row', row.index, event)}
                      onDrop={(event) => dropReordered('row', row.index, event)}
                      onDragEnd={stopDragging}
                      onClick={() => selectRow(row.index)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Tab') return;
                        event.preventDefault();
                        event.stopPropagation();
                        const nextIndex = row.index + (event.shiftKey ? -1 : 1);
                        const nextHeader =
                          nextIndex >= 0
                            ? tableRootRef.current?.querySelector<HTMLElement>(`[data-context-row="${nextIndex}"]`)
                            : null;
                        if (nextHeader) {
                          selectRow(nextIndex);
                          nextHeader.focus();
                        }
                      }}
                    >
                      {row.getDisplayIndex() + 1}
                    </th>
                    {row.getAllCells().map((cell, index) => {
                      const rawCell = value.rows[row.index].cells[index];
                      const selectionEdges = cell.getSelectionEdges();
                      const background = dataTableBackgroundStyle(value, options, row.original.id, cell.column.id);
                      const textStyle = dataTableTextStyle(value, row.original.id, cell.column.id);
                      const isEditing =
                        editingCell?.rowID === row.original.id && editingCell.columnID === cell.column.id;
                      const activateEditing = () => {
                        if (readOnly) return;
                        setEditingCell({ rowID: row.original.id, columnID: cell.column.id });
                      };
                      return (
                        <td
                          key={cell.id}
                          style={{
                            width: cell.column.getSize(),
                            ...background,
                            fontWeight: textStyle?.bold ? 700 : undefined,
                            fontStyle: textStyle?.italic ? 'italic' : undefined,
                            textDecoration:
                              [textStyle?.underline ? 'underline' : '', textStyle?.strikethrough ? 'line-through' : '']
                                .filter(Boolean)
                                .join(' ') || undefined,
                            textAlign: textStyle?.align,
                            whiteSpace: textStyle?.wrap === false ? 'nowrap' : undefined,
                          }}
                          data-colored={background ? true : undefined}
                          data-context-cell={`${row.getDisplayIndex()}:${index}`}
                          data-selected={cell.getIsSelected() || undefined}
                          data-editing={isEditing || undefined}
                          data-selection-edge-top={selectionEdges.top || undefined}
                          data-selection-edge-right={selectionEdges.right || undefined}
                          data-selection-edge-bottom={selectionEdges.bottom || undefined}
                          data-selection-edge-left={selectionEdges.left || undefined}
                          tabIndex={cell.getTabIndex()}
                          aria-label={`${value.columns[index].label}, row ${row.getDisplayIndex() + 1}`}
                          onMouseDown={(event) => {
                            typingCellRef.current = null;
                            cell.getSelectionStartHandler()(event);
                          }}
                          onMouseEnter={cell.getSelectionExtendHandler()}
                          onDoubleClick={() => activateEditing()}
                          onKeyDown={(event) => {
                            if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.length === 1) {
                              event.preventDefault();
                              event.stopPropagation();
                              pendingSelectionRef.current = { rowID: row.original.id, columnID: cell.column.id };
                              table.selectCellRange({
                                anchorRowId: row.original.id,
                                anchorColumnId: cell.column.id,
                                focusRowId: row.original.id,
                                focusColumnId: cell.column.id,
                              });
                              const isContinuing =
                                typingCellRef.current?.rowID === row.original.id &&
                                typingCellRef.current.columnID === cell.column.id;
                              const currentValue = typeof rawCell === 'object' ? rawCell.formula : rawCell;
                              typingCellRef.current = { rowID: row.original.id, columnID: cell.column.id };
                              updateCell(
                                row.original.id,
                                index,
                                isContinuing ? `${currentValue}${event.key}` : event.key,
                              );
                              return;
                            }
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
                              onFocus={(event) => {
                                const end = event.currentTarget.value.length;
                                event.currentTarget.setSelectionRange(end, end);
                              }}
                              onBlur={() => setEditingCell(null)}
                              onChange={(event) => updateCell(row.original.id, index, event.target.value)}
                              onKeyDown={(event) => {
                                event.stopPropagation();
                                if (event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey)) {
                                  event.preventDefault();
                                  pendingSelectionRef.current = { rowID: row.original.id, columnID: cell.column.id };
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
                );
              })}
              {virtualBottomSpacer > 0 && (
                <tr aria-hidden>
                  <td colSpan={value.columns.length + 1} style={{ height: virtualBottomSpacer, padding: 0 }} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DataTableContextMenu>
    </div>
  );
}
