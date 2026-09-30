// Small adapter for component tests. Native Payload config behavior is tested separately.
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  const [modal, setModal] = useState<string | null>(null);
  useEffect(() => setValue(initialValue), [initialValue]);
  return (
    <Context.Provider value={{ value, setValue, path, disabled, locale, rows, modal, setModal }}>
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
export function Button({ children, buttonStyle: _buttonStyle, margin: _margin, size: _size, ...props }: any) {
  return <button {...props}>{children}</button>;
}

// Expose popup contents to the DOM adapter; real portal behavior is exercised in Storybook.
export function Popup({ button, buttonAriaLabel, render }: any) {
  return (
    <div>
      <button aria-label={buttonAriaLabel}>{button}</button>
      {render({ close() {} })}
    </div>
  );
}

export function useModal() {
  const context = useContext(Context);
  const closeModal = useCallback(() => context.setModal(null), [context.setModal]);
  return { openModal: context.setModal, closeModal };
}
export function ConfirmationModal({ modalSlug, heading, body, onConfirm, confirmLabel, cancelLabel }: any) {
  const context = useContext(Context);
  if (context.modal !== modalSlug) return null;
  return (
    <div role="dialog" aria-label={heading}>
      <p>{body}</p>
      <button onClick={() => context.setModal(null)}>{cancelLabel}</button>
      <button
        onClick={() => {
          onConfirm();
          context.setModal(null);
        }}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
export function Drawer({ slug, title, children }: any) {
  const context = useContext(Context);
  if (context.modal !== slug) return null;
  return (
    <div role="dialog" aria-label={title}>
      <h2>{title}</h2>
      {children}
      <button onClick={() => context.setModal(null)}>Close</button>
    </div>
  );
}
