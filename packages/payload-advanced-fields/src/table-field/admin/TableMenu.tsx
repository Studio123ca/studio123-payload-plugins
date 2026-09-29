'use client';

import { Popup } from '@payloadcms/ui';
import type { ReactNode } from 'react';

/** Payload's portalled popup keeps actions outside the grid's scroll clipping. */
export function TableMenu({
  label,
  children,
  compact = false,
}: {
  label: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <Popup
      button={compact ? '⋯' : label}
      buttonAriaLabel={label}
      theme="auto"
      size="fit-content"
      showScrollbar
      buttonClassName="advanced-table__menu-trigger"
      portalClassName="advanced-table__popup"
      render={({ close }) => (
        <div
          className="advanced-table__menu"
          aria-label={label}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('button:not(:disabled)')) close();
          }}
        >
          {children}
        </div>
      )}
    />
  );
}
