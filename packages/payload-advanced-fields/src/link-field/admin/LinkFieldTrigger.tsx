'use client';

import { Button, useModal } from '@payloadcms/ui';

type Props = {
  children?: string;
  disabled?: boolean;
  modalSlug: string;
};

export function LinkFieldTrigger({ children = 'Edit link', disabled, modalSlug }: Props) {
  const { openModal } = useModal();

  return (
    <div className="link-field-trigger-wrap">
      <Button
        buttonStyle="secondary"
        className="link-field-trigger"
        disabled={disabled}
        margin={false}
        onClick={() => openModal(modalSlug)}
        size="medium"
        type="button"
      >
        {children}
      </Button>
    </div>
  );
}
