'use client';

import { Button } from '@payloadcms/ui/elements/Button';
import { Drawer } from '@payloadcms/ui/elements/Drawer';
import { useConfig } from '@payloadcms/ui/providers/Config';
import { useLocale } from '@payloadcms/ui/providers/Locale';
import { useModal } from '@payloadcms/ui/elements/Modal';
import { CheckboxInput } from '@payloadcms/ui/fields/Checkbox';
import { FieldError } from '@payloadcms/ui/fields/FieldError';
import { RelationshipInput } from '@payloadcms/ui/fields/Relationship';
import { SelectInput } from '@payloadcms/ui/fields/Select';
import { TextInput } from '@payloadcms/ui/fields/Text';
import type { ValueWithRelation } from 'payload';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { LINK_TYPES } from '../shared/constants.js';
import { normalizeLinkValue, validateLink } from '../shared/validateLink.js';
import type { LinkValue } from '../shared/types.js';
import type { LinkFieldExtension } from './LinkField.client.js';
type Props = {
  collectionSlugs?: string[];
  defaultType: LinkValue['type'];
  extension?: LinkFieldExtension;
  modalSlug: string;
  onCancel: () => void;
  onSave: (value: LinkValue | null) => void;
  value: LinkValue | null;
};

type DrawerErrors = Partial<Record<'email' | 'external' | 'internal' | 'label' | 'phone' | 'type', string>>;

const emptyDraft = (defaultType: LinkValue['type']): LinkValue => ({
  type: defaultType,
  label: '',
  newTab: false,
  enableAnchor: false,
  internal: null,
  external: '',
  email: '',
  phone: '',
  anchor: '',
});

const getInternalValueId = (value: unknown): string | number | null => {
  if (typeof value === 'string' || typeof value === 'number') return value;

  if (typeof value === 'object' && value !== null && 'value' in value) {
    const nestedValue = (value as { value?: unknown }).value;
    if (typeof nestedValue === 'string' || typeof nestedValue === 'number') return nestedValue;
  }

  return null;
};

function LinkFieldModalBody({ collectionSlugs, defaultType, extension, modalSlug, onCancel, onSave, value }: Props) {
  const { closeModal } = useModal();
  const { config } = useConfig();
  const locale = useLocale()?.code;
  const [draft, setDraft] = useState<LinkValue>(value ?? emptyDraft(defaultType));
  const [extensionDraft, setExtensionDraft] = useState<unknown>(extension?.value ?? null);
  const [errors, setErrors] = useState<DrawerErrors>({});
  const lastDocTitleRef = useRef<string | null>(draft.internal?.title ?? null);

  const relationTo = collectionSlugs ?? [];
  const paths = {
    email: `${modalSlug}.email`,
    external: `${modalSlug}.external`,
    internal: `${modalSlug}.internal.value`,
    label: `${modalSlug}.label`,
    phone: `${modalSlug}.phone`,
  };
  const relationshipValue = draft.internal
    ? {
        value: draft.internal.value,
        relationTo: draft.internal.relationTo,
      }
    : null;

  const clearError = (key: keyof DrawerErrors) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  useEffect(() => {
    if (draft.type !== 'internal') return;

    const selectedID = getInternalValueId(draft.internal);
    const relation = draft.internal?.relationTo;
    const currentLabel = draft.label?.trim() ?? '';

    if (selectedID == null || selectedID === '' || !relation || !relationTo.includes(relation)) return;

    let cancelled = false;
    const loadTitle = async () => {
      try {
        const query = new URLSearchParams({ depth: '0', ...(locale ? { locale } : {}) });
        const response = await fetch(
          `${config.serverURL ?? ''}${config.routes.api}/${encodeURIComponent(relation)}/${encodeURIComponent(selectedID)}?${query}`,
        );
        if (!response.ok) return;

        const data = (await response.json()) as Record<string, unknown>;
        const titleField =
          config.collections.find((collection) => collection.slug === relation)?.admin?.useAsTitle ?? 'title';
        const titleValue = data[titleField];
        const title = typeof titleValue === 'string' || typeof titleValue === 'number' ? String(titleValue) : '';
        if (!title || cancelled) return;

        // Update label if current label is empty OR matches the previous doc's title (wasn't manually edited)
        const shouldAutoFill = currentLabel === '' || currentLabel === lastDocTitleRef.current;
        if (!shouldAutoFill) return;

        setDraft((prev) => {
          if (prev.type !== 'internal') return prev;
          if (getInternalValueId(prev.internal) !== selectedID || prev.internal?.relationTo !== relation) return prev;
          const prevLabel = prev.label?.trim() ?? '';
          if (prevLabel !== '' && prevLabel !== lastDocTitleRef.current) return prev;

          lastDocTitleRef.current = title;
          if (prev.label === title) return prev;
          return {
            ...prev,
            label: title,
          };
        });
      } catch {
        // Ignore title prefill failures.
      }
    };

    void loadTitle();

    return () => {
      cancelled = true;
    };
  }, [draft.internal, draft.label, draft.type, config, locale, collectionSlugs]);

  const handleSave = () => {
    const nextErrors: DrawerErrors = {};

    const collections = relationTo.map((slug) => ({ slug }));
    const validation = validateLink(draft, { collections, required: true });
    if (validation !== true) {
      const key = !draft.label?.trim() ? 'label' : draft.type;
      nextErrors[key] = validation;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    onSave(normalizeLinkValue(draft, collections));
    extension?.onSave?.(extensionDraft ?? null);
    closeModal(modalSlug);
  };

  const setType = (type: LinkValue['type']) => {
    setErrors({});
    setDraft((prev) => ({
      ...emptyDraft(type),
      label: prev.label,
      newTab: prev.newTab,
      enableAnchor: type === 'internal' ? prev.enableAnchor : false,
      anchor: type === 'internal' ? prev.anchor : null,
      type,
    }));
  };

  return (
    <div className="field-type">
      <div style={{ display: 'grid', gap: '1rem' }}>
        {extension?.render?.({ setValue: setExtensionDraft, value: extensionDraft ?? null })}
        <TextInput
          Error={<FieldError message={errors.label} path={paths.label} showError={Boolean(errors.label)} />}
          label="Label"
          path={paths.label}
          required
          showError={Boolean(errors.label)}
          value={draft.label ?? ''}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            clearError('label');
            setDraft((prev) => ({ ...prev, label: event.target.value }));
          }}
        />

        <SelectInput
          Error={<FieldError message={errors.type} path={`${modalSlug}.type`} showError={Boolean(errors.type)} />}
          label="Type"
          name={`${modalSlug}.type`}
          path={`${modalSlug}.type`}
          options={LINK_TYPES.map((option) => ({ label: option.label, value: option.value }))}
          value={draft.type}
          onChange={(selectedOption) => {
            if (!selectedOption || Array.isArray(selectedOption)) return;
            setType(selectedOption.value as LinkValue['type']);
          }}
          isClearable={false}
        />

        {draft.type === 'internal' && (
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: draft.enableAnchor ? 'minmax(0, 2fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
            }}
          >
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <RelationshipInput
                appearance="select"
                allowCreate={false}
                allowEdit={false}
                path={`${modalSlug}.internal.value`}
                hasMany={false}
                label="Destination"
                localized={false}
                relationTo={relationTo}
                required
                Error={
                  <FieldError message={errors.internal} path={paths.internal} showError={Boolean(errors.internal)} />
                }
                showError={Boolean(errors.internal)}
                value={relationshipValue as ValueWithRelation | null}
                onChange={(nextValue: ValueWithRelation | null) => {
                  clearError('internal');
                  if (!nextValue) {
                    setDraft((prev) => ({
                      ...prev,
                      internal: null,
                    }));
                    return;
                  }

                  const nextTitle =
                    typeof nextValue === 'object' &&
                    nextValue !== null &&
                    'label' in nextValue &&
                    typeof (nextValue as { label?: unknown }).label === 'string'
                      ? (nextValue as { label: string }).label
                      : null;

                  setDraft((prev) => ({
                    ...prev,
                    internal: {
                      relationTo: nextValue.relationTo,
                      value:
                        getInternalValueId({ relationTo: nextValue.relationTo, value: nextValue.value }) ??
                        nextValue.value,
                      title: nextTitle,
                    },
                  }));
                }}
              />

              <CheckboxInput
                checked={Boolean(draft.enableAnchor)}
                label="Enable anchor"
                name={`${modalSlug}.enableAnchor`}
                onToggle={(event: ChangeEvent<HTMLInputElement>) => {
                  const checked = event.target.checked;
                  setDraft((prev) => ({
                    ...prev,
                    enableAnchor: checked,
                    anchor: checked ? prev.anchor : null,
                  }));
                }}
                readOnly={false}
              />
            </div>

            {Boolean(draft.enableAnchor) && (
              <div style={{ alignContent: 'start' }}>
                <TextInput
                  label="Anchor ID"
                  path={`${modalSlug}.anchor`}
                  placeholder="section-2"
                  style={{ marginTop: 0, width: '100%' }}
                  value={draft.anchor ?? ''}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setDraft((prev) => ({ ...prev, anchor: event.target.value }))
                  }
                />
              </div>
            )}
          </div>
        )}

        {draft.type === 'external' && (
          <TextInput
            Error={<FieldError message={errors.external} path={paths.external} showError={Boolean(errors.external)} />}
            label="URL"
            path={paths.external}
            placeholder="https://example.com"
            required
            showError={Boolean(errors.external)}
            value={draft.external ?? ''}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              clearError('external');
              setDraft((prev) => ({ ...prev, external: event.target.value }));
            }}
          />
        )}

        {draft.type === 'email' && (
          <TextInput
            Error={<FieldError message={errors.email} path={paths.email} showError={Boolean(errors.email)} />}
            label="Email"
            path={paths.email}
            placeholder="hello@example.com"
            required
            showError={Boolean(errors.email)}
            value={draft.email ?? ''}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              clearError('email');
              setDraft((prev) => ({ ...prev, email: event.target.value }));
            }}
          />
        )}

        {draft.type === 'phone' && (
          <TextInput
            Error={<FieldError message={errors.phone} path={paths.phone} showError={Boolean(errors.phone)} />}
            label="Phone"
            path={paths.phone}
            placeholder="+1 555 555 5555"
            required
            showError={Boolean(errors.phone)}
            value={draft.phone ?? ''}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              clearError('phone');
              setDraft((prev) => ({ ...prev, phone: event.target.value }));
            }}
          />
        )}

        <CheckboxInput
          checked={Boolean(draft.newTab)}
          label="Open in new tab"
          name={`${modalSlug}.newTab`}
          onToggle={(event: ChangeEvent<HTMLInputElement>) =>
            setDraft((prev) => ({ ...prev, newTab: event.target.checked }))
          }
          readOnly={false}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1.5rem' }}>
        <Button
          buttonStyle="secondary"
          margin={false}
          onClick={() => {
            setDraft(emptyDraft(defaultType));
            setExtensionDraft(null);
            onSave(null);
            extension?.onSave?.(null);
            closeModal(modalSlug);
          }}
          size="medium"
          type="button"
        >
          Clear
        </Button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            buttonStyle="secondary"
            margin={false}
            onClick={() => {
              onCancel();
              closeModal(modalSlug);
            }}
            size="medium"
            type="button"
          >
            Cancel
          </Button>
          <Button margin={false} onClick={handleSave} size="medium" type="button">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LinkFieldModal(props: Props) {
  return (
    <Drawer className="link-field-modal" slug={props.modalSlug} title="Link">
      <div style={{ padding: '1.5rem 1.5rem 0' }}>
        <LinkFieldModalBody
          key={`${props.modalSlug}-${String(getInternalValueId(props.value?.internal) ?? 'empty')}-${JSON.stringify(props.extension?.value ?? null)}`}
          {...props}
        />
      </div>
    </Drawer>
  );
}
