# Data Table Field

An editable spreadsheet-style field for text values. The admin UI supports cell selection, deferred editing, keyboard navigation, formulas, formatting, CSV import/export, row and column resizing, reordering, and sticky rows.

## Import

```typescript
import { dataTableField } from '@studio123/payload-advanced-fields/data-table';
```

## Basic Configuration

```typescript
dataTableField({
  name: 'pricing',
  label: 'Pricing',
});
```

## Full Configuration

```typescript
import { CollectionConfig } from 'payload';
import { dataTableField } from '@studio123/payload-advanced-fields/data-table';

export const Products: CollectionConfig = {
  slug: 'products',
  fields: [
    dataTableField({
      name: 'pricing',
      label: 'Pricing',
      rows: { initial: 10, min: 1, max: 1_000 },
      columns: { initial: 4, min: 2, max: 12 },
      formulas: { enabled: true },
      apiResponse: { includeIds: true, computeFormulas: true },
      formats: [
        {
          key: 'highlight',
          label: 'Highlight',
          background: 'var(--color-bg-warning-tertiary)',
        },
      ],
      textFormats: {
        bold: true,
        italic: true,
        alignment: true,
        wrapping: true,
        link: true,
      },
      stickyRows: { enabled: true, top: 1 },
      admin: { maxHeight: 520 },
    }),
  ],
};
```

## Configuration Options

| Option                            | Type                 | Default        | Description                                                                        |
| --------------------------------- | -------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `name`                            | string               | `'dataTable'`  | Field name in the document.                                                        |
| `label`                           | string               | `'Data Table'` | Admin label.                                                                       |
| `required`                        | boolean              | `false`        | Require a table value.                                                             |
| `localized`                       | boolean              | `false`        | Enable Payload localization.                                                       |
| `rows.initial`                    | number               | `3`            | Number of rows created for a new table.                                            |
| `rows.min`                        | number               | `1`            | Minimum number of rows.                                                            |
| `rows.max`                        | number               | unlimited      | Maximum number of rows.                                                            |
| `columns.initial`                 | number               | `3`            | Number of columns created for a new table.                                         |
| `columns.min`                     | number               | `1`            | Minimum number of columns.                                                         |
| `columns.max`                     | number               | unlimited      | Maximum number of columns.                                                         |
| `formulas`                        | boolean or object    | `false`        | Enable spreadsheet formulas with `{ enabled: true }`.                              |
| `apiResponse.includeIds`          | boolean              | `false`        | Add `columnId`, `rowId`, and spreadsheet-style `cellId` values to API responses.   |
| `apiResponse.computeFormulas`     | boolean              | `false`        | Return calculated formula values in API responses.                                 |
| `storage.mode`                    | `'json'` or `'rows'` | `'json'`       | Store the complete value in the document or store rows in the managed collection.  |
| `storage.pagination`              | boolean or object    | `false`        | Enable bounded pages on the row-storage endpoint.                                  |
| `storage.pagination.defaultLimit` | number               | `50`           | Page size used when no `limit` is supplied.                                        |
| `storage.pagination.maxLimit`     | number               | `250`          | Largest page size accepted by the row-storage endpoint.                            |
| `formats`                         | DataTableFormat[]    | `[]`           | Configure background and text-color choices. The Format menu is hidden when empty. |
| `textFormats`                     | boolean or object    | `false`        | Enable bold, italic, underline, strikethrough, alignment, wrapping, and links.     |
| `stickyRows.enabled`              | boolean              | `true`         | Enable sticky-row behavior.                                                        |
| `stickyRows.top`                  | number               | `0`            | Number of rows frozen at the top.                                                  |
| `stickyRows.bottom`               | number               | `0`            | Number of rows frozen at the bottom.                                               |
| `admin.maxHeight`                 | number or string     | `640`          | Maximum editor height, such as `520` or `'60vh'`.                                  |

`textFormats` can be `true` to enable every text-format control, or an object such as `{ bold: true, alignment: true }` to enable selected controls. `formats` entries use `{ key, label, background, text? }`; colors can be CSS values or `{ light, dark }` objects.

## Formulas

Set `formulas.enabled` to `true` to allow formula cells. References use spreadsheet addresses such as `A1`, and ranges use `A1:B10`. Supported operators are `+`, `-`, `*`, `/`, and `^`. Supported functions are `SUM`, `AVERAGE`, `MIN`, `MAX`, and `COUNT`; function arguments can be individual references or ranges separated by commas.

```text
=A1+B1
=SUM(B2:B10)
=AVERAGE(C2,C4:C8)
```

Currency values, percentages, durations, dates, and times retain their display format when operands are compatible. Mixing formats is not supported: for example, adding `2.40ms` to `1s`, or `$4` to `€2`, returns `#VALUE!`. A formula with no numeric values in an `AVERAGE` range returns `#DIV/0!`.

Set `apiResponse.computeFormulas` to `true` when calculated values should be included in API responses. Formula values are always previewed in the admin editor; this option controls server response enrichment.

## Stored Data

The default value is a compact JSON object:

```typescript
type DataTableValue = {
  version: 1;
  columns: Array<{ id: string; label: string; width?: number }>;
  rows: Array<{ id: string; cells: Array<string | { formula: string }> }>;
  appearance?: DataTableAppearance;
};
```

`columnId`, `rowId`, and `cellId` are response-only fields. They are not stored unless an application explicitly writes them into another structure.

## Row-backed Storage

Use row-backed storage when a complete table should not be embedded in the parent document. The mode is opt-in and requires the plugin so Payload can register the hidden row collection, save hooks, and endpoint.

```typescript
import { buildConfig } from 'payload';
import { advancedFieldsPlugin } from '@studio123/payload-advanced-fields';
import { dataTableField } from '@studio123/payload-advanced-fields/data-table';

export default buildConfig({
  plugins: [advancedFieldsPlugin()],
  collections: [
    {
      slug: 'products',
      fields: [
        dataTableField({
          name: 'pricing',
          storage: {
            mode: 'rows',
            pagination: { enabled: true, defaultLimit: 50, maxLimit: 250 },
          },
        }),
      ],
    },
  ],
});
```

The parent document stores a versioned manifest and row count:

```typescript
{
  version: 1,
  columns: [{ id: 'column-id', label: 'Product' }],
  rows: [],
  storage: { mode: 'rows', rowCount: 10_000 },
}
```

Rows are stored in the hidden `data-table-rows` collection. With pagination enabled, consumers can request a page from:

```text
GET /api/:collection/:id/data-table-rows/:field?page=2&limit=50
```

The response includes `page`, `limit`, `totalRows`, `totalPages`, `hasPreviousPage`, and `hasNextPage`. Requested limits are capped by `storage.pagination.maxLimit`. When pagination is disabled, the endpoint returns all rows by default. The admin editor requests `all=true` so editing continues to work with the complete table.

The endpoint checks access to the parent document before reading row records. Direct client access to the managed row collection is disabled. `storage.mode: 'rows'` has no effect until `advancedFieldsPlugin()` is included in the Payload config.

## API Usage

```typescript
const table = document.pricing;

for (const row of table.rows) {
  for (const cell of row.cells) {
    console.log(cell);
  }
}
```

For row-backed tables, read the manifest from the normal document response and use the field endpoint when rows are needed. `apiResponse.includeIds` and `apiResponse.computeFormulas` apply to the normal field hook and to row endpoint responses.

## Notes

- Cells are strings or formula objects; formula objects are available only when formulas are enabled.
- CSV import uses the first row as column labels. CSV export preserves formula text.
- Rows and columns can be selected, inserted, deleted, moved, resized, and frozen from the admin menus and context menus.
- The admin editor virtualizes large row sets to reduce DOM work. Row-backed storage reduces document and API payload size separately from UI virtualization.
- The Storybook `Paginated API` story uses the 1,000-record customer fixture to show the row-backed manifest and pagination metadata. Persistence, access control, and hooks should be verified in a consuming Payload app.
