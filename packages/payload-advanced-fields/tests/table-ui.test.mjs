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
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'Event',
  'MouseEvent',
])
  globalThis[name] = dom.window[name];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const { DataTableField, Fixture } = await import(pathToFileURL(entry));
let root;
const options = resolveDataTableOptions({ initialRows: 1, initialColumns: 1 });
const field = { name: 'dataTable', type: 'json', label: 'Data Table' };

async function render({ value = null, readOnly = false } = {}) {
  if (!root) root = createRoot(document.querySelector('#root'));
  await act(async () =>
    root.render(
      createElement(
        Fixture,
        { initialValue: value },
        createElement(DataTableField, { field, path: 'dataTable', options, readOnly }),
      ),
    ),
  );
}
const button = (text) => [...document.querySelectorAll('button')].find((element) => element.textContent === text);
const stored = () => JSON.parse(document.querySelector('[data-value]').textContent);
after(async () => {
  if (root) await act(async () => root.unmount());
  dom.window.close();
  await rm(directory, { recursive: true, force: true });
});

test('creates and edits a Data Table value', async () => {
  await render();
  await act(async () => button('Create data table').click());
  const input = document.querySelector('textarea');
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(input, 'Widget');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.equal(stored().rows[0].cells[0], 'Widget');
  await act(async () => button('Add column').click());
  await act(async () => button('Add row').click());
  assert.equal(stored().columns.length, 2);
  assert.equal(stored().rows.length, 2);
});

test('updates headers and respects read-only mode', async () => {
  const value = createDataTable(options);
  await render({ value });
  const header = document.querySelector('input[aria-label="Column 1"]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(header, 'Product');
    header.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.equal(stored().columns[0].label, 'Product');
  await render({ value, readOnly: true });
  assert.equal(button('Add row'), undefined);
  assert.equal(document.querySelector('textarea').readOnly, true);
});
