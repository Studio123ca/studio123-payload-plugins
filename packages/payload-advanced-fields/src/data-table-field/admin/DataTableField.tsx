'use client';

import { useCallback, useMemo } from 'react';
import { FieldDescription, FieldError, FieldLabel, RenderCustomComponent, useField } from '@payloadcms/ui';
import type { JSONFieldClientProps } from 'payload';
import { normalizeDataTableValue, validateDataTable } from '../shared/dataTable.js';
import type { DataTableValue, ResolvedDataTableOptions } from '../shared/types.js';
import { DataTableEditor } from './DataTableEditor.js';

export function DataTableField({
  field,
  path: incomingPath,
  readOnly,
  options,
  maxHeight,
}: JSONFieldClientProps & { options: ResolvedDataTableOptions; maxHeight?: number | string }) {
  const validate = useCallback(
    (value: unknown) => validateDataTable(normalizeDataTableValue(value), options, Boolean(field.required)),
    [field.required, options],
  );
  const {
    value,
    path,
    setValue,
    disabled,
    showError,
    customComponents: { Label, Description, Error: CustomError, BeforeInput, AfterInput } = {},
  } = useField<DataTableValue | null>({ potentiallyStalePath: incomingPath, validate });
  const normalizedValue = useMemo(() => normalizeDataTableValue(value), [value]);
  return (
    <div
      className={['field-type', 'data-table-field', field.admin?.className].filter(Boolean).join(' ')}
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
      <DataTableEditor
        value={normalizedValue}
        options={options}
        maxHeight={maxHeight}
        readOnly={Boolean(readOnly || disabled || field.admin?.readOnly)}
        onChange={setValue}
      />
      {AfterInput}
      <RenderCustomComponent
        CustomComponent={Description}
        Fallback={<FieldDescription description={field.admin?.description} path={path} />}
      />
    </div>
  );
}

export default DataTableField;
