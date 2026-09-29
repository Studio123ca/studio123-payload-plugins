import type { Meta, StoryObj } from '@storybook/react-vite';
import PhoneField from '../packages/payload-advanced-fields/src/phone-field/admin/PhoneField.client.js';
import { PayloadField, commonArgs, commonArgTypes, fieldProps } from './support/PayloadField.js';
import type { FieldControls } from './support/PayloadField.js';
type Args = FieldControls & {
  defaultCountry: string;
  countrySelector: boolean;
  extension: boolean;
  formatterMode: 'international' | 'national';
  placeholder: string;
};
const meta = {
  title: 'Fields/Phone',
  tags: ['autodocs'],
  args: {
    ...commonArgs,
    label: 'Support phone',
    defaultCountry: 'CA',
    countrySelector: true,
    extension: false,
    formatterMode: 'international',
    placeholder: '(416) 555-0123',
  },
  argTypes: {
    ...commonArgTypes,
    defaultCountry: { control: 'select', options: ['CA', 'US', 'GB', 'FR', 'AU'] },
    countrySelector: { control: 'boolean' },
    extension: { control: 'boolean' },
    formatterMode: { control: 'radio', options: ['international', 'national'] },
    placeholder: { control: 'text' },
  },
  render: (args, { globals }) => (
    <PayloadField args={args} theme={globals.theme} locale={globals.locale}>
      <PhoneField
        {...fieldProps(args)}
        field={
          {
            ...fieldProps(args).field,
            admin: { ...fieldProps(args).field.admin, placeholder: args.placeholder },
          } as Parameters<typeof PhoneField>[0]['field']
        }
        defaultCountry={args.defaultCountry}
        countries={{ enabled: args.countrySelector, enabledCountries: ['CA', 'US', 'GB', 'FR', 'AU'] }}
        extension={{ enabled: args.extension }}
        formatterMode={args.formatterMode}
      />
    </PayloadField>
  ),
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const WithExtension: Story = {
  args: {
    extension: true,
    initialValue: {
      number: '+14165550123',
      country: 'CA',
      ext: '42',
      international: '+1 416 555 0123',
      national: '(416) 555-0123',
    },
  },
};
export const NationalFormat: Story = {
  args: {
    formatterMode: 'national',
    initialValue: {
      number: '+14165550123',
      country: 'CA',
      international: '+1 416 555 0123',
      national: '(416) 555-0123',
    },
  },
};
export const InvalidNumber: Story = { args: { initialValue: { number: '123' }, required: true, showError: true } };
export const ReadOnly: Story = {
  args: { readOnly: true, initialValue: { number: '+14165550123', international: '+1 416 555 0123' } },
};
