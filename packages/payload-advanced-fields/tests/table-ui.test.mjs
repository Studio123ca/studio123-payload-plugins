import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { act, createElement } from 'react';
import { createDataTable, resolveDataTableOptions } from '../dist/data-table-field/index.js';

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
const field = { name: 'dataTable', type: 'json', label: 'Data Table' };

async function render({ value = null, readOnly = false, tableOptions = options } = {}) {
  if (!root) root = createRoot(document.querySelector('#root'));
  await act(async () =>
    root.render(
      createElement(
        Fixture,
        { initialValue: value },
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
  await selectMenuItem('Insert', 'Add column');
  await selectMenuItem('Insert', 'Add row');
  assert.equal(stored().columns.length, 2);
  assert.equal(stored().rows.length, 2);
  await selectMenuItem('Edit', 'Undo');
  assert.equal(stored().rows.length, 1);
  await selectMenuItem('Edit', 'Undo');
  assert.equal(stored().columns.length, 1);
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
  assert.deepEqual(
    [...document.querySelectorAll('.data-table__menubar > button')].map((element) => element.textContent),
    ['Table', 'Edit', 'Insert', 'Format', 'Help'],
  );
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
