'use client';

import { useCallback, useMemo, useRef } from 'react';
import { FieldDescription, FieldError, FieldLabel, RenderCustomComponent, useField, useLocale } from '@payloadcms/ui';
import type { JSONFieldClientProps, TextareaFieldClientProps } from 'payload';
import type { ResolvedTableOptions, TableValue } from '../shared/types.js';
import { validateTable } from '../shared/table.js';
import { csvToTable, tableToCSV, validateCSVTable } from '../shared/csv.js';
import { TableEditor } from './TableEditor.js';

export function TableField({
  field,
  path: incomingPath,
  readOnly,
  options,
}: (JSONFieldClientProps | TextareaFieldClientProps) & { options: ResolvedTableOptions }) {
  const validate = useCallback(
    (value: unknown) =>
      options.storage === 'csv'
        ? validateCSVTable(value, options, field.required)
        : validateTable(value, options, field.required),
    [options, field.required],
  );
  const {
    value,
    path,
    setValue,
    disabled,
    showError,
    customComponents: { Label, Description, Error: CustomError, BeforeInput, AfterInput } = {},
  } = useField<TableValue | string | null>({
    potentiallyStalePath: incomingPath,
    validate,
  });
  const locale = useLocale();
  const editorKey = `${path}:${locale?.code ?? ''}`;
  const local = useRef<{ raw: unknown; table: TableValue | null; path: string } | null>(null);
  const parsed = useMemo((): { table: TableValue | null; error?: string } => {
    if (local.current?.path === editorKey && local.current.raw === value) return { table: local.current.table };
    if (value === null || value === undefined || value === '') return { table: null };
    try {
      const relaxedOptions = { ...options, minRows: 0, minColumns: 1 };
      if (options.storage === 'csv') {
        if (typeof value !== 'string') throw new Error('Expected a CSV string.');
        return { table: csvToTable(value, relaxedOptions) };
      }
      const valid = validateTable(value, relaxedOptions);
      if (valid !== true) throw new Error(valid);
      return { table: value as TableValue };
    } catch (error) {
      return { table: null, error: error instanceof Error ? error.message : 'Invalid table data.' };
    }
  }, [value, options, editorKey]);
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
      {parsed.error ? (
        <p role="alert">
          {parsed.error} Existing data has been preserved. Correct the stored value or restore a valid version.
        </p>
      ) : (
        <TableEditor
          key={editorKey}
          value={parsed.table}
          options={options}
          readOnly={Boolean(readOnly || disabled || field.admin?.readOnly)}
          onChange={(table) => {
            const raw = options.storage === 'csv' ? (table ? tableToCSV(table) : null) : table;
            local.current = { raw, table, path: editorKey };
            setValue(raw);
          }}
        />
      )}
      {AfterInput}
      <RenderCustomComponent
        CustomComponent={Description}
        Fallback={<FieldDescription description={field.admin?.description} path={path} />}
      />
    </div>
  );
}

export default TableField;
