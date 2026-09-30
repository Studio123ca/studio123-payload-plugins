import assert from 'node:assert/strict';
import test from 'node:test';

import { phoneField } from '../dist/phone-field/server/field.js';
import {
  getSupportedCountries,
  normalizePhoneValue,
  resolveDefaultCountry,
  validatePhoneInput,
} from '../dist/phone-field/shared/utils.js';

test('phone defaults and country options follow the allowed country configuration', () => {
  assert.equal(resolveDefaultCountry(undefined, ['ca', 'us']), 'CA');
  assert.equal(resolveDefaultCountry('gb', ['CA', 'US']), 'GB');
  assert.ok(getSupportedCountries().length > 1);
  assert.equal(validatePhoneInput({ number: '416' }), 'Enter a valid phone number.');
  assert.equal(validatePhoneInput(4165550123), 'Enter a valid phone number.');
});

test('phone normalization preserves extensions and produces canonical metadata', () => {
  const value = normalizePhoneValue({ number: '+14165550123', ext: '42' }, { allowedCountries: ['CA'] });
  assert.equal(value?.country, 'CA');
  assert.equal(value?.ext, '42');
  assert.equal(value?.uri, 'tel:+14165550123,42');
});

test('phone field normalizes valid values in beforeValidate and preserves custom hooks', () => {
  const customHook = ({ value }) => value;
  const field = phoneField({
    countries: { enabledCountries: ['CA'] },
    hooks: { beforeValidate: [customHook] },
  });
  const normalized = field.hooks.beforeValidate[0]({ value: { number: '+14165550123', ext: '9' } });
  assert.equal(normalized.country, 'CA');
  assert.equal(normalized.ext, '9');
  assert.equal(field.hooks.beforeValidate[1], customHook);
});

test('phone custom formatters run during server normalization', () => {
  const field = phoneField({ formatter: ({ national }) => `CUSTOM:${national}` });
  const normalized = field.hooks.beforeValidate[0]({ value: { number: '+14165550123' } });
  assert.equal(normalized.custom, 'CUSTOM:(416) 555-0123');
});
