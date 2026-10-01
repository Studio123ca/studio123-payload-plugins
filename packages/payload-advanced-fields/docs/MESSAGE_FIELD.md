# Message Field

The Message Field adds a visual notice to the Payload admin panel. It is a UI-only field: it does not create a database column, participate in form state, or submit a value.

```typescript
import { messageField } from '@studio123/payload-advanced-fields/message';

export const fields = [
  messageField({
    name: 'publishingNotice',
    label: 'Publishing',
    message: {
      en: 'Changes are reviewed before publishing.',
      fr: 'Les changements sont vérifiés avant publication.',
    },
    tone: 'info',
    banner: false,
  }),
];
```

`name` must be unique in the field list so Payload can identify the UI field. `label` is an optional field label shown above the message. `message` accepts a string or a locale-to-string map; the current admin locale is selected with a fallback to the first available translation. `tone` accepts `info`, `success`, `warning`, or `error` and defaults to `info`; tones are shown with Payload's semantic accent border colors. Set `banner: true` to use Payload's Banner presentation instead.

You can pass normal Payload admin options through `admin`, including `condition`, `position`, `style`, and `width`. The field renders only in the admin UI and never changes document data.
