import type { ArrayField, CheckboxField, JSONField, NumberField, SelectField, TextareaField, TextField } from 'payload';

export type TableCell = string | number | boolean | null | { formula: string };
export type TableValue = {
  version: 1;
  caption: string;
  headerRow: boolean;
  columns: { id: string; label: string; width?: number }[];
  rows: { id: string; cells: TableCell[] }[];
};

export type TableOptions = {
  mode?: 'content' | 'spreadsheet';
  storage?: 'json' | 'csv';
  initialRows?: number;
  initialColumns?: number;
  minRows?: number;
  maxRows?: number;
  minColumns?: number;
  maxColumns?: number;
  headerRow?: boolean;
  caption?: boolean;
  formulas?: boolean;
};

export type ResolvedTableOptions = Required<TableOptions>;
export type JSONTableFieldConfig = Partial<Omit<JSONField, 'type'>> & TableOptions & { storage?: 'json' };
export type CSVTableFieldConfig = Partial<Omit<TextareaField, 'type'>> &
  Omit<TableOptions, 'mode' | 'storage' | 'caption' | 'formulas'> & {
    mode?: 'content';
    storage: 'csv';
    caption?: false;
    formulas?: false;
  };
/** Native Payload fields: their validation, access, defaults and hooks are preserved. */
export type TableColumn = TextField | TextareaField | NumberField | CheckboxField | SelectField;
export type StructuredTableFieldConfig = Partial<Omit<ArrayField, 'type' | 'fields'>> & {
  mode: 'structured';
  columns: TableColumn[];
};
export type TableFieldConfig = JSONTableFieldConfig | CSVTableFieldConfig | StructuredTableFieldConfig;
export type TableField = JSONField | TextareaField | ArrayField;
export type TableSelection = { startRow: number; startColumn: number; endRow: number; endColumn: number };
