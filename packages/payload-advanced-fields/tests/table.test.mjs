import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDataTable,
  normalizeDataTableValue,
  csvToDataTable,
  dataTableToCSV,
  dataTableField,
  evaluateDataTable,
  resolveDataTableOptions,
  validateDataTable,
  isSafeDataTableURL,
} from '../dist/data-table-field/index.js';
import { insertDataTableColumn, insertDataTableRow, pasteDataTableCells } from '../dist/data-table-field/shared/operations.js';

test('data table factory creates a JSON field with a DataTableField admin component', () => {
  const field = dataTableField({ name: 'pricing', label: 'Pricing', rows: { initial: 2 }, columns: { initial: 4 } });
  assert.equal(field.type, 'json');
  assert.equal(field.name, 'pricing');
  assert.equal(field.admin.components.Field.path, '@studio123/payload-advanced-fields/data-table/client');
  assert.equal(field.admin.components.Field.exportName, 'DataTableField');
  assert.deepEqual(field.admin.components.Field.clientProps.options, {
    columns: { initial: 4, min: 1, max: 50 },
    rows: { initial: 2, min: 1, max: 250 },
    formulas: { enabled: false, compute: false },
    apiResponse: { includeIds: false, computeFormulas: false },
    formats: [],
    textFormats: {
      enabled: false,
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      alignment: false,
      wrapping: false,
      link: false,
    },
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
    columns: { initial: 3, min: 2, max: 50 },
    rows: { initial: 3, min: 2, max: 250 },
    formulas: { enabled: true, compute: false },
    apiResponse: { includeIds: false, computeFormulas: false },
    formats: [{ key: 'blue', label: 'Blue', background: 'var(--theme-elevation-100)' }],
    textFormats: {
      enabled: false,
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      alignment: false,
      wrapping: false,
      link: false,
    },
    stickyRows: { enabled: true, top: 1, bottom: 0 },
  });
});

test('computed API reads can be resubmitted unchanged as valid stored values', () => {
  const options = resolveDataTableOptions({
    rows: { initial: 1 },
    columns: { initial: 3 },
    formulas: { enabled: true, compute: true },
  });
  const table = createDataTable(options);
  table.rows[0].cells = ['2', '3', { formula: '=A1+B1' }];
  assert.deepEqual(evaluateDataTable(table)[0][2], 5);
  const field = dataTableField({
    columns: { max: 3 },
    rows: { max: 200 },
    formulas: { enabled: true, compute: true },
  });
  const response = field.hooks.afterRead[0]({ value: table });
  assert.equal(field.admin.components.Field.clientProps.options.apiResponse.computeFormulas, true);
  assert.deepEqual(response.rows[0].cells[2], { value: 5, formula: '=A1+B1' });
  const submittedWithoutEdits = field.hooks.beforeValidate[0]({ value: response });
  assert.deepEqual(submittedWithoutEdits, table);
  assert.equal(field.validate(submittedWithoutEdits, {}), true);
});

test('formulas calculate common formatted numeric values', () => {
  const options = resolveDataTableOptions({ rows: { initial: 1 }, columns: { initial: 7 }, formulas: true });
  const table = createDataTable(options);
  table.rows[0].cells = ['$4.10', '$2.40', '2.40ms', '1s', '10%', '1,000', { formula: '=A1+B1' }];
  assert.equal(evaluateDataTable(table)[0][6], '$6.50');
  table.rows[0].cells[6] = { formula: '=C1+D1' };
  assert.equal(evaluateDataTable(table)[0][6], '#VALUE!');
  table.rows[0].cells[3] = '1.20ms';
  assert.equal(evaluateDataTable(table)[0][6], '3.6ms');
  table.rows[0].cells[6] = { formula: '=E1*F1' };
  assert.equal(evaluateDataTable(table)[0][6], 100);
  table.rows[0].cells[6] = { formula: '=E1+E1' };
  assert.equal(evaluateDataTable(table)[0][6], '20%');
});

test('pasting formulas preserves formula cells when formulas are enabled', () => {
  const options = resolveDataTableOptions({ rows: { initial: 1 }, columns: { initial: 2 }, formulas: true });
  const table = createDataTable(options);
  const pasted = pasteDataTableCells(
    table,
    [
      ['2', '3'],
      ['=A1+B1', ''],
    ],
    0,
    0,
    options,
  );
  assert.equal(pasted.rows[1].cells[0].formula, '=A1+B1');
  assert.equal(pasted.rows[0].cells[0], '2');
});

test('formulas preserve dates and times and reject incompatible values', () => {
  const options = resolveDataTableOptions({ rows: { initial: 2 }, columns: { initial: 6 }, formulas: true });
  const table = createDataTable(options);
  table.rows[0].cells = ['2026-09-30', '1d', { formula: '=A1+B1' }, '12:30', '1h', { formula: '=D1+E1' }];
  table.rows[1].cells = ['2026-10-02', '', { formula: '=A2-A1' }, '', '', { formula: '=A1+D1' }];
  const results = evaluateDataTable(table);
  assert.equal(results[0][2], '2026-10-01');
  assert.equal(results[0][5], '13:30');
  assert.equal(results[1][2], '2d');
  assert.equal(results[1][5], '#VALUE!');
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

test('validates safe data table link URLs', () => {
  assert.equal(isSafeDataTableURL('https://payloadcms.com'), true);
  assert.equal(isSafeDataTableURL('mailto:hello@example.com'), true);
  assert.equal(isSafeDataTableURL('javascript:alert(1)'), false);
  const options = resolveDataTableOptions({
    rows: { initial: 1 },
    columns: { initial: 1 },
    textFormats: { link: true },
  });
  const table = createDataTable(options);
  table.appearance = { links: { [table.rows[0].id]: { [table.columns[0].id]: { url: 'javascript:alert(1)' } } } };
  assert.equal(validateDataTable(table, options), 'Invalid data table link appearance.');
});

test('data table validation rejects malformed and oversized values', () => {
  const options = resolveDataTableOptions({ rows: { initial: 2, max: 2 }, columns: { initial: 2, max: 2 } });
  const table = createDataTable(options);
  table.rows[0].cells = ['only one cell'];
  assert.match(validateDataTable(table, options), /Every data table cell/);
  assert.throws(() => resolveDataTableOptions({ rows: { initial: 3, max: 2 } }));
  assert.throws(() => dataTableField({ admin: { maxHeight: 'invalid' } }));
});

test('caps dimensions at 250 rows and 50 columns across configuration, values, edits, paste, and CSV', () => {
  const defaults = resolveDataTableOptions();
  assert.equal(defaults.rows.max, 250);
  assert.equal(defaults.columns.max, 50);
  assert.throws(() => resolveDataTableOptions({ rows: { max: 251 } }), /rows.max cannot exceed 250/);
  assert.throws(() => resolveDataTableOptions({ columns: { max: 51 } }), /columns.max cannot exceed 50/);

  const rowsOptions = resolveDataTableOptions({ rows: { initial: 250 }, columns: { initial: 1 } });
  const rowsTable = createDataTable(rowsOptions);
  assert.equal(validateDataTable(rowsTable, rowsOptions), true);
  assert.equal(insertDataTableRow(rowsTable, rowsTable.rows.length, rowsOptions), rowsTable);

  const columnsOptions = resolveDataTableOptions({ rows: { initial: 1 }, columns: { initial: 50 } });
  const columnsTable = createDataTable(columnsOptions);
  assert.equal(validateDataTable(columnsTable, columnsOptions), true);
  assert.equal(insertDataTableColumn(columnsTable, columnsTable.columns.length, columnsOptions), columnsTable);

  const editableOptions = resolveDataTableOptions({ rows: { initial: 1 }, columns: { initial: 1 } });
  const editableTable = createDataTable(editableOptions);
  const fullRows = pasteDataTableCells(editableTable, Array.from({ length: 250 }, (_, index) => [`${index}`]), 0, 0, editableOptions);
  assert.equal(fullRows.rows.length, 250);
  assert.throws(
    () => pasteDataTableCells(editableTable, Array.from({ length: 251 }, () => ['x']), 0, 0, editableOptions),
    /table limits/,
  );

  const headers = Array.from({ length: 50 }, (_, index) => `Value ${index + 1}`).join(',');
  const validRows = Array.from({ length: 250 }, (_, row) => Array.from({ length: 50 }, (_, col) => `${row}-${col}`).join(','));
  assert.equal(csvToDataTable([headers, ...validRows].join('\n'), defaults).rows.length, 250);
  assert.throws(() => csvToDataTable(`${headers},Extra\nvalue`, defaults), /50 columns/);
  assert.throws(() => csvToDataTable(`Value\n${Array.from({ length: 251 }, (_, index) => index).join('\n')}`, defaults), /251 rows/);
});

test('malformed null rows and columns fail validation without throwing', () => {
  const options = resolveDataTableOptions({ rows: { initial: 1 }, columns: { initial: 1 } });
  const table = createDataTable(options);
  const hostileObject = JSON.parse('{"toString":null}');
  assert.equal(
    validateDataTable({ ...table, columns: [null] }, options),
    'Columns must have unique IDs and text labels.',
  );
  assert.equal(validateDataTable({ ...table, rows: [null] }, options), 'Rows must have unique IDs and cells.');
  assert.equal(normalizeDataTableValue({ ...table, columns: [null] }), null);
  assert.equal(normalizeDataTableValue({ ...table, rows: [null] }), null);
  assert.equal(
    validateDataTable({ ...table, columns: [{ ...table.columns[0], id: hostileObject }] }, options),
    'Columns must have unique IDs and text labels.',
  );
  assert.doesNotThrow(() =>
    normalizeDataTableValue({ ...table, columns: [{ ...table.columns[0], id: hostileObject }] }),
  );
  assert.equal(
    validateDataTable({ ...table, appearance: { stickyRows: { top: hostileObject, bottom: 0 } } }, options),
    'Invalid data table sticky row settings.',
  );
  assert.equal(
    validateDataTable(
      {
        ...table,
        appearance: { text: { [table.rows[0].id]: { [table.columns[0].id]: { align: hostileObject } } } },
      },
      options,
    ),
    'Invalid data table text appearance.',
  );
});
