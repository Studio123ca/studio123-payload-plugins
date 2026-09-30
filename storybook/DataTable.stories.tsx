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
};

const options = resolveDataTableOptions();
const example = createDataTable(options);
example.columns[0].label = 'Product';
example.columns[1].label = 'Price';
example.columns[2].label = 'Notes';
example.rows[0].cells = ['Widget', '$24.00', 'Available'];
example.rows[1].cells = ['Gizmo', '$40.00', 'Made to order'];

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
  },
  argTypes: {
    ...commonArgTypes,
    initialColumns: { control: { type: 'number', min: 1, max: 20 } },
    initialRows: { control: { type: 'number', min: 1, max: 100 } },
    maxColumns: { control: { type: 'number', min: 1, max: 100 } },
    maxRows: { control: { type: 'number', min: 1, max: 1_000 } },
    maxHeight: { control: { type: 'number', min: 120, max: 1_000 } },
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
export const ReadOnly: Story = { args: { initialValue: example, readOnly: true } };
export const RequiredEmpty: Story = { args: { required: true, showError: true } };
