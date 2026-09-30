# Data Table field

`dataTableField` is a JSON-backed, editable table for text content. The admin UI is built on TanStack Table and begins with a focused feature set: editable text cells, sortable columns, resizable columns, editable headers, and row/column insertion or removal.

```ts
import { dataTableField } from '@studio123/payload-advanced-fields/data-table';

export const Products = {
  slug: 'products',
  fields: [
    dataTableField({
      name: 'pricing',
      label: 'Pricing table',
      initialRows: 3,
      initialColumns: 3,
      maxRows: 100,
      maxColumns: 20,
    }),
  ],
};
```

The stored value is intentionally small and explicit:

```ts
type DataTableValue = {
  version: 1;
  columns: Array<{ id: string; label: string; width?: number }>;
  rows: Array<{ id: string; cells: string[] }>;
};
```

`initialRows` and `initialColumns` default to `3`; `maxRows` and `maxColumns` default to `100` and `20`. The hard limits are 1,000 rows and 100 columns. `admin.maxHeight` accepts a positive pixel number or a CSS length and defaults to `640`.

This is a new field type. Existing `tableField` values and configuration are not migrated or read by `dataTableField`.
