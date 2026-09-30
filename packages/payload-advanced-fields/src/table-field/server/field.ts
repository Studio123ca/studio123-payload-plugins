import { getAdvancedFieldsConfig } from '../../config.js';
import { resolveTablePresentation } from '../shared/presentation.js';
import type { ArrayField, JSONField, TextareaField } from 'payload';
import type {
  CSVTableFieldConfig,
  JSONTableFieldConfig,
  StructuredTableFieldConfig,
  TableField,
  TableFieldConfig,
  TableValue,
} from '../shared/types.js';
import { columnName, resolveTableOptions, validateTable } from '../shared/table.js';
import { validateCSVTable } from '../shared/csv.js';
import { tableJSONSchema } from './schema.js';
import { evaluateTable } from '../shared/formulas.js';

export function tableField(config: StructuredTableFieldConfig): ArrayField;
export function tableField(config: CSVTableFieldConfig): TextareaField;
export function tableField(config?: JSONTableFieldConfig): JSONField;
export function tableField(config: TableFieldConfig): TableField;
export function tableField(config: TableFieldConfig = {}): TableField {
  const { maxHeight = 640, ...nativeAdmin } = config.admin ?? {};
  if (
    typeof maxHeight === 'number'
      ? !Number.isFinite(maxHeight) || maxHeight <= 0
      : typeof maxHeight !== 'string' ||
        !/^(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|vh|dvh|svh|lvh|vw|vmin|vmax|%)$/.test(maxHeight) ||
        parseFloat(maxHeight) <= 0
  )
    throw new Error('admin.maxHeight must be a positive pixel number or CSS length.');
  resolveTablePresentation({ palette: config.palette, stickyRows: config.stickyRows });
  if (config.mode === 'structured') {
    const { mode: _mode, palette, stickyRows, columns, name = 'table', label = 'Table', admin, ...rest } = config;
    if (!columns.length) throw new Error('Structured tables require at least one column.');
    const names = new Set<string>();
    for (const column of columns) {
      if (
        !['text', 'textarea', 'number', 'checkbox', 'select'].includes(column.type) ||
        !column.name ||
        ['id', '__proto__', 'prototype', 'constructor'].includes(column.name) ||
        names.has(column.name)
      )
        throw new Error('Structured columns must use supported field types and unique, non-reserved names.');
      names.add(column.name);
    }
    if (
      (config.maxRows !== undefined && (!Number.isSafeInteger(config.maxRows) || config.maxRows < 1)) ||
      (config.minRows !== undefined && (!Number.isSafeInteger(config.minRows) || config.minRows < 0)) ||
      (config.minRows ?? 0) > (config.maxRows ?? Infinity)
    )
      throw new Error('Invalid structured table row limits.');
    return {
      ...rest,
      name,
      label,
      type: 'array',
      fields: columns,
      admin: {
        ...nativeAdmin,
        components: {
          Field: {
            path: '@studio123/payload-advanced-fields/table/client',
            exportName: 'StructuredTableField',
            get clientProps() {
              return {
                presentation: resolveTablePresentation({ palette, stickyRows }, getAdvancedFieldsConfig().table),
                maxHeight,
              };
            },
          },
          ...admin?.components,
        },
      },
    };
  }
  const {
    mode,
    storage,
    initialRows,
    initialColumns,
    minRows,
    maxRows,
    minColumns,
    maxColumns,
    headerRow,
    caption,
    formulas,
    computeFormulas,
    palette,
    stickyRows,
    name = 'table',
    label = 'Table',
    required = false,
    admin,
    validate,
    hooks: suppliedHooks,
    ...rest
  } = config;
  const options = resolveTableOptions({
    mode,
    storage,
    initialRows,
    initialColumns,
    minRows,
    maxRows,
    minColumns,
    maxColumns,
    headerRow,
    caption,
    formulas,
    computeFormulas,
  });
  const resolvedOptions = () => ({
    ...options,
    ...resolveTablePresentation({ palette, stickyRows }, getAdvancedFieldsConfig().table),
  });
  const components = {
    Field: {
      path: '@studio123/payload-advanced-fields/table/client',
      exportName: 'TableField',
      get clientProps() {
        return { options: resolvedOptions(), maxHeight };
      },
    },
    ...admin?.components,
  };
  if (options.storage === 'csv') {
    const customValidate = validate as TextareaField['validate'];
    return {
      ...rest,
      name,
      label,
      required,
      type: 'textarea',
      validate: (value, args) => {
        const result = validateCSVTable(value, resolvedOptions(), required);
        return result !== true ? result : customValidate ? customValidate(value, args) : true;
      },
      hooks: suppliedHooks,
      admin: { ...nativeAdmin, components },
    } as TextareaField;
  }
  const customValidate = validate as JSONField['validate'];
  const cellIdsAfterRead = ({ value }: { value?: unknown }) => {
    if (!value || typeof value !== 'object' || !Array.isArray((value as TableValue).rows)) return value;
    const table = value as TableValue;
    const results = options.computeFormulas ? evaluateTable(table) : undefined;
    return {
      ...table,
      columns: table.columns.map((column) => ({ ...column, columnId: column.id })),
      rows: table.rows.map((row, rowIndex) => ({
        ...row,
        rowId: row.id,
        cells: row.cells.map((value, columnIndex) => ({
          cellId: `${columnName(columnIndex)}${rowIndex + 1}`,
          value: results?.[rowIndex]?.[columnIndex] ?? value,
          ...(typeof value === 'object' && value !== null && 'formula' in value ? { formula: value.formula } : {}),
        })),
      })),
    };
  };
  return {
    ...rest,
    name,
    label,
    required,
    type: 'json',
    jsonSchema: (rest as JSONTableFieldConfig).jsonSchema ?? tableJSONSchema(name, options, required),
    hooks: {
      ...suppliedHooks,
      afterRead: [cellIdsAfterRead, ...(suppliedHooks?.afterRead ?? [])],
    },
    validate: (value, args) => {
      const result = validateTable(value, resolvedOptions(), required);
      return result !== true ? result : customValidate ? customValidate(value, args) : true;
    },
    admin: { ...nativeAdmin, components },
  } as JSONField;
}
