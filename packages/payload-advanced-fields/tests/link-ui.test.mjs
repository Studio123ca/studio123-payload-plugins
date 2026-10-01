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
const directory = await mkdtemp(resolve(packageRoot, '.cache/link-ui-'));
const entry = resolve(directory, 'components.mjs');
const fixture = resolve(packageRoot, 'tests/fixtures/link-ui.tsx');
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
const dom = new JSDOM('<!doctype html><div id="root"></div>', { pretendToBeVisual: true });
for (const name of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'HTMLInputElement', 'Event'])
  globalThis[name] = dom.window[name];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const { LinkField, Fixture } = await import(pathToFileURL(entry));
let root;
const initialValue = { type: 'external', label: 'About', external: '/about' };
async function render(props = {}, fixtureProps = {}, value = initialValue) {
  if (root) await act(async () => root.unmount());
  root = createRoot(document.querySelector('#root'));
  await act(async () =>
    root.render(
      createElement(
        Fixture,
        { initialValue: value, ...fixtureProps },
        createElement(LinkField, {
          path: 'link',
          field: { name: 'link', label: 'Link', required: true },
          collectionSlugs: ['pages'],
          ...props,
        }),
      ),
    ),
  );
}
const button = (label) =>
  [...document.querySelectorAll('button')].find(
    (element) => element.textContent === label || element.getAttribute('aria-label') === label,
  );
const stored = () => JSON.parse(document.querySelector('[data-value]').textContent);
after(async () => {
  if (root) await act(async () => root.unmount());
  dom.window.close();
  await rm(directory, { recursive: true, force: true });
});

test('read-only props, field settings and disabled form state hide edit and clear actions', async () => {
  for (const [props, fixtureProps] of [
    [{ readOnly: true }, {}],
    [{ field: { name: 'link', admin: { readOnly: true } } }, {}],
    [{}, { disabled: true }],
  ]) {
    await render(props, fixtureProps);
    assert.equal(button('Clear destination'), undefined);
    assert.equal(button('Edit destination'), undefined);
    assert.deepEqual(stored(), initialValue);
  }
});

test('malformed stored URLs are displayed as text, never clickable links', async () => {
  const value = {
    type: 'external',
    label: 'Untrusted stored value',
    external: 'javascript:alert(1)',
    url: 'javascript:alert(1)',
  };
  await render({}, {}, value);
  assert.equal(document.querySelector('a'), null);
  assert.equal(document.querySelector('.field-type a[href^="javascript:"]'), null);
});

test('drawer rejects unsupported URLs and saves intentional relative URLs', async () => {
  for (const url of ['javascript:alert(1)', 'about us', '/about', '../contact', '?preview=true', '#details']) {
    await render({}, {}, { ...initialValue, external: url });
    await act(async () => button('Edit destination').click());
    await act(async () => button('Save').click());
    if (url === 'javascript:alert(1)' || url === 'about us') {
      assert.equal(document.querySelector('[role="alert"]').textContent, 'Please enter a valid URL.');
      assert.ok(document.querySelector('[role="dialog"]'));
      assert.equal(stored().url, undefined);
    } else {
      assert.equal(stored().url, url);
      assert.equal(document.querySelector('[role="dialog"]'), null);
    }
  }
});

test('title prefill uses configured API route, locale, title field and ID zero', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(url);
    return { ok: true, json: async () => ({ name: 'Page name' }) };
  };
  try {
    await render({}, { locale: 'fr' }, { type: 'internal', label: '', internal: { relationTo: 'pages', value: 0 } });
    await act(async () => button('Edit destination').click());
    assert.ok(requests.length > 0);
    assert.ok(requests.every((url) => url === '/custom-api/pages/0?depth=0&locale=fr'));
    assert.equal(document.querySelector('input[aria-label="Label"]').value, 'Page name');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
