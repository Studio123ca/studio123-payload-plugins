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
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
for (const name of [
  'window',
  'document',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'File',
])
  globalThis[name] = dom.window[name];
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
const input = async (element, text) => {
  await act(async () => {
    element.focus();
    Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(element, text);
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
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

test('keyboard selection copies and clears a rectangle, and undo refreshes visible drafts', async () => {
  await reset();
  const table = createTable(options);
  table.rows[0].cells = ['A', 'B'];
  table.rows[1].cells = ['C', 'D'];
  await render({ value: table });
  await act(async () => cell().focus());
  await act(async () =>
    cell().dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, shiftKey: true, bubbles: true }),
    ),
  );
  await act(async () =>
    cell(0, 1).dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, shiftKey: true, bubbles: true }),
    ),
  );
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
