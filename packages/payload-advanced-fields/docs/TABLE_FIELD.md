# Table field

`tableField()` adds a table editor to Payload collections, globals, groups, arrays, and blocks. Import the factory from `@studio123/payload-advanced-fields/table`. No plugin registration is required; regenerate your application's Payload import map after adding the field.

This release targets **Payload and @payloadcms/ui 4.0.0-canary.37**.

## Choose a mode and storage format

| Configuration                                            | Payload field | API value                       | Columns                                                    |
| -------------------------------------------------------- | ------------- | ------------------------------- | ---------------------------------------------------------- |
| `mode: 'content'` (default), `storage: 'json'` (default) | `json`        | `TableValue`                    | Editor-defined; text cells                                 |
| `mode: 'content', storage: 'csv'`                        | `textarea`    | CSV string                      | Editor-defined; text cells                                 |
| `mode: 'structured'`                                     | `array`       | Array of native Payload records | Developer-defined, typed fields                            |
| `mode: 'spreadsheet'`                                    | `json`        | `TableValue`                    | Editor-defined; text, numbers, booleans, optional formulas |

CSV storage is intended for integrations that need **a CSV string in the database and API**. CSV import/export is also available for JSON content tables and spreadsheets, so choosing CSV storage is not necessary just to exchange files.

CSV cannot retain captions, column widths, stable row/column IDs, or typed formula cells. Those features require JSON. Structured tables retain Payload's native array storage. CSV storage with spreadsheet mode or formulas is rejected during configuration.

## Content table

```ts
import { tableField } from '@studio123/payload-advanced-fields/table';

tableField({
  name: 'specifications',
  label: 'Specifications',
  mode: 'content',
  required: true,
  initialRows: 3,
  initialColumns: 2,
  maxRows: 50,
  maxColumns: 8,
  headerRow: true,
  localized: true,
  admin: { description: 'Compare features across models.' },
});
```

Editors can edit cells and headers, add/duplicate/delete/reorder rows and columns, drag column borders to resize them. The field configuration controls header visibility; the editor has no caption input. Text is stored as text, including numbers, leading zeros, and strings beginning with `=`. No HTML or rich text is interpreted.

An unset field stays unset until the editor chooses **Create table**, imports CSV, or supplies data through the API. `initialRows` and `initialColumns` determine the dimensions created by that button; they are not database defaults.

## CSV-backed content table

```ts
tableField({
  name: 'priceListCSV',
  label: 'Price list',
  storage: 'csv',
  headerRow: true,
  maxRows: 100,
  maxColumns: 10,
});
```

The API value is a string such as:

```csv
Product,Price
"Widget, large",19.95
Widget small,9.95
```

`headerRow: true` treats the first CSV row as column labels. With `false`, every row is body data and the editor shows lettered column headings. This setting is fixed by the field configuration in every mode. For JSON, the stored header flag is synchronized on the next editor change.

The editor supports commas, escaped quotes, CRLF/LF line endings, embedded newlines, Unicode, blank cells, and a UTF-8 BOM. Ragged rows are padded with empty cells. Editing normalizes serialization to comma delimiters and CRLF line endings; it preserves cell text, not the original file's exact bytes. Blank cells are quoted when serialized to preserve empty final rows.

Row/column IDs exist only for the current editing session. Captions and persistent column widths are unavailable. An empty optional field can be `null`, absent, or an empty string; the editor's **Clear table** action writes `null`.

The raw stored CSV preserves literal text, including `=...`. **Export CSV** is a separate, spreadsheet-safe operation described below; do not treat raw API CSV as a sanitized spreadsheet download.

## Structured records

```ts
tableField({
  name: 'lineItems',
  mode: 'structured',
  required: true,
  minRows: 1,
  maxRows: 100,
  columns: [
    { name: 'description', type: 'text', required: true },
    { name: 'quantity', type: 'number', min: 0, required: true },
    { name: 'available', type: 'checkbox', defaultValue: true },
    {
      name: 'category',
      type: 'select',
      options: ['hardware', 'service'],
    },
    { name: 'notes', type: 'textarea' },
  ],
});
```

Columns are native Payload `text`, `textarea`, `number`, `checkbox`, or `select` fields. Their defaults, validation, hooks, generated types, conditions, and field permissions remain on Payload's native field path. Names must be unique; `id` is reserved for Payload's row identity. Relationship, upload, rich-text, date, nested array, and arbitrary custom column types are not supported in this release.

The API returns ordinary array records:

```json
[{ "id": "payload-row-id", "description": "Widget", "quantity": 2, "available": true }]
```

The table renders native field editors with their labels and errors. Editors can add, duplicate, delete, and reorder rows. `admin.isSortable: false` hides reorder controls. Columns cannot be added or removed by editors.

Bulk paste, rectangular selection, CSV import/export, and table-level undo/redo currently apply to content/spreadsheet tables only. Structured tables use native Payload row operations; records with hidden or restricted fields are not flattened into a clipboard or CSV representation.

## Spreadsheet mode

```ts
tableField({
  name: 'estimates',
  mode: 'spreadsheet',
  formulas: true,
  maxRows: 500,
  maxColumns: 30,
});
```

Inputs such as `12`, `1.25`, and `1e3` become numbers; lowercase `true` and `false` become booleans. Leading-zero strings such as `0012` remain text. Prefix an input with an apostrophe to force text: `'123`, `'true`, or `'=A1+1`. That escape apostrophe is not stored. Empty cells are stored as empty strings; API clients may also supply `null`.

With `formulas: true`, an input beginning with `=` is stored as `{ formula: '=A1+B1' }`. An unfocused cell displays its result; focus shows its expression. JSON API reads evaluate formulas server-side by default and return both the computed `value` and original `formula`; set `computeFormulas: false` to return the stored value instead. With formulas disabled, `=...` remains literal text.

Supported formula syntax:

- Numeric literals, parentheses, `+`, `-`, `*`, `/`, and `^`; standard precedence, including right-associative exponentiation.
- Case-insensitive A1 references and rectangular ranges such as `A1:C5`.
- `SUM`, `AVERAGE`, `MIN`, `MAX`, and `COUNT`, with comma-separated arguments and ranges.

Addresses always refer to **body cells**: column labels and the optional header row do not affect numbering. References are positional. Moving, inserting, duplicating, or deleting rows/columns does **not rewrite expressions**; an expression such as `=A1` continues to refer to the current A1. This is a bounded table calculator, not an Excel-compatible workbook engine.

JSON API reads add explicit response-only identifiers: `columnId`, `rowId`, and `{ cellId, value }` cell records. They preserve the compact stored table shape while giving integrations stable IDs and the current A1-style address:

```json
{
  "columns": [{ "id": "column-id", "columnId": "column-id", "label": "Quantity" }],
  "rows": [{ "id": "row-id", "rowId": "row-id", "cells": [{ "cellId": "A1", "value": 12 }] }]
}
```

These IDs are response-only and are ignored by the admin editor on a subsequent read. CSV and structured tables retain their respective API shapes.

Arithmetic treats blank/null cells as zero and booleans as 0/1. Aggregates count/use numeric values and ignore text, blanks, and booleans. Errors in referenced formulas propagate. Supported errors are `#ERROR!`, `#NAME?`, `#REF!`, `#VALUE!`, `#DIV/0!`, `#NUM!`, `#CYCLE!`, and `#LIMIT!`.

Expressions are parsed without `eval`, `Function`, property access, external references, or network calls. Formula length is limited to 1,024 characters; parsing/reference depth is limited to 64, and one evaluation has a shared work budget. Error-producing expressions can be saved so editors can fix them later. Structurally invalid formula values are rejected by server validation.

Results are **derived, not persisted**. Use the same exported evaluator in your frontend or server:

```ts
import { evaluateTable } from '@studio123/payload-advanced-fields/table';

const resultRows = evaluateTable(document.estimates);
// Array of rows containing strings, numbers, booleans, null, or error strings.
```

## Keyboard, clipboard, history, and files

- The toolbar's **Help** button opens a Payload drawer with the relevant navigation, selection, paste, and formula guidance.
- Tab/Shift+Tab move the selected cell forward or backward; at either end, Tab leaves the table normally.
- Arrow keys move the selected cell. Shift+Arrow, Shift-click, or dragging across cells extends a rectangular selection.
- Double-click a cell or press Enter when it is selected to edit it. While editing, Enter/Shift+Enter move down/up, Alt+Enter inserts a line break, and Escape exits editing. Click a row or column header to select it; right-click a header for its actions.
- **Sort** orders rows by the selected column, using calculated values for spreadsheet formulas and keeping blank cells last.
- **Format** opens separate cell and row style menus, keeping palette choices out of the main toolbar menu.
- Click a row or column header to select it, then drag the selected header onto another row or column to reorganize the grid. The row and column context menus also provide move commands.
- Use a row or column menu to add a blank row or column before or after its current position.
- **Copy cells** and **Paste cells** work with the current selection as TSV. The browser's Copy/Paste commands also work directly in the grid; within one cell, they retain normal text editing behavior.
- Multi-cell TSV paste starts at the selection's top-left corner and can expand the table within its limits. A rejected paste leaves the table unchanged. Single-line, single-cell paste uses ordinary text editing.
- **Clear cells**, Delete, and Backspace empty the selection; **Clear table** removes the entire value. Undo can restore either action.
- Undo/Redo retain up to 50 table edits during the current editing session. Paste/import are single actions. Cell keystrokes are separate edits. History is cleared by external form resets, version restores that change the value, locale changes, or switching nested field paths.
- **Import CSV** replaces the current table as one undoable action, using the current header-row setting. JSON captions are retained; imported columns get new IDs. Files are limited to 2 MB. Use UTF-8 comma-separated CSV; semicolon-delimited regional exports and XLSX are not supported.
- **Export CSV** includes the header row when enabled, omits captions/IDs/widths, and exports calculated spreadsheet values rather than expressions. Potential spreadsheet-execution prefixes (`=`, `+`, `-`, `@`, leading tabs/newlines) are escaped with a leading apostrophe, including negative numbers. This export is intended for interchange, not lossless backup. Use the JSON API to preserve formulas, types, and metadata.

## Options

Standard Payload field options such as `name`, `label`, `required`, `localized`, `access`, `hooks`, `defaultValue`, `validate`, and `admin` are accepted for the underlying field type. Defaults are `name: 'table'`, `label: 'Table'`, and optional/nonlocalized. `admin.components.Field` may override the supplied editor.

Content/spreadsheet options:

| Option           | Default                       | Meaning                                                   |
| ---------------- | ----------------------------- | --------------------------------------------------------- |
| `mode`           | `'content'`                   | `'content'` or `'spreadsheet'`                            |
| `storage`        | `'json'`                      | `'csv'` is supported only for content                     |
| `initialRows`    | 2, adjusted to limits         | Rows on Create table                                      |
| `initialColumns` | 2, adjusted to limits         | Columns on Create table                                   |
| `minRows`        | 0                             | Minimum body rows when a table is present                 |
| `maxRows`        | 100 content / 500 spreadsheet | Maximum body rows                                         |
| `minColumns`     | 1                             | Minimum columns when a table is present                   |
| `maxColumns`     | 20 content / 30 spreadsheet   | Maximum columns                                           |
| `headerRow`      | `true`                        | Fixed editor header visibility and CSV parsing setting    |
| `caption`        | `true` JSON / `false` CSV     | Legacy compatibility option; no caption input is rendered |
| `formulas`       | `false`                       | Enable the spreadsheet expression grammar                 |

Limits are checked at configuration time. The hard ceiling is 1,000 rows and 100 columns, and each cell/header/caption is limited to 10,000 characters. The editor renders the whole table without virtualization: use conservative limits for responsive editing. It is intended for content tables, not large analytical datasets.

For JSON/CSV, `required` means at least one nonblank **body cell**; headers, captions, or appearance metadata alone do not satisfy it. `0` and `false` count as content in spreadsheets. Optional unset values remain valid even with a configured `minRows`. Built-in shape/limit validation runs before a caller's custom `validate` function. Payload runs these validators for normal server/API writes as well as admin saves; its normal draft-validation behavior still applies.

Structured mode accepts native array options and a required `columns` array. Native Payload array/column validation applies, including the usual semantics of custom validators. Standard field labels/descriptions can be localized. Table action text is currently English. JSON/CSV content localization applies to the whole table value, not independent cell translations.

## JSON value and rendering

```ts
type TableValue = {
  version: 1;
  caption: string;
  headerRow: boolean;
  columns: { id: string; label: string; width?: number }[];
  rows: {
    id: string;
    cells: (string | number | boolean | null | { formula: string })[];
  }[];
};
```

Content mode permits only strings in `cells`. Row and column IDs must be nonempty and unique across the table; every row has one cell per column. The field supplies a JSON schema for generated Payload types. `TableValue`, `TableCell`, `TableColumn`, the field configuration types, and `TableResult` are exported for consumers.

The package provides an admin editor, not a public-site renderer. Render values with your framework's normal text escaping. For example:

```tsx
import { evaluateTable, type TableValue } from '@studio123/payload-advanced-fields/table';

export function ContentTable({ value }: { value: TableValue }) {
  const results = evaluateTable(value);
  return (
    <table>
      {value.caption && <caption>{value.caption}</caption>}
      {value.headerRow && (
        <thead>
          <tr>
            {value.columns.map((column) => (
              <th key={column.id} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {value.rows.map((row, r) => (
          <tr key={row.id}>
            {row.cells.map((_, c) => (
              <td key={value.columns[c].id}>{String(results[r][c] ?? '')}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Helpers `resolveTableOptions`, `createTable`, `validateTable`, `csvToTable`, and `tableToCSV` are available from `/table` for API integrations. Resolve options before passing them to those helpers. `tableToCSV` is a raw serializer; it does not provide the download escaping used by the editor. `csvToTable` creates session IDs and performs parsing/shape validation; it does not apply spreadsheet type inference.

## Storage changes and migrations

Do not change `mode`, `storage`, or the CSV `headerRow` setting on an existing production field without migrating its values. JSON, CSV strings, and native array records have different contracts; the factory does not silently convert stored data. CSV-to-JSON migrations must also change the underlying database field type as required by the database adapter. JSON-to-CSV conversion loses captions, IDs, widths, types, and formula structure. Preserve a backup first.

Malformed or unsupported stored data is displayed as an error in the admin and preserved, rather than replaced with an empty table. Use an API migration or a valid document version to repair it.

## Development verification

```sh
npm test --workspace @studio123/payload-advanced-fields
npm run typecheck
npm run storybook
```

Tests cover parsing/serialization, validation, immutable paste/reorder operations, formulas, React editing/history/read-only behavior, nested path delegation, and real canary config sanitization for collections, globals, arrays, and blocks. UI tests use a small Payload context adapter and do not require a database. Storybook uses real Payload providers and controls with local API fixtures for all three table modes and JSON/CSV storage. See the [Storybook guide](../../../storybook/README.md).

Before releasing into a consuming app, also verify its import map, database save/reload, drafts/version restore, locale switching, and restricted-user permissions in that app's real admin. No database-backed admin is bundled in this repository.

### Admin menus and structured headers

Content and spreadsheet tables use a compact menu row: **Table** contains create/clear and CSV import/export, **Edit** contains undo/redo and copy/clear cells, and **Insert** adds rows or columns, and **View → Reset column widths** restores the default sizes. Right-click row and column headers to open their Payload-styled context menus without expanding or clipping the grid.

Structured tables display fixed headers from each configured column's label (falling back to its field name). Editors cannot rename these headers. Native input labels remain available to assistive technology while the visible label appears once above the column; native field permissions, validation, and controls are retained.

Drag the right border of a column header to resize it from 100–600px. Focus the border and use Left/Right arrows for 10px increments (Shift for 50px). JSON widths are persisted with a single undo entry per drag; CSV and structured widths remain local to the editing session. Resetting JSON widths is also undoable. Existing JSON caption metadata is preserved, but no caption input is shown.

Dragging a textarea's lower corner adjusts the height of all editable cells in that row, including when shrinking it again. Row heights are session-only. Column borders track the cursor directly; columns are not redistributed to fill unused viewport space. Native structured selects and number inputs share the same cell height and vertically centered controls.

## Background palettes and sticky rows

Tables accept shared configuration alongside the Link configuration. Use either `configureAdvancedFields` or the `table` option on `advancedFieldsPlugin`:

```ts
import { advancedFieldsPlugin, tableField } from '@studio123/payload-advanced-fields';

// Inside buildConfig:
const plugins = [
  advancedFieldsPlugin({
    table: {
      palette: [
        {
          key: 'brand',
          label: 'Brand',
          background: { light: '#d9eee7', dark: '#24463c' },
          text: { light: '#163c2e', dark: '#e7fff3' },
        },
        { key: 'highlight', label: 'Highlight', background: '#fff3c4', text: '#403300' },
      ],
      stickyRows: { enabled: true, top: 1, bottom: 0 },
    },
  }),
];

const comparison = tableField({
  name: 'comparison',
  admin: { maxHeight: '60vh' },
  stickyRows: { bottom: 1 }, // Inherits enabled/top from shared configuration.
});
```

`configureAdvancedFields({ table: { ... } })` configures the same registry. Table presentation options are resolved when Payload reads client props or validates the field, so plugin configuration can run after `tableField()` constructs fields. As with the existing Link registry, this is process-wide configuration: configure one Payload app consistently at startup.

Precedence is **field → shared Table config → built-in defaults**. A field palette replaces the entire shared palette; `palette: []` disables background choices. Without a configured palette, the fixed choices are Muted, Highlight, Success, and Danger using Payload semantic theme tokens. Palette entries accept a CSS color string or `{ light, dark }` for `background` and optional `text`. Use contrasting text colors for custom backgrounds; colors are not automatically contrast-corrected. Keys must be unique, 1–100 letters/digits/underscores/hyphens; at most 32 entries are allowed.

Select a cell or rectangle and use **Format → Cell background** or **Row background**. Structured tables style the focused/clicked cell or its row. Row menus also expose row backgrounds. A cell override wins over the row background; clearing the cell override restores inheritance. Removed palette keys remain in JSON metadata but display the normal table background until configured again. No arbitrary color picker or raw CSS is stored in document values.

Row menus provide **Freeze through this row** and **Freeze from this row to bottom**. Freezing keeps contiguous top/bottom groups in their existing order. The header remains above frozen top rows. **View → Unfreeze rows** clears both groups. Top rows take priority if counts would overlap, and counts are clamped to available rows. `stickyRows.enabled: false` hides these actions and ignores stored freeze settings without deleting them. Row reordering preserves background assignments by stable IDs; frozen groups follow positions. Offsets update when rows resize or their content changes.

| Mode                        | Background/freeze changes                                      |
| --------------------------- | -------------------------------------------------------------- |
| JSON content or spreadsheet | Saved as optional `appearance` metadata; included in undo/redo |
| CSV                         | Session-only; CSV text is unchanged                            |
| Structured                  | Session-only; native array records are unchanged               |

JSON `version: 1` values remain compatible: older values need no migration. Optional appearance metadata is:

```ts
appearance?: {
  rows?: Record<RowID, PaletteKey>;
  cells?: Record<RowID, Record<ColumnID, PaletteKey>>;
  stickyRows?: { top: number; bottom: number };
};
```

Missing `stickyRows` uses configured defaults; explicit `{ top: 0, bottom: 0 }` overrides defaults. Deleted rows/columns have their styling references removed on editor changes. CSV import replaces the grid and discards JSON appearance; CSV export contains data only. For frontend rendering, resolve the stored keys against the same palette and apply row backgrounds before cell overrides. Sticky behavior applies to the admin's scroll container, not automatically to frontend output.

### Grid height

`admin.maxHeight` applies to the scrollable grid in every mode, leaving menus outside it. The default is `640` pixels. It accepts positive pixel numbers or CSS lengths such as `'32rem'`, `'60vh'`, or `'480px'`. It does not change row heights or stored data. Choose enough space for the configured frozen rows and a scrollable body.

### Clearing a table

**Table → Clear table** opens Payload's confirmation dialog. Cancel, Escape, or closing the dialog preserves the table. Confirming clears the value; the change remains undoable during the current editing session. Read-only tables cannot clear data.
