'use client';

import { Button } from '@payloadcms/ui/elements/Button';
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
  const hasDestination = Boolean(value);
  const hasInternalSelected = value?.type === 'internal' && value?.internal?.value;
  const hasComputedUrl = hasInternalSelected && url;
  const hasActions = Boolean(onEdit || (hasDestination && onClear));

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
        {!hasInternalSelected || hasComputedUrl ? (
          <div style={{ color: 'var(--theme-elevation-500)', wordBreak: 'break-all' }}>
            {url || 'No destination set.'}
          </div>
        ) : null}
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
