'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FieldDescription,
  FieldError,
  FieldLabel,
  RenderCustomComponent,
  useDocumentInfo,
  useField,
} from '@payloadcms/ui';
import type { JSONFieldClientProps } from 'payload';
import { hydrateDataTableStorageManifest, isDataTableStorageManifest } from '../shared/storage.js';
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
  const { apiURL, collectionSlug, id } = useDocumentInfo();
  const [hydratedValue, setHydratedValue] = useState<DataTableValue | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const storageManifest =
    options.storage.mode === 'rows' && isDataTableStorageManifest(normalizedValue) ? normalizedValue : null;
  useEffect(() => {
    let cancelled = false;
    if (!storageManifest) {
      setHydratedValue(null);
      setStorageError(null);
      return;
    }
    if (id === undefined || id === null || !collectionSlug) {
      setHydratedValue(null);
      setStorageError(null);
      return;
    }
    setStorageError(null);
    const controller = new AbortController();
    const baseURL = (apiURL ?? '/api').replace(/\/$/, '');
    const fieldName = encodeURIComponent(incomingPath);
    fetch(`${baseURL}/${collectionSlug}/${encodeURIComponent(String(id))}/data-table-rows/${fieldName}?all=true`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Unable to load Data Table rows (${response.status}).`);
        return (await response.json()) as unknown;
      })
      .then((payload) => {
        if (cancelled) return;
        const loaded = normalizeDataTableValue(payload);
        if (!loaded) throw new Error('The Data Table row response was invalid.');
        setHydratedValue(hydrateDataTableStorageManifest(storageManifest, loaded.rows));
      })
      .catch((error: unknown) => {
        if (!cancelled && !(error instanceof Error && error.name === 'AbortError')) {
          setHydratedValue(null);
          setStorageError(error instanceof Error ? error.message : 'Unable to load Data Table rows.');
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiURL, collectionSlug, id, incomingPath, storageManifest]);
  const editorValue = storageManifest ? (hydratedValue ?? storageManifest) : normalizedValue;
  const storageHydrationPending =
    Boolean(storageManifest) && id !== undefined && id !== null && Boolean(collectionSlug) && !hydratedValue;
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
      {storageHydrationPending && <p className="data-table-field__storage-status">Loading table rows…</p>}
      {storageError && (
        <p className="data-table-field__storage-status data-table-field__storage-status--error" role="alert">
          {storageError}
        </p>
      )}
      <DataTableEditor
        value={editorValue}
        options={options}
        maxHeight={maxHeight}
        readOnly={Boolean(readOnly || disabled || field.admin?.readOnly || storageHydrationPending || storageError)}
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
