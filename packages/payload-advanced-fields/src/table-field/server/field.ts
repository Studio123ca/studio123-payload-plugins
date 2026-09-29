import type { ArrayField, JSONField, TextareaField } from 'payload';
import type {
  CSVTableFieldConfig,
  JSONTableFieldConfig,
  StructuredTableFieldConfig,
  TableField,
  TableFieldConfig,
} from '../shared/types.js';
import { resolveTableOptions, validateTable } from '../shared/table.js';
import { validateCSVTable } from '../shared/csv.js';
import { tableJSONSchema } from './schema.js';

export function tableField(config: StructuredTableFieldConfig): ArrayField;
export function tableField(config: CSVTableFieldConfig): TextareaField;
export function tableField(config?: JSONTableFieldConfig): JSONField;
export function tableField(config: TableFieldConfig): TableField;
export function tableField(config: TableFieldConfig = {}): TableField {
  if (config.mode === 'structured') {
    const { mode: _mode, columns, name = 'table', label = 'Table', admin, ...rest } = config;
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
        ...admin,
        components: {
          Field: { path: '@studio123/payload-advanced-fields/table/client', exportName: 'StructuredTableField' },
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
    name = 'table',
    label = 'Table',
    required = false,
    admin,
    validate,
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
  });
  const components = {
    Field: {
      path: '@studio123/payload-advanced-fields/table/client',
      exportName: 'TableField',
      clientProps: { options },
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
        const result = validateCSVTable(value, options, required);
        return result !== true ? result : customValidate ? customValidate(value, args) : true;
      },
      admin: { ...admin, components },
    } as TextareaField;
  }
  const customValidate = validate as JSONField['validate'];
  return {
    ...rest,
    name,
    label,
    required,
    type: 'json',
    jsonSchema: (rest as JSONTableFieldConfig).jsonSchema ?? tableJSONSchema(name, options, required),
    validate: (value, args) => {
      const result = validateTable(value, options, required);
      return result !== true ? result : customValidate ? customValidate(value, args) : true;
    },
    admin: { ...admin, components },
  } as JSONField;
}
