import assert from 'node:assert/strict';
import test from 'node:test';

import { validateLink } from '../dist/link-field/shared/validateLink.js';

const externalLink = (external) => ({
  type: 'external',
  label: 'Example',
  external,
});

test('external links accept absolute and relative web URLs', () => {
  for (const url of [
    'https://example.com/page',
    'http://example.com',
    '//example.com/page',
    '/about',
    'about/team',
    './about',
    '../about',
    '?preview=true',
    '#details',
  ]) {
    assert.equal(validateLink(externalLink(url)), true, url);
  }
});

test('external links reject unsupported schemes and malformed URLs', () => {
  for (const url of ['javascript:alert(1)', 'mailto:user@example.com', 'https://exa mple.com', 'about us']) {
    assert.equal(validateLink(externalLink(url)), 'Please enter a valid URL.', url);
  }
});

import { normalizeLinkValue } from '../dist/link-field/shared/validateLink.js';
import { linkField } from '../dist/link-field/server/field.js';
import { createLinkFieldHooks } from '../dist/link-field/server/hooks.js';
import { configureAdvancedFields } from '../dist/config.js';

const collections = [{ slug: 'pages', generateURL: ({ doc }) => `/pages/${doc.slug}` }];
configureAdvancedFields({ link: { collections } });
const internalLink = (id = 0, relationTo = 'pages') => ({
  type: 'internal',
  label: 'Saved label',
  internal: { relationTo, value: id, title: 'Cached title' },
  url: '/stale-url',
});

test('validation requires a valid type, email and allowed internal destination', () => {
  const validate = (value) => validateLink(value, { collections });
  assert.equal(validate({ type: 'unknown', label: 'Label' }), 'Select a valid link type.');
  assert.equal(validate({ type: 'email', label: 'Email', email: '  ' }), 'Enter an email address.');
  assert.equal(validate({ type: 'email', label: 'Email', email: 'test@example.com' }), true);
  assert.equal(validate(internalLink(null)), 'Select a destination.');
  assert.equal(validate(internalLink('123', 'users')), 'Select a destination from an allowed collection.');
  assert.equal(validate(internalLink(0)), true);
  assert.equal(normalizeLinkValue(internalLink(0), collections).internal.value, 0);
  assert.equal(validateLink(null), true);
  assert.equal(validateLink(null, { collections, required: true }), 'A link is required.');
});

test('field preserves required metadata and runs built-in hooks before custom hooks', async () => {
  const custom = ({ value }) => ({ ...value, label: `${value.label}!` });
  const beforeValidate = ({ value }) => value;
  const field = linkField({
    required: true,
    hooks: { beforeChange: [custom], afterRead: [custom], beforeValidate: [beforeValidate] },
  });
  assert.equal(field.required, true);
  assert.equal(field.validate(null), 'A link is required.');
  assert.deepEqual(field.hooks.beforeValidate, [beforeValidate]);
  assert.equal(field.hooks.beforeChange[1], custom);
  assert.equal(field.hooks.afterRead[1], custom);
  let value = { ...externalLink(' /about '), label: ' About ' };
  for (const hook of field.hooks.beforeChange) value = await hook({ value });
  assert.equal(value.url, '/about');
  assert.equal(value.label, 'About!');
});

const makeRequest = (findByID) => ({
  user: { id: 'reader' },
  locale: 'fr',
  transactionID: 'transaction',
  context: { marker: true },
  payload: { findByID, config: { collections: [{ slug: 'pages', admin: { useAsTitle: 'name' } }] } },
});

test('hydration respects access, request context and configured titles, including ID zero', async () => {
  const req = makeRequest(async (args) => {
    assert.equal(args.overrideAccess, false);
    assert.equal(args.id, 0);
    assert.equal(args.req.user, req.user);
    assert.equal(args.req.locale, 'fr');
    assert.equal(args.req.transactionID, 'transaction');
    assert.deepEqual(args.req.context, { marker: true, skipLinkHydration: true });
    return { id: 0, name: 'Allowed title', slug: 'about' };
  });
  const result = await createLinkFieldHooks().afterRead[0]({ req, value: internalLink() });
  assert.equal(result.url, '/pages/about');
  assert.equal(result.internal.title, 'Allowed title');
  assert.equal(result.label, 'Saved label');
  assert.deepEqual(req.context, { marker: true });
});

test('unreadable destinations discard cached metadata and do not invoke resolvers', async () => {
  const req = makeRequest(async () => {
    throw new Error('Forbidden');
  });
  const resolver = () => {
    assert.fail('must not resolve inaccessible documents');
  };
  const result = await createLinkFieldHooks(undefined, resolver).afterRead[0]({ req, value: internalLink() });
  assert.equal(result.url, null);
  assert.equal(result.internal.title, null);
  assert.equal(result.label, 'Saved label');
});

test('inactive, disallowed and recursive relationships do not trigger lookups', async () => {
  const req = makeRequest(async () => {
    assert.fail('unexpected lookup');
  });
  const hook = createLinkFieldHooks().afterRead[0];
  assert.equal((await hook({ req, value: { ...internalLink(), type: 'external', external: '/about' } })).url, '/about');
  assert.equal((await hook({ req, value: internalLink(1, 'users') })).url, null);
  const value = internalLink();
  assert.equal(await hook({ req: { ...req, context: { skipLinkHydration: true } }, value }), value);
});
