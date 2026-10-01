'use client';

import { Banner } from '@payloadcms/ui/elements/Banner';
import { FieldDescription } from '@payloadcms/ui/fields/FieldDescription';
import { FieldLabel } from '@payloadcms/ui/fields/FieldLabel';
import { fieldBaseClass } from '@payloadcms/ui/fields/shared';
import { useLocale } from '@payloadcms/ui/providers/Locale';
import type { UIFieldClientProps } from 'payload';
import type { CSSProperties } from 'react';
import { MESSAGE_TONES, type MessageTone } from '../shared/types.js';

type MessageCustom = {
  message?: unknown;
  tone?: unknown;
  banner?: unknown;
};

const bannerTypes: Record<MessageTone, 'default' | 'success' | 'warning' | 'danger'> = {
  info: 'default',
  success: 'success',
  warning: 'warning',
  error: 'danger',
};

const toneBorderColors: Record<MessageTone, string> = {
  info: 'var(--color-border)',
  success: 'var(--color-border-success-strong)',
  warning: 'var(--color-border-warning-strong)',
  error: 'var(--color-border-danger-strong)',
};

const resolveLocalizedText = (value: unknown, localeCode: string) => {
  if (typeof value === 'string') return value;

  if (value && typeof value === 'object') {
    const localizedValue = (value as Record<string, unknown>)[localeCode];
    if (typeof localizedValue === 'string') return localizedValue;

    const firstStringValue = Object.values(value).find((item) => typeof item === 'string');
    if (typeof firstStringValue === 'string') return firstStringValue;
  }

  return '';
};

const isMessageTone = (value: unknown): value is MessageTone =>
  typeof value === 'string' && MESSAGE_TONES.includes(value as MessageTone);

const MessageField = ({ field, path }: UIFieldClientProps) => {
  const locale = useLocale();
  const custom = field.admin?.custom as MessageCustom | undefined;
  const localeCode = locale?.code || 'en';
  const message = resolveLocalizedText(custom?.message, localeCode);
  const label = resolveLocalizedText(field.label, localeCode);
  const tone = isMessageTone(custom?.tone) ? custom.tone : 'info';
  const banner = custom?.banner === true;

  if (!message) return null;

  const fieldKey = path.replace(/\./g, '__');
  const fieldId = `field-${fieldKey}`;
  const labelId = `${fieldId}-label`;
  const className = [fieldBaseClass, 'message-field', field.admin?.className].filter(Boolean).join(' ');
  const style = {
    width: field.admin?.width,
    ...field.admin?.style,
  };

  return (
    <aside
      aria-labelledby={label ? labelId : undefined}
      className={className}
      data-tone={tone}
      id={fieldId}
      role="note"
      style={style}
    >
      {label ? (
        <div id={labelId}>
          <FieldLabel htmlFor={fieldId} label={label} path={path} />
        </div>
      ) : null}
      {banner ? (
        <Banner type={bannerTypes[tone]}>{message}</Banner>
      ) : (
        <div
          style={
            {
              borderInlineStart: `3px solid ${toneBorderColors[tone]}`,
              paddingInlineStart: 'var(--spacer-2)',
              '--field-color-description': 'var(--color-text)',
            } as CSSProperties
          }
        >
          <FieldDescription className="message-field__description" description={message} path={path} />
        </div>
      )}
    </aside>
  );
};

export default MessageField;
