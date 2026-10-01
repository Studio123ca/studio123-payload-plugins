import {
  codeField,
  colorField,
  dataTableField,
  linkField,
  messageField,
  phoneField,
} from '@studio123/payload-advanced-fields';
import type { CollectionConfig } from 'payload';

export const FieldShowcases: CollectionConfig = {
  slug: 'field-showcases',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'updatedAt'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    messageField({
      name: 'messagePreview',
      label: 'Message field',
      message: 'This message field is rendered by the plugin.',
      tone: 'info',
    }),
    codeField({ name: 'codeExample', label: 'Code field', language: 'javascript', required: false }),
    linkField({ name: 'linkExample', label: 'Link field' }),
    colorField({ name: 'colorExample', label: 'Color field', pickerType: 'sketch' }),
    phoneField({ name: 'phoneExample', label: 'Phone field', defaultCountry: 'US' }),
    dataTableField({
      name: 'tableExample',
      label: 'Data Table field',
      columns: { max: 3 },
      rows: { max: 200 },
      formulas: { enabled: true, compute: true },
    }),
  ],
};
