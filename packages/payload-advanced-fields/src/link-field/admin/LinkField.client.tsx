'use client';

import { useField } from '@payloadcms/ui/forms/useField';
import { useModal } from '@payloadcms/ui/elements/Modal';
import { FieldDescription } from '@payloadcms/ui/fields/FieldDescription';
import { FieldError } from '@payloadcms/ui/fields/FieldError';
import { FieldLabel } from '@payloadcms/ui/fields/FieldLabel';
import { fieldBaseClass } from '@payloadcms/ui/fields/shared';
import type { JSONFieldClientProps } from 'payload';
import type { ReactNode } from 'react';
import type { LinkType, LinkValue } from '../shared/types.js';
import { LinkFieldPreview } from './LinkFieldPreview.js';
import { LinkFieldModal } from './LinkFieldModal.js';

/**
 * Extends the link drawer with custom inputs (e.g. an icon select) whose value
 * lives outside the link JSON value, typically in a sibling field. Not
 * serializable, so it can't be passed via `clientProps` — wrap `LinkField` in
 * your own client component (registered as the field's `admin.components.Field`)
 * and pass it as a regular React prop.
 */
export type LinkFieldExtension<TValue = unknown> = {
  /** Committed extension value, used to seed the drawer's draft. */
  value?: TValue | null;
  /** Called with the drafted value on drawer Save, and with null on Clear. */
  onSave?: (next: TValue | null) => void;
  /** Renders extra inputs at the top of the drawer, editing a draft committed on Save. */
  render?: (args: { setValue: (next: TValue | null) => void; value: TValue | null }) => ReactNode;
  /**
   * Overrides the preview card's label content. Receives the default label text
   * and the current link value — return it decorated (icon before/after) or
   * replaced entirely.
   */
  renderPreviewLabel?: (args: { label: string; value: LinkValue | null }) => ReactNode;
};

type Props = JSONFieldClientProps & {
  collectionSlugs?: string[];
  defaultType?: LinkType;
  extension?: LinkFieldExtension;
  label?: string;
};

const resolveLocalizedLabel = (value: unknown, fallback: string) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const firstStringValue = Object.values(value as Record<string, unknown>).find((item) => typeof item === 'string');
    if (typeof firstStringValue === 'string') return firstStringValue;
  }
  return fallback;
};

export function LinkField(props: Props) {
  const { collectionSlugs, defaultType = 'external', extension, field, label, path, readOnly } = props;
  const { disabled, showError, value, setValue } = useField<LinkValue | null>({ potentiallyStalePath: path });
  const { openModal } = useModal();

  const isReadOnly = Boolean(readOnly || disabled || field.admin?.readOnly);
  const currentValue = (value as LinkValue | null) ?? null;
  const fieldLabel = resolveLocalizedLabel(label || field.label, field.name);
  const description = resolveLocalizedLabel(field.admin?.description, '');
  const modalSlug = `link-field-${path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const isRequired = Boolean(field.required);
  const isLocalized = Boolean(field.localized);
  const className = [fieldBaseClass, 'link', showError && 'error', isReadOnly && 'read-only'].filter(Boolean).join(' ');

  return (
    <div className={className} data-size="large" id={`field-${path.replace(/\./g, '__')}`}>
      <FieldLabel label={fieldLabel} localized={isLocalized} path={path} required={isRequired} />
      <div className={`${fieldBaseClass}__wrap`}>
        <FieldError path={path} showError={showError} />
        <LinkFieldPreview
          collectionSlugs={collectionSlugs}
          renderLabel={extension?.renderPreviewLabel}
          onClear={
            isReadOnly
              ? undefined
              : () => {
                  setValue(null);
                  extension?.onSave?.(null);
                }
          }
          onEdit={isReadOnly ? undefined : () => openModal(modalSlug)}
          value={currentValue}
        />
        <FieldDescription description={description} path={path} />
      </div>
      {!isReadOnly && (
        <LinkFieldModal
          collectionSlugs={collectionSlugs}
          defaultType={defaultType}
          extension={extension}
          modalSlug={modalSlug}
          onCancel={() => void 0}
          onSave={(nextValue) => setValue(nextValue)}
          value={currentValue}
        />
      )}
    </div>
  );
}

export default LinkField;
