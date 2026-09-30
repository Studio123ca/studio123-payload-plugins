import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataTableField } from '../packages/payload-advanced-fields/src/data-table-field/admin/DataTableField.js';
import {
  createDataTable,
  resolveDataTableOptions,
} from '../packages/payload-advanced-fields/src/data-table-field/shared/dataTable.js';
import { PayloadField, commonArgs, commonArgTypes, fieldProps } from './support/PayloadField.js';
import type { FieldControls } from './support/PayloadField.js';

type Args = FieldControls & {
  columns: { initial: number; max: number; min: number };
  rows: { initial: number; max: number; min: number };
  maxHeight: number;
  formulas: boolean | { enabled?: boolean; compute?: boolean };
  formats: Array<{
    key: string;
    label: string;
    background: string | { light: string; dark: string };
    text?: string | { light: string; dark: string };
  }>;
  stickyRows: { enabled?: boolean; top?: number; bottom?: number };
};

const options = resolveDataTableOptions();
const example = createDataTable(options);
example.columns[0].label = 'Product';
example.columns[1].label = 'Price';
example.columns[2].label = 'Notes';
example.rows[0].cells = ['Widget', '$24.00', 'Available'];
example.rows[1].cells = ['Gizmo', '$40.00', 'Made to order'];
const formulaOptions = resolveDataTableOptions({
  columns: { initial: 3 },
  rows: { initial: 3 },
  formulas: { enabled: true, compute: true },
});
const formulaExample = createDataTable(formulaOptions);
formulaExample.columns[0].label = 'Units';
formulaExample.columns[1].label = 'Price';
formulaExample.columns[2].label = 'Total';
formulaExample.rows[0].cells = ['2', '12.5', { formula: '=A1*B1' }];
formulaExample.rows[1].cells = ['3', '8', { formula: '=A2*B2' }];
formulaExample.rows[2].cells = ['Total', '', { formula: '=SUM(C1:C2)' }];
const formatOptions = resolveDataTableOptions({
  columns: { initial: 3 },
  rows: { initial: 3 },
  formats: [
    { key: 'highlight', label: 'Highlight', background: 'var(--color-bg-warning-tertiary, #fff3c4)' },
    { key: 'success', label: 'Success', background: 'var(--color-bg-success-tertiary, #d9f0df)' },
  ],
});
const formattedExample = createDataTable(formatOptions);
formattedExample.columns[0].label = 'Product';
formattedExample.columns[1].label = 'Status';
formattedExample.columns[2].label = 'Notes';
formattedExample.rows[0].cells = ['Widget', 'Ready', 'Format this row or cell from the menu'];
formattedExample.rows[1].cells = ['Gizmo', 'Review', ''];
formattedExample.appearance = { rows: { [formattedExample.rows[0].id]: 'highlight' } };
const freezeOptions = resolveDataTableOptions({
  columns: { initial: 3 },
  rows: { initial: 8 },
  stickyRows: { enabled: true, top: 1, bottom: 1 },
});
const freezeExample = createDataTable(freezeOptions);
freezeExample.columns.forEach((column, index) => {
  column.label = ['Name', 'Status', 'Notes'][index] ?? column.label;
});
freezeExample.rows.forEach((row, index) => {
  row.cells = [`Row ${index + 1}`, index % 2 ? 'In progress' : 'Complete', 'Scroll to test sticky rows'];
});
freezeExample.appearance = { stickyRows: { top: 1, bottom: 1 } };

const meta = {
  title: 'Fields/Data Table',
  tags: ['autodocs'],
  args: {
    ...commonArgs,
    label: 'Data Table',
    columns: { initial: 3, max: 20, min: 1 },
    rows: { initial: 3, max: 100, min: 1 },
    maxHeight: 420,
    formulas: false,
    formats: [],
    stickyRows: { enabled: true, top: 0, bottom: 0 },
  },
  argTypes: {
    ...commonArgTypes,
    columns: { control: 'object', description: 'Configure initial, minimum, and maximum columns.' },
    rows: { control: 'object', description: 'Configure initial, minimum, and maximum rows.' },
    maxHeight: { control: { type: 'number', min: 120, max: 1_000 } },
    formulas: { control: 'object', description: 'Use { enabled: true, compute: true } for spreadsheet formulas.' },
    formats: { control: 'object', description: 'Optional format choices. The Format menu is hidden when empty.' },
    stickyRows: { control: 'object', description: 'Configure sticky top and bottom row counts.' },
  },
  render: (args, { globals }) => {
    const resolved = resolveDataTableOptions(args);
    return (
      <PayloadField args={args} theme={globals.theme} locale={globals.locale}>
        <DataTableField {...fieldProps(args, 'json')} options={resolved} maxHeight={args.maxHeight} />
      </PayloadField>
    );
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Populated: Story = { args: { initialValue: example } };
export const Formulas: Story = {
  args: { initialValue: formulaExample, formulas: { enabled: true, compute: true } },
};
export const Formatted: Story = {
  args: { initialValue: formattedExample, formats: formatOptions.formats },
};
export const FreezeRows: Story = {
  args: {
    initialValue: freezeExample,
    maxHeight: 220,
    stickyRows: { enabled: true, top: 1, bottom: 1 },
  },
};
export const ReadOnly: Story = { args: { initialValue: example, readOnly: true } };
export const RequiredEmpty: Story = { args: { required: true, showError: true } };
