import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { TableField } from '../packages/payload-advanced-fields/src/table-field/admin/TableField.js';
import { StructuredTableField } from '../packages/payload-advanced-fields/src/table-field/admin/StructuredTableField.js';
import {
  createTable,
  pasteCells,
  resolveTableOptions,
} from '../packages/payload-advanced-fields/src/table-field/shared/table.js';
import { csvToTable, tableToCSV } from '../packages/payload-advanced-fields/src/table-field/shared/csv.js';
import type { TableValue } from '../packages/payload-advanced-fields/src/table-field/shared/types.js';
import { PayloadField, commonArgs, commonArgTypes, fieldProps } from './support/PayloadField.js';
import type { FieldControls } from './support/PayloadField.js';

type Args = FieldControls & {
  mode: 'content' | 'spreadsheet' | 'structured';
  storage: 'json' | 'csv';
  formulas: boolean;
  headerRow: boolean;
  initialRows: number;
  initialColumns: number;
  maxRows: number;
  maxColumns: number;
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

const meta = {
  title: 'Fields/Table',
  tags: ['autodocs'],
  args: {
    ...commonArgs,
    label: 'Table',
    mode: 'content',
    storage: 'json',
    formulas: false,
    headerRow: true,
    initialRows: 2,
    initialColumns: 2,
    maxRows: 100,
    maxColumns: 20,
  },
  argTypes: {
    ...commonArgTypes,
    mode: { control: 'select', options: ['content', 'spreadsheet', 'structured'] },
    storage: { control: 'radio', options: ['json', 'csv'], if: { arg: 'mode', eq: 'content' } },
    formulas: { control: 'boolean', if: { arg: 'mode', eq: 'spreadsheet' } },
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
          'Content tables store JSON or CSV strings. Structured tables use native Payload arrays. Spreadsheets support bounded formulas. Settings reset the in-memory example; this does not migrate persisted data.',
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
            <TableField {...fieldProps(args, 'textarea')} options={options} />
          ) : (
            <TableField {...fieldProps(args, 'json')} options={options} />
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
  args: { mode: 'spreadsheet', formulas: true, initialValue: sheet },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const quantity = canvas.getByRole('textbox', { name: 'A1: Quantity' });
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
    await userEvent.click(canvas.getByRole('button', { name: 'Column A actions' }));
    await expect(page.getByRole('button', { name: 'Move left' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await expect(page.queryByRole('button', { name: 'Move left' })).not.toBeInTheDocument();
  },
};
