# Changelog

## 1.3.2 - 2026-10-02

- Normalized computed formula response cells before validation so saving an untouched Data Table does not fail.

## 1.3.1 - 2026-10-01

- Removed row-backed Data Table storage, including managed collections, hooks, manifests, and the paginated endpoint. Data Tables now use the same JSON field and editor in every configuration, capped at 250 rows and 50 columns.
- Added a live Payload admin/API regression test proving CSV imports replace a cleared JSON-backed table and persist the imported values.
- Prevented unsafe stored URLs from becoming clickable Link or Data Table preview links, and hardened internal Link URL resolution.
- Made Code and Data Table normalization and validation handle malformed runtime values without throwing.

## 1.3.0

- Added the UI-only Message Field for localized admin notices with info, success, warning, and error tones, plus an opt-in Banner presentation.
- Fixed Phone Field country defaults and dropdown focus behavior, exposed all supported countries when no allowlist is configured, preserved extensions during server normalization, hardened non-string validation, and moved custom formatter execution to the server hook.
- Fixed Color Field string defaults, empty preset handling, alpha preservation, malformed color validation, picker initialization, read-only interaction, and swatch accessibility.
- Added server-side `beforeValidate` normalization for phone and color fields while preserving user-provided hooks.
- Moved the Link Field drawer's Clear action to the left and Cancel beside Save.
- Expanded the Code Field with CSS, JavaScript, TypeScript, JSX, TSX, JSON, Markdown, and plain-text modes; added localized labels and descriptions, safe height and row handling, length validation, accessibility metadata, and client regression coverage.
- Added opt-in row-backed Data Table storage with a hidden managed row collection, parent access checks, and a paginated row endpoint.
- Added `storage.mode`, pagination limits, storage manifests, and shared row-page metadata for large tables.
- Updated the admin field to hydrate row-backed tables through the protected endpoint and updated the Paginated API Storybook story to exercise the row-backed response shape.

## 1.2.5

- Added Google Sheets-style keyboard shortcuts for selecting, inserting, and deleting rows and columns.
- Fixed row and column selection so the nearest surviving item remains selected after shortcut deletion.
- Adjusted quick-format toolbar icon sizing and corrected the Import CSV and Export CSV icon directions.

## 1.2.4

- Added nested Format → Background and Format → Text color submenus with independent text-color appearance storage.
- Added opt-in cell hyperlinks through `textFormats.link`, including a Payload-styled link dialog, toolbar action, `Mod+K` shortcut, safe URL validation, and Storybook coverage.
- Simplified links to URL-only values, made the link action toggle between Add and Remove, and added the crossed-out chain icon plus icons throughout Format → Text.
- Added a Paginated API Storybook story using the 1,000-record CSV fixture with page controls and pagination metadata.
- Fixed the Paginated API story to preserve global row and cell IDs across page boundaries.
- Refined the Add link dialog with compact Payload-aligned URL field styling.
- Clarified the link dialog field label to “Enter a URL”.
- Fixed the wrapping control so its default wrapped state toggles correctly, and updated its toolbar icon.
- Fixed wrapping styles being overridden by the cell content wrapper.
- Added long wrapped and unwrapped test rows to the Formatting Storybook story.
- Prevented unwrapped cell values from overflowing their cell boundaries by clipping them with an ellipsis.
- Fixed text wrapping toggles so an explicit unwrapped state persists and can be toggled back on.
- Updated the clear-formatting toolbar action to use the `TbClearFormatting` icon.

## 1.2.3

- Fixed formula copy and paste so formulas remain formula cells when moved through the clipboard.
- Fixed focused row and column headers using rounded corners instead of hard-edged table styling.
- Fixed column resizing so dragging the resize handle does not reorder the column.
- Fixed resized column widths being rejected by Payload validation when a drag exceeded the supported bounds.
- Constrained the selection indicator so long selections do not push the copy button off-screen.
- Added one-second checkmark feedback after copying the current selection.
- Added an inline text-formatting toolbar for active selections with React Icons, active-state highlighting, and grouped dividers for text styles, alignment, and clearing formats.
- Treated left alignment as the default active state for cells without an explicit alignment style.
- Grouped Insert menu actions into Rows, Columns, and Formulas submenus.
- Removed the divider between Rows and Columns and added insertion-specific icons.

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
