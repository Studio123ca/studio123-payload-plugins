export { dataTableField } from './server/field.js';
export {
  createDataTable,
  normalizeDataTableValue,
  resolveDataTableOptions,
  validateDataTable,
  isSafeDataTableURL,
} from './shared/dataTable.js';
export { evaluateDataTable } from './shared/formulas.js';
export {
  createDataTableStorageManifest,
  hydrateDataTableStorageManifest,
  isDataTableStorageManifest,
  paginateDataTableRows,
} from './shared/storage.js';
export type { DataTableRowPage, DataTableRowRecord, DataTableStorageManifest } from './shared/storage.js';
export { csvToDataTable, dataTableToCSV } from './shared/csv.js';
export {
  clearDataTableSelection,
  copyDataTableSelection,
  createDataTableID,
  deleteDataTableColumn,
  deleteDataTableRow,
  duplicateDataTableColumn,
  duplicateDataTableRow,
  insertDataTableColumn,
  insertDataTableRow,
  moveDataTableColumn,
  moveDataTableRow,
  selectionBounds,
} from './shared/operations.js';
export type {
  DataTableAppearance,
  DataTableCell,
  DataTableResponseCell,
  DataTableStorageOptions,
  DataTableColumn,
  DataTableDimensionOptions,
  DataTableTextStyle,
  DataTableTextFormats,
  ResolvedDataTableTextFormats,
  DataTableFieldConfig,
  DataTableLink,
  DataTableFormat,
  DataTableOptions,
  DataTablePaletteEntry,
  DataTableRow,
  DataTableThemeColor,
  DataTableValue,
  ResolvedDataTableDimensionOptions,
  ResolvedDataTableOptions,
  ResolvedDataTableStorageOptions,
} from './shared/types.js';
