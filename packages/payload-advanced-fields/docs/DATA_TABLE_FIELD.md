# Data Table field

`dataTableField` is a JSON-backed, editable table for text content. The admin UI is built on TanStack Table and supports spreadsheet cell selection, deferred cell editing, sortable and resizable columns, editable headers, clipboard actions, undo/redo, context-menu row and column operations, optional format styling, and sticky rows.

```ts
import { dataTableField } from '@studio123/payload-advanced-fields/data-table';

export const Products = {
  slug: 'products',
  fields: [
    dataTableField({
      name: 'pricing',
      label: 'Pricing table',
      rows: { initial: 3, max: 100, min: 1 },
      columns: { initial: 3, max: 20, min: 1 },
      formulas: { enabled: true, compute: true },
      formats: [
        { key: 'highlight', label: 'Highlight', background: 'var(--color-bg-warning-tertiary)' },
        { key: 'success', label: 'Success', background: 'var(--color-bg-success-tertiary)' },
      ],
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

`rows.initial` and `columns.initial` default to `3`; `rows.min` and `columns.min` default to `1`; `rows.max` and `columns.max` default to `100` and `20`. The hard limits are 1,000 rows and 100 columns. `admin.maxHeight` accepts a positive pixel number or a CSS length and defaults to `640`.

This is a new field type. Existing `tableField` values and configuration are not migrated or read by `dataTableField`.

Formula configuration accepts the boolean shorthand `formulas: true` or an object. The object form controls whether formulas are enabled and whether Payload computes them in the server-side `afterRead` response:

```ts
formulas: { enabled: true, compute: true }
```

Formatting choices are supplied by the field configuration through `formats`. Each format has a stable `key`, a visible `label`, and a background color; an optional `text` color can also be provided. The Format menu and formatting context-menu item are omitted when `formats` is empty or not supplied.

API reads include response-only `columnId`, `rowId`, and `cellId` values. Stored values keep the compact `id` and cell shape; the admin editor strips response metadata when it receives an API-shaped value.

The Table menu imports and exports CSV. The first CSV row is used for column labels, and formula cells retain their `=...` text during export. Column widths update while dragging, and an active cell's textarea resize handle keeps the rest of its row aligned.
