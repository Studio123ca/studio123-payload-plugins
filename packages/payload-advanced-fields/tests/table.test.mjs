import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDataTable,
  csvToDataTable,
  dataTableToCSV,
  dataTableField,
  evaluateDataTable,
  resolveDataTableOptions,
  validateDataTable,
} from '../dist/data-table-field/index.js';

test('data table factory creates a JSON field with a DataTableField admin component', () => {
  const field = dataTableField({ name: 'pricing', label: 'Pricing', rows: { initial: 2 }, columns: { initial: 4 } });
  assert.equal(field.type, 'json');
  assert.equal(field.name, 'pricing');
  assert.equal(field.admin.components.Field.path, '@studio123/payload-advanced-fields/data-table/client');
  assert.equal(field.admin.components.Field.exportName, 'DataTableField');
  assert.deepEqual(field.admin.components.Field.clientProps.options, {
    columns: { initial: 4, min: 1, max: Infinity },
    rows: { initial: 2, min: 1, max: Infinity },
    formulas: { enabled: false, compute: false },
    apiResponse: { includeIds: false, computeFormulas: false },
    formats: [],
    stickyRows: { enabled: true, top: 0, bottom: 0 },
  });
});

test('data table values have stable IDs and rectangular text cells', () => {
  const options = resolveDataTableOptions({ rows: { initial: 2 }, columns: { initial: 2 } });
  const table = createDataTable(options);
  assert.equal(table.columns.length, 2);
  assert.equal(table.rows.length, 2);
  assert.equal(validateDataTable(table, options), true);
  assert.notEqual(table.rows[0].id, table.rows[1].id);
  assert.notEqual(table.columns[0].id, table.columns[1].id);
});

test('API reads keep the stored shape unless response features are enabled', () => {
  const options = resolveDataTableOptions({ rows: { initial: 1 }, columns: { initial: 1 } });
  const table = createDataTable(options);
  table.rows[0].cells[0] = 'Raw value';
  const field = dataTableField({});
  assert.deepEqual(field.hooks.afterRead[0]({ value: table }), table);
});

test('data table field forwards spreadsheet options to the client component', () => {
  const field = dataTableField({
    name: 'forecast',
    rows: { min: 2 },
    columns: { min: 2 },
    formulas: { enabled: true, compute: false },
    apiResponse: { includeIds: false, computeFormulas: false },
    stickyRows: { enabled: true, top: 1 },
    formats: [{ key: 'blue', label: 'Blue', background: 'var(--theme-elevation-100)' }],
  });
  assert.deepEqual(field.admin.components.Field.clientProps.options, {
    columns: { initial: 3, min: 2, max: Infinity },
    rows: { initial: 3, min: 2, max: Infinity },
    formulas: { enabled: true, compute: false },
    apiResponse: { includeIds: false, computeFormulas: false },
    formats: [{ key: 'blue', label: 'Blue', background: 'var(--theme-elevation-100)' }],
    stickyRows: { enabled: true, top: 1, bottom: 0 },
  });
});

test('formula-enabled API reads expose stable response IDs and computed values', () => {
  const options = resolveDataTableOptions({
    rows: { initial: 1 },
    columns: { initial: 3 },
    formulas: { enabled: true, compute: true },
  });
  const table = createDataTable(options);
  table.rows[0].cells = ['2', '3', { formula: '=A1+B1' }];
  assert.deepEqual(evaluateDataTable(table)[0][2], 5);
  const field = dataTableField({
    formulas: { enabled: true },
    apiResponse: { includeIds: true, computeFormulas: true },
  });
  const response = field.hooks.afterRead[0]({ value: table });
  assert.equal(response.columns[0].columnId, response.columns[0].id);
  assert.equal(response.rows[0].rowId, response.rows[0].id);
  assert.deepEqual(response.rows[0].cells[2], { cellId: 'C1', value: 5, formula: '=A1+B1' });
});

test('supports minimum dimensions and CSV round trips', () => {
  const options = resolveDataTableOptions({ rows: { min: 2, initial: 2 }, columns: { min: 2, initial: 2 } });
  assert.equal(options.columns.min, 2);
  const table = csvToDataTable('Name,Value\nWidget,12\nGizmo,24', options);
  assert.deepEqual(
    table.columns.map((column) => column.label),
    ['Name', 'Value'],
  );
  assert.equal(table.rows[1].cells[1], '24');
  assert.equal(dataTableToCSV(table), 'Name,Value\nWidget,12\nGizmo,24');
});

test('data table validation rejects malformed and oversized values', () => {
  const options = resolveDataTableOptions({ rows: { initial: 2, max: 2 }, columns: { initial: 2, max: 2 } });
  const table = createDataTable(options);
  table.rows[0].cells = ['only one cell'];
  assert.match(validateDataTable(table, options), /Every data table cell/);
  assert.throws(() => resolveDataTableOptions({ rows: { initial: 3, max: 2 } }));
  assert.throws(() => dataTableField({ admin: { maxHeight: 'invalid' } }));
});
