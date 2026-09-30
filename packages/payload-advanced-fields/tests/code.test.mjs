import assert from 'node:assert/strict';
import test from 'node:test';

import { codeField } from '../dist/code-field/server/field.js';
import { CODE_LANGUAGES } from '../dist/code-field/shared/types.js';
import {
  DEFAULT_CODE_FIELD_HEIGHT,
  MAX_CODE_FIELD_HEIGHT,
  MIN_CODE_FIELD_HEIGHT,
  normalizeCodeFieldHeight,
  normalizeCodeFieldRows,
  normalizeCodeLength,
  normalizeCodeValue,
  resolveCodeLanguage,
} from '../dist/code-field/shared/utils.js';

test('code field exposes the curated language set and preserves defaults', () => {
  assert.deepEqual(CODE_LANGUAGES, [
    'html',
    'css',
    'javascript',
    'typescript',
    'jsx',
    'tsx',
    'json',
    'markdown',
    'text',
  ]);
  const field = codeField();
  assert.equal(field.required, true);
  assert.equal(field.admin.components.Field.clientProps.language, 'html');
  assert.equal(normalizeCodeFieldHeight(undefined), DEFAULT_CODE_FIELD_HEIGHT);
});

test('code field forwards language, rows, and safe height settings', () => {
  const field = codeField({ language: 'typescript', height: 5000, admin: { rows: 8, description: 'TypeScript' } });
  assert.equal(field.admin.description, 'TypeScript');
  assert.equal(field.admin.components.Field.clientProps.language, 'typescript');
  assert.equal(field.admin.components.Field.clientProps.rows, 8);
  assert.equal(field.admin.components.Field.clientProps.height, MAX_CODE_FIELD_HEIGHT);
  assert.equal(codeField({ height: Number.NaN }).admin.components.Field.clientProps.height, DEFAULT_CODE_FIELD_HEIGHT);
  assert.equal(normalizeCodeFieldHeight(-20), MIN_CODE_FIELD_HEIGHT);
  assert.equal(normalizeCodeFieldRows(4.8), 4);
  assert.equal(normalizeCodeFieldRows(Number.NaN), undefined);
});

test('unsupported languages fail during server configuration instead of silently becoming plain text', () => {
  assert.throws(() => codeField({ language: 'python' }), /Unsupported code language/);
  assert.equal(resolveCodeLanguage('python', 'text'), 'text');
});

test('code values and length constraints normalize hostile runtime values', () => {
  assert.equal(normalizeCodeValue(null), '');
  assert.equal(normalizeCodeValue(42), '42');
  assert.equal(normalizeCodeLength(-1), undefined);
  assert.equal(normalizeCodeLength(4.8), 4);
});
