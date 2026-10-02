import type { JSONField } from 'payload';
import { normalizeDataTableValue, resolveDataTableOptions, validateDataTable } from '../shared/dataTable.js';
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

const hasProperty = (value: unknown, property: string) =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value) && property in value);

function isEnrichedDataTableValue(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  const table = value as { columns?: unknown; rows?: unknown };
  if (!Array.isArray(table.columns) || !Array.isArray(table.rows)) return false;
  if (table.columns.some((column) => hasProperty(column, 'columnId'))) return true;
  return table.rows.some(
    (row) =>
      hasProperty(row, 'rowId') ||
      (row &&
        typeof row === 'object' &&
        Array.isArray(row.cells) &&
        row.cells.some((cell: unknown) => hasProperty(cell, 'value'))),
  );
}

/** Creates a JSON-backed Data Table field with a small, stable data contract. */
export function dataTableField(config: DataTableFieldConfig = {}): JSONField {
  const {
    columns,
    rows,
    formulas,
    apiResponse,
    formats,
    stickyRows,
    name = 'dataTable',
    label = 'Data Table',
    admin,
    validate,
    ...rest
  } = config;
  const options = resolveDataTableOptions({
    columns,
    rows,
    formulas,
    apiResponse,
    formats,
    stickyRows,
  });
  const { maxHeight = 640, ...nativeAdmin } = admin ?? {};
  if (!validMaxHeight(maxHeight)) throw new Error('admin.maxHeight must be a positive CSS length or pixel value.');
  const customValidate = validate as JSONField['validate'];
  const normalizeEnrichedValue = ({ value }: { value?: unknown }) =>
    isEnrichedDataTableValue(value) ? (normalizeDataTableValue(value) ?? value) : value;
  const afterRead = ({ value }: { value?: unknown }) => {
    if (!value || typeof value !== 'object' || !Array.isArray((value as DataTableValue).rows)) return value;
    const table = value as DataTableValue;
    if (!options.apiResponse.includeIds && !options.apiResponse.computeFormulas) return value;
    const results = options.apiResponse.computeFormulas ? evaluateDataTable(table) : undefined;
    return {
      ...table,
      columns: options.apiResponse.includeIds
        ? table.columns.map((column) => ({ ...column, columnId: column.id }))
        : table.columns,
      rows: table.rows.map((row, rowIndex) => ({
        ...row,
        ...(options.apiResponse.includeIds ? { rowId: row.id } : {}),
        ...(options.apiResponse.computeFormulas || options.apiResponse.includeIds
          ? {
              cells: row.cells.map((cell, columnIndex) => ({
                ...(options.apiResponse.includeIds ? { cellId: `${columnName(columnIndex)}${rowIndex + 1}` } : {}),
                value: results?.[rowIndex]?.[columnIndex] ?? (typeof cell === 'object' ? cell.formula : cell),
                ...(typeof cell === 'object' ? { formula: cell.formula } : {}),
              })),
            }
          : {}),
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
      beforeValidate: [normalizeEnrichedValue, ...(config.hooks?.beforeValidate ?? [])],
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
