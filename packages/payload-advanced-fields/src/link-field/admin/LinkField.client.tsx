'use client';

import { useField } from '@payloadcms/ui/forms/useField';
import { useModal } from '@payloadcms/ui/elements/Modal';
import { FieldDescription } from '@payloadcms/ui/fields/FieldDescription';
import { FieldError } from '@payloadcms/ui/fields/FieldError';
import { FieldLabel } from '@payloadcms/ui/fields/FieldLabel';
import { fieldBaseClass } from '@payloadcms/ui/fields/shared';
import type { LinkType, LinkValue } from '../shared/types.js';
import { LinkFieldPreview } from './LinkFieldPreview.js';
import { LinkFieldModal } from './LinkFieldModal.js';

type Props = {
	field: {
		admin?: {
			description?: string;
			readOnly?: boolean;
		};
		label?: string;
		localized?: boolean;
		name: string;
		required?: boolean;
	};
	path: string;
	label?: string;
	collectionSlugs?: string[];
	defaultType?: LinkType;
	localized?: boolean;
	required?: boolean;
};

const resolveLocalizedLabel = (value: unknown, fallback: string) => {
	if (typeof value === 'string') return value;
	if (value && typeof value === 'object') {
		const firstStringValue = Object.values(value as Record<string, unknown>).find(item => typeof item === 'string');
		if (typeof firstStringValue === 'string') return firstStringValue;
	}
	return fallback;
};

export function LinkField(props: Props) {
	const { collectionSlugs, defaultType = 'external', field, label, localized, path, required } = props;
	const { disabled, showError, value, setValue } = useField<LinkValue | null>({ potentiallyStalePath: path });
	const { openModal } = useModal();

	const currentValue = (value as LinkValue | null) ?? null;
	const fieldLabel = resolveLocalizedLabel(label || field.label, field.name);
	const description = resolveLocalizedLabel(field.admin?.description, '');
	const modalSlug = `link-field-${path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
	const isRequired = required ?? field.required ?? false;
	const isLocalized = localized ?? field.localized ?? false;
	const className = [fieldBaseClass, 'link', showError && 'error', disabled && 'read-only'].filter(Boolean).join(' ');

	return (
		<div className={className} data-size="large" id={`field-${path.replace(/\./g, '__')}`}>
			<FieldLabel label={fieldLabel} localized={isLocalized} path={path} required={isRequired} />
			<div className={`${fieldBaseClass}__wrap`}>
				<FieldError path={path} showError={showError} />
				<LinkFieldPreview
					collectionSlugs={collectionSlugs}
					onClear={() => setValue(null)}
					onEdit={disabled ? undefined : () => openModal(modalSlug)}
					value={currentValue}
				/>
				<FieldDescription description={description} path={path} />
			</div>
			<LinkFieldModal
				collectionSlugs={collectionSlugs}
				defaultType={defaultType}
				modalSlug={modalSlug}
				onCancel={() => void 0}
				onSave={nextValue => setValue(nextValue)}
				value={currentValue}
			/>
		</div>
	);
}

export default LinkField;
