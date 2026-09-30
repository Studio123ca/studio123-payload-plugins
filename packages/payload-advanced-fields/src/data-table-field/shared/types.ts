import type { JSONField } from 'payload';

export type DataTableColumn = {
  id: string;
  label: string;
  width?: number;
};

export type DataTableCell = string | { formula: string };

export type DataTableResponseCell = {
  cellId: string;
  value: string | number | boolean | null;
  formula?: string;
};

export type DataTableThemeColor = string | { light: string; dark: string };

export type DataTablePaletteEntry = {
  key: string;
  label: string;
  background: DataTableThemeColor;
  text?: DataTableThemeColor;
};

export type DataTableAppearance = {
  rows?: Record<string, string>;
  cells?: Record<string, Record<string, string>>;
  stickyRows?: { top: number; bottom: number };
};

export type DataTableRow = {
  id: string;
  cells: DataTableCell[];
};

export type DataTableValue = {
  version: 1;
  headerRow?: boolean;
  caption?: string;
  appearance?: DataTableAppearance;
  columns: DataTableColumn[];
  rows: DataTableRow[];
};

export type DataTableOptions = {
  initialColumns?: number;
  initialRows?: number;
  maxColumns?: number;
  maxRows?: number;
  minColumns?: number;
  minRows?: number;
  formulas?: boolean | { enabled?: boolean; compute?: boolean };
  palette?: DataTablePaletteEntry[];
  stickyRows?: { enabled?: boolean; top?: number; bottom?: number };
};

export type ResolvedDataTableOptions = Omit<Required<DataTableOptions>, 'formulas' | 'stickyRows' | 'palette'> & {
  formulas: boolean;
  computeFormulas: boolean;
  palette: DataTablePaletteEntry[];
  stickyRows: { enabled: boolean; top: number; bottom: number };
};

export type DataTableAdmin = Omit<NonNullable<JSONField['admin']>, 'maxHeight'> & {
  maxHeight?: number | string;
};

export type DataTableFieldConfig = Partial<Omit<JSONField, 'type' | 'admin'>> &
  DataTableOptions & {
    admin?: DataTableAdmin;
  };
