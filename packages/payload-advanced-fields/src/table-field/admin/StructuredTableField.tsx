'use client';

import { useCallback } from 'react';
import {
  FieldDescription,
  FieldError,
  FieldLabel,
  RenderCustomComponent,
  RenderFields,
  useConfig,
  useField,
  useForm,
  useLocale,
} from '@payloadcms/ui';
import type { ArrayFieldClientProps, Validate } from 'payload';
import './styles.css';

export function StructuredTableField({
  field,
  path: incomingPath,
  schemaPath: incomingSchemaPath,
  permissions,
  readOnly,
  validate,
}: ArrayFieldClientProps) {
  const {
    config: { localization },
  } = useConfig();
  const locale = useLocale();
  const allowsFallback = Boolean(localization && localization.fallback && locale?.code !== localization.defaultLocale);
  const validateRows: Validate = useCallback(
    (value, args) => {
      if (allowsFallback && value === null) return true;
      const length = Array.isArray(value) ? value.length : typeof value === 'number' ? value : 0;
      const minimum = field.minRows ?? (field.required ? 1 : 0);
      if (length < minimum) return `Use at least ${minimum} rows.`;
      if (field.maxRows !== undefined && length > field.maxRows) return `Use at most ${field.maxRows} rows.`;
      return validate
        ? validate(value, {
            ...args,
            minRows: field.minRows,
            maxRows: field.maxRows,
            required: field.required,
          } as Parameters<NonNullable<typeof validate>>[1])
        : true;
    },
    [allowsFallback, field.minRows, field.maxRows, field.required, validate],
  );
  const {
    path,
    rows = [],
    disabled,
    showError,
    customComponents: { Label, Description, Error: CustomError, BeforeInput, AfterInput } = {},
  } = useField<number>({
    potentiallyStalePath: incomingPath,
    hasRows: true,
    validate: validateRows,
  });
  const { addFieldRow, removeFieldRow, moveFieldRow, dispatchFields, setModified } = useForm();
  const schemaPath = incomingSchemaPath ?? field.name;
  const isReadOnly = Boolean(readOnly || disabled || field.admin?.readOnly);
  const atMax = field.maxRows !== undefined && rows.length >= field.maxRows;
  // RenderFields keeps each cell on Payload's native permissions, hooks and validation path.
  // Retain labels inside each cell to support translated and custom field labels.
  const columns = field.fields.filter(
    (column) =>
      'name' in column && column.name !== 'id' && !column.hidden && !column.admin?.hidden && !column.admin?.disabled,
  );
  return (
    <div
      className={['field-type', 'advanced-table-field', field.admin?.className].filter(Boolean).join(' ')}
      id={`field-${path.replace(/\./g, '__')}`}
      style={{ ...field.admin?.style, width: field.admin?.width }}
    >
      <RenderCustomComponent
        CustomComponent={Label}
        Fallback={<FieldLabel label={field.label} localized={field.localized} path={path} required={field.required} />}
      />
      <RenderCustomComponent
        CustomComponent={CustomError}
        Fallback={<FieldError path={path} showError={showError} />}
      />
      {BeforeInput}
      <div className="advanced-table">
        <div className="advanced-table__toolbar">
          {!isReadOnly && (
            <button
              type="button"
              disabled={atMax}
              onClick={() => addFieldRow({ path, schemaPath, rowIndex: rows.length })}
            >
              Add row
            </button>
          )}
          <span>{rows.length} rows · Structured records</span>
        </div>
        {/* The fieldset enforces parent read-only even when a column explicitly sets admin.readOnly=false. */}
        <fieldset disabled={isReadOnly} className="advanced-table__fieldset">
          <legend className="advanced-table__sr">Table records</legend>
          <div className="advanced-table__scroll">
            <table aria-label="Table records">
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <th scope="row">
                      {index + 1}
                      {!isReadOnly && (
                        <details>
                          <summary aria-label={`Row ${index + 1} actions`}>⋯</summary>
                          <div className="advanced-table__menu">
                            {field.admin?.isSortable !== false && (
                              <>
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => moveFieldRow({ path, moveFromIndex: index, moveToIndex: index - 1 })}
                                >
                                  Move up
                                </button>
                                <button
                                  type="button"
                                  disabled={index === rows.length - 1}
                                  onClick={() => moveFieldRow({ path, moveFromIndex: index, moveToIndex: index + 1 })}
                                >
                                  Move down
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              disabled={atMax}
                              onClick={() => {
                                dispatchFields({ type: 'DUPLICATE_ROW', path, rowIndex: index });
                                setModified(true);
                              }}
                            >
                              Duplicate row
                            </button>
                            <button
                              type="button"
                              disabled={rows.length <= (field.minRows ?? (field.required ? 1 : 0))}
                              onClick={() => removeFieldRow({ path, rowIndex: index })}
                            >
                              Delete row
                            </button>
                          </div>
                        </details>
                      )}
                    </th>
                    {row.isLoading ? (
                      <td colSpan={columns.length}>Loading row…</td>
                    ) : (
                      columns.map((column) => (
                        <td key={'name' in column ? column.name : column.type} className="advanced-table__native-cell">
                          <RenderFields
                            fields={[column]}
                            forceRender
                            parentIndexPath=""
                            parentPath={`${path}.${index}`}
                            parentSchemaPath={schemaPath}
                            permissions={permissions === true ? permissions : (permissions?.fields ?? {})}
                            readOnly={isReadOnly}
                          />
                        </td>
                      ))
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>
        {!rows.length && <p>No records yet.</p>}
      </div>
      {AfterInput}
      <RenderCustomComponent
        CustomComponent={Description}
        Fallback={<FieldDescription description={field.admin?.description} path={path} />}
      />
    </div>
  );
}
