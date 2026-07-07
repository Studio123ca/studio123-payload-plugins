'use client';

import { Button } from '@payloadcms/ui/elements/Button';
import { Drawer } from '@payloadcms/ui/elements/Drawer';
import { useModal } from '@payloadcms/ui/elements/Modal';
import { CheckboxInput } from '@payloadcms/ui/fields/Checkbox';
import { RelationshipInput } from '@payloadcms/ui/fields/Relationship';
import { SelectInput } from '@payloadcms/ui/fields/Select';
import { TextInput } from '@payloadcms/ui/fields/Text';
import type { ValueWithRelation } from 'payload';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LINK_TYPES } from '../shared/constants.js';
import { normalizeLinkValue, validateLink } from '../shared/validateLink.js';
import type { LinkValue } from '../shared/types.js';
type Props = {
  collectionSlugs?: string[];
  defaultType: LinkValue['type'];
  modalSlug: string;
  onCancel: () => void;
  onSave: (value: LinkValue | null) => void;
  value: LinkValue | null;
};

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

function LinkFieldModalBody({ collectionSlugs, defaultType, modalSlug, onCancel, onSave, value }: Props) {
  const { closeModal } = useModal();
  const [draft, setDraft] = useState<LinkValue>(value ?? emptyDraft(defaultType));
  const [error, setError] = useState<string | null>(null);
  const lastDocTitleRef = useRef<string | null>(draft.internal?.title ?? null);

  const relationTo = collectionSlugs ?? [];
  const relationshipValue = draft.internal ? { 
    value: draft.internal.value,
    relationTo: draft.internal.relationTo 
  } : null;

  useEffect(() => {
    if (draft.type !== 'internal') return;

    const selectedID = getInternalValueId(draft.internal);
    const relation = draft.internal?.relationTo;
    const currentLabel = draft.label?.trim() ?? '';

    if (!selectedID || !relation) return;

    let cancelled = false;
    const loadTitle = async () => {
      try {
        const response = await fetch(`/api/${relation}/${selectedID}?depth=0`);
        if (!response.ok) return;

        const data = (await response.json()) as { title?: unknown };
        const title = typeof data.title === 'string' ? data.title : '';
        if (!title || cancelled) return;

        // Update label if current label is empty OR matches the previous doc's title (wasn't manually edited)
        const shouldAutoFill = currentLabel === '' || currentLabel === lastDocTitleRef.current;
        if (!shouldAutoFill) return;

        setDraft(prev => {
          if (prev.type !== 'internal') return prev;
          if (getInternalValueId(prev.internal) !== selectedID) return prev;
          const prevLabel = prev.label?.trim() ?? '';
          if (prevLabel !== '' && prevLabel !== lastDocTitleRef.current) return prev;

          lastDocTitleRef.current = title;
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
  }, [draft.internal, draft.label, draft.type]);

  const handleSave = () => {
    // Basic validation on the client side
    if (draft.type === 'external' && !draft.external) {
      setError('Enter a URL.');
      return;
    }

    if (draft.type === 'email') {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email || '');
      if (!isEmail) {
        setError('Please enter a valid email address.');
        return;
      }
    }

    if (draft.type === 'phone' && !draft.phone) {
      setError('Enter a phone number.');
      return;
    }

    onSave(draft);
    closeModal(modalSlug);
  };

  const setType = (type: LinkValue['type']) => {
    setDraft(prev => ({
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
        <TextInput
          label="Label"
          path={`${modalSlug}.label`}
          value={draft.label ?? ''}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(prev => ({ ...prev, label: event.target.value }))}
        />

        <SelectInput
          label="Type"
          name={`${modalSlug}.type`}
          path={`${modalSlug}.type`}
          options={LINK_TYPES.map(option => ({ label: option.label, value: option.value }))}
          value={draft.type}
          onChange={selectedOption => {
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
                required={false}
                showError={false}
                value={relationshipValue as ValueWithRelation | null}
                onChange={(nextValue: ValueWithRelation | null) => {
                  if (!nextValue) {
                    setDraft(prev => ({
                      ...prev,
                      internal: null,
                    }));
                    return;
                  }

                  const nextTitle =
                    typeof nextValue === 'object' && nextValue !== null && 'label' in nextValue && typeof (nextValue as { label?: unknown }).label === 'string'
                      ? (nextValue as { label: string }).label
                      : null;

                  setDraft(prev => ({
                    ...prev,
                    internal: {
                      relationTo: nextValue.relationTo,
                      value: getInternalValueId({ relationTo: nextValue.relationTo, value: nextValue.value }) ?? nextValue.value,
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
                  setDraft(prev => ({
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
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(prev => ({ ...prev, anchor: event.target.value }))}
                />
              </div>
            )}
          </div>
        )}

        {draft.type === 'external' && (
          <TextInput
            label="URL"
            path={`${modalSlug}.external`}
            placeholder="https://example.com"
            value={draft.external ?? ''}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(prev => ({ ...prev, external: event.target.value }))}
          />
        )}

        {draft.type === 'email' && (
          <TextInput
            label="Email"
            path={`${modalSlug}.email`}
            placeholder="hello@example.com"
            value={draft.email ?? ''}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(prev => ({ ...prev, email: event.target.value }))}
          />
        )}

        {draft.type === 'phone' && (
          <TextInput
            label="Phone"
            path={`${modalSlug}.phone`}
            placeholder="+1 555 555 5555"
            value={draft.phone ?? ''}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(prev => ({ ...prev, phone: event.target.value }))}
          />
        )}

        <CheckboxInput
          checked={Boolean(draft.newTab)}
          label="Open in new tab"
          name={`${modalSlug}.newTab`}
          onToggle={(event: ChangeEvent<HTMLInputElement>) => setDraft(prev => ({ ...prev, newTab: event.target.checked }))}
          readOnly={false}
        />

        {error && <div className="field-error">{error}</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1.5rem' }}>
        <Button buttonStyle="secondary" margin={false} onClick={() => {
          onCancel();
          closeModal(modalSlug);
        }} size="medium" type="button">
          Cancel
        </Button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            buttonStyle="secondary"
            margin={false}
            onClick={() => {
              setDraft(emptyDraft(defaultType));
              onSave(null);
              closeModal(modalSlug);
            }}
            size="medium"
            type="button"
          >
            Clear
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
          key={`${props.modalSlug}-${String(getInternalValueId(props.value?.internal) ?? 'empty')}`}
          {...props}
        />
      </div>
    </Drawer>
  );
}
