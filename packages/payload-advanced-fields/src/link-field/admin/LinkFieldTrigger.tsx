'use client';

import { Button } from '@payloadcms/ui/elements/Button';
import { useModal } from '@payloadcms/ui/elements/Modal';

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
