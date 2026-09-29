import type { Meta, StoryObj } from '@storybook/react-vite';
import LinkField from '../packages/payload-advanced-fields/src/link-field/admin/LinkField.client.js';
import type { LinkType } from '../packages/payload-advanced-fields/src/link-field/shared/types.js';
import { PayloadField, commonArgs, commonArgTypes, fieldProps } from './support/PayloadField.js';
import type { FieldControls } from './support/PayloadField.js';
type Args = FieldControls & { defaultType: LinkType };
const meta = {
  title: 'Fields/Link',
  tags: ['autodocs'],
  args: {
    ...commonArgs,
    label: 'Call to action',
    defaultType: 'external',
    initialValue: { type: 'external', label: 'Visit Studio123', external: 'https://studio123.ca', newTab: true },
  },
  argTypes: {
    ...commonArgTypes,
    defaultType: { control: 'select', options: ['external', 'internal', 'email', 'phone'] },
  },
  render: (args, { globals }) => (
    <PayloadField args={args} theme={globals.theme} locale={globals.locale}>
      <LinkField {...fieldProps(args)} defaultType={args.defaultType} collectionSlugs={['pages']} />
    </PayloadField>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'The real Link drawer and relationship control, backed by local About, Services, and Contact page fixtures. Nothing is saved to a CMS.',
      },
    },
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Empty: Story = { args: { initialValue: null } };
export const Internal: Story = {
  args: {
    defaultType: 'internal',
    initialValue: {
      type: 'internal',
      label: 'Our services',
      internal: { relationTo: 'pages', value: 'services', title: 'Our services' },
      newTab: false,
    },
  },
};
export const Email: Story = {
  args: {
    defaultType: 'email',
    initialValue: { type: 'email', label: 'Email the studio', email: 'hello@example.test' },
  },
};
export const ReadOnly: Story = { args: { readOnly: true } };
