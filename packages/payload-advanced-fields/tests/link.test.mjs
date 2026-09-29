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
