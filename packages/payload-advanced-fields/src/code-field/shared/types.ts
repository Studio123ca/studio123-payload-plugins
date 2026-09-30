import type { TextareaField, PayloadComponent } from 'payload';

export const CODE_LANGUAGES = [
  'html',
  'css',
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'json',
  'markdown',
  'text',
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export type CodeFieldClientComponent = {
  height?: number;
  language?: CodeLanguage;
  localized?: boolean;
  rows?: number;
};

export type CodeFieldErrorComponent = {
  path: string;
  showError: boolean;
};

export type CodeFieldLabelComponent = any;

/**
 * CodeField - A custom textarea field that renders a code editor in the admin UI
 * Extends Payload's TextareaField with code-specific properties
 */
export type CodeField = {
  type: 'textarea';
  height?: number;
  language?: CodeLanguage;
  admin?: TextareaField['admin'] & {
    components?: {
      Field?: PayloadComponent<any>;
    };
  };
} & Omit<TextareaField, 'admin' | 'type'>;
