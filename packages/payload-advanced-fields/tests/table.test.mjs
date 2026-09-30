import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDataTable,
  dataTableField,
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
    maxColumns: 20,
    maxRows: 100,
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

test('data table validation rejects malformed and oversized values', () => {
  const options = resolveDataTableOptions({ initialRows: 2, initialColumns: 2, maxRows: 2, maxColumns: 2 });
  const table = createDataTable(options);
  table.rows[0].cells = ['only one cell'];
  assert.match(validateDataTable(table, options), /Every data table cell/);
  assert.throws(() => resolveDataTableOptions({ initialRows: 3, maxRows: 2 }));
  assert.throws(() => dataTableField({ admin: { maxHeight: 'invalid' } }));
});
