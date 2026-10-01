'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FieldDescription,
  FieldError,
  FieldLabel,
  RenderCustomComponent,
  useConfig,
  useLocale,
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
  const { config } = useConfig();
  const locale = useLocale()?.code ?? '';
  const baseURL = `${config.serverURL ?? ''}${config.routes.api}`.replace(/\/$/, '');
  const [hydrated, setHydrated] = useState<{ manifest: DataTableValue; locale: string; value: DataTableValue } | null>(
    null,
  );
  const [storageError, setStorageError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [preview, setPreview] = useState<{ rows: DataTableValue['rows']; totalPages: number } | null>(null);
  const storageManifest =
    options.storage.mode === 'rows' && isDataTableStorageManifest(normalizedValue) ? normalizedValue : null;
  const invalidManifest =
    options.storage.mode === 'rows' &&
    normalizedValue?.storage?.mode === 'rows' &&
    normalizedValue.rows.length === 0 &&
    !storageManifest;
  useEffect(() => {
    let cancelled = false;
    setHydrated(null);
    setStorageError(null);
    setPreview(null);
    if (!storageManifest) {
      if (invalidManifest) setStorageError('This Data Table manifest is missing its table identity.');
      return;
    }
    const controller = new AbortController();
    const endpoint = `${baseURL}/data-tables/${encodeURIComponent(storageManifest.tableId)}/rows`;
    const load = async () => {
      const rows: DataTableValue['rows'] = [];
      let page = editing ? 1 : previewPage;
      let hasNextPage = true;
      while (hasNextPage) {
        const query = new URLSearchParams({
          page: String(page),
          limit: String(options.storage.pagination.maxLimit),
          draft: 'true',
          raw: 'true',
        });
        if (locale) query.set('locale', locale);
        query.set('revision', storageManifest.revisionId);
        const response = await fetch(`${endpoint}?${query}`, { credentials: 'include', signal: controller.signal });
        if (!response.ok) throw new Error(`Unable to load Data Table rows (${response.status}).`);
        const payload = await response.json();
        const loaded = normalizeDataTableValue(payload);
        if (
          !loaded ||
          payload.pagination?.page !== page ||
          typeof payload.pagination?.hasNextPage !== 'boolean' ||
          loaded.tableId !== storageManifest.tableId ||
          loaded.revisionId !== storageManifest.revisionId
        )
          throw new Error('The Data Table row response was invalid.');
        rows.push(...loaded.rows);
        hasNextPage = payload.pagination.hasNextPage;
        if (!editing) {
          if (!cancelled) setPreview({ rows: loaded.rows, totalPages: payload.pagination.totalPages });
          return;
        }
        if (rows.length > storageManifest.storage.rowCount || (hasNextPage && !loaded.rows.length))
          throw new Error('The Data Table row response was inconsistent.');
        page++;
      }
      if (rows.length !== storageManifest.storage.rowCount)
        throw new Error('The Data Table row count changed. Reload the document.');
      if (!cancelled)
        setHydrated({
          manifest: storageManifest,
          locale,
          value: hydrateDataTableStorageManifest(storageManifest, rows),
        });
    };
    void load().catch((error: unknown) => {
      if (!cancelled && !(error instanceof Error && error.name === 'AbortError')) {
        setStorageError(error instanceof Error ? error.message : 'Unable to load Data Table rows.');
      }
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [baseURL, locale, options.storage.pagination.maxLimit, storageManifest, invalidManifest, editing, previewPage]);
  const hydratedValue = hydrated?.manifest === storageManifest && hydrated.locale === locale ? hydrated.value : null;
  const editorValue = storageManifest ? (hydratedValue ?? storageManifest) : normalizedValue;
  const storageHydrationPending = Boolean(storageManifest && editing) && !hydratedValue && !storageError;
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
      {storageManifest && !preview && !storageError && !editing && (
        <p className="data-table-field__storage-status">Loading table preview…</p>
      )}
      {storageHydrationPending && <p className="data-table-field__storage-status">Loading table rows…</p>}
      {storageError && (
        <p className="data-table-field__storage-status data-table-field__storage-status--error" role="alert">
          {storageError}
        </p>
      )}
      {storageManifest && !editing ? (
        <div className="data-table-field__storage-preview">
          {preview && (
            <>
              <div style={{ overflowX: 'auto', maxHeight }}>
                <table>
                  <thead>
                    <tr>
                      {storageManifest.columns.map((column) => (
                        <th key={column.id}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={row.id}>
                        {row.cells.map((cell, index) => (
                          <td key={storageManifest.columns[index]?.id ?? index}>
                            {typeof cell === 'object' && cell !== null ? cell.formula : String(cell ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <button type="button" disabled={previewPage <= 1} onClick={() => setPreviewPage((page) => page - 1)}>
                  Previous
                </button>
                <span>
                  {' '}
                  Page {previewPage} of {preview.totalPages}{' '}
                </span>
                <button
                  type="button"
                  disabled={previewPage >= preview.totalPages}
                  onClick={() => setPreviewPage((page) => page + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
          {!readOnly && !disabled && !field.admin?.readOnly && !storageError && (
            <button type="button" onClick={() => setEditing(true)}>
              Edit table
            </button>
          )}
        </div>
      ) : (
        <DataTableEditor
          value={editorValue}
          options={options}
          maxHeight={maxHeight}
          readOnly={Boolean(readOnly || disabled || field.admin?.readOnly || storageHydrationPending || storageError)}
          onChange={setValue}
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

export default DataTableField;
