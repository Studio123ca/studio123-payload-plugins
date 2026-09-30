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
      rows: { initial: 3, min: 1 },
      columns: { initial: 3, min: 1 },
      formulas: { enabled: true },
      apiResponse: { computeFormulas: true, includeIds: true },
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

`rows.initial` and `columns.initial` default to `3`; `rows.min` and `columns.min` default to `1`. Maximum dimensions are unlimited unless `rows.max` or `columns.max` is explicitly configured. `admin.maxHeight` accepts a positive pixel number or a CSS length and defaults to `640`.

This is a new field type. Existing `tableField` values and configuration are not migrated or read by `dataTableField`.

Formula configuration accepts the boolean shorthand `formulas: true` or an object. The object form controls whether formulas are enabled. API calculation is configured separately:

```ts
formulas: { enabled: true },
apiResponse: { computeFormulas: true }
```

`formulas.compute` remains accepted as a compatibility alias for `apiResponse.computeFormulas`, but new configurations should use `apiResponse.computeFormulas`.

Formula arithmetic accepts common formatted numeric strings and preserves compatible formatting in the result. Currency values retain their currency prefix and two decimal places, percentages retain the percent sign, durations retain their unit, and ISO dates/times retain their date or time display. Dates and times can be offset by durations, and subtracting two dates returns a duration. Formatted values with incompatible units or currencies (for example, `2.40ms + 1s` or `$4 + €2`) return `#VALUE!`. Percentages can be multiplied by plain numbers, so `10% * 1,000` evaluates to `100`.

Formatting choices are supplied by the field configuration through `formats`. Each format has a stable `key`, a visible `label`, and a background color; an optional `text` color can also be provided. The Format menu and formatting context-menu item are omitted when `formats` is empty or not supplied.

Configured background choices are available under Format → Background. Choices that define a `text` color are also available under Format → Text color and are stored independently, so changing text color does not replace the selected background.

Cell text formatting is independently opt-in through `textFormats`. Set it to `true` to enable bold, italic, underline, strikethrough, alignment, and wrapping, or pass an object to enable only selected controls. Text formatting is stored in the table appearance and can be applied to a single cell or a multi-cell selection. The keyboard shortcuts are `Mod+B`, `Mod+I`, `Mod+U`, `Mod+Shift+X`, and `Mod+Shift+L/E/R` for left, center, and right alignment.

Set `textFormats.link` to `true` to enable cell hyperlinks. Links are stored as appearance metadata with a URL, and only `http:`, `https:`, and `mailto:` URLs are accepted. Linked cells render as safe external anchors while remaining editable as plain cell values.

API responses keep the compact stored value by default. The `afterRead` transformation is opt-in through `apiResponse`:

```ts
apiResponse: {
  includeIds: true,
  computeFormulas: true,
}
```

`includeIds` adds response-only `columnId`, `rowId`, and spreadsheet-style `cellId` values. `computeFormulas` evaluates formulas and returns each cell as an object containing its calculated `value`, plus `formula` when the source cell is a formula. These options are independent, so clients can request IDs without calculation or calculation without the extra IDs. With both disabled, the API returns the stored `columns`, `rows`, and cell values unchanged. This keeps large responses smaller and avoids running the server-side formula evaluator unless requested.

The current field hook does not paginate a nested JSON value. For very large tables, a future dedicated table endpoint should return row ranges with explicit pagination metadata rather than silently truncating the normal document response.

The Table menu imports and exports CSV. The first CSV row is used for column labels, and formula cells retain their `=...` text during export. Column widths update while dragging, and an active cell's textarea resize handle keeps the rest of its row aligned. Tables with more than 200 rows use row virtualization in the admin editor so only visible rows and a small overscan buffer are mounted.

The Storybook examples include Playground, Populated, Formulas, API Response, Paginated API, Formatting, Formula Formats, Freeze Rows, Limited Columns/Rows, Large Data Table, Read Only, and Required Empty. Formatting combines background and cell text formatting examples, while Formula Formats groups currency, percentage, duration, date, time, and incompatible-unit examples in one table. The API Response story displays the live `afterRead` output beside the editor. The Paginated API story uses the 1,000-record customer CSV to demonstrate a page window with explicit pagination metadata. The Large Data Table story loads the same fixture to exercise virtualization and large-table interactions.
