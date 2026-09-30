import type { JSONField } from 'payload';

export type DataTableColumn = {
  id: string;
  label: string;
  width?: number;
};

export type DataTableRow = {
  id: string;
  cells: string[];
};

export type DataTableValue = {
  version: 1;
  columns: DataTableColumn[];
  rows: DataTableRow[];
};

export type DataTableOptions = {
  initialColumns?: number;
  initialRows?: number;
  maxColumns?: number;
  maxRows?: number;
};

export type ResolvedDataTableOptions = Required<DataTableOptions>;

export type DataTableAdmin = Omit<NonNullable<JSONField['admin']>, 'maxHeight'> & {
  maxHeight?: number | string;
};

export type DataTableFieldConfig = Partial<Omit<JSONField, 'type' | 'admin'>> &
  DataTableOptions & {
    admin?: DataTableAdmin;
  };
