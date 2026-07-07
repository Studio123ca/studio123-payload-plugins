import type { Field } from 'payload';

export type CodeFieldConfig = {
  label?: string;
  height?: number;
  language?: 'html' | 'text';
  description?: string;
  name?: string;
  required?: boolean;
};

export type CodeFieldClientProps = {
  height?: number;
  language?: 'html' | 'text';
};

export const codeField = ({
  label = 'Code',
  description,
  height = 360,
  language = 'html',
  name = 'code',
  required = true,
}: CodeFieldConfig = {}): Field => {
  return {
    name,
    label,
    type: 'textarea',
    required,
    admin: {
      description,
      components: {
        Field: {
          path: '@studio123/payload-advanced-fields/client',
          exportName: 'CodeField',
          clientProps: {
            height,
            language,
          },
        },
      },
    },
  };
};
