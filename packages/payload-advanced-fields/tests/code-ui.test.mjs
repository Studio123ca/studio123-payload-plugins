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
const directory = await mkdtemp(resolve(packageRoot, '.cache/code-ui-'));
const entry = resolve(directory, 'components.mjs');
const fixture = resolve(packageRoot, 'tests/fixtures/code-ui.tsx');
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
dom.window.Range.prototype.getClientRects = () => [];
dom.window.Range.prototype.getBoundingClientRect = () => new dom.window.DOMRect();
dom.window.Element.prototype.getClientRects = () => [];
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
const { CodeField, Fixture } = await import(pathToFileURL(entry));
let root;

async function render({ initialValue = 42, language = 'typescript', height } = {}) {
  if (root) await act(async () => root.unmount());
  root = createRoot(document.querySelector('#root'));
  await act(async () =>
    root.render(
      createElement(
        Fixture,
        { initialValue, locale: 'fr' },
        createElement(CodeField, {
          path: 'example',
          field: {
            name: 'example',
            type: 'textarea',
            label: { en: 'English label', fr: 'Libellé français' },
            required: true,
            minLength: 2,
            maxLength: 12,
            localized: true,
            admin: { description: { en: 'English help', fr: 'Aide française' }, rows: 4 },
          },
          language,
          height,
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

test('code editor uses localized labels, language extensions, safe value normalization, and accessible metadata', async () => {
  await render({ height: 400 });
  const field = document.querySelector('[data-code-language]');
  const content = document.querySelector('.cm-content');
  assert.equal(field?.getAttribute('data-code-language'), 'typescript');
  assert.equal(field?.getAttribute('data-minlength'), '2');
  assert.equal(field?.getAttribute('data-maxlength'), '12');
  assert.equal(document.querySelector('label')?.textContent, 'Libellé français*');
  assert.equal(content?.id, 'field-example-editor');
  assert.equal(content?.getAttribute('aria-labelledby'), 'field-example-label');
  assert.equal(content?.getAttribute('aria-describedby'), 'field-description-example');
  assert.equal(content?.getAttribute('aria-required'), 'true');
  assert.equal(content?.getAttribute('minlength'), '2');
  assert.equal(content?.getAttribute('maxlength'), '12');
  assert.equal(content?.textContent, '42');
});

test('admin rows provide a fallback editor height when no explicit height is supplied', async () => {
  await render({ height: undefined, language: 'json', initialValue: '{}' });
  const field = document.querySelector('[data-code-language]');
  assert.equal(field?.getAttribute('data-code-height'), '128');
  assert.equal(field?.getAttribute('data-code-language'), 'json');
});
