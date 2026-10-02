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
      rows: { initial: 10, min: 1, max: 250 },
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
| `rows.max`                        | number               | `250`          | Maximum number of rows; the hard ceiling is 250.                                   |
| `columns.initial`                 | number               | `3`            | Number of columns created for a new table.                                         |
| `columns.min`                     | number               | `1`            | Minimum number of columns.                                                         |
| `columns.max`                     | number               | `50`           | Maximum number of columns; the hard ceiling is 50.                                 |
| `formulas`                        | boolean or object    | `false`        | Enable spreadsheet formulas with `{ enabled: true }`.                              |
| `apiResponse.includeIds`          | boolean              | `false`        | Add `columnId`, `rowId`, and spreadsheet-style `cellId` values to API responses.   |
| `apiResponse.computeFormulas`     | boolean              | `false`        | Return calculated formula values in API responses.                                 |
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

`formulas.compute` is retained as a compatibility alias for `apiResponse.computeFormulas`. Setting it to `true` also enables computed values in API responses.

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

A table is limited to 250 rows and 50 columns; larger datasets are better represented by a collection.

## API Usage

```typescript
const table = document.pricing;

for (const row of table.rows) {
  for (const cell of row.cells) {
    console.log(cell);
  }
}
```

`apiResponse.includeIds` and `apiResponse.computeFormulas` control response enrichment for the JSON value.

## Notes

- Cells are strings or formula objects; formula objects are available only when formulas are enabled.
- CSV import uses the first row as column labels. CSV export preserves formula text.
- Rows and columns can be selected, inserted, deleted, moved, resized, and frozen from the admin menus and context menus.
- Tables can contain at most 250 rows and 50 columns. Use a collection for larger datasets.
