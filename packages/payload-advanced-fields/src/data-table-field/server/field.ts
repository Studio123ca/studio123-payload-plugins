import type { JSONField } from 'payload';
import { resolveDataTableOptions, validateDataTable } from '../shared/dataTable.js';
import { evaluateDataTable } from '../shared/formulas.js';
import type { DataTableFieldConfig, DataTableValue } from '../shared/types.js';

function columnName(index: number) {
  let name = '';
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26))
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  return name;
}

const validMaxHeight = (value: unknown): value is number | string =>
  (typeof value === 'number' && Number.isFinite(value) && value > 0) ||
  (typeof value === 'string' && /^(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|vh|dvh|svh|lvh|vw|vmin|vmax|%)$/.test(value));

/** Creates a JSON-backed Data Table field with a small, stable data contract. */
export function dataTableField(config: DataTableFieldConfig = {}): JSONField {
  const {
    initialColumns,
    initialRows,
    minColumns,
    minRows,
    maxColumns,
    maxRows,
    formulas,
    palette,
    stickyRows,
    name = 'dataTable',
    label = 'Data Table',
    admin,
    validate,
    ...rest
  } = config;
  const options = resolveDataTableOptions({
    initialColumns,
    initialRows,
    minColumns,
    minRows,
    maxColumns,
    maxRows,
    formulas,
    palette,
    stickyRows,
  });
  const { maxHeight = 640, ...nativeAdmin } = admin ?? {};
  if (!validMaxHeight(maxHeight)) throw new Error('admin.maxHeight must be a positive CSS length or pixel value.');
  const customValidate = validate as JSONField['validate'];
  const afterRead = ({ value }: { value?: unknown }) => {
    if (!value || typeof value !== 'object' || !Array.isArray((value as DataTableValue).rows)) return value;
    const table = value as DataTableValue;
    const results = options.computeFormulas ? evaluateDataTable(table) : undefined;
    return {
      ...table,
      columns: table.columns.map((column) => ({ ...column, columnId: column.id })),
      rows: table.rows.map((row, rowIndex) => ({
        ...row,
        rowId: row.id,
        cells: row.cells.map((cell, columnIndex) => ({
          cellId: `${columnName(columnIndex)}${rowIndex + 1}`,
          value: results?.[rowIndex]?.[columnIndex] ?? (typeof cell === 'object' ? cell.formula : cell),
          ...(typeof cell === 'object' ? { formula: cell.formula } : {}),
        })),
      })),
    };
  };
  return {
    ...rest,
    name,
    label,
    type: 'json',
    hooks: {
      ...config.hooks,
      afterRead: [afterRead, ...(config.hooks?.afterRead ?? [])],
    },
    validate: (value, args) => {
      const result = validateDataTable(value, options, Boolean(config.required));
      return result !== true ? result : customValidate ? customValidate(value, args) : true;
    },
    admin: {
      ...nativeAdmin,
      components: {
        Field: {
          path: '@studio123/payload-advanced-fields/data-table/client',
          exportName: 'DataTableField',
          clientProps: { options, maxHeight },
        },
        ...admin?.components,
      },
    },
  } as JSONField;
}
