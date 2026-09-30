import type { JSONField } from 'payload';
import { resolveDataTableOptions, validateDataTable } from '../shared/dataTable.js';
import type { DataTableFieldConfig } from '../shared/types.js';

const validMaxHeight = (value: unknown): value is number | string =>
  (typeof value === 'number' && Number.isFinite(value) && value > 0) ||
  (typeof value === 'string' && /^(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|vh|dvh|svh|lvh|vw|vmin|vmax|%)$/.test(value));

/** Creates a JSON-backed Data Table field with a small, stable data contract. */
export function dataTableField(config: DataTableFieldConfig = {}): JSONField {
  const {
    initialColumns,
    initialRows,
    maxColumns,
    maxRows,
    name = 'dataTable',
    label = 'Data Table',
    admin,
    validate,
    ...rest
  } = config;
  const options = resolveDataTableOptions({ initialColumns, initialRows, maxColumns, maxRows });
  const { maxHeight = 640, ...nativeAdmin } = admin ?? {};
  if (!validMaxHeight(maxHeight)) throw new Error('admin.maxHeight must be a positive CSS length or pixel value.');
  const customValidate = validate as JSONField['validate'];
  return {
    ...rest,
    name,
    label,
    type: 'json',
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
