'use client';

import { html } from '@codemirror/lang-html';
import CodeMirror from '@uiw/react-codemirror';
import { useField } from '@payloadcms/ui/forms/useField';
import { FieldDescription } from '@payloadcms/ui/fields/FieldDescription';
import { FieldError } from '@payloadcms/ui/fields/FieldError';
import { FieldLabel } from '@payloadcms/ui/fields/FieldLabel';
import { fieldBaseClass } from '@payloadcms/ui/fields/shared';
import type { TextareaFieldClientProps } from 'payload';

export type CodeFieldClientProps = {
	height?: number;
	language?: 'html' | 'text';
};

type Props = TextareaFieldClientProps & CodeFieldClientProps;

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
	const { value = '', setValue, showError, disabled } = useField<string>({ path });
	const label = resolveLocalizedLabel(field.label, 'en', field.name);
	const description = resolveLocalizedLabel(field.admin?.description, 'en', '');
	const isLocalized = Boolean(field.localized);
	const isReadOnly = Boolean(readOnly || disabled || field.admin?.readOnly);
	const extensions = language === 'html' ? [html()] : [];
	const className = [fieldBaseClass, 'textarea', showError && 'error', isReadOnly && 'read-only'].filter(Boolean).join(' ');

	return (
		<div className={className} data-size="large" id={`field-${path.replace(/\./g, '__')}`}>
			<div style={{ whiteSpace: 'nowrap' }}>
				<FieldLabel label={label} localized={isLocalized} path={path} required={field.required} />
			</div>
			<div className={`${fieldBaseClass}__wrap`}>
				<FieldError path={path} showError={showError} />
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
				<FieldDescription description={description} path={path} />
			</div>
		</div>
	);
};

export default CodeField;
