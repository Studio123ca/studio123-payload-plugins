import type { Preview } from '@storybook/react-vite';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { handlers } from '../storybook/support/api.js';
import '@payloadcms/ui/css/app.css';
import '../storybook/support/styles.css';

const preview: Preview = {
  loaders: [mswLoader()],
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    msw: { handlers },
    options: { storySort: { order: ['Fields', ['Code', 'Color', 'Link', 'Phone', 'Table']] } },
  },
  globalTypes: {
    theme: {
      description: 'Payload theme',
      toolbar: { icon: 'paintbrush', items: ['light', 'dark'], dynamicTitle: true },
    },
    locale: { description: 'Content locale', toolbar: { icon: 'globe', items: ['en', 'fr'], dynamicTitle: true } },
  },
  initialGlobals: { theme: 'light', locale: 'en' },
};
export default preview;
