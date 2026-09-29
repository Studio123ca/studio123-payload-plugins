import type { Meta, StoryObj } from '@storybook/react-vite';
import CodeField from '../packages/payload-advanced-fields/src/code-field/admin/CodeField.client.js';
import { PayloadField, commonArgs, commonArgTypes, fieldProps } from './support/PayloadField.js';
import type { FieldControls } from './support/PayloadField.js';
type Args = FieldControls & { language: 'html' | 'text'; height: number };
const meta = {
  title: 'Fields/Code',
  tags: ['autodocs'],
  args: {
    ...commonArgs,
    label: 'Embed code',
    initialValue: '<section class="intro">\n  <h1>Hello, studio.</h1>\n</section>',
    language: 'html',
    height: 280,
  },
  argTypes: {
    ...commonArgTypes,
    initialValue: { control: 'text' },
    language: { control: 'radio', options: ['html', 'text'] },
    height: { control: { type: 'range', min: 120, max: 600, step: 20 } },
  },
  render: (args, { globals }) => (
    <PayloadField args={args} theme={globals.theme} locale={globals.locale}>
      <CodeField {...fieldProps(args, 'textarea')} language={args.language} height={args.height} />
    </PayloadField>
  ),
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const PlainText: Story = { args: { language: 'text', initialValue: 'Plain text without syntax highlighting.' } };
export const ReadOnly: Story = { args: { readOnly: true } };
export const Empty: Story = { args: { initialValue: '' } };
