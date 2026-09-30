import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createElement, act } from 'react';
import { createTable, resolveTableOptions } from '../dist/table-field/index.js';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
await mkdir(resolve(packageRoot, '.cache'), { recursive: true });
const directory = await mkdtemp(resolve(packageRoot, '.cache/table-ui-'));
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
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost/',
});
for (const name of [
  'window',
  'document',
  'Element',
  'Node',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'File',
  'MutationObserver',
])
  globalThis[name] = dom.window[name];
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const { TableField, StructuredTableField, Fixture, calls } = await import(pathToFileURL(entry));
let root;
const options = resolveTableOptions();
const field = { name: 'table', type: 'json', label: 'Table' };
const render = async ({
  value = null,
  config = options,
  readOnly = false,
  disabled = false,
  path = 'table',
  locale = 'en',
  key = 'document',
} = {}) => {
  if (!root) root = createRoot(document.querySelector('#root'));
  await act(async () =>
    root.render(
      createElement(
        Fixture,
        { initialValue: value, path, disabled, key, locale },
        createElement(TableField, { field, path, options: config, readOnly }),
      ),
    ),
  );
};
const button = (text) => [...document.querySelectorAll('button')].find((element) => element.textContent === text);
const click = async (element) => {
  assert.ok(element);
  await act(async () => element.click());
};
const value = () => JSON.parse(document.querySelector('[data-value]').textContent);
const cell = (row = 0, column = 0) => document.querySelector(`[data-cell="${row}:${column}"] textarea`);
const edit = async (element) => {
  await act(async () => element.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true })));
  await act(async () => element.focus());
};
const input = async (element, text) => {
  await act(async () => {
    element.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true }));
    element.focus();
    Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(element, text);
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
};
const drag = async (source, target) => {
  const dataTransfer = { dropEffect: '', effectAllowed: '', setData() {} };
  const event = (type) => {
    const next = new dom.window.Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(next, 'dataTransfer', { value: dataTransfer });
    return next;
  };
  await act(async () => source.dispatchEvent(event('dragstart')));
  await act(async () => target.dispatchEvent(event('dragover')));
  await act(async () => target.dispatchEvent(event('drop')));
};
const reset = async () => {
  if (root) await act(async () => root.unmount());
  root = undefined;
  calls.length = 0;
};
after(async () => {
  await reset();
  dom.window.close();
  await rm(directory, { recursive: true, force: true });
});

test('JSON table edits, paste, undo, redo and clear update the Payload value', async () => {
  await reset();
  await render();
  await click(button('Create table'));
  await input(cell(), 'Specification');
  assert.equal(value().rows[0].cells[0], 'Specification');
  const id = value().rows[0].id;
  await act(async () => {
    const event = new dom.window.Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => 'A\tB\nC\tD' } });
    cell().dispatchEvent(event);
  });
  assert.deepEqual(
    value().rows.map((row) => row.cells),
    [
      ['A', 'B'],
      ['C', 'D'],
    ],
  );
  assert.equal(value().rows[0].id, id);
  await click(button('Undo'));
  assert.equal(value().rows[0].cells[0], 'Specification');
  await click(button('Redo'));
  assert.equal(value().rows[1].cells[1], 'D');
  await click(button('Clear table'));
  await click(document.querySelector('[role=dialog] button:last-child'));
  assert.equal(value(), null);
  await click(button('Undo'));
  assert.equal(value().rows[0].cells[0], 'A');
});

test('CSV table edits retain focus and store a string instead of JSON', async () => {
  await reset();
  await render({ value: 'Name,Value\nA,001', config: resolveTableOptions({ storage: 'csv' }) });
  const first = cell();
  await input(first, 'A, with comma');
  assert.equal(cell(), first);
  assert.equal(document.activeElement, first);
  assert.equal(value(), 'Name,Value\r\n"A, with comma",001');
  await click(button('Add row'));
  assert.equal(typeof value(), 'string');
  await click(button('Undo'));
  assert.equal(value(), 'Name,Value\r\n"A, with comma",001');
});

test('spreadsheet cells display calculated values and preserve escaped literal input', async () => {
  await reset();
  const config = resolveTableOptions({ mode: 'spreadsheet', formulas: true });
  await render({ value: createTable(config), config });
  await input(cell(), '=2+3');
  await act(async () => cell().blur());
  assert.equal(cell().value, '5');
  assert.deepEqual(value().rows[0].cells[0], { formula: '=2+3' });
  assert.ok(button('Help'));
  await click(button('Help'));
  assert.match(document.querySelector('[role=dialog]').textContent, /AVERAGE\(C1:C4\)/);
  assert.match(document.querySelector('[role=dialog]').textContent, /Individual cells: =A1\+B1/);
  assert.match(document.querySelector('[role=dialog]').textContent, /SUM\(A1,C3,E5\)/);
  await click(button('Close'));
  assert.equal(document.querySelector('[role=dialog]'), null);
  await input(cell(), "'=2+3");
  await act(async () => cell().blur());
  assert.equal(cell().value, '=2+3');
  assert.equal(value().rows[0].cells[0], '=2+3');
});

test('read-only and disabled fields expose no mutations; invalid data is preserved', async () => {
  for (const flags of [{ readOnly: true }, { disabled: true }]) {
    await reset();
    await render({ value: createTable(options), ...flags });
    assert.equal(button('Add row'), undefined);
    assert.equal(button('Import CSV'), undefined);
    assert.equal(cell().readOnly, true);
  }
  await reset();
  await render({ value: { version: 9 } });
  assert.match(document.querySelector('[role="alert"]').textContent, /preserved/);
  assert.deepEqual(value(), { version: 9 });
});

test('external resets clear undo and use the current nested path', async () => {
  await reset();
  const original = createTable(options);
  await render({ value: original, path: 'sections.0.table' });
  await input(cell(), 'Local edit');
  const external = createTable(options);
  external.rows[0].cells[0] = 'Restored';
  await render({ value: external, path: 'sections.1.table' });
  assert.equal(cell().value, 'Restored');
  assert.equal(button('Undo').disabled, true);
  assert.equal(calls.filter((call) => call.action === 'useField').at(-1).args.potentiallyStalePath, 'sections.1.table');
});

test('structured editor delegates nested row operations and cell permissions to Payload', async () => {
  await reset();
  root = createRoot(document.querySelector('#root'));
  const nativeField = { name: 'records', type: 'array', maxRows: 2, fields: [{ name: 'qty', type: 'number' }] };
  const permissions = { fields: { qty: { read: true, update: false } } };
  await act(async () =>
    root.render(
      createElement(
        Fixture,
        { path: 'blocks.0.records', rows: [{ id: 'row-1' }] },
        createElement(StructuredTableField, {
          field: nativeField,
          path: 'stale',
          schemaPath: 'blocks.specs.records',
          permissions,
        }),
      ),
    ),
  );
  assert.equal(document.querySelector('thead th:nth-child(2)').textContent, 'qty');
  assert.equal(document.querySelectorAll('thead input').length, 0);
  await click(button('Add row'));
  assert.deepEqual(calls.find((call) => call.action === 'addFieldRow').args, {
    path: 'blocks.0.records',
    schemaPath: 'blocks.specs.records',
    rowIndex: 1,
  });
  await click(button('Duplicate row'));
  assert.deepEqual(calls.find((call) => call.action === 'dispatchFields').args, {
    type: 'DUPLICATE_ROW',
    path: 'blocks.0.records',
    rowIndex: 0,
  });
  const native = calls.find((call) => call.action === 'RenderFields').args;
  assert.equal(native.parentPath, 'blocks.0.records.0');
  assert.equal(native.parentSchemaPath, 'blocks.specs.records');
  assert.equal(native.permissions, permissions.fields);
});

test('keyboard selection, editing and clipboard actions work from a selected cell', async () => {
  await reset();
  const table = createTable(options);
  table.rows[0].cells = ['A', 'B'];
  table.rows[1].cells = ['C', 'D'];
  table.rows[1].cells = ['C', 'D'];
  await render({ value: table });
  const key = async (target, event) =>
    act(async () => target.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, ...event })));
  const cellElement = (row = 0, column = 0) => document.querySelector(`[data-cell="${row}:${column}"]`);
  await act(async () => cellElement().focus());
  await key(cellElement(), { key: 'ArrowRight' });
  await key(cellElement(0, 1), { key: 'ArrowDown', shiftKey: true });
  await key(cellElement(1, 1), { key: 'ArrowLeft', shiftKey: true });
  assert.equal(document.querySelectorAll('td[data-selected]').length, 4);
  let copied;
  await act(async () => {
    const event = new dom.window.Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: {
        setData: (_, text) => {
          copied = text;
        },
      },
    });
    cell(1, 1).dispatchEvent(event);
  });
  assert.equal(copied, 'A\tB\r\nC\tD');
  await click(button('Clear cells'));
  assert.deepEqual(
    value().rows.map((row) => row.cells),
    [
      ['', ''],
      ['', ''],
    ],
  );
  await click(button('Undo'));
  assert.equal(cell(1, 1).value, 'D');
  await key(cellElement(1, 0), { key: 'Enter' });
  assert.equal(cell(1, 0).readOnly, false);
  await key(cell(1, 0), { key: 'Escape' });
  assert.equal(document.activeElement, cellElement(1, 0));
  assert.equal(document.querySelectorAll('td[data-selected]').length, 1);
  await key(cellElement(1, 0), { key: 'ArrowRight' });
  assert.equal(document.querySelectorAll('td[data-selected]').length, 1);
  assert.equal(document.activeElement, cellElement(1, 1));
  await act(async () => cellElement(1, 0).focus());
  await key(cellElement(1, 0), { key: 'Tab' });
  assert.equal(document.querySelectorAll('td[data-selected]').length, 1);
  assert.equal(document.activeElement, cellElement(1, 1));
});

test('dragging across cells selects a rectangle', async () => {
  await reset();
  await render({ value: createTable(options) });
  const start = document.querySelector('[data-cell="0:0"]');
  const destination = document.querySelector('[data-cell="1:1"]');
  const scroll = document.querySelector('.advanced-table__scroll');
  const pointer = (type, target, { buttons = 1 } = {}) => {
    const event = new dom.window.Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      buttons: { value: buttons },
      clientX: { value: 10 },
      clientY: { value: 10 },
    });
    target.dispatchEvent(event);
  };
  const originalElementFromPoint = document.elementFromPoint;
  document.elementFromPoint = () => destination;
  await act(async () => pointer('pointerdown', start));
  assert.equal(cell().readOnly, true);
  await act(async () => pointer('pointermove', scroll));
  document.elementFromPoint = originalElementFromPoint;
  assert.equal(document.querySelectorAll('td[data-selected]').length, 4);
  await edit(cell(1, 1));
  assert.equal(cell(1, 1).readOnly, false);
});

test('sort uses the active column and format choices are organized into submenus', async () => {
  await reset();
  const table = createTable(options);
  table.rows[0].cells = ['Zebra', '2'];
  table.rows[1].cells = ['Apple', '1'];
  await render({ value: table });
  await click(button('Sort column A A–Z'));
  assert.deepEqual(
    value().rows.map((row) => row.cells[0]),
    ['Apple', 'Zebra'],
  );
  await click(button('Sort column A Z–A'));
  assert.deepEqual(
    value().rows.map((row) => row.cells[0]),
    ['Zebra', 'Apple'],
  );
  assert.ok(button('Cell styles'));
  assert.ok(button('Row styles'));
});

test('table menus insert beside the active row or column and drag handles reorder the grid', async () => {
  await reset();
  const table = createTable(options);
  table.rows[0].cells = ['A1', 'B1'];
  table.rows[1].cells = ['A2', 'B2'];
  await render({ value: table });

  await click(button('Add row before'));
  assert.deepEqual(value().rows[0].cells, ['', '']);
  await click(button('Add column before'));
  assert.deepEqual(value().rows[0].cells, ['', '', '']);
  const firstColumnID = value().columns[0].id;

  await click(document.querySelector('thead th:nth-child(2)'));
  await drag(document.querySelector('thead th:nth-child(2)'), document.querySelector('thead th:nth-child(3)'));
  assert.equal(value().columns[1].id, firstColumnID);

  await click(document.querySelector('tbody tr:nth-child(1) th'));
  await drag(document.querySelector('tbody tr:nth-child(1) th'), document.querySelector('tbody tr:nth-child(2) th'));
  assert.deepEqual(value().rows[1].cells, ['', '', '']);
});

test('clicking a row or column header selects its cells, and Delete clears the selection', async () => {
  await reset();
  const table = createTable(options);
  table.rows[0].cells = ['A', 'B'];
  table.rows[1].cells = ['C', 'D'];
  await render({ value: table });
  const clickHeader = async (element) =>
    act(async () => element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  const cellElement = (row = 0, column = 0) => document.querySelector(`[data-cell="${row}:${column}"]`);
  const key = async (element, event) =>
    act(async () => element.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, ...event })));
  await clickHeader(document.querySelector('thead th:nth-child(2)'));
  assert.equal(document.querySelectorAll('td[data-selected]').length, 2);
  await key(cellElement(0, 0), { key: 'Delete' });
  assert.deepEqual(value().rows[0].cells, ['', 'B']);
  await clickHeader(document.querySelector('tbody tr:nth-child(2) th'));
  assert.equal(document.querySelectorAll('td[data-selected]').length, 2);
  await key(cellElement(0, 0), { key: 'Backspace' });
  assert.deepEqual(value().rows[1].cells, ['', '']);
});

test('CSV import replaces the table atomically and can be undone; oversized imports preserve data', async () => {
  await reset();
  await render({ value: createTable(options) });
  const original = value();
  const importText = async (text) => {
    const element = document.querySelector('input[type=file]');
    Object.defineProperty(element, 'files', {
      configurable: true,
      value: [{ size: text.length, text: async () => text }],
    });
    await act(async () => element.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
  };
  await importText('Product,Price\nWidget,0012');
  assert.deepEqual(
    value().columns.map((column) => column.label),
    ['Product', 'Price'],
  );
  assert.deepEqual(value().rows[0].cells, ['Widget', '0012']);
  await click(button('Undo'));
  assert.deepEqual(value(), original);
  await importText('a'.repeat(2_000_001));
  assert.deepEqual(value(), original);
  assert.match(document.querySelector('[role=status]').textContent, /too large/);
});

test('locale switches clear session history even when the underlying value is unchanged', async () => {
  await reset();
  const original = createTable(options);
  await render({ value: original, locale: 'en' });
  await input(cell(), 'Shared text');
  assert.equal(button('Undo').disabled, false);
  await render({ value: original, locale: 'fr' });
  assert.equal(button('Undo').disabled, true);
  assert.equal(cell().value, 'Shared text');
});

test('column resizing commits once per drag, supports undo and resets widths', async () => {
  await reset();
  const table = createTable(options);
  await render({ value: table });
  let handle = document.querySelector('[aria-label="Resize column A"]');
  handle.setPointerCapture = () => {};
  handle.releasePointerCapture = () => {};
  handle.parentElement.getBoundingClientRect = () => ({ width: 180, left: 0 });
  const pointer = async (type, x) =>
    act(async () => handle.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, button: 0 })));
  await pointer('pointerdown', 180);
  await pointer('pointermove', 220);
  await pointer('pointermove', 260);
  assert.equal(value().columns[0].width, undefined);
  await pointer('pointerup', 260);
  assert.equal(value().columns[0].width, 260);
  await click(button('Undo'));
  assert.equal(value().columns[0].width, undefined);
  handle = document.querySelector('[aria-label="Resize column A"]');
  await act(async () => handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
  assert.equal(value().columns[0].width, 190);
  await click(button('Reset column widths'));
  assert.equal(value().columns[0].width, undefined);
});

test('header visibility is configured and caption controls are absent', async () => {
  await reset();
  const table = createTable(options);
  table.caption = 'Existing caption';
  await render({ value: table, config: resolveTableOptions({ headerRow: false }) });
  assert.equal(document.querySelector('[aria-label="Header A"]'), null);
  assert.equal(document.querySelector('.advanced-table__settings'), null);
  await input(cell(), 'Edited');
  assert.equal(value().headerRow, false);
  assert.equal(value().caption, 'Existing caption');
});

test('CSV resize stays local and does not modify stored text', async () => {
  await reset();
  const csv = 'Name,Value\r\nExample,123';
  await render({ value: csv, config: resolveTableOptions({ storage: 'csv' }) });
  const handle = document.querySelector('[aria-label="Resize column A"]');
  await act(async () => handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
  assert.equal(value(), csv);
  assert.equal(handle.getAttribute('aria-valuenow'), '190');
  await click(button('Reset column widths'));
  assert.equal(handle.getAttribute('aria-valuenow'), '180');
});

test('Clear table requires confirmation, cancellation preserves values, and confirmed clear is undoable', async () => {
  await reset();
  const table = createTable(options);
  await render({ value: table });
  await click(button('Clear table'));
  assert.ok(document.querySelector('[role=dialog]'));
  assert.deepEqual(value(), table);
  await click(button('Cancel'));
  assert.equal(document.querySelector('[role=dialog]'), null);
  assert.deepEqual(value(), table);
  await click(button('Clear table'));
  await click(document.querySelector('[role=dialog] button:last-child'));
  assert.equal(value(), null);
  await click(button('Undo'));
  assert.deepEqual(value(), table);
});

test('background and freeze changes persist in JSON and participate in undo', async () => {
  await reset();
  const table = createTable(options);
  await render({ value: table });
  await click(button('Cell styles'));
  await click(document.querySelector('[aria-label="Cell styles"] button'));
  assert.equal(value().appearance.cells[table.rows[0].id][table.columns[0].id], 'muted');
  await click(button('Freeze through this row'));
  assert.deepEqual(value().appearance.stickyRows, { top: 1, bottom: 0 });
  assert.equal(document.querySelector('tbody tr').dataset.sticky, 'top');
  await click(button('Undo'));
  assert.equal(value().appearance.stickyRows, undefined);
  assert.equal(document.querySelector('tbody tr').dataset.sticky, undefined);
});

test('CSV appearance changes are session-only', async () => {
  await reset();
  const csv = 'Name,Value\r\nExample,123';
  await render({ value: csv, config: resolveTableOptions({ storage: 'csv' }) });
  await click(button('Cell styles'));
  await click(document.querySelector('[aria-label="Cell styles"] button'));
  await click(button('Freeze through this row'));
  assert.equal(value(), csv);
  assert.equal(document.querySelector('tbody tr').dataset.sticky, 'top');
  assert.equal(document.querySelector('[data-cell="0:0"]').dataset.colored, 'true');
});
