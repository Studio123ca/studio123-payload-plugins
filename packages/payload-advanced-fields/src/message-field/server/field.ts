import type { StaticDescription, UIField } from 'payload';
import type { MessageTone } from '../shared/types.js';

export type MessageFieldConfig = {
  name: string;
  label?: UIField['label'];
  message: StaticDescription;
  tone?: MessageTone;
  banner?: boolean;
  admin?: UIField['admin'];
};

export type MessageField = UIField & {
  admin: UIField['admin'] & {
    custom?: Record<string, unknown> & {
      message: StaticDescription;
      tone: MessageTone;
      banner: boolean;
    };
  };
};

export const messageField = ({
  name,
  label,
  message,
  tone = 'info',
  banner = false,
  admin,
}: MessageFieldConfig): MessageField => {
  return {
    name,
    label,
    type: 'ui',
    admin: {
      ...admin,
      custom: {
        ...(admin?.custom ?? {}),
        message,
        tone,
        banner,
      },
      components: {
        Field: {
          path: '@studio123/payload-advanced-fields/message/client',
          exportName: 'MessageField',
        },
        ...(admin?.components ?? {}),
      },
    },
  };
};
