import type { ArrayField, CheckboxField, JSONField, NumberField, SelectField, TextareaField, TextField } from 'payload';

export type TableThemeColor = string | { light: string; dark: string };
export type TablePaletteEntry = { key: string; label: string; background: TableThemeColor; text?: TableThemeColor };
export type TablePresentationConfig = {
  palette?: TablePaletteEntry[];
  stickyRows?: { enabled?: boolean; top?: number; bottom?: number };
};
export type ResolvedTablePresentation = {
  palette: TablePaletteEntry[];
  stickyRows: { enabled: boolean; top: number; bottom: number };
};
export type TableAppearance = {
  rows?: Record<string, string>;
  cells?: Record<string, Record<string, string>>;
  stickyRows?: { top: number; bottom: number };
};
export type TableFieldPluginConfig = TablePresentationConfig;

export type TableCell = string | number | boolean | null | { formula: string };
export type TableValue = {
  version: 1;
  appearance?: TableAppearance;
  caption: string;
  headerRow: boolean;
  columns: { id: string; label: string; width?: number }[];
  rows: { id: string; cells: TableCell[] }[];
};

export type TableOptions = TablePresentationConfig & {
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

export type ResolvedTableOptions = Required<Omit<TableOptions, keyof TablePresentationConfig>> &
  ResolvedTablePresentation;
export type TableAdmin<A> = Omit<NonNullable<A>, 'maxHeight'> & { maxHeight?: number | string };
export type JSONTableFieldConfig = Partial<Omit<JSONField, 'type' | 'admin'>> & {
  admin?: TableAdmin<JSONField['admin']>;
} & TableOptions & { storage?: 'json' };
export type CSVTableFieldConfig = Partial<Omit<TextareaField, 'type' | 'admin'>> & {
  admin?: TableAdmin<TextareaField['admin']>;
} & Omit<TableOptions, 'mode' | 'storage' | 'caption' | 'formulas'> & {
    mode?: 'content';
    storage: 'csv';
    caption?: false;
    formulas?: false;
  };
/** Native Payload fields: their validation, access, defaults and hooks are preserved. */
export type TableColumn = TextField | TextareaField | NumberField | CheckboxField | SelectField;
export type StructuredTableFieldConfig = Partial<Omit<ArrayField, 'type' | 'fields' | 'admin'>> & {
  admin?: TableAdmin<ArrayField['admin']>;
} & TablePresentationConfig & {
    mode: 'structured';
    columns: TableColumn[];
  };
export type TableFieldConfig = JSONTableFieldConfig | CSVTableFieldConfig | StructuredTableFieldConfig;
export type TableField = JSONField | TextareaField | ArrayField;
export type TableSelection = { startRow: number; startColumn: number; endRow: number; endColumn: number };
