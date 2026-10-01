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

export type DataTableFormat = {
  key: string;
  label: string;
  background: DataTableThemeColor;
  text?: DataTableThemeColor;
};

/** @deprecated Use DataTableFormat. */
export type DataTablePaletteEntry = DataTableFormat;

export type DataTableAppearance = {
  rows?: Record<string, string>;
  cells?: Record<string, Record<string, string>>;
  textColors?: {
    rows?: Record<string, string>;
    cells?: Record<string, Record<string, string>>;
  };
  links?: Record<string, Record<string, DataTableLink>>;
  text?: Record<string, Record<string, DataTableTextStyle>>;
  stickyRows?: { top: number; bottom: number };
};

export type DataTableLink = {
  url: string;
};

export type DataTableTextStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  align?: 'left' | 'center' | 'right';
  wrap?: boolean;
};

export type DataTableTextFormats = {
  enabled?: boolean;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  alignment?: boolean;
  wrapping?: boolean;
  link?: boolean;
};

export type ResolvedDataTableTextFormats = {
  enabled: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  alignment: boolean;
  wrapping: boolean;
  link: boolean;
};

export type DataTableRow = {
  id: string;
  cells: DataTableCell[];
};

export type DataTableValue = {
  version: 1;
  /** Stable table identity, assigned by row storage on first save. */
  tableId?: string;
  /** Immutable row snapshot referenced by this document version. */
  revisionId?: string;
  headerRow?: boolean;
  caption?: string;
  appearance?: DataTableAppearance;
  storage?: {
    mode: 'rows';
    rowCount: number;
  };
  columns: DataTableColumn[];
  rows: DataTableRow[];
};

export type DataTableStorageOptions = {
  mode?: 'json' | 'rows';
  pagination?:
    | boolean
    | {
        enabled?: boolean;
        defaultLimit?: number;
        maxLimit?: number;
      };
};

export type ResolvedDataTableStorageOptions = {
  mode: 'json' | 'rows';
  pagination: {
    enabled: boolean;
    defaultLimit: number;
    maxLimit: number;
  };
};

export type DataTableDimensionOptions = {
  initial?: number;
  min?: number;
  max?: number;
};

export type ResolvedDataTableDimensionOptions = {
  initial: number;
  min: number;
  max: number;
};

export type DataTableOptions = {
  columns?: DataTableDimensionOptions;
  rows?: DataTableDimensionOptions;
  formulas?: boolean | { enabled?: boolean; compute?: boolean };
  apiResponse?: {
    includeIds?: boolean;
    computeFormulas?: boolean;
  };
  storage?: DataTableStorageOptions;
  formats?: DataTableFormat[];
  textFormats?: boolean | DataTableTextFormats;
  stickyRows?: { enabled?: boolean; top?: number; bottom?: number };
};

export type ResolvedDataTableOptions = {
  columns: ResolvedDataTableDimensionOptions;
  rows: ResolvedDataTableDimensionOptions;
  formulas: { enabled: boolean; compute: boolean };
  apiResponse: { includeIds: boolean; computeFormulas: boolean };
  storage: ResolvedDataTableStorageOptions;
  formats: DataTableFormat[];
  textFormats: ResolvedDataTableTextFormats;
  stickyRows: { enabled: boolean; top: number; bottom: number };
};

export type DataTableAdmin = Omit<NonNullable<JSONField['admin']>, 'maxHeight'> & {
  maxHeight?: number | string;
};

export type DataTableFieldConfig = Partial<Omit<JSONField, 'type' | 'admin'>> &
  DataTableOptions & {
    admin?: DataTableAdmin;
  };
