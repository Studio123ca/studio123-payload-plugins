'use client';

import { Button } from '@payloadcms/ui/elements/Button';
import { RxExternalLink } from 'react-icons/rx';
import type { LinkValue } from '../shared/types.js';

type Props = {
  collectionSlugs?: string[];
  onEdit?: () => void;
  value: LinkValue | null;
  onClear?: () => void;
};

export function LinkFieldPreview({ collectionSlugs, onClear, onEdit, value }: Props) {
  const url = value?.url?.trim() || null;
  const label = value?.label?.trim() ?? '';
  const opensInNewTab = Boolean(value?.newTab);
  const hasDestination = Boolean(value);
  const hasExternalSelected = value?.type === 'external' && value?.external?.trim();
  const hasEmailSelected = value?.type === 'email' && value?.email?.trim();
  const hasPhoneSelected = value?.type === 'phone' && value?.phone?.trim();
  const hasInternalSelected = value?.type === 'internal' && value?.internal?.value;
  const hasDestinationValue = Boolean(hasInternalSelected || hasExternalSelected || hasEmailSelected || hasPhoneSelected);
  const hasActions = Boolean(onEdit || (hasDestination && onClear));
  const previewText = url || (hasDestinationValue ? '(Pending changes)' : 'No destination set.');

  return (
    <div
      className="field-type"
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: '4px',
        padding: '0.75rem 0.875rem',
        background: 'var(--theme-elevation-50)',
        width: 'clamp(16rem, 100%, 100%)',
        maxWidth: '100%',
        minHeight: '4.75rem',
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
        {label ? (
          <div style={{ fontWeight: 600, minHeight: '1.25rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </div>
        ) : null}
        <div style={{ color: 'var(--theme-elevation-500)', wordBreak: 'break-all' }}>
          {url ? (
            <a
              href={url}
              rel={opensInNewTab ? 'noopener noreferrer' : undefined}
              style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}
              target={opensInNewTab ? '_blank' : undefined}
            >
              {url}
              {opensInNewTab ? (
                <RxExternalLink
                  aria-hidden="true"
                  focusable="false"
                  style={{ display: 'inline-block', marginLeft: '0.35em', verticalAlign: '-0.1em' }}
                />
              ) : null}
              {opensInNewTab ? <span className="sr-only"> (opens in a new tab)</span> : null}
            </a>
          ) : previewText}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
        {hasActions ? (
          <>
            {onEdit ? (
              <Button
                aria-label="Edit destination"
                buttonStyle="ghost"
                icon="edit"
                margin={false}
                onClick={onEdit}
                round
                size="medium"
                tooltip="Edit destination"
                type="button"
              />
            ) : null}
            {hasDestination && onClear ? (
              <Button
                aria-label="Clear destination"
                buttonStyle="ghost"
                icon="x"
                margin={false}
                onClick={onClear}
                round
                size="medium"
                tooltip="Clear destination"
                type="button"
              />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
