# Changelog

## Unreleased

- Added shared Table configuration, fixed background palettes with Payload theme fallbacks, row/cell styling, and measured top/bottom sticky rows. JSON stores appearance metadata; CSV and structured overrides are session-only.
- Added Payload confirmation before Clear table and `admin.maxHeight` for the scrollable grid.
- Sorted Storybook fields alphabetically and added palette, sticky-row, and confirmation examples.

- Synchronized cell height resizing across each row, centered structured select indicators, and made column borders track the cursor without automatic width redistribution.

- Added draggable column borders and View → Reset column widths; aligned row actions inline and removed excess native cell spacing and input chrome. Removed caption/header toggles from the editor; header visibility follows field configuration.

- Unified structured table styling with fixed column headers, replaced row/column menus with Payload popups, and grouped editor actions into Table, Edit, and Insert dropdowns.

- Replaced the standalone Table preview with repository Storybook stories for Table, Color, Code, Link, and Phone, using Payload providers, editable controls, local API fixtures, and accessibility tooling.

- Pinned Payload and `@payloadcms/ui` to `4.0.0-canary.37`, replacing the older canary declarations and internal-build lockfile resolution.
- Added `tableField()` with JSON-backed content tables, CSV-string content tables, native array-backed structured records, and JSON spreadsheets with optional bounded formulas.
- Added table editing, row/column operations, rectangular selection, TSV copy/paste, session undo/redo, CSV import/export, generated JSON schema, and server validation.
- Added the `/table` and `/table/client` entry points, shared formula/CSV helpers, field documentation, Storybook previews, and data/component/config integration tests.
- Included field guides and the changelog in the published package.
- Added workspace Prettier configuration and `format` / `format:check` scripts, and formatted existing sources and documentation.

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
