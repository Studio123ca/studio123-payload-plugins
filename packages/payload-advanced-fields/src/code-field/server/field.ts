import type { CodeField, CodeLanguage } from '../shared/types.js';
import {
  assertCodeLanguage,
  DEFAULT_CODE_LANGUAGE,
  normalizeCodeFieldHeight,
  normalizeCodeFieldRows,
} from '../shared/utils.js';

export type CodeFieldConfig = Partial<Omit<CodeField, 'type'>> & {
  height?: number;
  language?: CodeLanguage;
};

export type { CodeField } from '../shared/types.js';

export const codeField = (config: CodeFieldConfig = {}): CodeField => {
  const {
    name = 'code',
    label = 'Code',
    height,
    language = DEFAULT_CODE_LANGUAGE,
    required = true,
    admin,
    ...rest
  } = config;

  assertCodeLanguage(language);

  const clientProps = {
    language,
    ...(height === undefined ? {} : { height: normalizeCodeFieldHeight(height) }),
    ...(admin?.rows === undefined ? {} : { rows: normalizeCodeFieldRows(admin.rows) }),
  };

  return {
    name,
    label,
    type: 'textarea',
    required,
    admin: {
      ...admin,
      components: {
        Field: {
          path: '@studio123/payload-advanced-fields/code/client',
          exportName: 'CodeField',
          clientProps,
        },
        ...(admin?.components || {}),
      },
    },
    ...rest,
  } as CodeField;
};
