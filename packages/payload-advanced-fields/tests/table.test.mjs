import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tableField,
  evaluateTable,
  csvToTable,
  tableToCSV,
  createTable,
  resolveTableOptions,
  validateTable,
} from '../dist/table-field/index.js';
import { editableCellInput, moveColumn, parseCell, pasteCells } from '../dist/table-field/shared/table.js';
import { parseDelimited, safeCSVCell, stringifyDelimited } from '../dist/table-field/shared/clipboard.js';
import { validateCSVTable } from '../dist/table-field/shared/csv.js';

const content = resolveTableOptions();
const spreadsheet = resolveTableOptions({ mode: 'spreadsheet', formulas: true });
const csv = resolveTableOptions({ storage: 'csv' });
const fromMatrix = (matrix, options = spreadsheet) =>
  pasteCells({ ...createTable(options), rows: [] }, matrix, 0, 0, options);

test('content tables have independent IDs and reject malformed API writes', () => {
  const table = createTable(content);
  assert.equal(validateTable(table, content), true);
  assert.equal(typeof validateTable(table, content, true), 'string');
  table.rows[0].cells[0] = 'Model';
  assert.equal(validateTable(table, content, true), true);
  const second = createTable(content);
  assert.notEqual(table.rows[0].id, second.rows[0].id);
  assert.notEqual(validateTable({ ...table, rows: [{ ...table.rows[0], cells: ['short'] }] }, content), true);
  assert.notEqual(validateTable({ ...table, columns: [table.columns[0], table.columns[0]] }, content), true);
  assert.notEqual(validateTable({ ...table, rows: [{ ...table.rows[0], cells: [12, ''] }] }, content), true);
  assert.notEqual(validateTable({ ...table, version: 2 }, content), true);
  assert.notEqual(validateTable([], content), true);
  assert.equal(validateTable(null, content), true);
  assert.notEqual(validateTable(null, content, true), true);
});

test('configuration rejects invalid limits and incompatible storage/mode choices', () => {
  for (const config of [
    { minRows: 5, maxRows: 2 },
    { maxColumns: 0 },
    { initialRows: -1 },
    { initialColumns: 1000 },
    { maxRows: Infinity },
    { maxRows: 1001 },
    { formulas: true },
    { mode: 'spreadsheet', storage: 'csv' },
    { storage: 'csv', caption: true },
  ])
    assert.throws(() => resolveTableOptions(config));
  assert.equal(resolveTableOptions({ maxRows: 1, maxColumns: 1 }).initialRows, 1);
  assert.equal(resolveTableOptions({ minRows: 5 }).initialRows, 5);
});

test('paste expands atomically, retains existing IDs, and moves cells with their column', () => {
  const table = createTable(content);
  const next = pasteCells(
    table,
    [
      ['A', 'B'],
      ['C', 'D'],
    ],
    1,
    1,
    content,
  );
  assert.equal(next.rows.length, 3);
  assert.equal(next.columns.length, 3);
  assert.equal(next.rows[1].cells[1], 'A');
  assert.equal(next.rows[0].id, table.rows[0].id);
  assert.equal(table.rows.length, 2);
  assert.equal(table.rows[1].cells[1], '');
  assert.throws(() => pasteCells(table, [['overflow']], 100, 0, content));
  assert.throws(() => pasteCells(table, [['x'.repeat(10001)]], 0, 0, content));
  const reordered = moveColumn(next, 1, 0);
  assert.equal(reordered.columns[0].id, next.columns[1].id);
  assert.deepEqual(reordered.rows[1].cells, ['A', '', 'B']);
});

test('CSV and TSV round-trip commas, tabs, quotes, Unicode, newlines and blank final rows', () => {
  const matrix = [
    ['A,B', 'say "hello"', '😀'],
    ['multi\nline', '\t', ''],
    ['', '', ''],
  ];
  for (const delimiter of [',', '\t'])
    assert.deepEqual(parseDelimited(stringifyDelimited(matrix, delimiter), delimiter), matrix);
  assert.deepEqual(parseDelimited('a,b\r\nc,d\r\n', ','), [
    ['a', 'b'],
    ['c', 'd'],
  ]);
  assert.deepEqual(parseDelimited('""', ','), [['']]);
  assert.deepEqual(parseDelimited('\uFEFFName,Value\nA,1', ','), [
    ['Name', 'Value'],
    ['A', '1'],
  ]);
  assert.throws(() => parseDelimited('"unclosed', ','));
  assert.throws(() => parseDelimited('"closed"junk', ','));
  assert.throws(() => parseDelimited('a,b,c', ',', 10, 2));
  assert.throws(() => parseDelimited('a\nb', ',', 1));
  assert.throws(() => parseDelimited('a'.repeat(2_000_001), ','));
});

test('CSV storage preserves literal cell text and headers, padding ragged input', () => {
  const input = 'Name,Value\r\n"Item, A",0012\r\n=SUM(A1),false\r\nOnly one';
  const table = csvToTable(input, csv);
  assert.equal(table.rows[0].cells[1], '0012');
  assert.equal(table.rows[1].cells[0], '=SUM(A1)');
  assert.equal(table.rows[1].cells[1], 'false');
  assert.equal(table.rows[2].cells[1], '');
  assert.deepEqual(parseDelimited(tableToCSV(table), ','), [
    ['Name', 'Value'],
    ['Item, A', '0012'],
    ['=SUM(A1)', 'false'],
    ['Only one', ''],
  ]);
  assert.equal(validateCSVTable(input, csv, true), true);
  assert.notEqual(validateCSVTable('Name,Value', csv, true), true);
  assert.equal(validateCSVTable('', csv), true);
  assert.notEqual(validateCSVTable({}, csv), true);
  const noHeaders = resolveTableOptions({ storage: 'csv', headerRow: false, initialColumns: 1 });
  assert.deepEqual(
    csvToTable('""', noHeaders).rows.map((row) => row.cells),
    [['']],
  );
  assert.equal(tableToCSV(csvToTable('""', noHeaders)), '""');
});

test('spreadsheet input retains explicit text and rejects nonfinite or disabled formula values', () => {
  for (const cell of ['001', 'true', '=A1', "'literal", 0, false, 1.25, { formula: '=A1+1' }]) {
    assert.deepEqual(parseCell(editableCellInput(cell, spreadsheet), spreadsheet), cell);
  }
  assert.equal(parseCell('1e999', spreadsheet), '1e999');
  assert.equal(parseCell('=A1', content), '=A1');
  const table = fromMatrix([['0', 'false']]);
  assert.equal(validateTable(table, spreadsheet, true), true);
  table.rows[0].cells[0] = Infinity;
  assert.notEqual(validateTable(table, spreadsheet), true);
  table.rows[0].cells[0] = { formula: '=1' };
  assert.notEqual(validateTable(table, resolveTableOptions({ mode: 'spreadsheet' })), true);
});

test('formula evaluator implements precedence, body references and numeric aggregates', () => {
  const table = fromMatrix([
    ['2', '3', '=A1+B1*4', '=-2^2', '=2^3^2'],
    ['5', 'text', '=SUM(A1:B2)', '=AVERAGE(A1:A2)', '=COUNT(A1:B2)'],
    ['=MIN(A1:A2)', '=MAX(A1:A2)', '=SUM(1,2,3)', '=1.5e2/3', '=SUM()'],
  ]);
  assert.deepEqual(evaluateTable(table), [
    [2, 3, 14, -4, 512],
    [5, 'text', 10, 3.5, 3],
    [2, 5, 6, 50, 0],
  ]);
});

test('formula errors are deterministic, propagate, and never execute JavaScript', () => {
  const table = fromMatrix([
    ['=B1', '=A1', '=1/0', '=Z99', '=BOGUS(1)', '=globalThis.process.exit()'],
    ['=C1+1', '=SUM(A1:B1)', '=1+', '=2^99999', '=AVERAGE()', '=SUM(1:2)'],
  ]);
  assert.deepEqual(evaluateTable(table), [
    ['#CYCLE!', '#CYCLE!', '#DIV/0!', '#REF!', '#NAME?', '#ERROR!'],
    ['#DIV/0!', '#CYCLE!', '#ERROR!', '#NUM!', '#DIV/0!', '#ERROR!'],
  ]);
  const nested = fromMatrix([[`=${'('.repeat(80)}1${')'.repeat(80)}`]]);
  assert.equal(evaluateTable(nested)[0][0], '#LIMIT!');
});

test('downloaded CSV escapes spreadsheet execution prefixes', () => {
  for (const value of ['=HYPERLINK("url")', '+1', '-2', '@SUM(A1)', '  =1', '\ttext'])
    assert.equal(safeCSVCell(value), `'${value}`);
  assert.equal(safeCSVCell('normal'), 'normal');
});

test('field factory isolates options, composes validation and supports override components', async () => {
  const field = tableField({
    name: 'specs',
    required: true,
    maxRows: 3,
    validate: () => 'Custom rule',
    admin: { components: { Field: '/custom/Table' } },
  });
  assert.equal(field.type, 'json');
  assert.equal(field.maxRows, undefined);
  assert.equal(field.admin.components.Field, '/custom/Table');
  assert.equal(field.jsonSchema.schema.properties.rows.maxItems, 3);
  assert.notEqual(await field.validate(null, {}), 'Custom rule');
  assert.equal(await field.validate(fromMatrix([['A']], content), {}), 'Custom rule');
  const csvField = tableField({ name: 'data', storage: 'csv' });
  assert.equal(csvField.type, 'textarea');
  assert.equal(await csvField.validate('A,B\n1,2', {}), true);
  assert.notEqual(await csvField.validate('"broken', {}), true);
  const columns = [{ name: 'qty', type: 'number', min: 0, required: true }];
  const structured = tableField({ mode: 'structured', columns });
  assert.equal(structured.type, 'array');
  assert.equal(structured.fields, columns);
  assert.equal(structured.admin.components.Field.exportName, 'StructuredTableField');
  assert.throws(() => tableField({ mode: 'structured', columns: [] }));
  assert.throws(() => tableField({ mode: 'structured', columns: [...columns, ...columns] }));
  assert.throws(() => tableField({ mode: 'structured', columns: [{ name: 'id', type: 'text' }] }));
});

test('Payload canary sanitizes tables in collections, nested arrays, blocks and localized globals', async () => {
  const { buildConfig, entityToStandaloneJSONSchema } = await import('payload');
  const config = await buildConfig({
    secret: 'table-test-only',
    localization: { locales: ['en', 'fr'], defaultLocale: 'en' },
    collections: [
      {
        slug: 'table-fixtures',
        fields: [
          tableField({ name: 'content', localized: true }),
          tableField({ name: 'csv', storage: 'csv' }),
          tableField({ name: 'sheet', mode: 'spreadsheet', formulas: true }),
          tableField({
            name: 'records',
            mode: 'structured',
            columns: [{ name: 'quantity', type: 'number', min: 0, required: true }],
          }),
          { name: 'groups', type: 'array', fields: [tableField({ name: 'nested' })] },
          {
            name: 'sections',
            type: 'blocks',
            blocks: [{ slug: 'comparison', fields: [tableField({ name: 'table' })] }],
          },
        ],
      },
    ],
    globals: [{ slug: 'settings', fields: [tableField({ name: 'table', localized: true })] }],
  });
  const collection = config.collections.find((item) => item.slug === 'table-fixtures');
  const records = collection.fields.find((field) => field.name === 'records');
  assert.equal(typeof records.validate, 'function');
  assert.equal(typeof records.fields.find((field) => field.name === 'quantity').validate, 'function');
  assert.equal(collection.fields.find((field) => field.name === 'content').localized, true);
  assert.equal(config.globals[0].fields.find((field) => field.name === 'table').type, 'json');
  const schema = entityToStandaloneJSONSchema({ config, entity: collection, defaultIDType: 'text' });
  assert.equal(schema.properties.content.properties.version.enum[0], 1);
  assert.equal(schema.properties.csv.type.includes('string'), true);
  assert.equal(schema.properties.records.items.properties.quantity.type.includes('number'), true);
});

test('table presentation inherits late plugin configuration and field overrides replace palettes', async () => {
  const { configureAdvancedFields, getAdvancedFieldsConfig } = await import('../dist/config.js');
  const { advancedFieldsPlugin } = await import('../dist/plugin.js');
  const { buildConfig } = await import('payload');
  const previous = getAdvancedFieldsConfig().table;
  const palette = [{ key: 'brand', label: 'Brand', background: { light: '#eee', dark: '#222' } }];
  try {
    const inherited = tableField({ name: 'inherited' });
    const overridden = tableField({ name: 'overridden', palette: [], stickyRows: { enabled: false } });
    const config = await buildConfig({
      secret: 'table-fixture',
      plugins: [advancedFieldsPlugin({ table: { palette, stickyRows: { top: 2, bottom: 1 } } })],
      collections: [{ slug: 'palette-tests', fields: [inherited, overridden] }],
    });
    const fields = config.collections.find((item) => item.slug === 'palette-tests').fields;
    const options = fields.find((field) => field.name === 'inherited').admin.components.Field.clientProps.options;
    assert.deepEqual(options.palette, palette);
    assert.deepEqual(options.stickyRows, { enabled: true, top: 2, bottom: 1 });
    const own = fields.find((field) => field.name === 'overridden').admin.components.Field.clientProps.options;
    assert.deepEqual(own.palette, []);
    assert.equal(own.stickyRows.enabled, false);
    const records = tableField({ mode: 'structured', columns: [{ name: 'title', type: 'text' }] });
    assert.deepEqual(records.admin.components.Field.clientProps.presentation.palette, palette);
  } finally {
    configureAdvancedFields({
      table: {
        palette: previous?.palette,
        stickyRows: {
          enabled: previous?.stickyRows?.enabled,
          top: previous?.stickyRows?.top,
          bottom: previous?.stickyRows?.bottom,
        },
      },
    });
  }
});

test('appearance validates stable IDs, preserves removed palette keys, and cleans deleted references', async () => {
  const { cleanAppearance, resolveTablePresentation } = await import('../dist/table-field/shared/presentation.js');
  const table = fromMatrix(
    [
      ['A', 'B'],
      ['C', 'D'],
    ],
    content,
  );
  const [row] = table.rows,
    [column] = table.columns;
  table.appearance = {
    rows: { [row.id]: 'removed-color' },
    cells: { [row.id]: { [column.id]: 'highlight' } },
    stickyRows: { top: 1, bottom: 1 },
  };
  assert.equal(validateTable(table, content), true);
  const moved = moveColumn(table, 0, 1);
  assert.equal(moved.appearance.cells[row.id][column.id], 'highlight');
  const deleted = {
    ...table,
    columns: table.columns.slice(1),
    rows: table.rows.map((row) => ({ ...row, cells: row.cells.slice(1) })),
  };
  assert.deepEqual(cleanAppearance(table.appearance, deleted).cells[row.id], {});
  assert.notEqual(
    validateTable({ ...table, appearance: { cells: { missing: { [column.id]: 'highlight' } } } }, content),
    true,
  );
  assert.notEqual(validateTable({ ...table, appearance: { stickyRows: { top: -1, bottom: 0 } } }, content), true);
  assert.throws(() =>
    resolveTablePresentation({
      palette: [
        { key: 'x', label: 'X', background: '#fff' },
        { key: 'x', label: 'X', background: '#000' },
      ],
    }),
  );
  assert.throws(() => resolveTablePresentation({ stickyRows: { top: 1.5 } }));
  assert.ok(resolveTablePresentation().palette.length);
});

test('admin.maxHeight is forwarded for all table modes without leaking into native admin options', () => {
  for (const config of [{}, { storage: 'csv' }, { mode: 'structured', columns: [{ name: 'title', type: 'text' }] }]) {
    const field = tableField({ ...config, admin: { maxHeight: '60vh' } });
    assert.equal(field.admin.components.Field.clientProps.maxHeight, '60vh');
    assert.equal(field.admin.maxHeight, undefined);
    assert.equal(tableField(config).admin.components.Field.clientProps.maxHeight, 640);
    for (const maxHeight of [-1, 0, Infinity, 'garbage', '-30px'])
      assert.throws(() => tableField({ ...config, admin: { maxHeight } }));
  }
});
