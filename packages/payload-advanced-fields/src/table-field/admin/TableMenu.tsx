'use client';

import { Menu, MenuButton, MenuItems } from '@headlessui/react';
import { Popup } from '@payloadcms/ui';
import type { ReactNode } from 'react';

type MenuRender = (props: { close: () => void }) => ReactNode;

/** Accessible toolbar menus styled with the same tokens as Payload's popup surfaces. */
export function ToolbarMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Menu as="div" className="advanced-table__toolbar-menu">
      {({ close }) => (
        <>
          <MenuButton className="advanced-table__menu-trigger">{label}</MenuButton>
          <MenuItems
            unmount={false}
            aria-label={label}
            className="advanced-table__menu advanced-table__headless-menu"
            onClick={(event) => {
              const button = (event.target as HTMLElement).closest('button:not(:disabled)');
              if (button && !button.hasAttribute('data-menu-keep-open')) close();
            }}
          >
            {children}
          </MenuItems>
        </>
      )}
    </Menu>
  );
}

/** Payload's portalled popup keeps actions outside the grid's scroll clipping. */
export function TableMenu({
  label,
  children,
  compact = false,
  context = false,
  side,
}: {
  label: string;
  children: ReactNode | MenuRender;
  compact?: boolean;
  context?: boolean;
  side?: 'left' | 'right';
}) {
  return (
    <Popup
      button={compact ? '⋯' : label}
      buttonAriaLabel={label}
      side={side}
      theme="auto"
      size="fit-content"
      showScrollbar
      buttonClassName="advanced-table__menu-trigger"
      portalClassName="advanced-table__popup"
      renderButton={
        context
          ? ({ onClick, ...props }) => (
              <button
                {...props}
                aria-label={label}
                className="advanced-table__context-menu-trigger"
                type="button"
                onClick={(event) => {
                  if (event.detail === 0) onClick(event);
                }}
              />
            )
          : undefined
      }
      render={({ close }) => {
        const content = typeof children === 'function' ? children({ close }) : children;
        return (
          <div className="advanced-table__menu" aria-label={label}>
            {content}
          </div>
        );
      }}
    />
  );
}
