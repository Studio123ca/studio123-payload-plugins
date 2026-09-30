export { Fixture, useField, useModal, Drawer, useLocale } from './payload-ui';
export { default as LinkField } from '../../src/link-field/admin/LinkField.client';
export { LinkFieldModal } from '../../src/link-field/admin/LinkFieldModal';
export const fieldBaseClass = 'field-type';
export function useConfig() {
  return {
    config: {
      serverURL: '',
      routes: { api: '/custom-api' },
      collections: [{ slug: 'pages', admin: { useAsTitle: 'name' } }],
    },
  };
}
export function Button({ children, onClick, 'aria-label': label }: any) {
  return (
    <button aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}
export function FieldLabel({ label, required }: any) {
  return (
    <label>
      {label}
      {required ? '*' : ''}
    </label>
  );
}
export function FieldDescription() {
  return null;
}
export function FieldError({ message, showError }: any) {
  return showError ? <span role="alert">{message}</span> : null;
}
export function TextInput({ label, value, onChange, Error }: any) {
  return (
    <label>
      {label}
      <input aria-label={label} value={value} onChange={onChange} />
      {Error}
    </label>
  );
}
export function SelectInput({ value, options, onChange }: any) {
  return (
    <select value={value} onChange={(event) => onChange({ value: event.target.value })}>
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
export function RelationshipInput() {
  return null;
}
export function CheckboxInput({ checked, onToggle, label }: any) {
  return <input aria-label={label} type="checkbox" checked={checked} onChange={onToggle} />;
}
