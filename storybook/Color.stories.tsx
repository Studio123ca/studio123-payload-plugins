import type { Meta, StoryObj } from '@storybook/react-vite';
import ColorField from '../packages/payload-advanced-fields/src/color-field/admin/ColorField.client.js';
import type { ColorPickerType } from '../packages/payload-advanced-fields/src/color-field/shared/types.js';
import { PayloadField, commonArgs, commonArgTypes, fieldProps } from './support/PayloadField.js';
import type { FieldControls } from './support/PayloadField.js';
type Args = FieldControls & { pickerType: ColorPickerType; disableAlpha: boolean; showPresets: boolean };
const meta = {
  title: 'Fields/Color',
  tags: ['autodocs'],
  args: {
    ...commonArgs,
    label: 'Brand color',
    initialValue: { hex: '#235f50', alpha: 1, label: 'Forest', slug: 'forest' },
    pickerType: 'sketch',
    disableAlpha: false,
    showPresets: true,
  },
  argTypes: {
    ...commonArgTypes,
    pickerType: {
      control: 'select',
      options: [
        'sketch',
        'block',
        'compact',
        'slider',
        'github',
        'material',
        'colorful',
        'wheel',
        'chrome',
        'swatches',
      ],
    },
    disableAlpha: { control: 'boolean' },
    showPresets: { control: 'boolean' },
  },
  render: (args, { globals }) => (
    <PayloadField args={args} theme={globals.theme} locale={globals.locale}>
      <ColorField
        {...fieldProps(args)}
        pickerType={args.pickerType}
        disableAlpha={args.disableAlpha}
        presetColors={
          args.showPresets
            ? [
                { hex: '#235f50', label: 'Forest', slug: 'forest' },
                { hex: '#e7bb70', label: 'Sand', slug: 'sand' },
                { hex: '#303b55', label: 'Slate', slug: 'slate' },
              ]
            : undefined
        }
      />
    </PayloadField>
  ),
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Swatches: Story = { args: { pickerType: 'swatches', disableAlpha: true } };
export const Wheel: Story = { args: { pickerType: 'wheel' } };
export const Empty: Story = { args: { initialValue: null } };
export const ReadOnly: Story = { args: { readOnly: true } };
