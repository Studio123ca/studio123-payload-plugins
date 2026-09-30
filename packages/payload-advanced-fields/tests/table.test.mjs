import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDataTable,
  dataTableField,
  evaluateDataTable,
  resolveDataTableOptions,
  validateDataTable,
} from '../dist/data-table-field/index.js';

test('data table factory creates a JSON field with a DataTableField admin component', () => {
  const field = dataTableField({ name: 'pricing', label: 'Pricing', initialRows: 2, initialColumns: 4 });
  assert.equal(field.type, 'json');
  assert.equal(field.name, 'pricing');
  assert.equal(field.admin.components.Field.path, '@studio123/payload-advanced-fields/data-table/client');
  assert.equal(field.admin.components.Field.exportName, 'DataTableField');
  assert.deepEqual(field.admin.components.Field.clientProps.options, {
    initialColumns: 4,
    initialRows: 2,
    minColumns: 1,
    minRows: 1,
    maxColumns: 20,
    maxRows: 100,
    formulas: false,
    computeFormulas: true,
    palette: [
      { key: 'muted', label: 'Muted', background: 'var(--color-bg-secondary, #f2f2f2)' },
      { key: 'highlight', label: 'Highlight', background: 'var(--color-bg-warning-tertiary, #fff3c4)' },
      { key: 'success', label: 'Success', background: 'var(--color-bg-success-tertiary, #d9f0df)' },
      { key: 'danger', label: 'Danger', background: 'var(--color-bg-danger-tertiary, #fce0df)' },
    ],
    stickyRows: { enabled: true, top: 0, bottom: 0 },
  });
});

test('data table values have stable IDs and rectangular text cells', () => {
  const options = resolveDataTableOptions({ initialRows: 2, initialColumns: 2 });
  const table = createDataTable(options);
  assert.equal(table.columns.length, 2);
  assert.equal(table.rows.length, 2);
  assert.equal(validateDataTable(table, options), true);
  assert.notEqual(table.rows[0].id, table.rows[1].id);
  assert.notEqual(table.columns[0].id, table.columns[1].id);
});

test('data table field forwards spreadsheet options to the client component', () => {
  const field = dataTableField({
    name: 'forecast',
    minRows: 2,
    minColumns: 2,
    formulas: { enabled: true, compute: false },
    stickyRows: { enabled: true, top: 1 },
    palette: [{ key: 'blue', label: 'Blue', background: 'var(--theme-elevation-100)' }],
  });
  assert.deepEqual(field.admin.components.Field.clientProps.options, {
    initialColumns: 3,
    initialRows: 3,
    minColumns: 2,
    minRows: 2,
    maxColumns: 20,
    maxRows: 100,
    formulas: true,
    computeFormulas: false,
    palette: [{ key: 'blue', label: 'Blue', background: 'var(--theme-elevation-100)' }],
    stickyRows: { enabled: true, top: 1, bottom: 0 },
  });
});

test('formula-enabled API reads expose stable response IDs and computed values', () => {
  const options = resolveDataTableOptions({
    initialRows: 1,
    initialColumns: 3,
    formulas: { enabled: true, compute: true },
  });
  const table = createDataTable(options);
  table.rows[0].cells = ['2', '3', { formula: '=A1+B1' }];
  assert.deepEqual(evaluateDataTable(table)[0][2], 5);
  const field = dataTableField({ formulas: { enabled: true, compute: true } });
  const response = field.hooks.afterRead[0]({ value: table });
  assert.equal(response.columns[0].columnId, response.columns[0].id);
  assert.equal(response.rows[0].rowId, response.rows[0].id);
  assert.deepEqual(response.rows[0].cells[2], { cellId: 'C1', value: 5, formula: '=A1+B1' });
});

test('data table validation rejects malformed and oversized values', () => {
  const options = resolveDataTableOptions({ initialRows: 2, initialColumns: 2, maxRows: 2, maxColumns: 2 });
  const table = createDataTable(options);
  table.rows[0].cells = ['only one cell'];
  assert.match(validateDataTable(table, options), /Every data table cell/);
  assert.throws(() => resolveDataTableOptions({ initialRows: 3, maxRows: 2 }));
  assert.throws(() => dataTableField({ admin: { maxHeight: 'invalid' } }));
});
