export { dataTableField } from './server/field.js';
export {
  createDataTable,
  normalizeDataTableValue,
  resolveDataTableOptions,
  validateDataTable,
} from './shared/dataTable.js';
export { evaluateDataTable } from './shared/formulas.js';
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
  DataTableColumn,
  DataTableFieldConfig,
  DataTableOptions,
  DataTablePaletteEntry,
  DataTableRow,
  DataTableThemeColor,
  DataTableValue,
  ResolvedDataTableOptions,
} from './shared/types.js';
