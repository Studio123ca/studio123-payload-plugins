# Data Table field

`dataTableField` is a JSON-backed, editable table for text content. The admin UI is built on TanStack Table and supports spreadsheet cell selection, deferred cell editing, sortable and resizable columns, editable headers, clipboard actions, undo/redo, context-menu row and column operations, palette styling, and sticky rows.

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
      formulas: { enabled: true, compute: true },
    }),
  ],
};
```

The stored value is intentionally small and explicit:

```ts
type DataTableValue = {
  version: 1;
  columns: Array<{ id: string; label: string; width?: number }>;
  rows: Array<{ id: string; cells: Array<string | { formula: string }> }>;
};
```

`initialRows` and `initialColumns` default to `3`; `maxRows` and `maxColumns` default to `100` and `20`. The hard limits are 1,000 rows and 100 columns. `admin.maxHeight` accepts a positive pixel number or a CSS length and defaults to `640`.

This is a new field type. Existing `tableField` values and configuration are not migrated or read by `dataTableField`.

Formula configuration accepts the boolean shorthand `formulas: true` or an object. The object form controls whether formulas are enabled and whether Payload computes them in the server-side `afterRead` response:

```ts
formulas: { enabled: true, compute: true }
```

API reads include response-only `columnId`, `rowId`, and `cellId` values. Stored values keep the compact `id` and cell shape; the admin editor strips response metadata when it receives an API-shaped value.
