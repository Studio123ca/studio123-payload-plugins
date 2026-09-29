import type { JSONField } from 'payload';
import type { ResolvedTableOptions } from '../shared/types.js';
import { MAX_CELL_LENGTH, MAX_FORMULA_LENGTH } from '../shared/table.js';

// canary.37 intersects the JSON editor schema with FieldBase's transform array.
// The runtime explicitly supports this object shape for JSON fields.
export function tableJSONSchema(
  name: string,
  options: ResolvedTableOptions,
  required: boolean,
): Pick<NonNullable<JSONField['jsonSchema']>, 'uri' | 'fileMatch' | 'schema'> {
  const text = { type: 'string' as const, maxLength: MAX_CELL_LENGTH };
  const id = { type: 'string' as const, minLength: 1, maxLength: 100 };
  return {
    uri: `urn:studio123:table:${encodeURIComponent(name)}`,
    fileMatch: ['*'],
    schema: {
      type: required ? 'object' : ['object', 'null'],
      required: ['version', 'caption', 'headerRow', 'columns', 'rows'],
      additionalProperties: false,
      properties: {
        version: { type: 'number', enum: [1] },
        appearance: {
          type: 'object',
          additionalProperties: false,
          properties: {
            rows: { type: 'object', additionalProperties: { type: 'string', maxLength: 100 } },
            cells: {
              type: 'object',
              additionalProperties: { type: 'object', additionalProperties: { type: 'string', maxLength: 100 } },
            },
            stickyRows: {
              type: 'object',
              additionalProperties: false,
              required: ['top', 'bottom'],
              properties: {
                top: { type: 'integer', minimum: 0, maximum: 1000 },
                bottom: { type: 'integer', minimum: 0, maximum: 1000 },
              },
            },
          },
        },
        caption: text,
        headerRow: { type: 'boolean' },
        columns: {
          type: 'array',
          minItems: options.minColumns,
          maxItems: options.maxColumns,
          items: {
            type: 'object',
            required: ['id', 'label'],
            additionalProperties: false,
            properties: { id, label: text, width: { type: 'number', minimum: 100, maximum: 600 } },
          },
        },
        rows: {
          type: 'array',
          minItems: options.minRows,
          maxItems: options.maxRows,
          items: {
            type: 'object',
            required: ['id', 'cells'],
            additionalProperties: false,
            properties: {
              id,
              cells: {
                type: 'array',
                minItems: options.minColumns,
                maxItems: options.maxColumns,
                items:
                  options.mode === 'content'
                    ? text
                    : {
                        anyOf: [
                          text,
                          { type: ['number', 'boolean', 'null'] },
                          ...(options.formulas
                            ? [
                                {
                                  type: 'object' as const,
                                  required: ['formula'],
                                  additionalProperties: false,
                                  properties: {
                                    formula: { type: 'string' as const, pattern: '^=', maxLength: MAX_FORMULA_LENGTH },
                                  },
                                },
                              ]
                            : []),
                        ],
                      },
              },
            },
          },
        },
      },
    },
  };
}
