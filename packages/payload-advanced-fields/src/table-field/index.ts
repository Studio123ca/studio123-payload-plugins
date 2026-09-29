export { tableField } from './server/field.js';
export { evaluateTable } from './shared/formulas.js';
export type { TableResult } from './shared/formulas.js';
export { csvToTable, tableToCSV } from './shared/csv.js';
export { createTable, resolveTableOptions, validateTable } from './shared/table.js';
export type {
  CSVTableFieldConfig,
  JSONTableFieldConfig,
  StructuredTableFieldConfig,
  TableCell,
  TableColumn,
  TableField,
  TableFieldConfig,
  TableOptions,
  TableValue,
} from './shared/types.js';
