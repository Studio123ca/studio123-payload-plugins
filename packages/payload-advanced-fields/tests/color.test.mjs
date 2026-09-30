import assert from 'node:assert/strict';
import test from 'node:test';

import { colorField } from '../dist/color-field/server/field.js';
import {
  colorValueToHsva,
  normalizeColorValue,
  parseHexWithAlpha,
  resolveColorOption,
  validateColorValue,
} from '../dist/color-field/shared/utils.js';

test('color options accept strings, preserve alpha, and reject malformed values', () => {
  assert.deepEqual(resolveColorOption('#ff0000'), { hex: '#FF0000', alpha: 1 });
  assert.deepEqual(parseHexWithAlpha('#F00A'), { hex: '#FF0000', alpha: 0.6666666666666666 });
  assert.throws(() => parseHexWithAlpha('#GGGGGG'), /Invalid hex color format/);
  assert.equal(validateColorValue({ hex: '#GGGGGG' }), 'Enter a valid color.');
  assert.equal(validateColorValue(null, true), 'Choose a color.');
});

test('color defaults and picker values retain the actual color and transparency', () => {
  const field = colorField({ defaultColor: '#ff0000aa' });
  assert.equal(field.defaultValue.hex, '#FF0000');
  assert.equal(field.defaultValue.alpha, 0.6666666666666666);
  assert.deepEqual(colorValueToHsva(normalizeColorValue({ hex: '#FF0000' })), { h: 0, s: 100, v: 100, a: 1 });
  assert.equal(colorField({ presetColors: [] }).defaultValue, undefined);
});

test('color field normalizes values in beforeValidate and keeps custom hooks', () => {
  const customHook = ({ value }) => value;
  const field = colorField({ hooks: { beforeValidate: [customHook] } });
  const normalized = field.hooks.beforeValidate[0]({ value: { hex: '#00ff00', label: 'Green' } });
  assert.equal(normalized.hex, '#00FF00');
  assert.equal(normalized.label, 'Green');
  assert.equal(field.hooks.beforeValidate[1], customHook);
});
