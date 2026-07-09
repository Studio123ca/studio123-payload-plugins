import type { CodeField, CodeLanguage } from '../shared/types.js';

export type CodeFieldConfig = Partial<Omit<CodeField, 'type'>> & {
	height?: number;
	language?: CodeLanguage;
};

export type { CodeField } from '../shared/types.js';

export const codeField = (config: CodeFieldConfig = {}): CodeField => {
	const {
		name = 'code',
		label = 'Code',
		height = 360,
		language = 'html',
		required = true,
		admin,
		...rest
	} = config;

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
					clientProps: {
						height,
						language,
					},
				},
				...(admin?.components || {}),
			},
		},
		...rest,
	} as CodeField;
};
