import type { Meta, StoryObj } from '@storybook/react-vite';
import MessageField from '../src/message-field/admin/MessageField.client.js';
import type { MessageTone } from '../src/message-field/shared/types.js';
import { PayloadField, commonArgs, commonArgTypes } from './support/PayloadField.js';
import type { FieldControls } from './support/PayloadField.js';

type Args = FieldControls & { banner: boolean; message: string; tone: MessageTone };

const meta = {
  title: 'Fields/Message',
  tags: ['autodocs'],
  args: {
    ...commonArgs,
    label: 'Publishing notice',
    message: 'Changes are reviewed before they are published.',
    tone: 'info' as MessageTone,
    banner: false,
  },
  argTypes: {
    ...commonArgTypes,
    initialValue: { control: false },
    description: { control: false },
    required: { control: false },
    readOnly: { control: false },
    showError: { control: false },
    banner: { control: 'boolean' },
    tone: { control: 'select', options: ['info', 'success', 'warning', 'error'] },
  },
  render: (args, { globals }) => (
    <PayloadField args={args} theme={globals.theme} locale={globals.locale}>
      <MessageField
        path="message"
        field={{
          name: 'message',
          type: 'ui',
          label: args.label,
          admin: { custom: { banner: args.banner, message: args.message, tone: args.tone } },
        }}
      />
    </PayloadField>
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Success: Story = { args: { tone: 'success', message: 'All checks passed.' } };
export const Warning: Story = { args: { tone: 'warning', message: 'This change still needs review.' } };
export const Error: Story = { args: { tone: 'error', message: 'Publishing is blocked until the issue is fixed.' } };
export const BannerStyle: Story = { args: { banner: true, tone: 'warning' } };
export const WithoutLabel: Story = { args: { label: '', message: 'This message has no heading.' } };
