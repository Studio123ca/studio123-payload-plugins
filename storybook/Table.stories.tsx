import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { TableField } from '../packages/payload-advanced-fields/src/table-field/admin/TableField.js';
import { StructuredTableField } from '../packages/payload-advanced-fields/src/table-field/admin/StructuredTableField.js';
import {
  createTable,
  pasteCells,
  resolveTableOptions,
} from '../packages/payload-advanced-fields/src/table-field/shared/table.js';
import { evaluateTable } from '../packages/payload-advanced-fields/src/table-field/shared/formulas.js';
import { csvToTable, tableToCSV } from '../packages/payload-advanced-fields/src/table-field/shared/csv.js';
import { resolveTablePresentation } from '../packages/payload-advanced-fields/src/table-field/shared/presentation.js';
import type {
  TablePresentationConfig,
  TableValue,
} from '../packages/payload-advanced-fields/src/table-field/shared/types.js';
import { PayloadField, commonArgs, commonArgTypes, fieldProps } from './support/PayloadField.js';
import type { FieldControls } from './support/PayloadField.js';

type Args = FieldControls &
  TablePresentationConfig & {
    mode: 'content' | 'spreadsheet' | 'structured';
    storage: 'json' | 'csv';
    formulas: boolean;
    computeFormulas: boolean;
    headerRow: boolean;
    initialRows: number;
    initialColumns: number;
    maxRows: number;
    maxColumns: number;
    maxHeight: number;
  };
const columns = [
  { name: 'description', type: 'text' as const, label: 'Description', required: true },
  { name: 'quantity', type: 'number' as const, label: 'Quantity', min: 0, required: true },
  { name: 'available', type: 'checkbox' as const, label: 'Available' },
  { name: 'category', type: 'select' as const, label: 'Category', options: ['Hardware', 'Service'] },
];
const contentOptions = resolveTableOptions();
const content = pasteCells(
  createTable(contentOptions),
  [
    ['Dimensions', '24 × 36 in'],
    ['Material', 'Aluminum'],
    ['Warranty', '5 years'],
  ],
  0,
  0,
  contentOptions,
);
content.columns[0].label = 'Specification';
content.columns[1].label = 'Details';
const sheetOptions = resolveTableOptions({ mode: 'spreadsheet', formulas: true });
const sheet = pasteCells(
  createTable(sheetOptions),
  [
    ['12', '49', '=A1*B1'],
    ['8', '25', '=A2*B2'],
    ['', '', '=SUM(C1:C2)'],
  ],
  0,
  0,
  sheetOptions,
);
sheet.columns.forEach((column, i) => {
  column.label = ['Quantity', 'Unit price', 'Total'][i];
});
const sheetResults = evaluateTable(sheet);
const apiResponse = {
  ...sheet,
  columns: sheet.columns.map((column) => ({ ...column, columnId: column.id })),
  rows: sheet.rows.map((row, rowIndex) => ({
    ...row,
    rowId: row.id,
    cells: row.cells.map((value, columnIndex) => ({
      cellId: `${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}`,
      value: sheetResults[rowIndex][columnIndex],
      ...(typeof value === 'object' && value !== null && 'formula' in value ? { formula: value.formula } : {}),
    })),
  })),
};

const meta = {
  title: 'Fields/Table',
  tags: ['autodocs'],
  args: {
    ...commonArgs,
    label: 'Table',
    mode: 'content',
    storage: 'json',
    formulas: false,
    computeFormulas: true,
    headerRow: true,
    initialRows: 2,
    initialColumns: 2,
    maxRows: 100,
    maxColumns: 20,
    maxHeight: 420,
  },
  argTypes: {
    ...commonArgTypes,
    palette: { control: 'object' },
    maxHeight: { control: { type: 'number', min: 120, max: 1000 }, description: 'Maps to field admin.maxHeight.' },
    stickyRows: { control: 'object' },
    mode: { control: 'select', options: ['content', 'spreadsheet', 'structured'] },
    storage: { control: 'radio', options: ['json', 'csv'], if: { arg: 'mode', eq: 'content' } },
    formulas: { control: 'boolean', if: { arg: 'mode', eq: 'spreadsheet' } },
    computeFormulas: {
      control: 'boolean',
      description: 'Evaluate formulas in JSON API reads before returning cell values.',
      if: { arg: 'mode', eq: 'spreadsheet' },
    },
    headerRow: { control: 'boolean', if: { arg: 'mode', neq: 'structured' } },
    initialRows: { control: { type: 'number', min: 0, max: 100 } },
    initialColumns: { control: { type: 'number', min: 1, max: 20 } },
    maxRows: { control: { type: 'number', min: 1, max: 1000 } },
    maxColumns: { control: { type: 'number', min: 1, max: 100 } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Content tables store JSON or CSV strings. Structured tables use native Payload arrays. Spreadsheets support bounded formulas and, by default, compute formula values in JSON API reads while retaining their expressions. Settings reset the in-memory example; this does not migrate persisted data.',
      },
    },
  },
  render: (args, { globals }) => {
    if (args.mode === 'structured') {
      const records = Array.isArray(args.initialValue) ? args.initialValue : [];
      return (
        <PayloadField
          args={{ ...args, initialValue: records }}
          fields={columns}
          theme={globals.theme}
          locale={globals.locale}
        >
          <StructuredTableField
            presentation={resolveTablePresentation(args)}
            maxHeight={args.maxHeight}
            path="example"
            schemaPath="stories.example"
            permissions={true}
            readOnly={args.readOnly}
            field={{
              name: 'example',
              type: 'array',
              label: args.label,
              fields: columns,
              required: args.required,
              maxRows: args.maxRows,
              admin: { description: args.description, initCollapsed: false, isSortable: true },
            }}
          />
        </PayloadField>
      );
    }
    try {
      const storage = args.mode === 'spreadsheet' ? 'json' : args.storage;
      const options = resolveTableOptions({
        ...args,
        mode: args.mode,
        storage,
        caption: false,
        formulas: args.mode === 'spreadsheet' && args.formulas,
      });
      let initialValue = args.initialValue;
      if (storage === 'csv' && initialValue && typeof initialValue === 'object' && 'version' in initialValue)
        initialValue = tableToCSV(initialValue as TableValue);
      if (storage === 'json' && typeof initialValue === 'string') initialValue = csvToTable(initialValue, options);
      return (
        <PayloadField args={{ ...args, initialValue }} theme={globals.theme} locale={globals.locale}>
          {storage === 'csv' ? (
            <TableField {...fieldProps(args, 'textarea')} options={options} maxHeight={args.maxHeight} />
          ) : (
            <TableField {...fieldProps(args, 'json')} options={options} maxHeight={args.maxHeight} />
          )}
        </PayloadField>
      );
    } catch (error) {
      return <p role="alert">{error instanceof Error ? error.message : 'Invalid options.'}</p>;
    }
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Content: Story = { args: { initialValue: content } };
export const CSVStorage: Story = {
  name: 'CSV storage',
  args: { storage: 'csv', initialValue: 'Product,Price\r\n"Widget, large",19.95\r\nWidget small,9.95' },
};
export const Spreadsheet: Story = {
  args: { mode: 'spreadsheet', formulas: true, initialValue: apiResponse },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const quantity = canvas.getByRole('textbox', { name: 'A1: Quantity' });
    await userEvent.dblClick(quantity);
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '20');
    await userEvent.tab();
    await expect(canvas.getByRole('textbox', { name: 'C3: Total' })).toHaveValue('1180');
  },
};
export const Structured: Story = {
  args: {
    mode: 'structured',
    initialValue: [{ id: 'line-1', description: 'Widget', quantity: 2, available: true, category: 'Hardware' }],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Insert' }));
    await userEvent.click(within(canvasElement.ownerDocument.body).getByRole('button', { name: 'Add row' }));
    await waitFor(() => expect(canvas.getAllByRole('spinbutton')).toHaveLength(2));
  },
};
export const ReadOnly: Story = { args: { initialValue: content, readOnly: true } };
export const RequiredEmpty: Story = { args: { required: true, showError: true } };

export const Menus: Story = {
  args: { initialValue: content },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await expect(page.queryByRole('button', { name: 'Add row' })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Insert' }));
    await userEvent.click(page.getByRole('button', { name: 'Add row' }));
    await waitFor(() => expect(canvas.getByRole('textbox', { name: 'A4: Specification' })).toBeInTheDocument());
    await expect(page.queryByRole('button', { name: 'Add row' })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Edit' }));
    await userEvent.click(page.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(canvas.queryByRole('textbox', { name: 'A4: Specification' })).not.toBeInTheDocument());
    await userEvent.pointer({
      target: canvas.getByRole('columnheader', { name: /A/ }),
      keys: '[MouseRight]',
    });
    await expect(page.getByRole('button', { name: 'Move left' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await expect(page.queryByRole('button', { name: 'Move left' })).not.toBeInTheDocument();
  },
};

const longContent = pasteCells(
  createTable(contentOptions),
  Array.from({ length: 30 }, (_, i) => [`Item ${i + 1}`, `Details for item ${i + 1}`]),
  0,
  0,
  contentOptions,
);
longContent.appearance = {
  rows: { [longContent.rows[0].id]: 'highlight' },
  cells: { [longContent.rows[0].id]: { [longContent.columns[1].id]: 'success' } },
};
export const BackgroundsAndStickyRows: Story = {
  args: { initialValue: longContent, stickyRows: { enabled: true, top: 2, bottom: 1 } },
};
export const CustomPalette: Story = {
  args: {
    initialValue: content,
    palette: [
      {
        key: 'brand',
        label: 'Brand',
        background: { light: '#d9eee7', dark: '#24463c' },
        text: { light: '#163c2e', dark: '#e7fff3' },
      },
      {
        key: 'sand',
        label: 'Sand',
        background: { light: '#fff3c4', dark: '#554923' },
        text: { light: '#403300', dark: '#fff3c4' },
      },
    ],
  },
};
export const NoStyling: Story = { args: { initialValue: content, palette: [], stickyRows: { enabled: false } } };
export const ClearConfirmation: Story = {
  args: { initialValue: content },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: 'Table' }));
    await userEvent.click(page.getByRole('button', { name: 'Clear table' }));
    const dialog = await page.findByRole('dialog');
    await expect(canvas.getByRole('table', { name: 'Table content' })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await expect(canvas.getByRole('table', { name: 'Table content' })).toBeInTheDocument();
  },
};
