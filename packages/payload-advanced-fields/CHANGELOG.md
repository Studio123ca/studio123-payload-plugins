# Changelog

## 1.2.3

- Fixed formula copy and paste so formulas remain formula cells when moved through the clipboard.
- Fixed focused row and column headers using rounded corners instead of hard-edged table styling.
- Fixed column resizing so dragging the resize handle does not reorder the column.
- Constrained the selection indicator so long selections do not push the copy button off-screen.
- Added one-second checkmark feedback after copying the current selection.

## 1.2.2

- Fixed exclusive cell editing so keyboard events remain inside the editor instead of switching back to quick entry.
- Fixed Tab navigation between column headers so resize handles are skipped.
- Added a selection indicator with copy support and improved row, column, and header navigation.
- Added an Insert → Formulas submenu that inserts editable formula templates into the active cell.

## 1.2.1

- Added formula parsing that preserves compatible currency, percentage, and duration display values and rejects incompatible formatted operands.
- Added ISO date/time arithmetic with duration offsets and date-difference results.
- Expanded Formula Help with formatted-value examples.
- Matched Edit → Freeze submenu icons with the row context menu.
- Added spreadsheet-style direct entry for quickly replacing values in the selected cell without opening the editor.

## 1.2.0

- Rebuilt the Data Table field around TanStack Table with spreadsheet-style selection, deferred cell editing, keyboard navigation, row and column reordering, resizing, sticky rows, CSV import/export, formulas, and Payload-styled Radix menus and dialogs.
- Added bulk row and column insertion with user-entered counts, configurable unlimited dimensions, optional row and column limits, and a large-table row virtualization path.
- Made API response enrichment opt-in through `apiResponse.includeIds` and `apiResponse.computeFormulas`; compact stored values are now returned by default. `formulas.compute` remains supported as a compatibility alias.
- Added API response, formula, freeze-row, limited-dimensions, and large-data Storybook coverage, including live API response inspection and a 1,000-record customer fixture.
- Added dark-mode menu styling, Payload-aligned controls, confirmation for destructive table clearing, context-menu shortcuts, formula help, and expanded keyboard interaction coverage.

## 1.1.0

- Added a configurable Table field with JSON, CSV, structured, and spreadsheet modes, including editing tools, import/export, formulas, validation, and undo/redo.
- Added table appearance options for background palettes, sticky rows, column sizing, and maximum height.
- Allowed relative URLs in external Link fields.
- Added Storybook previews for every field, updated Payload to `4.0.0-canary.37`, and standardized repository formatting with Prettier.

## 1.0.4

- Added the new phone field with `libphonenumber-js` parsing, country selection, allowed-country validation, extension support, canonical metadata storage, and configurable formatting.
- Improved phone field editing behavior so invalid drafts stay visible with their selected country instead of reverting to the previously saved value.

## 1.0.3

- Introduced the color field with a polished swatch picker UI and other picker options via `react-color`.
- Refined the code field editor wrapper, localization handling, and read-only behavior.
- Refined the link field preview, modal flow, runtime collection resolution, and validation.

## 1.0.2

- Fixed link field hydration behavior.

## 1.0.1

- Refreshed package documentation.

## 1.0.0

- Initial release of the advanced field package.
