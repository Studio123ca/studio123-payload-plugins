import type { DataTableRow, DataTableValue } from './types.js';

export type DataTableRowRecord = {
  id?: string;
  parentCollection: string;
  parentID: string;
  fieldPath: string;
  rowID: string;
  position: number;
  cells: DataTableRow['cells'];
};

export type DataTableStorageManifest = Omit<DataTableValue, 'rows'> & {
  storage: { mode: 'rows'; rowCount: number };
  rows: [];
};

export type DataTableRowPage = {
  rows: DataTableRow[];
  page: number;
  limit: number;
  totalRows: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export function paginateDataTableRows(rows: DataTableRow[], page = 1, limit = 50): DataTableRowPage {
  const safeLimit = Number.isSafeInteger(limit) && limit > 0 ? limit : 50;
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / safeLimit));
  const safePage = Number.isSafeInteger(page) && page > 0 ? Math.min(page, totalPages) : 1;
  return {
    rows: rows.slice((safePage - 1) * safeLimit, safePage * safeLimit),
    page: safePage,
    limit: safeLimit,
    totalRows,
    totalPages,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages,
  };
}

export function createDataTableStorageManifest(value: DataTableValue): DataTableStorageManifest {
  return {
    version: 1,
    ...(value.headerRow === undefined ? {} : { headerRow: value.headerRow }),
    ...(value.caption === undefined ? {} : { caption: value.caption }),
    ...(value.appearance === undefined ? {} : { appearance: value.appearance }),
    columns: value.columns,
    rows: [],
    storage: { mode: 'rows', rowCount: value.rows.length },
  };
}

export function isDataTableStorageManifest(value: unknown): value is DataTableStorageManifest {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DataTableStorageManifest>;
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.columns) &&
    Array.isArray(candidate.rows) &&
    candidate.rows.length === 0 &&
    candidate.storage?.mode === 'rows' &&
    Number.isSafeInteger(candidate.storage.rowCount) &&
    candidate.storage.rowCount >= 0
  );
}

export function hydrateDataTableStorageManifest(
  manifest: DataTableStorageManifest,
  rows: DataTableRow[],
): DataTableValue {
  const { storage: _storage, ...table } = manifest;
  return { ...table, rows };
}
