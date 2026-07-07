'use client';

import { html } from '@codemirror/lang-html';
import CodeMirror from '@uiw/react-codemirror';
import { useField } from '@payloadcms/ui/forms/useField';
import type { ChangeEvent } from 'react';

export type CodeFieldClientProps = {
	height?: number;
	language?: 'html' | 'text';
};

type Props = CodeFieldClientProps & {
	field: {
		admin?: {
			description?: unknown;
			readOnly?: boolean;
		};
		label?: unknown;
		name: string;
	};
	path: string;
	readOnly?: boolean;
};

const resolveLocalizedLabel = (value: unknown, localeCode: string, fallback: string) => {
	if (typeof value === 'string') return value;
	if (value && typeof value === 'object') {
		const localizedValue = (value as Record<string, unknown>)[localeCode];
		if (typeof localizedValue === 'string') return localizedValue;

		const firstStringValue = Object.values(value).find(item => typeof item === 'string');
		if (typeof firstStringValue === 'string') return firstStringValue;
	}

	return fallback;
};

const CodeField = ({
	path,
	field,
	readOnly,
	height = 360,
	language = 'html',
}: Props) => {
	const { value = '', setValue, showError, errorMessage, disabled } = useField<string>({ path });
	const label = resolveLocalizedLabel(field.label, 'en', field.name);
	const description = resolveLocalizedLabel(field.admin?.description, 'en', '');
	const isReadOnly = Boolean(readOnly || disabled || field.admin?.readOnly);
	const extensions = language === 'html' ? [html()] : [];

	return (
		<div className="field-type textarea">
			<label className="field-label" htmlFor={path}>
				{label}
			</label>
			{description ? <div className="field-description">{description}</div> : null}
			<div
				style={{
					border: '1px solid var(--theme-elevation-200)',
					borderRadius: '4px',
					overflow: 'hidden',
					background: 'var(--theme-elevation-50)',
				}}
			>
				<CodeMirror
					value={value}
					height={typeof height === 'number' ? `${height}px` : height}
					extensions={extensions}
					editable={!isReadOnly}
					basicSetup={{
						lineNumbers: true,
						foldGutter: true,
						bracketMatching: true,
					}}
					onChange={(next: string) => {
						if (!isReadOnly) setValue(next);
					}}
					style={{ fontSize: '0.9rem' }}
				/>
			</div>
			{showError && errorMessage ? <div className="field-error">{errorMessage}</div> : null}
		</div>
	);
};

export default CodeField;
