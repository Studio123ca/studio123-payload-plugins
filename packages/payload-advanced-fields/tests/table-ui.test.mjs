import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { act, createElement } from 'react';
import {
  createDataTable,
  createDataTableStorageManifest,
  dataTableField,
  resolveDataTableOptions,
} from '../dist/data-table-field/index.js';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
await mkdir(resolve(packageRoot, '.cache'), { recursive: true });
const directory = await mkdtemp(resolve(packageRoot, '.cache/data-table-ui-'));
const entry = resolve(directory, 'components.mjs');
await build({
  entryPoints: [resolve(packageRoot, 'tests/fixtures/components.ts')],
  outfile: entry,
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  alias: { '@payloadcms/ui': resolve(packageRoot, 'tests/fixtures/payload-ui.tsx') },
  loader: { '.css': 'empty' },
});
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true });
for (const name of [
  'window',
  'document',
  'HTMLElement',
  'Element',
  'Node',
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'Event',
  'CustomEvent',
  'KeyboardEvent',
  'MouseEvent',
  'getComputedStyle',
  'MutationObserver',
  'DOMRect',
])
  globalThis[name] = dom.window[name];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const { DataTableField, Fixture } = await import(pathToFileURL(entry));
let root;
const options = resolveDataTableOptions({ rows: { initial: 1 }, columns: { initial: 1 } });
const formatOptions = resolveDataTableOptions({
  rows: { initial: 1 },
  columns: { initial: 1 },
  formats: [{ key: 'highlight', label: 'Highlight', background: '#fff3c4' }],
});
const formulaOptions = resolveDataTableOptions({
  rows: { initial: 1 },
  columns: { initial: 1 },
  formulas: { enabled: true, compute: false },
});
const field = { name: 'dataTable', type: 'json', label: 'Data Table' };

async function render({
  value = null,
  readOnly = false,
  tableOptions = options,
  documentInfo = {},
  config = {},
  locale = 'en',
} = {}) {
  if (!root) root = createRoot(document.querySelector('#root'));
  await act(async () =>
    root.render(
      createElement(
        Fixture,
        { initialValue: value, documentInfo, config, locale },
        createElement(DataTableField, { field, path: 'dataTable', options: tableOptions, readOnly }),
      ),
    ),
  );
}
const button = (text) => [...document.querySelectorAll('button')].find((element) => element.textContent === text);
const menuItem = (text) =>
  [...document.querySelectorAll('[role="menuitem"]')].find((element) => element.textContent.trim().startsWith(text));
const stored = () => JSON.parse(document.querySelector('[data-value]').textContent);
async function selectMenuItem(menu, item) {
  await act(async () => {
    button(menu).dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true, button: 0 }));
  });
  await act(async () => menuItem(item).click());
}
async function selectNestedMenuItem(menu, submenu, item) {
  await act(async () => {
    button(menu).dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true, button: 0 }));
  });
  await act(async () => menuItem(submenu).click());
  await act(async () => menuItem(item).click());
}
after(async () => {
  if (root) await act(async () => root.unmount());
  dom.window.close();
  await rm(directory, { recursive: true, force: true });
});

test('creates and edits a Data Table value', async () => {
  await render();
  await act(async () => button('Create Table').click());
  const cell = document.querySelector('[data-context-cell="0:0"]');
  await act(async () => cell.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true })));
  const input = document.querySelector('textarea');
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(input, 'Widget');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.equal(stored().rows[0].cells[0], 'Widget');
  await selectNestedMenuItem('Insert', 'Columns', 'Add column');
  await selectNestedMenuItem('Insert', 'Rows', 'Add row');
  assert.equal(stored().columns.length, 2);
  assert.equal(stored().rows.length, 2);
  await selectMenuItem('Edit', 'Undo');
  assert.equal(stored().rows.length, 1);
  await selectMenuItem('Edit', 'Undo');
  assert.equal(stored().columns.length, 1);
});

test('CSV import replaces an existing JSON table', async () => {
  const tableOptions = resolveDataTableOptions({
    columns: { max: 3 },
    rows: { max: 200 },
    formulas: { enabled: true, compute: true },
  });
  const value = createDataTable(tableOptions);
  value.rows[0].cells[0] = 'Saved value';
  const savedResponse = dataTableField({ name: 'dataTable', ...tableOptions }).hooks.afterRead[0]({ value });
  await render({ value: savedResponse, tableOptions });
  const input = document.querySelector('input[aria-label="Import CSV"]');
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [{ text: async () => 'Product\nNew CSV value' }],
  });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  assert.equal(stored().columns[0].label, 'Product');
  assert.equal(stored().rows[0].cells[0], 'New CSV value');
});

test('CSV import replaces a newly created table after the saved field was null', async () => {
  const tableOptions = resolveDataTableOptions({
    columns: { max: 3 },
    rows: { max: 200 },
    formulas: { enabled: true, compute: true },
  });
  await render({ value: null, tableOptions });
  await act(async () => button('Create Table').click());
  const input = document.querySelector('input[aria-label="Import CSV"]');
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [{ text: async () => 'Bounce #,Surface,Undergrounds\n1,2.010s,2.008s\nAverage,2.025s,2.015s' }],
  });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  assert.deepEqual(
    stored().columns.map((column) => column.label),
    ['Bounce #', 'Surface', 'Undergrounds'],
  );
  assert.equal(stored().rows.length, 2);
  assert.deepEqual(stored().rows[0].cells, ['1', '2.010s', '2.008s']);
});

test('CSV import over the configured column limit keeps the saved table and reports the rejection', async () => {
  const tableOptions = resolveDataTableOptions({ columns: { max: 3 }, rows: { max: 200 } });
  const value = createDataTable(tableOptions);
  value.rows[0].cells[0] = 'Saved value';
  await render({ value, tableOptions });
  const input = document.querySelector('input[aria-label="Import CSV"]');
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [{ text: async () => 'A,B,C,D\n1,2,3,4' }],
  });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  assert.equal(stored().rows[0].cells[0], 'Saved value');
  assert.match(document.querySelector('[role="alert"]')?.textContent ?? '', /exceeds 3 columns/);
});

test('places the caret at the end when entering cell edit mode', async () => {
  const value = createDataTable(resolveDataTableOptions({ rows: { initial: 1 }, columns: { initial: 1 } }));
  value.rows[0].cells[0] = 'Existing value';
  await render({ value });
  const cell = document.querySelector('[data-context-cell="0:0"]');
  await act(async () => cell.focus());
  await act(async () =>
    cell.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })),
  );
  const input = document.querySelector('textarea');
  assert.equal(input?.selectionStart, 'Existing value'.length);
  assert.equal(input?.selectionEnd, 'Existing value'.length);
});

test('restores grid focus after cancelling cell editing', async () => {
  const value = createDataTable(resolveDataTableOptions({ rows: { initial: 1 }, columns: { initial: 2 } }));
  value.rows[0].cells[0] = 'Existing value';
  await render({ value });
  const cell = document.querySelector('[data-context-cell="0:0"]');
  await act(async () => cell.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true })));
  const input = document.querySelector('textarea');
  await act(async () =>
    input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })),
  );
  assert.equal(document.querySelector('textarea'), null);
  assert.equal(document.activeElement?.dataset.contextCell, '0:0');
  const right = new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
  await act(async () => document.activeElement.dispatchEvent(right));
  assert.equal(document.activeElement?.dataset.contextCell, '0:1');
});

test('keeps keyboard events inside exclusive cell editing mode', async () => {
  const value = createDataTable(resolveDataTableOptions({ rows: { initial: 1 }, columns: { initial: 2 } }));
  value.rows[0].cells[0] = 'Existing value';
  await render({ value });
  const cell = document.querySelector('[data-context-cell="0:0"]');
  await act(async () => cell.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true })));
  const input = document.querySelector('textarea');
  const key = new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
  await act(async () => input.dispatchEvent(key));
  assert.equal(document.querySelector('textarea'), input);
  assert.equal(document.activeElement, input);
  assert.equal(document.querySelector('[data-context-cell="0:1"]')?.dataset.selected, undefined);
});

test('confirms before clearing the table', async () => {
  const value = createDataTable(options);
  await render({ value });
  await selectMenuItem('Table', 'Clear table');
  assert.match(document.querySelector('[role="dialog"]')?.textContent ?? '', /remove all rows/);
  await act(async () => document.querySelector('[role="dialog"] button')?.click());
  assert.notEqual(stored(), null);
  await selectMenuItem('Table', 'Clear table');
  await act(async () => [...document.querySelectorAll('[role="dialog"] button')].at(-1)?.click());
  assert.equal(stored(), null);
});

test('freezes rows from the active cell through the Edit menu', async () => {
  const freezeOptions = resolveDataTableOptions({ rows: { initial: 2 }, columns: { initial: 1 } });
  const value = createDataTable(freezeOptions);
  await render({ value, tableOptions: freezeOptions });
  await act(async () =>
    document
      .querySelector('[data-context-cell="1:0"]')
      .dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, button: 0 })),
  );
  await act(async () => {
    button('Edit').dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true, button: 0 }));
  });
  await act(async () => menuItem('Freeze rows').click());
  await act(async () => menuItem('Freeze through current row').click());
  assert.deepEqual(stored().appearance.stickyRows, { top: 2, bottom: 0 });
  await act(async () => {
    button('Edit').dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true, button: 0 }));
  });
  await act(async () => menuItem('Freeze rows').click());
  await act(async () => menuItem('Unfreeze rows').click());
  assert.deepEqual(stored().appearance.stickyRows, { top: 0, bottom: 0 });
});

test('bulk adds rows and columns from the Insert menu', async () => {
  const bulkOptions = resolveDataTableOptions({
    rows: { initial: 1, max: 10 },
    columns: { initial: 1, max: 10 },
  });
  await render({ value: createDataTable(bulkOptions), tableOptions: bulkOptions });
  await selectNestedMenuItem('Insert', 'Rows', 'Add rows…');
  await act(async () => {
    const input = document.querySelector('[role="dialog"] input[type="number"]');
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, '5');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    [...document.querySelectorAll('[role="dialog"] button')]
      .find((button) => button.textContent === 'Add rows')
      .click();
  });
  await selectNestedMenuItem('Insert', 'Columns', 'Add columns…');
  await act(async () => {
    const input = document.querySelector('[role="dialog"] input[type="number"]');
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, '5');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    [...document.querySelectorAll('[role="dialog"] button')]
      .find((button) => button.textContent === 'Add columns')
      .click();
  });
  assert.equal(stored().rows.length, 6);
  assert.equal(stored().columns.length, 6);
});

test('virtualizes large row sets while preserving the table row count', async () => {
  const largeOptions = resolveDataTableOptions({ rows: { initial: 250 }, columns: { initial: 2 } });
  await render({ value: createDataTable(largeOptions), tableOptions: largeOptions });
  const renderedRows = document.querySelectorAll('tbody th[data-context-row]');
  assert.ok(renderedRows.length < 250);
  assert.ok(renderedRows.length > 0);
});

test('updates headers and respects read-only mode', async () => {
  const value = createDataTable(options);
  await render({ value });
  const headerCell = document.querySelector('[data-context-column="0"]');
  assert.equal(document.querySelector('input[aria-label="Column 1"]'), null);
  await act(async () => headerCell.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true })));
  const header = document.querySelector('input[aria-label="Column 1"]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(header, 'Product');
    header.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.equal(stored().columns[0].label, 'Product');
  await render({ value, readOnly: true });
  assert.equal(button('Insert'), undefined);
  assert.equal(document.querySelector('textarea'), null);
  assert.equal(document.querySelector('[data-context-cell="0:0"] [class="data-table__cell-value"]').textContent, '');
});

test('malformed stored table links render as text, never clickable links', async () => {
  const linkOptions = resolveDataTableOptions({ rows: { initial: 1 }, columns: { initial: 1 }, textFormats: true });
  const value = createDataTable(linkOptions);
  value.rows[0].cells[0] = 'Untrusted value';
  value.appearance = {
    links: { [value.rows[0].id]: { [value.columns[0].id]: { url: 'javascript:alert(1)' } } },
  };
  await render({ value, tableOptions: linkOptions });
  assert.equal(document.querySelector('a'), null);
  assert.equal(document.querySelector('.data-table__cell-value')?.textContent, 'Untrusted value');
});

test('orders menus and opens the keyboard shortcuts drawer', async () => {
  const value = createDataTable(options);
  await render({ value });
  assert.deepEqual(
    [...document.querySelectorAll('.data-table__menubar > button')].map((element) => element.textContent),
    ['Table', 'Edit', 'Insert', 'Help'],
  );
  await selectMenuItem('Help', 'Keyboard shortcuts');
  assert.match(document.querySelector('[role="dialog"]')?.textContent ?? '', /Copy selected cells/);
  await act(async () => document.querySelector('[role="dialog"] button')?.click());
});

test('shows the Format menu only when formats are configured', async () => {
  await render({ value: createDataTable(formatOptions), tableOptions: formatOptions });
  assert.equal(button('Format').disabled, true);
  assert.deepEqual(
    [...document.querySelectorAll('.data-table__menubar > button')].map((element) => element.textContent),
    ['Table', 'Edit', 'Insert', 'Format', 'Help'],
  );
  await act(async () =>
    document
      .querySelector('[data-context-cell="0:0"]')
      .dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, button: 0 })),
  );
  assert.equal(button('Format').disabled, false);
});

test('shows formula help only when formulas are enabled', async () => {
  await render({ value: createDataTable(formulaOptions), tableOptions: formulaOptions });
  await selectMenuItem('Help', 'Formula help');
  const dialog = document.querySelector('[role="dialog"]');
  assert.match(dialog?.textContent ?? '', /SUM\(A1:A5\)/);
  assert.equal(dialog?.querySelectorAll('.data-table__formula-row code').length, 11);
  assert.match(dialog?.textContent ?? '', /SUM\(A1,B1,C3\)/);
  await act(async () => document.querySelector('[role="dialog"] button')?.click());
});

test('context menus mutate the active row and column', async () => {
  const value = createDataTable(options);
  await render({ value });
  const rowHeader = document.querySelector('[data-context-row="0"]');
  await act(async () => {
    rowHeader.dispatchEvent(
      new dom.window.MouseEvent('contextmenu', { bubbles: true, button: 2, clientX: 10, clientY: 10 }),
    );
  });
  await act(async () => menuItem('Delete row').click());
  assert.equal(stored().rows.length, 1);

  const columnHeader = document.querySelector('[data-context-column="0"]');
  await act(async () => {
    columnHeader.dispatchEvent(
      new dom.window.MouseEvent('contextmenu', { bubbles: true, button: 2, clientX: 10, clientY: 10 }),
    );
  });
  await act(async () => menuItem('Delete column').click());
  assert.equal(stored().columns.length, 1);
  await act(async () => root.render(null));
});

test('selects complete rows and columns from their headers', async () => {
  const value = createDataTable(resolveDataTableOptions({ rows: { initial: 2 }, columns: { initial: 2 } }));
  await render({ value });
  await act(async () => document.querySelector('[data-context-column="1"]').click());
  assert.equal(document.querySelector('[data-context-column="1"]').dataset.selected, 'true');
  assert.equal(document.querySelectorAll('td[data-selected]').length, 2);
  await act(async () => document.querySelector('[data-context-row="0"]').click());
  assert.equal(document.querySelector('[data-context-row="0"]').dataset.selected, 'true');
  assert.equal(document.querySelectorAll('td[data-selected]').length, 2);
});

test('keeps keyboard navigation inside the grid', async () => {
  const value = createDataTable(resolveDataTableOptions({ rows: { initial: 2 }, columns: { initial: 2 } }));
  await render({ value });
  const firstCell = document.querySelector('[data-context-cell="0:0"]');
  firstCell.focus();
  const right = new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
  await act(async () => firstCell.dispatchEvent(right));
  assert.equal(right.defaultPrevented, true);
  assert.equal(document.activeElement?.dataset.contextCell, '0:1');

  const tab = new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  await act(async () => document.activeElement.dispatchEvent(tab));
  assert.equal(tab.defaultPrevented, true);
  assert.equal(document.activeElement?.dataset.contextCell, '1:0');

  const selectAll = new dom.window.KeyboardEvent('keydown', {
    key: 'a',
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  await act(async () => document.activeElement.dispatchEvent(selectAll));
  assert.equal(selectAll.defaultPrevented, true);
  assert.equal(document.querySelectorAll('td[data-selected]').length, 4);
});

test('uses Google Sheets shortcuts for selecting and changing columns', async () => {
  const value = createDataTable(resolveDataTableOptions({ rows: { initial: 2 }, columns: { initial: 2 } }));
  await render({ value });
  const firstCell = document.querySelector('[data-context-cell="0:0"]');
  firstCell.focus();
  const selectColumn = new dom.window.KeyboardEvent('keydown', {
    key: ' ',
    code: 'Space',
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  await act(async () => firstCell.dispatchEvent(selectColumn));
  assert.equal(selectColumn.defaultPrevented, true);
  assert.equal(document.querySelectorAll('td[data-selected]').length, 2);

  const insertColumn = new dom.window.KeyboardEvent('keydown', {
    key: '=',
    code: 'Equal',
    ctrlKey: true,
    altKey: true,
    bubbles: true,
    cancelable: true,
  });
  await act(async () => document.activeElement.dispatchEvent(insertColumn));
  assert.equal(insertColumn.defaultPrevented, true);
  assert.equal(stored().columns.length, 3);

  const deleteColumn = new dom.window.KeyboardEvent('keydown', {
    key: '-',
    code: 'Minus',
    ctrlKey: true,
    altKey: true,
    bubbles: true,
    cancelable: true,
  });
  await act(async () => document.activeElement.dispatchEvent(deleteColumn));
  assert.equal(deleteColumn.defaultPrevented, true);
  assert.equal(stored().columns.length, 2);
});

test('tabs between column headers without focusing resize handles', async () => {
  const value = createDataTable(resolveDataTableOptions({ rows: { initial: 1 }, columns: { initial: 3 } }));
  await render({ value });
  const firstHeader = document.querySelector('[data-context-column="0"]');
  firstHeader.focus();
  const tab = new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  await act(async () => firstHeader.dispatchEvent(tab));
  assert.equal(tab.defaultPrevented, true);
  assert.equal(document.activeElement?.dataset.contextColumn, '1');
  const shiftTab = new dom.window.KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  });
  await act(async () => document.activeElement.dispatchEvent(shiftTab));
  assert.equal(shiftTab.defaultPrevented, true);
  assert.equal(document.activeElement?.dataset.contextColumn, '0');
});

test('selects the next row or column when tabbing headers', async () => {
  const value = createDataTable(resolveDataTableOptions({ rows: { initial: 2 }, columns: { initial: 3 } }));
  await render({ value });
  const firstColumn = document.querySelector('[data-context-column="0"]');
  firstColumn.focus();
  await act(async () =>
    firstColumn.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })),
  );
  assert.equal(document.activeElement?.dataset.contextColumn, '1');
  assert.equal(document.querySelectorAll('td[data-selected]').length, 2);

  const firstRow = document.querySelector('[data-context-row="0"]');
  firstRow.focus();
  await act(async () =>
    firstRow.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })),
  );
  assert.equal(document.activeElement?.dataset.contextRow, '1');
  assert.equal(document.querySelectorAll('td[data-selected]').length, 3);
});

test('tabs between editable column header inputs', async () => {
  const value = createDataTable(resolveDataTableOptions({ rows: { initial: 1 }, columns: { initial: 2 } }));
  await render({ value });
  const firstColumn = document.querySelector('[data-context-column="0"]');
  await act(async () => firstColumn.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true })));
  const firstInput = document.querySelector('input[aria-label="Column 1"]');
  await act(async () =>
    firstInput.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })),
  );
  assert.equal(document.querySelector('input[aria-label="Column 2"]'), document.activeElement);
});

test('types directly into a selected cell without entering edit mode', async () => {
  const value = createDataTable(resolveDataTableOptions({ rows: { initial: 1 }, columns: { initial: 2 } }));
  await render({ value });
  const cell = document.querySelector('[data-context-cell="0:0"]');
  cell.focus();
  const key = new dom.window.KeyboardEvent('keydown', { key: 'A', bubbles: true, cancelable: true });
  await act(async () => cell.dispatchEvent(key));
  assert.equal(key.defaultPrevented, true);
  assert.equal(document.querySelector('textarea'), null);
  assert.equal(stored().rows[0].cells[0], 'A');
  assert.equal(document.querySelector('[data-context-cell="0:0"]').dataset.selected, 'true');
  const nextKey = new dom.window.KeyboardEvent('keydown', { key: 'B', bubbles: true, cancelable: true });
  await act(async () => document.activeElement.dispatchEvent(nextKey));
  assert.equal(stored().rows[0].cells[0], 'AB');
  const right = new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
  await act(async () => document.querySelector('[data-context-cell="0:0"]').dispatchEvent(right));
  assert.equal(right.defaultPrevented, true);
  assert.equal(document.activeElement?.dataset.contextCell, '0:1');
});

test('clears the cell selection when the grid loses focus', async () => {
  const value = createDataTable(resolveDataTableOptions({ rows: { initial: 2 }, columns: { initial: 2 } }));
  await render({ value });
  const cell = document.querySelector('[data-context-cell="0:0"]');
  await act(async () => cell.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, button: 0 })));
  assert.equal(document.querySelectorAll('td[data-selected]').length, 1);
  await act(async () =>
    document
      .querySelector('.data-table__scroll')
      .dispatchEvent(new dom.window.FocusEvent('focusout', { bubbles: true, relatedTarget: document.body })),
  );
  assert.equal(document.querySelectorAll('td[data-selected]').length, 0);
});

test('reorders rows and columns with header drag and drop', async () => {
  const value = createDataTable(resolveDataTableOptions({ rows: { initial: 2 }, columns: { initial: 2 } }));
  value.rows[0].cells = ['first', 'one'];
  value.rows[1].cells = ['second', 'two'];
  value.columns[0].label = 'Left';
  value.columns[1].label = 'Right';
  await render({ value });
  const transfer = { effectAllowed: '', dropEffect: '', setData() {} };
  const dispatchDrag = async (type, target) => {
    const event = new dom.window.Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: transfer });
    await act(async () => target.dispatchEvent(event));
  };
  const row0 = document.querySelector('[data-context-row="0"]');
  const row1 = document.querySelector('[data-context-row="1"]');
  await dispatchDrag('dragstart', row0);
  await dispatchDrag('dragover', row1);
  await dispatchDrag('drop', row1);
  assert.equal(stored().rows[0].cells[0], 'second');
  const column0 = document.querySelector('[data-context-column="0"]');
  const column1 = document.querySelector('[data-context-column="1"]');
  await dispatchDrag('dragstart', column0);
  await dispatchDrag('dragover', column1);
  await dispatchDrag('drop', column1);
  assert.equal(stored().columns[0].label, 'Right');
});

test('row-backed editor loads bounded pages from the configured API route', async () => {
  const tableOptions = resolveDataTableOptions({
    rows: { initial: 3 },
    columns: { initial: 1 },
    storage: { mode: 'rows', pagination: { enabled: true, defaultLimit: 1, maxLimit: 2 } },
  });
  const value = createDataTable(tableOptions);
  value.rows.forEach((row, index) => {
    row.cells[0] = `cell-${index}`;
  });
  const manifest = { ...createDataTableStorageManifest(value), tableId: 'table-1', revisionId: 'rev-1' };
  const originalFetch = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    urls.push(url);
    const page = Number(url.searchParams.get('page'));
    const rows = value.rows.slice((page - 1) * 2, page * 2);
    return {
      ok: true,
      json: async () => ({ ...manifest, rows, pagination: { page, totalPages: 2, hasNextPage: page === 1 } }),
    };
  };
  try {
    await act(async () =>
      render({
        value: manifest,
        tableOptions,
        locale: 'fr',
        documentInfo: { collectionSlug: 'pages', id: 'p1' },
        config: { serverURL: 'https://example.test', routes: { api: '/content-api' } },
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.deepEqual(
      urls.map((url) => url.pathname),
      ['/content-api/data-tables/table-1/rows'],
    );
    assert.deepEqual(
      urls.map((url) => url.searchParams.get('page')),
      ['1'],
    );
    assert.ok(
      urls.every(
        (url) =>
          url.searchParams.get('revision') === 'rev-1' &&
          url.searchParams.get('locale') === 'fr' &&
          url.searchParams.get('limit') === '2',
      ),
    );
    assert.equal(document.querySelectorAll('.data-table-field__storage-preview tbody tr').length, 2);
    assert.equal(document.querySelector('.data-table-field__storage-status'), null);
    const edit = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Edit table');
    await act(async () => edit.click());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.deepEqual(
      urls.map((url) => url.searchParams.get('page')),
      ['1', '1', '2'],
    );
    assert.equal(document.querySelectorAll('[data-context-row]').length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('row-backed editor rejects an ID-less manifest without fetching old routes', async () => {
  const tableOptions = resolveDataTableOptions({ storage: { mode: 'rows' } });
  const value = createDataTableStorageManifest(createDataTable(tableOptions));
  delete value.tableId;
  delete value.revisionId;
  const originalFetch = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (input) => {
    urls.push(String(input));
    throw new Error('Unexpected request');
  };
  try {
    await render({ value, tableOptions });
    assert.equal(
      urls.some((url) => url.includes('data-table-rows')),
      false,
    );
    assert.match(document.querySelector('[role="alert"]')?.textContent ?? '', /missing its table identity/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
