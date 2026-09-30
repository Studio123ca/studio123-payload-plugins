import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataTableField } from '../packages/payload-advanced-fields/src/data-table-field/admin/DataTableField.js';
import {
  createDataTable,
  resolveDataTableOptions,
} from '../packages/payload-advanced-fields/src/data-table-field/shared/dataTable.js';
import { PayloadField, commonArgs, commonArgTypes, fieldProps } from './support/PayloadField.js';
import type { FieldControls } from './support/PayloadField.js';

type Args = FieldControls & {
  initialColumns: number;
  initialRows: number;
  maxColumns: number;
  maxRows: number;
  maxHeight: number;
  formulas: boolean | { enabled?: boolean; compute?: boolean };
};

const options = resolveDataTableOptions();
const example = createDataTable(options);
example.columns[0].label = 'Product';
example.columns[1].label = 'Price';
example.columns[2].label = 'Notes';
example.rows[0].cells = ['Widget', '$24.00', 'Available'];
example.rows[1].cells = ['Gizmo', '$40.00', 'Made to order'];
const formulaOptions = resolveDataTableOptions({
  initialColumns: 3,
  initialRows: 3,
  formulas: { enabled: true, compute: true },
});
const formulaExample = createDataTable(formulaOptions);
formulaExample.columns[0].label = 'Units';
formulaExample.columns[1].label = 'Price';
formulaExample.columns[2].label = 'Total';
formulaExample.rows[0].cells = ['2', '12.5', { formula: '=A1*B1' }];
formulaExample.rows[1].cells = ['3', '8', { formula: '=A2*B2' }];
formulaExample.rows[2].cells = ['Total', '', { formula: '=SUM(C1:C2)' }];

const meta = {
  title: 'Fields/Data Table',
  tags: ['autodocs'],
  args: {
    ...commonArgs,
    label: 'Data Table',
    initialColumns: 3,
    initialRows: 3,
    maxColumns: 20,
    maxRows: 100,
    maxHeight: 420,
    formulas: false,
  },
  argTypes: {
    ...commonArgTypes,
    initialColumns: { control: { type: 'number', min: 1, max: 20 } },
    initialRows: { control: { type: 'number', min: 1, max: 100 } },
    maxColumns: { control: { type: 'number', min: 1, max: 100 } },
    maxRows: { control: { type: 'number', min: 1, max: 1_000 } },
    maxHeight: { control: { type: 'number', min: 120, max: 1_000 } },
    formulas: { control: 'object', description: 'Use { enabled: true, compute: true } for spreadsheet formulas.' },
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
export const ReadOnly: Story = { args: { initialValue: example, readOnly: true } };
export const RequiredEmpty: Story = { args: { required: true, showError: true } };
