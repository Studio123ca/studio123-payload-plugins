import { useCallback, useMemo, useState } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { en } from '@payloadcms/translations/languages/en';
import {
  DocumentInfoProvider,
  Form,
  OperationProvider,
  RootProvider,
  RouterAdapterContext,
  useAllFormFields,
  useForm,
} from '@payloadcms/ui';
import type { ClientField, FormState, LinkAdapterProps, ServerFunctionClient } from 'payload';
import { reduceFieldsToValues } from 'payload/shared';
import config from 'virtual:payload-story-config';
import { demoUser, permissions } from './api.js';

export type FieldControls = {
  label: string;
  description: string;
  required: boolean;
  readOnly: boolean;
  showError: boolean;
  initialValue: unknown;
};
export const commonArgs: FieldControls = {
  label: 'Example field',
  description: 'Edit this field and inspect its current value below.',
  required: false,
  readOnly: false,
  showError: false,
  initialValue: null,
};
export const commonArgTypes = {
  label: { control: 'text' as const },
  description: { control: 'text' as const },
  required: { control: 'boolean' as const },
  readOnly: { control: 'boolean' as const },
  showError: { control: 'boolean' as const, description: 'Display a simulated server error.' },
  initialValue: { control: 'object' as const, description: 'Changing this resets the form. Edits are kept in memory.' },
};

const path = 'example';
function Link({ prefetch: _prefetch, replace: _replace, scroll: _scroll, ...props }: LinkAdapterProps) {
  return <a {...props} />;
}

function makeState(initialValue: unknown, fields?: ClientField[]): FormState {
  const state: FormState = {};
  if (!fields) return { [path]: { initialValue, value: initialValue, valid: true, passesCondition: true } };
  const records = Array.isArray(initialValue) ? initialValue : [];
  const rows = records.map((record, index) => ({ id: String(record.id ?? `story-row-${index}`), isLoading: false }));
  state[path] = { value: rows.length, initialValue: rows.length, rows, valid: true, disableFormData: rows.length > 0 };
  records.forEach((record, index) => {
    const rowPath = `${path}.${index}`;
    state[`${rowPath}.id`] = { value: rows[index].id, initialValue: rows[index].id, valid: true };
    for (const field of fields) {
      if (!('name' in field)) continue;
      const value = record[field.name] ?? (field.type === 'checkbox' ? false : field.type === 'number' ? null : '');
      state[`${rowPath}.${field.name}`] = { value, initialValue: value, valid: true, passesCondition: true };
    }
  });
  return state;
}

/** Fulfill the row hydration that a Payload server normally performs after ADD_ROW. */
function hydrateRows(formState: FormState, fields?: ClientField[]): FormState {
  if (!fields || !formState[path]?.rows) return formState;
  const next: FormState = {
    ...formState,
    [path]: { ...formState[path], rows: formState[path].rows.map((row) => ({ ...row, isLoading: false })) },
  };
  formState[path].rows.forEach((_, index) => {
    for (const field of fields) {
      if (!('name' in field)) continue;
      const cellPath = `${path}.${index}.${field.name}`;
      if (!next[cellPath]) {
        const value = field.type === 'checkbox' ? false : field.type === 'number' ? null : '';
        next[cellPath] = { value, initialValue: value, valid: true, passesCondition: true };
      }
    }
  });
  return next;
}

function ValuePanel({ showError }: { showError: boolean }) {
  const [fields] = useAllFormFields();
  const { dispatchFields } = useForm();
  // Server errors are applied after local validation, just like an API response.
  const addError = () =>
    dispatchFields({ type: 'ADD_SERVER_ERRORS', errors: [{ path, message: 'Example server validation error.' }] });
  return (
    <aside className="story-value">
      <div className="story-value__heading">
        <strong>Current field value</strong>
        {showError && (
          <button type="button" onClick={addError}>
            Show server error
          </button>
        )}
      </div>
      <pre data-testid="field-value">{JSON.stringify(reduceFieldsToValues(fields, true).example ?? null, null, 2)}</pre>
      <p>In-memory form state. Database persistence, access checks, and server hooks require a real Payload app.</p>
    </aside>
  );
}

export function PayloadField({
  children,
  args,
  theme = 'light',
  locale = 'en',
  fields,
}: {
  children: ReactNode;
  args: FieldControls;
  theme?: 'light' | 'dark';
  locale?: string;
  fields?: ClientField[];
}) {
  const [reset, setReset] = useState(0);
  const storyKey = JSON.stringify([args, theme, locale, fields, reset]);
  const initialState = useMemo(() => makeState(args.initialValue, fields), [args.initialValue, fields]);
  const onChange = useMemo(
    () => [async ({ formState }: { formState: FormState }) => hydrateRows(formState, fields)],
    [fields],
  );
  const serverFunction: ServerFunctionClient = useCallback(
    async ({ name }) => {
      if (name === 'form-state') return { state: initialState };
      throw new Error(`Storybook has no server function for ${name}.`);
    },
    [initialState],
  );
  const Router = useMemo(
    () =>
      function StoryRouter({ children }: PropsWithChildren) {
        return (
          <RouterAdapterContext
            value={{
              Link,
              params: {},
              pathname: '/admin/collections/stories/create',
              searchParams: new URLSearchParams({ locale, theme }),
              router: { back() {}, push() {}, replace() {}, refresh() {} },
            }}
          >
            {children}
          </RouterAdapterContext>
        );
      },
    [locale, theme],
  );
  return (
    <div className="field-story" data-theme={theme}>
      <RootProvider
        key={storyKey}
        config={config}
        dateFNSKey={en.dateFNSKey}
        fallbackLang="en"
        highContrastMode={false}
        languageCode="en"
        languageOptions={[{ value: 'en', label: 'English' }]}
        locale={locale}
        permissions={permissions}
        RouterAdapter={Router}
        serverFunction={serverFunction}
        theme={theme}
        translations={en.translations}
        user={demoUser}
      >
        <OperationProvider operation="create">
          <DocumentInfoProvider
            collectionSlug="stories"
            currentEditor={demoUser}
            hasPublishedDoc={false}
            isLocked={false}
            lastUpdateTime={0}
            mostRecentVersionIsAutosaved={false}
            unpublishedVersionCount={0}
            versionCount={0}
            initialState={initialState}
            docPermissions={{ create: true, read: true, update: true, delete: true, fields: true }}
          >
            <div className="story-toolbar">
              <span>Payload field playground</span>
              <button type="button" onClick={() => setReset((value) => value + 1)}>
                Reset example
              </button>
            </div>
            <Form
              initialState={initialState}
              onChange={onChange}
              disabled={args.readOnly}
              submitted={args.showError}
              onSubmit={() => undefined}
            >
              <div className="story-canvas">{children}</div>
              <ValuePanel showError={args.showError} />
            </Form>
          </DocumentInfoProvider>
        </OperationProvider>
      </RootProvider>
    </div>
  );
}

export function fieldProps<T extends 'json' | 'textarea' = 'json'>(args: FieldControls, type: T = 'json' as T) {
  return {
    path,
    field: {
      name: path,
      type,
      label: args.label,
      required: args.required,
      admin: { description: args.description, readOnly: args.readOnly, editorOptions: undefined, maxHeight: undefined },
    },
    readOnly: args.readOnly,
  };
}
