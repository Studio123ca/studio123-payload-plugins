'use client';

import { useField } from '@payloadcms/ui/forms/useField';
import { useModal } from '@payloadcms/ui/elements/Modal';
import type { LinkFieldConfig, LinkValue } from '../shared/types.js';
import { LinkFieldPreview } from './LinkFieldPreview.js';
import { LinkFieldModal } from './LinkFieldModal.js';

type Props = {
	field: {
		admin?: {
			description?: string;
			readOnly?: boolean;
		};
		label?: string;
		name: string;
		required?: boolean;
	};
	path: string;
	label?: string;
	collectionSlugs?: string[];
	defaultType?: LinkFieldConfig['defaultType'];
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
	const { collectionSlugs, defaultType = 'external', field, label, path } = props;
	const { disabled, value, setValue } = useField<LinkValue | null>({ potentiallyStalePath: path });
	const { openModal } = useModal();

	const currentValue = (value as LinkValue | null) ?? null;
	const fieldLabel = resolveLocalizedLabel(label || field.label, field.name);
	const description = resolveLocalizedLabel(field.admin?.description, '');
	const modalSlug = `link-field-${path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

	return (
		<div className="field-type">
			<label className="field-label">
				{fieldLabel}
			</label>
			{description ? <div className="field-description">{description}</div> : null}
			<LinkFieldPreview
				collectionSlugs={collectionSlugs}
				onClear={() => setValue(null)}
				onEdit={disabled ? undefined : () => openModal(modalSlug)}
				value={currentValue}
			/>
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
