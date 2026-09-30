import type { Meta, StoryObj } from '@storybook/react-vite';
import CodeField from '../src/code-field/admin/CodeField.client.js';
import { CODE_LANGUAGES, type CodeLanguage } from '../src/code-field/shared/types.js';
import { PayloadField, commonArgs, commonArgTypes, fieldProps } from './support/PayloadField.js';
import type { FieldControls } from './support/PayloadField.js';
type Args = FieldControls & { language: CodeLanguage; height: number };
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
    language: { control: 'select', options: CODE_LANGUAGES },
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
export const TypeScript: Story = {
  args: {
    language: 'typescript',
    initialValue: 'type Greeting = { name: string };\n\nconst greet = ({ name }: Greeting) => `Hello, ${name}!`;',
  },
};
export const JSON: Story = { args: { language: 'json', initialValue: '{\n  "name": "studio123"\n}' } };
export const Markdown: Story = {
  args: { language: 'markdown', initialValue: '# Hello\n\nCodeMirror supports **Markdown**.' },
};
export const ReadOnly: Story = { args: { readOnly: true } };
export const Empty: Story = { args: { initialValue: '' } };
