import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { act, createElement } from 'react';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
await mkdir(resolve(packageRoot, '.cache'), { recursive: true });
const directory = await mkdtemp(resolve(packageRoot, '.cache/message-ui-'));
const entry = resolve(directory, 'components.mjs');
const fixture = resolve(packageRoot, 'tests/fixtures/message-ui.tsx');
await build({
  entryPoints: [fixture],
  outfile: entry,
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  plugins: [
    {
      name: 'payload-ui-fixture',
      setup(build) {
        build.onResolve({ filter: /^@payloadcms\/ui\// }, () => ({ path: fixture }));
      },
    },
  ],
});

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  pretendToBeVisual: true,
});
for (const name of [
  'window',
  'Window',
  'document',
  'HTMLElement',
  'Element',
  'Node',
  'Event',
  'MutationObserver',
  'DOMRect',
  'requestAnimationFrame',
  'cancelAnimationFrame',
])
  globalThis[name] = dom.window[name];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const { MessageField, Fixture, calls } = await import(pathToFileURL(entry));
let root;

async function render({
  locale = 'fr',
  message = { en: 'English notice', fr: 'Avis français' },
  label = 'Publishing',
  banner = false,
} = {}) {
  if (root) await act(async () => root.unmount());
  calls.length = 0;
  root = createRoot(document.querySelector('#root'));
  await act(async () =>
    root.render(
      createElement(
        Fixture,
        { initialValue: 'unchanged', locale },
        createElement(MessageField, {
          path: 'group.notice',
          field: {
            name: 'notice',
            type: 'ui',
            label,
            admin: { custom: { banner, message, tone: 'warning' } },
          },
        }),
      ),
    ),
  );
}

after(async () => {
  if (root) await act(async () => root.unmount());
  dom.window.close();
  await rm(directory, { recursive: true, force: true });
});

test('message field renders localized content, tone styling, and accessible labeling without form state', async () => {
  await render();
  const field = document.querySelector('.message-field');
  assert.equal(field?.getAttribute('role'), 'note');
  assert.equal(field?.getAttribute('data-tone'), 'warning');
  assert.equal(field?.id, 'field-group__notice');
  assert.equal(field?.getAttribute('aria-labelledby'), 'field-group__notice-label');
  assert.equal(field?.querySelector('#field-group__notice-label label')?.textContent, 'Publishing');
  assert.equal(field?.querySelector('.message-field__description')?.textContent, 'Avis français');
  assert.equal(field?.querySelector('.banner'), null);
  assert.equal(document.querySelector('[data-value]')?.textContent, JSON.stringify('unchanged'));
  assert.equal(calls.filter(({ action }) => action === 'useField').length, 0);
});

test('message field falls back to the first translation and omits empty messages', async () => {
  await render({ locale: 'de', message: { en: 'English fallback', fr: 'Avis français' } });
  assert.equal(document.querySelector('.message-field__description')?.textContent, 'English fallback');

  await render({ message: '' });
  assert.equal(document.querySelector('.message-field'), null);
});

test('message field can opt into Payload Banner styling', async () => {
  await render({ banner: true });
  assert.equal(document.querySelector('.banner')?.getAttribute('data-banner-type'), 'warning');
  assert.equal(document.querySelector('.message-field__description'), null);
});
