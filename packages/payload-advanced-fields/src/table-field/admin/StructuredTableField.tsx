'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
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
import type { TableAppearance, ResolvedTablePresentation } from '../shared/types.js';
import { resolveTablePresentation } from '../shared/presentation.js';
import {
  BackgroundChoices,
  FreezeChoices,
  backgroundStyle,
  setBackground,
  stickyCounts,
  useStickyRows,
} from './Appearance.js';
import { useRowSizing } from './useRowSizing.js';
import { ColumnResize } from './ColumnResize.js';
import { FormatMenu } from './FormatMenu.js';
import { TableMenu } from './TableMenu.js';

export function StructuredTableField({
  field,
  path: incomingPath,
  schemaPath: incomingSchemaPath,
  permissions,
  readOnly,
  validate,
  presentation = resolveTablePresentation(),
  maxHeight = 640,
}: ArrayFieldClientProps & { presentation?: ResolvedTablePresentation; maxHeight?: number | string }) {
  const root = useRef<HTMLDivElement>(null);
  useRowSizing(root);
  const [widths, setWidths] = useState<Record<string, number>>({});
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
  const [appearance, setAppearance] = useState<TableAppearance>({});
  const [selected, setSelected] = useState<{ row: string; column: string } | null>(null);
  useEffect(() => {
    setAppearance({});
    setSelected(null);
  }, [path, locale?.code]);
  const frozen = stickyCounts(appearance, presentation, rows.length);
  useStickyRows(root, frozen.top, frozen.bottom, rows.map((row) => row.id).join(':'));
  const schemaPath = incomingSchemaPath ?? field.name;
  const isReadOnly = Boolean(readOnly || disabled || field.admin?.readOnly);
  const atMax = field.maxRows !== undefined && rows.length >= field.maxRows;
  // RenderFields keeps each cell on Payload's native permissions, hooks and validation path.
  // Keep native labels accessible while showing column labels only once in the header.
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
      <div className="advanced-table" ref={root}>
        <div className="advanced-table__toolbar">
          {!isReadOnly && (
            <TableMenu label="Insert">
              <button
                type="button"
                disabled={atMax}
                onClick={() => addFieldRow({ path, schemaPath, rowIndex: rows.length })}
              >
                Add row
              </button>
            </TableMenu>
          )}
          {!isReadOnly && rows.length > 0 && columns.length > 0 && presentation.palette.length > 0 && (
            <FormatMenu
              options={presentation}
              applyCell={(key) =>
                setAppearance(
                  setBackground(
                    appearance,
                    [selected && rows.some((row) => row.id === selected.row) ? selected.row : rows[0].id],
                    [selected?.column ?? ('name' in columns[0] ? columns[0].name : '')],
                    key,
                  ),
                )
              }
              applyRow={(key) =>
                setAppearance(
                  setBackground(
                    appearance,
                    [selected && rows.some((row) => row.id === selected.row) ? selected.row : rows[0].id],
                    undefined,
                    key,
                  ),
                )
              }
            />
          )}
          <TableMenu label="View">
            <button type="button" onClick={() => setWidths({})}>
              Reset column widths
            </button>
            {presentation.stickyRows.enabled && (
              <button
                type="button"
                disabled={isReadOnly || (!frozen.top && !frozen.bottom)}
                onClick={() => setAppearance({ ...appearance, stickyRows: { top: 0, bottom: 0 } })}
              >
                Unfreeze rows
              </button>
            )}
          </TableMenu>
          <span>{rows.length} rows · Structured records</span>
        </div>
        {/* The fieldset enforces parent read-only even when a column explicitly sets admin.readOnly=false. */}
        <fieldset disabled={isReadOnly} className="advanced-table__fieldset">
          <legend className="advanced-table__sr">Table records</legend>
          <div className="advanced-table__scroll" style={{ maxHeight }}>
            <table
              aria-label="Table records"
              style={{
                width:
                  64 +
                  columns.reduce(
                    (sum, column) => sum + (widths['name' in column ? column.name : column.type] ?? 180),
                    0,
                  ),
              }}
            >
              <colgroup>
                <col style={{ width: 64 }} />
                {columns.map((column) => (
                  <col
                    key={'name' in column ? column.name : column.type}
                    style={{ width: widths['name' in column ? column.name : column.type] ?? 180 }}
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="advanced-table__sr">Row</span>
                  </th>
                  {columns.map((column) => (
                    <th scope="col" key={'name' in column ? column.name : column.type}>
                      <div className="advanced-table__column-heading advanced-table__fixed-heading">
                        <FieldLabel
                          label={
                            ('label' in column ? column.label : undefined) ?? ('name' in column ? column.name : '')
                          }
                          required={'required' in column && column.required}
                        />
                      </div>
                      {!isReadOnly && (
                        <ColumnResize
                          label={'name' in column ? column.name : column.type}
                          width={widths['name' in column ? column.name : column.type] ?? 180}
                          onResize={(width) =>
                            setWidths((previous) => ({
                              ...previous,
                              ['name' in column ? column.name : column.type]: width,
                            }))
                          }
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <th
                      scope="row"
                      style={backgroundStyle(appearance, presentation, row.id)}
                      data-colored={Boolean(backgroundStyle(appearance, presentation, row.id)) || undefined}
                    >
                      <div className="advanced-table__row-heading">
                        <span>{index + 1}</span>
                        {!isReadOnly && (
                          <TableMenu compact label={`Row ${index + 1} actions`}>
                            <BackgroundChoices
                              options={presentation}
                              label="Row background"
                              apply={(key) => setAppearance(setBackground(appearance, [row.id], undefined, key))}
                            />
                            <FreezeChoices
                              index={index}
                              count={rows.length}
                              appearance={appearance}
                              options={presentation}
                              apply={setAppearance}
                            />
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
                          </TableMenu>
                        )}
                      </div>
                    </th>
                    {row.isLoading ? (
                      <td colSpan={columns.length}>Loading row…</td>
                    ) : (
                      columns.map((column) => (
                        <td
                          key={'name' in column ? column.name : column.type}
                          className="advanced-table__native-cell"
                          style={backgroundStyle(appearance, presentation, row.id, 'name' in column ? column.name : '')}
                          data-colored={
                            Boolean(
                              backgroundStyle(appearance, presentation, row.id, 'name' in column ? column.name : ''),
                            ) || undefined
                          }
                          onPointerDown={() =>
                            setSelected({ row: row.id, column: 'name' in column ? column.name : '' })
                          }
                          onFocusCapture={() =>
                            setSelected({ row: row.id, column: 'name' in column ? column.name : '' })
                          }
                        >
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
