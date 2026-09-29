// Small adapter for component tests. Native Payload config behavior is tested separately.
import { createContext, useContext, useEffect, useState } from 'react';
const Context = createContext<any>(null);
export const calls: { action: string; args: any }[] = [];
export function Fixture({
  initialValue = null,
  path = 'table',
  disabled = false,
  locale = 'en',
  rows = [],
  children,
}: any) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => setValue(initialValue), [initialValue]);
  return (
    <Context.Provider value={{ value, setValue, path, disabled, locale, rows }}>
      {children}
      <pre data-value>{JSON.stringify(value)}</pre>
    </Context.Provider>
  );
}
export function useField(options: any) {
  const context = useContext(Context);
  calls.push({ action: 'useField', args: options });
  return {
    ...context,
    showError: false,
    customComponents: {},
    value: options.hasRows ? context.rows.length : context.value,
  };
}
export function useForm() {
  return Object.fromEntries(
    ['addFieldRow', 'removeFieldRow', 'moveFieldRow', 'dispatchFields', 'setModified'].map((action) => [
      action,
      (args: any) => calls.push({ action, args }),
    ]),
  );
}
export function useConfig() {
  return { config: { localization: { defaultLocale: 'en', fallback: true } } };
}
export function useLocale() {
  return { code: useContext(Context).locale };
}
export function RenderFields(props: any) {
  calls.push({ action: 'RenderFields', args: props });
  return (
    <div data-native-path={props.parentPath}>
      {props.fields.map((field: any) => (
        <input key={field.name} aria-label={field.name} readOnly={props.readOnly} />
      ))}
    </div>
  );
}
export function RenderCustomComponent({ CustomComponent, Fallback }: any) {
  return CustomComponent ?? Fallback;
}
export function FieldLabel({ label }: any) {
  return <label>{typeof label === 'string' ? label : ''}</label>;
}
export function FieldError() {
  return null;
}
export function FieldDescription({ description }: any) {
  return <p>{typeof description === 'string' ? description : ''}</p>;
}
